'use strict';
/* =========================================================
   Crown & Dagger — Oyuncu eylemleri
   Her eylem: show (görünür mü), req (engel sebebi ya da null),
   chance (başarı %), run (sonuç metni döner)
   ========================================================= */

const pct = n => Math.round(clamp(n, 0, 100));
const mercSize = n => Math.round(Math.max(800, maxTroops(n) * 0.08));
function jailReq(p, t) {
  if (p.prisonerOf && (!t || t.id !== p.prisonerOf)) return L('Zindandasın', 'You are imprisoned');
  if (t && t.prisonerOf && t.prisonerOf !== p.id) return L('O zindanda', 'They are imprisoned');
  return null;
}
function adultReq(p, t) {
  if (!isAdult(p)) return L('Henüz çocuksun', 'You are still a child');
  if (t && !isAdult(t)) return L('O daha çocuk', 'They are still a child');
  return null;
}
const firstReq = (...rs) => rs.find(r => r) || null;
const goldReq = (p, n) => (p.gold < n ? L(`${n} altın gerekli`, `Requires ${n} gold`) : null);
const opNote = n => L(`${n > 0 ? '+' : ''}${n} ilişki`, `${n > 0 ? '+' : ''}${n} opinion`);
function playerCaptive(p, t) { return t.prisonerOf === p.id; }

