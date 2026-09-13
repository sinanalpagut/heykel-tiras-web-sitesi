/**
 * "Yetkiniz yok" ekranı — oturum açık ama yazma hakkı verilmemiş.
 *
 * AYRI DOSYA olmasının sebebi paket boyutu: KorumaliRota, App.jsx'te tembel
 * DEĞİL doğrudan import ediliyor (rota korumasının kendisi gecikemez). Bu ekran
 * onun içinde inline dursaydı, siteyi gezen ve /admin'e hiç girmeyecek her
 * ziyaretçi bu paneli de indirirdi — README'nin "ziyaretçi panel kodunu
 * indirmez" sözüne aykırı. Burada durunca yalnızca gerçekten reddedilen
 * kullanıcıya iniyor.
 */
export default function YetkiYok({ kullanici, onCikis }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-[620px] border border-ink/20 bg-admin-panel p-10">
        <p className="text-micro tracking-[0.24em] text-ink/40">ERİŞİM REDDEDİLDİ</p>

        <h1 className="mt-5 font-display text-[34px] font-extrabold leading-none tracking-[-0.01em]">
          YAZMA YETKİSİ YOK
        </h1>

        <p className="mt-7 text-micro leading-loose tracking-[0.14em] text-ink/55">
          OTURUM AÇILDI AMA BU HESABA YETKİ VERİLMEMİŞ. YAZMA HAKKI FIRESTORE&apos;DA{' '}
          <span className="text-ink/85">yoneticiler/{'{uid}'}</span> BELGESİNİN VARLIĞINA
          BAĞLIDIR — OTURUM AÇMAK TEK BAŞINA YETKİ VERMEZ. BU BELGE AÇILMADAN PANEL
          KULLANILAMAZ: TASLAK KAYITLAR LİSTEDE GÖRÜNMEZ VE HİÇBİR DEĞİŞİKLİK KAYDEDİLEMEZ.
        </p>

        <dl className="mt-7 space-y-2 border-t border-ink/15 pt-6 text-micro tracking-[0.14em] text-ink/35">
          <div className="flex gap-4">
            <dt className="w-[96px] shrink-0">HESAP</dt>
            <dd className="break-all text-ink/60">{kullanici?.ad || '—'}</dd>
          </div>
          <div className="flex gap-4">
            {/* Belgeyi Console'dan açacak kişinin kopyalaması gereken değer tam olarak budur. */}
            <dt className="w-[96px] shrink-0">UID</dt>
            <dd className="break-all text-ink/60">{kullanici?.uid || '—'}</dd>
          </div>
        </dl>

        <button
          type="button"
          onClick={onCikis}
          className="mt-8 border border-ink/25 px-6 py-3 text-micro tracking-[0.2em] text-ink/70 transition-colors hover:border-ink/50 hover:text-ink"
        >
          ÇIKIŞ YAP
        </button>
      </div>
    </main>
  )
}
