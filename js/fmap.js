'use strict';
/* =========================================================
   Taç ve Hançer — Harita: arazi dokusu, piksel bölgeler,
   ulus adları, yapılar, gemiler, ateş; dokunmatik kontroller
   ========================================================= */

const CAM = { x: 30, y: 25, z: 20 };
let MAPCV = null, MCTX = null;
let TCV = null, OCV = null, OCTX = null, OIMG = null, O32 = null;
let MAPDIRTY = true;
const SEL = { t: -1 };

/* ---------- Arazi dokusu (bir kez çizilir) ---------- */
function biome(t) {
  const x = tx(t), y = ty(t);
  // Sınırlar düz çizgi olmasın: enlem/boylamı düşük frekanslı gürültüyle kaydır
  const lon = x * TS / MAP.COS + MAP.LON0 + (vnoise(x / 35, y / 35) - 0.5) * 12 + (vnoise(x / 9, y / 9) - 0.5) * 3;
  const lat = MAP.LAT1 - y * TS + (vnoise(x / 35 + 50, y / 35 + 50) - 0.5) * 9 + (vnoise(x / 9 + 9, y / 9 + 9) - 0.5) * 2.5;
  const al = Math.abs(lat);
  if (al > 66) return 'ice';
  if (al > 58) return 'tundra';
  if ((lat > 15 && lat < 33 && lon > -17 && lon < 62) || (lat > 34 && lat < 47 && lon > 52 && lon < 112 && !(lon > 70 && lon < 80 && lat < 40)) || (lat < -18 && lat > -32 && lon > 115 && lon < 145) || (lat > 24 && lat < 37 && lon > -117 && lon < -103) || (lat < -15 && lat > -30 && lon > -72 && lon < -68)) return 'desert';
  if (lat > 10 && lat < 16 && lon > -17 && lon < 40) return 'savanna';
  if (al < 13) return 'jungle';
  if ((lat > 45 && lat < 55 && lon > 30 && lon < 85) || (lat > 30 && lat < 50 && lon > -105 && lon < -95) || (lat < -25 && lat > -40 && lon > -65 && lon < -57)) return 'steppe';
  return al > 48 ? 'boreal' : 'temperate';
}
const BIOME_COL = {
  ice: [226, 232, 234], tundra: [150, 160, 138], boreal: [86, 112, 74], temperate: [112, 136, 82], steppe: [162, 158, 104],
  desert: [206, 182, 128], savanna: [170, 158, 92], jungle: [70, 112, 60],
};
function buildTerrainCanvas() {
  if (TCV) return;
  TCV = document.createElement('canvas'); TCV.width = FW; TCV.height = FH;
  const c = TCV.getContext('2d'), img = c.createImageData(FW, FH), d = img.data;
  for (let t = 0; t < FN; t++) {
    const o = t * 4, x = tx(t), y = ty(t);
    if (TER[t] === 0) {
      const k = Math.min(SDIST[t], 18) / 18, n = (hash2(x, y) - 0.5) * 4;
      d[o] = 44 - k * 22 + n; d[o + 1] = 82 - k * 34 + n; d[o + 2] = 104 - k * 30 + n; d[o + 3] = 255;
      if (SDIST[t] === 1) { d[o] += 18; d[o + 1] += 22; d[o + 2] += 20; }
      continue;
    }
    const b = BIOME_COL[biome(t)], n = (hash2(x, y) - 0.5) * 7 + (vnoise(x / 6, y / 6) - 0.5) * 14, e = ELEV[t];
    let r = b[0], g = b[1], bl = b[2];
    if (TER[t] === 2) { r = r * 0.82 + 30; g = g * 0.8 + 22; bl = bl * 0.8 + 14; }
    if (TER[t] === 3) { const s = e > 1.12 ? 1 : 0; r = s ? 222 : 126; g = s ? 222 : 114; bl = s ? 224 : 102; }
    // Kabartma gölgesi (kuzeybatıdan ışık)
    const tn = t - FW - 1 >= 0 ? ELEV[t - FW - 1] : e;
    const sh = clamp((e - tn) * 160, -26, 26);
    d[o] = clamp(r + n + sh, 0, 255); d[o + 1] = clamp(g + n + sh, 0, 255); d[o + 2] = clamp(bl + n * 0.8 + sh, 0, 255); d[o + 3] = 255;
    if (SDIST[t] === 1) { d[o] = d[o] * 0.86; d[o + 1] = d[o + 1] * 0.86; d[o + 2] = d[o + 2] * 0.86; }
  }
  c.putImageData(img, 0, 0);
}

