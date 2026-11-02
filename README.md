# ⚜️ Taç ve Hançer

Ortaçağda geçen, metin ağırlıklı bir **hanedan ve entrika** oyunu. Telefonda oynamak için yapıldı.
Grafik minimum; asıl mesele **özgürlük ve mekanik**: entrika, ihanet, aşk, rüşvet, şantaj, idam, rütbe atlama, kendi krallığını kurma.

> Köylü olarak doğ, şövalye ol, toprak kap, efendini devir, kendi krallığını kur... ya da darağacında sallan.

## Nasıl oynanır (telefonda)

Oyun saf HTML/JavaScript'tir; kurulum, sunucu ya da internet gerektirmez (ilk açılıştan sonra çevrimdışı da çalışır).

**En kolay yol — GitHub Pages:**
1. GitHub'da repo → **Settings → Pages**
2. *Source*: **Deploy from a branch**, branch: bu branch (veya `main`), klasör: `/ (root)` → **Save**
3. Birkaç dakika sonra çıkan adresi (`https://<kullanıcı>.github.io/Mobile-Game/`) telefonda aç
4. Tarayıcı menüsünden **"Ana ekrana ekle"** → artık uygulama gibi açılır, tam ekran çalışır

**Bilgisayarda denemek için:**
```bash
python3 -m http.server 8000
# tarayıcıda http://localhost:8000
```

## Oyun mekanikleri (v0.1)

| Sistem | Ne yapar |
|---|---|
| **Rütbeler** | Köylü → Asker → Şövalye → Lord → Dük → Kral. Terfi iste, unvan gasp et, bağımsızlık ilan et. |
| **Görüş** | Her karakterin her karaktere -100…+100 bakışı var. Kişilik uyumu, hediyeler, ihanetler, rezaletler, zorbalık etkiler. |
| **Kişilik** | Hırslı, kurnaz, zalim, şehvetli, korkak, açgözlü… NPC'ler kişiliklerine göre davranır. Sen kişiliğine aykırı davranırsan **stres** birikir. |
| **Sırlar** | Yasak aşk, cinayet, zimmet, rüşvet, piç çocuk, eşkıyalık. Casuslukla öğren, şantaj yap, ifşa et. Efendin suçunu öğrenirse zindan. |
| **Etkileşimler** | Sohbet, hediye, rüşvet, baştan çıkarma, evlilik, boşanma, casusluk, şantaj, ifşa, iftira, suikast, düello, gözdağı, yardım, hizmete girme, terfi, saraya davet, unvan bağışlama, meşrulaştırma, hapis, idam, işkence, fidye, unvana el koyma, savaş. |
| **Yaşayan dünya** | ~100 NPC kendi başına evlenir, aldatır, entrika çevirir, öldürür, isyan eder. Sana da teklifler, tehditler, meydan okumalar gelir. |
| **Hanedan** | Ölünce en büyük meşru çocuğunla devam edersin. Varisin yoksa oyun biter. |
| **Savaş** | Unvan gasbı ve bağımsızlık savaşları. Ordu = kendi askerin + sana sadık vasallar + paralı askerler. |
| **Olaylar** | 25+ rastgele olay: eşkıyalar, kumar, hancının gözdesi, köylü isyanı, kör kâhin, yetim çocuk, şantajcılar… |

## Dosya yapısı

```
index.html            giriş noktası
css/style.css         mobil öncelikli karanlık tema
js/data.js            isimler, özellikler, sır türleri, yer adları
js/engine.js          dünya, karakterler, ilişkiler, sırlar, savaş, NPC yapay zekâsı, aylık döngü, kayıt
js/actions.js         oyuncunun yapabileceği tüm eylemler
js/events.js          olaylar (rastgele + NPC'lerin tetikledikleri)
js/ui.js              arayüz
sw.js, manifest       çevrimdışı çalışma + "ana ekrana ekle"
TASARIM.md            tasarım belgesi ve yol haritası
```

Yeni eylem eklemek için `js/actions.js` içindeki `ACTIONS` listesine, yeni olay için `js/events.js` içindeki `EVENTS` nesnesine bir kayıt eklemek yeterli.
