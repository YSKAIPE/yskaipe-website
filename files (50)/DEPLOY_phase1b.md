# Phase 1b Deploy — Service Tasks Integration

## What this does

Replaces the hardcoded `lib/canonical-trades.ts` + `lib/rates.ts` with
a single `service_tasks` Supabase table as canonical source of truth.
All 68 task types (home, auto, life) with tier gating, license flags,
FRI pricing, and AI keywords now live in the DB — not in code.

## Files

| File | Destination | Action |
|---|---|---|
| `service-tasks.ts` | `lib/service-tasks.ts` | New file |
| `instant-quote-route.ts` | `app/api/instant-quote/route.ts` | Replace existing |
| `instant-quote-book-route.ts` | `app/api/instant-quote-book/route.ts` | Replace existing |
| `match-route.ts` | `app/api/match/route.ts` | Replace existing |

## Prerequisites

Phase 1b migration SQL must be deployed first.
Verify in Supabase: Table Editor → service_tasks → should have 68+ rows.

## Step-by-step

### 1. Copy files into the repo

```
cp service-tasks.ts /path/to/yskaipe-website/lib/service-tasks.ts
cp instant-quote-route.ts /path/to/yskaipe-website/app/api/instant-quote/route.ts
cp instant-quote-book-route.ts /path/to/yskaipe-website/app/api/instant-quote-book/route.ts
cp match-route.ts /path/to/yskaipe-website/app/api/match/route.ts
```

### 2. Add task_slug column to jobs table

Run this in Supabase SQL Editor (adds columns the new booking route writes):

```sql
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS task_slug       text,
  ADD COLUMN IF NOT EXISTS task_label      text,
  ADD COLUMN IF NOT EXISTS task_category   text,
  ADD COLUMN IF NOT EXISTS domain          text,
  ADD COLUMN IF NOT EXISTS tier_min        text,
  ADD COLUMN IF NOT EXISTS requires_license boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS permit_likely   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirm_number  text,
  ADD COLUMN IF NOT EXISTS zip_code        text,
  ADD COLUMN IF NOT EXISTS timing          text,
  ADD COLUMN IF NOT EXISTS fri_low         numeric,
  ADD COLUMN IF NOT EXISTS fri_high        numeric,
  ADD COLUMN IF NOT EXISTS fri_unit        text;
```

### 3. Add task_slug to job_claims table

```sql
ALTER TABLE job_claims
  ADD COLUMN IF NOT EXISTS task_slug text;
```

### 4. Commit and push

```
git add lib/service-tasks.ts
git add app/api/instant-quote/route.ts
git add app/api/instant-quote-book/route.ts
git add app/api/match/route.ts
git commit -m "Phase 1b: service_tasks as canonical source of truth, tier-gated dispatch"
git push origin master
```

### 5. Smoke test

After Vercel deploys (~60s):

a. Open `yskaipe.com/instant-quote.html`
b. Type: "my grass needs mowing, backyard is a jungle"
c. Should classify as `land_lawn_mow`, show Youth-ok, $40–$90
d. Type: "replace my electrical panel, it's 100 amp needs 200"
e. Should classify as `elec_panel_upgrade`, show Licensed required, $1,200–$3,500
f. Complete a booking on (c) — check gr8@yskaipe.com for admin alert showing tier_min=youth

### 6. What to watch for

- TypeScript errors: lib/service-tasks.ts exports WorkerTier — if any existing file
  imports from canonical-trades.ts, update those imports to service-tasks.ts
- The old `normalizeTrade()` function is gone — if match.html or autoquote.html
  call it directly, those can stay working (8 legacy slugs still exist in service_tasks)

## What's NOT changed yet

- `lib/canonical-trades.ts` — leave it in place for now. Other old pages may
  still import from it. It won't conflict. Remove it in a cleanup pass later.
- `lib/rates.ts` — still referenced by the old `/api/quotes` route (autoquote.html).
  Leave in place. The new instant-quote route no longer uses it.
- Payment capture (Phase 2) — booking route has TODO comment for Stripe hook
- Worker dispatch broadcast (Phase 3) — match route has TODO comment for job-notify

## Architecture after this deploy

```
Homeowner types description
        ↓
/api/instant-quote
  → getAllTasks() [Supabase, cached 5min]
  → Claude classifies → slug
  → task = service_tasks[slug]
  → Claude writes breakdown using task.fri_low/high
  → returns: slug, tier_min, requires_license, fri range, breakdown
        ↓
Homeowner sees quote, fills contact form
        ↓
/api/instant-quote-book
  → getTaskBySlug(slug) — re-verifies from DB
  → writes jobs row with tier_min, task_slug, etc.
  → sends admin + homeowner emails
  → [Phase 3] calls /api/match
        ↓
/api/match
  → requires_license=true  → PATH A: contractors table
  → tier_min=primary/youth → PATH B: workers table
  → isWorkerEligible() tier gate enforced
  → writes lead_assignments (A) or job_claims (B)
  → notifies matched workers by email
```
