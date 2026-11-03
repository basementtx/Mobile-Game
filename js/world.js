'use strict';
/* =========================================================
   TAÇ VE HANÇER — Dünya: kara ızgarası, krallıklar, savaş ve
   barış, takvim, yeni dünya ve kayıt geçişi.
   Toprak savaşları front.js'te gerçek zamanlı işler.
   ========================================================= */

/* ---------- Kara ızgarası ---------- */
const GRID = { step: 0.2, w: 0, h: 0 };
let LANDP = null, LANDGRID = null;
function buildGeo() {
  if (LANDP) return;
  LANDP = LAND.map(poly => {
    const rings = poly.map(r => r.map(([lo, la]) => proj(lo, la)));
    const xs = rings[0].map(p => p[0]), ys = rings[0].map(p => p[1]);
    return { rings, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  });
  GRID.w = Math.ceil(MAP.W / GRID.step); GRID.h = Math.ceil(MAP.H / GRID.step);
  LANDGRID = new Uint8Array(GRID.w * GRID.h);
  // Tarama çizgisiyle doldurma: her poligon için satır satır kesişimleri bul
  const xs = [];
  for (const p of LANDP) {
    const j0 = Math.max(0, Math.floor(p.y0 / GRID.step)), j1 = Math.min(GRID.h - 1, Math.ceil(p.y1 / GRID.step));
    for (let j = j0; j <= j1; j++) {
      const y = (j + 0.5) * GRID.step;
      xs.length = 0;
      for (const r of p.rings) {
        for (let i = 0, k = r.length - 1; i < r.length; k = i++) {
          const yi = r[i][1], yk = r[k][1];
          if ((yi > y) !== (yk > y)) xs.push(r[i][0] + (y - yi) / (yk - yi) * (r[k][0] - r[i][0]));
        }
      }
      xs.sort((u, v) => u - v);
      for (let q = 0; q + 1 < xs.length; q += 2) {
        const i0 = Math.max(0, Math.ceil(xs[q] / GRID.step - 0.5)), i1 = Math.min(GRID.w - 1, Math.floor(xs[q + 1] / GRID.step - 0.5));
        for (let i = i0; i <= i1; i++) LANDGRID[j * GRID.w + i] = 1;
      }
    }
  }
  buildTerrain();
}
function isLand(x, y) {
  const i = Math.floor(x / GRID.step), j = Math.floor(y / GRID.step);
  if (i < 0 || j < 0 || i >= GRID.w || j >= GRID.h) return false;
  return LANDGRID[j * GRID.w + i] === 1;
}
const settlements = () => G.settIds.map(id => G.titles[id]);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* ---------- Krallıklar ve savaş ---------- */
const realms = () => Object.values(G.titles).filter(t => isRealm(t) && !t.dead);
function realmSettlements(r) { return settlements().filter(s => s.liege === r.id); }
function atWarRealms(r1, r2) {
  if (!r1 || !r2 || r1 === r2) return false;
  return G.wars.some(w => (w.a === r1.id && w.b === r2.id) || (w.a === r2.id && w.b === r1.id));
}
function enemiesOf(r) {
  if (!r) return [];
  return G.wars.filter(w => w.a === r.id || w.b === r.id).map(w => G.titles[w.a === r.id ? w.b : w.a]).filter(x => x && !x.dead);
}
function feudWith(r) { return !!r && (G.feud || []).some(f => f.r === r.id && f.until > G.day); }
/* İki karakter birbirine düşman mı? */
function hostileChars(a, b) {
  if (!a || !b || a.id === b.id) return false;
  const p = P();
  if (a.id === p.id || b.id === p.id) {
    const o = a.id === p.id ? b : a;
    if (feudWith(realmOf(o))) return true;
    if (G.personalFoes && G.personalFoes.includes(o.id)) return true;
  }
  return atWarRealms(realmOf(a), realmOf(b));
}
function declareWar(r1, r2, reason) {
  if (!r1 || !r2 || r1 === r2 || atWarRealms(r1, r2)) return;
  G.wars.push({ a: r1.id, b: r2.id, start: G.day, taken: { [r1.id]: 0, [r2.id]: 0 } });
  if (allied(r1, r2)) breakPact(r1, r2);
  const p = P(), pr = realmOf(p);
  const msg = L(`⚔️ ${r1.name}, ${r2.name} ile savaşa girdi!${reason ? ' ' + reason : ''}`, `⚔️ ${r1.name} declared war on ${r2.name}!${reason ? ' ' + reason : ''}`);
  log(msg, 'war');
  if (pr && pr === r2) { if (typeof toast === 'function') toast(msg + '<br><small>' + L('Topraklarımız saldırı altında olabilir.', 'Our lands may soon be attacked.') + '</small>'); }
  callAllies(r1, r2);
  G.terrDirty = true;
}
function makePeace(r1, r2) {
  const w = G.wars.find(w => (w.a === r1.id && w.b === r2.id) || (w.a === r2.id && w.b === r1.id));
  if (!w) return;
  G.wars = G.wars.filter(x => x !== w);
  const a = natOfRealm(r1), b = natOfRealm(r2);
  if (a && b) for (const k of G.atk.slice()) if ((k.a === a.i && k.d === b.i) || (k.a === b.i && k.d === a.i)) endAttack(k, true);
  log(L(`🕊️ ${r1.name} ile ${r2.name} barış yaptı.`, `🕊️ ${r1.name} and ${r2.name} made peace.`), 'war');
}
function createRealm(c, name) {
  const east = CULTURES[c.cul] && CULTURES[c.cul].east;
  const h = rnd(0, 359);
  const r = addTitle(name || '', 5, null, { kind: 'realm', key: null, color: `hsl(${h} 45% 50%)`, cul: c.cul, east: !!east, dynName: c.dyn });
  if (!name) r.name = realmName(r);
  const ss = settlementsOf(c);
  for (const s of ss) s.liege = r.id;
  giveTitle(r, c);
  refreshLieges();
  if (typeof carveNation === 'function' && OWN) carveNation(r, ss.map(s => s.id));
  G.terrDirty = true;
  return r;
}
/* Kurulan krallıkların adı ve hükümdar unvanı dile göre */
function realmName(r) {
  if (r.key && REALMS[r.key]) return REALMS[r.key].ad;
  if (r.dynName) return r.east ? L(`${r.dynName} Beyliği`, `Beylik of ${r.dynName}`) : L(`${r.dynName} Krallığı`, `Kingdom of ${r.dynName}`);
  return r.name;
}
function realmShort(r) {
  if (r.key && REALMS[r.key]) return REALMS[r.key].kisa;
  return r.dynName || r.name;
}
function rulerTitles(r) {
  if (r.key && REALMS[r.key]) return REALMS[r.key].u;
  return r.east ? ['Bey', 'Hatun'] : L(['Kral', 'Kraliçe'], ['King', 'Queen']);
}
/* Dil değişince/yüklenince kayıtlı adları yenile */
function relocalize() {
  if (!G) return;
  for (const t of Object.values(G.titles)) {
    if (isRealm(t)) { if (t.key || t.dynName) t.name = realmName(t); }
    else if (isSettlement(t)) { if (!t.trName) t.trName = t.name; t.name = settName(t.trName); }
  }
}

/* Bir vasal isyan eder: kendi krallığını kurar, topraklarını koparır ve eski efendisine savaş açar */
function rebel(c) {
  const old = realmOf(c);
  if (!settlementsOf(c).length) return null;
  const r = createRealm(c);
  c.prestige += 50;
  if (old && old !== r) declareWar(r, old, L(`${nm(c)} isyan etti!`, `${nm(c)} rebelled!`));
  return r;
}
/* Krallığın ulusu haritadan silindiyse krallık da tarihe karışır */
function checkRealmDeath(r, force) {
  if (!r || r.dead) return;
  const n = natOfRealm(r);
  if (!force && n && NR[n.i] && NR[n.i].tiles > 0) return;
  const h = ch(r.holder);
  r.dead = true;
  if (h) { h.titles = h.titles.filter(x => x !== r.id); if (!h.titles.length) h.baseRank = Math.max(h.baseRank, 2); recalcRank(h); }
  r.holder = null;
  G.wars = G.wars.filter(w => w.a !== r.id && w.b !== r.id);
  G.pacts = (G.pacts || []).filter(x => x.a !== r.id && x.b !== r.id);
  for (const s of settlements()) if (s.liege === r.id) s.liege = null;
  refreshLieges();
  log(L(`💀 ${r.name} tarihe karıştı!`, `💀 ${r.name} has fallen into history!`), 'war');
  const p = P();
  if (p && h && h.id === p.id && !G.over) {
    G.over = { name: `${p.name} ${p.dyn}`, reason: L(`${r.name} haritadan silindi`, `The ${r.name} was wiped from the map`), age: p.age, d: dateStr() };
  }
}

/* ---------- Güç (karakter katmanı için) ---------- */
/* Hükümdarın gücü ulusunun askeridir; diğerleri topraklarıyla ölçülür */
function charPower(c) {
  if (!c) return 0;
  const n = natOfRealm(ownRealm(c));
  if (n) return Math.round(n.troops);
  return settlementsOf(c).length * 600 + (c.rank || 0) * 150 + Math.max(0, c.prestige) * 0.5;
}
/* Eski ordu sistemi kaldırıldı: uyumluluk için boş yardımcılar */
const playerParty = () => null;
const partyOf = () => null;
function troopMix(cul, n) { return { piyade: n }; }
function lossText(l) { const a = Object.entries(l || {}).filter(([, n]) => n > 0); return a.length ? a.map(([k, n]) => `${n} ${TROOPS[k] ? TROOPS[k].ad : k}`).join(', ') : L('kayıp yok', 'none'); }
function onCharGone() { /* ordular artık ulusa bağlı */ }
function nearestSettlement(x, y, filter) {
  let best = null, bd = 1e9;
  for (const s of settlements()) { if (filter && !filter(s)) continue; const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = s; } }
  return best;
}
/* Oyuncunun başkenti (yoksa ilk yerleşimi) */
function seatOf(c) {
  const r = ownRealm(c) || realmOf(c);
  const own = settlementsOf(c);
  return own.find(s => s.capital) || (r && realmSettlements(r).find(s => s.capital)) || own[0] || (r && realmSettlements(r)[0]) || null;
}
function localCulture() { const p = P(); const s = p ? seatOf(p) : null; return s ? s.cul : p ? p.cul : 'latin'; }

