import { createClient } from "@supabase/supabase-js";
import { QuoteResult } from "@/types/quote";
import type { TradeSlug, TradeType } from "@/lib/canonical-trades";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─── SQL to run once in Supabase SQL editor ────────────────────────────────
//
// create table quotes (
//   id uuid default gen_random_uuid() primary key,
//   trade text not null,
//   trade_slug varchar(32),                           -- added 2026-05-19 (canonical taxonomy)
//   zip text,
//   scope text,
//   description text not null,
//   customer_name text,
//   customer_email text,
//   customer_phone text,                              -- added 2026-04-28
//   labor_hours numeric,
//   labor_rate numeric,
//   labor_total numeric,
//   materials_total numeric,
//   grand_total numeric,
//   complexity text,
//   time_estimate text,
//   breakdown text,
//   materials_list text[],
//   notes text,
//   created_at timestamptz default now()
// );
//
// -- Enable row level security
// alter table quotes enable row level security;
//
// -- Allow inserts from service role (server-side API only)
// create policy "Service role can insert"
//   on quotes for insert
//   using (true);
//
// -- Allow reads (for admin dashboard later)
// create policy "Service role can read"
//   on quotes for select
//   using (true);
//
// -- Migration for existing deployments (idempotent):
// alter table quotes add column if not exists customer_phone text;
// alter table quotes add column if not exists trade_slug varchar(32);
// alter table quotes add constraint quotes_trade_slug_canonical
//   check (trade_slug is null or trade_slug in
//     ('hvac','plumbing','electrical','roofing','landscaping','painting','general_contracting','automotive'));
// ──────────────────────────────────────────────────────────────────────────

export async function saveQuote(
  quote: QuoteResult,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("quotes")
    .insert({
      trade: quote.trade,
      trade_slug: quote.trade_slug, // canonical taxonomy — written on every new quote
      zip: quote.zip,
      scope: quote.scope,
      description: quote.description,
      customer_name: quote.customerName,
      customer_email: quote.customerEmail,
      customer_phone: quote.customerPhone,
      labor_hours: quote.labor_hours,
      labor_rate: quote.labor_rate,
      labor_total: quote.labor_total,
      materials_total: quote.materials_total,
      grand_total: quote.grand_total,
      complexity: quote.complexity,
      time_estimate: quote.time_estimate,
      breakdown: quote.breakdown,
      materials_list: quote.materials_list,
      notes: quote.notes,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Supabase insert error:", error);
    return null;
  }

  return data;
}

export async function getQuoteById(id: string): Promise<QuoteResult | null> {
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  // Supabase client is untyped here — `data` is effectively `any`.
  // We cast trade and trade_slug to the canonical unions; the DB CHECK constraint
  // (quotes_trade_slug_canonical) guarantees these are valid at write time.
  return {
    id: data.id,
    created_at: data.created_at,
    trade: data.trade as TradeType,
    trade_slug: data.trade_slug as TradeSlug,
    zip: data.zip,
    scope: data.scope,
    description: data.description,
    customerName: data.customer_name,
    customerEmail: data.customer_email,
    customerPhone: data.customer_phone,
    labor_hours: data.labor_hours,
    labor_rate: data.labor_rate,
    labor_total: data.labor_total,
    materials_total: data.materials_total,
    grand_total: data.grand_total,
    complexity: data.complexity,
    time_estimate: data.time_estimate,
    breakdown: data.breakdown,
    materials_list: data.materials_list,
    notes: data.notes,
  };
}
