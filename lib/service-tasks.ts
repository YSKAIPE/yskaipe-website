/**
 * lib/service-tasks.ts
 * ─────────────────────────────────────────────────────────────────
 * Single source of truth for all YSKAIPE service classifications.
 * Replaces lib/canonical-trades.ts — reads from the service_tasks
 * Supabase table instead of hardcoded arrays.
 *
 * The 8 legacy Pro Core trade slugs remain valid slugs in the DB,
 * so existing quotes/lead_assignments rows are not broken.
 * ─────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js'

// ── Types ─────────────────────────────────────────────────────────

export type WorkerTier = 'youth' | 'primary' | 'licensed'
export type ServiceDomain = 'home' | 'auto' | 'life'
export type FriUnit = 'flat' | 'per_hour' | 'per_visit' | 'per_sqft'

export interface ServiceTask {
  slug: string
  label: string
  category: string
  domain: ServiceDomain
  tier_min: WorkerTier
  requires_license: boolean
  requires_insurance: boolean
  permit_likely: boolean
  youth_ok: boolean
  agentic_quotable: boolean
  ai_keywords: string[]
  fri_low: number | null
  fri_high: number | null
  fri_unit: FriUnit
  active: boolean
}

// ── Supabase client (server-side only, service role for reads) ────

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ── Cache (module-level, reused across requests in same lambda) ───

let _cache: ServiceTask[] | null = null
let _cacheAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

export async function getAllTasks(): Promise<ServiceTask[]> {
  const now = Date.now()
  if (_cache && now - _cacheAt < CACHE_TTL_MS) return _cache

  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('service_tasks')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`service_tasks fetch failed: ${error.message}`)

  _cache = data as ServiceTask[]
  _cacheAt = now
  return _cache
}

export async function getTaskBySlug(slug: string): Promise<ServiceTask | null> {
  const tasks = await getAllTasks()
  return tasks.find((t) => t.slug === slug) ?? null
}

// ── Tier gate ─────────────────────────────────────────────────────

const TIER_RANK: Record<WorkerTier, number> = { youth: 0, primary: 1, licensed: 2 }

/**
 * Returns true if a worker of `workerTier` is allowed to claim a job
 * for a task with `taskTierMin`. Also enforces license hard-block.
 */
export function isWorkerEligible(
  workerTier: WorkerTier,
  task: ServiceTask
): boolean {
  if (task.requires_license && workerTier !== 'licensed') return false
  return TIER_RANK[workerTier] >= TIER_RANK[task.tier_min]
}

// ── Classifier helper (keyword-based fallback) ────────────────────

/**
 * Scores a free-text description against all active tasks using
 * keyword matching. Used as fallback when AI classification fails.
 * Returns the best-matching task or null.
 */
export async function classifyByKeywords(description: string): Promise<ServiceTask | null> {
  const tasks = await getAllTasks()
  const lower = description.toLowerCase()

  let best: ServiceTask | null = null
  let bestScore = 0

  for (const task of tasks) {
    let score = 0
    // Keyword matches
    for (const kw of task.ai_keywords ?? []) {
      if (lower.includes(kw.toLowerCase())) score += 2
    }
    // Label/category partial match
    if (lower.includes(task.label.toLowerCase())) score += 3
    if (lower.includes(task.category.toLowerCase())) score += 1

    if (score > bestScore) {
      bestScore = score
      best = task
    }
  }

  return bestScore >= 2 ? best : null
}

// ── Legacy compat: map old canonical trade slugs to service_tasks slugs ──

/**
 * The 8 original Pro Core slugs used in existing DB rows.
 * These are valid service_tasks slugs — this map is only needed
 * if old code passes a legacy alias like "hvac" expecting the top-level trade.
 * In the new model, all classification returns a specific task slug.
 */
export const LEGACY_PRO_CORE_SLUGS = [
  'hvac',
  'plumbing',
  'electrical',
  'roofing',
  'landscaping',
  'painting',
  'general_contracting',
  'automotive',
] as const

export type LegacyProCoreSlug = typeof LEGACY_PRO_CORE_SLUGS[number]
