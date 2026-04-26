// app/api/auth/whoami/route.ts
// POST /api/auth/whoami
// Body: { token, cid }
// Validates that the session token is valid AND belongs to the contractor at cid.
// Used by the founder dashboard on every page load.
//
// Returns 200 with { ok: true, contractor: {...} } if valid.
// Returns 401 with { error } if invalid/expired/mismatched.

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const SESSION_REFRESH_THRESHOLD_DAYS = 7; // bump last_used_at if older than 7 days

export async function POST(req: NextRequest) {
  try {
    const { token, cid } = await req.json();

    if (!token || !cid) {
      return NextResponse.json(
        { error: "Missing token or cid" },
        { status: 401 },
      );
    }

    // Look up session by token
    const { data: session, error: lookupErr } = await supabaseAdmin
      .from("login_sessions")
      .select("contractor_id, expires_at, last_used_at")
      .eq("token", token)
      .maybeSingle();

    if (lookupErr) {
      console.error("[whoami] lookup error", lookupErr);
      return NextResponse.json(
        { error: "Could not verify session" },
        { status: 500 },
      );
    }

    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // Check expiry
    if (new Date(session.expires_at).getTime() < Date.now()) {
      // Optionally clean up — but the periodic cleanup job will handle this too.
      return NextResponse.json(
        { error: "Session expired. Please log in again." },
        { status: 401 },
      );
    }

    // Check that the cid in URL matches the session's contractor
    if (session.contractor_id !== cid) {
      console.warn("[whoami] cid mismatch", {
        sessionCid: session.contractor_id,
        urlCid: cid,
      });
      return NextResponse.json(
        { error: "Session does not match this dashboard" },
        { status: 403 },
      );
    }

    // Bump last_used_at occasionally to track active sessions
    const lastUsed = new Date(session.last_used_at).getTime();
    const refreshAfter =
      Date.now() - SESSION_REFRESH_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

    if (lastUsed < refreshAfter) {
      await supabaseAdmin
        .from("login_sessions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("token", token);
    }

    // Fetch contractor info to return
    const { data: contractor, error: contractorErr } = await supabaseAdmin
      .from("contractors")
      .select(
        "id, name, email, company_name, primary_trade, avatar_initials, tier, is_founding",
      )
      .eq("id", cid)
      .maybeSingle();

    if (contractorErr || !contractor) {
      return NextResponse.json(
        { error: "Contractor not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({ ok: true, contractor });
  } catch (err: any) {
    console.error("[whoami] unexpected error", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 },
    );
  }
}
