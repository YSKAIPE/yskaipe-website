const TRADE_TO_OSM = {
  'Plumber': 'plumber',
  'Electrician': 'electrician',
  'HVAC Technician': 'hvac',
  'Roofer': 'roofing',
  'General Contractor': 'contractor',
  'Landscaper': 'landscaping',
  'Painter': 'painter',
  'Flooring Specialist': 'flooring',
  'Pest Control': 'pest_control',
  'Home Inspector': 'inspector',
  'Arborist': 'tree_service',
  'Smart Home Integrator': 'electrician',
  'EV Infrastructure Tech': 'electrician',
  'Welder / Fabricator': 'welder',
  'Physical Therapist': 'physiotherapist',
  'EMT / Paramedic': 'ambulance',
  'Drone Ops Specialist': 'surveyor',
}

function searchFallback(trade, zip) {
  const q = encodeURIComponent(`${trade} contractor near ${zip} NC`)
  return [
    { name: 'Search Google for local pros', address: `${zip} area, NC`, phone: null, website: `https://www.google.com/search?q=${q}`, isSearch: true },
    { name: 'Find on Angi', address: `${zip} area, NC`, phone: null, website: `https://www.angi.com/search?q=${encodeURIComponent(trade)}&zip=${zip}`, isSearch: true },
    { name: 'Find on Thumbtack', address: `${zip} area, NC`, phone: null, website: `https://www.thumbtack.com/search?q=${encodeURIComponent(trade)}&zip=${zip}`, isSearch: true },
    { name: 'Find on HomeAdvisor', address: `${zip} area, NC`, phone: null, website: `https://www.homeadvisor.com/c.${encodeURIComponent(trade)}.${zip}.html`, isSearch: true },
  ]
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()

  const { trade, zip } = req.query
  const searchTerm = TRADE_TO_OSM[trade] || 'contractor'
  const safeZip = zip || '28036'

  try {
    // Step 1: Geocode ZIP to lat/lon
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${safeZip}&country=US&format=json&limit=1`,
      { headers: { 'User-Agent': 'yskaipe.com contact@yskaipe.com' } }
    )
    const geoData = await geoRes.json()

    if (!geoData || !geoData.length) {
      return res.status(200).json({ pros: searchFallback(trade, safeZip) })
    }

    const lat = parseFloat(geoData[0].lat)
    const lon = parseFloat(geoData[0].lon)
    const radius = 24000 // ~15 miles

    // Step 2: Query Overpass API
    const query = `[out:json][timeout:15];(node["shop"="${searchTerm}"](around:${radius},${lat},${lon});node["craft"="${searchTerm}"](around:${radius},${lat},${lon});node["amenity"="${searchTerm}"](around:${radius},${lat},${lon}););out body 6;`

    const overpassRes = await fetch(
      `https://overpass-api.de/api/interpreter`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`
      }
    )

    const text = await overpassRes.text()
    let elements = []

    try {
      const overpassData = JSON.parse(text)
      elements = overpassData.elements || []
    } catch(e) {
      console.error('Overpass parse error:', text.substring(0, 200))
      return res.status(200).json({ pros: searchFallback(trade, safeZip) })
    }

    if (!elements.length) {
      return res.status(200).json({ pros: searchFallback(trade, safeZip) })
    }

    const pros = elements.slice(0, 4).map(e => ({
      name: e.tags?.name || 'Local Pro',
      address: [
        e.tags?.['addr:housenumber'],
        e.tags?.['addr:street'],
        e.tags?.['addr:city'] || 'NC'
      ].filter(Boolean).join(' '),
      city: e.tags?.['addr:city'] || '',
      rating: null,
      phone: e.tags?.phone || e.tags?.['contact:phone'] || null,
      website: e.tags?.website || e.tags?.['contact:website'] || null,
      verified: false,
      isSearch: false,
    }))

    return res.status(200).json({ pros })

  } catch (e) {
    console.error('Pros error:', e)
    return res.status(200).json({ pros: searchFallback(trade, safeZip) })
  }
}
