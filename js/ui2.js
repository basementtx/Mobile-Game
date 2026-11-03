'use strict';
/* =========================================================
   Crown & Dagger — Arayüz: topraklar ve binalar, pazar,
   zevkler, krallık yönetimi (meclis, yasalar, kararlar,
   diplomasi, vasallar)
   ========================================================= */

const unrestCls = u => (u > 60 ? 'bad' : u > 35 ? 'mid' : 'good');
function lvlPips(lv, max) { return `<span class="lpips">${'<i class="on"></i>'.repeat(lv)}${'<i></i>'.repeat(Math.max(0, max - lv))}</span>`; }
function bIcons(s) { return BKEYS.filter(k => bl(s, k)).map(k => `<span class="bico" data-tip="${esc(BUILDINGS[k].ad(s) + ' ' + ROMAN[bl(s, k)])}">${BUILDINGS[k].i}<sub>${bl(s, k)}</sub></span>`).join(''); }
function holdingCard(s, p) {
  const inc = settIncome(s, p);
  return `<button class="card hold" data-hold="${s.id}">
    <div class="hrow"><b>${s.kind === 'sehir' ? '🏙️' : '🏰'} ${esc(s.name)}${s.capital ? ' ★' : ''}</b><span class="small">${inc >= 0 ? '+' : ''}${inc}💰/${L('ay', 'mo')}</span></div>
    <div class="hstats small"><span>${L('Refah', 'Prosperity')} %${Math.round((s.prosperity || 1) * 100)}</span><span>${L('Nüfus', 'Pop.')} ${Math.round(s.pop || 0)}k</span><span class="${unrestCls(s.unrest || 0)}">${L('Huzursuzluk', 'Unrest')} %${Math.round(s.unrest || 0)}</span><span>${L('Garnizon', 'Garrison')} ${s.garrison}/${garrisonMax(s)}</span><span>${L('Vergi', 'Tax')}: ${TAX_NAMES()[s.tax ?? 1]}</span>${isCoastal(s) ? `<span>⚓ ${L('Kıyı', 'Coastal')}</span>` : ''}</div>
    <div class="bicons">${bIcons(s) || `<span class="muted small">${L('Henüz bina yok', 'No buildings yet')}</span>`}</div>
    ${s.q ? `<div class="qline small">🏗️ ${esc(BUILDINGS[s.q.k].ad(s))} ${ROMAN[s.q.lvl]} · ${s.q.left} ${L('gün', 'days')}${bar(s.q.tot - s.q.left, s.q.tot)}</div>` : ''}
    ${s.siege ? `<div class="bad small">🔥 ${L('KUŞATMADA', 'UNDER SIEGE')}</div>` : ''}</button>`;
}
function settBuildingsLine(s) {
  const ic = bIcons(s);
  return ic ? `<div class="card inner"><p class="small muted">${L('Binalar', 'Buildings')}</p><div class="bicons">${ic}</div></div>` : '';
}
function speedCost(s) { if (!s.q) return 0; const B = BUILDINGS[s.q.k]; return Math.max(10, Math.round(B.cost[s.q.lvl - 1] * 0.6 * s.q.left / s.q.tot)); }
function holdPanel(p) {
  const s = G.titles[UI.hold];
  if (!s) return '';
  const mine = s.holder === p.id;
  const parts = settIncomeParts(s, p);
  let html = `<div class="card"><div class="hrow"><b>${s.kind === 'sehir' ? L('Şehir', 'City') : L('Kale', 'Castle')}${s.capital ? ' · ' + L('Başkent', 'Capital') : ''}${isCoastal(s) ? ' · ⚓' : ''}</b><button class="mini" data-goto="${s.id}">📍</button></div>
    <div class="meters"><div><small>${L('Refah', 'Prosperity')} %${Math.round((s.prosperity || 1) * 100)}</small>${bar(s.prosperity || 1, 1.6, 'hp')}</div><div><small>${L('Huzursuzluk', 'Unrest')} %${Math.round(s.unrest || 0)}</small>${bar(s.unrest || 0, 100, 'st')}</div></div>
    <p class="small">${L('Nüfus', 'Population')} ~${Math.round(s.pop || 0)}.000 · ${L('Garnizon', 'Garrison')} ${s.garrison}/${garrisonMax(s)} · ${L('Sur savunması', 'Wall defence')} ×${wallMult(s).toFixed(1)}</p>
    <div class="ibreak">${parts.map(([l, v]) => `<span>${esc(l)} <b class="${v < 0 ? 'bad' : ''}">${v > 0 ? '+' : ''}${v}</b></span>`).join('')}<span>= <b>${settIncome(s, p)}💰/${L('ay', 'mo')}</b></span></div></div>`;
  if (mine) {
    html += `<h3>🪙 ${L('Vergi oranı', 'Tax rate')}</h3><div class="seg taxseg">${TAX_NAMES().map((n, i) => `<button data-tax="${i}" class="${(s.tax ?? 1) === i ? 'on' : ''}">${n}<small>×${TAX_MULT[i]} · ${TAX_UNREST[i] > 0 ? '+' : ''}${TAX_UNREST[i]}/${L('ay', 'mo')}</small></button>`).join('')}</div>
      <p class="small muted">${L('Yüksek vergi geliri artırır ama huzursuzluğu körükler. %75 üstünde halk ayaklanabilir.', 'High taxes raise income but stoke unrest. Above 75% the people may revolt.')}</p>`;
  }
  if (s.q) html += `<div class="card inner"><b>🏗️ ${esc(BUILDINGS[s.q.k].ad(s))} ${ROMAN[s.q.lvl]}</b> · ${s.q.left} ${L('gün kaldı', 'days left')}${bar(s.q.tot - s.q.left, s.q.tot)}
    ${mine ? `<button class="wide" data-speed="${s.id}" ${p.gold < speedCost(s) ? 'disabled' : ''}>⏩ ${L(`Ustaları hızlandır (${speedCost(s)}💰): hemen bitir`, `Hurry the masons (${speedCost(s)}💰): finish now`)}</button>` : ''}</div>`;
  html += `<h3>🏗️ ${L('Binalar', 'Buildings')}</h3><div class="blist">`;
  for (const k of BKEYS) {
    const B = BUILDINGS[k], lv = bl(s, k);
    const why = mine ? canBuild(s, k) : L('Senin toprağın değil', 'Not your holding');
    const cost = lv < B.max ? buildCost(s, k) : 0;
    const off = !!why || p.gold < cost || !free(p);
    html += `<div class="brow2 ${lv ? 'has' : ''}"><span class="ri">${B.i}</span><span class="rn"><b>${esc(B.ad(s))}</b> ${lvlPips(lv, B.max)}<small>${esc(B.d(s))}</small>${lv < B.max ? `<small class="muted">${cost}💰 · ${buildDays(s, k)} ${L('gün', 'days')} · ${L('bakım', 'upkeep')} ${B.up}/${L('ay', 'mo')}${why ? ` · <em>${esc(why)}</em>` : ''}</small>` : ''}</span>
      ${mine && lv < B.max ? `<button data-build="${k}" ${off ? 'disabled' : ''}>${lv ? L('Geliştir', 'Upgrade') : L('İnşa et', 'Build')}</button>` : ''}</div>`;
  }
  html += '</div>';
  return html;
}
/* ---------- Pazar ---------- */
function marketStock(s) {
  const keys = Object.keys(ITEMS);
  const r = mulberry32(s.id.length * 977 + monthIndex() * 31 + G.settIds.indexOf(s.id) * 7);
  const n = 4 + bl(s, 'pazar') + (s.kind === 'sehir' ? 2 : 0) + (bl(s, 'liman') ? 2 : 0);
  return keys.map(k => [k, r()]).sort((a, b) => a[1] - b[1]).slice(0, Math.min(keys.length, n)).map(x => x[0]);
}
function itemPrice(s, k) { return Math.round(ITEMS[k].cost * (1 - 0.06 * bl(s, 'pazar')) * (bl(s, 'han') ? 0.95 : 1)); }
function marketHtml(s, p) {
  if (s.kind !== 'sehir' && !bl(s, 'pazar')) return `<p class="small muted">🏪 ${L('Burada pazar yok. Şehirlerde ya da pazarı olan kalelerde hediye alınır.', 'No market here. Gifts are sold in cities or castles with a market.')}</p>`;
  const stock = marketStock(s);
  return `<h3>🏪 ${BUILDINGS.pazar.ad(s)} <small class="muted">(${L('hediyeler', 'gifts')} · ${L('envanter', 'inventory')}: ${(p.inv || []).length})</small></h3><div class="recruit">${stock.map(k => {
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
    <div class="card"><h3>🎁 ${L('Envanter', 'Inventory')}</h3>${Object.keys(inv).length ? `<div class="pchips">${Object.entries(inv).map(([k, n]) => `<span class="pchip">${ITEMS[k].i} ${esc(ITEMS[k].ad)}${n > 1 ? ' ×' + n : ''}</span>`).join('')}</div>` : `<p class="small muted">${L('Boş. Şehir pazarlarından hediye alabilirsin.', 'Empty. Buy gifts at city markets.')}</p>`}
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
function tabKrallik(p) {
  const r = ownRealm(p);
  if (!r) {
    const rr = realmOf(p), l = ch(p.lordId), k = rr ? ch(rr.holder) : null;
    const sup = coupSupporters(p);
    let html = `<div class="card"><h3>${rr ? swatch(rr.color) + esc(rr.name) : L('Bağımsız', 'Independent')}</h3>
      ${k ? `<p class="small">${L('Hükümdar', 'Ruler')}: <a data-open="${k.id}">${esc(nm(k))}</a> · ${L('sana bakışı', 'opinion of you')} ${opBadge(opinion(k, p))}</p>` : ''}
      ${l && l !== k ? `<p class="small">${L('Efendin', 'Liege')}: <a data-open="${l.id}">${esc(nm(l))}</a> ${opBadge(opinion(l, p))}</p>` : ''}
      ${p.office === 'komutan' ? `<p class="small">⚔️ ${L('Görevin: kraliyet ordusunun komutanı. Ordunun maaşını taç öder; sana aylık 15💰 maaş bağlanır. Fethettiğin yerler tacındır — hükümdar dilerse sana bağışlar.', 'Your office: commander of the royal army. The crown pays your troops and you draw 15💰 a month. Your conquests belong to the crown — the ruler may grant them to you.')}</p>` : ''}
      ${isPrince(p) ? `<p class="small">🦁 ${L('Hükümdarın çocuğusun. Varis', 'You are a child of the ruler. Heir')}: ${k && heirOf(k) ? `<a data-open="${heirOf(k).id}">${esc(nm(heirOf(k)))}</a>` : '—'}</p>` : ''}</div>`;
    if (coupEligible(p)) html += `<div class="card"><h3>👑 ${L('Taç için', 'For the crown')}</h3><p class="small">${L('Sohbetlerde "Taç için beni destekle" diyerek gizlice destekçi topla. Yeterince güçlüysen darbe yap.', 'Gather secret supporters by asking "Back my claim to the throne" in conversation. When strong enough, stage a coup.')}</p>
      ${sup.length ? sup.map(x => personLine(x, p)).join('') : `<p class="small muted">${L('Henüz destekçin yok.', 'No supporters yet.')}</p>`}</div>`;
    const dec = decisionButtons(p);
    if (dec) html += `<h3>📜 ${L('Kararlar', 'Decisions')}</h3><div class="acts">${dec}</div>`;
    html += `<p class="small muted">${L('Kendi krallığın olduğunda burada meclis, yasalar ve diplomasi açılır.', 'Once you rule a realm, the council, laws and diplomacy open here.')}</p>`;
    return html;
  }
  const lw = law(), vas = vassalsOf(p), hs = realmSettlements(r);
  const allies = alliesOf(r), wars = enemiesOf(r);
  const stab = stabilityOf(p);
  let html = `<div class="card"><h3>${swatch(r.color)} ${esc(r.name)}</h3>
    <div class="kstats"><div><b>${hs.length}</b><small>${L('yerleşim', 'holdings')}</small></div><div><b>${vas.length}</b><small>${L('vasal', 'vassals')}</small></div><div><b class="${stab < -10 ? 'bad' : stab > 15 ? 'good' : ''}">${stab > 0 ? '+' : ''}${stab}</b><small>${L('istikrar', 'stability')}</small></div><div><b>${income(p)}💰</b><small>${L('aylık gelir', 'monthly')}</small></div><div><b>${Math.round(p.prestige)}</b><small>${L('meşruiyet', 'legitimacy')}</small></div></div>
    <p class="small">${L('Müttefikler', 'Allies')}: ${allies.map(a => swatch(a.color) + esc(a.name)).join(', ') || L('yok', 'none')} · ${L('Savaşlar', 'Wars')}: ${wars.map(a => swatch(a.color) + esc(a.name)).join(', ') || L('yok', 'none')}</p>
    <p class="small">${L('Varis', 'Heir')}: ${heirOf(p) ? `<a data-open="${heirOf(p).id}">${esc(nm(heirOf(p)))}</a>` : `<b class="bad">${L('YOK', 'NONE')}</b>`}${G.loan ? ` · 🏦 ${L('Borç', 'Loan')} ${G.loan.amt}💰` : ''}</p></div>`;
  html += `<h3>🏛️ ${L('Meclis', 'Council')}</h3><div class="council">${Object.keys(COUNCIL).map(seat => {
    const C = COUNCIL[seat], c = councilor(seat);
    return `<button class="cseat" data-seat="${seat}"><span class="ci">${C.i}</span><span class="cn"><b>${C.ad()}</b><small>${c ? `${esc(nm(c))} · ${STATS[C.st]} ${stat(c, C.st)}` : `<em>${L('Boş — ata', 'Vacant — appoint')}</em>`}</small><small class="muted">${C.d()}</small></span></button>`;
  }).join('')}</div><p class="small muted">${L('Meclis üyesi başına aylık 3💰 maaş.', 'Each councillor draws 3💰 a month.')}</p>`;
  const lc = cooldown('law');
  html += `<h3>⚖️ ${L('Yasalar', 'Laws')} ${lc ? `<small class="muted">(${lc} ${L('ay sonra değiştirilebilir', 'months until change')})</small>` : ''}</h3>
    <p class="small">${L('Krallık vergisi (vasallardan)', 'Crown tax (from vassals)')}</p>${lawSeg('vergi', [[0, L('Hafif', 'Light'), '+10'], [1, L('Normal', 'Normal'), '±0'], [2, L('Yüksek', 'High'), '−10'], [3, L('Ezici', 'Crushing'), '−22']], lw.vergi)}
    <p class="small">${L('Asker yükümlülüğü', 'Levy obligation')}</p>${lawSeg('yukumluluk', [[0, L('Düşük', 'Low'), '+6'], [1, L('Normal', 'Normal'), '±0'], [2, L('Ağır', 'Heavy'), '−10']], lw.yukumluluk)}
    <p class="small">${L('Veraset (100 şan)', 'Succession (100 prestige)')}</p>${lawSeg('veraset', [['erkek', L('Erkek öncelikli', 'Male preference'), ''], ['esit', L('Eşit (en büyük çocuk)', 'Equal (eldest child)'), '']], lw.veraset)}
    <p class="small muted">${L('Rakamlar vasallarının sana bakışına etkidir. Vergi geliri ve ordu kapasitesini belirler.', 'The numbers show the effect on vassal opinion. They set crown income and army size.')}</p>`;
  html += `<h3>📜 ${L('Kararlar', 'Decisions')}</h3><div class="acts">${decisionButtons(p)}</div>`;
  html += `<h3>🌍 ${L('Diplomasi', 'Diplomacy')}</h3>${realms().filter(o => o !== r).sort((a, b) => realmSettlements(b).length - realmSettlements(a).length).map(o => {
    const k = ch(o.holder);
    if (!k) return '';
    const st = atWarRealms(r, o) ? `<span class="tag enemy">${L('Savaş', 'War')}</span>` : allied(r, o) ? `<span class="tag friend">${L('Pakt', 'Pact')}</span>` : '';
    return `<div class="dipl"><i class="sw big" style="background:${o.color}"></i><span class="dn"><b>${esc(o.name)}</b><small>${esc(nm(k))} · ${realmSettlements(o).length} ${L('yer', 'holdings')} · ${L('güç', 'power')} ~${Math.round(charPower(k))}</small><span class="tags">${st}</span></span>${opBadge(opinion(k, p))}
      <span class="ab"><button data-envoy="${o.id}" title="${L('Elçi gönder', 'Send envoy')}" ${p.gold < 20 || G.ap < 1 ? 'disabled' : ''}>🕊️</button><button data-dtalk="${k.id}" title="${L('Konuş', 'Talk')}">💬</button></span></div>`;
  }).join('')}<p class="small muted">🕊️ ${L('Elçi: 20💰 ve 1⚡, ilişki +12. 💬 ile pakt, barış ve daha fazlası.', 'Envoy: 20💰 and 1⚡, opinion +12. Use 💬 for pacts, peace and more.')}</p>`;
  html += `<h3>🏰 ${L('Vasallar', 'Vassals')}</h3>${vas.length ? vas.sort((a, b) => opinion(a, p) - opinion(b, p)).map(v => `<div class="dipl"><span class="dn"><a data-open="${v.id}"><b>${esc(nm(v))}</b></a><small>${settlementsOf(v).map(s => esc(s.name)).join(', ')} · ${L('güç', 'power')} ~${Math.round(charPower(v))}${v.sup ? ' · 👑?' : ''}${(has(v, 'hirsli') || has(v, 'kibirli')) && opinion(v, p) < -30 ? ' · ⚠ ' + L('isyan riski', 'revolt risk') : ''}</small></span>${opBadge(opinion(v, p))}<span class="ab"><button data-reward="${v.id}" ${p.gold < 30 ? 'disabled' : ''} title="${L('Ödüllendir (30💰)', 'Reward (30💰)')}">🎁</button></span></div>`).join('') : `<p class="small muted">${L('Vasalın yok.', 'No vassals.')}</p>`}`;
  return html;
}
function openCouncilPicker(seat) {
  const p = P(), C = COUNCIL[seat];
  const cands = councilCandidates(p).sort((a, b) => stat(b, C.st) - stat(a, C.st));
  showModal(`<div class="sheet"><button class="x" data-close>✕</button><h2>${C.i} ${C.ad()}</h2><p class="small muted">${C.d()} · ${L('Önemli yetenek', 'Key skill')}: ${STATS[C.st]}</p>
    ${cands.length ? cands.map(c => `<button class="person" data-pick="${c.id}">${avatar(c)}<div class="pi"><b>${esc(nm(c))}</b><small>${STATS[C.st]} <b>${stat(c, C.st)}</b> · ${esc(titleOf(c))}</small><div class="tags">${tagsFor(p, c)}</div></div>${opBadge(opinion(c, p))}</button>`).join('') : `<p class="muted">${L('Sarayında atanabilecek kimse yok. Sohbette insanları hizmetine davet et.', 'Nobody at your court to appoint. Invite people into your service through conversation.')}</p>`}</div>`, 'menu');
  const m = $('#modal');
  m.querySelector('[data-close]').onclick = () => { closeModal(); openDrawer('krallik'); };
  m.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => { appoint(seat, ch(+b.dataset.pick)); closeModal(); toast(L(`${nm(ch(+b.dataset.pick))} meclise atandı.`, `${nm(ch(+b.dataset.pick))} joined your council.`)); openDrawer('krallik'); saveGame(); });
}
function runDecision(id, confirmed) {
  const d = DECISION_MAP[id], p = P();
  if (!d || G.over) return;
  const why = d.req(p);
  if (why) return toast(why);
  if (d.confirm && !confirmed) return askConfirm(esc(d.d(p)), () => runDecision(id, true), () => openDrawer('krallik'));
  const msg = d.run(p);
  if (msg) log(msg, 'player');
  saveGame();
  closeDrawer();
  if (msg) resultModal(msg);
  G.terrDirty = true;
  updateHUD();
}
function bindRealmUI(root) {
  const p = P();
  root.querySelectorAll('[data-hold]').forEach(b => b.onclick = e => { e.stopPropagation(); UI.hold = b.dataset.hold; openDrawer('hold'); });
  root.querySelectorAll('[data-tax]').forEach(b => b.onclick = () => { const s = G.titles[UI.hold]; if (s && s.holder === p.id) { s.tax = +b.dataset.tax; saveGame(); renderDrawer(); updateHUD(); } });
  root.querySelectorAll('[data-build]').forEach(b => b.onclick = () => {
    const s = G.titles[UI.hold], k = b.dataset.build;
    if (!s || s.holder !== p.id || canBuild(s, k)) return;
    const c = buildCost(s, k);
    if (p.gold < c) return toast(L(`${c} altın gerekli`, `Requires ${c} gold`));
    startBuild(s, k, p);
    log(L(`🏗️ ${s.name}: ${BUILDINGS[k].ad(s)} inşaatı başladı (${c}💰).`, `🏗️ ${s.name}: construction of ${BUILDINGS[k].ad(s)} began (${c}💰).`), 'player');
    toast(L(`🏗️ Ustalar işe koyuldu: ${BUILDINGS[k].ad(s)}`, `🏗️ The masons are at work: ${BUILDINGS[k].ad(s)}`));
    saveGame(); renderDrawer(); updateHUD();
  });
  root.querySelectorAll('[data-speed]').forEach(b => b.onclick = () => { const s = G.titles[b.dataset.speed]; const c = speedCost(s); if (!s.q || p.gold < c) return; p.gold -= c; finishBuild(s); saveGame(); renderDrawer(); updateHUD(); });
  root.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { const s = G.titles[UI.sett], k = b.dataset.buy, pr = itemPrice(s, k); if (p.gold < pr) return; p.gold -= pr; addItem(p, k); toast(L(`${ITEMS[k].ad} satın aldın.`, `You bought ${ITEMS[k].ad}.`)); saveGame(); renderDrawer(); updateHUD(); });
  root.querySelectorAll('[data-seat]').forEach(b => b.onclick = () => { closeDrawer(); openCouncilPicker(b.dataset.seat); });
  root.querySelectorAll('[data-law]').forEach(b => b.onclick = () => {
    const [k, v0] = b.dataset.law.split(':'), v = k === 'veraset' ? v0 : +v0, lw = law();
    if (lw[k] === v) return;
    if (k === 'veraset') { if (p.prestige < 100) return toast(L('100 şan gerekli', 'Requires 100 prestige')); p.prestige -= 100; }
    else if (cooldown('law')) return toast(L(`Yasalar ${cooldown('law')} ay sonra yeniden değiştirilebilir.`, `Laws can be changed again in ${cooldown('law')} months.`));
    else setCooldown('law', 3);
    lw[k] = v;
    log(L('⚖️ Yeni yasa ilan edildi.', '⚖️ A new law was proclaimed.'), 'player');
    saveGame(); renderDrawer(); updateHUD();
  });
  root.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => runDecision(b.dataset.dec));
  root.querySelectorAll('[data-envoy]').forEach(b => b.onclick = () => {
    const o = G.titles[b.dataset.envoy], k = o && ch(o.holder);
    if (!k || p.gold < 20 || G.ap < 1) return;
    p.gold -= 20; G.ap -= 1;
    const g = 12 + Math.floor((stat(p, 'dip') + councilBonus('sansolye')) / 3);
    addOp(k, p, g); remember(k, p, 'hediye', 4);
    toast(L(`🕊️ Elçin ${o.name} sarayında ağırlandı. (+${g})`, `🕊️ Your envoy was received at the court of the ${o.name}. (+${g})`));
    saveGame(); renderDrawer(); updateHUD();
  });
  root.querySelectorAll('[data-dtalk]').forEach(b => b.onclick = () => { closeDrawer(); openDialogue(+b.dataset.dtalk); });
  root.querySelectorAll('[data-reward]').forEach(b => b.onclick = () => { const v = ch(+b.dataset.reward); if (!v || p.gold < 30) return; p.gold -= 30; v.gold += 30; addOp(v, p, 15); remember(v, p, 'hediye', 6); toast(L(`${nm(v)} ödülünü minnetle kabul etti. (+15)`, `${nm(v)} gratefully accepted your reward. (+15)`)); saveGame(); renderDrawer(); updateHUD(); });
}
