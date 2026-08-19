import { useEffect, useRef } from 'react'
import { hexToRgb, VARSAYILAN_DOKU, VARSAYILAN_JETONLAR } from '../../config/tokens.js'
import useReducedMotion from '../../hooks/useReducedMotion.js'
import useScrollProgress from '../../hooks/useScrollProgress.js'

/* Tasarım dosyasındaki initGL() shader kaynağı — birebir. Dokunma. */
const KOSE_GOLGELEYICI = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`

const PARCA_GOLGELEYICI = `precision highp float;
uniform vec2 uRes; uniform float uT, uScroll, uLayer, uGrain;
uniform vec3 uMetal, uStone;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453123); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  float a=hash(i), b=hash(i+vec2(1.,0.)), c=hash(i+vec2(0.,1.)), d=hash(i+vec2(1.,1.));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*vnoise(p); p*=2.07; a*=.5; } return s; }
mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float sdBox(vec2 p, vec2 b){ vec2 d=abs(p)-b; return length(max(d,0.))+min(max(d.x,d.y),0.); }
float sBox(vec2 p, vec2 c, vec2 b, float a, float bl){ return 1.-smoothstep(-bl,bl, sdBox(rot(a)*(p-c), b)); }
float sCirc(vec2 p, vec2 c, float r, float bl){ return 1.-smoothstep(-bl,bl, length(p-c)-r); }
float sRing(vec2 p, vec2 c, float r, float th, float bl){ return 1.-smoothstep(-bl,bl, abs(length(p-c)-r)-th); }
void main(){
  vec2 p = (gl_FragCoord.xy - .5*uRes)/uRes.y;
  float sc = uScroll, t = uT;
  vec3 col;
  if(uLayer < .5){
    float n = fbm(p*3.1 + vec2(.0, sc*.30));
    float n2 = fbm(p*13.0 + 7.3);
    col = mix(vec3(.161,.149,.133), vec3(.259,.243,.216), n);
    col = mix(col, vec3(.106,.098,.086), smoothstep(.44,.94,n2)*.40);
    col *= .90 + .18*fbm(p*1.15 - vec2(sc*.18, 0.));
    col += .026*smoothstep(.62,1.0,fbm(p*26.));
    col = mix(col, vec3(.043,.035,.027), sBox(p, vec2(-.78, .34 - sc*.55), vec2(.30,.66), .30, .17)*.72);
    col = mix(col, vec3(.043,.035,.027), sBox(p, vec2(.40, .60 - sc*1.25), vec2(.52,.075), -.13, .085)*.55);
    col = mix(col, uMetal*.52, sCirc(p, vec2(.70,-.22 + sc*.95), .31, .24)*.30);
    col = mix(col, uStone*.46, sRing(p, vec2(-.40,-.54 + sc*.65), .44, .018, .13)*.34);
    col = mix(col, vec3(.30,.28,.25), sCirc(p, vec2(.02 + sin(t*.06)*.05, -1.0 + sc*.45), .52, .34)*.16);
    col *= 1. - .50*pow(length(p*vec2(.60,.92)), 2.1);
  } else {
    col = vec3(0.);
    col += vec3(.20,.19,.17) * sCirc(p, vec2(-.58, .06 + sc*1.70), .40, .36);
    col += uMetal*.30 * sBox(p, vec2(.56,-.34 - sc*1.15), vec2(.24,.52), .55 + t*.012, .27);
    col += uStone*.22 * sCirc(p, vec2(.20 + sin(t*.09)*.10, .70 - sc*2.0), .26, .28);
    col += vec3(.13,.13,.12) * sBox(p, vec2(-.10, -.62 + sc*.9), vec2(.75,.10), .06, .13);
  }
  float g = hash(gl_FragCoord.xy*1.013 + vec2(fract(t*.7)*211., fract(t*.53)*97.));
  col += (g - .5) * uGrain * (uLayer < .5 ? 1.0 : .35);
  gl_FragColor = vec4(max(col, 0.), 1.);
}`

const UNIFORM_ADLARI = ['uRes', 'uT', 'uScroll', 'uLayer', 'uGrain', 'uMetal', 'uStone']

/**
 * Tek bir canvas için WebGL bağlamını, programı ve tam ekran üçgenini kurar.
 * Bağlam alınamaz ya da program bağlanamazsa null döner — çağıran canvas'ı gizler.
 */
function katmanKur(canvas, katman) {
  const gl = canvas.getContext('webgl', {
    antialias: false,
    alpha: false,
    powerPreference: 'low-power',
  })
  if (!gl) return null

  const derle = (tur, kaynak) => {
    const golgeleyici = gl.createShader(tur)
    gl.shaderSource(golgeleyici, kaynak)
    gl.compileShader(golgeleyici)
    return golgeleyici
  }

  const kose = derle(gl.VERTEX_SHADER, KOSE_GOLGELEYICI)
  const parca = derle(gl.FRAGMENT_SHADER, PARCA_GOLGELEYICI)
  const program = gl.createProgram()
  gl.attachShader(program, kose)
  gl.attachShader(program, parca)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    // Sessizce gizlemek bu katmanın neden kaybolduğunu bulunamaz hale getiriyordu.
    console.error(
      '[shader] program bağlanamadı:',
      gl.getProgramInfoLog(program),
      '| köşe:', gl.getShaderInfoLog(kose),
      '| parça:', gl.getShaderInfoLog(parca),
    )
    gl.deleteShader(kose)
    gl.deleteShader(parca)
    gl.deleteProgram(program)
    return null
  }

  gl.useProgram(program)
  // Bağlandıktan sonra golgeleyici nesneleri program tarafından tutulur.
  gl.deleteShader(kose)
  gl.deleteShader(parca)

  const tampon = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, tampon)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const konum = gl.getAttribLocation(program, 'p')
  gl.enableVertexAttribArray(konum)
  gl.vertexAttribPointer(konum, 2, gl.FLOAT, false, 0, 0)

  const u = {}
  UNIFORM_ADLARI.forEach((ad) => {
    u[ad] = gl.getUniformLocation(program, ad)
  })

  return { canvas, gl, program, tampon, katman, u }
}

/**
 * Sayfanın altındaki WebGL alan katmanı: bulanık geometrik kütleler + beton greni.
 *
 * İki canvas çizilir. Arka katman (uLayer 0) sayfanın zeminidir; ön katman
 * (uLayer 1) içeriğin üstünde screen karışımıyla %42 opaklıkta durur ve
 * gren/ışık sızıntısı görevi görür. Her ikisi de kaydırma oranına (uScroll)
 * bağlı olarak yer değiştirir.
 *
 * @param {object} props
 * @param {number} [props.gren]        Gren yoğunluğu (0 – 0.25)
 * @param {string} [props.metalRengi]  Metal vurgusu (#rrggbb)
 * @param {string} [props.tasRengi]    Taş vurgusu (#rrggbb)
 * @param {boolean} [props.kapali]     true ise hiç render edilmez
 */
export default function ShaderArkaPlan({
  gren = VARSAYILAN_DOKU.gren,
  metalRengi = VARSAYILAN_JETONLAR.metal,
  tasRengi = VARSAYILAN_JETONLAR.tas,
  kapali = false,
}) {
  const arkaRef = useRef(null)
  const onRef = useRef(null)
  const cizRef = useRef(null)
  // Uniform değerleri kare döngüsünden okunur; prop değişimi GL'i yeniden kurmasın.
  const ayarRef = useRef({ gren, metalRengi, tasRengi })

  const azaltilmisHareket = useReducedMotion()
  const { oranRef } = useScrollProgress()

  useEffect(() => {
    if (kapali) return
    const arka = arkaRef.current
    const on = onRef.current
    if (!arka || !on) return

    const katmanlar = []
    ;[
      [arka, 0],
      [on, 1],
    ].forEach(([canvas, no]) => {
      const katman = katmanKur(canvas, no)
      if (katman) {
        katmanlar.push(katman)
        canvas.style.display = 'block'
      } else {
        // WebGL yoksa canvas'ı gizle; sayfa düz beton zeminle çalışmaya devam eder.
        canvas.style.display = 'none'
      }
    })
    if (katmanlar.length === 0) return

    const olcekle = () => {
      // Yüksek dpr'li ekranlarda tam çözünürlük boşuna piksel; 1.5 ile sınırla.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      const g = Math.max(1, Math.round(window.innerWidth * dpr))
      const y = Math.max(1, Math.round(window.innerHeight * dpr))
      katmanlar.forEach(({ canvas, gl }) => {
        if (canvas.width !== g || canvas.height !== y) {
          canvas.width = g
          canvas.height = y
        }
        gl.viewport(0, 0, g, y)
      })
    }

    const ciz = (t) => {
      const ayar = ayarRef.current
      const M = hexToRgb(ayar.metalRengi)
      const S = hexToRgb(ayar.tasRengi)
      const kaydirma = oranRef.current
      katmanlar.forEach(({ canvas, gl, katman, u }) => {
        gl.uniform2f(u.uRes, canvas.width, canvas.height)
        gl.uniform1f(u.uT, t)
        gl.uniform1f(u.uScroll, kaydirma)
        gl.uniform1f(u.uLayer, katman)
        gl.uniform1f(u.uGrain, ayar.gren)
        gl.uniform3f(u.uMetal, M[0], M[1], M[2])
        gl.uniform3f(u.uStone, S[0], S[1], S[2])
        gl.drawArrays(gl.TRIANGLES, 0, 3)
      })
    }
    cizRef.current = ciz

    olcekle()

    const yenidenBoyutlandi = () => {
      olcekle()
      // Döngü durmuşsa yeni boyuta göre tek kare tazelemek gerekir.
      if (azaltilmisHareket) ciz(0)
    }
    window.addEventListener('resize', yenidenBoyutlandi)

    let raf = 0
    if (azaltilmisHareket) {
      // Hareket azaltılmışsa alan görünür ama donuk: tek kare, döngü yok.
      ciz(0)
    } else {
      const dongu = (ts) => {
        raf = window.requestAnimationFrame(dongu)
        ciz(ts * 0.001)
      }
      raf = window.requestAnimationFrame(dongu)
    }

    return () => {
      if (raf) window.cancelAnimationFrame(raf)
      window.removeEventListener('resize', yenidenBoyutlandi)
      cizRef.current = null
      katmanlar.forEach(({ gl, program, tampon }) => {
        if (gl.isContextLost()) return
        gl.deleteProgram(program)
        gl.deleteBuffer(tampon)
      })
      /*
       * Burada WEBGL_lose_context.loseContext() ÇAĞIRMIYORUZ. Bir canvas'ın
       * bağlamı bir kez kaybedilince getContext aynı ölü bağlamı döndürür;
       * React'in StrictMode'da bileşeni bağlayıp söküp yeniden bağlaması bu
       * yüzden ikinci kurulumda linkProgram'ı sessizce düşürüyordu. Bağlamı
       * canvas elemanıyla birlikte çöp toplayıcıya bırakmak yeterli.
       */
    }
  }, [kapali, azaltilmisHareket, oranRef])

  /* Jeton değişimi (A6 canlı önizleme) GL'i yeniden kurmadan uniform'lara işlesin. */
  useEffect(() => {
    ayarRef.current = { gren, metalRengi, tasRengi }
    if (azaltilmisHareket && cizRef.current) cizRef.current(0)
  }, [gren, metalRengi, tasRengi, azaltilmisHareket])

  if (kapali) return null

  return (
    <>
      <canvas
        ref={arkaRef}
        data-bg=""
        aria-hidden="true"
        className="fixed inset-0 z-zemin block h-full w-full"
      />
      <canvas
        ref={onRef}
        data-fg=""
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-gren block h-full w-full"
        style={{ mixBlendMode: 'screen', opacity: 0.42 }}
      />
    </>
  )
}
