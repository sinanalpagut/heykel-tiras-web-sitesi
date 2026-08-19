import { Component } from 'react'

/**
 * Hata sınırı. Alt ağaçtaki render hatalarını yakalar ve brütalist bir
 * hata kartı gösterir; sayfanın tamamının beyaz ekrana düşmesini engeller.
 *
 * @param {object} props
 * @param {string} [props.ad] Hangi bölümün çöktüğü — hata kartında görünür
 * @param {(hata: Error, sifirla: () => void) => import('react').ReactNode} [props.yedek]
 */
export default class ErrorBoundary extends Component {
  state = { hata: null }

  static getDerivedStateFromError(hata) {
    return { hata }
  }

  componentDidCatch(hata, bilgi) {
    console.error(`[${this.props.ad || 'Uygulama'}] beklenmeyen hata:`, hata, bilgi?.componentStack)
  }

  sifirla = () => this.setState({ hata: null })

  render() {
    const { hata } = this.state
    if (!hata) return this.props.children
    if (this.props.yedek) return this.props.yedek(hata, this.sifirla)

    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-beton p-8 text-ink">
        <div className="max-w-xl border border-ink/25 bg-cikolata p-8">
          <div className="font-display text-2xl font-extrabold tracking-sikisik">BİR ŞEY KIRILDI</div>
          <p className="pt-4 text-mini leading-loose tracking-genis text-ink/55">
            {this.props.ad ? `${this.props.ad.toUpperCase()} BÖLÜMÜ YÜKLENEMEDİ.` : 'BÖLÜM YÜKLENEMEDİ.'} SAYFAYI
            YENİLEMEK ÇOĞU ZAMAN YETER.
          </p>
          <pre className="mt-5 max-h-40 overflow-auto border border-ink/15 bg-black/30 p-3 text-micro leading-relaxed text-ink/45">
            {String(hata?.message || hata)}
          </pre>
          <div className="flex gap-3 pt-6">
            <button
              type="button"
              onClick={this.sifirla}
              className="border border-tas px-4 py-2.5 text-micro tracking-genis text-tas transition-colors hover:bg-tas hover:text-cikolata"
            >
              TEKRAR DENE
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="border border-ink/25 px-4 py-2.5 text-micro tracking-genis text-ink/60 transition-colors hover:border-ink/60 hover:text-ink"
            >
              SAYFAYI YENİLE
            </button>
          </div>
        </div>
      </div>
    )
  }
}
