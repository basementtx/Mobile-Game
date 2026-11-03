'use strict';
/* =========================================================
   Crown & Dagger — Huzura çıkanlar
   İnsanlar kendi istekleri, dertleri, kavgaları ve duygularıyla
   sana gelir. Her seçim ilişkileri, bağları ve dünyayı değiştirir.
   ========================================================= */

function courtOf(p) {
  return living().filter(x => x.id !== p.id && isAdult(x) && free(x) && (x.lordId === p.id || isUnder(x, p) || (p.lordId != null && x.lordId === p.lordId) || familyRel(p, x) || bond(x, p)));
}
const AUDIENCES = {
  hakemlik: {
    w: p => (courtOf(p).filter(x => isUnder(x, p)).length >= 2 ? 1.4 : 0),
    prep: p => {
      const pool = courtOf(p).filter(x => isUnder(x, p));
      for (const a of shuffle(pool.slice())) {
        const b = pool.find(x => x !== a && (opinion(a, x) < 0 || bond(a, x) === 'rakip'));
        if (b) return { a: a.id, b: b.id, k: rnd(0, 3) };
      }
      return pool.length >= 2 ? { a: pool[0].id, b: pool[1].id, k: rnd(0, 3) } : null;
    },
  },
  yardimIstegi: { w: p => (courtOf(p).some(x => x.gold < 30) && p.gold >= 30 ? 1.2 : 0), prep: p => { const l = courtOf(p).filter(x => x.gold < 30); return l.length ? { from: pick(l).id, amt: pick([30, 40, 50, 60]), k: rnd(0, 3) } : null; } },
  rakibeKarsi: {
    w: p => (courtOf(p).some(x => rivalsOf(x).some(r => r.id !== p.id)) ? 1 : 0),
    prep: p => { const l = courtOf(p).filter(x => opinion(x, p) > 0 && rivalsOf(x).some(r => r.id !== p.id)); if (!l.length) return null; const f = pick(l); return { from: f.id, r: pick(rivalsOf(f).filter(r => r.id !== p.id)).id }; },
  },
  askItirafi: {
    w: p => (isAdult(p) && living().some(x => isAdult(x) && free(x) && x.female !== p.female && !closeKin(p, x) && !p.lovers.includes(x.id) && x.spouseId !== p.id && opinion(x, p) > 45) ? 0.7 : 0),
    prep: p => { const l = living().filter(x => isAdult(x) && free(x) && x.female !== p.female && !closeKin(p, x) && !p.lovers.includes(x.id) && x.spouseId !== p.id && opinion(x, p) > 45); return l.length ? { from: pick(l).id } : null; },
  },
  kiskanclik: {
    w: p => { const sp = ch(p.spouseId); return sp && free(sp) && (p.lovers.length || (sp.mem || []).some(m => m.t === 'flort')) ? 0.8 : 0; },
    prep: p => ({ from: p.spouseId }),
  },
  barisTeklifiR: { w: p => (rivalsOf(p).some(r => free(r) && opinion(r, p) > -60) ? 0.8 : 0), prep: p => { const l = rivalsOf(p).filter(r => free(r) && opinion(r, p) > -60); return l.length ? { from: pick(l).id } : null; } },
  davet: {
    w: p => (courtOf(p).some(x => opinion(x, p) > 30) ? 1 : 0),
    prep: p => {
      const l = courtOf(p).filter(x => opinion(x, p) > 30);
      if (!l.length) return null;
      const x = pick(l);
      const acts = likedList(x, 'a');
      return { from: x.id, a: acts.length ? pick(acts) : pick(Object.keys(ACTIVITIES)) };
    },
  },
  suikastUyarisi: {
    w: p => (living().some(x => opinion(x, p) < -60 && free(x) && x.gold >= 30) && courtOf(p).some(x => opinion(x, p) > 30) ? 0.9 : 0),
    prep: p => { const foes = living().filter(x => opinion(x, p) < -60 && free(x)); const fr = courtOf(p).filter(x => opinion(x, p) > 30); return foes.length && fr.length ? { from: pick(fr).id, foe: pick(foes).id } : null; },
  },
  vasalTalebi: {
    w: p => (ownRealm(p) && vassalsOf(p).some(v => opinion(v, p) < -10) ? 1.1 : 0),
    prep: p => { const l = vassalsOf(p).filter(v => opinion(v, p) < -10); return l.length ? { from: pick(l).id, k: rnd(0, 2) } : null; },
  },
};
function audienceTick() {
  const p = P();
  if (!p || !free(p) || !isAdult(p) || G.queue.length || !chance(0.4)) return;
  G.audCd = G.audCd || {};
  const now = monthIndex();
  const opts = Object.entries(AUDIENCES).filter(([k]) => !(G.audCd[k] > now)).map(([k, a]) => [k, a.w(p)]).filter(x => x[1] > 0);
  const k = weighted(opts);
  if (!k) return;
  const d = AUDIENCES[k].prep(p);
  if (d) { queueEvent(k, d); G.audCd[k] = now + (k === 'kiskanclik' ? 14 : 8); }
}

