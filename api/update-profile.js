// api/update-profile.js
// POST { session, bio, trade, radius, license, setup_complete }
// Saves profile setup data for a verified subscriber

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { session, bio, trade, radius, license, setup_complete } = req.body;

  if (!session) return res.status(400).json({ error: 'Session required' });

  // Validate session token
  const { data: tokenRow } = await supabase
    .from('magic_tokens')
    .select('email, expires_at, used, is_session')
    .eq('token', session)
    .eq('is_session', true)
    .single();

  if (!tokenRow || new Date(tokenRow.expires_at) < new Date()) {
    return res.status(401).json({ error: 'Session expired' });
  }

  // Build update object
  const updates = {
    updated_at: new Date().toISOString(),
  };

  if (bio    !== undefined) updates.bio   = bio;
  if (trade  !== undefined) updates.trade = trade;
  if (radius !== undefined) updates.service_radius = parseInt(radius);
  if (license)              updates.license_number  = license;
  if (setup_complete)       updates.setup_complete  = true;

  const { error } = await supabase
    .from('subscribers')
    .update(updates)
    .eq('email', tokenRow.email);

  if (error) {
    console.error('Profile update error:', error.message);
    return res.status(500).json({ error: error.message });
  }

  console.log(`✅ Profile updated: ${tokenRow.email}`);
  return res.status(200).json({ success: true });
}
