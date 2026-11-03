'use strict';
/* =========================================================
   Crown & Dagger — Krallık yönetimi
   Yerleşim ekonomisi (refah, nüfus, huzursuzluk, vergi),
   binalar ve inşaat, hükümdar meclisi, yasalar, kararlar,
   diplomasi (paktlar), borçlar ve taht darbesi.
   ========================================================= */

/* ---------- Binalar ----------
   max: en yüksek seviye · cost/days: seviye başına · up: seviye başına aylık bakım
   only: 'sehir' | 'kıyı' kısıtı */
const BUILDINGS = {
  ciftlik: { i: '🌾', max: 3, cost: [40, 90, 170], days: [30, 45, 60], up: 1,
    ad: () => L('Çiftlikler', 'Farmsteads'), d: () => L('Tahıl ve hayvancılık. Gelir, nüfus ve refah artar.', 'Grain and livestock. Raises income, population and prosperity.') },
  atolye: { i: '🏭', max: 3, cost: [70, 140, 260], days: [40, 60, 80], up: 2,
    ad: () => L('İmalathane (Fabrika)', 'Manufactory'), d: () => L('Dokuma, demir ve çömlek atölyeleri. Yüksek gelir.', 'Weavers, smiths and potters. High income.') },
  pazar: { i: '🏪', max: 3, cost: [50, 110, 200], days: [30, 45, 60], up: 1,
    ad: (s) => (s && CULTURES[s.cul] && CULTURES[s.cul].east ? L('Çarşı', 'Bazaar') : L('Pazar yeri', 'Market square')), d: () => L('Gelir artar; hediye eşyaları satın alınabilir.', 'Raises income; gift goods can be bought.') },
  han: { i: '🏛️', max: 3, cost: [80, 150, 260], days: [45, 60, 80], up: 2,
    ad: (s) => (s && CULTURES[s.cul] && CULTURES[s.cul].east ? L('Kervansaray', 'Caravanserai') : L('Ticaret hanı (lonca)', 'Merchant guildhall')), d: () => L('Kervan ve lonca ticareti. Gelir ve refah.', 'Caravan and guild trade. Income and prosperity.') },
  liman: { i: '⚓', max: 3, cost: [90, 170, 300], days: [50, 70, 90], up: 2, only: 'kiyi',
    ad: () => L('Liman', 'Harbour'), d: () => L('Deniz ticareti: güçlü gelir ve refah. Sadece kıyı yerleşimlerinde.', 'Sea trade: strong income and prosperity. Coastal holdings only.') },
  banka: { i: '🏦', max: 2, cost: [150, 300], days: [60, 90], up: 3, only: 'sehir', req: 'pazar',
    ad: () => L('Banka (sarraflar)', 'Bank (money-changers)'), d: () => L('Hazinene faiz işler, gelir verir ve ucuz borç sağlar. Pazar gerekir.', 'Earns interest on your treasury and offers cheap loans. Needs a market.') },
  ibadethane: { i: '⛪', max: 3, cost: [60, 130, 240], days: [40, 60, 90], up: 1,
    ad: (s) => templeName(s), d: () => L('Huzursuzluğu azaltır, şan ve dindar insanların sevgisini getirir.', 'Lowers unrest; brings prestige and the love of the pious.') },
  sur: { i: '🧱', max: 3, cost: [80, 160, 300], days: [45, 70, 100], up: 2,
    ad: () => L('Surlar', 'Walls'), d: () => L('Kuşatmada savunma ve sur dayanıklılığı; garnizon kapasitesi artar.', 'Siege defence and wall strength; larger garrison.') },
  kisla: { i: '🛡️', max: 3, cost: [60, 120, 220], days: [30, 45, 60], up: 2,
    ad: () => L('Kışla', 'Barracks'), d: () => L('Asker havuzu büyür ve hızlı dolar.', 'Larger, faster-refilling recruit pool.') },
  ahir: { i: '🐴', max: 2, cost: [70, 150], days: [40, 60], up: 2,
    ad: () => L('Ahırlar', 'Stables'), d: () => L('Süvari ve ağır süvari bulunur.', 'Cavalry and heavy horse become available.') },
  okul: { i: '🏫', max: 2, cost: [90, 180], days: [60, 90], up: 2,
    ad: (s) => (s && CULTURES[s.cul] && CULTURES[s.cul].east ? L('Medrese', 'Madrasa') : L('Okul (üniversite)', 'School (university)')), d: () => L('Şan getirir; her ay bir yeteneğin gelişebilir.', 'Brings prestige; your skills may improve each month.') },
  sifahane: { i: '🏥', max: 2, cost: [70, 140], days: [40, 60], up: 1,
    ad: (s) => (s && CULTURES[s.cul] && CULTURES[s.cul].east ? L('Darüşşifa', 'Bimaristan') : L('Hastane', 'Hospital')), d: () => L('Sağlığın hızla iyileşir, salgınlar hafifler, nüfus artar.', 'Faster healing, milder plagues, population growth.') },
  kusatma: { i: '🪨', max: 2, cost: [90, 180], days: [40, 60], up: 2,
    ad: () => L('Kuşatma atölyesi', 'Siege workshop'), d: () => L('Ordun mancınık taşır: kuşatmalarda surları döver.', 'Your army fields trebuchets that batter walls in sieges.') },
};
const BKEYS = Object.keys(BUILDINGS);
function templeName(s) {
  const c = s ? s.cul : 'latin';
  if (c === 'turk' || c === 'arap') return L('Cami ve külliye', 'Mosque');
  if (c === 'rum' || c === 'slav') return L('Ortodoks kilisesi', 'Orthodox church');
  return L('Kilise (katedral)', 'Church (cathedral)');
}
const bl = (s, k) => (s && s.b ? s.b[k] || 0 : 0);
const TAX_NAMES = () => [L('Hafif', 'Light'), L('Normal', 'Normal'), L('Yüksek', 'High'), L('Ezici', 'Crushing')];
const TAX_MULT = [0.65, 1, 1.35, 1.7];
const TAX_UNREST = [-3, 0, 2.5, 5];

