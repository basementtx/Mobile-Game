'use strict';
/* =========================================================
   Crown & Dagger — Mahremiyet: arzu, hüner, zevkler (fetişler),
   gebelik ve hastalık. Yalnızca 18 yaş üstü ve rıza gösteren
   karakterler arasında; esirler ve yakın akrabalar dışarıda.
   ========================================================= */

const isGrown = c => !!c && c.age >= 18;

/* ---------- Yaklaşımlar / zevkler ---------- */
const KINKS = biEach({
  sefkat: { ad: BL('Şefkatle', 'Tenderly'), i: '🌹', d: BL('Mum ışığı, acele yok.', 'Candlelight, no hurry.') },
  tutku: { ad: BL('Tutkuyla', 'With abandon'), i: '🔥', d: BL('Kapı kapanmadan başlayan bir gece.', 'A night that begins before the door is closed.') },
  hakim: { ad: BL('Hükmet', 'Take command'), i: '👑', d: BL('Sen emredersin, o itaat eder.', 'You command, they obey.'), role: 'dom' },
  teslim: { ad: BL('Teslim ol', 'Surrender'), i: '🕊️', d: BL('Dizginler onda.', 'They hold the reins.'), role: 'sub' },
  bag: { ad: BL('İpek bağlar', 'Silk bonds'), i: '⛓️', d: BL('Kurdeleler, düğümler ve bir güvenli söz.', 'Ribbons, knots and a safe word.') },
  sert: { ad: BL('Sert oyun', 'Rough play'), i: '🗡️', d: BL('Şaplak, kemer, acıyla hazzın sınırı.', 'Spanking, a belt — the edge of pain and pleasure.') },
  rol: { ad: BL('Rol oyunu', 'Role-play'), i: '🎭', d: BL('Bir geceliğine başka biri olun.', 'Be someone else for a night.') },
  kostum: { ad: BL('Kılık değiştirme', 'Costume and disguise'), i: '🎁', d: BL('Maskeler, başka birinin giysileri.', 'Masks, someone else\'s clothes.') },
  yag: { ad: BL('Yağlar ve masaj', 'Oils and massage'), i: '💧', d: BL('Kokulu yağlar ve uzun dokunuşlar.', 'Scented oils and long touches.') },
  teshir: { ad: BL('Tehlikeli bir yerde', 'Somewhere risky'), i: '🌙', d: BL('Bahçe, şapel, ahır… yakalanma riskiyle.', 'Garden, chapel, stables… at the risk of being caught.') },
});
const KINK_KEYS = Object.keys(KINKS);
const ROLE_NAMES = { dom: BL('Hükmeden', 'Dominant'), sub: BL('Teslim olan', 'Submissive'), switch: BL('İkisi de', 'Switch'), none: BL('Geleneksel', 'Conventional') };
const ORI_NAMES = { het: BL('Karşı cinse ilgi', 'Heterosexual'), hom: BL('Hemcinsine ilgi', 'Homosexual'), bi: BL('İki cinse de ilgi', 'Bisexual') };
const ROLEPLAYS = [BL('efendi ile hizmetkâr', 'lord and servant'), BL('kervancı ile hancı', 'caravaneer and innkeeper'), BL('şövalye ile hanımefendi', 'knight and lady'), BL('korsan ile tüccar', 'corsair and merchant'), BL('yabancı elçi ile saray muhafızı', 'foreign envoy and palace guard')];

