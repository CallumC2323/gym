function muscleColor(score) {
  if (score <= 0) return '#1e1e21';
  const r = Math.round(30 + score * (232-30));
  const g = Math.round(30 + score * (255-30));
  const b = Math.round(33 + score * (71-33));
  return `rgb(${r},${g},${b})`;
}
function muscleStroke(score) { return score > 0.1 ? 'rgba(232,255,71,0.25)' : 'rgba(255,255,255,0.05)'; }

function renderBodyMap(scores) { renderFront(scores); renderBack(scores); renderLegend(scores); }

function renderFront(scores) {
  const svg = document.getElementById('bodyFront');
  const s = scores;
  svg.innerHTML = [
    `<ellipse cx="100" cy="30" rx="22" ry="26" fill="#2a2a2e" stroke="rgba(255,255,255,0.09)" stroke-width="1"/>`,
    `<rect x="90" y="54" width="20" height="16" rx="4" fill="#2a2a2e" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>`,
    `<path d="M70,70 Q100,65 130,70 L128,105 Q100,112 72,105 Z" fill="${muscleColor(s.chest)}" stroke="${muscleStroke(s.chest)}" stroke-width="1"/>`,
    `<ellipse cx="65" cy="78" rx="10" ry="14" fill="${muscleColor(s.front_delt)}" stroke="${muscleStroke(s.front_delt)}" stroke-width="1"/>`,
    `<ellipse cx="135" cy="78" rx="10" ry="14" fill="${muscleColor(s.front_delt)}" stroke="${muscleStroke(s.front_delt)}" stroke-width="1"/>`,
    `<ellipse cx="56" cy="82" rx="7" ry="10" fill="${muscleColor(s.side_delt)}" stroke="${muscleStroke(s.side_delt)}" stroke-width="1"/>`,
    `<ellipse cx="144" cy="82" rx="7" ry="10" fill="${muscleColor(s.side_delt)}" stroke="${muscleStroke(s.side_delt)}" stroke-width="1"/>`,
    `<rect x="48" y="94" width="14" height="34" rx="6" fill="${muscleColor(s.biceps)}" stroke="${muscleStroke(s.biceps)}" stroke-width="1"/>`,
    `<rect x="138" y="94" width="14" height="34" rx="6" fill="${muscleColor(s.biceps)}" stroke="${muscleStroke(s.biceps)}" stroke-width="1"/>`,
    `<rect x="49" y="130" width="12" height="30" rx="5" fill="#222228" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`,
    `<rect x="139" y="130" width="12" height="30" rx="5" fill="#222228" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`,
    `<rect x="79" y="108" width="11" height="13" rx="2" fill="${muscleColor(s.quads*0.25)}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`,
    `<rect x="91" y="108" width="11" height="13" rx="2" fill="${muscleColor(s.quads*0.25)}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`,
    `<rect x="79" y="123" width="11" height="13" rx="2" fill="${muscleColor(s.quads*0.25)}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`,
    `<rect x="91" y="123" width="11" height="13" rx="2" fill="${muscleColor(s.quads*0.25)}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`,
    `<rect x="79" y="138" width="11" height="11" rx="2" fill="${muscleColor(s.quads*0.25)}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`,
    `<rect x="91" y="138" width="11" height="11" rx="2" fill="${muscleColor(s.quads*0.25)}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`,
    `<rect x="67" y="106" width="12" height="44" rx="4" fill="#1e1e24" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>`,
    `<rect x="121" y="106" width="12" height="44" rx="4" fill="#1e1e24" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>`,
    `<path d="M72,150 Q100,145 128,150 L132,175 Q100,180 68,175 Z" fill="${muscleColor(s.glutes*0.35)}" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>`,
    `<path d="M72,175 L90,175 L88,250 L70,248 Z" fill="${muscleColor(s.quads)}" stroke="${muscleStroke(s.quads)}" stroke-width="1"/>`,
    `<path d="M110,175 L128,175 L130,248 L112,250 Z" fill="${muscleColor(s.quads)}" stroke="${muscleStroke(s.quads)}" stroke-width="1"/>`,
    `<ellipse cx="80" cy="254" rx="11" ry="8" fill="#2a2a2e" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`,
    `<ellipse cx="120" cy="254" rx="11" ry="8" fill="#2a2a2e" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`,
    `<path d="M70,262 L90,262 L88,320 L72,320 Z" fill="${muscleColor(s.calves*0.5)}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`,
    `<path d="M110,262 L130,262 L128,320 L112,320 Z" fill="${muscleColor(s.calves*0.5)}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`,
    `<ellipse cx="80" cy="326" rx="12" ry="7" fill="#222228" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`,
    `<ellipse cx="120" cy="326" rx="12" ry="7" fill="#222228" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`,
  ].join('');
}

