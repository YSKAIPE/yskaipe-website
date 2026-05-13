// app/api/founding-apply/route.ts
//
// Founding contractor apply endpoint — v2.
//
// Offer: founding_first_month_free_v2
//   - $0 today (Stripe collects card, no charge)
//   - 30-day free trial (trial_period_days)
//   - Day 31: first $99 charge
//   - Cancel anytime (month-to-month, no commitment)
//
// What this route does NOT do (intentionally simpler than v1):
//   - No commitment metadata
//   - No buyout logic
//   - No enforceCommitment helper
//
// Activation gate is handled separately:
//   - founding_seats.activation_status defaults to 'pending_profile'
//   - When profile completes, contractor record gets
//     priority_routing_eligible = true and founding_badge_active = true
//   - Lead scoring algorithm reads priority_routing_eligible to decide
//     whether to apply the "founding" weight bonus
//
// Stack: Supabase project ygfhaoksicgtazcmqdfk, Resend, Stripe.

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const resend = new Resend(process.env.RESEND_API_KEY!);

// ─── Offer constants (single source of truth) ────────────────────
// If pricing changes, change here AND in founding.html (acceptedTerms).
// The route verifies they match before accepting the submission.
const OFFER = {
  id: "founding_first_month_free_v2",
  stripePriceId: process.env.STRIPE_FOUNDING_PRICE_ID!,
  trialDays: 30,
  postTrialPriceUsd: 99,
  cancelPolicy: "anytime",
  totalSeats: 50,
} as const;

// ─── Seat cap ────────────────────────────────────────────────────
async function getRemainingSeats(): Promise<number> {
  const { count, error } = await supabase
    .from("founding_seats")
    .select("*", { count: "exact", head: true })
    .in("status", ["pending_checkout", "trial", "active", "paid"]);

  if (error) throw new Error(`seat count failed: ${error.message}`);
  return OFFER.totalSeats - (count ?? 0);
}

// ─── Dedupe ──────────────────────────────────────────────────────
async function existingSeatForEmail(email: string) {
  const { data, error } = await supabase
    .from("founding_seats")
    .select("id, status, email, stripe_customer_id")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (error) throw new Error(`dedupe lookup failed: ${error.message}`);
  return data;
}