/* Kıyı yerleşimi mi? (yakınında deniz var mı) */
const _coast = {};
function isCoastal(s) {
  if (_coast[s.id] != null) return _coast[s.id];
  let sea = false;
  for (const r of [0.25, 0.45, 0.65]) for (let a = 0; a < 16 && !sea; a++) {
    const ang = a / 16 * Math.PI * 2;
    if (!isLand(s.x + Math.cos(ang) * r, s.y + Math.sin(ang) * r)) sea = true;
  }
  return (_coast[s.id] = sea);
}
function canBuild(s, k) {
  const B = BUILDINGS[k], lv = bl(s, k);
  if (lv >= B.max) return L('En yüksek seviyede', 'Fully upgraded');
  if (B.only === 'sehir' && s.kind !== 'sehir') return L('Sadece şehirlerde', 'Cities only');
  if (B.only === 'kiyi' && !isCoastal(s)) return L('Sadece kıyıda', 'Coastal only');
  if (B.req && !bl(s, B.req)) return L(`Önce ${BUILDINGS[B.req].ad(s)} gerekli`, `Requires ${BUILDINGS[B.req].ad(s)} first`);
  if (k === 'atolye' && s.kind !== 'sehir' && lv >= 1) return L('Kalelerde en fazla 1', 'Castles: level 1 only');
  if (s.q) return L('Başka bir inşaat sürüyor', 'Another construction is under way');
  if (s.siege) return L('Kuşatma altında', 'Under siege');
  return null;
}
function buildCost(s, k) { const B = BUILDINGS[k], lv = bl(s, k); return Math.round(B.cost[lv] * (s.kind === 'sehir' ? 1 : 0.85)); }
function buildDays(s, k) { const B = BUILDINGS[k], lv = bl(s, k); return B.days[lv]; }
function startBuild(s, k, c) {
  const cost = buildCost(s, k);
  c.gold -= cost;
  s.q = { k, lvl: bl(s, k) + 1, left: buildDays(s, k), tot: buildDays(s, k) };
  return cost;
}
function finishBuild(s) {
  const q = s.q;
  s.b = s.b || {};
  s.b[q.k] = q.lvl;
  s.q = null;
  const h = ch(s.holder);
  if (q.k === 'sur') s.garrison += 5;
  if (h && h.id === G.playerId) {
    log(L(`🏗️ ${s.name}: ${BUILDINGS[q.k].ad(s)} (${ROMAN[q.lvl]}) tamamlandı!`, `🏗️ ${s.name}: ${BUILDINGS[q.k].ad(s)} (${ROMAN[q.lvl]}) completed!`), 'good');
    toastLater(L(`🏗️ ${BUILDINGS[q.k].ad(s)} tamamlandı (${s.name})`, `🏗️ ${BUILDINGS[q.k].ad(s)} completed (${s.name})`));
  }
}
function toastLater(m) { if (typeof toast === 'function') setTimeout(() => toast(m), 50); }
function constructionDay() {
  for (const s of settlements()) {
    if (!s.q || s.siege) continue;
    s.q.left -= 1;
    if (s.q.left <= 0) finishBuild(s);
  }
}

