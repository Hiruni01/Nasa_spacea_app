import type { ClimateScenario, Crop, DailyReading, Priority, Readiness, SoilProfile, Strategy, Telemetry } from '../types/agro'

const cropBands: Record<Crop, [number, number]> = {
  'Paddy / Rice': [22, 32], Maize: [18, 30], Chili: [20, 30], Tea: [18, 27],
}
const avg = (values: Array<number | null>) => {
  const clean = values.filter((value): value is number => value !== null)
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : 0
}
export const metrics = (readings: DailyReading[]) => ({
  wetness: avg(readings.map((item) => item.rootWetness)),
  temperature: avg(readings.map((item) => item.temperature)),
  rainfall: avg(readings.map((item) => item.precipitation)),
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
  const score = Math.max(0, Math.min(100, Math.round(temperatureScore + moistureScore + rainScore + (telemetry.source === 'live' ? 8 : 5))))
  const status = score >= 78 ? 'OPTIMAL' : score >= 55 ? 'CAUTION' : 'DELAY'
  const recommendation = status === 'OPTIMAL' ? `Conditions support a ${crop.toLowerCase()} planting window. Prepare beds and verify field drainage before sowing.` : status === 'CAUTION' ? 'Hold a flexible planting window. Check a soil sample and local rain gauge before committing seed.' : 'Delay planting and conserve water. Recheck soil moisture after the next meaningful rainfall event.'
  return { score, status, recommendation }
}
export function buildStrategies(telemetry: Telemetry, crop: Crop, priority: Priority, soil: SoilProfile, scenario: ClimateScenario): Strategy[] {
  const data = simulatedMetrics(telemetry, soil, scenario)
  const dry = data.effectiveMoisture < 45 || data.rainfall < 2
  const heatStress = Math.max(0, scenario.temperatureAnomaly + data.temperature - 30)
  const droughtStress = Math.max(0, -scenario.rainfallDeltaPercent * 100)
  const soilStress = soil.id === 'sandy' ? 5 : soil.id === 'clay' && data.rainfall > 4 ? 4 : 0
  const temp = Math.round(data.temperature)
  const moisture = Math.round(data.effectiveMoisture)
  const priorityBoost = priority === 'Water Conservation' ? 5 : priority === 'Soil Nitrogen & Health' ? 4 : 0
  const baselineScore = Math.max(28, Math.round(78 - (dry ? 10 : 0) - (heatStress * 3) - (droughtStress * 0.12)))
  const legumeScore = Math.min(96, Math.round(78 + priorityBoost + (soil.id === 'clay' && data.rainfall > 4 ? 7 : 0) - (heatStress * 1.5)))
  const resilientScore = Math.min(98, Math.round(70 + (dry ? 10 : 0) + (droughtStress * 0.18) + (heatStress * 2.5) + soilStress))
  const strategies: Strategy[] = [
    { id: 1, name: 'Existing baseline', eyebrow: 'CONTINUOUS MONOCROP', flow: [crop.split(' / ')[0], crop.split(' / ')[0], crop.split(' / ')[0]], score: baselineScore, water: 'HIGH', accent: 'amber', justification: `At ${temp}°C and ${moisture}% soil-adjusted moisture, repeating ${crop.split(' / ')[0].toLowerCase()} leaves the field exposed to the same water demand.`, benefits: ['Familiar operations', 'Predictable market timing', 'High water demand', 'Nutrient drawdown risk'] },
    { id: 2, name: 'Legume & soil-health', eyebrow: 'NITROGEN + GROUND COVER', flow: [crop.split(' / ')[0], 'Mung bean', crop.split(' / ')[0]], score: legumeScore, water: 'MEDIUM', accent: 'emerald', justification: `With ${moisture}% soil-adjusted moisture, a short legume break can protect soil structure and add nitrogen before the next ${crop.split(' / ')[0].toLowerCase()} cycle.`, benefits: ['Natural nitrogen fixation', 'Living ground cover', 'Breaks pest cycles', 'Improves moisture retention'] },
    { id: 3, name: 'Climate-resilient', eyebrow: 'LOW-WATER ALTERNATIVE', flow: [crop.split(' / ')[0], dry ? 'Finger millet' : 'Sesame', dry ? 'Sesame' : 'Finger millet'], score: resilientScore, water: 'LOW', accent: 'teal', justification: dry ? `NASA plus the simulated stress signal (${moisture}% soil-adjusted moisture / ${data.rainfall.toFixed(1)} mm daily rain) boosts drought-adapted crops that finish with less irrigation.` : `At ${moisture}% soil-adjusted moisture and ${data.rainfall.toFixed(1)} mm daily rain, a flexible low-water crop protects the farm if rainfall shifts.`, benefits: ['Lower irrigation demand', 'Deep-rooted resilience', 'Diversifies income', 'Protects bare-field windows'] },
  ]
  return strategies.map((strategy) => ({ ...strategy, rank: 1 + strategies.filter((other) => other.score > strategy.score).length }))
}
export { cropBands }
