/**
 * Sabit 6 sütunlu kılavuz.
 *
 * Tasarımda son sütunun sağ kenarlığı yok (ekran kenarına denk gelirdi),
 * orta çizgi ise diğerlerinden bir tık koyu (.08'e karşı .05) — böylece
 * simetri ekseni gözle seçilebiliyor.
 */
const KENARLIKLAR = [
  '1px solid rgba(234,234,234,.05)',
  '1px solid rgba(234,234,234,.05)',
  '1px solid rgba(234,234,234,.08)',
  '1px solid rgba(234,234,234,.05)',
  '1px solid rgba(234,234,234,.05)',
  'none',
]

/**
 * @param {object} props
 * @param {boolean} [props.kapali] A6 "kılavuz çizgileri" anahtarı kapalıysa true
 */
export default function KilavuzCizgileri({ kapali = false }) {
  if (kapali) return null

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-kilavuz grid grid-cols-6">
      {KENARLIKLAR.map((kenarlik, i) => (
        <div key={i} style={{ borderRight: kenarlik }} />
      ))}
    </div>
  )
}
