'use strict';
/* =========================================================
   TAÇ VE HANÇER — Oyun motoru
   Dünya, karakterler, ilişkiler, sırlar, savaşlar, aylık döngü
   ========================================================= */

let G = null;
const SAVE_KEY = 'tac-ve-hancer-v1';
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
function stressNote(s) { return s > 0 ? ` (Stres +${s})` : s < 0 ? ` (Stres ${s})` : ''; }

/* ---------- İsimler ---------- */
function rankName(c) {
  if (c.age < 16) return c.female ? 'Kız çocuk' : 'Erkek çocuk';
  return (c.female ? RANKS_F : RANKS_M)[c.rank];
}
function nm(c) {
  if (!c) return 'Bilinmeyen biri';
  let pre = '';
  if (c.age >= 16) {
    if (c.rank === 2) pre = c.female ? 'Dame ' : 'Sör ';
    else if (c.rank >= 3) pre = (c.female ? RANKS_F : RANKS_M)[c.rank] + ' ';
  }
  return `${pre}${c.name} ${c.dyn}`;
}
function titleOf(c) { const pt = primaryTitle(c); return pt ? pt.name : rankName(c); }
function dateStr() { return `${MONTHS[G.month]} ${G.year}`; }
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
  const c = {
    id: G.nextId++,
    name: o.name || pick(female ? NAMES_F : NAMES_M),
    dyn: o.dyn || pick(DYNASTIES),
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
function addTitle(name, rank, liege) {
  const t = { id: 't' + (G.nextTitle++), name, rank, holder: null, liege: liege || null };
  G.titles[t.id] = t;
  return t;
}
function primaryTitle(c) {
  let best = null;
  for (const id of c.titles) { const t = G.titles[id]; if (!best || t.rank > best.rank) best = t; }
  return best;
}
function spareTitles(c) {
  const pt = primaryTitle(c);
  return c.titles.map(id => G.titles[id]).filter(t => t !== pt).sort((a, b) => a.rank - b.rank);
}
function recalcRank(c) {
  const pt = primaryTitle(c);
  c.rank = pt ? pt.rank : c.baseRank;
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
  if (a.spouseId === b.id) return 'Eş';
  if (a.fatherId === b.id || a.realFatherId === b.id) return 'Baba';
  if (a.motherId === b.id) return 'Anne';
  if (b.fatherId === a.id || b.motherId === a.id || b.realFatherId === a.id) return 'Çocuk';
  if ((a.fatherId && a.fatherId === b.fatherId) || (a.motherId && a.motherId === b.motherId)) return 'Kardeş';
  return null;
}
function closeKin(a, b) { const r = familyRel(a, b); return r && r !== 'Eş'; }
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
  if (base) parts.push(['Geçmiş ilişkiler', base]);
  let comp = 0;
  for (const t of a.traits) {
    const T = TRAITS[t];
    if (!T.kisilik) continue;
    if (has(b, t)) comp += 8;
    if (T.zit && has(b, T.zit)) comp -= 12;
  }
  comp = clamp(comp, -30, 30);
  if (comp) parts.push(['Kişilik uyumu', comp]);
  if (has(b, 'guzel')) parts.push(['Güzelliği', 10]);
  if (has(b, 'cirkin')) parts.push(['Çirkinliği', -5]);
  const rel = familyRel(a, b);
  if (rel === 'Eş') parts.push(['Eşi', 20]);
  else if (rel) parts.push([rel, 15]);
  if (a.lovers.includes(b.id)) parts.push(['Sevgilisi', 30]);
  if (a.lordId === b.id && b.prestige > 0) parts.push(['Efendisinin şanı', Math.min(20, Math.floor(b.prestige / 40))]);
  if (b.shame > 1) {
    const s = -Math.round(b.shame * (has(a, 'durust') ? 0.6 : 0.3));
    if (s) parts.push(['Rezaleti', s]);
  }
  if (b.tyranny > 1 && isUnder(a, b)) parts.push(['Zorbalığı', -Math.round(b.tyranny)]);
  if (has(b, 'akrabakatili') && a.id !== b.id) parts.push(['Akraba katili', -20]);
  if (has(a, 'paranoyak') && !rel) parts.push(['Paranoya', -10]);
  if (a.prisonerOf === b.id) parts.push(['Onu zindanda tutuyor', -30]);
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
  if (p && (knows(p, s) || relevant(a, t))) log(`📢 Skandal! ${secretText(s)}`, 'scandal');
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
  for (const w of G.wars.slice()) if (w.att === c.id || w.def === c.id) endWar(w, 'beyaz');
  refreshLieges();
  if (!wasPlayer && relevant(c)) log(`✝️ ${nm(c)} öldü — ${reason}. (${c.age} yaşında)`, 'death');
  if (wasPlayer) {
    if (heir) {
      G.playerId = heir.id;
      G.generation = (G.generation || 1) + 1;
      log(`☠️ ${c.name} ${c.dyn} öldü — ${reason}. Hanedan ${heir.name} ile devam ediyor.`, 'death');
      info('☠️ Ölüm', `<b>${c.name} ${c.dyn}</b> ${c.age} yaşında öldü.<br><i>${reason}</i><br><br>Hanedanın yaşıyor. Artık varisin <b>${nm(heir)}</b> (${heir.age} yaşında) olarak oynuyorsun.`);
    } else {
      G.over = { name: `${c.name} ${c.dyn}`, reason, age: c.age, d: dateStr() };
      log(`☠️ ${c.name} ${c.dyn} öldü — ${reason}. Geride varis kalmadı. Hanedan sona erdi.`, 'death');
    }
  }
}
function relevant(...cs) {
  const p = P();
  if (!p) return false;
  return cs.some(c => c && (c.id === p.id || familyRel(p, c) || c.id === p.lordId || c.lordId === p.id ||
    p.lovers.includes(c.id) || c.rank >= 4 || Math.abs(opinion(p, c)) >= 40));
}

