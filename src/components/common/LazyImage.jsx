import { useEffect, useRef, useState } from 'react'
import { useDepo } from '../../services/DepoContext.jsx'

/**
 * Tembel yüklenen görsel.
 *
 * Vite tabanlı bir React uygulamasında next/image yoktur; aynı işi bu bileşen
 * yapar: görüntü alanına yaklaşana kadar hiçbir bayt indirilmez, indirme
 * bitene kadar tel kafesteki çapraz haç yer tutucusu durur, gelince yumuşak
 * geçişle açılır. Görsel yoksa yer tutucu kalıcı olarak gösterilir — tasarımdaki
 * <image-slot> davranışının aynısı.
 *
 * @param {object} props
 * @param {string|null} [props.gorselId]  Depodaki görsel kimliği
 * @param {string|null} [props.src]       Doğrudan URL (kitaplık önizlemeleri için)
 * @param {string} props.alt
 * @param {string} [props.yerTutucu]      Görsel yokken yazılacak etiket
 * @param {boolean} [props.oncelik]       true ise tembel yükleme atlanır (hero)
 * @param {string} [props.className]      Dış kapsayıcı sınıfları
 * @param {string} [props.gorselSinifi]   <img> sınıfları
 */
export default function LazyImage({
  gorselId = null,
  src = null,
  alt = '',
  yerTutucu = '',
  oncelik = false,
  className = '',
  gorselSinifi = 'h-full w-full object-cover',
}) {
  const depo = useDepo()
  const kapsayiciRef = useRef(null)
  const [gorunur, setGorunur] = useState(oncelik)
  const [url, setUrl] = useState(src)
  const [yuklendi, setYuklendi] = useState(false)
  const [hata, setHata] = useState(false)

  /* Görüntü alanına yaklaşınca yüklemeyi tetikle. */
  useEffect(() => {
    if (oncelik || gorunur) return
    const el = kapsayiciRef.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setGorunur(true)
      return
    }
    const gozlemci = new IntersectionObserver(
      (girisler) => {
        if (girisler.some((g) => g.isIntersecting)) {
          setGorunur(true)
          gozlemci.disconnect()
        }
      },
      { rootMargin: '400px 0px' },
    )
    gozlemci.observe(el)
    return () => gozlemci.disconnect()
  }, [oncelik, gorunur])

  /* Kimlikten URL çöz. */
  useEffect(() => {
    if (src) {
      setUrl(src)
      return
    }
    if (!gorunur || !gorselId || typeof depo.gorselUrl !== 'function') return
    let iptal = false
    setHata(false)
    depo.gorselUrl(gorselId).then(
      (u) => !iptal && setUrl(u),
      () => !iptal && setHata(true),
    )
    return () => {
      iptal = true
    }
  }, [depo, gorselId, gorunur, src])

  const gorselVar = Boolean(url) && !hata

  return (
    <div ref={kapsayiciRef} className={`relative overflow-hidden bg-cikolata ${className}`}>
      {gorselVar && (
        <img
          src={url}
          alt={alt}
          loading={oncelik ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={oncelik ? 'high' : 'auto'}
          draggable={false}
          onLoad={() => setYuklendi(true)}
          onError={() => setHata(true)}
          className={`${gorselSinifi} transition-[opacity,filter] duration-700 ease-cikis ${
            yuklendi ? 'opacity-100 blur-0' : 'opacity-0 blur-lg'
          }`}
        />
      )}

      {/* Yer tutucu: görsel yokken kalıcı, yüklenirken geçici */}
      {(!gorselVar || !yuklendi) && (
        <div
          aria-hidden="true"
          className="gorsel-yuvasi absolute inset-0 flex items-end p-3"
        >
          {yerTutucu && (
            <span className="text-micro tracking-genis text-ink/40">{yerTutucu}</span>
          )}
        </div>
      )}
    </div>
  )
}
