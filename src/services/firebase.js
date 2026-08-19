/**
 * Firebase başlatma — tembel, tekil, yapılandırma yoksa sessizce değil AÇIKÇA null.
 *
 * Neden bu dosya var: uygulama Firebase'siz de tam çalışıyor. `firebase` paketi
 * kurulu ama ana pakete girmemeli. Bu yüzden her SDK modülü `import()` ile,
 * yalnızca gerçekten istendiğinde yüklenir. Her getirici sonucu bellekler;
 * ikinci çağrıda ağ/başlatma tekrar etmez.
 *
 * .env eksikse burada patlamayız — null döneriz. `repository/index.js` bunu
 * görüp yerel adaptöre düşer. Ama konsola HANGİ değişkenin eksik olduğunu
 * yazarız: sessiz düşüş, "neden verim kaydolmuyor" sorusunun kaynağıdır.
 */

/** Firebase yapılandırma alanı -> ortam değişkeni adı. */
const ALANLAR = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
}

const ORTAM = import.meta.env ?? {}

const EMULATOR = String(ORTAM.VITE_FIREBASE_EMULATOR ?? '').toLowerCase() === 'true'
/** Emülatörler varsayılan olarak yereldedir; ağdaki bir makineye bağlanmak isteyen değiştirir. */
const EMULATOR_SUNUCU = ORTAM.VITE_FIREBASE_EMULATOR_HOST || '127.0.0.1'
const EMULATOR_KAPILARI = { auth: 9099, firestore: 8080, storage: 9199 }

/**
 * Emülatöre ikinci kez bağlanmak SDK'da hata fırlatır. Bayrakları modül
 * kapsamında tutmak Vite'ın sıcak modül değişiminde (HMR) yetmez — modül
 * yeniden değerlendirilince bayraklar sıfırlanır ama SDK örneği aynı kalır.
 * Bu yüzden bayraklar globalThis üzerinde durur.
 */
const BAGLANDI = (() => {
  const kure = globalThis
  kure.__keseBenavEmulatorBaglandi ??= { auth: false, firestore: false, storage: false }
  return kure.__keseBenavEmulatorBaglandi
})()

let yapilandirmaOnbellegi
let eksikBildirildi = false

/**
 * .env'den Firebase yapılandırmasını toplar.
 * @returns {object|null} Eksik alan varsa null.
 */
export function yapilandirmaAl() {
  if (yapilandirmaOnbellegi !== undefined) return yapilandirmaOnbellegi

  const yapilandirma = {}
  const eksik = []
  for (const [alan, degisken] of Object.entries(ALANLAR)) {
    const deger = String(ORTAM[degisken] ?? '').trim()
    if (deger) yapilandirma[alan] = deger
    else eksik.push(degisken)
  }

  if (eksik.length > 0) {
    if (!eksikBildirildi) {
      eksikBildirildi = true
      console.error(
        `[firebase] Yapılandırma eksik — şu ortam değişkenleri boş: ${eksik.join(', ')}.\n` +
          '[firebase] .env.example dosyasını .env olarak kopyalayıp Firebase Console > ' +
          'Proje ayarları > Web uygulaması bölümündeki değerleri doldurun. ' +
          'Bu haliyle uygulama yerel (tarayıcı içi) depoya düşecek.',
      )
    }
    yapilandirmaOnbellegi = null
  } else {
    yapilandirmaOnbellegi = yapilandirma
  }
  return yapilandirmaOnbellegi
}

/** Emülatör kipinde miyiz? Adaptör ve tanılama ekranları için. */
export const emulatorMu = () => EMULATOR

/**
 * Bir söz üreticisini bellekler; başarısız olursa önbelleği temizler ki
 * sonraki çağrı yeniden denesin (ağ hatası kalıcı bir "hep null" üretmesin).
 */
function tekil(uret) {
  let soz = null
  return () => {
    if (soz) return soz
    soz = uret()
    // Zincirin kendisi çağırana gider; buradaki yakalama yalnızca önbelleği siler.
    soz.catch(() => {
      soz = null
    })
    return soz
  }
}

/** @returns {Promise<import('firebase/app').FirebaseApp|null>} */
export const uygulamaAl = tekil(async () => {
  const yapilandirma = yapilandirmaAl()
  if (!yapilandirma) return null
  const { getApp, getApps, initializeApp } = await import('firebase/app')
  // Aynı sayfada ikinci bir initializeApp çağrısı uyarı üretir; varsa mevcudu kullan.
  return getApps().length > 0 ? getApp() : initializeApp(yapilandirma)
})

/** @returns {Promise<import('firebase/auth').Auth|null>} */
export const authAl = tekil(async () => {
  const uygulama = await uygulamaAl()
  if (!uygulama) return null
  const { connectAuthEmulator, getAuth } = await import('firebase/auth')
  const auth = getAuth(uygulama)
  if (EMULATOR && !BAGLANDI.auth) {
    BAGLANDI.auth = true
    // disableWarnings: emülatörün sayfaya bastığı turuncu bandı kapatır.
    connectAuthEmulator(auth, `http://${EMULATOR_SUNUCU}:${EMULATOR_KAPILARI.auth}`, { disableWarnings: true })
  }
  return auth
})

/** @returns {Promise<import('firebase/firestore').Firestore|null>} */
export const firestoreAl = tekil(async () => {
  const uygulama = await uygulamaAl()
  if (!uygulama) return null
  const { connectFirestoreEmulator, getFirestore } = await import('firebase/firestore')
  const db = getFirestore(uygulama)
  if (EMULATOR && !BAGLANDI.firestore) {
    BAGLANDI.firestore = true
    connectFirestoreEmulator(db, EMULATOR_SUNUCU, EMULATOR_KAPILARI.firestore)
  }
  return db
})

/** @returns {Promise<import('firebase/storage').FirebaseStorage|null>} */
export const storageAl = tekil(async () => {
  const uygulama = await uygulamaAl()
  if (!uygulama) return null
  const { connectStorageEmulator, getStorage } = await import('firebase/storage')
  const storage = getStorage(uygulama)
  if (EMULATOR && !BAGLANDI.storage) {
    BAGLANDI.storage = true
    connectStorageEmulator(storage, EMULATOR_SUNUCU, EMULATOR_KAPILARI.storage)
  }
  return storage
})
