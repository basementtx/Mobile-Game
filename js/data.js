'use strict';
/* =========================================================
   TAÇ VE HANÇER — Sabit veriler (isimler, özellikler, sırlar)
   ========================================================= */

const NAMES_M = ['Aldric', 'Bertrand', 'Cedric', 'Doran', 'Edmund', 'Fulk', 'Gerard', 'Hugo', 'Ivo', 'Jocelin',
  'Lothar', 'Merek', 'Odo', 'Percival', 'Ranulf', 'Roland', 'Sigurd', 'Tancred', 'Ulric', 'Walter', 'Godfrey',
  'Baldwin', 'Conrad', 'Leopold', 'Osric', 'Raymond', 'Tristan', 'Gawain', 'Harald', 'Bohemond', 'Anselm', 'Eustace',
  'Gilbert', 'Humbert', 'Reginald', 'Theobald', 'Wulfric', 'Alaric', 'Corwin', 'Darian'];
const NAMES_F = ['Adela', 'Beatrice', 'Cecily', 'Edith', 'Elvira', 'Gisela', 'Helena', 'Isolde', 'Juliana', 'Matilda',
  'Rosamund', 'Sibylla', 'Agnes', 'Blanche', 'Constance', 'Eleanor', 'Hildegard', 'Ingrid', 'Margery', 'Odilia',
  'Petronilla', 'Yolanda', 'Melisende', 'Ermengarde', 'Aveline', 'Clarice', 'Elowen', 'Genevieve', 'Linnea', 'Mirabel'];
const DYNASTIES = ['Varek', 'Dunmore', 'Ashford', 'Kessel', 'Morvane', 'Thorne', 'Blackwood', 'Valcourt', 'Grimwald',
  'Hollis', 'Ravensworth', 'Stroud', 'Delacroix', 'Wyndham', 'Corvin', 'Aldermoor', 'Falkenrath', 'Merrow', 'Osgood',
  'Penrose', 'Rookwood', 'Saltmarsh', 'Tarrant', 'Vance'];

const STATS = { sav: 'Savaş', dip: 'Diplomasi', ent: 'Entrika', yon: 'Yönetim', cek: 'Cazibe' };
const STAT_ICON = { sav: '⚔️', dip: '🕊️', ent: '🗡️', yon: '📜', cek: '🌹' };

const RANKS_M = ['Köylü', 'Asker', 'Şövalye', 'Lord', 'Dük', 'Kral'];
const RANKS_F = ['Köylü', 'Asker', 'Şövalye', 'Leydi', 'Düşes', 'Kraliçe'];
const RANK_ICON = ['🌾', '🛡️', '⚔️', '🏰', '🦁', '👑'];

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/* Kişilik özellikleri (kisilik:true) birbirine zıt çiftler hâlinde gelir.
   st: yeteneklere etkisi. */
