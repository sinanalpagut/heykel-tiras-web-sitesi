/*
 * Renk jetonları tailwind.config.js'te `var(--kb-ink, #EAEAEA)` gibi CSS
 * değişkenlerine bağlı. Tailwind bu biçimdeki bir rengi ayrıştıramadığı için
 * `text-ink/30` benzeri opaklık kısayolları SESSİZCE hiç kural üretmiyor.
 * Doğru opaklığı color-mix ile veriyoruz; jeton A6'dan değişince renk yine
 * güncellenir. (Kalıcı çözüm config'te renkleri opacityValue alan
 * fonksiyonlara çevirmek.)
 */
const ink = (yuzde) => `color-mix(in srgb, var(--kb-ink, #EAEAEA) ${yuzde}%, transparent)`

const TARIH_BICIMI = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
})

/** Epoch ms, ISO metin ya da Date kabul eder → "19.08.26". Çözülemezse null. */
function tarihMetni(deger) {
  if (deger == null || deger === '') return null
  const ham = typeof deger === 'string' && /^\d+$/.test(deger) ? Number(deger) : deger
  const tarih = ham instanceof Date ? ham : new Date(ham)
  return Number.isNaN(tarih.getTime()) ? null : TARIH_BICIMI.format(tarih)
}

/**
 * Yıl aralığını metne çevirir. Çağıran taraf "2019—2026" gibi hazır bir metin,
 * [2019, 2026] gibi bir çift ya da {ilk, son} nesnesi geçebilir.
 */
function yilAraligiMetni(yilAraligi) {
  if (!yilAraligi) return null
  if (typeof yilAraligi === 'string') return yilAraligi
  if (typeof yilAraligi === 'number') return String(yilAraligi)

  const [ilk, son] = Array.isArray(yilAraligi)
    ? yilAraligi
    : [yilAraligi.ilk ?? yilAraligi.bas ?? yilAraligi.min, yilAraligi.son ?? yilAraligi.max]

  if (ilk == null && son == null) return null
  if (ilk == null || son == null) return String(ilk ?? son)
  return ilk === son ? String(ilk) : `${ilk}—${son}`
}

/** Bir sütun: üstte soluk etiket, altında satırlar. */
function Sutun({ etiket, children }) {
  return (
    <div>
      <h2 style={{ color: ink(35) }} className="m-0 pb-3.5 text-mini font-normal tracking-genis">
        {etiket}
      </h2>
      <ul className="m-0 list-none p-0">{children}</ul>
    </div>
  )
}

/**
 * Kolofon — sitenin kapanış künyesi.
 *
 * Arşiv sütunundaki rakamların hepsi canlıdır: eser adedi, yıl aralığı ve son
 * güncelleme tarihi çağıran taraftan gelir, telif yılı o anki yıldan okunur.
 *
 * @param {object} props
 * @param {import('../../data/schema.js').SiteAyarlari['kimlik']} [props.kimlik]
 * @param {number} [props.eserAdedi]
 * @param {string|number|number[]|{ilk?:number,son?:number}} [props.yilAraligi]
 * @param {number|string|Date} [props.sonGuncelleme]
 */
export default function Kolofon({ kimlik = {}, eserAdedi = 0, yilAraligi, sonGuncelleme }) {
  const adres = Array.isArray(kimlik.adres) ? kimlik.adres : []
  const temsil = Array.isArray(kimlik.temsil) ? kimlik.temsil : []
  const aralik = yilAraligiMetni(yilAraligi)
  const guncelleme = tarihMetni(sonGuncelleme)
  const telefonHref = kimlik.telefon ? `tel:${kimlik.telefon.replace(/[^\d+]/g, '')}` : null

  return (
    <footer
      id="iletisim"
      data-screen-label="Kolofon"
      style={{ borderTopColor: ink(16) }}
      className="relative z-icerik overflow-hidden border-t px-[30px] pt-20"
    >
      <div className="mx-auto max-w-icerik">
        <div className="grid grid-cols-2 gap-10 text-mini leading-[2.2] tracking-genis md:grid-cols-4">
          <Sutun etiket="İLETİŞİM">
            {kimlik.eposta && (
              <li>
                <a href={`mailto:${kimlik.eposta}`}>{kimlik.eposta}</a>
              </li>
            )}
            {kimlik.telefon && (
              <li>
                <a href={telefonHref}>{kimlik.telefon}</a>
              </li>
            )}
          </Sutun>

          <Sutun etiket="ATÖLYE">
            {adres.map((satir) => (
              <li key={satir}>{satir}</li>
            ))}
          </Sutun>

          <Sutun etiket="TEMSİL">
            {temsil.map((satir) => (
              <li key={satir}>{satir}</li>
            ))}
          </Sutun>

          <Sutun etiket="ARŞİV">
            <li>{aralik ? `${eserAdedi} ESER / ${aralik}` : `${eserAdedi} ESER`}</li>
            {guncelleme && <li>SON GÜNCELLEME {guncelleme}</li>}
          </Sutun>
        </div>

        <div
          style={{ color: ink(30) }}
          className="flex flex-wrap items-baseline justify-between gap-[30px] pt-[74px] text-micro tracking-[.26em]"
        >
          <span>
            © {new Date().getFullYear()} {kimlik.ad} — TÜM İŞLER TESCİLLİDİR
          </span>
          <span>NO INDEX / NO CACHE / NO APOLOGY</span>
        </div>

        {/* Dev isim yalnızca dokudur; üstteki telif satırında zaten okunuyor */}
        <div
          aria-hidden="true"
          className="mb-[-0.14em] select-none whitespace-nowrap pt-[34px] font-display text-[clamp(44px,9.6vw,158px)] font-extrabold leading-[.72] tracking-[-.045em] text-cikolata"
        >
          {kimlik.ad}
        </div>
      </div>
    </footer>
  )
}
