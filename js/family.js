'use strict';
/* =========================================================
   Crown & Dagger — Aile: soy ağacı, gebelikler, sevgililer,
   piç çocuklar, evlilik ayarlama; saray halkı ve meslekler
   ========================================================= */

/* ---------- Meslekler (topraksız saray halkı ve sokaklar) ---------- */
const JOBS = biEach({
  hizmetci: { ad: BL('Hizmetkâr', 'Servant'), i: '🧺' },
  asci: { ad: BL('Aşçı', 'Cook'), i: '🍗' },
  seyis: { ad: BL('Seyis', 'Groom'), i: '🐎' },
  muhafiz: { ad: BL('Saray muhafızı', 'Palace guard'), i: '🛡️' },
  ozan: { ad: BL('Ozan', 'Minstrel'), i: '🎭' },
  bahcivan: { ad: BL('Bahçıvan', 'Gardener'), i: '🌹' },
  katip: { ad: BL('Kâtip', 'Scribe'), i: '📜' },
  hekim: { ad: BL('Saray hekimi', 'Court physician'), i: '🧪' },
  dadi: { ad: BL('Dadı', 'Nursemaid'), i: '🍼' },
  sakî: { ad: BL('Sâkî (içki sunan)', 'Cupbearer'), i: '🍷' },
  dansci: { ad: BL('Dansçı', 'Dancer'), i: '🎭' },
  tuccar: { ad: BL('Tüccar', 'Merchant'), i: '💰' },
  dilenci: { ad: BL('Dilenci', 'Beggar'), i: '🤲' },
  capulcu: { ad: BL('Çapulcu', 'Ruffian'), i: '🗡️' },
  kumarbaz: { ad: BL('Kumarbaz', 'Gambler'), i: '🎲' },
});
const COURT_JOBS = ['hizmetci', 'asci', 'seyis', 'muhafiz', 'ozan', 'bahcivan', 'katip', 'hekim', 'dadi', 'sakî', 'dansci'];
const STREET_JOBS = ['tuccar', 'dilenci', 'capulcu', 'kumarbaz', 'hizmetci', 'seyis'];
const jobName = c => (c.job && JOBS[c.job] ? JOBS[c.job].ad : null);
/* Hükümdarın sarayına hizmetkârlar yerleştir */
function spawnCourtStaff(lord, n) {
  const jobs = shuffle(COURT_JOBS.slice()).slice(0, n);
  for (const job of jobs) {
    const female = ['dadi', 'dansci'].includes(job) ? chance(0.85) : ['muhafiz', 'seyis'].includes(job) ? chance(0.1) : chance(0.45);
    const c = makeChar({ cul: lord.cul, rank: job === 'muhafiz' || job === 'hekim' || job === 'katip' ? 1 : 0, female, age: rnd(18, 44), gold: rnd(2, 15), lordId: lord.id });
    c.job = job;
  }
}

