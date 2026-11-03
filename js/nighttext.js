'use strict';
/* =====================================================================
   Taç ve Hançer — MAHREM GECE METİNLERİ
   ---------------------------------------------------------------------
   Bu dosyayı dilediğin gibi doldurabilirsin; oyunun kodu burada değil.
   Oyun her gece sonunda uygun listeden RASTGELE bir metin seçer, bu yüzden
   bir listeye ne kadar çok metin yazarsan tekrar o kadar az olur.

   METİN BİÇİMİ (üçü de geçerli):
     'Tek dilli metin'                         → her iki dilde de aynı görünür
     { tr: 'Türkçe metin', en: 'English text' } → dile göre seçilir
     { tr: '...', en: '...', kosul: 'es' }      → yalnızca bu durumda kullanılır

   KOŞULLAR (kosul) — yazmazsan metin her durumda kullanılabilir:
     'es'      : eşinle geçen gece
     'sevgili' : zaten sevgilin olan biriyle
     'ilk'     : o kişiyle ilk gecen
     'akraba'  : yakın akrabanla
     'dom'     : karşındaki hükmetmeyi seven biri
     'sub'     : karşındaki teslim olmayı seven biri
     Birden fazla koşul için dizi yaz: kosul: ['ilk', 'akraba']  (hepsi tutmalı)
   Koşulu tutan metin varsa oyun onları tercih eder.

   DEĞİŞKENLER (metnin içinde kullan, oyun yerine koyar):
     {t}     karşındakinin adı            {tam}  karşındakinin unvanlı tam adı
     {sen}   senin adın                   {rol}  rol oyununun senaryosu
   Satır atlamak için \n, vurgu için <i>…</i> ya da <b>…</b> kullanabilirsin.

   SONUÇ DERECELERİ (her yaklaşım için):
     unutulmaz : en iyi sonuç (boşsa 'iyi' listesi kullanılır)
     iyi       : güzel geçen gece
     orta      : sıradan geçen gece (boşsa 'genel.orta' kullanılır)
     kotu      : kötü geçen gece / sevmediği bir şey
   Bir liste boşsa oyun 'genel' bölümündeki aynı dereceye düşer.

   YAKLAŞIMLAR: sefkat, tutku, hakim, teslim, bag, sert, rol, kostum, yag, teshir
   ===================================================================== */

