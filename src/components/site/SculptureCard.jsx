import { useRef } from 'react'
import LazyImage from '../common/LazyImage.jsx'
import { anaGorsel, metaMetni } from '../../data/schema.js'
import { CEMBER, MALZEME_ETIKETI, vurguRengi } from '../../config/tokens.js'

/*
 * Basış sırasında kat edilen TOPLAM yol bu eşiğin altındaysa tıklamadır.
 *
 * İki şey düzeltildi:
 * 1) Eşik 6px'ti ve gerçek kullanımda dardı. Çember dönerken kullanıcı hareketli
 *    hedefi takip ediyor, tıklarken el kaçınılmaz olarak birkaç piksel kayıyor
 *    ve seçim sessizce iptal oluyordu — "esere tıklayamıyorum" şikâyeti buydu.
 * 2) Ölçü, başlangıç ile bitiş arasındaki DÜZ mesafeydi; kullanıcı sürükleyip
 *    başladığı yere dönerse çemberi çevirdiği halde tıklamış sayılıyordu.
 *    Toplam yol ikisini de doğru ayırıyor.
 *
 * 14px, çemberde ~2 derecelik dönüşe karşılık gelir; gözle fark edilmez, yani
 * bu kadar kayma "çevirmek istedim" demek değildir.
 */
const TIKLAMA_ESIGI = 14

/*
 * Jetonlar CSS değişkenine bağlı olduğu için Tailwind'in `text-ink/40` biçimi
 * bu projede hiçbir kural üretmez (v3 var() renklerine alfa uygulayamıyor).
 * Saydamlık gereken yerlerde color-mix kullanılıyor — sonuç tasarımdaki
 * rgba(234,234,234,.13) değerleriyle birebir aynı, üstelik jeton değişince canlı.
 */
const inkAlfa = (yuzde) => `color-mix(in srgb, var(--kb-ink, #EAEAEA) ${yuzde}%, transparent)`

/**
 * Çember üzerindeki tek eser kartı.
 *
 * Kart, halkanın merkezinden `yaricap` kadar dışarı itilip kendi pozisyon açısı
 * kadar döndürülür. Opaklık ve bulanıklık burada değil, useRingController'ın
 * kare döngüsünde doğrudan bu elemana yazılır.
 *
 * @param {object} props
 * @param {object} props.eser
 * @param {number} props.indeks    Çemberdeki 0 tabanlı sıra
 * @param {number} props.adim      Pozisyon açısı (derece)
 * @param {number} props.yaricap
 * @param {object} [props.jetonlar]
 * @param {(eser:object, indeks:number)=>void} [props.onSecildi]
 * @param {object} [props.ref]     Kare döngüsünün gölgeleme için tuttuğu eleman
 */
export default function SculptureCard({
  eser,
  indeks,
  adim,
  yaricap,
  jetonlar,
  onSecildi,
  ref,
}) {
  const basim = useRef(null)

  const sira = String(indeks + 1).padStart(2, '0')
  const gorsel = anaGorsel(eser)
  const vurgu = vurguRengi(eser.malzemeSinifi, jetonlar)
  const etiket = MALZEME_ETIKETI[eser.malzemeSinifi] || MALZEME_ETIKETI.tas
  const meta = metaMetni(eser)

  const sec = () => onSecildi?.(eser, indeks)

  const basildi = (e) => {
    basim.current = { x: e.clientX, y: e.clientY, yol: 0 }
  }

  const oynadi = (e) => {
    const b = basim.current
    if (!b) return
    b.yol += Math.hypot(e.clientX - b.x, e.clientY - b.y)
    b.x = e.clientX
    b.y = e.clientY
  }

  const kalkti = () => {
    const b = basim.current
    basim.current = null
    if (!b) return
    /* Sürükleyerek çemberi çeviren kullanıcı esere tıklamış sayılmamalı. */
    if (b.yol > TIKLAMA_ESIGI) return
    sec()
  }

  /* Parmak/fare kartın dışına çıkarsa basış düşer; yoksa bir sonraki kalkış
     yanlışlıkla tıklama sayılırdı. */
  const iptal = () => {
    basim.current = null
  }

  /* Fare tıklaması yukarıda pointerup ile ele alındı; buraya yalnızca klavye (detail 0) kalır. */
  const klavyeTiklamasi = (e) => {
    if (e.detail === 0) sec()
  }

  return (
    <div
      ref={ref}
      data-work=""
      data-i={indeks + 1}
      data-mat={eser.malzemeSinifi}
      onPointerDown={basildi}
      onPointerMove={oynadi}
      onPointerUp={kalkti}
      onPointerCancel={iptal}
      className="absolute left-1/2 top-1/2 select-none"
      style={{
        width: `${CEMBER.kartGenislik}px`,
        margin: `${CEMBER.kartOfsetY}px 0 0 ${-CEMBER.kartGenislik / 2}px`,
        transform: `rotateY(${indeks * adim}deg) translateZ(${yaricap}px)`,
      }}
    >
      {/* Tavandan inen askı çizgisi — heykelin asılı olduğu hissi */}
      <div
        aria-hidden="true"
        className="absolute bottom-full left-1/2 h-[44vh] w-px"
        style={{
          backgroundImage: `linear-gradient(to bottom, ${inkAlfa(0)}, ${inkAlfa(26)})`,
        }}
      />

      <button
        type="button"
        onClick={klavyeTiklamasi}
        aria-label={`${sira} — ${eser.baslik}${meta ? `. ${meta}` : ''}`}
        className="block w-full text-left"
      >
        <div
          className="relative h-[320px] w-[250px] bg-cikolata"
          style={{
            outline: `1px solid ${inkAlfa(13)}`,
            boxShadow: '0 46px 70px -34px rgba(0,0,0,.8)',
          }}
        >
          <LazyImage
            gorselId={gorsel?.id || null}
            alt={gorsel?.alt || eser.baslik}
            yerTutucu={`${sira} ${eser.baslik}`}
            className="h-full w-full"
          />
        </div>

        <div className="flex items-baseline gap-[10px] pt-[13px]">
          <span className="text-mini tracking-[.18em] text-ink opacity-40">{sira}</span>
          <span className="text-detay tracking-[.14em] text-ink">{eser.baslik}</span>
          <span
            data-accent={eser.malzemeSinifi}
            className="ml-auto text-micro tracking-genis"
            style={{ color: vurgu }}
          >
            {etiket}
          </span>
        </div>
      </button>
    </div>
  )
}
