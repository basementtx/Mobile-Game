'use strict';
/* =========================================================
   TAÇ VE HANÇER — Arayüz (yatay ekran)
   ========================================================= */

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const UI = { screen: 'setup', drawer: null, filter: 'yakin', sheet: null, modal: null, breakdown: false, speed: 1, waiting: false, forcePortrait: false, sett: null };
let SETUP = null;

/* ---------- Ortak parçalar ---------- */
function hue(str) { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
function avatar(c, size = 40) {
  return `<div class="av${c.alive ? '' : ' dead'}" style="width:${size}px;height:${size}px;--h:${hue(c.dyn)};font-size:${Math.round(size * 0.42)}px">
    <span>${esc(c.name[0])}</span><i>${c.age < 16 ? '🍼' : RANK_ICON[c.rank]}</i></div>`;
}
function opBadge(v) {
  const cls = v >= 40 ? 'pos2' : v > 0 ? 'pos' : v <= -40 ? 'neg2' : v < 0 ? 'neg' : 'neu';
  return `<span class="op ${cls}">${v > 0 ? '+' : ''}${v}</span>`;
}
function bar(v, max, cls) { return `<div class="bar ${cls || ''}"><div style="width:${clamp(v / max * 100, 0, 100)}%"></div></div>`; }
function traitChips(c) { return c.traits.map(t => `<span class="chip" data-tip="${esc(TRAITS[t].ad + ': ' + TRAITS[t].d)}">${TRAITS[t].ad}</span>`).join(''); }
function statGrid(c) { return `<div class="stats">${Object.keys(STATS).map(k => `<div><b>${STAT_ICON[k]} ${stat(c, k)}</b><small>${STATS[k]}</small></div>`).join('')}</div>`; }
function swatch(col) { return `<i class="sw" style="background:${col}"></i>`; }
function tagsFor(p, t) {
  const tags = [];
  const rel = familyRel(p, t);
  if (rel) tags.push(['fam', rel === 'Çocuk' && t.bastard ? 'Piç çocuğun' : rel]);
  if (p.lovers.includes(t.id)) tags.push(['love', 'Sevgili']);
  if (p.lordId === t.id) tags.push(['lord', 'Efendin']);
  if (t.lordId === p.id) tags.push(['vas', t.titles.length ? 'Vasalın' : 'Sarayında']);
  if (t.prisonerOf) tags.push(['jail', t.prisonerOf === p.id ? 'Senin esirin' : 'Zindanda']);
  if (!t.alive) tags.push(['dead', 'Ölü']);
  if (t.alive && hostileChars(p, t)) tags.push(['enemy', 'Savaştasınız']);
  const o = t.alive ? opinion(t, p) : 0;
  if (t.alive && o <= -50) tags.push(['enemy', 'Düşman']);
  if (t.alive && o >= 60 && !rel) tags.push(['friend', 'Dost']);
  if (knownSecretsOf(p, t).length) tags.push(['secret', 'Sırrını biliyorsun']);
  return tags.map(([c, l]) => `<span class="tag ${c}">${l}</span>`).join('');
}
function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const el = document.createElement('div');
  el.className = 'toast'; el.innerHTML = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 3800);
}
/* İçerik değişmediyse DOM'a dokunma (dokunuşlar kaybolmasın) */
function setHTML(el, html) { if (el._h === html) return false; el._h = html; el.innerHTML = html; return true; }
function bindTips(root) { root.querySelectorAll('[data-tip]').forEach(b => b.onclick = e => { e.stopPropagation(); toast(b.dataset.tip); }); }
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function showScreen(name) {
  UI.screen = name;
  for (const id of ['setup', 'game', 'battle']) $('#' + id).classList.toggle('hidden', id !== name);
  checkRotate();
}

