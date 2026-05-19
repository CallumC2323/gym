// ── TRAINING PLAN ───────────────────────────────────────────────────────────────

const PLAN = {
  0: { type: 'rest', label: 'Rest Day' },
  1: {
    type: 'upper', label: 'Upper A', focus: 'Strength',
    exercises: [
      { id: 'incline_db_press',   name: 'Incline DB Press',          group: 'Chest',     sets: 4, reps: '6–8',   muscles: ['chest','front_delt'] },
      { id: 'seated_cable_row',   name: 'Seated Cable Row',          group: 'Back',      sets: 4, reps: '8–10',  muscles: ['mid_back','rear_delt','biceps'] },
      { id: 'db_shoulder_press',  name: 'Seated DB Shoulder Press',  group: 'Shoulders', sets: 3, reps: '8–10',  muscles: ['front_delt','side_delt'] },
      { id: 'lat_pulldown',       name: 'Lat Pulldown',              group: 'Back',      sets: 3, reps: '10–12', muscles: ['lats','biceps'] },
      { id: 'ez_bar_curl',        name: 'EZ Bar Curl',               group: 'Arms',      sets: 3, reps: '10–12', muscles: ['biceps'] },
      { id: 'overhead_tri_ext',   name: 'Overhead Tricep Extension', group: 'Arms',      sets: 3, reps: '10–12', muscles: ['triceps'] },
    ]
  },
  2: {
    type: 'lower', label: 'Lower A', focus: 'Strength',
    exercises: [
      { id: 'barbell_squat',      name: 'Barbell Back Squat',        group: 'Legs',      sets: 4, reps: '6–8',   muscles: ['quads','glutes'] },
      { id: 'romanian_dl',        name: 'Romanian Deadlift',         group: 'Legs',      sets: 3, reps: '8–10',  muscles: ['hamstrings','glutes','lower_back'] },
      { id: 'leg_press_a',        name: 'Leg Press',                 group: 'Legs',      sets: 3, reps: '10–12', muscles: ['quads','glutes'] },
      { id: 'leg_curl_a',         name: 'Leg Curl',                  group: 'Legs',      sets: 3, reps: '10–12', muscles: ['hamstrings'] },
      { id: 'standing_calf',      name: 'Standing Calf Raise',       group: 'Legs',      sets: 4, reps: '12–15', muscles: ['calves'] },
    ]
  },
  3: { type: 'run', label: 'Run Day' },
  4: {
    type: 'upper', label: 'Upper B', focus: 'Hypertrophy',
    exercises: [
      { id: 'incline_db_press_b', name: 'Incline DB Press',          group: 'Chest',     sets: 4, reps: '10–12', muscles: ['chest','front_delt'] },
      { id: 'cable_chest_fly',    name: 'Cable Chest Fly',           group: 'Chest',     sets: 3, reps: '12–15', muscles: ['chest'] },
      { id: 'cs_db_row',          name: 'Chest-Supported DB Row',    group: 'Back',      sets: 4, reps: '10–12', muscles: ['mid_back','rear_delt'] },
      { id: 'rev_pec_deck',       name: 'Reverse Pec Deck',          group: 'Shoulders', sets: 3, reps: '15–20', muscles: ['rear_delt'] },
      { id: 'db_lateral_raise',   name: 'DB Lateral Raise',          group: 'Shoulders', sets: 4, reps: '12–15', muscles: ['side_delt'] },
      { id: 'hammer_curl',        name: 'Hammer Curl',               group: 'Arms',      sets: 3, reps: '10–12', muscles: ['biceps'] },
      { id: 'tri_pushdown',       name: 'Tricep Pushdown',           group: 'Arms',      sets: 3, reps: '12–15', muscles: ['triceps'] },
    ]
  },
  5: {
    type: 'lower', label: 'Lower B', focus: 'Hypertrophy',
    exercises: [
      { id: 'leg_press_b',        name: 'Leg Press',                 group: 'Legs',      sets: 4, reps: '10–12', muscles: ['quads','glutes'] },
      { id: 'bulgarian_split',    name: 'Bulgarian Split Squat',     group: 'Legs',      sets: 3, reps: '10–12', muscles: ['quads','glutes'] },
      { id: 'lying_leg_curl',     name: 'Lying Leg Curl',            group: 'Legs',      sets: 4, reps: '10–12', muscles: ['hamstrings'] },
      { id: 'hip_thrust',         name: 'Hip Thrust',                group: 'Legs',      sets: 3, reps: '12–15', muscles: ['glutes','hamstrings'] },
      { id: 'seated_calf',        name: 'Seated Calf Raise',         group: 'Legs',      sets: 4, reps: '12–15', muscles: ['calves'] },
    ]
  },
  6: { type: 'run', label: 'Run Day (Optional)' }
};