/* ---------- Zaman ---------- */
/* Gerçek zamanlı akış: her adımda savaşlar, her günde takvim, her ayda saray hayatı */
function advanceRealtime() {
  frontTick();
  G.dayAcc = (G.dayAcc || 0) + TICK * DAYS_PER_SEC;
  while (G.dayAcc >= 1 && !G.over) { G.dayAcc -= 1; dayTick(); }
}
function dayTick() {
  G.day++;
  if (G.day % 30 === 0) monthWorld();
}
function monthWorld() {
  G.month++;
  if (G.month >= 12) { G.month = 0; G.year++; for (const c of living()) c.age++; }
  for (const c of living()) c.gold += income(c);
  realmMonth();
  G.feud = (G.feud || []).filter(f => f.until > G.day);
  realmPolitics();
  monthTick();
}
/* Hükümdarların savaş/barış kararları ve vasal isyanları */
function realmPolitics() {
  const p = P(), myR = ownRealm(p);
  for (const r of realms()) {
    const k = ch(r.holder), n = natOfRealm(r);
    if (!k || !free(k) || k.id === p.id || !n) continue;
    const foes = enemiesOf(r);
    if (foes.length < 2 && chance(foes.length ? 0.015 : 0.05)) {
      const nb = natNeighbors(n.i);
      let best = null, bs = -1e9;
      for (const [o] of nb) {
        const O = o >= 0 ? G.nat[o] : null, orr = natRealm(O);
        if (!orr || orr === r || allied(orr, r) || atWarRealms(orr, r)) continue;
        const ok = ch(orr.holder);
        if (!ok) continue;
        const allyP = alliesOf(orr).reduce((a, x) => a + charPower(ch(x.holder)), 0);
        const sc = -opinion(k, ok) + (has(k, 'hirsli') ? 20 : 0) + (n.troops / Math.max(1, O.troops + allyP * 0.6)) * 30 + Math.random() * 30 - (orr === myR ? 5 : 0);
        if (sc > bs) { bs = sc; best = orr; }
      }
      if (best && bs > 38) declareWar(r, best);
    }
  }
  // NPC hükümdarlar arasında savunma paktları
  if (chance(0.25)) {
    const rs = realms().filter(r => ch(r.holder) && ch(r.holder).id !== p.id);
    const a = rs.length ? pick(rs) : null, b = rs.length ? pick(rs) : null;
    if (a && b && a !== b && !atWarRealms(a, b) && !allied(a, b) && opinion(ch(a.holder), ch(b.holder)) > 25 && opinion(ch(b.holder), ch(a.holder)) > 25 && alliesOf(a).length < 2) {
      addPact(a, b);
      if (realmOf(p) === a || realmOf(p) === b || relevant(ch(a.holder), ch(b.holder))) log(L(`🤝 ${a.name} ile ${b.name} savunma paktı imzaladı.`, `🤝 The ${a.name} and the ${b.name} signed a defensive pact.`), 'war');
    }
  }
  for (const w of G.wars.slice()) {
    const ra = G.titles[w.a], rb = G.titles[w.b];
    const months = (G.day - w.start) / 30;
    if (myR && (ra === myR || rb === myR)) {
      const foe = ra === myR ? rb : ra, fn = natOfRealm(foe), mn = natOfRealm(myR);
      // Yenilmekte olan düşman barış ister
      if (months > 3 && fn && mn && fn.troops < mn.troops * 0.6 && chance(0.12)) queueEvent('barisTeklif', { r: foe.id });
      else if (months > 6 && chance(0.04)) queueEvent('barisTeklif', { r: foe.id });
      continue;
    }
    if (chance(0.03 + months * 0.008)) makePeace(ra, rb);
  }
  for (const c of living()) {
    if (c.id === p.id || !free(c) || settlementsOf(c).length < 2 || ownRealm(c) || c.lordId == null) continue;
    const l = ch(c.lordId);
    if (!l || opinion(c, l) > -45 || !(has(c, 'hirsli') || has(c, 'kibirli')) || l.dread > 40) continue;
    if (chance(0.005)) rebel(c);
  }
}

