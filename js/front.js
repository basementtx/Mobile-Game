'use strict';
/* =========================================================
   Taç ve Hançer — Gerçek zamanlı fetih
   Piksel ızgara üzerinde uluslar, saldırı cepheleri, çıkarma
   gemileri, kadırgalar, ticaret, yapılar, ateş saldırıları
   ve yapay zekâ. Her şey aynı anda, gerçek zamanlı akar.
   ========================================================= */

const TICK = 0.1;            // bir simülasyon adımı (saniye)
const DAYS_PER_SEC = 1.5;    // takvim: bir ay ≈ 20 saniye
const TS = 0.2;              // bir karenin harita birimi (GRID.step)
const TMULT = [0, 1, 1.6, 2.5]; // arazi zorluğu: deniz, ova, yayla, dağ
const MAX_BOATS = 3;

let FW = 0, FH = 0, FN = 0;
let OWN = null;      // Uint16: 0 sahipsiz, yoksa ulus sırası + 1
let TER = null;      // Uint8: 0 su, 1 ova, 2 yayla, 3 dağ
let ELEV = null;     // Float32: görsel yükselti
let SDIST = null;    // Uint8: kıyıya uzaklık (kara ve su için)
let BURN = null;     // Uint8: yanık izi (görsel)
let COASTL = null;   // kıyı karaları listesi
let LANDTOTAL = 0;
let NR = [];         // ulusların çalışma verisi (kaydedilmez)
let ATKRT = new Map();
let UNIT_AT = new Map();
let SETT_AT = new Map();
let PROJ = [], FX = [];
let DIRTYF = null, DIRTYL = [];

/* ---------- Yardımcılar ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const tx = t => t % FW, ty = t => (t / FW) | 0;
const tileAtXY = (x, y) => { const i = Math.floor(x / TS), j = Math.floor(y / TS); return i < 0 || j < 0 || i >= FW || j >= FH ? -1 : j * FW + i; };
const tileCenter = t => [(tx(t) + 0.5) * TS, (ty(t) + 0.5) * TS];
function tdist(a, b) { return Math.hypot(tx(a) - tx(b), ty(a) - ty(b)); }
function nbrs(t, out) {
  out.length = 0;
  const x = t % FW;
  if (x > 0) out.push(t - 1);
  if (x < FW - 1) out.push(t + 1);
  if (t >= FW) out.push(t - FW);
  if (t < FN - FW) out.push(t + FW);
  return out;
}
const _nb = [], _nb2 = [];
const isWater = t => TER[t] === 0;
function fmtCount(n) { n = Math.max(0, Math.round(n)); return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 10000 ? Math.round(n / 1000) + 'K' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n); }

/* ---------- Basit min-öbek (saldırı cepheleri için) ---------- */
class Heap {
  constructor() { this.p = []; this.t = []; }
  get size() { return this.t.length; }
  push(t, pr) {
    const P = this.p, T = this.t;
    let i = T.length; P.push(pr); T.push(t);
    while (i > 0) { const j = (i - 1) >> 1; if (P[j] <= pr) break; P[i] = P[j]; T[i] = T[j]; i = j; }
    P[i] = pr; T[i] = t;
  }
  pop() {
    const P = this.p, T = this.t, top = T[0], lp = P.pop(), lt = T.pop(), n = T.length;
    if (n) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1; if (c >= n) break;
        if (c + 1 < n && P[c + 1] < P[c]) c++;
        if (P[c] >= lp) break;
        P[i] = P[c]; T[i] = T[c]; i = c;
      }
      P[i] = lp; T[i] = lt;
    }
    return top;
  }
}

/* ---------- Arazi ---------- */
/* Gerçek sıradağlar: [boylam, enlem] çizgileri ve genişlik (derece) */
const RANGES = [
  [[[5.5, 44], [7, 46], [10, 46.5], [13, 47], [16, 47.6]], 1.1, 1], [[[-1.8, 43], [0.5, 42.7], [3, 42.4]], 0.6, 0.9],
  [[[17.5, 49], [20, 49.3], [23, 48], [25, 47.5], [26, 46], [23, 45.4], [21.5, 45]], 0.8, 0.75], [[[37.5, 44.5], [42, 43], [46, 41.8], [49, 40.6]], 0.9, 1],
  [[[29, 37], [32, 36.8], [36, 37.5], [40, 38], [44, 37], [47, 34], [51, 31], [56, 28]], 1.0, 0.85], [[[33, 39]], 3, 0.45], [[[55, 32]], 5, 0.45],
  [[[62, 36], [70, 35.5], [75, 35], [80, 31], [85, 28.5], [90, 28], [95, 28.5]], 2.0, 1.15], [[[88, 33]], 7, 0.62],
  [[[70, 42], [78, 42], [86, 43], [92, 43.5]], 1.3, 0.95], [[[85, 50], [90, 49], [96, 47]], 1.1, 0.8], [[[59, 51], [59, 56], [60, 61], [61, 66]], 0.8, 0.6],
  [[[6, 59], [9, 62], [13, 65], [17, 68], [20, 69.5]], 1.2, 0.75], [[[-9, 30.5], [-6, 32], [-3, 33], [2, 35], [8, 36]], 1.0, 0.85],
  [[[36, 8], [38, 10], [39, 13]], 2.2, 0.6], [[[36, 0], [35, -5], [34, -10]], 1.5, 0.6], [[[29, -29], [31, -26]], 0.9, 0.7],
  [[[-75, 10], [-77, 3], [-78, -2], [-76, -10], [-70, -17], [-69, -23], [-70, -30], [-71, -38], [-72, -46], [-73, -52]], 1.5, 1.15],
  [[[-150, 62], [-135, 60], [-125, 54], [-117, 49], [-112, 44], [-107, 38], [-106, 33]], 2.0, 0.95], [[[-106, 28], [-104, 24], [-100, 20], [-97, 17]], 1.2, 0.8],
  [[[-85, 34], [-81, 37], [-78, 40], [-74, 42], [-69, 45]], 1.0, 0.6], [[[146, -38], [150, -33], [152, -28], [148, -20], [145, -15]], 0.9, 0.6],
  [[[131, 32], [135, 34.5], [138, 36], [140, 39], [141, 42]], 0.6, 0.8], [[[15, 45], [18, 43], [20, 42], [23, 42], [25, 42.5]], 0.8, 0.7],
  [[[8.5, 44.3], [12, 43], [14.5, 41.5], [16, 40]], 0.5, 0.7], [[[50, 36.5], [55, 37], [60, 36], [66, 35]], 0.8, 0.85],
  [[[80, 36], [90, 36], [100, 35], [106, 34]], 1.2, 0.9], [[[98, 30], [100, 26]], 1.2, 0.85], [[[-4, 57], [-5, 58.5]], 0.6, 0.55],
];
function hash2(x, y) { let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y) { return vnoise(x / 22, y / 22) * 0.5 + vnoise(x / 9, y / 9) * 0.3 + vnoise(x / 4, y / 4) * 0.2; }
function buildTerrain() {
  if (TER) return;
  FW = GRID.w; FH = GRID.h; FN = FW * FH;
  TER = new Uint8Array(FN); ELEV = new Float32Array(FN); SDIST = new Uint8Array(FN).fill(255);
  BURN = new Uint8Array(FN); DIRTYF = new Uint8Array(FN);
  for (let t = 0; t < FN; t++) if (LANDGRID[t]) TER[t] = 1;
  // Kıyıya uzaklık (kara ve deniz için ayrı ayrı, tek BFS)
  const q = new Int32Array(FN);
  let qh = 0, qt = 0;
  for (let t = 0; t < FN; t++) {
    const l = TER[t] > 0;
    for (const u of nbrs(t, _nb)) if ((TER[u] > 0) !== l) { SDIST[t] = 1; q[qt++] = t; break; }
  }
  while (qh < qt) {
    const t = q[qh++], d = SDIST[t], l = TER[t] > 0;
    if (d >= 40) continue;
    for (const u of nbrs(t, _nb)) if (SDIST[u] === 255 && (TER[u] > 0) === l) { SDIST[u] = d + 1; q[qt++] = u; }
  }
  // Sıradağlar
  for (const [pts, w, hgt] of RANGES) {
    const P = pts.map(([lo, la]) => proj(lo, la).map(v => v / TS));
    const wt = w * MAP.COS / TS * 1.2;
    const segs = P.length === 1 ? [[P[0], P[0]]] : P.slice(1).map((b, i) => [P[i], b]);
    for (const [a, b] of segs) {
      const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0]) - wt)), x1 = Math.min(FW - 1, Math.ceil(Math.max(a[0], b[0]) + wt));
      const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1]) - wt)), y1 = Math.min(FH - 1, Math.ceil(Math.max(a[1], b[1]) + wt));
      const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const t = y * FW + x;
        if (!TER[t]) continue;
        const k = clamp(((x - a[0]) * dx + (y - a[1]) * dy) / L2, 0, 1);
        const d = Math.hypot(x - a[0] - k * dx, y - a[1] - k * dy) / wt;
        if (d >= 1) continue;
        const e = hgt * (1 - d * d);
        if (e > ELEV[t]) ELEV[t] = e;
      }
    }
  }
  COASTL = [];
  LANDTOTAL = 0;
  for (let t = 0; t < FN; t++) {
    if (!TER[t]) continue;
    LANDTOTAL++;
    const x = tx(t), y = ty(t);
    const n = fbm(x, y), inland = Math.min(SDIST[t], 14) / 14;
    const e = ELEV[t] * (0.55 + n * 0.9) + (n - 0.5) * 0.35 + inland * 0.12;
    ELEV[t] = e;
    TER[t] = e > 0.72 ? 3 : e > 0.4 ? 2 : 1;
    if (SDIST[t] === 1) COASTL.push(t);
  }
}
const isCoastTile = t => TER[t] > 0 && SDIST[t] === 1;

