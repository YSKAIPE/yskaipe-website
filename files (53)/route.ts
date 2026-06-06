/**
 * app/api/instant-quote/route.ts
 * ─────────────────────────────────────────────────────────────────
 * Uber-model instant pricing.
 *
 * Returns a single book-now price, not a range.
 * Price is AI-generated within the FRI band, adjusted for scope.
 * Complex/licensed jobs → "Starting from $X" (pro confirms on site)
 * Commodity jobs → "Book now for $X" (fixed, no asterisk)
 *
 * Worker payout = price × 0.85 (15% platform fee)
 * ─────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAllTasks, classifyByKeywords } from '@/lib/service-tasks'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// Jobs where scope is too variable for a single fixed price —
// licensed pro confirms final price on site. We still show a
// "starting from" number so homeowners have an anchor.
const SITE_ASSESSMENT_TIERS = ['licensed']
const COMPLEX_SLUGS = new Set([
  'gc_room_addition','gc_kitchen_remodel','gc_bath_remodel',
  'gc_deck_build','gc_new_home_construction','gc_custom_home_large',
  'gc_adu_build','gc_basement_finish','gc_pool_install',
  'hvac_ac_replacement','hvac_furnace_replacement','hvac_mini_split',
  'elec_panel_upgrade','elec_generator',
  'roof_full_replace','roof_partial_repair',
  'plumb_water_heater','plumb_main_line',
  'land_irrigation','land_tree_removal',
])

export async function POST(req: NextRequest) {
  try {
    const { description, zip } = await req.json()

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'description is required' }, { status: 400 })
    }

    // 1. Load task catalogue (cached 5 min)
    const tasks = await getAllTasks()

    const taskList = tasks
      .map((t) => `${t.slug} | ${t.label} | $${t.fri_low?.toLocaleString()}–$${t.fri_high?.toLocaleString()} | keywords: ${(t.ai_keywords ?? []).join(', ')}`)
      .join('\n')

    // 2. Classify
    let matchedSlug: string | null = null
    let confidence = 0

    try {
      const classifyResp = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        system: `You are YSKAIPE's job classifier. Match the homeowner's description to the single best slug.

Each task: slug | label | FRI price range | keywords

RULES:
- Match SPECIFIC task and REALISTIC SCALE. "20,000 sq ft new home" = gc_custom_home_large.
- "New home" / "build a house" = gc_new_home_construction.
- "Room addition" = gc_room_addition. Not a full build.
- Use the FRI price range to sanity-check your match. If a homeowner says "20k sf home", the $20k–$80k room addition slug is clearly wrong — pick the large custom home slug.
- Return ONLY valid JSON: {"slug":"<slug>","confidence":<0-1>}
- No markdown. No explanation. Default: "life_handyman_misc".

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
      confidence  = parsed.confidence ?? 0
    } catch { /* fall through */ }

    // 3. Resolve task
    let task = matchedSlug ? tasks.find((t) => t.slug === matchedSlug) ?? null : null
    if (!task) { task = await classifyByKeywords(description); confidence = task ? 0.5 : 0 }
    if (!task) { task = tasks.find((t) => t.slug === 'life_handyman_misc') ?? tasks[0]; confidence = 0.3 }

    const friLow  = task.fri_low  ?? 80
    const friHigh = task.fri_high ?? 300
    const friUnit = task.fri_unit ?? 'flat'

    // Is this a fixed-price commodity job or a site-assessment job?
    const needsSiteAssessment =
      COMPLEX_SLUGS.has(task.slug) ||
      (SITE_ASSESSMENT_TIERS.includes(task.tier_min) && task.requires_license)

    // 4. AI pricing — single number within FRI band, scope-adjusted
    const PRICING_SYSTEM = `You are YSKAIPE's AutoQuote engine. Generate a single fair book-now price for a home service job.

The Fair Rate Index defines the valid price band for this job type.
Your price MUST fall within that band — never below fri_low, never above fri_high.

HOW TO PICK THE PRICE:
- Start at the midpoint of the band
- Adjust UP if: large sq footage, multiple stories, premium materials mentioned, complex scope, tight timeline
- Adjust DOWN if: small scope, simple job, basic finish, flexible timing
- For jobs marked needs_site_assessment=true: return fri_low as the "starting from" price — the pro will confirm final price on arrival
- Round to nearest $25 for jobs under $500, nearest $100 for jobs $500–$5000, nearest $500 for jobs over $5000

Return ONLY valid JSON — no markdown:
{
  "price": <number>,
  "worker_payout": <number — price * 0.85, rounded same way>,
  "rationale": "one sentence explaining what in the description drove this specific price",
  "includes": ["item 1", "item 2", "item 3", "item 4"],
  "permit_note": "one sentence if permits required, else empty string"
}`

    const pricingUserMsg = `Homeowner's exact words: "${description}"
Task: ${task.label} (${task.category})
FRI band: $${friLow.toLocaleString()}–$${friHigh.toLocaleString()} (${friUnit.replace('_',' ')})
Tier: ${task.tier_min}
Needs site assessment: ${needsSiteAssessment}
Permit likely: ${task.permit_likely}
ZIP: ${zip ?? 'NC'}`

    let bookPrice    = needsSiteAssessment ? friLow : Math.round((friLow + friHigh) / 2)
    let workerPayout = Math.round(bookPrice * 0.85)
    let rationale    = ''
    let includes: string[] = []
    let permitNote   = ''

    try {
      const pricingResp = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: PRICING_SYSTEM,
        messages: [{ role: 'user', content: pricingUserMsg }],
      })

      const raw = pricingResp.content
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; text: string }).text)
        .join('')
        .replace(/```[a-z]*|```/g, '')
        .trim()

      const parsed = JSON.parse(raw)

      // Hard clamp — price can never escape the FRI band
      const clampedPrice = Math.min(Math.max(parsed.price ?? bookPrice, friLow), friHigh)
      bookPrice    = clampedPrice
      workerPayout = Math.round(clampedPrice * 0.85)
      rationale    = parsed.rationale    ?? ''
      includes     = parsed.includes     ?? []
      permitNote   = parsed.permit_note  ?? ''

    } catch {
      // Fallback: midpoint with no scope adjustment
      rationale = `${task.label} priced at Fair Rate Index midpoint for NC.`
      includes  = ['Labor', 'Standard materials', 'Cleanup']
    }

    return NextResponse.json({
      // Classification
      slug:     task.slug,
      label:    task.label,
      category: task.category,
      domain:   task.domain,
      confidence,

      // Tier / dispatch flags
      tier_min:           task.tier_min,
      requires_license:   task.requires_license,
      requires_insurance: task.requires_insurance,
      permit_likely:      task.permit_likely,
      youth_ok:           task.youth_ok,

      // Pricing — single book-now number
      book_price:          bookPrice,
      worker_payout:       workerPayout,
      needs_site_assessment: needsSiteAssessment,
      fri_low:             friLow,
      fri_high:            friHigh,
      fri_unit:            friUnit,

      // Human-readable
      rationale,
      includes,
      permit_note: permitNote,
    })

  } catch (err) {
    console.error('[instant-quote] Fatal error:', err)
    return NextResponse.json({ error: 'Quote generation failed. Please try again.' }, { status: 500 })
  }
}
