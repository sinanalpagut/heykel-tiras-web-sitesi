/**
 * Satır içi hata bildirimi. Yükleme başarısız olduğunda listenin/formun
 * yerine geçer; `yenidenDene` verilirse tekrar deneme düğmesi çıkar.
 */
export default function HataKutusu({ hata, yenidenDene, className = '' }) {
  const mesaj = hata?.message || String(hata || 'Bilinmeyen hata.')
  return (
    <div role="alert" className={`border border-tas/45 bg-tas/[0.07] p-5 ${className}`}>
      <div className="text-micro tracking-genis text-tas">HATA</div>
      <p className="pt-2.5 text-detay leading-relaxed text-ink/70">{mesaj}</p>
      {yenidenDene && (
        <button
          type="button"
          onClick={yenidenDene}
          className="mt-4 border border-ink/25 px-3.5 py-2 text-micro tracking-genis text-ink/60 transition-colors hover:border-ink/60 hover:text-ink"
        >
          TEKRAR DENE
        </button>
      )}
    </div>
  )
}
