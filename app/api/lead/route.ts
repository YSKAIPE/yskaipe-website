// ============================================================
// FILE 5: app/api/lead/route.ts
// POST /api/lead
// Body: { request_id, contractor_id, proposed_terms }
// Called when homeowner confirms terms on Screen 3.
// Writes proposed_terms to the lead, increments monthly cap.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: NextRequest) {
  const { request_id, contractor_id, proposed_terms } = await req.json();

  if (!request_id || !contractor_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Update assignment with proposed terms
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
