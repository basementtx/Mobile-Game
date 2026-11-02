'use strict';
/* =========================================================
   TAÇ VE HANÇER — Oyun motoru
   Dünya, karakterler, ilişkiler, sırlar, savaşlar, aylık döngü
   ========================================================= */

let G = null;
const SAVE_KEY = 'tac-ve-hancer-v2';
const AP_MAX = 3;
const LEVY = [0, 1, 15, 100, 220, 400];

/* ---------- Yardımcılar ---------- */
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const chance = p => Math.random() < p;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function weighted(opts) {
  const tot = opts.reduce((s, o) => s + Math.max(0, o[1]), 0);
  if (tot <= 0) return null;
  let r = Math.random() * tot;
  for (const o of opts) { r -= Math.max(0, o[1]); if (r <= 0) return o[0]; }
  return opts[opts.length - 1][0];
}

const ch = id => (id == null ? null : G.chars[id] || null);
const P = () => G.chars[G.playerId];
const has = (c, t) => c.traits.includes(t);
const living = () => Object.values(G.chars).filter(c => c.alive);
const isAdult = c => c.age >= 16;
const free = c => !!c && c.alive && !c.prisonerOf;
const monthIndex = () => G.year * 12 + G.month;

function stat(c, s) {
  let v = c.base[s];
  for (const t of c.traits) { const T = TRAITS[t]; if (T && T.st[s]) v += T.st[s]; }
  if (s === 'sav' && c.health < 50) v -= 2;
  if (c.age < 16) v = Math.floor(v * c.age / 16);
  return Math.max(0, v);
}
function addTrait(c, t) {
  if (has(c, t)) return false;
  const z = TRAITS[t].zit;
  if (z && has(c, z)) c.traits = c.traits.filter(x => x !== z);
  c.traits.push(t);
  return true;
}
function stress(c, v) { c.stress = clamp(c.stress + v, 0, 120); return v; }
/* Kişiliğe aykırı/uygun davranışın stres etkisi. map: {ozellik: stres} */
function traitStress(c, map) {
  let s = 0;
  for (const k in map) if (has(c, k)) s += map[k];
  if (s) stress(c, s);
  return s;
}
function stressNote(s) { const w = L('Stres', 'Stress'); return s > 0 ? ` (${w} +${s})` : s < 0 ? ` (${w} ${s})` : ''; }

/* ---------- İsimler ---------- */
const isEast = c => !!(CULTURES[c.cul] && CULTURES[c.cul].east);
function rankNames(c) {
  return RANK_TABLE[(isEast(c) ? 'e' : '') + (c.female ? 'f' : 'm')].map(pickB);
}
function rankName(c) {
  if (c.age < 16) return c.female ? L('Kız çocuk', 'Girl') : L('Erkek çocuk', 'Boy');
  if (c.rank === 5) { const r = ownRealm(c); if (r) return rulerTitles(r)[c.female ? 1 : 0]; }
  return rankNames(c)[c.rank];
}
function nm(c) {
  if (!c) return L('Bilinmeyen biri', 'Someone unknown');
  if (c.age < 16 || c.rank < 2) return `${c.name} ${c.dyn}`;
  const r = rankName(c);
  if (c.rank === 2 && !isEast(c)) return `${c.female ? 'Dame' : L('Sör', 'Sir')} ${c.name} ${c.dyn}`;
  if (isEast(c) && c.rank >= 2 && c.rank <= 4) return `${c.name} ${r} (${c.dyn})`;
  if (c.rank === 5 && (r === 'Bey' || r === 'Hatun')) return `${c.name} ${r} (${c.dyn})`;
  return `${r} ${c.name} ${c.dyn}`;
}
function titleOf(c) {
  const r = ownRealm(c);
  if (r) return r.name;
  const ss = settlementsOf(c);
  if (ss.length) return ss.map(t => t.name).slice(0, 3).join(', ') + (ss.length > 3 ? '…' : '');
  return rankName(c);
}
function dateStr() { return `${monthName(G.month)} ${G.year}`; }
function log(m, k = 'info') {
  G.log.unshift({ d: dateStr(), m, k });
  if (G.log.length > 300) G.log.length = 300;
}
function queueEvent(id, d) { G.queue.push({ id, d: d || {} }); }
function info(baslik, metin) { queueEvent('bilgi', { b: baslik, m: metin }); }

/* ---------- Karakter oluşturma ---------- */
function randomBase() {
  return { sav: rnd(2, 9), dip: rnd(2, 9), ent: rnd(2, 9), yon: rnd(2, 9), cek: rnd(2, 9) };
}
function randomTraits() {
  const out = [];
  for (const t of shuffle(PERSONALITY.slice())) {
    if (out.length >= 3) break;
    if (!out.some(o => TRAITS[o].zit === t)) out.push(t);
  }
  if (chance(0.3)) out.push(pick(PHYSICAL));
  if (chance(0.1)) out.push('dindar');
  return out;
}
function inheritTraits(m, f) {
  const out = [];
  const tryAdd = t => { if (t && !out.includes(t) && !out.some(o => TRAITS[o].zit === t)) out.push(t); };
  for (const par of [m, f]) {
    if (!par) continue;
    const pers = par.traits.filter(t => TRAITS[t].kisilik);
    if (pers.length && chance(0.4)) tryAdd(pick(pers));
    for (const t of par.traits) if (TRAITS[t].fiziksel && chance(0.3)) tryAdd(t);
  }
  for (const t of shuffle(PERSONALITY.slice())) { if (out.filter(x => TRAITS[x].kisilik).length >= 3) break; tryAdd(t); }
  return out;
}
function makeChar(o = {}) {
  const female = o.female ?? chance(0.5);
  const rank = o.rank ?? 0;
  const cul = o.cul || 'latin';
  const C = CULTURES[cul];
  const c = {
    id: G.nextId++, cul,
    name: o.name || pick(female ? C.f : C.m),
    dyn: o.dyn || pick(C.d),
    female,
    age: o.age ?? rnd(18, 50),
    alive: true,
    traits: o.traits || randomTraits(),
    base: o.base || randomBase(),
    gold: o.gold ?? 5,
    prestige: o.prestige ?? 0,
    dread: 0, shame: 0, stress: 0, tyranny: 0, health: 100,
    baseRank: rank, rank, titles: [],
    lordId: o.lordId ?? null,
    spouseId: null, lovers: [],
    fatherId: o.fatherId ?? null, motherId: o.motherId ?? null, realFatherId: null,
    bastard: false, adopted: false,
    children: [], op: {}, prisonerOf: null, death: null,
  };
  G.chars[c.id] = c;
  return c;
}