/* ---------- Uluslar ---------- */
const _cv1 = document.createElement('canvas').getContext('2d');
function colorRgb(c) {
  _cv1.fillStyle = '#777'; _cv1.fillStyle = c || '#777';
  const s = _cv1.fillStyle;
  if (s[0] === '#') { const n = parseInt(s.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  const m = s.match(/\d+/g); return m ? [+m[0], +m[1], +m[2]] : [120, 120, 120];
}
const pack = (r, g, b, a) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
function natRT(n) {
  const rgb = colorRgb(natColor(n));
  return { border: new Set(), tiles: 0, sx: 0, sy: 0, rgb, f32: pack(rgb[0], rgb[1], rgb[2], 165), b32: pack(rgb[0] * 0.55 | 0, rgb[1] * 0.55 | 0, rgb[2] * 0.55 | 0, 240),
    nb: null, nbT: -99, towns: 0, harbors: 0, forts: 0, shops: 0, towers: 0, galleys: 0, box: [0, 0, FW, FH], cntT: -99, label: -1, labT: -99 };
}
function natColor(n) { const r = n.realm != null ? G.titles[n.realm] : null; return r ? r.color : n.color; }
function refreshNatColor(i) { const n = G.nat[i], R = NR[i], rgb = colorRgb(natColor(n)); R.rgb = rgb; R.f32 = pack(rgb[0], rgb[1], rgb[2], 165); R.b32 = pack(rgb[0] * 0.55 | 0, rgb[1] * 0.55 | 0, rgb[2] * 0.55 | 0, 240); repaintAll(); }
function addNation(o) {
  const n = { i: G.nat.length, realm: o.realm ?? null, bot: !!o.bot, bname: o.bname || null, color: o.color || null, troops: o.troops || 0, gold: o.gold || 0, gf: 0, alive: true, think: rnd(0, 19), boats: 0, born: G.tick || 0 };
  G.nat.push(n);
  NR[n.i] = natRT(n);
  if (n.realm != null) G.titles[n.realm].nat = n.i;
  return n;
}
const natRealm = n => (n && n.realm != null ? G.titles[n.realm] : null);
const natRuler = n => { const r = natRealm(n); return r ? ch(r.holder) : null; };
function natName(n, short) {
  if (!n) return L('Sahipsiz topraklar', 'Unclaimed lands');
  const r = natRealm(n);
  if (r) return short ? realmShort(r) : r.name;
  return L(`${n.bname} boyları`, `${n.bname} tribes`);
}
function natFlagObj(n) { const r = natRealm(n); return r || { id: 'b' + n.i, name: n.bname, dynName: n.bname, color: n.color }; }
function natOfRealm(r) { return r && r.nat != null && G.nat[r.nat] && G.nat[r.nat].alive ? G.nat[r.nat] : null; }
function natOfChar(c) { return natOfRealm(realmOf(c)); }
/* Oyuncunun yönettiği ulus (yalnızca kendi krallığı varsa) */
function myNatIdx() { const p = G && P(); if (!p) return -1; const n = natOfRealm(ownRealm(p)); return n ? n.i : -1; }
const myNat = () => { const i = myNatIdx(); return i >= 0 ? G.nat[i] : null; };
function natGold(n) { const k = natRuler(n); return k ? k.gold : n.gold; }
function addNatGold(n, v) { const k = natRuler(n); if (k) k.gold = Math.max(0, k.gold + v); else n.gold = Math.max(0, n.gold + v); }
/* İki ulus birbirine saldırabilir mi? (kabileler herkese düşmandır) */
function hostileNat(a, b) {
  if (a === b || !(a >= 0) || !(b >= 0)) return false;
  const A = G.nat[a], B = G.nat[b];
  if (!A || !B) return false;
  if (A.bot || B.bot) return true;
  return atWarRealms(natRealm(A), natRealm(B));
}
function alliedNat(a, b) { if (!(a >= 0) || !(b >= 0)) return false; const A = G.nat[a], B = G.nat[b]; return !!A && !!B && !A.bot && !B.bot && allied(natRealm(A), natRealm(B)); }
function atkMult(n) {
  const k = natRuler(n);
  let m = 1 + (k ? stat(k, 'sav') : 4) / 45;
  if (n.i === myNatIdx()) m *= 1 + councilBonus('maresal') * 0.012;
  return n.bot ? m * 0.85 : m;
}
function defMult(n) { const k = natRuler(n); return 1 + (k ? stat(k, 'sav') : 3) / 60; }

/* ---------- Kare sahipliği ---------- */
function markDirty(t) { if (!DIRTYF[t]) { DIRTYF[t] = 1; DIRTYL.push(t); } }
function repaintAll() { DIRTYL.length = 0; DIRTYF.fill(0); FULLPAINT = true; }
let FULLPAINT = true;
function updBorder(t) {
  const o = OWN[t];
  if (!o) return;
  let b = false;
  for (const u of nbrs(t, _nb2)) if (OWN[u] !== o) { b = true; break; }
  const S = NR[o - 1].border;
  if (b) S.add(t); else S.delete(t);
}
function setOwner(t, ni) {
  const old = OWN[t] - 1;
  if (old === ni) return;
  const x = tx(t), y = ty(t);
  if (old >= 0) { const R = NR[old]; R.tiles--; R.sx -= x; R.sy -= y; R.border.delete(t); }
  OWN[t] = ni + 1;
  if (ni >= 0) { const R = NR[ni]; R.tiles++; R.sx += x; R.sy += y; }
  updBorder(t); markDirty(t);
  const ns = nbrs(t, []);
  for (const u of ns) { updBorder(u); markDirty(u); }
  const un = UNIT_AT.get(t);
  if (un) { if (ni >= 0) un.n = ni; else removeUnit(un); }
  if (SETT_AT.has(t)) settlementTaken(SETT_AT.get(t), ni, old);
  if (old >= 0 && NR[old].tiles <= 0 && G.nat[old].alive) natDies(old, ni);
}
function adjOwnedBy(t, o) { for (const u of nbrs(t, _nb2)) if (OWN[u] === o) return true; return false; }
function ownNeighborCount(t, o) { let c = 0; for (const u of nbrs(t, _nb2)) if (OWN[u] === o) c++; return c; }
/* Ulusun komşuları: sahip sırası (-1 = sahipsiz kara) -> ortak sınır uzunluğu */
function natNeighbors(i) {
  const R = NR[i];
  if (R.nb && G.tick - R.nbT < 10) return R.nb;
  const m = new Map(), me = i + 1;
  for (const t of R.border) for (const u of nbrs(t, _nb)) {
    const o = OWN[u];
    if (o === me || TER[u] === 0) continue;
    m.set(o - 1, (m.get(o - 1) || 0) + 1);
  }
  R.nb = m; R.nbT = G.tick;
  return m;
}
/* Etiket noktası ve kapsayan kutu */
function natBox(i) {
  const R = NR[i];
  if (G.tick - R.cntT < 10) return R.box;
  let x0 = FW, y0 = FH, x1 = 0, y1 = 0;
  for (const t of R.border) { const x = tx(t), y = ty(t); if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  R.box = [x0, y0, x1, y1];
  R.towns = R.harbors = R.forts = R.shops = R.towers = R.galleys = 0;
  for (const u of G.units) if (u.n === i) { if (u.k === 'kasaba') R.towns += u.lvl; else if (u.k === 'liman') R.harbors += u.lvl; else if (u.k === 'kale') R.forts++; else if (u.k === 'atolye') R.shops++; else if (u.k === 'kule') R.towers++; }
  for (const s of G.ships) if (s.n === i && s.k === 'kadirga') R.galleys++;
  R.cntT = G.tick;
  return R.box;
}
/* Kare, ulusun içinde ne kadar derinde? (etiket yeri için) */
function labelScore(t, me, cx, cy) {
  const x = tx(t), y = ty(t);
  let d = 0;
  while (d < 30) {
    d++;
    if (OWN[y * FW + Math.min(FW - 1, x + d)] !== me || OWN[y * FW + Math.max(0, x - d)] !== me || OWN[Math.min(FH - 1, y + d) * FW + x] !== me || OWN[Math.max(0, y - d) * FW + x] !== me) break;
  }
  return d * 3 - Math.hypot(x - cx, y - cy) * 0.15;
}
function natLabelTile(i) {
  const R = NR[i], me = i + 1;
  if (R.label >= 0 && G.tick - R.labT < 25 && OWN[R.label] === me) return R.label;
  R.labT = G.tick;
  if (!R.tiles) return (R.label = -1);
  const cx = Math.round(R.sx / R.tiles), cy = Math.round(R.sy / R.tiles);
  let best = -1, bs = -1e9;
  for (let k = 0; k < 60; k++) {
    const r = k < 8 ? 0 : Math.min(40, k / 1.2);
    const x = clamp(Math.round(cx + (Math.random() - 0.5) * 2 * r), 0, FW - 1), y = clamp(Math.round(cy + (Math.random() - 0.5) * 2 * r), 0, FH - 1);
    const t = y * FW + x;
    if (OWN[t] !== me) continue;
    const sc = labelScore(t, me, cx, cy);
    if (sc > bs) { bs = sc; best = t; }
  }
  // Mevcut yer hâlâ iyiyse kıpırdatma (etiketler zıplamasın)
  if (R.label >= 0 && OWN[R.label] === me && labelScore(R.label, me, cx, cy) >= bs * 0.8) return R.label;
  R.label = best >= 0 ? best : (R.border.values().next().value ?? -1);
  return R.label;
}

/* ---------- Asker ve altın ---------- */
const LEVY_MULT = [0.85, 1, 1.2];
const TAX_GOLD = [0.8, 1, 1.2, 1.35];
function maxTroops(n) {
  const R = NR[n.i];
  natBox(n.i);
  let m = Math.pow(R.tiles, 0.6) * 200 + 2000 + R.towns * 6000;
  if (n.i === myNatIdx()) m *= LEVY_MULT[law().yukumluluk] || 1;
  return n.bot ? m * 0.55 : m;
}
function troopGrowth(n) {
  const max = maxTroops(n), tr = n.troops;
  if (tr >= max) return -(tr - max) * 0.01;
  return (3 + Math.pow(Math.max(1, tr), 0.73) / 4) * (1 - tr / max) * 0.35 * (n.bot ? 0.7 : 1);
}
function goldRate(n) {
  const R = NR[n.i];
  natBox(n.i);
  let g = (0.6 + Math.sqrt(Math.max(0, n.troops)) * 0.03 + R.tiles * 0.0012 + R.towns * 0.9 + R.harbors * 0.4) * 0.6;
  if (n.i === myNatIdx()) g *= (TAX_GOLD[law().vergi] || 1) * (1 + councilBonus('hazinedar') * 0.015);
  return n.bot ? g * 0.6 : g;
}

/* ---------- Saldırılar ---------- */
function findAtk(a, d) { return G.atk.find(x => x.a === a && x.d === d) || null; }
function canAttack(a, d) {
  if (a < 0 || !G.nat[a].alive) return false;
  if (d === -1) return true;
  if (!G.nat[d] || !G.nat[d].alive || alliedNat(a, d)) return false;
  return true;
}
function launchAttack(a, d, troops) {
  const A = G.nat[a];
  troops = Math.min(troops, A.troops);
  if (troops < 1 || !canAttack(a, d)) return null;
  A.troops -= troops;
  const opp = d >= 0 ? findAtk(d, a) : null;
  if (opp) {
    const m = Math.min(opp.troops, troops);
    opp.troops -= m; troops -= m;
    if (opp.troops < 1) endAttack(opp, false);
    if (troops < 1) return null;
  }
  let k = findAtk(a, d);
  if (k) { k.troops += troops; buildFront(k); return k; }
  k = { id: G.nextAtk++, a, d, troops, t0: G.tick };
  G.atk.push(k);
  buildFront(k);
  if (d >= 0 && d === myNatIdx() && a !== d) noticeIncoming(k);
  return k;
}
function buildFront(k) {
  let rt = ATKRT.get(k.id);
  if (!rt) { rt = { h: new Heap(), step: 0 }; ATKRT.set(k.id, rt); }
  const h = rt.h = new Heap(), tg = k.d + 1, me = k.a + 1;
  for (const b of NR[k.a].border) for (const u of nbrs(b, _nb)) {
    if (OWN[u] !== tg || TER[u] === 0) continue;
    h.push(u, rt.step + Math.random() * 3 + (4 - ownNeighborCount(u, me)) * 0.6);
  }
  return rt;
}
function endAttack(k, refund) {
  const A = G.nat[k.a];
  if (refund && A && A.alive) A.troops += k.troops;
  G.atk = G.atk.filter(x => x !== k);
  ATKRT.delete(k.id);
}
function retreatAttack(k) { k.troops *= 0.75; endAttack(k, true); }
/* Bir kale (savunma karakolu) yakınında mı? */
function fortMult(d, t) {
  const x = tx(t), y = ty(t);
  for (const u of G.units) if (u.k === 'kale' && u.n === d) { const dx = tx(u.t) - x, dy = ty(u.t) - y; if (dx * dx + dy * dy < 110) return 2.2; }
  return 1;
}
function atkTick(k) {
  const A = G.nat[k.a], D = k.d >= 0 ? G.nat[k.d] : null;
  if (!A || !A.alive || (D && !D.alive) || (D && !canAttack(k.a, k.d))) return endAttack(k, true);
  let rt = ATKRT.get(k.id);
  if (!rt) rt = buildFront(k);
  rt.step++;
  if (rt.step % 25 === 0) rt = buildFront(k);
  const h = rt.h, tg = k.d + 1, me = k.a + 1;
  const aM = atkMult(A), dM = D ? defMult(D) : 1;
  const dens = D ? D.troops / Math.max(1, NR[k.d].tiles) : 0;
  let budget = clamp(1 + Math.sqrt(k.troops) / 12, 1, 40) * (D ? 0.55 : 1);
  let guard = 0;
  while (budget > 0 && h.size && guard++ < 400) {
    const t = h.pop();
    if (OWN[t] !== tg || TER[t] === 0 || !adjOwnedBy(t, me)) continue;
    const tm = TMULT[TER[t]] * (D ? fortMult(k.d, t) : 1);
    const cost = (D ? (6 + dens * 1.1) * dM / aM : 5.5 / aM) * tm;
    if (k.troops < cost) { k.troops = 0; break; }
    k.troops -= cost;
    if (D) D.troops = Math.max(0, D.troops - dens * 0.55 * tm);
    setOwner(t, k.a);
    budget -= tm;
    for (const u of nbrs(t, _nb)) if (OWN[u] === tg && TER[u] > 0) h.push(u, rt.step + 1 + Math.random() * 2.2 + (4 - ownNeighborCount(u, me)) * 0.6 * TMULT[TER[u]]);
  }
  if (!G.atk.includes(k)) return;
  if (k.troops < 1) return endAttack(k, false);
  if (!h.size) { buildFront(k); if (!ATKRT.get(k.id).h.size) endAttack(k, true); }
}
function noticeIncoming(k) {
  const A = G.nat[k.a];
  if (G.tick - (G.lastWarn || -999) < 60) return;
  G.lastWarn = G.tick;
  if (typeof toast === 'function') toast(L(`⚔️ <b>${esc(natName(A))}</b> topraklarına saldırıyor! (${fmtCount(k.troops)})`, `⚔️ <b>${esc(natName(A))}</b> is attacking your lands! (${fmtCount(k.troops)})`));
}

/* ---------- Yapılar ---------- */
const UNITS = {
  kasaba: { i: 'village', mark: '#f1d27a', base: 250, cap: 2400, grow: 'dbl', ad: () => L('Kasaba', 'Town'), d: () => L('Asker sınırı +6K ve altın geliri. Üst üste kurarak seviye atlar.', 'Max troops +6K and gold income. Build again on it to raise its level.') },
  liman: { i: 'trident', mark: '#8fd0f0', base: 300, cap: 2400, grow: 'dbl', coast: true, ad: () => L('Liman', 'Harbour'), d: () => L('Kıyıda kurulur. Ticaret gemileri altın getirir; kadırga inşa edilir.', 'Built on a coast. Trade ships bring gold; galleys are built here.') },
  kale: { i: 'castle', mark: '#d8c8a8', base: 120, cap: 1200, grow: 'lin', ad: () => L('Kale', 'Fort'), d: () => L('Çevresindeki toprakları fethetmek 2 kat zorlaşır.', 'Land around it is twice as hard to conquer.') },
  atolye: { i: 'anvil-impact', mark: '#f07a2a', base: 1500, cap: 1500, grow: 'flat', ad: () => L('Mancınık atölyesi', 'Siege workshop'), d: () => L('Ateş saldırıları buradan fırlatılır.', 'Fire strikes are launched from here.') },
  kule: { i: 'archer', mark: '#9fe0a0', base: 1800, cap: 3600, grow: 'lin', ad: () => L('Gözcü kulesi', 'Watchtower'), d: () => L('Yakına düşecek ateş saldırılarını düşürür (8 sn bekleme).', 'Shoots down incoming fire strikes nearby (8 s reload).') },
};
const UKEYS = Object.keys(UNITS);
const STRIKES = {
  ates: { r: 6, cost: 1200, ad: () => L('Rum ateşi küpü', 'Greek fire pot'), d: () => L('Küçük alanı yakar, toprak sahipsiz kalır.', 'Burns a small area; the land is left unclaimed.') },
  buyuk: { r: 15, cost: 5000, ad: () => L('Büyük ateş', 'Great blaze'), d: () => L('Geniş bir bölgeyi küle çevirir.', 'Turns a wide region to ash.') },
  yagmur: { r: 5, cost: 15000, n: 12, ad: () => L('Ateş yağmuru', 'Rain of fire'), d: () => L('Hedef ulusun topraklarına 12 ayrı ateş düşer.', '12 separate fires fall upon the target realm.') },
};
const GALLEY_COST = n => 500 * (n + 1);
function countUnits(i, k) { let c = 0; for (const u of G.units) if (u.n === i && u.k === k) c++; return c; }
/* Fiyat yalnızca kendi kurduklarınla artar (tarihî yerleşimler sayılmaz) */
function builtUnits(i, k) { let c = 0; for (const u of G.units) if (u.n === i && u.k === k && !u.seed) c += k === 'kasaba' || k === 'liman' ? u.lvl - (u.lvl0 || 0) : 1; return c; }
function unitCost(i, k) {
  const U = UNITS[k], c = builtUnits(i, k);
  if (U.grow === 'flat') return U.base;
  return Math.min(U.cap, U.grow === 'dbl' ? U.base * Math.pow(2, c) : U.base * (c + 1));
}
function nearUnit(t, r, f) { const x = tx(t), y = ty(t); for (const u of G.units) { const dx = tx(u.t) - x, dy = ty(u.t) - y; if (dx * dx + dy * dy <= r * r && (!f || f(u))) return u; } return null; }
/* Kurulamazsa nedenini döndürür */
function buildReason(i, k, t) {
  const U = UNITS[k];
  if (t < 0 || OWN[t] !== i + 1) return L('Kendi toprağın değil', 'Not your land');
  if (U.coast && !isCoastTile(t)) return L('Kıyıda olmalı', 'Must be on the coast');
  const same = nearUnit(t, 2, u => u.k === k && u.n === i);
  if (!same && nearUnit(t, 3)) return L('Başka bir yapıya çok yakın', 'Too close to another building');
  if (natGold(G.nat[i]) < unitCost(i, k)) return L(`${unitCost(i, k)} altın gerekli`, `Needs ${unitCost(i, k)} gold`);
  return null;
}
function buildUnit(i, k, t) {
  if (buildReason(i, k, t)) return null;
  addNatGold(G.nat[i], -unitCost(i, k));
  const same = nearUnit(t, 2, u => u.k === k && u.n === i);
  if (same && (k === 'kasaba' || k === 'liman')) { same.lvl++; if (same.seed) { same.seed = 0; same.lvl0 = same.lvl - 1; } NR[i].cntT = -99; return same; }
  const u = { id: G.nextUnit++, k, n: i, t, lvl: 1, cd: 0 };
  G.units.push(u); UNIT_AT.set(t, u);
  NR[i].cntT = -99;
  return u;
}
function removeUnit(u) {
  G.units = G.units.filter(x => x !== u);
  if (UNIT_AT.get(u.t) === u) UNIT_AT.delete(u.t);
  if (G.nat[u.n]) NR[u.n].cntT = -99;
}

/* ---------- Su yolları (BFS) ---------- */
let _bfsPrev = null, _bfsMark = null, _bfsGen = 1, _bfsQ = null;
function waterBFS(starts, goal, limit) {
  if (!_bfsPrev) { _bfsPrev = new Int32Array(FN); _bfsMark = new Uint32Array(FN); _bfsQ = new Int32Array(FN); }
  const gen = ++_bfsGen;
  let qh = 0, qt = 0;
  for (const s of starts) { if (TER[s] !== 0 || _bfsMark[s] === gen) continue; _bfsMark[s] = gen; _bfsPrev[s] = -1; _bfsQ[qt++] = s; }
  while (qh < qt && qt < limit) {
    const t = _bfsQ[qh++];
    if (goal(t)) { const path = []; let c = t; while (c >= 0) { path.push(c); c = _bfsPrev[c]; } return path; }
    for (const u of nbrs(t, _nb)) { if (TER[u] !== 0 || _bfsMark[u] === gen) continue; _bfsMark[u] = gen; _bfsPrev[u] = t; _bfsQ[qt++] = u; }
  }
  return null;
}
const waterNbrs = t => nbrs(t, []).filter(isWater);
/* Hedefe en yakın, aynı sahipli kıyı karesi */
function landingTile(t) {
  if (isCoastTile(t)) return t;
  const o = OWN[t], x = tx(t), y = ty(t);
  let best = -1, bd = 1e9;
  for (let r = 1; r <= 40 && best < 0; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= FW || yy >= FH) continue;
      const u = yy * FW + xx;
      if (!isCoastTile(u) || OWN[u] !== o) continue;
      const d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = u; }
    }
  }
  return best;
}
/* Çıkarma rotası: saldıranın kıyısından hedef kıyıya */
function boatPath(a, target, limit = 260000) {
  const L_ = landingTile(target);
  if (L_ < 0) return null;
  const me = a + 1;
  const p = waterBFS(waterNbrs(L_), w => adjOwnedBy(w, me), limit);
  if (!p) return null;
  p.push(L_);
  return p;
}
function sendBoat(a, target, troops, limit) {
  const A = G.nat[a];
  if (A.boats >= MAX_BOATS) return 'max';
  troops = Math.min(troops, A.troops);
  if (troops < 1) return 'troops';
  const path = boatPath(a, target, limit);
  if (!path) return 'path';
  A.troops -= troops; A.boats++;
  G.ships.push({ id: G.nextShip++, k: 'gemi', n: a, path, i: 0, troops });
  return null;
}

