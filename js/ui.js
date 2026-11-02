'use strict';
/* =========================================================
   Crown & Dagger — Arayüz (yatay ekran, tur tabanlı)
   ========================================================= */

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const UI = { screen: 'setup', drawer: null, filter: 'yakin', sheet: null, modal: null, breakdown: false, speed: 1, forcePortrait: false, sett: null, selProv: null };
let SETUP = null;

/* ---------- Simgeler (emoji yerine game-icons.net SVG'leri) ---------- */
const ICON_COLOR = {
  'two-coins': '#f0c050', 'crown-coin': '#f0c050', 'cash': '#9fd68a', 'receive-money': '#f0c050', 'laurel-crown': '#f1d27a', 'crown': '#f1c66c', 'trophy-cup': '#f1c66c',
  'heart-plus': '#e0574c', 'heart-drop': '#e0574c', 'drop': '#c8453a', 'broken-heart': '#e0574c', 'rose': '#e0577a', 'love-letter': '#f2a7cb', 'diamond-ring': '#bfe3f2',
  'fire': '#f07a2a', 'death-skull': '#e8e0d0', 'tombstone': '#b8b0a0', 'worried-eyes': '#e0b07a', 'despair': '#c79ae0', 'virus': '#9fd68a', 'snake': '#8cc46a',
  'power-lightning': '#f1c66c', 'dove': '#e8f0f4', 'flying-flag': '#e8e0d0', 'black-flag': '#a8967c', 'pirate-flag': '#a8967c', 'wheat': '#e8c35a', 'world': '#7fb7d9',
  'manacles': '#b8b0a0', 'crossed-swords': '#d8d0c0', 'castle': '#d8c8a8', 'village': '#d8c8a8', 'fleur-de-lys': '#f1c66c', 'help': '#a9c6ee', 'cut-diamond': '#9fe0f0',
};
const _EMO_SRC = '(' + Object.keys(EMOJI_ICON).sort((a, b) => b.length - a.length).map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\uFE0F?';
const _EMO_TEST = new RegExp(_EMO_SRC, 'u');
const _EMO_RE = new RegExp(_EMO_SRC, 'gu');
function ic(name, cls = '') {
  const d = ICONS[name];
  if (!d) return '';
  const col = ICON_COLOR[name];
  return `<i class="ic ${cls}"${col ? ` style="color:${col}"` : ''}><svg viewBox="0 0 512 512" aria-hidden="true"><path d="${d}"/></svg></i>`;
}
/* Metin düğümlerindeki emojileri simgeye çevir */
function iconizeNode(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => (n.parentNode && !n.parentNode.closest('.ic, script, style, textarea, input') && _EMO_TEST.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT) });
  const list = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) list.push(n);
  for (const n of list) {
    _EMO_RE.lastIndex = 0;
    const tpl = document.createElement('template');
    tpl.innerHTML = esc(n.nodeValue).replace(_EMO_RE, (m, e) => ic(EMOJI_ICON[e]) || m);
    n.parentNode.replaceChild(tpl.content, n);
  }
}
let _iconObs = null;
function startIconObserver() {
  iconizeNode(document.body);
  _iconObs = new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'characterData') { if (m.target.parentNode) iconizeNode(m.target.parentNode); continue; }
      for (const n of m.addedNodes) {
        if (n.nodeType === 3) { if (n.parentNode) iconizeNode(n.parentNode); }
        else if (n.nodeType === 1 && !n.classList.contains('ic')) iconizeNode(n);
      }
    }
  });
  _iconObs.observe(document.body, { childList: true, subtree: true, characterData: true });
}
/* Haritada (canvas) simge çiz */
const _iconPaths = {};
function drawIcon(ctx, name, x, y, size, color, outline) {
  const d = ICONS[name];
  if (!d) return;
  const p = _iconPaths[name] || (_iconPaths[name] = new Path2D(d));
  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(size / 512, size / 512);
  if (outline) { ctx.lineWidth = 512 / size * 2.5; ctx.strokeStyle = outline; ctx.lineJoin = 'round'; ctx.stroke(p); }
  ctx.fillStyle = color || ICON_COLOR[name] || '#fff';
  ctx.fill(p);
  ctx.restore();
}

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
function tierBadge(k) { return `<span class="tier">${ROMAN[TROOPS[k].tier]}</span>`; }
function tagsFor(p, t) {
  const tags = [];
  const rel = familyRel(p, t);
  if (rel) tags.push(['fam', rel === 'cocuk' && t.bastard ? L('Piç çocuğun', 'Your bastard') : relName(rel)]);
  if (p.lovers.includes(t.id)) tags.push(['love', L('Sevgili', 'Lover')]);
  if (p.lordId === t.id) tags.push(['lord', L('Efendin', 'Your liege')]);
  if (t.lordId === p.id) tags.push(['vas', t.titles.length ? L('Vasalın', 'Your vassal') : L('Sarayında', 'Your courtier')]);
  if (t.prisonerOf) tags.push(['jail', t.prisonerOf === p.id ? L('Senin esirin', 'Your prisoner') : L('Zindanda', 'Imprisoned')]);
  if (!t.alive) tags.push(['dead', L('Ölü', 'Dead')]);
  if (t.alive && hostileChars(p, t)) tags.push(['enemy', L('Savaştasınız', 'At war')]);
  const o = t.alive ? opinion(t, p) : 0;
  if (t.alive && o <= -50) tags.push(['enemy', L('Düşman', 'Rival')]);
  if (t.alive && o >= 60 && !rel) tags.push(['friend', L('Dost', 'Friend')]);
  if (knownSecretsOf(p, t).length) tags.push(['secret', L('Sırrını biliyorsun', 'You know a secret')]);
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
/* ---------- HUD ölçeği ---------- */
const UI_KEY = 'tvh-ui';
let UI_SCALE = (() => { try { const v = parseFloat(localStorage.getItem(UI_KEY)); return v >= 0.7 && v <= 1.5 ? v : 1; } catch (e) { return 1; } })();
function applyUIScale() { document.documentElement.style.setProperty('--ui', String(UI_SCALE)); }
function setUIScale(v) {
  UI_SCALE = Math.round(clamp(v, 0.7, 1.5) * 10) / 10;
  try { localStorage.setItem(UI_KEY, String(UI_SCALE)); } catch (e) { /* yok say */ }
  applyUIScale();
}
applyUIScale();
function langSwitch() {
  return `<div class="seg lang"><button data-lang="en" class="${LANG === 'en' ? 'on' : ''}">English</button><button data-lang="tr" class="${LANG === 'tr' ? 'on' : ''}">Türkçe</button></div>`;
}
function bindLang(root, after) { root.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => { setLang(b.dataset.lang); applyStaticText(); after(); }); }
function applyStaticText() {
  document.title = gameTitle();
  const rot = $('#rotate');
  if (rot) { rot.querySelector('h2').textContent = L('Telefonu yan çevir', 'Rotate your phone'); rot.querySelector('p').textContent = L(`${gameTitle()} yatay ekranda oynanır.`, `${gameTitle()} is played in landscape.`); rot.querySelector('button').textContent = L('Yine de dikey devam et', 'Continue in portrait anyway'); }
  const dx = $('#drawer .dx'); if (dx) dx.setAttribute('aria-label', L('Kapat', 'Close'));
  if (_mapReady) buildTools();
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
    ['koylu', L('🌾 Köylü', '🌾 Peasant'), L('Zor', 'Hard'), L('Hiçbir şeyin yok. Çamurdan taca tırman.', 'You have nothing. Climb from the mud to the crown.')],
    ['sovalye', east ? L('🏇 Sipahi', '🏇 Sipahi') : L('⚔️ Şövalye', '⚔️ Knight'), L('Orta', 'Normal'), L('Bir beyin hizmetinde, birkaç askerin var.', 'Sworn to a lord, with a few soldiers.')],
    ['lord', east ? '🏰 Bey' : '🏰 Lord', L('Kolay', 'Easy'), L('Bir kale ya da şehir, 30 asker.', 'A castle or city and 30 soldiers.')],
  ];
  const realmsSorted = Object.entries(REALMS).sort((a, b) => a[1].kisa.localeCompare(b[1].kisa, LANG));
  $('#setup').innerHTML = `
  <div class="setup">
    <div class="scol">
      <div class="brand"><div class="logo">⚜️</div><div><h1>${gameTitle()}</h1><p class="sub">Anno Domini 1180 · ${L('Hicri', 'Hijri')} 576</p></div></div>
      ${langSwitch()}
      <div class="row2">
        <label>${L('Adın', 'Name')}<input id="s-name" maxlength="16" placeholder="${L('Rastgele', 'Random')}" value="${esc(S.name)}"></label>
        <label>${L('Hanedan', 'Dynasty')}<input id="s-dyn" maxlength="16" placeholder="${L('Rastgele', 'Random')}" value="${esc(S.dyn)}"></label>
      </div>
      <div class="seg"><button data-g="0" class="${!S.female ? 'on' : ''}">♂ ${L('Erkek', 'Male')}</button><button data-g="1" class="${S.female ? 'on' : ''}">♀ ${L('Kadın', 'Female')}</button></div>
      <div class="starts">${starts.map(([k, t, d, desc]) => `<button class="start ${S.start === k ? 'on' : ''}" data-s="${k}" ${k === 'lord' && nSett < 2 ? 'disabled' : ''}><b>${t}</b><small>${d}</small><span>${desc}</span></button>`).join('')}</div>
      <div class="card"><div class="chips">${traitChips(fake)}</div>${statGrid(fake)}<button id="reroll" class="ghost">🎲 ${L('Zar at', 'Reroll')}</button></div>
    </div>
    <div class="scol">
      <h3>${L('Nereden başlıyorsun?', 'Where do you begin?')}</h3>
      <div class="realms">${realmsSorted.map(([k, r]) => `<button class="rbtn ${S.realm === k ? 'on' : ''}" data-r="${k}">${swatch(r.renk)}<span>${r.ad}</span><small>${CULTURES[r.kul].ad} · ${SETTLEMENTS.filter(s => s[4] === k).length} ${L('yerleşim', 'holdings')}</small></button>`).join('')}</div>
      <button id="startBtn" class="primary big">${L('Hikâyeni Başlat', 'Begin Your Story')}</button>
      ${hasSave() ? `<button id="contBtn" class="ghost">${L('Kayıtlı oyuna dön', 'Continue saved game')}</button>` : ''}
    </div>
  </div>`;
  $('#s-name').oninput = e => { S.name = e.target.value; };
  $('#s-dyn').oninput = e => { S.dyn = e.target.value; };
  document.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { S.female = b.dataset.g === '1'; renderSetup(); });
  document.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { S.start = b.dataset.s; renderSetup(); });
  document.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { S.realm = b.dataset.r; renderSetup(); });
  bindLang($('#setup'), renderSetup);
  $('#reroll').onclick = () => { S.traits = randomTraits(); S.base = randomBase(); renderSetup(); };
  bindTips($('#setup'));
  $('#startBtn').onclick = () => {
    const btn = $('#startBtn'); btn.textContent = L('Dünya kuruluyor…', 'Forging the world…'); btn.disabled = true;
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
function buildTools() {
  $('#tools').innerHTML = [['ben', '👤', L('Ben', 'Me')], ['kisiler', '👥', L('Kişiler', 'People')], ['ordu', '⚔️', L('Ordu', 'Army')], ['topraklar', '🏰', L('Toprak', 'Lands')], ['dunya', '🌍', L('Dünya', 'World')], ['eylem', '⚡', L('Eylem', 'Actions')], ['gunluk', '📜', L('Günlük', 'Log')]]
    .map(([k, i, l]) => `<button data-drawer="${k}"><span>${i}</span>${l}</button>`).join('');
  $('#tools').querySelectorAll('[data-drawer]').forEach(b => b.onclick = () => openDrawer(b.dataset.drawer));
}
function startGameUI() {
  showScreen('game');
  if (!_mapReady) {
    setupMap($('#mapcv'));
    setupJoystick($('#bjoy'));
    _mapReady = true;
    buildTools();
    $('#drawer .dx').onclick = closeDrawer;
    $('#endturn').onclick = endTurn;
  }
  const pp = playerParty();
  if (pp) { CAM.x = pp.x; CAM.y = pp.y; }
  CAM.z = 26; CAM.follow = true;
  resizeMap();
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
      <span title="${L('Altın', 'Gold')}">💰 ${p.gold}</span><span title="${L('Şan', 'Prestige')}">⭐ ${Math.round(p.prestige)}</span><span title="${L('Ordu', 'Army')}">🪖 ${n}${pp ? '/' + partyCap(p) : ''}</span>
      <span class="${p.health < 40 ? 'warn' : ''}" title="${L('Sağlık', 'Health')}">❤️ ${Math.round(p.health)}</span><span class="${p.stress > 70 ? 'warn' : ''}" title="${L('Stres', 'Stress')}">😰 ${Math.round(p.stress)}</span>
      <span class="apd" title="${L('Bu ayki entrika hakkı', 'Intrigue actions this month')}">${'<i class="on"></i>'.repeat(G.ap)}${'<i></i>'.repeat(Math.max(0, AP_MAX - G.ap))}</span>
    </div>`)) $('#hudL .who').onclick = () => openSheet(P().id);
  if (setHTML($('#hudR'), `<span class="date"><b>${(G.day % 30) + 1} ${monthName(G.month)} ${G.year}</b><small>${L('Tur', 'Turn')} ${G.turn || 1}</small></span>
    <button id="spd" title="${L('Tur hızı', 'Turn speed')}">${UI.speed === 1 ? '▶' : UI.speed === 2 ? '▶▶' : '▶▶▶'}</button>
    <button id="menuBtn" title="${L('Menü', 'Menu')}">☰</button>`)) {
    $('#spd').onclick = () => { UI.speed = UI.speed === 1 ? 2 : UI.speed === 2 ? 4 : 1; updateHUD(); };
    $('#menuBtn').onclick = openMenu;
  }
  const btns = [];
  let status = '';
  const busy = G.turnLeft > 0;
  if (!pp) {
    if (p.prisonerOf) status = L(`⛓️ ${esc(nm(ch(p.prisonerOf)))} seni zindanda tutuyor.`, `⛓️ ${esc(nm(ch(p.prisonerOf)))} holds you in the dungeon.`);
    if (p.prisonerOf && !busy) { btns.push(['kacis', L('🏃 Kaçmayı dene', '🏃 Try to escape')]); if (p.gold >= 30) btns.push(['gardiyan', L('🔑 Rüşvet (30💰)', '🔑 Bribe (30💰)')]); }
  } else if (!busy) {
    const s = nearestSettlement(pp.x, pp.y);
    if (s && dist(pp, s) < ENTER_DIST) {
      const hostile = s.holder != null && hostileChars(p, ch(s.holder));
      if (hostile) {
        if (pp.mode === 'siege' && s.siege && s.siege.by === pp.id) status = L(`🔥 ${s.name} kuşatılıyor · ${s.siege.days}/3 gün · Garnizon ${s.garrison}`, `🔥 Besieging ${s.name} · day ${s.siege.days}/3 · Garrison ${s.garrison}`);
        else if (n > 0) btns.push(['siege:' + s.id, L(`🔥 ${s.name} kuşat`, `🔥 Besiege ${s.name}`)]);
      } else btns.push(['enter:' + s.id, `🏰 ${s.name}`]);
    }
    if ((pp.path && pp.path.length) || pp.chase != null) btns.push(['stop', L('✋ Rotayı iptal et', '✋ Cancel route')]);
  }
  if (!CAM.follow && pp) btns.push(['center', '🎯']);
  if (setHTML($('#ctxbar'), btns.map(([k, l]) => `<button data-c="${k}">${l}</button>`).join('')))
    $('#ctxbar').querySelectorAll('[data-c]').forEach(b => b.onclick = () => ctxAction(b.dataset.c));
  // Turu bitir düğmesi
  let sub;
  if (busy) sub = L('Tur işliyor…', 'Resolving…');
  else if (pp && pp.mode === 'siege') sub = L('Kuşatma sürüyor', 'Siege continues');
  else if (pp && ((pp.path && pp.path.length) || pp.chase != null)) { const t = turnTurnsLeft(pp); sub = pp.chase != null ? L('Takip ediliyor', 'Pursuing') : L(`Varış: ${t} tur`, `Arrival: ${t} turn${t > 1 ? 's' : ''}`); }
  else sub = L(`${TURN_DAYS} gün geçer`, `${TURN_DAYS} days pass`);
  setHTML($('#endturn'), `<b>${busy ? '⏳' : L('TURU BİTİR', 'END TURN')}</b><small>${sub}</small>`);
  $('#endturn').classList.toggle('busy', busy);
  const tw = $('#tools').offsetWidth; if (tw && tw !== UI._tw) { UI._tw = tw; document.documentElement.style.setProperty('--tw', tw + 'px'); }
  const wars = enemiesOf(realmOf(p));
  if (!status && busy) status = L('⏳ Zaman akıyor…', '⏳ Time passes…');
  if (!status && wars.length) status = L(`⚔️ Savaşta: ${wars.map(r => esc(r.name)).join(', ')}`, `⚔️ At war: ${wars.map(r => esc(r.name)).join(', ')}`);
  setHTML($('#status'), status);
  $('#status').classList.toggle('hidden', !status);
}
function ctxAction(k) {
  if (G.turnLeft > 0) return;
  if (k === 'center') CAM.follow = true;
  else if (k === 'stop') cancelOrders();
  else if (k === 'kacis' || k === 'gardiyan') doAction(k, null);
  else if (k.startsWith('enter:')) openSettlement(G.titles[k.slice(6)]);
  else if (k.startsWith('siege:')) {
    const s = G.titles[k.slice(6)], pp = playerParty();
    askConfirm(L(`${esc(s.name)} kuşatılacak. Garnizon: ${s.garrison} asker (gücü ~${garrisonPower(s)}, seninki ~${partyPower(pp)}). Üç gün sonra hücum edebilirsin.`,
      `You will besiege ${esc(s.name)}. Garrison: ${s.garrison} men (strength ~${garrisonPower(s)}, yours ~${partyPower(pp)}). You can storm the walls after three days.`), () => { cancelOrders(); startPlayerSiege(s); updateHUD(); }, () => {});
  }
  updateHUD();
}
function paused() { return !!UI.modal || !!UI.drawer || (G && G.queue.length > 0); }
function endTurn() {
  if (!G || G.over || G.turnLeft > 0 || paused()) return;
  hidePopup();
  UI.selProv = null;
  beginTurn();
  CAM.follow = true;
  updateHUD();
}

/* ---------- Ana döngü ---------- */
let _lastT = 0, _hudT = 0;
function loop(t) {
  const dt = Math.min(0.1, (t - _lastT) / 1000 || 0);
  _lastT = t;
  try {
    if (UI.screen === 'game' && G && !G.over) { tickMap(dt); if (UI.screen === 'game') drawMap(t); _hudT += dt; if (_hudT > 0.25) { _hudT = 0; updateHUD(); } }
    else if (UI.screen === 'battle' && B) { battleStep(Math.min(dt, 0.05)); if (B) { drawBattle(); updateBattleHUD(); } }
  } catch (e) { console.error(e); }
  requestAnimationFrame(loop);
}
function tickMap(dt) {
  if (G.queue.length && !UI.modal) { processQueue(); return; }
  if (paused() || !(G.turnLeft > 0)) return;
  const day0 = G.day;
  const foe = stepTurn(dt / DAY_SEC * UI.speed);
  if (G.over) { closeDrawer(); renderGameOver(); return; }
  if (G.day !== day0) onNewDay();
  if (foe) openEncounter(foe);
  if (!(G.turnLeft > 0)) { saveGame(); updateHUD(); }
}
function onNewDay() {
  const pp = playerParty();
  if (pp) { G.lastX = pp.x; G.lastY = pp.y; }
  if (pp && pp.mode === 'siege') {
    const s = G.titles[pp.sid];
    if (!s || !s.siege || s.siege.by !== pp.id) { pp.mode = 'idle'; return; }
    s.siege.days++;
    if (s.siege.days >= 3 && !s.siege.asked) { s.siege.asked = true; openAssault(s); }
  }
}

/* ---------- Harita açılır kartı ---------- */
function moveButton(pv, label) {
  const pp = playerParty();
  if (!pp || !pv) return '';
  const from = partyProv(pp);
  if (from.id === pv.id) return `<p class="small muted">${L('Ordun burada.', 'Your army is here.')}</p>`;
  const path = findPath(from.id, pv.id);
  if (!path) return `<p class="small muted">${L('Buraya yol yok.', 'No route here.')}</p>`;
  const t = splitTurns(from.id, path, movePoints(pp)).length;
  return `<button data-pp="go">🚶 ${label || L('Buraya git', 'Move here')} · ${t} ${L('tur', t > 1 ? 'turns' : 'turn')}</button>`;
}
function bindGo(el, pv) {
  const go = el.querySelector('[data-pp="go"]');
  if (go) go.onclick = () => { if (orderMove(pv.id)) { CAM.follow = true; hidePopup(); updateHUD(); } };
}
function modeName(m) {
  return { siege: L('Kuşatmaya gidiyor', 'Marching to siege'), chase: L('Birini kovalıyor', 'Chasing someone'), flee: L('Kaçıyor', 'Fleeing'), home: L('Evine dönüyor', 'Returning home'), patrol: L('Devriyede', 'Patrolling'), wander: L('Av arıyor', 'Looking for prey') }[m] || L('Bekliyor', 'Waiting');
}
function showPopup(info, cx, cy) {
  const el = $('#popup'), p = P(), pp = playerParty();
  let html = '';
  if (info.kind === 'sett') {
    const s = info.obj, h = ch(s.holder), r = s.liege ? G.titles[s.liege] : null;
    const hostile = h && hostileChars(p, h);
    const pv = partyProv(s);
    html = `<h3>${s.kind === 'sehir' ? '🏙️' : '🏰'} ${esc(s.name)}${s.capital ? ' ★' : ''}</h3>
      <p>${r ? swatch(r.color) + esc(r.name) : L('Bağımsız', 'Independent')}</p>
      <p class="small">${L('Sahibi', 'Holder')}: ${h ? `<a data-open="${h.id}">${esc(nm(h))}</a>` : '—'}${hostile ? ` <b class="bad">· ${L('DÜŞMAN', 'ENEMY')}</b>` : ''}</p>
      <p class="small">${L('Garnizon', 'Garrison')} ${s.garrison} · ${L('Refah', 'Prosperity')} %${Math.round((s.prosperity || 1) * 100)}${s.siege ? ` · 🔥 ${L('Kuşatma altında', 'Under siege')}` : ''}</p>
      ${armyListHtml(pv)}
      <div class="pbtns">${moveButton(pv, hostile ? L('Üzerine yürü', 'March on it') : null)}<button data-pp="info">📋 ${L('Ayrıntı', 'Details')}</button></div>`;
    el.innerHTML = html;
    bindGo(el, pv);
    el.querySelector('[data-pp="info"]').onclick = () => { hidePopup(); openSettlement(s); };
  } else if (info.kind === 'party') {
    const pt = info.obj, c = ch(pt.owner), isMe = pt.kind === 'player';
    const r = c ? realmOf(c) : null;
    const hostile = !isMe && pp && hostileParties(pp, pt);
    const myP = pp ? partyPower(pp) : 0, theirP = partyPower(pt);
    html = `<h3>${pt.kind === 'bandit' ? '☠️ ' + esc(banditName(pt)) : isMe ? '⚜️ ' + L('Senin ordun', 'Your army') : '🚩 ' + esc(nm(c))}</h3>
      ${r ? `<p>${swatch(r.color)}${esc(r.name)}</p>` : ''}
      <p class="small">${troopCount(pt)} ${L('asker', 'men')} · ${L('güç', 'strength')} ${theirP}${!isMe && pp ? ` (${L('seninki', 'yours')} ${myP})` : ''}${hostile ? ` <b class="bad">· ${L('DÜŞMAN', 'ENEMY')}</b>` : ''}</p>
      ${!isMe ? `<p class="small muted">${modeName(pt.mode)} · ${esc(provName(partyProv(pt)))}</p>` : `<p class="small muted">${esc(provName(partyProv(pt)))} · ${L('Hareket', 'Movement')} ${movePoints(pt)} ${L('il/tur', 'provinces/turn')}</p>`}
      <div class="pbtns">
        ${isMe ? `<button data-pp="army">⚔️ ${L('Ordu', 'Army')}</button>` : ''}
        ${!isMe && pp ? `<button data-pp="follow">🚶 ${L('Takip et', 'Follow')}</button>` : ''}
        ${!isMe && c ? `<button data-pp="sheet">💬 ${L('Konuş', 'Talk')}</button>` : ''}
        ${!isMe && pp ? `<button data-pp="attack" class="danger">⚔️ ${L('Saldır', 'Attack')}</button>` : ''}
      </div>`;
    el.innerHTML = html;
    const on = (k, f) => { const b = el.querySelector(`[data-pp="${k}"]`); if (b) b.onclick = () => { hidePopup(); f(); updateHUD(); }; };
    on('army', () => openDrawer('ordu'));
    on('follow', () => { orderChase(pt); CAM.follow = true; });
    on('sheet', () => openSheet(c.id));
    on('attack', () => playerAttack(pt));
  } else {
    const pv = info.obj;
    if (!pv) return;
    const s = provSettlement(pv), r = s && s.liege ? G.titles[s.liege] : null, h = s ? ch(s.holder) : null;
    const hostile = h && hostileChars(p, h);
    html = `<h3>📍 ${esc(provName(pv))}</h3>
      <p>${r ? swatch(r.color) + esc(r.name) : s ? L('Bağımsız', 'Independent') : L('Kimsenin toprağı değil', 'Unclaimed land')}</p>
      ${s ? `<p class="small">${L('Bağlı olduğu yer', 'Seat')}: ${esc(s.name)}${hostile ? ` <b class="bad">· ${L('DÜŞMAN', 'ENEMY')}</b>` : ''}</p>` : ''}
      ${armyListHtml(pv)}
      <div class="pbtns">${moveButton(pv)}</div>`;
    el.innerHTML = html;
    bindGo(el, pv);
    if (!pp && !html.includes('data-pp')) { /* yalnızca bilgi */ }
  }
  el.querySelectorAll('[data-open]').forEach(a => a.onclick = () => { hidePopup(); openSheet(+a.dataset.open); });
  bindArmyList(el);
  el.classList.remove('hidden');
  // zoom ile ölçeklenen kartta konum da ölçeğe bölünür
  const k = UI_SCALE, W = window.innerWidth, H = window.innerHeight, w = el.offsetWidth * k, h = el.offsetHeight * k;
  el.style.left = clamp(cx + 12, 8, W - w - 8) / k + 'px';
  el.style.top = clamp(cy - h / 2, 8, H - h - 8) / k + 'px';
}
/* Açılır kartta, ildeki ordular listesi */
function armyListHtml(pv) {
  const list = (armiesByProvince().get(pv.id) || []).slice();
  if (!list.length) return `<p class="small muted">${L('Bu ilde ordu yok.', 'No armies in this province.')}</p>`;
  const pp = playerParty();
  list.sort((a, b) => (b.kind === 'player') - (a.kind === 'player') || troopCount(b) - troopCount(a));
  return `<div class="alist">${list.map(pt => {
    const isMe = pt.kind === 'player', c = ch(pt.owner), r = c ? realmOf(c) : null;
    const hostile = !isMe && pp && hostileParties(pp, pt);
    const name = pt.kind === 'bandit' ? banditName(pt) : isMe ? L('Senin ordun', 'Your army') : nm(c);
    return `<div class="aline ${isMe ? 'me' : ''} ${hostile ? 'foe' : ''}">
      <i class="sw" style="background:${isMe ? '#ffcf4a' : pt.kind === 'bandit' ? '#2a2420' : r ? r.color : '#8a8070'}"></i>
      <span class="an"><b>${esc(name)}</b><small>${troopCount(pt)} ${L('asker', 'men')} · ${L('güç', 'str.')} ${partyPower(pt)}${!isMe ? ' · ' + modeName(pt.mode) : ''}</small></span>
      <span class="ab">${isMe ? `<button data-army="${pt.id}" title="${L('Ordu', 'Army')}">⚔️</button>`
        : `${c ? `<button data-talk="${c.id}" title="${L('Konuş', 'Talk')}">💬</button>` : ''}${pp ? `<button data-follow="${pt.id}" title="${L('Takip et', 'Follow')}">🚶</button><button class="danger" data-attack="${pt.id}" title="${L('Saldır', 'Attack')}">⚔️</button>` : ''}`}</span></div>`;
  }).join('')}</div>`;
}
function bindArmyList(el) {
  const party = id => G.parties.find(x => x.id === +id);
  el.querySelectorAll('[data-army]').forEach(b => b.onclick = () => { hidePopup(); openDrawer('ordu'); });
  el.querySelectorAll('[data-talk]').forEach(b => b.onclick = () => { hidePopup(); openSheet(+b.dataset.talk); });
  el.querySelectorAll('[data-follow]').forEach(b => b.onclick = () => { const pt = party(b.dataset.follow); hidePopup(); if (pt) { orderChase(pt); CAM.follow = true; updateHUD(); } });
  el.querySelectorAll('[data-attack]').forEach(b => b.onclick = () => { const pt = party(b.dataset.attack); hidePopup(); if (pt) { playerAttack(pt); updateHUD(); } });
}
function hidePopup() { const el = $('#popup'); if (el) el.classList.add('hidden'); }
function playerAttack(pt) {
  const pp = playerParty(), p = P(), c = ch(pt.owner);
  const go = () => {
    const a = partyProv(pp), b = partyProv(pt);
    if (dist(pp, pt) < 1.2 || a.id === b.id || a.nb.some(e => e.to === b.id && !e.sea)) openEncounter(pt);
    else { orderChase(pt); CAM.follow = true; toast(L('Hedef uzakta. Ordun turu bitirdiğinde onun peşine düşecek.', 'Target is out of reach. Your army will pursue it when you end the turn.')); }
  };
  if (hostileParties(pp, pt)) return go();
  const r = realmOf(c), mine = realmOf(p);
  const treason = r && mine && r === mine;
  askConfirm(treason
    ? L(`<b>${esc(nm(c))}</b> kendi krallığından! Saldırırsan bu <b>ihanet</b> sayılır. Efendin ve tüm krallık sana düşman olur.`, `<b>${esc(nm(c))}</b> belongs to your own realm! Attacking is <b>treason</b>. Your liege and the whole realm will turn on you.`)
    : L(`<b>${esc(nm(c))}</b> ile savaşta değilsin. Saldırırsan ${r ? esc(r.name) : 'o'} sana kan davası açar (6 ay).`, `You are not at war with <b>${esc(nm(c))}</b>. If you attack, ${r ? esc(r.name) : 'they'} will hold a blood feud against you (6 months).`), () => {
    if (r) G.feud.push({ r: r.id, until: G.day + 180 }); else G.personalFoes.push(c.id);
    if (treason) { const l = ch(p.lordId); if (l) addOp(l, p, -50); p.shame += 20; if (p.lordId != null && !p.titles.length) p.lordId = null; }
    addOp(c, p, -40);
    log(L(`⚔️ ${nm(c)} ordusuna saldırdın!`, `⚔️ You attacked the army of ${nm(c)}!`), 'war');
    go();
  }, () => {});
}

/* ---------- Karşılaşma ve savaş ---------- */
function openEncounter(foe) {
  const pp = playerParty();
  if (!pp || !G.parties.includes(foe)) return;
  pp.chase = null; pp.tx = pp.ty = null; pp.leg = null; pp.path = [];
  const c = ch(foe.owner);
  const name = foe.kind === 'bandit' ? banditName(foe) : L(`${nm(c)} ordusu`, `Army of ${nm(c)}`);
  const mp = partyPower(pp), tp = partyPower(foe);
  const runC = clamp(Math.round(45 + (partySpeed(pp) - partySpeed(foe)) * 150 + (troopCount(pp) < 10 ? 15 : 0)), 10, 90);
  const ratio = mp / Math.max(1, tp);
  const odds = ratio > 1.6 ? `<b class="good">${L('Ezici üstünlük sende', 'Overwhelming advantage')}</b>` : ratio > 1.1 ? `<b class="good">${L('Avantaj sende', 'Advantage yours')}</b>` : ratio > 0.8 ? `<b class="mid">${L('Denk güçler', 'Even odds')}</b>` : ratio > 0.5 ? `<b class="bad">${L('Düşman daha güçlü', 'The enemy is stronger')}</b>` : `<b class="bad">${L('Ölümcül tehlike', 'Deadly danger')}</b>`;
  showModal(`<div class="event"><h2>⚔️ ${esc(name)}</h2>
    <div class="etext">${foe.kind === 'bandit' ? L('Eşkıyalar silahlarını çekip yolunu kesti!', 'Bandits draw their weapons and block your path!') : L(`${esc(nm(c))} sancakları karşında dalgalanıyor.`, `The banners of ${esc(nm(c))} wave before you.`)}
    <div class="vs"><div><b>${L('Sen', 'You')}</b>${troopCount(pp)} ${L('asker', 'men')}<br>${L('güç', 'strength')} ${mp}</div><div class="vsx">⚔</div><div><b>${foe.kind === 'bandit' ? L('Eşkıyalar', 'Bandits') : L('Düşman', 'Enemy')}</b>${troopCount(foe)} ${L('asker', 'men')}<br>${L('güç', 'strength')} ${tp}</div></div>${odds}</div>
    <div class="eopts">
      <button class="opt primary" data-e="fight">⚔️ ${L('Savaş! (komuta et)', 'Fight! (take command)')}</button>
      <button class="opt" data-e="auto">🎲 ${L('Komutanlara bırak (otomatik)', 'Leave it to your captains (auto)')}</button>
      <button class="opt" data-e="run">🏃 ${L('Kaçmayı dene', 'Try to flee')} (%${runC})</button>
    </div></div>`, 'event');
  const m = $('#modal');
  m.querySelector('[data-e="fight"]').onclick = () => { closeModal(); fieldBattle(pp, foe); };
  m.querySelector('[data-e="auto"]').onclick = () => {
    const r = autoBattle(pp, foe);
    const won = r.W === pp;
    pp.ignore = pp.ignore || {}; pp.ignore[foe.id] = G.day + 2;
    log(`⚔️ ${won ? L('Zafer', 'Victory') : L('Yenilgi', 'Defeat')}: ${name}. ${r.notes.join(' ')}`, won ? 'good' : 'bad');
    if (G.over) { closeModal(); return renderGameOver(); }
    resultModal(`${won ? `<h2 class="good">🏆 ${L('Zafer!', 'Victory!')}</h2>` : `<h2 class="bad">💀 ${L('Yenilgi', 'Defeat')}</h2>`}<p>${L('Senin kayıpların', 'Your losses')}: ${lossText(won ? r.lw : r.ll)}</p><p>${L('Düşman kayıpları', 'Enemy losses')}: ${lossText(won ? r.ll : r.lw)}</p><p>${r.notes.join('<br>')}</p>`);
  };
  m.querySelector('[data-e="run"]').onclick = () => {
    pp.ignore = pp.ignore || {};
    if (chance(runC / 100)) {
      pp.ignore[foe.id] = G.day + 2; foe.stun = 1;
      resultModal(`<p>${L('Atlarını mahmuzladın ve düşmanı geride bıraktın.', 'You spurred your horses and left the enemy behind.')}</p>`);
    } else {
      const lost = applyLosses(pp, 0.15);
      pp.ignore[foe.id] = G.day + 1; foe.stun = 1;
      resultModal(`<p>${L('Kaçarken artçıların yakalandı. Kayıplar', 'Your rearguard was caught as you fled. Losses')}: ${lossText(lost)}</p>`);
    }
  };
}
function resultModal(html) {
  showModal(`<div class="event"><div class="etext">${html}</div><div class="eopts"><button class="opt primary" data-next>${L('Devam', 'Continue')}</button></div></div>`, 'event');
  $('#modal').querySelector('[data-next]').onclick = () => { closeModal(); saveGame(); updateHUD(); processQueue(); };
}
function fieldBattle(pp, foe) {
  const lp = partyPower(foe);
  const c = ch(foe.owner);
  startBattle({
    A: pp, enemy: { troops: foe.troops, leaderId: foe.kind === 'bandit' ? null : foe.owner, name: foe.kind === 'bandit' ? banditName(foe) : nm(c) }, siege: null,
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
      if (p.alive && p.health <= 0) die(p, L('Savaşta aldığı yaralar', 'Wounds taken in battle'));
      log(`⚔️ ${res.won ? L('Zafer', 'Victory') : res.retreated ? L('Geri çekilme', 'Retreat') : L('Yenilgi', 'Defeat')}. ${notes.join(' ')}`, res.won ? 'good' : 'bad');
      return notes;
    },
  });
}
function openAssault(s) {
  const pp = playerParty();
  showModal(`<div class="event"><h2>🔥 ${L(`${esc(s.name)} kuşatması`, `Siege of ${esc(s.name)}`)}</h2>
    <div class="etext">${L(`Merdivenler hazır, koçbaşı kapıya dayandı. Surlarda ${s.garrison} savunucu bekliyor.`, `The ladders are ready and the ram is at the gate. ${s.garrison} defenders wait on the walls.`)}
    <div class="vs"><div><b>${L('Sen', 'You')}</b>${troopCount(pp)} ${L('asker', 'men')}<br>${L('güç', 'strength')} ${partyPower(pp)}</div><div class="vsx">⚔</div><div><b>${L('Garnizon', 'Garrison')}</b>${s.garrison} ${L('asker', 'men')}<br>${L('güç', 'strength')} ${garrisonPower(s)}</div></div></div>
    <div class="eopts">
      <button class="opt primary" data-e="fight">⚔️ ${L('Hücum! (komuta et)', 'Storm the walls! (take command)')}</button>
      <button class="opt" data-e="auto">🎲 ${L('Komutanlara bırak', 'Leave it to your captains')}</button>
      <button class="opt" data-e="wait">⏳ ${L('Kuşatmaya devam et', 'Continue the siege')}</button>
      <button class="opt" data-e="lift">🏳️ ${L('Kuşatmayı kaldır', 'Lift the siege')}</button>
    </div></div>`, 'event');
  const m = $('#modal');
  m.querySelector('[data-e="fight"]').onclick = () => { closeModal(); siegeBattle(pp, s); };
  m.querySelector('[data-e="auto"]').onclick = () => {
    const ok = siegeAssault(pp, s);
    pp.mode = 'idle';
    resultModal(ok ? `<h2 class="good">🏆 ${L(`${esc(s.name)} düştü!`, `${esc(s.name)} has fallen!`)}</h2>` : `<h2 class="bad">💀 ${L('Hücum püskürtüldü', 'The assault was repulsed')}</h2><p>${L('Askerlerin surların dibinde kaldı.', 'Your soldiers lie dead beneath the walls.')}</p>`);
  };
  m.querySelector('[data-e="wait"]').onclick = () => { s.siege.asked = false; s.siege.days = 1; closeModal(); };
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
        notes.push(L(`Garnizon ${killed} kayıp verdi.`, `The garrison lost ${killed} men.`));
      }
      if (p.alive && p.health <= 0) die(p, L('Kuşatmada aldığı yaralar', 'Wounds taken in the siege'));
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
  $('#border').innerHTML = [['hucum', L('⚔️ Hücum', '⚔️ Charge')], ['bekle', L('🛡️ Bekle', '🛡️ Hold')], ['takip', L('🚩 Takip', '🚩 Follow')], ['geri', L('🏳️ Çekil', '🏳️ Retreat')], ['ov', '🔭']]
    .map(([k, l]) => `<button data-o="${k}">${l}</button>`).join('');
  $('#border').querySelectorAll('[data-o]').forEach(b => b.onclick = () => {
    if (!B) return;
    const k = b.dataset.o;
    if (k === 'ov') B.overview = !B.overview;
    else if (k === 'geri') { if (!B.over) endBattle(false, true); }
    else { B.order = k; B.msg = { hucum: L('Askerlerine HÜCUM emri verdin!', 'You ordered your troops to CHARGE!'), bekle: L('Askerlerin mevzilerini koruyor.', 'Your troops hold their positions.'), takip: L('Askerlerin seni takip ediyor.', 'Your troops follow you.') }[k]; B.msgT = B.t; }
  });
  B.msg = o.siege ? L(`${o.siege.name} surlarına hücum! Kapıdan gir.`, `Assault on the walls of ${o.siege.name}! Break in through the gate.`) : L(`${o.enemy.name} karşında. Emir ver!`, `${o.enemy.name} stands before you. Give your orders!`);
  B.msgT = 0;
}
function updateBattleHUD() {
  const a = B.units.filter(u => u.side === 0 && u.state === 'ok').length, b = B.units.filter(u => u.side === 1 && u.state === 'ok').length;
  const hero = B.hero;
  setHTML($('#btop'), `<span class="sa">🛡️ ${a * B.scale}</span><span class="bt">${Math.floor(B.t / 60)}:${String(Math.floor(B.t % 60)).padStart(2, '0')}</span><span class="sb">${b * B.scale} ⚔️</span>
    <div class="hhp"><small>${esc(hero.name)}</small>${bar(Math.max(0, hero.hp), hero.max, 'hp')}</div>`);
  $('#border').querySelectorAll('[data-o]').forEach(x => x.classList.toggle('on', x.dataset.o === B.order || (x.dataset.o === 'ov' && B.overview)));
  const m = $('#bmsg');
  const show = B.msg && B.t - (B.msgT || 0) < 3.5;
  const txt = show ? B.msg : ''; if (m._t !== txt) { m._t = txt; m.textContent = txt; }
  m.classList.toggle('hidden', !show);
}
function showBattleEnd() {
  const r = B.result;
  const notes = B.o.onEnd(r) || [];
  const title = r.retreated ? `<h2 class="mid">🏳️ ${L('Geri çekildin', 'You retreated')}</h2>` : r.won ? `<h2 class="good">🏆 ${L('Zafer!', 'Victory!')}</h2>` : `<h2 class="bad">💀 ${L('Yenilgi', 'Defeat')}</h2>`;
  B = null;
  saveGame();
  if (G.over) { renderGameOver(); return; }
  showScreen('game');
  resultModal(`${title}<p>${L('Senin kayıpların', 'Your losses')}: ${lossText(r.lossA)}</p><p>${L('Düşman kayıpları', 'Enemy losses')}: ${lossText(r.lossB)}</p>${r.heroDown ? `<p class="bad">${L('Ağır yaralandın. (Sağlık -35)', 'You were badly wounded. (Health -35)')}</p>` : ''}<p>${notes.join('<br>')}</p>`);
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
  let html = `<div class="card"><p>${r ? swatch(r.color) + esc(r.name) : L('Bağımsız', 'Independent')} · ${s.kind === 'sehir' ? L('Şehir', 'City') : L('Kale', 'Castle')}${s.capital ? ' · ' + L('Başkent', 'Capital') : ''}</p>
    <p class="small">${L('Sahibi', 'Holder')}: ${h ? `<a data-open="${h.id}">${esc(nm(h))}</a>` : '—'}${hostile ? ` <b class="bad">· ${L('DÜŞMAN', 'ENEMY')}</b>` : ''} · ${L('Garnizon', 'Garrison')} ${s.garrison} · ${L('Refah', 'Prosperity')} %${Math.round((s.prosperity || 1) * 100)}</p></div>`;
  if (here) {
    html += `<h3>🛡️ ${L('Asker topla', 'Recruit')} <small class="muted">(${n}/${cap})</small></h3><div class="recruit">`;
    for (const k of Object.keys(s.pool)) {
      const T = TROOPS[k], off = s.pool[k] < 1 || p.gold < T.cost || n >= cap;
      html += `<div class="rrow"><span class="ri">${T.ikon}</span><span class="rn">${T.ad} ${tierBadge(k)}<small>${T.cost}💰 · ${L('maaş', 'wage')} ${T.wage}/${L('ay', 'mo')} · ${L('mevcut', 'available')} ${s.pool[k]}</small></span>
        <button data-rec="${k}:1" ${off ? 'disabled' : ''}>+1</button><button data-rec="${k}:5" ${off ? 'disabled' : ''}>+5</button></div>`;
    }
    html += '</div>';
    if (s.kind === 'sehir' && pp.troops.milis) html += `<button class="wide" data-sa="train">⬆️ ${L(`Milisleri piyade yap (15💰/kişi, ${pp.troops.milis} milis)`, `Train militia into spearmen (15💰 each, ${pp.troops.milis} militia)`)}</button>`;
    html += `<button class="wide" data-sa="rest">🛏️ ${L('Dinlen (5 gün: sağlık +20, stres -10)', 'Rest (5 days: health +20, stress -10)')}</button>`;
    html += `<button class="wide" data-sa="tavern">🍺 ${L('Meyhaneye uğra (5💰)', 'Visit the tavern (5💰)')}</button>`;
    if (s.holder === p.id) {
      html += `<button class="wide" data-sa="garr">🏯 ${L('Garnizonu güçlendir (+10 asker, 100💰)', 'Reinforce the garrison (+10 men, 100💰)')}</button>`;
      if ((pp.troops.piyade || 0) >= 10) html += `<button class="wide" data-sa="leave">📦 ${L('10 piyadeyi garnizona bırak', 'Leave 10 spearmen in the garrison')}</button>`;
    }
  } else if (pp && !hostile) html += `<p class="muted">${L('Asker toplamak için oraya gitmelisin.', 'You must travel there to recruit.')}</p><button class="wide" data-sa="go">🚶 ${L(`${esc(s.name)} yoluna çık`, `Travel to ${esc(s.name)}`)}</button>`;
  else if (pp && hostile) html += `<p class="muted">${L('Bu düşman toprağı. Yanına gidip kuşatabilirsin.', 'This is enemy land. March there to lay siege.')}</p><button class="wide" data-sa="go">🚶 ${L(`${esc(s.name)} üzerine yürü`, `March on ${esc(s.name)}`)}</button>`;
  if (h && h.id !== p.id) html += `<button class="wide" data-open="${h.id}">👑 ${L(`${esc(nm(h))} ile görüş`, `Meet ${esc(nm(h))}`)}</button>`;
  return html;
}
function bindSettlement(root) {
  const s = G.titles[UI.sett], p = P(), pp = playerParty();
  root.querySelectorAll('[data-rec]').forEach(b => b.onclick = () => {
    const [k, n] = b.dataset.rec.split(':');
    const got = playerRecruit(s, k, Math.min(+n, partyCap(p) - troopCount(pp)));
    if (got) toast(L(`${got} ${TROOPS[k].ad} ordusuna katıldı.`, `${got} ${TROOPS[k].ad} joined your army.`));
    renderDrawer(); updateHUD();
  });
  const on = (k, f) => { const b = root.querySelector(`[data-sa="${k}"]`); if (b) b.onclick = f; };
  on('train', () => { const n = Math.min(pp.troops.milis, Math.floor(p.gold / 15)); if (!n) return toast(L('Yeterli altın yok.', 'Not enough gold.')); p.gold -= n * 15; pp.troops.milis -= n; if (!pp.troops.milis) delete pp.troops.milis; pp.troops.piyade = (pp.troops.piyade || 0) + n; toast(L(`${n} milis piyade oldu.`, `${n} militia became spearmen.`)); renderDrawer(); });
  on('rest', () => { closeDrawer(); p.health = Math.min(100, p.health + 20); stress(p, -10); passDays(5); });
  on('tavern', () => {
    if (p.gold < 5) return toast(L('5 altın gerekli.', 'Requires 5 gold.'));
    p.gold -= 5; stress(p, -8);
    const id = pick(['kumar', 'hanci', 'sirSatici', 'fisilti', 'sarap', 'kehanet', 'askMektubu']);
    const ev = EVENTS[id];
    const d = ev.prep ? ev.prep(p) : {};
    closeDrawer();
    if (d) queueEvent(id, d); else toast(L('Meyhane bu gece sessizdi. Bir kadeh içip çıktın.', 'The tavern was quiet tonight. You had a drink and left.'));
    processQueue();
  });
  on('garr', () => { if (p.gold < 100) return toast(L('100 altın gerekli.', 'Requires 100 gold.')); p.gold -= 100; s.garrison += 10; renderDrawer(); });
  on('leave', () => { pp.troops.piyade -= 10; if (!pp.troops.piyade) delete pp.troops.piyade; s.garrison += 10; renderDrawer(); });
  on('go', () => { if (orderMove(partyProv(s).id)) { CAM.follow = true; closeDrawer(); } else toast(L('Buraya yol yok.', 'No route there.')); });
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
function drawerTitle(k) { return { ben: L('👤 Karakterin', '👤 Character'), kisiler: L('👥 Kişiler', '👥 People'), ordu: L('⚔️ Ordun', '⚔️ Your Army'), topraklar: L('🏰 Toprakların', '🏰 Your Lands'), dunya: L('🌍 Dünya', '🌍 World'), eylem: L('⚡ Eylemler', '⚡ Actions'), gunluk: L('📜 Günlük', '📜 Chronicle') }[k]; }
function openDrawer(k) { if (G.turnLeft > 0) return; hidePopup(); UI.drawer = k; renderDrawer(); $('#drawer').classList.remove('hidden'); $('#drawer .dbody').scrollTop = 0; }
function closeDrawer() { UI.drawer = null; const d = $('#drawer'); if (d) d.classList.add('hidden'); updateHUD(); }
function renderDrawer() {
  if (!UI.drawer) return;
  const p = P();
  const body = $('#drawer .dbody');
  const sc = body.scrollTop;
  $('#drawer .dtitle').textContent = UI.drawer === 'sett' ? `🏰 ${G.titles[UI.sett].name}` : drawerTitle(UI.drawer);
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
    <div class="pi"><b>${esc(nm(c))}</b><small>${esc(titleOf(c))} · ${c.age} ${L('yaş', 'yrs')}</small><div class="tags">${tagsFor(p, c)}</div></div>
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
  if (p.prisonerOf) html += `<div class="alert">⛓️ ${L(`<b>${esc(nm(ch(p.prisonerOf)))}</b> seni zindanda tutuyor.`, `<b>${esc(nm(ch(p.prisonerOf)))}</b> holds you in the dungeon.`)}</div>`;
  html += `<div class="card"><div class="hero">${avatar(p, 58)}<div><h2>${esc(nm(p))}</h2><p>${esc(titleOf(p))} · ${L(`${p.age} yaşında`, `age ${p.age}`)} · ${L(`${G.generation}. nesil`, `generation ${G.generation}`)}</p>
    <p class="small">${r ? swatch(r.color) + esc(r.name) : L('Hiçbir krallığa bağlı değilsin', 'You serve no realm')}${lord ? ` · ${L('Efendin', 'Liege')}: <a data-open="${lord.id}">${esc(nm(lord))}</a>` : ''}</p></div></div>
    <div class="chips">${traitChips(p)}</div>${statGrid(p)}
    <div class="meters"><div><small>${L('Sağlık', 'Health')}</small>${bar(p.health, 100, 'hp')}</div><div><small>${L('Stres', 'Stress')}</small>${bar(p.stress, 100, 'st')}</div></div>
    <p class="small">${L('Aylık gelir', 'Monthly income')} ${income(p)}💰 · ${L('Korku', 'Dread')} ${Math.round(p.dread)} · ${L('Rezalet', 'Shame')} ${Math.round(p.shame)} · ${L('Zorbalık', 'Tyranny')} ${Math.round(p.tyranny)}</p></div>`;
  html += `<div class="card"><h3>🌳 ${L(`Hanedan ${esc(p.dyn)}`, `House ${esc(p.dyn)}`)}</h3>
    <p class="small">${L('Varisin', 'Heir')}: ${heir ? `<a data-open="${heir.id}">${esc(nm(heir))}</a> (${heir.age})` : `<b class="bad">${L('YOK. Ölürsen oyun biter!', 'NONE. If you die, the game ends!')}</b>`}</p>
    ${spouse ? personLine(spouse, p) : ''}${lovers.map(l => personLine(l, p)).join('')}${kids.map(k => personLine(k, p)).join('')}
    ${!spouse && !kids.length && !lovers.length ? `<p class="small muted">${L('Henüz bir ailen yok.', 'You have no family yet.')}</p>` : ''}</div>`;
  if (prisoners.length) html += `<div class="card"><h3>⛓️ ${L('Zindanındakiler', 'Your prisoners')}</h3>${prisoners.map(x => personLine(x, p)).join('')}</div>`;
  html += `<div class="card"><h3>🗝️ ${L('Bildiğin sırlar', 'Secrets you know')}</h3>${known.length ? known.map(s => `<p class="secret">• ${esc(secretText(s))}</p>`).join('') : `<p class="small muted">${L('Henüz kimsenin sırrını bilmiyorsun.', 'You know no one\'s secrets yet.')}</p>`}</div>`;
  html += `<div class="card"><h3>🩸 ${L('Senin sırların', 'Your secrets')}</h3>${mySecrets.length ? mySecrets.map(s => `<p class="secret ${s.pub ? 'pub' : ''}">• ${esc(secretText(s))}<small>${s.pub ? L(' (herkes biliyor)', ' (public knowledge)') : L(` (${s.known.length - 1} kişi biliyor)`, ` (${s.known.length - 1} know)`)}</small></p>`).join('') : `<p class="small muted">${L('Vicdanın (şimdilik) temiz.', 'Your conscience is clean (for now).')}</p>`}</div>`;
  return html;
}
function filterList(p) {
  const list = living().filter(c => c.id !== p.id);
  const pr = realmOf(p);
  switch (UI.filter) {
    case 'yakin': return list.filter(c => familyRel(p, c) || p.lovers.includes(c.id) || c.id === p.lordId || c.lordId === p.id ||
      (p.lordId != null && c.lordId === p.lordId) || c.prisonerOf === p.id || Math.abs(opinion(c, p)) >= 40);
    case 'krallik': return list.filter(c => pr && realmOf(c) === pr && c.rank >= 3);
    case 'hukumdar': return list.filter(c => c.rank === 5);
    case 'sirlar': return list.filter(c => knownSecretsOf(p, c).length);
    case 'esir': return list.filter(c => c.prisonerOf);
    default: return list;
  }
}
function tabKisiler(p) {
  const list = filterList(p).sort((a, b) => b.rank - a.rank || opinion(b, p) - opinion(a, p)).slice(0, 120);
  const fs = [['yakin', L('Yakınlar', 'Close')], ['krallik', L('Krallığım', 'My realm')], ['hukumdar', L('Hükümdarlar', 'Rulers')], ['sirlar', L('Sırlar', 'Secrets')], ['esir', L('Esirler', 'Prisoners')]];
  return `<div class="filters">${fs.map(([k, l]) => `<button data-filter="${k}" class="${UI.filter === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <p class="small muted">${L('Sağdaki sayı onun sana bakışı. Birine dokun: entrika, evlilik, rüşvet, suikast…', 'The number on the right is their opinion of you. Tap someone to scheme, marry, bribe, murder…')}</p>
    ${list.map(c => personLine(c, p)).join('') || `<p class="muted">${L('Kimse yok.', 'Nobody.')}</p>`}`;
}
function tabOrdu(p) {
  const pp = playerParty();
  if (!pp) return `<div class="alert">${L('Ordun yok. Zindandasın ya da dağıldın.', 'You have no army. You are imprisoned or scattered.')}</div>`;
  let wage = 0;
  for (const k in pp.troops) wage += pp.troops[k] * TROOPS[k].wage;
  const rows = Object.entries(pp.troops).filter(([, n]) => n > 0).sort((a, b) => TROOPS[b[0]].tier - TROOPS[a[0]].tier).map(([k, n]) => `<div class="rrow"><span class="ri">${TROOPS[k].ikon}</span><span class="rn">${TROOPS[k].ad} ${tierBadge(k)} <b>× ${n}</b><small>${L('Can', 'HP')} ${TROOPS[k].hp} · ${L('Saldırı', 'Attack')} ${TROOPS[k].atk} · ${L('Zırh', 'Armor')} ${TROOPS[k].def}${TROOPS[k].range ? ' · ' + L('Menzilli', 'Ranged') : ''}</small></span><button data-dis="${k}:1">-1</button><button data-dis="${k}:5">-5</button></div>`).join('');
  return `<div class="card"><p><b>${troopCount(pp)}</b> / ${partyCap(p)} ${L('asker', 'men')} · ${L('Güç', 'Strength')} <b>${partyPower(pp)}</b> · ${L('Hareket', 'Movement')} <b>${movePoints(pp)}</b> ${L('il/tur', 'provinces/turn')}</p>
    <p class="small">${L('Aylık maaş', 'Monthly wages')}: <b>${wage}💰</b> (${L('gelirin', 'income')} ${income(p)}💰). ${L('Maaş ödenmezse askerler kaçar.', 'Unpaid soldiers desert.')}</p></div>
    <div class="recruit">${rows || `<p class="muted">${L('Ordunda hiç asker yok. Bir şehre girip asker topla.', 'Your army is empty. Enter a city to recruit.')}</p>`}</div>
    <p class="small muted">${L('Roma rakamı askerin seviyesidir (I–IV). Asker kapasiten toprak, şan ve diplomasi yeteneğinle artar. Süvari ordunu hızlandırır. "-" ile asker terhis edersin.', 'The Roman numeral is the troop tier (I–IV). Your army cap grows with land, prestige and diplomacy. Cavalry makes your army faster. Use "-" to dismiss soldiers.')}</p>`;
}
function tabToprak(p) {
  const own = settlementsOf(p);
  const r = ownRealm(p);
  let html = '';
  if (r) html += `<div class="card"><h3>${swatch(r.color)} ${esc(r.name)}</h3><p class="small">${realmSettlements(r).length} ${L('yerleşim', 'holdings')} · ${L('Vasallar', 'Vassals')}: ${living().filter(x => x.lordId === p.id && x.titles.length).length} · ${L('Savaşlar', 'Wars')}: ${enemiesOf(r).map(e => esc(e.name)).join(', ') || L('yok', 'none')}</p></div>`;
  if (!own.length) return html + `<p class="muted">${L('Hiç toprağın yok. Efendinden toprak iste, düşman kalelerini kuşat ya da toprak sahibi biriyle evlen.', 'You hold no land. Ask your liege for land, besiege enemy castles, or marry into a landed family.')}</p>`;
  html += own.map(s => `<div class="card sitem"><div><b>${s.kind === 'sehir' ? '🏙️' : '🏰'} ${esc(s.name)}${s.capital ? ' ★' : ''}</b><small>${L('Garnizon', 'Garrison')} ${s.garrison} · ${L('Gelir', 'Income')} ~${Math.round((s.kind === 'sehir' ? 14 : 8) * (s.prosperity || 1))}💰/${L('ay', 'mo')} · ${PROV.filter(pv => pv.seat === G.settIds.indexOf(s.id)).length} ${L('il', 'provinces')}${s.siege ? ' · 🔥 ' + L('KUŞATMADA', 'UNDER SIEGE') : ''}</small></div><button data-goto="${s.id}">📍</button></div>`).join('');
  return html;
}
function tabDunya(p) {
  const rs = realms().sort((a, b) => realmSettlements(b).length - realmSettlements(a).length);
  const wars = G.wars.map(w => `<p class="small">⚔️ ${swatch(G.titles[w.a].color)}${esc(G.titles[w.a].name)} × ${swatch(G.titles[w.b].color)}${esc(G.titles[w.b].name)}</p>`).join('');
  return `<div class="card"><h3>${L('Süren savaşlar', 'Ongoing wars')}</h3>${wars || `<p class="small muted">${L('Dünya şimdilik barış içinde.', 'The world is at peace — for now.')}</p>`}</div>
    ${rs.map(r => { const k = ch(r.holder); return `<button class="person" ${k ? `data-open="${k.id}"` : ''}><i class="sw big" style="background:${r.color}"></i><div class="pi"><b>${esc(r.name)}</b><small>${k ? esc(nm(k)) : '—'} · ${realmSettlements(r).length} ${L('yerleşim', 'holdings')}</small></div>${k && k.id !== p.id ? opBadge(opinion(k, p)) : ''}</button>`; }).join('')}`;
}
function actionButton(a, p, t) {
  if (!a.show(p, t)) return '';
  const label = typeof a.ad === 'function' ? a.ad(p, t) : a.ad;
  let reason = a.req(p, t);
  if (!reason && G.ap < a.ap) reason = L('Bu ayki entrika hakkın bitti', 'No intrigue actions left this month');
  const c = a.chance ? a.chance(p, t) : null;
  const inf = a.info ? a.info(p, t) : '';
  return `<button class="act ${reason ? 'off' : ''}" data-act="${a.id}" ${t ? `data-t="${t.id}"` : ''} ${reason ? 'disabled' : ''}>
    <span class="ai">${a.icon}</span><span class="al">${esc(label)}${inf ? `<small>${esc(inf)}</small>` : ''}${reason ? `<em>${esc(reason)}</em>` : ''}</span>
    <span class="am">${c != null ? `<b class="${c >= 60 ? 'good' : c >= 30 ? 'mid' : 'bad'}">%${c}</b>` : ''}${a.ap ? `<small>${a.ap}⚡</small>` : ''}</span></button>`;
}
function tabEylem(p) {
  return `<p class="small muted">${L(`Her ay ${AP_MAX} eylem hakkın var (⚡). Kişilere yönelik eylemler için birinin kartını aç.`, `You get ${AP_MAX} actions each month (⚡). Open someone's card for actions targeting them.`)}</p>
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
        <p>${esc(titleOf(t))} · ${t.age} ${L('yaş', 'yrs')}${t.bastard ? ' · ' + L('Gayrimeşru', 'Bastard') : ''}</p>
        <p class="small">${r ? swatch(r.color) + esc(r.name) : L('Bağımsız', 'Independent')} · ${CULTURES[t.cul] ? CULTURES[t.cul].ad : ''}</p>
        ${t.alive ? '' : `<p class="small bad">${esc(t.death.reason)} (${t.death.d})</p>`}
        <div class="tags">${tagsFor(p, t)}</div></div></div>
      ${!self && t.alive ? `<div class="rel" data-bd><div><small>${L('Sana bakışı', 'Opinion of you')}</small>${opBadge(o)}</div><div><small>${L('Senin ona', 'Yours of them')}</small>${opBadge(mine)}</div><span class="small muted">${UI.breakdown ? '▲' : L('▼ neden?', '▼ why?')}</span></div>
        ${UI.breakdown ? `<div class="bd">${parts.length ? parts.map(([l, v]) => `<p><span>${esc(l)}</span>${opBadge(v)}</p>`).join('') : `<p class="muted">${L('Henüz bir fikri yok.', 'No opinion yet.')}</p>`}</div>` : ''}` : ''}
      <div class="chips">${traitChips(t)}</div>${statGrid(t)}
      <p class="small">💰 ${t.gold} · ⭐ ${Math.round(t.prestige)} · ❤️ ${Math.round(t.health)}${pt ? ` · 🪖 ${troopCount(pt)} ${L('asker', 'men')}` : ''}</p>
      <div class="links">
        ${lord ? `<p>${L('Efendisi', 'Liege')}: <a data-open="${lord.id}">${esc(nm(lord))}</a></p>` : ''}
        ${spouse ? `<p>${L('Eşi', 'Spouse')}: <a data-open="${spouse.id}">${esc(nm(spouse))}</a></p>` : ''}
        ${t.prisonerOf ? `<p>⛓️ ${L('Esir tutan', 'Held by')}: <a data-open="${t.prisonerOf}">${esc(nm(ch(t.prisonerOf)))}</a></p>` : ''}
        ${settlementsOf(t).length ? `<p>${L('Toprakları', 'Holdings')}: ${settlementsOf(t).map(s => `<a data-goto="${s.id}">${esc(s.name)}</a>`).join(', ')}</p>` : ''}
        ${kids.length ? `<p>${L('Çocukları', 'Children')}: ${kids.map(k => `<a data-open="${k.id}">${esc(k.name)}${k.alive ? '' : '†'}</a>`).join(', ')}</p>` : ''}
        ${pt ? `<p><a data-showparty="${pt.id}">📍 ${L('Ordusunu haritada göster', 'Show army on map')}</a></p>` : ''}
      </div>
      ${secrets.length ? `<div class="card inner"><h3>🗝️ ${L('Bildiğin sırlar', 'Secrets you know')}</h3>${secrets.map(s => `<p class="secret ${s.pub ? 'pub' : ''}">• ${esc(secretText(s))}</p>`).join('')}</div>` : ''}
    </div>
    ${acts ? `<div class="scol"><h3>${L('Ne yapacaksın?', 'What will you do?')} <small class="muted">(${G.ap} ⚡)</small></h3><div class="acts">${acts}</div></div>` : ''}
  </div>`, 'sheet');
  const m = $('#modal');
  m.querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal);
  m.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openSheet(+b.dataset.open));
  m.querySelectorAll('[data-act]').forEach(b => b.onclick = () => doAction(b.dataset.act, +b.dataset.t));
  m.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { const s = G.titles[b.dataset.goto]; closeModal(); closeDrawer(); CAM.follow = false; CAM.x = s.x; CAM.y = s.y; CAM.z = Math.max(CAM.z, 24); });
  m.querySelectorAll('[data-showparty]').forEach(b => b.onclick = () => { const x = G.parties.find(q => q.id === +b.dataset.showparty); closeModal(); closeDrawer(); if (x) { CAM.follow = false; CAM.x = x.x; CAM.y = x.y; CAM.z = Math.max(CAM.z, 24); UI.selProv = partyProv(x).id; } });
  bindTips(m);
  const bd = m.querySelector('[data-bd]');
  if (bd) bd.onclick = () => { UI.breakdown = !UI.breakdown; renderSheet(); };
}

/* ---------- Eylem yürütme ---------- */
function askConfirm(text, onYes, onNo) {
  const back = UI.modal === 'sheet' ? UI.sheet : null;
  showModal(`<div class="event"><h2>${L('Emin misin?', 'Are you sure?')}</h2><div class="etext">${text}</div>
    <div class="eopts"><button class="opt primary" data-yes>${L('Evet', 'Yes')}</button><button class="opt" data-no>${L('Vazgeç', 'Cancel')}</button></div></div>`, 'confirm');
  const m = $('#modal');
  m.querySelector('[data-yes]').onclick = () => { closeModal(); if (back != null) UI.sheet = back; onYes(); };
  m.querySelector('[data-no]').onclick = () => { closeModal(); if (onNo) onNo(); else if (back != null) openSheet(back); };
}
function doAction(aid, tid, confirmed) {
  const a = ACTION_MAP[aid], p = P(), t = tid != null ? ch(tid) : null;
  if (!a || G.over) return;
  if (G.ap < a.ap) return toast(L('Bu ayki entrika hakkın bitti. Zaman geçsin.', 'No intrigue actions left this month. Let time pass.'));
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
        showModal(`<div class="event"><div class="etext">${res}</div><div class="eopts"><button class="opt primary" data-next>${L('Devam', 'Continue')}</button></div></div>`, 'event');
        $('#modal').querySelector('[data-next]').onclick = () => { closeModal(); updateHUD(); processQueue(); };
      } else { closeModal(); updateHUD(); processQueue(); }
    });
    return;
  }
}

/* ---------- Menü / Ayarlar / Oyun sonu / Döndürme ---------- */
function openMenu() {
  showModal(`<div class="sheet"><button class="x" data-close>✕</button><h2>⚜️ ${L('Menü', 'Menu')}</h2>
    <h3>${L('Dil', 'Language')}</h3>${langSwitch()}
    <h3>${L('HUD ölçeği', 'HUD scale')}</h3>
    <div class="uiscale"><button id="uiMinus" aria-label="${L('Küçült', 'Smaller')}">−</button><output id="uiVal">${Math.round(UI_SCALE * 100)}%</output><button id="uiPlus" aria-label="${L('Büyüt', 'Larger')}">+</button></div>
    <div class="acts">
      <button class="act" id="mFull"><span class="ai">⛶</span><span class="al">${L('Tam ekran', 'Fullscreen')}</span></button>
      <button class="act" id="mHelp"><span class="ai">❓</span><span class="al">${L('Nasıl oynanır?', 'How to play')}</span></button>
      <button class="act" id="mNew"><span class="ai">🔄</span><span class="al">${L('Yeni oyun', 'New game')}<em>${L('Mevcut kayıt silinir', 'The current save will be deleted')}</em></span></button>
    </div><p class="small muted">${L('Oyun otomatik kaydedilir.', 'The game saves automatically.')}</p>
    <p class="small muted">${L('Simgeler', 'Icons')}: <a href="https://game-icons.net" target="_blank" rel="noopener">game-icons.net</a> (Lorc, Delapouite ${L('ve diğerleri', 'and others')}, CC BY 3.0) · ${L('Harita', 'Map')}: Natural Earth</p></div>`, 'menu');
  const m = $('#modal');
  m.querySelector('[data-close]').onclick = closeModal;
  const uiStep = d => { setUIScale(UI_SCALE + d); $('#uiVal').textContent = Math.round(UI_SCALE * 100) + '%'; };
  $('#uiMinus').onclick = () => uiStep(-0.1);
  $('#uiPlus').onclick = () => uiStep(0.1);
  bindLang(m, () => { G.terrDirty = true; $('#hudL')._h = $('#hudR')._h = $('#ctxbar')._h = $('#endturn')._h = null; updateHUD(); openMenu(); });
  $('#mFull').onclick = () => {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    closeModal();
    if (!req) return toast(L('Tam ekran bu tarayıcıda desteklenmiyor.', 'Fullscreen is not supported in this browser.'));
    try {
      Promise.resolve(req.call(el)).then(() => { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); }).catch(() => toast(L('Tam ekran burada açılamadı.', 'Could not enter fullscreen here.')));
    } catch (e) { toast(L('Tam ekran burada açılamadı.', 'Could not enter fullscreen here.')); }
  };
  $('#mNew').onclick = () => askConfirm(L('Mevcut oyunun silinecek.', 'Your current game will be deleted.'), () => { deleteSave(); G = null; closeDrawer(); renderSetup(); }, () => {});
  $('#mHelp').onclick = () => {
    showModal(`<div class="sheet"><button class="x" data-close>✕</button><h2>❓ ${L('Nasıl oynanır?', 'How to play')}</h2><div class="help">${L(`
      <p><b>⏳ Turlar:</b> Oyun tur tabanlıdır. Her tur ${TURN_DAYS} gün sürer. Emirlerini ver, sonra sağ alttaki <b>TURU BİTİR</b> düğmesine bas; tüm ordular aynı anda hareket eder.</p>
      <p><b>🗺️ Harita:</b> Harita illere bölünmüştür; renkler krallıkları, kalın çizgiler krallık sınırlarını gösterir. Parmakla kaydır, iki parmakla yakınlaştır.</p>
      <p><b>🚶 Hareket:</b> Bir ile, şehre ya da orduya dokun ve "Buraya git" de. Rota çizilir; sarı elmaslar her turun sonunda nerede olacağını gösterir. Ordun bir turda hareket puanı kadar il ilerler (deniz geçişi 2 puan). Süvari ordunu hızlandırır.</p>
      <p><b>🏰 Şehirler:</b> Şehrin ilindeyken düğmesi çıkar. Asker topla, milisleri eğit, dinlen, meyhaneye uğra. Düşman şehrinde "Kuşat" çıkar: 3 gün sonra hücum edersin.</p>
      <p><b>⚔️ Savaş:</b> Düşmanla karşılaşınca savaşabilir, otomatik çözebilir ya da kaçabilirsin. Savaş ekranında kahramanını joystickle yönet. Askerlerin üzerindeki Roma rakamı seviyelerini (I–IV) gösterir. Askerlerine Hücum / Bekle / Takip emri ver. 🔭 tüm meydanı gösterir.</p>
      <p><b>💰 Ordu:</b> Askerler her ay maaş ister. Ödeyemezsen kaçarlar.</p>
      <p><b>👑 Yükseliş:</b> Köylü → Asker → Şövalye/Sipahi → Lord/Bey → Dük/Emir → Kral/Sultan. Efendinden toprak iste, düşman kalelerini al, isyan et ya da kendi krallığını ilan et.</p>
      <p><b>🗡️ Entrika:</b> Kişiler panelinden birine dokun: evlilik, baştan çıkarma, rüşvet, şantaj, suikast, iftira… Her ay ${AP_MAX} hakkın var.</p>
      <p><b>☠️ Ölüm:</b> Ölünce en büyük meşru çocuğunla devam edersin. Varisin yoksa hanedan biter.</p>`, `
      <p><b>⏳ Turns:</b> The game is turn-based. Each turn lasts ${TURN_DAYS} days. Give your orders, then press <b>END TURN</b> at the bottom right; all armies move at the same time.</p>
      <p><b>🗺️ Map:</b> The map is divided into provinces; colours show realms and thick lines mark realm borders. Drag to pan, pinch to zoom.</p>
      <p><b>🚶 Movement:</b> Tap a province, city or army and choose "Move here". The route is drawn; yellow diamonds show where you will be at the end of each turn. Your army moves as many provinces per turn as its movement points (a sea crossing costs 2). Cavalry makes your army faster.</p>
      <p><b>🏰 Cities:</b> When you are in a city's province its button appears. Recruit, train militia, rest, visit the tavern. At an enemy city you can "Besiege" it and storm the walls after 3 days.</p>
      <p><b>⚔️ Battle:</b> When you meet an enemy you can fight, auto-resolve or flee. In battle, steer your hero with the joystick. The Roman numeral on each soldier shows its tier (I–IV). Order your troops to Charge / Hold / Follow. 🔭 shows the whole field.</p>
      <p><b>💰 Army:</b> Soldiers want wages every month. If you cannot pay, they desert.</p>
      <p><b>👑 Rising:</b> Peasant → Soldier → Knight/Sipahi → Lord/Bey → Duke/Emir → King/Sultan. Ask your liege for land, take enemy castles, rebel, or proclaim your own kingdom.</p>
      <p><b>🗡️ Intrigue:</b> Tap someone in the People panel: marriage, seduction, bribes, blackmail, murder, slander… You get ${AP_MAX} actions each month.</p>
      <p><b>☠️ Death:</b> When you die you continue as your eldest legitimate child. With no heir, your dynasty ends.</p>`)}</div></div>`, 'menu');
    $('#modal').querySelector('[data-close]').onclick = closeModal;
  };
}
function renderGameOver() {
  showScreen('setup');
  const o = G.over;
  $('#setup').innerHTML = `<div class="setup over"><div class="scol">
    <div class="brand"><div class="logo">☠️</div><div><h1>${L('Hanedan Sona Erdi', 'Your Dynasty Has Ended')}</h1><p class="sub">${L(`<b>${esc(o.name)}</b>, ${o.age} yaşında öldü. ${esc(o.reason)}. ${o.d}`, `<b>${esc(o.name)}</b> died at the age of ${o.age}. ${esc(o.reason)}. ${o.d}`)}</p></div></div>
    <div class="card"><p>${L('Kurucu', 'Founder')}: <b>${esc(G.founder)}</b></p><p>${L('Nesil', 'Generations')}: <b>${G.generation}</b> · ${L('Süre', 'Reign')}: <b>${L(`${Math.floor(G.monthsPlayed / 12)} yıl ${G.monthsPlayed % 12} ay`, `${Math.floor(G.monthsPlayed / 12)} years ${G.monthsPlayed % 12} months`)}</b></p></div>
    <button id="again" class="primary big">${L('Yeni Hikâye', 'New Story')}</button></div>
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
  startIconObserver();
  applyStaticText();
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
