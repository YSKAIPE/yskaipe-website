const Anthropic = require('@anthropic-ai/sdk')
const { createClient } = require('@supabase/supabase-js')

const RATES_DB = {
  'Plumber': { laborMin: 95, laborMax: 145, commonJobs: ['faucet repair', 'pipe replacement', 'water heater', 'drain unclog', 'shutoff valve'], permitRequired: true },
  'Electrician': { laborMin: 100, laborMax: 155, commonJobs: ['panel upgrade', 'outlet install', 'EV charger', 'light fixture', 'circuit breaker'], permitRequired: true },
  'HVAC Technician': { laborMin: 90, laborMax: 140, commonJobs: ['AC tune-up', 'furnace repair', 'duct cleaning', 'thermostat install', 'refrigerant recharge'], permitRequired: false },
  'Roofer': { laborMin: 80, laborMax: 130, commonJobs: ['shingle replacement', 'leak repair', 'full reroof', 'gutter install', 'storm damage'], permitRequired: false },
  'General Contractor': { laborMin: 85, laborMax: 135, commonJobs: ['kitchen remodel', 'bathroom remodel', 'addition', 'deck build', 'basement finish'], permitRequired: true },
  'Welder / Fabricator': { laborMin: 90, laborMax: 145, commonJobs: ['custom fabrication', 'structural weld', 'gate repair', 'railing install', 'trailer repair'], permitRequired: false },
  'Home Inspector': { laborMin: 75, laborMax: 110, commonJobs: ['full home inspection', 'pre-listing inspection', 'radon test', 'mold inspection', '4-point inspection'], permitRequired: false },
  'Pest Control': { laborMin: 60, laborMax: 100, commonJobs: ['termite treatment', 'rodent control', 'ant treatment', 'bed bug treatment', 'preventive spray'], permitRequired: false },
  'Arborist': { laborMin: 80, laborMax: 125, commonJobs: ['tree removal', 'tree trimming', 'stump grinding', 'disease treatment', 'emergency storm cleanup'], permitRequired: false },
  'EV Infrastructure Tech': { laborMin: 100, laborMax: 160, commonJobs: ['Level 2 charger install', 'panel upgrade for EV', 'fleet charging design', 'permit filing', 'load calc'], permitRequired: true },
  'Physical Therapist': { laborMin: 85, laborMax: 130, commonJobs: ['initial evaluation', 'manual therapy', 'home visit', 'post-surgery rehab', 'sports injury'], permitRequired: false },
  'EMT / Paramedic': { laborMin: 90, laborMax: 140, commonJobs: ['event medical standby', 'transport', 'first responder', 'training', 'consultation'], permitRequired: true },
  'Drone Ops Specialist': { laborMin: 85, laborMax: 135, commonJobs: ['roof inspection', 'construction survey', 'agricultural mapping', 'real estate photography', 'infrastructure inspection'], permitRequired: true },
  'Smart Home Integrator': { laborMin: 95, laborMax: 150, commonJobs: ['security system install', 'smart lighting setup', 'home automation', 'network setup', 'AV install'], permitRequired: false },
}

function getRegionalMultiplier(zip) {
  if (!zip || zip.length < 3) return 1.0
  const prefix = parseInt(zip.substring(0, 3))
  if ((prefix >= 100 && prefix <= 119) || (prefix >= 70 && prefix <= 89)) return 1.45
  if (prefix >= 900 && prefix <= 961) return 1.35
  if ((prefix >= 10 && prefix <= 27) || (prefix >= 60 && prefix <= 69)) return 1.25
  if (prefix >= 970 && prefix <= 994) return 1.2
  if (prefix >= 750 && prefix <= 799) return 0.95
  if ((prefix >= 270 && prefix <= 289) || (prefix >= 290 && prefix <= 299)) return 1.0
  if (prefix >= 460 && prefix <= 499) return 0.92
  return 1.0
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { trade, zip, scope, description, customerName, customerEmail } = req.body

    if (!trade || !description) {
      return res.status(400).json({ error: 'trade and description are required' })
    }

    const rates = RATES_DB[trade]
    if (!rates) {
      return res.status(400).json({ error: 'Unknown trade type' })
    }

    const multiplier = getRegionalMultiplier(zip)
    const adjustedLaborMin = Math.round(rates.laborMin * multiplier)
    const adjustedLaborMax = Math.round(rates.laborMax * multiplier)

    const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY })

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
- labor_total = labor_hours * labor_rate
- grand_total = labor_total + materials_total
- Be specific and realistic — not a range, a single best estimate
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
      .map((b) => b.text)
      .join('')
      .replace(/```json|```/g, '')
      .trim()

    const parsed = JSON.parse(rawText)

    const quote = {
      trade,
      zip: zip || '28036',
      scope,
      description,
      customerName,
      customerEmail,
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
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      )
      const { data, error } = await supabase
        .from('quotes')
        .insert({
          trade: quote.trade,
          zip: quote.zip,
          scope: quote.scope,
          description: quote.description,
          customer_name: quote.customerName,
          customer_email: quote.customerEmail,
          labor_hours: quote.labor_hours,
          labor_rate: quote.labor_rate,
          labor_total: quote.labor_total,
          materials_total: quote.materials_total,
          grand_total: quote.grand_total,
          complexity: quote.complexity,
          time_estimate: quote.time_estimate,
          breakdown: quote.breakdown,
          materials_list: quote.materials_list,
          notes: quote.notes,
        })
        .select('id')
        .single()

      if (!error && data?.id) {
        quote.id = data.id
      }
    } catch (dbErr) {
      console.error('Supabase error (non-fatal):', dbErr)
    }

    return res.status(200).json({ quote })
  } catch (err) {
    console.error('Quote generation error:', err)
    return res.status(500).json({ error: 'Failed to generate quote' })
  }
}
