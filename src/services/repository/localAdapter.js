/**
 * Yerel depo adaptörü — Firebase olmadan tam çalışan uygulama.
 *
 * Üstveri localStorage'da JSON olarak, görsellerin ikili verisi IndexedDB'de
 * (bkz. storage/blobStore.js) durur. Sözleşme services/repository/contract.js.
 */
import { DepoHatasi, kimlikUret, sirayiYenidenNumarala } from './contract.js'
import { tohumDurum, SERGILER as TOHUM_SERGILER, VARSAYILAN_AYARLAR } from '../../data/seed.js'
import * as blob from '../storage/blobStore.js'

const ANAHTAR = 'kese-benav/durum'
const SEMA_SURUMU = 2

const gecikme = Number(import.meta.env?.VITE_SAHTE_GECIKME ?? (import.meta.env?.DEV ? 180 : 0))
const bekle = () => (gecikme > 0 ? new Promise((r) => setTimeout(r, gecikme)) : Promise.resolve())

let durum = null
const dinleyiciler = new Set()

/* ---------- kalıcılık ---------- */

function yukle() {
  if (durum) return durum
  let ham = null
  try {
    ham = typeof localStorage !== 'undefined' ? localStorage.getItem(ANAHTAR) : null
  } catch {
    ham = null
  }
  if (ham) {
    try {
      const cozulen = JSON.parse(ham)
      if (cozulen?.durum) {
        const gocmus = gocur(cozulen.durum, cozulen.semaSurumu ?? 0)
        if (gocmus) {
          durum = gocmus
          if (cozulen.semaSurumu !== SEMA_SURUMU) kaydet()
          return durum
        }
      }
    } catch {
      /* bozuk kayıt — tohumla baştan başla */
    }
  }
  durum = tohumDurum()
  kaydet()
  return durum
}

/**
 * Şema göçü.
 *
 * Kullanıcının tarayıcısında zaten veri var; şema değişince hepsini silip tohuma
 * dönmek girilmiş kayıtları yok ederdi. Bunun yerine eksik alanlar varsayılanla
 * doldurulur. Tanınmayan (gelecekten gelen) bir sürüm görülürse null dönülür ve
 * çağıran tohuma düşer — bilmediğimiz bir şekli tahminle onarmak daha kötü.
 *
 * v1 → v2: sergilere baslangic/bitis/aciklama/afis/baglanti eklendi.
 */
function gocur(d, surum) {
  if (surum > SEMA_SURUMU) return null
  let cikti = d
  if (surum < 2) {
    /*
     * Dokunulmamış tohum kayıtlarını sadece boş alanlarla doldurmak yetmiyordu:
     * tarihler v2 ile TOHUM VERİYE geldi, göçte null yazınca yaklaşan sergi
     * tarihsiz kalıyor ve duyuru şeridi hiç basılmıyordu. Bu yüzden kullanıcının
     * ELLE DEĞİŞTİRMEDİĞİ kayıtlar tohumun yeni sürümünü alır; değiştirilmiş
     * olanlar korunur ve yalnızca eksik alanları varsayılanla tamamlanır.
     * "Değiştirilmemiş" ölçütü v1'de var olan alanların birebir eşitliğidir.
     */
    const tohum = new Map(TOHUM_SERGILER.map((t) => [t.id, t]))
    const V1_ALANLARI = ['yil', 'ad', 'mekan', 'sehir', 'tur']
    const ayni = (a, b) =>
      V1_ALANLARI.every((k) => a[k] === b[k]) &&
      (a.eserIdleri || []).length === (b.eserIdleri || []).length &&
      (a.eserIdleri || []).every((x, i) => x === b.eserIdleri[i])

    cikti = {
      ...cikti,
      sergiler: (cikti.sergiler || []).map((s) => {
        const t = tohum.get(s.id)
        if (t && ayni(s, t)) return { ...t, eserIdleri: [...t.eserIdleri], afis: t.afis ? { ...t.afis } : null }
        return { baslangic: null, bitis: null, aciklama: '', afis: null, baglanti: '', ...s }
      }),
    }
  }
  return cikti
}

function kaydet() {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(ANAHTAR, JSON.stringify({ semaSurumu: SEMA_SURUMU, durum }))
    }
  } catch (h) {
    // Kota dolduysa sessizce geçme — çağıran bilsin.
    throw new DepoHatasi('Yerel depolama alanı dolu; değişiklik kaydedilemedi.', { kod: 'kota', sebep: h })
  }
}

