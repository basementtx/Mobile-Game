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

/* Rütbe adları kültüre göre değişir; 5. rütbe (hükümdar) krallığın kendi unvanını kullanır */
const RANKS_M = ['Köylü', 'Asker', 'Şövalye', 'Lord', 'Dük', 'Kral'];
const RANKS_F = ['Köylü', 'Asker', 'Şövalye', 'Leydi', 'Düşes', 'Kraliçe'];
const RANKS_EAST_M = ['Köylü', 'Asker', 'Sipahi', 'Bey', 'Emir', 'Sultan'];
const RANKS_EAST_F = ['Köylü', 'Asker', 'Sipahi', 'Hatun', 'Hatun', 'Sultan'];
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

/* ---------- Kültürler ---------- */
const CULTURES = {
  latin: { ad: 'Latin', east: false, m: NAMES_M, f: NAMES_F, d: DYNASTIES },
  turk: {
    ad: 'Türk', east: true,
    m: ['Alp', 'Arslan', 'Kutalmış', 'Mesud', 'Tuğrul', 'Melikşah', 'Sencer', 'Kaya', 'Yağıbasan', 'Kılıç', 'Gazi', 'Tutuş', 'Süleyman', 'Keyhüsrev', 'Keykubad', 'Rükneddin', 'Nureddin', 'İlyas', 'Tekiş', 'Atsız', 'Çağrı', 'Ertuğrul', 'Savcı', 'Bahadır', 'Toğan', 'Börü', 'İnal', 'Kutluğ', 'Temür', 'Aydoğdu'],
    f: ['Gevher', 'Ayşe', 'Fatma', 'Hatice', 'Terken', 'Selçuk', 'Mahperi', 'Gülruh', 'Aybike', 'Altun', 'Türkan', 'Banu', 'Esma', 'Hüma', 'Saliha', 'Raziye', 'Melike', 'Nilüfer', 'Tomris', 'Ulduz'],
    d: ['Danişmend', 'Saltuk', 'Mengücek', 'Artuk', 'İnaloğlu', 'Çaka', 'Tutak', 'Kaymaz', 'Bozdoğan', 'Karakurt', 'Akkoyun', 'Kayı', 'Bayat', 'Avşar', 'Salur', 'Çepni'],
  },
  arap: {
    ad: 'Arap', east: true,
    m: ['Yusuf', 'Ahmed', 'Ömer', 'Ali', 'Hasan', 'Hüseyin', 'Salih', 'Selahaddin', 'Şirkuh', 'Necmeddin', 'Turanşah', 'Adil', 'Kamil', 'Mansur', 'Zahir', 'Nasır', 'Abdullah', 'İbrahim', 'Halil', 'Musa', 'Tarık', 'Hamza'],
    f: ['Zeyneb', 'Hadice', 'Aişe', 'Fatıma', 'Şemse', 'Rabia', 'Leyla', 'Esma', 'Meryem', 'Safiye', 'Nuriye', 'Sitt-üş-Şam', 'Dünya', 'Cemile'],
    d: ['el-Kurtubi', 'el-Hamdani', 'el-Kindi', 'el-Mısri', 'el-Halebi', 'el-Bağdadi', 'el-Fasi', 'el-Uzri', 'el-Temimi', 'el-Kaysi', 'el-Hilali', 'el-Mahzumi'],
  },
  rum: {
    ad: 'Rum', east: false,
    m: ['Ioannes', 'Manuel', 'Aleksios', 'Andronikos', 'İsaakios', 'Konstantinos', 'Theodoros', 'Mikhael', 'Nikephoros', 'Leon', 'Georgios', 'Basileios', 'Demetrios', 'Stephanos', 'Davit', 'Giorgi'],
    f: ['Theodora', 'İrene', 'Anna', 'Maria', 'Eudokia', 'Zoe', 'Helene', 'Euphrosyne', 'Theophano', 'Kassia', 'Tamar', 'Rusudan'],
    d: ['Doukas', 'Angelos', 'Palaiologos', 'Branas', 'Kantakouzenos', 'Laskaris', 'Vatatzes', 'Kamateros', 'Kontostephanos', 'Gabras', 'Orbeli', 'Mkhargrdzeli'],
  },
  slav: {
    ad: 'Slav', east: false,
    m: ['Vladimir', 'Yaroslav', 'Mstislav', 'Boleslav', 'Rostislav', 'Svyatoslav', 'İgor', 'Vsevolod', 'Kazimir', 'Mieszko', 'Stefan', 'Dragan', 'Borislav', 'Vladislav', 'İvan', 'Petar', 'Kaloyan'],
    f: ['Olga', 'Ludmila', 'Agafya', 'Yevfrosiniya', 'Zbyslava', 'Dobroslava', 'Milica', 'Rada', 'Vera', 'Anastasia', 'Elena'],
    d: ['Olgoviç', 'Monomahoviç', 'Svyatoslaviç', 'Borisoviç', 'Nemanjić', 'Gryfita', 'Awdaniec', 'Toporczyk', 'Kubrat', 'Terter'],
  },
  nordic: {
    ad: 'İskandinav', east: false,
    m: ['Sigurd', 'Harald', 'Olaf', 'Knut', 'Sverre', 'Magnus', 'Erik', 'Sven', 'Valdemar', 'İnge', 'Haakon', 'Birger', 'Ragnvald', 'Ulf'],
    f: ['İngrid', 'Astrid', 'Sigrid', 'Ragnhild', 'Gunhild', 'Helga', 'Kristin', 'Margrete', 'Thora', 'Sofia'],
    d: ['Hvide', 'Bjelbo', 'Gille', 'Folkung', 'Galen', 'Stenkil', 'Hardrada', 'Skjalm', 'Bjarkøy', 'Giske'],
  },
};

