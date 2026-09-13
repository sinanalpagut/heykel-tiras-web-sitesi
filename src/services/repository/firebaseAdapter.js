/**
 * Firebase depo adaptörü — yerel adaptörle BİREBİR aynı sözleşme.
 *
 * Sözleşme: services/repository/contract.js. Arayüz kodunun tek satırı
 * değişmeden çalışması gerekir; bu yüzden metot adları, dönüş şekilleri ve
 * hata mesajları localAdapter.js ile eşleştirilmiştir.
 *
 * Koleksiyonlar:
 *   eserler/{eserId}          Eser belgeleri (gorseller dizisi belgenin içinde)
 *   surecKareleri/{id}        Atölye süreç kareleri
 *   sergiler/{id}             Sergi kayıtları
 *   ayarlar/site              TEK belge — taslak (yayınlanmamış) site ayarları
 *   yayinlar/{yayinId}        Yayın geçmişi; sitenin gördüğü ayar ve çember sırası
 *   yoneticiler/{uid}         Yalnızca varlığı önemli — yazma yetkisinin kaynağı
 *
 * Yerel adaptörden TEK gerçek davranış farkı görsellerde:
 *   Yerelde ikili veri IndexedDB'de durur ve `gorselUrl(id)` her seferinde
 *   blob'tan bir object URL üretir; `gorsel.url` alanı null'dur.
 *   Burada ikili veri Storage'a gider, `getDownloadURL` ile alınan KALICI url
 *   doğrudan `gorsel.url` alanına yazılır ve `gorselUrl(id)` bu alanı okur.
 *   Yani orada URL çalışma zamanında üretiliyordu, burada veriden okunuyor.
 */
import { DepoHatasi, kimlikUret, SEMA_SURUMU, sirayiYenidenNumarala } from './contract.js'
import { VARSAYILAN_AYARLAR } from '../../data/seed.js'
import { authAl, firestoreAl, storageAl } from '../firebase.js'

/** writeBatch üst sınırı 500'dür; güvenli payla parçalıyoruz. */
const YIGIN_BOYU = 400

const AYAR_BELGESI = ['ayarlar', 'site']

let db = null

/* ---------- SDK modülleri (tembel + tekil) ---------- */

let fsSoz = null
const fsAl = () => (fsSoz ??= import('firebase/firestore'))

let stSoz = null
const stMod = () => (stSoz ??= import('firebase/storage'))

async function dbAl() {
  if (db) return db
  db = await firestoreAl()
  if (!db) throw new DepoHatasi('Firebase yapılandırması eksik.', { kod: 'yapilandirma' })
  return db
}

/* ---------- hata sarmalama ---------- */

/** Firebase hata kodlarını sözleşmenin anladığı kısa kodlara çevirir. */
function kodCevir(hata, varsayilan) {
  const kod = hata?.code
  if (kod === 'permission-denied' || kod === 'storage/unauthorized') return 'yetki'
  if (kod === 'unauthenticated') return 'oturum'
  if (kod === 'not-found' || kod === 'storage/object-not-found') return 'yok'
  if (kod === 'unavailable' || kod === 'storage/retry-limit-exceeded') return 'baglanti'
  if (kod === 'resource-exhausted' || kod === 'storage/quota-exceeded') return 'kota'
  if (kod === 'failed-precondition') return 'indeks'
  return varsayilan
}

/** Her genel metot bunun içinden geçer; ham Firebase hatası dışarı sızmaz. */
async function sar(mesaj, varsayilanKod, isi) {
  try {
    return await isi()
  } catch (hata) {
    if (hata instanceof DepoHatasi) throw hata
    const kod = kodCevir(hata, varsayilanKod)
    const ek =
      kod === 'yetki'
        ? ' Bu işlem için yönetici oturumu gerekiyor (yoneticiler/{uid} belgesi).'
        : kod === 'indeks'
          ? ' Gerekli Firestore indeksi eksik — firestore.indexes.json dosyasını yayınlayın.'
          : ''
    throw new DepoHatasi(mesaj + ek, { kod, sebep: hata })
  }
}

/* ---------- veri temizliği ---------- */

/**
 * Firestore undefined değer kabul etmez; alan yazılmadan önce temizlenir.
 * null yazılabilir, o yüzden null korunur (anaGorselId: null anlamlıdır).
 */
function temizle(deger) {
  if (Array.isArray(deger)) return deger.filter((v) => v !== undefined).map(temizle)
  if (deger && typeof deger === 'object' && !(deger instanceof Date)) {
    const cikti = {}
    for (const [anahtar, v] of Object.entries(deger)) {
      if (v === undefined) continue
      cikti[anahtar] = temizle(v)
    }
    return cikti
  }
  return deger
}

const kopya = (v) => structuredClone(v)

/** Belge anlığını düz nesneye çevirir; id her zaman belge kimliğidir. */
const belge = (anlik) => ({ ...anlik.data(), id: anlik.id })

/** Eserde şemanın beklediği diziler her zaman bulunsun. */
function eserBicimle(anlik) {
  const e = belge(anlik)
  e.gorseller = e.gorseller ?? []
  e.etiketler = e.etiketler ?? []
  urlleriBellegeAl(e)
  return e
}

/* ---------- yönetici tespiti ---------- */

/**
 * Neden gerekli: kurallar taslak eserleri yalnızca yöneticiye açıyor. Ziyaretçi
 * için tüm koleksiyonu sorgulamak "permission-denied" ile döner. Bu yüzden
 * sorguyu role göre kuruyoruz — kural neyi engelliyorsa istemci onu istemiyor.
 */
let auth = null
let oturumSozu = null
let yoneticiOnbellegi = { uid: null, sonuc: false }

function oturumHazir() {
  if (oturumSozu) return oturumSozu
  oturumSozu = (async () => {
    auth = await authAl()
    if (!auth) return null
    const { onAuthStateChanged } = await import('firebase/auth')
    // İlk durum eşzamansız gelir; ilk okumadan önce bir kez beklenir.
    return new Promise((cozumle) => {
      const dur = onAuthStateChanged(
        auth,
        (kullanici) => {
          dur()
          cozumle(kullanici ?? null)
        },
        () => {
          dur()
          cozumle(null)
        },
      )
    })
  })()
  return oturumSozu
}