const ALL_MUSCLES = ['chest','front_delt','side_delt','rear_delt','lats','mid_back','lower_back','biceps','triceps','quads','hamstrings','glutes','calves'];
const REP_UPPER = { '6–8':8, '8–10':10, '10–12':12, '12–15':15, '15–20':20 };

// Get all unique exercise groups dynamically from the plan
function getAllGroups() {
  const groups = [];
  Object.values(PLAN).forEach(day => {
    if (!day.exercises) return;
    day.exercises.forEach(ex => {
      if (ex.group && !groups.includes(ex.group)) groups.push(ex.group);
    });
  });
  return groups; // e.g. ['Chest','Back','Shoulders','Arms','Legs']
}

// Get all unique exercises, deduped by id
function getAllExercises() {
  const seen = new Set();
  const list = [];
  Object.values(PLAN).forEach(day => {
    if (!day.exercises) return;
    day.exercises.forEach(ex => {
      if (!seen.has(ex.id)) { seen.add(ex.id); list.push(ex); }
    });
  });
  return list;
}

// Get exercises for a given group
function getExercisesByGroup(group) {
  return getAllExercises().filter(ex => ex.group === group);
}

// ── AWARDS DEFINITIONS ──────────────────────────────────────────────────────────

const AWARDS_DEF = [
  { id: 'first_workout',   category: 'Training',   name: 'First Rep',         desc: 'Log your first workout',              icon: '🏋️', check: db => getCompletedWorkoutCount(db) >= 1 },
  { id: 'workouts_10',     category: 'Training',   name: 'Ten Sessions',      desc: 'Complete 10 workouts',                icon: '🔟', check: db => getCompletedWorkoutCount(db) >= 10 },
  { id: 'workouts_50',     category: 'Training',   name: 'Fifty Strong',      desc: 'Complete 50 workouts',                icon: '💪', check: db => getCompletedWorkoutCount(db) >= 50 },
  { id: 'workouts_100',    category: 'Training',   name: 'Century',           desc: 'Complete 100 workouts',               icon: '💯', check: db => getCompletedWorkoutCount(db) >= 100 },
  { id: 'first_deload',    category: 'Training',   name: 'Smart Athlete',     desc: 'Complete your first deload week',     icon: '🔄', check: db => db.meta.deloadDone === true },
  { id: 'streak_7',        category: 'Consistency',name: 'Week Warrior',      desc: '7-day logging streak',                icon: '📅', check: db => getWeeklyStats(db).streak >= 7 },
  { id: 'streak_30',       category: 'Consistency',name: 'Iron Habit',        desc: '30-day logging streak',               icon: '⛓️', check: db => getWeeklyStats(db).streak >= 30 },
  { id: 'journal_10',      category: 'Consistency',name: 'Reflective',        desc: 'Write 10 journal entries',            icon: '📓', check: db => db.journal.length >= 10 },
  { id: 'protein_week',    category: 'Nutrition',  name: 'Protein King',      desc: 'Hit protein target 7 days in a row',  icon: '🥩', check: db => getProteinStreak(db) >= 7 },
  { id: 'first_run',       category: 'Running',    name: 'First Stride',      desc: 'Log your first run',                  icon: '🏃', check: db => db.runs.length >= 1 },
  { id: 'runs_10',         category: 'Running',    name: 'Road Regular',      desc: 'Complete 10 runs',                    icon: '👟', check: db => db.runs.length >= 10 },
  { id: 'run_50km',        category: 'Running',    name: '50km Club',         desc: 'Run 50km total',                      icon: '🛣️', check: db => db.runs.reduce((s,r) => s + (r.distanceKm||0), 0) >= 50 },
  { id: 'run_100km',       category: 'Running',    name: '100km Club',        desc: 'Run 100km total',                     icon: '🏅', check: db => db.runs.reduce((s,r) => s + (r.distanceKm||0), 0) >= 100 },
  { id: 'weight_85',       category: 'Milestones', name: 'Phase One',         desc: 'Hit 85kg bodyweight',                 icon: '⚡', check: db => db.weight.some(w => w.kg >= 85) },
  { id: 'weight_87',       category: 'Milestones', name: 'Closing In',        desc: 'Hit 87kg bodyweight',                 icon: '🎯', check: db => db.weight.some(w => w.kg >= 87) },
  { id: 'weight_90',       category: 'Milestones', name: 'Goal Reached',      desc: 'Hit 90kg bodyweight',                 icon: '🏆', check: db => db.weight.some(w => w.kg >= 90) },
  { id: 'kg_lifted_100k',  category: 'Training',   name: '100k Club',         desc: 'Lift 100,000kg total',                icon: '🔩', check: db => getTotalKgLifted(db) >= 100000 },
  { id: 'kg_lifted_1m',    category: 'Training',   name: 'Million Kilo',      desc: 'Lift 1,000,000kg total',              icon: '🌍', check: db => getTotalKgLifted(db) >= 1000000 },
];

