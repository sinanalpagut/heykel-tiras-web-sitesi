/**
 * Tasarım jetonlarının tek kaynağı.
 *
 * Tailwind renkleri bu değerlere karşılık gelen CSS değişkenlerini okur
 * (bkz. tailwind.config.js). `applyTokens` çalışma zamanında :root üzerine
 * yazar; A6 "Site ayarları" ekranı ve canlı önizleme bunu kullanır.
 */

/** @typedef {'metal' | 'tas'} MalzemeSinifi */

export const VARSAYILAN_JETONLAR = Object.freeze({
  beton: '#35322D',
  ink: '#EAEAEA',
  cikolata: '#211A15',
  metal: '#367C65',
  tas: '#C15D3B',
})

/** A6'da her jeton için sunulan seçenekler. */
export const JETON_SECENEKLERI = Object.freeze({
  metal: ['#367C65', '#4A7C59', '#2F6E7A', '#7C6A3C'],
  tas: ['#C15D3B', '#A8452C', '#C98A4B', '#8E5A3E'],
})

export const JETON_ETIKETLERI = Object.freeze({
  beton: 'ARKA PLAN (BETON)',
  ink: 'TİPOGRAFİ (KİRLİ BEYAZ)',
  cikolata: 'DERİN ÇİKOLATA',
  metal: 'VURGU — METAL',
  tas: 'VURGU — TAŞ',
})

export const VARSAYILAN_TIPOGRAFI = Object.freeze({
  baslikFont: 'Syne ExtraBold',
  monoFont: 'Space Mono',
  /** Hero adının vw cinsinden ölçeği — tasarımda clamp(120px, 17.5vw, 300px). */
  baslikOlcegi: 17.5,
  /** Detay tipografisinin em cinsinden harf aralığı. */
  harfAraligi: 0.24,
})

export const YAZI_TIPI_SECENEKLERI = Object.freeze({
  baslik: ['Syne ExtraBold', 'Syne Bold'],
  mono: ['Space Mono', 'Space Mono Bold'],
})

export const VARSAYILAN_DOKU = Object.freeze({
  /** Shader gren yoğunluğu (0 – 0.25). */
  gren: 0.085,
  /** Sabit 6 sütunlu kılavuz çizgileri. */
  kilavuz: true,
  /** mix-blend-mode: difference özel imleç. */
  ozelImlec: true,
})

/**
 * Çember geometrisi. Tasarımdaki değerler:
 * yarıçap 780px, kart 250×320, rotateX(-7deg), perspective 1500px.
 * Pozisyon açısı eser sayısına göre hesaplanır (360 / n) — tasarımda 15 eser → 24°.
 */
export const CEMBER = Object.freeze({
  yaricap: 780,
  kartGenislik: 250,
  kartYukseklik: 320,
  /** Kartın kendi kutusu içindeki merkezleme kayması (tasarım: margin -188px 0 0 -125px). */
  kartOfsetY: -188,
  egim: -7,
  perspektif: 1500,
  perspektifOdagi: '50% 46%',
  /** Otomatik dönüş hızı — derece / kare. */
  otomatikHiz: 0.045,
  /** Sürükleme katsayısı: 1px yatay hareket → 0.16° dönüş. */
  surukleKatsayisi: 0.16,
  /** Atalet sönümü (her karede hız × bu değer). */
  sonum: 0.945,
  /** Bu hızın altına düşünce otomatik dönüş devreye girer. */
  otomatikEsik: 0.06,
  /** Ölçekleme referansı — viewport bu boyutlara sığdırılır. */
  referansGenislik: 1680,
  referansYukseklik: 1060,
  enKucukOlcek: 0.3,
})

/** Bir eser sayısı için pozisyon açısı (derece). */
export const pozisyonAcisi = (adet) => (adet > 0 ? 360 / adet : 0)

/** Malzeme sınıfının vurgu rengi. */
export const vurguRengi = (sinif, jetonlar = VARSAYILAN_JETONLAR) =>
  sinif === 'metal' ? jetonlar.metal : jetonlar.tas

export const MALZEME_ETIKETI = Object.freeze({ metal: 'METAL', tas: 'TAŞ' })

/** #rrggbb → [r, g, b] (0–1). Shader uniform'ları için. */
export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return [0.21, 0.49, 0.4]
  const n = parseInt(m[1], 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** "#C15D3B" → "193 93 59" — Tailwind'in rgb(var(--x) / <alpha-value>) biçimi için. */
export function kanallar(hex) {
  return hexToRgb(hex)
    .map((k) => Math.round(k * 255))
    .join(' ')
}

/** Bağıl parlaklık — WCAG kontrast hesabı için. */
function bagilParlaklik(hex) {
  const kanal = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b)
}

/** İki renk arasındaki WCAG kontrast oranı (1–21). A6 uyarısı bunu kullanır. */
export function kontrastOrani(a, b) {
  const la = bagilParlaklik(a)
  const lb = bagilParlaklik(b)
  const [ust, alt] = la > lb ? [la, lb] : [lb, la]
  return (ust + 0.05) / (alt + 0.05)
}

/** Jetonları ve tipografiyi bir DOM köküne CSS değişkeni olarak yazar. */
export function applyTokens(jetonlar, tipografi, hedef) {
  const kok = hedef || (typeof document !== 'undefined' ? document.documentElement : null)
  if (!kok) return
  const t = { ...VARSAYILAN_JETONLAR, ...(jetonlar || {}) }
  // Her jeton iki biçimde yazılır: hex (doğrudan CSS kullanımları için) ve
  // kanal üçlüsü (Tailwind'in /opaklık değiştiricisi bunu gerektiriyor).
  for (const ad of ['beton', 'ink', 'cikolata', 'metal', 'tas']) {
    kok.style.setProperty(`--kb-${ad}`, t[ad])
    kok.style.setProperty(`--kb-${ad}-rgb`, kanallar(t[ad]))
  }
  const tip = { ...VARSAYILAN_TIPOGRAFI, ...(tipografi || {}) }
  kok.style.setProperty('--kb-tracking-detay', `${tip.harfAraligi}em`)
  kok.style.setProperty('--kb-baslik-olcegi', `${tip.baslikOlcegi}vw`)
}