/** Kuralların tanımıyla aynı ölçüt: /yoneticiler/{uid} belgesi var mı? */
async function yoneticiKontrol() {
  await oturumHazir()
  const uid = auth?.currentUser?.uid ?? null
  if (!uid) {
    yoneticiOnbellegi = { uid: null, sonuc: false }
    return false
  }
  if (yoneticiOnbellegi.uid === uid) return yoneticiOnbellegi.sonuc
  try {
    const [{ doc, getDoc }, veritabani] = await Promise.all([fsAl(), dbAl()])
    const anlik = await getDoc(doc(veritabani, 'yoneticiler', uid))
    yoneticiOnbellegi = { uid, sonuc: anlik.exists() }
  } catch {
    /* Okuma düştüyse (geçici ağ kesintisi, App Check, kural hatası) "yönetici
       değil" sonucunu ÖNBELLEĞE ALMA. Alsaydı yönetici oturumun geri kalanında
       ziyaretçi gibi davranırdı: panelde taslak eserler sessizce listeden ve
       sayaçtan düşer, taslak bir eserin adresi "silinmiş olabilir" derdi —
       sayfa yenilemek bile düzeltmezdi, çünkü uid aynı. Önbelleği boş bırakıp
       false dönüyoruz; bir sonraki çağrı yeniden dener. */
    yoneticiOnbellegi = { uid: null, sonuc: false }
    return false
  }
  return yoneticiOnbellegi.sonuc
}

/* ---------- yığın yazma ---------- */

/**
 * @param {Array<(yigin: import('firebase/firestore').WriteBatch) => void>} islemler
 */
async function yiginYaz(islemler) {
  if (islemler.length === 0) return
  const [{ writeBatch }, veritabani] = await Promise.all([fsAl(), dbAl()])
  for (let i = 0; i < islemler.length; i += YIGIN_BOYU) {
    const yigin = writeBatch(veritabani)
    for (const isle of islemler.slice(i, i + YIGIN_BOYU)) isle(yigin)
    await yigin.commit()
  }
}

/* ---------- abonelik ---------- */

const dinleyiciler = new Set()
let kapatmalar = []
let kurulumSozu = null
let duyuruZamanlayici = null

/* Kurulum nesli. Son abone ayrılıp hemen yenisi geldiğinde (StrictMode'un çift
   bağlaması, ya da /admin içinde rota değişimi) eski kurulum HÂLÂ uçuşta olabilir:
   `kurulumSozu` null'lanır, `dinlemeyiBirak()` henüz boş olan diziyi temizler ve
   ikinci bir kurulum başlar. İkisi de tamamlanınca her koleksiyon iki kez dinlenir
   ve bu fazlalık oturum boyunca kapanmaz — uzaktan gelen her değişiklikte belge
   okumaları ikiye katlanır. Nesil numarası bunu keser: kurulum bittiğinde nesli
   değişmişse kendi açtıklarını derhal kapatır. */
let kurulumNesli = 0

/** Duyuru penceresi (ms) — aşağıdaki nedenle vardır, bkz. `duyur`. */
const DUYURU_PENCERESI = 60

function duyurHemen() {
  duyuruZamanlayici = null
  for (const dinleyici of [...dinleyiciler]) {
    try {
      dinleyici()
    } catch {
      /* bir dinleyicinin hatası diğerlerini engellemesin */
    }
  }
}

/**
 * Değişiklik duyurusu — kısa bir pencerede toplanır.
 *
 * Her yazmadan sonra iki uyarı gelir: kendi `duyur()` çağrımız (panel
 * beklemesin diye) ve saniyeler değil milisaniyeler sonra onSnapshot'ın
 * yankısı. Üstelik bir eser silme hem eserler hem sergiler dinleyicisini
 * tetikler. Her uyarı ekrandaki HER `useDepoVerisi` çağrısını yeniden okutur;
 * yerel adaptörde bedava olan bu tazeleme burada ağ isteğidir. Pencere
 * içindeki uyarılar tek tazelemeye iner.
 */
function duyur() {
  if (duyuruZamanlayici) return
  duyuruZamanlayici = setTimeout(duyurHemen, DUYURU_PENCERESI)
}

function dinlemeyiBirak() {
  for (const kapat of kapatmalar) {
    try {
      kapat()
    } catch {
      /* zaten kapanmış olabilir */
    }
  }
  kapatmalar = []
}

async function dinlemeyiKur() {
  if (kurulumSozu) return kurulumSozu
  const nesil = ++kurulumNesli
  kurulumSozu = (async () => {
    const [fs, veritabani] = await Promise.all([fsAl(), dbAl()])
    const { collection, doc, limit, onSnapshot, orderBy, query, where } = fs
    const yonetici = await yoneticiKontrol()

    // Kapatmalar önce YERELE toplanır; ancak kurulum güncel kalırsa paylaşılan
    // `kapatmalar` dizisine geçer (bkz. kurulumNesli).
    const yerelKapatmalar = []
    const izle = (hedef, isle) => {
      let ilk = true
      yerelKapatmalar.push(
        onSnapshot(
          hedef,
          (anlik) => {
            isle?.(anlik)
            // İlk anlık zaten okuma yaptığımız veriyi getirir; gereksiz tazeleme yapma.
            if (ilk) {
              ilk = false
              return
            }
            duyur()
          },
          (hata) => console.error('[depo] Canlı dinleme koptu.', hata),
        ),
      )
    }

    izle(
      yonetici
        ? collection(veritabani, 'eserler')
        : query(collection(veritabani, 'eserler'), where('durum', '==', 'yayinda'), orderBy('sira')),
      (anlik) => anlik.docs.forEach((d) => urlleriBellegeAl(belge(d))),
    )
    izle(collection(veritabani, 'sergiler'), (anlik) =>
      anlik.docs.forEach((d) => gorseliBellegeAl(belge(d).afis)),
    )
    // Atölye şeridi de canlı dinlenir: hem karenin fotoğrafı panelden değişince
    // site tazelensin, hem de afiş/kare URL'leri önbelleğe girsin.
    izle(collection(veritabani, 'surecKareleri'), (anlik) =>
      anlik.docs.forEach((d) => gorseliBellegeAl(belge(d).gorsel)),
    )
    // Taslak ayarlar yalnızca yöneticiye açık; ziyaretçi yerine yayınları dinler.
    if (yonetici) izle(doc(veritabani, ...AYAR_BELGESI))
    izle(query(collection(veritabani, 'yayinlar'), orderBy('surum', 'desc'), limit(1)))

    // Kurulum sırasında son abone ayrılmış ya da yeni bir kurulum başlamış
    // olabilir; her iki durumda da BU kurulumun açtıkları fazlalıktır.
    if (nesil !== kurulumNesli || dinleyiciler.size === 0) {
      for (const kapat of yerelKapatmalar) {
        try {
          kapat()
        } catch {
          /* zaten kapanmış olabilir */
        }
      }
      return
    }
    kapatmalar.push(...yerelKapatmalar)
  })()
  kurulumSozu.catch((hata) => {
    console.error('[depo] Dinleyiciler kurulamadı.', hata)
    kurulumSozu = null
  })
  return kurulumSozu
}

