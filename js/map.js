'use strict';
/* =========================================================
   TAÇ VE HANÇER — Harita çizimi, dokunmatik kontroller, joystick
   ========================================================= */

const CAM = { x: 30, y: 25, z: 26, follow: true };
const JOY = { active: false, vx: 0, vy: 0, id: null };
let MAPCV = null, MCTX = null, LANDPATH = null, TERRCV = null, TERRHI = null, SEAPAT = null;

/* ---------- Joystick (harita ve savaşta ortak) ---------- */
function setupJoystick(el) {
  const knob = el.querySelector('.knob');
  const R = () => el.clientWidth / 2;
  const upd = e => {
    const r = el.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const m = Math.hypot(dx, dy), max = R() * 0.8;
    if (m > max) { dx = dx / m * max; dy = dy / m * max; }
    JOY.vx = dx / max; JOY.vy = dy / max;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); JOY.active = true; JOY.id = e.pointerId; el.setPointerCapture(e.pointerId); upd(e); CAM.follow = true; });
  el.addEventListener('pointermove', e => { if (JOY.active && e.pointerId === JOY.id) upd(e); });
  const end = e => { if (e.pointerId !== JOY.id) return; JOY.active = false; JOY.vx = JOY.vy = 0; knob.style.transform = ''; };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}
const KEYS = {};
window.addEventListener('keydown', e => { KEYS[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', e => { KEYS[e.key.toLowerCase()] = false; });
function keyVector() {
  let x = 0, y = 0;
  if (KEYS.w || KEYS.arrowup) y -= 1; if (KEYS.s || KEYS.arrowdown) y += 1;
  if (KEYS.a || KEYS.arrowleft) x -= 1; if (KEYS.d || KEYS.arrowright) x += 1;
  return [x, y];
}
function moveInput() {
  if (JOY.active) return [JOY.vx, JOY.vy];
  const [x, y] = keyVector();
  if (x || y) { CAM.follow = true; const m = Math.hypot(x, y); return [x / m, y / m]; }
  return [0, 0];
}

/* ---------- Harita kurulumu ---------- */
function setupMap(cv) {
  MAPCV = cv; MCTX = cv.getContext('2d');
  LANDPATH = new Path2D();
  for (const p of LANDP) for (const r of p.rings) {
    LANDPATH.moveTo(r[0][0], r[0][1]);
    for (let i = 1; i < r.length; i++) LANDPATH.lineTo(r[i][0], r[i][1]);
    LANDPATH.closePath();
  }
  // Deniz dokusu
  const t = document.createElement('canvas'); t.width = t.height = 64;
  const c = t.getContext('2d');
  c.strokeStyle = 'rgba(160,200,210,0.07)'; c.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) { c.beginPath(); const y = 8 + i * 16; c.moveTo(0, y); c.quadraticCurveTo(16, y - 4, 32, y); c.quadraticCurveTo(48, y + 4, 64, y); c.stroke(); }
  SEAPAT = MCTX.createPattern(t, 'repeat');
  resizeMap();
  window.addEventListener('resize', resizeMap);
  setupMapInput(cv);
}
function resizeMap() {
  if (!MAPCV) return;
  const d = Math.min(2, window.devicePixelRatio || 1);
  MAPCV.width = MAPCV.clientWidth * d; MAPCV.height = MAPCV.clientHeight * d;
  MAPCV._d = d;
}
function buildTerritory() {
  if (!TERRCV) { TERRCV = document.createElement('canvas'); TERRCV.width = GRID.w; TERRCV.height = GRID.h; }
  const c = TERRCV.getContext('2d');
  const img = c.createImageData(GRID.w, GRID.h);
  const S = settlements();
  const col = S.map(s => {
    const r = s.liege ? G.titles[s.liege] : null;
    const css = r && !r.dead ? r.color : (s.holder != null ? '#9a9080' : '#777');
    return cssRGB(css);
  });
  const own = S.map(s => (s.liege || ('h' + s.holder)));
  for (let j = 0; j < GRID.h; j++) for (let i = 0; i < GRID.w; i++) {
    const k = j * GRID.w + i, n = NEARGRID[k];
    if (n < 0) continue;
    const [r, g, b] = col[n];
    let border = false;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ii = i + di, jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= GRID.w || jj >= GRID.h) continue;
      const m = NEARGRID[jj * GRID.w + ii];
      if (m >= 0 && own[m] !== own[n]) { border = true; break; }
    }
    const o = k * 4;
    img.data[o] = border ? r * 0.55 : r; img.data[o + 1] = border ? g * 0.55 : g; img.data[o + 2] = border ? b * 0.55 : b;
    img.data[o + 3] = border ? 235 : 150;
  }
  c.putImageData(img, 0, 0);
  // Yumuşak sınırlar için büyütülüp bulanıklaştırılmış kopya
  const K = 5;
  if (!TERRHI) { TERRHI = document.createElement('canvas'); TERRHI.width = GRID.w * K; TERRHI.height = GRID.h * K; }
  const h = TERRHI.getContext('2d');
  h.clearRect(0, 0, TERRHI.width, TERRHI.height);
  h.imageSmoothingEnabled = true;
  h.filter = 'blur(3px)';
  h.drawImage(TERRCV, 0, 0, TERRHI.width, TERRHI.height);
  h.filter = 'none';
  G.terrDirty = false;
}
const _rgbCache = {};
function cssRGB(css) {
  if (_rgbCache[css]) return _rgbCache[css];
  const c = document.createElement('canvas').getContext('2d');
  c.fillStyle = css; c.fillRect(0, 0, 1, 1);
  const d = c.getImageData(0, 0, 1, 1).data;
  return (_rgbCache[css] = [d[0], d[1], d[2]]);
}

