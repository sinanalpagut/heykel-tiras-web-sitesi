/**
 * A5 — Sergi kayıtları.
 *
 * Tel kafesin dili korunur: aynı ızgara, 16px boşluk, yıl azalan sıra, altta
 * kesikli çerçeveli satır içi ekleme satırı, "···" satır menüsü, numaralı ekran
 * notları. Tel kafeste olmayan tek sütun DURUM'dur — sergiler artık siteye
 * duyuru şeridi olarak çıktığı için hangi kaydın yayında olduğu tabloda
 * görünmek zorunda; yer MEKAN/ŞEHİR/TÜR sütunlarından kısılarak açıldı.
 *
 * Ekrandaki her rakam (üst çubuk sayaçları, ESER sütunu, durum, geri sayım,
 * afiş çözünürlüğü ve dosya boyutu) veriden türetilir; sabit rakam yoktur.
 */
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDepo, useDepoVerisi } from '../../services/DepoContext.jsx'
import {
  bosSergi,
  ESER_DURUMLARI,
  geriSayim,
  SERGI_DURUM_ETIKETLERI,
  SERGI_TURLERI,
  sergiDurumu,
  sergiEngelleri,
  tarihAraligiMetni,
} from '../../data/schema.js'
import Iskelet from '../../components/common/Iskelet.jsx'
import HataKutusu from '../../components/common/HataKutusu.jsx'
import LazyImage from '../../components/common/LazyImage.jsx'
import { bayt, dosyayiOku, KABUL_EDILEN, kirpVeOlcekle, MAKS_BAYT } from '../../utils/goruntu.js'
import {
  Alan,
  Dugme,
  EkranBasligi,
  EkranNotlari,
  Girdi,
  MetinAlani,
  Panel,
  PanelCubugu,
  RadyoGrubu,
  Rozet,
  Secim,
  cn,
} from '../../components/admin/ui.jsx'

/* Sütunlar tek yerde tanımlı: ızgara şablonu, başlık metinleri ve ARIA sütun
   sayısı hep buradan türer, böylece sütun eklemek tek satırlık iş oluyor. */
const SUTUNLAR = [
  { ad: 'YIL', genislik: '70px' },
  { ad: 'SERGİ', genislik: '1fr' },
  { ad: 'MEKAN', genislik: '200px' },
  { ad: 'ŞEHİR', genislik: '120px' },
  { ad: 'TÜR', genislik: '90px' },
  { ad: 'DURUM', genislik: '118px' },
  { ad: 'ESER', genislik: '60px' },
  { ad: '', genislik: '30px', etiket: 'İşlemler' },
]

const IZGARA = 'grid gap-4'
/* grid-cols yalnızca sabit sınıf adıyla derlenebildiği için şablon satır içi
   stille veriliyor; kaynak yine tek: SUTUNLAR. */
const IZGARA_STILI = { gridTemplateColumns: SUTUNLAR.map((s) => s.genislik).join(' ') }

/* Satır içi girdiler tel kafeste 32px; ui.jsx'teki 38px'lik temeli bilinçli eziyoruz. */
const KOMPAKT = '!h-8 !px-2.5 !text-mini !tracking-[0.08em]'

const TUR_SECENEKLERI = [
  { deger: 'kisisel', etiket: SERGI_TURLERI.kisisel },
  { deger: 'grup', etiket: SERGI_TURLERI.grup },
]

/* Durum yalnızca renkle anlatılmaz — hücrede etiketin kendisi yazılıdır. */
const DURUM_RENKLERI = {
  yaklasan: 'text-tas',
  suruyor: 'text-metal',
  gecmis: 'text-ink/45',
  tarihsiz: 'text-ink/30',
}

/* Afiş uzun kenarı. Eser görselleri 2400/3200'e çıkar; afiş yalnızca duyuru
   şeridinde ve sergi kartında görünüyor, 1600 fazlasıyla yeter. */
const AFIS_UZUN_KENAR = 1600

/* Arşiv tek dilde ve tek biçimde kalsın diye kayıtlar büyük harfe çevrilir.
   Türkçe yerel ayarı şart: "i" → "İ" (GALERİ), "ı" → "I". */
const buyuk = (m) => (m || '').trim().toLocaleUpperCase('tr-TR')

const bosSatir = () => ({ yil: '', ad: '', mekan: '', sehir: '', tur: 'kisisel', eserIdleri: [] })

const satirlariSirala = (liste) =>
  liste.slice().sort((a, b) => b.yil - a.yil || a.ad.localeCompare(b.ad, 'tr'))

/* ---------- tarih dönüşümü ---------- */

/**
 * Depo epoch ms tutar, <input type="date"> "YYYY-MM-DD" ister. Dönüşüm iki
 * yönde de UTC üzerinden yapılır ve YEREL saat dilimi hiç işe karışmaz:
 * `new Date(2026, 9, 29)` yerel gece yarısını kurar, UTC+3'te toISOString()
 * bunu 28 EKİM 21:00'e çevirir ve tarih bir gün geri kayar. Tohum veri de
 * Date.UTC ile yazıldığı için iki taraf aynı eksende buluşur.
 */
const msdenGirdiye = (ms) => (ms == null ? '' : new Date(ms).toISOString().slice(0, 10))

const girdidenMse = (metin) => {
  if (!metin) return null
  const [y, a, g] = metin.split('-').map(Number)
  if (!y || !a || !g) return null
  return Date.UTC(y, a - 1, g)
}

/* ---------- denetim ---------- */

/**
 * Tek denetim kaynağı: hem satır içi ekleme hem düzenleme paneli buradan geçer.
 * Şemanın `sergiEngelleri`'ne yalnızca bu ekrana özgü yıl kuralı eklenir —
 * yıl sütunu tabloda ve CV çıktısında sıralama anahtarı olduğu için boş kalamaz.
 */
function tumEngeller(kayit) {
  const engeller = sergiEngelleri(kayit)
  if (!/^\d{4}$/.test(String(kayit.yil ?? '').trim())) engeller.push('Yıl dört haneli olmalı.')
  return engeller
}

/* sergiEngelleri düz cümleler döndürür; hangi alanın altına yazılacağı burada
   eşleştirilir. Eşleşmeyen bir engel (şemaya sonradan eklenen bir kural)
   sessizce kaybolmasın diye "genel" listesine düşer. */
const ENGEL_ESLEMESI = [
  ['ad', /sergi ad/i],
  ['mekan', /mekan/i],
  ['bitis', /bitiş tarihi/i],
  ['baglanti', /bağlantı/i],
  ['yil', /yıl/i],
]

