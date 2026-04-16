const Anthropic = require('@anthropic-ai/sdk')

const RETAILER_SEARCH = {
  'Home Depot': 'https://www.homedepot.com/s/',
  'Lowes': 'https://www.lowes.com/search?searchTerm=',
  'Grainger': 'https://www.grainger.com/search?searchQuery=',
  'Amazon': 'https://www.amazon.com/s?k=',
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  try {
    const { quote } = req.body
    if (!quote) return res.status(400).json({ error: 'quote is required' })
    const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY })
    const systemPrompt = `You are an expert DIY advisor. Given a professional trade quote, assess if it can be DIY'd and provide a complete guide. Return ONLY valid JSON with these fields: difficulty ("Easy"|"Medium"|"Hard"|"Don't try this"), difficulty_reason, diy_possible (bool), diy_not_recommended_reason, time_estimate, skill_requirements (array), tools_needed (array), materials (array of {name, search_term, estimated_cost, notes}), steps_overview (array of strings), safety_warnings (array), permit_required (bool), permit_note, diy_cost_estimate (number), pro_cost (number), savings (number), when_to_call_pro. No markdown.`
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Trade: ${quote.trade}\nJob: ${quote.description}\nScope: ${quote.scope||'not specified'}\nPro quote: $${quote.grand_total}\nMaterials: ${(quote.materials_list||[]).join(', ')}\nComplexity: ${quote.complexity}` }],
    })
    const rawText = message.content.filter(b=>b.type==='text').map(b=>b.text).join('').replace(/```json|```/g,'').trim()
    const diy = JSON.parse(rawText)
    diy.materials = (diy.materials||[]).map(m=>({...m,retailers:Object.entries(RETAILER_SEARCH).map(([name,base])=>({name,url:base+encodeURIComponent(m.search_term||m.name)}))}))
    return res.status(200).json({ diy })
  } catch (err) {
    console.error('DIY error:', err)
    return res.status(500).json({ error: 'Failed to generate DIY guide' })
  }
}