/* Karakterin mahrem özellikleri (ilk ihtiyaçta üretilir, kayda girer) */
function sexOf(c) {
  if (c.sx) return c.sx;
  const R = mulberry32(c.id * 104729 + 77);
  const r = () => R();
  let lib = 25 + Math.floor(r() * 55);
  if (has(c, 'sehvetli')) lib += 30; if (has(c, 'iffetli')) lib -= 30; if (has(c, 'dindar')) lib -= 10;
  const oriR = r();
  const k = {};
  const likes = 1 + Math.floor(r() * 3), dislikes = 1 + Math.floor(r() * 2);
  const pool = shuffleR(KINK_KEYS.filter(x => x !== 'sefkat' && x !== 'tutku'), r);
  pool.slice(0, likes).forEach(x => { k[x] = 1; });
  pool.slice(likes, likes + dislikes).forEach(x => { k[x] = -1; });
  if (r() < 0.6) k.sefkat = 1;
  if (r() < 0.5) k.tutku = has(c, 'iffetli') ? -1 : 1;
  // Kişilik zevkleri biçimlendirir
  if (has(c, 'zalim')) { k.sert = 1; k.hakim = 1; }
  if (has(c, 'kibirli')) { k.hakim = 1; k.teslim = -1; }
  if (has(c, 'alcakgonullu')) k.teslim = k.teslim || 1;
  if (has(c, 'cesur')) k.teshir = k.teshir || 1;
  if (has(c, 'korkak')) k.teshir = -1;
  if (has(c, 'kurnaz')) k.rol = k.rol || 1;
  if (has(c, 'merhametli')) { k.sefkat = 1; if (k.sert === 1) k.sert = 0; }
  if (has(c, 'iffetli') || has(c, 'dindar')) { for (const x of ['bag', 'sert', 'teshir']) k[x] = -1; }
  const role = k.hakim === 1 && k.teslim === 1 ? 'switch' : k.hakim === 1 ? 'dom' : k.teslim === 1 ? 'sub' : 'none';
  c.sx = {
    lib: clamp(lib, 5, 100), skill: clamp(Math.floor(r() * 7) + Math.floor(stat(c, 'cek') / 3), 0, 20),
    fert: Math.round((0.5 + r() * 0.9) * 100) / 100, ori: oriR < 0.8 ? 'het' : oriR < 0.93 ? 'bi' : 'hom',
    role, k, exp: 0, rep: 0, n: 0,
  };
  if (c.id === G.playerId) c.sx.ori = 'bi'; // oyuncu kime ilgi duyacağını kendisi seçer
  return c.sx;
}
function shuffleR(a, r) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const kinkOf = (c, k) => sexOf(c).k[k] || 0;
/* Cinsel yönelim karşısındakini kapsıyor mu? */
function attracted(a, b) { const o = sexOf(a).ori; return o === 'bi' || (o === 'het' ? a.female !== b.female : a.female === b.female); }
const fertile = c => c.alive && !c.prisonerOf && (c.female ? c.age >= 18 && c.age <= 45 : c.age >= 18 && c.age <= 70) && !c.preg;

/* ---------- Kim, kiminle? ---------- */
function bedReq(p, t) {
  if (!t || !t.alive || t.id === p.id) return L('Olmaz', 'Not possible');
  if (!isGrown(p)) return L('Henüz çok gençsin', 'You are too young');
  if (!isGrown(t)) return L('Yalnızca yetişkinler (18+)', 'Adults only (18+)');
  if (closeKin(p, t)) return L('Yakın akraban', 'A close relative');
  if (t.prisonerOf || p.prisonerOf) return L('Esaret altında rıza olmaz', 'No consent in captivity');
  if (!attracted(t, p)) return L(`${t.name} sana o gözle bakmıyor`, `${t.name} is not drawn to you that way`);
  if (G.ap < 1) return L('Bu ay vaktin kalmadı', 'No time left this month');
  return null;
}
const isPartner = (p, t) => p.spouseId === t.id || p.lovers.includes(t.id);
/* Davetini kabul etme olasılığı (sevgili ve eş için yüksek) */
function bedChance(p, t) {
  const sx = sexOf(t), o = opinion(t, p);
  if (p.spouseId === t.id) return pct(55 + o / 2 + (sx.lib - 50) / 2);
  if (t.lovers.includes(p.id)) return pct(65 + o / 3 + (sx.lib - 50) / 3);
  let c = seduceChance(p, t) + (sx.lib - 50) / 2.5 + sexOf(p).skill * 1.2;
  if (p.rank > t.rank) c += (p.rank - t.rank) * 4; // güç ve şan çekicidir
  if (sexOf(p).rep > 30 && (has(t, 'iffetli') || has(t, 'dindar'))) c -= 15;
  return pct(c);
}