/* ---------- Unvanlar ---------- */
function addTitle(name, rank, liege, extra) {
  const t = Object.assign({ id: 't' + (G.nextTitle++), name, rank, holder: null, liege: liege || null }, extra || {});
  G.titles[t.id] = t;
  return t;
}
const isRealm = t => t && t.kind === 'realm';
const isSettlement = t => t && (t.kind === 'sehir' || t.kind === 'kale');
function settlementsOf(c) { return c.titles.map(id => G.titles[id]).filter(isSettlement); }
function ownRealm(c) { for (const id of c.titles) { const t = G.titles[id]; if (isRealm(t)) return t; } return null; }
function topLiege(c) { let cur = c, g = 0; while (cur && cur.lordId != null && g++ < 12) { const n = ch(cur.lordId); if (!n || !n.alive) break; cur = n; } return cur; }
/* Karakterin bağlı olduğu krallık (yoksa null) */
function realmOf(c) { if (!c) return null; const t = topLiege(c); return t ? ownRealm(t) : null; }
function realmColor(r) { return r ? r.color : '#8a8070'; }
function primaryTitle(c) {
  let best = null;
  for (const id of c.titles) { const t = G.titles[id]; if (!best || t.rank > best.rank || (t.rank === best.rank && t.kind === 'sehir' && best.kind !== 'sehir')) best = t; }
  return best;
}
/* Kişinin kendi elinde tutabileceğinden fazla olan şehir/kaleleri (bağışlanabilir) */
function demesneLimit(c) { return 1 + Math.floor(stat(c, 'yon') / 6) + (ownRealm(c) ? 1 : 0); }
function spareTitles(c) {
  const ss = settlementsOf(c).sort((a, b) => (a.capital ? 1 : 0) - (b.capital ? 1 : 0) || (a.kind === 'kale' ? -1 : 1));
  return ss.slice(0, Math.max(0, ss.length - demesneLimit(c)));
}
function recalcRank(c) {
  if (ownRealm(c)) { c.rank = 5; return; }
  const n = settlementsOf(c).length;
  c.rank = n >= 3 ? 4 : n >= 1 ? 3 : c.baseRank;
}
function giveTitle(t, c) {
  if (t.holder != null) {
    const old = ch(t.holder);
    if (old) {
      old.titles = old.titles.filter(x => x !== t.id);
      if (!old.titles.length) old.baseRank = Math.max(old.baseRank, 2);
      recalcRank(old);
    }
  }
  t.holder = c ? c.id : null;
  if (c) { c.titles.push(t.id); recalcRank(c); }
  refreshLieges();
}
function refreshLieges() {
  for (const c of living()) {
    const pt = primaryTitle(c);
    if (!pt) continue;
    let l = pt.liege ? G.titles[pt.liege] : null;
    let guard = 0;
    while (l && l.holder === c.id && guard++ < 10) l = l.liege ? G.titles[l.liege] : null;
    c.lordId = l && l.holder != null ? l.holder : null;
  }
}
function isUnder(a, b) {
  let cur = a, g = 0;
  while (cur && cur.lordId != null && g++ < 10) {
    if (cur.lordId === b.id) return true;
    cur = ch(cur.lordId);
  }
  return false;
}

/* ---------- Aile ---------- */
function familyRel(a, b) {
  if (!a || !b || a.id === b.id) return null;
  if (a.spouseId === b.id) return 'es';
  if (a.fatherId === b.id || a.realFatherId === b.id) return 'baba';
  if (a.motherId === b.id) return 'anne';
  if (b.fatherId === a.id || b.motherId === a.id || b.realFatherId === a.id) return 'cocuk';
  if ((a.fatherId && a.fatherId === b.fatherId) || (a.motherId && a.motherId === b.motherId)) return 'kardes';
  return null;
}
function relName(k) { return { es: L('Eş', 'Spouse'), baba: L('Baba', 'Father'), anne: L('Anne', 'Mother'), cocuk: L('Çocuk', 'Child'), kardes: L('Kardeş', 'Sibling') }[k] || k; }
function closeKin(a, b) { const r = familyRel(a, b); return r && r !== 'es'; }
function heirOf(c) {
  const kids = c.children.map(ch).filter(k => k && k.alive && !k.bastard && (k.fatherId === c.id || k.motherId === c.id));
  kids.sort((a, b) => b.age - a.age);
  return kids[0] || null;
}
function marry(a, b) {
  a.spouseId = b.id; b.spouseId = a.id;
  a.lovers = a.lovers.filter(x => x !== b.id); b.lovers = b.lovers.filter(x => x !== a.id);
  addOp(a, b, 20); addOp(b, a, 20);
  if (!a.titles.length && b.titles.length) a.lordId = b.id;
  else if (!b.titles.length && a.titles.length) b.lordId = a.id;
  else if (!a.titles.length && !b.titles.length) { if (a.rank >= b.rank) b.lordId = a.lordId; else a.lordId = b.lordId; }
}
function divorce(a) {
  const b = ch(a.spouseId);
  a.spouseId = null;
  if (b) b.spouseId = null;
}
function becomeLovers(a, b) {
  if (!a.lovers.includes(b.id)) a.lovers.push(b.id);
  if (!b.lovers.includes(a.id)) b.lovers.push(a.id);
  addOp(a, b, 15); addOp(b, a, 15);
  if (a.spouseId || b.spouseId) addSecret('zina', a.id, b.id, [a.id, b.id]);
}
function breakUp(a, b) {
  a.lovers = a.lovers.filter(x => x !== b.id);
  b.lovers = b.lovers.filter(x => x !== a.id);
}

