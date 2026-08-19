/**
 * A3 — Görsel yükleme & kırpma modali.
 *
 * Ölçüler tel kafesten birebir: modal 1200 geniş, gövde 250px | 1fr | 280px,
 * kırpma alanı en az 430px, köşe tutamakları 9×9, ölçek kaydırıcısının izi 1px.
 *
 * Kırpma matematiği neden burada değil de `utils/goruntu.js`'te: bu bileşen
 * yalnızca "kullanıcı ne görüyor" sorusundan sorumlu. Önizlemedeki yerleşim ile
 * üretilen dosyanın aynı olmasını, ikisinin de tek bir kırpma dikdörtgeninden
 * (döndürülmüş kaynak uzayında x/y/w/h) türetilmesi sağlıyor.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDepo, useDepoVerisi } from '../../services/DepoContext.jsx'
import HataKutusu from '../common/HataKutusu.jsx'
import LazyImage from '../common/LazyImage.jsx'
import { Alan, AnahtarSatiri, Dugme, EkranNotlari, MetinAlani, cn } from './ui.jsx'
import {
  KABUL_EDILEN,
  MAKS_BAYT,
  ORANLAR,
  bayt,
  cikisOlculeri,
  dosyayiOku,
  kirpVeOlcekle,
  oranDegeri,
} from '../../utils/goruntu.js'

const ODAK_SECICI =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Kırpma alanının kenar payı — tel kafeste 430px alanda 400px çerçeve var. */
const ALAN_PAYI = 32
const EN_KUCUK_OLCEK = 1
const EN_BUYUK_OLCEK = 4

const A3_NOTLARI = [
  'Çember kartları 3:4 kullanır; başka oran seçilirse kart içinde kırpma uyarısı çıkar.',
  'Yükleme sırasında WEBP + 2× retina türevleri arka planda üretilir.',
]

const kelepce = (deger, en, cok) => Math.min(cok, Math.max(en, deger))