interface ApplyBody {
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  phone: string;
  trade: string;
  years?: string;
  zip?: string;
  acceptedTerms?: {
    accepted: boolean;
    acceptedAt: string;
    offer: string;
    trialDays: number;
    postTrialPriceUsd: number;
    cancelPolicy: string;
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ApplyBody;

    // ─── Validation ──────────────────────────────────────────────
    const required: (keyof ApplyBody)[] = [
      "firstName",
      "lastName",
      "company",
      "email",
      "phone",
      "trade",
    ];
    for (const k of required) {
      if (!body[k] || String(body[k]).trim() === "") {
        return NextResponse.json(
          { error: `Missing required field: ${k}` },
          { status: 400 },
        );
      }
    }

    const email = body.email.trim().toLowerCase();

    // Phone validation — must match what the client normalizes to.
    // Accepts +1XXXXXXXXXX (E.164 US) or 10/11 digits we can normalize.
    function normalizePhone(raw: string): string | null {
      const digits = String(raw || "").replace(/\D/g, "");
      if (digits.length === 10) return "+1" + digits;
      if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
      return null;
    }

    const normalizedPhone = normalizePhone(body.phone);
    if (!normalizedPhone) {
      return NextResponse.json(
        {
          error:
            "Invalid phone number. Please enter a valid US 10-digit number.",
        },
        { status: 400 },
      );
    }

    // ─── Terms acceptance — must match server-side offer ─────────
    const t = body.acceptedTerms;
    if (
      !t ||
      !t.accepted ||
      t.offer !== OFFER.id ||
      t.trialDays !== OFFER.trialDays ||
      t.postTrialPriceUsd !== OFFER.postTrialPriceUsd ||
      t.cancelPolicy !== OFFER.cancelPolicy
    ) {
      return NextResponse.json(
        {
          error: "Trial terms must be accepted. Please refresh and try again.",
        },
        { status: 400 },
      );
    }

    // ─── Seat cap ────────────────────────────────────────────────
    const remaining = await getRemainingSeats();
    if (remaining <= 0) {
      return NextResponse.json(
        {
          error:
            "The First Fifty cohort is full. Join the waitlist for standard tiers — coming soon.",
        },
        { status: 409 },
      );
    }

    // ─── Dedupe ──────────────────────────────────────────────────
    const existing = await existingSeatForEmail(email);
    if (existing && ["trial", "active", "paid"].includes(existing.status)) {
      return NextResponse.json(
        {
          error:
            "This email already has an active founding seat. Log in to manage your account.",
        },
        { status: 409 },
      );
    }

    // ─── Create or reuse Stripe customer ─────────────────────────
    let customerId = existing?.stripe_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        name: `${body.firstName.trim()} ${body.lastName.trim()}`,
        phone: normalizedPhone,
        metadata: {
          company: body.company.trim(),
          trade: body.trade,
          years: body.years ?? "",
          zip: body.zip ?? "",
          offer: OFFER.id,
        },
      });
      customerId = customer.id;
    }

    // ─── Reserve seat row in pending_checkout status ─────────────
    // Activation gate: starts in 'pending_profile' until contractor
    // completes their business profile in the dashboard.
    const acceptedAt = new Date(t.acceptedAt);
    const { data: seat, error: seatErr } = await supabase
      .from("founding_seats")
      .upsert(
        {
          email,
          first_name: body.firstName.trim(),
          last_name: body.lastName.trim(),
          company: body.company.trim(),
          phone: normalizedPhone,
          trade: body.trade,
          years: body.years ?? null,
          zip: body.zip ?? null,
          status: "pending_checkout",
          activation_status: "pending_profile",
          stripe_customer_id: customerId,
          offer_id: OFFER.id,
          terms_accepted_at: acceptedAt.toISOString(),
          trial_days: OFFER.trialDays,
          post_trial_price_usd: OFFER.postTrialPriceUsd,
        },
        { onConflict: "email" },
      )
      .select("id")
      .single();

    if (seatErr) {
      console.error("seat upsert failed", seatErr);
      return NextResponse.json(
        { error: "Could not reserve your seat. Please try again." },
        { status: 500 },
      );
    }

    // ─── Stripe Checkout session ─────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      payment_method_collection: "always", // card required even on $0 trial
      line_items: [{ price: OFFER.stripePriceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: OFFER.trialDays,
        // If card fails at conversion, void instead of past_due limbo.
        trial_settings: {
          end_behavior: { missing_payment_method: "cancel" },
        },
        metadata: {
          offer_id: OFFER.id,
          founding_seat_id: seat.id,
          trade: body.trade,
          company: body.company.trim(),
          terms_accepted_at: acceptedAt.toISOString(),
        },
      },
      custom_text: {
        submit: {
          message:
            "$0 due today. 30-day free trial, then $99/mo billed monthly. Cancel anytime from your dashboard.",
        },
      },
      allow_promotion_codes: false,
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/founding/welcome?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/founding.html?checkout=canceled`,
      metadata: {
        offer_id: OFFER.id,
        founding_seat_id: seat.id,
      },
    });

    // Record session ID on seat row
    await supabase
      .from("founding_seats")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", seat.id);

    // Fire-and-forget internal notification
    resend.emails
      .send({
        from: "gr8@yskaipe.com",
        to: "gr8@yskaipe.com",
        subject: `Founding seat reserved: ${body.company.trim()} (${body.trade})`,
        text: [
          `New founding application started.`,
          ``,
          `Name: ${body.firstName} ${body.lastName}`,
          `Company: ${body.company}`,
          `Email: ${email}`,
          `Phone: ${normalizedPhone}`,
          `Trade: ${body.trade}`,
          `Years: ${body.years ?? "—"}`,
          `Zip: ${body.zip ?? "—"}`,
          ``,
          `Stripe customer: ${customerId}`,
          `Checkout session: ${session.id}`,
          `Seat ID: ${seat.id}`,
          `Seats remaining (after this): ${remaining - 1}`,
        ].join("\n"),
      })
      .catch((e) => console.error("internal notification failed", e));

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("/api/founding-apply error", err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected server error" },
      { status: 500 },
    );
  }
}
