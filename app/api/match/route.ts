/**
 * app/api/match/route.ts
 * ─────────────────────────────────────────────────────────────────
 * Worker/contractor matching with tier enforcement.
 *
 * Two dispatch paths depending on job type:
 *
 *   Path A — Licensed jobs (tier_min = 'licensed'):
 *     Queries the `contractors` table (existing founding contractors).
 *     These are verified, licensed, insured. Uses lead scoring.
 *     Writes to `lead_assignments` table (existing flow).
 *
 *   Path B — Primary / Youth jobs (tier_min = 'primary' | 'youth'):
 *     Queries the `workers` table (new Phase 1 table).
 *     First-come-first-serve dispatch model.
 *     Filters by: status='qualified', tier eligibility, ZIP proximity, skills.
 *     Writes to `job_claims` table.
 *
 * Tier gate rule (hard-enforced):
 *   - requires_license=true → licensed contractors only, full stop
 *   - tier_min='primary'   → primary OR licensed workers
 *   - tier_min='youth'     → any worker tier (but youth_ok must be true on task)
 *
 * Called by:
 *   - instant-quote-book (Phase 3: after payment capture)
 *   - Admin dashboard (manual dispatch override)
 * ─────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getTaskBySlug, isWorkerEligible, WorkerTier } from '@/lib/service-tasks'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM   = 'YSKAIPE <gr8@yskaipe.com>'

// ── Tier rank helper ───────────────────────────────────────────────
const TIER_RANK: Record<WorkerTier, number> = { youth: 0, primary: 1, licensed: 2 }

function workerMeetsTierMin(workerTier: WorkerTier, taskTierMin: WorkerTier): boolean {
  return TIER_RANK[workerTier] >= TIER_RANK[taskTierMin]
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { job_id, task_slug, zip_code, override_tier } = body

    if (!task_slug) {
      return NextResponse.json({ error: 'task_slug is required' }, { status: 400 })
    }

    // ── Resolve task + flags ──────────────────────────────────────
    const task = await getTaskBySlug(task_slug)
    if (!task) {
      return NextResponse.json({ error: `Unknown task: ${task_slug}` }, { status: 400 })
    }

    const effectiveTierMin = (override_tier as WorkerTier | undefined) ?? task.tier_min

    // ── PATH A: Licensed jobs → contractors table ─────────────────
    if (task.requires_license || effectiveTierMin === 'licensed') {
      return await dispatchToLicensedContractors({
        job_id,
        task,
        zip_code,
        supabaseAdmin,
        resend,
      })
    }

    // ── PATH B: Primary / Youth jobs → workers table ──────────────
    return await dispatchToWorkers({
      job_id,
      task,
      zip_code,
      effectiveTierMin,
      supabaseAdmin,
      resend,
    })

  } catch (err) {
    console.error('[match] Fatal error:', err)
    return NextResponse.json({ error: 'Match failed.' }, { status: 500 })
  }
}

// ─────────────────────────────────────────────────────────────────
// PATH A: Licensed contractor dispatch (existing lead scoring flow)
// ─────────────────────────────────────────────────────────────────
async function dispatchToLicensedContractors({
  job_id, task, zip_code, supabaseAdmin, resend,
}: any) {
  // Query contractors table — only licensed, active, matching category
  const { data: contractors, error } = await supabaseAdmin
    .from('contractors')
    .select('id, name, email, phone, trade, zip_code')
    .eq('active', true)
    .ilike('trade', `%${task.category}%`)

  if (error) {
    console.error('[match/licensed] contractors query error:', error)
    return NextResponse.json({ error: 'Contractor query failed.' }, { status: 500 })
  }

  if (!contractors || contractors.length === 0) {
    // No match — notify admin to manually assign
    await resend.emails.send({
      from: FROM,
      to: 'gr8@yskaipe.com',
      subject: `⚠️ No licensed contractor match — ${task.label} · ZIP ${zip_code ?? '?'}`,
      html: `<p>Job ${job_id ?? '(no id)'} for <strong>${task.label}</strong> in ZIP ${zip_code ?? '?'} has no licensed contractor match. Manual assignment required.</p>`,
    }).catch(() => {})

    return NextResponse.json({
      dispatched: false,
      path: 'licensed',
      reason: 'No licensed contractors available for this category and ZIP. Admin notified.',
    })
  }

  // Write lead_assignment rows for matched contractors
  const assignments = contractors.map((c: any) => ({
    job_id: job_id ?? null,
    contractor_id: c.id,
    task_slug: task.slug,
    status: 'pending',
    requires_license: task.requires_license,
  }))

  const { error: assignError } = await supabaseAdmin
    .from('lead_assignments')
    .insert(assignments)

  if (assignError) {
    console.error('[match/licensed] lead_assignments insert error:', assignError)
  }

  // Notify each matched contractor
  for (const c of contractors) {
    await resend.emails.send({
      from: FROM,
      to: c.email,
      replyTo: 'gr8@yskaipe.com',
      subject: `New job opportunity — ${task.label}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px">
          <h2>You've been matched to a new job, ${c.name.split(' ')[0]}.</h2>
          <p><strong>Service:</strong> ${task.label}</p>
          <p><strong>Category:</strong> ${task.category}</p>
          <p><strong>Area:</strong> ZIP ${zip_code ?? 'nearby'}</p>
          ${task.permit_likely ? '<p>⚠️ This job may require a permit.</p>' : ''}
          <p>Log in to your YSKAIPE dashboard to accept or decline this job.</p>
          <p style="font-size:12px;color:#999">This is a licensed-pro job. Your credentials are on file.</p>
        </div>
      `,
    }).catch((e) => console.error(`[match/licensed] Notify contractor ${c.id} failed:`, e))
  }

  return NextResponse.json({
    dispatched: true,
    path: 'licensed',
    matched_count: contractors.length,
    task_slug: task.slug,
    requires_license: true,
  })
}

// ─────────────────────────────────────────────────────────────────
// PATH B: Primary/Youth worker dispatch (new workers table)
// ─────────────────────────────────────────────────────────────────
async function dispatchToWorkers({
  job_id, task, zip_code, effectiveTierMin, supabaseAdmin, resend,
}: any) {
  // Query workers table
  // Filter: qualified status, correct tier, skills includes task slug or category
  const { data: allWorkers, error } = await supabaseAdmin
    .from('workers')
    .select('id, full_name, email, tier, zip_code, skills, status')
    .eq('status', 'qualified')

  if (error) {
    console.error('[match/workers] workers query error:', error)
    return NextResponse.json({ error: 'Worker query failed.' }, { status: 500 })
  }

  if (!allWorkers || allWorkers.length === 0) {
    await resend.emails.send({
      from: FROM,
      to: 'gr8@yskaipe.com',
      subject: `⚠️ No workers available — ${task.label} · ZIP ${zip_code ?? '?'}`,
      html: `<p>No qualified workers found for <strong>${task.label}</strong> (${task.slug}) in ZIP ${zip_code ?? '?'}. Manual assignment needed.</p>`,
    }).catch(() => {})

    return NextResponse.json({
      dispatched: false,
      path: 'workers',
      reason: 'No qualified workers available. Admin notified.',
    })
  }

  // Apply tier gate — HARD RULE
  const eligible = allWorkers.filter((w: any) => {
    const wTier = (w.tier ?? 'primary') as WorkerTier

    // License hard block
    if (task.requires_license && wTier !== 'licensed') return false

    // Tier minimum
    if (!workerMeetsTierMin(wTier, effectiveTierMin)) return false

    // Skills match (task slug or category in worker skills array)
    const skills: string[] = w.skills ?? []
    const slugMatch = skills.includes(task.slug)
    const catMatch  = skills.some((s) => s.toLowerCase() === task.category.toLowerCase())
    const handyman  = skills.includes('life_handyman_misc')
    if (!slugMatch && !catMatch && !handyman) return false

    return true
  })

  // ZIP proximity sort — exact match first, then fallback to all eligible
  const zipMatched = eligible.filter((w: any) => w.zip_code === zip_code)
  const targets = zipMatched.length > 0 ? zipMatched : eligible

  if (targets.length === 0) {
    await resend.emails.send({
      from: FROM,
      to: 'gr8@yskaipe.com',
      subject: `⚠️ No eligible workers — ${task.label} · tier=${effectiveTierMin} · ZIP ${zip_code ?? '?'}`,
      html: `<p>Found ${allWorkers.length} qualified workers but none passed the tier gate (tier_min=${effectiveTierMin}, requires_license=${task.requires_license}) or skills filter for <strong>${task.slug}</strong>. Manual assignment needed.</p>`,
    }).catch(() => {})

    return NextResponse.json({
      dispatched: false,
      path: 'workers',
      reason: `No workers meet tier requirement (${effectiveTierMin}) for this job type.`,
      tier_gate: effectiveTierMin,
      requires_license: task.requires_license,
    })
  }

  // Write job_claims rows (first-come-first-serve: workers notified, first accept wins)
  const claims = targets.map((w: any) => ({
    job_id: job_id ?? null,
    worker_id: w.id,
    task_slug: task.slug,
    status: 'offered',        // offered → accepted | declined | expired
  }))

  const { error: claimError } = await supabaseAdmin
    .from('job_claims')
    .insert(claims)

  if (claimError) {
    console.error('[match/workers] job_claims insert error:', claimError)
  }

  // Notify eligible workers
  const notified: string[] = []
  for (const w of targets) {
    const { error: emailError } = await resend.emails.send({
      from: FROM,
      to: w.email,
      subject: `New job available — ${task.label} · First come first serve`,
      html: `
        <div style="font-family:sans-serif;max-width:520px">
          <h2>Hey ${w.full_name.split(' ')[0]}, there's a job near you.</h2>

          <div style="background:#f5f5f0;border-radius:8px;padding:16px 20px;margin:20px 0">
            <p style="margin:0 0 4px;font-size:13px;color:#666">Job type</p>
            <p style="margin:0;font-weight:600;font-size:16px">${task.label}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#444">${task.category} · ${task.domain}</p>
          </div>

          <div style="background:#f5f5f0;border-radius:8px;padding:16px 20px;margin:20px 0">
            <p style="margin:0 0 4px;font-size:13px;color:#666">Estimated payout (your cut after 15% platform fee)</p>
            <p style="margin:0;font-weight:600;font-size:18px;color:#0d0e0c">
              $${Math.round((task.fri_low ?? 80) * 0.85)}–$${Math.round((task.fri_high ?? 300) * 0.85)}
            </p>
            <p style="margin:4px 0 0;font-size:12px;color:#666">${task.fri_unit === 'flat' ? 'flat rate' : task.fri_unit.replace('_',' ')}</p>
          </div>

          <p><strong>Area:</strong> ZIP ${zip_code ?? 'nearby'}</p>
          ${task.permit_likely ? '<p style="color:#b8860b">⚠️ This job may involve a permit. Advise the homeowner.</p>' : ''}

          <p><strong>First worker to accept gets the job.</strong> Log in to your YSKAIPE worker dashboard to claim it.</p>

          <p style="font-size:12px;color:#999;margin-top:24px">
            Homeowner address and contact info are revealed after you accept and payment is confirmed.
          </p>
        </div>
      `,
    })

    if (!emailError) notified.push(w.id)
    else console.error(`[match/workers] Notify worker ${w.id} failed:`, emailError)
  }

  return NextResponse.json({
    dispatched: true,
    path: 'workers',
    matched_count: targets.length,
    notified_count: notified.length,
    task_slug: task.slug,
    tier_gate: effectiveTierMin,
    requires_license: task.requires_license,
    zip_matched: zipMatched.length,
  })
}