function abone(dinleyici) {
  dinleyiciler.add(dinleyici)
  if (dinleyiciler.size === 1) dinlemeyiKur()
  return () => {
    dinleyiciler.delete(dinleyici)
    if (dinleyiciler.size === 0) {
      kurulumSozu = null
      clearTimeout(duyuruZamanlayici)
      duyuruZamanlayici = null
      dinlemeyiBirak()
    }
  }
}

/* ---------- eserler ---------- */

/**
 * Yerel adaptör eserleri EKLENME sırasında döndürür; çember sırası isteyen
 * ekranlar (cemberEserleri, CemberSiralamasi) zaten kendileri `sira`ya göre
 * sıralar. Aynı diziyi vermek için okumaları oluşturulma anına göre diziyoruz —
 * yoksa `sira: -1` alan çember dışı eserler listenin başına yığılırdı.
 */
const eklenmeSirasi = (a, b) => (a.olusturuldu ?? 0) - (b.olusturuldu ?? 0) || a.id.localeCompare(b.id)

/** Yönetici okuması: taslak ve arşiv dahil her şey. */
async function tumEserler() {
  const [{ collection, getDocs }, veritabani] = await Promise.all([fsAl(), dbAl()])
  const anlik = await getDocs(collection(veritabani, 'eserler'))
  return anlik.docs.map(eserBicimle).sort(eklenmeSirasi)
}

/**
 * Ziyaretçi okuması. Sorgunun `durum` süzgeci ŞART: kurallar liste sorgusunu
 * belge belge doğrular, süzgeçsiz bir sorgu ilk taslakta tümden reddedilir.
 * `orderBy('sira')` ile birlikte (durum, sira) bileşik indeksini kullanır.
 */
async function yayindakiEserler() {
  const [{ collection, getDocs, orderBy, query, where }, veritabani] = await Promise.all([fsAl(), dbAl()])
  const anlik = await getDocs(
    query(collection(veritabani, 'eserler'), where('durum', '==', 'yayinda'), orderBy('sira')),
  )
  return anlik.docs.map(eserBicimle).sort(eklenmeSirasi)
}

async function eserleriGetir() {
  return sar('Eserler okunamadı.', 'okuma', async () =>
    (await yoneticiKontrol()) ? tumEserler() : yayindakiEserler(),
  )
}

async function eserGetir(id) {
  return sar('Eser okunamadı.', 'okuma', async () => {
    const [{ doc, getDoc }, veritabani] = await Promise.all([fsAl(), dbAl()])
    const anlik = await getDoc(doc(veritabani, 'eserler', id))
    return anlik.exists() ? eserBicimle(anlik) : null
  })
}

async function eserOlustur(taslak) {
  return sar('Eser oluşturulamadı.', 'yazma', async () => {
    const [{ doc }, veritabani] = await Promise.all([fsAl(), dbAl()])
    const mevcut = await tumEserler()
    const id = kimlikUret('eser')
    const simdi = Date.now()
    const enBuyukSira = mevcut.reduce((m, e) => Math.max(m, e.sira ?? -1), -1)

    const olusan = {
      ...taslak,
      id,
      sira: taslak.sira ?? enBuyukSira + 1,
      gorseller: taslak.gorseller ?? [],
      anaGorselId: taslak.anaGorselId ?? null,
      olusturuldu: simdi,
      guncellendi: simdi,
    }

    const numaralanmis = sirayiYenidenNumarala([...mevcut, olusan])
    const eskiSiralar = new Map(mevcut.map((e) => [e.id, e.sira]))
    await yiginYaz(
      numaralanmis.map((e) => {
        if (e.id === id) return (y) => y.set(doc(veritabani, 'eserler', id), temizle(e))
        return eskiSiralar.get(e.id) === e.sira
          ? null
          : (y) => y.update(doc(veritabani, 'eserler', e.id), { sira: e.sira })
      }).filter(Boolean),
    )
    duyur()
    return numaralanmis.find((e) => e.id === id)
  })
}

async function eserGuncelle(id, yama) {
  return sar('Eser güncellenemedi.', 'yazma', async () => {
    const [{ doc, getDoc, updateDoc }, veritabani] = await Promise.all([fsAl(), dbAl()])
    const referans = doc(veritabani, 'eserler', id)
    const anlik = await getDoc(referans)
    if (!anlik.exists()) throw new DepoHatasi('Eser bulunamadı.', { kod: 'yok' })

    const guncel = { ...eserBicimle(anlik), ...yama, id, guncellendi: Date.now() }

    // "cemberde" değiştiyse tüm çember sırası kayar — yerel adaptördeki kural.
    if ('cemberde' in yama) {
      const hepsi = await tumEserler()
      const eskiSiralar = new Map(hepsi.map((e) => [e.id, e.sira]))
      const numaralanmis = sirayiYenidenNumarala(hepsi.map((e) => (e.id === id ? guncel : e)))
      await yiginYaz(
        numaralanmis
          .map((e) =>
            e.id === id
              ? (y) => y.set(doc(veritabani, 'eserler', id), temizle(e))
              : eskiSiralar.get(e.id) === e.sira
                ? null
                : (y) => y.update(doc(veritabani, 'eserler', e.id), { sira: e.sira }),
          )
          .filter(Boolean),
      )
      duyur()
      return numaralanmis.find((e) => e.id === id)
    }

    await updateDoc(referans, temizle({ ...yama, id, guncellendi: guncel.guncellendi }))
    duyur()
    return guncel
  })
}

