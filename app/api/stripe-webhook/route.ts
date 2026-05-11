// app/api/stripe-webhook/route.ts
//
// Stripe webhook handler — supports TWO flows in parallel:
//
//   1. LEGACY: founding_fifty (immediate $99 charge)
//      - metadata.program === "founding_fifty"
//      - handles: checkout.session.completed
//      - inserts contractor row, sends welcome email
//      - UNCHANGED from prior version
//
//   2. V2: founding_first_month_free_v2 (30-day free trial)
//      - metadata.offer_id === "founding_first_month_free_v2"
//      - handles: checkout.session.completed, customer.subscription.trial_will_end,
//                 customer.subscription.updated, customer.subscription.deleted,
//                 invoice.payment_failed
//      - updates founding_seats row through its status lifecycle
//      - creates contractor row at checkout (so they can use the platform during trial)
//      - frees seat on cancellation
//
// The two flows cannot collide: legacy is gated on metadata.program, v2 on
// metadata.offer_id. Different metadata keys, different values. The new
// subscription/invoice event handlers all look up seats by stripe IDs and
// exit silently if no founding_seats row exists, so legacy customers
// firing those events (they shouldn't, but defensively) cause zero side
// effects.

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

const resend = new Resend(process.env.RESEND_API_KEY!);
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
const FROM_EMAIL = "YSKAIPE <gr8@yskaipe.com>";
const INTERNAL_ALERT_TO = "nick@yskaipe.com";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.yskaipe.com";

// ─── Main handler ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error(
      "[stripe-webhook] signature verification failed",
      err.message,
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // ── Idempotency check ─────────────────────────────────────────
  // Stripe retries events on 5xx; we record processed event IDs so
  // a second delivery is a no-op. This must happen before any
  // mutation so a partially-completed prior run still gets retried.
  try {
    const { data: existing } = await supabaseAdmin
      .from("processed_stripe_events")
      .select("event_id")
      .eq("event_id", event.id)
      .maybeSingle();

    if (existing) {
      console.log(
        "[stripe-webhook] event already processed, skipping",
        event.id,
      );
      return NextResponse.json({ received: true, duplicate: true });
    }
  } catch (err) {
    console.warn("[stripe-webhook] idempotency check skipped:", err);
  }

  // ── Route by event type ───────────────────────────────────────
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata || {};

        if (meta.offer_id === "founding_first_month_free_v2") {
          await handleV2Checkout(session, event.id);
        } else if (meta.program === "founding_fifty") {
          const legacyResult = await handleLegacyFoundingCheckout(
            session,
            event.id,
          );
          if (legacyResult instanceof NextResponse) return legacyResult;
        }
        break;
      }

      case "customer.subscription.trial_will_end": {
        const sub = event.data.object as Stripe.Subscription;
        await handleV2TrialWillEnd(sub);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await handleV2SubscriptionUpdated(sub);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleV2SubscriptionDeleted(sub);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleV2PaymentFailed(invoice);
        break;
      }

      default:
        // Unhandled event type — Stripe sends many; we only care about the above.
        break;
    }
  } catch (err: any) {
    console.error("[stripe-webhook] handler error", event.type, err);
    // Return 500 so Stripe retries. Idempotency check above prevents double-processing.
    return NextResponse.json(
      { error: "Handler failed", details: err?.message },
      { status: 500 },
    );
  }

  // ── Record event as processed ─────────────────────────────────
  try {
    await supabaseAdmin.from("processed_stripe_events").insert({
      event_id: event.id,
      event_type: event.type,
    });
  } catch (err) {
    console.warn("[stripe-webhook] could not record processed event", err);
  }

  return NextResponse.json({ received: true });
}

// ════════════════════════════════════════════════════════════════
// LEGACY FLOW — founding_fifty (immediate $99 charge)
// Preserved exactly as it was before the v2 extension.
// ════════════════════════════════════════════════════════════════

