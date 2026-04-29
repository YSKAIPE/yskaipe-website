import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { RATES_DB, getRegionalMultiplier } from '@/lib/rates'
import { saveQuote } from '@/lib/supabase'
import { QuoteRequest, QuoteResult } from '@/types/quote'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
      return NextResponse.json({ error: 'trade and description are required' }, { status: 400 })
    }

    const rates = RATES_DB[trade]
    if (!rates) {
      return NextResponse.json({ error: 'Unknown trade type' }, { status: 400 })
    }

    const multiplier = getRegionalMultiplier(zip)
    const adjustedLaborMin = Math.round(rates.laborMin * multiplier)
    const adjustedLaborMax = Math.round(rates.laborMax * multiplier)

    const systemPrompt = `You are an expert trade cost estimator for YSKAIPE — a platform for skilled trade professionals in the US.
You estimate jobs using verified industry rates, adjusted for regional cost of living.

TRADE: ${trade}
VERIFIED LABOR RATE: $${adjustedLaborMin}–$${adjustedLaborMax}/hr (regional adjustment: ${(multiplier * 100).toFixed(0)}% of base)
PERMIT REQUIRED: ${rates.permitRequired ? 'Yes — include permit cost estimate' : 'No'}
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
- Be specific and realistic — not a range, a single best estimate
- If scope or home size affects cost significantly, factor it in
- For permits: add $150–$500 to materials_total if required`

    const userMsg = `Trade: ${trade}
Location zip: ${zip || 'not provided — use NC (28036) as default'}
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
      trade,
      zip: zip || '28036',
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
    return NextResponse.json({ error: 'Failed to generate quote' }, { status: 500 })
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
