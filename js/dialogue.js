'use strict';
/* =========================================================
   Crown & Dagger — Diyaloglar ve söylentiler
   Bir kişiyle konuşma: selamlaşma, hal hatır, ilgi alanları,
   hediyeler, etkinlikler, başkaları hakkında konuşma (övgü,
   dedikodu, iftira, sır ifşası, kışkırtma, arabuluculuk,
   çöpçatanlık), söylentiler, iltifatlar, flört, ricalar, tehdit.
   Söylenen her söz bir "söylenti" olarak kulaktan kulağa yayılır.
   ========================================================= */

let DLG = null;

/* ---------- Metin yardımcıları ---------- */
const T2 = (tr, en) => [tr, en];
function fill(line, v = {}) {
  const s = Array.isArray(line) ? L(line[0], line[1]) : line;
  return s.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m));
}
const pickLine = (arr, v) => fill(pick(arr), v);
function tierOf(o) { return o <= -50 ? 0 : o < -10 ? 1 : o < 20 ? 2 : o < 60 ? 3 : 4; }
function voiceOf(c) {
  if (has(c, 'zalim')) return 'cruel';
  if (has(c, 'kibirli')) return 'proud';
  if (has(c, 'kurnaz')) return 'sly';
  if (has(c, 'dindar')) return 'pious';
  if (has(c, 'durust')) return 'blunt';
  if (has(c, 'sehvetli')) return 'flirty';
  if (has(c, 'paranoyak')) return 'wary';
  if (has(c, 'merhametli') || has(c, 'comert')) return 'kind';
  if (has(c, 'alcakgonullu')) return 'humble';
  return 'plain';
}
/* t, p'ye nasıl hitap eder */
function addrOf(t, p) {
  const rel = familyRel(t, p), o = opinion(t, p);
  if (rel === 'es') return pick(L(['sevgilim', 'canım', 'hayatım'], ['my love', 'my dear', 'my heart']));
  if (t.lovers.includes(p.id)) return pick(L(['aşkım', 'gözümün nuru'], ['my sweet', 'my love']));
  if (rel === 'baba') return L('babacığım', 'father');
  if (rel === 'anne') return L('anneciğim', 'mother');
  if (rel === 'cocuk') return L('evladım', 'my child');
  if (rel === 'kardes') return p.female ? L('kardeşim', 'sister') : L('kardeşim', 'brother');
  if (o <= -50) return p.name;
  const east = isEast(p);
  if (p.rank === 5) return east ? (p.female ? L('Sultanım', 'my Sultana') : L('Sultanım', 'my Sultan')) : L('Majesteleri', 'Your Majesty');
  if (isPrince(p)) return east ? L('Şehzadem', 'my prince') : (p.female ? L('Prensesim', 'Your Highness') : L('Prensim', 'Your Highness'));
  if (p.rank === 4) return L('Ekselansları', 'Your Grace');
  if (p.rank === 3) return east ? (p.female ? L('Hatunum', 'my lady') : L('Beyim', 'my lord')) : (p.female ? L('Leydim', 'my lady') : L('Lordum', 'my lord'));
  if (p.rank === 2) return east ? L('Sipahi', 'Sipahi') + ' ' + p.name : (p.female ? 'Dame ' : L('Sör ', 'Sir ')) + p.name;
  return p.name;
}
const short = c => `${c.name} ${c.dyn}`;
const capFirst = s => s.charAt(0).toLocaleUpperCase(LANG === 'tr' ? 'tr' : 'en') + s.slice(1);

/* ---------- Satır bankaları ---------- */
const GREET = [
  [T2('Sen mi? Burada ne işin var? Çabuk söyle ve git.', 'You? What are you doing here? Speak quickly and go.'),
    T2('Yüzünü görmek bile midemi bulandırıyor, {a}.', 'Even the sight of your face turns my stomach, {a}.'),
    T2('Cesaretine hayranım; bana bu kadar yaklaşabildiğine göre.', 'I admire your nerve, coming this close to me.'),
    T2('Konuş. Ama kılıcımın yerini bildiğimi unutma.', 'Speak. But remember I know where my sword is.')],
  [T2('Hm. {a}. Ne istiyorsun?', 'Hm. {a}. What do you want?'),
    T2('Vaktim az, {a}. Lafı dolandırma.', 'I have little time, {a}. Get to the point.'),
    T2('Seni beklemiyordum. Pek de sevinmedim açıkçası.', 'I did not expect you. Nor am I pleased, frankly.'),
    T2('Yine mi sen? Peki, dinliyorum.', 'You again? Very well, I am listening.')],
  [T2('Selam, {a}. Seni buraya hangi rüzgâr attı?', 'Greetings, {a}. What wind brings you here?'),
    T2('{A}. Buyur, otur bakalım.', '{A}. Come, sit.'),
    T2('Hoş geldin, {a}. Sarayda bugün hava bir tuhaf.', 'Welcome, {a}. The court is strange today.'),
    T2('Ah, {a}. Ne konuşmak istersin?', 'Ah, {a}. What would you speak of?')],
  [T2('{A}! Seni görmek ne güzel. Gel, bir kadeh şarap?', '{A}! How good to see you. Come, a cup of wine?'),
    T2('Hoş geldin, {a}. Tam da senden bahsediyorduk — iyi şeyler, merak etme.', 'Welcome, {a}. We were just speaking of you — good things, fear not.'),
    T2('{A}, gel otur yanıma. Anlat bakalım, neler yapıyorsun?', '{A}, come sit by me. Tell me, what have you been doing?'),
    T2('Kapım sana her zaman açık, {a}.', 'My door is always open to you, {a}.')],
  [T2('{A}! Günüm şimdi aydınlandı. Gel, sarılayım sana!', '{A}! My day is brighter already. Come here!'),
    T2('Dostların en iyisi! Seni özlemiştim, {a}.', 'The best of friends! I have missed you, {a}.'),
    T2('Senin için her şeyi bırakırım, {a}. Söyle, ne dilersin?', 'I would drop anything for you, {a}. Say, what do you wish?'),
    T2('İşte sadakatine güvendiğim tek kişi geldi. Hoş geldin, {a}.', 'Here comes the one person whose loyalty I trust. Welcome, {a}.')],
];
const REL_GREET = {
  es: [T2('Sonunda bana vakit ayırdın, {a}. Gel, otur.', 'At last you have time for me, {a}. Come, sit.'), T2('{A}, yüzün yorgun. Bu krallık seni yiyip bitirecek.', '{A}, you look tired. This realm will devour you.')],
  esSoguk: [T2('Ah, kocam/karım beni hatırladı demek. Ne istiyorsun?', 'So my spouse remembers I exist. What do you want?'), T2('Yatağımızda kim yatıyor bu gece, merak ediyorum.', 'I wonder who shares our bed tonight.')],
  lover: [T2('Gözlerin yine yaramazlık peşinde, {a}...', 'Your eyes are up to mischief again, {a}...'), T2('Kimse görmedi değil mi? Gel, kapıyı ört.', 'No one saw you? Come, close the door.')],
  child: [T2('{A}! Bana kılıç sallamayı yine gösterecek misin?', '{A}! Will you show me sword-fighting again?'), T2('{A}, beni hiç dinlemiyorsun!', '{A}, you never listen to me!')],
  parent: [T2('Gel {a}, anlat bakalım. Hanedanımızın şerefini nasıl taşıyorsun?', 'Come {a}, tell me. How do you carry the honour of our house?'), T2('{A}, yine ne işler çeviriyorsun?', '{A}, what are you up to now?')],
  sibling: [T2('Kardeşim! Çocukluğumuzdaki gibi oturalım mı?', 'Sibling! Shall we sit as we did when we were children?'), T2('Yine ne istiyorsun, kardeşim? Babamızın gözdesi olmak yetmedi mi?', 'What now, sibling? Being our parent\'s favourite was not enough?')],
  liege: [T2('Ah, sadık {a}. Bana ne haber getirdin?', 'Ah, my faithful {a}. What news do you bring?'), T2('Diz çökmeye gerek yok. Konuş.', 'No need to kneel. Speak.')],
  liegeSoguk: [T2('Sadakatini sorgulamaya başlıyorum, {a}.', 'I am beginning to question your loyalty, {a}.')],
  vassal: [T2('{A}, emrinizdeyim. Topraklarımız sizin hizmetinizde.', '{A}, I am at your command. My lands are yours to call upon.'), T2('Efendim. Huzurunuza çıkmak bir onur.', 'My liege. It is an honour to stand before you.')],
  vassalSoguk: [T2('Efendim... yine vergi mi, yine asker mi?', 'My liege... more taxes, or more soldiers?')],
  captive: [T2('Zincirlerimle mi konuşacağız? Bu nasıl misafirperverlik, {a}?', 'Shall we talk through my chains? Some hospitality, {a}.'), T2('Gün gelir, devran döner.', 'The wheel turns, one day.')],
  captor: [T2('Zindanım rahat mı? Fidyeni düşündün mü?', 'Comfortable in my dungeon? Have you thought about your ransom?')],
  war: [T2('Düşmanımın elçisi gibi konuşuyorsun. Dikkatli ol.', 'You speak like an envoy of my enemy. Careful.'), T2('Savaştayken bile mi kapımı çalıyorsun?', 'You knock on my door even in time of war?')],
  dost: [T2('Eski dostum! Sırlarımızı gömeceğimiz yeni bir şarap fıçısı var.', 'Old friend! There is a new cask of wine to bury our secrets in.'), T2('Dostum, seni görmek kalbimi ısıtıyor.', 'My friend, seeing you warms my heart.')],
  rakip: [T2('Ezeli rakibim. Bugün hangi hileyle geldin?', 'My old rival. What trick have you brought today?'), T2('Senin gibi biriyle aynı odada nefes almak...', 'To breathe the same air as you...')],
};
const VOICE_TAIL = {
  cruel: [T2('Son konuşan da benim adamlarımdan birini kızdırmıştı. Kafası hâlâ surlarda.', 'The last one who spoke to me angered one of my men. His head still hangs on the walls.')],
  proud: [T2('Unutma ki karşında kimin oturduğunu.', 'Do not forget who sits before you.'), T2('Vaktim değerlidir; benimkini israf etme.', 'My time is precious; do not waste it.')],
  sly: [T2('Kulaklarım her yerde, {a}. Bana yeni bir şey söyle.', 'My ears are everywhere, {a}. Tell me something new.')],
  pious: [T2('Tanrı seninle olsun.', 'God be with you.'), T2('Dua ederek mi geldin, yoksa günah çıkarmaya mı?', 'Have you come to pray, or to confess?')],
  blunt: [T2('Laf kalabalığını sevmem.', 'I do not care for idle words.')],
  flirty: [T2('Bugün çok yakışıklı/güzel görünüyorsun, biliyor musun?', 'You look rather fine today, did you know?')],
  wary: [T2('Kapıyı kapat. Kim gönderdi seni?', 'Close the door. Who sent you?')],
  kind: [T2('Yorgun görünüyorsun; sana yemek getirteyim mi?', 'You look weary; shall I have food brought for you?')],
  humble: [T2('Benim gibi birine vakit ayırman büyük nezaket.', 'It is kind of you to spare time for someone like me.')],
  plain: [],
};
const HOBBY_LIKE = [T2('{h} mı? Ah, işte ruhumu besleyen şey!', '{h}? Ah, that feeds my very soul!'), T2('Benimle {h} konuşan birini uzun zamandır bulamamıştım!', 'I have not found anyone to talk {h} with in ages!'),
  T2('{h}... saatlerce konuşabilirim. Sen de mi seversin?', '{h}... I could talk for hours. You love it too?'), T2('Gözlerimin parladığını görüyor musun? {h} benim tutkumdur.', 'Do you see my eyes light up? {h} is my passion.')];
const HOBBY_DISLIKE = [T2('{h}? Lütfen. Bundan sıkıcı bir şey düşünemiyorum.', '{h}? Please. I can think of nothing duller.'), T2('Of, {h}... Konuyu değiştirsek?', 'Ugh, {h}... Could we change the subject?'),
  T2('{h} ile uğraşanları hiç anlamamışımdır.', 'I have never understood people who bother with {h}.'), T2('Bana {h}\'dan bahsetme; başım ağrıyor.', 'Spare me the {h}; it gives me a headache.')];
