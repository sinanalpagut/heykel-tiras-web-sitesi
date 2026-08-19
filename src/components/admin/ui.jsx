/**
 * Yönetim paneli arayüz ilkelleri.
 *
 * Ölçüler tel kafesten birebir alınmıştır: girdi yüksekliği 38px, ikincil
 * girdi 34/36px, anahtar 34×18 (kol 12×12), düğme dolgusu 9px/14px,
 * birincil eylem rengi #C15D3B (taş). Yuvarlatma yoktur.
 */
import { forwardRef, useId, useState } from 'react'

const cn = (...p) => p.filter(Boolean).join(' ')

/* ---------- ekran başlığı ---------- */

export function EkranBasligi({ kod, baslik, yol, sag }) {
  return (
    <div className="flex items-baseline gap-4 pb-3.5">
      {kod && <span className="font-display text-xl font-extrabold">{kod}</span>}
      <span className="text-detay tracking-detay">{baslik}</span>
      {sag}
      {yol && <span className="ml-auto text-micro tracking-genis text-ink/30">{yol}</span>}
    </div>
  )
}

/** Panel gövdesi — tel kafesteki çerçeveli kutu. */
export function Panel({ children, className = '' }) {
  return <div className={cn('border border-ink/20 bg-admin-panel', className)}>{children}</div>
}

/** Panel üst çubuğu. */
export function PanelCubugu({ children, className = '' }) {
  return (
    <div className={cn('flex items-center gap-5 border-b border-ink/15 px-6 py-[18px]', className)}>{children}</div>
  )
}

/* ---------- form alanları ---------- */

export function Alan({ etiket, zorunlu, ipucu, hata, children, className = '' }) {
  return (
    <div className={className}>
      {etiket && (
        <div className="pb-2 text-micro tracking-genis text-ink/40">
          {etiket}
          {zorunlu && <span className="text-tas"> *</span>}
        </div>
      )}
      {children}
      {hata ? (
        <div className="pt-2 text-micro tracking-[0.14em] text-tas">{hata}</div>
      ) : (
        ipucu && <div className="pt-2 text-micro tracking-[0.14em] text-ink/30">{ipucu}</div>
      )}
    </div>
  )
}

const girdiTemel =
  'h-[38px] w-full border bg-ink/[0.03] px-3 text-[12px] tracking-[0.04em] text-ink outline-none transition-colors placeholder:text-ink/25 focus:border-ink/60'

export const Girdi = forwardRef(function Girdi({ className = '', hatali, ...rest }, ref) {
  return <input ref={ref} className={cn(girdiTemel, hatali ? 'border-tas' : 'border-ink/20', className)} {...rest} />
})

export const MetinAlani = forwardRef(function MetinAlani(
  { className = '', hatali, sinir, value = '', ...rest },
  ref,
) {
  return (
    <>
      <textarea
        ref={ref}
        value={value}
        className={cn(
          'w-full resize-y border bg-ink/[0.03] p-3 text-detay leading-loose text-ink/80 outline-none transition-colors focus:border-ink/60',
          hatali ? 'border-tas' : 'border-ink/20',
          className,
        )}
        {...rest}
      />
      {sinir != null && (
        <div className={cn('pt-2 text-right text-micro tracking-[0.16em]', value.length > sinir ? 'text-tas' : 'text-ink/30')}>
          {value.length} / {sinir}
        </div>
      )}
    </>
  )
})

export const Secim = forwardRef(function Secim({ className = '', secenekler = [], ...rest }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(girdiTemel, 'appearance-none border-ink/20 pr-9', className)}
        {...rest}
      >
        {secenekler.map((s) =>
          typeof s === 'string' ? (
            <option key={s} value={s} className="bg-admin-panel">
              {s}
            </option>
          ) : (
            <option key={s.deger} value={s.deger} className="bg-admin-panel">
              {s.etiket}
            </option>
          ),
        )}
      </select>
      <span aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink/40">
        ▾
      </span>
    </div>
  )
})

/** Malzeme sınıfı gibi iki-üç seçenekli radyo grubu — tel kafesteki dolu daire işaretiyle. */
export function RadyoGrubu({ ad, deger, onChange, secenekler }) {
  return (
    <div role="radiogroup" aria-label={ad} className="flex gap-2">
      {secenekler.map((s) => {
        const secili = deger === s.deger
        return (
          <button
            key={s.deger}
            type="button"
            role="radio"
            aria-checked={secili}
            onClick={() => onChange(s.deger)}
            className={cn(
              'flex flex-1 items-center gap-2.5 border px-3 py-2.5 text-mini tracking-[0.16em] transition-colors',
              secili ? 'border-ink text-ink' : 'border-ink/20 text-ink/45 hover:border-ink/45 hover:text-ink/70',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'h-[9px] w-[9px] rounded-full',
                secili ? 'bg-ink' : 'border border-ink/35',
              )}
            />
            {s.etiket}
          </button>
        )
      })}
    </div>
  )
}