/* ---------- Yerleşim ekonomisi ---------- */
function bldIncome(s, holder) {
  let g = 0;
  g += 3 * bl(s, 'ciftlik');
  g += (s.kind === 'sehir' ? 6 : 3) * bl(s, 'atolye');
  g += 4 * bl(s, 'pazar');
  g += (4 + (isCoastal(s) ? 1 : 0)) * bl(s, 'han');
  g += 7 * bl(s, 'liman');
  if (bl(s, 'banka')) g += 4 * bl(s, 'banka') + Math.min(12 * bl(s, 'banka'), Math.floor(Math.max(0, holder ? holder.gold : 0) * 0.01 * bl(s, 'banka')));
  return g;
}
function bldUpkeep(s) { let u = 0; for (const k of BKEYS) u += BUILDINGS[k].up * bl(s, k); return u; }
/* Bir yerleşimin sahibine aylık net geliri (dökümlü) */
function settIncomeParts(s, c) {
  const y = c ? stat(c, 'yon') : 5;
  const base = (s.kind === 'sehir' ? 14 : 8) * (s.prosperity || 1) * TAX_MULT[s.tax ?? 1] * (1 - (s.unrest || 0) / 220) + (s.pop || 10) / 6;
  const parts = [[L('Vergiler', 'Taxes'), Math.round(base)], [L('Yönetim', 'Stewardship'), Math.floor(y / 3)]];
  const b = bldIncome(s, c);
  if (b) parts.push([L('Binalar', 'Buildings'), b]);
  const u = bldUpkeep(s);
  if (u) parts.push([L('Bakım', 'Upkeep'), -u]);
  return parts;
}
function settIncome(s, c) { return settIncomeParts(s, c).reduce((a, p) => a + p[1], 0); }
function garrisonMax(s) { return (s.kind === 'sehir' ? 60 : 45) + bl(s, 'sur') * 15 + bl(s, 'kisla') * 5; }
function wallMult(s) { return 1 + bl(s, 'sur') * 0.3; }
function siegeDays(s) { return SIEGE_DAYS + bl(s, 'sur') * 4; }
function poolBonus(s, base) {
  const m = 1 + 0.4 * bl(s, 'kisla');
  const out = {};
  for (const k in base) out[k] = Math.round(base[k] * m);
  const east = CULTURES[s.cul] && CULTURES[s.cul].east;
  const st = bl(s, 'ahir');
  if (st) {
    const cav = east ? 'atliokcu' : 'atli';
    out[cav] = (out[cav] || 0) + 4 * st;
    out.agir = (out.agir || 0) + 2 * st;
  }
  return out;
}

