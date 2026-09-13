import { useMemo, useRef } from 'react'
import LazyImage from '../common/LazyImage.jsx'
import useGsapReveal from '../../hooks/useGsapReveal.js'

/**
 * Bölümün sabit metinleri. Prop ile kısmen ezilebilir — ileride yönetimden
 * düzenlenmeleri gerekirse tek yerden beslenirler.
 */
const ATOLYE_METINLERI = {
  surunen: 'SÜREÇ — SÜREÇ — SÜREÇ —',
  baslik: 'ATÖLYE',
  giris:
    'Kayıtlar Karaköy’deki döküm atölyesinde, 2019’dan bu yana tutuluyor. Malzeme direnir; direnç kaydedilir. Aşağıdaki kareler tamamlanmış işler değil, terk edilme anlarıdır.',
  mottoUst: 'MALZEME',
  mottoAlt: 'DİRENİR',
  mottoGovde:
    'Bir taşı kesmek onu ikna etmek değildir. Yontma, iki iradenin çarpışmasıdır ve yüzeyde kalan iz her zaman kavganın kaydıdır — benim değil, malzemenin son sözü.',
}

/*
 * Renk jetonları tailwind.config.js'te `var(--kb-ink, #EAEAEA)` gibi CSS
 * değişkenlerine bağlı. Tailwind bu biçimdeki bir rengi ayrıştıramadığı için
 * `text-ink/45` benzeri opaklık kısayolları SESSİZCE hiç kural üretmiyor —
 * sınıf HTML'de duruyor, CSS'te karşılığı yok. Doğru opaklığı color-mix ile
 * veriyoruz; jeton çalışma zamanında A6'dan değiştiğinde renk yine güncellenir.
 * (Kalıcı çözüm config'te renkleri opacityValue alan fonksiyonlara çevirmek.)
 */
const jetonAlfa = (degisken, yedek, yuzde) =>
  `color-mix(in srgb, var(${degisken}, ${yedek}) ${yuzde}%, transparent)`
const ink = (yuzde) => jetonAlfa('--kb-ink', '#EAEAEA', yuzde)
const cikolata = (yuzde) => jetonAlfa('--kb-cikolata', '#211A15', yuzde)

/*
 * Tasarımdaki 12 sütunluk düzensiz ızgara. Beşten fazla kare gelirse dizi
 * baştan tekrar eder (modulo), böylece yönetimden kare eklenince yerleşim
 * bozulmaz. Sütun ve üst boşluk sınıfları yalnızca lg üstünde uygulanır;
 * altında kareler doğal akışa döner, üst üste binme olmaz.
 */
const YERLESIM = [
  { sutun: 'lg:col-start-1 lg:col-span-5', ust: '', yukseklik: 'h-[560px]' },
  { sutun: 'lg:col-start-7 lg:col-span-4', ust: 'lg:pt-24', yukseklik: 'h-[370px]' },
  { sutun: 'lg:col-start-11 lg:col-span-2', ust: 'lg:pt-[250px]', yukseklik: 'h-[210px]' },
  { sutun: 'lg:col-start-3 lg:col-span-3', ust: 'lg:pt-10', yukseklik: 'h-[300px]' },
  { sutun: 'lg:col-start-7 lg:col-span-6', ust: 'lg:pt-2', yukseklik: 'h-[430px]' },
]

/** sagBilgi'nin rengi malzeme sınıfından gelir; sınıf yoksa satırın rengi miras alınır. */
function vurguSinifi(sagVurgu) {
  if (sagVurgu === 'metal') return 'text-metal'
  if (sagVurgu === 'tas') return 'text-tas'
  return ''
}

/**
 * Atölye — Süreç bölümü.
 *
 * @param {object} props
 * @param {import('../../data/schema.js').SurecKaresi[]} [props.kareler]
 * @param {Partial<typeof ATOLYE_METINLERI>} [props.metinler]
 */
export default function AtolyeBolumu({ kareler = [], metinler }) {
  const bolumRef = useRef(null)
  useGsapReveal(bolumRef)

  const m = { ...ATOLYE_METINLERI, ...metinler }

  /* Yönetimdeki sıra alanı belirleyicidir; dizinin geliş sırasına güvenme. */
  const sirali = useMemo(
    () => [...kareler].sort((a, b) => (a.sira ?? 0) - (b.sira ?? 0)),
    [kareler],
  )

  return (
    <section
      ref={bolumRef}
      aria-labelledby="atolye-baslik"
      id="atolye"
      data-screen-label="Atölye — Süreç"
      className="relative z-icerik overflow-hidden px-[30px] pb-[190px] pt-[170px]"
    >
      {/* Zeminde kayan dev yazı — okunacak bir içerik değil, doku */}
      <div
        data-creep
        aria-hidden="true"
        style={{ color: cikolata(80) }}
        className="pointer-events-none absolute left-0 top-[52px] z-[1] whitespace-nowrap font-display text-[clamp(90px,13vw,220px)] font-extrabold leading-[.85] tracking-[-.02em]"
      >
        {m.surunen}
      </div>

      <div className="relative z-[3] mx-auto max-w-icerik">
        <div
          style={{ borderBottomColor: ink(16) }}
          className="flex flex-col items-start gap-8 border-b pb-4 lg:flex-row lg:items-end lg:justify-between lg:gap-[60px]"
        >
          <h2
            id="atolye-baslik"
            data-rv
            className="m-0 font-display text-[clamp(40px,9vw,152px)] font-extrabold leading-[.82] tracking-[-.035em] text-ink"
          >
            {m.baslik}
          </h2>
          <p
            data-rv
            style={{ color: ink(62) }}
            className="m-0 max-w-[390px] pb-3.5 text-govde tracking-[.04em] [text-wrap:pretty]"
          >
            {m.giris}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-[22px] pt-14 sm:grid-cols-2 lg:grid-cols-12">
          {sirali.map((kare, i) => {
            const yer = YERLESIM[i % YERLESIM.length]
            return (
              <div key={kare.id} data-rv className={`${yer.sutun} ${yer.ust}`}>
                {/* Çerçeve sarmalayıcıda: LazyImage style propu almıyor */}
                <div
                  style={{ outline: `1px solid ${ink(12)}` }}
                  className={`relative w-full ${yer.yukseklik}`}
                >
                  <LazyImage
                    gorselId={kare.gorsel?.id ?? null}
                    alt={kare.gorsel?.alt || `${kare.kod} — ${kare.baslik}`}
                    yerTutucu={kare.baslik}
                    className="h-full w-full"
                  />
                </div>
                <div
                  style={{ color: ink(45) }}
                  className="flex items-baseline justify-between gap-4 pt-3 text-micro tracking-detay"
                >
                  <h3 className="m-0 text-micro font-normal tracking-detay">
                    {kare.kod} — {kare.baslik}
                  </h3>
                  {kare.sagBilgi ? (
                    <span className={vurguSinifi(kare.sagVurgu)}>{kare.sagBilgi}</span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>

        <div data-rv className="flex flex-col items-start gap-10 pt-[130px] md:flex-row">
          <p className="m-0 flex-none font-display text-[clamp(46px,6.4vw,104px)] font-extrabold leading-[.86] tracking-[-.03em] text-ink">
            {m.mottoUst}
            <br />
            <span className="text-tas">{m.mottoAlt}</span>
          </p>
          <p
            style={{ color: ink(58) }}
            className="m-0 max-w-[420px] flex-1 pt-3 text-govde leading-[1.9] tracking-[.04em] [text-wrap:pretty]"
          >
            {m.mottoGovde}
          </p>
        </div>
      </div>
    </section>
  )
}
