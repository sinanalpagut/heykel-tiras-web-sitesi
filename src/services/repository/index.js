/**
 * Adaptör seçici.
 *
 * VITE_DATA_ADAPTER=firebase verilirse Firebase adaptörü dinamik olarak yüklenir;
 * böylece varsayılan (yerel) kurulumda firebase paketi ana pakete girmez.
 * Yükleme başarısız olursa yerel adaptöre düşülür ve sebep konsola yazılır.
 */
import { yerelDepo } from './localAdapter.js'

export { DepoHatasi, cemberEserleri, sirayiYenidenNumarala, kimlikUret } from './contract.js'

const secim = (import.meta.env?.VITE_DATA_ADAPTER || 'yerel').toLowerCase()

let hazirSoz = null

/**
 * Uygulama açılışında bir kez çağrılır; kullanılacak depoyu döndürür.
 * @returns {Promise<import('./contract.js').Depo & {ad: string}>}
 */
export function depoyuHazirla() {
  if (hazirSoz) return hazirSoz
  hazirSoz = (async () => {
    if (secim === 'firebase') {
      try {
        const mod = await import('./firebaseAdapter.js')
        const depo = await mod.firebaseDepoOlustur()
        if (depo) return depo
        /* Buraya düşmek SESSİZ kalmamalı. firebaseDepoOlustur yalnızca
           yapılandırma eksikse null döner; o durumda site localStorage'daki tohum
           veriyi sunar ve normal görünür, AMA AuthContext hâlâ firebase dalında
           olduğu için yönetici panele hiç giremez ve girebilseydi bile yazdığı
           her şey Firestore yerine tarayıcıya gitmiş olurdu. */
        console.error(
          '[depo] VITE_DATA_ADAPTER=firebase verildi ama Firebase yapılandırması eksik. ' +
            'YEREL depoya düşülüyor: veri bu tarayıcıda kalır, panel girişi çalışmaz. ' +
            'Hangi ortam değişkeninin boş olduğu için yukarıdaki [firebase] satırına bakın.',
        )
      } catch (h) {
        console.error('[depo] Firebase adaptörü yüklenemedi, yerel adaptöre düşülüyor.', h)
      }
    }
    return yerelDepo
  })()
  return hazirSoz
}

/** Senkron erişim gereken yerler için (yalnızca yerel adaptör garantilidir). */
export const yedekDepo = yerelDepo