/* Aylık: refah, nüfus, huzursuzluk, isyanlar */
function settlementMonth() {
  const p = P();
  for (const s of settlements()) {
    s.b = s.b || {};
    if (s.tax == null) s.tax = 1;
    if (s.unrest == null) s.unrest = 8;
    if (s.pop == null) s.pop = s.kind === 'sehir' ? rnd(18, 34) : rnd(8, 16);
    const h = ch(s.holder);
    let du = TAX_UNREST[s.tax] - bl(s, 'ibadethane') * 1.5 - s.garrison / 30 - 0.8;
    if (s.siege) du += 6;
    if (h) du += h.tyranny / 25 - (has(h, 'merhametli') ? 0.5 : 0);
    if (h && G.council && h.id === G.playerId) { const ch_ = ch(G.council.ruhani); if (ch_ && ch_.alive) du -= 1 + (has(ch_, 'dindar') ? 1 : 0); }
    if ((s.prosperity || 1) < 0.7) du += 1.5;
    s.unrest = clamp((s.unrest || 0) + du, 0, 100);
    const pros = 0.008 + bl(s, 'ciftlik') * 0.004 + bl(s, 'liman') * 0.004 + bl(s, 'han') * 0.003 - (s.unrest > 50 ? 0.02 : 0);
    s.prosperity = clamp((s.prosperity || 1) + pros, 0.4, 1.3 + bl(s, 'ciftlik') * 0.05 + bl(s, 'liman') * 0.05);
    const cap = (s.kind === 'sehir' ? 40 : 20) + bl(s, 'ciftlik') * 6 + bl(s, 'sifahane') * 4;
    s.pop = clamp(s.pop + (s.prosperity - 0.9) * 0.6 + bl(s, 'ciftlik') * 0.15 - (s.unrest > 60 ? 0.6 : 0), 3, cap);
    // İsyan
    if (s.unrest > 75 && chance(0.12) && h) {
      s.prosperity = Math.max(0.4, s.prosperity - 0.08);
      s.unrest -= 25;
      const [x, y] = randomLandNear(s.x, s.y, 1.2);
      const n = rnd(15, 30) + Math.round(s.pop / 2);
      makeParty({ kind: 'bandit', name: 'rebels', x, y, hx: x, hy: y, gold: rnd(5, 20), troops: { milis: Math.round(n * 0.8), okcu: Math.round(n * 0.2) } });
      if (h.id === p.id) info(L('🔥 İsyan!', '🔥 Revolt!'), L(`<b>${s.name}</b> halkı vergilere ve zulme karşı ayaklandı! Asi köylüler kırsalda toplanıyor. Huzursuzluğu düşür: vergiyi hafiflet, ibadethane kur, garnizonu büyüt.`, `The people of <b>${s.name}</b> have risen against taxes and oppression! Rebels gather in the countryside. Lower unrest: ease taxes, build a temple, strengthen the garrison.`));
      else if (relevant(h)) log(L(`🔥 ${s.name} halkı ayaklandı.`, `🔥 The people of ${s.name} revolted.`), 'war');
    } else if (h && h.id === p.id && s.unrest > 60 && chance(0.15)) log(L(`⚠️ ${s.name} halkı huzursuz (%${Math.round(s.unrest)}).`, `⚠️ ${s.name} is restless (${Math.round(s.unrest)}%).`), 'bad');
  }
}
/* NPC'ler de topraklarına yatırım yapar */
function npcBuildTick() {
  for (const c of living()) {
    if (c.id === G.playerId || !free(c) || c.gold < 120 || !chance(0.1)) continue;
    const own = settlementsOf(c).filter(s => !s.q && !s.siege);
    if (!own.length) continue;
    const s = pick(own);
    const atWar = enemiesOf(realmOf(c)).length > 0;
    const prefs = atWar ? ['sur', 'kisla', 'ahir', 'ciftlik'] : has(c, 'dindar') ? ['ibadethane', 'ciftlik', 'pazar'] : has(c, 'acgozlu') ? ['pazar', 'atolye', 'han', 'liman', 'banka'] : ['ciftlik', 'pazar', 'atolye', 'sur', 'han', 'liman', 'ibadethane'];
    for (const k of prefs) {
      if (canBuild(s, k)) continue;
      const cost = buildCost(s, k);
      if (c.gold < cost + 60) continue;
      startBuild(s, k, c);
      break;
    }
  }
}

/* ---------- Meclis (oyuncunun krallığı) ---------- */
const COUNCIL = {
  sansolye: { i: '🕊️', st: 'dip', ad: () => L('Şansölye / Vezir', 'Chancellor / Vizier'), d: () => L('Vasalların sana bakışını ve barış görüşmelerini iyileştirir.', 'Improves vassal opinion and peace talks.') },
  maresal: { i: '⚔️', st: 'sav', ad: () => L('Mareşal / Serasker', 'Marshal'), d: () => L('Ordu gücü ve kapasitesi artar.', 'Raises army strength and size.') },
  hazinedar: { i: '🪙', st: 'yon', ad: () => L('Hazinedar / Defterdar', 'Steward / Treasurer'), d: () => L('Tüm gelirlerini artırır.', 'Raises all your income.') },
  casus: { i: '🕵️', st: 'ent', ad: () => L('Casusbaşı', 'Spymaster'), d: () => L('Casusluk ve sır öğrenme şansı; söylentileri erken duyarsın.', 'Better spying and secret-hunting; you hear rumours sooner.') },
  ruhani: { i: '🙏', st: 'dip', ad: () => L('Saray din adamı', 'Court chaplain'), d: () => L('Topraklarındaki huzursuzluğu azaltır.', 'Lowers unrest across your holdings.') },
};
function councilor(seat) { const id = G.council && G.council[seat]; const c = id != null ? ch(id) : null; return c && c.alive && !c.prisonerOf ? c : null; }
function councilBonus(seat) {
  const c = councilor(seat);
  if (!c || !ownRealm(P())) return 0;
  return stat(c, COUNCIL[seat].st);
}
function councilCandidates(p) {
  return living().filter(x => x.id !== p.id && isAdult(x) && free(x) && (x.lordId === p.id || familyRel(p, x) === 'es' || (isUnder(x, p) && x.rank >= 2)))
    .sort((a, b) => b.rank - a.rank || opinion(b, p) - opinion(a, p)).slice(0, 40);
}
function appoint(seat, c) {
  const p = P();
  G.council = G.council || {};
  const old = councilor(seat);
  if (old && old !== c) { addOp(old, p, -15); remember(old, p, 'ihanet', -10); }
  for (const k in G.council) if (G.council[k] === c.id) delete G.council[k];
  G.council[seat] = c.id;
  addOp(c, p, 20);
  c.prestige += 15;
}
function autoCouncil(p) {
  G.council = G.council || {};
  const used = new Set();
  for (const seat of Object.keys(COUNCIL)) {
    const cands = councilCandidates(p).filter(x => !used.has(x.id));
    if (!cands.length) continue;
    cands.sort((a, b) => stat(b, COUNCIL[seat].st) - stat(a, COUNCIL[seat].st));
    G.council[seat] = cands[0].id; used.add(cands[0].id);
  }
}

