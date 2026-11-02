# ⚜️ Crown & Dagger (Taç ve Hançer)

1180 yılında, **gerçek dünya haritası** üzerinde geçen, **tur tabanlı** bir ortaçağ sandbox oyunu. Telefonda **yatay** oynanır.
Crusader Kings tarzı entrika ve hanedan + il il bölünmüş strateji haritası, ordular ve **üstten 2D savaşlar**.

Oyun varsayılan olarak **İngilizce**dir; dil, açılış ekranından ya da ☰ Menü → Dil'den **Türkçe** yapılabilir.

> Köylü olarak doğ, sipahi/şövalye ol, kale kuşat, efendine isyan et, kendi krallığını kur… ya da zindanda çürü.

## Nasıl oynanır (telefonda)

Saf HTML/JavaScript; kurulum gerektirmez. GitHub Pages ile yayınla ya da yerelde aç:
```bash
python3 -m http.server 8000   # sonra http://localhost:8000
```

- Oyun **tur tabanlıdır**: bir tur 5 gün sürer. Emirlerini ver, sağ alttaki **END TURN / TURU BİTİR** düğmesine bas; bütün ordular aynı anda hareket eder.
- Harita **illere** bölünmüştür (keskin sınırlı çokgenler); renkler krallıkları, kalın çizgiler krallık sınırlarını gösterir.
- Bir **ile, şehre ya da orduya dokun** → "Buraya git": rota çizilir, sarı elmaslar her turun sonunda nerede olacağını gösterir. Ordun bir turda hareket puanı kadar il ilerler (deniz geçişi 2 puan, süvari hızlandırır).
- **Şehrin ilindeyken** asker topla, eğit, dinlen, meyhaneye uğra. Düşman şehrini **kuşat**, 3 gün sonra hücum et.
- **Düşmanla karşılaşınca**: savaş ekranında kahramanını joystickle yönet, askerlerine *Hücum / Bekle / Takip* emri ver — ya da otomatik çöz, ya da kaç. Her askerin üzerinde **seviyesi Roma rakamıyla** (I–IV) yazar.
- **Sağdaki menü**: karakterin, kişiler (entrika), ordun, toprakların, dünya (krallıklar ve savaşlar), eylemler, günlük.

## Dünya

- **24 krallık, 101 tarihi şehir/kale**: Bizans, Anadolu Selçuklu, Eyyubiler, Kudüs, Fransa, İngiltere, Kutsal Roma, Kiev, Abbasiler, Muvahhidler…
- Kültürler (Türk, Arap, Rum, Latin, Slav, İskandinav) isimleri, rütbe adlarını (Bey/Emir/Sultan, Lord/Dük/Kral) ve asker tiplerini (atlı okçu / ağır süvari) belirler.
- Hükümdarlar birbirine savaş açar, barış yapar; lord orduları dolaşır, kuşatır, eşkıya avlar. Vasallar isyan edip yeni devletler kurar, krallıklar yıkılır.
- Harita verisi: Natural Earth (kamu malı).

## Sistemler

| Sistem | Ne yapar |
|---|---|
| **Ordu** | Milis (I), mızraklı piyade (II), okçu (II), atlı (III), atlı okçu (III), ağır süvari (IV). Maaş, kapasite, tur başına hareket puanı. |
| **Savaş ekranı** | ~200 birime kadar gerçek zamanlı 2D savaş; okçular, süvari hücum bonusu, moral çöküşü, kale surları. |
| **Rütbe** | Köylü → Asker → Şövalye/Sipahi → Lord/Bey → Dük/Emir → Kral/Sultan. |
| **Görüş & kişilik** | Herkesin herkese bakışı; kişilik uyumu, rezalet, zorbalık. Kişiliğe aykırı davranış **stres** yapar. |
| **Sırlar** | Yasak aşk, cinayet, zimmet, rüşvet, piç çocuk, eşkıyalık; casusluk, şantaj, ifşa. |
| **Entrika** | Evlilik, baştan çıkarma, rüşvet, iftira, suikast, düello, hapis, idam, işkence, toprak bağışı, savaş ilanı, barış, isyan, krallık ilanı. |
| **Hanedan** | Ölünce varisinle devam; varis yoksa oyun biter. |

## Dosyalar

```
index.html        iskelet
js/i18n.js        dil desteği (EN varsayılan, TR)
css/style.css     yatay arayüz
js/data.js        kültürler, özellikler, sırlar, askerler, krallıklar, şehirler
js/geo.js         kara poligonları (Natural Earth 1:50m, sadeleştirilmiş)
js/engine.js      karakterler, görüş, sırlar, entrika yapay zekâsı, aylık döngü
js/world.js       harita dünyası: ordular, krallık savaşları, kuşatma, tur sistemi
js/provinces.js   iller (Voronoi), komşuluk grafiği, yol bulma
js/actions.js     oyuncu eylemleri
js/events.js      olaylar
js/map.js         il haritası çizimi, rota, dokunmatik kontroller
js/battle.js      üstten 2D savaş
js/ui.js          arayüz
```
