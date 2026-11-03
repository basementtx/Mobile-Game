'use strict';
/* =========================================================
   Taç ve Hançer — Fetih arayüzü: asker/altın çubuğu, saldırı
   oranı, kare paneli (saldır, çıkarma, inşa, diplomasi, ateş),
   saldırı listesi ve sıralama tablosu
   ========================================================= */

UI.ratio = (() => { try { const v = +localStorage.getItem('tvh-ratio'); return v >= 1 && v <= 100 ? v : 25; } catch (e) { return 25; } })();
UI.lbOpen = false;
const TER_NAMES = () => [L('Deniz', 'Sea'), L('Ova', 'Plains'), L('Yayla', 'Highlands'), L('Dağlar', 'Mountains')];
const fmtGold = n => Math.floor(n).toLocaleString(LANG === 'tr' ? 'tr-TR' : 'en-US');

/* ---------- Alt çubuk ---------- */
function renderCtrl() {
  const el = $('#ctrl');
  if (!el || !G) return;
  const n = myNat();
  if (!n) { setHTML(el, `<div class="cb-none">${L('Bir krallığın yok: ordular senin emrinde değil.', 'You hold no realm: no armies answer to you.')}</div>`); return; }
  const max = maxTroops(n), gr = troopGrowth(n) / TICK, gd = goldRate(n), gold = natGold(n);
  const html = `<div class="cb-res">
      <span class="cb-tr" title="${L('Asker', 'Troops')}"><i class="cb-bar"><i style="width:${clamp(n.troops / max * 100, 0, 100)}%"></i></i>⚔ <b>${fmtCount(n.troops)}</b><small>/${fmtCount(max)}</small><em class="${gr >= 0 ? 'good' : 'bad'}">${gr >= 0 ? '+' : ''}${fmtCount(gr)}/s</em></span>
      <span class="cb-gd" title="${L('Hazine', 'Treasury')}">💰 <b>${fmtGold(gold)}</b><em class="good">+${gd.toFixed(1)}/s</em></span></div>
    <div class="cb-rat"><label>${L('Saldırı', 'Attack')} <b id="ratv">${UI.ratio}%</b> <small id="ratn">${fmtCount(n.troops * UI.ratio / 100)}</small></label><input id="ratio" type="range" min="1" max="100" step="1" value="${UI.ratio}"></div>`;
  if (el._h && el.querySelector('#ratio') && document.activeElement === el.querySelector('#ratio')) {
    // Kaydırıcı sürüklenirken düğümü yeniden kurma
    el.querySelector('.cb-res').innerHTML = html.split('<div class="cb-rat">')[0].replace('<div class="cb-res">', '').replace(/<\/div>\s*$/, '');
    return;
  }
  if (setHTML(el, html)) {
    const r = el.querySelector('#ratio');
    const upd = () => { UI.ratio = +r.value; const v = el.querySelector('#ratv'), nn = el.querySelector('#ratn'); if (v) v.textContent = UI.ratio + '%'; if (nn && myNat()) nn.textContent = fmtCount(myNat().troops * UI.ratio / 100); try { localStorage.setItem('tvh-ratio', String(UI.ratio)); } catch (e) { /* yok say */ } };
    r.oninput = upd; r.onchange = () => { upd(); el._h = null; };
    r.onpointerdown = e => e.stopPropagation();
  } else {
    const nn = el.querySelector('#ratn'); if (nn) nn.textContent = fmtCount(n.troops * UI.ratio / 100);
  }
}

