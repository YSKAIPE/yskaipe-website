import type { TradeSlug, TradeType } from "../lib/canonical-trades";
export type { TradeType, TradeSlug };

/**
 * Re-exporting TradeType + TradeSlug from canonical-trades makes this module
 * a stable import surface for downstream code (route handlers, dashboards, etc.)
 * while keeping the actual taxonomy definition in one place.
 */

export type QuoteComplexity = "simple" | "moderate" | "complex";

/**
 * Inbound quote request — `trade` is intentionally loose `string`.
 * The API route calls `normalizeTrade()` to coerce to a canonical slug
 * before any downstream usage.
 */
export interface QuoteRequest {
  trade: string;
  zip?: string;
  scope?: string;
  description: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

/**
 * Outbound quote result — strict canonical types only.
 * Stored in `quotes` table. Returned to client. Consumed by email-quote, export-pdf, dashboards.
 */
export interface QuoteResult {
  /** Supabase row id (set after saveQuote completes) */
  id?: string;

  /** Canonical display name — e.g., "HVAC" */
  trade: TradeType;
  /** Canonical storage slug — e.g., "hvac". Use this for routing, DB lookups, plus-addressing */
  trade_slug: TradeSlug;

  zip: string;
  scope?: string;
  description: string;

  // Homeowner contact
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;

  // AI-generated estimate fields
  labor_hours: number;
  labor_rate: number;
  labor_total: number;
  materials_total: number;
  grand_total: number;
  complexity: QuoteComplexity;
  time_estimate: string;
  breakdown: string;
  materials_list: string[];
  notes: string;
}
