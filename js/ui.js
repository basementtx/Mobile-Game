'use strict';
/* =========================================================
   Crown & Dagger — Arayüz (yatay ekran, gerçek zamanlı)
   ========================================================= */

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const UI = { screen: 'setup', drawer: null, filter: 'saray', sheet: null, modal: null, breakdown: false, speed: 1, forcePortrait: false, pop: null, realmTab: 'genel' };
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
function avatar(c, size = 40, mood) {
  const md = mood != null ? mood : (G && c.alive && c.id !== G.playerId && P() ? opinion(c, P()) / 100 : 0.2);
  return `<div class="av${c.alive ? '' : ' dead'}" style="width:${size}px;height:${size}px;--h:${hue(c.dyn)};font-size:${Math.round(size * 0.42)}px">
    ${portrait(c, md)}<i>${c.age < 16 ? '🍼' : RANK_ICON[c.rank]}</i></div>`;
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
function hasSave() { return !!readSave(); }
function showScreen(name) {
  UI.screen = name;
  for (const id of ['setup', 'game']) $('#' + id).classList.toggle('hidden', id !== name);
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

/* ---------- Kurulum: yalnızca hükümdar olarak başlanır ---------- */
const REALM_BLURB = {
  ingiltere: BL('Henry II\'nin Angevin mirası: Manş\'ın iki yakasında topraklar, asi oğullar ve kıskanç bir Fransız kralı.', 'The Angevin inheritance of Henry II: lands on both sides of the Channel, rebellious sons and a jealous French king.'),
  fransa: BL('Küçük ama kutsal bir taç. Paris\'ten dışarıya, vasallarından güçlü olmayı öğrenmelisin.', 'A small but sacred crown. From Paris outward you must learn to be stronger than your vassals.'),
  hre: BL('Barbarossa\'nın imparatorluğu: geniş, zengin ve asla tam itaat etmeyen prensler.', 'Barbarossa\'s empire: vast, rich, and full of princes who never quite obey.'),
  kastilya: BL('Reconquista\'nın kalbi. Güneyde Muvahhidler, yanında kıskanç Hristiyan komşular.', 'The heart of the Reconquista. The Almohads to the south, jealous Christian neighbours beside you.'),
  aragon: BL('Barselona\'nın tüccarları ve Pirenelerin kaleleri. Deniz seni çağırıyor.', 'The merchants of Barcelona and the castles of the Pyrenees. The sea is calling.'),
  portekiz: BL('Genç bir krallık: Lizbon yeni alındı, Muvahhidler geri almak istiyor.', 'A young kingdom: Lisbon newly won, and the Almohads want it back.'),
  sicilya: BL('Normanların zengin adası: Arap, Rum ve Latin aynı sarayda.', 'The rich island of the Normans: Arab, Greek and Latin at one court.'),
  venedik: BL('Tek şehirlik bir cumhuriyet, ama Akdeniz\'in yarısının hesabını tutar.', 'A republic of one city that keeps the accounts of half the Mediterranean.'),
  macar: BL('Árpádların bozkırdan gelen krallığı; Bizans ile Almanlar arasında.', 'The Árpáds\' kingdom out of the steppe, wedged between Byzantium and the Germans.'),
  kudus: BL('Kuşatılmış bir taç. Selahaddin kapıda, baronlar kendi aralarında kavgada.', 'A crown under siege. Saladin is at the gates and the barons quarrel among themselves.'),
  leh: BL('Piastların bölünmüş mirası; Krakov\'u tutan yaşlı dükleri yönetir.', 'The divided Piast inheritance; whoever holds Kraków rules the senior dukes.'),
  rus: BL('Kiev\'in altın kubbeleri sönüyor; Rurikoğulları birbirinin boğazında.', 'The golden domes of Kiev are fading; the Rurikids are at each other\'s throats.'),
  bulgar: BL('Bizans boyunduruğu altında kaynayan bir halk. Asenler ayaklanmaya hazır.', 'A people seething under Byzantine rule. The Asens are ready to rise.'),
  danimarka: BL('Valdemar\'ın torunları Baltık\'a hükmetmek istiyor.', 'Valdemar\'s heirs mean to rule the Baltic.'),
  norvec: BL('İç savaşlar çağı: Sverre\'nin tacı kılıcının ucunda duruyor.', 'The age of civil wars: Sverre\'s crown rests on the point of his sword.'),
  isvec: BL('Erik ve Sverker aileleri tahtı sırayla kapışıyor.', 'The houses of Erik and Sverker take turns fighting for the throne.'),
  bizans: BL('Manuel Komnenos öldü. Altın Konstantinopolis, çocuk bir imparator ve aç kurtlar.', 'Manuel Komnenos is dead. Golden Constantinople, a child emperor and hungry wolves.'),
  gurcu: BL('Kraliçe Tamar\'ın altın çağının eşiğinde, Kafkasların incisi.', 'The jewel of the Caucasus, on the threshold of Queen Tamar\'s golden age.'),
  selcuklu: BL('Miryokefalon\'un galipleri. Anadolu\'nun kapıları ardına kadar açık.', 'The victors of Myriokephalon. The gates of Anatolia stand wide open.'),
  artuklu: BL('Diyarbakır ve Mardin\'in gururlu beyleri; Selahaddin\'in gölgesinde.', 'The proud beys of Amid and Mardin, in the shadow of Saladin.'),
  irak: BL('Büyük Selçukluların son mirası; atabeyler sultanı kukla etmek istiyor.', 'The last legacy of the Great Seljuks; the atabegs would make the sultan a puppet.'),
  eyyubi: BL('Selahaddin\'in yükselen sultanlığı: Kahire\'den Şam\'a, hedef Kudüs.', 'Saladin\'s rising sultanate: from Cairo to Damascus, with Jerusalem in its sights.'),
  abbasi: BL('Halifenin sözü hâlâ kutsal, ama ordusu Bağdat surlarının ötesine zor ulaşır.', 'The Caliph\'s word is still sacred, but his army barely reaches beyond Baghdad\'s walls.'),
  muvahhid: BL('Atlas\'tan Endülüs\'e uzanan bir halifelik; Hristiyan krallar kuzeyde bekliyor.', 'A caliphate from the Atlas to al-Andalus; the Christian kings wait in the north.'),
};
function realmDifficulty(key) {
  const n = SETTLEMENTS.filter(s => s[4] === key).length;
  const war = START_WARS.some(w => w.includes(key));
  const score = n + (war ? -4 : 0);
  return score >= 7 ? ['easy', L('Kolay', 'Easy')] : score >= 4 ? ['mid', L('Orta', 'Normal')] : ['hard', L('Zor', 'Hard')];
}
function renderSetup() {
  showScreen('setup');
  if (!SETUP) SETUP = { name: '', dyn: '', female: false, realm: 'selcuklu', traits: randomTraits(), base: randomBase() };
  const S = SETUP;
  if (!REALMS[S.realm]) S.realm = 'selcuklu';
  const fake = { base: S.base, traits: S.traits, health: 100, age: 27 };
  const R = REALMS[S.realm];
  const sett = SETTLEMENTS.filter(s => s[4] === S.realm);
  const cap = sett.find(s => s[5]) || sett[0];
  const title = pickB(R.u[S.female ? 1 : 0]);
  const rname = k => pickB(REALMS[k].ad);
  const wars = START_WARS.filter(w => w.includes(S.realm)).map(w => w[0] === S.realm ? w[1] : w[0]);
  const pacts = START_PACTS.filter(w => w.includes(S.realm)).map(w => w[0] === S.realm ? w[1] : w[0]);
  const [dk, dl] = realmDifficulty(S.realm);
  const realmsSorted = Object.entries(REALMS).sort((a, b) => a[1].kisa.localeCompare(b[1].kisa, LANG));
  $('#setup').innerHTML = `
  <div class="setup">
    <div class="scol">
      <div class="brand"><div class="logo">⚜️</div><div><h1>${gameTitle()}</h1><p class="sub">Anno Domini 1180 · ${L('Hicri', 'Hijri')} 576</p></div></div>
      ${langSwitch()}
      <div class="ck-card realmpick">
        <div class="rp-flag">${flagHtml({ key: S.realm }, 64, 'big')}</div>
        <div class="rp-tx"><small class="eyebrow">${L('Krallığın', 'Your realm')}</small><h2>${esc(R.ad)}</h2>
          <p class="small">${esc(title)} · ${L(`${esc(S.dyn || R.han)} Hanedanı`, `House ${esc(S.dyn || R.han)}`)} · ${CULTURES[R.kul].ad}</p>
          <p class="small muted">${L('Başkent', 'Capital')}: ${esc(settName(cap[0]))} · ${sett.length} ${L('yerleşim', 'holdings')} · <span class="diff ${dk}">${dl}</span></p></div>
        <p class="rp-blurb">${esc(pickB(REALM_BLURB[S.realm]) || '')}</p>
        ${wars.length || pacts.length ? `<p class="small rp-rel">${wars.map(k => `<span class="tag enemy">⚔️ ${esc(rname(k))}</span>`).join('')}${pacts.map(k => `<span class="tag friend">🤝 ${esc(rname(k))}</span>`).join('')}</p>` : ''}
      </div>
      <div class="ck-card">
        <small class="eyebrow">${L('Hükümdarın', 'Your ruler')}</small>
        <div class="row2">
          <label>${L('Adın', 'Name')}<input id="s-name" maxlength="16" placeholder="${L('Rastgele', 'Random')}" value="${esc(S.name)}"></label>
          <label>${L('Hanedan', 'Dynasty')}<input id="s-dyn" maxlength="16" placeholder="${esc(R.han)}" value="${esc(S.dyn)}"></label>
        </div>
        <div class="seg"><button data-g="0" class="${!S.female ? 'on' : ''}">♂ ${esc(pickB(R.u[0]))}</button><button data-g="1" class="${S.female ? 'on' : ''}">♀ ${esc(pickB(R.u[1]))}</button></div>
        <div class="chips">${traitChips(fake)}</div>${statGrid(fake)}<button id="reroll" class="ghost">🎲 ${L('Zar at', 'Reroll')}</button>
      </div>
      <button id="startBtn" class="primary big">${L(`${esc(title)} olarak taç giy`, `Be crowned ${esc(title)}`)}</button>
      ${hasSave() ? `<button id="contBtn" class="ghost">${L('Kayıtlı oyuna dön', 'Continue saved game')}</button>` : ''}
    </div>
    <div class="scol">
      <h3>${L('Krallığını seç', 'Choose your realm')}</h3>
      <div class="realms">${realmsSorted.map(([k, r]) => `<button class="rbtn ${S.realm === k ? 'on' : ''}" data-r="${k}">${flagHtml({ key: k }, 22)}<span>${esc(r.kisa)}</span><small>${CULTURES[r.kul].ad} · ${SETTLEMENTS.filter(s => s[4] === k).length} ${L('yerleşim', 'holdings')}</small></button>`).join('')}</div>
    </div>
  </div>`;
  $('#s-name').oninput = e => { S.name = e.target.value; };
  $('#s-dyn').oninput = e => { S.dyn = e.target.value; };
  document.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { S.female = b.dataset.g === '1'; renderSetup(); });
  document.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { S.realm = b.dataset.r; renderSetup(); });
  bindLang($('#setup'), renderSetup);
  $('#reroll').onclick = () => { S.traits = randomTraits(); S.base = randomBase(); renderSetup(); };
  bindTips($('#setup'));
  $('#startBtn').onclick = () => {
    const btn = $('#startBtn'); btn.textContent = L('Dünya kuruluyor…', 'Forging the world…'); btn.disabled = true;
    setTimeout(() => {
      try {
        const clean = v => v.replace(/[<>&"']/g, '').trim();
        const C = CULTURES[REALMS[S.realm].kul];
        newWorld({ name: clean(S.name) || pick(S.female ? C.f : C.m), dyn: clean(S.dyn) || REALMS[S.realm].han, female: S.female, realm: S.realm, traits: S.traits, base: S.base });
        SETUP = null;
        startGameUI();
      } catch (e) { bootError(e); }
    }, 30);
  };
  if ($('#contBtn')) $('#contBtn').onclick = () => { try { if (loadGame()) { afterLoad(); startGameUI(); } } catch (e) { bootError(e); } };
}

/* ---------- Oyun ekranı ---------- */
let _mapReady = false;
function buildTools() {
  $('#tools').innerHTML = [['ben', '👤', L('Karakter', 'Character')], ['aile', '🌳', L('Aile', 'Family')], ['krallik', '👑', L('Krallık', 'Realm')], ['kisiler', '👥', L('Kişiler', 'People')], ['eylem', '🗡️', L('Entrika', 'Intrigue')], ['dunya', '🌍', L('Dünya', 'World')], ['gunluk', '📜', L('Günlük', 'Chronicle')]]
    .map(([k, i, l]) => `<button data-drawer="${k}"><span>${i}</span>${l}</button>`).join('');
  $('#tools').querySelectorAll('[data-drawer]').forEach(b => b.onclick = () => openDrawer(b.dataset.drawer));
}
function startGameUI() {
  showScreen('game');
  if (!_mapReady) {
    setupMap($('#mapcv'));
    _mapReady = true;
    buildTools();
    $('#drawer .dx').onclick = closeDrawer;
  }
  closePop();
  const n = myNat();
  const seat = seatOf(P());
  if (seat && seat.tile >= 0) centerOnTile(seat.tile);
  else if (n) { const t = natLabelTile(n.i); if (t >= 0) centerOnTile(t); }
  CAM.z = 22;
  resizeMap();
  repaintAll();
  for (const h of ['#hudL', '#hudR', '#ctrl', '#atks', '#lb']) { const e = $(h); if (e) e._h = null; }
  updateHUD();
  processQueue();
}
function updateHUD() {
  if (!G || UI.screen !== 'game') return;
  const p = P();
  const r = ownRealm(p) || realmOf(p);
  const n = myNat();
  if (setHTML($('#hudL'), `
    <div class="who">
      <button class="who-pt" data-me>${avatar(p, 58)}</button>
      <button class="who-cr" data-realm title="${r ? esc(r.name) : ''}">${flagHtml(r, 24)}</button>
      <button class="who-tx" data-me><b>${esc(nm(p))}</b><small>${esc(r ? r.name : titleOf(p))}</small></button>
    </div>
    <div class="res">
      ${n ? `<span title="${L('Toprak', 'Land')}">🗺️ <b>${(landShare(n.i) * 100).toFixed(1)}%</b></span>` : `<span title="${L('Kişisel altın', 'Personal gold')}">💰 <b>${p.gold}</b></span>`}
      <span title="${L('Şan', 'Prestige')}">⭐ <b>${Math.round(p.prestige)}</b></span>
      ${p.dread >= 5 ? `<span title="${L('Korku', 'Dread')}">💀 <b>${Math.round(p.dread)}</b></span>` : ''}
      <span class="${p.health < 40 ? 'warn' : ''}" title="${L('Sağlık', 'Health')}">❤️ <b>${Math.round(p.health)}</b></span>
      <span class="${p.stress > 70 ? 'warn' : ''}" title="${L('Stres', 'Stress')}">😰 <b>${Math.round(p.stress)}</b></span>
      <span class="apd" title="${L('Bu ayki entrika hakkı', 'Intrigue actions this month')}">${'<i class="on"></i>'.repeat(G.ap)}${'<i></i>'.repeat(Math.max(0, AP_MAX - G.ap))}</span>
    </div>`)) {
    $('#hudL').querySelectorAll('[data-me]').forEach(b => b.onclick = () => openSheet(P().id));
    $('#hudL [data-realm]').onclick = () => openRealm();
  }
  const sp = UI.speed;
  if (setHTML($('#hudR'), `<span class="date"><b>${(G.day % 30) + 1} ${monthName(G.month)} ${G.year}</b><small>${sp === 0 ? L('Duraklatıldı', 'Paused') : L('Gerçek zamanlı', 'Real time')}</small></span>
    <button id="pauseBtn" class="${sp === 0 ? 'on' : ''}" title="${L('Duraklat', 'Pause')}">${sp === 0 ? '▶' : '❚❚'}</button>
    <button id="spd" title="${L('Hız', 'Speed')}">${sp === 2 ? '2×' : sp === 3 ? '3×' : '1×'}</button>
    <button id="menuBtn" title="${L('Menü', 'Menu')}">☰</button>`)) {
    $('#pauseBtn').onclick = () => { if (UI.speed === 0) UI.speed = UI.lastSpeed || 1; else { UI.lastSpeed = UI.speed; UI.speed = 0; } updateHUD(); };
    $('#spd').onclick = () => { const s = UI.speed || UI.lastSpeed || 1; UI.speed = s === 1 ? 2 : s === 2 ? 3 : 1; updateHUD(); };
    $('#menuBtn').onclick = openMenu;
  }
  let status = '';
  if (p.prisonerOf) status = L(`⛓️ ${esc(nm(ch(p.prisonerOf)))} seni zindanda tutuyor.`, `⛓️ ${esc(nm(ch(p.prisonerOf)))} holds you in the dungeon.`);
  else if (!n) status = L('Bir krallığın yok — topraksız bir soylusun.', 'You hold no realm — a landless noble.');
  const wars = enemiesOf(realmOf(p));
  if (!status && n && G.tick < (G.truce || 0)) status = L(`🕊️ Ateşkes: ${Math.ceil((G.truce - G.tick) / 10)} sn — henüz kimse sana saldırmıyor. Sahipsiz topraklara yayıl!`, `🕊️ Truce: ${Math.ceil((G.truce - G.tick) / 10)} s — no one attacks you yet. Expand into unclaimed land!`);
  if (!status && wars.length) status = `${L('Savaşta', 'At war')}: ${wars.slice(0, 4).map(r => flagHtml(r, 12) + esc(realmShort(r))).join(' ')}${wars.length > 4 ? ' …' : ''}`;
  if (setHTML($('#status'), status + (p.prisonerOf ? ` <button data-c="kacis">${L('🏃 Kaç', '🏃 Escape')}</button>${p.gold >= 30 ? ` <button data-c="gardiyan">${L('🔑 Rüşvet', '🔑 Bribe')}</button>` : ''}` : '')))
    $('#status').querySelectorAll('[data-c]').forEach(b => b.onclick = () => doAction(b.dataset.c, null));
  $('#status').classList.toggle('hidden', !status);
  updateFrontHUD();
}
function paused() { return !!UI.modal || !!UI.drawer || (G && G.queue.length > 0) || UI.speed === 0; }

/* ---------- Ana döngü ---------- */
let _lastT = 0, _hudT = 0, _acc = 0;
function loop(t) {
  const dt = Math.min(0.25, (t - _lastT) / 1000 || 0);
  _lastT = t;
  try {
    if (UI.screen === 'game' && G && !G.over) {
      const live = tickWorld(dt);
      if (UI.screen === 'game') drawMap(t, live);
      _hudT += dt; if (_hudT > 0.25) { _hudT = 0; updateHUD(); }
    }
  } catch (e) { console.error(e); }
  requestAnimationFrame(loop);
}
function tickWorld(dt) {
  if (G.queue.length && !UI.modal) { processQueue(); return false; }
  if (paused()) { _acc = 0; return false; }
  _acc += dt * UI.speed;
  let n = 0;
  const m0 = G.month;
  while (_acc >= TICK && n < 8) { _acc -= TICK; n++; advanceRealtime(); if (G.over) break; }
  if (n >= 8) _acc = 0;
  if (G.over) { saveGame(); closeDrawer(); closePop(); renderGameOver(); return false; }
  if (G.month !== m0) { saveGame(); if (UI.drawer) renderDrawer(); }
  else saveGameThrottled();
  return true;
}

function resultModal(html) {
  showModal(`<div class="event ck"><div class="ev-main solo"><div class="etext">${html}</div><div class="eopts"><button class="opt primary" data-next>${L('Devam', 'Continue')}</button></div></div></div>`, 'event');
  $('#modal').querySelector('[data-next]').onclick = () => { closeModal(); saveGame(); updateHUD(); processQueue(); };
}

/* ---------- Çekmece paneller ---------- */
function drawerTitle(k) { return { aile: L('🌳 Aile ve hanedan', '🌳 Family & dynasty'), ben: L('👤 Karakter', '👤 Character'), kisiler: L('👥 Kişiler', '👥 People'), dunya: L('🌍 Dünya', '🌍 World'), eylem: L('🗡️ Entrika ve kişisel eylemler', '🗡️ Intrigue & personal'), gunluk: L('📜 Günlük', '📜 Chronicle') }[k]; }
function openDrawer(k) {
  if (k === 'krallik') return openRealm();
  closePop(); UI.drawer = k; renderDrawer(); $('#drawer').classList.remove('hidden'); $('#drawer .dbody').scrollTop = 0;
}
function closeDrawer() { UI.drawer = null; const d = $('#drawer'); if (d) d.classList.add('hidden'); updateHUD(); }
function renderDrawer() {
  if (!UI.drawer) return;
  const p = P();
  const body = $('#drawer .dbody');
  const sc = body.scrollTop;
  $('#drawer .dtitle').textContent = drawerTitle(UI.drawer);
  body.innerHTML = { aile: tabAile, ben: tabBen, kisiler: tabKisiler, dunya: tabDunya, eylem: tabEylem, gunluk: tabGunluk }[UI.drawer](p);
  body.scrollTop = sc;
  body.querySelectorAll('[data-open]').forEach(b => b.onclick = e => { e.stopPropagation(); openSheet(+b.dataset.open); });
  body.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { UI.filter = b.dataset.filter; renderDrawer(); });
  body.querySelectorAll('[data-act]').forEach(b => b.onclick = () => doAction(b.dataset.act, b.dataset.t ? +b.dataset.t : null));
  body.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { closeDrawer(); gotoSettlement(G.titles[b.dataset.goto]); });
  body.querySelectorAll('[data-gonat]').forEach(b => b.onclick = () => { const t = natLabelTile(+b.dataset.gonat); closeDrawer(); if (t >= 0) { centerOnTile(t, 14); openPop(t, null, null); } });
  bindTips(body);
  bindRealmUI(body);
  if (UI.drawer === 'aile') bindFamily(body);
}
/* Yerleşimi haritada göster ve panelini aç */
function gotoSettlement(s) {
  if (!s || s.tile == null || s.tile < 0) return;
  closeModal();
  centerOnTile(s.tile, 26);
  openPop(s.tile, null, null);
}
function refreshPanels() { if (UI.drawer) renderDrawer(); if (UI.modal === 'realm') renderRealm(); if (UI.pop) renderPop(); updateHUD(); }
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
  html += myTastesCard(p);
  html += `<div class="card"><h3>🗝️ ${L('Bildiğin sırlar', 'Secrets you know')}</h3>${known.length ? known.map(s => `<p class="secret">• ${esc(secretText(s))}</p>`).join('') : `<p class="small muted">${L('Henüz kimsenin sırrını bilmiyorsun.', 'You know no one\'s secrets yet.')}</p>`}</div>`;
  html += `<div class="card"><h3>🩸 ${L('Senin sırların', 'Your secrets')}</h3>${mySecrets.length ? mySecrets.map(s => `<p class="secret ${s.pub ? 'pub' : ''}">• ${esc(secretText(s))}<small>${s.pub ? L(' (herkes biliyor)', ' (public knowledge)') : L(` (${s.known.length - 1} kişi biliyor)`, ` (${s.known.length - 1} know)`)}</small></p>`).join('') : `<p class="small muted">${L('Vicdanın (şimdilik) temiz.', 'Your conscience is clean (for now).')}</p>`}</div>`;
  return html;
}
function filterList(p) {
  const list = living().filter(c => c.id !== p.id);
  const pr = realmOf(p);
  switch (UI.filter) {
    case 'saray': return list.filter(c => c.lordId === p.id && !c.titles.length);
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
  const fs = [['saray', L('Saray halkı', 'Court')], ['yakin', L('Yakınlar', 'Close')], ['krallik', L('Krallığım', 'My realm')], ['hukumdar', L('Hükümdarlar', 'Rulers')], ['sirlar', L('Sırlar', 'Secrets')], ['esir', L('Esirler', 'Prisoners')]];
  return `<div class="filters">${fs.map(([k, l]) => `<button data-filter="${k}" class="${UI.filter === k ? 'on' : ''}">${l}</button>`).join('')}</div>
    <p class="small muted">${L('Sağdaki sayı onun sana bakışı. Birine dokun: entrika, evlilik, rüşvet, suikast…', 'The number on the right is their opinion of you. Tap someone to scheme, marry, bribe, murder…')}</p>
    ${list.map(c => personLine(c, p)).join('') || `<p class="muted">${L('Kimse yok.', 'Nobody.')}</p>`}`;
}
function tabDunya(p) {
  const me = myNatIdx();
  const list = G.nat.filter(n => n.alive && NR[n.i].tiles).sort((a, b) => NR[b.i].tiles - NR[a.i].tiles);
  const wars = G.wars.map(w => `<p class="small">⚔️ ${flagHtml(G.titles[w.a], 12)}${esc(G.titles[w.a].name)} × ${flagHtml(G.titles[w.b], 12)}${esc(G.titles[w.b].name)}</p>`).join('');
  return `<div class="card"><h3>${L('Süren savaşlar', 'Ongoing wars')}</h3>${wars || `<p class="small muted">${L('Krallıklar şimdilik barış içinde.', 'The realms are at peace — for now.')}</p>`}
    <p class="small muted">${L('Kabileler (botlar) herkese saldırır ve herkes onlara saldırabilir.', 'Tribes attack anyone, and anyone may attack them.')}</p></div>
    ${list.slice(0, 80).map((n, i) => { const k = natRuler(n); return `<div class="person ${n.i === me ? 'me' : ''}"><b class="rank">${i + 1}</b>${flagHtml(natFlagObj(n), 22)}<div class="pi"><b>${esc(natName(n))}</b><small>${(landShare(n.i) * 100).toFixed(2)}% · ⚔ ${fmtCount(n.troops)}${k ? ' · ' + esc(nm(k)) : ''}</small><div class="tags">${me >= 0 ? relTag(me, n.i) : ''}</div></div><span class="ab"><button data-gonat="${n.i}" title="${L('Haritada göster', 'Show on map')}">📍</button>${k ? `<button data-open="${k.id}">👤</button>` : ''}</span></div>`; }).join('')}`;
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
  const r = realmOf(t);
  const tn = natOfRealm(ownRealm(t));
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
      <p class="small">💰 ${t.gold} · ⭐ ${Math.round(t.prestige)} · ❤️ ${Math.round(t.health)}${tn ? ` · ⚔ ${fmtCount(tn.troops)}` : ''}</p>
      <div class="links">
        ${lord ? `<p>${L('Efendisi', 'Liege')}: <a data-open="${lord.id}">${esc(nm(lord))}</a></p>` : ''}
        ${spouse ? `<p>${L('Eşi', 'Spouse')}: <a data-open="${spouse.id}">${esc(nm(spouse))}</a></p>` : ''}
        ${t.prisonerOf ? `<p>⛓️ ${L('Esir tutan', 'Held by')}: <a data-open="${t.prisonerOf}">${esc(nm(ch(t.prisonerOf)))}</a></p>` : ''}
        ${settlementsOf(t).length ? `<p>${L('Toprakları', 'Holdings')}: ${settlementsOf(t).map(s => `<a data-goto="${s.id}">${esc(s.name)}</a>`).join(', ')}</p>` : ''}
        ${kids.length ? `<p>${L('Çocukları', 'Children')}: ${kids.map(k => `<a data-open="${k.id}">${esc(k.name)}${k.alive ? '' : '†'}</a>`).join(', ')}</p>` : ''}
        ${tn ? `<p><a data-gonat="${tn.i}">📍 ${L('Krallığını haritada göster', 'Show their realm on the map')}</a></p>` : ''}
      </div>
      ${secrets.length ? `<div class="card inner"><h3>🗝️ ${L('Bildiğin sırlar', 'Secrets you know')}</h3>${secrets.map(s => `<p class="secret ${s.pub ? 'pub' : ''}">• ${esc(secretText(s))}</p>`).join('')}</div>` : ''}
      ${!self ? sheetTastes(t) : ''}
    </div>
    ${acts ? `<div class="scol"><button class="talkbig" data-talk ${G.ap < 1 ? 'disabled' : ''}><span>💬</span><b>${L('Konuş', 'Talk')}</b><small>${G.ap < 1 ? L('Bu ay vaktin kalmadı', 'No time left this month') : L('Sohbet, dedikodu, hediye, rica, flört… (1⚡)', 'Conversation, gossip, gifts, requests, flirting… (1⚡)')}</small></button>
      <h3>${L('Ne yapacaksın?', 'What will you do?')} <small class="muted">(${G.ap} ⚡)</small></h3><div class="acts">${acts}</div></div>` : ''}
  </div>`, 'sheet');
  const m = $('#modal');
  m.querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal);
  m.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openSheet(+b.dataset.open));
  m.querySelectorAll('[data-act]').forEach(b => b.onclick = () => doAction(b.dataset.act, +b.dataset.t));
  const tk = m.querySelector('[data-talk]'); if (tk) tk.onclick = () => { closeModal(); openDialogue(t.id); };
  m.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { closeDrawer(); gotoSettlement(G.titles[b.dataset.goto]); });
  m.querySelectorAll('[data-gonat]').forEach(b => b.onclick = () => { const tt = natLabelTile(+b.dataset.gonat); closeModal(); closeDrawer(); if (tt >= 0) { centerOnTile(tt, 14); openPop(tt, null, null); } });
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

/* ---------- Olay penceresi (CK3 tarzı) ---------- */
/* Olayın konusu olan kişi: portre olarak solda gösterilir */
function eventChar(d, p) {
  for (const k of ['from', 'a', 'lid', 'foe', 'kid', 'c', 't', 'who', 'b']) {
    const c = d && typeof d[k] === 'number' ? ch(d[k]) : null;
    if (c && c.id !== p.id) return c;
  }
  return null;
}
function eventWindow(title, text, who, optsHtml) {
  const p = P(), r = realmOf(p);
  const art = who
    ? `<div class="ev-art"><div class="ev-frame">${avatar(who, 104, who.alive ? opinion(who, p) / 100 : 0)}</div><b>${esc(nm(who))}</b><small>${esc(titleOf(who))}</small>${who.alive && who.id !== p.id ? opBadge(opinion(who, p)) : ''}</div>`
    : `<div class="ev-art"><div class="ev-frame seal">${flagHtml(r, 58, 'big')}</div><b>${esc(nm(p))}</b><small>${r ? esc(r.name) : ''}</small></div>`;
  return `<div class="event ck"><h2 class="ev-title">${title}</h2><div class="ev-grid">${art}<div class="ev-main"><div class="etext">${text}</div><div class="eopts">${optsHtml}</div></div></div></div>`;
}

/* ---------- Modal ---------- */
function showModal(html, kind = 'sheet') {
  const m = $('#modal');
  UI.modal = kind;
  m.innerHTML = `<div class="backdrop"></div><div class="panel ${kind}">${html}</div>`;
  m.classList.remove('hidden');
  m.querySelector('.backdrop').onclick = () => { if (kind === 'sheet' || kind === 'menu' || kind === 'realm') closeModal(); };
}
function closeModal() {
  const m = $('#modal');
  m.classList.add('hidden'); m.innerHTML = '';
  UI.modal = null; UI.sheet = null;
}
function processQueue() {
  if (UI.modal === 'event' || UI.modal === 'confirm' || !G) return;
  if (G.over) { closeModal(); return renderGameOver(); }
  while (G.queue.length) {
    const q = G.queue[0], ev = EVENTS[q.id], p = P();
    if (!ev || (ev.valid && !ev.valid(p, q.d))) { G.queue.shift(); continue; }
    const opts = ev.secenekler(p, q.d);
    showModal(eventWindow(typeof ev.baslik === 'function' ? ev.baslik(p, q.d) : ev.baslik, ev.metin(p, q.d), eventChar(q.d, p),
      opts.map((o, i) => `<button class="opt" data-i="${i}" ${!o.req || o.req() ? '' : 'disabled'}><i class="dia"></i><span>${o.t}</span></button>`).join('')), 'event');
    $('#modal').querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
      const res = opts[+b.dataset.i].f();
      G.queue.shift();
      if (res) log(res, 'event');
      saveGame();
      if (G.over) { closeModal(); return renderGameOver(); }
      if (res) {
        showModal(`<div class="event ck"><div class="ev-main solo"><div class="etext">${res}</div><div class="eopts"><button class="opt primary" data-next>${L('Devam', 'Continue')}</button></div></div></div>`, 'event');
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
  bindLang(m, () => { G.terrDirty = true; for (const h of ['#hudL', '#hudR', '#ctrl', '#atks', '#lb', '#pop']) { const e = $(h); if (e) e._h = null; } buildTools(); updateHUD(); openMenu(); });
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
      <p><b>⏱️ Gerçek zaman:</b> Dünya durmadan akar; bütün krallıklar ve kabileler aynı anda genişler. Sağ üstten duraklatabilir ya da hızlandırabilirsin. Menüler ve olaylar açıkken zaman durur.</p>
      <p><b>⚔️ Asker ve saldırı:</b> Askerlerin kendiliğinden çoğalır; sınırın toprağınla ve kasabalarınla büyür. Alttaki çubuk her saldırıya giden asker oranını belirler. Sahipsiz ya da düşman toprağa dokun, <b>Saldır</b> de: askerlerin ortak sınır boyunca karış karış ilerler. Dağlar ve kaleler ilerlemeyi yavaşlatır. Saldırı listesindeki ✕ ile geri çekilirsin (%25 kayıp).</p>
      <p><b>⛵ Çıkarma:</b> Deniz aşırı ya da sınırın olmayan bir toprağa gemiyle asker indir. Aynı anda en çok 3 gemi.</p>
      <p><b>🏗️ Yapılar:</b> Kendi toprağına dokun. <b>Kasaba</b> asker sınırını ve geliri artırır (üstüne kurarak seviye atlar), <b>liman</b> ticaret gemileri ve kadırga sağlar, <b>kale</b> çevresini korur, <b>mancınık atölyesi</b> ateş saldırısı fırlatır, <b>gözcü kulesi</b> gelen ateşi düşürür.</p>
      <p><b>🔥 Ateş saldırıları:</b> Atölyen varsa düşman toprağına Rum ateşi, büyük ateş ya da ateş yağmuru gönder: alan yanar, toprak sahipsiz kalır, askerler ölür. Herkes bundan nefret eder.</p>
      <p><b>🕊️ Diplomasi:</b> Bir krallığın toprağına dokun: barış, ittifak, asker ve altın yardımı, hükümdarla konuşma. Müttefiklere saldırılamaz. Kabilelerle diplomasi olmaz.</p>
      <p><b>👑 Krallık ekranı:</b> Meclis, yasalar (vergi altını, yükümlülük asker sınırını değiştirir), kararlar, diplomasi ve vasallar.</p>
      <p><b>🏰 Yerleşimler:</b> Haritadaki tarihî şehir ve kaleler unvandır. Fethedilen yerleşim hükümdarına geçer; dilersen vasallarına bağışlarsın.</p>
      <p><b>🗡️ Entrika:</b> Birinin kartını aç: evlilik, baştan çıkarma, rüşvet, şantaj, suikast, iftira… Her ay ${AP_MAX} hakkın var.</p>
      <p><b>💬 Konuşmalar:</b> Herkesin sevdiği ve sevmediği hobileri, eşyaları ve etkinlikleri var. Başkaları hakkında söylediklerin kulaktan kulağa yayılır.</p>
      <p><b>🌳 Aile:</b> Soy ağacın, gebelikler, sevgililer ve piç çocuklar. Çocuklarına evlilik ayarlayabilirsin.</p>
      <p><b>🏆 Zafer ve ölüm:</b> Karaların %80'ine hükmedersen dünyanın efendisi olursun. Ölünce varisinle devam edersin; varisin yoksa ya da krallığın haritadan silinirse hanedan biter.</p>`, `
      <p><b>⏱️ Real time:</b> The world never stops: every realm and tribe expands at once. Pause or speed up at the top right. Time stops while menus and events are open.</p>
      <p><b>⚔️ Troops and attacks:</b> Your troops grow on their own; the cap rises with your land and towns. The bar at the bottom sets what share of your troops each attack takes. Tap unclaimed or enemy land and press <b>Attack</b>: your troops push forward along the shared border. Mountains and forts slow the advance. Tap ✕ in the attack list to retreat (25% lost).</p>
      <p><b>⛵ Landings:</b> Ship troops to land across the sea, or anywhere you share no border. At most 3 ships at once.</p>
      <p><b>🏗️ Buildings:</b> Tap your own land. A <b>town</b> raises your troop cap and income (build on it again to level it up), a <b>harbour</b> brings trade ships and galleys, a <b>fort</b> guards its surroundings, a <b>siege workshop</b> launches fire strikes, and a <b>watchtower</b> shoots down incoming fire.</p>
      <p><b>🔥 Fire strikes:</b> With a workshop you can hurl Greek fire, a great blaze or a rain of fire onto enemy land: the area burns, the land is left unclaimed and troops die. Everyone hates it.</p>
      <p><b>🕊️ Diplomacy:</b> Tap a realm's land: peace, alliance, troop and gold aid, or talk to its ruler. Allies cannot be attacked. Tribes do not negotiate.</p>
      <p><b>👑 Realm screen:</b> council, laws (taxes change gold, levies change your troop cap), decisions, diplomacy and vassals.</p>
      <p><b>🏰 Holdings:</b> The historical cities and castles on the map are titles. A conquered holding passes to its realm's ruler; you may grant it to your vassals.</p>
      <p><b>🗡️ Intrigue:</b> Open someone's card: marriage, seduction, bribes, blackmail, murder, slander… You get ${AP_MAX} actions each month.</p>
      <p><b>💬 Conversations:</b> Everyone has hobbies, goods and activities they love or hate. What you say about others travels from ear to ear.</p>
      <p><b>🌳 Family:</b> Your family tree, pregnancies, lovers and bastards. You can arrange marriages for your children.</p>
      <p><b>🏆 Victory and death:</b> Rule 80% of all land to become master of the world. When you die you continue as your heir; with no heir, or if your realm is wiped from the map, your dynasty ends.</p>`)}</div></div>`, 'menu');
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
  const show = portrait && !UI.forcePortrait && UI.screen === 'game';
  $('#rotate').classList.toggle('hidden', !show);
}

/* ---------- Başlat ---------- */
/* Açılışta bir hata olursa kahverengi boş ekran yerine ne olduğunu göster */
let BOOTED = false;
function bootError(e) {
  console.error(e);
  const msg = e && (e.stack || e.message) ? String(e.stack || e.message).split('\n').slice(0, 4).join('\n') : String(e);
  showScreen('setup');
  $('#setup').innerHTML = `<div class="boot err"><div class="boot-logo">⚠️</div><h1>${L('Oyun açılamadı', 'The game could not start')}</h1>
    <p>${L('Bir hata oluştu. Lütfen aşağıdaki yazının ekran görüntüsünü gönder.', 'Something went wrong. Please send a screenshot of the text below.')}</p>
    <pre>${esc(msg)}</pre>
    <div class="boot-btns"><button class="primary" id="bootRetry">${L('Tekrar dene', 'Try again')}</button>
    ${hasSave() ? `<button class="ghost" id="bootNew">${L('Yeni oyun başlat (kayıt yedeklenir)', 'Start a new game (your save is backed up)')}</button>` : ''}</div></div>`;
  $('#bootRetry').onclick = () => location.reload();
  const nb = $('#bootNew');
  if (nb) nb.onclick = () => { try { const s = readSave(); if (s) localStorage.setItem(SAVE_KEY + '-yedek', s); } catch (x) { /* yok say */ } deleteSave(); G = null; BOOTED = true; renderSetup(); };
}
window.addEventListener('error', ev => { if (!BOOTED) bootError(ev.error || ev.message); });
function boot() {
  try {
    if (loadGame()) {
      if (G.over) renderGameOver();
      else { afterLoad(); startGameUI(); }
    } else renderSetup();
    BOOTED = true; window.BOOT_OK = true;
  } catch (e) { bootError(e); }
}
window.addEventListener('load', () => {
  startIconObserver();
  applyStaticText();
  $('#rotate').querySelector('button').onclick = () => { UI.forcePortrait = true; checkRotate(); };
  window.addEventListener('resize', () => {
    checkRotate();
  });
  const bm = document.querySelector('.boot-msg');
  if (bm) bm.textContent = readSave() ? L('Dünya yükleniyor…', 'Loading the world…') : L('Yükleniyor…', 'Loading…');
  // Bir betik çözümlenemediyse açılmaya çalışma, hatayı göster
  if (window.__bootErr && window.__bootErr.length) { bootError(window.__bootErr.join('\n')); return; }
  // Yükleme ekranı önce çizilsin, sonra ağır iş (dünya haritası) başlasın
  setTimeout(boot, 50);
  requestAnimationFrame(loop);
  // Uygulama olarak kuruluysa: her açılışta yeni sürümü kontrol et, yeni sürüm gelince bir kez sessizce yenile
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    const hadCtrl = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => { reg.update().catch(() => {}); }).catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadCtrl || reloaded) return;
      if (!BOOTED) return; // açılış sürerken yenileme döngüsüne girme
      reloaded = true; saveGame && G && saveGame(); location.reload();
    });
  }
});
