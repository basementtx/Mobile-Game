'use strict';
/* =========================================================
   Crown & Dagger — Taktik savaş
   Diziliş seçimi → her tur emir (6 taktik, taş-kâğıt-makas döngüsü)
   → canlandırma. Arazi, hava, moral, üç kanat (sol/merkez/sağ),
   kanat çöküşü, istihbarat, komutan düellosu.
   Kuşatmada: surlar, koçbaşı, mancınık, lağım, kaynar yağ, çıkış.
   Sonuç o.onEnd({won, retreated, lossA, lossB, heroDown, leaderDown}).
   ========================================================= */

let BT = null;
const troopSum = t => Object.values(t).reduce((a, b) => a + b, 0);
function troopPower(t) { let s = 0; for (const k in t) s += t[k] * TROOPS[k].str; return s; }
const hasClass = (t, cls) => Object.keys(t).some(k => t[k] > 0 && TROOPS[k].sinif === cls);
const isRanged = k => TROOPS[k].range > 0;
const isCav = k => TROOPS[k].sinif === 'atli';

/* ---------- Taktikler ---------- */
const TACTICS = {
  hucum: { i: '⚔️', ad: () => L('Hücum', 'Charge'), d: () => L('Tüm hat ileri! Yüksek hasar, yüksek kayıp.', 'All forward! High damage, high losses.'), deal: 1.3, take: 1.2, cav: 1.25 },
  kalkan: { i: '🛡️', ad: () => L('Kalkan duvarı', 'Shield wall'), d: () => L('Mevzini koru. Az hasar alır, az verir.', 'Hold the line. Take little, give little.'), deal: 0.6, take: 0.55, morale: 4 },
  kanat: { i: '🐎', ad: () => L('Kanat manevrası', 'Flanking manoeuvre'), d: () => L('Süvari düşmanın yanına dolanır.', 'Cavalry sweeps around the enemy flanks.'), deal: 0.9, take: 1, cav: 1.8 },
  yagmur: { i: '🏹', ad: () => L('Ok yağmuru', 'Volley'), d: () => L('Okçular ateş eder, piyade bekler.', 'Archers loose; infantry hold.'), deal: 0.45, take: 0.9, ranged: 3.2 },
  ricat: { i: '🏃', ad: () => L('Sahte ricat', 'Feigned retreat'), d: () => L('Geri çekiliyormuş gibi yap, peşine düşeni tuzağa çek.', 'Pretend to flee and lure pursuers into a trap.'), deal: 0.55, take: 0.7, needCav: 0.15 },
  ileri: { i: '🚩', ad: () => L('Komutan öncüde', 'Lead from the front'), d: () => L('Sancağı kendin taşı: moral +15, ama yaralanabilirsin.', 'Carry the banner yourself: morale +15, but you may be wounded.'), deal: 1.1, take: 1, morale: 15, risk: 0.1 },
};
/* Her taktik ikisini yener, ikisine yenilir */
const BEATS = { hucum: ['yagmur', 'ileri'], kalkan: ['hucum', 'yagmur'], kanat: ['kalkan', 'ileri'], ricat: ['hucum', 'kanat'], yagmur: ['ricat', 'kanat'], ileri: ['ricat', 'kalkan'] };
const beats = (a, b) => (BEATS[a] || []).includes(b);
const beatenBy = a => Object.keys(BEATS).filter(k => BEATS[k].includes(a));
/* Kuşatma: saldıran ve savunan emirleri */
const SIEGE_T = {
  merdiven: { i: '🪜', ad: () => L('Merdiven hücumu', 'Escalade'), d: () => L('Surlara tırman. Ağır kayıp ama sonuç getirir.', 'Climb the walls. Bloody, but it gets results.'), deal: 1.05, take: 1.35, wall: 0 },
  kocbasi: { i: '🪵', ad: () => L('Koçbaşı', 'Battering ram'), d: () => L('Kapıyı döv: surlara hasar verir.', 'Batter the gate: damages the walls.'), deal: 0.55, take: 1.1, wall: 22 },
  mancinik: { i: '🪨', ad: () => L('Mancınık atışı', 'Trebuchet barrage'), d: () => L('Surları uzaktan döv. Kuşatma atölyesi gücü artırır.', 'Pound the walls from afar. A siege workshop makes it stronger.'), deal: 0.3, take: 0.3, wall: 10 },
  lagim: { i: '⛏️', ad: () => L('Lağım kaz', 'Undermine'), d: () => L('İki tur üst üste: surların altı çöker.', 'Two turns in a row: the walls collapse.'), deal: 0, take: 0.45, wall: 0 },
  yagmurS: { i: '🏹', ad: () => L('Surlara ok yağdır', 'Rake the walls with arrows'), d: () => L('Okçular mazgallardaki savunucuları avlar.', 'Archers pick off defenders at the crenels.'), deal: 0.5, take: 0.8, ranged: 2.4, wall: 0 },
  ileri: TACTICS.ileri,
};
const DEF_T = {
  savun: { ad: () => L('surları tutuyor', 'holding the walls'), deal: 1, take: 0.85 },
  yag: { ad: () => L('kaynar yağ hazırlıyor', 'readying boiling oil'), deal: 1.1, take: 1 },
  cikis: { ad: () => L('kapıdan çıkış yapacak', 'preparing a sally'), deal: 1.2, take: 1.2 },
  okcu: { ad: () => L('okçularını mazgallara diziyor', 'manning the crenels with archers'), deal: 1, take: 1, ranged: 2 },
};
const SIEGE_BEATS = { // saldıran emri -> {savunan emri: +1 (saldıran üstün) / -1 (savunan üstün)}
  merdiven: { yag: -1, cikis: 1 }, kocbasi: { yag: -1, savun: 1 }, mancinik: { cikis: -1, okcu: 1, savun: 1 },
  lagim: { cikis: -1, yag: 1 }, yagmurS: { okcu: -1, yag: 1 }, ileri: { okcu: -1, savun: 1 },
};
/* ---------- Dizilişler: her sınıf için [sol, merkez, sağ] payları ---------- */
const FORMATIONS = {
  denge: { i: '⚖️', ad: () => L('Dengeli', 'Balanced'), d: () => L('Her kanat eşit güçte.', 'Every wing of equal strength.'), inf: [0.25, 0.5, 0.25], rng: [0.2, 0.6, 0.2], cav: [0.5, 0, 0.5] },
  merkez: { i: '🛡️', ad: () => L('Güçlü merkez', 'Strong centre'), d: () => L('Merkez kırılmaz; kanatlar ince. Merkez savunması +15%.', 'An unbreakable centre; thin wings. Centre defence +15%.'), inf: [0.15, 0.7, 0.15], rng: [0.1, 0.8, 0.1], cav: [0.5, 0, 0.5], cdef: 0.85 },
  ors: { i: '🔨', ad: () => L('Örs ve çekiç', 'Hammer and anvil'), d: () => L('Tüm süvari sol kanatta; o kanatta süvari +25%.', 'All cavalry on the left; cavalry +25% there.'), inf: [0.2, 0.6, 0.2], rng: [0.2, 0.6, 0.2], cav: [1, 0, 0], ham: 1.25 },
  savunma: { i: '🏰', ad: () => L('Savunma hattı', 'Defensive line'), d: () => L('Süvari yedekte. Alınan hasar -15%, verilen -10%.', 'Cavalry in reserve. Damage taken -15%, dealt -10%.'), inf: [0.3, 0.4, 0.3], rng: [0.25, 0.5, 0.25], cav: [0, 1, 0], deal: 0.9, take: 0.85 },
  hilal: { i: '🌙', ad: () => L('Hilal (Turan taktiği)', 'Crescent (Turan tactic)'), d: () => L('Kanatlar öne kavisli; okçular +20%, atlı okçular +35%.', 'Wings curved forward; archers +20%, horse archers +35%.'), inf: [0.25, 0.5, 0.25], rng: [0.3, 0.4, 0.3], cav: [0.5, 0, 0.5], rngB: 1.2, ha: 1.35 },
};
const TERRAIN = {
  ova: { ad: () => L('Ova', 'Plains'), i: '🌾', d: () => L('Süvari +15%', 'Cavalry +15%') },
  orman: { ad: () => L('Orman', 'Forest'), i: '🌳', d: () => L('Süvari -30%, okçu -25%, sahte ricat +30%', 'Cavalry -30%, archers -25%, feint +30%') },
  tepe: { ad: () => L('Tepeler', 'Hills'), i: '⛰️', d: () => L('Savunan +20%, hücum -15%', 'Defender +20%, charges -15%') },
  nehir: { ad: () => L('Nehir geçidi', 'River ford'), i: '🌊', d: () => L('Saldıran ilk iki tur -25%', 'Attacker -25% for two rounds') },
  bozkir: { ad: () => L('Bozkır', 'Steppe'), i: '🐎', d: () => L('Süvari +25%, atlı okçu +30%', 'Cavalry +25%, horse archers +30%') },
  col: { ad: () => L('Çöl', 'Desert'), i: '🏜️', d: () => L('Doğulu olmayanların morali her tur -3', 'Non-eastern troops lose 3 morale per round') },
  sur: { ad: () => L('Surlar', 'Walls'), i: '🧱', d: () => L('Savunanı surlar korur', 'The walls shield the defenders') },
};
const WEATHER = {
  acik: { ad: () => L('Açık', 'Clear'), i: '☀️', d: () => '' },
  yagmur: { ad: () => L('Yağmur', 'Rain'), i: '🌧️', d: () => L('Okçular -40%', 'Archers -40%') },
  sis: { ad: () => L('Sis', 'Fog'), i: '🌫️', d: () => L('İstihbarat yok, okçular -20%', 'No intelligence, archers -20%') },
  sicak: { ad: () => L('Kavurucu sıcak', 'Scorching heat'), i: '🔥', d: () => L('Her tur moral -2, ağır birlikler -10%', 'Morale -2 per round, heavy troops -10%') },
};
function terrainAt(pv) {
  if (!pv) return 'ova';
  const lat = MAP.LAT1 - pv.y, lon = pv.x / MAP.COS + MAP.LON0;
  const r = mulberry32(pv.id * 2654435761 % 4294967296)();
  if (lat < 31) return r < 0.8 ? 'col' : 'tepe';
  if (lon > 33 && lat > 45) return r < 0.75 ? 'bozkir' : 'nehir';
  if (lat > 57) return r < 0.7 ? 'orman' : 'nehir';
  return r < 0.4 ? 'ova' : r < 0.6 ? 'orman' : r < 0.85 ? 'tepe' : 'nehir';
}
function rollWeather(lat) {
  const r = Math.random();
  if (lat < 34) return r < 0.3 ? 'sicak' : 'acik';
  return r < 0.55 ? 'acik' : r < 0.77 ? 'yagmur' : r < 0.92 ? 'sis' : 'sicak';
}

