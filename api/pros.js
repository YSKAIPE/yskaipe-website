export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { trade, zip } = req.query;
  const safeTrade = trade || "General Contractor";
  const safeZip = zip || "28036";

  const prompt = `You are a local contractor directory for the ${safeZip} NC area.

Return ONLY valid JSON, no markdown, no extra text.
Generate 4 realistic local ${safeTrade} businesses near ZIP ${safeZip} in North Carolina.
Use realistic NC business names, real-sounding addresses near that ZIP, realistic ratings and phone numbers.
Do NOT use generic names like "Local Pro" or "ABC Company".
Use real street names and cities near the ZIP code.

{
  "pros": [
    {
      "name": "realistic local business name",
      "address": "123 Real St, Davidson, NC 28036",
      "city": "Davidson",
      "rating": 4.7,
      "reviewCount": 43,
      "phone": "(704) 555-0182",
      "website": null,
      "specialty": "one line specialty description"
    }
  ]
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json();
    const raw = data.content?.find((b) => b.type === "text")?.text || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return res.status(200).json({ pros: parsed.pros || [], source: "ai" });
  } catch (e) {
    console.error("Pros error:", e);
    return res.status(200).json({ pros: [], source: "error" });
  }
}