/* ---------- Yasalar ---------- */
const LAW_TAX_OP = [10, 0, -10, -22];
const LAW_LEVY_OP = [6, 0, -10];
function law() { G.law = G.law || { vergi: 1, yukumluluk: 1, veraset: 'erkek' }; return G.law; }
function vassalLawParts(a, b) {
  // a: vasal, b: oyuncu hükümdar
  const parts = [];
  if (b.id !== G.playerId || !ownRealm(b) || !isUnder(a, b)) return parts;
  const lw = law();
  if (LAW_TAX_OP[lw.vergi]) parts.push([L('Krallık vergisi', 'Crown tax'), LAW_TAX_OP[lw.vergi]]);
  if (LAW_LEVY_OP[lw.yukumluluk]) parts.push([L('Asker yükümlülüğü', 'Levy obligation'), LAW_LEVY_OP[lw.yukumluluk]]);
  const ch_ = councilor('sansolye');
  if (ch_) parts.push([L('Şansölyenin diplomasisi', 'Chancellor\'s diplomacy'), Math.floor(stat(ch_, 'dip') / 3)]);
  if (G.council && Object.values(G.council).includes(a.id)) parts.push([L('Mecliste görevli', 'Sits on your council'), 15]);
  if (has(a, 'dindar')) { const t = settlementsOf(b).reduce((s, x) => s + bl(x, 'ibadethane'), 0); if (t) parts.push([L('İbadethanelerin', 'Your temples'), Math.min(12, t * 3)]); }
  return parts;
}

/* ---------- Diplomasi: savunma paktları ---------- */
function allied(r1, r2) { return !!(r1 && r2 && G.pacts && G.pacts.some(x => (x.a === r1.id && x.b === r2.id) || (x.a === r2.id && x.b === r1.id))); }
function alliesOf(r) { return r && G.pacts ? G.pacts.filter(x => x.a === r.id || x.b === r.id).map(x => G.titles[x.a === r.id ? x.b : x.a]).filter(t => t && !t.dead) : []; }
function addPact(r1, r2) { G.pacts = G.pacts || []; if (!allied(r1, r2)) G.pacts.push({ a: r1.id, b: r2.id, since: G.day }); }
function breakPact(r1, r2) { G.pacts = (G.pacts || []).filter(x => !((x.a === r1.id && x.b === r2.id) || (x.a === r2.id && x.b === r1.id))); }
/* Saldırıya uğrayanın müttefikleri savaşa katılır */
function callAllies(attacker, defender) {
  for (const al of alliesOf(defender)) {
    if (al === attacker || atWarRealms(al, attacker)) continue;
    if (allied(al, attacker)) { breakPact(al, attacker); continue; }
    G.wars.push({ a: al.id, b: attacker.id, start: G.day, taken: { [al.id]: 0, [attacker.id]: 0 } });
    log(L(`🛡️ ${al.name}, müttefiki ${defender.name} için ${attacker.name} ile savaşa girdi!`, `🛡️ The ${al.name} joined the war against the ${attacker.name} to defend its ally, the ${defender.name}!`), 'war');
    const pr = realmOf(P());
    if (pr && (pr === al || pr === attacker)) info(L('🛡️ Müttefik savaşı', '🛡️ Allied war'), L(`${al.name}, savunma paktı gereği ${attacker.name} ile savaşa girdi.`, `Honouring a defensive pact, the ${al.name} is now at war with the ${attacker.name}.`));
  }
}

