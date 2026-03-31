// api/create-checkout.js
// Vercel serverless function — creates a Stripe Checkout session
// Deploy this file to your yskaipe-website repo under /api/

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// ── Price IDs from your Stripe dashboard ──
// Replace these with your actual Stripe Price IDs after creating products
const PRICE_IDS = {
  // Contractor tiers
  Starter: process.env.STRIPE_PRICE_STARTER, // $29/mo
  Pro:     process.env.STRIPE_PRICE_PRO,     // $79/mo
  Elite:   process.env.STRIPE_PRICE_ELITE,   // $149/mo
  // Homeowner tier
  Power:   process.env.STRIPE_PRICE_POWER,   // $9/mo
};

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { tier, email, name, business, trade, zip, phone } = req.body;

  // Validate required fields
  if (!tier || !email || !name) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const priceId = PRICE_IDS[tier];
  if (!priceId) {
    return res.status(400).json({ error: `Unknown tier: ${tier}` });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],

      // Pre-fill customer info
      customer_email: email,

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      // Pass metadata to webhook so Supabase gets populated
      subscription_data: {
        metadata: {
          tier,
          name,
          business:  business || '',
          trade:     trade    || '',
          zip:       zip      || '',
          phone:     phone    || '',
          email,
        },
      },

      // Redirect URLs — update domain to match yours
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/public/pro.html?success=true&tier=${tier}`,
      cancel_url:  `${process.env.NEXT_PUBLIC_SITE_URL}/public/pro.html?canceled=true`,

      // Allow promo codes on the checkout page
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
