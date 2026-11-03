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

const STATS = biDefine({ sav: BL('Savaş', 'Martial'), dip: BL('Diplomasi', 'Diplomacy'), ent: BL('Entrika', 'Intrigue'), yon: BL('Yönetim', 'Stewardship'), cek: BL('Cazibe', 'Charm') });
const STAT_ICON = { sav: '⚔️', dip: '🕊️', ent: '🗡️', yon: '📜', cek: '🌹' };

/* Rütbe adları kültüre göre değişir; 5. rütbe (hükümdar) krallığın kendi unvanını kullanır */
const RANK_TABLE = {
  m: [BL('Köylü', 'Peasant'), BL('Asker', 'Soldier'), BL('Şövalye', 'Knight'), BL('Lord', 'Lord'), BL('Dük', 'Duke'), BL('Kral', 'King')],
  f: [BL('Köylü', 'Peasant'), BL('Asker', 'Soldier'), BL('Şövalye', 'Knight'), BL('Leydi', 'Lady'), BL('Düşes', 'Duchess'), BL('Kraliçe', 'Queen')],
  em: [BL('Köylü', 'Peasant'), BL('Asker', 'Soldier'), BL('Sipahi', 'Sipahi'), BL('Bey', 'Bey'), BL('Emir', 'Emir'), BL('Sultan', 'Sultan')],
  ef: [BL('Köylü', 'Peasant'), BL('Asker', 'Soldier'), BL('Sipahi', 'Sipahi'), BL('Hatun', 'Hatun'), BL('Hatun', 'Hatun'), BL('Sultan', 'Sultana')],
};
const RANK_ICON = ['🌾', '🛡️', '⚔️', '🏰', '🦁', '👑'];

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const monthName = i => L(MONTHS_TR, MONTHS_EN)[i];

/* Kişilik özellikleri (kisilik:true) birbirine zıt çiftler hâlinde gelir.
   st: yeteneklere etkisi. */
const TRAITS = biEach({
  hirsli: { ad: BL('Hırslı', 'Ambitious'), kisilik: true, zit: 'kanaatkar', st: { dip: 1, sav: 1, yon: 1 }, d: BL('Daha fazlasını ister. Güç ve unvan peşinde koşar.', 'Always wants more. Chases power and titles.') },
  kanaatkar: { ad: BL('Kanaatkâr', 'Content'), kisilik: true, zit: 'hirsli', st: { yon: 1 }, d: BL('Elindekiyle yetinir, entrikaya pek bulaşmaz.', 'Happy with what they have; rarely schemes.') },
  kurnaz: { ad: BL('Kurnaz', 'Deceitful'), kisilik: true, zit: 'durust', st: { ent: 3, dip: -1 }, d: BL('Yalan ve entrika ustası.', 'A master of lies and plots.') },
  durust: { ad: BL('Dürüst', 'Honest'), kisilik: true, zit: 'kurnaz', st: { dip: 2, ent: -2 }, d: BL('Yalandan nefret eder, suçu affetmez.', 'Hates lies and never forgives a crime.') },
  zalim: { ad: BL('Zalim', 'Cruel'), kisilik: true, zit: 'merhametli', st: { sav: 1, ent: 1, dip: -1 }, d: BL('Acı vermekten çekinmez, hatta hoşlanır.', 'Does not shy from causing pain — even enjoys it.') },
  merhametli: { ad: BL('Merhametli', 'Compassionate'), kisilik: true, zit: 'zalim', st: { dip: 2, ent: -1 }, d: BL('Başkalarının acısını kendi acısı gibi hisseder.', 'Feels the pain of others as their own.') },
  sehvetli: { ad: BL('Şehvetli', 'Lustful'), kisilik: true, zit: 'iffetli', st: { cek: 1, ent: 1 }, d: BL('Bedensel zevklere düşkün.', 'Fond of the pleasures of the flesh.') },
  iffetli: { ad: BL('İffetli', 'Chaste'), kisilik: true, zit: 'sehvetli', st: { yon: 1 }, d: BL('Tensel arzulara kapalı.', 'Closed to carnal desire.') },
  cesur: { ad: BL('Cesur', 'Brave'), kisilik: true, zit: 'korkak', st: { sav: 2, dip: 1 }, d: BL('Tehlikeden kaçmaz, meydan okumayı sever.', 'Never runs from danger; loves a challenge.') },
  korkak: { ad: BL('Korkak', 'Craven'), kisilik: true, zit: 'cesur', st: { sav: -2, ent: 2 }, d: BL('Canını her şeyden üstün tutar.', 'Values their own skin above all.') },
  acgozlu: { ad: BL('Açgözlü', 'Greedy'), kisilik: true, zit: 'comert', st: { yon: 2, dip: -1 }, d: BL('Altın için her şeyi yapar.', 'Will do anything for gold.') },
  comert: { ad: BL('Cömert', 'Generous'), kisilik: true, zit: 'acgozlu', st: { dip: 3, yon: -1 }, d: BL('Elindekini paylaşmaktan mutlu olur.', 'Happy to share what they have.') },
  kibirli: { ad: BL('Kibirli', 'Arrogant'), kisilik: true, zit: 'alcakgonullu', st: { dip: -1, sav: 1 }, d: BL('Herkesten üstün olduğuna inanır.', 'Believes they are better than everyone.') },
  alcakgonullu: { ad: BL('Alçakgönüllü', 'Humble'), kisilik: true, zit: 'kibirli', st: { dip: 1 }, d: BL('Gösterişten uzak, sevimli biri.', 'Modest and likeable.') },
  guzel: { ad: BL('Güzel', 'Beautiful'), fiziksel: true, zit: 'cirkin', st: { cek: 4 }, d: BL('Göz alıcı bir güzelliği var.', 'Strikingly good-looking.') },
  cirkin: { ad: BL('Çirkin', 'Ugly'), fiziksel: true, zit: 'guzel', st: { cek: -3 }, d: BL('Görünüşü pek iç açıcı değil.', 'Not pleasant to look at.') },
  dahi: { ad: BL('Dahi', 'Genius'), fiziksel: true, zit: 'aptal', st: { dip: 2, ent: 2, yon: 3, sav: 1 }, d: BL('Olağanüstü bir zekâ.', 'An extraordinary mind.') },
  aptal: { ad: BL('Aptal', 'Dull'), fiziksel: true, zit: 'dahi', st: { dip: -2, ent: -3, yon: -3 }, d: BL('Pek parlak sayılmaz.', 'Not the brightest.') },
  guclu: { ad: BL('Güçlü', 'Strong'), fiziksel: true, zit: 'zayif', st: { sav: 3, cek: 1 }, d: BL('Kaslı ve dayanıklı.', 'Muscular and tough.') },
  zayif: { ad: BL('Zayıf', 'Frail'), fiziksel: true, zit: 'guclu', st: { sav: -3 }, d: BL('Cılız bir beden.', 'A feeble body.') },
  paranoyak: { ad: BL('Paranoyak', 'Paranoid'), st: { ent: 2, dip: -2 }, d: BL('Herkesin ona komplo kurduğuna inanır.', 'Believes everyone is plotting against them.') },
  ayyas: { ad: BL('Ayyaş', 'Drunkard'), st: { yon: -2, cek: -1 }, d: BL('Şarap kadehinden başını kaldırmaz.', 'Never far from the wine cup.') },
  yarali: { ad: BL('Yaralı', 'Scarred'), st: { sav: -1, cek: -1 }, d: BL('Bedeninde derin yara izleri taşıyor.', 'Bears deep scars.') },
  akrabakatili: { ad: BL('Akraba Katili', 'Kinslayer'), st: {}, d: BL('Kendi kanını döktüğü herkesçe bilinir. Herkes ondan iğrenir.', 'Known to have spilled their own blood. Everyone despises them.') },
  dindar: { ad: BL('Dindar', 'Pious'), st: { dip: 1 }, d: BL('Tanrı korkusu taşır.', 'God-fearing.') },
});
const PERSONALITY = Object.keys(TRAITS).filter(k => TRAITS[k].kisilik);
const PHYSICAL = Object.keys(TRAITS).filter(k => TRAITS[k].fiziksel);

