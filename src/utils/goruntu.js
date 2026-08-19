/**
 * Görüntü yardımcıları — saf JS, React yok.
 *
 * Neden burada: kırpma modali yalnızca etkileşimden sorumlu olsun; dosya çözme,
 * tuval matematiği ve kodlama kararları (WebP mi JPEG mi) tek yerde dursun ki
 * ileride toplu yeniden üretim (A5 "türevleri yeniden üret") aynı fonksiyonları
 * çağırabilsin.
 */

/** Tel kafes: "JPG / TIFF — MAKS 40MB". */
export const MAKS_BAYT = 40 * 1024 * 1024

/**
 * Dosya seçicinin kabul listesi.
 * TIFF bilinçli olarak burada: fotoğrafçıdan gelen dosyalar çoğunlukla TIFF olur.
 * Tarayıcıların çoğu TIFF çözemez — bu durumda sessizce yutmak yerine
 * `dosyayiOku` açık bir hata fırlatır (aşağıya bkz.).
 */
export const KABUL_EDILEN = 'image/jpeg,image/png,image/tiff,image/webp'

/** Kırpma oranları. `deger` = genişlik / yükseklik; serbest'te oran kaynaktan gelir. */
export const ORANLAR = [
  { ad: '3:4', deger: 3 / 4 },
  { ad: '1:1', deger: 1 },
  { ad: '16:9', deger: 16 / 9 },
  { ad: 'serbest', deger: null },
]

/** Kullanıcıya gösterilebilir görüntü hatası — mesajları arayüz diliyle BÜYÜK HARF. */
export class GoruntuHatasi extends Error {
  constructor(mesaj, kod = 'goruntu') {
    super(mesaj)
    this.name = 'GoruntuHatasi'
    this.kod = kod
  }
}

const bicimHatasi = () =>
  new GoruntuHatasi('TARAYICI BU BİÇİMİ AÇAMIYOR, JPG/PNG YÜKLEYİN.', 'bicim')

/* ---------- dosya çözme ---------- */

/**
 * Bir Blob/File'ı tuvale çizilebilir bir kaynağa çevirir.
 *
 * @param {Blob} dosya
 * @returns {Promise<{bitmap: ImageBitmap|HTMLImageElement, genislik: number, yukseklik: number}>}
 */
export async function dosyayiOku(dosya) {
  if (!(dosya instanceof Blob)) throw new GoruntuHatasi('DOSYA OKUNAMADI.', 'girdi')

  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(dosya)
      // Bazı tarayıcılar bozuk dosyayı 0×0 bitmap olarak döndürür.
      if (bitmap.width && bitmap.height) {
        return { bitmap, genislik: bitmap.width, yukseklik: bitmap.height }
      }
      bitmap.close?.()
    } catch {
      /* CMYK JPEG / TIFF gibi durumlarda <img> yolu bazen başarılı olur */
    }
  }

  return imgIleOku(dosya)
}