/* Oyuncunun soyu: ölü büyükanne ve büyükbabalar, önceki hükümdar baba, anne ve kardeşler */
function makeAncestry(p) {
  const kill = (c, yearsAgo, reason) => { c.alive = false; c.death = { reason, d: String(G.year - yearsAgo), age: c.age, mi: monthIndex() - yearsAgo * 12 }; };
  const link = (kid, fa, mo) => { kid.fatherId = fa.id; kid.motherId = mo.id; fa.children.push(kid.id); mo.children.push(kid.id); };
  const pair = (dyn, age, rank) => {
    const fa = makeChar({ cul: p.cul, dyn, female: false, age, rank }), mo = makeChar({ cul: p.cul, female: true, age: age - rnd(0, 6), rank: 2 });
    fa.spouseId = mo.id; mo.spouseId = fa.id; return [fa, mo];
  };
  const [fa, mo] = pair(p.dyn, p.age + rnd(24, 34), 5);
  const [gf1, gm1] = pair(p.dyn, fa.age + rnd(22, 30), 5);
  const [gf2, gm2] = pair(pick(CULTURES[p.cul].d), mo.age + rnd(20, 30), 4);
  link(fa, gf1, gm1); link(mo, gf2, gm2);
  link(p, fa, mo);
  const ago = rnd(1, 4);
  kill(fa, ago, pick(L(['Ateşli bir hastalık', 'Av kazası', 'Yaşlılık', 'Savaşta aldığı yaralar'], ['A burning fever', 'A hunting accident', 'Old age', 'Wounds taken in war'])));
  for (const g of [gf1, gm1, gf2, gm2]) kill(g, rnd(ago + 2, 25), L('Yaşlılık', 'Old age'));
  fa.age -= ago; fa.death.age = fa.age;
  if (chance(0.65) && mo.age < 72) { mo.spouseId = null; mo.lordId = p.id; addOp(mo, p, rnd(20, 50)); }
  else kill(mo, rnd(0, 6), pick(L(['Doğumda öldü', 'Veba'], ['Died in childbirth', 'Plague'])));
  if (!mo.alive) mo.spouseId = fa.id;
  const n = rnd(1, 3);
  for (let i = 0; i < n; i++) {
    const age = clamp(p.age + rnd(-9, 7), 14, mo.age - 17);
    const sib = makeChar({ cul: p.cul, dyn: p.dyn, age, rank: 2, gold: rnd(10, 60), prestige: rnd(20, 80), lordId: p.id, traits: inheritTraits(mo, fa) });
    link(sib, fa, mo);
    addOp(sib, p, rnd(-25, 35));
  }
}

