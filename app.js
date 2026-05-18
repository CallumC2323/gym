// ── INIT ────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadDB();
  if (!DB.meta.startDate) { DB.meta.startDate = today(); saveDB(); }
  initNav();
  initModals();
  checkMondayWeightPrompt();
  showSessionIntro();
  renderDashboard();
  renderTodayPage();
  initExport();
  fetchWeather();
  loadCalendarEvents();
});

// ── NAV ─────────────────────────────────────────────────────────────────────────

function initNav() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const page = link.dataset.page;
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById('page-' + page).classList.add('active');
      onPageOpen(page);
    });
  });
}

function onPageOpen(page) {
  if (page === 'progress') { buildExerciseFilter(); renderRunChart(); }
  if (page === 'body') renderBodyMap(getMuscleScores());
  if (page === 'weight') { renderWeightChart(); renderWeightHistory(); document.getElementById('weightDate').value = today(); }
  if (page === 'nutrition') { renderNutritionChart(); renderTodayNutrition(); }
  if (page === 'journal') renderJournal();
  if (page === 'dashboard') renderDashboard();
}

// ── MONDAY WEIGHT PROMPT ─────────────────────────────────────────────────────────

function checkMondayWeightPrompt() {
  const dow = new Date().getDay();
  if (dow !== 1) return; // Only Monday
  const shownToday = DB.meta.weightModalShown?.[today()];
  if (shownToday) return;
  setTimeout(() => {
    document.getElementById('weightModal').style.display = 'flex';
  }, 600);
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
  intro.addEventListener('click', () => {
    intro.style.opacity = '0';
    intro.style.transition = 'opacity 0.3s';
    setTimeout(() => intro.style.display = 'none', 300);
  });
  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    if (intro.style.display !== 'none') {
      intro.style.opacity = '0';
      intro.style.transition = 'opacity 0.3s';
      setTimeout(() => intro.style.display = 'none', 300);
    }
  }, 4000);
}

// ── MODALS ───────────────────────────────────────────────────────────────────────

