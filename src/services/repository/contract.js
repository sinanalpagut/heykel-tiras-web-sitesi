/**
 * Depo sözleşmesi.
 *
 * Site ve yönetim paneli yalnızca bu arayüzü tanır. Arkasında hangi adaptörün
 * çalıştığını (yerel bellek/localStorage ya da Firebase) bilmezler.
 * Yeni bir adaptör eklemek = aşağıdaki metotları uygulamak.
 *
 * Tüm metotlar Promise döner. Hata durumunda `DepoHatasi` fırlatırlar.
 *
 * @typedef {import('../../data/schema.js')} Sema
 *
 * @typedef {object} Depo
 * @property {() => Promise<import('../../data/schema.js').Eser[]>} eserleriGetir
 * @property {(id: string) => Promise<object|null>} eserGetir
 * @property {(eser: object) => Promise<object>} eserOlustur
 * @property {(id: string, yama: object) => Promise<object>} eserGuncelle
 * @property {(idler: string[]) => Promise<void>} eserleriSil
 * @property {(idler: string[], yama: object) => Promise<object[]>} topluGuncelle
 * @property {(sirali: string[]) => Promise<object[]>} cemberSirasiKaydet   Taslak sıra
 * @property {(sirali: string[]) => Promise<object>} cemberSirasiYayinla    Siteye yansıt
 * @property {(eserId: string, dosya: Blob, ustveri: object) => Promise<object>} gorselYukle
 * @property {(eserId: string, gorselId: string) => Promise<void>} gorselSil
 * @property {(eserId: string, gorselId: string) => Promise<object>} anaGorselAta
 * @property {() => Promise<object[]>} surecKareleriniGetir
 * @property {(id: string, yama: object) => Promise<object>} surecKaresiGuncelle
 * @property {() => Promise<object[]>} sergileriGetir
 * @property {(sergi: object) => Promise<object>} sergiOlustur
 * @property {(id: string, yama: object) => Promise<object>} sergiGuncelle
 * @property {(id: string) => Promise<void>} sergiSil
 * @property {(sergiId: string, dosya: Blob, ustveri: object) => Promise<object>} [afisYukle]
 * @property {(sergiId: string) => Promise<void>} [afisSil]
 * @property {() => Promise<object>} ayarlariGetir          Taslak ayarlar (önizleme)
 * @property {(yama: object) => Promise<object>} ayarlariKaydet
 * @property {() => Promise<object>} ayarlariYayinla        Yeni sürüm üretir
 * @property {() => Promise<object[]>} yayinlariGetir
 * @property {(yayinId: string) => Promise<object>} yayinaDon
 * @property {() => Promise<object>} yayindakiAyarlariGetir Sitenin gördüğü ayarlar
 * @property {(dinleyici: () => void) => () => void} abone  Değişiklikte tetiklenir; aboneliği iptal eden fonksiyon döner
 */

export class DepoHatasi extends Error {
  /**
   * @param {string} mesaj Kullanıcıya gösterilebilir Türkçe mesaj
   * @param {object} [ek]
   * @param {string} [ek.kod]
   * @param {unknown} [ek.sebep]
   */
  constructor(mesaj, { kod = 'bilinmeyen', sebep } = {}) {
    super(mesaj)
    this.name = 'DepoHatasi'
    this.kod = kod
    this.sebep = sebep
  }
}

/** Çakışmayan basit kimlik üreteci. */
export function kimlikUret(onek) {
  const rastgele = Math.random().toString(36).slice(2, 8)
  return `${onek}-${Date.now().toString(36)}${rastgele}`
}

/** Yalnızca çemberde olan eserleri sıraya göre döndürür. */
export function cemberEserleri(eserler) {
  return eserler
    .filter((e) => e.cemberde && e.durum === 'yayinda')
    .slice()
    .sort((a, b) => a.sira - b.sira)
}

/** Sıra alanlarını 0..n-1 aralığına yeniden numaralar (A2 notu). */
export function sirayiYenidenNumarala(eserler) {
  const cemberde = eserler.filter((e) => e.cemberde).sort((a, b) => a.sira - b.sira)
  const harita = new Map(cemberde.map((e, i) => [e.id, i]))
  return eserler.map((e) => (harita.has(e.id) ? { ...e, sira: harita.get(e.id) } : { ...e, sira: -1 }))
}
