export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  const { query, ll, radius, limit } = req.query;
  const apiKey = process.env.FOURSQUARE_API_KEY;
  const url = `https://api.foursquare.com/v3/places/search?query=${query}&ll=${ll}&radius=${radius}&limit=${limit}&fields=fsq_id,name,location,tel,website,categories`;
  try {
    const r = await fetch(url, { headers: { 'Authorization': apiKey, 'Accept': 'application/json' } });
    const data = await r.json();
    return res.status(200).json(data);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