/* ---------- Görüş (ilişki) ---------- */
function addOp(a, b, d) {
  if (!a || !b || a.id === b.id) return;
  a.op[b.id] = clamp((a.op[b.id] || 0) + d, -150, 150);
}
function opinionParts(a, b) {
  const parts = [];
  if (!a || !b || a.id === b.id) return parts;
  const base = Math.round(a.op[b.id] || 0);
  if (base) parts.push([L('Geçmiş ilişkiler', 'Past dealings'), base]);
  let comp = 0;
  for (const t of a.traits) {
    const T = TRAITS[t];
    if (!T.kisilik) continue;
    if (has(b, t)) comp += 8;
    if (T.zit && has(b, T.zit)) comp -= 12;
  }
  comp = clamp(comp, -30, 30);
  if (comp) parts.push([L('Kişilik uyumu', 'Personality'), comp]);
  if (has(b, 'guzel')) parts.push([L('Güzelliği', 'Beauty'), 10]);
  if (has(b, 'cirkin')) parts.push([L('Çirkinliği', 'Ugliness'), -5]);
  const rel = familyRel(a, b);
  if (rel === 'es') parts.push([L('Eşi', 'Spouse'), 20]);
  else if (rel) parts.push([relName(rel), 15]);
  if (a.lovers.includes(b.id)) parts.push([L('Sevgilisi', 'Lover'), 30]);
  if (a.lordId === b.id && b.prestige > 0) parts.push([L('Efendisinin şanı', 'Liege\'s prestige'), Math.min(20, Math.floor(b.prestige / 40))]);
  if (b.shame > 1) {
    const s = -Math.round(b.shame * (has(a, 'durust') ? 0.6 : 0.3));
    if (s) parts.push([L('Rezaleti', 'Shame'), s]);
  }
  if (b.tyranny > 1 && isUnder(a, b)) parts.push([L('Zorbalığı', 'Tyranny'), -Math.round(b.tyranny)]);
  if (has(b, 'akrabakatili') && a.id !== b.id) parts.push([L('Akraba katili', 'Kinslayer'), -20]);
  if (has(a, 'paranoyak') && !rel) parts.push([L('Paranoya', 'Paranoia'), -10]);
  if (a.prisonerOf === b.id) parts.push([L('Onu zindanda tutuyor', 'Keeps them imprisoned'), -30]);
  return parts;
}
function opinion(a, b) { return clamp(opinionParts(a, b).reduce((s, p) => s + p[1], 0), -100, 100); }

/* ---------- Sırlar ---------- */
function addSecret(type, actor, target, known) {
  const s = { id: G.nextSecret++, type, actor, target, known: [...new Set(known)], pub: false, d: dateStr(), mi: monthIndex() };
  G.secrets.push(s);
  return s;
}
function knows(c, s) { return s.pub || s.known.includes(c.id); }
function learn(c, s) { if (!s.known.includes(c.id)) s.known.push(c.id); }
function secretText(s) {
  const a = ch(s.actor), t = ch(s.target);
  return SECRETS[s.type].d(a ? `${a.name} ${a.dyn}` : '?', t ? `${t.name} ${t.dyn}` : '?');
}
function secretAbout(t, knower) {
  const list = G.secrets.filter(s => !s.pub && (s.actor === t.id || s.target === t.id) && !knows(knower, s));
  return list.length ? pick(list) : null;
}
function knownSecretsOf(knower, t) {
  return G.secrets.filter(s => s.actor === t.id && !s.pub && knows(knower, s) && s.actor !== knower.id);
}
function hasKnownCrime(knower, t) {
  return G.secrets.some(s => s.actor === t.id && SECRETS[s.type].suc && knows(knower, s));
}
function exposeSecret(s) {
  if (s.pub) return;
  s.pub = true;
  const a = ch(s.actor), t = ch(s.target), info_ = SECRETS[s.type];
  if (a) { a.shame += info_.shame; a.prestige -= info_.shame; }
  if (s.type === 'zina') {
    if (t) { t.shame += 10; t.prestige -= 10; }
    for (const x of [a, t]) {
      if (!x || !x.spouseId) continue;
      const sp = ch(x.spouseId);
      if (sp) addOp(sp, x, -50);
      const other = x === a ? t : a;
      if (sp && other) addOp(sp, other, -40);
    }
  }
  if ((s.type === 'cinayet' || s.type === 'suikastGirisimi') && t && a) {
    for (const x of living()) if (familyRel(x, t) || x.lovers.includes(t.id)) addOp(x, a, s.type === 'cinayet' ? -80 : -40);
    addOp(t, a, -60);
    if (s.type === 'cinayet' && closeKin(a, t)) addTrait(a, 'akrabakatili');
  }
  if (s.type === 'pic' && t && a) {
    if (a.spouseId) { const sp = ch(a.spouseId); if (sp) addOp(sp, a, -60); }
    if (t.alive && !t.bastard) {
      const official = ch(t.fatherId);
      if (official) official.children = official.children.filter(x => x !== t.id);
      t.bastard = true;
      t.fatherId = t.realFatherId;
    }
  }
  const p = P();
  if (p && (knows(p, s) || relevant(a, t))) log(L(`📢 Skandal! ${secretText(s)}`, `📢 Scandal! ${secretText(s)}`), 'scandal');
}

/* ---------- Ölüm ---------- */
function die(c, reason) {
  if (!c || !c.alive) return;
  c.alive = false;
  c.death = { reason, d: dateStr(), age: c.age, mi: monthIndex() };
  const wasPlayer = c.id === G.playerId;
  if (c.spouseId) { const s = ch(c.spouseId); if (s && s.spouseId === c.id) s.spouseId = null; }
  for (const l of c.lovers) { const x = ch(l); if (x) x.lovers = x.lovers.filter(i => i !== c.id); }
  c.lovers = [];
  const heir = heirOf(c);
  for (const tid of c.titles.slice()) {
    const t = G.titles[tid];
    if (heir) giveTitle(t, heir);
    else {
      const lt = t.liege ? G.titles[t.liege] : null;
      const lg = lt && lt.holder != null ? ch(lt.holder) : null;
      giveTitle(t, lg && lg.alive && lg.id !== c.id ? lg : null);
    }
  }
  c.titles = [];
  if (heir) { heir.gold += c.gold; c.gold = 0; }
  for (const x of living()) {
    if (x.lordId === c.id && !x.titles.length) x.lordId = heir ? heir.id : c.lordId;
    if (x.prisonerOf === c.id) x.prisonerOf = heir && heir.id !== x.id ? heir.id : null;
  }
  if (typeof onCharGone === 'function') onCharGone(c, heir);
  refreshLieges();
  if (!wasPlayer && relevant(c)) log(L(`✝️ ${nm(c)} öldü — ${reason}. (${c.age} yaşında)`, `✝️ ${nm(c)} died — ${reason}. (age ${c.age})`), 'death');
  if (wasPlayer) {
    if (heir) {
      G.playerId = heir.id;
      G.generation = (G.generation || 1) + 1;
      log(L(`☠️ ${c.name} ${c.dyn} öldü — ${reason}. Hanedan ${heir.name} ile devam ediyor.`, `☠️ ${c.name} ${c.dyn} died — ${reason}. The dynasty lives on through ${heir.name}.`), 'death');
      info(L('☠️ Ölüm', '☠️ Death'), L(`<b>${c.name} ${c.dyn}</b> ${c.age} yaşında öldü.<br><i>${reason}</i><br><br>Hanedanın yaşıyor. Artık varisin <b>${nm(heir)}</b> (${heir.age} yaşında) olarak oynuyorsun.`, `<b>${c.name} ${c.dyn}</b> died at the age of ${c.age}.<br><i>${reason}</i><br><br>Your dynasty lives on. You now play as your heir, <b>${nm(heir)}</b> (age ${heir.age}).`));
    } else {
      G.over = { name: `${c.name} ${c.dyn}`, reason, age: c.age, d: dateStr() };
      log(L(`☠️ ${c.name} ${c.dyn} öldü — ${reason}. Geride varis kalmadı. Hanedan sona erdi.`, `☠️ ${c.name} ${c.dyn} died — ${reason}. No heir remains. The dynasty has ended.`), 'death');
    }
  }
}
function relevant(...cs) {
  const p = P();
  if (!p) return false;
  return cs.some(c => c && (c.id === p.id || familyRel(p, c) || c.id === p.lordId || c.lordId === p.id ||
    p.lovers.includes(c.id) || (c.rank >= 5 && realmOf(p) === ownRealm(c)) || Math.abs(opinion(p, c)) >= 50));
}