/* ---------- Saldırı listesi ---------- */
function renderAtks() {
  const el = $('#atks');
  if (!el || !G) return;
  const me = myNatIdx();
  if (me < 0) { setHTML(el, ''); return; }
  const out = G.atk.filter(k => k.a === me), inc = G.atk.filter(k => k.d === me), boats = G.ships.filter(s => s.n === me && s.k === 'gemi');
  const row = (k, dir) => {
    const O = dir === 'out' ? (k.d >= 0 ? G.nat[k.d] : null) : G.nat[k.a];
    return `<div class="ak ${dir}">${dir === 'out' ? '→' : '←'} ${O ? flagHtml(natFlagObj(O), 11) : ''}<span>${esc(O ? natName(O, true) : L('Sahipsiz', 'Unclaimed'))}</span><b>${fmtCount(k.troops)}</b>${dir === 'out' ? `<button data-ret="${k.id}" title="${L('Geri çekil (%25 kayıp)', 'Retreat (25% lost)')}">✕</button>` : ''}</div>`;
  };
  const html = out.map(k => row(k, 'out')).join('') + inc.map(k => row(k, 'in')).join('') + boats.map(s => `<div class="ak out">⛵ <span>${L('Çıkarma', 'Landing')}</span><b>${fmtCount(s.troops)}</b></div>`).join('');
  if (setHTML(el, html)) el.querySelectorAll('[data-ret]').forEach(b => b.onclick = e => { e.stopPropagation(); const k = G.atk.find(x => x.id === +b.dataset.ret); if (k) retreatAttack(k); renderAtks(); });
}

/* ---------- Sıralama ---------- */
function renderLB() {
  const el = $('#lb');
  if (!el || !G) return;
  const me = myNatIdx();
  const list = G.nat.filter(n => n.alive && NR[n.i].tiles).sort((a, b) => NR[b.i].tiles - NR[a.i].tiles);
  const rank = list.findIndex(n => n.i === me);
  let html = `<button class="lb-t" data-lbt>🏆 ${L('Sıralama', 'Leaders')}${rank >= 0 ? ` <small>#${rank + 1}</small>` : ''} ${UI.lbOpen ? '▴' : '▾'}</button>`;
  if (UI.lbOpen) {
    const top = list.slice(0, 7);
    if (rank >= 7) top.push(list[rank]);
    html += top.map(n => `<button class="lb-r ${n.i === me ? 'me' : ''}" data-lbn="${n.i}"><i>${list.indexOf(n) + 1}</i>${flagHtml(natFlagObj(n), 11)}<span>${esc(natName(n, true))}</span><b>${(landShare(n.i) * 100).toFixed(1)}%</b><small>${fmtCount(n.troops)}</small></button>`).join('');
  }
  if (setHTML(el, html)) {
    el.querySelector('[data-lbt]').onclick = () => { UI.lbOpen = !UI.lbOpen; renderLB(); };
    el.querySelectorAll('[data-lbn]').forEach(b => b.onclick = () => { const t = natLabelTile(+b.dataset.lbn); if (t >= 0) { centerOnTile(t); openPop(t, null, null); } });
  }
}
function updateFrontHUD() { renderCtrl(); renderAtks(); renderLB(); if (UI.pop && G.tick % 5 === 0) renderPop(); }

