# FORGE — Gym Tracker

A personal gym tracking web app built for Callum's Upper/Lower split programme.

## Features

- **Today** — Shows the correct session for the current day of the week. Log weights and reps for each set of every exercise.
- **Progress** — Charts showing weight progression for every exercise over time. Running distance and duration chart.
- **Body Map** — Anatomical front/back SVG that colours each muscle group based on training volume over the last 4 weeks.
- **Weight** — Monday morning weigh-in tracker with progress chart. Target: 80kg → 90kg.
- **Nutrition** — Daily calorie and protein logging with progress bars against targets (3,100 kcal / 165g protein).

## Data Storage

Data is saved to your browser's localStorage. **To prevent data loss if you clear your browser cache:**

1. Click **Export** in the top nav regularly — this downloads a `forge-data-YYYY-MM-DD.json` file.
2. Keep this file somewhere safe (e.g. in this repo folder, or cloud storage).
3. To restore: click **Import** and select your saved JSON file.

## Running Locally

No build step needed. Just open `index.html` in your browser:

```bash
# Option 1 — just open the file
open index.html

# Option 2 — local server (avoids any file:// quirks)
npx serve .
# or
python3 -m http.server 8080
```

## Hosting on GitHub Pages

1. Push this folder to a GitHub repository
2. Go to Settings → Pages
3. Set source to `main` branch, root folder
4. Your tracker will be live at `https://yourusername.github.io/repo-name`

## Training Plan

The plan is hardcoded in `data.js` and maps to days of the week:

| Day | Session |
|-----|---------|
| Monday | Upper A — Strength |
| Tuesday | Lower A — Strength |
| Wednesday | Run |
| Thursday | Upper B — Hypertrophy |
| Friday | Lower B — Hypertrophy |
| Saturday | Run (optional) |
| Sunday | Rest |

## File Structure

```
gymtracker/
├── index.html   — structure and nav
├── style.css    — dark theme styles
├── data.js      — training plan, DB helpers, data model
├── bodymap.js   — SVG muscle map rendering
├── charts.js    — Chart.js graph definitions
├── app.js       — page logic, form handlers, UI
└── README.md
```
