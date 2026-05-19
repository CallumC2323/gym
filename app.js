// ── INIT ────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  loadDB();
  if (!DB.meta.startDate) { DB.meta.startDate = today(); saveDB(); }
  initNav();
  initModals();
  await initDrive();
  checkMondayWeightPrompt();
  showSessionIntro();
  renderDashboard();
  renderTodayPage();
  initExport();
  fetchWeather();
  loadCalendarEvents();
  checkAwards();
  animateCounters();
});

// ── COUNTER ANIMATION ────────────────────────────────────────────────────────────

function animateCounters() {
  document.querySelectorAll('.count-up[data-target]').forEach(el => {
    const target = parseFloat(el.dataset.target);
    const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
    const duration = 1200;
    const start = performance.now();
    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const val = target * eased;
      el.textContent = decimals > 0 ? val.toFixed(decimals) : Math.round(val).toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
}

function makeCounter(value, decimals = 0) {
  return `<span class="count-up" data-target="${value}" data-decimals="${decimals}">${decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString()}</span>`;
}

// ── NAV ─────────────────────────────────────────────────────────────────────────

let currentPage = 'dashboard';

function initNav() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const page = link.dataset.page;
      if (page === currentPage) return;
      navigateTo(page);
    });
  });
}

function navigateTo(page) {
  const oldPage = document.getElementById('page-' + currentPage);
  const newPage = document.getElementById('page-' + page);
  if (!newPage) return;

  // Exit current page
  if (oldPage) {
    oldPage.classList.add('page-exit');
    setTimeout(() => {
      oldPage.classList.remove('active', 'page-exit');
    }, 200);
  }

  // Enter new page
  setTimeout(() => {
    newPage.classList.add('active', 'page-enter');
    setTimeout(() => newPage.classList.remove('page-enter'), 300);
    currentPage = page;
    onPageOpen(page);
  }, 120);

  // Update nav
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');

  // Stagger cards entrance
  setTimeout(() => staggerCards(page), 150);
}

function staggerCards(page) {
  const pageEl = document.getElementById('page-' + page);
  if (!pageEl) return;
  const cards = pageEl.querySelectorAll('.card, .chart-wrap, .lifetime-card, .award-card');
  cards.forEach((card, i) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(10px)';
    setTimeout(() => {
      card.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
      card.style.opacity = '';
      card.style.transform = '';
    }, i * 45);
  });
}

function onPageOpen(page) {
  if (page === 'progress')  { buildProgressTabs(); }
  if (page === 'body')      { renderBodyMap(getMuscleScores()); }
  if (page === 'weight')    { renderWeightChart(); renderWeightHistory(); document.getElementById('weightDate').value = today(); }
  if (page === 'nutrition') { renderNutritionChart(); renderTodayNutrition(); }
  if (page === 'journal')   { renderJournal(); }
  if (page === 'dashboard') { renderDashboard(); }
  if (page === 'lifetime')  { renderLifetimeStats(); }
  if (page === 'awards')    { renderAwards(); }
  if (page === 'timeline')  { renderTimeline(); }
  if (page === 'universe')  { renderTrainingUniverse(); }
  if (page === 'replay')    { renderReplayPage(); }
}

// ── MONDAY WEIGHT PROMPT ─────────────────────────────────────────────────────────

function checkMondayWeightPrompt() {
  if (new Date().getDay() !== 1) return;
  if (DB.meta.weightModalShown?.[today()]) return;
  setTimeout(() => { document.getElementById('weightModal').style.display = 'flex'; }, 800);
}

// ── SESSION INTRO ────────────────────────────────────────────────────────────────

function showSessionIntro() {
  const dow = new Date().getDay();
  const session = PLAN[dow];
  if (!session || session.type === 'rest') return;
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const intro = document.getElementById('sessionIntro');
  document.getElementById('introDay').textContent = dayNames[dow];
  document.getElementById('introName').textContent = session.label;
  document.getElementById('introFocus').textContent = session.focus ? `${session.focus} Focus` : session.type === 'run' ? 'Easy conversational pace' : '';
  intro.style.display = 'flex';
  const dismiss = () => {
    intro.style.opacity = '0';
    intro.style.transition = 'opacity 0.4s ease';
    setTimeout(() => { intro.style.display = 'none'; }, 400);
  };
  intro.addEventListener('click', dismiss);
  setTimeout(dismiss, 4500);
}

// ── MODALS ───────────────────────────────────────────────────────────────────────

