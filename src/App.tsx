import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowRight, Check, ChevronDown, CloudRain, Droplets, Info, Leaf, MapPin,
  Radio, RefreshCw, Satellite, ShieldCheck, Sprout, Thermometer, TrendingUp,
} from 'lucide-react'
import {
  Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { fetchNasapowerTelemetry } from './services/nasaPowerService'
import { buildStrategies, calculateReadiness, cropBands, metrics } from './utils/agronomyEngine'
import type { Crop, LocationPreset, Priority, Strategy, Telemetry } from './types/agro'

const locations: LocationPreset[] = [
  { name: 'Anuradhapura Dry Zone', region: 'North Central Province', latitude: 8.3114, longitude: 80.4037 },
  { name: 'Polonnaruwa', region: 'North Central Province', latitude: 7.9403, longitude: 81.0188 },
  { name: 'Nuwara Eliya Wet Highlands', region: 'Central Province', latitude: 6.9497, longitude: 80.7891 },
  { name: 'Kurunegala', region: 'North Western Province', latitude: 7.4863, longitude: 80.3623 },
  { name: 'Monaragala', region: 'Uva Province', latitude: 6.8728, longitude: 81.3507 },
]
const defaultLocation = locations[0]
const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

function App() {
  const [location, setLocation] = useState(defaultLocation)
  const [latitude, setLatitude] = useState(String(defaultLocation.latitude))
  const [longitude, setLongitude] = useState(String(defaultLocation.longitude))
  const [crop, setCrop] = useState<Crop>('Paddy / Rice')
  const [priority, setPriority] = useState<Priority>('Water Conservation')
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

  const analyze = async () => {
    const lat = Number(latitude)
    const lon = Number(longitude)
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) return
    setLoading(true)
    setTelemetry(await fetchNasapowerTelemetry(lat, lon))
    setLoading(false)
  }
  useEffect(() => { void analyze() }, [])

  const data = useMemo(() => telemetry ? metrics(telemetry.readings) : null, [telemetry])
  const readiness = useMemo(() => telemetry ? calculateReadiness(telemetry, crop) : null, [telemetry, crop])
  const strategies = useMemo(() => telemetry ? buildStrategies(telemetry, crop, priority) : [], [telemetry, crop, priority])
  const chartData = telemetry?.readings.map((item) => ({
    date: formatDate(item.date), moisture: item.rootWetness, rainfall: item.precipitation, temperature: item.temperature,
  })) ?? []
  const chooseLocation = (selected: LocationPreset) => {
    setLocation(selected); setLatitude(String(selected.latitude)); setLongitude(String(selected.longitude))
  }

  return (
    <div className="min-h-screen bg-canvas text-ink grain">
      <header className="border-b border-emerald-950/10 bg-[#063b36] text-stone-50">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-5 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400 text-emerald-950"><Satellite size={22} strokeWidth={2.5} /></div>
            <div><p className="font-semibold tracking-tight">Field Shift</p><p className="text-[10px] uppercase tracking-[.2em] text-emerald-100/60">NASA farm intelligence</p></div>
          </div>
          <div className="hidden items-center gap-6 text-xs text-emerald-100/70 md:flex"><span>SPACE APPS CHALLENGE 2026</span><span className="h-1 w-1 rounded-full bg-amber-400" /><span>FIELD SHIFT</span></div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-100/15 bg-emerald-950/25 px-3 py-1.5 text-xs text-emerald-100"><Radio size={13} className="text-amber-300" /> POWER data active</div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 pb-16 lg:px-10">
        <section className="grid gap-8 pb-10 pt-10 lg:grid-cols-[1.15fr_.85fr] lg:items-end lg:pt-14">
          <div>
            <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-emerald-700"><span className="h-px w-8 bg-amber-500" /> Climate-ready decisions</div>
            <h1 className="max-w-3xl text-4xl font-bold leading-[1.06] tracking-tight text-emerald-950 sm:text-5xl lg:text-6xl">Grow with the signal.<br /><span className="text-amber-600">Adapt before the season.</span></h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">Turn NASA Earth observation data into a clear planting window and a rotation plan built for your field.</p>
          </div>
          <div className="rounded-2xl border border-emerald-900/10 bg-white/70 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider text-slate-500">Data window</span><span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><Check size={14} /> 30-day observation</span></div>
            <div className="flex items-center gap-3 text-sm font-semibold text-emerald-950"><div className="rounded-lg bg-emerald-50 p-2 text-emerald-700"><Activity size={18} /></div><div><p>Satellite assimilation lag accounted for</p><p className="mt-0.5 text-xs font-normal text-slate-500">Ending 4 days before today · NASA POWER AG</p></div></div>
          </div>
        </section>

        <section className="rounded-2xl bg-emerald-950 p-4 text-stone-50 shadow-xl shadow-emerald-950/10 lg:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><MapPin size={17} className="text-amber-400" /><h2 className="font-semibold">Farm profile</h2></div><span className="text-xs text-emerald-100/50">Personalize your field signal</span></div>
          <div className="grid gap-3 xl:grid-cols-[1.25fr_1fr_1fr_1fr_auto]">
            <label className="relative block"><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-emerald-100/55">Agricultural zone</span><select value={location.name} onChange={(e) => { const selected = locations.find((item) => item.name === e.target.value); if (selected) chooseLocation(selected) }} className="w-full appearance-none rounded-xl border border-emerald-100/15 bg-emerald-900/60 px-3 py-3 text-sm outline-none focus:border-amber-400"><option>{location.name}</option>{locations.filter((item) => item.name !== location.name).map((item) => <option key={item.name}>{item.name}</option>)}</select><ChevronDown size={16} className="pointer-events-none absolute bottom-3.5 right-3 text-emerald-100/50" /></label>
            <label><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-emerald-100/55">Baseline crop</span><select value={crop} onChange={(e) => setCrop(e.target.value as Crop)} className="w-full rounded-xl border border-emerald-100/15 bg-emerald-900/60 px-3 py-3 text-sm outline-none focus:border-amber-400"><option>Paddy / Rice</option><option>Maize</option><option>Chili</option><option>Tea</option></select></label>
            <label><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-emerald-100/55">Farmer priority</span><select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="w-full rounded-xl border border-emerald-100/15 bg-emerald-900/60 px-3 py-3 text-sm outline-none focus:border-amber-400"><option>Water Conservation</option><option>Soil Nitrogen &amp; Health</option><option>Pest Cycle Break</option><option>Income Diversification</option></select></label>
            <div><span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-emerald-100/55">Custom coordinates</span><div className="flex gap-2"><input aria-label="Latitude" value={latitude} onChange={(e) => setLatitude(e.target.value)} className="w-1/2 rounded-xl border border-emerald-100/15 bg-emerald-900/60 px-3 py-3 text-sm outline-none focus:border-amber-400" placeholder="Lat" /><input aria-label="Longitude" value={longitude} onChange={(e) => setLongitude(e.target.value)} className="w-1/2 rounded-xl border border-emerald-100/15 bg-emerald-900/60 px-3 py-3 text-sm outline-none focus:border-amber-400" placeholder="Lon" /></div></div>
            <button onClick={() => void analyze()} disabled={loading} className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-bold text-emerald-950 transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-70">{loading ? <RefreshCw size={17} className="animate-spin" /> : <Sprout size={17} />}{loading ? 'Analyzing…' : 'Analyze farm'}<ArrowRight size={16} /></button>
          </div>
        </section>

        {loading || !readiness || !data ? <LoadingState /> : <>
          <section className="grid gap-4 py-8 lg:grid-cols-[1.15fr_.85fr]">
            <div className={`relative overflow-hidden rounded-2xl p-6 text-white ${readiness.status === 'OPTIMAL' ? 'bg-emerald-700' : readiness.status === 'CAUTION' ? 'bg-amber-600' : 'bg-slate-800'}`}>
              <div className="absolute -right-10 -top-20 h-64 w-64 rounded-full border-[34px] border-white/10" /><div className="absolute -right-20 -top-10 h-48 w-48 rounded-full border border-white/10" />
              <div className="relative flex h-full flex-col justify-between gap-8"><div className="flex items-start justify-between"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-white/65">Planting readiness</p><h2 className="mt-2 text-4xl font-bold tracking-tight">{readiness.status}</h2></div><div className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold tracking-wider">{location.name.split(' ')[0].toUpperCase()} FIELD</div></div><div><p className="max-w-xl text-sm leading-6 text-white/80">{readiness.recommendation}</p><div className="mt-5 h-2 overflow-hidden rounded-full bg-black/15"><div className="h-full rounded-full bg-amber-300 transition-all duration-700" style={{ width: `${readiness.score}%` }} /></div><div className="mt-2 flex justify-between text-[11px] font-medium text-white/60"><span>Resilience score</span><span className="font-bold text-white">{readiness.score} / 100</span></div></div></div>
            </div>
            <div className="grid grid-cols-2 gap-3">{[
              { label: 'Root-zone wetness', code: 'GWETROOT', value: `${Math.round(data.wetness)}%`, icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Air temperature', code: 'T2M · 2m', value: `${data.temperature.toFixed(1)}°C`, icon: Thermometer, color: 'text-orange-600', bg: 'bg-orange-50' },
              { label: 'Avg daily rainfall', code: 'PRECTOTCORR', value: `${data.rainfall.toFixed(1)} mm`, icon: CloudRain, color: 'text-sky-600', bg: 'bg-sky-50' },
              { label: '30-day cumulative', code: 'PRECIPITATION', value: `${Math.round(data.cumulativeRainfall)} mm`, icon: TrendingUp, color: 'text-emerald-700', bg: 'bg-emerald-50' },
            ].map((item) => <div key={item.code} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"><div className={`mb-4 flex h-8 w-8 items-center justify-center rounded-lg ${item.bg} ${item.color}`}><item.icon size={16} /></div><p className="text-2xl font-bold tracking-tight text-emerald-950">{item.value}</p><p className="mt-1 text-xs font-semibold text-slate-600">{item.label}</p><p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.code}</p></div>)}</div>
          </section>

          <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-amber-600">The decision set</p><h2 className="mt-1 text-2xl font-bold text-emerald-950">Shift the rotation, protect the farm.</h2></div><div className="flex items-center gap-2 text-xs text-slate-500"><span className={`h-2 w-2 rounded-full ${telemetry?.source === 'live' ? 'bg-emerald-500' : 'bg-amber-500'}`} />{telemetry?.source === 'live' ? 'Live NASA POWER telemetry' : 'Cached reference snapshot'}<Info size={14} /></div></div>
          <section className="grid gap-4 lg:grid-cols-3">{strategies.map((strategy) => <StrategyCard key={strategy.id} strategy={strategy} expanded={expanded === strategy.id} onExpand={() => setExpanded(expanded === strategy.id ? null : strategy.id)} />)}</section>

          <section className="mt-12 grid gap-5 lg:grid-cols-2">
            <ChartPanel title="Root-zone moisture & rainfall" subtitle="GWETROOT (%) alongside PRECTOTCORR (mm/day)"><ResponsiveContainer width="100%" height={250}><AreaChart data={chartData}><defs><linearGradient id="moistureFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0f766e" stopOpacity={.3} /><stop offset="100%" stopColor="#0f766e" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#e5e7eb" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={4} /><YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} /><YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} /><Area yAxisId="left" type="monotone" dataKey="moisture" name="Moisture %" stroke="#0f766e" fill="url(#moistureFill)" strokeWidth={2} connectNulls /><Line yAxisId="right" type="monotone" dataKey="rainfall" name="Rain mm" stroke="#f59e0b" strokeWidth={2} dot={false} connectNulls /></AreaChart></ResponsiveContainer></ChartPanel>
            <ChartPanel title="Temperature fit" subtitle={`T2M (°C) vs ${crop} optimal band`}><ResponsiveContainer width="100%" height={250}><LineChart data={chartData}><CartesianGrid stroke="#e5e7eb" vertical={false} /><XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval={4} /><YAxis domain={['auto', 'auto']} tickLine={false} axisLine={false} tick={{ fontSize: 10 }} /><Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }} /><Line type="monotone" dataKey="temperature" name="Temperature °C" stroke="#e05a33" strokeWidth={2.5} dot={false} connectNulls /><Line type="monotone" dataKey={() => cropBands[crop][0]} name="Band low" stroke="#94a3b8" strokeDasharray="4 4" dot={false} /><Line type="monotone" dataKey={() => cropBands[crop][1]} name="Band high" stroke="#94a3b8" strokeDasharray="4 4" dot={false} /></LineChart></ResponsiveContainer></ChartPanel>
          </section>
        </>}
      </main>
      <footer className="border-t border-emerald-950/10 bg-white/50"><div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-7 text-xs text-slate-500 lg:flex-row lg:items-center lg:justify-between lg:px-10"><div className="flex items-center gap-2 font-semibold text-emerald-900"><Satellite size={16} /> Field Shift <span className="font-normal text-slate-400">/</span> NASA Space Apps Challenge 2026</div><p>NASA POWER data provided by the NASA Langley Research Center (LaRC) POWER Project.</p></div></footer>
    </div>
  )
}

function LoadingState() {
  return <section className="grid gap-4 py-8 lg:grid-cols-[1.15fr_.85fr]"><div className="h-64 animate-pulse rounded-2xl bg-emerald-900/10" /><div className="grid grid-cols-2 gap-3">{[1, 2, 3, 4].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-white/70" />)}</div></section>
}
function StrategyCard({ strategy, expanded, onExpand }: { strategy: Strategy; expanded: boolean; onExpand: () => void }) {
  const accent = strategy.accent === 'amber' ? 'border-amber-200' : strategy.accent === 'emerald' ? 'border-emerald-200' : 'border-teal-200'
  const bar = strategy.accent === 'amber' ? 'bg-amber-500' : strategy.accent === 'emerald' ? 'bg-emerald-600' : 'bg-teal-600'
  return <article className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${accent}`}><div className="flex items-start justify-between gap-3"><div><span className="text-[10px] font-bold tracking-[.16em] text-slate-400">STRATEGY 0{strategy.id}</span><h3 className="mt-1 text-lg font-bold text-emerald-950">{strategy.name}</h3></div><div className={`rounded-lg p-2 ${strategy.accent === 'amber' ? 'bg-amber-50 text-amber-600' : strategy.accent === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-teal-50 text-teal-700'}`}><Leaf size={17} /></div></div><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{strategy.eyebrow}</p><div className="my-5 flex items-center gap-1.5">{strategy.flow.map((crop, index) => <span key={`${crop}-${index}`} className="flex min-w-0 items-center gap-1.5">{index > 0 && <ArrowRight size={12} className="shrink-0 text-slate-300" />}<span className="truncate rounded-md bg-slate-100 px-2 py-1.5 text-[11px] font-semibold text-slate-700">{crop}</span></span>)}</div><div className="mb-5"><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold text-slate-600">Suitability score</span><strong className="text-emerald-900">{strategy.score}<span className="font-normal text-slate-400"> / 100</span></strong></div><div className="h-2 rounded-full bg-slate-100"><div className={`h-full rounded-full ${bar}`} style={{ width: `${strategy.score}%` }} /></div></div><div className="mb-4 flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2.5"><span className="flex items-center gap-2 text-xs font-semibold text-slate-600"><Droplets size={14} className="text-blue-500" /> Water demand</span><span className={`text-xs font-bold ${strategy.water === 'LOW' ? 'text-emerald-700' : strategy.water === 'HIGH' ? 'text-amber-700' : 'text-slate-700'}`}>{strategy.water}</span></div><div className="min-h-[76px]"><p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">Why suggested</p><p className="text-xs leading-5 text-slate-600">{strategy.justification}</p></div><ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">{strategy.benefits.slice(0, 3).map((benefit) => <li key={benefit} className="flex items-center gap-2 text-xs font-medium text-slate-600"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><Check size={10} /></span>{benefit}</li>)}</ul><button onClick={onExpand} className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-left text-[11px] font-bold text-emerald-800"><span className="flex items-center gap-1.5"><ShieldCheck size={14} /> Satellite gaps &amp; local verification</span><ChevronDown size={15} className={`transition ${expanded ? 'rotate-180' : ''}`} /></button>{expanded && <div className="mt-3 rounded-xl bg-amber-50 p-3 text-[11px] leading-5 text-amber-950"><strong>Verify before planting:</strong> NASA POWER is a coarse 0.5° × 0.625° grid. Walk the field to confirm soil pH, drainage, pests, and irrigation access with a local agronomist.</div>}</article>
}
function ChartPanel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><div className="mb-5 flex items-start justify-between"><div><h3 className="font-bold text-emerald-950">{title}</h3><p className="mt-1 text-xs text-slate-500">{subtitle}</p></div><div className="rounded-lg bg-slate-50 p-2 text-slate-400"><Activity size={16} /></div></div>{children}</div>
}

export default App
