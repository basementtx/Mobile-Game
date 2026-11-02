'use strict';
/* =========================================================
   Crown & Dagger — İller (provinces)
   Harita, her yerleşimin ve aralardaki kırsal bölgelerin
   Voronoi hücrelerinden oluşan illere bölünür. Hücreler keskin
   çokgenlerdir; komşuluk grafiği tur tabanlı hareket için kullanılır.
   Üretim deterministiktir (kayıt dosyasına yazılmaz).
   ========================================================= */

let PROV = [];          // { id, x, y, poly:[[x,y]..], nb:[{to,cost,sea}], sett: yerleşim sırası|-1, seat: bağlı yerleşim sırası|-1, dir }
let PROV_EDGES = [];    // { a, b, x1, y1, x2, y2 } — iki il arasındaki sınır parçaları
let _provHash = null;
const PROV_CELL = 2;

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* Yarım düzlem kırpma: p'nin (sx,sy)'ye (ox,oy)'den daha yakın olduğu taraf kalır.
   Her köşe, kendisinden çıkan kenarın etiketini taşır (komşu il sırası, -1 = harita sınırı). */
function clipHalf(poly, sx, sy, ox, oy, label) {
  const mx = (sx + ox) / 2, my = (sy + oy) / 2, nx = ox - sx, ny = oy - sy;
  const side = p => (p[0] - mx) * nx + (p[1] - my) * ny; // <=0 : içeride
  const out = [];
  const n = poly.length;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    const da = side(a), db = side(b);
    if (da <= 0) out.push(a);
    if ((da <= 0) !== (db <= 0)) {
      const t = da / (da - db);
      const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0];
      // giren noktadan çıkan kenar: içeriden dışarı çıkıyorsak yeni kenar bisektör (label), içeri giriyorsak eski kenar
      p[2] = da <= 0 ? label : a[2];
      out.push(p);
    }
  }
  return out;
}

