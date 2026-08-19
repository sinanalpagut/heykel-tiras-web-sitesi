import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import useReducedMotion from './useReducedMotion.js'

/*
 * Eklenti kaydı modül düzeyinde, yani uygulama ömrü boyunca bir kez yapılır.
 * Kancanın içine alınsaydı her montajda yeniden çağrılırdı; gsap bunu yutar
 * ama gereksiz iştir.
 */
gsap.registerPlugin(ScrollTrigger)

/** Kancalara ref yerine doğrudan eleman da geçilebilsin diye. */
function koku(deger) {
  if (!deger) return null
  if (deger instanceof Element) return deger
  if ('current' in deger) return deger.current instanceof Element ? deger.current : null
  /* {hero: ref} gibi bir ref demeti */
  for (const alt of Object.values(deger)) {
    const bulunan = koku(alt)
    if (bulunan) return bulunan
  }
  return null
}

/**
 * Kapsayıcı içindeki [data-rv] elemanlarını kaydırmayla açar, [data-creep]
 * varsa yatay olarak sürükler.
 *
 * Kurulum gsap.context içinde yapılır ve sökülürken ctx.revert() çağrılır:
 * React 19 StrictMode geliştirmede bileşeni iki kez monte ettiği için,
 * revert olmadan aynı elemana iki tetikleyici birikir ve açılış iki kez
 * oynar (ya da yarım kalır).
 *
 * @param {{current: Element|null}|Element} kapsayiciRef
 * @param {{kapali?: boolean}} [secenekler] kapali=true ise hiç animasyon kurulmaz
 */
export default function useGsapReveal(kapsayiciRef, { kapali = false } = {}) {
  const hareketAzalt = useReducedMotion()
  const iptal = kapali || hareketAzalt

  useEffect(() => {
    const kok = koku(kapsayiciRef)
    if (!kok) return

    const acilanlar = Array.from(kok.querySelectorAll('[data-rv]'))

    if (iptal) {
      /*
       * Animasyon kurulmuyorsa içerik ASLA gizli kalmamalı. Önceki bir
       * kurulumdan kalmış satır içi opacity/transform/filter değerlerini
       * temizle; hiç kurulum olmadıysa bu çağrı zaten etkisizdir.
       */
      if (acilanlar.length) gsap.set(acilanlar, { clearProps: 'opacity,transform,filter' })
      return
    }

    const ctx = gsap.context(() => {
      /*
       * Bir eleman yalnızca tek bir kanca tarafından sahiplenilir. Bölüm
       * kendi açılışını kurarken sayfa kökü de aynı kancayı çağırırsa
       * (iç içe kullanım) aynı [data-rv] iki tween almasın diye işaretliyoruz.
       */
      const hedefler = acilanlar.filter((el) => !el.__kbAcilis)
      hedefler.forEach((el) => {
        el.__kbAcilis = true
        gsap.fromTo(
          el,
          { y: 74, opacity: 0, filter: 'blur(9px)' },
          {
            y: 0,
            opacity: 1,
            filter: 'blur(0px)',
            duration: 1.25,
            ease: 'expo.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          },
        )
      })

      const creep = kok.querySelector('[data-creep]')
      const creepSahibiyiz = Boolean(creep) && !creep.__kbCreep
      if (creepSahibiyiz) {
        creep.__kbCreep = true
        gsap.to(creep, {
          xPercent: -34,
          ease: 'none',
          scrollTrigger: {
            trigger: creep.parentElement,
            start: 'top bottom',
            end: 'bottom top',
            scrub: 1.1,
          },
        })
      }

      /* context.revert() bu temizliği de çalıştırır — sahiplik bayrakları kalmasın. */
      return () => {
        hedefler.forEach((el) => {
          delete el.__kbAcilis
        })
        if (creepSahibiyiz) delete creep.__kbCreep
      }
    }, kok)

    return () => ctx.revert()
  }, [kapsayiciRef, iptal])
}

/**
 * Hero bölümünün kaydırma koreografisi: çember yukarı kaçıp silinir, dev isim
 * aşağı sürüklenip harf aralığı açılır, okuma satırı erkenden kaybolur.
 *
 * Elemanlar hero kapsayıcısının içinden okunur; biri yoksa sessizce atlanır —
 * böylece hero'nun parçaları ayrı ayrı geliştirilebilir.
 *
 * @param {{current: Element|null}|Element|object} refler Hero kökü (ref, eleman
 *   ya da içinde ref barındıran bir demet)
 * @param {{kapali?: boolean}} [secenekler]
 */
export function useHeroKoreografi(refler, { kapali = false } = {}) {
  const hareketAzalt = useReducedMotion()
  const iptal = kapali || hareketAzalt

  /*
   * Çağıran taraf {hero: ref} gibi satır içi bir nesne geçebilir; bunu
   * bağımlılık dizisine koysaydık her render'da kurulum sökülüp yeniden
   * kurulur, scrub ilerlemesi sıfırlanırdı. Son değeri bir ref'te tutuyoruz.
   */
  const sonReflerRef = useRef(refler)
  useEffect(() => {
    sonReflerRef.current = refler
  })

  useEffect(() => {
    if (iptal) return
    const hero = koku(sonReflerRef.current)
    if (!hero) return

    const ctx = gsap.context(() => {
      const bul = (secici) => hero.querySelector(secici)
      const tetik = { trigger: hero, start: 'top top', end: 'bottom top' }

      const halka = bul('[data-ring-wrap]')
      if (halka) {
        gsap.to(halka, {
          y: -180,
          scale: 0.82,
          opacity: 0.12,
          ease: 'none',
          scrollTrigger: { ...tetik, scrub: 0.6 },
        })
      }

      const devIsim = bul('[data-bigname]')
      if (devIsim) {
        gsap.to(devIsim, {
          y: 170,
          letterSpacing: '.06em',
          ease: 'none',
          scrollTrigger: { ...tetik, scrub: 0.8 },
        })
      }

      const okuma = bul('[data-readout]')
      if (okuma) {
        gsap.to(okuma, {
          y: 60,
          opacity: 0,
          ease: 'none',
          scrollTrigger: { trigger: hero, start: 'top top', end: '25% top', scrub: 0.4 },
        })
      }
    }, hero)

    return () => ctx.revert()
  }, [iptal])
}
