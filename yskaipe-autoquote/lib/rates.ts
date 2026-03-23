import { TradeType } from '@/types/quote'

export interface TradeRates {
  laborMin: number
  laborMax: number
  commonJobs: string[]
  permitRequired: boolean
  typicalMaterialsRatio: number // materials as % of labor
}

export const RATES_DB: Record<TradeType, TradeRates> = {
  'Plumber': {
    laborMin: 95, laborMax: 145,
    commonJobs: ['faucet repair', 'pipe replacement', 'water heater', 'drain unclog', 'shutoff valve'],
    permitRequired: true,
    typicalMaterialsRatio: 0.4,
  },
  'Electrician': {
    laborMin: 100, laborMax: 155,
    commonJobs: ['panel upgrade', 'outlet install', 'EV charger', 'light fixture', 'circuit breaker'],
    permitRequired: true,
    typicalMaterialsRatio: 0.35,
  },
  'HVAC Technician': {
    laborMin: 90, laborMax: 140,
    commonJobs: ['AC tune-up', 'furnace repair', 'duct cleaning', 'thermostat install', 'refrigerant recharge'],
    permitRequired: false,
    typicalMaterialsRatio: 0.45,
  },
  'Roofer': {
    laborMin: 80, laborMax: 130,
    commonJobs: ['shingle replacement', 'leak repair', 'full reroof', 'gutter install', 'storm damage'],
    permitRequired: false,
    typicalMaterialsRatio: 0.6,
  },
  'General Contractor': {
    laborMin: 85, laborMax: 135,
    commonJobs: ['kitchen remodel', 'bathroom remodel', 'addition', 'deck build', 'basement finish'],
    permitRequired: true,
    typicalMaterialsRatio: 0.55,
  },
  'Welder / Fabricator': {
    laborMin: 90, laborMax: 145,
    commonJobs: ['custom fabrication', 'structural weld', 'gate repair', 'railing install', 'trailer repair'],
    permitRequired: false,
    typicalMaterialsRatio: 0.5,
  },
  'Home Inspector': {
    laborMin: 75, laborMax: 110,
    commonJobs: ['full home inspection', 'pre-listing inspection', 'radon test', 'mold inspection', '4-point inspection'],
    permitRequired: false,
    typicalMaterialsRatio: 0.05,
  },
  'Pest Control': {
    laborMin: 60, laborMax: 100,
    commonJobs: ['termite treatment', 'rodent control', 'ant treatment', 'bed bug treatment', 'preventive spray'],
    permitRequired: false,
    typicalMaterialsRatio: 0.3,
  },
  'Arborist': {
    laborMin: 80, laborMax: 125,
    commonJobs: ['tree removal', 'tree trimming', 'stump grinding', 'disease treatment', 'emergency storm cleanup'],
    permitRequired: false,
    typicalMaterialsRatio: 0.15,
  },
  'EV Infrastructure Tech': {
    laborMin: 100, laborMax: 160,
    commonJobs: ['Level 2 charger install', 'panel upgrade for EV', 'fleet charging design', 'permit filing', 'load calc'],
    permitRequired: true,
    typicalMaterialsRatio: 0.5,
  },
  'Physical Therapist': {
    laborMin: 85, laborMax: 130,
    commonJobs: ['initial evaluation', 'manual therapy', 'home visit', 'post-surgery rehab', 'sports injury'],
    permitRequired: false,
    typicalMaterialsRatio: 0.1,
  },
  'EMT / Paramedic': {
    laborMin: 90, laborMax: 140,
    commonJobs: ['event medical standby', 'transport', 'first responder', 'training', 'consultation'],
    permitRequired: true,
    typicalMaterialsRatio: 0.2,
  },
  'Drone Ops Specialist': {
    laborMin: 85, laborMax: 135,
    commonJobs: ['roof inspection', 'construction survey', 'agricultural mapping', 'real estate photography', 'infrastructure inspection'],
    permitRequired: true,
    typicalMaterialsRatio: 0.1,
  },
  'Smart Home Integrator': {
    laborMin: 95, laborMax: 150,
    commonJobs: ['security system install', 'smart lighting setup', 'home automation', 'network setup', 'AV install'],
    permitRequired: false,
    typicalMaterialsRatio: 0.6,
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