/* ---------- Kurulum ---------- */
/* o: { A: oyuncu ordusu, enemy: {troops, leaderId, name}, siege: yerleşim|null, onEnd(sonuç) } */
function startBattle(o) {
  const p = P(), lc = o.enemy.leaderId != null ? ch(o.enemy.leaderId) : null;
  const er = lc ? realmOf(lc) : o.siege && o.siege.liege ? G.titles[o.siege.liege] : null;
  const pv = partyProv(o.A);
  const lat = pv ? MAP.LAT1 - pv.y : 45;
  const side = (troops, lead, name, col, isDef) => {
    const sav = lead ? stat(lead, 'sav') : 4;
    let m = 58 + sav * 1.6 + (lead && has(lead, 'cesur') ? 8 : 0) - (lead && has(lead, 'korkak') ? 8 : 0) + (lead ? clamp(lead.prestige / 60, -5, 10) : 0) + (isDef && o.siege ? 10 : 0);
    return { troops: Object.assign({}, troops), init: Object.assign({}, troops), lanes: null, lead, name, col, n0: troopSum(troops), morale: clamp(Math.round(m), 30, 95), form: 'denge', last: null, east: lead ? isEast(lead) : false };
  };
  BT = {
    o, round: 0, phase: 'deploy', over: false, result: null, log: [], fx: null,
    A: side(o.A.troops, p, nm(p), '#e8b84a', false),
    E: side(o.enemy.troops, lc, o.enemy.name, er ? er.color : '#8a8070', true),
    place: o.siege ? o.siege.name : provName(pv),
    terrain: o.siege ? 'sur' : terrainAt(pv), weather: rollWeather(lat), max: o.siege ? 12 : 10,
    seed: rnd(1, 1e6), mine: 0, duel: null, intel: null,
  };
  if (BT.E.east) BT.E.form = chance(0.6) ? 'hilal' : 'denge';
  if (o.siege) {
    const lv = bl(o.siege, 'sur');
    BT.walls = { hp: 40 + lv * 45, max: 40 + lv * 45, lv };
    BT.engines = settlementsOf(p).reduce((a, s) => Math.max(a, bl(s, 'kusatma')), 0);
    BT.E.form = 'merkez';
  } else BT.E.form = BT.E.form === 'hilal' ? 'hilal' : pick(['denge', 'denge', 'merkez', 'ors', 'savunma']);
  BT.log.push(o.siege
    ? L(`${BT.place} surları önündesin. ${BT.walls.lv ? `${ROMAN[BT.walls.lv]}. seviye surlar` : 'Alçak, ahşap çitler'} seni bekliyor.`, `You stand before the walls of ${BT.place}. ${BT.walls.lv ? `Level ${ROMAN[BT.walls.lv]} walls` : 'Low wooden palisades'} await you.`)
    : L(`İki ordu ${BT.place} yakınında karşı karşıya. Arazi: ${TERRAIN[BT.terrain].ad().toLocaleLowerCase('tr')}.`, `The two armies face each other near ${BT.place}. Terrain: ${TERRAIN[BT.terrain].ad().toLowerCase()}.`));
  deploy(BT.E);
  showModal('<div class="battle"></div>', 'event');
  renderBattle();
}
/* Birlikleri kanatlara dağıt */
function deploy(s) {
  const F = FORMATIONS[s.form];
  s.lanes = [{}, {}, {}];
  for (const k in s.troops) {
    const n = s.troops[k];
    if (!n) continue;
    const sh = isCav(k) ? F.cav : isRanged(k) ? F.rng : F.inf;
    let left = n;
    const put = [0, 1, 2].map(i => Math.floor(n * sh[i]));
    let rest = n - put.reduce((a, b) => a + b, 0);
    for (let i = 1; rest > 0; i = (i + 1) % 3) { if (sh[i] > 0) { put[i]++; rest--; } }
    put.forEach((v, i) => { if (v) s.lanes[i][k] = v; left -= v; });
  }
}
const laneSum = l => troopSum(l);
function sideTroops(s) { const out = {}; for (const l of s.lanes) for (const k in l) out[k] = (out[k] || 0) + l[k]; return out; }
function shareOf(s, f) { const t = sideTroops(s), n = troopSum(t); if (!n) return 0; let c = 0; for (const k in t) if (f(k)) c += t[k]; return c / n; }

