/**
 * Tohum veri — tasarım dosyasındaki 15 eser, 5 süreç karesi ve sergi kayıtları.
 * Görsel alanları boştur: gerçek fotoğraflar yönetim panelinden yüklenir,
 * o zamana kadar tel kafesteki çapraz haç yer tutucusu çizilir.
 */
import { VARSAYILAN_JETONLAR, VARSAYILAN_TIPOGRAFI, VARSAYILAN_DOKU, CEMBER } from '../config/tokens.js'

const T0 = Date.UTC(2026, 7, 18, 19, 41) // 18.08.26 22:41 TRT — A6'daki son yayın anı

/**
 * Taslak görseller: public/taslak/ altında, tasarımın paletinde üretilmiş SVG
 * kareler. Amaç arşivin boş görünmemesi — her biri yönetim panelinden gerçek
 * fotoğrafla değiştirilebilir. İkili veri yok, yalnızca statik dosya yolu var;
 * localAdapter.gorselUrl bu alanı okur.
 */
const ALT_METINLER = {
  1: 'Oksitlenmiş bakır gövde, yüzeyi çözülmüş, karanlık atölyede yandan ışıkla.',
  2: 'Bazalttan yontulmuş dairesel kütle, bir kenarından kopmuş.',
  3: 'Dövme çelik gövde, üç yerinden çatlamış, atölye zemininde.',
  4: 'Traverten sütun, yüzeyi aşınmış, tavana doğru incelerek yükseliyor.',
  5: 'Pirinç döküm parça, kalıptan çıkmış haliyle, üst üste binmiş kütleler.',
  6: 'Andezitten oyulmuş kapalı kova biçimi, karanlıkta duran ağır kütle.',
  7: 'Paslanmaz çelik uzun eksen, ortasından kırılıp kaymış.',
  8: 'Pişmiş kilden geniş anıt kütlesi, yüzeyi çatlamış.',
  9: 'Kurşun kütle, tavandan inen halatla asılı duruyor.',
  10: 'Mermer artığı blok, tepeden aşağı inen derin bir yarıkla ikiye ayrılmış.',
  11: 'Hurda demirden kurulmuş iskele yapısı, üst üste binen taşıyıcılar.',
  12: 'Kireçtaşından alçak kabuk biçimi, zeminde yatay olarak duruyor.',
  13: 'Bakır alaşımlı ince çengel, halattan sarkıyor.',
  14: 'Granitten yatık taş kütlesi, zemine yayılmış.',
  15: 'Beton ve çelikten büyük kalıntı kütlesi, yüzeyi dökülmüş.',
}

const taslakGorsel = (i, baslik) => ({
  id: `gorsel-tohum-${String(i).padStart(2, '0')}`,
  url: `/taslak/eser-${String(i).padStart(2, '0')}.svg`,
  alt: ALT_METINLER[i] || `${baslik} — taslak görsel`,
  genislik: 900,
  yukseklik: 1200,
  kaynakAdi: `eser-${String(i).padStart(2, '0')}.svg`,
  kaynakBayt: 0,
  kirpma: null,
  oran: '3:4',
  taslakMi: true,
})

const eser = (i, baslik, malzemeSinifi, malzeme, yil, [y, g, d], ek = {}) => ({
  id: `eser-${String(i).padStart(2, '0')}`,
  baslik,
  malzemeSinifi,
  malzeme,
  yil,
  olculer: { y, g, d },
  not: '',
  etiketler: [],
  koleksiyon: 'SANATÇI KOLEKSİYONU',
  durum: 'yayinda',
  cemberde: true,
  sira: i - 1,
  gorseller: [taslakGorsel(i, baslik)],
  anaGorselId: `gorsel-tohum-${String(i).padStart(2, '0')}`,
  olusturuldu: T0 - (16 - i) * 86400000,
  guncellendi: T0 - (16 - i) * 3600000,
  ...ek,
})

export const ESERLER = [
  eser(1, 'ÇÖZÜLME', 'metal', 'OKSİTLENMİŞ BAKIR', 2024, [240, 90, 90]),
  eser(2, 'KİRLİ AY', 'tas', 'BAZALT', 2023, [110, 110, 40]),
  eser(3, 'GÖVDE ÇALIŞMASI IV', 'metal', 'DÖVME ÇELİK', 2024, [190, 70, 60], {
    not: 'Dövme sırasında üç kez çatladı. Çatlaklar kapatılmadı — çalışma bu haliyle bırakıldı.',
    etiketler: ['GÖVDE', 'SERİ IV'],
  }),
  eser(4, 'TUZ SÜTUNU', 'tas', 'TRAVERTEN', 2022, [300, 55, 55]),
  eser(5, 'ARTIK', 'metal', 'PİRİNÇ DÖKÜM', 2025, [85, 120, 80], { durum: 'taslak' }),
  eser(6, 'SESSİZ KOVA', 'tas', 'ANDEZİT', 2021, [95, 95, 95]),
  eser(7, 'KIRIK EKSEN', 'metal', 'PASLANMAZ ÇELİK', 2025, [420, 60, 60]),
  eser(8, 'TOPRAK ANITI', 'tas', 'PİŞMİŞ KİL', 2023, [160, 140, 110]),
  eser(9, 'ASILI YÜK', 'metal', 'KURŞUN & HALAT', 2024, [210, 80, 80]),
  eser(10, 'YARIK', 'tas', 'MERMER ARTIĞI', 2020, [130, 200, 70]),
  eser(11, 'İSKELE', 'metal', 'HURDA DEMİR', 2026, [380, 250, 180]),
  eser(12, 'KABUK', 'tas', 'KİREÇTAŞI', 2022, [70, 180, 65]),
  eser(13, 'ÇENGEL', 'metal', 'BAKIR ALAŞIM', 2025, [145, 40, 40]),
  eser(14, 'UYKU TAŞI', 'tas', 'GRANİT', 2019, [60, 240, 90]),
  eser(15, 'KALINTI No.3', 'metal', 'BETON & ÇELİK', 2026, [260, 260, 120]),
]