async function handleLegacyFoundingCheckout(
  session: Stripe.Checkout.Session,
  eventId: string,
): Promise<NextResponse | void> {
  let email = session.customer_email || "";
  const stripeCustomerId = session.customer as string;
  const stripeSubscriptionId = session.subscription as string;
  const meta = session.metadata || {};

  if (!email && stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(stripeCustomerId);
      if (customer && !customer.deleted) {
        email = (customer as Stripe.Customer).email || "";
      }
    } catch (err) {
      console.error("[stripe-webhook] failed to retrieve customer", err);
    }
  }

  if (!email) {
    console.error("[stripe-webhook] no email resolved — aborting", {
      sessionId: session.id,
      customerId: stripeCustomerId,
    });
    return NextResponse.json(
      { error: "Could not resolve customer email" },
      { status: 500 },
    );
  }

  const firstName = meta.firstName || "";
  const lastName = meta.lastName || "";
  const company = meta.company || `${firstName} ${lastName}`.trim();
  const phone = meta.phone || "";
  const trade = meta.trade || "hvac";
  const zip = meta.zip || "";

  const tradeMapped = mapTrade(trade);
  const initials = (firstName[0] || "") + (lastName[0] || company[0] || "");

  const { data: contractor, error: contractorErr } = await supabaseAdmin
    .from("contractors")
    .insert({
      name: `${firstName} ${lastName}`.trim(),
      company_name: company,
      email: email.toLowerCase(),
      phone,
      avatar_initials: initials.toUpperCase(),
      tier: "founding",
      primary_trade: tradeMapped,
      secondary_trades: [],
      service_radius_miles: 50,
      zip_code: zip,
      is_founding: true,
      notification_delay_minutes: 0,
      months_on_platform: 0,
      jobs_completed: 0,
      response_rate_pct: 100,
      referrals_made: 0,
      review_average: 0,
      leads_this_month: 0,
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
      is_active: true,
      subscription_active: true,
      onboarded_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (contractorErr || !contractor) {
    console.error(
      "[stripe-webhook] contractor insert FAILED — returning 500 so Stripe retries",
      contractorErr,
    );
    return NextResponse.json(
      { error: "Contractor insert failed", details: contractorErr?.message },
      { status: 500 },
    );
  }

  console.log("[stripe-webhook] contractor created", contractor.id);

  const { error: subErr } = await supabaseAdmin.from("subscribers").upsert(
    {
      email: email.toLowerCase(),
      name: `${firstName} ${lastName}`.trim(),
      business: company,
      trade: tradeMapped,
      zip,
      tier: "elite",
      status: "active",
      stripe_customer_id: stripeCustomerId,
      activated_at: new Date().toISOString(),
      current_period_end: new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    },
    { onConflict: "email" },
  );

  if (subErr) {
    console.error(
      "[stripe-webhook] subscriber upsert error (non-fatal)",
      subErr,
    );
  }

  const loginUrl = `${SITE_URL}/login.html`;
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject:
        "Welcome to YSKAIPE — your Founding Contractor account is active",
      html: buildLegacyWelcomeEmail({ firstName, email, loginUrl }),
    });
    console.log("[stripe-webhook] welcome email sent to", email);
  } catch (err: any) {
    console.error("[stripe-webhook] Resend send failed", err);
  }

  // Tag the processed event with the contractor (legacy pattern).
  try {
    await supabaseAdmin
      .from("processed_stripe_events")
      .update({ contractor_id: contractor.id })
      .eq("event_id", eventId);
  } catch (err) {
    console.warn("[stripe-webhook] could not tag processed event", err);
  }
}

// ════════════════════════════════════════════════════════════════
// V2 FLOW — founding_first_month_free_v2 (30-day trial)
// ════════════════════════════════════════════════════════════════

