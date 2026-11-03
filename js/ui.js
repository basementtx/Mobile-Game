'use strict';
/* =========================================================
   Crown & Dagger — Arayüz (yatay ekran, tur tabanlı)
   ========================================================= */

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const UI = { screen: 'setup', drawer: null, filter: 'saray', sheet: null, modal: null, breakdown: false, speed: 1, forcePortrait: false, sett: null, selProv: null, provOpen: false, hold: null, realmTab: 'genel' };
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
      const clean = v => v.replace(/[<>&"']/g, '').trim();
      const C = CULTURES[REALMS[S.realm].kul];
      newWorld({ name: clean(S.name) || pick(S.female ? C.f : C.m), dyn: clean(S.dyn) || REALMS[S.realm].han, female: S.female, realm: S.realm, traits: S.traits, base: S.base });
      SETUP = null;
      startGameUI();
    }, 30);
  };
  if ($('#contBtn')) $('#contBtn').onclick = () => { if (loadGame()) { afterLoad(); startGameUI(); } };
}

/* ---------- Oyun ekranı ---------- */
let _mapReady = false;
function buildTools() {
  $('#tools').innerHTML = [['ben', '👤', L('Karakter', 'Character')], ['aile', '🌳', L('Aile', 'Family')], ['krallik', '👑', L('Krallık', 'Realm')], ['topraklar', '🏰', L('Topraklar', 'Domain')], ['ordu', '⚔️', L('Ordu', 'Army')], ['kisiler', '👥', L('Kişiler', 'People')], ['eylem', '🗡️', L('Entrika', 'Intrigue')], ['dunya', '🌍', L('Dünya', 'World')], ['gunluk', '📜', L('Günlük', 'Chronicle')]]
    .map(([k, i, l]) => `<button data-drawer="${k}"><span>${i}</span>${l}</button>`).join('');
  $('#tools').querySelectorAll('[data-drawer]').forEach(b => b.onclick = () => openDrawer(b.dataset.drawer));
}
function centerOn(x, y, z) { CAM.follow = false; CAM.x = x; CAM.y = y; if (z) CAM.z = Math.max(CAM.z, z); }
function startGameUI() {
  showScreen('game');
  if (!_mapReady) {
    setupMap($('#mapcv'));
    _mapReady = true;
    buildTools();
    $('#drawer .dx').onclick = closeDrawer;
    $('#endturn').onclick = endTurn;
  }
  closeProv();
  const seat = seatOf(P());
  const pp = playerParty();
  if (seat) centerOn(seat.x, seat.y); else if (pp) centerOn(pp.x, pp.y);
  CAM.z = 26;
  resizeMap();
  updateHUD();
  processQueue();
}
function armyStatus(pp) {
  if (!pp) return '';
  if (!armyActive(pp)) return L('Dağıtıldı', 'Disbanded');
  if (pp.mode === 'siege') { const s = G.titles[pp.sid]; return s ? L(`${s.name} kuşatılıyor`, `Besieging ${s.name}`) : ''; }
  if ((pp.path && pp.path.length) || pp.leg) { const t = turnTurnsLeft(pp); const g = pp.goal ? G.titles[pp.goal] : null; return g ? L(`${g.name} yolunda · ${t} tur`, `Marching on ${g.name} · ${t} turn${t > 1 ? 's' : ''}`) : L(`Yürüyüşte · ${t} tur`, `On the march · ${t} turn${t > 1 ? 's' : ''}`); }
  if (pp.chase != null) return L('Düşmanı izliyor', 'Pursuing');
  return armyAtHome(pp) ? L('Hazır bekliyor', 'Standing ready') : L('Konakladı', 'Encamped');
}
function updateHUD() {
  if (!G || UI.screen !== 'game') return;
  const p = P(), pp = playerParty();
  const n = pp ? troopCount(pp) : 0;
  const r = ownRealm(p) || realmOf(p);
  const inc = income(p);
  if (setHTML($('#hudL'), `
    <div class="who">
      <button class="who-pt" data-me>${avatar(p, 58)}</button>
      <button class="who-cr" data-realm title="${r ? esc(r.name) : ''}">${flagHtml(r, 24)}</button>
      <button class="who-tx" data-me><b>${esc(nm(p))}</b><small>${esc(r ? r.name : titleOf(p))}</small></button>
    </div>
    <div class="res">
      <span title="${L('Hazine (aylık)', 'Treasury (monthly)')}">💰 <b>${p.gold}</b><small class="${inc >= 0 ? 'good' : 'bad'}">${inc >= 0 ? '+' : ''}${inc}</small></span>
      <span title="${L('Şan', 'Prestige')}">⭐ <b>${Math.round(p.prestige)}</b></span>
      <span title="${L('Kraliyet ordusu', 'Royal army')}">🪖 <b>${n}</b><small>/${partyCap(p)}</small></span>
      ${p.dread >= 5 ? `<span title="${L('Korku', 'Dread')}">💀 <b>${Math.round(p.dread)}</b></span>` : ''}
      <span class="${p.health < 40 ? 'warn' : ''}" title="${L('Sağlık', 'Health')}">❤️ <b>${Math.round(p.health)}</b></span>
      <span class="${p.stress > 70 ? 'warn' : ''}" title="${L('Stres', 'Stress')}">😰 <b>${Math.round(p.stress)}</b></span>
      <span class="apd" title="${L('Bu ayki entrika hakkı', 'Intrigue actions this month')}">${'<i class="on"></i>'.repeat(G.ap)}${'<i></i>'.repeat(Math.max(0, AP_MAX - G.ap))}</span>
    </div>`)) {
    $('#hudL').querySelectorAll('[data-me]').forEach(b => b.onclick = () => openSheet(P().id));
    $('#hudL [data-realm]').onclick = () => openRealm();
  }
  if (setHTML($('#hudR'), `<span class="date"><b>${(G.day % 30) + 1} ${monthName(G.month)} ${G.year}</b><small>${L('Tur', 'Turn')} ${G.turn || 1}</small></span>
    <button id="mmBtn" class="mm" title="${L('Harita modu', 'Map mode')}">🗺️<small>${mapModeName(UI.mapMode || 'siyasi')}</small></button>
    <button id="spd" title="${L('Tur hızı', 'Turn speed')}">${UI.speed === 1 ? '▶' : UI.speed === 2 ? '▶▶' : '▶▶▶'}</button>
    <button id="menuBtn" title="${L('Menü', 'Menu')}">☰</button>`)) {
    $('#mmBtn').onclick = cycleMapMode;
    $('#spd').onclick = () => { UI.speed = UI.speed === 1 ? 2 : UI.speed === 2 ? 4 : 1; updateHUD(); };
    $('#menuBtn').onclick = openMenu;
  }
  const btns = [];
  let status = '';
  const busy = G.turnLeft > 0;
  if (p.prisonerOf) {
    status = L(`⛓️ ${esc(nm(ch(p.prisonerOf)))} seni zindanda tutuyor.`, `⛓️ ${esc(nm(ch(p.prisonerOf)))} holds you in the dungeon.`);
    if (!busy) { btns.push(['kacis', L('🏃 Kaçmayı dene', '🏃 Try to escape')]); if (p.gold >= 30) btns.push(['gardiyan', L('🔑 Rüşvet (30💰)', '🔑 Bribe (30💰)')]); }
  }
  if (pp) {
    btns.push(['army', `<i class="sw" style="background:#ffcf4a"></i>${esc(armyName(pp))} · <b>${n}</b><small>${esc(armyStatus(pp))}</small>`]);
    if (!busy && pp.mode === 'siege' && G.titles[pp.sid] && G.titles[pp.sid].siege && G.titles[pp.sid].siege.days >= 3) btns.push(['assault', L('🔥 Hücum', '🔥 Storm')]);
    if (!busy && ((pp.path && pp.path.length) || pp.chase != null)) btns.push(['stop', L('✋ Durdur', '✋ Halt')]);
  }
  if (setHTML($('#ctxbar'), btns.map(([k, l]) => `<button data-c="${k}" class="${k === 'army' ? 'armychip' : ''}">${l}</button>`).join('')))
    $('#ctxbar').querySelectorAll('[data-c]').forEach(b => b.onclick = () => ctxAction(b.dataset.c));
  // Turu bitir düğmesi
  const sub = busy ? L('Tur işliyor…', 'Resolving…') : L(`${TURN_DAYS} gün geçer`, `${TURN_DAYS} days pass`);
  setHTML($('#endturn'), `<b>${busy ? '⏳' : L('TURU BİTİR', 'END TURN')}</b><small>${sub}</small>`);
  $('#endturn').classList.toggle('busy', busy);
  const wars = enemiesOf(realmOf(p));
  if (!status && busy) status = L('⏳ Zaman akıyor…', '⏳ Time passes…');
  if (!status && wars.length) status = `${L('Savaşta', 'At war')}: ${wars.map(r => flagHtml(r, 12) + esc(realmShort(r))).join(' ')}`;
  setHTML($('#status'), status);
  $('#status').classList.toggle('hidden', !status);
  renderProv();
}
function ctxAction(k) {
  if (G.turnLeft > 0) return;
  const pp = playerParty();
  if (k === 'army' && pp) { centerOn(pp.x, pp.y, 22); const pv = partyProv(pp); if (pv) selectProvince(pv.id); }
  else if (k === 'stop') cancelOrders();
  else if (k === 'assault' && pp) { const s = G.titles[pp.sid]; if (s) openAssault(s); }
  else if (k === 'kacis' || k === 'gardiyan') doAction(k, null);
  updateHUD();
}
function paused() { return !!UI.modal || !!UI.drawer || (G && G.queue.length > 0); }
function endTurn() {
  if (!G || G.over || G.turnLeft > 0 || paused()) return;
  beginTurn();
  updateHUD();
}

