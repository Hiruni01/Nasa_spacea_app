import type { Crop, DailyReading, Priority, Readiness, Strategy, Telemetry } from '../types/agro'

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
export function calculateReadiness(telemetry: Telemetry, crop: Crop): Readiness {
  const data = metrics(telemetry.readings)
  const [low, high] = cropBands[crop]
  const temperatureScore = data.temperature >= low && data.temperature <= high ? 35 : 18
  const moistureScore = data.wetness >= 35 && data.wetness <= 78 ? 35 : data.wetness < 25 ? 10 : 24
  const rainScore = data.rainfall >= 1 ? 20 : 12
  const score = Math.max(0, Math.min(100, Math.round(temperatureScore + moistureScore + rainScore + (telemetry.source === 'live' ? 8 : 5))))
  const status = score >= 78 ? 'OPTIMAL' : score >= 55 ? 'CAUTION' : 'DELAY'
  const recommendation = status === 'OPTIMAL' ? `Conditions support a ${crop.toLowerCase()} planting window. Prepare beds and verify field drainage before sowing.` : status === 'CAUTION' ? 'Hold a flexible planting window. Check a soil sample and local rain gauge before committing seed.' : 'Delay planting and conserve water. Recheck soil moisture after the next meaningful rainfall event.'
  return { score, status, recommendation }
}
export function buildStrategies(telemetry: Telemetry, crop: Crop, priority: Priority): Strategy[] {
  const data = metrics(telemetry.readings)
  const dry = data.wetness < 45 || data.rainfall < 2
  const temp = Math.round(data.temperature)
  const moisture = Math.round(data.wetness)
  const priorityBoost = priority === 'Water Conservation' ? 5 : priority === 'Soil Nitrogen & Health' ? 4 : 0
  return [
    { id: 1, name: 'Existing baseline', eyebrow: 'CONTINUOUS MONOCROP', flow: [crop.split(' / ')[0], crop.split(' / ')[0], crop.split(' / ')[0]], score: Math.max(34, 58 - (dry ? 8 : 0)), water: 'HIGH', accent: 'amber', justification: `At ${temp}°C and ${moisture}% root-zone wetness, repeating ${crop.split(' / ')[0].toLowerCase()} leaves the field exposed to the same water demand.`, benefits: ['Familiar operations', 'Predictable market timing', 'High water demand', 'Nutrient drawdown risk'] },
    { id: 2, name: 'Legume & soil-health', eyebrow: 'NITROGEN + GROUND COVER', flow: [crop.split(' / ')[0], 'Mung bean', crop.split(' / ')[0]], score: Math.min(96, 78 + priorityBoost + (dry ? 2 : 0)), water: 'MEDIUM', accent: 'emerald', justification: `With ${moisture}% root-zone wetness, a short legume break can protect soil structure and add nitrogen before the next ${crop.split(' / ')[0].toLowerCase()} cycle.`, benefits: ['Natural nitrogen fixation', 'Living ground cover', 'Breaks pest cycles', 'Improves moisture retention'] },
    { id: 3, name: 'Climate-resilient', eyebrow: 'LOW-WATER ALTERNATIVE', flow: [crop.split(' / ')[0], dry ? 'Finger millet' : 'Sesame', dry ? 'Sesame' : 'Finger millet'], score: Math.min(97, 82 + (dry ? 8 : 0)), water: 'LOW', accent: 'teal', justification: dry ? `NASA shows a dry signal (${moisture}% wetness / ${data.rainfall.toFixed(1)} mm daily rain), boosting drought-adapted crops that finish with less irrigation.` : `At ${moisture}% wetness and ${data.rainfall.toFixed(1)} mm daily rain, a flexible low-water crop protects the farm if rainfall shifts.`, benefits: ['Lower irrigation demand', 'Deep-rooted resilience', 'Diversifies income', 'Protects bare-field windows'] },
  ]
}
export { cropBands }
