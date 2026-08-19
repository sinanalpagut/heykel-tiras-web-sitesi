import { useEffect, useState } from 'react'

/**
 * Sistemin "hareketi azalt" tercihi. A6'da yalnızca gösterilir, kapatılamaz —
 * tasarım notu: "Azaltılmış hareket sistem tercihine bağlıdır."
 */
export default function useReducedMotion() {
  const [azalt, setAzalt] = useState(() =>
    typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)').matches : false,
  )

  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    const degisti = (e) => setAzalt(e.matches)
    mq.addEventListener('change', degisti)
    return () => mq.removeEventListener('change', degisti)
  }, [])

  return azalt
}