// ─── checkout.session.completed (v2) ──────────────────────────
//
// Fires when contractor completes Stripe checkout with the v2 offer.
// At this point:
//   - founding_seats row already exists at status='pending_checkout'
//     (created by /api/founding-apply before the redirect to Stripe)
//   - Stripe has created the subscription in "trialing" status
//
// We:
//   1. Find the seat by email
//   2. Move it to status='trial', store stripe IDs and trial dates
//   3. Create a contractor row so they can use the platform during trial
//   4. Send welcome email pointing to login + activation
async function handleV2Checkout(
  session: Stripe.Checkout.Session,
  eventId: string,
): Promise<void> {
  const meta = session.metadata || {};
  let email = (session.customer_email || meta.email || "").toLowerCase();
  const stripeCustomerId = session.customer as string;
  const stripeSubscriptionId = session.subscription as string;

  if (!email && stripeCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(stripeCustomerId);
      if (customer && !customer.deleted) {
        email = ((customer as Stripe.Customer).email || "").toLowerCase();
      }
    } catch (err) {
      console.error("[stripe-webhook v2] failed to retrieve customer", err);
    }
  }

  if (!email) {
    throw new Error(
      `v2 checkout: no email resolved (session ${session.id}, customer ${stripeCustomerId})`,
    );
  }

  // Find the seat created by /api/founding-apply
  const { data: seat, error: seatErr } = await supabaseAdmin
    .from("founding_seats")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (seatErr) throw seatErr;
  if (!seat) {
    // No seat row — apply route may have failed silently. Log and bail.
    // We do NOT auto-create a seat here because we'd be missing trade/zip/etc.
    console.error("[stripe-webhook v2] no seat found for", email);
    await sendInternalAlert(
      `v2 checkout completed but NO SEAT for ${email}`,
      `Session ${session.id} completed, customer ${stripeCustomerId}, but no founding_seats row exists. Apply route may have failed. Investigate.`,
    );
    return;
  }

  if (seat.status !== "pending_checkout") {
    console.log(
      `[stripe-webhook v2] seat ${seat.id} already at status=${seat.status}, skipping`,
    );
    return;
  }

  // Pull trial window from the Stripe subscription
  let trialStartedAt: string | null = null;
  let trialEndsAt: string | null = null;
  try {
    const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    trialStartedAt = tsFromUnix(sub.trial_start);
    trialEndsAt = tsFromUnix(sub.trial_end);
  } catch (err) {
    console.warn(
      "[stripe-webhook v2] could not fetch subscription for trial dates",
      err,
    );
  }

  // Update the seat: pending_checkout → trial
  const { error: updateErr } = await supabaseAdmin
    .from("founding_seats")
    .update({
      status: "trial",
      stripe_customer_id: stripeCustomerId,
      stripe_checkout_session_id: session.id,
      stripe_subscription_id: stripeSubscriptionId,
      trial_started_at: trialStartedAt,
      trial_ends_at: trialEndsAt,
    })
    .eq("id", seat.id);

  if (updateErr) throw updateErr;

  // Create the contractor row so they can use the platform during trial.
  // This is the v2 design choice: dashboard access on day 1, not day 31.
  const tradeMapped = mapTrade(seat.trade || "hvac");
  const firstName = seat.first_name || "";
  const lastName = seat.last_name || "";
  const company = seat.company || `${firstName} ${lastName}`.trim();
  const initials = (firstName[0] || "") + (lastName[0] || company[0] || "");

  // Check for existing contractor row before inserting (idempotency safety)
  const { data: existingContractor } = await supabaseAdmin
    .from("contractors")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!existingContractor) {
    const { error: contractorErr } = await supabaseAdmin
      .from("contractors")
      .insert({
        name: `${firstName} ${lastName}`.trim(),
        company_name: company,
        email,
        phone: seat.phone || "",
        avatar_initials: initials.toUpperCase(),
        tier: "founding",
        primary_trade: tradeMapped,
        secondary_trades: [],
        service_radius_miles: 50,
        zip_code: seat.zip || "",
        is_founding: true,
        notification_delay_minutes: 0,
        months_on_platform: 0,
        jobs_completed: 0,
        response_rate_pct: 100,
        referrals_made: 0,
        review_average: 0,
        leads_this_month: 0,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        is_active: true,
        subscription_active: true,
        onboarded_at: new Date().toISOString(),
      });

    if (contractorErr) {
      throw new Error(`v2 contractor insert failed: ${contractorErr.message}`);
    }
  }

  // Welcome email
  const loginUrl = `${SITE_URL}/login.html`;
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Welcome to YSKAIPE — your founding trial is active",
      html: buildV2WelcomeEmail({
        firstName,
        email,
        loginUrl,
        trialEndsAt,
      }),
    });
  } catch (err) {
    console.error("[stripe-webhook v2] welcome email failed", err);
    // Non-fatal: seat is updated, contractor exists, they can request login code themselves
  }

  await sendInternalAlert(
    `New founding trial: ${company} (${email})`,
    `Seat ${seat.id} moved to status=trial.\nTrade: ${tradeMapped}, ZIP: ${seat.zip}\nSubscription: ${stripeSubscriptionId}\nTrial ends: ${trialEndsAt}`,
  );

  console.log(`[stripe-webhook v2] seat ${seat.id} → trial (${email})`);
}

