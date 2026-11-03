'use strict';
/* =========================================================
   Crown & Dagger — Zevkler, hobiler, eşyalar, etkinlikler,
   dostluk/rekabet bağları ve anılar.
   Her karakterin sevdiği (+1), sevmediği (-1) ve nötr bulduğu
   (kayıtta yok) hobileri, eşyaları ve etkinlikleri vardır.
   ========================================================= */

/* Yeni simgeler: mevcut game-icons çizimlerine eşle (ui.js bu tabloyu yüklenirken okur) */
Object.assign(EMOJI_ICON, {
  '🏦': 'crown-coin', '⚓': 'trident', '🕌': 'candle-light', '⛩️': 'candle-light', '🧱': 'stone-tower', '🏭': 'anvil-impact',
  '🐄': 'wheat', '🏪': 'wooden-crate', '🐴': 'horse-head', '🏫': 'book-cover', '🏥': 'heart-plus', '🪨': 'stone-tower',
  '🦅': 'spyglass', '♟️': 'rolling-dices', '🎵': 'rose', '🎭': 'two-shadows', '🧭': 'treasure-map', '🌿': 'wheat',
  '📿': 'candle-light', '🧪': 'virus', '🤝': 'hand', '🫡': 'medal', '🤐': 'secret-book', '😏': 'snake', '🙏': 'dove',
  '💐': 'rose', '🗨️': 'conversation', '🏛️': 'castle', '⚖️': 'scroll-quill', '🛡': 'shield', '👁️': 'spyglass',
});

