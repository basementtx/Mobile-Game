'use strict';
/* =========================================================
   Crown & Dagger — Arayüz: pazar, zevkler, krallık yönetimi
   (meclis, yasalar, kararlar, diplomasi, vasallar)
   ========================================================= */

/* ---------- Pazar ---------- */
function marketStock(s) {
  const keys = Object.keys(ITEMS);
  const r = mulberry32(s.id.length * 977 + monthIndex() * 31 + G.settIds.indexOf(s.id) * 7);
  const n = 6 + (s.capital ? 2 : 0) + (s.kind === 'sehir' ? 1 : 0);
  return keys.map(k => [k, r()]).sort((a, b) => a[1] - b[1]).slice(0, Math.min(keys.length, n)).map(x => x[0]);
}
function itemPrice(s, k) { return ITEMS[k].cost; }
function marketHtml(s, p) {
  if (!s) return `<p class="small muted">🏪 ${L('Pazar için bir yerleşimin olmalı.', 'You need a holding to visit a market.')}</p>`;
  const stock = marketStock(s);
  const east = CULTURES[s.cul] && CULTURES[s.cul].east;
  return `<h3>🏪 ${esc(s.name)} ${east ? L('çarşısı', 'bazaar') : L('pazarı', 'market')} <small class="muted">(${L('hediyeler', 'gifts')} · ${L('envanter', 'inventory')}: ${(p.inv || []).length})</small></h3><div class="recruit">${stock.map(k => {
    const pr = itemPrice(s, k), mineL = prefOf(p, 'i', k);
    return `<div class="rrow"><span class="ri">${ITEMS[k].i}</span><span class="rn">${esc(ITEMS[k].ad)}<small>${pr}💰${mineL > 0 ? ' · ' + L('sen seversin', 'you like it') : ''}</small></span><button data-buy="${k}" ${p.gold < pr ? 'disabled' : ''}>${L('Al', 'Buy')}</button></div>`;
  }).join('')}</div>
  <p class="small muted">${L('Eşyaları sohbette hediye edersin. Herkesin sevdiği eşya farklıdır — önce öğren!', 'Give goods as gifts in conversation. Everyone loves different things — find out first!')}</p>`;
}
/* ---------- Zevkler ---------- */
function prefChipList(c, cat, known) {
  return Object.keys(c.pr[cat]).filter(k => !known || knowsPref(c, cat, k)).map(k => `<span class="pchip ${c.pr[cat][k] > 0 ? 'like' : 'hate'}">${prefIcon(cat, k)} ${esc(prefName(cat, k))}</span>`).join('');
}
function myTastesCard(p) {
  const all = ['h', 'a', 'i'].map(cat => prefChipList(p, cat, false)).join('');
  const inv = (p.inv || []).reduce((m, k) => (m[k] = (m[k] || 0) + 1, m), {});
  const friends = friendsOf(p), rivals = rivalsOf(p);
  const debts = p.debts || [];
  return `<div class="card"><h3>🎭 ${L('Zevklerin', 'Your tastes')}</h3><div class="pchips">${all}</div>
    <p class="small muted">${L('Sevdiğin etkinlikler stresini azaltır; ortak zevkler insanları sana yaklaştırır.', 'Activities you love relieve stress; shared tastes draw people to you.')}</p></div>
    <div class="card"><h3>🤝 ${L('Dostların ve rakiplerin', 'Friends and rivals')}</h3>${friends.map(x => personLine(x, p)).join('')}${rivals.map(x => personLine(x, p)).join('')}${!friends.length && !rivals.length ? `<p class="small muted">${L('Henüz yok.', 'None yet.')}</p>` : ''}</div>
    <div class="card"><h3>🎁 ${L('Envanter', 'Inventory')}</h3>${Object.keys(inv).length ? `<div class="pchips">${Object.entries(inv).map(([k, n]) => `<span class="pchip">${ITEMS[k].i} ${esc(ITEMS[k].ad)}${n > 1 ? ' ×' + n : ''}</span>`).join('')}</div>` : `<p class="small muted">${L('Boş. Krallık ekranındaki pazardan hediye alabilirsin.', 'Empty. Buy gifts at the market in the realm screen.')}</p>`}
    ${debts.length ? `<p class="small">💸 ${L('Borçların', 'Debts')}: ${debts.map(d => `${esc(nm(ch(d.to)))} ${d.amt}💰 (${d.late ? L('GECİKMİŞ', 'OVERDUE') : Math.max(0, d.due - monthIndex()) + L(' ay', ' mo')})`).join(' · ')}</p>` : ''}</div>`;
}
function sheetTastes(t) {
  const known = ['h', 'a', 'i'].map(cat => prefChipList(t, cat, true)).join('');
  const b = bond(t, P());
  const fr = friendsOf(t).slice(0, 4), rv = rivalsOf(t).slice(0, 4);
  return `<div class="card inner"><h3>🎭 ${L('Bildiğin zevkleri', 'Tastes you know')}</h3><div class="pchips">${known || `<span class="small muted">${L('Konuşarak keşfet.', 'Talk to find out.')}</span>`}</div>
    ${b ? `<p class="small">${b === 'rakip' ? '😠' : '🤝'} ${L('Seninle', 'With you')}: <b>${bondName(b)}</b></p>` : ''}
    ${fr.length ? `<p class="small">🤝 ${fr.map(x => `<a data-open="${x.id}">${esc(x.name)}</a>`).join(', ')}</p>` : ''}${rv.length ? `<p class="small">😠 ${rv.map(x => `<a data-open="${x.id}">${esc(x.name)}</a>`).join(', ')}</p>` : ''}</div>`;
}

