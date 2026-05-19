# FORGE v3 — Personal Performance OS

Your personal training command centre. Dark futuristic interface built around long-term progression.

## What's in v3

### Core
- **Google Drive sync** — data saves to `forge-data.json` in your Drive. Survives cache clears, syncs across devices. Debounced — won't hammer the API.
- **New design system** — `#07090D` background, cyan/lime/emerald accent palette, Inter Tight headings, JetBrains Mono for all numbers
- **Page transitions** — slide + fade between pages, staggered card entrance animations
- **Animated counters** — all metrics count up on page load

### New pages
- **Lifetime** — running totals of everything: kg lifted, sets, reps, km run, calories, protein, active days
- **Awards** — achievement cabinet. Unlocks automatically as you hit milestones. Toast notification on unlock.
- **Timeline** — scrollable history of every day with data. Workout, weight, nutrition, journal, run all in one card per day.
- **Universe** — interactive canvas showing your exercises as nodes. Size = volume, brightness = recency. Hover for stats.
- **Replay** — pick any date, see everything that happened that day in a timeline format.

### Enhanced features
- **Momentum Meter** — live 0–100 score with canvas dial. Inputs: workout consistency, calorie adherence, protein adherence, weight trend, logging consistency.
- **AI Coach Panel** — on dashboard, shows what's going well, what needs attention, and a recommendation for today. Driven by your actual data.
- **Progress tabs** — exercises grouped by muscle group (Chest / Back / Shoulders / Arms / Legs / Running). Add a `group` property to any exercise in `data.js` and it appears automatically.
- **Calendar context** — Google Calendar events generate a training context tip (light day, busy day, etc.)
- **Overload badges** — push badge now pulses to draw attention

---

## Setup

### 1. Deploy to GitHub Pages
Upload all files to your repo root. Settings → Pages → main branch → root.

### 2. Google Drive + Calendar (one OAuth flow for both)

You already have your Client ID set up: `164863429187-...apps.googleusercontent.com`

Make sure your OAuth consent screen has both scopes:
- `https://www.googleapis.com/auth/drive.file`
- `https://www.googleapis.com/auth/calendar.readonly`

On first visit, click **Connect Google** on the dashboard. This authenticates both Drive and Calendar in one go.

Your data will save to a file called `forge-data.json` in your Google Drive root. You can open it anytime to see your raw data.

---

## Adding or changing exercises

Everything lives in `data.js`. To add a new exercise:

```js
{ id: 'cable_row_wide', name: 'Wide Cable Row', group: 'Back', sets: 3, reps: '10–12', muscles: ['mid_back','lats'] }
```

The `group` property controls which Progress tab it appears under. Any new group name creates a new tab automatically. No other files need changing.

---

## Data

Primary storage: **Google Drive** (`forge-data.json`)
Backup/cache: **localStorage** (`forge_v2`)

The app always writes to both. If Drive is unavailable (offline, not authenticated), data still saves locally. Export button creates a timestamped JSON backup.

---

## Files

```
index.html   — structure, all page sections
style.css    — full design system, animations, new theme
data.js      — training plan, DB, Drive sync, all helpers, awards, momentum
bodymap.js   — SVG muscle map renderer
charts.js    — Chart.js, progress tabs, momentum dial
app.js       — all UI logic, page transitions, all new features
README.md
```