function duyur() {
  for (const d of dinleyiciler) {
    try {
      d()
    } catch {
      /* bir dinleyicinin hatası diğerlerini engellemesin */
    }
  }
}

function yaz(degistir) {
  const d = yukle()
  degistir(d)
  kaydet()
  duyur()
}

const kopya = (v) => structuredClone(v)

/* ---------- eserler ---------- */

async function eserleriGetir() {
  await bekle()
  return kopya(yukle().eserler)
}

async function eserGetir(id) {
  await bekle()
  const e = yukle().eserler.find((x) => x.id === id)
  return e ? kopya(e) : null
}

async function eserOlustur(taslak) {
  await bekle()
  const id = kimlikUret('eser')
  const simdi = Date.now()
  let olusan
  yaz((d) => {
    const enBuyukSira = d.eserler.reduce((m, e) => Math.max(m, e.sira), -1)
    olusan = {
      ...taslak,
      id,
      sira: taslak.sira ?? enBuyukSira + 1,
      gorseller: taslak.gorseller ?? [],
      anaGorselId: taslak.anaGorselId ?? null,
      olusturuldu: simdi,
      guncellendi: simdi,
    }
    d.eserler.push(olusan)
    d.eserler = sirayiYenidenNumarala(d.eserler)
    olusan = d.eserler.find((e) => e.id === id)
  })
  return kopya(olusan)
}

async function eserGuncelle(id, yama) {
  await bekle()
  let sonuc = null
  yaz((d) => {
    const i = d.eserler.findIndex((e) => e.id === id)
    if (i < 0) throw new DepoHatasi('Eser bulunamadı.', { kod: 'yok' })
    d.eserler[i] = { ...d.eserler[i], ...yama, id, guncellendi: Date.now() }
    if ('cemberde' in yama) d.eserler = sirayiYenidenNumarala(d.eserler)
    sonuc = d.eserler.find((e) => e.id === id)
  })
  return kopya(sonuc)
}

async function eserleriSil(idler) {
  await bekle()
  const kume = new Set(idler)
  const silinecekGorseller = []
  yaz((d) => {
    for (const e of d.eserler) {
      if (kume.has(e.id)) for (const g of e.gorseller || []) silinecekGorseller.push(g.id)
    }
    d.eserler = sirayiYenidenNumarala(d.eserler.filter((e) => !kume.has(e.id)))
    d.sergiler = d.sergiler.map((s) => ({ ...s, eserIdleri: s.eserIdleri.filter((x) => !kume.has(x)) }))
  })
  await Promise.all(
    silinecekGorseller.map(async (gid) => {
      blob.urlBirak(gid)
      await blob.sil(gid)
    }),
  )
}

async function topluGuncelle(idler, yama) {
  await bekle()
  const kume = new Set(idler)
  let sonuc = []
  yaz((d) => {
    d.eserler = d.eserler.map((e) => (kume.has(e.id) ? { ...e, ...yama, guncellendi: Date.now() } : e))
    if ('cemberde' in yama) d.eserler = sirayiYenidenNumarala(d.eserler)
    sonuc = d.eserler.filter((e) => kume.has(e.id))
  })
  return kopya(sonuc)
}

/* ---------- çember sırası ---------- */

async function cemberSirasiKaydet(sirali) {
  await bekle()
  let sonuc = []
  yaz((d) => {
    const konum = new Map(sirali.map((id, i) => [id, i]))
    d.eserler = d.eserler.map((e) => (konum.has(e.id) ? { ...e, sira: konum.get(e.id) } : e))
    sonuc = d.eserler
  })
  return kopya(sonuc)
}

async function cemberSirasiYayinla(sirali) {
  await cemberSirasiKaydet(sirali)
  let yayin
  yaz((d) => {
    const sonSurum = d.yayinlar.reduce((m, y) => Math.max(m, y.surum), 0)
    yayin = {
      id: kimlikUret('yayin'),
      surum: sonSurum + 1,
      zaman: Date.now(),
      ayarlar: kopya(d.ayarlar),
      cemberSirasi: [...sirali],
    }
    d.yayinlar.push(yayin)
  })
  return kopya(yayin)
}

/* ---------- görseller ---------- */