/* ---------- Yapay zekâ emri ---------- */
function enemyOrder() {
  const E = BT.E, A = BT.A, lc = E.lead;
  if (BT.o.siege) {
    const opts = [['savun', 3], ['yag', 2], ['cikis', E.morale > 55 ? 1.5 : 0.5], ['okcu', 2]];
    if (A.last && lc && (has(lc, 'kurnaz') || has(lc, 'dahi')) && chance(0.5)) for (const d in DEF_T) if ((SIEGE_BEATS[A.last] || {})[d] === -1) opts.push([d, 4]);
    return weighted(opts);
  }
  const rs = shareOf(E, isRanged), cs = shareOf(E, isCav);
  const w = { hucum: 2, kalkan: 1.5, kanat: cs > 0.15 ? 2 + cs * 4 : 0.2, yagmur: rs > 0.1 ? 1 + rs * 6 * (BT.round <= 2 ? 1.6 : 0.7) : 0.1, ricat: cs > 0.2 ? 1 : 0, ileri: lc ? 1 : 0 };
  if (lc) {
    if (has(lc, 'cesur')) { w.hucum += 2; w.ileri += 1.5; }
    if (has(lc, 'korkak')) { w.kalkan += 2.5; w.ileri = 0; }
    if (has(lc, 'kurnaz') || has(lc, 'dahi')) { w.ricat += 1; if (A.last) for (const k of beatenBy(A.last)) w[k] = (w[k] || 0) + 3.5; }
  }
  if (E.morale < 35) { w.kalkan += 2; w.ileri += 2; }
  if (BT.weather === 'yagmur') w.yagmur *= 0.4;
  if (BT.terrain === 'orman') w.ricat += 1;
  return weighted(Object.entries(w));
}
function intelAccuracy() {
  if (BT.weather === 'sis') return 0;
  const p = P();
  return clamp(0.3 + (stat(p, 'ent') + stat(p, 'sav')) / 50 + councilBonus('casus') * 0.02, 0, 0.9);
}
function prepareRound() {
  BT.eNext = enemyOrder();
  const acc = intelAccuracy();
  if (acc > 0 && chance(0.85)) {
    const keys = Object.keys(BT.o.siege ? DEF_T : TACTICS);
    BT.intel = chance(acc) ? BT.eNext : pick(keys);
  } else BT.intel = null;
  // Komutan düellosu
  BT.duel = null;
  if (!BT.o.siege && BT.E.lead && BT.round >= 1 && !BT.duelDone && chance(0.13) && P().health > 30) BT.duel = BT.E.lead.id;
}

