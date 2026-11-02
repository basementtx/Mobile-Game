'use strict';
/* =========================================================
   Crown & Dagger — Savaş (Age of History tarzı)
   İki ordu turlar hâlinde çarpışır; her turda iki tarafın gücü,
   komutanı, birlik seviyeleri ve (kuşatmada) surlar kayıpları belirler.
   Sonuç, eski savaş ekranıyla aynı biçimde o.onEnd(sonuç) ile bildirilir.
   ========================================================= */

let BT = null;
const BATTLE_ROUNDS = 8;
const BATTLE_ROUND_MS = 950;

const troopSum = t => Object.values(t).reduce((a, b) => a + b, 0);
function troopPower(t) { let s = 0; for (const k in t) s += t[k] * TROOPS[k].str; return s; }
const hasClass = (t, cls) => Object.keys(t).some(k => t[k] > 0 && TROOPS[k].sinif === cls);

/* o: { A: oyuncu ordusu, enemy: {troops, leaderId, name}, siege: yerleşim|null, onEnd(sonuç) } */
function startBattle(o) {
  const p = P(), lc = o.enemy.leaderId != null ? ch(o.enemy.leaderId) : null;
  const er = lc ? realmOf(lc) : o.siege && o.siege.liege ? G.titles[o.siege.liege] : null;
  const side = (troops, lead, name, col) => ({ troops: Object.assign({}, troops), init: Object.assign({}, troops), lead, name, col, n0: troopSum(troops) });
  BT = {
    o, round: 0, over: false, result: null, log: [],
    A: side(o.A.troops, p, nm(p), '#ffcf4a'),
    E: side(o.enemy.troops, lc, o.enemy.name, er ? er.color : '#8a8070'),
    place: o.siege ? o.siege.name : provName(partyProv(o.A)),
  };
  BT.log.push(o.siege
    ? L(`Merdivenler surlara dayandı. ${o.siege.name} savunucuları mevzide.`, `Ladders are raised against the walls. The defenders of ${o.siege.name} stand ready.`)
    : L(`İki ordu ${BT.place} ovasında karşı karşıya.`, `The two armies face each other at ${BT.place}.`));
  showModal('<div class="battle"></div>', 'event');
  renderBattle();
  BT.timer = setInterval(battleRound, BATTLE_ROUND_MS);
}

