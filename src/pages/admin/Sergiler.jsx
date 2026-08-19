/**
 * A5 — Sergi kayıtları.
 *
 * Tel kafesten birebir: 70/1fr/220/130/100/90/30 ızgara, 16px boşluk, yıl azalan
 * sıra, altta kesikli çerçeveli satır içi ekleme satırı. Üst çubuktaki sayılar ve
 * "ESER" sütunu daima veriden türetilir — sabit rakam yoktur.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDepo, useDepoVerisi } from '../../services/DepoContext.jsx'
import { ESER_DURUMLARI, SERGI_TURLERI } from '../../data/schema.js'
import Iskelet from '../../components/common/Iskelet.jsx'
import HataKutusu from '../../components/common/HataKutusu.jsx'
import { Dugme, EkranBasligi, EkranNotlari, Girdi, Panel, PanelCubugu, Secim, cn } from '../../components/admin/ui.jsx'

/* Tel kafesteki tablo ızgarası — başlık, veri ve ekleme satırı aynı şablonu paylaşır. */
const IZGARA = 'grid grid-cols-[70px_1fr_220px_130px_100px_90px_30px] gap-4'

/* Satır içi girdiler tel kafeste 32px; ui.jsx'teki 38px'lik temeli bilinçli eziyoruz. */
const KOMPAKT = '!h-8 !px-2.5 !text-mini !tracking-[0.08em]'

const TUR_SECENEKLERI = [
  { deger: 'kisisel', etiket: SERGI_TURLERI.kisisel },
  { deger: 'grup', etiket: SERGI_TURLERI.grup },
]

/* Arşiv tek dilde ve tek biçimde kalsın diye kayıtlar büyük harfe çevrilir.
   Türkçe yerel ayarı şart: "i" → "İ" (GALERİ), "ı" → "I". */
const buyuk = (m) => (m || '').trim().toLocaleUpperCase('tr-TR')

const bosSatir = () => ({ yil: '', ad: '', mekan: '', sehir: '', tur: 'kisisel', eserIdleri: [] })

const satirlariSirala = (liste) =>
  liste.slice().sort((a, b) => b.yil - a.yil || a.ad.localeCompare(b.ad, 'tr'))

/* ---------- CV çıktısı ---------- */

/** Not 2: yıl azalan sırayla, kişisel sergiler önce gruplanır. */
function cvMetniUret(sergiler) {
  const satir = (s) => `${s.yil}  ${[s.ad, s.mekan, s.sehir].filter(Boolean).join(', ')}`
  const bolum = (baslik, liste) => (liste.length ? [baslik, '', ...satirlariSirala(liste).map(satir), ''] : [])
  return [
    'KESE BENAV — SERGİLER',
    '',
    ...bolum('KİŞİSEL SERGİLER', sergiler.filter((s) => s.tur === 'kisisel')),
    ...bolum('GRUP SERGİLERİ', sergiler.filter((s) => s.tur === 'grup')),
  ]
    .join('\n')
    .trimEnd()
    .concat('\n')
}