/* ---------- Hapis / İdam ---------- */
function imprison(captor, c, just) {
  c.prisonerOf = captor.id;
  addOp(c, captor, -40);
  if (!just) {
    captor.tyranny += 15;
    captor.dread += 8;
  }
  if (typeof onCharGone === 'function') onCharGone(c, null);
}
function execute(captor, c) {
  const just = hasKnownCrime(captor, c) || G.secrets.some(s => s.actor === c.id && s.pub && SECRETS[s.type].suc);
  for (const x of living()) if (familyRel(x, c) || x.lovers.includes(c.id)) addOp(x, captor, -80);
  captor.dread += 15;
  if (!just) captor.tyranny += 20;
  die(c, L(`${nm(captor)} tarafından idam edildi`, `Executed by ${nm(captor)}`));
  return just;
}

/* ---------- Ekonomi / Ordu ---------- */
function income(c) {
  if (c.age < 16 || c.prisonerOf) return 0;
  const y = stat(c, 'yon');
  let g = [1, 2, 4, 0, 0, 0][Math.min(c.rank, 5)];
  for (const t of settlementsOf(c)) g += (t.kind === 'sehir' ? 14 : 8) * (t.prosperity || 1) + Math.floor(y / 3);
  const r = ownRealm(c);
  if (r) g += 3 * Object.values(G.titles).filter(t => isSettlement(t) && t.liege === r.id && t.holder !== c.id).length;
  return Math.round(g);
}
/* ---------- Savaş ---------- */
/* ---------- Ortak etkileşim sonuçları (oyuncu ve NPC aynı kurallar) ---------- */
function seduceChance(a, b) {
  return clamp(Math.round(20 + (stat(a, 'cek') - 5) * 6 + opinion(b, a) / 2 + (has(b, 'sehvetli') ? 20 : 0) -
    (has(b, 'iffetli') ? 35 : 0) - (b.spouseId ? 10 : 0)), 3, 92);
}
function marryChance(a, b) {
  return clamp(Math.round(15 + opinion(b, a) / 1.5 + (a.rank - b.rank) * 15 + (stat(a, 'cek') - 5) * 3), 2, 95);
}
function murderChance(a, b) {
  return clamp(Math.round(15 + (stat(a, 'ent') - stat(b, 'ent')) * 6 + (b.rank <= 2 ? 15 : 0) - b.rank * 3 -
    (has(b, 'paranoyak') ? 15 : 0)), 5, 80);
}
function slanderChance(a, b) {
  return clamp(Math.round(35 + (stat(a, 'ent') - stat(b, 'ent')) * 6 + (stat(a, 'dip') - 5) * 2), 5, 90);
}
function spyChance(a, b) { return clamp(Math.round(35 + (stat(a, 'ent') - stat(b, 'ent')) * 7), 5, 95); }
function duelChance(a, b) { return clamp(Math.round(50 + (stat(a, 'sav') - stat(b, 'sav')) * 5), 5, 95); }

/* sonuç: {ok, exposed} */
function tryMurder(a, b) {
  a.gold -= 30;
  if (chance(murderChance(a, b) / 100)) {
    const s = addSecret('cinayet', a.id, b.id, [a.id]);
    die(b, pick(L(['Zehirlendi', 'Yatağında boğazı kesilmiş bulundu', 'Merdivenden "düştü"', 'Gizemli bir hastalık'], ['Poisoned', 'Found in bed with a slit throat', '"Fell" down the stairs', 'A mysterious illness'])));
    const exposed = chance(0.15);
    if (exposed) exposeSecret(s);
    return { ok: true, exposed };
  }
  const exposed = chance(0.5);
  if (exposed) { addSecret('suikastGirisimi', a.id, b.id, [a.id, b.id]); addOp(b, a, -100); }
  return { ok: false, exposed };
}
function slander(a, b) {
  if (chance(slanderChance(a, b) / 100)) {
    b.shame += 15; b.prestige -= 15;
    const l = ch(b.lordId);
    if (l) addOp(l, b, -25);
    return { ok: true };
  }
  const caught = chance(0.5);
  if (caught) {
    addOp(b, a, -40);
    const s = addSecret('iftira', a.id, b.id, [a.id, b.id]);
    exposeSecret(s);
  }
  return { ok: false, caught };
}
function duel(a, b) {
  const pa = stat(a, 'sav') + rnd(1, 10) + (has(a, 'cesur') ? 2 : 0);
  const pb = stat(b, 'sav') + rnd(1, 10) + (has(b, 'cesur') ? 2 : 0);
  const win = pa >= pb ? a : b, lose = win === a ? b : a;
  win.prestige += 25; lose.prestige -= 10;
  const r = Math.random();
  let res;
  let killed = false;
  if (r < 0.2) { res = L('öldü', 'died'); killed = true; }
  else if (r < 0.55) { res = L('ağır yaralandı', 'was badly wounded'); lose.health -= 30; addTrait(lose, 'yarali'); }
  else res = L('yenilip teslim oldu', 'was beaten and yielded');
  if (killed) die(lose, L(`${win.name} ${win.dyn} ile düelloda öldü`, `Killed in a duel with ${win.name} ${win.dyn}`));
  else if (lose.health <= 0) { res = L('aldığı yaralarla öldü', 'died of their wounds'); die(lose, L('Düello yaraları', 'Duel wounds')); }
  return { win, lose, res };
}
function spy(a, b) {
  if (chance(spyChance(a, b) / 100)) {
    const s = secretAbout(b, a);
    if (s) { learn(a, s); return { ok: true, s }; }
    return { ok: true, s: null };
  }
  const caught = chance(0.3);
  if (caught) addOp(b, a, -25);
  return { ok: false, caught };
}

