/**
 * A6 — Site ayarları.
 *
 * Bu ekranda yapılan her değişiklik TASLAK ayarlara yazılır (~400 ms geciktirilmiş).
 * Site yalnızca yayınlanmış sürümü okur; "YAYINLA" denene kadar canlıya hiçbir şey
 * gitmez. Bu yüzden jetonlar :root'a değil, yalnızca sağdaki önizleme çerçevesine
 * uygulanır — panelin kendi rengi taslaktan etkilenmez.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDepo, useDepoVerisi } from '../../services/DepoContext.jsx'
import { cemberEserleri } from '../../services/repository/contract.js'
import {
  applyTokens,
  CEMBER,
  JETON_ETIKETLERI,
  JETON_SECENEKLERI,
  kontrastOrani,
  pozisyonAcisi,
  YAZI_TIPI_SECENEKLERI,
} from '../../config/tokens.js'
import useReducedMotion from '../../hooks/useReducedMotion.js'
import Iskelet from '../../components/common/Iskelet.jsx'
import HataKutusu from '../../components/common/HataKutusu.jsx'
import {
  Alan,
  AnahtarSatiri,
  cn,
  Dugme,
  EkranBasligi,
  EkranNotlari,
  Girdi,
  MetinAlani,
  OnayKutusu,
  Panel,
  PanelCubugu,
  Rozet,
  Secim,
} from '../../components/admin/ui.jsx'

const SEKMELER = [
  { deger: 'gorunum', etiket: 'GÖRÜNÜM' },
  { deger: 'cember', etiket: 'ÇEMBER' },
  { deger: 'seo', etiket: 'SEO' },
  { deger: 'yedek', etiket: 'YEDEK' },
]

/**
 * Kontrast denetiminin karşılaştırma ekseni.
 * Metin jetonları zemine (beton) göre ölçülür; beton ve çikolata birer YÜZEY
 * olduğu için onların anlamlı ölçüsü üzerlerine gelen tipografiyle olan orandır.
 */
const KONTRAST_REFERANSI = {
  beton: { karsi: 'ink', etiket: 'TİPOGRAFİ İLE' },
  ink: { karsi: 'beton', etiket: 'BETON ÜZERİNDE' },
  cikolata: { karsi: 'ink', etiket: 'TİPOGRAFİ İLE' },
  metal: { karsi: 'beton', etiket: 'BETON ÜZERİNDE' },
  tas: { karsi: 'beton', etiket: 'BETON ÜZERİNDE' },
}

const KONTRAST_ESIGI = 4.5

const iki = (n) => String(n).padStart(2, '0')

/** "18.08.26 — 22:41" */
function zamanMetni(ms) {
  if (!ms) return '—'
  const t = new Date(ms)
  return `${iki(t.getDate())}.${iki(t.getMonth() + 1)}.${String(t.getFullYear()).slice(-2)} — ${iki(t.getHours())}:${iki(
    t.getMinutes(),
  )}`
}

/** Yedek dosyası adı için tarih: 2026-08-19 */
function dosyaTarihi() {
  const t = new Date()
  return `${t.getFullYear()}-${iki(t.getMonth() + 1)}-${iki(t.getDate())}`
}

const hexGecerli = (d) => /^#[0-9a-f]{6}$/i.test(d)

/** Taslak ile yayındaki ayarların farkını bulmak için derin karşılaştırma. */
function esitMi(a, b) {
  if (a === b) return true
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  const ak = Object.keys(a)
  const bk = Object.keys(b)
  if (ak.length !== bk.length) return false
  return ak.every((k) => esitMi(a[k], b[k]))
}

/** Yazı tipi adı → gerçek CSS ailesi/kalınlığı (önizleme için). */
const yaziAilesi = (ad) => (String(ad).startsWith('Syne') ? "'Syne', sans-serif" : "'Space Mono', monospace")
const yaziKalinligi = (ad) => (String(ad).includes('ExtraBold') ? 800 : String(ad).includes('Bold') ? 700 : 400)

/* ============================ küçük parçalar ============================ */

function BolumBasligi({ children, className = '' }) {
  return <h3 className={cn('text-micro tracking-[0.22em] text-ink/40', className)}>{children}</h3>
}

/** Etiket + sağda canlı değer + brütalist kaydırıcı. */
function Kaydirici({ etiket, deger, min, max, adim, bicim, onChange }) {
  const metin = bicim(deger)
  return (
    <div>
      <div className="flex items-center justify-between pb-3.5 text-micro tracking-genis text-ink/40">
        <span>{etiket}</span>
        <span className="text-ink">{metin}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={adim}
        value={deger}
        aria-label={etiket}
        aria-valuetext={metin}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ accentColor: 'var(--kb-ink)' }}
        className="h-1 w-full cursor-pointer appearance-none bg-ink/25"
      />
    </div>
  )
}

