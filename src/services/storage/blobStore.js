/**
 * Görsel ikili verisi için IndexedDB deposu.
 *
 * Neden localStorage değil: kırpılmış 2400×3200 WebP çıktısı ~400 KB'dır ve
 * data URL olarak saklanınca localStorage'ın ~5 MB kotasını birkaç eserde doldurur.
 * İkili veri burada Blob olarak durur, üstveri localStorage'da kalır.
 *
 * IndexedDB yoksa (eski tarayıcı / gizli sekme kısıtı) bellek içi haritaya düşer;
 * bu durumda görseller sayfa yenilenince kaybolur ve `kalici` false döner.
 */

const VT_ADI = 'kese-benav'
const VT_SURUM = 1
const MAGAZA = 'gorseller'

let vtSozu = null
const bellekYedegi = new Map()
let kaliciMi = true

function vtAc() {
  if (vtSozu) return vtSozu
  vtSozu = new Promise((cozumle) => {
    if (typeof indexedDB === 'undefined') {
      kaliciMi = false
      return cozumle(null)
    }
    let istek
    try {
      istek = indexedDB.open(VT_ADI, VT_SURUM)
    } catch {
      kaliciMi = false
      return cozumle(null)
    }
    istek.onupgradeneeded = () => {
      const vt = istek.result
      if (!vt.objectStoreNames.contains(MAGAZA)) vt.createObjectStore(MAGAZA)
    }
    istek.onsuccess = () => cozumle(istek.result)
    istek.onerror = () => {
      kaliciMi = false
      cozumle(null)
    }
    istek.onblocked = () => {
      kaliciMi = false
      cozumle(null)
    }
  })
  return vtSozu
}

function islem(vt, mod, isi) {
  return new Promise((cozumle, reddet) => {
    const tx = vt.transaction(MAGAZA, mod)
    const magaza = tx.objectStore(MAGAZA)
    let sonuc
    try {
      sonuc = isi(magaza)
    } catch (h) {
      reddet(h)
      return
    }
    tx.oncomplete = () => {
      /*
       * `isi` bir IDBRequest döndürür; değeri `result` alanındadır. Anahtar
       * bulunamadığında `result` undefined olur — bunu "sonuç yok" saymazsak
       * IDBRequest nesnesinin KENDİSİ çözülür ve truthy olduğu için çağıran
       * onu Blob sanır (createObjectURL orada patlıyordu).
       */
      const idbIstegi = sonuc && typeof sonuc === 'object' && 'readyState' in sonuc
      const deger = idbIstegi ? sonuc.result : sonuc
      cozumle(deger === undefined ? null : deger)
    }
    tx.onerror = () => reddet(tx.error)
    tx.onabort = () => reddet(tx.error)
  })
}

/** Görselleri kalıcı saklayabiliyor muyuz? */
export const kalici = () => kaliciMi

/** @param {string} id @param {Blob} blob */
export async function yaz(id, blob) {
  const vt = await vtAc()
  if (!vt) {
    bellekYedegi.set(id, blob)
    return
  }
  try {
    await islem(vt, 'readwrite', (m) => m.put(blob, id))
  } catch {
    kaliciMi = false
    bellekYedegi.set(id, blob)
  }
}

/** @param {string} id @returns {Promise<Blob|null>} */
export async function oku(id) {
  const vt = await vtAc()
  if (!vt) return bellekYedegi.get(id) || null
  try {
    const blob = await islem(vt, 'readonly', (m) => m.get(id))
    return blob || bellekYedegi.get(id) || null
  } catch {
    return bellekYedegi.get(id) || null
  }
}

/** @param {string} id */
export async function sil(id) {
  bellekYedegi.delete(id)
  const vt = await vtAc()
  if (!vt) return
  try {
    await islem(vt, 'readwrite', (m) => m.delete(id))
  } catch {
    /* silinemezse yok sayılır — üstveri zaten kaldırıldı */
  }
}

/* ---- Object URL yaşam döngüsü ---- */

const urlOnbellegi = new Map()

/**
 * Bir görsel id'si için görüntülenebilir URL üretir ve önbelleğe alır.
 * Aynı id için tekrar çağrıldığında yeni URL oluşturmaz.
 * @returns {Promise<string|null>}
 */
export async function urlAl(id) {
  if (!id) return null
  if (urlOnbellegi.has(id)) return urlOnbellegi.get(id)
  const blob = await oku(id)
  // Blob olmayan bir şey geldiyse (bozuk kayıt) sessizce yer tutucuya düşülür.
  if (!(blob instanceof Blob)) return null
  const url = URL.createObjectURL(blob)
  urlOnbellegi.set(id, url)
  return url
}

/** Bir id'nin URL'ini geri verir (silme sonrası çağrılır). */
export function urlBirak(id) {
  const url = urlOnbellegi.get(id)
  if (url) {
    URL.revokeObjectURL(url)
    urlOnbellegi.delete(id)
  }
}

/** Tüm object URL'leri serbest bırakır. */
export function tumUrlleriBirak() {
  for (const url of urlOnbellegi.values()) URL.revokeObjectURL(url)
  urlOnbellegi.clear()
}