/* ---------- Aile çekmecesi ---------- */
function famNode(c, p, note) {
  if (!c) return `<div class="fnode empty"><span>?</span></div>`;
  const badges = [];
  if (c.id === p.id) badges.push(`<i class="fb me">${L('Sen', 'You')}</i>`);
  if (heirOf(p) && heirOf(p).id === c.id) badges.push(`<i class="fb heir">${L('Varis', 'Heir')}</i>`);
  if (c.bastard) badges.push(`<i class="fb bas">${L('Piç', 'Bastard')}</i>`);
  if (c.preg) badges.push(`<i class="fb preg">${L('Hamile', 'Expecting')}</i>`);
  if (!c.alive) badges.push(`<i class="fb dead">†</i>`);
  return `<button class="fnode ${c.alive ? '' : 'dead'} ${c.id === p.id ? 'self' : ''}" data-open="${c.id}">${avatar(c, 46)}<b>${esc(c.name)}</b><small>${c.alive ? c.age + ' ' + L('yaş', 'yrs') : (c.death ? c.death.d : '†')}${note ? ' · ' + note : ''}</small><span class="fbs">${badges.join('')}</span></button>`;
}
function kidsOf(c) { return c.children.map(ch).filter(k => k && (k.fatherId === c.id || k.motherId === c.id || k.realFatherId === c.id)); }
function tabAile(p) {
  const f = ch(p.fatherId), m = ch(p.motherId), sp = ch(p.spouseId);
  const gp = [f && ch(f.fatherId), f && ch(f.motherId), m && ch(m.fatherId), m && ch(m.motherId)];
  const sibs = living().concat(Object.values(G.chars).filter(c => !c.alive)).filter(c => c.id !== p.id && familyRel(p, c) === 'kardes');
  const kids = kidsOf(p).sort((a, b) => b.age - a.age);
  const grand = kids.flatMap(k => kidsOf(k));
  const dynLive = living().filter(c => c.dyn === p.dyn).length;
  const heir = heirOf(p);
  // Gebelikler
  const pregs = living().filter(x => x.preg && (x.id === p.id || x.preg.f === p.id || x.spouseId === p.id || familyRel(p, x)));
  let html = `<div class="ck-card famhead"><div><small class="eyebrow">${L('Hanedan', 'Dynasty')}</small><h2>${L(`${esc(p.dyn)} Hanedanı`, `House ${esc(p.dyn)}`)}</h2>
    <p class="small muted">${L(`${dynLive} yaşayan üye · ${G.generation}. nesil · kurucu ${esc(G.founder)}`, `${dynLive} living members · generation ${G.generation} · founded by ${esc(G.founder)}`)}</p></div>
    <div class="famheir"><small class="eyebrow">${L('Varis', 'Heir')}</small>${heir ? `<a data-open="${heir.id}">${esc(nm(heir))}</a> (${heir.age})` : `<b class="bad">${L('YOK', 'NONE')}</b>`}</div></div>`;
  if (pregs.length) html += `<div class="ck-card"><small class="eyebrow">👶 ${L('Gebelikler', 'Pregnancies')}</small>${pregs.map(x => {
    const fa = ch(x.preg.f), left = Math.max(0, x.preg.due - monthIndex());
    const showF = x.id === p.id || x.preg.f === p.id || x.preg.f === x.spouseId;
    return `<p class="rel-line"><a data-open="${x.id}">${esc(nm(x))}</a> · ${L('baba', 'father')}: ${showF && fa ? `<a data-open="${fa.id}">${esc(nm(fa))}</a>` : '?'} · ${L(`~${left} ay kaldı`, `~${left} months left`)}${x.preg.f === p.id && x.spouseId && x.spouseId !== p.id ? ` <span class="tag secret">${L('gizli', 'secret')}</span>` : ''}</p>`;
  }).join('')}</div>`;
  html += `<h3>🌳 ${L('Soy ağacı', 'Family tree')}</h3><div class="ftree">
    ${gp.some(Boolean) ? `<div class="frow"><span class="flabel">${L('Büyükanne ve büyükbabalar', 'Grandparents')}</span><div class="fnodes">${gp.map(c => famNode(c, p)).join('')}</div></div>` : ''}
    <div class="frow"><span class="flabel">${L('Anne ve baba', 'Parents')}</span><div class="fnodes">${famNode(f, p, L('baba', 'father'))}${famNode(m, p, L('anne', 'mother'))}</div></div>
    <div class="frow mid"><span class="flabel">${L('Sen, eşin ve kardeşlerin', 'You, spouse and siblings')}</span><div class="fnodes">${famNode(p, p)}${sp ? famNode(sp, p, L('eş', 'spouse')) : `<div class="fnode empty"><span>💍</span><small>${L('Eşin yok', 'Unwed')}</small></div>`}${sibs.map(c => famNode(c, p, L('kardeş', 'sibling'))).join('')}</div></div>
    <div class="frow"><span class="flabel">${L('Çocukların', 'Children')} (${kids.length})</span><div class="fnodes">${kids.length ? kids.map(k => `<div class="fkid">${famNode(k, p, k.motherId === p.id || k.fatherId === p.id ? '' : L('gerçek babası sensin', 'you are the true father'))}${k.spouseId ? `<small class="fsp">💍 <a data-open="${k.spouseId}">${esc(ch(k.spouseId).name)}</a></small>` : isGrown(k) && k.alive && !k.prisonerOf ? `<button class="fmatch" data-match="${k.id}">💍 ${L('Evlilik ayarla', 'Arrange marriage')}</button>` : ''}</div>`).join('') : `<p class="small muted">${L('Henüz çocuğun yok.', 'No children yet.')}</p>`}</div></div>
    ${grand.length ? `<div class="frow"><span class="flabel">${L('Torunların', 'Grandchildren')}</span><div class="fnodes">${grand.map(c => famNode(c, p)).join('')}</div></div>` : ''}</div>`;
  const lovers = p.lovers.map(ch).filter(Boolean);
  html += `<h3>🌹 ${L('Sevgililer', 'Lovers')}</h3>${lovers.length ? lovers.map(l => {
    const n = kidsOf(p).filter(k => k.motherId === l.id || k.fatherId === l.id || k.realFatherId === l.id).length;
    return `<div class="dipl2"><button class="dp-pt" data-open="${l.id}">${avatar(l, 38)}</button><span class="dn"><b>${esc(nm(l))}</b><small>${esc(titleOf(l))} · ${l.age}${n ? ' · ' + L(`${n} çocuğunuz var`, `${n} child${n > 1 ? 'ren' : ''} together`) : ''}${l.spouseId ? ' · ' + L('evli', 'married') : ''}</small></span>${opBadge(opinion(l, p))}
      <span class="ab"><button data-night="${l.id}" title="${L('Mahrem gece', 'Intimate night')}" ${bedReq(p, l) ? 'disabled' : ''}>🌙</button></span></div>`;
  }).join('') : `<p class="small muted">${L('Sevgilin yok.', 'You have no lovers.')}</p>`}`;
  if (sp && isGrown(sp)) html += `<button class="wide" data-night="${sp.id}" ${bedReq(p, sp) ? 'disabled' : ''}>🌙 ${L(`${esc(sp.name)} ile bir gece geçir (çocuk sahibi olmayı dene)`, `Spend a night with ${esc(sp.name)} (try for a child)`)}</button>`;
  html += intimacyCard(p);
  return html;
}
function bindFamily(root) {
  root.querySelectorAll('[data-night]').forEach(b => b.onclick = () => { closeDrawer(); openIntimacy(+b.dataset.night); if (NIGHT) { NIGHT.child = 'iste'; renderIntimacy(); } });
  root.querySelectorAll('[data-match]').forEach(b => b.onclick = () => openMatchPicker(+b.dataset.match));
}