// ─── customer.subscription.trial_will_end (v2) ────────────────
//
// Fires 3 days before trial ends. Email contractor a heads-up so
// they're not surprised when the $99 hits.
async function handleV2TrialWillEnd(sub: Stripe.Subscription): Promise<void> {
  const seat = await findSeatBySubscription(sub.id);
  if (!seat) return;
  if (seat.status !== "trial") return;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: seat.email,
      subject: "Your YSKAIPE founding trial ends in 3 days",
      html: buildTrialEndingEmail({
        firstName: seat.first_name || "",
        trialEndsAt: tsFromUnix(sub.trial_end),
      }),
    });
  } catch (err) {
    console.error("[stripe-webhook v2] trial_will_end email failed", err);
  }
}

// ─── customer.subscription.updated (v2) ───────────────────────
//
// General state sync. Most important transition: trial → active when
// the first $99 charge succeeds on day 31.
async function handleV2SubscriptionUpdated(
  sub: Stripe.Subscription,
): Promise<void> {
  const seat = await findSeatBySubscription(sub.id);
  if (!seat) return;

  const nextStatus = mapStripeStatus(sub.status, sub.cancel_at_period_end);
  if (!nextStatus || nextStatus === seat.status) return;

  const patch: Record<string, any> = { status: nextStatus };

  // If converting trial → active, no extra field changes needed.
  // If canceling, also flip subscription_active on the contractor row.
  const { error } = await supabaseAdmin
    .from("founding_seats")
    .update(patch)
    .eq("id", seat.id);

  if (error) throw error;

  if (nextStatus === "active" && seat.status === "trial") {
    await sendInternalAlert(
      `Trial converted: ${seat.company ?? seat.email}`,
      `Seat ${seat.id} moved trial → active. First $99 charged.`,
    );
  }

  if (nextStatus === "canceled") {
    // Deactivate the contractor row so they stop receiving leads
    await supabaseAdmin
      .from("contractors")
      .update({ is_active: false, subscription_active: false })
      .eq("stripe_subscription_id", sub.id);

    await sendInternalAlert(
      `Seat freed: ${seat.company ?? seat.email}`,
      `Subscription ${sub.id} canceled. Seat ${seat.id} is now available.`,
    );
  }
}

// ─── customer.subscription.deleted (v2) ───────────────────────
//
// Subscription fully removed (after period end of a cancellation).
// Belt-and-suspenders with subscription.updated above.
async function handleV2SubscriptionDeleted(
  sub: Stripe.Subscription,
): Promise<void> {
  const seat = await findSeatBySubscription(sub.id);
  if (!seat) return;
  if (seat.status === "canceled") return;

  await supabaseAdmin
    .from("founding_seats")
    .update({ status: "canceled" })
    .eq("id", seat.id);

  await supabaseAdmin
    .from("contractors")
    .update({ is_active: false, subscription_active: false })
    .eq("stripe_subscription_id", sub.id);

  await sendInternalAlert(
    `Seat freed (sub deleted): ${seat.company ?? seat.email}`,
    `Subscription ${sub.id} fully deleted. Seat ${seat.id} is now available.`,
  );
}

