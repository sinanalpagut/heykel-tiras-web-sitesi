import { metaMetni } from '../../data/schema.js'
import { MALZEME_ETIKETI } from '../../config/tokens.js'

/* Bkz. SculptureCard: var() renklerine Tailwind alfa uygulayamadığı için color-mix. */
const inkAlfa = (yuzde) => `color-mix(in srgb, var(--kb-ink, #EAEAEA) ${yuzde}%, transparent)`

/**
 * Çemberin altındaki okuma çubuğu — o an öne gelen eseri yazar.
 *
 * Ön eser fare/klavye olmadan da (otomatik dönüşle) değiştiği için satır
 * aria-live ile duyurulur; ekran okuyucu kullanıcısı çemberi görmese de
 * hangi eserin önde olduğunu bilir.
 *
 * @param {object} props
 * @param {object|null} props.eser
 * @param {number} props.indeks   0 tabanlı
 * @param {number} props.adet
 */
export default function GalleryReadout({ eser, indeks, adet }) {
  if (!eser) return null

  const sira = String(indeks + 1).padStart(2, '0')
  const toplam = String(adet).padStart(2, '0')
  const meta = metaMetni(eser)

  return (
    <div
      data-readout=""
      aria-live="polite"
      aria-atomic="true"
      /*
       * Tasarımdaki tek satırlık çubuk 375px'te 539px yer kaplıyor ve iki
       * yandan kesiliyordu. Geniş ekranda davranış aynı (tek satır, nowrap);
       * dar ekranda sarma açılır, görüntü alanı genişliğine sabitlenir ve
       * boşluklar daralır.
       */
      className="absolute bottom-16 left-1/2 z-okuma flex max-w-[calc(100vw-24px)] -translate-x-1/2 flex-wrap items-center justify-center gap-x-3 gap-y-1 px-3.5 py-2.5 backdrop-blur-[9px] sm:max-w-none sm:flex-nowrap sm:gap-[18px] sm:whitespace-nowrap sm:px-5 sm:py-[11px]"
      style={{
        background: 'color-mix(in srgb, var(--kb-cikolata, #211A15) 60%, transparent)',
        outline: `1px solid ${inkAlfa(12)}`,
      }}
    >
      {/* Kare yalnızca renk taşır; aynı bilgi ekran okuyucuya metin olarak da verilir */}
      <span
        data-ro-dot=""
        aria-hidden="true"
        className={`h-[6px] w-[6px] ${eser.malzemeSinifi === 'metal' ? 'bg-metal' : 'bg-tas'}`}
      />
      <span className="sr-only">{MALZEME_ETIKETI[eser.malzemeSinifi] || ''}</span>
      <span data-ro-idx="" className="text-mini tracking-genis text-ink opacity-50">
        {sira} / {toplam}
      </span>
      <span
        data-ro-title=""
        className="font-display text-[14px] font-bold tracking-[.06em] text-ink"
      >
        {eser.baslik}
      </span>
      {meta && (
        <span
          data-ro-meta=""
          className="w-full text-center text-micro tracking-[.12em] text-ink opacity-[.42] sm:w-auto sm:text-left sm:tracking-[.22em]"
        >
          {meta}
        </span>
      )}
    </div>
  )
}
