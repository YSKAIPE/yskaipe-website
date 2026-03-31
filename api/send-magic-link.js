// api/send-magic-link.js
// POST { email } → generates a secure token → emails dashboard login link
// Called from dashboard.html login form

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  // Check they are an active subscriber
  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('name, tier, status')
    .eq('email', email.toLowerCase().trim())
    .in('status', ['active', 'past_due'])
    .single();

  // Always respond the same way — don't reveal whether email exists
  if (!subscriber) {
    return res.status(200).json({ sent: true });
  }

  // Generate token
  const token = crypto.randomUUID() + '-' + Date.now();
  const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

  await supabase.from('magic_tokens').insert({
    email: email.toLowerCase().trim(),
    token,
    expires_at: expires,
    used: false,
  });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.yskaipe.com';
  const loginUrl = `${siteUrl}/public/dashboard.html?token=${token}`;
  const firstName = subscriber.name ? subscriber.name.split(' ')[0] : 'there';

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F2EFE9;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
        <tr>
          <td style="background:#2A2724;border-radius:12px 12px 0 0;padding:28px 36px;">
            <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:0.1em;color:#F2EFE9;">
              YSK<span style="color:#F5A623;">AI</span>PE PRO
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#ffffff;padding:36px;border-radius:0 0 12px 12px;">
            <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1E1C1A;">Your login link, ${firstName}</h2>
            <p style="margin:0 0 28px;font-size:15px;color:#5A5650;line-height:1.6;font-weight:300;">
              Click the button below to access your YSKAIPE Pro dashboard. This link expires in 1 hour and can only be used once.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr><td align="center">
                <a href="${loginUrl}" style="display:inline-block;background:#B85C2C;color:#ffffff;font-size:15px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;padding:14px 36px;border-radius:6px;text-decoration:none;">
                  Log In to Dashboard →
                </a>
              </td></tr>
            </table>
            <p style="margin:0 0 8px;font-size:12px;color:#8C887F;line-height:1.5;">
              Or copy this link into your browser:<br/>
              <span style="color:#B85C2C;word-break:break-all;">${loginUrl}</span>
            </p>
            <hr style="border:none;border-top:1px solid #E8E4DC;margin:24px 0;"/>
            <p style="margin:0;font-size:12px;color:#8C887F;">
              Didn't request this? Ignore this email — your account is safe.<br/>
              Need help? <a href="mailto:gr8@yskaipe.com" style="color:#B85C2C;">gr8@yskaipe.com</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px;text-align:center;">
            <p style="margin:0;font-size:11px;color:#8C887F;">© 2026 YSKAIPE · yskaipe.com</p>
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
      subject: 'Your YSKAIPE Pro login link',
      html,
    }),
  });

  return res.status(200).json({ sent: true });
}
