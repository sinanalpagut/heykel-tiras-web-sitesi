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
      className="absolute bottom-16 left-1/2 z-okuma flex -translate-x-1/2 items-center gap-[18px] whitespace-nowrap px-5 py-[11px] backdrop-blur-[9px]"
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
        <span data-ro-meta="" className="text-micro tracking-[.22em] text-ink opacity-[.42]">
          {meta}
        </span>
      )}
    </div>
  )
}
