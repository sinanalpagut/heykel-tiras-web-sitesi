/**
 * Yönetim paneli kabuğu — tel kafesteki altı ekranın ortak çerçevesi.
 *
 * Tel kafeste her ekran kendi çerçevesini taşır; burada çerçeve (Panel) tek bir
 * yerde kurulur ve ekranlar <Outlet /> ile içine akar. Böylece kenar çubuğu,
 * üst başlık ve oturum denetimi altı ekranda tekrarlanmaz.
 */
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../services/AuthContext.jsx'
import ErrorBoundary from '../../components/common/ErrorBoundary.jsx'
import { Dugme, Panel, cn } from '../../components/admin/ui.jsx'

const BOLUMLER = [
  { yol: '/admin/eserler', etiket: 'ESERLER' },
  { yol: '/admin/gorseller', etiket: 'GÖRSELLER' },
  { yol: '/admin/cember', etiket: 'ÇEMBER' },
  { yol: '/admin/sergiler', etiket: 'SERGİLER' },
  { yol: '/admin/ayarlar', etiket: 'AYARLAR' },
]

/**
 * Arayüzün tamamı büyük harf; ancak e-posta ile açılan Firebase oturumlarında
 * Türkçe büyütme adresi bozar (i → İ). Adres benzeri değerler olduğu gibi kalır.
 */
function oturumAdi(ad) {
  const metin = String(ad || '').trim()
  if (!metin) return 'OTURUM'
  return metin.includes('@') ? metin : metin.toLocaleUpperCase('tr')
}

const bagBiciminden =
  'block whitespace-nowrap border-b-0 border-l-2 px-5 py-[11px] text-mini tracking-[0.16em] transition-colors'

export default function AdminLayout() {
  const { kullanici, cikisYap } = useAuth()
  const ad = oturumAdi(kullanici?.ad)

  return (
    <div className="min-h-screen bg-admin-bg px-10 pb-[120px] pt-[70px] font-mono text-ink">
      <header className="mx-auto mb-[90px] flex max-w-panel flex-wrap items-end justify-between gap-[50px] border-b border-ink/20 pb-5">
        <div>
          <h1 className="font-display text-[34px] font-extrabold leading-none tracking-[-0.01em]">YÖNETİM PANELİ</h1>
          <p className="flex flex-wrap items-center gap-x-5 gap-y-1 pt-3 text-mini tracking-[0.26em] text-ink/[0.42]">
            <span>KESE BENAV — ARŞİV</span>
            {kullanici && <span className="text-ink/30">OTURUM: {ad}</span>}
          </p>
        </div>

        <div className="flex items-center gap-5">
          <Link
            to="/"
            className="border-b-0 text-micro tracking-genis text-ink/60 transition-colors hover:text-tas"
          >
            SİTEYİ GÖR
          </Link>
          <Dugme onClick={cikisYap}>ÇIKIŞ</Dugme>
        </div>
      </header>

      <div className="mx-auto max-w-panel">
        <Panel className="grid grid-cols-1 lg:grid-cols-[220px_1fr]">
          {/* 1024px altında kenar çubuğu üstte yatay, kaydırılabilir bir şeride döner. */}
          <aside className="flex flex-row gap-0.5 overflow-x-auto border-b border-ink/[0.16] lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:py-[22px]">
            <div className="hidden px-5 pb-[26px] text-mini tracking-genis text-ink/50 lg:block">KB / ARŞİV</div>

            <nav aria-label="Panel bölümleri" className="flex flex-row gap-0.5 lg:flex-col">
              {BOLUMLER.map((b) => (
                <NavLink
                  key={b.yol}
                  to={b.yol}
                  className={({ isActive }) =>
                    cn(
                      bagBiciminden,
                      isActive
                        ? 'border-l-tas bg-ink/[0.045] text-ink'
                        : 'border-l-transparent text-ink/45 hover:text-ink',
                    )
                  }
                >
                  {b.etiket}
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto hidden items-center gap-2 px-5 pt-5 text-micro tracking-genis text-ink/30 lg:flex">
              <span className="truncate" title={ad}>
                {ad}
              </span>
              <span aria-hidden="true">—</span>
              <button
                type="button"
                onClick={cikisYap}
                className="transition-colors hover:text-tas"
              >
                ÇIKIŞ
              </button>
            </div>
          </aside>

          {/* min-w-0: ızgara sütununun tablo genişliğine göre şişmesini engeller. */}
          <main className="flex min-h-[820px] min-w-0 flex-col">
            <ErrorBoundary ad="Panel ekranı">
              <Outlet />
            </ErrorBoundary>
          </main>
        </Panel>
      </div>
    </div>
  )
}
