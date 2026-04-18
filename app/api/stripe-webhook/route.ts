// app/api/stripe-webhook/route.ts
// Handles Stripe webhook events
// On checkout.session.completed for founding program:
//   1. Creates contractor row in Supabase
//   2. Creates subscriber row in Supabase
//   3. Sends magic link to contractor email

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata || {};

    if (meta.program !== "founding_fifty") {
      return NextResponse.json({ received: true });
    }

    const email = session.customer_email || "";
    const firstName = meta.firstName || "";
    const lastName = meta.lastName || "";
    const company = meta.company || `${firstName} ${lastName}`;
    const phone = meta.phone || "";
    const trade = meta.trade || "hvac";
    const zip = meta.zip || "";
    const stripeCustomerId = session.customer as string;
    const stripeSubscriptionId = session.subscription as string;

    // Map trade display name to internal key
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

    try {
      // 1. Create contractor row
      const { data: contractor, error: contractorErr } = await supabaseAdmin
        .from("contractors")
        .insert({
          name: `${firstName} ${lastName}`.trim(),
          company_name: company,
          email,
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
          status: "active",
        })
        .select()
        .single();

      if (contractorErr) {
        console.error(
          "[stripe-webhook] contractor insert error",
          contractorErr,
        );
      } else {
        console.log("[stripe-webhook] contractor created", contractor?.id);
      }

      // 2. Create subscriber row (for magic link auth)
      const { error: subErr } = await supabaseAdmin.from("subscribers").upsert(
        {
          email,
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
        console.error("[stripe-webhook] subscriber upsert error", subErr);
      }

      // 3. Send magic link via Supabase Auth
      const { error: magicErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard.html`,
        },
      });

      if (magicErr) {
        console.error("[stripe-webhook] magic link error", magicErr);
      } else {
        console.log("[stripe-webhook] magic link sent to", email);
      }
    } catch (err: any) {
      console.error("[stripe-webhook] processing error", err);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