const ACTIONS = [
  /* ===================== KİŞİYE YÖNELİK ===================== */
  {
    id: 'sohbet', get ad() { return L('Sohbet et', 'Converse'); }, icon: '💬', ap: 1, tgt: true,
    show: () => false, // yerini diyalog sistemi aldı (Konuş)
    req: (p, t) => jailReq(p, t),
    chance: (p, t) => pct(55 + (stat(p, 'dip') - 5) * 5 + opinion(t, p) / 4),
    run(p, t) {
      if (chance(this.chance(p, t) / 100)) {
        const g = rnd(6, 12) + Math.floor(stat(p, 'dip') / 2);
        addOp(t, p, g); addOp(p, t, 4);
        let m = L(`${nm(t)} ile keyifli bir sohbet ettin.`, `You had a pleasant talk with ${nm(t)}.`) + ` (${opNote(g)})`;
        if (opinion(t, p) > 40 && chance(0.2)) {
          const s = secretAbout(t, p);
          if (s) { learn(p, s); m += L(`<br>Şarabın etkisiyle ağzından bir sır kaçırdı: <i>${secretText(s)}</i>`, `<br>Loosened by wine, they let a secret slip: <i>${secretText(s)}</i>`); }
        }
        return m;
      }
      addOp(t, p, -4);
      return L(`${nm(t)} ile sohbet tatsız geçti.`, `Your talk with ${nm(t)} went poorly.`) + ` (${opNote(-4)})`;
    },
  },
  {
    id: 'hediye', get ad() { return L('Hediye ver (10💰)', 'Send a gift (10💰)'); }, icon: '🎁', ap: 1, tgt: true,
    show: () => true,
    req: (p, t) => firstReq(jailReq(p, t), goldReq(p, 10)),
    run(p, t) {
      p.gold -= 10; t.gold += 10;
      const g = 10 + (has(t, 'acgozlu') ? 8 : 0);
      addOp(t, p, g);
      return L(`${nm(t)} hediyeni memnuniyetle kabul etti.`, `${nm(t)} gladly accepted your gift.`) + ` (${opNote(g)})`;
    },
  },
  {
    id: 'rusvet', get ad() { return L('Rüşvet ver (50💰)', 'Bribe (50💰)'); }, icon: '💰', ap: 1, tgt: true,
    show: (p, t) => isAdult(t),
    req: (p, t) => firstReq(jailReq(p, t), goldReq(p, 50)),
    run(p, t) {
      if (has(t, 'durust') && chance(0.4)) {
        addOp(t, p, -15);
        return L(`${nm(t)} keseyi yüzüne fırlattı: "Beni satın alabileceğini mi sandın?"`, `${nm(t)} threw the purse back in your face: "You thought you could buy me?"`) + ` (${opNote(-15)})`;
      }
      p.gold -= 50; t.gold += 50;
      const g = 28 + (has(t, 'acgozlu') ? 15 : 0);
      addOp(t, p, g);
      if (t.rank >= 3) addSecret('rusvet', t.id, p.id, [t.id, p.id]);
      return L(`${nm(t)} keseyi sessizce cebine koydu. Artık sana borçlu hissediyor.`, `${nm(t)} quietly pocketed the purse. They now feel indebted to you.`) + ` (${opNote(g)})`;
    },
  },
  {
    id: 'bastan', get ad() { return L('Baştan çıkar', 'Seduce'); }, icon: '🌹', ap: 1, tgt: true,
    show: (p, t) => isGrown(p) && isGrown(t) && !closeKin(p, t) && !p.lovers.includes(t.id) && p.spouseId !== t.id,
    req: (p, t) => firstReq(jailReq(p, t), t.prisonerOf ? L('Esaret altında rıza olmaz', 'No consent in captivity') : null, !attracted(t, p) ? L('Sana o gözle bakmıyor', 'Not drawn to you that way') : null),
    chance: (p, t) => seduceChance(p, t),
    run(p, t) {
      if (chance(seduceChance(p, t) / 100)) {
        becomeLovers(p, t);
        const s = traitStress(p, { iffetli: 15, sehvetli: -10 });
        return L(`Bakışlar, fısıltılar ve sonra karanlık bir oda... ${nm(t)} artık senin <b>sevgilin</b>.`, `Glances, whispers, then a dark room... ${nm(t)} is now your <b>lover</b>.`) +
          (p.spouseId || t.spouseId ? L(' (Yasak bir ilişki — bu bir sır.)', ' (A forbidden affair — this is a secret.)') : '') + stressNote(s);
      }
      addOp(t, p, -10);
      let m = L(`${nm(t)} seni nazikçe ama kesin bir dille reddetti.`, `${nm(t)} turned you down, kindly but firmly.`) + ` (${opNote(-10)})`;
      const sp = ch(t.spouseId);
      if (sp && sp.alive && (has(t, 'durust') || has(t, 'iffetli')) && chance(0.4)) {
        addOp(sp, p, -30);
        m += L(`<br>Üstelik olanları eşi ${nm(sp)}'e anlattı!`, `<br>And they told their spouse ${nm(sp)} everything!`);
      }
      return m;
    },
  },
  {
    id: 'ayril', get ad() { return L('İlişkiyi bitir', 'End the affair'); }, icon: '💔', ap: 0, tgt: true,
    show: (p, t) => p.lovers.includes(t.id),
    req: () => null,
    run(p, t) { breakUp(p, t); addOp(t, p, -25); return L(`${nm(t)} ile ilişkini bitirdin. Kalbi kırıldı.`, `You ended things with ${nm(t)}. Their heart is broken.`) + ` (${opNote(-25)})`; },
  },
  {
    id: 'evlen', get ad() { return L('Evlenme teklif et', 'Propose marriage'); }, icon: '💍', ap: 1, tgt: true,
    show: (p, t) => isAdult(p) && isAdult(t) && !p.spouseId && !t.spouseId && !closeKin(p, t),
    req: (p, t) => jailReq(p, t),
    chance: (p, t) => marryChance(p, t),
    run(p, t) {
      if (chance(marryChance(p, t) / 100)) {
        marry(p, t);
        p.prestige += 10 + t.rank * 10;
        return L(`${nm(t)} teklifini kabul etti! Görkemli olmasa da güzel bir düğün yapıldı. 💍`, `${nm(t)} accepted your proposal! Not a grand wedding, but a lovely one. 💍`);
      }
      addOp(t, p, -5);
      return L(`${nm(t)} teklifini reddetti.`, `${nm(t)} refused your proposal.`) + ` (${opNote(-5)})`;
    },
  },
  {
    id: 'bosan', get ad() { return L('Boşan', 'Divorce'); }, icon: '📜', ap: 1, tgt: true,
    show: (p, t) => p.spouseId === t.id,
    req: () => null,
    run(p, t) {
      divorce(p);
      addOp(t, p, -50); p.prestige -= 20;
      if (t.lordId === p.id && !t.titles.length) t.lordId = null;
      return L(`${nm(t)} ile evliliğini bitirdin. Saray çalkalanıyor. (Şan -20)`, `You ended your marriage to ${nm(t)}. The court is in uproar. (Prestige -20)`);
    },
  },
  {
    id: 'casus', get ad() { return L('Casusluk yap', 'Spy on'); }, icon: '🕵️', ap: 1, tgt: true,
    show: (p, t) => t.age >= 12,
    req: (p, t) => jailReq(p),
    chance: (p, t) => spyChance(p, t),
    run(p, t) {
      const r = spy(p, t);
      if (r.ok && r.s) return L(`Casusların işini yaptı. Öğrendiğin sır:<br><i>${secretText(r.s)}</i>`, `Your spies did their work. The secret you learned:<br><i>${secretText(r.s)}</i>`);
      if (r.ok) return L(`${nm(t)} hakkında kayda değer bir şey bulunamadı. Ya temiz ya da çok dikkatli.`, `Nothing noteworthy was found about ${nm(t)}. Either clean or very careful.`);
      if (r.caught) return L(`Casusun yakalandı! ${nm(t)} kimin gönderdiğini biliyor.`, `Your spy was caught! ${nm(t)} knows who sent them.`) + ` (${opNote(-25)})`;
      return L('Casusların eli boş döndü.', 'Your spies came back empty-handed.');
    },
  },
  {
    id: 'santaj', get ad() { return L('Şantaj yap', 'Blackmail'); }, icon: '🐍', ap: 1, tgt: true,
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
        return L(`"${SECRETS[s.type].ad}" konusundaki sırrını herkese anlatmakla tehdit ettin. ${nm(t)} titreyen ellerle <b>${amt} altın</b> ödedi.`, `You threatened to reveal their secret ("${SECRETS[s.type].ad}"). With trembling hands, ${nm(t)} paid <b>${amt} gold</b>.`) + ` (${opNote(-30)})${stressNote(st)}`;
      }
      addOp(t, p, -40);
      const mine = G.secrets.filter(x => x.actor === p.id && !x.pub && x.known.includes(t.id));
      if (mine.length && chance(0.5)) {
        exposeSecret(mine[0]);
        return L(`${nm(t)} korkmadı. Aksine, senin sırrını herkese yaydı: <i>${secretText(mine[0])}</i>`, `${nm(t)} was not afraid. Instead, they spread your secret: <i>${secretText(mine[0])}</i>`);
      }
      return L(`${nm(t)} seni kapı dışarı etti: "Elinden geleni ardına koyma!"`, `${nm(t)} threw you out: "Do your worst!"`) + ` (${opNote(-40)})`;
    },
  },
  {
    id: 'ifsa', get ad() { return L('Sırrını ifşa et', 'Expose secret'); }, icon: '📢', ap: 1, tgt: true,
    show: (p, t) => knownSecretsOf(p, t).length > 0,
    req: (p) => jailReq(p),
    run(p, t) {
      const list = knownSecretsOf(p, t).sort((a, b) => SECRETS[b.type].shame - SECRETS[a.type].shame);
      const s = list[0];
      exposeSecret(s);
      addOp(t, p, -60);
      p.prestige += 5;
      return L(`Sırrı meydanda bağırdın: <i>${secretText(s)}</i><br>${nm(t)} rezil oldu. Senden nefret ediyor.`, `You shouted the secret in the square: <i>${secretText(s)}</i><br>${nm(t)} is disgraced and hates you.`) + ` (${opNote(-60)})`;
    },
  },
  {
    id: 'iftira', get ad() { return L('İftira at', 'Slander'); }, icon: '🗣️', ap: 1, tgt: true,
    show: (p, t) => isAdult(t),
    req: (p) => jailReq(p),
    chance: (p, t) => slanderChance(p, t),
    run(p, t) {
      const st = traitStress(p, { durust: 15, kurnaz: -5 });
      const r = slander(p, t);
      if (r.ok) return L(`${nm(t)} hakkında yaydığın yalanlar sarayda dilden dile dolaşıyor. Efendisi artık ona şüpheyle bakıyor.`, `The lies you spread about ${nm(t)} pass from mouth to mouth at court. Their liege now eyes them with suspicion.`) + stressNote(st);
      if (r.caught) return L('Yalanın ortaya çıktı! Herkes iftira attığını biliyor. (-40 ilişki, rezalet)', 'Your lie was exposed! Everyone knows you slandered them. (-40 opinion, shame)') + stressNote(st);
      return L('Dedikodun tutmadı, kimse inanmadı.', 'Your gossip did not stick; nobody believed it.') + stressNote(st);
    },
  },
  {
    id: 'suikast', get ad() { return L('Suikast düzenle (30💰)', 'Arrange murder (30💰)'); }, icon: '🗡️', ap: 1, tgt: true,
    confirm: t => L(`${nm(t)} için bir katil tutmak istediğine emin misin?`, `Are you sure you want to hire a killer for ${nm(t)}?`),
    show: (p, t) => t.alive,
    req: (p, t) => firstReq(jailReq(p, t), goldReq(p, 30)),
    chance: (p, t) => murderChance(p, t),
    run(p, t) {
      const st = traitStress(p, { merhametli: 25, durust: 10, zalim: -10 }) + (closeKin(p, t) ? stress(p, 20) : 0);
      const tname = nm(t);
      const r = tryMurder(p, t);
      if (r.ok) return L(`${tname} bu sabah ölü bulundu. `, `${tname} was found dead this morning. `) + (r.exposed ? L('<b>Ama izler sana çıkıyor! Herkes katilin sen olduğunu biliyor.</b>', '<b>But the trail leads to you! Everyone knows you are the killer.</b>') : L('Kimse senden şüphelenmiyor... şimdilik.', 'Nobody suspects you... for now.')) + stressNote(st);
      if (r.exposed) return L(`Suikast başarısız oldu ve katil yakalandı. ${tname} seni ele verdiğini öğrendi!`, `The murder failed and the killer was caught. ${tname} learned you were behind it!`) + ` (${opNote(-100)})${stressNote(st)}`;
      return L('Katil son anda vazgeçti ve altınınla birlikte ortadan kayboldu.', 'The killer lost their nerve and vanished with your gold.') + stressNote(st);
    },
  },
  {
    id: 'duello', get ad() { return L('Düelloya davet et', 'Challenge to a duel'); }, icon: '🤺', ap: 1, tgt: true,
    confirm: t => L(`${nm(t)} ile ölümüne bir düello olabilir. Emin misin?`, `A duel with ${nm(t)} could be to the death. Are you sure?`),
    show: (p, t) => isAdult(p) && isAdult(t),
    req: (p, t) => firstReq(jailReq(p, t), p.health < 30 ? L('Çok yaralısın', 'You are too wounded') : null, t.health < 30 ? L('O çok yaralı', 'They are too wounded') : null, playerCaptive(p, t) ? L('Zindanda', 'Imprisoned') : null),
    chance: (p, t) => duelChance(p, t),
    run(p, t) {
      if (!(has(t, 'cesur') || opinion(t, p) < -20 || stat(t, 'sav') >= stat(p, 'sav') || chance(0.3))) {
        t.prestige -= 15; p.prestige += 5;
        return L(`${nm(t)} meydan okumanı korkakça reddetti. Herkes onunla alay ediyor. (Şan +5)`, `${nm(t)} cravenly refused your challenge. Everyone mocks them. (Prestige +5)`);
      }
      const tname = nm(t);
      const r = duel(p, t);
      if (r.win === p) return L(`⚔️ Çelik çeliğe çarptı... ve sen kazandın! ${tname} ${r.res}. (Şan +25)`, `⚔️ Steel rang on steel... and you won! ${tname} ${r.res}. (Prestige +25)`);
      return L(`⚔️ Çelik çeliğe çarptı... ve yenildin. Sen ${r.res}. (Şan -10)`, `⚔️ Steel rang on steel... and you lost. You ${r.res}. (Prestige -10)`);
    },
  },
  {
    id: 'tehdit', get ad() { return L('Gözdağı ver / haraç kes', 'Intimidate / extort'); }, icon: '😠', ap: 1, tgt: true,
    show: (p, t) => isAdult(p) && isAdult(t) && t.rank <= p.rank + 1,
    req: (p, t) => jailReq(p, t),
    chance: (p, t) => pct(20 + p.dread / 2 + (stat(p, 'sav') - stat(t, 'sav')) * 4 - (has(t, 'cesur') ? 20 : 0) + (has(t, 'korkak') ? 25 : 0) + (p.rank - t.rank) * 10),
    run(p, t) {
      if (chance(this.chance(p, t) / 100)) {
        const amt = Math.min(t.gold, 10 + p.rank * 10);
        t.gold -= amt; p.gold += amt; p.dread += 3;
        addOp(t, p, -15);
        const st = traitStress(p, { merhametli: 10, zalim: -5 });
        return L(`${nm(t)} gözlerindeki ölümü gördü ve <b>${amt} altını</b> sessizce uzattı. (Korku +3)`, `${nm(t)} saw death in your eyes and quietly handed over <b>${amt} gold</b>. (Dread +3)`) + stressNote(st);
      }
      addOp(t, p, -20); p.prestige -= 5;
      return L(`${nm(t)} sana güldü: "Beni mi korkutacaksın?" (Şan -5)`, `${nm(t)} laughed at you: "You think you can scare me?" (Prestige -5)`);
    },
  },
  {
    id: 'yardim', get ad() { return L('Yardım et (10💰)', 'Give charity (10💰)'); }, icon: '🤲', ap: 1, tgt: true,
    show: (p, t) => (t.gold < 20 || t.rank <= 1 || t.health < 60),
    req: (p, t) => firstReq(jailReq(p, t), goldReq(p, 10)),
    run(p, t) {
      p.gold -= 10; t.gold += 10;
      addOp(t, p, 15); p.prestige += 3;
      const st = traitStress(p, { merhametli: -10, comert: -5, acgozlu: 10 });
      return L(`${nm(t)} gözleri dolarak yardımını kabul etti. (+15 ilişki, Şan +3)`, `With tears in their eyes, ${nm(t)} accepted your help. (+15 opinion, Prestige +3)`) + stressNote(st);
    },
  },
  {
    id: 'hizmet', get ad() { return L('Hizmetine gir', 'Swear fealty'); }, icon: '🛡️', ap: 1, tgt: true,
    show: (p, t) => !p.titles.length && t.rank >= 3 && t.id !== p.lordId && isAdult(p),
    req: (p, t) => jailReq(p, t),
    chance: (p, t) => pct(40 + opinion(t, p) / 2 + stat(p, 'sav') * 2 + p.prestige / 20),
    run(p, t) {
      if (chance(this.chance(p, t) / 100)) {
        const old = ch(p.lordId);
        if (old && old.alive) addOp(old, p, -15);
        p.lordId = t.id;
        if (p.baseRank === 0) { p.baseRank = 1; recalcRank(p); }
        return L(`${nm(t)} yeminini kabul etti. Artık onun hizmetindesin${p.rank === 1 ? ' — bir <b>asker</b> olarak' : ''}.`, `${nm(t)} accepted your oath. You are now in their service${p.rank === 1 ? ' — as a <b>soldier</b>' : ''}.`);
      }
      addOp(t, p, -3);
      return L(`${nm(t)} seni hizmetine almak istemedi.`, `${nm(t)} did not want you in their service.`);
    },
  },
  {
    id: 'terfi', ad: (p) => promoLabel(p), icon: '⬆️', ap: 1, tgt: true,
    show: (p, t) => t.id === p.lordId && isAdult(p) && promoTarget(p, t) !== undefined,
    req: (p, t) => firstReq(jailReq(p, t), promoTarget(p, t) === null ? L('Efendinin verebileceği boş bir unvan yok', 'Your liege has no spare title to grant') : null),
    chance: (p, t) => promoChance(p, t),
    run(p, t) {
      const target = promoTarget(p, t);
      if (!chance(promoChance(p, t) / 100)) {
        addOp(t, p, -5);
        return L(`${nm(t)} talebini geri çevirdi: "Henüz buna layık değilsin."`, `${nm(t)} refused: "You are not yet worthy of that."`) + ` (${opNote(-5)})`;
      }
      if (target === 'asker') { p.baseRank = 1; recalcRank(p); return L(`${nm(t)} seni ordusuna aldı. Artık bir <b>asker</b>sin!`, `${nm(t)} took you into their army. You are now a <b>soldier</b>!`); }
      if (target === 'sovalye') { p.baseRank = 2; recalcRank(p); p.prestige += 30; return L(`${nm(t)} kılıcını omzuna dokundurdu. Diz çöktün, <b>şövalye</b> olarak kalktın! (Şan +30)`, `${nm(t)} touched your shoulder with a sword. You knelt, and rose a <b>knight</b>! (Prestige +30)`); }
      giveTitle(target, p);
      refreshLieges();
      p.prestige += 50;
      G.terrDirty = true;
      return L(`${nm(t)} sana <b>${target.name}</b> topraklarını bağışladı! Artık bir ${rankName(p)}sin. (Şan +50)`, `${nm(t)} granted you the lands of <b>${target.name}</b>! You are now a ${rankName(p)}. (Prestige +50)`);
    },
  },
  {
    id: 'davet', get ad() { return L('Sarayına davet et', 'Invite to court'); }, icon: '🏰', ap: 1, tgt: true,
    show: (p, t) => p.rank >= 3 && !t.titles.length && t.lordId !== p.id && t.id !== p.id && isAdult(t),
    req: (p, t) => jailReq(p, t),
    chance: (p, t) => { const l = ch(t.lordId); return pct(30 + opinion(t, p) / 2 + (p.rank - (l ? l.rank : 0)) * 15 + (l ? -opinion(t, l) / 3 : 20)); },
    run(p, t) {
      if (chance(this.chance(p, t) / 100)) {
        t.lordId = p.id;
        if (t.spouseId) { const sp = ch(t.spouseId); if (sp && !sp.titles.length) sp.lordId = p.id; }
        return L(`${nm(t)} davetini kabul etti ve sarayına taşındı.`, `${nm(t)} accepted and moved to your court.`);
      }
      return L(`${nm(t)} davetini kibarca reddetti.`, `${nm(t)} politely declined your invitation.`);
    },
  },
  {
    id: 'unvanver', ad: (p) => L(`Toprak bağışla: ${grantable(p) ? grantable(p).name : ''}`, `Grant land: ${grantable(p) ? grantable(p).name : ''}`), icon: '🎖️', ap: 1, tgt: true,
    show: (p, t) => !!grantable(p) && !t.titles.length && isAdult(t) && t.id !== p.id && (t.lordId === p.id || familyRel(p, t)),
    req: (p, t) => firstReq(jailReq(p, t), t.prisonerOf ? L('Zindanda', 'Imprisoned') : null),
    run(p, t) {
      const tt = grantable(p);
      giveTitle(tt, t);
      const r = ownRealm(p) || realmOf(p);
      tt.liege = r ? r.id : tt.liege;
      refreshLieges();
      addOp(t, p, 40);
      t.prestige += 50;
      G.terrDirty = true;
      return L(`<b>${tt.name}</b> topraklarını ${nm(t)} adlı kişiye bağışladın. Artık senin vasalın ve sana minnettar.`, `You granted <b>${tt.name}</b> to ${nm(t)}. They are now your grateful vassal.`) + ` (${opNote(40)})`;
    },
  },
  {
    id: 'mesru', get ad() { return L('Meşrulaştır (50 şan)', 'Legitimize (50 prestige)'); }, icon: '📜', ap: 1, tgt: true,
    show: (p, t) => t.bastard && (t.realFatherId === p.id || t.motherId === p.id),
    req: (p) => firstReq(p.rank < 3 ? L('Toprak sahibi olmalısın', 'You must hold land') : null, p.prestige < 50 ? L('50 şan gerekli', 'Requires 50 prestige') : null),
    run(p, t) {
      p.prestige -= 50;
      t.bastard = false;
      if (!p.female) t.fatherId = p.id;
      t.dyn = p.dyn;
      t.baseRank = Math.max(t.baseRank, 2); recalcRank(t);
      addOp(t, p, 40);
      return L(`${t.name} artık meşru bir ${p.dyn}! Mirasçılar arasında yerini aldı.`, `${t.name} is now a legitimate ${p.dyn}, and takes their place among your heirs.`);
    },
  },
  {
    id: 'hapis', ad: (p, t) => L(`Zindana at${t && !hasKnownCrime(p, t) ? ' (zorbalık!)' : ''}`, `Imprison${t && !hasKnownCrime(p, t) ? ' (tyranny!)' : ''}`), icon: '⛓️', ap: 1, tgt: true,
    confirm: t => L(`${nm(t)} zindana atılacak.`, `${nm(t)} will be thrown in the dungeon.`),
    show: (p, t) => p.rank >= 3 && !t.prisonerOf && isUnder(t, p) && isAdult(t),
    req: (p) => jailReq(p),
    run(p, t) {
      const just = hasKnownCrime(p, t);
      if (settlementsOf(t).length && !just && charPower(t) > charPower(p) * 0.4 && chance(0.5)) {
        addOp(t, p, -50);
        rebel(t);
        return L(`${nm(t)} muhafızlarını kılıçla karşıladı ve <b>isyan etti!</b> Kendi devletini ilan etti, artık savaştasınız.`, `${nm(t)} met your guards with steel and <b>rebelled!</b> They declared their own realm — you are now at war.`);
      }
      imprison(p, t, just);
      const st = traitStress(p, just ? { zalim: -5 } : { durust: 10, merhametli: 10, zalim: -5 });
      if (!just) for (const x of living()) if (x.lordId === p.id && x.id !== t.id) addOp(x, p, -5);
      return L(`${nm(t)} zincire vuruldu ve zindana atıldı.`, `${nm(t)} was put in chains and thrown in the dungeon.`) +
        (just ? L(' Suçları biliniyor; kimse itiraz etmedi.', ' Their crimes are known; nobody objected.') : L(' <b>Hiçbir gerekçe yok</b>. Vasalların tedirgin. (Zorbalık +15, Korku +8)', ' <b>There was no justification</b>. Your vassals are uneasy. (Tyranny +15, Dread +8)')) + stressNote(st);
    },
  },
  {
    id: 'idam', get ad() { return L('İdam et', 'Execute'); }, icon: '🪓', ap: 1, tgt: true,
    confirm: t => L(`${nm(t)} idam edilecek. Bunun geri dönüşü yok.`, `${nm(t)} will be executed. There is no going back.`),
    show: (p, t) => playerCaptive(p, t),
    req: () => null,
    run(p, t) {
      const tname = nm(t);
      const st = traitStress(p, { merhametli: 30, zalim: -15 });
      const just = execute(p, t);
      if (!just) for (const x of living()) if (x.lordId === p.id) addOp(x, p, -10);
      return L(`${tname} kalabalığın önünde idam edildi. `, `${tname} was executed before the crowd. `) + (just ? L('Adalet yerini buldu.', 'Justice was served.') : L('<b>Haksız bir idam</b> — insanlar senden korkuyor ama sevmiyor.', '<b>An unjust execution</b> — people fear you, but do not love you.')) + L(' (Korku +15)', ' (Dread +15)') + stressNote(st);
    },
  },
  {
    id: 'iskence', get ad() { return L('İşkence et', 'Torture'); }, icon: '🔥', ap: 1, tgt: true,
    confirm: t => L(`${nm(t)} işkenceye gönderilecek.`, `${nm(t)} will be sent to the torturer.`),
    show: (p, t) => playerCaptive(p, t),
    req: () => null,
    run(p, t) {
      const st = traitStress(p, { merhametli: 25, zalim: -15 });
      const found = G.secrets.filter(s => (s.actor === t.id || s.target === t.id) && !knows(p, s));
      found.forEach(s => learn(p, s));
      t.health -= 25; p.dread += 8;
      addTrait(t, 'yarali');
      let m = L(`Zindandan çığlıklar yükseldi. ${nm(t)} konuştu.`, `Screams rose from the dungeon. ${nm(t)} talked.`);
      m += found.length ? '<br>' + found.map(s => `• <i>${secretText(s)}</i>`).join('<br>') : L('<br>...ama bildiği bir şey yokmuş.', '<br>...but they knew nothing.');
      if (t.health <= 0) { die(t, L('İşkencede öldü', 'Died under torture')); m += L('<br><b>İşkenceye dayanamadı ve öldü.</b>', '<br><b>They did not survive the torture.</b>'); }
      return m + L(' (Korku +8)', ' (Dread +8)') + stressNote(st);
    },
  },
  {
    id: 'fidyeal', get ad() { return L('Fidye karşılığı bırak', 'Release for ransom'); }, icon: '💰', ap: 1, tgt: true,
    show: (p, t) => playerCaptive(p, t) && t.gold > 0,
    req: () => null,
    run(p, t) {
      const amt = Math.min(t.gold, 20 + t.rank * 30);
      t.gold -= amt; p.gold += amt; t.prisonerOf = null;
      return L(`${nm(t)} ${amt} altın fidye ödeyerek serbest kaldı.`, `${nm(t)} paid a ransom of ${amt} gold and was released.`);
    },
  },
  {
    id: 'serbest', get ad() { return L('Serbest bırak', 'Release'); }, icon: '🔓', ap: 1, tgt: true,
    show: (p, t) => playerCaptive(p, t),
    req: () => null,
    run(p, t) {
      t.prisonerOf = null; addOp(t, p, 20);
      const st = traitStress(p, { merhametli: -10 });
      return L(`${nm(t)} zincirlerinden kurtuldu. Merhametini unutmayacak.`, `${nm(t)} is free of their chains and will not forget your mercy.`) + ` (${opNote(20)})${stressNote(st)}`;
    },
  },
  {
    id: 'elkoy', get ad() { return L('Topraklarına el koy', 'Seize their lands'); }, icon: '🏴', ap: 1, tgt: true,
    show: (p, t) => playerCaptive(p, t) && settlementsOf(t).length > 0 && (isUnder(t, p) || hostileChars(p, t)),
    req: () => null,
    run(p, t) {
      const just = hasKnownCrime(p, t) || hostileChars(p, t);
      const taken = settlementsOf(t);
      const r = ownRealm(p) || realmOf(p);
      const oldR = realmOf(t);
      taken.forEach(tt => { giveTitle(tt, p); tt.liege = r ? r.id : null; });
      refreshLieges();
      if (r && oldR && oldR !== r) carveNation(r, taken.map(x => x.id), 8);
      if (oldR && oldR !== r) checkRealmDeath(oldR);
      G.terrDirty = true;
      addOp(t, p, -50);
      if (!just) { p.tyranny += 20; for (const x of living()) if (x.lordId === p.id) addOp(x, p, -10); }
      return L(`${taken.map(x => x.name).join(', ')} artık senin. `, `${taken.map(x => x.name).join(', ')} now belong to you. `) + (just ? '' : L('<b>Vasalların bu zorbalığı unutmayacak.</b> (Zorbalık +20)', '<b>Your vassals will not forget this tyranny.</b> (Tyranny +20)'));
    },
  },
  {
    id: 'savas', ad: (p, t) => L(`Savaş ilan et: ${t && ownRealm(t) ? ownRealm(t).name : ''}`, `Declare war: ${t && ownRealm(t) ? ownRealm(t).name : ''}`), icon: '⚔️', ap: 1, tgt: true,
    confirm: t => L(`${ownRealm(t).name} ile savaşa gireceksin. Askerleri sınırlarına saldırabilir.`, `You will go to war with the ${ownRealm(t).name}. Their troops may strike your borders.`),
    show: (p, t) => !!ownRealm(p) && !!ownRealm(t) && ownRealm(p) !== ownRealm(t) && !atWarRealms(ownRealm(p), ownRealm(t)),
    req: (p, t) => jailReq(p, t),
    info: (p, t) => L(`Askerin ~${fmtCount(charPower(p))} · Onun ~${fmtCount(charPower(t))}`, `Your troops ~${fmtCount(charPower(p))} · Theirs ~${fmtCount(charPower(t))}`),
    run(p, t) {
      declareWar(ownRealm(p), ownRealm(t));
      addOp(t, p, -40);
      return L(`Savaş borazanları çaldı! ${ownRealm(t).name} ile savaştasın. Sınırlarına dokun ve saldır.`, `The war horns sound! You are at war with the ${ownRealm(t).name}. Tap their border and attack.`);
    },
  },
  {
    id: 'baris', get ad() { return L('Barış teklif et', 'Offer peace'); }, icon: '🕊️', ap: 1, tgt: true,
    show: (p, t) => !!ownRealm(p) && !!ownRealm(t) && atWarRealms(ownRealm(p), ownRealm(t)),
    req: (p, t) => jailReq(p, t),
    chance: (p, t) => {
      const w = G.wars.find(w => [w.a, w.b].includes(ownRealm(p).id) && [w.a, w.b].includes(ownRealm(t).id));
      const bal = w ? (w.taken[ownRealm(p).id] || 0) - (w.taken[ownRealm(t).id] || 0) : 0;
      return pct(25 + bal * 15 + opinion(t, p) / 3 + (charPower(p) / Math.max(1, charPower(t)) - 1) * 20 + (w ? (G.day - w.start) / 30 * 2 : 0));
    },
    run(p, t) {
      if (chance(this.chance(p, t) / 100)) { makePeace(ownRealm(p), ownRealm(t)); return L(`${nm(t)} barışı kabul etti. Kılıçlar kınına girdi.`, `${nm(t)} accepted peace. Swords are sheathed.`); }
      return L(`${nm(t)} teklifini küçümsedi: "Savaş bitmedi!"`, `${nm(t)} scorned your offer: "This war is not over!"`);
    },
  },

  /* ===================== KENDİ EYLEMLERİN ===================== */
  {
    id: 'calis', ad: p => (p.rank === 0 ? L('Tarlada çalış', 'Work the fields') : p.rank <= 2 ? L('Ek iş yap', 'Take on extra work') : L('Malikâneni yönet', 'Manage your estate')), icon: '⚒️', ap: 1,
    show: p => isAdult(p) || p.age >= 10,
    req: p => jailReq(p),
    run(p) {
      const g = p.rank === 0 ? rnd(3, 7) : p.rank <= 2 ? rnd(4, 9) : rnd(10, 20) + stat(p, 'yon');
      p.gold += g;
      let m = L(`Ter döktün ve <b>${g} altın</b> kazandın.`, `You worked hard and earned <b>${g} gold</b>.`);
      if (chance(0.1)) { p.base.yon++; m += L(' Bu arada işini daha iyi öğrendin. (Yönetim +1)', ' You also got better at it. (Stewardship +1)'); }
      return m;
    },
  },
  {
    id: 'antrenman', get ad() { return L('Kılıç talimi yap', 'Sword training'); }, icon: '🗡️', ap: 1,
    show: p => p.age >= 8,
    req: p => jailReq(p),
    run(p) {
      let m = L('Saatlerce kılıç salladın.', 'You swung your sword for hours.');
      if (chance(0.45) && p.base.sav < 20) { p.base.sav++; m += L(' Ustalaştığını hissediyorsun. (Savaş +1)', ' You feel yourself improving. (Martial +1)'); }
      else m += L(' Bugün pek ilerleme kaydedemedin.', ' Not much progress today.');
      if (chance(0.08)) { p.health -= 10; m += L(' Talimde yaralandın. (Sağlık -10)', ' You were hurt in training. (Health -10)'); }
      return m;
    },
  },
  {
    id: 'okuma', get ad() { return L('Ders al (5💰)', 'Take lessons (5💰)'); }, icon: '📚', ap: 1,
    show: p => p.age >= 6,
    req: p => firstReq(jailReq(p), goldReq(p, 5)),
    run(p) {
      p.gold -= 5;
      if (chance(0.45)) {
        const s = pick(['dip', 'ent', 'yon', 'cek']);
        if (p.base[s] < 20) p.base[s]++;
        return L(`Bir keşişten ders aldın. ${STATS[s]} yeteneğin gelişti! (+1)`, `A monk tutored you. Your ${STATS[s]} improved! (+1)`);
      }
      return L('Ders sıkıcıydı, pek bir şey öğrenemedin.', 'The lesson was dull; you learned little.');
    },
  },
  {
    id: 'eskiya', get ad() { return L('Yol kes (eşkıyalık)', 'Highway robbery'); }, icon: '🏴‍☠️', ap: 1,
    confirm: () => L('Yol kesip yolcuları soyacaksın. Yakalanırsan zindanı boylarsın.', 'You will rob travellers on the road. If caught, you end up in the dungeon.'),
    show: p => p.rank <= 2 && isAdult(p),
    req: p => firstReq(jailReq(p), p.health < 40 ? L('Çok yaralısın', 'You are too wounded') : null),
    chance: p => pct(40 + stat(p, 'sav') * 4),
    run(p) {
      const st = traitStress(p, { merhametli: 15, durust: 10, zalim: -5 });
      let m;
      if (chance(this.chance(p) / 100)) {
        const g = rnd(15, 45);
        p.gold += g; p.dread += 2;
        m = L(`Karanlıkta bir tüccar kervanını bastın. <b>${g} altın</b> kaptın.`, `You ambushed a merchant caravan in the dark and grabbed <b>${g} gold</b>.`);
        if (chance(0.25)) {
          const known = [p.id];
          const l = ch(p.lordId);
          if (l && chance(0.35)) known.push(l.id);
          addSecret('eskiya', p.id, null, known);
          m += L(' Ama biri yüzünü gördü...', ' But someone saw your face...');
        }
      } else {
        const d = rnd(15, 35);
        p.health -= d;
        m = L(`Kervan muhafızları seni fena hırpaladı. (Sağlık -${d})`, `The caravan guards gave you a beating. (Health -${d})`);
        const l = ch(p.lordId);
        if (l && free(l) && chance(0.15)) {
          addSecret('eskiya', p.id, null, [p.id, l.id]);
          imprison(l, p, true);
          m += L(` <b>Yakalandın ve ${nm(l)} seni zindana attı!</b>`, ` <b>You were caught, and ${nm(l)} threw you in the dungeon!</b>`);
        }
        if (p.health <= 0) die(p, L('Yol kesmeye çalışırken öldürüldü', 'Killed while robbing travellers'));
      }
      return m + stressNote(st);
    },
  },
  {
    id: 'ziyafet', ad: p => L(`Ziyafet ver (${feastCost(p)}💰)`, `Hold a feast (${feastCost(p)}💰)`), icon: '🍗', ap: 1,
    show: p => p.rank >= 2 && isAdult(p),
    req: p => firstReq(jailReq(p), goldReq(p, feastCost(p))),
    run(p) {
      p.gold -= feastCost(p);
      const guests = living().filter(x => x.id !== p.id && (x.lordId === p.id || x.id === p.lordId || familyRel(p, x) || (p.lordId && x.lordId === p.lordId)));
      guests.forEach(x => addOp(x, p, 12));
      const pr = 20 + p.rank * 5;
      p.prestige += pr;
      const st = stress(p, -10);
      return L(`Şarap su gibi aktı, ozanlar şarkı söyledi. ${guests.length} misafir seni övüyor. (+12 ilişki, Şan +${pr})`, `Wine flowed like water and minstrels sang. ${guests.length} guests sing your praises. (+12 opinion, Prestige +${pr})`) + stressNote(st);
    },
  },
  {
    id: 'turnuva', get ad() { return L('Turnuvaya katıl (10💰)', 'Enter a tournament (10💰)'); }, icon: '🏇', ap: 1,
    show: p => p.rank >= 1 && isAdult(p),
    req: p => firstReq(jailReq(p), goldReq(p, 10), p.health < 50 ? L('Çok yaralısın', 'You are too wounded') : null),
    chance: p => pct(30 + (stat(p, 'sav') - 6) * 6),
    run(p) {
      p.gold -= 10;
      if (chance(this.chance(p) / 100)) {
        p.gold += 60; p.prestige += 50;
        return L('🏆 Mızrağın rakibini atından düşürdü! Turnuvayı kazandın: <b>60 altın</b> ve büyük şan! (Şan +50)', '🏆 Your lance unhorsed your rival! You won the tournament: <b>60 gold</b> and great renown! (Prestige +50)');
      }
      p.prestige += 5;
      if (chance(0.35)) {
        p.health -= 25;
        if (chance(0.3)) addTrait(p, 'yarali');
        if (p.health <= 0) { die(p, L('Turnuvada aldığı yaralar', 'Wounds from a tournament')); return L('Ölümcül bir darbe aldın...', 'You took a fatal blow...'); }
        return L('Attan düştün ve kemiklerin çatırdadı. (Sağlık -25)', 'You fell from your horse and your bones cracked. (Health -25)');
      }
      return L('İyi dövüştün ama kazanamadın. (Şan +5)', 'You fought well but did not win. (Prestige +5)');
    },
  },
  {
    id: 'eglen', get ad() { return L('Meyhaneye git (5💰)', 'Go to the tavern (5💰)'); }, icon: '🍺', ap: 1,
    show: p => p.age >= 14,
    req: p => firstReq(jailReq(p), goldReq(p, 5)),
    run(p) {
      p.gold -= 5;
      const st = stress(p, -25 + (has(p, 'sehvetli') ? -5 : 0));
      let m = L('Bir gece boyunca içtin, güldün, şarkı söyledin.', 'You drank, laughed and sang all night.') + stressNote(st);
      if (chance(0.08)) { addTrait(p, 'ayyas'); m += L(' Ama bu alışkanlık haline geliyor... (<b>Ayyaş</b>)', ' But it is becoming a habit... (<b>Drunkard</b>)'); }
      if (chance(0.3)) {
        const n = makeChar({ female: chance(0.85) ? !p.female : p.female, age: rnd(17, 35), rank: rnd(0, 1), lordId: p.lordId, gold: rnd(1, 8), cul: localCulture() });
        addOp(n, p, rnd(20, 40));
        m += L(`<br>Bu gece <b>${nm(n)}</b> ile tanıştın. Sana ilgiyle bakıyordu.`, `<br>Tonight you met <b>${nm(n)}</b>, who seemed very interested in you.`);
      }
      return m;
    },
  },
  {
    id: 'dinlen', get ad() { return L('Dinlen', 'Rest'); }, icon: '🛌', ap: 1,
    show: () => true,
    req: () => null,
    run(p) {
      p.health = Math.min(100, p.health + 20);
      const st = stress(p, -15);
      return L('Dinlendin ve kendine geldin. (Sağlık +20)', 'You rested and recovered. (Health +20)') + stressNote(st);
    },
  },
  {
    id: 'vergi', get ad() { return L('Vergileri sık', 'Squeeze taxes'); }, icon: '🪙', ap: 1,
    show: p => p.rank >= 3,
    req: p => jailReq(p),
    run(p) {
      const g = 15 * (p.rank - 2) + stat(p, 'yon');
      p.gold += g;
      living().filter(x => x.lordId === p.id).forEach(x => addOp(x, p, -8));
      const st = traitStress(p, { acgozlu: -5, comert: 10, merhametli: 5 });
      return L(`Tahsildarların köy köy dolaştı. <b>${g} altın</b> topladın ama vasalların homurdanıyor. (-8 ilişki)`, `Your tax collectors went village to village. You gathered <b>${g} gold</b>, but your vassals grumble. (-8 opinion)`) + stressNote(st);
    },
  },
  {
    id: 'bagimsizlik', get ad() { return L('Bağımsızlık ilan et', 'Declare independence'); }, icon: '🏴', ap: 1,
    confirm: () => L('Efendine karşı isyan edip kendi devletini kuracaksın. Eski krallığın sana savaş açacak.', 'You will rebel against your liege and found your own realm. Your former realm will declare war on you.'),
    show: p => settlementsOf(p).length > 0 && p.lordId != null && !ownRealm(p),
    req: p => jailReq(p),
    info: p => { const l = ch(p.lordId); return l ? L(`Gücün ~${Math.round(charPower(p))} · Efendinin ~${Math.round(charPower(topLiege(p)))}`, `Your strength ~${Math.round(charPower(p))} · Your liege's ~${Math.round(charPower(topLiege(p)))}`) : ''; },
    run(p) {
      const r = rebel(p);
      return L(`İsyan bayrağını kaldırdın! <b>${r.name}</b> kuruldu. Artık kendi devletinin hükümdarısın ve eski efendinle savaştasın.`, `You raised the banner of revolt! The <b>${r.name}</b> is founded. You rule your own realm now — and are at war with your former liege.`);
    },
  },
  {
    id: 'kralliginikur', get ad() { return L('Krallığını ilan et (300 şan)', 'Proclaim a kingdom (300 prestige)'); }, icon: '👑', ap: 1,
    show: p => settlementsOf(p).length > 0 && p.lordId == null && !ownRealm(p),
    req: p => firstReq(jailReq(p), settlementsOf(p).length < 2 ? L('En az 2 şehir/kale gerekli', 'Requires at least 2 holdings') : null, p.prestige < 300 ? L('300 şan gerekli', 'Requires 300 prestige') : null),
    run(p) {
      p.prestige -= 300;
      const r = createRealm(p);
      return L(`Taç başına kondu! <b>${r.name}</b> kuruldu ve sen onun ilk hükümdarısın. 👑`, `The crown is placed upon your head! The <b>${r.name}</b> is founded and you are its first ruler. 👑`);
    },
  },
  {
    id: 'parali', get ad() { return L('Paralı asker kirala (150💰)', 'Hire mercenaries (150💰)'); }, icon: '🪖', ap: 1,
    show: p => !!natOfRealm(ownRealm(p)),
    req: p => firstReq(jailReq(p), goldReq(p, 150)),
    info: p => { const n = natOfRealm(ownRealm(p)); return n ? L(`+${fmtCount(mercSize(n))} asker`, `+${fmtCount(mercSize(n))} troops`) : ''; },
    run(p) {
      const n = natOfRealm(ownRealm(p)), add = mercSize(n);
      p.gold -= 150;
      n.troops += add;
      return L(`Paralı bir bölük sancağının altına geçti: <b>${fmtCount(add)}</b> asker.`, `A mercenary company joined your banner: <b>${fmtCount(add)}</b> troops.`);
    },
  },
  {
    id: 'kacis', get ad() { return L('Kaçmayı dene', 'Try to escape'); }, icon: '🏃', ap: 1,
    show: p => !!p.prisonerOf,
    req: () => null,
    chance: p => pct(15 + stat(p, 'ent') * 3 + stat(p, 'sav') * 2),
    run(p) {
      const cap = ch(p.prisonerOf);
      if (chance(this.chance(p) / 100)) {
        p.prisonerOf = null;
        if (cap && p.lordId === cap.id && !p.titles.length) p.lordId = null;
        return L('Gece yarısı zincirlerini kırdın ve surlardan aşağı atladın. <b>Özgürsün!</b>', 'At midnight you broke your chains and leapt from the walls. <b>You are free!</b>') + (p.lordId == null ? L(' Artık kimseye hizmet etmiyorsun.', ' You no longer serve anyone.') : '');
      }
      p.health -= 10;
      if (cap) addOp(cap, p, -10);
      return L('Muhafızlar seni yakaladı ve dövdü. (Sağlık -10)', 'The guards caught you and beat you. (Health -10)');
    },
  },
  {
    id: 'gardiyan', get ad() { return L('Gardiyana rüşvet ver (30💰)', 'Bribe a guard (30💰)'); }, icon: '🔑', ap: 1,
    show: p => !!p.prisonerOf,
    req: p => goldReq(p, 30),
    chance: () => 60,
    run(p) {
      p.gold -= 30;
      if (chance(0.6)) {
        const cap = ch(p.prisonerOf);
        p.prisonerOf = null;
        if (cap && p.lordId === cap.id && !p.titles.length) p.lordId = null;
        return L('Gardiyan anahtarı "unuttu". Sessizce kaçtın. <b>Özgürsün!</b>', 'The guard "forgot" the key. You slipped away quietly. <b>You are free!</b>');
      }
      return L('Gardiyan altını aldı... ve hiçbir şey yapmadı.', 'The guard took the gold... and did nothing.');
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
    if (p.baseRank === 0) return L('Askere yazılmak iste', 'Ask to enlist');
    if (p.baseRank === 1) return isEast(p) ? L('Sipahilik iste', 'Ask to become a sipahi') : L('Şövalyelik iste', 'Ask for knighthood');
    return L('Toprak (tımar) iste', 'Ask for land (a fief)');
  }
  return L('Ek toprak iste', 'Ask for more land');
}
function promoChance(p, t) {
  const target = promoTarget(p, t);
  const o = opinion(t, p);
  if (target === 'asker') return pct(70 + o / 2);
  if (target === 'sovalye') return pct(5 + o / 1.5 + (stat(p, 'sav') - 5) * 5 + p.prestige / 8);
  return pct(o / 2 + p.prestige / 10);
}