/* ---------- Kurulum ---------- */
function renderSetup() {
  showScreen('setup');
  if (!SETUP) SETUP = { name: '', dyn: '', female: false, start: 'sovalye', realm: 'selcuklu', traits: randomTraits(), base: randomBase() };
  const S = SETUP;
  const fake = { base: S.base, traits: S.traits, health: 100, age: 20 };
  const R = REALMS[S.realm];
  const nSett = SETTLEMENTS.filter(s => s[4] === S.realm).length;
  if (S.start === 'lord' && nSett < 2) S.start = 'sovalye';
  const east = CULTURES[R.kul].east;
  const starts = [
    ['koylu', '🌾 Köylü', 'Zor', 'Hiçbir şeyin yok. Çamurdan taca tırman.'],
    ['sovalye', east ? '🏇 Sipahi' : '⚔️ Şövalye', 'Orta', 'Bir beyin hizmetinde, birkaç askerin var.'],
    ['lord', east ? '🏰 Bey' : '🏰 Lord', 'Kolay', 'Bir kale ya da şehir, 30 asker.'],
  ];
  const realmsSorted = Object.entries(REALMS).sort((a, b) => a[1].ad.localeCompare(b[1].ad, 'tr'));
  $('#setup').innerHTML = `
  <div class="setup">
    <div class="scol">
      <div class="brand"><div class="logo">⚜️</div><div><h1>Taç ve Hançer</h1><p class="sub">Anno Domini 1180 · Hicri 576</p></div></div>
      <div class="row2">
        <label>Adın<input id="s-name" maxlength="16" placeholder="Rastgele" value="${esc(S.name)}"></label>
        <label>Hanedan<input id="s-dyn" maxlength="16" placeholder="Rastgele" value="${esc(S.dyn)}"></label>
      </div>
      <div class="seg"><button data-g="0" class="${!S.female ? 'on' : ''}">♂ Erkek</button><button data-g="1" class="${S.female ? 'on' : ''}">♀ Kadın</button></div>
      <div class="starts">${starts.map(([k, t, d, desc]) => `<button class="start ${S.start === k ? 'on' : ''}" data-s="${k}" ${k === 'lord' && nSett < 2 ? 'disabled' : ''}><b>${t}</b><small>${d}</small><span>${desc}</span></button>`).join('')}</div>
      <div class="card"><div class="chips">${traitChips(fake)}</div>${statGrid(fake)}<button id="reroll" class="ghost">🎲 Zar at</button></div>
    </div>
    <div class="scol">
      <h3>Nereden başlıyorsun?</h3>
      <div class="realms">${realmsSorted.map(([k, r]) => `<button class="rbtn ${S.realm === k ? 'on' : ''}" data-r="${k}">${swatch(r.renk)}<span>${r.ad}</span><small>${CULTURES[r.kul].ad} · ${SETTLEMENTS.filter(s => s[4] === k).length} yerleşim</small></button>`).join('')}</div>
      <button id="startBtn" class="primary big">Hikâyeni Başlat</button>
      ${hasSave() ? '<button id="contBtn" class="ghost">Kayıtlı oyuna dön</button>' : ''}
    </div>
  </div>`;
  $('#s-name').oninput = e => { S.name = e.target.value; };
  $('#s-dyn').oninput = e => { S.dyn = e.target.value; };
  document.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { S.female = b.dataset.g === '1'; renderSetup(); });
  document.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { S.start = b.dataset.s; renderSetup(); });
  document.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { S.realm = b.dataset.r; renderSetup(); });
  $('#reroll').onclick = () => { S.traits = randomTraits(); S.base = randomBase(); renderSetup(); };
  bindTips($('#setup'));
  $('#startBtn').onclick = () => {
    const btn = $('#startBtn'); btn.textContent = 'Dünya kuruluyor…'; btn.disabled = true;
    setTimeout(() => {
      const clean = v => v.replace(/[<>&"']/g, '').trim();
      const C = CULTURES[REALMS[S.realm].kul];
      newWorld({ name: clean(S.name) || pick(S.female ? C.f : C.m), dyn: clean(S.dyn) || pick(C.d), female: S.female, start: S.start, realm: S.realm, traits: S.traits, base: S.base });
      SETUP = null;
      startGameUI();
    }, 30);
  };
  if ($('#contBtn')) $('#contBtn').onclick = () => { if (loadGame()) { afterLoad(); startGameUI(); } };
}

/* ---------- Oyun ekranı ---------- */
let _mapReady = false;
function startGameUI() {
  showScreen('game');
  if (!_mapReady) {
    setupMap($('#mapcv'));
    setupJoystick($('#joy'));
    setupJoystick($('#bjoy'));
    _mapReady = true;
    $('#tools').innerHTML = [['ben', '👤', 'Ben'], ['kisiler', '👥', 'Kişiler'], ['ordu', '⚔️', 'Ordu'], ['topraklar', '🏰', 'Toprak'], ['dunya', '🌍', 'Dünya'], ['eylem', '⚡', 'Eylem'], ['gunluk', '📜', 'Günlük']]
      .map(([k, i, l]) => `<button data-drawer="${k}"><span>${i}</span>${l}</button>`).join('');
    $('#tools').querySelectorAll('[data-drawer]').forEach(b => b.onclick = () => openDrawer(b.dataset.drawer));
    $('#drawer .dx').onclick = closeDrawer;
  }
  const pp = playerParty();
  if (pp) { CAM.x = pp.x; CAM.y = pp.y; }
  CAM.z = 26; CAM.follow = true;
  resizeMap();
  UI.waiting = false;
  updateHUD();
  processQueue();
}
function updateHUD() {
  if (!G || UI.screen !== 'game') return;
  const p = P(), pp = playerParty();
  const n = pp ? troopCount(pp) : 0;
  if (setHTML($('#hudL'), `
    <button class="who">${avatar(p, 38)}<div><b>${esc(nm(p))}</b><small>${esc(titleOf(p))}</small></div></button>
    <div class="res">
      <span>💰${p.gold}</span><span>⭐${Math.round(p.prestige)}</span><span>🪖${n}${pp ? '/' + partyCap(p) : ''}</span>
      <span class="${p.health < 40 ? 'warn' : ''}">❤️${Math.round(p.health)}</span><span class="${p.stress > 70 ? 'warn' : ''}">😰${Math.round(p.stress)}</span>
      <span class="apd" title="Bu ayki entrika hakkı">${'<i class="on"></i>'.repeat(G.ap)}${'<i></i>'.repeat(Math.max(0, AP_MAX - G.ap))}</span>
    </div>`)) $('#hudL .who').onclick = () => openSheet(P().id);
  if (setHTML($('#hudR'), `<span class="date">${(G.day % 30) + 1} ${MONTHS[G.month]} ${G.year}</span>
    <button id="spd" title="Hız">${UI.speed === 1 ? '▶' : UI.speed === 3 ? '▶▶' : '▶▶▶'}</button>
    <button id="menuBtn" title="Menü">☰</button>`)) {
    $('#spd').onclick = () => { UI.speed = UI.speed === 1 ? 3 : UI.speed === 3 ? 6 : 1; updateHUD(); };
    $('#menuBtn').onclick = openMenu;
  }
  const btns = [];
  let status = '';
  if (!pp) {
    if (p.prisonerOf) status = `⛓️ ${esc(nm(ch(p.prisonerOf)))} seni zindanda tutuyor.`;
    if (p.prisonerOf) { btns.push(['kacis', '🏃 Kaçmayı dene']); if (p.gold >= 30) btns.push(['gardiyan', '🔑 Rüşvet (30💰)']); }
  } else {
    const s = nearestSettlement(pp.x, pp.y);
    if (s && dist(pp, s) < ENTER_DIST) {
      const hostile = s.holder != null && hostileChars(p, ch(s.holder));
      if (hostile) {
        if (pp.mode === 'siege' && s.siege && s.siege.by === pp.id) status = `🔥 ${s.name} kuşatılıyor · ${s.siege.days}/3 gün · Garnizon ${s.garrison}`;
        else if (n > 0) btns.push(['siege:' + s.id, `🔥 ${s.name} kuşat`]);
      } else btns.push(['enter:' + s.id, `🏰 ${s.name}`]);
    }
    if (pp.tx != null || pp.chase != null) btns.push(['stop', '✋ Dur']);
  }
  btns.push(['wait', UI.waiting ? '⏸ Durdur' : '⏳ Bekle']);
  if (!CAM.follow && pp) btns.push(['center', '🎯']);
  if (setHTML($('#ctxbar'), btns.map(([k, l]) => `<button data-c="${k}" class="${k === 'wait' && UI.waiting ? 'on' : ''}">${l}</button>`).join('')))
    $('#ctxbar').querySelectorAll('[data-c]').forEach(b => b.onclick = () => ctxAction(b.dataset.c));
  const wars = enemiesOf(realmOf(p));
  if (!status && UI.waiting) status = '⏳ Zaman akıyor…';
  if (!status && wars.length) status = `⚔️ Savaşta: ${wars.map(r => esc(r.name)).join(', ')}`;
  setHTML($('#status'), status);
  $('#status').classList.toggle('hidden', !status);
}
function ctxAction(k) {
  const pp = playerParty();
  if (k === 'wait') UI.waiting = !UI.waiting;
  else if (k === 'center') CAM.follow = true;
  else if (k === 'stop') { if (pp) { pp.tx = pp.ty = null; pp.chase = null; } }
  else if (k === 'kacis' || k === 'gardiyan') doAction(k, null);
  else if (k.startsWith('enter:')) openSettlement(G.titles[k.slice(6)]);
  else if (k.startsWith('siege:')) {
    const s = G.titles[k.slice(6)];
    askConfirm(`${esc(s.name)} kuşatılacak. Garnizon: ${s.garrison} asker (gücü ~${garrisonPower(s)}, seninki ~${partyPower(pp)}). Üç gün sonra hücum edebilirsin.`, () => { startPlayerSiege(s); UI.waiting = true; updateHUD(); }, () => {});
  }
  updateHUD();
}
function isTimeFlowing() {
  const pp = playerParty();
  const [vx, vy] = moveInput();
  return (pp && Math.hypot(vx, vy) > 0.08) || UI.waiting || !!(pp && (pp.tx != null || pp.chase != null || pp.mode === 'siege'));
}
function paused() { return !!UI.modal || !!UI.drawer || (G && G.queue.length > 0); }

/* ---------- Ana döngü ---------- */
let _lastT = 0, _hudT = 0;
function loop(t) {
  const dt = Math.min(0.1, (t - _lastT) / 1000 || 0);
  _lastT = t;
  try {
    if (UI.screen === 'game' && G && !G.over) { tickMap(dt); if (UI.screen === 'game') drawMap(t); _hudT += dt; if (_hudT > 0.3) { _hudT = 0; updateHUD(); } }
    else if (UI.screen === 'battle' && B) { battleStep(Math.min(dt, 0.05)); if (B) { drawBattle(); updateBattleHUD(); } }
  } catch (e) { console.error(e); }
  requestAnimationFrame(loop);
}
function tickMap(dt) {
  if (G.queue.length && !UI.modal) { processQueue(); return; }
  if (paused()) return;
  const pp = playerParty();
  const [vx, vy] = moveInput();
  const moving = pp && Math.hypot(vx, vy) > 0.08;
  if (!isTimeFlowing()) return;
  hidePopup();
  const dd = dt / DAY_SEC * UI.speed;
  if (moving) {
    steerPlayer(vx, vy, dd);
    if (pp.mode === 'siege') { const s = G.titles[pp.sid]; if (s && s.siege && s.siege.by === pp.id) s.siege = null; pp.mode = 'idle'; }
  }
  const day0 = G.day;
  const foe = advanceTime(dd);
  if (G.over) { closeDrawer(); renderGameOver(); return; }
  if (G.day !== day0) onNewDay();
  if (foe) { UI.waiting = false; openEncounter(foe); }
}
function onNewDay() {
  const pp = playerParty();
  if (pp) { G.lastX = pp.x; G.lastY = pp.y; }
  if (pp && pp.mode === 'siege') {
    const s = G.titles[pp.sid];
    if (!s || !s.siege || s.siege.by !== pp.id) { pp.mode = 'idle'; return; }
    s.siege.days++;
    if (s.siege.days >= 3 && !s.siege.asked) { s.siege.asked = true; UI.waiting = false; openAssault(s); }
  }
}

/* ---------- Harita açılır kartı ---------- */
function showPopup(info, cx, cy) {
  const el = $('#popup'), p = P(), pp = playerParty();
  let html = '';
  if (info.kind === 'sett') {
    const s = info.obj, h = ch(s.holder), r = s.liege ? G.titles[s.liege] : null;
    const hostile = h && hostileChars(p, h);
    html = `<h3>${s.kind === 'sehir' ? '🏙️' : '🏰'} ${esc(s.name)}${s.capital ? ' ★' : ''}</h3>
      <p>${r ? swatch(r.color) + esc(r.name) : 'Bağımsız'}</p>
      <p class="small">Sahibi: ${h ? `<a data-open="${h.id}">${esc(nm(h))}</a>` : '—'}${hostile ? ' <b class="bad">· DÜŞMAN</b>' : ''}</p>
      <p class="small">Garnizon ${s.garrison} · Refah %${Math.round((s.prosperity || 1) * 100)}${s.siege ? ' · 🔥 Kuşatma altında' : ''}</p>
      <div class="pbtns">${pp ? '<button data-pp="go">🚶 Oraya git</button>' : ''}<button data-pp="info">📋 Ayrıntı</button></div>`;
    el.innerHTML = html;
    const go = el.querySelector('[data-pp="go"]');
    if (go) go.onclick = () => { pp.chase = null; pp.tx = s.x; pp.ty = s.y + 0.05; CAM.follow = true; hidePopup(); };
    el.querySelector('[data-pp="info"]').onclick = () => { hidePopup(); openSettlement(s); };
  } else if (info.kind === 'party') {
    const pt = info.obj, c = ch(pt.owner), isMe = pt.kind === 'player';
    const r = c ? realmOf(c) : null;
    const hostile = !isMe && pp && hostileParties(pp, pt);
    const myP = pp ? partyPower(pp) : 0, theirP = partyPower(pt);
    html = `<h3>${pt.kind === 'bandit' ? '☠️ ' + esc(pt.name) : isMe ? '⚜️ Senin ordun' : '🚩 ' + esc(nm(c))}</h3>
      ${r ? `<p>${swatch(r.color)}${esc(r.name)}</p>` : ''}
      <p class="small">${troopCount(pt)} asker · güç ${theirP}${!isMe && pp ? ` (seninki ${myP})` : ''}${hostile ? ' <b class="bad">· DÜŞMAN</b>' : ''}</p>
      ${!isMe ? `<p class="small muted">${{ siege: 'Kuşatmaya gidiyor', chase: 'Birini kovalıyor', flee: 'Kaçıyor', home: 'Evine dönüyor', patrol: 'Devriyede', wander: 'Av arıyor' }[pt.mode] || 'Bekliyor'}</p>` : ''}
      <div class="pbtns">
        ${isMe ? '<button data-pp="army">⚔️ Ordu</button>' : ''}
        ${!isMe && pp ? '<button data-pp="follow">🚶 Takip et</button>' : ''}
        ${!isMe && c ? '<button data-pp="sheet">💬 Konuş</button>' : ''}
        ${!isMe && pp ? '<button data-pp="attack" class="danger">⚔️ Saldır</button>' : ''}
      </div>`;
    el.innerHTML = html;
    const on = (k, f) => { const b = el.querySelector(`[data-pp="${k}"]`); if (b) b.onclick = () => { hidePopup(); f(); }; };
    on('army', () => openDrawer('ordu'));
    on('follow', () => { pp.tx = pp.x; pp.ty = pp.y; pp.chase = pt.id; CAM.follow = true; });
    on('sheet', () => openSheet(c.id));
    on('attack', () => playerAttack(pt));
  } else {
    if (!pp) return;
    html = `<h3>📍 ${isLand(info.x, info.y) ? 'Kara' : 'Deniz (gemiyle, yavaş)'}</h3><div class="pbtns"><button data-pp="go">🚶 Buraya git</button></div>`;
    el.innerHTML = html;
    el.querySelector('[data-pp="go"]').onclick = () => { pp.chase = null; pp.tx = info.x; pp.ty = info.y; CAM.follow = true; hidePopup(); };
  }
  el.querySelectorAll('[data-open]').forEach(a => a.onclick = () => { hidePopup(); openSheet(+a.dataset.open); });
  el.classList.remove('hidden');
  const W = window.innerWidth, H = window.innerHeight, w = el.offsetWidth, h = el.offsetHeight;
  el.style.left = clamp(cx + 12, 8, W - w - 8) + 'px';
  el.style.top = clamp(cy - h / 2, 8, H - h - 8) + 'px';
}
function hidePopup() { const el = $('#popup'); if (el) el.classList.add('hidden'); }
function playerAttack(pt) {
  const pp = playerParty(), p = P(), c = ch(pt.owner);
  const go = () => {
    if (dist(pp, pt) < 1.2) openEncounter(pt);
    else { pp.tx = pp.x; pp.ty = pp.y; pp.chase = pt.id; CAM.follow = true; }
  };
  if (hostileParties(pp, pt)) return go();
  const r = realmOf(c), mine = realmOf(p);
  const treason = r && mine && r === mine;
  askConfirm(treason
    ? `<b>${esc(nm(c))}</b> kendi krallığından! Saldırırsan bu <b>ihanet</b> sayılır. Efendin ve tüm krallık sana düşman olur.`
    : `<b>${esc(nm(c))}</b> ile savaşta değilsin. Saldırırsan ${r ? esc(r.name) : 'o'} sana kan davası açar (6 ay).`, () => {
    if (r) G.feud.push({ r: r.id, until: G.day + 180 }); else G.personalFoes.push(c.id);
    if (treason) { const l = ch(p.lordId); if (l) addOp(l, p, -50); p.shame += 20; if (p.lordId != null && !p.titles.length) p.lordId = null; }
    addOp(c, p, -40);
    log(`⚔️ ${nm(c)} ordusuna saldırdın!`, 'war');
    go();
  }, () => {});
}

/* ---------- Karşılaşma ve savaş ---------- */
function openEncounter(foe) {
  const pp = playerParty();
  if (!pp || !G.parties.includes(foe)) return;
  pp.chase = null; pp.tx = pp.ty = null;
  const c = ch(foe.owner);
  const name = foe.kind === 'bandit' ? foe.name : `${nm(c)} ordusu`;
  const mp = partyPower(pp), tp = partyPower(foe);
  const runC = clamp(Math.round(45 + (partySpeed(pp) - partySpeed(foe)) * 150 + (troopCount(pp) < 10 ? 15 : 0)), 10, 90);
  const ratio = mp / Math.max(1, tp);
  const odds = ratio > 1.6 ? '<b class="good">Ezici üstünlük sende</b>' : ratio > 1.1 ? '<b class="good">Avantaj sende</b>' : ratio > 0.8 ? '<b class="mid">Denk güçler</b>' : ratio > 0.5 ? '<b class="bad">Düşman daha güçlü</b>' : '<b class="bad">Ölümcül tehlike</b>';
  showModal(`<div class="event"><h2>⚔️ ${esc(name)}</h2>
    <div class="etext">${foe.kind === 'bandit' ? 'Eşkıyalar silahlarını çekip yolunu kesti!' : `${esc(nm(c))} sancakları karşında dalgalanıyor.`}
    <div class="vs"><div><b>Sen</b>${troopCount(pp)} asker<br>güç ${mp}</div><div class="vsx">⚔</div><div><b>${foe.kind === 'bandit' ? 'Eşkıyalar' : 'Düşman'}</b>${troopCount(foe)} asker<br>güç ${tp}</div></div>${odds}</div>
    <div class="eopts">
      <button class="opt primary" data-e="fight">⚔️ Savaş! (komuta et)</button>
      <button class="opt" data-e="auto">🎲 Komutanlara bırak (otomatik)</button>
      <button class="opt" data-e="run">🏃 Kaçmayı dene (%${runC})</button>
    </div></div>`, 'event');
  const m = $('#modal');
  m.querySelector('[data-e="fight"]').onclick = () => { closeModal(); fieldBattle(pp, foe); };
  m.querySelector('[data-e="auto"]').onclick = () => {
    const r = autoBattle(pp, foe);
    const won = r.W === pp;
    pp.ignore = pp.ignore || {}; pp.ignore[foe.id] = G.day + 2;
    log(`⚔️ ${won ? 'Zafer' : 'Yenilgi'}: ${name}. ${r.notes.join(' ')}`, won ? 'good' : 'bad');
    if (G.over) { closeModal(); return renderGameOver(); }
    resultModal(`${won ? '<h2 class="good">🏆 Zafer!</h2>' : '<h2 class="bad">💀 Yenilgi</h2>'}<p>Senin kayıpların: ${lossText(won ? r.lw : r.ll)}</p><p>Düşman kayıpları: ${lossText(won ? r.ll : r.lw)}</p><p>${r.notes.join('<br>')}</p>`);
  };
  m.querySelector('[data-e="run"]').onclick = () => {
    pp.ignore = pp.ignore || {};
    if (chance(runC / 100)) {
      pp.ignore[foe.id] = G.day + 2; foe.stun = 1;
      resultModal('<p>Atlarını mahmuzladın ve düşmanı geride bıraktın.</p>');
    } else {
      const lost = applyLosses(pp, 0.15);
      pp.ignore[foe.id] = G.day + 1; foe.stun = 1;
      resultModal(`<p>Kaçarken artçıların yakalandı. Kayıplar: ${lossText(lost)}</p>`);
    }
  };
}
function resultModal(html) {
  showModal(`<div class="event"><div class="etext">${html}</div><div class="eopts"><button class="opt primary" data-next>Devam</button></div></div>`, 'event');
  $('#modal').querySelector('[data-next]').onclick = () => { closeModal(); saveGame(); updateHUD(); processQueue(); };
}
function fieldBattle(pp, foe) {
  const lp = partyPower(foe);
  const c = ch(foe.owner);
  startBattle({
    A: pp, enemy: { troops: foe.troops, leaderId: foe.kind === 'bandit' ? null : foe.owner, name: foe.kind === 'bandit' ? foe.name : nm(c) }, siege: null,
    onEnd: res => {
      const p = P();
      for (const k in res.lossA) { pp.troops[k] -= res.lossA[k]; if (pp.troops[k] <= 0) delete pp.troops[k]; }
      if (G.parties.includes(foe)) for (const k in res.lossB) { foe.troops[k] -= res.lossB[k]; if (foe.troops[k] <= 0) delete foe.troops[k]; }
      pp.ignore = pp.ignore || {}; pp.ignore[foe.id] = G.day + 2;
      let notes = [];
      if (res.heroDown) { p.health -= 35; addTrait(p, 'yarali'); }
      if (res.retreated) foe.stun = 1;
      else if (res.won) { if (G.parties.includes(foe)) notes = battleAftermath(pp, foe, { loserPower: lp, heroDown: res.leaderDown }); }
      else notes = battleAftermath(foe, pp, { heroDown: res.heroDown });
      if (p.alive && p.health <= 0) die(p, 'Savaşta aldığı yaralar');
      log(`⚔️ ${res.won ? 'Zafer' : res.retreated ? 'Geri çekilme' : 'Yenilgi'}. ${notes.join(' ')}`, res.won ? 'good' : 'bad');
      return notes;
    },
  });
}
function openAssault(s) {
  const pp = playerParty();
  showModal(`<div class="event"><h2>🔥 ${esc(s.name)} kuşatması</h2>
    <div class="etext">Merdivenler hazır, koçbaşı kapıya dayandı. Surlarda ${s.garrison} savunucu bekliyor.
    <div class="vs"><div><b>Sen</b>${troopCount(pp)} asker<br>güç ${partyPower(pp)}</div><div class="vsx">⚔</div><div><b>Garnizon</b>${s.garrison} asker<br>güç ${garrisonPower(s)}</div></div></div>
    <div class="eopts">
      <button class="opt primary" data-e="fight">⚔️ Hücum! (komuta et)</button>
      <button class="opt" data-e="auto">🎲 Komutanlara bırak</button>
      <button class="opt" data-e="wait">⏳ Kuşatmaya devam et</button>
      <button class="opt" data-e="lift">🏳️ Kuşatmayı kaldır</button>
    </div></div>`, 'event');
  const m = $('#modal');
  m.querySelector('[data-e="fight"]').onclick = () => { closeModal(); siegeBattle(pp, s); };
  m.querySelector('[data-e="auto"]').onclick = () => {
    const ok = siegeAssault(pp, s);
    pp.mode = 'idle';
    resultModal(ok ? `<h2 class="good">🏆 ${esc(s.name)} düştü!</h2>` : '<h2 class="bad">💀 Hücum püskürtüldü</h2><p>Askerlerin surların dibinde kaldı.</p>');
  };
  m.querySelector('[data-e="wait"]').onclick = () => { s.siege.asked = false; s.siege.days = 1; closeModal(); UI.waiting = true; };
  m.querySelector('[data-e="lift"]').onclick = () => { s.siege = null; pp.mode = 'idle'; closeModal(); };
}
function siegeBattle(pp, s) {
  const g = s.garrison;
  startBattle({
    A: pp, enemy: { troops: { piyade: Math.round(g * 0.6), okcu: Math.round(g * 0.4) }, leaderId: null, name: s.name }, siege: s,
    onEnd: res => {
      const p = P();
      for (const k in res.lossA) { pp.troops[k] -= res.lossA[k]; if (pp.troops[k] <= 0) delete pp.troops[k]; }
      if (res.heroDown) { p.health -= 35; addTrait(p, 'yarali'); }
      pp.mode = 'idle';
      const notes = [];
      if (res.won) captureSettlement(s, p);
      else {
        const killed = Object.values(res.lossB).reduce((a, b) => a + b, 0);
        s.garrison = Math.max(5, s.garrison - killed);
        s.siege = null;
        notes.push(`Garnizon ${killed} kayıp verdi.`);
      }
      if (p.alive && p.health <= 0) die(p, 'Kuşatmada aldığı yaralar');
      return notes;
    },
  });
}

/* ---------- Savaş ekranı arayüzü ---------- */
function showBattleUI(o) {
  showScreen('battle');
  const cv = $('#bcv');
  const d = Math.min(2, window.devicePixelRatio || 1);
  cv.width = cv.clientWidth * d; cv.height = cv.clientHeight * d; cv._d = d;
  $('#border').innerHTML = [['hucum', '⚔️ Hücum'], ['bekle', '🛡️ Bekle'], ['takip', '🚩 Takip'], ['geri', '🏳️ Çekil'], ['ov', '🔭']]
    .map(([k, l]) => `<button data-o="${k}">${l}</button>`).join('');
  $('#border').querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
    if (!B) return;
    const k = b.dataset.o;
    if (k === 'ov') B.overview = !B.overview;
    else if (k === 'geri') { if (!B.over) endBattle(false, true); }
    else { B.order = k; B.msg = { hucum: 'Askerlerine HÜCUM emri verdin!', bekle: 'Askerlerin mevzilerini koruyor.', takip: 'Askerlerin seni takip ediyor.' }[k]; B.msgT = B.t; }
  });
  B.msg = o.siege ? `${o.siege.name} surlarına hücum! Kapıdan gir.` : `${o.enemy.name} karşında. Emir ver!`;
  B.msgT = 0;
}
function updateBattleHUD() {
  const a = B.units.filter(u => u.side === 0 && u.state === 'ok').length, b = B.units.filter(u => u.side === 1 && u.state === 'ok').length;
  const hero = B.hero;
  $('#btop').innerHTML = `<span class="sa">🛡️ ${a * B.scale}</span><span class="bt">${Math.floor(B.t / 60)}:${String(Math.floor(B.t % 60)).padStart(2, '0')}</span><span class="sb">${b * B.scale} ⚔️</span>
    <div class="hhp"><small>${esc(hero.name)}</small>${bar(Math.max(0, hero.hp), hero.max, 'hp')}</div>`;
  $('#border').querySelectorAll('[data-o]').forEach(x => x.classList.toggle('on', x.dataset.o === B.order || (x.dataset.o === 'ov' && B.overview)));
  const m = $('#bmsg');
  const show = B.msg && B.t - (B.msgT || 0) < 3.5;
  m.textContent = show ? B.msg : '';
  m.classList.toggle('hidden', !show);
}
function showBattleEnd() {
  const r = B.result;
  const notes = B.o.onEnd(r) || [];
  const title = r.retreated ? '<h2 class="mid">🏳️ Geri çekildin</h2>' : r.won ? '<h2 class="good">🏆 Zafer!</h2>' : '<h2 class="bad">💀 Yenilgi</h2>';
  B = null;
  saveGame();
  if (G.over) { renderGameOver(); return; }
  showScreen('game');
  resultModal(`${title}<p>Senin kayıpların: ${lossText(r.lossA)}</p><p>Düşman kayıpları: ${lossText(r.lossB)}</p>${r.heroDown ? '<p class="bad">Ağır yaralandın. (Sağlık -35)</p>' : ''}<p>${notes.join('<br>')}</p>`);
}