/* ---------- Gemiler ---------- */
const SHIP_SPEED = { gemi: 11, tuccar: 7, kadirga: 9 };
function shipTile(s) { return s.path[Math.min(s.path.length - 1, Math.floor(s.i))]; }
function shipXY(s) {
  const i = Math.min(s.path.length - 1, s.i), a = s.path[Math.floor(i)], b = s.path[Math.min(s.path.length - 1, Math.floor(i) + 1)], f = i - Math.floor(i);
  return [(tx(a) + (tx(b) - tx(a)) * f + 0.5) * TS, (ty(a) + (ty(b) - ty(a)) * f + 0.5) * TS];
}
function removeShip(s) { G.ships = G.ships.filter(x => x !== s); if (s.k === 'gemi' && G.nat[s.n]) G.nat[s.n].boats = Math.max(0, G.nat[s.n].boats - 1); NR[s.n] && (NR[s.n].cntT = -99); }
function shipArrive(s) {
  removeShip(s);
  if (s.k === 'gemi') {
    const A = G.nat[s.n], Lt = s.path[s.path.length - 1], o = OWN[Lt] - 1;
    if (!A.alive) return;
    if (o === s.n || alliedNat(s.n, o) || (o >= 0 && !hostileNat(s.n, o))) { A.troops += s.troops; return; }
    setOwner(Lt, s.n);
    let k = findAtk(s.n, o);
    if (k) k.troops += s.troops;
    else { k = { id: G.nextAtk++, a: s.n, d: o, troops: s.troops, t0: G.tick }; G.atk.push(k); }
    buildFront(k);
    if (o >= 0 && o === myNatIdx()) toast(L(`⛵ <b>${esc(natName(A))}</b> kıyılarına asker çıkardı!`, `⛵ <b>${esc(natName(A))}</b> landed troops on your shores!`));
  } else if (s.k === 'tuccar') {
    const g = 30 + s.path.length * 0.35;
    for (const i of [s.n, s.to]) if (G.nat[i] && G.nat[i].alive) addNatGold(G.nat[i], g);
    if (s.n === myNatIdx() || s.to === myNatIdx()) G.tradeGold = (G.tradeGold || 0) + g;
  }
}
function galleyThink(s) {
  const me = s.n;
  // Yakındaki düşman gemisi
  const [x, y] = shipXY(s);
  let foe = null, fd = 5 * TS;
  for (const o of G.ships) {
    if (o === s || o.n === me || !hostileNat(me, o.n)) continue;
    const [ox, oy] = shipXY(o), d = Math.hypot(ox - x, oy - y);
    if (d < fd) { fd = d; foe = o; }
  }
  if (foe) {
    if (fd < 1.6 * TS) {
      if (foe.k === 'kadirga') { foe.hp -= 3; s.hp -= 2; if (foe.hp <= 0) removeShip(foe); if (s.hp <= 0) removeShip(s); }
      else if (foe.k === 'tuccar') { addNatGold(G.nat[me], 30 + foe.path.length * 0.35); removeShip(foe); if (me === myNatIdx()) toast(L('⚓ Kadırgan bir ticaret gemisine el koydu!', '⚓ Your galley seized a trade ship!')); }
      else { removeShip(foe); if (foe.n === myNatIdx()) toast(L('⚓ Çıkarma gemin batırıldı!', '⚓ Your landing ship was sunk!')); }
      return;
    }
    const ft = shipTile(foe), path = waterBFS([shipTile(s)], w => w === ft, 4000);
    if (path) { s.path = path.reverse(); s.i = 0; }
    return;
  }
  if (s.i >= s.path.length - 1) {
    const home = G.units.find(u => u.id === s.home) || G.units.find(u => u.k === 'liman' && u.n === me);
    if (!home) { if (chance(0.01)) removeShip(s); return; }
    const hx = tx(home.t), hy = ty(home.t);
    for (let k = 0; k < 8; k++) {
      const gx = clamp(hx + rnd(-22, 22), 0, FW - 1), gy = clamp(hy + rnd(-22, 22), 0, FH - 1), g = gy * FW + gx;
      if (!isWater(g)) continue;
      const path = waterBFS([shipTile(s)], w => w === g, 6000);
      if (path) { s.path = path.reverse(); s.i = 0; break; }
    }
  }
}
function buildGalley(i, harbor) {
  const n = G.nat[i], c = GALLEY_COST(NR[i].galleys);
  if (natGold(n) < c) return L(`${c} altın gerekli`, `Needs ${c} gold`);
  const w = waterNbrs(harbor.t);
  if (!w.length) return L('Liman denize açılmıyor', 'This harbour has no open water');
  addNatGold(n, -c);
  G.ships.push({ id: G.nextShip++, k: 'kadirga', n: i, path: [w[0]], i: 0, hp: 100, home: harbor.id });
  NR[i].galleys++;
  return null;
}
function tradeTick() {
  if (G.ships.filter(s => s.k === 'tuccar').length >= 22) return;
  const hs = G.units.filter(u => u.k === 'liman' && G.nat[u.n].alive);
  if (hs.length < 2) return;
  const a = pick(hs);
  const cands = hs.filter(b => b.n !== a.n && !hostileNat(a.n, b.n) && tdist(a.t, b.t) < 230);
  if (!cands.length) return;
  const b = pick(cands);
  const goal = new Set(waterNbrs(b.t));
  const path = waterBFS(waterNbrs(a.t), w => goal.has(w), 90000);
  if (!path) return;
  G.ships.push({ id: G.nextShip++, k: 'tuccar', n: a.n, to: b.n, path: path.reverse(), i: 0 });
}
function shipsTick() {
  for (const s of G.ships.slice()) {
    if (!G.ships.includes(s)) continue;
    if (!G.nat[s.n] || !G.nat[s.n].alive) { removeShip(s); continue; }
    if (s.k === 'kadirga' && (G.tick + s.id) % 3 === 0) { galleyThink(s); if (!G.ships.includes(s)) continue; }
    if (s.i < s.path.length - 1) s.i = Math.min(s.path.length - 1, s.i + SHIP_SPEED[s.k] * TICK);
    else if (s.k !== 'kadirga') shipArrive(s);
  }
}

