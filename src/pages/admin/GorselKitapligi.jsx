/**
 * Görsel kitaplığı — arşivdeki bütün görseller tek ızgarada.
 *
 * Tel kafeste ayrı bir ekran olarak çizilmedi; kenar çubuğundaki "GÖRSELLER"
 * maddesinin karşılığı. Bu yüzden ekran kodu yoktur ve hiçbir yeni görsel dil
 * kurulmaz: küçük resimler A3'teki gibi 3:4 ve "ANA" çipiyle, satırlar ve
 * dolgular A1'deki gibi (26px panel dolgusu, 9/10px detay tipografisi).
 *
 * Yükleme, kırpma ve alt metin buradan yönetilmez — hepsi A3 kırpma
 * penceresinin işi. Kitaplık yalnızca eksikleri görünür kılar ve o pencereyi açar.
 */
import { useCallback, useId, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDepoVerisi } from '../../services/DepoContext.jsx'
import { ESER_DURUMLARI, anaGorsel, metaMetni, yayinEngelleri } from '../../data/schema.js'
import { bayt } from '../../utils/goruntu.js'
import Iskelet from '../../components/common/Iskelet.jsx'
import HataKutusu from '../../components/common/HataKutusu.jsx'
import LazyImage from '../../components/common/LazyImage.jsx'
import GorselKirpmaModali from '../../components/admin/GorselKirpmaModali.jsx'
import {
  Anahtar,
  Dugme,
  EkranBasligi,
  EkranNotlari,
  Panel,
  PanelCubugu,
  Rozet,
  cn,
} from '../../components/admin/ui.jsx'

/* Kart genişliği A3'teki 3:4 küçük resimden gelir; 160px altında dosya adı
   satırı okunmaz hale geliyor, bu yüzden taban sütun 160px. */
const IZGARA = 'grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-[14px]'

const BOS_LISTE = []

const iki = (n) => String(n).padStart(2, '0')

const saatMetni = (zaman) =>
  new Date(zaman).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

const NOTLAR = [
  'Küçük resme tıklamak o eserin A3 kırpma penceresini açar; yükleme, kırpma, alt metin ve “ana görsel” seçimi orada yapılır.',
  'Görseli olmayan eser yayınlanamaz — alttaki liste boşalmadan arşivin tamamı yayına alınamaz.',
  'Ana görselin alt metni de yayını engeller; eksik alt metin taş renginde işaretlenir.',
]

/* ---------- ızgara kartı ---------- */

/**
 * Tek bir görsel. Küçük resim düğme, başlık ise bağlantıdır: biri kırpma
 * penceresine, diğeri A2'ye gider — ikisi tek tıklama hedefinde birleşmez.
 */
function GorselKarti({ eser, gorsel, sira, toplam, ana, onAc }) {
  const altEksik = !gorsel.alt?.trim()
  const dosya = gorsel.kaynakAdi || 'DOSYA ADI YOK'

  return (
    <li className="min-w-0">
      <button
        type="button"
        onClick={() => onAc(eser.id)}
        aria-label={`${eser.baslik} — ${sira}/${toplam}. görsel, kırpma penceresini aç`}
        className="group block w-full focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <LazyImage
          gorselId={gorsel.id}
          alt={gorsel.alt || ''}
          className={cn(
            'aspect-[3/4] w-full border transition-colors',
            ana ? 'border-ink' : 'border-ink/[0.18] group-hover:border-ink/45',
          )}
        />
      </button>

      <div className="min-w-0 pt-2.5">
        <div className="flex items-baseline gap-2">
          <Link
            to={`/admin/eserler/${eser.id}`}
            className="min-w-0 flex-1 truncate border-b-0 text-mini tracking-[0.08em] text-ink transition-colors hover:text-tas"
            title={eser.baslik}
          >
            {eser.baslik}
          </Link>
          {ana && (
            /* A3'teki 8px'lik "ANA" çipi — orada küçük resmin üstünde durur,
               burada başlık satırında; boyutu ve dolgusu aynı. */
            <span className="shrink-0 bg-admin-bg px-1 py-[2px] text-[8px] leading-none tracking-[0.1em] text-ink">
              ANA
            </span>
          )}
        </div>

        {altEksik && <div className="pt-1 text-micro tracking-[0.16em] text-tas">ALT METİN YOK</div>}

        <div className="truncate pt-1 text-micro tracking-[0.14em] text-ink/30" title={dosya}>
          {dosya} · {bayt(gorsel.kaynakBayt)}
        </div>
      </div>
    </li>
  )
}

