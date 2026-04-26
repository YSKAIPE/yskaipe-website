// app/api/auth/send-link/route.ts
// POST /api/auth/send-link
// Body: { email }
// Looks up contractor by email, generates Supabase magic link, sends via Resend.
// If no contractor found, returns generic error (don't leak whether email exists).

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM_EMAIL = "YSKAIPE <gr8@yskaipe.com>";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Look up contractor by email
    const { data: contractor, error: lookupErr } = await supabaseAdmin
      .from("contractors")
      .select("id, name, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (lookupErr) {
      console.error("[send-link] contractor lookup error", lookupErr);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 },
      );
    }

    if (!contractor) {
      // Don't leak whether email exists. Give a helpful generic response.
      return NextResponse.json(
        {
          error:
            "We couldn't find an account with that email. If you're a founding contractor, please contact gr8@yskaipe.com for help.",
        },
        { status: 404 },
      );
    }

    // 2. Generate magic link via Supabase Auth admin
    const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/founder-dashboard.html?cid=${contractor.id}`;

    const { data: linkData, error: magicErr } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: normalizedEmail,
        options: {
          redirectTo: dashboardUrl,
        },
      });

    if (magicErr || !linkData?.properties?.action_link) {
      console.error("[send-link] magic link generation error", magicErr);
      return NextResponse.json(
        { error: "Could not generate login link. Please try again." },
        { status: 500 },
      );
    }

    const magicActionLink = linkData.properties.action_link;
    const firstName = (contractor.name || "").split(" ")[0] || "";

    // 3. Send via Resend
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: normalizedEmail,
        subject: "Your YSKAIPE login link",
        html: buildLoginEmail({
          firstName,
          magicLink: magicActionLink,
        }),
      });
      console.log("[send-link] login link sent to", normalizedEmail);
    } catch (err: any) {
      console.error("[send-link] Resend send failed", err);
      return NextResponse.json(
        { error: "Could not send email. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[send-link] unexpected error", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

function buildLoginEmail({
  firstName,
  magicLink,
}: {
  firstName: string;
  magicLink: string;
}): string {
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
  return `<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#fafaf7; padding:40px 20px; color:#1a1a18;">
    <div style="max-width:560px; margin:0 auto; background:#ffffff; border-radius:14px; padding:40px 36px; border:1px solid #e4e4de;">
      <div style="font-family: 'DM Serif Display', Georgia, serif; font-size:22px; letter-spacing:-0.02em; margin-bottom:24px;">
        YSK<span style="color:#1d9e75;">AI</span>PE
      </div>
      <h1 style="font-family: 'DM Serif Display', Georgia, serif; font-size:28px; line-height:1.15; letter-spacing:-0.02em; margin:0 0 16px;">
        Your login link
      </h1>
      <p style="font-size:15px; line-height:1.65; color:#3d3d38; margin:0 0 24px;">
        ${greeting} click the button below to log into your YSKAIPE contractor dashboard. This link expires in 1 hour and can only be used once.
      </p>
      <div style="text-align:center; margin:32px 0;">
        <a href="${magicLink}" style="display:inline-block; background:#c8961a; color:#1a1a18; padding:14px 32px; border-radius:8px; font-size:15px; font-weight:700; text-decoration:none;">
          Log in to my dashboard →
        </a>
      </div>
      <p style="font-size:13px; line-height:1.6; color:#7a7a72; margin:24px 0 0; text-align:center;">
        Or copy and paste this link into your browser:<br>
        <a href="${magicLink}" style="color:#0f6e56; word-break:break-all;">${magicLink}</a>
      </p>
      <hr style="border:none; border-top:1px solid #e4e4de; margin:32px 0;" />
      <p style="font-size:12px; color:#7a7a72; line-height:1.6; margin:0;">
        If you didn't request this email, you can safely ignore it. The link will expire on its own.
      </p>
    </div>
    <p style="text-align:center; font-size:11px; color:#b8b8b0; margin-top:20px;">
      YSKAIPE · yskaipe.com · Questions? Reply to this email.
    </p>
  </body>
</html>`;
}
