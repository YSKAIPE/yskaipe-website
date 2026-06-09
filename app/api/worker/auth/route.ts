/**
 * app/api/worker/auth/route.ts
 * ─────────────────────────────────────────────────────────────────
 * Magic link auth for workers.
 *
 * POST { email } → sends magic link email
 * GET  ?token=XX → verifies token, returns worker data + jobs
 *
 * Token: signed JWT { worker_id, exp: 24h }
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
const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM   = 'YSKAIPE <gr8@yskaipe.com>'
const SITE   = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.yskaipe.com'
const SECRET = new TextEncoder().encode(
  process.env.CLAIM_TOKEN_SECRET ?? 'yskaipe-claim-secret-2026-lake-norman'
)

// POST — send magic link
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email required.' }, { status: 400 })

    const { data: worker } = await supabase
      .from('workers')
      .select('id, first_name, status, stripe_onboarded')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (!worker) {
      // Don't reveal if email exists — send generic response
      return NextResponse.json({ success: true })
    }

    const token = await new jose.SignJWT({ worker_id: worker.id, type: 'worker_auth' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .setIssuedAt()
      .sign(SECRET)

    const loginUrl = `${SITE}/worker-dashboard.html?token=${encodeURIComponent(token)}`

    await resend.emails.send({
      from: FROM,
      to:   email,
      subject: 'Your YSKAIPE worker dashboard link',
      html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#0d0e0c">Your dashboard link, ${worker.first_name}.</h2>
        <p style="color:#444;font-size:14px">Click below to access your YSKAIPE worker dashboard. Link expires in 24 hours.</p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0">
          <tr><td align="center">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr><td align="center" bgcolor="#b8f073" style="border-radius:8px">
                <a href="${loginUrl}" target="_blank"
                   style="display:inline-block;background:#b8f073;color:#0d0e0c;font-family:sans-serif;font-size:15px;font-weight:700;padding:14px 32px;text-decoration:none;border-radius:8px">
                  Open my dashboard →
                </a>
              </td></tr>
            </table>
          </td></tr>
        </table>
        <p style="font-size:12px;color:#888">Or copy: <a href="${loginUrl}" style="color:#b8f073">${loginUrl}</a></p>
        <p style="font-size:11px;color:#999;margin-top:24px">YSKAIPE · Cornelius, NC</p>
      </div>`,
    })

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error('[worker/auth POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET — verify token + return worker data
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Missing token.' }, { status: 400 })

    const { payload } = await jose.jwtVerify(token, SECRET)
    if (payload.type !== 'worker_auth') return NextResponse.json({ error: 'Invalid token.' }, { status: 401 })

    const workerId = payload.worker_id as string

    // Worker profile
    const { data: worker } = await supabase
      .from('workers')
      .select('id, first_name, last_name, email, age_tier, zip_code, skills, status, stripe_onboarded, stripe_account_id, rating, jobs_completed')
      .eq('id', workerId)
      .single()

    if (!worker) return NextResponse.json({ error: 'Worker not found.' }, { status: 404 })

    // Available jobs — posted, matching tier + skills + ZIP
    const tierFilter = worker.age_tier === 'junior'
      ? ['junior_ok']
      : ['junior_ok', 'standard', 'adult_only']

    const { data: availableJobs } = await supabase
      .from('jobs')
      .select('id, confirm_number, task_label, task_category, description, zip_code, timing, book_price, worker_payout, posted_at, permit_likely, age_tier_required')
      .eq('status', 'posted')
      .in('age_tier_required', tierFilter)
      .order('posted_at', { ascending: false })
      .limit(20)

    // My claimed/active jobs
    const { data: myClaims } = await supabase
      .from('job_claims')
      .select(`
        id, status, claimed_at,
        jobs (id, confirm_number, task_label, description, zip_code, book_price, worker_payout, status, claimed_at, paid_at)
      `)
      .eq('worker_id', workerId)
      .eq('status', 'accepted')
      .order('claimed_at', { ascending: false })
      .limit(20)

    // Earnings summary
    const { data: paidJobs } = await supabase
      .from('jobs')
      .select('worker_payout')
      .eq('assigned_worker_id', workerId)
      .eq('status', 'paid')

    const totalEarned = (paidJobs ?? []).reduce((sum, j) => sum + (j.worker_payout ?? 0), 0)

    // Filter available jobs by skills
    const workerSkills: string[] = worker.skills ?? []
    const filteredJobs = (availableJobs ?? []).filter(job => {
      if (!workerSkills.length) return true
      // Match by task slug in skills or handyman catch-all
      return workerSkills.some(s =>
        job.task_label?.toLowerCase().includes(s.split('_').slice(1).join(' ')) ||
        s === 'life_handyman_misc'
      ) || job.zip_code === worker.zip_code
    })

    return NextResponse.json({
      worker: {
        id:               worker.id,
        name:             `${worker.first_name} ${worker.last_name}`,
        first_name:       worker.first_name,
        email:            worker.email,
        age_tier:         worker.age_tier,
        zip_code:         worker.zip_code,
        status:           worker.status,
        stripe_onboarded: worker.stripe_onboarded,
        rating:           worker.rating,
        jobs_completed:   worker.jobs_completed ?? 0,
        total_earned:     totalEarned,
      },
      available_jobs: filteredJobs,
      my_jobs: (myClaims ?? []).map(c => (c as any).jobs).filter(Boolean),
      token, // pass back so dashboard can store it
    })

  } catch (err: any) {
    console.error('[worker/auth GET]', err)
    return NextResponse.json({ error: 'Invalid or expired link.' }, { status: 401 })
  }
}
