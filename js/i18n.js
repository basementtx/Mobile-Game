'use strict';
/* =========================================================
   Crown & Dagger / Taç ve Hançer — Dil desteği (EN varsayılan, TR)
   L('türkçe', 'english') o anki dile göre metni döner.
   ========================================================= */

const LANG_KEY = 'tvh-lang';
let LANG = (() => { try { return localStorage.getItem(LANG_KEY) || 'en'; } catch (e) { return 'en'; } })();
document.documentElement.lang = LANG;

function L(tr, en) { return LANG === 'tr' ? tr : en; }

/* Veri tablolarında iki dilli alan: BL('tr', 'en') — biDefine ile dil getter'ına dönüşür */
const BL = (tr, en) => ({ __b: [tr, en] });
const isB = v => !!v && typeof v === 'object' && Array.isArray(v.__b);
const pickB = v => (isB(v) ? L(v.__b[0], v.__b[1]) : v);
function biDefine(o) {
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (isB(v)) Object.defineProperty(o, k, { get: () => pickB(v), enumerable: true, configurable: true });
    else if (Array.isArray(v) && v.some(isB)) Object.defineProperty(o, k, { get: () => v.map(pickB), enumerable: true, configurable: true });
  }
  return o;
}
function biEach(map) { for (const k of Object.keys(map)) biDefine(map[k]); return map; }

function gameTitle() { return L('Taç ve Hançer', 'Crown & Dagger'); }

function setLang(l) {
  LANG = l === 'tr' ? 'tr' : 'en';
  try { localStorage.setItem(LANG_KEY, LANG); } catch (e) { /* yok say */ }
  document.documentElement.lang = LANG;
  document.title = gameTitle();
  if (typeof relocalize === 'function' && typeof G !== 'undefined' && G) relocalize();
}
