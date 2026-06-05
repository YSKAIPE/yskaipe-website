// app/api/contact/route.ts
// Receives contact form from contact.html
// Forwards message to gr8@yskaipe.com via Resend
// Sends confirmation to the person who wrote in

import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM   = 'YSKAIPE <gr8@yskaipe.com>'
const TO     = 'gr8@yskaipe.com'

const ROLE_LABELS: Record<string, string> = {
  homeowner:    'Homeowner',
  worker:       'Interested worker',
  licensed_pro: 'Licensed trade professional',
  airbnb:       'Airbnb / short-term rental host',
  partnership:  'Partnership or press',
  other:        'Other',
}

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, role, message } = await req.json()

    if (!firstName || !lastName || !email || !role || !message) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    const roleLabel = ROLE_LABELS[role] || role
    const fullName  = `${firstName} ${lastName}`

    // ── Admin alert ────────────────────────────────────────
    await resend.emails.send({
      from:    FROM,
      to:      TO,
      replyTo: email,
      subject: `Contact form — ${fullName} (${roleLabel})`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;color:#1a1a18">
          <h2 style="font-family:Georgia,serif;font-size:20px;margin:0 0 16px">New contact message</h2>
          <table style="width:100%;font-size:13px;border-collapse:collapse">
            <tr><td style="padding:5px 0;color:#6b6b62;width:120px">Name</td><td><strong>${fullName}</strong></td></tr>
            <tr><td style="padding:5px 0;color:#6b6b62">Email</td><td><a href="mailto:${email}" style="color:#0d7a5f">${email}</a></td></tr>
            <tr><td style="padding:5px 0;color:#6b6b62">They are</td><td>${roleLabel}</td></tr>
            <tr><td style="padding:5px 0;color:#6b6b62">Sent</td><td>${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</td></tr>
          </table>
          <div style="margin-top:20px;padding:16px 18px;background:#f5f3ee;border-radius:10px;border-left:3px solid #0d7a5f">
            <p style="font-size:13px;color:#3d3d38;line-height:1.7;margin:0">${message.replace(/\n/g, '<br>')}</p>
          </div>
          <p style="margin-top:16px;font-size:11px;color:#6b6b62">Reply directly to this email — it goes to ${email}</p>
        </div>
      `,
    })

    // ── Confirmation to sender ─────────────────────────────
    await resend.emails.send({
      from:    FROM,
      to:      email,
      replyTo: TO,
      subject: `Got it, ${firstName} — YSKAIPE`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a18">
          <div style="background:#0d7a5f;padding:24px 32px;border-radius:12px 12px 0 0">
            <p style="font-family:Georgia,serif;font-size:20px;color:#fff;margin:0;letter-spacing:-0.02em">YSKAIPE</p>
          </div>
          <div style="background:#fefcf8;padding:28px 32px;border:1px solid #e2dfd6;border-top:none;border-radius:0 0 12px 12px">
            <h2 style="font-family:Georgia,serif;font-size:20px;margin:0 0 12px;letter-spacing:-0.02em">Got it, ${firstName}.</h2>
            <p style="color:#3d3d38;line-height:1.7;margin:0 0 16px;font-size:14px">
              Thanks for reaching out. We're a two-person team (Nick and Deb) and we read every message. We'll reply within 24 hours — usually much faster.
            </p>
            <div style="background:#f5f3ee;border-radius:10px;padding:14px 16px;margin-bottom:20px">
              <p style="font-size:12px;color:#6b6b62;margin:0 0 6px;font-weight:500;text-transform:uppercase;letter-spacing:.06em">Your message</p>
              <p style="font-size:13px;color:#3d3d38;line-height:1.65;margin:0">${message.replace(/\n/g, '<br>')}</p>
            </div>
            <p style="font-size:12px;color:#6b6b62;margin:0;line-height:1.6">
              Questions in the meantime? Reply to this email — it comes straight to us.<br>
              <strong>Nick & Deb · YSKAIPE · Cornelius, NC</strong>
            </p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (err) {
    console.error('[contact] Error:', err)
    return NextResponse.json({ error: 'Failed to send message. Please email gr8@yskaipe.com directly.' }, { status: 500 })
  }
}
