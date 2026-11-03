'use strict';
/* =========================================================
   Crown & Dagger — Krallık yönetimi
   Hükümdar meclisi, yasalar, kararlar, diplomasi (ittifaklar),
   borçlar ve taht darbesi.
   ========================================================= */

/* ---------- Meclis (oyuncunun krallığı) ---------- */
const COUNCIL = {
  sansolye: { i: '🕊️', st: 'dip', ad: () => L('Şansölye / Vezir', 'Chancellor / Vizier'), d: () => L('Vasalların sana bakışını ve barış görüşmelerini iyileştirir.', 'Improves vassal opinion and peace talks.') },
  maresal: { i: '⚔️', st: 'sav', ad: () => L('Mareşal / Serasker', 'Marshal'), d: () => L('Saldırılarının gücü artar.', 'Your attacks hit harder.') },
  hazinedar: { i: '🪙', st: 'yon', ad: () => L('Hazinedar / Defterdar', 'Steward / Treasurer'), d: () => L('Tüm gelirlerini artırır.', 'Raises all your income.') },
  casus: { i: '🕵️', st: 'ent', ad: () => L('Casusbaşı', 'Spymaster'), d: () => L('Casusluk ve sır öğrenme şansı; söylentileri erken duyarsın.', 'Better spying and secret-hunting; you hear rumours sooner.') },
  ruhani: { i: '🙏', st: 'dip', ad: () => L('Saray din adamı', 'Court chaplain'), d: () => L('Her ay şan getirir; dindar vasallar seni daha çok sever.', 'Brings prestige each month; pious vassals think better of you.') },
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
  if (has(a, 'dindar') && councilor('ruhani')) parts.push([L('Saray din adamın', 'Your court chaplain'), 6 + Math.floor(stat(councilor('ruhani'), 'dip') / 4)]);
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
function hasBank(p) { return false; }
const DECISIONS = [
  {
    id: 'seferberlik', i: '📯', ad: () => L('Seferberlik ilan et', 'Call the banners'),
    d: p => L(`Vasallarının adamları hemen orduna katılır (+${fmtCount(mobilizeSize(p))} asker). 150💰, vasallar -8. 6 ayda bir.`, `Your vassals' men join your army at once (+${fmtCount(mobilizeSize(p))} troops). 150💰, vassals -8. Every 6 months.`),
    show: p => !!natOfRealm(ownRealm(p)),
    req: p => firstReq(goldReq(p, 150), cooldown('seferberlik') ? L(`${cooldown('seferberlik')} ay bekle`, `Wait ${cooldown('seferberlik')} months`) : null),
    run(p) {
      p.gold -= 150; setCooldown('seferberlik', 6);
      const n = natOfRealm(ownRealm(p)), add = mobilizeSize(p);
      n.troops += add;
      vassalsOf(p).forEach(v => addOp(v, p, -8));
      return L(`Sancaklar açıldı! Vasalların ${fmtCount(add)} asker gönderdi.`, `The banners are called! Your vassals sent ${fmtCount(add)} troops.`);
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
function mobilizeSize(p) { const n = natOfRealm(ownRealm(p)); return n ? Math.round(maxTroops(n) * (0.12 + law().yukumluluk * 0.04) + vassalsOf(p).length * 300) : 0; }
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
  refreshLieges(); G.terrDirty = true;
  return L(`Darbe başarısız oldu. Gece karanlığında sınırdan kaçtın; toprakların ve unvanların elinden alındı. Artık sürgündesin.`, `The coup failed. You fled across the border under cover of night; your lands and titles were stripped. You are an exile now.`);
}

/* ---------- Aylık krallık işleyişi ---------- */
function realmMonth() {
  loanTick();
  const p = P();
  // Meclis maaşları
  if (ownRealm(p) && G.council) {
    const n = Object.keys(G.council).filter(k => councilor(k)).length;
    if (n) p.gold = Math.max(0, p.gold - n * 3);
    const ch_ = councilor('ruhani');
    if (ch_) p.prestige += 1 + Math.floor(stat(ch_, 'dip') / 5);
  }
  if (p.office === 'komutan') {
    const l = ch(p.lordId);
    if (!l || !free(l) || ownRealm(p) || !realmOf(p)) p.office = null;
    else { const sal = 15; if (l.gold >= sal) { l.gold -= sal; p.gold += sal; } }
  }
}
