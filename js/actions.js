'use strict';
/* =========================================================
   TAÇ VE HANÇER — Oyuncu eylemleri
   Her eylem: show (görünür mü), req (engel sebebi ya da null),
   chance (başarı %), run (sonuç metni döner)
   ========================================================= */

const pct = n => Math.round(clamp(n, 0, 100));
function jailReq(p, t) {
  if (p.prisonerOf && (!t || t.id !== p.prisonerOf)) return 'Zindandasın';
  if (t && t.prisonerOf && t.prisonerOf !== p.id) return 'O zindanda';
  return null;
}
function adultReq(p, t) {
  if (!isAdult(p)) return 'Henüz çocuksun';
  if (t && !isAdult(t)) return 'O daha çocuk';
  return null;
}
const firstReq = (...rs) => rs.find(r => r) || null;
const goldReq = (p, n) => (p.gold < n ? `${n} altın gerekli` : null);
function playerCaptive(p, t) { return t.prisonerOf === p.id; }

const ACTIONS = [
  /* ===================== KİŞİYE YÖNELİK ===================== */
  {
    id: 'sohbet', ad: 'Sohbet et', icon: '💬', ap: 1, tgt: true,
    show: (p, t) => t.age >= 6,
    req: (p, t) => jailReq(p, t),
    chance: (p, t) => pct(55 + (stat(p, 'dip') - 5) * 5 + opinion(t, p) / 4),
    run(p, t) {
      if (chance(this.chance(p, t) / 100)) {
        const g = rnd(6, 12) + Math.floor(stat(p, 'dip') / 2);
        addOp(t, p, g); addOp(p, t, 4);
        let m = `${nm(t)} ile keyifli bir sohbet ettin. (+${g} ilişki)`;
        if (opinion(t, p) > 40 && chance(0.2)) {
          const s = secretAbout(t, p);
          if (s) { learn(p, s); m += `<br>Şarabın etkisiyle ağzından bir sır kaçırdı: <i>${secretText(s)}</i>`; }
        }
        return m;
      }
      addOp(t, p, -4);
      return `${nm(t)} ile sohbet tatsız geçti. (-4 ilişki)`;
    },
  },
  {
    id: 'hediye', ad: 'Hediye ver (10💰)', icon: '🎁', ap: 1, tgt: true,
    show: () => true,
    req: (p, t) => firstReq(jailReq(p, t), goldReq(p, 10)),
    run(p, t) {
      p.gold -= 10; t.gold += 10;
      const g = 10 + (has(t, 'acgozlu') ? 8 : 0);
      addOp(t, p, g);
      return `${nm(t)} hediyeni memnuniyetle kabul etti. (+${g} ilişki)`;
    },
  },
  {
    id: 'rusvet', ad: 'Rüşvet ver (50💰)', icon: '💰', ap: 1, tgt: true,
    show: (p, t) => isAdult(t),
    req: (p, t) => firstReq(jailReq(p, t), goldReq(p, 50)),
    run(p, t) {
      if (has(t, 'durust') && chance(0.4)) {
        addOp(t, p, -15);
        return `${nm(t)} keseyi yüzüne fırlattı: "Beni satın alabileceğini mi sandın?" (-15 ilişki)`;
      }
      p.gold -= 50; t.gold += 50;
      const g = 28 + (has(t, 'acgozlu') ? 15 : 0);
      addOp(t, p, g);
      if (t.rank >= 3) addSecret('rusvet', t.id, p.id, [t.id, p.id]);
      return `${nm(t)} keseyi sessizce cebine koydu. Artık sana borçlu hissediyor. (+${g} ilişki)`;
    },
  },
  {
    id: 'bastan', ad: 'Baştan çıkar', icon: '🌹', ap: 1, tgt: true,
    show: (p, t) => isAdult(p) && isAdult(t) && !closeKin(p, t) && !p.lovers.includes(t.id) && p.spouseId !== t.id,
    req: (p, t) => jailReq(p, t),
    chance: (p, t) => seduceChance(p, t),
    run(p, t) {
      if (chance(seduceChance(p, t) / 100)) {
        becomeLovers(p, t);
        const s = traitStress(p, { iffetli: 15, sehvetli: -10 });
        return `Bakışlar, fısıltılar ve sonra karanlık bir oda... ${nm(t)} artık senin <b>sevgilin</b>.${p.spouseId || t.spouseId ? ' (Yasak bir ilişki — bu bir sır.)' : ''}${stressNote(s)}`;
      }
      addOp(t, p, -10);
      let m = `${nm(t)} seni nazikçe ama kesin bir dille reddetti. (-10 ilişki)`;
      const sp = ch(t.spouseId);
      if (sp && sp.alive && (has(t, 'durust') || has(t, 'iffetli')) && chance(0.4)) {
        addOp(sp, p, -30);
        m += `<br>Üstelik olanları eşi ${nm(sp)}'e anlattı!`;
      }
      return m;
    },
  },
  {
    id: 'ayril', ad: 'İlişkiyi bitir', icon: '💔', ap: 0, tgt: true,
    show: (p, t) => p.lovers.includes(t.id),
    req: () => null,
    run(p, t) { breakUp(p, t); addOp(t, p, -25); return `${nm(t)} ile ilişkini bitirdin. Kalbi kırıldı. (-25 ilişki)`; },
  },
  {
    id: 'evlen', ad: 'Evlenme teklif et', icon: '💍', ap: 1, tgt: true,
    show: (p, t) => isAdult(p) && isAdult(t) && !p.spouseId && !t.spouseId && !closeKin(p, t),
    req: (p, t) => jailReq(p, t),
    chance: (p, t) => marryChance(p, t),
    run(p, t) {
      if (chance(marryChance(p, t) / 100)) {
        marry(p, t);
        p.prestige += 10 + t.rank * 10;
        return `${nm(t)} teklifini kabul etti! Görkemli olmasa da güzel bir düğün yapıldı. 💍`;
      }
      addOp(t, p, -5);
      return `${nm(t)} teklifini reddetti. (-5 ilişki)`;
    },
  },
  {
    id: 'bosan', ad: 'Boşan', icon: '📜', ap: 1, tgt: true,
    show: (p, t) => p.spouseId === t.id,
    req: () => null,
    run(p, t) {
      divorce(p);
      addOp(t, p, -50); p.prestige -= 20;
      if (t.lordId === p.id && !t.titles.length) t.lordId = null;
      return `${nm(t)} ile evliliğini bitirdin. Saray çalkalanıyor. (Şan -20)`;
    },
  },
  {
    id: 'casus', ad: 'Casusluk yap', icon: '🕵️', ap: 1, tgt: true,
    show: (p, t) => t.age >= 12,
    req: (p, t) => jailReq(p),
    chance: (p, t) => spyChance(p, t),
    run(p, t) {
      const r = spy(p, t);
      if (r.ok && r.s) return `Casusların işini yaptı. Öğrendiğin sır:<br><i>${secretText(r.s)}</i>`;
      if (r.ok) return `${nm(t)} hakkında kayda değer bir şey bulunamadı. Ya temiz ya da çok dikkatli.`;
      if (r.caught) return `Casusun yakalandı! ${nm(t)} kimin gönderdiğini biliyor. (-25 ilişki)`;
      return 'Casusların eli boş döndü.';
    },
  },
  {
    id: 'santaj', ad: 'Şantaj yap', icon: '🐍', ap: 1, tgt: true,
    show: (p, t) => knownSecretsOf(p, t).length > 0,
    req: (p, t) => jailReq(p, t),
    chance: (p, t) => pct(55 + (stat(p, 'ent') - stat(t, 'ent')) * 5 + (has(t, 'korkak') ? 20 : 0) - (has(t, 'cesur') ? 15 : 0) - (has(t, 'kibirli') ? 10 : 0)),
    run(p, t) {
      const s = knownSecretsOf(p, t)[0];
      if (chance(this.chance(p, t) / 100)) {
        const amt = Math.max(5, Math.floor(t.gold * 0.4));
        t.gold -= amt; p.gold += amt;
        addOp(t, p, -30);
        const st = traitStress(p, { durust: 10, kurnaz: -5 });
        return `"${SECRETS[s.type].ad}" konusundaki sırrını herkese anlatmakla tehdit ettin. ${nm(t)} titreyen ellerle <b>${amt} altın</b> ödedi. (-30 ilişki)${stressNote(st)}`;
      }
      addOp(t, p, -40);
      const mine = G.secrets.filter(x => x.actor === p.id && !x.pub && x.known.includes(t.id));
      if (mine.length && chance(0.5)) {
        exposeSecret(mine[0]);
        return `${nm(t)} korkmadı. Aksine, senin sırrını herkese yaydı: <i>${secretText(mine[0])}</i>`;
      }
      return `${nm(t)} seni kapı dışarı etti: "Elinden geleni ardına koyma!" (-40 ilişki)`;
    },
  },
  {
    id: 'ifsa', ad: 'Sırrını ifşa et', icon: '📢', ap: 1, tgt: true,
    show: (p, t) => knownSecretsOf(p, t).length > 0,
    req: (p) => jailReq(p),
    run(p, t) {
      const list = knownSecretsOf(p, t).sort((a, b) => SECRETS[b.type].shame - SECRETS[a.type].shame);
      const s = list[0];
      exposeSecret(s);
      addOp(t, p, -60);
      p.prestige += 5;
      return `Sırrı meydanda bağırdın: <i>${secretText(s)}</i><br>${nm(t)} rezil oldu. Senden nefret ediyor. (-60 ilişki)`;
    },
  },
  {
    id: 'iftira', ad: 'İftira at', icon: '🗣️', ap: 1, tgt: true,
    show: (p, t) => isAdult(t),
    req: (p) => jailReq(p),
    chance: (p, t) => slanderChance(p, t),
    run(p, t) {
      const st = traitStress(p, { durust: 15, kurnaz: -5 });
      const r = slander(p, t);
      if (r.ok) return `${nm(t)} hakkında yaydığın yalanlar sarayda dilden dile dolaşıyor. Efendisi artık ona şüpheyle bakıyor.${stressNote(st)}`;
      if (r.caught) return `Yalanın ortaya çıktı! Herkes iftira attığını biliyor. (-40 ilişki, rezalet)${stressNote(st)}`;
      return `Dedikodun tutmadı, kimse inanmadı.${stressNote(st)}`;
    },
  },
  {
    id: 'suikast', ad: 'Suikast düzenle (30💰)', icon: '🗡️', ap: 1, tgt: true,
    confirm: t => `${nm(t)} için bir katil tutmak istediğine emin misin?`,
    show: (p, t) => t.alive,
    req: (p, t) => firstReq(jailReq(p, t), goldReq(p, 30)),
    chance: (p, t) => murderChance(p, t),
    run(p, t) {
      const st = traitStress(p, { merhametli: 25, durust: 10, zalim: -10 }) + (closeKin(p, t) ? stress(p, 20) : 0);
      const tname = nm(t);
      const r = tryMurder(p, t);
      if (r.ok) return `${tname} bu sabah ölü bulundu. ${r.exposed ? '<b>Ama izler sana çıkıyor! Herkes katilin sen olduğunu biliyor.</b>' : 'Kimse senden şüphelenmiyor... şimdilik.'}${stressNote(st)}`;
      if (r.exposed) return `Suikast başarısız oldu ve katil yakalandı. ${tname} seni ele verdiğini öğrendi! (-100 ilişki)${stressNote(st)}`;
      return `Katil son anda vazgeçti ve altınınla birlikte ortadan kayboldu.${stressNote(st)}`;
    },
  },
  {
    id: 'duello', ad: 'Düelloya davet et', icon: '🤺', ap: 1, tgt: true,
    confirm: t => `${nm(t)} ile ölümüne bir düello olabilir. Emin misin?`,
    show: (p, t) => isAdult(p) && isAdult(t),
    req: (p, t) => firstReq(jailReq(p, t), p.health < 30 ? 'Çok yaralısın' : null, t.health < 30 ? 'O çok yaralı' : null, playerCaptive(p, t) ? 'Zindanda' : null),
    chance: (p, t) => duelChance(p, t),
    run(p, t) {
      if (!(has(t, 'cesur') || opinion(t, p) < -20 || stat(t, 'sav') >= stat(p, 'sav') || chance(0.3))) {
        t.prestige -= 15; p.prestige += 5;
        return `${nm(t)} meydan okumanı korkakça reddetti. Herkes onunla alay ediyor. (Şan +5)`;
      }
      const tname = nm(t);
      const r = duel(p, t);
      if (r.win === p) return `⚔️ Çelik çeliğe çarptı... ve sen kazandın! ${tname} ${r.res}. (Şan +25)`;
      return `⚔️ Çelik çeliğe çarptı... ve yenildin. Sen ${r.res}. (Şan -10)`;
    },
  },
  {
    id: 'tehdit', ad: 'Gözdağı ver / haraç kes', icon: '😠', ap: 1, tgt: true,
    show: (p, t) => isAdult(p) && isAdult(t) && t.rank <= p.rank + 1,
    req: (p, t) => jailReq(p, t),
    chance: (p, t) => pct(20 + p.dread / 2 + (stat(p, 'sav') - stat(t, 'sav')) * 4 - (has(t, 'cesur') ? 20 : 0) + (has(t, 'korkak') ? 25 : 0) + (p.rank - t.rank) * 10),
    run(p, t) {
      if (chance(this.chance(p, t) / 100)) {
        const amt = Math.min(t.gold, 10 + p.rank * 10);
        t.gold -= amt; p.gold += amt; p.dread += 3;
        addOp(t, p, -15);
        const st = traitStress(p, { merhametli: 10, zalim: -5 });
        return `${nm(t)} gözlerindeki ölümü gördü ve <b>${amt} altını</b> sessizce uzattı. (Korku +3)${stressNote(st)}`;
      }
      addOp(t, p, -20); p.prestige -= 5;
      return `${nm(t)} sana güldü: "Beni mi korkutacaksın?" (Şan -5)`;
    },
  },
  {
    id: 'yardim', ad: 'Yardım et (10💰)', icon: '🤲', ap: 1, tgt: true,
    show: (p, t) => (t.gold < 20 || t.rank <= 1 || t.health < 60),
    req: (p, t) => firstReq(jailReq(p, t), goldReq(p, 10)),
    run(p, t) {
      p.gold -= 10; t.gold += 10;
      addOp(t, p, 15); p.prestige += 3;
      const st = traitStress(p, { merhametli: -10, comert: -5, acgozlu: 10 });
      return `${nm(t)} gözleri dolarak yardımını kabul etti. (+15 ilişki, Şan +3)${stressNote(st)}`;
    },
  },
  {
    id: 'hizmet', ad: 'Hizmetine gir', icon: '🛡️', ap: 1, tgt: true,
    show: (p, t) => !p.titles.length && t.rank >= 3 && t.id !== p.lordId && isAdult(p),
    req: (p, t) => jailReq(p, t),
    chance: (p, t) => pct(40 + opinion(t, p) / 2 + stat(p, 'sav') * 2 + p.prestige / 20),
    run(p, t) {
      if (chance(this.chance(p, t) / 100)) {
        const old = ch(p.lordId);
        if (old && old.alive) addOp(old, p, -15);
        p.lordId = t.id;
        if (p.baseRank === 0) { p.baseRank = 1; recalcRank(p); }
        return `${nm(t)} yeminini kabul etti. Artık onun hizmetindesin${p.rank === 1 ? ' — bir <b>asker</b> olarak' : ''}.`;
      }
      addOp(t, p, -3);
      return `${nm(t)} seni hizmetine almak istemedi.`;
    },
  },
  {
    id: 'terfi', ad: (p) => promoLabel(p), icon: '⬆️', ap: 1, tgt: true,
    show: (p, t) => t.id === p.lordId && isAdult(p) && promoTarget(p, t) !== undefined,
    req: (p, t) => firstReq(jailReq(p, t), promoTarget(p, t) === null ? 'Efendinin verebileceği boş bir unvan yok' : null),
    chance: (p, t) => promoChance(p, t),
    run(p, t) {
      const target = promoTarget(p, t);
      if (!chance(promoChance(p, t) / 100)) {
        addOp(t, p, -5);
        return `${nm(t)} talebini geri çevirdi: "Henüz buna layık değilsin." (-5 ilişki)`;
      }
      if (target === 'asker') { p.baseRank = 1; recalcRank(p); return `${nm(t)} seni ordusuna aldı. Artık bir <b>asker</b>sin!`; }
      if (target === 'sovalye') { p.baseRank = 2; recalcRank(p); p.prestige += 30; return `${nm(t)} kılıcını omzuna dokundurdu. Diz çöktün, <b>şövalye</b> olarak kalktın! (Şan +30)`; }
      giveTitle(target, p);
      refreshLieges();
      p.prestige += 50;
      G.terrDirty = true;
      return `${nm(t)} sana <b>${target.name}</b> topraklarını bağışladı! Artık bir ${rankName(p)}sin. (Şan +50)`;
    },
  },
  {
    id: 'davet', ad: 'Sarayına davet et', icon: '🏰', ap: 1, tgt: true,
    show: (p, t) => p.rank >= 3 && !t.titles.length && t.lordId !== p.id && t.id !== p.id && isAdult(t),
    req: (p, t) => jailReq(p, t),
    chance: (p, t) => { const l = ch(t.lordId); return pct(30 + opinion(t, p) / 2 + (p.rank - (l ? l.rank : 0)) * 15 + (l ? -opinion(t, l) / 3 : 20)); },
    run(p, t) {
      if (chance(this.chance(p, t) / 100)) {
        t.lordId = p.id;
        if (t.spouseId) { const sp = ch(t.spouseId); if (sp && !sp.titles.length) sp.lordId = p.id; }
        return `${nm(t)} davetini kabul etti ve sarayına taşındı.`;
      }
      return `${nm(t)} davetini kibarca reddetti.`;
    },
  },
  {
    id: 'unvanver', ad: (p) => `Toprak bağışla: ${grantable(p) ? grantable(p).name : ''}`, icon: '🎖️', ap: 1, tgt: true,
    show: (p, t) => !!grantable(p) && !t.titles.length && isAdult(t) && t.id !== p.id && (t.lordId === p.id || familyRel(p, t)),
    req: (p, t) => firstReq(jailReq(p, t), t.prisonerOf ? 'Zindanda' : null),
    run(p, t) {
      const tt = grantable(p);
      giveTitle(tt, t);
      const r = ownRealm(p) || realmOf(p);
      tt.liege = r ? r.id : tt.liege;
      refreshLieges();
      addOp(t, p, 40);
      t.prestige += 50;
      G.terrDirty = true;
      return `<b>${tt.name}</b> topraklarını ${nm(t)} adlı kişiye bağışladın. Artık senin vasalın ve sana minnettar. (+40 ilişki)`;
    },
  },
  {
    id: 'mesru', ad: 'Meşrulaştır (50 şan)', icon: '📜', ap: 1, tgt: true,
    show: (p, t) => t.bastard && (t.realFatherId === p.id || t.motherId === p.id),
    req: (p) => firstReq(p.rank < 3 ? 'Toprak sahibi olmalısın' : null, p.prestige < 50 ? '50 şan gerekli' : null),
    run(p, t) {
      p.prestige -= 50;
      t.bastard = false;
      if (!p.female) t.fatherId = p.id;
      t.dyn = p.dyn;
      t.baseRank = Math.max(t.baseRank, 2); recalcRank(t);
      addOp(t, p, 40);
      return `${t.name} artık meşru bir ${p.dyn}! Mirasçılar arasında yerini aldı.`;
    },
  },
  {
    id: 'hapis', ad: (p, t) => `Zindana at${t && !hasKnownCrime(p, t) ? ' (zorbalık!)' : ''}`, icon: '⛓️', ap: 1, tgt: true,
    confirm: t => `${nm(t)} zindana atılacak.`,
    show: (p, t) => p.rank >= 3 && !t.prisonerOf && isUnder(t, p) && isAdult(t),
    req: (p) => jailReq(p),
    run(p, t) {
      const just = hasKnownCrime(p, t);
      if (settlementsOf(t).length && !just && charPower(t) > charPower(p) * 0.4 && chance(0.5)) {
        addOp(t, p, -50);
        rebel(t);
        return `${nm(t)} muhafızlarını kılıçla karşıladı ve <b>isyan etti!</b> Kendi devletini ilan etti, artık savaştasınız.`;
      }
      imprison(p, t, just);
      const st = traitStress(p, just ? { zalim: -5 } : { durust: 10, merhametli: 10, zalim: -5 });
      if (!just) for (const x of living()) if (x.lordId === p.id && x.id !== t.id) addOp(x, p, -5);
      return `${nm(t)} zincire vuruldu ve zindana atıldı.${just ? ' Suçları biliniyor; kimse itiraz etmedi.' : ' <b>Hiçbir gerekçe yok</b>. Vasalların tedirgin. (Zorbalık +15, Korku +8)'}${stressNote(st)}`;
    },
  },
  {
    id: 'idam', ad: 'İdam et', icon: '🪓', ap: 1, tgt: true,
    confirm: t => `${nm(t)} idam edilecek. Bunun geri dönüşü yok.`,
    show: (p, t) => playerCaptive(p, t),
    req: () => null,
    run(p, t) {
      const tname = nm(t);
      const st = traitStress(p, { merhametli: 30, zalim: -15 });
      const just = execute(p, t);
      if (!just) for (const x of living()) if (x.lordId === p.id) addOp(x, p, -10);
      return `${tname} kalabalığın önünde idam edildi. ${just ? 'Adalet yerini buldu.' : '<b>Haksız bir idam</b> — insanlar senden korkuyor ama sevmiyor.'} (Korku +15)${stressNote(st)}`;
    },
  },
  {
    id: 'iskence', ad: 'İşkence et', icon: '🔥', ap: 1, tgt: true,
    confirm: t => `${nm(t)} işkenceye gönderilecek.`,
    show: (p, t) => playerCaptive(p, t),
    req: () => null,
    run(p, t) {
      const st = traitStress(p, { merhametli: 25, zalim: -15 });
      const found = G.secrets.filter(s => (s.actor === t.id || s.target === t.id) && !knows(p, s));
      found.forEach(s => learn(p, s));
      t.health -= 25; p.dread += 8;
      addTrait(t, 'yarali');
      let m = `Zindandan çığlıklar yükseldi. ${nm(t)} konuştu.`;
      m += found.length ? '<br>' + found.map(s => `• <i>${secretText(s)}</i>`).join('<br>') : '<br>...ama bildiği bir şey yokmuş.';
      if (t.health <= 0) { die(t, 'İşkencede öldü'); m += '<br><b>İşkenceye dayanamadı ve öldü.</b>'; }
      return m + ` (Korku +8)${stressNote(st)}`;
    },
  },
  {
    id: 'fidyeal', ad: 'Fidye karşılığı bırak', icon: '💰', ap: 1, tgt: true,
    show: (p, t) => playerCaptive(p, t) && t.gold > 0,
    req: () => null,
    run(p, t) {
      const amt = Math.min(t.gold, 20 + t.rank * 30);
      t.gold -= amt; p.gold += amt; t.prisonerOf = null;
      return `${nm(t)} ${amt} altın fidye ödeyerek serbest kaldı.`;
    },
  },
  {
    id: 'serbest', ad: 'Serbest bırak', icon: '🔓', ap: 1, tgt: true,
    show: (p, t) => playerCaptive(p, t),
    req: () => null,
    run(p, t) {
      t.prisonerOf = null; addOp(t, p, 20);
      const st = traitStress(p, { merhametli: -10 });
      return `${nm(t)} zincirlerinden kurtuldu. Merhametini unutmayacak. (+20 ilişki)${stressNote(st)}`;
    },
  },
  {
    id: 'elkoy', ad: 'Topraklarına el koy', icon: '🏴', ap: 1, tgt: true,
    show: (p, t) => playerCaptive(p, t) && settlementsOf(t).length > 0 && (isUnder(t, p) || hostileChars(p, t)),
    req: () => null,
    run(p, t) {
      const just = hasKnownCrime(p, t) || hostileChars(p, t);
      const taken = settlementsOf(t);
      const r = ownRealm(p) || realmOf(p);
      const oldR = realmOf(t);
      taken.forEach(tt => { giveTitle(tt, p); tt.liege = r ? r.id : null; });
      refreshLieges();
      if (oldR && oldR !== r) checkRealmDeath(oldR);
      G.terrDirty = true;
      addOp(t, p, -50);
      if (!just) { p.tyranny += 20; for (const x of living()) if (x.lordId === p.id) addOp(x, p, -10); }
      return `${taken.map(x => x.name).join(', ')} artık senin. ${just ? '' : '<b>Vasalların bu zorbalığı unutmayacak.</b> (Zorbalık +20)'}`;
    },
  },
  {
    id: 'savas', ad: (p, t) => `Savaş ilan et: ${t && ownRealm(t) ? ownRealm(t).name : ''}`, icon: '⚔️', ap: 1, tgt: true,
    confirm: t => `${ownRealm(t).name} ile savaşa gireceksin. Orduları senin topraklarına yürüyecek.`,
    show: (p, t) => !!ownRealm(p) && !!ownRealm(t) && ownRealm(p) !== ownRealm(t) && !atWarRealms(ownRealm(p), ownRealm(t)),
    req: (p, t) => jailReq(p, t),
    info: (p, t) => `Gücün ~${Math.round(charPower(p))} · Onun ~${Math.round(charPower(t))}`,
    run(p, t) {
      declareWar(ownRealm(p), ownRealm(t));
      addOp(t, p, -40);
      return `Savaş borazanları çaldı! ${ownRealm(t).name} ile savaştasın. Şehirlerini kuşat, ordularını ez.`;
    },
  },
  {
    id: 'baris', ad: 'Barış teklif et', icon: '🕊️', ap: 1, tgt: true,
    show: (p, t) => !!ownRealm(p) && !!ownRealm(t) && atWarRealms(ownRealm(p), ownRealm(t)),
    req: (p, t) => jailReq(p, t),
    chance: (p, t) => {
      const w = G.wars.find(w => [w.a, w.b].includes(ownRealm(p).id) && [w.a, w.b].includes(ownRealm(t).id));
      const bal = w ? (w.taken[ownRealm(p).id] || 0) - (w.taken[ownRealm(t).id] || 0) : 0;
      return pct(25 + bal * 15 + opinion(t, p) / 3 + (charPower(p) / Math.max(1, charPower(t)) - 1) * 20 + (w ? (G.day - w.start) / 30 * 2 : 0));
    },
    run(p, t) {
      if (chance(this.chance(p, t) / 100)) { makePeace(ownRealm(p), ownRealm(t)); return `${nm(t)} barışı kabul etti. Kılıçlar kınına girdi.`; }
      return `${nm(t)} teklifini küçümsedi: "Savaş bitmedi!"`;
    },
  },

  /* ===================== KENDİ EYLEMLERİN ===================== */
  {
    id: 'calis', ad: p => (p.rank === 0 ? 'Tarlada çalış' : p.rank <= 2 ? 'Ek iş yap' : 'Malikâneni yönet'), icon: '⚒️', ap: 1,
    show: p => isAdult(p) || p.age >= 10,
    req: p => jailReq(p),
    run(p) {
      const g = p.rank === 0 ? rnd(3, 7) : p.rank <= 2 ? rnd(4, 9) : rnd(10, 20) + stat(p, 'yon');
      p.gold += g;
      let m = `Ter döktün ve <b>${g} altın</b> kazandın.`;
      if (chance(0.1)) { p.base.yon++; m += ' Bu arada işini daha iyi öğrendin. (Yönetim +1)'; }
      return m;
    },
  },
  {
    id: 'antrenman', ad: 'Kılıç talimi yap', icon: '🗡️', ap: 1,
    show: p => p.age >= 8,
    req: p => jailReq(p),
    run(p) {
      let m = 'Saatlerce kılıç salladın.';
      if (chance(0.45) && p.base.sav < 20) { p.base.sav++; m += ' Ustalaştığını hissediyorsun. (Savaş +1)'; }
      else m += ' Bugün pek ilerleme kaydedemedin.';
      if (chance(0.08)) { p.health -= 10; m += ' Talimde yaralandın. (Sağlık -10)'; }
      return m;
    },
  },
  {
    id: 'okuma', ad: 'Ders al (5💰)', icon: '📚', ap: 1,
    show: p => p.age >= 6,
    req: p => firstReq(jailReq(p), goldReq(p, 5)),
    run(p) {
      p.gold -= 5;
      if (chance(0.45)) {
        const s = pick(['dip', 'ent', 'yon', 'cek']);
        if (p.base[s] < 20) p.base[s]++;
        return `Bir keşişten ders aldın. ${STATS[s]} yeteneğin gelişti! (+1)`;
      }
      return 'Ders sıkıcıydı, pek bir şey öğrenemedin.';
    },
  },
  {
    id: 'eskiya', ad: 'Yol kes (eşkıyalık)', icon: '🏴‍☠️', ap: 1,
    confirm: () => 'Yol kesip yolcuları soyacaksın. Yakalanırsan zindanı boylarsın.',
    show: p => p.rank <= 2 && isAdult(p),
    req: p => firstReq(jailReq(p), p.health < 40 ? 'Çok yaralısın' : null),
    chance: p => pct(40 + stat(p, 'sav') * 4),
    run(p) {
      const st = traitStress(p, { merhametli: 15, durust: 10, zalim: -5 });
      let m;
      if (chance(this.chance(p) / 100)) {
        const g = rnd(15, 45);
        p.gold += g; p.dread += 2;
        m = `Karanlıkta bir tüccar kervanını bastın. <b>${g} altın</b> kaptın.`;
        if (chance(0.25)) {
          const known = [p.id];
          const l = ch(p.lordId);
          if (l && chance(0.35)) known.push(l.id);
          addSecret('eskiya', p.id, null, known);
          m += ' Ama biri yüzünü gördü...';
        }
      } else {
        const d = rnd(15, 35);
        p.health -= d;
        m = `Kervan muhafızları seni fena hırpaladı. (Sağlık -${d})`;
        const l = ch(p.lordId);
        if (l && free(l) && chance(0.15)) {
          addSecret('eskiya', p.id, null, [p.id, l.id]);
          imprison(l, p, true);
          m += ` <b>Yakalandın ve ${nm(l)} seni zindana attı!</b>`;
        }
        if (p.health <= 0) die(p, 'Yol kesmeye çalışırken öldürüldü');
      }
      return m + stressNote(st);
    },
  },
  {
    id: 'ziyafet', ad: p => `Ziyafet ver (${feastCost(p)}💰)`, icon: '🍗', ap: 1,
    show: p => p.rank >= 2 && isAdult(p),
    req: p => firstReq(jailReq(p), goldReq(p, feastCost(p))),
    run(p) {
      p.gold -= feastCost(p);
      const guests = living().filter(x => x.id !== p.id && (x.lordId === p.id || x.id === p.lordId || familyRel(p, x) || (p.lordId && x.lordId === p.lordId)));
      guests.forEach(x => addOp(x, p, 12));
      const pr = 20 + p.rank * 5;
      p.prestige += pr;
      const st = stress(p, -10);
      return `Şarap su gibi aktı, ozanlar şarkı söyledi. ${guests.length} misafir seni övüyor. (+12 ilişki, Şan +${pr})${stressNote(st)}`;
    },
  },
  {
    id: 'turnuva', ad: 'Turnuvaya katıl (10💰)', icon: '🏇', ap: 1,
    show: p => p.rank >= 1 && isAdult(p),
    req: p => firstReq(jailReq(p), goldReq(p, 10), p.health < 50 ? 'Çok yaralısın' : null),
    chance: p => pct(30 + (stat(p, 'sav') - 6) * 6),
    run(p) {
      p.gold -= 10;
      if (chance(this.chance(p) / 100)) {
        p.gold += 60; p.prestige += 50;
        return '🏆 Mızrağın rakibini atından düşürdü! Turnuvayı kazandın: <b>60 altın</b> ve büyük şan! (Şan +50)';
      }
      p.prestige += 5;
      if (chance(0.35)) {
        p.health -= 25;
        if (chance(0.3)) addTrait(p, 'yarali');
        if (p.health <= 0) { die(p, 'Turnuvada aldığı yaralar'); return 'Ölümcül bir darbe aldın...'; }
        return 'Attan düştün ve kemiklerin çatırdadı. (Sağlık -25)';
      }
      return 'İyi dövüştün ama kazanamadın. (Şan +5)';
    },
  },
  {
    id: 'eglen', ad: 'Meyhaneye git (5💰)', icon: '🍺', ap: 1,
    show: p => p.age >= 14,
    req: p => firstReq(jailReq(p), goldReq(p, 5)),
    run(p) {
      p.gold -= 5;
      const st = stress(p, -25 + (has(p, 'sehvetli') ? -5 : 0));
      let m = `Bir gece boyunca içtin, güldün, şarkı söyledin.${stressNote(st)}`;
      if (chance(0.08)) { addTrait(p, 'ayyas'); m += ' Ama bu alışkanlık haline geliyor... (<b>Ayyaş</b>)'; }
      if (chance(0.3)) {
        const n = makeChar({ female: chance(0.85) ? !p.female : p.female, age: rnd(17, 35), rank: rnd(0, 1), lordId: p.lordId, gold: rnd(1, 8), cul: localCulture() });
        addOp(n, p, rnd(20, 40));
        m += `<br>Bu gece <b>${nm(n)}</b> ile tanıştın. Sana ilgiyle bakıyordu.`;
      }
      return m;
    },
  },
  {
    id: 'dinlen', ad: 'Dinlen', icon: '🛌', ap: 1,
    show: () => true,
    req: () => null,
    run(p) {
      p.health = Math.min(100, p.health + 20);
      const st = stress(p, -15);
      return `Dinlendin ve kendine geldin. (Sağlık +20)${stressNote(st)}`;
    },
  },
  {
    id: 'vergi', ad: 'Vergileri sık', icon: '🪙', ap: 1,
    show: p => p.rank >= 3,
    req: p => jailReq(p),
    run(p) {
      const g = 15 * (p.rank - 2) + stat(p, 'yon');
      p.gold += g;
      living().filter(x => x.lordId === p.id).forEach(x => addOp(x, p, -8));
      const st = traitStress(p, { acgozlu: -5, comert: 10, merhametli: 5 });
      return `Tahsildarların köy köy dolaştı. <b>${g} altın</b> topladın ama vasalların homurdanıyor. (-8 ilişki)${stressNote(st)}`;
    },
  },
  {
    id: 'bagimsizlik', ad: 'Bağımsızlık ilan et', icon: '🏴', ap: 1,
    confirm: () => 'Efendine karşı isyan edip kendi devletini kuracaksın. Eski krallığın sana savaş açacak.',
    show: p => settlementsOf(p).length > 0 && p.lordId != null && !ownRealm(p),
    req: p => jailReq(p),
    info: p => { const l = ch(p.lordId); return l ? `Gücün ~${Math.round(charPower(p))} · Efendinin ~${Math.round(charPower(topLiege(p)))}` : ''; },
    run(p) {
      const r = rebel(p);
      return `İsyan bayrağını kaldırdın! <b>${r.name}</b> kuruldu. Artık kendi devletinin hükümdarısın ve eski efendinle savaştasın.`;
    },
  },
  {
    id: 'kralliginikur', ad: 'Krallığını ilan et (300 şan)', icon: '👑', ap: 1,
    show: p => settlementsOf(p).length > 0 && p.lordId == null && !ownRealm(p),
    req: p => firstReq(jailReq(p), settlementsOf(p).length < 2 ? 'En az 2 şehir/kale gerekli' : null, p.prestige < 300 ? '300 şan gerekli' : null),
    run(p) {
      p.prestige -= 300;
      const r = createRealm(p);
      return `Taç başına kondu! <b>${r.name}</b> kuruldu ve sen onun ilk hükümdarısın. 👑`;
    },
  },
  {
    id: 'parali', ad: 'Paralı asker kirala (150💰)', icon: '🪖', ap: 1,
    show: p => !!playerParty(),
    req: p => firstReq(jailReq(p), goldReq(p, 150)),
    run(p) {
      const pt = playerParty();
      p.gold -= 150;
      const add = CULTURES[localCulture()].east ? { piyade: 12, atliokcu: 10 } : { piyade: 14, okcu: 8, atli: 4 };
      for (const k in add) pt.troops[k] = (pt.troops[k] || 0) + add[k];
      return `Paralı bir bölük sancağının altına geçti: ${lossText(add)}.`;
    },
  },
  {
    id: 'kacis', ad: 'Kaçmayı dene', icon: '🏃', ap: 1,
    show: p => !!p.prisonerOf,
    req: () => null,
    chance: p => pct(15 + stat(p, 'ent') * 3 + stat(p, 'sav') * 2),
    run(p) {
      const cap = ch(p.prisonerOf);
      if (chance(this.chance(p) / 100)) {
        p.prisonerOf = null;
        if (cap && p.lordId === cap.id && !p.titles.length) p.lordId = null;
        return `Gece yarısı zincirlerini kırdın ve surlardan aşağı atladın. <b>Özgürsün!</b>${p.lordId == null ? ' Artık kimseye hizmet etmiyorsun.' : ''}`;
      }
      p.health -= 10;
      if (cap) addOp(cap, p, -10);
      return 'Muhafızlar seni yakaladı ve dövdü. (Sağlık -10)';
    },
  },
  {
    id: 'gardiyan', ad: 'Gardiyana rüşvet ver (30💰)', icon: '🔑', ap: 1,
    show: p => !!p.prisonerOf,
    req: p => goldReq(p, 30),
    chance: () => 60,
    run(p) {
      p.gold -= 30;
      if (chance(0.6)) {
        const cap = ch(p.prisonerOf);
        p.prisonerOf = null;
        if (cap && p.lordId === cap.id && !p.titles.length) p.lordId = null;
        return 'Gardiyan anahtarı "unuttu". Sessizce kaçtın. <b>Özgürsün!</b>';
      }
      return 'Gardiyan altını aldı... ve hiçbir şey yapmadı.';
    },
  },
];
const ACTION_MAP = Object.fromEntries(ACTIONS.map(a => [a.id, a]));