async function eserleriSil(idler) {
  return sar('Eserler silinemedi.', 'yazma', async () => {
    const [{ doc }, veritabani] = await Promise.all([fsAl(), dbAl()])
    const kume = new Set(idler)
    const hepsi = await tumEserler()

    const silinecekGorseller = []
    for (const e of hepsi) {
      if (!kume.has(e.id)) continue
      for (const g of e.gorseller ?? []) silinecekGorseller.push({ eserId: e.id, gorselId: g.id })
    }

    const kalan = sirayiYenidenNumarala(hepsi.filter((e) => !kume.has(e.id)))
    const eskiSiralar = new Map(hepsi.map((e) => [e.id, e.sira]))
    const islemler = [
      ...[...kume].map((id) => (y) => y.delete(doc(veritabani, 'eserler', id))),
      ...kalan
        .filter((e) => eskiSiralar.get(e.id) !== e.sira)
        .map((e) => (y) => y.update(doc(veritabani, 'eserler', e.id), { sira: e.sira })),
    ]

    // Silinen eser sergilerin eser listesinde asılı kalmasın.
    const sergiler = await sergileriGetir()
    for (const s of sergiler) {
      const kalanIdler = (s.eserIdleri ?? []).filter((x) => !kume.has(x))
      if (kalanIdler.length !== (s.eserIdleri ?? []).length) {
        islemler.push((y) => y.update(doc(veritabani, 'sergiler', s.id), { eserIdleri: kalanIdler }))
      }
    }

    await yiginYaz(islemler)
    // Storage temizliği yazmadan SONRA; başarısız olsa da üstveri tutarlı kalır.
    await Promise.all(silinecekGorseller.map(({ eserId, gorselId }) => nesneyiSil(eserId, gorselId)))
    duyur()
  })
}

async function topluGuncelle(idler, yama) {
  return sar('Eserler güncellenemedi.', 'yazma', async () => {
    const [{ doc }, veritabani] = await Promise.all([fsAl(), dbAl()])
    const kume = new Set(idler)
    const simdi = Date.now()
    const hepsi = await tumEserler()
    const eskiSiralar = new Map(hepsi.map((e) => [e.id, e.sira]))

    let sonrasi = hepsi.map((e) => (kume.has(e.id) ? { ...e, ...yama, id: e.id, guncellendi: simdi } : e))
    if ('cemberde' in yama) sonrasi = sirayiYenidenNumarala(sonrasi)

    await yiginYaz(
      sonrasi
        .map((e) => {
          if (kume.has(e.id)) return (y) => y.set(doc(veritabani, 'eserler', e.id), temizle(e))
          return eskiSiralar.get(e.id) === e.sira
            ? null
            : (y) => y.update(doc(veritabani, 'eserler', e.id), { sira: e.sira })
        })
        .filter(Boolean),
    )
    duyur()
    return sonrasi.filter((e) => kume.has(e.id))
  })
}

/* ---------- çember sırası ---------- */

async function cemberSirasiKaydet(sirali) {
  return sar('Çember sırası kaydedilemedi.', 'yazma', async () => {
    const [{ doc }, veritabani] = await Promise.all([fsAl(), dbAl()])
    const konum = new Map(sirali.map((id, i) => [id, i]))
    const hepsi = await tumEserler()
    const sonrasi = hepsi.map((e) => (konum.has(e.id) ? { ...e, sira: konum.get(e.id) } : e))

    await yiginYaz(
      hepsi
        .filter((e) => konum.has(e.id) && e.sira !== konum.get(e.id))
        .map((e) => (y) => y.update(doc(veritabani, 'eserler', e.id), { sira: konum.get(e.id) })),
    )
    duyur()
    return sonrasi
  })
}

async function cemberSirasiYayinla(sirali) {
  await cemberSirasiKaydet(sirali)
  return sar('Çember sırası yayınlanamadı.', 'yazma', async () => {
    const ayarlar = await ayarlariGetir()
    const yayin = await yayinYaz(ayarlar, [...sirali])
    duyur()
    return yayin
  })
}

/* ---------- görseller ---------- */

/**
 * gorselId -> kalıcı indirme URL'i.
 * Sözleşme `gorselUrl(gorselId)` diyor, eser kimliğini vermiyor; Storage yolu
 * ise eser kimliğini içeriyor. Bu yüzden okunan her eserden URL'ler buraya
 * toplanır, önbellekte olmayan bir kimlik istenirse eserler bir kez taranır.
 *
 * KURULUM NOTU: <img src> bu adresleri sorunsuz açar, ama GorselKirpmaModali
 * var olan bir görseli yeniden kırparken `fetch(url)` yapar. Bunun çalışması
 * için pakette (bucket) CORS tanımı gerekir — aksi halde yalnızca "yeniden
 * kırp" akışı ağ hatası verir. Bir kez:
 *   gsutil cors set cors.json gs://<paket-adi>
 * cors.json: [{"origin":["https://<alan-adi>"],"method":["GET"],"maxAgeSeconds":3600}]
 */
const gorselUrlleri = new Map()

/** Tek bir Gorsel kaydını önbelleğe alır. */
function gorseliBellegeAl(gorsel) {
  if (gorsel?.id && gorsel.url) gorselUrlleri.set(gorsel.id, gorsel.url)
}

function urlleriBellegeAl(eser) {
  for (const g of eser?.gorseller ?? []) gorseliBellegeAl(g)
}

/**
 * Bir görsel ÜÇ ayrı yerde durabilir: eserin `gorseller` dizisinde, süreç
 * karesinin `gorsel` alanında, serginin `afis` alanında (bkz. data/schema.js).
 * Burada yalnızca eserler taranıyordu; sonucu şuydu: atölye şeridinin beş
 * karesi ve sergi afişleri sitede kalıcı yer tutucu olarak çiziliyor, üstelik
 * her çözülemeyen kimlik boşuna bir TAM eserler sorgusu tetikliyordu. Veri
 * Firestore'da eksiksiz dururken sayfa sessizce boş görünüyordu — hata da yok.
 */
async function gorselUrl(gorselId) {
  if (!gorselId) return null
  if (gorselUrlleri.has(gorselId)) return gorselUrlleri.get(gorselId)
  // Sırayla en olası kaynaktan başlanır; her okuma kendi önbelleğini doldurur.
  for (const oku of [eserleriGetir, surecKareleriniGetir, sergileriGetir]) {
    try {
      await oku()
    } catch {
      continue // bir koleksiyon okunamazsa diğerleri yine denenir
    }
    if (gorselUrlleri.has(gorselId)) return gorselUrlleri.get(gorselId)
  }
  return null
}

