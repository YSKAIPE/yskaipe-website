/**
 * app/api/worker/onboard-complete/route.ts
 * Called when Stripe redirects back after Express onboarding.
 * Verifies the account is actually onboarded, flips stripe_onboarded=true.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-03-25.dahlia' as any })

export async function POST(req: NextRequest) {
  try {
    const { worker_id } = await req.json()
    if (!worker_id) return NextResponse.json({ error: 'worker_id required' }, { status: 400 })

    const { data: worker } = await supabase
      .from('workers')
      .select('id, stripe_account_id')
      .eq('id', worker_id)
      .single()

    if (!worker?.stripe_account_id) {
      return NextResponse.json({ error: 'No Stripe account found.' }, { status: 404 })
    }

    // Verify with Stripe that onboarding is actually complete
    const account = await stripe.accounts.retrieve(worker.stripe_account_id)
    const isOnboarded = account.details_submitted && account.charges_enabled

    if (isOnboarded) {
      await supabase
        .from('workers')
        .update({ stripe_onboarded: true, status: 'qualified' })
        .eq('id', worker_id)
    }

    return NextResponse.json({ success: true, onboarded: isOnboarded })
  } catch (err: any) {
    console.error('[worker/onboard-complete]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