function initModals() {
  // Monday weight modal
  document.getElementById('modalWeightSave').addEventListener('click', () => {
    const kg = parseFloat(document.getElementById('modalWeightKg').value);
    if (!kg) { showToast('Enter your weight'); return; }
    const notes = document.getElementById('modalWeightNotes').value;
    const entry = { date: today(), kg, notes };
    const idx = DB.weight.findIndex(w => w.date === today());
    if (idx >= 0) DB.weight[idx] = entry; else DB.weight.push(entry);
    DB.meta.weightModalShown[today()] = true;
    saveDB();
    document.getElementById('weightModal').style.display = 'none';
    showToast('Weight logged');
    renderDashboard();
  });
  document.getElementById('modalWeightSkip').addEventListener('click', () => {
    DB.meta.weightModalShown[today()] = true;
    saveDB();
    document.getElementById('weightModal').style.display = 'none';
  });

  // Recovery modal
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
    showToast('Recovery logged');
    renderDashboard();
    renderTodayPage(); // Re-render overload recs
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

  // Greeting
  const hour = d.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  document.getElementById('dashGreeting').textContent = greeting + ', Callum';
  document.getElementById('dashDate').textContent = `${dayNames[dow]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;

  // Session pill
  const pill = document.getElementById('dashSessionPill');
  pill.textContent = session.label;
  pill.onclick = () => { document.querySelector('[data-page="today"]').click(); };

  // Recovery
  const rec = getTodayRecovery();
  document.getElementById('dashSleep').textContent = rec?.sleep ? rec.sleep + 'h' : '—';
  document.getElementById('dashFitbit').textContent = rec?.fitbit ?? '—';
  const recScore = calcRecoveryScore(rec);
  const recEl = document.getElementById('dashRecoveryRating');
  if (!rec) { recEl.textContent = '—'; recEl.style.color = 'var(--text3)'; }
  else if (recScore >= 70) { recEl.textContent = 'Good'; recEl.style.color = 'var(--green)'; }
  else if (recScore >= 45) { recEl.textContent = 'OK'; recEl.style.color = 'var(--accent)'; }
  else { recEl.textContent = 'Low'; recEl.style.color = 'var(--red)'; }

  // Weekly stats
  const stats = getWeeklyStats();
  document.getElementById('weekSessions').textContent = `${stats.sessionsHit}/${stats.totalTrainDays}`;
  document.getElementById('weekProtein').textContent = stats.avgProtein ? stats.avgProtein + 'g' : '—';
  document.getElementById('weekStreak').textContent = stats.streak;

  // Weight progress
  const latestWeight = [...DB.weight].sort((a,b) => b.date.localeCompare(a.date))[0];
  if (latestWeight) {
    document.getElementById('dashCurrentWeight').textContent = latestWeight.kg;
    const pct = Math.min(Math.max((latestWeight.kg - 80) / (90-80) * 100, 0), 100);
    document.getElementById('dashWeightBar').style.width = pct + '%';
    const prev = DB.weight.sort((a,b) => b.date.localeCompare(a.date))[1];
    if (prev) {
      const diff = (latestWeight.kg - prev.kg).toFixed(1);
      const el = document.getElementById('dashWeightDiff');
      el.textContent = (diff > 0 ? '+' : '') + diff + 'kg';
      el.style.color = diff > 0 ? 'var(--green)' : 'var(--red)';
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

  // Deload check
  if (shouldDeload()) document.getElementById('deloadCard').style.display = 'block';
}

// ── WEATHER ──────────────────────────────────────────────────────────────────────

async function fetchWeather() {
  try {
    // Leeds coords
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=53.8008&longitude=-1.5491&current=temperature_2m,weathercode,windspeed_10m,precipitation&timezone=Europe%2FLondon');
    const data = await res.json();
    const c = data.current;
    const temp = Math.round(c.temperature_2m);
    const precip = c.precipitation;
    const wind = Math.round(c.windspeed_10m);
    const desc = weatherDesc(c.weathercode);

    const runTip = precip > 2 ? { cls:'tip-bad', text:'Wet outside — check before your run' }
      : wind > 30 ? { cls:'tip-ok', text:'Windy — adjust your pace' }
      : temp < 5 ? { cls:'tip-ok', text:'Cold — layer up for your run' }
      : { cls:'tip-good', text:'Good conditions for running' };

    document.getElementById('weatherContent').innerHTML = `
      <div class="weather-main">${temp}°C</div>
      <div class="weather-desc">${desc} · ${wind}km/h wind</div>
      <div class="weather-run-tip ${runTip.cls}">${runTip.text}</div>
    `;
  } catch(e) {
    document.getElementById('weatherContent').innerHTML = '<div style="font-size:12px;color:var(--text3)">Weather unavailable</div>';
  }
}

function weatherDesc(code) {
  if (code === 0) return 'Clear sky';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 49) return 'Foggy';
  if (code <= 59) return 'Drizzle';
  if (code <= 69) return 'Rain';
  if (code <= 79) return 'Snow';
  if (code <= 82) return 'Rain showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Cloudy';
}

// ── GOOGLE CALENDAR ───────────────────────────────────────────────────────────────

const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID'; // Replace with your client ID
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/calendar.readonly';
let gCalToken = null;

function loadCalendarEvents() {
  const stored = localStorage.getItem('forge_gcal_token');
  if (stored) {
    gCalToken = stored;
    fetchCalendarEvents();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const btn = document.getElementById('connectCalendarBtn');
    if (btn) btn.addEventListener('click', connectGoogleCalendar);
  }, 200);
});

function connectGoogleCalendar() {
  const redirectUri = encodeURIComponent(window.location.href.split('?')[0]);
  const scope = encodeURIComponent(GOOGLE_SCOPES);
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
  window.location.href = url;
}

// Handle OAuth redirect
(function handleOAuthRedirect() {
  const hash = window.location.hash;
  if (hash.includes('access_token')) {
    const params = new URLSearchParams(hash.slice(1));
    const token = params.get('access_token');
    if (token) {
      gCalToken = token;
      localStorage.setItem('forge_gcal_token', token);
      window.history.replaceState({}, document.title, window.location.pathname);
      fetchCalendarEvents();
    }
  }
})();

async function fetchCalendarEvents() {
  if (!gCalToken) return;
  try {
    const now = new Date();
    const end = new Date(now); end.setHours(23,59,59);
    const timeMin = encodeURIComponent(now.toISOString());
    const timeMax = encodeURIComponent(end.toISOString());
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime&maxResults=8`,
      { headers: { Authorization: `Bearer ${gCalToken}` } }
    );
    if (!res.ok) { localStorage.removeItem('forge_gcal_token'); gCalToken = null; return; }
    const data = await res.json();
    renderCalendarEvents(data.items || []);
    document.getElementById('connectCalendarBtn').style.display = 'none';
  } catch(e) {
    document.getElementById('calendarEvents').innerHTML = '<div style="font-size:12px;color:var(--text3)">Could not load calendar</div>';
  }
}