/* Sırlar: suc:true olanlar, efendinin bilmesi hâlinde hapis sebebidir. */
const SECRETS = biEach({
  zina: { ad: BL('Yasak ilişki', 'Affair'), shame: 15, suc: false, d: (a, t) => L(`${a} ile ${t} gizlice birlikte oluyor.`, `${a} and ${t} are secretly lovers.`) },
  cinayet: { ad: BL('Cinayet', 'Murder'), shame: 40, suc: true, d: (a, t) => L(`${t} kazara ölmedi. Onu ${a} öldürttü.`, `${t} did not die by accident. ${a} had them killed.`) },
  suikastGirisimi: { ad: BL('Suikast girişimi', 'Murder attempt'), shame: 25, suc: true, d: (a, t) => L(`${a}, ${t} adlı kişiyi öldürtmeye çalıştı.`, `${a} tried to have ${t} killed.`) },
  zimmet: { ad: BL('Zimmet', 'Embezzlement'), shame: 15, suc: true, d: (a) => L(`${a} efendisinin vergilerini zimmetine geçirdi.`, `${a} embezzled their liege's taxes.`) },
  rusvet: { ad: BL('Rüşvet', 'Bribery'), shame: 10, suc: true, d: (a) => L(`${a} tüccarlardan rüşvet alıyor.`, `${a} takes bribes from merchants.`) },
  pic: { ad: BL('Piç çocuk', 'Bastard child'), shame: 20, suc: false, d: (a, t) => L(`${t} adlı çocuğun annesi ${a}, ama babası annenin kocası değil.`, `${a} is the mother of ${t}, but the father is not her husband.`) },
  eskiya: { ad: BL('Eşkıyalık', 'Banditry'), shame: 20, suc: true, d: (a) => L(`${a} geceleri yol kesip yolcuları soyuyor.`, `${a} robs travellers on the roads at night.`) },
  komplo: { ad: BL('Taht komplosu', 'Plot for the throne'), shame: 30, suc: true, d: (a, t) => L(`${a}, ${t} adlı hükümdarı tahttan indirmek için gizlice destekçi topluyor.`, `${a} is secretly gathering supporters to depose ${t}.`) },
  iftira: { ad: BL('İftira', 'Slander'), shame: 10, suc: false, d: (a, t) => L(`${a}, ${t} hakkında yalan yaydı.`, `${a} spread lies about ${t}.`) },
});

