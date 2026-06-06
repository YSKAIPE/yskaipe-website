/**
 * app/api/instant-quote/route.ts
 * ─────────────────────────────────────────────────────────────────
 * Unified AI classifier + FRI pricer.
 *
 * Flow:
 *   1. Load all active service_tasks from Supabase (cached 5 min)
 *   2. Send description + full task list to Claude for classification
 *   3. Claude returns { slug, confidence }
 *   4. Look up matched task for tier flags + FRI band
 *   5. Ask Claude for a natural-language price breakdown using FRI band
 *   6. Return structured response to client
 *
 * On any AI failure → keyword fallback classifier runs instead.
 * This means the page always returns something useful.
 *
 * Replaces the old instant-quote route that used a hardcoded
 * 100-category list embedded in the prompt.
 * ─────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAllTasks, classifyByKeywords } from '@/lib/service-tasks'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { description, zip } = await req.json()

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'description is required' }, { status: 400 })
    }

    // 1. Load task catalogue from DB (cached)
    const tasks = await getAllTasks()

    // Build a compact task list for the prompt — slug + label + keywords
    const taskList = tasks
      .map((t) => `${t.slug} | ${t.label} | ${t.category} | keywords: ${(t.ai_keywords ?? []).join(', ')}`)
      .join('\n')

    // 2. Classify via Claude
    let matchedSlug: string | null = null
    let confidence = 0

    try {
      const classifyResp = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        system: `You are YSKAIPE's job classifier. Given a homeowner's job description, pick the single best matching slug from the list below.
Return ONLY valid JSON: {"slug":"<slug>","confidence":<0-1 float>}
No markdown, no explanation. If nothing matches well, use "life_handyman_misc".

TASK LIST:
${taskList}`,
        messages: [{ role: 'user', content: description }],
      })

      const raw = classifyResp.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('')
        .replace(/```[a-z]*|```/g, '')
        .trim()

      const parsed = JSON.parse(raw)
      matchedSlug = parsed.slug ?? null
      confidence = parsed.confidence ?? 0
    } catch {
      // AI failed — fall through to keyword fallback
    }

    // 3. Resolve task from slug; fall back to keyword classifier
    let task = matchedSlug ? tasks.find((t) => t.slug === matchedSlug) ?? null : null

    if (!task) {
      task = await classifyByKeywords(description)
      confidence = task ? 0.5 : 0
    }

    // Ultimate fallback: handyman
    if (!task) {
      task = tasks.find((t) => t.slug === 'life_handyman_misc') ?? tasks[0]
      confidence = 0.3
    }

    const friLow = task.fri_low ?? 80
    const friHigh = task.fri_high ?? 300
    const friUnit = task.fri_unit ?? 'flat'

    // 4. Ask Claude for a human-readable breakdown
    let breakdown = ''
    let includes: string[] = []
    let permitNote = ''

    try {
      const breakdownResp = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: `You are YSKAIPE's Fair Rate Index explainer. Given a job and its price range, write a short friendly explanation.
Return ONLY valid JSON:
{
  "breakdown": "2-3 sentence plain English explanation of what drives this price range",
  "includes": ["item 1","item 2","item 3"],
  "permit_note": "one sentence about permits if required, else empty string"
}
No markdown, no extra text.`,
        messages: [{
          role: 'user',
          content: `Job: ${description}
Task: ${task.label} (${task.category})
FRI range: $${friLow}–$${friHigh} ${friUnit.replace('_', ' ')}
Permit likely: ${task.permit_likely}
Zip: ${zip ?? 'NC'}`,
        }],
      })

      const raw = breakdownResp.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('')
        .replace(/```[a-z]*|```/g, '')
        .trim()

      const parsed = JSON.parse(raw)
      breakdown = parsed.breakdown ?? ''
      includes = parsed.includes ?? []
      permitNote = parsed.permit_note ?? ''
    } catch {
      breakdown = `Typical ${task.label} jobs in NC run $${friLow}–$${friHigh}. Final price depends on scope, materials, and your specific ZIP code.`
      includes = ['Labor', 'Standard materials', 'Cleanup']
    }

    // 5. Build response
    return NextResponse.json({
      // Classification
      slug: task.slug,
      label: task.label,
      category: task.category,
      domain: task.domain,
      confidence,

      // Tier / eligibility flags (used by booking + dispatch)
      tier_min: task.tier_min,
      requires_license: task.requires_license,
      requires_insurance: task.requires_insurance,
      permit_likely: task.permit_likely,
      youth_ok: task.youth_ok,

      // Pricing
      fri_low: friLow,
      fri_high: friHigh,
      fri_unit: friUnit,

      // Human-readable
      breakdown,
      includes,
      permit_note: permitNote,
    })

  } catch (err) {
    console.error('[instant-quote] Fatal error:', err)
    return NextResponse.json(
      { error: 'Quote generation failed. Please try again.' },
      { status: 500 }
    )
  }
}