/* ---------- Doğum ---------- */
function birth(mother, father) {
  const legit = mother.spouseId ? ch(mother.spouseId) : null;
  const kid = makeChar({
    age: 0, traits: inheritTraits(mother, father), gold: 0, cul: (legit || mother).cul,
    base: Object.fromEntries(Object.keys(STATS).map(k => [k, clamp(Math.round((mother.base[k] + father.base[k]) / 2) + rnd(-2, 2), 1, 14)])),
  });
  kid.motherId = mother.id;
  mother.children.push(kid.id);
  if (!father.children.includes(kid.id)) father.children.push(kid.id);
  if (legit && legit.id === father.id) {
    kid.fatherId = father.id;
    kid.dyn = (mother.rank > father.rank ? mother : father).dyn;
  } else if (legit) {
    kid.fatherId = legit.id; kid.realFatherId = father.id; kid.dyn = legit.dyn;
    if (!legit.children.includes(kid.id)) legit.children.push(kid.id);
    addSecret('pic', mother.id, kid.id, [mother.id, father.id]);
  } else {
    kid.bastard = true; kid.realFatherId = father.id; kid.fatherId = father.id; kid.dyn = mother.dyn;
  }
  const noble = [mother, legit].some(x => x && x.rank >= 2);
  kid.baseRank = !kid.bastard && noble ? 2 : 0;
  kid.rank = kid.baseRank;
  const landed = [mother, legit].find(x => x && x.titles.length);
  kid.lordId = landed ? landed.id : mother.lordId;
  const p = P();
  if (mother.id === p.id || father.id === p.id || (legit && legit.id === p.id)) {
    let m = L(`👶 ${mother.name} bir ${kid.female ? 'kız' : 'erkek'} çocuk doğurdu: <b>${kid.name}</b>.`, `👶 ${mother.name} gave birth to a ${kid.female ? 'daughter' : 'son'}: <b>${kid.name}</b>.`);
    if (father.id === p.id && legit && legit.id !== p.id) m += L(' (Gerçek babası sensin, ama bunu sadece ikiniz biliyorsunuz.)', ' (You are the real father, but only the two of you know.)');
    if (kid.bastard) m += L(' (Gayrimeşru)', ' (Illegitimate)');
    log(m, 'good');
  } else if (relevant(mother)) log(L(`👶 ${nm(mother)} bir çocuk doğurdu: ${kid.name}.`, `👶 ${nm(mother)} gave birth: ${kid.name}.`), 'info');
  return kid;
}

