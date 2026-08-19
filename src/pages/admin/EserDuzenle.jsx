/**
 * A2 — Eser ekle / düzenle.
 *
 * Ölçüler tel kafesten birebir: gövde 1fr / 340px, sol sütun 30px dolgu ve
 * 24px açıklık, sağ sütun 30px/26px. Ekrandaki her rakam (arşiv numarası,
 * çember pozisyonu, karakter sayacı, görsel çözünürlüğü) veriden türetilir.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDepo, useDepoVerisi } from '../../services/DepoContext.jsx'
import {
  anaGorsel,
  bosEser,
  ESER_DURUMLARI,
  KOLEKSIYONLAR,
  NOT_SINIRI,
  yayinEngelleri,
} from '../../data/schema.js'
import { MALZEME_ETIKETI } from '../../config/tokens.js'
import HataKutusu from '../../components/common/HataKutusu.jsx'
import Iskelet from '../../components/common/Iskelet.jsx'
import LazyImage from '../../components/common/LazyImage.jsx'
import GorselKirpmaModali from '../../components/admin/GorselKirpmaModali.jsx'
import {
  Alan,
  AnahtarSatiri,
  Dugme,
  EkranBasligi,
  EkranNotlari,
  EtiketGirdisi,
  Girdi,
  MetinAlani,
  Panel,
  PanelCubugu,
  RadyoGrubu,
  Rozet,
  Secim,
} from '../../components/admin/ui.jsx'

/* Seçenek listeleri şemadan türetilir — arayüzde sabit metin tutulmaz. */
const DURUM_SECENEKLERI = Object.entries(ESER_DURUMLARI).map(([deger, etiket]) => ({ deger, etiket }))
const MALZEME_SECENEKLERI = Object.entries(MALZEME_ETIKETI).map(([deger, etiket]) => ({ deger, etiket }))

const iki = (n) => String(n).padStart(2, '0')
const sayiya = (v) => (v === '' ? null : Number(v))

const A2_NOTLARI = [
  'Malzeme sınıfı seçimi sitedeki vurgu rengini (metal / taş) otomatik atar; elle renk seçilmez.',
  '“Çemberde göster” kapatıldığında eser arşivde kalır, ana sayfa çemberinden düşer ve pozisyonlar yeniden numaralanır.',
]

/** Görsel altındaki bilgi satırı: "3:4 — 2400×3200" (gerçek ölçü). */
function gorselBilgisi(gorsel) {
  if (!gorsel) return 'GÖRSEL YOK — YAYINLANAMAZ'
  const olcu = gorsel.genislik && gorsel.yukseklik ? `${gorsel.genislik}×${gorsel.yukseklik}` : 'ÖLÇÜ BİLİNMİYOR'
  return [gorsel.oran, olcu].filter(Boolean).join(' — ')
}

/**
 * Kaydetme engelleri. Yayına alınacak eser tam denetimden geçer (A1 notu 3:
 * görseli olmayan eser yayınlanamaz); taslak/arşiv kaydında yalnızca başlık
 * aranır — yarım kalmış bir çalışmanın kaydedilebilmesi taslağın anlamıdır.
 */
function kaydetmeEngelleri(eser) {
  if (eser.durum === 'yayinda') return yayinEngelleri(eser)
  return eser.baslik?.trim() ? [] : ['Başlık zorunlu.']
}