/* ---------- Ateş saldırıları ---------- */
function strikeReason(i, k, t) {
  const n = G.nat[i], S = STRIKES[k];
  if (!countUnits(i, 'atolye')) return L('Önce bir mancınık atölyesi kur', 'Build a siege workshop first');
  if (t < 0 || TER[t] === 0) return L('Karaya nişan al', 'Aim at land');
  const o = OWN[t] - 1;
  if (o === i) return L('Kendi toprağın', 'Your own land');
  if (o >= 0 && alliedNat(i, o)) return L('Müttefikin', 'Your ally');
  if (natGold(n) < S.cost) return L(`${S.cost} altın gerekli`, `Needs ${S.cost} gold`);
  return null;
}
function launchStrike(i, k, t) {
  if (strikeReason(i, k, t)) return false;
  const S = STRIKES[k], o = OWN[t] - 1;
  addNatGold(G.nat[i], -S.cost);
  const shops = G.units.filter(u => u.n === i && u.k === 'atolye');
  const from = shops.reduce((b, u) => (!b || tdist(u.t, t) < tdist(b.t, t) ? u : b), null);
  const targets = [t];
  if (S.n && o >= 0) {
    const own = [...NR[o].border];
    for (let j = 1; j < S.n; j++) {
      for (let tries = 0; tries < 30; tries++) {
        const x = clamp(tx(t) + rnd(-45, 45), 0, FW - 1), y = clamp(ty(t) + rnd(-45, 45), 0, FH - 1), u = y * FW + x;
        if (OWN[u] === o + 1) { targets.push(u); break; }
        if (tries === 29 && own.length) targets.push(pick(own));
      }
    }
  }
  for (const tg of targets) {
    const d = tdist(from.t, tg), T = Math.max(2.5, d / 35);
    const pr = { k, n: i, a: from.t, b: tg, t: 0, T, r: S.r, hit: null };
    // Gözcü kulesi müdahalesi
    for (const u of G.units) {
      if (u.k !== 'kule' || u.n === i || u.cd > G.tick || !(hostileNat(u.n, i) || u.n === o)) continue;
      if (tdist(u.t, tg) <= 30) { pr.hit = u.id; u.cd = G.tick + 80; break; }
    }
    PROJ.push(pr);
  }
  // Diplomasi
  if (o >= 0) {
    const A = natRealm(G.nat[i]), B = natRealm(G.nat[o]);
    if (A && B && !atWarRealms(A, B)) declareWar(A, B, L('(Ateş saldırısı!)', '(A fire strike!)'));
    const ka = natRuler(G.nat[i]), kb = natRuler(G.nat[o]);
    if (ka && kb) addOp(kb, ka, -40);
    if (ka) for (const r of realms()) { const h = ch(r.holder); if (h && h !== ka && h !== kb) addOp(h, ka, -6); }
    if (o === myNatIdx()) toast(L(`🔥 <b>${esc(natName(G.nat[i]))}</b> topraklarına ateş fırlattı!`, `🔥 <b>${esc(natName(G.nat[i]))}</b> launched fire at your lands!`));
  }
  return true;
}
function projTick() {
  for (const pr of PROJ.slice()) {
    pr.t += TICK;
    if (pr.hit && pr.t >= pr.T * 0.7) {
      PROJ.splice(PROJ.indexOf(pr), 1);
      const [x, y] = projXY(pr);
      FX.push({ x, y, r: 1.2, t: 0, T: 0.8, c: '#ffe08a' });
      continue;
    }
    if (pr.t >= pr.T) { PROJ.splice(PROJ.indexOf(pr), 1); impact(pr.b, pr.r, pr.n); }
  }
  FX = FX.filter(f => (f.t += TICK) < f.T);
}
function projXY(pr) {
  const f = clamp(pr.t / pr.T, 0, 1);
  const [ax, ay] = tileCenter(pr.a), [bx, by] = tileCenter(pr.b);
  const d = Math.hypot(bx - ax, by - ay);
  return [ax + (bx - ax) * f, ay + (by - ay) * f - Math.sin(Math.PI * f) * d * 0.22];
}
function impact(t, r, by) {
  const cx = tx(t), cy = ty(t), hit = new Map(), before = new Map();
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const d2 = dx * dx + dy * dy;
    if (d2 > r * r) continue;
    const x = cx + dx, y = cy + dy;
    if (x < 0 || y < 0 || x >= FW || y >= FH) continue;
    const u = y * FW + x;
    if (TER[u] === 0) continue;
    BURN[u] = 255; markDirty(u);
    const o = OWN[u] - 1;
    const un = UNIT_AT.get(u); if (un) removeUnit(un);
    if (o >= 0 && (d2 < r * r * 0.56 || Math.random() < 0.55)) {
      if (!before.has(o)) before.set(o, NR[o].tiles);
      hit.set(o, (hit.get(o) || 0) + 1);
      setOwner(u, -1);
    }
  }
  for (const [o, n] of hit) { const N = G.nat[o]; if (N.alive) N.troops = Math.max(0, N.troops - N.troops * Math.min(0.85, n / Math.max(1, before.get(o)) * 1.6)); }
  for (const s of G.ships.slice()) { const st = shipTile(s); if (Math.abs(tx(st) - cx) <= r && Math.abs(ty(st) - cy) <= r) removeShip(s); }
  const [x, y] = tileCenter(t);
  FX.push({ x, y, r: r * TS * 1.3, t: 0, T: 1.4, c: '#ff8a2a' });
  BURNL.push(t);
  burnPending = true;
}
let BURNL = [], burnPending = false;
/* Yanık izleri yavaşça söner */
function burnTick() {
  if (!burnPending || G.tick % 10) return;
  let any = false;
  for (let i = 0; i < BURNL.length; i++) {
    const t = BURNL[i], r = 16, cx = tx(t), cy = ty(t);
    let live = false;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= FW || y >= FH) continue;
      const u = y * FW + x;
      if (BURN[u]) { BURN[u] = Math.max(0, BURN[u] - 4); markDirty(u); if (BURN[u]) live = true; }
    }
    if (!live) { BURNL.splice(i, 1); i--; } else any = true;
  }
  burnPending = any;
}

