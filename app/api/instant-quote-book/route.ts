/**
 * app/api/instant-quote-book/route.ts
 * ─────────────────────────────────────────────────────────────────
 * Booking flow: captures homeowner intent after quote is shown.
 *
 * What this does:
 *   1. Validates payload (homeowner contact + quote data)
 *   2. Writes a row to the `jobs` table with task_slug + tier_min
 *   3. Fires admin alert to gr8@yskaipe.com
 *   4. Fires homeowner confirmation email
 *   5. Triggers worker dispatch (calls /api/job-notify internally)
 *
 * Phase 2 TODO: Stripe payment capture before dispatch reveal.
 * Phase 3 TODO: /api/job-notify broadcasts to matched workers by ZIP + tier.
 *
 * Tier enforcement:
 *   - tier_min comes from service_tasks (passed through from instant-quote)
 *   - job row carries tier_min so the dispatch query can filter workers
 *   - No licensed job ever reaches a Primary/Youth worker feed
 * ─────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { getTaskBySlug } from '@/lib/service-tasks'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM   = 'YSKAIPE <gr8@yskaipe.com>'
const ADMIN  = 'gr8@yskaipe.com'

function generateConfirmNumber(): string {
  return 'YSK-' + Math.random().toString(36).slice(2, 8).toUpperCase()
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      // Homeowner contact
      firstName, lastName, email, phone,
      // Job details
      slug,           // task slug from instant-quote response
      description,    // original homeowner description
      zip,
      timing,         // e.g. "this week", "flexible"
      // Quote data (passed through from UI for record-keeping)
      fri_low, fri_high, fri_unit,
      label, category, domain,
      tier_min, requires_license, permit_likely,
    } = body

    // ── Validation ────────────────────────────────────────────────
    if (!firstName || !lastName || !email || !phone || !slug || !description) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    // Verify slug is valid in service_tasks
    const task = await getTaskBySlug(slug)
    if (!task) {
      return NextResponse.json({ error: 'Unknown service type.' }, { status: 400 })
    }

    const confirmNumber = generateConfirmNumber()

    // ── Write to jobs table ───────────────────────────────────────
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .insert({
        // Identity
        confirm_number: confirmNumber,
        status: 'pending',                // pending → claimed → in_progress → complete

        // Task classification (from service_tasks)
        task_slug: task.slug,
        task_label: task.label,
        task_category: task.category,
        domain: task.domain,
        tier_min: task.tier_min,          // dispatch gate lives here
        requires_license: task.requires_license,
        permit_likely: task.permit_likely,

        // Homeowner (address revealed only after payment/claim)
        homeowner_name: `${firstName} ${lastName}`,
        homeowner_email: email,
        homeowner_phone: phone,
        zip_code: zip ?? null,
        description,
        timing: timing ?? null,

        // FRI pricing snapshot
        book_price: body.book_price ?? null,
        worker_payout: body.worker_payout ?? null,
        needs_site_assessment: body.needs_site_assessment ?? false,
        fri_low: task.fri_low,
        fri_high: task.fri_high,
        fri_unit: task.fri_unit,
      })
      .select('id')
      .single()

    if (jobError) {
      console.error('[instant-quote-book] DB error:', jobError)
      // Don't expose DB error to client — still send emails, return success
    }

    const jobId = job?.id ?? null

    // ── Admin alert ───────────────────────────────────────────────
    await resend.emails.send({
      from: FROM,
      to: ADMIN,
      replyTo: email,
      subject: `[${confirmNumber}] New job — ${task.label} · ${zip ?? 'no ZIP'} · ${task.tier_min} tier`,
      html: `
        <h2 style="font-family:sans-serif">New YSKAIPE Job Booking</h2>
        <table style="font-family:sans-serif;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:4px 12px 4px 0;color:#666">Confirm #</td><td><strong>${confirmNumber}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Homeowner</td><td>${firstName} ${lastName}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Email</td><td>${email}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Phone</td><td>${phone}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">ZIP</td><td>${zip ?? '—'}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Task</td><td>${task.label} (${task.category})</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Slug</td><td>${task.slug}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Domain</td><td>${task.domain}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Min tier</td><td><strong>${task.tier_min}</strong></td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">License req.</td><td>${task.requires_license ? '⚠️ YES' : 'No'}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Permit likely</td><td>${task.permit_likely ? '⚠️ YES' : 'No'}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">FRI range</td><td>$${task.fri_low ?? '?'}–$${task.fri_high ?? '?'} ${task.fri_unit}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Timing</td><td>${timing ?? 'Not specified'}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;color:#666">Description</td><td style="max-width:400px">${description}</td></tr>
          ${jobId ? `<tr><td style="padding:4px 12px 4px 0;color:#666">Job ID</td><td style="font-family:monospace;font-size:12px">${jobId}</td></tr>` : ''}
        </table>
        <p style="font-family:sans-serif;font-size:12px;color:#999;margin-top:24px">
          Dispatch: Find ${task.tier_min}+ workers in ZIP ${zip ?? '?'} for task_slug=${task.slug}
        </p>
      `,
    }).catch((e) => console.error('[instant-quote-book] Admin email failed:', e))

    // ── Homeowner confirmation ─────────────────────────────────────
    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `Your YSKAIPE quote is confirmed — ${confirmNumber}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2 style="color:#0d0e0c">We've got your request, ${firstName}.</h2>
          <p>Your confirmation number is <strong>${confirmNumber}</strong>. Save this — you can use it to check your job status.</p>

          <div style="background:#f5f5f0;border-radius:8px;padding:16px 20px;margin:20px 0">
            <p style="margin:0 0 8px;font-size:13px;color:#666">What you requested</p>
            <p style="margin:0;font-weight:500">${task.label}</p>
            <p style="margin:4px 0 0;font-size:14px;color:#444">${description}</p>
          </div>

          <div style="background:#f5f5f0;border-radius:8px;padding:16px 20px;margin:20px 0">
            <p style="margin:0 0 8px;font-size:13px;color:#666">Fair Rate Index estimate</p>
            <p style="margin:0;font-size:22px;font-weight:600;color:#0d0e0c">$${task.fri_low ?? '?'}–$${task.fri_high ?? '?'}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#666">${task.fri_unit === 'flat' ? 'flat rate' : task.fri_unit.replace('_',' ')} · NC Fair Rate Index baseline</p>
          </div>

          <h3>What happens next</h3>
          <ol style="padding-left:20px;line-height:1.8;color:#333">
            <li>We match your job to a qualified YSKAIPE worker in your area</li>
            <li>The first available worker claims your job</li>
            <li>You'll receive an email introduction with their name and contact info</li>
            <li>Payment is processed securely through YSKAIPE — your worker is paid after the job is complete</li>
          </ol>

          ${task.permit_likely ? `<div style="border-left:3px solid #f0a500;padding:10px 14px;margin:16px 0;background:#fffbf0;font-size:13px;color:#7a5800">
            <strong>Heads up:</strong> This type of job may require a local permit. Your YSKAIPE pro will advise you on next steps.
          </div>` : ''}

          ${task.requires_license ? `<div style="border-left:3px solid #b8f073;padding:10px 14px;margin:16px 0;background:#f7fff0;font-size:13px;color:#3a5a00">
            <strong>Licensed pro required:</strong> We'll match you with a state-licensed, insured professional for this job.
          </div>` : ''}

          <p style="font-size:12px;color:#999;margin-top:32px">
            Questions? Reply to this email or contact us at gr8@yskaipe.com<br>
            YSKAIPE · Cornelius, NC · yskaipe.com
          </p>
        </div>
      `,
    }).catch((e) => console.error('[instant-quote-book] Confirmation email failed:', e))

    // ── Phase 3 hook: trigger worker dispatch ─────────────────────
    // TODO Phase 3: uncomment once /api/job-notify is live
    // if (jobId) {
    //   fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/job-notify`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ job_id: jobId }),
    //   }).catch((e) => console.error('[instant-quote-book] Dispatch failed:', e))
    // }

    return NextResponse.json({
      success: true,
      confirm_number: confirmNumber,
      job_id: jobId,
    })

  } catch (err) {
    console.error('[instant-quote-book] Fatal error:', err)
    return NextResponse.json(
      { error: 'Booking failed. Please try again or email gr8@yskaipe.com.' },
      { status: 500 }
    )
  }
}
