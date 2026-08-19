import { useMemo, useRef, useState } from 'react'
import LazyImage from '../common/LazyImage.jsx'
import useGsapReveal from '../../hooks/useGsapReveal.js'
import {
  SERGI_DURUM_ETIKETLERI,
  SERGI_TURLERI,
  geriSayim,
  sergiDurumu,
  tarihAraligiMetni,
} from '../../data/schema.js'

/* Bölümün sabit metinleri — ileride yönetimden beslenmeleri gerekirse tek yerde. */
const SERGILER_METINLERI = {
  surunen: 'SERGİ — SERGİ — SERGİ —',
  baslik: 'SERGİLER',
  giris:
    'Kayıt altına alınmış sergiler. Yaklaşan olanlar üstte; tarihi girilmemiş eski kayıtlar arşiv bütünlüğü için listede tutuluyor.',
}

/*
 * Arşiv listesinin sütun şablonu. Yalnızca lg üstünde beş sütuna açılır; altında
 * satırlar tek sütuna iner ve mekan/şehir/tür tek bir satırda toplanır (bkz.
 * aşağıdaki lg:contents). Display sınıfı burada YOK, çünkü aynı şablonu hem
 * `grid` olan veri satırları hem `hidden lg:grid` olan başlık satırı paylaşıyor.
 */
const IZGARA = 'gap-x-6 gap-y-1.5 lg:grid-cols-[84px_1fr_200px_140px_96px] lg:items-baseline lg:gap-y-0'

/** Süren sergi metal, yaklaşan sergi taş rengiyle işaretlenir. */
const vurguSinifi = (durum) => (durum === 'suruyor' ? 'text-metal' : 'text-tas')
const vurguZemini = (durum) => (durum === 'suruyor' ? 'bg-metal' : 'bg-tas')

/** Durum rozeti — renk tek başına bilgi taşımasın diye etiket metni de basılır. */
function DurumRozeti({ durum }) {
  return (
    <span className={`inline-flex items-center gap-2 ${vurguSinifi(durum)}`}>
      <span
        aria-hidden="true"
        className={`h-[5px] w-[5px] ${vurguZemini(durum)} motion-safe:animate-kb-blink`}
      />
      <span className="text-micro tracking-genis">{SERGI_DURUM_ETIKETLERI[durum]}</span>
    </span>
  )
}

/**
 * Süren / yaklaşan serginin vurgulu kartı: solda künye, sağda afiş.
 *
 * @param {{sergi: import('../../data/schema.js').Sergi, durum: string,
 *   eserHaritasi: Map<string, object>, simdi: number}} props
 */
function VurguluKart({ sergi, durum, eserHaritasi, simdi }) {
  const yer = [sergi.mekan, sergi.sehir].filter(Boolean).join(' · ')
  const aralik = tarihAraligiMetni(sergi.baslangic, sergi.bitis)
  const kalan = geriSayim(sergi, simdi)

  /* Silinmiş ya da hiç var olmamış eser kimlikleri sessizce atlanır; sayaç
     bulunanları sayar, yani "(6)" yazıp 4 etiket göstermek imkânsız. */
  const eserler = (sergi.eserIdleri || [])
    .map((id) => eserHaritasi.get(id))
    .filter((e) => e && e.baslik)

  return (
    <article
      data-rv
      className="grid grid-cols-1 gap-8 bg-cikolata/40 p-8 outline outline-1 outline-ink/[0.16] lg:grid-cols-[1fr_320px]"
    >
      <div className="min-w-0">
        <DurumRozeti durum={durum} />

        <h3 className="m-0 pt-4 font-display text-[clamp(32px,4.5vw,64px)] font-extrabold leading-[.88] tracking-[-.03em] text-ink">
          {sergi.ad}
        </h3>

        {yer && <p className="m-0 pt-4 text-micro tracking-genis text-ink/45">{yer}</p>}

        {(aralik || kalan) && (
          <p className="m-0 flex flex-wrap items-baseline gap-x-4 gap-y-1 pt-2">
            {aralik && <span className="text-micro tracking-genis text-ink/60">{aralik}</span>}
            {kalan && (
              <span className={`text-micro tracking-genis ${vurguSinifi(durum)}`}>{kalan}</span>
            )}
          </p>
        )}

        {sergi.aciklama && (
          <p className="m-0 max-w-[52ch] pt-6 text-govde leading-[1.85] tracking-[.04em] text-ink/60 [text-wrap:pretty]">
            {sergi.aciklama}
          </p>
        )}

        {eserler.length > 0 && (
          <div className="pt-7">
            <h4 className="m-0 text-micro font-normal tracking-genis text-ink/35">
              SERGİDEKİ ESERLER ({eserler.length})
            </h4>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0 pt-3">
              {eserler.map((eser) => (
                <li
                  key={eser.id}
                  className="border border-ink/20 px-2.5 py-1 text-micro tracking-genis text-ink/60"
                >
                  {eser.baslik}
                </li>
              ))}
            </ul>
          </div>
        )}

        {sergi.baglanti && (
          <p className="m-0 pt-7">
            <a
              href={sergi.baglanti}
              target="_blank"
              rel="noopener noreferrer"
              className="text-micro tracking-genis"
            >
              GALERİ SAYFASI →
            </a>
          </p>
        )}
      </div>

      {/* Afiş yoksa LazyImage kalıcı yer tutucuyu (çapraz haç + sergi adı) çizer.
          max-w, lg altında tek sütuna inince afişin ekranı boydan boya kaplamasını
          engeller; lg'de sütun zaten 320px olduğu için etkisizdir. */}
      <LazyImage
        gorselId={sergi.afis?.id ?? null}
        alt={sergi.afis?.alt || `${sergi.ad} afişi`}
        yerTutucu={sergi.ad}
        className="aspect-[9/12.7] w-full max-w-[320px]"
      />
    </article>
  )
}

