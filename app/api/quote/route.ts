// ============================================================
// FILE 3: app/api/quote/route.ts
// POST /api/quote
// Body: { trade, description, zip_code, homeowner_name, homeowner_email }
// Creates a homeowner_request row and returns the auto-quote.
// This is called from your existing quote form on yskaipe.com.
// After success, redirect the user to /match?request_id={id}
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
};

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { trade, description, zip_code, homeowner_name, homeowner_email } =
    body;

  if (
    !trade ||
    !description ||
    !zip_code ||
    !homeowner_name ||
    !homeowner_email
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
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
