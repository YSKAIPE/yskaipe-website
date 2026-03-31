// api/verify-token.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const { data: magicToken, error } = await supabase
    .from('magic_tokens')
    .select('*')
    .eq('token', token)
    .eq('used', false)
    .single();

  if (error || !magicToken) {
    return res.status(401).json({ error: 'Invalid or expired link' });
  }

  if (new Date(magicToken.expires_at) < new Date()) {
    return res.status(401).json({ error: 'This link has expired — request a new one' });
  }

  await supabase.from('magic_tokens').update({ used: true }).eq('token', token);

  const { data: subscriber } = await supabase
    .from('subscribers').select('*').eq('email', magicToken.email).single();

  if (!subscriber) return res.status(404).json({ error: 'No active subscription found' });
  if (subscriber.status === 'cancelled') return res.status(403).json({ error: 'Subscription not active' });

  const sessionToken = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2) + '-' + Date.now();
  const sessionExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  await supabase.from('magic_tokens').insert({
    email: magicToken.email, token: sessionToken,
    expires_at: sessionExpires, used: false, is_session: true,
  });

  return res.status(200).json({
    session: sessionToken,
    subscriber: {
      name: subscriber.name, email: subscriber.email,
      business: subscriber.business, trade: subscriber.trade,
      zip: subscriber.zip, tier: subscriber.tier, status: subscriber.status,
