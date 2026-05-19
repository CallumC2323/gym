// ── CHART DEFAULTS ──────────────────────────────────────────────────────────────

const CD = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 700, easing: 'easeOutQuart' },
  plugins: {
    legend: { labels: { color: '#98A3B3', font: { family: 'Inter', size: 11 }, boxWidth: 12, padding: 16 } },
    tooltip: {
      backgroundColor: '#171D27',
      borderColor: 'rgba(0,217,255,0.2)',
      borderWidth: 1,
      titleColor: '#F5F7FA',
      bodyColor: '#98A3B3',
      padding: 12,
      cornerRadius: 8,
      titleFont: { family: 'Inter Tight', size: 13, weight: '600' },
      bodyFont: { family: 'JetBrains Mono', size: 12 }
    }
  },
  scales: {
    x: {
      ticks: { color: '#4A5568', font: { family: 'JetBrains Mono', size: 10 } },
      grid: { color: 'rgba(255,255,255,0.03)' },
      border: { color: 'rgba(255,255,255,0.06)' }
    },
    y: {
      ticks: { color: '#4A5568', font: { family: 'JetBrains Mono', size: 10 } },
      grid: { color: 'rgba(255,255,255,0.03)' },
      border: { color: 'rgba(255,255,255,0.06)' }
    }
  }
};

let charts = {};
function destroyChart(key) { if (charts[key]) { charts[key].destroy(); delete charts[key]; } }

// ── PROGRESS PAGE TABS ──────────────────────────────────────────────────────────

function buildProgressTabs() {
  const groups = getAllGroups();
  const tabRow = document.getElementById('progressTabRow');
  const tabPanels = document.getElementById('progressTabPanels');
  if (!tabRow || !tabPanels) return;

  // Build tab buttons
  const allTabs = [...groups, 'Running'];
  tabRow.innerHTML = allTabs.map((g, i) =>
    `<button class="tab-btn${i===0?' active':''}" data-group="${g}">${g}</button>`
  ).join('');

  // Build panels
  tabPanels.innerHTML = allTabs.map((g, i) => {
    if (g === 'Running') {
      return `<div class="tab-panel${i===0?' active':''}" data-panel="Running">
        <div class="chart-wrap"><canvas id="runChart"></canvas></div>
      </div>`;
    }
    const exes = getExercisesByGroup(g);
    const chartsHtml = exes.map(ex =>
      `<div class="chart-wrap" style="margin-bottom:1.25rem">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem">
          <span style="font-family:'Inter Tight',sans-serif;font-size:14px;font-weight:600;color:var(--text)">${ex.name}</span>
          <span style="font-size:11px;color:var(--text3);font-family:'JetBrains Mono',monospace">${ex.sets} × ${ex.reps}</span>
        </div>
        <canvas id="chart_${ex.id}"></canvas>
      </div>`
    ).join('');
    return `<div class="tab-panel${i===0?' active':''}" data-panel="${g}">${chartsHtml}</div>`;
  }).join('');

  // Tab click handler
  tabRow.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tabRow.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      tabPanels.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const panel = tabPanels.querySelector(`[data-panel="${btn.dataset.group}"]`);
      if (panel) panel.classList.add('active');
      renderActiveTabCharts(btn.dataset.group);
    });
  });

  // Render first tab
  renderActiveTabCharts(allTabs[0]);
}

function renderActiveTabCharts(group) {
  if (group === 'Running') {
    renderRunChart();
    return;
  }
  const exes = getExercisesByGroup(group);
  exes.forEach(ex => renderExerciseChart(ex));
}

function renderExerciseChart(ex) {
  const history = getExerciseHistory(ex.id);
  const key = 'ex_' + ex.id;
  destroyChart(key);
  const canvas = document.getElementById('chart_' + ex.id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  charts[key] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: history.length ? history.map(h => formatDate(h.date)) : ['No data yet'],
      datasets: [
        {
          label: 'Top weight (kg)',
          data: history.map(h => h.weight),
          borderColor: '#00D9FF',
          backgroundColor: 'rgba(0,217,255,0.05)',
          pointBackgroundColor: '#00D9FF',
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: true
        },
        {
          label: 'Est. 1RM',
          data: history.map(h => get1RM(h.weight, h.reps)),
          borderColor: 'rgba(185,255,102,0.5)',
          backgroundColor: 'transparent',
          pointBackgroundColor: '#B9FF66',
          pointRadius: 3,
          tension: 0.4,
          borderDash: [4,3]
        }
      ]
    },
    options: { ...CD }
  });
}

// ── RUN CHART ───────────────────────────────────────────────────────────────────