/** Storage nesnesini yoldan siler; yoksa sorun etmez (üstveri zaten kaldırıldı). */
async function yoluSil(yol, gorselId) {
  try {
    const [{ deleteObject, ref }, storage] = await Promise.all([stMod(), storageAl()])
    if (!storage) return
    await deleteObject(ref(storage, yol))
  } catch (hata) {
    if (hata?.code !== 'storage/object-not-found') {
      console.warn('[depo] Görsel dosyası silinemedi; üstveri kaldırıldı.', hata)
    }
  } finally {
    gorselUrlleri.delete(gorselId)
  }
}

/* İki ayrı Storage yolu var (bkz. storage.rules): eser görselleri ve sergi
   afişleri. Yol kurmayı tek yerde tutmak önemli — kural dosyası tam bu iki
   kalıbı açıyor, üçüncü bir kalıp sessizce reddedilirdi. */
const nesneyiSil = (eserId, gorselId) => yoluSil(`eserler/${eserId}/${gorselId}`, gorselId)
const afisNesnesiniSil = (sergiId, afisId) => yoluSil(`sergiler/${sergiId}/${afisId}`, afisId)

async function gorselYukle(eserId, dosya, ustveri = {}) {
  if (!(dosya instanceof Blob)) throw new DepoHatasi('Geçersiz dosya.', { kod: 'girdi' })
  return sar('Görsel yüklenemedi.', 'yazma', async () => {
    const [{ doc, getDoc, updateDoc }, veritabani] = await Promise.all([fsAl(), dbAl()])
    const referans = doc(veritabani, 'eserler', eserId)
    const anlik = await getDoc(referans)
    // Önce eseri doğrula: yoksa Storage'a öksüz dosya bırakmayalım.
    if (!anlik.exists()) throw new DepoHatasi('Eser bulunamadı.', { kod: 'yok' })

    const storage = await storageAl()
    if (!storage) throw new DepoHatasi('Firebase Storage yapılandırılmamış.', { kod: 'yapilandirma' })
    const { getDownloadURL, ref, uploadBytes } = await stMod()

    const gorselId = kimlikUret('gorsel')
    const nesne = ref(storage, `eserler/${eserId}/${gorselId}`)
    await uploadBytes(nesne, dosya, {
      contentType: dosya.type || 'image/webp',
      // Dosya adı içerik özetiyle değil kimlikle benzersiz — güvenle sonsuz önbelleklenir.
      cacheControl: 'public, max-age=31536000, immutable',
    })

    let url
    try {
      url = await getDownloadURL(nesne)
    } catch (hata) {
      await nesneyiSil(eserId, gorselId)
      throw hata
    }

    const kayit = {
      id: gorselId,
      url, // yerelde null'dı; burada kalıcı indirme adresi
      alt: ustveri.alt || '',
      genislik: ustveri.genislik || 0,
      yukseklik: ustveri.yukseklik || 0,
      kaynakAdi: ustveri.kaynakAdi || '',
      kaynakBayt: dosya.size,
      kirpma: ustveri.kirpma || null,
      oran: ustveri.oran || '3:4',
    }

    const eser = eserBicimle(anlik)
    const gorseller = [...eser.gorseller, kayit]
    const sonuc = {
      ...eser,
      gorseller,
      anaGorselId: ustveri.anaYap || !eser.anaGorselId ? gorselId : eser.anaGorselId,
      guncellendi: Date.now(),
    }

    try {
      await updateDoc(referans, {
        gorseller: temizle(gorseller),
        anaGorselId: sonuc.anaGorselId,
        guncellendi: sonuc.guncellendi,
      })
    } catch (hata) {
      await nesneyiSil(eserId, gorselId) // üstveri yazılamadıysa dosya da kalmasın
      throw hata
    }

    gorselUrlleri.set(gorselId, url)
    duyur()
    return sonuc
  })
}

async function gorselSil(eserId, gorselId) {
  return sar('Görsel silinemedi.', 'yazma', async () => {
    const [{ doc, getDoc, updateDoc }, veritabani] = await Promise.all([fsAl(), dbAl()])
    const referans = doc(veritabani, 'eserler', eserId)
    const anlik = await getDoc(referans)
    if (!anlik.exists()) throw new DepoHatasi('Eser bulunamadı.', { kod: 'yok' })

    const eser = eserBicimle(anlik)
    const kalan = eser.gorseller.filter((g) => g.id !== gorselId)
    await updateDoc(referans, {
      gorseller: temizle(kalan),
      anaGorselId: eser.anaGorselId === gorselId ? (kalan[0]?.id ?? null) : eser.anaGorselId,
      guncellendi: Date.now(),
    })
    await nesneyiSil(eserId, gorselId)
    duyur()
  })
}

async function anaGorselAta(eserId, gorselId) {
  return eserGuncelle(eserId, { anaGorselId: gorselId })
}

async function gorselUstveriGuncelle(eserId, gorselId, yama) {
  return sar('Görsel bilgisi güncellenemedi.', 'yazma', async () => {
    const [{ doc, getDoc, updateDoc }, veritabani] = await Promise.all([fsAl(), dbAl()])
    const referans = doc(veritabani, 'eserler', eserId)
    const anlik = await getDoc(referans)
    if (!anlik.exists()) throw new DepoHatasi('Eser bulunamadı.', { kod: 'yok' })

    const eser = eserBicimle(anlik)
    const gorseller = eser.gorseller.map((g) => (g.id === gorselId ? { ...g, ...yama, id: gorselId } : g))
    const guncellendi = Date.now()
    await updateDoc(referans, { gorseller: temizle(gorseller), guncellendi })
    duyur()
    return { ...eser, gorseller, guncellendi }
  })
}

/* ---------- süreç kareleri ---------- */

async function surecKareleriniGetir() {
  return sar('Süreç kareleri okunamadı.', 'okuma', async () => {
    const [{ collection, getDocs }, veritabani] = await Promise.all([fsAl(), dbAl()])
    const anlik = await getDocs(collection(veritabani, 'surecKareleri'))
    const kareler = anlik.docs.map(belge)
    for (const kare of kareler) gorseliBellegeAl(kare.gorsel)
    return kareler.sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0))
  })
}

