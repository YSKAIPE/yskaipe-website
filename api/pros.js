const TRADE_TO_QUERY = {
  'Plumber': 'plumber',
  'Electrician': 'electrician',
  'HVAC Technician': 'hvac contractor',
  'Roofer': 'roofing contractor',
  'General Contractor': 'general contractor',
  'Welder / Fabricator': 'welder fabricator',
  'Home Inspector': 'home inspector',
  'Pest Control': 'pest control',
  'Arborist': 'tree service',
  'EV Infrastructure Tech': 'EV charger installer',
  'Smart Home Integrator': 'smart home installer',
  'Landscaper': 'landscaping',
  'Painter': 'house painter',
  'Flooring Specialist': 'flooring contractor',
  'Physical Therapist': 'physical therapist',
  'EMT / Paramedic': 'emergency medical',
  'Drone Ops Specialist': 'drone services',
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { trade, zip } = req.query
  const apiKey = process.env.FOURSQUARE_API_KEY

  if (!apiKey) return res.status(500).json({ error: 'Foursquare API key not configured' })

  const query = TRADE_TO_QUERY[trade] || trade || 'contractor'
  const location = zip ? `${zip}, NC` : 'Davidson, NC'

  try {
    const url = new URL('https://api.foursquare.com/v3/places/search')
    url.searchParams.set('query', query)
    url.searchParams.set('near', location)
    url.searchParams.set('limit', '4')
    url.searchParams.set('sort', 'RATING')
    url.searchParams.set('fields', 'name,location,rating,stats,tel,website,verified,link')

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': apiKey,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Foursquare error:', err)
      return res.status(500).json({ error: 'Failed to fetch pros' })
    }

    const data = await response.json()
    const pros = (data.results || []).map(p => ({
      name: p.name || 'Local Pro',
      address: p.location?.formatted_address || p.location?.address || '',
      city: p.location?.locality || '',
      rating: p.rating ? Number((p.rating / 2).toFixed(1)) : null,
      reviewCount: p.stats?.total_ratings || null,
      phone: p.tel || null,
      website: p.website || null,
      verified: p.verified || false,
      profileUrl: p.link ? `https://foursquare.com${p.link}` : null,
    }))

    return res.status(200).json({ pros })
  } catch (e) {
    console.error('Pros error:', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
