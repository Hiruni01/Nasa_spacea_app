import type { ClimateScenario, Crop, DailyReading, NasaSummary, Priority, Readiness, SoilProfile, Strategy, Telemetry } from '../types/agro'

const cropBands: Record<Crop, [number, number]> = {
  'Paddy / Rice': [22, 32], Maize: [18, 30], Chili: [20, 30], Tea: [18, 27],
}
const avg = (values: Array<number | null>) => {
  const clean = values.filter((value): value is number => value !== null)
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : 0
}
export const metrics = (readings: DailyReading[]): NasaSummary & {
  wetness: number
  temperature: number
  rainfall: number
  cumulativeRainfall: number
} => ({
  wetness: avg(readings.map((item) => item.rootWetness)),
  temperature: avg(readings.map((item) => item.temperature)),
  rainfall: avg(readings.map((item) => item.precipitation)),
  avgHumidityPct: (() => {
    const values = readings.map((item) => item.humidityPct).filter((value): value is number => value !== null)
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
  })(),
  cumulativeRainfall: readings.reduce((sum, item) => sum + (item.precipitation ?? 0), 0),
})
export const calculateEffectiveMoisture = (rawWetnessPercent: number, soil: SoilProfile) =>
  Math.min(1, (rawWetnessPercent / 100) * soil.retentionMultiplier) * 100

const simulatedMetrics = (telemetry: Telemetry, soil: SoilProfile, scenario: ClimateScenario) => {
  const raw = metrics(telemetry.readings)
  const rainfallFactor = 1 + scenario.rainfallDeltaPercent
  return {
    ...raw,
    temperature: raw.temperature + scenario.temperatureAnomaly,
    rainfall: Math.max(0, raw.rainfall * rainfallFactor),
    humidity: raw.avgHumidityPct === null ? null : Math.max(0, Math.min(100, raw.avgHumidityPct - (scenario.temperatureAnomaly * 2) + (scenario.rainfallDeltaPercent * 10))),
    cumulativeRainfall: Math.max(0, raw.cumulativeRainfall * rainfallFactor),
    wetness: Math.max(0, Math.min(100, raw.wetness * (1 + (0.35 * scenario.rainfallDeltaPercent)))),
    effectiveMoisture: calculateEffectiveMoisture(raw.wetness * (1 + (0.35 * scenario.rainfallDeltaPercent)), soil),
  }
}