function renderCalendarEvents(events) {
  const el = document.getElementById('calendarEvents');
  if (!events.length) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text3)">No events today</div>';
    return;
  }
  el.innerHTML = events.map(ev => {
    const start = ev.start?.dateTime ? new Date(ev.start.dateTime).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }) : 'All day';
    return `<div class="cal-event">
      <div class="cal-event-dot"></div>
      <div class="cal-event-time">${start}</div>
      <div class="cal-event-title">${ev.summary || 'Untitled'}</div>
    </div>`;
  }).join('');
}

// ── TODAY PAGE ────────────────────────────────────────────────────────────────────

function renderTodayPage() {
  const dateStr = today();
  const dow = getDayOfWeek(dateStr);
  const session = PLAN[dow];
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const d = new Date();

  document.getElementById('todayTitle').textContent = session.label;
  document.getElementById('todayDate').textContent = `${dayNames[dow]}, ${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`;
  document.getElementById('dayBadge').textContent = session.focus || session.type.toUpperCase();

  renderWorkoutSection(session, dateStr);
  renderRunSection(session, dateStr);
  renderCalorieSection(dateStr);
}

// ── WORKOUT ───────────────────────────────────────────────────────────────────────

function renderWorkoutSection(session, dateStr) {
  const el = document.getElementById('workoutSection');
  if (session.type === 'rest') {
    el.innerHTML = `<div class="rest-card"><div style="font-size:40px">💤</div><div class="rest-title">Rest Day</div><p style="color:var(--text2);margin-top:0.5rem;font-size:14px">Sleep well. Hit your protein. Come back stronger.</p></div>`;
    return;
  }
  if (session.type === 'run') { el.innerHTML = ''; return; }

  const maxSets = Math.max(...session.exercises.map(e => e.sets));
  let setHeaders = '';
  for (let i=0; i<maxSets; i++) setHeaders += `<th style="font-size:10px;color:var(--text3);font-weight:400;padding:0 4px;min-width:60px">Set ${i+1}</th>`;

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
          <span style="font-size:9px;color:var(--text3)">kg</span>
          <input type="number" class="set-input" placeholder="—" data-ex="${ex.id}" data-set="${i}" data-field="weight" value="${s?.weight||''}" min="0" step="0.5">
          <span style="font-size:9px;color:var(--text3)">reps</span>
          <input type="number" class="set-input" placeholder="—" data-ex="${ex.id}" data-set="${i}" data-field="reps" value="${s?.reps||''}" min="0" step="1">
        </div></td>`;
    }
    for (let i=ex.sets; i<maxSets; i++) setInputs += `<td></td>`;

    rows += `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:10px 0;vertical-align:middle;padding-right:8px">
        <div style="font-size:13px;font-weight:500;color:var(--text)">${ex.name}</div>
        <div style="font-size:11px;color:var(--text3)">${ex.sets} × ${ex.reps}</div>
        <div style="margin-top:4px"><span class="overload-badge ${recClass}">${rec.text}</span></div>
      </td>
      ${setInputs}
      <td style="font-size:11px;color:var(--text3);padding:0 6px;white-space:nowrap;vertical-align:middle">${best ? `${best.weight}kg×${best.reps}` : '—'}</td>
    </tr>`;
  });

  el.innerHTML = `<div class="card">
    <h2 class="section-title">${session.label} — ${session.focus}</h2>
    <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse">
      <thead><tr style="border-bottom:1px solid var(--border)">
        <th style="text-align:left;font-size:10px;color:var(--text3);font-weight:400;padding-bottom:8px;min-width:160px">Exercise</th>
        ${setHeaders}
        <th style="font-size:10px;color:var(--text3);font-weight:400;padding:0 6px">Best</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
    <div style="margin-top:1rem;display:flex;gap:0.75rem;align-items:center">
      <button class="btn-primary" id="saveWorkoutBtn">Save Session</button>
      <span style="font-size:12px;color:var(--text3)" id="saveStatus"></span>
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
        const newVol = w * r;
        if (prevBest && newVol > prevBest.vol) newPB = true;
        if (!prevBest && w > 0) newPB = false; // First time doesn't count as PB
      }
    });
  });
  const st = document.getElementById('saveStatus');
  if (st) st.textContent = 'Saved ✓';
  showToast('Session saved');
  if (newPB) showPBFlash();
  setTimeout(() => { const s = document.getElementById('saveStatus'); if(s) s.textContent=''; }, 3000);
}

