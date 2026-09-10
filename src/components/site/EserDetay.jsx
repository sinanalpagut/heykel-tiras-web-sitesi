import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import LazyImage from '../common/LazyImage.jsx'
import { anaGorsel, olcuMetni } from '../../data/schema.js'
import { MALZEME_ETIKETI } from '../../config/tokens.js'
import useReducedMotion from '../../hooks/useReducedMotion.js'

/**
 * Eser detay katmanı — çemberdeki bir esere tıklandığında açılan çerçeve.
 *
 * Yüzen bir kart değil, AÇILAN BİR ÇERÇEVE: yuvarlak köşe, gölge ve buzlu cam
 * yok; ekranın ~%90'ını kaplayan 1px ink çerçeveli çikolata bir yüzey var.
 * Arkadaki çember karartılıp bulanıklaştırılır ama durur — ziyaretçi nereden
 * geldiğini görmeye devam etsin diye.
 *
 * @param {object} props
 * @param {object|null} props.eser
 * @param {object[]} props.eserler   Çemberdeki tüm eserler — önceki/sonraki buradan
 * @param {object[]} props.sergiler  Tüm sergiler — bu eserin yer aldıkları süzülür
 * @param {() => void} props.onKapat
 * @param {(eser: object, indeks: number) => void} props.onEserDegistir
 */

/* Odak tuzağının tarayacağı öğeler — GorselKirpmaModali ile aynı sözleşme. */
const ODAK_SECICI =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

const BASLIK_ID = 'eser-detay-baslik'

/** Üst çubuktaki ve şeritteki düğmelerin ortak görünümü — kare, çerçeveli, dolgusuz. */
const DUGME =
  'grid h-9 w-9 place-items-center border border-ink/[0.18] text-ink/70 transition-colors duration-200 ease-cikis hover:border-ink/45 hover:text-ink focus-visible:border-ink focus-visible:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-ink/[0.18] disabled:hover:text-ink/70'

const iki = (n) => String(n).padStart(2, '0')