const HOBBY_NEUTRAL = [T2('{h}... Fena değil sanırım. Pek düşünmedim.', '{h}... Not bad, I suppose. I have not thought much about it.'), T2('Hm, {h}. Olabilir. Sen anlat, ben dinlerim.', 'Hm, {h}. Perhaps. You talk, I will listen.'), T2('İlgimi çok çekmez ama saygı duyarım.', 'It does not stir me much, but I respect it.')];
const ASK_PREF = {
  like: [T2('Merak ettin mi? {h} — onsuz bir hafta geçiremem.', 'You wonder? {h} — I cannot go a week without it.'), T2('Aramızda kalsın: {h} için her şeyi bırakırım.', 'Between us: I would drop anything for {h}.')],
  dislike: [T2('Neyi sevmediğimi sorsan daha kolay: {h}. Ondan nefret ederim.', 'Easier to say what I hate: {h}. I loathe it.'), T2('Bir tavsiye: bana sakın {h} önerme.', 'A word of advice: never offer me {h}.')],
  item: [T2('Bana bir gün {h} hediye edersen seni unutmam.', 'Give me {h} one day and I shall never forget you.')],
  itemNo: [T2('İnsanlar hep {h} getiriyor; oysa hiç hoşlanmam.', 'People always bring me {h}; I do not care for it at all.')],
  none: [T2('Beni çok soruyorsun. Biraz da sen anlat.', 'You ask about me a lot. Tell me of yourself.'), T2('Sanırım bana dair bilinecek her şeyi biliyorsun artık.', 'I think you know all there is to know about me now.')],
};
const GIFT_LIKE = [T2('{i}! Bunu nereden bildin? Çok teşekkür ederim!', '{i}! How did you know? Thank you so much!'), T2('Bu... gerçekten harika. {i} her zaman hayalimdi.', 'This... is truly wonderful. {i} was always my dream.'), T2('Seni hep yanlış tanımışım. Bu cömertliği unutmayacağım.', 'I misjudged you. I shall not forget this generosity.')];
const GIFT_NEUTRAL = [T2('Düşünceli bir hediye. Teşekkürler.', 'A thoughtful gift. Thank you.'), T2('{i}. Hm, güzel. Bir yere koyarım.', '{i}. Hm, nice. I will find a place for it.')];
const GIFT_DISLIKE = [T2('{i}? Beni hiç tanımıyorsun, değil mi?', '{i}? You do not know me at all, do you?'), T2('Bunu... geri almak ister misin? Benim işime yaramaz.', 'Would you... like this back? It is of no use to me.')];
const GOLD_GIFT = { greedy: [T2('Altının sesi kadar güzel bir müzik yoktur!', 'There is no music sweeter than the clink of gold!')], proud: [T2('Bana sadaka mı veriyorsun? Neyse... alırım.', 'Are you giving me alms? Well... I shall take it.')], plain: [T2('Bu cömertliğin için sağ ol.', 'Thank you for your generosity.')] };
const ACT_LIKE = [T2('Bundan daha güzel bir gün geçirmemiştim! Yine yapalım.', 'I have not had a finer day! Let us do it again.'), T2('Harika bir fikirdi, {a}. Sana borçlandım.', 'A splendid idea, {a}. I am in your debt.')];
const ACT_NEUTRAL = [T2('Hoş vakit geçirdik. Teşekkürler.', 'A pleasant time. Thank you.'), T2('Fena değildi. Arada bir iyi geliyor.', 'Not bad. It does one good now and then.')];
const ACT_DISLIKE = [T2('Bunu bana bir daha yaptırma, {a}.', 'Never make me do that again, {a}.'), T2('Sırf senin hatırın için katlandım.', 'I endured it only for your sake.')];
const ACT_REFUSE = [T2('Hayır, teşekkürler. Bu bana göre değil.', 'No, thank you. That is not for me.'), T2('Başka bir zaman. Belki de hiç.', 'Another time. Or perhaps never.')];
const OPX = [
  [T2('{x} mi? Onun adını ağzıma almak bile istemem. Bir gün hesabını soracağım.', '{x}? I will not even speak that name. One day there will be a reckoning.'), T2('{x} bir yılandır. Sırtını ona dönme.', '{x} is a snake. Never turn your back on them.')],
  [T2('{x} ile pek anlaşamayız. Fazla... kendini beğenmiş.', '{x} and I do not get along. Too... full of themselves.'), T2('{x}? Güvenmem. Gözü hep başkasının tabağında.', '{x}? I do not trust them. Always eyeing someone else\'s plate.')],
  [T2('{x}... iyi de değil, kötü de. Tanırım işte.', '{x}... neither good nor bad. I know them, that is all.'), T2('{x} hakkında pek fikrim yok.', 'I have little opinion of {x}.')],
  [T2('{x} iyi biridir. Sözünün eridir.', '{x} is a good sort. True to their word.'), T2('{x}\'i severim; zor günlerde yanımdaydı.', 'I like {x}; they stood by me in hard times.')],
  [T2('{x} için canımı veririm.', 'I would give my life for {x}.'), T2('{x} mi? Bu dünyadaki en değerli insanlardan biri.', '{x}? One of the most precious people in this world.')],
];
const PRAISE_AGREE = [T2('Doğru söylüyorsun. {x} gerçekten iyi biridir.', 'You speak truly. {x} is a fine soul.'), T2('Ben de hep öyle düşünmüşümdür!', 'I have always thought so too!')];
const PRAISE_NEUTRAL = [T2('Öyle mi? Belki de {x}\'i yanlış tanıyorum.', 'Is that so? Perhaps I misjudge {x}.'), T2('Hm. Bunu aklımda tutarım.', 'Hm. I shall keep that in mind.')];
const PRAISE_ANGRY = [T2('{x}\'i mi övüyorsun? Benim karşımda? Hangi taraftasın sen?', 'You praise {x}? To my face? Whose side are you on?'), T2('Bir daha önümde {x}\'in adını iyi anarsan konuşmamız biter.', 'Speak well of {x} before me again and we are done talking.')];
const BAD_DELIGHT = [T2('Ha! Nihayet biri söyledi! {x} hakkında ne kadar haklısın...', 'Ha! At last someone says it! How right you are about {x}...'), T2('Devam et, devam et... {x} hakkında başka ne biliyorsun?', 'Go on, go on... what else do you know about {x}?')];
const BAD_INTRIGUED = [T2('Gerçekten mi? {x} böyle biri mi? Hiç bilmezdim.', 'Truly? {x} is like that? I never knew.'), T2('İlginç... {x}\'e bundan sonra daha dikkatli bakarım.', 'Interesting... I shall watch {x} more closely.')];
const BAD_OFFENDED = [T2('Benim önümde {x} hakkında böyle konuşmaya nasıl cüret edersin?!', 'How dare you speak of {x} like that before me?!'), T2('{x} benim için değerlidir. Bu sözlerini unutmayacağım.', '{x} is dear to me. I will not forget these words.'), T2('Bunu {x}\'e anlatacağım, haberin olsun.', 'I shall tell {x} of this, mark me.')];
const BAD_HONEST = [T2('Dedikodudan hoşlanmam. İnsanların arkasından konuşmak sana yakışmıyor.', 'I do not care for gossip. Talking behind people\'s backs does not become you.'), T2('Bunu yüzüne söyleyebilir misin?', 'Would you say that to their face?')];
const SLANDER_OK = [T2('Aman Tanrım... {x} bunu mu yaptı? Herkes bilmeli!', 'Good God... {x} did that? Everyone should know!'), T2('Bunu duyduğuma inanamıyorum. {x}... demek öyle.', 'I cannot believe what I am hearing. {x}... so that is how it is.')];
const SLANDER_FAIL = [T2('Bu yalan, ve sen de biliyorsun. Neden {x}\'e iftira atıyorsun?', 'That is a lie, and you know it. Why slander {x}?'), T2('Yalan söylediğinde gözlerin kayıyor, {a}.', 'Your eyes slide away when you lie, {a}.')];
const SECRET_SHOCK = [T2('Bu... korkunç. {x} hakkında bunu bilmek istemezdim.', 'That is... dreadful. I wish I did not know this about {x}.'), T2('Tanrı affetsin. {x} bunu nasıl yapabildi?', 'God forgive them. How could {x} do this?')];
const SECRET_GLEE = [T2('Ohh... bu bilgi altın değerinde. Teşekkür ederim, {a}.', 'Ohh... this is worth its weight in gold. Thank you, {a}.'), T2('{x}\'in bu sırrı... Bunu iyi kullanacağım.', '{x}\'s little secret... I shall put it to good use.')];
const INCITE_OK = [T2('Haklısın. {x} bize hep tepeden baktı. Artık yeter.', 'You are right. {x} has always looked down on us. Enough.'), T2('Bu öfkeyi uzun zamandır içimde taşıyordum. {x} bedel ödeyecek.', 'I have carried this anger a long time. {x} will pay.')];
const INCITE_FAIL = [T2('Beni {x}\'e karşı kışkırtmaya mı çalışıyorsun? Neden?', 'Are you trying to turn me against {x}? Why?'), T2('Bu tehlikeli sözler, {a}. Duymamış olayım.', 'Dangerous words, {a}. I shall pretend I did not hear them.')];
const RECON_OK = [T2('Belki de {x} hakkında fazla sert davrandım...', 'Perhaps I have been too harsh on {x}...'), T2('Peki. {x}\'e bir şans daha veririm. Senin hatırına.', 'Very well. I will give {x} another chance. For your sake.')];
const RECON_FAIL = [T2('{x} ile barışmak mı? Önce cehennem donsun.', 'Make peace with {x}? When hell freezes over.')];
const MATCH_OK = [T2('{x} ile mi? Hm... Aslında hep gözüm vardı. Peki, kabul ediyorum!', 'With {x}? Hm... I always did have an eye for them. Very well, I accept!')];
const MATCH_FAIL = [T2('{x} ile evlenmektense manastıra kapanırım.', 'I would sooner take the veil than marry {x}.'), T2('Teşekkürler ama {x} bana göre değil.', 'Thank you, but {x} is not for me.')];
const COMPLIMENT = {
  pleased: [T2('Ah, çok naziksin, {a}.', 'Ah, you are too kind, {a}.'), T2('Bunu duymak güzel. Gerçekten.', 'That is lovely to hear. Truly.'), T2('Yanaklarım kızardı, {a}.', 'You make me blush, {a}.')],
  proud: [T2('Elbette. Sonunda biri fark etti.', 'Of course. At last someone notices.'), T2('Bunu bilmeyen yoktur, ama söylemen hoş.', 'Everyone knows it, but it is pleasant to hear.')],
  wary: [T2('Dalkavukluğa gerek yok. Ne istiyorsun?', 'No need for flattery. What do you want?'), T2('Tatlı sözlerin arkasında hep bir istek olur.', 'There is always a request behind sweet words.')],
  offended: [T2('Benimle alay mı ediyorsun?', 'Are you mocking me?'), T2('Bu bir iltifat mıydı, hakaret mi? Karar veremedim.', 'Was that a compliment or an insult? I cannot decide.')],
};
const FLIRT_OK = [T2('Hmm... cesursun. Hoşuma gitti.', 'Hmm... bold. I like that.'), T2('Böyle bakmaya devam edersen başımı döndüreceksin, {a}.', 'Keep looking at me like that and you will turn my head, {a}.'), T2('Akşam bahçede yürüyüşe çıkarım. Yalnız.', 'I walk in the garden in the evening. Alone.')];
const FLIRT_FAIL = [T2('Haddini bil, {a}.', 'Know your place, {a}.'), T2('Lütfen... bu uygunsuz.', 'Please... this is improper.'), T2('Bunu duymamış olayım.', 'I shall pretend I did not hear that.')];
const FAREWELL = [
  [T2('Git artık. Bir daha karşıma çıkma.', 'Go now. Do not cross my path again.'), T2('Kapı orada.', 'The door is there.')],
  [T2('Peki. Hoşça kal.', 'Very well. Farewell.'), T2('Gidebilirsin.', 'You may go.')],
  [T2('Hoşça kal, {a}.', 'Farewell, {a}.'), T2('Yine gel.', 'Come again.')],
  [T2('Seni görmek güzeldi, {a}. Yolun açık olsun.', 'It was good to see you, {a}. Safe roads.'), T2('Yine bekleriz!', 'Come back soon!')],
  [T2('Ayrılmak istemiyorum ama... Tanrı seni korusun, {a}.', 'I do not want you to go, but... God keep you, {a}.'), T2('Kalbim seninle, dostum.', 'My heart goes with you, friend.')],
];
const PATIENCE_OUT = [T2('Yeterince konuştuk. Başka işlerim var.', 'We have talked enough. I have other matters.'), T2('Başım ağrıdı. Sonra devam ederiz.', 'My head aches. We shall continue later.'), T2('Muhafızlar seni kapıya kadar geçirsin.', 'The guards will see you to the door.')];

/* ---------- Konuşmayı aç ---------- */
function dialoguePatience(p, t) {
  return clamp(Math.round(3 + (opinion(t, p) + 30) / 30 + (stat(p, 'dip') - 6) / 4 + (familyRel(p, t) || p.lovers.includes(t.id) ? 1 : 0) - (has(t, 'paranoyak') ? 1 : 0) + (bond(t, p) === 'dost' ? 1 : 0)), 2, 8);
}
function openDialogue(id) {
  const p = P(), t = ch(id);
  if (!t || !t.alive || t.id === p.id || G.over) return;
  if (t.age < 6) return toast(L('Henüz konuşamayacak kadar küçük.', 'Too young to hold a conversation.'));
  const jr = jailReq(p, t);
  if (jr) return toast(jr);
  if (G.ap < 1) return toast(L('Bu ay görüşmeye vaktin kalmadı (⚡ bitti). Zaman geçsin.', 'No time for audiences this month (⚡ spent). Let time pass.'));
  G.ap -= 1;
  const pat = dialoguePatience(p, t);
  DLG = { t: t.id, pat, max: pat, lines: [], view: 'root', x: null, used: {}, o0: opinion(t, p), ended: false };
  narrate(sceneLine(t, p));
  npcSay(greeting(t, p));
  renderDialogue();
}
function greeting(t, p) {
  const o = opinion(t, p), tier = tierOf(o), rel = familyRel(t, p), v = { a: addrOf(t, p) };
  v.A = capFirst(v.a);
  let bank = GREET[tier];
  if (p.prisonerOf === t.id) bank = REL_GREET.captor;
  else if (t.prisonerOf === p.id) bank = REL_GREET.captive;
  else if (rel === 'es') bank = o < 0 ? REL_GREET.esSoguk : REL_GREET.es;
  else if (t.lovers.includes(p.id)) bank = REL_GREET.lover;
  else if (rel === 'baba' || rel === 'anne') bank = REL_GREET.child;
  else if (rel === 'cocuk') bank = REL_GREET.parent;
  else if (rel === 'kardes' && chance(0.6)) bank = REL_GREET.sibling;
  else if (bond(t, p) === 'rakip') bank = REL_GREET.rakip;
  else if (bond(t, p) === 'dost' || bond(t, p) === 'sirdas') bank = REL_GREET.dost;
  else if (hostileChars(t, p)) bank = REL_GREET.war;
  else if (p.lordId === t.id) bank = o < -10 ? REL_GREET.liegeSoguk : REL_GREET.liege;
  else if (t.lordId === p.id && t.titles.length) bank = o < -10 ? REL_GREET.vassalSoguk : REL_GREET.vassal;
  let s = pickLine(bank, v);
  const mem = memoryRemark(t, p, v);
  if (mem) s += ' ' + mem;
  else { const tail = VOICE_TAIL[voiceOf(t)]; if (tail.length && chance(0.45)) s += ' ' + pickLine(tail, v); }
  return s;
}

/* Seninle ilgili en güçlü anısını dile getirir */
const MEM_REMARK = {
  hediye: [T2('Gönderdiğin hediyeyi hâlâ yanımda taşıyorum.', 'I still keep the gift you gave me close.'), T2('Hediyeni unutmadım; çok düşünceliydi.', 'I have not forgotten your gift; it was most thoughtful.')],
  kotuHediye: [T2('Geçen seferki hediyen... neyse, boş ver.', 'Your last gift... well, never mind.')],
  ovgu: [T2('Beni başkalarının yanında övdüğünü duydum. Sağ ol.', 'I heard you praised me before others. Thank you.')],
  kotuleme: [T2('Arkamdan konuştuğunu biliyorum, unutma.', 'I know you spoke behind my back. Do not forget that.'), T2('Dilini benim hakkımda sivriltmişsin, öyle mi?', 'You have been sharpening your tongue on me, have you?')],
  sirIfsa: [T2('Sırrımı yaydın. Bunu sana asla bağışlamayacağım.', 'You spread my secret. I will never forgive you that.')],
  hakaret: [T2('Hakaretlerin hâlâ kulaklarımda.', 'Your insults still ring in my ears.')],
  etkinlik: [T2('Geçen sefer birlikte ne güzel vakit geçirmiştik!', 'What a fine time we had together last time!')],
  iltifat: [T2('Tatlı dilin yine mi benim için?', 'Is your sweet tongue for me again?')],
  yalan: [T2('Bana yalan söylediğin günü unutmadım.', 'I have not forgotten the day you lied to me.')],
  ozur: [T2('Özrünü kabul etmiştim; umarım pişman olmam.', 'I accepted your apology; I hope I will not regret it.')],
  flort: [T2('Eşimle ne işin vardı senin, söyler misin?', 'What business did you have with my spouse, tell me?')],
  yardim: [T2('Zor günümde bana yardım ettin. Borcumu unutmam.', 'You helped me in my hour of need. I do not forget my debts.')],
  savunma: [T2('Beni savunduğunu duydum. Bu nadir bir şey.', 'I heard you defended me. That is a rare thing.')],
  ihanet: [T2('Bana ihanet ettin. Seni bir daha sırtımı dönmem.', 'You betrayed me. I will not turn my back to you again.')],
  sozBozma: [T2('Sözünü tutmadın. Borcunu hâlâ bekliyorum.', 'You did not keep your word. I am still waiting for my money.')],
  soz: [T2('Sözünün eri olduğunu gösterdin.', 'You proved a person of your word.')],
  ortakSir: [T2('Aramızdakini kimseye söylemedim, merak etme.', 'I have told no one of what is between us, fear not.')],
};
function memoryRemark(t, p, v) {
  const ms = (t.mem || []).filter(m => m.w === p.id && Math.abs(m.v) >= 6 && MEM_REMARK[m.t]);
  if (!ms.length || !chance(0.7)) return '';
  ms.sort((a, b) => Math.abs(b.v) - Math.abs(a.v));
  return pickLine(MEM_REMARK[ms[0].t], v);
}