async function surecKaresiGuncelle(id, yama) {
  return sar('Süreç karesi güncellenemedi.', 'yazma', async () => {
    const [{ doc, getDoc, updateDoc }, veritabani] = await Promise.all([fsAl(), dbAl()])
    const referans = doc(veritabani, 'surecKareleri', id)
    const anlik = await getDoc(referans)
    if (!anlik.exists()) throw new DepoHatasi('Süreç karesi bulunamadı.', { kod: 'yok' })
    await updateDoc(referans, temizle({ ...yama, id }))
    duyur()
    return { ...belge(anlik), ...yama, id }
  })
}

/* ---------- sergiler ---------- */

async function sergileriGetir() {
  return sar('Sergiler okunamadı.', 'okuma', async () => {
    const [{ collection, getDocs }, veritabani] = await Promise.all([fsAl(), dbAl()])
    const anlik = await getDocs(collection(veritabani, 'sergiler'))
    const sergiler = anlik.docs.map(belge)
    for (const sergi of sergiler) gorseliBellegeAl(sergi.afis)
    return sergiler.sort((a, b) => b.yil - a.yil || String(a.ad).localeCompare(String(b.ad), 'tr'))
  })
}

async function sergiOlustur(taslak) {
  return sar('Sergi oluşturulamadı.', 'yazma', async () => {
    const [{ doc, setDoc }, veritabani] = await Promise.all([fsAl(), dbAl()])
    const id = kimlikUret('sergi')
    const olusan = { eserIdleri: [], ...taslak, id }
    await setDoc(doc(veritabani, 'sergiler', id), temizle(olusan))
    duyur()
    return olusan
  })
}

async function sergiGuncelle(id, yama) {
  return sar('Sergi güncellenemedi.', 'yazma', async () => {
    const [{ doc, getDoc, updateDoc }, veritabani] = await Promise.all([fsAl(), dbAl()])
    const referans = doc(veritabani, 'sergiler', id)
    const anlik = await getDoc(referans)
    if (!anlik.exists()) throw new DepoHatasi('Sergi bulunamadı.', { kod: 'yok' })
    await updateDoc(referans, temizle({ ...yama, id }))
    duyur()
    return { ...belge(anlik), ...yama, id }
  })
}

async function sergiSil(id) {
  return sar('Sergi silinemedi.', 'yazma', async () => {
    const [{ deleteDoc, doc, getDoc }, veritabani] = await Promise.all([fsAl(), dbAl()])
    const referans = doc(veritabani, 'sergiler', id)
    // Afişin kimliğini belge silinmeden ÖNCE oku; sonra öğrenmenin yolu kalmaz
    // ve dosya Storage'da öksüz kalırdı.
    const anlik = await getDoc(referans)
    const afisId = anlik.exists() ? (belge(anlik).afis?.id ?? null) : null
    await deleteDoc(referans)
    if (afisId) await afisNesnesiniSil(id, afisId)
    duyur()
  })
}

/**
 * Sergi afişi. Eser görsellerinden ayrı tutuluyor çünkü sergi TEK afiş taşır
 * (galeri koleksiyonu değil) ve çember kartı gibi 3:4'e zorlanmaz.
 *
 * Dönüş şekli localAdapter.afisYukle ile aynı olmak ZORUNDA: GÜNCELLENMİŞ SERGİ
 * kaydı döner, görsel kaydı değil — panel (Sergiler.jsx) dönen değeri sergi
 * olarak kullanıyor.
 */
async function afisYukle(sergiId, dosya, ustveri = {}) {
  if (!(dosya instanceof Blob)) throw new DepoHatasi('Geçersiz dosya.', { kod: 'girdi' })
  return sar('Afiş yüklenemedi.', 'yazma', async () => {
    const [{ doc, getDoc, updateDoc }, veritabani] = await Promise.all([fsAl(), dbAl()])
    const referans = doc(veritabani, 'sergiler', sergiId)
    const anlik = await getDoc(referans)
    // Önce sergiyi doğrula: yoksa Storage'a öksüz dosya bırakmayalım.
    if (!anlik.exists()) throw new DepoHatasi('Sergi bulunamadı.', { kod: 'yok' })

    const storage = await storageAl()
    if (!storage) throw new DepoHatasi('Firebase Storage yapılandırılmamış.', { kod: 'yapilandirma' })
    const { getDownloadURL, ref, uploadBytes } = await stMod()

    const afisId = kimlikUret('afis')
    const nesne = ref(storage, `sergiler/${sergiId}/${afisId}`)
    await uploadBytes(nesne, dosya, {
      contentType: dosya.type || 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    })

    let url
    try {
      url = await getDownloadURL(nesne)
    } catch (hata) {
      await afisNesnesiniSil(sergiId, afisId)
      throw hata
    }

    const kayit = {
      id: afisId,
      url, // yerelde null'dı; burada kalıcı indirme adresi
      alt: ustveri.alt || '',
      genislik: ustveri.genislik || 0,
      yukseklik: ustveri.yukseklik || 0,
      kaynakAdi: ustveri.kaynakAdi || '',
      kaynakBayt: dosya.size,
      kirpma: ustveri.kirpma || null,
      oran: ustveri.oran || 'serbest',
    }

    const sergi = belge(anlik)
    const eskiId = sergi.afis?.id ?? null
    try {
      await updateDoc(referans, { afis: temizle(kayit) })
    } catch (hata) {
      await afisNesnesiniSil(sergiId, afisId) // üstveri yazılamadıysa dosya da kalmasın
      throw hata
    }

    // Bir sergi tek afiş taşır; yenisi gelince eskisinin dosyası boşa yer kaplamasın.
    if (eskiId && eskiId !== afisId) await afisNesnesiniSil(sergiId, eskiId)

    gorseliBellegeAl(kayit)
    duyur()
    return { ...sergi, afis: kayit }
  })
}

