# YSKAIPE · Home Services Market Intelligence
### pronounced "escape" · [yskaipe.com](https://www.yskaipe.com) · [@yskaipe](https://x.com/yskaipe)

> **Fair Price. Smart Choice. Everybody Wins.**

The home services market works best when everyone knows the fair rate. Homeowners stop overpaying. Good contractors stop losing to lowballers. DIY-able jobs get done right. Complex jobs go to the pros who deserve them.

YSKAIPE is market intelligence for the rest of us — the number that levels the field for everyone at the table.

---

## What It Does

**YSKAIPE AutoQuote** gives homeowners an instant, AI-powered standard cost estimate for any home services job — labor, materials, timeline, and complexity — in about 8 seconds. No signup. No sales calls. No BS.

After the quote, users choose their path:

- 🔧 **DIY** — step-by-step instructions, difficulty rating, materials list with Amazon / Home Depot / Lowe's shopping links
- 📞 **Find a Pro** — real local contractor data powered by Foursquare Places API
- 📄 **Export PDF** — print-ready formatted quote
- ✉️ **Email Quote** — formatted breakdown sent via Resend

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Vanilla HTML/CSS/JS — single `index.html` |
| AI Engine | Claude Sonnet (Anthropic API) |
| Pro Data | Foursquare Places API v3 |
| Email | Resend |
| Serverless Functions | Vercel (Node.js) |
| Database | Supabase (quote storage) |
| Deployment | Vercel + GitHub |
| Domain | yskaipe.com via Cloudflare |

---

## Live Features (Beta · March 2026)

- ✅ AutoQuote — AI-powered instant cost estimate (labor + materials)
- ✅ DIY Panel — difficulty score, step-by-step instructions, shop materials
- ✅ Pro Panel — real local contractor data via Foursquare Places API
- ✅ PDF Export — print-ready quote with DIY instructions
- ✅ Email Quote — formatted breakdown to any inbox
- ✅ NC 2026 verified rates — regional labor rate adjustments
- ✅ 14 trade types supported
- 🔜 Pro Dashboard — contractor profiles and program
- 🔜 Pro Program — verified pro network enrollment
- 🔜 Market Intelligence Reports

---

## Supported Trades

Plumber · Electrician · HVAC Technician · Roofer · General Contractor · Welder / Fabricator · Home Inspector · Pest Control · Arborist · EV Infrastructure Tech · Smart Home Integrator · Landscaper · Painter · Flooring Specialist

---

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/quotes` | POST | Generate AI quote with DIY + Pro fields |
| `/api/pros` | GET | Fetch local contractors via Foursquare |
| `/api/email` | POST | Send formatted quote via Resend |

---

## Environment Variables

```bash
ANTHROPIC_API_KEY=        # Claude API key
FOURSQUARE_API_KEY=       # Foursquare Places API v3 key
RESEND_API_KEY=           # Resend email API key
NEXT_PUBLIC_SUPABASE_URL= # Supabase project URL
SUPABASE_SERVICE_KEY=     # Supabase service role key
```

---

## The Vision

YSKAIPE exists because the home services market is broken — not for lack of good contractors, but for lack of shared information. A homeowner with no reference point pays whatever they're told. A good contractor loses jobs to lowballers because the customer can't tell the difference.

**Transparency fixes this.** When everyone at the table knows the fair rate:
- Homeowners make informed decisions
- Quality contractors win on merit
- DIY-able jobs get done right
- Complex jobs go to the pros who deserve them

This is market intelligence for the rest of us.

---

## Status

🟢 **Live Beta** — [yskaipe.com](https://www.yskaipe.com)

Built in public. Follow the build: [@yskaipe](https://x.com/yskaipe)

---

## License

© 2026 YSKAIPE · Based on verified NC 2026 industry standards · Human Hands. AI Power.