async function gorselYukle(eserId, dosya, ustveri = {}) {
  if (!(dosya instanceof Blob)) throw new DepoHatasi('Geçersiz dosya.', { kod: 'girdi' })
  const gorselId = kimlikUret('gorsel')
  await blob.yaz(gorselId, dosya)
  const kayit = {
    id: gorselId,
    url: null, // çalışma zamanında blobStore.urlAl(id) ile üretilir
    alt: ustveri.alt || '',
    genislik: ustveri.genislik || 0,
    yukseklik: ustveri.yukseklik || 0,
    kaynakAdi: ustveri.kaynakAdi || '',
    kaynakBayt: dosya.size,
    kirpma: ustveri.kirpma || null,
    oran: ustveri.oran || '3:4',
  }
  let sonuc = null
  yaz((d) => {
    const i = d.eserler.findIndex((e) => e.id === eserId)
    if (i < 0) throw new DepoHatasi('Eser bulunamadı.', { kod: 'yok' })
    const e = d.eserler[i]
    const gorseller = [...(e.gorseller || []), kayit]
    d.eserler[i] = {
      ...e,
      gorseller,
      anaGorselId: ustveri.anaYap || !e.anaGorselId ? gorselId : e.anaGorselId,
      guncellendi: Date.now(),
    }
    sonuc = d.eserler[i]
  })
  return kopya(sonuc)
}

async function gorselSil(eserId, gorselId) {
  await bekle()
  yaz((d) => {
    const i = d.eserler.findIndex((e) => e.id === eserId)
    if (i < 0) throw new DepoHatasi('Eser bulunamadı.', { kod: 'yok' })
    const e = d.eserler[i]
    const kalan = (e.gorseller || []).filter((g) => g.id !== gorselId)
    d.eserler[i] = {
      ...e,
      gorseller: kalan,
      anaGorselId: e.anaGorselId === gorselId ? (kalan[0]?.id ?? null) : e.anaGorselId,
      guncellendi: Date.now(),
    }
  })
  blob.urlBirak(gorselId)
  await blob.sil(gorselId)
}

async function anaGorselAta(eserId, gorselId) {
  return eserGuncelle(eserId, { anaGorselId: gorselId })
}

async function gorselUstveriGuncelle(eserId, gorselId, yama) {
  await bekle()
  let sonuc = null
  yaz((d) => {
    const i = d.eserler.findIndex((e) => e.id === eserId)
    if (i < 0) throw new DepoHatasi('Eser bulunamadı.', { kod: 'yok' })
    const e = d.eserler[i]
    d.eserler[i] = {
      ...e,
      gorseller: (e.gorseller || []).map((g) => (g.id === gorselId ? { ...g, ...yama, id: gorselId } : g)),
      guncellendi: Date.now(),
    }
    sonuc = d.eserler[i]
  })
  return kopya(sonuc)
}

/* ---------- süreç kareleri ---------- */

async function surecKareleriniGetir() {
  await bekle()
  return kopya(yukle().surecKareleri).sort((a, b) => a.sira - b.sira)
}

async function surecKaresiGuncelle(id, yama) {
  await bekle()
  let sonuc = null
  yaz((d) => {
    const i = d.surecKareleri.findIndex((s) => s.id === id)
    if (i < 0) throw new DepoHatasi('Süreç karesi bulunamadı.', { kod: 'yok' })
    d.surecKareleri[i] = { ...d.surecKareleri[i], ...yama, id }
    sonuc = d.surecKareleri[i]
  })
  return kopya(sonuc)
}

/* ---------- sergiler ---------- */

async function sergileriGetir() {
  await bekle()
  return kopya(yukle().sergiler).sort((a, b) => b.yil - a.yil || a.ad.localeCompare(b.ad, 'tr'))
}

async function sergiOlustur(taslak) {
  await bekle()
  const id = kimlikUret('sergi')
  let olusan
  yaz((d) => {
    olusan = { eserIdleri: [], ...taslak, id }
    d.sergiler.push(olusan)
  })
  return kopya(olusan)
}

async function sergiGuncelle(id, yama) {
  await bekle()
  let sonuc = null
  yaz((d) => {
    const i = d.sergiler.findIndex((s) => s.id === id)
    if (i < 0) throw new DepoHatasi('Sergi bulunamadı.', { kod: 'yok' })
    d.sergiler[i] = { ...d.sergiler[i], ...yama, id }
    sonuc = d.sergiler[i]
  })
  return kopya(sonuc)
}

async function sergiSil(id) {
  await bekle()
  yaz((d) => {
    d.sergiler = d.sergiler.filter((s) => s.id !== id)
  })
}

/**
 * Sergi afişi yükler. Eser görsellerinden ayrı tutuluyor çünkü sergi tek bir
 * afiş taşır (galeri koleksiyonu değil) ve çember kartı gibi 3:4'e zorlanmaz.
 * İkili veri yine blobStore'da; kayıtta yalnızca üstveri durur.
 */