/** 34×18 kutu anahtar. */
export function Anahtar({ acik, onChange, etiket, pasif = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={acik}
      aria-label={etiket}
      disabled={pasif}
      onClick={() => !pasif && onChange(!acik)}
      className={cn(
        'flex h-[18px] w-[34px] items-center p-[2px] transition-colors',
        acik ? 'justify-end border border-ink/40' : 'justify-start border border-ink/20',
        pasif && 'cursor-not-allowed opacity-60',
      )}
    >
      <span aria-hidden="true" className={cn('h-3 w-3', acik ? 'bg-ink' : 'bg-ink/30')} />
    </button>
  )
}

/** Etiketli anahtar satırı. */
export function AnahtarSatiri({ etiket, acik, onChange, pasif, ipucu }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-micro tracking-genis text-ink/45">
        {etiket}
        {ipucu && <span className="block pt-1 text-ink/25">{ipucu}</span>}
      </span>
      <Anahtar acik={acik} onChange={onChange} etiket={etiket} pasif={pasif} />
    </div>
  )
}

/* ---------- düğmeler ---------- */

const dugmeStilleri = {
  birincil: 'border-tas text-tas hover:bg-tas hover:text-cikolata',
  ikincil: 'border-ink/25 text-ink/60 hover:border-ink/60 hover:text-ink',
  sade: 'border-transparent text-ink/45 hover:text-ink',
  tehlike: 'border-tas/50 text-tas/80 hover:bg-tas hover:text-cikolata',
}

export function Dugme({ tur = 'ikincil', className = '', children, ...rest }) {
  return (
    <button
      type="button"
      className={cn(
        'border px-3.5 py-2.5 text-micro tracking-genis transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
        dugmeStilleri[tur] || dugmeStilleri.ikincil,
        tur === 'birincil' && 'disabled:hover:text-tas',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

/* ---------- durum işaretleri ---------- */

const rozetRenkleri = {
  yayinda: 'text-ink',
  taslak: 'text-ink/45',
  arsiv: 'text-ink/30',
  degisti: 'text-tas',
}

export function Rozet({ tur = 'taslak', children }) {
  return <span className={cn('text-micro tracking-[0.16em]', rozetRenkleri[tur] || rozetRenkleri.taslak)}>{children}</span>
}

/** Onay kutusu — 12×12 keskin kare. */
export function OnayKutusu({ secili, onChange, etiket }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={secili}
      aria-label={etiket}
      onClick={() => onChange(!secili)}
      className={cn('h-3 w-3 border transition-colors', secili ? 'border-ink/50 bg-ink/25' : 'border-ink/30 hover:border-ink/60')}
    />
  )
}

/* ---------- etiket girdisi ---------- */

export function EtiketGirdisi({ etiketler = [], onChange, ipucuMetni = 'EKLE…' }) {
  const [taslak, setTaslak] = useState('')
  const id = useId()

  const ekle = () => {
    const t = taslak.trim().toUpperCase()
    if (t && !etiketler.includes(t)) onChange([...etiketler, t])
    setTaslak('')
  }

  return (
    <div className="flex min-h-[38px] flex-wrap items-center gap-2 border border-ink/20 bg-ink/[0.03] p-2">
      {etiketler.map((e) => (
        <span key={e} className="flex items-center gap-1.5 border border-ink/30 px-2.5 py-[5px] text-micro tracking-[0.14em]">
          {e}
          <button
            type="button"
            aria-label={`${e} etiketini kaldır`}
            onClick={() => onChange(etiketler.filter((x) => x !== e))}
            className="text-ink/50 transition-colors hover:text-tas"
          >
            ×
          </button>
        </span>
      ))}
      <input
        id={id}
        value={taslak}
        onChange={(e) => setTaslak(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            ekle()
          } else if (e.key === 'Backspace' && !taslak && etiketler.length) {
            onChange(etiketler.slice(0, -1))
          }
        }}
        onBlur={ekle}
        placeholder={ipucuMetni}
        aria-label="Etiket ekle"
        className="min-w-[80px] flex-1 bg-transparent px-1 py-[5px] text-micro tracking-[0.14em] text-ink outline-none placeholder:text-ink/30"
      />
    </div>
  )
}

/* ---------- notlar ---------- */

/** Tel kafesteki numaralı ekran notları. */
export function EkranNotlari({ notlar = [] }) {
  if (!notlar.length) return null
  return (
    <ol className="mt-5 max-w-[760px] list-decimal pl-5 text-mini leading-loose tracking-[0.06em] text-ink/40">
      {notlar.map((n, i) => (
        <li key={i}>{n}</li>
      ))}
    </ol>
  )
}

export { cn }