/* ---------- Yerleşimler ve ulusların sonu ---------- */
function settlementTaken(sid, ni, old) {
  const s = G.titles[sid];
  if (!s) return;
  const N = ni >= 0 ? G.nat[ni] : null, r = natRealm(N), p = P();
  const prev = ch(s.holder), oldR = s.liege ? G.titles[s.liege] : null;
  if (r && !r.dead) { s.liege = r.id; const k = ch(r.holder); giveTitle(s, k && k.alive ? k : null); }
  else { s.liege = null; giveTitle(s, null); }
  if (oldR && r && oldR !== r) { const w = G.wars.find(w => [w.a, w.b].includes(oldR.id) && [w.a, w.b].includes(r.id)); if (w) w.taken[r.id] = (w.taken[r.id] || 0) + 1; }
  G.terrDirty = true;
  const mine = myNatIdx();
  if (ni === mine && mine >= 0) { log(L(`🏰 <b>${s.name}</b> fethedildi!`, `🏰 <b>${s.name}</b> has been conquered!`), 'good'); p.prestige += s.capital ? 40 : 15; }
  else if (old === mine && mine >= 0) log(L(`🔥 <b>${s.name}</b> düştü${N ? ' — ' + natName(N) : ''}.`, `🔥 <b>${s.name}</b> has fallen${N ? ' to ' + natName(N) : ''}.`), 'bad');
  else if (prev && relevant(prev)) log(L(`🏰 ${s.name}, ${natName(N)} eline geçti.`, `🏰 ${s.name} fell to ${natName(N)}.`), 'war');
  if (prev && prev.alive && oldR && N && prev.id !== (r && r.holder)) addOp(prev, natRuler(N), -30);
}
function natDies(i, killer) {
  const n = G.nat[i];
  n.alive = false;
  for (const k of G.atk.slice()) if (k.a === i || k.d === i) endAttack(k, k.d === i);
  for (const s of G.ships.slice()) if (s.n === i) removeShip(s);
  for (const u of G.units.slice()) if (u.n === i) removeUnit(u);
  const r = natRealm(n);
  if (r && !r.dead) checkRealmDeath(r, true);
  if (!r && killer === myNatIdx() && killer >= 0) log(L(`🏹 ${natName(n)} yok edildi.`, `🏹 The ${natName(n)} were wiped out.`), 'good');
}
/* Krallığa topraklarından bir ulus oy: yerleşimlerin çevresindeki kareler yeni ulusa geçer */
function carveNation(r, sids, radius = 14) {
  if (!OWN) return null;
  let n = natOfRealm(r);
  const fresh = !n;
  if (!n) n = addNation({ realm: r.id });
  const mine = new Set(sids.map(id => G.titles[id]).filter(Boolean).map(s => s.tile).filter(t => t >= 0));
  if (!mine.size) return n;
  const owners = new Set([...mine].map(t => OWN[t]));
  // Yarış: tüm yerleşimler kendi sahiplerinin topraklarında birlikte yayılır
  const seeds = settlements().filter(s => s.tile >= 0 && owners.has(OWN[s.tile]));
  const lab = new Map(), q = [];
  for (const s of seeds) { lab.set(s.tile, [mine.has(s.tile), 0]); q.push(s.tile); }
  const take = [];
  for (let h = 0; h < q.length; h++) {
    const t = q[h], [m, d] = lab.get(t);
    if (m) take.push(t);
    if (d >= radius) continue;
    for (const u of nbrs(t, [])) if (!lab.has(u) && TER[u] > 0 && owners.has(OWN[u])) { lab.set(u, [m, d + 1]); q.push(u); }
  }
  const oldTotals = new Map();
  for (const t of take) { const o = OWN[t] - 1; if (o >= 0 && o !== n.i) oldTotals.set(o, (oldTotals.get(o) || 0) + 1); }
  for (const [o, c] of oldTotals) { const O = G.nat[o]; const share = O.troops * c / Math.max(1, NR[o].tiles); O.troops -= share; n.troops += share; }
  if (fresh) n.troops = Math.max(n.troops, 1500);
  for (const t of take) setOwner(t, n.i);
  return n;
}

