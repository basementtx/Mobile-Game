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
/* Sayısal dizinli ızgara: "x,y" dize anahtarlı Map'ten çok daha hızlı (dünya haritası için şart) */
function cellGrid() {
  const w = Math.ceil(MAP.W / PROV_CELL) + 1, h = Math.ceil(MAP.H / PROV_CELL) + 1, a = new Array(w * h);
  return {
    get: (gx, gy) => (gx < 0 || gy < 0 || gx >= w || gy >= h ? undefined : a[gx * h + gy]),
    add(x, y, v) {
      const gx = Math.min(w - 1, Math.max(0, Math.floor(x / PROV_CELL))), gy = Math.min(h - 1, Math.max(0, Math.floor(y / PROV_CELL)));
      const i = gx * h + gy; (a[i] || (a[i] = [])).push(v);
    },
  };
}
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
  const hash = cellGrid();
  const hk = (x, y) => Math.floor(x / PROV_CELL) + ',' + Math.floor(y / PROV_CELL);
  const addHash = (s, i) => hash.add(s.x, s.y, i);
  seeds.forEach(addHash);
  const near = (x, y, r) => {
    const gx = Math.floor(x / PROV_CELL), gy = Math.floor(y / PROV_CELL), R = Math.ceil(r / PROV_CELL);
    for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) {
      const a = hash.get(gx + i, gy + j); if (!a) continue;
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
    const r = dS < 4 ? 1.15 : dS < 7 ? 1.7 : dS < 14 ? 2.5 : 3.6;
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
      const arr = hash.get(gx + a, gy + b); if (!arr) continue;
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
  // 5) Bağlantısız adaları ve kıtaları en yakın ile deniz yoluyla bağla (ızgarayla hızlı en yakın arama)
  for (let guard = 0; guard < 2000; guard++) {
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
      const gx = Math.floor(PROV[i].x / PROV_CELL), gy = Math.floor(PROV[i].y / PROV_CELL);
      for (let R = 1; R <= 60 && !(best && (R - 1) * PROV_CELL > Math.sqrt(bd)); R++) {
        for (let a = -R; a <= R; a++) for (let b = -R; b <= R; b++) {
          if (Math.max(Math.abs(a), Math.abs(b)) !== R) continue;
          const arr = hash.get(gx + a, gy + b); if (!arr) continue;
          for (const k of arr) { if (comp[k] === small) continue; const d = (PROV[i].x - PROV[k].x) ** 2 + (PROV[i].y - PROV[k].y) ** 2; if (d < bd) { bd = d; best = [i, k]; } }
        }
      }
    }
    if (!best) break;
    const cost = Math.max(2, Math.round(Math.sqrt(bd) / 1.6));
    addNb(best[0], best[1], cost, true); addNb(best[1], best[0], cost, true);
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
  // 7) Düz Voronoi kenarlarını doğal, girintili çıkıntılı sınırlara çevir
  roughenBorders();
  // 8) Hızlı arama için ızgara
  _provHash = cellGrid();
  for (const pv of PROV) _provHash.add(pv.x, pv.y, pv.id);
}

/* Kenarı ara noktalarla kır (orta nokta kaydırma): gerçek sınırlara benzeyen kıvrımlı çizgi.
   Her nokta oluştuğu derinliği taşır (q[2]); düşük derinlikli noktalar kaba ayrıntı düzeyini (LOD) verir. */
