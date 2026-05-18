# FORGE v2 — Personal Dashboard

Your personal training + life dashboard.

## What's new in v2

- **Dashboard** — home screen with weather, today's schedule, recovery status, weekly stats, weight progress, nutrition bars
- **Google Calendar** — shows today's events on the dashboard
- **Session intro** — animated overlay on training days showing the session before you begin
- **Monday weight prompt** — auto-modal every Monday to log your fasted weight
- **Smart overload recommendations** — per exercise, analyses your last sessions and tells you to push, hold, or deload. Factors in your recovery score.
- **Recovery logging** — sleep hours + Fitbit score. Feeds into overload recommendations.
- **Strength / bodyweight ratio** — tracks relative strength as your weight changes
- **1RM estimate** — shown alongside raw weight on progress charts
- **PB flash** — banner appears when you log a new personal best
- **Deload reminder** — flags automatically every 7 weeks
- **Journal** — one entry per day, stored and browsable
- **Weather** — live Leeds weather with run condition tip

---

## Setup

### 1. Deploy to GitHub Pages

Upload all files to your repo root. Settings → Pages → main branch → root. Done.

### 2. Google Calendar Integration

This requires a Google OAuth Client ID. Takes about 5 minutes to set up:

**Step 1 — Create a Google Cloud project**
1. Go to https://console.cloud.google.com
2. Click "New Project" → name it "Forge Tracker" → Create
3. In the left menu go to **APIs & Services → Library**
4. Search "Google Calendar API" → Enable it

**Step 2 — Create OAuth credentials**
1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth Client ID**
3. Application type: **Web application**
4. Name: Forge Tracker
5. Under **Authorised JavaScript origins** add:
   - `https://callumc2323.github.io`
6. Under **Authorised redirect URIs** add:
   - `https://callumc2323.github.io/gym/`
7. Click Create — copy the **Client ID**

**Step 3 — Add your Client ID to the app**
1. Open `app.js`
2. Find this line near the top:
   ```
   const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
   ```
3. Replace `YOUR_GOOGLE_CLIENT_ID` with your actual Client ID
4. Save and push to GitHub

**Step 4 — OAuth consent screen**
1. Go to **APIs & Services → OAuth consent screen**
2. User Type: External → Create
3. Fill in app name "Forge" and your email
4. Add scope: `https://www.googleapis.com/auth/calendar.readonly`
5. Add your own email as a test user
6. Save

Once deployed, click **Connect Calendar** on the dashboard. You'll be asked to sign in with Google once, then events appear automatically every time you open the app.

---

## Data

All data saves to localStorage. **Export regularly** using the Export button — keeps a JSON backup you can import back at any time.

---

## Files

```
index.html   — structure, modals, nav
style.css    — dark theme
data.js      — training plan, DB, overload logic, stats
bodymap.js   — SVG muscle map
charts.js    — Chart.js graphs
app.js       — all UI logic
README.md
```
