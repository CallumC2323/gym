// ── GOOGLE FIT — HEALTH.JS ────────────────────────────────────────────────────
// Fetches steps, active minutes, calories burned, and detailed sleep stages
// from the Google Fitness REST API using the existing gToken from data.js.

// ── HELPERS ───────────────────────────────────────────────────────────────────

function fitEpochMs(date) {
  // Start of day midnight UTC for a given Date object
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function fitNowMs() {
  return Date.now();
}

function fitDaysAgoMs(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// ── AGGREGATE DATA SOURCE IDS ──────────────────────────────────────────────────

const FIT_STEPS_SOURCE    = 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps';
const FIT_CALORIES_SOURCE = 'derived:com.google.calories.expended:com.google.android.gms:merge_calories_expended';
const FIT_ACTIVE_SOURCE   = 'derived:com.google.active_minutes:com.google.android.gms:merge_active_minutes';

// ── CORE FETCH ────────────────────────────────────────────────────────────────

async function fitGet(url) {
  if (!gToken) return null;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${gToken}` }
    });
    if (res.status === 401) {
      gToken = null;
      localStorage.removeItem('forge_gtoken');
      return null;
    }
    if (!res.ok) return null;
    return await res.json();
  } catch(e) {
    return null;
  }
}

async function fitPost(url, body) {
  if (!gToken) return null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${gToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
    if (!res.ok) return null;
    return await res.json();
  } catch(e) {
    return null;
  }
}

// ── TODAY AGGREGATE (steps, calories, active mins) ────────────────────────────

async function fetchFitToday() {
  const startMs = fitEpochMs(new Date());
  const endMs   = fitNowMs();

  const body = {
    aggregateBy: [
      { dataTypeName: 'com.google.step_count.delta' },
      { dataTypeName: 'com.google.calories.expended' },
      { dataTypeName: 'com.google.active_minutes' }
    ],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: startMs,
    endTimeMillis: endMs
  };

  const data = await fitPost(
    'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
    body
  );

  if (!data?.bucket?.length) return { steps: 0, calories: 0, activeMin: 0 };

  const bucket = data.bucket[0];
  let steps = 0, calories = 0, activeMin = 0;

  bucket.dataset.forEach(ds => {
    ds.point.forEach(pt => {
      const val = pt.value[0];
      if (ds.dataSourceId.includes('step_count'))     steps     += (val.intVal || 0);
      if (ds.dataSourceId.includes('calories'))       calories  += (val.fpVal  || 0);
      if (ds.dataSourceId.includes('active_minutes')) activeMin += (val.intVal || val.fpVal || 0);
    });
  });

  return {
    steps:     Math.round(steps),
    calories:  Math.round(calories),
    activeMin: Math.round(activeMin)
  };
}

// ── LAST 7 DAYS AGGREGATE ─────────────────────────────────────────────────────

async function fetchFit7Days() {
  const startMs = fitDaysAgoMs(6);
  const endMs   = fitNowMs();

  const body = {
    aggregateBy: [
      { dataTypeName: 'com.google.step_count.delta' },
      { dataTypeName: 'com.google.calories.expended' },
      { dataTypeName: 'com.google.active_minutes' }
    ],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: startMs,
    endTimeMillis: endMs
  };

  const data = await fitPost(
    'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
    body
  );

  if (!data?.bucket) return [];

  return data.bucket.map(bucket => {
    const date = new Date(parseInt(bucket.startTimeMillis));
    const label = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
    let steps = 0, calories = 0, activeMin = 0;

    bucket.dataset.forEach(ds => {
      ds.point.forEach(pt => {
        const val = pt.value[0];
        if (ds.dataSourceId.includes('step_count'))     steps     += (val.intVal || 0);
        if (ds.dataSourceId.includes('calories'))       calories  += (val.fpVal  || 0);
        if (ds.dataSourceId.includes('active_minutes')) activeMin += (val.intVal || val.fpVal || 0);
      });
    });

    return {
      label,
      steps:     Math.round(steps),
      calories:  Math.round(calories),
      activeMin: Math.round(activeMin)
    };
  });
}

// ── SLEEP ─────────────────────────────────────────────────────────────────────
// Pulls last night's sleep session and breaks it into stages:
// 1 = Awake, 2 = Sleep (generic), 4 = Light, 5 = Deep, 6 = REM

const SLEEP_STAGES = {
  1: { label: 'Awake',  color: '#FF5A5A' },
  2: { label: 'Sleep',  color: '#00D9FF' },
  4: { label: 'Light',  color: '#00A8C8' },
  5: { label: 'Deep',   color: '#3DDC97' },
  6: { label: 'REM',    color: '#B9FF66' }
};

async function fetchFitSleep() {
  // Get sleep sessions from the last 36 hours
  const endMs   = fitNowMs();
  const startMs = endMs - (36 * 60 * 60 * 1000);

  // First fetch sessions to find the most recent sleep session
  const sessions = await fitGet(
    `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${new Date(startMs).toISOString()}&endTime=${new Date(endMs).toISOString()}&activityType=72`
  );

  if (!sessions?.session?.length) return null;

  // Sort and pick most recent
  const sorted = [...sessions.session].sort((a, b) =>
    parseInt(b.startTimeMillis) - parseInt(a.startTimeMillis)
  );
  const session = sorted[0];
  const sesStart = parseInt(session.startTimeMillis);
  const sesEnd   = parseInt(session.endTimeMillis);

  // Fetch sleep stage data for this session window
  const stageData = await fitPost(
    'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
    {
      aggregateBy: [{ dataTypeName: 'com.google.sleep.segment' }],
      bucketBySession: {},
      startTimeMillis: sesStart,
      endTimeMillis:   sesEnd
    }
  );

  const stageTotals = { 1: 0, 4: 0, 5: 0, 6: 0 }; // awake, light, deep, rem
  const segments = [];

  if (stageData?.bucket) {
    stageData.bucket.forEach(bucket => {
      bucket.dataset.forEach(ds => {
        ds.point.forEach(pt => {
          const stage    = pt.value[0]?.intVal;
          const durationMs = parseInt(pt.endTimeNanos / 1e6) - parseInt(pt.startTimeNanos / 1e6);
          const durationMin = Math.round(durationMs / 60000);

          if (stage in stageTotals) stageTotals[stage] += durationMin;
          if (durationMin > 0 && stage in SLEEP_STAGES) {
            segments.push({ stage, durationMin, startMs: parseInt(pt.startTimeNanos / 1e6) });
          }
        });
      });
    });
  }

  // Sort segments chronologically
  segments.sort((a, b) => a.startMs - b.startMs);

  const totalMin = Object.values(stageTotals).reduce((s, v) => s + v, 0);
  const totalHrs = totalMin / 60;

  // Sleep efficiency = time asleep / total time in bed
  const bedMin = (sesEnd - sesStart) / 60000;
  const efficiency = bedMin > 0 ? Math.round(((totalMin - stageTotals[1]) / bedMin) * 100) : 0;

  // Sleep score (simple composite)
  const deepPct  = totalMin > 0 ? stageTotals[5] / totalMin : 0;
  const remPct   = totalMin > 0 ? stageTotals[6] / totalMin : 0;
  const awakePct = totalMin > 0 ? stageTotals[1] / totalMin : 0;
  const hrScore  = Math.min(totalHrs / 8, 1);
  const score    = Math.round((hrScore * 40) + (deepPct * 25) + (remPct * 25) + ((1 - awakePct) * 10));

  return {
    totalMin,
    totalHrs: Math.round(totalHrs * 10) / 10,
    stages: {
      awake: stageTotals[1],
      light: stageTotals[4],
      deep:  stageTotals[5],
      rem:   stageTotals[6]
    },
    segments,
    efficiency,
    score: Math.min(score, 100),
    bedTime:  new Date(sesStart).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    wakeTime: new Date(sesEnd).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  };
}

// ── LAST 7 NIGHTS SLEEP ───────────────────────────────────────────────────────

async function fetchFitSleep7Days() {
  const endMs   = fitNowMs();
  const startMs = fitDaysAgoMs(6);

  const sessions = await fitGet(
    `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${new Date(startMs).toISOString()}&endTime=${new Date(endMs).toISOString()}&activityType=72`
  );

  if (!sessions?.session?.length) return [];

  // One session per day — pick the longest per day
  const byDay = {};
  sessions.session.forEach(s => {
    const day = new Date(parseInt(s.startTimeMillis)).toISOString().slice(0, 10);
    const dur = parseInt(s.endTimeMillis) - parseInt(s.startTimeMillis);
    if (!byDay[day] || dur > byDay[day].dur) {
      byDay[day] = { session: s, dur };
    }
  });

  return Object.entries(byDay)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, { session: s }]) => {
      const durationMin = (parseInt(s.endTimeMillis) - parseInt(s.startTimeMillis)) / 60000;
      return {
        label: new Date(day + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
        hours: Math.round((durationMin / 60) * 10) / 10
      };
    });
}

// ── DASHBOARD HEALTH CARD ─────────────────────────────────────────────────────

async function renderHealthCardDash() {
  const el = document.getElementById('dashHealthCard');
  if (!el) return;
  if (!gToken) {
    el.innerHTML = `<div class="card-label">Health</div>
      <div style="font-size:12px;color:var(--text3);margin-top:0.5rem">Connect Google to see health data</div>`;
    return;
  }

  el.innerHTML = `<div class="card-label">Health</div>
    <div class="health-loading" style="margin-top:0.5rem">
      <div class="briefing-loading-dot"></div>
      <div class="briefing-loading-dot"></div>
      <div class="briefing-loading-dot"></div>
    </div>`;

  const [today, sleep] = await Promise.all([fetchFitToday(), fetchFitSleep()]);

  const stepsGoal = 10000;
  const stepsPct  = Math.min(Math.round(today.steps / stepsGoal * 100), 100);
  const calsPct   = Math.min(Math.round(today.calories / 2500 * 100), 100);

  const sleepHtml = sleep
    ? `<div class="health-sleep-row">
        <div class="health-sleep-main">
          <span class="health-sleep-hrs">${sleep.totalHrs}h</span>
          <span class="health-sleep-score" style="color:${sleep.score >= 75 ? 'var(--emerald)' : sleep.score >= 55 ? 'var(--amber)' : 'var(--red)'}">Score ${sleep.score}</span>
        </div>
        <div class="health-stage-bar">
          ${renderStageMiniBar(sleep.stages, sleep.totalMin)}
        </div>
        <div class="health-stage-legend">
          ${renderStageLegendMini(sleep.stages)}
        </div>
      </div>`
    : `<div style="font-size:12px;color:var(--text3)">No sleep data yet</div>`;

  el.innerHTML = `
    <div class="card-label">Health · Today</div>
    <div class="health-stats-row">
      <div class="stat-item">
        <div class="stat-val cyan">${today.steps.toLocaleString()}</div>
        <div class="stat-lbl">steps</div>
      </div>
      <div class="stat-item">
        <div class="stat-val amber">${today.activeMin}</div>
        <div class="stat-lbl">active min</div>
      </div>
      <div class="stat-item">
        <div class="stat-val lime">${today.calories}</div>
        <div class="stat-lbl">kcal burned</div>
      </div>
    </div>
    <div style="margin-top:0.75rem">
      <div class="mini-bar-row">
        <span style="font-size:10px;color:var(--text3);width:42px;letter-spacing:0.05em;text-transform:uppercase">Steps</span>
        <div class="progress-bar-bg" style="flex:1"><div class="progress-bar-fill" style="width:${stepsPct}%"></div></div>
        <span style="font-size:10px;color:var(--text3);width:36px;text-align:right;font-family:'JetBrains Mono',monospace">${stepsPct}%</span>
      </div>
    </div>
    <div class="health-sleep-section" style="margin-top:1rem;padding-top:0.75rem;border-top:1px solid var(--border)">
      <div class="card-label" style="margin-bottom:0.5rem">Last Night's Sleep</div>
      ${sleepHtml}
    </div>
  `;
}

// ── SLEEP STAGE BAR ───────────────────────────────────────────────────────────

function renderStageMiniBar(stages, totalMin) {
  if (!totalMin) return '';
  const order = [
    { key: 'deep',  color: '#3DDC97', label: 'Deep' },
    { key: 'rem',   color: '#B9FF66', label: 'REM' },
    { key: 'light', color: '#00A8C8', label: 'Light' },
    { key: 'awake', color: '#FF5A5A', label: 'Awake' }
  ];
  return order
    .filter(s => stages[s.key] > 0)
    .map(s => {
      const pct = Math.round(stages[s.key] / totalMin * 100);
      return `<div class="stage-bar-seg" style="width:${pct}%;background:${s.color}" title="${s.label}: ${stages[s.key]}min (${pct}%)"></div>`;
    }).join('');
}

function renderStageLegendMini(stages) {
  const order = [
    { key: 'deep',  color: '#3DDC97', label: 'Deep' },
    { key: 'rem',   color: '#B9FF66', label: 'REM' },
    { key: 'light', color: '#00A8C8', label: 'Light' },
    { key: 'awake', color: '#FF5A5A', label: 'Awake' }
  ];
  return order
    .filter(s => stages[s.key] > 0)
    .map(s => `<span class="stage-legend-item">
      <span class="stage-dot" style="background:${s.color}"></span>
      <span>${s.label} ${stages[s.key]}m</span>
    </span>`).join('');
}

// ── FULL HEALTH PAGE ──────────────────────────────────────────────────────────

async function renderHealthPage() {
  const el = document.getElementById('healthPageContent');
  if (!el) return;

  if (!gToken) {
    el.innerHTML = `<div class="card" style="text-align:center;padding:3rem">
      <div style="font-size:14px;color:var(--text2)">Connect Google to see your health data</div>
    </div>`;
    return;
  }

  el.innerHTML = `<div style="display:flex;align-items:center;gap:8px;color:var(--text3);font-size:13px;padding:1rem 0">
    <div class="briefing-loading-dot"></div>
    <div class="briefing-loading-dot"></div>
    <div class="briefing-loading-dot"></div>
    <span style="font-family:'JetBrains Mono',monospace;font-size:11px;margin-left:4px">Fetching from Google Fit…</span>
  </div>`;

  const [todayData, week, sleep, sleepWeek] = await Promise.all([
    fetchFitToday(),
    fetchFit7Days(),
    fetchFitSleep(),
    fetchFitSleep7Days()
  ]);

  el.innerHTML = `
    <!-- TODAY STATS -->
    <div class="health-today-grid card">
      <div class="card-label" style="grid-column:1/-1">Today's Activity</div>
      <div class="health-big-stat">
        <div class="health-big-val cyan">${todayData.steps.toLocaleString()}</div>
        <div class="health-big-lbl">Steps</div>
        <div class="health-big-goal">Goal: 10,000</div>
        <div class="progress-bar-bg" style="margin-top:8px">
          <div class="progress-bar-fill" style="width:${Math.min(todayData.steps/10000*100,100)}%"></div>
        </div>
      </div>
      <div class="health-big-stat">
        <div class="health-big-val amber">${todayData.activeMin}</div>
        <div class="health-big-lbl">Active Minutes</div>
        <div class="health-big-goal">Goal: 30 min</div>
        <div class="progress-bar-bg" style="margin-top:8px">
          <div class="progress-bar-fill gold" style="width:${Math.min(todayData.activeMin/30*100,100)}%"></div>
        </div>
      </div>
      <div class="health-big-stat">
        <div class="health-big-val lime">${todayData.calories}</div>
        <div class="health-big-lbl">Calories Burned</div>
        <div class="health-big-goal">Est. TDEE: 2,500</div>
        <div class="progress-bar-bg" style="margin-top:8px">
          <div class="progress-bar-fill lime" style="width:${Math.min(todayData.calories/2500*100,100)}%"></div>
        </div>
      </div>
    </div>

    <!-- SLEEP DETAIL -->
    <div class="card" id="sleepDetailCard">
      <div class="card-label">Last Night's Sleep</div>
      ${sleep ? renderSleepDetail(sleep) : '<div style="font-size:13px;color:var(--text3);margin-top:0.5rem">No sleep data found for last night.</div>'}
    </div>

    <!-- 7 DAY CHARTS -->
    <div class="card">
      <div class="card-label" style="margin-bottom:1rem">7-Day Activity</div>
      <div class="tab-row" id="healthTabRow" style="margin-bottom:1rem">
        <button class="tab-btn active" data-htab="steps">Steps</button>
        <button class="tab-btn" data-htab="activeMin">Active Min</button>
        <button class="tab-btn" data-htab="calories">Calories</button>
      </div>
      <div class="chart-wrap" style="margin-bottom:0">
        <canvas id="healthActivityChart"></canvas>
      </div>
    </div>

    <!-- 7 NIGHT SLEEP CHART -->
    <div class="card">
      <div class="card-label" style="margin-bottom:1rem">7-Night Sleep</div>
      <div class="chart-wrap" style="margin-bottom:0">
        <canvas id="healthSleepChart"></canvas>
      </div>
    </div>
  `;

  // Store week data for tab switching
  window._fitWeekData = week;

  // Render default chart
  renderHealthActivityChart(week, 'steps');
  renderHealthSleepChart(sleepWeek);

  // Tab switching
  document.getElementById('healthTabRow').querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#healthTabRow .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderHealthActivityChart(window._fitWeekData, btn.dataset.htab);
    });
  });
}

// ── SLEEP DETAIL RENDERER ─────────────────────────────────────────────────────

function renderSleepDetail(sleep) {
  const totalMin = sleep.totalMin;
  const scoreColor = sleep.score >= 75 ? 'var(--emerald)' : sleep.score >= 55 ? 'var(--amber)' : 'var(--red)';
  const order = [
    { key: 'deep',  color: '#3DDC97', label: 'Deep',  tip: 'Physical restoration, memory consolidation' },
    { key: 'rem',   color: '#B9FF66', label: 'REM',   tip: 'Mental recovery, emotional processing, learning' },
    { key: 'light', color: '#00A8C8', label: 'Light', tip: 'Transition stage, easier to wake from' },
    { key: 'awake', color: '#FF5A5A', label: 'Awake', tip: 'Disruptions during the night' }
  ];

  const stageRows = order.filter(s => sleep.stages[s.key] > 0).map(s => {
    const min = sleep.stages[s.key];
    const pct = totalMin > 0 ? Math.round(min / totalMin * 100) : 0;
    const hrs = Math.floor(min / 60);
    const rem = min % 60;
    const timeStr = hrs > 0 ? `${hrs}h ${rem}m` : `${rem}m`;
    return `<div class="sleep-stage-row">
      <div class="sleep-stage-dot" style="background:${s.color}"></div>
      <div class="sleep-stage-name">${s.label}</div>
      <div class="sleep-stage-bar-wrap">
        <div class="progress-bar-bg" style="height:6px">
          <div style="height:100%;width:${pct}%;background:${s.color};border-radius:3px;box-shadow:0 0 6px ${s.color}55;transition:width 0.8s cubic-bezier(0.22,1,0.36,1)"></div>
        </div>
      </div>
      <div class="sleep-stage-time">${timeStr}</div>
      <div class="sleep-stage-pct" style="color:${s.color}">${pct}%</div>
    </div>`;
  }).join('');

  return `
    <div class="sleep-header-row">
      <div class="sleep-meta-block">
        <div class="sleep-big-hrs">${sleep.totalHrs}h</div>
        <div class="sleep-meta-sub">${sleep.bedTime} → ${sleep.wakeTime}</div>
      </div>
      <div class="sleep-score-block">
        <div class="sleep-score-val" style="color:${scoreColor}">${sleep.score}</div>
        <div class="sleep-score-lbl">Sleep Score</div>
      </div>
      <div class="sleep-eff-block">
        <div class="sleep-score-val" style="color:var(--cyan)">${sleep.efficiency}%</div>
        <div class="sleep-score-lbl">Efficiency</div>
      </div>
    </div>

    <!-- Stage bar -->
    <div class="stage-bar-full" style="margin:1.25rem 0 0.5rem">
      ${renderStageMiniBar(sleep.stages, sleep.totalMin)}
    </div>

    <!-- Stage breakdown -->
    <div class="sleep-stages-list" style="margin-top:1rem">
      ${stageRows}
    </div>

    <!-- Contextual insight -->
    <div class="sleep-insight" style="margin-top:1rem">
      ${getSleepInsight(sleep)}
    </div>
  `;
}

// ── SLEEP INSIGHT TEXT ────────────────────────────────────────────────────────

function getSleepInsight(sleep) {
  const { stages, totalHrs, score, efficiency } = sleep;
  const totalMin = sleep.totalMin;
  const deepPct  = totalMin > 0 ? (stages.deep  / totalMin) * 100 : 0;
  const remPct   = totalMin > 0 ? (stages.rem   / totalMin) * 100 : 0;
  const awakePct = totalMin > 0 ? (stages.awake / totalMin) * 100 : 0;

  const insights = [];

  if (totalHrs < 6)       insights.push({ type: 'bad', text: `Only ${totalHrs}h total — recovery and muscle protein synthesis are compromised below 7h. Prioritise getting to bed earlier tonight.` });
  else if (totalHrs >= 8) insights.push({ type: 'good', text: `${totalHrs}h of sleep — optimal range. Your body has full time for both physical repair and cognitive restoration.` });
  else                    insights.push({ type: 'ok',  text: `${totalHrs}h — decent, but 8h is the target for someone in a lean bulk. Every hour under 8 slightly reduces growth hormone output.` });

  if (deepPct < 10 && stages.deep > 0)       insights.push({ type: 'bad', text: `Deep sleep is low (${Math.round(deepPct)}%). This is the most physically restorative stage — alcohol, late eating, and inconsistent bed times all suppress it.` });
  else if (deepPct >= 20)                     insights.push({ type: 'good', text: `Strong deep sleep (${Math.round(deepPct)}%). This is where growth hormone peaks and muscle tissue repairs. Good sign.` });

  if (remPct < 15 && stages.rem > 0)          insights.push({ type: 'bad', text: `REM is low (${Math.round(remPct)}%). REM handles mental recovery and learning — important for motor pattern retention from training.` });
  else if (remPct >= 22)                      insights.push({ type: 'good', text: `Good REM proportion (${Math.round(remPct)}%). Mental recovery and motor learning are well supported.` });

  if (awakePct > 15)                          insights.push({ type: 'bad', text: `High awake time (${Math.round(awakePct)}% of the night). This fragments your sleep cycles and reduces overall quality.` });

  if (efficiency < 80)                        insights.push({ type: 'ok',  text: `Sleep efficiency is ${efficiency}% — below 85% suggests you're spending significant time in bed not sleeping.` });

  if (!insights.length) insights.push({ type: 'good', text: 'Sleep looks solid across all metrics.' });

  const colorMap = { good: 'var(--emerald)', ok: 'var(--amber)', bad: 'var(--red)' };
  const iconMap  = { good: '✓', ok: '→', bad: '↓' };

  return insights.map(i => `
    <div class="sleep-insight-item" style="border-left-color:${colorMap[i.type]}">
      <span style="color:${colorMap[i.type]};font-weight:600;margin-right:6px">${iconMap[i.type]}</span>
      <span>${i.text}</span>
    </div>
  `).join('');
}

// ── HEALTH ACTIVITY CHART ─────────────────────────────────────────────────────

let healthActivityChartInstance = null;
let healthSleepChartInstance    = null;

function renderHealthActivityChart(week, metric) {
  if (healthActivityChartInstance) { healthActivityChartInstance.destroy(); healthActivityChartInstance = null; }
  const ctx = document.getElementById('healthActivityChart')?.getContext('2d');
  if (!ctx || !week.length) return;

  const metaMap = {
    steps:     { label: 'Steps',          color: '#00D9FF', goal: 10000 },
    activeMin: { label: 'Active Minutes', color: '#FFB347', goal: 30 },
    calories:  { label: 'Calories Burned', color: '#B9FF66', goal: 2500 }
  };
  const meta = metaMap[metric];

  healthActivityChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: week.map(d => d.label),
      datasets: [
        {
          label: meta.label,
          data: week.map(d => d[metric]),
          backgroundColor: meta.color + '55',
          borderColor: meta.color,
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: 'Goal',
          data: week.map(() => meta.goal),
          type: 'line',
          borderColor: 'rgba(255,255,255,0.15)',
          borderDash: [5, 4],
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      ...CD,
      plugins: { ...CD.plugins, legend: { display: false } }
    }
  });
}

function renderHealthSleepChart(sleepWeek) {
  if (healthSleepChartInstance) { healthSleepChartInstance.destroy(); healthSleepChartInstance = null; }
  const ctx = document.getElementById('healthSleepChart')?.getContext('2d');
  if (!ctx) return;

  if (!sleepWeek.length) {
    ctx.canvas.parentElement.innerHTML += `<div style="text-align:center;color:var(--text3);font-size:12px;padding:2rem">No sleep history available</div>`;
    return;
  }

  healthSleepChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sleepWeek.map(d => d.label),
      datasets: [
        {
          label: 'Hours slept',
          data: sleepWeek.map(d => d.hours),
          backgroundColor: 'rgba(61,220,151,0.35)',
          borderColor: '#3DDC97',
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: '8h target',
          data: sleepWeek.map(() => 8),
          type: 'line',
          borderColor: 'rgba(255,255,255,0.15)',
          borderDash: [5, 4],
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      ...CD,
      plugins: { ...CD.plugins, legend: { display: false } },
      scales: {
        ...CD.scales,
        y: { ...CD.scales.y, min: 0, max: 10, ticks: { ...CD.scales.y.ticks, callback: v => v + 'h' } }
      }
    }
  });
}
