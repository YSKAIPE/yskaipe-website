/**
 * app/api/instant-quote/route.ts
 * ─────────────────────────────────────────────────────────────────
 * Unified AutoQuote — single fair price, tier-aware, book-now.
 *
 * Pricing philosophy:
 *   Claude prices the job using real NC industry knowledge.
 *   The FRI band from service_tasks is a REFERENCE and sanity check,
 *   not a hard clamp. For well-defined commodity jobs the price lands
 *   near the midpoint. For complex/large jobs Claude prices realistically
 *   based on actual scope (sq footage, number of units, etc).
 *
 *   For jobs too complex to book without a site visit (new home builds,
 *   major additions, large remodels), Claude returns needs_consultation=true
 *   and the page shows "Request free consultation" instead of "Book now."
 *
 * Worker payout = book_price × 0.85 (15% platform fee).
 * ─────────────────────────────────────────────────────────────────
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAllTasks, classifyByKeywords } from '@/lib/service-tasks'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// Jobs where even an accurate price can't be booked without a real
// conversation — too many site-specific unknowns.
const CONSULTATION_SLUGS = new Set([
  'gc_new_home_construction', 'gc_custom_home_large', 'gc_adu_build',
  'gc_room_addition', 'gc_kitchen_remodel', 'gc_bath_remodel',
  'gc_deck_build', 'gc_basement_finish', 'gc_pool_install',
  'gc_garage_build',
])

// NC regional labor rate multipliers by ZIP prefix
function getMultiplier(zip: string): number {
  if (!zip || zip.length < 3) return 1.0
  const p = parseInt(zip.substring(0, 3))
  if (p >= 270 && p <= 289) return 1.05  // Triangle (Raleigh/Durham)
  if (p >= 280 && p <= 283) return 1.08  // Charlotte metro
  if (p >= 284 && p <= 286) return 0.95  // Western NC / mountains
  if (p >= 274 && p <= 275) return 1.02  // Greensboro/Winston-Salem
  if (p >= 276 && p <= 279) return 1.03  // Raleigh closer in
  return 1.0
}

export async function POST(req: NextRequest) {
  try {
    const { description, zip, scope } = await req.json()

    if (!description || typeof description !== 'string') {
      return NextResponse.json({ error: 'description is required' }, { status: 400 })
    }

    // 1. Load task catalogue (cached 5 min)
    const tasks = await getAllTasks()
    const taskList = tasks
      .map((t) => `${t.slug} | ${t.label} | $${t.fri_low?.toLocaleString()}–$${t.fri_high?.toLocaleString()} | tier:${t.tier_min} | keywords: ${(t.ai_keywords ?? []).join(', ')}`)
      .join('\n')

    // 2. Classify
    let matchedSlug: string | null = null
    let confidence = 0

    try {
      const classifyResp = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        system: `You are YSKAIPE's job classifier. Match the homeowner's description to the single best slug.

Each entry: slug | label | FRI reference range | tier | keywords

RULES:
- Match SPECIFIC task and REALISTIC SCALE.
- "20,000 sq ft home" or "20k sf" = gc_custom_home_large
- "New home" / "build a house" = gc_new_home_construction  
- "Room addition" = gc_room_addition (not a full house)
- Use the FRI range to sanity-check — if a slug's range is wildly wrong for the described scale, pick a better one.
- Return ONLY valid JSON: {"slug":"<slug>","confidence":<0-1>}
- No markdown. Default: "life_handyman_misc".

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
    const multiplier = getMultiplier(zip ?? '')
    const needsConsultation = CONSULTATION_SLUGS.has(task.slug)

    // 4. Claude prices the job using real NC knowledge
    // The FRI band is provided as REFERENCE only — Claude prices based on actual scope.
    // This is the same approach as the original /api/quotes route that worked well.
    const PRICING_SYSTEM = `You are YSKAIPE's AutoQuote engine — a home services cost estimator using verified NC 2026 industry rates.

You are pricing a job for a homeowner who wants a single fair book-now price.

PRICING RULES:
1. Use your knowledge of real NC labor and material costs to price accurately.
2. The FRI reference band is a market anchor — use it as context, not a hard limit.
   If the actual scope (sq footage, units, complexity) puts the real price outside the band, price it correctly.
   Example: A 20,000 sq ft custom home costs $4M–$8M in NC. Don't artificially cap it.
3. For needs_consultation=true jobs: give the realistic starting price a licensed pro would quote, 
   with a note that final price requires site assessment.
4. Factor in the ZIP code regional multiplier provided.
5. Round to nearest $25 under $1k, nearest $100 under $10k, nearest $500 under $100k, nearest $5000 above.
6. worker_payout = book_price × 0.85 (platform takes 15%).

Return ONLY valid JSON — no markdown, no extra text:
{
  "book_price": <number>,
  "worker_payout": <number>,
  "rationale": "one sentence explaining what in the description drove this specific price",
  "includes": ["item 1", "item 2", "item 3", "item 4"],
  "permit_note": "one sentence if permits genuinely required, else empty string",
  "needs_consultation": <true if site visit required before final price, else false>
}`

    const pricingUserMsg = `Homeowner's words: "${description}"
Scope/size: ${scope || 'not specified'}
Task matched: ${task.label} (${task.category})
FRI reference band: $${friLow.toLocaleString()}–$${friHigh.toLocaleString()} (${friUnit.replace('_', ' ')})
ZIP: ${zip ?? 'NC'} | Regional multiplier: ${multiplier}x
Worker tier required: ${task.tier_min}
Needs consultation (complex job): ${needsConsultation}
Permit likely: ${task.permit_likely}

Price this job accurately based on actual scope described. Do not artificially cap at the FRI band if the real scope is larger.`

    let bookPrice         = Math.round((friLow + friHigh) / 2)
    let workerPayout      = Math.round(bookPrice * 0.85)
    let rationale         = ''
    let includes: string[] = []
    let permitNote        = ''
    let needsConsult      = needsConsultation

    try {
      const pricingResp = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
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

      // Soft sanity check: warn in logs if wildly outside band but don't clamp
      const rawPrice = parsed.book_price ?? bookPrice
      if (rawPrice < friLow * 0.3 || rawPrice > friHigh * 10) {
        console.warn(`[instant-quote] Price ${rawPrice} outside expected range ${friLow}–${friHigh} for ${task.slug}`)
      }

      bookPrice    = rawPrice
      workerPayout = parsed.worker_payout ?? Math.round(rawPrice * 0.85)
      rationale    = parsed.rationale    ?? ''
      includes     = parsed.includes     ?? []
      permitNote   = parsed.permit_note  ?? ''
      needsConsult = parsed.needs_consultation ?? needsConsultation

    } catch {
      rationale = `${task.label} priced at Fair Rate Index midpoint for NC.`
      includes  = ['Labor', 'Standard materials', 'Cleanup']
    }

    return NextResponse.json({
      // Classification
      slug:       task.slug,
      label:      task.label,
      category:   task.category,
      domain:     task.domain,
      confidence,

      // Tier / dispatch flags
      tier_min:           task.tier_min,
      requires_license:   task.requires_license,
      requires_insurance: task.requires_insurance,
      permit_likely:      task.permit_likely,
      youth_ok:           task.youth_ok,

      // Pricing — Claude's real assessment, not a clamped midpoint
      book_price:           bookPrice,
      worker_payout:        workerPayout,
      needs_consultation:   needsConsult,
      fri_low:              friLow,
      fri_high:             friHigh,
      fri_unit:             friUnit,

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