/** Tek jeton satırı: ad · hex girdisi · renk kutusu (+ hazır seçenekler, + kontrast uyarısı). */
function JetonSatiri({ anahtar, jetonlar, onChange }) {
  const deger = jetonlar[anahtar]
  const etiket = JETON_ETIKETLERI[anahtar]
  const secenekler = JETON_SECENEKLERI[anahtar]
  // Girdi yazılırken yarım kalmış hex ("#3f") değeri jetona yazılmasın.
  const [taslak, setTaslak] = useState(deger)
  const [oncekiDeger, setOncekiDeger] = useState(deger)
  // Renk dışarıdan değişince (seçici, hazır kare, yedekten dönüş) girdiyi eşitle.
  if (deger !== oncekiDeger) {
    setOncekiDeger(deger)
    setTaslak(deger)
  }

  const referans = KONTRAST_REFERANSI[anahtar]
  const oran = kontrastOrani(deger, jetonlar[referans.karsi])
  const dusuk = oran < KONTRAST_ESIGI
  const oranMetni = `${oran.toFixed(1)}:1`

  const yaz = (v) => {
    setTaslak(v)
    // Renk seçici yalnızca küçük harfli #rrggbb kabul eder.
    if (hexGecerli(v)) onChange(anahtar, v.toLowerCase())
  }

  return (
    <div className="grid gap-2.5">
      <div className="grid grid-cols-[1fr_130px_34px] items-center gap-3 text-mini tracking-[0.1em]">
        <span id={`jeton-${anahtar}`}>{etiket}</span>
        <input
          value={taslak}
          onChange={(e) => yaz(e.target.value.trim())}
          onBlur={() => setTaslak(deger)}
          aria-labelledby={`jeton-${anahtar}`}
          aria-invalid={!hexGecerli(taslak)}
          spellCheck={false}
          className={cn(
            'h-8 w-full border bg-ink/[0.03] px-2.5 text-mini tracking-[0.1em] uppercase text-ink/60 outline-none transition-colors focus:border-ink/60 focus:text-ink',
            hexGecerli(taslak) ? 'border-ink/20' : 'border-tas',
          )}
        />
        <span
          className="relative block h-8 w-[34px] border border-ink/25 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-tas"
          style={{ background: deger }}
        >
          <input
            type="color"
            value={deger}
            onChange={(e) => onChange(anahtar, e.target.value)}
            aria-label={`${etiket} rengini seç`}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </span>
      </div>

      {secenekler && (
        <div className="flex items-center justify-end gap-1.5">
          <span className="mr-auto text-micro tracking-[0.14em] text-ink/25">HAZIR</span>
          {secenekler.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange(anahtar, s)}
              aria-label={`${etiket}: ${s}`}
              aria-pressed={s.toLowerCase() === String(deger).toLowerCase()}
              title={s}
              style={{ background: s }}
              className={cn(
                'h-[18px] w-[18px] border transition-colors',
                s.toLowerCase() === String(deger).toLowerCase() ? 'border-ink' : 'border-ink/25 hover:border-ink/60',
              )}
            />
          ))}
        </div>
      )}

      <p className={cn('text-micro tracking-[0.14em]', dusuk ? 'text-tas' : 'text-ink/30')}>
        {referans.etiket} {oranMetni}
        {dusuk && ' — 4.5:1 ALTINDA'}
      </p>
    </div>
  )
}

/** Esc ile kapanan, odağı içeride tutan onay kipi. */
function OnayKipi({ baslik, mesaj, onayMetni = 'ONAYLA', tehlike, onOnay, onIptal, children, calisiyor, onayPasif }) {
  const kutuRef = useRef(null)

  useEffect(() => {
    const kutu = kutuRef.current
    const oncekiOdak = document.activeElement
    const odaklanabilirler = () =>
      [...kutu.querySelectorAll('button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])')].filter(
        (e) => !e.disabled,
      )
    odaklanabilirler()[0]?.focus()

    const tus = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onIptal()
        return
      }
      if (e.key !== 'Tab') return
      const l = odaklanabilirler()
      if (!l.length) return
      const ilk = l[0]
      const son = l[l.length - 1]
      if (e.shiftKey && document.activeElement === ilk) {
        e.preventDefault()
        son.focus()
      } else if (!e.shiftKey && document.activeElement === son) {
        e.preventDefault()
        ilk.focus()
      }
    }

    kutu.addEventListener('keydown', tus)
    return () => {
      kutu.removeEventListener('keydown', tus)
      if (oncekiOdak instanceof HTMLElement) oncekiOdak.focus()
    }
  }, [onIptal])

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-6">
      <div
        ref={kutuRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onay-basligi"
        className="w-full max-w-[460px] border border-ink/25 bg-admin-panel p-6"
      >
        <h2 id="onay-basligi" className="text-detay tracking-detay">
          {baslik}
        </h2>
        <p className="pt-4 text-detay leading-loose text-ink/60">{mesaj}</p>
        {children}
        <div className="flex justify-end gap-2.5 pt-6">
          <Dugme onClick={onIptal} disabled={calisiyor}>
            VAZGEÇ
          </Dugme>
          <Dugme tur={tehlike ? 'tehlike' : 'birincil'} onClick={onOnay} disabled={calisiyor || onayPasif}>
            {calisiyor ? 'ÇALIŞIYOR…' : onayMetni}
          </Dugme>
        </div>
      </div>
    </div>
  )
}

/* ============================ ana ekran ============================ */

