// api/stripe-webhook.js
// Handles Stripe events → activates Supabase subscriber → sends Resend welcome email

import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// ── Generate a magic login token and store it in Supabase ────
async function createMagicToken(email) {
  const token = crypto.randomUUID() + '-' + Date.now();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

  await supabase.from('magic_tokens').insert({
    email,
    token,
    expires_at: expires,
    used: false,
  });

  return token;
}

// ── Send welcome email via Resend ────────────────────────────
async function sendWelcomeEmail(email, name, tier, token) {
  const firstName = name ? name.split(' ')[0] : 'there';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.yskaipe.com';
  const dashboardUrl = `${siteUrl}/public/dashboard.html?token=${token}`;

  const tierLabel = { Starter: '🔧 Starter', Pro: '⚡ Pro', Elite: '👑 Elite' }[tier] || tier;
  const tierColor = { Starter: '#8CA0BC', Pro: '#F5A623', Elite: '#FFC85C' }[tier] || '#F5A623';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#F2EFE9;font-family:'DM Sans',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F2EFE9;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#2A2724;border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
            <p style="margin:0;font-family:'Bebas Neue',Impact,sans-serif;font-size:28px;letter-spacing:0.15em;color:#F2EFE9;">
              YSK<span style="color:#F5A623;">AI</span>PE <span style="background:#F5A623;color:#2A2724;font-size:12px;padding:2px 10px;border-radius:100px;letter-spacing:0.1em;vertical-align:middle;">PRO</span>
            </p>
          </td>
        </tr>

        <!-- Welcome band -->
        <tr>
          <td style="background:${tierColor};padding:16px 40px;text-align:center;">
            <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#2A2724;">
              ${tierLabel} — Subscription Active
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:40px;border-radius:0 0 12px 12px;">
            <h1 style="margin:0 0 8px;font-size:28px;font-weight:700;color:#1E1C1A;line-height:1.2;">
              Welcome to the network, ${firstName}.
            </h1>
            <p style="margin:0 0 24px;font-size:16px;color:#5A5650;line-height:1.7;font-weight:300;">
              Your YSKAIPE Pro subscription is live. AI-matched homeowner leads are on their way — pre-scoped, pre-priced at 2026 fair rates, exclusive to you.
            </p>

            <!-- What happens next -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
              <tr>
                <td style="background:#F2EFE9;border-radius:8px;padding:24px;">
                  <p style="margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8C887F;">What happens next</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #E8E4DC;">
                        <table cellpadding="0" cellspacing="0"><tr>
                          <td style="width:32px;font-size:16px;">✅</td>
                          <td style="font-size:14px;color:#1E1C1A;font-weight:500;">Subscription activated</td>
                        </tr></table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #E8E4DC;">
                        <table cellpadding="0" cellspacing="0"><tr>
                          <td style="width:32px;font-size:16px;">⏳</td>
                          <td style="font-size:14px;color:#1E1C1A;font-weight:500;">License verification <span style="color:#8C887F;font-weight:300;">— within 48 hours</span></td>
                        </tr></table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;border-bottom:1px solid #E8E4DC;">
                        <table cellpadding="0" cellspacing="0"><tr>
                          <td style="width:32px;font-size:16px;">🎯</td>
                          <td style="font-size:14px;color:#1E1C1A;font-weight:500;">First matched lead <span style="color:#8C887F;font-weight:300;">— lands in your dashboard</span></td>
                        </tr></table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:8px 0;">
                        <table cellpadding="0" cellspacing="0"><tr>
                          <td style="width:32px;font-size:16px;">📧</td>
                          <td style="font-size:14px;color:#1E1C1A;font-weight:500;">Lead email alert <span style="color:#8C887F;font-weight:300;">— sent to this address</span></td>
                        </tr></table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
              <tr>
                <td align="center">
                  <a href="${dashboardUrl}" style="display:inline-block;background:#B85C2C;color:#ffffff;font-size:16px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;padding:16px 40px;border-radius:6px;text-decoration:none;">
                    Access Your Dashboard →
                  </a>
                  <p style="margin:12px 0 0;font-size:12px;color:#8C887F;">
                    This link is valid for 24 hours and logs you in automatically.
                  </p>
                </td>
              </tr>
            </table>

            <!-- Divider -->
            <hr style="border:none;border-top:1px solid #E8E4DC;margin:0 0 24px;"/>

            <!-- Support note -->
            <p style="margin:0;font-size:13px;color:#8C887F;line-height:1.6;">
              Questions? Reply to this email or reach us at <a href="mailto:gr8@yskaipe.com" style="color:#B85C2C;text-decoration:none;">gr8@yskaipe.com</a>.<br/>
              To manage your subscription, visit your dashboard and click "Billing".
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#8C887F;letter-spacing:0.08em;">
              © 2026 YSKAIPE · <a href="https://www.yskaipe.com" style="color:#8C887F;">yskaipe.com</a> · NC 2026 Fair Rate Network<br/>
              <a href="${siteUrl}/public/pro.html" style="color:#8C887F;">Manage subscription</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'YSKAIPE Pro <gr8@yskaipe.com>',
      to:   [email],
      subject: `Welcome to YSKAIPE Pro ${tierLabel} — your dashboard is ready`,
      html,
    }),
  });

  console.log(`📧 Welcome email sent to ${email}`);
}