/* ---------- Hapis / İdam ---------- */
function imprison(captor, c, just) {
  c.prisonerOf = captor.id;
  addOp(c, captor, -40);
  if (!just) {
    captor.tyranny += 15;
    captor.dread += 8;
  }
  for (const w of G.wars.slice()) if (w.att === c.id || w.def === c.id) endWar(w, w.att === c.id ? 'def' : 'att');
}
function execute(captor, c) {
  const just = hasKnownCrime(captor, c) || G.secrets.some(s => s.actor === c.id && s.pub && SECRETS[s.type].suc);
  for (const x of living()) if (familyRel(x, c) || x.lovers.includes(c.id)) addOp(x, captor, -80);
  captor.dread += 15;
  if (!just) captor.tyranny += 20;
  die(c, `${nm(captor)} tarafından idam edildi`);
  return just;
}

/* ---------- Ekonomi / Ordu ---------- */
function income(c) {
  if (c.age < 16 || c.prisonerOf) return 0;
  const y = stat(c, 'yon');
  return [1, 2, 4, 6 + Math.floor(y / 2), 15 + y, 30 + y * 2][c.rank];
}
function ownMen(c) {
  if (!free(c) || c.age < 16) return 0;
  return LEVY[c.rank] + (c.rank >= 3 ? stat(c, 'yon') * 5 : 0);
}
function armyOf(c, enemyId, depth = 0) {
  if (!free(c) || depth > 6) return 0;
  let men = ownMen(c);
  for (const v of living()) {
    if (v.lordId !== c.id || v.id === enemyId || v.prisonerOf) continue;
    const o = opinion(v, c) + c.dread / 3;
    if (o >= -15) men += armyOf(v, enemyId, depth + 1);
  }
  return men;
}
function atWar(c) { return G.wars.some(w => w.att === c.id || w.def === c.id); }
function warOf(c) { return G.wars.find(w => w.att === c.id || w.def === c.id) || null; }