/* Bir tarafın kayıpları: düşük seviyeli birlikler daha çok kayıp verir */
function inflict(side, frac) {
  for (const k of Object.keys(side.troops)) {
    const n = side.troops[k];
    if (!n) continue;
    const w = 1.3 - TROOPS[k].tier * 0.12;
    let l = n * frac * w * (0.75 + Math.random() * 0.5);
    l = Math.floor(l) + (Math.random() < l % 1 ? 1 : 0);
    side.troops[k] = Math.max(0, n - Math.min(n, l));
  }
}
function sideStrength(s, other, isDef) {
  const c = s.lead, sav = c ? stat(c, 'sav') : 4;
  let pw = troopPower(s.troops) * (1 + sav / 35);
  if (isDef && BT.o.siege) pw *= 1.6; // surlar
  return pw * (0.85 + Math.random() * 0.3);
}
function battleRound() {
  if (!BT || BT.over || UI.modal !== 'event') return;
  BT.round++;
  const { A, E } = BT;
  const pa = sideStrength(A, E, false), pe = sideStrength(E, A, true);
  const fa = clamp(0.1 * pe / Math.max(1, pa), 0.015, 0.3), fe = clamp(0.1 * pa / Math.max(1, pe), 0.015, 0.3);
  inflict(A, fa); inflict(E, fe);
  // Turun olayı
  const r = BT.round, lines = [];
  const ahead = pa > pe * 1.15, behind = pe > pa * 1.15;
  if (r <= 2 && (hasClass(A.troops, 'okcu') || A.troops.atliokcu)) lines.push(r === 1 ? L('Okçuların gökyüzünü karartan bir ok yağmuru gönderdi.', 'Your archers loose a volley that darkens the sky.') : L('İkinci ok yağmuru düşman saflarında boşluklar açtı.', 'A second volley tears gaps in the enemy ranks.'));
  else if (r <= 2 && (hasClass(E.troops, 'okcu') || E.troops.atliokcu)) lines.push(L('Düşman okları saflarına yağıyor.', 'Enemy arrows rain down on your ranks.'));
  else if (r >= 2 && r <= 4 && hasClass(A.troops, 'atli') && ahead) lines.push(L('Süvarilerin düşmanın kanadına daldı!', 'Your cavalry crashes into the enemy flank!'));
  else if (r >= 2 && r <= 4 && hasClass(E.troops, 'atli') && behind) lines.push(L('Düşman süvarisi hatlarını yarıyor!', 'Enemy horsemen break through your line!'));
  else if (BT.o.siege) lines.push(ahead ? L('Askerlerin surlara tırmanıyor.', 'Your soldiers scale the walls.') : L('Savunucular kaynar yağ döküyor.', 'The defenders pour boiling oil.'));
  else lines.push(ahead ? L('Hatların ilerliyor, düşman geri çekiliyor.', 'Your line pushes forward; the enemy gives ground.') : behind ? L('Askerlerin ağır baskı altında.', 'Your soldiers are under heavy pressure.') : L('Kılıçlar çarpışıyor; iki taraf da direniyor.', 'Steel clashes; neither side yields.'));
  BT.log.push(`${L('Tur', 'Round')} ${r}: ${lines[0]}`);
  // Moral ve bitiş
  const na = troopSum(A.troops), ne = troopSum(E.troops);
  const brokeA = na < A.n0 * 0.35 || na === 0, brokeE = ne < E.n0 * 0.35 || ne === 0;
  if (brokeE && !brokeA) return finishBattle(true, false);
  if (brokeA && !brokeE) return finishBattle(false, false);
  if (brokeA && brokeE) return finishBattle(troopPower(A.troops) >= troopPower(E.troops), false);
  if (r >= BATTLE_ROUNDS) return finishBattle(troopPower(A.troops) * 1.0 >= troopPower(E.troops) * (BT.o.siege ? 1.25 : 1), false);
  renderBattle();
}
function finishBattle(won, retreated) {
  if (!BT || BT.over) return;
  clearInterval(BT.timer);
  BT.over = true;
  const { A, E } = BT;
  if (retreated) inflict(A, 0.1);
  else {
    // Kaçan taraf takipte ek kayıp verir
    const loser = won ? E : A;
    for (const k in loser.troops) loser.troops[k] = Math.max(0, loser.troops[k] - Math.round(loser.troops[k] * 0.3));
  }
  const loss = s => { const out = {}; for (const k in s.init) { const d = s.init[k] - (s.troops[k] || 0); if (d > 0) out[k] = d; } return out; };
  const heroDown = !won && !retreated && chance(0.35);
  const leaderDown = won && !!E.lead && chance(0.35);
  BT.result = { won, retreated: !!retreated, lossA: loss(A), lossB: loss(E), heroDown, leaderDown };
  BT.log.push(retreated ? L('Geri çekilme borusu çaldı.', 'You sound the retreat.')
    : won ? L('Düşman bozguna uğradı ve kaçıyor!', 'The enemy is routed and flees!') : L('Askerlerin dağılıyor!', 'Your army breaks and scatters!'));
  const notes = BT.o.onEnd(BT.result) || [];
  BT.notes = notes;
  renderBattle();
  saveGame();
}
function retreatBattle() { if (BT && !BT.over) finishBattle(false, true); }
function closeBattle() {
  const r = BT ? BT.result : null;
  BT = null;
  closeModal();
  if (G.over) return renderGameOver();
  updateHUD();
  processQueue();
  return r;
}