function renderBack(scores) {
  const svg = document.getElementById('bodyBack');
  const s = scores;
  svg.innerHTML = [
    `<ellipse cx="100" cy="30" rx="22" ry="26" fill="#2a2a2e" stroke="rgba(255,255,255,0.09)" stroke-width="1"/>`,
    `<rect x="90" y="54" width="20" height="16" rx="4" fill="#2a2a2e" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>`,
    `<ellipse cx="65" cy="76" rx="11" ry="13" fill="${muscleColor(s.rear_delt)}" stroke="${muscleStroke(s.rear_delt)}" stroke-width="1"/>`,
    `<ellipse cx="135" cy="76" rx="11" ry="13" fill="${muscleColor(s.rear_delt)}" stroke="${muscleStroke(s.rear_delt)}" stroke-width="1"/>`,
    `<path d="M78,58 Q100,52 122,58 L126,76 Q100,72 74,76 Z" fill="${muscleColor(s.mid_back*0.8)}" stroke="${muscleStroke(s.mid_back)}" stroke-width="1"/>`,
    `<path d="M68,76 Q100,70 132,76 L130,115 Q100,122 70,115 Z" fill="${muscleColor(s.mid_back)}" stroke="${muscleStroke(s.mid_back)}" stroke-width="1"/>`,
    `<path d="M68,80 L58,130 L72,130 L72,90 Z" fill="${muscleColor(s.lats)}" stroke="${muscleStroke(s.lats)}" stroke-width="1"/>`,
    `<path d="M132,80 L142,130 L128,130 L128,90 Z" fill="${muscleColor(s.lats)}" stroke="${muscleStroke(s.lats)}" stroke-width="1"/>`,
    `<rect x="82" y="116" width="36" height="34" rx="4" fill="${muscleColor(s.lower_back)}" stroke="${muscleStroke(s.lower_back)}" stroke-width="1"/>`,
    `<rect x="48" y="94" width="14" height="34" rx="6" fill="${muscleColor(s.triceps)}" stroke="${muscleStroke(s.triceps)}" stroke-width="1"/>`,
    `<rect x="138" y="94" width="14" height="34" rx="6" fill="${muscleColor(s.triceps)}" stroke="${muscleStroke(s.triceps)}" stroke-width="1"/>`,
    `<rect x="49" y="130" width="12" height="30" rx="5" fill="#222228" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`,
    `<rect x="139" y="130" width="12" height="30" rx="5" fill="#222228" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`,
    `<path d="M72,150 Q100,145 128,150 L130,195 Q100,200 70,195 Z" fill="${muscleColor(s.glutes)}" stroke="${muscleStroke(s.glutes)}" stroke-width="1"/>`,
    `<path d="M72,195 L90,195 L88,255 L70,252 Z" fill="${muscleColor(s.hamstrings)}" stroke="${muscleStroke(s.hamstrings)}" stroke-width="1"/>`,
    `<path d="M110,195 L128,195 L130,252 L112,255 Z" fill="${muscleColor(s.hamstrings)}" stroke="${muscleStroke(s.hamstrings)}" stroke-width="1"/>`,
    `<ellipse cx="80" cy="258" rx="11" ry="8" fill="#2a2a2e" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`,
    `<ellipse cx="120" cy="258" rx="11" ry="8" fill="#2a2a2e" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`,
    `<path d="M70,266 L90,266 L88,322 L72,322 Z" fill="${muscleColor(s.calves)}" stroke="${muscleStroke(s.calves)}" stroke-width="1"/>`,
    `<path d="M110,266 L130,266 L128,322 L112,322 Z" fill="${muscleColor(s.calves)}" stroke="${muscleStroke(s.calves)}" stroke-width="1"/>`,
    `<ellipse cx="80" cy="328" rx="12" ry="7" fill="#222228" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`,
    `<ellipse cx="120" cy="328" rx="12" ry="7" fill="#222228" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`,
  ].join('');
}

function renderLegend(scores) {
  const labels = { chest:'Chest', front_delt:'Front Delt', side_delt:'Side Delt', rear_delt:'Rear Delt', lats:'Lats', mid_back:'Mid Back', lower_back:'Lower Back', biceps:'Biceps', triceps:'Triceps', quads:'Quads', hamstrings:'Hamstrings', glutes:'Glutes', calves:'Calves' };
  document.getElementById('muscleLegend').innerHTML = ALL_MUSCLES.map(m =>
    `<div class="legend-item"><div class="legend-dot" style="background:${muscleColor(scores[m])}"></div><span>${labels[m]}</span><span style="color:var(--text3);font-size:10px">${Math.round(scores[m]*100)}%</span></div>`
  ).join('');
}