// ─── invoice.payment_failed (v2) ──────────────────────────────
//
// Notify contractor + Nick. Don't change seat status — Stripe's
// dunning will either succeed (→ subscription.updated) or fail
// terminally (→ subscription.deleted).
async function handleV2PaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  // In newer Stripe API versions, invoice.subscription was removed.
  // The subscription lives under invoice.parent.subscription_details.subscription.
  // Fall back to invoice.lines for older shapes (defensive).
  const subscriptionId = extractSubscriptionId(invoice);
  if (!subscriptionId) return;

  const seat = await findSeatBySubscription(subscriptionId);
  if (!seat) return;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: seat.email,
      subject: "Heads up: your YSKAIPE payment didn't go through",
      html: buildPaymentFailedEmail({
        firstName: seat.first_name || "",
        siteUrl: SITE_URL,
      }),
    });
  } catch (err) {
    console.error("[stripe-webhook v2] payment_failed email failed", err);
  }

  await sendInternalAlert(
    `Payment failed: ${seat.company ?? seat.email}`,
    `Invoice ${invoice.id} failed.\nSubscription: ${subscriptionId}\nAmount: $${(invoice.amount_due / 100).toFixed(2)}\nAttempt: ${invoice.attempt_count}\nNext: ${tsFromUnix(invoice.next_payment_attempt) ?? "(none)"}`,
  );
}

// ════════════════════════════════════════════════════════════════
// SHARED HELPERS
// ════════════════════════════════════════════════════════════════

async function findSeatBySubscription(subscriptionId: string) {
  const { data, error } = await supabaseAdmin
    .from("founding_seats")
    .select("*")
    .eq("stripe_subscription_id", subscriptionId)
    .maybeSingle();
  if (error) {
    console.error("[stripe-webhook v2] findSeatBySubscription error", error);
    return null;
  }
  return data;
}

function mapStripeStatus(
  status: Stripe.Subscription.Status,
  cancelAtPeriodEnd: boolean,
): string | null {
  // Map Stripe's subscription.status onto our founding_seats.status.
  // Returns null when we don't want to change anything (intermediate states).
  if (status === "trialing") return "trial";
  if (status === "active") return cancelAtPeriodEnd ? "active" : "active";
  if (status === "canceled") return "canceled";
  if (status === "incomplete_expired") return "expired";
  // past_due, unpaid, incomplete, paused → leave alone, Stripe will resolve
  return null;
}

function mapTrade(trade: string): string {
  const tradeMap: Record<string, string> = {
    plumbing: "plumbing",
    electrical: "electrical",
    hvac: "hvac",
    roofing: "roofing",
    landscaping: "landscaping",
    painting: "painting",
    general_contracting: "general_contracting",
    automotive: "automotive",
    Plumbing: "plumbing",
    Electrical: "electrical",
    HVAC: "hvac",
    Roofing: "roofing",
    Landscaping: "landscaping",
    Painting: "painting",
    "General Contracting": "general_contracting",
    "General Contractor": "general_contracting",
    Automotive: "automotive",
    Plumber: "plumbing",
    Electrician: "electrical",
    "HVAC Technician": "hvac",
    Roofer: "roofing",
    Landscaper: "landscaping",
    Painter: "painting",
  };
  return tradeMap[trade] || trade.toLowerCase();
}

function tsFromUnix(unix: number | null | undefined): string | null {
  if (!unix) return null;
  return new Date(unix * 1000).toISOString();
}

function extractSubscriptionId(invoice: Stripe.Invoice): string | null {
  // Newer API: invoice.parent.subscription_details.subscription
  const parent = (invoice as any).parent;
  if (parent?.subscription_details?.subscription) {
    const sub = parent.subscription_details.subscription;
    return typeof sub === "string" ? sub : (sub?.id ?? null);
  }
  // Defensive fallback: scan invoice line items
  const line = invoice.lines?.data?.find((l: any) => l.subscription);
  if (line) {
    const sub = (line as any).subscription;
    return typeof sub === "string" ? sub : (sub?.id ?? null);
  }
  return null;
}

async function sendInternalAlert(subject: string, body: string): Promise<void> {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: INTERNAL_ALERT_TO,
      subject: `[founding-webhook] ${subject}`,
      text: body,
    });
  } catch (err) {
    console.error("[stripe-webhook] internal alert failed", err);
  }
}