async function afisYukle(sergiId, dosya, ustveri = {}) {
  if (!(dosya instanceof Blob)) throw new DepoHatasi('Geçersiz dosya.', { kod: 'girdi' })
  const gorselId = kimlikUret('afis')
  await blob.yaz(gorselId, dosya)
  const kayit = {
    id: gorselId,
    url: null,
    alt: ustveri.alt || '',
    genislik: ustveri.genislik || 0,
    yukseklik: ustveri.yukseklik || 0,
    kaynakAdi: ustveri.kaynakAdi || '',
    kaynakBayt: dosya.size,
    kirpma: ustveri.kirpma || null,
    oran: ustveri.oran || 'serbest',
  }
  let sonuc = null
  let eskiId = null
  yaz((d) => {
    const i = d.sergiler.findIndex((x) => x.id === sergiId)
    if (i < 0) throw new DepoHatasi('Sergi bulunamadı.', { kod: 'yok' })
    eskiId = d.sergiler[i].afis?.id ?? null
    d.sergiler[i] = { ...d.sergiler[i], afis: kayit }
    sonuc = d.sergiler[i]
  })
  // Bir sergi tek afiş taşır; yenisi gelince eskisinin ikili verisi boşa yer kaplamasın.
  if (eskiId && eskiId !== gorselId) {
    blob.urlBirak(eskiId)
    await blob.sil(eskiId)
  }
  return kopya(sonuc)
}

async function afisSil(sergiId) {
  await bekle()
  let eskiId = null
  yaz((d) => {
    const i = d.sergiler.findIndex((x) => x.id === sergiId)
    if (i < 0) throw new DepoHatasi('Sergi bulunamadı.', { kod: 'yok' })
    eskiId = d.sergiler[i].afis?.id ?? null
    d.sergiler[i] = { ...d.sergiler[i], afis: null }
  })
  if (eskiId) {
    blob.urlBirak(eskiId)
    await blob.sil(eskiId)
  }
}

/* ---------- ayarlar & yayınlar ---------- */

async function ayarlariGetir() {
  await bekle()
  return kopya(yukle().ayarlar)
}

async function ayarlariKaydet(yama) {
  await bekle()
  let sonuc = null
  yaz((d) => {
    d.ayarlar = birlestir(d.ayarlar, yama)
    sonuc = d.ayarlar
  })
  return kopya(sonuc)
}

/** İç içe nesneleri alan bazında birleştirir (dizileri değiştirmeden kopyalar). */
function birlestir(hedef, yama) {
  if (!yama) return hedef
  const cikti = { ...hedef }
  for (const [k, v] of Object.entries(yama)) {
    cikti[k] = v && typeof v === 'object' && !Array.isArray(v) ? birlestir(hedef?.[k] || {}, v) : v
  }
  return cikti
}

async function ayarlariYayinla() {
  await bekle()
  let yayin
  yaz((d) => {
    const sonSurum = d.yayinlar.reduce((m, y) => Math.max(m, y.surum), 0)
    const sonCember = d.yayinlar.at(-1)?.cemberSirasi ?? []
    yayin = {
      id: kimlikUret('yayin'),
      surum: sonSurum + 1,
      zaman: Date.now(),
      ayarlar: kopya(d.ayarlar),
      cemberSirasi: [...sonCember],
    }
    d.yayinlar.push(yayin)
  })
  return kopya(yayin)
}

async function yayinlariGetir() {
  await bekle()
  return kopya(yukle().yayinlar).sort((a, b) => b.surum - a.surum)
}

async function yayinaDon(yayinId) {
  await bekle()
  let yeni
  yaz((d) => {
    const hedef = d.yayinlar.find((y) => y.id === yayinId)
    if (!hedef) throw new DepoHatasi('Sürüm bulunamadı.', { kod: 'yok' })
    const sonSurum = d.yayinlar.reduce((m, y) => Math.max(m, y.surum), 0)
    yeni = {
      id: kimlikUret('yayin'),
      surum: sonSurum + 1,
      zaman: Date.now(),
      ayarlar: kopya(hedef.ayarlar),
      cemberSirasi: [...hedef.cemberSirasi],
      geriDonulen: hedef.surum,
    }
    d.yayinlar.push(yeni)
    d.ayarlar = kopya(hedef.ayarlar)
    const konum = new Map(hedef.cemberSirasi.map((id, i) => [id, i]))
    d.eserler = d.eserler.map((e) => (konum.has(e.id) ? { ...e, sira: konum.get(e.id) } : e))
  })
  return kopya(yeni)
}