/* ---------- Kültürler ---------- */
const CULTURES = biEach({
  latin: { ad: BL('Latin', 'Latin'), east: false, m: NAMES_M, f: NAMES_F, d: DYNASTIES },
  turk: {
    ad: BL('Türk', 'Turkic'), east: true,
    m: ['Alp', 'Arslan', 'Kutalmış', 'Mesud', 'Tuğrul', 'Melikşah', 'Sencer', 'Kaya', 'Yağıbasan', 'Kılıç', 'Gazi', 'Tutuş', 'Süleyman', 'Keyhüsrev', 'Keykubad', 'Rükneddin', 'Nureddin', 'İlyas', 'Tekiş', 'Atsız', 'Çağrı', 'Ertuğrul', 'Savcı', 'Bahadır', 'Toğan', 'Börü', 'İnal', 'Kutluğ', 'Temür', 'Aydoğdu'],
    f: ['Gevher', 'Ayşe', 'Fatma', 'Hatice', 'Terken', 'Selçuk', 'Mahperi', 'Gülruh', 'Aybike', 'Altun', 'Türkan', 'Banu', 'Esma', 'Hüma', 'Saliha', 'Raziye', 'Melike', 'Nilüfer', 'Tomris', 'Ulduz'],
    d: ['Danişmend', 'Saltuk', 'Mengücek', 'Artuk', 'İnaloğlu', 'Çaka', 'Tutak', 'Kaymaz', 'Bozdoğan', 'Karakurt', 'Akkoyun', 'Kayı', 'Bayat', 'Avşar', 'Salur', 'Çepni'],
  },
  arap: {
    ad: BL('Arap', 'Arab'), east: true,
    m: ['Yusuf', 'Ahmed', 'Ömer', 'Ali', 'Hasan', 'Hüseyin', 'Salih', 'Selahaddin', 'Şirkuh', 'Necmeddin', 'Turanşah', 'Adil', 'Kamil', 'Mansur', 'Zahir', 'Nasır', 'Abdullah', 'İbrahim', 'Halil', 'Musa', 'Tarık', 'Hamza'],
    f: ['Zeyneb', 'Hadice', 'Aişe', 'Fatıma', 'Şemse', 'Rabia', 'Leyla', 'Esma', 'Meryem', 'Safiye', 'Nuriye', 'Sitt-üş-Şam', 'Dünya', 'Cemile'],
    d: ['el-Kurtubi', 'el-Hamdani', 'el-Kindi', 'el-Mısri', 'el-Halebi', 'el-Bağdadi', 'el-Fasi', 'el-Uzri', 'el-Temimi', 'el-Kaysi', 'el-Hilali', 'el-Mahzumi'],
  },
  rum: {
    ad: BL('Rum', 'Greek'), east: false,
    m: ['Ioannes', 'Manuel', 'Aleksios', 'Andronikos', 'Isaakios', 'Konstantinos', 'Theodoros', 'Mikhael', 'Nikephoros', 'Leon', 'Georgios', 'Basileios', 'Demetrios', 'Stephanos', 'Davit', 'Giorgi'],
    f: ['Theodora', 'Irene', 'Anna', 'Maria', 'Eudokia', 'Zoe', 'Helene', 'Euphrosyne', 'Theophano', 'Kassia', 'Tamar', 'Rusudan'],
    d: ['Doukas', 'Angelos', 'Palaiologos', 'Branas', 'Kantakouzenos', 'Laskaris', 'Vatatzes', 'Kamateros', 'Kontostephanos', 'Gabras', 'Orbeli', 'Mkhargrdzeli'],
  },
  slav: {
    ad: BL('Slav', 'Slavic'), east: false,
    m: ['Vladimir', 'Yaroslav', 'Mstislav', 'Boleslav', 'Rostislav', 'Svyatoslav', 'Igor', 'Vsevolod', 'Kazimir', 'Mieszko', 'Stefan', 'Dragan', 'Borislav', 'Vladislav', 'Ivan', 'Petar', 'Kaloyan'],
    f: ['Olga', 'Ludmila', 'Agafya', 'Yevfrosiniya', 'Zbyslava', 'Dobroslava', 'Milica', 'Rada', 'Vera', 'Anastasia', 'Elena'],
    d: ['Olgoviç', 'Monomahoviç', 'Svyatoslaviç', 'Borisoviç', 'Nemanjić', 'Gryfita', 'Awdaniec', 'Toporczyk', 'Kubrat', 'Terter'],
  },
  nordic: {
    ad: BL('İskandinav', 'Norse'), east: false,
    m: ['Sigurd', 'Harald', 'Olaf', 'Knut', 'Sverre', 'Magnus', 'Erik', 'Sven', 'Valdemar', 'Inge', 'Haakon', 'Birger', 'Ragnvald', 'Ulf'],
    f: ['Ingrid', 'Astrid', 'Sigrid', 'Ragnhild', 'Gunhild', 'Helga', 'Kristin', 'Margrete', 'Thora', 'Sofia'],
    d: ['Hvide', 'Bjelbo', 'Gille', 'Folkung', 'Galen', 'Stenkil', 'Hardrada', 'Skjalm', 'Bjarkøy', 'Giske'],
  },
  cin: {
    ad: BL('Çin', 'Chinese'), east: false, fam: true,
    m: ['Kuo', 'Gou', 'Shen', 'Dun', 'Kuang', 'Yin', 'Zhen', 'Xu', 'Hong', 'Wei', 'Jie', 'Tao', 'Yan', 'Shun', 'Ming', 'Hui', 'Liang', 'Qian', 'Rui', 'Feng', 'Bao', 'Cheng', 'Guang', 'Hao', 'Jin', 'Kai', 'Lin', 'Wen', 'Yue', 'Zhong'],
    f: ['Mei', 'Lian', 'Xiu', 'Hua', 'Ying', 'Yu', 'Fang', 'Jing', 'Lan', 'Qing', 'Rong', 'Shu', 'Ting', 'Xia', 'Zhen', 'Hui', 'Ling', 'Yue', 'Zhu', 'Qingzhao'],
    d: ['Zhao', 'Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhou', 'Wu', 'Xu', 'Sun', 'Ma', 'Zhu', 'Hu', 'Guo', 'He', 'Han', 'Lin', 'Luo', 'Yue', 'Xin'],
  },
  japon: {
    ad: BL('Japon', 'Japanese'), east: false, fam: true,
    m: ['Kiyomori', 'Yoritomo', 'Yoshitsune', 'Munemori', 'Shigemori', 'Tomomori', 'Noriyori', 'Yoshinaka', 'Tadanori', 'Koremori', 'Atsumori', 'Kagetoki', 'Nobuyori', 'Tsunemasa', 'Tokimasa', 'Yoshitomo', 'Shigetada', 'Benkei', 'Yorimasa', 'Kanezane'],
    f: ['Tokiko', 'Masako', 'Tomoe', 'Shizuka', 'Akiko', 'Teishi', 'Sadako', 'Fujiko', 'Kiyoko', 'Michiko', 'Yasuko', 'Noriko', 'Haruko', 'Tokuko', 'Giō'],
    d: ['Taira', 'Minamoto', 'Fujiwara', 'Hōjō', 'Ōe', 'Tachibana', 'Sasaki', 'Miura', 'Chiba', 'Kajiwara', 'Hatakeyama', 'Kumagai'],
  },
  kore: {
    ad: BL('Kore', 'Korean'), east: false, fam: true,
    m: ['Jung-bu', 'Ui-bang', 'Gyeong-seung', 'Ui-min', 'Chung-heon', 'Bu-sik', 'Tae-jun', 'Seung-u', 'Jae-won', 'Hyeon', 'Mu', 'Jun', 'Seok', 'Hwan', 'Gyu', 'Dong-hyeon'],
    f: ['Hye-won', 'Seo-yeon', 'Min-ji', 'Su-bin', 'Ji-woo', 'Ha-eun', 'Yu-na', 'Eun-ji', 'Da-eun', 'So-yeon'],
    d: ['Wang', 'Choe', 'Kim', 'Yi', 'Jeong', 'Park', 'Gyeong', 'Han', 'Yun', 'Kang'],
  },
  hint: {
    ad: BL('Hint', 'Indian'), east: false,
    m: ['Prithviraj', 'Jayachandra', 'Kulottunga', 'Rajaraja', 'Vijayachandra', 'Govindachandra', 'Someshvara', 'Vira', 'Ballala', 'Narasimha', 'Bhima', 'Lakshmana', 'Vikrama', 'Ajaya', 'Arnoraja', 'Hammira', 'Madana', 'Kirti', 'Harsha', 'Chandra'],
    f: ['Samyukta', 'Karpuradevi', 'Rajasundari', 'Kundavai', 'Lilavati', 'Padmavati', 'Ratnavali', 'Chandralekha', 'Devaladevi', 'Sita', 'Uma', 'Lakshmi', 'Kamala', 'Rupavati'],
    d: ['Chahamana', 'Gahadavala', 'Chola', 'Chalukya', 'Hoysala', 'Yadava', 'Paramara', 'Sena', 'Kakatiya', 'Pandya', 'Chandela', 'Solanki'],
  },
  khmer: {
    ad: BL('Güneydoğu Asya', 'Southeast Asian'), east: false,
    m: ['Jayavarman', 'Yasovarman', 'Suryavarman', 'Dharanindra', 'Tribhuvanaditya', 'Narapatisithu', 'Sithu', 'Kyansittha', 'Alaungsithu', 'Anawrahta', 'Indravarman', 'Rudravarman', 'Udayaditya', 'Kesavarman', 'Balaputra'],
    f: ['Jayarajadevi', 'Indradevi', 'Rajendradevi', 'Shwe', 'Thiri', 'Saw', 'Indrani', 'Chandra', 'Sri Devi', 'Kamboja'],
    d: ['Mahidharapura', 'Varman', 'Pagan', 'Sailendra', 'Udaya', 'Kaundinya', 'Pyu', 'Mon', 'Malayu', 'Lavo'],
  },
  viet: {
    ad: BL('Viet', 'Vietnamese'), east: false, fam: true,
    m: ['Long Cán', 'Hiến Thành', 'An Di', 'Thủ Độ', 'Thừa', 'Quang', 'Khánh', 'Dũng', 'Tuấn', 'Bảo', 'Minh', 'Hùng', 'Nhân', 'Phúc', 'Thượng'],
    f: ['Chiêu Hoàng', 'Thị Dung', 'Thị Lan', 'Thị Mai', 'Ngọc', 'Thị Hằng', 'Thị Yến', 'Thị Thu', 'Thị Hạnh', 'Thị Hoa'],
    d: ['Lý', 'Trần', 'Đỗ', 'Tô', 'Nguyễn', 'Lê', 'Phạm', 'Đinh', 'Hoàng', 'Vũ'],
  },
  mogol: {
    ad: BL('Moğol', 'Mongol'), east: true,
    m: ['Temüjin', 'Toghrul', 'Jamukha', 'Yesügei', 'Jochi', 'Ögedei', 'Tolui', 'Subutai', 'Jebe', 'Muqali', 'Bo\'orchu', 'Belgutei', 'Qasar', 'Senggum', 'Tayang', 'Kuchlug', 'Altan', 'Qutula', 'Yelü Dashi', 'Zhilugu'],
    f: ['Börte', 'Hoelun', 'Sorghaghtani', 'Yesui', 'Yesugen', 'Khulan', 'Alaqai', 'Checheyigen', 'Töregene', 'Pusuwan'],
    d: ['Borjigin', 'Kerait', 'Naiman', 'Merkit', 'Tatar', 'Ongud', 'Jadaran', 'Kiyat', 'Yelü', 'Khongirad'],
  },
  fars: {
    ad: BL('Fars', 'Persian'), east: true,
    m: ['Gıyaseddin', 'Muhammed', 'Behram', 'Alaeddin', 'Seyfeddin', 'Hüseyin', 'Kutbeddin', 'Mahmud', 'Şehabeddin', 'Fahreddin', 'Rükneddin', 'Nasıreddin', 'Celaleddin', 'Kemaleddin', 'Ferruh'],
    f: ['Şirin', 'Gülnar', 'Ferengis', 'Roşen', 'Mahin', 'Peri', 'Nesrin', 'Zerrin', 'Gülbanu', 'Hürrem'],
    d: ['Şansabani', 'Gurî', 'Samanî', 'Gaznevî', 'Bavendî', 'Herevî', 'Belhî', 'Tusî', 'Kirmanî', 'Isfahanî'],
  },
  habes: {
    ad: BL('Habeş ve Nubya', 'Ethiopian & Nubian'), east: false,
    m: ['Lalibela', 'Yemrehana', 'Harbay', 'Naakueto', 'Gebre Meskel', 'Yitbarek', 'Tatadim', 'Mose', 'Giyorgis', 'Dawit', 'Zekarias', 'Merkurios', 'Kiryakos', 'Selomon', 'Basil'],
    f: ['Meskel Kibra', 'Mariam', 'Tsion', 'Eleni', 'Marta', 'Seble', 'Tirsit', 'Asta', 'Mantasha', 'Aster'],
    d: ['Zagwe', 'Lasta', 'Makuria', 'Dongola', 'Wag', 'Amhara', 'Agaw', 'Nobadia', 'Alodia', 'Tigray'],
  },
  afrika: {
    ad: BL('Sahel', 'Sahelian'), east: false,
    m: ['Sundiata', 'Soumaoro', 'Kaya', 'Dunama', 'Biri', 'Abdallah', 'Salmama', 'Hume', 'Tunka', 'Manan', 'Bassi', 'Faran', 'Kankou', 'Bakary', 'Mamadi', 'Fakoli'],
    f: ['Sogolon', 'Nana', 'Kassa', 'Sassouma', 'Djeneba', 'Fanta', 'Aïssata', 'Hawa', 'Kadiatou', 'Nana Triban'],
    d: ['Sayfawa', 'Duguwa', 'Cissé', 'Kanté', 'Keita', 'Touré', 'Traoré', 'Diarra', 'Sylla', 'Koné'],
  },
  and: {
    ad: BL('And', 'Andean'), east: false,
    m: ['Tacaynamo', 'Guacricaur', 'Ñancen Pinco', 'Minchancaman', 'Cuntipallec', 'Pacatnamu', 'Naymlap', 'Cium', 'Fempellec', 'Lapon', 'Llimpa', 'Xam'],
    f: ['Ceterni', 'Ñofan', 'Fongasigde', 'Ochocalo', 'Tecfi', 'Cumña', 'Llapchi', 'Sian'],
    d: ['Chimor', 'Lambayeque', 'Sicán', 'Moche', 'Naymlap', 'Huanchaco', 'Pacatnamu', 'Collique'],
  },
  mezo: {
    ad: BL('Mezoamerika', 'Mesoamerican'), east: false,
    m: ['Topiltzin', 'Huemac', 'Mixcoatl', 'Tezcatl', 'Chimalpopoca', 'Acamapichtli', 'Xolotl', 'Tlotzin', 'Huetzin', 'Itzcoatl', 'Cuauhtli', 'Ocelotl', 'Tochtli', 'Kukulkan'],
    f: ['Xochitl', 'Chimalma', 'Citlali', 'Itzel', 'Malinalli', 'Tonalli', 'Atzi', 'Quiahuitl', 'Nenetl', 'Ixchel'],
    d: ['Tollan', 'Culhua', 'Chichimeca', 'Acolhua', 'Tepanec', 'Mixtec', 'Cocom', 'Xiu', 'Itza', 'Toltec'],
  },
});

