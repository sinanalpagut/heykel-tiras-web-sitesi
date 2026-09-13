/* Tasarımdaki 9px ikincil satırlar: ink rengi %42 opaklıkta.
   Renk jetona bağlı kalsın diye rgba yerine text-ink + opacity kullanılıyor —
   metin dışında içerik olmadığı için sonuç birebir aynı. */
const SOLUK = 'text-micro tracking-cok-genis text-ink opacity-[0.42]'
const DIKEY = 'text-micro tracking-[.34em] text-ink opacity-30'

/*
 * Köşe etiketleri artık gerçek çapa bağlantısı. Global `a` kuralı alt çizgi
 * çizer; künyede o çizgi tasarımda yoktu, bu yüzden burada kapatılıyor.
 * Hover'da taş rengine dönme davranışı global kuraldan geliyor ve kalıyor —
 * etiketlerin tıklanabilir olduğunu o söylüyor.
 */
const CAPA = 'border-b-0'

/**
 * Sayfanın dört köşesine ve iki yanına yerleşen sabit künye şeridi.
 *
 * İçerik akışının üstünde durur ama tıklamayı yutmaz: şerit pointer-events:none,
 * yalnızca metin blokları pointer-events:auto — böylece köşeler arasındaki boşluk
 * çemberin sürükleme alanı olarak kullanılabilir.
 *
 * Görünürlük dışarıdan yönetilir (useKunyeGorunurlugu): aşağı kaydırırken künye
 * kaybolur, yukarı ilk harekette geri gelir. Gizliyken `invisible` şart —
 * pointer-events-auto çocuklar, ebeveyn none olsa bile tıklama almaya devam
 * ederdi; visibility hepsini tek hamlede kapatıyor.
 *
 * @param {object} props
 * @param {{ad?:string,altBaslik?:string,eposta?:string,koordinat?:string}} [props.kimlik]
 * @param {number} [props.eserAdedi] Arşiv sayacı; "ARŞİV 01—NN" buradan türer
 * @param {boolean} [props.gorunur]
 * @param {string} [props.className]
 */
export default function SiteNav({ kimlik, eserAdedi = 0, gorunur = true, className = '' }) {
  const ad = kimlik?.ad || ''
  const altBaslik = kimlik?.altBaslik || ''
  const eposta = kimlik?.eposta || ''
  const koordinat = kimlik?.koordinat || ''

  // Arşiv aralığı veriden türer; hiç eser yokken "01—00" yazmak yanlış olurdu.
  const arsivEtiketi =
    eserAdedi > 0 ? `ARŞİV 01—${String(eserAdedi).padStart(2, '0')}` : 'ARŞİV — BOŞ'

  return (
    <nav
      aria-label="Site künyesi"
      /* Duyuru şeridi varsa künye onun altından başlar; yoksa değişken 0px. */
      style={{ top: 'var(--kb-duyuru-h, 0px)' }}
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-nav text-mini uppercase tracking-detay motion-safe:transition-[opacity,transform] motion-safe:duration-300 motion-safe:ease-cikis ${
        gorunur ? 'opacity-100' : 'invisible -translate-y-2 opacity-0'
      } ${className}`}
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
        className="absolute inset-x-0 top-0 h-[116px] bg-[color-mix(in_srgb,var(--kb-cikolata,#211A15)_72%,transparent)] backdrop-blur-[9px] md:hidden"
      />

      {/* Sol üst — kimlik; tıklanınca çemberin başına döner */}
      <div className="pointer-events-auto absolute left-[30px] top-[26px]">
        <a href="#eserler" className={`${CAPA} block`} aria-label="Başa dön — eserler">
          <span className="font-display text-[19px] font-extrabold leading-none tracking-[.02em]">
            {ad}
          </span>
        </a>
        {altBaslik ? <div className={`mt-[7px] ${SOLUK}`}>{altBaslik}</div> : null}
      </div>

      {/* Sağ üst — eserler + canlı arşiv sayacı */}
      <div className="pointer-events-auto absolute right-[30px] top-[26px] flex flex-col items-end gap-[7px] text-right">
        <a href="#eserler" className={`${CAPA} flex items-center gap-[9px]`}>
          <span
            aria-hidden="true"
            className="h-[5px] w-[5px] bg-tas motion-safe:animate-kb-blink"
          />
          <span>ESERLER</span>
        </a>
        <div className={SOLUK}>{arsivEtiketi}</div>
      </div>

      {/*
        Dar ekran gezinme satırı.
        Alt köşe blokları <768px'te gizli (dar ekranda üst üste biniyorlardı),
        dolayısıyla SERGİLER / BİYOGRAFİ / İLETİŞİM telefonda ERİŞİLEMEZ
        kalıyordu — duyuru şeridi kapatılınca sergilere ulaşacak yol hiç
        kalmıyordu. Üstteki künye zemininin altına kompakt bir satır olarak
        eklendi; ESERLER burada tekrarlanmıyor, çünkü hem logo hem sağ üstteki
        etiket zaten oraya gidiyor.
      */}
      <div className="pointer-events-auto absolute left-[30px] top-[76px] flex gap-4 md:hidden">
        <a href="#sergiler" className={CAPA}>
          SERGİLER
        </a>
        <a href="#biyografi" className={CAPA}>
          BİYOGRAFİ
        </a>
        <a href="#iletisim" className={CAPA}>
          İLETİŞİM
        </a>
      </div>

      {/*
        Sol alt — biyografi + sergiler. Doğum bilgisi buradan biyografi
        bölümünün kendisine taşındı; ikinci satır böylece sergilere açılan
        bağlantıya dönüştü (duyuru şeridi kapatılınca sergilere ulaşacak tek
        kalıcı yol bu).
      */}
      <div className="pointer-events-auto absolute bottom-[26px] left-[30px] hidden flex-col gap-[7px] md:flex">
        <a href="#biyografi" className={CAPA}>
          BİYOGRAFİ
        </a>
        <a href="#sergiler" className={`${CAPA} ${SOLUK} hover:opacity-100`}>
          SERGİLER
        </a>
      </div>

      {/* Sağ alt — iletişim */}
      <div className="pointer-events-auto absolute bottom-[26px] right-[30px] hidden flex-col items-end gap-[7px] text-right md:flex">
        <a href="#iletisim" className={CAPA}>
          İLETİŞİM
        </a>
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
