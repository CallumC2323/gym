// ── FORGE — HEALTH.JS ─────────────────────────────────────────────────────────
// Google Fitness REST API: steps, active minutes, calories, sleep stages

// ── TIME HELPERS ──────────────────────────────────────────────────────────────

function fitStartOfDayMs() {
  const d = new Date(); d.setHours(0,0,0,0); return d.getTime();
}
function fitNowMs() { return Date.now(); }
function fitDaysAgoMs(n) {
  const d = new Date(); d.setDate(d.getDate()-n); d.setHours(0,0,0,0); return d.getTime();
}

// ── CORE FETCH ────────────────────────────────────────────────────────────────

async function fitPost(body) {
  if (!gToken) return null;
  try {
    const res = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${gToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (res.status === 401) { gToken = null; localStorage.removeItem('forge_gtoken'); return null; }
    if (!res.ok) return null;
    return await res.json();
  } catch(e) { return null; }
}

async function fitGet(url) {
  if (!gToken) return null;
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${gToken}` } });
    if (res.status === 401) { gToken = null; localStorage.removeItem('forge_gtoken'); return null; }
    if (!res.ok) return null;
    return await res.json();
  } catch(e) { return null; }
}

// ── ACTIVITY: TODAY ───────────────────────────────────────────────────────────

async function fetchFitToday() {
  const data = await fitPost({
    aggregateBy: [
      { dataTypeName: 'com.google.step_count.delta' },
      { dataTypeName: 'com.google.calories.expended' },
      { dataTypeName: 'com.google.active_minutes' }
    ],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: fitStartOfDayMs(),
    endTimeMillis: fitNowMs()
  });
  if (!data?.bucket?.length) return { steps:0, calories:0, activeMin:0 };
  let steps=0, calories=0, activeMin=0;
  data.bucket[0].dataset.forEach(ds => {
    ds.point.forEach(pt => {
      const v = pt.value[0];
      if (ds.dataSourceId.includes('step_count'))     steps     += (v.intVal||0);
      if (ds.dataSourceId.includes('calories'))       calories  += (v.fpVal||0);
      if (ds.dataSourceId.includes('active_minutes')) activeMin += (v.intVal||v.fpVal||0);
    });
  });
  return { steps:Math.round(steps), calories:Math.round(calories), activeMin:Math.round(activeMin) };
}

// ── ACTIVITY: 7 DAYS ──────────────────────────────────────────────────────────

async function fetchFit7Days() {
  const data = await fitPost({
    aggregateBy: [
      { dataTypeName: 'com.google.step_count.delta' },
      { dataTypeName: 'com.google.calories.expended' },
      { dataTypeName: 'com.google.active_minutes' }
    ],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis: fitDaysAgoMs(6),
    endTimeMillis: fitNowMs()
  });
  if (!data?.bucket) return [];
  return data.bucket.map(bucket => {
    const label = new Date(parseInt(bucket.startTimeMillis))
      .toLocaleDateString('en-GB', { weekday:'short', day:'numeric' });
    let steps=0, calories=0, activeMin=0;
    bucket.dataset.forEach(ds => {
      ds.point.forEach(pt => {
        const v = pt.value[0];
        if (ds.dataSourceId.includes('step_count'))     steps     += (v.intVal||0);
        if (ds.dataSourceId.includes('calories'))       calories  += (v.fpVal||0);
        if (ds.dataSourceId.includes('active_minutes')) activeMin += (v.intVal||v.fpVal||0);
      });
    });
    return { label, steps:Math.round(steps), calories:Math.round(calories), activeMin:Math.round(activeMin) };
  });
}

// ── SLEEP ─────────────────────────────────────────────────────────────────────

async function fetchFitSleep() {
  const endMs   = fitNowMs();
  const startMs = endMs - (40 * 60 * 60 * 1000); // last 40 hours

  const sessions = await fitGet(
    `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${new Date(startMs).toISOString()}&endTime=${new Date(endMs).toISOString()}&activityType=72`
  );
  if (!sessions?.session?.length) return null;

  const sorted = [...sessions.session].sort((a,b) =>
    parseInt(b.startTimeMillis) - parseInt(a.startTimeMillis)
  );
  const s = sorted[0];
  const sesStart = parseInt(s.startTimeMillis);
  const sesEnd   = parseInt(s.endTimeMillis);

  const stageData = await fitPost({
    aggregateBy: [{ dataTypeName: 'com.google.sleep.segment' }],
    bucketBySession: {},
    startTimeMillis: sesStart,
    endTimeMillis: sesEnd
  });

  const stageTotals = { 1:0, 4:0, 5:0, 6:0 };
  if (stageData?.bucket) {
    stageData.bucket.forEach(bucket => {
      bucket.dataset.forEach(ds => {
        ds.point.forEach(pt => {
          const stage = pt.value[0]?.intVal;
          const durMin = Math.round((parseInt(pt.endTimeNanos) - parseInt(pt.startTimeNanos)) / 1e9 / 60);
          if (stage in stageTotals && durMin > 0) stageTotals[stage] += durMin;
        });
      });
    });
  }

  const totalMin = Object.values(stageTotals).reduce((s,v) => s+v, 0);
  // fallback: use session duration if no segments parsed
  const bedMin = (sesEnd - sesStart) / 60000;
  const effectiveTotal = totalMin > 0 ? totalMin : Math.round(bedMin);
  const totalHrs = Math.round((effectiveTotal / 60) * 10) / 10;

  const efficiency = bedMin > 0 ? Math.round(((effectiveTotal - stageTotals[1]) / bedMin) * 100) : 0;

  const deepPct  = effectiveTotal > 0 ? stageTotals[5] / effectiveTotal : 0;
  const remPct   = effectiveTotal > 0 ? stageTotals[6] / effectiveTotal : 0;
  const awakePct = effectiveTotal > 0 ? stageTotals[1] / effectiveTotal : 0;
  const score    = Math.min(100, Math.round(
    (Math.min(totalHrs/8,1)*40) + (deepPct*25) + (remPct*25) + ((1-awakePct)*10)
  ));

  return {
    totalMin: effectiveTotal,
    totalHrs,
    stages: { awake:stageTotals[1], light:stageTotals[4], deep:stageTotals[5], rem:stageTotals[6] },
    efficiency: Math.min(100, efficiency),
    score,
    bedTime:  new Date(sesStart).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }),
    wakeTime: new Date(sesEnd).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })
  };
}

async function fetchFitSleep7Days() {
  const endMs   = fitNowMs();
  const startMs = fitDaysAgoMs(6);
  const sessions = await fitGet(
    `https://www.googleapis.com/fitness/v1/users/me/sessions?startTime=${new Date(startMs).toISOString()}&endTime=${new Date(endMs).toISOString()}&activityType=72`
  );
  if (!sessions?.session?.length) return [];
  const byDay = {};
  sessions.session.forEach(s => {
    const day = new Date(parseInt(s.startTimeMillis)).toISOString().slice(0,10);
    const dur = parseInt(s.endTimeMillis) - parseInt(s.startTimeMillis);
    if (!byDay[day] || dur > byDay[day].dur) byDay[day] = { s, dur };
  });
  return Object.entries(byDay)
    .sort(([a],[b]) => a.localeCompare(b))
    .map(([day, {s}]) => ({
      label: new Date(day+'T12:00:00').toLocaleDateString('en-GB', { weekday:'short', day:'numeric' }),
      hours: Math.round(((parseInt(s.endTimeMillis)-parseInt(s.startTimeMillis))/3600000)*10)/10
    }));
}

