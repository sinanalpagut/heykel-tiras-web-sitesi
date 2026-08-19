import { Fragment, useState } from 'react'
import SculptureCard from './SculptureCard.jsx'
import GalleryReadout from './GalleryReadout.jsx'
import useRingController from '../../hooks/useRingController.js'
import { CEMBER, pozisyonAcisi } from '../../config/tokens.js'

/* Bkz. SculptureCard: var() renklerine Tailwind alfa uygulayamadığı için color-mix. */
const inkAlfa = (yuzde) => `color-mix(in srgb, var(--kb-ink, #EAEAEA) ${yuzde}%, transparent)`

/**
 * Ana sayfanın açılış bölümü: dev isim, 3D eser çemberi ve okuma çubuğu.
 *
 * @param {object} props
 * @param {object[]} props.eserler   Çemberde gösterilecek eserler, yayın sırasında
 * @param {object} [props.ayarlar]   Yayındaki site ayarları
 * @param {(eser:object, indeks:number)=>void} [props.onEserSecildi]
 */
export default function SculptureGallery({ eserler = [], ayarlar, onEserSecildi }) {
  const adet = eserler.length
  const adim = pozisyonAcisi(adet)

  const cemberAyari = ayarlar?.cember || {}
  const otomatikDonus = cemberAyari.otomatikDonus !== false
  const hiz = cemberAyari.donusHizi ?? CEMBER.otomatikHiz

  /*
   * Yarıçap ayardan gelir, ama kart genişliği (250px) sabit olduğu için çok sayıda
   * eserde çemberin çevresi kartları almaz ve kartlar birbirinin içine girer.
   * Gereken en küçük yarıçap adet*kartGenislik/(2π); %15 pay kartlar arasında
   * boşluk bırakır. Küçük ekranlarda çemberi biz küçültmüyoruz — [data-ring-fit]
   * üzerindeki ölçek (en fazla 1, en az 0.30) tüm sahneyi orantılı sığdırıyor,
   * dolayısıyla geometri her ekranda aynı kalır.
   */
  const tabanYaricap = cemberAyari.yaricap ?? CEMBER.yaricap
  const enAzYaricap = ((adet * CEMBER.kartGenislik) / (2 * Math.PI)) * 1.15
  const yaricap = Math.max(tabanYaricap, enAzYaricap)

  const [onEser, setOnEser] = useState(0)
  const onIndeks = adet ? Math.min(onEser, adet - 1) : 0

  const { bolgeRef, halkaRef, sigdirRef, kartRefleri } = useRingController({
    adet,
    otomatikDonus,
    hiz,
    kapali: adet === 0,
    onOnEserDegisti: setOnEser,
  })

  /* Dev isim tasarımda iki satır: "KESE" / "BENAV" — boşluktan bölünür. */
  const adSatirlari = String(ayarlar?.kimlik?.ad || 'KESE BENAV')
    .trim()
    .split(/\s+/)

  return (
    <section
      data-screen-label="Hero — Çember"
      className="relative z-icerik flex h-screen min-h-[560px] items-center justify-center overflow-hidden"
    >
      <h1
        data-bigname=""
        className="pointer-events-none absolute left-1/2 top-1/2 z-[4] -translate-x-1/2 -translate-y-[52%] whitespace-nowrap text-center font-display font-extrabold leading-[.8] tracking-sikisik text-cikolata"
        style={{ fontSize: 'clamp(120px, var(--kb-baslik-olcegi, 17.5vw), 300px)' }}
      >
        {adSatirlari.map((satir, i) => (
          <Fragment key={satir + i}>
            {i > 0 && <br />}
            {satir}
          </Fragment>
        ))}
      </h1>

      {adet === 0 ? (
        <p className="relative z-cember max-w-[420px] px-6 text-center text-detay tracking-detay text-ink opacity-50">
          ARŞİVDE YAYINLANMIŞ ESER YOK — YÖNETİM PANELİNDEN ESER EKLENDİĞİNDE ÇEMBER DOLAR.
        </p>
      ) : (
        <div
          data-ring-wrap=""
          className="absolute inset-0 z-cember flex items-center justify-center"
        >
          <div
            ref={sigdirRef}
            data-ring-fit=""
            className="relative h-full w-full"
            style={{ transformOrigin: CEMBER.perspektifOdagi }}
          >
            <div
              ref={bolgeRef}
              data-zone="gallery"
              role="group"
              tabIndex={0}
              aria-label={`ESER ÇEMBERİ — ${adet} ESER. SOL VE SAĞ OK TUŞLARIYLA DÖNDÜRÜLÜR, HOME TUŞU İLK ESERE DÖNER.`}
              className="relative h-full w-full"
              style={{
                perspective: `${CEMBER.perspektif}px`,
                perspectiveOrigin: CEMBER.perspektifOdagi,
              }}
            >
              <div
                ref={halkaRef}
                data-ring=""
                className="absolute inset-0"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: `rotateX(${CEMBER.egim}deg) rotateY(0deg)`,
                  /* Dikey kaydırma parmakla serbest kalsın; yatay hareket çemberi çevirir */
                  touchAction: 'pan-y',
                }}
              >
                {eserler.map((eser, i) => (
                  <SculptureCard
                    key={eser.id}
                    ref={(el) => {
                      kartRefleri.current[i] = el
                    }}
                    eser={eser}
                    indeks={i}
                    adim={adim}
                    yaricap={yaricap}
                    jetonlar={ayarlar?.jetonlar}
                    onSecildi={onEserSecildi}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[112px] left-1/2 z-[28] -translate-x-1/2 whitespace-nowrap font-display font-extrabold leading-none tracking-[.12em]"
        style={{ fontSize: 'clamp(70px,9vw,150px)', color: inkAlfa(7) }}
      >
        HEYKEL
      </div>

      {adet > 0 && (
        <GalleryReadout eser={eserler[onIndeks]} indeks={onIndeks} adet={adet} />
      )}
    </section>
  )
}
