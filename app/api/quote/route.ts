// ============================================================
// FILE: app/api/quote/route.ts
// POST /api/quote
// Body: { trade, description, zip_code, homeowner_name, homeowner_email, homeowner_phone }
// Creates a homeowner_request row and returns the auto-quote.
// This is called from the homeowner quote form on yskaipe.com.
// After success, redirect the user to /match?request_id={id}
//
// CHANGED 2026-04-28: homeowner_phone is now required and persisted.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const QUOTE_TABLES: Record<
  string,
  {
    lines: { label: string; low: number; high: number }[];
    diy: { name: string; price: number }[];
    difficulty: number;
  }
> = {
  hvac: {
    lines: [
      { label: "Diagnostic / service call", low: 95, high: 120 },
      { label: "Labor (1.5–2 hrs)", low: 110, high: 160 },
      { label: "Refrigerant recharge (if needed)", low: 75, high: 150 },
      { label: "Parts (capacitor / contactor)", low: 0, high: 90 },
    ],
    diy: [
      { name: "Replacement air filter (MERV-11)", price: 18 },
      { name: "Coil cleaner spray", price: 14 },
    ],
    difficulty: 6,
  },
  plumbing: {
    lines: [
      { label: "Service call", low: 75, high: 95 },
      { label: "Drain clearing (mechanical)", low: 20, high: 125 },
    ],
    diy: [
      { name: "Drain snake 25ft", price: 29 },
      { name: "Bio-enzyme drain cleaner", price: 16 },
    ],
    difficulty: 3,
  },
  electrical: {
    lines: [
      { label: "Panel and materials", low: 900, high: 1400 },
      { label: "Labor (6–8 hrs)", low: 800, high: 1200 },
      { label: "Permit and inspection", low: 250, high: 350 },
      { label: "Wiring updates", low: 200, high: 450 },
    ],
    diy: [],
    difficulty: 8,
  },
  roofing: {
    lines: [
      { label: "Inspection", low: 0, high: 150 },
      { label: "Materials (shingles)", low: 800, high: 3000 },
      { label: "Labor", low: 1200, high: 4000 },
      { label: "Underlayment / flashing", low: 200, high: 600 },
    ],
    diy: [{ name: "Roofing caulk (tube)", price: 12 }],
    difficulty: 7,
  },
  landscaping: {
    lines: [
      { label: "Labor (per visit)", low: 60, high: 120 },
      { label: "Materials / mulch", low: 0, high: 200 },
      { label: "Equipment fee", low: 0, high: 50 },
    ],
    diy: [
      { name: "Mulch (2 cu ft bag)", price: 8 },
      { name: "Garden edger", price: 35 },
    ],
    difficulty: 2,
  },
  painting: {
    lines: [
      { label: "Paint + primer (2 coats)", low: 180, high: 400 },
      { label: "Labor", low: 400, high: 1200 },
      { label: "Prep / masking", low: 50, high: 200 },
    ],
    diy: [
      { name: "Painter's tape (3-pack)", price: 14 },
      { name: "Paint roller set", price: 22 },
    ],
    difficulty: 4,
  },
  // GC rates: NC market customer-facing $75–$150/hr.
  // Bands here are intentionally wide — GC scope ranges from
  // half-day handyman fixes to multi-week remodels. The AI
  // estimator narrows it from the description.
  general_contracting: {
    lines: [
      { label: "Initial site visit / estimate", low: 0, high: 250 },
      { label: "Labor (per day on smaller jobs)", low: 300, high: 700 },
      { label: "Materials (varies widely by scope)", low: 150, high: 2500 },
      { label: "Permits (if structural / electrical / plumbing)", low: 0, high: 500 },
    ],
    diy: [],
    difficulty: 7,
  },
  // Automotive: NC customer-facing labor $85–$155/hr.
  // Diagnostic fee typical $90–$150 (often credited if work proceeds).
  automotive: {
    lines: [
      { label: "Diagnostic / inspection fee", low: 90, high: 150 },
      { label: "Labor (1–3 hrs typical)", low: 110, high: 465 },
      { label: "Parts (varies by repair)", low: 30, high: 800 },
      { label: "Shop supplies / fees", low: 0, high: 30 },
    ],
    diy: [
      { name: "OBD-II scanner (basic)", price: 28 },
      { name: "Engine air filter", price: 18 },
    ],
    difficulty: 5,
  },
};

// ── Validation helpers ─────────────────────────────────────
// Same rules as the client form (index.html). Server-side check
// guards against direct API hits and stale cached frontends.
function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function isValidPhone(s: string): boolean {
  const digits = s.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    trade,
    description,
    zip_code,
    homeowner_name,
    homeowner_email,
    homeowner_phone,
  } = body;

  // ── Required field check ─────────────────────────────────
  if (
    !trade ||
    !description ||
    !zip_code ||
    !homeowner_name ||
    !homeowner_email ||
    !homeowner_phone
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  // ── Format validation ────────────────────────────────────
  if (!isValidEmail(homeowner_email)) {
    return NextResponse.json(
      { error: "Invalid email format" },
      { status: 400 },
    );
  }

  if (!isValidPhone(homeowner_phone)) {
    return NextResponse.json(
      { error: "Invalid phone number" },
      { status: 400 },
    );
  }

  const table = QUOTE_TABLES[trade as string];
  if (!table) {
    return NextResponse.json(
      { error: `Unknown trade: ${trade}` },
      { status: 400 },
    );
  }

  const quote_low = table.lines.reduce((s, l) => s + l.low, 0);
  const quote_high = table.lines.reduce((s, l) => s + l.high, 0);

  const { data: request, error } = await supabaseAdmin
    .from("homeowner_requests")
    .insert({
      homeowner_name,
      homeowner_email,
      homeowner_phone,
      zip_code,
      trade,
      description,
      quote_low,
      quote_high,
      difficulty_score: table.difficulty,
      line_items: table.lines,
      diy_items: table.diy,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[/api/quote]", error);
    return NextResponse.json(
      { error: "Failed to create request" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    request_id: request.id,
    quote_low,
    quote_high,
    difficulty_score: table.difficulty,
    line_items: table.lines,
    diy_items: table.diy,
  });
}
