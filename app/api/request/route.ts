// ============================================================
// FILE 2: app/api/request/route.ts
// GET /api/request?id=xxx
// Returns a homeowner request by ID — used by match-flow UI
// to populate the job strip on load.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("homeowner_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
