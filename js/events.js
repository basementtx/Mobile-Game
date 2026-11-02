'use strict';
/* =========================================================
   TAÇ VE HANÇER — Olaylar
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
    secenekler: () => [{ t: 'Tamam', f: () => '' }],
  },

  /* ---------- NPC'lerin sana yönelik hamleleri ---------- */
  bastanTeklif: {
    baslik: () => '🌹 Gece ziyareti',
    valid: (p, d) => free(ch(d.from)) && free(p) && !p.lovers.includes(d.from),
    metin: (p, d) => {
      const c = ch(d.from);
      return `<b>${nm(c)}</b> gece vakti kapını çaldı. Gözlerinde açık bir arzu var.${c.spouseId ? ' (Evli olduğunu ikiniz de biliyorsunuz.)' : ''}${p.spouseId ? ' Senin de bir eşin var.' : ''}`;
    },
    secenekler: (p, d) => {
      const c = ch(d.from);
      const opts = [
        { t: 'İçeri al', f: () => { becomeLovers(p, c); const s = traitStress(p, { iffetli: 15, sehvetli: -10 }); return `Sabaha kadar ayrılmadınız. ${nm(c)} artık sevgilin.${stressNote(s)}`; } },
        { t: 'Kibarca geri çevir', f: () => { addOp(c, p, -10); const s = traitStress(p, { sehvetli: 10 }); return `${c.name} kırgın bir şekilde gitti.${stressNote(s)}`; } },
      ];
      if (c.spouseId && ch(c.spouseId)) opts.push({
        t: 'Eşine haber ver', f: () => {
          const sp = ch(c.spouseId);
          addOp(sp, p, 15); addOp(sp, c, -40); addOp(c, p, -50); c.shame += 10;
          return `${nm(sp)} olanları öğrendi. Sana minnettar, ama ${c.name} seni asla affetmeyecek.`;
        },
      });
      return opts;
    },
  },
  evlilikTeklif: {
    baslik: () => '💍 Evlilik teklifi',
    valid: (p, d) => free(ch(d.from)) && !p.spouseId && !ch(d.from).spouseId && isAdult(p),
    metin: (p, d) => { const c = ch(d.from); return `<b>${nm(c)}</b> (${c.age} yaşında, ${titleOf(c)}) seninle evlenmek istiyor. Sana bakışı: ${opinion(c, p)}.`; },
    secenekler: (p, d) => {
      const c = ch(d.from);
      return [
        { t: 'Kabul et', f: () => { marry(p, c); p.prestige += 10 + c.rank * 10; return `Kilise çanları çaldı. ${c.name} ile evlendin! 💍`; } },
        { t: 'Reddet', f: () => { addOp(c, p, -15); return `${c.name} reddedilmeyi hazmedemedi.`; } },
      ];
    },
  },
  duelloTeklif: {
    baslik: () => '🤺 Meydan okuma',
    valid: (p, d) => free(ch(d.from)) && free(p),
    metin: (p, d) => { const c = ch(d.from); return `<b>${nm(c)}</b> eldivenini ayaklarının dibine fırlattı: "Onurunu kılıçla savun!"<br>Onun savaş gücü: ${stat(c, 'sav')}, seninki: ${stat(p, 'sav')}. Kazanma şansın ~%${duelChance(p, c)}.`; },
    secenekler: (p, d) => {
      const c = ch(d.from);
      return [
        { t: 'Kabul et', f: () => { const cn = nm(c); const r = duel(p, c); return r.win === p ? `Kazandın! ${cn} ${r.res}. (Şan +25)` : `Yenildin. Sen ${r.res}.`; } },
        { t: 'Reddet', f: () => { p.prestige -= 15; const s = traitStress(p, { cesur: 15, korkak: -5, kibirli: 10 }); return `Herkes arkandan "korkak" diye fısıldıyor. (Şan -15)${stressNote(s)}`; } },
      ];
    },
  },
  santaj: {
    baslik: () => '🐍 Şantaj',
    valid: (p, d) => free(ch(d.from)) && G.secrets.some(s => s.id === d.sid && !s.pub),
    metin: (p, d) => {
      const c = ch(d.from), s = G.secrets.find(x => x.id === d.sid);
      return `<b>${nm(c)}</b> kulağına eğildi: "Biliyorum... <i>${secretText(s)}</i><br>Susmam için <b>${d.amt} altın</b> istiyorum."`;
    },
    secenekler: (p, d) => {
      const c = ch(d.from), s = G.secrets.find(x => x.id === d.sid);
      return [
        { t: `Öde (${d.amt}💰)`, req: () => p.gold >= d.amt, f: () => { p.gold -= d.amt; c.gold += d.amt; addOp(p, c, -40); return `Altınları verdin. ${c.name} şimdilik susacak.`; } },
        { t: 'Reddet', f: () => { addOp(p, c, -30); if (chance(0.7)) { exposeSecret(s); return 'Reddettin. Ertesi gün tüm saray sırrını konuşuyordu.'; } return 'Reddettin. Blöf yapıyormuş, sesini çıkarmadı.'; } },
        { t: 'Onu susturmaya yemin et', f: () => { addOp(p, c, -80); return `Bu iş burada bitmeyecek. ${c.name} artık ölümcül düşmanın. (Kişiler sekmesinden ona suikast düzenleyebilirsin.)`; } },
      ];
    },
  },
  fidye: {
    baslik: () => '⛓️ Fidye',
    valid: (p, d) => p.prisonerOf === d.from,
    metin: (p, d) => `Zindanın kapısı açıldı. <b>${nm(ch(d.from))}</b>'in adamı: "Efendim serbest kalman için <b>${d.amt} altın</b> istiyor."`,
    secenekler: (p, d) => [
      { t: `Öde (${d.amt}💰)`, req: () => p.gold >= d.amt, f: () => { p.gold -= d.amt; ch(d.from).gold += d.amt; p.prisonerOf = null; return 'Fidyeyi ödedin. Özgürsün!'; } },
      { t: 'Reddet', f: () => 'Kapı yeniden kapandı. Karanlık ve rutubet...' },
    ],
  },
  cokus: {
    baslik: () => '😵 Ruhun çöküyor',
    metin: () => 'Uyuyamıyorsun. Ellerin titriyor. Ölülerin yüzleri gözünün önünden gitmiyor. Bir şeyler değişmek zorunda.',
    secenekler: p => [
      { t: 'Şaraba sarıl', f: () => { addTrait(p, 'ayyas'); stress(p, -60); return 'Kadeh kadeh unuttun. Artık bir <b>ayyaş</b>sın.'; } },
      { t: 'Herkesten şüphelen', f: () => { addTrait(p, 'paranoyak'); stress(p, -60); return 'Kimseye güvenmiyorsun artık. <b>Paranoyak</b> oldun.'; } },
      { t: 'Kendini ibadete ver (20💰)', req: () => p.gold >= 20, f: () => { p.gold -= 20; addTrait(p, 'dindar'); stress(p, -50); return 'Manastırda günlerce dua ettin. Huzuru Tanrı\'da buldun. (<b>Dindar</b>)'; } },
      { t: 'Öfkeni birilerinden çıkar', f: () => { addTrait(p, 'zalim'); p.dread += 15; stress(p, -60); return 'Bir hizmetkârı kırbaçlattın, bir köpeği öldürdün. Rahatladın. Artık <b>zalim</b>sin.'; } },
    ],
  },

  /* ---------- Rastgele olaylar ---------- */
  dilenci: {
    w: () => 1,
    baslik: () => '🥣 Bir dilenci',
    metin: () => 'Paçavralar içinde bir dilenci yolunu kesti. Elleri titriyor: "Bir lokma ekmek için, efendim..."',
    secenekler: p => [
      { t: 'Birkaç altın ver (5💰)', req: () => p.gold >= 5, f: () => { p.gold -= 5; p.prestige += 3; const s = traitStress(p, { merhametli: -5, acgozlu: 5 }); return `Dilenci ellerini öptü. (Şan +3)${stressNote(s)}`; } },
      { t: 'Görmezden gel', f: () => { const s = traitStress(p, { merhametli: 10 }); return `Yürüdün geçtin.${stressNote(s)}`; } },
      { t: 'Kırbaçlat', req: () => p.rank >= 2, f: () => { p.dread += 3; p.prestige -= 2; const s = traitStress(p, { merhametli: 15, zalim: -5 }); return `Adamların dilenciyi kırbaçladı. Kalabalık sessizce dağıldı. (Korku +3)${stressNote(s)}`; } },
    ],
  },
  kumar: {
    w: () => 1,
    baslik: () => '🎲 Zar masası',
    metin: () => 'Meyhanenin köşesinde yüksek bahisli bir zar oyunu dönüyor. Oyunculardan biri sana el sallıyor.',
    secenekler: p => [
      { t: 'Oyna (10💰)', req: () => p.gold >= 10, f: () => { if (chance(0.45)) { p.gold += 15; return 'Zarlar seni sevdi! <b>+15 altın</b>.'; } p.gold -= 10; return 'Zarlar acımasızdı. <b>-10 altın</b>.'; } },
      { t: 'Hile yap (10💰)', req: () => p.gold >= 10, f: () => { if (chance(0.3 + stat(p, 'ent') * 0.04)) { p.gold += 30; return 'Hileli zarların işe yaradı. <b>+30 altın</b>!'; } p.gold -= 10; p.health -= 15; p.shame += 5; return 'Yakalandın! Dayak yedin ve sokağa atıldın. (Sağlık -15)'; } },
      { t: 'Geç', f: () => 'Kumara bulaşmadın.' },
    ],
  },
  eskiyalar: {
    w: () => 1,
    baslik: () => '🏹 Eşkıya baskını',
    metin: () => 'Ormanın içinden geçerken dört silahlı eşkıya önünü kesti. "Keseyi ver, canını kurtar!"',
    secenekler: p => [
      { t: 'Savaş', f: () => { if (chance((30 + stat(p, 'sav') * 5) / 100)) { const g = rnd(5, 20); p.gold += g; p.prestige += 10; return `Kılıcını çektin ve ikisini yere serdin. Diğerleri kaçtı. Üzerlerinden ${g} altın çıktı. (Şan +10)`; } p.health -= 25; const l = Math.floor(p.gold / 2); p.gold -= l; if (p.health <= 0) { die(p, 'Eşkıyalar tarafından öldürüldü'); return 'Eşkıyaların kılıçları seni buldu...'; } return `Yenildin. Seni dövüp ${l} altınını aldılar. (Sağlık -25)`; } },
      { t: 'Keseyi ver', f: () => { const l = Math.min(p.gold, 15); p.gold -= l; return `${l} altın verdin. Canın kurtuldu.`; } },
      { t: 'Kaç', f: () => { const s = traitStress(p, { cesur: 10, kibirli: 5 }); if (chance(0.7)) return `Atını mahmuzladın ve kurtuldun.${stressNote(s)}`; p.health -= 10; return `Kaçarken bir ok omzuna saplandı. (Sağlık -10)${stressNote(s)}`; } },
    ],
  },
  hanci: {
    w: p => (isAdult(p) && !p.prisonerOf ? (has(p, 'sehvetli') ? 1.5 : 0.7) : 0),
    prep: p => {
      const n = makeChar({ female: !p.female, age: rnd(18, 30), rank: 0, lordId: p.lordId, gold: rnd(2, 8), traits: ['sehvetli', 'guzel', pick(['kurnaz', 'durust', 'cesur', 'comert'])] });
      addOp(n, p, 30);
      return { from: n.id };
    },
    baslik: () => '🍷 Hancının gözdesi',
    metin: (p, d) => { const n = ch(d.from); return `Handa kaldığın gece, <b>${n.name}</b> şarabını doldururken eli elinde biraz fazla oyalandı. Fısıldadı: "Odamın kapısı açık olacak..."`; },
    secenekler: (p, d) => {
      const n = ch(d.from);
      return [
        { t: 'O kapıdan gir', f: () => { becomeLovers(p, n); const s = traitStress(p, { iffetli: 15, sehvetli: -15 }); return `Unutulmaz bir geceydi. ${n.name} artık sevgilin.${p.spouseId ? ' Eşin bunu asla öğrenmemeli...' : ''}${stressNote(s)}`; } },
        { t: 'Kendi odana çekil', f: () => { const s = traitStress(p, { sehvetli: 10, iffetli: -5 }); return `Kapını kilitledin.${stressNote(s)}`; } },
      ];
    },
  },
  sirSatici: {
    w: p => (G.secrets.some(s => !s.pub && !knows(p, s) && s.actor !== p.id) ? 0.8 : 0),
    prep: p => { const l = G.secrets.filter(s => !s.pub && !knows(p, s) && s.actor !== p.id && ch(s.actor) && ch(s.actor).alive); return l.length ? { sid: pick(l).id } : null; },
    valid: (p, d) => G.secrets.some(s => s.id === d.sid),
    baslik: () => '🕯️ Gizemli yabancı',
    metin: (p, d) => { const s = G.secrets.find(x => x.id === d.sid); return `Kapüşonlu bir yabancı yanına oturdu: "<b>${nm(ch(s.actor))}</b> hakkında çok ilginç bir şey biliyorum. Fiyatı 20 altın."`; },
    secenekler: (p, d) => [
      { t: 'Satın al (20💰)', req: () => p.gold >= 20, f: () => { p.gold -= 20; const s = G.secrets.find(x => x.id === d.sid); learn(p, s); return `Yabancı fısıldadı:<br><i>${secretText(s)}</i>`; } },
      { t: 'Reddet', f: () => 'Yabancı omuz silkti ve karanlığa karıştı.' },
    ],
  },
  vergiGorevi: {
    w: p => (p.rank >= 1 && p.rank <= 2 && free(ch(p.lordId)) && free(p) ? 1 : 0),
    baslik: () => '🪙 Vergi görevi',
    metin: p => `Efendin <b>${nm(ch(p.lordId))}</b> seni köylerden vergi toplamakla görevlendirdi. Torbalar ağır... ve kimse saymıyor.`,
    secenekler: p => {
      const l = ch(p.lordId);
      return [
        { t: 'Dürüstçe teslim et', f: () => { addOp(l, p, 12); p.prestige += 5; const s = traitStress(p, { acgozlu: 5, durust: -5 }); return `${l.name} sadakatinden memnun. (+12 ilişki)${stressNote(s)}`; } },
        { t: 'Bir kısmını cebe at', f: () => { const g = rnd(15, 30); p.gold += g; const known = [p.id]; if (chance(0.25)) known.push(l.id); addSecret('zimmet', p.id, l.id, known); const s = traitStress(p, { durust: 15, acgozlu: -5 }); return `<b>${g} altın</b> kendi kesene kaydı.${known.length > 1 ? ' Ama bir kâtip hesapları fark etti...' : ''}${stressNote(s)}`; } },
      ];
    },
  },
  hastalik: {
    w: p => (p.age > 30 ? 0.6 : 0.3),
    prep: p => { p.health -= 20; return {}; },
    baslik: () => '🤒 Ateşli hastalık',
    metin: () => { return 'Ateşin yükseldi, öksürüğün dinmiyor. Bu iyiye işaret değil. (Sağlık -20)'; },
    secenekler: p => [
      { t: 'Şifacı çağır (15💰)', req: () => p.gold >= 15, f: () => { p.gold -= 15; p.health = Math.min(100, p.health + 20); return 'Şifacının iksirleri iyi geldi. (Sağlık +20)'; } },
      { t: 'Dua et', f: () => { if (chance(has(p, 'dindar') ? 0.7 : 0.4)) { p.health += 10; return 'Ateşin düştü. Tanrı seni duydu. (Sağlık +10)'; } return 'Dualarına cevap gelmedi.'; } },
      { t: 'Dişini sık', f: () => (chance(0.5) ? 'Atlattın.' : (p.health -= 10, 'Kötüleştin. (Sağlık -10)')) },
    ],
  },
  tuccarRusvet: {
    w: p => (p.rank >= 3 && free(p) ? 0.8 : 0),
    baslik: () => '💼 Tüccarın teklifi',
    metin: () => 'Şişman bir tüccar, topraklarındaki tuz ticaretinin tekelini istiyor. Masaya ağır bir kese bıraktı: "Küçük bir... teşekkür."',
    secenekler: p => [
      { t: 'Keseyi al (+40💰)', f: () => { p.gold += 40; const k = [p.id]; if (chance(0.3) && p.lordId) k.push(p.lordId); addSecret('rusvet', p.id, null, k); const s = traitStress(p, { durust: 15, acgozlu: -10 }); return `Kese ağırdı. Kimse bilmeyecek... umarım.${stressNote(s)}`; } },
      { t: 'Reddet', f: () => { p.prestige += 5; const s = traitStress(p, { durust: -5, acgozlu: 10 }); return `Tüccarı kapı dışarı ettin. (Şan +5)${stressNote(s)}`; } },
    ],
  },
  koyluIsyani: {
    w: p => (p.rank >= 3 && free(p) ? 0.6 : 0),
    baslik: () => '🔥 Köylü ayaklanması',
    metin: () => 'Açlıktan bunalan köylüler dirgen ve meşalelerle değirmeni bastı. Yüzlerce kişi kalenin önünde bağırıyor.',
    secenekler: p => [
      { t: 'Kılıçtan geçir', f: () => { p.dread += 15; p.prestige -= 5; const s = traitStress(p, { merhametli: 25, zalim: -10 }); return `Şövalyelerin meydanı kana buladı. Kimse bir daha sesini çıkarmayacak. (Korku +15)${stressNote(s)}`; } },
      { t: 'Taleplerini karşıla (30💰)', req: () => p.gold >= 30, f: () => { p.gold -= 30; p.prestige += 10; const s = traitStress(p, { merhametli: -10, acgozlu: 10 }); return `Ambarları açtın. Köylüler adını dualarla anıyor. (Şan +10)${stressNote(s)}`; } },
      { t: 'Elebaşını astır', f: () => { p.dread += 7; const s = traitStress(p, { merhametli: 10 }); return `Elebaşı darağacında sallanırken kalabalık dağıldı. (Korku +7)${stressNote(s)}`; } },
    ],
  },
  hazine: {
    w: () => 0.4,
    baslik: () => '💎 Gömülü hazine',
    metin: () => 'Eski bir kilise yıkıntısında, taşların arasında paslı bir sandık buldun. İçinde parlayan sikkeler var!',
    secenekler: p => [
      { t: 'Hepsini al', f: () => { const g = rnd(20, 50); p.gold += g; const s = traitStress(p, { comert: 5, acgozlu: -5 }); return `<b>${g} altın!</b>${stressNote(s)}`; } },
      { t: 'Yarısını yoksullara dağıt', f: () => { const g = rnd(10, 25); p.gold += g; p.prestige += 15; const s = traitStress(p, { comert: -10, merhametli: -5, acgozlu: 10 }); return `${g} altın aldın, gerisini dağıttın. Halk seni seviyor. (Şan +15)${stressNote(s)}`; } },
    ],
  },
  kehanet: {
    w: () => 0.4,
    baslik: () => '🔮 Kör kâhin',
    metin: () => 'Yaşlı, kör bir kadın kolunu yakaladı: "Senin kaderini görüyorum... taç mı, ip mi?"',
    secenekler: p => [
      { t: 'Dinle', f: () => (chance(0.5) ? (p.prestige += 10, '"Başında bir taç görüyorum." Söz saraya yayıldı. (Şan +10)') : (stress(p, 15), '"Seni en sevdiğin biri arkandan bıçaklayacak." Uykuların kaçtı. (Stres +15)')) },
      { t: 'Kov', f: () => 'Kadını itip yoluna devam ettin.' },
      { t: 'Cadı diye yaktır', req: () => p.rank >= 2, f: () => { p.dread += 10; const s = traitStress(p, { merhametli: 20, zalim: -5, dindar: -5 }); return `Alevler yükselirken kadın gülüyordu. (Korku +10)${stressNote(s)}`; } },
    ],
  },
  ruhban: {
    w: p => (G.secrets.some(s => s.actor === p.id && !s.pub) ? 0.6 : 0),
    baslik: () => '⛪ Günah çıkarma',
    metin: () => 'Köyün rahibi seni kenara çekti: "Ruhun ağır görünüyor evladım. Günahlarını itiraf etmek ister misin?"',
    secenekler: p => [
      { t: 'İtiraf et', f: () => { stress(p, -25); if (chance(0.15)) { const s = G.secrets.find(x => x.actor === p.id && !x.pub); exposeSecret(s); return 'İçin rahatladı... ama rahip ağzını tutamadı. Sırrın herkesin dilinde!'; } return 'İçin rahatladı. Rahip sırrını saklayacak. (Stres -25)'; } },
      { t: 'Yalan söyle', f: () => { const s = traitStress(p, { durust: 10, dindar: 10, kurnaz: -5 }); return `"Hiçbir günahım yok peder."${stressNote(s)}`; } },
    ],
  },
  sarap: {
    w: p => (p.stress > 30 ? 0.8 : 0.3),
    baslik: () => '🍷 Uzun bir gece',
    metin: () => 'Arkadaşların seni bir içki âlemine çağırıyor. Dertlerini unutmak için iyi bir fırsat.',
    secenekler: p => [
      { t: 'Kadehleri doldur', f: () => { stress(p, -20); if (chance(0.12)) { addTrait(p, 'ayyas'); return 'Sabaha kadar içtin... ve bu bir alışkanlık oluyor. (<b>Ayyaş</b>, Stres -20)'; } return 'Gülmekten karnın ağrıdı. (Stres -20)'; } },
      { t: 'Kibarca reddet', f: () => 'Erken yattın.' },
    ],
  },
  genelev: {
    w: p => (isAdult(p) && has(p, 'sehvetli') && free(p) ? 0.8 : 0),
    baslik: () => '🏮 Kırmızı fenerli ev',
    metin: () => 'Şehrin arka sokaklarında, pencereleri kırmızı fenerlerle aydınlanan bir ev. Kapıdaki kadın göz kırpıyor.',
    secenekler: p => [
      { t: 'İçeri gir (8💰)', req: () => p.gold >= 8, f: () => { p.gold -= 8; stress(p, -25); if (chance(0.1)) { p.health -= 20; return 'Harika bir geceydi... ama birkaç hafta sonra utanç verici bir hastalık baş gösterdi. (Sağlık -20)'; } if (p.spouseId && chance(0.2)) { const sp = ch(p.spouseId); addOp(sp, p, -30); return `Keyifli bir geceydi. Ama eşin ${sp.name} bir şeyler duymuş... (-30 ilişki)`; } return 'Keyifli bir geceydi. (Stres -25)'; } },
      { t: 'Yürü git', f: () => { const s = traitStress(p, { sehvetli: 10 }); return `Kendine hâkim oldun.${stressNote(s)}`; } },
    ],
  },
  yetim: {
    w: p => (isAdult(p) ? 0.4 : 0),
    prep: p => { const k = makeChar({ age: rnd(4, 9), rank: 0, gold: 0, lordId: p.id }); return { kid: k.id }; },
    baslik: () => '🧒 Yetim çocuk',
    metin: (p, d) => { const k = ch(d.kid); return `Yol kenarında, ailesi vebadan ölmüş ${k.age} yaşında bir ${k.female ? 'kız' : 'oğlan'} çocuğu buldun. Adı ${k.name}. Sana kocaman gözlerle bakıyor.`; },
    secenekler: (p, d) => {
      const k = ch(d.kid);
      return [
        { t: 'Evlat edin (10💰)', req: () => p.gold >= 10, f: () => { p.gold -= 10; k.dyn = p.dyn; k.adopted = true; if (p.female) k.motherId = p.id; else k.fatherId = p.id; p.children.push(k.id); k.baseRank = p.rank >= 2 ? 2 : 0; recalcRank(k); k.lordId = p.titles.length ? p.id : p.lordId; addOp(k, p, 60); const s = traitStress(p, { merhametli: -15, comert: -5 }); return `${k.name} artık bir ${p.dyn}. Mirasçıların arasında.${stressNote(s)}`; } },
        { t: 'Manastıra bırak', f: () => { k.lordId = null; return 'Rahibeler çocuğa bakacak.'; } },
        { t: 'Köle tüccarına sat', f: () => { p.gold += 15; p.dread += 3; k.lordId = null; const s = traitStress(p, { merhametli: 30, zalim: -5, acgozlu: -5 }); return `15 altın kazandın. Çocuğun ağlaması kulaklarında çınlıyor.${stressNote(s)}`; } },
      ];
    },
  },
  fisilti: {
    w: p => (G.secrets.some(s => !s.pub && !knows(p, s) && (familyRel(p, ch(s.actor)) || s.actor === p.lordId || (ch(s.target) && familyRel(p, ch(s.target))))) ? 1 : 0),
    prep: p => { const l = G.secrets.filter(s => !s.pub && !knows(p, s) && (familyRel(p, ch(s.actor)) || s.actor === p.lordId || (ch(s.target) && familyRel(p, ch(s.target))))); return l.length ? { sid: pick(l).id } : null; },
    valid: (p, d) => G.secrets.some(s => s.id === d.sid),
    baslik: () => '👂 Hizmetkârın fısıltısı',
    metin: () => 'Genç bir hizmetkâr etrafına bakınarak yanına geldi: "Efendim... size söylemem gereken bir şey var. Ama karşılığında..."',
    secenekler: (p, d) => [
      { t: 'Dinle (5💰)', req: () => p.gold >= 5, f: () => { p.gold -= 5; const s = G.secrets.find(x => x.id === d.sid); learn(p, s); return `Hizmetkâr fısıldadı:<br><i>${secretText(s)}</i>`; } },
      { t: 'Dedikoduyla işim olmaz', f: () => 'Hizmetkâr başını eğip uzaklaştı.' },
    ],
  },
  sefer: {
    w: p => (p.rank >= 1 && p.rank <= 3 && free(ch(p.lordId)) && free(p) && isAdult(p) ? 0.7 : 0),
    baslik: () => '🐎 Yağma seferi',
    metin: p => `Efendin <b>${nm(ch(p.lordId))}</b> komşu topraklara bir yağma seferi düzenliyor ve seni de çağırıyor.`,
    secenekler: p => {
      const l = ch(p.lordId);
      return [
        { t: 'Katıl', f: () => { const r = Math.random(); if (r < 0.03) { die(p, 'Yağma seferinde bir okla vuruldu'); return 'Bir ok boğazını buldu...'; } let m; if (chance((40 + stat(p, 'sav') * 4) / 100)) { const g = rnd(20, 50); p.gold += g; p.prestige += 30; addOp(l, p, 10); m = `Köyler yandı, sandıklar boşaldı. <b>${g} altın</b> ve şan kazandın. (Şan +30)`; } else { p.prestige += 5; m = 'Sefer hayal kırıklığıydı. Eli boş döndün.'; } if (chance(0.25)) { p.health -= 20; m += ' Ayrıca yaralandın. (Sağlık -20)'; } const s = traitStress(p, { merhametli: 15, zalim: -5 }); return m + stressNote(s); } },
        { t: 'Hastalık bahanesiyle kal', f: () => { addOp(l, p, -15); const s = traitStress(p, { cesur: 10, korkak: -5 }); return `${l.name} bahaneni yutmadı. (-15 ilişki)${stressNote(s)}`; } },
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
    baslik: () => '💌 Mühürlü mektup',
    metin: (p, d) => { const c = ch(d.from); return `Odanda mühürlü bir mektup buldun. <b>${nm(c)}</b> yazmış: "Gözlerini her gördüğümde nefesim kesiliyor..."${c.spouseId ? ' (Yazan evli!)' : ''}`; },
    secenekler: (p, d) => {
      const c = ch(d.from);
      return [
        { t: 'Gizlice buluş', f: () => { becomeLovers(p, c); return `Gece bahçede buluştunuz. ${c.name} artık sevgilin.`; } },
        { t: 'Mektubu yak', f: () => 'Mektup alevlerde kıvrılarak yok oldu.' },
        { t: 'Mektubu herkese göster', f: () => { c.shame += 15; c.prestige -= 15; addOp(c, p, -60); return `Saray kahkahalarla çınladı. ${c.name} rezil oldu ve sana kin besliyor. (-60 ilişki)`; } },
      ];
    },
  },
  cocukEgitimi: {
    w: p => (p.children.some(id => { const k = ch(id); return k && k.alive && k.age >= 6 && k.age <= 15; }) ? 0.7 : 0),
    prep: p => { const l = p.children.map(ch).filter(k => k && k.alive && k.age >= 6 && k.age <= 15); return l.length ? { kid: pick(l).id } : null; },
    valid: (p, d) => ch(d.kid) && ch(d.kid).alive,
    baslik: () => '🧒 Çocuğun eğitimi',
    metin: (p, d) => { const k = ch(d.kid); return `${k.age} yaşındaki ${k.name} büyüyor. Onu kim yetiştirecek?`; },
    secenekler: (p, d) => {
      const k = ch(d.kid);
      return [
        { t: 'Kendin eğit', f: () => { const pers = p.traits.filter(t => TRAITS[t].kisilik); if (pers.length) { const t = pick(pers); addTrait(k, t); addOp(k, p, 20); return `${k.name} sana benziyor. <b>${TRAITS[t].ad}</b> özelliğini kazandı.`; } return 'Elinden geleni yaptın.'; } },
        { t: 'Usta bir hoca tut (20💰)', req: () => p.gold >= 20, f: () => { p.gold -= 20; const s = pick(Object.keys(STATS)); k.base[s] += 3; return `Hoca işini iyi yaptı. ${k.name}: ${STATS[s]} +3.`; } },
        { t: 'Kendi hâline bırak', f: () => { addOp(k, p, -15); return `${k.name} ihmal edildiğini hissediyor.`; } },
      ];
    },
  },
  sovalyelikIstek: {
    w: p => (p.rank >= 3 && living().some(x => x.lordId === p.id && x.baseRank === 1 && !x.titles.length && free(x)) ? 0.6 : 0),
    prep: p => { const l = living().filter(x => x.lordId === p.id && x.baseRank === 1 && !x.titles.length && free(x)); return l.length ? { from: pick(l).id } : null; },
    valid: (p, d) => free(ch(d.from)),
    baslik: () => '⚔️ Şövalyelik talebi',
    metin: (p, d) => `Askerlerinden <b>${nm(ch(d.from))}</b> önünde diz çöktü: "Yıllardır sancağınız için kan döküyorum. Beni şövalye yapın!"`,
    secenekler: (p, d) => {
      const c = ch(d.from);
      return [
        { t: 'Şövalye ilan et', f: () => { c.baseRank = 2; recalcRank(c); addOp(c, p, 30); return `${c.name} artık bir şövalye ve sana ölümüne sadık. (+30 ilişki)`; } },
        { t: 'Reddet', f: () => { addOp(c, p, -15); return `${c.name} başı önünde çekildi.`; } },
      ];
    },
  },
};
