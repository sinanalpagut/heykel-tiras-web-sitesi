import { useMemo, useRef } from 'react'
import LazyImage from '../common/LazyImage.jsx'
import useGsapReveal from '../../hooks/useGsapReveal.js'
import { SERGI_TURLERI } from '../../data/schema.js'

/**
 * Biyografi bölümü — Atölye ve Sergiler ile aynı dil: arkada kayan dev yazı,
 * dev başlık, mono gövde metni.
 *
 * Bölüm bugüne kadar hiç yoktu; künye "BİYOGRAFİ" vaat edip sayfa hiçbir şey
 * vermiyordu. Metin panelden yönetilir (A6 → kimlik → biyografi) ve paragraflar
 * boş satırla ayrılır. Sergi/şehir sayıları metinden değil veriden gelir —
 * biyografiye elle "11 sergi" yazılsaydı ilk yeni sergide yalan olurdu.
 *
 * @param {object} props
 * @param {object} [props.kimlik]     ayarlar.kimlik (biyografi, dogumYeri, adres, temsil)
 * @param {object[]} [props.sergiler] Canlı özet satırı buradan türer
 */
export default function BiyografiBolumu({ kimlik = {}, sergiler = [] }) {
  const bolumRef = useRef(null)
  useGsapReveal(bolumRef)

  const paragraflar = useMemo(
    () =>
      String(kimlik.biyografi || '')
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean),
    [kimlik.biyografi],
  )

  /* "11 SERGİ · 4 KİŞİSEL · İSTANBUL, BERLİN, …" — hepsi veriden. */
  const ozet = useMemo(() => {
    if (!sergiler.length) return null
    const kisisel = sergiler.filter((s) => s.tur === 'kisisel').length
    const sehirler = [...new Set(sergiler.map((s) => s.sehir).filter(Boolean))]
    return {
      sergi: sergiler.length,
      kisisel,
      sehirler: sehirler.join(', '),
    }
  }, [sergiler])

  /* Metin de görsel de yoksa yarım bir iskelet basmak yerine hiç görünme. */
  if (!paragraflar.length) return null

  return (
    <section
      ref={bolumRef}
      id="biyografi"
      data-screen-label="Biyografi"
      aria-labelledby="biyografi-baslik"
      className="relative z-icerik overflow-hidden px-[30px] py-[150px]"
    >
      <div
        data-creep=""
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-[52px] z-[1] whitespace-nowrap font-display font-extrabold leading-[.85] tracking-[-.02em]"
        style={{ fontSize: 'clamp(90px,13vw,220px)', color: 'rgba(33,26,21,.8)' }}
      >
        BİYOGRAFİ — BİYOGRAFİ — BİYOGRAFİ —
      </div>

      <div className="relative z-[3] mx-auto max-w-icerik">
        {/* Başlık satırı — Atölye'deki kalıbın aynısı */}
        <div className="flex flex-col gap-8 border-b border-ink/[0.16] pb-4 lg:flex-row lg:items-end lg:justify-between lg:gap-[60px]">
          <h2
            id="biyografi-baslik"
            data-rv=""
            className="m-0 font-display font-extrabold leading-[.82] tracking-[-.035em] text-ink"
            style={{ fontSize: 'clamp(40px,9vw,152px)' }}
          >
            BİYOGRAFİ
          </h2>
          <dl
            data-rv=""
            className="m-0 grid grid-cols-2 gap-x-10 gap-y-3 pb-3.5 text-micro tracking-genis lg:text-right"
          >
            {kimlik.dogumYeri ? (
              <>
                <dt className="text-ink/35">DOĞUM</dt>
                <dd className="m-0 text-ink/70">{kimlik.dogumYeri}</dd>
              </>
            ) : null}
            {kimlik.adres?.length ? (
              <>
                <dt className="text-ink/35">ATÖLYE</dt>
                <dd className="m-0 text-ink/70">{kimlik.adres[kimlik.adres.length - 1]}</dd>
              </>
            ) : null}
            {kimlik.temsil?.length ? (
              <>
                <dt className="text-ink/35">TEMSİL</dt>
                <dd className="m-0 text-ink/70">{kimlik.temsil.join(' · ')}</dd>
              </>
            ) : null}
          </dl>
        </div>

        <div className="grid gap-12 pt-14 lg:grid-cols-[minmax(0,56ch)_1fr] lg:gap-20">
          {/* Metin */}
          <div data-rv="" className="text-govde leading-[1.95] tracking-[.04em] text-ink/70">
            {paragraflar.map((par, i) => (
              <p key={i} className={i === 0 ? 'mt-0' : 'mt-6'}>
                {par}
              </p>
            ))}

            {ozet ? (
              <p className="mt-10 text-micro tracking-genis text-ink/35">
                {ozet.sergi} SERGİ · {ozet.kisisel} {SERGI_TURLERI.kisisel} · {ozet.sehirler}
              </p>
            ) : null}
          </div>

          {/* Atölye karesi — sanatçı portresi gelene kadar buradaki yer tutucu */}
          <figure data-rv="" className="m-0 lg:pt-2">
            <div className="outline outline-1 outline-ink/[0.12]">
              <LazyImage
                src="/foto/surec-05.webp"
                alt="Atölyenin içi: duvara dizilmiş çalışmalar, tezgâh ve raflar."
                yerTutucu="ATÖLYE"
                className="aspect-[4/5] w-full"
              />
            </div>
            <figcaption className="flex justify-between pt-3 text-micro tracking-[.24em] text-ink/45">
              <span>ATÖLYE — GÜNEY DUVARI</span>
              <span>KARAKÖY / İST</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
