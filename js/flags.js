'use strict';
/* =========================================================
   Crown & Dagger — Bayraklar ve armalar
   Her krallığın 1180 civarında kullandığı (ya da onunla özdeşleşen)
   gerçek sancak/arma motifleri. Hepsi 60x40'lık SVG olarak çizilir;
   arayüzde <svg>, haritada (canvas) resim olarak kullanılır.
   ========================================================= */

const TINCT = {
  gules: '#b8141f', azure: '#1d3f94', or: '#f2c230', argent: '#f4f1e6', sable: '#16130f', vert: '#1f6b3a',
  purpure: '#5e2a7e', crimson: '#9b1b30', navy: '#162f6b', teal: '#0f4c5c', ochre: '#e3a82b',
};

/* ---------- Figürler (60x40 alanında) ---------- */
function _icon(name, cx, cy, size, fill, rot) {
  const d = ICONS[name];
  if (!d) return '';
  const s = size / 512;
  return `<path fill="${fill}" d="${d}" transform="translate(${cx} ${cy})${rot ? ` rotate(${rot})` : ''} translate(${-size / 2} ${-size / 2}) scale(${s})"/>`;
}
/* Yürüyen aslan (passant guardant), sola bakar. Kutusu 100x50; (x,y) sol üst köşe */
function _lionPassant(x, y, sc, fill, eye) {
  return `<g transform="translate(${x} ${y}) scale(${sc})" fill="${fill}" stroke="${fill}" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="52" cy="25" rx="25" ry="8.5"/><ellipse cx="31" cy="23" rx="10" ry="11"/>
    <path d="M10 7 L14 2 L18 5 L22 1 L25 6 L30 4 L29 10 L33 13 L28 16 L30 21 L24 21 L22 26 L17 22 L12 25 L12 19 L6 18 L10 14 L5 10 Z"/>
    <path fill="none" stroke-width="5.5" d="M27 31 L20 38 L13 35 M35 32 L36 45 L31 46 M67 30 L71 45 L66 46 M74 28 L82 41 L78 44"/>
    <path fill="none" stroke-width="3.6" d="M76 22 C90 20 84 8 93 5"/><circle cx="94" cy="5" r="4"/>
    <circle cx="16" cy="12" r="1.6" fill="${eye}" stroke="none"/><circle cx="22" cy="12" r="1.6" fill="${eye}" stroke="none"/>
    <path fill="${eye}" stroke="none" d="M17 17 L21 17 L19 20 Z"/></g>`;
}
/* Şaha kalkmış aslan (rampant), sola bakar. Kutusu 60x80 */
function _lionRampant(x, y, sc, fill, eye, crown) {
  return `<g transform="translate(${x} ${y}) scale(${sc})" fill="${fill}" stroke="${fill}" stroke-linecap="round" stroke-linejoin="round">
    <ellipse cx="33" cy="44" rx="9.5" ry="18" transform="rotate(-18 33 44)"/>
    <path d="M14 14 L17 8 L21 11 L25 6 L28 12 L34 11 L32 17 L36 21 L30 23 L31 29 L25 27 L21 31 L18 25 L12 26 L14 21 L9 18 Z"/>
    <path fill="none" stroke-width="5.5" d="M26 32 L15 27 L9 20 M28 39 L16 41 L10 36 M38 57 L34 70 L27 72 M40 55 L48 66 L45 75"/>
    <path fill="none" stroke-width="3.6" d="M42 52 C58 48 48 28 57 20"/><circle cx="57" cy="19" r="4"/>
    <circle cx="19" cy="17" r="1.7" fill="${eye}" stroke="none"/><path fill="${eye}" stroke="none" d="M12 21 L16 20 L14 24 Z"/>
    ${crown ? `<path fill="${crown}" stroke="none" d="M15 9 L16 3 L19 6 L22 1 L25 6 L28 3 L29 9 Z"/>` : ''}</g>`;
}
/* Kanatları açık kartal. Kutusu 100x100; double: çift başlı */
function _eagle(x, y, sc, fill, eye, double, crown) {
  const wing = 'M44 40 L8 20 L5 31 L12 33 L5 41 L13 43 L7 51 L17 52 L13 60 L25 58 L27 64 L40 56 Z';
  const head = double
    ? `<path d="M46 40 L42 30 L36 24 L38 18 L44 18 L48 26 L50 34 L52 26 L56 18 L62 18 L64 24 L58 30 L54 40 Z"/><path d="M38 19 L31 22 L37 24 Z M62 19 L69 22 L63 24 Z"/>
       <circle cx="41" cy="20.5" r="1.4" fill="${eye}"/><circle cx="59" cy="20.5" r="1.4" fill="${eye}"/>`
    : `<path d="M45 40 L44 28 L46 20 L52 18 L56 22 L55 30 L55 40 Z"/><path d="M47 20 L40 23 L46 25 Z"/><circle cx="49.5" cy="21.5" r="1.5" fill="${eye}"/>`;
  return `<g transform="translate(${x} ${y}) scale(${sc})" fill="${fill}">
    <path d="${wing}"/><path d="${wing}" transform="translate(100 0) scale(-1 1)"/>${head}
    <ellipse cx="50" cy="52" rx="9" ry="16"/><path d="M43 63 L57 63 L64 84 L56 79 L50 86 L44 79 L36 84 Z"/>
    <path d="M44 63 L34 74 L30 72 M40 70 L36 78 M56 63 L66 74 L70 72 M60 70 L64 78" fill="none" stroke="${fill}" stroke-width="3.2" stroke-linecap="round"/>
    ${crown ? (double ? `<path fill="${crown}" d="M43 15 L42 9 L46 12 L50 7 L54 12 L58 9 L57 15 Z"/>` : `<path fill="${crown}" d="M45 18 L44 12 L48 15 L51 10 L53 15 L57 12 L56 18 Z"/>`) : ''}</g>`;
}
function _cross(cx, cy, len, w, fill) { return `<rect x="${cx - w / 2}" y="${cy - len / 2}" width="${w}" height="${len}" fill="${fill}"/><rect x="${cx - len / 2}" y="${cy - w / 2}" width="${len}" height="${w}" fill="${fill}"/>`; }
function _stripes(n, cols, vertical) {
  let o = '';
  for (let i = 0; i < n; i++) o += vertical ? `<rect x="${(60 / n) * i}" y="0" width="${60 / n + 0.05}" height="40" fill="${cols[i % cols.length]}"/>` : `<rect x="0" y="${(40 / n) * i}" width="60" height="${40 / n + 0.05}" fill="${cols[i % cols.length]}"/>`;
  return o;
}
function _checks(x, y, size, n, a, b) {
  let o = `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="${a}"/>`;
  const c = size / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((i + j) % 2) o += `<rect x="${x + i * c}" y="${y + j * c}" width="${c}" height="${c}" fill="${b}"/>`;
  return o;
}

