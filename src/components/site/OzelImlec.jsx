import { useEffect, useRef, useState } from 'react'
import useReducedMotion from '../../hooks/useReducedMotion.js'

/** Tasarımdaki imleç geçişleri — cubic-bezier(.16,1,.3,1). */
const CIKIS = 'cubic-bezier(.16,1,.3,1)'

/**
 * mix-blend-mode: difference ile çalışan özel imleç.
 *
 * Üç durum var: boşta 7px nokta, galeri bölgesinin üstünde 58px halka,
 * bir eser kartının üstünde 38px artı. Durum, imlecin altındaki gerçek
 * elemana bakılarak (elementFromPoint + closest) belirlenir; böylece 3B
 * dönen çemberde hangi kartın gerçekten üstte olduğu doğru bulunur.
 *
 * Dokunmatik cihazda ya da "hareketi azalt" tercihinde hiç render edilmez —
 * o durumda sistem imleci de gizlenmez.
 *
 * @param {object} props
 * @param {boolean} [props.kapali] A6 "özel imleç" anahtarı kapalıysa true
 */
export default function OzelImlec({ kapali = false }) {
  const sarmalRef = useRef(null)
  const noktaRef = useRef(null)
  const halkaRef = useRef(null)
  const artiRef = useRef(null)

  const fareRef = useRef({ x: 0, y: 0 })
  const imlecRef = useRef({ x: 0, y: 0 })
  const modRef = useRef('bosta')

  const azaltilmisHareket = useReducedMotion()
  const [kabaIsaretci, setKabaIsaretci] = useState(() =>
    typeof matchMedia === 'function' ? matchMedia('(pointer: coarse)').matches : false,
  )

  /* Fare/dokunmatik değişebilir (2'si1 arada cihazlar, harici fare takılması). */
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia('(pointer: coarse)')
    const degisti = (e) => setKabaIsaretci(e.matches)
    mq.addEventListener('change', degisti)
    return () => mq.removeEventListener('change', degisti)
  }, [])

  const etkin = !kapali && !kabaIsaretci && !azaltilmisHareket

  /* Sistem imlecini gizleme kancası — global CSS bunu cursor:none'a bağlıyor. */
  useEffect(() => {
    if (!etkin || typeof document === 'undefined') return
    const kok = document.documentElement
    kok.dataset.ozelImlec = 'acik'
    return () => {
      delete kok.dataset.ozelImlec
    }
  }, [etkin])

  useEffect(() => {
    if (!etkin) return
    const sarmal = sarmalRef.current
    const nokta = noktaRef.current
    const halka = halkaRef.current
    const arti = artiRef.current
    if (!sarmal || !nokta || !halka || !arti) return

    fareRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    imlecRef.current = { ...fareRef.current }

    const modAyarla = (mod) => {
      if (modRef.current === mod) return
      modRef.current = mod
      nokta.style.opacity = mod === 'bosta' ? '1' : '0'
      halka.style.opacity = mod === 'galeri' ? '1' : '0'
      halka.style.transform = mod === 'galeri' ? 'scale(1)' : 'scale(.4)'
      arti.style.opacity = mod === 'eser' ? '1' : '0'
      arti.style.transform = mod === 'eser' ? 'rotate(0deg) scale(1)' : 'rotate(-30deg) scale(.5)'
    }

    const hareket = (e) => {
      fareRef.current.x = e.clientX
      fareRef.current.y = e.clientY
      // Sarmal pointer-events:none olduğu için elementFromPoint onu atlar.
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const eserUstunde = Boolean(el && el.closest && el.closest('[data-work]'))
      const galeriIcinde = Boolean(el && el.closest && el.closest('[data-zone="gallery"]'))
      modAyarla(eserUstunde ? 'eser' : galeriIcinde ? 'galeri' : 'bosta')
    }

    const cikis = () => {
      sarmal.style.opacity = '0'
    }
    const giris = () => {
      sarmal.style.opacity = '1'
    }

    window.addEventListener('pointermove', hareket, { passive: true })
    document.addEventListener('pointerleave', cikis)
    document.addEventListener('pointerenter', giris)

    let raf = 0
    const dongu = () => {
      raf = window.requestAnimationFrame(dongu)
      const fare = fareRef.current
      const imlec = imlecRef.current
      imlec.x += (fare.x - imlec.x) * 0.22
      imlec.y += (fare.y - imlec.y) * 0.22
      sarmal.style.transform = `translate3d(${imlec.x}px,${imlec.y}px,0)`
    }
    raf = window.requestAnimationFrame(dongu)

    return () => {
      window.cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', hareket)
      document.removeEventListener('pointerleave', cikis)
      document.removeEventListener('pointerenter', giris)
    }
  }, [etkin])

  if (!etkin) return null

  return (
    <div
      ref={sarmalRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-imlec"
      style={{ willChange: 'transform', mixBlendMode: 'difference' }}
    >
      <div
        ref={noktaRef}
        className="absolute h-[7px] w-[7px] rounded-full bg-ink"
        style={{ margin: '-3.5px 0 0 -3.5px', transition: 'opacity .2s' }}
      />
      <div
        ref={halkaRef}
        className="absolute h-[58px] w-[58px] rounded-full"
        style={{
          margin: '-29px 0 0 -29px',
          border: '1px solid rgba(234,234,234,.85)',
          opacity: 0,
          transform: 'scale(.4)',
          transition: `opacity .25s, transform .35s ${CIKIS}`,
        }}
      />
      <div
        ref={artiRef}
        className="absolute h-[38px] w-[38px]"
        style={{
          margin: '-19px 0 0 -19px',
          opacity: 0,
          transform: 'rotate(-30deg) scale(.5)',
          transition: `opacity .2s, transform .4s ${CIKIS}`,
        }}
      >
        <div className="absolute left-0 top-1/2 h-px w-full bg-ink" />
        <div className="absolute left-1/2 top-0 h-full w-px bg-ink" />
      </div>
    </div>
  )
}