/** Arşiv listesinin bir satırı: yıl · ad · mekan · şehir · tür. */
function ArsivSatiri({ sergi }) {
  /* Tarihi olmayan kayıtta hiçbir tarih yazılmaz — "sona erdi" demek de yanlış
     olurdu, o kayıt için gün bilgisi hiç girilmemiş, yalnızca yıl var. */
  const aralik = tarihAraligiMetni(sergi.baslangic, sergi.bitis)
  const tur = SERGI_TURLERI[sergi.tur] || ''

  return (
    <li className={`grid grid-cols-1 border-b border-ink/[0.08] py-4 ${IZGARA}`}>
      <div>
        <span className="text-detay tracking-genis text-ink/70">{sergi.yil}</span>
        {aralik && (
          <span className="block pt-1 text-micro tracking-genis text-ink/35">{aralik}</span>
        )}
      </div>

      <h3 className="m-0 font-display text-[15px] font-bold tracking-[.05em] text-ink lg:text-[17px]">
        {sergi.ad}
      </h3>

      {/*
        Dar ekranda üç meta tek satırda "MEKAN · ŞEHİR · TÜR" olarak okunur;
        lg'de sarmalayıcı display:contents ile ortadan kalkar ve üç alan kendi
        sütununa oturur. Sütun başlangıçları açıkça verildi: bir alan boşsa
        (örn. şehir girilmemişse) diğerleri yine doğru sütunda kalır.
      */}
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-micro tracking-genis text-ink/45 lg:contents">
        {sergi.mekan && <span className="lg:col-start-3">{sergi.mekan}</span>}
        {sergi.mekan && sergi.sehir && (
          <span aria-hidden="true" className="text-ink/25 lg:hidden">
            ·
          </span>
        )}
        {sergi.sehir && <span className="lg:col-start-4">{sergi.sehir}</span>}
        {(sergi.mekan || sergi.sehir) && tur && (
          <span aria-hidden="true" className="text-ink/25 lg:hidden">
            ·
          </span>
        )}
        {tur && <span className="lg:col-start-5">{tur}</span>}
      </div>
    </li>
  )
}

/**
 * Sergiler bölümü — Atölye ile Kolofon arasına girer.
 *
 * Üstte süren/yaklaşan sergilerin vurgulu kartı, altında yıl azalan sırayla
 * arşiv listesi, en altta canlı özet sayacı. Hiç sergi yoksa bölüm hiç basılmaz.
 *
 * @param {object} props
 * @param {import('../../data/schema.js').Sergi[]} [props.sergiler]
 * @param {object[]} [props.eserler] Kartlardaki eser etiketleri buradan çözülür
 * @param {string} [props.className]
 */
