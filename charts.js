const CD = {
  responsive: true, maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color:'#9090a0', font:{ family:'DM Sans', size:12 } } },
    tooltip: { backgroundColor:'#1e1e21', borderColor:'rgba(255,255,255,0.1)', borderWidth:1, titleColor:'#f0f0f2', bodyColor:'#9090a0', padding:10 }
  },
  scales: {
    x: { ticks:{ color:'#606070', font:{ family:'DM Sans', size:11 } }, grid:{ color:'rgba(255,255,255,0.04)' } },
    y: { ticks:{ color:'#606070', font:{ family:'DM Sans', size:11 } }, grid:{ color:'rgba(255,255,255,0.04)' } }
  }
};

let charts = {};

function destroyChart(key) { if (charts[key]) { charts[key].destroy(); delete charts[key]; } }

function buildExerciseFilter() {
  const sel = document.getElementById('exerciseFilter');
  const all = [];
  Object.values(PLAN).forEach(day => { if (day.exercises) day.exercises.forEach(e => { if (!all.find(x => x.id===e.id)) all.push(e); }); });
  sel.innerHTML = all.map(e => `<option value="${e.id}">${e.name}</option>`).join('');
  sel.addEventListener('change', () => { renderProgressChart(sel.value); renderRatioChart(sel.value); });
  if (all[0]) { renderProgressChart(all[0].id); renderRatioChart(all[0].id); }
}

function renderProgressChart(exerciseId) {
  const history = getExerciseHistory(exerciseId);
  destroyChart('progress');
  const ctx = document.getElementById('progressChart').getContext('2d');
  charts.progress = new Chart(ctx, {
    type: 'line',
    data: {
      labels: history.length ? history.map(h => formatDate(h.date)) : ['No data'],
      datasets: [
        {
          label: 'Top weight (kg)',
          data: history.map(h => h.weight),
          borderColor:'#e8ff47', backgroundColor:'rgba(232,255,71,0.07)',
          pointBackgroundColor:'#e8ff47', tension:0.3, fill:true
        },
        {
          label: 'Est. 1RM',
          data: history.map(h => get1RM(h.weight, h.reps)),
          borderColor:'rgba(77,168,255,0.6)', backgroundColor:'transparent',
          pointBackgroundColor:'#4da8ff', tension:0.3, borderDash:[4,3]
        }
      ]
    },
    options: { ...CD }
  });
}

function renderRatioChart(exerciseId) {
  const history = getExerciseHistory(exerciseId);
  destroyChart('ratio');
  const ctx = document.getElementById('ratioChart').getContext('2d');
  const ratioData = history.map(h => {
    const w = DB.weight.filter(wt => wt.date <= h.date).sort((a,b) => b.date.localeCompare(a.date))[0];
    return w ? parseFloat((h.weight / w.kg).toFixed(3)) : null;
  }).filter(Boolean);
  const labels = history.filter((h,i) => {
    const w = DB.weight.filter(wt => wt.date <= h.date)[0];
    return !!w;
  }).map(h => formatDate(h.date));

  charts.ratio = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels.length ? labels : ['Log weight to see ratio'],
      datasets: [{
        label: 'Strength / bodyweight',
        data: ratioData,
        borderColor:'#4dffaa', backgroundColor:'rgba(77,255,170,0.07)',
        pointBackgroundColor:'#4dffaa', tension:0.3, fill:true
      }]
    },
    options: { ...CD }
  });
}

function renderRunChart() {
  const runs = [...DB.runs].sort((a,b) => a.date.localeCompare(b.date)).slice(-20);
  destroyChart('run');
  const ctx = document.getElementById('runChart').getContext('2d');
  charts.run = new Chart(ctx, {
    type:'bar',
    data: {
      labels: runs.map(r => formatDate(r.date)),
      datasets: [
        { label:'Distance (km)', data:runs.map(r=>r.distanceKm), backgroundColor:'rgba(77,168,255,0.5)', borderColor:'#4da8ff', borderWidth:1, yAxisID:'y' },
        { label:'Duration (min)', data:runs.map(r=>r.durationMin), type:'line', borderColor:'#4dffaa', backgroundColor:'rgba(77,255,170,0.07)', pointBackgroundColor:'#4dffaa', tension:0.3, yAxisID:'y1' }
      ]
    },
    options: { ...CD, scales: { ...CD.scales, y:{ ...CD.scales.y, position:'left' }, y1:{ ...CD.scales.y, position:'right', grid:{ drawOnChartArea:false } } } }
  });
}

function renderWeightChart() {
  const data = [...DB.weight].sort((a,b) => a.date.localeCompare(b.date));
  destroyChart('weight');
  const ctx = document.getElementById('weightChart').getContext('2d');
  charts.weight = new Chart(ctx, {
    type:'line',
    data: {
      labels: data.map(w => formatDate(w.date)),
      datasets: [
        { label:'Weight (kg)', data:data.map(w=>w.kg), borderColor:'#e8ff47', backgroundColor:'rgba(232,255,71,0.07)', pointBackgroundColor:'#e8ff47', tension:0.3, fill:true },
        { label:'Target (90kg)', data:data.map(()=>90), borderColor:'rgba(255,90,90,0.3)', borderDash:[6,4], pointRadius:0, fill:false }
      ]
    },
    options: { ...CD }
  });
}

function renderNutritionChart() {
  const data = [...DB.nutrition].sort((a,b) => a.date.localeCompare(b.date)).slice(-30);
  destroyChart('nutrition');
  const ctx = document.getElementById('nutritionChart').getContext('2d');
  charts.nutrition = new Chart(ctx, {
    type:'bar',
    data: {
      labels: data.map(n => formatDate(n.date)),
      datasets: [
        { label:'Calories', data:data.map(n=>n.kcal), backgroundColor:'rgba(232,255,71,0.45)', borderColor:'#e8ff47', borderWidth:1, yAxisID:'y' },
        { label:'Protein (g)', data:data.map(n=>n.protein), type:'line', borderColor:'#4dffaa', backgroundColor:'rgba(77,255,170,0.07)', pointBackgroundColor:'#4dffaa', tension:0.3, yAxisID:'y1' }
      ]
    },
    options: { ...CD, scales: { ...CD.scales, y:{ ...CD.scales.y, position:'left' }, y1:{ ...CD.scales.y, position:'right', grid:{ drawOnChartArea:false } } } }
  });
}
