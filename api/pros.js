export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { trade, zip } = req.query;

  const TRADE_TO_OSM = {
    Plumber: "plumber",
    Electrician: "electrician",
    "HVAC Technician": "hvac",
    Roofer: "roofing",
    "General Contractor": "contractor",
    Landscaper: "landscaping",
    Painter: "painter",
    "Flooring Specialist": "flooring",
    "Pest Control": "pest_control",
    "Home Inspector": "inspector",
    Arborist: "tree_service",
    "Smart Home Integrator": "electrician",
    "EV Infrastructure Tech": "electrician",
  };

  const searchTerm = TRADE_TO_OSM[trade] || "contractor";

  try {
    // First geocode the ZIP to get lat/lon
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${zip || "28036"}&country=US&format=json&limit=1`,
      { headers: { "User-Agent": "yskaipe.com/1.0" } },
    );
    const geoData = await geoRes.json();

    if (!geoData.length) {
      return res.status(200).json({ pros: [] });
    }

    const lat = parseFloat(geoData[0].lat);
    const lon = parseFloat(geoData[0].lon);
    const radius = 16000; // 10 miles in meters

    // Query Overpass for businesses
    const overpassQuery = `
      [out:json][timeout:10];
      (
        node["shop"="${searchTerm}"](around:${radius},${lat},${lon});
        node["craft"="${searchTerm}"](around:${radius},${lat},${lon});
        node["office"="company"]["name"~"${searchTerm}",i](around:${radius},${lat},${lon});
      );
      out body 4;
    `;

    const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: overpassQuery,
      headers: { "Content-Type": "text/plain" },
    });

    const overpassData = await overpassRes.json();
    const elements = overpassData.elements || [];

    const pros = elements.slice(0, 4).map((e) => ({
      name: e.tags?.name || "Local Pro",
      address:
        [
          e.tags?.["addr:housenumber"],
          e.tags?.["addr:street"],
          e.tags?.["addr:city"],
        ]
          .filter(Boolean)
          .join(" ") || "",
      city: e.tags?.["addr:city"] || "",
      rating: null,
      phone: e.tags?.phone || e.tags?.["contact:phone"] || null,
      website: e.tags?.website || e.tags?.["contact:website"] || null,
      verified: false,
    }));

    // If no OSM results, fall back to search links
    if (!pros.length) {
      const q = encodeURIComponent(`${trade} contractor near ${zip} NC`);
      return res.status(200).json({
        pros: [
          {
            name: "Search Google for local pros",
            address: `${zip} area, NC`,
            phone: null,
            website: `https://www.google.com/search?q=${q}`,
            isSearch: true,
          },
          {
            name: "Find on Angi",
            address: `${zip} area, NC`,
            phone: null,
            website: `https://www.angi.com/search?q=${encodeURIComponent(trade)}&zip=${zip}`,
            isSearch: true,
          },
          {
            name: "Find on Thumbtack",
            address: `${zip} area, NC`,
            phone: null,
            website: `https://www.thumbtack.com/search?q=${encodeURIComponent(trade)}&zip=${zip}`,
            isSearch: true,
          },
        ],
      });
    }

    return res.status(200).json({ pros });
  } catch (e) {
    console.error("Pros error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}