/* ---------- Sahne, jest ve tepki anlatımı ---------- */
const SCENES = {
  _: [T2('Taht salonunun loş ışığında {t} huzuruna çıktı ve eğildi.', 'In the dim light of the throne hall, {t} comes before you and bows.'), T2('Saray bahçesinde, fıskiyenin şırıltısı arasında {t} ile karşılaştın.', 'In the palace garden, amid the murmur of the fountain, you meet {t}.'), T2('Kütüphanede, parşömen yığınlarının arasında {t} seni bekliyordu.', 'In the library, among stacks of parchment, {t} is waiting for you.'), T2('Akşam yemeğinden sonra {t} ile şömine başında yalnız kaldınız.', 'After supper you and {t} are left alone by the hearth.'), T2('Avludaki talim alanında {t} kılıcını indirip sana döndü.', 'In the training yard {t} lowers their sword and turns to you.')],
  asci: [T2('Mutfağın buharı ve baharat kokusu arasında {t} kepçesini bırakıp eğildi.', 'Amid the steam and spice of the kitchens, {t} sets down a ladle and bows.')],
  seyis: [T2('Ahırda, atların huzursuz kişnemeleri arasında {t} şapkasını çıkardı.', 'In the stables, among restless horses, {t} doffs their cap.')],
  muhafiz: [T2('Kapıdaki nöbet yerinde {t} mızrağını yere vurup esas duruşa geçti.', 'At the gate {t} strikes their spear on the stone and stands to attention.')],
  ozan: [T2('{t} udunun tellerini susturdu ve sana döndü.', '{t} stills the strings of their lute and turns to you.')],
  dansci: [T2('Müzik durdu. {t} nefes nefese, ipek eteklerini toplayarak yanına geldi.', 'The music stops. Breathless, {t} gathers their silks and comes to you.')],
  dilenci: [T2('Saray kapısının dibinde, paçavralar içindeki {t} titreyen elini uzattı.', 'At the foot of the palace gate, {t}, dressed in rags, holds out a trembling hand.')],
  capulcu: [T2('Arka sokağın gölgelerinden {t} çıktı; elleri belindeki bıçağın yakınında.', '{t} steps out of the shadows of a back alley, hands near the knife at their belt.')],
  kumarbaz: [T2('Meyhanenin köşesinde {t} zarları avucunda sallayarak sana göz kırptı.', 'In a corner of the tavern {t} rattles dice in a palm and winks at you.')],
  hekim: [T2('İlaç kokan odasında {t} şişeleri bırakıp sana baktı.', 'In a chamber smelling of tinctures, {t} sets down the vials and looks up.')],
  katip: [T2('{t} mürekkep lekeli parmaklarıyla kalemini bıraktı.', '{t} puts down the quill with ink-stained fingers.')],
  lover: [T2('Gizli merdivenin başında, tek bir mumun ışığında {t} seni bekliyordu.', 'At the top of the hidden stair, by the light of a single candle, {t} is waiting.')],
  spouse: [T2('Özel dairende {t} ile baş başa kaldınız.', 'You and {t} are alone in your private chambers.')],
  jail: [T2('Zindanın rutubetli karanlığında {t} zincirlerini şıkırdattı.', 'In the damp dark of the dungeon, {t} rattles their chains.')],
  ruler: [T2('Elçilerin eşliğinde {t} ile yüz yüze geldin; iki saray birbirini süzüyor.', 'Flanked by envoys you meet {t} face to face; two courts size each other up.')],
};
function sceneLine(t, p) {
  let bank = SCENES._;
  if (t.prisonerOf === p.id || p.prisonerOf === t.id) bank = SCENES.jail;
  else if (p.spouseId === t.id) bank = SCENES.spouse;
  else if (p.lovers.includes(t.id)) bank = SCENES.lover;
  else if (t.job && SCENES[t.job]) bank = SCENES[t.job];
  else if (ownRealm(t) && realmOf(t) !== realmOf(p)) bank = SCENES.ruler;
  return pickLine(bank, { t: `<b>${esc(t.name)}</b>` });
}
const GESTURES = [
  [T2('dişlerini sıkarak', 'through gritted teeth'), T2('gözlerini kısarak', 'narrowing their eyes'), T2('buz gibi bir sesle', 'in an icy voice'), T2('sana tepeden bakarak', 'looking down on you')],
  [T2('kollarını kavuşturarak', 'arms folded'), T2('kaşlarını çatarak', 'frowning'), T2('mesafeli bir tavırla', 'coolly')],
  [T2('başını hafifçe eğerek', 'with a slight nod'), T2('düşünceli bir sesle', 'thoughtfully'), T2('sakin bir tavırla', 'calmly')],
  [T2('gülümseyerek', 'smiling'), T2('sıcak bir sesle', 'warmly'), T2('gözleri parlayarak', 'eyes bright')],
  [T2('yüzü aydınlanarak', 'face lighting up'), T2('elini tutarak', 'taking your hand'), T2('içtenlikle gülerek', 'laughing heartily')],
];
const TRAIT_GESTURE = {
  kibirli: T2('çenesini kaldırarak', 'chin raised'), korkak: T2('gözlerini kaçırarak', 'avoiding your eyes'), sehvetli: T2('dudağını ısırarak', 'biting their lip'),
  paranoyak: T2('etrafı kollayarak', 'glancing about'), ayyas: T2('kadehini sallayarak', 'swirling a cup'), kurnaz: T2('sinsice gülümseyerek', 'with a sly smile'),
  durust: T2('doğrudan gözlerinin içine bakarak', 'looking you straight in the eye'), zalim: T2('soğuk bir gülümsemeyle', 'with a cold smile'),
  dindar: T2('tespihini çekerek', 'fingering prayer beads'), cesur: T2('kılıcının kabzasına dayanarak', 'resting a hand on their sword hilt'), utangac: T2('kızararak', 'blushing'),
};
function npcGesture(t, p) {
  const tr = t.traits.filter(x => TRAIT_GESTURE[x]);
  const g = tr.length && chance(0.35) ? TRAIT_GESTURE[pick(tr)] : pick(GESTURES[tierOf(opinion(t, p))]);
  return L(g[0], g[1]);
}
const REACT_UP = [T2('{t}\'in yüzü aydınlandı.', '{t}\'s face brightens.'), T2('{t} belli belirsiz gülümsedi.', 'A faint smile crosses {t}\'s lips.'), T2('{t}\'in omuzları gevşedi.', '{t}\'s shoulders relax.')];
const REACT_DOWN = [T2('{t}\'in bakışları buz kesti.', '{t}\'s gaze turns to ice.'), T2('{t} dudaklarını büzdü.', '{t} purses their lips.'), T2('{t} bir adım geri çekildi.', '{t} takes a step back.')];
function narrate(html) { DLG.lines.push({ w: 'nar', h: html }); }

/* ---------- Konuşma kaydı ---------- */
function npcSay(html) { const t = dT(), p = P(); DLG.lines.push({ w: 'npc', h: html, g: t && p ? npcGesture(t, p) : '', m: t && p ? opinion(t, p) / 100 : 0 }); }
function meSay(html) { DLG.lines.push({ w: 'me', h: html }); }
function sysSay(html, cls = '') { DLG.lines.push({ w: 'sys', h: html, c: cls }); }
function dT() { return ch(DLG.t); }
/* Bir konuşma adımını uygula: görüş değişimini göster, sabrı azalt */
function dStep(cost, fn) {
  const p = P(), t = dT();
  const before = opinion(t, p);
  fn(p, t);
  if (!t.alive) { DLG.ended = true; renderDialogue(); return; }
  const d = opinion(t, p) - before;
  if (d >= 6) narrate(pickLine(REACT_UP, { t: esc(t.name) }));
  else if (d <= -6) narrate(pickLine(REACT_DOWN, { t: esc(t.name) }));
  if (d) sysSay(`${L('Sana bakışı', 'Their opinion of you')} ${d > 0 ? '+' : ''}${d}`, d > 0 ? 'good' : 'bad');
  DLG.pat -= cost;
  if (DLG.pat <= 0 && !DLG.ended) { npcSay(pickLine(PATIENCE_OUT, { a: addrOf(t, p) })); DLG.ended = true; }
  if (opinion(t, p) <= -70 && !DLG.ended && chance(0.5)) { npcSay(pickLine(FAREWELL[0], { a: addrOf(t, p) })); DLG.ended = true; }
  DLG.view = DLG.ended ? 'root' : DLG.view;
  saveGame();
  renderDialogue();
}
function endDialogue() {
  const p = P(), t = dT();
  if (t && t.alive && !DLG.ended) { meSay(L('Hoşça kal.', 'Farewell.')); npcSay(pickLine(FAREWELL[tierOf(opinion(t, p))], { a: addrOf(t, p) })); }
  const d = t ? opinion(t, p) - DLG.o0 : 0;
  if (t && d) log(L(`💬 ${nm(t)} ile görüştün. (İlişki ${d > 0 ? '+' : ''}${d})`, `💬 You spoke with ${nm(t)}. (Opinion ${d > 0 ? '+' : ''}${d})`), 'social');
  DLG = null;
  closeModal();
  if (UI.drawer) renderDrawer();
  updateHUD();
  processQueue();
}

/* ---------- Konular ---------- */
function canFlirt(p, t) { return isGrown(p) && isGrown(t) && !closeKin(p, t) && !t.prisonerOf && p.spouseId !== t.id; }
function rootOptions(p, t) {
  const o = [];
  const u = DLG.used;
  o.push({ i: '💬', l: L('Hal hatır sor', 'Small talk'), h: L('Ailesi, sağlığı, toprakları, savaş', 'Family, health, lands, war'), go: 'small' });
  o.push({ i: '🎭', l: L('İlgi alanlarından konuş', 'Talk about interests'), h: L('Neyi sevdiğini keşfet', 'Discover what they love'), go: 'interests' });
  o.push({ i: '👥', l: L('Biri hakkında konuş', 'Talk about someone'), h: L('Öv, kötüle, sır ver, kışkırt…', 'Praise, badmouth, share secrets, incite…'), go: 'people' });
  o.push({ i: '👂', l: L('Söylentileri sor', 'Ask for news & rumours'), h: L('Kim kimden ne dedi?', 'Who said what about whom?'), dis: u.news >= 2 ? L('Bildiği her şeyi anlattı', 'They told you all they know') : null, f: () => dStep(1, doNews) });
  o.push({ i: '🎁', l: L('Hediye ver', 'Give a gift'), h: (p.inv || []).length ? L(`${p.inv.length} eşyan var`, `${p.inv.length} items`) : L('Altın ya da pazardan eşya', 'Gold or goods from a market'), go: 'gift' });
  o.push({ i: '🍗', l: L('Bir etkinliğe davet et', 'Invite to an activity'), h: L('Av, şölen, satranç, dua…', 'Hunt, feast, chess, prayer…'), go: 'invite', dis: u.invite ? L('Bu görüşmede yapıldı', 'Already done') : null });
  o.push({ i: '🌹', l: L('İltifat et', 'Compliment'), h: L('Güzellik, akıl, cesaret, takva…', 'Looks, wisdom, valour, piety…'), go: 'compliment', dis: (u.comp || 0) >= 2 ? L('Yeterince iltifat ettin', 'Enough flattery') : null });
  if (canFlirt(p, t)) o.push({ i: '💌', l: L('Flört et', 'Flirt'), h: t.lovers.includes(p.id) ? L('Sevgilin', 'Your lover') : `%${flirtChance(p, t)}`, go: 'flirt' });
  o.push({ i: '🤝', l: L('Bir şey iste / öner', 'Ask / propose'), h: L('Borç, dostluk, destek, hizmet, ittifak', 'Loan, friendship, support, service, alliance'), go: 'request' });
  o.push({ i: '😠', l: L('Sertleş', 'Get tough'), h: L('Hakaret, tehdit, şantaj', 'Insult, threaten, blackmail'), go: 'hostile' });
  return o;
}
function viewOptions(p, t) {
  const back = { i: '↩', l: L('Geri', 'Back'), go: 'root', back: true };
  switch (DLG.view) {
    case 'small': return [...smallTalkOptions(p, t), back];
    case 'interests': return [...interestOptions(p, t), back];
    case 'gift': return [...giftOptions(p, t), back];
    case 'invite': return [...inviteOptions(p, t), back];
    case 'people': return [...peopleOptions(p, t), back];
    case 'person': return [...personOptions(p, t, ch(DLG.x)), { i: '↩', l: L('Başka biri', 'Someone else'), go: 'people', back: true }];
    case 'compliment': return [...complimentOptions(p, t), back];
    case 'flirt': return [...flirtOptions(p, t), back];
    case 'request': return [...requestOptions(p, t), back];
    case 'hostile': return [...hostileOptions(p, t), back];
    default: return rootOptions(p, t);
  }
}

/* --- Hal hatır --- */
function smallTalkOptions(p, t) {
  const o = [], u = DLG.used;
  const once = (k, opt) => { if (u['s_' + k]) opt.dis = L('Sordun', 'Asked'); o.push(opt); };
  once('hava', { i: '🌾', l: L('Hasadı ve havayı sor', 'Ask about the harvest and weather'), f: () => dStep(1, (p, t) => { u.s_hava = 1; smallTalk(p, t, 'hava'); }) });
  if (t.spouseId || t.children.length) once('aile', { i: '🌳', l: L('Ailesini sor', 'Ask about their family'), f: () => dStep(1, (p, t) => { u.s_aile = 1; smallTalk(p, t, 'aile'); }) });
  if (t.health < 70 || has(t, 'yarali')) once('saglik', { i: '❤️', l: L('Sağlığını sor', 'Ask about their health'), f: () => dStep(1, (p, t) => { u.s_saglik = 1; smallTalk(p, t, 'saglik'); }) });
  if (t.titles.length) once('toprak', { i: '🏰', l: L('Topraklarını sor', 'Ask about their lands'), f: () => dStep(1, (p, t) => { u.s_toprak = 1; smallTalk(p, t, 'toprak'); }) });
  if (enemiesOf(realmOf(t)).length) once('savas', { i: '⚔️', l: L('Savaşı konuş', 'Discuss the war'), f: () => dStep(1, (p, t) => { u.s_savas = 1; smallTalk(p, t, 'savas'); }) });
  once('gecmis', { i: '📜', l: L('Geçmişini sor', 'Ask about their past'), f: () => dStep(1, (p, t) => { u.s_gecmis = 1; smallTalk(p, t, 'gecmis'); }) });
  return o;
}
function smallTalk(p, t, k) {
  const v = { a: addrOf(t, p) };
  const ok = chance(clamp(55 + (stat(p, 'dip') - 5) * 5 + opinion(t, p) / 4, 10, 95) / 100);
  if (k === 'hava') {
    meSay(L('Bu yıl hasat nasıl? Yağmurlar yetti mi?', 'How is the harvest this year? Did the rains come?'));
    const s = settlementsOf(t)[0];
    npcSay(s ? (s.prosperity > 1.05 ? L(`Ambarlar dolu, ${s.name} halkı mutlu. Tanrı'ya şükür.`, `The granaries are full and ${s.name} is content, thank God.`) : s.unrest > 40 ? L(`${s.name} köylüleri homurdanıyor. Hasat kıt, sabır daha da kıt.`, `The peasants of ${s.name} grumble. The harvest is thin, their patience thinner.`) : L('İdare eder. Ne bolluk ne kıtlık.', 'It will do. Neither plenty nor famine.'))
      : pickLine([T2('Yağmur dinmek bilmiyor; çizmelerim hiç kurumuyor.', 'The rain never stops; my boots are never dry.'), T2('Bu sıcakta at bile terliyor, {a}.', 'In this heat even the horses sweat, {a}.')], v));
  } else if (k === 'aile') {
    meSay(L('Ailen nasıl? Herkes iyi mi?', 'How is your family? Is everyone well?'));
    const sp = ch(t.spouseId), kids = t.children.map(ch).filter(x => x && x.alive);
    if (sp && opinion(t, sp) < -20) npcSay(L(`${sp.name} mi? Aynı çatı altında yaşıyoruz, o kadar.`, `${sp.name}? We live under the same roof, that is all.`));
    else if (kids.length) { const k2 = pick(kids); npcSay(L(`${k2.name} büyüyor, maşallah. ${k2.age < 12 ? 'Bütün gün tahta kılıçla koşturuyor.' : 'Yakında kendi yolunu çizecek.'}`, `${k2.name} grows fast. ${k2.age < 12 ? 'Running about with a wooden sword all day.' : 'Soon they will make their own way.'}`)); }
    else if (sp) npcSay(L(`${sp.name} iyi, sağ ol. Senin selamını iletirim.`, `${sp.name} is well, thank you. I shall pass on your greetings.`));
    if (ok) { addOp(t, p, rnd(3, 6)); if (chance(0.3)) { const pr = unknownPref(t, true); if (pr) revealPref(t, pr, true); } }
    return;
  } else if (k === 'saglik') {
    meSay(L('Sağlığın nasıl? Seni biraz yorgun gördüm.', 'How is your health? You seem a little weary.'));
    npcSay(t.health < 50 ? L('Hekimler bir şey bilmiyor. Geceleri ateşim yükseliyor...', 'The physicians know nothing. My fever rises at night...') : L('Eski yaralar yağmurda sızlıyor ama yaşıyorum.', 'Old wounds ache in the rain, but I live.'));
    if (ok) addOp(t, p, rnd(4, 8)); else addOp(t, p, -2);
    return;
  } else if (k === 'toprak') {
    meSay(L('Toprakların nasıl? İşler yolunda mı?', 'How fare your lands? All well?'));
    const s = settlementsOf(t)[0];
    npcSay(s.q ? L(`${s.name}'da ${BUILDINGS[s.q.k].ad(s)} yaptırıyorum. Taşçılar paramı yiyor ama değecek.`, `I am building ${BUILDINGS[s.q.k].ad(s)} at ${s.name}. The masons eat my gold, but it will be worth it.`) : s.unrest > 50 ? L('Halk huzursuz. Vergileri hafifletmem lazım ama hazine boş.', 'The people are restless. I should ease the taxes, but the treasury is empty.') : L(`${s.name} gelişiyor. Pazar her hafta biraz daha kalabalık.`, `${s.name} prospers. The market grows busier each week.`));
  } else if (k === 'savas') {
    meSay(L('Savaş nasıl gidiyor sence?', 'How do you think the war goes?'));
    const foe = pick(enemiesOf(realmOf(t)));
    npcSay(has(t, 'cesur') ? L(`${foe.name} mı? Sancaklarını çiğneyip geçeceğiz!`, `The ${foe.name}? We will trample their banners!`) : has(t, 'korkak') ? L(`${foe.name} ordusu her gün yaklaşıyor... Geceleri uyuyamıyorum.`, `The army of the ${foe.name} draws closer each day... I cannot sleep at night.`) : L(`${foe.name} ile savaş uzun sürecek. Kan ve altın, ikisi de akacak.`, `The war with the ${foe.name} will be long. Blood and gold will both flow.`));
    if (hostileChars(t, p)) { addOp(t, p, -3); return; }
  } else if (k === 'gecmis') {
    meSay(L('Bana kendinden bahset. Nasıl biri olarak büyüdün?', 'Tell me of yourself. How did you grow up?'));
    const tr = t.traits.filter(x => TRAITS[x].kisilik);
    const tt = tr.length ? TRAITS[pick(tr)] : null;
    npcSay(tt ? L(`Herkes beni "${tt.ad.toLocaleLowerCase('tr')}" bilir. ${tt.d}`, `Everyone knows me as ${tt.ad.toLowerCase()}. ${tt.d}`) : L('Anlatacak pek bir şey yok.', 'There is little to tell.'));
    const pr = unknownPref(t, true);
    if (pr && ok) revealPref(t, pr, true);
  }
  if (ok) addOp(t, p, rnd(3, 7)); else { addOp(t, p, -1); if (chance(0.5)) npcSay(L('...Neyse. Başka?', '...Anyway. Anything else?')); }
}
/* Zevki öğren (ve sohbette söyletebilir) */
function revealPref(t, [cat, k, v], speak) {
  knowPref(t, cat, k);
  if (!speak) return;
  const name = prefName(cat, k);
  if (cat === 'i') npcSay(pickLine(v > 0 ? ASK_PREF.item : ASK_PREF.itemNo, { h: `<b>${name}</b>` }));
  else npcSay(pickLine(v > 0 ? ASK_PREF.like : ASK_PREF.dislike, { h: `<b>${name}</b>` }));
  sysSay(`${prefIcon(cat, k)} ${L('Öğrendin', 'Learned')}: ${esc(t.name)} ${v > 0 ? L('seviyor', 'likes') : L('sevmiyor', 'dislikes')} — ${esc(name)}`, 'learn');
}

