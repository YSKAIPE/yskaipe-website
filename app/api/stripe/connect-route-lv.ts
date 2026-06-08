/**
 * app/api/stripe/connect-onboard/route.ts
 * ─────────────────────────────────────────────────────────────────
 * Generates a Stripe Express onboarding link for a worker.
 * Called from the worker dashboard / signup flow.
 *
 * Flow:
 *   1. Check if worker already has a Stripe account ID
 *   2. If not, create a new Express account
 *   3. Generate an account link (onboarding URL)
 *   4. Store account ID on workers row
 *   5. Return onboarding URL → redirect worker
 * ─────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.yskaipe.com'

export async function POST(req: NextRequest) {
  try {
    const { worker_id } = await req.json()
    if (!worker_id) return NextResponse.json({ error: 'worker_id required' }, { status: 400 })

    // Load worker
    const { data: worker, error } = await supabase
      .from('workers')
      .select('id, first_name, last_name, email, stripe_account_id, stripe_onboarded')
      .eq('id', worker_id)
      .single()

    if (error || !worker) return NextResponse.json({ error: 'Worker not found.' }, { status: 404 })

    // Already fully onboarded
    if (worker.stripe_onboarded && worker.stripe_account_id) {
      return NextResponse.json({ already_onboarded: true, account_id: worker.stripe_account_id })
    }

    let accountId = worker.stripe_account_id

    // Create Express account if none exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type:    'express',
        country: 'US',
        email:   worker.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          worker_id,
          platform: 'yskaipe',
        },
      })

      accountId = account.id

      await supabase
        .from('workers')
        .update({ stripe_account_id: accountId })
        .eq('id', worker_id)
    }

    // Generate onboarding link
    const accountLink = await stripe.accountLinks.create({
      account:     accountId,
      refresh_url: `${SITE}/worker-dashboard.html?onboard=refresh&worker_id=${worker_id}`,
      return_url:  `${SITE}/worker-dashboard.html?onboard=complete&worker_id=${worker_id}`,
      type:        'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url, account_id: accountId })

  } catch (err: any) {
    console.error('[stripe/connect-onboard]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
