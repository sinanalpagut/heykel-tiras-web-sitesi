# Kese Benav — heykel arşivi

Brütalist portfolyo sitesi + altı ekranlı yönetim paneli.
Tasarım kaynağı `design-handoff/` klasöründedir; kod bu dosyalara **birebir sadık** kalır.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/
npm run preview
```

Yönetim paneli: `/admin` — varsayılan parola `benav` (`.env` içinde `VITE_ADMIN_PAROLA` ile değiştirin).

---

## Şu anki kurulum: Firebase yok

Veri **bu tarayıcıda** durur:

| Ne | Nerede | Not |
|---|---|---|
| Eser, sergi, ayar, yayın kayıtları | `localStorage` → `kese-benav/durum` | JSON |
| Görsellerin ikili verisi | `IndexedDB` → `kese-benav/gorseller` | Blob |
| Oturum | `sessionStorage` | sekme kapanınca düşer |

localStorage yerine IndexedDB kullanılmasının sebebi: kırpılmış 2400×3200 WebP çıktısı
~400 KB'dır; data URL olarak saklansaydı localStorage'ın ~5 MB kotası birkaç eserde dolardı.

**Bu kurulumun sınırları — açıkça:**

- `/admin` kapısı istemci tarafındadır. Parola paket içinde yer alır; gerçek koruma değildir,
  yalnızca kazara erişimi engeller.
- Veri yalnızca kaydeden tarayıcıda görünür. Başka cihazdan girildiğinde arşiv tohum
  verisiyle başlar.
- Tarayıcı verisi temizlenirse yüklenen görseller kaybolur. A6 → **YEDEK** sekmesinden
  JSON dışa aktarımı alın.

Gerçek koruma ve paylaşılan veri için aşağıdaki Firebase yolunu açın.

---

## Firebase'e geçiş

Arayüz kodunun tek satırı değişmeden çalışır — tüm ekranlar `services/repository/contract.js`
sözleşmesine karşı yazılmıştır.

1. Firebase Console'da proje açın; Firestore, Storage ve Authentication (e-posta/parola) etkinleştirin.
2. `.env.example` dosyasını `.env` olarak kopyalayın, web uygulaması yapılandırmasını doldurun.
3. `VITE_DATA_ADAPTER=firebase` yapın.
4. Kuralları yayınlayın:
   ```bash
   firebase deploy --only firestore:rules,storage:rules
   ```
5. Yönetici kullanıcının UID'si ile `yoneticiler/{uid}` belgesi oluşturun — kurallar yazma
   yetkisini bu belgeye bağlar.

Yerel emülatörle çalışmak için `.env` içinde `VITE_FIREBASE_EMULATOR=true` verip:

```bash
firebase emulators:start
```

`firebase` paketi kuruludur ama Firebase adaptörü **dinamik olarak** yüklenir; yerel
kurulumda ana pakete girmez.

---

## Taslak görseller

`public/taslak/` altında 15 eser + 5 süreç karesi vardır. Bunlar **yer tutucudur**, gerçek
fotoğraf değildir: tasarımın paletinde (karanlık sahne, soldan tek yönlü ışık, malzeme rengi
yalnızca gölge tarafında zayıf bir sekme) üretilmiş SVG'lerdir. Her eserin gerçek ölçüleri
(y×g×d) siluete, malzeme sınıfı yüzey tonuna dönüşür — bu yüzden 15 kare birbirinin kopyası
değildir. Toplam ~160 KB, dış bağımlılık yok.

Amaçları arşivin boş görünmemesi. Gerçek fotoğraflar geldikçe yönetim panelinden tek tek
değiştirilir: **A2 → BİRİNCİL GÖRSEL → DEĞİŞTİR**, ya da **GÖRSELLER** ekranından. Değiştirilen
eserin taslak SVG'si artık kullanılmaz; hepsi değiştirildiğinde `public/taslak/` silinebilir.

Kayıtlarda `taslakMi: true` alanıyla işaretlidirler ve ikili verileri yoktur — yalnızca statik
dosya yolu taşırlar. `localAdapter.gorselUrl` önce IndexedDB'ye bakar, orada yoksa bu yola düşer.

---

## Mimari

```
src/
  config/tokens.js        Tasarım jetonlarının tek kaynağı + çember geometrisi + kontrast hesabı
  data/schema.js          Veri şeması, doğrulama (yayinEngelleri), biçimlendirme yardımcıları
  data/seed.js            Tasarımdaki 15 eser, 5 süreç karesi, 11 sergi, varsayılan ayarlar
  services/
    DepoContext.jsx       useDepo() / useDepoVerisi() — yükleniyor + hata + otomatik tazeleme
    AuthContext.jsx       Yerel parola kapısı veya Firebase Auth
    repository/
      contract.js         Depo sözleşmesi + DepoHatasi
      localAdapter.js     localStorage + IndexedDB adaptörü
      firebaseAdapter.js  Firestore + Storage adaptörü (aynı sözleşme)
      index.js            Adaptör seçici (VITE_DATA_ADAPTER)
    storage/blobStore.js  IndexedDB blob deposu + object URL yaşam döngüsü
  hooks/                  useRingController, useGsapReveal, useScrollProgress, useReducedMotion
  components/
    common/               ErrorBoundary, LazyImage, Iskelet, HataKutusu, PerdeYukleniyor
    site/                 ShaderArkaPlan, OzelImlec, KilavuzCizgileri, SiteNav,
                          SculptureGallery, SculptureCard, GalleryReadout, AtolyeBolumu, Kolofon
    admin/                ui.jsx (arayüz ilkelleri), GorselKirpmaModali, KorumaliRota
  pages/
    HomePage.jsx
    admin/                AdminLayout, AdminGiris, EserListesi (A1), EserDuzenle (A2),
                          GorselKitapligi, CemberSiralamasi (A4), Sergiler (A5), SiteAyarlari (A6)