/* ---------- Bir turun çözümü ---------- */
function classMult(k, s, tac, isDef, laneIdx) {
  const T = TROOPS[k], F = FORMATIONS[s.form], X = BT.o.siege && s === BT.A ? SIEGE_T[tac] : BT.o.siege ? DEF_T[tac] : TACTICS[tac];
  let m = 1;
  if (isCav(k)) {
    if (X && X.cav) m *= X.cav;
    if (BT.terrain === 'ova') m *= 1.15;
    if (BT.terrain === 'orman') m *= 0.7;
    if (BT.terrain === 'bozkir') m *= 1.25;
    if (F.ham && laneIdx === 0) m *= F.ham;
    if (BT.o.siege) m *= 0.55; // süvari surlara tırmanamaz
  }
  if (isRanged(k)) {
    if (X && X.ranged) m *= X.ranged; else if (X === TACTICS.yagmur) m *= 1;
    if (BT.weather === 'yagmur') m *= 0.6;
    if (BT.weather === 'sis') m *= 0.8;
    if (BT.terrain === 'orman') m *= 0.75;
    if (F.rngB) m *= F.rngB;
    if (k === 'atliokcu') { if (F.ha) m *= F.ha; if (BT.terrain === 'bozkir') m *= 1.3; }
  } else if (X && X.ranged && !isCav(k)) m *= 0.4; // ok yağmurunda piyade bekler
  if (BT.weather === 'sicak' && T.tier >= 4) m *= 0.9;
  return m;
}
function lanePower(s, i, tac, isDef) { let pw = 0; for (const k in s.lanes[i]) pw += s.lanes[i][k] * TROOPS[k].str * classMult(k, s, tac, isDef, i); return pw; }
function laneBase(s, i) { let pw = 0; for (const k in s.lanes[i]) pw += s.lanes[i][k] * TROOPS[k].str; return pw; }
function inflictLane(lane, frac) {
  const lost = {};
  for (const k of Object.keys(lane)) {
    const n = lane[k];
    if (!n) continue;
    const w = 1.3 - TROOPS[k].tier * 0.12 - TROOPS[k].def * 0.015;
    let l = n * frac * w * (0.75 + Math.random() * 0.5);
    l = Math.min(n, Math.floor(l) + (Math.random() < l % 1 ? 1 : 0));
    if (l) { lane[k] = n - l; lost[k] = l; if (!lane[k]) delete lane[k]; }
  }
  return lost;
}
function cmdMult(s) { const sav = s.lead ? stat(s.lead, 'sav') : 4; return (1 + sav / 35) * (s === BT.A ? 1 + councilBonus('maresal') * 0.012 : 1); }
const moraleMult = s => 0.6 + s.morale / 250;
function resolveRound(ta) {
  const { A, E } = BT, siege = !!BT.o.siege;
  const te = BT.eNext || enemyOrder();
  BT.round++;
  const XA = siege ? SIEGE_T[ta] : TACTICS[ta], XE = siege ? DEF_T[te] : TACTICS[te];
  let dealA = XA.deal, dealE = XE.deal, takeA = XA.take, takeE = XE.take;
  const FA = FORMATIONS[A.form], FE = FORMATIONS[E.form];
  if (FA.deal) dealA *= FA.deal; if (FA.take) takeA *= FA.take;
  if (FE.deal) dealE *= FE.deal; if (FE.take) takeE *= FE.take;
  const notes = [];
  let edge = 0; // + oyuncu üstün, - düşman üstün
  if (siege) edge = (SIEGE_BEATS[ta] || {})[te] || 0;
  else edge = beats(ta, te) ? 1 : beats(te, ta) ? -1 : 0;
  if (edge > 0) { dealA *= 1.35; E.morale -= 8; }
  if (edge < 0) { dealE *= 1.35; A.morale -= 8; }
  // Sahte ricat tuzağı
  if (!siege && ta === 'ricat' && (te === 'hucum' || te === 'kanat')) { takeE *= 1.5; E.morale -= 7; if (BT.terrain === 'orman') takeE *= 1.3; }
  if (!siege && te === 'ricat' && (ta === 'hucum' || ta === 'kanat')) { takeA *= 1.5; A.morale -= 7; if (BT.terrain === 'orman') takeA *= 1.3; }
  if (!siege && ta === 'ricat' && shareOf(A, isCav) < 0.15) { dealA *= 0.6; notes.push(L('Süvarin az; ricat dağınık bir kaçışa döndü.', 'Too few horsemen; the feint became a ragged flight.')); A.morale -= 6; }
  // Arazi
  if (BT.terrain === 'tepe') { dealE *= 1.2; if (ta === 'hucum') dealA *= 0.85; }
  if (BT.terrain === 'nehir' && BT.round <= 2) dealA *= 0.75;
  // Kuşatma surları
  let wallDmg = 0;
  if (siege && BT.walls.hp > 0) {
    takeE *= 0.45; dealE *= 1.15;
    wallDmg = XA.wall || 0;
    if (ta === 'kocbasi') wallDmg += Math.round(shareOf(A, k => !isRanged(k) && !isCav(k)) * 15);
    if (ta === 'mancinik') wallDmg = BT.engines ? 16 * BT.engines + 6 : 7;
    if (ta === 'lagim') { BT.mine++; if (BT.mine >= 2) { wallDmg = Math.ceil(BT.walls.hp * 0.7) + 10; BT.mine = 0; notes.push(L('Lağımlar ateşlendi! Surların altı çöktü!', 'The mines are fired! The walls collapse into the tunnels!')); } else notes.push(L('Kazıcılar surların altına ilerliyor...', 'Your sappers dig beneath the walls...')); } else BT.mine = 0;
    if (te === 'cikis' && (ta === 'mancinik' || ta === 'lagim')) { wallDmg = Math.round(wallDmg * 0.3); BT.mine = 0; notes.push(L('Savunucular kapıdan çıkıp kuşatma makinelerini yaktı!', 'The defenders sallied out and burned your siege works!')); }
    if (te === 'yag' && (ta === 'merdiven' || ta === 'kocbasi')) notes.push(L('Surlardan kaynar yağ döküldü!', 'Boiling oil pours from the walls!'));
  }
  // Komutan riski
  let wounded = false;
  if ((ta === 'ileri') && chance(XA.risk || 0.1)) { wounded = true; P().health -= 15; notes.push(L('Sancağı taşırken yaralandın! (Sağlık -15)', 'You were wounded carrying the banner! (Health -15)')); }
  if (XA.morale) A.morale += XA.morale;
  if (!siege && XE.morale) E.morale += XE.morale;
  // Hasar: kanat kanat
  const cA = cmdMult(A) * moraleMult(A), cE = cmdMult(E) * moraleMult(E);
  const lossA = {}, lossE = {}, laneLA = [0, 0, 0], laneLE = [0, 0, 0];
  const add = (into, l) => { for (const k in l) into[k] = (into[k] || 0) + l[k]; };
  const dmgTo = [[0, 0, 0], [0, 0, 0]]; // [hedef A, hedef E][kanat]
  for (let i = 0; i < 3; i++) {
    const pa = lanePower(A, i, ta, false) * dealA * cA * (0.85 + Math.random() * 0.3);
    const pe = lanePower(E, i, te, true) * dealE * cE * (0.85 + Math.random() * 0.3);
    const tgtE = laneSum(E.lanes[i]) ? i : 1, tgtA = laneSum(A.lanes[i]) ? i : 1;
    dmgTo[1][laneSum(E.lanes[tgtE]) ? tgtE : [0, 1, 2].find(j => laneSum(E.lanes[j])) ?? 1] += pa * (tgtE !== i ? 1.3 : 1);
    dmgTo[0][laneSum(A.lanes[tgtA]) ? tgtA : [0, 1, 2].find(j => laneSum(A.lanes[j])) ?? 1] += pe * (tgtA !== i ? 1.3 : 1);
  }
  const cdefA = FA.cdef || 1, cdefE = FE.cdef || 1;
  const nA0 = troopSum(sideTroops(A)), nE0 = troopSum(sideTroops(E));
  for (let i = 0; i < 3; i++) {
    const bE = laneBase(E, i), bA = laneBase(A, i);
    if (bE) { const fr = clamp(0.1 * dmgTo[1][i] * takeE * (i === 1 ? cdefE : 1) / bE, 0, 0.5); const l = inflictLane(E.lanes[i], fr); add(lossE, l); laneLE[i] = troopSum(l); }
    if (bA) { const fr = clamp(0.1 * dmgTo[0][i] * takeA * (i === 1 ? cdefA : 1) / bA, 0, 0.5); const l = inflictLane(A.lanes[i], fr); add(lossA, l); laneLA[i] = troopSum(l); }
  }
  // Kanat çöküşleri
  for (const [s, nm_] of [[A, L('Senin', 'Your')], [E, L('Düşmanın', 'The enemy\'s')]]) {
    s.collapsed = s.collapsed || [false, false, false];
    for (const i of [0, 2]) {
      if (!s.collapsed[i] && !laneSum(s.lanes[i]) && laneSum((s === A ? E : A).lanes[i])) {
        s.collapsed[i] = true; s.morale -= 10;
        notes.push(L(`${nm_} ${i === 0 ? 'sol' : 'sağ'} kanadı çöktü!`, `${nm_} ${i === 0 ? 'left' : 'right'} wing has collapsed!`));
      }
    }
  }
  if (siege && BT.walls.hp > 0 && wallDmg > 0) {
    BT.walls.hp = Math.max(0, BT.walls.hp - wallDmg);
    if (!BT.walls.hp) { E.morale -= 15; notes.push(L('Surlarda gedik açıldı! Askerlerin içeri akıyor!', 'The walls are breached! Your soldiers pour through!')); }
  }
  // Moral
  const fa = nA0 ? troopSum(lossA) / nA0 : 0, fe = nE0 ? troopSum(lossE) / nE0 : 0;
  A.morale -= Math.round(fa * 120); E.morale -= Math.round(fe * 120);
  if (ta === 'kalkan') A.morale += 4; if (!siege && te === 'kalkan') E.morale += 4;
  if (BT.terrain === 'col') { if (!A.east) A.morale -= 3; if (!E.east) E.morale -= 3; }
  if (BT.weather === 'sicak') { A.morale -= 2; E.morale -= 2; }
  A.morale = clamp(Math.round(A.morale), 0, 100); E.morale = clamp(Math.round(E.morale), 0, 100);
  A.troops = sideTroops(A); E.troops = sideTroops(E);
  A.last = ta; E.last = te;
  // Anlatı
  const tn = siege ? SIEGE_T[ta].ad() : TACTICS[ta].ad(), en = siege ? DEF_T[te].ad() : TACTICS[te].ad();
  let line = siege ? L(`<b>${tn}</b> — savunucular ${en}.`, `<b>${tn}</b> — the defenders are ${en}.`) : L(`<b>${tn}</b> × düşman: <b>${en}</b>.`, `<b>${tn}</b> vs enemy <b>${en}</b>.`);
  if (edge > 0) line += ' ' + L('<span class="good">Taktiğin üstün geldi!</span>', '<span class="good">Your tactic prevailed!</span>');
  if (edge < 0) line += ' ' + L('<span class="bad">Düşman hamleni okudu!</span>', '<span class="bad">The enemy read your move!</span>');
  BT.log.push(`${L('Tur', 'Round')} ${BT.round}: ${line} ${notes.join(' ')} (−${troopSum(lossA)} / −${troopSum(lossE)})`);
  BT.fx = { t0: performance.now(), ta, te, laneLA, laneLE, edge, wallDmg, dur: 1250 };
  BT.phase = 'anim';
  return wounded;
}
function checkEnd() {
  const { A, E } = BT;
  const na = troopSum(A.troops), ne = troopSum(E.troops);
  const brokeA = A.morale <= 0 || na < A.n0 * 0.3 || na === 0, brokeE = E.morale <= 0 || ne < E.n0 * 0.3 || ne === 0;
  if (brokeE && !brokeA) return finishBattle(true, false);
  if (brokeA && !brokeE) return finishBattle(false, false);
  if (brokeA && brokeE) return finishBattle(troopPower(A.troops) * moraleMult(A) >= troopPower(E.troops) * moraleMult(E), false);
  if (BT.round >= BT.max) {
    if (BT.o.siege) return finishBattle(false, false);
    return finishBattle(troopPower(A.troops) * (A.morale + 20) >= troopPower(E.troops) * (E.morale + 20), false);
  }
  if (P().health <= 0) return finishBattle(false, false);
  return false;
}
function finishBattle(won, retreated) {
  if (!BT || BT.over) return true;
  BT.over = true; BT.phase = 'over';
  const { A, E } = BT;
  if (retreated) for (const l of A.lanes) inflictLane(l, 0.1);
  else {
    const loser = won ? E : A; // kaçan taraf takipte kayıp verir
    for (const l of loser.lanes) inflictLane(l, 0.3 + (BT.terrain === 'ova' || BT.terrain === 'bozkir' ? 0.08 : 0));
  }
  A.troops = sideTroops(A); E.troops = sideTroops(E);
  const loss = s => { const out = {}; for (const k in s.init) { const d = s.init[k] - (s.troops[k] || 0); if (d > 0) out[k] = d; } return out; };
  const heroDown = !won && !retreated && chance(0.35);
  const leaderDown = won && !!E.lead && (BT.duelWon || chance(0.35));
  BT.result = { won, retreated: !!retreated, lossA: loss(A), lossB: loss(E), heroDown, leaderDown };
  BT.log.push(retreated ? L('Geri çekilme borusu çaldı.', 'You sound the retreat.')
    : won ? L('Düşman bozguna uğradı ve kaçıyor!', 'The enemy is routed and flees!') : L('Askerlerin dağılıyor!', 'Your army breaks and scatters!'));
  BT.notes = BT.o.onEnd(BT.result) || [];
  if (won) P().prestige += Math.round(BT.round < 4 ? 15 : 5);
  renderBattle();
  saveGame();
  return true;
}
function retreatBattle() { if (BT && !BT.over && BT.phase !== 'anim') finishBattle(false, true); }
function closeBattle() {
  const r = BT ? BT.result : null;
  if (BT) cancelAnimationFrame(BT.raf);
  BT = null;
  closeModal();
  if (G.over) return renderGameOver();
  updateHUD();
  processQueue();
  return r;
}
/* Emir ver */
function orderTactic(k) {
  if (!BT || BT.phase !== 'order') return;
  resolveRound(k);
  animateBattle();
}
function beginFight() {
  deploy(BT.A);
  BT.phase = 'order';
  prepareRound();
  renderBattle();
}
function duelChoice(accept) {
  const p = P(), c = BT.E.lead;
  BT.duelDone = true; BT.duel = null;
  if (!accept) { BT.A.morale = Math.max(0, BT.A.morale - 8); BT.log.push(L(`${esc(c.name)}'in meydan okumasını geri çevirdin. Askerlerin arasında homurtular yükseldi.`, `You refused ${esc(c.name)}'s challenge. Your soldiers mutter.`)); renderBattle(); return; }
  const win = chance(duelChance(p, c) / 100);
  if (win) {
    BT.E.morale = Math.max(0, BT.E.morale - 30); BT.A.morale = Math.min(100, BT.A.morale + 12); p.prestige += 25; BT.duelWon = true;
    BT.log.push(L(`⚔️ İki ordunun arasında çelik çeliğe çarptı... <b class="good">${esc(c.name)}'i atından düşürdün!</b> Düşman safları sarsıldı.`, `⚔️ Between the two armies steel rang on steel... <b class="good">you unhorsed ${esc(c.name)}!</b> The enemy ranks waver.`));
    if (chance(0.25)) { die(c, L(`Savaş meydanında ${nm(p)} ile teke tek dövüşte öldü`, `Slain by ${nm(p)} in single combat`)); BT.E.lead = null; BT.log.push(L('Düşman komutanı aldığı darbeyle can verdi!', 'The enemy commander died of the blow!')); }
  } else {
    p.health -= 25; BT.A.morale = Math.max(0, BT.A.morale - 20); BT.E.morale = Math.min(100, BT.E.morale + 10);
    BT.log.push(L(`⚔️ ${esc(c.name)}'in kılıcı kalkanını parçaladı. <b class="bad">Yaralı hâlde saflarına döndün.</b> (Sağlık -25)`, `⚔️ ${esc(c.name)}'s blade shattered your shield. <b class="bad">You returned to your lines wounded.</b> (Health -25)`));
  }
  if (!checkEnd()) renderBattle();
}