const NIGHT_TEXTS = {
  sefkat: {
    unutulmaz: [],
    iyi: [{ tr: 'Mum ışığında, acele etmeden… Sabaha dek birbirinize sarılı uyudunuz.', en: 'By candlelight, unhurried… You slept in each other\'s arms until dawn.' }],
    orta: [],
    kotu: [{ tr: 'Nazik olmaya çalıştın ama aranızdaki soğukluk erimedi.', en: 'You tried to be gentle, but the chill between you never thawed.' }],
  },
  tutku: {
    unutulmaz: [],
    iyi: [{ tr: 'Kapı daha kapanmadan dudaklarınız buluştu. Gece uzun, nefes nefese ve unutulmazdı.', en: 'Your lips met before the door had closed. The night was long, breathless, unforgettable.' }],
    orta: [],
    kotu: [{ tr: 'Fazla aceleciydin; {t} geri çekildi.', en: 'You were too hasty; {t} pulled away.' }],
  },
  hakim: {
    unutulmaz: [],
    iyi: [{ tr: 'Sen emrettin, {t} itaat etti — ve bundan aldığı zevki hiç saklamadı.', en: 'You commanded and {t} obeyed — making no secret of enjoying it.' }],
    orta: [],
    kotu: [{ tr: '{t} emir almaktan hoşlanmadı. Gece buz gibi bitti.', en: '{t} did not care to take orders. The night ended cold as ice.' }],
  },
  teslim: {
    unutulmaz: [],
    iyi: [{ tr: 'Bu gece kontrol {t}\'deydi. Kendini bırakmak tuhaf bir özgürlüktü.', en: 'Tonight {t} held control. Letting go was a strange kind of freedom.' }],
    orta: [],
    kotu: [{ tr: '{t} dizginleri almak istemedi; ikiniz de ne yapacağınızı bilemediniz.', en: '{t} did not want the reins; neither of you knew what to do.' }],
  },
  bag: {
    unutulmaz: [],
    iyi: [{ tr: 'İpek kurdeleler, sıkı düğümler ve fısıldanan bir güvenli söz… Güven, en güçlü bağdı.', en: 'Silk ribbons, tight knots and a whispered safe word… Trust was the strongest bond of all.' }],
    orta: [],
    kotu: [{ tr: 'Düğümleri görünce {t}\'in yüzü değişti. "Hayır," dedi, kesin bir sesle. Hemen çözdün.', en: 'Seeing the knots, {t}\'s face changed. "No," they said firmly. You untied them at once.' }],
  },
  sert: {
    unutulmaz: [],
    iyi: [{ tr: 'Acıyla hazzın arasındaki ince çizgide dans ettiniz; ertesi sabah ikiniz de gülümsüyordunuz.', en: 'You danced on the thin line between pain and pleasure; next morning you were both smiling.' }],
    orta: [],
    kotu: [{ tr: '{t} canı yandığında gülmedi, irkildi. Hemen durdunuz ama büyü bozulmuştu.', en: 'When it hurt, {t} did not laugh but flinched. You stopped at once, but the spell was broken.' }],
  },
  rol: {
    unutulmaz: [],
    iyi: [{ tr: 'Bu gece ikiniz de başka biriydiniz — {rol}. Kahkahalar ve fısıltılar sabaha dek sürdü.', en: 'Tonight you were both someone else — {rol}. Laughter and whispers lasted until dawn.' }],
    orta: [],
    kotu: [{ tr: '{t} oyuna giremedi; replikler havada kaldı.', en: '{t} could not get into the game; the lines fell flat.' }],
  },
  kostum: {
    unutulmaz: [],
    iyi: [{ tr: 'Bir maske, ödünç bir pelerin… Tanıdık bir yüzü yeniden keşfetmek ne heyecanlıydı.', en: 'A mask, a borrowed cloak… How thrilling to discover a familiar face anew.' }],
    orta: [],
    kotu: [{ tr: 'Kostümü görünce {t} gülmeye başladı — ama seninle değil, sana.', en: 'Seeing the costume, {t} burst out laughing — not with you, but at you.' }],
  },
  yag: {
    unutulmaz: [],
    iyi: [{ tr: 'Gül ve sandal yağlarının kokusu odayı doldurdu. Her kas gevşedi, her dert unutuldu.', en: 'The scent of rose and sandalwood filled the room. Every muscle loosened, every care forgotten.' }],
    orta: [],
    kotu: [{ tr: 'Yağ fazla, sabır azdı; {t} sıkılıp uykuya daldı.', en: 'Too much oil, too little patience; {t} grew bored and fell asleep.' }],
  },
  teshir: {
    unutulmaz: [],
    iyi: [{ tr: 'Yakalanma korkusu her dokunuşu ateşe verdi. Kalbiniz hâlâ çarpıyor.', en: 'The fear of being caught set every touch aflame. Your hearts are still racing.' }],
    orta: [],
    kotu: [{ tr: '{t} her sesten irkildi; tadını çıkaramadı.', en: '{t} started at every sound and could not enjoy it.' }],
  },

  /* Yaklaşıma özel metin bulunamazsa kullanılan genel metinler */
  genel: {
    unutulmaz: [],
    iyi: [],
    orta: [
      { tr: 'Fena bir gece değildi; ama ikiniz de aklınızda başka şeylerle uykuya daldınız.', en: 'It was not a bad night; but you both fell asleep with other things on your minds.' },
      { tr: '{t} gülümsedi, sen de gülümsedin. Belki bir dahaki sefere daha iyi olur.', en: '{t} smiled, and so did you. Perhaps next time will be better.' },
      { tr: 'Sessiz, biraz çekingen bir gece. Birbirinizi henüz tam tanımıyorsunuz.', en: 'A quiet, somewhat shy night. You do not quite know each other yet.', kosul: 'ilk' },
    ],
    kotu: [],
  },

  /* Davet reddedildiğinde */
  ret: [
    { tr: '{t} elini nazikçe çekti: "Hayır. Bunu unutalım."', en: '{t} gently withdrew their hand: "No. Let us forget this."' },
    { tr: '{t} soğuk bir bakışla kapıyı gösterdi.', en: '{t} pointed at the door with a cold look.' },
  ],

  /* Rol oyunu senaryoları ({rol} değişkeni bunlardan biriyle doldurulur) */
  rol_senaryolari: [
    { tr: 'efendi ile hizmetkâr', en: 'lord and servant' },
    { tr: 'kervancı ile hancı', en: 'caravaneer and innkeeper' },
    { tr: 'şövalye ile hanımefendi', en: 'knight and lady' },
    { tr: 'korsan ile tüccar', en: 'corsair and merchant' },
    { tr: 'yabancı elçi ile saray muhafızı', en: 'foreign envoy and palace guard' },
  ],
};
