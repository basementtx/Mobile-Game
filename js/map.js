'use strict';
/* =========================================================
   Crown & Dagger — Harita çizimi (keskin sınırlı iller),
   dokunmatik kontroller
   ========================================================= */

const CAM = { x: 30, y: 25, z: 26, follow: true };
let MAPCV = null, MCTX = null, LANDPATH = null, SEAPAT = null;
let TERR = null;
// TERR: { fills: [[renk, Path2D]], realmBorder: Path2D }

/* ---------- Harita kurulumu ---------- */
function setupMap(cv) {
  MAPCV = cv; MCTX = cv.getContext('2d');
  LANDPATH = new Path2D();
  for (const p of LANDP) for (const r of p.rings) {
    LANDPATH.moveTo(r[0][0], r[0][1]);
    for (let i = 1; i < r.length; i++) LANDPATH.lineTo(r[i][0], r[i][1]);
    LANDPATH.closePath();
  }
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
  if (typeof invalidateMap === 'function') invalidateMap();
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
  const keys = PROV.map(provOwnerKey);
  TERR = { keys, col: keys.map(k => (k === 'wild' ? null : G.titles[k] ? G.titles[k].color : '#9a9080')) };
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

/* ---------- Çizim ----------
   Ağır kısım (deniz, kara, iller, sınırlar) ekran + kenar payı büyüklüğünde
   ayrı bir tuvale bir kez çizilir (BASE); her karede yalnızca o resim kaydırılır
   ve üstüne hafif katman (yerleşimler, ordular, rota) çizilir. */
const BASE = { cv: null, ok: false, z: 0, cx: 0, cy: 0, W: 0, H: 0, d: 0, sel: null, zt: 0 };
const BASE_M = 0.4; // her yanda ekranın %40'ı kadar pay
function renderBase(W, H, d) {
  const z = CAM.z, BW = Math.ceil(W * (1 + 2 * BASE_M)), BH = Math.ceil(H * (1 + 2 * BASE_M));
  if (!BASE.cv) BASE.cv = document.createElement('canvas');
  const cv = BASE.cv;
  if (cv.width !== BW * d || cv.height !== BH * d) { cv.width = BW * d; cv.height = BH * d; }
  const ctx = cv.getContext('2d'), px = 1 / z;
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.fillStyle = '#183440'; ctx.fillRect(0, 0, BW, BH);
  ctx.setTransform(d * z, 0, 0, d * z, d * (BW / 2 - CAM.x * z), d * (BH / 2 - CAM.y * z));
  // Yalnızca görünen alandaki kara, iller ve sınırlar (kırpma)
  const x0 = CAM.x - BW / 2 / z, x1 = CAM.x + BW / 2 / z, y0 = CAM.y - BH / 2 / z, y1 = CAM.y + BH / 2 / z;
  const vis = b => b[2] >= x0 && b[0] <= x1 && b[3] >= y0 && b[1] <= y1;
  const land = new Path2D();
  for (const lp of LANDP) {
    if (lp.x1 < x0 || lp.x0 > x1 || lp.y1 < y0 || lp.y0 > y1) continue;
    for (const r of lp.rings) { land.moveTo(r[0][0], r[0][1]); for (let i = 1; i < r.length; i++) land.lineTo(r[i][0], r[i][1]); land.closePath(); }
  }
  ctx.fillStyle = '#b7a57c'; ctx.fill(land);
  const fills = new Map(), provP = new Path2D(), borderP = new Path2D(), k = lodFor(z);
  for (const pv of PROV) {
    const col = TERR.col[pv.id];
    if (!col || !vis(pv.bb)) continue;
    let p = fills.get(col); if (!p) fills.set(col, p = new Path2D());
    polyPath(p, pv.lod[k]);
  }
  for (const e of PROV_EDGES) {
    if (!vis(e.bb)) continue;
    if (TERR.keys[e.a] !== TERR.keys[e.b]) linePath(borderP, e.lod[k]); else if (z >= 11) linePath(provP, e.lod[k]);
  }
  ctx.globalAlpha = 0.78;
  for (const [col, p] of fills) { ctx.fillStyle = col; ctx.fill(p); }
  ctx.globalAlpha = 1;
  ctx.lineCap = 'butt'; ctx.lineJoin = 'bevel';
  if (z >= 11) { ctx.lineWidth = Math.max(0.6, Math.min(1.1, z / 30)) * px; ctx.strokeStyle = 'rgba(28,20,12,0.38)'; ctx.stroke(provP); }
  ctx.lineWidth = 2.4 * px; ctx.strokeStyle = 'rgba(18,12,6,0.92)'; ctx.stroke(borderP);
  ctx.lineWidth = 0.8 * px; ctx.strokeStyle = 'rgba(255,240,205,0.35)'; ctx.stroke(borderP);
  if (UI.selProv != null && PROV[UI.selProv]) {
    const sp = new Path2D(); polyPath(sp, PROV[UI.selProv].lod[k]);
    ctx.fillStyle = 'rgba(255,225,140,0.18)'; ctx.fill(sp);
    ctx.lineWidth = 2.2 * px; ctx.strokeStyle = '#ffd76a'; ctx.stroke(sp);
  }
  // Deniz maskesi: kara dışındaki her şeyi tek seferde örter (kırpmadan çok daha hızlı)
  const mask = new Path2D();
  mask.rect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2);
  mask.addPath(land);
  ctx.fillStyle = '#183440'; ctx.fill(mask, 'evenodd');
  ctx.lineWidth = 3 * px; ctx.strokeStyle = 'rgba(160,200,210,0.10)'; ctx.stroke(land);
  ctx.lineWidth = 1.3 * px; ctx.strokeStyle = 'rgba(14,10,6,0.9)'; ctx.stroke(land);
  Object.assign(BASE, { ok: true, z, cx: CAM.x, cy: CAM.y, W, H, d, BW, BH, sel: UI.selProv });
}
function invalidateMap() { BASE.ok = false; MAPDIRTY = true; }
let MAPDIRTY = true, _lastCam = '', _lastDraw = 0;
/* Bu karede çizmek gerekiyor mu? (boşta iken saniyede ~5 kare yeter) */
function mapNeedsDraw(time) {
  const cam = CAM.x.toFixed(4) + ',' + CAM.y.toFixed(4) + ',' + CAM.z.toFixed(3) + ',' + UI.selProv;
  const busy = G.turnLeft > 0 || cam !== _lastCam || MAPDIRTY || G.terrDirty;
  if (!busy && time - _lastDraw < 200) return false;
  _lastCam = cam; _lastDraw = time; MAPDIRTY = false;
  return true;
}
function drawMap(time) {
  if (!MAPCV || !G) return;
  const pp = playerParty();
  if (CAM.follow && pp) {
    const dx = pp.x - CAM.x, dy = pp.y - CAM.y;
    if (Math.abs(dx) + Math.abs(dy) < 0.002) { CAM.x = pp.x; CAM.y = pp.y; } else { CAM.x += dx * 0.2; CAM.y += dy * 0.2; }
  }
  if (!mapNeedsDraw(time)) return;
  if (G.terrDirty || !TERR) { buildTerritory(); BASE.ok = false; }
  const ctx = MCTX, d = MAPCV._d, W = MAPCV.width / d, H = MAPCV.height / d;
  const z = CAM.z, px = 1 / z;
  // Taban katmanı geçerli mi? (yakınlaştırma bitince, sınır aşılınca ya da seçim değişince yeniden çiz)
  if (BASE.z !== z) BASE.zt = time;
  const sc = BASE.ok ? z / BASE.z : 1;
  const offX = (BASE.cx - CAM.x) * z, offY = (BASE.cy - CAM.y) * z;
  const outside = !BASE.ok || Math.abs(offX) > W * BASE_M * 0.95 || Math.abs(offY) > H * BASE_M * 0.95;
  const zoomStale = BASE.ok && Math.abs(sc - 1) > 0.001 && (time - BASE.zt > 140 || sc < 0.8 || sc > 1.25);
  const bd = d;
  if (outside || zoomStale || BASE.W !== W || BASE.H !== H || BASE.d !== bd || BASE.sel !== UI.selProv) renderBase(W, H, bd);
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.fillStyle = '#183440'; ctx.fillRect(0, 0, W, H);
  const s = z / BASE.z;
  ctx.imageSmoothingEnabled = Math.abs(s - 1) > 0.001;
  ctx.drawImage(BASE.cv, (BASE.cx - CAM.x) * z - s * BASE.BW / 2 + W / 2, (BASE.cy - CAM.y) * z - s * BASE.BH / 2 + H / 2, BASE.BW * s, BASE.BH * s);
  ctx.setTransform(d * z, 0, 0, d * z, d * (W / 2 - CAM.x * z), d * (H / 2 - CAM.y * z));
  const SETTS = settlements();
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
      const ss = SETTS.filter(s => s.liege === r.id);
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
  for (const s of SETTS) {
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
    if (s.capital) drawIcon(ctx, 'crown', sx, sy - size * 1.9, size * 1.7, '#ffd76a', '#1a1208');
    if (s.siege) drawIcon(ctx, 'fire', sx + size * 1.8, sy - size, size * 1.9, '#ff8a2a', '#1a1208');
    if (showNames || s.capital) names.push([s, sx, sy + size + 3]);
  }
  // Ordular: haritada gezinen figür yok; her ilde, o ildeki askerlerin sayısı rozet olarak yazar
  drawArmyBadges(ctx, W, H, z, pp, SETTS);
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
/* İl -> o ildeki ordular */
function armiesByProvince() {
  const map = new Map();
  for (const pt of G.parties) {
    const pv = partyProv(pt);
    if (!pv) continue;
    let a = map.get(pv.id); if (!a) map.set(pv.id, a = []);
    a.push(pt);
  }
  return map;
}
/* Bir ildeki orduları taraflara göre topla (oyuncu, krallıklar, eşkıyalar) */
function armyGroups(list, pp) {
  const groups = new Map();
  for (const pt of list) {
    const isP = pt.kind === 'player';
    const c = ch(pt.owner), r = c ? realmOf(c) : null;
    const key = isP ? 'player' : pt.kind === 'bandit' ? 'bandit' : r ? r.id : 'o' + pt.owner;
    let g = groups.get(key);
    if (!g) groups.set(key, g = { key, n: 0, parties: [], isP, bandit: pt.kind === 'bandit', col: isP ? '#ffcf4a' : pt.kind === 'bandit' ? '#2a2420' : r ? r.color : '#8a8070', hostile: false, siege: false });
    g.n += troopCount(pt); g.parties.push(pt);
    if (!isP && pp && hostileParties(pp, pt)) g.hostile = true;
    if (pt.mode === 'siege' && pt.sid && G.titles[pt.sid] && G.titles[pt.sid].siege) g.siege = true;
  }
  return [...groups.values()].sort((a, b) => b.isP - a.isP || b.hostile - a.hostile || b.n - a.n);
}
function fmtCount(n) { return n >= 10000 ? Math.round(n / 1000) + 'k' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n); }
/* Ordular rozet olarak gerçek konumlarında çizilir: duran ordular il merkezinde toplanır,
   yürüyen ordular yolda akıcı biçimde ilerler ve gittikleri yer kesik çizgiyle gösterilir. */