// ── STAGE BAR HELPERS ─────────────────────────────────────────────────────────

function renderStageBar(stages, totalMin, height='8px') {
  const order = [
    { key:'deep',  color:'#3DDC97' },
    { key:'rem',   color:'#B9FF66' },
    { key:'light', color:'#00A8C8' },
    { key:'awake', color:'#FF5A5A' }
  ];
  if (!totalMin) return '';
  return order.filter(s => stages[s.key] > 0).map(s => {
    const pct = Math.round(stages[s.key]/totalMin*100);
    return `<div style="width:${pct}%;height:${height};background:${s.color};border-radius:2px;transition:width 0.8s ease" title="${s.key}: ${stages[s.key]}min (${pct}%)"></div>`;
  }).join('');
}

function renderStageLegend(stages) {
  const order = [
    { key:'deep',  color:'#3DDC97', label:'Deep' },
    { key:'rem',   color:'#B9FF66', label:'REM' },
    { key:'light', color:'#00A8C8', label:'Light' },
    { key:'awake', color:'#FF5A5A', label:'Awake' }
  ];
  return order.filter(s => stages[s.key] > 0).map(s =>
    `<span style="display:flex;align-items:center;gap:4px;font-size:11px;color:var(--text2);font-family:'JetBrains Mono',monospace">
      <span style="width:7px;height:7px;border-radius:50%;background:${s.color};flex-shrink:0;display:inline-block"></span>
      ${s.label} ${stages[s.key]}m
    </span>`
  ).join('');
}

