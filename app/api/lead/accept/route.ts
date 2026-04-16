// ============================================================
// FILE 6: app/api/lead/accept/route.ts
// POST /api/lead/accept
// Body: { lead_id, contractor_id, action: 'accept'|'decline', decline_reason? }
// Called from contractor dashboard.
// Accept: closes all other assignments for this request.
// Decline: activates the next contractor in queue.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { lead_id, contractor_id, action, decline_reason } = await req.json();

  if (!lead_id || !contractor_id || !action) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (action === "accept") {
    // Mark this lead accepted
    const { data: lead, error } = await supabaseAdmin
      .from("leads")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", lead_id)
      .eq("contractor_id", contractor_id)
      .select("request_id, rank_position")
      .single();

    if (error || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Expire all other assignments for this request
    await supabaseAdmin
      .from("leads")
      .update({ status: "expired", expired_at: new Date().toISOString() })
      .eq("request_id", lead.request_id)
      .neq("contractor_id", contractor_id);

    // Mark request completed
    await supabaseAdmin
      .from("homeowner_requests")
      .update({ status: "accepted" })
      .eq("id", lead.request_id);

    // Increment loyalty: jobs_completed
    await supabaseAdmin
      .from("contractors")
      .update({
        jobs_completed: supabaseAdmin.rpc("increment_jobs_completed", {
          p_contractor_id: contractor_id,
        }) as any,
      })
      .eq("id", contractor_id);

    return NextResponse.json({ success: true, action: "accepted" });
  }

  if (action === "decline") {
    // Mark declined
    const { data: lead, error } = await supabaseAdmin
      .from("leads")
      .update({
        status: "declined",
        declined_at: new Date().toISOString(),
        decline_reason: decline_reason ?? null,
      })
      .eq("id", lead_id)
      .eq("contractor_id", contractor_id)
      .select("request_id, rank_position")
      .single();

    if (error || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Find next contractor in queue
    const { data: next } = await supabaseAdmin
      .from("leads")
      .select("*, contractors(name, company_name, tier, avatar_initials)")
      .eq("request_id", lead.request_id)
      .eq("rank_position", (lead.rank_position ?? 1) + 1)
      .eq("status", "pending")
      .single();

    if (next) {
      const delayMins = next.notification_delay_minutes ?? 0;
      await supabaseAdmin
        .from("leads")
        .update({
          status: "assigned",
          notify_at: new Date(Date.now() + delayMins * 60 * 1000).toISOString(),
        })
        .eq("id", next.id);

      const ct = (next as any).contractors;
      return NextResponse.json({
        success: true,
        action: "declined",
        next_contractor: {
          name: ct?.company_name || ct?.name,
          tier: ct?.tier,
          score: next.composite_score,
        },
      });
    }

    // No one left — mark request as needing re-match
    await supabaseAdmin
      .from("homeowner_requests")
      .update({ status: "pending" })
      .eq("id", lead.request_id);

    return NextResponse.json({
      success: true,
      action: "declined",
      next_contractor: null,
    });
  }

  return NextResponse.json(
    { error: "Invalid action — use accept or decline" },
    { status: 400 },
  );
}
