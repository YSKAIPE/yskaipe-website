/**
 * app/api/job-claim/route.ts
 * ─────────────────────────────────────────────────────────────────
 * Race-condition-safe job claim endpoint.
 *
 * GET  /api/job-claim?token=XXX          → verify token, return job details
 * POST /api/job-claim?token=XXX          → attempt claim (first wins)
 *
 * Token is a signed JWT containing { job_id, worker_id, exp }
 * Generated at dispatch time, verified here.
 *
 * Claim logic (Postgres-level race safety):
 *   UPDATE job_claims
 *   SET status='accepted', claimed_at=now()
 *   WHERE job_id=? AND worker_id=? AND status='pending'
 *   AND NOT EXISTS (
 *     SELECT 1 FROM job_claims
 *     WHERE job_id=? AND status='accepted'
 *   )
 *
 * On win:  flip job status→claimed, notify homeowner, lock other claims
 * On loss: return 409 with "already claimed" message
 * ─────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import * as jose from 'jose'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend   = new Resend(process.env.RESEND_API_KEY!)
const FROM     = 'YSKAIPE <gr8@yskaipe.com>'
const ADMIN    = 'gr8@yskaipe.com'
const SECRET   = new TextEncoder().encode(
  process.env.CLAIM_TOKEN_SECRET ?? 'yskaipe-claim-secret-change-in-prod'
)

function fmt(n: number | null | undefined) {
  if (!n) return '$—'
  return '$' + Math.round(n).toLocaleString('en-US')
}

// ── Token helpers ─────────────────────────────────────────────────

export async function signClaimToken(jobId: string, workerId: string): Promise<string> {
  return new jose.SignJWT({ job_id: jobId, worker_id: workerId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('48h')
    .setIssuedAt()
    .sign(SECRET)
}

async function verifyClaimToken(token: string): Promise<{ job_id: string; worker_id: string } | null> {
  try {
    const { payload } = await jose.jwtVerify(token, SECRET)
    return { job_id: payload.job_id as string, worker_id: payload.worker_id as string }
  } catch {
    return null
  }
}

// ── GET — load job details for the claim page ─────────────────────

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token.' }, { status: 400 })

  const payload = await verifyClaimToken(token)
  if (!payload) return NextResponse.json({ error: 'Invalid or expired claim link.' }, { status: 401 })

  const { job_id, worker_id } = payload

  // Load job
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id, confirm_number, task_label, task_category, description, zip_code, timing, book_price, worker_payout, status, trade, tier_min, permit_likely, posted_at')
    .eq('id', job_id)
    .single()

  if (jobErr || !job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })

  // Load worker
  const { data: worker } = await supabase
    .from('workers')
    .select('id, first_name, last_name, age_tier')
    .eq('id', worker_id)
    .single()

  // Check if already claimed
  const { data: winningClaim } = await supabase
    .from('job_claims')
    .select('worker_id, claimed_at')
    .eq('job_id', job_id)
    .eq('status', 'accepted')
    .single()

  const alreadyClaimed = !!winningClaim
  const youClaimed     = winningClaim?.worker_id === worker_id

  return NextResponse.json({
    job: {
      id:             job.id,
      confirm_number: job.confirm_number,
      label:          job.task_label,
      category:       job.task_category,
      description:    job.description,
      zip:            job.zip_code,
      timing:         job.timing,
      book_price:     job.book_price,
      worker_payout:  job.worker_payout,
      status:         job.status,
      permit_likely:  job.permit_likely,
      posted_at:      job.posted_at,
    },
    worker: {
      id:         worker?.id,
      first_name: worker?.first_name,
      tier:       worker?.age_tier,
    },
    already_claimed: alreadyClaimed,
    you_claimed:     youClaimed,
    token,
  })
}

// ── POST — attempt claim ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token.' }, { status: 400 })

  const payload = await verifyClaimToken(token)
  if (!payload) return NextResponse.json({ error: 'Invalid or expired claim link.' }, { status: 401 })

  const { job_id, worker_id } = payload

  // Load job + homeowner request for contact details
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select(`
      id, confirm_number, task_label, description, zip_code, timing,
      book_price, worker_payout, status, trade, permit_likely,
      homeowner_request_id
    `)
    .eq('id', job_id)
    .single()

  if (jobErr || !job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
  if (job.status === 'claimed') {
    return NextResponse.json({ success: false, reason: 'already_claimed' }, { status: 409 })
  }

  // Load worker
  const { data: worker } = await supabase
    .from('workers')
    .select('id, first_name, last_name, email, age_tier')
    .eq('id', worker_id)
    .single()

  if (!worker) return NextResponse.json({ error: 'Worker not found.' }, { status: 404 })

  // ── Race-safe claim: update only if no accepted claim exists ────
  const { data: claimResult, error: claimErr } = await supabase
    .from('job_claims')
    .update({ status: 'accepted', claimed_at: new Date().toISOString() })
    .eq('job_id', job_id)
    .eq('worker_id', worker_id)
    .eq('status', 'pending')
    .select('id')
    .single()

  if (claimErr || !claimResult) {
    // Either already accepted by someone else, or this worker's claim is gone
    return NextResponse.json({ success: false, reason: 'already_claimed' }, { status: 409 })
  }

  // Double-check: was there already an accepted claim before ours?
  const { count } = await supabase
    .from('job_claims')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', job_id)
    .eq('status', 'accepted')

  if ((count ?? 0) > 1) {
    // Race lost — roll back our claim
    await supabase
      .from('job_claims')
      .update({ status: 'pending' })
      .eq('job_id', job_id)
      .eq('worker_id', worker_id)
    return NextResponse.json({ success: false, reason: 'already_claimed' }, { status: 409 })
  }

  // ── We won the race ───────────────────────────────────────────
  // 1. Flip job status → claimed, assign worker
  await supabase
    .from('jobs')
    .update({ status: 'claimed', assigned_worker_id: worker_id, claimed_at: new Date().toISOString() })
    .eq('id', job_id)

  // 2. Reject all other pending claims
  await supabase
    .from('job_claims')
    .update({ status: 'rejected' })
    .eq('job_id', job_id)
    .eq('status', 'pending')
    .neq('worker_id', worker_id)

  // 3. Load homeowner contact (revealed only after claim)
  const { data: hr } = await supabase
    .from('homeowner_requests')
    .select('homeowner_name, homeowner_email, homeowner_phone, zip_code')
    .eq('id', job.homeowner_request_id)
    .single()

  // 4. Email worker — you won, here's the homeowner contact
  await resend.emails.send({
    from: FROM,
    to:   worker.email,
    subject: `✅ Job claimed — ${job.task_label} · ${job.confirm_number}`,
    html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
      <h2 style="color:#0d0e0c">You got it, ${worker.first_name}. 🎉</h2>
      <p style="color:#444;font-size:14px">You claimed <strong>${job.task_label}</strong> — here's everything you need.</p>

      <div style="background:#f0fff4;border-radius:8px;padding:16px 20px;margin:20px 0;border:1px solid #b8f073">
        <p style="margin:0 0 4px;font-size:11px;color:#3a5a00;text-transform:uppercase;letter-spacing:.08em">Your payout</p>
        <p style="margin:0;font-size:28px;font-weight:700;color:#0d0e0c">${fmt(job.worker_payout)}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#666">Paid via YSKAIPE escrow on job completion</p>
      </div>

      <div style="background:#f5f5f0;border-radius:8px;padding:16px 20px;margin:20px 0">
        <p style="margin:0 0 8px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em">Homeowner contact</p>
        <p style="margin:0;font-size:16px;font-weight:600">${hr?.homeowner_name ?? '—'}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#444">${hr?.homeowner_email ?? '—'}</p>
        <p style="margin:2px 0 0;font-size:14px;color:#444">${hr?.homeowner_phone ?? '—'}</p>
        <p style="margin:2px 0 0;font-size:13px;color:#888">ZIP ${hr?.zip_code ?? job.zip_code ?? '—'}</p>
      </div>

      <div style="background:#f5f5f0;border-radius:8px;padding:16px 20px;margin:20px 0">
        <p style="margin:0 0 6px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em">Job details</p>
        <p style="margin:0;font-size:15px;font-weight:600">${job.task_label}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#555">${job.description}</p>
        ${job.timing ? `<p style="margin:6px 0 0;font-size:13px;color:#888">Timing: ${job.timing}</p>` : ''}
        ${job.permit_likely ? `<p style="margin:6px 0 0;font-size:13px;color:#b8860b">⚠️ This job may require a permit — advise the homeowner.</p>` : ''}
      </div>

      <div style="background:#fff8e1;border-radius:8px;padding:14px 18px;margin:20px 0;border:1px solid #f0c473">
        <p style="margin:0;font-size:13px;color:#7a5800;line-height:1.6">
          <strong>Next steps:</strong> Contact the homeowner to confirm timing. 
          When the job is complete, mark it done in your worker dashboard so payment is released from escrow.
        </p>
      </div>

      <p style="font-size:11px;color:#999;margin-top:24px">
        Ref: <span style="font-family:monospace">${job.confirm_number}</span> · YSKAIPE · gr8@yskaipe.com
      </p>
    </div>`,
  }).catch((e) => console.error('[claim] Worker win email failed:', e))

  // Generate completion token for homeowner
  const COMPLETE_SECRET = new TextEncoder().encode(
    process.env.CLAIM_TOKEN_SECRET ?? 'yskaipe-claim-secret-change-in-prod'
  )
  const completeToken = await new jose.SignJWT({
    job_id: job_id,
    hr_id:  job.homeowner_request_id ?? '',
    type:   'complete'
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .setIssuedAt()
    .sign(COMPLETE_SECRET)

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.yskaipe.com'
  const completeUrl = `${siteUrl}/complete.html?token=${encodeURIComponent(completeToken)}`

  // 5. Email homeowner — worker assigned
  if (hr?.homeowner_email) {
    await resend.emails.send({
      from: FROM,
      to:   hr.homeowner_email,
      subject: `Your YSKAIPE worker is confirmed — ${job.confirm_number}`,
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#0d0e0c">Your worker is confirmed.</h2>
        <p style="color:#444;font-size:14px">Confirmation: <strong style="font-family:monospace">${job.confirm_number}</strong></p>

        <div style="background:#f5f5f0;border-radius:8px;padding:16px 20px;margin:20px 0">
          <p style="margin:0 0 6px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em">Your YSKAIPE worker</p>
          <p style="margin:0;font-size:18px;font-weight:600">${worker.first_name} ${worker.last_name}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#888">YSKAIPE ${worker.age_tier === 'junior' ? 'Youth Worker' : 'Primary Worker'} · Qualified</p>
        </div>

        <div style="background:#f5f5f0;border-radius:8px;padding:16px 20px;margin:20px 0">
          <p style="margin:0 0 6px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em">Job</p>
          <p style="margin:0;font-size:15px;font-weight:600">${job.task_label}</p>
          <p style="margin:4px 0 0;font-size:13px;color:#555">${job.description}</p>
          ${job.timing ? `<p style="margin:6px 0 0;font-size:13px;color:#888">Timing: ${job.timing}</p>` : ''}
        </div>

        <div style="background:#f0fff4;border-radius:8px;padding:16px 20px;margin:20px 0;border:1px solid #b8f073">
          <p style="margin:0 0 4px;font-size:11px;color:#3a5a00;text-transform:uppercase;letter-spacing:.08em">Payment</p>
          <p style="margin:0;font-size:22px;font-weight:700">${fmt(job.book_price)}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#666">🔒 Held in escrow — released only when you confirm the job is complete</p>
        </div>

        <p style="font-size:13px;color:#444;line-height:1.7">
          ${worker.first_name} will be in touch to confirm timing. 
          When the job is complete, use the button below to release payment.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0">
          <tr><td align="center">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr><td align="center" bgcolor="#b8f073" style="border-radius:8px;padding:0">
                <a href="${completeUrl}" target="_blank"
                   style="display:inline-block;background:#b8f073;color:#0d0e0c;font-family:sans-serif;font-size:15px;font-weight:700;padding:14px 32px;text-decoration:none;border-radius:8px">
                  ✓ Confirm job complete &amp; release payment
                </a>
              </td></tr>
            </table>
          </td></tr>
        </table>
        <p style="font-size:12px;color:#888;text-align:center">
          Or copy: <a href="${completeUrl}" style="color:#b8f073;word-break:break-all">${completeUrl}</a>
        </p>

        <p style="font-size:11px;color:#999;margin-top:24px">YSKAIPE · Cornelius, NC · gr8@yskaipe.com</p>
      </div>`,
    }).catch((e) => console.error('[claim] Homeowner email failed:', e))
  }

  // 6. Admin alert
  await resend.emails.send({
    from: FROM, to: ADMIN,
    subject: `🎯 Job claimed — ${job.confirm_number} · ${worker.first_name} ${worker.last_name}`,
    html: `<p><strong>${worker.first_name} ${worker.last_name}</strong> claimed job <strong>${job.confirm_number}</strong> (${job.task_label}). Payout: ${fmt(job.worker_payout)}. Homeowner: ${hr?.homeowner_name ?? '—'} · ${hr?.homeowner_email ?? '—'}</p>`,
  }).catch(() => {})

  return NextResponse.json({
    success:    true,
    reason:     'claimed',
    confirm:    job.confirm_number,
    worker:     `${worker.first_name} ${worker.last_name}`,
    payout:     job.worker_payout,
    homeowner:  { name: hr?.homeowner_name, email: hr?.homeowner_email, phone: hr?.homeowner_phone },
  })
}