/* ---------- Savaş ---------- */
function startWar(att, def, goal) {
  const pt = primaryTitle(def);
  const w = { id: G.nextWar++, att: att.id, def: def.id, goal, titleId: pt ? pt.id : null, score: 0, merc: {}, months: 0 };
  G.wars.push(w);
  const label = goal === 'bagimsizlik' ? 'bağımsızlık' : `${pt ? pt.name : 'unvan'} için`;
  if (relevant(att, def)) log(`⚔️ ${nm(att)}, ${nm(def)} hükümdarına ${label} savaş açtı!`, 'war');
  if (def.id === G.playerId) info('⚔️ Savaş!', `<b>${nm(att)}</b> sana ${label} savaş ilan etti!<br>Ordusu: ~${armyOf(att, def.id)} asker. Senin ordun: ~${armyOf(def, att.id)} asker.<br><br>Paralı asker tutarak savunmanı güçlendirebilirsin.`);
  return w;
}
function warPower(w, side) {
  const c = ch(side === 'att' ? w.att : w.def);
  const other = side === 'att' ? w.def : w.att;
  const men = armyOf(c, other) + (w.merc[c.id] || 0);
  return { men, power: men * (1 + stat(c, 'sav') / 20) };
}
function warTick(w) {
  const a = ch(w.att), d = ch(w.def);
  if (!a || !d || !a.alive || !d.alive) { endWar(w, 'beyaz'); return; }
  const pa = warPower(w, 'att').power * rnd(70, 130) / 100;
  const pd = warPower(w, 'def').power * rnd(70, 130) / 100 * 1.1;
  const delta = Math.round(((pa - pd) / (pa + pd + 1)) * 50);
  w.score = clamp(w.score + delta, -100, 100);
  w.months++;
  for (const k in w.merc) w.merc[k] = Math.floor(w.merc[k] * 0.9);
  const p = P();
  if (w.att === p.id || w.def === p.id) {
    const weWon = (w.att === p.id) === (delta > 0);
    log(`⚔️ Muharebe: ${weWon ? 'Senin ordun galip geldi' : 'Ordun bozguna uğradı'}. Savaş skoru: ${w.att === p.id ? w.score : -w.score}`, weWon ? 'good' : 'bad');
    if (chance(0.06)) {
      p.health -= rnd(15, 35);
      addTrait(p, 'yarali');
      log('🩸 Savaşta ağır yaralandın!', 'bad');
      if (p.health <= 0) { die(p, 'Savaş meydanında aldığı yaralar'); return; }
    }
  } else if (chance(0.02)) {
    const victim = chance(0.5) ? a : d;
    if (victim.id !== G.playerId) { die(victim, 'Savaş meydanında düştü'); return; }
  }
  if (w.score >= 100) endWar(w, 'att');
  else if (w.score <= -100) endWar(w, 'def');
  else if (w.months >= 24) endWar(w, 'beyaz');
}
function endWar(w, winner) {
  if (!G.wars.includes(w)) return;
  G.wars = G.wars.filter(x => x !== w);
  const a = ch(w.att), d = ch(w.def), p = P();
  let msg = '';
  if (winner === 'att' && a && a.alive) {
    if (w.goal === 'gasp') {
      const t = G.titles[w.titleId];
      if (t && d && t.holder === d.id) giveTitle(t, a);
      a.prestige += 100;
      msg = `${nm(a)} savaşı kazandı ve ${t ? t.name : 'unvanı'} ele geçirdi!`;
      if (d && d.alive && chance(0.5)) { imprison(a, d, true); msg += ` ${d.name} zindana atıldı.`; }
    } else {
      const pt = primaryTitle(a);
      if (pt) {
        if (pt.rank < 5) {
          const nt = addTitle(`${a.dyn} ${pt.rank === 4 ? 'Krallığı' : 'Dükalığı'}`, pt.rank + 1, null);
          pt.liege = nt.id;
          giveTitle(nt, a);
        } else pt.liege = null;
      }
      refreshLieges();
      a.prestige += 150;
      msg = `${nm(a)} bağımsızlığını kazandı ve ${titleOf(a)} kuruldu!`;
    }
  } else if (winner === 'def' && a && d) {
    const pay = Math.floor(a.gold / 2);
    a.gold -= pay; d.gold += pay;
    a.prestige -= 50; d.prestige += 50;
    msg = `${nm(d)} savaşı kazandı. ${nm(a)} ${pay} altın tazminat ödedi.`;
    if (a.alive && d.alive && chance(0.4)) { imprison(d, a, true); msg += ` ${a.name} zindana atıldı.`; }
  } else {
    msg = `${a ? nm(a) : '?'} ile ${d ? nm(d) : '?'} arasındaki savaş sonuçsuz bitti.`;
  }
  refreshLieges();
  if (p && (w.att === p.id || w.def === p.id)) { log(`🏳️ ${msg}`, 'war'); if (p.alive) info('🏳️ Savaş bitti', msg); }
  else if (relevant(a, d)) log(`🏳️ ${msg}`, 'war');
}

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
    die(b, pick(['Zehirlendi', 'Yatağında boğazı kesilmiş bulundu', 'Merdivenden "düştü"', 'Gizemli bir hastalık']));
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
  if (r < 0.2) { res = 'öldü'; }
  else if (r < 0.55) { res = 'ağır yaralandı'; lose.health -= 30; addTrait(lose, 'yarali'); }
  else res = 'yenilip teslim oldu';
  if (res === 'öldü') die(lose, `${win.name} ${win.dyn} ile düelloda öldü`);
  else if (lose.health <= 0) { res = 'aldığı yaralarla öldü'; die(lose, 'Düello yaraları'); }
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
    age: 0, traits: inheritTraits(mother, father), gold: 0,
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
    let m = `👶 ${mother.name} bir ${kid.female ? 'kız' : 'erkek'} çocuk doğurdu: <b>${kid.name}</b>.`;
    if (father.id === p.id && legit && legit.id !== p.id) m += ' (Gerçek babası sensin, ama bunu sadece ikiniz biliyorsunuz.)';
    if (kid.bastard) m += ' (Gayrimeşru)';
    log(m, 'good');
  } else if (relevant(mother)) log(`👶 ${nm(mother)} bir çocuk doğurdu: ${kid.name}.`, 'info');
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
      if (t) { addOp(t, c, rnd(3, 8)); addOp(c, t, 3); if (t === p) log(`💬 ${nm(c)} seninle uzun uzun sohbet etti.`, 'social'); }
      break;
    case 'hediye':
      if (c.gold < 25) break;
      t = choose(near, x => opinion(c, x) + (x.id === c.lordId ? 30 : 0));
      if (t) { c.gold -= 10; t.gold += 10; addOp(t, c, 10); if (t === p) log(`🎁 ${nm(c)} sana 10 altınlık bir hediye gönderdi.`, 'good'); }
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
        if (relevant(c, t)) log(`💍 ${nm(c)} ile ${nm(t)} evlendi.`, 'info');
      }
      break;
    }
    case 'iftira':
      t = choose(near.filter(x => opinion(c, x) < -30), x => -opinion(c, x));
      if (!t) break;
      {
        const r = slander(c, t);
        if (t === p) {
          if (r.ok) log('🗣️ Hakkında çirkin dedikodular yayılıyor... (Rezalet +15)', 'bad');
          else if (r.caught) log(`🗣️ ${nm(c)} hakkında iftira atmaya çalıştı ama yalanı ortaya çıktı.`, 'social');
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
        if (relevant(c, t)) log(`🤺 ${nm(c)} ile ${nm(t)} düello etti: ${r.lose.name} ${r.res}.`, 'info');
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
        info('⛓️ Zindan', `${nm(c)} muhafızlarını gönderdi ve seni zindana attırdı! ${just ? 'Suçlarını biliyor.' : 'Hiçbir gerekçe göstermeden.'}<br><br>Kaçmayı deneyebilir, gardiyana rüşvet verebilir ya da kaderini bekleyebilirsin.`);
      } else {
        imprison(c, t, hasKnownCrime(c, t));
        if (relevant(c, t)) log(`⛓️ ${nm(c)}, ${nm(t)} adlı kişiyi zindana attırdı.`, 'info');
      }
      break;
    }
    case 'yardim':
      t = choose(near.filter(x => x.gold < 10), x => -x.gold);
      if (t && c.gold >= 10) { c.gold -= 5; t.gold += 5; addOp(t, c, 12); if (t === p) log(`🤲 ${nm(c)} sana 5 altın yardım etti.`, 'good'); }
      break;
    case 'sovalyelik': {
      const cands = living().filter(x => x.lordId === c.id && !x.titles.length && x.baseRank === 1 && free(x) && opinion(c, x) > 20);
      if (!cands.length) break;
      t = pick(cands);
      t.baseRank = 2; recalcRank(t); t.prestige += 30; addOp(t, c, 20);
      if (t === p) info('⚔️ Şövalyelik', `${nm(c)} seni huzuruna çağırdı ve kılıcıyla omuzlarına dokundu.<br><br>Artık bir <b>şövalyesin</b>!`);
      break;
    }
  }
}
function playerAssassinAttempt(c) {
  const p = P();
  c.gold -= 30;
  if (chance(murderChance(c, p) * 0.5 / 100)) {
    addSecret('cinayet', c.id, p.id, [c.id]);
    die(p, 'Zehirlendi (katili bilinmiyor)');
    return;
  }
  if (chance(0.5)) {
    addSecret('suikastGirisimi', c.id, p.id, [c.id, p.id]);
    addOp(p, c, -100);
    stress(p, 15);
    info('🗡️ Suikast girişimi!', `Şarabının tadı tuhaftı... Tadına bakan hizmetkârın kıvranarak öldü.<br><br>Yakalanan zehirci her şeyi itiraf etti: onu <b>${nm(c)}</b> göndermiş!<br><br>Artık bunu biliyorsun.`);
  } else log('🗡️ Bir hizmetkârın şüpheli bir şekilde kayboldu... Biri canına mı kastediyor?', 'bad');
}