// ════════════════════════════════════════════════════════════════
// EMAIL TEMPLATES
// ════════════════════════════════════════════════════════════════

function buildLegacyWelcomeEmail({
  firstName,
  email,
  loginUrl,
}: {
  firstName: string;
  email: string;
  loginUrl: string;
}): string {
  const greeting = firstName ? `Welcome, ${firstName}` : "Welcome";
  return `<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#fafaf7; padding:40px 20px; color:#1a1a18;">
    <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:14px; padding:40px 36px; border:1px solid #e4e4de;">
      <div style="font-family: 'DM Serif Display', Georgia, serif; font-size:22px; letter-spacing:-0.02em; margin-bottom:24px;">
        YSK<span style="color:#1d9e75;">AI</span>PE
      </div>
      <div style="display:inline-block; background:#faeeda; color:#854f0b; font-size:11px; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; padding:5px 14px; border-radius:100px; margin-bottom:18px;">
        Founding Contractor &middot; First Fifty
      </div>
      <h1 style="font-family: 'DM Serif Display', Georgia, serif; font-size:32px; line-height:1.15; letter-spacing:-0.02em; margin:0 0 16px;">
        ${greeting} &mdash; you're in.
      </h1>
      <p style="font-size:15px; line-height:1.65; color:#3d3d38; margin:0 0 24px;">
        Your founding spot is secured. Your subscription is active. Your loyalty score starts accumulating right now &mdash; before anyone else joins.
      </p>
      <p style="font-size:15px; line-height:1.65; color:#3d3d38; margin:0 0 28px;">
        To access your contractor dashboard, click the button below and enter the 6-digit code we'll email you. No password to remember &mdash; ever.
      </p>
      <div style="text-align:center; margin:32px 0;">
        <a href="${loginUrl}" style="display:inline-block; background:#c8961a; color:#1a1a18; padding:14px 32px; border-radius:8px; font-size:15px; font-weight:700; text-decoration:none;">
          Log in to my dashboard &rarr;
        </a>
      </div>
      <p style="font-size:13px; line-height:1.6; color:#7a7a72; margin:24px 0 0; text-align:center;">
        Use this email &mdash; <strong>${email}</strong> &mdash; when you log in.
      </p>
      <hr style="border:none; border-top:1px solid #e4e4de; margin:32px 0;" />
      <p style="font-size:12px; color:#7a7a72; line-height:1.6; margin:0;">
        Founding rate of $99/month is permanently locked. Bookmark <a href="${loginUrl}" style="color:#0f6e56;">${loginUrl}</a> for quick access whenever you need to check your dashboard.
      </p>
    </div>
    <p style="text-align:center; font-size:11px; color:#b8b8b0; margin-top:20px;">
      YSKAIPE &middot; First Fifty Founding Contractor Program &middot; yskaipe.com
    </p>
  </body>
</html>`;
}