/* ---------- Kabileler (botlar) ---------- */
const TRIBES = {
  am: ['Tupi', 'Arawak', 'Maya', 'Mapuche', 'Inuit', 'Lakota', 'Muisca', 'Taíno', 'Cree', 'Kiowa', 'Guaraní', 'Apaçi', 'Kızılderili Mohawk', 'Karib', 'Kechua', 'Pueblo', 'Şoşon', 'Çeroki'],
  af: ['Hausa', 'Yoruba', 'Kongo', 'Tuareg', 'Somali', 'İgbo', 'Masai', 'Şona', 'Fulani', 'Mandinka', 'Kikuyu', 'Kuşi', 'Bantu', 'Akan', 'Malgaş'],
  as: ['Kıpçak', 'Kırgız', 'Tatar', 'Oğuz', 'Uygur', 'Tibet', 'Ainu', 'Yakut', 'Evenk', 'Naiman', 'Merkit', 'Çukçi', 'Karluk', 'Bedevi', 'Peştun', 'Beluç', 'Dayak', 'Moro', 'Tamil', 'Gond'],
  eu: ['Fin', 'Prusya', 'Litvanya', 'Sami', 'Kuman', 'Peçenek', 'Bask', 'Eston', 'Kurlandiya', 'İskoç', 'İrlanda', 'Galler'],
  oc: ['Maori', 'Aborjin', 'Papua', 'Polinezya', 'Tonga', 'Fiji'],
};
const BOT_COLORS = ['#8a7a5a', '#6f7f63', '#7d6a72', '#5f7280', '#8a6a4e', '#6a7a4a', '#7a5d5d', '#5d6f6a', '#86795f', '#6b6488', '#7f8a62', '#8c6f62'];
function regionOf(t) {
  const lon = tx(t) * TS / MAP.COS + MAP.LON0, lat = MAP.LAT1 - ty(t) * TS;
  if (lon < -30) return 'am';
  if (lon > 110 && lat < -10) return 'oc';
  if (lat < 34 && lon < 52 && lon > -20) return 'af';
  if (lon < 45 && lat > 34) return 'eu';
  return 'as';
}
function spawnBots(n) {
  const used = new Set(G.nat.filter(x => x.bot).map(x => x.bname));
  let tries = 0;
  while (n > 0 && tries++ < n * 400) {
    const t = rnd(0, FN - 1);
    if (TER[t] === 0 || OWN[t] || TER[t] === 3) continue;
    // Yakında kimse olmasın
    const x = tx(t), y = ty(t);
    let ok = true;
    for (let dy = -12; dy <= 12 && ok; dy += 3) for (let dx = -12; dx <= 12; dx += 3) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < FW && yy < FH && OWN[yy * FW + xx]) { ok = false; break; } }
    if (!ok) continue;
    const reg = regionOf(t), names = TRIBES[reg].filter(s => !used.has(s));
    const bname = names.length ? pick(names) : pick(TRIBES[reg]);
    used.add(bname);
    const nat = addNation({ bot: true, bname, color: pick(BOT_COLORS), troops: 800 });
    blob(t, 3, nat.i);
    n--;
  }
}
function blob(t, r, ni) {
  const q = [t], seen = new Map([[t, 0]]);
  for (let h = 0; h < q.length; h++) {
    const u = q[h], d = seen.get(u);
    if (TER[u] > 0 && !OWN[u]) setOwner(u, ni);
    if (d >= r) continue;
    for (const v of nbrs(u, [])) if (!seen.has(v) && TER[v] > 0 && !OWN[v]) { seen.set(v, d + 1); q.push(v); }
  }
}

