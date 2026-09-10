/**
 * Kese Benav — Tailwind yapılandırması.
 *
 * Renk ve tipografi değerleri tasarım dosyasındaki (Kese Benav.dc.html) jetonlarla
 * birebir aynıdır ve A6 "Site ayarları" ekranında düzenlenebilen jeton kümesiyle
 * eşleşir. Çalışma zamanında değiştirilebilmesi için her jeton bir CSS değişkenine
 * bağlanır; buradaki hex değerler yalnızca varsayılan/geri düşüş değerleridir.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /*
         * Jetonlar RENK KANALLARI olarak tutulur ("234 234 234"), hazır hex olarak
         * değil. Sebep: Tailwind'in `/opaklık` değiştiricisi (text-ink/40) değeri
         * ancak <alpha-value> yer tutucusunu enjekte edebildiğinde çalışır;
         * doğrudan `var(--kb-ink)` yazılırsa alfa uygulanamadığı için o sınıflar
         * hiç CSS üretmez. Kanal üçlüsü hem çalışma zamanında değiştirilebilirliği
         * hem de 345 yerdeki /opaklık kullanımını aynı anda mümkün kılıyor.
         */
        /* Beton — sayfa zemini */
        beton: 'rgb(var(--kb-beton-rgb, 53 50 45) / <alpha-value>)',
        /* Kirli beyaz — tipografi */
        ink: 'rgb(var(--kb-ink-rgb, 234 234 234) / <alpha-value>)',
        /* Derin çikolata — kart zemini, dev tipografi gölgesi */
        cikolata: 'rgb(var(--kb-cikolata-rgb, 33 26 21) / <alpha-value>)',
        /* Vurgular — malzeme sınıfına bağlı */
        metal: 'rgb(var(--kb-metal-rgb, 54 124 101) / <alpha-value>)',
        tas: 'rgb(var(--kb-tas-rgb, 193 93 59) / <alpha-value>)',
        /* Yönetim paneli zeminleri */
        'admin-bg': '#141310',
        'admin-panel': '#1C1A17',
      },
      fontFamily: {
        display: ['Syne', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        /* Detay tipografisi — A6'daki "harf aralığı" kaydırıcısına bağlıdır */
        detay: 'var(--kb-tracking-detay, 0.24em)',
        genis: '0.2em',
        'cok-genis': '0.3em',
        sikisik: '-0.03em',
      },
      fontSize: {
        micro: ['9px', { lineHeight: '1.6' }],
        mini: ['10px', { lineHeight: '1.6' }],
        detay: ['11px', { lineHeight: '1.7' }],
        govde: ['12px', { lineHeight: '1.85' }],
      },
      maxWidth: {
        icerik: '1560px',
        panel: '1440px',
      },
      zIndex: {
        zemin: '0',
        kilavuz: '2',
        icerik: '5',
        cember: '10',
        gren: '26',
        okuma: '40',
        nav: '60',
        /*
         * Eser detay katmanı. Tasarımın özgün yığınında yoktu; sonradan eklendi
         * ve nav dahil her şeyin üstünde durması gerekiyor.
         */
        katman: '120',
        /*
         * İmleç HER ZAMAN en üstte. Site global olarak cursor:none uyguladığı
         * için özel imleç bir katmanın arkasında kalırsa kullanıcının hiç imleci
         * görünmez olur — detay katmanı eklendiğinde tam bu oldu (katman 120,
         * imleç 99'du). Bu yüzden imlecin değeri yığındaki her şeyin üstünde.
         */
        imlec: '200',
      },
      keyframes: {
        'kb-blink': { '0%,49%': { opacity: '1' }, '50%,100%': { opacity: '.15' } },
        'kb-creep': { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
      },
      animation: {
        'kb-blink': 'kb-blink 1.9s steps(1,end) infinite',
      },
      transitionTimingFunction: {
        /* Tasarımdaki imleç/halka geçişleri */
        cikis: 'cubic-bezier(.16,1,.3,1)',
      },
      backgroundImage: {
        /* Tel kafeste görsel alanı işareti olarak kullanılan çapraz haç */
        'gorsel-yuvasi':
          'linear-gradient(to top right, transparent calc(50% - .5px), rgba(234,234,234,.14) 50%, transparent calc(50% + .5px)), linear-gradient(to bottom right, transparent calc(50% - .5px), rgba(234,234,234,.14) 50%, transparent calc(50% + .5px))',
      },
    },
  },
  plugins: [],
}
