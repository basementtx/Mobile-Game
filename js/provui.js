'use strict';
/* =========================================================
   Crown & Dagger — İl paneli (CK3 tarzı, solda sabit)
   Haritada bir ile dokununca açılır; o ilde yapılabilecek her şey
   burada listelenir. Denize ya da aynı ile yeniden dokununca kapanır.
   ========================================================= */

function selectProvince(id) {
  if (id == null || !PROV[id]) return closeProv();
  UI.selProv = id; UI.provOpen = true;
  renderProv(true);
}
function closeProv() {
  UI.provOpen = false; UI.selProv = null;
  const el = $('#prov');
  if (el) { el.classList.add('hidden'); el._h = null; }
}
function hidePopup() { closeProv(); }
function refreshPanels() {
  if (UI.modal === 'realm') renderRealm();
  if (UI.drawer) renderDrawer();
  renderProv(true);
  updateHUD();
}
function renderProv(force) {
  const el = $('#prov');
  if (!el) return;
  if (!G || !UI.provOpen || UI.selProv == null || !PROV[UI.selProv]) { el.classList.add('hidden'); return; }
  const pv = PROV[UI.selProv];
  const acts = provActions(pv);
  if (force) el._h = null;
  if (setHTML(el, provPanelHtml(pv, acts))) bindProv(el, acts);
  el.classList.remove('hidden');
}
const poolTotal = s => Object.values(s.pool || {}).reduce((a, b) => a + b, 0);
const shortName = c => `${c.name} ${c.dyn}`;
function provHeadline(pv, s) {
  if (!s) {
    const lat = MAP.LAT1 - pv.y;
    return lat < 31 ? L('Kurak topraklar', 'Arid land') : lat > 59 ? L('Kuzey ormanları', 'Northern forests') : L('Kimsenin toprağı değil', 'Unclaimed land');
  }
  if (pv.sett >= 0) return (s.kind === 'sehir' ? L('Şehir', 'City') : L('Kale', 'Castle')) + (s.capital ? ' · ' + L('Başkent', 'Capital') : '');
  return L(`${s.name} bölgesi`, `Region of ${s.name}`);
}
function provPanelHtml(pv, acts) {
  const p = P(), s = provSettlement(pv), h = s ? ch(s.holder) : null;
  const r = s && s.liege && G.titles[s.liege] && !G.titles[s.liege].dead ? G.titles[s.liege] : null;
  const hostile = h && hostileChars(p, h);
  let html = `<div class="pv-head" style="--rc:${r ? r.color : '#6e6a62'}">
    <span class="pv-flag">${flagHtml(r, 30)}</span>
    <div class="pv-tt"><b>${esc(provName(pv))}</b><small>${esc(provHeadline(pv, s))}${r ? ' · ' + esc(realmShort(r)) : ''}</small></div>
    <button class="pv-x" data-pvx aria-label="${L('Kapat', 'Close')}">✕</button></div><div class="pv-body">`;
  if (h) {
    html += `<button class="pv-holder" data-open="${h.id}">${avatar(h, 46)}<span class="ph"><small>${h.id === p.id ? L('Senin toprağın', 'Your holding') : L('Sahibi', 'Holder')}</small><b>${esc(nm(h))}</b><em>${esc(titleOf(h))}</em></span>${h.id !== p.id ? opBadge(opinion(h, p)) : ''}</button>`;
    const tags = [];
    if (hostile) tags.push(`<span class="tag enemy">⚔️ ${L('Savaştasınız', 'At war')}</span>`);
    else if (h.id !== p.id && r && r === realmOf(p)) tags.push(`<span class="tag vas">${L('Krallığında', 'Your realm')}</span>`);
    else if (r && allied(r, realmOf(p))) tags.push(`<span class="tag friend">🤝 ${L('Müttefik', 'Ally')}</span>`);
    if (s.siege) tags.push(`<span class="tag enemy">🔥 ${L('Kuşatma altında', 'Under siege')}${s.siege.by === (playerParty() || {}).id ? ` · ${s.siege.days} ${L('gün', 'd')}` : ''}</span>`);
    if (tags.length) html += `<div class="tags pv-tags">${tags.join('')}</div>`;
  }
  html += `<h4>${L('Seçenekler', 'Options')}</h4>`;
  if (G.turnLeft > 0) html += `<p class="small muted">⏳ ${L('Tur işlerken emir verilemez.', 'No orders while the turn resolves.')}</p>`;
  else if (acts.length) html += `<div class="pv-acts">${acts.map((a, i) => `<button class="pv-act ${a.cls || ''}" data-pa="${i}" ${a.why ? 'disabled' : ''}><span class="ai">${a.i}</span><span class="al">${esc(a.l)}${a.sub ? `<small>${a.sub}</small>` : ''}${a.why ? `<em>${esc(a.why)}</em>` : ''}</span></button>`).join('')}</div>`;
  else html += `<p class="small muted">${L('Burada yapabileceğin bir şey yok.', 'There is nothing you can do here.')}</p>`;
  html += `<h4>${L('Ayrıntılar', 'Details')}</h4>`;
  if (s) {
    const inc = settIncome(s, h || p);
    const u = Math.round(s.unrest || 0);
    html += `<div class="pv-stats">
      <div><small>${L('Garnizon', 'Garrison')}</small><b>${s.garrison}<i>/${garrisonMax(s)}</i></b></div>
      <div><small>${L('Gelir', 'Income')}</small><b>${inc >= 0 ? '+' : ''}${inc}💰</b></div>
      <div><small>${L('Refah', 'Prosperity')}</small><b>${Math.round((s.prosperity || 1) * 100)}%</b></div>
      <div><small>${L('Huzursuzluk', 'Unrest')}</small><b class="${unrestCls(u)}">${u}%</b></div>
      <div><small>${L('Nüfus', 'Pop.')}</small><b>${Math.round(s.pop || 0)}k</b></div>
      <div><small>${L('Surlar', 'Walls')}</small><b>${ROMAN[bl(s, 'sur')] || '—'}</b></div></div>`;
    const bi = bIcons(s);
    if (bi || s.q) html += `<div class="bicons pv-b">${bi}${s.q ? `<span class="bico q">🏗️ ${esc(BUILDINGS[s.q.k].ad(s))} · ${s.q.left}${L('g', 'd')}</span>` : ''}</div>`;
  }
  const armies = (armiesByProvince().get(pv.id) || []).filter(pt => armyActive(pt));
  if (armies.length) {
    const pp = playerParty();
    html += `<div class="pv-armies">${armies.sort((a, b) => (b.kind === 'player') - (a.kind === 'player') || troopCount(b) - troopCount(a)).map(pt => {
      const isMe = pt.kind === 'player', c = ch(pt.owner), rr = c ? realmOf(c) : null;
      const foe = !isMe && pp && hostileParties(pp, pt);
      return `<div class="aline ${isMe ? 'me' : ''} ${foe ? 'foe' : ''}">${pt.kind === 'bandit' ? '<i class="sw" style="background:#2a2420"></i>' : flagHtml(isMe ? realmOf(P()) : rr, 12)}
        <span class="an"><b>${esc(armyName(pt))}</b><small>${troopCount(pt)} ${L('asker', 'men')} · ${L('güç', 'str.')} ${partyPower(pt)}${!isMe ? ' · ' + modeName(pt.mode) : ''}</small></span></div>`;
    }).join('')}</div>`;
  }
  return html + '</div>';
}
function modeName(m) {
  return { siege: L('Kuşatmada', 'Besieging'), chase: L('Birini kovalıyor', 'Chasing'), flee: L('Kaçıyor', 'Fleeing'), home: L('Evine dönüyor', 'Returning home'), patrol: L('Devriyede', 'Patrolling'), wander: L('Av arıyor', 'Looking for prey') }[m] || L('Bekliyor', 'Waiting');
}
function bindProv(el, acts) {
  el.querySelector('[data-pvx]').onclick = closeProv;
  el.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openSheet(+b.dataset.open));
  el.querySelectorAll('[data-pa]').forEach(b => b.onclick = () => {
    const a = acts[+b.dataset.pa];
    if (!a || a.why || G.turnLeft > 0) return;
    a.run();
    saveGame();
    renderProv(true); updateHUD();
  });
  bindTips(el);
}
/* Bu ilde yapılabilecekler */
function provActions(pv) {
  const p = P(), pp = playerParty(), acts = [];
  if (!p || G.over) return acts;
  const s = provSettlement(pv), h = s ? ch(s.holder) : null;
  const r = s && s.liege && G.titles[s.liege] && !G.titles[s.liege].dead ? G.titles[s.liege] : null;
  const myR = ownRealm(p), pr = realmOf(p);
  const mine = !!s && s.holder === p.id;
  const ours = !!s && !mine && !!h && !!pr && r === pr;
  const hostile = !!h && hostileChars(p, h);
  const jail = p.prisonerOf ? L('Zindandasın', 'You are imprisoned') : null;
  const apReq = n => (G.ap < n ? L('Bu ay vaktin kalmadı', 'No time left this month') : null);
  const add = o => acts.push(o);
  if (mine) {
    add({ i: '🏗️', l: L('Binalar ve vergi', 'Buildings and taxes'), sub: s.q ? L(`İnşaat: ${BUILDINGS[s.q.k].ad(s)} (${s.q.left} gün)`, `Building: ${BUILDINGS[s.q.k].ad(s)} (${s.q.left} days)`) : L(`Vergi: ${TAX_NAMES()[s.tax ?? 1]} · inşa et, geliştir`, `Tax: ${TAX_NAMES()[s.tax ?? 1]} · build and improve`), run: () => { UI.hold = s.id; openDrawer('hold'); } });
    add({ i: '🛡️', l: L('Asker topla', 'Raise troops'), sub: L(`Havuzda ${poolTotal(s)} asker · ordu ${pp ? troopCount(pp) : 0}/${partyCap(p)}`, `${poolTotal(s)} men available · army ${pp ? troopCount(pp) : 0}/${partyCap(p)}`), why: jail, run: () => openSettlement(s) });
    add({ i: '🏯', l: L('Garnizonu güçlendir', 'Reinforce the garrison'), sub: '+10 · 100💰', why: s.garrison + 10 > garrisonMax(s) ? L('Garnizon dolu', 'Garrison is full') : goldReq(p, 100), run: () => { p.gold -= 100; s.garrison += 10; toast(L(`${s.name} garnizonu güçlendi.`, `The garrison of ${s.name} was reinforced.`)); } });
    if (s.kind === 'sehir' || bl(s, 'pazar')) add({ i: '🏪', l: L('Pazar', 'Market'), sub: L('Hediyelik eşya al', 'Buy gifts'), run: () => openSettlement(s, true) });
    if (!s.capital && settlementsOf(p).length >= 2) add({ i: '🎖️', l: L('Bu toprağı bağışla', 'Grant this holding'), sub: L('Bir saraylını vasal yap · sadakat +40', 'Make a courtier your vassal · opinion +40'), why: jail, run: () => openGrantPicker(s) });
  } else if (ours) {
    const just = hasKnownCrime(p, h);
    add({ i: '💬', l: L(`${shortName(h)} ile konuş`, `Talk to ${shortName(h)}`), sub: '1⚡', why: firstReq(jail, apReq(1), free(h) ? null : L('Esir', 'Captive')), run: () => openDialogue(h.id) });
    add({ i: '🎁', l: L('Vasalı ödüllendir', 'Reward your vassal'), sub: '30💰 · ' + L('ilişki +15', 'opinion +15'), why: goldReq(p, 30), run: () => { p.gold -= 30; h.gold += 30; addOp(h, p, 15); remember(h, p, 'hediye', 6); toast(L(`${nm(h)} ödülünü minnetle kabul etti.`, `${nm(h)} gratefully accepted your reward.`)); } });
    if (myR && h.lordId === p.id) add({ i: '⚖️', l: L('Unvanı geri al', 'Revoke the title'), sub: just ? L('Suçlarını biliyorsun: haklı gerekçe', 'You know their crimes: just cause') : L('Zorbalık! Diğer vasallar -10, isyan riski', 'Tyranny! Other vassals -10, risk of revolt'), cls: just ? '' : 'danger', why: jail, run: () => askConfirm(L(`<b>${esc(s.name)}</b>, ${esc(nm(h))} elinden alınacak.${just ? '' : ' Haklı bir gerekçen yok: bu zorbalık sayılır.'}`, `<b>${esc(s.name)}</b> will be taken from ${esc(nm(h))}.${just ? '' : ' You have no just cause: this counts as tyranny.'}`), () => { const m = revokeTitle(s); if (m) resultModal(m); refreshPanels(); }, () => {}) });
  } else if (h) {
    const k = r ? ch(r.holder) : null;
    if (h.id !== p.id) add({ i: '💬', l: L(`${shortName(h)} ile konuş`, `Talk to ${shortName(h)}`), sub: '1⚡', why: firstReq(jail, apReq(1), free(h) ? null : L('Esir', 'Captive')), run: () => openDialogue(h.id) });
    if (k && k !== h && k.id !== p.id) add({ i: '👑', l: L(`Hükümdarı: ${shortName(k)}`, `Their ruler: ${shortName(k)}`), sub: L('Karakter kartı', 'Character card'), run: () => openSheet(k.id) });
    if (myR && r && r !== myR && k) {
      add({ i: '🕊️', l: L('Elçi gönder', 'Send an envoy'), sub: L(`20💰 · 1⚡ · ${realmShort(r)} hükümdarı +12`, `20💰 · 1⚡ · ruler of ${realmShort(r)} +12`), why: firstReq(goldReq(p, 20), apReq(1)), run: () => sendEnvoy(r) });
      if (atWarRealms(myR, r)) add({ i: '🕊️', l: L('Barış teklif et', 'Offer peace'), sub: L(`%${ACTION_MAP.baris.chance(p, k)} · 1⚡`, `${ACTION_MAP.baris.chance(p, k)}% · 1⚡`), why: firstReq(jail, apReq(1)), run: () => doAction('baris', k.id) });
      else add({ i: '⚔️', l: L(`Savaş ilan et: ${realmShort(r)}`, `Declare war on ${realmShort(r)}`), sub: L(`Gücün ~${Math.round(charPower(p))} · onların ~${Math.round(charPower(k))}`, `Your strength ~${Math.round(charPower(p))} · theirs ~${Math.round(charPower(k))}`) + (allied(myR, r) ? L(' · paktı bozar', ' · breaks your pact') : ''), cls: 'danger', why: firstReq(jail, apReq(1)), run: () => doAction('savas', k.id) });
    }
  }
  // Ordu emirleri
  if (pp && armyActive(pp)) {
    const from = partyProv(pp), here = from && from.id === pv.id;
    const turnsTo = toId => { const path = findPath(from.id, toId); return path ? Math.max(1, splitTurns(from.id, path, movePoints(pp)).length) : null; };
    if (s && hostile) {
      if (pp.mode === 'siege' && pp.sid === s.id && s.siege) add({ i: '🔥', l: L('Surlara hücum et', 'Storm the walls'), sub: L(`Kuşatma ${s.siege.days}. gün · garnizon ${s.garrison}`, `Siege day ${s.siege.days} · garrison ${s.garrison}`), cls: 'war', why: s.siege.days < 1 ? L('Kuşatma yeni başladı', 'The siege has just begun') : null, run: () => openAssault(s) });
      else {
        const sp = partyProv(s), t = sp ? turnsTo(sp.id) : null;
        add({ i: '🔥', l: L(`${s.name} kuşat`, `Besiege ${s.name}`), sub: L(`Ordu yola çıkar · ${t || '?'} tur · garnizon ${garrisonPower(s)} / ordun ${partyPower(pp)}`, `The army marches · ${t || '?'} turn(s) · garrison ${garrisonPower(s)} / army ${partyPower(pp)}`), cls: 'war', why: t == null ? L('Oraya yol yok', 'No route there') : null,
          run: () => { orderMove(sp.id, s.id); toast(L(`🔥 ${armyName(pp)} ${s.name} üzerine yürüyor.`, `🔥 The ${armyName(pp)} marches on ${s.name}.`)); } });
      }
    }
    if (!here) {
      const t = turnsTo(pv.id);
      add({ i: '🚩', l: L('Orduyu buraya gönder', 'Send the army here'), sub: L(`${armyName(pp)} · ${t || '?'} tur`, `${armyName(pp)} · ${t || '?'} turn(s)`), why: t == null ? L('Oraya yol yok', 'No route there') : null, run: () => { orderMove(pv.id); toast(L('🚩 Ordu yola çıkacak. Turu bitirince yürür.', '🚩 The army will march when you end the turn.')); } });
    }
    for (const o of (armiesByProvince().get(pv.id) || [])) {
      if (o === pp || !armyActive(o) || !hostileParties(pp, o)) continue;
      add({ i: '⚔️', l: L(`Saldır: ${armyName(o)}`, `Attack: ${armyName(o)}`), sub: L(`güçleri ${partyPower(o)} · ordun ${partyPower(pp)}`, `their strength ${partyPower(o)} · yours ${partyPower(pp)}`), cls: 'war', run: () => playerAttack(o) });
    }
  }
  return acts;
}
/* Ordu düşman bir orduya saldırır (yakındaysa hemen, uzaktaysa takip eder) */
function playerAttack(pt) {
  const pp = playerParty();
  if (!pp || !armyActive(pp)) return;
  const a = partyProv(pp), b = partyProv(pt);
  if (dist(pp, pt) < 1.2 || a.id === b.id || a.nb.some(e => e.to === b.id && !e.sea)) openEncounter(pt);
  else { orderChase(pt); toast(L('Düşman uzakta. Turu bitirince ordun peşine düşecek.', 'The enemy is out of reach. Your army will pursue when you end the turn.')); }
}
function sendEnvoy(o) {
  const p = P(), k = o && ch(o.holder);
  if (!k || p.gold < 20 || G.ap < 1) return;
  p.gold -= 20; G.ap -= 1;
  const g = 12 + Math.floor((stat(p, 'dip') + councilBonus('sansolye')) / 3);
  addOp(k, p, g); remember(k, p, 'hediye', 4);
  toast(L(`🕊️ Elçin ${o.name} sarayında ağırlandı. (+${g})`, `🕊️ Your envoy was received at the court of the ${o.name}. (+${g})`));
}
/* Unvanı geri al (CK3: Revoke title) */
function revokeTitle(s) {
  const p = P(), h = ch(s.holder);
  if (!h || h.id === p.id) return '';
  const just = hasKnownCrime(p, h);
  if (!just && settlementsOf(h).length >= 2 && opinion(h, p) < 10 && chance(0.5)) {
    addOp(h, p, -40);
    const nr = rebel(h);
    G.terrDirty = true;
    return L(`${nm(h)} fermanını yırttı ve <b>isyan etti!</b>${nr ? ` ${nr.name} kuruldu.` : ''}`, `${nm(h)} tore up your decree and <b>rose in revolt!</b>${nr ? ` The ${nr.name} is proclaimed.` : ''}`);
  }
  giveTitle(s, p);
  const r = ownRealm(p); if (r) s.liege = r.id;
  refreshLieges();
  addOp(h, p, -60); setBond(h, p, 'rakip');
  if (!just) { p.tyranny += 20; vassalsOf(p).forEach(v => { if (v.id !== h.id) addOp(v, p, -10); }); }
  G.terrDirty = true;
  const m = L(`${s.name}, ${nm(h)} elinden alındı ve kraliyet arazisine katıldı.`, `${s.name} was taken from ${nm(h)} and joins the royal demesne.`) + (just ? '' : L(' <b>Vasalların bu zorbalığı unutmayacak.</b> (Zorbalık +20)', ' <b>Your vassals will not forget this tyranny.</b> (Tyranny +20)'));
  log(m, 'player');
  return m;
}
/* Toprağı bir saraylıya bağışla */
function grantCandidates(p) {
  return living().filter(x => x.id !== p.id && isAdult(x) && free(x) && !x.titles.length && (x.lordId === p.id || (familyRel(p, x) && familyRel(p, x) !== 'es' && !x.bastard)))
    .sort((a, b) => (familyRel(p, b) ? 1 : 0) - (familyRel(p, a) ? 1 : 0) || opinion(b, p) - opinion(a, p)).slice(0, 30);
}
function openGrantPicker(s) {
  const p = P(), cands = grantCandidates(p);
  showModal(`<div class="sheet"><button class="x" data-close>✕</button><h2>🎖️ ${L(`${esc(s.name)} kime verilsin?`, `Grant ${esc(s.name)} to whom?`)}</h2>
    <p class="small muted">${L('Toprak alan kişi vasalın olur; sana minnet duyar (+40) ve kendi ordusunu kurar.', 'The recipient becomes your vassal, is grateful (+40) and raises their own levies.')}</p>
    ${cands.length ? cands.map(c => `<button class="person" data-pick="${c.id}">${avatar(c)}<div class="pi"><b>${esc(nm(c))}</b><small>${esc(titleOf(c))} · ${STATS.yon} ${stat(c, 'yon')} · ${STATS.sav} ${stat(c, 'sav')}</small><div class="tags">${tagsFor(p, c)}</div></div>${opBadge(opinion(c, p))}</button>`).join('') : `<p class="muted">${L('Sarayında toprak verilebilecek kimse yok. Sohbette insanları hizmetine davet et.', 'There is no one at court to grant land to. Invite people into your service in conversation.')}</p>`}</div>`, 'menu');
  const m = $('#modal');
  m.querySelector('[data-close]').onclick = closeModal;
  m.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
    const c = ch(+b.dataset.pick);
    giveTitle(s, c);
    const r = ownRealm(p) || realmOf(p); if (r) s.liege = r.id;
    refreshLieges();
    addOp(c, p, 40); c.prestige += 50; G.terrDirty = true;
    const msg = L(`${s.name} artık ${nm(c)} adına. Yeni vasalın diz çöküp sadakat yemini etti.`, `${s.name} now belongs to ${nm(c)}. Your new vassal knelt and swore fealty.`);
    log(msg, 'player');
    closeModal(); saveGame(); toast(msg); refreshPanels();
  });
}