function buildV2WelcomeEmail({
  firstName,
  email,
  loginUrl,
  trialEndsAt,
}: {
  firstName: string;
  email: string;
  loginUrl: string;
  trialEndsAt: string | null;
}): string {
  const greeting = firstName ? `Welcome, ${firstName}` : "Welcome";
  const trialEndStr = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "30 days from today";
  return `<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#fafaf7; padding:40px 20px; color:#1a1a18;">
    <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:14px; padding:40px 36px; border:1px solid #e4e4de;">
      <div style="font-family: 'DM Serif Display', Georgia, serif; font-size:22px; letter-spacing:-0.02em; margin-bottom:24px;">
        YSK<span style="color:#1d9e75;">AI</span>PE
      </div>
      <div style="display:inline-block; background:#faeeda; color:#854f0b; font-size:11px; font-weight:600; letter-spacing:0.1em; text-transform:uppercase; padding:5px 14px; border-radius:100px; margin-bottom:18px;">
        Founding Trial &middot; First Month Free
      </div>
      <h1 style="font-family: 'DM Serif Display', Georgia, serif; font-size:32px; line-height:1.15; letter-spacing:-0.02em; margin:0 0 16px;">
        ${greeting} &mdash; you're in.
      </h1>
      <p style="font-size:15px; line-height:1.65; color:#3d3d38; margin:0 0 24px;">
        Your founding seat is secured and your <strong>first month is free</strong>. No charge today. Your first $99 won't hit until <strong>${trialEndStr}</strong>, and you can cancel any time before then with no fees.
      </p>
      <p style="font-size:15px; line-height:1.65; color:#3d3d38; margin:0 0 28px;">
        Log in below to complete your profile and start receiving leads.
      </p>
      <div style="text-align:center; margin:32px 0;">
        <a href="${loginUrl}" style="display:inline-block; background:#c8961a; color:#1a1a18; padding:14px 32px; border-radius:8px; font-size:15px; font-weight:700; text-decoration:none;">
          Log in to my dashboard &rarr;
        </a>
      </div>
      <p style="font-size:13px; line-height:1.6; color:#7a7a72; margin:24px 0 0; text-align:center;">
        Use this email &mdash; <strong>${email}</strong> &mdash; when you log in.
      </p>
      <hr style="border:none; border-top:1px solid #e4e4de; margin:32px 0;" />
      <p style="font-size:12px; color:#7a7a72; line-height:1.6; margin:0;">
        Questions or want to cancel? Just reply to this email &mdash; it comes to me directly.<br/>
        &mdash; Nick @ YSKAIPE
      </p>
    </div>
  </body>
</html>`;
}

function buildTrialEndingEmail({
  firstName,
  trialEndsAt,
}: {
  firstName: string;
  trialEndsAt: string | null;
}): string {
  const trialEndStr = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })
    : "in 3 days";
  const hello = firstName ? `Hi ${firstName},` : "Hi,";
  return `<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#fafaf7; padding:40px 20px; color:#1a1a18;">
    <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:14px; padding:40px 36px; border:1px solid #e4e4de;">
      <p style="font-size:15px; line-height:1.65; margin:0 0 16px;">${hello}</p>
      <p style="font-size:15px; line-height:1.65; margin:0 0 16px;">
        Quick heads-up: your YSKAIPE founding trial ends <strong>${trialEndStr}</strong>, and your first $99 monthly charge will hit the card on file shortly after.
      </p>
      <p style="font-size:15px; line-height:1.65; margin:0 0 16px;">
        If you want to keep going, you don't need to do anything &mdash; you'll stay locked in at the founding rate.
      </p>
      <p style="font-size:15px; line-height:1.65; margin:0 0 16px;">
        If you'd rather cancel, just hit reply and let me know. No fees, no friction.
      </p>
      <p style="font-size:15px; line-height:1.65; margin:24px 0 0;">
        &mdash; Nick @ YSKAIPE
      </p>
    </div>
  </body>
</html>`;
}

function buildPaymentFailedEmail({
  firstName,
  siteUrl,
}: {
  firstName: string;
  siteUrl: string;
}): string {
  const hello = firstName ? `Hi ${firstName},` : "Hi,";
  return `<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#fafaf7; padding:40px 20px; color:#1a1a18;">
    <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:14px; padding:40px 36px; border:1px solid #e4e4de;">
      <p style="font-size:15px; line-height:1.65; margin:0 0 16px;">${hello}</p>
      <p style="font-size:15px; line-height:1.65; margin:0 0 16px;">
        Stripe wasn't able to charge your card for this month's YSKAIPE founding subscription ($99). It'll retry automatically over the next few days.
      </p>
      <p style="font-size:15px; line-height:1.65; margin:0 0 16px;">
        To update your card, log in at <a href="${siteUrl}/login.html" style="color:#0f6e56;">${siteUrl}/login.html</a>.
      </p>
      <p style="font-size:15px; line-height:1.65; margin:0 0 16px;">
        If you'd rather cancel, just hit reply &mdash; no fees, no questions.
      </p>
      <p style="font-size:15px; line-height:1.65; margin:24px 0 0;">
        &mdash; Nick @ YSKAIPE
      </p>
    </div>
  </body>
</html>`;
}