function buildProvinces() {
  const rand = mulberry32(1180);
  const seeds = [];
  // 1) Yerleşimler (sıra SETTLEMENTS ile aynı)
  const settXY = SETTLEMENTS.map(([, lon, lat]) => proj(lon, lat));
  settXY.forEach(([x, y], i) => seeds.push({ x, y, sett: i }));
  // 2) Kırsal tohumlar: kara hücrelerine rastgele sırayla "dart" at
  const hash = new Map();
  const hk = (x, y) => Math.floor(x / PROV_CELL) + ',' + Math.floor(y / PROV_CELL);
  const addHash = (s, i) => { const k = hk(s.x, s.y); let a = hash.get(k); if (!a) hash.set(k, a = []); a.push(i); };
  seeds.forEach(addHash);
  const near = (x, y, r) => {
    const gx = Math.floor(x / PROV_CELL), gy = Math.floor(y / PROV_CELL), R = Math.ceil(r / PROV_CELL);
    for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) {
      const a = hash.get((gx + i) + ',' + (gy + j)); if (!a) continue;
      for (const k of a) { const s = seeds[k]; if ((s.x - x) ** 2 + (s.y - y) ** 2 < r * r) return true; }
    }
    return false;
  };
  const cells = [];
  for (let j = 0; j < GRID.h; j += 2) for (let i = 0; i < GRID.w; i += 2) if (LANDGRID[j * GRID.w + i]) cells.push([i, j]);
  for (let i = cells.length - 1; i > 0; i--) { const k = Math.floor(rand() * (i + 1)); [cells[i], cells[k]] = [cells[k], cells[i]]; }
  for (const [i, j] of cells) {
    const x = (i + 0.5 + (rand() - 0.5) * 1.5) * GRID.step, y = (j + 0.5 + (rand() - 0.5) * 1.5) * GRID.step;
    if (!isLand(x, y)) continue;
    let dS = 1e9;
    for (const [sx, sy] of settXY) { const d = (sx - x) ** 2 + (sy - y) ** 2; if (d < dS) dS = d; }
    dS = Math.sqrt(dS);
    const r = dS < 4 ? 1.15 : dS < 7 ? 1.7 : 2.5;
    if (dS < 0.95 || near(x, y, r)) continue;
    seeds.push({ x, y, sett: -1 });
    addHash(seeds[seeds.length - 1], seeds.length - 1);
  }
  // 3) Voronoi hücreleri
  const N = seeds.length;
  PROV = seeds.map((s, id) => ({ id, x: s.x, y: s.y, sett: s.sett, seat: -1, poly: null, nb: [] }));
  const bbox = (s, R) => [[Math.max(0, s.x - R), Math.max(0, s.y - R), -1], [Math.min(MAP.W, s.x + R), Math.max(0, s.y - R), -1], [Math.min(MAP.W, s.x + R), Math.min(MAP.H, s.y + R), -1], [Math.max(0, s.x - R), Math.min(MAP.H, s.y + R), -1]];
  const order = new Array(N);
  for (let i = 0; i < N; i++) {
    const s = seeds[i];
    let poly = bbox(s, 7);
    const cand = [];
    const gx = Math.floor(s.x / PROV_CELL), gy = Math.floor(s.y / PROV_CELL), R = Math.ceil(14 / PROV_CELL);
    for (let a = -R; a <= R; a++) for (let b = -R; b <= R; b++) {
      const arr = hash.get((gx + a) + ',' + (gy + b)); if (!arr) continue;
      for (const k of arr) if (k !== i) cand.push([k, (seeds[k].x - s.x) ** 2 + (seeds[k].y - s.y) ** 2]);
    }
    cand.sort((a, b) => a[1] - b[1]);
    for (const [k, d2] of cand) {
      let maxR = 0;
      for (const p of poly) { const d = (p[0] - s.x) ** 2 + (p[1] - s.y) ** 2; if (d > maxR) maxR = d; }
      if (d2 > 4 * maxR) break;
      poly = clipHalf(poly, s.x, s.y, seeds[k].x, seeds[k].y, k);
      if (poly.length < 3) break;
    }
    PROV[i].poly = poly;
    order[i] = i;
  }
  // 4) Komşuluk ve sınır parçaları
  PROV_EDGES = [];
  const addNb = (a, b, cost, sea) => { if (!PROV[a].nb.some(n => n.to === b)) PROV[a].nb.push({ to: b, cost, sea }); };
  for (const pv of PROV) {
    const P = pv.poly, n = P.length;
    for (let i = 0; i < n; i++) {
      const j = P[i][2];
      if (j < 0) continue;
      const a = P[i], b = P[(i + 1) % n];
      if (pv.id < j) PROV_EDGES.push({ a: pv.id, b: j, x1: a[0], y1: a[1], x2: b[0], y2: b[1] });
      let land = false;
      for (let t = 0.1; t <= 0.9; t += 0.2) if (isLand(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) { land = true; break; }
      const q = PROV[j], d = Math.hypot(q.x - pv.x, q.y - pv.y);
      if (land) { addNb(pv.id, j, 1, false); addNb(j, pv.id, 1, false); }
      else if (d < 3.2) { addNb(pv.id, j, 2, true); addNb(j, pv.id, 2, true); }
    }
  }
  // 5) Bağlantısız adaları en yakın ile deniz yoluyla bağla
  for (let guard = 0; guard < 60; guard++) {
    const comp = new Int32Array(N).fill(-1);
    let nc = 0;
    for (let i = 0; i < N; i++) {
      if (comp[i] >= 0) continue;
      const st = [i]; comp[i] = nc;
      while (st.length) { const u = st.pop(); for (const e of PROV[u].nb) if (comp[e.to] < 0) { comp[e.to] = nc; st.push(e.to); } }
      nc++;
    }
    if (nc <= 1) break;
    const size = new Array(nc).fill(0); for (let i = 0; i < N; i++) size[comp[i]]++;
    let small = 0; for (let c = 1; c < nc; c++) if (size[c] < size[small]) small = c;
    let best = null, bd = 1e9;
    for (let i = 0; i < N; i++) {
      if (comp[i] !== small) continue;
      for (let k = 0; k < N; k++) {
        if (comp[k] === small) continue;
        const d = (PROV[i].x - PROV[k].x) ** 2 + (PROV[i].y - PROV[k].y) ** 2;
        if (d < bd) { bd = d; best = [i, k]; }
      }
    }
    if (!best) break;
    addNb(best[0], best[1], 2, true); addNb(best[1], best[0], 2, true);
  }
  // 6) Kırsal illeri, karadan en yakın yerleşime bağla (Dijkstra, en fazla 5.5 birim)
  const dist_ = new Float64Array(N).fill(Infinity);
  const heap = [];
  const push = (d, i, s) => { heap.push([d, i, s]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
  for (const pv of PROV) if (pv.sett >= 0) { dist_[pv.id] = 0; pv.seat = pv.sett; push(0, pv.id, pv.sett); }
  while (heap.length) {
    const [d, u, s] = pop();
    if (d > dist_[u]) continue;
    for (const e of PROV[u].nb) {
      if (e.sea) continue;
      const nd = d + Math.hypot(PROV[e.to].x - PROV[u].x, PROV[e.to].y - PROV[u].y);
      if (nd < dist_[e.to] && nd <= 5.5) { dist_[e.to] = nd; PROV[e.to].seat = s; push(nd, e.to, s); }
    }
  }
  for (const pv of PROV) {
    if (pv.sett >= 0 || pv.seat < 0) continue;
    const [sx, sy] = settXY[pv.seat];
    pv.dir = Math.round(((Math.atan2(-(pv.y - sy), pv.x - sx) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8;
  }
  // 7) Hızlı arama için ızgara
  _provHash = new Map();
  for (const pv of PROV) { const k = hk(pv.x, pv.y); let a = _provHash.get(k); if (!a) _provHash.set(k, a = []); a.push(pv.id); }
}

/* (x,y) noktasının ili = en yakın tohum (Voronoi tanımı) */
function provinceAt(x, y) {
  const gx = Math.floor(x / PROV_CELL), gy = Math.floor(y / PROV_CELL);
  let best = null, bd = Infinity;
  for (let R = 1; R <= 6 && !best; R += 2) {
    for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) {
      const a = _provHash.get((gx + i) + ',' + (gy + j)); if (!a) continue;
      for (const k of a) { const p = PROV[k], d = (p.x - x) ** 2 + (p.y - y) ** 2; if (d < bd) { bd = d; best = p; } }
    }
  }
  return best;
}

const DIRS = [BL('Doğu', 'East'), BL('Kuzeydoğu', 'Northeast'), BL('Kuzey', 'North'), BL('Kuzeybatı', 'Northwest'), BL('Batı', 'West'), BL('Güneybatı', 'Southwest'), BL('Güney', 'South'), BL('Güneydoğu', 'Southeast')];
function provName(pv) {
  if (!pv) return '';
  if (pv.sett >= 0) return settName(SETTLEMENTS[pv.sett][0]);
  if (pv.seat >= 0) return L(`${pickB(DIRS[pv.dir])} ${settName(SETTLEMENTS[pv.seat][0])}`, `${pickB(DIRS[pv.dir])} ${settName(SETTLEMENTS[pv.seat][0])}`);
  const lat = MAP.LAT1 - pv.y, lon = pv.x / MAP.COS + MAP.LON0;
  if (lat < 31) return L('Çöl', 'Desert');
  if (lat > 59) return L('Tayga', 'Taiga');
  if (lon > 33 && lat > 45) return L('Bozkır', 'Steppe');
  return L('Sahipsiz topraklar', 'Wilderness');
}
/* İlin bağlı olduğu yerleşim (title nesnesi) ya da null */
function provSettlement(pv) { return pv && pv.seat >= 0 && G ? G.titles[G.settIds[pv.seat]] : null; }

/* En ucuz yol (Dijkstra). Dönüş: başlangıç hariç il sırası listesi ya da null */
function findPath(from, to) {
  if (from === to) return [];
  const N = PROV.length;
  const d = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1);
  d[from] = 0;
  const open = [[0, from]];
  while (open.length) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [du, u] = open.splice(bi, 1)[0];
    if (du > d[u]) continue;
    if (u === to) break;
    for (const e of PROV[u].nb) {
      const nd = du + e.cost + Math.hypot(PROV[e.to].x - PROV[u].x, PROV[e.to].y - PROV[u].y) * 0.01;
      if (nd < d[e.to]) { d[e.to] = nd; prev[e.to] = u; open.push([nd, e.to]); }
    }
  }
  if (prev[to] < 0) return null;
  const path = [];
  for (let c = to; c !== from; c = prev[c]) path.unshift(c);
  return path;
}
function edgeCost(a, b) { const e = PROV[a].nb.find(n => n.to === b); return e ? e.cost : 2; }
/* Yolu turlara böl: her turda hareket puanı kadar ilerle. Dönüş: [[il..], [il..], ...] */
function splitTurns(from, path, mp) {
  const turns = [];
  let cur = [], left = mp, prev = from;
  for (const id of path) {
    const c = edgeCost(prev, id);
    if (c > left && cur.length) { turns.push(cur); cur = []; left = mp; }
    cur.push(id); left -= c; prev = id;
    if (left <= 0) { turns.push(cur); cur = []; left = mp; }
  }
  if (cur.length) turns.push(cur);
  return turns;
}