// ── Main webhook handler ─────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {

    case 'customer.subscription.created': {
      const sub  = event.data.object;
      const meta = sub.metadata;

      // 1. Activate in Supabase
      await supabase.from('subscribers').upsert({
        stripe_customer_id:     sub.customer,
        stripe_subscription_id: sub.id,
        email:    meta.email    || '',
        name:     meta.name     || '',
        business: meta.business || '',
        trade:    meta.trade    || '',
        zip:      meta.zip      || '',
        phone:    meta.phone    || '',
        tier:     meta.tier     || 'Starter',
        status:   'active',
        activated_at:       new Date().toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      }, { onConflict: 'stripe_subscription_id' });

      // 2. Generate magic login token
      const token = await createMagicToken(meta.email);

      // 3. Send welcome email with dashboard link
      await sendWelcomeEmail(meta.email, meta.name, meta.tier || 'Starter', token);

      console.log(`✅ Activated + welcomed: ${meta.email} on ${meta.tier}`);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object;
      if (!invoice.subscription) break;
      const sub = await stripe.subscriptions.retrieve(invoice.subscription);
      await supabase
        .from('subscribers')
        .update({ status: 'active', current_period_end: new Date(sub.current_period_end * 1000).toISOString() })
        .eq('stripe_subscription_id', invoice.subscription);
      console.log(`💳 Renewed: ${invoice.customer_email}`);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      if (!invoice.subscription) break;
      await supabase
        .from('subscribers')
        .update({ status: 'past_due' })
        .eq('stripe_subscription_id', invoice.subscription);

      // Send payment failed email
      if (invoice.customer_email) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'YSKAIPE Pro <gr8@yskaipe.com>',
            to: [invoice.customer_email],
            subject: 'Action needed — YSKAIPE Pro payment failed',
            html: `<p style="font-family:sans-serif;font-size:15px;color:#333;">Hi — your YSKAIPE Pro payment didn't go through. Your leads are paused until it's resolved. <a href="${process.env.NEXT_PUBLIC_SITE_URL}/public/dashboard.html" style="color:#B85C2C;">Update your payment method →</a></p>`,
          }),
        });
      }
      console.log(`⚠️ Payment failed: ${invoice.customer_email}`);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await supabase
        .from('subscribers')
        .update({ status: 'cancelled' })
        .eq('stripe_subscription_id', sub.id);
      console.log(`❌ Cancelled: ${sub.id}`);
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object;
      const priceId = sub.items.data[0]?.price?.id;
      let tier = sub.metadata.tier || 'Pro';
      if (priceId === process.env.STRIPE_PRICE_STARTER) tier = 'Starter';
      if (priceId === process.env.STRIPE_PRICE_PRO)     tier = 'Pro';
      if (priceId === process.env.STRIPE_PRICE_ELITE)   tier = 'Elite';
      await supabase
        .from('subscribers')
        .update({ tier, status: sub.status === 'active' ? 'active' : sub.status, current_period_end: new Date(sub.current_period_end * 1000).toISOString() })
        .eq('stripe_subscription_id', sub.id);
      console.log(`🔄 Updated: ${sub.id} → ${tier}`);
      break;
    }

    default:
      console.log(`Unhandled event: ${event.type}`);
  }

  res.status(200).json({ received: true });
}
