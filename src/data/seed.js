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

export const SERGILER = [
  { id: 'sergi-01', yil: 2026, ad: 'KALINTI', mekan: 'GALERİ HAM', sehir: 'İSTANBUL', tur: 'kisisel', eserIdleri: ['eser-01', 'eser-03', 'eser-07', 'eser-09', 'eser-11', 'eser-15'] },
  { id: 'sergi-02', yil: 2025, ad: 'AĞIR MALZEME', mekan: 'SPUR PROJECTS', sehir: 'BERLİN', tur: 'grup', eserIdleri: ['eser-07', 'eser-11', 'eser-13'] },
  { id: 'sergi-03', yil: 2024, ad: 'GÖVDE', mekan: 'ARTER — 4. KAT', sehir: 'İSTANBUL', tur: 'kisisel', eserIdleri: ['eser-01', 'eser-02', 'eser-03', 'eser-04', 'eser-05', 'eser-06', 'eser-08', 'eser-09', 'eser-10'] },
  { id: 'sergi-04', yil: 2023, ad: 'TOPRAK / DEMİR', mekan: 'BAKSI MÜZESİ', sehir: 'BAYBURT', tur: 'grup', eserIdleri: ['eser-08', 'eser-10'] },
  { id: 'sergi-05', yil: 2023, ad: 'DİRENÇ', mekan: 'PİLEVNELİ', sehir: 'İSTANBUL', tur: 'grup', eserIdleri: ['eser-02', 'eser-08'] },
  { id: 'sergi-06', yil: 2022, ad: 'SÜTUN', mekan: 'GALERİ HAM', sehir: 'İSTANBUL', tur: 'kisisel', eserIdleri: ['eser-04', 'eser-12'] },
  { id: 'sergi-07', yil: 2022, ad: 'KESİT', mekan: 'ODUNPAZARI MODERN', sehir: 'ESKİŞEHİR', tur: 'grup', eserIdleri: ['eser-04'] },
  { id: 'sergi-08', yil: 2021, ad: 'YEDİ HEYKELTIRAŞ', mekan: 'MİLLİ REASÜRANS', sehir: 'İSTANBUL', tur: 'grup', eserIdleri: ['eser-06'] },
  { id: 'sergi-09', yil: 2021, ad: 'ATÖLYE KAYITLARI', mekan: 'KEMANKEŞ 44/B', sehir: 'İSTANBUL', tur: 'kisisel', eserIdleri: ['eser-06', 'eser-10', 'eser-14'] },
  { id: 'sergi-10', yil: 2020, ad: 'AĞIRLIK', mekan: 'SANATORIUM', sehir: 'İSTANBUL', tur: 'grup', eserIdleri: ['eser-10', 'eser-14'] },
  { id: 'sergi-11', yil: 2019, ad: 'İLK TAŞ', mekan: 'KUAD GALERİ', sehir: 'İSTANBUL', tur: 'grup', eserIdleri: ['eser-14'] },
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
    sergiler: SERGILER.map((s) => ({ ...s, eserIdleri: [...s.eserIdleri] })),
    ayarlar: structuredClone(VARSAYILAN_AYARLAR),
    yayinlar: [structuredClone(VARSAYILAN_YAYIN)],
  }
}
