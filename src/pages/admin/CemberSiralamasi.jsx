/**
 * A4 — Çember sıralaması.
 *
 * Ana sayfadaki çemberin pozisyon dizilimi burada kurulur. Sıra TASLAKTIR:
 * `cemberSirasiKaydet` yalnızca eserlerin `sira` alanını günceller, site
 * yayınlanmış sırayı okumaya devam eder. "SIRAYI YAYINLA" denene kadar
 * ziyaretçi hiçbir değişikliği görmez.
 *
 * Pozisyon açısı hiçbir yerde saklanmaz — her zaman 360° ÷ n'den türetilir.
 */
import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useDepo, useDepoVerisi } from '../../services/DepoContext.jsx'
import { cemberEserleri } from '../../services/repository/contract.js'
import { MALZEME_ETIKETI, pozisyonAcisi } from '../../config/tokens.js'
import { ESER_DURUMLARI, anaGorsel } from '../../data/schema.js'
import {
  AnahtarSatiri,
  Dugme,
  EkranBasligi,
  EkranNotlari,
  Girdi,
  Panel,
  PanelCubugu,
  Secim,
  cn,
} from '../../components/admin/ui.jsx'
import Iskelet from '../../components/common/Iskelet.jsx'
import HataKutusu from '../../components/common/HataKutusu.jsx'
import LazyImage from '../../components/common/LazyImage.jsx'

/* Önizleme geometrisi — tel kafesteki değerler: kesikli daire inset %14,
   noktalar merkeze göre %36 yarıçapta. */
const ONIZLEME_YARICAP = 36

const SATIR_IZGARA = 'grid-cols-[24px_44px_34px_1fr_150px_70px_60px]'

/** Türkçe ondalık ayraçla, gereksiz sıfır olmadan: 24 → "24", 25.714 → "25,7" */
const sayiMetni = (n, basamak = 1) => {
  const kat = 10 ** basamak
  return (Math.round(n * kat) / kat).toLocaleString('tr-TR')
}

const saatMetni = (zaman) =>
  new Date(zaman).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

const sirNo = (i) => String(i + 1).padStart(2, '0')

const diziEsit = (a, b) => Boolean(a) && Boolean(b) && a.length === b.length && a.every((v, i) => v === b[i])

const arayaSikistir = (deger, en, boy, yedek) => {
  if (deger === '' || deger == null) return yedek
  const n = Number(deger)
  if (!Number.isFinite(n)) return yedek
  return Math.min(boy, Math.max(en, n))
}

/* Soluk satırın nedeni yazıyla da verilir: bilgi yalnızca opaklıkla taşınmamalı. */
const disKalmaSebebi = (eser) => (eser.durum !== 'yayinda' ? ESER_DURUMLARI[eser.durum] : 'ÇEMBER DIŞI')

