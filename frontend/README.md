# Amazon SecondLife AI — Frontend

Next.js 14 (App Router) with Tailwind CSS. JSX only, zero TypeScript.

## Setup

```bash
npm install
cp .env.local.example .env.local
```

## Run

```bash
npm run dev
```

Visit: http://localhost:3000

## Pages

| Route | Feature |
|---|---|
| `/` | Dashboard |
| `/sell` | Sell / Donate (photo upload + AI analysis) |
| `/passport/[id]` | Product Health Passport |
| `/marketplace` | Browse listings |
| `/heatmap` | Demand heatmap by city |
| `/prevention` | Return Shield risk check |
| `/green` | Green Credits dashboard |
| `/agents` | AI Agents status panel |
