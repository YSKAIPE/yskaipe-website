import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { RATES_DB, getRegionalMultiplier } from '@/lib/rates'
import {
  resolveTrade,
  LEGACY_TRADE_ALIAS,
  REJECTED_TRADES,
  type TradeSlug,
} from '@/lib/canonical-trades'
import { saveQuote } from '@/lib/supabase'
import { QuoteRequest, QuoteResult } from '@/types/quote'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * Normalize the incoming `trade` value to a canonical Pro Core slug.
 *
 *   1. If it's already a canonical slug or canonical display name → use it.
 *   2. If it's a known legacy role-name alias ("Plumber" → "plumbing") → map it.
 *   3. If it's a REJECTED legacy trade ("Welder", "EMT") → return null (will 400).
 *   4. Otherwise → return null (will 400 with "Unknown trade type").
 */
function normalizeTrade(input: string): TradeSlug | null {
  if (!input) return null

  // First: try canonical resolution (slug, displayName, agent name, etc.)
  const canonical = resolveTrade(input)
  if (canonical) return canonical.slug

  // Second: legacy alias mapping (for /public/autoquote.html and blog page during transition)
  if (LEGACY_TRADE_ALIAS[input]) return LEGACY_TRADE_ALIAS[input]

  // Third: rejected legacy trade — explicit "no, this isn't Pro Core"
  if (REJECTED_TRADES.has(input)) return null

  return null
}

export async function POST(req: NextRequest) {
  try {
    const body: QuoteRequest = await req.json()
    const {
      trade,
      zip,
      scope,
      description,
      customerName,
      customerEmail,
      customerPhone,
    } = body

    if (!trade || !description) {
      return NextResponse.json(
        { error: 'trade and description are required' },
        { status: 400 }
      )
    }

    // ===== CANONICAL TRADE GATE =====
    // Only the 8 Pro Core trades are accepted. Legacy aliases get mapped at the boundary.
    const tradeSlug = normalizeTrade(trade)
    if (!tradeSlug) {
      return NextResponse.json(
        {
          error: `"${trade}" is not a Pro Core trade. Valid trades: HVAC, Plumbing, Electrical, Roofing, Landscaping, Painting, General Contracting, Automotive.`,
        },
        { status: 400 }
      )
    }

    const rates = RATES_DB[tradeSlug]
    if (!rates) {
      // This should be unreachable if canonical-trades and RATES_DB stay in sync.
      return NextResponse.json(
        { error: `Rate table missing for trade: ${tradeSlug}` },
        { status: 500 }
      )
    }

    const multiplier = getRegionalMultiplier(zip)
    const adjustedLaborMin = Math.round(rates.laborMin * multiplier)
    const adjustedLaborMax = Math.round(rates.laborMax * multiplier)

    // Resolve the display name for the AI prompt + the returned quote
    const tradeDisplay = resolveTrade(tradeSlug)?.displayName ?? tradeSlug

    const systemPrompt = `You are an expert trade cost estimator for YSKAIPE — a North Carolina home services marketplace.
You estimate jobs using verified industry rates, adjusted for regional cost of living.

TRADE: ${tradeDisplay}
VERIFIED LABOR RATE: $${adjustedLaborMin}–$${adjustedLaborMax}/hr (regional adjustment: ${(multiplier * 100).toFixed(0)}% of NC baseline)
PERMIT REQUIRED: ${rates.permitRequired ? 'Yes — include permit cost estimate of $150–$500 in materials_total' : 'No'}
COMMON JOBS IN THIS TRADE: ${rates.commonJobs.join(', ')}

Return ONLY a valid JSON object with exactly these fields — no markdown, no extra text:
{
  "labor_hours": number,
  "labor_rate": number,
  "labor_total": number,
  "materials_total": number,
  "grand_total": number,
  "complexity": "simple" | "moderate" | "complex",
  "time_estimate": "string like '2-3 hours' or '1-2 days'",
  "breakdown": "2-3 sentence plain English explanation of the estimate, what drives the cost",
  "materials_list": ["item1", "item2", "item3"],
  "notes": "any important caveats, permit requirements, or follow-up needed"
}

Rules:
- labor_total = labor_hours * labor_rate (use midpoint of rate range unless complexity warrants otherwise)
- grand_total = labor_total + materials_total
- Be specific and realistic — a single best estimate, not a range
- If scope or home size affects cost significantly, factor it in
- For permits: add $150–$500 to materials_total if required`

    const userMsg = `Trade: ${tradeDisplay}
Location zip: ${zip || 'not provided — use NC (28031) as default'}
Scope / home size: ${scope || 'not specified'}
Job description: ${description}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMsg }],
    })

    const rawText = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('')
      .replace(/```json|```/g, '')
      .trim()

    const parsed = JSON.parse(rawText)

    const quote: QuoteResult = {
      // Trade is stored canonically (slug) AND surfaces as display name
      trade: tradeDisplay,
      trade_slug: tradeSlug, // <-- NEW: canonical slug for downstream routing
      zip: zip || '28031',
      scope,
      description,
      customerName,
      customerEmail,
      customerPhone,
      labor_hours: parsed.labor_hours,
      labor_rate: parsed.labor_rate,
      labor_total: parsed.labor_total,
      materials_total: parsed.materials_total,
      grand_total: parsed.grand_total,
      complexity: parsed.complexity,
      time_estimate: parsed.time_estimate,
      breakdown: parsed.breakdown,
      materials_list: parsed.materials_list || [],
      notes: parsed.notes || '',
    }

    // Save to Supabase
    const saved = await saveQuote(quote)
    if (saved?.id) {
      quote.id = saved.id
    }

    return NextResponse.json({ quote }, { status: 200 })
  } catch (err) {
    console.error('Quote generation error:', err)
    return NextResponse.json(
      { error: 'Failed to generate quote' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const { getQuoteById } = await import('@/lib/supabase')
  const quote = await getQuoteById(id)

  if (!quote) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  return NextResponse.json({ quote })
}
