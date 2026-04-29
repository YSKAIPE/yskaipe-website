// ============================================================
// FILE: app/api/lead/route.ts
// POST /api/lead
// Body: { request_id, contractor_id, proposed_terms }
// Called when homeowner confirms terms on Screen 3 (match.html).
// Writes to lead_assignments, updates leads, dismisses queue,
// and emails the chosen contractor with full lead details.
//
// CHANGED 2026-04-29: contractor notification email added.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  buildContractorLeadEmailHTML,
  buildContractorLeadEmailText,
  type ContractorLeadEmailData,
} from "@/lib/email/contractor-lead";

const resend = new Resend(process.env.RESEND_API_KEY!);

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

  // ──────────────────────────────────────────────────────────
  // CONTRACTOR NOTIFICATION EMAIL
  // Non-fatal — homeowner flow always succeeds even if this fails.
  // ──────────────────────────────────────────────────────────
  if (contractor?.email) {
    try {
      const { data: hr } = await supabaseAdmin
        .from("homeowner_requests")
        .select(
          "homeowner_name, homeowner_email, homeowner_phone, zip_code, trade, description, quote_low, quote_high, difficulty_score",
        )
        .eq("id", request_id)
        .single();

      if (hr) {
        const emailData: ContractorLeadEmailData = {
          contractor_name: contractor.name,
          contractor_company: contractor.company_name,
          homeowner_name: hr.homeowner_name,
          homeowner_email: hr.homeowner_email,
          homeowner_phone: hr.homeowner_phone,
          trade: hr.trade,
          zip_code: hr.zip_code,
          description: hr.description,
          quote_low: hr.quote_low,
          quote_high: hr.quote_high,
          difficulty_score: hr.difficulty_score,
          job_ref,
          rank_position: lead.rank_position,
        };

        const { error: emailErr } = await resend.emails.send({
          from: "YSKAIPE Leads <gr8@yskaipe.com>",
          to: [contractor.email],
          // Reply-to homeowner so the contractor's Reply goes straight to them
          replyTo: hr.homeowner_email,
          subject: `New lead — ${hr.trade} · ${hr.zip_code} · ${job_ref}`,
          html: buildContractorLeadEmailHTML(emailData),
          text: buildContractorLeadEmailText(emailData),
        });

        if (emailErr) {
          console.error("[/api/lead] Resend send failed:", emailErr);
        } else {
          console.log(
            `[/api/lead] Notification sent to ${contractor.email} for ${job_ref}`,
          );
        }
      } else {
        console.warn(
          "[/api/lead] homeowner_requests row not found for email — skipping",
        );
      }
    } catch (e) {
      console.error("[/api/lead] Email send threw:", e);
      // Swallow — never block the homeowner response on email failure
    }
  } else {
    console.warn(
      `[/api/lead] No email for contractor ${contractor_id} — skipping notification`,
    );
  }

  return NextResponse.json({
    lead_id: lead.id,
    job_ref,
    contractor,
    notify_at: lead.notify_at,
  });
}