/* ---------- Krallıkların sancakları ---------- */
const FLAG_ART = {
  // Plantagenet: kırmızı üzerinde üç altın aslan
  ingiltere: () => `<rect width="60" height="40" fill="${TINCT.gules}"/>${[0.8, 13.6, 26.4].map(y => _lionPassant(16.5, y, 0.27, TINCT.or, TINCT.gules)).join('')}`,
  // Capet: mavi üzerine serpiştirilmiş altın zambaklar (semé de lis)
  fransa: () => `<rect width="60" height="40" fill="${TINCT.azure}"/>${[[9, 8], [30, 8], [51, 8], [19.5, 20], [40.5, 20], [9, 32], [30, 32], [51, 32]].map(([x, y]) => _icon('fleur-de-lys', x, y, 10.5, TINCT.or)).join('')}`,
  // Hohenstaufen: altın üzerinde siyah kartal
  hre: () => `<rect width="60" height="40" fill="${TINCT.or}"/>${_eagle(13, 1.5, 0.37, TINCT.sable, TINCT.or, false)}`,
  // Kastilya: kırmızı üzerinde altın kale
  kastilya: () => `<rect width="60" height="40" fill="${TINCT.gules}"/>${_icon('castle', 30, 20, 27, TINCT.or)}`,
  // Barselona/Aragon: altın üzerinde dört kırmızı direk (Senyera)
  aragon: () => _stripes(9, [TINCT.or, TINCT.gules], true),
  // Portekiz: beyaz üzerinde beş mavi kalkan (quinas)
  portekiz: () => `<rect width="60" height="40" fill="${TINCT.argent}"/>${[[30, 20], [30, 7.5], [30, 32.5], [17.5, 20], [42.5, 20]].map(([x, y]) => _icon('shield', x, y, 12.5, TINCT.azure)).join('')}`,
  // Hauteville: mavi üzerinde kırmızı-beyaz damalı bant
  sicilya: () => {
    let band = '';
    for (let i = 0; i < 14; i++) for (let j = 0; j < 2; j++) band += `<rect x="${-12 + i * 6}" y="${15 + j * 5}" width="6.05" height="5.05" fill="${(i + j) % 2 ? TINCT.argent : TINCT.gules}"/>`;
    return `<rect width="60" height="40" fill="${TINCT.azure}"/><g transform="rotate(33.7 30 20)">${band}</g>`;
  },
  // Venedik: kızıl üzerinde altın kanatlı San Marco aslanı
  venedik: () => `<rect width="60" height="40" fill="${TINCT.crimson}"/><path fill="${TINCT.or}" d="M33 18 L38 4 L42 10 L46 3 L48 11 L53 6 L52 15 L46 20 Z"/>${_lionPassant(12, 12, 0.34, TINCT.or, TINCT.crimson)}<rect x="10" y="30" width="7" height="6" fill="${TINCT.argent}" stroke="${TINCT.or}" stroke-width=".6"/>`,
  // Árpád: kırmızı-beyaz yatay çubuklar
  macar: () => _stripes(8, [TINCT.gules, TINCT.argent], false),
  // Kudüs: beyaz üzerinde altın Kudüs haçı
  kudus: () => {
    const big = (cx, cy, L, w, t) => _cross(cx, cy, L, w, TINCT.or) + `<rect x="${cx - t / 2}" y="${cy - L / 2}" width="${t}" height="${w * 0.9}" fill="${TINCT.or}"/><rect x="${cx - t / 2}" y="${cy + L / 2 - w * 0.9}" width="${t}" height="${w * 0.9}" fill="${TINCT.or}"/><rect x="${cx - L / 2}" y="${cy - t / 2}" width="${w * 0.9}" height="${t}" fill="${TINCT.or}"/><rect x="${cx + L / 2 - w * 0.9}" y="${cy - t / 2}" width="${w * 0.9}" height="${t}" fill="${TINCT.or}"/>`;
    return `<rect width="60" height="40" fill="${TINCT.argent}"/>${big(30, 20, 30, 4.2, 12)}${[[18, 9], [42, 9], [18, 31], [42, 31]].map(([x, y]) => _cross(x, y, 7, 2, TINCT.or)).join('')}`;
  },
  // Piast: kırmızı üzerinde taçlı beyaz kartal
  leh: () => `<rect width="60" height="40" fill="${TINCT.gules}"/>${_eagle(13, 1.5, 0.37, TINCT.argent, TINCT.gules, false, TINCT.or)}`,
  // Rurikoğulları: kırmızı üzerinde altın trizub
  rus: () => `<rect width="60" height="40" fill="${TINCT.gules}"/>${_icon('trident', 30, 21, 30, TINCT.or, -135)}`,
  // Asenler: kırmızı üzerinde taçlı altın aslan
  bulgar: () => `<rect width="60" height="40" fill="#8e1420"/>${_lionRampant(18, 1, 0.47, TINCT.or, '#8e1420', TINCT.or)}`,
  // Dannebrog: kırmızı üzerinde beyaz İskandinav haçı
  danimarka: () => `<rect width="60" height="40" fill="#c8102e"/><rect x="17" width="6" height="40" fill="#fff"/><rect y="17" width="60" height="6" fill="#fff"/>`,
  // Norveç: kırmızı üzerinde baltalı altın aslan
  norvec: () => `<rect width="60" height="40" fill="${TINCT.gules}"/>${_icon('battle-axe', 21, 22, 15, TINCT.argent, -10)}${_lionRampant(19, 1, 0.47, TINCT.or, TINCT.gules, TINCT.or)}`,
  // İsveç: mavi üzerinde üç altın taç
  isvec: () => `<rect width="60" height="40" fill="#11568f"/>${[[19, 12], [41, 12], [30, 28]].map(([x, y]) => _icon('crown', x, y, 18, TINCT.or)).join('')}`,
  // Bizans: kırmızı üzerinde dört "B" harfli altın haç (tetragrammatik haç)
  bizans: () => `<rect width="60" height="40" fill="#a3122a"/>${_cross(30, 20, 60, 5, TINCT.or)}<rect x="27.5" width="5" height="40" fill="${TINCT.or}"/>
    <g font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="13" fill="${TINCT.or}" text-anchor="middle">
    <text x="43" y="14">B</text><text x="43" y="35">B</text><text transform="translate(17 14) scale(-1 1)">B</text><text transform="translate(17 35) scale(-1 1)">B</text></g>`,
  // Bagrationi: beyaz üzerinde kırmızı Aziz Yorgi haçı ve dört küçük haç
  gurcu: () => `<rect width="60" height="40" fill="#fff"/><rect x="26" width="8" height="40" fill="#d0151f"/><rect y="16" width="60" height="8" fill="#d0151f"/>${[[13, 8], [47, 8], [13, 32], [47, 32]].map(([x, y]) => _cross(x, y, 7, 2.2, '#d0151f')).join('')}`,
  // Anadolu Selçukluları: lacivert üzerinde altın çift başlı kartal
  selcuklu: () => `<rect width="60" height="40" fill="${TINCT.navy}"/>${_eagle(12, 0.5, 0.38, TINCT.or, TINCT.navy, true)}`,
  // Artuklular: sarı üzerinde kırmızı Döğer damgası
  artuklu: () => `<rect width="60" height="40" fill="${TINCT.ochre}"/><g fill="none" stroke="#8c1a14" stroke-width="3.4" stroke-linecap="square">
    <path d="M30 7 L30 33 M21 12 L21 20 L39 20 L39 12 M23 33 L30 26 L37 33"/></g>`,
  // Irak Selçukluları: Kınık damgası (yay ve ok)
  irak: () => `<rect width="60" height="40" fill="${TINCT.teal}"/>${_icon('bow-arrow', 30, 20, 30, TINCT.or)}`,
  // Eyyubiler: Selahaddin'in sarı sancağı ve kartalı
  eyyubi: () => `<rect width="60" height="40" fill="#f0c02a"/>${_eagle(13, 1.5, 0.37, '#7a2410', '#f0c02a', false)}`,
  // Abbasiler: siyah sancak
  abbasi: () => `<rect width="60" height="40" fill="${TINCT.sable}"/><rect x="2" y="2" width="56" height="36" fill="none" stroke="#c9a54a" stroke-width=".8"/>
    <text x="30" y="23" font-size="7.5" fill="#efe6cf" text-anchor="middle" font-family="'Amiri', 'Noto Naskh Arabic', 'Scheherazade', serif" direction="rtl">لا إله إلا الله</text>`,
  // Muvahhidler: kırmızı üzerinde ortada siyah-beyaz dama
  muvahhid: () => `<rect width="60" height="40" fill="#b3201f"/>${_checks(21, 11, 18, 4, TINCT.sable, TINCT.argent)}`,
};