function renderRunChart() {
  const runs = [...DB.runs].sort((a,b) => a.date.localeCompare(b.date)).slice(-20);
  destroyChart('run');
  const ctx = document.getElementById('runChart')?.getContext('2d');
  if (!ctx) return;
  charts.run = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: runs.map(r => formatDate(r.date)),
      datasets: [
        { label: 'Distance (km)', data: runs.map(r => r.distanceKm), backgroundColor: 'rgba(185,255,102,0.35)', borderColor: '#B9FF66', borderWidth: 1, yAxisID: 'y', borderRadius: 4 },
        { label: 'Duration (min)', data: runs.map(r => r.durationMin), type: 'line', borderColor: '#00D9FF', backgroundColor: 'rgba(0,217,255,0.05)', pointBackgroundColor: '#00D9FF', pointRadius: 4, tension: 0.4, yAxisID: 'y1' }
      ]
    },
    options: {
      ...CD,
      scales: {
        x: CD.scales.x,
        y: { ...CD.scales.y, position: 'left' },
        y1: { ...CD.scales.y, position: 'right', grid: { drawOnChartArea: false } }
      }
    }
  });
}

// ── WEIGHT CHART ────────────────────────────────────────────────────────────────

function renderWeightChart() {
  const data = [...DB.weight].sort((a,b) => a.date.localeCompare(b.date));
  destroyChart('weight');
  const ctx = document.getElementById('weightChart')?.getContext('2d');
  if (!ctx) return;
  charts.weight = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(w => formatDate(w.date)),
      datasets: [
        {
          label: 'Weight (kg)',
          data: data.map(w => w.kg),
          borderColor: '#00D9FF',
          backgroundColor: 'rgba(0,217,255,0.06)',
          pointBackgroundColor: '#00D9FF',
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.4,
          fill: true
        },
        {
          label: 'Goal (90kg)',
          data: data.map(() => 90),
          borderColor: 'rgba(255,90,90,0.25)',
          borderDash: [6,4],
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: { ...CD }
  });
}

// ── NUTRITION CHART ─────────────────────────────────────────────────────────────

function renderNutritionChart() {
  const data = [...DB.nutrition].sort((a,b) => a.date.localeCompare(b.date)).slice(-30);
  destroyChart('nutrition');
  const ctx = document.getElementById('nutritionChart')?.getContext('2d');
  if (!ctx) return;
  charts.nutrition = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(n => formatDate(n.date)),
      datasets: [
        { label: 'Calories', data: data.map(n => n.kcal), backgroundColor: 'rgba(0,217,255,0.3)', borderColor: '#00D9FF', borderWidth: 1, yAxisID: 'y', borderRadius: 4 },
        { label: 'Protein (g)', data: data.map(n => n.protein), type: 'line', borderColor: '#3DDC97', backgroundColor: 'rgba(61,220,151,0.06)', pointBackgroundColor: '#3DDC97', pointRadius: 4, tension: 0.4, yAxisID: 'y1' }
      ]
    },
    options: {
      ...CD,
      scales: {
        x: CD.scales.x,
        y: { ...CD.scales.y, position: 'left' },
        y1: { ...CD.scales.y, position: 'right', grid: { drawOnChartArea: false } }
      }
    }
  });
}

// ── MOMENTUM DIAL ───────────────────────────────────────────────────────────────

function renderMomentumDial(score) {
  const canvas = document.getElementById('momentumDial');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width = 220;
  const h = canvas.height = 130;
  ctx.clearRect(0, 0, w, h);

  const cx = w/2, cy = h - 10;
  const r = 90;
  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;
  const scoreAngle = startAngle + (score/100) * Math.PI;

  // Background arc
  ctx.beginPath();
  ctx.arc(cx, cy, r, startAngle, endAngle);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Score arc
  if (score > 0) {
    const grad = ctx.createLinearGradient(cx-r, cy, cx+r, cy);
    grad.addColorStop(0, '#B9FF66');
    grad.addColorStop(1, '#00D9FF');
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, scoreAngle);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Glow
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, scoreAngle);
    ctx.strokeStyle = 'rgba(0,217,255,0.15)';
    ctx.lineWidth = 20;
    ctx.stroke();
  }

  // Needle
  const needleAngle = scoreAngle;
  const nx = cx + (r) * Math.cos(needleAngle);
  const ny = cy + (r) * Math.sin(needleAngle);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(nx, ny);
  ctx.strokeStyle = '#F5F7FA';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Center dot
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, 2*Math.PI);
  ctx.fillStyle = '#00D9FF';
  ctx.fill();
}