/* ---------- Hobiler ---------- */
const HOBBIES = biEach({
  avcilik: { ad: BL('Avcılık', 'Hunting'), i: '🏹', d: BL('ormanda geyik peşinde koşmak', 'chasing stags through the forest') },
  sahin: { ad: BL('Şahin avı', 'Falconry'), i: '🦅', d: BL('bileğinden şahin uçurmak', 'flying a falcon from the wrist') },
  satranc: { ad: BL('Satranç', 'Chess'), i: '♟️', d: BL('satranç tahtası başında saatler geçirmek', 'spending hours over the chessboard') },
  siir: { ad: BL('Şiir', 'Poetry'), i: '📜', d: BL('dizeler yazıp okumak', 'writing and reciting verse') },
  muzik: { ad: BL('Müzik', 'Music'), i: '🎵', d: BL('ud ve lavta dinlemek', 'listening to lute and oud') },
  ilahiyat: { ad: BL('İlahiyat', 'Theology'), i: '📿', d: BL('kutsal metinleri tartışmak', 'debating holy scripture') },
  tarih: { ad: BL('Tarih', 'History'), i: '📚', d: BL('eski kralların hikâyelerini okumak', 'reading the tales of ancient kings') },
  yildiz: { ad: BL('Yıldız bilimi', 'Astronomy'), i: '🔭', d: BL('gece göğünü incelemek', 'studying the night sky') },
  kilic: { ad: BL('Kılıç ustalığı', 'Swordsmanship'), i: '🤺', d: BL('kılıç talimi yapmak', 'sword practice') },
  binicilik: { ad: BL('Binicilik', 'Horsemanship'), i: '🐎', d: BL('at sırtında rüzgârı hissetmek', 'feeling the wind on horseback') },
  kumar: { ad: BL('Kumar', 'Gambling'), i: '🎲', d: BL('zar atıp bahse girmek', 'throwing dice and wagering') },
  dans: { ad: BL('Dans', 'Dancing'), i: '🎭', d: BL('ziyafetlerde dans etmek', 'dancing at feasts') },
  bahce: { ad: BL('Bahçecilik', 'Gardening'), i: '🌿', d: BL('gül bahçeleriyle uğraşmak', 'tending rose gardens') },
  mimari: { ad: BL('Mimari', 'Architecture'), i: '🏛️', d: BL('kubbeler ve kemerler tasarlamak', 'designing domes and arches') },
  ticaret: { ad: BL('Ticaret', 'Commerce'), i: '💼', d: BL('pazarlık edip kâr peşinde koşmak', 'haggling and chasing profit') },
  strateji: { ad: BL('Savaş sanatı', 'Strategy'), i: '🗺️', d: BL('eski savaşları haritada canlandırmak', 'replaying old battles on maps') },
  hekimlik: { ad: BL('Hekimlik', 'Medicine'), i: '🧪', d: BL('şifalı otları ve bedeni incelemek', 'studying herbs and the body') },
  sarapHobi: { ad: BL('Şarap', 'Wine'), i: '🍷', d: BL('iyi bir şarabın tadını çıkarmak', 'savouring a fine wine') },
});
/* ---------- Hediye eşyaları (pazardan alınır) ---------- */
const ITEMS = biEach({
  kolye: { ad: BL('Mücevherli kolye', 'Jewelled necklace'), i: '💎', cost: 40 },
  kitap: { ad: BL('Tezhipli kitap', 'Illuminated book'), i: '📚', cost: 28 },
  kilicEsya: { ad: BL('Şam çeliği kılıç', 'Damascus blade'), i: '🗡️', cost: 45 },
  atEsya: { ad: BL('Safkan at', 'Thoroughbred horse'), i: '🐎', cost: 60 },
  sarapFici: { ad: BL('Bir fıçı eski şarap', 'Cask of vintage wine'), i: '🍷', cost: 15 },
  parfum: { ad: BL('Gül yağı', 'Attar of roses'), i: '💐', cost: 18 },
  kurk: { ad: BL('Samur kürk', 'Sable furs'), i: '🧥', cost: 35 },
  baharat: { ad: BL('Baharat sandığı', 'Chest of spices'), i: '📦', cost: 24 },
  ipek: { ad: BL('İpek kumaş', 'Bolt of silk'), i: '🎁', cost: 30 },
  emanet: { ad: BL('Kutsal emanet', 'Holy relic'), i: '🕯️', cost: 50 },
  sahinEsya: { ad: BL('Eğitimli şahin', 'Trained falcon'), i: '🦅', cost: 40 },
  harita: { ad: BL('Dünya haritası', 'Map of the world'), i: '🧭', cost: 25 },
  satrancTakim: { ad: BL('Fildişi satranç takımı', 'Ivory chess set'), i: '♟️', cost: 30 },
  ud: { ad: BL('Ud / lavta', 'Oud / lute'), i: '🎵', cost: 20 },
  zirh: { ad: BL('Süslü zırh', 'Ornate armour'), i: '🛡️', cost: 55 },
});
/* ---------- Etkinlikler (sohbette davet edilir) ---------- */
const ACTIVITIES = biEach({
  avPartisi: { ad: BL('Av partisi', 'Hunting party'), i: '🏹', cost: 15, h: 'avcilik' },
  ziyafetE: { ad: BL('Özel ziyafet', 'Private feast'), i: '🍗', cost: 25, h: 'sarapHobi' },
  satrancGecesi: { ad: BL('Satranç gecesi', 'Chess evening'), i: '♟️', cost: 5, h: 'satranc' },
  siirMeclisi: { ad: BL('Şiir meclisi', 'Poetry gathering'), i: '📜', cost: 10, h: 'siir' },
  atYarisi: { ad: BL('At yarışı', 'Horse race'), i: '🐎', cost: 15, h: 'binicilik' },
  bahceGezisi: { ad: BL('Bahçe gezintisi', 'Garden stroll'), i: '🌿', cost: 0, h: 'bahce' },
  zarGecesi: { ad: BL('Zar gecesi', 'Night of dice'), i: '🎲', cost: 10, h: 'kumar' },
  duaGecesi: { ad: BL('Dua ve ibadet', 'Prayer vigil'), i: '🙏', cost: 0, h: 'ilahiyat' },
  musikiGecesi: { ad: BL('Musiki gecesi', 'Night of music'), i: '🎵', cost: 12, h: 'muzik' },
  kilicTalimi: { ad: BL('Kılıç talimi', 'Sparring'), i: '🤺', cost: 0, h: 'kilic' },
});
const PREF_CATS = { h: HOBBIES, i: ITEMS, a: ACTIVITIES };
const prefName = (cat, k) => (PREF_CATS[cat][k] ? PREF_CATS[cat][k].ad : k);
const prefIcon = (cat, k) => (PREF_CATS[cat][k] ? PREF_CATS[cat][k].i : '');

