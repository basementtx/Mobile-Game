# ⚜️ Taç ve Hançer

1180 yılında, **gerçek dünya haritası** üzerinde geçen bir ortaçağ sandbox oyunu. Telefonda **yatay** oynanır.
Crusader Kings tarzı entrika ve hanedan + Bannerlord tarzı harita, ordu ve **üstten 2D savaşlar**.

> Köylü olarak doğ, sipahi/şövalye ol, kale kuşat, efendine isyan et, kendi krallığını kur… ya da zindanda çürü.

## Nasıl oynanır (telefonda)

Saf HTML/JavaScript; kurulum gerektirmez. GitHub Pages ile yayınla ya da yerelde aç:
```bash
python3 -m http.server 8000   # sonra http://localhost:8000
```

- **Sol alttaki joystick** ile ordunu haritada yürüt. Zaman sadece hareket ederken (ya da "⏳ Bekle" açıkken) akar.
- **Haritayı** parmakla kaydır, iki parmakla yakınlaştır. Şehre, orduya ya da araziye **dokunarak** uzaktan bilgi al ve emir ver ("Oraya git", "Takip et", "Saldır", "Konuş").
- **Şehre** varınca asker topla, eğit, dinlen, meyhaneye uğra. Düşman şehrini **kuşat**, 3 gün sonra hücum et.
- **Düşmana çarpınca**: savaş ekranında kahramanını joystickle yönet, askerlerine *Hücum / Bekle / Takip* emri ver — ya da otomatik çöz, ya da kaç.
- **Sağdaki menü**: karakterin, kişiler (entrika), ordun, toprakların, dünya (krallıklar ve savaşlar), eylemler, günlük.

## Dünya

- **24 krallık, 101 tarihi şehir/kale**: Bizans, Anadolu Selçuklu, Eyyubiler, Kudüs, Fransa, İngiltere, Kutsal Roma, Kiev, Abbasiler, Muvahhidler…
- Kültürler (Türk, Arap, Rum, Latin, Slav, İskandinav) isimleri, rütbe adlarını (Bey/Emir/Sultan, Lord/Dük/Kral) ve asker tiplerini (atlı okçu / ağır süvari) belirler.
- Hükümdarlar birbirine savaş açar, barış yapar; lord orduları dolaşır, kuşatır, eşkıya avlar. Vasallar isyan edip yeni devletler kurar, krallıklar yıkılır.
- Harita verisi: Natural Earth (kamu malı).

## Sistemler

| Sistem | Ne yapar |
|---|---|
| **Ordu** | Milis, mızraklı piyade, okçu, atlı, atlı okçu, ağır süvari. Maaş, kapasite, hız. |
| **Savaş ekranı** | ~200 birime kadar gerçek zamanlı 2D savaş; okçular, süvari hücum bonusu, moral çöküşü, kale surları. |
| **Rütbe** | Köylü → Asker → Şövalye/Sipahi → Lord/Bey → Dük/Emir → Kral/Sultan. |
| **Görüş & kişilik** | Herkesin herkese bakışı; kişilik uyumu, rezalet, zorbalık. Kişiliğe aykırı davranış **stres** yapar. |
| **Sırlar** | Yasak aşk, cinayet, zimmet, rüşvet, piç çocuk, eşkıyalık; casusluk, şantaj, ifşa. |
| **Entrika** | Evlilik, baştan çıkarma, rüşvet, iftira, suikast, düello, hapis, idam, işkence, toprak bağışı, savaş ilanı, barış, isyan, krallık ilanı. |
| **Hanedan** | Ölünce varisinle devam; varis yoksa oyun biter. |

## Dosyalar

```
index.html        iskelet
css/style.css     yatay arayüz
js/data.js        kültürler, özellikler, sırlar, askerler, krallıklar, şehirler
js/geo.js         kara poligonları (Natural Earth 1:50m, sadeleştirilmiş)
js/engine.js      karakterler, görüş, sırlar, entrika yapay zekâsı, aylık döngü
js/world.js       harita dünyası: ordular, krallık savaşları, kuşatma, zaman
js/actions.js     oyuncu eylemleri
js/events.js      olaylar
js/map.js         harita çizimi, dokunmatik kontroller, joystick
js/battle.js      üstten 2D savaş
js/ui.js          arayüz
```