export default function GorselKirpmaModali({ acik, eser, onKapat, onKaydedildi }) {
  const depo = useDepo()

  /* Eseri depodan canlı okuruz: yükleme/silme sonrası küçük resim şeridi
     üst bileşen yeniden render etmese de kendini tazeler. */
  const { veri: tazeEser } = useDepoVerisi(
    (d) => (acik && eser?.id ? d.eserGetir(eser.id) : Promise.resolve(null)),
    [acik, eser?.id],
  )
  const aktifEser = tazeEser || eser || null
  const gorseller = useMemo(() => aktifEser?.gorseller || [], [aktifEser])
  /* Efektler eseri ref üzerinden okur: bağımlılık listesine koyunca her depo
     tazelemesinde görsel yeniden çözülür, koymayınca kapanış bayatlar. */
  const aktifEserRef = useRef(aktifEser)
  aktifEserRef.current = aktifEser
  const gorsellerRef = useRef(gorseller)
  gorsellerRef.current = gorseller

  /* ---- durum ---- */
  const [secili, setSecili] = useState(null)
  const [yeniDosya, setYeniDosya] = useState(null)
  const [kaynak, setKaynak] = useState(null) // {bitmap, genislik, yukseklik}
  const [kaynakAdi, setKaynakAdi] = useState('')
  const [onizlemeUrl, setOnizlemeUrl] = useState(null)

  const [oran, setOran] = useState('3:4')
  const [donus, setDonus] = useState(0)
  const [olcek, setOlcek] = useState(1)
  const [ofset, setOfset] = useState({ x: 0, y: 0 })
  const [degisti, setDegisti] = useState(false)

  const [alt, setAlt] = useState('')
  const [altHatasi, setAltHatasi] = useState('')
  const [anaYap, setAnaYap] = useState(false)

  const [cikti, setCikti] = useState(null) // {id, bayt, tur} — üretilmiş dosyanın gerçek ağırlığı
  const [yukleniyor, setYukleniyor] = useState(false)
  const [isleniyor, setIsleniyor] = useState(false)
  const [hata, setHata] = useState(null)
  const [silOnayi, setSilOnayi] = useState(false)
  const [suruklu, setSuruklu] = useState(false)
  const [alan, setAlan] = useState({ g: 0, y: 0 })

  const modalRef = useRef(null)
  const alanRef = useRef(null)
  const cerceveRef = useRef(null)
  const altRef = useRef(null)
  const dosyaRef = useRef(null)
  const surukleRef = useRef(null)
  const onizlemeRef = useRef({ url: null, bizim: false })
  const kaynakRef = useRef(null)
  const olcekRef = useRef(1)
  olcekRef.current = olcek

  /* ---- kaynak/önizleme yaşam döngüsü ---- */

  const onizlemeAta = useCallback((url, bizim) => {
    const onceki = onizlemeRef.current
    if (onceki.url && onceki.bizim && onceki.url !== url) URL.revokeObjectURL(onceki.url)
    onizlemeRef.current = { url, bizim }
    setOnizlemeUrl(url)
  }, [])

  const kaynakAta = useCallback((yeni) => {
    // ImageBitmap'ler GC'ye bırakılmaz; büyük TIFF/JPEG'lerde bellek şişer.
    kaynakRef.current?.bitmap?.close?.()
    kaynakRef.current = yeni
    setKaynak(yeni)
  }, [])

  useEffect(
    () => () => {
      kaynakRef.current?.bitmap?.close?.()
      const { url, bizim } = onizlemeRef.current
      if (url && bizim) URL.revokeObjectURL(url)
    },
    [],
  )

  const donusumuSifirla = useCallback(() => {
    setDonus(0)
    olcekRef.current = 1
    setOlcek(1)
    setOfset({ x: 0, y: 0 })
    setDegisti(false)
  }, [])

  /* Modal açılınca / eser değişince temiz başla ve ana görseli seç. */
  useEffect(() => {
    if (!acik) return
    const liste = gorsellerRef.current
    const anaId = aktifEserRef.current?.anaGorselId ?? null
    const baslangic = liste.find((g) => g.id === anaId) || liste[0] || null
    setSecili(baslangic?.id ?? null)
    setYeniDosya(null)
    kaynakAta(null)
    onizlemeAta(null, false)
    setKaynakAdi('')
    setAlt('')
    setAltHatasi('')
    setAnaYap(!liste.length)
    setOran('3:4')
    setHata(null)
    setSilOnayi(false)
    setCikti(null)
    donusumuSifirla()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik, eser?.id])

  /* Seçili görselin ikilisini tuval kaynağı yap. Depoda saklanan ikili zaten
     kırpılmış çıktıdır; yeniden kırpmada başlangıç dönüşümü sıfırlanır. */
  useEffect(() => {
    if (!acik || !secili || yeniDosya) return
    let iptal = false
    setYukleniyor(true)
    setHata(null)
    ;(async () => {
      try {
        const kayit = gorsellerRef.current.find((g) => g.id === secili)
        const url = typeof depo.gorselUrl === 'function' ? await depo.gorselUrl(secili) : null
        if (!url) throw new Error('GÖRSEL VERİSİ BULUNAMADI — YENİDEN YÜKLEYİN.')
        const okunan = await dosyayiOku(await (await fetch(url)).blob())
        if (iptal) return
        onizlemeAta(url, false) // URL blobStore'a ait — burada serbest bırakılmaz
        kaynakAta(okunan)
        setKaynakAdi(kayit?.kaynakAdi || '')
        setAlt(kayit?.alt || '')
        setAltHatasi('')
        setAnaYap(aktifEserRef.current?.anaGorselId === secili)
        setOran(ORANLAR.some((o) => o.ad === kayit?.oran) ? kayit.oran : '3:4')
        // Kaydetmenin hemen ardından yeniden yükleniyorsak üretilen ağırlık korunur.
        setCikti((c) => (c && c.id === secili ? c : null))
        donusumuSifirla()
      } catch (h) {
        if (!iptal) setHata(h)
      } finally {
        if (!iptal) setYukleniyor(false)
      }
    })()
    return () => {
      iptal = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acik, secili, yeniDosya, depo])

  /* ---- dosya alma ---- */

  const dosyaAl = useCallback(
    async (dosya) => {
      if (!dosya) return
      setHata(null)
      setSilOnayi(false)
      if (dosya.size > MAKS_BAYT) {
        setHata(new Error(`DOSYA ÇOK BÜYÜK — ${bayt(dosya.size)}. SINIR: MAKS 40MB.`))
        return
      }
      setYukleniyor(true)
      try {
        const okunan = await dosyayiOku(dosya)
        kaynakAta(okunan)
        onizlemeAta(URL.createObjectURL(dosya), true)
        setYeniDosya(dosya)
        setSecili(null)
        setKaynakAdi(dosya.name || 'ADSIZ')
        setAlt('')
        setAltHatasi('')
        setAnaYap(!gorsellerRef.current.length)
        setCikti(null)
        donusumuSifirla()
      } catch (h) {
        setHata(h)
      } finally {
        setYukleniyor(false)
      }
    },
    [donusumuSifirla, kaynakAta, onizlemeAta],
  )

  /* ---- ölçüler: çerçeve, kapsama, kırpma dikdörtgeni ---- */

  useEffect(() => {
    if (!acik) return
    const el = alanRef.current
    if (!el) return
    const olc = () => setAlan({ g: el.clientWidth, y: el.clientHeight })
    olc()
    if (typeof ResizeObserver === 'undefined') return
    const gozlemci = new ResizeObserver(olc)
    gozlemci.observe(el)
    return () => gozlemci.disconnect()
  }, [acik])

  const dik = donus === 90 || donus === 270
  const donukG = kaynak ? (dik ? kaynak.yukseklik : kaynak.genislik) : 0
  const donukY = kaynak ? (dik ? kaynak.genislik : kaynak.yukseklik) : 0

  const cerceve = useMemo(() => {
    const kaynakOrani = donukG && donukY ? donukG / donukY : 3 / 4
    const enBoy = oranDegeri(oran) ?? kaynakOrani
    const kullanG = Math.max(60, alan.g - ALAN_PAYI)
    const kullanY = Math.max(60, alan.y - ALAN_PAYI)
    let g = kullanG
    let y = g / enBoy
    if (y > kullanY) {
      y = kullanY
      g = y * enBoy
    }
    return { g: Math.round(g), y: Math.round(y) }
  }, [alan, oran, donukG, donukY])

  // olcek = 1 → görsel çerçeveyi tam kaplar; altına inilemez, çerçeve boş kalmasın.
  const kapsama = useMemo(() => {
    if (!donukG || !donukY || !cerceve.g) return 0
    return Math.max(cerceve.g / donukG, cerceve.y / donukY)
  }, [donukG, donukY, cerceve])

  const gosterG = donukG * kapsama * olcek
  const gosterY = donukY * kapsama * olcek

  const ofsetK = useMemo(() => {
    const enX = Math.max(0, (gosterG - cerceve.g) / 2)
    const enY = Math.max(0, (gosterY - cerceve.y) / 2)
    return { x: kelepce(ofset.x, -enX, enX), y: kelepce(ofset.y, -enY, enY) }
  }, [ofset, gosterG, gosterY, cerceve])

  const kirpma = useMemo(() => {
    if (!kaynak || !kapsama || !cerceve.g) return null
    const piksel = 1 / (kapsama * olcek) // 1 ekran pikseli = kaç kaynak pikseli
    const x = (gosterG / 2 - cerceve.g / 2 - ofsetK.x) * piksel
    const y = (gosterY / 2 - cerceve.y / 2 - ofsetK.y) * piksel
    return {
      x: kelepce(x, 0, Math.max(0, donukG - 1)),
      y: kelepce(y, 0, Math.max(0, donukY - 1)),
      w: kelepce(cerceve.g * piksel, 1, donukG),
      h: kelepce(cerceve.y * piksel, 1, donukY),
      olcek: Number(olcek.toFixed(3)),
      donus,
    }
  }, [kaynak, kapsama, cerceve, olcek, ofsetK, gosterG, gosterY, donukG, donukY, donus])

  const ciktiOlcusu = useMemo(
    () => cikisOlculeri(oran, donukG && donukY ? donukG / donukY : undefined),
    [oran, donukG, donukY],
  )

  /* ---- etkileşim ---- */

  /* Ölçek bir ref üzerinden okunur: aynı karede art arda gelen tekerlek
     olayları birikerek çalışsın, ama setState güncelleyicisinin içinde
     başka state'e dokunmayalım. */
  const olcekAyarla = useCallback((uret) => {
    const simdi = olcekRef.current
    const yeni = kelepce(typeof uret === 'function' ? uret(simdi) : uret, EN_KUCUK_OLCEK, EN_BUYUK_OLCEK)
    if (yeni === simdi) return
    olcekRef.current = yeni
    setOlcek(yeni)
    setDegisti(true)
    setCikti(null) // ekrandaki kırpım artık üretilen dosyayla aynı değil
  }, [])

  const kaydir = useCallback((dx, dy) => {
    setOfset((o) => ({ x: o.x + dx, y: o.y + dy }))
    setDegisti(true)
    setCikti(null)
  }, [])

  /* React tekerlek dinleyicisini pasif bağlar; sayfa kaymasını engellemek için
     doğrudan DOM'a passive:false ile bağlıyoruz. */
  useEffect(() => {
    const el = cerceveRef.current
    if (!acik || !el) return
    const tekerlek = (e) => {
      e.preventDefault()
      olcekAyarla((o) => o * (e.deltaY < 0 ? 1.06 : 1 / 1.06))
    }
    el.addEventListener('wheel', tekerlek, { passive: false })
    return () => el.removeEventListener('wheel', tekerlek)
  }, [acik, olcekAyarla, kaynak])

  const surukleBasla = (e) => {
    if (!kaynak) return
    e.preventDefault()
    cerceveRef.current?.focus()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    surukleRef.current = { x: e.clientX, y: e.clientY, taban: ofsetK }
  }

  const surukleHareket = (e) => {
    const s = surukleRef.current
    if (!s) return
    setOfset({ x: s.taban.x + (e.clientX - s.x), y: s.taban.y + (e.clientY - s.y) })
    setDegisti(true)
    setCikti(null)
  }

  const surukleBitir = (e) => {
    if (!surukleRef.current) return
    surukleRef.current = null
    e.currentTarget.releasePointerCapture?.(e.pointerId)
  }

  const cerceveTus = (e) => {
    if (!kaynak) return
    const adim = e.shiftKey ? 10 : 1
    switch (e.key) {
      /* Ok yönü görselin gittiği yön — sürüklemeyle aynı his. */
      case 'ArrowLeft':
        e.preventDefault()
        kaydir(-adim, 0)
        break
      case 'ArrowRight':
        e.preventDefault()
        kaydir(adim, 0)
        break
      case 'ArrowUp':
        e.preventDefault()
        kaydir(0, -adim)
        break
      case 'ArrowDown':
        e.preventDefault()
        kaydir(0, adim)
        break
      case '+':
      case '=':
        e.preventDefault()
        olcekAyarla((o) => o + 0.05)
        break
      case '-':
      case '_':
        e.preventDefault()
        olcekAyarla((o) => o - 0.05)
        break
      default:
        break
    }
  }

  const dondur = () => {
    setDonus((d) => (d + 270) % 360) // ↺ — saat yönünün tersi
    setOfset({ x: 0, y: 0 })
    setDegisti(true)
    setCikti(null)
  }

  const oranSec = (ad) => {
    setOran(ad)
    setOfset({ x: 0, y: 0 })
    setDegisti(true)
    setCikti(null)
  }

  /* ---- modal kabuğu: odak, Esc, kaydırma kilidi ---- */

  useEffect(() => {
    if (!acik) return
    const oncekiOdak = document.activeElement
    const oncekiTasma = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = oncekiTasma
      if (oncekiOdak instanceof HTMLElement) oncekiOdak.focus()
    }
  }, [acik])

  useEffect(() => {
    if (!acik) return
    const kare = requestAnimationFrame(() => {
      const ilk = modalRef.current?.querySelector(ODAK_SECICI)
      if (ilk instanceof HTMLElement) ilk.focus()
    })
    return () => cancelAnimationFrame(kare)
  }, [acik])

  const modalTus = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      if (isleniyor) return
      onKapat?.()
      return
    }
    if (e.key !== 'Tab') return
    const kap = modalRef.current
    if (!kap) return
    const ogeler = Array.from(kap.querySelectorAll(ODAK_SECICI)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    )
    if (!ogeler.length) return
    const ilk = ogeler[0]
    const son = ogeler[ogeler.length - 1]
    if (e.shiftKey && document.activeElement === ilk) {
      e.preventDefault()
      son.focus()
    } else if (!e.shiftKey && document.activeElement === son) {
      e.preventDefault()
      ilk.focus()
    }
  }

  /* ---- kaydetme / silme ---- */

  const seciliGorsel = gorseller.find((g) => g.id === secili) || null

  const kaydet = async () => {
    if (!kaynak || !kirpma || !aktifEser) return
    if (!alt.trim()) {
      setAltHatasi('ALT METİN ZORUNLU — GÖRSEL BU METİNSİZ YAYINLANAMAZ.')
      altRef.current?.focus()
      return
    }
    setAltHatasi('')
    setHata(null)
    setIsleniyor(true)
    try {
      const anaOlsun = anaYap || !aktifEser.anaGorselId || aktifEser.anaGorselId === secili

      // Piksel değişmediyse yeniden kodlamaya gerek yok: yalnızca üstveri güncellenir.
      if (secili && !yeniDosya && !degisti) {
        await depo.gorselUstveriGuncelle(aktifEser.id, secili, { alt: alt.trim(), oran })
        if (anaYap && aktifEser.anaGorselId !== secili) await depo.anaGorselAta(aktifEser.id, secili)
        onKaydedildi?.(await depo.eserGetir(aktifEser.id))
        return
      }

      const uretim = await kirpVeOlcekle({
        kaynak: kaynak.bitmap,
        kirpma,
        hedefGenislik: ciktiOlcusu.genislik,
        hedefYukseklik: ciktiOlcusu.yukseklik,
      })
      setCikti({ id: null, bayt: uretim.blob.size, tur: uretim.tur })

      const sonuc = await depo.gorselYukle(aktifEser.id, uretim.blob, {
        alt: alt.trim(),
        genislik: uretim.genislik,
        yukseklik: uretim.yukseklik,
        kaynakAdi: kaynakAdi || 'ADSIZ',
        kirpma,
        oran,
        anaYap: anaOlsun,
      })

      // Var olan bir görselin yeniden kırpımıysa eskisini bırak (önce yeni yazıldı).
      if (secili && !yeniDosya) await depo.gorselSil(aktifEser.id, secili)

      const yeniKayit = sonuc.gorseller[sonuc.gorseller.length - 1]
      setCikti({ id: yeniKayit?.id ?? null, bayt: uretim.blob.size, tur: uretim.tur })
      setYeniDosya(null)
      setSecili(yeniKayit?.id ?? null)
      setDegisti(false)
      onKaydedildi?.(sonuc)
    } catch (h) {
      setHata(h)
    } finally {
      setIsleniyor(false)
    }
  }

  const sil = async () => {
    if (!secili || !aktifEser) return
    setIsleniyor(true)
    setHata(null)
    try {
      await depo.gorselSil(aktifEser.id, secili)
      const kalan = gorsellerRef.current.filter((g) => g.id !== secili)
      setSilOnayi(false)
      setYeniDosya(null)
      kaynakAta(null)
      onizlemeAta(null, false)
      setKaynakAdi('')
      setAlt('')
      setCikti(null)
      donusumuSifirla()
      setSecili(kalan[0]?.id ?? null)
      onKaydedildi?.(await depo.eserGetir(aktifEser.id))
    } catch (h) {
      setHata(h)
    } finally {
      setIsleniyor(false)
    }
  }

  const sifirla = () => {
    donusumuSifirla()
    setOran(seciliGorsel && ORANLAR.some((o) => o.ad === seciliGorsel.oran) ? seciliGorsel.oran : '3:4')
    setAlt(yeniDosya ? '' : seciliGorsel?.alt || '')
    setAltHatasi('')
    setHata(null)
  }

  if (!acik || !aktifEser) return null

  /* ---- türetilmiş metinler (hepsi canlı) ---- */

  const kod = aktifEser.cemberde && aktifEser.sira >= 0 ? String(aktifEser.sira + 1).padStart(2, '0') : null
  const baslikMetni = `GÖRSEL DÜZENLE — ${kod ? `${kod} ` : ''}${(aktifEser.baslik || 'ADSIZ ESER').toUpperCase()}`
  /* Ağırlık ancak ekrandaki kırpım gerçekten üretilmiş dosyayla eşleşiyorsa
     gösterilir; aksi halde "—". Uydurma rakam yok. */
  const agirlikMetni =
    cikti && !degisti && cikti.id === (yeniDosya ? null : secili)
      ? `${bayt(cikti.bayt)} (${cikti.tur.replace('image/', '').toUpperCase()})`
      : !yeniDosya && !degisti && seciliGorsel?.kaynakBayt
        ? bayt(seciliGorsel.kaynakBayt)
        : '—'
  const boyutMetni = kaynak ? `${kaynak.genislik} × ${kaynak.yukseklik}` : '—'
  const cemberUyarisi = aktifEser.cemberde && oran !== '3:4'
  const kaydedilebilir = Boolean(kaynak && kirpma) && !isleniyor && !yukleniyor

  const bilgiler = [
    ['KAYNAK', kaynakAdi ? kaynakAdi.toUpperCase() : '—'],
    ['BOYUT', boyutMetni],
    ['ÇIKTI', `${ciktiOlcusu.genislik} × ${ciktiOlcusu.yukseklik}`],
    ['AĞIRLIK', agirlikMetni],
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isleniyor) onKapat?.()
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={baslikMetni}
        onKeyDown={modalTus}
        className="flex max-h-[92vh] w-full max-w-[1200px] flex-col border border-ink/20 bg-admin-panel"
      >
        {/* ---- üst çubuk ---- */}
        <div className="flex items-center gap-4 border-b border-ink/15 px-6 py-[18px] text-mini tracking-genis">
          <h2 className="text-mini tracking-genis">{baslikMetni}</h2>
          <button
            type="button"
            onClick={() => onKapat?.()}
            disabled={isleniyor}
            aria-label="KAPAT"
            className="ml-auto px-1 text-ink/40 transition-colors hover:text-ink disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:min-h-[640px] lg:grid-cols-[250px_1fr_280px]">
            {/* ================= SOL — görsel şeridi ================= */}
            <div className="border-b border-ink/10 p-[22px] lg:border-b-0 lg:border-r">
              <h3 className="pb-3 text-micro tracking-genis text-ink/40">
                BU ESERİN GÖRSELLERİ ({gorseller.length})
              </h3>

              {gorseller.length === 0 ? (
                <p className="text-micro leading-loose tracking-[0.14em] text-ink/30">
                  HENÜZ GÖRSEL YOK.
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-2.5">
                  {gorseller.map((g, i) => {
                    const bu = g.id === secili
                    const ana = aktifEser.anaGorselId === g.id
                    return (
                      <li key={g.id} className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setYeniDosya(null)
                            setSecili(g.id)
                            setSilOnayi(false)
                          }}
                          aria-pressed={bu}
                          aria-label={`GÖRSEL ${String(i + 1).padStart(2, '0')}${ana ? ' — ANA GÖRSEL' : ''}${
                            g.alt ? ` — ${g.alt}` : ' — ALT METİN YOK'
                          }`}
                          className={cn(
                            'block w-full border transition-colors',
                            bu ? 'border-ink' : 'border-ink/20 hover:border-ink/45',
                          )}
                        >
                          <LazyImage gorselId={g.id} alt="" className="aspect-[3/4] w-full" />
                        </button>
                        {ana && (
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute right-[5px] top-[5px] bg-admin-bg px-1 py-0.5 text-[8px] tracking-[0.1em]"
                          >
                            ANA
                          </span>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}

              {/* ---- bırakma alanı ---- */}
              <button
                type="button"
                onClick={() => dosyaRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setSuruklu(true)
                }}
                onDragLeave={() => setSuruklu(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setSuruklu(false)
                  dosyaAl(e.dataTransfer?.files?.[0])
                }}
                disabled={isleniyor}
                className={cn(
                  'mt-3.5 block w-full border border-dashed px-3 py-[22px] text-center text-micro leading-loose tracking-[0.16em] transition-colors disabled:opacity-40',
                  suruklu ? 'border-tas text-tas' : 'border-ink/30 text-ink/45 hover:border-ink/60 hover:text-ink/70',
                )}
              >
                DOSYA SÜRÜKLE
                <br />
                VEYA SEÇ
                <br />
                <span className={suruklu ? 'text-tas' : 'text-ink/30'}>JPG / TIFF — MAKS 40MB</span>
              </button>
              <input
                ref={dosyaRef}
                type="file"
                accept={KABUL_EDILEN}
                className="sr-only"
                aria-label="GÖRSEL DOSYASI SEÇ"
                onChange={(e) => {
                  dosyaAl(e.target.files?.[0])
                  e.target.value = '' // aynı dosya art arda seçilebilsin
                }}
              />
            </div>

            {/* ================= ORTA — kırpma tuvali ================= */}
            <div className="flex flex-col gap-[18px] bg-black/[0.22] p-[26px]">
              {/* oran sekmeleri */}
              <div className="flex flex-wrap gap-2 text-micro tracking-[0.16em]">
                <div role="tablist" aria-label="KIRPMA ORANI" className="flex flex-wrap gap-2">
                  {ORANLAR.map((o) => {
                    const bu = o.ad === oran
                    return (
                      <button
                        key={o.ad}
                        type="button"
                        role="tab"
                        aria-selected={bu}
                        disabled={isleniyor}
                        onClick={() => oranSec(o.ad)}
                        className={cn(
                          'border px-[11px] py-[7px] transition-colors disabled:opacity-40',
                          bu ? 'border-ink text-ink' : 'border-ink/20 text-ink/45 hover:border-ink/45 hover:text-ink/70',
                        )}
                      >
                        {o.ad.toUpperCase()}
                      </button>
                    )
                  })}
                </div>
                <button
                  type="button"
                  onClick={dondur}
                  disabled={!kaynak || isleniyor}
                  aria-label={`90 DERECE DÖNDÜR — ŞU AN ${donus}°`}
                  className="ml-auto border border-ink/20 px-[11px] py-[7px] text-ink/45 transition-colors hover:border-ink/45 hover:text-ink/70 disabled:opacity-40"
                >
                  ↺ 90°
                </button>
              </div>

              {/* tuval alanı */}
              <div
                ref={alanRef}
                className="relative flex min-h-[430px] flex-1 items-center justify-center border border-ink/10"
              >
                {kaynak && cerceve.g > 0 ? (
                  <div
                    ref={cerceveRef}
                    tabIndex={0}
                    role="group"
                    aria-label="KIRPMA ÇERÇEVESİ — SÜRÜKLE VEYA OK TUŞLARIYLA KONUMLA, ARTI VE EKSİ İLE ÖLÇEKLE"
                    onPointerDown={surukleBasla}
                    onPointerMove={surukleHareket}
                    onPointerUp={surukleBitir}
                    onPointerCancel={surukleBitir}
                    onKeyDown={cerceveTus}
                    style={{ width: cerceve.g, height: cerceve.y }}
                    className="relative cursor-move touch-none overflow-hidden outline outline-1 outline-ink focus-visible:outline-2 focus-visible:outline-tas"
                  >
                    {onizlemeUrl && (
                      <img
                        src={onizlemeUrl}
                        alt=""
                        draggable={false}
                        style={{
                          position: 'absolute',
                          left: `calc(50% + ${ofsetK.x}px)`,
                          top: `calc(50% + ${ofsetK.y}px)`,
                          width: kaynak.genislik * kapsama * olcek,
                          height: kaynak.yukseklik * kapsama * olcek,
                          maxWidth: 'none',
                          transform: `translate(-50%, -50%) rotate(${donus}deg)`,
                          transformOrigin: 'center',
                        }}
                      />
                    )}

                    {/* üçte-bir ızgarası */}
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3"
                    >
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            i % 3 !== 2 && 'border-r border-ink/[0.16]',
                            i < 6 && 'border-b border-ink/[0.16]',
                          )}
                        />
                      ))}
                    </div>

                    {/* köşe tutamakları — 9×9 */}
                    <span aria-hidden="true" className="pointer-events-none absolute -left-1 -top-1 h-[9px] w-[9px] bg-ink" />
                    <span aria-hidden="true" className="pointer-events-none absolute -right-1 -top-1 h-[9px] w-[9px] bg-ink" />
                    <span aria-hidden="true" className="pointer-events-none absolute -bottom-1 -left-1 h-[9px] w-[9px] bg-ink" />
                    <span aria-hidden="true" className="pointer-events-none absolute -bottom-1 -right-1 h-[9px] w-[9px] bg-ink" />
                  </div>
                ) : (
                  <p className="px-6 text-center text-micro leading-loose tracking-[0.16em] text-ink/30">
                    {yukleniyor ? 'GÖRSEL AÇILIYOR…' : 'SOLDAN BİR GÖRSEL SEÇİN VEYA YENİ DOSYA YÜKLEYİN'}
                  </p>
                )}

                <p className="pointer-events-none absolute bottom-3 left-3.5 text-micro tracking-[0.16em] text-ink/35">
                  SÜRÜKLE — KONUMLA · SCROLL — ÖLÇEK
                </p>

                {(isleniyor || yukleniyor) && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="absolute inset-0 flex items-center justify-center bg-admin-panel/80 text-micro tracking-genis text-ink/70"
                  >
                    {isleniyor ? 'İŞLENİYOR…' : 'AÇILIYOR…'}
                  </div>
                )}
              </div>

              {/* ölçek */}
              <div className="flex items-center gap-4">
                <label htmlFor="kb-olcek" className="text-micro tracking-genis text-ink/40">
                  ÖLÇEK
                </label>
                <input
                  id="kb-olcek"
                  type="range"
                  min={EN_KUCUK_OLCEK}
                  max={EN_BUYUK_OLCEK}
                  step={0.01}
                  value={olcek}
                  disabled={!kaynak || isleniyor}
                  onChange={(e) => olcekAyarla(Number(e.target.value))}
                  className="h-[11px] flex-1 cursor-pointer appearance-none bg-transparent disabled:opacity-40 [&::-moz-range-thumb]:h-[11px] [&::-moz-range-thumb]:w-[11px] [&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-ink [&::-moz-range-track]:h-px [&::-moz-range-track]:bg-ink/25 [&::-webkit-slider-runnable-track]:h-px [&::-webkit-slider-runnable-track]:bg-ink/25 [&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:h-[11px] [&::-webkit-slider-thumb]:w-[11px] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:bg-ink"
                />
                <span className="w-[52px] text-right text-micro tracking-[0.16em] text-ink/55">
                  {olcek.toFixed(2)}×
                </span>
              </div>
            </div>

            {/* ================= SAĞ — üstveri ve eylemler ================= */}
            <div className="grid content-start gap-[22px] border-t border-ink/10 px-[22px] py-[26px] lg:border-l lg:border-t-0">
              <Alan etiket="ALT METİN (ERİŞİLEBİLİRLİK)" zorunlu hata={altHatasi}>
                <MetinAlani
                  ref={altRef}
                  className="h-[76px]"
                  value={alt}
                  hatali={Boolean(altHatasi)}
                  aria-invalid={Boolean(altHatasi)}
                  aria-label="ALT METİN (ERİŞİLEBİLİRLİK)"
                  placeholder="Dövme çelik gövde, üç yerinden çatlamış, atölye zemininde."
                  disabled={!kaynak || isleniyor}
                  onChange={(e) => {
                    setAlt(e.target.value)
                    if (altHatasi) setAltHatasi('')
                  }}
                />
              </Alan>

              <dl className="grid gap-[9px] text-micro leading-relaxed tracking-[0.16em] text-ink/40">
                {bilgiler.map(([etiket, deger]) => (
                  <div key={etiket} className="flex items-baseline justify-between gap-3">
                    <dt>{etiket}</dt>
                    <dd className="truncate text-right text-ink">{deger}</dd>
                  </div>
                ))}
              </dl>

              {cemberUyarisi && (
                <p className="border border-tas/40 bg-tas/[0.07] p-3 text-micro leading-loose tracking-[0.14em] text-tas">
                  ÇEMBER KARTI 3:4 KULLANIR — {oran.toUpperCase()} SEÇİLDİĞİ İÇİN GÖRSEL KART İÇİNDE KIRPILACAK.
                </p>
              )}

              <div className="border-t border-ink/15 pt-[18px]">
                <AnahtarSatiri
                  etiket="ANA GÖRSEL YAP"
                  acik={anaYap}
                  onChange={setAnaYap}
                  pasif={!kaynak || isleniyor || (Boolean(secili) && aktifEser.anaGorselId === secili)}
                />
              </div>

              <div className="flex gap-2.5">
                <Dugme tur="birincil" className="flex-1" onClick={kaydet} disabled={!kaydedilebilir}>
                  {isleniyor ? 'İŞLENİYOR…' : 'KIRP & KAYDET'}
                </Dugme>
                <Dugme onClick={sifirla} disabled={!kaynak || isleniyor}>
                  SIFIRLA
                </Dugme>
              </div>

              {secili && (
                <div className="border-t border-ink/15 pt-[18px]">
                  {silOnayi ? (
                    <div className="grid gap-2.5">
                      <p className="text-micro leading-loose tracking-[0.14em] text-ink/45">
                        BU GÖRSEL SİLİNECEK — GERİ ALINAMAZ.
                      </p>
                      <div className="flex gap-2.5">
                        <Dugme tur="tehlike" className="flex-1" onClick={sil} disabled={isleniyor}>
                          EVET, SİL
                        </Dugme>
                        <Dugme tur="sade" onClick={() => setSilOnayi(false)} disabled={isleniyor}>
                          VAZGEÇ
                        </Dugme>
                      </div>
                    </div>
                  ) : (
                    <Dugme tur="tehlike" onClick={() => setSilOnayi(true)} disabled={isleniyor}>
                      SİL
                    </Dugme>
                  )}
                </div>
              )}

              {hata && <HataKutusu hata={hata} />}
            </div>
          </div>

          <div className="border-t border-ink/10 px-6 pb-6">
            <EkranNotlari notlar={A3_NOTLARI} />
          </div>
        </div>
      </div>
    </div>
  )
}
