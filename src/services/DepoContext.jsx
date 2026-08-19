/**
 * Depo bağlamı — uygulama açılışında adaptörü hazırlar ve alt ağaca verir.
 * Bileşenler `useDepo()` ile erişir; hangi adaptörün çalıştığını bilmezler.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { depoyuHazirla } from './repository/index.js'

const DepoBaglami = createContext(null)

export function DepoSaglayici({ children, yuklenirken = null }) {
  const [depo, setDepo] = useState(null)
  const [hata, setHata] = useState(null)

  useEffect(() => {
    let iptal = false
    depoyuHazirla().then(
      (d) => !iptal && setDepo(d),
      (h) => !iptal && setHata(h),
    )
    return () => {
      iptal = true
    }
  }, [])

  if (hata) throw hata
  if (!depo) return yuklenirken
  return <DepoBaglami.Provider value={depo}>{children}</DepoBaglami.Provider>
}

export function useDepo() {
  const depo = useContext(DepoBaglami)
  if (!depo) throw new Error('useDepo yalnızca <DepoSaglayici> içinde kullanılabilir.')
  return depo
}

/**
 * Depodan veri okur; yükleniyor/hata/veri üçlüsünü yönetir ve
 * depo değiştiğinde (abone) kendini tazeler.
 *
 * @param {(depo: object) => Promise<any>} okuyucu
 * @param {any[]} bagimliliklar
 */
export function useDepoVerisi(okuyucu, bagimliliklar = []) {
  const depo = useDepo()
  const [durum, setDurum] = useState({ veri: null, yukleniyor: true, hata: null })
  const okuyucuRef = useRef(okuyucu)
  okuyucuRef.current = okuyucu

  const anahtar = useMemo(() => bagimliliklar, bagimliliklar) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let iptal = false
    let ilk = true

    const calistir = () => {
      if (ilk) setDurum((d) => ({ ...d, yukleniyor: true, hata: null }))
      ilk = false
      okuyucuRef.current(depo).then(
        (veri) => !iptal && setDurum({ veri, yukleniyor: false, hata: null }),
        (hata) => !iptal && setDurum({ veri: null, yukleniyor: false, hata }),
      )
    }

    calistir()
    const cikis = depo.abone(calistir)
    return () => {
      iptal = true
      cikis()
    }
  }, [depo, anahtar])

  return durum
}
