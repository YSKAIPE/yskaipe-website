/**
 * YSKAIPE Lead Scoring Algorithm — v2
 *
 * Four-factor composite scoring model:
 *   1. Trade match       — primary/secondary/excluded gate
 *   2. Subscription tier — Elite / Pro / Starter + notification delay
 *   3. Geographic proximity — distance bands with radius caps per tier
 *   4. Loyalty score     — tenure, jobs, response rate, referrals, reviews
 *
 * Formula:
 *   score = (trade×w_t + tier×w_s + geo×w_g + loyalty×w_l) / Σweights × 100
 *
 * Usage:
 *   import { scoreContractor, rankContractors, DEFAULT_WEIGHTS } from './leadScoring'
 */

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type SubscriptionTier = "Founding" | "Elite" | "Pro" | "Starter";

export type TradeMatchType = "primary" | "secondary" | "none";

export interface ScoringWeights {
  trade: number; // default 50
  tier: number; // default 30
  geo: number; // default 20
  loyalty: number; // default 15  — cap at 60 to prevent overriding trade gate
}

/** Raw contractor profile as stored in DB */
export interface ContractorProfile {
  id: string;
  name: string;
  primaryTrade: string;
  secondaryTrades: string[];
  tier: SubscriptionTier;
  serviceRadiusMiles: number;

  // Loyalty inputs — updated by platform events
  monthsOnPlatform: number;
  jobsCompleted: number;
  responseRatePct: number; // 0–100
  referralsMade: number;
  reviewAverage: number; // 0–5.0
}

/** Incoming homeowner lead */
export interface Lead {
  id: string;
  trade: string;
  distanceMiles: number;
  estimatedValue?: number;
}

/** Per-contractor scoring breakdown */
export interface ScoringResult {
  contractorId: string;
  compositeScore: number; // 0–100 final score
  eligible: boolean; // false = excluded from queue entirely
  exclusionReason?: string;

  breakdown: {
    tradePts: number; // 0 | 50 | 100
    tradeMatch: TradeMatchType;
    tierPts: number; // 33 | 66 | 100
    geoPts: number; // 0 | 40 | 70 | 100
    loyaltyPts: number; // 0–100 (normalized)
    loyaltyRaw: number; // 0–120 (raw accumulation)
  };