/* ---------- Kare paneli ---------- */
function openPop(t, sx, sy) { if (!(t >= 0 && t < FN)) return; SEL.t = t; UI.pop = { t, sx, sy }; renderPop(true); MAPDIRTY = true; }
function closePop() { UI.pop = null; SEL.t = -1; const el = $('#pop'); if (el) el.classList.add('hidden'); MAPDIRTY = true; }
function relTag(me, o) {
  if (o < 0) return '';
  if (o === me) return `<span class="tag friend">${L('Senin', 'Yours')}</span>`;
  if (alliedNat(me, o)) return `<span class="tag friend">🤝 ${L('Müttefik', 'Ally')}</span>`;
  if (G.nat[o].bot) return `<span class="tag enemy">${L('Kabile', 'Tribe')}</span>`;
  if (hostileNat(me, o)) return `<span class="tag enemy">⚔️ ${L('Savaşta', 'At war')}</span>`;
  return `<span class="tag">${L('Barış', 'Peace')}</span>`;
}
function popBtn(k, label, sub, dis, cls) { return `<button class="pa ${cls || ''}" data-pa="${k}" ${dis ? 'disabled' : ''}><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</button>`; }
function renderPop(first) {
  const el = $('#pop');
  if (!UI.pop || !el) return;
  const t = UI.pop.t, me = myNatIdx(), o = OWN[t] - 1, N = o >= 0 ? G.nat[o] : null;
  const water = TER[t] === 0, u = UNIT_AT.get(t), sid = SETT_AT.get(t), s = sid ? G.titles[sid] : null, p = P();
  const M = me >= 0 ? G.nat[me] : null;
  let head = '';
  if (water) head = `<div class="pp-h"><span class="pp-ic">🌊</span><div><b>${L('Deniz', 'Sea')}</b></div></div>`;
  else {
    const k = natRuler(N);
    head = `<div class="pp-h">${N ? flagHtml(natFlagObj(N), 22) : '<span class="pp-ic">🌾</span>'}<div><b>${esc(natName(N))}</b>
      <small>${N ? `⚔ ${fmtCount(N.troops)} · ${(landShare(o) * 100).toFixed(1)}% ${L('toprak', 'land')}` : TER_NAMES()[TER[t]]}${k ? ` · <a data-open="${k.id}">${esc(nm(k))}</a>` : ''}</small>${me >= 0 && N ? `<span class="tags">${relTag(me, o)}</span>` : ''}</div></div>`;
    if (s || u) head += `<p class="small pp-sub">${s ? `🏰 <b>${esc(s.name)}</b>${s.capital ? ' ★' : ''}${s.holder != null && ch(s.holder) ? ` · <a data-open="${s.holder}">${esc(nm(ch(s.holder)))}</a>` : ''}` : ''}${u ? `${s ? ' · ' : ''}${esc(UNITS[u.k].ad())}${u.lvl > 1 ? ' ' + ROMAN[Math.min(u.lvl, 6)] : ''}` : ''} · ${TER_NAMES()[TER[t]]}</p>`;
  }
  let acts = '';
  if (M && !G.over && !p.prisonerOf && !water) {
    const send = M.troops * UI.ratio / 100;
    if (o === me) {
      acts += `<div class="pp-sec">${L('İnşa et', 'Build')}</div><div class="pp-grid">`;
      for (const k of UKEYS) {
        const why = buildReason(me, k, t), same = nearUnit(t, 2, x => x.k === k && x.n === me);
        acts += popBtn('b:' + k, `${ic(UNITS[k].i)} ${UNITS[k].ad()}${same && (k === 'kasaba' || k === 'liman') ? ' ↑' : ''}`, why && !why.includes(String(unitCost(me, k))) ? why : `${fmtGold(unitCost(me, k))}💰`, !!why);
      }
      if (u && u.k === 'liman') { const c = GALLEY_COST(NR[me].galleys); acts += popBtn('galley', `⚓ ${L('Kadırga', 'Galley')}`, `${fmtGold(c)}💰`, natGold(M) < c); }
      acts += `</div><p class="small muted pp-note">${u ? esc(UNITS[u.k].d()) : L('Kasaba asker sınırını ve geliri artırır; kale sınırı korur.', 'Towns raise troop limit and income; forts guard the border.')}</p>`;
    } else {
      const adj = natNeighbors(me).has(o);
      const ally = alliedNat(me, o);
      const needWar = N && !N.bot && !hostileNat(me, o) && !ally;
      if (ally) acts += popBtn('x', `🤝 ${L('Müttefikin', 'Your ally')}`, L('Müttefike saldırılamaz', 'Allies cannot be attacked'), true);
      else if (adj) acts += popBtn('atk', needWar ? `⚔️ ${L('Savaş ilan et ve saldır', 'Declare war & attack')}` : `⚔️ ${L('Saldır', 'Attack')}`, `${fmtCount(send)} ${L('asker', 'troops')}`, send < 1, 'primary');
      if (!ally) {
        const coast = M.boats < MAX_BOATS;
        acts += popBtn('boat', `⛵ ${L('Gemiyle çıkarma', 'Naval landing')}`, coast ? `${fmtCount(send)} · ${M.boats}/${MAX_BOATS}` : L('En çok 3 gemi', 'Max 3 ships'), !coast || send < 1, adj ? '' : 'primary');
      }
      if (N && !N.bot) {
        const k = natRuler(N);
        if (k && ownRealm(p)) {
          acts += `<div class="pp-sec">${L('Diplomasi', 'Diplomacy')}</div><div class="pp-grid">`;
          if (hostileNat(me, o)) acts += popBtn('peace', `🕊️ ${L('Barış teklif et', 'Offer peace')}`, `%${ACTION_MAP.baris.chance(p, k)}${cooldown('peace' + N.realm) ? ' · ' + L(`${cooldown('peace' + N.realm)} ay`, `${cooldown('peace' + N.realm)} mo`) : ''}`, !!cooldown('peace' + N.realm));
          else if (ally) {
            acts += popBtn('gift', `🪖 ${L('Asker gönder', 'Send troops')}`, fmtCount(send), send < 1);
            acts += popBtn('gold', `💰 ${L('Altın gönder', 'Send gold')}`, '200', natGold(M) < 200);
            acts += popBtn('unally', `💔 ${L('İttifakı boz', 'Break alliance')}`, L('Şan -30', 'Prestige -30'), false, 'danger');
          } else acts += popBtn('ally', `🤝 ${L('İttifak öner', 'Propose alliance')}`, `%${pactChance(p, k)}${cooldown('pact' + N.realm) ? ' · ' + L(`${cooldown('pact' + N.realm)} ay`, `${cooldown('pact' + N.realm)} mo`) : ''}`, !!cooldown('pact' + N.realm));
          acts += popBtn('talk', `💬 ${L('Konuş', 'Talk')}`, `1⚡`, G.ap < 1);
          acts += `</div>`;
        }
      }
      if (countUnits(me, 'atolye')) {
        acts += `<div class="pp-sec">🔥 ${L('Ateş saldırısı', 'Fire strike')}</div><div class="pp-grid">`;
        for (const k of Object.keys(STRIKES)) { const why = strikeReason(me, k, t); acts += popBtn('s:' + k, STRIKES[k].ad(), why && !why.includes(String(STRIKES[k].cost)) ? why : `${fmtGold(STRIKES[k].cost)}💰`, !!why, 'fire'); }
        acts += `</div>`;
      }
    }
  }
  const html = `<button class="x" data-px>✕</button>${head}${acts ? `<div class="pp-acts">${acts}</div>` : ''}`;
  if (!setHTML(el, html) && !first) return;
  el.classList.remove('hidden');
  bindPop(el);
  if (first) placePop(el);
}
function placePop(el) {
  const W = window.innerWidth, H = window.innerHeight, P_ = UI.pop;
  el.style.left = el.style.top = '';
  const w = el.offsetWidth, h = el.offsetHeight;
  if (P_.sx == null) { el.style.left = Math.round((W - w) / 2) + 'px'; el.style.top = Math.round(Math.max(8, (H - h) / 2)) + 'px'; return; }
  let x = P_.sx + 16, y = P_.sy - h / 2;
  if (x + w > W - 8) x = P_.sx - w - 16;
  x = clamp(x, 8, W - w - 8); y = clamp(y, 8, H - h - 8);
  el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px';
}
function bindPop(el) {
  el.querySelector('[data-px]').onclick = closePop;
  el.querySelectorAll('[data-open]').forEach(b => b.onclick = e => { e.stopPropagation(); openSheet(+b.dataset.open); });
  el.querySelectorAll('[data-pa]').forEach(b => b.onclick = e => { e.stopPropagation(); popAction(b.dataset.pa); });
  bindTips(el);
}
function popAction(a) {
  const t = UI.pop ? UI.pop.t : -1, me = myNatIdx();
  if (t < 0 || me < 0) return;
  const M = G.nat[me], o = OWN[t] - 1, N = o >= 0 ? G.nat[o] : null, p = P(), k = natRuler(N);
  const send = M.troops * UI.ratio / 100;
  const withWar = go => {
    if (N && !N.bot && !hostileNat(me, o)) return askConfirm(L(`<b>${esc(natName(N))}</b> ile savaşa gireceksin. Müttefikleri de sana savaş açabilir.`, `You will go to war with the <b>${esc(natName(N))}</b>. Their allies may join against you.`), () => { declareWar(natRealm(M), natRealm(N)); if (k) addOp(k, p, -30); go(); }, () => {});
    go();
  };
  if (a === 'atk') return withWar(() => { launchAttack(me, o, send); closePop(); });
  if (a === 'boat') return withWar(() => {
    const r = sendBoat(me, t, send);
    if (r === 'path') toast(L('Oraya deniz yolu bulunamadı.', 'No sea route leads there.'));
    else if (r === 'max') toast(L('Aynı anda en çok 3 çıkarma gemisi.', 'At most 3 landing ships at once.'));
    else if (!r) { toast(L(`⛵ ${fmtCount(send)} asker denize açıldı.`, `⛵ ${fmtCount(send)} troops set sail.`)); closePop(); }
  });
  if (a.startsWith('b:')) {
    const kk = a.slice(2), why = buildReason(me, kk, t);
    if (why) return toast(why);
    buildUnit(me, kk, t);
    toast(L(`🏗️ ${UNITS[kk].ad()} kuruldu.`, `🏗️ ${UNITS[kk].ad()} built.`));
    renderPop(); MAPDIRTY = true; return;
  }
  if (a === 'galley') { const u = UNIT_AT.get(t); const why = u ? buildGalley(me, u) : 'x'; if (why) toast(why); else toast(L('⚓ Kadırga suya indirildi.', '⚓ A galley was launched.')); renderPop(); return; }
  if (a.startsWith('s:')) {
    const kk = a.slice(2);
    return withWar(() => { if (launchStrike(me, kk, t)) { toast(L(`🔥 ${STRIKES[kk].ad()} fırlatıldı!`, `🔥 ${STRIKES[kk].ad()} launched!`)); closePop(); } });
  }
  if (!k) return;
  if (a === 'talk') { closePop(); return openDialogue(k.id); }
  if (a === 'peace') {
    setCooldown('peace' + N.realm, 2);
    if (chance(ACTION_MAP.baris.chance(p, k) / 100)) { makePeace(natRealm(M), natRealm(N)); resultModal(L(`🕊️ ${esc(nm(k))} barışı kabul etti.`, `🕊️ ${esc(nm(k))} accepted peace.`)); }
    else toast(L(`${esc(nm(k))} barışı reddetti: "Savaş bitmedi!"`, `${esc(nm(k))} refused: "This war is not over!"`));
    renderPop(); return;
  }
  if (a === 'ally') {
    setCooldown('pact' + N.realm, 3);
    if (chance(pactChance(p, k) / 100)) { addPact(natRealm(M), natRealm(N)); addOp(k, p, 10); log(L(`🤝 ${natName(N)} ile ittifak kuruldu.`, `🤝 Alliance formed with the ${natName(N)}.`), 'good'); resultModal(L(`🤝 ${esc(nm(k))} ittifakı kabul etti. Birbirinize saldıramazsınız; biri saldırıya uğrarsa diğeri yardıma gelir.`, `🤝 ${esc(nm(k))} accepted the alliance. You cannot attack each other, and each will come to the other's aid.`)); }
    else { addOp(k, p, -3); toast(L(`${esc(nm(k))} ittifak teklifini geri çevirdi.`, `${esc(nm(k))} declined the alliance.`)); }
    renderPop(); return;
  }
  if (a === 'unally') return askConfirm(L('İttifakı bozmak ihanet sayılır. (Şan -30, hükümdarın görüşü -40)', 'Breaking an alliance is betrayal. (Prestige -30, their ruler -40)'), () => { breakPact(natRealm(M), natRealm(N)); p.prestige -= 30; addOp(k, p, -40); remember(k, p, 'ihanet', -20); renderPop(); }, () => {});
  if (a === 'gift') { const v = Math.min(send, M.troops); M.troops -= v; N.troops += v; addOp(k, p, Math.min(20, Math.round(v / 500) + 3)); toast(L(`🪖 ${fmtCount(v)} asker müttefikine katıldı.`, `🪖 ${fmtCount(v)} troops joined your ally.`)); renderPop(); return; }
  if (a === 'gold') { if (natGold(M) < 200) return; addNatGold(M, -200); addNatGold(N, 200); addOp(k, p, 8); toast(L('💰 200 altın gönderildi.', '💰 200 gold sent.')); renderPop(); }
}