// ── SLEEP INSIGHT ─────────────────────────────────────────────────────────────

function getSleepInsight(sleep) {
  const { stages, totalHrs, score } = sleep;
  const t = sleep.totalMin;
  const deepPct  = t > 0 ? stages.deep /t*100 : 0;
  const remPct   = t > 0 ? stages.rem  /t*100 : 0;
  const awakePct = t > 0 ? stages.awake/t*100 : 0;
  const insights = [];

  if (totalHrs < 6)       insights.push({ type:'bad',  text:`Only ${totalHrs}h — below 6h seriously impairs muscle protein synthesis and GH output. Get to bed earlier tonight.` });
  else if (totalHrs >= 8) insights.push({ type:'good', text:`${totalHrs}h — optimal for a lean bulk. Full time for physical repair and cognitive restoration.` });
  else                    insights.push({ type:'ok',   text:`${totalHrs}h — decent but 8h is the target. Each hour under 8 reduces overnight GH release.` });

  if (stages.deep > 0) {
    if (deepPct < 12)     insights.push({ type:'bad',  text:`Low deep sleep (${Math.round(deepPct)}%). This is where GH peaks and tissue repairs. Alcohol, late meals and irregular sleep times suppress it.` });
    else if (deepPct>=20) insights.push({ type:'good', text:`Strong deep sleep (${Math.round(deepPct)}%). GH and tissue repair are well covered.` });
  }

  if (stages.rem > 0) {
    if (remPct < 15)      insights.push({ type:'bad',  text:`Low REM (${Math.round(remPct)}%). REM handles motor learning and mental recovery — relevant for retaining new movement patterns from training.` });
    else if (remPct>=22)  insights.push({ type:'good', text:`Good REM (${Math.round(remPct)}%). Motor learning and mental recovery well supported.` });
  }

  if (awakePct > 15)      insights.push({ type:'bad',  text:`High awake time (${Math.round(awakePct)}%). Fragmented sleep cycles reduce overall quality even if total hours look fine.` });

  if (!insights.length)   insights.push({ type:'good', text:'Sleep looks solid across all metrics.' });

  const colorMap = { good:'var(--emerald)', ok:'var(--amber)', bad:'var(--red)' };
  const iconMap  = { good:'✓', ok:'→', bad:'↓' };
  return insights.map(i =>
    `<div style="font-size:13px;color:var(--text2);line-height:1.6;padding:0.625rem 0.75rem;border-left:2px solid ${colorMap[i.type]};background:var(--bg3);border-radius:0 8px 8px 0;margin-bottom:0.5rem">
      <span style="color:${colorMap[i.type]};font-weight:600;margin-right:6px">${iconMap[i.type]}</span>${i.text}
    </div>`
  ).join('');
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

  el.innerHTML = `<div class="card-label">Health · Today</div>
    <div style="display:flex;gap:4px;padding:0.5rem 0">
      <div class="briefing-loading-dot"></div><div class="briefing-loading-dot"></div><div class="briefing-loading-dot"></div>
    </div>`;

  const [act, sleep] = await Promise.all([fetchFitToday(), fetchFitSleep()]);

  const stepsPct = Math.min(Math.round(act.steps/10000*100),100);

  el.innerHTML = `
    <div class="card-label">Health · Today</div>
    <div style="display:flex;gap:2rem;margin-top:0.5rem;flex-wrap:wrap">
      <div class="stat-item">
        <div class="stat-val">${act.steps.toLocaleString()}</div>
        <div class="stat-lbl">steps</div>
      </div>
      <div class="stat-item">
        <div class="stat-val amber">${act.activeMin}</div>
        <div class="stat-lbl">active min</div>
      </div>
      <div class="stat-item">
        <div class="stat-val lime">${act.calories}</div>
        <div class="stat-lbl">kcal burned</div>
      </div>
    </div>
    <div class="mini-bar-row" style="margin-top:0.75rem">
      <span style="font-size:10px;color:var(--text3);width:42px;text-transform:uppercase;letter-spacing:0.05em">Steps</span>
      <div class="progress-bar-bg" style="flex:1"><div class="progress-bar-fill" style="width:${stepsPct}%"></div></div>
      <span style="font-size:10px;color:var(--text3);width:36px;text-align:right;font-family:'JetBrains Mono',monospace">${stepsPct}%</span>
    </div>
    <div style="margin-top:1rem;padding-top:0.75rem;border-top:1px solid var(--border)">
      <div class="card-label" style="margin-bottom:0.5rem">Last Night's Sleep</div>
      ${sleep ? `
        <div style="display:flex;align-items:baseline;gap:0.75rem;margin-bottom:0.5rem">
          <span style="font-family:'JetBrains Mono',monospace;font-size:26px;color:var(--emerald);line-height:1">${sleep.totalHrs}h</span>
          <span style="font-size:13px;font-family:'JetBrains Mono',monospace;color:${sleep.score>=75?'var(--emerald)':sleep.score>=55?'var(--amber)':'var(--red)'}">Score ${sleep.score}</span>
          <span style="font-size:11px;color:var(--text3)">${sleep.bedTime} → ${sleep.wakeTime}</span>
        </div>
        <div style="display:flex;height:8px;border-radius:4px;overflow:hidden;gap:1px;background:var(--bg3);margin-bottom:0.5rem">
          ${renderStageBar(sleep.stages, sleep.totalMin)}
        </div>
        <div style="display:flex;gap:0.75rem;flex-wrap:wrap">${renderStageLegend(sleep.stages)}</div>
      ` : `<div style="font-size:12px;color:var(--text3)">No sleep data yet</div>`}
    </div>
  `;
}

