/* Tasarımdaki 9px ikincil satırlar: ink rengi %42 opaklıkta.
   Renk jetona bağlı kalsın diye rgba yerine text-ink + opacity kullanılıyor —
   metin dışında içerik olmadığı için sonuç birebir aynı. */
const SOLUK = 'text-micro tracking-cok-genis text-ink opacity-[0.42]'
const DIKEY = 'text-micro tracking-[.34em] text-ink opacity-30'

/**
 * Sayfanın dört köşesine ve iki yanına yerleşen sabit künye şeridi.
 *
 * İçerik akışının üstünde durur ama tıklamayı yutmaz: şerit pointer-events:none,
 * yalnızca metin blokları pointer-events:auto — böylece köşeler arasındaki boşluk
 * çemberin sürükleme alanı olarak kullanılabilir.
 *
 * @param {object} props
 * @param {{ad?:string,altBaslik?:string,dogumYeri?:string,eposta?:string,koordinat?:string}} [props.kimlik]
 *   ayarlar.kimlik — yayındaki site ayarlarından gelir
 * @param {number} [props.eserAdedi] Arşiv sayacı; "ARŞİV 01—NN" buradan türer
 * @param {string} [props.className]
 */
export default function SiteNav({ kimlik, eserAdedi = 0, className = '' }) {
  const ad = kimlik?.ad || ''
  const altBaslik = kimlik?.altBaslik || ''
  const dogumYeri = kimlik?.dogumYeri || ''
  const eposta = kimlik?.eposta || ''
  const koordinat = kimlik?.koordinat || ''

  // Arşiv aralığı veriden türer; hiç eser yokken "01—00" yazmak yanlış olurdu.
  const arsivEtiketi =
    eserAdedi > 0 ? `ARŞİV 01—${String(eserAdedi).padStart(2, '0')}` : 'ARŞİV — BOŞ'

  return (
    <nav
      aria-label="Site künyesi"
      className={`pointer-events-none fixed inset-0 z-nav text-mini uppercase tracking-detay ${className}`}
    >
      {/*
        Mobil künye zemini.
        Şerit sabit olduğu için dar ekranda içerik altından kayıp geçiyor ve
        künye okunmaz hale geliyordu. Zemini blok başına vermek denendi ama iki
        kutu 375px'te tam ortada birleşip kaza gibi duran bir dikiş bırakıyordu;
        bu yüzden tek parça. Renk ve bulanıklık okuma çubuğuyla aynı (%72
        çikolata + 9px blur) — tasarımda zaten var olan dil. md ve üstünde
        tamamen kalkar, künye tasarımdaki gibi doğrudan içeriğin üstünde durur.
      */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[84px] bg-[color-mix(in_srgb,var(--kb-cikolata,#211A15)_72%,transparent)] backdrop-blur-[9px] md:hidden"
      />

      {/* Sol üst — kimlik */}
      <div className="pointer-events-auto absolute left-[30px] top-[26px]">
        <div className="font-display text-[19px] font-extrabold leading-none tracking-[.02em]">
          {ad}
        </div>
        {altBaslik ? <div className={`mt-[7px] ${SOLUK}`}>{altBaslik}</div> : null}
      </div>

      {/* Sağ üst — canlı arşiv sayacı */}
      <div className="pointer-events-auto absolute right-[30px] top-[26px] flex flex-col items-end gap-[7px] text-right">
        <div className="flex items-center gap-[9px]">
          <span
            aria-hidden="true"
            className="h-[5px] w-[5px] bg-tas motion-safe:animate-kb-blink"
          />
          <span>ESERLER</span>
        </div>
        <div className={SOLUK}>{arsivEtiketi}</div>
      </div>

      {/* Sol alt — biyografi. Dar ekranda gizlenir, alt köşeler çakışmasın. */}
      <div className="pointer-events-auto absolute bottom-[26px] left-[30px] hidden flex-col gap-[7px] md:flex">
        <div>BİYOGRAFİ</div>
        {dogumYeri ? <div className={SOLUK}>{dogumYeri}</div> : null}
      </div>

      {/* Sağ alt — iletişim */}
      <div className="pointer-events-auto absolute bottom-[26px] right-[30px] hidden flex-col items-end gap-[7px] text-right md:flex">
        <div>İLETİŞİM</div>
        {eposta ? (
          <div className={SOLUK}>
            <a href={`mailto:${eposta}`}>{eposta}</a>
          </div>
        ) : null}
      </div>

      {/* Sol orta — sürükleme ipucu (dikey) */}
      <div
        className={`pointer-events-auto absolute left-[14px] top-1/2 hidden -translate-y-1/2 rotate-180 md:block ${DIKEY}`}
        style={{ writingMode: 'vertical-rl' }}
      >
        SÜRÜKLE — DÖNDÜR
      </div>

      {/* Sağ orta — atölye koordinatı (dikey) */}
      {koordinat ? (
        <div
          className={`pointer-events-auto absolute right-[14px] top-1/2 hidden -translate-y-1/2 md:block ${DIKEY}`}
          style={{ writingMode: 'vertical-rl' }}
        >
          {koordinat}
        </div>
      ) : null}
    </nav>
  )
}
