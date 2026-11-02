'use strict';
/* =========================================================
   TAÇ VE HANÇER — Savaş ekranı (üstten 2D)
   Kahramanını joystick ile yönet, askerlerine emir ver.
   ========================================================= */

const BW = 1600, BH = 1000;
const SIDE_COL = ['#3b78d8', '#c8392e'];
const SIDE_DARK = ['#1d3d70', '#6a1a14'];
let B = null;

function battleUnit(side, type, x, y, extra) {
  const T = TROOPS[type];
  const u = Object.assign({
    side, type, cls: T.sinif, ranged: T.range > 0, range: T.range,
    x, y, hx: x, hy: y, vx: 0, vy: 0, face: side === 0 ? 0 : Math.PI,
    hp: T.hp, max: T.hp, atk: T.atk, def: T.def, spd: T.spd * 52,
    r: T.sinif === 'atli' ? 8.5 : 6, cd: Math.random(), tgt: null, retarget: Math.random() * 0.4,
    state: 'ok', flash: 0, lastAtk: -9, hero: false, leader: false,
  }, extra || {});
  return u;
}

/* o: { A: oyuncu ordusu, enemy: {troops, leaderId, name}, siege: yerleşim|null, onEnd(sonuç) } */
function startBattle(o) {
  const p = P();
  const aT = Object.assign({}, o.A.troops), eT = Object.assign({}, o.enemy.troops);
  const na = Object.values(aT).reduce((a, b) => a + b, 0), ne = Object.values(eT).reduce((a, b) => a + b, 0);
  const scale = Math.max(1, Math.ceil(Math.max(na, ne) / 110));
  const units = [];
  const place = (side, troops) => {
    const groups = { piyade: [], okcu: [], atli: [] };
    for (const k in troops) {
      const n = Math.round(troops[k] / scale) || (troops[k] > 0 ? 1 : 0);
      for (let i = 0; i < n; i++) groups[TROOPS[k].sinif].push(k);
    }
    const dir = side === 0 ? 1 : -1;
    const baseX = o.siege && side === 1 ? 1250 : side === 0 ? 360 : BW - 360;
    const lay = (list, x0, yc, cols) => {
      list.forEach((k, i) => {
        const row = Math.floor(i / cols), col = i % cols;
        const y = yc + (col - (Math.min(cols, list.length) - 1) / 2) * 15 + (Math.random() - 0.5) * 3;
        units.push(battleUnit(side, k, x0 - dir * row * 15, clamp(y, 30, BH - 30), { slot: [x0 - dir * row * 15 - baseX, y - BH / 2] }));
      });
    };
    lay(groups.piyade, baseX, BH / 2, 22);
    lay(groups.okcu, baseX - dir * (Math.ceil(groups.piyade.length / 22) * 15 + 30), BH / 2, 22);
    const half = Math.ceil(groups.atli.length / 2);
    lay(groups.atli.slice(0, half), baseX - dir * 20, BH / 2 - 230, 8);
    lay(groups.atli.slice(half), baseX - dir * 20, BH / 2 + 230, 8);
    return Object.fromEntries(Object.entries(troops).map(([k]) => [k, units.filter(u => u.side === side && u.type === k).length]));
  };
  const placedA = place(0, aT), placedE = place(1, eT);
  // Kahraman
  const mounted = p.rank >= 2;
  const hero = battleUnit(0, mounted ? 'atli' : 'piyade', 300, BH / 2, {
    hero: true, hp: 90 + p.health * 0.6 + stat(p, 'sav') * 6, atk: 12 + stat(p, 'sav') * 1.2, def: 3 + stat(p, 'sav') / 3,
    spd: mounted ? 115 : 70, r: mounted ? 10 : 7.5, name: p.name,
  });
  hero.max = hero.hp;
  units.push(hero);
  const lc = o.enemy.leaderId != null ? ch(o.enemy.leaderId) : null;
  if (lc) {
    const lu = battleUnit(1, 'agir', o.siege ? 1400 : BW - 300, BH / 2, { leader: true, hp: 100 + stat(lc, 'sav') * 6, atk: 12 + stat(lc, 'sav'), def: 4 + stat(lc, 'sav') / 3, r: 10, name: lc.name });
    lu.max = lu.hp;
    units.push(lu);
  }
  B = {
    units, arrows: [], t: 0, scale, order: 'bekle', aiOrder: o.siege ? 'bekle' : 'hucum', o, hero,
    init: [units.filter(u => u.side === 0).length, units.filter(u => u.side === 1).length],
    placed: [placedA, placedE], over: false, overview: false, endT: 0, msg: '',
    wall: o.siege ? { x: 1090, w: 28, g0: 440, g1: 560 } : null,
  };
  B.ground = makeGround(!!o.siege);
  showBattleUI(o);
}

