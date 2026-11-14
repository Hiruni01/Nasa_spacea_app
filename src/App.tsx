import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Activity, ArrowDown, ArrowRight, BarChart3, Check, ChevronDown, CloudRain, Droplets, Github,
  Info, Leaf, LocateFixed, MapPin, Radio, RefreshCw, Satellite, ShieldCheck, Sprout, Thermometer, TrendingUp, Waves,
} from 'lucide-react'
import {
  Area, Bar, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { buildFutureOutlook, fetchNasapowerSeasonalClimatology, fetchNasapowerTelemetry } from './services/nasaPowerService'
import { buildStrategies, calculateReadiness, cropBands, metrics } from './utils/agronomyEngine'
import type { ClimateScenario, Crop, FutureOutlookDay, LocationPreset, Priority, SeasonalClimatology, SoilProfile, SoilType, Strategy, Telemetry } from './types/agro'

const locations: LocationPreset[] = [
  { id: 'colombo', name: 'Colombo (Homagama / Padukka Wet Zone)', regionGroup: 'Sri Lanka — Wet Zone (Western, Southern & Sabaragamuwa)', lat: 6.844, lon: 80.0024, recommendedDefaultCrop: 'Paddy / Rice', recommendedDefaultSoil: 'alluvial', agroNote: 'Low-country wet zone with peri-urban paddy tracts, wetland leafy vegetables, and high monsoon rainfall' },
  { id: 'gampaha', name: 'Gampaha (Attanagalla / Minuwangoda)', regionGroup: 'Sri Lanka — Wet Zone (Western, Southern & Sabaragamuwa)', lat: 7.084, lon: 80.0098, recommendedDefaultCrop: 'Paddy / Rice', recommendedDefaultSoil: 'alluvial', agroNote: 'Wet-zone lowland rice, pineapple, and coconut intercropping basin' },
  { id: 'kalutara', name: 'Kalutara (Horana / Bentota Wet Zone)', regionGroup: 'Sri Lanka — Wet Zone (Western, Southern & Sabaragamuwa)', lat: 6.5854, lon: 79.9607, recommendedDefaultCrop: 'Paddy / Rice', recommendedDefaultSoil: 'clay', agroNote: 'High-rainfall coastal and inland wet zone prone to seasonal floodwater logging' },
  { id: 'galle-matara', name: 'Galle / Matara (Nilwala Wet Basin)', regionGroup: 'Sri Lanka — Wet Zone (Western, Southern & Sabaragamuwa)', lat: 6.0535, lon: 80.221, recommendedDefaultCrop: 'Tea', recommendedDefaultSoil: 'clay', agroNote: 'Southern wet-zone tea, cinnamon, and lowland paddy corridor' },
  { id: 'ratnapura', name: 'Ratnapura (Sabaragamuwa Wet Foothills)', regionGroup: 'Sri Lanka — Wet Zone (Western, Southern & Sabaragamuwa)', lat: 6.6828, lon: 80.3992, recommendedDefaultCrop: 'Tea', recommendedDefaultSoil: 'clay', agroNote: 'Heavy southwest monsoon rainfall zone suited for tea and drainage-managed rotations' },
  { id: 'kegalle', name: 'Kegalle (Mid-Country Wet Belt)', regionGroup: 'Sri Lanka — Wet Zone (Western, Southern & Sabaragamuwa)', lat: 7.2513, lon: 80.3464, recommendedDefaultCrop: 'Tea', recommendedDefaultSoil: 'loam', agroNote: 'Mid-country wet spice, banana, and terraced paddy agro-ecosystem' },
  { id: 'nuwara-eliya', name: 'Nuwara Eliya (Up-Country Wet Highlands)', regionGroup: 'Sri Lanka — Central Highlands', lat: 6.9497, lon: 80.7891, recommendedDefaultCrop: 'Tea', recommendedDefaultSoil: 'loam', agroNote: 'Cool high-altitude wet zone for Ceylon tea and temperate vegetables' },
  { id: 'kandy', name: 'Kandy (Mid-Country Wet Highlands)', regionGroup: 'Sri Lanka — Central Highlands', lat: 7.2906, lon: 80.6337, recommendedDefaultCrop: 'Chili', recommendedDefaultSoil: 'loam', agroNote: 'Mid-elevation mixed home-gardens, vegetables, and terraced paddy' },
  { id: 'matale', name: 'Matale (Central Intermediate Spice Belt)', regionGroup: 'Sri Lanka — Central Highlands', lat: 7.4675, lon: 80.6234, recommendedDefaultCrop: 'Chili', recommendedDefaultSoil: 'loam', agroNote: 'Transition zone for spice crops, vegetables, and rainfed/irrigated paddy' },
  { id: 'badulla-welimada', name: 'Badulla / Welimada (Uva Highlands)', regionGroup: 'Sri Lanka — Central Highlands', lat: 6.9934, lon: 81.055, recommendedDefaultCrop: 'Chili', recommendedDefaultSoil: 'loam', agroNote: 'Up-country intermediate vegetable, potato, and highland tea plateau' },
  { id: 'kurunegala', name: 'Kurunegala (North Western Paddy Belt)', regionGroup: 'Sri Lanka — Intermediate Zone', lat: 7.4818, lon: 80.3609, recommendedDefaultCrop: 'Paddy / Rice', recommendedDefaultSoil: 'loam', agroNote: 'Major intermediate-zone rice and coconut-intercropped farming district' },
  { id: 'puttalam', name: 'Puttalam (North Western Coastal Belt)', regionGroup: 'Sri Lanka — Intermediate Zone', lat: 8.0408, lon: 79.8394, recommendedDefaultCrop: 'Chili', recommendedDefaultSoil: 'sandy', agroNote: 'Sandy coastal dry-intermediate zone specializing in chilies, onions, and horticulture' },
  { id: 'monaragala', name: 'Monaragala (Uva Lower Maize Belt)', regionGroup: 'Sri Lanka — Intermediate Zone', lat: 6.8728, lon: 81.3507, recommendedDefaultCrop: 'Maize', recommendedDefaultSoil: 'sandy', agroNote: 'Leading rainfed maize, millet, and dry-grain farming district' },
  { id: 'anuradhapura', name: 'Anuradhapura (North Central Dry Zone)', regionGroup: 'Sri Lanka — Dry Zone (North, North Central & East)', lat: 8.3114, lon: 80.4037, recommendedDefaultCrop: 'Paddy / Rice', recommendedDefaultSoil: 'alluvial', agroNote: 'Ancient cascade tank-irrigated rice bowl vulnerable to Maha/Yala rainfall shifts' },
  { id: 'polonnaruwa', name: 'Polonnaruwa (Mahaweli Rice Bowl)', regionGroup: 'Sri Lanka — Dry Zone (North, North Central & East)', lat: 7.9403, lon: 81.0188, recommendedDefaultCrop: 'Paddy / Rice', recommendedDefaultSoil: 'alluvial', agroNote: 'Intensive irrigated paddy zone benefiting from off-season legume nitrogen fixation' },
  { id: 'hambantota', name: 'Hambantota (Southern Semi-Arid Zone)', regionGroup: 'Sri Lanka — Dry Zone (North, North Central & East)', lat: 6.1429, lon: 81.1212, recommendedDefaultCrop: 'Chili', recommendedDefaultSoil: 'sandy', agroNote: 'Hot semi-arid dry zone where water-conserving rotations prevent crop failure' },
  { id: 'ampara', name: 'Ampara (Eastern Irrigated Paddy Belt)', regionGroup: 'Sri Lanka — Dry Zone (North, North Central & East)', lat: 7.2975, lon: 81.6747, recommendedDefaultCrop: 'Paddy / Rice', recommendedDefaultSoil: 'alluvial', agroNote: 'Gal Oya irrigated eastern coastal rice plain with high seasonal evaporation' },
  { id: 'batticaloa-trincomalee', name: 'Batticaloa / Trincomalee (Eastern Dry Plain)', regionGroup: 'Sri Lanka — Dry Zone (North, North Central & East)', lat: 7.731, lon: 81.6747, recommendedDefaultCrop: 'Paddy / Rice', recommendedDefaultSoil: 'alluvial', agroNote: 'Northeast monsoon coastal plain balancing flood risk and dry-season heat' },
  { id: 'jaffna', name: 'Jaffna (Northern Limestone Peninsula)', regionGroup: 'Sri Lanka — Dry Zone (North, North Central & East)', lat: 9.6615, lon: 80.0255, recommendedDefaultCrop: 'Chili', recommendedDefaultSoil: 'sandy', agroNote: 'Groundwater-dependent northern peninsula cultivating high-value chilies and red onions' },
  { id: 'vavuniya-kilinochchi', name: 'Vavuniya / Kilinochchi (Northern Vanni)', regionGroup: 'Sri Lanka — Dry Zone (North, North Central & East)', lat: 8.7542, lon: 80.4982, recommendedDefaultCrop: 'Paddy / Rice', recommendedDefaultSoil: 'loam', agroNote: 'Northern dry-zone tank-fed paddy and pulse cultivation region' },
  { id: 'punjab', name: 'Punjab, India (Indo-Gangetic Plain)', regionGroup: 'Global Agricultural Benchmarks', lat: 30.901, lon: 75.8573, recommendedDefaultCrop: 'Paddy / Rice', recommendedDefaultSoil: 'alluvial', agroNote: 'Intensive rice-wheat plain facing groundwater depletion and heat stress' },
  { id: 'mekong-delta', name: 'Mekong Delta, Vietnam (Can Tho)', regionGroup: 'Global Agricultural Benchmarks', lat: 10.0452, lon: 105.7469, recommendedDefaultCrop: 'Paddy / Rice', recommendedDefaultSoil: 'alluvial', agroNote: 'Low-lying delta rice basin adapting to shifting monsoon onset and salinity' },
  { id: 'iowa', name: 'Iowa, USA (Midwest Corn Belt)', regionGroup: 'Global Agricultural Benchmarks', lat: 41.878, lon: -93.0977, recommendedDefaultCrop: 'Maize', recommendedDefaultSoil: 'loam', agroNote: 'Temperate rainfed maize-soybean rotation benchmark' },
  { id: 'nakuru', name: 'Nakuru, Kenya (Rift Valley Highlands)', regionGroup: 'Global Agricultural Benchmarks', lat: -0.3031, lon: 36.08, recommendedDefaultCrop: 'Maize', recommendedDefaultSoil: 'loam', agroNote: 'East African highland smallholder maize and legume intercropping region' },
  { id: 'mendoza', name: 'Mendoza, Argentina (Andean Arid Valley)', regionGroup: 'Global Agricultural Benchmarks', lat: -32.8895, lon: -68.8458, recommendedDefaultCrop: 'Chili', recommendedDefaultSoil: 'sandy', agroNote: 'Arid snowmelt-irrigated valley sensitive to temperature and precipitation anomalies' },
]
const locationGroups = locations.reduce<Record<string, LocationPreset[]>>((groups, preset) => {
  groups[preset.regionGroup] = [...(groups[preset.regionGroup] ?? []), preset]
  return groups
}, {})
const defaultLocation = locations[0]
const soilProfiles: SoilProfile[] = [
  { id: 'loam', label: 'Loam (Balanced Drainage & Retention)', retentionMultiplier: 1, drainageNote: 'Balanced moisture holding; ideal baseline' },
  { id: 'clay', label: 'Clay / Heavy Soil (High Water Retention)', retentionMultiplier: 1.15, drainageNote: 'Holds moisture longer during dry spells; watch for waterlogging in heavy rain' },
  { id: 'sandy', label: 'Sandy / Red-Yellow Latosol (Fast Draining)', retentionMultiplier: 0.8, drainageNote: 'Drains rapidly; requires mulching or drought-hardy crops when rainfall drops' },
  { id: 'alluvial', label: 'Alluvial Paddy Soil (Lowland Clay-Loam)', retentionMultiplier: 1.1, drainageNote: 'High water-holding capacity suited for flooded rice; benefits from off-season legumes' },
]
const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

function App() {
  const [location, setLocation] = useState(defaultLocation)
  const [latitude, setLatitude] = useState(String(defaultLocation.lat))
  const [longitude, setLongitude] = useState(String(defaultLocation.lon))
  const [isCustomCoordinates, setIsCustomCoordinates] = useState(false)
  const [coordinateError, setCoordinateError] = useState('')
  const [locating, setLocating] = useState(false)
  const [crop, setCrop] = useState<Crop>(defaultLocation.recommendedDefaultCrop)
  const [priority, setPriority] = useState<Priority>('Water Conservation')
  const [soilType, setSoilType] = useState<SoilType>(defaultLocation.recommendedDefaultSoil)
  const [scenario, setScenario] = useState<ClimateScenario>({ temperatureAnomaly: 0, rainfallDeltaPercent: 0 })
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null)
  const [climatology, setClimatology] = useState<SeasonalClimatology | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [analyzerPulse, setAnalyzerPulse] = useState(false)
  const [showMoisture, setShowMoisture] = useState(true)
  const [showRainfall, setShowRainfall] = useState(true)
  const [showHumidity, setShowHumidity] = useState(true)

  const analyze = async (latitudeValue = latitude, longitudeValue = longitude, customCoordinates = false) => {
    if (!latitudeValue.trim() || !longitudeValue.trim()) {
      setCoordinateError('Enter both latitude and longitude before analyzing.')
      return
    }
    const lat = Number(latitudeValue)
    const lon = Number(longitudeValue)
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      setCoordinateError('Latitude must be -90 to 90 and longitude must be -180 to 180.')
      return
    }
    setCoordinateError('')
    setIsCustomCoordinates(customCoordinates)
    setLoading(true)
    const nextTelemetry = await fetchNasapowerTelemetry(lat, lon)
    const nextClimatology = await fetchNasapowerSeasonalClimatology(lat, lon, nextTelemetry.readings)
    setTelemetry(nextTelemetry)
    setClimatology(nextClimatology)
    setLoading(false)
  }
  useEffect(() => { void analyze() }, [])

  const soil = soilProfiles.find((profile) => profile.id === soilType) ?? soilProfiles[0]
  const data = useMemo(() => telemetry ? metrics(telemetry.readings) : null, [telemetry])
  const scenarioData = useMemo(() => {
    if (!data) return null
    const rainfallFactor = 1 + scenario.rainfallDeltaPercent
    const simulatedRawMoisture = Math.max(0, Math.min(100, data.wetness * (1 + 0.35 * scenario.rainfallDeltaPercent)))
    return {
      rawMoisture: data.wetness,
      effectiveMoisture: Math.min(100, simulatedRawMoisture * soil.retentionMultiplier),
      temperature: data.temperature + scenario.temperatureAnomaly,
      rainfall: Math.max(0, data.rainfall * rainfallFactor),
      humidity: data.avgHumidityPct === null ? null : Math.max(0, Math.min(100, data.avgHumidityPct - (scenario.temperatureAnomaly * 2) + (scenario.rainfallDeltaPercent * 10))),
      cumulativeRainfall: Math.max(0, data.cumulativeRainfall * rainfallFactor),
    }
  }, [data, scenario, soil])
  const readiness = useMemo(() => telemetry ? calculateReadiness(telemetry, crop, soil, scenario) : null, [telemetry, crop, soil, scenario])
  const strategies = useMemo(() => telemetry ? buildStrategies(telemetry, crop, priority, soil, scenario) : [], [telemetry, crop, priority, soil, scenario])
  const chartData = useMemo(() => {
    if (!telemetry?.readings.length) return []
    return telemetry.readings.map((item) => ({
      date: formatDate(item.date), moisture: item.rootWetness === null ? null : item.rootWetness <= 1 ? item.rootWetness * 100 : item.rootWetness,
      rainfall: item.precipitation, temperature: item.temperature, humidity: item.humidityPct,
    }))
  }, [telemetry])
  const futureOutlook = useMemo<FutureOutlookDay[]>(() => telemetry && climatology ? buildFutureOutlook(telemetry, soil, scenario, climatology) : [], [telemetry, climatology, soil, scenario])
  const futureChartData = useMemo(() => futureOutlook.map((item) => ({
    date: formatDate(item.date), projectedMoisturePct: item.projectedMoisturePct, projectedRainMm: item.projectedRainMm,
    projectedTempC: item.projectedTempC, projectedHumidityPct: item.projectedHumidityPct, confidenceBandLow: item.confidenceBandLow, confidenceBandHigh: item.confidenceBandHigh,
  })), [futureOutlook])
  const futureAverageTemperature = futureOutlook.length ? futureOutlook.reduce((sum, item) => sum + item.projectedTempC, 0) / futureOutlook.length : 0
  const humidityStatus = data?.avgHumidityPct === null || data?.avgHumidityPct === undefined ? 'No RH2M data' : data.avgHumidityPct > 85 ? 'High Fungal / Blight Risk' : data.avgHumidityPct < 50 ? 'High Evaporation Stress' : 'Balanced Canopy Humidity'
  const hasRootMoisture = telemetry?.readings.some((reading) => reading.rootWetness !== null) ?? false
  const activeLocationName = isCustomCoordinates ? `Custom Plot (${Number(latitude).toFixed(4)}°, ${Number(longitude).toFixed(4)}°)` : location.name
  const chooseLocation = (selected: LocationPreset) => {
    setIsCustomCoordinates(false)
    setCoordinateError('')
    setLocation(selected)
    setLatitude(String(selected.lat))
    setLongitude(String(selected.lon))
    setCrop(selected.recommendedDefaultCrop)
    setSoilType(selected.recommendedDefaultSoil)
    void analyze(String(selected.lat), String(selected.lon))
  }
  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setCoordinateError('Location access blocked—enter coordinates manually or choose a preset zone.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLatitude = position.coords.latitude.toFixed(4)
        const nextLongitude = position.coords.longitude.toFixed(4)
        setLatitude(nextLatitude)
        setLongitude(nextLongitude)
        void analyze(nextLatitude, nextLongitude, true).finally(() => setLocating(false))
      },
      () => {
        setLocating(false)
        setCoordinateError('Location access blocked—enter coordinates manually or choose a preset zone.')
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  }
  const focusAnalyzer = (demo = false) => {
    if (demo) setScenario({ temperatureAnomaly: 2, rainfallDeltaPercent: -0.3 })
    setAnalyzerPulse(true)
    document.getElementById('analyzer')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => setAnalyzerPulse(false), 1400)
  }
  const readinessTone = readiness?.status === 'OPTIMAL' ? 'border-emerald-200 bg-emerald-50' : readiness?.status === 'CAUTION' ? 'border-amber-200 bg-amber-50' : 'border-rose-200 bg-rose-50'

  return (
    <div className="min-h-screen bg-stone-50 text-ink grain">
      <main className="mx-auto max-w-[1440px] px-5 pb-16 lg:px-10">
        <section id="overview" className="relative left-1/2 m-0 min-h-screen w-full w-screen -translate-x-1/2 overflow-hidden bg-cover bg-center p-0 text-white" style={{ backgroundImage: "linear-gradient(90deg, rgba(2, 6, 23, .88), rgba(6, 78, 59, .7), rgba(2, 6, 23, .5)), url('https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=2000&q=80')" }}>
          <div className="relative mx-auto flex min-h-[620px] max-w-6xl flex-col">
            <nav className="flex items-center justify-between rounded-full bg-white/95 px-4 py-3 text-slate-950 shadow-lg backdrop-blur-md sm:px-6">
              <a href="#overview" className="flex items-center gap-2 font-bold"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-lime-500 text-slate-950"><Sprout size={17} /></span><span>Field Shift</span></a>
              <div className="hidden items-center gap-6 text-xs font-semibold text-slate-600 xl:flex"><a href="#overview" className="transition hover:text-emerald-700">Home</a><a href="#telemetry" className="transition hover:text-emerald-700">NASA Telemetry</a><a href="#strategies" className="transition hover:text-emerald-700">Crop Rotations</a><a href="#impact" className="transition hover:text-emerald-700">Impact</a><a href="#methodology" className="transition hover:text-emerald-700">Methodology</a></div>
              <button onClick={() => focusAnalyzer()} className="flex items-center gap-2 rounded-full bg-lime-500 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-lime-400 sm:px-5 sm:py-2.5">Launch Analyzer <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-lime-400"><ArrowRight size={12} /></span></button>
            </nav>
            <div className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1.05fr_.95fr] lg:py-20">
              <div><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-lime-300/35 bg-lime-400/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-lime-200"><Satellite size={13} /> NASA Space Apps Challenge 2026 <span className="text-lime-300/50">•</span> Powered by NASA POWER API</div><h1 className="max-w-2xl text-4xl font-bold leading-[1.1] tracking-tight text-white md:text-6xl">Sustainable Farming for a Climate-Resilient Future</h1><p className="mt-4 max-w-xl text-base leading-7 text-stone-200 md:text-lg">Empowering smallholder farmers with real-time NASA satellite telemetry, soil-adjusted planting readiness, and adaptive multi-season crop rotations.</p><div className="mt-7 flex flex-wrap items-center gap-5"><button onClick={() => focusAnalyzer()} className="flex items-center gap-2 rounded-full bg-lime-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-lime-400">Analyze Your Farm <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-lime-400"><ArrowRight size={13} /></span></button><div className="flex items-center gap-2 text-xs text-stone-200"><span className="text-xl text-lime-300">✦</span><span><strong className="block text-white">NASA POWER</strong><span>Live AG Satellite Data</span></span></div></div></div>
              <div className="flex items-end justify-end gap-4 self-end"><button onClick={() => focusAnalyzer(true)} className="group relative h-48 w-1/2 overflow-hidden rounded-2xl border border-white/20 bg-slate-900/30 text-left shadow-2xl backdrop-blur-sm sm:h-56"><img src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=800&q=80" alt="Crop field demo preview" className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-105" /><span className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" /><span className="absolute inset-0 flex items-center justify-center"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/80 text-emerald-900 shadow-lg"><ArrowRight size={19} /></span></span><span className="absolute bottom-4 left-4 text-sm font-bold text-white">Try Drought Demo</span></button><div className="hidden w-1/2 rounded-2xl border border-white/20 bg-white/15 p-5 text-white shadow-2xl backdrop-blur-md sm:block"><div className="mb-8 flex h-10 w-10 items-center justify-center rounded-full bg-white text-emerald-800"><Droplets size={18} /></div><h3 className="text-lg font-bold">Real-Time Soil &amp; Climate Telemetry</h3><p className="mt-2 text-xs leading-5 text-stone-200">GWETROOT, T2M, and PRECTOTCORR telemetry turns a satellite grid into an actionable field signal.</p></div></div>
            </div>
            <div className="grid w-full border-t border-white/10 bg-slate-950/90 px-5 py-4 sm:grid-cols-5 lg:px-10"><span className="text-center text-[10px] font-bold tracking-wider text-slate-400">NASA POWER API</span><span className="text-center text-[10px] font-bold tracking-wider text-slate-400">NASA LaRC EARTH SCIENCE</span><span className="text-center text-[10px] font-bold tracking-wider text-slate-400">AGROCLIMATOLOGY</span><span className="text-center text-[10px] font-bold tracking-wider text-slate-400">SOIL MOISTURE</span><span className="text-center text-[10px] font-bold tracking-wider text-slate-400">OPEN DATA · MIT</span></div>
          </div>
        </section>
        <section id="impact" className="-mx-5 bg-white px-5 py-16 lg:-mx-10 lg:px-10">
          <div className="mx-auto max-w-6xl"><h2 className="mx-auto max-w-3xl text-center text-2xl font-bold text-slate-900 md:text-4xl">Bridging Space Observation and <span className="text-stone-400">Sustainable Agriculture Through Data-Driven Insights</span></h2><div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-12"><PhotoCard className="h-[420px] md:col-span-5" image="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1000&q=80" caption="Root-zone soil moisture monitoring helps farmers time planting windows and avoid early-season dry spells." /><div className="flex flex-col gap-5 md:col-span-7"><PhotoCard className="h-[200px]" image="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80" caption="Multi-season legume and drought-hardy crop rotations restore soil nitrogen and break pest cycles naturally." /><div className="grid h-[200px] grid-cols-1 gap-5 sm:grid-cols-2"><PhotoCard image="https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&w=800&q=80" caption="Local soil retention modeling adapts satellite grids to Clay, Loam, Sandy, and Alluvial fields." /><PhotoCard image="https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=800&q=80" caption="What-if climate stress simulations prepare farms for +2°C warming and shifting monsoon rainfall." /></div></div></div></div>
        </section>
        <section id="telemetry" className="border-b border-stone-200 bg-stone-50 px-0 py-12"><div className="mx-auto max-w-6xl"><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><h2 className="text-2xl font-bold text-slate-900">Platform Capabilities <span className="text-stone-400">in Numbers</span></h2><p className="max-w-md text-sm leading-6 text-slate-500">Open NASA data becomes practical farm intelligence for climate-resilient decisions, from planting readiness to adaptive rotations.</p></div><div className="mt-8 grid grid-cols-2 gap-8 md:grid-cols-4"><Metric value="4+" label="NASA POWER Agroclimatology Parameters" /><Metric value="3" label="Adaptive Crop-Rotation Strategies Compared" /><Metric value="30-Day" label="Daily Satellite Soil & Rainfall Window" /><Metric value="0.5°" label="Global Satellite Grid Resolution" /></div></div></section>

        <section id="analyzer" className={`scroll-mt-24 rounded-2xl border border-stone-200/80 bg-white p-4 text-emerald-950 shadow-sm transition-all hover:shadow-md lg:p-5 ${analyzerPulse ? 'ring-4 ring-amber-300/70' : ''}`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><MapPin size={17} className="text-amber-500" /><h2 className="font-semibold">Farm profile</h2></div><span className="text-xs text-slate-500">Personalize your field signal</span></div>
          <div className="grid gap-3 xl:grid-cols-[1.2fr_1fr_1fr_1.2fr_1.45fr_auto]">
            <label className="relative block"><span className="mb-1.5 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Agricultural zone <button type="button" onClick={() => setIsCustomCoordinates((value) => !value)} className={`normal-case tracking-normal ${isCustomCoordinates ? 'text-amber-600' : 'text-emerald-700'} hover:text-amber-600`}>{isCustomCoordinates ? 'Preset zones' : 'Custom Coordinates'}</button></span><select value={isCustomCoordinates ? 'custom' : location.id} onChange={(e) => { if (e.target.value === 'custom') { setIsCustomCoordinates(true); setCoordinateError('') } else { const selected = locations.find((item) => item.id === e.target.value); if (selected) chooseLocation(selected) } }} className="w-full appearance-none rounded-xl border border-emerald-100/15 bg-emerald-900/60 px-3 py-3 text-sm text-stone-50 outline-none focus:border-amber-400"><option value="custom">Custom Farm Coordinates...</option>{Object.entries(locationGroups).map(([group, presets]) => <optgroup key={group} label={group}>{presets.map((preset) => <option key={preset.id} value={preset.id}>{preset.name}</option>)}</optgroup>)}</select><ChevronDown size={16} className="pointer-events-none absolute bottom-3.5 right-3 text-slate-400" /></label>
            <label><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Baseline crop</span><select value={crop} onChange={(e) => setCrop(e.target.value as Crop)} className="w-full rounded-xl border border-emerald-100/15 bg-emerald-900/60 px-3 py-3 text-sm text-stone-50 outline-none focus:border-amber-400"><option>Paddy / Rice</option><option>Maize</option><option>Chili</option><option>Tea</option></select></label>
            <label><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Farmer priority</span><select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="w-full rounded-xl border border-emerald-100/15 bg-emerald-900/60 px-3 py-3 text-sm text-stone-50 outline-none focus:border-amber-400"><option>Water Conservation</option><option>Soil Nitrogen &amp; Health</option><option>Pest Cycle Break</option><option>Income Diversification</option></select></label>
            <label><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Local soil type</span><select value={soilType} onChange={(e) => setSoilType(e.target.value as SoilType)} className="w-full rounded-xl border border-emerald-100/15 bg-emerald-900/60 px-3 py-3 text-sm text-stone-50 outline-none focus:border-amber-400">{soilProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}</select></label>
            <div><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Custom coordinates</span><div className="flex gap-2"><input type="number" min="-90" max="90" step="0.0001" aria-label="Latitude" value={latitude} onChange={(e) => { setLatitude(e.target.value); setCoordinateError(''); setIsCustomCoordinates(true) }} className="w-1/2 rounded-xl border border-emerald-100/15 bg-emerald-900/60 px-3 py-3 text-sm text-stone-50 outline-none focus:border-amber-400" placeholder="Latitude" /><input type="number" min="-180" max="180" step="0.0001" aria-label="Longitude" value={longitude} onChange={(e) => { setLongitude(e.target.value); setCoordinateError(''); setIsCustomCoordinates(true) }} className="w-1/2 rounded-xl border border-emerald-100/15 bg-emerald-900/60 px-3 py-3 text-sm text-stone-50 outline-none focus:border-amber-400" placeholder="Longitude" /></div><button type="button" onClick={useMyLocation} disabled={locating || loading} className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-amber-600 disabled:cursor-wait disabled:opacity-60">{locating ? <RefreshCw size={14} className="animate-spin" /> : <LocateFixed size={14} />}{locating ? 'Locating...' : 'Use My Location'}</button></div>
            <button onClick={() => void analyze(latitude, longitude, isCustomCoordinates)} disabled={loading} className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-emerald-950 transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-70">{loading ? <RefreshCw size={17} className="animate-spin" /> : <Sprout size={17} />}{loading ? 'Analyzing…' : isCustomCoordinates ? 'Analyze Coordinates' : 'Analyze farm'}<ArrowRight size={16} /></button>
          </div>
          {coordinateError && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">{coordinateError}</p>}
          <div className={`mt-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs leading-5 ${isCustomCoordinates ? 'bg-amber-50 text-amber-950' : 'bg-emerald-50 text-emerald-900'}`}><MapPin size={14} className="mt-0.5 shrink-0 text-emerald-700" /><span><strong>{isCustomCoordinates ? activeLocationName : location.regionGroup}:</strong> {isCustomCoordinates ? 'User-defined coordinates ready for NASA POWER telemetry and seasonal outlook analysis.' : location.agroNote}</span></div>
        </section>

        {loading || !readiness || !data ? <LoadingState /> : <>
          <ScenarioPanel scenario={scenario} onChange={setScenario} onReset={() => setScenario({ temperatureAnomaly: 0, rainfallDeltaPercent: 0 })} />
          <section className="grid gap-4 py-8 lg:grid-cols-[1.15fr_.85fr]">
            <div className={`relative overflow-hidden rounded-2xl border p-6 text-emerald-950 shadow-sm ${readinessTone}`}>
              <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full border-[34px] border-emerald-950/5" /><div className="absolute -right-20 -top-10 h-48 w-48 rounded-full border border-emerald-950/5" />
              <div className="relative flex h-full flex-col justify-between gap-8"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-slate-500">Planting readiness</p><h2 className="mt-2 text-4xl font-bold tracking-tight">{readiness.status}</h2></div><div className="flex items-center gap-3"><AnimatedGauge score={readiness.score} size={72} /><span className="hidden max-w-[190px] rounded-full bg-emerald-950/5 px-3 py-1.5 text-center text-xs font-bold tracking-wider sm:block">{activeLocationName.toUpperCase()} FIELD</span></div></div><div><p className="max-w-xl text-sm leading-6 text-slate-700">{readiness.recommendation}</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-emerald-950/10"><div className="h-full rounded-full bg-emerald-600 transition-all duration-700" style={{ width: `${readiness.score}%` }} /></div><div className="mt-2 flex justify-between text-[11px] font-medium text-slate-500"><span>Resilience score</span><span className="font-bold tabular-nums text-emerald-950">{readiness.score} / 100</span></div></div></div>
            </div>
            {!hasRootMoisture && <div className="col-span-full flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900"><Info size={15} className="mt-0.5 shrink-0 text-amber-600" /><p>Ocean or non-agricultural grid cell detected—select land coordinates to view root-zone soil moisture.</p></div>}
            <div className="grid grid-cols-2 gap-3">{[
              { label: 'NASA root-zone wetness', code: 'GWETROOT · RAW', value: hasRootMoisture ? `${Math.round(data.wetness)}%` : '—', detail: hasRootMoisture ? `Effective: ${Math.round(scenarioData?.effectiveMoisture ?? 0)}%` : 'No land-grid moisture value', icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50', badge: false },
              { label: 'Air temperature', code: 'T2M · 2m', value: `${(scenarioData?.temperature ?? 0).toFixed(1)}°C`, detail: scenario.temperatureAnomaly ? 'Scenario-adjusted' : 'Live baseline', icon: Thermometer, color: 'text-orange-600', bg: 'bg-orange-50', badge: false },
              { label: 'Avg daily rainfall', code: 'PRECTOTCORR', value: `${(scenarioData?.rainfall ?? 0).toFixed(1)} mm`, detail: scenario.rainfallDeltaPercent ? 'Scenario-adjusted' : 'Live baseline', icon: CloudRain, color: 'text-sky-600', bg: 'bg-sky-50', badge: false },
              { label: 'Relative humidity', code: 'RH2M · 2m', value: data.avgHumidityPct === null ? '—' : `${Math.round(data.avgHumidityPct)}%`, detail: humidityStatus, icon: Waves, color: 'text-cyan-600', bg: 'bg-cyan-50', badge: true },
              { label: '30-day cumulative', code: 'PRECIPITATION', value: `${Math.round(scenarioData?.cumulativeRainfall ?? 0)} mm`, detail: 'Scenario projection', icon: TrendingUp, color: 'text-emerald-700', bg: 'bg-emerald-50', badge: false },
            ].map((item, index) => <motion.div key={item.code} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, delay: index * 0.08, ease: 'easeOut' }} className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"><div className={`mb-4 flex h-8 w-8 items-center justify-center rounded-lg ${item.bg} ${item.color}`}><item.icon size={16} /></div><p className="text-2xl font-bold tracking-tight tabular-nums text-emerald-950">{item.value}</p><p className="mt-1 text-xs font-semibold text-slate-600">{item.label}</p><p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${item.badge ? humidityStatus === 'Balanced Canopy Humidity' ? 'bg-emerald-100 text-emerald-700' : humidityStatus === 'High Evaporation Stress' ? 'bg-orange-100 text-orange-800' : 'bg-amber-100 text-amber-800' : 'text-teal-700'}`}>{item.detail}</p><p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.code}</p></motion.div>)}</div>
          </section>
          <div className="mb-8 flex items-start gap-3 rounded-xl border border-emerald-900/10 bg-white/70 px-4 py-3 text-xs text-slate-600"><Droplets size={16} className="mt-0.5 shrink-0 text-teal-700" /><p><strong className="text-emerald-950">Soil-adjusted effective moisture:</strong> {Math.round(scenarioData?.effectiveMoisture ?? 0)}% using a ×{soil.retentionMultiplier.toFixed(2)} {soil.label.split(' (')[0].toLowerCase()} retention factor. {soil.drainageNote}.</p></div>

          <div id="strategies" className="mb-4 scroll-mt-24 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-600">The decision set</p><h2 className="mt-1 text-2xl font-bold text-emerald-950">Shift the rotation, protect the farm.</h2></div><div className="flex items-center gap-2 text-xs text-slate-500"><span className="relative flex h-2 w-2"><span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${telemetry?.source === 'live' ? 'bg-emerald-400' : 'bg-amber-400'}`} /><span className={`relative inline-flex h-2 w-2 rounded-full ${telemetry?.source === 'live' ? 'bg-emerald-500' : 'bg-amber-500'}`} /></span>{telemetry?.source === 'live' ? 'Live NASA POWER Telemetry' : 'Cached Reference Snapshot'}<Info size={14} /></div></div>
          <section className="grid gap-4 lg:grid-cols-3">{strategies.map((strategy) => <StrategyCard key={strategy.id} strategy={strategy} expanded={expanded === strategy.id} onExpand={() => setExpanded(expanded === strategy.id ? null : strategy.id)} />)}</section>

          <section className="mt-12 grid gap-5 lg:grid-cols-2">
            <ChartPanel title="Root-zone moisture & rainfall" subtitle="GWETROOT (%) alongside PRECTOTCORR (mm/day)" controls={<><ChartToggle label="Soil Moisture" color="bg-emerald-500" active={showMoisture} onClick={() => setShowMoisture((value) => !value)} /><ChartToggle label="Rainfall Bars" color="bg-sky-400" active={showRainfall} onClick={() => setShowRainfall((value) => !value)} /></>}><ResponsiveContainer width="100%" height={270}><ComposedChart data={chartData}><defs><linearGradient id="moistureFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={.35} /><stop offset="65%" stopColor="#10b981" stopOpacity={.12} /><stop offset="100%" stopColor="#10b981" stopOpacity={0} /></linearGradient><linearGradient id="rainGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity={.95} /><stop offset="100%" stopColor="#0284c7" stopOpacity={.45} /></linearGradient></defs><CartesianGrid stroke="#e5e7eb" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={4} /><YAxis yAxisId="moisture" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} /><YAxis yAxisId="rain" orientation="right" tickFormatter={(value) => `${value}mm`} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} /><Tooltip content={<FrostedTooltip />} /><ReferenceLine yAxisId="moisture" x={chartData[29]?.date} stroke="#94a3b8" strokeDasharray="4 4" label={<ForecastLabel />} />{showRainfall && <Bar yAxisId="rain" dataKey="rainfall" name="Rainfall" fill="url(#rainGradient)" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={900} />}{showMoisture && <Area yAxisId="moisture" type="monotone" dataKey="moisture" name="Soil Moisture" stroke="#059669" strokeWidth={2.5} fill="url(#moistureFill)" connectNulls activeDot={<GlowingDot />} isAnimationActive animationDuration={900} />}</ComposedChart></ResponsiveContainer></ChartPanel>
            <ChartPanel title="Temperature fit" subtitle={`T2M (°C) vs ${crop} optimal band`} controls={<ChartToggle label="Relative Humidity" color="bg-sky-400" active={showHumidity} onClick={() => setShowHumidity((value) => !value)} />}><ResponsiveContainer width="100%" height={300}><ComposedChart data={chartData}><defs><linearGradient id="temperatureStroke" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#f97316" /></linearGradient></defs><CartesianGrid stroke="#e5e7eb" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={4} /><YAxis yAxisId="temperature" domain={['auto', 'auto']} tickFormatter={(value) => `${value}°`} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} /><YAxis yAxisId="humidity" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} /><Tooltip content={<FrostedTooltip />} /><ReferenceArea yAxisId="temperature" y1={cropBands[crop][0]} y2={cropBands[crop][1]} fill="#10b981" fillOpacity={.1} /><ReferenceLine yAxisId="temperature" x={chartData[29]?.date} stroke="#64748b" strokeDasharray="4 4" label={<ForecastLabel />} /><Area yAxisId="temperature" type="monotone" dataKey="temperature" name="Temperature" stroke="url(#temperatureStroke)" strokeWidth={2.5} fill="none" connectNulls activeDot={<GlowingDot fill="#f97316" />} isAnimationActive animationDuration={1100} animationEasing="ease-out" />{showHumidity && <Line yAxisId="humidity" type="monotone" dataKey="humidity" name="Humidity" stroke="#38bdf8" strokeWidth={2} strokeDasharray="6 5" connectNulls activeDot={<GlowingDot fill="#38bdf8" />} isAnimationActive animationDuration={900} />}</ComposedChart></ResponsiveContainer></ChartPanel>
          </section>
          <section className="mt-16 border-t border-indigo-200/70 pt-10">
            <div className="mb-6 max-w-3xl"><div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-indigo-700"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-500 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-violet-600" /></span>30-DAY PREDICTIVE OUTLOOK • NASA 5-YEAR SEASONAL CLIMATOLOGY</div><h2 className="text-2xl font-bold text-slate-950 md:text-3xl">Next 30 Days: Projected Soil Moisture &amp; Temperature Trajectory</h2><p className="mt-2 text-sm leading-6 text-slate-500">Modeled from NASA POWER 2021–2025 seasonal normals anchored to live soil moisture and active What-If stress scenarios.</p></div>
            <div className="grid gap-5 lg:grid-cols-2">
              <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6 }} className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-5 text-white shadow-xl"><div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-300">Projected root-zone moisture &amp; rainfall</p><p className="mt-1 text-[11px] text-slate-400">Day +1 → Day +30 · seasonal model</p></div><span className="rounded-full bg-cyan-400/10 px-3 py-1.5 text-[10px] font-bold tabular-nums text-cyan-300">End-of-Month Moisture: {Math.round(futureOutlook[futureOutlook.length - 1]?.projectedMoisturePct ?? 0)}%</span></div><ResponsiveContainer width="100%" height={280}><ComposedChart data={futureChartData}><defs><pattern id="futureDiagonalHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="8" stroke="#38bdf8" strokeOpacity=".2" strokeWidth="3" /></pattern><linearGradient id="futureCyanGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#38bdf8" stopOpacity=".24" /><stop offset="100%" stopColor="#8b5cf6" stopOpacity=".02" /></linearGradient></defs><CartesianGrid stroke="#334155" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} interval={4} /><YAxis yAxisId="futureMoisture" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis yAxisId="futureRain" orientation="right" tickFormatter={(value) => `${value}mm`} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} /><Tooltip content={<ProjectedTooltip />} /><Bar yAxisId="futureRain" dataKey="projectedRainMm" name="Expected Rainfall" fill="#818cf8" fillOpacity={.55} radius={[4, 4, 0, 0]} isAnimationActive animationDuration={1000} /><Area yAxisId="futureMoisture" type="monotone" dataKey="projectedMoisturePct" name="Moisture hatch" stroke="none" fill="url(#futureDiagonalHatch)" fillOpacity={.55} isAnimationActive={false} /><Area yAxisId="futureMoisture" type="monotone" dataKey="projectedMoisturePct" name="Projected Moisture" stroke="#38bdf8" strokeWidth={2.5} strokeDasharray="6 6" fill="url(#futureCyanGrad)" activeDot={<GlowingDot fill="#38bdf8" />} isAnimationActive animationDuration={1200} /></ComposedChart></ResponsiveContainer></motion.div>
              <motion.div initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.6, delay: 0.1 }} className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-5 text-white shadow-xl"><div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-300">Projected temperature trajectory</p><p className="mt-1 text-[11px] text-slate-400">{crop} optimal zone highlighted</p></div><span className="rounded-full bg-amber-400/10 px-3 py-1.5 text-[10px] font-bold tabular-nums text-amber-300">30-Day Projected Avg: {futureAverageTemperature.toFixed(1)}°C</span></div><ResponsiveContainer width="100%" height={280}><ComposedChart data={futureChartData}><CartesianGrid stroke="#334155" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} interval={4} /><YAxis yAxisId="futureTemp" tickFormatter={(value) => `${value}°`} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} /><YAxis yAxisId="humidity" orientation="right" domain={[0, 100]} tickFormatter={(value) => `${value}%`} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} /><Tooltip content={<ProjectedTooltip />} /><ReferenceArea yAxisId="futureTemp" y1={cropBands[crop][0]} y2={cropBands[crop][1]} fill="#10b981" fillOpacity={.12} /><Area yAxisId="futureTemp" type="monotone" dataKey="confidenceBandHigh" name="Seasonal variance high" stroke="none" fill="#fbbf24" fillOpacity={.08} isAnimationActive animationDuration={900} /><Line yAxisId="futureTemp" type="monotone" dataKey="confidenceBandLow" name="Seasonal variance low" stroke="#fbbf24" strokeOpacity={.35} strokeDasharray="3 5" dot={false} isAnimationActive animationDuration={900} /><Line yAxisId="futureTemp" type="monotone" dataKey="projectedTempC" name="Projected Temperature" stroke="#fbbf24" strokeWidth={2.5} strokeDasharray="6 6" activeDot={<GlowingDot fill="#fbbf24" />} isAnimationActive animationDuration={1300} /><Line yAxisId="humidity" type="monotone" dataKey="projectedHumidityPct" name="Humidity" stroke="#38bdf8" strokeWidth={2} strokeDasharray="6 5" activeDot={<GlowingDot fill="#38bdf8" />} isAnimationActive animationDuration={1000} /></ComposedChart></ResponsiveContainer></motion.div>
            </div>
          </section>
        </>}
      </main>
      <footer id="methodology" className="scroll-mt-24 bg-slate-950 text-slate-300"><div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 py-10 lg:px-10"><div className="flex flex-col justify-between gap-6 md:flex-row"><div><div className="flex items-center gap-2 font-semibold text-white"><Satellite size={17} className="text-amber-300" /> Field Shift <span className="font-normal text-slate-600">/</span> NASA Space Apps Challenge 2026</div><p className="mt-3 max-w-xl text-xs leading-5 text-slate-400">NASA POWER data provided by the NASA Langley Research Center (LaRC) POWER Project. Grid-scale telemetry is a decision aid—not a substitute for field observation.</p></div><div className="grid gap-2 text-xs text-slate-400 sm:grid-cols-2 sm:gap-x-8"><p><strong className="text-slate-200">Data resolution</strong><br />0.5° × 0.625° POWER grid</p><p><strong className="text-slate-200">Methodology</strong><br />Soil-adjusted, scenario-aware scoring</p></div></div><div className="flex flex-col justify-between gap-3 border-t border-white/10 pt-5 text-xs text-slate-500 sm:flex-row sm:items-center"><span>Open source · MIT License</span><a href="https://github.com/Hiruni01/Nasa_spacea_app" target="_blank" rel="noreferrer" className="flex items-center gap-2 font-semibold text-slate-300 transition hover:text-amber-300"><Github size={15} /> View source on GitHub <ArrowRight size={13} /></a></div></div></footer>
    </div>
  )
}

function ValueStrip({ icon: Icon, title, detail }: { icon: typeof Radio; title: string; detail: string }) {
  return <div className="flex items-center gap-3 bg-white/5 px-4 py-4"><div className="rounded-lg bg-emerald-400/10 p-2 text-emerald-300"><Icon size={16} /></div><div><p className="text-xs font-bold text-white">{title}</p><p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-400">{detail}</p></div></div>
}

function PhotoCard({ image, caption, className = '' }: { image: string; caption: string; className?: string }) {
  return <div className={`group relative overflow-hidden rounded-2xl ${className}`}><img src={image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" /><p className="absolute bottom-5 left-5 right-5 text-sm font-medium leading-5 text-white">{caption}</p></div>
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div><p className="text-3xl font-bold tracking-tight tabular-nums text-emerald-950 md:text-4xl">{value}</p><p className="mt-2 max-w-[170px] text-xs leading-5 text-slate-500">{label}</p></div>
}

function LoadingState() {
  return <section className="grid gap-4 py-8 lg:grid-cols-[1.15fr_.85fr]"><div className="h-64 animate-pulse rounded-2xl bg-emerald-900/10" /><div className="grid grid-cols-2 gap-3">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-white/70" />)}</div></section>
}
function ScenarioPanel({ scenario, onChange, onReset }: { scenario: ClimateScenario; onChange: (next: ClimateScenario) => void; onReset: () => void }) {
  const active = scenario.temperatureAnomaly !== 0 || scenario.rainfallDeltaPercent !== 0
  const rainfallLabel = `${scenario.rainfallDeltaPercent > 0 ? '+' : ''}${Math.round(scenario.rainfallDeltaPercent * 100)}%`
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div><div className="flex items-center gap-2"><Activity size={17} className="text-amber-600" /><h2 className="font-bold text-emerald-950">What-If Climate Stress Simulator</h2>{active && <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">Simulated scenario</span>}</div><p className="mt-1 text-xs text-slate-500">Stress-test the live NASA baseline before choosing a rotation.</p></div>
      <button onClick={onReset} disabled={!active} className="flex items-center gap-1.5 self-start rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"><RefreshCw size={13} /> Reset to live NASA data</button>
    </div>
    {active && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900">SIMULATED SCENARIO ({scenario.temperatureAnomaly.toFixed(1)}°C, {rainfallLabel} Rain) <span className="font-normal text-amber-800">— Based on Live NASA Baseline</span></div>}
    <div className="mt-5 grid gap-5 md:grid-cols-2">
      <label className="block"><div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-700"><span>Temperature anomaly</span><strong className="text-orange-700">+{scenario.temperatureAnomaly.toFixed(1)}°C</strong></div><input type="range" min="0" max="4" step="0.5" value={scenario.temperatureAnomaly} onChange={(event) => onChange({ ...scenario, temperatureAnomaly: Number(event.target.value) })} className="w-full accent-orange-600" /><div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>0°C live</span><span>+4.0°C heatwave</span></div></label>
      <label className="block"><div className="mb-2 flex items-center justify-between text-xs font-semibold text-slate-700"><span>Rainfall change</span><strong className={scenario.rainfallDeltaPercent < 0 ? 'text-amber-700' : 'text-sky-700'}>{rainfallLabel}</strong></div><input type="range" min="-0.5" max="0.4" step="0.1" value={scenario.rainfallDeltaPercent} onChange={(event) => onChange({ ...scenario, rainfallDeltaPercent: Number(event.target.value) })} className="w-full accent-sky-600" /><div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>-50% dry spell</span><span>+40% monsoon</span></div></label>
    </div>
  </section>
}
function StrategyCard({ strategy, expanded, onExpand }: { strategy: Strategy; expanded: boolean; onExpand: () => void }) {
  const accent = strategy.accent === 'amber' ? 'border-amber-200' : strategy.accent === 'emerald' ? 'border-emerald-200' : 'border-teal-200'
  const bar = strategy.accent === 'amber' ? 'bg-amber-500' : strategy.accent === 'emerald' ? 'bg-emerald-600' : 'bg-teal-600'
  return <motion.article initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, delay: strategy.id * 0.08, ease: 'easeOut' }} className={`relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${accent}`}>{strategy.rank === 1 && <div className="absolute -top-3 left-5 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm ring-4 ring-stone-50">Top Recommended Strategy</div>}<div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-bold tracking-[.16em] text-slate-400">STRATEGY 0{strategy.id}</span><h3 className="mt-1 text-lg font-bold text-emerald-950">{strategy.name}</h3></div><div className="flex items-center gap-2"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold tabular-nums text-emerald-700">RANK #{strategy.rank}</span><div className={`rounded-lg p-2 ${strategy.accent === 'amber' ? 'bg-amber-50 text-amber-600' : strategy.accent === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-teal-50 text-teal-700'}`}><Leaf size={17} /></div></div></div><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{strategy.eyebrow}</p><div className="my-5 flex items-center gap-1.5">{strategy.flow.map((crop, index) => <span key={`${crop}-${index}`} className="flex min-w-0 items-center gap-1.5">{index > 0 && <ArrowRight size={12} className="shrink-0 text-slate-300" />}<span className="truncate rounded-md bg-slate-100 px-2 py-1.5 text-[11px] font-semibold text-slate-700">{crop}</span></span>)}</div><div className="mb-5 flex items-center justify-between"><div><p className="mb-2 text-xs font-semibold text-slate-600">Suitability score</p><div className="h-2 w-24 rounded-full bg-slate-100"><div className={`h-full rounded-full ${bar}`} style={{ width: `${strategy.score}%` }} /></div></div><AnimatedGauge score={strategy.score} size={58} /></div><div className="mb-4 flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2.5"><span className="flex items-center gap-2 text-xs font-semibold text-slate-600"><Droplets size={14} className="text-blue-500" /> Water demand</span><span className={`text-xs font-bold ${strategy.water === 'LOW' ? 'text-emerald-700' : strategy.water === 'HIGH' ? 'text-amber-700' : 'text-slate-700'}`}>{strategy.water}</span></div><div className="min-h-[76px]"><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Why suggested</p><p className="text-xs leading-5 text-slate-600">{strategy.justification}</p></div><ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">{strategy.benefits.slice(0, 3).map((benefit) => <li key={benefit} className="flex items-center gap-2 text-xs font-medium text-slate-600"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Check size={10} /></span>{benefit}</li>)}</ul><button onClick={onExpand} className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-left text-[11px] font-bold text-emerald-800"><span className="flex items-center gap-1.5"><ShieldCheck size={14} /> Satellite gaps &amp; local verification</span><ChevronDown size={15} className={`transition ${expanded ? 'rotate-180' : ''}`} /></button>{expanded && <div className="mt-3 rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-950"><strong>Verify before planting:</strong> NASA POWER is a coarse 0.5° × 0.625° grid. Walk the field to confirm soil pH, drainage, pests, and irrigation access with a local agronomist.</div>}</motion.article>
}
function ChartPanel({ title, subtitle, controls, children }: { title: string; subtitle: string; controls?: React.ReactNode; children: React.ReactNode }) {
  return <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.5, ease: 'easeOut' }} className="rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"><div className="mb-5 flex items-start justify-between gap-3"><div><h3 className="font-bold text-emerald-950">{title}</h3><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div><div className="flex items-center gap-2">{controls}<div className="rounded-lg bg-slate-50 p-2 text-slate-400"><Activity size={16} /></div></div></div>{children}</motion.div>
}

function ChartToggle({ label, color, active, onClick }: { label: string; color: string; active: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all ${active ? 'border-slate-200 bg-white text-slate-700 shadow-sm' : 'border-transparent bg-slate-100 text-slate-400'}`}><span className={`h-2 w-2 rounded-full transition-opacity ${color} ${active ? 'opacity-100' : 'opacity-30'}`} />{label}</button>
}

function AnimatedGauge({ score, size }: { score: number; size: number }) {
  const radius = 40
  const circumference = 2 * Math.PI * radius
  return <div className="relative shrink-0" style={{ width: size, height: size }}><svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-label={`${score} out of 100`}><circle cx="50" cy="50" r={radius} fill="none" stroke="#d1fae5" strokeWidth="8" /><motion.circle cx="50" cy="50" r={radius} fill="none" stroke="#059669" strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: circumference - (circumference * score) / 100 }} transition={{ duration: 0.8, ease: 'easeOut' }} /></svg><span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums text-emerald-950">{score}</span></div>
}

function GlowingDot({ cx = 0, cy = 0, fill = '#10b981' }: { cx?: number; cy?: number; fill?: string }) {
  return <g><circle cx={cx} cy={cy} r={10} fill={fill} opacity={.16} /><circle cx={cx} cy={cy} r={6} fill={fill} stroke="#fff" strokeWidth={2} /></g>
}

type TooltipDatum = { name?: string; value?: number | string | null; dataKey?: string; payload?: { isProjected?: boolean } }
function FrostedTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipDatum[]; label?: string }) {
  if (!active || !payload?.length) return null
  const projected = payload[0]?.payload?.isProjected
  return <div className="rounded-xl border border-white/10 bg-slate-900/95 px-4 py-3 text-white shadow-xl backdrop-blur-md"><p className="mb-2 text-xs font-bold tabular-nums text-slate-200">{label}</p><span className="mb-2 inline-flex rounded-full bg-white/10 px-2 py-1 text-[10px] font-semibold text-emerald-200">{projected ? '5-Yr Seasonal Outlook' : 'Observed Satellite'}</span><div className="space-y-1 text-xs tabular-nums">{payload.map((item) => <p key={item.dataKey ?? item.name} className="flex justify-between gap-5"><span className="text-slate-400">{item.name}</span><strong>{item.value ?? '—'}{item.dataKey === 'moisture' || item.dataKey === 'humidity' ? '%' : item.dataKey === 'rainfall' ? ' mm' : item.dataKey === 'temperature' ? '°C' : ''}</strong></p>)}</div></div>
}

function ProjectedTooltip({ active, payload, label }: { active?: boolean; payload?: TooltipDatum[]; label?: string }) {
  if (!active || !payload?.length) return null
  return <div className="rounded-xl border border-indigo-400/30 bg-slate-950/95 px-4 py-3 text-white shadow-2xl backdrop-blur-md"><p className="mb-2 text-xs font-bold tabular-nums text-slate-200">{label}</p><span className="mb-2 inline-flex rounded-full bg-indigo-400/15 px-2 py-1 text-[10px] font-semibold text-indigo-200">PROJECTED OUTLOOK</span><div className="space-y-1 text-xs tabular-nums">{payload.map((item) => <p key={item.dataKey ?? item.name} className="flex justify-between gap-5"><span className="text-slate-400">{item.name}</span><strong>{item.value ?? '—'}{item.dataKey?.includes('Moisture') || item.dataKey === 'projectedMoisturePct' || item.dataKey?.includes('Humidity') || item.dataKey === 'projectedHumidityPct' ? '%' : item.dataKey?.includes('Rain') || item.dataKey === 'projectedRainMm' ? ' mm' : '°C'}</strong></p>)}</div></div>
}

function ForecastLabel({ viewBox }: { viewBox?: { x?: number; y?: number } }) {
  return <g transform={`translate(${viewBox?.x ?? 0},${viewBox?.y ?? 0})`}><rect x="-48" y="4" width="96" height="18" rx="9" fill="#0f172a" /><text x="0" y="16" textAnchor="middle" fill="#fff" fontSize="9">Today • Forecast Start</text></g>
}

export default App