/* ---------- Mahrem pencere ---------- */
let NIGHT = null;
function openIntimacy(tid) {
  const p = P(), t = ch(tid);
  const why = bedReq(p, t);
  if (why) return toast(why);
  NIGHT = { t: t.id, k: 'sefkat', child: 'sans' };
  renderIntimacy();
}
function canConceive(p, t) { return p.female !== t.female && fertile(p) && fertile(t); }
function renderIntimacy() {
  const p = P(), t = ch(NIGHT.t), sx = sexOf(t), partner = isPartner(p, t);
  const c = bedChance(p, t), o = opinion(t, p);
  const kn = k => knowsPref(t, 'x', k) ? kinkOf(t, k) : null;
  const opts = KINK_KEYS.map(k => {
    const v = kn(k), K = KINKS[k];
    return `<button class="kink ${NIGHT.k === k ? 'on' : ''}" data-k="${k}"><span class="ki">${K.i}</span><span class="kl"><b>${K.ad}</b><small>${K.d}</small></span><span class="kv ${v > 0 ? 'good' : v < 0 ? 'bad' : 'muted'}">${v > 0 ? '♥' : v < 0 ? '✗' : '?'}</span></button>`;
  }).join('');
  const conceive = canConceive(p, t);
  showModal(`<div class="event ck night"><h2 class="ev-title">🌹 ${L('Mahrem bir gece', 'An intimate night')}</h2><div class="ev-grid">
    <div class="ev-art"><div class="ev-frame">${avatar(t, 104, o / 100)}</div><b>${esc(nm(t))}</b><small>${esc(titleOf(t))} · ${t.age}</small>${opBadge(o)}
      <div class="sxmini">${sexMeter(L('Arzu', 'Desire'), sx.lib)}${knowsPref(t, 'x', 'role') ? `<p class="small">${pickB(ROLE_NAMES[sx.role])}</p>` : ''}</div></div>
    <div class="ev-main">
      <p class="small muted">${partner ? (p.spouseId === t.id ? L('Eşinle bir gece.', 'A night with your spouse.') : L('Gizli sevgilinle bir gece.', 'A night with your secret lover.')) : L('Davetini kabul ederse sevgilin olur. Reddederse bu konuşulur.', 'If they accept, they become your lover. If they refuse, people will talk.')}
        ${L('Kabul şansı', 'Chance they accept')}: <b class="${c >= 60 ? 'good' : c >= 30 ? 'mid' : 'bad'}">%${c}</b> · ${L('Hünerin', 'Your skill')} ${sexOf(p).skill}</p>
      <div class="dlg-q">${L('Nasıl bir gece?', 'What kind of night?')} <small class="muted">♥ ${L('sever', 'likes')} · ✗ ${L('sevmez', 'dislikes')} · ? ${L('bilinmiyor', 'unknown')}</small></div>
      <div class="kinks">${opts}</div>
      ${conceive ? `<div class="dlg-q">${L('Çocuk', 'Children')}</div><div class="seg childseg">
        <button data-c="iste" class="${NIGHT.child === 'iste' ? 'on' : ''}">👶 ${L('Çocuk iste', 'Try for a child')}</button>
        <button data-c="sans" class="${NIGHT.child === 'sans' ? 'on' : ''}">🎲 ${L('Şansa bırak', 'Leave it to fate')}</button>
        <button data-c="onlem" class="${NIGHT.child === 'onlem' ? 'on' : ''}">🌿 ${L('Önlem al', 'Take precautions')}</button></div>` : ''}
      <div class="eopts"><button class="opt primary" data-go>${L('Geceyi geçir (1⚡)', 'Spend the night (1⚡)')}</button><button class="opt" data-x>${L('Vazgeç', 'Never mind')}</button></div>
    </div></div></div>`, 'event');
  const m = $('#modal');
  m.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { NIGHT.k = b.dataset.k; renderIntimacy(); });
  m.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { NIGHT.child = b.dataset.c; renderIntimacy(); });
  m.querySelector('[data-x]').onclick = () => { NIGHT = null; closeModal(); };
  m.querySelector('[data-go]').onclick = () => { const res = spendNight(p, t, NIGHT.k, NIGHT.child); NIGHT = null; saveGame(); showNightResult(t, res); };
}
function sexMeter(label, v) { return `<div class="sxm"><small>${label}</small>${bar(v, 100, 'lib')}</div>`; }
function showNightResult(t, res) {
  const p = P();
  showModal(eventWindow(res.title, `${res.text}<ul class="fx">${res.fx.map(f => `<li class="${f[1]}">${f[0]}</li>`).join('')}</ul>`, t,
    `<button class="opt primary" data-next>${L('Devam', 'Continue')}</button>`), 'event');
  $('#modal').querySelector('[data-next]').onclick = () => { closeModal(); if (G.over) return renderGameOver(); updateHUD(); if (UI.drawer) renderDrawer(); processQueue(); };
  log(res.log, 'player');
  if (p.alive) updateHUD();
}

