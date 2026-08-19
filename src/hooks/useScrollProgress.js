import { useEffect, useRef, useState } from 'react'

/** scrollY / innerHeight — 1.0 tam bir ekran yüksekliği kaydırma demek. */
function oranHesapla() {
  if (typeof window === 'undefined') return 0
  return window.scrollY / Math.max(1, window.innerHeight)
}

/**
 * Sayfa kaydırma ilerlemesi.
 *
 * İki tüketici tipi var ve ihtiyaçları zıt:
 *  - Shader arka planı her karede değeri okur; kaydırma başına React render'ı
 *    istemez (60 fps'te bileşen ağacını yeniden çizmek shader'ı bozar).
 *  - Arayüz bileşenleri (ilerleme çubuğu vb.) değeri render'a taşımak ister.
 * Bu yüzden değer her zaman `oranRef` üzerinden yazılır; `durumuIzle` açıkça
 * true verilmedikçe hiç setState çağrılmaz, yani hook varsayılan olarak
 * render tetiklemez.
 *
 * @param {boolean} [durumuIzle] true ise `oran` da güncellenir (render tetikler)
 * @returns {{oran: number, oranRef: {current: number}}}
 */
export default function useScrollProgress(durumuIzle = false) {
  const oranRef = useRef(0)
  const [oran, setOran] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return

    let kare = 0

    const yaz = () => {
      kare = 0
      const yeni = oranHesapla()
      oranRef.current = yeni
      if (durumuIzle) setOran(yeni)
    }

    // Kaydırma olayı kareden sık gelir; rAF ile kare başına bir okumaya kısıyoruz.
    const kisitla = () => {
      if (kare) return
      kare = window.requestAnimationFrame(yaz)
    }

    // Sayfa yenilendiğinde tarayıcı kaydırma konumunu geri yükleyebilir —
    // ilk değeri olayı beklemeden yaz.
    yaz()

    window.addEventListener('scroll', kisitla, { passive: true })
    window.addEventListener('resize', kisitla, { passive: true })
    return () => {
      if (kare) window.cancelAnimationFrame(kare)
      window.removeEventListener('scroll', kisitla)
      window.removeEventListener('resize', kisitla)
    }
  }, [durumuIzle])

  return { oran, oranRef }
}