/* ---------- NPC yapay zekâsı ---------- */
function nearby(c) {
  return living().filter(x => x.id !== c.id && isAdult(x) && !x.prisonerOf && (
    x.lordId === c.lordId || x.lordId === c.id || x.id === c.lordId || familyRel(c, x) ||
    c.lovers.includes(x.id) || Math.abs(c.op[x.id] || 0) > 25));
}
function npcAct(c) {
  if (!free(c) || !isAdult(c) || c.id === G.playerId) return;
  const near = nearby(c);
  if (!near.length) return;
  const p = P();
  const playerNear = near.includes(p);
  const choose = (list, score) => {
    if (!list.length) return null;
    if (playerNear && list.includes(p) && chance(0.3)) return p;
    let best = null, bs = -1e9;
    for (const x of list) { const s = score(x) + Math.random() * 25; if (s > bs) { bs = s; best = x; } }
    return best;
  };
  const opts = [];
  const w = (k, v) => { if (v > 0) opts.push([k, v]); };
  w('sohbet', 2);
  w('hediye', has(c, 'comert') ? 2 : 0.5);
  w('bastan', has(c, 'sehvetli') ? 2.5 : has(c, 'iffetli') ? 0 : 0.4);
  if (!c.spouseId && c.age < 55) w('evlen', 2);
  w('iftira', has(c, 'kurnaz') ? 1.5 : 0.3);
  w('suikast', (has(c, 'zalim') || has(c, 'hirsli')) && !has(c, 'merhametli') ? 0.5 : 0.08);
  w('duello', has(c, 'cesur') ? 0.6 : 0.1);
  w('casus', has(c, 'kurnaz') || has(c, 'paranoyak') ? 1 : 0.3);
  w('santaj', has(c, 'kurnaz') || has(c, 'acgozlu') ? 1 : 0.2);
  w('hapis', c.rank >= 3 ? (has(c, 'zalim') || has(c, 'paranoyak') ? 0.6 : 0.2) : 0);
  w('yardim', has(c, 'merhametli') ? 1 : 0);
  w('sovalyelik', c.rank >= 3 ? 0.4 : 0);
  const act = weighted(opts);
  let t;
  switch (act) {
    case 'sohbet':
      t = choose(near, x => opinion(c, x) + (x.id === c.lordId ? 20 : 0));
      if (t) { addOp(t, c, rnd(3, 8)); addOp(c, t, 3); if (t === p) log(L(`💬 ${nm(c)} seninle uzun uzun sohbet etti.`, `💬 ${nm(c)} had a long talk with you.`), 'social'); }
      break;
    case 'hediye':
      if (c.gold < 25) break;
      t = choose(near, x => opinion(c, x) + (x.id === c.lordId ? 30 : 0));
      if (t) { c.gold -= 10; t.gold += 10; addOp(t, c, 10); if (t === p) log(L(`🎁 ${nm(c)} sana 10 altınlık bir hediye gönderdi.`, `🎁 ${nm(c)} sent you a gift worth 10 gold.`), 'good'); }
      break;
    case 'bastan': {
      const cands = near.filter(x => !closeKin(c, x) && !c.lovers.includes(x.id) && x.spouseId !== c.id &&
        (x.female !== c.female || chance(0.1)) && opinion(c, x) > 10);
      t = choose(cands, x => opinion(c, x) + (has(x, 'guzel') ? 20 : 0));
      if (!t) break;
      if (t === p) queueEvent('bastanTeklif', { from: c.id });
      else if (chance(seduceChance(c, t) / 100)) becomeLovers(c, t);
      break;
    }
    case 'evlen': {
      const cands = near.filter(x => !x.spouseId && x.female !== c.female && !closeKin(c, x) &&
        Math.abs(x.rank - c.rank) <= 1 && Math.abs(x.age - c.age) <= 15);
      t = choose(cands, x => opinion(c, x) + x.rank * 10);
      if (!t) break;
      if (t === p) queueEvent('evlilikTeklif', { from: c.id });
      else if (chance(marryChance(c, t) / 100)) {
        marry(c, t);
        if (relevant(c, t)) log(L(`💍 ${nm(c)} ile ${nm(t)} evlendi.`, `💍 ${nm(c)} and ${nm(t)} were married.`), 'info');
      }
      break;
    }
    case 'iftira':
      t = choose(near.filter(x => opinion(c, x) < -30), x => -opinion(c, x));
      if (!t) break;
      {
        const r = slander(c, t);
        if (t === p) {
          if (r.ok) log(L('🗣️ Hakkında çirkin dedikodular yayılıyor... (Rezalet +15)', '🗣️ Ugly rumours about you are spreading... (Shame +15)'), 'bad');
          else if (r.caught) log(L(`🗣️ ${nm(c)} hakkında iftira atmaya çalıştı ama yalanı ortaya çıktı.`, `🗣️ ${nm(c)} tried to slander you, but the lie was exposed.`), 'social');
        }
      }
      break;
    case 'suikast':
      if (c.gold < 30) break;
      t = choose(near.filter(x => opinion(c, x) < (x === p ? -60 : -50)), x => -opinion(c, x));
      if (!t) break;
      if (t === p) { if (!chance(p.dread / 100) && chance(0.6)) playerAssassinAttempt(c); }
      else tryMurder(c, t);
      break;
    case 'duello':
      t = choose(near.filter(x => opinion(c, x) < -30 && x.health > 40), x => -opinion(c, x));
      if (!t || c.health < 40) break;
      if (t === p) queueEvent('duelloTeklif', { from: c.id });
      else if (has(t, 'cesur') || opinion(t, c) < -30 || chance(0.4)) {
        const r = duel(c, t);
        if (relevant(c, t)) log(L(`🤺 ${nm(c)} ile ${nm(t)} düello etti: ${r.lose.name} ${r.res}.`, `🤺 ${nm(c)} fought a duel with ${nm(t)}: ${r.lose.name} ${r.res}.`), 'info');
      }
      break;
    case 'casus':
      t = choose(near, x => -opinion(c, x));
      if (t) spy(c, t);
      break;
    case 'santaj': {
      const list = G.secrets.filter(s => !s.pub && s.known.includes(c.id) && s.actor !== c.id && free(ch(s.actor)));
      if (!list.length) break;
      const s = pick(list);
      t = ch(s.actor);
      if (t === p) queueEvent('santaj', { from: c.id, sid: s.id, amt: Math.max(10, Math.floor(p.gold * 0.4)) });
      else if (chance(0.6)) { const amt = Math.floor(t.gold * 0.4); t.gold -= amt; c.gold += amt; addOp(t, c, -30); }
      else if (chance(0.5)) exposeSecret(s);
      break;
    }
    case 'hapis': {
      const cands = living().filter(x => x.lordId === c.id && free(x) && isAdult(x) &&
        (hasKnownCrime(c, x) || (has(c, 'zalim') && opinion(c, x) < -50)));
      if (!cands.length) break;
      t = pick(cands);
      if (t === p) {
        const just = hasKnownCrime(c, t);
        imprison(c, t, just);
        info(L('⛓️ Zindan', '⛓️ Dungeon'), L(`${nm(c)} muhafızlarını gönderdi ve seni zindana attırdı! ${just ? 'Suçlarını biliyor.' : 'Hiçbir gerekçe göstermeden.'}<br><br>Kaçmayı deneyebilir, gardiyana rüşvet verebilir ya da kaderini bekleyebilirsin.`, `${nm(c)} sent the guards and had you thrown in the dungeon! ${just ? 'They know your crimes.' : 'Without any justification.'}<br><br>You can try to escape, bribe a guard or await your fate.`));
      } else {
        imprison(c, t, hasKnownCrime(c, t));
        if (relevant(c, t)) log(L(`⛓️ ${nm(c)}, ${nm(t)} adlı kişiyi zindana attırdı.`, `⛓️ ${nm(c)} imprisoned ${nm(t)}.`), 'info');
      }
      break;
    }
    case 'yardim':
      t = choose(near.filter(x => x.gold < 10), x => -x.gold);
      if (t && c.gold >= 10) { c.gold -= 5; t.gold += 5; addOp(t, c, 12); if (t === p) log(L(`🤲 ${nm(c)} sana 5 altın yardım etti.`, `🤲 ${nm(c)} helped you with 5 gold.`), 'good'); }
      break;
    case 'sovalyelik': {
      const cands = living().filter(x => x.lordId === c.id && !x.titles.length && x.baseRank === 1 && free(x) && opinion(c, x) > 20);
      if (!cands.length) break;
      t = pick(cands);
      t.baseRank = 2; recalcRank(t); t.prestige += 30; addOp(t, c, 20);
      if (t === p) info(L('⚔️ Şövalyelik', '⚔️ Knighthood'), L(`${nm(c)} seni huzuruna çağırdı ve kılıcıyla omuzlarına dokundu.<br><br>Artık bir <b>şövalyesin</b>!`, `${nm(c)} summoned you and touched your shoulders with a sword.<br><br>You are now a <b>knight</b>!`));
      break;
    }
  }
}
function playerAssassinAttempt(c) {
  const p = P();
  c.gold -= 30;
  if (chance(murderChance(c, p) * 0.5 / 100)) {
    addSecret('cinayet', c.id, p.id, [c.id]);
    die(p, L('Zehirlendi (katili bilinmiyor)', 'Poisoned (killer unknown)'));
    return;
  }
  if (chance(0.5)) {
    addSecret('suikastGirisimi', c.id, p.id, [c.id, p.id]);
    addOp(p, c, -100);
    stress(p, 15);
    info(L('🗡️ Suikast girişimi!', '🗡️ Murder attempt!'), L(`Şarabının tadı tuhaftı... Tadına bakan hizmetkârın kıvranarak öldü.<br><br>Yakalanan zehirci her şeyi itiraf etti: onu <b>${nm(c)}</b> göndermiş!<br><br>Artık bunu biliyorsun.`, `Your wine tasted strange... the servant who tasted it died writhing.<br><br>The captured poisoner confessed everything: <b>${nm(c)}</b> sent them!<br><br>Now you know.`));
  } else log(L('🗡️ Bir hizmetkârın şüpheli bir şekilde kayboldu... Biri canına mı kastediyor?', '🗡️ One of your servants vanished suspiciously... Is someone after your life?'), 'bad');
}

