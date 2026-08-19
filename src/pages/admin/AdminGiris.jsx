/**
 * A0 — Yönetim paneli giriş ekranı.
 *
 * Kapı istemci tarafındadır. Yerel kurulumda parola yalnızca kazara erişimi
 * engeller; bunu kullanıcıdan saklamak yerine kartın altında açıkça yazıyoruz —
 * panelin verdiği güven, sağladığı korumadan fazla olmamalı.
 */
import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../services/AuthContext.jsx'
import { Alan, Dugme, Girdi } from '../../components/admin/ui.jsx'
import HataKutusu from '../../components/common/HataKutusu.jsx'
import PerdeYukleniyor from '../../components/common/PerdeYukleniyor.jsx'

const VARSAYILAN_HEDEF = '/admin/eserler'

/* Ham "auth/..." kodu kullanıcıya hiçbir şey anlatmıyor; panelin diline çeviriyoruz. */
const FIREBASE_MESAJLARI = {
  'auth/invalid-credential': 'E-POSTA VEYA PAROLA HATALI.',
  'auth/invalid-login-credentials': 'E-POSTA VEYA PAROLA HATALI.',
  'auth/wrong-password': 'E-POSTA VEYA PAROLA HATALI.',
  'auth/user-not-found': 'E-POSTA VEYA PAROLA HATALI.',
  'auth/invalid-email': 'E-POSTA ADRESİ GEÇERSİZ.',
  'auth/user-disabled': 'BU HESAP KAPATILMIŞ.',
  'auth/too-many-requests': 'ÇOK FAZLA DENEME YAPILDI — BİR SÜRE SONRA TEKRAR DENEYİN.',
  'auth/network-request-failed': 'AĞA ULAŞILAMADI — BAĞLANTIYI DENETLEYİN.',
}

function hataMetni(h) {
  if (h?.code && FIREBASE_MESAJLARI[h.code]) return FIREBASE_MESAJLARI[h.code]
  return h?.message || 'GİRİŞ YAPILAMADI.'
}

export default function AdminGiris() {
  const { kullanici, hazir, girisYap, firebaseMi } = useAuth()
  const konum = useLocation()

  const [eposta, setEposta] = useState('')
  const [parola, setParola] = useState('')
  const [gonderiliyor, setGonderiliyor] = useState(false)
  const [hata, setHata] = useState(null)
  const [alanHatalari, setAlanHatalari] = useState({})

  const epostaRef = useRef(null)
  const parolaRef = useRef(null)
  /* Başarılı girişte bileşen Navigate ile sökülür — sonrasında durum yazmayalım. */
  const bagliRef = useRef(true)

  useEffect(
    () => () => {
      bagliRef.current = false
    },
    [],
  )

  /* Klavyeyle gelen kullanıcı ilk alanı fareyle aramasın. */
  useEffect(() => {
    if (!hazir || kullanici) return
    const ilkAlan = firebaseMi ? epostaRef.current : parolaRef.current
    ilkAlan?.focus()
  }, [hazir, kullanici, firebaseMi])

  async function gonder(olay) {
    olay.preventDefault()
    if (gonderiliyor) return

    const temizEposta = eposta.trim()
    const hatalar = {}
    /* Firebase e-posta olmadan oturum açamaz; yerel kapıda ad yalnızca imzadır. */
    if (firebaseMi && !temizEposta) hatalar.eposta = 'E-POSTA ZORUNLU'
    if (!parola) hatalar.parola = 'PAROLA ZORUNLU'

    setAlanHatalari(hatalar)
    setHata(null)

    if (Object.keys(hatalar).length) {
      ;(hatalar.eposta ? epostaRef.current : parolaRef.current)?.focus()
      return
    }

    setGonderiliyor(true)
    try {
      await girisYap({ eposta: temizEposta, parola })
    } catch (h) {
      if (!bagliRef.current) return
      setHata(hataMetni(h))
      setParola('')
      parolaRef.current?.focus()
    } finally {
      if (bagliRef.current) setGonderiliyor(false)
    }
  }

  if (!hazir) return <PerdeYukleniyor mesaj="OTURUM DENETLENİYOR" />
  /* Korumalı rota nereden çevirdiyse oraya geri bırak. */
  if (kullanici) return <Navigate to={konum.state?.hedef || VARSAYILAN_HEDEF} replace />

  return (
    <main className="flex min-h-screen items-center justify-center bg-admin-bg px-6 py-20 font-mono text-ink">
      <div className="w-full max-w-[420px]">
        <form
          onSubmit={gonder}
          noValidate
          aria-busy={gonderiliyor}
          className="border border-ink/20 bg-admin-panel p-10"
        >
          <h1 className="font-display text-[34px] font-extrabold leading-none tracking-[-0.01em]">
            YÖNETİM PANELİ
          </h1>
          <p className="pt-3 text-mini tracking-[0.26em] text-ink/42">KESE BENAV — ARŞİV</p>

          {hata && <HataKutusu hata={hata} className="mt-8" />}

          <div className="mt-8 space-y-5">
            <Alan
              etiket="KULLANICI"
              zorunlu={firebaseMi}
              hata={alanHatalari.eposta}
              ipucu={firebaseMi ? undefined : 'İSTEĞE BAĞLI — PANELDE GÖRÜNECEK AD'}
            >
              <Girdi
                ref={epostaRef}
                id="giris-kullanici"
                name="eposta"
                type={firebaseMi ? 'email' : 'text'}
                value={eposta}
                onChange={(o) => setEposta(o.target.value)}
                aria-label="Kullanıcı e-postası"
                aria-invalid={alanHatalari.eposta ? true : undefined}
                hatali={Boolean(alanHatalari.eposta)}
                autoComplete="username"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck="false"
                disabled={gonderiliyor}
              />
            </Alan>

            <Alan etiket="PAROLA" zorunlu hata={alanHatalari.parola}>
              <Girdi
                ref={parolaRef}
                id="giris-parola"
                name="parola"
                type="password"
                value={parola}
                onChange={(o) => setParola(o.target.value)}
                aria-label="Parola"
                aria-invalid={alanHatalari.parola ? true : undefined}
                hatali={Boolean(alanHatalari.parola)}
                autoComplete="current-password"
                disabled={gonderiliyor}
              />
            </Alan>
          </div>

          <Dugme tur="birincil" type="submit" disabled={gonderiliyor} className="mt-8 w-full py-3">
            {gonderiliyor ? 'DENETLENİYOR…' : 'GİRİŞ'}
          </Dugme>
        </form>

        {!firebaseMi && (
          <p className="pt-5 text-micro leading-loose tracking-[0.14em] text-ink/30">
            YEREL KURULUM — BU KAPI İSTEMCİ TARAFINDADIR, GERÇEK KORUMA SAĞLAMAZ. VERİ BU TARAYICIDA
            DURUR.
          </p>
        )}
      </div>
    </main>
  )
}
