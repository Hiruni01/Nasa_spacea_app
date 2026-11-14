import type { ClimateScenario, DailyReading, FutureOutlookDay, SeasonalClimatology, SoilProfile, Telemetry } from '../types/agro'

const API = 'https://power.larc.nasa.gov/api/temporal/daily/point'
const fallbackValues = [
  [28.2, 1.8, 41, 52], [27.9, 0, 40, 50], [28.4, 3.2, 43, 55], [28.1, 0.6, 44, 56],
  [27.5, 6.4, 47, 59], [27.3, 2.1, 49, 61], [27.8, 0, 48, 60], [28.6, 0, 46, 57],
  [29.1, 0, 44, 54], [28.7, 1.2, 43, 52], [27.6, 4.8, 45, 54], [27.4, 7.6, 49, 60],
  [27.9, 0.4, 51, 63], [28.2, 0, 50, 62], [28.9, 0, 47, 58], [29.2, 0, 44, 54],
  [28.4, 2.9, 45, 55], [27.8, 5.1, 48, 59], [27.2, 9.2, 53, 65], [27.5, 3.7, 55, 67],
  [28.1, 0, 54, 66], [28.6, 0, 51, 63], [29.3, 0, 48, 59], [29.5, 0, 45, 55],
  [28.8, 1.5, 44, 53], [28.1, 4.3, 46, 56], [27.7, 6.8, 50, 61], [28.2, 0.8, 52, 64],
  [28.9, 0, 49, 60], [29.1, 0, 46, 56],
]

const isoDate = (date: Date) => date.toISOString().slice(0, 10).replace(/-/g, '')
const windowDates = () => {
  const end = new Date()
  end.setUTCDate(end.getUTCDate() - 4)
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 29)
  return { start: isoDate(start), end: isoDate(end) }
}

const clean = (value: number | undefined): number | null =>
  value === undefined || value <= -900 ? null : value

const mean = (values: Array<number | null>, fallback: number) => {
  const valid = values.filter((value): value is number => value !== null)
  return valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : fallback
}
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

function createFallback(latitude: number, longitude: number): Telemetry {
  const end = new Date()
  end.setUTCDate(end.getUTCDate() - 4)
  const readings = fallbackValues.map((values, index) => {
    const date = new Date(end)
    date.setUTCDate(end.getUTCDate() - (29 - index))
    return { date: date.toISOString().slice(0, 10), temperature: values[0], precipitation: values[1], rootWetness: values[2], topWetness: values[3] }
  })
  return { readings, source: 'fallback', fetchedAt: new Date().toISOString(), latitude, longitude }
}

export async function fetchNasapowerTelemetry(latitude: number, longitude: number): Promise<Telemetry> {
  const { start, end } = windowDates()
  const url = new URL(API)
  url.search = new URLSearchParams({
    parameters: 'T2M,PRECTOTCORR,GWETROOT,GWETTOP', community: 'AG',
    longitude: String(longitude), latitude: String(latitude), start, end, format: 'JSON',
  }).toString()
  try {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`NASA POWER responded ${response.status}`)
    const json = await response.json() as { properties?: { parameter?: Record<string, Record<string, number>> } }
    const parameters = json.properties?.parameter
    if (!parameters?.T2M || !parameters.PRECTOTCORR || !parameters.GWETROOT) throw new Error('NASA response had no parameter data')
    const readings = Object.keys(parameters.T2M).map((date) => ({
      date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`,
      temperature: clean(parameters.T2M[date]),
      precipitation: clean(parameters.PRECTOTCORR?.[date]),
      rootWetness: clean(parameters.GWETROOT?.[date]),
      topWetness: clean(parameters.GWETTOP?.[date]),
    }))
    if (readings.length < 5) throw new Error('Not enough NASA observations')
    return { readings, source: 'live', fetchedAt: new Date().toISOString(), latitude, longitude }
  } catch {
    return createFallback(latitude, longitude)
  }
}

const climatologyFromReadings = (readings: DailyReading[]): SeasonalClimatology => {
    const monthly: SeasonalClimatology['monthly'] = {}
    for (let month = 1; month <= 12; month += 1) {
      const monthReadings = readings.filter((reading) => Number(reading.date.slice(5, 7)) === month)
      monthly[month] = {
        temperature: mean(monthReadings.map((reading) => reading.temperature), 28),
        precipitation: mean(monthReadings.map((reading) => reading.precipitation), 2),
        rootWetness: mean(monthReadings.map((reading) => reading.rootWetness), 50),
      }
    }
    return { monthly }
}

export async function fetchNasapowerSeasonalClimatology(latitude: number, longitude: number, fallbackReadings: DailyReading[]): Promise<SeasonalClimatology> {
    const url = new URL(API)
    url.search = new URLSearchParams({
      parameters: 'T2M,PRECTOTCORR,GWETROOT', community: 'AG',
      longitude: String(longitude), latitude: String(latitude),
      start: '20210101', end: '20251231', format: 'JSON',
    }).toString()
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`NASA POWER climatology responded ${response.status}`)
      const json = await response.json() as { properties?: { parameter?: Record<string, Record<string, number>> } }
      const parameters = json.properties?.parameter
      if (!parameters?.T2M || !parameters.PRECTOTCORR || !parameters.GWETROOT) throw new Error('NASA climatology had no parameter data')
      const readings = Object.keys(parameters.T2M).map((date) => ({
        date: `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}`,
        temperature: clean(parameters.T2M[date]),
        precipitation: clean(parameters.PRECTOTCORR[date]),
        rootWetness: clean(parameters.GWETROOT[date]),
        topWetness: null,
      }))
      return climatologyFromReadings(readings)
    } catch {
      return climatologyFromReadings(fallbackReadings)
    }
}

export function buildFutureOutlook(telemetry: Telemetry, soil: SoilProfile, scenario: ClimateScenario, climatology: SeasonalClimatology): FutureOutlookDay[] {
    const latest = telemetry.readings[telemetry.readings.length - 1]
    const latestTemperature = latest.temperature ?? 28
    const latestMoisture = latest.rootWetness ?? 50
    const latestDate = new Date(`${latest.date}T00:00:00`)
    return Array.from({ length: 30 }, (_, index) => {
      const date = new Date(latestDate)
      date.setUTCDate(date.getUTCDate() + index + 1)
      const monthBaseline = climatology.monthly[date.getUTCMonth() + 1] ?? climatology.monthly[1]
      const progress = (index + 1) / 30
      const seasonalTemperature = latestTemperature + (monthBaseline.temperature - latestTemperature) * progress + scenario.temperatureAnomaly
      const rainfallFactor = 1 + scenario.rainfallDeltaPercent
      const projectedRainMm = Math.max(0, monthBaseline.precipitation * rainfallFactor)
      const rainfallMoistureEffect = 1 + scenario.rainfallDeltaPercent * 0.35
      const seasonalMoisture = latestMoisture + (monthBaseline.rootWetness - latestMoisture) * progress
      const projectedMoisturePct = clamp(seasonalMoisture * soil.retentionMultiplier * rainfallMoistureEffect, 0, 100)
      const confidence = 8 * (0.75 + progress * 0.25)
      return {
        date: date.toISOString().slice(0, 10),
        projectedMoisturePct,
        projectedRainMm,
        projectedTempC: seasonalTemperature,
        confidenceBandLow: seasonalTemperature - confidence,
        confidenceBandHigh: seasonalTemperature + confidence,
      }
    })
}