async function afisSil(sergiId) {
  return sar('Afiş silinemedi.', 'yazma', async () => {
    const [{ doc, getDoc, updateDoc }, veritabani] = await Promise.all([fsAl(), dbAl()])
    const referans = doc(veritabani, 'sergiler', sergiId)
    const anlik = await getDoc(referans)
    if (!anlik.exists()) throw new DepoHatasi('Sergi bulunamadı.', { kod: 'yok' })

    const eskiId = belge(anlik).afis?.id ?? null
    await updateDoc(referans, { afis: null })
    if (eskiId) await afisNesnesiniSil(sergiId, eskiId)
    duyur()
  })
}

/* ---------- ayarlar & yayınlar ---------- */

/** İç içe nesneleri alan bazında birleştirir; dizileri değiştirmeden kopyalar. */
function birlestir(hedef, yama) {
  if (!yama) return hedef
  const cikti = { ...hedef }
  for (const [k, v] of Object.entries(yama)) {
    cikti[k] = v && typeof v === 'object' && !Array.isArray(v) ? birlestir(hedef?.[k] || {}, v) : v
  }
  return cikti
}

async function ayarlariGetir() {
  return sar('Ayarlar okunamadı.', 'okuma', async () => {
    const [{ doc, getDoc }, veritabani] = await Promise.all([fsAl(), dbAl()])
    const anlik = await getDoc(doc(veritabani, ...AYAR_BELGESI))
    // Belge hiç yazılmadıysa panel boş açılmasın; tohumdaki varsayılanlar gelir.
    return anlik.exists() ? anlik.data() : kopya(VARSAYILAN_AYARLAR)
  })
}

async function ayarlariKaydet(yama) {
  return sar('Ayarlar kaydedilemedi.', 'yazma', async () => {
    const [{ doc, getDoc, setDoc }, veritabani] = await Promise.all([fsAl(), dbAl()])
    const referans = doc(veritabani, ...AYAR_BELGESI)
    const anlik = await getDoc(referans)
    const mevcut = anlik.exists() ? anlik.data() : kopya(VARSAYILAN_AYARLAR)
    const birlesik = birlestir(mevcut, yama)

    // Belge varsa yalnızca yamayı yaz (eşzamanlı düzenlemeyi ezmemek için),
    // yoksa varsayılanlarla birleşmiş tam belgeyi yaz.
    if (anlik.exists()) await setDoc(referans, temizle(yama), { merge: true })
    else await setDoc(referans, temizle(birlesik))

    duyur()
    return birlesik
  })
}

async function sonYayin() {
  const [{ collection, getDocs, limit, orderBy, query }, veritabani] = await Promise.all([fsAl(), dbAl()])
  const anlik = await getDocs(query(collection(veritabani, 'yayinlar'), orderBy('surum', 'desc'), limit(1)))
  return anlik.empty ? null : belge(anlik.docs[0])
}

/** Yeni yayın belgesi üretir; sürüm numarası son yayının bir fazlasıdır. */
async function yayinYaz(ayarlar, cemberSirasi, ek = {}) {
  const [{ doc, setDoc }, veritabani] = await Promise.all([fsAl(), dbAl()])
  const son = await sonYayin()
  const yayin = {
    id: kimlikUret('yayin'),
    surum: (son?.surum ?? 0) + 1,
    zaman: Date.now(),
    ayarlar,
    cemberSirasi,
    ...ek,
  }
  await setDoc(doc(veritabani, 'yayinlar', yayin.id), temizle(yayin))
  return yayin
}

async function ayarlariYayinla() {
  return sar('Ayarlar yayınlanamadı.', 'yazma', async () => {
    const ayarlar = await ayarlariGetir()
    const son = await sonYayin()
    const yayin = await yayinYaz(ayarlar, [...(son?.cemberSirasi ?? [])])
    duyur()
    return yayin
  })
}

async function yayinlariGetir() {
  return sar('Yayın geçmişi okunamadı.', 'okuma', async () => {
    const [{ collection, getDocs, orderBy, query }, veritabani] = await Promise.all([fsAl(), dbAl()])
    const anlik = await getDocs(query(collection(veritabani, 'yayinlar'), orderBy('surum', 'desc')))
    return anlik.docs.map(belge)
  })
}

async function yayinaDon(yayinId) {
  return sar('Sürüme dönülemedi.', 'yazma', async () => {
    const [{ doc, getDoc, setDoc }, veritabani] = await Promise.all([fsAl(), dbAl()])
    const anlik = await getDoc(doc(veritabani, 'yayinlar', yayinId))
    if (!anlik.exists()) throw new DepoHatasi('Sürüm bulunamadı.', { kod: 'yok' })
    const hedef = belge(anlik)

    // Geri dönüş de bir yayındır: geçmiş silinmez, üzerine yeni sürüm eklenir.
    const yeni = await yayinYaz(kopya(hedef.ayarlar), [...(hedef.cemberSirasi ?? [])], {
      geriDonulen: hedef.surum,
    })

    await setDoc(doc(veritabani, ...AYAR_BELGESI), temizle(hedef.ayarlar))

    const konum = new Map((hedef.cemberSirasi ?? []).map((id, i) => [id, i]))
    const hepsi = await tumEserler()
    await yiginYaz(
      hepsi
        .filter((e) => konum.has(e.id) && e.sira !== konum.get(e.id))
        .map((e) => (y) => y.update(doc(veritabani, 'eserler', e.id), { sira: konum.get(e.id) })),
    )

    duyur()
    return yeni
  })
}

async function yayindakiAyarlariGetir() {
  return sar('Yayındaki ayarlar okunamadı.', 'okuma', async () => {
    const son = await sonYayin()
    return son?.ayarlar ?? kopya(VARSAYILAN_AYARLAR)
  })
}

/** Sitenin göstereceği çember sırası: yayınlanmış sıra + sonradan eklenen yayındaki eserler. */
async function yayindakiCemberSirasi() {
  return sar('Çember sırası okunamadı.', 'okuma', async () => {
    const [son, eserler] = await Promise.all([sonYayin(), yayindakiEserler()])
    const uygun = eserler.filter((e) => e.cemberde)
    const uygunKume = new Set(uygun.map((e) => e.id))
    const sirali = (son?.cemberSirasi ?? []).filter((id) => uygunKume.has(id))
    const eklenmis = new Set(sirali)
    for (const e of uygun.slice().sort((a, b) => a.sira - b.sira)) {
      if (!eklenmis.has(e.id)) sirali.push(e.id)
    }
    return sirali
  })
}

/* ---------- bakım ---------- */