/* --- İlgi alanları --- */
function interestOptions(p, t) {
  const o = [];
  o.push({ i: '❓', l: L('"Boş vakitlerinde ne yaparsın?"', '"What do you do with your leisure?"'), dis: (DLG.used.ask || 0) >= 2 ? L('Yeterince sordun', 'Asked enough') : null, f: () => dStep(1, askPref) });
  for (const k of Object.keys(HOBBIES)) {
    const kn = knowsPref(t, 'h', k), v = prefOf(t, 'h', k);
    const mine = prefOf(p, 'h', k);
    if (DLG.used['h_' + k]) continue;
    o.push({ i: HOBBIES[k].i, l: HOBBIES[k].ad, h: (kn ? (v > 0 ? L('♥ seviyor', '♥ loves it') : v < 0 ? L('✕ sevmiyor', '✕ dislikes it') : L('· nötr', '· neutral')) : '') + (mine > 0 ? L(' · sen seversin', ' · you love it') : ''), tone: kn ? (v > 0 ? 'good' : v < 0 ? 'bad' : '') : '', f: () => dStep(1, () => talkHobby(p, t, k)) });
  }
  return o;
}
function askPref(p, t) {
  DLG.used.ask = (DLG.used.ask || 0) + 1;
  meSay(L('Boş vakitlerinde ne yapmaktan hoşlanırsın?', 'What do you enjoy doing in your leisure?'));
  const o = opinion(t, p);
  if (o < -20 && !has(t, 'durust')) { npcSay(L('Bu seni ilgilendirmez.', 'That is none of your concern.')); addOp(t, p, -1); return; }
  const pr = unknownPref(t, true);
  if (!pr) { npcSay(pickLine(ASK_PREF.none, {})); return; }
  revealPref(t, pr, true);
  addOp(t, p, 2);
}
function talkHobby(p, t, k) {
  DLG.used['h_' + k] = 1;
  const name = HOBBIES[k].ad, v = prefOf(t, 'h', k), mine = prefOf(p, 'h', k);
  meSay(mine > 0 ? L(`${name} benim tutkumdur. Sen ne dersin?`, `${name} is a passion of mine. What do you think?`) : L(`Hiç ${name.toLocaleLowerCase('tr')} ile ilgilendin mi?`, `Have you any interest in ${name.toLowerCase()}?`));
  knowPref(t, 'h', k);
  const vv = { h: `<b>${name}</b>` };
  if (v > 0) {
    npcSay(pickLine(HOBBY_LIKE, vv));
    addOp(t, p, rnd(6, 10) + (mine > 0 ? 6 : 0));
    if (mine > 0) { remember(t, p, 'etkinlik', 6); stress(p, -3); }
  } else if (v < 0) {
    npcSay(pickLine(HOBBY_DISLIKE, vv));
    addOp(t, p, mine > 0 ? -6 : -3);
  } else { npcSay(pickLine(HOBBY_NEUTRAL, vv)); addOp(t, p, 1); }
}

/* --- Hediyeler --- */
function giftOptions(p, t) {
  const o = [];
  const inv = p.inv || [];
  const counts = {};
  for (const k of inv) counts[k] = (counts[k] || 0) + 1;
  for (const k of Object.keys(counts)) {
    const kn = knowsPref(t, 'i', k), v = prefOf(t, 'i', k);
    o.push({ i: ITEMS[k].i, l: ITEMS[k].ad + (counts[k] > 1 ? ` ×${counts[k]}` : ''), h: kn ? (v > 0 ? L('♥ sever', '♥ loves this') : v < 0 ? L('✕ sevmez', '✕ dislikes this') : L('· nötr', '· neutral')) : L('Ne düşüneceği bilinmiyor', 'Unknown taste'), tone: kn ? (v > 0 ? 'good' : v < 0 ? 'bad' : '') : '', f: () => dStep(1, () => giveItem(p, t, k)) });
  }
  if (!inv.length) o.push({ i: '🏪', l: L('Eşyan yok', 'You have no goods'), h: L('Bir şehrin pazarından hediye satın al', 'Buy gifts at a city market'), dis: L('Pazardan alınır', 'Bought at markets') });
  o.push({ i: '💰', l: L('10 altın ver', 'Give 10 gold'), dis: p.gold < 10 ? L('10 altın gerekli', 'Requires 10 gold') : DLG.used.gold ? L('Verdin', 'Given') : null, f: () => dStep(1, () => giveGold(p, t, 10)) });
  o.push({ i: '💰', l: L('50 altın ver', 'Give 50 gold'), dis: p.gold < 50 ? L('50 altın gerekli', 'Requires 50 gold') : DLG.used.gold ? L('Verdin', 'Given') : null, f: () => dStep(1, () => giveGold(p, t, 50)) });
  return o;
}
function giveItem(p, t, k) {
  if (!takeItem(p, k)) return;
  const name = ITEMS[k].ad, v = prefOf(t, 'i', k);
  meSay(L(`Senin için bir şey getirdim: ${name}.`, `I brought you something: ${name}.`));
  knowPref(t, 'i', k);
  const vv = { i: `<b>${name}</b>`, a: addrOf(t, p) };
  if (v > 0) { npcSay(pickLine(GIFT_LIKE, vv)); addOp(t, p, 12); remember(t, p, 'hediye', 15); }
  else if (v < 0) { npcSay(pickLine(GIFT_DISLIKE, vv)); remember(t, p, 'kotuHediye', -8); }
  else { npcSay(pickLine(GIFT_NEUTRAL, vv)); addOp(t, p, 7); }
  if (k === 'atEsya' || k === 'kilicEsya' || k === 'zirh') t.base.sav = Math.min(20, t.base.sav + (chance(0.3) ? 1 : 0));
}
function giveGold(p, t, n) {
  DLG.used.gold = 1;
  p.gold -= n; t.gold += n;
  meSay(L(`Bu kese senin. ${n} altın.`, `This purse is yours. ${n} gold.`));
  const greedy = has(t, 'acgozlu'), proud = has(t, 'kibirli') && t.gold > 150;
  npcSay(pickLine(greedy ? GOLD_GIFT.greedy : proud ? GOLD_GIFT.proud : GOLD_GIFT.plain, {}));
  addOp(t, p, Math.round((n === 50 ? 22 : 7) * (greedy ? 1.6 : proud ? 0.5 : 1)));
  if (n === 50 && t.rank >= 3 && chance(0.4)) addSecret('rusvet', t.id, p.id, [t.id, p.id]);
}

/* --- Etkinlikler --- */
function inviteOptions(p, t) {
  return Object.keys(ACTIVITIES).map(k => {
    const A = ACTIVITIES[k], kn = knowsPref(t, 'a', k), v = prefOf(t, 'a', k), mine = prefOf(p, 'a', k);
    return { i: A.i, l: A.ad + (A.cost ? ` (${A.cost}💰)` : ''), h: (kn ? (v > 0 ? L('♥ sever', '♥ loves this') : v < 0 ? L('✕ sevmez', '✕ dislikes this') : L('· nötr', '· neutral')) : '') + (mine > 0 ? L(' · sen seversin', ' · you enjoy it') : mine < 0 ? L(' · sen sevmezsin', ' · you dislike it') : ''),
      tone: kn ? (v > 0 ? 'good' : v < 0 ? 'bad' : '') : '', dis: p.gold < A.cost ? L(`${A.cost} altın gerekli`, `Requires ${A.cost} gold`) : null, f: () => dStep(1, () => doActivity(p, t, k)) };
  });
}
function doActivity(p, t, k) {
  DLG.used.invite = 1;
  const A = ACTIVITIES[k], v = prefOf(t, 'a', k), mine = prefOf(p, 'a', k), hv = A.h ? prefOf(t, 'h', A.h) : 0;
  meSay(L(`Benimle bir ${A.ad.toLocaleLowerCase('tr')} düzenlemeye ne dersin?`, `What say you to a ${A.ad.toLowerCase()} together?`));
  knowPref(t, 'a', k);
  const vv = { a: addrOf(t, p) };
  if (v < 0 && opinion(t, p) < 25) { npcSay(pickLine(ACT_REFUSE, vv)); addOp(t, p, -2); return; }
  p.gold -= A.cost;
  const score = v * 2 + hv;
  if (score > 0) { npcSay(pickLine(ACT_LIKE, vv)); addOp(t, p, 10 + score * 3); remember(t, p, 'etkinlik', 10 + (mine > 0 ? 6 : 0)); }
  else if (score < 0) { npcSay(pickLine(ACT_DISLIKE, vv)); addOp(t, p, -4); }
  else { npcSay(pickLine(ACT_NEUTRAL, vv)); addOp(t, p, 6); remember(t, p, 'etkinlik', 4); }
  const st = mine > 0 ? stress(p, -12) : mine < 0 ? stress(p, 8) : stress(p, -4);
  if (st) sysSay(stressNote(st).trim());
  // Etkinliğin yan etkileri
  if (k === 'kilicTalimi' && chance(0.3) && p.base.sav < 20) { p.base.sav++; sysSay(L('Savaş +1', 'Martial +1'), 'good'); }
  if (k === 'satrancGecesi' && chance(0.3)) { const s = pick(['ent', 'yon']); if (p.base[s] < 20) { p.base[s]++; sysSay(`${STATS[s]} +1`, 'good'); } }
  if (k === 'duaGecesi' && chance(0.15)) { addTrait(p, 'dindar'); sysSay(L('Artık <b>dindar</b>sın.', 'You are now <b>pious</b>.'), 'good'); }
  if (k === 'avPartisi') { p.prestige += 5; if (chance(0.06)) { p.health -= 15; sysSay(L('Bir yaban domuzu seni yaraladı! (Sağlık -15)', 'A boar gored you! (Health -15)'), 'bad'); } }
  if (k === 'zarGecesi') { const w = chance(0.5) ? rnd(5, 20) : -rnd(5, 15); p.gold = Math.max(0, p.gold + w); sysSay(w > 0 ? L(`Zarlar seni sevdi: +${w}💰`, `The dice loved you: +${w}💰`) : L(`Kaybettin: ${w}💰`, `You lost: ${w}💰`), w > 0 ? 'good' : 'bad'); }
  if (k === 'ziyafetE' && chance(0.08)) addTrait(p, 'ayyas');
  if (score > 0 && mine > 0 && opinion(t, p) > 50 && !bond(t, p) && chance(0.35)) { setBond(t, p, 'dost'); sysSay(L(`🤝 ${esc(t.name)} ile dost oldunuz!`, `🤝 You and ${esc(t.name)} became friends!`), 'good'); }
}

