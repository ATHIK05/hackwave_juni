# Rescue Net

**Live surplus food rescue, for cities.** Rescue Net is the operations layer between
kitchens with surplus and the shelters feeding people tonight — post a rescue, watch
the safety window tick, dispatch a courier, confirm the impact.

<p>
  <img alt="stack" src="https://img.shields.io/badge/stack-vanilla%20ES%20modules-0b8157">
  <img alt="backend" src="https://img.shields.io/badge/backend-Cloud%20Firestore-4f46e5">
  <img alt="plan" src="https://img.shields.io/badge/Firebase-Spark%20plan%20safe-14b8a6">
  <img alt="build" src="https://img.shields.io/badge/build%20step-none-f59e0b">
</p>

---

## Run it

```bash
npm run dev      # http://localhost:5173
```

Or just open `index.html` — there is no build step. The app boots with a full
seeded operational dataset, so every screen is populated from the first paint.

| Page | What it is |
| --- | --- |
| `index.html` | Product overview, live board preview, impact reporting |
| `app.html` | The operations console (overview, board, post, map, impact, verification) |
| `login.html` | Three-step progressive sign-in with role selection |

## The console

- **Overview** — live metrics with animated counters, urgent rescues, activity timeline, courier pool
- **Rescue board** — search, category / status / urgency filters, urgency-ranked cards with 1 Hz safety countdowns
- **Post surplus** — validated form with a live card preview that updates as you type
- **Dispatch map** — Leaflet map with donor, receiver, courier and SOS beacon pins plus escalation radii
- **Impact** — daily volume chart, status donut, partner leaderboard
- **Verification** — licence/compliance queue with approve & reject flows

Extras: SOS beacon broadcast with a page-wide alert band, role switching
(Donor / NGO / Courier / Coordinator), notification centre, voice shortcuts,
and keyboard navigation (`1`–`6` for tabs, `/` to search).

## Design system

A light, fresh **"Aurora Glass"** system — no dark theme, no gold.

- **Tokens** (`assets/css/tokens.css`) — Verdant / Indigo / Coral / Amber ramps, ink scale
  tuned for contrast on glass, layered elevation, one spring motion language
- **Glassmorphism** with an opaque fallback wherever `backdrop-filter` is unsupported, so
  text legibility never depends on a blur
- **3D & motion** — perspective hero stage, pointer-reactive tilt and sheen, scroll reveals,
  line-split headlines, animated counters, spring toasts, ripples, shimmer skeletons
- **Microperception layer** — countdown colour shifts, freshness bars, live dots, hover lifts,
  focus rings, reduced-motion support throughout

## Firebase — plug and play

Runs on seeded local data out of the box. To go live:

1. Paste your web config into `assets/js/core/firebase-config.js`
2. `npm install && npm run seed`

That is it — the data service detects the config, switches to Cloud Firestore
with realtime listeners, and the header pill flips to **Firestore live**.

**No Firebase Storage is used anywhere** (images are URL strings), so the whole
project stays on the free Spark plan. Full guide: **[FIREBASE.md](FIREBASE.md)**.

## Project layout

```
index.html  app.html  login.html
assets/
  css/   tokens · base · components · pages
  js/
    core/   seed-data · firebase-config · data-service · ui
    ui/     cards
    pages/  landing · console · auth
scripts/seed-firestore.mjs      # one-command Firestore seeder
firestore.rules                 # Spark-safe security rules
```

## Deploy

**GitHub Pages** — push and enable Pages from the repository root; the site is static.

**Firebase Hosting** — `firebase deploy --only hosting` (config included).
