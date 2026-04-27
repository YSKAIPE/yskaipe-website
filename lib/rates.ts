import { TradeType } from '@/types/quote'

export interface TradeRates {
  laborMin: number
  laborMax: number
  commonJobs: string[]
  permitRequired: boolean
  typicalMaterialsRatio: number // materials as % of labor
}

// Keys MUST match the trade_type Postgres enum exactly:
// 'plumbing' | 'electrical' | 'hvac' | 'roofing' | 'landscaping'
// 'painting' | 'general_contracting' | 'automotive'
export const RATES_DB: Record<TradeType, TradeRates> = {
  plumbing: {
    laborMin: 95, laborMax: 145,
    commonJobs: ['faucet repair', 'pipe replacement', 'water heater', 'drain unclog', 'shutoff valve'],
    permitRequired: true,
    typicalMaterialsRatio: 0.4,
  },
  electrical: {
    laborMin: 100, laborMax: 155,
    commonJobs: ['panel upgrade', 'outlet install', 'EV charger', 'light fixture', 'circuit breaker'],
    permitRequired: true,
    typicalMaterialsRatio: 0.35,
  },
  hvac: {
    laborMin: 90, laborMax: 140,
    commonJobs: ['AC tune-up', 'furnace repair', 'duct cleaning', 'thermostat install', 'refrigerant recharge'],
    permitRequired: false,
    typicalMaterialsRatio: 0.45,
  },
  roofing: {
    laborMin: 80, laborMax: 130,
    commonJobs: ['shingle replacement', 'leak repair', 'full reroof', 'gutter install', 'storm damage'],
    permitRequired: false,
    typicalMaterialsRatio: 0.6,
  },
  landscaping: {
    laborMin: 55, laborMax: 95,
    commonJobs: ['weekly lawn service', 'mulch install', 'hedge trimming', 'leaf cleanup', 'sod install', 'irrigation repair'],
    permitRequired: false,
    typicalMaterialsRatio: 0.3,
  },
  painting: {
    laborMin: 60, laborMax: 95,
    commonJobs: ['interior repaint', 'exterior repaint', 'cabinet refinish', 'trim and doors', 'deck staining'],
    permitRequired: false,
    typicalMaterialsRatio: 0.25,
  },
  general_contracting: {
    laborMin: 85, laborMax: 135,
    commonJobs: ['kitchen remodel', 'bathroom remodel', 'addition', 'deck build', 'basement finish'],
    permitRequired: true,
    typicalMaterialsRatio: 0.55,
  },
  automotive: {
    laborMin: 90, laborMax: 150,
    commonJobs: ['oil change', 'brake pad replacement', 'diagnostic scan', 'battery replacement', 'tire rotation', 'alternator replacement'],
    permitRequired: false,
    typicalMaterialsRatio: 0.5,
  },
}

// Regional cost multipliers by state (from zip prefix)
export function getRegionalMultiplier(zip: string): number {
  if (!zip || zip.length < 3) return 1.0
  const prefix = parseInt(zip.substring(0, 3))

  // NYC/NJ area
  if ((prefix >= 100 && prefix <= 119) || (prefix >= 70 && prefix <= 89)) return 1.45
  // CA
  if (prefix >= 900 && prefix <= 961) return 1.35
  // MA/CT
  if ((prefix >= 10 && prefix <= 27) || (prefix >= 60 && prefix <= 69)) return 1.25
  // WA/OR
  if ((prefix >= 970 && prefix <= 994)) return 1.2
  // TX
  if (prefix >= 750 && prefix <= 799) return 0.95
  // Southeast / NC (default area)
  if ((prefix >= 270 && prefix <= 289) || (prefix >= 290 && prefix <= 299)) return 1.0
  // Midwest
  if (prefix >= 460 && prefix <= 499) return 0.92
  // Rural areas
  return 1.0
}