```

Yönetim paneli `React.lazy` ile ayrı bir pakete ayrılır; siteyi gezen ziyaretçi panel kodunu indirmez.

---

## Alınan teknik kararlar

**Çember CSS 3D ile, Three.js ile değil.** Tasarım dosyası çemberi `transform-style: preserve-3d`
+ `rotateY(θ) translateZ(780px)` ile kuruyor. Aynı şeyi Three.js ile yapmak eser etiketlerini
texture'a çizmeyi ya da DOM katmanı bindirmeyi gerektirirdi; her ikisi de tasarımdaki keskin
mono tipografiden sapma demek. CSS 3D bunu bedava veriyor, seçilebilir metin ve ekran okuyucu
erişimi korunuyor, bundle'a ~150 KB eklenmiyor.

**Arka plan ham WebGL.** Tasarımdaki fragment shader (fbm gürültü + SDF geometrik formlar +
film greni) iki katman olarak birebir taşındı: zemin katmanı ve `mix-blend-mode: screen` ile
üste binen gren katmanı. Three.js sahne grafiği bu iş için gereksiz ağırlık.

**next/image yerine `LazyImage`.** Vite tabanlı bir React uygulamasında next/image yok.
`LazyImage` aynı işi yapar: `IntersectionObserver` ile görüntü alanına yaklaşana kadar hiçbir
bayt indirilmez, gelene kadar tel kafesteki çapraz haç yer tutucusu durur, sonra bulanıktan
nete geçer. Yükleme sırası `oncelik` prop'u ile ayarlanır.

**Jetonlar kanal üçlüsü olarak tutulur.** `tailwind.config.js` renkleri
`rgb(var(--kb-ink-rgb, 234 234 234) / <alpha-value>)` biçiminde tanımlar, hazır hex olarak
değil. Sebep pratik: Tailwind'in `/opaklık` değiştiricisi (`text-ink/40`, `border-ink/20`)
değeri ancak `<alpha-value>` yer tutucusunu enjekte edebildiğinde çalışır; renk doğrudan
`var(--kb-ink)` yazılırsa o sınıflar **hiç CSS üretmez** ve tel kafesin ince
`rgba(234,234,234,.16)` çerçeveleriyle soluk tipografisi sessizce kaybolur. Kanal biçimi hem
A6'dan çalışma zamanı jeton değişimini hem de koddaki ~345 `/opaklık` kullanımını aynı anda
mümkün kılar. `applyTokens` her jetonu iki biçimde birden yazar: hex (doğrudan CSS için) ve
kanal üçlüsü (Tailwind için).

**Taslak / yayın ayrımı.** Çember sırası ve site ayarları taslak olarak saklanır; site
`yayindakiAyarlariGetir()` ve `yayindakiCemberSirasi()` okur. "Yayınla" denene kadar ziyaretçi
etkilenmez — tel kafes notlarının gereği. Her yayın sürümlenir, A6'dan önceki sürüme dönülebilir.

**Rakamlar canlı.** "15 KAYIT", "ARŞİV 01—15", "11 KAYIT · 4 KİŞİSEL · 7 GRUP",
"POZİSYON ARALIĞI 24°", "15 ESER / 2019—2026" — hiçbiri sabit yazılmadı, hepsi veriden türetilir.
Pozisyon açısı `360 / eserAdedi` ile hesaplanır; eser eklendiğinde çember kendini yeniden dizer.

---

## Yayına çıkarken yapılacaklar

Site şu an **müşteri önizlemesi** olarak yayında ve arama motorlarına kapalı.
Gerçek yayına geçerken sırayla:

1. **`public/robots.txt` sil** (ya da `Disallow: /` satırını kaldır). Bu dosya
   durduğu sürece panelden "indekslensin" açılsa bile arama motorları siteye
   giremez — robots.txt taramayı engeller, sayfadaki meta etiketi okunamaz.
2. **Panelden A6 → SEO → "indekslensin" anahtarını aç.** Bu, `index.html`'deki
   statik `noindex` etiketini çalışma zamanında `index, follow` ile ezer.
3. **`index.html`'deki `og:url` ve `og:image` adreslerini güncelle.** Şu an
   `heykel-tiras-web-sitesi.web.app` yazıyor; kendi alan adına geçince paylaşım
   kartı eski adresi gösterir.
4. Değişiklikleri yayınla: `npx --yes firebase-tools deploy --only hosting`

## Bilinen ve kasıtlı davranışlar

- **A6 kontrast uyarısı varsayılan vurgu renklerinde tetiklenir.** Beton (#35322D) üzerinde
  metal #367C65 için oran 2.57:1, taş #C15D3B için 2.98:1 — ikisi de WCAG AA eşiği olan
  4.5:1'in altında. Bu renkler tasarımın kendisinden geliyor ve yalnızca küçük meta
  etiketlerinde kullanılıyor. Uyarı gizlenmedi; jeton değiştirilirse anında güncellenir.
- **A1 üst çubuğunda "15 KAYIT · 14 YAYINDA" yazar**, tel kafesteki "15 YAYINDA" değil.
  Tel kafes aynı ekranda 05 ARTIK'ı TASLAK gösteriyor; sayı veriden hesaplandığı için
  tutarlı olanı yazılır.
- **Hareket azaltma tercihi** (`prefers-reduced-motion`) açıkken otomatik dönüş, atalet,
  scroll koreografisi ve shader hareketi durur; içerik tamamen erişilebilir kalır.
  A6'da bu ayar yalnızca gösterilir — sistem tercihidir, panelden kapatılamaz.
