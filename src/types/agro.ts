export type Crop = 'Paddy / Rice' | 'Maize' | 'Chili' | 'Tea'
export type Priority = 'Water Conservation' | 'Soil Nitrogen & Health' | 'Pest Cycle Break' | 'Income Diversification'

export interface LocationPreset { name: string; region: string; latitude: number; longitude: number }
export interface DailyReading {
  date: string; temperature: number | null; precipitation: number | null
  rootWetness: number | null; topWetness: number | null
}
export interface Telemetry {
  readings: DailyReading[]; source: 'live' | 'fallback'; fetchedAt: string
  latitude: number; longitude: number
}
export interface Readiness {
  score: number; status: 'OPTIMAL' | 'CAUTION' | 'DELAY'; recommendation: string
}
export interface Strategy {
  id: number; name: string; eyebrow: string; flow: string[]
  score: number; water: 'LOW' | 'MEDIUM' | 'HIGH'; accent: string
  justification: string; benefits: string[]
}
