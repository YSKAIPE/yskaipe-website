export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { quote, email, to, name } = req.body
  const recipientEmail = email || to

  if (!recipientEmail || !quote) {
    return res.status(400).json({ error: 'email and quote are required' })
  }

  const formatCurrency = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })

  const materialsHTML = quote.materials_list?.length
    ? quote.materials_list.map(m => `<li style="margin:4px 0;color:#555;">${m}</li>`).join('')
    : '<li style="color:#888;">Not specified</li>'

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e8e6e0;">
        <tr><td style="background:#0a0a0a;padding:28px 32px;">
          <p style="margin:0;font-size:11px;letter-spacing:0.12em;color:#888;text-transform:uppercase;">YSKAIPE AutoQuote</p>
          <h1 style="margin:6px 0 0;font-size:24px;font-weight:500;color:#fff;">Your Standard Cost Estimate</h1>
        </td></tr>
        <tr><td style="padding:24px 32px;">
          <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.08em;">Trade</p>
          <p style="margin:4px 0 12px;font-size:18px;font-weight:500;color:#0a0a0a;">${quote.trade || 'General'}</p>
          <p style="margin:0 0 16px;font-size:13px;color:#888;">${quote.description || ''}</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="background:#f9f8f5;border-radius:8px;padding:16px 20px;" align="center">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;">Labor</p>
                <p style="margin:6px 0 0;font-size:22px;font-weight:500;color:#0a0a0a;">${formatCurrency(quote.labor_total)}</p>
              </td>
              <td width="12"></td>
              <td style="background:#f9f8f5;border-radius:8px;padding:16px 20px;" align="center">
                <p style="margin:0;font-size:11px;color:#999;text-transform:uppercase;">Materials</p>
                <p style="margin:6px 0 0;font-size:22px;font-weight:500;color:#0a0a0a;">${formatCurrency(quote.materials_total)}</p>
              </td>
              <td width="12"></td>
              <td style="background:#0a0a0a;border-radius:8px;padding:16px 20px;" align="center">
                <p style="margin:0;font-size:11px;color:#666;text-transform:uppercase;">Total</p>
                <p style="margin:6px 0 0;font-size:22px;font-weight:500;color:#fff;">${formatCurrency(quote.grand_total)}</p>
                <p style="margin:4px 0 0;font-size:12px;color:#666;">${quote.time_estimate || ''}</p>
              </td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:0 32px 24px;">
          <div style="background:#f9f8f5;border-radius:8px;padding:16px 20px;">
            <p style="margin:0 0 8px;font-size:12px;font-weight:500;color:#0a0a0a;text-transform:uppercase;letter-spacing:0.06em;">Breakdown</p>
            <p style="margin:0;font-size:14px;color:#555;line-height:1.7;">${quote.breakdown || ''}</p>
          </div>
        </td></tr>
        <tr><td style="padding:0 32px 24px;border-top:1px solid #f0eeea;">
          <p style="margin:16px 0 8px;font-size:12px;font-weight:500;color:#0a0a0a;text-transform:uppercase;">Materials</p>
          <ul style="margin:8px 0;padding-left:20px;">${materialsHTML}</ul>
        </td></tr>
        <tr><td style="padding:24px 32px;background:#f9f8f5;border-top:1px solid #f0eeea;" align="center">
          <a href="https://www.yskaipe.com" style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:500;">Get another quote</a>
          <p style="margin:16px 0 0;font-size:12px;color:#aaa;">YSKAIPE · NC 2026 verified rates · <a href="mailto:hello@yskaipe.com" style="color:#aaa;">hello@yskaipe.com</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'YSKAIPE AutoQuote <quotes@yskaipe.com>',
        to: [recipientEmail],
        subject: `Your ${quote.trade || 'Home Service'} Estimate — ${formatCurrency(quote.grand_total)}`,
        html
      })
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('Resend error:', data)
      return res.status(500).json({ error: 'Failed to send email' })
    }

    return res.status(200).json({ success: true, id: data.id })
  } catch (e) {
    console.error('Email error:', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