/* ---------- Kararlar ---------- */
function cooldown(k) { G.cd = G.cd || {}; return Math.max(0, (G.cd[k] || 0) - monthIndex()); }
function setCooldown(k, months) { G.cd = G.cd || {}; G.cd[k] = monthIndex() + months; }
function vassalsOf(p) { return living().filter(x => x.lordId === p.id && x.titles.length); }
function hasBank(p) { return settlementsOf(p).some(s => bl(s, 'banka')); }
const DECISIONS = [
  {
    id: 'seferberlik', i: '📯', ad: () => L('Seferberlik ilan et', 'Call the banners'),
    d: p => L(`Vasallarının askerleri ordunu doldurur (+${mobilizeSize(p)} asker). 80💰, vasallar -8. 6 ayda bir.`, `Your vassals' levies fill your army (+${mobilizeSize(p)} men). 80💰, vassals -8. Every 6 months.`),
    show: p => !!ownRealm(p),
    req: p => firstReq(goldReq(p, 80), cooldown('seferberlik') ? L(`${cooldown('seferberlik')} ay bekle`, `Wait ${cooldown('seferberlik')} months`) : null, !playerParty() ? L('Ordun yok', 'No army') : null),
    run(p) {
      p.gold -= 80; setCooldown('seferberlik', 6);
      const add = troopMix(p.cul, mobilizeSize(p));
      const pt = playerParty();
      for (const k in add) pt.troops[k] = (pt.troops[k] || 0) + add[k];
      vassalsOf(p).forEach(v => addOp(v, p, -8));
      return L(`Sancaklar açıldı! Vasalların adamlarını gönderdi: ${lossText(add)}.`, `The banners are called! Your vassals sent their men: ${lossText(add)}.`);
    },
  },
  {
    id: 'senlik', i: '🍗', ad: () => L('Büyük şölen ve turnuva', 'Grand feast and tournament'),
    d: () => L('200💰. Şan +80, tüm vasallar +12, stres -20. Yılda bir.', '200💰. Prestige +80, all vassals +12, stress -20. Once a year.'),
    show: p => !!ownRealm(p) || settlementsOf(p).length >= 2,
    req: p => firstReq(goldReq(p, 200), cooldown('senlik') ? L(`${cooldown('senlik')} ay bekle`, `Wait ${cooldown('senlik')} months`) : null),
    run(p) {
      p.gold -= 200; setCooldown('senlik', 12);
      p.prestige += 80; stress(p, -20);
      const guests = living().filter(x => x.id !== p.id && (x.lordId === p.id || familyRel(p, x) || isUnder(x, p) && x.rank >= 3));
      guests.forEach(x => { addOp(x, p, 12); remember(x, p, 'etkinlik', 6); });
      return L(`Kırk gün kırk gece süren şölen dillere destan oldu. ${guests.length} soylu adını övüyor. (Şan +80)`, `A feast of forty days and nights became legend. ${guests.length} nobles praise your name. (Prestige +80)`);
    },
  },
  {
    id: 'vergiaffi', i: '🕊️', ad: () => L('Vergi affı', 'Tax amnesty'),
    d: p => L(`Bu ayki vergilerden vazgeç (${Math.round(income(p) * 0.8)}💰): tüm topraklarında huzursuzluk -25.`, `Forgo this month's taxes (${Math.round(income(p) * 0.8)}💰): unrest -25 in all your holdings.`),
    show: p => settlementsOf(p).length > 0,
    req: p => firstReq(goldReq(p, Math.round(income(p) * 0.8)), cooldown('vergiaffi') ? L(`${cooldown('vergiaffi')} ay bekle`, `Wait ${cooldown('vergiaffi')} months`) : null),
    run(p) {
      p.gold -= Math.round(income(p) * 0.8); setCooldown('vergiaffi', 4);
      settlementsOf(p).forEach(s => { s.unrest = Math.max(0, (s.unrest || 0) - 25); });
      p.prestige += 10;
      return L('Tellallar meydanlarda affı duyurdu. Halk adını dualarla anıyor.', 'Heralds proclaimed the amnesty in every square. The people bless your name.');
    },
  },
  {
    id: 'borc', i: '🏦', ad: p => L(`Borç al (${loanSize(p)}💰)`, `Take a loan (${loanSize(p)}💰)`),
    d: p => L(`${hasBank(p) ? 'Kendi bankandan' : 'Lombard bankerlerinden'} borç: 12 ay sonra ${loanDue(p)}💰 ödersin. Ödeyemezsen şan ve itibar kaybı.`, `Borrow from ${hasBank(p) ? 'your own bank' : 'Lombard bankers'}: repay ${loanDue(p)}💰 in 12 months. Default costs prestige and standing.`),
    show: p => p.rank >= 3,
    req: p => (G.loan ? L('Ödenmemiş borcun var', 'You already have a loan') : null),
    run(p) {
      G.loan = { amt: loanDue(p), due: monthIndex() + 12 };
      p.gold += loanSize(p);
      return L(`Bankerler keseleri masaya bıraktı. <b>+${loanSize(p)} altın</b>. Ödeme: ${G.loan.amt}💰, 12 ay içinde.`, `The bankers set the purses on the table. <b>+${loanSize(p)} gold</b>. Repay ${G.loan.amt}💰 within 12 months.`);
    },
  },
  {
    id: 'borcode', i: '💰', ad: () => L('Borcu öde', 'Repay the loan'),
    d: () => (G.loan ? L(`${G.loan.amt}💰 · ${Math.max(0, G.loan.due - monthIndex())} ay kaldı`, `${G.loan.amt}💰 · ${Math.max(0, G.loan.due - monthIndex())} months left`) : ''),
    show: () => !!G.loan,
    req: p => goldReq(p, G.loan ? G.loan.amt : 0),
    run(p) { p.gold -= G.loan.amt; G.loan = null; p.prestige += 5; return L('Borcunu kuruşu kuruşuna ödedin. Bankerler saygıyla eğildi.', 'You repaid every coin. The bankers bowed with respect.'); },
  },
  {
    id: 'darbe', i: '👑', ad: () => L('Tahtı ele geçir (darbe)', 'Seize the throne (coup)'),
    d: p => coupInfo(p),
    show: p => coupEligible(p),
    req: p => firstReq(jailReq(p), coupSupporters(p).length < 2 ? L('En az 2 destekçi gerekli (sohbette destek iste)', 'Needs at least 2 supporters (ask for support in conversation)') : null),
    confirm: true,
    run(p) { return doCoup(p); },
  },
];
const DECISION_MAP = Object.fromEntries(DECISIONS.map(d => [d.id, d]));
function mobilizeSize(p) { return 15 + realmSettlements(ownRealm(p) || { id: -1 }).length * 4 + law().yukumluluk * 10; }
function loanSize(p) { return hasBank(p) ? 300 : 200; }
function loanDue(p) { return hasBank(p) ? 330 : 270; }
function loanTick() {
  if (!G.loan) return;
  const p = P();
  if (monthIndex() < G.loan.due) return;
  if (p.gold >= G.loan.amt) { p.gold -= G.loan.amt; log(L(`🏦 Borç vadesi doldu; ${G.loan.amt} altın hazineden tahsil edildi.`, `🏦 The loan fell due; ${G.loan.amt} gold was collected from your treasury.`), 'info'); }
  else {
    p.prestige -= 60; p.gold = 0;
    info(L('🏦 Borç ödenemedi', '🏦 Loan default'), L('Bankerler alacaklarını tahsil edemedi. Hazinene el kondu ve adın her sarayda alay konusu. (Şan -60)', 'The bankers could not collect. Your treasury was seized and your name is mocked at every court. (Prestige -60)'));
  }
  G.loan = null;
}

