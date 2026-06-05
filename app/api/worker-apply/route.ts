// app/api/worker-apply/route.ts
// Receives worker signup form submission from yskaipe-workers.html
// Saves to workers table via record_worker_application RPC
// Sends confirmation email to applicant + admin alert to gr8@yskaipe.com

import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)

const ADMIN_EMAIL = 'gr8@yskaipe.com'
const FROM_EMAIL  = 'YSKAIPE <gr8@yskaipe.com>'

// Age tier mapping from form value
function resolveAgeTier(ageRange: string): 'junior' | 'standard' | 'adult' {
  if (ageRange === '14-17') return 'junior'
  if (ageRange === '18-25') return 'standard'
  return 'adult'
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      firstName,
      lastName,
      email,
      phone,
      zipCode,
      workerType,
      ageRange,
      skills,
      parentName,
      parentEmail,
    } = body

    // ── Validate required fields ──────────────────────────────
    if (!firstName || !lastName || !email || !phone || !zipCode || !workerType || !ageRange) {
      return NextResponse.json(
        { error: 'Missing required fields.' },
        { status: 400 }
      )
    }

    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one skill.' },
        { status: 400 }
      )
    }

    const ageTier = resolveAgeTier(ageRange)

    if (ageTier === 'junior' && !parentName) {
      return NextResponse.json(
        { error: 'Parent or guardian name is required for applicants under 18.' },
        { status: 400 }
      )
    }

    // ── Save to Supabase via RPC ──────────────────────────────
    const { data: workerId, error: dbError } = await supabase.rpc(
      'record_worker_application',
      {
        p_first_name:   firstName.trim(),
        p_last_name:    lastName.trim(),
        p_email:        email.toLowerCase().trim(),
        p_phone:        phone.trim(),
        p_zip_code:     zipCode.trim(),
        p_worker_type:  workerType,
        p_age_tier:     ageTier,
        p_skills:       skills,
        p_parent_name:  parentName?.trim() || null,
        p_parent_email: parentEmail?.toLowerCase().trim() || null,
      }
    )

    if (dbError) {
      console.error('[worker-apply] DB error:', dbError)
      return NextResponse.json(
        { error: 'Failed to save application. Please try again.' },
        { status: 500 }
      )
    }

    const isJunior = ageTier === 'junior'
    const fullName = `${firstName} ${lastName}`
    const skillsList = skills.join(', ')

    // ── Applicant confirmation email ──────────────────────────
    await resend.emails.send({
      from:    FROM_EMAIL,
      to:      email.toLowerCase().trim(),
      replyTo: ADMIN_EMAIL,
      subject: `You're in the queue — YSKAIPE`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#1a1a18">
          <div style="background:#0d7a5f;padding:28px 32px;border-radius:12px 12px 0 0">
            <p style="font-family:Georgia,serif;font-size:22px;color:#fff;margin:0;letter-spacing:-0.02em">YSKAIPE</p>
          </div>
          <div style="background:#fefcf8;padding:28px 32px;border:1px solid #e2dfd6;border-top:none;border-radius:0 0 12px 12px">
            <h2 style="font-family:Georgia,serif;font-size:22px;margin:0 0 12px;letter-spacing:-0.02em">
              Hey ${firstName} — you're in the queue.
            </h2>
            <p style="color:#3d3d38;line-height:1.7;margin:0 0 16px">
              We received your application to join the YSKAIPE network as a <strong>YSKAIPE Qualified local</strong>.
              We'll review your application and reach out within <strong>24 hours</strong> to complete your onboarding.
            </p>

            <div style="background:#f5f3ee;border-radius:10px;padding:16px 18px;margin-bottom:20px">
              <p style="font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#6b6b62;margin:0 0 10px">Your application summary</p>
              <table style="width:100%;font-size:13px;color:#3d3d38;border-collapse:collapse">
                <tr><td style="padding:4px 0;color:#6b6b62">Name</td><td style="padding:4px 0"><strong>${fullName}</strong></td></tr>
                <tr><td style="padding:4px 0;color:#6b6b62">ZIP code</td><td style="padding:4px 0"><strong>${zipCode}</strong></td></tr>
                <tr><td style="padding:4px 0;color:#6b6b62">Skills</td><td style="padding:4px 0"><strong>${skillsList}</strong></td></tr>
                ${isJunior ? `<tr><td style="padding:4px 0;color:#6b6b62">Program</td><td style="padding:4px 0"><strong>YSKAIPE Junior (parent: ${parentName})</strong></td></tr>` : ''}
              </table>
            </div>

            ${isJunior ? `
            <div style="background:#faeeda;border:1px solid #e8c86a;border-radius:10px;padding:14px 16px;margin-bottom:20px">
              <p style="font-size:13px;color:#6b4f00;margin:0;line-height:1.6">
                <strong>Junior Program note:</strong> Because ${firstName} is under 18, we'll also be reaching out to 
                ${parentName} to co-sign the Independent Contractor agreement before any jobs are dispatched.
              </p>
            </div>
            ` : ''}

            <p style="color:#3d3d38;line-height:1.7;margin:0 0 8px">
              What happens next:
            </p>
            <ol style="color:#6b6b62;font-size:13px;line-height:1.8;padding-left:18px;margin:0 0 20px">
              <li>We review your application (within 24 hrs)</li>
              <li>We send you the YSKAIPE Qualified onboarding link</li>
              <li>You sign the IC agreement and connect Stripe for payouts</li>
              <li>Jobs in ${zipCode} start appearing in your dashboard</li>
            </ol>

            <p style="font-size:12px;color:#6b6b62;border-top:1px solid #e2dfd6;padding-top:16px;margin:0;line-height:1.6">
              Questions? Reply to this email — it goes straight to us.<br>
              <strong>YSKAIPE · Peaking Waters LLC · Cornelius, NC</strong>
            </p>
          </div>
        </div>
      `,
    })

    // ── Admin alert email ─────────────────────────────────────
    await resend.emails.send({
      from:    FROM_EMAIL,
      to:      ADMIN_EMAIL,
      subject: `New worker application — ${fullName} (${zipCode}) [${ageTier}]`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;color:#1a1a18">
          <h2 style="font-family:Georgia,serif;font-size:20px;margin:0 0 16px">New worker application</h2>
          <table style="width:100%;font-size:13px;border-collapse:collapse">
            <tr><td style="padding:5px 0;color:#6b6b62;width:130px">Worker ID</td><td><code>${workerId}</code></td></tr>
            <tr><td style="padding:5px 0;color:#6b6b62">Name</td><td><strong>${fullName}</strong></td></tr>
            <tr><td style="padding:5px 0;color:#6b6b62">Email</td><td>${email}</td></tr>
            <tr><td style="padding:5px 0;color:#6b6b62">Phone</td><td>${phone}</td></tr>
            <tr><td style="padding:5px 0;color:#6b6b62">ZIP</td><td>${zipCode}</td></tr>
            <tr><td style="padding:5px 0;color:#6b6b62">Type</td><td>${workerType}</td></tr>
            <tr><td style="padding:5px 0;color:#6b6b62">Age tier</td><td>${ageTier}${isJunior ? ` (parent: ${parentName})` : ''}</td></tr>
            <tr><td style="padding:5px 0;color:#6b6b62">Skills</td><td>${skillsList}</td></tr>
            <tr><td style="padding:5px 0;color:#6b6b62">Applied at</td><td>${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</td></tr>
          </table>
          <div style="margin-top:20px;padding:14px 16px;background:#f5f3ee;border-radius:8px">
            <p style="font-size:12px;color:#6b6b62;margin:0">
              To approve: open nick-admin.html → Workers tab → find ${fullName} → click Qualify.<br>
              This will set status = 'qualified' and send their onboarding magic link.
            </p>
          </div>
        </div>
      `,
    })

    return NextResponse.json(
      { success: true, workerId },
      { status: 200 }
    )

  } catch (err) {
    console.error('[worker-apply] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
