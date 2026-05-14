// app/api/request-invitation/route.ts
//
// Founding invitation REQUEST endpoint.
//
// This is NOT the founding signup flow (that's /api/founding-apply, which
// takes payment and immediately reserves a seat). This is the "I'd like to
// be considered" form on /pro.html. Submissions land in
// `founding_invitation_requests` for review in nick-admin.html.
//
// On accept, a separate admin endpoint emails the requester an invite link
// to /founding.html where they can complete the paid signup.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const resend = new Resend(process.env.RESEND_API_KEY!);

// Canonical 8 trades — must match trade_type enum in Postgres
const VALID_TRADES = [
  "automotive",
  "electrical",
  "general_contracting",
  "hvac",
  "landscaping",
  "painting",
  "plumbing",
  "roofing",
];

interface RequestBody {
  firstName: string;
  lastName: string;
  business: string;
  trade: string;
  email: string;
  phone: string;
  zip?: string;
  years?: string;
  why?: string;
}

// Normalize US phone to E.164. Matches the helper in /api/founding-apply.
function normalizePhone(raw: string): string | null {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  return null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as RequestBody;

    // Required fields
    const required: (keyof RequestBody)[] = [
      "firstName",
      "lastName",
      "business",
      "trade",
      "email",
      "phone",
    ];
    for (const k of required) {
      if (!body[k] || String(body[k]).trim() === "") {
        return NextResponse.json(
          { error: `Missing required field: ${k}` },
          { status: 400 },
        );
      }
    }

    // Trade must be one of the canonical 8
    if (!VALID_TRADES.includes(body.trade)) {
      return NextResponse.json(
        { error: `Invalid trade. Must be one of: ${VALID_TRADES.join(", ")}` },
        { status: 400 },
      );
    }

    // Phone format check
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

    const email = body.email.trim().toLowerCase();

    // Insert the request
    const { data: request, error: insertErr } = await supabase
      .from("founding_invitation_requests")
      .insert({
        first_name: body.firstName.trim(),
        last_name: body.lastName.trim(),
        business: body.business.trim(),
        trade: body.trade,
        email,
        phone: normalizedPhone,
        zip: body.zip?.trim() || null,
        years_in_business: body.years?.trim() || null,
        why: body.why?.trim() || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("invitation request insert failed", insertErr);
      return NextResponse.json(
        {
          error:
            "Could not save your request. Please try again or email gr8@yskaipe.com.",
        },
        { status: 500 },
      );
    }

    // Fire-and-forget notification to gr8@yskaipe.com
    resend.emails
      .send({
        from: "gr8@yskaipe.com",
        to: "gr8@yskaipe.com",
        replyTo: email,
        subject: `Founding invitation request: ${body.business.trim()} (${body.trade})`,
        text: [
          `New founding invitation request submitted.`,
          ``,
          `Name: ${body.firstName} ${body.lastName}`,
          `Business: ${body.business}`,
          `Trade: ${body.trade}`,
          `Email: ${email}`,
          `Phone: ${normalizedPhone}`,
          `Zip: ${body.zip || "—"}`,
          `Years in business: ${body.years || "—"}`,
          ``,
          `Why they want to join:`,
          body.why || "(no answer)",
          ``,
          `Request ID: ${request.id}`,
          ``,
          `Review and accept/decline in the admin dashboard:`,
          `${process.env.NEXT_PUBLIC_SITE_URL}/nick-admin.html`,
        ].join("\n"),
      })
      .catch((e) => console.error("notification email failed", e));

    return NextResponse.json({ ok: true, id: request.id });
  } catch (err: any) {
    console.error("/api/request-invitation error", err);
    return NextResponse.json(
      { error: err?.message ?? "Unexpected server error" },
      { status: 500 },
    );
  }
}
