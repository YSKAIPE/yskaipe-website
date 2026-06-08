/**
 * app/api/job-complete/route.ts
 * ─────────────────────────────────────────────────────────────────
 * Homeowner confirms job is complete.
 * GET  ?token=XXX  → verify token, return job/worker details
 * POST ?token=XXX  → capture payment + transfer to worker
 *
 * Token signed JWT: { job_id, homeowner_request_id, exp: 30 days }
 * Generated when worker claims the job.
 * ─────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import Stripe from 'stripe'
import * as jose from 'jose'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY!)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' as any })
const FROM   = 'YSKAIPE <gr8@yskaipe.com>'
const ADMIN  = 'gr8@yskaipe.com'

const SECRET = new TextEncoder().encode(
  process.env.CLAIM_TOKEN_SECRET ?? 'yskaipe-claim-secret-change-in-prod'
)

function fmt(n: number | null | undefined) {
  return n ? '$' + Math.round(n).toLocaleString('en-US') : '$—'
}

async function signCompleteToken(jobId: string, hrId: string): Promise<string> {
  return new jose.SignJWT({ job_id: jobId, hr_id: hrId, type: 'complete' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .setIssuedAt()
    .sign(SECRET)
}

async function verifyCompleteToken(token: string) {
  try {
    const { payload } = await jose.jwtVerify(token, SECRET)
    if (payload.type !== 'complete') return null
    return { job_id: payload.job_id as string, hr_id: payload.hr_id as string }
  } catch { return null }
}

// Export for use in job-claim route
export { signCompleteToken }

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token.' }, { status: 400 })

  const payload = await verifyCompleteToken(token)
  if (!payload) return NextResponse.json({ error: 'Invalid or expired link.' }, { status: 401 })

  const { data: job } = await supabase
    .from('jobs')
    .select('id, confirm_number, task_label, description, book_price, worker_payout, status, assigned_worker_id')
    .eq('id', payload.job_id)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })

  const { data: worker } = await supabase
    .from('workers')
    .select('first_name, last_name')
    .eq('id', job.assigned_worker_id)
    .single()

  return NextResponse.json({
    job: {
      confirm_number: job.confirm_number,
      label:          job.task_label,
      description:    job.description,
      book_price:     job.book_price,
      worker_payout:  job.worker_payout,
      status:         job.status,
    },
    worker:   { name: `${worker?.first_name ?? ''} ${worker?.last_name ?? ''}`.trim() },
    already_complete: job.status === 'paid',
    token,
  })
}

export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token.' }, { status: 400 })

  const payload = await verifyCompleteToken(token)
  if (!payload) return NextResponse.json({ error: 'Invalid or expired link.' }, { status: 401 })

  // Load job
  const { data: job } = await supabase
    .from('jobs')
    .select('id, confirm_number, task_label, book_price, worker_payout, status, stripe_payment_intent_id, assigned_worker_id, homeowner_request_id')
    .eq('id', payload.job_id)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
  if (job.status === 'paid') return NextResponse.json({ success: true, already_paid: true })
  if (!['claimed', 'in_progress', 'complete'].includes(job.status)) {
    return NextResponse.json({ error: `Job cannot be completed — status is '${job.status}'` }, { status: 400 })
  }

  // Load worker
  const { data: worker } = await supabase
    .from('workers')
    .select('id, first_name, last_name, email, stripe_account_id, stripe_onboarded')
    .eq('id', job.assigned_worker_id)
    .single()

  if (!worker) return NextResponse.json({ error: 'Worker not found.' }, { status: 404 })

  // Load homeowner
  const { data: hr } = await supabase
    .from('homeowner_requests')
    .select('homeowner_name, homeowner_email')
    .eq('id', job.homeowner_request_id)
    .single()

  try {
    // 1. Capture the PaymentIntent
    if (job.stripe_payment_intent_id) {
      await stripe.paymentIntents.capture(job.stripe_payment_intent_id)
    }

    // 2. Transfer worker payout (only if onboarded)
    let transferId = null
    if (worker.stripe_account_id && worker.stripe_onboarded) {
      const transfer = await stripe.transfers.create({
        amount:      Math.round((job.worker_payout ?? 0) * 100),
        currency:    'usd',
        destination: worker.stripe_account_id,
        description: `YSKAIPE: ${job.task_label} — ${job.confirm_number}`,
        metadata:    { job_id: job.id, confirm_number: job.confirm_number },
      })
      transferId = transfer.id
    }

    // 3. Mark job paid
    await supabase
      .from('jobs')
      .update({
        status:              'paid',
        paid_at:             new Date().toISOString(),
        homeowner_confirmed: true,
      })
      .eq('id', job.id)

    // 4. Email worker — payout sent (or pending onboarding)
    const workerPayMsg = worker.stripe_onboarded
      ? `Your payout of ${fmt(job.worker_payout)} has been transferred to your Stripe Express account — typically arrives within 2 business days.`
      : `Your payout of ${fmt(job.worker_payout)} is ready but you haven't completed Stripe onboarding yet. Log in to your YSKAIPE worker dashboard to set up your payout account.`

    await resend.emails.send({
      from: FROM,
      to:   worker.email,
      subject: `💰 Job complete — ${fmt(job.worker_payout)} payout · ${job.confirm_number}`,
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2>Great work, ${worker.first_name}! 💰</h2>
        <p>The homeowner confirmed your job is complete.</p>
        <div style="background:#f0fff4;border-radius:8px;padding:20px 24px;margin:20px 0;border:1px solid #b8f073">
          <p style="margin:0 0 4px;font-size:11px;color:#3a5a00;text-transform:uppercase;letter-spacing:.08em">Your payout</p>
          <p style="margin:0;font-size:32px;font-weight:700;color:#0d0e0c">${fmt(job.worker_payout)}</p>
        </div>
        <p style="font-size:14px;color:#444;line-height:1.7">${workerPayMsg}</p>
        <p style="font-size:12px;color:#999;margin-top:24px">Ref: ${job.confirm_number} · YSKAIPE</p>
      </div>`,
    }).catch(console.error)

    // 5. Email homeowner — receipt
    if (hr?.homeowner_email) {
      await resend.emails.send({
        from: FROM,
        to:   hr.homeowner_email,
        subject: `Job complete — ${job.confirm_number} · Payment released`,
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2>All done. ✓</h2>
          <p>Your payment of ${fmt(job.book_price)} has been released to ${worker.first_name} ${worker.last_name}.</p>
          <div style="background:#f5f5f0;border-radius:8px;padding:16px 20px;margin:20px 0">
            <p style="margin:0;font-size:15px;font-weight:600">${job.task_label}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#888">Ref: ${job.confirm_number}</p>
          </div>
          <p style="font-size:13px;color:#444;line-height:1.7">Thank you for using YSKAIPE. We'd love to hear how it went — reply to this email anytime.</p>
          <p style="font-size:11px;color:#999;margin-top:24px">YSKAIPE · Cornelius, NC · yskaipe.com</p>
        </div>`,
      }).catch(console.error)
    }

    // 6. Admin
    await resend.emails.send({
      from: FROM, to: ADMIN,
      subject: `✅ Job paid — ${job.confirm_number} · ${fmt(job.book_price)} captured`,
      html: `<p><strong>${job.confirm_number}</strong> · ${job.task_label} · ${fmt(job.book_price)} captured · ${fmt(job.worker_payout)} to ${worker.first_name} ${worker.last_name}${!worker.stripe_onboarded ? ' · ⚠️ NOT ONBOARDED — manual payout needed' : ''}</p>`,
    }).catch(console.error)

    return NextResponse.json({
      success:     true,
      captured:    job.book_price,
      worker_paid: job.worker_payout,
      transfer_id: transferId,
      confirm:     job.confirm_number,
    })

  } catch (err: any) {
    console.error('[job-complete]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
