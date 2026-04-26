// app/api/founding-apply/route.ts
// POST /api/founding-apply
// Body: { firstName, lastName, company, email, phone, trade, years, zip }
// Creates a Stripe Checkout session for the founding contractor plan
// Redirects to Stripe → on success, webhook fires to create contractor account

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

const FOUNDING_PRICE_ID = "price_1THWTWJoiiIktGFZd7YDhB57";

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, company, email, phone, trade, years, zip } =
      await req.json();

    if (!email || !firstName || !trade) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      throw new Error("NEXT_PUBLIC_SITE_URL is not configured");
    }

    // Create a fresh Stripe customer FIRST, so we pass `customer` (not `customer_email`)
    // to checkout.sessions.create. This is the key to bypassing the Link OTP intercept:
    // when Stripe sees a customer_email it recognizes from Link's global database, it
    // shows the "Confirm it's you" OTP screen even when Link isn't a payment method type.
    // Passing a pre-created customer object skips that Link lookup entirely.
    const customer = await stripe.customers.create({
      email,
      name: `${firstName} ${lastName || ""}`.trim(),
      phone: phone || undefined,
      metadata: {
        firstName,
        lastName: lastName || "",
        company: company || "",
        trade,
        years: years || "",
        zip: zip || "",
        program: "founding_fifty",
      },
    });

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: FOUNDING_PRICE_ID,
          quantity: 1,
        },
      ],
      customer: customer.id, // pre-created customer suppresses Link OTP intercept
      metadata: {
        firstName,
        lastName,
        company: company || "",
        phone: phone || "",
        trade,
        years: years || "",
        zip: zip || "",
        program: "founding_fifty",
      },
      success_url: `${siteUrl}/founding-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/founding.html`,
      subscription_data: {
        metadata: {
          firstName,
          lastName,
          company: company || "",
          phone: phone || "",
          trade,
          years: years || "",
          zip: zip || "",
          program: "founding_fifty",
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("[/api/founding-apply]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