/* ---------- görseli olmayan eser satırı ---------- */

/**
 * Bu bölüm doğrudan yayınlanabilirlik denetimidir: schema.js'teki
 * `yayinEngelleri` "Görseli olmayan eser yayınlanamaz." engelini üretir, A1
 * notu da aynı kuralı söyler. Buradaki her satır o engelin canlı karşılığıdır;
 * satır kaybolduğunda eser yayına alınabilir hale gelir.
 */
function EksikSatiri({ eser, no, onAc }) {
  const engeller = yayinEngelleri(eser)

  return (
    <li className="flex flex-wrap items-center gap-4 border-b border-ink/[0.08] px-3 py-3.5 text-mini tracking-[0.08em]">
      <span className="w-6 shrink-0 text-ink/45">{no}</span>

      <Link
        to={`/admin/eserler/${eser.id}`}
        className="min-w-0 max-w-[240px] flex-1 truncate border-b-0 text-ink transition-colors hover:text-tas"
        title={eser.baslik}
      >
        {eser.baslik}
      </Link>

      <span className="min-w-0 flex-[2] truncate text-ink/60">{metaMetni(eser)}</span>

      <Rozet tur={eser.durum}>{ESER_DURUMLARI[eser.durum]}</Rozet>

      <span
        className="text-micro tracking-[0.16em] text-tas"
        title={engeller.join(' ')}
      >
        YAYINLANAMAZ
      </span>

      <span className="ml-auto">
        <Dugme tur="birincil" onClick={() => onAc(eser.id)}>
          GÖRSEL EKLE
        </Dugme>
      </span>
    </li>
  )
}

/* ---------- ekran ---------- */

