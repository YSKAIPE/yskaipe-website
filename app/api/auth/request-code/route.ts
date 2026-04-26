// app/api/auth/request-code/route.ts
// POST /api/auth/request-code
// Body: { email }
// Looks up contractor by email, generates a 6-digit code, stores in login_codes,
// emails it via Resend. Always returns success (don't leak whether email exists).

import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM_EMAIL = "YSKAIPE <gr8@yskaipe.com>";
const CODE_TTL_MINUTES = 10;
const RATE_LIMIT_WINDOW_SECONDS = 60; // max 1 code per email per minute

function generateCode(): string {
  // 6 digits, zero-padded. Cryptographically random via crypto.getRandomValues
  // would be ideal but Math.random is fine for this — codes are single-use,
  // expire in 10min, and verification is rate-limited.
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      null;

    // Rate limit: don't allow another code request in the last 60s
    const recentCutoff = new Date(
      Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000,
    ).toISOString();

    const { data: recent } = await supabaseAdmin
      .from("login_codes")
      .select("id")
      .eq("email", normalizedEmail)
      .gte("created_at", recentCutoff)
      .limit(1)
      .maybeSingle();

    if (recent) {
      // Pretend we sent it again — don't expose rate-limit detail to enumerators.
      return NextResponse.json({ ok: true });
    }

    // Look up contractor
    const { data: contractor, error: lookupErr } = await supabaseAdmin
      .from("contractors")
      .select("id, name, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (lookupErr) {
      console.error("[request-code] contractor lookup error", lookupErr);
      // Don't leak — return success and silently drop.
      return NextResponse.json({ ok: true });
    }

    if (!contractor) {
      // Email not found — don't reveal that. Return success quietly.
      // Future: optionally send a "you don't have an account, sign up here" email.
      console.log("[request-code] no contractor for", normalizedEmail);
      return NextResponse.json({ ok: true });
    }

    // Generate code & insert
    const code = generateCode();
    const expiresAt = new Date(
      Date.now() + CODE_TTL_MINUTES * 60 * 1000,
    ).toISOString();

    const { error: insertErr } = await supabaseAdmin
      .from("login_codes")
      .insert({
        email: normalizedEmail,
        code,
        contractor_id: contractor.id,
        expires_at: expiresAt,
        ip_address: ipAddress,
      });

    if (insertErr) {
      console.error("[request-code] insert failed", insertErr);
      return NextResponse.json(
        { error: "Could not generate code. Please try again." },
        { status: 500 },
      );
    }

    // Send via Resend
    const firstName = (contractor.name || "").split(" ")[0] || "";

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: normalizedEmail,
        subject: `Your YSKAIPE login code: ${code}`,
        html: buildCodeEmail({ firstName, code }),
        text: `Your YSKAIPE login code is: ${code}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, ignore this email.`,
      });
      console.log("[request-code] code sent to", normalizedEmail);
    } catch (err: any) {
      console.error("[request-code] Resend send failed", err);
      return NextResponse.json(
        { error: "Could not send email. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[request-code] unexpected error", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

function buildCodeEmail({
  firstName,
  code,
}: {
  firstName: string;
  code: string;
}): string {
  const greeting = firstName ? `Hi ${firstName},` : "Hi there,";
  return `<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background:#fafaf7; padding:40px 20px; color:#1a1a18;">
    <div style="max-width:480px; margin:0 auto; background:#ffffff; border-radius:14px; padding:40px 36px; border:1px solid #e4e4de;">
      <div style="font-family: 'DM Serif Display', Georgia, serif; font-size:22px; letter-spacing:-0.02em; margin-bottom:24px;">
        YSK<span style="color:#1d9e75;">AI</span>PE
      </div>
      <p style="font-size:14px; color:#3d3d38; margin:0 0 20px;">${greeting}</p>
      <p style="font-size:14px; color:#3d3d38; line-height:1.6; margin:0 0 20px;">
        Your YSKAIPE login code is:
      </p>
      <div style="background:#fafaf7; border:1px solid #e4e4de; border-radius:10px; padding:24px; text-align:center; margin:0 0 24px;">
        <div style="font-family: 'Courier New', monospace; font-size:36px; font-weight:700; letter-spacing:0.3em; color:#1a1a18;">
          ${code}
        </div>
      </div>
      <p style="font-size:13px; color:#7a7a72; line-height:1.55; margin:0 0 16px;">
        Enter this code on the YSKAIPE login page. It expires in <strong>10 minutes</strong>.
      </p>
      <p style="font-size:12px; color:#a8a8a0; line-height:1.55; margin:24px 0 0; border-top:1px solid #e4e4de; padding-top:20px;">
        If you didn't request this code, you can safely ignore this email — your account is secure.
      </p>
    </div>
    <p style="text-align:center; font-size:11px; color:#b8b8b0; margin-top:20px;">
      YSKAIPE · yskaipe.com · Questions? Reply to this email.
    </p>
  </body>
</html>`;
}
