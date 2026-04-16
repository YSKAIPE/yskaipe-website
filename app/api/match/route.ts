// ============================================================
// FILE 4: app/api/match/route.ts
// POST /api/match
// Body: { request_id }
// Runs the 4-factor scoring engine, writes lead assignments,
// returns top match + queue summary.
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  rankContractors,
  type ScoringWeights,
  type ContractorProfile,
} from "@/lib/leadScoring";

export async function POST(req: NextRequest) {
  const { request_id } = await req.json();
  if (!request_id)
    return NextResponse.json({ error: "Missing request_id" }, { status: 400 });

  // 1. Load the homeowner request
  const { data: request, error: reqErr } = await supabaseAdmin
    .from("homeowner_requests")
    .select("*")
    .eq("id", request_id)
    .single();

  if (reqErr || !request) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  // 2. Load algorithm weights from DB
  const { data: config } = await supabaseAdmin
    .from("scoring_config")
    .select("*")
    .single();

  const weights: ScoringWeights = {
    trade: config?.w_trade ?? 50,
    tier: config?.w_tier ?? 30,
    geo: config?.w_geo ?? 20,
    loyalty: config?.w_loyalty ?? 15,
  };

  // 3. Fetch eligible contractors for this trade (capacity pre-filter via view)
  // Primary trade match
  const { data: primary, error: ctErr } = await supabaseAdmin
    .from("eligible_contractors")
    .select("*")
    .eq("primary_trade", request.trade);

  if (ctErr) {
    console.error("[/api/match] contractor fetch", ctErr);
    return NextResponse.json(
      { error: "Failed to fetch contractors" },
      { status: 500 },
    );
  }

  // Secondary trade match — union, deduplicate by id
  const { data: secondary } = await supabaseAdmin
    .from("eligible_contractors")
    .select("*")
    .contains("secondary_trades", [request.trade]);

  const primaryIds = new Set((primary ?? []).map((c: any) => c.id));
  const allRaw = [
    ...(primary ?? []),
    ...(secondary ?? []).filter((c: any) => !primaryIds.has(c.id)),
  ];

  if (!allRaw.length) {
    return NextResponse.json(
      { error: "No eligible contractors in this market for that trade." },
      { status: 200 },
    );
  }

  // 4. Map DB rows → ContractorProfile for leadScoring.ts
  //    Tier enum: DB stores lowercase ('founding','elite','pro','starter')
  //    leadScoring.ts expects title-case ('Founding','Elite','Pro','Starter')
  const tierMap: Record<string, string> = {
    founding: "Founding",
    elite: "Elite",
    pro: "Pro",
    starter: "Starter",
  };

  const profiles: ContractorProfile[] = allRaw.map((c: any) => ({
    id: c.id,
    name: c.company_name || c.name,
    primaryTrade: c.primary_trade,
    secondaryTrades: c.secondary_trades ?? [],
    tier: (tierMap[c.tier] ?? "Starter") as any,
    serviceRadiusMiles: c.service_radius_miles,
    monthsOnPlatform: c.months_on_platform,
    jobsCompleted: c.jobs_completed,
    responseRatePct: c.response_rate_pct,
    referralsMade: c.referrals_made,
    reviewAverage: parseFloat(c.review_average),
  }));

  // 5. Build the lead object
  //    distanceMiles: using 0 until geocoding is wired.
  //    The geo score will be 100 for all — fair for now,
  //    real distance replaces this in the next step.
  const lead = {
    id: request.id,
    trade: request.trade,
    distanceMiles: 0,
  };

  // 6. Run the scoring engine
  const ranked = rankContractors(lead, profiles, weights);

  if (!ranked.length) {
    return NextResponse.json(
      { error: "No contractors matched after scoring." },
      { status: 200 },
    );
  }

  // 7. Write lead assignment rows for top 5   return NextResponse.json({ debug: ranked.slice(0,2) })
  const now = Date.now();
  const assignments = ranked.slice(0, 5).map((r) => {
    const delayMins = getDelayMinutes(r.contractor.tier);
    return {
      request_id,
      contractor_id: r.contractor.id,
      composite_score: r.result.compositeScore ?? 0,
      trade_pts: r.result.breakdown?.tradePts ?? 0,
      tier_pts: r.result.breakdown?.tierPts ?? 0,
      geo_pts: r.result.breakdown?.geoPts ?? 0,
      loyalty_pts: r.result.breakdown?.loyaltyPts ?? 0,
      loyalty_raw: r.result.breakdown?.loyaltyRaw ?? 0,
      rank_position: r.rank,
      status: r.rank === 1 ? "assigned" : "pending",
      notification_delay_minutes: delayMins,
      notify_at: new Date(now + delayMins * 60 * 1000).toISOString(),
    };
  });

  const { error: assignErr } = await supabaseAdmin
    .from("leads")
    .upsert(assignments, { onConflict: "request_id,contractor_id" });

  if (assignErr) {
    console.error("[/api/match] upsert leads", assignErr);
    return NextResponse.json(
      {
        error: "Failed to write assignments",
        detail: assignErr.message,
        code: assignErr.code,
      },
      { status: 500 },
    );
  }

  // 8. Mark request as assigned
  await supabaseAdmin
    .from("homeowner_requests")
    .update({ status: "assigned", matched_at: new Date().toISOString() })
    .eq("id", request_id);

  // 9. Return top match + queue tail
  const topRaw = allRaw.find((c: any) => c.id === ranked[0].contractor.id);

  return NextResponse.json({
    match: {
      ...ranked[0].result,
      compositeScore: ranked[0].result.compositeScore,
      contractor: {
        id: topRaw.id,
        name: topRaw.name,
        company_name: topRaw.company_name,
        email: topRaw.email,
        phone: topRaw.phone,
        avatar_initials: topRaw.avatar_initials,
        tier: topRaw.tier,
        primary_trade: topRaw.primary_trade,
        review_average: topRaw.review_average,
        jobs_completed: topRaw.jobs_completed,
        is_founding: topRaw.is_founding,
        notification_delay_minutes: getDelayMinutes(ranked[0].contractor.tier),
      },
    },
    queue: ranked.slice(1, 4).map((r) => {
      const raw = allRaw.find((c: any) => c.id === r.contractor.id);
      return {
        rank: r.rank,
        name: raw?.company_name || r.contractor.name,
        tier: raw?.tier ?? r.contractor.tier,
        compositeScore: r.result.compositeScore,
      };
    }),
  });
}

function getDelayMinutes(tier: string): number {
  const map: Record<string, number> = {
    Founding: 0,
    founding: 0,
    Elite: 0,
    elite: 0,
    Pro: 2,
    pro: 2,
    Starter: 5,
    starter: 5,
  };
  return map[tier] ?? 5;
}