/* ---------- Canlandırma ---------- */
function animateBattle() {
  renderBattle();
  const step = () => {
    if (!BT) return;
    drawBattleField();
    if (BT.phase === 'anim' && performance.now() - BT.fx.t0 < BT.fx.dur) { BT.raf = requestAnimationFrame(step); return; }
    if (BT.phase === 'anim') {
      BT.phase = 'order';
      if (!checkEnd()) { prepareRound(); renderBattle(); }
    }
  };
  BT.raf = requestAnimationFrame(step);
}
function drawBattleField() {
  const cv = document.getElementById('bcv');
  if (!cv || !BT) return;
  const d = Math.min(2, window.devicePixelRatio || 1);
  const W = cv.clientWidth, H = cv.clientHeight;
  if (cv.width !== Math.round(W * d) || cv.height !== Math.round(H * d)) { cv.width = Math.round(W * d); cv.height = Math.round(H * d); }
  const ctx = cv.getContext('2d');
  ctx.setTransform(d, 0, 0, d, 0, 0);
  const rand = mulberry32(BT.seed);
  // Arazi
  const ter = BT.terrain;
  const grads = { ova: ['#5d6b34', '#7a7c3e'], orman: ['#2f4526', '#3d5a2f'], tepe: ['#6a6a3c', '#857948'], nehir: ['#566a36', '#6f7a3e'], bozkir: ['#8b8550', '#a49a5c'], col: ['#b49058', '#cfa86a'], sur: ['#5f5a3e', '#6f6646'] };
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, grads[ter][0]); g.addColorStop(1, grads[ter][1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 90; i++) { const x = rand() * W, y = rand() * H; ctx.fillStyle = rand() < 0.5 ? '#2a2a14' : '#c8c088'; ctx.fillRect(x, y, 2, 1); }
  ctx.globalAlpha = 1;
  if (ter === 'orman') for (let i = 0; i < 26; i++) { const side = rand() < 0.5; const x = side ? rand() * W * 0.14 : W - rand() * W * 0.14, y = rand() * H; ctx.fillStyle = '#1b2b16'; ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 6, y + 5); ctx.lineTo(x - 6, y + 5); ctx.closePath(); ctx.fill(); }
  if (ter === 'tepe') { ctx.strokeStyle = 'rgba(40,30,10,0.25)'; ctx.lineWidth = 1; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(W * (0.2 + rand() * 0.6), H * (0.15 + rand() * 0.3), 40 + rand() * 60, 12 + rand() * 14, 0, 0, Math.PI * 2); ctx.stroke(); } }
  if (ter === 'nehir') { ctx.fillStyle = 'rgba(60,110,140,0.75)'; ctx.beginPath(); ctx.moveTo(0, H * 0.46); for (let x = 0; x <= W; x += 20) ctx.lineTo(x, H * 0.46 + Math.sin(x / 40) * 4); ctx.lineTo(W, H * 0.56); for (let x = W; x >= 0; x -= 20) ctx.lineTo(x, H * 0.56 + Math.sin(x / 35) * 4); ctx.closePath(); ctx.fill(); }
  if (ter === 'col' || ter === 'bozkir') { ctx.strokeStyle = 'rgba(90,60,20,0.25)'; for (let i = 0; i < 7; i++) { const y = rand() * H; ctx.beginPath(); ctx.moveTo(0, y); ctx.quadraticCurveTo(W / 2, y + 12, W, y - 4); ctx.stroke(); } }
  const fx = BT.fx, t = BT.phase === 'anim' && fx ? clamp((performance.now() - fx.t0) / fx.dur, 0, 1) : 0;
  const laneX = i => W * (0.2 + i * 0.3);
  // Surlar
  if (BT.walls) {
    const wy = H * 0.36, hp = BT.walls.hp / BT.walls.max;
    ctx.fillStyle = hp > 0 ? '#8d8270' : '#5a5246'; ctx.fillRect(0, wy - 8, W, 12);
    ctx.fillStyle = hp > 0 ? '#a69a84' : '#6a6050';
    for (let x = 0; x < W; x += 14) if (hp > 0 || rand() < 0.5) ctx.fillRect(x, wy - 14, 8, 6);
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(W / 2 - 12, wy - 8, 24, 12);
    if (hp <= 0) { ctx.fillStyle = '#4a3f33'; ctx.fillRect(W * 0.62, wy - 14, 34, 20); }
    ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(W - 110, 6, 100, 7); ctx.fillStyle = '#d9c9a0'; ctx.fillRect(W - 110, 6, 100 * hp, 7);
    ctx.font = '700 9px system-ui'; ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText(L('SURLAR', 'WALLS'), W - 114, 13);
    if (BT.engines) for (let i = 0; i < Math.min(3, BT.engines + 1); i++) drawIcon(ctx, 'stone-tower', W * (0.15 + i * 0.35), H * 0.93, 14, '#3a2a1a');
  }
  // Ordular
  const drawSide = (s, isA, tac) => {
    const baseY = isA ? H * 0.68 : H * 0.3, dir = isA ? -1 : 1;
    let adv = 0, spread = 0;
    if (t > 0) {
      const ease = Math.sin(t * Math.PI);
      if (tac === 'hucum' || tac === 'merdiven' || tac === 'ileri' || tac === 'cikis') adv = ease * H * 0.2;
      else if (tac === 'kanat') { adv = ease * H * 0.12; spread = ease * W * 0.06; }
      else if (tac === 'ricat') adv = (t < 0.5 ? -t * 2 : (1 - t) * 2 - 0.2) * H * 0.1;
      else if (tac === 'kocbasi') adv = ease * H * 0.12;
      else adv = ease * H * 0.02;
    }
    s.lanes.forEach((lane, i) => {
      const cx = laneX(i) + (i === 0 ? -spread : i === 2 ? spread : 0);
      const parts = [['inf', k => !isRanged(k) && !isCav(k)], ['rng', isRanged], ['cav', isCav]];
      for (const [cls, f] of parts) {
        let n = 0; for (const k in lane) if (f(k)) n += lane[k];
        if (!n) continue;
        const dots = Math.min(56, Math.ceil(n / 1.6));
        const cols = Math.min(12, Math.ceil(Math.sqrt(dots * 2.5)));
        const off = cls === 'rng' ? 20 : cls === 'cav' ? -16 : 0;
        const cAdv = cls === 'cav' && (tac === 'kanat' || tac === 'hucum') ? adv * 1.3 : cls === 'rng' && (tac === 'yagmur' || tac === 'yagmurS') ? 0 : adv;
        const y0 = baseY + dir * (-cAdv) + (isA ? off : -off);
        for (let q = 0; q < dots; q++) {
          const r = Math.floor(q / cols), c = q % cols;
          const x = cx + (c - cols / 2) * (cls === 'cav' ? 7.5 : 5.8), y = y0 + r * 5.2 * (isA ? 1 : -1);
          ctx.fillStyle = 'rgba(10,6,3,.85)';
          if (cls === 'cav') { ctx.fillRect(x - 3.4, y - 2, 6.8, 4); ctx.fillStyle = s.col; ctx.fillRect(x - 2.6, y - 1.3, 5.2, 2.6); }
          else if (cls === 'rng') { ctx.beginPath(); ctx.arc(x, y, 2.5, 0, 6.3); ctx.fill(); ctx.fillStyle = s.col; ctx.beginPath(); ctx.arc(x, y, 1.7, 0, 6.3); ctx.fill(); }
          else { ctx.fillRect(x - 2.5, y - 2.5, 5, 5); ctx.fillStyle = s.col; ctx.fillRect(x - 1.8, y - 1.8, 3.6, 3.6); }
        }
        ctx.fillStyle = s.col;
        if (tac === 'kalkan' && cls === 'inf') { ctx.fillStyle = 'rgba(230,220,190,.85)'; ctx.fillRect(cx - cols * 2.6, y0 + (isA ? -5 : 3), cols * 5.2, 2); ctx.fillStyle = s.col; }
      }
      // Oklar
      if (t > 0 && (tac === 'yagmur' || tac === 'yagmurS' || tac === 'okcu' || tac === 'hucum' && rand() < 0.3)) {
        let rn = 0; for (const k in lane) if (isRanged(k)) rn += lane[k];
        if (rn) {
          ctx.strokeStyle = 'rgba(30,20,10,.85)'; ctx.lineWidth = 1;
          const ty = isA ? H * 0.24 : H * 0.74;
          for (let a = 0; a < Math.min(14, Math.ceil(rn / 4)); a++) {
            const ph = (t * 1.6 + a * 0.07) % 1;
            const sx = cx + (rand() - 0.5) * 50, ex = laneX(i) + (rand() - 0.5) * 60;
            const sy = baseY + (isA ? 22 : -22);
            const x = sx + (ex - sx) * ph, y = sy + (ty - sy) * ph - Math.sin(ph * Math.PI) * 26;
            const ang = Math.atan2((ty - sy) - Math.cos(ph * Math.PI) * 26 * Math.PI, ex - sx);
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(ang) * 6, y - Math.sin(ang) * 6); ctx.stroke();
          }
        }
      }
    });
    // Sancak
    const bx = laneX(1), by = baseY + (isA ? 34 : -34) - dir * adv * (tac === 'ileri' ? 1 : 0.4);
    ctx.fillStyle = '#2a1d0c'; ctx.fillRect(bx - 0.8, by - 14, 1.6, 16);
    ctx.fillStyle = s.col; ctx.beginPath(); ctx.moveTo(bx + 0.8, by - 14); ctx.lineTo(bx + 11, by - 10); ctx.lineTo(bx + 0.8, by - 6); ctx.closePath(); ctx.fill();
  };
  drawSide(BT.E, false, BT.phase === 'anim' && fx ? fx.te : null);
  drawSide(BT.A, true, BT.phase === 'anim' && fx ? fx.ta : null);
  // Çarpışma kıvılcımları ve kayıplar
  if (t > 0) {
    if (t > 0.35 && t < 0.75) { ctx.strokeStyle = 'rgba(255,230,140,.9)'; for (let i = 0; i < 18; i++) { const x = laneX(i % 3) + (Math.random() - 0.5) * 60, y = H * 0.5 + (Math.random() - 0.5) * 16; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 8); ctx.stroke(); } }
    ctx.font = '700 12px system-ui'; ctx.textAlign = 'center';
    for (let i = 0; i < 3; i++) {
      const rise = t * 18;
      if (fx.laneLA[i]) { ctx.fillStyle = `rgba(255,120,100,${1 - t * 0.6})`; ctx.fillText('−' + fx.laneLA[i], laneX(i), H * 0.66 - rise); }
      if (fx.laneLE[i]) { ctx.fillStyle = `rgba(255,236,160,${1 - t * 0.6})`; ctx.fillText('−' + fx.laneLE[i], laneX(i), H * 0.34 - rise); }
    }
    if (fx.wallDmg && BT.walls) { ctx.fillStyle = `rgba(230,230,230,${1 - t})`; ctx.fillText(`${L("SUR", "WALL")} −${fx.wallDmg}`, W / 2, H * 0.3 - t * 14); }
  }
  // Hava
  if (BT.weather === 'yagmur') { ctx.strokeStyle = 'rgba(200,220,255,.28)'; ctx.lineWidth = 1; const off = (performance.now() / 8) % 20; for (let i = 0; i < 70; i++) { const x = (i * 37 + off * 3) % W, y = (i * 53 + off * 9) % H; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 9); ctx.stroke(); } }
  if (BT.weather === 'sis') { const fg = ctx.createLinearGradient(0, 0, 0, H); fg.addColorStop(0, 'rgba(230,230,225,.55)'); fg.addColorStop(0.5, 'rgba(230,230,225,.2)'); fg.addColorStop(1, 'rgba(230,230,225,.4)'); ctx.fillStyle = fg; ctx.fillRect(0, 0, W, H); }
  if (BT.weather === 'sicak') { ctx.fillStyle = 'rgba(255,140,40,.1)'; ctx.fillRect(0, 0, W, H); }
  // Kanat etiketleri
  ctx.font = '700 9px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(255,248,230,.55)';
  [L('SOL', 'LEFT'), L('MERKEZ', 'CENTRE'), L('SAĞ', 'RIGHT')].forEach((s, i) => ctx.fillText(s, laneX(i), H - 4));
}

