// api/customer-portal.js
// Vercel serverless function — redirects subscriber to Stripe's self-serve portal
// Subscriber can upgrade, downgrade, cancel, update card — all without contacting you

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  // Look up their Stripe customer ID from Supabase
  const { data, error } = await supabase
    .from('subscribers')
    .select('stripe_customer_id')
    .eq('email', email)
    .eq('status', 'active')
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'No active subscription found for this email' });
  }

  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/public/pro.html`,
    });

    return res.status(200).json({ url: portalSession.url });
  } catch (err) {
    console.error('Portal error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