/* ---------- Yerleşim çekmecesi: asker toplama ve pazar ---------- */
function openSettlement(s, market) { UI.sett = s.id; UI.settMarket = !!market; openDrawer('sett'); }
function settlementPanel(p) {
  const s = G.titles[UI.sett], pp = ensurePlayerParty();
  if (!s) return '';
  const r = s.liege ? G.titles[s.liege] : null;
  const mine = s.holder === p.id;
  const cap = partyCap(p), n = pp ? troopCount(pp) : 0;
  let html = `<div class="card"><p>${flagHtml(r, 14)} ${r ? esc(r.name) : L('Bağımsız', 'Independent')} · ${s.kind === 'sehir' ? L('Şehir', 'City') : L('Kale', 'Castle')}${s.capital ? ' · ' + L('Başkent', 'Capital') : ''}</p>
    <p class="small">${L('Garnizon', 'Garrison')} ${s.garrison}/${garrisonMax(s)} · ${L('Refah', 'Prosperity')} %${Math.round((s.prosperity || 1) * 100)}</p></div>`;
  if (mine && !UI.settMarket) {
    html += `<h3>🛡️ ${L('Asker topla', 'Raise troops')} <small class="muted">(${armyName(pp)} ${n}/${cap})</small></h3><div class="recruit">`;
    for (const k of Object.keys(s.pool)) {
      const T = TROOPS[k], off = s.pool[k] < 1 || p.gold < T.cost || n >= cap;
      html += `<div class="rrow"><span class="ri">${T.ikon}</span><span class="rn">${T.ad} ${tierBadge(k)}<small>${T.cost}💰 · ${L('maaş', 'wage')} ${T.wage}/${L('ay', 'mo')} · ${L('mevcut', 'available')} ${s.pool[k]}</small></span>
        <button data-rec="${k}:1" ${off ? 'disabled' : ''}>+1</button><button data-rec="${k}:5" ${off ? 'disabled' : ''}>+5</button></div>`;
    }
    html += `</div><p class="small muted">${L('Toplanan askerler kraliyet ordusuna katılır.', 'Raised troops join the royal army.')}</p>`;
    if (s.kind === 'sehir' && pp && pp.troops.milis) html += `<button class="wide" data-sa="train">⬆️ ${L(`Milisleri piyade yap (15💰/kişi, ${pp.troops.milis} milis)`, `Train militia into spearmen (15💰 each, ${pp.troops.milis} militia)`)}</button>`;
    if (pp && dist(pp, s) < ENTER_DIST + 0.1 && (pp.troops.piyade || 0) >= 10) html += `<button class="wide" data-sa="leave">📦 ${L('10 piyadeyi garnizona bırak', 'Leave 10 spearmen in the garrison')}</button>`;
    html += `<button class="wide" data-hold="${s.id}">🏗️ ${L('Binalar, vergi ve huzur', 'Buildings, taxes and order')}</button>`;
  }
  if (UI.settMarket || !mine) html += marketHtml(s, p);
  return html;
}
function bindSettlement(root) {
  const s = G.titles[UI.sett], p = P(), pp = ensurePlayerParty();
  root.querySelectorAll('[data-rec]').forEach(b => b.onclick = () => {
    const [k, n] = b.dataset.rec.split(':');
    const got = playerRecruit(s, k, Math.min(+n, partyCap(p) - troopCount(pp)));
    if (got) toast(L(`${got} ${TROOPS[k].ad} orduya katıldı.`, `${got} ${TROOPS[k].ad} joined the army.`));
    refreshPanels();
  });
  const on = (k, f) => { const b = root.querySelector(`[data-sa="${k}"]`); if (b) b.onclick = f; };
  on('train', () => { const n = Math.min(pp.troops.milis, Math.floor(p.gold / 15)); if (!n) return toast(L('Yeterli altın yok.', 'Not enough gold.')); p.gold -= n * 15; pp.troops.milis -= n; if (!pp.troops.milis) delete pp.troops.milis; pp.troops.piyade = (pp.troops.piyade || 0) + n; toast(L(`${n} milis piyade oldu.`, `${n} militia became spearmen.`)); refreshPanels(); });
  on('leave', () => { pp.troops.piyade -= 10; if (!pp.troops.piyade) delete pp.troops.piyade; s.garrison += 10; refreshPanels(); });
}