const DISPUTES = [
  [T2('bir değirmenin ve suyunun', 'a mill and its water rights'), T2('Değirmen benim dedemindi!', 'That mill was my grandfather\'s!')],
  [T2('ödenmemiş bir borcun', 'an unpaid debt'), T2('Bana altı yıldır borçlu ve tek kuruş ödemedi!', 'They have owed me for six years and not paid a coin!')],
  [T2('kaçırılan bir gelinin', 'an eloped bride'), T2('Kızımı gece yarısı kaçırttı!', 'They had my daughter carried off at midnight!')],
  [T2('bir sınır ormanının', 'a border forest'), T2('Adamları benim ormanımda geyik avlıyor!', 'Their men hunt deer in my forest!')],
];
const evFrom = d => ch(d.from);
Object.assign(EVENTS, {
  hakemlik: {
    baslik: () => L('⚖️ Hakemlik', '⚖️ Arbitration'),
    valid: (p, d) => free(ch(d.a)) && free(ch(d.b)),
    metin: (p, d) => { const a = ch(d.a), b = ch(d.b), D = DISPUTES[d.k]; return L(`<b>${nm(a)}</b> ile <b>${nm(b)}</b> ${fill(D[0])} yüzünden kavgalı ve senin hükmünü istiyorlar.<br><br>${a.name}: "${fill(D[1])}"<br>${b.name}: "Yalan! Her şey usulüne uygun."<br><br><small>${a.name}: sana ${opinion(a, p)} · ${b.name}: sana ${opinion(b, p)} · birbirlerine ${opinion(a, b)}</small>`, `<b>${nm(a)}</b> and <b>${nm(b)}</b> are feuding over ${fill(D[0])} and seek your judgement.<br><br>${a.name}: "${fill(D[1])}"<br>${b.name}: "Lies! All was done properly."<br><br><small>${a.name}: ${opinion(a, p)} to you · ${b.name}: ${opinion(b, p)} · to each other ${opinion(a, b)}</small>`); },
    secenekler: (p, d) => {
      const a = ch(d.a), b = ch(d.b);
      const fairC = pct(35 + (stat(p, 'dip') - 5) * 5 + (stat(p, 'yon') - 5) * 3);
      return [
        { t: L(`${a.name} haklı`, `${a.name} is in the right`), f: () => { addOp(a, p, 20); addOp(b, p, -25); addOp(b, a, -15); remember(a, p, 'savunma', 10); return L(`${a.name} minnettar; ${b.name} kinle salonu terk etti.`, `${a.name} is grateful; ${b.name} left the hall seething.`); } },
        { t: L(`${b.name} haklı`, `${b.name} is in the right`), f: () => { addOp(b, p, 20); addOp(a, p, -25); addOp(a, b, -15); remember(b, p, 'savunma', 10); return L(`${b.name} minnettar; ${a.name} kinle salonu terk etti.`, `${b.name} is grateful; ${a.name} left the hall seething.`); } },
        { t: L(`Adil bir orta yol bul (%${fairC})`, `Find a fair compromise (${fairC}%)`), f: () => { if (chance(fairC / 100)) { addOp(a, p, 8); addOp(b, p, 8); addOp(a, b, 12); addOp(b, a, 12); if (bond(a, b) === 'rakip') setBond(a, b, null); p.prestige += 10; return L('Hükmün Süleyman\'ın hikmetine benzetildi. İkisi de el sıkıştı. (Şan +10)', 'Your judgement was likened to Solomon\'s. They shook hands. (Prestige +10)'); } addOp(a, p, -6); addOp(b, p, -6); return L('İkisi de hükmünden memnun kalmadı.', 'Neither was satisfied with your ruling.'); } },
        { t: L('Anlaşmazlık konusuna el koy (+50💰)', 'Seize the disputed property (+50💰)'), f: () => { p.gold += 50; addOp(a, p, -30); addOp(b, p, -30); p.tyranny += 6; const s = traitStress(p, { durust: 10, acgozlu: -5 }); return L('İkisini de kovdun ve malı hazineye kattın. (Zorbalık +6)', 'You threw them both out and took the property for the treasury. (Tyranny +6)') + stressNote(s); } },
      ];
    },
  },
  yardimIstegi: {
    baslik: () => L('🤲 Bir yardım dileği', '🤲 A plea for help'),
    valid: (p, d) => free(evFrom(d)),
    metin: (p, d) => { const c = evFrom(d); const why = [L('kızının çeyizi', 'their daughter\'s dowry'), L('yanan ahırlarının onarımı', 'rebuilding their burned barns'), L('esir düşen oğlunun fidyesi', 'the ransom of their captured son'), L('eski bir kumar borcu', 'an old gambling debt')][d.k]; return L(`<b>${nm(c)}</b> başı önünde huzuruna geldi: "Utanarak söylüyorum... ${why} için ${d.amt} altına ihtiyacım var."`, `<b>${nm(c)}</b> comes before you, head bowed: "I say this with shame... I need ${d.amt} gold for ${why}."`); },
    secenekler: (p, d) => {
      const c = evFrom(d);
      return [
        { t: L(`Ver (${d.amt}💰)`, `Give it (${d.amt}💰)`), req: () => p.gold >= d.amt, f: () => { p.gold -= d.amt; c.gold += d.amt; addOp(c, p, 25); remember(c, p, 'yardim', 18); const s = traitStress(p, { comert: -8, acgozlu: 8 }); if (opinion(c, p) > 60 && !bond(c, p) && chance(0.4)) setBond(c, p, 'dost'); return L(`${c.name} ellerini öptü: "Bunu ömrüm boyunca unutmayacağım."`, `${c.name} kissed your hands: "I will never forget this as long as I live."`) + stressNote(s); } },
        { t: L(`Yarısını ver (${Math.round(d.amt / 2)}💰)`, `Give half (${Math.round(d.amt / 2)}💰)`), req: () => p.gold >= d.amt / 2, f: () => { p.gold -= Math.round(d.amt / 2); c.gold += Math.round(d.amt / 2); addOp(c, p, 10); return L(`${c.name} teşekkür etti, ama gözlerinde hayal kırıklığı vardı.`, `${c.name} thanked you, with disappointment in their eyes.`); } },
        { t: L('Reddet', 'Refuse'), f: () => { addOp(c, p, bond(c, p) === 'dost' ? -25 : -10); const s = traitStress(p, { merhametli: 8, comert: 8 }); return L(`${c.name} sessizce çekildi.`, `${c.name} withdrew in silence.`) + stressNote(s); } },
      ];
    },
  },
  rakibeKarsi: {
    baslik: () => L('🗡️ Bir dostun talebi', '🗡️ A friend\'s request'),
    valid: (p, d) => free(evFrom(d)) && free(ch(d.r)),
    metin: (p, d) => { const c = evFrom(d), r = ch(d.r); return L(`<b>${nm(c)}</b> seni kenara çekti: "<b>${short(r)}</b> beni mahvetmeye çalışıyor. Sözün sarayda geçer; benim yanımda olduğunu herkes bilsin."`, `<b>${nm(c)}</b> takes you aside: "<b>${short(r)}</b> is trying to ruin me. Your word carries weight at court; let everyone know you stand with me."`); },
    secenekler: (p, d) => {
      const c = evFrom(d), r = ch(d.r);
      return [
        { t: L(`Herkesin önünde ${r.name}'i kötüle`, `Denounce ${r.name} publicly`), f: () => { addOp(c, p, 20); addOp(r, p, -25); r.prestige -= 10; r.shame += 5; for (const x of nearby(r).slice(0, 4)) addOp(x, r, -6); addRumor(p, c, r, -1, 0.3); remember(c, p, 'savunma', 10); return L(`Saray ${r.name} hakkında fısıldaşıyor. ${c.name} sana sadık; ${r.name} ise artık sana da düşman.`, `The court whispers about ${r.name}. ${c.name} is loyal to you; ${r.name} is now your enemy too.`); } },
        { t: L('Gizlice destek sözü ver', 'Promise support in private'), f: () => { addOp(c, p, 8); return L(`${c.name} biraz rahatladı. Sözünü sonra tutup tutmayacağın merak konusu.`, `${c.name} is somewhat comforted. Whether you will keep your word remains to be seen.`); } },
        { t: L(`${r.name}'i uyar`, `Warn ${r.name}`), f: () => { addOp(r, p, 20); remember(r, p, 'savunma', 10); if (chance(0.5)) { addOp(c, p, -40); setBond(c, p, 'rakip'); return L(`${r.name} minnettar... ama ${c.name} ihanetini öğrendi!`, `${r.name} is grateful... but ${c.name} learned of your betrayal!`); } return L(`${r.name} sana borçlu. ${c.name} hiçbir şeyden habersiz.`, `${r.name} owes you. ${c.name} suspects nothing.`); } },
        { t: L('Kavganıza karışmam', 'I will not take sides'), f: () => { addOp(c, p, -8); return L(`${c.name} hayal kırıklığına uğradı.`, `${c.name} is disappointed.`); } },
      ];
    },
  },
  askItirafi: {
    baslik: () => L('💘 Bir itiraf', '💘 A confession'),
    valid: (p, d) => free(evFrom(d)) && free(p) && !p.lovers.includes(d.from),
    metin: (p, d) => { const c = evFrom(d); return L(`Ay ışığında, <b>${nm(c)}</b> titreyen bir sesle konuştu: "Sana bir şey söylemem lazım, yoksa çatlayacağım... Seni seviyorum. İlk gördüğüm günden beri."${c.spouseId ? '<br><br><i>Evli olduğunu ikiniz de biliyorsunuz.</i>' : ''}`, `In the moonlight, <b>${nm(c)}</b> speaks with a trembling voice: "I must tell you or I shall burst... I love you. Since the day I first saw you."${c.spouseId ? '<br><br><i>You both know they are married.</i>' : ''}`); },
    secenekler: (p, d) => {
      const c = evFrom(d);
      const o = [{ t: L('Duygularına karşılık ver', 'Return their feelings'), f: () => { becomeLovers(p, c); const s = traitStress(p, { iffetli: 12, sehvetli: -8 }); return L(`${c.name} kollarına atıldı. Artık sevgilisiniz.`, `${c.name} fell into your arms. You are now lovers.`) + stressNote(s); } }];
      if (!p.spouseId && !c.spouseId) o.push({ t: L('Evlenme teklif et', 'Ask for their hand'), f: () => { marry(p, c); p.prestige += 10 + c.rank * 8; return L(`Sevinç gözyaşları içinde kabul etti. ${c.name} ile evlendin! 💍`, `Weeping with joy, they accepted. You married ${c.name}! 💍`); } });
      o.push({ t: L('Nazikçe reddet', 'Gently refuse'), f: () => { addOp(c, p, -10); return L(`${c.name} kırgın ama onurlu bir şekilde çekildi.`, `${c.name} withdrew, hurt but dignified.`); } });
      if (c.spouseId && ch(c.spouseId)) o.push({ t: L('Eşine haber ver', 'Tell their spouse'), f: () => { const sp = ch(c.spouseId); addOp(sp, p, 15); addOp(sp, c, -40); addOp(c, p, -60); setBond(c, p, 'rakip'); c.shame += 10; return L(`${sp.name} sana minnettar; ${c.name} ise seni asla affetmeyecek.`, `${sp.name} is grateful; ${c.name} will never forgive you.`); } });
      return o;
    },
  },
  kiskanclik: {
    baslik: () => L('💔 Eşinin kıskançlığı', '💔 A jealous spouse'),
    valid: (p, d) => free(evFrom(d)) && p.spouseId === d.from,
    metin: (p, d) => { const c = evFrom(d); return L(`<b>${nm(c)}</b> kapıyı arkasından kapattı, gözleri ateş saçıyor: "Saraydaki herkes konuşuyor. Bana yalan söyleme — başka biri var, değil mi?"`, `<b>${nm(c)}</b> shuts the door behind them, eyes blazing: "The whole court is talking. Do not lie to me — there is someone else, is there not?"`); },
    secenekler: (p, d) => {
      const c = evFrom(d);
      const denyC = pct(35 + (stat(p, 'ent') - stat(c, 'ent')) * 6 + (stat(p, 'cek') - 5) * 3);
      const o = [
        { t: L(`İnkâr et (%${denyC})`, `Deny it (${denyC}%)`), f: () => { if (chance(denyC / 100)) { addOp(c, p, 10); return L(`${c.name} sana inanmak istedi. Bu sefer.`, `${c.name} wanted to believe you. This time.`); } addOp(c, p, -25); remember(c, p, 'yalan', -15); return L('Yalanını yüzünden okudu. Kapıyı çarpıp çıktı.', 'They read the lie on your face and stormed out.'); } },
        { t: L('İtiraf et ve af dile', 'Confess and beg forgiveness'), f: () => { addOp(c, p, -15); remember(c, p, 'ozur', 15); const s = traitStress(p, { durust: -10, kibirli: 10 }); return L(`${c.name} ağladı, ama dürüstlüğün bir köprü bıraktı.`, `${c.name} wept, but your honesty left a bridge between you.`) + stressNote(s); } },
      ];
      if (p.lovers.length) o.push({ t: L('Sevgilinle ilişkini bitir', 'End your affair'), f: () => { const l = ch(p.lovers[0]); breakUp(p, l); addOp(l, p, -30); addOp(c, p, 20); return L(`${l.name} ile her şey bitti. ${c.name} sana yeniden güvenmeye çalışıyor.`, `It is over with ${l.name}. ${c.name} is trying to trust you again.`); } });
      o.push({ t: L('"Bana hesap soramazsın!"', '"You cannot call me to account!"'), f: () => { addOp(c, p, -35); p.dread += 3; return L(`${c.name} sustu. Ama aranızdaki buz artık hiç erimeyecek.`, `${c.name} fell silent. But the ice between you will never melt.`); } });
      return o;
    },
  },
  barisTeklifiR: {
    baslik: () => L('🕊️ Rakibinden bir teklif', '🕊️ An offer from your rival'),
    valid: (p, d) => free(evFrom(d)) && bond(evFrom(d), p) === 'rakip',
    metin: (p, d) => L(`Ezeli rakibin <b>${nm(evFrom(d))}</b> eldivenini çıkardı ve elini uzattı: "Bu düşmanlık ikimizi de tüketiyor. Geçmişi gömelim mi?"`, `Your old rival <b>${nm(evFrom(d))}</b> removes a glove and extends a hand: "This enmity wears us both down. Shall we bury the past?"`),
    secenekler: (p, d) => {
      const c = evFrom(d);
      return [
        { t: L('Elini sık', 'Shake their hand'), f: () => { setBond(c, p, null); addOp(c, p, 30); addOp(p, c, 30); return L('Yıllardır süren rekabet bir el sıkışmayla sona erdi.', 'Years of rivalry ended with a handshake.'); } },
        { t: L('Önce herkesin önünde özür dilesin', 'Demand a public apology first'), f: () => { if (chance(has(c, 'kibirli') ? 0.2 : 0.55)) { setBond(c, p, null); addOp(c, p, 15); p.prestige += 15; c.prestige -= 10; return L(`${c.name} dişlerini sıkarak özür diledi. (Şan +15)`, `${c.name} apologised through gritted teeth. (Prestige +15)`); } addOp(c, p, -20); return L(`${c.name} gururunu çiğnetmedi: "O zaman savaş sürsün."`, `${c.name} would not swallow their pride: "Then the feud goes on."`); } },
        { t: L('Eline tükür', 'Spit at their hand'), f: () => { addOp(c, p, -30); p.prestige += 3; return L('Saray nefesini tuttu. Bu iş kanla bitebilir.', 'The court held its breath. This may end in blood.'); } },
      ];
    },
  },
  davet: {
    baslik: (p, d) => L(`${ACTIVITIES[d.a].i} Bir davet`, `${ACTIVITIES[d.a].i} An invitation`),
    valid: (p, d) => free(evFrom(d)) && free(p),
    metin: (p, d) => L(`<b>${nm(evFrom(d))}</b> seni bir <b>${ACTIVITIES[d.a].ad.toLocaleLowerCase('tr')}</b> için davet ediyor: "Sen de gelirsen her şey daha güzel olur!"${prefOf(p, 'a', d.a) > 0 ? '<br><i>Bu senin de sevdiğin bir şey.</i>' : prefOf(p, 'a', d.a) < 0 ? '<br><i>Bundan pek hoşlanmazsın.</i>' : ''}`, `<b>${nm(evFrom(d))}</b> invites you to a <b>${ACTIVITIES[d.a].ad.toLowerCase()}</b>: "It would be so much better if you came!"${prefOf(p, 'a', d.a) > 0 ? '<br><i>You love this too.</i>' : prefOf(p, 'a', d.a) < 0 ? '<br><i>You do not much enjoy this.</i>' : ''}`),
    secenekler: (p, d) => {
      const c = evFrom(d);
      return [
        { t: L('Katıl', 'Attend'), f: () => { knowPref(c, 'a', d.a); addOp(c, p, 15); remember(c, p, 'etkinlik', 10); const mine = prefOf(p, 'a', d.a); const st = stress(p, mine > 0 ? -15 : mine < 0 ? 8 : -5); let m = L(`Güzel bir gün geçirdiniz. ${c.name} çok mutlu.`, `You had a fine day. ${c.name} is delighted.`) + stressNote(st); const guests = nearby(c).filter(x => x.id !== p.id); if (guests.length && chance(0.5)) { const g = pick(guests); addOp(g, p, 8); m += L(`<br>Orada <b>${nm(g)}</b> ile de tanıştın.`, `<br>There you also met <b>${nm(g)}</b>.`); } return m; } },
        { t: L('Gelemem ama bir hediye gönder (10💰)', 'Decline but send a gift (10💰)'), req: () => p.gold >= 10, f: () => { p.gold -= 10; addOp(c, p, 4); return L('Hediyen nazik karşılandı.', 'Your gift was kindly received.'); } },
        { t: L('Reddet', 'Decline'), f: () => { addOp(c, p, -6); return L(`${c.name} biraz bozuldu.`, `${c.name} is a little offended.`); } },
      ];
    },
  },
  suikastUyarisi: {
    baslik: () => L('🕯️ Gece yarısı uyarısı', '🕯️ A midnight warning'),
    valid: (p, d) => free(evFrom(d)) && ch(d.foe) && ch(d.foe).alive,
    metin: (p, d) => L(`<b>${nm(evFrom(d))}</b> gece yarısı odana süzüldü: "Sesini alçalt. <b>${short(ch(d.foe))}</b> senin ölümünü istiyor. Adamlarının zehirciyle konuştuğunu duydum."`, `<b>${nm(evFrom(d))}</b> slips into your chamber at midnight: "Keep your voice down. <b>${short(ch(d.foe))}</b> wants you dead. I heard their men talking with a poisoner."`),
    secenekler: (p, d) => {
      const c = evFrom(d), foe = ch(d.foe);
      return [
        { t: L('Muhafızları ikiye katla (25💰, 6 ay)', 'Double the guard (25💰, 6 months)'), req: () => p.gold >= 25, f: () => { p.gold -= 25; G.guardUntil = monthIndex() + 6; addOp(c, p, 10); return L('Tadımcılar, nöbetçiler, kilitli kapılar. Artık o kadar kolay değil.', 'Tasters, sentries, locked doors. It will not be so easy now.'); } },
        { t: L(`${foe.name} hakkında soruştur`, `Investigate ${foe.name}`), f: () => { const r = spy(p, foe); addOp(c, p, 8); addOp(p, foe, -20); return r.ok && r.s ? L(`Casusların ${foe.name}'in bir sırrını buldu:<br><i>${secretText(r.s)}</i>`, `Your spies found a secret of ${foe.name}'s:<br><i>${secretText(r.s)}</i>`) : L('Soruşturma bir şey çıkarmadı ama gözün artık onun üzerinde.', 'The inquiry turned up nothing, but your eye is on them now.'); } },
        { t: L('Abartıyorsun', 'You exaggerate'), f: () => { addOp(c, p, -5); return L(`${c.name} omuz silkti: "Sonra deme ki uyarmadım."`, `${c.name} shrugged: "Do not say I did not warn you."`); } },
      ];
    },
  },
  vasalTalebi: {
    baslik: () => L('📜 Bir vasalın talebi', '📜 A vassal\'s demand'),
    valid: (p, d) => free(evFrom(d)) && evFrom(d).lordId === p.id && !!ownRealm(p),
    metin: (p, d) => { const c = evFrom(d); const what = [L('topraklarındaki vergilerin hafifletilmesini', 'lighter taxes on their lands'), L('mecliste bir koltuk', 'a seat on your council'), L('ordusuna kraliyet hazinesinden destek', 'crown funds for their army')][d.k]; return L(`Huzursuz vasalın <b>${nm(c)}</b> sert bir dille ${what} istiyor: "Yıllardır hizmet ediyorum ve karşılığında ne aldım?" <small>(sana bakışı ${opinion(c, p)})</small>`, `Your restless vassal <b>${nm(c)}</b> bluntly demands ${what}: "I have served for years, and what have I received?" <small>(opinion ${opinion(c, p)})</small>`); },
    secenekler: (p, d) => {
      const c = evFrom(d);
      const o = [];
      if (d.k === 1) o.push({ t: L('Meclise al (kimin yerine olursa)', 'Grant a council seat'), f: () => { const seat = Object.keys(COUNCIL).sort((a, b) => (councilor(a) ? stat(councilor(a), COUNCIL[a].st) : -1) - (councilor(b) ? stat(councilor(b), COUNCIL[b].st) : -1))[0]; appoint(seat, c); return L(`${c.name} artık ${COUNCIL[seat].ad()}.`, `${c.name} is now ${COUNCIL[seat].ad()}.`); } });
      else o.push({ t: L('Talebi kabul et (60💰)', 'Grant the demand (60💰)'), req: () => p.gold >= 60, f: () => { p.gold -= 60; c.gold += 60; addOp(c, p, 25); remember(c, p, 'yardim', 12); return L(`${c.name} yatıştı. Şimdilik.`, `${c.name} is appeased. For now.`); } });
      o.push({ t: L('Sert bir dille reddet', 'Refuse sternly'), f: () => { addOp(c, p, -15); if ((has(c, 'hirsli') || has(c, 'kibirli')) && settlementsOf(c).length >= 1 && charPower(c) > charPower(p) * 0.3 && chance(0.25)) { const r = rebel(c); return L(`${c.name} kılıcını çekti ve isyan etti! <b>${r ? r.name : ''}</b> kuruldu.`, `${c.name} drew steel and rebelled! The <b>${r ? r.name : ''}</b> is founded.`); } return L(`${c.name} öfkeyle çıktı.`, `${c.name} left in anger.`); } });
      o.push({ t: L('Küstahlığı için zindana at', 'Imprison them for insolence'), f: () => { imprison(p, c, hasKnownCrime(p, c)); for (const x of vassalsOf(p)) if (x !== c) addOp(x, p, -6); return L(`${c.name} zincire vuruldu. Diğer vasalların tedirgin.`, `${c.name} was put in chains. Your other vassals are uneasy.`); } });
      o.push({ t: L('Gönlünü al: bir şölen sözü ver', 'Soothe them: promise a feast in their honour'), f: () => { addOp(c, p, 10); p.gold = Math.max(0, p.gold - 20); return L(`Gururu okşandı. (−20💰)`, `Their pride is soothed. (−20💰)`); } });
      return o;
    },
  },
});
