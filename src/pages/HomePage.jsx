import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'
import { useDepoVerisi } from '../services/DepoContext.jsx'
import { applyTokens } from '../config/tokens.js'
import { duyurulacakSergi } from '../data/schema.js'
import useReducedMotion from '../hooks/useReducedMotion.js'
import useGsapReveal, { useHeroKoreografi } from '../hooks/useGsapReveal.js'
import ShaderArkaPlan from '../components/site/ShaderArkaPlan.jsx'
import KilavuzCizgileri from '../components/site/KilavuzCizgileri.jsx'
import OzelImlec from '../components/site/OzelImlec.jsx'
import SiteNav from '../components/site/SiteNav.jsx'
import SculptureGallery from '../components/site/SculptureGallery.jsx'
import AtolyeBolumu from '../components/site/AtolyeBolumu.jsx'
import DuyuruSeridi from '../components/site/DuyuruSeridi.jsx'
import SergilerBolumu from '../components/site/SergilerBolumu.jsx'
import EserDetay from '../components/site/EserDetay.jsx'
import Kolofon from '../components/site/Kolofon.jsx'
import PerdeYukleniyor from '../components/common/PerdeYukleniyor.jsx'
import HataKutusu from '../components/common/HataKutusu.jsx'

/**
 * Ziyaretçinin gördüğü tek sayfa.
 *
 * Site TASLAK değil YAYINLANMIŞ veriyi okur: ayarlar `yayindakiAyarlariGetir`,
 * çember sırası `yayindakiCemberSirasi` üzerinden gelir. Yönetim panelinde
 * yapılan değişiklik "Yayınla" denene kadar buraya yansımaz — tel kafesteki
 * A4/A6 notlarının gereği.
 */