const TRAITS = {
  hirsli: { ad: 'Hırslı', kisilik: true, zit: 'kanaatkar', st: { dip: 1, sav: 1, yon: 1 }, d: 'Daha fazlasını ister. Güç ve unvan peşinde koşar.' },
  kanaatkar: { ad: 'Kanaatkâr', kisilik: true, zit: 'hirsli', st: { yon: 1 }, d: 'Elindekiyle yetinir, entrikaya pek bulaşmaz.' },
  kurnaz: { ad: 'Kurnaz', kisilik: true, zit: 'durust', st: { ent: 3, dip: -1 }, d: 'Yalan ve entrika ustası.' },
  durust: { ad: 'Dürüst', kisilik: true, zit: 'kurnaz', st: { dip: 2, ent: -2 }, d: 'Yalandan nefret eder, suçu affetmez.' },
  zalim: { ad: 'Zalim', kisilik: true, zit: 'merhametli', st: { sav: 1, ent: 1, dip: -1 }, d: 'Acı vermekten çekinmez, hatta hoşlanır.' },
  merhametli: { ad: 'Merhametli', kisilik: true, zit: 'zalim', st: { dip: 2, ent: -1 }, d: 'Başkalarının acısını kendi acısı gibi hisseder.' },
  sehvetli: { ad: 'Şehvetli', kisilik: true, zit: 'iffetli', st: { cek: 1, ent: 1 }, d: 'Bedensel zevklere düşkün.' },
  iffetli: { ad: 'İffetli', kisilik: true, zit: 'sehvetli', st: { yon: 1 }, d: 'Tensel arzulara kapalı.' },
  cesur: { ad: 'Cesur', kisilik: true, zit: 'korkak', st: { sav: 2, dip: 1 }, d: 'Tehlikeden kaçmaz, meydan okumayı sever.' },
  korkak: { ad: 'Korkak', kisilik: true, zit: 'cesur', st: { sav: -2, ent: 2 }, d: 'Canını her şeyden üstün tutar.' },
  acgozlu: { ad: 'Açgözlü', kisilik: true, zit: 'comert', st: { yon: 2, dip: -1 }, d: 'Altın için her şeyi yapar.' },
  comert: { ad: 'Cömert', kisilik: true, zit: 'acgozlu', st: { dip: 3, yon: -1 }, d: 'Elindekini paylaşmaktan mutlu olur.' },
  kibirli: { ad: 'Kibirli', kisilik: true, zit: 'alcakgonullu', st: { dip: -1, sav: 1 }, d: 'Herkesten üstün olduğuna inanır.' },
  alcakgonullu: { ad: 'Alçakgönüllü', kisilik: true, zit: 'kibirli', st: { dip: 1 }, d: 'Gösterişten uzak, sevimli biri.' },
  guzel: { ad: 'Güzel', fiziksel: true, zit: 'cirkin', st: { cek: 4 }, d: 'Göz alıcı bir güzelliği var.' },
  cirkin: { ad: 'Çirkin', fiziksel: true, zit: 'guzel', st: { cek: -3 }, d: 'Görünüşü pek iç açıcı değil.' },
  dahi: { ad: 'Dahi', fiziksel: true, zit: 'aptal', st: { dip: 2, ent: 2, yon: 3, sav: 1 }, d: 'Olağanüstü bir zekâ.' },
  aptal: { ad: 'Aptal', fiziksel: true, zit: 'dahi', st: { dip: -2, ent: -3, yon: -3 }, d: 'Pek parlak sayılmaz.' },
  guclu: { ad: 'Güçlü', fiziksel: true, zit: 'zayif', st: { sav: 3, cek: 1 }, d: 'Kaslı ve dayanıklı.' },
  zayif: { ad: 'Zayıf', fiziksel: true, zit: 'guclu', st: { sav: -3 }, d: 'Cılız bir beden.' },
  paranoyak: { ad: 'Paranoyak', st: { ent: 2, dip: -2 }, d: 'Herkesin ona komplo kurduğuna inanır.' },
  ayyas: { ad: 'Ayyaş', st: { yon: -2, cek: -1 }, d: 'Şarap kadehinden başını kaldırmaz.' },
  yarali: { ad: 'Yaralı', st: { sav: -1, cek: -1 }, d: 'Bedeninde derin yara izleri taşıyor.' },
  akrabakatili: { ad: 'Akraba Katili', st: {}, d: 'Kendi kanını döktüğü herkesçe bilinir. Herkes ondan iğrenir.' },
  dindar: { ad: 'Dindar', st: { dip: 1 }, d: 'Tanrı korkusu taşır.' },
};
const PERSONALITY = Object.keys(TRAITS).filter(k => TRAITS[k].kisilik);
const PHYSICAL = Object.keys(TRAITS).filter(k => TRAITS[k].fiziksel);

/* Sırlar: suc:true olanlar, efendinin bilmesi hâlinde hapis sebebidir. */
const SECRETS = {
  zina: { ad: 'Yasak ilişki', shame: 15, suc: false, d: (a, t) => `${a} ile ${t} gizlice birlikte oluyor.` },
  cinayet: { ad: 'Cinayet', shame: 40, suc: true, d: (a, t) => `${t} kazara ölmedi. Onu ${a} öldürttü.` },
  suikastGirisimi: { ad: 'Suikast girişimi', shame: 25, suc: true, d: (a, t) => `${a}, ${t} adlı kişiyi öldürtmeye çalıştı.` },
  zimmet: { ad: 'Zimmet', shame: 15, suc: true, d: (a) => `${a} efendisinin vergilerini zimmetine geçirdi.` },
  rusvet: { ad: 'Rüşvet', shame: 10, suc: true, d: (a) => `${a} tüccarlardan rüşvet alıyor.` },
  pic: { ad: 'Piç çocuk', shame: 20, suc: false, d: (a, t) => `${t} adlı çocuğun annesi ${a}, ama babası annenin kocası değil.` },
  eskiya: { ad: 'Eşkıyalık', shame: 20, suc: true, d: (a) => `${a} geceleri yol kesip yolcuları soyuyor.` },
  iftira: { ad: 'İftira', shame: 10, suc: false, d: (a, t) => `${a}, ${t} hakkında yalan yaydı.` },
};

const PLACES = {
  krallik: 'Valorya Krallığı',
  dukaliklar: [
    ['Kuzgunkale Dükalığı', ['Taşköprü Baronluğu', 'Kurtyuva Baronluğu']],
    ['Altınova Dükalığı', ['Gümüşdere Baronluğu', 'Çamlıbel Baronluğu']],
    ['Karasu Dükalığı', ['Kızılkaya Baronluğu', 'Sisli Vadi Baronluğu']],
  ],
};
