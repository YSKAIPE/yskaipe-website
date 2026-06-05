// app/api/instant-quote-book/route.ts
// Receives booking from instant-quote.html after quote is shown
// Saves to homeowner_requests table
// Sends admin alert to gr8@yskaipe.com + confirmation to homeowner
// Phase 2: payment capture + worker dispatch will extend this route

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend  = new Resend(process.env.RESEND_API_KEY!)
const FROM    = 'YSKAIPE <gr8@yskaipe.com>'
const ADMIN   = 'gr8@yskaipe.com'

export async function POST(req: NextRequest) {
  try {
    const { firstName, lastName, email, phone, timing, quote, confirmNumber } = await req.json()

    if (!firstName || !lastName || !email || !phone || !quote) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const fullName = `${firstName} ${lastName}`

    // ── Save to homeowner_requests ────────────────────────────────────────
    const { data: requestRow, error: dbError } = await supabase
      .from('homeowner_requests')
      .insert({
        homeowner_name:  fullName,
        homeowner_email: email.toLowerCase().trim(),
        homeowner_phone: phone.trim(),
        trade:           quote.slug || 'general',
        zip_code:        quote.zip,
        description:     quote.description,
        quote_low:       quote.low,
        quote_high:      quote.high,
        status:          'pending',
        // Store extra context for new model
        notes: JSON.stringify({
          category:      quote.category,
          confirm:       confirmNumber,
          timing:        timing || 'Not specified',
          source:        'instant-quote',
          breakdown:     quote.breakdown,
        }),
      })
      .select('id')
      .single()

    if (dbError) {
      console.error('[instant-quote-book] DB error:', dbError)
      // Don't fail the user — still send emails even if DB write fails
    }

    const requestId = requestRow?.id || 'pending'

    // ── Admin alert ────────────────────────────────────────────────────────
    await resend.emails.send({
      from:    FROM,
      to:      ADMIN,
      replyTo: email,
      subject: `New job booked — ${quote.category} · ${quote.zip} · ${confirmNumber}`,
      html: `
        <div style="font-family:sans-serif;max-width:560px;color:#1a1a18">
          <h2 style="font-family:Georgia,serif;font-size:20px;margin:0 0 16px">New instant quote booking</h2>
          <table style="width:100%;font-size:13px;border-collapse:collapse">
            <tr><td style="padding:5px 0;color:#6b6b62;width:140px">Confirm #</td><td><strong style="font-family:monospace">${confirmNumber}</strong></td></tr>
            <tr><td style="padding:5px 0;color:#6b6b62">Homeowner</td><td><strong>${fullName}</strong></td></tr>
            <tr><td style="padding:5px 0;color:#6b6b62">Email</td><td><a href="mailto:${email}" style="color:#0d7a5f">${email}</a></td></tr>
            <tr><td style="padding:5px 0;color:#6b6b62">Phone</td><td>${phone}</td></tr>
            <tr><td style="padding:5px 0;color:#6b6b62">Category</td><td>${quote.category}</td></tr>
            <tr><td style="padding:5px 0;color:#6b6b62">ZIP</td><td>${quote.zip}</td></tr>
            <tr><td style="padding:5px 0;color:#6b6b62">FRI range</td><td><strong>$${quote.low} — $${quote.high}</strong></td></tr>
            <tr><td style="padding:5px 0;color:#6b6b62">Timing</td><td>${timing || 'Not specified'}</td></tr>
            <tr><td style="padding:5px 0;color:#6b6b62">Request ID</td><td style="font-family:monospace;font-size:11px">${requestId}</td></tr>
          </table>
          <div style="margin-top:20px;padding:16px 18px;background:#f5f3ee;border-radius:10px;border-left:3px solid #0d7a5f">
            <p style="font-size:12px;color:#6b6b62;margin:0 0 6px;font-weight:500">Job description</p>
            <p style="font-size:13px;color:#3d3d38;line-height:1.65;margin:0">${quote.description}</p>
          </div>
          <div style="margin-top:16px;padding:12px 16px;background:#d4ede6;border-radius:8px">
            <p style="font-size:12px;color:#0a5e49;margin:0"><strong>Next step:</strong> Find a YSKAIPE Qualified worker for this job in ZIP ${quote.zip} and reply to homeowner within 2 hours. Phase 2 will automate this dispatch.</p>
          </div>
        </div>
      `,
    })

    // ── Homeowner confirmation ─────────────────────────────────────────────
    await resend.emails.send({
      from:    FROM,
      to:      email.toLowerCase().trim(),
      replyTo: ADMIN,
      subject: `You're booked — ${quote.category} · ${confirmNumber}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a18">
          <div style="background:#0d7a5f;padding:24px 32px;border-radius:12px 12px 0 0">
            <p style="font-family:Georgia,serif;font-size:20px;color:#fff;margin:0;letter-spacing:-0.02em">YSKAIPE</p>
          </div>
          <div style="background:#fefcf8;padding:28px 32px;border:1px solid #e2dfd6;border-top:none;border-radius:0 0 12px 12px">
            <h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 12px;letter-spacing:-0.02em">
              You're booked, ${firstName}.
            </h2>
            <p style="color:#3d3d38;line-height:1.7;font-size:14px;margin:0 0 20px">
              We're matching you with a <strong>YSKAIPE Qualified local</strong> for your job. Expect a confirmation within 2 hours — usually much faster.
            </p>

            <div style="background:#f5f3ee;border-radius:10px;padding:18px 20px;margin-bottom:20px">
              <table style="width:100%;font-size:13px;border-collapse:collapse">
                <tr><td style="padding:4px 0;color:#6b6b62;width:120px">Confirm #</td><td><strong style="font-family:monospace">${confirmNumber}</strong></td></tr>
                <tr><td style="padding:4px 0;color:#6b6b62">Job</td><td><strong>${quote.category}</strong></td></tr>
                <tr><td style="padding:4px 0;color:#6b6b62">Fair Rate</td><td><strong style="color:#0d7a5f">$${quote.low} — $${quote.high}</strong></td></tr>
                <tr><td style="padding:4px 0;color:#6b6b62">ZIP</td><td>${quote.zip}</td></tr>
                ${timing ? `<tr><td style="padding:4px 0;color:#6b6b62">Timing</td><td>${timing}</td></tr>` : ''}
              </table>
            </div>

            <div style="background:#d4ede6;border-radius:8px;padding:14px 16px;margin-bottom:20px;display:flex;gap:10px;align-items:flex-start">
              <span style="font-size:16px;flex-shrink:0">🔒</span>
              <p style="font-size:13px;color:#0a5e49;margin:0;line-height:1.6">Your payment will be held in <strong>escrow</strong> and only released when you confirm the job is complete. You're protected at every step.</p>
            </div>

            <p style="font-size:12px;color:#6b6b62;margin:0;line-height:1.6;border-top:1px solid #e2dfd6;padding-top:16px">
              Questions? Reply to this email — it goes straight to Nick and Deb at YSKAIPE.<br>
              <strong>YSKAIPE · Peaking Waters LLC · Cornelius, NC</strong>
            </p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ success: true, confirmNumber, requestId }, { status: 200 })

  } catch (err) {
    console.error('[instant-quote-book] Error:', err)
    return NextResponse.json(
      { error: 'Booking failed. Please email gr8@yskaipe.com directly.' },
      { status: 500 }
    )
  }
}
