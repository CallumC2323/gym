// ── BODY MAP ────────────────────────────────────────────────────────────────────
// Simple anatomical SVG outlines — front and back views

function muscleColor(score) {
  if (score <= 0) return '#1e1e21';
  // Interpolate from dark grey → yellow-green (accent)
  const r = Math.round(30 + score * (232 - 30));
  const g = Math.round(30 + score * (255 - 30));
  const b = Math.round(33 + score * (71 - 33));
  return `rgb(${r},${g},${b})`;
}

function muscleStroke(score) {
  return score > 0.1 ? 'rgba(232,255,71,0.3)' : 'rgba(255,255,255,0.06)';
}

function renderBodyMap(scores) {
  renderFront(scores);
  renderBack(scores);
  renderLegend(scores);
}

function renderFront(scores) {
  const svg = document.getElementById('bodyFront');

  const shapes = [
    // Head
    { tag:'ellipse', cx:100, cy:30, rx:22, ry:26, fill:'#2a2a2e', stroke:'rgba(255,255,255,0.1)' },
    // Neck
    { tag:'rect', x:90, y:54, w:20, h:16, fill:'#2a2a2e', stroke:'rgba(255,255,255,0.08)', r:4 },

    // Chest
    { tag:'path', d:'M70,70 Q100,65 130,70 L128,105 Q100,112 72,105 Z',
      fill: muscleColor(scores.chest), stroke: muscleStroke(scores.chest), muscle:'chest' },

    // Front delts (left + right)
    { tag:'ellipse', cx:65, cy:78, rx:10, ry:14,
      fill: muscleColor(scores.front_delt), stroke: muscleStroke(scores.front_delt), muscle:'front_delt' },
    { tag:'ellipse', cx:135, cy:78, rx:10, ry:14,
      fill: muscleColor(scores.front_delt), stroke: muscleStroke(scores.front_delt), muscle:'front_delt' },

    // Side delts
    { tag:'ellipse', cx:56, cy:82, rx:7, ry:10,
      fill: muscleColor(scores.side_delt), stroke: muscleStroke(scores.side_delt), muscle:'side_delt' },
    { tag:'ellipse', cx:144, cy:82, rx:7, ry:10,
      fill: muscleColor(scores.side_delt), stroke: muscleStroke(scores.side_delt), muscle:'side_delt' },

    // Biceps (upper arms front)
    { tag:'rect', x:48, y:94, w:14, h:34, r:6,
      fill: muscleColor(scores.biceps), stroke: muscleStroke(scores.biceps), muscle:'biceps' },
    { tag:'rect', x:138, y:94, w:14, h:34, r:6,
      fill: muscleColor(scores.biceps), stroke: muscleStroke(scores.biceps), muscle:'biceps' },

    // Forearms
    { tag:'rect', x:49, y:130, w:12, h:30, r:5,
      fill:'#222228', stroke:'rgba(255,255,255,0.06)' },
    { tag:'rect', x:139, y:130, w:12, h:30, r:5,
      fill:'#222228', stroke:'rgba(255,255,255,0.06)' },

    // Abs
    { tag:'path', d:'M78,106 L84,106 L84,150 L78,150 Z', fill: muscleColor(scores.chest * 0.3), stroke: muscleStroke(0) },
    { tag:'rect', x:79, y:108, w:11, h:13, r:2, fill: muscleColor(scores.quads * 0.3), stroke:'rgba(255,255,255,0.06)' },
    { tag:'rect', x:91, y:108, w:11, h:13, r:2, fill: muscleColor(scores.quads * 0.3), stroke:'rgba(255,255,255,0.06)' },
    { tag:'rect', x:79, y:123, w:11, h:13, r:2, fill: muscleColor(scores.quads * 0.3), stroke:'rgba(255,255,255,0.06)' },
    { tag:'rect', x:91, y:123, w:11, h:13, r:2, fill: muscleColor(scores.quads * 0.3), stroke:'rgba(255,255,255,0.06)' },
    { tag:'rect', x:79, y:138, w:11, h:11, r:2, fill: muscleColor(scores.quads * 0.3), stroke:'rgba(255,255,255,0.06)' },
    { tag:'rect', x:91, y:138, w:11, h:11, r:2, fill: muscleColor(scores.quads * 0.3), stroke:'rgba(255,255,255,0.06)' },

    // Obliques
    { tag:'rect', x:67, y:106, w:12, h:44, r:4, fill:'#1e1e24', stroke:'rgba(255,255,255,0.05)' },
    { tag:'rect', x:121, y:106, w:12, h:44, r:4, fill:'#1e1e24', stroke:'rgba(255,255,255,0.05)' },

    // Hips
    { tag:'path', d:'M72,150 Q100,145 128,150 L132,175 Q100,180 68,175 Z',
      fill: muscleColor(scores.glutes * 0.4), stroke:'rgba(255,255,255,0.06)' },

    // Quads left + right
    { tag:'path', d:'M72,175 L90,175 L88,250 L70,248 Z',
      fill: muscleColor(scores.quads), stroke: muscleStroke(scores.quads), muscle:'quads' },
    { tag:'path', d:'M110,175 L128,175 L130,248 L112,250 Z',
      fill: muscleColor(scores.quads), stroke: muscleStroke(scores.quads), muscle:'quads' },

    // Knees
    { tag:'ellipse', cx:80, cy:254, rx:11, ry:8, fill:'#2a2a2e', stroke:'rgba(255,255,255,0.06)' },
    { tag:'ellipse', cx:120, cy:254, rx:11, ry:8, fill:'#2a2a2e', stroke:'rgba(255,255,255,0.06)' },

    // Shins / calves front
    { tag:'path', d:'M70,262 L90,262 L88,320 L72,320 Z',
      fill: muscleColor(scores.calves * 0.5), stroke:'rgba(255,255,255,0.06)' },
    { tag:'path', d:'M110,262 L130,262 L128,320 L112,320 Z',
      fill: muscleColor(scores.calves * 0.5), stroke:'rgba(255,255,255,0.06)' },

    // Feet
    { tag:'ellipse', cx:80, cy:326, rx:12, ry:7, fill:'#222228', stroke:'rgba(255,255,255,0.06)' },
    { tag:'ellipse', cx:120, cy:326, rx:12, ry:7, fill:'#222228', stroke:'rgba(255,255,255,0.06)' },

    // Triceps (visible at sides)
    { tag:'rect', x:49, y:94, w:5, h:34, r:3,
      fill: muscleColor(scores.triceps * 0.5), stroke:'rgba(255,255,255,0.04)' },
    { tag:'rect', x:146, y:94, w:5, h:34, r:3,
      fill: muscleColor(scores.triceps * 0.5), stroke:'rgba(255,255,255,0.04)' },
  ];

  svg.innerHTML = shapes.map(s => renderShape(s)).join('');
}