/* ---------- Dünyayı kur ---------- */
function snapLand(x, y) {
  let t = tileAtXY(x, y);
  if (t >= 0 && TER[t] > 0) return t;
  let best = -1, bd = 1e9;
  const cx = Math.floor(x / TS), cy = Math.floor(y / TS);
  for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
    const xx = cx + dx, yy = cy + dy;
    if (xx < 0 || yy < 0 || xx >= FW || yy >= FH) continue;
    const u = yy * FW + xx;
    if (TER[u] > 0 && dx * dx + dy * dy < bd) { bd = dx * dx + dy * dy; best = u; }
  }
  return best;
}
function frontAlloc() {
  OWN = new Uint16Array(FN);
  NR = []; ATKRT = new Map(); UNIT_AT = new Map(); SETT_AT = new Map(); PROJ = []; FX = []; BURNL = [];
  BURN.fill(0);
  repaintAll();
}
function settlementTiles() {
  SETT_AT = new Map();
  for (const s of settlements()) {
    if (s.tile == null || s.tile < 0 || TER[s.tile] === 0) s.tile = snapLand(s.x, s.y);
    if (s.tile >= 0) SETT_AT.set(s.tile, s.id);
  }
}
/* Yeni oyun ya da eski (tur tabanlı) kayıttan geçiş: krallıklar yerleşimlerinin çevresinde başlar */
function frontInit() {
  buildTerrain();
  G.nat = []; G.units = []; G.ships = []; G.atk = [];
  G.tick = 0; G.nextAtk = 1; G.nextUnit = 1; G.nextShip = 1; G.dayAcc = 0; G.fv = 1;
  G.truce = 1500; // ilk 2,5 dakika kimse oyuncuya saldırmaz
  frontAlloc();
  for (const r of realms()) { delete r.nat; addNation({ realm: r.id }); }
  settlementTiles();
  // Yerleşimlerden yayılarak ilk topraklar (en yakın yerleşim kazanır)
  const q = [], lab = new Map();
  for (const s of settlements()) {
    const r = s.liege ? G.titles[s.liege] : null, n = natOfRealm(r);
    if (!n || s.tile < 0) continue;
    const rad = s.capital ? 9 : s.kind === 'sehir' ? 6 : 5;
    if (!lab.has(s.tile)) { lab.set(s.tile, [n.i, 0, rad]); q.push(s.tile); }
  }
  for (let h = 0; h < q.length; h++) {
    const t = q[h], [ni, d, rad] = lab.get(t);
    setOwner(t, ni);
    if (d >= rad) continue;
    for (const u of nbrs(t, [])) if (!lab.has(u) && TER[u] > 0) { lab.set(u, [ni, d + 1, rad]); q.push(u); }
  }
  // Yerleşimler birer yapı olarak başlar
  for (const s of settlements()) {
    if (s.tile < 0 || !OWN[s.tile]) continue;
    const ni = OWN[s.tile] - 1;
    if (UNIT_AT.has(s.tile)) continue;
    const u = { id: G.nextUnit++, k: s.kind === 'kale' ? 'kale' : 'kasaba', n: ni, t: s.tile, lvl: s.capital ? 2 : 1, cd: 0, seed: 1 };
    G.units.push(u); UNIT_AT.set(u.t, u);
    if (s.capital && isCoastTile(s.tile)) { /* başkent kıyıdaysa yanında bir liman */
      const c = COASTL.find(t => OWN[t] === ni + 1 && tdist(t, s.tile) >= 3 && tdist(t, s.tile) <= 6 && !nearUnit(t, 2));
      if (c != null) { const h = { id: G.nextUnit++, k: 'liman', n: ni, t: c, lvl: 1, cd: 0, seed: 1 }; G.units.push(h); UNIT_AT.set(c, h); }
    }
  }
  for (const n of G.nat) { NR[n.i].cntT = -99; n.troops = maxTroops(n) * 0.35; }
  spawnBots(46);
  for (const n of G.nat) if (n.bot) n.troops = maxTroops(n) * 0.4;
  // Haritada yerleşimi kalmamış krallıklar
  for (const r of realms()) { const n = natOfRealm(r); if (n && !NR[n.i].tiles) natDies(n.i, -1); }
}

/* ---------- Kayıt ---------- */
function frontSerialize() {
  if (!OWN || !G || !G.nat) return;
  const out = [];
  let cur = OWN[0], run = 0;
  for (let t = 0; t < FN; t++) {
    const o = OWN[t];
    if (o === cur) { run++; continue; }
    out.push(cur.toString(36) + (run > 1 ? '.' + run.toString(36) : ''));
    cur = o; run = 1;
  }
  out.push(cur.toString(36) + (run > 1 ? '.' + run.toString(36) : ''));
  G.terr = out.join(',');
  G.terrW = FW;
}
function frontLoad() {
  buildTerrain();
  frontAlloc();
  if (!G.terr || G.terrW !== FW) return false;
  let t = 0;
  for (const part of G.terr.split(',')) {
    const [a, b] = part.split('.');
    const o = parseInt(a, 36), n = b ? parseInt(b, 36) : 1;
    if (o) OWN.fill(o, t, t + n);
    t += n;
  }
  for (const n of G.nat) NR[n.i] = natRT(n);
  for (let u = 0; u < FN; u++) {
    const o = OWN[u];
    if (!o) continue;
    if (!G.nat[o - 1]) { OWN[u] = 0; continue; }
    const R = NR[o - 1]; R.tiles++; R.sx += tx(u); R.sy += ty(u);
    updBorder(u);
  }
  for (const u of G.units) UNIT_AT.set(u.t, u);
  for (const r of realms()) { const n = G.nat.find(x => x.realm === r.id); if (n) r.nat = n.i; }
  settlementTiles();
  for (const n of G.nat) n.boats = G.ships.filter(s => s.n === n.i && s.k === 'gemi').length;
  repaintAll();
  return true;
}

