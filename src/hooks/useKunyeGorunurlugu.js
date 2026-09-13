import { useEffect, useRef, useState } from 'react'
import useReducedMotion from './useReducedMotion.js'

/**
 * Sabit künyenin (ve duyuru şeridinin) görünürlük kuralı.
 *
 * Kullanıcı şikâyeti somuttu: künye her kaydırma konumunda ekranı işgal ediyor
 * ve okuma sırasında yoruyor. Tamamen kaldırmak tasarımın HUD kimliğini
 * öldürürdü; bunun yerine yaygın desen uygulanıyor:
 *
 *   - Sayfanın tepesindeyken (hero) HEP görünür.
 *   - Aşağı kaydırırken gizlenir — içerik okunurken ekran temiz.
 *   - Yukarı yönde ilk harekette geri gelir — "nerdeyim / nereye giderim"
 *     sorusunun cevabı bir parmak hareketi uzağında.
 *
 * Küçük kaydırma titremelerinin künyeyi açıp kapatmaması için yön değişimi
 * ancak birikmiş fark EŞİK'i aşınca kabul edilir. Azaltılmış harekette künye
 * hiç gizlenmez: görünüp kaybolan arayüz tam da o kullanıcıların istemediği şey.
 */
const TEPE_SINIRI = 120
const ESIK = 24

export default function useKunyeGorunurlugu() {
  const hareketAzalt = useReducedMotion()
  const [gorunur, setGorunur] = useState(true)
  const oncekiY = useRef(0)
  const birikim = useRef(0)

  useEffect(() => {
    if (hareketAzalt || typeof window === 'undefined') return undefined

    oncekiY.current = window.scrollY
    let kare = 0

    const oku = () => {
      kare = 0
      const y = window.scrollY
      const fark = y - oncekiY.current
      oncekiY.current = y

      if (y <= TEPE_SINIRI) {
        birikim.current = 0
        setGorunur(true)
        return
      }

      /* Yön değişince birikim sıfırdan başlar; aynı yönde toplanır. */
      if (Math.sign(fark) !== Math.sign(birikim.current)) birikim.current = 0
      birikim.current += fark

      if (birikim.current > ESIK) setGorunur(false)
      else if (birikim.current < -ESIK) setGorunur(true)
    }

    const kaydirildi = () => {
      if (!kare) kare = window.requestAnimationFrame(oku)
    }

    window.addEventListener('scroll', kaydirildi, { passive: true })
    return () => {
      window.removeEventListener('scroll', kaydirildi)
      if (kare) window.cancelAnimationFrame(kare)
    }
  }, [hareketAzalt])

  return hareketAzalt ? true : gorunur
}