export default function EserDuzenle() {
  const { eserId } = useParams()
  const yeniKayit = eserId === 'yeni'
  const depo = useDepo()
  const navigate = useNavigate()

  const [tazeleme, setTazeleme] = useState(0)
  const {
    veri: eserler,
    yukleniyor,
    hata,
  } = useDepoVerisi((d) => d.eserleriGetir(), [tazeleme])

  const [form, setForm] = useState(null)
  /* Karşılaştırma kopyası: form her zaman aynı nesneden yayıldığı için anahtar
     sırası korunur, bu yüzden derin eşitlik yerine JSON.stringify yeterli. */
  const [ilkHal, setIlkHal] = useState(null)
  const yuklenenId = useRef(null)

  const [modalAcik, setModalAcik] = useState(false)
  const [engeller, setEngeller] = useState([])
  const [islemHatasi, setIslemHatasi] = useState(null)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [silOnayi, setSilOnayi] = useState(false)
  const [siliniyor, setSiliniyor] = useState(false)
  const [cikisOnayi, setCikisOnayi] = useState(false)

  const bulunamadi = !yeniKayit && !yukleniyor && !hata && Boolean(eserler) && !eserler.some((e) => e.id === eserId)

  /* Formu yalnızca adres değiştiğinde doldur — depo her duyuruda tazelenir,
     bu sırada kullanıcının yazdıkları ezilmemeli. */
  useEffect(() => {
    if (yukleniyor || !eserler || yuklenenId.current === eserId) return
    const temel = bosEser(eserler.length)
    const bulunan = yeniKayit ? temel : eserler.find((e) => e.id === eserId)
    if (!bulunan) return
    /* Boş taslağın üstüne yayıyoruz: eski bir localStorage kaydında eksik alan
       varsa girdiler denetimsize düşmesin, anahtar sırası da sabit kalsın. */
    const kayit = { ...temel, ...bulunan }
    yuklenenId.current = eserId
    setForm(kayit)
    setIlkHal(JSON.stringify(kayit))
    setEngeller([])
    setIslemHatasi(null)
    setSilOnayi(false)
    setCikisOnayi(false)
  }, [eserler, yukleniyor, eserId, yeniKayit])

  const kirli = Boolean(form && ilkHal && JSON.stringify(form) !== ilkHal)

  /**
   * Sayfadan ayrılma uyarısı.
   *
   * react-router-dom 7 `useBlocker`'ı dışa aktarır, ancak kancanın gövdesi
   * `useDataRouterContext` çağırır ve veri yönlendiricisi (createBrowserRouter +
   * RouterProvider) yoksa invariant fırlatır. Bu uygulama main.jsx'te
   * <BrowserRouter> ile kuruluyor — yani useBlocker burada çalışmaz.
   * Bu yüzden yalnızca beforeunload kuruluyor; uygulama içi çıkış "İPTAL"
   * düğmesindeki onay şeridiyle korunuyor.
   */
  useEffect(() => {
    if (!kirli) return undefined
    const uyar = (olay) => {
      olay.preventDefault()
      olay.returnValue = ''
    }
    window.addEventListener('beforeunload', uyar)
    return () => window.removeEventListener('beforeunload', uyar)
  }, [kirli])

  const alanDegis = useCallback((ad, deger) => setForm((o) => (o ? { ...o, [ad]: deger } : o)), [])
  const olcuDegis = useCallback(
    (eksen, deger) => setForm((o) => (o ? { ...o, olculer: { ...o.olculer, [eksen]: sayiya(deger) } } : o)),
    [],
  )

  /* Görsel işlemlerini modal doğrudan depoya yazar; burada yalnızca yerel
     kopyayı ve karşılaştırma kopyasını eşitliyoruz ki rozet boş yere yanmasın. */
  const gorselleriTazele = useCallback((guncel) => {
    if (!guncel) return
    const gorseller = guncel.gorseller ?? []
    const anaGorselId = guncel.anaGorselId ?? null
    setForm((o) => (o ? { ...o, gorseller, anaGorselId, guncellendi: guncel.guncellendi ?? o.guncellendi } : o))
    setIlkHal((i) => {
      if (!i) return i
      const k = JSON.parse(i)
      return JSON.stringify({ ...k, gorseller, anaGorselId, guncellendi: guncel.guncellendi ?? k.guncellendi })
    })
  }, [])

  /* Arşiv numarası ve çember pozisyonu — ikisi de listeden hesaplanır. */
  const arsivNo = useMemo(() => {
    if (yeniKayit || !eserler) return null
    const i = eserler.findIndex((e) => e.id === eserId)
    return i >= 0 ? iki(i + 1) : null
  }, [eserler, eserId, yeniKayit])

  const pozisyonMetni = useMemo(() => {
    if (!form?.cemberde) return '—'
    /*
     * Sayılan küme A4 ekranıyla ve sitenin gerçekten çizdiği çemberle aynı
     * olmalı: yalnızca "çemberde" VE "yayında" olan eserler bir pozisyon işgal
     * eder. Yalnızca `cemberde`ye bakmak, A4 "14 pozisyon" derken burada
     * "03 / 15" yazılmasına yol açıyordu.
     */
    const cemberdekiler = (eserler ?? [])
      .filter((e) => e.cemberde && e.durum === 'yayinda')
      .sort((a, b) => a.sira - b.sira)
    const i = cemberdekiler.findIndex((e) => e.id === form.id)
    if (i >= 0) return `${iki(i + 1)} / ${iki(cemberdekiler.length)}`
    /* Taslak eser çemberde yer tutmaz; yayınlanınca sıranın sonuna eklenir. */
    if (form.durum !== 'yayinda') return `— / ${iki(cemberdekiler.length)} · YAYINLANINCA`
    /* Henüz kaydedilmemiş yeni eser: kaydedildiğinde sona eklenir. */
    const toplam = cemberdekiler.length + 1
    return `${iki(toplam)} / ${iki(toplam)}`
  }, [eserler, form])

  const gorsel = form ? anaGorsel(form) : null

  async function kaydet() {
    if (!form || kaydediliyor) return
    const temiz = {
      ...form,
      baslik: form.baslik.trim(),
      malzeme: form.malzeme.trim(),
      not: form.not.slice(0, NOT_SINIRI),
    }
    const bulunanlar = kaydetmeEngelleri(temiz)
    setEngeller(bulunanlar)
    setIslemHatasi(null)
    if (bulunanlar.length) return

    setKaydediliyor(true)
    try {
      if (yeniKayit) {
        /* Görsel yükleme depoda eser kimliği ister (gorselYukle(eserId, …)),
           bu yüzden yeni kayıt önce yazılır ve ekran kalıcı kimlikle yeniden
           açılır — ancak ondan sonra görsel eklenebilir. */
        const olusan = await depo.eserOlustur(temiz)
        yuklenenId.current = olusan.id // adres değişince form sıfırdan dolmasın
        setForm(olusan)
        setIlkHal(JSON.stringify(olusan))
        navigate(`/admin/eserler/${olusan.id}`, { replace: true })
      } else {
        const guncel = await depo.eserGuncelle(eserId, temiz)
        setForm(guncel)
        setIlkHal(JSON.stringify(guncel))
      }
    } catch (h) {
      setIslemHatasi(h)
    } finally {
      setKaydediliyor(false)
    }
  }

  async function sil() {
    if (siliniyor || !form?.id) return
    setSiliniyor(true)
    setIslemHatasi(null)
    try {
      await depo.eserleriSil([form.id])
      setIlkHal(JSON.stringify(form)) // ayrılırken uyarı çıkmasın
      navigate('/admin/eserler', { replace: true })
    } catch (h) {
      setIslemHatasi(h)
      setSiliniyor(false)
    }
  }

  function iptal() {
    if (kirli) {
      setCikisOnayi(true)
      return
    }
    navigate('/admin/eserler')
  }

  const yol = `/admin/eserler/${arsivNo ?? (yeniKayit ? 'yeni' : eserId)}`
  const baslikSatiri = yeniKayit
    ? 'ESERLER / YENİ KAYIT'
    : `ESERLER / ${arsivNo ?? '—'} — ${form?.baslik?.trim() || 'ADSIZ'}`

  if (hata) {
    return (
      <div>
        <EkranBasligi kod="A2" baslik="ESER EKLE / DÜZENLE" yol={yol} />
        <HataKutusu hata={hata} yenidenDene={() => setTazeleme((s) => s + 1)} />
      </div>
    )
  }

  if (bulunamadi) {
    return (
      <div>
        <EkranBasligi kod="A2" baslik="ESER EKLE / DÜZENLE" yol={yol} />
        <HataKutusu hata={{ message: 'Eser bulunamadı — arşivden silinmiş olabilir.' }} />
        <div className="pt-4">
          <Dugme onClick={() => navigate('/admin/eserler')}>ESERLERE DÖN</Dugme>
        </div>
      </div>
    )
  }

  if (yukleniyor || !form) {
    return (
      <div>
        <EkranBasligi kod="A2" baslik="ESER EKLE / DÜZENLE" yol={yol} />
        <Panel>
          <PanelCubugu>
            <Iskelet className="w-[280px]" yukseklik={12} />
          </PanelCubugu>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px]">
            <div className="grid gap-6 px-[30px] pb-10 pt-[30px] lg:border-r lg:border-ink/12">
              <Iskelet yukseklik={38} adet={3} className="w-full" />
              <Iskelet yukseklik={130} className="w-full" />
              <Iskelet yukseklik={38} className="w-full" />
            </div>
            <div className="grid gap-6 px-[26px] py-[30px]">
              <Iskelet yukseklik={250} className="w-full" />
              <Iskelet yukseklik={36} adet={2} className="w-full" />
            </div>
          </div>
        </Panel>
        <EkranNotlari notlar={A2_NOTLARI} />
      </div>
    )
  }

  const gorselEklenebilir = Boolean(form.id)

  return (
    <div>
      <EkranBasligi kod="A2" baslik="ESER EKLE / DÜZENLE" yol={yol} />

      <Panel>
        <PanelCubugu>
          <h1 className="text-mini tracking-genis text-ink/40">{baslikSatiri}</h1>
          {kirli && (
            <span className="ml-auto">
              <Rozet tur="degisti">KAYDEDİLMEMİŞ DEĞİŞİKLİK</Rozet>
            </span>
          )}
        </PanelCubugu>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px]">
          {/* ---------- sol sütun: eser bilgileri ---------- */}
          <div className="grid gap-6 px-[30px] pb-10 pt-[30px] lg:border-r lg:border-ink/12">
            <h2 className="sr-only">Eser bilgileri</h2>

            <Alan etiket="BAŞLIK" zorunlu>
              <Girdi
                value={form.baslik}
                onChange={(e) => alanDegis('baslik', e.target.value)}
                aria-label="Başlık"
                autoComplete="off"
              />
            </Alan>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Alan etiket="MALZEME SINIFI" zorunlu ipucu="→ SİTEDE VURGU RENGİNİ BELİRLER">
                <RadyoGrubu
                  ad="Malzeme sınıfı"
                  deger={form.malzemeSinifi}
                  onChange={(v) => alanDegis('malzemeSinifi', v)}
                  secenekler={MALZEME_SECENEKLERI}
                />
              </Alan>

              <Alan etiket="MALZEME METNİ" zorunlu>
                <Girdi
                  value={form.malzeme}
                  onChange={(e) => alanDegis('malzeme', e.target.value)}
                  aria-label="Malzeme metni"
                  placeholder="DÖVME ÇELİK"
                  autoComplete="off"
                />
              </Alan>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-[100px_1fr]">
              <Alan etiket="YIL" zorunlu>
                <Girdi
                  type="number"
                  inputMode="numeric"
                  value={form.yil ?? ''}
                  onChange={(e) => alanDegis('yil', sayiya(e.target.value))}
                  aria-label="Yıl"
                />
              </Alan>

              <Alan etiket="ÖLÇÜLER (Y × G × D, CM)">
                <div className="flex items-center gap-2.5">
                  {[
                    ['y', 'Yükseklik'],
                    ['g', 'Genişlik'],
                    ['d', 'Derinlik'],
                  ].map(([eksen, etiket], i) => (
                    <div key={eksen} className="flex flex-1 items-center gap-2.5">
                      {i > 0 && (
                        <span aria-hidden="true" className="text-ink/30">
                          ×
                        </span>
                      )}
                      <Girdi
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={form.olculer?.[eksen] ?? ''}
                        onChange={(e) => olcuDegis(eksen, e.target.value)}
                        aria-label={`${etiket} (cm)`}
                      />
                    </div>
                  ))}
                </div>
              </Alan>
            </div>

            <Alan etiket={`ESER NOTU (OPSİYONEL, MAKS. ${NOT_SINIRI} KARAKTER)`}>
              <MetinAlani
                className="h-[130px]"
                sinir={NOT_SINIRI}
                maxLength={NOT_SINIRI}
                value={form.not}
                onChange={(e) => alanDegis('not', e.target.value)}
                aria-label="Eser notu"
              />
            </Alan>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Alan etiket="ETİKETLER">
                <EtiketGirdisi etiketler={form.etiketler} onChange={(v) => alanDegis('etiketler', v)} />
              </Alan>

              <Alan etiket="KOLEKSİYON / SAHİPLİK">
                <Secim
                  value={form.koleksiyon}
                  onChange={(e) => alanDegis('koleksiyon', e.target.value)}
                  secenekler={KOLEKSIYONLAR}
                  aria-label="Koleksiyon / sahiplik"
                />
              </Alan>
            </div>
          </div>

          {/* ---------- sağ sütun: görsel, yayın durumu, eylemler ---------- */}
          <div className="grid content-start gap-6 px-[26px] py-[30px]">
            <h2 className="sr-only">Görsel ve yayın</h2>

            <div>
              <div className="pb-2.5 text-micro tracking-genis text-ink/40">BİRİNCİL GÖRSEL</div>
              <div className="relative">
                <LazyImage
                  gorselId={gorsel?.id ?? null}
                  alt={gorsel?.alt || ''}
                  className="h-[250px] w-full border border-ink/22"
                />
                <span className="pointer-events-none absolute bottom-3 left-3 text-micro tracking-[0.16em] text-ink/45">
                  {gorselBilgisi(gorsel)}
                </span>
              </div>
              <div className="flex gap-2 pt-2.5">
                <Dugme onClick={() => setModalAcik(true)} disabled={!gorselEklenebilir}>
                  DEĞİŞTİR
                </Dugme>
                <Dugme onClick={() => setModalAcik(true)} disabled={!gorselEklenebilir}>
                  KIRP → A3
                </Dugme>
              </div>
              {!gorselEklenebilir && (
                <div className="pt-2 text-micro tracking-[0.14em] text-ink/30">
                  GÖRSEL EKLEMEK İÇİN ÖNCE KAYDEDİN
                </div>
              )}
            </div>

            <div className="grid gap-4 border-t border-ink/[0.14] pt-[22px]">
              <Alan etiket="DURUM">
                <Secim
                  /* tel kafeste durum kutusu 36px — ilkelin 38px'ini kesin biçimde ezer */
                  className="!h-9"
                  value={form.durum}
                  onChange={(e) => alanDegis('durum', e.target.value)}
                  secenekler={DURUM_SECENEKLERI}
                  aria-label="Durum"
                />
              </Alan>

              <AnahtarSatiri
                etiket="ÇEMBERDE GÖSTER"
                acik={form.cemberde}
                onChange={(v) => alanDegis('cemberde', v)}
                ipucu={form.cemberde ? undefined : 'ARŞİVDE KALIR, ÇEMBERDEN DÜŞER, POZİSYONLAR YENİDEN NUMARALANIR'}
              />

              <div className="flex items-center justify-between text-micro tracking-[0.16em] text-ink/40">
                <span>ÇEMBER POZİSYONU</span>
                <span className="text-ink">{pozisyonMetni}</span>
              </div>
            </div>

            {engeller.length > 0 && (
              <HataKutusu hata={{ message: `Kaydedilemedi. ${engeller.join(' ')}` }} />
            )}
            {islemHatasi && <HataKutusu hata={islemHatasi} />}

            <div className="flex gap-2.5 border-t border-ink/[0.14] pt-[22px]">
              <Dugme tur="birincil" className="flex-1 text-center" onClick={kaydet} disabled={kaydediliyor}>
                {kaydediliyor ? 'KAYDEDİLİYOR…' : 'KAYDET'}
              </Dugme>
              <Dugme onClick={iptal}>İPTAL</Dugme>
            </div>

            {cikisOnayi && (
              <div role="alert" className="border border-tas/45 bg-tas/[0.07] p-3">
                <div className="text-micro tracking-[0.16em] text-tas">KAYDEDİLMEMİŞ DEĞİŞİKLİK VAR</div>
                <div className="flex gap-2 pt-3">
                  <Dugme tur="tehlike" onClick={() => navigate('/admin/eserler')}>
                    KAYDETMEDEN ÇIK
                  </Dugme>
                  <Dugme tur="sade" onClick={() => setCikisOnayi(false)}>
                    VAZGEÇ
                  </Dugme>
                </div>
              </div>
            )}

            {!yeniKayit && form.id && (
              <div>
                {silOnayi ? (
                  <div role="alert" className="border border-tas/45 p-3">
                    <div className="text-micro tracking-[0.16em] text-tas">
                      BU ESER VE GÖRSELLERİ SİLİNECEK — GERİ ALINAMAZ
                    </div>
                    <div className="flex gap-2 pt-3">
                      <Dugme tur="tehlike" onClick={sil} disabled={siliniyor}>
                        {siliniyor ? 'SİLİNİYOR…' : 'SİL'}
                      </Dugme>
                      <Dugme tur="sade" onClick={() => setSilOnayi(false)} disabled={siliniyor}>
                        VAZGEÇ
                      </Dugme>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setSilOnayi(true)}
                    className="text-micro leading-loose tracking-[0.16em] text-ink/[0.28] transition-colors hover:text-tas"
                  >
                    SİL — GERİ ALINAMAZ
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </Panel>

      <EkranNotlari notlar={A2_NOTLARI} />

      <GorselKirpmaModali
        acik={modalAcik}
        eser={form}
        onKapat={() => setModalAcik(false)}
        onKaydedildi={gorselleriTazele}
      />
    </div>
  )
}