/* ---------- Görünüm ---------- */
function moraleBar(s) { return `<div class="mbar" title="${L('Moral', 'Morale')}"><div style="width:${s.morale}%"></div></div>`; }
function bsideMini(s, mine) {
  const n = troopSum(s.troops);
  return `<div class="bmini ${mine ? 'mine' : 'foe'}"><i class="sw" style="background:${s.col}"></i><span><b>${esc(s.name)}</b><small>${n}/${s.n0} · ${L('Moral', 'Morale')} ${s.morale}${s.lead ? ` · ⚔️${stat(s.lead, 'sav')}` : ''} · ${FORMATIONS[s.form].ad()}</small>${moraleBar(s)}</span></div>`;
}
function tacticButton(k, X, isSiege) {
  const strong = isSiege ? Object.entries(SIEGE_BEATS[k] || {}).filter(([, v]) => v > 0).map(([d]) => DEF_T[d].ad()) : BEATS[k].map(x => TACTICS[x].ad());
  const weak = isSiege ? Object.entries(SIEGE_BEATS[k] || {}).filter(([, v]) => v < 0).map(([d]) => DEF_T[d].ad()) : beatenBy(k).map(x => TACTICS[x].ad());
  let dis = '';
  if (k === 'ricat' && shareOf(BT.A, isCav) < 0.1) dis = L('Süvari yok', 'No cavalry');
  if ((k === 'yagmur' || k === 'yagmurS') && shareOf(BT.A, isRanged) < 0.05) dis = L('Okçu yok', 'No archers');
  if (k === 'kanat' && shareOf(BT.A, isCav) < 0.05) dis = L('Süvari yok', 'No cavalry');
  if (isSiege && k === 'kocbasi' && BT.walls.hp <= 0) dis = L('Surlar zaten yıkık', 'The walls are already down');
  return `<button class="tac ${BT.intel && (isSiege ? (SIEGE_BEATS[k] || {})[BT.intel] > 0 : beats(k, BT.intel)) ? 'hint' : ''}" data-tac="${k}" ${dis ? 'disabled' : ''}><span class="ti">${X.i}</span><span class="tl"><b>${X.ad()}</b><small>${dis || X.d()}</small>${strong.length ? `<em class="good">▲ ${strong.join(', ')}</em>` : ''}${weak.length ? `<em class="bad">▼ ${weak.join(', ')}</em>` : ''}</span></button>`;
}
function renderBattle() {
  if (!BT) return;
  const panel = $('#modal .battle');
  if (!panel) return;
  const { A, E } = BT, r = BT.result, siege = !!BT.o.siege;
  const title = siege ? L(`🔥 ${esc(BT.place)} kuşatması`, `🔥 Siege of ${esc(BT.place)}`) : L(`⚔️ ${esc(BT.place)} muharebesi`, `⚔️ Battle of ${esc(BT.place)}`);
  const Tr = TERRAIN[BT.terrain], Wt = WEATHER[BT.weather];
  const conds = `<span class="bc" data-tip="${esc(Tr.d())}">${Tr.i} ${Tr.ad()}</span><span class="bc" data-tip="${esc(Wt.d() || Wt.ad())}">${Wt.i} ${Wt.ad()}</span><span class="bc">${L('Tur', 'Round')} ${BT.round}/${BT.max}</span>`;
  let foot = '';
  if (BT.phase === 'deploy') {
    const forms = Object.keys(FORMATIONS).map(k => { const F = FORMATIONS[k]; return `<button class="tac ${A.form === k ? 'on' : ''}" data-form="${k}"><span class="ti">${F.i}</span><span class="tl"><b>${F.ad()}</b><small>${F.d()}</small></span></button>`; }).join('');
    foot = `<div class="bq">${L('Dizilişini seç', 'Choose your formation')} · <small class="muted">${L('Düşman', 'Enemy')}: ${FORMATIONS[E.form].ad()}${E.lead ? ` · ${esc(E.lead.name)}: ${E.lead.traits.filter(t => TRAITS[t].kisilik).map(t => TRAITS[t].ad).join(', ')}` : ''}</small></div>
      <div class="tacs">${forms}</div>
      <div class="brow"><button class="opt primary" data-begin>${siege ? L('🔥 Hücuma geç', '🔥 Begin the assault') : L('⚔️ Savaşa başla', '⚔️ Begin the battle')}</button><button class="opt" data-retreat>🏳️ ${L('Çekil', 'Withdraw')}</button></div>`;
  } else if (BT.phase === 'order' && BT.duel) {
    const c = ch(BT.duel);
    foot = `<div class="bduel"><b>⚔️ ${L('Meydan okuma!', 'A challenge!')}</b><p>${L(`Düşman komutanı <b>${esc(nm(c))}</b> iki ordunun arasına çıktı ve seni teke tek dövüşe çağırıyor! (Kazanma şansın ~%${duelChance(P(), c)})`, `The enemy commander <b>${esc(nm(c))}</b> rides out between the armies and challenges you to single combat! (Your chance ~${duelChance(P(), c)}%)`)}</p>
      <div class="brow"><button class="opt primary" data-duel="1">🤺 ${L('Kabul et', 'Accept')}</button><button class="opt" data-duel="0">${L('Reddet (moral -8)', 'Refuse (morale -8)')}</button></div></div>`;
  } else if (BT.phase === 'order') {
    const set = siege ? Object.keys(SIEGE_T) : Object.keys(TACTICS);
    const iname = BT.intel ? (siege ? DEF_T[BT.intel].ad() : TACTICS[BT.intel].ad()) : null;
    foot = `<div class="bq">${L('Emrin nedir?', 'Your orders?')} ${iname ? `<small class="intel">🔭 ${L('Gözcüler', 'Scouts')}: ${siege ? L(`savunucular ${iname}`, `the defenders are ${iname}`) : L(`düşman "${iname}" hazırlığında`, `the enemy prepares "${iname}"`)}</small>` : `<small class="muted">🔭 ${BT.weather === 'sis' ? L('Sis yüzünden gözcüler kör.', 'The fog blinds your scouts.') : L('Düşmanın niyeti belirsiz.', 'The enemy\'s intent is unclear.')}</small>`}</div>
      <div class="tacs">${set.map(k => tacticButton(k, siege ? SIEGE_T[k] : TACTICS[k], siege)).join('')}</div>
      <div class="brow"><button class="opt" data-retreat>🏳️ ${L('Geri çekil', 'Retreat')}</button></div>`;
  } else if (BT.phase === 'anim') foot = `<div class="bq">⏳ ${L('Askerlerin emri uyguluyor…', 'Your soldiers carry out the order…')}</div>`;
  else {
    const head = r.retreated ? `<b class="mid">🏳️ ${L('Geri çekildin', 'You retreated')}</b>` : r.won ? `<b class="good">🏆 ${L('Zafer!', 'Victory!')}</b>` : `<b class="bad">💀 ${L('Yenilgi', 'Defeat')}</b>`;
    foot = `<div class="bres">${head}<span>${L('Kayıpların', 'Your losses')}: ${lossText(r.lossA)} · ${L('Düşman kayıpları', 'Enemy losses')}: ${lossText(r.lossB)}</span>
      ${r.heroDown ? `<span class="bad">${L('Ağır yaralandın. (Sağlık -35)', 'You were badly wounded. (Health -35)')}</span>` : ''}${(BT.notes || []).map(x => `<span>${x}</span>`).join('')}</div>
      <div class="brow"><button class="opt primary" data-bclose>${L('Devam', 'Continue')}</button></div>`;
  }
  panel.innerHTML = `<div class="bhd"><h2>${title}</h2><div class="bconds">${conds}</div></div>
    <div class="bstage"><canvas id="bcv"></canvas><div class="bminis">${bsideMini(A, true)}${bsideMini(E, false)}</div></div>
    <div class="blog">${BT.log.slice(-2).map((l, i, a) => `<p class="${i === a.length - 1 ? 'new' : ''}">${l}</p>`).join('')}</div>
    <div class="bfoot">${foot}</div>`;
  panel.querySelectorAll('[data-form]').forEach(b => b.onclick = () => { A.form = b.dataset.form; deploy(A); renderBattle(); });
  panel.querySelectorAll('[data-tac]').forEach(b => b.onclick = () => orderTactic(b.dataset.tac));
  panel.querySelectorAll('[data-duel]').forEach(b => b.onclick = () => duelChoice(b.dataset.duel === '1'));
  const bg = panel.querySelector('[data-begin]'); if (bg) bg.onclick = beginFight;
  panel.querySelectorAll('[data-retreat]').forEach(b => b.onclick = retreatBattle);
  const cl = panel.querySelector('[data-bclose]'); if (cl) cl.onclick = closeBattle;
  bindTips(panel);
  if (!A.lanes) deploy(A);
  requestAnimationFrame(drawBattleField);
}