export default function SergilerBolumu({ sergiler = [], eserler = [], className = '' }) {
  const bolumRef = useRef(null)
  useGsapReveal(bolumRef)

  /*
   * Tek bir "şimdi" damgası: durum, geri sayım ve sıralama aynı ana bakmalı.
   * Her çağrıda Date.now() okunsaydı gece yarısına denk gelen bir render'da
   * sergi hem "yaklaşan" hem "süren" gibi sınıflanabilirdi. Saat state'in tembel
   * başlatıcısında okunuyor: useMemo bir önbellektir, React onu istediğinde
   * atabilir; damganın bileşen ömrü boyunca sabit kalması gerekiyor.
   */
  const [simdi] = useState(() => Date.now())

  const eserHaritasi = useMemo(
    () => new Map((eserler || []).filter((e) => e?.id).map((e) => [e.id, e])),
    [eserler],
  )

  const { vurgulular, arsiv, ozet } = useMemo(() => {
    const liste = (sergiler || []).filter(Boolean)
    const one = []
    const geride = []

    for (const sergi of liste) {
      const durum = sergiDurumu(sergi, simdi)
      if (durum === 'suruyor' || durum === 'yaklasan') one.push({ sergi, durum })
      else geride.push(sergi)
    }

    /* Süren sergi yaklaşandan önce; ikisi de varsa erken başlayan üstte. */
    const oncelik = (durum) => (durum === 'suruyor' ? 0 : 1)
    one.sort(
      (a, b) =>
        oncelik(a.durum) - oncelik(b.durum) ||
        (a.sergi.baslangic ?? 0) - (b.sergi.baslangic ?? 0),
    )

    /* Yıl azalan; aynı yıl içinde geç başlayan üstte, tarihsizler o yılın sonunda. */
    geride.sort(
      (a, b) =>
        (b.yil ?? 0) - (a.yil ?? 0) ||
        (b.baslangic ?? 0) - (a.baslangic ?? 0) ||
        (a.ad || '').localeCompare(b.ad || '', 'tr'),
    )

    return {
      vurgulular: one,
      arsiv: geride,
      ozet: {
        toplam: liste.length,
        kisisel: liste.filter((s) => s.tur === 'kisisel').length,
        grup: liste.filter((s) => s.tur === 'grup').length,
      },
    }
  }, [sergiler, simdi])

  /* Kayıt yoksa boş bir bölüm basmak yerine hiç basma — sayfa Atölye'den
     doğrudan Kolofon'a geçer. */
  if (!ozet.toplam) return null

  return (
    <section
      ref={bolumRef}
      aria-labelledby="sergiler-baslik"
      data-screen-label="Sergiler"
      className={`relative z-icerik overflow-hidden px-[30px] py-[150px] ${className}`}
    >
      {/* Zeminde kayan dev yazı — içerik değil doku. Yatay kaydırmayı
          useGsapReveal [data-creep] üzerinden kendisi kuruyor. */}
      <div
        data-creep
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-[52px] z-[1] whitespace-nowrap font-display text-[clamp(90px,13vw,220px)] font-extrabold leading-[.85] tracking-[-.02em] text-cikolata/80"
      >
        {SERGILER_METINLERI.surunen}
      </div>

      <div className="relative z-[3] mx-auto max-w-icerik">
        <div className="flex flex-col items-start gap-8 border-b border-ink/[0.16] pb-4 lg:flex-row lg:items-end lg:justify-between lg:gap-[60px]">
          {/*
            Taban punto Atölye'deki 40px değil 30px: "SERGİLER" sekiz harf, 40px'te
            329px yer kaplıyor ve 375px ekranda 315px'lik içerik sütununu taşırıyor
            (tek kelime olduğu için saramaz da). 30px tabanı yalnızca ~445px altında
            devreye girer — üstünde 9vw zaten daha büyük, yani geniş ekranda başlık
            Atölye ile birebir aynı ölçekte kalır.
          */}
          <h2
            id="sergiler-baslik"
            data-rv
            className="m-0 font-display text-[clamp(30px,9vw,152px)] font-extrabold leading-[.82] tracking-[-.035em] text-ink"
          >
            {SERGILER_METINLERI.baslik}
          </h2>
          <p
            data-rv
            className="m-0 max-w-[390px] pb-3.5 text-govde leading-[1.85] tracking-[.04em] text-ink/60 [text-wrap:pretty]"
          >
            {SERGILER_METINLERI.giris}
          </p>
        </div>

        {vurgulular.length > 0 && (
          <div className="flex flex-col gap-[22px] pt-14">
            {vurgulular.map(({ sergi, durum }) => (
              <VurguluKart
                key={sergi.id}
                sergi={sergi}
                durum={durum}
                eserHaritasi={eserHaritasi}
                simdi={simdi}
              />
            ))}
          </div>
        )}

        {arsiv.length > 0 && (
          <div data-rv className={vurgulular.length > 0 ? 'pt-20' : 'pt-14'}>
            {/* Sütun başlıkları yalnızca beş sütunlu düzende anlamlı; satırların
                kendisi zaten "2024 · GÖVDE · ARTER · İSTANBUL · KİŞİSEL" diye
                okunduğu için ekran okuyucudan gizlendi. */}
            <div
              aria-hidden="true"
              className={`hidden pb-3 text-micro tracking-genis text-ink/35 lg:grid ${IZGARA}`}
            >
              <span>YIL</span>
              <span>SERGİ ADI</span>
              <span>MEKAN</span>
              <span>ŞEHİR</span>
              <span>TÜR</span>
            </div>

            <ul className="m-0 list-none border-t border-ink/[0.16] p-0">
              {arsiv.map((sergi) => (
                <ArsivSatiri key={sergi.id} sergi={sergi} />
              ))}
            </ul>
          </div>
        )}

        <p data-rv className="m-0 pt-10 text-micro tracking-genis text-ink/35">
          {ozet.toplam} SERGİ · {ozet.kisisel} KİŞİSEL · {ozet.grup} GRUP
        </p>
      </div>
    </section>
  )
}
