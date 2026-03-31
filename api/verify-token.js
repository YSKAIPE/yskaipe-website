// api/verify-token.js
// GET ?token=xxx → validates magic link → returns subscriber profile
// Called by dashboard.html on page load

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });

  // Look up the token
  const { data: magicToken, error } = await supabase
    .from('magic_tokens')
    .select('*')
    .eq('token', token)
    .eq('used', false)
    .single();

  if (error || !magicToken) {
    return res.status(401).json({ error: 'Invalid or expired link' });
  }

  // Check expiry
  if (new Date(magicToken.expires_at) < new Date()) {
    return res.status(401).json({ error: 'This link has expired — request a new one' });
  }

  // Mark token as used
  await supabase
    .from('magic_tokens')
    .update({ used: true })
    .eq('token', token);

  // Fetch the subscriber's full profile
  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('*')
    .eq('email', magicToken.email)
    .single();

  if (!subscriber) {
    return res.status(404).json({ error: 'No active subscription found' });
  }

  if (subscriber.status === 'cancelled') {
    return res.status(403).json({ error: 'Your subscription is no longer active' });
  }

  // Issue a session token (24h) so they don't need to re-auth on every page load
  const sessionToken = crypto.randomUUID() + '-' + Date.now();
  const sessionExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await supabase.from('magic_tokens').insert({
    email:      magicToken.email,
    token:      sessionToken,
    expires_at: sessionExpires,
    used:       false,
    is_session: true,
  });

  return res.status(200).json({
    session: sessionToken,
    subscriber: {
      name:      subscriber.name,
      email:     subscriber.email,
      business:  subscriber.business,
      trade:     subscriber.trade,
      zip:       subscriber.zip,
      tier:      subscriber.tier,
      status:    subscriber.status,
      activated_at: subscriber.activated_at,
      current_period_end: subscriber.current_period_end,
      stripe_customer_id: subscriber.stripe_customer_id,
    },
  });
}
