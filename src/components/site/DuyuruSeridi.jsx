import { useEffect, useRef, useState } from 'react'
import {
  SERGI_DURUM_ETIKETLERI,
  geriSayim,
  sergiDurumu,
  tarihAraligiMetni,
} from '../../data/schema.js'

/* Anahtar sergi kimliğini taşır: yeni bir sergi duyurulmaya başlayınca anahtar
   da değişir, yani eski duyuruyu kapatmış olmak yenisini gizlemez. */
const ANAHTAR_ONEKI = 'kese-benav/duyuru-kapali:'

/* Tercih oturumluk: aynı sekmede bir daha görünmesin, yeni sekmede yine görünsün.
   sessionStorage gizli sekmede / kota dolu olduğunda ERİŞİMDE bile fırlatabildiği
   için hem okuma hem yazma korumalı — şerit depolama yok diye çökmemeli. */
function kapaliMi(anahtar) {
  if (!anahtar || typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(anahtar) === '1'
  } catch {
    return false
  }
}

function kapaliYaz(anahtar) {
  if (!anahtar || typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(anahtar, '1')
  } catch {
    /* Depolama yoksa kapatma yine de bu render'da uygulanır, kalıcı olmaz. */
  }
}

/**
 * Hero'nun üstündeki duyuru şeridi — süren ya da yaklaşan sergiyi bildirir.
 *
 * Duyurulacak sergi yoksa hiç basılmaz (null döner), böylece sayfa düzeninde
 * yer kaplamaz. Görsel dil okuma çubuğuyla (GalleryReadout) akrabadır: %72
 * çikolata zemin + 9px bulanıklık, 9px büyük harf detay tipografisi.
 *
 * @param {object} props
 * @param {import('../../data/schema.js').Sergi|null} [props.sergi]
 *   `duyurulacakSergi(sergiler)` sonucu
 * @param {string} [props.className]
 */