export default function SiteAyarlari() {
  /*
   * Panel gerçeği söylesin: "indekslensin" anahtarı yalnızca sayfadaki meta
   * etiketini değiştirir. robots.txt sitenin tamamını taramaya kapattıysa o
   * anahtar AÇIK olsa bile arama motoru siteye hiç giremez — meta etiketini
   * okuyamaz bile. Anahtarı açan biri sitesinin dizinleneceğini sanırdı.
   *
   * Dosyayı çalışma zamanında okuyoruz çünkü robots.txt derlemeye değil,
   * public/ klasörüne ait; kodda sabit bir varsayım yanlış olurdu.
   */
  const [robotsEngelliyor, setRobotsEngelliyor] = useState(false)
  useEffect(() => {
    let iptal = false
    fetch('/robots.txt', { cache: 'no-store' })
      .then((y) => (y.ok ? y.text() : null))
      .then((metin) => {
        if (iptal || metin == null) return
        /* SPA yeniden yazma kuralı dosya yoksa HTML döndürür — o robots.txt değil. */
        if (/^\s*</.test(metin)) return
        const engel = metin
          .split('\n')
          .map((satir) => satir.trim())
          .filter((satir) => satir && !satir.startsWith('#'))
          .some((satir) => /^disallow:\s*\/\s*$/i.test(satir))
        setRobotsEngelliyor(engel)
      })
      .catch(() => {
        /* Ağ hatasında sessiz kal: yanlış alarm, hiç uyarı vermemekten kötü. */
      })
    return () => {
      iptal = true
    }
  }, [])

  const depo = useDepo()
  const azaltilmisHareket = useReducedMotion()

  const [sekme, setSekme] = useState('gorunum')
  const [ayarlar, setAyarlar] = useState(null)
  const [yukleniyor, setYukleniyor] = useState(true)
  const [hata, setHata] = useState(null)
  const [tazele, setTazele] = useState(0)

  const [kayit, setKayit] = useState('bos') // 'bos' | 'bekliyor' | 'kaydedildi'
  const [kayitHatasi, setKayitHatasi] = useState(null)
  const [islem, setIslem] = useState(null) // 'yayin' | 'donus' | 'yedek'
  const [kip, setKip] = useState(null)
  const [surumlerAcik, setSurumlerAcik] = useState(false)
  const [yedekDurumu, setYedekDurumu] = useState(null) // {iyi:boolean, mesaj:string}
  const [tohumOnayi, setTohumOnayi] = useState(false)

  const sonRef = useRef(null)
  const zamanlayici = useRef(null)
  const onizlemeRef = useRef(null)
  const dosyaRef = useRef(null)

  /* ---- taslak ayarlar: bir kez okunur, sonrasında yerel durum söz sahibidir
         (depo her kayıtta abonelerini uyarır; okuma yazarken yazılanı ezmesin).
         Tazelemede iskelete dönülmez — eski değerler yenisi gelene kadar durur. ---- */
  useEffect(() => {
    let iptal = false
    depo.ayarlariGetir().then(
      (a) => {
        if (iptal) return
        setAyarlar(a)
        setHata(null)
        setYukleniyor(false)
      },
      (h) => {
        if (iptal) return
        setHata(h)
        setYukleniyor(false)
      },
    )
    return () => {
      iptal = true
    }
  }, [depo, tazele])

  useEffect(() => {
    sonRef.current = ayarlar
  }, [ayarlar])

  // Ekrandan çıkarken bekleyen taslak kaydı kaybolmasın.
  useEffect(
    () => () => {
      if (!zamanlayici.current) return
      clearTimeout(zamanlayici.current)
      /* Bileşen sökülüyor: hatayı ekranda gösterecek yer kalmadı. Ama yutmak da
         olmaz — kullanıcı ayarları kaydettiğini sanıp geri döndüğünde eski değeri
         görür ve neyin kaybolduğunu açıklayan hiçbir iz bulunmaz. En azından
         sebebi konsola bırakıyoruz. */
      if (sonRef.current) {
        depo.ayarlariKaydet(sonRef.current).catch((h) => {
          console.error('[A6] Ekrandan çıkarken bekleyen taslak kaydı YAZILAMADI.', h)
        })
      }
    },
    [depo],
  )

  const yayinlarDurumu = useDepoVerisi((d) => d.yayinlariGetir(), [])
  const yayindakiDurumu = useDepoVerisi((d) => d.yayindakiAyarlariGetir(), [])
  const eserlerDurumu = useDepoVerisi((d) => d.eserleriGetir(), [])

  const yayinlar = yayinlarDurumu.veri || []
  const sonYayin = yayinlar[0] || null
  const cemberdekiler = useMemo(() => cemberEserleri(eserlerDurumu.veri || []), [eserlerDurumu.veri])
  const acilisListede = cemberdekiler.some((e) => e.id === ayarlar?.cember?.acilisEserId)
  const farkVar = ayarlar && yayindakiDurumu.veri ? !esitMi(ayarlar, yayindakiDurumu.veri) : false

  /* ---- taslak kaydı (geciktirilmiş) ---- */
  const planla = useCallback(() => {
    setKayit('bekliyor')
    setKayitHatasi(null)
    clearTimeout(zamanlayici.current)
    zamanlayici.current = setTimeout(() => {
      zamanlayici.current = null
      depo.ayarlariKaydet(sonRef.current).then(
        () => setKayit('kaydedildi'),
        (h) => {
          setKayit('bos')
          setKayitHatasi(h)
        },
      )
    }, 400)
  }, [depo])

  const guncelle = useCallback(
    (bolum, yama) => {
      setAyarlar((o) => (o ? { ...o, [bolum]: { ...o[bolum], ...yama } } : o))
      planla()
    },
    [planla],
  )

  const jetonDegistir = useCallback((anahtar, deger) => guncelle('jetonlar', { [anahtar]: deger }), [guncelle])

  /**
   * Bekleyen taslak yazımını iptal eder. Sürüme dönüş / yedekten geri yükleme /
   * sıfırlama sırasında şart: yoksa 400 ms'lik kuyrukta bekleyen eski ayarlar,
   * yeni gelen verinin üzerine yazar.
   */
  const bekleyeniIptalEt = useCallback(() => {
    clearTimeout(zamanlayici.current)
    zamanlayici.current = null
    setKayit('bos')
  }, [])

  /* ---- canlı önizleme: jetonlar yalnızca bu çerçeveye yazılır ---- */
  useEffect(() => {
    if (!ayarlar || !onizlemeRef.current) return
    applyTokens(ayarlar.jetonlar, ayarlar.tipografi, onizlemeRef.current)
  }, [ayarlar, sekme])

  /* ---- eylemler ---- */
  const yayinla = async () => {
    if (!sonRef.current) return
    setIslem('yayin')
    setKayitHatasi(null)
    try {
      clearTimeout(zamanlayici.current)
      zamanlayici.current = null
      await depo.ayarlariKaydet(sonRef.current)
      setKayit('kaydedildi')
      await depo.ayarlariYayinla()
    } catch (h) {
      setKayitHatasi(h)
    } finally {
      setIslem(null)
    }
  }

  const surumeDon = async (yayin) => {
    setIslem('donus')
    bekleyeniIptalEt()
    try {
      await depo.yayinaDon(yayin.id)
      setSurumlerAcik(false)
      setTazele((n) => n + 1)
    } catch (h) {
      setKayitHatasi(h)
    } finally {
      setIslem(null)
      setKip(null)
    }
  }

  const disaAktar = async () => {
    setIslem('yedek')
    setYedekDurumu(null)
    try {
      const paket = await depo.disaAktar()
      const url = URL.createObjectURL(new Blob([JSON.stringify(paket, null, 2)], { type: 'application/json' }))
      const bag = document.createElement('a')
      bag.href = url
      bag.download = `kese-benav-yedek-${dosyaTarihi()}.json`
      document.body.appendChild(bag)
      bag.click()
      bag.remove()
      // Bazı tarayıcılar indirmeyi eşzamanlı revoke ile iptal ediyor; bir tur bekle.
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setYedekDurumu({ iyi: true, mesaj: `YEDEK İNDİRİLDİ — kese-benav-yedek-${dosyaTarihi()}.json` })
    } catch (h) {
      setYedekDurumu({ iyi: false, mesaj: h?.message || 'Yedek alınamadı.' })
    } finally {
      setIslem(null)
    }
  }

  const iceAktar = async (dosya) => {
    if (!dosya) return
    setIslem('yedek')
    setYedekDurumu(null)
    bekleyeniIptalEt()
    try {
      const metin = await dosya.text()
      let paket
      try {
        paket = JSON.parse(metin)
      } catch {
        throw new Error('Dosya geçerli bir JSON değil.')
      }
      await depo.iceAktar(paket)
      setTazele((n) => n + 1)
      setYedekDurumu({ iyi: true, mesaj: `${dosya.name} GERİ YÜKLENDİ.` })
    } catch (h) {
      setYedekDurumu({ iyi: false, mesaj: h?.message || 'Yedek geri yüklenemedi.' })
    } finally {
      setIslem(null)
      if (dosyaRef.current) dosyaRef.current.value = ''
    }
  }

  const tohumaDon = async () => {
    setIslem('yedek')
    bekleyeniIptalEt()
    try {
      await depo.sifirla()
      setTazele((n) => n + 1)
      setYedekDurumu({ iyi: true, mesaj: 'TOHUM VERİSİNE DÖNÜLDÜ.' })
    } catch (h) {
      setYedekDurumu({ iyi: false, mesaj: h?.message || 'Sıfırlama başarısız.' })
    } finally {
      setIslem(null)
      setKip(null)
      setTohumOnayi(false)
    }
  }

  // Sekme çubuğunda ok tuşlarıyla gezinme (WAI-ARIA tablist deseni).
  const sekmeTusu = (e) => {
    const i = SEKMELER.findIndex((s) => s.deger === sekme)
    let hedef = null
    if (e.key === 'ArrowRight') hedef = SEKMELER[(i + 1) % SEKMELER.length].deger
    else if (e.key === 'ArrowLeft') hedef = SEKMELER[(i - 1 + SEKMELER.length) % SEKMELER.length].deger
    else if (e.key === 'Home') hedef = SEKMELER[0].deger
    else if (e.key === 'End') hedef = SEKMELER[SEKMELER.length - 1].deger
    if (!hedef) return
    e.preventDefault()
    setSekme(hedef)
    document.getElementById(`sekme-${hedef}`)?.focus()
  }

  const gorselleriSaklayabiliyor = depo.gorselKalici?.() !== false

  const kayitMetni =
    kayitHatasi
      ? `KAYDEDİLEMEDİ — ${kayitHatasi.message || 'BİLİNMEYEN HATA'}`
      : kayit === 'bekliyor'
        ? 'TASLAĞA YAZILIYOR…'
        : kayit === 'kaydedildi'
          ? 'TASLAK KAYDEDİLDİ'
          : 'TASLAK AYARLAR'

  return (
    <div>
      <EkranBasligi kod="A6" baslik="SİTE AYARLARI — RENK & TİPOGRAFİ" yol="/admin/ayarlar" />

      <Panel>
        <PanelCubugu>
          <span className="text-mini tracking-genis">AYARLAR</span>
          <div role="tablist" aria-label="Ayar bölümleri" onKeyDown={sekmeTusu} className="ml-8 flex gap-[22px]">
            {SEKMELER.map((s) => (
              <button
                key={s.deger}
                type="button"
                role="tab"
                id={`sekme-${s.deger}`}
                aria-selected={sekme === s.deger}
                aria-controls={`panel-${s.deger}`}
                tabIndex={sekme === s.deger ? 0 : -1}
                onClick={() => setSekme(s.deger)}
                className={cn(
                  'border-b pb-1 text-micro tracking-[0.18em] transition-colors',
                  sekme === s.deger ? 'border-tas text-ink' : 'border-transparent text-ink/40 hover:text-ink/70',
                )}
              >
                {s.etiket}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2.5">
            {farkVar && <Rozet tur="degisti">YAYINLANMAMIŞ DEĞİŞİKLİK</Rozet>}
            <Dugme onClick={() => window.open('/', '_blank', 'noopener')}>ÖNİZLE</Dugme>
            <Dugme tur="birincil" onClick={yayinla} disabled={islem === 'yayin' || !ayarlar}>
              {islem === 'yayin' ? 'YAYINLANIYOR…' : 'YAYINLA'}
            </Dugme>
          </div>
        </PanelCubugu>

        <div className="flex items-center justify-between gap-4 border-b border-ink/10 px-6 py-2.5 text-micro tracking-[0.16em]">
          <span className={kayitHatasi ? 'text-tas' : 'text-ink/30'} role={kayitHatasi ? 'alert' : undefined}>
            {kayitMetni}
          </span>
          <span className="text-ink/25">ÖNİZLE — SİTE YAYINLANMIŞ SÜRÜMÜ GÖSTERİR</span>
        </div>

        {yukleniyor && (
          <div className="grid gap-3 p-7">
            <Iskelet yukseklik={32} adet={8} />
          </div>
        )}

        {!yukleniyor && hata && (
          <div className="p-7">
            <HataKutusu hata={hata} yenidenDene={() => setTazele((n) => n + 1)} />
          </div>
        )}

        {!yukleniyor && !hata && ayarlar && (
          <>
            {/* ======================= GÖRÜNÜM ======================= */}
            {sekme === 'gorunum' && (
              <div
                role="tabpanel"
                id="panel-gorunum"
                aria-labelledby="sekme-gorunum"
                className="grid min-h-[600px] grid-cols-1 xl:grid-cols-[1fr_1fr_380px]"
              >
                <section className="grid content-start gap-5 border-b border-ink/10 p-7 xl:border-b-0 xl:border-r">
                  <BolumBasligi>RENK JETONLARI</BolumBasligi>
                  {Object.keys(JETON_ETIKETLERI).map((k) => (
                    <JetonSatiri key={k} anahtar={k} jetonlar={ayarlar.jetonlar} onChange={jetonDegistir} />
                  ))}
                  <p className="pt-1.5 text-micro leading-[1.9] tracking-[0.14em] text-ink/30">
                    JETONLAR SİTE GENELİNDE UYGULANIR.
                    <br />
                    KONTRAST 4.5:1 ALTINA DÜŞERSE UYARI ÇIKAR.
                  </p>
                </section>

                <section className="grid content-start gap-[22px] border-b border-ink/10 p-7 xl:border-b-0 xl:border-r">
                  <BolumBasligi>TİPOGRAFİ</BolumBasligi>

                  <Alan etiket="BAŞLIK YAZI TİPİ">
                    <Secim
                      value={ayarlar.tipografi.baslikFont}
                      aria-label="Başlık yazı tipi"
                      onChange={(e) => guncelle('tipografi', { baslikFont: e.target.value })}
                      secenekler={YAZI_TIPI_SECENEKLERI.baslik}
                    />
                  </Alan>

                  <Alan etiket="DETAY / MONO YAZI TİPİ">
                    <Secim
                      value={ayarlar.tipografi.monoFont}
                      aria-label="Detay / mono yazı tipi"
                      onChange={(e) => guncelle('tipografi', { monoFont: e.target.value })}
                      secenekler={YAZI_TIPI_SECENEKLERI.mono}
                    />
                  </Alan>

                  <Kaydirici
                    etiket="BAŞLIK ÖLÇEĞİ"
                    deger={ayarlar.tipografi.baslikOlcegi}
                    min={8}
                    max={28}
                    adim={0.5}
                    bicim={(v) => `${Number(v).toFixed(1)} VW`}
                    onChange={(v) => guncelle('tipografi', { baslikOlcegi: v })}
                  />

                  <Kaydirici
                    etiket="HARF ARALIĞI — DETAY"
                    deger={ayarlar.tipografi.harfAraligi}
                    min={0.05}
                    max={0.4}
                    adim={0.01}
                    bicim={(v) => `${Number(v).toFixed(2)} EM`}
                    onChange={(v) => guncelle('tipografi', { harfAraligi: v })}
                  />

                  <div className="grid gap-[18px] border-t border-ink/15 pt-[22px]">
                    <BolumBasligi>DOKU &amp; HAREKET</BolumBasligi>

                    <Kaydirici
                      etiket="GREN YOĞUNLUĞU"
                      deger={ayarlar.doku.gren}
                      min={0}
                      max={0.25}
                      adim={0.005}
                      bicim={(v) => Number(v).toFixed(3)}
                      onChange={(v) => guncelle('doku', { gren: v })}
                    />

                    <AnahtarSatiri
                      etiket="KILAVUZ ÇİZGİLERİ"
                      acik={ayarlar.doku.kilavuz}
                      onChange={(v) => guncelle('doku', { kilavuz: v })}
                    />
                    <AnahtarSatiri
                      etiket="ÖZEL İMLEÇ"
                      acik={ayarlar.doku.ozelImlec}
                      onChange={(v) => guncelle('doku', { ozelImlec: v })}
                    />
                    <AnahtarSatiri
                      etiket="AZALTILMIŞ HAREKET (SİSTEM)"
                      acik={azaltilmisHareket}
                      onChange={() => {}}
                      pasif
                      ipucu="SİSTEM TERCİHİ — BURADAN DEĞİŞTİRİLEMEZ"
                    />
                  </div>
                </section>

                <section className="grid content-start gap-4 px-[26px] py-7">
                  <BolumBasligi>CANLI ÖNİZLEME</BolumBasligi>

                  {/* Jetonlar bu düğüme yazılır; içerideki bg-beton / text-ink onları okur. */}
                  <div
                    ref={onizlemeRef}
                    aria-label="Site görünümü önizlemesi"
                    role="img"
                    style={{
                      fontFamily: yaziAilesi(ayarlar.tipografi.monoFont),
                      fontWeight: yaziKalinligi(ayarlar.tipografi.monoFont),
                      backgroundImage:
                        'linear-gradient(to top right, transparent calc(50% - .5px), rgba(234,234,234,.07) 50%, transparent calc(50% + .5px)), linear-gradient(to bottom right, transparent calc(50% - .5px), rgba(234,234,234,.07) 50%, transparent calc(50% + .5px))',
                    }}
                    className="relative aspect-[16/10] border border-ink/20 bg-beton"
                  >
                    <span className="absolute left-3 top-2.5 text-[8px] tracking-genis text-ink/50">
                      {ayarlar.kimlik.ad}
                    </span>
                    <span className="absolute right-3 top-2.5 flex items-center gap-1.5 text-[8px] tracking-genis text-ink/35">
                      {/* Sitedeki yanıp sönen taş kare — vurgu jetonu önizlemede de canlı */}
                      <span aria-hidden="true" className="h-[5px] w-[5px] bg-tas motion-safe:animate-kb-blink" />
                      ESERLER
                    </span>
                    <span className="absolute bottom-2.5 left-3 text-[8px] tracking-genis text-ink/35">BİYOGRAFİ</span>
                    <span className="absolute bottom-2.5 right-3 text-[8px] tracking-genis text-ink/35">İLETİŞİM</span>
                    <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5">
                      <span className="relative block h-[30px] w-[22px] border border-ink/20 bg-cikolata">
                        <span className="absolute inset-x-0 bottom-0 h-[2px] bg-tas" />
                      </span>
                      <span className="relative block h-10 w-[30px] border border-ink/45 bg-cikolata">
                        <span className="absolute inset-x-0 bottom-0 h-[2px] bg-metal" />
                      </span>
                      <span className="relative block h-[30px] w-[22px] border border-ink/20 bg-cikolata">
                        <span className="absolute inset-x-0 bottom-0 h-[2px] bg-tas" />
                      </span>
                    </span>
                  </div>

                  <p className="text-micro leading-[2] tracking-[0.16em] text-ink/35">
                    DEĞİŞİKLİKLER ÖNİZLEMEDE ANINDA GÖRÜNÜR.
                    <br />
                    YAYINLA DENMEDEN CANLI SİTEYE GİTMEZ.
                  </p>

                  <div className="grid gap-2.5 border-t border-ink/15 pt-[18px] text-micro tracking-[0.16em] text-ink/40">
                    {yayinlarDurumu.yukleniyor ? (
                      <Iskelet yukseklik={14} adet={2} />
                    ) : yayinlarDurumu.hata ? (
                      <HataKutusu hata={yayinlarDurumu.hata} />
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <span>SON YAYIN</span>
                          <span className="text-ink">{zamanMetni(sonYayin?.zaman)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SÜRÜM</span>
                          <span className="text-ink">{sonYayin ? `v${sonYayin.surum}` : '—'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>TOPLAM SÜRÜM</span>
                          <span className="text-ink">{yayinlar.length}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSurumlerAcik((a) => !a)}
                          aria-expanded={surumlerAcik}
                          aria-controls="surum-listesi"
                          className="pt-1.5 text-left text-micro tracking-[0.16em] text-ink/45 transition-colors hover:text-ink"
                        >
                          ÖNCEKİ SÜRÜME DÖN {surumlerAcik ? '▴' : '▾'}
                        </button>

                        {surumlerAcik && (
                          <ul id="surum-listesi" className="grid max-h-[220px] gap-px overflow-y-auto border border-ink/15">
                            {yayinlar.map((y, i) => (
                              <li
                                key={y.id}
                                className="flex items-center justify-between gap-3 border-b border-ink/10 px-3 py-2.5 last:border-b-0"
                              >
                                <span className="text-ink">v{y.surum}</span>
                                <span className="text-ink/40">{zamanMetni(y.zaman)}</span>
                                {i === 0 ? (
                                  <span className="text-ink/30">GÜNCEL</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setKip({
                                        tur: 'surum',
                                        baslik: `v${y.surum} SÜRÜMÜNE DÖN`,
                                        mesaj: `${zamanMetni(y.zaman)} tarihli v${y.surum} sürümündeki ayarlar ve çember sırası geri getirilecek. Bu işlem yeni bir sürüm olarak yayınlanır; mevcut taslak ayarların üzerine yazılır.`,
                                        onayMetni: 'BU SÜRÜME DÖN',
                                        eylem: () => surumeDon(y),
                                      })
                                    }
                                    className="text-tas transition-colors hover:underline"
                                  >
                                    DÖN
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                </section>
              </div>
            )}

            {/* ======================= ÇEMBER ======================= */}
            {sekme === 'cember' && (
              <div
                role="tabpanel"
                id="panel-cember"
                aria-labelledby="sekme-cember"
                className="grid min-h-[600px] grid-cols-1 xl:grid-cols-[1fr_380px]"
              >
                <section className="grid content-start gap-[22px] border-b border-ink/10 p-7 xl:max-w-[520px] xl:border-b-0 xl:border-r">
                  <BolumBasligi>ÇEMBER DAVRANIŞI</BolumBasligi>

                  <AnahtarSatiri
                    etiket="OTOMATİK DÖNÜŞ"
                    acik={ayarlar.cember.otomatikDonus}
                    onChange={(v) => guncelle('cember', { otomatikDonus: v })}
                    ipucu="AZALTILMIŞ HAREKET AÇIKKEN SİTE DÖNÜŞÜ ZATEN DURDURUR"
                  />

                  <Kaydirici
                    etiket="DÖNÜŞ HIZI"
                    deger={ayarlar.cember.donusHizi}
                    min={0.005}
                    max={0.2}
                    adim={0.005}
                    bicim={(v) => `${Number(v).toFixed(3)} °/KARE`}
                    onChange={(v) => guncelle('cember', { donusHizi: v })}
                  />

                  <Kaydirici
                    etiket="ÇEMBER YARIÇAPI"
                    deger={ayarlar.cember.yaricap}
                    min={400}
                    max={1200}
                    adim={10}
                    bicim={(v) => `${v} PX`}
                    onChange={(v) => guncelle('cember', { yaricap: v })}
                  />

                  <Alan
                    etiket="AÇILIŞ POZİSYONU"
                    ipucu={`TASARIM VARSAYILANI ${CEMBER.yaricap} PX YARIÇAP · ${CEMBER.otomatikHiz} °/KARE`}
                  >
                    {eserlerDurumu.yukleniyor ? (
                      <Iskelet yukseklik={38} />
                    ) : eserlerDurumu.hata ? (
                      <HataKutusu hata={eserlerDurumu.hata} />
                    ) : (
                      <Secim
                        value={ayarlar.cember.acilisEserId || ''}
                        aria-label="Açılışta önde olan eser"
                        onChange={(e) => guncelle('cember', { acilisEserId: e.target.value || null })}
                        secenekler={[
                          { deger: '', etiket: '— SEÇİLMEDİ —' },
                          // Kayıtlı eser artık çemberde değilse seçim sessizce kaymasın.
                          ...(ayarlar.cember.acilisEserId && !acilisListede
                            ? [{ deger: ayarlar.cember.acilisEserId, etiket: 'SEÇİLİ ESER ARTIK ÇEMBERDE DEĞİL' }]
                            : []),
                          ...cemberdekiler.map((e, i) => ({
                            deger: e.id,
                            etiket: `${iki(i + 1)} ${e.baslik}`,
                          })),
                        ]}
                      />
                    )}
                  </Alan>

                  <p className="border-t border-ink/15 pt-[22px] text-micro leading-[1.9] tracking-[0.14em] text-ink/30">
                    BU AYARLAR A4 EKRANIYLA ORTAKTIR — ÇEMBER SIRALAMASI EKRANINDA
                    <br />
                    YAPILAN DEĞİŞİKLİK BURADA, BURADAKİ DEĞİŞİKLİK ORADA GÖRÜNÜR.
                  </p>
                </section>

                <section className="grid content-start gap-2.5 px-[26px] py-7 text-micro tracking-[0.16em] text-ink/40">
                  <BolumBasligi className="pb-1.5">ÇEMBERİN ŞU ANKİ DURUMU</BolumBasligi>
                  <div className="flex justify-between">
                    <span>ÇEMBERDEKİ ESER</span>
                    <span className="text-ink">{cemberdekiler.length} KAYIT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>POZİSYON ARALIĞI</span>
                    <span className="text-ink">
                      {cemberdekiler.length ? `${Number(pozisyonAcisi(cemberdekiler.length).toFixed(1))}°` : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>AÇILIŞTA ÖNDE</span>
                    <span className={acilisListede || !ayarlar.cember.acilisEserId ? 'text-ink' : 'text-tas'}>
                      {cemberdekiler.find((e) => e.id === ayarlar.cember.acilisEserId)?.baslik ||
                        (ayarlar.cember.acilisEserId ? 'ÇEMBERDE DEĞİL' : '—')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>KART ÖLÇÜSÜ</span>
                    <span className="text-ink">
                      {CEMBER.kartGenislik}×{CEMBER.kartYukseklik} PX
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>EĞİM / PERSPEKTİF</span>
                    <span className="text-ink">
                      {CEMBER.egim}° / {CEMBER.perspektif} PX
                    </span>
                  </div>
                </section>
              </div>
            )}

            {/* ======================= SEO ======================= */}
            {sekme === 'seo' && (
              <div
                role="tabpanel"
                id="panel-seo"
                aria-labelledby="sekme-seo"
                className="grid min-h-[600px] grid-cols-1 xl:grid-cols-2"
              >
                <section className="grid content-start gap-[22px] border-b border-ink/10 p-7 xl:border-b-0 xl:border-r">
                  <BolumBasligi>ARAMA MOTORU</BolumBasligi>

                  <Alan etiket="SAYFA BAŞLIĞI" ipucu={`${(ayarlar.seo.baslik || '').length} KARAKTER — 60'A KADAR ÖNERİLİR`}>
                    <Girdi
                      value={ayarlar.seo.baslik}
                      aria-label="Sayfa başlığı"
                      onChange={(e) => guncelle('seo', { baslik: e.target.value })}
                    />
                  </Alan>

                  <Alan etiket="AÇIKLAMA">
                    <MetinAlani
                      value={ayarlar.seo.aciklama}
                      aria-label="Sayfa açıklaması"
                      rows={4}
                      sinir={160}
                      onChange={(e) => guncelle('seo', { aciklama: e.target.value })}
                    />
                  </Alan>

                  <AnahtarSatiri
                    etiket="ARAMA MOTORLARINA AÇIK"
                    acik={ayarlar.seo.indexlensin}
                    onChange={(v) => guncelle('seo', { indexlensin: v })}
                  />
                  <p className={cn('text-micro leading-[1.9] tracking-[0.14em]', ayarlar.seo.indexlensin ? 'text-ink/30' : 'text-tas')}>
                    {ayarlar.seo.indexlensin
                      ? 'SİTE DİZİNLENİR — KOLOFONDAKİ "NO INDEX" İBARESİ GÖRÜNMEZ.'
                      : 'KAPALI: SAYFAYA noindex ETİKETİ EKLENİR VE KOLOFONDAKİ "NO INDEX" İBARESİ GERÇEĞİ SÖYLER.'}
                  </p>

                  {robotsEngelliyor && (
                    <p className="border border-tas/45 bg-tas/[0.07] p-3 text-micro leading-[1.9] tracking-[0.14em] text-tas">
                      DİKKAT — robots.txt SİTENİN TAMAMINI TARAMAYA KAPATIYOR.
                      BU ANAHTAR AÇIK OLSA BİLE ARAMA MOTORLARI SİTEYE GİREMEZ.
                      YAYINA ÇIKARKEN public/robots.txt SİLİNMELİ.
                    </p>
                  )}
                </section>

                <section className="grid content-start gap-[22px] p-7">
                  <BolumBasligi>KİMLİK</BolumBasligi>

                  <div className="grid grid-cols-2 gap-4">
                    <Alan etiket="AD">
                      <Girdi
                        value={ayarlar.kimlik.ad}
                        aria-label="Sanatçı adı"
                        onChange={(e) => guncelle('kimlik', { ad: e.target.value })}
                      />
                    </Alan>
                    <Alan etiket="ALT BAŞLIK">
                      <Girdi
                        value={ayarlar.kimlik.altBaslik}
                        aria-label="Alt başlık"
                        onChange={(e) => guncelle('kimlik', { altBaslik: e.target.value })}
                      />
                    </Alan>
                    <Alan etiket="DOĞUM YERİ / YILI">
                      <Girdi
                        value={ayarlar.kimlik.dogumYeri}
                        aria-label="Doğum yeri ve yılı"
                        onChange={(e) => guncelle('kimlik', { dogumYeri: e.target.value })}
                      />
                    </Alan>
                    <Alan etiket="KOORDİNAT">
                      <Girdi
                        value={ayarlar.kimlik.koordinat}
                        aria-label="Atölye koordinatı"
                        onChange={(e) => guncelle('kimlik', { koordinat: e.target.value })}
                      />
                    </Alan>
                    <Alan
                      etiket="BİYOGRAFİ"
                      ipucu="SİTEDEKİ BİYOGRAFİ BÖLÜMÜNDE GÖRÜNÜR — PARAGRAFLAR BOŞ SATIRLA AYRILIR"
                    >
                      <MetinAlani
                        value={ayarlar.kimlik.biyografi ?? ''}
                        aria-label="Sanatçı biyografisi"
                        className="h-[170px]"
                        sinir={1200}
                        onChange={(e) => guncelle('kimlik', { biyografi: e.target.value })}
                      />
                    </Alan>
                    <Alan etiket="E-POSTA">
                      <Girdi
                        type="email"
                        value={ayarlar.kimlik.eposta}
                        aria-label="E-posta"
                        onChange={(e) => guncelle('kimlik', { eposta: e.target.value })}
                      />
                    </Alan>
                    <Alan etiket="TELEFON">
                      <Girdi
                        type="tel"
                        value={ayarlar.kimlik.telefon}
                        aria-label="Telefon"
                        onChange={(e) => guncelle('kimlik', { telefon: e.target.value })}
                      />
                    </Alan>
                  </div>

                  <Alan etiket="ADRES" ipucu="HER SATIR AYRI BİR SATIR OLARAK BASILIR">
                    <MetinAlani
                      value={(ayarlar.kimlik.adres || []).join('\n')}
                      aria-label="Adres satırları"
                      rows={3}
                      onChange={(e) => guncelle('kimlik', { adres: e.target.value.split('\n') })}
                      onBlur={(e) =>
                        guncelle('kimlik', { adres: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })
                      }
                    />
                  </Alan>

                  <Alan etiket="TEMSİL" ipucu="HER SATIR BİR GALERİ">
                    <MetinAlani
                      value={(ayarlar.kimlik.temsil || []).join('\n')}
                      aria-label="Temsil eden galeriler"
                      rows={3}
                      onChange={(e) => guncelle('kimlik', { temsil: e.target.value.split('\n') })}
                      onBlur={(e) =>
                        guncelle('kimlik', { temsil: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })
                      }
                    />
                  </Alan>
                </section>
              </div>
            )}

            {/* ======================= YEDEK ======================= */}
            {sekme === 'yedek' && (
              <div role="tabpanel" id="panel-yedek" aria-labelledby="sekme-yedek" className="min-h-[600px] p-7">
                <div className="grid max-w-[900px] gap-5">
                  <BolumBasligi>YEDEK &amp; GERİ YÜKLEME</BolumBasligi>

                  {!gorselleriSaklayabiliyor && (
                    <p role="alert" className="border border-tas/45 bg-tas/[0.07] p-4 text-micro leading-[1.9] tracking-[0.14em] text-tas">
                      BU TARAYICIDA GÖRSELLER KALICI SAKLANAMIYOR — SAYFA YENİLENİNCE KAYBOLUR.
                    </p>
                  )}

                  {yedekDurumu && (
                    <p
                      role="status"
                      className={cn(
                        'border p-4 text-micro leading-[1.9] tracking-[0.14em]',
                        yedekDurumu.iyi ? 'border-ink/20 text-ink/60' : 'border-tas/45 bg-tas/[0.07] text-tas',
                      )}
                    >
                      {yedekDurumu.mesaj}
                    </p>
                  )}

                  <div className="grid gap-4 xl:grid-cols-3">
                    <div className="grid content-start gap-3.5 border border-ink/15 p-5">
                      <h4 className="text-mini tracking-genis">JSON OLARAK DIŞA AKTAR</h4>
                      <p className="text-micro leading-[1.9] tracking-[0.14em] text-ink/35">
                        ESERLER, SERGİLER, SÜREÇ KARELERİ, AYARLAR VE SÜRÜM GEÇMİŞİ TEK DOSYADA. GÖRSELLERİN İKİLİ
                        VERİSİ DOSYAYA GİRMEZ.
                      </p>
                      <Dugme onClick={disaAktar} disabled={islem === 'yedek'} className="justify-self-start">
                        YEDEĞİ İNDİR
                      </Dugme>
                    </div>

                    <div className="grid content-start gap-3.5 border border-ink/15 p-5">
                      <h4 className="text-mini tracking-genis">YEDEKTEN GERİ YÜKLE</h4>
                      <p className="text-micro leading-[1.9] tracking-[0.14em] text-ink/35">
                        SEÇİLEN DOSYA MEVCUT TÜM KAYITLARIN YERİNE GEÇER. ŞEMA UYUŞMAZSA İŞLEM YAPILMAZ.
                      </p>
                      <input
                        ref={dosyaRef}
                        type="file"
                        accept="application/json,.json"
                        aria-label="Yedek dosyası seç"
                        onChange={(e) => iceAktar(e.target.files?.[0])}
                        className="hidden"
                      />
                      <Dugme
                        onClick={() => dosyaRef.current?.click()}
                        disabled={islem === 'yedek'}
                        className="justify-self-start"
                      >
                        DOSYA SEÇ
                      </Dugme>
                    </div>

                    <div className="grid content-start gap-3.5 border border-tas/25 p-5">
                      <h4 className="text-mini tracking-genis text-tas">TOHUM VERİSİNE DÖN</h4>
                      <p className="text-micro leading-[1.9] tracking-[0.14em] text-ink/35">
                        TÜM KAYITLAR SİLİNİR VE PROJENİN İLK TOHUM VERİSİ YÜKLENİR. GERİ ALINAMAZ — ÖNCE YEDEK ALIN.
                      </p>
                      <Dugme
                        tur="tehlike"
                        disabled={islem === 'yedek'}
                        onClick={() => {
                          setTohumOnayi(false)
                          setKip({
                            tur: 'tohum',
                            baslik: 'TOHUM VERİSİNE DÖN',
                            mesaj:
                              'Eserler, sergiler, süreç kareleri, ayarlar, sürüm geçmişi ve yüklenmiş görseller silinecek. Bu işlem geri alınamaz.',
                            onayMetni: 'DEVAM ET',
                          })
                        }}
                        className="justify-self-start"
                      >
                        SIFIRLA
                      </Dugme>
                    </div>
                  </div>

                  <div className="grid gap-2.5 border-t border-ink/15 pt-5 text-micro tracking-[0.16em] text-ink/40">
                    <div className="flex justify-between">
                      <span>GÖRSEL SAKLAMA</span>
                      <span className="text-ink">{gorselleriSaklayabiliyor ? 'KALICI (IndexedDB)' : 'GEÇİCİ (BELLEK)'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SÜRÜM GEÇMİŞİ</span>
                      <span className="text-ink">{yayinlar.length} YAYIN</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SON YAYIN</span>
                      <span className="text-ink">{zamanMetni(sonYayin?.zaman)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </Panel>

      <EkranNotlari
        notlar={[
          'Yazı tipi listesi yalnızca projeye yüklenmiş dosyalarla sınırlıdır — dışarıdan font eklenmez.',
          '“Azaltılmış hareket” sistem tercihine bağlıdır; kapatılamaz, yalnızca gösterilir.',
        ]}
      />

      {kip && kip.tur === 'surum' && (
        <OnayKipi
          baslik={kip.baslik}
          mesaj={kip.mesaj}
          onayMetni={kip.onayMetni}
          calisiyor={islem === 'donus'}
          onOnay={kip.eylem}
          onIptal={() => setKip(null)}
        />
      )}

      {/* Sıfırlama çift onaylıdır: önce uyarı okunur, sonra ikinci kipte kutu işaretlenir. */}
      {kip && kip.tur === 'tohum' && (
        <OnayKipi
          baslik={kip.baslik}
          mesaj={kip.mesaj}
          onayMetni={kip.onayMetni}
          tehlike
          onOnay={() => setKip({ ...kip, tur: 'tohum2', baslik: 'SON ONAY', onayMetni: 'KALICI OLARAK SİL' })}
          onIptal={() => setKip(null)}
        />
      )}

      {kip && kip.tur === 'tohum2' && (
        <OnayKipi
          baslik={kip.baslik}
          mesaj="Bu işlemin geri dönüşü yoktur. Yedek almadıysanız şimdi vazgeçin."
          onayMetni={kip.onayMetni}
          tehlike
          calisiyor={islem === 'yedek'}
          onayPasif={!tohumOnayi}
          onOnay={tohumaDon}
          onIptal={() => {
            setKip(null)
            setTohumOnayi(false)
          }}
        >
          <div className="flex items-center gap-3 pt-5 text-micro tracking-[0.16em] text-ink/60">
            <OnayKutusu secili={tohumOnayi} onChange={setTohumOnayi} etiket="Geri alınamayacağını anladım" />
            <span>GERİ ALINAMAYACAĞINI ANLADIM</span>
          </div>
        </OnayKipi>
      )}
    </div>
  )
}