const surecGorseli = (i, alt, genislik, yukseklik) => ({
  id: `gorsel-surec-${String(i).padStart(2, '0')}`,
  url: `/taslak/surec-${String(i).padStart(2, '0')}.svg`,
  alt,
  genislik,
  yukseklik,
  kaynakAdi: `surec-${String(i).padStart(2, '0')}.svg`,
  kaynakBayt: 0,
  kirpma: null,
  oran: 'serbest',
  taslakMi: true,
})

export const SUREC_KARELERI = [
  { id: 'surec-01', kod: 'P.01', baslik: 'KALIP AÇMA', sagBilgi: '04:12', sagVurgu: 'tas', gorsel: surecGorseli(1, 'Açılmış kalıp yarımları, tezgâhın üzerinde.', 800, 1120), sira: 0 },
  { id: 'surec-02', kod: 'P.02', baslik: 'BAKIR DÖKÜM', sagBilgi: '21:40', sagVurgu: 'metal', gorsel: surecGorseli(2, 'Potadan akan erimiş bakır, karanlık atölyede kıvılcımlarla.', 900, 1000), sira: 1 },
  { id: 'surec-03', kod: 'P.03', baslik: 'TALAŞ', sagBilgi: null, sagVurgu: null, gorsel: surecGorseli(3, 'Atölye zeminine dağılmış metal talaşı, yakın plan.', 720, 720), sira: 2 },
  { id: 'surec-04', kod: 'P.04', baslik: 'AŞINDIRMA', sagBilgi: '09:03', sagVurgu: 'tas', gorsel: surecGorseli(4, 'Taşlanmış taş yüzeyi, aşındırma izleriyle, yakın plan.', 800, 900), sira: 3 },
  {
    id: 'surec-05',
    kod: 'P.05',
    baslik: 'GÜNEY DUVARI, TERK EDİLMİŞ İŞLER',
    sagBilgi: 'KARAKÖY / İST',
    sagVurgu: null,
    gorsel: surecGorseli(5, 'Güney duvarına yaslanmış, tamamlanmamış işler dizisi.', 1400, 900),
    sira: 4,
  },
]

const afisGorseli = (dosya, alt) => ({
  id: `gorsel-afis-${dosya}`,
  url: `/taslak/afis-${dosya}.svg`,
  alt,
  genislik: 900,
  yukseklik: 1270,
  kaynakAdi: `afis-${dosya}.svg`,
  kaynakBayt: 0,
  kirpma: null,
  oran: 'serbest',
  taslakMi: true,
})

/** Gün başlangıcı (yerel değil, UTC — tohum verinin sabit kalması için). */
const g = (y, a, gun) => Date.UTC(y, a - 1, gun)

const sergi = (id, yil, ad, mekan, sehir, tur, eserIdleri, ek = {}) => ({
  id,
  yil,
  ad,
  mekan,
  sehir,
  tur,
  eserIdleri,
  baslangic: null,
  bitis: null,
  aciklama: '',
  afis: null,
  baglanti: '',
  ...ek,
})