function initModals() {
  document.getElementById('modalWeightSave').addEventListener('click', () => {
    const kg = parseFloat(document.getElementById('modalWeightKg').value);
    if (!kg) { showToast('Enter your weight'); return; }
    const notes = document.getElementById('modalWeightNotes').value;
    const entry = { date: today(), kg, notes };
    const idx = DB.weight.findIndex(w => w.date === today());
    if (idx >= 0) DB.weight[idx] = entry; else DB.weight.push(entry);
    DB.meta.weightModalShown[today()] = true;
    saveDB(); checkAwards();
    document.getElementById('weightModal').style.display = 'none';
    showToast('Weight logged'); renderDashboard();
  });
  document.getElementById('modalWeightSkip').addEventListener('click', () => {
    DB.meta.weightModalShown[today()] = true;
    saveDB();
    document.getElementById('weightModal').style.display = 'none';
  });
  document.getElementById('logRecoveryBtn').addEventListener('click', () => {
    const rec = getTodayRecovery();
    if (rec) { document.getElementById('recSleep').value = rec.sleep || ''; document.getElementById('recFitbit').value = rec.fitbit || ''; }
    document.getElementById('recoveryModal').style.display = 'flex';
  });
  document.getElementById('saveRecoveryBtn').addEventListener('click', () => {
    const sleep = parseFloat(document.getElementById('recSleep').value);
    const fitbit = parseInt(document.getElementById('recFitbit').value);
    const entry = { date: today(), sleep: sleep||null, fitbit: fitbit||null };
    const idx = DB.recovery.findIndex(r => r.date === today());
    if (idx >= 0) DB.recovery[idx] = entry; else DB.recovery.push(entry);
    saveDB();
    document.getElementById('recoveryModal').style.display = 'none';
    showToast('Recovery logged'); renderDashboard(); renderTodayPage();
  });
  document.getElementById('closeRecoveryBtn').addEventListener('click', () => {
    document.getElementById('recoveryModal').style.display = 'none';
  });
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────────

function renderDashboard() {
  const d = new Date();
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dow = d.getDay();
  const session = PLAN[dow];
  const hour = d.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  document.getElementById('dashGreeting').textContent = `${greeting}, Callum`;
  document.getElementById('dashDate').textContent = `${dayNames[dow]} · ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;

  const pill = document.getElementById('dashSessionPill');
  pill.textContent = session.label;
  pill.onclick = () => navigateTo('today');

  // Recovery
  const rec = getTodayRecovery();
  document.getElementById('dashSleep').textContent = rec?.sleep ? rec.sleep + 'h' : '—';
  document.getElementById('dashFitbit').textContent = rec?.fitbit ?? '—';
  const recScore = calcRecoveryScore(rec);
  const recEl = document.getElementById('dashRecoveryRating');
  if (!rec) { recEl.textContent = '—'; recEl.style.color = 'var(--text3)'; }
  else if (recScore >= 70) { recEl.textContent = 'Good'; recEl.style.color = 'var(--emerald)'; }
  else if (recScore >= 45) { recEl.textContent = 'OK'; recEl.style.color = 'var(--amber)'; }
  else { recEl.textContent = 'Low'; recEl.style.color = 'var(--red)'; }

  // Weekly stats
  const stats = getWeeklyStats();
  document.getElementById('weekSessions').textContent = `${stats.sessionsHit}/${stats.totalTrainDays}`;
  document.getElementById('weekProtein').textContent = stats.avgProtein ? stats.avgProtein + 'g' : '—';
  document.getElementById('weekStreak').textContent = stats.streak;

  // Weight
  const latestWeight = [...DB.weight].sort((a,b) => b.date.localeCompare(a.date))[0];
  if (latestWeight) {
    document.getElementById('dashCurrentWeight').textContent = latestWeight.kg;
    const pct = Math.min(Math.max((latestWeight.kg - 80) / 10 * 100, 0), 100);
    document.getElementById('dashWeightBar').style.width = pct + '%';
    const prev = [...DB.weight].sort((a,b) => b.date.localeCompare(a.date))[1];
    if (prev) {
      const diff = (latestWeight.kg - prev.kg).toFixed(1);
      const el = document.getElementById('dashWeightDiff');
      el.textContent = (diff > 0 ? '+' : '') + diff + 'kg';
      el.style.color = diff > 0 ? 'var(--emerald)' : 'var(--red)';
    }
  }

  // Nutrition
  const nut = DB.nutrition.find(n => n.date === today());
  document.getElementById('dashKcal').textContent = nut?.kcal || '—';
  document.getElementById('dashProtein').textContent = nut?.protein ? nut.protein + 'g' : '—';
  const kcalPct = nut ? Math.min(Math.round(nut.kcal/3100*100), 100) : 0;
  const protPct = nut ? Math.min(Math.round(nut.protein/165*100), 100) : 0;
  document.getElementById('dashKcalBar').style.width = kcalPct + '%';
  document.getElementById('dashProteinBar').style.width = protPct + '%';
  document.getElementById('dashKcalPct').textContent = kcalPct + '%';
  document.getElementById('dashProteinPct').textContent = protPct + '%';

  // Momentum
  const momentum = getMomentum();
  document.getElementById('dashMomentumScore').textContent = momentum.score;
  const trend = momentum.score >= 70 ? '↑' : momentum.score >= 40 ? '→' : '↓';
  const trendColor = momentum.score >= 70 ? 'var(--emerald)' : momentum.score >= 40 ? 'var(--amber)' : 'var(--red)';
  document.getElementById('dashMomentumTrend').textContent = trend;
  document.getElementById('dashMomentumTrend').style.color = trendColor;
  renderMomentumDial(momentum.score);

  // Deload
  if (shouldDeload()) document.getElementById('deloadCard').style.display = 'block';

  // AI coach
  renderAICoachDash(momentum);
}

// ── AI COACH ─────────────────────────────────────────────────────────────────────

function renderAICoachDash(momentum) {
  const el = document.getElementById('dashAICoach');
  if (!el) return;
  const good = momentum.reasons.good;
  const attention = momentum.reasons.attention;
  const dow = new Date().getDay();
  const session = PLAN[dow];

  let rec = '';
  if (attention.includes('Protein missed') || attention.some(a => a.includes('Protein'))) {
    rec = 'Add a protein shake post-session today — easy 40g hit.';
  } else if (attention.some(a => a.includes('Calories'))) {
    rec = 'Calorie intake low — add a meal or increase portion sizes.';
  } else if (session.type === 'upper' && session.focus === 'Strength') {
    rec = 'Strength day — prioritise compound movements and log every set.';
  } else if (session.type === 'run') {
    rec = 'Run day — keep it conversational pace. No heroics.';
  } else {
    rec = 'Stay consistent. Every logged session compounds over time.';
  }

  el.innerHTML = `
    <div class="ai-section">
      <div class="ai-section-label good">Going Well</div>
      <div class="ai-content">${good.length ? good.join(' · ') : 'Keep logging to see insights'}</div>
    </div>
    ${attention.length ? `<div class="ai-section">
      <div class="ai-section-label attention">Attention</div>
      <div class="ai-content">${attention.join(' · ')}</div>
    </div>` : ''}
    <div class="ai-section" style="margin-bottom:0">
      <div class="ai-section-label rec">This Week</div>
      <div class="ai-content">${rec}</div>
    </div>
  `;
}

// ── WEATHER ──────────────────────────────────────────────────────────────────────

async function fetchWeather() {
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=53.8008&longitude=-1.5491&current=temperature_2m,weathercode,windspeed_10m,precipitation&timezone=Europe%2FLondon');
    const data = await res.json();
    const c = data.current;
    const temp = Math.round(c.temperature_2m);
    const precip = c.precipitation;
    const wind = Math.round(c.windspeed_10m);
    const desc = weatherDesc(c.weathercode);
    const runTip = precip > 2 ? { cls:'tip-bad', text:'Wet outside — check before your run' }
      : wind > 30 ? { cls:'tip-ok', text:'Windy — adjust your pace' }
      : temp < 5  ? { cls:'tip-ok', text:'Cold — layer up for your run' }
      : { cls:'tip-good', text:'Good conditions for running' };
    document.getElementById('weatherContent').innerHTML = `
      <div class="weather-main">${temp}°C</div>
      <div class="weather-desc">${desc} · ${wind}km/h wind</div>
      <div class="weather-run-tip ${runTip.cls}">${runTip.text}</div>`;
  } catch(e) {
    document.getElementById('weatherContent').innerHTML = '<div style="font-size:12px;color:var(--text3)">Weather unavailable</div>';
  }
}

function weatherDesc(code) {
  if (code === 0) return 'Clear sky';
  if (code <= 3)  return 'Partly cloudy';
  if (code <= 49) return 'Foggy';
  if (code <= 59) return 'Drizzle';
  if (code <= 69) return 'Rain';
  if (code <= 79) return 'Snow';
  if (code <= 82) return 'Rain showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Cloudy';
}

// ── GOOGLE CALENDAR ───────────────────────────────────────────────────────────────

let gCalToken = null;

function loadCalendarEvents() {
  // Token comes from the same OAuth flow as Drive (same gToken)
  if (gToken) { gCalToken = gToken; fetchCalendarEvents(); return; }
  const stored = localStorage.getItem('forge_gcal_token');
  if (stored) { gCalToken = stored; fetchCalendarEvents(); }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const btn = document.getElementById('connectCalendarBtn');
    if (btn) btn.addEventListener('click', connectDrive);
  }, 300);
});

async function fetchCalendarEvents() {
  const token = gToken || gCalToken;
  if (!token) return;
  try {
    const now = new Date();
    const end = new Date(now); end.setHours(23,59,59);
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(now.toISOString())}&timeMax=${encodeURIComponent(end.toISOString())}&singleEvents=true&orderBy=startTime&maxResults=8`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) return;
    const data = await res.json();
    renderCalendarEvents(data.items || []);
    document.getElementById('connectCalendarBtn').style.display = 'none';
    generateCalendarContext(data.items || []);
  } catch(e) {}
}