/* ---------- Görünüm ---------- */
function battleSideHtml(s, mine) {
  const n = troopSum(s.troops), pct = s.n0 ? n / s.n0 * 100 : 0;
  const rows = Object.keys(s.init).filter(k => s.init[k] > 0).sort((a, b) => TROOPS[b].tier - TROOPS[a].tier)
    .map(k => `<div class="bunit"><span class="bi">${TROOPS[k].ikon}</span><span class="bn">${TROOPS[k].ad} ${tierBadge(k)}</span><b>${s.troops[k] || 0}</b><small>/${s.init[k]}</small></div>`).join('');
  return `<div class="bside ${mine ? 'mine' : 'foe'}">
    <div class="bhead"><i class="sw" style="background:${s.col}"></i><span><b>${esc(s.name)}</b><small>${s.lead ? `${L('Komutan', 'Commander')}: ${esc(s.lead.name)} · ⚔️ ${stat(s.lead, 'sav')}` : L('Komutansız', 'No commander')}</small></span></div>
    <div class="bcount"><b>${n}</b><small>/ ${s.n0} ${L('asker', 'men')}</small></div>
    <div class="bbar"><div style="width:${pct.toFixed(1)}%;background:${s.col}"></div></div>
    <div class="bunits">${rows}</div></div>`;
}
function renderBattle() {
  if (!BT) return;
  const panel = $('#modal .battle');
  if (!panel) return;
  const { A, E } = BT, r = BT.result;
  const pa = troopPower(A.troops), pe = troopPower(E.troops) * (BT.o.siege ? 1.6 : 1);
  const share = pa + pe > 0 ? pa / (pa + pe) * 100 : 50;
  const title = BT.o.siege ? L(`🔥 ${esc(BT.place)} kuşatması`, `🔥 Siege of ${esc(BT.place)}`) : L(`⚔️ ${esc(BT.place)} muharebesi`, `⚔️ Battle of ${esc(BT.place)}`);
  let foot;
  if (!BT.over) foot = `<div class="bround">${L('Tur', 'Round')} ${BT.round}/${BATTLE_ROUNDS}</div><button class="opt" data-retreat>🏳️ ${L('Geri çekil', 'Retreat')}</button>`;
  else {
    const head = r.retreated ? `<b class="mid">🏳️ ${L('Geri çekildin', 'You retreated')}</b>` : r.won ? `<b class="good">🏆 ${L('Zafer!', 'Victory!')}</b>` : `<b class="bad">💀 ${L('Yenilgi', 'Defeat')}</b>`;
    foot = `<div class="bres">${head}<span>${L('Kayıpların', 'Your losses')}: ${lossText(r.lossA)} · ${L('Düşman kayıpları', 'Enemy losses')}: ${lossText(r.lossB)}</span>
      ${r.heroDown ? `<span class="bad">${L('Ağır yaralandın. (Sağlık -35)', 'You were badly wounded. (Health -35)')}</span>` : ''}${(BT.notes || []).map(x => `<span>${x}</span>`).join('')}</div>
      <button class="opt primary" data-bclose>${L('Devam', 'Continue')}</button>`;
  }
  panel.innerHTML = `<h2>${title}</h2>
    <div class="bfront"><div style="width:${share.toFixed(1)}%"></div><span>${L('Cephe', 'Front')}</span></div>
    <div class="bsides">${battleSideHtml(A, true)}<div class="bvs">⚔</div>${battleSideHtml(E, false)}</div>
    <div class="blog">${BT.log.slice(-3).map((l, i, a) => `<p class="${i === a.length - 1 ? 'new' : ''}">${l}</p>`).join('')}</div>
    <div class="bfoot">${foot}</div>`;
  const rt = panel.querySelector('[data-retreat]'); if (rt) rt.onclick = retreatBattle;
  const cl = panel.querySelector('[data-bclose]'); if (cl) cl.onclick = closeBattle;
}