/* ---------- Krallık ---------- */
function stabilityOf(p) { const v = vassalsOf(p); return v.length ? Math.round(v.reduce((a, x) => a + opinion(x, p), 0) / v.length) : 0; }
function lawSeg(key, opts, cur) { return `<div class="seg lawseg">${opts.map(([v, l, sub]) => `<button data-law="${key}:${v}" class="${cur === v ? 'on' : ''}">${l}${sub ? `<small>${sub}</small>` : ''}</button>`).join('')}</div>`; }
function decisionButtons(p) {
  return DECISIONS.filter(d => d.show(p)).map(d => {
    const why = d.req(p);
    return `<button class="act ${why ? 'off' : ''}" data-dec="${d.id}" ${why ? 'disabled' : ''}><span class="ai">${d.i}</span><span class="al">${esc(d.ad(p))}<small>${esc(d.d(p))}</small>${why ? `<em>${esc(why)}</em>` : ''}</span></button>`;
  }).join('');
}
/* ---------- Krallık ekranı (CK3 tarzı, sekmeli) ---------- */
const REALM_TABS = () => [['genel', '👑', L('Genel', 'Overview')], ['meclis', '🏛️', L('Meclis', 'Council')], ['yasalar', '⚖️', L('Yasalar', 'Laws')], ['kararlar', '📜', L('Kararlar', 'Decisions')], ['diplomasi', '🕊️', L('Diplomasi', 'Diplomacy')], ['vasallar', '🏰', L('Vasallar', 'Vassals')], ['pazar', '🏪', L('Pazar', 'Market')]];
function openRealm(tab) {
  if (tab) UI.realmTab = tab;
  closePop();
  if (UI.drawer) closeDrawer();
  UI._realmScroll = 0;
  renderRealm();
}
function renderRealm() {
  const p = P(), r = ownRealm(p);
  const prev = $('#modal .rbody');
  const sc = prev && UI.modal === 'realm' ? prev.scrollTop : 0;
  if (!r) { showModal(`<div class="realmscr"><button class="x" data-close>✕</button>${realmNoCrown(p)}</div>`, 'realm'); bindRealmModal(); return; }
  const tab = REALM_TABS().some(t => t[0] === UI.realmTab) ? UI.realmTab : 'genel';
  const body = { genel: realmOverview, meclis: realmCouncil, yasalar: realmLaws, kararlar: realmDecisions, diplomasi: realmDiplomacy, vasallar: realmVassals, pazar: realmMarket }[tab](p, r);
  const titles = rulerTitles(r);
  showModal(`<div class="realmscr">
    <header class="rhead" style="--rc:${r.color}">
      <span class="rflag">${flagHtml(r, 54, 'big')}</span>
      <div class="rtitle"><small class="eyebrow">${esc(pickB(titles[p.female ? 1 : 0]) || '')}</small><h1>${esc(r.name)}</h1>
        <p>${esc(nm(p))} · ${L(`${esc(p.dyn)} Hanedanı`, `House ${esc(p.dyn)}`)} · ${CULTURES[p.cul] ? CULTURES[p.cul].ad : ''}</p></div>
      <button class="rruler" data-open="${p.id}">${avatar(p, 58)}</button>
      <button class="x" data-close>✕</button>
    </header>
    <nav class="rtabs">${REALM_TABS().map(([k, i, l]) => `<button data-rtab="${k}" class="${tab === k ? 'on' : ''}"><span>${i}</span>${l}</button>`).join('')}</nav>
    <div class="rbody">${body}</div></div>`, 'realm');
  const nb = $('#modal .rbody'); if (nb) nb.scrollTop = sc;
  bindRealmModal();
}
function bindRealmModal() {
  const m = $('#modal');
  m.querySelectorAll('[data-close]').forEach(b => b.onclick = closeModal);
  m.querySelectorAll('[data-rtab]').forEach(b => b.onclick = () => { UI.realmTab = b.dataset.rtab; renderRealm(); const nb = $('#modal .rbody'); if (nb) nb.scrollTop = 0; });
  m.querySelectorAll('[data-open]').forEach(b => b.onclick = e => { e.stopPropagation(); openSheet(+b.dataset.open); });
  m.querySelectorAll('[data-goto]').forEach(b => b.onclick = () => gotoSettlement(G.titles[b.dataset.goto]));
  m.querySelectorAll('[data-act]').forEach(b => b.onclick = () => doAction(b.dataset.act, b.dataset.t ? +b.dataset.t : null));
  bindTips(m);
  bindRealmUI(m);
}
/* Kendi krallığı olmayan oyuncu (eski kayıtlar ya da tahtını kaybetmiş biri) */
function realmNoCrown(p) {
  const rr = realmOf(p), l = ch(p.lordId), k = rr ? ch(rr.holder) : null;
  let html = `<div class="rhead" style="--rc:${rr ? rr.color : '#6e6a62'}"><span class="rflag">${flagHtml(rr, 54, 'big')}</span><div class="rtitle"><h1>${rr ? esc(rr.name) : L('Tacsız', 'Without a crown')}</h1><p>${esc(nm(p))}</p></div></div><div class="rbody">`;
  if (k) html += `<div class="ck-card"><p class="small">${L('Hükümdar', 'Ruler')}: <a data-open="${k.id}">${esc(nm(k))}</a> ${opBadge(opinion(k, p))}</p>${l && l !== k ? `<p class="small">${L('Efendin', 'Liege')}: <a data-open="${l.id}">${esc(nm(l))}</a> ${opBadge(opinion(l, p))}</p>` : ''}</div>`;
  if (coupEligible(p)) html += `<div class="ck-card"><h3>👑 ${L('Taç için', 'For the crown')}</h3><p class="small">${L('Sohbetlerde gizlice destekçi topla. Yeterince güçlüysen darbe yap.', 'Gather secret supporters in conversation. When strong enough, stage a coup.')}</p>${coupSupporters(p).map(x => personLine(x, p)).join('') || `<p class="small muted">${L('Henüz destekçin yok.', 'No supporters yet.')}</p>`}</div>`;
  html += `<div class="decgrid">${decisionCards(p)}</div>`;
  html += `<p class="small muted">${L('Kendi krallığın olduğunda burada meclis, yasalar ve diplomasi açılır. "Entrika" menüsünden krallığını ilan edebilirsin.', 'Once you rule a realm, the council, laws and diplomacy open here. You can proclaim a kingdom from the Intrigue menu.')}</p></div>`;
  return html;
}
function rstat(v, l, cls, tip) { return `<div ${tip ? `data-tip="${esc(tip)}"` : ''}><b class="${cls || ''}">${v}</b><small>${l}</small></div>`; }
function realmOverview(p, r) {
  const vas = vassalsOf(p), hs = realmSettlements(r), stab = stabilityOf(p), heir = heirOf(p);
  const allies = alliesOf(r), wars = enemiesOf(r), n = natOfRealm(r);
  const demesne = settlementsOf(p);
  let html = `<div class="kstats wide">
    ${rstat(n ? (landShare(n.i) * 100).toFixed(1) + '%' : '—', L('karaların', 'of all land'))}${rstat(n ? fmtCount(n.troops) : 0, L('asker', 'troops'))}
    ${rstat(n ? '+' + goldRate(n).toFixed(1) + '/s' : '—', L('altın geliri', 'gold income'))}${rstat(hs.length, L('yerleşim', 'holdings'))}${rstat(vas.length, L('vasal', 'vassals'))}
    ${rstat((stab > 0 ? '+' : '') + stab, L('vasal sadakati', 'vassal loyalty'), stab < -10 ? 'bad' : stab > 15 ? 'good' : '', L('Vasallarının sana ortalama bakışı', 'Average opinion of your vassals'))}${rstat(Math.round(p.prestige), L('şan', 'prestige'))}</div>`;
  if (n) {
    const R = NR[n.i]; natBox(n.i);
    html += `<p class="small muted">${L(`Kasaba seviyesi ${R.towns} · liman ${R.harbors} · kale ${R.forts} · atölye ${R.shops} · gözcü kulesi ${R.towers} · kadırga ${R.galleys}`, `Town levels ${R.towns} · harbours ${R.harbors} · forts ${R.forts} · workshops ${R.shops} · watchtowers ${R.towers} · galleys ${R.galleys}`)}${G.tradeGold ? ' · ' + L(`ticaretten ${fmtGold(G.tradeGold)}💰`, `${fmtGold(G.tradeGold)}💰 from trade`) : ''}</p>`;
  }
  html += `<div class="ovgrid">
    <div class="ck-card"><small class="eyebrow">${L('Veliaht', 'Heir')}</small>${heir ? personLine(heir, p) : `<p class="bad small"><b>${L('Varisin yok! Ölürsen hanedan sona erer.', 'You have no heir! If you die, your dynasty ends.')}</b></p>`}
      <p class="small muted">${L('Veraset', 'Succession')}: ${law().veraset === 'esit' ? L('Eşit (en büyük çocuk)', 'Equal (eldest child)') : L('Erkek öncelikli', 'Male preference')}</p></div>
    <div class="ck-card"><small class="eyebrow">${L('Savaşlar', 'Wars')}</small>${wars.length ? wars.map(o => `<p class="rel-line">${flagHtml(o, 14)} <b>${esc(o.name)}</b>${(() => { const w = G.wars.find(w => [w.a, w.b].includes(r.id) && [w.a, w.b].includes(o.id)); return w ? ` <small class="muted">· ${L('aldığın', 'taken')} ${w.taken[r.id] || 0} / ${L('kaybettiğin', 'lost')} ${w.taken[o.id] || 0}</small>` : ''; })()}</p>`).join('') : `<p class="small muted">${L('Barış içindesin.', 'You are at peace.')}</p>`}
      <small class="eyebrow">${L('Müttefikler', 'Allies')}</small>${allies.length ? allies.map(o => `<p class="rel-line">${flagHtml(o, 14)} ${esc(o.name)}</p>`).join('') : `<p class="small muted">${L('İttifakın yok.', 'No alliances.')}</p>`}</div></div>`;
  html += `<h3>${L('Kraliyet arazisi', 'Royal demesne')} <small class="muted">(${demesne.length}/${demesneLimit(p)})</small></h3>
    <div class="holdgrid">${demesne.map(s => `<button class="hcard" data-goto="${s.id}"><b>${s.kind === 'sehir' ? '🏙️' : '🏰'} ${esc(s.name)}${s.capital ? ' ★' : ''}</b><small>${s.kind === 'sehir' ? L('Şehir', 'City') : L('Kale', 'Castle')}</small></button>`).join('')}</div>
    ${demesne.length > demesneLimit(p) ? `<p class="small mid">${L('Arazi sınırını aşıyorsun: fazla toprakları vasallarına bağışla (kişi kartından "Toprak bağışla").', 'You exceed your demesne limit: grant extra holdings to vassals ("Grant land" on their card).')}</p>` : ''}`;
  if (G.loan) html += `<p class="small">🏦 ${L('Borç', 'Loan')}: ${G.loan.amt}💰 · ${Math.max(0, G.loan.due - monthIndex())} ${L('ay kaldı', 'months left')}</p>`;
  return html;
}
function realmMarket(p) {
  const s = seatOf(p);
  return marketHtml(s, p);
}
function realmCouncil(p) {
  return `<p class="small muted">${L('Meclis üyeleri krallığını senin adına yönetir. Her üye ayda 3💰 maaş alır; ilgili yeteneği ne kadar yüksekse etkisi o kadar büyüktür.', 'Your councillors govern in your name. Each draws 3💰 a month; the higher their key skill, the greater the effect.')}</p>
  <div class="council2">${Object.keys(COUNCIL).map(seat => {
    const C = COUNCIL[seat], c = councilor(seat);
    return `<div class="cseat2 ${c ? '' : 'empty'}">
      <div class="cs-top"><span class="ci">${C.i}</span><b>${C.ad()}</b></div>
      ${c ? `<button class="cs-pt" data-open="${c.id}">${avatar(c, 56)}</button><p class="cs-nm">${esc(nm(c))}</p>` : `<div class="cs-pt vacant">?</div><p class="cs-nm muted">${L('Boş koltuk', 'Vacant seat')}</p>`}
      <div class="cs-sk"><span>${STATS[C.st]}</span><b>${c ? stat(c, C.st) : '—'}</b></div>
      <p class="cs-d">${C.d()}</p>
      <button class="cs-btn" data-seat="${seat}">${c ? L('Değiştir', 'Replace') : L('Ata', 'Appoint')}</button></div>`;
  }).join('')}</div>`;
}
function lawCard(title, desc, key, opts, cur, note) {
  return `<div class="lawcard"><div class="lc-h"><b>${title}</b><small>${desc}</small></div>
    <div class="lc-opts">${opts.map(([v, l, sub]) => `<button data-law="${key}:${v}" class="${cur === v ? 'on' : ''}"><span>${l}</span>${sub ? `<small>${sub}</small>` : ''}</button>`).join('')}</div>${note ? `<p class="small muted">${note}</p>` : ''}</div>`;
}
function realmLaws(p) {
  const lw = law(), lc = cooldown('law');
  const op = v => (v > 0 ? `<span class="good">${L('vasallar', 'vassals')} +${v}</span>` : v < 0 ? `<span class="bad">${L('vasallar', 'vassals')} ${v}</span>` : `<span class="muted">±0</span>`);
  return `${lc ? `<p class="small mid">⏳ ${L(`Yasalar ${lc} ay sonra yeniden değiştirilebilir.`, `Laws can be changed again in ${lc} months.`)}</p>` : ''}
    ${lawCard(L('Krallık vergisi', 'Crown authority: taxes'), L('Altın gelirini belirler. Hazineyi doldurur ama vasalların sadakatini aşındırır.', 'Sets your gold income. Fills the treasury but wears down your vassals\' loyalty.'), 'vergi',
      [[0, L('Hafif', 'Light'), '×0.8 · ' + op(LAW_TAX_OP[0])], [1, L('Normal', 'Normal'), '×1 · ' + op(LAW_TAX_OP[1])], [2, L('Yüksek', 'High'), '×1.2 · ' + op(LAW_TAX_OP[2])], [3, L('Ezici', 'Crushing'), '×1.35 · ' + op(LAW_TAX_OP[3])]], lw.vergi)}
    ${lawCard(L('Asker yükümlülüğü', 'Levy obligation'), L('Vasalların göndereceği asker: asker sınırını belirler.', 'How many men your vassals must send: sets your troop cap.'), 'yukumluluk',
      [[0, L('Düşük', 'Low'), '×0.85 · ' + op(LAW_LEVY_OP[0])], [1, L('Normal', 'Normal'), '×1 · ' + op(LAW_LEVY_OP[1])], [2, L('Ağır', 'Heavy'), '×1.2 · ' + op(LAW_LEVY_OP[2])]], lw.yukumluluk)}
    ${lawCard(L('Veraset', 'Succession'), L('Tacı kimin devralacağı. Değiştirmek 100 şana mal olur.', 'Who inherits the crown. Changing it costs 100 prestige.'), 'veraset',
      [['erkek', L('Erkek öncelikli', 'Male preference'), ''], ['esit', L('Eşit', 'Equal'), L('en büyük çocuk', 'eldest child')]], lw.veraset)}`;
}
function decisionCards(p) {
  return DECISIONS.filter(d => d.show(p)).map(d => {
    const why = d.req(p);
    return `<div class="deccard ${why ? 'off' : ''}"><div class="dc-h"><span class="ai">${d.i}</span><b>${esc(d.ad(p))}</b></div><p class="small">${esc(d.d(p))}</p>
      ${why ? `<p class="dc-why">${esc(why)}</p>` : ''}<button data-dec="${d.id}" ${why ? 'disabled' : ''}>${L('Karar ver', 'Enact')}</button></div>`;
  }).join('');
}
function realmDecisions(p) {
  return `<p class="small muted">${L('Kararlar krallığın kaderini belirleyen büyük adımlardır. Bazılarının bekleme süresi vardır.', 'Decisions are great steps that shape your realm. Some have a cooldown.')}</p><div class="decgrid">${decisionCards(p)}</div>`;
}
function realmDiplomacy(p, r) {
  const sz = o => { const n = natOfRealm(o); return n ? NR[n.i].tiles : 0; };
  const list = realms().filter(o => o !== r && natOfRealm(o)).sort((a, b) => (atWarRealms(r, b) - atWarRealms(r, a)) || (allied(r, b) - allied(r, a)) || sz(b) - sz(a));
  return `<p class="small muted">${L('🕊️ Elçi: 20💰 ve 1⚡, hükümdarın sana bakışı +12. İttifak ve barış için haritada o krallığın toprağına da dokunabilirsin.', '🕊️ Envoy: 20💰 and 1⚡, ruler opinion +12. You can also tap a realm\'s land on the map for alliances and peace.')}</p>
  ${list.map(o => {
    const k = ch(o.holder);
    if (!k) return '';
    const war = atWarRealms(r, o), pact = allied(r, o);
    const st = war ? `<span class="tag enemy">⚔️ ${L('Savaş', 'War')}</span>` : pact ? `<span class="tag friend">🤝 ${L('Pakt', 'Pact')}</span>` : '';
    return `<div class="dipl2 ${war ? 'war' : pact ? 'ally' : ''}">${flagHtml(o, 26)}<button class="dp-pt" data-open="${k.id}">${avatar(k, 38)}</button>
      <span class="dn"><b>${esc(o.name)}</b><small>${esc(nm(k))} · ${(landShare(natOfRealm(o).i) * 100).toFixed(1)}% · ⚔ ${fmtCount(natOfRealm(o).troops)}</small><span class="tags">${st}</span></span>${opBadge(opinion(k, p))}
      <span class="ab"><button data-envoy="${o.id}" title="${L('Elçi gönder', 'Send envoy')}" ${p.gold < 20 || G.ap < 1 ? 'disabled' : ''}>🕊️</button><button data-dtalk="${k.id}" title="${L('Konuş', 'Talk')}" ${G.ap < 1 ? 'disabled' : ''}>💬</button>${war ? `<button data-act="baris" data-t="${k.id}" title="${L('Barış teklif et', 'Offer peace')}" ${G.ap < 1 ? 'disabled' : ''}>🏳️</button>` : `<button class="danger" data-act="savas" data-t="${k.id}" title="${L('Savaş ilan et', 'Declare war')}" ${G.ap < 1 ? 'disabled' : ''}>⚔️</button>`}</span></div>`;
  }).join('')}`;
}
function realmVassals(p) {
  const vas = vassalsOf(p).sort((a, b) => opinion(a, p) - opinion(b, p));
  if (!vas.length) return `<p class="muted">${L('Vasalın yok. Fethettiğin yerleşimleri saraylılarına bağışlayarak vasal edinirsin (kişi kartında "Toprak bağışla").', 'You have no vassals. Grant conquered holdings to courtiers to gain vassals ("Grant land" on their card).')}</p>`;
  return `<p class="small muted">${L('En hoşnutsuzdan en sadığa sıralı. Hırslı ya da kibirli ve sana kızgın vasallar isyan edebilir.', 'Sorted from least to most loyal. Ambitious or arrogant vassals who resent you may revolt.')}</p>
  ${vas.map(v => {
    const risk = (has(v, 'hirsli') || has(v, 'kibirli')) && opinion(v, p) < -30;
    return `<div class="dipl2 ${risk ? 'war' : ''}"><button class="dp-pt" data-open="${v.id}">${avatar(v, 40)}</button><span class="dn"><b>${esc(nm(v))}</b><small>${settlementsOf(v).map(s => `<a data-goto="${s.id}">${esc(s.name)}</a>`).join(', ')} · ${settlementsOf(v).length} ${L('yer', 'holdings')}${v.sup ? ' · 👑?' : ''}</small>${risk ? `<span class="tags"><span class="tag enemy">⚠ ${L('isyan riski', 'revolt risk')}</span></span>` : ''}</span>${opBadge(opinion(v, p))}
      <span class="ab"><button data-reward="${v.id}" ${p.gold < 30 ? 'disabled' : ''} title="${L('Ödüllendir (30💰)', 'Reward (30💰)')}">🎁</button><button data-dtalk="${v.id}" title="${L('Konuş', 'Talk')}" ${G.ap < 1 ? 'disabled' : ''}>💬</button></span></div>`;
  }).join('')}`;
}
function openCouncilPicker(seat) {
  const p = P(), C = COUNCIL[seat];
  const cands = councilCandidates(p).sort((a, b) => stat(b, C.st) - stat(a, C.st));
  showModal(`<div class="sheet"><button class="x" data-close>✕</button><h2>${C.i} ${C.ad()}</h2><p class="small muted">${C.d()} · ${L('Önemli yetenek', 'Key skill')}: ${STATS[C.st]}</p>
    ${cands.length ? cands.map(c => `<button class="person" data-pick="${c.id}">${avatar(c)}<div class="pi"><b>${esc(nm(c))}</b><small>${STATS[C.st]} <b>${stat(c, C.st)}</b> · ${esc(titleOf(c))}</small><div class="tags">${tagsFor(p, c)}</div></div>${opBadge(opinion(c, p))}</button>`).join('') : `<p class="muted">${L('Sarayında atanabilecek kimse yok. Sohbette insanları hizmetine davet et.', 'Nobody at your court to appoint. Invite people into your service through conversation.')}</p>`}</div>`, 'menu');
  const m = $('#modal');
  m.querySelector('[data-close]').onclick = () => openRealm('meclis');
  m.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { appoint(seat, ch(+b.dataset.pick)); toast(L(`${nm(ch(+b.dataset.pick))} meclise atandı.`, `${nm(ch(+b.dataset.pick))} joined your council.`)); saveGame(); openRealm('meclis'); });
}
function runDecision(id, confirmed) {
  const d = DECISION_MAP[id], p = P();
  if (!d || G.over) return;
  const why = d.req(p);
  if (why) return toast(why);
  if (d.confirm && !confirmed) return askConfirm(esc(d.d(p)), () => runDecision(id, true), () => openRealm('kararlar'));
  const msg = d.run(p);
  if (msg) log(msg, 'player');
  saveGame();
  closeDrawer();
  if (msg) resultModal(msg); else if (UI.modal === 'realm') renderRealm();
  updateHUD();
}
function bindRealmUI(root) {
  const p = P();
  root.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { const s = seatOf(p), k = b.dataset.buy, pr = itemPrice(s, k); if (p.gold < pr) return; p.gold -= pr; addItem(p, k); toast(L(`${ITEMS[k].ad} satın aldın.`, `You bought ${ITEMS[k].ad}.`)); saveGame(); refreshPanels(); });
  root.querySelectorAll('[data-seat]').forEach(b => b.onclick = () => { closeDrawer(); openCouncilPicker(b.dataset.seat); });
  root.querySelectorAll('[data-dtalk]').forEach(b => b.onclick = () => { closeDrawer(); closeModal(); openDialogue(+b.dataset.dtalk); });
  root.querySelectorAll('[data-law]').forEach(b => b.onclick = () => {
    const [k, v0] = b.dataset.law.split(':'), v = k === 'veraset' ? v0 : +v0, lw = law();
    if (lw[k] === v) return;
    if (k === 'veraset') { if (p.prestige < 100) return toast(L('100 şan gerekli', 'Requires 100 prestige')); p.prestige -= 100; }
    else if (cooldown('law')) return toast(L(`Yasalar ${cooldown('law')} ay sonra yeniden değiştirilebilir.`, `Laws can be changed again in ${cooldown('law')} months.`));
    else setCooldown('law', 3);
    lw[k] = v;
    log(L('⚖️ Yeni yasa ilan edildi.', '⚖️ A new law was proclaimed.'), 'player');
    saveGame(); refreshPanels();
  });
  root.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => runDecision(b.dataset.dec));
  root.querySelectorAll('[data-envoy]').forEach(b => b.onclick = () => { sendEnvoy(G.titles[b.dataset.envoy]); saveGame(); refreshPanels(); });
  root.querySelectorAll('[data-reward]').forEach(b => b.onclick = () => { const v = ch(+b.dataset.reward); if (!v || p.gold < 30) return; p.gold -= 30; v.gold += 30; addOp(v, p, 15); remember(v, p, 'hediye', 6); toast(L(`${nm(v)} ödülünü minnetle kabul etti. (+15)`, `${nm(v)} gratefully accepted your reward. (+15)`)); saveGame(); refreshPanels(); });
}

function sendEnvoy(o) {
  const p = P(), k = o && ch(o.holder);
  if (!k || p.gold < 20 || G.ap < 1) return;
  p.gold -= 20; G.ap -= 1;
  const g = 12 + Math.floor((stat(p, 'dip') + councilBonus('sansolye')) / 3);
  addOp(k, p, g); remember(k, p, 'hediye', 4);
  toast(L(`🕊️ Elçin ${o.name} sarayında ağırlandı. (+${g})`, `🕊️ Your envoy was received at the court of the ${o.name}. (+${g})`));
}
