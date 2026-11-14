export type Crop = 'Paddy / Rice' | 'Maize' | 'Chili' | 'Tea'
export type Priority = 'Water Conservation' | 'Soil Nitrogen & Health' | 'Pest Cycle Break' | 'Income Diversification'
export type SoilType = 'loam' | 'clay' | 'sandy' | 'alluvial'

export interface SoilProfile {
  id: SoilType
  label: string
  retentionMultiplier: number
  drainageNote: string
}

export interface ClimateScenario {
  temperatureAnomaly: number
  rainfallDeltaPercent: number
}

export interface LocationPreset {
  id: string
  name: string
  regionGroup: string
  lat: number
  lon: number
  recommendedDefaultCrop: Crop
  recommendedDefaultSoil: SoilType
  agroNote: string
}
export interface DailyReading {
  date: string; temperature: number | null; precipitation: number | null
  rootWetness: number | null; topWetness: number | null; humidityPct: number | null
}
export interface Telemetry {
  readings: DailyReading[]; source: 'live' | 'fallback'; fetchedAt: string
  latitude: number; longitude: number
}
export interface NasaSummary {
  avgHumidityPct: number | null
}
export interface SeasonalClimatology {
  monthly: Record<number, { temperature: number; precipitation: number; rootWetness: number; humidityPct: number }>
}
export interface FutureOutlookDay {
  date: string
  projectedMoisturePct: number
  projectedRainMm: number
  projectedTempC: number
  projectedHumidityPct: number
  confidenceBandLow: number
  confidenceBandHigh: number
}
export interface Readiness {
  score: number; status: 'OPTIMAL' | 'CAUTION' | 'DELAY'; recommendation: string
}
export interface Strategy {
  id: number; name: string; eyebrow: string; flow: string[]
  score: number; water: 'LOW' | 'MEDIUM' | 'HIGH'; accent: string
  justification: string; benefits: string[]; rank?: number
}
