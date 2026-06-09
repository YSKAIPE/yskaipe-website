/**
 * app/api/worker/signup/route.ts
 * ─────────────────────────────────────────────────────────────────
 * Creates a new worker row and immediately fires Stripe Express
 * onboarding. Returns the onboarding URL for redirect.
 *
 * If worker already exists (email match) → returns existing
 * onboarding link or dashboard link if already onboarded.
 * ─────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import Stripe from 'stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY!)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' as any })
const FROM   = 'YSKAIPE <gr8@yskaipe.com>'
const ADMIN  = 'gr8@yskaipe.com'
const SITE   = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.yskaipe.com'

export async function POST(req: NextRequest) {
  try {
    const {
      first_name, last_name, email, phone,
      zip_code, age_tier, worker_type,
      skills, agreed_to_terms,
    } = await req.json()

    // Validation
    if (!first_name || !last_name || !email || !phone || !zip_code) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }
    if (!agreed_to_terms) {
      return NextResponse.json({ error: 'You must agree to the terms to continue.' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 })
    }

    const validAgeTier   = ['junior', 'standard', 'adult'].includes(age_tier) ? age_tier : 'standard'
    const validWorkerType = ['solo', 'crew', 'side_hustle', 'junior'].includes(worker_type) ? worker_type : 'solo'

    // Check if worker already exists
    const { data: existing } = await supabase
      .from('workers')
      .select('id, stripe_account_id, stripe_onboarded, status')
      .eq('email', email)
      .single()

    let workerId: string

    if (existing) {
      workerId = existing.id
      // Already fully onboarded → send to dashboard
      if (existing.stripe_onboarded && existing.stripe_account_id) {
        return NextResponse.json({ already_onboarded: true, redirect: '/worker-dashboard.html' })
      }
    } else {
      // Create new worker row
      const { data: newWorker, error: insertErr } = await supabase
        .from('workers')
        .insert({
          first_name,
          last_name,
          email,
          phone,
          zip_code,
          age_tier:    validAgeTier,
          worker_type: validWorkerType,
          skills:      skills ?? [],
          status:      'applied',
          ic_signed_at: agreed_to_terms ? new Date().toISOString() : null,
          service_radius_miles: validAgeTier === 'junior' ? 10 : 15,
        })
        .select('id')
        .single()

      if (insertErr || !newWorker) {
        console.error('[worker/signup] insert error:', insertErr)
        return NextResponse.json({ error: 'Could not create your account. Please try again.' }, { status: 500 })
      }
      workerId = newWorker.id

      // Admin alert
      await resend.emails.send({
        from: FROM, to: ADMIN,
        subject: `New worker signup — ${first_name} ${last_name} · ${validAgeTier} · ${zip_code}`,
        html: `<p><strong>${first_name} ${last_name}</strong> signed up as a ${validAgeTier} worker in ZIP ${zip_code}. Email: ${email} · Phone: ${phone}</p>`,
      }).catch(console.error)
    }

    // Create or retrieve Stripe Express account
    let stripeAccountId = existing?.stripe_account_id ?? null

    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type:    'express',
        country: 'US',
        email,
        capabilities: { transfers: { requested: true } },
        business_type: 'individual',
        individual: { first_name, last_name, email },
        metadata: { worker_id: workerId, platform: 'yskaipe' },
      })
      stripeAccountId = account.id

      await supabase
        .from('workers')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', workerId)
    }

    // Generate onboarding link
    const accountLink = await stripe.accountLinks.create({
      account:     stripeAccountId,
      refresh_url: `${SITE}/worker-dashboard.html?onboard=refresh&worker_id=${workerId}`,
      return_url:  `${SITE}/worker-dashboard.html?onboard=complete&worker_id=${workerId}`,
      type:        'account_onboarding',
    })

    return NextResponse.json({
      success:      true,
      worker_id:    workerId,
      onboarding_url: accountLink.url,
    })

  } catch (err: any) {
    console.error('[worker/signup]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
