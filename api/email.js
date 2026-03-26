export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { to, name, quote } = req.body;
  if (!to || !quote) return res.status(400).json({ error: 'Missing required fields' });

  const q = quote;
  const labor = '$' + Math.round((q.labor_low + q.labor_high) / 2).toLocaleString();
  const materials = '$' + Math.round((q.materials_low + q.materials_high) / 2).toLocaleString();
  const total = '$' + Math.round((q.total_low + q.total_high) / 2).toLocaleString();

  const materialsRows = (q.diy_materials || []).map(m =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #ede9e0;font-size:14px;">${m.name}${m.qty ? ' &times;' + m.qty : ''}</td><td style="padding:8px 12px;border-bottom:1px solid #ede9e0;font-size:14px;text-align:right;color:#1a6b3c;">${m.estimatedCost || ''}</td></tr>`
  ).join('');

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f2ec;font-family:'DM Sans',Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:6px;overflow:hidden;box-shadow:0 4px 24px rgba(15,14,12,0.08);">
    <div style="background:#0f0e0c;padding:32px 40px;">
      <div style="font-size:28px;font-weight:700;letter-spacing:0.15em;color:#f5f2ec;">YSKAIPE</div>
      <div style="font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#d4500a;margin-top:4px;">Your Standard Cost Estimate</div>
    </div>
    <div style="padding:32px 40px;">
      ${name ? `<p style="font-size:15px;color:#6b6560;margin:0 0 24px;">Hi ${name},</p>` : ''}
      <p style="font-size:15px;color:#6b6560;margin:0 0 24px;">Here is your YSKAIPE standard cost estimate based on verified NC 2026 industry rates.</p>
      <div style="display:flex;gap:12px;margin-bottom:24px;">
        <div style="flex:1;background:#f5f2ec;border-radius:4px;padding:16px;text-align:center;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#6b6560;margin-bottom:4px;">Labor</div>
          <div style="font-size:28px;font-weight:700;color:#0f0e0c;">${labor}</div>
          <div style="font-size:12px;color:#6b6560;">$${q.labor_low.toLocaleString()} &ndash; $${q.labor_high.toLocaleString()}</div>
        </div>
        <div style="flex:1;background:#f5f2ec;border-radius:4px;padding:16px;text-align:center;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#6b6560;margin-bottom:4px;">Materials</div>
          <div style="font-size:28px;font-weight:700;color:#0f0e0c;">${materials}</div>
          <div style="font-size:12px;color:#6b6560;">$${q.materials_low.toLocaleString()} &ndash; $${q.materials_high.toLocaleString()}</div>
        </div>
        <div style="flex:1;background:#0f0e0c;border-radius:4px;padding:16px;text-align:center;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:rgba(245,242,236,0.5);margin-bottom:4px;">Total Standard</div>
          <div style="font-size:28px;font-weight:700;color:#f5f2ec;">${total}</div>
          <div style="font-size:12px;color:rgba(245,242,236,0.4);">$${q.total_low.toLocaleString()} &ndash; $${q.total_high.toLocaleString()}</div>
        </div>
      </div>
      <div style="background:#f5f2ec;border-radius:4px;padding:16px;margin-bottom:24px;font-size:14px;line-height:1.75;color:#6b6560;">
        ${q.breakdown}<br><br><strong style="color:#0f0e0c;">Timeline:</strong> ${q.timeline}
      </div>
      ${q.diy_steps ? `
      <h3 style="font-size:16px;font-weight:600;color:#0f0e0c;margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid #ede9e0;">DIY Instructions</h3>
      <div style="font-size:14px;line-height:1.8;color:#6b6560;margin-bottom:24px;padding-left:0;white-space:pre-wrap;">${q.diy_steps}</div>
      ` : ''}
      ${materialsRows ? `
      <h3 style="font-size:16px;font-weight:600;color:#0f0e0c;margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid #ede9e0;">Materials List</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead><tr><th style="text-align:left;padding:8px 12px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#6b6560;border-bottom:2px solid #ede9e0;">Item</th><th style="text-align:right;padding:8px 12px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#6b6560;border-bottom:2px solid #ede9e0;">Est. Cost</th></tr></thead>
        <tbody>${materialsRows}</tbody>
      </table>
      ` : ''}
      ${q.diy_warning ? `<div style="background:rgba(212,80,10,0.06);border:1px solid rgba(212,80,10,0.2);border-radius:4px;padding:12px 16px;font-size:13px;color:#d4500a;margin-bottom:24px;"><strong>Heads Up:</strong> ${q.diy_warning}</div>` : ''}
    </div>
    <div style="background:#0f0e0c;padding:24px 40px;text-align:center;">
      <p style="font-size:12px;color:rgba(245,242,236,0.4);margin:0;">YSKAIPE &middot; Human Hands. AI Power. &middot; yskaipe.com</p>
      <p style="font-size:11px;color:rgba(245,242,236,0.25);margin:8px 0 0;">Based on verified NC 2026 industry standards. Estimates are for reference only.</p>
    </div>
  </div>
</body>
</html>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.RESEND_API_KEY
      },
      body: JSON.stringify({
        from: 'YSKAIPE <quotes@yskaipe.com>',
        to: [to],
        subject: 'Your YSKAIPE Standard Cost Estimate',
        html
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data });
    res.status(200).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
