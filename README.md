# Field Shift

Frontend-only NASA Space Apps Challenge 2026 app for **Field Shift: Adapting Farms with NASA Data**. The app turns NASA POWER agroclimatology telemetry into planting readiness guidance and three crop-rotation comparisons for Sri Lankan farm zones.

## Run locally

```bash
npm create vite@latest field-shift -- --template react-ts
npm install
npm install recharts lucide-react
npm run dev
```

For this repository, dependencies are already declared in `package.json`, so the usual workflow is:

```bash
npm install
npm run dev
npm run build
```

Deploy the generated `dist/` folder to Vercel or Netlify with the Vite preset. No backend, environment variables, or API proxy are required.

## Architecture

- `src/services/nasaPowerService.ts` fetches the last 30 complete NASA POWER days, ending four days before the current UTC date. It cleans `-999` sentinels and falls back to a labeled reference snapshot when the browser is offline or the response is unusable.
- `src/utils/agronomyEngine.ts` calculates the readiness score, status, recommendation, telemetry summary, and adaptive rotation strategies in the browser.
- `src/types/agro.ts` keeps the telemetry, crop, strategy, and readiness data contracts explicit.
- `src/App.tsx` provides the responsive farm controls, KPI cards, Recharts views, strategy comparison cards, and local-verification notices.

NASA POWER attribution: NASA Langley Research Center (LaRC) POWER Project.