/* ---------- Ordu çekmecesi ---------- */
function tabOrdu(p) {
  const pp = ensurePlayerParty();
  if (!pp) return `<div class="alert">${L('Ordun yok.', 'You have no army.')}</div>`;
  const lead = armyLeader(pp);
  const wage = partyWage(pp), home = armyAtHome(pp);
  const moving = (pp.path && pp.path.length) || pp.chase != null;
  const rows = Object.entries(pp.troops).filter(([, n]) => n > 0).sort((a, b) => TROOPS[b[0]].tier - TROOPS[a[0]].tier).map(([k, n]) => `<div class="rrow"><span class="ri">${TROOPS[k].ikon}</span><span class="rn">${TROOPS[k].ad} ${tierBadge(k)} <b>× ${n}</b><small>${L('Can', 'HP')} ${TROOPS[k].hp} · ${L('Saldırı', 'Attack')} ${TROOPS[k].atk} · ${L('Zırh', 'Armor')} ${TROOPS[k].def}${TROOPS[k].range ? ' · ' + L('Menzilli', 'Ranged') : ''}</small></span><button data-dis="${k}:1">-1</button><button data-dis="${k}:5">-5</button></div>`).join('');
  const own = settlementsOf(p);
  return `<div class="ck-card armyhead"><div class="ah-l">${flagHtml(ownRealm(p) || realmOf(p), 30)}<div><h2>${esc(armyName(pp))}</h2><p class="small muted">📍 ${esc(provName(partyProv(pp)))} · ${esc(armyStatus(pp))}</p></div></div>
      <div class="kstats"><div><b>${troopCount(pp)}<small>/${partyCap(p)}</small></b><small>${L('asker', 'men')}</small></div><div><b>${partyPower(pp)}</b><small>${L('güç', 'strength')}</small></div><div><b>${movePoints(pp)}</b><small>${L('il/tur', 'prov./turn')}</small></div><div data-tip="${esc(home ? L('Ordu kendi topraklarında bekliyor: askerlerin çoğu evinde, maaşın yalnızca %35\'i ödenir. Sefere çıkınca tam maaş ödenir.', 'The army waits in your own lands: most men are at home and only 35% of wages are paid. On campaign, full wages apply.') : L('Seferde: tam maaş.', 'On campaign: full wages.'))}"><b class="${wage > income(p) ? 'bad' : ''}">${wage}💰</b><small>${home ? L('maaş (evde)', 'wages (home)') : L('maaş (seferde)', 'wages (campaign)')}</small></div></div></div>
    <div class="ck-card cmdr">${lead ? `<button class="person" data-open="${lead.id}">${avatar(lead, 44)}<div class="pi"><small class="eyebrow">${L('Komutan · Mareşal', 'Commander · Marshal')}</small><b>${esc(nm(lead))}</b><small>${STATS.sav} ${stat(lead, 'sav')} · ${lead.traits.filter(t => TRAITS[t].kisilik).map(t => TRAITS[t].ad).join(', ')}</small></div></button>`
      : `<p class="small"><b class="bad">${L('Mareşal yok!', 'No marshal!')}</b> ${L('Ordu komutansız savaşır (savaş gücü düşük).', 'The army fights without a commander (weaker in battle).')}</p><button class="wide" data-seat-open>🏛️ ${L('Meclisten mareşal ata', 'Appoint a marshal in the council')}</button>`}</div>
    <div class="orderrow">
      <button data-army-act="home" ${!armyActive(pp) ? 'disabled' : ''}>🏰 ${L('Başkente dön', 'Return to capital')}</button>
      <button data-army-act="stop" ${!moving ? 'disabled' : ''}>✋ ${L('Durdur', 'Halt')}</button>
      <button data-army-act="show">📍 ${L('Haritada göster', 'Show on map')}</button>
    </div>
    <h3>${L('Birlikler', 'Regiments')}</h3>
    <div class="recruit">${rows || `<p class="muted">${L('Orduda asker yok. Topraklarından asker topla ya da sancakları çağır.', 'The army is empty. Raise troops in your holdings or call the banners.')}</p>`}</div>
    <h3>${L('Asker toplanacak yerler', 'Where to raise troops')}</h3>
    ${own.length ? own.map(s => `<button class="wide rsrc" data-recruit-at="${s.id}">${s.kind === 'sehir' ? '🏙️' : '🏰'} ${esc(s.name)} <small class="muted">· ${L('havuz', 'pool')} ${poolTotal(s)}</small></button>`).join('') : `<p class="small muted">${L('Toprağın yok.', 'You hold no land.')}</p>`}
    <div class="acts">${['seferberlik'].map(id => DECISION_MAP[id]).filter(d => d.show(p)).map(d => { const why = d.req(p); return `<button class="act ${why ? 'off' : ''}" data-dec="${d.id}" ${why ? 'disabled' : ''}><span class="ai">${d.i}</span><span class="al">${esc(d.ad(p))}<small>${esc(d.d(p))}</small>${why ? `<em>${esc(why)}</em>` : ''}</span></button>`; }).join('')}${actionButton(ACTION_MAP.parali, p, null)}</div>
    <p class="small muted">${L('Ordunu haritadan yönetirsin: bir ile dokun, "Orduyu buraya gönder" ya da düşman şehrinde "Kuşat" de. Maaş ödenmezse askerler kaçar.', 'You command the army from the map: tap a province and choose "Send the army here", or "Besiege" on an enemy holding. Unpaid soldiers desert.')}</p>`;
}
function bindArmyTab(body) {
  const pp = playerParty();
  body.querySelectorAll('[data-army-act]').forEach(b => b.onclick = () => {
    const k = b.dataset.armyAct;
    if (k === 'home') { sendArmyHome(pp); toast(L('Ordu başkente dönüyor.', 'The army returns to the capital.')); }
    else if (k === 'stop') cancelOrders();
    else if (k === 'show') { closeDrawer(); centerOn(pp.x, pp.y, 22); const pv = partyProv(pp); if (pv) selectProvince(pv.id); return; }
    refreshPanels();
  });
  body.querySelectorAll('[data-recruit-at]').forEach(b => b.onclick = () => openSettlement(G.titles[b.dataset.recruitAt]));
  body.querySelectorAll('[data-seat-open]').forEach(b => b.onclick = () => { closeDrawer(); openRealm('meclis'); });
}
