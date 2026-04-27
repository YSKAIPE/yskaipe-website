export type TradeType =
  | "plumbing"
  | "electrical"
  | "hvac"
  | "roofing"
  | "landscaping"
  | "painting"
  | "general_contracting"
  | "automotive";

export type Complexity = "simple" | "moderate" | "complex";

export interface QuoteRequest {
  trade: TradeType;
  zip: string;
  scope?: string;
  description: string;
  customerName?: string;
  customerEmail?: string;
}

export interface QuoteResult {
  id?: string;
  trade: TradeType;
  zip: string;
  scope?: string;
  description: string;
  customerName?: string;
  customerEmail?: string;
  labor_hours: number;
  labor_rate: number;
  labor_total: number;
  materials_total: number;
  grand_total: number;
  complexity: Complexity;
  time_estimate: string;
  breakdown: string;
  materials_list: string[];
  notes: string;
  created_at?: string;
}