/* Kişilik özelliklerinin zevklere etkisi: [kategori, anahtar, +1/-1] */
const TRAIT_PREFS = {
  dindar: [['h', 'ilahiyat', 1], ['i', 'emanet', 1], ['a', 'duaGecesi', 1], ['h', 'kumar', -1], ['a', 'zarGecesi', -1], ['h', 'dans', -1]],
  cesur: [['h', 'avcilik', 1], ['h', 'kilic', 1], ['a', 'kilicTalimi', 1], ['a', 'avPartisi', 1], ['i', 'kilicEsya', 1]],
  korkak: [['a', 'kilicTalimi', -1], ['a', 'avPartisi', -1], ['h', 'kilic', -1], ['h', 'tarih', 1]],
  sehvetli: [['h', 'dans', 1], ['i', 'parfum', 1], ['h', 'sarapHobi', 1], ['a', 'ziyafetE', 1], ['a', 'duaGecesi', -1]],
  iffetli: [['h', 'dans', -1], ['i', 'parfum', -1], ['a', 'ziyafetE', -1], ['h', 'bahce', 1]],
  acgozlu: [['i', 'kolye', 1], ['h', 'ticaret', 1], ['h', 'kumar', 1], ['i', 'baharat', 1]],
  comert: [['a', 'ziyafetE', 1], ['h', 'muzik', 1]],
  kibirli: [['i', 'kolye', 1], ['i', 'kurk', 1], ['i', 'ipek', 1], ['i', 'zirh', 1], ['a', 'bahceGezisi', -1]],
  alcakgonullu: [['i', 'kolye', -1], ['i', 'kurk', -1], ['a', 'bahceGezisi', 1], ['h', 'bahce', 1]],
  kurnaz: [['h', 'satranc', 1], ['h', 'strateji', 1], ['a', 'satrancGecesi', 1]],
  durust: [['h', 'kumar', -1], ['a', 'zarGecesi', -1], ['h', 'tarih', 1]],
  zalim: [['h', 'avcilik', 1], ['a', 'avPartisi', 1], ['h', 'siir', -1], ['h', 'hekimlik', -1]],
  merhametli: [['h', 'hekimlik', 1], ['a', 'avPartisi', -1], ['h', 'bahce', 1]],
  hirsli: [['h', 'strateji', 1], ['i', 'harita', 1], ['h', 'tarih', 1]],
  kanaatkar: [['h', 'bahce', 1], ['a', 'bahceGezisi', 1], ['h', 'strateji', -1]],
  dahi: [['h', 'satranc', 1], ['h', 'yildiz', 1], ['i', 'kitap', 1], ['h', 'mimari', 1], ['h', 'kumar', -1]],
  aptal: [['i', 'kitap', -1], ['h', 'satranc', -1], ['h', 'yildiz', -1], ['h', 'kumar', 1]],
  guclu: [['h', 'kilic', 1], ['h', 'binicilik', 1], ['i', 'zirh', 1]],
  zayif: [['h', 'kilic', -1], ['h', 'muzik', 1]],
  ayyas: [['h', 'sarapHobi', 1], ['i', 'sarapFici', 1], ['a', 'ziyafetE', 1]],
  paranoyak: [['a', 'ziyafetE', -1], ['h', 'strateji', 1]],
};
/* Kültürün zevklere etkisi */
const CULT_PREFS = {
  turk: [['h', 'binicilik', 1], ['h', 'sahin', 1], ['i', 'atEsya', 1], ['i', 'sahinEsya', 1], ['h', 'sarapHobi', -1], ['i', 'sarapFici', -1]],
  arap: [['h', 'siir', 1], ['h', 'yildiz', 1], ['i', 'baharat', 1], ['h', 'sarapHobi', -1], ['i', 'sarapFici', -1], ['i', 'parfum', 1]],
  latin: [['a', 'atYarisi', 1], ['h', 'avcilik', 1]],
  rum: [['h', 'ilahiyat', 1], ['i', 'ipek', 1], ['h', 'mimari', 1]],
  slav: [['i', 'kurk', 1], ['h', 'avcilik', 1]],
  nordic: [['i', 'kurk', 1], ['h', 'sarapHobi', 1], ['i', 'zirh', 1]],
};
function genPrefs(c) {
  const pr = { h: {}, i: {}, a: {} };
  const set = (cat, k, v, force) => { if (!PREF_CATS[cat][k]) return; if (force || pr[cat][k] == null) pr[cat][k] = v; };
  for (const t of c.traits || []) for (const [cat, k, v] of TRAIT_PREFS[t] || []) if (chance(0.75)) set(cat, k, v, true);
  for (const [cat, k, v] of CULT_PREFS[c.cul] || []) if (chance(0.45)) set(cat, k, v);
  // Rastgele: her kategoride 1–2 sevilen, 0–2 sevilmeyen
  for (const cat of ['h', 'i', 'a']) {
    const keys = shuffle(Object.keys(PREF_CATS[cat]));
    let likes = Object.values(pr[cat]).filter(v => v > 0).length, dis = Object.values(pr[cat]).filter(v => v < 0).length;
    const wantL = cat === 'h' ? rnd(2, 3) : rnd(1, 2), wantD = rnd(0, cat === 'h' ? 2 : 1);
    for (const k of keys) {
      if (pr[cat][k] != null) continue;
      if (likes < wantL) { pr[cat][k] = 1; likes++; } else if (dis < wantD) { pr[cat][k] = -1; dis++; } else break;
    }
  }
  return pr;
}
const prefOf = (c, cat, k) => (c && c.pr && c.pr[cat] ? c.pr[cat][k] || 0 : 0);
const likedList = (c, cat) => (c && c.pr ? Object.keys(c.pr[cat]).filter(k => c.pr[cat][k] > 0) : []);
const dislikedList = (c, cat) => (c && c.pr ? Object.keys(c.pr[cat]).filter(k => c.pr[cat][k] < 0) : []);
/* İki kişinin ortak sevdiği hobiler */
function sharedHobbies(a, b) { return likedList(a, 'h').filter(k => prefOf(b, 'h', k) > 0); }
function clashHobbies(a, b) { return likedList(b, 'h').filter(k => prefOf(a, 'h', k) < 0); }