function renderBack(scores) {
  const svg = document.getElementById('bodyBack');

  const shapes = [
    // Head
    { tag:'ellipse', cx:100, cy:30, rx:22, ry:26, fill:'#2a2a2e', stroke:'rgba(255,255,255,0.1)' },
    // Neck
    { tag:'rect', x:90, y:54, w:20, h:16, fill:'#2a2a2e', stroke:'rgba(255,255,255,0.08)', r:4 },

    // Rear delts
    { tag:'ellipse', cx:65, cy:76, rx:11, ry:13,
      fill: muscleColor(scores.rear_delt), stroke: muscleStroke(scores.rear_delt), muscle:'rear_delt' },
    { tag:'ellipse', cx:135, cy:76, rx:11, ry:13,
      fill: muscleColor(scores.rear_delt), stroke: muscleStroke(scores.rear_delt), muscle:'rear_delt' },

    // Traps
    { tag:'path', d:'M78,58 Q100,52 122,58 L126,76 Q100,72 74,76 Z',
      fill: muscleColor(scores.mid_back * 0.8), stroke: muscleStroke(scores.mid_back), muscle:'mid_back' },

    // Upper back / mid back
    { tag:'path', d:'M68,76 Q100,70 132,76 L130,115 Q100,122 70,115 Z',
      fill: muscleColor(scores.mid_back), stroke: muscleStroke(scores.mid_back), muscle:'mid_back' },

    // Lats
    { tag:'path', d:'M68,80 L58,130 L72,130 L72,90 Z',
      fill: muscleColor(scores.lats), stroke: muscleStroke(scores.lats), muscle:'lats' },
    { tag:'path', d:'M132,80 L142,130 L128,130 L128,90 Z',
      fill: muscleColor(scores.lats), stroke: muscleStroke(scores.lats), muscle:'lats' },

    // Lower back
    { tag:'rect', x:82, y:116, w:36, h:34, r:4,
      fill: muscleColor(scores.lower_back), stroke: muscleStroke(scores.lower_back), muscle:'lower_back' },

    // Triceps
    { tag:'rect', x:48, y:94, w:14, h:34, r:6,
      fill: muscleColor(scores.triceps), stroke: muscleStroke(scores.triceps), muscle:'triceps' },
    { tag:'rect', x:138, y:94, w:14, h:34, r:6,
      fill: muscleColor(scores.triceps), stroke: muscleStroke(scores.triceps), muscle:'triceps' },

    // Forearms
    { tag:'rect', x:49, y:130, w:12, h:30, r:5,
      fill:'#222228', stroke:'rgba(255,255,255,0.06)' },
    { tag:'rect', x:139, y:130, w:12, h:30, r:5,
      fill:'#222228', stroke:'rgba(255,255,255,0.06)' },

    // Glutes
    { tag:'path', d:'M72,150 Q100,145 128,150 L130,195 Q100,200 70,195 Z',
      fill: muscleColor(scores.glutes), stroke: muscleStroke(scores.glutes), muscle:'glutes' },

    // Hamstrings
    { tag:'path', d:'M72,195 L90,195 L88,255 L70,252 Z',
      fill: muscleColor(scores.hamstrings), stroke: muscleStroke(scores.hamstrings), muscle:'hamstrings' },
    { tag:'path', d:'M110,195 L128,195 L130,252 L112,255 Z',
      fill: muscleColor(scores.hamstrings), stroke: muscleStroke(scores.hamstrings), muscle:'hamstrings' },

    // Knees back
    { tag:'ellipse', cx:80, cy:258, rx:11, ry:8, fill:'#2a2a2e', stroke:'rgba(255,255,255,0.06)' },
    { tag:'ellipse', cx:120, cy:258, rx:11, ry:8, fill:'#2a2a2e', stroke:'rgba(255,255,255,0.06)' },

    // Calves
    { tag:'path', d:'M70,266 L90,266 L88,322 L72,322 Z',
      fill: muscleColor(scores.calves), stroke: muscleStroke(scores.calves), muscle:'calves' },
    { tag:'path', d:'M110,266 L130,266 L128,322 L112,322 Z',
      fill: muscleColor(scores.calves), stroke: muscleStroke(scores.calves), muscle:'calves' },

    // Feet
    { tag:'ellipse', cx:80, cy:328, rx:12, ry:7, fill:'#222228', stroke:'rgba(255,255,255,0.06)' },
    { tag:'ellipse', cx:120, cy:328, rx:12, ry:7, fill:'#222228', stroke:'rgba(255,255,255,0.06)' },
  ];

  svg.innerHTML = shapes.map(s => renderShape(s)).join('');
}

function renderShape(s) {
  const fill = s.fill || '#1e1e21';
  const stroke = s.stroke || 'rgba(255,255,255,0.06)';
  if (s.tag === 'ellipse') {
    return `<ellipse cx="${s.cx}" cy="${s.cy}" rx="${s.rx}" ry="${s.ry}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
  }
  if (s.tag === 'rect') {
    return `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${s.r||0}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
  }
  if (s.tag === 'path') {
    return `<path d="${s.d}" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
  }
  return '';
}

function renderLegend(scores) {
  const labels = {
    chest: 'Chest', front_delt: 'Front Delt', side_delt: 'Side Delt',
    rear_delt: 'Rear Delt', lats: 'Lats', mid_back: 'Mid Back',
    lower_back: 'Lower Back', biceps: 'Biceps', triceps: 'Triceps',
    quads: 'Quads', hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves'
  };
  const el = document.getElementById('muscleLegend');
  el.innerHTML = ALL_MUSCLES.map(m => `
    <div class="legend-item">
      <div class="legend-dot" style="background:${muscleColor(scores[m])}"></div>
      <span>${labels[m]}</span>
      <span style="color:var(--text3);font-size:11px">${Math.round(scores[m]*100)}%</span>
    </div>
  `).join('');
}