/* ---------- Zemin ---------- */
function makeGround(siege) {
  const c = document.createElement('canvas'); c.width = BW; c.height = BH;
  const g = c.getContext('2d');
  g.fillStyle = '#5d7a3a'; g.fillRect(0, 0, BW, BH);
  for (let i = 0; i < 900; i++) {
    const x = Math.random() * BW, y = Math.random() * BH, r = 10 + Math.random() * 50;
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '90,110,50' : '120,130,60'},${0.08 + Math.random() * 0.12})`;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  // toprak yol
  g.strokeStyle = 'rgba(140,110,70,0.45)'; g.lineWidth = 34; g.lineCap = 'round';
  g.beginPath(); g.moveTo(0, BH * 0.62); g.bezierCurveTo(BW * 0.3, BH * 0.45, BW * 0.6, BH * 0.7, BW, BH * 0.52); g.stroke();
  // çimen tutamları
  for (let i = 0; i < 2500; i++) {
    const x = Math.random() * BW, y = Math.random() * BH;
    g.strokeStyle = `rgba(${40 + Math.random() * 40},${70 + Math.random() * 50},30,0.5)`; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.random() * 3 - 1.5, y - 4); g.stroke();
  }
  // kenar ağaçları
  for (let i = 0; i < 70; i++) {
    const edge = Math.random() < 0.5;
    const x = edge ? Math.random() * BW : (Math.random() < 0.5 ? Math.random() * 60 : BW - Math.random() * 60);
    const y = edge ? (Math.random() < 0.5 ? Math.random() * 50 : BH - Math.random() * 50) : Math.random() * BH;
    const r = 14 + Math.random() * 16;
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(x + 5, y + 6, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = `rgb(${30 + Math.random() * 20},${60 + Math.random() * 30},${25})`; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.06)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.5, 0, Math.PI * 2); g.fill();
  }
  if (siege) {
    // şehir zemini ve sur
    g.fillStyle = '#8a7a5e'; g.fillRect(1118, 0, BW - 1118, BH);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${100 + Math.random() * 40},${80 + Math.random() * 30},60,0.9)`; g.fillRect(1180 + Math.random() * 380, Math.random() * BH, 30 + Math.random() * 40, 24 + Math.random() * 30); }
  }
  return c;
}
function stampBlood(x, y, big) {
  const g = B.ground.getContext('2d');
  g.fillStyle = `rgba(${90 + Math.random() * 40},10,10,${big ? 0.55 : 0.35})`;
  for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(x + (Math.random() - 0.5) * 10, y + (Math.random() - 0.5) * 10, 1.5 + Math.random() * (big ? 6 : 4), 0, Math.PI * 2); g.fill(); }
  g.fillStyle = 'rgba(40,35,30,0.75)'; g.beginPath(); g.ellipse(x, y, 5, 2.5, Math.random() * 3, 0, Math.PI * 2); g.fill();
}

