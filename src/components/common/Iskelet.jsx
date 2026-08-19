/**
 * Yükleme iskeleti — içerik yerine geçen nötr blok.
 * Hareket azaltma tercihinde nabız animasyonu kapanır.
 */
export default function Iskelet({ className = '', yukseklik, adet = 1 }) {
  const stil = yukseklik ? { height: yukseklik } : undefined
  return Array.from({ length: adet }, (_, i) => (
    <div
      key={i}
      style={stil}
      aria-hidden="true"
      className={`border border-ink/10 bg-ink/[0.035] motion-safe:animate-pulse ${className}`}
    />
  ))
}
