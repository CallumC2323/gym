// ── TRAINING PLAN ───────────────────────────────────────────────────────────────

const PLAN = {
  0: { type: 'rest', label: 'Rest Day' },
  1: {
    type: 'upper', label: 'Upper A', focus: 'Strength',
    exercises: [
      { id: 'incline_db_press',   name: 'Incline DB Press',          sets: 4, reps: '6–8',   muscles: ['chest','front_delt'] },
      { id: 'seated_cable_row',   name: 'Seated Cable Row',          sets: 4, reps: '8–10',  muscles: ['mid_back','rear_delt','biceps'] },
      { id: 'db_shoulder_press',  name: 'Seated DB Shoulder Press',  sets: 3, reps: '8–10',  muscles: ['front_delt','side_delt'] },
      { id: 'lat_pulldown',       name: 'Lat Pulldown',              sets: 3, reps: '10–12', muscles: ['lats','biceps'] },
      { id: 'ez_bar_curl',        name: 'EZ Bar Curl',               sets: 3, reps: '10–12', muscles: ['biceps'] },
      { id: 'overhead_tri_ext',   name: 'Overhead Tricep Extension', sets: 3, reps: '10–12', muscles: ['triceps'] },
    ]
  },
  2: {
    type: 'lower', label: 'Lower A', focus: 'Strength',
    exercises: [
      { id: 'barbell_squat',      name: 'Barbell Back Squat',        sets: 4, reps: '6–8',   muscles: ['quads','glutes'] },
      { id: 'romanian_dl',        name: 'Romanian Deadlift',         sets: 3, reps: '8–10',  muscles: ['hamstrings','glutes','lower_back'] },
      { id: 'leg_press_a',        name: 'Leg Press',                 sets: 3, reps: '10–12', muscles: ['quads','glutes'] },
      { id: 'leg_curl_a',         name: 'Leg Curl',                  sets: 3, reps: '10–12', muscles: ['hamstrings'] },
      { id: 'standing_calf',      name: 'Standing Calf Raise',       sets: 4, reps: '12–15', muscles: ['calves'] },
    ]
  },
  3: { type: 'run', label: 'Run Day' },
  4: {
    type: 'upper', label: 'Upper B', focus: 'Hypertrophy',
    exercises: [
      { id: 'incline_db_press_b', name: 'Incline DB Press',          sets: 4, reps: '10–12', muscles: ['chest','front_delt'] },
      { id: 'cable_chest_fly',    name: 'Cable Chest Fly',           sets: 3, reps: '12–15', muscles: ['chest'] },
      { id: 'cs_db_row',          name: 'Chest-Supported DB Row',    sets: 4, reps: '10–12', muscles: ['mid_back','rear_delt'] },
      { id: 'rev_pec_deck',       name: 'Reverse Pec Deck',          sets: 3, reps: '15–20', muscles: ['rear_delt'] },
      { id: 'db_lateral_raise',   name: 'DB Lateral Raise',          sets: 4, reps: '12–15', muscles: ['side_delt'] },
      { id: 'hammer_curl',        name: 'Hammer Curl',               sets: 3, reps: '10–12', muscles: ['biceps'] },
      { id: 'tri_pushdown',       name: 'Tricep Pushdown',           sets: 3, reps: '12–15', muscles: ['triceps'] },
    ]
  },
  5: {
    type: 'lower', label: 'Lower B', focus: 'Hypertrophy',
    exercises: [
      { id: 'leg_press_b',        name: 'Leg Press',                 sets: 4, reps: '10–12', muscles: ['quads','glutes'] },
      { id: 'bulgarian_split',    name: 'Bulgarian Split Squat',     sets: 3, reps: '10–12', muscles: ['quads','glutes'] },
      { id: 'lying_leg_curl',     name: 'Lying Leg Curl',            sets: 4, reps: '10–12', muscles: ['hamstrings'] },
      { id: 'hip_thrust',         name: 'Hip Thrust',                sets: 3, reps: '12–15', muscles: ['glutes','hamstrings'] },
      { id: 'seated_calf',        name: 'Seated Calf Raise',         sets: 4, reps: '12–15', muscles: ['calves'] },
    ]
  },
  6: { type: 'run', label: 'Run Day (Optional)' }
};

const ALL_MUSCLES = ['chest','front_delt','side_delt','rear_delt','lats','mid_back','lower_back','biceps','triceps','quads','hamstrings','glutes','calves'];

// Rep range upper bounds for overload logic
const REP_UPPER = { '6–8':8, '8–10':10, '10–12':12, '12–15':15, '15–20':20 };

