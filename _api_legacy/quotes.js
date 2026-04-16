const RATES_DB = {
  'Plumber': { laborMin: 95, laborMax: 145, permitRequired: true, commonJobs: ['faucet repair', 'pipe replacement', 'water heater', 'drain unclog'] },
  'Electrician': { laborMin: 100, laborMax: 155, permitRequired: true, commonJobs: ['panel upgrade', 'outlet install', 'EV charger', 'light fixture'] },
  'HVAC Technician': { laborMin: 90, laborMax: 140, permitRequired: false, commonJobs: ['AC tune-up', 'furnace repair', 'duct cleaning', 'thermostat install'] },
  'Roofer': { laborMin: 80, laborMax: 130, permitRequired: false, commonJobs: ['shingle replacement', 'leak repair', 'full reroof', 'gutter install'] },
  'General Contractor': { laborMin: 85, laborMax: 135, permitRequired: true, commonJobs: ['kitchen remodel', 'bathroom remodel', 'addition', 'deck build'] },
  'Welder / Fabricator': { laborMin: 90, laborMax: 145, permitRequired: false, commonJobs: ['custom fabrication', 'structural weld', 'gate repair', 'railing install'] },
  'Home Inspector': { laborMin: 75, laborMax: 110, permitRequired: false, commonJobs: ['full home inspection', 'pre-listing inspection', 'radon test', 'mold inspection'] },
  'Pest Control': { laborMin: 60, laborMax: 100, permitRequired: false, commonJobs: ['termite treatment', 'rodent control', 'ant treatment', 'bed bug treatment'] },
  'Arborist': { laborMin: 80, laborMax: 125, permitRequired: false, commonJobs: ['tree removal', 'tree trimming', 'stump grinding', 'disease treatment'] },
  'EV Infrastructure Tech': { laborMin: 100, laborMax: 160, permitRequired: true, commonJobs: ['Level 2 charger install', 'panel upgrade for EV', 'fleet charging design'] },
  'Smart Home Integrator': { laborMin: 95, laborMax: 150, permitRequired: false, commonJobs: ['security system install', 'smart lighting setup', 'home automation'] },
  'Landscaper': { laborMin: 65, laborMax: 110, permitRequired: false, commonJobs: ['lawn care', 'garden design', 'sod install', 'irrigation'] },
  'Painter': { laborMin: 70, laborMax: 115, permitRequired: false, commonJobs: ['interior paint', 'exterior paint', 'cabinet painting', 'deck stain'] },
  'Flooring Specialist': { laborMin: 75, laborMax: 120, permitRequired: false, commonJobs: ['hardwood install', 'tile install', 'LVP install', 'carpet install'] },
  'Physical Therapist': { laborMin: 85, laborMax: 130, permitRequired: false, commonJobs: ['initial evaluation', 'manual therapy', 'home visit'] },
  'EMT / Paramedic': { laborMin: 90, laborMax: 140, permitRequired: true, commonJobs: ['event medical standby', 'transport', 'first responder'] },
  'Drone Ops Specialist': { laborMin: 85, laborMax: 135, permitRequired: true, commonJobs: ['roof inspection', 'construction survey', 'real estate photography'] },
}

function getMultiplier(zip) {
  if (!zip || zip.length < 3) return 1.0
  const p = parseInt(zip.substring(0, 3))
  if ((p >= 100 && p <= 119) || (p >= 70 && p <= 89)) return 1.45
  if (p >= 900 && p <= 961) return 1.35
  if ((p >= 10 && p <= 27) || (p >= 60 && p <= 69)) return 1.25
  if (p >= 970 && p <= 994) return 1.2
  if (p >= 750 && p <= 799) return 0.95
  if ((p >= 270 && p <= 289) || (p >= 290 && p <= 299)) return 1.0
  if (p >= 460 && p <= 499) return 0.92
  return 1.0
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { trade, zip, scope, description, customerName, customerEmail } = req.body

  if (!description) return res.status(400).json({ error: 'description is required' })

  const rates = RATES_DB[trade] || RATES_DB['General Contractor']
  const multiplier = getMultiplier(zip)
  const laborMin = Math.round(rates.laborMin * multiplier)
  const laborMax = Math.round(rates.laborMax * multiplier)

  const prompt = `You are YSKAIPE AutoQuote — a home services cost estimator using verified NC 2026 industry rates.

TRADE: ${trade || 'General Contractor'}
VERIFIED LABOR RATE: $${laborMin}–$${laborMax}/hr
PERMIT REQUIRED: ${rates.permitRequired ? 'Yes' : 'No'}
COMMON JOBS: ${rates.commonJobs.join(', ')}
ZIP: ${zip || '28036'}
SCOPE: ${scope || 'residential'}
JOB: ${description}

Return ONLY valid JSON, no markdown, no extra text:
{
  "labor_hours": number,
  "labor_rate": number,
  "labor_total": number,
  "materials_total": number,
  "grand_total": number,
  "complexity": "simple" or "moderate" or "complex",
  "time_estimate": "string",
  "breakdown": "2-3 sentence plain English explanation",
  "materials_list": ["item1", "item2"],
  "notes": "caveats or empty string",
  "diy_feasible": true or false,
  "diy_savings_low": number,
  "diy_savings_high": number,
  "difficulty_score": number 1-10,
  "difficulty_label": "Easy" or "Moderate" or "Hard" or "Expert Only",
  "diy_warning": "safety warning or empty string",
  "diy_steps": "numbered step-by-step instructions as single string",
  "diy_materials": [{"name": "product name", "qty": "amount", "estimatedCost": "$X"}],
  "pro_recommendation": "2-3 sentences",
  "pro_keywords": ["keyword1", "keyword2"]
}`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json()
    const raw = data.content?.find(b => b.type === 'text')?.text || ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return res.status(200).json({ quote: { ...parsed, trade, zip, scope, description, customerName, customerEmail } })
  } catch (e) {
    console.error('Quote error:', e)
    return res.status(500).json({ error: 'Failed to generate quote' })
  }
}