/* ---------- Oyuncunun bildikleri (kimin neyi sevdiği) ---------- */
function knowPref(t, cat, k) {
  const p = P();
  if (!p || !t) return;
  p.kn = p.kn || {};
  const a = p.kn[t.id] || (p.kn[t.id] = []);
  const key = cat + ':' + k;
  if (!a.includes(key)) a.push(key);
}
function knowsPref(t, cat, k) { const p = P(); return !!(p && p.kn && p.kn[t.id] && p.kn[t.id].includes(cat + ':' + k)); }
function knownPrefs(t) {
  const p = P(), out = [];
  if (!p || !p.kn || !p.kn[t.id]) return out;
  for (const key of p.kn[t.id]) { const [cat, k] = key.split(':'); if (PREF_CATS[cat] && PREF_CATS[cat][k]) out.push([cat, k, prefOf(t, cat, k)]); }
  return out;
}
/* Henüz bilinmeyen rastgele bir zevk (sohbette öğrenilir) */
function unknownPref(t, onlyStrong) {
  const opts = [];
  for (const cat of ['h', 'i', 'a']) for (const k of Object.keys(t.pr[cat])) if (!knowsPref(t, cat, k) && (!onlyStrong || t.pr[cat][k])) opts.push([cat, k, t.pr[cat][k]]);
  return opts.length ? pick(opts) : null;
}

/* ---------- Bağlar (dost / rakip) ---------- */
const BOND_NAMES = { dost: BL('Dost', 'Friend'), rakip: BL('Rakip', 'Rival'), sirdas: BL('Sırdaş', 'Confidant') };
const bondName = b => pickB(BOND_NAMES[b] || BL(b, b));
function bond(a, b) { return a && b && a.bonds ? a.bonds[b.id] || null : null; }
function setBond(a, b, type) {
  if (!a || !b || a.id === b.id) return;
  a.bonds = a.bonds || {}; b.bonds = b.bonds || {};
  if (type) { a.bonds[b.id] = type; b.bonds[a.id] = type; } else { delete a.bonds[b.id]; delete b.bonds[a.id]; }
}
function friendsOf(c) { return Object.keys(c.bonds || {}).filter(id => c.bonds[id] === 'dost' || c.bonds[id] === 'sirdas').map(id => ch(+id)).filter(x => x && x.alive); }
function rivalsOf(c) { return Object.keys(c.bonds || {}).filter(id => c.bonds[id] === 'rakip').map(id => ch(+id)).filter(x => x && x.alive); }

