/**
 * YSKAIPE PRO CORE TRADES — CANONICAL TAXONOMY
 * ============================================
 *
 * THIS IS THE SINGLE SOURCE OF TRUTH for the 8 Pro Core trades.
 *
 * Every system that names, stores, displays, routes, or matches a trade
 * MUST reference this file. No string literals for trade names anywhere else.
 *
 * The 8 trades map 1:1 to:
 *   - Pro Dashboards (8 dashboards, excluding internal/admin)
 *   - AI Trade Agents (Aria, River, Volt, Ridge, Terra, Hue, Forge, Axle)
 *   - Email plus-addressing for lead routing (gr8+<slug>@yskaipe.com)
 *   - Supabase `contractors.trade` column (stores the slug)
 *   - RATES_DB keys (must use slug)
 *   - Pro Core trade cards on yskaipe.com
 *   - AutoQuote dropdown options
 *
 * Storage convention:
 *   - DB & API:        slug (lowercase, snake_case for multi-word)  → "hvac", "general_contracting"
 *   - URL paths:       slug with hyphens                             → "hvac", "general-contracting"
 *   - Display:         displayName (Title Case, user-facing)         → "HVAC", "General Contracting"
 *   - Email routing:   emailHandle (matches slug)                    → "gr8+hvac@yskaipe.com"
 */

export type TradeSlug =
  | 'hvac'
  | 'plumbing'
  | 'electrical'
  | 'roofing'
  | 'landscaping'
  | 'painting'
  | 'general_contracting'
  | 'automotive'

export interface ProCoreTrade {
  /** Canonical storage key — used in DB, API payloads, RATES_DB lookups */
  slug: TradeSlug
  /** User-facing display name — used in dropdowns, cards, emails, anywhere a human reads it */
  displayName: string
  /** AI agent persona name for this trade */
  agentName: string
  /** Email plus-address handle for lead routing → gr8+<emailHandle>@yskaipe.com */
  emailHandle: string
  /** URL-safe slug for routes (e.g., /dashboard/<urlSlug>) — uses hyphens not underscores */
  urlSlug: string
  /** Brief description for trade cards, agent intros, dropdowns with context */
  description: string
}

export const PRO_CORE_TRADES: ProCoreTrade[] = [
  {
    slug: 'hvac',
    displayName: 'HVAC',
    agentName: 'Aria',
    emailHandle: 'hvac',
    urlSlug: 'hvac',
    description: 'AC service, furnace work, ductwork, mini-splits, summer emergencies.',
  },
  {
    slug: 'plumbing',
    displayName: 'Plumbing',
    agentName: 'River',
    emailHandle: 'plumbing',
    urlSlug: 'plumbing',
    description: 'Water heaters, leaks, drains, fixtures, repipes — the Tuesday-night calls.',
  },
  {
    slug: 'electrical',
    displayName: 'Electrical',
    agentName: 'Volt',
    emailHandle: 'electrical',
    urlSlug: 'electrical',
    description: 'Panels, outlets, lighting, EV chargers, generators, code upgrades.',
  },
  {
    slug: 'roofing',
    displayName: 'Roofing',
    agentName: 'Ridge',
    emailHandle: 'roofing',
    urlSlug: 'roofing',
    description: 'Shingles, leaks, full replacements, storm damage, gutters.',
  },
  {
    slug: 'landscaping',
    displayName: 'Landscaping',
    agentName: 'Terra',
    emailHandle: 'landscaping',
    urlSlug: 'landscaping',
    description: 'Lawns, beds, hardscape, irrigation, lake-house grounds.',
  },
  {
    slug: 'painting',
    displayName: 'Painting',
    agentName: 'Hue',
    emailHandle: 'painting',
    urlSlug: 'painting',
    description: 'Interior, exterior, decks, cabinets, that one room before company.',
  },
  {
    slug: 'general_contracting',
    displayName: 'General Contracting',
    agentName: 'Forge',
    emailHandle: 'gc',
    urlSlug: 'general-contracting',
    description: 'Renovations, additions, kitchens, baths, deck rebuilds, the bigger jobs.',
  },
  {
    slug: 'automotive',
    displayName: 'Automotive',
    agentName: 'Axle',
    emailHandle: 'automotive',
    urlSlug: 'automotive',
    description: 'Mobile repair, tire and brake, batteries, boat trailer fixes.',
  },
]

// ----- Lookups -----

export const TRADE_BY_SLUG: Record<TradeSlug, ProCoreTrade> = PRO_CORE_TRADES.reduce(
  (acc, t) => ({ ...acc, [t.slug]: t }),
  {} as Record<TradeSlug, ProCoreTrade>
)

/** Resolve any of: slug, displayName, agentName, urlSlug, emailHandle to the canonical trade. Case-insensitive. */
export function resolveTrade(input: string): ProCoreTrade | null {
  if (!input) return null
  const q = input.trim().toLowerCase()
  return (
    PRO_CORE_TRADES.find(
      (t) =>
        t.slug === q ||
        t.displayName.toLowerCase() === q ||
        t.agentName.toLowerCase() === q ||
        t.urlSlug === q ||
        t.emailHandle === q
    ) ?? null
  )
}

/** True if `input` resolves to one of the 8 Pro Core trades. */
export function isProCoreTrade(input: string): boolean {
  return resolveTrade(input) !== null
}

/** All valid slugs as a Set — for fast guard checks. */
export const PRO_CORE_TRADE_SLUGS: Set<TradeSlug> = new Set(PRO_CORE_TRADES.map((t) => t.slug))

// ----- Legacy migration map (DELETE after migration is complete) -----
// Maps the role-style names that exist in the old AutoQuote form + RATES_DB
// to canonical Pro Core slugs. Use ONLY at the API boundary during the transition.
// Non-Pro-Core legacy values (Welder, Home Inspector, etc.) should be REJECTED, not mapped.
export const LEGACY_TRADE_ALIAS: Record<string, TradeSlug> = {
  'HVAC Technician': 'hvac',
  'HVAC': 'hvac',
  'Plumber': 'plumbing',
  'Plumbing': 'plumbing',
  'Electrician': 'electrical',
  'Electrical': 'electrical',
  'Roofer': 'roofing',
  'Roofing': 'roofing',
  'Landscaper': 'landscaping',
  'Landscaping': 'landscaping',
  'Painter': 'painting',
  'Painting': 'painting',
  'General Contractor': 'general_contracting',
  'General Contracting': 'general_contracting',
  'GC': 'general_contracting',
  'Automotive': 'automotive',
  'Auto': 'automotive',
}

/** REJECTED — these were in the old form/RATES_DB but are NOT Pro Core. */
export const REJECTED_TRADES: ReadonlySet<string> = new Set([
  'Welder / Fabricator',
  'Home Inspector',
  'Pest Control',
  'Arborist',
  'EV Infrastructure Tech',
  'Physical Therapist',
  'EMT / Paramedic',
  'Drone Ops Specialist',
  'Smart Home Integrator',
])