export function calculateReadiness(telemetry: Telemetry, crop: Crop, soil: SoilProfile, scenario: ClimateScenario): Readiness {
  const data = simulatedMetrics(telemetry, soil, scenario)
  const [low, high] = cropBands[crop]
  const temperatureScore = data.temperature >= low && data.temperature <= high ? 35 : 18
  const moistureScore = data.effectiveMoisture >= 35 && data.effectiveMoisture <= 78 ? 35 : data.effectiveMoisture < 25 ? 10 : 24
  const rainScore = data.rainfall >= 1 ? 20 : 12
  const humidityScore = data.humidity === null ? 5 : data.humidity > 85 ? 3 : data.humidity < 50 ? 5 : 10
  const score = Math.max(0, Math.min(100, Math.round(temperatureScore + moistureScore + rainScore + humidityScore + (telemetry.source === 'live' ? 8 : 5))))
  const status = score >= 78 ? 'OPTIMAL' : score >= 55 ? 'CAUTION' : 'DELAY'
  const recommendation = status === 'OPTIMAL' ? `Conditions support a ${crop.toLowerCase()} planting window. Prepare beds and verify field drainage before sowing.` : status === 'CAUTION' ? 'Hold a flexible planting window. Check a soil sample and local rain gauge before committing seed.' : 'Delay planting and conserve water. Recheck soil moisture after the next meaningful rainfall event.'
  return { score, status, recommendation }
}
export function buildStrategies(telemetry: Telemetry, crop: Crop, priority: Priority, soil: SoilProfile, scenario: ClimateScenario): Strategy[] {
  const data = simulatedMetrics(telemetry, soil, scenario)
  const dry = data.effectiveMoisture < 45 || data.rainfall < 2
  const heatStress = Math.max(0, scenario.temperatureAnomaly + data.temperature - 30)
  const droughtStress = Math.max(0, -scenario.rainfallDeltaPercent * 100)
  const humidityStress = data.humidity === null ? 0 : data.humidity > 85 ? 6 : data.humidity < 50 ? 3 : 0
  const soilStress = soil.id === 'sandy' ? 5 : soil.id === 'clay' && data.rainfall > 4 ? 4 : 0
  const temp = Math.round(data.temperature)
  const moisture = Math.round(data.effectiveMoisture)
  const priorityBoost = priority === 'Water Conservation' ? 5 : priority === 'Soil Nitrogen & Health' ? 4 : 0
  const baselineScore = Math.max(28, Math.round(78 - (dry ? 10 : 0) - (heatStress * 3) - (droughtStress * 0.12) - humidityStress))
  const legumeScore = Math.min(96, Math.round(78 + priorityBoost + (soil.id === 'clay' && data.rainfall > 4 ? 7 : 0) + (data.humidity !== null && data.humidity > 85 ? 5 : 0) - (heatStress * 1.5)))
  const resilientScore = Math.min(98, Math.round(70 + (dry ? 10 : 0) + (droughtStress * 0.18) + (heatStress * 2.5) + soilStress + (data.humidity !== null && data.humidity < 50 ? 5 : 0)))
  const strategies: Strategy[] = [
    { id: 1, name: 'Existing baseline', eyebrow: 'CONTINUOUS MONOCROP', flow: [crop.split(' / ')[0], crop.split(' / ')[0], crop.split(' / ')[0]], score: baselineScore, water: 'HIGH', accent: 'amber', justification: `At ${temp}°C, ${moisture}% soil-adjusted moisture, and ${data.humidity ?? 'unknown'}% RH, repeating ${crop.split(' / ')[0].toLowerCase()} leaves the field exposed to dense-canopy disease or evaporation stress.`, benefits: ['Familiar operations', 'Predictable market timing', 'High water demand', 'Humidity-sensitive disease exposure'] },
    { id: 2, name: 'Legume & soil-health', eyebrow: 'NITROGEN + GROUND COVER', flow: [crop.split(' / ')[0], 'Mung bean', crop.split(' / ')[0]], score: legumeScore, water: 'MEDIUM', accent: 'emerald', justification: `With ${moisture}% soil-adjusted moisture and ${data.humidity ?? 'unknown'}% RH, a ventilated legume break can protect soil structure and add nitrogen before the next ${crop.split(' / ')[0].toLowerCase()} cycle.`, benefits: ['Natural nitrogen fixation', 'Living ground cover', 'Breaks pest cycles', 'Raised-bed airflow in humid zones'] },
    { id: 3, name: 'Climate-resilient', eyebrow: 'LOW-WATER ALTERNATIVE', flow: [crop.split(' / ')[0], dry ? 'Finger millet' : 'Sesame', dry ? 'Sesame' : 'Finger millet'], score: resilientScore, water: 'LOW', accent: 'teal', justification: dry ? `NASA plus the simulated stress signal (${moisture}% soil-adjusted moisture / ${data.rainfall.toFixed(1)} mm daily rain / ${data.humidity ?? 'unknown'}% RH) boosts drought-adapted crops that finish with less irrigation.` : `At ${moisture}% soil-adjusted moisture and ${data.rainfall.toFixed(1)} mm daily rain, a flexible low-water crop protects the farm if rainfall shifts.`, benefits: ['Lower irrigation demand', 'Deep-rooted resilience', 'Diversifies income', 'Protects moisture under dry air'] },
  ]
  return strategies.map((strategy) => ({ ...strategy, rank: 1 + strategies.filter((other) => other.score > strategy.score).length }))
}
export { cropBands }