/* ---------- Gecenin sonucu ---------- */
const NIGHT_TEXT = {
  sefkat: [BL('Mum ışığında, acele etmeden… Sabaha dek birbirinize sarılı uyudunuz.', 'By candlelight, unhurried… You slept in each other\'s arms until dawn.'), BL('Nazik olmaya çalıştın ama aranızdaki soğukluk erimedi.', 'You tried to be gentle, but the chill between you never thawed.')],
  tutku: [BL('Kapı daha kapanmadan dudaklarınız buluştu. Gece uzun, nefes nefese ve unutulmazdı.', 'Your lips met before the door had closed. The night was long, breathless, unforgettable.'), BL('Fazla aceleciydin; {t} geri çekildi.', 'You were too hasty; {t} pulled away.')],
  hakim: [BL('Sen emrettin, {t} itaat etti — ve bundan aldığı zevki hiç saklamadı.', 'You commanded and {t} obeyed — making no secret of enjoying it.'), BL('{t} emir almaktan hoşlanmadı. Gece buz gibi bitti.', '{t} did not care to take orders. The night ended cold as ice.')],
  teslim: [BL('Bu gece kontrol {t}\'deydi. Kendini bırakmak tuhaf bir özgürlüktü.', 'Tonight {t} held control. Letting go was a strange kind of freedom.'), BL('{t} dizginleri almak istemedi; ikiniz de ne yapacağınızı bilemediniz.', '{t} did not want the reins; neither of you knew what to do.')],
  bag: [BL('İpek kurdeleler, sıkı düğümler ve fısıldanan bir güvenli söz… Güven, en güçlü bağdı.', 'Silk ribbons, tight knots and a whispered safe word… Trust was the strongest bond of all.'), BL('Düğümleri görünce {t}\'in yüzü değişti. "Hayır," dedi, kesin bir sesle. Hemen çözdün.', 'Seeing the knots, {t}\'s face changed. "No," they said firmly. You untied them at once.')],
  sert: [BL('Acıyla hazzın arasındaki ince çizgide dans ettiniz; ertesi sabah ikiniz de gülümsüyordunuz.', 'You danced on the thin line between pain and pleasure; next morning you were both smiling.'), BL('{t} canı yandığında gülmedi, irkildi. Hemen durdunuz ama büyü bozulmuştu.', 'When it hurt, {t} did not laugh but flinched. You stopped at once, but the spell was broken.')],
  rol: [BL('Bu gece ikiniz de başka biriydiniz — {rol}. Kahkahalar ve fısıltılar sabaha dek sürdü.', 'Tonight you were both someone else — {rol}. Laughter and whispers lasted until dawn.'), BL('{t} oyuna giremedi; replikler havada kaldı.', '{t} could not get into the game; the lines fell flat.')],
  kostum: [BL('Bir maske, ödünç bir pelerin… Tanıdık bir yüzü yeniden keşfetmek ne heyecanlıydı.', 'A mask, a borrowed cloak… How thrilling to discover a familiar face anew.'), BL('Kostümü görünce {t} gülmeye başladı — ama seninle değil, sana.', 'Seeing the costume, {t} burst out laughing — not with you, but at you.')],
  yag: [BL('Gül ve sandal yağlarının kokusu odayı doldurdu. Her kas gevşedi, her dert unutuldu.', 'The scent of rose and sandalwood filled the room. Every muscle loosened, every care forgotten.'), BL('Yağ fazla, sabır azdı; {t} sıkılıp uykuya daldı.', 'Too much oil, too little patience; {t} grew bored and fell asleep.')],
  teshir: [BL('Yakalanma korkusu her dokunuşu ateşe verdi. Kalbiniz hâlâ çarpıyor.', 'The fear of being caught set every touch aflame. Your hearts are still racing.'), BL('{t} her sesten irkildi; tadını çıkaramadı.', '{t} started at every sound and could not enjoy it.')],
};
const NIGHT_MID = [BL('Fena bir gece değildi; ama ikiniz de aklınızda başka şeylerle uykuya daldınız.', 'It was not a bad night; but you both fell asleep with other things on your minds.'), BL('{t} gülümsedi, sen de gülümsedin. Belki bir dahaki sefere daha iyi olur.', '{t} smiled, and so did you. Perhaps next time will be better.'), BL('Sessiz, biraz çekingen bir gece. Birbirinizi henüz tam tanımıyorsunuz.', 'A quiet, somewhat shy night. You do not quite know each other yet.')];
function spendNight(p, t, k, childMode) {
  G.ap -= 1;
  const v = s => s.replace(/\{t\}/g, esc(t.name)).replace(/\{rol\}/g, pickB(pick(ROLEPLAYS)));
  const fx = [], wasPartner = isPartner(p, t), sp = sexOf(p), st = sexOf(t);
  const out = { fx, title: '', text: '', log: '' };
  // Kabul
  if (!wasPartner && !chance(bedChance(p, t) / 100)) {
    addOp(t, p, -12); remember(t, p, 'ret', -8);
    fx.push([L('İlişki −12', 'Opinion −12'), 'bad']);
    const spouse = ch(t.spouseId);
    if (spouse && spouse.alive && (has(t, 'durust') || has(t, 'iffetli') || chance(0.3))) { addRumor(p, t, spouse, 'flort', 0.4); fx.push([L(`${esc(spouse.name)} bunu duyabilir…`, `${esc(spouse.name)} may hear of this…`), 'bad']); }
    if (chance(0.35)) { p.shame += 4; fx.push([L('Saray dedikodusu: rezalet +4', 'Court gossip: shame +4'), 'bad']); }
    out.title = L('Reddedildin', 'Refused');
    out.text = pickB(pick([BL(`${esc(t.name)} elini nazikçe çekti: "Hayır. Bunu unutalım."`, `${esc(t.name)} gently withdrew their hand: "No. Let us forget this."`), BL(`${esc(t.name)} soğuk bir bakışla kapıyı gösterdi.`, `${esc(t.name)} pointed at the door with a cold look.`)]));
    out.log = L(`🌹 ${nm(t)} davetini reddetti.`, `🌹 ${nm(t)} refused your invitation.`);
    return out;
  }
  // Uyum puanı
  const like = kinkOf(t, k), mine = kinkOf(p, k);
  let roleFit = 0;
  if (KINKS[k].role === 'dom') roleFit = st.role === 'sub' || st.role === 'switch' ? 1 : st.role === 'dom' ? -1 : 0;
  if (KINKS[k].role === 'sub') roleFit = st.role === 'dom' || st.role === 'switch' ? 1 : st.role === 'sub' ? -1 : 0;
  const score = 45 + (sp.skill - 8) * 2.5 + like * 30 + roleFit * 15 + mine * 6 + (st.lib - 50) / 4 + opinion(t, p) / 6 + rnd(-18, 18) - (like < 0 ? 15 : 0);
  const tier = score >= 85 ? 3 : score >= 60 ? 2 : score >= 35 ? 1 : 0;
  knowPref(t, 'x', k);
  if (roleFit) knowPref(t, 'x', 'role');
  out.text = tier >= 2 ? v(pickB(NIGHT_TEXT[k][0])) : tier === 0 ? v(pickB(NIGHT_TEXT[k][1])) : v(pickB(pick(NIGHT_MID)));
  out.title = [L('Soğuk bir gece', 'A cold night'), L('Sıradan bir gece', 'An ordinary night'), L('Güzel bir gece', 'A fine night'), L('Unutulmaz bir gece', 'An unforgettable night')][tier];
  const dOp = [like < 0 ? -22 : -10, 3, 10, 20][tier], dSt = [6, -4, -12, -20][tier];
  addOp(t, p, dOp); stress(p, dSt);
  remember(t, p, tier >= 2 ? 'gece' : 'kotuGece', [-10, 0, 8, 15][tier]);
  fx.push([L(`${esc(t.name)}: ilişki ${dOp > 0 ? '+' : ''}${dOp}`, `${esc(t.name)}: opinion ${dOp > 0 ? '+' : ''}${dOp}`), dOp > 0 ? 'good' : 'bad']);
  fx.push([L(`Stres ${dSt > 0 ? '+' : ''}${dSt}`, `Stress ${dSt > 0 ? '+' : ''}${dSt}`), dSt < 0 ? 'good' : 'bad']);
  fx.push([like > 0 ? L(`${esc(t.name)} bunu seviyor ♥`, `${esc(t.name)} loves this ♥`) : like < 0 ? L(`${esc(t.name)} bundan hoşlanmıyor ✗`, `${esc(t.name)} dislikes this ✗`) : L(`${esc(t.name)} buna kayıtsız`, `${esc(t.name)} is indifferent to this`), like > 0 ? 'good' : like < 0 ? 'bad' : '']);
  // İlişki durumu
  if (!wasPartner && tier >= 1) {
    becomeLovers(p, t);
    fx.push([L(`${esc(t.name)} artık sevgilin` + (p.spouseId || t.spouseId ? ' (yasak bir ilişki — bir sır)' : ''), `${esc(t.name)} is now your lover` + (p.spouseId || t.spouseId ? ' (a forbidden affair — a secret)' : '')), 'good']);
  }
  if (wasPartner && tier === 0 && t.lovers.includes(p.id) && like < 0 && chance(0.4)) { breakUp(p, t); fx.push([L(`${esc(t.name)} ilişkinizi bitirdi`, `${esc(t.name)} ended your affair`), 'bad']); }
  if (tier === 3 && chance(0.3) && !st.obs) { st.obs = p.id; fx.push([L(`${esc(t.name)} sana tutkuyla bağlandı`, `${esc(t.name)} is now infatuated with you`), 'good']); }
  if (tier === 0 && like < 0 && chance(0.4)) { p.shame += 6; fx.push([L('Yatak odası dedikodusu yayıldı: rezalet +6', 'Bedchamber gossip spread: shame +6'), 'bad']); }
  // Riskler
  if (k === 'sert' && chance(0.15)) { const hurt = st.role === 'sub' || (st.role !== 'dom' && chance(0.5)) ? t : p; hurt.health -= 6; fx.push([L(`${esc(hurt.name)} hafifçe yaralandı (sağlık −6)`, `${esc(hurt.name)} was lightly hurt (health −6)`), 'bad']); }
  if (k === 'teshir') {
    stress(p, -6);
    if (chance(0.3)) {
      const zina = G.secrets.find(s => s.type === 'zina' && !s.pub && [s.actor, s.target].includes(p.id) && [s.actor, s.target].includes(t.id));
      if (zina) { exposeSecret(zina); fx.push([L('Yakalandınız! İlişkiniz herkesin dilinde.', 'You were caught! Everyone knows of your affair.'), 'bad']); }
      else { p.shame += 6; t.shame += 6; fx.push([L('Bir hizmetkâr sizi gördü: rezalet +6', 'A servant saw you: shame +6'), 'bad']); }
    }
  }
  // Hastalık
  for (const [a, b] of [[p, t], [t, p]]) if (has(a, 'frengi') && !has(b, 'frengi') && chance(0.25)) { addTrait(b, 'frengi'); if (b.id === p.id) fx.push([L('Bir hastalık kaptın: Frengi', 'You caught a disease: the Great Pox'), 'bad']); }
  // Gebelik
  if (canConceive(p, t)) {
    let want = childMode;
    if (want === 'iste' && !wasPartner && opinion(t, p) < 30 && !chance(0.4)) { want = 'sans'; fx.push([L(`${esc(t.name)} çocuk istemedi`, `${esc(t.name)} did not want a child`), '']); }
    const mother = p.female ? p : t, father = p.female ? t : p;
    const base = 0.16 * sexOf(mother).fert * sexOf(father).fert * (mother.age > 38 ? 0.6 : 1);
    if (chance(base * (want === 'iste' ? 2 : want === 'onlem' ? 0.2 : 1))) { conceive(mother, father); out.conceived = true; }
  }
  // Deneyim ve şöhret
  sp.exp++; st.exp = (st.exp || 0) + 1;
  if (chance(0.3) && sp.skill < 20) { sp.skill++; fx.push([L('Hünerin arttı', 'Your skill grew'), 'good']); }
  if (!wasPartner) { sp.n++; sp.rep = Math.min(100, sp.rep + 4); }
  traitStress(p, { iffetli: 10, sehvetli: -6 });
  out.log = L(`🌹 ${nm(t)} ile bir gece: ${out.title.toLocaleLowerCase('tr')}.`, `🌹 A night with ${nm(t)}: ${out.title.toLowerCase()}.`);
  return out;
}