// ── FULL HEALTH PAGE ──────────────────────────────────────────────────────────

let _healthActivityChart = null;
let _healthSleepChart    = null;

async function renderHealthPage() {
  const el = document.getElementById('healthPageContent');
  if (!el) return;
  if (!gToken) {
    el.innerHTML = `<div class="card" style="text-align:center;padding:3rem;color:var(--text2);font-size:14px">Connect Google to see your health data</div>`;
    return;
  }
  el.innerHTML = `<div style="display:flex;align-items:center;gap:8px;color:var(--text3);font-size:13px;padding:1rem 0">
    <div class="briefing-loading-dot"></div><div class="briefing-loading-dot"></div><div class="briefing-loading-dot"></div>
    <span style="font-family:'JetBrains Mono',monospace;font-size:11px;margin-left:6px">Fetching from Google Fit…</span>
  </div>`;

  const [act, week, sleep, sleepWeek] = await Promise.all([
    fetchFitToday(), fetchFit7Days(), fetchFitSleep(), fetchFitSleep7Days()
  ]);

  const stepsPct = Math.min(Math.round(act.steps/10000*100),100);
  const actPct   = Math.min(Math.round(act.activeMin/30*100),100);
  const calPct   = Math.min(Math.round(act.calories/2500*100),100);

  el.innerHTML = `
    <!-- TODAY -->
    <div class="card" style="margin-bottom:1.25rem">
      <div class="card-label" style="margin-bottom:1rem">Today's Activity</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem">
        ${healthStatBlock(act.steps.toLocaleString(), 'Steps', 'var(--cyan)', 'Goal: 10,000', stepsPct, 'var(--cyan)')}
        ${healthStatBlock(act.activeMin, 'Active Minutes', 'var(--amber)', 'Goal: 30 min', actPct, 'var(--amber)')}
        ${healthStatBlock(act.calories, 'Calories Burned', 'var(--lime)', 'Est. TDEE: 2,500', calPct, 'var(--lime)')}
      </div>
    </div>

    <!-- SLEEP -->
    <div class="card" style="margin-bottom:1.25rem">
      <div class="card-label" style="margin-bottom:0.75rem">Last Night's Sleep</div>
      ${sleep ? renderSleepDetail(sleep) : `<div style="font-size:13px;color:var(--text3);padding:0.5rem 0">No sleep data found. Make sure your Fitbit is synced to Google Fit.</div>`}
    </div>

    <!-- 7 DAY ACTIVITY CHART -->
    <div class="card" style="margin-bottom:1.25rem">
      <div class="card-label" style="margin-bottom:1rem">7-Day Activity</div>
      <div class="tab-row" id="healthTabRow" style="margin-bottom:1rem">
        <button class="tab-btn active" data-htab="steps">Steps</button>
        <button class="tab-btn" data-htab="activeMin">Active Min</button>
        <button class="tab-btn" data-htab="calories">Calories</button>
      </div>
      <div class="chart-wrap" style="margin-bottom:0"><canvas id="healthActivityChart"></canvas></div>
    </div>

    <!-- 7 NIGHT SLEEP CHART -->
    <div class="card">
      <div class="card-label" style="margin-bottom:1rem">7-Night Sleep</div>
      <div class="chart-wrap" style="margin-bottom:0"><canvas id="healthSleepChart"></canvas></div>
    </div>
  `;

  window._fitWeekData = week;
  renderHealthActivityChart(week, 'steps');
  renderHealthSleepChart(sleepWeek);

  document.getElementById('healthTabRow')?.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#healthTabRow .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderHealthActivityChart(window._fitWeekData, btn.dataset.htab);
    });
  });
}