/* ---------- Şehir ---------- */
function openSettlement(s) { UI.sett = s.id; openDrawer('sett'); }
function settlementPanel(p) {
  const s = G.titles[UI.sett], pp = playerParty();
  if (!s) return '';
  const h = ch(s.holder), r = s.liege ? G.titles[s.liege] : null;
  const hostile = h && hostileChars(p, h);
  const here = pp && dist(pp, s) < ENTER_DIST + 0.1 && !hostile;
  const cap = partyCap(p), n = pp ? troopCount(pp) : 0;
  let html = `<div class="card"><p>${r ? swatch(r.color) + esc(r.name) : 'Bağımsız'} · ${s.kind === 'sehir' ? 'Şehir' : 'Kale'}${s.capital ? ' · Başkent' : ''}</p>
    <p class="small">Sahibi: ${h ? `<a data-open="${h.id}">${esc(nm(h))}</a>` : '—'}${hostile ? ' <b class="bad">· DÜŞMAN</b>' : ''} · Garnizon ${s.garrison} · Refah %${Math.round((s.prosperity || 1) * 100)}</p></div>`;
  if (here) {
    html += `<h3>🛡️ Asker topla <small class="muted">(${n}/${cap})</small></h3><div class="recruit">`;
    for (const k of Object.keys(s.pool)) {
      const T = TROOPS[k], off = s.pool[k] < 1 || p.gold < T.cost || n >= cap;
      html += `<div class="rrow"><span class="ri">${T.ikon}</span><span class="rn">${T.ad}<small>${T.cost}💰 · maaş ${T.wage}/ay · mevcut ${s.pool[k]}</small></span>
        <button data-rec="${k}:1" ${off ? 'disabled' : ''}>+1</button><button data-rec="${k}:5" ${off ? 'disabled' : ''}>+5</button></div>`;
    }
    html += '</div>';
    if (s.kind === 'sehir' && pp.troops.milis) html += `<button class="wide" data-sa="train">⬆️ Milisleri piyade yap (15💰/kişi, ${pp.troops.milis} milis)</button>`;
    html += '<button class="wide" data-sa="rest">🛏️ Dinlen (5 gün: sağlık +20, stres -10)</button>';
    html += '<button class="wide" data-sa="tavern">🍺 Meyhaneye uğra (5💰)</button>';
    if (s.holder === p.id) {
      html += '<button class="wide" data-sa="garr">🏯 Garnizonu güçlendir (+10 asker, 100💰)</button>';
      if ((pp.troops.piyade || 0) >= 10) html += '<button class="wide" data-sa="leave">📦 10 piyadeyi garnizona bırak</button>';
    }
  } else if (pp && !hostile) html += `<p class="muted">Asker toplamak için oraya gitmelisin.</p><button class="wide" data-sa="go">🚶 ${esc(s.name)} yoluna çık</button>`;
  else if (pp && hostile) html += `<p class="muted">Bu düşman toprağı. Yanına gidip kuşatabilirsin.</p><button class="wide" data-sa="go">🚶 ${esc(s.name)} üzerine yürü</button>`;
  if (h && h.id !== p.id) html += `<button class="wide" data-open="${h.id}">👑 ${esc(nm(h))} ile görüş</button>`;
  return html;
}
function bindSettlement(root) {
  const s = G.titles[UI.sett], p = P(), pp = playerParty();
  root.querySelectorAll('[data-rec]').forEach(b => b.onclick = () => {
    const [k, n] = b.dataset.rec.split(':');
    const got = playerRecruit(s, k, Math.min(+n, partyCap(p) - troopCount(pp)));
    if (got) toast(`${got} ${TROOPS[k].ad} ordusuna katıldı.`);
    renderDrawer(); updateHUD();
  });
  const on = (k, f) => { const b = root.querySelector(`[data-sa="${k}"]`); if (b) b.onclick = f; };
  on('train', () => { const n = Math.min(pp.troops.milis, Math.floor(p.gold / 15)); if (!n) return toast('Yeterli altın yok.'); p.gold -= n * 15; pp.troops.milis -= n; if (!pp.troops.milis) delete pp.troops.milis; pp.troops.piyade = (pp.troops.piyade || 0) + n; toast(`${n} milis piyade oldu.`); renderDrawer(); });
  on('rest', () => { closeDrawer(); p.health = Math.min(100, p.health + 20); stress(p, -10); passDays(5); });
  on('tavern', () => {
    if (p.gold < 5) return toast('5 altın gerekli.');
    p.gold -= 5; stress(p, -8);
    const id = pick(['kumar', 'hanci', 'sirSatici', 'fisilti', 'sarap', 'kehanet', 'askMektubu']);
    const ev = EVENTS[id];
    const d = ev.prep ? ev.prep(p) : {};
    closeDrawer();
    if (d) queueEvent(id, d); else toast('Meyhane bu gece sessizdi. Bir kadeh içip çıktın.');
    processQueue();
  });
  on('garr', () => { if (p.gold < 100) return toast('100 altın gerekli.'); p.gold -= 100; s.garrison += 10; renderDrawer(); });
  on('leave', () => { pp.troops.piyade -= 10; if (!pp.troops.piyade) delete pp.troops.piyade; s.garrison += 10; renderDrawer(); });
  on('go', () => { pp.chase = null; pp.tx = s.x; pp.ty = s.y + 0.05; CAM.follow = true; closeDrawer(); });
}
function passDays(n) {
  for (let i = 0; i < n; i++) {
    const day0 = G.day;
    const foe = advanceTime(1);
    if (G.day !== day0) onNewDay();
    if (G.over) { renderGameOver(); return; }
    if (foe) { openEncounter(foe); return; }
    if (G.queue.length) break;
  }
  updateHUD();
  processQueue();
}