/* ---------- Koordinat dönüşümü ---------- */
function screenToMap(sx, sy) {
  const d = MAPCV._d, w = MAPCV.width / d, h = MAPCV.height / d;
  return [CAM.x + (sx - w / 2) / CAM.z, CAM.y + (sy - h / 2) / CAM.z];
}
function mapToScreen(x, y) {
  const d = MAPCV._d, w = MAPCV.width / d, h = MAPCV.height / d;
  return [(x - CAM.x) * CAM.z + w / 2, (y - CAM.y) * CAM.z + h / 2];
}

/* ---------- Çizim ---------- */
function drawMap(time) {
  if (!MAPCV || !G) return;
  const pp = playerParty();
  if (CAM.follow && pp) { CAM.x += (pp.x - CAM.x) * 0.2; CAM.y += (pp.y - CAM.y) * 0.2; }
  if (G.terrDirty) buildTerritory();
  const ctx = MCTX, d = MAPCV._d, W = MAPCV.width / d, H = MAPCV.height / d;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  // Deniz
  const sea = ctx.createLinearGradient(0, 0, 0, H);
  sea.addColorStop(0, '#1d3a47'); sea.addColorStop(1, '#16303b');
  ctx.fillStyle = sea; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate((-CAM.x * CAM.z) % 64, (-CAM.y * CAM.z) % 64); ctx.fillStyle = SEAPAT; ctx.fillRect(-64, -64, W + 128, H + 128); ctx.restore();
  // Kara (harita birimlerinde)
  const z = CAM.z;
  ctx.setTransform(d * z, 0, 0, d * z, d * (W / 2 - CAM.x * z), d * (H / 2 - CAM.y * z));
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 8 * d; ctx.fillStyle = '#b9a77e'; ctx.fill(LANDPATH); ctx.shadowBlur = 0;
  ctx.save(); ctx.clip(LANDPATH);
  ctx.imageSmoothingEnabled = true; ctx.globalAlpha = 0.85;
  ctx.drawImage(TERRHI, 0, 0, GRID.w * GRID.step, GRID.h * GRID.step);
  ctx.globalAlpha = 1;
  ctx.restore();
  ctx.lineWidth = 1.4 / z; ctx.strokeStyle = 'rgba(40,30,20,0.75)'; ctx.stroke(LANDPATH);
  ctx.lineWidth = 3.5 / z; ctx.strokeStyle = 'rgba(190,220,225,0.10)'; ctx.stroke(LANDPATH);
  // Rota
  if (pp && pp.tx != null) {
    ctx.setLineDash([4 / z, 4 / z]); ctx.lineWidth = 1.6 / z; ctx.strokeStyle = 'rgba(255,230,160,0.8)';
    ctx.beginPath(); ctx.moveTo(pp.x, pp.y); ctx.lineTo(pp.tx, pp.ty); ctx.stroke(); ctx.setLineDash([]);
  }
  ctx.setTransform(d, 0, 0, d, 0, 0);
  // Krallık adları (uzak görünüm)
  if (z < 22) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const r of realms()) {
      const ss = realmSettlements(r);
      if (!ss.length) continue;
      const cx = ss.reduce((a, s) => a + s.x, 0) / ss.length, cy = ss.reduce((a, s) => a + s.y, 0) / ss.length;
      const [sx, sy] = mapToScreen(cx, cy);
      if (sx < -200 || sx > W + 200 || sy < -50 || sy > H + 50) continue;
      const fs = clamp(z * 0.55 * Math.sqrt(ss.length), 10, 26);
      ctx.font = `600 ${fs}px "Cinzel", Georgia, serif`;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,14,8,0.55)'; ctx.fillStyle = 'rgba(255,244,220,0.82)';
      const label = r.name.toLocaleUpperCase('tr').replace(/ (KRALLIĞI|İMPARATORLUĞU|SULTANLIĞI|HALİFELİĞİ|DEVLETİ|BEYLİĞİ|KNEZLİĞİ|ÇARLIĞI|CUMHURİYETİ)$/, '');
      ctx.strokeText(label, sx, sy - 14); ctx.fillText(label, sx, sy - 14);
    }
  }
  // Yerleşimler
  const showNames = z >= 16;
  const names = [];
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (const s of settlements()) {
    const [sx, sy] = mapToScreen(s.x, s.y);
    if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
    const r = s.liege ? G.titles[s.liege] : null;
    const size = clamp(z * 0.22, 4, 9) * (s.kind === 'sehir' ? 1.15 : 1);
    ctx.fillStyle = '#f3e7cc'; ctx.strokeStyle = r && !r.dead ? r.color : '#777'; ctx.lineWidth = 2.2;
    ctx.beginPath();
    if (s.kind === 'kale') { ctx.rect(sx - size, sy - size, size * 2, size * 2); }
    else ctx.arc(sx, sy, size, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // kule dişleri
    ctx.fillStyle = r && !r.dead ? r.color : '#777';
    if (s.kind === 'kale') { ctx.fillRect(sx - size * 0.5, sy - size * 0.5, size, size); }
    else { ctx.beginPath(); ctx.arc(sx, sy, size * 0.45, 0, Math.PI * 2); ctx.fill(); }
    if (s.capital) { ctx.font = `${Math.round(size * 1.5)}px sans-serif`; ctx.textBaseline = 'bottom'; ctx.fillText('★', sx, sy - size); ctx.textBaseline = 'top'; }
    if (s.siege) { ctx.font = `${Math.round(size * 1.8)}px sans-serif`; ctx.textBaseline = 'middle'; ctx.fillText('🔥', sx + size * 1.6, sy - size); ctx.textBaseline = 'top'; }
    if (showNames || s.capital) names.push([s, sx, sy + size + 2]);
  }
  // Ordular
  const pulse = 0.5 + 0.5 * Math.sin(time / 180);
  for (const pt of G.parties) {
    const [sx, sy] = mapToScreen(pt.x, pt.y);
    if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) continue;
    const isP = pt.kind === 'player';
    const c = ch(pt.owner);
    const r = c ? realmOf(c) : null;
    const n = troopCount(pt);
    const rad = clamp(3.5 + Math.sqrt(n) * 0.4, 4.5, 10) * (z < 14 ? 0.75 : 1) * (isP ? 1.2 : 1);
    const hostile = !isP && pp && hostileParties(pp, pt);
    if (hostile) { ctx.strokeStyle = `rgba(255,70,50,${0.4 + pulse * 0.5})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(sx, sy, rad + 4, 0, Math.PI * 2); ctx.stroke(); }
    // gölge
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(sx + 1.5, sy + rad * 0.7, rad, rad * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    // sancak direği + bayrak
    const col = isP ? '#ffcf4a' : pt.kind === 'bandit' ? '#2a2420' : r ? r.color : '#8a8070';
    ctx.strokeStyle = '#2a1d10'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(sx, sy + rad * 0.5); ctx.lineTo(sx, sy - rad * 1.6); ctx.stroke();
    ctx.fillStyle = col; ctx.strokeStyle = isP ? '#fff' : 'rgba(0,0,0,0.6)'; ctx.lineWidth = isP ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(sx, sy - rad * 1.6); ctx.lineTo(sx + rad * 1.5, sy - rad * 1.25); ctx.lineTo(sx, sy - rad * 0.8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(sx, sy, rad * 0.6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (pt.kind === 'bandit') { ctx.fillStyle = '#e8e0d0'; ctx.font = `${Math.round(rad)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('☠', sx, sy); }
    if (isP || z >= 34 || (hostile && z >= 18)) {
      ctx.font = `600 ${isP ? 12 : 10}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.8)'; ctx.fillStyle = isP ? '#ffe08a' : hostile ? '#ffb4a8' : '#f2ead8';
      const label = isP ? `Sen · ${n}` : `${n}`;
      ctx.strokeText(label, sx, sy + rad * 0.7 + 2); ctx.fillText(label, sx, sy + rad * 0.7 + 2);
    }
    if (pt.mode === 'siege' && pt.sid && G.titles[pt.sid] && G.titles[pt.sid].siege) { ctx.font = '11px sans-serif'; ctx.fillText('⚔', sx + rad + 4, sy - rad); }
  }
  // Yerleşim adları en üstte
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (const [s, x, y] of names) {
    ctx.font = `${s.kind === 'sehir' ? 700 : 500} ${clamp(z * 0.42, 10, 15)}px Alegreya, Georgia, serif`;
    ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(15,10,5,0.85)'; ctx.fillStyle = s.holder === G.playerId ? '#ffd76a' : '#f5ead2';
    ctx.strokeText(s.name, x, y); ctx.fillText(s.name, x, y);
  }
}

/* ---------- Harita girdisi ---------- */
function setupMapInput(cv) {
  const pts = new Map();
  let start = null, pinch = null, moved = false;
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 1) { start = { x: e.clientX, y: e.clientY, cx: CAM.x, cy: CAM.y, t: performance.now() }; moved = false; }
    if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: CAM.z, mx: (a[0] + b[0]) / 2, my: (a[1] + b[1]) / 2 };
      moved = true;
    }
  });
  cv.addEventListener('pointermove', e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, [e.clientX, e.clientY]);
    if (pts.size === 2 && pinch) {
      const [a, b] = [...pts.values()];
      const nd = Math.hypot(a[0] - b[0], a[1] - b[1]);
      zoomAt(pinch.mx, pinch.my, clamp(pinch.z * nd / pinch.d, 6, 90));
    } else if (pts.size === 1 && start) {
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (Math.hypot(dx, dy) > 8) moved = true;
      if (moved) { CAM.follow = false; CAM.x = start.cx - dx / CAM.z; CAM.y = start.cy - dy / CAM.z; }
    }
  });
  const up = e => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (pts.size === 0) {
      if (!moved && start && performance.now() - start.t < 450) mapTap(e.clientX, e.clientY);
      start = null;
    } else { const [p] = [...pts.values()]; start = { x: p[0], y: p[1], cx: CAM.x, cy: CAM.y, t: 0 }; }
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
  cv.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, clamp(CAM.z * (e.deltaY < 0 ? 1.15 : 0.87), 6, 90)); }, { passive: false });
}
function zoomAt(sx, sy, nz) {
  const r = MAPCV.getBoundingClientRect();
  const [mx, my] = screenToMap(sx - r.left, sy - r.top);
  CAM.z = nz;
  const [mx2, my2] = screenToMap(sx - r.left, sy - r.top);
  if (!CAM.follow) { CAM.x += mx - mx2; CAM.y += my - my2; }
}
function mapTap(cx, cy) {
  const r = MAPCV.getBoundingClientRect();
  const sx = cx - r.left, sy = cy - r.top;
  let best = null, bd = 22;
  for (const pt of G.parties) { const [px, py] = mapToScreen(pt.x, pt.y); const dd = Math.hypot(px - sx, py - sy + 6); if (dd < bd) { bd = dd; best = { kind: 'party', obj: pt }; } }
  for (const s of settlements()) { const [px, py] = mapToScreen(s.x, s.y); const dd = Math.hypot(px - sx, py - sy); if (dd < bd) { bd = dd; best = { kind: 'sett', obj: s }; } }
  if (best) showPopup(best, cx, cy);
  else {
    const [mx, my] = screenToMap(sx, sy);
    showPopup({ kind: 'ground', x: mx, y: my }, cx, cy);
  }
}
