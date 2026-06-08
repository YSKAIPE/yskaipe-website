/**
 * app/api/stripe/transfer/route.ts
 * ─────────────────────────────────────────────────────────────────
 * Called when homeowner confirms job is complete.
 * 
 * Flow:
 *   1. Verify job is in 'claimed' or 'in_progress' status
 *   2. Capture the PaymentIntent (releases held funds)
 *   3. Transfer worker_payout to worker's Stripe Express account
 *   4. Mark job as 'paid', set paid_at
 *   5. Email worker confirmation of payout
 * ─────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const stripe   = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM   = 'YSKAIPE <gr8@yskaipe.com>'

function fmt(n: number | null | undefined) {
  return n ? '$' + Math.round(n).toLocaleString('en-US') : '$—'
}

export async function POST(req: NextRequest) {
  try {
    const { job_id, confirmed_by } = await req.json()
    if (!job_id) return NextResponse.json({ error: 'job_id required' }, { status: 400 })

    // Load job + worker
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select(`
        id, confirm_number, task_label, status,
        book_price, worker_payout,
        stripe_payment_intent_id,
        assigned_worker_id,
        homeowner_request_id
      `)
      .eq('id', job_id)
      .single()

    if (jobErr || !job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
    if (!['claimed', 'in_progress', 'complete'].includes(job.status)) {
      return NextResponse.json({ error: `Job status is '${job.status}' — cannot release payment.` }, { status: 400 })
    }
    if (job.status === 'paid') {
      return NextResponse.json({ error: 'Already paid.' }, { status: 400 })
    }

    const { data: worker } = await supabase
      .from('workers')
      .select('id, first_name, last_name, email, stripe_account_id, stripe_onboarded')
      .eq('id', job.assigned_worker_id)
      .single()

    if (!worker) return NextResponse.json({ error: 'Worker not found.' }, { status: 404 })
    if (!worker.stripe_account_id || !worker.stripe_onboarded) {
      return NextResponse.json({
        error: 'Worker has not completed Stripe onboarding — cannot transfer funds.',
        worker_id: worker.id,
      }, { status: 400 })
    }

    const payoutCents = Math.round((job.worker_payout ?? 0) * 100)
    const totalCents  = Math.round((job.book_price   ?? 0) * 100)

    // 1. Capture the PaymentIntent
    if (job.stripe_payment_intent_id) {
      await stripe.paymentIntents.capture(job.stripe_payment_intent_id)
    }

    // 2. Transfer worker payout to their Express account
    const transfer = await stripe.transfers.create({
      amount:             payoutCents,
      currency:           'usd',
      destination:        worker.stripe_account_id,
      description:        `YSKAIPE payout: ${job.task_label} — ${job.confirm_number}`,
      metadata: {
        job_id,
        confirm_number: job.confirm_number,
        worker_id:      worker.id,
        platform:       'yskaipe',
      },
    })

    // 3. Update job status
    await supabase
      .from('jobs')
      .update({
        status:               'paid',
        paid_at:              new Date().toISOString(),
        homeowner_confirmed:  true,
      })
      .eq('id', job_id)

    // 4. Email worker — payout sent
    await resend.emails.send({
      from: FROM,
      to:   worker.email,
      subject: `💰 Payout sent — ${fmt(job.worker_payout)} · ${job.confirm_number}`,
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2 style="color:#0d0e0c">Your payout is on its way, ${worker.first_name}. 💰</h2>
        <div style="background:#f0fff4;border-radius:8px;padding:20px 24px;margin:20px 0;border:1px solid #b8f073">
          <p style="margin:0 0 4px;font-size:11px;color:#3a5a00;text-transform:uppercase;letter-spacing:.08em">Amount transferred</p>
          <p style="margin:0;font-size:32px;font-weight:700;color:#0d0e0c">${fmt(job.worker_payout)}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#666">Via Stripe Express · typically arrives in 2 business days</p>
        </div>
        <div style="background:#f5f5f0;border-radius:8px;padding:16px 20px;margin:20px 0">
          <p style="margin:0 0 4px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.08em">Job</p>
          <p style="margin:0;font-size:15px;font-weight:600">${job.task_label}</p>
          <p style="margin:4px 0 0;font-size:12px;color:#888">Ref: ${job.confirm_number}</p>
        </div>
        <p style="font-size:13px;color:#444;line-height:1.7">
          The homeowner confirmed the job is complete. 
          Your earnings will appear in your Stripe Express dashboard within 2 business days.
        </p>
        <p style="font-size:11px;color:#999;margin-top:24px">YSKAIPE · Cornelius, NC · gr8@yskaipe.com</p>
      </div>`,
    }).catch(console.error)

    return NextResponse.json({
      success:      true,
      transfer_id:  transfer.id,
      amount_paid:  job.worker_payout,
      worker:       `${worker.first_name} ${worker.last_name}`,
      confirm:      job.confirm_number,
    })

  } catch (err: any) {
    console.error('[stripe/transfer]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