/* ---------- Aylık işleyiş ---------- */
function npcWars() {
  for (const c of living()) {
    if (c.id === G.playerId || !free(c) || c.rank < 3 || c.lordId == null || atWar(c)) continue;
    const l = ch(c.lordId);
    if (!free(l) || atWar(l)) continue;
    const o = opinion(c, l);
    if (o > -40 || !(has(c, 'hirsli') || has(c, 'kibirli')) || l.dread > 40) continue;
    if (!chance(0.03)) continue;
    const pa = armyOf(c, l.id), pd = armyOf(l, c.id);
    if (pa < pd * 0.7) continue;
    const goal = c.rank === l.rank - 1 && has(c, 'hirsli') ? 'gasp' : 'bagimsizlik';
    startWar(c, l, goal);
  }
}
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
      if (opinion(cap, x) > 0 && chance(0.1)) { x.prisonerOf = null; info('🔓 Özgürlük', `${nm(cap)} seni affetti ve serbest bıraktı.`); continue; }
      if (chance(0.15) && !G.queue.some(q => q.id === 'fidye')) queueEvent('fidye', { from: cap.id, amt: Math.max(15, 20 + x.rank * 30) });
    } else {
      if (chance(has(cap, 'zalim') ? 0.06 : 0.012)) {
        execute(cap, x);
        if (relevant(x)) log(`🪓 ${nm(x)}, ${nm(cap)} tarafından idam edildi.`, 'death');
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
      if (a.id === p.id) info('⛓️ Zindan', `Efendin ${nm(l)} suçunu öğrendi: <i>${secretText(s)}</i><br><br>Muhafızlar seni zincirlere vurdu.`);
      else if (relevant(a)) log(`⛓️ ${nm(a)} suçları yüzünden zindana atıldı.`, 'info');
    }
  }
  // Oyuncunun suçları açığa çıkınca efendisi de tepki verebilir
  for (const s of G.secrets) {
    if (!s.pub || s.actor !== p.id || !SECRETS[s.type].suc || !free(p)) continue;
    const l = ch(p.lordId);
    if (l && free(l) && chance(0.04 * (has(l, 'durust') ? 2 : 1))) {
      imprison(l, p, true);
      info('⛓️ Zindan', `Suçların herkesin dilinde. Efendin ${nm(l)} seni zindana attırdı.`);
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
        (x.lordId === c.id || (familyRel(c, x) === 'Çocuk' && !x.bastard)));
      if (!cands.length) continue;
      let best = null, bs = -1e9;
      for (const x of cands) {
        const s = opinion(c, x) + x.prestige / 10 + (familyRel(c, x) ? 40 : 0) + x.rank * 10 + Math.random() * 20;
        if (s > bs) { bs = s; best = x; }
      }
      giveTitle(t, best);
      addOp(best, c, 40);
      best.prestige += 50;
      if (best.id === G.playerId) info('🏰 Unvan!', `${nm(c)} sana <b>${t.name}</b> unvanını bağışladı!<br><br>Artık topraklarının efendisisin.`);
      else if (relevant(c, best)) log(`🏰 ${nm(c)}, ${t.name} unvanını ${nm(best)} adlı kişiye verdi.`, 'info');
      break;
    }
  }
}
function fillVacant() {
  for (const t of Object.values(G.titles)) {
    if (t.holder != null && ch(t.holder) && ch(t.holder).alive) continue;
    const lt = t.liege ? G.titles[t.liege] : null;
    const lh = lt && lt.holder != null ? ch(lt.holder) : null;
    if (lh && lh.alive) { giveTitle(t, lh); continue; }
    const vassals = Object.values(G.titles).filter(x => x.liege === t.id && x.holder != null).map(x => ch(x.holder)).filter(x => x && x.alive);
    const pool = vassals.length ? vassals : living().filter(x => isAdult(x) && x.rank >= 2);
    if (!pool.length) continue;
    pool.sort((a, b) => b.prestige - a.prestige);
    giveTitle(t, pool[0]);
    if (relevant(pool[0])) log(`👑 ${t.name} boş kaldı ve ${nm(pool[0])} tarafından alındı.`, 'info');
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
  if (c.health <= 0) die(c, 'Sağlığı tükendi');
  else if (chance(pd)) die(c, c.age < 5 ? 'Çocuk hastalığı' : c.age > 55 ? 'Yaşlılık' : pick(['Ateşli bir hastalık', 'Veba', 'Kalp krizi', 'Kötü bir yara enfeksiyonu']));
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
  if (all.length > 170) {
    const p = P();
    const movers = all.filter(c => c.id !== p.id && isAdult(c) && c.rank <= 1 && !c.titles.length && !c.prisonerOf &&
      !relevant(c) && !all.some(x => x.lordId === c.id));
    for (const c of shuffle(movers).slice(0, Math.min(4, all.length - 170))) die(c, 'Diyardan göç etti');
  }
  pruneTick();
  const adults = living().filter(isAdult).length;
  if (adults >= 60) return;
  const lords = living().filter(x => x.rank >= 3);
  const n = adults < 45 ? 2 : 1;
  for (let i = 0; i < n; i++) {
    const r = weighted([[0, 4], [1, 3], [2, 2]]);
    const lord = lords.length ? pick(lords) : null;
    makeChar({ rank: r, age: rnd(16, 35), gold: rnd(2, 15) + r * 10, prestige: r * 20, lordId: lord ? lord.id : null });
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

function endMonth() {
  if (G.over) return;
  const all = living();
  for (const c of all) c.gold += income(c);
  for (const c of shuffle(all.slice())) if (c.alive && c.id !== G.playerId && chance(0.14)) npcAct(c);
  for (const w of G.wars.slice()) if (G.wars.includes(w)) warTick(w);
  npcWars();
  prisonsTick();
  secretsTick();
  grantTick();
  birthsTick();
  for (const c of living()) healthTick(c);
  fillVacant();
  decayTick();
  populationTick();
  G.month++;
  if (G.month >= 12) { G.month = 0; G.year++; for (const c of living()) c.age++; }
  G.ap = AP_MAX;
  G.monthsPlayed++;
  if (!G.over) randomEventTick();
  saveGame();
}

/* ---------- Yeni oyun ---------- */
function newWorld(opt) {
  G = {
    year: 1180, month: 2, chars: {}, titles: {}, secrets: [], wars: [], log: [], queue: [],
    nextId: 1, nextTitle: 1, nextSecret: 1, nextWar: 1, playerId: null, ap: AP_MAX,
    over: null, monthsPlayed: 0, generation: 1, founder: `${opt.name} ${opt.dyn}`,
  };
  const knights = (lord, n) => {
    for (let i = 0; i < n; i++) {
      const k = makeChar({ rank: 2, age: rnd(18, 45), gold: rnd(15, 35), prestige: rnd(20, 70), lordId: lord.id });
      if (chance(0.4)) family(k, 2);
    }
  };
  const family = (head, kidsMax) => {
    if (chance(0.75) && head.age >= 18) {
      const sp = makeChar({ female: !head.female, age: clamp(head.age + rnd(-8, 4), 17, 75), rank: Math.min(2, Math.max(0, head.rank - 1)), gold: 5, lordId: head.titles.length ? head.id : head.lordId });
      marry(head, sp);
      const youngest = Math.min(head.age, sp.age);
      const n = rnd(0, kidsMax);
      for (let i = 0; i < n && youngest > 18; i++) {
        const mother = head.female ? head : sp, father = head.female ? sp : head;
        const kid = makeChar({ age: rnd(0, Math.min(youngest - 17, 30)), dyn: head.dyn, gold: 0, traits: inheritTraits(mother, father), rank: head.rank >= 2 ? 2 : 0, lordId: head.titles.length ? head.id : head.lordId });
        kid.fatherId = father.id; kid.motherId = mother.id;
        father.children.push(kid.id); mother.children.push(kid.id);
      }
    }
  };
  const ruler = (rank, title, skip) => {
    if (skip) return null;
    const c = makeChar({ rank, age: rnd(28, 60), gold: [0, 0, 0, 60, 150, 300][rank], prestige: rank * 60 + rnd(0, 80) });
    giveTitle(title, c);
    family(c, 3);
    return c;
  };
  const K = addTitle(PLACES.krallik, 5, null);
  const king = ruler(5, K);
  knights(king, 3);
  let homeBarony = null, homeLord = null;
  PLACES.dukaliklar.forEach(([dn, bns], di) => {
    const D = addTitle(dn, 4, K.id);
    const duke = ruler(4, D);
    knights(duke, 2);
    bns.forEach((bn, bi) => {
      const B = addTitle(bn, 3, D.id);
      const isHome = di === 0 && bi === 0;
      const baron = ruler(3, B, isHome && opt.start === 'lord');
      if (isHome) { homeBarony = B; homeLord = baron; }
      if (!baron) return;
      knights(baron, 2);
      makeChar({ rank: 1, age: rnd(17, 35), gold: rnd(3, 10), lordId: baron.id });
      for (let i = 0; i < 2; i++) makeChar({ rank: 0, age: rnd(16, 50), gold: rnd(1, 6), lordId: baron.id });
    });
  });

  const startCfg = {
    koylu: { rank: 0, age: 18, gold: 10, prestige: 0 },
    sovalye: { rank: 2, age: 22, gold: 40, prestige: 60 },
    lord: { rank: 3, age: 25, gold: 100, prestige: 150 },
  }[opt.start];
  const p = makeChar({ name: opt.name, dyn: opt.dyn, female: opt.female, age: startCfg.age, rank: startCfg.rank, gold: startCfg.gold, prestige: startCfg.prestige, traits: opt.traits.slice(), base: { ...opt.base } });
  G.playerId = p.id;
  if (opt.start === 'lord') {
    giveTitle(homeBarony, p);
    knights(p, 2);
    makeChar({ rank: 1, age: rnd(17, 35), gold: rnd(3, 10), lordId: p.id });
    for (let i = 0; i < 2; i++) makeChar({ rank: 0, age: rnd(16, 50), gold: rnd(1, 6), lordId: p.id });
  } else {
    p.lordId = homeLord.id;
  }
  refreshLieges();
  // Başlangıç ilişkileri ve birkaç sır
  for (const c of living()) {
    if (chance(0.15) && isAdult(c)) {
      const others = nearby(c).filter(x => x.id !== p.id && !closeKin(c, x));
      if (others.length) {
        const o = pick(others);
        if (chance(0.5) && o.female !== c.female) becomeLovers(c, o);
        else addOp(c, o, rnd(-60, 60));
      }
    }
  }
  const startText = {
    koylu: `${PLACES.krallik}'nın ${homeBarony.name.replace(' Baronluğu', '')} topraklarında, çamurlu bir köyde doğdun. Adın yok, şanın yok, sadece hırsın var.`,
    sovalye: `${nm(homeLord)} hizmetinde yemin etmiş genç bir şövalyesin. Kılıcın keskin, kesen boş.`,
    lord: `Babandan kalan ${homeBarony.name}'nun yeni efendisisin. Vasalların seni tartıyor, düşmanların seni izliyor.`,
  }[opt.start];
  log(`📜 Hikâye başlıyor. ${startText}`, 'info');
  info('📜 Taç ve Hançer', `${startText}<br><br>Her ay <b>${AP_MAX} eylem hakkın</b> var. <b>Kişiler</b> sekmesinden insanlarla etkileşime gir, <b>Eylemler</b> sekmesinden kendi işlerini yap, sonra <b>Ayı Bitir</b>.<br><br>Ölürsen varisinle devam edersin. Varisin yoksa hanedanın biter.`);
  saveGame();
}

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