function engelleriDagit(engeller) {
  const harita = { genel: [] }
  for (const e of engeller) {
    const eslesme = ENGEL_ESLEMESI.find(([, kalip]) => kalip.test(e))
    if (eslesme) harita[eslesme[0]] = e
    else harita.genel.push(e)
  }
  return harita
}

/* ---------- yama üretimi ---------- */

/** Tablodaki altı temel alan — satır içi ekleme yalnızca bunları yazar. */
const temelYama = (t) => ({
  yil: Number(t.yil),
  ad: buyuk(t.ad),
  mekan: buyuk(t.mekan),
  sehir: buyuk(t.sehir),
  tur: t.tur,
  eserIdleri: t.eserIdleri,
})

/** Düzenleme paneli tüm sözleşmeyi yazar (afiş hariç; onun kendi uç noktası var). */
const panelYamasi = (t) => ({
  ...temelYama(t),
  baslangic: girdidenMse(t.baslangic),
  bitis: girdidenMse(t.bitis),
  aciklama: t.aciklama.trim(),
  baglanti: t.baglanti.trim(),
})

/**
 * Yeni kayıt şemadaki tam şekille doğsun: tarih/açıklama/afiş alanları hiç
 * yazılmazsa sonradan açılan düzenleme paneli tanımsız değerlerle uğraşır.
 * Kimliği depo üretir, o yüzden dışarıda bırakılıyor.
 */
function olusturmaYamasi(taslak) {
  const { id, ...temel } = bosSergi() // eslint-disable-line no-unused-vars
  return { ...temel, ...temelYama(taslak) }
}

/** Denetim için sergi şeklinde bir aday üretir. */
const adayKayit = (t, tamMi) => (tamMi ? panelYamasi(t) : olusturmaYamasi(t))

/** Kayıttan düzenleme taslağına: tarihler girdi biçimine, sayılar metne döner. */
const taslagaCevir = (s) => ({
  yil: String(s.yil ?? ''),
  ad: s.ad || '',
  mekan: s.mekan || '',
  sehir: s.sehir || '',
  tur: s.tur || 'kisisel',
  baslangic: msdenGirdiye(s.baslangic),
  bitis: msdenGirdiye(s.bitis),
  aciklama: s.aciklama || '',
  baglanti: s.baglanti || '',
  eserIdleri: [...(s.eserIdleri || [])],
})

/* ---------- CV çıktısı ---------- */

/** Not 2: yıl azalan sırayla, kişisel sergiler önce gruplanır. */
function cvMetniUret(sergiler) {
  const satir = (s) => `${s.yil}  ${[s.ad, s.mekan, s.sehir].filter(Boolean).join(', ')}`
  const bolum = (baslik, liste) => (liste.length ? [baslik, '', ...satirlariSirala(liste).map(satir), ''] : [])
  return [
    'KESE BENAV — SERGİLER',
    '',
    ...bolum('KİŞİSEL SERGİLER', sergiler.filter((s) => s.tur === 'kisisel')),
    ...bolum('GRUP SERGİLERİ', sergiler.filter((s) => s.tur === 'grup')),
  ]
    .join('\n')
    .trimEnd()
    .concat('\n')
}