function grantable(p) {
  const ss = settlementsOf(p).filter(x => !x.capital).sort((a, b) => (a.kind === 'kale' ? -1 : 1));
  return settlementsOf(p).length >= 2 ? ss[0] || null : null;
}
function feastCost(p) { return [0, 0, 20, 40, 80, 120][p.rank]; }
/* Terfi hedefi: 'asker' | 'sovalye' | unvan nesnesi | null (boş unvan yok) | undefined (uygun değil) */
function promoTarget(p, t) {
  if (!t) return undefined;
  if (!p.titles.length) {
    if (p.baseRank === 0) return 'asker';
    if (p.baseRank === 1) return 'sovalye';
  }
  if (!settlementsOf(t).length) return undefined;
  return spareTitles(t)[0] || null;
}
function promoLabel(p) {
  if (!p.titles.length) {
    if (p.baseRank === 0) return 'Askere yazılmak iste';
    if (p.baseRank === 1) return (CULTURES[p.cul] && CULTURES[p.cul].east) ? 'Sipahilik iste' : 'Şövalyelik iste';
    return 'Toprak (tımar) iste';
  }
  return 'Ek toprak iste';
}
function promoChance(p, t) {
  const target = promoTarget(p, t);
  const o = opinion(t, p);
  if (target === 'asker') return pct(70 + o / 2);
  if (target === 'sovalye') return pct(5 + o / 1.5 + (stat(p, 'sav') - 5) * 5 + p.prestige / 8);
  return pct(o / 2 + p.prestige / 10);
}
