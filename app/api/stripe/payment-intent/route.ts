/**
 * app/api/stripe/
 * ─────────────────────────────────────────────────────────────────
 * Three route files for Stripe integration.
 * Split into separate files below with clear section markers.
 *
 * SETUP REQUIRED (Vercel env vars):
 *   STRIPE_SECRET_KEY         = sk_live_... (or sk_test_... for testing)
 *   STRIPE_WEBHOOK_SECRET     = whsec_...
 *   NEXT_PUBLIC_STRIPE_KEY    = pk_live_... (or pk_test_...)
 *   NEXT_PUBLIC_SITE_URL      = https://www.yskaipe.com
 * ─────────────────────────────────────────────────────────────────
 */

// ══════════════════════════════════════════════════════════════════
// FILE 1: app/api/stripe/payment-intent/route.ts
// Creates a PaymentIntent when homeowner books.
// Amount = book_price in cents. Metadata links to job.
// ══════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia" as any,
});
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const { job_id, book_price, label, homeowner_email, confirm_number } =
      await req.json();

    if (!book_price || book_price < 1) {
      return NextResponse.json(
        { error: "Invalid job or price." },
        { status: 400 },
      );
    }

    const amountCents = Math.round(book_price * 100);

    // Create PaymentIntent — capture_method=manual so we capture after job complete
    const intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      capture_method: "manual", // authorize now, capture on completion
      receipt_email: homeowner_email,
      description: `YSKAIPE: ${label} — ${confirm_number}`,
      metadata: {
        job_id,
        confirm_number,
        label,
        platform: "yskaipe",
      },
      automatic_payment_methods: { enabled: true },
    });

    // Store payment intent ID on job row
    await supabase
      .from("jobs")
      .update({ stripe_payment_intent_id: intent.id })
      .eq("id", job_id);

    return NextResponse.json({
      client_secret: intent.client_secret,
      payment_intent_id: intent.id,
      amount_cents: amountCents,
    });
  } catch (err: any) {
    console.error("[stripe/payment-intent]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
