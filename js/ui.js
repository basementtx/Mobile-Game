'use strict';
/* =========================================================
   TAÇ VE HANÇER — Arayüz
   ========================================================= */

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const UI = { tab: 'ben', filter: 'yakin', sheet: null, modal: null, breakdown: false };
let SETUP = null;

/* ---------- Ortak parçalar ---------- */
function hue(str) { let h = 0; for (const c of str) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
function avatar(c, size = 44) {
  const h = hue(c.dyn);
  const dead = !c.alive;
  return `<div class="av${dead ? ' dead' : ''}" style="width:${size}px;height:${size}px;--h:${h};font-size:${Math.round(size * 0.42)}px">
    <span>${esc(c.name[0])}</span><i>${c.age < 16 ? '🍼' : RANK_ICON[c.rank]}</i></div>`;
}
function opBadge(v) {
  const cls = v >= 40 ? 'pos2' : v > 0 ? 'pos' : v <= -40 ? 'neg2' : v < 0 ? 'neg' : 'neu';
  return `<span class="op ${cls}">${v > 0 ? '+' : ''}${v}</span>`;
}
function bar(v, max, cls) { return `<div class="bar ${cls || ''}"><div style="width:${clamp(v / max * 100, 0, 100)}%"></div></div>`; }
function traitChips(c) {
  return c.traits.map(t => `<span class="chip" title="${esc(TRAITS[t].d)}" data-tip="${esc(TRAITS[t].ad + ': ' + TRAITS[t].d)}">${TRAITS[t].ad}</span>`).join('');
}
function statGrid(c) {
  return `<div class="stats">${Object.keys(STATS).map(k => `<div><b>${STAT_ICON[k]} ${stat(c, k)}</b><small>${STATS[k]}</small></div>`).join('')}</div>`;
}
function tagsFor(p, t) {
  const tags = [];
  const rel = familyRel(p, t);
  if (rel) tags.push(['fam', rel === 'Çocuk' && t.bastard ? 'Piç çocuğun' : rel]);
  if (p.lovers.includes(t.id)) tags.push(['love', 'Sevgili']);
  if (p.lordId === t.id) tags.push(['lord', 'Efendin']);
  if (t.lordId === p.id) tags.push(['vas', t.titles.length ? 'Vasalın' : 'Sarayında']);
  if (t.prisonerOf) tags.push(['jail', t.prisonerOf === p.id ? 'Senin esirin' : 'Zindanda']);
  if (!t.alive) tags.push(['dead', 'Ölü']);
  const o = opinion(t, p);
  if (t.alive && o <= -50) tags.push(['enemy', 'Düşman']);
  if (t.alive && o >= 60 && !rel) tags.push(['friend', 'Dost']);
  if (knownSecretsOf(p, t).length) tags.push(['secret', 'Sırrını biliyorsun']);
  return tags.map(([c, l]) => `<span class="tag ${c}">${l}</span>`).join('');
}
function toast(msg) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 3800);
}

