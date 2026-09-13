import { lazy, Suspense, useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../services/AuthContext.jsx'
import { useDepo } from '../../services/DepoContext.jsx'
import PerdeYukleniyor from '../common/PerdeYukleniyor.jsx'

/* Bu dosya App.jsx'te tembel DEĞİL doğrudan yükleniyor (rota koruması
   gecikemez), bu yüzden içindeki her şey ana pakete girer. Reddedilme ekranı
   ayrı modülde ve tembel: ziyaretçi onu indirmez. */
const YetkiYok = lazy(() => import('./YetkiYok.jsx'))

/**
 * Oturum yoksa giriş ekranına yönlendirir; hedefi state'te taşır.
 *
 * Oturum AÇMAK yetki vermez. Firebase kurulumunda yazma hakkı
 * /yoneticiler/{uid} belgesinin varlığına bağlıdır (bkz. firestore.rules).
 * Bu denetim olmadan belge eksikken panel açılıyordu: listeler sessizce
 * yalnızca yayındaki kayıtları gösteriyor (taslaklar silinmiş gibi kayboluyor),
 * bir taslağın adresi "arşivden silinmiş olabilir" diyor ve her yazma
 * "yönetici oturumu gerekiyor" hatası veriyordu — sebebi hiçbir ekranda
 * yazmadan. Artık kapıda bir kez söyleniyor.
 */
export default function KorumaliRota({ children }) {
  const { kullanici, hazir, cikisYap } = useAuth()
  const depo = useDepo()
  const konum = useLocation()
  const [yetki, setYetki] = useState(null) // null = henüz sorulmadı

  useEffect(() => {
    if (!kullanici) return undefined
    let iptal = false
    setYetki(null)
    Promise.resolve(depo.yoneticiMi ? depo.yoneticiMi() : true).then(
      (sonuc) => !iptal && setYetki(sonuc === true),
      /* Soru SORULAMADIYSA kapıyı kapatmıyoruz. Asıl koruma kurallarda; burada
         yanlış negatif vermek, geçici bir ağ hatası yüzünden çalışan bir paneli
         kilitlemek olurdu. Yetkisi gerçekten yoksa zaten her yazma reddedilir. */
      () => !iptal && setYetki(true),
    )
    return () => {
      iptal = true
    }
  }, [depo, kullanici])

  if (!hazir) return <PerdeYukleniyor mesaj="OTURUM DENETLENİYOR" />
  if (!kullanici) return <Navigate to="/admin/giris" replace state={{ hedef: konum.pathname }} />
  if (yetki === null) return <PerdeYukleniyor mesaj="YETKİ DENETLENİYOR" />
  if (yetki === false) {
    return (
      <Suspense fallback={<PerdeYukleniyor mesaj="YÜKLENİYOR" />}>
        <YetkiYok kullanici={kullanici} onCikis={cikisYap} />
      </Suspense>
    )
  }
  return children
}
