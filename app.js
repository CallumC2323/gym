// ── INIT ────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadDB();
  initNav();
  renderTodayPage();
  initExport();
});

// ── NAVIGATION ──────────────────────────────────────────────────────────────────

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
  if (page === 'progress') {
    buildExerciseFilter();
    renderRunChart();
  }
  if (page === 'body') {
    renderBodyMap(getMuscleScores());
  }
  if (page === 'weight') {
    renderWeightChart();
    renderWeightHistory();
    document.getElementById('weightDate').value = today();
  }
  if (page === 'nutrition') {
    renderNutritionChart();
    renderTodayNutrition();
  }
}

// ── TODAY PAGE ──────────────────────────────────────────────────────────────────

function renderTodayPage() {
  const dateStr = today();
  const dow = getDayOfWeek(dateStr);
  const session = PLAN[dow];

  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const d = new Date();

  document.getElementById('todayTitle').textContent = session.label;
  document.getElementById('todayDate').textContent =
    `${dayNames[dow]}, ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;

  const badge = document.getElementById('dayBadge');
  badge.textContent = session.focus || session.type.toUpperCase();

  renderWorkoutSection(session, dateStr);
  renderRunSection(session, dateStr);
  renderCalorieSection(dateStr);
}

// ── WORKOUT SECTION ─────────────────────────────────────────────────────────────

function renderWorkoutSection(session, dateStr) {
  const el = document.getElementById('workoutSection');

  if (session.type === 'rest') {
    el.innerHTML = `
      <div class="rest-card">
        <div class="rest-icon">💤</div>
        <div class="rest-title">Rest Day</div>
        <p style="color:var(--text2);margin-top:0.5rem;font-size:14px">Sleep well. Eat your protein. Come back stronger.</p>
      </div>`;
    return;
  }

  if (session.type === 'run') {
    el.innerHTML = '';
    return;
  }

  let html = `<div class="card">
    <h2 class="section-title">${session.label}</h2>
    <div class="exercise-table">`;

  // Header
  const maxSets = Math.max(...session.exercises.map(e => e.sets));
  let setHeaders = '';
  for (let i = 0; i < maxSets; i++) {
    setHeaders += `<th style="font-size:11px;color:var(--text3);font-weight:400;padding:0 4px">Set ${i+1}</th>`;
  }

  html += `<table style="width:100%;border-collapse:collapse">
    <thead>
      <tr style="border-bottom:1px solid var(--border)">
        <th style="text-align:left;font-size:11px;color:var(--text3);font-weight:400;padding-bottom:8px;width:40%">Exercise</th>
        <th style="text-align:left;font-size:11px;color:var(--text3);font-weight:400;padding-bottom:8px;width:12%">Target</th>
        ${setHeaders}
        <th style="font-size:11px;color:var(--text3);font-weight:400;padding:0 4px">Best</th>
      </tr>
    </thead>
    <tbody>`;

  session.exercises.forEach(ex => {
    const entry = getWorkoutEntry(dateStr, ex.id);
    const best = getBestSet(ex.id);

    let setInputs = '';
    for (let i = 0; i < ex.sets; i++) {
      const s = entry?.sets?.[i];
      setInputs += `
        <td style="padding:6px 4px;vertical-align:top">
          <div style="display:flex;flex-direction:column;gap:3px;align-items:center">
            <span style="font-size:9px;color:var(--text3)">kg</span>
            <input type="number" class="set-input" placeholder="—"
              data-ex="${ex.id}" data-set="${i}" data-field="weight"
              value="${s?.weight || ''}" min="0" step="0.5" style="width:52px">
            <span style="font-size:9px;color:var(--text3)">reps</span>
            <input type="number" class="set-input" placeholder="—"
              data-ex="${ex.id}" data-set="${i}" data-field="reps"
              value="${s?.reps || ''}" min="0" step="1" style="width:52px">
          </div>
        </td>`;
      // Fill empty sets up to max
    }
    // Pad to maxSets
    for (let i = ex.sets; i < maxSets; i++) {
      setInputs += `<td></td>`;
    }

    const bestText = best ? `${best.weight}kg × ${best.reps}` : '—';

    html += `<tr style="border-bottom:1px solid var(--border)">
      <td style="padding:10px 0;vertical-align:middle">
        <div style="font-size:14px;font-weight:500;color:var(--text)">${ex.name}</div>
        <div style="font-size:11px;color:var(--text3)">${ex.sets} × ${ex.reps}</div>
      </td>
      <td style="font-size:12px;color:var(--text3);vertical-align:middle">${ex.reps}</td>
      ${setInputs}
      <td style="font-size:12px;color:var(--accent);padding:0 4px;white-space:nowrap;vertical-align:middle">${bestText}</td>
    </tr>`;
  });

  html += `</tbody></table>`;
  html += `<div style="margin-top:1rem;display:flex;gap:0.75rem;align-items:center">
    <button class="btn-primary" id="saveWorkoutBtn">Save Session</button>
    <span style="font-size:12px;color:var(--text3)" id="saveStatus"></span>
  </div>`;
  html += `</div>`;

  el.innerHTML = html;

  document.getElementById('saveWorkoutBtn').addEventListener('click', () => {
    saveWorkoutFromForm(dateStr, session);
  });
}

function saveWorkoutFromForm(dateStr, session) {
  session.exercises.forEach(ex => {
    const weightInputs = document.querySelectorAll(`[data-ex="${ex.id}"][data-field="weight"]`);
    const repsInputs = document.querySelectorAll(`[data-ex="${ex.id}"][data-field="reps"]`);
    weightInputs.forEach((inp, i) => {
      const w = parseFloat(inp.value);
      const r = parseInt(repsInputs[i]?.value);
      if (w || r) saveWorkoutSet(dateStr, ex.id, i, w, r);
    });
  });
  document.getElementById('saveStatus').textContent = 'Saved ✓';
  showToast('Session saved');
  setTimeout(() => {
    const el = document.getElementById('saveStatus');
    if (el) el.textContent = '';
  }, 3000);
}

// ── RUN SECTION ─────────────────────────────────────────────────────────────────

function renderRunSection(session, dateStr) {
  const el = document.getElementById('runSection');

  const showRun = session.type === 'run' || true; // Show run log on all days
  if (!showRun) { el.innerHTML = ''; return; }

  const existing = DB.runs.find(r => r.date === dateStr);
  const isRunDay = session.type === 'run';

  html = `<div class="card" ${!isRunDay ? 'style="opacity:0.7"' : ''}>
    <h2 class="section-title">Run Log ${isRunDay ? '' : '<span style="font-size:13px;color:var(--text3);font-weight:400"> — optional today</span>'}</h2>
    <div class="run-form">
      <div class="form-group">
        <label class="label">Distance (km)</label>
        <input type="number" id="runDist" class="input" step="0.1" placeholder="5.0" value="${existing?.distanceKm || ''}">
      </div>
      <div class="form-group">
        <label class="label">Duration (min)</label>
        <input type="number" id="runDur" class="input" step="1" placeholder="25" value="${existing?.durationMin || ''}">
      </div>
      <div class="form-group">
        <label class="label">Avg pace (min/km)</label>
        <input type="text" id="runPace" class="input" placeholder="auto" readonly
          style="background:var(--bg4);color:var(--text3)" value="${existing ? calcPace(existing.distanceKm, existing.durationMin) : ''}">
      </div>
      <div class="form-group">
        <label class="label">Notes</label>
        <input type="text" id="runNotes" class="input" placeholder="Felt strong..." value="${existing?.notes || ''}">
      </div>
    </div>
    <button class="btn-primary" id="saveRunBtn">Log Run</button>
  </div>`;

  el.innerHTML = html;

  // Auto-calc pace
  ['runDist','runDur'].forEach(id => {
    document.getElementById(id).addEventListener('input', () => {
      const dist = parseFloat(document.getElementById('runDist').value);
      const dur = parseFloat(document.getElementById('runDur').value);
      if (dist > 0 && dur > 0) {
        document.getElementById('runPace').value = calcPace(dist, dur);
      }
    });
  });

  document.getElementById('saveRunBtn').addEventListener('click', () => {
    const dist = parseFloat(document.getElementById('runDist').value);
    const dur = parseFloat(document.getElementById('runDur').value);
    const notes = document.getElementById('runNotes').value;
    if (!dist && !dur) { showToast('Enter distance or duration'); return; }
    const idx = DB.runs.findIndex(r => r.date === dateStr);
    const entry = { date: dateStr, distanceKm: dist || 0, durationMin: dur || 0, notes };
    if (idx >= 0) DB.runs[idx] = entry; else DB.runs.push(entry);
    saveDB();
    showToast('Run logged');
  });
}

function calcPace(dist, dur) {
  if (!dist || !dur) return '';
  const pace = dur / dist;
  const mins = Math.floor(pace);
  const secs = Math.round((pace - mins) * 60);
  return `${mins}:${secs.toString().padStart(2,'0')}`;
}

// ── CALORIE SECTION ─────────────────────────────────────────────────────────────

function renderCalorieSection(dateStr) {
  const el = document.getElementById('calorieSection');
  const existing = DB.nutrition.find(n => n.date === dateStr);

  const kcal = existing?.kcal || 0;
  const protein = existing?.protein || 0;
  const kcalPct = Math.min(Math.round(kcal / 3100 * 100), 100);
  const protPct = Math.min(Math.round(protein / 165 * 100), 100);

  el.innerHTML = `<div class="card">
    <h2 class="section-title">Today's Nutrition</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem">
      <div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
          <span style="color:var(--text2)">Calories</span>
          <span style="color:var(--accent);font-weight:500">${kcal || '—'} / 3,100</span>
        </div>
        <div class="calorie-bar-bg"><div class="calorie-bar-fill" style="width:${kcalPct}%;background:var(--accent)"></div></div>
        <div class="calorie-bar-label">${kcalPct}% of target</div>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px">
          <span style="color:var(--text2)">Protein</span>
          <span style="color:var(--green);font-weight:500">${protein || '—'}g / 165g</span>
        </div>
        <div class="calorie-bar-bg"><div class="calorie-bar-fill" style="width:${protPct}%;background:var(--green)"></div></div>
        <div class="calorie-bar-label">${protPct}% of target</div>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <label class="label">Calories</label>
        <input type="number" id="dayKcal" class="input" placeholder="3100" value="${existing?.kcal || ''}">
      </div>
      <div class="form-group">
        <label class="label">Protein (g)</label>
        <input type="number" id="dayProtein" class="input" placeholder="165" value="${existing?.protein || ''}">
      </div>
      <div class="form-group">
        <label class="label">Notes</label>
        <input type="text" id="dayNutNotes" class="input" placeholder="What you ate..." value="${existing?.notes || ''}">
      </div>
    </div>
    <button class="btn-primary" id="saveDayNutBtn">Log Nutrition</button>
  </div>`;

  document.getElementById('saveDayNutBtn').addEventListener('click', () => {
    const kcal = parseInt(document.getElementById('dayKcal').value);
    const protein = parseInt(document.getElementById('dayProtein').value);
    const notes = document.getElementById('dayNutNotes').value;
    const entry = { date: dateStr, kcal: kcal || 0, protein: protein || 0, notes };
    const idx = DB.nutrition.findIndex(n => n.date === dateStr);
    if (idx >= 0) DB.nutrition[idx] = entry; else DB.nutrition.push(entry);
    saveDB();
    showToast('Nutrition logged');
    renderCalorieSection(dateStr);
  });
}

// ── WEIGHT PAGE ─────────────────────────────────────────────────────────────────

function renderWeightHistory() {
  const el = document.getElementById('weightHistory');
  const sorted = [...DB.weight].sort((a,b) => b.date.localeCompare(a.date)).slice(0,20);
  if (sorted.length === 0) {
    el.innerHTML = '<p style="color:var(--text3);font-size:13px">No weigh-ins logged yet. Log every Monday morning, fasted.</p>';
    return;
  }
  el.innerHTML = sorted.map((w,i) => {
    const prev = sorted[i+1];
    const diff = prev ? (w.kg - prev.kg).toFixed(1) : null;
    const diffStr = diff !== null ? (diff > 0 ? `+${diff}kg` : `${diff}kg`) : '';
    const diffColor = diff > 0 ? 'var(--green)' : diff < 0 ? 'var(--red)' : 'var(--text3)';
    return `<div class="history-item">
      <span class="history-date">${formatDate(w.date)}</span>
      <span class="history-val">${w.kg}kg</span>
      ${diff !== null ? `<span style="font-size:12px;color:${diffColor}">${diffStr}</span>` : '<span></span>'}
      <span class="history-note">${w.notes || ''}</span>
    </div>`;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const logWeightBtn = document.getElementById('logWeightBtn');
    if (logWeightBtn) {
      logWeightBtn.addEventListener('click', () => {
        const kg = parseFloat(document.getElementById('weightKg').value);
        const date = document.getElementById('weightDate').value;
        const notes = document.getElementById('weightNotes').value;
        if (!kg || !date) { showToast('Enter weight and date'); return; }
        const entry = { date, kg, notes };
        const idx = DB.weight.findIndex(w => w.date === date);
        if (idx >= 0) DB.weight[idx] = entry; else DB.weight.push(entry);
        saveDB();
        renderWeightChart();
        renderWeightHistory();
        showToast('Weight logged');
        document.getElementById('weightKg').value = '';
        document.getElementById('weightNotes').value = '';
      });
    }

    const logNutritionBtn = document.getElementById('logNutritionBtn');
    if (logNutritionBtn) {
      logNutritionBtn.addEventListener('click', () => {
        const kcal = parseInt(document.getElementById('nutKcal').value);
        const protein = parseInt(document.getElementById('nutProtein').value);
        const notes = document.getElementById('nutNotes').value;
        const dateStr = today();
        const entry = { date: dateStr, kcal: kcal||0, protein: protein||0, notes };
        const idx = DB.nutrition.findIndex(n => n.date === dateStr);
        if (idx >= 0) DB.nutrition[idx] = entry; else DB.nutrition.push(entry);
        saveDB();
        renderNutritionChart();
        renderTodayNutrition();
        showToast('Nutrition logged');
      });
    }
  }, 100);
});

function renderTodayNutrition() {
  const existing = DB.nutrition.find(n => n.date === today());
  document.getElementById('todayKcal').textContent = existing?.kcal || '—';
  document.getElementById('todayProtein').textContent = existing?.protein ? existing.protein + 'g' : '—';
}

// ── EXPORT / IMPORT ─────────────────────────────────────────────────────────────

function initExport() {
  document.getElementById('exportBtn').addEventListener('click', exportDB);
  document.getElementById('importFile').addEventListener('change', e => {
    if (e.target.files[0]) importDB(e.target.files[0]);
  });
}

// ── TOAST ───────────────────────────────────────────────────────────────────────

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}