/* ---------- Çekmece paneller ---------- */
const DRAWER_TITLES = { ben: '👤 Karakterin', kisiler: '👥 Kişiler', ordu: '⚔️ Ordun', topraklar: '🏰 Toprakların', dunya: '🌍 Dünya', eylem: '⚡ Eylemler', gunluk: '📜 Günlük' };
function openDrawer(k) { hidePopup(); UI.drawer = k; renderDrawer(); $('#drawer').classList.remove('hidden'); $('#drawer .dbody').scrollTop = 0; }
function closeDrawer() { UI.drawer = null; const d = $('#drawer'); if (d) d.classList.add('hidden'); updateHUD(); }
function renderDrawer() {
  if (!UI.drawer) return;
  const p = P();
  const body = $('#drawer .dbody');
  const sc = body.scrollTop;
  $('#drawer .dtitle').textContent = UI.drawer === 'sett' ? `🏰 ${G.titles[UI.sett].name}` : DRAWER_TITLES[UI.drawer];
  body.innerHTML = { ben: tabBen, kisiler: tabKisiler, ordu: tabOrdu, topraklar: tabToprak, dunya: tabDunya, eylem: tabEylem, gunluk: tabGunluk, sett: settlementPanel }[UI.drawer](p);
  body.scrollTop = sc;
  body.querySelectorAll('[data-open]').forEach(b => b.onclick = e => { e.stopPropagation(); openSheet(+b.dataset.open); });
  body.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { UI.filter = b.dataset.filter; renderDrawer(); });
  body.querySelectorAll('[data-act]').forEach(b => b.onclick = () => doAction(b.dataset.act, b.dataset.t ? +b.dataset.t : null));
  body.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { const s = G.titles[b.dataset.goto]; CAM.follow = false; CAM.x = s.x; CAM.y = s.y; CAM.z = Math.max(CAM.z, 24); closeDrawer(); });
  body.querySelectorAll('[data-dis]').forEach(b => b.onclick = () => { const [k, n] = b.dataset.dis.split(':'); const pp = playerParty(); pp.troops[k] = Math.max(0, pp.troops[k] - +n); if (!pp.troops[k]) delete pp.troops[k]; renderDrawer(); });
  bindTips(body);
  if (UI.drawer === 'sett') bindSettlement(body);
}
function personLine(c, p) {
  return `<button class="person" data-open="${c.id}">${avatar(c)}
    <div class="pi"><b>${esc(nm(c))}</b><small>${esc(titleOf(c))} · ${c.age} yaş</small><div class="tags">${tagsFor(p, c)}</div></div>
    ${c.alive && c.id !== p.id ? opBadge(opinion(c, p)) : ''}</button>`;
}
function tabBen(p) {
  const lord = ch(p.lordId), spouse = ch(p.spouseId);
  const kids = p.children.map(ch).filter(Boolean), lovers = p.lovers.map(ch).filter(Boolean);
  const heir = heirOf(p);
  const mySecrets = G.secrets.filter(s => s.actor === p.id || (s.target === p.id && s.type === 'pic'));
  const known = G.secrets.filter(s => s.actor !== p.id && s.known.includes(p.id) && !s.pub);
  const prisoners = living().filter(x => x.prisonerOf === p.id);
  const r = realmOf(p);
  let html = '';
  if (p.prisonerOf) html += `<div class="alert">⛓️ <b>${esc(nm(ch(p.prisonerOf)))}</b> seni zindanda tutuyor.</div>`;
  html += `<div class="card"><div class="hero">${avatar(p, 58)}<div><h2>${esc(nm(p))}</h2><p>${esc(titleOf(p))} · ${p.age} yaşında · ${G.generation}. nesil</p>
    <p class="small">${r ? swatch(r.color) + esc(r.name) : 'Hiçbir krallığa bağlı değilsin'}${lord ? ` · Efendin: <a data-open="${lord.id}">${esc(nm(lord))}</a>` : ''}</p></div></div>
    <div class="chips">${traitChips(p)}</div>${statGrid(p)}
    <div class="meters"><div><small>Sağlık</small>${bar(p.health, 100, 'hp')}</div><div><small>Stres</small>${bar(p.stress, 100, 'st')}</div></div>
    <p class="small">Aylık gelir ${income(p)}💰 · Korku ${Math.round(p.dread)} · Rezalet ${Math.round(p.shame)} · Zorbalık ${Math.round(p.tyranny)}</p></div>`;
  html += `<div class="card"><h3>🌳 Hanedan ${esc(p.dyn)}</h3>
    <p class="small">Varisin: ${heir ? `<a data-open="${heir.id}">${esc(nm(heir))}</a> (${heir.age})` : '<b class="bad">YOK. Ölürsen oyun biter!</b>'}</p>
    ${spouse ? personLine(spouse, p) : ''}${lovers.map(l => personLine(l, p)).join('')}${kids.map(k => personLine(k, p)).join('')}
    ${!spouse && !kids.length && !lovers.length ? '<p class="small muted">Henüz bir ailen yok.</p>' : ''}</div>`;
  if (prisoners.length) html += `<div class="card"><h3>⛓️ Zindanındakiler</h3>${prisoners.map(x => personLine(x, p)).join('')}</div>`;
  html += `<div class="card"><h3>🗝️ Bildiğin sırlar</h3>${known.length ? known.map(s => `<p class="secret">• ${esc(secretText(s))}</p>`).join('') : '<p class="small muted">Henüz kimsenin sırrını bilmiyorsun.</p>'}</div>`;
  html += `<div class="card"><h3>🩸 Senin sırların</h3>${mySecrets.length ? mySecrets.map(s => `<p class="secret ${s.pub ? 'pub' : ''}">• ${esc(secretText(s))}<small>${s.pub ? ' (herkes biliyor)' : ` (${s.known.length - 1} kişi biliyor)`}</small></p>`).join('') : '<p class="small muted">Vicdanın (şimdilik) temiz.</p>'}</div>`;
  return html;
}
function filterList(p) {
  const L = living().filter(c => c.id !== p.id);
  const pr = realmOf(p);
  switch (UI.filter) {
    case 'yakin': return L.filter(c => familyRel(p, c) || p.lovers.includes(c.id) || c.id === p.lordId || c.lordId === p.id ||
      (p.lordId != null && c.lordId === p.lordId) || c.prisonerOf === p.id || Math.abs(opinion(c, p)) >= 40);
    case 'krallik': return L.filter(c => pr && realmOf(c) === pr && c.rank >= 3);
    case 'hukumdar': return L.filter(c => c.rank === 5);
    case 'sirlar': return L.filter(c => knownSecretsOf(p, c).length);
    case 'esir': return L.filter(c => c.prisonerOf);
    default: return L;
  }
}
function tabKisiler(p) {
  const list = filterList(p).sort((a, b) => b.rank - a.rank || opinion(b, p) - opinion(a, p)).slice(0, 120);
  const fs = [['yakin', 'Yakınlar'], ['krallik', 'Krallığım'], ['hukumdar', 'Hükümdarlar'], ['sirlar', 'Sırlar'], ['esir', 'Esirler']];
  return `<div class="filters">${fs.map(([k, l]) => `<button data-filter="${k}" class="${UI.filter === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <p class="small muted">Sağdaki sayı onun sana bakışı. Birine dokun: entrika, evlilik, rüşvet, suikast…</p>
    ${list.map(c => personLine(c, p)).join('') || '<p class="muted">Kimse yok.</p>'}`;
}
function tabOrdu(p) {
  const pp = playerParty();
  if (!pp) return '<div class="alert">Ordun yok. Zindandasın ya da dağıldın.</div>';
  let wage = 0;
  for (const k in pp.troops) wage += pp.troops[k] * TROOPS[k].wage;
  const rows = Object.entries(pp.troops).filter(([, n]) => n > 0).map(([k, n]) => `<div class="rrow"><span class="ri">${TROOPS[k].ikon}</span><span class="rn">${TROOPS[k].ad} <b>× ${n}</b><small>Can ${TROOPS[k].hp} · Saldırı ${TROOPS[k].atk} · Zırh ${TROOPS[k].def}${TROOPS[k].range ? ' · Menzilli' : ''}</small></span><button data-dis="${k}:1">-1</button><button data-dis="${k}:5">-5</button></div>`).join('');
  return `<div class="card"><p><b>${troopCount(pp)}</b> / ${partyCap(p)} asker · Güç <b>${partyPower(pp)}</b> · Hız ${partySpeed(pp).toFixed(2)}</p>
    <p class="small">Aylık maaş: <b>${wage}💰</b> (gelirin ${income(p)}💰). Maaş ödenmezse askerler kaçar.</p></div>
    <div class="recruit">${rows || '<p class="muted">Ordunda hiç asker yok. Bir şehre girip asker topla.</p>'}</div>
    <p class="small muted">Asker kapasiten toprak, şan ve diplomasi yeteneğinle artar. "-" ile asker terhis edersin.</p>`;
}
function tabToprak(p) {
  const own = settlementsOf(p);
  const r = ownRealm(p);
  let html = '';
  if (r) html += `<div class="card"><h3>${swatch(r.color)} ${esc(r.name)}</h3><p class="small">${realmSettlements(r).length} yerleşim · Vasallar: ${living().filter(x => x.lordId === p.id && x.titles.length).length} · Savaşlar: ${enemiesOf(r).map(e => esc(e.name)).join(', ') || 'yok'}</p></div>`;
  if (!own.length) return html + '<p class="muted">Hiç toprağın yok. Efendinden toprak iste, düşman kalelerini kuşat ya da toprak sahibi biriyle evlen.</p>';
  html += own.map(s => `<div class="card sitem"><div><b>${s.kind === 'sehir' ? '🏙️' : '🏰'} ${esc(s.name)}${s.capital ? ' ★' : ''}</b><small>Garnizon ${s.garrison} · Gelir ~${Math.round((s.kind === 'sehir' ? 14 : 8) * (s.prosperity || 1))}💰/ay${s.siege ? ' · 🔥 KUŞATMADA' : ''}</small></div><button data-goto="${s.id}">📍</button></div>`).join('');
  return html;
}
function tabDunya(p) {
  const rs = realms().sort((a, b) => realmSettlements(b).length - realmSettlements(a).length);
  const wars = G.wars.map(w => `<p class="small">⚔️ ${swatch(G.titles[w.a].color)}${esc(G.titles[w.a].name)} × ${swatch(G.titles[w.b].color)}${esc(G.titles[w.b].name)}</p>`).join('');
  return `<div class="card"><h3>Süren savaşlar</h3>${wars || '<p class="small muted">Dünya şimdilik barış içinde.</p>'}</div>
    ${rs.map(r => { const k = ch(r.holder); return `<button class="person" ${k ? `data-open="${k.id}"` : ''}><i class="sw big" style="background:${r.color}"></i><div class="pi"><b>${esc(r.name)}</b><small>${k ? esc(nm(k)) : '—'} · ${realmSettlements(r).length} yerleşim</small></div>${k && k.id !== p.id ? opBadge(opinion(k, p)) : ''}</button>`; }).join('')}`;
}
function actionButton(a, p, t) {
  if (!a.show(p, t)) return '';
  const label = typeof a.ad === 'function' ? a.ad(p, t) : a.ad;
  let reason = a.req(p, t);
  if (!reason && G.ap < a.ap) reason = 'Bu ayki entrika hakkın bitti';
  const c = a.chance ? a.chance(p, t) : null;
  const inf = a.info ? a.info(p, t) : '';
  return `<button class="act ${reason ? 'off' : ''}" data-act="${a.id}" ${t ? `data-t="${t.id}"` : ''} ${reason ? 'disabled' : ''}>
    <span class="ai">${a.icon}</span><span class="al">${esc(label)}${inf ? `<small>${esc(inf)}</small>` : ''}${reason ? `<em>${esc(reason)}</em>` : ''}</span>
    <span class="am">${c != null ? `<b class="${c >= 60 ? 'good' : c >= 30 ? 'mid' : 'bad'}">%${c}</b>` : ''}${a.ap ? `<small>${a.ap}⚡</small>` : ''}</span></button>`;
}
function tabEylem(p) {
  return `<p class="small muted">Her ay ${AP_MAX} eylem hakkın var (⚡). Kişilere yönelik eylemler için birinin kartını aç.</p>
    <div class="acts">${ACTIONS.filter(a => !a.tgt).map(a => actionButton(a, p, null)).join('')}</div>`;
}
function tabGunluk() { return `<div class="log">${G.log.map(l => `<div class="le ${l.k}"><small>${l.d}</small><p>${l.m}</p></div>`).join('')}</div>`; }

/* ---------- Karakter kartı ---------- */
function openSheet(id) { hidePopup(); UI.sheet = id; UI.breakdown = false; renderSheet(); }
function renderSheet() {
  const t = ch(UI.sheet), p = P();
  if (!t) return closeModal();
  const self = t.id === p.id;
  const lord = ch(t.lordId), spouse = ch(t.spouseId);
  const o = self ? 0 : opinion(t, p), mine = self ? 0 : opinion(p, t);
  const parts = self ? [] : opinionParts(t, p);
  const secrets = self ? [] : G.secrets.filter(s => (s.actor === t.id || s.target === t.id) && knows(p, s));
  const kids = t.children.map(ch).filter(k => k && (k.alive || familyRel(p, k)));
  const pt = partyOf(t);
  const r = realmOf(t);
  const acts = !self && t.alive && !G.over ? ACTIONS.filter(a => a.tgt).map(a => actionButton(a, p, t)).join('') : '';
  showModal(`<div class="sheet two">
    <button class="x" data-close>✕</button>
    <div class="scol">
      <div class="hero">${avatar(t, 58)}<div><h2>${esc(nm(t))}${t.alive ? '' : ' †'}</h2>
        <p>${esc(titleOf(t))} · ${t.age} yaş${t.bastard ? ' · Gayrimeşru' : ''}</p>
        <p class="small">${r ? swatch(r.color) + esc(r.name) : 'Bağımsız'} · ${CULTURES[t.cul] ? CULTURES[t.cul].ad : ''}</p>
        ${t.alive ? '' : `<p class="small bad">${esc(t.death.reason)} (${t.death.d})</p>`}
        <div class="tags">${tagsFor(p, t)}</div></div></div>
      ${!self && t.alive ? `<div class="rel" data-bd><div><small>Sana bakışı</small>${opBadge(o)}</div><div><small>Senin ona</small>${opBadge(mine)}</div><span class="small muted">${UI.breakdown ? '▲' : '▼ neden?'}</span></div>
        ${UI.breakdown ? `<div class="bd">${parts.length ? parts.map(([l, v]) => `<p><span>${esc(l)}</span>${opBadge(v)}</p>`).join('') : '<p class="muted">Henüz bir fikri yok.</p>'}</div>` : ''}` : ''}
      <div class="chips">${traitChips(t)}</div>${statGrid(t)}
      <p class="small">💰 ${t.gold} · ⭐ ${Math.round(t.prestige)} · ❤️ ${Math.round(t.health)}${pt ? ` · 🪖 ${troopCount(pt)} asker` : ''}</p>
      <div class="links">
        ${lord ? `<p>Efendisi: <a data-open="${lord.id}">${esc(nm(lord))}</a></p>` : ''}
        ${spouse ? `<p>Eşi: <a data-open="${spouse.id}">${esc(nm(spouse))}</a></p>` : ''}
        ${t.prisonerOf ? `<p>⛓️ Esir tutan: <a data-open="${t.prisonerOf}">${esc(nm(ch(t.prisonerOf)))}</a></p>` : ''}
        ${settlementsOf(t).length ? `<p>Toprakları: ${settlementsOf(t).map(s => `<a data-goto="${s.id}">${esc(s.name)}</a>`).join(', ')}</p>` : ''}
        ${kids.length ? `<p>Çocukları: ${kids.map(k => `<a data-open="${k.id}">${esc(k.name)}${k.alive ? '' : '†'}</a>`).join(', ')}</p>` : ''}
        ${pt ? `<p><a data-showparty="${pt.id}">📍 Ordusunu haritada göster</a></p>` : ''}
      </div>
      ${secrets.length ? `<div class="card inner"><h3>🗝️ Bildiğin sırlar</h3>${secrets.map(s => `<p class="secret ${s.pub ? 'pub' : ''}">• ${esc(secretText(s))}</p>`).join('')}</div>` : ''}
    </div>
    ${acts ? `<div class="scol"><h3>Ne yapacaksın? <small class="muted">(${G.ap} ⚡)</small></h3><div class="acts">${acts}</div></div>` : ''}
  </div>`, 'sheet');
  const m = $('#modal');
  m.querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal);
  m.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openSheet(+b.dataset.open));
  m.querySelectorAll('[data-act]').forEach(b => b.onclick = () => doAction(b.dataset.act, +b.dataset.t));
  m.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { const s = G.titles[b.dataset.goto]; closeModal(); closeDrawer(); CAM.follow = false; CAM.x = s.x; CAM.y = s.y; CAM.z = Math.max(CAM.z, 24); });
  m.querySelectorAll('[data-showparty]').forEach(b => b.onclick = () => { const x = G.parties.find(q => q.id === +b.dataset.showparty); closeModal(); closeDrawer(); if (x) { CAM.follow = false; CAM.x = x.x; CAM.y = x.y; CAM.z = Math.max(CAM.z, 24); } });
  bindTips(m);
  const bd = m.querySelector('[data-bd]');
  if (bd) bd.onclick = () => { UI.breakdown = !UI.breakdown; renderSheet(); };
}

/* ---------- Eylem yürütme ---------- */
function askConfirm(text, onYes, onNo) {
  const back = UI.modal === 'sheet' ? UI.sheet : null;
  showModal(`<div class="event"><h2>Emin misin?</h2><div class="etext">${text}</div>
    <div class="eopts"><button class="opt primary" data-yes>Evet</button><button class="opt" data-no>Vazgeç</button></div></div>`, 'confirm');
  const m = $('#modal');
  m.querySelector('[data-yes]').onclick = () => { closeModal(); if (back != null) UI.sheet = back; onYes(); };
  m.querySelector('[data-no]').onclick = () => { closeModal(); if (onNo) onNo(); else if (back != null) openSheet(back); };
}
function doAction(aid, tid, confirmed) {
  const a = ACTION_MAP[aid], p = P(), t = tid != null ? ch(tid) : null;
  if (!a || G.over) return;
  if (G.ap < a.ap) return toast('Bu ayki entrika hakkın bitti. Zaman geçsin.');
  const reason = a.req(p, t);
  if (reason) return toast(reason);
  if (a.confirm && !confirmed) return askConfirm(esc(typeof a.confirm === 'function' ? a.confirm(t) : a.confirm), () => doAction(aid, tid, true));
  G.ap -= a.ap;
  const msg = a.run(p, t);
  if (msg) log(msg, 'player');
  saveGame();
  if (G.over) { closeModal(); closeDrawer(); renderGameOver(); return; }
  if (msg) toast(msg);
  if (G.queue.length || G.playerId !== p.id) { closeModal(); processQueue(); }
  else if (UI.sheet != null && t) renderSheet();
  else if (UI.modal) closeModal();
  if (UI.drawer) renderDrawer();
  updateHUD();
}

/* ---------- Modal ---------- */
function showModal(html, kind = 'sheet') {
  const m = $('#modal');
  UI.modal = kind;
  m.innerHTML = `<div class="backdrop"></div><div class="panel ${kind}">${html}</div>`;
  m.classList.remove('hidden');
  m.querySelector('.backdrop').onclick = () => { if (kind === 'sheet' || kind === 'menu') closeModal(); };
}
function closeModal() {
  const m = $('#modal');
  m.classList.add('hidden'); m.innerHTML = '';
  UI.modal = null; UI.sheet = null;
}
function processQueue() {
  if (UI.modal === 'event' || UI.modal === 'confirm' || UI.screen === 'battle' || !G) return;
  if (G.over) { closeModal(); return renderGameOver(); }
  while (G.queue.length) {
    const q = G.queue[0], ev = EVENTS[q.id], p = P();
    if (!ev || (ev.valid && !ev.valid(p, q.d))) { G.queue.shift(); continue; }
    const opts = ev.secenekler(p, q.d);
    showModal(`<div class="event"><h2>${typeof ev.baslik === 'function' ? ev.baslik(p, q.d) : ev.baslik}</h2>
      <div class="etext">${ev.metin(p, q.d)}</div>
      <div class="eopts">${opts.map((o, i) => `<button class="opt" data-i="${i}" ${!o.req || o.req() ? '' : 'disabled'}>${o.t}</button>`).join('')}</div></div>`, 'event');
    $('#modal').querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      const res = opts[+b.dataset.i].f();
      G.queue.shift();
      if (res) log(res, 'event');
      saveGame();
      if (G.over) { closeModal(); return renderGameOver(); }
      if (res) {
        showModal(`<div class="event"><div class="etext">${res}</div><div class="eopts"><button class="opt primary" data-next>Devam</button></div></div>`, 'event');
        $('#modal').querySelector('[data-next]').onclick = () => { closeModal(); updateHUD(); processQueue(); };
      } else { closeModal(); updateHUD(); processQueue(); }
    });
    return;
  }
}

/* ---------- Menü / Oyun sonu / Döndürme ---------- */
function openMenu() {
  showModal(`<div class="sheet"><button class="x" data-close>✕</button><h2>⚜️ Menü</h2>
    <div class="acts">
      <button class="act" id="mFull"><span class="ai">⛶</span><span class="al">Tam ekran</span></button>
      <button class="act" id="mHelp"><span class="ai">❓</span><span class="al">Nasıl oynanır?</span></button>
      <button class="act" id="mNew"><span class="ai">🔄</span><span class="al">Yeni oyun<em>Mevcut kayıt silinir</em></span></button>
    </div><p class="small muted">Oyun otomatik kaydedilir.</p></div>`, 'menu');
  const m = $('#modal');
  m.querySelector('[data-close]').onclick = closeModal;
  $('#mFull').onclick = () => {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    closeModal();
    if (!req) return toast('Tam ekran bu tarayıcıda desteklenmiyor.');
    try {
      Promise.resolve(req.call(el)).then(() => { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); }).catch(() => toast('Tam ekran burada açılamadı.'));
    } catch (e) { toast('Tam ekran burada açılamadı.'); }
  };
  $('#mNew').onclick = () => askConfirm('Mevcut oyunun silinecek.', () => { deleteSave(); G = null; closeDrawer(); renderSetup(); }, () => {});
  $('#mHelp').onclick = () => {
    showModal(`<div class="sheet"><button class="x" data-close>✕</button><h2>❓ Nasıl oynanır?</h2><div class="help">
      <p><b>🕹️ Hareket:</b> Sol alttaki joystick ile ordunu yürüt. Zaman sadece hareket ederken ya da "⏳ Bekle" açıkken akar. Haritaya dokunup "Buraya git" de diyebilirsin.</p>
      <p><b>🗺️ Harita:</b> Parmakla kaydır, iki parmakla yakınlaştır. Şehre, orduya ya da boş araziye dokun: bilgi ve uzaktan komutlar çıkar. 🎯 seni ordunun üstüne geri getirir.</p>
      <p><b>🏰 Şehirler:</b> Yanına gidince düğmesi çıkar. Asker topla, milisleri eğit, dinlen, meyhaneye uğra. Düşman şehrinde "Kuşat" çıkar: 3 gün sonra hücum edersin.</p>
      <p><b>⚔️ Savaş:</b> Düşmana çarpınca savaşabilir, otomatik çözebilir ya da kaçabilirsin. Savaş ekranında kahramanını joystickle yönet; düşmana yaklaşınca otomatik vurur. Askerlerine Hücum / Bekle / Takip emri ver. 🔭 tüm meydanı gösterir.</p>
      <p><b>💰 Ordu:</b> Askerler her ay maaş ister. Ödeyemezsen kaçarlar. Atlılar hızlı ve güçlüdür, okçular uzaktan vurur.</p>
      <p><b>👑 Yükseliş:</b> Köylü → Asker → Şövalye/Sipahi → Lord/Bey → Dük/Emir → Kral/Sultan. Efendinden toprak iste, düşman kalelerini al, isyan et ya da kendi krallığını ilan et.</p>
      <p><b>🗡️ Entrika:</b> Kişiler panelinden birine dokun: evlilik, baştan çıkarma, rüşvet, şantaj, suikast, iftira… Her ay ${AP_MAX} hakkın var.</p>
      <p><b>☠️ Ölüm:</b> Ölünce en büyük meşru çocuğunla devam edersin. Varisin yoksa hanedan biter.</p></div></div>`, 'menu');
    $('#modal').querySelector('[data-close]').onclick = closeModal;
  };
}
function renderGameOver() {
  showScreen('setup');
  const o = G.over;
  $('#setup').innerHTML = `<div class="setup over"><div class="scol">
    <div class="brand"><div class="logo">☠️</div><div><h1>Hanedan Sona Erdi</h1><p class="sub"><b>${esc(o.name)}</b>, ${o.age} yaşında öldü. ${esc(o.reason)}. ${o.d}</p></div></div>
    <div class="card"><p>Kurucu: <b>${esc(G.founder)}</b></p><p>Nesil: <b>${G.generation}</b> · Süre: <b>${Math.floor(G.monthsPlayed / 12)} yıl ${G.monthsPlayed % 12} ay</b></p></div>
    <button id="again" class="primary big">Yeni Hikâye</button></div>
    <div class="scol"><div class="log">${G.log.slice(0, 14).map(l => `<div class="le ${l.k}"><small>${l.d}</small><p>${l.m}</p></div>`).join('')}</div></div></div>`;
  $('#again').onclick = () => { deleteSave(); G = null; renderSetup(); };
}
function checkRotate() {
  const portrait = window.innerHeight > window.innerWidth * 1.05;
  const show = portrait && !UI.forcePortrait && (UI.screen === 'game' || UI.screen === 'battle');
  $('#rotate').classList.toggle('hidden', !show);
}

/* ---------- Başlat ---------- */
window.addEventListener('load', () => {
  $('#rotate').querySelector('button').onclick = () => { UI.forcePortrait = true; checkRotate(); };
  window.addEventListener('resize', () => {
    checkRotate();
    if (UI.screen === 'battle') { const cv = $('#bcv'), d = cv._d || 1; cv.width = cv.clientWidth * d; cv.height = cv.clientHeight * d; }
  });
  if (loadGame()) {
    if (G.over) renderGameOver();
    else { afterLoad(); startGameUI(); }
  } else renderSetup();
  requestAnimationFrame(loop);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
});
