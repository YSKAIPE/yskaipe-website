// ============================================================
// FILE 5: app/api/lead/route.ts
// POST /api/lead
// Body: { request_id, contractor_id, proposed_terms }
// Called when homeowner confirms terms on Screen 3.
// Writes to lead_assignments, updates leads, dismisses queue.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { request_id, contractor_id, proposed_terms } = await req.json();
  if (!request_id || !contractor_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Update the chosen lead row with proposed terms + assigned status
  const { data: lead, error: leadErr } = await supabaseAdmin
    .from("leads")
    .update({ status: "assigned", proposed_terms })
    .eq("request_id", request_id)
    .eq("contractor_id", contractor_id)
    .select("*")
    .single();

  if (leadErr || !lead) {
    console.error("[/api/lead]", leadErr);
    return NextResponse.json(
      { error: "Lead assignment not found" },
      { status: 404 },
    );
  }

  // ── Write to lead_assignments (customer chose this contractor) ──
  const { error: assignErr } = await supabaseAdmin
    .from("lead_assignments")
    .insert({
      request_id,
      contractor_id,
      assigned_by: "customer",
      rank_at_assignment: lead.rank_position,
      status: "active",
    });
  if (assignErr) {
    console.error("[/api/lead] lead_assignments insert failed:", assignErr);
    // Non-fatal — homeowner flow continues even if this fails
  }

  // ── Dismiss all other pending leads for this request ──
  // Removes this job from every other contractor's queue view
  await supabaseAdmin
    .from("leads")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("request_id", request_id)
    .neq("contractor_id", contractor_id)
    .eq("status", "pending");

  // Pull contractor details for confirmation screen
  const { data: contractor } = await supabaseAdmin
    .from("contractors")
    .select(
      "id, name, company_name, email, phone, avatar_initials, tier, is_founding, review_average",
    )
    .eq("id", contractor_id)
    .single();

  // Increment monthly lead count
  await supabaseAdmin.rpc("increment_leads_this_month", {
    p_contractor_id: contractor_id,
  });

  // Generate job reference
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 9).toUpperCase();
  const job_ref = `YSK-${year}-${rand}`;

  return NextResponse.json({
    lead_id: lead.id,
    job_ref,
    contractor,
    notify_at: lead.notify_at,
  });
}
