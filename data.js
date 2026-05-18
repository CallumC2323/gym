// ── TRAINING PLAN ──────────────────────────────────────────────────────────────

const PLAN = {
  0: { // Sunday
    type: 'rest',
    label: 'Rest Day'
  },
  1: { // Monday
    type: 'upper',
    label: 'Upper A — Strength',
    focus: 'Strength',
    exercises: [
      { id: 'incline_db_press',    name: 'Incline DB Press',            sets: 4, reps: '6–8',   muscles: ['chest','front_delt'] },
      { id: 'seated_cable_row',    name: 'Seated Cable Row',            sets: 4, reps: '8–10',  muscles: ['mid_back','rear_delt','biceps'] },
      { id: 'db_shoulder_press',   name: 'Seated DB Shoulder Press',    sets: 3, reps: '8–10',  muscles: ['front_delt','side_delt'] },
      { id: 'lat_pulldown',        name: 'Lat Pulldown',                sets: 3, reps: '10–12', muscles: ['lats','biceps'] },
      { id: 'ez_bar_curl',         name: 'EZ Bar Curl',                 sets: 3, reps: '10–12', muscles: ['biceps'] },
      { id: 'overhead_tri_ext',    name: 'Overhead Tricep Extension',   sets: 3, reps: '10–12', muscles: ['triceps'] },
    ]
  },
  2: { // Tuesday
    type: 'lower',
    label: 'Lower A — Strength',
    focus: 'Strength',
    exercises: [
      { id: 'barbell_squat',       name: 'Barbell Back Squat',          sets: 4, reps: '6–8',   muscles: ['quads','glutes'] },
      { id: 'romanian_dl',         name: 'Romanian Deadlift',           sets: 3, reps: '8–10',  muscles: ['hamstrings','glutes','lower_back'] },
      { id: 'leg_press_a',         name: 'Leg Press',                   sets: 3, reps: '10–12', muscles: ['quads','glutes'] },
      { id: 'leg_curl_a',          name: 'Leg Curl',                    sets: 3, reps: '10–12', muscles: ['hamstrings'] },
      { id: 'standing_calf',       name: 'Standing Calf Raise',         sets: 4, reps: '12–15', muscles: ['calves'] },
    ]
  },
  3: { // Wednesday
    type: 'run',
    label: 'Run Day'
  },
  4: { // Thursday
    type: 'upper',
    label: 'Upper B — Hypertrophy',
    focus: 'Hypertrophy',
    exercises: [
      { id: 'incline_db_press_b',  name: 'Incline DB Press',            sets: 4, reps: '10–12', muscles: ['chest','front_delt'] },
      { id: 'cable_chest_fly',     name: 'Cable Chest Fly',             sets: 3, reps: '12–15', muscles: ['chest'] },
      { id: 'cs_db_row',           name: 'Chest-Supported DB Row',      sets: 4, reps: '10–12', muscles: ['mid_back','rear_delt'] },
      { id: 'rev_pec_deck',        name: 'Reverse Pec Deck',            sets: 3, reps: '15–20', muscles: ['rear_delt'] },
      { id: 'db_lateral_raise',    name: 'DB Lateral Raise',            sets: 4, reps: '12–15', muscles: ['side_delt'] },
      { id: 'hammer_curl',         name: 'Hammer Curl',                 sets: 3, reps: '10–12', muscles: ['biceps'] },
      { id: 'tri_pushdown',        name: 'Tricep Pushdown',             sets: 3, reps: '12–15', muscles: ['triceps'] },
    ]
  },
  5: { // Friday
    type: 'lower',
    label: 'Lower B — Hypertrophy',
    focus: 'Hypertrophy',
    exercises: [
      { id: 'leg_press_b',         name: 'Leg Press',                   sets: 4, reps: '10–12', muscles: ['quads','glutes'] },
      { id: 'bulgarian_split',     name: 'Bulgarian Split Squat',       sets: 3, reps: '10–12', muscles: ['quads','glutes'] },
      { id: 'lying_leg_curl',      name: 'Lying Leg Curl',              sets: 4, reps: '10–12', muscles: ['hamstrings'] },
      { id: 'hip_thrust',          name: 'Hip Thrust',                  sets: 3, reps: '12–15', muscles: ['glutes','hamstrings'] },
      { id: 'seated_calf',         name: 'Seated Calf Raise',           sets: 4, reps: '12–15', muscles: ['calves'] },
    ]
  },
  6: { // Saturday
    type: 'run',
    label: 'Run Day (Optional)'
  }
};