/* ---------- Anılar: kim, kime, ne yaptı (zamanla söner) ---------- */
const MEM_LABELS = {
  ovgu: BL('Onu övdüğünü duydu', 'Heard you praised them'),
  kotuleme: BL('Arkasından konuştuğunu duydu', 'Heard you badmouthed them'),
  sirIfsa: BL('Sırrını yaydığını duydu', 'Heard you spread their secret'),
  iltifat: BL('İltifatların', 'Your compliments'),
  hakaret: BL('Ona hakaret ettin', 'You insulted them'),
  hediye: BL('Sevdiği bir hediye', 'A gift they loved'),
  kotuHediye: BL('Sevmediği bir hediye', 'A gift they disliked'),
  etkinlik: BL('Birlikte vakit geçirdiniz', 'Time spent together'),
  soz: BL('Verdiğin söz', 'Your promise'),
  sozBozma: BL('Sözünü tuttun mu?', 'Broken promise'),
  ihanet: BL('Ona ihanet ettin', 'You betrayed them'),
  savunma: BL('Onu savundun', 'You defended them'),
  ozur: BL('Özür diledin', 'You apologised'),
  yalan: BL('Yalanını yakaladı', 'Caught you lying'),
  yardim: BL('Ona yardım ettin', 'You helped them'),
  ortakSir: BL('Bir sır paylaştınız', 'A shared secret'),
  kiskirtma: BL('Onu kışkırttın', 'You stirred them up'),
};
function remember(c, who, type, v) {
  if (!c || !who || c.id === who.id) return;
  c.mem = c.mem || [];
  const old = c.mem.find(m => m.w === who.id && m.t === type);
  if (old) { old.v = clamp(old.v + v * 0.6, -80, 80); old.m = monthIndex(); }
  else c.mem.push({ w: who.id, t: type, v, m: monthIndex() });
  if (c.mem.length > 10) { c.mem.sort((a, b) => Math.abs(b.v) - Math.abs(a.v)); c.mem.length = 10; }
}
function memParts(a, b) {
  const out = [];
  for (const m of a.mem || []) if (m.w === b.id && Math.round(m.v)) out.push([pickB(MEM_LABELS[m.t] || BL(m.t, m.t)), Math.round(m.v)]);
  return out;
}
function memTick() {
  for (const c of living()) {
    if (!c.mem || !c.mem.length) continue;
    for (const m of c.mem) m.v *= 0.95;
    c.mem = c.mem.filter(m => Math.abs(m.v) >= 1.5 && G.chars[m.w] && G.chars[m.w].alive);
  }
}
/* Görüş hesabına eklenen zevk/bağ/anı parçaları */
function prefOpinionParts(a, b) {
  const parts = [];
  const bd = bond(a, b);
  if (bd === 'dost') parts.push([bondName('dost'), 30]);
  else if (bd === 'sirdas') parts.push([bondName('sirdas'), 40]);
  else if (bd === 'rakip') parts.push([bondName('rakip'), -35]);
  const sh = sharedHobbies(a, b).length;
  if (sh) parts.push([L('Ortak ilgi alanları', 'Shared interests'), Math.min(15, sh * 5)]);
  const cl = clashHobbies(a, b).length;
  if (cl) parts.push([L('Zevkleri çatışıyor', 'Clashing tastes'), -Math.min(10, cl * 4)]);
  for (const x of memParts(a, b)) parts.push(x);
  return parts;
}
/* Bağların kendiliğinden oluşması/bozulması (aylık) */
function bondTick() {
  for (const c of living()) {
    if (!isAdult(c) || !chance(0.04)) continue;
    for (const id in c.op) {
      const o = ch(+id);
      if (!o || !o.alive || !isAdult(o)) continue;
      const v = c.op[id], bd = bond(c, o);
      if (!bd && v > 70 && (o.op[c.id] || 0) > 40 && chance(0.3)) { setBond(c, o, 'dost'); if (o.id === G.playerId) log(L(`🤝 ${nm(c)} artık senin dostun.`, `🤝 ${nm(c)} is now your friend.`), 'good'); }
      else if (!bd && v < -70 && chance(0.3)) { setBond(c, o, 'rakip'); if (o.id === G.playerId) log(L(`😠 ${nm(c)} seni rakibi olarak görüyor.`, `😠 ${nm(c)} now considers you a rival.`), 'bad'); }
      else if (bd === 'dost' && v < -20) setBond(c, o, null);
      else if (bd === 'rakip' && v > 30) setBond(c, o, null);
    }
  }
}
/* Dünya kurulurken: dostluklar ve rekabetler */
function seedBonds() {
  const adults = living().filter(isAdult);
  for (const c of adults) {
    if (!chance(0.45)) continue;
    const near = nearby(c).filter(x => !closeKin(c, x) && !bond(c, x));
    if (!near.length) continue;
    const o = pick(near);
    if (chance(0.6)) { setBond(c, o, 'dost'); addOp(c, o, 25); addOp(o, c, 25); }
    else { setBond(c, o, 'rakip'); addOp(c, o, -30); addOp(o, c, -30); }
  }
}
/* Envanter */
function addItem(c, k) { c.inv = c.inv || []; c.inv.push(k); }
function takeItem(c, k) { const i = (c.inv || []).indexOf(k); if (i >= 0) c.inv.splice(i, 1); return i >= 0; }