// ── DATABASE ────────────────────────────────────────────────────────────────────

let DB = {
  workouts:  [],
  runs:      [],
  weight:    [],
  nutrition: [],
  recovery:  [],
  journal:   [],
  meta: { startDate: null, weightModalShown: {}, deloadDone: false, awardsUnlocked: {} }
};

// ── GOOGLE DRIVE SYNC ───────────────────────────────────────────────────────────

const GOOGLE_CLIENT_ID = '164863429187-3c4g3v2jlrunksl7sdnb8kico7k711p0.apps.googleusercontent.com';
const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly';
const DRIVE_FILE_NAME = 'forge-data.json';

let gToken = null;
let gDriveFileId = null;
let syncTimeout = null;
let syncStatus = 'idle'; // idle | syncing | synced | error | offline

function setSyncStatus(s) {
  syncStatus = s;
  const el = document.getElementById('syncStatus');
  if (!el) return;
  const map = {
    idle:    { text: '',            color: 'var(--text2)' },
    syncing: { text: 'Syncing…',    color: 'var(--cyan)' },
    synced:  { text: 'Synced ✓',    color: 'var(--emerald)' },
    error:   { text: 'Sync error',  color: 'var(--amber)' },
    offline: { text: 'Offline',     color: 'var(--text3)' },
    noauth:  { text: 'Connect Drive', color: 'var(--cyan)', clickable: true }
  };
  const m = map[s] || map.idle;
  el.textContent = m.text;
  el.style.color = m.color;
  el.style.cursor = m.clickable ? 'pointer' : 'default';
  if (m.clickable) el.onclick = connectDrive;
  else el.onclick = null;
}

async function initDrive() {
  const stored = localStorage.getItem('forge_gtoken');
  if (stored) {
    gToken = stored;
    await loadFromDrive();
  } else {
    setSyncStatus('noauth');
  }
  // Handle OAuth redirect
  const hash = window.location.hash;
  if (hash.includes('access_token')) {
    const params = new URLSearchParams(hash.slice(1));
    const token = params.get('access_token');
    if (token) {
      gToken = token;
      localStorage.setItem('forge_gtoken', token);
      window.history.replaceState({}, document.title, window.location.pathname);
      await loadFromDrive();
      if (typeof renderDashboard === 'function') renderDashboard();
      if (typeof renderTodayPage === 'function') renderTodayPage();
    }
  }
}

function connectDrive() {
  const redirectUri = encodeURIComponent(window.location.href.split('?')[0].split('#')[0]);
  const scope = encodeURIComponent(GOOGLE_SCOPES);
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=${scope}`;
  window.location.href = url;
}

async function driveRequest(method, url, body) {
  if (!gToken) return null;
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${gToken}`,
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
    if (res.status === 401) {
      gToken = null;
      localStorage.removeItem('forge_gtoken');
      setSyncStatus('noauth');
      return null;
    }
    return res.ok ? res : null;
  } catch(e) {
    setSyncStatus('offline');
    return null;
  }
}

async function findDriveFile() {
  const res = await driveRequest('GET', `https://www.googleapis.com/drive/v3/files?q=name%3D%22${DRIVE_FILE_NAME}%22%20and%20trashed%3Dfalse&fields=files(id,name)`);
  if (!res) return null;
  const data = await res.json();
  return data.files?.[0]?.id || null;
}

