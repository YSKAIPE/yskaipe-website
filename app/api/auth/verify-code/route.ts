// app/api/auth/verify-code/route.ts
// POST /api/auth/verify-code
// Body: { email, code }
// Verifies the 6-digit code, creates a 90-day session, returns the session token + cid.

import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const SESSION_DAYS = 90;
const MAX_ATTEMPTS = 5; // after 5 failed attempts on a code, invalidate it

function generateSessionToken(): string {
  // 64-char URL-safe random token
  return crypto.randomBytes(48).toString("base64url");
}

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = String(code).trim();
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      null;
    const userAgent = req.headers.get("user-agent") || null;

    // Find the most recent unused code for this email + code
    const { data: codeRow, error: lookupErr } = await supabaseAdmin
      .from("login_codes")
      .select("id, contractor_id, expires_at, used_at, attempts, code")
      .eq("email", normalizedEmail)
      .eq("code", normalizedCode)
      .is("used_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookupErr) {
      console.error("[verify-code] lookup error", lookupErr);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 },
      );
    }

    if (!codeRow) {
      // Code is wrong. Bump attempts on any recent unused codes for this email
      // so brute force gets blocked at the MAX_ATTEMPTS threshold.
      const { data: recentCodes } = await supabaseAdmin
        .from("login_codes")
        .select("id, attempts")
        .eq("email", normalizedEmail)
        .is("used_at", null);

      if (recentCodes && recentCodes.length > 0) {
        for (const rc of recentCodes) {
          await supabaseAdmin
            .from("login_codes")
            .update({ attempts: (rc.attempts || 0) + 1 })
            .eq("id", rc.id);
        }
      }

      return NextResponse.json(
        { error: "Invalid or expired code. Please try again." },
        { status: 401 },
      );
    }

    // Check expiry
    if (new Date(codeRow.expires_at).getTime() < Date.now()) {
      return NextResponse.json(
        { error: "Code has expired. Please request a new one." },
        { status: 401 },
      );
    }

    // Check attempts (in case earlier brute-force flagged it)
    if (codeRow.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: "Too many attempts. Please request a new code." },
        { status: 429 },
      );
    }

    // Mark code as used
    const { error: useErr } = await supabaseAdmin
      .from("login_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", codeRow.id);

    if (useErr) {
      console.error("[verify-code] mark used error", useErr);
      return NextResponse.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 },
      );
    }

    // Create session token
    const token = generateSessionToken();
    const expiresAt = new Date(
      Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { error: sessionErr } = await supabaseAdmin
      .from("login_sessions")
      .insert({
        contractor_id: codeRow.contractor_id,
        token,
        expires_at: expiresAt,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (sessionErr) {
      console.error("[verify-code] session insert failed", sessionErr);
      return NextResponse.json(
        { error: "Could not create session. Please try again." },
        { status: 500 },
      );
    }

    console.log(
      "[verify-code] session created for contractor",
      codeRow.contractor_id,
    );

    // Return token + cid. Client will store token in localStorage and use cid
    // to navigate to /founder-dashboard.html?cid=<cid>.
    return NextResponse.json({
      ok: true,
      token,
      cid: codeRow.contractor_id,
      expiresAt,
    });
  } catch (err: any) {
    console.error("[verify-code] unexpected error", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