/* --- Başkaları hakkında --- */
function talkablePeople(p, t) {
  const set = new Map();
  const add = c => { if (c && c.alive && c.id !== p.id && c.id !== t.id && c.age >= 14) set.set(c.id, c); };
  add(ch(t.spouseId));
  t.lovers.forEach(id => { if (G.secrets.some(s => s.type === 'zina' && knows(p, s) && [s.actor, s.target].includes(id) && [s.actor, s.target].includes(t.id))) add(ch(id)); });
  add(ch(t.lordId)); add(ch(p.lordId)); add(ch(p.spouseId));
  friendsOf(t).forEach(add); rivalsOf(t).forEach(add); friendsOf(p).forEach(add); rivalsOf(p).forEach(add);
  t.children.map(ch).forEach(add);
  for (const id of [t.fatherId, t.motherId]) add(ch(id));
  living().filter(x => x.lordId === t.id && x.titles.length).slice(0, 4).forEach(add);
  const r = realmOf(t); if (r) add(ch(r.holder));
  const pr = realmOf(p); if (pr) add(ch(pr.holder));
  for (const e of enemiesOf(r)) add(ch(e.holder));
  for (const id in p.op) if (Math.abs(p.op[id]) > 30) add(ch(+id));
  for (const c of living()) if (knownSecretsOf(p, c).length) add(c);
  return [...set.values()].slice(0, 22);
}
function relLabel(t, x) {
  const r = familyRel(t, x);
  if (r) return relName(r);
  if (t.lovers.includes(x.id) && x.lovers.includes(t.id) && G.secrets.some(s => s.type === 'zina' && knows(P(), s) && [s.actor, s.target].includes(x.id))) return L('Sevgilisi', 'Lover');
  const b = bond(t, x); if (b) return bondName(b);
  if (t.lordId === x.id) return L('Efendisi', 'Liege');
  if (x.lordId === t.id) return L('Vasalı', 'Vassal');
  if (x.rank === 5) return rankName(x);
  return '';
}
function peopleOptions(p, t) {
  return talkablePeople(p, t).map(x => {
    const known = DLG.used['q_' + x.id] ? `${L('düşüncesi', 'thinks')}: ${opBadgeText(opinion(t, x))}` : '';
    const sec = knownSecretsOf(p, x).length ? ' · 🗝️' : '';
    return { i: '👤', l: nm(x), h: [relLabel(t, x), known].filter(Boolean).join(' · ') + sec, f: () => { DLG.x = x.id; DLG.view = 'person'; renderDialogue(); } };
  });
}
function opBadgeText(v) { return `${v > 0 ? '+' : ''}${v}`; }
const closeTo = (t, x) => !!familyRel(t, x) || t.lovers.includes(x.id) || bond(t, x) === 'dost' || bond(t, x) === 'sirdas' || opinion(t, x) >= 50;
const hates = (t, x) => bond(t, x) === 'rakip' || opinion(t, x) <= -35;
function credibility(p, t) { return clamp((opinion(t, p) + 60) / 100, 0.15, 1.3) * (1 + (stat(p, 'dip') - 5) * 0.04); }
function personOptions(p, t, x) {
  if (!x || !x.alive) return [];
  const o = [], u = DLG.used, id = x.id;
  const did = k => u[k + id];
  o.push({ i: '❓', l: L(`"${x.name} hakkında ne düşünüyorsun?"`, `"What do you think of ${x.name}?"`), dis: did('q_') ? L('Sordun', 'Asked') : null, f: () => dStep(1, () => askAbout(p, t, x)) });
  o.push({ i: '👍', l: L(`${x.name}'i öv`, `Praise ${x.name}`), h: L('Ona bakışını iyileştirir; söz ona ulaşabilir', 'Improves their view of them; word may reach them'), dis: did('p_') ? L('Yaptın', 'Done') : null, f: () => dStep(1, () => praise(p, t, x)) });
  o.push({ i: '👎', l: L(`${x.name}'i kötüle`, `Badmouth ${x.name}`), h: closeTo(t, x) ? L('⚠ ona yakın biri!', '⚠ they are close!') : hates(t, x) ? L('Ondan hoşlanmıyor', 'They dislike them') : L('Arkasından konuşmak…', 'Talking behind their back…'), tone: closeTo(t, x) ? 'bad' : hates(t, x) ? 'good' : '', dis: did('b_') ? L('Yaptın', 'Done') : null, f: () => dStep(1, () => badmouth(p, t, x)) });
  o.push({ i: '🗣️', l: L(`${x.name} hakkında yalan uydur`, `Invent a lie about ${x.name}`), h: `%${pct(slanderChance(p, x) * credibility(p, t))} · ${L('Entrika', 'Intrigue')}`, dis: did('l_') ? L('Yaptın', 'Done') : null, f: () => dStep(1, () => lieAbout(p, t, x)) });
  const secs = knownSecretsOf(p, x).filter(s => !knows(t, s));
  if (secs.length) o.push({ i: '🗝️', l: L(`${x.name}'in sırrını anlat`, `Reveal ${x.name}'s secret`), h: SECRETS[secs[0].type].ad, dis: did('s_') ? L('Yaptın', 'Done') : null, f: () => dStep(1, () => tellSecret(p, t, x, secs[0])) });
  if (canIncite(t, x)) o.push({ i: '🔥', l: L(`Onu ${x.name}'e karşı kışkırt`, `Turn them against ${x.name}`), h: inciteHint(t, x) + ` · %${inciteChance(p, t, x)}`, dis: did('i_') ? L('Yaptın', 'Done') : null, f: () => dStep(1, () => incite(p, t, x)) });
  if (opinion(t, x) < -10) o.push({ i: '🕊️', l: L(`${x.name} ile arasını bul`, `Reconcile them with ${x.name}`), h: `%${pct(30 + (stat(p, 'dip') - 5) * 5 + opinion(t, p) / 3 + (bond(t, x) === 'rakip' ? -20 : 0))}`, dis: did('r_') ? L('Yaptın', 'Done') : null, f: () => dStep(1, () => reconcile(p, t, x)) });
  if (isAdult(t) && isAdult(x) && !t.spouseId && !x.spouseId && t.female !== x.female && !closeKin(t, x) && !p.lovers.includes(x.id)) o.push({ i: '💍', l: L(`${x.name} ile evlenmesini öner`, `Suggest a match with ${x.name}`), h: `%${matchChance(p, t, x)}`, dis: did('m_') ? L('Önerdin', 'Suggested') : null, f: () => dStep(1, () => matchmake(p, t, x)) });
  return o;
}
function askAbout(p, t, x) {
  DLG.used['q_' + x.id] = 1;
  meSay(L(`${short(x)} hakkında ne düşünüyorsun?`, `What do you think of ${short(x)}?`));
  const real = opinion(t, x);
  let shown = real;
  if (opinion(t, p) < -15 && !has(t, 'durust')) { npcSay(L('Bunu sana neden söyleyeyim?', 'Why would I tell you that?')); return; }
  if (has(t, 'kurnaz') && opinion(t, p) < 30 && chance(0.4)) shown = -real; // yalan söyleyebilir
  const v = { x: `<b>${esc(x.name)}</b>`, a: addrOf(t, p) };
  const rel = familyRel(t, x);
  if (rel === 'es') npcSay(real >= 20 ? L(`${x.name} benim hayat arkadaşım. Onsuz yapamam.`, `${x.name} is my companion in life. I could not do without them.`) : L(`${x.name} ile evliyiz... ama aramızda soğuk rüzgârlar esiyor.`, `${x.name} and I are wed... but cold winds blow between us.`));
  else if (bond(t, x) === 'rakip' && shown < 0) npcSay(L(`${x.name} mi? Ezeli rakibim. Bir gün düşüşünü izleyeceğim.`, `${x.name}? My sworn rival. One day I will watch them fall.`));
  else npcSay(pickLine(OPX[tierOf(shown)], v));
  // Belki bir sır da söyler
  if (opinion(t, p) > 40 && shown < -20) {
    const s = G.secrets.find(s => s.actor === x.id && knows(t, s) && !knows(p, s) && !s.pub);
    if (s && chance(0.5)) { learn(p, s); npcSay(L(`Sana bir şey söyleyeyim, ama benden duymadın: <i>${secretText(s)}</i>`, `I will tell you something, but you did not hear it from me: <i>${secretText(s)}</i>`)); sysSay(L('🗝️ Bir sır öğrendin!', '🗝️ You learned a secret!'), 'learn'); }
  }
  // Ortak zevkleri de söyleyebilir
  if (opinion(t, p) > 20 && chance(0.35)) {
    const lk = likedList(x, 'h').concat(likedList(x, 'i').map(k => 'i:' + k));
    const k = lk.length ? pick(lk) : null;
    if (k) { const [cat, kk] = k.startsWith('i:') ? ['i', k.slice(2)] : ['h', k]; knowPref(x, cat, kk); npcSay(L(`Bu arada, ${x.name} ${prefName(cat, kk).toLocaleLowerCase('tr')} için deli olur. Gönlünü kazanmak istersen...`, `By the way, ${x.name} is mad for ${prefName(cat, kk).toLowerCase()}. If you want to win their heart...`)); sysSay(`${prefIcon(cat, kk)} ${L('Öğrendin', 'Learned')}: ${esc(x.name)} — ${esc(prefName(cat, kk))} ♥`, 'learn'); }
  }
  addOp(t, p, 1);
}
function praise(p, t, x) {
  DLG.used['p_' + x.id] = 1;
  meSay(pickLine([T2('{x} çok değerli biri. Ondan hep iyi şeyler duydum.', '{x} is a worthy soul. I have only heard good things.'), T2('{x}\'in cesaretine ve aklına hayranım.', 'I admire {x}\'s courage and wit.'), T2('Bence {x} bu sarayın en dürüst insanlarından.', 'I think {x} is one of the most honest people at this court.')], { x: short(x) }));
  const k = credibility(p, t), v = { x: `<b>${esc(x.name)}</b>` };
  if (hates(t, x) && opinion(t, x) < -45) { npcSay(pickLine(PRAISE_ANGRY, v)); addOp(t, x, 2); addOp(t, p, -6); }
  else if (closeTo(t, x) || opinion(t, x) > 20) { npcSay(pickLine(PRAISE_AGREE, v)); addOp(t, x, Math.round(4 * k)); addOp(t, p, 6); }
  else { npcSay(pickLine(PRAISE_NEUTRAL, v)); addOp(t, x, Math.round(8 * k)); addOp(t, p, 1); }
  addRumor(p, t, x, 1);
  if (has(t, 'durust')) addOp(t, p, 2);
}
function badmouth(p, t, x) {
  DLG.used['b_' + x.id] = 1;
  meSay(pickLine([T2('{x} mi? Bence güvenilmez biri. Gözü hep başkalarının malında.', '{x}? Untrustworthy, if you ask me. Always eyeing other people\'s goods.'), T2('Şunu bil: {x} arkandan hep dalga geçiyor.', 'Know this: {x} mocks you behind your back.'), T2('{x} kendini beğenmiş bir korkak, başka bir şey değil.', '{x} is a vain coward, nothing more.')], { x: short(x) }));
  const k = credibility(p, t), v = { x: `<b>${esc(x.name)}</b>`, a: addrOf(t, p) };
  if (closeTo(t, x)) {
    npcSay(pickLine(BAD_OFFENDED, v));
    addOp(t, p, -(familyRel(t, x) || t.lovers.includes(x.id) ? 22 : 14));
    addOp(t, x, 2);
    addRumor(p, t, x, -1, 0.35);
    if (opinion(t, p) < -40 && !bond(t, p)) setBond(t, p, 'rakip');
  } else if (hates(t, x)) {
    npcSay(pickLine(BAD_DELIGHT, v));
    addOp(t, x, -Math.round(5 * k)); addOp(t, p, 8);
    addRumor(p, t, x, -1, -0.1);
  } else if (has(t, 'durust') || has(t, 'alcakgonullu')) {
    npcSay(pickLine(BAD_HONEST, v));
    addOp(t, x, -Math.round(3 * k)); addOp(t, p, -5);
    addRumor(p, t, x, -1, 0.15);
  } else {
    npcSay(pickLine(BAD_INTRIGUED, v));
    addOp(t, x, -Math.round(10 * k)); addOp(t, p, has(t, 'kurnaz') ? 3 : 0);
    addRumor(p, t, x, -1);
  }
  consequences(p, t, x);
}
function lieAbout(p, t, x) {
  DLG.used['l_' + x.id] = 1;
  const lie = pick([T2('{x} geçen ay kendi efendisini zehirlemeyi planlıyordu; mektuplarını gördüm.', '{x} was plotting to poison their own liege last month; I saw the letters.'), T2('{x} düşmanla gizlice yazışıyor.', '{x} secretly corresponds with the enemy.'), T2('{x}\'in kilise bağışlarını cebe attığını herkes biliyor.', 'Everyone knows {x} pockets the church\'s alms.')]);
  meSay(fill(lie, { x: short(x) }));
  const st = traitStress(p, { durust: 12, kurnaz: -4 });
  const v = { x: `<b>${esc(x.name)}</b>`, a: addrOf(t, p) };
  if (chance(slanderChance(p, x) * credibility(p, t) / 100) && !(closeTo(t, x) && chance(0.6))) {
    npcSay(pickLine(SLANDER_OK, v));
    addOp(t, x, -18); x.shame += 4;
    const l = ch(x.lordId); if (l && l.id === t.id) addOp(t, x, -10);
    addRumor(p, t, x, -2);
    consequences(p, t, x);
  } else {
    npcSay(pickLine(SLANDER_FAIL, v));
    addOp(t, p, -12); remember(t, p, 'yalan', -15);
    addRumor(p, t, x, -2, 0.4);
  }
  if (st) sysSay(stressNote(st).trim());
}
function tellSecret(p, t, x, s) {
  DLG.used['s_' + x.id] = 1;
  meSay(L(`Sana bir sır vereceğim, ama kimseye söyleme: <i>${secretText(s)}</i>`, `I will tell you a secret, but keep it to yourself: <i>${secretText(s)}</i>`));
  learn(t, s);
  const v = { x: `<b>${esc(x.name)}</b>`, a: addrOf(t, p) };
  if (closeTo(t, x)) { npcSay(pickLine(BAD_OFFENDED, v)); addOp(t, p, -15); addOp(t, x, -Math.round(SECRETS[s.type].shame * 0.4)); }
  else if (has(t, 'kurnaz') || has(t, 'acgozlu')) { npcSay(pickLine(SECRET_GLEE, v)); addOp(t, p, 10); addOp(t, x, -Math.round(SECRETS[s.type].shame * 0.6)); remember(t, p, 'ortakSir', 8); }
  else { npcSay(pickLine(SECRET_SHOCK, v)); addOp(t, p, 4); addOp(t, x, -Math.round(SECRETS[s.type].shame * 0.9)); }
  addRumor(p, t, x, 'sir');
  // Efendisi suçu öğrenirse zindan; kurnazlar şantaj yapabilir — dünya kendi kurallarıyla tepki verir
  if (x.lordId === t.id && SECRETS[s.type].suc) sysSay(L(`${esc(t.name)} artık vasalının suçunu biliyor...`, `${esc(t.name)} now knows of their vassal's crime...`), 'learn');
  if ((has(t, 'durust') || has(t, 'dindar')) && chance(0.25)) { exposeSecret(s); sysSay(L('Sır yayıldı: artık herkes biliyor!', 'The secret spread: now everyone knows!'), 'bad'); }
}
/* Dedikodunun dünyaya etkileri: vasal-efendi, hükümdar-hükümdar */
function consequences(p, t, x) {
  if (t.lordId === x.id && settlementsOf(t).length >= 2 && opinion(t, x) < -45 && (has(t, 'hirsli') || has(t, 'kibirli')) && chance(0.15)) {
    const r = rebel(t);
    if (r) sysSay(L(`🔥 ${esc(nm(t))} sözlerinden sonra efendisine isyan etti! <b>${esc(r.name)}</b> kuruldu.`, `🔥 After your words, ${esc(nm(t))} rose against their liege! The <b>${esc(r.name)}</b> is founded.`), 'bad');
  }
  const rt = ownRealm(t), rx = ownRealm(x);
  if (rt && rx && rt !== rx && !atWarRealms(rt, rx) && opinion(t, x) < -45 && chance(0.12)) {
    declareWar(rt, rx, L('(Kulağına fısıldanan sözler yüzünden.)', '(Because of words whispered in their ear.)'));
    sysSay(L(`⚔️ ${esc(rt.name)}, ${esc(rx.name)} ile savaşa girdi!`, `⚔️ The ${esc(rt.name)} went to war with the ${esc(rx.name)}!`), 'bad');
  }
}
function canIncite(t, x) {
  if (t.lordId === x.id) return true;
  if (ownRealm(t) && ownRealm(x) && ownRealm(t) !== ownRealm(x)) return true;
  if (familyRel(t, x) === 'kardes') return true;
  return false;
}
function inciteHint(t, x) {
  if (t.lordId === x.id) return L('Efendisine karşı: isyan', 'Against their liege: revolt');
  if (ownRealm(t) && ownRealm(x)) return L('Başka bir hükümdara karşı: savaş', 'Against another ruler: war');
  return L('Kardeşine karşı: miras kavgası', 'Against their sibling: a feud');
}
function inciteChance(p, t, x) { return pct(20 + (stat(p, 'ent') + stat(p, 'dip') - 10) * 3 + opinion(t, p) / 3 - opinion(t, x) / 3 + (has(t, 'hirsli') ? 15 : 0) + (has(t, 'kanaatkar') ? -15 : 0) - (closeTo(t, x) ? 25 : 0)); }
function incite(p, t, x) {
  DLG.used['i_' + x.id] = 1;
  meSay(t.lordId === x.id ? L(`${short(x)} sana layık bir efendi değil. Sen daha fazlasını hak ediyorsun.`, `${short(x)} is no worthy liege for you. You deserve more.`)
    : ownRealm(t) ? L(`${short(x)} sınırlarına göz dikmiş. Önce sen davranmazsan, o davranacak.`, `${short(x)} covets your borders. If you do not strike first, they will.`)
      : L(`${short(x)} mirasını senden çalmaya hazırlanıyor.`, `${short(x)} is preparing to steal your inheritance.`));
  const v = { x: `<b>${esc(x.name)}</b>`, a: addrOf(t, p) };
  if (chance(inciteChance(p, t, x) / 100)) {
    npcSay(pickLine(INCITE_OK, v));
    addOp(t, x, -22); addOp(t, p, 5); remember(t, p, 'ortakSir', 6);
    addRumor(p, t, x, -2, -0.05);
    consequences(p, t, x);
    if (ownRealm(t) && ownRealm(x) && opinion(t, x) < -30 && chance(0.25) && !atWarRealms(ownRealm(t), ownRealm(x))) {
      declareWar(ownRealm(t), ownRealm(x), L('(Kışkırtmaların sonuç verdi.)', '(Your incitement bore fruit.)'));
      sysSay(L('⚔️ Savaş ilan edildi!', '⚔️ War has been declared!'), 'bad');
    }
  } else {
    npcSay(pickLine(INCITE_FAIL, v));
    addOp(t, p, -8);
    addRumor(p, t, x, -2, 0.3);
  }
}
function reconcile(p, t, x) {
  DLG.used['r_' + x.id] = 1;
  meSay(L(`${short(x)} ile aranızdaki bu soğukluk ikinize de zarar veriyor. Barışmanın vakti gelmedi mi?`, `This coldness between you and ${short(x)} harms you both. Is it not time to make peace?`));
  const v = { x: `<b>${esc(x.name)}</b>` };
  const c = pct(30 + (stat(p, 'dip') - 5) * 5 + opinion(t, p) / 3 + (bond(t, x) === 'rakip' ? -20 : 0));
  if (chance(c / 100)) {
    npcSay(pickLine(RECON_OK, v));
    addOp(t, x, 18); addOp(x, t, 10); addOp(t, p, 4);
    if (bond(t, x) === 'rakip' && opinion(t, x) > -20) setBond(t, x, null);
    remember(x, p, 'savunma', 8);
  } else { npcSay(pickLine(RECON_FAIL, v)); addOp(t, p, -3); }
}
function matchChance(p, t, x) { return pct(15 + opinion(t, x) / 2 + opinion(x, t) / 3 + (stat(p, 'dip') - 5) * 4 + opinion(t, p) / 4 + (has(x, 'guzel') ? 10 : 0) - Math.abs(t.age - x.age)); }
function matchmake(p, t, x) {
  DLG.used['m_' + x.id] = 1;
  meSay(L(`${short(x)} ile evlenmeyi hiç düşündün mü? Bence birbiriniz için yaratılmışsınız.`, `Have you ever thought of marrying ${short(x)}? I think you were made for each other.`));
  const v = { x: `<b>${esc(x.name)}</b>` };
  if (chance(matchChance(p, t, x) / 100)) {
    npcSay(pickLine(MATCH_OK, v));
    marry(t, x);
    addOp(t, p, 15); addOp(x, p, 12); p.prestige += 10;
    sysSay(L(`💍 ${esc(nm(t))} ile ${esc(nm(x))} evlendi! İki aile de sana minnettar.`, `💍 ${esc(nm(t))} and ${esc(nm(x))} are wed! Both families are grateful to you.`), 'good');
    log(L(`💍 Çöpçatanlığınla ${nm(t)} ve ${nm(x)} evlendi.`, `💍 Thanks to your matchmaking, ${nm(t)} and ${nm(x)} were married.`), 'social');
  } else { npcSay(pickLine(MATCH_FAIL, v)); addOp(t, p, -2); }
}