/* ---------- Evlilik ayarlama ---------- */
function matchCands(k) {
  return living().filter(x => isGrown(x) && !x.spouseId && x.female !== k.female && !closeKin(k, x) && !x.prisonerOf && x.id !== G.playerId && Math.abs(x.age - k.age) <= 15)
    .sort((a, b) => b.rank - a.rank || b.prestige - a.prestige).slice(0, 30);
}
function matchChance(p, k, x) {
  const l = ch(x.lordId), head = x.titles.length ? x : l || x;
  return pct(30 + opinion(x, p) / 3 + (head !== x ? opinion(head, p) / 3 : 0) + (p.rank - x.rank) * 9 + p.prestige / 40 + (stat(p, 'dip') - 5) * 2 + (has(k, 'guzel') ? 8 : 0));
}
function openMatchPicker(kid) {
  const p = P(), k = ch(kid), cands = matchCands(k);
  showModal(`<div class="sheet"><button class="x" data-close>✕</button><h2>💍 ${L(`${esc(k.name)} için eş`, `A match for ${esc(k.name)}`)}</h2>
    <p class="small muted">${L('Yüksek rütbeli bir evlilik şan ve ittifak getirir. Teklif 1⚡ harcar.', 'A high-born match brings prestige and allies. A proposal costs 1⚡.')}</p>
    ${cands.length ? cands.map(x => { const r = realmOf(x); return `<button class="person" data-pick="${x.id}" ${G.ap < 1 ? 'disabled' : ''}>${avatar(x)}<div class="pi"><b>${esc(nm(x))}</b><small>${r ? flagHtml(r, 11) + esc(realmShort(r)) + ' · ' : ''}${esc(titleOf(x))} · ${x.age}</small><div class="tags">${traitChips(x)}</div></div><b class="${matchChance(p, k, x) >= 50 ? 'good' : 'mid'}">%${matchChance(p, k, x)}</b></button>`; }).join('') : `<p class="muted">${L('Uygun aday yok.', 'No suitable match.')}</p>`}</div>`, 'menu');
  const m = $('#modal');
  m.querySelector('[data-close]').onclick = () => { closeModal(); openDrawer('aile'); };
  m.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
    const x = ch(+b.dataset.pick);
    if (G.ap < 1) return;
    G.ap -= 1;
    let msg;
    if (chance(matchChance(p, k, x) / 100)) {
      marry(k, x); p.prestige += 10 + x.rank * 8;
      const head = ownRealm(x) ? x : ch(realmOf(x) ? realmOf(x).holder : null);
      if (head && head.id !== p.id) addOp(head, p, 15);
      msg = L(`💍 ${nm(k)} ile ${nm(x)} evlendi! Düğün şenlikleri günlerce sürdü. (Şan +${10 + x.rank * 8})`, `💍 ${nm(k)} married ${nm(x)}! The wedding feasts lasted for days. (Prestige +${10 + x.rank * 8})`);
    } else { addOp(x, p, -5); msg = L(`${nm(x)} tarafı teklifi kibarca geri çevirdi.`, `The family of ${nm(x)} politely declined.`); }
    log(msg, 'player'); saveGame();
    resultModal(msg);
  });
}
