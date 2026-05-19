/**
 * RATES_DB — Pro Core trade rate definitions for AutoQuote
 *
 * Keys are CANONICAL slugs from canonical-trades.ts.
 * Do not add non-Pro-Core trades here — Pro Core is locked at 8.
 *
 * Labor rates are 2026 NC midpoints. Regional multipliers adjust by ZIP.
 */

import type { TradeSlug } from './canonical-trades'

export interface TradeRates {
  /** Lower bound for hourly labor rate (USD), 2026 NC baseline */
  laborMin: number
  /** Upper bound for hourly labor rate (USD), 2026 NC baseline */
  laborMax: number
  /** Whether a permit is typically required (drives a $150–$500 add to materials) */
  permitRequired: boolean
  /** Representative jobs in this trade — used to ground the AI estimate */
  commonJobs: string[]
}

export const RATES_DB: Record<TradeSlug, TradeRates> = {
  hvac: {
    laborMin: 110,
    laborMax: 165,
    permitRequired: false,
    commonJobs: [
      'AC repair / service',
      'Furnace repair',
      'Full HVAC system replacement',
      'Ductwork inspection / repair',
      'Mini-split install',
      'Thermostat / smart thermostat install',
      'Refrigerant recharge',
      'Annual maintenance / tune-up',
    ],
  },
  plumbing: {
    laborMin: 100,
    laborMax: 155,
    permitRequired: false,
    commonJobs: [
      'Water heater replacement',
      'Leak repair (under sink, behind wall, slab)',
      'Drain clearing',
      'Fixture install (faucet, toilet, garbage disposal)',
      'Sump pump install / repair',
      'Repipe (PEX / copper)',
      'Sewer line camera / repair',
      'Tankless water heater install',
    ],
  },
  electrical: {
    laborMin: 105,
    laborMax: 160,
    permitRequired: true,
    commonJobs: [
      'Panel upgrade / replacement',
      'Outlet / switch repair or install',
      'Lighting install (interior, exterior, landscape)',
      'EV charger install (Level 2)',
      'Generator install (whole-home, portable hookup)',
      'Ceiling fan install',
      'Code compliance / inspection prep',
      'Smoke / CO detector hardwire',
    ],
  },
  roofing: {
    laborMin: 95,
    laborMax: 150,
    permitRequired: true,
    commonJobs: [
      'Full roof replacement (shingle, metal)',
      'Leak repair / patch',
      'Storm damage assessment / repair',
      'Gutter install / repair',
      'Skylight install / reseal',
      'Soffit / fascia repair',
      'Annual roof inspection',
      'Ridge vent install',
    ],
  },
  landscaping: {
    laborMin: 65,
    laborMax: 110,
    permitRequired: false,
    commonJobs: [
      'Lawn maintenance / mowing program',
      'Bed install / refresh (mulch, plants, edging)',
      'Hardscape (patio, walkway, retaining wall)',
      'Irrigation install / repair',
      'Sod install',
      'Tree / shrub planting',
      'Drainage / grading',
      'Lake-house grounds maintenance',
    ],
  },
  painting: {
    laborMin: 55,
    laborMax: 95,
    permitRequired: false,
    commonJobs: [
      'Interior painting (single room, whole-house)',
      'Exterior painting (full exterior, trim, doors)',
      'Cabinet painting / refinishing',
      'Deck staining / sealing',
      'Pressure wash + paint prep',
      'Drywall repair + repaint',
      'Wallpaper removal',
      'Accent wall / specialty finish',
    ],
  },
  general_contracting: {
    laborMin: 95,
    laborMax: 160,
    permitRequired: true,
    commonJobs: [
      'Kitchen renovation',
      'Bathroom renovation',
      'Home addition',
      'Deck build / rebuild',
      'Basement finishing',
      'Whole-home renovation',
      'Structural repair',
      'Garage build / conversion',
    ],
  },
  automotive: {
    laborMin: 85,
    laborMax: 145,
    permitRequired: false,
    commonJobs: [
      'Mobile diagnostic / repair',
      'Tire replacement / rotation',
      'Brake service',
      'Battery replacement / jump',
      'Oil change (mobile)',
      'Pre-purchase inspection',
      'Boat trailer repair',
      'Headlight restoration / electrical',
    ],
  },
}

// ----- Regional multipliers -----
// Adjusts the base NC midpoint rate by ZIP. Lake Norman, Charlotte metro, and
// downtown Charlotte run higher than rural NC; coastal and mountain regions
// trend close to baseline.

const LKN_ZIPS = new Set(['28031', '28036', '28078', '28115', '28117'])              // Cornelius, Davidson, Huntersville, Mooresville
const CHARLOTTE_METRO_PREFIXES = ['280', '281', '282']                                // Greater Charlotte
const CHARLOTTE_DOWNTOWN_ZIPS = new Set(['28202', '28203', '28204', '28205', '28207']) // Downtown Charlotte
const COASTAL_PREFIXES = ['284', '285']                                               // Wilmington / coastal NC
const MOUNTAIN_PREFIXES = ['287', '288', '289']                                       // Asheville / western NC

export function getRegionalMultiplier(zip?: string): number {
  if (!zip || !/^\d{5}$/.test(zip)) return 1.0

  if (LKN_ZIPS.has(zip)) return 1.12                          // Lake Norman premium
  if (CHARLOTTE_DOWNTOWN_ZIPS.has(zip)) return 1.18           // Uptown premium
  if (CHARLOTTE_METRO_PREFIXES.some((p) => zip.startsWith(p))) return 1.08
  if (COASTAL_PREFIXES.some((p) => zip.startsWith(p))) return 1.05
  if (MOUNTAIN_PREFIXES.some((p) => zip.startsWith(p))) return 1.02

  return 1.0
}
