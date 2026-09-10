import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { DepoSaglayici } from './services/DepoContext.jsx'
import { AuthSaglayici } from './services/AuthContext.jsx'
import KorumaliRota from './components/admin/KorumaliRota.jsx'
import PerdeYukleniyor from './components/common/PerdeYukleniyor.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'
import HomePage from './pages/HomePage.jsx'

/* Yönetim paneli ayrı bir pakete ayrılır — ziyaretçi bu kodu hiç indirmez. */
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'))
const AdminGiris = lazy(() => import('./pages/admin/AdminGiris.jsx'))
const EserListesi = lazy(() => import('./pages/admin/EserListesi.jsx'))
const EserDuzenle = lazy(() => import('./pages/admin/EserDuzenle.jsx'))
const GorselKitapligi = lazy(() => import('./pages/admin/GorselKitapligi.jsx'))
const CemberSiralamasi = lazy(() => import('./pages/admin/CemberSiralamasi.jsx'))
const Sergiler = lazy(() => import('./pages/admin/Sergiler.jsx'))
const SiteAyarlari = lazy(() => import('./pages/admin/SiteAyarlari.jsx'))

export default function App() {
  return (
    <DepoSaglayici yuklenirken={<PerdeYukleniyor mesaj="ARŞİV AÇILIYOR" />}>
      <AuthSaglayici>
        <Suspense fallback={<PerdeYukleniyor mesaj="YÜKLENİYOR" />}>
          <Routes>
            <Route
              /*
               * Tek rota, joker ile: hem "/" hem "/eser/:eserId" buraya düşer.
               * İkisi ayrı Route olsaydı adres değişince React Router farklı bir
               * eşleşme üretir ve HomePage yeniden bağlanırdı — çember sıfırlanır,
               * shader yeniden kurulur, gözle görülür bir sıçrama olurdu.
               * Hangi eserin açık olduğunu HomePage useMatch ile kendisi okur.
               *
               * Yönlendirme sıralaması: React Router sabit parçaları jokerden
               * üstün tuttuğu için /admin/... yolları bu rotanın önüne geçer.
               */
              path="/*"
              element={
                <ErrorBoundary ad="Site">
                  <HomePage />
                </ErrorBoundary>
              }
            />
            <Route path="/admin/giris" element={<AdminGiris />} />
            <Route
              path="/admin"
              element={
                <KorumaliRota>
                  <ErrorBoundary ad="Yönetim paneli">
                    <AdminLayout />
                  </ErrorBoundary>
                </KorumaliRota>
              }
            >
              <Route index element={<Navigate to="eserler" replace />} />
              <Route path="eserler" element={<EserListesi />} />
              <Route path="eserler/:eserId" element={<EserDuzenle />} />
              <Route path="gorseller" element={<GorselKitapligi />} />
              <Route path="cember" element={<CemberSiralamasi />} />
              <Route path="sergiler" element={<Sergiler />} />
              <Route path="ayarlar" element={<SiteAyarlari />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthSaglayici>
    </DepoSaglayici>
  )
}
