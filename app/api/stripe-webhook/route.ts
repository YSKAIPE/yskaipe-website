// app/api/stripe-webhook/route.ts
// Handles Stripe webhook events
// On checkout.session.completed for founding program:
//   1. Idempotency check via stripe event ID
//   2. Resolves customer email (falls back to Stripe customer object if session.customer_email is null)
//   3. Creates contractor row in Supabase — HARD FAILS if insert errors so Stripe will retry
//   4. Upserts subscriber row (non-fatal)
//   5. Sends welcome email via Resend pointing to /login.html (NOT a magic link)
//
// NOTE: This version drops the Supabase magic-link generation entirely.
// All login is now handled by the custom 6-digit code flow at /login.html.

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

const resend = new Resend(process.env.RESEND_API_KEY!);
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
const FROM_EMAIL = "YSKAIPE <gr8@yskaipe.com>";

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

  // Idempotency check
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata || {};

    if (meta.program !== "founding_fifty") {
      return NextResponse.json({ received: true });
    }

    let email = session.customer_email || "";
    const stripeCustomerId = session.customer as string;
    const stripeSubscriptionId = session.subscription as string;

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

    const tradeMap: Record<string, string> = {
      HVAC: "hvac",
      Plumbing: "plumbing",
      Electrical: "electrical",
      Roofing: "roofing",
      Landscaping: "landscaping",
      Painting: "painting",
    };
    const tradeMapped = tradeMap[trade] || trade.toLowerCase();

    const initials = (firstName[0] || "") + (lastName[0] || company[0] || "");

    // 1. Create contractor row — HARD FAIL if insert errors
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

    // 2. Subscriber upsert — non-fatal
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

    // 3. Send welcome email — points to /login.html, NOT a magic link
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://www.yskaipe.com";
    const loginUrl = `${siteUrl}/login.html`;

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject:
          "Welcome to YSKAIPE — your Founding Contractor account is active",
        html: buildWelcomeEmail({
          firstName,
          email,
          loginUrl,
        }),
      });
      console.log("[stripe-webhook] welcome email sent to", email);
    } catch (err: any) {
      console.error("[stripe-webhook] Resend send failed", err);
      // Don't fail the webhook — contractor is created, they can request a code from /login.html themselves
      console.warn(
        "[stripe-webhook] continuing despite email failure — contractor can self-serve at /login.html",
      );
    }

    // 4. Record event as processed
    try {
      await supabaseAdmin.from("processed_stripe_events").insert({
        event_id: event.id,
        event_type: event.type,
        contractor_id: contractor.id,
      });
    } catch (err) {
      console.warn("[stripe-webhook] could not record processed event", err);
    }
  }

  return NextResponse.json({ received: true });
}

function buildWelcomeEmail({
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
        ★ Founding Contractor · First Fifty
      </div>
      <h1 style="font-family: 'DM Serif Display', Georgia, serif; font-size:32px; line-height:1.15; letter-spacing:-0.02em; margin:0 0 16px;">
        ${greeting} — you're in.
      </h1>
      <p style="font-size:15px; line-height:1.65; color:#3d3d38; margin:0 0 24px;">
        Your founding spot is secured. Your subscription is active. Your loyalty score starts accumulating right now — before anyone else joins.
      </p>
      <p style="font-size:15px; line-height:1.65; color:#3d3d38; margin:0 0 28px;">
        To access your contractor dashboard, click the button below and enter the 6-digit code we'll email you. No password to remember — ever.
      </p>
      <div style="text-align:center; margin:32px 0;">
        <a href="${loginUrl}" style="display:inline-block; background:#c8961a; color:#1a1a18; padding:14px 32px; border-radius:8px; font-size:15px; font-weight:700; text-decoration:none;">
          Log in to my dashboard →
        </a>
      </div>
      <p style="font-size:13px; line-height:1.6; color:#7a7a72; margin:24px 0 0; text-align:center;">
        Use this email — <strong>${email}</strong> — when you log in.
      </p>
      <hr style="border:none; border-top:1px solid #e4e4de; margin:32px 0;" />
      <p style="font-size:12px; color:#7a7a72; line-height:1.6; margin:0;">
        Founding rate of $99/month is permanently locked. Bookmark <a href="${loginUrl}" style="color:#0f6e56;">${loginUrl}</a> for quick access whenever you need to check your dashboard.
      </p>
    </div>
    <p style="text-align:center; font-size:11px; color:#b8b8b0; margin-top:20px;">
      YSKAIPE · First Fifty Founding Contractor Program · yskaipe.com
    </p>
  </body>
</html>`;
}