/* --- Söylentiler / haberler --- */
function doNews(p, t) {
  DLG.used.news = (DLG.used.news || 0) + 1;
  meSay(pickLine([T2('Sarayda neler konuşuluyor? Bana anlat.', 'What is the talk at court? Tell me.'), T2('Duyduğun bir şey var mı? Yeni dedikodular?', 'Heard anything? Any fresh gossip?')], {}));
  const o = opinion(t, p), opts = [];
  // 1) Senin hakkında konuşulanlar
  const aboutMe = G.rumors.filter(r => r.a === p.id && !r.pk && (r.l === t.id || (r.heard || []).includes(t.id)) && ch(r.s) && ch(r.s).alive);
  if (aboutMe.length && o > -10) opts.push(['me', 4]);
  // 2) Bir sır
  const secs = G.secrets.filter(s => !s.pub && knows(t, s) && !knows(p, s) && s.actor !== t.id && ch(s.actor) && ch(s.actor).alive);
  if (secs.length && o >= 25) opts.push(['secret', 2 + (has(t, 'kurnaz') ? 1 : 0) + (bond(t, p) === 'sirdas' ? 3 : 0)]);
  // 3) Rakipleri / dostları
  const riv = rivalsOf(t).filter(x => x.id !== p.id);
  if (riv.length) opts.push(['rival', 1.5]);
  // 4) Bir başkasının zevki
  opts.push(['taste', 1.5]);
  // 5) Efendinin sana bakışı
  const l = ch(p.lordId);
  if (l && l.id !== t.id && (t.lordId === l.id || t.id === l.lordId)) opts.push(['liege', 1.5]);
  // 6) Dünya haberleri
  opts.push(['world', 1]);
  if (o < -20) { npcSay(L('Sana mı anlatacağım? Hiç sanmıyorum.', 'Tell you? I hardly think so.')); return; }
  const k = weighted(opts);
  const v = { a: addrOf(t, p) };
  if (k === 'me') {
    const r = pick(aboutMe), sp = ch(r.s);
    r.pk = 1;
    const good = r.tone === 1;
    npcSay(good ? L(`Biliyor musun, ${short(sp)} senin hakkında çok iyi şeyler söylüyor.`, `Did you know, ${short(sp)} speaks very highly of you?`)
      : r.tone === 'sir' ? L(`Dikkatli ol, ${v.a}. ${short(sp)} senin bir sırrını etrafa yayıyor.`, `Be careful, ${v.a}. ${short(sp)} is spreading one of your secrets.`)
        : L(`Dikkatli ol, ${v.a}. ${short(sp)} senin hakkında kötü şeyler söylüyor. ${r.tone === -2 ? 'Hem de yalanlar uyduruyor.' : ''}`, `Be careful, ${v.a}. ${short(sp)} speaks ill of you. ${r.tone === -2 ? 'And invents lies, too.' : ''}`));
    addOp(p, sp, good ? 10 : -20);
    addOp(t, p, 2);
    sysSay(L(`👂 Artık ${esc(nm(sp))} ile ilgili bunu biliyorsun.`, `👂 Now you know this about ${esc(nm(sp))}.`), 'learn');
  } else if (k === 'secret') {
    const s = pick(secs); learn(p, s);
    npcSay(L(`Kimseye söyleme ama... <i>${secretText(s)}</i>`, `Do not tell anyone, but... <i>${secretText(s)}</i>`));
    sysSay(L('🗝️ Bir sır öğrendin!', '🗝️ You learned a secret!'), 'learn');
  } else if (k === 'rival') {
    const x = pick(riv);
    npcSay(L(`${short(x)} ile ezeli rakibiz. Onun hakkında kötü bir şey duyarsan ilk bana gel.`, `${short(x)} and I are sworn rivals. Hear anything bad about them, come to me first.`));
    sysSay(L(`👂 ${esc(t.name)}, ${esc(x.name)}'den nefret ediyor.`, `👂 ${esc(t.name)} hates ${esc(x.name)}.`), 'learn');
  } else if (k === 'taste') {
    const cands = talkablePeople(p, t).filter(x => x.pr);
    const x = cands.length ? pick(cands) : null;
    const lk = x ? [...likedList(x, 'h').map(k2 => ['h', k2]), ...likedList(x, 'i').map(k2 => ['i', k2]), ...likedList(x, 'a').map(k2 => ['a', k2])].filter(([c2, k2]) => !knowsPref(x, c2, k2)) : [];
    if (x && lk.length) { const [c2, k2] = pick(lk); knowPref(x, c2, k2); npcSay(L(`${short(x)} ${prefName(c2, k2).toLocaleLowerCase('tr')} için her şeyini verir, biliyor muydun?`, `${short(x)} would give anything for ${prefName(c2, k2).toLowerCase()}, did you know?`)); sysSay(`${prefIcon(c2, k2)} ${L('Öğrendin', 'Learned')}: ${esc(x.name)} — ${esc(prefName(c2, k2))} ♥`, 'learn'); }
    else npcSay(L('Bugünlerde pek bir şey duymadım.', 'I have not heard much of late.'));
  } else if (k === 'liege') {
    const lo = opinion(l, p);
    npcSay(lo > 30 ? L(`${short(l)} seni çok övüyor. Gözdesisin, bunu bil.`, `${short(l)} praises you often. You are in favour, know that.`) : lo < -10 ? L(`${short(l)} senden pek hoşnut değil. Sırtını kollasan iyi olur.`, `${short(l)} is not pleased with you. Best watch your back.`) : L(`${short(l)} seni pek anmıyor. Ne iyi ne kötü.`, `${short(l)} rarely mentions you. Neither good nor ill.`));
    sysSay(`${L('Efendinin sana bakışı', 'Your liege\'s opinion of you')}: ${opBadgeText(lo)}`, 'learn');
  } else {
    const w = G.wars.length ? pick(G.wars) : null;
    const d = G.log.find(e => e.k === 'death');
    npcSay(w ? L(`${G.titles[w.a].name} ile ${G.titles[w.b].name} arasındaki savaş her şeyi değiştirebilir.`, `The war between the ${G.titles[w.a].name} and the ${G.titles[w.b].name} could change everything.`) : d ? L(`Duydun mu? ${d.m.replace(/<[^>]+>/g, '')}`, `Did you hear? ${d.m.replace(/<[^>]+>/g, '')}`) : L('Dünya bugünlerde sakin. Fazla sakin.', 'The world is quiet these days. Too quiet.'));
  }
}

/* --- İltifatlar --- */
function complimentOptions(p, t) {
  const kinds = [['guzellik', '🌹', L('Güzelliğine', 'Their looks')], ['akil', '📚', L('Aklına', 'Their wisdom')], ['cesaret', '⚔️', L('Cesaretine', 'Their valour')], ['takva', '🙏', L('Takvasına', 'Their piety')], ['comertlik', '🎁', L('Cömertliğine', 'Their generosity')], ['soy', '👑', L('Soyuna ve hanedanına', 'Their lineage')]];
  return kinds.map(([k, i, l]) => ({ i, l, dis: DLG.used['c_' + k] ? L('Söyledin', 'Said') : null, f: () => dStep(1, () => compliment(p, t, k)) }));
}
function compliment(p, t, k) {
  DLG.used['c_' + k] = 1; DLG.used.comp = (DLG.used.comp || 0) + 1;
  const lines = {
    guzellik: T2('Bu sarayda senden güzel bir yüz görmedim.', 'I have seen no fairer face at this court.'),
    akil: T2('Senin aklın bu krallığın en keskin kılıcı.', 'Your mind is the sharpest blade in this realm.'),
    cesaret: T2('Savaş meydanındaki cesaretin dillere destan.', 'Your courage on the field is the stuff of songs.'),
    takva: T2('İmanının sağlamlığı hepimize örnek.', 'The strength of your faith is an example to us all.'),
    comertlik: T2('Senin kadar cömert bir yüreğe rastlamadım.', 'I have never met a heart as generous as yours.'),
    soy: T2('Hanedanının şanı her yerde anılıyor.', 'The glory of your house is spoken of everywhere.'),
  };
  meSay(fill(lines[k]));
  let v = 3;
  const fit = { guzellik: has(t, 'guzel') ? 8 : has(t, 'cirkin') ? -6 : 2, akil: has(t, 'dahi') ? 8 : has(t, 'aptal') ? 6 : has(t, 'kurnaz') ? 4 : 2, cesaret: has(t, 'cesur') ? 8 : has(t, 'guclu') ? 5 : has(t, 'korkak') ? -5 : 2,
    takva: has(t, 'dindar') ? 9 : (has(t, 'sehvetli') || has(t, 'ayyas')) ? -3 : 1, comertlik: has(t, 'comert') ? 8 : has(t, 'acgozlu') ? 1 : 3, soy: t.bastard ? -10 : has(t, 'kibirli') ? 8 : t.rank >= 4 ? 5 : 2 }[k];
  v = fit;
  if (has(t, 'kibirli')) v += 3;
  if ((has(t, 'durust') || has(t, 'alcakgonullu')) && v > 0) v = Math.round(v * 0.5);
  if (DLG.used.comp >= 2) v = Math.round(v * 0.6);
  v += Math.floor((stat(p, 'cek') - 5) / 3);
  const vv = { a: addrOf(t, p) };
  if (v < 0) npcSay(pickLine(COMPLIMENT.offended, vv));
  else if ((has(t, 'durust') || has(t, 'alcakgonullu') || has(t, 'paranoyak')) && chance(0.6)) npcSay(pickLine(COMPLIMENT.wary, vv));
  else if (has(t, 'kibirli')) npcSay(pickLine(COMPLIMENT.proud, vv));
  else npcSay(pickLine(COMPLIMENT.pleased, vv));
  addOp(t, p, v);
  if (v > 4) remember(t, p, 'iltifat', 5);
  // Evliyle güzelliğine iltifat: eşinin kulağına gidebilir
  if (k === 'guzellik' && t.spouseId && t.female !== p.female && ch(t.spouseId)) addRumor(p, t, ch(t.spouseId), 'flort', -0.1);
}

/* --- Flört --- */
function flirtChance(p, t) { return pct(seduceChance(p, t) + 10 + (t.lovers.includes(p.id) ? 40 : 0)); }
function flirtOptions(p, t) {
  const o = [];
  if (!t.lovers.includes(p.id)) o.push({ i: '💌', l: L('Gözlerine bakıp iltifat et', 'Hold their gaze and flatter'), h: `%${flirtChance(p, t)}`, dis: DLG.used.flirt ? L('Denedin', 'Tried') : null, f: () => dStep(1, () => flirt(p, t)) });
  const ready = t.lovers.includes(p.id) || DLG.used.flirtOk;
  if (!t.lovers.includes(p.id)) o.push({ i: '🌹', l: L('Gizli bir buluşma teklif et', 'Propose a secret tryst'), h: `%${seduceChance(p, t) + (DLG.used.flirtOk ? 15 : 0)}`, dis: !ready ? L('Önce flört etmelisin', 'Flirt first') : DLG.used.tryst ? L('Denedin', 'Tried') : null, f: () => dStep(1, () => tryst(p, t)) });
  { const br = bedReq(p, t), noTime = L('Bu ay vaktin kalmadı', 'No time left this month');
    o.push({ i: '🌙', l: L('Odana davet et (mahrem gece)', 'Invite them to your chambers'), h: `%${bedChance(p, t)} · 1⚡`, dis: br || null, f: () => { const id = t.id; endDialogue(); openIntimacy(id); } }); }
  if (isAdult(p) && !p.spouseId && !t.spouseId && !closeKin(p, t)) o.push({ i: '💍', l: L('Evlenme teklif et', 'Propose marriage'), h: `%${marryChance(p, t)}`, dis: DLG.used.marry ? L('Teklif ettin', 'Proposed') : null, f: () => dStep(1, () => propose(p, t)) });
  return o;
}
function flirt(p, t) {
  DLG.used.flirt = 1;
  meSay(pickLine([T2('Sana bakınca nefesim kesiliyor, biliyor musun?', 'Do you know you take my breath away?'), T2('Bu akşam ay bile seni kıskanıyor.', 'Even the moon is jealous of you tonight.'), T2('Gözlerin bir ozanı deli edecek kadar güzel.', 'Your eyes could drive a poet mad.')], {}));
  const v = { a: addrOf(t, p) };
  if (chance(flirtChance(p, t) / 100)) { npcSay(pickLine(FLIRT_OK, v)); addOp(t, p, 6); DLG.used.flirtOk = 1; if (t.spouseId && ch(t.spouseId)) addRumor(p, t, ch(t.spouseId), 'flort', -0.15); }
  else {
    npcSay(pickLine(FLIRT_FAIL, v)); addOp(t, p, -6);
    const sp = ch(t.spouseId);
    if (sp && sp.alive && (has(t, 'durust') || has(t, 'iffetli'))) addRumor(p, t, sp, 'flort', 0.35);
  }
}
function tryst(p, t) {
  DLG.used.tryst = 1;
  meSay(L('Bu gece, doğu kulesinde. Yalnız gel.', 'Tonight, in the east tower. Come alone.'));
  if (chance((seduceChance(p, t) + (DLG.used.flirtOk ? 15 : 0)) / 100)) {
    npcSay(L('Orada olacağım...', 'I will be there...'));
    becomeLovers(p, t);
    const s = traitStress(p, { iffetli: 15, sehvetli: -10 });
    sysSay(L(`🌹 ${esc(t.name)} artık sevgilin.`, `🌹 ${esc(t.name)} is now your lover.`) + (p.spouseId || t.spouseId ? L(' (Yasak bir ilişki — bir sır.)', ' (A forbidden affair — a secret.)') : '') + stressNote(s), 'good');
  } else {
    npcSay(L('Ne sandın beni? Git buradan.', 'What do you take me for? Get out.'));
    addOp(t, p, -12);
    const sp = ch(t.spouseId);
    if (sp && sp.alive) addRumor(p, t, sp, 'flort', 0.4);
  }
}
function propose(p, t) {
  DLG.used.marry = 1;
  meSay(L('Benimle evlenir misin? Hanedanlarımız birleşsin.', 'Will you marry me? Let our houses be joined.'));
  if (chance(marryChance(p, t) / 100)) {
    npcSay(L('Evet... evet! Kabul ediyorum!', 'Yes... yes! I accept!'));
    marry(p, t); p.prestige += 10 + t.rank * 10;
    sysSay(L(`💍 ${esc(nm(t))} ile evlendin!`, `💍 You married ${esc(nm(t))}!`), 'good');
  } else { npcSay(L('Üzgünüm. Bu olamaz.', 'I am sorry. It cannot be.')); addOp(t, p, -4); }
}

