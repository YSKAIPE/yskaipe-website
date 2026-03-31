// api/stripe-webhook.js
// Vercel serverless function — listens to Stripe events, writes to Supabase
// This is the engine that activates/deactivates subscribers automatically

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // use service role — bypasses RLS
);

// Required to read raw body for Stripe signature verification
export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ── Handle Stripe events ──
  switch (event.type) {

    // New subscription created — activate the subscriber
    case 'customer.subscription.created': {
      const sub = event.data.object;
      const meta = sub.metadata;

      await supabase.from('subscribers').upsert({
        stripe_customer_id:     sub.customer,
        stripe_subscription_id: sub.id,
        email:     meta.email    || '',
        name:      meta.name     || '',
        business:  meta.business || '',
        trade:     meta.trade    || '',
        zip:       meta.zip      || '',
        phone:     meta.phone    || '',
        tier:      meta.tier     || 'Starter',
        status:    'active',
        activated_at:   new Date().toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      }, { onConflict: 'stripe_subscription_id' });

      console.log(`✅ Activated: ${meta.email} on ${meta.tier}`);
      break;
    }

    // Payment succeeded — refresh period end date
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      if (!invoice.subscription) break;

      const sub = await stripe.subscriptions.retrieve(invoice.subscription);

      await supabase
        .from('subscribers')
        .update({
          status: 'active',
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_subscription_id', invoice.subscription);

      console.log(`💳 Renewed: ${invoice.customer_email}`);
      break;
    }

    // Payment failed — flag but don't immediately deactivate (Stripe retries)
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      if (!invoice.subscription) break;

      await supabase
        .from('subscribers')
        .update({ status: 'past_due' })
        .eq('stripe_subscription_id', invoice.subscription);

      console.log(`⚠️ Payment failed: ${invoice.customer_email}`);
      break;
    }

    // Subscription cancelled — deactivate
    case 'customer.subscription.deleted': {
      const sub = event.data.object;

      await supabase
        .from('subscribers')
        .update({ status: 'cancelled' })
        .eq('stripe_subscription_id', sub.id);

      console.log(`❌ Cancelled subscription: ${sub.id}`);
      break;
    }

    // Plan changed (upgrade/downgrade)
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const meta = sub.metadata;

      // Detect tier from price ID
      const priceId = sub.items.data[0]?.price?.id;
      let tier = meta.tier || 'Pro';
      if (priceId === process.env.STRIPE_PRICE_STARTER) tier = 'Starter';
      if (priceId === process.env.STRIPE_PRICE_PRO)     tier = 'Pro';
      if (priceId === process.env.STRIPE_PRICE_ELITE)   tier = 'Elite';
      if (priceId === process.env.STRIPE_PRICE_POWER)   tier = 'Power';

      await supabase
        .from('subscribers')
        .update({
          tier,
          status: sub.status === 'active' ? 'active' : sub.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_subscription_id', sub.id);

      console.log(`🔄 Updated: ${sub.id} → ${tier}`);
      break;
    }

    default:
      console.log(`Unhandled event: ${event.type}`);
  }

  res.status(200).json({ received: true });
}
