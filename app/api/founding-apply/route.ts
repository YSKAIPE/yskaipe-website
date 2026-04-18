// app/api/founding-apply/route.ts
// POST /api/founding-apply
// Body: { firstName, lastName, company, email, phone, trade, years, zip }
// Creates a Stripe Checkout session for the founding contractor plan
// Redirects to Stripe → on success, webhook fires to create contractor account

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

const FOUNDING_PRICE_ID = "price_1THWTWJoiiIktGFZd7YDhB57";

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, company, email, phone, trade, years, zip } =
      await req.json();

    if (!email || !firstName || !trade) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

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
      customer_email: email,
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
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/founding-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/founding.html`,
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
