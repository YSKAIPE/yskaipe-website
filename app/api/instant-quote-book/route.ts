/**
 * app/api/instant-quote-book/route.ts
 * ─────────────────────────────────────────────────────────────────
 * Real schema booking flow:
 *   1. INSERT homeowner_requests  → get request id
 *   2. INSERT jobs (linked via homeowner_request_id)
 *   3. Query workers by tier/skills/zip
 *   4. INSERT job_claims for each matched worker
 *   5. Email workers (dispatch) + homeowner (confirmation) + admin
 * ─────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getTaskBySlug } from "@/lib/service-tasks";

// Map task category/slug to homeowner_requests trade enum
function toTradeEnum(
  category: string,
  slug: string | null | undefined,
): string {
  const cat = (category ?? "").toLowerCase();
  const s = (slug ?? "").toLowerCase();
  if (cat.includes("hvac") || s.includes("hvac")) return "hvac";
  if (cat.includes("plumb") || s.includes("plumb")) return "plumbing";
  if (cat.includes("electr") || s.includes("elec")) return "electrical";
  if (cat.includes("roof") || s.includes("roof")) return "roofing";
  if (
    cat.includes("landscape") ||
    cat.includes("landscaping") ||
    s.includes("land_")
  )
    return "landscaping";
  if (cat.includes("paint") || s.includes("paint")) return "painting";
  if (cat.includes("automotive") || s.includes("auto")) return "automotive";
  return "general_contracting"; // safe default
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = "YSKAIPE <gr8@yskaipe.com>";
const ADMIN = "gr8@yskaipe.com";

function makeConfirm() {
  return "YSK-" + Math.random().toString(36).slice(2, 8).toUpperCase();
}
function fmt(n: number | null | undefined) {
  if (!n) return "$—";
  return "$" + Math.round(n).toLocaleString("en-US");
}

// age_tier → tier rank for gate logic
const AGE_TIER_RANK: Record<string, number> = {
  junior: 0,
  standard: 1,
  adult: 2,
};
const TASK_TIER_RANK: Record<string, number> = {
  youth: 0,
  primary: 1,
  licensed: 2,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      firstName,
      lastName,
      email,
      phone,
      timing,
      slug,
      description,
      zip,
      tier_min,
      requires_license,
      permit_likely,
      label,
      category,
      domain,
      book_price,
      worker_payout,
      needs_consultation,
      fri_low,
      fri_high,
      fri_unit,
    } = body;

    // ── Validation ────────────────────────────────────────────────
    if (!firstName || !lastName || !email || !phone || !description) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 },
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 },
      );
    }

    const task = slug ? await getTaskBySlug(slug) : null;
    const taskLabel = task?.label ?? label ?? "Home Service";
    const taskCat = task?.category ?? category ?? "General";
    const taskDomain = task?.domain ?? domain ?? "home";
    const taskTierMin = task?.tier_min ?? tier_min ?? "primary";
    const taskLicReq = task?.requires_license ?? requires_license ?? false;
    const taskPermit = task?.permit_likely ?? permit_likely ?? false;

    const confirmNumber = makeConfirm();
    const homeownerName = `${firstName} ${lastName}`;

    // ── 1. Create homeowner_requests row ──────────────────────────
    const { data: hrRow, error: hrErr } = await supabase
      .from("homeowner_requests")
      .insert({
        homeowner_name: homeownerName,
        homeowner_email: email,
        homeowner_phone: phone,
        zip_code: zip ?? null,
        trade: toTradeEnum(taskCat, slug) as any,
        description,
        quote_low: fri_low ? Math.round(fri_low) : null,
        quote_high: fri_high ? Math.round(fri_high) : null,
        difficulty_score: taskLicReq ? 8 : 5,
        status: "pending",
      })
      .select("id")
      .single();

    if (hrErr) {
      console.error("[book] homeowner_requests insert error:", hrErr);
    }

    const hrId = hrRow?.id ?? null;

    // ── 2. Create jobs row ────────────────────────────────────────
    const { data: jobRow, error: jobErr } = await supabase
      .from("jobs")
      .insert({
        homeowner_request_id: hrId,
        confirm_number: confirmNumber,
        status: "pending",
        description,
        zip_code: zip ?? null,
        task_slug: slug ?? null,
        task_label: taskLabel,
        task_category: taskCat,
        domain: taskDomain,
        tier_min: taskTierMin,
        requires_license: taskLicReq,
        permit_likely: taskPermit,
        timing: timing ?? null,
        book_price: book_price ?? null,
        worker_payout: worker_payout ?? null,
        needs_site_assessment: needs_consultation ?? false,
        fri_low: fri_low ?? null,
        fri_high: fri_high ?? null,
        fri_unit: fri_unit ?? "flat",
        agreed_price: book_price ?? null,
        quoted_low: fri_low ?? null,
        quoted_high: fri_high ?? null,
      })
      .select("id")
      .single();

    if (jobErr) {
      console.error("[book] jobs insert error:", jobErr);
    }

    const jobId = jobRow?.id ?? null;

    // ── 3. Admin alert ────────────────────────────────────────────
    const priceDisplay = needs_consultation
      ? `Starting from ${fmt(book_price)} (consultation required)`
      : fmt(book_price);

    await resend.emails
      .send({
        from: FROM,
        to: ADMIN,
        replyTo: email,
        subject: `[${confirmNumber}] New booking — ${taskLabel} · ${zip ?? "?"} · ${taskTierMin}`,
        html: `<div style="font-family:sans-serif;max-width:560px">
        <h2>New YSKAIPE Booking — ${confirmNumber}</h2>
        <table style="font-size:14px;border-collapse:collapse">
          <tr><td style="padding:3px 16px 3px 0;color:#666">Homeowner</td><td><strong>${homeownerName}</strong></td></tr>
          <tr><td style="padding:3px 16px 3px 0;color:#666">Email</td><td>${email}</td></tr>
          <tr><td style="padding:3px 16px 3px 0;color:#666">Phone</td><td>${phone}</td></tr>
          <tr><td style="padding:3px 16px 3px 0;color:#666">ZIP</td><td>${zip ?? "—"}</td></tr>
          <tr><td style="padding:3px 16px 3px 0;color:#666">Timing</td><td>${timing ?? "Not specified"}</td></tr>
          <tr><td style="padding:3px 16px 3px 0;color:#666">Job</td><td><strong>${taskLabel}</strong></td></tr>
          <tr><td style="padding:3px 16px 3px 0;color:#666">Tier</td><td>${taskTierMin}${taskLicReq ? " · LICENSE REQUIRED" : ""}</td></tr>
          <tr><td style="padding:3px 16px 3px 0;color:#666">Price</td><td>${priceDisplay}</td></tr>
          <tr><td style="padding:3px 16px 3px 0;color:#666">Worker payout</td><td>${fmt(worker_payout)}</td></tr>
          <tr><td style="padding:3px 16px 3px 0;color:#666">Description</td><td>${description}</td></tr>
          <tr><td style="padding:3px 16px 3px 0;color:#666">Job ID</td><td style="font-family:monospace;font-size:11px">${jobId ?? "—"}</td></tr>
        </table></div>`,
      })
      .catch((e) => console.error("[book] Admin email failed:", e));

    // ── 4. Homeowner confirmation ─────────────────────────────────
    const unitLabel: Record<string, string> = {
      flat: "flat rate",
      per_hour: "per hour",
      per_visit: "per visit",
      per_sqft: "per sq ft",
    };
    await resend.emails
      .send({
        from: FROM,
        to: email,
        subject: `Booked — ${confirmNumber} · ${taskLabel}`,
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#0d0e0c">You're booked, ${firstName}.</h2>
        <p style="color:#444">Confirmation: <strong style="font-family:monospace">${confirmNumber}</strong></p>
        <div style="background:#f5f5f0;border-radius:8px;padding:16px 20px;margin:20px 0">
          <p style="margin:0 0 6px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em">Job</p>
          <p style="margin:0;font-size:17px;font-weight:600">${taskLabel}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#555">${description}</p>
        </div>
        <div style="background:#f5f5f0;border-radius:8px;padding:16px 20px;margin:20px 0">
          <p style="margin:0 0 6px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em">${needs_consultation ? "Estimated starting price" : "Your fair price"}</p>
          <p style="margin:0;font-size:26px;font-weight:700">${fmt(book_price)}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#888">${unitLabel[fri_unit ?? "flat"] ?? "flat rate"} · NC Fair Rate Index</p>
        </div>
        ${
          needs_consultation
            ? `<div style="border-left:3px solid #f0c473;padding:10px 14px;margin:16px 0;background:#fffbf0;font-size:13px;color:#7a5800"><strong>Next step:</strong> A licensed YSKAIPE pro will contact you within 2 hours to schedule a free on-site assessment before any work begins.</div>`
            : `<h3 style="margin-top:20px">What happens next</h3>
             <ol style="padding-left:20px;line-height:1.9;color:#444;font-size:13px">
               <li>Your job is broadcasting to qualified YSKAIPE workers in your area now</li>
               <li>The first worker to claim gets introduced to you by email — usually within 2 hours</li>
               <li>Payment of ${fmt(book_price)} is held in escrow and released only when you confirm the job is complete</li>
             </ol>`
        }
        ${taskPermit ? `<div style="border-left:3px solid #f0c473;padding:10px 14px;margin:16px 0;background:#fffbf0;font-size:13px;color:#7a5800"><strong>Permit note:</strong> This job may require a local permit — your pro will advise.</div>` : ""}
        ${taskLicReq ? `<div style="border-left:3px solid #b8f073;padding:10px 14px;margin:16px 0;background:#f7fff0;font-size:13px;color:#3a5a00"><strong>Licensed pro:</strong> Matched to a state-licensed, insured YSKAIPE professional.</div>` : ""}
        <p style="font-size:11px;color:#999;margin-top:28px">YSKAIPE · Cornelius, NC · yskaipe.com</p>
      </div>`,
      })
      .catch((e) => console.error("[book] Confirmation email failed:", e));

    // ── 5. Dispatch to workers (skip for consultation jobs) ───────
    if (!needs_consultation && jobId) {
      await dispatchWorkers({
        jobId,
        confirmNumber,
        taskSlug: slug,
        taskLabel,
        taskCat,
        taskTierMin,
        taskLicReq,
        taskPermit,
        description,
        zip,
        timing,
        bookPrice: book_price,
        workerPayout: worker_payout,
      });
    }

    return NextResponse.json({
      success: true,
      confirm_number: confirmNumber,
      job_id: jobId,
    });
  } catch (err) {
    console.error("[book] Fatal:", err);
    return NextResponse.json(
      { error: "Booking failed. Please try again or email gr8@yskaipe.com." },
      { status: 500 },
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// Worker dispatch
// ─────────────────────────────────────────────────────────────────
async function dispatchWorkers({
  jobId,
  confirmNumber,
  taskSlug,
  taskLabel,
  taskCat,
  taskTierMin,
  taskLicReq,
  taskPermit,
  description,
  zip,
  timing,
  bookPrice,
  workerPayout,
}: {
  jobId: string;
  confirmNumber: string;
  taskSlug: string | null | undefined;
  taskLabel: string;
  taskCat: string;
  taskTierMin: string;
  taskLicReq: boolean;
  taskPermit: boolean;
  description: string;
  zip: string | null | undefined;
  timing: string | null | undefined;
  bookPrice: number | null | undefined;
  workerPayout: number | null | undefined;
}) {
  // Licensed jobs → contractors table (not workers). Admin handles manually for now.
  if (taskLicReq) {
    await resend.emails
      .send({
        from: FROM,
        to: ADMIN,
        subject: `⚡ Licensed job needs contractor match — ${confirmNumber} · ${taskLabel}`,
        html: `<p>Licensed job <strong>${confirmNumber}</strong> (${taskLabel}) in ZIP ${zip ?? "?"} needs manual contractor assignment.</p>`,
      })
      .catch(() => {});
    return;
  }

  // Query workers
  const { data: workers, error } = await supabase
    .from("workers")
    .select(
      "id, first_name, last_name, email, age_tier, zip_code, skills, status",
    )
    .eq("status", "qualified");

  if (error || !workers?.length) {
    console.error("[dispatch] Workers query error or empty:", error);
    await resend.emails
      .send({
        from: FROM,
        to: ADMIN,
        subject: `⚠️ No workers found — ${confirmNumber} · ${taskLabel}`,
        html: `<p>No qualified workers in DB for job <strong>${confirmNumber}</strong>. Manual assignment needed.</p>`,
      })
      .catch(() => {});
    return;
  }

  // Filter: tier gate + skills match
  const taskTierRank = TASK_TIER_RANK[taskTierMin] ?? 1;

  const eligible = workers.filter((w) => {
    // Map age_tier to rank: junior=0, standard/adult=1+
    const wRank = AGE_TIER_RANK[w.age_tier ?? "standard"] ?? 1;

    // Youth-only gate: primary jobs exclude juniors
    if (taskTierRank >= 1 && wRank < 1) return false;

    // Skills match
    const skills: string[] = w.skills ?? [];
    if (!skills.length) return true;
    const slugMatch = taskSlug ? skills.includes(taskSlug) : false;
    const catMatch = skills.some((s) =>
      s
        .toLowerCase()
        .includes((taskCat ?? "").toLowerCase().split(" ")[0].toLowerCase()),
    );
    const handyman = skills.includes("life_handyman_misc");
    return slugMatch || catMatch || handyman;
  });

  // ZIP-first sort
  const zipMatch = zip ? eligible.filter((w) => w.zip_code === zip) : [];
  const targets = zipMatch.length > 0 ? zipMatch : eligible;

  if (!targets.length) {
    await resend.emails
      .send({
        from: FROM,
        to: ADMIN,
        subject: `⚠️ No eligible workers — ${confirmNumber} · ${taskLabel} · ${taskTierMin}`,
        html: `<p>Found ${workers.length} qualified workers but none passed tier/skills gate for <strong>${taskLabel}</strong>. Manual assignment needed.</p>`,
      })
      .catch(() => {});
    return;
  }

  // Write job_claims
  const claims = targets.map((w) => ({
    job_id: jobId,
    worker_id: w.id,
    task_slug: taskSlug ?? null,
    claim_type: "offered",
    status: "offered",
    notified_at: new Date().toISOString(),
  }));

  const { error: claimsErr } = await supabase.from("job_claims").insert(claims);
  if (claimsErr)
    console.error("[dispatch] job_claims insert error:", claimsErr);

  // Email each worker
  for (const w of targets) {
    const firstName = w.first_name ?? "there";
    await resend.emails
      .send({
        from: FROM,
        to: w.email,
        subject: `🔔 New job — ${taskLabel} · ${zip ?? "nearby"} · First claim wins`,
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#0d0e0c">Hey ${firstName}, there's a job for you.</h2>
        <p style="color:#555;font-size:13px">First YSKAIPE worker to claim gets it.</p>
        <div style="background:#f5f5f0;border-radius:8px;padding:16px 20px;margin:18px 0">
          <p style="margin:0 0 5px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em">Job</p>
          <p style="margin:0;font-size:17px;font-weight:600">${taskLabel}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#555">${description}</p>
          <p style="margin:8px 0 0;font-size:12px;color:#888">ZIP ${zip ?? "nearby"}${timing ? ` · ${timing}` : ""}</p>
        </div>
        <div style="background:#f0fff4;border-radius:8px;padding:16px 20px;margin:18px 0;border:1px solid #b8f073">
          <p style="margin:0 0 4px;font-size:11px;color:#3a5a00;text-transform:uppercase;letter-spacing:.08em">Your payout</p>
          <p style="margin:0;font-size:26px;font-weight:700;color:#0d0e0c">${fmt(workerPayout)}</p>
          <p style="margin:4px 0 0;font-size:11px;color:#666">After 15% YSKAIPE fee · Job total: ${fmt(bookPrice)}</p>
        </div>
        ${taskPermit ? '<p style="color:#b8860b;font-size:13px">⚠️ This job may require a permit — advise the homeowner.</p>' : ""}
        <div style="background:#fff8e1;border-radius:8px;padding:14px 18px;margin:18px 0;border:1px solid #f0c473">
          <p style="margin:0;font-size:13px;color:#7a5800;line-height:1.6">
            <strong>To claim:</strong> Reply to this email with "I'll take it" — or log in to your worker dashboard.
            Homeowner contact and address revealed after you claim.
          </p>
        </div>
        <p style="font-size:11px;color:#999;margin-top:20px">Ref: <span style="font-family:monospace">${confirmNumber}</span> · YSKAIPE · Cornelius, NC</p>
      </div>`,
      })
      .catch((e) =>
        console.error(`[dispatch] Worker email failed ${w.email}:`, e),
      );
  }

  console.log(
    `[dispatch] ${confirmNumber} — notified ${targets.length} workers for "${taskLabel}"`,
  );
}
