'use strict';
/* =========================================================
   Crown & Dagger — Yordamsal portreler (SVG)
   Kültür (ten, saç, başlık), yaş (kırlaşma, kırışıklık), cinsiyet,
   rütbe (taç, sarık, taç bandı, kürk), özellikler (yara izi,
   güzellik, çirkinlik) ve ruh hâli (kaş ve ağız) yüze yansır.
   ========================================================= */

const SKIN = {
  latin: ['#f1d0b5', '#e8c09e', '#dcae8a'], nordic: ['#f6dcc8', '#f0cfb6', '#ebc6aa'], slav: ['#f0d0b4', '#e6c2a2', '#dbb592'],
  rum: ['#e2b892', '#d6a982', '#c99a74'], turk: ['#e0b58c', '#d2a47c', '#c4946c'], arap: ['#c99268', '#b57f58', '#a06e4a'],
};
const HAIR = {
  latin: ['#5a3a22', '#3a2618', '#7a5030', '#1e1510', '#a0703a'], nordic: ['#e3c27a', '#c98a4a', '#b5652e', '#8a5a32', '#d8b26a'], slav: ['#7a5a3a', '#5a3a22', '#c9a46a', '#3a2618'],
  rum: ['#2a1c12', '#3d2a1a', '#14100c'], turk: ['#1e1510', '#2a1c12', '#3a2618'], arap: ['#14100c', '#1e1510', '#2a1c12'],
};
const _portraitCache = new Map();
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(Math.round(((n >> 16) & 255) * f), 0, 255), g = clamp(Math.round(((n >> 8) & 255) * f), 0, 255), b = clamp(Math.round((n & 255) * f), 0, 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}
/* mood: -1 (öfkeli) … 0 … +1 (mutlu) */
function portrait(c, mood = 0) {
  const ageB = c.age < 16 ? 'c' : c.age < 45 ? 'a' : c.age < 58 ? 'm' : 'o';
  const mb = Math.round(clamp(mood, -1, 1) * 2);
  const key = `${c.id}|${ageB}|${c.rank}|${mb}|${c.alive ? 1 : 0}|${c.traits.includes('yarali') ? 1 : 0}|${c.prisonerOf ? 1 : 0}`;
  const hit = _portraitCache.get(key);
  if (hit) return hit;
  const R = mulberry32(c.id * 7919 + 13);
  const pk = a => a[Math.floor(R() * a.length)];
  const cul = SKIN[c.cul] ? c.cul : 'latin';
  const east = cul === 'turk' || cul === 'arap';
  const skin = pk(SKIN[cul]), skinD = shade(skin, 0.82);
  let hair = pk(HAIR[cul]);
  if (ageB === 'o') hair = R() < 0.8 ? '#bdb8b0' : '#d9d6d0'; else if (ageB === 'm' && R() < 0.6) hair = '#8c8478';
  const child = ageB === 'c', f = c.female;
  const h = typeof hue === 'function' ? hue(c.dyn) : 30;
  const cloth = `hsl(${h} 42% 32%)`, clothD = `hsl(${h} 42% 22%)`;
  const fw = (f ? 17 : 19) + R() * 3 - (child ? 2 : 0), fh = (f ? 22 : 24) + R() * 3 - (child ? 3 : 0);
  const cy = child ? 50 : 46;
  const ugly = has(c, 'cirkin'), pretty = has(c, 'guzel');
  const angry = has(c, 'zalim') || has(c, 'kibirli') ? 0.6 : 0;
  const m = clamp(mood - angry * 0.4, -1, 1);
  const p = [];
  p.push(`<defs><radialGradient id="pg${c.id}" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="hsl(${h} 30% 34%)"/><stop offset="1" stop-color="hsl(${h} 35% 12%)"/></radialGradient></defs>`);
  p.push(`<rect width="100" height="100" fill="url(#pg${c.id})"/>`);
  // Uzun saç (arkada)
  const longHair = f && !east && R() < 0.75;
  if (longHair && !child) p.push(`<path d="M${50 - fw - 4} ${cy - 6} Q${50 - fw - 8} ${cy + 30} ${50 - fw + 2} ${cy + 40} L${50 + fw - 2} ${cy + 40} Q${50 + fw + 8} ${cy + 30} ${50 + fw + 4} ${cy - 6} Z" fill="${hair}"/>`);
  // Omuzlar ve giysi
  p.push(`<path d="M6 100 Q10 ${cy + 30} 50 ${cy + 26} Q90 ${cy + 30} 94 100 Z" fill="${cloth}"/>`);
  p.push(`<path d="M38 ${cy + 26} L50 ${cy + 40} L62 ${cy + 26}" fill="none" stroke="${clothD}" stroke-width="3"/>`);
  if (c.rank >= 5 && !east) p.push(`<path d="M6 100 Q10 ${cy + 30} 50 ${cy + 26} Q90 ${cy + 30} 94 100 L86 100 Q82 ${cy + 36} 50 ${cy + 33} Q18 ${cy + 36} 14 100Z" fill="#f2efe6"/>` + [20, 32, 68, 80].map(x => `<circle cx="${x}" cy="${cy + 40 + (x % 3)}" r="1.2" fill="#111"/>`).join(''));
  else if (c.rank >= 3) p.push(`<path d="M30 ${cy + 28} Q50 ${cy + 34} 70 ${cy + 28}" fill="none" stroke="#d8b04a" stroke-width="2"/>`);
  if (east && c.rank >= 3) p.push(`<path d="M50 ${cy + 33} L50 100" stroke="#d8b04a" stroke-width="2"/>`);
  // Boyun ve kulaklar
  p.push(`<rect x="${50 - 7}" y="${cy + 14}" width="14" height="${14}" fill="${skinD}"/>`);
  p.push(`<ellipse cx="${50 - fw}" cy="${cy + 1}" rx="3" ry="5" fill="${skinD}"/><ellipse cx="${50 + fw}" cy="${cy + 1}" rx="3" ry="5" fill="${skinD}"/>`);
  // Yüz
  p.push(`<ellipse cx="50" cy="${cy}" rx="${fw}" ry="${fh}" fill="${skin}"/>`);
  if (pretty || (f && R() < 0.4)) p.push(`<ellipse cx="${50 - fw * 0.55}" cy="${cy + 7}" rx="4" ry="2.4" fill="#e08a7a" opacity=".35"/><ellipse cx="${50 + fw * 0.55}" cy="${cy + 7}" rx="4" ry="2.4" fill="#e08a7a" opacity=".35"/>`);
  // Gözler
  const ey = cy - 2, ex = fw * 0.42, er = child ? 2.6 : 2.1;
  const iris = pk(cul === 'nordic' || cul === 'slav' ? ['#4a7aa8', '#5a8a6a', '#3a2618'] : ['#3a2618', '#2a1c12', '#5a3a22']);
  for (const s of [-1, 1]) p.push(`<ellipse cx="${50 + s * ex}" cy="${ey}" rx="${er + 1.4}" ry="${er}" fill="#f4efe6"/><circle cx="${50 + s * ex}" cy="${ey}" r="${er * 0.75}" fill="${iris}"/><circle cx="${50 + s * ex}" cy="${ey}" r="${er * 0.35}" fill="#111"/>`);
  // Kaşlar: ruh hâline göre
  const tilt = -m * 2.2 + angry * 1.5;
  const bc = ageB === 'o' ? '#bdb8b0' : shade(hair === '#e3c27a' || hair === '#d8b26a' ? '#a07a3a' : hair, 0.9);
  for (const s of [-1, 1]) p.push(`<path d="M${50 + s * (ex - 4)} ${ey - 5 + tilt} L${50 + s * (ex + 4)} ${ey - 5 - tilt * 0.3}" stroke="${bc}" stroke-width="${f ? 1.4 : 2}" stroke-linecap="round"/>`);
  // Burun
  const nl = ugly ? 9 : 6.5;
  p.push(`<path d="M50 ${ey + 1} Q${48.5} ${ey + nl} ${46.5} ${ey + nl + 1} Q50 ${ey + nl + 3} ${53.5} ${ey + nl + 1}" fill="none" stroke="${skinD}" stroke-width="1.4" stroke-linecap="round"/>`);
  if (ugly) p.push(`<circle cx="${50 + fw * 0.5}" cy="${cy + 9}" r="1.3" fill="${shade(skin, 0.6)}"/>`);
  // Ağız
  const my = cy + fh * 0.55, mw = f ? 6 : 7, curve = m * 4;
  p.push(`<path d="M${50 - mw} ${my} Q50 ${my + curve} ${50 + mw} ${my}" fill="none" stroke="${f ? '#a04848' : '#7a4038'}" stroke-width="${f ? 2 : 1.6}" stroke-linecap="round"/>`);
  // Kırışıklıklar
  if (ageB === 'm' || ageB === 'o') p.push(`<path d="M${50 - ex - 5} ${ey + 3} l-2 2 M${50 + ex + 5} ${ey + 3} l2 2 M${50 - 9} ${my - 4} q-2 3 0 6 M${50 + 9} ${my - 4} q2 3 0 6" stroke="${skinD}" stroke-width=".9" fill="none"/>`);
  // Sakal
  const beard = !f && !child && c.age >= 18 && R() < (east ? 0.92 : cul === 'nordic' ? 0.8 : 0.6);
  if (beard) {
    const style = R();
    if (style < 0.5) p.push(`<path d="M${50 - fw + 1} ${cy + 2} Q${50 - fw + 2} ${cy + fh + 8} 50 ${cy + fh + 10} Q${50 + fw - 2} ${cy + fh + 8} ${50 + fw - 1} ${cy + 2} Q${50 + fw - 5} ${my + 3} 50 ${my + 4} Q${50 - fw + 5} ${my + 3} ${50 - fw + 1} ${cy + 2}Z" fill="${hair}"/>`);
    else if (style < 0.8) p.push(`<path d="M${50 - 7} ${my + 3} Q50 ${cy + fh + 9} ${50 + 7} ${my + 3} Q50 ${my + 6} ${50 - 7} ${my + 3}Z" fill="${hair}"/>`);
    p.push(`<path d="M${50 - 9} ${my - 1.5} Q50 ${my - 5} ${50 + 9} ${my - 1.5} Q50 ${my - 2.5} ${50 - 9} ${my - 1.5}Z" fill="${hair}"/>`);
  }
  // Saç (üst)
  const bald = !f && ageB === 'o' && R() < 0.45;
  if (!bald) p.push(`<path d="M${50 - fw - 1} ${cy - 2} Q${50 - fw} ${cy - fh - 6} 50 ${cy - fh - 5} Q${50 + fw} ${cy - fh - 6} ${50 + fw + 1} ${cy - 2} Q${50 + fw - 3} ${cy - fh + 6} 50 ${cy - fh + 4} Q${50 - fw + 3} ${cy - fh + 6} ${50 - fw - 1} ${cy - 2}Z" fill="${hair}"/>`);
  // Yara izi
  if (has(c, 'yarali')) p.push(`<path d="M${50 + fw * 0.2} ${ey - 8} L${50 + fw * 0.7} ${cy + 10}" stroke="#9a3a32" stroke-width="1.6" opacity=".85"/>`);
  // Başlıklar
  const top = cy - fh - 4;
  if (c.rank >= 5 && !child) {
    if (east) p.push(`<ellipse cx="50" cy="${top + 2}" rx="${fw + 7}" ry="11" fill="#f1ece0"/><path d="M${50 - fw - 6} ${top + 4} Q50 ${top - 2} ${50 + fw + 6} ${top + 4}" stroke="#cfc6b2" stroke-width="1.5" fill="none"/><circle cx="50" cy="${top + 2}" r="3" fill="#c0392b" stroke="#d8b04a"/><path d="M50 ${top} q2 -10 6 -14" stroke="#e8e0d0" stroke-width="2.4" fill="none"/>`);
    else p.push(`<path d="M${50 - fw} ${top + 6} L${50 - fw} ${top - 6} L${50 - fw / 2} ${top} L50 ${top - 10} L${50 + fw / 2} ${top} L${50 + fw} ${top - 6} L${50 + fw} ${top + 6}Z" fill="#e2b33e" stroke="#7a5a18" stroke-width="1"/><circle cx="50" cy="${top + 2}" r="2.2" fill="#b02a2a"/>`);
  } else if (east && !child && c.age >= 14) {
    if (f) p.push(`<path d="M${50 - fw - 6} ${cy + 18} Q${50 - fw - 8} ${top - 6} 50 ${top - 8} Q${50 + fw + 8} ${top - 6} ${50 + fw + 6} ${cy + 18} L${50 + fw} ${cy + 10} Q${50 + fw + 2} ${top + 2} 50 ${top + 1} Q${50 - fw - 2} ${top + 2} ${50 - fw} ${cy + 10}Z" fill="hsl(${(h + 180) % 360} 35% 45%)"/>`);
    else if (c.rank >= 2) p.push(c.cul === 'turk' && R() < 0.5 ? `<path d="M${50 - fw - 1} ${top + 6} Q${50 - fw} ${top - 14} 50 ${top - 16} Q${50 + fw} ${top - 14} ${50 + fw + 1} ${top + 6}Z" fill="#8a2a22"/><rect x="${50 - fw - 2}" y="${top + 2}" width="${fw * 2 + 4}" height="6" fill="#4a3018"/>` : `<ellipse cx="50" cy="${top + 1}" rx="${fw + 4}" ry="9" fill="#ece5d6"/>`);
  } else if (f && !child && c.age >= 16 && !longHair) p.push(`<path d="M${50 - fw - 5} ${cy + 22} Q${50 - fw - 7} ${top - 4} 50 ${top - 6} Q${50 + fw + 7} ${top - 4} ${50 + fw + 5} ${cy + 22} L${50 + fw} ${cy + 12} Q${50 + fw} ${top + 3} 50 ${top + 2} Q${50 - fw} ${top + 3} ${50 - fw} ${cy + 12}Z" fill="#ece8dc"/>`);
  else if (c.rank >= 3 && !child && R() < 0.6) p.push(`<path d="M${50 - fw + 1} ${top + 6} Q50 ${top + 1} ${50 + fw - 1} ${top + 6}" stroke="#d8b04a" stroke-width="2.4" fill="none"/>`);
  if (c.prisonerOf) p.push(`<path d="M0 0 L100 100 M100 0 L0 100" stroke="rgba(0,0,0,0)"/><g stroke="#2a2420" stroke-width="3" opacity=".65">${[18, 38, 62, 82].map(x => `<line x1="${x}" y1="0" x2="${x}" y2="100"/>`).join('')}</g>`);
  const svg = `<svg class="pt" viewBox="0 0 100 100" aria-hidden="true">${p.join('')}</svg>`;
  if (_portraitCache.size > 1500) _portraitCache.clear();
  _portraitCache.set(key, svg);
  return svg;
}
