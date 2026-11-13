# 🌱 Field Shift: Adapting Farms with NASA Data

> **NASA International Space Apps Challenge 2026**  
> **Challenge:** *Field Shift: Adapting Farms with NASA Data*  
> **Developer:** Hiruni Nethranjali Silva

**Field Shift** is an interactive, farmer-friendly agricultural decision-support web application that transforms live NASA Earth observation telemetry into actionable planting advisories and adaptive crop-rotation strategies.

---

## 🎯 Problem & Solution

Changing rainfall patterns, prolonged dry spells, and shifting temperatures make traditional planting calendars increasingly risky for smallholder farmers. Many fields suffer from soil moisture depletion, nutrient exhaustion from continuous monocropping, or bare-field erosion between seasons.

**Field Shift** bridges the gap between raw satellite data and day-to-day farm decisions by:
1. **Fetching Real-Time Agroclimatology Telemetry:** Queries the **NASA POWER API** (`AG` community) for root-zone soil wetness (`GWETROOT`), surface soil wetness (`GWETTOP`), bias-corrected precipitation (`PRECTOTCORR`), and 2-meter air temperature (`T2M`).
2. **Evaluating Planting Readiness:** Calculates a 0–100 planting readiness score (`OPTIMAL`, `CAUTION`, or `DELAY`) tailored to specific crops and locations.
3. **Comparing 3 Adaptive Crop-Rotation Strategies:** Evaluates the farmer's existing baseline monocrop against two climate-resilient multi-season rotations (legume nitrogen-fixation and drought-tolerant alternatives), highlighting agronomic benefits, satellite grid limitations, and local verification caveats.

---

## 🏗️ Architecture & Tech Stack

```text
┌───────────────────────────┐      REST / JSON       ┌──────────────────────────────┐
│   React + TypeScript UI   │ ◄────────────────────► │     Python FastAPI Server    │
│  (Vite, Tailwind, Charts) │                        │   (Scoring & Rotation Engine)│
└───────────────────────────┘                        └──────────────┬───────────────┘
                                                                    │ HTTPS GET
                                                                    ▼
                                                     ┌──────────────────────────────┐
                                                     │        NASA POWER API        │
                                                     │ (T2M, PRECTOTCORR, GWETROOT) │
                                                     └──────────────────────────────┘
