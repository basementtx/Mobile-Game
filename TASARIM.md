# Taç ve Hançer — Tasarım Belgesi

## Vizyon
"Grafik değil, özgürlük satar." Crusader Kings'in karakter/entrika derinliği + Bannerlord'un "sıfırdan yüksel" fantezisi,
telefonda birkaç dakikalık oturumlarla oynanabilecek şekilde. Hikâyeyi senaryo yazarı değil, **birbirini besleyen sistemler** üretir.

## Temel ilkeler
1. **İçerik değil sistem.** Her yeni mekanik, var olan görüş / sır / rütbe / stres sistemlerine bağlanmalı.
2. **NPC'ler oyuncuyla aynı kurallara tabi.** Oyuncunun yapabildiği her şeyi (baştan çıkarma, suikast, iftira…) NPC'ler de yapar.
3. **Her eylemin bir bedeli var.** Rüşvet altın, idam zorbalık, ihanet sır, kişiliğe aykırı davranış stres üretir.
4. **Şans görünür.** Butonlarda başarı yüzdesi yazar; görüşün sebepleri "neden?" ile açılır.
5. **Ölüm son değil.** Hanedan devam eder; asıl oyuncu karakter değil, soy.

## Döngü
- 1 tur = 1 ay, ayda 3 eylem hakkı.
- Ay sonunda: gelir → NPC eylemleri → savaşlar → zindanlar → sırların yayılması → unvan dağıtımı → doğumlar → sağlık/ölümler → nüfus dengesi → rastgele olay.

## Sistemler
- **Karakter:** 5 yetenek (Savaş, Diplomasi, Entrika, Yönetim, Cazibe), 3-4 özellik, sağlık, stres, altın, şan, korku, rezalet, zorbalık.
- **Görüş:** kalıcı ilişki puanı (zamanla söner) + anlık hesaplanan etkenler (kişilik uyumu, aile, eş/sevgili, rezalet, zorbalık, akraba katilliği…).
- **Sırlar:** kim yaptı, kime yaptı, kimler biliyor, kamuya açık mı. Bilenlerden düşman olanlar ifşa edebilir, dedikoduyla yayılır.
- **Unvanlar:** Krallık → 3 Dükalık → 6 Baronluk. Bağımsızlıkla yeni krallıklar/dükalıklar doğar.
- **Savaş:** soyut ordu gücü, aylık muharebe, savaş skoru ±100. Gasp veya bağımsızlık hedefli.

## Yol haritası
**v0.2 — Harita ve savaş (bitti)**
- Gerçek harita, joystick, yatay ekran, 24 krallık / 101 şehir
- Ordular, maaşlar, kuşatma, krallık savaşları, isyanlar
- Üstten 2D savaş ekranı

**v0.3 — Derinlik**
- Yoldaşlar (ordunda gezen, yetenekli karakterler) ve onları komutan yapma
- Asker deneyimi ve terfi ağacı; kültüre özel birlikler (Yeniçeri öncülleri, Varangiyan muhafızları…)
- Savaşta birlik grupları (piyade/okçu/süvari ayrı emir), arazi (orman, tepe, nehir)
- Köyler, kervanlar, ticaret; yağma ve köy yakma
- Hamilelik süreci, taht kavgaları, din ve aforoz

**v0.4 — Cila**
- Ses ve müzik, basit portre üreticisi, hanedan ağacı, başarımlar
- Capacitor ile Android/iOS paketi
