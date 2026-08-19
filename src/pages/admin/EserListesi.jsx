/**
 * A1 — Eser listesi.
 *
 * Tel kafesteki tüm sayılar (kayıt adedi, yayında adedi, gösterim aralığı,
 * "POZ. nn") veriden türetilir; ekranda sabit yazılmış tek bir rakam yoktur.
 * Sıralama depo sırasını korur — "POZ. nn" A4'teki çember sırasına bağlıdır ve
 * buradan düzenlenemez (tel kafes notu 2).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDepo, useDepoVerisi } from '../../services/DepoContext.jsx'
import { ESER_DURUMLARI, anaGorsel, olcuMetni, yayinEngelleri } from '../../data/schema.js'
import { MALZEME_ETIKETI } from '../../config/tokens.js'
import Iskelet from '../../components/common/Iskelet.jsx'
import HataKutusu from '../../components/common/HataKutusu.jsx'
import LazyImage from '../../components/common/LazyImage.jsx'
import { Dugme, EkranNotlari, OnayKutusu, Rozet, cn } from '../../components/admin/ui.jsx'

/* Tel kafes bir sayfada yedi satır gösterir: "1—7 / 15 GÖSTERİLİYOR". */
const SAYFA_BOYU = 7

/* Sütun genişlikleri tel kafesten birebir alınmıştır. */
const IZGARA = 'grid grid-cols-[26px_54px_40px_1fr_150px_60px_130px_78px_84px_30px] items-center gap-3.5'

const FILTRELER = [
  { deger: 'tumu', etiket: 'TÜMÜ' },
  { deger: 'metal', etiket: 'METAL' },
  { deger: 'tas', etiket: 'TAŞ' },
  { deger: 'taslak', etiket: 'TASLAK' },
]

const NOTLAR = [
  'Satır seçimi toplu eylem çubuğunu açar: yayınla, taslağa al, çemberden çıkar, sil.',
  '“POZ. nn” değeri A4’teki çember sırasına bağlıdır; buradan doğrudan düzenlenemez.',
  'Görseli olmayan eser yayınlanamaz — kaydetmede uyarı verilir.',
]

/** Türkçe büyük/küçük harf duyarsız karşılaştırma (I/ı, İ/i ayrımı için locale şart). */
const kucult = (metin) => String(metin ?? '').toLocaleLowerCase('tr')

const ikiHane = (sayi) => String(sayi).padStart(2, '0')

