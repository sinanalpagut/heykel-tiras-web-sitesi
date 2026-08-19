/**
 * Veri şeması — tüm katmanların (site, yönetim paneli, depo adaptörleri)
 * uyduğu tek sözleşme. Firebase adaptörü de bu şekilleri üretir/tüketir.
 */

/** @typedef {'yayinda' | 'taslak' | 'arsiv'} EserDurumu */

export const ESER_DURUMLARI = Object.freeze({
  yayinda: 'YAYINDA',
  taslak: 'TASLAK',
  arsiv: 'ARŞİV',
})

export const SERGI_TURLERI = Object.freeze({
  kisisel: 'KİŞİSEL',
  grup: 'GRUP',
})

export const KOLEKSIYONLAR = Object.freeze([
  'SANATÇI KOLEKSİYONU',
  'ÖZEL KOLEKSİYON',
  'KURUM KOLEKSİYONU',
  'SATILDI',
])

/**
 * @typedef {object} Gorsel
 * @property {string} id
 * @property {string} url            Tam boy (veya blob/data URL)
 * @property {string} [kucukUrl]     Liste/küçük önizleme
 * @property {string} alt            Erişilebilirlik metni — zorunlu
 * @property {number} genislik
 * @property {number} yukseklik
 * @property {string} [kaynakAdi]    Yüklenen dosyanın adı
 * @property {number} [kaynakBayt]
 * @property {{x:number,y:number,w:number,h:number,olcek:number,donus:number}} [kirpma]
 * @property {string} [oran]         '3:4' | '1:1' | '16:9' | 'serbest'
 */

/**
 * @typedef {object} Eser
 * @property {string} id
 * @property {string} baslik
 * @property {'metal'|'tas'} malzemeSinifi   Vurgu rengini belirler
 * @property {string} malzeme                Serbest metin — "DÖVME ÇELİK"
 * @property {number} yil
 * @property {{y:number|null,g:number|null,d:number|null}} olculer  cm
 * @property {string} not                    Maks. 400 karakter
 * @property {string[]} etiketler
 * @property {string} koleksiyon
 * @property {EserDurumu} durum
 * @property {boolean} cemberde              Ana sayfa çemberinde görünsün mü
 * @property {number} sira                   Çember sırası (0 tabanlı, yalnızca cemberde=true olanlar arasında anlamlı)
 * @property {Gorsel[]} gorseller
 * @property {string|null} anaGorselId
 * @property {number} olusturuldu            epoch ms
 * @property {number} guncellendi            epoch ms
 */

/**
 * @typedef {object} SurecKaresi
 * @property {string} id
 * @property {string} kod                    "P.01"
 * @property {string} baslik                 "KALIP AÇMA"
 * @property {string} [sagBilgi]             "04:12" veya "KARAKÖY / İST"
 * @property {'metal'|'tas'|null} sagVurgu   sagBilgi'nin rengi
 * @property {Gorsel|null} gorsel
 * @property {number} sira
 */

/**
 * @typedef {object} Sergi
 * @property {string} id
 * @property {number} yil
 * @property {string} ad
 * @property {string} mekan
 * @property {string} sehir
 * @property {'kisisel'|'grup'} tur
 * @property {string[]} eserIdleri           Arşivle iki yönlü bağ
 */

/**
 * @typedef {object} SiteAyarlari
 * @property {{beton:string,ink:string,cikolata:string,metal:string,tas:string}} jetonlar
 * @property {{baslikFont:string,monoFont:string,baslikOlcegi:number,harfAraligi:number}} tipografi
 * @property {{gren:number,kilavuz:boolean,ozelImlec:boolean}} doku
 * @property {{otomatikDonus:boolean,donusHizi:number,yaricap:number,acilisEserId:string|null}} cember
 * @property {{baslik:string,aciklama:string,indexlensin:boolean}} seo
 * @property {{ad:string,altBaslik:string,dogumYeri:string,eposta:string,telefon:string,adres:string[],temsil:string[],koordinat:string}} kimlik
 */

/**
 * @typedef {object} Yayin
 * @property {string} id
 * @property {number} surum                  v14 → 14
 * @property {number} zaman                  epoch ms
 * @property {SiteAyarlari} ayarlar
 * @property {string[]} cemberSirasi         Yayınlanmış çember sırası (eser id'leri)
 */

/** Boş bir eser taslağı üretir. */
export function bosEser(sira = 0) {
  return {
    id: '',
    baslik: '',
    malzemeSinifi: 'metal',
    malzeme: '',
    yil: new Date().getFullYear(),
    olculer: { y: null, g: null, d: null },
    not: '',
    etiketler: [],
    koleksiyon: KOLEKSIYONLAR[0],
    durum: 'taslak',
    cemberde: true,
    sira,
    gorseller: [],
    anaGorselId: null,
    olusturuldu: 0,
    guncellendi: 0,
  }
}

export const NOT_SINIRI = 400

/** "240×90×90" biçiminde ölçü metni; eksik değerler atlanır. */
export function olcuMetni(olculer) {
  if (!olculer) return ''
  const p = [olculer.y, olculer.g, olculer.d].filter((v) => v != null && v !== '')
  return p.length ? p.join('×') : ''
}

/** Okuma çubuğu / kart altı meta satırı: "OKSİTLENMİŞ BAKIR · 2024 · 240×90×90 CM" */
export function metaMetni(eser) {
  if (!eser) return ''
  const olcu = olcuMetni(eser.olculer)
  return [eser.malzeme, eser.yil, olcu ? `${olcu} CM` : null].filter(Boolean).join(' · ')
}

/** Bir eserin gösterilecek ana görseli. */
export function anaGorsel(eser) {
  if (!eser || !eser.gorseller?.length) return null
  return eser.gorseller.find((g) => g.id === eser.anaGorselId) || eser.gorseller[0]
}

/**
 * Yayınlanabilirlik denetimi — A1 notu: "Görseli olmayan eser yayınlanamaz".
 * @returns {string[]} engel listesi; boşsa yayınlanabilir
 */
export function yayinEngelleri(eser) {
  const engeller = []
  if (!eser.baslik?.trim()) engeller.push('Başlık zorunlu.')
  if (!eser.malzeme?.trim()) engeller.push('Malzeme metni zorunlu.')
  if (!eser.yil) engeller.push('Yıl zorunlu.')
  if (!eser.gorseller?.length) engeller.push('Görseli olmayan eser yayınlanamaz.')
  else if (!anaGorsel(eser)?.alt?.trim()) engeller.push('Ana görselin alt metni zorunlu.')
  return engeller
}