async function yayindakiAyarlariGetir() {
  await bekle()
  const d = yukle()
  const son = d.yayinlar.reduce((a, b) => (a && a.surum > b.surum ? a : b), null)
  return kopya(son?.ayarlar ?? VARSAYILAN_AYARLAR)
}

/** Sitenin göstereceği çember sırası: yayınlanmış sıra + sonradan eklenen yayındaki eserler. */
async function yayindakiCemberSirasi() {
  await bekle()
  const d = yukle()
  const son = d.yayinlar.reduce((a, b) => (a && a.surum > b.surum ? a : b), null)
  const yayinlanan = son?.cemberSirasi ?? []
  const uygun = d.eserler.filter((e) => e.cemberde && e.durum === 'yayinda')
  const uygunKume = new Set(uygun.map((e) => e.id))
  const sirali = yayinlanan.filter((id) => uygunKume.has(id))
  const eklenmis = new Set(sirali)
  for (const e of uygun.slice().sort((a, b) => a.sira - b.sira)) {
    if (!eklenmis.has(e.id)) sirali.push(e.id)
  }
  return sirali
}

/**
 * Bir görselin görüntülenebilir adresi.
 *
 * Yüklenen görsellerin ikili verisi IndexedDB'dedir ve object URL üretilir.
 * Tohum verisiyle gelen taslak kareler ise public/taslak/ altında statik
 * dosyalardır: ikili verileri yoktur, kayıtta doğrudan `url` alanı taşırlar.
 * Bileşenler yalnızca görsel kimliği bildiği için ayrımı burada yapıyoruz.
 */
async function gorselUrl(gorselId) {
  if (!gorselId) return null
  const nesne = await blob.urlAl(gorselId)
  if (nesne) return nesne
  const d = yukle()
  for (const e of d.eserler) {
    const g = (e.gorseller || []).find((x) => x.id === gorselId)
    if (g?.url) return g.url
  }
  for (const s of d.surecKareleri) {
    if (s.gorsel?.id === gorselId && s.gorsel.url) return s.gorsel.url
  }
  for (const s of d.sergiler) {
    if (s.afis?.id === gorselId && s.afis.url) return s.afis.url
  }
  return null
}

/* ---------- abonelik & bakım ---------- */

function abone(dinleyici) {
  dinleyiciler.add(dinleyici)
  return () => dinleyiciler.delete(dinleyici)
}

/** Testler ve "tohum verisine dön" eylemi için. */
async function sifirla() {
  const d = yukle()
  const idler = d.eserler.flatMap((e) => (e.gorseller || []).map((g) => g.id))
  await Promise.all(idler.map((id) => blob.sil(id)))
  blob.tumUrlleriBirak()
  durum = tohumDurum()
  kaydet()
  duyur()
}

/** Tam yedek — A6 "YEDEK" sekmesi. */
async function disaAktar() {
  await bekle()
  return { semaSurumu: SEMA_SURUMU, disaAktarma: Date.now(), durum: kopya(yukle()) }
}

async function iceAktar(paket) {
  if (paket?.semaSurumu !== SEMA_SURUMU || !paket.durum) {
    throw new DepoHatasi('Yedek dosyası bu sürümle uyumlu değil.', { kod: 'sema' })
  }
  durum = kopya(paket.durum)
  kaydet()
  duyur()
  return kopya(durum)
}

export const yerelDepo = {
  ad: 'yerel',
  eserleriGetir,
  eserGetir,
  eserOlustur,
  eserGuncelle,
  eserleriSil,
  topluGuncelle,
  cemberSirasiKaydet,
  cemberSirasiYayinla,
  gorselYukle,
  gorselSil,
  anaGorselAta,
  gorselUstveriGuncelle,
  surecKareleriniGetir,
  surecKaresiGuncelle,
  sergileriGetir,
  sergiOlustur,
  sergiGuncelle,
  sergiSil,
  afisYukle,
  afisSil,
  ayarlariGetir,
  ayarlariKaydet,
  ayarlariYayinla,
  yayinlariGetir,
  yayinaDon,
  yayindakiAyarlariGetir,
  yayindakiCemberSirasi,
  gorselUrl,
  gorselKalici: blob.kalici,
  abone,
  sifirla,
  disaAktar,
  iceAktar,
}

export default yerelDepo
