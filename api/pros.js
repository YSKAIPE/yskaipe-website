const TRADE_TO_QUERY = {
  Plumber: "plumber plumbing",
  Electrician: "electrician electrical",
  "HVAC Technician": "hvac heating cooling air conditioning",
  Roofer: "roofing contractor",
  "General Contractor": "general contractor construction",
  "Welder / Fabricator": "welding fabrication",
  "Home Inspector": "home inspection inspector",
  "Pest Control": "pest control exterminator",
  Arborist: "tree service arborist",
  "EV Infrastructure Tech": "electrician EV charger",
  "Smart Home Integrator": "smart home automation electrician",
  Landscaper: "landscaping lawn service",
  Painter: "painting contractor painter",
  "Flooring Specialist": "flooring hardwood tile",
  "Physical Therapist": "physical therapy",
  "EMT / Paramedic": "emergency medical",
  "Drone Ops Specialist": "drone aerial survey",
};

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { trade, zip } = req.query;
  const apiKey = process.env.FOURSQUARE_API_KEY;
  const safeZip = zip || "28036";
  const query = TRADE_TO_QUERY[trade] || trade || "contractor";

  if (!apiKey)
    return res.status(500).json({ error: "Foursquare API key not configured" });

  try {
    // Step 1: Geocode ZIP to lat/lon
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${safeZip}&country=US&format=json&limit=1`,
      { headers: { "User-Agent": "yskaipe.com contact@yskaipe.com" } },
    );
    const geoData = await geoRes.json();

    if (!geoData || !geoData.length) {
      return res.status(200).json({ pros: [] });
    }

    const lat = parseFloat(geoData[0].lat);
    const lon = parseFloat(geoData[0].lon);

    // Step 2: Search Foursquare new Places API
    const url = `https://places-api.foursquare.com/places/search?query=${encodeURIComponent(query)}&ll=${lat},${lon}&limit=4`;

    const fsqRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "X-Places-Api-Version": "2025-06-17",
        Accept: "application/json",
      },
    });

    if (!fsqRes.ok) {
      const err = await fsqRes.text();
      console.error("Foursquare error:", err);
      return res.status(200).json({ pros: [] });
    }

    const data = await fsqRes.json();
    const results = data.results || [];

    const pros = results.map((p) => ({
      name: p.name || "Local Pro",
      address: p.location?.formatted_address || p.location?.address || "",
      city: p.location?.locality || "",
      rating: null,
      phone: p.tel || null,
      website: p.website || null,
      verified: true,
      profileUrl: p.link ? `https://foursquare.com${p.link}` : null,
      category: p.categories?.[0]?.name || trade,
    }));

    return res.status(200).json({ pros });
  } catch (e) {
    console.error("Pros error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}