export const SERGILER = [
  /*
   * KALINTI, tohum verideki tek YAKLAŞAN sergidir; duyuru şeridi ve sergiler
   * bölümündeki vurgulu kart bu kayıttan beslenir. Tarihi geçerse şerit
   * kendiliğinden düşer — panelden yeni bir sergi tarihi girmek yeterlidir.
   */
  sergi('sergi-01', 2026, 'KALINTI', 'GALERİ HAM', 'İSTANBUL', 'kisisel',
    ['eser-01', 'eser-03', 'eser-07', 'eser-09', 'eser-11', 'eser-15'], {
      baslangic: g(2026, 10, 29),
      bitis: g(2026, 12, 20),
      aciklama:
        'Altı yeni iş. Hepsi tamamlanmadan bırakıldı; sergi, bırakma anının kendisini konu ediyor.',
      afis: afisGorseli('kalinti', 'KALINTI sergisinin afişi: koyu zemin üzerinde dövme çelik gövde ve sergi künyesi.'),
      baglanti: 'https://galerihamm.example/kalinti',
    }),
  sergi('sergi-02', 2025, 'AĞIR MALZEME', 'SPUR PROJECTS', 'BERLİN', 'grup',
    ['eser-07', 'eser-11', 'eser-13'], { baslangic: g(2025, 9, 12), bitis: g(2025, 11, 2) }),
  sergi('sergi-03', 2024, 'GÖVDE', 'ARTER — 4. KAT', 'İSTANBUL', 'kisisel',
    ['eser-01', 'eser-02', 'eser-03', 'eser-04', 'eser-05', 'eser-06', 'eser-08', 'eser-09', 'eser-10'],
    { baslangic: g(2024, 3, 7), bitis: g(2024, 6, 16) }),
  sergi('sergi-04', 2023, 'TOPRAK / DEMİR', 'BAKSI MÜZESİ', 'BAYBURT', 'grup',
    ['eser-08', 'eser-10'], { baslangic: g(2023, 7, 1), bitis: g(2023, 9, 30) }),
  sergi('sergi-05', 2023, 'DİRENÇ', 'PİLEVNELİ', 'İSTANBUL', 'grup',
    ['eser-02', 'eser-08'], { baslangic: g(2023, 2, 9), bitis: g(2023, 4, 8) }),
  sergi('sergi-06', 2022, 'SÜTUN', 'GALERİ HAM', 'İSTANBUL', 'kisisel',
    ['eser-04', 'eser-12'], { baslangic: g(2022, 10, 6), bitis: g(2022, 12, 3) }),
  sergi('sergi-07', 2022, 'KESİT', 'ODUNPAZARI MODERN', 'ESKİŞEHİR', 'grup',
    ['eser-04'], { baslangic: g(2022, 4, 21), bitis: g(2022, 8, 28) }),
  sergi('sergi-08', 2021, 'YEDİ HEYKELTIRAŞ', 'MİLLİ REASÜRANS', 'İSTANBUL', 'grup',
    ['eser-06'], { baslangic: g(2021, 11, 4), bitis: g(2021, 12, 24) }),
  sergi('sergi-09', 2021, 'ATÖLYE KAYITLARI', 'KEMANKEŞ 44/B', 'İSTANBUL', 'kisisel',
    ['eser-06', 'eser-10', 'eser-14'], { baslangic: g(2021, 5, 15), bitis: g(2021, 6, 6) }),
  sergi('sergi-10', 2020, 'AĞIRLIK', 'SANATORIUM', 'İSTANBUL', 'grup',
    ['eser-10', 'eser-14'], { baslangic: g(2020, 9, 3), bitis: g(2020, 10, 24) }),
  /* Tarihi girilmemiş eski kayıt — "tarihsiz" davranışının gerçek örneği. */
  sergi('sergi-11', 2019, 'İLK TAŞ', 'KUAD GALERİ', 'İSTANBUL', 'grup', ['eser-14']),
]

export const VARSAYILAN_AYARLAR = {
  jetonlar: { ...VARSAYILAN_JETONLAR },
  tipografi: { ...VARSAYILAN_TIPOGRAFI },
  doku: { ...VARSAYILAN_DOKU },
  cember: {
    otomatikDonus: true,
    donusHizi: CEMBER.otomatikHiz,
    yaricap: CEMBER.yaricap,
    acilisEserId: 'eser-01',
  },
  seo: {
    baslik: 'Kese Benav — Heykel, İstanbul',
    aciklama: 'Metal ve taş heykel arşivi. Karaköy döküm atölyesi, 2019—.',
    indexlensin: false,
  },
  kimlik: {
    ad: 'KESE BENAV',
    altBaslik: 'HEYKEL — İSTANBUL',
    dogumYeri: '1987, ÇORUM',
    eposta: 'ATOLYE@KESEBENAV.ART',
    telefon: '+90 212 000 00 00',
    adres: ['KEMANKEŞ CAD. 44/B', 'KARAKÖY, İSTANBUL'],
    temsil: ['GALERİ HAM — İSTANBUL', 'SPUR PROJECTS — BERLİN'],
    koordinat: '41.0082 N / 28.9784 E',
  },
}

/** A6'daki "SÜRÜM v14 — SON YAYIN 18.08.26 22:41" satırının kaynağı. */
export const VARSAYILAN_YAYIN = {
  id: 'yayin-14',
  surum: 14,
  zaman: T0,
  ayarlar: VARSAYILAN_AYARLAR,
  cemberSirasi: ESERLER.filter((e) => e.cemberde).map((e) => e.id),
}

/** Depoya ilk kez yazılacak tam durum. */
export function tohumDurum() {
  return {
    eserler: ESERLER.map((e) => ({ ...e, olculer: { ...e.olculer }, etiketler: [...e.etiketler], gorseller: e.gorseller.map((g) => ({ ...g })) })),
    surecKareleri: SUREC_KARELERI.map((s) => ({ ...s })),
    sergiler: SERGILER.map((s) => ({ ...s, eserIdleri: [...s.eserIdleri], afis: s.afis ? { ...s.afis } : null })),
    ayarlar: structuredClone(VARSAYILAN_AYARLAR),
    yayinlar: [structuredClone(VARSAYILAN_YAYIN)],
  }
}
