import { NextRequest, NextResponse } from "next/server";

const TRADE_TO_QUERY: Record<string, string> = {
  Plumber: "plumber",
  Electrician: "electrician",
  "HVAC Technician": "hvac contractor",
  Roofer: "roofing contractor",
  "General Contractor": "general contractor",
  "Welder / Fabricator": "welder fabricator",
  "Home Inspector": "home inspector",
  "Pest Control": "pest control",
  Arborist: "tree service arborist",
  "EV Infrastructure Tech": "EV charger installer",
  "Smart Home Integrator": "smart home installer",
  Landscaper: "landscaping",
  Painter: "house painter",
  "Flooring Specialist": "flooring contractor",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const trade = searchParams.get("trade") || "General Contractor";
  const zip = searchParams.get("zip") || "28036";

  const apiKey = process.env.FOURSQUARE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Foursquare API key not configured" },
      { status: 500 },
    );
  }

  const query = TRADE_TO_QUERY[trade] || trade;

  try {
    const url = new URL("https://api.foursquare.com/v3/places/search");
    url.searchParams.set("query", query);
    url.searchParams.set("near", `${zip}, NC`);
    url.searchParams.set("limit", "4");
    url.searchParams.set("sort", "RATING");
    url.searchParams.set(
      "fields",
      "name,location,rating,stats,tel,website,verified,link,hours_popular",
    );

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: apiKey,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Foursquare error:", err);
      return NextResponse.json(
        { error: "Failed to fetch pros" },
        { status: 500 },
      );
    }

    const data = await res.json();
    const results = data.results || [];

    const pros = results.map((p: any) => ({
      name: p.name || "Local Pro",
      address: p.location?.formatted_address || p.location?.address || "",
      city: p.location?.locality || p.location?.region || "",
      rating: p.rating ? Number((p.rating / 2).toFixed(1)) : null,
      reviewCount: p.stats?.total_ratings || null,
      phone: p.tel || null,
      website: p.website || null,
      verified: p.verified || false,
      profileUrl: p.link ? `https://foursquare.com${p.link}` : null,
    }));

    return NextResponse.json({ pros });
  } catch (err) {
    console.error("Pros route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