function partyDest(pt) {
  if (pt.chase != null) { const t = G.parties.find(x => x.id === pt.chase); return t ? [t.x, t.y] : null; }
  if (pt.kind === 'player') { if (pt.leg && G.turnLeft > 0) return pt.leg.pts[pt.leg.pts.length - 1]; return null; }
  return pt.tx != null ? [pt.tx, pt.ty] : null;
}
function drawArmyBadges(ctx, W, H, z, pp, SETTS) {
  const clusters = new Map();
  for (const pt of G.parties) {
    const pv = partyProv(pt);
    if (!pv) continue;
    const still = Math.abs(pv.x - pt.x) < 0.06 && Math.abs(pv.y - pt.y) < 0.06;
    const key = still ? 'p' + pv.id : 'm' + pt.id;
    let c = clusters.get(key);
    if (!c) clusters.set(key, c = { pv: still ? pv : null, x: still ? pv.x : pt.x, y: still ? pv.y : pt.y, list: [] });
    c.list.push(pt);
  }
  // 1) Yürüyüş çizgileri (rozetlerin altında)
  ctx.save();
  ctx.lineCap = 'round';
  for (const pt of G.parties) {
    if (pt.kind === 'player') continue;
    const dst = partyDest(pt);
    if (!dst || Math.hypot(dst[0] - pt.x, dst[1] - pt.y) < 0.08) continue;
    const hostile = pp && hostileParties(pp, pt);
    if (z < 14 && !(hostile && pt.kind !== 'bandit')) continue;
    const [ax, ay] = mapToScreen(pt.x, pt.y), [bx, by] = mapToScreen(dst[0], dst[1]);
    if (Math.max(ax, bx) < -20 || Math.min(ax, bx) > W + 20 || Math.max(ay, by) < -20 || Math.min(ay, by) > H + 20) continue;
    const c = ch(pt.owner), r = c ? realmOf(c) : null;
    const col = hostile ? '#ff6a55' : pt.kind === 'bandit' ? '#d8d0c0' : r ? r.color : '#d8d0c0';
    ctx.setLineDash([]); ctx.lineWidth = 3.2; ctx.strokeStyle = 'rgba(10,8,5,0.55)';
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.setLineDash([6, 4]); ctx.lineWidth = 1.6; ctx.strokeStyle = col;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    // hedef işareti: küçük baklava
    ctx.setLineDash([]); ctx.fillStyle = col; ctx.strokeStyle = 'rgba(10,8,5,0.9)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx, by - 4.5); ctx.lineTo(bx + 4.5, by); ctx.lineTo(bx, by + 4.5); ctx.lineTo(bx - 4.5, by); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  // 2) Rozetler
  const fs = clamp(z * 0.4, 9, 12), h = Math.round(fs + 6), sq = h - 4;
  ctx.font = `700 ${fs}px system-ui, -apple-system, sans-serif`;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const order = [...clusters.values()].sort((a, b) => a.list.some(p => p.kind === 'player') - b.list.some(p => p.kind === 'player'));
  for (const cl of order) {
    const [sx, sy] = mapToScreen(cl.x, cl.y);
    if (sx < -80 || sx > W + 80 || sy < -30 || sy > H + 30) continue;
    let groups = armyGroups(cl.list, pp);
    if (z < 14) groups = groups.filter(g => g.isP || (g.hostile && !g.bandit));
    if (!groups.length) continue;
    let more = false;
    if (z < 24 && groups.length > 1) { more = true; groups = [groups[0]]; }
    const pv = cl.pv, sett = pv && pv.sett >= 0;
    const size = clamp(z * 0.22, 4, 9) * 1.15;
    const label = g => fmtCount(g.n) + (more ? '+' : '');
    const widths = groups.map(g => sq + 6 + ctx.measureText(label(g)).width + 5);
    const total = widths.reduce((a, b) => a + b, 0) + (groups.length - 1) * 3;
    let x = sx - total / 2;
    const named = sett && (z >= 16 || (SETTS[pv.sett] && SETTS[pv.sett].capital));
    const y = sett ? sy + size + 3 + (named ? clamp(z * 0.42, 10, 15) + 4 : 0) : sy - h / 2;
    groups.forEach((g, i) => {
      const w = widths[i];
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x + 1.5, y + 1.5, w, h);
      ctx.fillStyle = g.isP ? '#2a1d0c' : '#16110c'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = g.col; ctx.fillRect(x + 2, y + 2, sq, sq);
      if (g.bandit) drawIcon(ctx, 'death-skull', x + 2 + sq / 2, y + 2 + sq / 2, sq * 0.9, '#e8e0d0');
      else if (g.isP) drawIcon(ctx, 'crossed-swords', x + 2 + sq / 2, y + 2 + sq / 2, sq * 0.85, '#1a1208');
      else if (g.siege) drawIcon(ctx, 'fire', x + 2 + sq / 2, y + 2 + sq / 2, sq * 0.85, '#fff2d0');
      ctx.fillStyle = g.isP ? '#ffe08a' : g.hostile ? '#ffb4a8' : '#f2ead8';
      ctx.fillText(label(g), x + sq + 6, y + h / 2 + 0.5);
      ctx.lineWidth = g.isP || g.hostile ? 2 : 1;
      ctx.strokeStyle = g.isP ? '#ffd76a' : g.hostile ? '#e0483a' : 'rgba(0,0,0,0.9)';
      ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
      x += w + 3;
    });
  }
}
/* Oyuncunun rotası: çizgi noktaları ve tur durakları */
function routePreview(pp) {
  let from = partyProv(pp);
  if (!from) return null;
  const pts = [[pp.x, pp.y]], stops = [];
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