function cvIndir(sergiler) {
  // BOM olmadan bazı masaüstü düzenleyicileri UTF-8'i yerel kod sayfası sanıp
  // Türkçe karakterleri bozuyor.
  const blob = new Blob(['\ufeff', cvMetniUret(sergiler)], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const bag = document.createElement('a')
  bag.href = url
  bag.download = 'kese-benav-sergiler.txt'
  document.body.appendChild(bag)
  bag.click()
  bag.remove()
  URL.revokeObjectURL(url)
}

/* ---------- eser seçici ---------- */

/**
 * Arşivden çoklu seçim (Not 1). Esc ve dışarı tıklama ile kapanır, odağı içeride
 * tutar; seçim anında taslağa yazılır, kayıtla birlikte sergi.eserIdleri güncellenir.
 */
function EserSecici({ eserler, sergiler, secili, onChange, onKapat, yon = 'asagi' }) {
  const kapsayici = useRef(null)
  const [arama, setArama] = useState('')

  useEffect(() => {
    kapsayici.current?.querySelector('input')?.focus()
  }, [])

  const tuslar = (olay) => {
    if (olay.key === 'Escape') {
      olay.preventDefault()
      olay.stopPropagation() // satır içi düzenlemeyi de iptal etmesin
      onKapat()
      return
    }
    /* Seçici satır içi satırın/formun içinde duruyor; Enter yukarı sızarsa
       kaydı erkenden kapatır. Onay kutusu düğmeleri çalışsın diye yalnızca
       arama kutusunda varsayılan davranış (form gönderimi) engellenir. */
    if (olay.key === 'Enter') {
      olay.stopPropagation()
      if (olay.target.tagName === 'INPUT') olay.preventDefault()
      return
    }
    if (olay.key !== 'Tab') return
    const odaklanabilir = kapsayici.current?.querySelectorAll('button, input')
    if (!odaklanabilir?.length) return
    const ilk = odaklanabilir[0]
    const son = odaklanabilir[odaklanabilir.length - 1]
    if (olay.shiftKey && document.activeElement === ilk) {
      olay.preventDefault()
      son.focus()
    } else if (!olay.shiftKey && document.activeElement === son) {
      olay.preventDefault()
      ilk.focus()
    }
  }

  const anahtar = arama.trim().toLocaleLowerCase('tr-TR')
  const listelenen = useMemo(() => {
    const sirali = eserler
      .slice()
      .sort((a, b) => b.yil - a.yil || a.baslik.localeCompare(b.baslik, 'tr'))
    if (!anahtar) return sirali
    return sirali.filter((e) =>
      [e.baslik, e.malzeme, String(e.yil), ...(e.etiketler || [])]
        .join(' ')
        .toLocaleLowerCase('tr-TR')
        .includes(anahtar),
    )
  }, [eserler, anahtar])

  /* İki yönlü bağın eser tarafı: bu eser kaç sergide geçiyor? */
  const sergiSayisi = useMemo(() => {
    const harita = new Map()
    for (const s of sergiler) for (const id of s.eserIdleri || []) harita.set(id, (harita.get(id) || 0) + 1)
    return harita
  }, [sergiler])

  const kume = new Set(secili)
  const degistir = (id) => {
    const yeni = kume.has(id) ? secili.filter((x) => x !== id) : [...secili, id]
    onChange(yeni)
  }

  return (
    <>
      <div className="fixed inset-0 z-40" aria-hidden="true" onMouseDown={onKapat} />
      <div
        ref={kapsayici}
        role="dialog"
        aria-modal="true"
        aria-label="Sergiye eser seç"
        onKeyDown={tuslar}
        className={cn(
          'absolute right-0 z-50 w-[360px] border border-ink/25 bg-admin-panel shadow-[0_18px_46px_rgba(0,0,0,.55)]',
          yon === 'yukari' ? 'bottom-full mb-2' : 'top-full mt-2',
        )}
      >
        <div className="border-b border-ink/15 p-3">
          <Girdi
            value={arama}
            onChange={(o) => setArama(o.target.value)}
            placeholder="ESERLERDE ARA…"
            aria-label="Eserlerde ara"
            className={KOMPAKT}
          />
        </div>

        <ul className="max-h-[260px] overflow-y-auto">
          {listelenen.length === 0 && (
            <li className="px-3 py-6 text-center text-micro tracking-genis text-ink/30">EŞLEŞEN ESER YOK</li>
          )}
          {listelenen.map((e) => {
            const isaretli = kume.has(e.id)
            const bagli = sergiSayisi.get(e.id) || 0
            return (
              <li key={e.id}>
                {/* Satırın tamamı onay kutusudur; iç içe düğme kurmamak için
                    12×12 kare yalnızca görsel işaret olarak çizilir. */}
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isaretli}
                  onClick={() => degistir(e.id)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-ink/[0.05]"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'h-3 w-3 shrink-0 border',
                      isaretli ? 'border-ink/50 bg-ink/25' : 'border-ink/30',
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-mini tracking-[0.08em]', isaretli ? 'text-ink' : 'text-ink/70')}>
                      {e.baslik || 'ADSIZ ESER'}
                    </span>
                    <span className="block pt-0.5 text-micro tracking-[0.14em] text-ink/30">
                      {e.yil}
                      {e.durum !== 'yayinda' && ` · ${ESER_DURUMLARI[e.durum]}`}
                      {bagli > 0 && ` · ${bagli} SERGİ`}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="flex items-center justify-between border-t border-ink/15 px-3 py-2.5">
          <span className="text-micro tracking-[0.16em] text-ink/40">
            {secili.length} / {eserler.length} SEÇİLİ
          </span>
          <div className="flex gap-2">
            {secili.length > 0 && (
              <Dugme tur="sade" onClick={() => onChange([])}>
                TEMİZLE
              </Dugme>
            )}
            <Dugme tur="ikincil" onClick={onKapat}>
              KAPAT
            </Dugme>
          </div>
        </div>
      </div>
    </>
  )
}

/** Kompakt "ESER SEÇ" alanı + açılır seçici. */
function EserAlani({ eserler, sergiler, secili, onChange, yon }) {
  const [acik, setAcik] = useState(false)
  const dugme = useRef(null)

  const kapat = useCallback(() => {
    setAcik(false)
    dugme.current?.focus()
  }, [])

  return (
    <div className="relative">
      <button
        ref={dugme}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={acik}
        onClick={() => setAcik((a) => !a)}
        className={cn(
          'flex h-8 w-full items-center border border-ink/20 bg-ink/[0.03] px-2 text-micro tracking-[0.14em] transition-colors hover:border-ink/45',
          secili.length ? 'text-ink/70' : 'text-ink/35',
        )}
      >
        {secili.length ? `${secili.length} ESER` : 'ESER SEÇ'}
      </button>
      {acik && (
        <EserSecici
          eserler={eserler}
          sergiler={sergiler}
          secili={secili}
          onChange={onChange}
          onKapat={kapat}
          yon={yon}
        />
      )}
    </div>
  )
}

/* ---------- satır menüsü ---------- */

/** "···" menüsü — DÜZENLE / SİL; silme iki adımlı onay ister. */
function SatirMenusu({ sergi, onDuzenle, onSil, islemde }) {
  const [acik, setAcik] = useState(false)
  const [onay, setOnay] = useState(false)
  const kapsayici = useRef(null)
  const dugme = useRef(null)

  const kapat = useCallback(() => {
    setAcik(false)
    setOnay(false)
  }, [])

  useEffect(() => {
    if (!acik) return undefined
    const disari = (o) => {
      if (!kapsayici.current?.contains(o.target)) kapat()
    }
    const esc = (o) => {
      if (o.key === 'Escape') {
        kapat()
        dugme.current?.focus()
      }
    }
    document.addEventListener('mousedown', disari)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', disari)
      document.removeEventListener('keydown', esc)
    }
  }, [acik, kapat])

  return (
    <div ref={kapsayici} className="relative flex justify-end">
      <button
        ref={dugme}
        type="button"
        aria-haspopup="menu"
        aria-expanded={acik}
        aria-label={`${sergi.ad} kaydı için işlemler`}
        onClick={() => setAcik((a) => !a)}
        className="px-1 text-mini leading-none text-ink/40 transition-colors hover:text-ink"
      >
        ···
      </button>

      {acik && (
        <div
          role={onay ? 'dialog' : 'menu'}
          aria-label={onay ? `${sergi.ad} kaydını silme onayı` : `${sergi.ad} işlemleri`}
          className="absolute right-0 top-6 z-50 w-[168px] border border-ink/25 bg-admin-panel shadow-[0_18px_46px_rgba(0,0,0,.55)]"
        >
          {onay ? (
            <div className="p-3">
              <p className="text-micro leading-relaxed tracking-[0.12em] text-ink/60">
                {sergi.ad} KAYDI SİLİNSİN Mİ?
              </p>
              <div className="flex gap-2 pt-3">
                <Dugme
                  tur="tehlike"
                  disabled={islemde}
                  onClick={() => {
                    kapat()
                    onSil()
                  }}
                >
                  SİL
                </Dugme>
                <Dugme tur="sade" onClick={kapat}>
                  VAZGEÇ
                </Dugme>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  kapat()
                  onDuzenle()
                }}
                className="block w-full px-3.5 py-2.5 text-left text-micro tracking-genis text-ink/70 transition-colors hover:bg-ink/[0.06] hover:text-ink"
              >
                DÜZENLE
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => setOnay(true)}
                className="block w-full border-t border-ink/10 px-3.5 py-2.5 text-left text-micro tracking-genis text-tas/80 transition-colors hover:bg-tas/10 hover:text-tas"
              >
                SİL
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------- satır içi düzenleme hücreleri ---------- */

/* Izgara hücresi. Modül düzeyinde durur: render içinde tanımlansaydı her tuş
   vuruşunda yeni bir bileşen türü doğar, girdiler yeniden kurulup odağı kaybederdi. */
const Hucre = ({ rol, children }) => <div role={rol}>{children}</div>

/**
 * Hem düzenleme hem ekleme satırında kullanılan beş alan + eser seçici.
 * Düzenleme satırı ARIA tablosunun içinde durduğu için her alan bir hücreye
 * sarılır (`hucreRolu="cell"`); ekleme satırı tablonun dışındadır, rol almaz.
 */
function SatirAlanlari({ taslak, degistir, eserler, sergiler, yilRef, yon, adSiraNo, hucreRolu }) {
  return (
    <>
      <Hucre rol={hucreRolu}>
        <Girdi
          ref={yilRef}
          value={taslak.yil}
          onChange={(o) => degistir({ yil: o.target.value.replace(/[^\d]/g, '').slice(0, 4) })}
          inputMode="numeric"
          placeholder="YIL"
          aria-label={`${adSiraNo} yıl`}
          className={KOMPAKT}
        />
      </Hucre>
      <Hucre rol={hucreRolu}>
        <Girdi
          value={taslak.ad}
          onChange={(o) => degistir({ ad: o.target.value })}
          placeholder="SERGİ ADI"
          aria-label={`${adSiraNo} sergi adı`}
          className={KOMPAKT}
        />
      </Hucre>
      <Hucre rol={hucreRolu}>
        <Girdi
          value={taslak.mekan}
          onChange={(o) => degistir({ mekan: o.target.value })}
          placeholder="MEKAN"
          aria-label={`${adSiraNo} mekan`}
          className={KOMPAKT}
        />
      </Hucre>
      <Hucre rol={hucreRolu}>
        <Girdi
          value={taslak.sehir}
          onChange={(o) => degistir({ sehir: o.target.value })}
          placeholder="ŞEHİR"
          aria-label={`${adSiraNo} şehir`}
          className={KOMPAKT}
        />
      </Hucre>
      <Hucre rol={hucreRolu}>
        <Secim
          value={taslak.tur}
          onChange={(o) => degistir({ tur: o.target.value })}
          secenekler={TUR_SECENEKLERI}
          aria-label={`${adSiraNo} tür`}
          className={cn(KOMPAKT, '!pr-7')}
        />
      </Hucre>
      <Hucre rol={hucreRolu}>
        <EserAlani
          eserler={eserler}
          sergiler={sergiler}
          secili={taslak.eserIdleri}
          onChange={(idler) => degistir({ eserIdleri: idler })}
          yon={yon}
        />
      </Hucre>
    </>
  )
}

/* ---------- ekran ---------- */

export default function Sergiler() {
  const depo = useDepo()
  const { veri, yukleniyor, hata } = useDepoVerisi(
    (d) => Promise.all([d.sergileriGetir(), d.eserleriGetir()]),
    [],
  )
  const [sergiler, eserler] = veri || [[], []]

  const [yeni, setYeni] = useState(bosSatir)
  const [duzenlenenId, setDuzenlenenId] = useState(null)
  const [duzenleme, setDuzenleme] = useState(null)
  const [islemde, setIslemde] = useState(false)
  const [islemHatasi, setIslemHatasi] = useState(null)
  const [uyari, setUyari] = useState('')
  const yeniYilRef = useRef(null)
  const duzenlemeYilRef = useRef(null)

  const sirali = useMemo(() => satirlariSirala(sergiler), [sergiler])
  const kisiselSayisi = sirali.filter((s) => s.tur === 'kisisel').length
  const grupSayisi = sirali.length - kisiselSayisi

  const gecerli = (t) => Boolean(t.ad.trim()) && /^\d{4}$/.test(String(t.yil).trim())

  const yamaUret = (t) => ({
    yil: Number(t.yil),
    ad: buyuk(t.ad),
    mekan: buyuk(t.mekan),
    sehir: buyuk(t.sehir),
    tur: t.tur,
    eserIdleri: t.eserIdleri,
  })

  async function yeniyiKaydet() {
    if (!gecerli(yeni)) {
      setUyari('SERGİ ADI VE DÖRT HANELİ YIL ZORUNLU')
      yeniYilRef.current?.focus()
      return
    }
    setUyari('')
    setIslemde(true)
    setIslemHatasi(null)
    try {
      await depo.sergiOlustur(yamaUret(yeni))
      setYeni(bosSatir())
      yeniYilRef.current?.focus()
    } catch (h) {
      setIslemHatasi(h)
    } finally {
      setIslemde(false)
    }
  }

  async function duzenlemeyiKaydet() {
    if (!duzenleme || !gecerli(duzenleme)) {
      setUyari('SERGİ ADI VE DÖRT HANELİ YIL ZORUNLU')
      duzenlemeYilRef.current?.focus()
      return
    }
    setUyari('')
    setIslemde(true)
    setIslemHatasi(null)
    try {
      await depo.sergiGuncelle(duzenlenenId, yamaUret(duzenleme))
      setDuzenlenenId(null)
      setDuzenleme(null)
    } catch (h) {
      setIslemHatasi(h)
    } finally {
      setIslemde(false)
    }
  }

  async function sil(id) {
    setIslemde(true)
    setIslemHatasi(null)
    try {
      await depo.sergiSil(id)
      if (duzenlenenId === id) {
        setDuzenlenenId(null)
        setDuzenleme(null)
      }
    } catch (h) {
      setIslemHatasi(h)
    } finally {
      setIslemde(false)
    }
  }

  function duzenlemeyeGec(s) {
    setUyari('')
    setDuzenlenenId(s.id)
    setDuzenleme({
      yil: String(s.yil),
      ad: s.ad,
      mekan: s.mekan,
      sehir: s.sehir,
      tur: s.tur,
      eserIdleri: [...(s.eserIdleri || [])],
    })
  }

  function duzenlemedenVazgec() {
    setDuzenlenenId(null)
    setDuzenleme(null)
    setUyari('')
  }

  /* Satır içi kısayollar: Enter kaydeder, Esc vazgeçer. */
  function satirTuslari(olay, kaydet, vazgec) {
    if (olay.key === 'Enter') {
      olay.preventDefault()
      kaydet()
    } else if (olay.key === 'Escape') {
      olay.preventDefault()
      vazgec()
    }
  }

  const baslikSatiri = (
    <div
      role="row"
      className={cn(IZGARA, 'border-b border-ink/20 px-3 pb-3 text-micro tracking-[0.18em] text-ink/40')}
    >
      <div role="columnheader">YIL</div>
      <div role="columnheader">SERGİ</div>
      <div role="columnheader">MEKAN</div>
      <div role="columnheader">ŞEHİR</div>
      <div role="columnheader">TÜR</div>
      <div role="columnheader">ESER</div>
      <div role="columnheader" aria-label="İşlemler" />
    </div>
  )

  return (
    <section aria-labelledby="a5-baslik">
      <EkranBasligi kod="A5" baslik="SERGİ KAYITLARI" yol="/admin/sergiler" />

      <Panel>
        <PanelCubugu>
          <h1 id="a5-baslik" className="text-mini tracking-genis">
            SERGİLER
          </h1>
          <span className="text-micro tracking-genis text-ink/30">
            {yukleniyor
              ? 'YÜKLENİYOR…'
              : `${sirali.length} KAYIT · ${kisiselSayisi} KİŞİSEL · ${grupSayisi} GRUP`}
          </span>
          <div className="ml-auto flex gap-2.5">
            <Dugme
              tur="ikincil"
              disabled={yukleniyor || sirali.length === 0}
              onClick={() => cvIndir(sirali)}
            >
              CV OLARAK DIŞA AKTAR
            </Dugme>
            <Dugme
              tur="birincil"
              disabled={yukleniyor}
              onClick={() => {
                duzenlemedenVazgec()
                yeniYilRef.current?.focus()
              }}
            >
              + YENİ KAYIT
            </Dugme>
          </div>
        </PanelCubugu>

        <div className="px-6 pb-[30px] pt-6">
          {hata ? (
            <HataKutusu hata={hata} />
          ) : yukleniyor ? (
            <div className="grid gap-2">
              <Iskelet yukseklik={30} />
              <Iskelet yukseklik={46} adet={6} />
            </div>
          ) : (
            <>
              {islemHatasi && <HataKutusu hata={islemHatasi} className="mb-4" />}

              <div role="table" aria-label="Sergi kayıtları">
                {baslikSatiri}

                {sirali.map((s) =>
                  duzenlenenId === s.id && duzenleme ? (
                    <div
                      key={s.id}
                      role="row"
                      onKeyDown={(olay) => satirTuslari(olay, duzenlemeyiKaydet, duzenlemedenVazgec)}
                      className={cn(IZGARA, 'items-center border-b border-ink/[0.08] bg-ink/[0.02] px-3 py-2.5')}
                    >
                      <SatirAlanlari
                        taslak={duzenleme}
                        degistir={(yama) => setDuzenleme((d) => ({ ...d, ...yama }))}
                        eserler={eserler}
                        sergiler={sergiler}
                        yilRef={duzenlemeYilRef}
                        yon="asagi"
                        adSiraNo={`${s.ad} —`}
                        hucreRolu="cell"
                      />
                      <div role="cell" className="flex flex-col items-end gap-1">
                        <button
                          type="button"
                          onClick={duzenlemeyiKaydet}
                          disabled={islemde}
                          aria-label="Değişikliği kaydet"
                          className="text-micro leading-none tracking-[0.1em] text-tas transition-opacity hover:opacity-70 disabled:opacity-40"
                        >
                          ↵
                        </button>
                        <button
                          type="button"
                          onClick={duzenlemedenVazgec}
                          aria-label="Düzenlemeden vazgeç"
                          className="text-micro leading-none text-ink/40 transition-colors hover:text-ink"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={s.id}
                      role="row"
                      className={cn(
                        IZGARA,
                        'items-center border-b border-ink/[0.08] px-3 py-3.5 text-mini tracking-[0.08em]',
                      )}
                    >
                      <div role="cell">{s.yil}</div>
                      <div role="cell" className="min-w-0 truncate">
                        {s.ad}
                      </div>
                      <div role="cell" className="min-w-0 truncate text-ink/60">
                        {s.mekan}
                      </div>
                      <div role="cell" className="min-w-0 truncate text-ink/60">
                        {s.sehir}
                      </div>
                      <div
                        role="cell"
                        className={cn('text-micro tracking-[0.16em]', s.tur === 'grup' && 'text-ink/55')}
                      >
                        {SERGI_TURLERI[s.tur]}
                      </div>
                      <div role="cell" className="text-ink/50">
                        {(s.eserIdleri || []).length}
                      </div>
                      <div role="cell">
                        <SatirMenusu
                          sergi={s}
                          islemde={islemde}
                          onDuzenle={() => duzenlemeyeGec(s)}
                          onSil={() => sil(s.id)}
                        />
                      </div>
                    </div>
                  ),
                )}
              </div>

              {sirali.length === 0 && (
                <p className="border-b border-ink/[0.08] px-3 py-8 text-center text-mini tracking-genis text-ink/30">
                  HENÜZ SERGİ KAYDI YOK — AŞAĞIDAKİ SATIRDAN EKLEYİN
                </p>
              )}

              {/* Satır içi ekleme — form olduğu için Enter'ı tarayıcı da kaydeder. */}
              <form
                onSubmit={(o) => {
                  o.preventDefault()
                  yeniyiKaydet()
                }}
                onKeyDown={(o) => {
                  if (o.key === 'Escape') {
                    o.preventDefault()
                    setYeni(bosSatir())
                    setUyari('')
                  }
                }}
                aria-label="Yeni sergi kaydı"
                className={cn(IZGARA, 'mt-3.5 items-center border border-dashed border-ink/30 p-3')}
              >
                <SatirAlanlari
                  taslak={yeni}
                  degistir={(yama) => setYeni((t) => ({ ...t, ...yama }))}
                  eserler={eserler}
                  sergiler={sergiler}
                  yilRef={yeniYilRef}
                  yon="yukari"
                  adSiraNo="Yeni kayıt —"
                />
                <button
                  type="submit"
                  disabled={islemde}
                  aria-label="Yeni kaydı ekle"
                  className="text-right text-micro leading-none tracking-[0.1em] text-tas transition-opacity hover:opacity-70 disabled:opacity-40"
                >
                  ↵
                </button>
              </form>

              <div className="flex items-baseline gap-4 pt-3">
                <span className="text-micro tracking-[0.16em] text-ink/30">
                  SATIR İÇİ EKLEME — ENTER İLE KAYDET, ESC İLE VAZGEÇ
                </span>
                {uyari && (
                  <span role="alert" className="text-micro tracking-[0.16em] text-tas">
                    {uyari}
                  </span>
                )}
                {islemde && <span className="text-micro tracking-[0.16em] text-ink/30">KAYDEDİLİYOR…</span>}
              </div>
            </>
          )}
        </div>
      </Panel>

      <EkranNotlari
        notlar={[
          '“Eser seç” alanı arşivden çoklu seçim yapar; sergi ile eser arasında iki yönlü bağ kurulur.',
          'CV çıktısı yıl azalan sırayla, kişisel sergiler önce gruplanır.',
        ]}
      />
    </section>
  )
}