/** CSV alanı — ayraç, tırnak veya satır sonu içeriyorsa tırnaklanır. */
const csvAlan = (deger) => {
  const metin = String(deger ?? '')
  return /[";\r\n]/.test(metin) ? `"${metin.replace(/"/g, '""')}"` : metin
}

export default function EserListesi() {
  const depo = useDepo()
  const navigate = useNavigate()

  /* Okuma hata verirse kullanıcı elle tazeleyebilsin diye sayaç bağımlılığı. */
  const [tazeleme, setTazeleme] = useState(0)
  const { veri, yukleniyor, hata } = useDepoVerisi((d) => d.eserleriGetir(), [tazeleme])
  const eserler = useMemo(() => veri || [], [veri])

  const [arama, setArama] = useState('')
  const [filtre, setFiltre] = useState('tumu')
  const [sayfa, setSayfa] = useState(1)
  const [secili, setSecili] = useState(() => new Set())
  const [acikMenu, setAcikMenu] = useState(null)
  const [silinecek, setSilinecek] = useState(null)
  const [bildirim, setBildirim] = useState(null)
  const [islemde, setIslemde] = useState(false)

  /* ---------- türetilmiş veri ---------- */

  const suzulmus = useMemo(() => {
    const sorgu = kucult(arama).trim()
    return eserler.filter((e) => {
      if (filtre === 'metal' && e.malzemeSinifi !== 'metal') return false
      if (filtre === 'tas' && e.malzemeSinifi !== 'tas') return false
      if (filtre === 'taslak' && e.durum !== 'taslak') return false
      if (!sorgu) return true
      return kucult(e.baslik).includes(sorgu) || kucult(e.malzeme).includes(sorgu)
    })
  }, [eserler, filtre, arama])

  const yayindaSayisi = useMemo(() => suzulmus.filter((e) => e.durum === 'yayinda').length, [suzulmus])

  const sonKaydetme = useMemo(() => {
    const enYeni = eserler.reduce((m, e) => Math.max(m, e.guncellendi || 0), 0)
    if (!enYeni) return null
    return new Date(enYeni).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  }, [eserler])

  const toplamSayfa = Math.max(1, Math.ceil(suzulmus.length / SAYFA_BOYU))
  /* Kayıt silinince son sayfa boşalabilir; durumu efektle düzeltmek yerine
     okurken kısıtlamak boş sayfanın bir kare görünmesini de engeller. */
  const aktifSayfa = Math.min(sayfa, toplamSayfa)
  const baslangic = (aktifSayfa - 1) * SAYFA_BOYU
  const sayfadakiler = suzulmus.slice(baslangic, baslangic + SAYFA_BOYU)

  /* Seçim kimlik üzerinden tutulur; silinen kayıtların kimlikleri sayılmaz. */
  const seciliEserler = useMemo(() => eserler.filter((e) => secili.has(e.id)), [eserler, secili])
  const seciliIdler = useMemo(() => seciliEserler.map((e) => e.id), [seciliEserler])

  const sayfaHepsiSecili = sayfadakiler.length > 0 && sayfadakiler.every((e) => secili.has(e.id))

  const sayfaNumaralari = useMemo(() => {
    const hepsi = Array.from({ length: toplamSayfa }, (_, i) => i + 1)
    if (toplamSayfa <= SAYFA_BOYU) return hepsi
    const bas = Math.min(Math.max(1, aktifSayfa - 3), toplamSayfa - (SAYFA_BOYU - 1))
    return hepsi.slice(bas - 1, bas - 1 + SAYFA_BOYU)
  }, [toplamSayfa, aktifSayfa])

  /* ---------- seçim ---------- */

  const tekSec = useCallback((id, isaretli) => {
    setSecili((onceki) => {
      const yeni = new Set(onceki)
      if (isaretli) yeni.add(id)
      else yeni.delete(id)
      return yeni
    })
  }, [])

  /* Kararlı kimlik: her render'da yeniden doğsaydı menü efekti sürekli kurulur,
     odak kullanıcının elinden alınırdı. */
  const menuDegistir = useCallback((id, ac) => setAcikMenu(ac ? id : null), [])

  const sayfayiSec = (isaretli) => {
    setSecili((onceki) => {
      const yeni = new Set(onceki)
      for (const e of sayfadakiler) {
        if (isaretli) yeni.add(e.id)
        else yeni.delete(e.id)
      }
      return yeni
    })
  }

  /* ---------- eylemler ---------- */

  const calistir = useCallback(async (isFn) => {
    setIslemde(true)
    try {
      await isFn()
    } catch (h) {
      setBildirim({ tur: 'hata', baslik: 'İŞLEM TAMAMLANAMADI', satirlar: [h?.message || String(h)] })
    } finally {
      setIslemde(false)
    }
  }, [])

  const yayinla = useCallback(
    (idler) =>
      calistir(async () => {
        setAcikMenu(null)
        const hedefler = eserler.filter((e) => idler.includes(e.id))
        const uygun = []
        /* Engelli eserler sebebe göre gruplanır ki kaç eserin NEDEN atlandığı görünsün. */
        const sebepler = new Map()

        for (const e of hedefler) {
          const engeller = yayinEngelleri(e)
          if (engeller.length) {
            for (const sebep of engeller) {
              if (!sebepler.has(sebep)) sebepler.set(sebep, [])
              sebepler.get(sebep).push(e.baslik || 'BAŞLIKSIZ')
            }
          } else {
            uygun.push(e.id)
          }
        }

        if (uygun.length) await depo.topluGuncelle(uygun, { durum: 'yayinda' })

        const engelliSayisi = hedefler.length - uygun.length
        if (!engelliSayisi) {
          setBildirim({ tur: 'bilgi', baslik: `${uygun.length} ESER YAYINLANDI.` })
          return
        }
        setBildirim({
          tur: 'hata',
          baslik: `${uygun.length} ESER YAYINLANDI · ${engelliSayisi} ESER YAYINLANAMADI`,
          satirlar: [...sebepler].map(
            ([sebep, basliklar]) => `${sebep.toLocaleUpperCase('tr')} (${basliklar.length}) — ${basliklar.join(', ')}`,
          ),
        })
      }),
    [calistir, depo, eserler],
  )

  const taslagaAl = useCallback(
    (idler) =>
      calistir(async () => {
        setAcikMenu(null)
        await depo.topluGuncelle(idler, { durum: 'taslak' })
        setBildirim({ tur: 'bilgi', baslik: `${idler.length} ESER TASLAĞA ALINDI.` })
      }),
    [calistir, depo],
  )

  const cemberdenCikar = useCallback(
    (idler) =>
      calistir(async () => {
        setAcikMenu(null)
        const uygun = eserler.filter((e) => idler.includes(e.id) && e.cemberde).map((e) => e.id)
        if (!uygun.length) {
          setBildirim({ tur: 'bilgi', baslik: 'SEÇİLİ ESERLERİN HİÇBİRİ ÇEMBERDE DEĞİL.' })
          return
        }
        await depo.topluGuncelle(uygun, { cemberde: false })
        setBildirim({
          tur: 'bilgi',
          baslik: `${uygun.length} ESER ÇEMBERDEN ÇIKARILDI · KALAN POZİSYONLAR YENİDEN NUMARALANDI.`,
        })
      }),
    [calistir, depo, eserler],
  )

  const silmeyiOnayla = () =>
    calistir(async () => {
      const idler = silinecek || []
      await depo.eserleriSil(idler)
      setSilinecek(null)
      setSecili((onceki) => {
        const yeni = new Set(onceki)
        for (const id of idler) yeni.delete(id)
        return yeni
      })
      setBildirim({ tur: 'bilgi', baslik: `${idler.length} ESER SİLİNDİ.` })
    })

  const silmeyiIste = (idler) => {
    setAcikMenu(null)
    setBildirim(null)
    setSilinecek(idler)
  }

  /* Silme onayı Esc ile kapanır. */
  useEffect(() => {
    if (!silinecek) return
    const tus = (o) => o.key === 'Escape' && setSilinecek(null)
    document.addEventListener('keydown', tus)
    return () => document.removeEventListener('keydown', tus)
  }, [silinecek])

  /* ---------- CSV ---------- */

  const csvIndir = () => {
    const basliklar = ['BAŞLIK', 'MALZEME SINIFI', 'MALZEME', 'YIL', 'ÖLÇÜ (CM)', 'DURUM', 'ÇEMBER POZİSYONU']
    const satirlar = suzulmus.map((e) => [
      e.baslik,
      MALZEME_ETIKETI[e.malzemeSinifi] || '',
      e.malzeme,
      e.yil,
      olcuMetni(e.olculer),
      ESER_DURUMLARI[e.durum] || e.durum,
      e.cemberde ? ikiHane(e.sira + 1) : '',
    ])

    /* Excel'in Türkçe kurulumu ayraç olarak ';' bekler; BOM da UTF-8'i doğru tanıtır. */
    const metin = [basliklar, ...satirlar].map((s) => s.map(csvAlan).join(';')).join('\r\n')
    const url = URL.createObjectURL(new Blob(['\uFEFF' + metin], { type: 'text/csv;charset=utf-8' }))
    const bag = document.createElement('a')
    bag.href = url
    bag.download = `kese-benav-eserler-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(bag)
    bag.click()
    bag.remove()
    /* Tarayıcı indirmeyi başlatana kadar URL yaşamalı — bir sonraki turda bırakılır. */
    setTimeout(() => URL.revokeObjectURL(url), 0)
    setBildirim({ tur: 'bilgi', baslik: `${suzulmus.length} KAYIT CSV OLARAK DIŞA AKTARILDI.` })
  }

  /* ---------- görünüm ---------- */

  const filtreEtiketi = FILTRELER.find((f) => f.deger === filtre)?.etiket || 'TÜMÜ'
  const gosterimMetni = suzulmus.length
    ? `${baslangic + 1}—${baslangic + sayfadakiler.length} / ${suzulmus.length} GÖSTERİLİYOR`
    : '0 KAYIT'

  return (
    <>
      <div className="flex flex-wrap items-center gap-5 border-b border-ink/[0.16] px-[26px] py-[18px]">
        <h2 className="text-mini tracking-genis text-ink/40">ESERLER / {filtreEtiketi}</h2>
        <p className="text-micro tracking-genis text-ink/[0.28]">
          {suzulmus.length} KAYIT · {yayindaSayisi} YAYINDA
        </p>
        <p className="ml-auto text-micro tracking-genis text-ink/30">SON KAYDETME {sonKaydetme || '—'}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 px-[26px] py-5">
        {/* Tel kafeste sabit 300px; dar ekranda sabit taban panel çerçevesini taşıyordu. */}
        <div className="flex h-[34px] w-full min-w-0 flex-initial items-center gap-2.5 border border-ink/20 bg-ink/[0.03] px-3 focus-within:border-ink/50 sm:w-auto sm:flex-[0_0_300px]">
          <span aria-hidden="true" className="text-mini text-ink/40">
            ⌕
          </span>
          <input
            type="search"
            value={arama}
            onChange={(o) => {
              setArama(o.target.value)
              setSayfa(1)
            }}
            placeholder="BAŞLIK / MALZEME ARA"
            aria-label="Başlık veya malzeme içinde ara"
            className="w-full bg-transparent text-mini tracking-[0.1em] text-ink outline-none placeholder:text-ink/40"
          />
          {arama && (
            <button
              type="button"
              onClick={() => {
                setArama('')
                setSayfa(1)
              }}
              aria-label="Aramayı temizle"
              className="text-mini text-ink/40 transition-colors hover:text-ink"
            >
              ×
            </button>
          )}
        </div>

        <div role="group" aria-label="Eserleri süz" className="flex flex-wrap gap-2">
          {FILTRELER.map((f) => {
            const etkin = filtre === f.deger
            return (
              <button
                key={f.deger}
                type="button"
                aria-pressed={etkin}
                onClick={() => {
                  setFiltre(f.deger)
                  setSayfa(1)
                }}
                className={cn(
                  'border px-3 py-2 text-micro tracking-[0.16em] transition-colors',
                  etkin ? 'border-ink/35 text-ink' : 'border-ink/[0.16] text-ink/[0.42] hover:border-ink/35 hover:text-ink',
                )}
              >
                {f.etiket}
              </button>
            )
          })}
        </div>

        <div className="ml-auto flex gap-2.5">
          <Dugme onClick={csvIndir} disabled={!suzulmus.length} title="Görüntülenen kayıtları CSV olarak indir">
            CSV DIŞA AKTAR
          </Dugme>
          <Dugme tur="birincil" onClick={() => navigate('/admin/eserler/yeni')}>
            + YENİ ESER
          </Dugme>
        </div>
      </div>

      <div className="px-[26px] pb-[26px]">
        {bildirim && <Bildirim bildirim={bildirim} onKapat={() => setBildirim(null)} />}

        {seciliIdler.length > 0 && !silinecek && (
          <div className="mb-4 flex flex-wrap items-center gap-3 border border-ink/25 bg-ink/[0.045] px-4 py-3">
            <span className="text-micro tracking-genis text-ink/60">{seciliIdler.length} SEÇİLİ</span>
            <div className="flex flex-wrap gap-2">
              <Dugme onClick={() => yayinla(seciliIdler)} disabled={islemde}>
                YAYINLA
              </Dugme>
              <Dugme onClick={() => taslagaAl(seciliIdler)} disabled={islemde}>
                TASLAĞA AL
              </Dugme>
              <Dugme onClick={() => cemberdenCikar(seciliIdler)} disabled={islemde}>
                ÇEMBERDEN ÇIKAR
              </Dugme>
              <Dugme tur="tehlike" onClick={() => silmeyiIste(seciliIdler)} disabled={islemde}>
                SİL
              </Dugme>
            </div>
            <button
              type="button"
              onClick={() => setSecili(new Set())}
              className="ml-auto text-micro tracking-genis text-ink/45 transition-colors hover:text-ink"
            >
              SEÇİMİ TEMİZLE
            </button>
          </div>
        )}

        {silinecek && (
          <SilmeOnayi
            eserler={eserler.filter((e) => silinecek.includes(e.id))}
            islemde={islemde}
            onOnayla={silmeyiOnayla}
            onVazgec={() => setSilinecek(null)}
          />
        )}

        {yukleniyor ? (
          <div aria-busy="true" aria-label="Eserler yükleniyor" className="space-y-2 pt-3">
            <Iskelet adet={SAYFA_BOYU} yukseklik={66} />
          </div>
        ) : hata ? (
          <HataKutusu hata={hata} yenidenDene={() => setTazeleme((n) => n + 1)} />
        ) : (
          <>
            <div className="overflow-x-auto">
              {/* Sabit sütunlar + boşluklar 778px tutuyor; alt sınır bunun az
                  üstünde kalırsa 1fr'lik BAŞLIK sütunu ezilir — dar ekranda
                  sütunu kısmak yerine tablo yatay kaysın. */}
              <div role="table" aria-label="Eser listesi" aria-rowcount={suzulmus.length} className="min-w-[980px]">
                <div
                  role="row"
                  className={cn(
                    IZGARA,
                    'border-b border-ink/[0.22] px-3 pb-3 text-micro tracking-[0.18em] text-ink/[0.38]',
                  )}
                >
                  <div role="columnheader">
                    <OnayKutusu
                      secili={sayfaHepsiSecili}
                      onChange={sayfayiSec}
                      etiket="Bu sayfadaki tüm kayıtları seç"
                    />
                  </div>
                  <div role="columnheader">GÖRSEL</div>
                  <div role="columnheader">NO</div>
                  <div role="columnheader">BAŞLIK</div>
                  <div role="columnheader">MALZEME</div>
                  <div role="columnheader">YIL</div>
                  <div role="columnheader">ÖLÇÜ (CM)</div>
                  <div role="columnheader">ÇEMBER</div>
                  <div role="columnheader">DURUM</div>
                  {/* Görsel olarak boş; adı sr-only metniyle verilseydi mutlak
                      konumlu düğüm kaydırma kabından taşıp sayfayı genişletirdi. */}
                  <div role="columnheader" aria-label="EYLEMLER" />
                </div>

                {sayfadakiler.map((eser, i) => (
                  <EserSatiri
                    key={eser.id}
                    eser={eser}
                    no={baslangic + i + 1}
                    secili={secili.has(eser.id)}
                    onSec={tekSec}
                    menuAcik={acikMenu === eser.id}
                    onMenu={menuDegistir}
                    islemde={islemde}
                    eylemler={{ yayinla, taslagaAl, cemberdenCikar, sil: silmeyiIste }}
                  />
                ))}
              </div>

              {!sayfadakiler.length && (
                <p className="border-b border-ink/[0.08] px-3 py-10 text-center text-mini tracking-genis text-ink/40">
                  {eserler.length ? 'BU SÜZGEÇLE EŞLEŞEN KAYIT YOK.' : 'HENÜZ ESER YOK — “+ YENİ ESER” İLE BAŞLA.'}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 px-3 pt-[22px] text-micro tracking-genis text-ink/40">
              <span>{gosterimMetni}</span>
              <nav aria-label="Sayfalama" className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSayfa(Math.max(1, aktifSayfa - 1))}
                  disabled={aktifSayfa === 1}
                  aria-label="Önceki sayfa"
                  className="border border-ink/[0.18] px-[11px] py-[7px] transition-colors hover:border-ink/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink/[0.18]"
                >
                  ◄
                </button>
                {sayfaNumaralari.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSayfa(n)}
                    aria-current={n === aktifSayfa ? 'page' : undefined}
                    aria-label={`Sayfa ${n}`}
                    className={cn(
                      'border px-[11px] py-[7px] transition-colors',
                      n === aktifSayfa ? 'border-ink/40 text-ink' : 'border-ink/[0.18] hover:border-ink/40 hover:text-ink',
                    )}
                  >
                    {n}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setSayfa(Math.min(toplamSayfa, aktifSayfa + 1))}
                  disabled={aktifSayfa === toplamSayfa}
                  aria-label="Sonraki sayfa"
                  className="border border-ink/[0.18] px-[11px] py-[7px] transition-colors hover:border-ink/40 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-ink/[0.18]"
                >
                  ►
                </button>
              </nav>
            </div>
          </>
        )}

        <EkranNotlari notlar={NOTLAR} />
      </div>
    </>
  )
}

/* ---------------- alt bileşenler ---------------- */

function Bildirim({ bildirim, onKapat }) {
  const uyari = bildirim.tur === 'hata'
  return (
    <div
      role={uyari ? 'alert' : 'status'}
      className={cn(
        'mb-4 flex items-start gap-4 border px-4 py-3',
        uyari ? 'border-tas/50 bg-tas/[0.07]' : 'border-ink/25 bg-ink/[0.03]',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className={cn('text-micro tracking-genis', uyari ? 'text-tas' : 'text-ink/60')}>{bildirim.baslik}</p>
        {bildirim.satirlar?.map((s, i) => (
          <p key={i} className="pt-1.5 text-micro leading-relaxed tracking-[0.12em] text-ink/50">
            {s}
          </p>
        ))}
      </div>
      <button
        type="button"
        onClick={onKapat}
        aria-label="Bildirimi kapat"
        className="text-mini text-ink/45 transition-colors hover:text-ink"
      >
        ×
      </button>
    </div>
  )
}

/**
 * Silme onayı — window.confirm yerine ekranın kendi şeridi.
 * Kalıcı (modal) değildir, bu yüzden odak tuzağı yerine yalnızca "VAZGEÇ"e
 * odaklanır; Esc de iptal eder.
 */
function SilmeOnayi({ eserler, islemde, onOnayla, onVazgec }) {
  const basliklar = eserler.map((e) => e.baslik || 'BAŞLIKSIZ')
  const gorunen = basliklar.slice(0, 6)
  const kalan = basliklar.length - gorunen.length

  return (
    <div role="alert" className="mb-4 border border-tas/50 bg-tas/[0.07] px-4 py-3.5">
      <p className="text-micro tracking-genis text-tas">
        {eserler.length} ESER SİLİNECEK — BU İŞLEM GERİ ALINAMAZ
      </p>
      <p className="pt-2 text-micro leading-relaxed tracking-[0.12em] text-ink/50">
        {gorunen.join(' · ')}
        {kalan > 0 && ` · +${kalan} DAHA`}
      </p>
      <p className="pt-1.5 text-micro tracking-[0.12em] text-ink/[0.35]">
        ESERE BAĞLI GÖRSELLER VE SERGİ BAĞLANTILARI DA SİLİNİR.
      </p>
      <div className="flex gap-2.5 pt-3.5">
        <Dugme tur="tehlike" onClick={onOnayla} disabled={islemde}>
          {islemde ? 'SİLİNİYOR…' : 'EVET, SİL'}
        </Dugme>
        <Dugme onClick={onVazgec} disabled={islemde} autoFocus>
          VAZGEÇ
        </Dugme>
      </div>
    </div>
  )
}

function EserSatiri({ eser, no, secili, onSec, menuAcik, onMenu, islemde, eylemler }) {
  const gorsel = anaGorsel(eser)
  const olcu = olcuMetni(eser.olculer)

  return (
    <div
      role="row"
      className={cn(
        IZGARA,
        'border-b border-ink/[0.08] px-3 py-[13px] text-mini tracking-[0.08em] transition-colors',
        secili ? 'bg-ink/[0.03]' : 'hover:bg-ink/[0.02]',
      )}
    >
      <div role="cell">
        <OnayKutusu
          secili={secili}
          onChange={(d) => onSec(eser.id, d)}
          etiket={`${eser.baslik || 'BAŞLIKSIZ'} kaydını seç`}
        />
      </div>

      <div role="cell">
        <LazyImage gorselId={gorsel?.id || null} alt="" className="h-10 w-full border border-ink/[0.18]" />
      </div>

      <div role="cell" className="text-ink/45">
        {ikiHane(no)}
      </div>

      <div role="cell" className="min-w-0">
        <Link
          to={`/admin/eserler/${eser.id}`}
          title={eser.baslik}
          className="block truncate border-b-0 text-ink transition-colors hover:text-tas"
        >
          {eser.baslik || 'BAŞLIKSIZ'}
        </Link>
      </div>

      <div role="cell" className="truncate text-ink/60" title={eser.malzeme}>
        {eser.malzeme}
      </div>

      <div role="cell" className="text-ink/60">
        {eser.yil}
      </div>

      <div role="cell" className="text-ink/50">
        {olcu || '—'}
      </div>

      {/* "POZ. nn" A4'teki çember sırasından okunur; burada salt görüntüdür. */}
      <div role="cell" className="text-micro tracking-[0.16em] text-ink/50">
        {eser.cemberde ? `POZ. ${ikiHane(eser.sira + 1)}` : '—'}
      </div>

      <div role="cell">
        <Rozet tur={eser.durum}>{ESER_DURUMLARI[eser.durum] || eser.durum}</Rozet>
      </div>

      <div role="cell">
        <SatirMenusu eser={eser} acik={menuAcik} onMenu={onMenu} islemde={islemde} eylemler={eylemler} />
      </div>
    </div>
  )
}

function SatirMenusu({ eser, acik, onMenu, islemde, eylemler }) {
  const kapsayici = useRef(null)
  const tetik = useRef(null)
  const ad = eser.baslik || 'BAŞLIKSIZ'

  useEffect(() => {
    if (!acik) return
    const disariTikla = (o) => {
      if (!kapsayici.current?.contains(o.target)) onMenu(eser.id, false)
    }
    const tus = (o) => {
      if (o.key !== 'Escape') return
      onMenu(eser.id, false)
      tetik.current?.focus()
    }
    document.addEventListener('mousedown', disariTikla)
    document.addEventListener('keydown', tus)
    /* İlk öğe pasif olabilir (örn. zaten yayında); odak ilk EDİLEBİLİR eyleme gider. */
    kapsayici.current?.querySelector('[role="menu"] button:not([disabled])')?.focus()
    return () => {
      document.removeEventListener('mousedown', disariTikla)
      document.removeEventListener('keydown', tus)
    }
  }, [acik, eser.id, onMenu])

  const ogeler = [
    { etiket: 'YAYINLA', calistir: () => eylemler.yayinla([eser.id]), pasif: eser.durum === 'yayinda' },
    { etiket: 'TASLAĞA AL', calistir: () => eylemler.taslagaAl([eser.id]), pasif: eser.durum === 'taslak' },
    { etiket: 'ÇEMBERDEN ÇIKAR', calistir: () => eylemler.cemberdenCikar([eser.id]), pasif: !eser.cemberde },
    { etiket: 'SİL', calistir: () => eylemler.sil([eser.id]), tehlike: true },
  ]

  return (
    <div ref={kapsayici} className="relative flex justify-end">
      <button
        ref={tetik}
        type="button"
        aria-haspopup="menu"
        aria-expanded={acik}
        aria-label={`${ad} için eylemler`}
        onClick={() => onMenu(eser.id, !acik)}
        className="px-1 leading-none text-ink/40 transition-colors hover:text-ink"
      >
        ···
      </button>

      {acik && (
        <div
          role="menu"
          aria-label={`${ad} eylemleri`}
          className="absolute right-0 top-full z-20 mt-1 w-[190px] border border-ink/25 bg-admin-panel"
        >
          {ogeler.map((o) => (
            <button
              key={o.etiket}
              type="button"
              role="menuitem"
              disabled={o.pasif || islemde}
              onClick={() => {
                o.calistir()
                /* Eylem menüyü kapatır; odak boşlukta kalmasın diye tetiğe döner. */
                tetik.current?.focus()
              }}
              className={cn(
                'block w-full px-3.5 py-2.5 text-left text-micro tracking-[0.16em] transition-colors',
                o.tehlike ? 'text-tas hover:bg-tas/10' : 'text-ink/60 hover:bg-ink/[0.06] hover:text-ink',
                'disabled:cursor-not-allowed disabled:text-ink/25 disabled:hover:bg-transparent',
              )}
            >
              {o.etiket}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