/* ---------- Asker tipleri ---------- */
/* str: otomatik savaş gücü; hp/atk/def/spd/range: savaş ekranı değerleri */
const TROOPS = {
  milis: { ad: 'Milis', ikon: '🔱', hp: 30, atk: 5, def: 0, spd: 1.0, range: 0, cost: 8, wage: 1, str: 10, sinif: 'piyade' },
  piyade: { ad: 'Mızraklı Piyade', ikon: '🛡️', hp: 52, atk: 8, def: 3, spd: 0.95, range: 0, cost: 25, wage: 2, str: 20, sinif: 'piyade' },
  okcu: { ad: 'Okçu', ikon: '🏹', hp: 34, atk: 7, def: 1, spd: 1.05, range: 190, cost: 30, wage: 2, str: 17, sinif: 'okcu' },
  atli: { ad: 'Atlı', ikon: '🐎', hp: 70, atk: 11, def: 3, spd: 2.0, range: 0, cost: 60, wage: 4, str: 30, sinif: 'atli' },
  atliokcu: { ad: 'Atlı Okçu', ikon: '🏇', hp: 58, atk: 8, def: 2, spd: 2.1, range: 170, cost: 65, wage: 4, str: 30, sinif: 'atli' },
  agir: { ad: 'Ağır Süvari', ikon: '⚜️', hp: 115, atk: 15, def: 6, spd: 1.8, range: 0, cost: 130, wage: 8, str: 45, sinif: 'atli' },
};
const UPGRADE = { milis: 'piyade' };

