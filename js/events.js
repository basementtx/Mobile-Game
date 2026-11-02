'use strict';
/* =========================================================
   Crown & Dagger — Olaylar
   w(p): rastgele çıkma ağırlığı (yoksa sadece tetiklenir)
   prep(p): olay verisi (null dönerse olay iptal)
   valid(p,d): gösterilmeden önce hâlâ geçerli mi
   metin(p,d), secenekler(p,d) -> [{t, req?, f -> sonuç metni}]
   ========================================================= */

const EVENTS = {
  /* ---------- Bilgi ---------- */
  bilgi: {
    baslik: (p, d) => d.b,
    metin: (p, d) => d.m,
    secenekler: () => [{ t: L('Tamam', 'OK'), f: () => '' }],
  },

  /* ---------- NPC'lerin sana yönelik hamleleri ---------- */
  bastanTeklif: {
    baslik: () => L('🌹 Gece ziyareti', '🌹 A night visit'),
    valid: (p, d) => free(ch(d.from)) && free(p) && !p.lovers.includes(d.from),
    metin: (p, d) => {
      const c = ch(d.from);
      return L(`<b>${nm(c)}</b> gece vakti kapını çaldı. Gözlerinde açık bir arzu var.`, `<b>${nm(c)}</b> knocks on your door at night, desire plain in their eyes.`) +
        (c.spouseId ? L(' (Evli olduğunu ikiniz de biliyorsunuz.)', ' (You both know they are married.)') : '') + (p.spouseId ? L(' Senin de bir eşin var.', ' You have a spouse too.') : '');
    },
    secenekler: (p, d) => {
      const c = ch(d.from);
      const opts = [
        { t: L('İçeri al', 'Let them in'), f: () => { becomeLovers(p, c); const s = traitStress(p, { iffetli: 15, sehvetli: -10 }); return L(`Sabaha kadar ayrılmadınız. ${nm(c)} artık sevgilin.`, `You did not part until morning. ${nm(c)} is now your lover.`) + stressNote(s); } },
        { t: L('Kibarca geri çevir', 'Politely refuse'), f: () => { addOp(c, p, -10); const s = traitStress(p, { sehvetli: 10 }); return L(`${c.name} kırgın bir şekilde gitti.`, `${c.name} left, hurt.`) + stressNote(s); } },
      ];
      if (c.spouseId && ch(c.spouseId)) opts.push({
        t: L('Eşine haber ver', 'Tell their spouse'), f: () => {
          const sp = ch(c.spouseId);
          addOp(sp, p, 15); addOp(sp, c, -40); addOp(c, p, -50); c.shame += 10;
          return L(`${nm(sp)} olanları öğrendi. Sana minnettar, ama ${c.name} seni asla affetmeyecek.`, `${nm(sp)} learned what happened and is grateful to you — but ${c.name} will never forgive you.`);
        },
      });
      return opts;
    },
  },
  evlilikTeklif: {
    baslik: () => L('💍 Evlilik teklifi', '💍 A marriage proposal'),
    valid: (p, d) => free(ch(d.from)) && !p.spouseId && !ch(d.from).spouseId && isAdult(p),
    metin: (p, d) => { const c = ch(d.from); return L(`<b>${nm(c)}</b> (${c.age} yaşında, ${titleOf(c)}) seninle evlenmek istiyor. Sana bakışı: ${opinion(c, p)}.`, `<b>${nm(c)}</b> (age ${c.age}, ${titleOf(c)}) wishes to marry you. Their opinion of you: ${opinion(c, p)}.`); },
    secenekler: (p, d) => {
      const c = ch(d.from);
      return [
        { t: L('Kabul et', 'Accept'), f: () => { marry(p, c); p.prestige += 10 + c.rank * 10; return L(`Kilise çanları çaldı. ${c.name} ile evlendin! 💍`, `The bells rang. You married ${c.name}! 💍`); } },
        { t: L('Reddet', 'Refuse'), f: () => { addOp(c, p, -15); return L(`${c.name} reddedilmeyi hazmedemedi.`, `${c.name} did not take the rejection well.`); } },
      ];
    },
  },
  duelloTeklif: {
    baslik: () => L('🤺 Meydan okuma', '🤺 A challenge'),
    valid: (p, d) => free(ch(d.from)) && free(p),
    metin: (p, d) => { const c = ch(d.from); return L(`<b>${nm(c)}</b> eldivenini ayaklarının dibine fırlattı: "Onurunu kılıçla savun!"<br>Onun savaş gücü: ${stat(c, 'sav')}, seninki: ${stat(p, 'sav')}. Kazanma şansın ~%${duelChance(p, c)}.`, `<b>${nm(c)}</b> throws a gauntlet at your feet: "Defend your honour with steel!"<br>Their martial: ${stat(c, 'sav')}, yours: ${stat(p, 'sav')}. Your chance to win: ~${duelChance(p, c)}%.`); },
    secenekler: (p, d) => {
      const c = ch(d.from);
      return [
        { t: L('Kabul et', 'Accept'), f: () => { const cn = nm(c); const r = duel(p, c); return r.win === p ? L(`Kazandın! ${cn} ${r.res}. (Şan +25)`, `You won! ${cn} ${r.res}. (Prestige +25)`) : L(`Yenildin. Sen ${r.res}.`, `You lost. You ${r.res}.`); } },
        { t: L('Reddet', 'Refuse'), f: () => { p.prestige -= 15; const s = traitStress(p, { cesur: 15, korkak: -5, kibirli: 10 }); return L('Herkes arkandan "korkak" diye fısıldıyor. (Şan -15)', 'Everyone whispers "coward" behind your back. (Prestige -15)') + stressNote(s); } },
      ];
    },
  },
  santaj: {
    baslik: () => L('🐍 Şantaj', '🐍 Blackmail'),
    valid: (p, d) => free(ch(d.from)) && G.secrets.some(s => s.id === d.sid && !s.pub),
    metin: (p, d) => {
      const c = ch(d.from), s = G.secrets.find(x => x.id === d.sid);
      return L(`<b>${nm(c)}</b> kulağına eğildi: "Biliyorum... <i>${secretText(s)}</i><br>Susmam için <b>${d.amt} altın</b> istiyorum."`, `<b>${nm(c)}</b> leans close: "I know... <i>${secretText(s)}</i><br>I want <b>${d.amt} gold</b> to keep quiet."`);
    },
    secenekler: (p, d) => {
      const c = ch(d.from), s = G.secrets.find(x => x.id === d.sid);
      return [
        { t: L(`Öde (${d.amt}💰)`, `Pay (${d.amt}💰)`), req: () => p.gold >= d.amt, f: () => { p.gold -= d.amt; c.gold += d.amt; addOp(p, c, -40); return L(`Altınları verdin. ${c.name} şimdilik susacak.`, `You paid. ${c.name} will keep quiet — for now.`); } },
        { t: L('Reddet', 'Refuse'), f: () => { addOp(p, c, -30); if (chance(0.7)) { exposeSecret(s); return L('Reddettin. Ertesi gün tüm saray sırrını konuşuyordu.', 'You refused. The next day the whole court was talking about your secret.'); } return L('Reddettin. Blöf yapıyormuş, sesini çıkarmadı.', 'You refused. It was a bluff; they said nothing.'); } },
        { t: L('Onu susturmaya yemin et', 'Swear to silence them'), f: () => { addOp(p, c, -80); return L(`Bu iş burada bitmeyecek. ${c.name} artık ölümcül düşmanın. (Kişiler sekmesinden ona suikast düzenleyebilirsin.)`, `This is not over. ${c.name} is now your mortal enemy. (You can arrange their murder from the People tab.)`); } },
      ];
    },
  },
  fidye: {
    baslik: () => L('⛓️ Fidye', '⛓️ Ransom'),
    valid: (p, d) => p.prisonerOf === d.from,
    metin: (p, d) => L(`Zindanın kapısı açıldı. <b>${nm(ch(d.from))}</b>'in adamı: "Efendim serbest kalman için <b>${d.amt} altın</b> istiyor."`, `The dungeon door opens. A servant of <b>${nm(ch(d.from))}</b>: "My lord demands <b>${d.amt} gold</b> for your release."`),
    secenekler: (p, d) => [
      { t: L(`Öde (${d.amt}💰)`, `Pay (${d.amt}💰)`), req: () => p.gold >= d.amt, f: () => { p.gold -= d.amt; ch(d.from).gold += d.amt; p.prisonerOf = null; return L('Fidyeyi ödedin. Özgürsün!', 'You paid the ransom. You are free!'); } },
      { t: L('Reddet', 'Refuse'), f: () => L('Kapı yeniden kapandı. Karanlık ve rutubet...', 'The door closes again. Darkness and damp...') },
    ],
  },
  cokus: {
    baslik: () => L('😵 Ruhun çöküyor', '😵 Mental breaking point'),
    metin: () => L('Uyuyamıyorsun. Ellerin titriyor. Ölülerin yüzleri gözünün önünden gitmiyor. Bir şeyler değişmek zorunda.', 'You cannot sleep. Your hands shake. The faces of the dead will not leave you. Something has to change.'),
    secenekler: p => [
      { t: L('Şaraba sarıl', 'Turn to wine'), f: () => { addTrait(p, 'ayyas'); stress(p, -60); return L('Kadeh kadeh unuttun. Artık bir <b>ayyaş</b>sın.', 'Cup after cup, you forgot. You are now a <b>drunkard</b>.'); } },
      { t: L('Herkesten şüphelen', 'Trust no one'), f: () => { addTrait(p, 'paranoyak'); stress(p, -60); return L('Kimseye güvenmiyorsun artık. <b>Paranoyak</b> oldun.', 'You trust nobody anymore. You have become <b>paranoid</b>.'); } },
      { t: L('Kendini ibadete ver (20💰)', 'Turn to prayer (20💰)'), req: () => p.gold >= 20, f: () => { p.gold -= 20; addTrait(p, 'dindar'); stress(p, -50); return L('Manastırda günlerce dua ettin. Huzuru Tanrı\'da buldun. (<b>Dindar</b>)', 'You prayed for days in a monastery and found peace in God. (<b>Pious</b>)'); } },
      { t: L('Öfkeni birilerinden çıkar', 'Take it out on someone'), f: () => { addTrait(p, 'zalim'); p.dread += 15; stress(p, -60); return L('Bir hizmetkârı kırbaçlattın, bir köpeği öldürdün. Rahatladın. Artık <b>zalim</b>sin.', 'You had a servant flogged and killed a dog. You feel better. You are now <b>cruel</b>.'); } },
    ],
  },

  barisTeklif: {
    baslik: () => L('🕊️ Barış elçisi', '🕊️ An envoy of peace'),
    valid: (p, d) => { const r = G.titles[d.r], mine = ownRealm(p); return r && mine && !r.dead && atWarRealms(mine, r); },
    metin: (p, d) => { const r = G.titles[d.r]; return L(`<b>${r.name}</b> elçisi huzuruna çıktı: "Hükümdarım ${nm(ch(r.holder))} bu kan dökülmesine son vermek istiyor. Barış teklif ediyoruz."`, `An envoy of the <b>${r.name}</b> comes before you: "My sovereign ${nm(ch(r.holder))} wishes to end this bloodshed. We offer peace."`); },
    secenekler: (p, d) => {
      const r = G.titles[d.r];
      return [
        { t: L('Barışı kabul et', 'Accept peace'), f: () => { makePeace(ownRealm(p), r); return L('Barış imzalandı. Ordular evlerine dönüyor.', 'Peace is signed. The armies return home.'); } },
        { t: L('Haraç iste (barış + 100💰)', 'Demand tribute (peace + 100💰)'), f: () => { const k = ch(r.holder); if (k && k.gold >= 100 && chance(0.5)) { k.gold -= 100; p.gold += 100; makePeace(ownRealm(p), r); return L('Haracı ödediler. Barış ve 100 altın!', 'They paid the tribute. Peace and 100 gold!'); } return L('Elçi öfkeyle gitti. Savaş sürüyor.', 'The envoy left in anger. The war goes on.'); } },
        { t: L('Reddet', 'Refuse'), f: () => L('Elçiyi kovdun. Savaş sürecek.', 'You sent the envoy away. The war will continue.') },
      ];
    },
  },

  /* ---------- Rastgele olaylar ---------- */
  dilenci: {
    w: () => 1,
    baslik: () => L('🥣 Bir dilenci', '🥣 A beggar'),
    metin: () => L('Paçavralar içinde bir dilenci yolunu kesti. Elleri titriyor: "Bir lokma ekmek için, efendim..."', 'A beggar in rags blocks your way, hands trembling: "A crust of bread, my lord..."'),
    secenekler: p => [
      { t: L('Birkaç altın ver (5💰)', 'Give a few coins (5💰)'), req: () => p.gold >= 5, f: () => { p.gold -= 5; p.prestige += 3; const s = traitStress(p, { merhametli: -5, acgozlu: 5 }); return L('Dilenci ellerini öptü. (Şan +3)', 'The beggar kissed your hands. (Prestige +3)') + stressNote(s); } },
      { t: L('Görmezden gel', 'Ignore them'), f: () => { const s = traitStress(p, { merhametli: 10 }); return L('Yürüdün geçtin.', 'You walked on by.') + stressNote(s); } },
      { t: L('Kırbaçlat', 'Have them whipped'), req: () => p.rank >= 2, f: () => { p.dread += 3; p.prestige -= 2; const s = traitStress(p, { merhametli: 15, zalim: -5 }); return L('Adamların dilenciyi kırbaçladı. Kalabalık sessizce dağıldı. (Korku +3)', 'Your men whipped the beggar. The crowd quietly dispersed. (Dread +3)') + stressNote(s); } },
    ],
  },
  kumar: {
    w: () => 1,
    baslik: () => L('🎲 Zar masası', '🎲 The dice table'),
    metin: () => L('Meyhanenin köşesinde yüksek bahisli bir zar oyunu dönüyor. Oyunculardan biri sana el sallıyor.', 'In the corner of the tavern a high-stakes dice game is under way. One of the players waves you over.'),
    secenekler: p => [
      { t: L('Oyna (10💰)', 'Play (10💰)'), req: () => p.gold >= 10, f: () => { if (chance(0.45)) { p.gold += 15; return L('Zarlar seni sevdi! <b>+15 altın</b>.', 'The dice love you! <b>+15 gold</b>.'); } p.gold -= 10; return L('Zarlar acımasızdı. <b>-10 altın</b>.', 'The dice were cruel. <b>-10 gold</b>.'); } },
      { t: L('Hile yap (10💰)', 'Cheat (10💰)'), req: () => p.gold >= 10, f: () => { if (chance(0.3 + stat(p, 'ent') * 0.04)) { p.gold += 30; return L('Hileli zarların işe yaradı. <b>+30 altın</b>!', 'Your loaded dice worked. <b>+30 gold</b>!'); } p.gold -= 10; p.health -= 15; p.shame += 5; return L('Yakalandın! Dayak yedin ve sokağa atıldın. (Sağlık -15)', 'Caught! You were beaten and thrown into the street. (Health -15)'); } },
      { t: L('Geç', 'Pass'), f: () => L('Kumara bulaşmadın.', 'You stayed away from the gambling.') },
    ],
  },
  eskiyalar: {
    w: () => 1,
    baslik: () => L('🏹 Eşkıya baskını', '🏹 Bandit ambush'),
    metin: () => L('Ormanın içinden geçerken dört silahlı eşkıya önünü kesti. "Keseyi ver, canını kurtar!"', 'Passing through a forest, four armed bandits block your way. "Your purse or your life!"'),
    secenekler: p => [
      { t: L('Savaş', 'Fight'), f: () => { if (chance((30 + stat(p, 'sav') * 5) / 100)) { const g = rnd(5, 20); p.gold += g; p.prestige += 10; return L(`Kılıcını çektin ve ikisini yere serdin. Diğerleri kaçtı. Üzerlerinden ${g} altın çıktı. (Şan +10)`, `You drew your sword and cut down two of them. The rest fled. You found ${g} gold on them. (Prestige +10)`); } p.health -= 25; const l = Math.floor(p.gold / 2); p.gold -= l; if (p.health <= 0) { die(p, L('Eşkıyalar tarafından öldürüldü', 'Killed by bandits')); return L('Eşkıyaların kılıçları seni buldu...', 'The bandits\' blades found you...'); } return L(`Yenildin. Seni dövüp ${l} altınını aldılar. (Sağlık -25)`, `You lost. They beat you and took ${l} gold. (Health -25)`); } },
      { t: L('Keseyi ver', 'Hand over the purse'), f: () => { const l = Math.min(p.gold, 15); p.gold -= l; return L(`${l} altın verdin. Canın kurtuldu.`, `You gave them ${l} gold and kept your life.`); } },
      { t: L('Kaç', 'Run'), f: () => { const s = traitStress(p, { cesur: 10, kibirli: 5 }); if (chance(0.7)) return L('Atını mahmuzladın ve kurtuldun.', 'You spurred your horse and escaped.') + stressNote(s); p.health -= 10; return L('Kaçarken bir ok omzuna saplandı. (Sağlık -10)', 'An arrow struck your shoulder as you fled. (Health -10)') + stressNote(s); } },
    ],
  },
  hanci: {
    w: p => (isAdult(p) && !p.prisonerOf ? (has(p, 'sehvetli') ? 1.5 : 0.7) : 0),
    prep: p => {
      const n = makeChar({ female: !p.female, age: rnd(18, 30), rank: 0, lordId: p.lordId, gold: rnd(2, 8), cul: localCulture(), traits: ['sehvetli', 'guzel', pick(['kurnaz', 'durust', 'cesur', 'comert'])] });
      addOp(n, p, 30);
      return { from: n.id };
    },
    baslik: () => L('🍷 Hancının gözdesi', '🍷 The innkeeper\'s favourite'),
    metin: (p, d) => { const n = ch(d.from); return L(`Handa kaldığın gece, <b>${n.name}</b> şarabını doldururken eli elinde biraz fazla oyalandı. Fısıldadı: "Odamın kapısı açık olacak..."`, `The night you stay at the inn, <b>${n.name}</b> lingers a little too long while pouring your wine and whispers: "My door will be open..."`); },
    secenekler: (p, d) => {
      const n = ch(d.from);
      return [
        { t: L('O kapıdan gir', 'Walk through that door'), f: () => { becomeLovers(p, n); const s = traitStress(p, { iffetli: 15, sehvetli: -15 }); return L(`Unutulmaz bir geceydi. ${n.name} artık sevgilin.`, `An unforgettable night. ${n.name} is now your lover.`) + (p.spouseId ? L(' Eşin bunu asla öğrenmemeli...', ' Your spouse must never find out...') : '') + stressNote(s); } },
        { t: L('Kendi odana çekil', 'Retire to your room'), f: () => { const s = traitStress(p, { sehvetli: 10, iffetli: -5 }); return L('Kapını kilitledin.', 'You locked your door.') + stressNote(s); } },
      ];
    },
  },
  sirSatici: {
    w: p => (G.secrets.some(s => !s.pub && !knows(p, s) && s.actor !== p.id) ? 0.8 : 0),
    prep: p => { const l = G.secrets.filter(s => !s.pub && !knows(p, s) && s.actor !== p.id && ch(s.actor) && ch(s.actor).alive); return l.length ? { sid: pick(l).id } : null; },
    valid: (p, d) => G.secrets.some(s => s.id === d.sid),
    baslik: () => L('🕯️ Gizemli yabancı', '🕯️ A mysterious stranger'),
    metin: (p, d) => { const s = G.secrets.find(x => x.id === d.sid); return L(`Kapüşonlu bir yabancı yanına oturdu: "<b>${nm(ch(s.actor))}</b> hakkında çok ilginç bir şey biliyorum. Fiyatı 20 altın."`, `A hooded stranger sits beside you: "I know something very interesting about <b>${nm(ch(s.actor))}</b>. The price is 20 gold."`); },
    secenekler: (p, d) => [
      { t: L('Satın al (20💰)', 'Buy it (20💰)'), req: () => p.gold >= 20, f: () => { p.gold -= 20; const s = G.secrets.find(x => x.id === d.sid); learn(p, s); return L(`Yabancı fısıldadı:<br><i>${secretText(s)}</i>`, `The stranger whispers:<br><i>${secretText(s)}</i>`); } },
      { t: L('Reddet', 'Refuse'), f: () => L('Yabancı omuz silkti ve karanlığa karıştı.', 'The stranger shrugged and vanished into the dark.') },
    ],
  },
  vergiGorevi: {
    w: p => (p.rank >= 1 && p.rank <= 2 && free(ch(p.lordId)) && free(p) ? 1 : 0),
    baslik: () => L('🪙 Vergi görevi', '🪙 Tax duty'),
    metin: p => L(`Efendin <b>${nm(ch(p.lordId))}</b> seni köylerden vergi toplamakla görevlendirdi. Torbalar ağır... ve kimse saymıyor.`, `Your liege <b>${nm(ch(p.lordId))}</b> has tasked you with collecting taxes from the villages. The sacks are heavy... and nobody is counting.`),
    secenekler: p => {
      const l = ch(p.lordId);
      return [
        { t: L('Dürüstçe teslim et', 'Hand it over honestly'), f: () => { addOp(l, p, 12); p.prestige += 5; const s = traitStress(p, { acgozlu: 5, durust: -5 }); return L(`${l.name} sadakatinden memnun. (+12 ilişki)`, `${l.name} is pleased with your loyalty. (+12 opinion)`) + stressNote(s); } },
        { t: L('Bir kısmını cebe at', 'Pocket some of it'), f: () => { const g = rnd(15, 30); p.gold += g; const known = [p.id]; if (chance(0.25)) known.push(l.id); addSecret('zimmet', p.id, l.id, known); const s = traitStress(p, { durust: 15, acgozlu: -5 }); return L(`<b>${g} altın</b> kendi kesene kaydı.`, `<b>${g} gold</b> slipped into your own purse.`) + (known.length > 1 ? L(' Ama bir kâtip hesapları fark etti...', ' But a clerk noticed the accounts...') : '') + stressNote(s); } },
      ];
    },
  },
  hastalik: {
    w: p => (p.age > 30 ? 0.6 : 0.3),
    prep: p => { p.health -= 20; return {}; },
    baslik: () => L('🤒 Ateşli hastalık', '🤒 A fever'),
    metin: () => L('Ateşin yükseldi, öksürüğün dinmiyor. Bu iyiye işaret değil. (Sağlık -20)', 'Your fever rises and the cough will not stop. This is not a good sign. (Health -20)'),
    secenekler: p => [
      { t: L('Şifacı çağır (15💰)', 'Call a healer (15💰)'), req: () => p.gold >= 15, f: () => { p.gold -= 15; p.health = Math.min(100, p.health + 20); return L('Şifacının iksirleri iyi geldi. (Sağlık +20)', 'The healer\'s potions helped. (Health +20)'); } },
      { t: L('Dua et', 'Pray'), f: () => { if (chance(has(p, 'dindar') ? 0.7 : 0.4)) { p.health += 10; return L('Ateşin düştü. Tanrı seni duydu. (Sağlık +10)', 'The fever broke. God heard you. (Health +10)'); } return L('Dualarına cevap gelmedi.', 'Your prayers went unanswered.'); } },
      { t: L('Dişini sık', 'Grit your teeth'), f: () => (chance(0.5) ? L('Atlattın.', 'You pulled through.') : (p.health -= 10, L('Kötüleştin. (Sağlık -10)', 'You got worse. (Health -10)'))) },
    ],
  },
  tuccarRusvet: {
    w: p => (p.rank >= 3 && free(p) ? 0.8 : 0),
    baslik: () => L('💼 Tüccarın teklifi', '💼 A merchant\'s offer'),
    metin: () => L('Şişman bir tüccar, topraklarındaki tuz ticaretinin tekelini istiyor. Masaya ağır bir kese bıraktı: "Küçük bir... teşekkür."', 'A fat merchant wants the salt monopoly in your lands. He drops a heavy purse on the table: "A small... token of thanks."'),
    secenekler: p => [
      { t: L('Keseyi al (+40💰)', 'Take the purse (+40💰)'), f: () => { p.gold += 40; const k = [p.id]; if (chance(0.3) && p.lordId) k.push(p.lordId); addSecret('rusvet', p.id, null, k); const s = traitStress(p, { durust: 15, acgozlu: -10 }); return L('Kese ağırdı. Kimse bilmeyecek... umarım.', 'The purse was heavy. Nobody will know... hopefully.') + stressNote(s); } },
      { t: L('Reddet', 'Refuse'), f: () => { p.prestige += 5; const s = traitStress(p, { durust: -5, acgozlu: 10 }); return L('Tüccarı kapı dışarı ettin. (Şan +5)', 'You threw the merchant out. (Prestige +5)') + stressNote(s); } },
    ],
  },
  koyluIsyani: {
    w: p => (p.rank >= 3 && free(p) ? 0.6 : 0),
    baslik: () => L('🔥 Köylü ayaklanması', '🔥 Peasant uprising'),
    metin: () => L('Açlıktan bunalan köylüler dirgen ve meşalelerle değirmeni bastı. Yüzlerce kişi kalenin önünde bağırıyor.', 'Starving peasants with pitchforks and torches have stormed the mill. Hundreds are shouting before your castle.'),
    secenekler: p => [
      { t: L('Kılıçtan geçir', 'Put them to the sword'), f: () => { p.dread += 15; p.prestige -= 5; const s = traitStress(p, { merhametli: 25, zalim: -10 }); return L('Şövalyelerin meydanı kana buladı. Kimse bir daha sesini çıkarmayacak. (Korku +15)', 'Your knights drenched the square in blood. Nobody will speak up again. (Dread +15)') + stressNote(s); } },
      { t: L('Taleplerini karşıla (30💰)', 'Meet their demands (30💰)'), req: () => p.gold >= 30, f: () => { p.gold -= 30; p.prestige += 10; const s = traitStress(p, { merhametli: -10, acgozlu: 10 }); return L('Ambarları açtın. Köylüler adını dualarla anıyor. (Şan +10)', 'You opened the granaries. The peasants bless your name. (Prestige +10)') + stressNote(s); } },
      { t: L('Elebaşını astır', 'Hang the ringleader'), f: () => { p.dread += 7; const s = traitStress(p, { merhametli: 10 }); return L('Elebaşı darağacında sallanırken kalabalık dağıldı. (Korku +7)', 'As the ringleader swung from the gallows, the crowd dispersed. (Dread +7)') + stressNote(s); } },
    ],
  },
  hazine: {
    w: () => 0.4,
    baslik: () => L('💎 Gömülü hazine', '💎 Buried treasure'),
    metin: () => L('Eski bir kilise yıkıntısında, taşların arasında paslı bir sandık buldun. İçinde parlayan sikkeler var!', 'In the ruins of an old church you found a rusty chest among the stones. It is full of shining coins!'),
    secenekler: p => [
      { t: L('Hepsini al', 'Take it all'), f: () => { const g = rnd(20, 50); p.gold += g; const s = traitStress(p, { comert: 5, acgozlu: -5 }); return L(`<b>${g} altın!</b>`, `<b>${g} gold!</b>`) + stressNote(s); } },
      { t: L('Yarısını yoksullara dağıt', 'Give half to the poor'), f: () => { const g = rnd(10, 25); p.gold += g; p.prestige += 15; const s = traitStress(p, { comert: -10, merhametli: -5, acgozlu: 10 }); return L(`${g} altın aldın, gerisini dağıttın. Halk seni seviyor. (Şan +15)`, `You kept ${g} gold and gave away the rest. The people love you. (Prestige +15)`) + stressNote(s); } },
    ],
  },
  kehanet: {
    w: () => 0.4,
    baslik: () => L('🔮 Kör kâhin', '🔮 The blind seer'),
    metin: () => L('Yaşlı, kör bir kadın kolunu yakaladı: "Senin kaderini görüyorum... taç mı, ip mi?"', 'An old blind woman grabs your arm: "I see your fate... the crown, or the noose?"'),
    secenekler: p => [
      { t: L('Dinle', 'Listen'), f: () => (chance(0.5) ? (p.prestige += 10, L('"Başında bir taç görüyorum." Söz saraya yayıldı. (Şan +10)', '"I see a crown upon your head." Word spread through the court. (Prestige +10)')) : (stress(p, 15), L('"Seni en sevdiğin biri arkandan bıçaklayacak." Uykuların kaçtı. (Stres +15)', '"One you love most will stab you in the back." You cannot sleep. (Stress +15)'))) },
      { t: L('Kov', 'Send her away'), f: () => L('Kadını itip yoluna devam ettin.', 'You pushed her aside and went on your way.') },
      { t: L('Cadı diye yaktır', 'Burn her as a witch'), req: () => p.rank >= 2, f: () => { p.dread += 10; const s = traitStress(p, { merhametli: 20, zalim: -5, dindar: -5 }); return L('Alevler yükselirken kadın gülüyordu. (Korku +10)', 'She was laughing as the flames rose. (Dread +10)') + stressNote(s); } },
    ],
  },
  ruhban: {
    w: p => (G.secrets.some(s => s.actor === p.id && !s.pub) ? 0.6 : 0),
    baslik: () => L('⛪ Günah çıkarma', '⛪ Confession'),
    metin: () => L('Köyün rahibi seni kenara çekti: "Ruhun ağır görünüyor evladım. Günahlarını itiraf etmek ister misin?"', 'The village priest takes you aside: "Your soul looks heavy, my child. Would you confess your sins?"'),
    secenekler: p => [
      { t: L('İtiraf et', 'Confess'), f: () => { stress(p, -25); if (chance(0.15)) { const s = G.secrets.find(x => x.actor === p.id && !x.pub); exposeSecret(s); return L('İçin rahatladı... ama rahip ağzını tutamadı. Sırrın herkesin dilinde!', 'You felt lighter... but the priest could not hold his tongue. Everyone knows your secret!'); } return L('İçin rahatladı. Rahip sırrını saklayacak. (Stres -25)', 'You feel lighter. The priest will keep your secret. (Stress -25)'); } },
      { t: L('Yalan söyle', 'Lie'), f: () => { const s = traitStress(p, { durust: 10, dindar: 10, kurnaz: -5 }); return L('"Hiçbir günahım yok peder."', '"I have no sins, Father."') + stressNote(s); } },
    ],
  },
  sarap: {
    w: p => (p.stress > 30 ? 0.8 : 0.3),
    baslik: () => L('🍷 Uzun bir gece', '🍷 A long night'),
    metin: () => L('Arkadaşların seni bir içki âlemine çağırıyor. Dertlerini unutmak için iyi bir fırsat.', 'Your friends invite you to a night of drinking. A good chance to forget your troubles.'),
    secenekler: p => [
      { t: L('Kadehleri doldur', 'Fill the cups'), f: () => { stress(p, -20); if (chance(0.12)) { addTrait(p, 'ayyas'); return L('Sabaha kadar içtin... ve bu bir alışkanlık oluyor. (<b>Ayyaş</b>, Stres -20)', 'You drank till dawn... and it is becoming a habit. (<b>Drunkard</b>, Stress -20)'); } return L('Gülmekten karnın ağrıdı. (Stres -20)', 'You laughed until your sides hurt. (Stress -20)'); } },
      { t: L('Kibarca reddet', 'Politely decline'), f: () => L('Erken yattın.', 'You went to bed early.') },
    ],
  },
  genelev: {
    w: p => (isAdult(p) && has(p, 'sehvetli') && free(p) ? 0.8 : 0),
    baslik: () => L('🏮 Kırmızı fenerli ev', '🏮 The house of red lanterns'),
    metin: () => L('Şehrin arka sokaklarında, pencereleri kırmızı fenerlerle aydınlanan bir ev. Kapıdaki kadın göz kırpıyor.', 'In the back streets, a house with red lanterns in its windows. The woman at the door winks.'),
    secenekler: p => [
      { t: L('İçeri gir (8💰)', 'Go inside (8💰)'), req: () => p.gold >= 8, f: () => { p.gold -= 8; stress(p, -25); if (chance(0.1)) { p.health -= 20; return L('Harika bir geceydi... ama birkaç hafta sonra utanç verici bir hastalık baş gösterdi. (Sağlık -20)', 'A wonderful night... but a few weeks later an embarrassing illness appeared. (Health -20)'); } if (p.spouseId && chance(0.2)) { const sp = ch(p.spouseId); addOp(sp, p, -30); return L(`Keyifli bir geceydi. Ama eşin ${sp.name} bir şeyler duymuş... (-30 ilişki)`, `A pleasant night. But your spouse ${sp.name} heard something... (-30 opinion)`); } return L('Keyifli bir geceydi. (Stres -25)', 'A pleasant night. (Stress -25)'); } },
      { t: L('Yürü git', 'Walk away'), f: () => { const s = traitStress(p, { sehvetli: 10 }); return L('Kendine hâkim oldun.', 'You controlled yourself.') + stressNote(s); } },
    ],
  },
  yetim: {
    w: p => (isAdult(p) ? 0.4 : 0),
    prep: p => { const k = makeChar({ age: rnd(4, 9), rank: 0, gold: 0, lordId: p.id, cul: localCulture() }); return { kid: k.id }; },
    baslik: () => L('🧒 Yetim çocuk', '🧒 An orphan'),
    metin: (p, d) => { const k = ch(d.kid); return L(`Yol kenarında, ailesi vebadan ölmüş ${k.age} yaşında bir ${k.female ? 'kız' : 'oğlan'} çocuğu buldun. Adı ${k.name}. Sana kocaman gözlerle bakıyor.`, `By the roadside you found a ${k.age}-year-old ${k.female ? 'girl' : 'boy'} whose family died of plague. Their name is ${k.name}. They look up at you with huge eyes.`); },
    secenekler: (p, d) => {
      const k = ch(d.kid);
      return [
        { t: L('Evlat edin (10💰)', 'Adopt (10💰)'), req: () => p.gold >= 10, f: () => { p.gold -= 10; k.dyn = p.dyn; k.adopted = true; if (p.female) k.motherId = p.id; else k.fatherId = p.id; p.children.push(k.id); k.baseRank = p.rank >= 2 ? 2 : 0; recalcRank(k); k.lordId = p.titles.length ? p.id : p.lordId; addOp(k, p, 60); const s = traitStress(p, { merhametli: -15, comert: -5 }); return L(`${k.name} artık bir ${p.dyn}. Mirasçıların arasında.`, `${k.name} is now a ${p.dyn}, and among your heirs.`) + stressNote(s); } },
        { t: L('Manastıra bırak', 'Leave them at a monastery'), f: () => { k.lordId = null; return L('Rahibeler çocuğa bakacak.', 'The nuns will look after the child.'); } },
        { t: L('Köle tüccarına sat', 'Sell to a slaver'), f: () => { p.gold += 15; p.dread += 3; k.lordId = null; const s = traitStress(p, { merhametli: 30, zalim: -5, acgozlu: -5 }); return L('15 altın kazandın. Çocuğun ağlaması kulaklarında çınlıyor.', 'You made 15 gold. The child\'s crying still rings in your ears.') + stressNote(s); } },
      ];
    },
  },
  fisilti: {
    w: p => (G.secrets.some(s => !s.pub && !knows(p, s) && (familyRel(p, ch(s.actor)) || s.actor === p.lordId || (ch(s.target) && familyRel(p, ch(s.target))))) ? 1 : 0),
    prep: p => { const l = G.secrets.filter(s => !s.pub && !knows(p, s) && (familyRel(p, ch(s.actor)) || s.actor === p.lordId || (ch(s.target) && familyRel(p, ch(s.target))))); return l.length ? { sid: pick(l).id } : null; },
    valid: (p, d) => G.secrets.some(s => s.id === d.sid),
    baslik: () => L('👂 Hizmetkârın fısıltısı', '👂 A servant\'s whisper'),
    metin: () => L('Genç bir hizmetkâr etrafına bakınarak yanına geldi: "Efendim... size söylemem gereken bir şey var. Ama karşılığında..."', 'A young servant approaches, glancing around: "My lord... there is something I must tell you. But in return..."'),
    secenekler: (p, d) => [
      { t: L('Dinle (5💰)', 'Listen (5💰)'), req: () => p.gold >= 5, f: () => { p.gold -= 5; const s = G.secrets.find(x => x.id === d.sid); learn(p, s); return L(`Hizmetkâr fısıldadı:<br><i>${secretText(s)}</i>`, `The servant whispers:<br><i>${secretText(s)}</i>`); } },
      { t: L('Dedikoduyla işim olmaz', 'I have no time for gossip'), f: () => L('Hizmetkâr başını eğip uzaklaştı.', 'The servant bowed and slipped away.') },
    ],
  },
  sefer: {
    w: p => (p.rank >= 1 && p.rank <= 3 && free(ch(p.lordId)) && free(p) && isAdult(p) ? 0.7 : 0),
    baslik: () => L('🐎 Yağma seferi', '🐎 A raid'),
    metin: p => L(`Efendin <b>${nm(ch(p.lordId))}</b> komşu topraklara bir yağma seferi düzenliyor ve seni de çağırıyor.`, `Your liege <b>${nm(ch(p.lordId))}</b> is leading a raid into neighbouring lands and summons you.`),
    secenekler: p => {
      const l = ch(p.lordId);
      return [
        { t: L('Katıl', 'Join'), f: () => { const r = Math.random(); if (r < 0.03) { die(p, L('Yağma seferinde bir okla vuruldu', 'Shot by an arrow during a raid')); return L('Bir ok boğazını buldu...', 'An arrow found your throat...'); } let m; if (chance((40 + stat(p, 'sav') * 4) / 100)) { const g = rnd(20, 50); p.gold += g; p.prestige += 30; addOp(l, p, 10); m = L(`Köyler yandı, sandıklar boşaldı. <b>${g} altın</b> ve şan kazandın. (Şan +30)`, `Villages burned and chests were emptied. You won <b>${g} gold</b> and glory. (Prestige +30)`); } else { p.prestige += 5; m = L('Sefer hayal kırıklığıydı. Eli boş döndün.', 'The raid was a disappointment. You came back empty-handed.'); } if (chance(0.25)) { p.health -= 20; m += L(' Ayrıca yaralandın. (Sağlık -20)', ' You were also wounded. (Health -20)'); } const s = traitStress(p, { merhametli: 15, zalim: -5 }); return m + stressNote(s); } },
        { t: L('Hastalık bahanesiyle kal', 'Feign illness and stay'), f: () => { addOp(l, p, -15); const s = traitStress(p, { cesur: 10, korkak: -5 }); return L(`${l.name} bahaneni yutmadı. (-15 ilişki)`, `${l.name} did not believe your excuse. (-15 opinion)`) + stressNote(s); } },
      ];
    },
  },
  askMektubu: {
    w: p => (isAdult(p) ? 0.6 : 0),
    prep: p => {
      const l = living().filter(x => x.id !== p.id && isAdult(x) && free(x) && x.female !== p.female && !closeKin(p, x) && !p.lovers.includes(x.id) && x.spouseId !== p.id && opinion(x, p) > 30);
      return l.length ? { from: pick(l).id } : null;
    },
    valid: (p, d) => free(ch(d.from)),
    baslik: () => L('💌 Mühürlü mektup', '💌 A sealed letter'),
    metin: (p, d) => { const c = ch(d.from); return L(`Odanda mühürlü bir mektup buldun. <b>${nm(c)}</b> yazmış: "Gözlerini her gördüğümde nefesim kesiliyor..."`, `You find a sealed letter in your room, from <b>${nm(c)}</b>: "Every time I see your eyes, I cannot breathe..."`) + (c.spouseId ? L(' (Yazan evli!)', ' (The writer is married!)') : ''); },
    secenekler: (p, d) => {
      const c = ch(d.from);
      return [
        { t: L('Gizlice buluş', 'Meet in secret'), f: () => { becomeLovers(p, c); return L(`Gece bahçede buluştunuz. ${c.name} artık sevgilin.`, `You met in the garden at night. ${c.name} is now your lover.`); } },
        { t: L('Mektubu yak', 'Burn the letter'), f: () => L('Mektup alevlerde kıvrılarak yok oldu.', 'The letter curled up in the flames and was gone.') },
        { t: L('Mektubu herkese göster', 'Show the letter to everyone'), f: () => { c.shame += 15; c.prestige -= 15; addOp(c, p, -60); return L(`Saray kahkahalarla çınladı. ${c.name} rezil oldu ve sana kin besliyor. (-60 ilişki)`, `The court rang with laughter. ${c.name} was humiliated and now holds a grudge. (-60 opinion)`); } },
      ];
    },
  },
  cocukEgitimi: {
    w: p => (p.children.some(id => { const k = ch(id); return k && k.alive && k.age >= 6 && k.age <= 15; }) ? 0.7 : 0),
    prep: p => { const l = p.children.map(ch).filter(k => k && k.alive && k.age >= 6 && k.age <= 15); return l.length ? { kid: pick(l).id } : null; },
    valid: (p, d) => ch(d.kid) && ch(d.kid).alive,
    baslik: () => L('🧒 Çocuğun eğitimi', '🧒 A child\'s education'),
    metin: (p, d) => { const k = ch(d.kid); return L(`${k.age} yaşındaki ${k.name} büyüyor. Onu kim yetiştirecek?`, `${k.name}, age ${k.age}, is growing up. Who will raise them?`); },
    secenekler: (p, d) => {
      const k = ch(d.kid);
      return [
        { t: L('Kendin eğit', 'Educate them yourself'), f: () => { const pers = p.traits.filter(t => TRAITS[t].kisilik); if (pers.length) { const t = pick(pers); addTrait(k, t); addOp(k, p, 20); return L(`${k.name} sana benziyor. <b>${TRAITS[t].ad}</b> özelliğini kazandı.`, `${k.name} takes after you and became <b>${TRAITS[t].ad}</b>.`); } return L('Elinden geleni yaptın.', 'You did your best.'); } },
        { t: L('Usta bir hoca tut (20💰)', 'Hire a master tutor (20💰)'), req: () => p.gold >= 20, f: () => { p.gold -= 20; const s = pick(Object.keys(STATS)); k.base[s] += 3; return L(`Hoca işini iyi yaptı. ${k.name}: ${STATS[s]} +3.`, `The tutor did well. ${k.name}: ${STATS[s]} +3.`); } },
        { t: L('Kendi hâline bırak', 'Leave them be'), f: () => { addOp(k, p, -15); return L(`${k.name} ihmal edildiğini hissediyor.`, `${k.name} feels neglected.`); } },
      ];
    },
  },
  sovalyelikIstek: {
    w: p => (p.rank >= 3 && living().some(x => x.lordId === p.id && x.baseRank === 1 && !x.titles.length && free(x)) ? 0.6 : 0),
    prep: p => { const l = living().filter(x => x.lordId === p.id && x.baseRank === 1 && !x.titles.length && free(x)); return l.length ? { from: pick(l).id } : null; },
    valid: (p, d) => free(ch(d.from)),
    baslik: () => L('⚔️ Şövalyelik talebi', '⚔️ A plea for knighthood'),
    metin: (p, d) => L(`Askerlerinden <b>${nm(ch(d.from))}</b> önünde diz çöktü: "Yıllardır sancağınız için kan döküyorum. Beni şövalye yapın!"`, `One of your soldiers, <b>${nm(ch(d.from))}</b>, kneels before you: "For years I have bled for your banner. Make me a knight!"`),
    secenekler: (p, d) => {
      const c = ch(d.from);
      return [
        { t: L('Şövalye ilan et', 'Knight them'), f: () => { c.baseRank = 2; recalcRank(c); addOp(c, p, 30); return L(`${c.name} artık bir şövalye ve sana ölümüne sadık. (+30 ilişki)`, `${c.name} is now a knight and loyal to you unto death. (+30 opinion)`); } },
        { t: L('Reddet', 'Refuse'), f: () => { addOp(c, p, -15); return L(`${c.name} başı önünde çekildi.`, `${c.name} withdrew with bowed head.`); } },
      ];
    },
  },
};