/* ---------- Asker tipleri ---------- */
/* str: otomatik savaş gücü; hp/atk/def/spd/range: savaş ekranı değerleri; tier: seviye (I–IV) */
const TROOPS = biEach({
  milis: { ad: BL('Milis', 'Militia'), ikon: '🔱', tier: 1, hp: 30, atk: 5, def: 0, spd: 1.0, range: 0, cost: 8, wage: 1, str: 10, sinif: 'piyade' },
  piyade: { ad: BL('Mızraklı Piyade', 'Spearman'), ikon: '🛡️', tier: 2, hp: 52, atk: 8, def: 3, spd: 0.95, range: 0, cost: 25, wage: 2, str: 20, sinif: 'piyade' },
  okcu: { ad: BL('Okçu', 'Archer'), ikon: '🏹', tier: 2, hp: 34, atk: 7, def: 1, spd: 1.05, range: 190, cost: 30, wage: 2, str: 17, sinif: 'okcu' },
  atli: { ad: BL('Atlı', 'Horseman'), ikon: '🐎', tier: 3, hp: 70, atk: 11, def: 3, spd: 2.0, range: 0, cost: 60, wage: 4, str: 30, sinif: 'atli' },
  atliokcu: { ad: BL('Atlı Okçu', 'Horse Archer'), ikon: '🏇', tier: 3, hp: 58, atk: 8, def: 2, spd: 2.1, range: 170, cost: 65, wage: 4, str: 30, sinif: 'atli' },
  agir: { ad: BL('Ağır Süvari', 'Heavy Cavalry'), ikon: '⚜️', tier: 4, hp: 115, atk: 15, def: 6, spd: 1.8, range: 0, cost: 130, wage: 8, str: 45, sinif: 'atli' },
});
const UPGRADE = { milis: 'piyade' };
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI'];