export default function EserDetay({ eser, eserler, sergiler, onKapat, onEserDegistir }) {
  const hareketAzalt = useReducedMotion()
  const cerceveRef = useRef(null)
  const acik = Boolean(eser)

  const liste = useMemo(() => eserler || [], [eserler])
  const gorseller = useMemo(() => eser?.gorseller || [], [eser])

  /*
   * Çemberde tıklanan kart eserin ANA görselini gösteriyor. Katman "ilk kare"
   * ile açılsaydı, ana görseli ikinci sıradaki eserlerde fotoğraf tıklamanın
   * hemen ardından değişmiş gibi görünürdü — ziyaretçi baktığı şeyi kaybeder.
   * Bu yüzden açılış karesi ana görseldir; ana görsel tanımlı değilse zaten
   * dizinin ilk karesine düşer.
   */
  const baslangicIndeks = useMemo(() => {
    if (!eser) return 0
    const ana = anaGorsel(eser)
    const i = ana ? gorseller.findIndex((g) => g.id === ana.id) : -1
    return i < 0 ? 0 : i
  }, [eser, gorseller])

  const eserId = eser?.id ?? null
  const [gorselIndeks, setGorselIndeks] = useState(baslangicIndeks)
  const [girdi, setGirdi] = useState(false)
  const [oncekiEserId, setOncekiEserId] = useState(eserId)

  /*
   * Eser değişince durumu render sırasında sıfırlıyoruz, efektte değil: efekt
   * boyanmadan SONRA çalıştığı için bir kare boyunca yeni eserin künyesi eski
   * eserin fotoğrafıyla yan yana görünürdü. React'in "prop değişince durumu
   * ayarla" kalıbı bunu ekrana hiç düşmeden halleder.
   * Kapanışta (eserId null) giriş geçişi de kurulur ki katman ikinci kez
   * açıldığında yine yumuşak gelsin.
   */
  if (oncekiEserId !== eserId) {
    setOncekiEserId(eserId)
    setGorselIndeks(baslangicIndeks)
    if (eserId === null) setGirdi(false)
  }

  /* Görsel silinince (panel açıkken düzenleme) indeks dizinin dışında kalabilir. */
  const seciliIndeks = Math.min(gorselIndeks, Math.max(0, gorseller.length - 1))
  const seciliGorsel = gorseller[seciliIndeks] || null

  /* ---- gezinme ---- */

  const indeks = useMemo(
    () => (eser ? liste.findIndex((e) => e.id === eser.id) : -1),
    [liste, eser],
  )
  /* Eser çember listesinde yoksa (doğrudan bağlantı, arşiv kaydı) ok tuşları
     kapatılır — "3 / 12" gibi yanlış bir konum yazmaktansa hiç yazmamak doğru. */
  const gezinilebilir = indeks >= 0 && liste.length > 1

  const git = useCallback(
    (yon) => {
      if (!gezinilebilir) return
      const yeni = (indeks + yon + liste.length) % liste.length
      onEserDegistir?.(liste[yeni], yeni)
    },
    [gezinilebilir, indeks, liste, onEserDegistir],
  )

  /* ---- katman kabuğu: kaydırma kilidi, açılış odağı, giriş geçişi ---- */

  useEffect(() => {
    if (!acik) return
    /* Önceki değer saklanıyor: sayfa 'hidden' dışında bir değerle gelmiş
       olabilir, kapanışta sabit 'auto' yazmak onu ezerdi. */
    const oncekiTasma = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = oncekiTasma
    }
  }, [acik])

  /*
   * Açılışta odak çerçeveye; kapanışta odağı çağırana geri vermek HomePage'in işi.
   *
   * requestAnimationFrame ARACISIZ yapılıyor: effect zaten boyamadan sonra
   * çalışır, ref doludur. rAF'a sarmak arka plan sekmesinde ya da kare üretimi
   * kısıldığında odağın hiç gitmemesine yol açıyordu — o durumda Esc de
   * çalışmaz, çünkü tuş olayı katmana ulaşmaz.
   */
  useEffect(() => {
    if (!acik) return undefined
    cerceveRef.current?.focus()
    return undefined
  }, [acik])

  /* Ok tuşuyla sonraki esere geçen ziyaretçi çerçevenin başına döner: kaydırma
     konumu korunsaydı yeni eserin fotoğrafı ekranın dışında kalırdı. */
  useEffect(() => {
    if (!eserId) return
    cerceveRef.current?.scrollTo({ top: 0 })
  }, [eserId])

  /* Giriş geçişi: bir kare sonra açılan opaklık/kayma. Hareket azaltılmışsa
     hiç beklenmez — katman ilk karede tam görünür gelir. */
  useEffect(() => {
    if (!acik || hareketAzalt) return
    const kare = requestAnimationFrame(() => setGirdi(true))
    return () => cancelAnimationFrame(kare)
  }, [acik, hareketAzalt])

  const gorunur = girdi || hareketAzalt

  const tus = (olay) => {
    if (olay.key === 'Escape') {
      olay.stopPropagation()
      onKapat?.()
      return
    }
    /*
     * Ok tuşları HER ZAMAN eserler arasında gezinir — odak küçük resim
     * şeridindeyken bile. İki farklı anlam (kimi yerde görsel, kimi yerde
     * eser) ziyaretçiye hangisinin olacağını tahmin ettirirdi; görsel
     * değiştirmek tıklama ve Tab ile yapılır.
     */
    if (olay.key === 'ArrowLeft') {
      olay.preventDefault()
      git(-1)
      return
    }
    if (olay.key === 'ArrowRight') {
      olay.preventDefault()
      git(1)
      return
    }
    if (olay.key !== 'Tab') return

    const kap = cerceveRef.current
    if (!kap) return
    const ogeler = Array.from(kap.querySelectorAll(ODAK_SECICI)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    )
    if (!ogeler.length) return
    const ilk = ogeler[0]
    const son = ogeler[ogeler.length - 1]
    if (olay.shiftKey && document.activeElement === ilk) {
      olay.preventDefault()
      son.focus()
    } else if (!olay.shiftKey && document.activeElement === son) {
      olay.preventDefault()
      ilk.focus()
    }
  }

  /* ---- künye verisi ---- */

  /* Değeri olmayan satır hiç basılmaz: boş bir "KOLEKSİYON —" satırı bilgi
     değil, eksik kayıt duygusu verir. */
  const kunyeSatirlari = useMemo(() => {
    if (!eser) return []
    const olcu = olcuMetni(eser.olculer)
    return [
      { etiket: 'MALZEME', deger: eser.malzeme },
      { etiket: 'YIL', deger: eser.yil ? String(eser.yil) : '' },
      { etiket: 'ÖLÇÜ', deger: olcu ? `${olcu} CM` : '' },
      { etiket: 'KOLEKSİYON', deger: eser.koleksiyon },
    ].filter((s) => s.deger)
  }, [eser])

  /* Bu eserin geçtiği sergiler, yıl azalan. Sergi listesi küçük; her açılışta
     süzmek yerine eser/sergi değişimine bağlanıyor. */
  const eserSergileri = useMemo(() => {
    if (!eser) return []
    return (sergiler || [])
      .filter((s) => (s.eserIdleri || []).includes(eser.id))
      .slice()
      .sort((a, b) => (b.yil || 0) - (a.yil || 0))
  }, [eser, sergiler])

  if (!eser) return null

  const etiketler = eser.etiketler || []
  const malzemeEtiketi = MALZEME_ETIKETI[eser.malzemeSinifi] || MALZEME_ETIKETI.tas
  /* Tailwind v3 currentColor'a alfa uygulayamaz (border-current/30 hiç CSS
     üretmez), o yüzden rozetin metni ve çerçevesi ayrı ayrı yazılıyor. */
  const vurguSinifi =
    eser.malzemeSinifi === 'metal' ? 'text-metal border-metal/40' : 'text-tas border-tas/40'

  return (
    <div className="fixed inset-0 z-katman" onKeyDown={tus}>
      {/* Arka perde — çember görünür kalır, okunmaz olur. Tıklayınca kapanır. */}
      <div
        aria-hidden="true"
        onClick={() => onKapat?.()}
        className={`absolute inset-0 bg-black/70 backdrop-blur-[6px] motion-safe:transition-opacity motion-safe:duration-300 motion-safe:ease-cikis ${
          gorunur ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        ref={cerceveRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={BASLIK_ID}
        tabIndex={-1}
        className={`absolute inset-0 overflow-y-auto overscroll-contain bg-cikolata outline outline-1 -outline-offset-1 outline-ink/[0.18] md:inset-[5vh_5vw] motion-safe:transition-[opacity,transform] motion-safe:duration-300 motion-safe:ease-cikis ${
          gorunur ? 'opacity-100 translate-y-0' : 'opacity-0 motion-safe:translate-y-2'
        }`}
      >
        {/* ---- üst çubuk: kapatma her kaydırma konumunda erişilebilir kalsın ---- */}
        {/*
          Dar ekranda başlık kendi satırına iner. Tek satıra sığdırmak onu
          kesiyordu ("GÖVDE Ç…") — oysa detay ekranında eserin adı en önemli
          metin. İki ayrı başlık basmak yerine tek h2 sarılıyor: yinelenen id
          ve aria-labelledby'nin gizli bir öğeyi işaret etmesi böylece olmuyor.
          md ve üstünde sayaç · başlık · düğmeler yine tek satırda.
        */}
        <div className="sticky top-0 z-10 border-b border-ink/[0.12] bg-cikolata px-4 py-3 md:px-6 md:py-4">
          <div
            aria-live="polite"
            className="flex flex-wrap items-center gap-x-4 gap-y-2"
          >
            {indeks >= 0 && (
              <span className="shrink-0 text-mini tracking-genis text-ink/45">
                {iki(indeks + 1)} / {iki(liste.length)}
              </span>
            )}

            <div className="ml-auto flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => git(-1)}
                disabled={!gezinilebilir}
                aria-label="Önceki eser"
                className={DUGME}
              >
                <span aria-hidden="true" className="text-[15px] leading-none">
                  ‹
                </span>
              </button>
              <button
                type="button"
                onClick={() => git(1)}
                disabled={!gezinilebilir}
                aria-label="Sonraki eser"
                className={DUGME}
              >
                <span aria-hidden="true" className="text-[15px] leading-none">
                  ›
                </span>
              </button>
              <button
                type="button"
                onClick={() => onKapat?.()}
                aria-label="Kapat"
                className={`${DUGME} ml-1`}
              >
                <span aria-hidden="true" className="text-[13px] leading-none">
                  ✕
                </span>
              </button>
            </div>

            <h2
              id={BASLIK_ID}
              className="order-last m-0 w-full min-w-0 font-display text-[19px] font-extrabold tracking-sikisik text-ink md:order-none md:w-auto md:flex-1 md:truncate md:text-[clamp(15px,2.4vw,24px)]"
            >
              {eser.baslik}
            </h2>
          </div>
        </div>

        {/* ---- gövde ---- */}
        <div className="grid gap-8 p-6 lg:grid-cols-[1fr_360px] lg:p-8">
          {/* SOL — görseller */}
          <div className="min-w-0">
            {/*
             * Kutu 3:4 ve en fazla 70vh: heykel fotoğrafı dik, yükseklik kıymetli.
             * Genişlik sınırı yüksekliğin karşılığı (70vh × 3/4), böylece kutu
             * hiçbir ekranda çerçeveden taşmaz.
             * object-contain: çemberdeki kart kırpabilir ama detayda ziyaretçi
             * eserin TAMAMINI görmeye geldi — üstünü kesmek burada kabul edilemez.
             */}
            <LazyImage
              gorselId={seciliGorsel?.id || null}
              alt={seciliGorsel?.alt || eser.baslik}
              yerTutucu={eser.baslik}
              oncelik
              className="mx-auto aspect-[3/4] max-h-[70vh] w-full max-w-[52.5vh] outline outline-1 -outline-offset-1 outline-ink/[0.12]"
              gorselSinifi="h-full w-full object-contain"
            />

            {/* Şerit yalnızca gerçekten seçenek varken basılır; tek görselde
                boş bir şerit "eksik kayıt" hissi verirdi. */}
            {gorseller.length > 1 && (
              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {gorseller.map((g, i) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGorselIndeks(i)}
                    aria-label={`${i + 1}. görsel`}
                    aria-pressed={i === seciliIndeks}
                    className={`block w-16 shrink-0 outline outline-1 -outline-offset-1 transition-[outline-color] duration-200 ease-cikis ${
                      i === seciliIndeks
                        ? 'outline-ink'
                        : 'outline-ink/20 hover:outline-ink/50 focus-visible:outline-ink/50'
                    }`}
                  >
                    <LazyImage
                      gorselId={g.id}
                      alt=""
                      className="aspect-[3/4] w-full"
                      gorselSinifi="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {gorseller.length > 0 && (
              <p className="m-0 pt-3 text-micro tracking-genis text-ink/40">
                GÖRSEL {seciliIndeks + 1} / {gorseller.length}
              </p>
            )}
          </div>

          {/* SAĞ — künye */}
          <div className="min-w-0">
            <span
              className={`inline-block border px-2 py-1 text-micro tracking-cok-genis ${vurguSinifi}`}
            >
              {malzemeEtiketi}
            </span>

            {kunyeSatirlari.length > 0 && (
              <dl className="m-0 pt-5">
                {kunyeSatirlari.map((s, i) => (
                  <div
                    key={s.etiket}
                    className={`grid grid-cols-[88px_1fr] items-baseline gap-x-4 py-2.5 ${
                      i > 0 ? 'border-t border-ink/[0.12]' : ''
                    }`}
                  >
                    <dt className="text-micro tracking-genis text-ink/40">{s.etiket}</dt>
                    <dd className="m-0 min-w-0 break-words text-detay tracking-genis text-ink/85">
                      {s.deger}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {etiketler.length > 0 && (
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0 pt-5">
                {etiketler.map((e) => (
                  <li
                    key={e}
                    className="border border-ink/25 px-2 py-1 text-micro tracking-genis text-ink/60"
                  >
                    {e}
                  </li>
                ))}
              </ul>
            )}

            {eser.not && (
              <div className="pt-7">
                <p className="m-0 text-micro tracking-cok-genis text-ink/40">NOT</p>
                <p className="m-0 max-w-[52ch] pt-3 text-govde leading-[1.9] text-ink/65">
                  {eser.not}
                </p>
              </div>
            )}

            {/* Sergi yoksa bölüm hiç basılmaz — "(0)" yazan bir başlık
                bilgi değil, boşluk duyurusu olurdu. */}
            {eserSergileri.length > 0 && (
              <div className="pt-7">
                <p className="m-0 text-micro tracking-cok-genis text-ink/40">
                  YER ALDIĞI SERGİLER ({eserSergileri.length})
                </p>
                <ul className="m-0 list-none p-0 pt-2">
                  {eserSergileri.map((s) => {
                    const yer = [s.mekan, s.sehir].filter(Boolean).join(', ')
                    return (
                      <li
                        key={s.id}
                        className="grid grid-cols-[48px_1fr] gap-x-3 border-t border-ink/[0.12] py-2.5"
                      >
                        <span className="text-micro tracking-genis text-ink/40">
                          {s.yil || '—'}
                        </span>
                        <span className="min-w-0">
                          <span className="block break-words text-detay tracking-genis text-ink/85">
                            {s.ad}
                          </span>
                          {yer && (
                            <span className="block break-words pt-1 text-micro tracking-genis text-ink/45">
                              {yer}
                            </span>
                          )}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