/* ---------- Yeni dünya ---------- */
/* 1180'deki savaşlar ve ittifaklar */
const START_WARS = [['eyyubi', 'kudus'], ['selcuklu', 'bizans']];
const START_PACTS = [['ingiltere', 'portekiz'], ['fransa', 'kastilya'], ['selcuklu', 'artuklu'], ['eyyubi', 'abbasi'], ['macar', 'leh']];
function newWorld(opt) {
  G = {
    year: 1180, month: 2, day: 0, dayFrac: 0, chars: {}, titles: {}, secrets: [], wars: [], log: [], queue: [], feud: [], settIds: [],
    nextId: 1, nextTitle: 1, nextSecret: 1, nextWar: 1, nextRumor: 1, playerId: null, ap: AP_MAX,
    over: null, monthsPlayed: 0, generation: 1, founder: `${opt.name} ${opt.dyn}`, personalFoes: [],
    rumors: [], pacts: [], council: {}, law: { vergi: 1, yukumluluk: 1, veraset: 'erkek' }, cd: {}, loan: null, start: 'hukumdar', geoV: 2,
  };
  buildGeo();
  const rt = {};
  for (const [key, R] of Object.entries(REALMS)) rt[key] = addTitle(R.ad, 5, null, { kind: 'realm', key, color: R.renk, cul: R.kul });
  for (const [name, lon, lat, type, rk, cap] of SETTLEMENTS) {
    const [x, y] = proj(lon, lat);
    const s = addTitle(settName(name), 3, rt[rk].id, { trName: name, kind: type, x, y, capital: !!cap, cul: REALMS[rk].kul });
    G.settIds.push(s.id);
  }
  const family = (head, kidsMax) => {
    if (!chance(0.7) || head.age < 18) return;
    const sp = makeChar({ cul: head.cul, female: !head.female, age: clamp(head.age + rnd(-8, 4), 17, 70), rank: Math.min(2, head.rank), gold: 5, lordId: head.titles.length ? head.id : head.lordId });
    marry(head, sp);
    const youngest = Math.min(head.age, sp.age);
    const n = rnd(0, kidsMax);
    for (let i = 0; i < n && youngest > 18; i++) {
      const mother = head.female ? head : sp, father = head.female ? sp : head;
      const kid = makeChar({ cul: head.cul, age: rnd(0, Math.min(youngest - 17, 28)), dyn: head.dyn, gold: 0, traits: inheritTraits(mother, father), rank: 2, lordId: head.titles.length ? head.id : head.lordId });
      kid.fatherId = father.id; kid.motherId = mother.id;
      father.children.push(kid.id); mother.children.push(kid.id);
    }
  };
  const knight = lord => makeChar({ cul: lord.cul, rank: 2, age: rnd(18, 45), gold: rnd(15, 35), prestige: rnd(20, 70), lordId: lord.id });
  const R = REALMS[opt.realm];
  let p = null;
  for (const [key, Rk] of Object.entries(REALMS)) {
    const list = settlements().filter(s => s.liege === rt[key].id);
    const cap = list.find(s => s.capital) || list[0];
    const isPlayerRealm = key === opt.realm;
    let ruler;
    if (isPlayerRealm) {
      ruler = makeChar({ cul: Rk.kul, name: opt.name, dyn: opt.dyn, female: opt.female, age: 27, rank: 5, gold: 300, prestige: 400, traits: opt.traits.slice(), base: { ...opt.base } });
      p = ruler; G.playerId = p.id;
      if (chance(0.85)) { const sp = makeChar({ cul: Rk.kul, female: !p.female, age: rnd(19, 28), rank: 2, gold: 10, lordId: p.id }); marry(p, sp); }
    } else {
      ruler = makeChar({ cul: Rk.kul, dyn: Rk.han, rank: 5, age: rnd(25, 58), gold: 250, prestige: 300 + rnd(0, 200), female: chance(0.12) });
      family(ruler, 3);
    }
    giveTitle(rt[key], ruler); giveTitle(cap, ruler);
    knight(ruler); knight(ruler);
    const rest = shuffle(list.filter(s => s !== cap));
    if (isPlayerRealm && rest.length >= 4) giveTitle(rest.shift(), ruler); // kraliyet arazisi
    while (rest.length) {
      const lord = makeChar({ cul: Rk.kul, rank: 3, age: rnd(20, 60), gold: rnd(80, 160), prestige: rnd(60, 160), female: chance(0.1) });
      giveTitle(rest.shift(), lord);
      if (rest.length > 2 && chance(0.35)) giveTitle(rest.shift(), lord);
      family(lord, 3);
      if (chance(0.5)) knight(lord);
    }
  }
  refreshLieges();
  for (const [a, b] of START_WARS) { const ra = rt[a], rb = rt[b]; if (ra && rb) G.wars.push({ a: ra.id, b: rb.id, start: 0, taken: { [ra.id]: 0, [rb.id]: 0 } }); }
  for (const [a, b] of START_PACTS) if (rt[a] && rt[b]) addPact(rt[a], rt[b]);
  for (const c of living()) {
    if (chance(0.12) && isGrown(c)) {
      const others = nearby(c).filter(x => x.id !== p.id && !closeKin(c, x));
      if (others.length) { const o = pick(others); if (chance(0.5) && isGrown(o) && attracted(c, o) && attracted(o, c)) becomeLovers(c, o); else addOp(c, o, rnd(-60, 60)); }
    }
  }
  seedBonds();
  // Oyuncunun sarayda bir dostu ve bir rakibi olsun
  const court = living().filter(x => x.id !== p.id && isAdult(x) && !closeKin(p, x) && realmOf(x) === realmOf(p) && !bond(p, x));
  if (court.length >= 2) {
    const f = pick(court); setBond(p, f, 'dost'); addOp(f, p, 30); addOp(p, f, 30);
    const r2 = pick(court.filter(x => x !== f)); setBond(p, r2, 'rakip'); addOp(r2, p, -35); addOp(p, r2, -30);
  }
  makeAncestry(p);
  spawnCourtStaff(p, 9);
  if (ownRealm(p)) autoCouncil(p);
  p.inv = [];
  frontInit();
  G.terrDirty = true;
  const rn = R.ad;
  const foes = enemiesOf(rt[opt.realm]).map(r => r.name), pals = alliesOf(rt[opt.realm]).map(r => r.name);
  const startText = L(`Taç senin başında. <b>${rn}</b> artık senin sorumluluğunda.`, `The crown is upon your head. The <b>${rn}</b> is yours to rule.`) +
    (foes.length ? L(` Krallığın <b>${foes.join(', ')}</b> ile savaşta.`, ` Your realm is at war with the <b>${foes.join(', ')}</b>.`) : '') +
    (pals.length ? L(` Müttefikin: ${pals.join(', ')}.`, ` Your ally: the ${pals.join(', ')}.`) : '');
  log(`📜 ${monthName(G.month)} ${G.year}. ${startText}`, 'info');
  info(L('📜 Taç ve Hançer', '📜 Crown & Dagger'), startText + L(
    `<br><br>Dünya <b>gerçek zamanlı</b> akıyor: herkes aynı anda genişliyor.<br><br>🗺️ <b>Sahipsiz ya da düşman toprağa dokun</b> ve <b>Saldır</b>: askerlerin sınır boyunca ilerler. Alttaki çubuk saldırıya giden asker oranını belirler.<br>⛵ Deniz aşırı topraklara <b>gemiyle çıkarma</b> yap.<br>🏗️ <b>Kendi toprağına dokun</b>: kasaba, liman, kale, gözcü kulesi, mancınık atölyesi kur.<br>👑 <b>Krallık</b>: meclis, yasalar, ittifaklar. 👥 <b>Kişiler</b>: konuş, evlen, entrika çevir.<br><br>Askerlerin ve altının kendiliğinden artar. Krallığın haritadan silinirse hanedanın biter.`,
    `<br><br>The world runs in <b>real time</b>: everyone expands at once.<br><br>🗺️ <b>Tap unclaimed or enemy land</b> and press <b>Attack</b>: your troops push along the border. The bar below sets how many troops each attack takes.<br>⛵ Reach lands across the sea with a <b>naval landing</b>.<br>🏗️ <b>Tap your own land</b> to build towns, harbours, forts, watchtowers and siege workshops.<br>👑 <b>Realm</b>: council, laws, alliances. 👥 <b>People</b>: talk, marry, scheme.<br><br>Troops and gold grow on their own. If your realm is wiped from the map, your dynasty ends.`));
  saveGame();
}
let _lastSave = 0;
function saveGameThrottled() { const t = Date.now(); if (t - _lastSave > 15000) { _lastSave = t; saveGame(); } }
/* Eski kayıtları yeni sistemlere uyarla */
function migrateSave() {
  G.rumors = G.rumors || []; G.pacts = G.pacts || []; G.council = G.council || {}; G.cd = G.cd || {};
  G.law = G.law || { vergi: 1, yukumluluk: 1, veraset: 'erkek' }; G.nextRumor = G.nextRumor || 1;
  G.feud = G.feud || [];
  for (const c of Object.values(G.chars)) {
    if (!c.pr) c.pr = genPrefs(c);
    c.bonds = c.bonds || {}; c.mem = c.mem || [];
    if (c.sup === undefined) c.sup = null;
    c.traits = c.traits.filter(t => TRAITS[t]);
    delete c.sx;
  }
  G.secrets = G.secrets.filter(s => SECRETS[s.type]);
  const p = P(); if (p) p.inv = p.inv || [];
}
/* Eski kayıtlar Avrupa haritasındaydı: koordinatları dünya haritasına taşı ve yeni krallıkları ekle */
function migrateWorld() {
  const dx = (-12 - MAP.LON0) * MAP.COS, dy = MAP.LAT1 - 66;
  for (const s of settlements()) { s.x += dx; s.y += dy; }
  const rt = {};
  for (const t of Object.values(G.titles)) if (isRealm(t) && t.key) rt[t.key] = t;
  const added = [];
  for (let i = G.settIds.length; i < SETTLEMENTS.length; i++) {
    const [name, lon, lat, type, rk, cap] = SETTLEMENTS[i];
    if (!rt[rk]) { const R = REALMS[rk]; rt[rk] = addTitle(R.ad, 5, null, { kind: 'realm', key: rk, color: R.renk, cul: R.kul }); added.push(rk); }
    const [x, y] = proj(lon, lat);
    const st = addTitle(settName(name), 3, rt[rk].id, { trName: name, kind: type, x, y, capital: !!cap, cul: REALMS[rk].kul });
    G.settIds.push(st.id);
  }
  for (const key of added) {
    const Rk = REALMS[key], list = settlements().filter(x => x.liege === rt[key].id);
    const capS = list.find(x => x.capital) || list[0];
    const ruler = makeChar({ cul: Rk.kul, dyn: Rk.han, rank: 5, age: rnd(25, 58), gold: 300, prestige: 300 + rnd(0, 200), female: chance(0.12) });
    giveTitle(rt[key], ruler); giveTitle(capS, ruler);
    for (const st of list.filter(x => x !== capS)) giveTitle(st, makeChar({ cul: Rk.kul, rank: 3, age: rnd(20, 60), gold: rnd(80, 160), prestige: rnd(60, 160) }));
    makeChar({ cul: Rk.kul, rank: 2, age: rnd(18, 45), gold: 20, prestige: 30, lordId: ruler.id });
  }
  refreshLieges();
  G.geoV = 2;
}
/* Tur tabanlı eski kayıt: ordular, iller ve bina sistemi kalktı */
function migrateToRealtime() {
  delete G.parties; delete G.turn; delete G.turnLeft; delete G.turnEndDay; delete G.nextParty; delete G.lastX; delete G.lastY;
  for (const s of settlements()) { for (const k of ['garrison', 'siege', 'pool', 'b', 'q', 'tax', 'unrest', 'pop', 'prosperity']) delete s[k]; }
  for (const c of Object.values(G.chars)) if (c.office === 'komutan') c.office = null;
  G.queue = G.queue.filter(q => q.id !== 'fethinOdulu');
  frontInit();
  log(L('⚜️ Dünya artık gerçek zamanlı akıyor: toprakların yerleşimlerinin çevresinden yeniden çizildi.', '⚜️ The world now runs in real time: your lands were redrawn around your holdings.'), 'info');
}
function afterLoad() {
  buildGeo();
  if (!G.geoV) migrateWorld();
  relocalize();
  migrateSave();
  G.start = 'hukumdar';
  if (!G.staffV) { const pl = P(); if (pl && pl.alive) spawnCourtStaff(pl, 7); G.staffV = 1; }
  if (!G.fv || !frontLoad()) migrateToRealtime();
  G.terrDirty = true;
}