/* ---------- Bölge katmanı (değişen kareler güncellenir) ---------- */
function tilePix(t) {
  const o = OWN[t];
  if (!o) { const b = BURN[t]; return b ? pack(24, 16, 10, (b * 0.6) | 0) : 0; }
  const R = NR[o - 1];
  let v = R.border.has(t) ? R.b32 : R.f32;
  if (BURN[t]) { const k = 1 - BURN[t] / 400; v = pack(R.rgb[0] * k | 0, R.rgb[1] * k | 0, R.rgb[2] * k | 0, 200); }
  return v;
}
let _lastPaint = 0;
function flushTerritory(time, force) {
  if (!OCV) {
    OCV = document.createElement('canvas'); OCV.width = FW; OCV.height = FH;
    OCTX = OCV.getContext('2d'); OIMG = OCTX.createImageData(FW, FH); O32 = new Uint32Array(OIMG.data.buffer);
    FULLPAINT = true;
  }
  if (!force && time - _lastPaint < 110) return;
  if (FULLPAINT) {
    for (let t = 0; t < FN; t++) O32[t] = tilePix(t);
    OCTX.putImageData(OIMG, 0, 0);
    FULLPAINT = false; DIRTYL.length = 0; DIRTYF.fill(0); _lastPaint = time; MAPDIRTY = true;
    return;
  }
  if (!DIRTYL.length) return;
  let x0 = FW, y0 = FH, x1 = -1, y1 = -1;
  for (const t of DIRTYL) {
    DIRTYF[t] = 0; O32[t] = tilePix(t);
    const x = t % FW, y = (t / FW) | 0;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  DIRTYL.length = 0;
  OCTX.putImageData(OIMG, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  _lastPaint = time; MAPDIRTY = true;
}

/* ---------- Kurulum ---------- */
function setupMap(cv) {
  MAPCV = cv; MCTX = cv.getContext('2d');
  buildTerrainCanvas();
  resizeMap();
  window.addEventListener('resize', resizeMap);
  setupMapInput(cv);
}
function resizeMap() {
  if (!MAPCV) return;
  const d = Math.min(2, window.devicePixelRatio || 1);
  MAPCV.width = MAPCV.clientWidth * d; MAPCV.height = MAPCV.clientHeight * d;
  MAPCV._d = d;
  MAPDIRTY = true;
}
function invalidateMap() { MAPDIRTY = true; }
function screenToMap(sx, sy) {
  const d = MAPCV._d, w = MAPCV.width / d, h = MAPCV.height / d;
  return [CAM.x + (sx - w / 2) / CAM.z, CAM.y + (sy - h / 2) / CAM.z];
}
function mapToScreen(x, y) {
  const d = MAPCV._d, w = MAPCV.width / d, h = MAPCV.height / d;
  return [(x - CAM.x) * CAM.z + w / 2, (y - CAM.y) * CAM.z + h / 2];
}
function centerOn(x, y, z) { CAM.x = x; CAM.y = y; if (z) CAM.z = Math.max(CAM.z, z); MAPDIRTY = true; }
function centerOnTile(t, z) { const [x, y] = tileCenter(t); centerOn(x, y, z); }

/* ---------- Çizim ---------- */
let _lastCam = '', _lastDraw = 0;
function drawMap(time, live) {
  if (!MAPCV || !G || !OWN) return;
  flushTerritory(time, false);
  const cam = CAM.x.toFixed(3) + ',' + CAM.y.toFixed(3) + ',' + CAM.z.toFixed(2) + ',' + SEL.t;
  const moving = live && (G.ships.length || PROJ.length || FX.length);
  if (!MAPDIRTY && cam === _lastCam && !moving && time - _lastDraw < 250) return;
  if (moving && cam === _lastCam && !MAPDIRTY && time - _lastDraw < 33) return;
  _lastCam = cam; _lastDraw = time; MAPDIRTY = false;
  const ctx = MCTX, d = MAPCV._d, W = MAPCV.width / d, H = MAPCV.height / d, z = CAM.z, tp = TS * z;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.fillStyle = '#16303d'; ctx.fillRect(0, 0, W, H);
  // Görünen kareler
  const [mx0, my0] = screenToMap(0, 0), [mx1, my1] = screenToMap(W, H);
  const i0 = clamp(Math.floor(mx0 / TS) - 1, 0, FW), j0 = clamp(Math.floor(my0 / TS) - 1, 0, FH);
  const i1 = clamp(Math.ceil(mx1 / TS) + 1, 0, FW), j1 = clamp(Math.ceil(my1 / TS) + 1, 0, FH);
  if (i1 > i0 && j1 > j0) {
    const [sx, sy] = mapToScreen(i0 * TS, j0 * TS);
    ctx.imageSmoothingEnabled = tp < 1.6;
    ctx.drawImage(TCV, i0, j0, i1 - i0, j1 - j0, sx, sy, (i1 - i0) * tp, (j1 - j0) * tp);
    ctx.drawImage(OCV, i0, j0, i1 - i0, j1 - j0, sx, sy, (i1 - i0) * tp, (j1 - j0) * tp);
  }
  const vis = (x, y, m = 40) => x > -m && y > -m && x < W + m && y < H + m;
  // Seçili kare
  if (SEL.t >= 0) {
    const [sx, sy] = mapToScreen(tx(SEL.t) * TS, ty(SEL.t) * TS);
    ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff3c4';
    const s = Math.max(tp, 5);
    ctx.strokeRect(sx + tp / 2 - s / 2 - 1, sy + tp / 2 - s / 2 - 1, s + 2, s + 2);
  }
  // Yapılar
  const us = clamp(tp * 2.6, 5, 22);
  if (tp >= 0.9) for (const u of G.units) {
    const [sx, sy] = mapToScreen((tx(u.t) + 0.5) * TS, (ty(u.t) + 0.5) * TS);
    if (!vis(sx, sy)) continue;
    const R = NR[u.n], col = R ? `rgb(${R.rgb[0]},${R.rgb[1]},${R.rgb[2]})` : '#888';
    if (us < 8) { if (tp < 1.6 && u.k !== 'kasaba') continue; ctx.fillStyle = 'rgba(12,8,4,.9)'; ctx.fillRect(sx - 2, sy - 2, 4, 4); ctx.fillStyle = UNITS[u.k].mark; ctx.fillRect(sx - 1, sy - 1, 2, 2); continue; }
    ctx.beginPath(); ctx.arc(sx, sy, us * 0.62, 0, 6.2832); ctx.fillStyle = 'rgba(14,10,6,.86)'; ctx.fill();
    ctx.lineWidth = 1.6; ctx.strokeStyle = col; ctx.stroke();
    drawIcon(ctx, UNITS[u.k].i, sx, sy, us * 0.82, UNITS[u.k].mark, null);
    if (u.lvl > 1) { ctx.font = `700 ${Math.round(us * 0.42)}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 2.5; ctx.strokeStyle = '#120c06'; ctx.fillStyle = '#ffe9a8'; ctx.strokeText(u.lvl, sx + us * 0.55, sy - us * 0.5); ctx.fillText(u.lvl, sx + us * 0.55, sy - us * 0.5); }
    if (u.k === 'kule' && u.cd > G.tick) { ctx.beginPath(); ctx.arc(sx, sy, us * 0.75, -1.57, -1.57 + 6.2832 * (1 - (u.cd - G.tick) / 80)); ctx.strokeStyle = '#9fe0a0'; ctx.lineWidth = 1.2; ctx.stroke(); }
  }
  // Ulus adları önce yer ayırır (yerleşim adları onların üstüne binmesin)
  const mine = myNatIdx(), natLabels = [];
  const placed = [];
  const free_ = (x0, y0, x1, y1) => { if (placed.some(q => x0 < q[2] && x1 > q[0] && y0 < q[3] && y1 > q[1])) return false; placed.push([x0, y0, x1, y1]); return true; };
  {
    const order = G.nat.filter(n => n.alive && NR[n.i].tiles >= 6).sort((a, b) => NR[b.i].tiles - NR[a.i].tiles);
    for (const n of order) {
      const R = NR[n.i];
      const fs = clamp(Math.sqrt(R.tiles) * tp * 0.3, 0, 40);
      if (fs < 8) continue;
      const lt = natLabelTile(n.i);
      if (lt < 0) continue;
      const [sx, sy] = mapToScreen((tx(lt) + 0.5) * TS, (ty(lt) + 0.5) * TS);
      if (!vis(sx, sy, 120)) continue;
      const name = natName(n, true);
      ctx.font = `700 ${fs}px "Cinzel", Georgia, serif`;
      const tw = ctx.measureText(name).width;
      if (!free_(sx - tw / 2, sy - fs * 0.7, sx + tw / 2, sy + fs * 1.1)) continue;
      natLabels.push([n, sx, sy, fs, tw, name]);
    }
  }
  // Yerleşim adları
  if (z >= 13) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (const s of settlements()) {
      if (s.tile == null || s.tile < 0) continue;
      const [sx, sy] = mapToScreen((tx(s.tile) + 0.5) * TS, (ty(s.tile) + 0.5) * TS);
      if (!vis(sx, sy)) continue;
      if (!UNIT_AT.get(s.tile)) { ctx.fillStyle = 'rgba(14,10,6,.85)'; ctx.fillRect(sx - 2, sy - 2, 4, 4); ctx.fillStyle = '#efe3c8'; ctx.fillRect(sx - 1, sy - 1, 2, 2); }
      if (z < 20 && !s.capital) continue;
      const fs = clamp(z * 0.42, 9, 13) * (s.capital ? 1.08 : 1);
      ctx.font = `${s.capital ? 700 : 600} ${fs}px Alegreya, Georgia, serif`;
      const w2 = ctx.measureText(s.name).width / 2, yy = sy + Math.max(us * 0.65, 4) + 1;
      if (!free_(sx - w2, yy, sx + w2, yy + fs)) continue;
      ctx.lineWidth = 2.6; ctx.strokeStyle = 'rgba(15,10,5,0.82)'; ctx.fillStyle = s.holder === G.playerId ? '#ffd76a' : '#efe3c8';
      ctx.strokeText(s.name, sx, yy); ctx.fillText(s.name, sx, yy);
    }
  }
  // Gemiler
  for (const s of G.ships) {
    const [x, y] = shipXY(s), [sx, sy] = mapToScreen(x, y);
    if (!vis(sx, sy)) continue;
    const R = NR[s.n], col = R ? `rgb(${R.rgb[0]},${R.rgb[1]},${R.rgb[2]})` : '#ccc';
    const nx = s.path[Math.min(s.path.length - 1, Math.floor(s.i) + 1)], cx_ = s.path[Math.floor(Math.min(s.i, s.path.length - 1))];
    const ang = Math.atan2(ty(nx) - ty(cx_), tx(nx) - tx(cx_)) || 0;
    drawShip(ctx, sx, sy, ang, s.k, col, clamp(tp * 2.2, 6, 16));
    if (s.k === 'gemi' && tp > 2) { ctx.font = '700 10px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.lineWidth = 2.5; ctx.strokeStyle = '#120c06'; ctx.fillStyle = '#fff'; ctx.strokeText(fmtCount(s.troops), sx, sy - 8); ctx.fillText(fmtCount(s.troops), sx, sy - 8); }
  }
  // Ateş
  for (const pr of PROJ) {
    const [x, y] = projXY(pr), [sx, sy] = mapToScreen(x, y), [ex, ey] = mapToScreen(...tileCenter(pr.b));
    ctx.setLineDash([4, 4]); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,140,60,.55)';
    ctx.beginPath(); ctx.arc(ex, ey, pr.r * tp, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]);
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, 9);
    g.addColorStop(0, '#fff6c0'); g.addColorStop(0.4, '#ff9a30'); g.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, 9, 0, 6.2832); ctx.fill();
  }
  for (const f of FX) {
    const [sx, sy] = mapToScreen(f.x, f.y), k = f.t / f.T;
    ctx.beginPath(); ctx.arc(sx, sy, Math.max(4, f.r * z * (0.4 + k * 0.8)), 0, 6.2832);
    ctx.fillStyle = f.c; ctx.globalAlpha = (1 - k) * 0.55; ctx.fill(); ctx.globalAlpha = 1;
  }
  // Ulus adları ve asker sayıları
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const [n, sx, sy, fs, tw, name] of natLabels) {
    ctx.font = `700 ${fs}px "Cinzel", Georgia, serif`;
    ctx.lineWidth = Math.max(2.5, fs / 6); ctx.strokeStyle = 'rgba(12,8,4,.78)';
    ctx.fillStyle = n.i === mine ? '#ffe7a0' : 'rgba(255,248,232,.95)';
    ctx.strokeText(name, sx, sy - fs * 0.15); ctx.fillText(name, sx, sy - fs * 0.15);
    const tf = Math.max(8, fs * 0.55);
    ctx.font = `700 ${tf}px system-ui, sans-serif`;
    const tr = fmtCount(n.troops);
    ctx.lineWidth = Math.max(2, tf / 5); ctx.strokeText(tr, sx, sy + fs * 0.62); ctx.fillStyle = n.i === mine ? '#ffe7a0' : '#f3ead8'; ctx.fillText(tr, sx, sy + fs * 0.62);
    if (fs >= 13) {
      const im = flagImage(natFlagObj(n));
      if (im) { const fh = fs * 0.7, fw = fh * 1.5, fx = sx - tw / 2 - fw - 5, fy = sy - fs * 0.15 - fh / 2; ctx.fillStyle = 'rgba(10,7,4,.6)'; ctx.fillRect(fx + 1.5, fy + 1.5, fw, fh); ctx.drawImage(im, fx, fy, fw, fh); }
    }
  }
}
function drawShip(ctx, x, y, a, k, col, s) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a);
  ctx.lineWidth = 1.2; ctx.strokeStyle = '#120c06';
  if (k === 'tuccar') {
    ctx.fillStyle = '#e8d29a'; ctx.beginPath(); ctx.moveTo(s * 0.55, 0); ctx.lineTo(-s * 0.4, -s * 0.28); ctx.lineTo(-s * 0.4, s * 0.28); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = col; ctx.fillRect(-s * 0.12, -s * 0.12, s * 0.24, s * 0.24);
  } else if (k === 'kadirga') {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(s * 0.75, 0); ctx.lineTo(s * 0.2, -s * 0.3); ctx.lineTo(-s * 0.6, -s * 0.26); ctx.lineTo(-s * 0.6, s * 0.26); ctx.lineTo(s * 0.2, s * 0.3); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,240,200,.8)'; ctx.lineWidth = 1;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * s * 0.15, -s * 0.3); ctx.lineTo(i * s * 0.15 - s * 0.08, -s * 0.55); ctx.moveTo(i * s * 0.15, s * 0.3); ctx.lineTo(i * s * 0.15 - s * 0.08, s * 0.55); ctx.stroke(); }
  } else {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(s * 0.6, 0); ctx.lineTo(-s * 0.45, -s * 0.32); ctx.lineTo(-s * 0.3, 0); ctx.lineTo(-s * 0.45, s * 0.32); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
}

/* ---------- Dokunmatik ---------- */
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
      zoomAt(pinch.mx, pinch.my, clamp(pinch.z * nd / pinch.d, 3, 140));
    } else if (pts.size === 1 && start) {
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (Math.hypot(dx, dy) > 8) moved = true;
      if (moved) { CAM.x = start.cx - dx / CAM.z; CAM.y = start.cy - dy / CAM.z; MAPDIRTY = true; }
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
  cv.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, clamp(CAM.z * (e.deltaY < 0 ? 1.15 : 0.87), 3, 140)); }, { passive: false });
}
function zoomAt(sx, sy, nz) {
  const r = MAPCV.getBoundingClientRect();
  const [mx, my] = screenToMap(sx - r.left, sy - r.top);
  CAM.z = nz;
  const [mx2, my2] = screenToMap(sx - r.left, sy - r.top);
  CAM.x += mx - mx2; CAM.y += my - my2;
  MAPDIRTY = true;
}
function mapTap(cx, cy) {
  const r = MAPCV.getBoundingClientRect();
  const sx = cx - r.left, sy = cy - r.top;
  if (UI.drawer) closeDrawer();
  const [mx, my] = screenToMap(sx, sy);
  let t = tileAtXY(mx, my);
  // Yapıya ya da yerleşime yakın dokunuş onu seçer
  let best = -1, bd = 16;
  for (const u of G.units) { const [px, py] = mapToScreen((tx(u.t) + 0.5) * TS, (ty(u.t) + 0.5) * TS); const dd = Math.hypot(px - sx, py - sy); if (dd < bd) { bd = dd; best = u.t; } }
  if (best >= 0) t = best;
  if (t < 0 || (SEL.t === t && UI.pop)) { closePop(); return; }
  openPop(t, sx, sy);
}