function cvIndir(sergiler) {
  // BOM olmadan bazı masaüstü düzenleyicileri UTF-8'i yerel kod sayfası sanıp
  // Türkçe karakterleri bozuyor.
  const blob = new Blob(['\ufeff', cvMetniUret(sergiler)], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const bag = document.createElement('a')
  bag.href = url
  bag.download = 'kese-benav-sergiler.txt'
  document.body.appendChild(bag)
  bag.click()
  bag.remove()
  URL.revokeObjectURL(url)
}

/* ---------- eser seçici ---------- */

/**
 * Arşivden çoklu seçim (Not 1). Esc ve dışarı tıklama ile kapanır, odağı içeride
 * tutar; seçim anında taslağa yazılır, kayıtla birlikte sergi.eserIdleri güncellenir.
 */
function EserSecici({ eserler, sergiler, secili, onChange, onKapat, yon = 'asagi' }) {
  const kapsayici = useRef(null)
  const [arama, setArama] = useState('')

  useEffect(() => {
    kapsayici.current?.querySelector('input')?.focus()
  }, [])

  const tuslar = (olay) => {
    if (olay.key === 'Escape') {
      olay.preventDefault()
      olay.stopPropagation() // satır içi düzenlemeyi/paneli de kapatmasın
      onKapat()
      return
    }
    /* Seçici satır içi satırın/formun içinde duruyor; Enter yukarı sızarsa
       kaydı erkenden kapatır. Onay kutusu düğmeleri çalışsın diye yalnızca
       arama kutusunda varsayılan davranış (form gönderimi) engellenir. */
    if (olay.key === 'Enter') {
      olay.stopPropagation()
      if (olay.target.tagName === 'INPUT') olay.preventDefault()
      return
    }
    if (olay.key !== 'Tab') return
    const odaklanabilir = kapsayici.current?.querySelectorAll('button, input')
    if (!odaklanabilir?.length) return
    const ilk = odaklanabilir[0]
    const son = odaklanabilir[odaklanabilir.length - 1]
    if (olay.shiftKey && document.activeElement === ilk) {
      olay.preventDefault()
      son.focus()
    } else if (!olay.shiftKey && document.activeElement === son) {
      olay.preventDefault()
      ilk.focus()
    }
  }

  const anahtar = arama.trim().toLocaleLowerCase('tr-TR')
  const listelenen = useMemo(() => {
    const sirali = eserler
      .slice()
      .sort((a, b) => b.yil - a.yil || a.baslik.localeCompare(b.baslik, 'tr'))
    if (!anahtar) return sirali
    return sirali.filter((e) =>
      [e.baslik, e.malzeme, String(e.yil), ...(e.etiketler || [])]
        .join(' ')
        .toLocaleLowerCase('tr-TR')
        .includes(anahtar),
    )
  }, [eserler, anahtar])

  /* İki yönlü bağın eser tarafı: bu eser kaç sergide geçiyor? */
  const sergiSayisi = useMemo(() => {
    const harita = new Map()
    for (const s of sergiler) for (const id of s.eserIdleri || []) harita.set(id, (harita.get(id) || 0) + 1)
    return harita
  }, [sergiler])

  const kume = new Set(secili)
  const degistir = (id) => {
    const yeni = kume.has(id) ? secili.filter((x) => x !== id) : [...secili, id]
    onChange(yeni)
  }

  return (
    <>
      <div className="fixed inset-0 z-40" aria-hidden="true" onMouseDown={onKapat} />
      <div
        ref={kapsayici}
        role="dialog"
        aria-modal="true"
        aria-label="Sergiye eser seç"
        onKeyDown={tuslar}
        className={cn(
          'absolute right-0 z-50 w-[360px] border border-ink/25 bg-admin-panel shadow-[0_18px_46px_rgba(0,0,0,.55)]',
          yon === 'yukari' ? 'bottom-full mb-2' : 'top-full mt-2',
        )}
      >
        <div className="border-b border-ink/15 p-3">
          <Girdi
            value={arama}
            onChange={(o) => setArama(o.target.value)}
            placeholder="ESERLERDE ARA…"
            aria-label="Eserlerde ara"
            className={KOMPAKT}
          />
        </div>

        <ul className="max-h-[260px] overflow-y-auto">
          {listelenen.length === 0 && (
            <li className="px-3 py-6 text-center text-micro tracking-genis text-ink/30">EŞLEŞEN ESER YOK</li>
          )}
          {listelenen.map((e) => {
            const isaretli = kume.has(e.id)
            const bagli = sergiSayisi.get(e.id) || 0
            return (
              <li key={e.id}>
                {/* Satırın tamamı onay kutusudur; iç içe düğme kurmamak için
                    12×12 kare yalnızca görsel işaret olarak çizilir. */}
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isaretli}
                  onClick={() => degistir(e.id)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-ink/[0.05]"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'h-3 w-3 shrink-0 border',
                      isaretli ? 'border-ink/50 bg-ink/25' : 'border-ink/30',
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={cn('block truncate text-mini tracking-[0.08em]', isaretli ? 'text-ink' : 'text-ink/70')}>
                      {e.baslik || 'ADSIZ ESER'}
                    </span>
                    <span className="block pt-0.5 text-micro tracking-[0.14em] text-ink/30">
                      {e.yil}
                      {e.durum !== 'yayinda' && ` · ${ESER_DURUMLARI[e.durum]}`}
                      {bagli > 0 && ` · ${bagli} SERGİ`}
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="flex items-center justify-between border-t border-ink/15 px-3 py-2.5">
          <span className="text-micro tracking-[0.16em] text-ink/40">
            {secili.length} / {eserler.length} SEÇİLİ
          </span>
          <div className="flex gap-2">
            {secili.length > 0 && (
              <Dugme tur="sade" onClick={() => onChange([])}>
                TEMİZLE
              </Dugme>
            )}
            <Dugme tur="ikincil" onClick={onKapat}>
              KAPAT
            </Dugme>
          </div>
        </div>
      </div>
    </>
  )
}

/** Kompakt "ESER SEÇ" alanı + açılır seçici. */
function EserAlani({ eserler, sergiler, secili, onChange, yon, boySinifi = 'h-8' }) {
  const [acik, setAcik] = useState(false)
  const dugme = useRef(null)

  const kapat = useCallback(() => {
    setAcik(false)
    dugme.current?.focus()
  }, [])

  return (
    <div className="relative">
      <button
        ref={dugme}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={acik}
        onClick={() => setAcik((a) => !a)}
        className={cn(
          'flex w-full items-center border border-ink/20 bg-ink/[0.03] px-2 text-micro tracking-[0.14em] transition-colors hover:border-ink/45',
          boySinifi,
          secili.length ? 'text-ink/70' : 'text-ink/35',
        )}
      >
        {secili.length ? `${secili.length} ESER` : 'ESER SEÇ'}
      </button>
      {acik && (
        <EserSecici
          eserler={eserler}
          sergiler={sergiler}
          secili={secili}
          onChange={onChange}
          onKapat={kapat}
          yon={yon}
        />
      )}
    </div>
  )
}

/* ---------- satır menüsü ---------- */

/** "···" menüsü — DÜZENLE / SİL; silme iki adımlı onay ister. */
function SatirMenusu({ sergi, onDuzenle, onSil, islemde }) {
  const [acik, setAcik] = useState(false)
  const [onay, setOnay] = useState(false)
  const kapsayici = useRef(null)
  const dugme = useRef(null)

  const kapat = useCallback(() => {
    setAcik(false)
    setOnay(false)
  }, [])

  useEffect(() => {
    if (!acik) return undefined
    const disari = (o) => {
      if (!kapsayici.current?.contains(o.target)) kapat()
    }
    const esc = (o) => {
      if (o.key === 'Escape') {
        kapat()
        dugme.current?.focus()
      }
    }
    document.addEventListener('mousedown', disari)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', disari)
      document.removeEventListener('keydown', esc)
    }
  }, [acik, kapat])

  return (
    <div ref={kapsayici} className="relative flex justify-end">
      <button
        ref={dugme}
        type="button"
        aria-haspopup="menu"
        aria-expanded={acik}
        aria-label={`${sergi.ad} kaydı için işlemler`}
        onClick={() => setAcik((a) => !a)}
        className="px-1 text-mini leading-none text-ink/40 transition-colors hover:text-ink"
      >
        ···
      </button>

      {acik && (
        <div
          role={onay ? 'dialog' : 'menu'}
          aria-label={onay ? `${sergi.ad} kaydını silme onayı` : `${sergi.ad} işlemleri`}
          className="absolute right-0 top-6 z-50 w-[168px] border border-ink/25 bg-admin-panel shadow-[0_18px_46px_rgba(0,0,0,.55)]"
        >
          {onay ? (
            <div className="p-3">
              <p className="text-micro leading-relaxed tracking-[0.12em] text-ink/60">
                {sergi.ad} KAYDI SİLİNSİN Mİ?
              </p>
              <div className="flex gap-2 pt-3">
                <Dugme
                  tur="tehlike"
                  disabled={islemde}
                  onClick={() => {
                    kapat()
                    onSil()
                  }}
                >
                  SİL
                </Dugme>
                <Dugme tur="sade" onClick={kapat}>
                  VAZGEÇ
                </Dugme>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  kapat()
                  onDuzenle()
                }}
                className="block w-full px-3.5 py-2.5 text-left text-micro tracking-genis text-ink/70 transition-colors hover:bg-ink/[0.06] hover:text-ink"
              >
                DÜZENLE
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => setOnay(true)}
                className="block w-full border-t border-ink/10 px-3.5 py-2.5 text-left text-micro tracking-genis text-tas/80 transition-colors hover:bg-tas/10 hover:text-tas"
              >
                SİL
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ---------- satır içi ekleme alanları ---------- */

/**
 * Ekleme satırının hücreleri. Modül düzeyinde durur: render içinde
 * tanımlansaydı her tuş vuruşunda yeni bir bileşen türü doğar, girdiler
 * yeniden kurulup odağı kaybederdi.
 */
function EklemeAlanlari({ taslak, degistir, eserler, sergiler, yilRef }) {
  return (
    <>
      <Girdi
        ref={yilRef}
        value={taslak.yil}
        onChange={(o) => degistir({ yil: o.target.value.replace(/[^\d]/g, '').slice(0, 4) })}
        inputMode="numeric"
        placeholder="YIL"
        aria-label="Yeni kayıt — yıl"
        className={KOMPAKT}
      />
      <Girdi
        value={taslak.ad}
        onChange={(o) => degistir({ ad: o.target.value })}
        placeholder="SERGİ ADI"
        aria-label="Yeni kayıt — sergi adı"
        className={KOMPAKT}
      />
      <Girdi
        value={taslak.mekan}
        onChange={(o) => degistir({ mekan: o.target.value })}
        placeholder="MEKAN"
        aria-label="Yeni kayıt — mekan"
        className={KOMPAKT}
      />
      <Girdi
        value={taslak.sehir}
        onChange={(o) => degistir({ sehir: o.target.value })}
        placeholder="ŞEHİR"
        aria-label="Yeni kayıt — şehir"
        className={KOMPAKT}
      />
      <Secim
        value={taslak.tur}
        onChange={(o) => degistir({ tur: o.target.value })}
        secenekler={TUR_SECENEKLERI}
        aria-label="Yeni kayıt — tür"
        className={cn(KOMPAKT, '!pr-7')}
      />
      {/* Ekleme satırında tarih alanı yok; yeni kayıt kaçınılmaz olarak
          tarihsiz doğar ve bunu gizlemek yerine yazıyoruz. */}
      <div className="text-micro tracking-[0.14em] text-ink/30">{SERGI_DURUM_ETIKETLERI.tarihsiz}</div>
      <EserAlani
        eserler={eserler}
        sergiler={sergiler}
        secili={taslak.eserIdleri}
        onChange={(idler) => degistir({ eserIdleri: idler })}
        yon="yukari"
      />
    </>
  )
}

/* ---------- afiş yükleyici ---------- */

/**
 * Sergi afişi — bu ekrana özgü kompakt yükleyici.
 *
 * Eser görsellerinin kırpma modalı bilinçli olarak kullanılmıyor: o modal
 * çember kartı için 3:4'e zorlar, afiş ise galeriden geldiği oranla durmalı.
 * Bu yüzden kırpma yok (kirpma: null → tam kare), yalnızca uzun kenarı
 * AFIS_UZUN_KENAR'a indiren yeniden ölçekleme var.
 */
function AfisYukleyici({ sergi, depo, kilitli }) {
  const dosyaRef = useRef(null)
  const altRef = useRef(null)
  const [hazir, setHazir] = useState(null) // {blob, genislik, yukseklik, tur, kaynakAdi, onizleme}
  const hazirRef = useRef(null)
  const [alt, setAlt] = useState('')
  const [degistirModu, setDegistirModu] = useState(false)
  const [suruklu, setSuruklu] = useState(false)
  const [isleniyor, setIsleniyor] = useState(false)
  const [yukleniyor, setYukleniyor] = useState(false)
  const [silOnayi, setSilOnayi] = useState(false)
  const [hata, setHata] = useState(null)

  const destekli = typeof depo.afisYukle === 'function' && typeof depo.afisSil === 'function'
  const mevcut = sergi.afis || null
  const mesgul = isleniyor || yukleniyor || kilitli

  /**
   * Bekleyen afiş hep bu kapıdan geçirilir: önizleme adresi blob ile aynı anda
   * doğar ve yerine yenisi geçtiğinde bırakılır. Bırakılmazsa 1600px'lik blob
   * sekme kapanana kadar bellekte kalır — kullanıcı birkaç dosya deneyince
   * birikir. Ref, temizliğin render sırasından bağımsız çalışması için.
   */
  const hazirAta = useCallback((yeniHazir) => {
    if (hazirRef.current?.onizleme) URL.revokeObjectURL(hazirRef.current.onizleme)
    hazirRef.current = yeniHazir
    setHazir(yeniHazir)
  }, [])

  useEffect(
    () => () => {
      if (hazirRef.current?.onizleme) URL.revokeObjectURL(hazirRef.current.onizleme)
    },
    [],
  )

  async function dosyaAl(dosya) {
    if (!dosya) return
    setHata(null)
    if (dosya.size > MAKS_BAYT) {
      setHata(`DOSYA ÇOK BÜYÜK (${bayt(dosya.size)}) — EN ÇOK ${bayt(MAKS_BAYT)}.`)
      return
    }
    setIsleniyor(true)
    let okunan = null
    try {
      okunan = await dosyayiOku(dosya)
      /* Küçük dosyayı büyütmek ayrıntı kazandırmaz, yalnızca bayt şişirir;
         ölçek 1'i aşmıyor. */
      const olcek = Math.min(1, AFIS_UZUN_KENAR / Math.max(okunan.genislik, okunan.yukseklik))
      const uretilen = await kirpVeOlcekle({
        kaynak: okunan.bitmap,
        kirpma: null, // afiş kırpılmaz — kare olduğu gibi ölçeklenir
        hedefGenislik: Math.round(okunan.genislik * olcek),
        hedefYukseklik: Math.round(okunan.yukseklik * olcek),
        tur: 'image/webp',
      })
      hazirAta({ ...uretilen, kaynakAdi: dosya.name, onizleme: URL.createObjectURL(uretilen.blob) })
      // Afiş değiştiriliyorsa eski alt metni iyi bir başlangıç noktası.
      setAlt((a) => a || mevcut?.alt || '')
    } catch (h) {
      setHata(h?.message || 'GÖRSEL İŞLENEMEDİ.')
    } finally {
      okunan?.bitmap?.close?.() // ImageBitmap belleği hemen bırakılsın
      setIsleniyor(false)
    }
  }

  function vazgec() {
    hazirAta(null)
    setDegistirModu(false)
    setHata(null)
  }

  async function yukle() {
    if (!sergi.id) {
      setHata('AFİŞ İÇİN ÖNCE KAYDI OLUŞTURUN.')
      return
    }
    if (!hazir) {
      setHata('ÖNCE BİR DOSYA SEÇİN.')
      return
    }
    const altMetni = alt.trim()
    if (!altMetni) {
      // Alt metin olmadan afiş, ekran okuyucu kullanan ziyaretçi için hiç yok demek.
      setHata('ALT METİN ZORUNLU — AFİŞİ GÖREMEYEN ZİYARETÇİ BU METNİ OKUR.')
      altRef.current?.focus()
      return
    }
    setYukleniyor(true)
    setHata(null)
    try {
      await depo.afisYukle(sergi.id, hazir.blob, {
        alt: altMetni,
        genislik: hazir.genislik,
        yukseklik: hazir.yukseklik,
        kaynakAdi: hazir.kaynakAdi,
        oran: 'serbest',
      })
      hazirAta(null)
      setAlt('')
      setDegistirModu(false)
    } catch (h) {
      setHata(h?.message || 'AFİŞ YÜKLENEMEDİ.')
    } finally {
      setYukleniyor(false)
    }
  }

  async function sil() {
    setYukleniyor(true)
    setHata(null)
    try {
      await depo.afisSil(sergi.id)
      setSilOnayi(false)
    } catch (h) {
      setHata(h?.message || 'AFİŞ SİLİNEMEDİ.')
    } finally {
      setYukleniyor(false)
    }
  }

  if (!destekli) {
    return (
      <Alan etiket="AFİŞ">
        <p className="border border-dashed border-ink/25 p-4 text-micro leading-loose tracking-[0.14em] text-ink/35">
          BU DEPO AFİŞ YÜKLEMEYİ DESTEKLEMİYOR.
        </p>
      </Alan>
    )
  }

  const alanEtiketi = `AFİŞ${mevcut ? '' : ' — YOK'}`

  return (
    <Alan etiket={alanEtiketi}>
      {/* Hata etiketin hemen altında duruyor: Alan'ın kendi hata satırı bloğun
          en dibine düşerdi, oysa mesajın çoğu dosya seçimiyle ilgili. */}
      {hata && (
        <p role="alert" className="pb-3 text-micro leading-loose tracking-[0.14em] text-tas">
          {hata}
        </p>
      )}

      {mevcut && !hazir && !degistirModu ? (
        <div className="grid gap-3">
          <LazyImage
            gorselId={mevcut.id}
            alt={mevcut.alt || `${sergi.ad} sergisinin afişi`}
            className="h-[190px] w-full border border-ink/15"
            gorselSinifi="h-full w-full object-contain"
          />
          <p className="text-micro leading-loose tracking-[0.14em] text-ink/35">
            {[
              mevcut.genislik && mevcut.yukseklik ? `${mevcut.genislik}×${mevcut.yukseklik}` : null,
              mevcut.kaynakBayt ? bayt(mevcut.kaynakBayt) : null,
              mevcut.kaynakAdi || null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p className="text-micro leading-loose tracking-[0.12em] text-ink/45">
            ALT: {mevcut.alt || '— ALT METİN YOK —'}
          </p>

          {silOnayi ? (
            <div
              /* Esc önce bu onayı geri alsın; düzenleme panelini kapatmak
                 istiyorsa kullanıcı ikinci kez basar. */
              onKeyDown={(o) => {
                if (o.key !== 'Escape') return
                o.stopPropagation()
                setSilOnayi(false)
              }}
              className="border border-tas/40 p-3"
            >
              <p className="text-micro leading-relaxed tracking-[0.12em] text-ink/60">AFİŞ SİLİNSİN Mİ?</p>
              <div className="flex gap-2 pt-3">
                <Dugme tur="tehlike" disabled={mesgul} onClick={sil}>
                  SİL
                </Dugme>
                <Dugme tur="sade" onClick={() => setSilOnayi(false)}>
                  VAZGEÇ
                </Dugme>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Dugme tur="ikincil" disabled={mesgul} onClick={() => setDegistirModu(true)}>
                DEĞİŞTİR
              </Dugme>
              <Dugme tur="tehlike" disabled={mesgul} onClick={() => setSilOnayi(true)}>
                AFİŞİ SİL
              </Dugme>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {hazir?.onizleme && (
            <LazyImage
              src={hazir.onizleme}
              alt={alt.trim() || 'Yüklenecek afişin önizlemesi'}
              oncelik
              className="h-[190px] w-full border border-ink/15"
              gorselSinifi="h-full w-full object-contain"
            />
          )}

          <button
            type="button"
            onClick={() => dosyaRef.current?.click()}
            onDragOver={(o) => {
              o.preventDefault()
              setSuruklu(true)
            }}
            onDragLeave={() => setSuruklu(false)}
            onDrop={(o) => {
              o.preventDefault()
              setSuruklu(false)
              dosyaAl(o.dataTransfer?.files?.[0])
            }}
            disabled={mesgul}
            className={cn(
              'block w-full border border-dashed px-3 py-[18px] text-center text-micro leading-loose tracking-[0.16em] transition-colors disabled:opacity-40',
              suruklu ? 'border-tas text-tas' : 'border-ink/30 text-ink/45 hover:border-ink/60 hover:text-ink/70',
            )}
          >
            {isleniyor ? (
              'İŞLENİYOR…'
            ) : (
              <>
                {hazir ? 'BAŞKA DOSYA SEÇ' : 'AFİŞ SÜRÜKLE VEYA SEÇ'}
                <br />
                <span className={suruklu ? 'text-tas' : 'text-ink/30'}>
                  KIRPILMAZ — UZUN KENAR {AFIS_UZUN_KENAR} PX · MAKS {bayt(MAKS_BAYT)}
                </span>
              </>
            )}
          </button>
          <input
            ref={dosyaRef}
            type="file"
            accept={KABUL_EDILEN}
            className="sr-only"
            aria-label="Afiş dosyası seç"
            onChange={(o) => {
              dosyaAl(o.target.files?.[0])
              o.target.value = '' // aynı dosya art arda seçilebilsin
            }}
          />

          {hazir && (
            <>
              <p className="text-micro leading-loose tracking-[0.14em] text-ink/35">
                {/* Gerçek çıktı: tuvalden dönen blob'un kendi boyutu. */}
                {hazir.genislik}×{hazir.yukseklik} · {bayt(hazir.blob.size)} ·{' '}
                {(hazir.tur || '').replace('image/', '').toLocaleUpperCase('tr-TR')}
              </p>

              <Alan etiket="AFİŞ ALT METNİ" zorunlu ipucu="AFİŞTE NE GÖRÜNÜYOR? TEK CÜMLE YETER.">
                <Girdi
                  ref={altRef}
                  value={alt}
                  onChange={(o) => setAlt(o.target.value)}
                  onKeyDown={(o) => {
                    /* Enter burada paneli kaydetmesin — afişi yüklesin. */
                    if (o.key !== 'Enter') return
                    o.preventDefault()
                    o.stopPropagation()
                    yukle()
                  }}
                  placeholder="KOYU ZEMİNDE DÖVME ÇELİK GÖVDE VE SERGİ KÜNYESİ"
                  aria-label="Afiş alt metni"
                  hatali={Boolean(hata) && !alt.trim()}
                />
              </Alan>

              <div className="flex gap-2">
                <Dugme tur="birincil" disabled={mesgul} onClick={yukle}>
                  {yukleniyor ? 'YÜKLENİYOR…' : 'AFİŞİ YÜKLE'}
                </Dugme>
                <Dugme tur="sade" disabled={yukleniyor} onClick={vazgec}>
                  VAZGEÇ
                </Dugme>
              </div>
            </>
          )}

          {!hazir && degistirModu && (
            <Dugme tur="sade" onClick={vazgec}>
              DEĞİŞTİRMEKTEN VAZGEÇ
            </Dugme>
          )}
        </div>
      )}
    </Alan>
  )
}

/* ---------- düzenleme paneli ---------- */

/**
 * Satırın hemen altında açılan düzenleme yüzeyi.
 *
 * Neden sağdan açılan panel değil: tel kafeste hiçbir ekranda sürgülü panel
 * yok — örtüşen tek yüzey kırpma modalı ve "···" açılırı. Bunun yerine tabloyu
 * yerinde genişletmek, düzenlenen kaydın yılı/adı bir satır yukarıda dururken
 * çalışmayı sürdürmeyi sağlıyor ve kesikli çerçeveli ekleme bloğuyla aynı dili
 * konuşuyor. Sol kenardaki 2px taş şerit, yönetim menüsündeki etkin sekme
 * işaretinin aynısı: "şu an burası açık".
 */
function DuzenlemePaneli({ sergi, eserler, sergiler, depo, onKapat }) {
  const [taslak, setTaslak] = useState(() => taslagaCevir(sergi))
  /* Karşılaştırma kopyası: taslak hep aynı nesneden yayıldığı için anahtar
     sırası korunur, derin eşitlik yerine JSON karşılaştırması yeterli. */
  const [ilkHal] = useState(() => JSON.stringify(taslagaCevir(sergi)))
  const [denendi, setDenendi] = useState(false)
  const [kaydediliyor, setKaydediliyor] = useState(false)
  const [islemHatasi, setIslemHatasi] = useState(null)
  const adRef = useRef(null)

  useEffect(() => {
    adRef.current?.focus()
  }, [])

  const degistir = (yama) => setTaslak((t) => ({ ...t, ...yama }))

  /* Şemada yıl, başlangıç varsa ondan türer; elle yazılmış yılın tarihle
     çelişmesi hem tabloyu hem CV çıktısını yanıltır. Tarih silinirse yıl
     olduğu gibi bırakılır — tarihsiz arşiv kaydı yalnızca yıl taşır. */
  const baslangicDegisti = (deger) => {
    const ms = girdidenMse(deger)
    setTaslak((t) => ({
      ...t,
      baslangic: deger,
      yil: ms == null ? t.yil : String(new Date(ms).getUTCFullYear()),
    }))
  }

  const engeller = useMemo(() => engelleriDagit(tumEngeller(adayKayit(taslak, true))), [taslak])
  const engelVar = Boolean(
    engeller.ad || engeller.mekan || engeller.bitis || engeller.baglanti || engeller.yil || engeller.genel.length,
  )
  /* Boş zorunlu alanın hatasını daha yazmaya başlamadan kırmızıyla göstermek
     kabalık; ama girilmiş içerikle ilgili hatalar (tarih sırası, bağlantı
     biçimi) anında görünmeli. */
  const goster = (anahtar) =>
    denendi || anahtar === 'bitis' || anahtar === 'baglanti' ? engeller[anahtar] : undefined

  const kirli = JSON.stringify(taslak) !== ilkHal

  const baslangicMs = girdidenMse(taslak.baslangic)
  const bitisMs = girdidenMse(taslak.bitis)
  const onizlemeKaydi = { baslangic: baslangicMs, bitis: bitisMs }
  const durum = sergiDurumu(onizlemeKaydi)
  const kalan = geriSayim(onizlemeKaydi)

  async function kaydet() {
    setDenendi(true)
    if (engelVar) {
      adRef.current?.focus()
      return
    }
    setKaydediliyor(true)
    setIslemHatasi(null)
    try {
      await depo.sergiGuncelle(sergi.id, panelYamasi(taslak))
      onKapat()
    } catch (h) {
      setIslemHatasi(h)
    } finally {
      setKaydediliyor(false)
    }
  }

  return (
    <form
      onSubmit={(o) => {
        o.preventDefault()
        kaydet()
      }}
      onKeyDown={(o) => {
        if (o.key === 'Escape') {
          o.preventDefault()
          onKapat()
        }
      }}
      aria-label={`${sergi.ad} kaydını düzenle`}
      className="border-l-2 border-tas bg-ink/[0.02]"
    >
      <div className="flex items-center gap-4 border-b border-ink/10 px-6 py-3.5">
        <h3 className="text-micro tracking-genis text-ink/60">DÜZENLENİYOR — {sergi.ad || 'ADSIZ KAYIT'}</h3>
        {kirli && <Rozet tur="degisti">KAYDEDİLMEDİ</Rozet>}
        <button
          type="button"
          onClick={onKapat}
          aria-label="Düzenlemeyi kapat"
          className="ml-auto px-1 text-mini leading-none text-ink/40 transition-colors hover:text-ink"
        >
          ✕
        </button>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-7 px-6 py-6">
        <div className="grid content-start gap-5">
          {islemHatasi && <HataKutusu hata={islemHatasi} />}

          <div className="grid grid-cols-[92px_1fr] gap-4">
            <Alan etiket="YIL" zorunlu hata={goster('yil')}>
              <Girdi
                value={taslak.yil}
                onChange={(o) => degistir({ yil: o.target.value.replace(/[^\d]/g, '').slice(0, 4) })}
                inputMode="numeric"
                aria-label="Yıl"
                hatali={Boolean(goster('yil'))}
              />
            </Alan>
            <Alan etiket="SERGİ ADI" zorunlu hata={goster('ad')}>
              <Girdi
                ref={adRef}
                value={taslak.ad}
                onChange={(o) => degistir({ ad: o.target.value })}
                aria-label="Sergi adı"
                hatali={Boolean(goster('ad'))}
              />
            </Alan>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Alan etiket="MEKAN" zorunlu hata={goster('mekan')}>
              <Girdi
                value={taslak.mekan}
                onChange={(o) => degistir({ mekan: o.target.value })}
                aria-label="Mekan"
                hatali={Boolean(goster('mekan'))}
              />
            </Alan>
            <Alan etiket="ŞEHİR">
              <Girdi
                value={taslak.sehir}
                onChange={(o) => degistir({ sehir: o.target.value })}
                aria-label="Şehir"
              />
            </Alan>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Alan etiket="BAŞLANGIÇ" ipucu="GİRİLİRSE YIL BUNDAN TÜRER">
              {/* color-scheme: tarayıcının yerleşik takvim düğmesi koyu zeminde
                  görünsün diye; tema geneli değil, yalnızca bu girdi. */}
              <Girdi
                type="date"
                value={taslak.baslangic}
                onChange={(o) => baslangicDegisti(o.target.value)}
                aria-label="Başlangıç tarihi"
                className="[color-scheme:dark]"
              />
            </Alan>
            <Alan etiket="BİTİŞ" hata={goster('bitis')}>
              <Girdi
                type="date"
                value={taslak.bitis}
                onChange={(o) => degistir({ bitis: o.target.value })}
                aria-label="Bitiş tarihi"
                hatali={Boolean(goster('bitis'))}
                className="[color-scheme:dark]"
              />
            </Alan>
          </div>

          {/* Tarihlerin canlı karşılığı: kullanıcı kaydetmeden ne olacağını görür. */}
          <p className="text-micro leading-loose tracking-[0.14em] text-ink/40">
            <span className={DURUM_RENKLERI[durum]}>{SERGI_DURUM_ETIKETLERI[durum]}</span>
            {baslangicMs != null && ` · ${tarihAraligiMetni(baslangicMs, bitisMs)}`}
            {kalan && ` · ${kalan}`}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <Alan etiket="TÜR">
              <RadyoGrubu
                ad="Sergi türü"
                deger={taslak.tur}
                onChange={(v) => degistir({ tur: v })}
                secenekler={TUR_SECENEKLERI}
              />
            </Alan>
            <Alan etiket="ESERLER" ipucu={`${taslak.eserIdleri.length} / ${eserler.length} SEÇİLİ`}>
              <EserAlani
                eserler={eserler}
                sergiler={sergiler}
                secili={taslak.eserIdleri}
                onChange={(idler) => degistir({ eserIdleri: idler })}
                yon="asagi"
                boySinifi="h-[38px]"
              />
            </Alan>
          </div>

          <Alan etiket="AÇIKLAMA" ipucu="DUYURU ŞERİDİNDE VE SERGİLER BÖLÜMÜNDE GÖRÜNÜR.">
            <MetinAlani
              className="h-[110px]"
              sinir={280}
              maxLength={280}
              value={taslak.aciklama}
              onChange={(o) => degistir({ aciklama: o.target.value })}
              aria-label="Sergi açıklaması"
            />
          </Alan>

          <Alan etiket="BAĞLANTI" hata={goster('baglanti')} ipucu="GALERİ SAYFASI VB. — BOŞ BIRAKILABİLİR">
            <Girdi
              type="url"
              value={taslak.baglanti}
              onChange={(o) => degistir({ baglanti: o.target.value })}
              placeholder="https://…"
              aria-label="Sergi bağlantısı"
              hatali={Boolean(goster('baglanti'))}
            />
          </Alan>

          {engeller.genel.length > 0 && denendi && (
            <ul role="alert" className="grid gap-1 text-micro tracking-[0.14em] text-tas">
              {engeller.genel.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid content-start gap-5 border-l border-ink/10 pl-7">
          <AfisYukleyici sergi={sergi} depo={depo} kilitli={kaydediliyor} />
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-ink/10 px-6 py-3.5">
        <Dugme tur="birincil" type="submit" disabled={kaydediliyor}>
          {kaydediliyor ? 'KAYDEDİLİYOR…' : 'KAYDET'}
        </Dugme>
        <Dugme tur="ikincil" disabled={kaydediliyor} onClick={onKapat}>
          İPTAL
        </Dugme>
        <span className="ml-auto text-micro tracking-[0.16em] text-ink/25">
          ESC İLE KAPAT · AFİŞ AYRICA YÜKLENİR
        </span>
      </div>
    </form>
  )
}

/* ---------- ekran ---------- */

const A5_NOTLARI = [
  '“Eser seç” alanı arşivden çoklu seçim yapar; sergi ile eser arasında iki yönlü bağ kurulur.',
  'CV çıktısı yıl azalan sırayla, kişisel sergiler önce gruplanır.',
  'Yaklaşan veya süren sergi sitenin en üstünde duyuru şeridi olarak görünür; tarihi geçince kendiliğinden düşer.',
  'Tarihi girilmemiş kayıtlar arşivde kalır, duyuruya girmez.',
]

export default function Sergiler() {
  const depo = useDepo()
  const { veri, yukleniyor, hata } = useDepoVerisi(
    (d) => Promise.all([d.sergileriGetir(), d.eserleriGetir()]),
    [],
  )
  const [sergiler, eserler] = veri || [[], []]

  const [yeni, setYeni] = useState(bosSatir)
  const [duzenlenenId, setDuzenlenenId] = useState(null)
  const [islemde, setIslemde] = useState(false)
  const [islemHatasi, setIslemHatasi] = useState(null)
  const [uyari, setUyari] = useState('')
  const yeniYilRef = useRef(null)

  /* Durum zamana bağlı: panel açıkken gece yarısı geçebilir. Dakikada bir
     "şimdi"yi tazeliyoruz ki YAKLAŞAN → SÜRÜYOR → SONA ERDİ geçişleri sayfa
     yenilenmeden görünsün. */
  const [simdi, setSimdi] = useState(() => Date.now())
  useEffect(() => {
    const sayac = setInterval(() => setSimdi(Date.now()), 60000)
    return () => clearInterval(sayac)
  }, [])

  const sirali = useMemo(() => satirlariSirala(sergiler), [sergiler])

  /* Üst çubuk sayaçları — hepsi listeden sayılır. */
  const sayaclar = useMemo(() => {
    const kisisel = sirali.filter((s) => s.tur === 'kisisel').length
    const yaklasan = sirali.filter((s) => sergiDurumu(s, simdi) === 'yaklasan').length
    return { toplam: sirali.length, kisisel, grup: sirali.length - kisisel, yaklasan }
  }, [sirali, simdi])

  async function yeniyiKaydet() {
    const engeller = tumEngeller(adayKayit(yeni, false))
    if (engeller.length) {
      setUyari(engeller.join(' ').toLocaleUpperCase('tr-TR'))
      yeniYilRef.current?.focus()
      return
    }
    setUyari('')
    setIslemde(true)
    setIslemHatasi(null)
    try {
      await depo.sergiOlustur(olusturmaYamasi(yeni))
      setYeni(bosSatir())
      yeniYilRef.current?.focus()
    } catch (h) {
      setIslemHatasi(h)
    } finally {
      setIslemde(false)
    }
  }

  async function sil(id) {
    setIslemde(true)
    setIslemHatasi(null)
    try {
      await depo.sergiSil(id)
      if (duzenlenenId === id) setDuzenlenenId(null)
    } catch (h) {
      setIslemHatasi(h)
    } finally {
      setIslemde(false)
    }
  }

  const baslikSatiri = (
    <div
      role="row"
      style={IZGARA_STILI}
      className={cn(IZGARA, 'border-b border-ink/20 px-3 pb-3 text-micro tracking-[0.18em] text-ink/40')}
    >
      {SUTUNLAR.map((s, i) => (
        <div key={s.ad || `sutun-${i}`} role="columnheader" aria-label={s.ad ? undefined : s.etiket}>
          {s.ad}
        </div>
      ))}
    </div>
  )

  return (
    <section aria-labelledby="a5-baslik">
      <EkranBasligi kod="A5" baslik="SERGİ KAYITLARI" yol="/admin/sergiler" />

      <Panel>
        <PanelCubugu>
          <h1 id="a5-baslik" className="text-mini tracking-genis">
            SERGİLER
          </h1>
          <span className="text-micro tracking-genis text-ink/30">
            {yukleniyor
              ? 'YÜKLENİYOR…'
              : `${sayaclar.toplam} KAYIT · ${sayaclar.kisisel} KİŞİSEL · ${sayaclar.grup} GRUP · ${sayaclar.yaklasan} YAKLAŞAN`}
          </span>
          <div className="ml-auto flex gap-2.5">
            <Dugme
              tur="ikincil"
              disabled={yukleniyor || sirali.length === 0}
              onClick={() => cvIndir(sirali)}
            >
              CV OLARAK DIŞA AKTAR
            </Dugme>
            <Dugme
              tur="birincil"
              disabled={yukleniyor}
              onClick={() => {
                setDuzenlenenId(null)
                setUyari('')
                yeniYilRef.current?.focus()
              }}
            >
              + YENİ KAYIT
            </Dugme>
          </div>
        </PanelCubugu>

        <div className="px-6 pb-[30px] pt-6">
          {hata ? (
            <HataKutusu hata={hata} />
          ) : yukleniyor ? (
            <div className="grid gap-2">
              <Iskelet yukseklik={30} />
              <Iskelet yukseklik={46} adet={6} />
            </div>
          ) : (
            <>
              {islemHatasi && <HataKutusu hata={islemHatasi} className="mb-4" />}

              <div role="table" aria-label="Sergi kayıtları">
                {baslikSatiri}

                {sirali.map((s) => {
                  const durum = sergiDurumu(s, simdi)
                  const acik = duzenlenenId === s.id
                  return (
                    <Fragment key={s.id}>
                      <div
                        role="row"
                        style={IZGARA_STILI}
                        className={cn(
                          IZGARA,
                          'items-center border-b border-ink/[0.08] px-3 py-3.5 text-mini tracking-[0.08em]',
                          acik && 'bg-ink/[0.04]',
                        )}
                      >
                        <div role="cell">{s.yil}</div>
                        <div role="cell" className="min-w-0 truncate">
                          {s.ad}
                        </div>
                        <div role="cell" className="min-w-0 truncate text-ink/60">
                          {s.mekan}
                        </div>
                        <div role="cell" className="min-w-0 truncate text-ink/60">
                          {s.sehir}
                        </div>
                        <div
                          role="cell"
                          className={cn('text-micro tracking-[0.16em]', s.tur === 'grup' && 'text-ink/55')}
                        >
                          {SERGI_TURLERI[s.tur]}
                        </div>
                        <div role="cell" className={cn('text-micro tracking-[0.14em]', DURUM_RENKLERI[durum])}>
                          {SERGI_DURUM_ETIKETLERI[durum]}
                        </div>
                        <div role="cell" className="text-ink/50">
                          {(s.eserIdleri || []).length}
                        </div>
                        <div role="cell">
                          <SatirMenusu
                            sergi={s}
                            islemde={islemde}
                            onDuzenle={() => {
                              setUyari('')
                              setDuzenlenenId(s.id)
                            }}
                            onSil={() => sil(s.id)}
                          />
                        </div>
                      </div>

                      {acik && (
                        /* Panel tablonun içinde kalıyor; ARIA ağacı bozulmasın
                           diye tek hücrelik bir satır olarak, sütun sayısı
                           SUTUNLAR'dan sayılarak açılıyor. */
                        <div role="row" className="border-b border-ink/[0.08]">
                          <div role="cell" aria-colspan={SUTUNLAR.length}>
                            <DuzenlemePaneli
                              key={s.id}
                              sergi={s}
                              eserler={eserler}
                              sergiler={sergiler}
                              depo={depo}
                              onKapat={() => setDuzenlenenId(null)}
                            />
                          </div>
                        </div>
                      )}
                    </Fragment>
                  )
                })}
              </div>

              {sirali.length === 0 && (
                <p className="border-b border-ink/[0.08] px-3 py-8 text-center text-mini tracking-genis text-ink/30">
                  HENÜZ SERGİ KAYDI YOK — AŞAĞIDAKİ SATIRDAN EKLEYİN
                </p>
              )}

              {/* Satır içi ekleme — form olduğu için Enter'ı tarayıcı da kaydeder. */}
              <form
                onSubmit={(o) => {
                  o.preventDefault()
                  yeniyiKaydet()
                }}
                onKeyDown={(o) => {
                  if (o.key === 'Escape') {
                    o.preventDefault()
                    setYeni(bosSatir())
                    setUyari('')
                  }
                }}
                aria-label="Yeni sergi kaydı"
                style={IZGARA_STILI}
                className={cn(IZGARA, 'mt-3.5 items-center border border-dashed border-ink/30 p-3')}
              >
                <EklemeAlanlari
                  taslak={yeni}
                  degistir={(yama) => setYeni((t) => ({ ...t, ...yama }))}
                  eserler={eserler}
                  sergiler={sergiler}
                  yilRef={yeniYilRef}
                />
                <button
                  type="submit"
                  disabled={islemde}
                  aria-label="Yeni kaydı ekle"
                  className="text-right text-micro leading-none tracking-[0.1em] text-tas transition-opacity hover:opacity-70 disabled:opacity-40"
                >
                  ↵
                </button>
              </form>

              <div className="flex flex-wrap items-baseline gap-4 pt-3">
                <span className="text-micro tracking-[0.16em] text-ink/30">
                  SATIR İÇİ EKLEME — ENTER İLE KAYDET, ESC İLE VAZGEÇ
                </span>
                {/* Afiş depoda sergi kimliğine yazılır; kimlik ancak kayıttan
                    sonra doğar. Kullanıcı boşuna aramasın diye açıkça yazıyoruz. */}
                <span className="text-micro tracking-[0.16em] text-ink/25">
                  TARİH · AÇIKLAMA · BAĞLANTI · AFİŞ KAYITTAN SONRA — “···” › DÜZENLE
                </span>
                {uyari && (
                  <span role="alert" className="text-micro tracking-[0.16em] text-tas">
                    {uyari}
                  </span>
                )}
                {islemde && <span className="text-micro tracking-[0.16em] text-ink/30">KAYDEDİLİYOR…</span>}
              </div>
            </>
          )}
        </div>
      </Panel>

      <EkranNotlari notlar={A5_NOTLARI} />
    </section>
  )
}
