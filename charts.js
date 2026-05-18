// ── CHART DEFAULTS ──────────────────────────────────────────────────────────────

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#9090a0', font: { family: 'DM Sans', size: 12 } } },
    tooltip: {
      backgroundColor: '#1e1e21',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      titleColor: '#f0f0f2',
      bodyColor: '#9090a0',
      padding: 10
    }
  },
  scales: {
    x: {
      ticks: { color: '#606070', font: { family: 'DM Sans', size: 11 } },
      grid: { color: 'rgba(255,255,255,0.04)' }
    },
    y: {
      ticks: { color: '#606070', font: { family: 'DM Sans', size: 11 } },
      grid: { color: 'rgba(255,255,255,0.04)' }
    }
  }
};

let progressChartInst = null;
let runChartInst = null;
let weightChartInst = null;
let nutritionChartInst = null;

// ── EXERCISE PROGRESS CHART ─────────────────────────────────────────────────────

function buildExerciseFilter() {
  const sel = document.getElementById('exerciseFilter');
  const allExercises = [];
  Object.values(PLAN).forEach(day => {
    if (day.exercises) day.exercises.forEach(e => {
      if (!allExercises.find(x => x.id === e.id)) allExercises.push(e);
    });
  });
  sel.innerHTML = allExercises.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
  sel.addEventListener('change', () => renderProgressChart(sel.value));
  renderProgressChart(allExercises[0]?.id);
}

function renderProgressChart(exerciseId) {
  const history = getExerciseHistory(exerciseId);
  const ctx = document.getElementById('progressChart').getContext('2d');
  if (progressChartInst) progressChartInst.destroy();

  if (history.length === 0) {
    progressChartInst = new Chart(ctx, {
      type: 'line',
      data: { labels: ['No data yet'], datasets: [{ data: [], label: 'Weight (kg)', borderColor: '#e8ff47' }] },
      options: { ...CHART_DEFAULTS }
    });
    return;
  }

  progressChartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels: history.map(h => formatDate(h.date)),
      datasets: [{
        label: 'Top weight (kg)',
        data: history.map(h => h.weight),
        borderColor: '#e8ff47',
        backgroundColor: 'rgba(232,255,71,0.08)',
        pointBackgroundColor: '#e8ff47',
        tension: 0.3,
        fill: true
      }]
    },
    options: { ...CHART_DEFAULTS }
  });
}

// ── RUN CHART ───────────────────────────────────────────────────────────────────

function renderRunChart() {
  const runs = [...DB.runs].sort((a, b) => a.date.localeCompare(b.date)).slice(-20);
  const ctx = document.getElementById('runChart').getContext('2d');
  if (runChartInst) runChartInst.destroy();

  runChartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: runs.map(r => formatDate(r.date)),
      datasets: [
        {
          label: 'Distance (km)',
          data: runs.map(r => r.distanceKm),
          backgroundColor: 'rgba(77,168,255,0.6)',
          borderColor: '#4da8ff',
          borderWidth: 1,
          yAxisID: 'y'
        },
        {
          label: 'Duration (min)',
          data: runs.map(r => r.durationMin),
          type: 'line',
          borderColor: '#4dffaa',
          backgroundColor: 'rgba(77,255,170,0.08)',
          pointBackgroundColor: '#4dffaa',
          tension: 0.3,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        ...CHART_DEFAULTS.scales,
        y: { ...CHART_DEFAULTS.scales.y, position: 'left', title: { display: true, text: 'km', color: '#9090a0' } },
        y1: { ...CHART_DEFAULTS.scales.y, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'min', color: '#9090a0' } }
      }
    }
  });
}

// ── WEIGHT CHART ────────────────────────────────────────────────────────────────

function renderWeightChart() {
  const data = [...DB.weight].sort((a, b) => a.date.localeCompare(b.date));
  const ctx = document.getElementById('weightChart').getContext('2d');
  if (weightChartInst) weightChartInst.destroy();

  weightChartInst = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(w => formatDate(w.date)),
      datasets: [
        {
          label: 'Weight (kg)',
          data: data.map(w => w.kg),
          borderColor: '#e8ff47',
          backgroundColor: 'rgba(232,255,71,0.08)',
          pointBackgroundColor: '#e8ff47',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Target (90kg)',
          data: data.map(() => 90),
          borderColor: 'rgba(255,90,90,0.3)',
          borderDash: [6,4],
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: { ...CHART_DEFAULTS }
  });
}

// ── NUTRITION CHART ─────────────────────────────────────────────────────────────

function renderNutritionChart() {
  const data = [...DB.nutrition].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  const ctx = document.getElementById('nutritionChart').getContext('2d');
  if (nutritionChartInst) nutritionChartInst.destroy();

  nutritionChartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(n => formatDate(n.date)),
      datasets: [
        {
          label: 'Calories',
          data: data.map(n => n.kcal),
          backgroundColor: 'rgba(232,255,71,0.5)',
          borderColor: '#e8ff47',
          borderWidth: 1,
          yAxisID: 'y'
        },
        {
          label: 'Protein (g)',
          data: data.map(n => n.protein),
          type: 'line',
          borderColor: '#4dffaa',
          backgroundColor: 'rgba(77,255,170,0.08)',
          pointBackgroundColor: '#4dffaa',
          tension: 0.3,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        ...CHART_DEFAULTS.scales,
        y: { ...CHART_DEFAULTS.scales.y, position: 'left', title: { display: true, text: 'kcal', color: '#9090a0' } },
        y1: { ...CHART_DEFAULTS.scales.y, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'protein g', color: '#9090a0' } }
      }
    }
  });
}
