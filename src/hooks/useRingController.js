import { useEffect, useRef } from 'react'
import { CEMBER, pozisyonAcisi } from '../config/tokens.js'
import useReducedMotion from './useReducedMotion.js'

/**
 * 3D çemberin hareket mantığı.
 *
 * Dönüş açısı saniyede 60 kez değişir; bunu React state'inde tutmak her karede
 * bir render demek olurdu. Bu yüzden tüm kare döngüsü ref üzerinden çalışır ve
 * sonucu doğrudan DOM'a (style.transform / opacity / filter) yazar. React'e
 * yalnızca "ön eser değişti" olayı bildirilir — o da saniyede bir kereden seyrek.
 *
 * @param {object} secenekler
 * @param {number} secenekler.adet              Çemberdeki eser sayısı
 * @param {boolean} [secenekler.otomatikDonus]  Kendiliğinden dönsün mü
 * @param {number} [secenekler.hiz]             Otomatik dönüş hızı (derece/kare)
 * @param {boolean} [secenekler.kapali]         Tüm hareketi durdur (boş çember, önizleme)
 * @param {(indeks:number)=>void} [secenekler.onOnEserDegisti]
 * @returns {{bolgeRef:object, halkaRef:object, sigdirRef:object, kartRefleri:object, onIndeks:object}}
 */