// ── RUN SECTION ───────────────────────────────────────────────────────────────────

function renderRunSection(session, dateStr) {
  const el = document.getElementById('runSection');
  const isRunDay = session.type === 'run';
  const existing = DB.runs.find(r => r.date === dateStr);

  el.innerHTML = `<div class="card" ${!isRunDay ? 'style="opacity:0.8"' : ''}>
    <h2 class="section-title">Run Log${!isRunDay ? ' <span style="font-size:12px;color:var(--text3);font-weight:400">— optional</span>' : ''}</h2>
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
    saveDB(); showToast('Run logged');
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
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
          <span style="color:var(--text2)">Calories</span><span style="color:var(--accent);font-weight:500">${kcal||'—'} / 3,100</span>
        </div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${kcalPct}%"></div></div>
        <div style="font-size:11px;color:var(--text3);margin-top:3px">${kcalPct}% of target</div>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
          <span style="color:var(--text2)">Protein</span><span style="color:var(--green);font-weight:500">${protein||'—'}g / 165g</span>
        </div>
        <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${protPct}%;background:var(--green)"></div></div>
        <div style="font-size:11px;color:var(--text3);margin-top:3px">${protPct}% of target</div>
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
    saveDB(); showToast('Nutrition logged');
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
      saveDB(); renderWeightChart(); renderWeightHistory(); renderDashboard();
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
      saveDB(); renderNutritionChart(); renderTodayNutrition(); renderDashboard();
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
    const dc = diff > 0 ? 'var(--green)' : diff < 0 ? 'var(--red)' : 'var(--text3)';
    return `<div class="history-item">
      <span class="history-date">${formatDate(w.date)}</span>
      <span class="history-val">${w.kg}kg</span>
      ${diff !== null ? `<span style="font-size:12px;color:${dc}">${diff>0?'+':''}${diff}kg</span>` : '<span></span>'}
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
    saveDB(); showToast('Entry saved'); renderJournalHistory();
  };
  renderJournalHistory();
}

function renderJournalHistory() {
  const el = document.getElementById('journalHistory');
  const entries = [...DB.journal].sort((a,b) => b.date.localeCompare(a.date)).filter(j => j.date !== today()).slice(0,20);
  if (!entries.length) { el.innerHTML = ''; return; }
  el.innerHTML = entries.map(j => `
    <div class="journal-entry-card">
      <div class="journal-entry-date">${formatDate(j.date)}</div>
      <div class="journal-entry-text">${j.text}</div>
    </div>`).join('');
}

// ── EXPORT / IMPORT ───────────────────────────────────────────────────────────────

function initExport() {
  document.getElementById('exportBtn').addEventListener('click', exportDB);
  document.getElementById('importFile').addEventListener('change', e => { if (e.target.files[0]) importDB(e.target.files[0]); });
}

// ── UI HELPERS ────────────────────────────────────────────────────────────────────

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function showPBFlash() {
  const el = document.getElementById('pbFlash');
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 3000);
}