function healthStatBlock(val, label, color, goal, pct, barColor) {
  return `<div style="background:var(--bg3);border-radius:8px;padding:1.25rem">
    <div style="font-family:'JetBrains Mono',monospace;font-size:36px;font-weight:500;color:${color};line-height:1">${val}</div>
    <div style="font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.08em;margin-top:6px">${label}</div>
    <div style="font-size:11px;color:var(--text3);font-family:'JetBrains Mono',monospace;margin-top:3px">${goal}</div>
    <div class="progress-bar-bg" style="margin-top:8px">
      <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px;box-shadow:0 0 8px ${barColor}66;transition:width 0.8s cubic-bezier(0.22,1,0.36,1)"></div>
    </div>
  </div>`;
}

function renderSleepDetail(sleep) {
  const t = sleep.totalMin;
  const sc = sleep.score;
  const scColor = sc>=75?'var(--emerald)':sc>=55?'var(--amber)':'var(--red)';
  const order = [
    { key:'deep',  color:'#3DDC97', label:'Deep',  tip:'Physical restoration, GH release' },
    { key:'rem',   color:'#B9FF66', label:'REM',   tip:'Mental recovery, motor learning' },
    { key:'light', color:'#00A8C8', label:'Light', tip:'Transition stage, easily disrupted' },
    { key:'awake', color:'#FF5A5A', label:'Awake', tip:'Disruptions during the night' }
  ];

  const stageRows = order.filter(s => sleep.stages[s.key] > 0).map(s => {
    const min = sleep.stages[s.key];
    const pct = t > 0 ? Math.round(min/t*100) : 0;
    const hrs = Math.floor(min/60), rem = min%60;
    const timeStr = hrs > 0 ? `${hrs}h ${rem}m` : `${rem}m`;
    return `<div style="display:grid;grid-template-columns:10px 60px 1fr 55px 36px;align-items:center;gap:0.75rem;margin-bottom:0.625rem">
      <div style="width:10px;height:10px;border-radius:50%;background:${s.color}"></div>
      <div style="font-size:12px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.06em">${s.label}</div>
      <div class="progress-bar-bg" style="height:6px">
        <div style="height:100%;width:${pct}%;background:${s.color};border-radius:3px;box-shadow:0 0 6px ${s.color}55;transition:width 0.8s ease"></div>
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text2);text-align:right">${timeStr}</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:${s.color};text-align:right">${pct}%</div>
    </div>`;
  }).join('');

  return `
    <div style="display:flex;gap:2rem;align-items:flex-start;flex-wrap:wrap;margin-bottom:1.25rem">
      <div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:48px;font-weight:500;color:var(--emerald);line-height:1">${sleep.totalHrs}h</div>
        <div style="font-size:11px;color:var(--text3);font-family:'JetBrains Mono',monospace;margin-top:4px">${sleep.bedTime} → ${sleep.wakeTime}</div>
      </div>
      <div style="background:var(--bg3);border-radius:8px;padding:0.75rem 1.25rem;text-align:center;min-width:80px">
        <div style="font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:500;color:${scColor};line-height:1">${sc}</div>
        <div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-top:4px">Sleep Score</div>
      </div>
      <div style="background:var(--bg3);border-radius:8px;padding:0.75rem 1.25rem;text-align:center;min-width:80px">
        <div style="font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:500;color:var(--cyan);line-height:1">${sleep.efficiency}%</div>
        <div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;margin-top:4px">Efficiency</div>
      </div>
    </div>

    <div style="display:flex;height:12px;border-radius:6px;overflow:hidden;gap:1px;background:var(--bg3);margin-bottom:0.75rem">
      ${renderStageBar(sleep.stages, t, '12px')}
    </div>
    <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:1.25rem">${renderStageLegend(sleep.stages)}</div>

    <div style="margin-bottom:0.25rem">${stageRows}</div>
    <div style="margin-top:1rem">${getSleepInsight(sleep)}</div>
  `;
}