/* ---------- Kurulum ekranı ---------- */
function renderSetup() {
  if (!SETUP) SETUP = { name: '', dyn: '', female: false, start: 'koylu', traits: randomTraits(), base: randomBase() };
  const S = SETUP;
  const fake = { base: S.base, traits: S.traits, health: 100, age: 20 };
  const starts = [
    ['koylu', '🌾 Köylü', 'Zor', 'Hiçbir şeyin yok. Çamurdan taca tırman.'],
    ['sovalye', '⚔️ Şövalye', 'Orta', 'Bir lordun hizmetinde, kılıcın ve biraz şanın var.'],
    ['lord', '🏰 Lord', 'Kolay', 'Küçük bir baronluk ve vasallar senin.'],
  ];
  $('#app').innerHTML = `
  <div class="setup">
    <div class="logo">⚜️</div>
    <h1>Taç ve Hançer</h1>
    <p class="sub">Çamurda doğ. Tahtta öl. Ya da darağacında.</p>
    <div class="card">
      <label>Adın<input id="s-name" maxlength="16" placeholder="${S.female ? 'Örn. Isolde' : 'Örn. Aldric'}" value="${esc(S.name)}"></label>
      <label>Hanedan adı<input id="s-dyn" maxlength="16" placeholder="Örn. Karakurt" value="${esc(S.dyn)}"></label>
      <div class="seg">
        <button data-g="0" class="${!S.female ? 'on' : ''}">♂ Erkek</button>
        <button data-g="1" class="${S.female ? 'on' : ''}">♀ Kadın</button>
      </div>
    </div>
    <h3>Başlangıç</h3>
    <div class="starts">
      ${starts.map(([k, t, d, desc]) => `<button class="start ${S.start === k ? 'on' : ''}" data-s="${k}"><b>${t}</b><small>${d}</small><span>${desc}</span></button>`).join('')}
    </div>
    <h3>Karakterin</h3>
    <div class="card">
      <div class="chips">${traitChips(fake)}</div>
      ${statGrid(fake)}
      <button id="reroll" class="ghost">🎲 Zar at</button>
    </div>
    <button id="startBtn" class="primary big">Hikâyeni Başlat</button>
    ${hasSave() ? '<button id="contBtn" class="ghost">Kayıtlı oyuna dön</button>' : ''}
  </div>`;
  $('#s-name').oninput = e => { S.name = e.target.value; };
  $('#s-dyn').oninput = e => { S.dyn = e.target.value; };
  document.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { S.female = b.dataset.g === '1'; renderSetup(); });
  document.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { S.start = b.dataset.s; renderSetup(); });
  $('#reroll').onclick = () => { S.traits = randomTraits(); S.base = randomBase(); renderSetup(); };
  $('#startBtn').onclick = () => {
    const clean = v => v.replace(/[<>&"']/g, '').trim();
    const name = clean(S.name) || pick(S.female ? NAMES_F : NAMES_M);
    const dyn = clean(S.dyn) || pick(DYNASTIES);
    newWorld({ name, dyn, female: S.female, start: S.start, traits: S.traits, base: S.base });
    SETUP = null;
    UI.tab = 'ben';
    renderGame();
    processQueue();
  };
  if ($('#contBtn')) $('#contBtn').onclick = () => { if (loadGame()) { renderGame(); processQueue(); } };
}
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }

/* ---------- Ana ekran ---------- */
function renderGame() {
  if (!G) return renderSetup();
  if (G.over) return renderGameOver();
  const p = P();
  const scroll = $('#main') ? $('#main').scrollTop : 0;
  $('#app').innerHTML = `
  <header class="top">
    <div class="who" data-open="${p.id}">
      ${avatar(p, 42)}
      <div><b>${esc(nm(p))}</b><small>${esc(titleOf(p))} · ${p.age} yaş${p.prisonerOf ? ' · ⛓️ Esir' : ''}</small></div>
    </div>
    <div class="date">${dateStr()}<button id="menuBtn" aria-label="Menü">☰</button></div>
    <div class="res">
      <span title="Altın">💰${p.gold}</span>
      <span title="Şan">⭐${Math.round(p.prestige)}</span>
      <span title="Korku">💀${Math.round(p.dread)}</span>
      <span title="Sağlık" class="${p.health < 40 ? 'warn' : ''}">❤️${Math.round(p.health)}</span>
      <span title="Stres" class="${p.stress > 70 ? 'warn' : ''}">😰${Math.round(p.stress)}</span>
    </div>
  </header>
  <main id="main">${{ ben: tabBen, kisiler: tabKisiler, eylem: tabEylem, gunluk: tabGunluk }[UI.tab](p)}</main>
  <div class="endbar">
    <div class="ap">${'<i class="on"></i>'.repeat(G.ap)}${'<i></i>'.repeat(AP_MAX - G.ap)}<small>${G.ap} eylem hakkı</small></div>
    <button id="endTurn" class="primary">Ayı Bitir ▸</button>
  </div>
  <nav class="tabs">
    ${[['ben', '👤', 'Ben'], ['kisiler', '👥', 'Kişiler'], ['eylem', '⚡', 'Eylemler'], ['gunluk', '📜', 'Günlük']].map(([k, i, l]) => `<button data-tab="${k}" class="${UI.tab === k ? 'on' : ''}"><span>${i}</span>${l}</button>`).join('')}
  </nav>`;
  $('#main').scrollTop = scroll;
  bindCommon();
}
function bindCommon() {
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { UI.tab = b.dataset.tab; renderGame(); $('#main').scrollTop = 0; });
  document.querySelectorAll('[data-open]').forEach(b => b.onclick = e => { e.stopPropagation(); openSheet(+b.dataset.open); });
  document.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { UI.filter = b.dataset.filter; renderGame(); });
  document.querySelectorAll('[data-act]').forEach(b => b.onclick = () => doAction(b.dataset.act, b.dataset.t ? +b.dataset.t : null));
  document.querySelectorAll('[data-tip]').forEach(b => b.onclick = e => { e.stopPropagation(); toast(b.dataset.tip); });
  const et = $('#endTurn');
  if (et) et.onclick = () => {
    if (G.queue.length) { processQueue(); return; }
    endMonth();
    renderGame();
    processQueue();
  };
  const mb = $('#menuBtn');
  if (mb) mb.onclick = openMenu;
}

