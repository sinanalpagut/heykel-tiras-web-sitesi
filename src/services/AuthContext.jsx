/**
 * Yetkilendirme bağlamı.
 *
 * İki arka uç destekler:
 *  - "yerel"    : parola ile açılan istemci tarafı kapı (Firebase'siz kurulum)
 *  - "firebase" : Firebase Auth e-posta/parola oturumu
 *
 * DİKKAT — yerel kapı gerçek bir güvenlik katmanı DEĞİLDİR. Veri tarayıcıda
 * durduğu için paneli kapatmak yalnızca kazara erişimi engeller. Gerçek koruma
 * VITE_DATA_ADAPTER=firebase + firestore.rules ile gelir.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const AuthBaglami = createContext(null)

const ANAHTAR = 'kese-benav/oturum'
const YEREL_PAROLA = import.meta.env?.VITE_ADMIN_PAROLA || 'benav'
const FIREBASE_MI = (import.meta.env?.VITE_DATA_ADAPTER || 'yerel').toLowerCase() === 'firebase'

export function AuthSaglayici({ children }) {
  const [kullanici, setKullanici] = useState(null)
  const [hazir, setHazir] = useState(!FIREBASE_MI)

  /* Yerel oturumu geri yükle. */
  useEffect(() => {
    if (FIREBASE_MI) return
    try {
      const ham = sessionStorage.getItem(ANAHTAR)
      if (ham) setKullanici(JSON.parse(ham))
    } catch {
      /* okunamıyorsa oturum yok sayılır */
    }
  }, [])

  /* Firebase oturum dinleyicisi. */
  useEffect(() => {
    if (!FIREBASE_MI) return
    let cikis = () => {}
    let iptal = false
    ;(async () => {
      try {
        const [{ authAl }, { onAuthStateChanged }] = await Promise.all([
          import('./firebase.js'),
          import('firebase/auth'),
        ])
        const auth = await authAl()
        if (iptal || !auth) {
          setHazir(true)
          return
        }
        cikis = onAuthStateChanged(auth, (u) => {
          setKullanici(u ? { ad: u.email || u.uid, uid: u.uid, kaynak: 'firebase' } : null)
          setHazir(true)
        })
      } catch (h) {
        console.error('[auth] Firebase Auth başlatılamadı.', h)
        setHazir(true)
      }
    })()
    return () => {
      iptal = true
      cikis()
    }
  }, [])

  const girisYap = useCallback(async ({ eposta, parola }) => {
    if (FIREBASE_MI) {
      const [{ authAl }, { signInWithEmailAndPassword }] = await Promise.all([
        import('./firebase.js'),
        import('firebase/auth'),
      ])
      const auth = await authAl()
      if (!auth) throw new Error('FIREBASE AUTH YAPILANDIRILMAMIŞ.')
      await signInWithEmailAndPassword(auth, eposta, parola)
      return
    }
    if (parola !== YEREL_PAROLA) {
      throw new Error('PAROLA HATALI.')
    }
    const u = { ad: eposta?.trim() || 'K.BENAV', kaynak: 'yerel' }
    setKullanici(u)
    try {
      sessionStorage.setItem(ANAHTAR, JSON.stringify(u))
    } catch {
      /* oturum saklanamazsa sekme kapanınca çıkılır */
    }
  }, [])

  const cikisYap = useCallback(async () => {
    if (FIREBASE_MI) {
      const [{ authAl }, { signOut }] = await Promise.all([import('./firebase.js'), import('firebase/auth')])
      const auth = await authAl()
      if (auth) await signOut(auth)
      return
    }
    setKullanici(null)
    try {
      sessionStorage.removeItem(ANAHTAR)
    } catch {
      /* yok sayılır */
    }
  }, [])

  const deger = useMemo(
    () => ({ kullanici, hazir, girisYap, cikisYap, firebaseMi: FIREBASE_MI }),
    [kullanici, hazir, girisYap, cikisYap],
  )

  return <AuthBaglami.Provider value={deger}>{children}</AuthBaglami.Provider>
}

export function useAuth() {
  const d = useContext(AuthBaglami)
  if (!d) throw new Error('useAuth yalnızca <AuthSaglayici> içinde kullanılabilir.')
  return d
}