export default function HomePage() {
  const hareketAzalt = useReducedMotion()
  const sayfaRef = useRef(null)
  const heroRef = useRef(null)

  const { veri, yukleniyor, hata } = useDepoVerisi(async (depo) => {
    const [ayarlar, cemberSirasi, eserler, surecKareleri, sergiler] = await Promise.all([
      depo.yayindakiAyarlariGetir(),
      depo.yayindakiCemberSirasi(),
      depo.eserleriGetir(),
      depo.surecKareleriniGetir(),
      depo.sergileriGetir(),
    ])
    return { ayarlar, cemberSirasi, eserler, surecKareleri, sergiler }
  }, [])

  const ayarlar = veri?.ayarlar
  const doku = ayarlar?.doku

  /* Yayınlanmış jetonları belgeye uygula — Tailwind renkleri bu değişkenleri okuyor. */
  useEffect(() => {
    if (ayarlar) applyTokens(ayarlar.jetonlar, ayarlar.tipografi)
  }, [ayarlar])

  /*
   * A6'daki "indekslensin" anahtarı bugüne kadar yalnızca bir kayıttı; kolofon
   * "NO INDEX" yazıyordu ama sayfada bunu söyleyen bir şey yoktu. Ayar artık
   * gerçek bir robots etiketine ve sayfa başlığı/açıklamasına bağlı. Müşteri
   * önizlemesi bu sayede varsayılan olarak arama motorlarına kapalı; yayına
   * çıkarken anahtarı panelden açmak yetiyor.
   */
  useEffect(() => {
    if (!ayarlar?.seo) return
    const { baslik, aciklama, indexlensin } = ayarlar.seo
    if (baslik) document.title = baslik

    const etiketAyarla = (ad, icerik) => {
      let el = document.head.querySelector(`meta[name="${ad}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute('name', ad)
        document.head.appendChild(el)
      }
      el.setAttribute('content', icerik)
    }
    if (aciklama) etiketAyarla('description', aciklama)
    etiketAyarla('robots', indexlensin ? 'index, follow' : 'noindex, nofollow')
  }, [ayarlar])

  /* Çember, yayınlanmış sıraya göre dizilir. */
  const cemberEserleri = useMemo(() => {
    if (!veri) return []
    const harita = new Map(veri.eserler.map((e) => [e.id, e]))
    return veri.cemberSirasi.map((id) => harita.get(id)).filter(Boolean)
  }, [veri])

  /* Kolofon ve nav'daki sayılar arşivin tamamından türer, çemberdekilerden değil. */
  const arsiv = useMemo(() => {
    const yayinda = veri?.eserler.filter((e) => e.durum === 'yayinda') ?? []
    const yillar = yayinda.map((e) => e.yil).filter(Boolean)
    return {
      adet: yayinda.length,
      yilAraligi: yillar.length ? { ilk: Math.min(...yillar), son: Math.max(...yillar) } : null,
      sonGuncelleme: yayinda.reduce((m, e) => Math.max(m, e.guncellendi || 0), 0) || null,
    }
  }, [veri])

  /*
   * Duyurulacak sergi her render'da değil, veri değişince hesaplanır. Zaman
   * bağımlı olduğu için (tarih geçince duyuru düşer) sayfa yenilendiğinde
   * yeniden değerlendirilir — canlı bir sayaç kurmak bu ölçekte gereksiz.
   */
  const duyuru = useMemo(() => duyurulacakSergi(veri?.sergiler ?? []), [veri])

  /*
   * Açık eser adresten okunur (/eser/:eserId), bileşen durumundan değil.
   * Böylece tek bir işin linki paylaşılabiliyor, tarayıcının geri tuşu katmanı
   * kapatıyor ve sayfa yenilenince aynı eser açık geliyor. Rota joker olduğu
   * için adres değişimi HomePage'i yeniden bağlamaz — çember ayakta kalır.
   */
  const eslesme = useMatch('/eser/:eserId')
  const gezin = useNavigate()
  const acikEserId = eslesme?.params?.eserId ?? null

  const acikIndeks = useMemo(() => {
    if (!acikEserId) return -1
    return cemberEserleri.findIndex((e) => e.id === acikEserId)
  }, [acikEserId, cemberEserleri])
  const acikEser = acikIndeks >= 0 ? cemberEserleri[acikIndeks] : null

  /* Adreste tanınmayan bir eser varsa katmanı açık göstermek yerine sessizce ana sayfaya dön. */
  useEffect(() => {
    if (acikEserId && !yukleniyor && cemberEserleri.length && acikIndeks < 0) {
      gezin('/', { replace: true })
    }
  }, [acikEserId, acikIndeks, cemberEserleri.length, gezin, yukleniyor])

  const eserAc = useCallback((eser) => gezin(`/eser/${eser.id}`), [gezin])
  const eserKapat = useCallback(() => gezin('/'), [gezin])

  useGsapReveal(sayfaRef, { kapali: hareketAzalt || yukleniyor })
  useHeroKoreografi(heroRef, { kapali: hareketAzalt || yukleniyor })

  if (yukleniyor) return <PerdeYukleniyor mesaj="ARŞİV AÇILIYOR" />

  if (hata) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-beton p-8">
        <HataKutusu hata={hata} yenidenDene={() => window.location.reload()} className="max-w-xl" />
      </div>
    )
  }

  return (
    <div ref={sayfaRef} className="relative w-full bg-beton text-ink">
      <ShaderArkaPlan
        gren={doku?.gren}
        metalRengi={ayarlar?.jetonlar?.metal}
        tasRengi={ayarlar?.jetonlar?.tas}
      />
      <KilavuzCizgileri kapali={doku?.kilavuz === false} />
      <OzelImlec kapali={doku?.ozelImlec === false} />

      <SiteNav kimlik={ayarlar?.kimlik} eserAdedi={arsiv.adet} />

      <DuyuruSeridi sergi={duyuru} />

      <main>
        <div ref={heroRef}>
          <SculptureGallery
            eserler={cemberEserleri}
            ayarlar={ayarlar}
            onEserSecildi={eserAc}
            duraklat={Boolean(acikEser)}
            odakIndeks={acikIndeks >= 0 ? acikIndeks : null}
          />
        </div>

        <AtolyeBolumu kareler={veri?.surecKareleri ?? []} />

        <SergilerBolumu sergiler={veri?.sergiler ?? []} eserler={veri?.eserler ?? []} />
      </main>

      <EserDetay
        eser={acikEser}
        eserler={cemberEserleri}
        sergiler={veri?.sergiler ?? []}
        onKapat={eserKapat}
        onEserDegistir={eserAc}
      />

      <Kolofon
        kimlik={ayarlar?.kimlik}
        eserAdedi={arsiv.adet}
        yilAraligi={arsiv.yilAraligi}
        sonGuncelleme={arsiv.sonGuncelleme}
      />
    </div>
  )
}
