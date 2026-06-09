/**
 * app/api/worker/claim-from-dashboard/route.ts
 * Allows workers to claim jobs directly from their dashboard.
 * Verifies auth token, generates a claim token, executes claim.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import * as jose from 'jose'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM   = 'YSKAIPE <gr8@yskaipe.com>'
const SECRET = new TextEncoder().encode(
  process.env.CLAIM_TOKEN_SECRET ?? 'yskaipe-claim-secret-2026-lake-norman'
)

function fmt(n: number | null | undefined) {
  return n ? '$' + Math.round(n).toLocaleString('en-US') : '$—'
}

export async function POST(req: NextRequest) {
  try {
    const { job_id, auth_token } = await req.json()
    if (!job_id || !auth_token) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    // Verify auth token
    const { payload } = await jose.jwtVerify(auth_token, SECRET)
    if (payload.type !== 'worker_auth') {
      return NextResponse.json({ error: 'Invalid auth token.' }, { status: 401 })
    }
    const workerId = payload.worker_id as string

    // Load worker — must be onboarded
    const { data: worker } = await supabase
      .from('workers')
      .select('id, first_name, last_name, email, stripe_onboarded, status')
      .eq('id', workerId)
      .single()

    if (!worker) return NextResponse.json({ error: 'Worker not found.' }, { status: 404 })
    if (!worker.stripe_onboarded) {
      return NextResponse.json({ error: 'Complete Stripe onboarding before claiming jobs.' }, { status: 403 })
    }

    // Load job
    const { data: job } = await supabase
      .from('jobs')
      .select('id, confirm_number, task_label, description, zip_code, timing, book_price, worker_payout, status, homeowner_request_id, permit_likely')
      .eq('id', job_id)
      .single()

    if (!job) return NextResponse.json({ error: 'Job not found.' }, { status: 404 })
    if (job.status !== 'posted') {
      return NextResponse.json({ success: false, reason: 'already_claimed' }, { status: 409 })
    }

    // Check if this worker has a pending claim
    const { data: existingClaim } = await supabase
      .from('job_claims')
      .select('id, status')
      .eq('job_id', job_id)
      .eq('worker_id', workerId)
      .single()

    if (!existingClaim) {
      // Insert a claim row first
      await supabase.from('job_claims').insert({
        job_id,
        worker_id: workerId,
        task_slug: null,
        claim_type: 'instant',
        status: 'pending',
        notified_at: new Date().toISOString(),
      })
    }

    // Race-safe claim
    const { data: claimResult } = await supabase
      .from('job_claims')
      .update({ status: 'accepted', claimed_at: new Date().toISOString() })
      .eq('job_id', job_id)
      .eq('worker_id', workerId)
      .eq('status', 'pending')
      .select('id')
      .single()

    if (!claimResult) {
      return NextResponse.json({ success: false, reason: 'already_claimed' }, { status: 409 })
    }

    // Check for race condition
    const { count } = await supabase
      .from('job_claims')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', job_id)
      .eq('status', 'accepted')

    if ((count ?? 0) > 1) {
      await supabase.from('job_claims').update({ status: 'pending' }).eq('job_id', job_id).eq('worker_id', workerId)
      return NextResponse.json({ success: false, reason: 'already_claimed' }, { status: 409 })
    }

    // Won — update job
    await supabase.from('jobs').update({
      status: 'claimed',
      assigned_worker_id: workerId,
      claimed_at: new Date().toISOString(),
    }).eq('id', job_id)

    // Reject other claims
    await supabase.from('job_claims').update({ status: 'rejected' })
      .eq('job_id', job_id).eq('status', 'pending').neq('worker_id', workerId)

    // Load homeowner
    const { data: hr } = await supabase
      .from('homeowner_requests')
      .select('homeowner_name, homeowner_email, homeowner_phone, zip_code')
      .eq('id', job.homeowner_request_id)
      .single()

    // Generate completion token for homeowner
    const completeToken = await new jose.SignJWT({
      job_id: job.id,
      hr_id: job.homeowner_request_id ?? '',
      type: 'complete'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .setIssuedAt()
      .sign(SECRET)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.yskaipe.com'
    const completeUrl = `${siteUrl}/complete.html?token=${encodeURIComponent(completeToken)}`

    // Email worker — you won
    await resend.emails.send({
      from: FROM, to: worker.email,
      subject: `✅ Job claimed — ${job.task_label} · ${job.confirm_number}`,
      html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
        <h2>You got it, ${worker.first_name}! 🎉</h2>
        <div style="background:#f0fff4;border-radius:8px;padding:16px 20px;margin:18px 0;border:1px solid #b8f073">
          <p style="margin:0 0 4px;font-size:11px;color:#3a5a00;text-transform:uppercase">Your payout</p>
          <p style="margin:0;font-size:28px;font-weight:700">${fmt(job.worker_payout)}</p>
        </div>
        <div style="background:#f5f5f0;border-radius:8px;padding:16px 20px;margin:18px 0">
          <p style="margin:0 0 6px;font-size:11px;color:#888;text-transform:uppercase">Homeowner contact</p>
          <p style="margin:0;font-size:16px;font-weight:600">${hr?.homeowner_name ?? '—'}</p>
          <p style="margin:4px 0 0;font-size:14px;color:#444">${hr?.homeowner_email ?? '—'}</p>
          <p style="margin:2px 0 0;font-size:14px;color:#444">${hr?.homeowner_phone ?? '—'}</p>
        </div>
        <p style="font-size:11px;color:#999">Ref: ${job.confirm_number} · YSKAIPE</p>
      </div>`,
    }).catch(console.error)

    // Email homeowner
    if (hr?.homeowner_email) {
      await resend.emails.send({
        from: FROM, to: hr.homeowner_email,
        subject: `Your YSKAIPE worker is confirmed — ${job.confirm_number}`,
        html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2>Your worker is confirmed.</h2>
          <p><strong>${worker.first_name} ${worker.last_name}</strong> has claimed your job.</p>
          <div style="background:#f5f5f0;border-radius:8px;padding:16px 20px;margin:18px 0">
            <p style="margin:0;font-size:15px;font-weight:600">${job.task_label}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#555">${job.description}</p>
          </div>
          <p style="font-size:13px;color:#444;line-height:1.7">${worker.first_name} will contact you to confirm timing. When the job is done, use the button below to release payment.</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0">
            <tr><td align="center">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr><td align="center" bgcolor="#b8f073" style="border-radius:8px">
                  <a href="${completeUrl}" style="display:inline-block;background:#b8f073;color:#0d0e0c;font-family:sans-serif;font-size:15px;font-weight:700;padding:14px 32px;text-decoration:none;border-radius:8px">
                    ✓ Confirm job complete &amp; release payment
                  </a>
                </td></tr>
              </table>
            </td></tr>
          </table>
          <p style="font-size:11px;color:#999">Ref: ${job.confirm_number} · YSKAIPE</p>
        </div>`,
      }).catch(console.error)
    }

    return NextResponse.json({
      success: true,
      reason: 'claimed',
      confirm: job.confirm_number,
      homeowner: { name: hr?.homeowner_name, email: hr?.homeowner_email, phone: hr?.homeowner_phone },
    })

  } catch (err: any) {
    console.error('[worker/claim-from-dashboard]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