/* ---------- Sekmeler ---------- */
function personLine(c, p, extra = '') {
  return `<button class="person" data-open="${c.id}">
    ${avatar(c)}
    <div class="pi"><b>${esc(nm(c))}</b><small>${esc(titleOf(c))} · ${c.age} yaş${extra}</small><div class="tags">${tagsFor(p, c)}</div></div>
    ${c.alive && c.id !== p.id ? opBadge(opinion(c, p)) : ''}
  </button>`;
}
function tabBen(p) {
  const lord = ch(p.lordId);
  const spouse = ch(p.spouseId);
  const kids = p.children.map(ch).filter(Boolean);
  const lovers = p.lovers.map(ch).filter(Boolean);
  const heir = heirOf(p);
  const w = warOf(p);
  const mySecrets = G.secrets.filter(s => s.actor === p.id || (s.target === p.id && s.type === 'pic'));
  const known = G.secrets.filter(s => s.actor !== p.id && s.known.includes(p.id) && !s.pub);
  const prisoners = living().filter(x => x.prisonerOf === p.id);
  let html = '';
  if (p.prisonerOf) html += `<div class="alert">⛓️ <b>${esc(nm(ch(p.prisonerOf)))}</b> seni zindanda tutuyor. Eylemler sekmesinden kaçmayı deneyebilirsin.</div>`;
  if (w) {
    const enemy = ch(w.att === p.id ? w.def : w.att);
    const sc = w.att === p.id ? w.score : -w.score;
    const mine = warPower(w, w.att === p.id ? 'att' : 'def').men, theirs = warPower(w, w.att === p.id ? 'def' : 'att').men;
    html += `<div class="card war"><h3>⚔️ Savaş: ${esc(nm(enemy))}</h3>
      <p>${w.goal === 'bagimsizlik' ? 'Bağımsızlık savaşı' : `Hedef: ${esc(G.titles[w.titleId] ? G.titles[w.titleId].name : '?')}`} · ${w.att === p.id ? 'Saldıran sensin' : 'Savunan sensin'}</p>
      <div class="warbar"><div style="left:${50 + sc / 2}%"></div></div>
      <p class="small">Savaş skoru: <b>${sc}</b> (100 = zafer, -100 = yenilgi) · Ordun ~${mine} · Düşman ~${theirs}</p></div>`;
  }
  html += `<div class="card">
    <div class="hero">${avatar(p, 64)}<div><h2>${esc(nm(p))}</h2><p>${esc(titleOf(p))} · ${p.age} yaşında · ${G.generation}. nesil</p>
    <p class="small">Efendin: ${lord ? `<a data-open="${lord.id}">${esc(nm(lord))}</a>` : '<i>Kimse (bağımsız)</i>'}</p></div></div>
    <div class="chips">${traitChips(p)}</div>
    ${statGrid(p)}
    <div class="meters">
      <div><small>Sağlık</small>${bar(p.health, 100, 'hp')}</div>
      <div><small>Stres</small>${bar(p.stress, 100, 'st')}</div>
    </div>
    <p class="small">Aylık gelir: <b>${income(p)}💰</b> · Rezalet: ${Math.round(p.shame)} · Zorbalık: ${Math.round(p.tyranny)} · Ordu: ~${armyOf(p, null)} asker</p>
  </div>`;
  if (p.titles.length) html += `<div class="card"><h3>🏰 Unvanların</h3>${p.titles.map(id => { const t = G.titles[id]; return `<p>${RANK_ICON[t.rank]} <b>${esc(t.name)}</b></p>`; }).join('')}
    <p class="small">Vasal: ${living().filter(x => x.lordId === p.id && x.titles.length).length} · Sarayında: ${living().filter(x => x.lordId === p.id && !x.titles.length).length}</p></div>`;
  html += `<div class="card"><h3>🌳 Hanedan ${esc(p.dyn)}</h3>
    <p class="small">Varisin: ${heir ? `<a data-open="${heir.id}">${esc(nm(heir))}</a> (${heir.age})` : '<b class="bad">YOK — ölürsen oyun biter!</b>'}</p>
    ${spouse ? personLine(spouse, p) : ''}
    ${lovers.map(l => personLine(l, p)).join('')}
    ${kids.map(k => personLine(k, p)).join('')}
    ${!spouse && !kids.length && !lovers.length ? '<p class="small muted">Henüz bir ailen yok. Evlen ya da... başka yollar dene.</p>' : ''}
  </div>`;
  if (prisoners.length) html += `<div class="card"><h3>⛓️ Zindanındakiler</h3>${prisoners.map(x => personLine(x, p)).join('')}</div>`;
  html += `<div class="card"><h3>🗝️ Bildiğin sırlar</h3>${known.length ? known.map(s => `<p class="secret">• ${esc(secretText(s))}</p>`).join('') : '<p class="small muted">Henüz kimsenin sırrını bilmiyorsun. Casusluk yap, sohbet et, kulak kabart.</p>'}</div>`;
  html += `<div class="card"><h3>🩸 Senin sırların</h3>${mySecrets.length ? mySecrets.map(s => `<p class="secret ${s.pub ? 'pub' : ''}">• ${esc(secretText(s))}<small>${s.pub ? ' — HERKES BİLİYOR' : ` — ${s.known.length - 1} kişi biliyor`}</small></p>`).join('') : '<p class="small muted">Vicdanın (şimdilik) temiz.</p>'}</div>`;
  return html;
}
function filterList(p) {
  const all = Object.values(G.chars);
  const L = living().filter(c => c.id !== p.id);
  switch (UI.filter) {
    case 'yakin': return L.filter(c => familyRel(p, c) || p.lovers.includes(c.id) || c.id === p.lordId || c.lordId === p.id ||
      (p.lordId != null && c.lordId === p.lordId) || c.prisonerOf === p.id || Math.abs(opinion(c, p)) >= 40);
    case 'soylu': return L.filter(c => c.rank >= 3);
    case 'hepsi': return L.filter(isAdult);
    case 'sirlar': return L.filter(c => knownSecretsOf(p, c).length);
    case 'olu': return all.filter(c => !c.alive && (familyRel(p, c) || (p.op[c.id] !== undefined))).slice(-40);
    default: return L;
  }
}
function tabKisiler(p) {
  const list = filterList(p).sort((a, b) => b.rank - a.rank || opinion(b, p) - opinion(a, p));
  const fs = [['yakin', 'Yakınlar'], ['soylu', 'Soylular'], ['hepsi', 'Herkes'], ['sirlar', 'Sırlar'], ['olu', 'Ölüler']];
  return `<div class="filters">${fs.map(([k, l]) => `<button data-filter="${k}" class="${UI.filter === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <p class="small muted pad">${list.length} kişi · Sağdaki sayı onun sana bakışı.</p>
    ${list.map(c => personLine(c, p)).join('') || '<p class="muted pad">Kimse yok.</p>'}`;
}
function actionButton(a, p, t) {
  if (!a.show(p, t)) return '';
  const label = typeof a.ad === 'function' ? a.ad(p, t) : a.ad;
  let reason = a.req(p, t);
  if (!reason && G.ap < a.ap) reason = 'Bu ay eylem hakkın kalmadı';
  const c = a.chance ? a.chance(p, t) : null;
  const inf = a.info ? a.info(p, t) : '';
  return `<button class="act ${reason ? 'off' : ''}" data-act="${a.id}" ${t ? `data-t="${t.id}"` : ''} ${reason ? 'disabled' : ''}>
    <span class="ai">${a.icon}</span>
    <span class="al">${esc(label)}${inf ? `<small>${esc(inf)}</small>` : ''}${reason ? `<em>${esc(reason)}</em>` : ''}</span>
    <span class="am">${c != null ? `<b class="${c >= 60 ? 'good' : c >= 30 ? 'mid' : 'bad'}">%${c}</b>` : ''}${a.ap ? `<small>${a.ap}⚡</small>` : ''}</span>
  </button>`;
}
function tabEylem(p) {
  const acts = ACTIONS.filter(a => !a.tgt).map(a => actionButton(a, p, null)).join('');
  return `<p class="small muted pad">Kendi işlerin. Başkalarıyla etkileşim için <b>Kişiler</b> sekmesinden birine dokun.</p>
    <div class="acts">${acts}</div>`;
}
function tabGunluk() {
  return `<div class="log">${G.log.map(l => `<div class="le ${l.k}"><small>${l.d}</small><p>${l.m}</p></div>`).join('')}</div>`;
}

/* ---------- Karakter kartı ---------- */
function openSheet(id) { UI.sheet = id; UI.breakdown = false; renderSheet(); }
function renderSheet() {
  const t = ch(UI.sheet), p = P();
  if (!t) return closeModal();
  const self = t.id === p.id;
  const lord = ch(t.lordId), spouse = ch(t.spouseId);
  const o = self ? 0 : opinion(t, p), mine = self ? 0 : opinion(p, t);
  const parts = self ? [] : opinionParts(t, p);
  const secrets = self ? [] : G.secrets.filter(s => (s.actor === t.id || s.target === t.id) && knows(p, s));
  const kids = t.children.map(ch).filter(k => k && (k.alive || familyRel(p, k)));
  let acts = '';
  if (!self && t.alive && !G.over) acts = ACTIONS.filter(a => a.tgt).map(a => actionButton(a, p, t)).join('');
  const html = `
  <div class="sheet">
    <button class="x" data-close>✕</button>
    <div class="hero">${avatar(t, 64)}<div>
      <h2>${esc(nm(t))}${t.alive ? '' : ' †'}</h2>
      <p>${esc(titleOf(t))} · ${t.age} yaş${t.bastard ? ' · Gayrimeşru' : ''}</p>
      ${t.alive ? '' : `<p class="small bad">${esc(t.death.reason)} (${t.death.d})</p>`}
      <div class="tags">${tagsFor(p, t)}</div>
    </div></div>
    ${!self && t.alive ? `<div class="rel" data-bd>
      <div><small>Sana bakışı</small>${opBadge(o)}</div>
      <div><small>Senin ona bakışın</small>${opBadge(mine)}</div>
      <span class="small muted">${UI.breakdown ? '▲' : '▼ neden?'}</span>
    </div>
    ${UI.breakdown ? `<div class="bd">${parts.length ? parts.map(([l, v]) => `<p><span>${esc(l)}</span>${opBadge(v)}</p>`).join('') : '<p class="muted">Henüz bir fikri yok.</p>'}</div>` : ''}` : ''}
    <div class="chips">${traitChips(t)}</div>
    ${statGrid(t)}
    <p class="small">💰 ${t.gold} · ⭐ ${Math.round(t.prestige)} · ❤️ ${Math.round(t.health)}${t.rank >= 3 ? ` · 🪖 ~${armyOf(t, null)}` : ''}</p>
    <div class="links">
      ${lord ? `<p>Efendisi: <a data-open="${lord.id}">${esc(nm(lord))}</a></p>` : ''}
      ${spouse ? `<p>Eşi: <a data-open="${spouse.id}">${esc(nm(spouse))}</a></p>` : ''}
      ${t.prisonerOf ? `<p>⛓️ Esir tutan: <a data-open="${t.prisonerOf}">${esc(nm(ch(t.prisonerOf)))}</a></p>` : ''}
      ${t.titles.length ? `<p>Unvanlar: ${t.titles.map(id => esc(G.titles[id].name)).join(', ')}</p>` : ''}
      ${kids.length ? `<p>Çocukları: ${kids.map(k => `<a data-open="${k.id}">${esc(k.name)}${k.alive ? '' : '†'}</a>`).join(', ')}</p>` : ''}
    </div>
    ${secrets.length ? `<div class="card inner"><h3>🗝️ Bildiğin sırlar</h3>${secrets.map(s => `<p class="secret ${s.pub ? 'pub' : ''}">• ${esc(secretText(s))}${s.pub ? '<small> (herkes biliyor)</small>' : ''}</p>`).join('')}</div>` : ''}
    ${acts ? `<h3>Ne yapacaksın? <small class="muted">(${G.ap} eylem hakkı)</small></h3><div class="acts">${acts}</div>` : ''}
  </div>`;
  showModal(html);
  const m = $('#modal');
  m.querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal);
  m.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openSheet(+b.dataset.open));
  m.querySelectorAll('[data-act]').forEach(b => b.onclick = () => doAction(b.dataset.act, +b.dataset.t));
  m.querySelectorAll('[data-tip]').forEach(b => b.onclick = () => toast(b.dataset.tip));
  const bd = m.querySelector('[data-bd]');
  if (bd) bd.onclick = () => { UI.breakdown = !UI.breakdown; renderSheet(); };
}

/* ---------- Eylem yürütme ---------- */
function doAction(aid, tid) {
  const a = ACTION_MAP[aid], p = P(), t = tid != null ? ch(tid) : null;
  if (!a || G.over) return;
  if (G.ap < a.ap) return toast('Bu ay eylem hakkın kalmadı. Ayı bitir.');
  const reason = a.req(p, t);
  if (reason) return toast(reason);
  if (a.confirm && !confirm(typeof a.confirm === 'function' ? a.confirm(t) : a.confirm)) return;
  G.ap -= a.ap;
  const msg = a.run(p, t);
  if (msg) log(msg, 'player');
  saveGame();
  if (G.over || G.queue.length || G.playerId !== p.id) {
    closeModal();
    if (msg) toast(msg);
    renderGame();
    processQueue();
    return;
  }
  if (msg) toast(msg);
  renderGame();
  if (UI.modal === 'sheet') renderSheet();
}

/* ---------- Modal ---------- */
function showModal(html, kind = 'sheet') {
  const m = $('#modal');
  UI.modal = kind;
  m.innerHTML = `<div class="backdrop"></div><div class="panel">${html}</div>`;
  m.classList.remove('hidden');
  m.querySelector('.backdrop').onclick = () => { if (kind === 'sheet' || kind === 'menu') closeModal(); };
}
function closeModal() {
  const m = $('#modal');
  m.classList.add('hidden');
  m.innerHTML = '';
  UI.modal = null;
  UI.sheet = null;
}

/* ---------- Olay kuyruğu ---------- */
function processQueue() {
  if (UI.modal === 'event') return;
  if (G.over) { closeModal(); return renderGameOver(); }
  while (G.queue.length) {
    const q = G.queue[0];
    const ev = EVENTS[q.id];
    const p = P();
    if (!ev || (ev.valid && !ev.valid(p, q.d))) { G.queue.shift(); continue; }
    const opts = ev.secenekler(p, q.d);
    const html = `<div class="event">
      <h2>${typeof ev.baslik === 'function' ? ev.baslik(p, q.d) : ev.baslik}</h2>
      <div class="etext">${ev.metin(p, q.d)}</div>
      <div class="eopts">${opts.map((o, i) => { const ok = !o.req || o.req(); return `<button class="opt" data-i="${i}" ${ok ? '' : 'disabled'}>${o.t}</button>`; }).join('')}</div>
    </div>`;
    showModal(html, 'event');
    $('#modal').querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      const o = opts[+b.dataset.i];
      const res = o.f();
      G.queue.shift();
      if (res) log(res, 'event');
      saveGame();
      renderGame();
      if (res) {
        showModal(`<div class="event"><div class="etext">${res}</div><div class="eopts"><button class="opt primary" data-next>Devam</button></div></div>`, 'event');
        $('#modal').querySelector('[data-next]').onclick = () => { closeModal(); renderGame(); processQueue(); };
      } else { closeModal(); renderGame(); processQueue(); }
    });
    return;
  }
}

/* ---------- Menü / Oyun sonu ---------- */
function openMenu() {
  showModal(`<div class="sheet"><button class="x" data-close>✕</button><h2>⚜️ Menü</h2>
    <div class="acts">
      <button class="act" id="mHelp"><span class="ai">❓</span><span class="al">Nasıl oynanır?</span></button>
      <button class="act" id="mNew"><span class="ai">🔄</span><span class="al">Yeni oyun<em>Mevcut kayıt silinir</em></span></button>
    </div>
    <p class="small muted">Oyun her eylemden sonra otomatik kaydedilir.</p></div>`, 'menu');
  const m = $('#modal');
  m.querySelector('[data-close]').onclick = closeModal;
  $('#mNew').onclick = () => { if (confirm('Mevcut oyun silinecek. Emin misin?')) { deleteSave(); G = null; closeModal(); renderSetup(); } };
  $('#mHelp').onclick = () => { showModal(`<div class="sheet"><button class="x" data-close>✕</button><h2>❓ Nasıl oynanır?</h2>
    <div class="help">
    <p><b>Her ay 3 eylem hakkın var.</b> Harcayınca <b>Ayı Bitir</b>. Dünya da senin gibi yaşıyor: herkes entrika çeviriyor, evleniyor, aldatıyor, öldürüyor.</p>
    <p><b>👥 Kişiler:</b> Birine dokun, onunla ne yapabileceğini gör. Sohbet, hediye, rüşvet, baştan çıkarma, evlilik, casusluk, şantaj, iftira, suikast, düello...</p>
    <p><b>Görüş (sağdaki sayı):</b> O kişinin sana bakışı. Yüksekse teklifini kabul eder, düşükse sana kuyu kazar. "neden?" ile sebeplerini görürsün.</p>
    <p><b>🗝️ Sırlar:</b> Herkesin sırrı var. Casuslukla öğren, şantaj yap ya da ifşa et. Senin sırların ortaya çıkarsa efendin seni zindana atabilir.</p>
    <p><b>⬆️ Yükselmek:</b> Köylü → Asker → Şövalye → Lord → Dük → Kral. Efendinden terfi iste, onu memnun et... ya da ondan kurtul. Şövalye olunca toprak sahiplerine savaş açıp unvan gasp edebilirsin.</p>
    <p><b>👑 Kendi krallığın:</b> Bir dük olarak bağımsızlık ilan et ve kazan: kendi krallığını kurarsın.</p>
    <p><b>☠️ Ölüm:</b> Ölünce en büyük meşru çocuğunla devam edersin. Varisin yoksa oyun biter. Piç çocuklarını meşrulaştırabilirsin.</p>
    <p><b>😰 Stres:</b> Kişiliğine aykırı davranmak (merhametliyken idam etmek gibi) stres yapar. 100'e ulaşırsa ruhun çöker.</p>
    <p><b>💀 Korku & Zorbalık:</b> Haksız hapis ve idamlar korku salar ama vasalların seni sevmez. Çok sevilmeyen hükümdarlara isyan edilir.</p>
    </div></div>`, 'menu'); $('#modal').querySelector('[data-close]').onclick = closeModal; };
}
function renderGameOver() {
  const o = G.over;
  const dyn = Object.values(G.chars).filter(c => c.dyn === P().dyn);
  $('#app').innerHTML = `<div class="setup over">
    <div class="logo">☠️</div>
    <h1>Hanedan Sona Erdi</h1>
    <p class="sub"><b>${esc(o.name)}</b>, ${o.age} yaşında öldü.<br><i>${esc(o.reason)}</i><br>${o.d}</p>
    <div class="card">
      <p>Kurucu: <b>${esc(G.founder)}</b></p>
      <p>Nesil sayısı: <b>${G.generation}</b></p>
      <p>Hüküm süresi: <b>${Math.floor(G.monthsPlayed / 12)} yıl ${G.monthsPlayed % 12} ay</b></p>
      <p>En yüksek rütbe: <b>${RANKS_M[P().rank]}</b></p>
      <p>Hanedan üyeleri: <b>${dyn.length}</b></p>
    </div>
    <div class="log short">${G.log.slice(0, 12).map(l => `<div class="le ${l.k}"><small>${l.d}</small><p>${l.m}</p></div>`).join('')}</div>
    <button id="again" class="primary big">Yeni Hikâye</button>
  </div>`;
  $('#again').onclick = () => { deleteSave(); G = null; renderSetup(); };
}

/* ---------- Başlat ---------- */
window.addEventListener('load', () => {
  if (loadGame()) { renderGame(); processQueue(); } else renderSetup();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
});