function renderCalendarEvents(events) {
  const el = document.getElementById('calendarEvents');
  if (!events.length) { el.innerHTML = '<div style="font-size:12px;color:var(--text3)">No events today</div>'; return; }
  el.innerHTML = events.map(ev => {
    const start = ev.start?.dateTime ? new Date(ev.start.dateTime).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }) : 'All day';
    return `<div class="cal-event">
      <div class="cal-event-dot"></div>
      <div class="cal-event-time">${start}</div>
      <div class="cal-event-title">${ev.summary || 'Untitled'}</div>
    </div>`;
  }).join('');
}

function generateCalendarContext(events) {
  // Feed calendar load into AI coach context
  const count = events.length;
  const hasGym = events.some(e => (e.summary||'').toLowerCase().includes('gym') || (e.summary||'').toLowerCase().includes('training'));
  const el = document.getElementById('calendarContext');
  if (!el) return;
  if (count === 0) { el.textContent = 'Light day — no conflicts.'; el.style.color = 'var(--emerald)'; }
  else if (count >= 4) { el.textContent = `Busy day (${count} events) — train early if possible.`; el.style.color = 'var(--amber)'; }
  else if (hasGym) { el.textContent = 'Gym already in calendar — you\'ve planned well.'; el.style.color = 'var(--emerald)'; }
  else { el.textContent = `${count} event${count>1?'s':''} today — plenty of time to train.`; el.style.color = 'var(--text2)'; }
}

// ── TODAY PAGE ────────────────────────────────────────────────────────────────────