/* ---------- Aylık işleyiş ---------- */
function prisonsTick() {
  const p = P();
  for (const x of living()) {
    if (!x.prisonerOf) continue;
    const cap = ch(x.prisonerOf);
    if (!cap || !cap.alive) { x.prisonerOf = null; continue; }
    x.health -= 1;
    if (cap.id === p.id) continue;
    if (x.id === p.id) {
      const harsh = has(cap, 'zalim') || opinion(cap, x) < -60;
      if (chance(harsh ? 0.07 : 0.015)) { execute(cap, x); continue; }
      if (opinion(cap, x) > 0 && chance(0.1)) { x.prisonerOf = null; info(L('🔓 Özgürlük', '🔓 Freedom'), L(`${nm(cap)} seni affetti ve serbest bıraktı.`, `${nm(cap)} pardoned you and set you free.`)); continue; }
      if (chance(0.15) && !G.queue.some(q => q.id === 'fidye')) queueEvent('fidye', { from: cap.id, amt: Math.max(15, 20 + x.rank * 30) });
    } else {
      if (chance(has(cap, 'zalim') ? 0.06 : 0.012)) {
        execute(cap, x);
        if (relevant(x)) log(L(`🪓 ${nm(x)}, ${nm(cap)} tarafından idam edildi.`, `🪓 ${nm(x)} was executed by ${nm(cap)}.`), 'death');
      } else if (chance(0.05)) x.prisonerOf = null;
    }
  }
}
function secretsTick() {
  const p = P();
  G.secrets = G.secrets.filter(s => {
    const a = ch(s.actor);
    return a && (a.alive || s.type === 'pic');
  });
  for (const s of G.secrets) {
    if (s.pub) continue;
    const a = ch(s.actor);
    for (const k of s.known.slice()) {
      const kc = ch(k);
      if (!kc || !kc.alive || k === s.actor || k === p.id || s.target === k && s.type === 'zina') continue;
      if (opinion(kc, a) < -30 && chance(0.03)) { exposeSecret(s); break; }
      if (chance(0.02)) { const n = nearby(kc); if (n.length) learn(pick(n), s); }
    }
    if (s.pub || !SECRETS[s.type].suc || !free(a)) continue;
    const l = ch(a.lordId);
    if (!l || !l.alive || l.id === p.id || !knows(l, s)) continue;
    const mult = has(l, 'durust') || has(l, 'zalim') ? 2 : 1;
    if (chance(0.06 * mult)) {
      imprison(l, a, true);
      if (a.id === p.id) info(L('⛓️ Zindan', '⛓️ Dungeon'), L(`Efendin ${nm(l)} suçunu öğrendi: <i>${secretText(s)}</i><br><br>Muhafızlar seni zincirlere vurdu.`, `Your liege ${nm(l)} learned of your crime: <i>${secretText(s)}</i><br><br>The guards put you in chains.`));
      else if (relevant(a)) log(L(`⛓️ ${nm(a)} suçları yüzünden zindana atıldı.`, `⛓️ ${nm(a)} was imprisoned for their crimes.`), 'info');
    }
  }
  // Oyuncunun suçları açığa çıkınca efendisi de tepki verebilir
  for (const s of G.secrets) {
    if (!s.pub || s.actor !== p.id || !SECRETS[s.type].suc || !free(p)) continue;
    const l = ch(p.lordId);
    if (l && free(l) && chance(0.04 * (has(l, 'durust') ? 2 : 1))) {
      imprison(l, p, true);
      info(L('⛓️ Zindan', '⛓️ Dungeon'), L(`Suçların herkesin dilinde. Efendin ${nm(l)} seni zindana attırdı.`, `Everyone is talking about your crimes. Your liege ${nm(l)} had you imprisoned.`));
    }
  }
}
function grantTick() {
  for (const c of living()) {
    if (c.id === G.playerId || !free(c)) continue;
    const spare = spareTitles(c);
    for (const t of spare) {
      if (!chance(0.25)) continue;
      const cands = living().filter(x => isAdult(x) && free(x) && !x.titles.length &&
        (x.lordId === c.id || (familyRel(c, x) === 'cocuk' && !x.bastard)));
      if (!cands.length) continue;
      let best = null, bs = -1e9;
      for (const x of cands) {
        const s = opinion(c, x) + x.prestige / 10 + (familyRel(c, x) ? 40 : 0) + x.rank * 10 + Math.random() * 20;
        if (s > bs) { bs = s; best = x; }
      }
      giveTitle(t, best);
      addOp(best, c, 40);
      best.prestige += 50;
      if (best.id === G.playerId) info(L('🏰 Unvan!', '🏰 Title!'), L(`${nm(c)} sana <b>${t.name}</b> unvanını bağışladı!<br><br>Artık topraklarının efendisisin.`, `${nm(c)} granted you <b>${t.name}</b>!<br><br>You are now lord of your own lands.`));
      else if (relevant(c, best)) log(L(`🏰 ${nm(c)}, ${t.name} unvanını ${nm(best)} adlı kişiye verdi.`, `🏰 ${nm(c)} granted ${t.name} to ${nm(best)}.`), 'info');
      break;
    }
  }
}
function fillVacant() {
  for (const t of Object.values(G.titles)) {
    if (t.dead) continue;
    if (t.holder != null && ch(t.holder) && ch(t.holder).alive) continue;
    const lt = t.liege ? G.titles[t.liege] : null;
    const lh = lt && lt.holder != null ? ch(lt.holder) : null;
    if (lh && lh.alive) { giveTitle(t, lh); continue; }
    const vassals = Object.values(G.titles).filter(x => x.liege === t.id && x.holder != null).map(x => ch(x.holder)).filter(x => x && x.alive);
    const pool = vassals.length ? vassals : living().filter(x => isAdult(x) && x.rank >= 2);
    if (!pool.length) continue;
    pool.sort((a, b) => b.prestige - a.prestige);
    giveTitle(t, pool[0]);
    if (relevant(pool[0])) log(L(`👑 ${t.name} boş kaldı ve ${nm(pool[0])} tarafından alındı.`, `👑 ${t.name} was vacant and was claimed by ${nm(pool[0])}.`), 'info');
  }
}
function birthsTick() {
  const all = living();
  const f = clamp(1.6 - all.length / 120, 0.15, 1.3);
  for (const m of all) {
    if (!m.female || m.age < 16 || m.age > 45 || m.prisonerOf) continue;
    const sp = ch(m.spouseId);
    if (sp && sp.alive && !sp.female && !sp.prisonerOf && chance(0.022 * f)) { birth(m, sp); continue; }
    for (const lid of m.lovers) {
      const l = ch(lid);
      if (l && l.alive && !l.female && chance(0.012 * f)) { birth(m, l); break; }
    }
  }
}
function healthTick(c) {
  if (!c.alive) return;
  if (c.health < 100) c.health = Math.min(100, c.health + 2);
  if (c.id === G.playerId && c.stress > 70) c.health -= 1;
  let pd = 0;
  if (c.age > 45) pd = Math.pow((c.age - 45) / 40, 3) / 12;
  if (c.age < 3) pd += 0.002;
  if (c.health < 30) pd += 0.03;
  if (has(c, 'ayyas')) pd += 0.002;
  if (c.health <= 0) die(c, L('Sağlığı tükendi', 'Health gave out'));
  else if (chance(pd)) die(c, c.age < 5 ? L('Çocuk hastalığı', 'Childhood illness') : c.age > 55 ? L('Yaşlılık', 'Old age') : pick(L(['Ateşli bir hastalık', 'Veba', 'Kalp krizi', 'Kötü bir yara enfeksiyonu'], ['A burning fever', 'Plague', 'A failing heart', 'An infected wound'])));
}
function decayTick() {
  for (const c of living()) {
    for (const k in c.op) {
      const v = c.op[k] * 0.985;
      if (Math.abs(v) < 1 || !G.chars[k] || !G.chars[k].alive) delete c.op[k]; else c.op[k] = v;
    }
    c.shame = Math.max(0, c.shame - 0.5);
    c.tyranny = Math.max(0, c.tyranny - 0.5);
    c.dread = Math.max(0, c.dread - 0.3);
    if (c.id === G.playerId) c.stress = Math.max(0, c.stress - 1);
  }
}
function populationTick() {
  const all = living();
  if (all.length > 420) {
    const p = P();
    const movers = all.filter(c => c.id !== p.id && isAdult(c) && c.rank <= 1 && !c.titles.length && !c.prisonerOf &&
      !relevant(c) && !all.some(x => x.lordId === c.id));
    for (const c of shuffle(movers).slice(0, Math.min(6, all.length - 420))) die(c, L('Diyardan göç etti', 'Left the land'));
  }
  pruneTick();
  const adults = living().filter(isAdult).length;
  if (adults >= 230) return;
  const lords = living().filter(x => x.rank >= 3);
  const n = adults < 180 ? 3 : 1;
  for (let i = 0; i < n; i++) {
    const r = weighted([[0, 4], [1, 3], [2, 2]]);
    const lord = lords.length ? pick(lords) : null;
    makeChar({ rank: r, age: rnd(16, 35), gold: rnd(2, 15) + r * 10, prestige: r * 20, lordId: lord ? lord.id : null, cul: lord ? lord.cul : 'latin' });
  }
}
/* Eski ölüleri ve bayat sırları temizle (kayıt dosyası şişmesin) */
function pruneTick() {
  if (G.month !== 0) return;
  const p = P(), now = monthIndex();
  const keep = new Set([p.id]);
  for (const c of living()) {
    [c.fatherId, c.motherId, c.realFatherId, c.spouseId, ...c.children].forEach(id => id != null && keep.add(id));
  }
  const fam = id => { const c = ch(id); return c && (c.dyn === p.dyn || familyRel(p, c)); };
  for (const c of Object.values(G.chars)) {
    if (c.alive || keep.has(c.id) || fam(c.id)) continue;
    if (c.death && now - (c.death.mi || 0) > 120) delete G.chars[c.id];
  }
  G.secrets = G.secrets.filter(s => !(s.pub && now - (s.mi || 0) > 120) && G.chars[s.actor]);
  if (G.secrets.length > 250) G.secrets = G.secrets.filter(s => s.known.includes(p.id) || s.actor === p.id || now - (s.mi || 0) < 240);
}