// ── DATABASE ────────────────────────────────────────────────────────────────────

let DB = {
  workouts: [],   // { date, exerciseId, sets: [{weight, reps}] }
  runs: [],       // { date, distanceKm, durationMin, notes }
  weight: [],     // { date, kg, notes }
  nutrition: [],  // { date, kcal, protein, notes }
  recovery: [],   // { date, sleep, fitbit }
  journal: [],    // { date, text }
  meta: { startDate: null, weightModalShown: {} }
};

function saveDB() { try { localStorage.setItem('forge_v2', JSON.stringify(DB)); } catch(e) {} }

function loadDB() {
  try {
    const raw = localStorage.getItem('forge_v2');
    if (raw) {
      const p = JSON.parse(raw);
      DB = { workouts:[], runs:[], weight:[], nutrition:[], recovery:[], journal:[], meta:{ startDate:null, weightModalShown:{} }, ...p };
      if (!DB.meta) DB.meta = { startDate: null, weightModalShown: {} };
      if (!DB.meta.weightModalShown) DB.meta.weightModalShown = {};
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
      DB = { workouts:[], runs:[], weight:[], nutrition:[], recovery:[], journal:[], meta:{ startDate:null, weightModalShown:{} }, ...p };
      saveDB(); location.reload();
    } catch { showToast('Import failed'); }
  };
  reader.readAsText(file);
}

// ── DATE HELPERS ────────────────────────────────────────────────────────────────

function today() { return new Date().toISOString().slice(0,10); }
function getDayOfWeek(d) { return new Date(d + 'T12:00:00').getDay(); }
function formatDate(d) { return new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' }); }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); }
function startOfWeek() { const d = new Date(); d.setDate(d.getDate() - d.getDay() + 1); return d.toISOString().slice(0,10); } // Monday

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

// ── OVERLOAD RECOMMENDATION ─────────────────────────────────────────────────────

function getOverloadRec(exerciseId, targetReps) {
  const history = getExerciseHistory(exerciseId);
  if (history.length === 0) return { type:'new', text:'First time — start conservative' };

  const recovery = getTodayRecovery();
  const recoveryScore = calcRecoveryScore(recovery);

  // Low recovery override
  if (recoveryScore < 40) return { type:'deload', text:`Low recovery (${Math.round(recoveryScore)}) — keep it easy today` };

  if (history.length < 2) return { type:'hold', text:`${history[0].weight}kg × ${history[0].reps} last session` };

  const last = history[history.length - 1];
  const prev = history[history.length - 2];
  const upper = REP_UPPER[targetReps] || 12;

  // Hit top of rep range last session
  if (last.reps >= upper && last.weight > 0) {
    const suggested = last.weight % 2.5 === 0 ? last.weight + 2.5 : Math.ceil(last.weight / 2.5) * 2.5;
    return { type:'push', text:`Push to ${suggested}kg — you hit ${last.reps} reps last time` };
  }

  // Performance dropped vs previous
  if (last.weight < prev.weight || (last.weight === prev.weight && last.reps < prev.reps - 1)) {
    return { type:'deload', text:`Performance dipped — consolidate at ${last.weight}kg` };
  }

  return { type:'hold', text:`Stay at ${last.weight}kg — build reps to ${upper}` };
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
  const trainDays = weekDates.filter(d => {
    const dow = getDayOfWeek(d);
    return [1,2,4,5].includes(dow);
  });

  const sessionsHit = trainDays.filter(d =>
    DB.workouts.some(w => w.date===d && w.sets.some(s => s && s.reps>0))
  ).length;

  const nutDays = weekDates.map(d => DB.nutrition.find(n => n.date===d)).filter(Boolean);
  const avgProtein = nutDays.length ? Math.round(nutDays.reduce((s,n) => s+n.protein, 0) / nutDays.length) : null;

  // Streak — consecutive training days hit
  let streak = 0;
  for (let i=0; i<30; i++) {
    const d = daysAgo(i);
    const dow = getDayOfWeek(d);
    if (![1,2,4,5].includes(dow)) continue;
    if (DB.workouts.some(w => w.date===d && w.sets.some(s => s && s.reps>0))) streak++;
    else break;
  }

  return { sessionsHit, totalTrainDays: trainDays.length, avgProtein, streak };
}

// ── DELOAD CHECK ────────────────────────────────────────────────────────────────

function shouldDeload() {
  if (!DB.meta.startDate) return false;
  const start = new Date(DB.meta.startDate + 'T12:00:00');
  const now = new Date();
  const weeks = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000));
  return weeks > 0 && weeks % 7 === 0;
}