/* ---------- Simülasyon ---------- */
function hurt(u, dmg, src) {
  if (u.state === 'dead') return;
  const inside = B.wall && u.side === 1 && u.x > B.wall.x;
  const real = Math.max(1, dmg - (u.def + (inside ? 2 : 0)) * 0.6);
  u.hp -= real; u.flash = 0.12;
  if (src) { const a = Math.atan2(u.y - src.y, u.x - src.x); u.vx += Math.cos(a) * 40; u.vy += Math.sin(a) * 40; }
  if (u.hp <= 0) {
    u.state = 'dead'; stampBlood(u.x, u.y, u.cls === 'atli');
    if (u.hero) { B.heroDown = true; B.msg = 'Ağır yaralandın ve yere düştün!'; }
    if (u.leader) { B.leaderDown = true; B.msg = 'Düşman komutanı düştü!'; }
  }
}
function nearestEnemy(u, maxD) {
  let best = null, bd = maxD * maxD;
  for (const o of B.units) {
    if (o.side === u.side || o.state !== 'ok') continue;
    const dx = o.x - u.x, dy = o.y - u.y, d = dx * dx + dy * dy;
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}
function shoot(u, t) {
  const d = Math.hypot(t.x - u.x, t.y - u.y);
  const lead = d / 420;
  const tx = t.x + t.vx * lead * 0.6 + (Math.random() - 0.5) * d * 0.08, ty = t.y + t.vy * lead * 0.6 + (Math.random() - 0.5) * d * 0.08;
  B.arrows.push({ x0: u.x, y0: u.y, tx, ty, t: 0, T: Math.max(0.25, d / 420), dmg: u.atk, side: u.side });
}
function moveTo(u, x, y, dt, speedMul = 1) {
  const dx = x - u.x, dy = y - u.y, d = Math.hypot(dx, dy);
  if (d < 2) { u.vx *= 0.7; u.vy *= 0.7; return; }
  const s = u.spd * speedMul;
  u.vx += (dx / d * s - u.vx) * Math.min(1, dt * 6);
  u.vy += (dy / d * s - u.vy) * Math.min(1, dt * 6);
  u.face = Math.atan2(dy, dx);
}
function battleStep(dt) {
  if (!B || B.over) return;
  B.t += dt;
  const hero = B.hero;
  const okA = B.units.filter(u => u.side === 0 && u.state === 'ok').length;
  const okB = B.units.filter(u => u.side === 1 && u.state === 'ok').length;
  // Moral
  for (const s of [0, 1]) {
    const ok = s === 0 ? okA : okB, init = B.init[s];
    const broken = ok / init < 0.28 || (s === 1 && B.leaderDown && ok / init < 0.55) || (s === 0 && B.heroDown && ok / init < 0.45);
    if (broken && !B['rout' + s]) {
      B['rout' + s] = true;
      for (const u of B.units) if (u.side === s && u.state === 'ok' && !u.hero) u.state = 'rout';
      B.msg = s === 1 ? 'Düşman bozguna uğradı ve kaçıyor!' : 'Askerlerin dağılıyor!';
    }
  }
  const order = B.order;
  for (const u of B.units) {
    if (u.state === 'dead') continue;
    u.flash = Math.max(0, u.flash - dt);
    u.cd -= dt;
    if (u.state === 'rout') {
      moveTo(u, u.side === 0 ? -80 : BW + 80, u.y, dt, 1.1);
      if (u.x < -40 || u.x > BW + 40) u.state = 'fled';
      continue;
    }
    if (u.state !== 'ok') continue;
    if (u.hero) {
      const [ix, iy] = moveInput();
      const m = Math.hypot(ix, iy);
      if (m > 0.08) { u.vx += (ix * u.spd - u.vx) * Math.min(1, dt * 8); u.vy += (iy * u.spd - u.vy) * Math.min(1, dt * 8); u.face = Math.atan2(iy, ix); }
      else { u.vx *= 0.85; u.vy *= 0.85; }
      const e = nearestEnemy(u, u.r + 16);
      if (e && u.cd <= 0) {
        const fast = Math.hypot(u.vx, u.vy) > u.spd * 0.7 && u.cls === 'atli';
        hurt(e, u.atk * (0.8 + Math.random() * 0.5) * (fast ? 1.8 : 1), u);
        u.cd = 0.75; u.lastAtk = B.t;
      }
      continue;
    }
    u.retarget -= dt;
    if (u.retarget <= 0 || !u.tgt || u.tgt.state !== 'ok') { u.tgt = nearestEnemy(u, 2400); u.retarget = 0.35 + Math.random() * 0.2; }
    const t = u.tgt;
    const myOrder = u.side === 0 ? order : B.aiOrder;
    const dT = t ? Math.hypot(t.x - u.x, t.y - u.y) : 1e9;
    const reach = t ? u.r + t.r + 3 : 0;
    let goal = null;
    // Savunma bölgesi
    let holdX = u.hx, holdY = u.hy;
    if (u.side === 0 && myOrder === 'takip' && hero.state === 'ok' && u.slot) { holdX = hero.x - 60 + u.slot[0] * 0.5; holdY = hero.y + u.slot[1] * 0.5; }
    const engageR = myOrder === 'hucum' ? 3000 : u.ranged ? u.range : (u.cls === 'atli' ? 140 : 90);
    if (u.ranged && t) {
      const close = nearestEnemy(u, 50);
      if (close) { goal = [close.x, close.y]; u.tgt = close; }
      else if (dT < u.range) {
        if (u.cls === 'atli' && dT < 120) { goal = [u.x - (t.x - u.x), u.y - (t.y - u.y)]; }
        else { u.vx *= 0.8; u.vy *= 0.8; u.face = Math.atan2(t.y - u.y, t.x - u.x); }
        if (u.cd <= 0 && (u.cls !== 'atli' || true)) { shoot(u, t); u.cd = u.cls === 'atli' ? 1.8 : 2.1 + Math.random() * 0.5; }
      } else if (myOrder === 'hucum') goal = [t.x, t.y];
      else goal = [holdX, holdY];
    } else if (t && (dT < engageR || myOrder === 'hucum')) {
      goal = [t.x, t.y];
    } else goal = [holdX, holdY];
    // Kuşatmada savunanlar sur dibinde bekler, düşman surları geçince saldırır
    if (B.wall && u.side === 1 && B.aiOrder === 'bekle' && t && t.x > B.wall.x - 60) B.aiOrder = 'hucum';
    if (!B.wall && u.side === 1 && B.aiOrder === 'bekle' && B.t > 3) B.aiOrder = 'hucum';
    if (goal) moveTo(u, goal[0], goal[1], dt);
    if (t && dT < reach + 2 && u.cd <= 0 && (!u.ranged || dT < 50)) {
      const fast = u.cls === 'atli' && Math.hypot(u.vx, u.vy) > u.spd * 0.65 && B.t - u.lastAtk > 2;
      hurt(t, u.atk * (0.6 + Math.random() * 0.8) * (fast ? 2.2 : 1) * (u.ranged ? 0.6 : 1), u);
      u.cd = (u.cls === 'atli' ? 1.4 : 1.1) + Math.random() * 0.3;
      u.lastAtk = B.t;
    }
  }
  // Hareket + çarpışma
  const grid = new Map(), cs = 32;
  for (const u of B.units) {
    if (u.state === 'dead' || u.state === 'fled') continue;
    u.x += u.vx * dt; u.y += u.vy * dt;
    u.y = clamp(u.y, 10, BH - 10);
    if (u.state === 'ok') u.x = clamp(u.x, 10, BW - 10);
    if (B.wall) {
      const w = B.wall;
      if (u.x + u.r > w.x && u.x - u.r < w.x + w.w && !(u.y > w.g0 && u.y < w.g1)) {
        if (u.vx > 0 || u.x < w.x + w.w / 2) u.x = w.x - u.r; else u.x = w.x + w.w + u.r;
        u.vx = 0;
      }
    }
    const k = Math.floor(u.x / cs) + ',' + Math.floor(u.y / cs);
    let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(u);
  }
  for (const u of B.units) {
    if (u.state === 'dead' || u.state === 'fled') continue;
    const gx = Math.floor(u.x / cs), gy = Math.floor(u.y / cs);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      const a = grid.get((gx + i) + ',' + (gy + j)); if (!a) continue;
      for (const o of a) {
        if (o === u) continue;
        const dx = o.x - u.x, dy = o.y - u.y, d = Math.hypot(dx, dy) || 0.01, min = u.r + o.r;
        if (d < min) { const push = (min - d) / 2; u.x -= dx / d * push; u.y -= dy / d * push; o.x += dx / d * push; o.y += dy / d * push; }
      }
    }
  }
  // Oklar
  for (const a of B.arrows) {
    a.t += dt;
    if (a.t >= a.T && !a.done) {
      a.done = true;
      let hit = null, hd = 11 * 11;
      for (const u of B.units) {
        if (u.side === a.side || (u.state !== 'ok' && u.state !== 'rout')) continue;
        const dx = u.x - a.tx, dy = u.y - a.ty, d = dx * dx + dy * dy;
        if (d < hd) { hd = d; hit = u; }
      }
      if (hit && Math.random() < 0.75) hurt(hit, a.dmg * (0.7 + Math.random() * 0.6), null);
      else { const g = B.ground.getContext('2d'); g.strokeStyle = 'rgba(60,40,20,0.5)'; g.lineWidth = 1; g.beginPath(); g.moveTo(a.tx, a.ty); g.lineTo(a.tx - 3, a.ty - 3); g.stroke(); }
    }
  }
  B.arrows = B.arrows.filter(a => !a.done);
  // Bitiş
  const leftA = B.units.some(u => u.side === 0 && u.state === 'ok');
  const leftB = B.units.some(u => u.side === 1 && u.state === 'ok');
  if (!leftB) endBattle(true);
  else if (!leftA) endBattle(false);
  else if (B.t > 360) endBattle(okA >= okB);
}
function endBattle(won, retreated) {
  if (B.over) return;
  B.over = true; B.won = won; B.retreated = !!retreated;
  const lossA = {}, lossB = {};
  for (const u of B.units) {
    if (u.hero || u.leader) continue;
    const dead = u.state === 'dead' || (retreated && u.side === 0 && u.state === 'ok' && Math.random() < 0.25);
    if (!dead) continue;
    const L = u.side === 0 ? lossA : lossB;
    L[u.type] = (L[u.type] || 0) + B.scale;
  }
  const cap = (L, troops) => { for (const k in L) L[k] = Math.min(L[k], troops[k] || 0); };
  cap(lossA, B.o.A.troops); cap(lossB, B.o.enemy.troops);
  // Kaybeden taraf kaçarken ek kayıp verir
  if (!retreated) {
    const loserT = won ? B.o.enemy.troops : B.o.A.troops, L = won ? lossB : lossA;
    for (const k in loserT) L[k] = Math.min(loserT[k], (L[k] || 0) + Math.round(((loserT[k] || 0) - (L[k] || 0)) * 0.35));
  }
  B.result = { won, retreated: !!retreated, lossA, lossB, heroDown: !!B.heroDown, leaderDown: !!B.leaderDown };
  setTimeout(() => showBattleEnd(), 700);
}