export default function DuyuruSeridi({ sergi = null, gorunur = true, className = '' }) {
  const anahtar = sergi?.id ? ANAHTAR_ONEKI + sergi.id : null

  /*
   * Kapatma tercihi anahtara bağlı bir türetilmiş durumdur. Effect ile
   * eşitleseydik sergi değiştiği kare boyunca eski tercih uygulanır ve şerit
   * bir an yanlış görünürdü; render sırasında düzeltmek React'ın önerdiği yol.
   */
  const [kapatma, setKapatma] = useState(() => ({ anahtar, kapali: kapaliMi(anahtar) }))
  if (kapatma.anahtar !== anahtar) {
    setKapatma({ anahtar, kapali: kapaliMi(anahtar) })
  }

  /*
   * Geri sayım gerçekten canlı: sayfa açık kalıp gece yarısını devirdiğinde
   * "3 GÜN KALDI" kendiliğinden "2 GÜN KALDI" olur, sergi başlayınca da etiket
   * YAKLAŞAN'dan SÜRÜYOR'a döner. Etiket değişmedikçe yeniden render etmiyoruz,
   * yoksa dakikada bir boşuna çizim olurdu.
   */
  const baslangic = sergi?.baslangic ?? null
  const bitis = sergi?.bitis ?? null
  const [simdi, setSimdi] = useState(() => Date.now())
  useEffect(() => {
    if (!baslangic) return undefined
    const zamanlar = { baslangic, bitis }
    const sayac = window.setInterval(() => {
      setSimdi((onceki) => {
        const yeni = Date.now()
        const ayni =
          sergiDurumu(zamanlar, onceki) === sergiDurumu(zamanlar, yeni) &&
          geriSayim(zamanlar, onceki) === geriSayim(zamanlar, yeni)
        return ayni ? onceki : yeni
      })
    }, 60000)
    return () => window.clearInterval(sayac)
  }, [baslangic, bitis])

  /*
   * Şerit sabit konumda duruyor ve sayfanın en üstünü kaplıyor; sabit künye de
   * oradaydı ve ikisi üst üste biniyordu. Künyeyi elle bir sayıyla aşağı itmek
   * kırılgan olurdu — şerit dar ekranda sarıp iki satıra çıkıyor. Bunun yerine
   * kendi yüksekliğini --kb-duyuru-h değişkenine yazıyoruz; SiteNav bu kadar
   * aşağıdan başlıyor. Şerit kapatılınca ya da hiç basılmayınca değişken 0px olur.
   */
  const seritRef = useRef(null)
  const basiliyor = Boolean(sergi) && !kapatma.kapali
  useEffect(() => {
    const kok = document.documentElement
    const el = seritRef.current
    if (!basiliyor || !el) {
      kok.style.setProperty('--kb-duyuru-h', '0px')
      return undefined
    }
    const olc = () => kok.style.setProperty('--kb-duyuru-h', `${Math.round(el.offsetHeight)}px`)
    olc()
    const gozlemci = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(olc) : null
    gozlemci?.observe(el)
    window.addEventListener('resize', olc)
    return () => {
      gozlemci?.disconnect()
      window.removeEventListener('resize', olc)
      kok.style.setProperty('--kb-duyuru-h', '0px')
    }
  }, [basiliyor])

  if (!sergi || kapatma.kapali) return null

  const durum = sergiDurumu(sergi, simdi)
  /* Sona ermiş ya da tarihi hiç girilmemiş bir kaydı "duyurmak" yanlış olurdu.
     duyurulacakSergi zaten böyle bir kayıt döndürmez; bu yalnızca kalkan. */
  if (durum !== 'yaklasan' && durum !== 'suruyor') return null

  const zeminVurgusu = durum === 'suruyor' ? 'bg-metal' : 'bg-tas'
  const yer = [sergi.mekan, sergi.sehir].filter(Boolean).join(' · ')
  const aralik = tarihAraligiMetni(sergi.baslangic, sergi.bitis)
  const kalan = geriSayim(sergi, simdi)

  return (
    <aside
      ref={seritRef}
      aria-label="Sergi duyurusu"
      className={`fixed inset-x-0 top-0 z-nav border-b border-ink/[0.14] bg-cikolata/[0.72] backdrop-blur-[9px] motion-safe:transition-[opacity,transform] motion-safe:duration-300 motion-safe:ease-cikis ${
        gorunur ? 'opacity-100' : 'invisible -translate-y-2 opacity-0'
      } ${className}`}
    >
      {/*
        375px'te tek satır nowrap taşıyordu (okuma çubuğunda aynı hata yapılmıştı);
        burada şerit her ölçüde sarabilir, hiçbir şey kesilmez.

        Kapatma düğmesi akışın DIŞINDA, her ölçüde sağ üstte: akış içindeyken
        768px'te satıra sığmayıp alt satırın soluna düşüyordu — kapat düğmesinin
        yeri ekran genişliğine göre gezmemeli. Sağdaki iç boşluk (pr-[52px])
        onun yerini peşinen ayırdığı için hiçbir metin altına girmez.
      */}
      <div className="relative mx-auto flex max-w-icerik flex-wrap items-center gap-x-4 gap-y-1.5 py-3 pl-[30px] pr-[52px]">
        <span className="flex shrink-0 items-center gap-2">
          {/* Kare yalnızca renk taşır; aynı bilgi yanındaki etikette metin olarak da var */}
          <span
            aria-hidden="true"
            className={`h-[5px] w-[5px] ${zeminVurgusu} motion-safe:animate-kb-blink`}
          />
          <span className="text-micro tracking-genis text-ink/70">
            {SERGI_DURUM_ETIKETLERI[durum]}
          </span>
        </span>

        <button
          type="button"
          onClick={() => {
            kapaliYaz(anahtar)
            setKapatma({ anahtar, kapali: true })
          }}
          aria-label="Duyuruyu kapat"
          className="absolute right-[22px] top-[9px] p-1.5 leading-none text-ink/40 transition-colors hover:text-tas"
        >
          <span aria-hidden="true" className="block text-detay leading-none">
            ✕
          </span>
        </button>

        {/* Şerit hero'daki h1'den önce geldiği için başlık değil; landmark etiketi taşıyor */}
        <p className="m-0 w-full font-display text-[13px] font-bold tracking-[.06em] text-ink md:w-auto">
          {sergi.ad}
        </p>

        {(yer || aralik) && (
          <span className="flex w-full flex-wrap items-baseline gap-x-4 gap-y-1 md:w-auto">
            {yer && <span className="text-micro tracking-genis text-ink/45">{yer}</span>}
            {aralik && <span className="text-micro tracking-genis text-ink/60">{aralik}</span>}
          </span>
        )}

        {(kalan || sergi.baglanti) && (
          <span className="flex w-full flex-wrap items-baseline gap-x-4 gap-y-1 md:ml-auto md:w-auto">
            {kalan && <span className="text-micro tracking-genis text-tas">{kalan}</span>}
            {sergi.baglanti && (
              <a
                href={sergi.baglanti}
                target="_blank"
                rel="noopener noreferrer"
                className="text-micro tracking-genis"
              >
                AYRINTI →
              </a>
            )}
          </span>
        )}
      </div>
    </aside>
  )
}
