import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../services/AuthContext.jsx'
import PerdeYukleniyor from '../common/PerdeYukleniyor.jsx'

/** Oturum yoksa giriş ekranına yönlendirir; hedefi state'te taşır. */
export default function KorumaliRota({ children }) {
  const { kullanici, hazir } = useAuth()
  const konum = useLocation()

  if (!hazir) return <PerdeYukleniyor mesaj="OTURUM DENETLENİYOR" />
  if (!kullanici) return <Navigate to="/admin/giris" replace state={{ hedef: konum.pathname }} />
  return children
}