// Muscle groups for body map scoring
const ALL_MUSCLES = ['chest','front_delt','side_delt','rear_delt','lats','mid_back','lower_back','biceps','triceps','quads','hamstrings','glutes','calves'];

// ── DATA STORE ──────────────────────────────────────────────────────────────────

let DB = {
  workouts: [],   // { date, exerciseId, sets: [{weight, reps}] }
  runs: [],       // { date, distanceKm, durationMin, notes }
  weight: [],     // { date, kg, notes }
  nutrition: [],  // { date, kcal, protein, notes }
};

function saveDB() {
  try { localStorage.setItem('forge_db', JSON.stringify(DB)); } catch(e) {}
}

function loadDB() {
  try {
    const raw = localStorage.getItem('forge_db');
    if (raw) {
      const parsed = JSON.parse(raw);
      DB = { workouts: [], runs: [], weight: [], nutrition: [], ...parsed };
    }
  } catch(e) {}
}

function exportDB() {
  const blob = new Blob([JSON.stringify(DB, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `forge-data-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Data exported');
}

function importDB(file) {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const parsed = JSON.parse(e.target.result);
      DB = { workouts: [], runs: [], weight: [], nutrition: [], ...parsed };
      saveDB();
      location.reload();
    } catch(err) {
      showToast('Import failed — invalid file');
    }
  };
  reader.readAsText(file);
}

// ── DATE HELPERS ────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0,10);
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function getDayOfWeek(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.getDay();
}

function weeksAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n * 7);
  return d.toISOString().slice(0,10);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0,10);
}

// ── WORKOUT DATA ────────────────────────────────────────────────────────────────

function saveWorkoutSet(date, exerciseId, setIndex, weight, reps) {
  let entry = DB.workouts.find(w => w.date === date && w.exerciseId === exerciseId);
  if (!entry) {
    entry = { date, exerciseId, sets: [] };
    DB.workouts.push(entry);
  }
  entry.sets[setIndex] = { weight: parseFloat(weight) || 0, reps: parseInt(reps) || 0 };
  saveDB();
}

function getWorkoutEntry(date, exerciseId) {
  return DB.workouts.find(w => w.date === date && w.exerciseId === exerciseId);
}

function getBestSet(exerciseId) {
  const entries = DB.workouts.filter(w => w.exerciseId === exerciseId);
  let best = null;
  entries.forEach(e => {
    e.sets.forEach(s => {
      if (s && s.weight > 0) {
        const vol = s.weight * s.reps;
        if (!best || vol > best.vol) best = { weight: s.weight, reps: s.reps, vol, date: e.date };
      }
    });
  });
  return best;
}

function getExerciseHistory(exerciseId) {
  return DB.workouts
    .filter(w => w.exerciseId === exerciseId && w.sets.some(s => s && s.weight > 0))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(w => {
      const best = w.sets.reduce((b, s) => {
        if (!s) return b;
        return (!b || s.weight > b.weight) ? s : b;
      }, null);
      return { date: w.date, weight: best ? best.weight : 0, reps: best ? best.reps : 0 };
    });
}

// ── MUSCLE VOLUME SCORE ─────────────────────────────────────────────────────────

function getMuscleScores() {
  const cutoff = daysAgo(28);
  const scores = {};
  ALL_MUSCLES.forEach(m => scores[m] = 0);

  DB.workouts.forEach(entry => {
    if (entry.date < cutoff) return;
    const totalSets = entry.sets.filter(s => s && s.reps > 0).length;
    if (totalSets === 0) return;

    // Find which muscles this exercise hits
    for (const day of Object.values(PLAN)) {
      if (!day.exercises) continue;
      const ex = day.exercises.find(e => e.id === entry.exerciseId);
      if (ex) {
        ex.muscles.forEach(m => {
          scores[m] = (scores[m] || 0) + totalSets;
        });
        break;
      }
    }
  });

  // Normalise 0-1 (max ~20 sets/muscle over 4 weeks = well trained)
  const max = 20;
  ALL_MUSCLES.forEach(m => {
    scores[m] = Math.min(scores[m] / max, 1);
  });

  return scores;
}
