# YSKAIPE — Human Hands. AI Power.

> The future belongs to people who can't be replaced.

YSKAIPE is a platform built for skilled trade professionals and physical-world operators — plumbers, electricians, builders, healthcare workers, and more — who want to leverage AI without being replaced by it. The moat is presence, trust, and accountability. AI sharpens it.

---

## What This Is

A Next.js website for [yskaipe.com](https://www.yskaipe.com) — built to educate, onboard, and equip skilled professionals with the exact AI tools and workflows for their field. Not generic. Not overwhelming. Exactly what the job needs.

Key pages include:

- **Home** — The manifesto. The moat. The archetypes.
- **AutoQuote** — AI-powered instant standard cost estimator for trade professionals. Describe the job, get a transparent labor + materials breakdown in seconds.
- **Sectors** — Role-by-role AI augmentation playbooks across trades, healthcare, infrastructure, food systems, and emerging physical-digital hybrids.
- **Pitch / Roadmap / Build Log** — The story of how YSKAIPE is being built in public.

---

## Tech Stack

- [Next.js](https://nextjs.org/) (App Router)
- [Tailwind CSS](https://tailwindcss.com/)
- TypeScript
- Deployed on [Vercel](https://vercel.com)

---

## Getting Started
```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the site.

---

## Project Structure
```
app/          # Next.js App Router pages
components/   # Shared UI components
public/       # Static HTML pages (AutoQuote, sectors, etc.)
utils/        # Utility functions
```

HTML pages in `public/` are served via rewrites configured in `next.config.js`.

---

## Deploying

Push to `master` — Vercel auto-deploys.
```bash
git add .
git commit -m "your message"
git pull --rebase origin master
git push
```

---

## About

YSKAIPE — EST. 2025  
Human hands. AI power. The moat holds.  
[hello@yskaipe.com](mailto:hello@yskaipe.com)