function renderTodayPage() {
  const dateStr = today();
  const dow = getDayOfWeek(dateStr);
  const session = PLAN[dow];
  const d = new Date();
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  document.getElementById('todayTitle').textContent = session.label;
  document.getElementById('todayDate').textContent = `${dayNames[dow]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  document.getElementById('dayBadge').textContent = session.focus || session.type.toUpperCase();
  renderWorkoutSection(session, dateStr);
  renderRunSection(session, dateStr);
  renderCalorieSection(dateStr);
}

// ── WORKOUT ───────────────────────────────────────────────────────────────────────

function renderWorkoutSection(session, dateStr) {
  const el = document.getElementById('workoutSection');
  if (session.type === 'rest') {
    el.innerHTML = `<div class="rest-card"><div style="font-size:48px">💤</div><div class="rest-title">Rest Day</div><p style="color:var(--text2);margin-top:0.75rem;font-size:14px">Sleep well. Hit your protein. Come back stronger.</p></div>`;
    return;
  }
  if (session.type === 'run') { el.innerHTML = ''; return; }

  const maxSets = Math.max(...session.exercises.map(e => e.sets));
  let setHeaders = '';
  for (let i=0; i<maxSets; i++) setHeaders += `<th style="font-size:10px;color:var(--text3);font-weight:600;padding:0 4px;min-width:64px;letter-spacing:0.06em;text-transform:uppercase">Set ${i+1}</th>`;

  let rows = '';
  session.exercises.forEach(ex => {
    const entry = getWorkoutEntry(dateStr, ex.id);
    const best = getBestSet(ex.id);
    const rec = getOverloadRec(ex.id, ex.reps);
    const recClass = { push:'ob-push', hold:'ob-hold', deload:'ob-deload', new:'ob-new' }[rec.type];
    let setInputs = '';
    for (let i=0; i<ex.sets; i++) {
      const s = entry?.sets?.[i];
      setInputs += `<td style="padding:6px 3px;vertical-align:top">
        <div style="display:flex;flex-direction:column;gap:2px;align-items:center">
          <span style="font-size:9px;color:var(--text3);letter-spacing:0.06em;text-transform:uppercase">kg</span>
          <input type="number" class="set-input" placeholder="—" data-ex="${ex.id}" data-set="${i}" data-field="weight" value="${s?.weight||''}" min="0" step="0.5">
          <span style="font-size:9px;color:var(--text3);letter-spacing:0.06em;text-transform:uppercase">reps</span>
          <input type="number" class="set-input" placeholder="—" data-ex="${ex.id}" data-set="${i}" data-field="reps" value="${s?.reps||''}" min="0" step="1">
        </div></td>`;
    }
    for (let i=ex.sets; i<maxSets; i++) setInputs += `<td></td>`;
    rows += `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:12px 0;vertical-align:middle;padding-right:10px">
        <div style="font-size:13px;font-weight:500;color:var(--text)">${ex.name}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:1px;font-family:'JetBrains Mono',monospace">${ex.sets} × ${ex.reps}</div>
        <div style="margin-top:5px"><span class="overload-badge ${recClass}">${rec.text}</span></div>
      </td>
      ${setInputs}
      <td style="font-size:11px;color:var(--text3);padding:0 8px;white-space:nowrap;vertical-align:middle;font-family:'JetBrains Mono',monospace">${best ? `${best.weight}kg×${best.reps}` : '—'}</td>
    </tr>`;
  });

  el.innerHTML = `<div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.25rem">
      <h2 class="section-title" style="margin:0">${session.label} — ${session.focus}</h2>
    </div>
    <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:1px solid var(--border)">
        <th style="text-align:left;font-size:10px;color:var(--text3);font-weight:600;padding-bottom:8px;min-width:170px;text-transform:uppercase;letter-spacing:0.08em">Exercise</th>
        ${setHeaders}
        <th style="font-size:10px;color:var(--text3);font-weight:600;padding:0 8px;text-transform:uppercase;letter-spacing:0.08em">Best</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <div style="margin-top:1.25rem;display:flex;gap:0.75rem;align-items:center">
      <button class="btn-primary" id="saveWorkoutBtn">Save Session</button>
      <span style="font-size:12px;color:var(--text3);font-family:'JetBrains Mono',monospace" id="saveStatus"></span>
    </div>
  </div>`;

  document.getElementById('saveWorkoutBtn').addEventListener('click', () => saveWorkoutFromForm(dateStr, session));
}

function saveWorkoutFromForm(dateStr, session) {
  let newPB = false;
  session.exercises.forEach(ex => {
    const wInputs = document.querySelectorAll(`[data-ex="${ex.id}"][data-field="weight"]`);
    const rInputs = document.querySelectorAll(`[data-ex="${ex.id}"][data-field="reps"]`);
    const prevBest = getBestSet(ex.id);
    wInputs.forEach((inp, i) => {
      const w = parseFloat(inp.value);
      const r = parseInt(rInputs[i]?.value);
      if (w || r) {
        saveWorkoutSet(dateStr, ex.id, i, w, r);
        if (prevBest && w * r > prevBest.vol) newPB = true;
      }
    });
  });
  const st = document.getElementById('saveStatus');
  if (st) st.textContent = 'Saved ✓';
  showToast('Session saved');
  if (newPB) showPBFlash();
  checkAwards();
  setTimeout(() => { const s = document.getElementById('saveStatus'); if(s) s.textContent=''; }, 3000);
}

// ── RUN SECTION ───────────────────────────────────────────────────────────────────

function renderRunSection(session, dateStr) {
  const el = document.getElementById('runSection');
  const isRunDay = session.type === 'run';
  const existing = DB.runs.find(r => r.date === dateStr);
  el.innerHTML = `<div class="card" ${!isRunDay ? 'style="opacity:0.85"' : ''}>
    <h2 class="section-title">Run Log${!isRunDay ? ' <span style="font-size:11px;color:var(--text3);font-weight:400">— optional</span>' : ''}</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:1rem;margin-bottom:1rem">
      <div class="form-group"><label class="label">Distance (km)</label><input type="number" id="runDist" class="input" step="0.1" placeholder="5.0" value="${existing?.distanceKm||''}"></div>
      <div class="form-group"><label class="label">Duration (min)</label><input type="number" id="runDur" class="input" step="1" placeholder="25" value="${existing?.durationMin||''}"></div>
      <div class="form-group"><label class="label">Pace (min/km)</label><input type="text" id="runPace" class="input" placeholder="auto" readonly style="background:var(--bg4);color:var(--text3)" value="${existing ? calcPace(existing.distanceKm, existing.durationMin) : ''}"></div>
      <div class="form-group"><label class="label">Notes</label><input type="text" id="runNotes" class="input" placeholder="Easy run..." value="${existing?.notes||''}"></div>
    </div>
    <button class="btn-primary" id="saveRunBtn">Log Run</button>
  </div>`;
  ['runDist','runDur'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      const dist = parseFloat(document.getElementById('runDist').value);
      const dur = parseFloat(document.getElementById('runDur').value);
      if (dist > 0 && dur > 0) document.getElementById('runPace').value = calcPace(dist, dur);
    });
  });
  document.getElementById('saveRunBtn').addEventListener('click', () => {
    const dist = parseFloat(document.getElementById('runDist').value);
    const dur = parseFloat(document.getElementById('runDur').value);
    const notes = document.getElementById('runNotes').value;
    if (!dist && !dur) { showToast('Enter distance or duration'); return; }
    const entry = { date: dateStr, distanceKm: dist||0, durationMin: dur||0, notes };
    const idx = DB.runs.findIndex(r => r.date === dateStr);
    if (idx >= 0) DB.runs[idx] = entry; else DB.runs.push(entry);
    saveDB(); checkAwards(); showToast('Run logged');
  });
}

function calcPace(dist, dur) {
  if (!dist || !dur) return '';
  const p = dur/dist; const m = Math.floor(p); const s = Math.round((p-m)*60);
  return `${m}:${s.toString().padStart(2,'0')}`;
}

// ── CALORIE SECTION ───────────────────────────────────────────────────────────────

function renderCalorieSection(dateStr) {
  const el = document.getElementById('calorieSection');
  const existing = DB.nutrition.find(n => n.date === dateStr);
  const kcal = existing?.kcal || 0;
  const protein = existing?.protein || 0;
  const kcalPct = Math.min(Math.round(kcal/3100*100), 100);
  const protPct = Math.min(Math.round(protein/165*100), 100);
  el.innerHTML = `<div class="card">
    <h2 class="section-title">Today's Nutrition</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem">
      <div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px">
          <span style="color:var(--text2)">Calories</span>
          <span style="color:var(--cyan);font-family:'JetBrains Mono',monospace;font-weight:500">${kcal||'—'} / 3,100</span>
        </div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${kcalPct}%"></div></div>
        <div style="font-size:11px;color:var(--text3);margin-top:3px;font-family:'JetBrains Mono',monospace">${kcalPct}%</div>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:5px">
          <span style="color:var(--text2)">Protein</span>
          <span style="color:var(--emerald);font-family:'JetBrains Mono',monospace;font-weight:500">${protein||'—'}g / 165g</span>
        </div>
        <div class="progress-bar-bg"><div class="progress-bar-fill emerald" style="width:${protPct}%"></div></div>
        <div style="font-size:11px;color:var(--text3);margin-top:3px;font-family:'JetBrains Mono',monospace">${protPct}%</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:1rem;margin-bottom:1rem">
      <div class="form-group"><label class="label">Calories</label><input type="number" id="dayKcal" class="input" placeholder="3100" value="${existing?.kcal||''}"></div>
      <div class="form-group"><label class="label">Protein (g)</label><input type="number" id="dayProtein" class="input" placeholder="165" value="${existing?.protein||''}"></div>
      <div class="form-group"><label class="label">Notes</label><input type="text" id="dayNutNotes" class="input" placeholder="What you ate..." value="${existing?.notes||''}"></div>
    </div>
    <button class="btn-primary" id="saveDayNutBtn">Log Nutrition</button>
  </div>`;
  document.getElementById('saveDayNutBtn').addEventListener('click', () => {
    const kcal = parseInt(document.getElementById('dayKcal').value);
    const protein = parseInt(document.getElementById('dayProtein').value);
    const notes = document.getElementById('dayNutNotes').value;
    const entry = { date: dateStr, kcal: kcal||0, protein: protein||0, notes };
    const idx = DB.nutrition.findIndex(n => n.date === dateStr);
    if (idx >= 0) DB.nutrition[idx] = entry; else DB.nutrition.push(entry);
    saveDB(); checkAwards(); showToast('Nutrition logged');
    renderCalorieSection(dateStr); renderDashboard();
  });
}

// ── WEIGHT PAGE ───────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.getElementById('logWeightBtn')?.addEventListener('click', () => {
      const kg = parseFloat(document.getElementById('weightKg').value);
      const date = document.getElementById('weightDate').value;
      const notes = document.getElementById('weightNotes').value;
      if (!kg || !date) { showToast('Enter weight and date'); return; }
      const entry = { date, kg, notes };
      const idx = DB.weight.findIndex(w => w.date===date);
      if (idx >= 0) DB.weight[idx] = entry; else DB.weight.push(entry);
      saveDB(); checkAwards(); renderWeightChart(); renderWeightHistory(); renderDashboard();
      showToast('Weight logged');
      document.getElementById('weightKg').value = '';
      document.getElementById('weightNotes').value = '';
    });
    document.getElementById('logNutritionBtn')?.addEventListener('click', () => {
      const kcal = parseInt(document.getElementById('nutKcal').value);
      const protein = parseInt(document.getElementById('nutProtein').value);
      const notes = document.getElementById('nutNotes').value;
      const entry = { date: today(), kcal: kcal||0, protein: protein||0, notes };
      const idx = DB.nutrition.findIndex(n => n.date===today());
      if (idx >= 0) DB.nutrition[idx] = entry; else DB.nutrition.push(entry);
      saveDB(); checkAwards(); renderNutritionChart(); renderTodayNutrition(); renderDashboard();
      showToast('Nutrition logged');
    });
  }, 200);
});

function renderTodayNutrition() {
  const e = DB.nutrition.find(n => n.date===today());
  document.getElementById('todayKcal').textContent = e?.kcal||'—';
  document.getElementById('todayProtein').textContent = e?.protein ? e.protein+'g' : '—';
}

function renderWeightHistory() {
  const el = document.getElementById('weightHistory');
  const sorted = [...DB.weight].sort((a,b) => b.date.localeCompare(a.date)).slice(0,20);
  if (!sorted.length) { el.innerHTML = '<p style="color:var(--text3);font-size:13px">No weigh-ins yet. Log every Monday morning fasted.</p>'; return; }
  el.innerHTML = sorted.map((w,i) => {
    const prev = sorted[i+1];
    const diff = prev ? (w.kg-prev.kg).toFixed(1) : null;
    const dc = diff > 0 ? 'var(--emerald)' : diff < 0 ? 'var(--red)' : 'var(--text3)';
    return `<div class="history-item">
      <span class="history-date">${formatDate(w.date)}</span>
      <span class="history-val">${w.kg}kg</span>
      ${diff !== null ? `<span style="font-size:12px;color:${dc};font-family:'JetBrains Mono',monospace">${diff>0?'+':''}${diff}kg</span>` : '<span></span>'}
      <span class="history-note">${w.notes||''}</span>
    </div>`;
  }).join('');
}

// ── JOURNAL ───────────────────────────────────────────────────────────────────────

function renderJournal() {
  document.getElementById('journalTodayLabel').textContent = formatDate(today());
  const existing = DB.journal.find(j => j.date===today());
  document.getElementById('journalEntry').value = existing?.text||'';
  document.getElementById('saveJournalBtn').onclick = () => {
    const text = document.getElementById('journalEntry').value.trim();
    if (!text) { showToast('Nothing to save'); return; }
    const entry = { date: today(), text };
    const idx = DB.journal.findIndex(j => j.date===today());
    if (idx >= 0) DB.journal[idx] = entry; else DB.journal.push(entry);
    saveDB(); checkAwards(); showToast('Entry saved'); renderJournalHistory();
  };
  renderJournalHistory();
}

function renderJournalHistory() {
  const el = document.getElementById('journalHistory');
  const entries = [...DB.journal].sort((a,b) => b.date.localeCompare(a.date)).filter(j => j.date !== today()).slice(0,30);
  if (!entries.length) { el.innerHTML = ''; return; }
  el.innerHTML = entries.map(j => `
    <div class="journal-entry-card">
      <div class="journal-entry-date">${formatDate(j.date)}</div>
      <div class="journal-entry-text">${j.text}</div>
    </div>`).join('');
}

// ── LIFETIME STATS ────────────────────────────────────────────────────────────────

function renderLifetimeStats() {
  const totalWorkouts = getCompletedWorkoutCount();
  const totalKg = Math.round(getTotalKgLifted());
  const totalSets = getTotalSets();
  const totalReps = getTotalReps();
  const totalRunKm = Math.round(getTotalRunKm() * 10) / 10;
  const totalRuns = DB.runs.length;
  const totalRunMins = DB.runs.reduce((t,r) => t + (r.durationMin||0), 0);
  const totalCal = Math.round(getTotalCaloriesLogged());
  const totalProtein = Math.round(getTotalProteinLogged());
  const totalJournal = DB.journal.length;
  const activeDays = getActiveDays();
  const stats = getWeeklyStats();

  const el = document.getElementById('lifetimeGrid');
  if (!el) return;

  const cards = [
    { label: 'Total Workouts',    val: totalWorkouts,         unit: '',      color: 'var(--cyan)',    icon: '🏋️' },
    { label: 'Kilograms Lifted',  val: totalKg.toLocaleString(), unit: 'kg', color: 'var(--cyan)',    icon: '⚖️' },
    { label: 'Total Sets',        val: totalSets.toLocaleString(), unit: '',  color: 'var(--lime)',    icon: '📊' },
    { label: 'Total Reps',        val: totalReps.toLocaleString(), unit: '',  color: 'var(--lime)',    icon: '🔢' },
    { label: 'Total Runs',        val: totalRuns,             unit: '',      color: 'var(--emerald)', icon: '🏃' },
    { label: 'Kilometres Run',    val: totalRunKm,            unit: 'km',    color: 'var(--emerald)', icon: '🛣️' },
    { label: 'Run Hours',         val: Math.round(totalRunMins/60 * 10)/10, unit: 'h', color: 'var(--emerald)', icon: '⏱️' },
    { label: 'Calories Logged',   val: totalCal.toLocaleString(), unit: 'kcal', color: 'var(--amber)', icon: '🍽️' },
    { label: 'Protein Logged',    val: totalProtein.toLocaleString(), unit: 'g', color: 'var(--amber)', icon: '🥩' },
    { label: 'Journal Entries',   val: totalJournal,          unit: '',      color: 'var(--gold)',    icon: '📓' },
    { label: 'Active Days',       val: activeDays,            unit: '',      color: 'var(--gold)',    icon: '📅' },
    { label: 'Current Streak',    val: stats.streak,          unit: ' days', color: 'var(--gold)',    icon: '🔥' },
  ];

  el.innerHTML = cards.map((c, i) => `
    <div class="lifetime-card" style="animation-delay:${i*40}ms">
      <div style="font-size:22px;margin-bottom:6px">${c.icon}</div>
      <div class="lifetime-val" style="color:${c.color}">${c.val}${c.unit ? '<span style="font-size:14px;color:var(--text3)">' + c.unit + '</span>' : ''}</div>
      <div class="lifetime-lbl">${c.label}</div>
    </div>`).join('');

  // Trigger counter animations
  setTimeout(() => animateCounters(), 100);
}

// ── AWARDS ────────────────────────────────────────────────────────────────────────

function renderAwards() {
  const el = document.getElementById('awardsGrid');
  if (!el) return;
  const categories = [...new Set(AWARDS_DEF.map(a => a.category))];
  el.innerHTML = categories.map(cat => {
    const awards = AWARDS_DEF.filter(a => a.category === cat);
    const cards = awards.map(award => {
      const unlocked = DB.meta.awardsUnlocked[award.id];
      return `<div class="award-card ${unlocked ? 'unlocked' : 'locked'}">
        <div class="award-cat">${award.category}</div>
        <div class="award-icon">${award.icon}</div>
        <div class="award-name">${award.name}</div>
        <div class="award-desc">${award.desc}</div>
        ${unlocked ? `<div class="award-date">Unlocked ${formatDate(unlocked)}</div>` : ''}
      </div>`;
    }).join('');
    return `<div style="margin-bottom:1.5rem">
      <div style="font-family:'Inter Tight',sans-serif;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:var(--text3);margin-bottom:0.75rem">${cat}</div>
      <div class="awards-grid">${cards}</div>
    </div>`;
  }).join('');
}

// ── REPLAY MY DAY ─────────────────────────────────────────────────────────────────

function renderReplayPage() {
  const replayDateEl = document.getElementById('replayDate');
  const replayContent = document.getElementById('replayContent');
  if (!replayDateEl || !replayContent) return;
  const dateStr = replayDateEl.value || today();
  const data = getReplayData(dateStr);
  renderReplayContent(data, replayContent);
}

function renderReplayContent(data, el) {
  const items = [];

  if (data.recovery) {
    items.push({ time: 'Morning', content: `Sleep: <span class="replay-highlight">${data.recovery.sleep}h</span>${data.recovery.fitbit ? ` · Fitbit: <span class="replay-highlight">${data.recovery.fitbit}</span>` : ''}` });
  }
  if (data.weight) {
    items.push({ time: 'Weight', content: `Weighed in at <span class="replay-highlight">${data.weight.kg}kg</span>${data.weight.notes ? ` — ${data.weight.notes}` : ''}` });
  }
  if (data.workoutEntries.length) {
    const setCount = data.workoutEntries.reduce((t,w) => t + w.sets.filter(s => s && s.reps>0).length, 0);
    items.push({ time: 'Training', content: `<span class="replay-highlight">${data.session?.label || 'Workout'}</span> · ${setCount} sets completed${data.bestLift ? ` · Best: <span class="replay-highlight">${data.bestLift.name} ${data.bestLift.weight}kg × ${data.bestLift.reps}</span>` : ''}` });
  } else if (data.session?.type !== 'rest') {
    items.push({ time: 'Training', content: `<span style="color:var(--text3)">No workout logged</span>` });
  }
  if (data.run) {
    items.push({ time: 'Run', content: `<span class="replay-highlight">${data.run.distanceKm}km</span> in ${data.run.durationMin} min${data.run.distanceKm > 0 ? ` · ${calcPace(data.run.distanceKm, data.run.durationMin)} min/km` : ''}${data.run.notes ? ` — ${data.run.notes}` : ''}` });
  }
  if (data.nutrition) {
    const calPct = Math.round(data.nutrition.kcal/3100*100);
    const protPct = Math.round(data.nutrition.protein/165*100);
    items.push({ time: 'Nutrition', content: `<span class="replay-highlight">${data.nutrition.kcal} kcal</span> (${calPct}%) · <span class="replay-highlight">${data.nutrition.protein}g protein</span> (${protPct}%)` });
  }
  if (data.journal) {
    items.push({ time: 'Journal', content: `"${data.journal.text.slice(0,120)}${data.journal.text.length > 120 ? '…' : ''}"` });
  }

  if (!items.length) {
    el.innerHTML = `<div style="text-align:center;color:var(--text3);padding:3rem 0;font-size:14px">No data logged for this day</div>`;
    return;
  }

  el.innerHTML = `<div class="replay-timeline">${
    items.map((item, i) => `
      <div class="replay-item" style="animation-delay:${i*80}ms">
        <div class="replay-time">${item.time}</div>
        <div class="replay-content">${item.content}</div>
      </div>`).join('')
  }</div>`;
}

// ── LIFE TIMELINE ─────────────────────────────────────────────────────────────────

function renderTimeline() {
  const el = document.getElementById('timelineList');
  if (!el) return;

  // Get all dates with any data
  const allDates = new Set();
  DB.workouts.forEach(w => allDates.add(w.date));
  DB.runs.forEach(r => allDates.add(r.date));
  DB.weight.forEach(w => allDates.add(w.date));
  DB.nutrition.forEach(n => allDates.add(n.date));
  DB.journal.forEach(j => allDates.add(j.date));

  const sorted = [...allDates].sort((a,b) => b.localeCompare(a)).slice(0, 60);

  if (!sorted.length) {
    el.innerHTML = `<div style="text-align:center;color:var(--text3);padding:3rem 0;font-size:14px">No data yet — start logging to see your timeline</div>`;
    return;
  }

  el.innerHTML = sorted.map((dateStr, i) => {
    const data = getReplayData(dateStr);
    const tags = [];
    if (data.workoutEntries.length) tags.push(`<span class="timeline-tag tag-workout">${data.session?.label || 'Workout'}</span>`);
    if (data.run) tags.push(`<span class="timeline-tag tag-run">Run ${data.run.distanceKm}km</span>`);
    if (data.bestLift) tags.push(`<span class="timeline-tag tag-pr">PB: ${data.bestLift.weight}kg</span>`);
    if (!data.workoutEntries.length && !data.run) tags.push(`<span class="timeline-tag tag-rest">Rest</span>`);

    const stats = [];
    if (data.weight) stats.push(`<span><strong>${data.weight.kg}kg</strong></span>`);
    if (data.nutrition) stats.push(`<span><strong>${data.nutrition.kcal}</strong> kcal · <strong>${data.nutrition.protein}g</strong> protein</span>`);
    if (data.journal) stats.push(`<span style="color:var(--text3);font-style:italic">"${data.journal.text.slice(0,60)}${data.journal.text.length>60?'…':''}"</span>`);

    return `<div class="timeline-day-card" style="animation-delay:${i*30}ms">
      <div class="timeline-day-header">
        <div class="timeline-day-date">${formatDateLong(dateStr)}</div>
        <div class="timeline-day-tags">${tags.join('')}</div>
      </div>
      ${stats.length ? `<div class="timeline-day-stats">${stats.join('')}</div>` : ''}
    </div>`;
  }).join('');
}

// ── TRAINING UNIVERSE ─────────────────────────────────────────────────────────────

function renderTrainingUniverse() {
  const canvas = document.getElementById('universeCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = canvas.offsetWidth;
  const h = canvas.height = 500;

  const allExes = getAllExercises();
  const groupColors = {
    'Chest':     '#00D9FF',
    'Back':      '#3DDC97',
    'Shoulders': '#B9FF66',
    'Arms':      '#FFD166',
    'Legs':      '#FF9A3C',
  };

  // Calculate volume per exercise
  const volumes = {};
  allExes.forEach(ex => {
    const history = getExerciseHistory(ex.id);
    const recent = history.filter(h => h.date >= daysAgo(28));
    volumes[ex.id] = recent.length;
  });
  const maxVol = Math.max(...Object.values(volumes), 1);

  // Create nodes
  const nodes = allExes.map((ex, i) => {
    const angle = (i / allExes.length) * 2 * Math.PI;
    const radius = 140 + Math.random() * 80;
    const vol = volumes[ex.id] || 0;
    const size = 8 + (vol / maxVol) * 16;
    const color = groupColors[ex.group] || '#98A3B3';
    const brightness = vol > 0 ? 1 : 0.3;
    return {
      id: ex.id,
      name: ex.name,
      group: ex.group,
      x: w/2 + radius * Math.cos(angle),
      y: h/2 + radius * Math.sin(angle),
      vx: 0, vy: 0,
      size, color, brightness, vol,
      targetX: w/2 + radius * Math.cos(angle),
      targetY: h/2 + radius * Math.sin(angle),
    };
  });

  // Connections: exercises in same session on same day
  const connections = [];
  const seen = new Set();
  DB.workouts.forEach(entry => {
    const dow = getDayOfWeek(entry.date);
    const session = PLAN[dow];
    if (!session?.exercises) return;
    session.exercises.forEach((ex1, i) => {
      session.exercises.forEach((ex2, j) => {
        if (i >= j) return;
        const key = [ex1.id, ex2.id].sort().join('|');
        if (!seen.has(key)) { seen.add(key); connections.push({ a: ex1.id, b: ex2.id }); }
      });
    });
  });

  let tooltip = { show: false, text: '', x: 0, y: 0 };
  let hoveredNode = null;
  const tooltipEl = document.getElementById('universeTooltip');

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // Draw connections
    connections.forEach(conn => {
      const a = nodes.find(n => n.id === conn.a);
      const b = nodes.find(n => n.id === conn.b);
      if (!a || !b) return;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach(node => {
      const alpha = node.brightness;
      const isHovered = hoveredNode === node;
      const glow = isHovered ? 3 : 1;

      ctx.beginPath();
      ctx.arc(node.x, node.y, node.size * (isHovered ? 1.3 : 1), 0, 2*Math.PI);
      ctx.fillStyle = node.color + Math.round(alpha * (isHovered ? 255 : 180)).toString(16).padStart(2,'0');
      ctx.fill();

      if (node.vol > 0) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size * 1.8, 0, 2*Math.PI);
        ctx.strokeStyle = node.color + '22';
        ctx.lineWidth = glow;
        ctx.stroke();
      }

      // Label
      ctx.fillStyle = isHovered ? '#F5F7FA' : `rgba(152,163,179,${alpha * 0.8})`;
      ctx.font = `${isHovered ? '500 ' : ''}11px "Inter"`;
      ctx.textAlign = 'center';
      ctx.fillText(node.name.split(' ').slice(-1)[0], node.x, node.y + node.size + 14);
    });
  }

  // Mouse interaction
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    hoveredNode = null;
    nodes.forEach(node => {
      const dx = mx - node.x, dy = my - node.y;
      if (Math.sqrt(dx*dx + dy*dy) < node.size + 8) {
        hoveredNode = node;
        if (tooltipEl) {
          tooltipEl.style.display = 'block';
          tooltipEl.style.left = (e.clientX - canvas.getBoundingClientRect().left + 12) + 'px';
          tooltipEl.style.top = (e.clientY - canvas.getBoundingClientRect().top - 10) + 'px';
          const best = getBestSet(node.id);
          tooltipEl.innerHTML = `<strong style="color:var(--text)">${node.name}</strong><br>
            <span style="color:var(--text3)">${node.group} · ${node.vol} sessions</span><br>
            ${best ? `<span style="color:var(--cyan)">Best: ${best.weight}kg × ${best.reps}</span>` : '<span style="color:var(--text3)">No data yet</span>'}`;
        }
      }
    });
    if (!hoveredNode && tooltipEl) tooltipEl.style.display = 'none';
    draw();
  });
  canvas.addEventListener('mouseleave', () => {
    hoveredNode = null;
    if (tooltipEl) tooltipEl.style.display = 'none';
    draw();
  });

  draw();
}

// ── EXPORT / IMPORT ───────────────────────────────────────────────────────────────

function initExport() {
  document.getElementById('exportBtn').addEventListener('click', exportDB);
  document.getElementById('importFile').addEventListener('change', e => { if (e.target.files[0]) importDB(e.target.files[0]); });
}

// ── UI HELPERS ────────────────────────────────────────────────────────────────────

function showToast(msg) {
  const t = document.getElementById('toast');
  t.innerHTML = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function showPBFlash() {
  const el = document.getElementById('pbFlash');
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 3000);
}