function randomEventTick() {
  const p = P();
  if (p.stress >= 100 && !G.queue.some(q => q.id === 'cokus')) { queueEvent('cokus', {}); return; }
  if (G.queue.length || !chance(0.45)) return;
  const opts = [];
  for (const [k, e] of Object.entries(EVENTS)) {
    if (!e.w) continue;
    const wt = e.w(p);
    if (wt > 0) opts.push([k, wt]);
  }
  const id = weighted(opts);
  if (!id) return;
  const d = EVENTS[id].prep ? EVENTS[id].prep(p) : {};
  if (d) queueEvent(id, d);
}

/* Ay sonu: entrika dünyası (gelir/maaş ve savaşlar world.js'te) */
function monthTick() {
  if (G.over) return;
  const all = living();
  for (const c of shuffle(all.slice())) if (c.alive && c.id !== G.playerId && chance(0.12)) npcAct(c);
  prisonsTick();
  secretsTick();
  grantTick();
  birthsTick();
  for (const c of living()) healthTick(c);
  fillVacant();
  decayTick();
  populationTick();
  G.ap = AP_MAX;
  G.monthsPlayed++;
  if (!G.over) randomEventTick();
}

/* ---------- Yeni oyun ---------- */
/* ---------- Kayıt ---------- */
function saveGame() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) { /* kayıt yapılamadı */ }
}
function loadGame() {
  try {
    const s = localStorage.getItem(SAVE_KEY);
    if (!s) return false;
    G = JSON.parse(s);
    return !!(G && G.chars && G.playerId);
  } catch (e) { return false; }
}
function deleteSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* yok say */ } }