/* ---------- Ana adım ---------- */
function frontTick() {
  G.tick++;
  for (const k of G.atk.slice()) if (G.atk.includes(k)) atkTick(k);
  shipsTick();
  projTick();
  burnTick();
  const mine = myNatIdx();
  for (const n of G.nat) {
    if (!n.alive) continue;
    n.troops = Math.max(0, n.troops + troopGrowth(n));
    n.gf = (n.gf || 0) + goldRate(n) * TICK;
    if (n.gf >= 1) { const g = Math.floor(n.gf); n.gf -= g; addNatGold(n, g); }
    if (n.i !== mine && (G.tick + n.think) % 20 === 0) aiNation(n);
  }
  if (G.tick % 30 === 0) tradeTick();
  if (G.tick % 50 === 0) checkVictory();
}
function landShare(i) { return i >= 0 && NR[i] ? NR[i].tiles / Math.max(1, LANDTOTAL) : 0; }
function checkVictory() {
  const i = myNatIdx();
  if (i < 0 || G.won) return;
  if (landShare(i) >= 0.8) {
    G.won = true;
    info(L('🏆 Dünyanın efendisi', '🏆 Master of the world'), L('Bilinen dünyanın beşte dördü senin sancağın altında. Ozanlar adını yüzyıllarca anacak. Dilersen hükmetmeye devam edebilirsin.', 'Four fifths of the known world fly your banner. Bards will sing your name for centuries. You may rule on if you wish.'));
  }
}

/* ---------- Yapay zekâ ---------- */
function randomOwnTile(i, f) {
  const [x0, y0, x1, y1] = natBox(i), me = i + 1;
  for (let k = 0; k < 50; k++) {
    const t = rnd(y0, y1) * FW + rnd(x0, x1);
    if (OWN[t] === me && (!f || f(t))) return t;
  }
  return -1;
}
function aiBuild(n) {
  const i = n.i, R = NR[i], g = natGold(n);
  if (natRuler(n) && natRuler(n).id === G.playerId) return; // oyuncunun hazinesine dokunma
  natBox(i);
  const war = [...natNeighbors(i).keys()].some(o => o >= 0 && hostileNat(i, o) && !G.nat[o].bot);
  const want = [];
  if (R.towns < 1 + R.tiles / 450) want.push('kasaba');
  if (R.harbors < 1 + R.tiles / 1800 && R.border.size && [...R.border].some(isCoastTile)) want.push('liman');
  if (war && R.forts < 1 + R.border.size / 300) want.push('kale');
  if (!n.bot && R.tiles > 1400 && !R.shops && g > 2500) want.push('atolye');
  if (!n.bot && R.tiles > 900 && R.towers < 1 + R.tiles / 4000 && g > 2400 && G.units.some(u => u.k === 'atolye' && u.n !== i && hostileNat(i, u.n))) want.push('kule');
  for (const k of want) {
    if (g < unitCost(i, k)) continue;
    let t = -1;
    if (k === 'liman') { const cs = [...R.border].filter(isCoastTile); for (let j = 0; j < 12 && t < 0; j++) { const c = pick(cs); if (!buildReason(i, k, c)) t = c; } }
    else if (k === 'kale') { const bs = [...R.border]; for (let j = 0; j < 12 && t < 0; j++) { const c = pick(bs); if (!buildReason(i, k, c) && nbrs(c, []).some(u => OWN[u] && OWN[u] !== i + 1 && hostileNat(i, OWN[u] - 1))) t = c; } }
    else t = randomOwnTile(i, c => !R.border.has(c) && !buildReason(i, k, c));
    if (t >= 0) { buildUnit(i, k, t); return; }
  }
  if (R.harbors && R.galleys < Math.min(4, R.harbors) && g > GALLEY_COST(R.galleys) + 300 && chance(0.3)) {
    const h = G.units.find(u => u.k === 'liman' && u.n === i);
    if (h) buildGalley(i, h);
  }
  // Ateş saldırısı (zengin, savaştaki krallıklar)
  if (!n.bot && R.shops && chance(0.06)) {
    const foes = [...natNeighbors(i).keys()].filter(o => o >= 0 && hostileNat(i, o) && !G.nat[o].bot);
    const enemies = (foes.length ? foes : enemiesOf(natRealm(n)).map(r => natOfRealm(r)).filter(Boolean).map(x => x.i)).filter(o => !(o === myNatIdx() && G.tick < (G.truce || 0)));
    if (enemies.length) {
      const o = pick(enemies), k = g > STRIKES.yagmur.cost * 1.5 && chance(0.2) ? 'yagmur' : g > STRIKES.buyuk.cost * 1.4 && chance(0.4) ? 'buyuk' : 'ates';
      if (g > STRIKES[k].cost * 1.3) {
        const tgt = G.units.filter(u => u.n === o && (u.k === 'kasaba' || u.k === 'atolye'));
        const t = tgt.length ? pick(tgt).t : natLabelTile(o);
        if (t >= 0) launchStrike(i, k, t);
      }
    }
  }
}
function aiBoat(n) {
  if (n.boats >= MAX_BOATS || !COASTL.length) return;
  const i = n.i, R = NR[i];
  const coasts = [...R.border].filter(isCoastTile);
  if (!coasts.length) return;
  const from = pick(coasts), fx_ = tx(from), fy_ = ty(from);
  let best = -1;
  for (let k = 0; k < 40; k++) {
    const c = COASTL[rnd(0, COASTL.length - 1)];
    if (Math.abs(tx(c) - fx_) > 70 || Math.abs(ty(c) - fy_) > 70) continue;
    const o = OWN[c] - 1;
    if (o === i || (o >= 0 && o === myNatIdx() && G.tick < (G.truce || 0)) || (o >= 0 && (!hostileNat(i, o) || G.nat[o].troops / Math.max(1, NR[o].tiles) > n.troops / Math.max(1, R.tiles)))) continue;
    best = c; if (o < 0) break;
  }
  if (best >= 0) sendBoat(i, best, n.troops * 0.3, 30000);
}
function aiNation(n) {
  const i = n.i, R = NR[i];
  if (!R.tiles) return;
  aiBuild(n);
  const max = maxTroops(n), fill = n.troops / max;
  const out = G.atk.filter(k => k.a === i).length;
  if (out >= 3 || fill < (n.bot ? 0.42 : 0.5)) return;
  const nb = natNeighbors(i);
  if (nb.has(-1) && chance(n.bot ? 0.75 : 0.85)) { launchAttack(i, -1, n.troops * (n.bot ? 0.28 : 0.33)); return; }
  let best = -1, bs = -1e9;
  const myD = n.troops / Math.max(1, R.tiles);
  for (const [o, cnt] of nb) {
    if (o < 0) continue;
    const D = G.nat[o];
    if (!D.alive || !hostileNat(i, o) || alliedNat(i, o)) continue;
    if (o === myNatIdx() && G.tick < (G.truce || 0)) continue;
    if (n.bot && !D.bot && chance(0.6)) continue;
    const dd = D.troops / Math.max(1, NR[o].tiles);
    const sc = (n.troops / (D.troops + 1)) * 30 + Math.min(20, cnt * 0.1) - (dd / Math.max(1, myD)) * 15 + Math.random() * 20 + (D.bot ? 12 : 0);
    if (sc > bs) { bs = sc; best = o; }
  }
  if (best >= 0 && bs > 18 && fill > 0.6) { launchAttack(i, best, n.troops * (n.bot ? 0.3 : 0.4)); return; }
  if (!nb.has(-1) && chance(0.12)) aiBoat(n);
}
