# YSKAIPE AutoQuote — Full Stack Setup Guide

## What's in this folder

```
app/api/
  quotes/route.ts        ← Main API: Claude AI + Supabase save
  email-quote/route.ts   ← Email delivery via Resend
  export-pdf/route.ts    ← PDF generation via @react-pdf/renderer

components/
  QuotePDF.tsx           ← Branded PDF layout component

lib/
  rates.ts               ← Trade rates database + regional multipliers
  supabase.ts            ← Supabase client + SQL schema + helpers

types/
  quote.ts               ← TypeScript types

public/
  autoquote.html         ← Production AutoQuote page (replaces old one)

.env.example             ← All required environment variables
```

---

## Step 1 — Install dependencies

In your `yskaipe-website` root:

```bash
pnpm add @anthropic-ai/sdk @supabase/supabase-js resend @react-pdf/renderer
pnpm add -D @types/react-pdf
```

---

## Step 2 — Set up Supabase

1. Go to [supabase.com](https://supabase.com) → create a new project
2. Open the SQL editor and run the SQL in `lib/supabase.ts` (the commented block at the top)
3. Copy your project URL and service role key from Settings → API

---

## Step 3 — Set up Resend (email)

1. Go to [resend.com](https://resend.com) → create account → get API key
2. Add your domain at resend.com/domains → add the DNS records to your domain registrar
3. Once verified, update the `from` field in `app/api/email-quote/route.ts`:
   ```
   from: 'YSKAIPE AutoQuote <quotes@yskaipe.com>'
   ```

---

## Step 4 — Add environment variables

**Locally** — create `.env.local` in your project root (copy from `.env.example`):

```bash
cp .env.example .env.local
# then fill in your actual keys
```

**On Vercel** — go to your project → Settings → Environment Variables → add each key:
- `ANTHROPIC_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `RESEND_API_KEY`

---

## Step 5 — Copy files into your project

Copy everything from this folder into your `yskaipe-website` repo, then:

```bash
git add .
git commit -m "Add AutoQuote full stack: API routes, Supabase, email, PDF"
git pull --rebase origin master
git push
```

Vercel will auto-deploy. The AutoQuote page at `/autoquote` will be fully live.

---

## How it all connects

```
User fills form on autoquote.html
  → POST /api/quotes
      → Claude AI parses job + rates database
      → Supabase saves quote
      → Returns quote object to browser

User clicks "Email quote"
  → POST /api/email-quote
      → Resend sends branded HTML email

User clicks "Export PDF"
  → POST /api/export-pdf
      → @react-pdf/renderer generates branded PDF
      → Browser downloads file
```

---

## Adding more trades

Edit `lib/rates.ts` — add a new entry to `RATES_DB` and the `TradeType` union in `types/quote.ts`.
Then add the option to the `<select>` in `public/autoquote.html`.