/* ---------- Krallıklar (1180) ---------- */
const KING = [BL('Kral', 'King'), BL('Kraliçe', 'Queen')];
const REALMS = biEach({
  ingiltere: { ad: BL('İngiltere Krallığı', 'Kingdom of England'), kisa: BL('İngiltere', 'England'), kul: 'latin', renk: '#c23b3b', u: KING, han: 'Plantagenet' },
  fransa: { ad: BL('Fransa Krallığı', 'Kingdom of France'), kisa: BL('Fransa', 'France'), kul: 'latin', renk: '#3466c2', u: KING, han: 'Capet' },
  hre: { ad: BL('Kutsal Roma İmparatorluğu', 'Holy Roman Empire'), kisa: BL('Kutsal Roma', 'Holy Rome'), kul: 'latin', renk: '#d8b23a', u: [BL('İmparator', 'Emperor'), BL('İmparatoriçe', 'Empress')], han: 'Hohenstaufen' },
  kastilya: { ad: BL('Kastilya Krallığı', 'Kingdom of Castile'), kisa: BL('Kastilya', 'Castile'), kul: 'latin', renk: '#c9772f', u: KING, han: 'Ivrea' },
  aragon: { ad: BL('Aragon Krallığı', 'Kingdom of Aragon'), kisa: BL('Aragon', 'Aragon'), kul: 'latin', renk: '#e8a92c', u: KING, han: 'Barcelona' },
  portekiz: { ad: BL('Portekiz Krallığı', 'Kingdom of Portugal'), kisa: BL('Portekiz', 'Portugal'), kul: 'latin', renk: '#2f8f6f', u: KING, han: 'Burgundy' },
  sicilya: { ad: BL('Sicilya Krallığı', 'Kingdom of Sicily'), kisa: BL('Sicilya', 'Sicily'), kul: 'latin', renk: '#8a55c0', u: KING, han: 'Hauteville' },
  venedik: { ad: BL('Venedik Cumhuriyeti', 'Republic of Venice'), kisa: BL('Venedik', 'Venice'), kul: 'latin', renk: '#a3263c', u: [BL('Doç', 'Doge'), BL('Doç', 'Dogaressa')], han: 'Dandolo' },
  macar: { ad: BL('Macaristan Krallığı', 'Kingdom of Hungary'), kisa: BL('Macaristan', 'Hungary'), kul: 'latin', renk: '#5e9a3c', u: KING, han: 'Árpád' },
  kudus: { ad: BL('Kudüs Krallığı', 'Kingdom of Jerusalem'), kisa: BL('Kudüs', 'Jerusalem'), kul: 'latin', renk: '#d9d0a0', u: KING, han: 'Anjou' },
  leh: { ad: BL('Lehistan Krallığı', 'Kingdom of Poland'), kisa: BL('Lehistan', 'Poland'), kul: 'slav', renk: '#c84a6e', u: KING, han: 'Piast' },
  rus: { ad: BL('Kiev Knezliği', 'Principality of Kiev'), kisa: BL('Kiev', 'Kiev'), kul: 'slav', renk: '#6f8f45', u: [BL('Büyük Knez', 'Grand Prince'), BL('Knezinya', 'Grand Princess')], han: 'Rurik' },
  bulgar: { ad: BL('Bulgar Çarlığı', 'Bulgarian Tsardom'), kisa: BL('Bulgaristan', 'Bulgaria'), kul: 'slav', renk: '#4f7a8f', u: [BL('Çar', 'Tsar'), BL('Çariçe', 'Tsaritsa')], han: 'Asen' },
  danimarka: { ad: BL('Danimarka Krallığı', 'Kingdom of Denmark'), kisa: BL('Danimarka', 'Denmark'), kul: 'nordic', renk: '#b8556a', u: KING, han: 'Estridsen' },
  norvec: { ad: BL('Norveç Krallığı', 'Kingdom of Norway'), kisa: BL('Norveç', 'Norway'), kul: 'nordic', renk: '#5a74a8', u: KING, han: 'Sverre' },
  isvec: { ad: BL('İsveç Krallığı', 'Kingdom of Sweden'), kisa: BL('İsveç', 'Sweden'), kul: 'nordic', renk: '#3f8fc0', u: KING, han: 'Erik' },
  bizans: { ad: BL('Bizans İmparatorluğu', 'Byzantine Empire'), kisa: BL('Bizans', 'Byzantium'), kul: 'rum', renk: '#7d3fa6', u: [BL('İmparator', 'Emperor'), BL('İmparatoriçe', 'Empress')], han: 'Komnenos' },
  gurcu: { ad: BL('Gürcistan Krallığı', 'Kingdom of Georgia'), kisa: BL('Gürcistan', 'Georgia'), kul: 'rum', renk: '#c0623e', u: KING, han: 'Bagrationi' },
  selcuklu: { ad: BL('Anadolu Selçuklu Devleti', 'Sultanate of Rum'), kisa: BL('Selçuklu', 'Rum Seljuks'), kul: 'turk', renk: '#1f9a86', u: [BL('Sultan', 'Sultan'), BL('Sultan', 'Sultana')], han: 'Seljuk' },
  artuklu: { ad: BL('Artuklu Beyliği', 'Artuqid Beylik'), kisa: BL('Artuklu', 'Artuqids'), kul: 'turk', renk: '#7fae3a', u: [BL('Bey', 'Bey'), BL('Hatun', 'Hatun')], han: 'Artuk' },
  irak: { ad: BL('Irak Selçuklu Sultanlığı', 'Seljuk Sultanate of Iraq'), kisa: BL('Irak Selçuklu', 'Iraqi Seljuks'), kul: 'turk', renk: '#2b7a6a', u: [BL('Sultan', 'Sultan'), BL('Sultan', 'Sultana')], han: 'Tughrilid' },
  eyyubi: { ad: BL('Eyyubi Sultanlığı', 'Ayyubid Sultanate'), kisa: BL('Eyyubi', 'Ayyubids'), kul: 'arap', renk: '#d08a2a', u: [BL('Sultan', 'Sultan'), BL('Sultan', 'Sultana')], han: 'Ayyubid' },
  abbasi: { ad: BL('Abbasi Halifeliği', 'Abbasid Caliphate'), kisa: BL('Abbasi', 'Abbasids'), kul: 'arap', renk: '#4a5f9a', u: [BL('Halife', 'Caliph'), BL('Halife', 'Caliph')], han: 'Abbasid' },
  muvahhid: { ad: BL('Muvahhid Halifeliği', 'Almohad Caliphate'), kisa: BL('Muvahhid', 'Almohads'), kul: 'arap', renk: '#3d8a45', u: [BL('Halife', 'Caliph'), BL('Halife', 'Caliph')], han: 'Mumini' },
  // --- Dünyanın geri kalanı (1180) ---
  kipcak: { ad: BL('Kıpçak Konfederasyonu', 'Cuman-Kipchak Confederation'), kisa: BL('Kıpçaklar', 'Cumans'), kul: 'turk', renk: '#6aa0b8', u: [BL('Han', 'Khan'), BL('Hatun', 'Khatun')], han: 'Burçoğlu' },
  harezm: { ad: BL('Harezmşahlar Devleti', 'Khwarazmian Empire'), kisa: BL('Harezm', 'Khwarazm'), kul: 'turk', renk: '#9a4f2a', u: [BL('Şah', 'Shah'), BL('Melike', 'Malika')], han: 'Anuştegin' },
  karahitay: { ad: BL('Kara Hıtay Hanlığı', 'Qara Khitai'), kisa: BL('Kara Hıtay', 'Qara Khitai'), kul: 'mogol', renk: '#5b5ea6', u: [BL('Gürhan', 'Gurkhan'), BL('Gürhan', 'Gurkhan')], han: 'Yelü' },
  kerait: { ad: BL('Kerait Hanlığı', 'Keraite Khanate'), kisa: BL('Keraitler', 'Keraites'), kul: 'mogol', renk: '#8fae7a', u: [BL('Han', 'Khan'), BL('Hatun', 'Khatun')], han: 'Kerait' },
  gur: { ad: BL('Gur Sultanlığı', 'Ghurid Sultanate'), kisa: BL('Gurlular', 'Ghurids'), kul: 'fars', renk: '#2f6e4e', u: [BL('Sultan', 'Sultan'), BL('Sultan', 'Sultana')], han: 'Şansabani' },
  chahamana: { ad: BL('Çahamana Krallığı', 'Chahamanas of Shakambhari'), kisa: BL('Çahamana', 'Chahamanas'), kul: 'hint', renk: '#a8433a', u: [BL('Mihrace', 'Maharaja'), BL('Mihrani', 'Maharani')], han: 'Chahamana' },
  gahadavala: { ad: BL('Gahadavala Krallığı', 'Gahadavala Kingdom'), kisa: BL('Gahadavala', 'Gahadavalas'), kul: 'hint', renk: '#e3a33a', u: [BL('Mihrace', 'Maharaja'), BL('Mihrani', 'Maharani')], han: 'Gahadavala' },
  chola: { ad: BL('Çola İmparatorluğu', 'Chola Empire'), kisa: BL('Çola', 'Cholas'), kul: 'hint', renk: '#3b7d3a', u: [BL('Mihrace', 'Maharaja'), BL('Mihrani', 'Maharani')], han: 'Chola' },
  xia: { ad: BL('Batı Xia İmparatorluğu', 'Western Xia'), kisa: BL('Batı Xia', 'Western Xia'), kul: 'cin', renk: '#8c6d46', u: [BL('İmparator', 'Emperor'), BL('İmparatoriçe', 'Empress')], han: 'Weiming' },
  jin: { ad: BL('Jin Hanedanı', 'Jin Dynasty'), kisa: BL('Jin', 'Jin'), kul: 'cin', renk: '#c9a227', u: [BL('İmparator', 'Emperor'), BL('İmparatoriçe', 'Empress')], han: 'Wanyan' },
  song: { ad: BL('Güney Song Hanedanı', 'Southern Song Dynasty'), kisa: BL('Song', 'Song'), kul: 'cin', renk: '#c2453b', u: [BL('İmparator', 'Emperor'), BL('İmparatoriçe', 'Empress')], han: 'Zhao' },
  goryeo: { ad: BL('Goryeo Krallığı', 'Kingdom of Goryeo'), kisa: BL('Goryeo', 'Goryeo'), kul: 'kore', renk: '#3d6fa8', u: KING, han: 'Wang' },
  japon: { ad: BL('Japonya İmparatorluk Sarayı', 'Imperial Court of Japan'), kisa: BL('Japonya', 'Japan'), kul: 'japon', renk: '#b03a48', u: [BL('Tennō', 'Tennō'), BL('Tennō', 'Tennō')], han: 'Yamato' },
  daiviet: { ad: BL('Đại Việt Krallığı', 'Đại Việt'), kisa: BL('Đại Việt', 'Đại Việt'), kul: 'viet', renk: '#d4a017', u: [BL('İmparator', 'Emperor'), BL('İmparatoriçe', 'Empress')], han: 'Lý' },
  khmer: { ad: BL('Khmer İmparatorluğu', 'Khmer Empire'), kisa: BL('Khmer', 'Khmer'), kul: 'khmer', renk: '#7b4fa0', u: KING, han: 'Mahidharapura' },
  pagan: { ad: BL('Pagan Krallığı', 'Kingdom of Pagan'), kisa: BL('Pagan', 'Pagan'), kul: 'khmer', renk: '#a35d2a', u: KING, han: 'Pagan' },
  srivijaya: { ad: BL('Srivijaya', 'Srivijaya'), kisa: BL('Srivijaya', 'Srivijaya'), kul: 'khmer', renk: '#2d8a8a', u: [BL('Mihrace', 'Maharaja'), BL('Mihrani', 'Maharani')], han: 'Sailendra' },
  mukurra: { ad: BL('Makurya Krallığı', 'Kingdom of Makuria'), kisa: BL('Makurya', 'Makuria'), kul: 'habes', renk: '#4a6fa5', u: KING, han: 'Dongola' },
  zagwe: { ad: BL('Zagwe Hanedanı (Habeşistan)', 'Zagwe Ethiopia'), kisa: BL('Habeşistan', 'Ethiopia'), kul: 'habes', renk: '#2e7d32', u: [BL('Necaşi', 'Negus'), BL('Necaşi', 'Negiste')], han: 'Zagwe' },
  kanem: { ad: BL('Kanem İmparatorluğu', 'Kanem Empire'), kisa: BL('Kanem', 'Kanem'), kul: 'afrika', renk: '#7a9a2e', u: [BL('Mai', 'Mai'), BL('Magira', 'Magira')], han: 'Sayfawa' },
  gana: { ad: BL('Gana İmparatorluğu', 'Ghana Empire'), kisa: BL('Gana', 'Ghana'), kul: 'afrika', renk: '#c79a2c', u: [BL('Tunka', 'Tunka'), BL('Tunka', 'Tunka')], han: 'Cissé' },
  chimu: { ad: BL('Chimor Krallığı', 'Kingdom of Chimor'), kisa: BL('Chimú', 'Chimú'), kul: 'and', renk: '#b5651d', u: [BL('Cie Quich', 'Cie Quich'), BL('Cie Quich', 'Cie Quich')], han: 'Chimor' },
  tolteka: { ad: BL('Tolteklerin Tollan\'ı', 'Toltec Tollan'), kisa: BL('Toltekler', 'Toltecs'), kul: 'mezo', renk: '#3f8f6b', u: [BL('Tlatoani', 'Tlatoani'), BL('Cihuatlatoani', 'Cihuatlatoani')], han: 'Tollan' },
});

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
  // --- Dünyanın geri kalanı ---
  ['Şarukan', 36.25, 49.99, 'kale', 'kipcak', 1], ['Suğdak', 34.97, 44.85, 'sehir', 'kipcak'], ['Sarkel', 42.1, 47.6, 'kale', 'kipcak'],
  ['Gürgenç', 59.15, 42.33, 'sehir', 'harezm', 1], ['Hive', 60.36, 41.38, 'kale', 'harezm'], ['Merv', 61.83, 37.6, 'sehir', 'harezm'], ['Nişabur', 58.8, 36.21, 'sehir', 'harezm'],
  ['Balasagun', 75.25, 42.75, 'sehir', 'karahitay', 1], ['Kaşgar', 75.99, 39.47, 'sehir', 'karahitay'], ['Semerkant', 66.96, 39.65, 'sehir', 'karahitay'], ['Buhara', 64.42, 39.77, 'sehir', 'karahitay'], ['Hotan', 79.92, 37.11, 'kale', 'karahitay'],
  ['Tula Ordası', 106.9, 47.9, 'kale', 'kerait', 1], ['Ötüken', 102.0, 47.5, 'kale', 'kerait'],
  ['Firuzkuh', 64.53, 34.4, 'kale', 'gur', 1], ['Gazne', 68.42, 33.55, 'sehir', 'gur'], ['Herat', 62.2, 34.35, 'sehir', 'gur'], ['Belh', 66.9, 36.76, 'sehir', 'gur'], ['Lahor', 74.34, 31.55, 'sehir', 'gur'],
  ['Ajmer', 74.64, 26.45, 'kale', 'chahamana', 1], ['Delhi', 77.21, 28.66, 'sehir', 'chahamana'],
  ['Kannauj', 79.92, 27.05, 'sehir', 'gahadavala', 1], ['Varanasi', 82.97, 25.32, 'sehir', 'gahadavala'],
  ['Gangaikonda', 79.45, 11.21, 'sehir', 'chola', 1], ['Thanjavur', 79.14, 10.79, 'sehir', 'chola'], ['Kanchipuram', 79.7, 12.83, 'sehir', 'chola'], ['Madurai', 78.12, 9.93, 'kale', 'chola'],
  ['Xingqing', 106.23, 38.49, 'sehir', 'xia', 1], ['Liangzhou', 102.63, 37.93, 'kale', 'xia'], ['Ganzhou', 100.45, 38.93, 'kale', 'xia'], ['Dunhuang', 94.66, 40.14, 'kale', 'xia'],
  ['Zhongdu', 116.4, 39.9, 'sehir', 'jin', 1], ['Kaifeng', 114.31, 34.8, 'sehir', 'jin'], ['Huining', 126.95, 45.53, 'kale', 'jin'], ['Datong', 113.3, 40.09, 'kale', 'jin'], ['Liaoyang', 123.17, 41.27, 'kale', 'jin'], ['Jingzhao', 108.94, 34.34, 'sehir', 'jin'],
  ['Linan', 120.16, 30.27, 'sehir', 'song', 1], ['Jiankang', 118.78, 32.06, 'sehir', 'song'], ['Fuzhou', 119.3, 26.08, 'sehir', 'song'], ['Guangzhou', 113.26, 23.13, 'sehir', 'song'],
  ['Chengdu', 104.07, 30.67, 'sehir', 'song'], ['Jiangling', 112.2, 30.35, 'kale', 'song'], ['Xiangyang', 112.14, 32.04, 'kale', 'song'], ['Quanzhou', 118.59, 24.91, 'sehir', 'song'],
  ['Kaesong', 126.55, 37.97, 'sehir', 'goryeo', 1], ['Seogyeong', 125.75, 39.03, 'kale', 'goryeo'], ['Gyeongju', 129.21, 35.86, 'kale', 'goryeo'],
  ['Heian-kyō', 135.77, 35.01, 'sehir', 'japon', 1], ['Fukuhara', 135.18, 34.69, 'sehir', 'japon'], ['Kamakura', 139.55, 35.32, 'kale', 'japon'], ['Dazaifu', 130.52, 33.51, 'kale', 'japon'], ['Hiraizumi', 141.12, 38.99, 'kale', 'japon'],
  ['Thăng Long', 105.85, 21.03, 'sehir', 'daiviet', 1], ['Thanh Hóa', 105.78, 19.8, 'kale', 'daiviet'],
  ['Yasodharapura', 103.87, 13.41, 'sehir', 'khmer', 1], ['Phimai', 102.5, 15.22, 'kale', 'khmer'], ['Lavo', 100.62, 14.8, 'kale', 'khmer'],
  ['Pagan', 94.86, 21.17, 'sehir', 'pagan', 1], ['Thaton', 97.37, 16.92, 'kale', 'pagan'], ['Pegu', 96.48, 17.34, 'kale', 'pagan'],
  ['Palembang', 104.75, -2.99, 'sehir', 'srivijaya', 1], ['Jambi', 103.6, -1.61, 'kale', 'srivijaya'], ['Kedah', 100.37, 6.12, 'kale', 'srivijaya'],
  ['Dongola', 30.73, 18.22, 'sehir', 'mukurra', 1], ['Soba', 32.67, 15.52, 'kale', 'mukurra'],
  ['Roha', 39.05, 12.03, 'kale', 'zagwe', 1], ['Aksum', 38.72, 14.13, 'sehir', 'zagwe'],
  ['Njimi', 15.3, 14.1, 'kale', 'kanem', 1], ['Bilma', 12.92, 18.69, 'kale', 'kanem'],
  ['Kumbi Saleh', -7.97, 15.77, 'sehir', 'gana', 1], ['Velata', -7.03, 17.3, 'kale', 'gana'],
  ['Chan Chan', -79.07, -8.11, 'sehir', 'chimu', 1], ['Batán Grande', -79.75, -6.45, 'kale', 'chimu'],
  ['Tollan', -99.34, 20.06, 'sehir', 'tolteka', 1], ['Chichén Itzá', -88.57, 20.68, 'sehir', 'tolteka'], ['Culhuacan', -99.1, 19.33, 'kale', 'tolteka'],
];

