/**
 * Tam ekran yükleme perdesi. Yanıp sönen kare + tek satır metin —
 * tasarımdaki nav göstergesiyle aynı dil.
 */
export default function PerdeYukleniyor({ mesaj = 'YÜKLENİYOR' }) {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-beton text-ink"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 text-mini tracking-cok-genis text-ink/50">
        <span className="h-[5px] w-[5px] bg-tas motion-safe:animate-kb-blink" aria-hidden="true" />
        {mesaj}
      </div>
    </div>
  )
}
