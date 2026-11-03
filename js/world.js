'use strict';
/* =========================================================
   TAÇ VE HANÇER — Dünya: harita, ordular, krallık savaşları,
   kuşatmalar, eşkıyalar, zaman akışı
   ========================================================= */

const DAY_SEC = 0.45;        // tur çözülürken 1x hızda bir günün gerçek saniyesi (hareket animasyonu)
const TURN_DAYS = 5;         // bir tur kaç gün sürer
const SIEGE_DAYS = 12;       // NPC'lerin hücuma kadar kuşatma süresi
const CONTACT = 0.32;        // iki ordunun karşılaşma mesafesi (harita birimi)
const ENTER_DIST = 0.4;      // şehre girme mesafesi

/* ---------- Kara ızgarası (deniz/kara testi ve bölge boyama) ---------- */
const GRID = { step: 0.2, w: 0, h: 0 };
let LANDP = null, LANDGRID = null;
function inRing(x, y, r) {
  let ins = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const xi = r[i][0], yi = r[i][1], xj = r[j][0], yj = r[j][1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) ins = !ins;
  }
  return ins;
}
function buildGeo() {
  if (LANDP) return;
  LANDP = LAND.map(poly => {
    const rings = poly.map(r => r.map(([lo, la]) => proj(lo, la)));
    const xs = rings[0].map(p => p[0]), ys = rings[0].map(p => p[1]);
    return { rings, x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  });
  GRID.w = Math.ceil(MAP.W / GRID.step); GRID.h = Math.ceil(MAP.H / GRID.step);
  LANDGRID = new Uint8Array(GRID.w * GRID.h);
  // Tarama çizgisiyle doldurma: her poligon için satır satır kesişimleri bul (tüm dünya için hızlı)
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
  buildProvinces();
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
  return G.wars.filter(w => w.a === r.id || w.b === r.id).map(w => G.titles[w.a === r.id ? w.b : w.a]).filter(Boolean);
}
function feudWith(r) { return !!r && G.feud.some(f => f.r === r.id && f.until > G.day); }
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
function hostileParties(a, b) {
  if (a.kind === 'bandit' || b.kind === 'bandit') return a.kind !== b.kind;
  return hostileChars(ch(a.owner), ch(b.owner));
}
function declareWar(r1, r2, reason) {
  if (!r1 || !r2 || r1 === r2 || atWarRealms(r1, r2)) return;
  G.wars.push({ a: r1.id, b: r2.id, start: G.day, taken: { [r1.id]: 0, [r2.id]: 0 } });
  if (allied(r1, r2)) breakPact(r1, r2);
  const p = P(), pr = realmOf(p);
  const msg = L(`⚔️ ${r1.name}, ${r2.name} ile savaşa girdi!${reason ? ' ' + reason : ''}`, `⚔️ ${r1.name} declared war on ${r2.name}!${reason ? ' ' + reason : ''}`);
  log(msg, 'war');
  if (pr && (pr === r1 || pr === r2)) info(L('⚔️ Savaş!', '⚔️ War!'), `${msg}<br><br>${pr === r2 ? L('Topraklarımız saldırı altında.', 'Our lands are under attack.') : L('Sancaklar açıldı.', 'The banners are raised.')} ${L('Düşman orduları haritada kırmızı çerçeveyle görünür.', 'Enemy armies are marked with a red frame on the map.')}`);
  callAllies(r1, r2);
  G.terrDirty = true;
}
function makePeace(r1, r2) {
  const w = G.wars.find(w => (w.a === r1.id && w.b === r2.id) || (w.a === r2.id && w.b === r1.id));
  if (!w) return;
  G.wars = G.wars.filter(x => x !== w);
  for (const s of settlements()) if (s.siege) { const sp = G.parties.find(x => x.id === s.siege.by); if (!sp || !hostileParties(sp, { kind: 'x', owner: s.holder })) s.siege = null; }
  log(L(`🕊️ ${r1.name} ile ${r2.name} barış yaptı.`, `🕊️ ${r1.name} and ${r2.name} made peace.`), 'war');
}
function createRealm(c, name) {
  const east = CULTURES[c.cul] && CULTURES[c.cul].east;
  const h = rnd(0, 359);
  const r = addTitle(name || '', 5, null, { kind: 'realm', key: null, color: `hsl(${h} 45% 50%)`, cul: c.cul, east: !!east, dynName: c.dyn });
  if (!name) r.name = realmName(r);
  for (const s of settlementsOf(c)) s.liege = r.id;
  giveTitle(r, c);
  refreshLieges();
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

/* Bir vasal isyan eder: kendi krallığını kurar ve eski efendisine savaş açar */
function rebel(c) {
  const old = realmOf(c);
  if (!settlementsOf(c).length) return null;
  const r = createRealm(c);
  c.prestige += 50;
  if (old && old !== r) declareWar(r, old, L(`${nm(c)} isyan etti!`, `${nm(c)} rebelled!`));
  return r;
}
function checkRealmDeath(r) {
  if (!r || r.dead) return;
  if (realmSettlements(r).length) return;
  const h = ch(r.holder);
  r.dead = true;
  if (h) { h.titles = h.titles.filter(x => x !== r.id); if (!h.titles.length) h.baseRank = Math.max(h.baseRank, 2); recalcRank(h); }
  r.holder = null;
  G.wars = G.wars.filter(w => w.a !== r.id && w.b !== r.id);
  refreshLieges();
  log(L(`💀 ${r.name} tarihe karıştı!`, `💀 ${r.name} has fallen into history!`), 'war');
}

/* ---------- Ordular ---------- */
function troopCount(pt) { let n = 0; for (const k in pt.troops) n += pt.troops[k]; return n; }
function partyPower(pt) {
  let s = 0;
  for (const k in pt.troops) s += pt.troops[k] * TROOPS[k].str;
  const c = pt.kind === 'player' ? armyLeader(pt) : ch(pt.owner);
  const sv = c ? stat(c, 'sav') : 4;
  if (c || pt.kind === 'player') s = (s + 25 + sv * 3) * (1 + sv / 40);
  if (pt.kind === 'player') s *= 1 + councilBonus('maresal') * 0.012;
  return Math.round(s);
}
function partyOf(c) { return c ? G.parties.find(p => p.owner === c.id) || null : null; }
function charPower(c) { const p = partyOf(c); return (p ? partyPower(p) : 0) + settlementsOf(c).reduce((s, t) => s + garrisonPower(t), 0) * 0.5; }
function garrisonPower(s) { return Math.round(s.garrison * TROOPS.piyade.str * (s.kind === 'kale' ? 1.7 : 1.4) * wallMult(s)); }
function partyCap(c) {
  if (!c) return 40;
  const realmB = ownRealm(c) ? (c.id === G.playerId ? 30 + law().yukumluluk * 30 : 60) : 0;
  return 20 + settlementsOf(c).length * 25 + realmB + Math.floor(Math.max(0, c.prestige) / 20) + stat(c, 'dip') * 2 +
    (c.office === 'komutan' ? 80 : 0) + (c.id === G.playerId ? councilBonus('maresal') * 2 : 0);
}
function partySpeed(pt) {
  const n = troopCount(pt);
  let cav = 0;
  for (const k in pt.troops) if (TROOPS[k].sinif === 'atli') cav += pt.troops[k];
  // Ortaçağ ordusu günde ~20-35 km yürür (1 harita birimi ≈ 111 km)
  let v = 0.24 + (n ? 0.12 * cav / n : 0.12) - Math.min(0.06, n * 0.0003);
  if (pt.kind === 'bandit') v = 0.22;
  if (!isLand(pt.x, pt.y)) v *= 0.7;
  return Math.max(0.15, v);
}
function troopMix(cul, n, rich) {
  const east = CULTURES[cul] && CULTURES[cul].east;
  const mix = east ? { milis: 0.25, piyade: 0.2, okcu: 0.2, atliokcu: 0.28, agir: 0.07 } : { milis: 0.28, piyade: 0.3, okcu: 0.2, atli: 0.16, agir: 0.06 };
  if (rich) { mix.milis *= 0.5; mix.agir *= 1.6; }
  const out = {};
  let left = n;
  for (const k in mix) { const v = Math.round(n * mix[k]); out[k] = Math.min(v, left); left -= out[k]; }
  out.milis = (out.milis || 0) + left;
  return out;
}
function makeParty(o) {
  const pt = Object.assign({ id: G.nextParty++, owner: null, kind: 'lord', x: 0, y: 0, troops: {}, mode: 'idle', tx: null, ty: null, chase: null, sid: null, gold: 0, think: rnd(0, 3), stun: 0 }, o);
  G.parties.push(pt);
  return pt;
}
function removeParty(pt) {
  G.parties = G.parties.filter(x => x !== pt);
  for (const s of settlements()) if (s.siege && s.siege.by === pt.id) s.siege = null;
}
function spawnLordParty(c) {
  const home = settlementsOf(c)[0] || (ch(c.lordId) && settlementsOf(ch(c.lordId))[0]);
  if (!home) return null;
  const n = Math.max(12, Math.round(partyCap(c) * (0.5 + Math.random() * 0.4)));
  return makeParty({ owner: c.id, kind: 'lord', x: home.x, y: home.y, troops: troopMix(c.cul, n, c.rank >= 5) });
}
function homeOf(c) {
  const own = settlementsOf(c);
  if (own.length) return own[0];
  const l = ch(c.lordId);
  return l ? settlementsOf(l)[0] || null : null;
}
function nearestSettlement(x, y, filter) {
  let best = null, bd = 1e9;
  for (const s of settlements()) { if (filter && !filter(s)) continue; const d = Math.hypot(s.x - x, s.y - y); if (d < bd) { bd = d; best = s; } }
  return best;
}
function localCulture() {
  const p = P();
  const s = p ? seatOf(p) : null;
  return s ? s.cul : p ? p.cul : 'latin';
}
function playerParty() { return G.parties.find(p => p.kind === 'player') || null; }
/* Oyuncu orduya bizzat gitmez: kraliyet ordusunu mareşal yönetir */
function armyLeader(pt) {
  if (!pt || pt.kind !== 'player') return pt ? ch(pt.owner) : null;
  const m = typeof councilor === 'function' ? councilor('maresal') : null;
  return m && free(m) ? m : null;
}
function armyName(pt) {
  const p = P();
  if (pt && pt.kind !== 'player') return pt.kind === 'bandit' ? banditName(pt) : L(`${nm(ch(pt.owner))} ordusu`, `Army of ${nm(ch(pt.owner))}`);
  return p && ownRealm(p) ? L('Kraliyet Ordusu', 'Royal Army') : L('Ordun', 'Your army');
}
const armyActive = pt => !!pt && troopCount(pt) > 0;
/* Kraliyet ordusu kendi topraklarında beklerken askerlerin çoğu evine döner: maaşın %35'i ödenir */
function armyAtHome(pt) {
  if (!pt || pt.kind !== 'player' || pt.mode === 'siege' || pt.chase != null || pt.leg || (pt.path && pt.path.length)) return false;
  const pv = partyProv(pt), s = pv ? provSettlement(pv) : null, r = realmOf(P());
  return !!s && !!r && s.liege === r.id;
}
function partyWage(pt) {
  let w = 0;
  for (const k in pt.troops) w += pt.troops[k] * TROOPS[k].wage;
  return armyAtHome(pt) ? Math.round(w * 0.35) : w;
}
/* Oyuncunun başkenti (yoksa ilk yerleşimi) */
function seatOf(c) {
  const r = ownRealm(c);
  const own = settlementsOf(c);
  return own.find(s => s.capital) || (r && realmSettlements(r).find(s => s.capital)) || own[0] || (r && realmSettlements(r)[0]) || null;
}

/* Kayıplar: her tipten orantılı düş */
function applyLosses(pt, frac) {
  const lost = {};
  for (const k in pt.troops) {
    const n = pt.troops[k];
    const l = clamp(Math.round(n * frac * (0.7 + Math.random() * 0.6)), 0, n);
    pt.troops[k] = n - l;
    if (l) lost[k] = l;
    if (!pt.troops[k]) delete pt.troops[k];
  }
  return lost;
}
function lossText(l) { const a = Object.entries(l).filter(([, n]) => n > 0); return a.length ? a.map(([k, n]) => `${n} ${TROOPS[k].ad}`).join(', ') : L('kayıp yok', 'none'); }

/* Savaş sonucu (otomatik ya da savaş ekranından). W: kazanan ordu, L: kaybeden */
function battleAftermath(W, Lp, opts = {}) {
  const wc = ch(W.owner), lOwner = ch(Lp.owner), p = P();
  const lc = Lp.kind === 'player' ? armyLeader(Lp) : lOwner;
  const lp = opts.loserPower || partyPower(Lp);
  const out = [];
  if (wc) wc.prestige += clamp(Math.round(lp / 25), 3, 80);
  if (lOwner) lOwner.prestige -= 10;
  if (Lp.kind === 'bandit') {
    const loot = Lp.gold || 0;
    if (wc) wc.gold += loot;
    if (loot) out.push(L(`Eşkıyaların ganimeti: ${loot} altın.`, `The bandits' loot: ${loot} gold.`));
    removeParty(Lp);
    return out;
  }
  if (wc && W.kind === 'player') { const loot = Math.round(lp * 0.06) + rnd(5, 25); wc.gold += loot; out.push(L(`Ganimet: ${loot} altın.`, `Loot: ${loot} gold.`)); }
  if (lc && lc.alive) {
    if (chance(opts.heroDown ? 0.75 : 0.35) && wc && wc.alive) {
      const lname = nm(lc);
      imprison(wc, lc, true);
      out.push(L(`<b>${lname}</b> esir düştü!`, `<b>${lname}</b> was taken prisoner!`));
      if (Lp.kind === 'player') info(L('⛓️ Mareşalin esir düştü', '⛓️ Your marshal was captured'), L(`Ordun dağıldı ve mareşalin <b>${lname}</b>, <b>${nm(wc)}</b> tarafından esir alındı. Meclisten yeni bir mareşal atayabilirsin.`, `Your army scattered and your marshal <b>${lname}</b> was taken prisoner by <b>${nm(wc)}</b>. You may appoint a new marshal from the council.`));
    } else if (chance(0.04) && lc.id !== p.id) {
      out.push(L(`<b>${nm(lc)}</b> savaş meydanında öldü!`, `<b>${nm(lc)}</b> fell on the battlefield!`));
      die(lc, L(`${wc ? nm(wc) : 'Düşman'} ile savaşta öldü`, `Killed in battle against ${wc ? nm(wc) : 'the enemy'}`));
    }
  }
  if (Lp.kind === 'player' && G.parties.includes(Lp)) {
    // Kraliyet ordusu yok olmaz: kalanlar başkente çekilir
    if (troopCount(Lp) < 5) Lp.troops = {};
    sendArmyHome(Lp);
  } else if (G.parties.includes(Lp) && (troopCount(Lp) < 5 || !ch(Lp.owner) || !free(ch(Lp.owner)))) {
    if (Lp.kind === 'player') { Lp.troops = {}; }
    else removeParty(Lp);
  } else if (G.parties.includes(Lp)) { Lp.mode = 'home'; Lp.chase = null; Lp.stun = 1; }
  return out;
}
function autoBattle(A, B) {
  const pa = partyPower(A) * rnd(80, 120) / 100, pb = partyPower(B) * rnd(80, 120) / 100;
  const W = pa >= pb ? A : B, Lz = W === A ? B : A;
  const ratio = Math.min(pa, pb) / Math.max(pa, pb, 1);
  const lp = partyPower(Lz);
  const lw = applyLosses(W, clamp(ratio * 0.45, 0.02, 0.55));
  const ll = applyLosses(Lz, clamp(0.55 + (1 - ratio) * 0.4, 0.5, 0.95));
  const notes = battleAftermath(W, Lz, { loserPower: lp });
  const wc = ch(W.owner), lc = ch(Lz.owner);
  const wn = W.kind === 'bandit' ? L('Eşkıyalar', 'Bandits') : nm(wc), ln = Lz.kind === 'bandit' ? L('eşkıyaları', 'bandits') : nm(lc);
  return { W, L: Lz, lw, ll, text: L(`${wn}, ${ln} yendi.`, `${wn} defeated ${ln}.`), notes };
}

/* ---------- Kuşatma ---------- */
function captureSettlement(s, c) {
  const oldR = s.liege ? G.titles[s.liege] : null;
  const oldH = ch(s.holder);
  // Kraliyet komutanı: fethedilen yer tacın malıdır, hükümdar karar verir
  const crown = c.id === G.playerId && c.office === 'komutan' && !ownRealm(c) ? ch(c.lordId) : null;
  if (crown && free(crown) && realmOf(c) === ownRealm(crown)) {
    giveTitle(s, crown);
    s.liege = ownRealm(crown).id;
    s.garrison = 12; s.siege = null; s.prosperity = Math.max(0.5, (s.prosperity || 1) - 0.2);
    c.prestige += s.kind === 'sehir' ? 60 : 40;
    refreshLieges();
    if (oldR) { const w = G.wars.find(w => (w.a === oldR.id && w.b === s.liege) || (w.a === s.liege && w.b === oldR.id)); if (w) w.taken[s.liege] = (w.taken[s.liege] || 0) + 1; }
    if (oldH && oldH.alive) addOp(oldH, c, -40);
    addOp(crown, c, 15);
    log(L(`🏴 ${s.name}, ${nm(c)} komutasındaki kraliyet ordusunca ele geçirildi!`, `🏴 ${s.name} was taken by the royal army under ${nm(c)}!`), 'war');
    queueEvent('fethinOdulu', { sid: s.id, lid: crown.id, grant: chance(clamp((opinion(crown, c) + c.prestige / 12 + 10) / 100, 0.1, 0.85)) });
    if (oldR) checkRealmDeath(oldR);
    G.terrDirty = true;
    return;
  }
  giveTitle(s, c);
  const r = realmOf(c) || ownRealm(c);
  s.liege = r ? r.id : null;
  s.garrison = 12; s.siege = null; s.prosperity = Math.max(0.5, (s.prosperity || 1) - 0.2);
  c.prestige += s.kind === 'sehir' ? 60 : 40;
  refreshLieges();
  if (oldR && r) {
    const w = G.wars.find(w => (w.a === oldR.id && w.b === r.id) || (w.a === r.id && w.b === oldR.id));
    if (w) w.taken[r.id] = (w.taken[r.id] || 0) + 1;
  }
  if (oldH && oldH.alive) addOp(oldH, c, -40);
  log(L(`🏴 ${s.name}, ${nm(c)} tarafından ele geçirildi!`, `🏴 ${s.name} was captured by ${nm(c)}!`), 'war');
  if (c.id === G.playerId) info(L('🏴 Zafer!', '🏴 Victory!'), L(`<b>${s.name}</b> artık senin! Sancağın surlarda dalgalanıyor.`, `<b>${s.name}</b> is yours! Your banner flies from the walls.`) + (!realmOf(c) ? L('<br><br>Hiçbir krala bağlı değilsin. Yeterince toprak ve şan toplarsan kendi krallığını ilan edebilirsin.', '<br><br>You serve no king. Gather enough land and prestige and you can proclaim your own kingdom.') : ''));
  else if (oldH && oldH.id === G.playerId) info(L('🏴 Kaybettin', '🏴 Lost'), L(`<b>${s.name}</b> düştü! ${nm(c)} şehrini ele geçirdi.`, `<b>${s.name}</b> has fallen! ${nm(c)} took your holding.`));
  if (oldR) checkRealmDeath(oldR);
  G.terrDirty = true;
}
function siegeAssault(pt, s) {
  const c = ch(pt.owner);
  const ap = partyPower(pt) * rnd(80, 120) / 100, dp = garrisonPower(s) * rnd(80, 120) / 100;
  if (ap > dp) {
    applyLosses(pt, clamp(dp / ap * 0.4, 0.04, 0.4));
    captureSettlement(s, c);
    return true;
  }
  applyLosses(pt, clamp(0.3 + dp / ap * 0.15, 0.3, 0.7));
  s.garrison = Math.max(5, Math.round(s.garrison * (1 - clamp(ap / dp * 0.4, 0.05, 0.5))));
  s.siege = null;
  pt.mode = 'home';
  return false;
}

/* ---------- Yapay zekâ ---------- */
function setGoal(pt, x, y, mode) { pt.tx = x; pt.ty = y; pt.chase = null; pt.mode = mode; }
/* Ordular hep il merkezlerinde konaklar: r yarıçapındaki rastgele bir il merkezi */
function randomLandNear(x, y, r) {
  const list = PROV.filter(p => Math.abs(p.x - x) < r && Math.abs(p.y - y) < r && Math.hypot(p.x - x, p.y - y) < r);
  if (!list.length) { const p = provinceAt(x, y); return p ? [p.x, p.y] : [x, y]; }
  const p = pick(list);
  return [p.x, p.y];
}
function snapToProv(x, y) { const p = provinceAt(x, y); return p ? [p.x, p.y] : [x, y]; }
function aiParty(pt) {
  if (pt.kind === 'player') return;
  if (pt.stun > 0) { pt.stun--; return; }
  const pow = partyPower(pt);
  const near = G.parties.filter(o => o !== pt && Math.abs(o.x - pt.x) < 6 && Math.abs(o.y - pt.y) < 6);
  // Kaç
  const threat = near.find(o => armyActive(o) && hostileParties(pt, o) && dist(pt, o) < 2.2 && partyPower(o) > pow * 1.25);
  if (threat) {
    const dx = pt.x - threat.x, dy = pt.y - threat.y, d = Math.hypot(dx, dy) || 1;
    const [fx, fy] = snapToProv(clamp(pt.x + dx / d * 2.5, 0, MAP.W), clamp(pt.y + dy / d * 2.5, 0, MAP.H));
    setGoal(pt, fx, fy, 'flee');
    return;
  }
  if (pt.kind === 'bandit') {
    const prey = near.filter(o => armyActive(o) && hostileParties(pt, o) && dist(pt, o) < 2.8 && partyPower(o) < pow * 0.8);
    if (prey.length) { pt.chase = prey[0].id; pt.mode = 'chase'; return; }
    if (pt.mode === 'wander' && pt.tx == null && chance(0.8)) return; // vardığı yerde bir süre konaklar
    if (pt.mode !== 'wander' || pt.tx == null || Math.hypot(pt.tx - pt.x, pt.ty - pt.y) < 0.2) {
      const [x, y] = randomLandNear(pt.hx, pt.hy, 2.5);
      setGoal(pt, x, y, 'wander');
    }
    return;
  }
  const c = ch(pt.owner);
  if (!c || !free(c)) { removeParty(pt); return; }
  const home = homeOf(c);
  if (!home) { removeParty(pt); return; }
  const n = troopCount(pt), cap = partyCap(c);
  // İkmal
  if (pt.mode === 'home') {
    if (dist(pt, home) < ENTER_DIST) {
      npcRecruit(c, pt, home);
      if (troopCount(pt) >= cap * 0.75 || c.gold < 30) pt.mode = 'idle';
    } else setGoal(pt, home.x, home.y, 'home');
    return;
  }
  if (n < cap * 0.35) { setGoal(pt, home.x, home.y, 'home'); return; }
  if (pt.mode === 'siege' && pt.sid) {
    const s = G.titles[pt.sid];
    if (s && hostileChars(c, ch(s.holder))) { if (dist(pt, s) > 0.2) setGoal(pt, s.x, s.y, 'siege'), pt.sid = s.id; return; }
    pt.sid = null; pt.mode = 'idle';
  }
  const realm = realmOf(c);
  const foes = enemiesOf(realm);
  if (foes.length) {
    const prey = near.filter(o => armyActive(o) && hostileParties(pt, o) && dist(pt, o) < 5 && partyPower(o) < pow * 0.9 && o.kind !== 'bandit');
    if (prey.length) { prey.sort((a, b) => dist(pt, a) - dist(pt, b)); pt.chase = prey[0].id; pt.mode = 'chase'; return; }
    const targets = settlements().filter(s => s.holder != null && foes.some(f => f.id === s.liege) && dist(pt, s) < 8 && garrisonPower(s) < pow * 0.8);
    if (targets.length) {
      targets.sort((a, b) => dist(pt, a) - dist(pt, b));
      const s = targets[0];
      setGoal(pt, s.x, s.y, 'siege'); pt.sid = s.id;
      return;
    }
  }
  const bandits = near.filter(o => o.kind === 'bandit' && dist(pt, o) < 3 && partyPower(o) < pow * 0.8);
  if (bandits.length) { pt.chase = bandits[0].id; pt.mode = 'chase'; return; }
  if (pt.mode === 'patrol' && pt.tx == null && chance(0.8)) return; // devriye noktasında bir süre bekler
  if ((pt.mode === 'idle' || pt.mode === 'home') && chance(0.6)) return; // her lord sürekli sefere çıkmaz
  if (pt.mode !== 'patrol' || pt.tx == null || Math.hypot(pt.tx - pt.x, pt.ty - pt.y) < 0.15) {
    const own = settlementsOf(c);
    const base = own.length ? pick(own) : home;
    const [x, y] = randomLandNear(base.x, base.y, 1.8);
    setGoal(pt, x, y, 'patrol');
  }
}
function npcRecruit(c, pt, s) {
  const cap = partyCap(c);
  for (const k of Object.keys(s.pool)) {
    while (s.pool[k] > 0 && troopCount(pt) < cap && c.gold >= TROOPS[k].cost * 0.6) {
      s.pool[k]--; c.gold -= Math.round(TROOPS[k].cost * 0.6);
      pt.troops[k] = (pt.troops[k] || 0) + 1;
    }
  }
}
function poolFor(s) {
  const east = CULTURES[s.cul] && CULTURES[s.cul].east;
  return poolBonus(s, s.kind === 'sehir' ? { milis: 14, piyade: 10, okcu: 8 } : east ? { milis: 6, piyade: 6, atliokcu: 8, agir: 2 } : { milis: 6, piyade: 8, atli: 6, agir: 3 });
}

/* ---------- Zaman ---------- */
function moveParty(pt, dtDays) {
  if (pt.chase != null) {
    const t = G.parties.find(x => x.id === pt.chase);
    if (!t) { pt.chase = null; pt.mode = 'idle'; return; }
    pt.tx = t.x; pt.ty = t.y;
  }
  if (pt.tx == null) return;
  const dx = pt.tx - pt.x, dy = pt.ty - pt.y, d = Math.hypot(dx, dy);
  const step = partySpeed(pt) * dtDays;
  if (d <= step) { pt.x = pt.tx; pt.y = pt.ty; if (pt.chase == null) { pt.tx = pt.ty = null; if (pt.kind === 'player') pt.mode = 'idle'; } }
  else { pt.x += dx / d * step; pt.y += dy / d * step; }
  pt.x = clamp(pt.x, 0, MAP.W); pt.y = clamp(pt.y, 0, MAP.H);
}
/* ---------- Tur tabanlı oyuncu hareketi ---------- */
/* Bir turda kaç il ilerlenebilir (deniz geçişi 2 puan) */
function movePoints(pt) { return Math.max(1, Math.round(partySpeed(pt) * TURN_DAYS / 1.1)); }
function partyProv(pt) { return pt ? provinceAt(pt.x, pt.y) : null; }
/* Oyuncuya bir hedef il ver. Dönüş: yol ya da null (ulaşılamaz) */
function orderMove(toProv, siegeSid) {
  const pp = playerParty();
  if (!pp) return null;
  const from = partyProv(pp);
  const path = findPath(from.id, toProv);
  if (!path) return null;
  if (pp.mode === 'siege') { const s = G.titles[pp.sid]; if (s && s.siege && s.siege.by === pp.id) s.siege = null; pp.mode = 'idle'; pp.sid = null; }
  pp.path = path; pp.chase = null; pp.tx = pp.ty = null; pp.goal = siegeSid || null;
  if (!path.length && siegeSid) armyArrived(pp);
  return path;
}
/* Kalan askerleri başkente geri çek (yenilgi sonrası ya da emirle) */
function sendArmyHome(pp) {
  const seat = seatOf(P());
  pp.chase = null; pp.goal = null; pp.leg = null; pp.tx = pp.ty = null; pp.path = [];
  if (pp.mode === 'siege') { const s = G.titles[pp.sid]; if (s && s.siege && s.siege.by === pp.id) s.siege = null; }
  pp.mode = 'idle'; pp.sid = null;
  if (!seat) return;
  if (!armyActive(pp)) { pp.x = seat.x; pp.y = seat.y; return; }
  const a = partyProv(pp), b = partyProv(seat);
  const path = a && b ? findPath(a.id, b.id) : null;
  if (path) pp.path = path; else { pp.x = seat.x; pp.y = seat.y; }
}
/* Ordu hedefine vardı: kuşatma emri varsa kendiliğinden kuşatmaya başla */
function armyArrived(pp) {
  const sid = pp.goal; pp.goal = null;
  const s = sid ? G.titles[sid] : null;
  if (!s || pp.mode === 'siege') return;
  if (dist(pp, s) > ENTER_DIST + 0.2 || !armyActive(pp)) return;
  if (!hostileChars(P(), ch(s.holder))) return;
  if (s.siege && s.siege.by !== pp.id) { log(L(`🔥 ${s.name} zaten başka bir ordu tarafından kuşatılıyor.`, `🔥 ${s.name} is already under siege by another army.`), 'war'); return; }
  startPlayerSiege(s);
  log(L(`🔥 ${armyName(pp)} ${s.name} önüne vardı ve kuşatmaya başladı.`, `🔥 The ${armyName(pp)} reached ${s.name} and laid siege.`), 'war');
}
function orderChase(target) {
  const pp = playerParty();
  if (!pp) return;
  pp.chase = target.id; pp.tx = pp.ty = null;
  const tp = partyProv(target);
  pp.path = tp ? findPath(partyProv(pp).id, tp.id) || [] : [];
}
function cancelOrders() { const pp = playerParty(); if (pp) { pp.path = []; pp.chase = null; pp.leg = null; pp.tx = pp.ty = null; pp.goal = null; } }
/* Turun başında: bu turda yürünecek parçayı hazırla */
function beginTurn() {
  const pp = playerParty();
  G.turnLeft = TURN_DAYS;
  G.dayFrac = 0;
  G.turnEndDay = G.day + TURN_DAYS;
  if (!pp) return;
  pp.tx = pp.ty = null; pp.leg = null;
  if (pp.chase != null) {
    const t = G.parties.find(x => x.id === pp.chase);
    if (!t) { pp.chase = null; pp.path = []; }
    else { const tp = partyProv(t); pp.path = findPath(partyProv(pp).id, tp.id) || []; }
  }
  if (!pp.path || !pp.path.length) return;
  const from = partyProv(pp);
  const step = splitTurns(from.id, pp.path, movePoints(pp))[0] || [];
  pp.path = pp.path.slice(step.length);
  const pts = [[pp.x, pp.y], ...step.map(id => [PROV[id].x, PROV[id].y])];
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  pp.leg = { pts, cum, len: cum[cum.length - 1] };
  if (pp.mode === 'siege') { const s = G.titles[pp.sid]; if (s && s.siege && s.siege.by === pp.id) s.siege = null; pp.mode = 'idle'; }
}
/* Tur ilerlerken oyuncuyu yolunda yürüt */
function stepPlayerLeg() {
  const pp = playerParty();
  if (!pp || !pp.leg) return;
  const f = clamp(1 - G.turnLeft / TURN_DAYS, 0, 1), d = f * pp.leg.len, { pts, cum } = pp.leg;
  let i = 1;
  while (i < pts.length - 1 && cum[i] < d) i++;
  const seg = cum[i] - cum[i - 1] || 1, t = clamp((d - cum[i - 1]) / seg, 0, 1);
  pp.x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t;
  pp.y = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t;
}
/* dd gün ilerlet (tur içinde). Dönüş: oyuncuyla temas eden düşman (varsa) */
function stepTurn(dd) {
  dd = Math.min(dd, G.turnLeft);
  G.turnLeft -= dd;
  stepPlayerLeg();
  const foe = advanceTime(dd);
  if (G.turnLeft <= 1e-6) {
    G.turnLeft = 0;
    while (G.turnEndDay != null && G.day < G.turnEndDay && !G.over) dayTick();
    G.dayFrac = 0;
    const pp = playerParty();
    if (pp && pp.leg) { const e = pp.leg.pts[pp.leg.pts.length - 1]; pp.x = e[0]; pp.y = e[1]; pp.leg = null; }
    if (pp && pp.goal && (!pp.path || !pp.path.length)) armyArrived(pp);
    G.turn = (G.turn || 1) + 1;
  }
  return foe;
}
function turnTurnsLeft(pp) {
  if (!pp || !pp.path || !pp.path.length) return 0;
  return splitTurns(partyProv(pp).id, pp.path, movePoints(pp)).length;
}

/* Gerçek zamanlı ilerleme. Dönüş: oyuncuyla temas eden düşman ordu (varsa) */
function advanceTime(dtDays) {
  G.dayFrac = (G.dayFrac || 0) + dtDays;
  for (const pt of G.parties) if (pt.kind !== 'player') moveParty(pt, dtDays);
  while (G.dayFrac >= 1) {
    G.dayFrac -= 1;
    dayTick();
    if (G.over) return null;
  }
  return checkPlayerContact();
}
function checkPlayerContact() {
  const pp = playerParty();
  if (!pp || G.over) return null;
  for (const o of G.parties) {
    if (o === pp || o.stun > 0 || !armyActive(pp) || (pp.ignore && pp.ignore[o.id] > G.day)) continue;
    if (dist(pp, o) < CONTACT && hostileParties(pp, o)) return o;
  }
  return null;
}
function dayTick() {
  G.day++;
  // Yapay zekâ kararları (sırayla)
  for (const pt of G.parties.slice()) { if (!G.parties.includes(pt)) continue; if ((G.day + pt.think) % 2 === 0) aiParty(pt); }
  // NPC-NPC çarpışmaları
  const ps = G.parties.filter(p => p.kind !== 'player');
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    const a = ps[i], b = ps[j];
    if (!G.parties.includes(a) || !G.parties.includes(b)) continue;
    if (Math.abs(a.x - b.x) > CONTACT || Math.abs(a.y - b.y) > CONTACT || dist(a, b) > CONTACT) continue;
    if (!hostileParties(a, b)) continue;
    const r = autoBattle(a, b);
    const p = P(), pr = realmOf(p);
    const inv = [ch(a.owner), ch(b.owner)].some(c => c && (realmOf(c) === pr || relevant(c)));
    if (inv && a.kind !== 'bandit' && b.kind !== 'bandit') log(`⚔️ ${r.text} ${r.notes.join(' ')}`, 'war');
  }
  // Kuşatmalar
  for (const s of settlements()) {
    if (s.siege) {
      const pt = G.parties.find(x => x.id === s.siege.by);
      if (!pt || dist(pt, s) > 0.35 || !hostileChars(ch(pt.owner), ch(s.holder))) { s.siege = null; continue; }
      if (pt.kind === 'player') continue;
      s.siege.days++;
      if (s.siege.days >= siegeDays(s)) siegeAssault(pt, s);
    }
  }
  for (const pt of G.parties) {
    if (pt.mode !== 'siege' || !pt.sid || pt.kind === 'player') continue;
    const s = G.titles[pt.sid];
    if (s && !s.siege && dist(pt, s) < 0.3 && hostileChars(ch(pt.owner), ch(s.holder))) {
      s.siege = { by: pt.id, days: 0 };
      if (s.holder === G.playerId) info(L('🔥 Kuşatma!', '🔥 Siege!'), L(`<b>${nm(ch(pt.owner))}</b> ${s.name} kuşatıyor! Garnizon: ${s.garrison}. ${siegeDays(s)} gün içinde hücum edecekler.`, `<b>${nm(ch(pt.owner))}</b> is besieging ${s.name}! Garrison: ${s.garrison}. They will storm the walls within ${siegeDays(s)} days.`));
    }
  }
  constructionDay();
  if (G.day % 10 === 0) respawnParties();
  if (G.day % 30 === 0) monthWorld();
  saveGameThrottled();
}
function respawnParties() {
  for (const c of living()) {
    if (c.id === G.playerId || !free(c) || !isAdult(c) || c.rank < 3 || partyOf(c)) continue;
    if (chance(0.5)) spawnLordParty(c);
  }
  const bandits = G.parties.filter(p => p.kind === 'bandit').length;
  for (let i = bandits; i < 8; i++) spawnBandits();
  ensurePlayerParty();
}
const BANDIT_NAMES = [BL('Orman eşkıyaları', 'Forest bandits'), BL('Dağ haydutları', 'Mountain brigands'), BL('Kaçak askerler', 'Deserters'), BL('Yol kesiciler', 'Highwaymen'), BL('Bozkır akıncıları', 'Steppe raiders'), BL('Korsanlar', 'Corsairs'), BL('Yağmacılar', 'Marauders')];
const banditName = pt => (typeof pt.name === 'number' ? pickB(BANDIT_NAMES[pt.name]) : pt.name === 'rebels' ? L('Asi köylüler', 'Peasant rebels') : pt.name || L('Eşkıyalar', 'Bandits'));
function spawnBandits() {
  const s = pick(settlements());
  const [x, y] = randomLandNear(s.x, s.y, 2.5);
  if (!isLand(x, y)) return;
  const n = rnd(8, 35);
  makeParty({ kind: 'bandit', name: rnd(0, BANDIT_NAMES.length - 1), x, y, hx: x, hy: y, gold: rnd(15, 70), troops: { milis: Math.round(n * 0.65), okcu: Math.round(n * 0.25), atli: Math.round(n * 0.1) } });
}
function monthWorld() {
  G.month++;
  if (G.month >= 12) { G.month = 0; G.year++; for (const c of living()) c.age++; }
  // Gelir ve maaşlar
  const p = P();
  for (const c of living()) {
    c.gold += income(c);
    const pt = partyOf(c);
    if (!pt) continue;
    const wage = partyWage(pt);
    const crown = pt.royal && c.office === 'komutan' ? ch(c.lordId) : null;
    if (crown && free(crown) && crown.gold >= wage) { crown.gold -= wage; if (c.id === p.id) log(L(`👑 Kraliyet hazinesi ordunun ${wage} altınlık maaşını ödedi.`, `👑 The crown treasury paid your army's wages (${wage} gold).`), 'info'); continue; }
    if (c.gold >= wage) c.gold -= wage;
    else {
      const lost = applyLosses(pt, 0.2);
      c.gold = 0;
      if (c.id === p.id) log(L(`💸 Maaşları ödeyemedin! Askerlerin kaçtı: ${lossText(lost)}`, `💸 You could not pay wages! Deserters: ${lossText(lost)}`), 'bad');
    }
    if (c.id === p.id && wage) log(L(`💰 Aylık gelir: +${income(c)} · Asker maaşları: -${Math.min(wage, c.gold + wage)}`, `💰 Monthly income: +${income(c)} · Wages: -${Math.min(wage, c.gold + wage)}`), 'info');
  }
  // Garnizon ve asker havuzu
  for (const s of settlements()) {
    const max = garrisonMax(s);
    if (!s.siege) s.garrison = Math.min(max, s.garrison + 2 + bl(s, 'kisla'));
    const base = poolFor(s);
    for (const k in base) s.pool[k] = Math.min(base[k], (s.pool[k] || 0) + Math.ceil(base[k] / (4 - Math.min(2, bl(s, 'kisla')))));
  }
  realmMonth();
  for (const pt of G.parties) if (pt.kind === 'bandit' && troopCount(pt) < 40) pt.troops.milis = (pt.troops.milis || 0) + rnd(0, 3);
  G.feud = G.feud.filter(f => f.until > G.day);
  realmPolitics();
  monthTick();
}
/* Hükümdarların savaş/barış kararları ve vasal isyanları */
function realmPolitics() {
  const p = P();
  for (const r of realms()) {
    const k = ch(r.holder);
    if (!k || !free(k) || k.id === p.id) continue;
    const foes = enemiesOf(r);
    if (foes.length < 1 && chance(0.012)) {
      const mine = realmSettlements(r);
      const cands = realms().filter(o => o !== r && !allied(o, r) && ch(o.holder) && realmSettlements(o).some(s => mine.some(m => dist(m, s) < 7)));
      if (cands.length) {
        let best = null, bs = -1e9;
        for (const o of cands) {
          const ok = ch(o.holder);
          const allyP = alliesOf(o).reduce((a, x) => a + (ch(x.holder) ? charPower(ch(x.holder)) : 0), 0);
          const sc = -opinion(k, ok) + (has(k, 'hirsli') ? 20 : 0) + (charPower(k) / Math.max(1, charPower(ok) + allyP * 0.6)) * 30 + Math.random() * 30;
          if (sc > bs) { bs = sc; best = o; }
        }
        if (best && bs > 40) declareWar(r, best);
      }
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
    const pr = realmOf(p);
    if (pr && ownRealm(p) === pr && (ra === pr || rb === pr)) {
      if (months > 4 && chance(0.06)) queueEvent('barisTeklif', { r: ra === pr ? rb.id : ra.id });
      continue;
    }
    if (chance(0.04 + months * 0.01)) makePeace(ra, rb);
  }
  for (const c of living()) {
    if (c.id === p.id || !free(c) || settlementsOf(c).length < 2 || ownRealm(c) || c.lordId == null) continue;
    const l = ch(c.lordId);
    if (!l || opinion(c, l) > -45 || !(has(c, 'hirsli') || has(c, 'kibirli')) || l.dread > 40) continue;
    if (chance(0.005) && charPower(c) > charPower(l) * 0.35) rebel(c);
  }
}

/* ---------- Oyuncu: şehir işlemleri ---------- */
/* Kraliyet ordusu her zaman vardır (askersiz olsa bile başkentte bekler) */
function ensurePlayerParty() {
  const p = P();
  if (!p || !p.alive || playerParty()) return playerParty();
  const s = seatOf(p) || nearestSettlement(G.lastX ?? MAP.W / 2, G.lastY ?? MAP.H / 2) || settlements()[0];
  return makeParty({ owner: p.id, kind: 'player', x: s.x, y: s.y, troops: {}, path: [] });
}
function playerRecruit(s, k, n) {
  const p = P(), pt = ensurePlayerParty();
  n = Math.min(n, s.pool[k] || 0, Math.floor(p.gold / TROOPS[k].cost));
  if (n <= 0) return 0;
  s.pool[k] -= n; p.gold -= n * TROOPS[k].cost;
  pt.troops[k] = (pt.troops[k] || 0) + n;
  return n;
}
function startPlayerSiege(s) {
  const pt = playerParty();
  s.siege = { by: pt.id, days: 0 };
  pt.mode = 'siege'; pt.sid = s.id;
}

/* ---------- Karakter giderse (ölüm/hapis) ordusu ---------- */
function onCharGone(c, heir) {
  const pt = partyOf(c);
  if (!pt) return;
  if (pt.kind === 'player') {
    G.lastX = pt.x; G.lastY = pt.y;
    if (heir && c.id === G.playerId && !c.alive) {
      const hp = partyOf(heir);
      if (hp) { for (const k in hp.troops) pt.troops[k] = (pt.troops[k] || 0) + hp.troops[k]; removeParty(hp); }
      pt.owner = heir.id;
      return;
    }
    if (c.alive) return; // hükümdar zindanda olsa da ordu sahada kalır
    removeParty(pt);
    return;
  }
  removeParty(pt);
}

/* ---------- Yeni dünya ---------- */
/* 1180'deki savaşlar ve ittifaklar */
const START_WARS = [['eyyubi', 'kudus'], ['selcuklu', 'bizans']];
const START_PACTS = [['ingiltere', 'portekiz'], ['fransa', 'kastilya'], ['selcuklu', 'artuklu'], ['eyyubi', 'abbasi'], ['macar', 'leh']];
function newWorld(opt) {
  G = {
    year: 1180, month: 2, day: 0, dayFrac: 0, turn: 1, turnLeft: 0, chars: {}, titles: {}, secrets: [], wars: [], log: [], queue: [], parties: [], feud: [], settIds: [],
    nextId: 1, nextTitle: 1, nextSecret: 1, nextWar: 1, nextParty: 1, nextRumor: 1, playerId: null, ap: AP_MAX,
    over: null, monthsPlayed: 0, generation: 1, founder: `${opt.name} ${opt.dyn}`, personalFoes: [],
    rumors: [], pacts: [], council: {}, law: { vergi: 1, yukumluluk: 1, veraset: 'erkek' }, cd: {}, loan: null, start: 'hukumdar', geoV: 2,
  };
  buildGeo();
  const rt = {};
  for (const [key, R] of Object.entries(REALMS)) rt[key] = addTitle(R.ad, 5, null, { kind: 'realm', key, color: R.renk, cul: R.kul });
  for (const [name, lon, lat, type, rk, cap] of SETTLEMENTS) {
    const [x, y] = proj(lon, lat);
    const s = addTitle(settName(name), 3, rt[rk].id, { trName: name, kind: type, x, y, capital: !!cap, garrison: type === 'sehir' ? 40 : 32, prosperity: 1, cul: REALMS[rk].kul, siege: null, pool: {},
      b: {}, q: null, tax: 1, unrest: rnd(3, 18), pop: type === 'sehir' ? rnd(18, 34) : rnd(8, 16) });
    // Başlangıçta her yerleşimde birkaç bina
    if (chance(0.7)) s.b.ciftlik = rnd(1, 2);
    if (type === 'sehir' && chance(0.6)) s.b.pazar = 1;
    if (chance(0.5)) s.b.ibadethane = 1;
    if (type === 'kale' || cap) s.b.sur = cap ? 2 : 1;
    if (cap && type === 'sehir') { s.b.pazar = 2; s.b.atolye = 1; }
    s.pool = poolFor(s);
    G.settIds.push(s.id);
  }
  for (const s of settlements()) if (isCoastal(s) && s.kind === 'sehir' && chance(0.5)) s.b.liman = 1;
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
      // Oyuncu doğrudan hükümdardır
      ruler = makeChar({ cul: Rk.kul, name: opt.name, dyn: opt.dyn, female: opt.female, age: 27, rank: 5, gold: 450, prestige: 400, traits: opt.traits.slice(), base: { ...opt.base } });
      p = ruler; G.playerId = p.id;
      if (chance(0.85)) { const sp = makeChar({ cul: Rk.kul, female: !p.female, age: rnd(19, 28), rank: 2, gold: 10, lordId: p.id }); marry(p, sp); }
    } else {
      ruler = makeChar({ cul: Rk.kul, dyn: Rk.han, rank: 5, age: rnd(25, 58), gold: 300, prestige: 300 + rnd(0, 200), female: chance(0.12) });
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
  // Saraydaki herkes oyuncuyu tanır
  const capS = realmSettlements(rt[opt.realm]).find(s => s.capital) || realmSettlements(rt[opt.realm])[0];
  for (const c of living()) if (c.rank >= 3 && c.id !== p.id) spawnLordParty(c);
  const startTroops = troopMix(R.kul, 90, true);
  const home = capS || settlementsOf(p)[0];
  makeParty({ owner: p.id, kind: 'player', x: home.x, y: home.y, troops: startTroops, path: [] });
  for (let i = 0; i < 8; i++) spawnBandits();
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
  G.terrDirty = true;
  const rn = R.ad;
  const foes = enemiesOf(rt[opt.realm]).map(r => r.name), pals = alliesOf(rt[opt.realm]).map(r => r.name);
  const startText = L(`Taç senin başında. <b>${rn}</b> artık senin sorumluluğunda.`, `The crown is upon your head. The <b>${rn}</b> is yours to rule.`) +
    (foes.length ? L(` Krallığın <b>${foes.join(', ')}</b> ile savaşta.`, ` Your realm is at war with the <b>${foes.join(', ')}</b>.`) : '') +
    (pals.length ? L(` Müttefikin: ${pals.join(', ')}.`, ` Your ally: the ${pals.join(', ')}.`) : '');
  log(`📜 ${monthName(G.month)} ${G.year}. ${startText}`, 'info');
  info(L('📜 Taç ve Hançer', '📜 Crown & Dagger'), startText + L(
    `<br><br>Sarayından hükmedersin; ordularını mareşalin yönetir.<br><br>🗺️ <b>Haritada bir ile dokun</b>: orada neler yapabileceğin sol panelde listelenir — inşa, vergi, asker toplama, elçi, savaş ilanı, kuşatma emri.<br>👑 <b>Krallık</b>: meclis, yasalar, kararlar, diplomasi ve vasallar.<br>👥 <b>Kişiler</b>: birine dokun ve <b>Konuş</b> — sözlerin kulaktan kulağa yayılır.<br><br>Her tur ${TURN_DAYS} gün sürer. Hazır olunca <b>TURU BİTİR</b>.`,
    `<br><br>You rule from your court; your marshal leads your armies.<br><br>🗺️ <b>Tap a province on the map</b>: everything you can do there is listed in the side panel — build, tax, raise troops, send envoys, declare war, order sieges.<br>👑 <b>Realm</b>: council, laws, decisions, diplomacy and vassals.<br>👥 <b>People</b>: tap someone and <b>Talk</b> — your words travel from ear to ear.<br><br>Each turn lasts ${TURN_DAYS} days. When ready, press <b>END TURN</b>.`));
  saveGame();
}
let _lastSave = 0;
function saveGameThrottled() { const t = Date.now(); if (t - _lastSave > 4000) { _lastSave = t; saveGame(); } }
/* Eski kayıtları yeni sistemlere uyarla */
function migrateSave() {
  G.rumors = G.rumors || []; G.pacts = G.pacts || []; G.council = G.council || {}; G.cd = G.cd || {};
  G.law = G.law || { vergi: 1, yukumluluk: 1, veraset: 'erkek' }; G.nextRumor = G.nextRumor || 1;
  for (const c of Object.values(G.chars)) {
    if (!c.pr) c.pr = genPrefs(c);
    c.bonds = c.bonds || {}; c.mem = c.mem || [];
    if (c.sup === undefined) c.sup = null;
  }
  const p = P(); if (p) p.inv = p.inv || [];
  for (const s of settlements()) {
    s.b = s.b || {}; if (s.q === undefined) s.q = null;
    if (s.tax == null) s.tax = 1; if (s.unrest == null) s.unrest = 8;
    if (s.pop == null) s.pop = s.kind === 'sehir' ? rnd(18, 34) : rnd(8, 16);
  }
}
/* Eski kayıtlar Avrupa haritasındaydı: koordinatları dünya haritasına taşı ve yeni krallıkları ekle */
function migrateWorld() {
  const dx = (-12 - MAP.LON0) * MAP.COS, dy = MAP.LAT1 - 66;
  for (const s of settlements()) { s.x += dx; s.y += dy; }
  for (const pt of G.parties) {
    pt.x += dx; pt.y += dy;
    if (pt.tx != null) { pt.tx += dx; pt.ty += dy; }
    if (pt.hx != null) { pt.hx += dx; pt.hy += dy; }
    pt.leg = null; pt.path = [];
  }
  if (G.lastX != null) { G.lastX += dx; G.lastY += dy; }
  const rt = {};
  for (const t of Object.values(G.titles)) if (isRealm(t) && t.key) rt[t.key] = t;
  const added = [];
  for (let i = G.settIds.length; i < SETTLEMENTS.length; i++) {
    const [name, lon, lat, type, rk, cap] = SETTLEMENTS[i];
    if (!rt[rk]) { const R = REALMS[rk]; rt[rk] = addTitle(R.ad, 5, null, { kind: 'realm', key: rk, color: R.renk, cul: R.kul }); added.push(rk); }
    const [x, y] = proj(lon, lat);
    const st = addTitle(settName(name), 3, rt[rk].id, { trName: name, kind: type, x, y, capital: !!cap, garrison: type === 'sehir' ? 40 : 32, prosperity: 1, cul: REALMS[rk].kul, siege: null, pool: {},
      b: { ciftlik: 1, sur: cap ? 2 : type === 'kale' ? 1 : 0 }, q: null, tax: 1, unrest: rnd(3, 18), pop: type === 'sehir' ? rnd(18, 34) : rnd(8, 16) });
    st.pool = poolFor(st);
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
function afterLoad() {
  buildGeo();
  if (!G.geoV) migrateWorld();
  relocalize();
  migrateSave();
  G.turn = G.turn || 1; G.turnLeft = G.turnLeft || 0;
  G.start = 'hukumdar';
  if (!G.staffV) { const pl = P(); if (pl && pl.alive) spawnCourtStaff(pl, 7); G.staffV = 1; }
  ensurePlayerParty();
  for (const pt of G.parties) {
    if (pt.kind === 'player') { pt.royal = false; pt.path = pt.path || []; if (!pt.leg && G.turnLeft <= 0) { const p = provinceAt(pt.x, pt.y); if (p && Math.hypot(p.x - pt.x, p.y - pt.y) > CONTACT) { pt.x = p.x; pt.y = p.y; } } pt.tx = pt.ty = null; }
    if (pt.kind === 'bandit' && typeof pt.name === 'string' && pt.name !== 'rebels') pt.name = 0;
  }
  G.terrDirty = true;
}