/* ---------- Çizim ---------- */
function drawBattle() {
  if (!B) return;
  const cv = document.getElementById('bcv');
  const ctx = cv.getContext('2d');
  const d = cv._d || 1, W = cv.width / d, H = cv.height / d;
  let cx, cy, sc;
  if (B.overview) { sc = Math.min(W / BW, H / BH); cx = BW / 2; cy = BH / 2; }
  else {
    sc = H / 520;
    const h = B.hero;
    if (h.state === 'ok') { cx = h.x; cy = h.y; }
    else { const al = B.units.filter(u => u.side === 0 && u.state === 'ok'); const src = al.length ? al : B.units.filter(u => u.state === 'ok'); cx = src.reduce((a, u) => a + u.x, 0) / (src.length || 1) || BW / 2; cy = src.reduce((a, u) => a + u.y, 0) / (src.length || 1) || BH / 2; }
    cx = clamp(cx, W / sc / 2, BW - W / sc / 2); cy = clamp(cy, H / sc / 2, BH - H / sc / 2);
    if (W / sc > BW) cx = BW / 2; if (H / sc > BH) cy = BH / 2;
  }
  B.cam = B.cam ? { x: B.cam.x + (cx - B.cam.x) * 0.15, y: B.cam.y + (cy - B.cam.y) * 0.15 } : { x: cx, y: cy };
  ctx.setTransform(d, 0, 0, d, 0, 0);
  ctx.fillStyle = '#2b3a1c'; ctx.fillRect(0, 0, W, H);
  ctx.setTransform(d * sc, 0, 0, d * sc, d * (W / 2 - B.cam.x * sc), d * (H / 2 - B.cam.y * sc));
  ctx.drawImage(B.ground, 0, 0);
  if (B.wall) {
    const w = B.wall;
    ctx.fillStyle = '#6e6252'; ctx.strokeStyle = '#3c3428'; ctx.lineWidth = 3;
    ctx.fillRect(w.x, 0, w.w, w.g0); ctx.strokeRect(w.x, 0, w.w, w.g0);
    ctx.fillRect(w.x, w.g1, w.w, BH - w.g1); ctx.strokeRect(w.x, w.g1, w.w, BH - w.g1);
    ctx.fillStyle = '#857762';
    for (let y = 0; y < BH; y += 22) if (y < w.g0 - 10 || y > w.g1 + 10) ctx.fillRect(w.x - 4, y, w.w + 8, 10);
    for (const ty of [w.g0 - 30, w.g1 + 30, 120, BH - 120]) { ctx.fillStyle = '#7a6d5a'; ctx.beginPath(); ctx.arc(w.x + w.w / 2, ty, 26, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
  }
  // Birimler
  for (const u of B.units) {
    if (u.state === 'dead' || u.state === 'fled') continue;
    ctx.globalAlpha = u.state === 'rout' ? 0.55 : 1;
    const col = SIDE_COL[u.side], dark = SIDE_DARK[u.side];
    ctx.save(); ctx.translate(u.x, u.y);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(2, 3, u.r, u.r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.rotate(u.face);
    if (u.cls === 'atli') {
      ctx.fillStyle = u.type === 'agir' || u.leader ? '#3a2a1e' : '#7a5232';
      ctx.beginPath(); ctx.ellipse(0, 0, u.r * 1.25, u.r * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5a3a22'; ctx.beginPath(); ctx.ellipse(u.r * 1.15, 0, u.r * 0.4, u.r * 0.28, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (!u.ranged && u.cls !== 'okcu') { ctx.strokeStyle = '#d8d0c0'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, u.r * 0.5); ctx.lineTo(u.r * 2.1, u.r * 0.5); ctx.stroke(); }
    else { ctx.strokeStyle = '#a07040'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(u.r * 0.6, 0, u.r * 0.8, -1.1, 1.1); ctx.stroke(); }
    ctx.rotate(-u.face);
    const rr = u.cls === 'atli' ? u.r * 0.62 : u.r;
    ctx.fillStyle = u.flash > 0 ? '#fff' : col; ctx.strokeStyle = dark; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (u.type === 'piyade' || u.type === 'agir') { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(0, 0, rr * 0.45, 0, Math.PI * 2); ctx.fill(); }
    if (u.hero || u.leader) {
      ctx.strokeStyle = u.hero ? '#ffd24a' : '#e8e8e8'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(0, 0, rr + 4, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(-14, -rr - 12, 28, 4);
      ctx.fillStyle = u.hero ? '#7fe07a' : '#ff8a7a'; ctx.fillRect(-14, -rr - 12, 28 * Math.max(0, u.hp / u.max), 4);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // Oklar
  ctx.strokeStyle = '#e8dcc0'; ctx.lineWidth = 1.3;
  for (const a of B.arrows) {
    const f = a.t / a.T, x = a.x0 + (a.tx - a.x0) * f, y = a.y0 + (a.ty - a.y0) * f - Math.sin(f * Math.PI) * a.T * 60;
    const ang = Math.atan2(a.ty - a.y0, a.tx - a.x0);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(ang) * 8, y - Math.sin(ang) * 8); ctx.stroke();
  }
  // Mini harita
  ctx.setTransform(d, 0, 0, d, 0, 0);
  const mw = Math.min(150, W * 0.2), mh = mw * BH / BW, mx = W - mw - 10 - (window.SAFE_R || 0), my = 10;
  ctx.fillStyle = 'rgba(10,14,8,0.65)'; ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.strokeRect(mx, my, mw, mh);
  for (const u of B.units) {
    if (u.state !== 'ok' && u.state !== 'rout') continue;
    ctx.fillStyle = u.hero ? '#ffd24a' : SIDE_COL[u.side];
    ctx.fillRect(mx + u.x / BW * mw - 1, my + u.y / BH * mh - 1, u.hero ? 4 : 2, u.hero ? 4 : 2);
  }
  if (!B.overview) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.strokeRect(mx + (B.cam.x - W / sc / 2) / BW * mw, my + (B.cam.y - H / sc / 2) / BH * mh, W / sc / BW * mw, H / sc / BH * mh); }
}