function renderHealthActivityChart(week, metric) {
  if (_healthActivityChart) { _healthActivityChart.destroy(); _healthActivityChart = null; }
  const ctx = document.getElementById('healthActivityChart')?.getContext('2d');
  if (!ctx || !week.length) return;
  const meta = {
    steps:     { label:'Steps',           color:'#00D9FF', goal:10000 },
    activeMin: { label:'Active Minutes',  color:'#FFB347', goal:30 },
    calories:  { label:'Calories Burned', color:'#B9FF66', goal:2500 }
  }[metric];
  _healthActivityChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: week.map(d => d.label),
      datasets: [
        { label:meta.label, data:week.map(d=>d[metric]), backgroundColor:meta.color+'55', borderColor:meta.color, borderWidth:1, borderRadius:4 },
        { label:'Goal', data:week.map(()=>meta.goal), type:'line', borderColor:'rgba(255,255,255,0.15)', borderDash:[5,4], pointRadius:0, fill:false }
      ]
    },
    options: { ...CD, plugins:{ ...CD.plugins, legend:{ display:false } } }
  });
}

function renderHealthSleepChart(sleepWeek) {
  if (_healthSleepChart) { _healthSleepChart.destroy(); _healthSleepChart = null; }
  const ctx = document.getElementById('healthSleepChart')?.getContext('2d');
  if (!ctx) return;
  if (!sleepWeek.length) {
    ctx.canvas.parentElement.innerHTML += `<div style="text-align:center;color:var(--text3);font-size:12px;padding:2rem 0">No sleep history available yet</div>`;
    return;
  }
  _healthSleepChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sleepWeek.map(d=>d.label),
      datasets: [
        { label:'Hours slept', data:sleepWeek.map(d=>d.hours), backgroundColor:'rgba(61,220,151,0.35)', borderColor:'#3DDC97', borderWidth:1, borderRadius:4 },
        { label:'8h target', data:sleepWeek.map(()=>8), type:'line', borderColor:'rgba(255,255,255,0.15)', borderDash:[5,4], pointRadius:0, fill:false }
      ]
    },
    options: { ...CD, plugins:{ ...CD.plugins, legend:{ display:false } }, scales:{ ...CD.scales, y:{ ...CD.scales.y, min:0, max:10, ticks:{ ...CD.scales.y.ticks, callback:v=>v+'h' } } } }
  });
}