/* --- Ricalar ve teklifler --- */
function requestOptions(p, t) {
  const o = [], u = DLG.used, op = opinion(t, p);
  const debt = (p.debts || []).find(d => d.to === t.id);
  if (debt) o.push({ i: '💰', l: L(`Borcunu öde (${debt.amt}💰)`, `Repay your debt (${debt.amt}💰)`), dis: p.gold < debt.amt ? L('Yeterli altın yok', 'Not enough gold') : null, f: () => dStep(0, () => repayDebt(p, t, debt)) });
  else if (isAdult(t)) o.push({ i: '💰', l: L('Borç para iste', 'Ask for a loan'), h: `${loanAmt(t)}💰 · %${pct((op - 10) * 1.2 + (has(t, 'comert') ? 25 : 0) - (has(t, 'acgozlu') ? 25 : 0))}`, dis: u.loan ? L('İstedin', 'Asked') : t.gold < 40 ? L('Parası yok', 'They are poor') : null, f: () => dStep(1, () => askLoan(p, t)) });
  if (!bond(t, p) && isAdult(t)) o.push({ i: '🤝', l: L('Dostluk teklif et', 'Offer friendship'), h: `%${friendChance(p, t)}`, dis: u.friend ? L('Teklif ettin', 'Offered') : op < 30 ? L('Henüz yeterince yakın değilsiniz (30+)', 'Not close enough yet (30+)') : null, f: () => dStep(1, () => offerFriend(p, t)) });
  if (bond(t, p) === 'dost') o.push({ i: '🤐', l: L('Sırdaşım ol', 'Be my confidant'), h: L('Sırlarını seninle paylaşır', 'They will share secrets with you'), dis: u.friend ? L('Teklif ettin', 'Offered') : op < 70 ? L('70+ ilişki gerekli', 'Requires 70+ opinion') : null, f: () => dStep(1, () => { u.friend = 1; meSay(L('Sana her şeyimi anlatabilirim. Sen de bana?', 'I could tell you everything. Would you do the same?')); if (chance(0.6)) { setBond(t, p, 'sirdas'); npcSay(L('Ömrümün sonuna kadar.', 'Until the end of my days.')); sysSay(L('🤐 Artık sırdaşsınız.', '🤐 You are now confidants.'), 'good'); } else npcSay(L('Herkesin kendine sakladığı şeyler vardır.', 'Everyone keeps something for themselves.')); }) });
  if (t.rank <= 2 && !t.titles.length && t.lordId !== p.id && p.rank >= 2 && isAdult(t)) o.push({ i: '🛡️', l: L('Hizmetime gir', 'Enter my service'), h: `%${joinChance(p, t)}` + (t.rank === 2 ? L(' · adamlarıyla gelir', ' · brings their men') : ''), dis: u.join ? L('İstedin', 'Asked') : null, f: () => dStep(1, () => askJoin(p, t)) });
  if (coupEligible(p) && t.sup !== p.id && realmOf(t) === realmOf(p) && t.id !== (coupTarget(p) || {}).id && isAdult(t)) o.push({ i: '👑', l: L('Taç için beni destekle', 'Back my claim to the throne'), h: `%${supportChance(p, t)} · ${L('gizli', 'secret')}`, dis: u.sup ? L('İstedin', 'Asked') : null, f: () => dStep(1, () => askSupport(p, t)) });
  if (t.sup === p.id) o.push({ i: '👑', l: L('Destekçin', 'Your supporter'), h: L('Darbe için hazır bekliyor', 'Ready for the coup'), dis: '✓' });
  const rp = ownRealm(p), rt = ownRealm(t);
  if (rp && rt && rp !== rt) {
    if (!allied(rp, rt) && !atWarRealms(rp, rt)) o.push({ i: '🛡', l: L('Savunma paktı öner', 'Propose a defensive pact'), h: `%${pactChance(p, t)}`, dis: u.pact ? L('Önerdin', 'Proposed') : null, f: () => dStep(1, () => proposePact(p, t)) });
    if (allied(rp, rt)) o.push({ i: '💔', l: L('Paktı boz', 'Break the pact'), h: L('Şan -30, onun görüşü -40', 'Prestige -30, their opinion -40'), f: () => dStep(1, () => { breakPact(rp, rt); p.prestige -= 30; addOp(t, p, -40); remember(t, p, 'ihanet', -20); meSay(L('Aramızdaki pakt sona erdi.', 'The pact between us is ended.')); npcSay(L('Bu ihaneti unutmayacağım.', 'I shall not forget this betrayal.')); }) });
    if (atWarRealms(rp, rt)) o.push({ i: '🕊️', l: L('Barış teklif et', 'Offer peace'), h: `%${ACTION_MAP.baris.chance(p, t)}`, dis: u.peace ? L('Teklif ettin', 'Offered') : null, f: () => dStep(1, () => { u.peace = 1; meSay(L('Bu kan dökülmesi yeter. Barış yapalım.', 'Enough bloodshed. Let us make peace.')); if (chance(ACTION_MAP.baris.chance(p, t) / 100)) { makePeace(rp, rt); npcSay(L('Kabul. Kılıçlar kınına.', 'Agreed. Swords to their sheaths.')); } else npcSay(L('Savaş bitmedi!', 'This war is not over!')); }) });
  }
  if (t.id === p.lordId) o.push({ i: '⬆️', l: promoLabel(p), h: promoTarget(p, t) === null ? L('Boş unvan yok', 'No spare title') : `%${promoChance(p, t)}`, dis: u.promo ? L('İstedin', 'Asked') : promoTarget(p, t) == null ? L('Uygun değil', 'Not possible') : null, f: () => dStep(1, () => { u.promo = 1; meSay(L('Size yıllardır sadakatle hizmet ediyorum. Bir lütuf istiyorum.', 'I have served you loyally for years. I ask a boon.')); const r = ACTION_MAP.terfi.run(p, t); sysSay(r, 'good'); }) });
  return o;
}
function loanAmt(t) { return clamp(Math.round(t.gold * 0.3 / 10) * 10, 20, 150); }
function askLoan(p, t) {
  DLG.used.loan = 1;
  const amt = loanAmt(t);
  meSay(L(`Zor günlerden geçiyorum. ${amt} altın borç verebilir misin? Bir yıl içinde öderim.`, `I am going through hard times. Could you lend me ${amt} gold? I will repay within a year.`));
  if (chance(pct((opinion(t, p) - 10) * 1.2 + (has(t, 'comert') ? 25 : 0) - (has(t, 'acgozlu') ? 25 : 0)) / 100)) {
    t.gold -= amt; p.gold += amt;
    p.debts = p.debts || []; p.debts.push({ to: t.id, amt: Math.round(amt * (has(t, 'acgozlu') ? 1.3 : 1.1)), due: monthIndex() + 12 });
    npcSay(L(`Al. Ama sözünü tut, ${addrOf(t, p)}.`, `Take it. But keep your word, ${addrOf(t, p)}.`));
    sysSay(L(`+${amt}💰 · 12 ay içinde geri ödenecek`, `+${amt}💰 · repay within 12 months`), 'good');
  } else { npcSay(L('Kusura bakma, hazinem bunu kaldırmaz.', 'Forgive me, my coffers cannot bear it.')); addOp(t, p, -1); }
}
function repayDebt(p, t, d) {
  p.gold -= d.amt; t.gold += d.amt;
  p.debts = p.debts.filter(x => x !== d);
  meSay(L('Borcumu getirdim. Kuruşu kuruşuna.', 'I have brought what I owe. Every coin.'));
  npcSay(L('Sözünün eri olduğunu biliyordum.', 'I knew you were a person of your word.'));
  addOp(t, p, 8); remember(t, p, 'soz', 10);
}
function friendChance(p, t) { return pct(20 + (opinion(t, p) - 30) * 1.2 + sharedHobbies(p, t).length * 12 + (stat(p, 'cek') - 5) * 3 - (has(t, 'paranoyak') ? 20 : 0)); }
function offerFriend(p, t) {
  DLG.used.friend = 1;
  meSay(L('Seninle dost olmak isterim. Sözüm sözdür.', 'I would be your friend. You have my word.'));
  if (chance(friendChance(p, t) / 100)) { setBond(t, p, 'dost'); npcSay(L('Ben de bunu umuyordum, dostum.', 'I was hoping you would say that, friend.')); sysSay(L(`🤝 ${esc(t.name)} artık dostun.`, `🤝 ${esc(t.name)} is now your friend.`), 'good'); }
  else { npcSay(L('Dostluk zamanla kazanılır, sözle değil.', 'Friendship is earned with time, not words.')); }
}
function joinChance(p, t) { const l = ch(t.lordId); return pct(30 + opinion(t, p) / 2 + (p.rank - (l ? l.rank : 0)) * 12 + (l ? -opinion(t, l) / 3 : 20) + p.prestige / 30); }
function askJoin(p, t) {
  DLG.used.join = 1;
  meSay(L('Sancağımın altına gel. Benimle şan ve ganimet kazanırsın.', 'Come under my banner. With me you will win glory and spoils.'));
  if (chance(joinChance(p, t) / 100)) {
    const old = ch(t.lordId); if (old) addOp(old, p, -8);
    t.lordId = p.id;
    npcSay(L('Kılıcım artık senin hizmetinde.', 'My sword is yours to command.'));
    const pt = playerParty();
    if (pt && t.rank === 2) { const add = troopMix(t.cul, rnd(6, 12)); for (const k in add) pt.troops[k] = (pt.troops[k] || 0) + add[k]; sysSay(L(`🛡️ ${esc(t.name)} adamlarıyla katıldı: ${lossText(add)}`, `🛡️ ${esc(t.name)} joined with their men: ${lossText(add)}`), 'good'); }
    else sysSay(L(`🛡️ ${esc(t.name)} artık sarayında.`, `🛡️ ${esc(t.name)} is now at your court.`), 'good');
  } else npcSay(L('Şimdiki efendime sadakat borçluyum.', 'I owe loyalty to my present lord.'));
}
function supportChance(p, t) { const k = coupTarget(p); return pct(10 + opinion(t, p) / 1.5 - (k ? opinion(t, k) / 2 : 0) + (has(t, 'hirsli') ? 15 : 0) + (has(t, 'durust') ? -15 : 0) + (bond(t, p) ? 15 : 0) + (stat(p, 'ent') - 5) * 2); }
function askSupport(p, t) {
  DLG.used.sup = 1;
  const k = coupTarget(p);
  meSay(L(`${short(k)} bu tahta layık değil. Zamanı geldiğinde yanımda olur musun?`, `${short(k)} is unworthy of the throne. When the time comes, will you stand with me?`));
  if (chance(supportChance(p, t) / 100)) { t.sup = p.id; npcSay(L('Kılıcım ve adamlarım seninle. Ama bu konuşma hiç olmadı.', 'My sword and my men are yours. But this conversation never happened.')); sysSay(L(`👑 ${esc(t.name)} darbe için destekçin oldu.`, `👑 ${esc(t.name)} will back your coup.`), 'good'); const ex = G.secrets.find(s => s.type === 'komplo' && s.actor === p.id && s.target === k.id && !s.pub); if (ex) learn(t, ex); else addSecret('komplo', p.id, k.id, [p.id, t.id]); }
  else {
    npcSay(L('Bunu duymadım. Ve sen de söylemedin.', 'I did not hear that. And you did not say it.'));
    if (opinion(t, k) > 30 && chance(0.35)) { addOp(k, p, -40); sysSay(L(`⚠️ ${esc(t.name)}, hükümdara niyetini fısıldadı!`, `⚠️ ${esc(t.name)} whispered your intentions to the ruler!`), 'bad'); }
  }
}
function pactChance(p, t) { return pct(15 + opinion(t, p) / 1.5 + (charPower(p) / Math.max(1, charPower(t))) * 15 + (stat(p, 'dip') - 5) * 4 - alliesOf(ownRealm(t)).length * 10); }
function proposePact(p, t) {
  DLG.used.pact = 1;
  meSay(L('Biri bize saldırırsa birlikte karşı koyalım. Bir savunma paktı.', 'If anyone attacks one of us, we face them together. A defensive pact.'));
  if (chance(pactChance(p, t) / 100)) { addPact(ownRealm(p), ownRealm(t)); npcSay(L('Kabul. Sancaklarımız birlikte dalgalanacak.', 'Agreed. Our banners shall fly together.')); sysSay(L(`🛡 ${esc(ownRealm(t).name)} ile savunma paktı imzalandı.`, `🛡 Defensive pact signed with the ${esc(ownRealm(t).name)}.`), 'good'); }
  else npcSay(L('Henüz sana o kadar güvenmiyorum.', 'I do not trust you that much yet.'));
}

/* --- Sertleş --- */
function hostileOptions(p, t) {
  const o = [], u = DLG.used;
  o.push({ i: '😠', l: L('Hakaret et', 'Insult them'), h: L('Görüş düşer; cesurlar düelloya çağırır', 'Opinion drops; the brave will challenge you'), dis: u.insult ? L('Yaptın', 'Done') : null, f: () => dStep(1, () => insult(p, t)) });
  const th = ACTION_MAP.tehdit;
  if (th.show(p, t)) o.push({ i: '😠', l: L('Gözdağı ver, haraç kes', 'Intimidate and extort'), h: `%${th.chance(p, t)}`, dis: u.threat ? L('Yaptın', 'Done') : null, f: () => dStep(1, () => { u.threat = 1; meSay(L('Keseni aç. Yoksa bu gece uyuyamazsın.', 'Open your purse. Or you will not sleep tonight.')); npcSay(th.run(p, t)); }) });
  if (knownSecretsOf(p, t).length) {
    const sa = ACTION_MAP.santaj;
    o.push({ i: '🐍', l: L('Sırrını bildiğini ima et (şantaj)', 'Hint you know their secret (blackmail)'), h: `%${sa.chance(p, t)}`, dis: u.black ? L('Yaptın', 'Done') : null, f: () => dStep(1, () => { u.black = 1; const s = knownSecretsOf(p, t)[0]; meSay(L(`"${SECRETS[s.type].ad}"... Bunu başkalarının duymasını istemezsin, değil mi?`, `"${SECRETS[s.type].ad}"... You would not want others to hear of this, would you?`)); npcSay(sa.run(p, t)); }) });
  }
  o.push({ i: '🤺', l: L('Düelloya davet et', 'Challenge to a duel'), h: `%${duelChance(p, t)}`, dis: !isAdult(t) || !isAdult(p) || p.health < 30 || t.health < 30 ? L('Uygun değil', 'Not possible') : null, f: () => { DLG.used.duel = 1; const id = t.id; DLG.ended = true; endDialogue(); doAction('duello', id); } });
  return o;
}
function insult(p, t) {
  DLG.used.insult = 1;
  meSay(pickLine([T2('Senin gibi bir soytarıyla aynı sofrada oturmak bana utanç veriyor.', 'Sitting at the same table as a buffoon like you shames me.'), T2('Annenin seni doğurduğu güne lanet olsun.', 'Cursed be the day your mother bore you.'), T2('Kılıcını tutmayı bile bilmiyorsun, korkak.', 'You do not even know how to hold your sword, coward.')], {}));
  addOp(t, p, -20); remember(t, p, 'hakaret', -15);
  const s = traitStress(p, { merhametli: 5, kibirli: -5, zalim: -3 });
  if ((has(t, 'cesur') || has(t, 'kibirli') || has(t, 'zalim')) && t.health > 40 && isAdult(t)) {
    npcSay(L('Bu sözlerin bedelini kanla ödeyeceksin. Yarın şafakta, avluda!', 'You will pay for those words in blood. Tomorrow at dawn, in the courtyard!'));
    queueEvent('duelloTeklif', { from: t.id });
    DLG.ended = true;
  } else if (has(t, 'korkak')) { npcSay(L('Ben... ben bir şey demedim ki...', 'I... I did not say anything...')); p.prestige += 3; t.prestige -= 5; }
  else npcSay(L('Bu sözleri unutmayacağım. Asla.', 'I will not forget these words. Ever.'));
  if (opinion(t, p) < -50) setBond(t, p, 'rakip');
  if (s) sysSay(stressNote(s).trim());
}

/* ---------- Söylentiler ----------
   r: { id, s: konuşan, l: dinleyen, a: hakkında konuşulan, tone: 1|-1|-2|'sir'|'flort', told, heard:[], mi } */
function addRumor(s, l, a, tone, extra = 0) {
  if (!s || !l || !a || a.id === s.id) return;
  G.rumors = G.rumors || [];
  G.rumors.push({ id: G.nextRumor = (G.nextRumor || 1) + 1, s: s.id, l: l.id, a: a.id, tone, told: false, heard: [], mi: monthIndex(), x: extra });
  if (G.rumors.length > 160) G.rumors = G.rumors.slice(-160);
}
const RUMOR_EFFECT = { 1: ['ovgu', 10], '-1': ['kotuleme', -18], '-2': ['kotuleme', -28], sir: ['sirIfsa', -35], flort: ['flort', -25] };
MEM_LABELS.flort = BL('Eşiyle flört ettin', 'You flirted with their spouse');
function rumorTick() {
  const p = P(), now = monthIndex();
  for (const r of G.rumors || []) {
    if (r.told) continue;
    const L_ = ch(r.l), S = ch(r.a), Sp = ch(r.s);
    if (!L_ || !S || !Sp || !L_.alive || !S.alive || !Sp.alive) { r.told = true; continue; }
    let pr = r.tone === 1 ? 0.14 : 0.07;
    if (closeTo(L_, S)) pr += 0.22;
    if (opinion(L_, Sp) < 0) pr += 0.12;
    if (opinion(L_, Sp) > 50) pr -= 0.08;
    if (has(L_, 'kurnaz')) pr += 0.05;
    if (r.tone === -2 || r.tone === 'sir') pr += 0.08;
    if (r.tone === 'flort' && familyRel(S, L_) === 'es') pr = 0.1;
    if (S.id === p.id) pr += councilBonus('casus') * 0.01;
    pr += r.x || 0;
    // Kulaktan kulağa yayılma
    if (chance(0.15)) {
      const n = nearby(L_).filter(x => x.id !== S.id && x.id !== Sp.id && !(r.heard || []).includes(x.id));
      if (n.length) {
        const h = pick(n); (r.heard = r.heard || []).push(h.id);
        if (r.tone === 1) addOp(h, S, 3); else if (r.tone !== 'flort') addOp(h, S, -4);
        if (closeTo(h, S) && r.tone !== 1) addOp(h, Sp, -6);
      }
    }
    if (!chance(clamp(pr, 0.02, 0.6))) { if (now - r.mi > 24) r.told = true; continue; }
    r.told = true;
    const [mt, mv] = RUMOR_EFFECT[r.tone] || ['kotuleme', -15];
    remember(S, Sp, mt, mv);
    if (S.id === p.id && Sp.id !== p.id) queueEvent('soylenti', { rid: r.id });
    else if (Sp.id === p.id) {
      log(r.tone === 1 ? L(`🗨️ ${nm(L_)}, ${nm(S)}'e onu övdüğünü anlattı.`, `🗨️ ${nm(L_)} told ${nm(S)} that you praised them.`) : r.tone === 'flort' ? L(`🗨️ ${nm(S)}, eşiyle flört ettiğini öğrendi!`, `🗨️ ${nm(S)} learned that you flirted with their spouse!`) : L(`🗨️ ${nm(L_)}, ${nm(S)}'e arkasından konuştuğunu anlattı!`, `🗨️ ${nm(L_)} told ${nm(S)} that you spoke behind their back!`), r.tone === 1 ? 'good' : 'bad');
      if (r.tone !== 1 && (has(S, 'cesur') || has(S, 'kibirli') || has(S, 'zalim') || opinion(S, p) < -40) && chance(0.55) && free(S) && isAdult(S)) queueEvent('yuzlesme', { from: S.id, via: L_.id, tone: r.tone });
      if (r.tone !== 1 && opinion(S, p) < -60 && !bond(S, p)) setBond(S, p, 'rakip');
    }
  }
  G.rumors = (G.rumors || []).filter(r => !r.told || now - r.mi < 24);
  debtTick();
}
/* NPC'ler de birbirlerini çekiştirir; oyuncu hakkında konuşulanlar söylenti olur */
function npcGossip(c, near, p) {
  const foes = near.filter(x => opinion(c, x) < -25);
  if (!foes.length) return;
  const x = pick(foes);
  const ls = near.filter(l => l.id !== x.id && !closeTo(l, x));
  if (!ls.length) return;
  const l = pick(ls);
  addOp(l, x, -rnd(3, 8) * (opinion(l, c) > 0 ? 1 : 0.4));
  if (x.id === p.id) addRumor(c, l, p, chance(0.2) ? -2 : -1);
  else if (l.id === p.id) { addOp(p, x, -3); if (chance(0.5)) log(L(`🗨️ ${nm(c)} sana ${nm(x)} hakkında dedikodu yaptı.`, `🗨️ ${nm(c)} gossiped to you about ${nm(x)}.`), 'social'); }
  else if (chance(0.3) && (relevant(x) || relevant(l))) addRumor(c, l, x, -1);
}
/* Borçlar */
function debtTick() {
  const p = P();
  if (!p || !p.debts || !p.debts.length) return;
  const now = monthIndex();
  for (const d of p.debts.slice()) {
    const c = ch(d.to);
    if (!c || !c.alive) { p.debts = p.debts.filter(x => x !== d); continue; }
    if (now === d.due - 1) log(L(`💰 ${nm(c)}'e olan ${d.amt} altın borcunun vadesi gelecek ay doluyor.`, `💰 Your debt of ${d.amt} gold to ${nm(c)} falls due next month.`), 'info');
    if (now >= d.due && !d.late) {
      d.late = true;
      addOp(c, p, -25); remember(c, p, 'sozBozma', -20);
      for (const x of nearby(c).slice(0, 3)) addRumor(c, x, p, -1);
      log(L(`💸 ${nm(c)}'e olan borcunu ödemedin. Herkese anlatıyor!`, `💸 You failed to repay ${nm(c)}. They are telling everyone!`), 'bad');
    }
  }
}