/* ---------- Ana döngü ---------- */
let _lastT = 0, _hudT = 0;
function loop(t) {
  const dt = Math.min(0.1, (t - _lastT) / 1000 || 0);
  _lastT = t;
  try {
    if (UI.screen === 'game' && G && !G.over) { tickMap(dt); if (UI.screen === 'game') drawMap(t); _hudT += dt; if (_hudT > 0.25) { _hudT = 0; updateHUD(); } }
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
  if (pp && pp.mode === 'siege') {
    const s = G.titles[pp.sid];
    if (!s || !s.siege || s.siege.by !== pp.id) { pp.mode = 'idle'; return; }
    s.siege.days++;
    if (s.siege.days >= 3 && !s.siege.asked) { s.siege.asked = true; openAssault(s); }
  }
}

/* ---------- Karşılaşma ve savaş ---------- */
function openEncounter(foe) {
  const pp = playerParty();
  if (!pp || !G.parties.includes(foe)) return;
  pp.chase = null; pp.tx = pp.ty = null; pp.leg = null; pp.path = []; pp.goal = null;
  const c = ch(foe.owner), lead = armyLeader(pp);
  const name = foe.kind === 'bandit' ? banditName(foe) : L(`${nm(c)} ordusu`, `Army of ${nm(c)}`);
  const mp = partyPower(pp), tp = partyPower(foe);
  const runC = clamp(Math.round(45 + (partySpeed(pp) - partySpeed(foe)) * 150 + (troopCount(pp) < 10 ? 15 : 0)), 10, 90);
  const ratio = mp / Math.max(1, tp);
  const odds = ratio > 1.6 ? `<b class="good">${L('Ezici üstünlük sende', 'Overwhelming advantage')}</b>` : ratio > 1.1 ? `<b class="good">${L('Avantaj sende', 'Advantage yours')}</b>` : ratio > 0.8 ? `<b class="mid">${L('Denk güçler', 'Even odds')}</b>` : ratio > 0.5 ? `<b class="bad">${L('Düşman daha güçlü', 'The enemy is stronger')}</b>` : `<b class="bad">${L('Ölümcül tehlike', 'Deadly danger')}</b>`;
  showModal(`<div class="event"><h2>⚔️ ${esc(name)}</h2>
    <div class="etext">${foe.kind === 'bandit' ? L(`Eşkıyalar ${esc(armyName(pp))}'nun yolunu kesti!`, `Bandits block the path of the ${esc(armyName(pp))}!`) : L(`${esc(nm(c))} sancakları ordunun karşısında dalgalanıyor.`, `The banners of ${esc(nm(c))} wave before your army.`)} ${lead ? L(`Mareşalin <b>${esc(nm(lead))}</b> emirlerini bekliyor.`, `Your marshal <b>${esc(nm(lead))}</b> awaits your orders.`) : L('Ordunun başında bir mareşal yok.', 'Your army has no marshal at its head.')}
    <div class="vs"><div><b>${esc(armyName(pp))}</b>${troopCount(pp)} ${L('asker', 'men')}<br>${L('güç', 'strength')} ${mp}</div><div class="vsx">⚔</div><div><b>${foe.kind === 'bandit' ? L('Eşkıyalar', 'Bandits') : L('Düşman', 'Enemy')}</b>${troopCount(foe)} ${L('asker', 'men')}<br>${L('güç', 'strength')} ${tp}</div></div>${odds}</div>
    <div class="eopts">
      <button class="opt primary" data-e="fight">⚔️ ${L('Savaş!', 'Fight!')}</button>
      <button class="opt" data-e="auto">🎲 ${L('Mareşale bırak (otomatik)', 'Leave it to the marshal (auto)')}</button>
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
      sendArmyHome(pp);
      resultModal(`<p>${L('Ordun düşmandan sıyrıldı ve başkente çekiliyor.', 'Your army slipped away and falls back toward the capital.')}</p>`);
    } else {
      const lost = applyLosses(pp, 0.15);
      pp.ignore[foe.id] = G.day + 1; foe.stun = 1;
      sendArmyHome(pp);
      resultModal(`<p>${L('Çekilirken artçılar yakalandı. Kayıplar', 'The rearguard was caught during the retreat. Losses')}: ${lossText(lost)}</p>`);
    }
  };
}
function resultModal(html) {
  showModal(`<div class="event ck"><div class="ev-main solo"><div class="etext">${html}</div><div class="eopts"><button class="opt primary" data-next>${L('Devam', 'Continue')}</button></div></div></div>`, 'event');
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
      const lead = armyLeader(pp);
      if (res.heroDown && lead) { lead.health -= 35; addTrait(lead, 'yarali'); }
      if (res.retreated) { foe.stun = 1; sendArmyHome(pp); }
      else if (res.won) { if (G.parties.includes(foe)) notes = battleAftermath(pp, foe, { loserPower: lp, heroDown: res.leaderDown }); }
      else notes = battleAftermath(foe, pp, { heroDown: res.heroDown });
      if (lead && lead.alive && lead.health <= 0) die(lead, L('Savaşta aldığı yaralar', 'Wounds taken in battle'));
      log(`⚔️ ${res.won ? L('Zafer', 'Victory') : res.retreated ? L('Geri çekilme', 'Retreat') : L('Yenilgi', 'Defeat')}. ${notes.join(' ')}`, res.won ? 'good' : 'bad');
      return notes;
    },
  });
}
function openAssault(s) {
  const pp = playerParty();
  showModal(`<div class="event"><h2>🔥 ${L(`${esc(s.name)} kuşatması`, `Siege of ${esc(s.name)}`)}</h2>
    <div class="etext">${L(`Merdivenler hazır, koçbaşı kapıya dayandı. Surlarda ${s.garrison} savunucu bekliyor.`, `The ladders are ready and the ram is at the gate. ${s.garrison} defenders wait on the walls.`)}
    <div class="vs"><div><b>${esc(armyName(pp))}</b>${troopCount(pp)} ${L('asker', 'men')}<br>${L('güç', 'strength')} ${partyPower(pp)}</div><div class="vsx">⚔</div><div><b>${L('Garnizon', 'Garrison')}</b>${s.garrison} ${L('asker', 'men')}<br>${L('güç', 'strength')} ${garrisonPower(s)}</div></div></div>
    <div class="eopts">
      <button class="opt primary" data-e="fight">⚔️ ${L('Hücum!', 'Storm the walls!')}</button>
      <button class="opt" data-e="auto">🎲 ${L('Mareşale bırak', 'Leave it to the marshal')}</button>
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
      const lead = armyLeader(pp);
      if (res.heroDown && lead) { lead.health -= 35; addTrait(lead, 'yarali'); }
      pp.mode = 'idle';
      const notes = [];
      if (res.won) captureSettlement(s, p);
      else {
        const killed = Object.values(res.lossB).reduce((a, b) => a + b, 0);
        s.garrison = Math.max(5, s.garrison - killed);
        s.siege = null;
        notes.push(L(`Garnizon ${killed} kayıp verdi.`, `The garrison lost ${killed} men.`));
      }
      if (lead && lead.alive && lead.health <= 0) die(lead, L('Kuşatmada aldığı yaralar', 'Wounds taken in the siege'));
      return notes;
    },
  });
}

/* ---------- Çekmece paneller ---------- */
function drawerTitle(k) { return { aile: L('🌳 Aile ve hanedan', '🌳 Family & dynasty'), ben: L('👤 Karakter', '👤 Character'), kisiler: L('👥 Kişiler', '👥 People'), ordu: L('⚔️ Ordu', '⚔️ Army'), topraklar: L('🏰 Kraliyet arazisi', '🏰 Royal Domain'), dunya: L('🌍 Dünya', '🌍 World'), eylem: L('🗡️ Entrika ve kişisel eylemler', '🗡️ Intrigue & personal'), gunluk: L('📜 Günlük', '📜 Chronicle') }[k]; }
function openDrawer(k) {
  if (G.turnLeft > 0) return;
  if (k === 'krallik') return openRealm();
  closeProv(); UI.drawer = k; renderDrawer(); $('#drawer').classList.remove('hidden'); $('#drawer .dbody').scrollTop = 0;
}
function closeDrawer() { UI.drawer = null; const d = $('#drawer'); if (d) d.classList.add('hidden'); updateHUD(); }
function renderDrawer() {
  if (!UI.drawer) return;
  const p = P();
  const body = $('#drawer .dbody');
  const sc = body.scrollTop;
  $('#drawer .dtitle').textContent = UI.drawer === 'sett' ? `${UI.settMarket ? '🏪' : '🛡️'} ${G.titles[UI.sett].name}` : UI.drawer === 'hold' ? `🏗️ ${G.titles[UI.hold].name}` : drawerTitle(UI.drawer);
  body.innerHTML = { aile: tabAile, ben: tabBen, kisiler: tabKisiler, ordu: tabOrdu, topraklar: tabToprak, dunya: tabDunya, eylem: tabEylem, gunluk: tabGunluk, sett: settlementPanel, hold: holdPanel }[UI.drawer](p);
  body.scrollTop = sc;
  body.querySelectorAll('[data-open]').forEach(b => b.onclick = e => { e.stopPropagation(); openSheet(+b.dataset.open); });
  body.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { UI.filter = b.dataset.filter; renderDrawer(); });
  body.querySelectorAll('[data-act]').forEach(b => b.onclick = () => doAction(b.dataset.act, b.dataset.t ? +b.dataset.t : null));
  body.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { const s = G.titles[b.dataset.goto]; closeDrawer(); centerOn(s.x, s.y, 24); const pv = partyProv(s); if (pv) selectProvince(pv.id); });
  body.querySelectorAll('[data-dis]').forEach(b => b.onclick = () => { const [k, n] = b.dataset.dis.split(':'); const pp = playerParty(); pp.troops[k] = Math.max(0, pp.troops[k] - +n); if (!pp.troops[k]) delete pp.troops[k]; refreshPanels(); });
  bindTips(body);
  bindRealmUI(body);
  if (UI.drawer === 'sett') bindSettlement(body);
  if (UI.drawer === 'ordu') bindArmyTab(body);
  if (UI.drawer === 'aile') bindFamily(body);
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
  html += intimacyCard(p);
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
function tabToprak(p) {
  const own = settlementsOf(p);
  const r = ownRealm(p);
  let html = '';
  if (r) html += `<div class="card"><h3>${swatch(r.color)} ${esc(r.name)}</h3><p class="small">${realmSettlements(r).length} ${L('yerleşim', 'holdings')} · ${L('Vasallar', 'Vassals')}: ${living().filter(x => x.lordId === p.id && x.titles.length).length} · ${L('Savaşlar', 'Wars')}: ${enemiesOf(r).map(e => esc(e.name)).join(', ') || L('yok', 'none')}</p></div>`;
  if (!own.length) return html + `<p class="muted">${L('Hiç toprağın yok. Efendinden toprak iste, düşman kalelerini kuşat ya da toprak sahibi biriyle evlen.', 'You hold no land. Ask your liege for land, besiege enemy castles, or marry into a landed family.')}</p>`;
  html += `<p class="small muted">${L('Bir yerleşime dokun: binalar, vergi ve huzur.', 'Tap a holding to manage buildings, taxes and order.')}</p>`;
  html += own.map(s => holdingCard(s, p)).join('');
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
      ${!self ? sheetTastes(t) : ''}
      ${intimacyCard(t)}
    </div>
    ${acts ? `<div class="scol"><button class="talkbig" data-talk ${G.ap < 1 ? 'disabled' : ''}><span>💬</span><b>${L('Konuş', 'Talk')}</b><small>${G.ap < 1 ? L('Bu ay vaktin kalmadı', 'No time left this month') : L('Sohbet, dedikodu, hediye, rica, flört… (1⚡)', 'Conversation, gossip, gifts, requests, flirting… (1⚡)')}</small></button>
      ${isGrown(t) && isGrown(p) && !closeKin(p, t) ? `<button class="talkbig night" data-bed ${bedReq(p, t) ? 'disabled' : ''}><span>🌙</span><b>${L('Odana davet et', 'Invite to your chambers')}</b><small>${bedReq(p, t) || L(`Mahrem bir gece · kabul şansı %${bedChance(p, t)} (1⚡)`, `An intimate night · ${bedChance(p, t)}% chance they accept (1⚡)`)}</small></button>` : ''}
      <h3>${L('Ne yapacaksın?', 'What will you do?')} <small class="muted">(${G.ap} ⚡)</small></h3><div class="acts">${acts}</div></div>` : ''}
  </div>`, 'sheet');
  const m = $('#modal');
  m.querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal);
  m.querySelectorAll('[data-open]').forEach(b => b.onclick = () => openSheet(+b.dataset.open));
  m.querySelectorAll('[data-act]').forEach(b => b.onclick = () => doAction(b.dataset.act, +b.dataset.t));
  const tk = m.querySelector('[data-talk]'); if (tk) tk.onclick = () => { closeModal(); openDialogue(t.id); };
  const bedB = m.querySelector('[data-bed]'); if (bedB) bedB.onclick = () => { closeModal(); openIntimacy(t.id); };
  m.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => { const s = G.titles[b.dataset.goto]; closeModal(); closeDrawer(); centerOn(s.x, s.y, 24); const pv = partyProv(s); if (pv) selectProvince(pv.id); });
  m.querySelectorAll('[data-showparty]').forEach(b => b.onclick = () => { const x = G.parties.find(q => q.id === +b.dataset.showparty); closeModal(); closeDrawer(); if (x) { centerOn(x.x, x.y, 24); selectProvince(partyProv(x).id); } });
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
  if (UI.modal === 'event' || UI.modal === 'confirm' || BT || !G) return;
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
      <p><b>👑 Hükümdar:</b> Oyuna her zaman bir krallığın hükümdarı olarak başlarsın. Haritada gezmezsin; sarayından hükmeder, emirlerini haritadan ve krallık ekranından verirsin.</p>
      <p><b>🗺️ İller:</b> Haritada bir ile ya da şehre dokun; solda il paneli açılır. Sahibi, garnizonu, geliri, huzuru ve binaları görünür; altta <b>Seçenekler</b> listesinde orada yapabileceğin her şey yazar. Denize ya da aynı ile yeniden dokununca panel kapanır.</p>
      <p><b>🏰 Kendi toprağın:</b> bina yap, vergiyi ayarla, asker topla, garnizonu güçlendir, pazardan hediye al ya da toprağı bir saraylına bağışla.</p>
      <p><b>🏯 Vasalının toprağı:</b> onunla konuş, ödüllendir ya da unvanını geri al (suçunu bilmiyorsan zorbalık sayılır).</p>
      <p><b>🌍 Yabancı toprak:</b> elçi gönder, savaş ilan et, barış teklif et. Savaştaysan "Kuşat" de: kraliyet ordusu oraya yürür ve kendiliğinden kuşatmaya başlar.</p>
      <p><b>⚔️ Kraliyet ordusu:</b> Ordunu mareşalin yönetir (meclisten ata). Ordu sekmesinden asker toplar, terhis eder ya da başkente geri çağırırsın. Düşmanla karşılaşınca savaşır, mareşale bırakır ya da çekilirsin.</p>
      <p><b>⏳ Turlar:</b> Her tur ${TURN_DAYS} gün sürer. Hazır olunca sağ alttaki <b>TURU BİTİR</b>'e bas.</p>
      <p><b>👑 Krallık ekranı:</b> Genel bakış, meclis, yasalar, kararlar, diplomasi ve vasallar. Sol üstteki bayrağa dokunarak da açılır.</p>
      <p><b>🗡️ Entrika:</b> Birinin kartını aç: evlilik, baştan çıkarma, rüşvet, şantaj, suikast, iftira… Her ay ${AP_MAX} hakkın var.</p>
      <p><b>💬 Konuşmalar:</b> Herkesin sevdiği ve sevmediği hobileri, eşyaları ve etkinlikleri var. Başkaları hakkında söylediklerin kulaktan kulağa yayılır.</p>
      <p><b>⚔️ Taktik savaş:</b> Önce diziliş seç; her tur bir emir ver. Her taktik ikisini yener, ikisine yenilir (▲/▼). Kuşatmada koçbaşı, mancınık ve lağımla surları yık.</p>
      <p><b>🌍 Dünya:</b> Harita tüm dünyayı kapsar: Avrupa'dan Song Çin'ine, Japonya'dan Gana'ya ve Toltek Tollan'ına kadar 47 krallık.</p>
      <p><b>🌳 Aile:</b> Aile sekmesinde soy ağacın, gebelikler, sevgililer ve piç çocukların görünür. Çocuklarına evlilik ayarlayabilirsin.</p>
      <p><b>🌙 Mahrem:</b> Yetişkin (18+) biriyle — eşin, sevgilin ya da saraydaki herhangi biri — bir gece geçirmeyi teklif edebilirsin. Herkesin kendi arzusu, hüneri, yönelimi ve zevkleri vardır; sevdiği bir yaklaşım bağları güçlendirir, sevmediği ilişkiyi bozar. Çocuk istemek, şansa bırakmak ya da önlem almak senin elinde. Dedikodu, yakalanma ve hastalık riski vardır.</p>
      <p><b>☠️ Ölüm:</b> Ölünce varisinle devam edersin. Varisin yoksa hanedan biter.</p>`, `
      <p><b>👑 Ruler:</b> You always begin as the ruler of a realm. You do not wander the map: you rule from your court and give orders through the map and the realm screen.</p>
      <p><b>🗺️ Provinces:</b> Tap a province or city on the map and the province panel opens on the left. It shows the holder, garrison, income, unrest and buildings; the <b>Options</b> list below shows everything you can do there. Tap the sea or the same province again to close it.</p>
      <p><b>🏰 Your holdings:</b> build, set taxes, raise troops, reinforce the garrison, buy gifts at the market, or grant the holding to a courtier.</p>
      <p><b>🏯 A vassal's holding:</b> talk to them, reward them, or revoke the title (tyranny unless you know of a crime).</p>
      <p><b>🌍 Foreign land:</b> send envoys, declare war, offer peace. At war, choose "Besiege": the royal army marches there and lays siege on its own.</p>
      <p><b>⚔️ Royal army:</b> your marshal leads it (appoint one in the council). From the Army tab you raise and dismiss troops or recall the army to the capital. When it meets an enemy you fight, leave it to the marshal, or withdraw.</p>
      <p><b>⏳ Turns:</b> Each turn lasts ${TURN_DAYS} days. When ready, press <b>END TURN</b> at the bottom right.</p>
      <p><b>👑 Realm screen:</b> overview, council, laws, decisions, diplomacy and vassals. Tap the flag at the top left to open it too.</p>
      <p><b>🗡️ Intrigue:</b> Open someone's card: marriage, seduction, bribes, blackmail, murder, slander… You get ${AP_MAX} actions each month.</p>
      <p><b>💬 Conversations:</b> Everyone has hobbies, goods and activities they love or hate. What you say about others travels from ear to ear.</p>
      <p><b>⚔️ Tactical battle:</b> Pick a formation, then give one order per round. Each tactic beats two and loses to two (▲/▼). In sieges, break the walls with rams, trebuchets and mines.</p>
      <p><b>🌍 World:</b> The map covers the whole world: 47 realms from Europe to Song China, from Japan to Ghana and Toltec Tollan.</p>
      <p><b>🌳 Family:</b> The Family tab shows your family tree, pregnancies, lovers and bastards. You can arrange marriages for your children.</p>
      <p><b>🌙 Intimacy:</b> You can invite an adult (18+) — your spouse, a lover, or anyone at court — to spend the night. Everyone has their own desire, skill, orientation and tastes; an approach they enjoy deepens the bond, one they dislike harms it. Try for a child, leave it to fate, or take precautions. Gossip, getting caught and disease are real risks.</p>
      <p><b>☠️ Death:</b> When you die you continue as your heir. With no heir, your dynasty ends.</p>`)}</div></div>`, 'menu');
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
window.addEventListener('load', () => {
  startIconObserver();
  applyStaticText();
  $('#rotate').querySelector('button').onclick = () => { UI.forcePortrait = true; checkRotate(); };
  window.addEventListener('resize', () => {
    checkRotate();
  });
  if (loadGame()) {
    if (G.over) renderGameOver();
    else { afterLoad(); startGameUI(); }
  } else renderSetup();
  requestAnimationFrame(loop);
  // Uygulama olarak kuruluysa: her açılışta yeni sürümü kontrol et, yeni sürüm gelince bir kez sessizce yenile
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    const hadCtrl = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => { reg.update().catch(() => {}); }).catch(() => {});
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadCtrl || reloaded || UI.screen === 'game' && (G && G.turnLeft > 0)) return;
      reloaded = true; saveGame && G && saveGame(); location.reload();
    });
  }
});