export default function CemberSiralamasi() {
  const depo = useDepo()

  const { veri, yukleniyor, hata } = useDepoVerisi(
    async (d) => {
      const [eserler, ayarlar, yayinSirasi, yayinlar] = await Promise.all([
        d.eserleriGetir(),
        d.ayarlariGetir(),
        d.yayindakiCemberSirasi(),
        d.yayinlariGetir(),
      ])
      return { eserler, ayarlar, yayinSirasi, sonYayin: yayinlar[0] ?? null }
    },
    [],
  )

  /* ---------- yerel sıra ---------- */

  const [yerelSira, setYerelSira] = useState(null)
  const [yazmaHatasi, setYazmaHatasi] = useState(null)
  const [bildirim, setBildirim] = useState('')
  const [duyuru, setDuyuru] = useState('')
  const [yayinlaniyor, setYayinlaniyor] = useState(false)

  /* Yerel sıra depoya yazılmayı beklerken gelen tazelemeyi yutarız; aksi halde
     eski veri kullanıcının az önceki taşımasını geri alır. Sayaç, üst üste
     binen yazmalarda ilk cevabın kilidi erken açmasını engeller. */
  const bekleyenRef = useRef(0)
  const bildirimZamanlayici = useRef(null)

  const bildir = useCallback((mesaj) => {
    setBildirim(mesaj)
    if (bildirimZamanlayici.current) clearTimeout(bildirimZamanlayici.current)
    bildirimZamanlayici.current = setTimeout(() => setBildirim(''), 4000)
  }, [])

  useEffect(() => () => clearTimeout(bildirimZamanlayici.current), [])

  const eserler = veri?.eserler ?? null

  const eserHarita = useMemo(() => new Map((eserler ?? []).map((e) => [e.id, e])), [eserler])

  const depoSirasi = useMemo(() => (eserler ? cemberEserleri(eserler).map((e) => e.id) : null), [eserler])

  const disaridakiler = useMemo(
    () =>
      (eserler ?? [])
        .filter((e) => !(e.cemberde && e.durum === 'yayinda'))
        .sort((a, b) => a.baslik.localeCompare(b.baslik, 'tr')),
    [eserler],
  )

  /* Klavye taşıma modu açıkken depo tazelemesi yerel sırayı ezmemeli; mod
     kapanınca etki yeniden koşup senkronu yakalar. */
  const [tasimaModu, setTasimaModu] = useState(null)

  useEffect(() => {
    if (!depoSirasi) return
    if (bekleyenRef.current > 0 || tasimaModu) return
    setYerelSira((onceki) => (diziEsit(onceki, depoSirasi) ? onceki : depoSirasi))
  }, [depoSirasi, tasimaModu])

  const sirali = yerelSira ?? []
  const adet = sirali.length
  const adim = pozisyonAcisi(adet)

  const kaydet = useCallback(
    (yeniSira, mesaj) => {
      bekleyenRef.current += 1
      setYerelSira(yeniSira)
      setYazmaHatasi(null)
      depo.cemberSirasiKaydet(yeniSira).then(
        () => {
          bekleyenRef.current -= 1
          if (mesaj) bildir(mesaj)
        },
        (h) => {
          bekleyenRef.current -= 1
          setYazmaHatasi(h)
        },
      )
    },
    [bildir, depo],
  )

  /** Bir öğeyi kaynak indeksinden hedef indeksine taşır. */
  const tasinmis = useCallback((liste, kaynak, hedef) => {
    const yeni = liste.slice()
    const [tasinan] = yeni.splice(kaynak, 1)
    yeni.splice(hedef, 0, tasinan)
    return yeni
  }, [])

  /* ---------- işaretçi ile sürükleme ---------- */

  /* HTML5 drag&drop dokunmatikte çalışmıyor; pointer olayları hem fare hem
     parmak için tek kod yolu veriyor. */
  const satirRefleri = useRef(new Map())
  const olcuRef = useRef([])
  /* Sürükleme durumunun kaynağı ref'tir (olay işleyicileri arasında anında
     okunur); state yalnızca çizim için ona eşlenir. */
  const [surukle, setSurukle] = useState(null) // { kaynak, hedef }  hedef = araya girilecek konum
  const surukleRef = useRef(null)

  const surukleBasla = (olay, kaynak) => {
    if (olay.button != null && olay.button !== 0) return
    olay.preventDefault()
    /* Ölçüleri bir kez alıp saklıyoruz: her harekette layout okumak
       uzun listelerde kareyi düşürür. */
    olcuRef.current = sirali.map((id) => {
      const el = satirRefleri.current.get(id)
      const k = el ? el.getBoundingClientRect() : { top: 0, height: 0 }
      return k.top + k.height / 2
    })
    try {
      olay.currentTarget.setPointerCapture(olay.pointerId)
    } catch {
      /* yakalama desteklenmiyorsa olaylar yine de hedefe düşer */
    }
    surukleRef.current = { kaynak, hedef: kaynak }
    setSurukle(surukleRef.current)
    setTasimaModu(null)
  }

  const surukleHareket = (olay) => {
    const s = surukleRef.current
    if (!s) return
    const ortalar = olcuRef.current
    let hedef = ortalar.findIndex((orta) => olay.clientY < orta)
    if (hedef === -1) hedef = ortalar.length
    if (hedef === s.hedef) return
    surukleRef.current = { ...s, hedef }
    setSurukle(surukleRef.current)
  }

  const surukleBitir = () => {
    const s = surukleRef.current
    if (!s) return
    surukleRef.current = null
    setSurukle(null)
    const yeniIndeks = s.hedef > s.kaynak ? s.hedef - 1 : s.hedef
    if (yeniIndeks === s.kaynak) return
    kaydet(tasinmis(sirali, s.kaynak, yeniIndeks), null)
    setDuyuru(`${sirNo(yeniIndeks)}. sıraya taşındı.`)
  }

  const surukleIptal = () => {
    surukleRef.current = null
    setSurukle(null)
  }

  /* ---------- klavye ile taşıma ---------- */

  const iptalSirasiRef = useRef(null)

  /* Her ok basışı anında taslağa yazıldığı için bırakmak yalnızca modu kapatır.
     Böylece odak satırla birlikte DOM'da yer değiştirirken tarayıcının attığı
     blur'a takılıp yarım kaydedilmiş bir sıra kalmıyor. */
  const tasimaBitir = useCallback((id) => {
    setTasimaModu(null)
    iptalSirasiRef.current = null
    setDuyuru('Bırakıldı.')
    return id
  }, [])

  /* Satır DOM'da yer değiştirince bazı tarayıcılar anlık blur atar; odak
     gerçekten gittiyse modu kapatırız, yeniden gelmişse dokunmayız. */
  const satirBlur = (id) => {
    if (tasimaModu !== id) return
    setTimeout(() => {
      const el = satirRefleri.current.get(id)
      if (el && document.activeElement === el) return
      tasimaBitir(id)
    }, 0)
  }

  const satirTus = (olay, id, indeks) => {
    const acik = tasimaModu === id

    if (olay.key === ' ' || olay.key === 'Spacebar' || (olay.key === 'Enter' && !acik)) {
      olay.preventDefault()
      if (acik) {
        tasimaBitir(id)
      } else {
        iptalSirasiRef.current = sirali
        setTasimaModu(id)
        setDuyuru(`Taşıma modu açık. ${sirNo(indeks)}. sıra. Ok tuşlarıyla taşıyın, Enter ile bırakın.`)
      }
      return
    }

    if (!acik) return

    if (olay.key === 'Enter') {
      olay.preventDefault()
      tasimaBitir(id)
      return
    }

    if (olay.key === 'Escape') {
      olay.preventDefault()
      const baslangic = iptalSirasiRef.current
      iptalSirasiRef.current = null
      setTasimaModu(null)
      /* Ara taşımalar taslağa yazıldığı için iptal de yazılmalı. */
      if (baslangic && !diziEsit(baslangic, sirali)) kaydet(baslangic, null)
      setDuyuru('Taşıma iptal edildi.')
      return
    }

    if (olay.key === 'ArrowUp' || olay.key === 'ArrowDown') {
      olay.preventDefault()
      const hedef = indeks + (olay.key === 'ArrowUp' ? -1 : 1)
      if (hedef < 0 || hedef >= sirali.length) return
      kaydet(tasinmis(sirali, indeks, hedef), null)
      setDuyuru(`${sirNo(hedef)}. sıraya taşındı.`)
    }
  }

  /* Taşınan satır yeniden konumlandıktan sonra odak onda kalmalı. */
  useEffect(() => {
    if (!tasimaModu) return
    const el = satirRefleri.current.get(tasimaModu)
    if (el && document.activeElement !== el) el.focus()
  }, [tasimaModu, yerelSira])

  /* ---------- toplu eylemler ---------- */

  const esitDagit = () => {
    /* Açılar zaten 360°÷n ile türetildiği için burada "dağıtılacak" bir şey yok.
       Düğmenin gerçek işi: çemberden çıkarılan eserlerin bıraktığı sıra
       boşluklarını kapatmak (sira alanlarını 0..n-1 aralığına yeniden yazmak)
       ve etiketleri tazelemek. Diziliş korunur. */
    kaydet(sirali.slice(), 'AÇILAR YENİDEN HESAPLANDI')
  }

  const almasikDiz = () => {
    const metaller = sirali.filter((id) => eserHarita.get(id)?.malzemeSinifi === 'metal')
    const taslar = sirali.filter((id) => eserHarita.get(id)?.malzemeSinifi !== 'metal')
    /* Kalabalık grupla başlanır; böylece artan öğeler sonda arka arkaya
       gelse bile tekrar sayısı en aza iner. */
    const [uzun, kisa] = metaller.length >= taslar.length ? [metaller, taslar] : [taslar, metaller]
    const yeni = []
    for (let i = 0; i < uzun.length; i += 1) {
      yeni.push(uzun[i])
      if (i < kisa.length) yeni.push(kisa[i])
    }
    kaydet(yeni, 'MALZEMEYE GÖRE ALMAŞIK DİZİLDİ')
  }

  const yayinla = () => {
    setYayinlaniyor(true)
    setYazmaHatasi(null)
    depo.cemberSirasiYayinla(sirali).then(
      (y) => {
        setYayinlaniyor(false)
        bildir(`SIRA YAYINLANDI — ${saatMetni(y.zaman)}`)
      },
      (h) => {
        setYayinlaniyor(false)
        setYazmaHatasi(h)
      },
    )
  }

  const yayinFarki = useMemo(() => {
    if (!yerelSira || !veri) return false
    return !diziEsit(veri.yayinSirasi, yerelSira)
  }, [veri, yerelSira])

  /* ---------- çember ayarları (taslağa yazılır) ---------- */

  const [cemberAyar, setCemberAyar] = useState(null)
  const ayarKirliRef = useRef(false)

  useEffect(() => {
    if (!veri?.ayarlar?.cember) return
    if (ayarKirliRef.current) return
    setCemberAyar(veri.ayarlar.cember)
  }, [veri])

  const ayarYaz = useCallback(
    (yama) => {
      ayarKirliRef.current = true
      setCemberAyar((o) => ({ ...o, ...yama }))
      setYazmaHatasi(null)
      depo.ayarlariKaydet({ cember: yama }).then(
        () => {
          ayarKirliRef.current = false
        },
        (h) => {
          ayarKirliRef.current = false
          setYazmaHatasi(h)
        },
      )
    },
    [depo],
  )

  /** Sayı girdileri yazarken değil, alandan çıkarken kaydedilir. */
  const ayarTasla = (yama) => {
    ayarKirliRef.current = true
    setCemberAyar((o) => ({ ...o, ...yama }))
  }

  const acilisId = useId()
  const hizId = useId()
  const yaricapId = useId()
  const yonergeId = useId()

  const acilisIndeks = useMemo(() => {
    const i = (yerelSira ?? []).indexOf(cemberAyar?.acilisEserId)
    return i >= 0 ? i : 0
  }, [cemberAyar, yerelSira])

  const acilisEser = eserHarita.get(sirali[acilisIndeks])

  /* ---------- durumlar ---------- */

  const basliklar = (
    <EkranBasligi kod="A4" baslik="ÇEMBER SIRALAMASI" yol="/admin/cember" />
  )

  if (hata) {
    return (
      <div>
        {basliklar}
        <HataKutusu hata={hata} />
      </div>
    )
  }

  if (yukleniyor || !yerelSira || !cemberAyar) {
    return (
      <div>
        {basliklar}
        <Panel>
          <PanelCubugu>
            <Iskelet className="w-48" yukseklik={12} />
          </PanelCubugu>
          <div className="grid gap-[7px] p-[26px]">
            <Iskelet className="w-full" yukseklik={54} adet={7} />
          </div>
        </Panel>
      </div>
    )
  }

  /* Bırakma göstergesi a11y ağacından çıkarılır; role="list" altındaki tek
     anlamlı çocuk satırlar olsun. */
  const gosterge = (indeks) =>
    surukle && surukle.hedef === indeks ? <div aria-hidden="true" className="my-px h-0.5 bg-tas" /> : null

  return (
    <div>
      {basliklar}

      <Panel>
        <PanelCubugu className="flex-wrap">
          <span className="text-mini tracking-genis">ÇEMBER — {adet} POZİSYON</span>
          <span className="text-micro tracking-genis text-ink/30">
            POZİSYON ARALIĞI {sayiMetni(adim)}°
          </span>

          {veri.sonYayin && (
            <span className="text-micro tracking-genis text-ink/30">
              YAYINLANDI — {saatMetni(veri.sonYayin.zaman)}
            </span>
          )}
          {yayinFarki && (
            <span className="text-micro tracking-genis text-tas">YAYINLANMAMIŞ SIRA DEĞİŞİKLİĞİ</span>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2.5">
            <span role="status" aria-live="polite" className="text-micro tracking-genis text-ink/45">
              {bildirim}
            </span>
            <Dugme onClick={esitDagit} disabled={!adet}>
              EŞİT DAĞIT
            </Dugme>
            <Dugme onClick={almasikDiz} disabled={adet < 2}>
              MALZEMEYE GÖRE ALMAŞIK
            </Dugme>
            <Dugme tur="birincil" onClick={yayinla} disabled={yayinlaniyor || !adet}>
              {yayinlaniyor ? 'YAYINLANIYOR…' : 'SIRAYI YAYINLA'}
            </Dugme>
          </div>
        </PanelCubugu>

        {yazmaHatasi && (
          <div className="px-6 pt-5">
            <HataKutusu hata={yazmaHatasi} />
          </div>
        )}

        <div className="grid min-h-[660px] grid-cols-1 lg:grid-cols-[1fr_420px]">
          {/* ---------- sol: sıralama listesi ---------- */}
          <section className="border-b border-ink/[0.12] p-[26px] lg:border-b-0 lg:border-r">
            <h2 className="pb-3.5 text-micro tracking-genis text-ink/40">SÜRÜKLE — SIRALA</h2>

            <p id={yonergeId} className="sr-only">
              Sıralanabilir liste. Bir satıra odaklanıp Boşluk veya Enter tuşuyla taşıma modunu açın,
              yukarı ve aşağı ok tuşlarıyla taşıyın, Enter ile bırakın, Esc ile iptal edin.
              Fare veya dokunmatikle sürüklemek için satırın tutamağını kullanın.
            </p>
            <div aria-live="polite" className="sr-only">
              {duyuru}
            </div>

            {adet === 0 ? (
              <p className="border border-ink/[0.16] px-3 py-6 text-center text-mini tracking-genis text-ink/35">
                ÇEMBERDE GÖSTERİLECEK YAYINDA ESER YOK
              </p>
            ) : (
              <div role="list" aria-describedby={yonergeId} className="grid gap-[7px]">
                {sirali.map((id, indeks) => {
                  const eser = eserHarita.get(id)
                  if (!eser) return null
                  const tasiniyor = surukle?.kaynak === indeks || tasimaModu === id
                  const aci = indeks * adim
                  const kapak = anaGorsel(eser)

                  return (
                    <Fragment key={id}>
                      {gosterge(indeks)}
                      <div
                        role="listitem"
                        ref={(el) => {
                          if (el) satirRefleri.current.set(id, el)
                          else satirRefleri.current.delete(id)
                        }}
                        tabIndex={0}
                        aria-roledescription="sıralanabilir öğe"
                        aria-label={
                          `${sirNo(indeks)}. sıra, ${eser.baslik}, ${sayiMetni(aci)} derece` +
                          (tasimaModu === id ? ', taşıma modu açık' : '')
                        }
                        onKeyDown={(o) => satirTus(o, id, indeks)}
                        onBlur={() => satirBlur(id)}
                        className={cn(
                          'grid items-center gap-[14px] border px-3 py-[9px] text-mini tracking-[0.08em] outline-none transition-colors',
                          SATIR_IZGARA,
                          tasiniyor
                            ? 'border-dashed border-tas bg-tas/[0.07]'
                            : 'border-ink/[0.16] focus-visible:border-ink/70',
                        )}
                      >
                        {/* Tutamak yalnızca işaretçi için; klavye erişimi satırın
                            kendisinde olduğundan odaklanabilir olmasına gerek yok. */}
                        <span
                          aria-hidden="true"
                          onPointerDown={(o) => surukleBasla(o, indeks)}
                          onPointerMove={surukleHareket}
                          onPointerUp={surukleBitir}
                          onPointerCancel={surukleIptal}
                          style={{ touchAction: 'none' }}
                          className={cn(
                            'cursor-grab select-none transition-colors active:cursor-grabbing',
                            tasiniyor ? 'text-tas' : 'text-ink/35 hover:text-ink/70',
                          )}
                        >
                          ⣿
                        </span>

                        <LazyImage
                          gorselId={kapak?.id ?? null}
                          alt=""
                          className="h-[34px] w-full border border-ink/[0.18]"
                        />

                        <span className="text-ink/45">{sirNo(indeks)}</span>
                        <span className="truncate">{eser.baslik}</span>
                        <span className="truncate text-micro tracking-[0.16em] text-ink/50">{eser.malzeme}</span>
                        <span className="text-micro tracking-[0.16em] text-ink/40">
                          {MALZEME_ETIKETI[eser.malzemeSinifi]}
                        </span>
                        <span className={cn('text-micro', tasiniyor ? 'text-tas' : 'text-ink/35')}>
                          {sayiMetni(aci)}°
                        </span>
                      </div>
                    </Fragment>
                  )
                })}
                {gosterge(adet)}
              </div>
            )}

            {disaridakiler.length > 0 && (
              <>
                <p className="px-0 pb-3 pt-3.5 text-center text-micro tracking-genis text-ink/[0.28]">
                  ⋮ ÇEMBER DIŞI — {disaridakiler.length} KAYIT
                </p>
                <ul className="grid gap-[7px]">
                  {disaridakiler.map((eser) => (
                    <li
                      key={eser.id}
                      className={cn(
                        'grid items-center gap-[14px] border border-ink/[0.16] px-3 py-[9px] text-mini tracking-[0.08em] opacity-45',
                        SATIR_IZGARA,
                      )}
                    >
                      <span aria-hidden="true" className="text-ink/35">
                        ⣿
                      </span>
                      <LazyImage
                        gorselId={anaGorsel(eser)?.id ?? null}
                        alt=""
                        className="h-[34px] w-full border border-ink/[0.18]"
                      />
                      <span className="text-ink/45">—</span>
                      <span className="truncate">
                        {eser.baslik}
                        <span className="pl-2.5 text-micro tracking-[0.16em] text-ink/45">
                          {disKalmaSebebi(eser)}
                        </span>
                      </span>
                      <span className="truncate text-micro tracking-[0.16em] text-ink/50">{eser.malzeme}</span>
                      <span className="text-micro tracking-[0.16em] text-ink/40">
                        {MALZEME_ETIKETI[eser.malzemeSinifi]}
                      </span>
                      <span className="text-micro text-ink/35">—</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="pt-3.5 text-center text-micro tracking-genis text-ink/[0.28]">
              {(eserler?.length ?? 0)} ESER · {adet} POZİSYON · {disaridakiler.length} ÇEMBER DIŞI
            </p>
          </section>

          {/* ---------- sağ: üstten görünüm ---------- */}
          <section className="flex flex-col gap-[22px] p-[26px]">
            <h2 className="text-micro tracking-genis text-ink/40">ÜSTTEN GÖRÜNÜM — ÖNİZLEME</h2>

            <div
              role="img"
              aria-label={
                adet
                  ? `Üstten görünüm: ${adet} pozisyon, ${sayiMetni(adim)} derece aralıkla. ` +
                    `Açılışta önde olan eser: ${acilisEser?.baslik ?? 'seçilmedi'}.`
                  : 'Üstten görünüm: çemberde pozisyon yok.'
              }
              className="relative aspect-square w-full border border-ink/10"
            >
              <div className="absolute inset-[14%] rounded-full border border-dashed border-ink/[0.22]" />
              <div className="absolute left-0 top-1/2 h-px w-full bg-ink/[0.08]" />
              <div className="absolute left-1/2 top-0 h-full w-px bg-ink/[0.08]" />
              <div className="absolute left-1/2 top-1/2 -ml-[4.5px] -mt-[4.5px] h-[9px] w-[9px] border border-ink/50" />

              {adet > 0 && (
                <div
                  aria-hidden="true"
                  className="absolute left-1/2 top-1/2 h-[36%] w-px origin-top bg-tas/50"
                  style={{ transform: `rotate(${180 + acilisIndeks * adim}deg)` }}
                />
              )}

              {sirali.map((id, indeks) => {
                const eser = eserHarita.get(id)
                if (!eser) return null
                const aci = indeks * adim
                const radyan = (aci * Math.PI) / 180
                const x = 50 + ONIZLEME_YARICAP * Math.sin(radyan)
                const y = 50 - ONIZLEME_YARICAP * Math.cos(radyan)
                const acilis = indeks === acilisIndeks
                const kenar = acilis ? 11 : 8

                return (
                  <div
                    key={id}
                    title={`${sirNo(indeks)} ${eser.baslik} — ${sayiMetni(aci)}°`}
                    className={cn('absolute', acilis ? 'bg-tas' : 'bg-ink/40')}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      width: kenar,
                      height: kenar,
                      margin: -kenar / 2,
                    }}
                  />
                )
              })}

              <span className="absolute bottom-3 left-3.5 text-micro tracking-[0.16em] text-ink/35">
                <span aria-hidden="true" className="text-tas">
                  ■
                </span>{' '}
                AÇILIŞTA ÖNDE OLAN POZİSYON
              </span>
            </div>

            <div className="grid gap-3 text-micro tracking-[0.16em] text-ink/[0.42]">
              <div className="flex items-center justify-between gap-4">
                <label htmlFor={acilisId}>AÇILIŞ POZİSYONU</label>
                <div className="w-[196px]">
                  <Secim
                    id={acilisId}
                    /* Ölçü satırının yüksekliği tel kafeste 30-32px; Girdi/Secim
                       ilkelinin 38px'i sınıfla değil stille eziliyor, çünkü iki
                       keyfi Tailwind değeri aynı yardımcı grubunda çakışır. */
                    style={{ height: 32 }}
                    value={sirali[acilisIndeks] ?? ''}
                    disabled={!adet}
                    onChange={(o) => ayarYaz({ acilisEserId: o.target.value || null })}
                    secenekler={
                      adet
                        ? sirali.map((id, i) => ({
                            deger: id,
                            etiket: `${sirNo(i)} ${eserHarita.get(id)?.baslik ?? ''}`,
                          }))
                        : [{ deger: '', etiket: 'POZİSYON YOK' }]
                    }
                  />
                </div>
              </div>

              <AnahtarSatiri
                etiket="OTOMATİK DÖNÜŞ"
                acik={Boolean(cemberAyar.otomatikDonus)}
                onChange={(v) => ayarYaz({ otomatikDonus: v })}
              />

              <div className="flex items-center justify-between gap-4">
                <label htmlFor={hizId}>DÖNÜŞ HIZI</label>
                <div className="flex items-center gap-2">
                  <Girdi
                    id={hizId}
                    type="number"
                    step="0.005"
                    min="0"
                    max="1"
                    className="text-right"
                    style={{ width: 92, height: 32 }}
                    value={cemberAyar.donusHizi ?? ''}
                    onChange={(o) => ayarTasla({ donusHizi: o.target.value })}
                    onBlur={(o) => ayarYaz({ donusHizi: arayaSikistir(o.target.value, 0, 1, 0.045) })}
                  />
                  <span className="text-ink/40">°/KARE</span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4">
                <label htmlFor={yaricapId}>ÇEMBER YARIÇAPI</label>
                <div className="flex items-center gap-2">
                  <Girdi
                    id={yaricapId}
                    type="number"
                    step="10"
                    min="400"
                    max="1400"
                    className="text-right"
                    style={{ width: 92, height: 32 }}
                    value={cemberAyar.yaricap ?? ''}
                    onChange={(o) => ayarTasla({ yaricap: o.target.value })}
                    onBlur={(o) => ayarYaz({ yaricap: Math.round(arayaSikistir(o.target.value, 400, 1400, 780)) })}
                  />
                  <span className="text-ink/40">PX</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </Panel>

      <EkranNotlari
        notlar={[
          'Sıra değişikliği taslak olarak tutulur; “Sırayı yayınla” denene kadar site etkilenmez.',
          'Pozisyon açıları eser sayısına göre otomatik hesaplanır (360° ÷ n).',
        ]}
      />
    </div>
  )
}