/* ---------- Taht darbesi (hanedan üyesi ya da komutan) ---------- */
function coupTarget(p) { const r = realmOf(p); return r && !ownRealm(p) ? ch(r.holder) : null; }
function isDynast(p) { const k = coupTarget(p); return !!k && (familyRel(p, k) === 'kardes' || familyRel(p, k) === 'cocuk' || familyRel(p, k) === 'baba' || familyRel(p, k) === 'anne' || p.dyn === k.dyn); }
function coupEligible(p) { const k = coupTarget(p); return !!k && isAdult(p) && (isDynast(p) || p.office === 'komutan' || p.rank >= 4); }
function coupSupporters(p) { return living().filter(x => x.sup === p.id && free(x) && realmOf(x) === realmOf(p) && x.id !== p.id); }
function coupOdds(p) {
  const k = coupTarget(p);
  if (!k) return 0;
  const sup = coupSupporters(p);
  const mine = charPower(p) + sup.reduce((s, x) => s + charPower(x), 0);
  const loyal = living().filter(x => x.lordId === k.id && x.titles.length && opinion(x, k) > 20 && x.sup !== p.id).reduce((s, x) => s + charPower(x) * 0.5, 0);
  const theirs = charPower(k) + loyal;
  return pct(20 + (mine / Math.max(1, theirs) - 0.8) * 45 + (stat(p, 'ent') - stat(k, 'ent')) * 2 + sup.length * 4 + (isDynast(p) ? 10 : 0) - k.dread / 4);
}
function coupInfo(p) {
  const k = coupTarget(p);
  if (!k) return '';
  return L(`${nm(k)} tahttan indirilir. Destekçiler: ${coupSupporters(p).length} · Başarı ~%${coupOdds(p)}. Başarısızlık: zindan ya da sürgün.`, `Depose ${nm(k)}. Supporters: ${coupSupporters(p).length} · Success ~${coupOdds(p)}%. Failure: dungeon or exile.`);
}
function doCoup(p) {
  const k = coupTarget(p), r = realmOf(p);
  const sup = coupSupporters(p);
  if (chance(coupOdds(p) / 100)) {
    const cap = realmSettlements(r).find(s => s.capital && s.holder === k.id);
    giveTitle(r, p);
    if (cap) giveTitle(cap, p);
    p.office = null;
    const pt = playerParty(); if (pt) pt.royal = false;
    imprison(p, k, false);
    p.prestige += 150;
    for (const x of sup) { addOp(x, p, 25); x.sup = null; }
    G.secrets = G.secrets.filter(s => !(s.type === 'komplo' && s.actor === p.id));
    for (const x of living()) if (x.lordId === p.id && x.titles.length && opinion(x, k) > 40) addOp(x, p, -30);
    refreshLieges(); G.terrDirty = true;
    autoCouncil(p);
    return L(`Gece yarısı muhafızlar sarayı kuşattı. ${nm(k)} zincire vuruldu ve <b>${r.name}</b> tacı artık senin başında! (Şan +150) Eski hükümdara sadık vasallar öfkeli.`, `At midnight the guards surrounded the palace. ${nm(k)} was put in chains and the crown of the <b>${r.name}</b> is now yours! (Prestige +150) Vassals loyal to the old ruler are furious.`);
  }
  for (const x of sup) { x.sup = null; if (chance(0.5)) imprison(k, x, true); }
  addOp(k, p, -100); setBond(k, p, 'rakip');
  { const ex = G.secrets.find(s => s.type === 'komplo' && s.actor === p.id && s.target === k.id); if (ex) exposeSecret(ex); else exposeSecret(addSecret('komplo', p.id, k.id, [p.id, k.id])); }
  if (chance(0.5)) {
    imprison(k, p, true);
    return L(`Komplo son anda ifşa oldu! ${nm(k)} seni zindana attırdı. Destekçilerin dağıldı.`, `The plot was betrayed at the last moment! ${nm(k)} had you thrown in the dungeon. Your supporters scattered.`);
  }
  for (const s of settlementsOf(p)) { giveTitle(s, k); }
  p.office = null; p.lordId = null;
  const pt = playerParty(); if (pt) pt.royal = false;
  refreshLieges(); G.terrDirty = true;
  return L(`Darbe başarısız oldu. Gece karanlığında sınırdan kaçtın; toprakların ve unvanların elinden alındı. Artık sürgündesin.`, `The coup failed. You fled across the border under cover of night; your lands and titles were stripped. You are an exile now.`);
}