async function loadFromDrive() {
  setSyncStatus('syncing');
  try {
    const fileId = await findDriveFile();
    if (!fileId) {
      // No file yet — save current DB to Drive
      await saveToDrive();
      return;
    }
    gDriveFileId = fileId;
    const res = await driveRequest('GET', `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`);
    if (!res) { setSyncStatus('error'); return; }
    const data = await res.json();
    DB = {
      workouts: [], runs: [], weight: [], nutrition: [], recovery: [], journal: [],
      meta: { startDate: null, weightModalShown: {}, deloadDone: false, awardsUnlocked: {} },
      ...data
    };
    if (!DB.meta) DB.meta = { startDate: null, weightModalShown: {}, deloadDone: false, awardsUnlocked: {} };
    // Also persist to localStorage as cache
    try { localStorage.setItem('forge_v2', JSON.stringify(DB)); } catch(e) {}
    setSyncStatus('synced');
  } catch(e) {
    setSyncStatus('error');
  }
}

async function saveToDrive() {
  if (!gToken) { saveDBLocal(); setSyncStatus('noauth'); return; }
  setSyncStatus('syncing');
  try {
    const content = JSON.stringify(DB, null, 2);
    const blob = new Blob([content], { type: 'application/json' });

    if (!gDriveFileId) gDriveFileId = await findDriveFile();

    if (gDriveFileId) {
      // Update existing file
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify({ name: DRIVE_FILE_NAME })], { type: 'application/json' }));
      form.append('file', blob);
      const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${gDriveFileId}?uploadType=multipart`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${gToken}` },
        body: form
      });
      if (!res.ok) { setSyncStatus('error'); saveDBLocal(); return; }
    } else {
      // Create new file
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify({ name: DRIVE_FILE_NAME, mimeType: 'application/json' })], { type: 'application/json' }));
      form.append('file', blob);
      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${gToken}` },
        body: form
      });
      if (!res.ok) { setSyncStatus('error'); saveDBLocal(); return; }
      const data = await res.json();
      gDriveFileId = data.id;
    }
    saveDBLocal();
    setSyncStatus('synced');
    setTimeout(() => { if (syncStatus === 'synced') setSyncStatus('idle'); }, 3000);
  } catch(e) {
    setSyncStatus('error');
    saveDBLocal();
  }
}

function saveDBLocal() {
  try { localStorage.setItem('forge_v2', JSON.stringify(DB)); } catch(e) {}
}

function saveDB() {
  saveDBLocal();
  // Debounce Drive saves — don't hammer the API on every keystroke
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => saveToDrive(), 1500);
}

function loadDB() {
  try {
    const raw = localStorage.getItem('forge_v2');
    if (raw) {
      const p = JSON.parse(raw);
      DB = {
        workouts: [], runs: [], weight: [], nutrition: [], recovery: [], journal: [],
        meta: { startDate: null, weightModalShown: {}, deloadDone: false, awardsUnlocked: {} },
        ...p
      };
      if (!DB.meta) DB.meta = { startDate: null, weightModalShown: {}, deloadDone: false, awardsUnlocked: {} };
      if (!DB.meta.weightModalShown) DB.meta.weightModalShown = {};
      if (!DB.meta.awardsUnlocked) DB.meta.awardsUnlocked = {};
    }
  } catch(e) {}
}

function exportDB() {
  const blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = `forge-${today()}.json`; a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported');
}

function importDB(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const p = JSON.parse(e.target.result);
      DB = {
        workouts: [], runs: [], weight: [], nutrition: [], recovery: [], journal: [],
        meta: { startDate: null, weightModalShown: {}, deloadDone: false, awardsUnlocked: {} },
        ...p
      };
      saveDB(); location.reload();
    } catch { showToast('Import failed'); }
  };
  reader.readAsText(file);
}

// ── DATE HELPERS ────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().slice(0,10); }
function getDayOfWeek(d) { return new Date(d + 'T12:00:00').getDay(); }
function formatDate(d) { return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' }); }
function formatDateLong(d) { return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' }); }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); }
function startOfWeek() { const d = new Date(); d.setDate(d.getDate() - ((d.getDay()+6)%7)); return d.toISOString().slice(0,10); }
function getWeekDates() {
  const mon = new Date(); mon.setDate(mon.getDate() - ((mon.getDay()+6)%7));
  return Array.from({length:7}, (_,i) => { const d = new Date(mon); d.setDate(d.getDate()+i); return d.toISOString().slice(0,10); });
}

// ── WORKOUT HELPERS ─────────────────────────────────────────────────────────────

function saveWorkoutSet(date, exerciseId, setIndex, weight, reps) {
  let entry = DB.workouts.find(w => w.date===date && w.exerciseId===exerciseId);
  if (!entry) { entry = { date, exerciseId, sets:[] }; DB.workouts.push(entry); }
  entry.sets[setIndex] = { weight: parseFloat(weight)||0, reps: parseInt(reps)||0 };
  saveDB();
}

function getWorkoutEntry(date, exerciseId) {
  return DB.workouts.find(w => w.date===date && w.exerciseId===exerciseId);
}

function getBestSet(exerciseId) {
  let best = null;
  DB.workouts.filter(w => w.exerciseId===exerciseId).forEach(e => {
    e.sets.forEach(s => {
      if (s && s.weight > 0) {
        const vol = s.weight * s.reps;
        if (!best || vol > best.vol) best = { weight:s.weight, reps:s.reps, vol, date:e.date };
      }
    });
  });
  return best;
}

function getExerciseHistory(exerciseId) {
  return DB.workouts
    .filter(w => w.exerciseId===exerciseId && w.sets.some(s => s && s.weight>0))
    .sort((a,b) => a.date.localeCompare(b.date))
    .map(w => {
      const best = w.sets.reduce((b,s) => (!s ? b : (!b || s.weight>b.weight) ? s : b), null);
      return { date:w.date, weight: best?.weight||0, reps: best?.reps||0 };
    });
}

function get1RM(weight, reps) {
  if (!weight || !reps) return 0;
  return Math.round(weight * (1 + reps/30));
}

function getCompletedWorkoutCount(db) {
  const d = db || DB;
  return d.workouts.filter(w => w.sets.some(s => s && s.reps>0)).length;
}

function getTotalKgLifted(db) {
  const d = db || DB;
  return d.workouts.reduce((total, w) => {
    return total + w.sets.reduce((s, set) => s + (set ? (set.weight||0)*(set.reps||0) : 0), 0);
  }, 0);
}

function getTotalSets(db) {
  const d = db || DB;
  return d.workouts.reduce((t, w) => t + w.sets.filter(s => s && s.reps>0).length, 0);
}

function getTotalReps(db) {
  const d = db || DB;
  return d.workouts.reduce((t, w) => t + w.sets.reduce((s, set) => s + (set ? (set.reps||0) : 0), 0), 0);
}

function getTotalRunKm(db) {
  const d = db || DB;
  return d.runs.reduce((t, r) => t + (r.distanceKm||0), 0);
}

function getTotalCaloriesLogged(db) {
  const d = db || DB;
  return d.nutrition.reduce((t, n) => t + (n.kcal||0), 0);
}

function getTotalProteinLogged(db) {
  const d = db || DB;
  return d.nutrition.reduce((t, n) => t + (n.protein||0), 0);
}

function getActiveDays(db) {
  const d = db || DB;
  const days = new Set();
  d.workouts.forEach(w => { if (w.sets.some(s => s && s.reps>0)) days.add(w.date); });
  d.runs.forEach(r => days.add(r.date));
  d.nutrition.forEach(n => days.add(n.date));
  d.journal.forEach(j => days.add(j.date));
  return days.size;
}

// ── OVERLOAD RECOMMENDATION ─────────────────────────────────────────────────────

function getOverloadRec(exerciseId, targetReps) {
  const history = getExerciseHistory(exerciseId);
  if (history.length === 0) return { type:'new', text:'First time — start conservative' };
  const recovery = getTodayRecovery();
  const recoveryScore = calcRecoveryScore(recovery);
  if (recoveryScore < 40) return { type:'deload', text:`Low recovery (${Math.round(recoveryScore)}) — keep it easy` };
  if (history.length < 2) return { type:'hold', text:`${history[0].weight}kg × ${history[0].reps} last session` };
  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  const upper = REP_UPPER[targetReps] || 12;
  if (last.reps >= upper && last.weight > 0) {
    const suggested = last.weight % 2.5 === 0 ? last.weight + 2.5 : Math.ceil(last.weight / 2.5) * 2.5;
    return { type:'push', text:`Push to ${suggested}kg — hit ${last.reps} reps last time` };
  }
  if (last.weight < prev.weight || (last.weight === prev.weight && last.reps < prev.reps - 1)) {
    return { type:'deload', text:`Performance dipped — consolidate at ${last.weight}kg` };
  }
  return { type:'hold', text:`Stay at ${last.weight}kg — build to ${upper} reps` };
}

function calcRecoveryScore(rec) {
  if (!rec) return 100;
  let score = 100;
  if (rec.sleep) score = Math.min(score, (rec.sleep / 8) * 100);
  if (rec.fitbit) score = Math.min(score, rec.fitbit);
  return score;
}

function getTodayRecovery() {
  return DB.recovery.find(r => r.date === today());
}

// ── MUSCLE SCORES ───────────────────────────────────────────────────────────────

function getMuscleScores() {
  const cutoff = daysAgo(28);
  const scores = {};
  ALL_MUSCLES.forEach(m => scores[m] = 0);
  DB.workouts.forEach(entry => {
    if (entry.date < cutoff) return;
    const totalSets = entry.sets.filter(s => s && s.reps>0).length;
    if (!totalSets) return;
    for (const day of Object.values(PLAN)) {
      if (!day.exercises) continue;
      const ex = day.exercises.find(e => e.id===entry.exerciseId);
      if (ex) { ex.muscles.forEach(m => { scores[m] = (scores[m]||0) + totalSets; }); break; }
    }
  });
  const max = 20;
  ALL_MUSCLES.forEach(m => { scores[m] = Math.min(scores[m]/max, 1); });
  return scores;
}

// ── WEEKLY STATS ────────────────────────────────────────────────────────────────

function getWeeklyStats() {
  const weekDates = getWeekDates();
  const trainDays = weekDates.filter(d => [1,2,4,5].includes(getDayOfWeek(d)));
  const sessionsHit = trainDays.filter(d =>
    DB.workouts.some(w => w.date===d && w.sets.some(s => s && s.reps>0))
  ).length;
  const nutDays = weekDates.map(d => DB.nutrition.find(n => n.date===d)).filter(Boolean);
  const avgProtein = nutDays.length ? Math.round(nutDays.reduce((s,n) => s+n.protein, 0) / nutDays.length) : null;
  let streak = 0;
  for (let i=0; i<60; i++) {
    const d = daysAgo(i);
    const dow = getDayOfWeek(d);
    if (![1,2,4,5].includes(dow)) continue;
    if (DB.workouts.some(w => w.date===d && w.sets.some(s => s && s.reps>0))) streak++;
    else break;
  }
  return { sessionsHit, totalTrainDays: trainDays.length, avgProtein, streak };
}

// ── PROTEIN STREAK ──────────────────────────────────────────────────────────────

function getProteinStreak(db) {
  const d = db || DB;
  let streak = 0;
  for (let i=0; i<60; i++) {
    const day = daysAgo(i);
    const nut = d.nutrition.find(n => n.date===day);
    if (nut && nut.protein >= 160) streak++;
    else break;
  }
  return streak;
}

// ── MOMENTUM SCORE ──────────────────────────────────────────────────────────────

function getMomentum() {
  let score = 0;
  const reasons = { good: [], attention: [] };

  // Workout consistency (last 2 weeks) — 35 points
  let trainHit = 0, trainTotal = 0;
  for (let i=0; i<14; i++) {
    const d = daysAgo(i);
    const dow = getDayOfWeek(d);
    if (![1,2,4,5].includes(dow)) continue;
    trainTotal++;
    if (DB.workouts.some(w => w.date===d && w.sets.some(s => s && s.reps>0))) trainHit++;
  }
  const trainPct = trainTotal > 0 ? trainHit/trainTotal : 0;
  score += trainPct * 35;
  if (trainPct >= 0.75) reasons.good.push('Training consistent');
  else if (trainPct < 0.5) reasons.attention.push(`Only ${trainHit}/${trainTotal} sessions hit`);

  // Calorie adherence (last 7 days) — 15 points
  let calHit = 0;
  for (let i=0; i<7; i++) {
    const nut = DB.nutrition.find(n => n.date===daysAgo(i));
    if (nut && nut.kcal >= 2800) calHit++;
  }
  score += (calHit/7) * 15;
  if (calHit >= 5) reasons.good.push('Calories on track');
  else if (calHit < 3) reasons.attention.push('Calories low — eat more');

  // Protein adherence (last 7 days) — 20 points
  let protHit = 0;
  for (let i=0; i<7; i++) {
    const nut = DB.nutrition.find(n => n.date===daysAgo(i));
    if (nut && nut.protein >= 150) protHit++;
  }
  score += (protHit/7) * 20;
  if (protHit >= 5) reasons.good.push('Protein strong');
  else if (protHit < 3) reasons.attention.push(`Protein missed ${7-protHit} days`);

  // Weight trend (last 4 weeks) — 15 points
  const recentWeights = [...DB.weight].sort((a,b) => b.date.localeCompare(a.date)).slice(0,4);
  if (recentWeights.length >= 2) {
    const latest = recentWeights[0].kg;
    const oldest = recentWeights[recentWeights.length-1].kg;
    const gain = latest - oldest;
    if (gain > 0 && gain < 2) { score += 15; reasons.good.push('Weight progressing'); }
    else if (gain >= 2) { score += 8; reasons.attention.push('Weight gaining fast — check calories'); }
    else { score += 5; reasons.attention.push('Weight stalled'); }
  } else {
    score += 8;
  }

  // Logging consistency (last 7 days) — 15 points
  let logDays = 0;
  for (let i=0; i<7; i++) {
    const d = daysAgo(i);
    if (DB.nutrition.some(n => n.date===d) || DB.journal.some(j => j.date===d)) logDays++;
  }
  score += (logDays/7) * 15;
  if (logDays >= 5) reasons.good.push('Logging consistent');
  else if (logDays < 3) reasons.attention.push('Log more consistently');

  return { score: Math.round(Math.min(score, 100)), reasons };
}

// ── DELOAD CHECK ────────────────────────────────────────────────────────────────

function shouldDeload() {
  if (!DB.meta.startDate) return false;
  const start = new Date(DB.meta.startDate + 'T12:00:00');
  const now = new Date();
  const weeks = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000));
  return weeks > 0 && weeks % 7 === 0;
}

// ── AWARDS CHECK ────────────────────────────────────────────────────────────────

function checkAwards() {
  const newlyUnlocked = [];
  AWARDS_DEF.forEach(award => {
    if (!DB.meta.awardsUnlocked[award.id] && award.check(DB)) {
      DB.meta.awardsUnlocked[award.id] = today();
      newlyUnlocked.push(award);
    }
  });
  if (newlyUnlocked.length) {
    saveDB();
    newlyUnlocked.forEach(a => showAwardToast(a));
  }
  return newlyUnlocked;
}

function showAwardToast(award) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.innerHTML = `${award.icon} <strong>${award.name}</strong> unlocked!`;
  t.classList.add('show', 'toast-award');
  setTimeout(() => { t.classList.remove('show', 'toast-award'); }, 4000);
}

// ── REPLAY MY DAY ───────────────────────────────────────────────────────────────

function getReplayData(dateStr) {
  const dow = getDayOfWeek(dateStr);
  const session = PLAN[dow];
  const workoutEntries = DB.workouts.filter(w => w.date===dateStr && w.sets.some(s => s && s.reps>0));
  const run = DB.runs.find(r => r.date===dateStr);
  const weight = DB.weight.find(w => w.date===dateStr);
  const nutrition = DB.nutrition.find(n => n.date===dateStr);
  const journal = DB.journal.find(j => j.date===dateStr);
  const recovery = DB.recovery.find(r => r.date===dateStr);

  // Best lift of the day
  let bestLift = null;
  workoutEntries.forEach(entry => {
    entry.sets.forEach(s => {
      if (s && s.weight > 0) {
        const vol = s.weight * s.reps;
        if (!bestLift || vol > bestLift.vol) {
          const allEx = getAllExercises();
          const ex = allEx.find(e => e.id===entry.exerciseId);
          bestLift = { name: ex?.name || entry.exerciseId, weight: s.weight, reps: s.reps, vol };
        }
      }
    });
  });

  return { session, workoutEntries, run, weight, nutrition, journal, recovery, bestLift, date: dateStr };
}