const LOD_MIN = 2, LOD_MAX = 6;
function roughLine(x1, y1, x2, y2, rand) {
  const out = [[x1, y1, -1]];
  const rec = (ax, ay, bx, by, amp, depth) => {
    const len = Math.hypot(bx - ax, by - ay);
    if (len < 0.07 || depth >= LOD_MAX) { out.push([bx, by, -1]); return; }
    const nx = -(by - ay) / len, ny = (bx - ax) / len;
    const o = (rand() * 2 - 1) * amp * len, t = 0.38 + rand() * 0.24;
    const mx = ax + (bx - ax) * t + nx * o, my = ay + (by - ay) * t + ny * o;
    rec(ax, ay, mx, my, amp * 0.72, depth + 1);
    out[out.length - 1][2] = depth; // az önce eklenen orta nokta
    rec(mx, my, bx, by, amp * 0.72, depth + 1);
  };
  rec(x1, y1, x2, y2, 0.3, 0);
  out[out.length - 1][2] = -1;
  return out;
}
const lodOf = (pts, k) => pts.filter(q => q[2] < k);
function roughenBorders() {
  const lines = new Map();
  for (const e of PROV_EDGES) {
    e.pts = roughLine(e.x1, e.y1, e.x2, e.y2, mulberry32(e.a * 7919 + e.b * 104729 + 17));
    e.lod = [];
    for (let k = LOD_MIN; k <= LOD_MAX; k++) e.lod[k] = lodOf(e.pts, k);
    lines.set(e.a + ',' + e.b, e);
  }
  for (const pv of PROV) {
    pv.lod = [];
    for (let k = LOD_MIN; k <= LOD_MAX; k++) {
      const P = pv.poly, n = P.length, out = [];
      for (let i = 0; i < n; i++) {
        const j = P[i][2];
        const ed = j >= 0 ? (pv.id < j ? lines.get(pv.id + ',' + j) : lines.get(j + ',' + pv.id)) : null;
        if (!ed) { out.push(P[i]); continue; }
        const line = ed.lod[k];
        const seq = pv.id < j ? line : line.slice().reverse();
        for (let q = 0; q < seq.length - 1; q++) out.push(seq[q]);
      }
      pv.lod[k] = out;
    }
    pv.rough = pv.lod[LOD_MAX];
  }
  const bbox = pts => { let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; for (const q of pts) { if (q[0] < a) a = q[0]; if (q[0] > c) c = q[0]; if (q[1] < b) b = q[1]; if (q[1] > d) d = q[1]; } return [a, b, c, d]; };
  for (const pv of PROV) pv.bb = bbox(pv.rough);
  for (const e of PROV_EDGES) e.bb = bbox(e.pts);
}
/* Yakınlaştırmaya göre ayrıntı düzeyi: kenar parçaları ekranda ~5 piksel olsun */
function lodFor(z) { return Math.max(LOD_MIN, Math.min(LOD_MAX, Math.round(Math.log2(z / 4)))); }
function pointInPoly(x, y, poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
/* Dokunulan noktanın ili: kıvrımlı sınırlara göre (bulunamazsa en yakın tohum) */
function provinceAtExact(x, y) {
  const near = provinceAt(x, y);
  if (!near || pointInPoly(x, y, near.rough)) return near;
  for (const e of near.nb) { const q = PROV[e.to]; if (pointInPoly(x, y, q.rough)) return q; }
  return near;
}

/* (x,y) noktasının ili = en yakın tohum (Voronoi tanımı) */
function provinceAt(x, y) {
  const gx = Math.floor(x / PROV_CELL), gy = Math.floor(y / PROV_CELL);
  let best = null, bd = Infinity;
  for (let R = 1; R <= 6 && !best; R += 2) {
    for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) {
      const a = _provHash.get(gx + i, gy + j); if (!a) continue;
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
  return wildName(pv);
}
/* Sahipsiz illere iklime ve bölgeye göre ad ver */
function wildName(pv) {
  const lat = MAP.LAT1 - pv.y, lon = pv.x / MAP.COS + MAP.LON0, al = Math.abs(lat);
  const inBox = (a, b, c, d) => lon >= a && lon <= b && lat >= c && lat <= d;
  if (al > 66) return L('Tundra', 'Tundra');
  if (inBox(-17, 35, 15, 33) || inBox(35, 60, 15, 31) || inBox(115, 145, -32, -18) || inBox(-75, -68, -28, -16) || inBox(-118, -105, 26, 36)) return L('Çöl', 'Desert');
  if (inBox(90, 118, 38, 48)) return L('Gobi', 'Gobi');
  if (al > 55) return L('Tayga', 'Taiga');
  if (inBox(30, 120, 44, 55)) return L('Bozkır', 'Steppe');
  if (inBox(-110, -90, 35, 52)) return L('Çayırlar', 'Prairie');
  if (inBox(-66, -55, -48, -30)) return L('Pampa', 'Pampas');
  if (al < 12) return L('Yağmur ormanı', 'Rainforest');
  if (al < 23) return L('Savan', 'Savanna');
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