/* ---------- Gebelik ---------- */
function conceive(mother, father) {
  if (mother.preg) return;
  mother.preg = { f: father.id, due: monthIndex() + 9, told: false };
}
function pregTick() {
  const p = P();
  for (const m of living()) {
    if (!m.preg) continue;
    const f = ch(m.preg.f);
    if (!m.female || m.age > 50) { delete m.preg; continue; }
    const left = m.preg.due - monthIndex();
    if (!m.preg.told && left <= 7) {
      m.preg.told = true;
      const mine = m.id === p.id || m.preg.f === p.id || m.spouseId === p.id;
      if (mine) {
        const secret = m.preg.f === p.id && m.spouseId && m.spouseId !== p.id;
        queueEvent('bilgi', { who: m.id === p.id ? m.preg.f : m.id, b: L('👶 Bir bebek yolda', '👶 A child on the way'), m: m.id === p.id
          ? L(`Hamilesin! Babası <b>${esc(nm(f))}</b>. Birkaç ay sonra doğum yapacaksın.`, `You are with child! The father is <b>${esc(nm(f))}</b>. You will give birth in a few months.`)
          : L(`<b>${esc(nm(m))}</b> hamile.${secret ? ' Çocuğun babası sensin — ama kocası bunu bilmiyor.' : m.preg.f === p.id ? ' Çocuk senin.' : ''}`, `<b>${esc(nm(m))}</b> is with child.${secret ? ' You are the father — but her husband does not know.' : m.preg.f === p.id ? ' The child is yours.' : ''}`) });
      }
    }
    if (left <= 0) {
      delete m.preg;
      if (chance(0.04)) { if (relevant(m)) log(L(`😢 ${nm(m)} bebeğini düşürdü.`, `😢 ${nm(m)} lost the child.`), 'bad'); continue; }
      if (f) birth(m, f);
      if (chance(0.03)) die(m, L('Doğumda öldü', 'Died in childbirth'));
    }
  }
}
/* Aylık: sevgililer arasında hastalık yayılır, frengi sağlığı kemirir */
function intimacyTick() {
  for (const c of living()) {
    if (has(c, 'frengi')) {
      c.health -= 1;
      for (const lid of c.lovers) { const l = ch(lid); if (l && l.alive && !has(l, 'frengi') && chance(0.06)) addTrait(l, 'frengi'); }
      const sp = ch(c.spouseId); if (sp && sp.alive && !has(sp, 'frengi') && chance(0.04)) addTrait(sp, 'frengi');
      const heal = settlementsOf(c).reduce((a, s) => a + bl(s, 'sifahane'), 0);
      if (heal && chance(0.08 * heal)) { c.traits = c.traits.filter(x => x !== 'frengi'); if (c.id === G.playerId) log(L('🏥 Şifahanendeki hekimler seni frengiden kurtardı.', '🏥 The physicians of your hospital cured you of the pox.'), 'good'); }
    } else if (c.lovers.length >= 2 && chance(0.004 * c.lovers.length)) addTrait(c, 'frengi');
    if (c.sx) c.sx.rep = Math.max(0, c.sx.rep - 0.3);
  }
}
/* Görüş etkileri */
function sexOpinionParts(a, b) {
  const out = [];
  if (!b.sx || !isGrown(a)) return out;
  if (a.sx && a.sx.obs === b.id) out.push([L('Tutkuyla bağlı', 'Infatuated'), 25]);
  const rep = Math.round(b.sx.rep || 0);
  if (rep >= 15) {
    if (has(a, 'iffetli') || has(a, 'dindar')) out.push([L('Çapkınlık şöhreti', 'Reputation as a seducer'), -Math.round(rep / 4)]);
    else if (has(a, 'sehvetli')) out.push([L('Çapkınlık şöhreti', 'Reputation as a seducer'), Math.round(rep / 6)]);
  }
  return out;
}