export default function GorselKitapligi() {
  const { veri: eserler, yukleniyor, hata } = useDepoVerisi((depo) => depo.eserleriGetir(), [])
  const [seciliId, setSeciliId] = useState(null)
  const [sadeceEksik, setSadeceEksik] = useState(false)
  const [sonKaydetme, setSonKaydetme] = useState(null)

  const izgaraId = useId()
  const eksikId = useId()

  /* Sabit boş dizi: yükleme sırasında her karede yeni kimlik üretip
     aşağıdaki useMemo'ları boşuna tetiklemesin. */
  const liste = eserler || BOS_LISTE

  /* Kartlar depo sırasını korur: A1'deki "NO" sütunu da aynı sıradan türer,
     böylece iki ekranda aynı eser aynı numarayla anılır. */
  const kartlar = useMemo(
    () =>
      liste.flatMap((eser) => {
        const gorseller = eser.gorseller || []
        const anaId = anaGorsel(eser)?.id ?? null
        return gorseller.map((gorsel, i) => ({
          eser,
          gorsel,
          sira: i + 1,
          toplam: gorseller.length,
          ana: gorsel.id === anaId,
        }))
      }),
    [liste],
  )

  const eksikler = useMemo(
    () => liste.map((eser, i) => ({ eser, no: iki(i + 1) })).filter(({ eser }) => !(eser.gorseller || []).length),
    [liste],
  )

  const gorselliEserSayisi = liste.length - eksikler.length

  const ozet = `${kartlar.length} GÖRSEL · ${gorselliEserSayisi} ESERDE · ${eksikler.length} ESERDE GÖRSEL YOK`

  const seciliEser = seciliId ? liste.find((e) => e.id === seciliId) || null : null

  /* Modal kaydettiğinde depo aboneliği (useDepoVerisi) listeyi kendiliğinden
     tazeler; burada yalnızca A1 üst çubuğundaki "SON KAYDETME" damgası kalır. */
  const kaydedildi = useCallback(() => setSonKaydetme(Date.now()), [])

  return (
    <section aria-labelledby="gorsel-kitapligi-baslik">
      <EkranBasligi
        baslik="GÖRSEL KİTAPLIĞI"
        yol="/admin/gorseller"
        sag={<span className="text-micro tracking-genis text-ink/30">KIRPMA → A3</span>}
      />
      <h1 id="gorsel-kitapligi-baslik" className="sr-only">
        Görsel kitaplığı
      </h1>

      <Panel>
        <PanelCubugu className="flex-wrap">
          <span className="text-mini tracking-genis">GÖRSELLER</span>
          <span className="text-micro tracking-genis text-ink/30">{yukleniyor ? 'YÜKLENİYOR…' : ozet}</span>
          {sonKaydetme && (
            <span className="text-micro tracking-genis text-ink/30">SON KAYDETME {saatMetni(sonKaydetme)}</span>
          )}

          <div className="ml-auto flex items-center gap-3">
            {/* Anahtar yalnızca acik/onChange/etiket alır; görünür yazı ile
                ekran okuyucu etiketi bu yüzden ayrı ayrı verilir. */}
            <span aria-hidden="true" className="text-micro tracking-genis text-ink/45">
              GÖRSELİ OLMAYAN ESERLER
            </span>
            <Anahtar
              acik={sadeceEksik}
              onChange={setSadeceEksik}
              etiket="Yalnızca görseli olmayan eserleri göster"
              pasif={yukleniyor || Boolean(hata)}
            />
          </div>
        </PanelCubugu>

        <div className="p-[26px]">
          {hata ? (
            <HataKutusu hata={hata} />
          ) : yukleniyor ? (
            <div className={IZGARA}>
              <Iskelet className="aspect-[3/4] w-full" adet={8} />
            </div>
          ) : (
            <>
              {/* ---------- ızgara ---------- */}
              {!sadeceEksik && (
                <>
                  <h2 id={izgaraId} className="pb-3 text-micro tracking-genis text-ink/40">
                    TÜM GÖRSELLER ({kartlar.length})
                  </h2>

                  {kartlar.length === 0 ? (
                    <p className="border border-dashed border-ink/30 px-3 py-8 text-center text-micro leading-loose tracking-[0.16em] text-ink/45">
                      {liste.length === 0
                        ? 'ARŞİVDE HENÜZ ESER YOK.'
                        : 'HENÜZ GÖRSEL YÜKLENMEDİ — AŞAĞIDAKİ LİSTEDEN BİR ESER SEÇİP EKLEYİN.'}
                    </p>
                  ) : (
                    <ul aria-labelledby={izgaraId} className={IZGARA}>
                      {kartlar.map(({ eser, gorsel, sira, toplam, ana }) => (
                        <GorselKarti
                          key={gorsel.id}
                          eser={eser}
                          gorsel={gorsel}
                          sira={sira}
                          toplam={toplam}
                          ana={ana}
                          onAc={setSeciliId}
                        />
                      ))}
                    </ul>
                  )}
                </>
              )}

              {/* ---------- görseli olmayan eserler ---------- */}
              <div className={cn(!sadeceEksik && 'mt-9 border-t border-ink/[0.14] pt-[26px]')}>
                <h2 id={eksikId} className="pb-1 text-micro tracking-genis text-ink/40">
                  GÖRSELİ OLMAYAN ESERLER ({eksikler.length})
                </h2>
                <p className="pb-3.5 text-micro tracking-[0.14em] text-ink/25">
                  GÖRSELİ OLMAYAN ESER YAYINLANAMAZ
                </p>

                {eksikler.length === 0 ? (
                  <p className="border border-dashed border-ink/[0.18] px-3 py-6 text-center text-micro tracking-[0.16em] text-ink/35">
                    {liste.length === 0 ? 'ARŞİVDE HENÜZ ESER YOK.' : 'TÜM ESERLERİN GÖRSELİ VAR.'}
                  </p>
                ) : (
                  <ul aria-labelledby={eksikId}>
                    {eksikler.map(({ eser, no }) => (
                      <EksikSatiri key={eser.id} eser={eser} no={no} onAc={setSeciliId} />
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </Panel>

      <EkranNotlari notlar={NOTLAR} />

      {/* Sözleşme A2 ile aynı: pencere eserin tamamını alır, tek bir görseli değil. */}
      {seciliEser && (
        <GorselKirpmaModali
          acik
          eser={seciliEser}
          onKapat={() => setSeciliId(null)}
          onKaydedildi={kaydedildi}
        />
      )}
    </section>
  )
}