/* ---------- Krallıklar (1180) ---------- */
const REALMS = {
  ingiltere: { ad: 'İngiltere Krallığı', kul: 'latin', renk: '#c23b3b', u: ['Kral', 'Kraliçe'], han: 'Plantagenet' },
  fransa: { ad: 'Fransa Krallığı', kul: 'latin', renk: '#3466c2', u: ['Kral', 'Kraliçe'], han: 'Capet' },
  hre: { ad: 'Kutsal Roma İmparatorluğu', kul: 'latin', renk: '#d8b23a', u: ['İmparator', 'İmparatoriçe'], han: 'Hohenstaufen' },
  kastilya: { ad: 'Kastilya Krallığı', kul: 'latin', renk: '#c9772f', u: ['Kral', 'Kraliçe'], han: 'Ivrea' },
  aragon: { ad: 'Aragon Krallığı', kul: 'latin', renk: '#e8a92c', u: ['Kral', 'Kraliçe'], han: 'Barcelona' },
  portekiz: { ad: 'Portekiz Krallığı', kul: 'latin', renk: '#2f8f6f', u: ['Kral', 'Kraliçe'], han: 'Burgonya' },
  sicilya: { ad: 'Sicilya Krallığı', kul: 'latin', renk: '#8a55c0', u: ['Kral', 'Kraliçe'], han: 'Hauteville' },
  venedik: { ad: 'Venedik Cumhuriyeti', kul: 'latin', renk: '#a3263c', u: ['Doç', 'Doç'], han: 'Dandolo' },
  macar: { ad: 'Macaristan Krallığı', kul: 'latin', renk: '#5e9a3c', u: ['Kral', 'Kraliçe'], han: 'Árpád' },
  kudus: { ad: 'Kudüs Krallığı', kul: 'latin', renk: '#d9d0a0', u: ['Kral', 'Kraliçe'], han: 'Anjou' },
  leh: { ad: 'Lehistan Krallığı', kul: 'slav', renk: '#c84a6e', u: ['Kral', 'Kraliçe'], han: 'Piast' },
  rus: { ad: 'Kiev Knezliği', kul: 'slav', renk: '#6f8f45', u: ['Büyük Knez', 'Knezinya'], han: 'Rurik' },
  bulgar: { ad: 'Bulgar Çarlığı', kul: 'slav', renk: '#4f7a8f', u: ['Çar', 'Çariçe'], han: 'Asen' },
  danimarka: { ad: 'Danimarka Krallığı', kul: 'nordic', renk: '#b8556a', u: ['Kral', 'Kraliçe'], han: 'Estridsen' },
  norvec: { ad: 'Norveç Krallığı', kul: 'nordic', renk: '#5a74a8', u: ['Kral', 'Kraliçe'], han: 'Sverre' },
  isvec: { ad: 'İsveç Krallığı', kul: 'nordic', renk: '#3f8fc0', u: ['Kral', 'Kraliçe'], han: 'Erik' },
  bizans: { ad: 'Bizans İmparatorluğu', kul: 'rum', renk: '#7d3fa6', u: ['İmparator', 'İmparatoriçe'], han: 'Komnenos' },
  gurcu: { ad: 'Gürcistan Krallığı', kul: 'rum', renk: '#c0623e', u: ['Kral', 'Kraliçe'], han: 'Bagrationi' },
  selcuklu: { ad: 'Anadolu Selçuklu Devleti', kul: 'turk', renk: '#1f9a86', u: ['Sultan', 'Sultan'], han: 'Selçuklu' },
  artuklu: { ad: 'Artuklu Beyliği', kul: 'turk', renk: '#7fae3a', u: ['Bey', 'Hatun'], han: 'Artuk' },
  irak: { ad: 'Irak Selçuklu Sultanlığı', kul: 'turk', renk: '#2b7a6a', u: ['Sultan', 'Sultan'], han: 'Tuğrulî' },
  eyyubi: { ad: 'Eyyubi Sultanlığı', kul: 'arap', renk: '#d08a2a', u: ['Sultan', 'Sultan'], han: 'Eyyubi' },
  abbasi: { ad: 'Abbasi Halifeliği', kul: 'arap', renk: '#4a5f9a', u: ['Halife', 'Halife'], han: 'Abbasi' },
  muvahhid: { ad: 'Muvahhid Halifeliği', kul: 'arap', renk: '#3d8a45', u: ['Halife', 'Halife'], han: 'Mümini' },
};