/* ---------- Kartlar ---------- */
function intimacyCard(t) {
  const p = P(), self = t.id === p.id;
  if (!isGrown(t)) return '';
  const sx = sexOf(t);
  const kinks = KINK_KEYS.filter(k => self ? sx.k[k] : knowsPref(t, 'x', k) && sx.k[k]).map(k => `<span class="pchip ${sx.k[k] > 0 ? 'like' : 'hate'}">${KINKS[k].i} ${esc(KINKS[k].ad)}</span>`).join('');
  const roleKnown = self || knowsPref(t, 'x', 'role');
  return `<div class="card inner sxcard"><h3>🌹 ${L('Mahrem', 'Intimacy')}</h3>
    <div class="sxgrid">${sexMeter(L('Arzu', 'Desire'), sx.lib)}<div class="sxm"><small>${L('Hüner', 'Skill')}</small><b>${self || p.lovers.includes(t.id) || p.spouseId === t.id ? sx.skill : '?'}</b></div>
      <div class="sxm"><small>${L('Doğurganlık', 'Fertility')}</small><b>${self ? Math.round(sx.fert * 100) + '%' : '?'}</b></div><div class="sxm"><small>${L('Şöhret', 'Notoriety')}</small><b>${Math.round(sx.rep)}</b></div></div>
    <p class="small">${self ? pickB(ORI_NAMES[sx.ori]) + ' · ' : ''}${roleKnown ? pickB(ROLE_NAMES[sx.role]) : L('Rolü bilinmiyor', 'Role unknown')}${t.preg ? ` · <b class="good">${L('Hamile', 'With child')}</b>` : ''}${has(t, 'frengi') && (self || isPartner(p, t)) ? ` · <b class="bad">${L('Frengi', 'The pox')}</b>` : ''}</p>
    <div class="pchips">${kinks || `<span class="small muted">${self ? L('Belirgin bir zevkin yok.', 'No marked tastes.') : L('Zevklerini birlikte geçirilen gecelerde öğrenirsin.', 'You learn their tastes over nights together.')}</span>`}</div></div>`;
}