/* ---------- Söylenti olayları ---------- */
Object.assign(EVENTS, {
  soylenti: {
    baslik: () => L('🗨️ Kulağına çalınan sözler', '🗨️ Words that reached your ear'),
    valid: (p, d) => { const r = (G.rumors || []).find(x => x.id === d.rid); return r && ch(r.s) && ch(r.s).alive && ch(r.l) && ch(r.l).alive; },
    metin: (p, d) => {
      const r = G.rumors.find(x => x.id === d.rid), sp = ch(r.s), l = ch(r.l);
      return r.tone === 1 ? L(`<b>${nm(l)}</b> sana gülümseyerek anlattı: "${short(sp)} senden övgüyle bahsetti. Bir dostun var demek."`, `<b>${nm(l)}</b> told you with a smile: "${short(sp)} spoke of you with praise. You have a friend, it seems."`)
        : r.tone === 'sir' ? L(`<b>${nm(l)}</b> seni kenara çekti: "${short(sp)} senin bir sırrını bana anlattı. Dikkatli ol."`, `<b>${nm(l)}</b> took you aside: "${short(sp)} told me one of your secrets. Be careful."`)
          : L(`<b>${nm(l)}</b> fısıldadı: "${short(sp)} senin hakkında ${r.tone === -2 ? 'utanmazca yalanlar' : 'kötü sözler'} söyledi. Sana bunu bilmen gerektiğini düşündüm."`, `<b>${nm(l)}</b> whispered: "${short(sp)} has been saying ${r.tone === -2 ? 'shameless lies' : 'ugly things'} about you. I thought you should know."`);
    },
    secenekler: (p, d) => {
      const r = G.rumors.find(x => x.id === d.rid), sp = ch(r.s), l = ch(r.l);
      if (r.tone === 1) return [
        { t: L('Teşekkür mektubu gönder', 'Send a letter of thanks'), f: () => { addOp(sp, p, 10); addOp(p, sp, 10); remember(sp, p, 'iltifat', 6); return L(`${sp.name} mektubunu okuyunca gülümsedi. (+10 ilişki)`, `${sp.name} smiled reading your letter. (+10 opinion)`); } },
        { t: L('Sadece not al', 'Simply take note'), f: () => { addOp(p, sp, 8); return ''; } },
      ];
      return [
        { t: L(`${short(sp)} ile yüzleş`, `Confront ${short(sp)}`), f: () => { addOp(sp, p, -10); if (chance(0.5)) { sp.prestige -= 10; return L(`Herkesin önünde ${sp.name}'i sorguya çektin. Kekeleyip kızardı. (Onun şanı -10)`, `You confronted ${sp.name} before everyone. They stammered and blushed. (Their prestige -10)`); } addOp(p, sp, -10); return L(`${sp.name} her şeyi inkâr etti ve seni yalancılıkla suçladı.`, `${sp.name} denied everything and called you a liar.`); } },
        { t: L('Aynı silahla karşılık ver (iftira)', 'Answer in kind (slander)'), f: () => { const res = slander(p, sp); addOp(sp, p, -15); return res.ok ? L(`Sen de ${sp.name} hakkında söylenti yaydın. Şimdi o da çamurun içinde.`, `You spread rumours about ${sp.name} in turn. Now they too are in the mud.`) : L('Karşı saldırın geri tepti.', 'Your counter-attack backfired.'); } },
        { t: L(`${short(l)}'e teşekkür et`, `Thank ${short(l)}`), f: () => { addOp(l, p, 8); addOp(p, l, 8); addOp(p, sp, -15); return L(`${l.name} ile aranızda bir güven bağı oluştu.`, `A bond of trust grew between you and ${l.name}.`); } },
        { t: L('Görmezden gel', 'Ignore it'), f: () => { const s = traitStress(p, { kibirli: 10, alcakgonullu: -5 }); addOp(p, sp, -10); return L('Köpekler havlar, kervan yürür.', 'The dogs bark; the caravan moves on.') + stressNote(s); } },
      ];
    },
  },
  yuzlesme: {
    baslik: () => L('😠 Yüzleşme', '😠 A confrontation'),
    valid: (p, d) => free(ch(d.from)) && free(p),
    metin: (p, d) => { const c = ch(d.from), v = ch(d.via); return L(`<b>${nm(c)}</b> sarayın ortasında yolunu kesti. Herkes susup izliyor.<br><br>"${v ? short(v) + ' bana her şeyi anlattı.' : 'Duydum.'} Arkamdan konuşmuşsun. Yüzüme söyleyecek cesaretin var mı?"`, `<b>${nm(c)}</b> blocks your way in the middle of the court. Everyone falls silent to watch.<br><br>"${v ? short(v) + ' told me everything.' : 'I heard.'} You spoke behind my back. Do you have the courage to say it to my face?"`); },
    secenekler: (p, d) => {
      const c = ch(d.from), v = ch(d.via);
      const denyC = pct(30 + (stat(p, 'ent') - stat(c, 'ent')) * 6 + (v ? opinion(c, v) < 0 ? 20 : -10 : 0));
      return [
        { t: L(`İnkâr et (%${denyC})`, `Deny it (${denyC}%)`), f: () => { if (chance(denyC / 100)) { addOp(c, p, 15); if (v) { addOp(c, v, -20); addOp(v, p, -10); } return L(`${c.name} sana inandı. Öfkesi artık ${v ? v.name : 'dedikoducuya'} yönelik.`, `${c.name} believed you. Their anger now turns on ${v ? v.name : 'the gossip'}.`); } addOp(c, p, -15); remember(c, p, 'yalan', -15); p.prestige -= 10; return L('Yalanın yüzünden okunuyordu. Kalabalık kıkırdadı. (Şan -10)', 'The lie was written on your face. The crowd sniggered. (Prestige -10)'); } },
        { t: L('Özür dile', 'Apologise'), f: () => { addOp(c, p, 20); remember(c, p, 'ozur', 12); p.prestige -= 8; const s = traitStress(p, { kibirli: 15, alcakgonullu: -5 }); return L(`Başını eğip özür diledin. ${c.name} yumuşadı. (Şan -8)`, `You bowed your head and apologised. ${c.name} softened. (Prestige -8)`) + stressNote(s); } },
        { t: L('Arkasında dur: "Her kelimesi doğru!"', 'Stand by it: "Every word is true!"'), f: () => { setBond(c, p, 'rakip'); addOp(c, p, -20); p.prestige += 8; if ((has(c, 'cesur') || has(c, 'zalim')) && chance(0.6)) queueEvent('duelloTeklif', { from: c.id }); return L(`Sözlerinin arkasında durdun. Artık ${c.name} ile ezeli rakipsiniz. (Şan +8)`, `You stood by your words. You and ${c.name} are now sworn rivals. (Prestige +8)`); } },
        ...(v ? [{ t: L(`Suçu ${short(v)}'e at`, `Blame ${short(v)}`), f: () => { if (chance(0.5)) { addOp(c, v, -25); addOp(c, p, 8); addOp(v, p, -35); setBond(v, p, 'rakip'); return L(`${c.name} öfkesini ${v.name}'e çevirdi. Ama ${v.name} artık senin düşmanın.`, `${c.name} turned their fury on ${v.name}. But ${v.name} is now your enemy.`); } addOp(c, p, -10); addOp(v, p, -30); return L('Kimse inanmadı. Şimdi iki düşmanın var.', 'Nobody believed you. Now you have two enemies.'); } }] : []),
      ];
    },
  },
  fethinOdulu: {
    baslik: () => L('🏰 Fethin ödülü', '🏰 The spoils of conquest'),
    valid: (p, d) => { const s = G.titles[d.sid], l = ch(d.lid); return s && l && free(l) && s.holder === l.id && p.office === 'komutan'; },
    metin: (p, d) => { const s = G.titles[d.sid], l = ch(d.lid); return d.grant ? L(`Hükümdarın <b>${nm(l)}</b> elçisini gönderdi: "Hükümdarımız <b>${s.name}</b> zaferinden çok memnun. Bu kaleyi size tımar olarak bağışlıyor. Artık bir toprak sahibisiniz."`, `Your sovereign <b>${nm(l)}</b> sends an envoy: "Our sovereign is delighted by the victory at <b>${s.name}</b>, and grants it to you as your fief. You are now a landholder."`) : L(`Hükümdarın <b>${nm(l)}</b> elçisini gönderdi: "Hükümdarımız <b>${s.name}</b> zaferinizi kutluyor ve size 60 altın ödül gönderdi. Kale tacın arazisine katıldı."`, `Your sovereign <b>${nm(l)}</b> sends an envoy: "Our sovereign congratulates you on taking <b>${s.name}</b>, and sends you 60 gold. The castle joins the royal demesne."`); },
    secenekler: (p, d) => {
      const s = G.titles[d.sid], l = ch(d.lid);
      if (d.grant) return [
        { t: L('Minnetle kabul et', 'Accept with gratitude'), f: () => { giveTitle(s, p); refreshLieges(); addOp(l, p, 5); G.terrDirty = true; return L(`<b>${s.name}</b> artık senin! Hem komutan hem toprak sahibisin.`, `<b>${s.name}</b> is yours! You are both commander and lord.`); } },
        { t: L('Reddet: "Ben tacın kılıcıyım."', 'Decline: "I am the crown\'s sword."'), f: () => { addOp(l, p, 25); p.prestige += 30; return L('Sadakatin dillere destan oldu. (Şan +30, hükümdar +25)', 'Your loyalty became legend. (Prestige +30, ruler +25)'); } },
      ];
      const askC = pct(25 + opinion(l, p) / 2 + (stat(p, 'dip') - 5) * 4 + p.prestige / 30);
      return [
        { t: L('Ödülü al, teşekkür et (+60💰)', 'Take the reward with thanks (+60💰)'), f: () => { if (l.gold >= 60) { l.gold -= 60; } p.gold += 60; addOp(l, p, 5); return L('Altınları hazinene koydun.', 'You put the gold in your coffers.'); } },
        { t: L(`Kaleyi kendin için talep et (%${askC})`, `Claim the castle for yourself (${askC}%)`), f: () => { if (chance(askC / 100)) { giveTitle(s, p); refreshLieges(); G.terrDirty = true; return L(`Hükümdar biraz düşündükten sonra razı oldu. <b>${s.name}</b> senin!`, `After some thought the ruler agreed. <b>${s.name}</b> is yours!`); } addOp(l, p, -15); return L('Hükümdar yüzünü buruşturdu: "Haddini bil, komutan." (-15 ilişki)', 'The ruler frowned: "Know your place, commander." (-15 opinion)'); } },
        { t: L('Kaleyi zorla tut ve isyan et!', 'Hold the castle by force and rebel!'), f: () => { giveTitle(s, p); p.office = null; const pt = playerParty(); if (pt) pt.royal = false; const r = rebel(p); G.terrDirty = true; return L(`Sancağını surlara diktin ve tacı tanımadığını ilan ettin! <b>${r ? r.name : ''}</b> kuruldu. Ordun artık senin — ama maaşlarını da sen ödeyeceksin.`, `You planted your banner on the walls and renounced the crown! The <b>${r ? r.name : ''}</b> is founded. The army is yours now — and so are its wages.`); } },
      ];
    },
  },
});

/* ---------- Görünüm ---------- */
function moodText(o) {
  return o <= -50 ? [L('Düşmanca', 'Hostile'), 'neg2'] : o < -10 ? [L('Soğuk', 'Cold'), 'neg'] : o < 20 ? [L('Nötr', 'Neutral'), 'neu'] : o < 60 ? [L('Sıcak', 'Warm'), 'pos'] : [L('Candan', 'Devoted'), 'pos2'];
}
function renderDialogue() {
  if (!DLG) return;
  const p = P(), t = dT();
  if (!t) { DLG = null; return closeModal(); }
  const o = opinion(t, p), [mood, mcls] = moodText(o);
  const kp = knownPrefs(t);
  const prefChips = kp.length ? kp.map(([cat, k, v]) => `<span class="pchip ${v > 0 ? 'like' : v < 0 ? 'hate' : ''}">${prefIcon(cat, k)} ${esc(prefName(cat, k))}</span>`).join('') : `<span class="muted small">${L('Henüz zevklerini bilmiyorsun.', 'You do not know their tastes yet.')}</span>`;
  const rel = tagsFor(p, t);
  const opts = DLG.ended ? [] : viewOptions(p, t);
  const title = { small: L('Hal hatır', 'Small talk'), interests: L('İlgi alanları', 'Interests'), gift: L('Hediye', 'Gift'), invite: L('Etkinlik', 'Activity'), people: L('Kimin hakkında?', 'About whom?'), person: DLG.x ? esc(nm(ch(DLG.x))) : '', compliment: L('İltifat', 'Compliment'), flirt: L('Flört', 'Flirt'), request: L('Rica ve teklifler', 'Requests & proposals'), hostile: L('Sertleş', 'Get tough') }[DLG.view] || L('Ne söyleyeceksin?', 'What will you say?');
  const r = realmOf(t);
  const lines = DLG.lines.slice(-16), lastNpc = lines.map(l => l.w).lastIndexOf('npc');
  const logHtml = lines.map((l, i) => {
    if (l.w === 'sys') return `<p class="dsys ${l.c || ''}">${l.h}</p>`;
    if (l.w === 'nar') return `<p class="dnar">${l.h}</p>`;
    const npc = l.w === 'npc', who = npc ? t : p;
    return `<div class="bubrow ${l.w} ${npc && i === lastNpc ? 'fresh' : ''}">${avatar(who, 34, npc ? (l.m ?? o / 100) : 0.3)}<div class="bub ${l.w}"><b>${esc(npc ? who.name : L('Sen', 'You'))}${npc && l.g ? ` <em class="gest">— ${esc(l.g)}</em>` : ''}</b><span>${l.h}</span></div></div>`;
  }).join('');
  showModal(`<div class="dlg">
    <div class="dlg-who">
      <div class="dlg-portrait">${avatar(t, 96, o / 100)}${r ? `<span class="dlg-flag">${flagHtml(r, 18)}</span>` : ''}</div>
      <h2>${esc(nm(t))}</h2><p class="small muted dlg-sub">${esc(titleOf(t))} · ${t.age} ${L('yaş', 'yrs')}</p>
      <div class="tags">${rel}</div>
      <div class="dlg-meter"><span>${L('Sana bakışı', 'Opinion')}</span>${opBadge(o)}<span class="op ${mcls}">${mood}</span></div>
      <div class="dlg-meter"><span>${L('Sabır', 'Patience')}</span><span class="pips">${'<i class="on"></i>'.repeat(Math.max(0, DLG.pat))}${'<i></i>'.repeat(Math.max(0, DLG.max - DLG.pat))}</span></div>
      <div class="chips">${traitChips(t)}</div>
      <h3>${L('Bildiğin zevkleri', 'Known tastes')}</h3><div class="pchips">${prefChips}</div>
    </div>
    <div class="dlg-main">
      <div class="dlg-log">${logHtml}</div>
      <div class="dlg-q">${DLG.ended ? L('Görüşme sona erdi.', 'The audience is over.') : title}</div>
      <div class="dlg-opts">${opts.map((x, i) => `<button class="dopt ${x.back ? 'back' : ''} ${x.tone || ''}" data-d="${i}" ${x.dis ? 'disabled' : ''}><span class="di">${x.i}</span><span class="dl">${esc(x.l)}${x.h || x.dis ? `<small>${esc(x.dis || x.h)}</small>` : ''}</span></button>`).join('')}
        ${DLG.ended ? `<button class="dopt primary" data-end>${L('Ayrıl', 'Leave')}</button>` : `<button class="dopt leave" data-end><span class="di">🚪</span><span class="dl">${L('Veda et', 'Take your leave')}</span></button>`}
      </div>
    </div></div>`, 'dialog');
  const m = $('#modal');
  const lg = m.querySelector('.dlg-log'); if (lg) lg.scrollTop = lg.scrollHeight;
  m.querySelectorAll('[data-d]').forEach(b => b.onclick = () => {
    const x = opts[+b.dataset.d];
    if (!x || x.dis) return;
    if (x.go) { DLG.view = x.go; if (x.go !== 'person') DLG.x = x.go === 'people' ? null : DLG.x; renderDialogue(); }
    else if (x.f) x.f();
  });
  m.querySelectorAll('[data-end]').forEach(b => b.onclick = endDialogue);
  m.querySelector('.backdrop').onclick = null;
  bindTips(m);
}