/** Storage kalıcıdır — yerel adaptördeki "tarayıcı verisi silinirse kaybolur" uyarısı geçersiz. */
const gorselKalici = () => true

async function sifirla() {
  // Dürüst olalım: Firestore'da bir koleksiyonu toplu silmek istemcinin işi
  // değildir (sayfalama + yığın silme + Storage temizliği gerekir ve yarıda
  // kalırsa veri tutarsız kalır). Konsol ya da Admin SDK ile yapılır.
  throw new DepoHatasi(
    'Firebase kurulumunda toplu silme istemciden yapılmaz. Tohum verisine dönmek için ' +
      'Firebase Console üzerinden koleksiyonları silip yeniden tohumlayın.',
    { kod: 'desteklenmiyor' },
  )
}

async function disaAktar() {
  return sar('Yedek alınamadı.', 'okuma', async () => {
    const [eserler, surecKareleri, sergiler, ayarlar, yayinlar] = await Promise.all([
      tumEserler(),
      surecKareleriniGetir(),
      sergileriGetir(),
      ayarlariGetir(),
      yayinlariGetir(),
    ])
    // Şekil localAdapter.disaAktar() ile aynı — yedekler iki adaptör arasında taşınabilir.
    return {
      semaSurumu: SEMA_SURUMU,
      disaAktarma: Date.now(),
      durum: { eserler, surecKareleri, sergiler, ayarlar, yayinlar },
    }
  })
}

async function iceAktar(paket) {
  if (paket?.semaSurumu !== SEMA_SURUMU || !paket.durum) {
    throw new DepoHatasi('Yedek dosyası bu sürümle uyumlu değil.', { kod: 'sema' })
  }
  return sar('Yedek geri yüklenemedi.', 'yazma', async () => {
    const [{ doc, setDoc }, veritabani] = await Promise.all([fsAl(), dbAl()])
    const d = paket.durum

    const islemler = []
    /* Yedekte olmayan kayıtlar silinir — aksi halde "geri yükleme" birleştirme
       olur ve silinmiş eser geri gelmiş gibi görünür. Yayın geçmişine ve
       Storage dosyalarına DOKUNULMAZ: geçmiş eklemelidir, dosyalar da
       yedek JSON'unda yer almaz.

       Bunun görünür sonucu: YEREL adaptörden alınmış bir yedek buraya geri
       yüklenirse görsel kayıtlarının url alanı null gelir (ikili veri o
       tarayıcının IndexedDB'sindeydi) ve o eserler yer tutucuyla görünür —
       fotoğraflar panelden yeniden yüklenmelidir. */
    const yenile = async (koleksiyon, kayitlar) => {
      const { collection, getDocs } = await fsAl()
      const mevcut = await getDocs(collection(veritabani, koleksiyon))
      const yeniKume = new Set((kayitlar ?? []).map((k) => k.id))
      for (const anlik of mevcut.docs) {
        if (!yeniKume.has(anlik.id)) islemler.push((y) => y.delete(anlik.ref))
      }
      for (const kayit of kayitlar ?? []) {
        islemler.push((y) => y.set(doc(veritabani, koleksiyon, kayit.id), temizle(kayit)))
      }
    }

    await yenile('eserler', d.eserler)
    await yenile('surecKareleri', d.surecKareleri)
    await yenile('sergiler', d.sergiler)
    /* Yayın geçmişi değiştirilemez (firestore.rules: yayinlar update -> false).
       Var olan bir yayını yeniden `set` etmek UPDATE sayılır ve reddedilir;
       yığın ATOMİK olduğu için tek bir çakışma geri yüklemenin tamamını düşürür
       — eserler ve sergiler de yazılmaz, üstelik hata "yönetici oturumu
       gerekiyor" diye yanlış teşhis konur. Bu yüzden yalnızca EKSİK yayınlar
       eklenir; aynı yedeği ikinci kez yüklemek artık sorunsuz çalışır. */
    {
      const { collection, getDocs } = await fsAl()
      const mevcutYayinlar = await getDocs(collection(veritabani, 'yayinlar'))
      const varOlan = new Set(mevcutYayinlar.docs.map((a) => a.id))
      for (const yayin of d.yayinlar ?? []) {
        if (varOlan.has(yayin.id)) continue
        islemler.push((y) => y.set(doc(veritabani, 'yayinlar', yayin.id), temizle(yayin)))
      }
    }

    await yiginYaz(islemler)
    if (d.ayarlar) await setDoc(doc(veritabani, ...AYAR_BELGESI), temizle(d.ayarlar))

    gorselUrlleri.clear()
    duyur()
    return d
  })
}

/* ---------- fabrika ---------- */

/**
 * @returns {Promise<object|null>} Yapılandırma eksikse null — çağıran
 * (repository/index.js) yerel adaptöre düşer.
 */
export async function firebaseDepoOlustur() {
  const veritabani = await firestoreAl()
  if (!veritabani) return null
  db = veritabani

  // İlk okumadan önce oturum durumu netleşsin; yoksa yönetici sayfayı
  // yenilediğinde taslakları göremeden ziyaretçi sorgusuna düşer.
  await oturumHazir()

  if (auth) {
    const { onAuthStateChanged } = await import('firebase/auth')
    let ilk = true
    onAuthStateChanged(auth, () => {
      if (ilk) {
        ilk = false
        return
      }
      // Rol değişti: rol önbelleği ve rol'e göre kurulmuş dinleyiciler geçersiz.
      yoneticiOnbellegi = { uid: null, sonuc: false }
      if (dinleyiciler.size > 0) {
        dinlemeyiBirak()
        kurulumSozu = null
        dinlemeyiKur()
      }
      duyur()
    })
  }

  return {
    ad: 'firebase',
    /* Panelin "girdim ama hiçbir şey yazamıyorum" durumunu ÖNCEDEN sorabilmesi
       için: Firebase Auth oturumu açmak yetki vermez, yetki /yoneticiler/{uid}
       belgesinin varlığına bağlıdır (bkz. firestore.rules). Belge yoksa panel
       açılır, listeler sessizce yalnızca yayındakileri gösterir ve her yazma
       reddedilir — sebebi hiçbir yerde yazmazdı. */
    yoneticiMi: yoneticiKontrol,
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
    gorselKalici,
    abone,
    sifirla,
    disaAktar,
    iceAktar,
  }
}

export default firebaseDepoOlustur