/* Yerleşimler: [ad, boylam, enlem, tip, krallık, başkent?] — tip: sehir | kale */
const SETTLEMENTS = [
  ['Londra', -0.12, 51.5, 'sehir', 'ingiltere', 1], ['York', -1.08, 53.96, 'kale', 'ingiltere'], ['Winchester', -1.31, 51.06, 'kale', 'ingiltere'],
  ['Rouen', 1.1, 49.44, 'sehir', 'ingiltere'], ['Bordeaux', -0.58, 44.84, 'sehir', 'ingiltere'], ['Dublin', -6.26, 53.35, 'kale', 'ingiltere'],
  ['Paris', 2.35, 48.86, 'sehir', 'fransa', 1], ['Orléans', 1.9, 47.9, 'kale', 'fransa'], ['Reims', 4.03, 49.26, 'kale', 'fransa'],
  ['Bourges', 2.4, 47.08, 'kale', 'fransa'], ['Toulouse', 1.44, 43.6, 'sehir', 'fransa'],
  ['Aachen', 6.08, 50.78, 'kale', 'hre', 1], ['Köln', 6.96, 50.94, 'sehir', 'hre'], ['Frankfurt', 8.68, 50.11, 'sehir', 'hre'],
  ['Nürnberg', 11.08, 49.45, 'kale', 'hre'], ['Viyana', 16.37, 48.21, 'kale', 'hre'], ['Prag', 14.42, 50.08, 'sehir', 'hre'],
  ['Milano', 9.19, 45.46, 'sehir', 'hre'], ['Hamburg', 9.99, 53.55, 'sehir', 'hre'], ['Lyon', 4.83, 45.76, 'kale', 'hre'], ['Regensburg', 12.1, 49.02, 'kale', 'hre'],
  ['Toledo', -4.02, 39.86, 'sehir', 'kastilya', 1], ['Burgos', -3.7, 42.34, 'kale', 'kastilya'], ['León', -5.57, 42.6, 'kale', 'kastilya'],
  ['Coimbra', -8.43, 40.2, 'kale', 'portekiz', 1], ['Lizbon', -9.14, 38.72, 'sehir', 'portekiz'],
  ['Zaragoza', -0.88, 41.65, 'sehir', 'aragon', 1], ['Barselona', 2.17, 41.39, 'sehir', 'aragon'],
  ['Marakeş', -7.99, 31.63, 'sehir', 'muvahhid', 1], ['Sevilla', -5.98, 37.39, 'sehir', 'muvahhid'], ['Kurtuba', -4.78, 37.89, 'sehir', 'muvahhid'],
  ['Gırnata', -3.6, 37.18, 'kale', 'muvahhid'], ['Fas', -5.0, 34.03, 'sehir', 'muvahhid'], ['Tunus', 10.18, 36.8, 'sehir', 'muvahhid'], ['Bicaye', 5.08, 36.75, 'kale', 'muvahhid'],
  ['Palermo', 13.36, 38.12, 'sehir', 'sicilya', 1], ['Napoli', 14.27, 40.85, 'sehir', 'sicilya'], ['Bari', 16.87, 41.12, 'kale', 'sicilya'],
  ['Venedik', 12.33, 45.44, 'sehir', 'venedik', 1],
  ['Estergon', 18.74, 47.79, 'kale', 'macar', 1], ['Zagreb', 15.98, 45.81, 'kale', 'macar'], ['Belgrad', 20.46, 44.82, 'kale', 'macar'], ['Varad', 21.92, 47.06, 'kale', 'macar'],
  ['Krakov', 19.94, 50.06, 'sehir', 'leh', 1], ['Poznan', 16.93, 52.41, 'kale', 'leh'], ['Płock', 19.7, 52.55, 'kale', 'leh'],
  ['Kiev', 30.52, 50.45, 'sehir', 'rus', 1], ['Novgorod', 31.27, 58.52, 'sehir', 'rus'], ['Smolensk', 32.04, 54.78, 'kale', 'rus'],
  ['Vladimir', 40.4, 56.13, 'kale', 'rus'], ['Çernigov', 31.29, 51.49, 'kale', 'rus'], ['Halych', 24.7, 49.12, 'kale', 'rus'],
  ['Roskilde', 12.08, 55.64, 'kale', 'danimarka', 1], ['Lund', 13.19, 55.7, 'sehir', 'danimarka'],
  ['Bergen', 5.32, 60.39, 'sehir', 'norvec', 1], ['Oslo', 10.75, 59.91, 'kale', 'norvec'],
  ['Uppsala', 17.64, 59.86, 'kale', 'isvec', 1], ['Visby', 18.3, 57.64, 'sehir', 'isvec'],
  ['Konstantinopolis', 28.98, 41.01, 'sehir', 'bizans', 1], ['Selanik', 22.94, 40.64, 'sehir', 'bizans'], ['Atina', 23.73, 37.98, 'kale', 'bizans'],
  ['İznik', 29.72, 40.43, 'kale', 'bizans'], ['Trabzon', 39.72, 41.0, 'sehir', 'bizans'], ['Edirne', 26.56, 41.68, 'kale', 'bizans'],
  ['İzmir', 27.14, 38.42, 'kale', 'bizans'], ['Antalya', 30.71, 36.89, 'kale', 'bizans'], ['Lefkoşa', 33.36, 35.18, 'kale', 'bizans'], ['Sofya', 23.32, 42.7, 'kale', 'bizans'],
  ['Tırnova', 25.63, 43.08, 'kale', 'bulgar', 1], ['Vidin', 22.88, 43.99, 'kale', 'bulgar'],
  ['Konya', 32.49, 37.87, 'sehir', 'selcuklu', 1], ['Kayseri', 35.49, 38.73, 'sehir', 'selcuklu'], ['Sivas', 37.02, 39.75, 'kale', 'selcuklu'],
  ['Ankara', 32.86, 39.93, 'kale', 'selcuklu'], ['Malatya', 38.31, 38.35, 'kale', 'selcuklu'], ['Kastamonu', 33.78, 41.38, 'kale', 'selcuklu'],
  ['Aksaray', 34.03, 38.37, 'kale', 'selcuklu'], ['Erzurum', 41.27, 39.9, 'kale', 'selcuklu'],
  ['Diyarbakır', 40.23, 37.91, 'kale', 'artuklu', 1], ['Mardin', 40.74, 37.31, 'kale', 'artuklu'],
  ['Tiflis', 44.79, 41.72, 'sehir', 'gurcu', 1], ['Kutaisi', 42.7, 42.27, 'kale', 'gurcu'],
  ['Kudüs', 35.21, 31.77, 'sehir', 'kudus', 1], ['Akka', 35.08, 32.93, 'sehir', 'kudus'], ['Antakya', 36.16, 36.2, 'sehir', 'kudus'],
  ['Trablusşam', 35.85, 34.43, 'kale', 'kudus'], ['Kerak', 35.7, 31.18, 'kale', 'kudus'],
  ['Kahire', 31.24, 30.04, 'sehir', 'eyyubi', 1], ['İskenderiye', 29.92, 31.2, 'sehir', 'eyyubi'], ['Şam', 36.29, 33.51, 'sehir', 'eyyubi'],
  ['Halep', 37.16, 36.2, 'sehir', 'eyyubi'], ['Asvan', 32.9, 24.09, 'kale', 'eyyubi'], ['Mekke', 39.83, 21.42, 'sehir', 'eyyubi'], ['Medine', 39.6, 24.47, 'kale', 'eyyubi'],
  ['Bağdat', 44.36, 33.31, 'sehir', 'abbasi', 1], ['Basra', 47.78, 30.51, 'sehir', 'abbasi'], ['Musul', 43.13, 36.34, 'sehir', 'abbasi'],
  ['Hemedan', 48.51, 34.8, 'sehir', 'irak', 1], ['İsfahan', 51.67, 32.65, 'sehir', 'irak'], ['Rey', 51.43, 35.6, 'kale', 'irak'], ['Tebriz', 46.29, 38.08, 'sehir', 'irak'],
];

/* ---------- Harita projeksiyonu ----------
   Harita birimi ≈ 1 enlem derecesi (~111 km). x = (boylam - LON0) * cos(40°), y = LAT1 - enlem */
const MAP = { LON0: -12, LON1: 62, LAT0: 12, LAT1: 66, COS: Math.cos(40 * Math.PI / 180) };
MAP.W = (MAP.LON1 - MAP.LON0) * MAP.COS;
MAP.H = MAP.LAT1 - MAP.LAT0;
function proj(lon, lat) { return [(lon - MAP.LON0) * MAP.COS, MAP.LAT1 - lat]; }