/* Yerleşimlerin İngilizce adları (Türkçe ad -> İngilizce ad) */
const SETT_EN = {"Londra": "London", "Rouen": "Rouen", "Orléans": "Orléans", "Aachen": "Aachen", "Köln": "Cologne", "Viyana": "Vienna", "Prag": "Prague", "Milano": "Milan", "Lizbon": "Lisbon", "Barselona": "Barcelona", "Marakeş": "Marrakesh", "Sevilla": "Seville", "Kurtuba": "Córdoba", "Gırnata": "Granada", "Fas": "Fez", "Tunus": "Tunis", "Bicaye": "Bougie", "Napoli": "Naples", "Venedik": "Venice", "Estergon": "Esztergom", "Belgrad": "Belgrade", "Varad": "Várad", "Krakov": "Kraków", "Poznan": "Poznań", "Çernigov": "Chernigov", "Konstantinopolis": "Constantinople", "Selanik": "Thessalonica", "Atina": "Athens", "İznik": "Nicaea", "Trabzon": "Trebizond", "Edirne": "Adrianople", "İzmir": "Smyrna", "Antalya": "Attalia", "Lefkoşa": "Nicosia", "Sofya": "Sofia", "Tırnova": "Tarnovo", "Kayseri": "Caesarea", "Sivas": "Sebasteia", "Ankara": "Ankara", "Diyarbakır": "Amid", "Tiflis": "Tbilisi", "Kudüs": "Jerusalem", "Akka": "Acre", "Antakya": "Antioch", "Trablusşam": "Tripoli", "Kahire": "Cairo", "İskenderiye": "Alexandria", "Şam": "Damascus", "Halep": "Aleppo", "Asvan": "Aswan", "Mekke": "Mecca", "Medine": "Medina", "Bağdat": "Baghdad", "Musul": "Mosul", "Hemedan": "Hamadan", "İsfahan": "Isfahan", "Rey": "Rayy", "Tebriz": "Tabriz",
  "Şarukan": "Sharukan", "Suğdak": "Sudak", "Gürgenç": "Gurganj", "Hive": "Khiva", "Nişabur": "Nishapur", "Kaşgar": "Kashgar", "Semerkant": "Samarkand", "Buhara": "Bukhara",
  "Tula Ordası": "Tuul Ordu", "Ötüken": "Ötüken", "Gazne": "Ghazni", "Belh": "Balkh", "Lahor": "Lahore", "Gangaikonda": "Gangaikonda Cholapuram", "Linan": "Lin'an", "Velata": "Walata"};
const settName = trName => L(trName, SETT_EN[trName] || trName);

/* ---------- Harita projeksiyonu ----------
   Harita birimi ≈ 1 enlem derecesi (~111 km). x = (boylam - LON0) * cos(40°), y = LAT1 - enlem */
const MAP = { LON0: -180, LON1: 180, LAT0: -58, LAT1: 80, COS: Math.cos(40 * Math.PI / 180) };
MAP.W = (MAP.LON1 - MAP.LON0) * MAP.COS;
MAP.H = MAP.LAT1 - MAP.LAT0;
function proj(lon, lat) { return [(lon - MAP.LON0) * MAP.COS, MAP.LAT1 - lat]; }