export default function useRingController({
  adet = 0,
  otomatikDonus = true,
  hiz = CEMBER.otomatikHiz,
  kapali = false,
  onOnEserDegisti,
} = {}) {
  const bolgeRef = useRef(null)
  const halkaRef = useRef(null)
  const sigdirRef = useRef(null)
  /** Kart elemanları — çember sırasına göre indekslenir, derinlik gölgelemesi için. */
  const kartRefleri = useRef([])
  const onIndeks = useRef(-1)

  const azaltilmisHareket = useReducedMotion()
  /* Sakin kip: otomatik dönüş, atalet ve bulanıklık kapalı; sürükleme birebir takip eder. */
  const sakin = kapali || azaltilmisHareket

  const durum = useRef({
    rot: 0,
    vel: 0,
    drag: false,
    lastX: 0,
    /** Klavye ile verilen hedef açı; null ise serbest dönüş. */
    hedef: null,
    /** Son yazılan blur değerleri — aynı değeri tekrar yazmak layout'u boşuna kirletir. */
    bulanikOnbellek: [],
  })

  /* Kare döngüsü her karede buradan okur; böylece döngü bir kez kurulur. */
  const ayarRef = useRef({ adet, otomatikDonus, hiz, sakin, onOnEserDegisti })
  useEffect(() => {
    ayarRef.current = { adet, otomatikDonus, hiz, sakin, onOnEserDegisti }
  })

  /*
   * Çember eser yokken hiç basılmaz, dolayısıyla ilk açılışta bağlanacak eleman
   * da yoktur. Yönetim panelinden ilk eser yayınlandığında halka sonradan
   * belirir; aşağıdaki etkilerin o anda yeniden çalışması için bu bayrak
   * bağımlılık listelerinde duruyor.
   */
  const cemberVar = adet > 0

  /* --- ölçekleme: 1680×1060 referans sahnesi görüntü alanına sığdırılır --- */
  useEffect(() => {
    const olcekle = () => {
      const sigdir = sigdirRef.current
      if (!sigdir) return
      const s = Math.max(
        CEMBER.enKucukOlcek,
        Math.min(
          1,
          Math.min(
            window.innerWidth / CEMBER.referansGenislik,
            window.innerHeight / CEMBER.referansYukseklik,
          ),
        ),
      )
      sigdir.style.transformOrigin = CEMBER.perspektifOdagi
      sigdir.style.transform = `scale(${s.toFixed(3)})`
    }
    olcekle()
    window.addEventListener('resize', olcekle)
    window.addEventListener('orientationchange', olcekle)
    return () => {
      window.removeEventListener('resize', olcekle)
      window.removeEventListener('orientationchange', olcekle)
    }
  }, [cemberVar])

  /* --- işaretçi: sürükle + atalet --- */
  useEffect(() => {
    const bolge = bolgeRef.current
    if (!bolge) return
    const d = durum.current
    /* Yakalamanın hangi elemana verildiği; bırakırken aynısına iade edilir. */
    let yakalayan = null

    const bas = (e) => {
      d.drag = true
      d.vel = 0
      d.hedef = null
      d.lastX = e.clientX
      /*
       * Yakalamayı bölgeye değil, basılan KARTA veriyoruz. Bölgeye verilseydi
       * sonraki pointerup kartın üstünden bölgeye taşınır ve kartın kendi
       * tıklama algısı hiç tetiklenmezdi. Kart bölgenin torunu olduğu için
       * olay yine kabarıp buraya ulaşır — sürükleme bozulmaz.
       */
      yakalayan =
        (e.target instanceof Element && e.target.closest('[data-work]')) || bolge
      if (yakalayan.setPointerCapture) {
        try {
          yakalayan.setPointerCapture(e.pointerId)
        } catch {
          yakalayan = null
        }
      }
    }

    const oynat = (e) => {
      if (!d.drag) return
      const dx = e.clientX - d.lastX
      d.lastX = e.clientX
      const donus = dx * CEMBER.surukleKatsayisi
      d.rot += donus
      /* Sakin kipte savrulma yok: parmak kalkınca çember anında durur. */
      d.vel = ayarRef.current.sakin ? 0 : donus
    }

    const birak = (e) => {
      d.drag = false
      if (yakalayan?.releasePointerCapture && e?.pointerId != null) {
        try {
          yakalayan.releasePointerCapture(e.pointerId)
        } catch {
          /* yakalama zaten düşmüş olabilir */
        }
      }
      yakalayan = null
    }

    bolge.addEventListener('pointerdown', bas)
    bolge.addEventListener('pointermove', oynat)
    bolge.addEventListener('pointerup', birak)
    bolge.addEventListener('pointercancel', birak)
    return () => {
      bolge.removeEventListener('pointerdown', bas)
      bolge.removeEventListener('pointermove', oynat)
      bolge.removeEventListener('pointerup', birak)
      bolge.removeEventListener('pointercancel', birak)
    }
  }, [cemberVar])

  /* --- klavye: ok tuşlarıyla bir pozisyon, Home ile başa --- */
  useEffect(() => {
    const bolge = bolgeRef.current
    if (!bolge) return
    const d = durum.current

    const tus = (e) => {
      const adim = pozisyonAcisi(ayarRef.current.adet)
      if (!adim) return
      const temel = d.hedef == null ? d.rot : d.hedef
      if (e.key === 'ArrowRight') {
        /* Sıradaki esere geç: halka ters yöne döner ki i+1 öne gelsin. */
        d.hedef = temel - adim
      } else if (e.key === 'ArrowLeft') {
        d.hedef = temel + adim
      } else if (e.key === 'Home') {
        /* İlk esere en yakın tam turdan dön — gereksiz tur atmasın. */
        d.hedef = Math.round(d.rot / 360) * 360
      } else {
        return
      }
      e.preventDefault()
      d.vel = 0
    }

    bolge.addEventListener('keydown', tus)
    return () => bolge.removeEventListener('keydown', tus)
  }, [cemberVar])

  /* --- kare döngüsü --- */
  useEffect(() => {
    let kare = 0
    const rad = Math.PI / 180
    const d = durum.current

    const tik = () => {
      kare = requestAnimationFrame(tik)
      const { adet: n, otomatikDonus: oto, hiz: h, sakin: sk, onOnEserDegisti: bildir } =
        ayarRef.current

      if (d.hedef != null) {
        /* Klavye hedefi: sakin kipte anında, normalde yumuşak yaklaşarak. */
        const fark = d.hedef - d.rot
        if (sk || Math.abs(fark) < 0.05) {
          d.rot = d.hedef
          d.hedef = null
        } else {
          d.rot += fark * 0.18
        }
      } else if (!d.drag) {
        if (sk) d.vel = 0
        else {
          d.vel *= CEMBER.sonum
          d.rot += d.vel
        }
        if (oto && !sk && Math.abs(d.vel) < CEMBER.otomatikEsik) d.rot += h
      }

      const halka = halkaRef.current
      if (halka) halka.style.transform = `rotateX(${CEMBER.egim}deg) rotateY(${d.rot}deg)`

      const adim = pozisyonAcisi(n)
      const kartlar = kartRefleri.current
      let enIyi = -2
      let enIyiIndeks = -1

      for (let i = 0; i < n; i++) {
        /* f = 1 tam önde, f = -1 tam arkada. */
        const f = Math.cos((i * adim + d.rot) * rad)
        if (f > enIyi) {
          enIyi = f
          enIyiIndeks = i
        }
        const el = kartlar[i]
        if (!el) continue
        const yakinlik = 0.5 + 0.5 * f
        el.style.opacity = (0.14 + 0.86 * yakinlik ** 1.7).toFixed(3)
        const bulanik = sk ? 0 : Math.round((1 - yakinlik) * 5)
        if (d.bulanikOnbellek[i] !== bulanik) {
          d.bulanikOnbellek[i] = bulanik
          el.style.filter = bulanik ? `blur(${bulanik}px)` : 'none'
        }
      }

      if (enIyiIndeks !== -1 && enIyiIndeks !== onIndeks.current) {
        onIndeks.current = enIyiIndeks
        bildir?.(enIyiIndeks)
      }
    }

    kare = requestAnimationFrame(tik)
    return () => cancelAnimationFrame(kare)
  }, [])

  /* Eser sayısı değişince eski kart referansları ve blur önbelleği geçersizdir. */
  useEffect(() => {
    kartRefleri.current.length = adet
    durum.current.bulanikOnbellek = new Array(adet).fill(-1)
    if (onIndeks.current >= adet) onIndeks.current = -1
  }, [adet])

  return { bolgeRef, halkaRef, sigdirRef, kartRefleri, onIndeks }
}