function imgIleOku(dosya) {
  return new Promise((cozumle, reddet) => {
    let url
    try {
      url = URL.createObjectURL(dosya)
    } catch {
      reddet(bicimHatasi())
      return
    }
    const img = new Image()
    img.decoding = 'sync'
    img.onload = () => {
      // Çözümlenmiş görüntü bellekte kalır; URL'i burada bırakmak güvenli.
      URL.revokeObjectURL(url)
      if (!img.naturalWidth || !img.naturalHeight) {
        reddet(bicimHatasi())
        return
      }
      cozumle({ bitmap: img, genislik: img.naturalWidth, yukseklik: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reddet(bicimHatasi())
    }
    img.src = url
  })
}

/* ---------- kodlama ---------- */

let webpBellek = null

/** Tarayıcı tuvalden WebP üretebiliyor mu? Sonuç bir kez ölçülüp saklanır. */
export function webpDestekli() {
  if (webpBellek !== null) return webpBellek
  try {
    const tuval = document.createElement('canvas')
    tuval.width = 1
    tuval.height = 1
    webpBellek = tuval.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    webpBellek = false
  }
  return webpBellek
}

function tuvaldenBlob(tuval, tur, kalite) {
  return new Promise((cozumle, reddet) => {
    if (typeof tuval.toBlob !== 'function') {
      reddet(new GoruntuHatasi('TARAYICI GÖRSEL ÜRETEMİYOR.', 'tuval'))
      return
    }
    tuval.toBlob(
      (blob) => (blob ? cozumle(blob) : reddet(new GoruntuHatasi('GÖRSEL ÜRETİLEMEDİ.', 'tuval'))),
      tur,
      kalite,
    )
  })
}

/* ---------- kırpma ---------- */

/**
 * Kaynağı verilen kırpma dikdörtgeninden keser ve hedef boyuta ölçekler.
 *
 * `kirpma` koordinatları DÖNDÜRÜLMÜŞ kaynak uzayındadır: 90°/270° dönüşte
 * genişlik ile yükseklik yer değiştirir. Böylece modal, önizlemede ne
 * görüyorsa birebir onu üretir.
 *
 * @param {object} p
 * @param {ImageBitmap|HTMLImageElement} p.kaynak
 * @param {{x:number,y:number,w:number,h:number,donus?:number}} p.kirpma
 * @param {number} p.hedefGenislik
 * @param {number} p.hedefYukseklik
 * @param {string} [p.tur]     İstenen MIME; desteklenmiyorsa JPEG'e düşer
 * @param {number} [p.kalite]
 * @returns {Promise<{blob: Blob, genislik: number, yukseklik: number, tur: string}>}
 */
export async function kirpVeOlcekle({
  kaynak,
  kirpma,
  hedefGenislik,
  hedefYukseklik,
  tur = 'image/webp',
  kalite = 0.86,
}) {
  if (!kaynak) throw new GoruntuHatasi('KIRPILACAK GÖRSEL YOK.', 'girdi')

  const hedefG = Math.max(1, Math.round(hedefGenislik))
  const hedefY = Math.max(1, Math.round(hedefYukseklik))

  const tuval = document.createElement('canvas')
  tuval.width = hedefG
  tuval.height = hedefY
  const ctx = tuval.getContext('2d')
  if (!ctx) throw new GoruntuHatasi('TUVAL AÇILAMADI.', 'tuval')

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  // Saydam PNG, JPEG'e düşerken siyah leke bırakmasın — sitenin kart zemini.
  ctx.fillStyle = '#211A15'
  ctx.fillRect(0, 0, hedefG, hedefY)

  const kaynakG = kaynak.width ?? kaynak.naturalWidth
  const kaynakY = kaynak.height ?? kaynak.naturalHeight
  const donus = (((kirpma?.donus || 0) % 360) + 360) % 360
  const dik = donus === 90 || donus === 270
  const donukG = dik ? kaynakY : kaynakG
  const donukY = dik ? kaynakG : kaynakY

  const kirpX = Math.max(0, kirpma?.x ?? 0)
  const kirpY = Math.max(0, kirpma?.y ?? 0)
  const kirpEn = Math.max(1, Math.min(kirpma?.w ?? donukG, donukG - kirpX))
  const kirpBoy = Math.max(1, Math.min(kirpma?.h ?? donukY, donukY - kirpY))

  const olcekX = hedefG / kirpEn
  const olcekY = hedefY / kirpBoy

  // Döndürülmüş kaynak uzayı → çıktı tuvali.
  ctx.setTransform(olcekX, 0, 0, olcekY, -kirpX * olcekX, -kirpY * olcekY)
  // Döndürülmüş uzayın merkezine geçip kaynağı oraya oturt.
  ctx.translate(donukG / 2, donukY / 2)
  ctx.rotate((donus * Math.PI) / 180)
  ctx.drawImage(kaynak, -kaynakG / 2, -kaynakY / 2, kaynakG, kaynakY)
  ctx.setTransform(1, 0, 0, 1, 0, 0)

  const istenen = tur === 'image/webp' && !webpDestekli() ? 'image/jpeg' : tur
  const blob = await tuvaldenBlob(tuval, istenen, kalite)

  return { blob, genislik: hedefG, yukseklik: hedefY, tur: blob.type || istenen }
}

/* ---------- çıktı ölçüleri ---------- */

/**
 * Seçilen orana göre üretilecek çıktı boyutu.
 * Çember kartı 3:4 kullandığı için taban ölçü 2400×3200'dür (tel kafes).
 *
 * @param {string} oranAdi
 * @param {number} [kaynakOrani] genişlik/yükseklik — yalnızca 'serbest' için
 */
export function cikisOlculeri(oranAdi, kaynakOrani = 3 / 4) {
  switch (oranAdi) {
    case '1:1':
      return { genislik: 2400, yukseklik: 2400 }
    case '16:9':
      return { genislik: 3200, yukseklik: 1800 }
    case 'serbest': {
      const oran = Number.isFinite(kaynakOrani) && kaynakOrani > 0 ? kaynakOrani : 3 / 4
      // Uzun kenar 3200'e sabitlenir; kısa kenar orandan türer.
      return oran >= 1
        ? { genislik: 3200, yukseklik: Math.max(1, Math.round(3200 / oran)) }
        : { genislik: Math.max(1, Math.round(3200 * oran)), yukseklik: 3200 }
    }
    case '3:4':
    default:
      return { genislik: 2400, yukseklik: 3200 }
  }
}

/** Oran adından sayısal değer; 'serbest' için null. */
export function oranDegeri(oranAdi) {
  return ORANLAR.find((o) => o.ad === oranAdi)?.deger ?? null
}

/* ---------- biçimlendirme ---------- */

/** Bayt sayısını "~ 380 KB" biçiminde okunur metne çevirir. */
export function bayt(n) {
  const sayi = Number(n)
  if (!Number.isFinite(sayi) || sayi <= 0) return '—'
  if (sayi < 1024) return `~ ${Math.round(sayi)} B`
  if (sayi < 1024 * 1024) return `~ ${Math.round(sayi / 1024)} KB`
  return `~ ${(sayi / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}