/* ---------- Aylık krallık işleyişi ---------- */
function realmMonth() {
  settlementMonth();
  npcBuildTick();
  loanTick();
  const p = P();
  // Meclis maaşları
  if (ownRealm(p) && G.council) {
    const n = Object.keys(G.council).filter(k => councilor(k)).length;
    if (n) p.gold = Math.max(0, p.gold - n * 3);
    // Okul: yetenek gelişimi
  }
  const sch = settlementsOf(p).reduce((a, s) => a + bl(s, 'okul'), 0);
  if (sch && chance(0.06 * sch)) { const k = pick(Object.keys(STATS)); if (p.base[k] < 20) { p.base[k]++; log(L(`🏫 Okulundaki âlimlerle çalıştın: ${STATS[k]} +1.`, `🏫 You studied with the scholars of your school: ${STATS[k]} +1.`), 'good'); } }
  if (sch) p.prestige += sch;
  const temples = settlementsOf(p).reduce((a, s) => a + bl(s, 'ibadethane'), 0);
  if (temples) p.prestige += temples;
  const hosp = settlementsOf(p).reduce((a, s) => a + bl(s, 'sifahane'), 0);
  if (hosp) p.health = Math.min(100, p.health + hosp * 2);
  // Komutan: kraliyet maaşı
  if (p.office === 'komutan') {
    const l = ch(p.lordId);
    if (!l || !free(l) || ownRealm(p) || !realmOf(p)) { p.office = null; const pt = playerParty(); if (pt) pt.royal = false; }
    else { const sal = 15; if (l.gold >= sal) { l.gold -= sal; p.gold += sal; } }
  }
}
