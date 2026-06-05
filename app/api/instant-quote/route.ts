// app/api/instant-quote/route.ts
// Receives free-text job description from instant-quote.html
// Uses Claude to classify the job against our service categories
// Returns: category, FRI low/high range, breakdown text, includes list

import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const { description, zip, scope, categories } = await req.json()

    if (!description || !zip || !categories?.length) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 })
    }

    const categoryList = categories
      .map((c: { slug: string; label: string; low: number; high: number }) =>
        `- slug: ${c.slug} | label: ${c.label} | low: $${c.low} | high: $${c.high}`
      )
      .join('\n')

    const prompt = `You are the YSKAIPE Fair Rate Index engine. A homeowner has described a home service job in plain English. Your job is to:

1. Classify the job into exactly ONE of the provided service categories
2. Return the FRI price range for that category (adjusted slightly for the ZIP code region if relevant)
3. Write a 1-2 sentence breakdown explaining what the quote covers
4. List 3-5 specific things included in this job

Homeowner's description: "${description}"
ZIP code: ${zip}
${scope ? `Size/scope context: ${scope}` : ''}

Available service categories:
${categoryList}

Respond ONLY with valid JSON in this exact format (no markdown, no preamble):
{
  "category": "Human-readable category label",
  "slug": "category_slug",
  "low": 000,
  "high": 000,
  "breakdown": "One or two sentences explaining what this quote covers and why the range exists.",
  "includes": ["Item 1", "Item 2", "Item 3", "Item 4"],
  "zip_adjusted": true,
  "confidence": "high" | "medium" | "low"
}

Rules:
- Pick the single best matching category. If the job spans multiple categories, pick the primary one.
- Low and high must be integers from the category range (you may adjust ±15% for scope or complexity signals in the description)
- breakdown should be specific to what the homeowner described, not generic
- includes should be specific to the described job
- If confidence is low, still return your best match — never return an error
- If truly no category fits well, use general_labor (slug: general_labor)`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')
      .trim()

    // Strip any accidental markdown fences
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    const parsed = JSON.parse(clean)

    // Validate required fields
    if (!parsed.category || !parsed.low || !parsed.high) {
      throw new Error('Invalid response structure from AI')
    }

    return NextResponse.json(parsed, { status: 200 })

  } catch (err) {
    console.error('[instant-quote] Error:', err)
    // Return 500 — the frontend has a client-side fallback classifier
    return NextResponse.json(
      { error: 'Quote generation failed — using fallback classifier.' },
      { status: 500 }
    )
  }
}
