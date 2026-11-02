'use strict';
/* =========================================================
   Crown & Dagger — Harita çizimi (keskin sınırlı iller),
   dokunmatik kontroller; savaş ekranı joystick'i
   ========================================================= */

const CAM = { x: 30, y: 25, z: 26, follow: true };
const JOY = { active: false, vx: 0, vy: 0, id: null };
let MAPCV = null, MCTX = null, LANDPATH = null, SEAPAT = null;
let PROVPATH = null, TERR = null;
const PARTY_SCREEN = new Map(); // ordu id -> çizildiği ekran noktası (dokunma için) // TERR: { fills: [[renk, Path2D]], realmBorder: Path2D }

/* ---------- Joystick (savaş ekranı) ---------- */
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
  el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); JOY.active = true; JOY.id = e.pointerId; el.setPointerCapture(e.pointerId); upd(e); });
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
  if (x || y) { const m = Math.hypot(x, y); return [x / m, y / m]; }
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
  PROVPATH = new Path2D();
  for (const e of PROV_EDGES) linePath(PROVPATH, e.pts);
  // Deniz dokusu: ince, keskin yatay çizgiler
  const t = document.createElement('canvas'); t.width = t.height = 48;
  const c = t.getContext('2d');
  c.fillStyle = 'rgba(170,205,215,0.06)';
  c.fillRect(4, 10, 16, 1); c.fillRect(28, 26, 14, 1); c.fillRect(10, 40, 12, 1);
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
function linePath(path, pts) {
  path.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) path.lineTo(pts[i][0], pts[i][1]);
}
function polyPath(path, poly) {
  path.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) path.lineTo(poly[i][0], poly[i][1]);
  path.closePath();
}
/* İl sahibinin anahtarı: krallık > bağımsız sahip > sahipsiz */
function provOwnerKey(pv) {
  const s = provSettlement(pv);
  if (!s) return 'wild';
  if (s.liege && G.titles[s.liege] && !G.titles[s.liege].dead) return s.liege;
  return s.holder != null ? 'h' + s.holder : 'wild';
}
function buildTerritory() {
  const groups = new Map();
  const keys = PROV.map(provOwnerKey);
  PROV.forEach((pv, i) => {
    const k = keys[i];
    if (k === 'wild') return;
    let g = groups.get(k);
    if (!g) {
      const r = G.titles[k];
      g = { col: r ? r.color : '#9a9080', path: new Path2D(), mine: false };
      groups.set(k, g);
    }
    polyPath(g.path, pv.rough);
  });
  const border = new Path2D();
  for (const e of PROV_EDGES) if (keys[e.a] !== keys[e.b]) linePath(border, e.pts);
  TERR = { fills: [...groups.values()], border, keys };
  G.terrDirty = false;
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
  if (G.terrDirty || !TERR) buildTerritory();
  const ctx = MCTX, d = MAPCV._d, W = MAPCV.width / d, H = MAPCV.height / d;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.imageSmoothingEnabled = false;
  // Deniz
  ctx.fillStyle = '#183440'; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.translate((-CAM.x * CAM.z) % 48, (-CAM.y * CAM.z) % 48); ctx.fillStyle = SEAPAT; ctx.fillRect(-48, -48, W + 96, H + 96); ctx.restore();
  const z = CAM.z, px = 1 / z;
  ctx.setTransform(d * z, 0, 0, d * z, d * (W / 2 - CAM.x * z), d * (H / 2 - CAM.y * z));
  // Kara: keskin, gölgesiz; kıyı için tek bir koyu öteleme
  ctx.save(); ctx.translate(2.5 * px, 2.5 * px); ctx.fillStyle = 'rgba(8,16,20,0.55)'; ctx.fill(LANDPATH); ctx.restore();
  ctx.fillStyle = '#b7a57c'; ctx.fill(LANDPATH);
  ctx.save(); ctx.clip(LANDPATH);
  // İller: krallık renkleri (her krallık tek yol → iç dikiş yok)
  ctx.globalAlpha = 0.78;
  for (const g of TERR.fills) { ctx.fillStyle = g.col; ctx.fill(g.path); }
  ctx.globalAlpha = 1;
  // İl sınırları (ince) ve krallık sınırları (kalın)
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(0.6, Math.min(1.1, z / 30)) * px; ctx.strokeStyle = 'rgba(28,20,12,0.38)'; ctx.stroke(PROVPATH);
  ctx.lineWidth = 2.4 * px; ctx.strokeStyle = 'rgba(18,12,6,0.92)'; ctx.stroke(TERR.border);
  ctx.lineWidth = 0.8 * px; ctx.strokeStyle = 'rgba(255,240,205,0.35)'; ctx.stroke(TERR.border);
  // Seçili il
  if (UI.selProv != null && PROV[UI.selProv]) {
    const sp = new Path2D(); polyPath(sp, PROV[UI.selProv].rough);
    ctx.fillStyle = 'rgba(255,225,140,0.18)'; ctx.fill(sp);
    ctx.lineWidth = 2.2 * px; ctx.strokeStyle = '#ffd76a'; ctx.stroke(sp);
  }
  ctx.restore();
  ctx.lineWidth = 1.2 * px; ctx.strokeStyle = 'rgba(14,10,6,0.9)'; ctx.stroke(LANDPATH);
  // Rota (tur tabanlı)
  const route = pp ? routePreview(pp) : null;
  if (route) {
    ctx.lineWidth = 2.4 * px; ctx.strokeStyle = 'rgba(15,10,5,0.8)';
    ctx.beginPath(); ctx.moveTo(route.pts[0][0], route.pts[0][1]); for (const p of route.pts) ctx.lineTo(p[0], p[1]); ctx.stroke();
    ctx.setLineDash([5 * px, 3 * px]); ctx.lineWidth = 1.4 * px; ctx.strokeStyle = '#ffe08a';
    ctx.beginPath(); ctx.moveTo(route.pts[0][0], route.pts[0][1]); for (const p of route.pts) ctx.lineTo(p[0], p[1]); ctx.stroke();
    ctx.setLineDash([]);
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
      const fs = clamp(z * 0.55 * Math.sqrt(ss.length), 10, 24);
      ctx.font = `700 ${fs}px "Cinzel", Georgia, serif`;
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(15,10,5,0.75)'; ctx.fillStyle = 'rgba(255,246,226,0.92)';
      const label = realmShort(r).toLocaleUpperCase(LANG === 'tr' ? 'tr' : 'en');
      ctx.strokeText(label, sx, sy - 14); ctx.fillText(label, sx, sy - 14);
    }
  }
  // Yerleşimler
  const showNames = z >= 16;
  const names = [];
  for (const s of settlements()) {
    const [sx, sy] = mapToScreen(s.x, s.y);
    if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
    const r = s.liege ? G.titles[s.liege] : null;
    const col = r && !r.dead ? r.color : '#777';
    const size = clamp(z * 0.22, 4, 9) * (s.kind === 'sehir' ? 1.15 : 1);
    ctx.fillStyle = '#14100c'; ctx.fillRect(sx - size - 1.5, sy - size - 1.5, size * 2 + 3, size * 2 + 3);
    ctx.fillStyle = '#f3e7cc'; ctx.fillRect(sx - size, sy - size, size * 2, size * 2);
    ctx.fillStyle = col;
    if (s.kind === 'kale') { ctx.fillRect(sx - size * 0.55, sy - size * 0.55, size * 1.1, size * 1.1); }
    else { ctx.beginPath(); ctx.moveTo(sx, sy - size * 0.7); ctx.lineTo(sx + size * 0.7, sy); ctx.lineTo(sx, sy + size * 0.7); ctx.lineTo(sx - size * 0.7, sy); ctx.closePath(); ctx.fill(); }
    if (s.capital) { ctx.font = `${Math.round(size * 1.5)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillStyle = '#ffd76a'; ctx.fillText('★', sx, sy - size - 1); }
    if (s.siege) { ctx.font = `${Math.round(size * 1.8)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🔥', sx + size * 1.7, sy - size); }
    if (showNames || s.capital) names.push([s, sx, sy + size + 3]);
  }
  // Ordular (köşeli sancak)
  const pulse = 0.5 + 0.5 * Math.sin(time / 180);
  const stack = new Map(), setSize = clamp(z * 0.22, 4, 9) * 1.15;
  PARTY_SCREEN.clear();
  const order = G.parties.slice().sort((a, b) => (a.kind === 'player') - (b.kind === 'player'));
  for (const pt of order) {
    let [sx, sy] = mapToScreen(pt.x, pt.y);
    if (sx < -30 || sx > W + 30 || sy < -30 || sy > H + 30) continue;
    const isP = pt.kind === 'player';
    const hostile = !isP && pp && hostileParties(pp, pt);
    // Uzak görünümde kalabalığı azalt: yalnızca oyuncu ve düşman lord orduları
    if (z < 14 && !isP && (pt.kind === 'bandit' || !hostile)) continue;
    // Aynı yerdeki ordular ve yerleşim simgeleri üst üste binmesin
    const key = Math.round(pt.x * 8) + ',' + Math.round(pt.y * 8);
    const k = stack.get(key) || 0; stack.set(key, k + 1);
    const onSett = settlements().some(s => Math.abs(s.x - pt.x) < 0.12 && Math.abs(s.y - pt.y) < 0.12);
    sx += (onSett ? setSize + 9 : 0) + k * 13; sy -= k * 3;
    PARTY_SCREEN.set(pt.id, [sx, sy]);
    const c = ch(pt.owner);
    const r = c ? realmOf(c) : null;
    const n = troopCount(pt);
    const rad = clamp(3.5 + Math.sqrt(n) * 0.4, 4.5, 10) * (z < 14 ? 0.75 : 1) * (isP ? 1.2 : 1);
    if (hostile) { ctx.strokeStyle = `rgba(255,70,50,${0.45 + pulse * 0.5})`; ctx.lineWidth = 2; ctx.strokeRect(sx - rad - 4, sy - rad * 1.8 - 3, rad * 2 + 8, rad * 2.6 + 6); }
    const col = isP ? '#ffcf4a' : pt.kind === 'bandit' ? '#2a2420' : r ? r.color : '#8a8070';
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(sx - rad * 0.9 + 1.5, sy + rad * 0.45, rad * 1.8, rad * 0.35);
    ctx.strokeStyle = '#1a1208'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(sx - rad * 0.6, sy + rad * 0.6); ctx.lineTo(sx - rad * 0.6, sy - rad * 1.7); ctx.stroke();
    ctx.fillStyle = col; ctx.strokeStyle = isP ? '#fff' : 'rgba(0,0,0,0.7)'; ctx.lineWidth = isP ? 2 : 1;
    ctx.beginPath(); ctx.moveTo(sx - rad * 0.6, sy - rad * 1.7); ctx.lineTo(sx + rad * 1.1, sy - rad * 1.7); ctx.lineTo(sx + rad * 0.7, sy - rad * 1.15); ctx.lineTo(sx + rad * 1.1, sy - rad * 0.6); ctx.lineTo(sx - rad * 0.6, sy - rad * 0.6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillRect(sx - rad * 0.55, sy - rad * 0.5, rad * 1.1, rad * 1.1); ctx.strokeRect(sx - rad * 0.55, sy - rad * 0.5, rad * 1.1, rad * 1.1);
    if (pt.kind === 'bandit') { ctx.fillStyle = '#e8e0d0'; ctx.font = `${Math.round(rad)}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('☠', sx, sy + 0.05 * rad); }
    if (isP || z >= 34 || (hostile && z >= 18)) {
      ctx.font = `700 ${isP ? 12 : 10}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.fillStyle = isP ? '#ffe08a' : hostile ? '#ffb4a8' : '#f2ead8';
      const label = isP ? `${L('Sen', 'You')} · ${n}` : `${n}`;
      ctx.strokeText(label, sx, sy + rad * 0.85 + 2); ctx.fillText(label, sx, sy + rad * 0.85 + 2);
    }
    if (pt.mode === 'siege' && pt.sid && G.titles[pt.sid] && G.titles[pt.sid].siege) { ctx.font = '11px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('⚔', sx + rad + 4, sy - rad); }
  }
  // Tur durakları
  if (route) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '700 10px system-ui, sans-serif';
    for (const st of route.stops) {
      const [sx, sy] = mapToScreen(st.x, st.y);
      const s = 8;
      ctx.fillStyle = st.n === 1 ? '#ffd76a' : '#2a2016'; ctx.strokeStyle = st.n === 1 ? '#1a1208' : '#ffd76a'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sx, sy - s); ctx.lineTo(sx + s, sy); ctx.lineTo(sx, sy + s); ctx.lineTo(sx - s, sy); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = st.n === 1 ? '#1a1208' : '#ffd76a'; ctx.fillText(String(st.n), sx, sy + 0.5);
    }
  }
  // Yerleşim adları en üstte
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (const [s, x, y] of names) {
    ctx.font = `${s.kind === 'sehir' ? 700 : 500} ${clamp(z * 0.42, 10, 15)}px Alegreya, Georgia, serif`;
    ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(15,10,5,0.9)'; ctx.fillStyle = s.holder === G.playerId ? '#ffd76a' : '#f5ead2';
    ctx.strokeText(s.name, x, y); ctx.fillText(s.name, x, y);
  }
}
/* Oyuncunun rotası: çizgi noktaları ve tur durakları */
function routePreview(pp) {
  const pts = [[pp.x, pp.y]], stops = [];
  let from = partyProv(pp);
  if (!from) return null;
  if (pp.leg && G.turnLeft > 0) {
    const e = pp.leg.pts[pp.leg.pts.length - 1];
    pts.push(e); stops.push({ x: e[0], y: e[1], n: 1 });
    from = provinceAt(e[0], e[1]);
  }
  const path = pp.path || [];
  if (!path.length) return stops.length ? { pts, stops } : null;
  const turns = splitTurns(from.id, path, movePoints(pp));
  const base = stops.length;
  turns.forEach((tr, i) => {
    for (const id of tr) pts.push([PROV[id].x, PROV[id].y]);
    const last = PROV[tr[tr.length - 1]];
    stops.push({ x: last.x, y: last.y, n: base + i + 1 });
  });
  return { pts, stops };
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
  if (G.turnLeft > 0) return;
  const r = MAPCV.getBoundingClientRect();
  const sx = cx - r.left, sy = cy - r.top;
  let best = null, bd = 22;
  for (const pt of G.parties) { const sp = PARTY_SCREEN.get(pt.id); if (!sp) continue; const dd = Math.hypot(sp[0] - sx, sp[1] - sy + 6); if (dd < bd) { bd = dd; best = { kind: 'party', obj: pt }; } }
  for (const s of settlements()) { const [px, py] = mapToScreen(s.x, s.y); const dd = Math.hypot(px - sx, py - sy); if (dd < bd) { bd = dd; best = { kind: 'sett', obj: s }; } }
  if (best) { UI.selProv = partyProv(best.obj).id; showPopup(best, cx, cy); }
  else {
    const [mx, my] = screenToMap(sx, sy);
    const pv = provinceAtExact(mx, my);
    if (!pv || !isLand(mx, my) && Math.hypot(pv.x - mx, pv.y - my) > 2.5) { UI.selProv = null; hidePopup(); return; }
    UI.selProv = pv.id;
    showPopup({ kind: 'prov', obj: pv }, cx, cy);
  }
}