/* Sonradan kurulan krallıklar için hanedan rengine göre basit bir arma */
function _hashN(s) { let h = 7; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
function _proceduralFlag(r) {
  const h = _hashN((r.dynName || r.name || '') + r.id);
  const field = r.color || '#7a5a3a';
  const light = (h >> 3) % 2 ? TINCT.or : TINCT.argent;
  const ord = h % 6;
  const charge = ['crown', 'stone-tower', 'fleur-de-lys', 'shield', 'castle', 'laurel-crown'][(h >> 5) % 6];
  let o = `<rect width="60" height="40" fill="${field}"/>`;
  if (ord === 0) o += `<rect x="30" width="30" height="40" fill="${light}"/>`;
  else if (ord === 1) o += `<rect y="20" width="60" height="20" fill="${light}"/>`;
  else if (ord === 2) o += `<path d="M0 40 L30 14 L60 40 L60 32 L30 6 L0 32 Z" fill="${light}"/>`;
  else if (ord === 3) o += `<path d="M0 0 L8 0 L60 34 L60 40 L52 40 L0 6 Z" fill="${light}"/>`;
  else if (ord === 4) o += `<rect x="0" y="0" width="60" height="9" fill="${light}"/>`;
  else o += `<rect x="25" width="10" height="40" fill="${light}"/><rect y="15" width="60" height="10" fill="${light}"/>`;
  if (ord !== 5) o += _icon(charge, ord === 0 ? 15 : 30, ord === 1 ? 10 : ord === 4 ? 25 : 22, 16, light === TINCT.or ? TINCT.or : TINCT.argent);
  return o;
}
function flagArt(r) {
  if (!r) return `<rect width="60" height="40" fill="#5d5346"/><path d="M0 0 L60 40 M60 0 L0 40" stroke="#3a332a" stroke-width="3"/>`;
  return (r.key && FLAG_ART[r.key] ? FLAG_ART[r.key]() : _proceduralFlag(r));
}
/* Arayüz için bayrak. r: krallık nesnesi ya da {key} */
function flagHtml(r, h = 20, cls = '') {
  const w = Math.round(h * 1.5);
  return `<span class="flag ${cls}" style="width:${w}px;height:${h}px"><svg viewBox="0 0 60 40" width="${w}" height="${h}" preserveAspectRatio="none" aria-hidden="true">${flagArt(r)}</svg></span>`;
}
const flagOfKey = key => flagHtml({ key, name: key, id: key }, 20);
/* Harita için önbellekli resim */
const _flagImgs = new Map();
function flagImage(r) {
  const k = r ? (r.key || 'p' + r.id + (r.color || '')) : 'none';
  let im = _flagImgs.get(k);
  if (!im) {
    im = new Image();
    im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40" width="120" height="80" preserveAspectRatio="none">${flagArt(r)}</svg>`);
    im.onload = () => { if (typeof MAPDIRTY !== 'undefined') MAPDIRTY = true; };
    _flagImgs.set(k, im);
  }
  return im.complete && im.naturalWidth ? im : null;
}