  /** Minutes before notification fires: Elite=0, Pro=2, Starter=5 */
  notificationDelayMinutes: number;
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────

export const DEFAULT_WEIGHTS: ScoringWeights = {
  trade: 50,
  tier: 30,
  geo: 20,
  loyalty: 15,
};

/** Max loyalty weight enforced to protect trade-match primacy */
export const LOYALTY_WEIGHT_CAP = 60;

/** Loyalty raw point caps per signal */
export const LOYALTY_CAPS = {
  monthsMax: 18, // stops accumulating after 18 months
  ptsPerMonth: 3, // 3pts/month → max 54 from tenure
  jobsCap: 20, // max 20pts from completed jobs
  responseRateBonus: 10, // flat bonus if response rate ≥ 90%
  responseRateThreshold: 90,
  referralPts: 8, // per referral made
  referralsCap: 3, // max 3 referrals counted → max 24pts
  reviewBonus: 12, // flat bonus if avg review ≥ 4.7
  reviewThreshold: 4.7,
  rawMax: 120, // absolute raw ceiling before normalization
} as const;

/** Geo score bands */
const GEO_BANDS = [
  { maxMiles: 10, score: 100 },
  { maxMiles: 25, score: 70 },
  { maxMiles: 50, score: 40 },
] as const;

/** Tier radius caps — contractors beyond these are excluded */
const TIER_RADIUS_CAPS: Record<SubscriptionTier, number> = {
  Founding: 2147483647,
  Elite: 50,
  Pro: 50,
  Starter: 25,
};

const TIER_RAW_PTS: Record<SubscriptionTier, number> = {
  Founding: 100,
  Elite: 100,
  Pro: 66,
  Starter: 33,
};

const NOTIFICATION_DELAY: Record<SubscriptionTier, number> = {
  Founding: 0,
  Elite: 0,
  Pro: 2,
  Starter: 5,
};

// ─────────────────────────────────────────────
// Factor calculators
// ─────────────────────────────────────────────

/**
 * Trade match — hard gate.
 * No match = excluded entirely (not just penalized).
 */
export function calcTradeMatch(
  lead: Lead,
  contractor: ContractorProfile,
): { pts: number; matchType: TradeMatchType } {
  if (contractor.primaryTrade === lead.trade) {
    return { pts: 100, matchType: "primary" };
  }
  if (contractor.secondaryTrades.includes(lead.trade)) {
    return { pts: 50, matchType: "secondary" };
  }
  return { pts: 0, matchType: "none" };
}

/**
 * Geo score — distance bands + tier radius cap enforcement.
 * Returns null if contractor is outside their allowed radius.
 */
export function calcGeoScore(
  distanceMiles: number,
  tier: SubscriptionTier,
): number | null {
  const radiusCap = TIER_RADIUS_CAPS[tier];
  if (distanceMiles > radiusCap) return null;

  for (const band of GEO_BANDS) {
    if (distanceMiles <= band.maxMiles) return band.score;
  }
  return 0; // beyond 50mi (caught by radius cap first, but safe fallback)
}

/**
 * Loyalty score — raw accumulation then normalized to 0–100.
 *
 * Raw signals:
 *   Tenure:        +3pts/month, capped at 18 months (max 54)
 *   Jobs:          +1pt each, capped at 20 (max 20)
 *   Response rate: +10pts flat if ≥ 90%
 *   Referrals:     +8pts each, max 3 referrals counted (max 24)
 *   Reviews:       +12pts flat if avg ≥ 4.7★
 *
 * Raw max = 120, normalized to 0–100 before weighting.
 */
export function calcLoyaltyScore(contractor: ContractorProfile): {
  raw: number;
  normalized: number;
} {
  const {
    monthsOnPlatform,
    jobsCompleted,
    responseRatePct,
    referralsMade,
    reviewAverage,
  } = contractor;

  const C = LOYALTY_CAPS;

  const tenurePts = Math.min(monthsOnPlatform, C.monthsMax) * C.ptsPerMonth;
  const jobPts = Math.min(jobsCompleted, C.jobsCap);
  const respBonus =
    responseRatePct >= C.responseRateThreshold ? C.responseRateBonus : 0;
  const refPts = Math.min(referralsMade, C.referralsCap) * C.referralPts;
  const reviewBonus = reviewAverage >= C.reviewThreshold ? C.reviewBonus : 0;

  const raw = Math.min(
    tenurePts + jobPts + respBonus + refPts + reviewBonus,
    C.rawMax,
  );
  const normalized = Math.round((raw / C.rawMax) * 100);

  return { raw, normalized };
}

// ─────────────────────────────────────────────
// Primary scoring function
// ─────────────────────────────────────────────

/**
 * Score a single contractor against a lead.
 *
 * @param lead        - The homeowner lead to score against
 * @param contractor  - The contractor profile to evaluate
 * @param weights     - Optional weight overrides (defaults to DEFAULT_WEIGHTS)
 * @returns           - Full scoring result including breakdown and eligibility
 */
export function scoreContractor(
  lead: Lead,
  contractor: ContractorProfile,
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): ScoringResult {
  // Enforce loyalty weight cap
  const safeWeights: ScoringWeights = {
    ...weights,
    loyalty: Math.min(weights.loyalty, LOYALTY_WEIGHT_CAP),
  };

  const { pts: tradePts, matchType } = calcTradeMatch(lead, contractor);

  // Hard gate: no trade match = excluded
  if (matchType === "none") {
    return {
      contractorId: contractor.id,
      compositeScore: 0,
      eligible: false,
      exclusionReason: "trade_mismatch",
      breakdown: {
        tradePts: 0,
        tradeMatch: "none",
        tierPts: TIER_RAW_PTS[contractor.tier],
        geoPts: 0,
        loyaltyPts: 0,
        loyaltyRaw: 0,
      },
      notificationDelayMinutes: NOTIFICATION_DELAY[contractor.tier],
    };
  }

  const geoPts = calcGeoScore(lead.distanceMiles, contractor.tier);

  // Hard gate: outside service radius = excluded
  if (geoPts === null) {
    return {
      contractorId: contractor.id,
      compositeScore: 0,
      eligible: false,
      exclusionReason: "outside_service_radius",
      breakdown: {
        tradePts,
        tradeMatch: matchType,
        tierPts: TIER_RAW_PTS[contractor.tier],
        geoPts: 0,
        loyaltyPts: 0,
        loyaltyRaw: 0,
      },
      notificationDelayMinutes: NOTIFICATION_DELAY[contractor.tier],
    };
  }

  const tierPts = TIER_RAW_PTS[contractor.tier];
  const { raw: loyaltyRaw, normalized: loyaltyPts } =
    calcLoyaltyScore(contractor);

  const { trade: wt, tier: ws, geo: wg, loyalty: wl } = safeWeights;
  const totalWeight = wt + ws + wg + wl || 1;

  const compositeScore = Math.round(
    (tradePts * wt + tierPts * ws + geoPts * wg + loyaltyPts * wl) /
      totalWeight,
  );

  return {
    contractorId: contractor.id,
    compositeScore,
    eligible: true,
    breakdown: {
      tradePts,
      tradeMatch: matchType,
      tierPts,
      geoPts,
      loyaltyPts,
      loyaltyRaw,
    },
    notificationDelayMinutes: NOTIFICATION_DELAY[contractor.tier],
  };
}

// ─────────────────────────────────────────────
// Queue ranking
// ─────────────────────────────────────────────

export interface RankedContractor {
  rank: number;
  contractor: ContractorProfile;
  result: ScoringResult;
}

/**
 * Rank all eligible contractors for a given lead.
 *
 * Tie-breaking order:
 *   1. compositeScore (desc)
 *   2. reviewAverage (desc)
 *   3. jobsCompleted (desc)  — recency proxy
 *
 * Returns only eligible contractors, sorted.
 */
export function rankContractors(
  lead: Lead,
  contractors: ContractorProfile[],
  weights: ScoringWeights = DEFAULT_WEIGHTS,
): RankedContractor[] {
  const results = contractors
    .map((c) => ({ contractor: c, result: scoreContractor(lead, c, weights) }))
    .filter((x) => x.result.eligible)
    .sort((a, b) => {
      if (b.result.compositeScore !== a.result.compositeScore) {
        return b.result.compositeScore - a.result.compositeScore;
      }
      if (b.contractor.reviewAverage !== a.contractor.reviewAverage) {
        return b.contractor.reviewAverage - a.contractor.reviewAverage;
      }
      return b.contractor.jobsCompleted - a.contractor.jobsCompleted;
    });

  return results.map((x, i) => ({ rank: i + 1, ...x }));
}

// ─────────────────────────────────────────────
// Loyalty progression utility
// ─────────────────────────────────────────────

/**
 * Project a contractor's loyalty score at a future month.
 * Useful for pilot program forecasting and onboarding messaging.
 *
 * @param contractor  - Current contractor profile
 * @param atMonth     - Month to project to (e.g. 6, 12, 18)
 * @param projectedJobsPerMonth - Expected jobs/month going forward
 */
export function projectLoyaltyAt(
  contractor: ContractorProfile,
  atMonth: number,
  projectedJobsPerMonth: number = 2,
): { raw: number; normalized: number; delta: number } {
  const current = calcLoyaltyScore(contractor);

  const projected: ContractorProfile = {
    ...contractor,
    monthsOnPlatform: atMonth,
    jobsCompleted: Math.min(
      contractor.jobsCompleted +
        projectedJobsPerMonth * (atMonth - contractor.monthsOnPlatform),
      LOYALTY_CAPS.jobsCap,
    ),
  };

  const future = calcLoyaltyScore(projected);
  return {
    raw: future.raw,
    normalized: future.normalized,
    delta: future.normalized - current.normalized,
  };
}

// ─────────────────────────────────────────────
// Special incentive multiplier (pilot program)
// ─────────────────────────────────────────────

/**
 * Incentive types by trade — for display, email copy, and
 * unlocking platform features at loyalty milestones.
 */
export const TRADE_INCENTIVES: Record<
  string,
  {
    type: "exclusivity" | "volume" | "data" | "recurring" | "reputation";
    foundingBonus: string;
    loyaltyUnlocks: Array<{ atMonth: number; feature: string }>;
  }
> = {
  HVAC: {
    type: "exclusivity",
    foundingBonus:
      "Zip-code cap (max 3 Elite/zip) + founding rate lock + instant lead delivery",
    loyaltyUnlocks: [
      { atMonth: 6, feature: "Preferred HVAC badge — visible to homeowners" },
      { atMonth: 12, feature: "Homeowner direct-request feature unlocked" },
    ],
  },
  Plumbing: {
    type: "volume",
    foundingBonus:
      "20 leads/month for first 6 months (vs standard 10) + emergency queue priority",
    loyaltyUnlocks: [
      {
        atMonth: 4,
        feature: "Recurring job memory — return requests routed directly",
      },
      {
        atMonth: 10,
        feature: "Annual maintenance contract lead type unlocked",
      },
    ],
  },
  Electrical: {
    type: "exclusivity",
    foundingBonus:
      "4 Elite slots per market max + panel upgrade lead category access",
    loyaltyUnlocks: [
      { atMonth: 4, feature: "EV charger lead category unlocked" },
      { atMonth: 9, feature: "Smart home lead category unlocked" },
    ],
  },
  Roofing: {
    type: "data",
    foundingBonus:
      "Storm alert early access — notified before leads go live post-weather",
    loyaltyUnlocks: [
      {
        atMonth: 6,
        feature: "Neighborhood clustering — boosted after first storm season",
      },
      { atMonth: 12, feature: "Insurance claim lead type unlocked" },
    ],
  },
  Landscaping: {
    type: "recurring",
    foundingBonus:
      "Seasonal return jobs routed automatically + recurring intent flagging",
    loyaltyUnlocks: [
      {
        atMonth: 6,
        feature: "Annual contract lead type unlocked (highest LTV category)",
      },
      { atMonth: 9, feature: "HOA community contract leads unlocked" },
    ],
  },
  Painting: {
    type: "reputation",
    foundingBonus:
      "Verified Pilot Pro badge + Fair Rate Index client pitch tool + priority search placement",
    loyaltyUnlocks: [
      { atMonth: 3, feature: "Portfolio photo gallery unlocked on profile" },
      { atMonth: 8, feature: "Premium homeowner segment access unlocked" },
    ],
  },
};
