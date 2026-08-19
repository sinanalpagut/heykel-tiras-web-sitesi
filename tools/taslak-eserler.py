# -*- coding: utf-8 -*-
"""Taslak görseller — v3 (nihai).

Fotoğraf gibi okunması için üç kural:
  1. Sahne karanlıktır; form siyahtan çıkar. Ortalama parlaklık düşük tutulur.
  2. Tek yönlü ışık: soldan gelen dar bir parlak rampa, sağa doğru dibe iner.
  3. Faset düzlemleri çok düşük opaklıkta ve büyük açılıdır — v2'deki yatay
     şeritler "sargı" gibi okunuyordu.
Malzeme rengi gövdeyi boyamaz; gölge tarafında zayıf bir sekme olarak durur.
"""
import math, os, random

INK = '#EAEAEA'
METAL, TAS = '#367C65', '#C15D3B'
W, H, TABAN = 900, 1200, 1094

ESERLER = [
    (1,  'ÇÖZÜLME',            'metal', 240,  90,  90, 'govde'),
    (2,  'KİRLİ AY',           'tas',   110, 110,  40, 'disk'),
    (3,  'GÖVDE ÇALIŞMASI IV', 'metal', 190,  70,  60, 'govde'),
    (4,  'TUZ SÜTUNU',         'tas',   300,  55,  55, 'sutun'),
    (5,  'ARTIK',              'metal',  85, 120,  80, 'kutle'),
    (6,  'SESSİZ KOVA',        'tas',    95,  95,  95, 'kutle'),
    (7,  'KIRIK EKSEN',        'metal', 420,  60,  60, 'kirik'),
    (8,  'TOPRAK ANITI',       'tas',   160, 140, 110, 'kutle'),
    (9,  'ASILI YÜK',          'metal', 210,  80,  80, 'asili'),
    (10, 'YARIK',              'tas',   130, 200,  70, 'yarik'),
    (11, 'İSKELE',             'metal', 380, 250, 180, 'iskele'),
    (12, 'KABUK',              'tas',    70, 180,  65, 'yatik'),
    (13, 'ÇENGEL',             'metal', 145,  40,  40, 'asili'),
    (14, 'UYKU TAŞI',          'tas',    60, 240,  90, 'yatik'),
    (15, 'KALINTI No.3',       'metal', 260, 260, 120, 'kutle'),
]

def poly(p):
    return 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in p) + ' Z'

def siluet(rnd, bicim, gen, yuk):
    hg = gen / 2
    if bicim == 'disk':
        r, n = min(gen, yuk) / 2, 34
        cy = -r - 24
        p = []
        for i in range(n):
            a = 2 * math.pi * i / n
            rr = r * (1 + rnd.uniform(-.06, .06))
            if 4.9 < a < 5.9: rr *= .66
            p.append((math.cos(a) * rr, cy + math.sin(a) * rr))
        return p
    if bicim == 'sutun':
        n = 16
        sol = [(-hg * (1 - .25 * i / n) + rnd.uniform(-hg*.12, hg*.12), -yuk * i / n) for i in range(n+1)]
        sag = [( hg * (1 - .25 * i / n) + rnd.uniform(-hg*.12, hg*.12), -yuk * i / n) for i in range(n+1)]
        return sol + sag[::-1]
    if bicim == 'kirik':
        kir, kay, n = .55, hg * .8, 18
        sol, sag = [], []
        for i in range(n+1):
            t = i / n
            o = kay * ((t - kir) / (1 - kir)) ** 1.4 if t > kir else 0
            sol.append((-hg + o + rnd.uniform(-hg*.13, hg*.13), -yuk * t))
            sag.append(( hg + o + rnd.uniform(-hg*.13, hg*.13), -yuk * t))
        return sol + sag[::-1]
    if bicim == 'govde':
        n = 20
        sol, sag = [], []
        for i in range(n+1):
            t = i / n
            k = .55 + .6 * math.sin(math.pi * t ** .85) - .25 * t
            sol.append((-hg * k + rnd.uniform(-hg*.16, hg*.16), -yuk * t))
            sag.append(( hg * k + rnd.uniform(-hg*.16, hg*.16), -yuk * t))
        return sol + sag[::-1]
    if bicim == 'yarik':
        n = 12
        sol = [(-hg + rnd.uniform(-hg*.1, hg*.1), -yuk * i / n) for i in range(n+1)]
        sag = [( hg + rnd.uniform(-hg*.1, hg*.1), -yuk * i / n) for i in range(n+1)]
        yar = [(hg*.20, -yuk), (hg*.04, -yuk*.28), (-hg*.10, -yuk)]
        return sol + yar + sag[::-1]
    if bicim == 'yatik':
        n = 16
        ust = [(-hg + gen*i/n, -yuk*(.5 + .5*math.sin(math.pi*i/n)) + rnd.uniform(-yuk*.12, yuk*.12)) for i in range(n+1)]
        return [(-hg, 0)] + ust + [(hg, 0)]
    n = 20
    p = []
    for i in range(n):
        a = 2*math.pi*i/n
        rr = 1 + rnd.uniform(-.16, .16)
        p.append((math.cos(a)*hg*rr, min(-yuk/2 + math.sin(a)*(yuk/2)*rr, -2)))
    return p

def uret(no, ad, sinif, y, g, dd, bicim):
    rnd = random.Random(no * 104729 + 17)
    vurgu = METAL if sinif == 'metal' else TAS
    olcek = min(880/max(y,1), 620/max(g,1))
    yuk, gen = max(y*olcek, 150), max(g*olcek, 130)
    K = f'k{no}'
    havada = bicim == 'asili'
    kaldir = yuk * .28 if havada else 0
    pts = [(x, v - kaldir) for x, v in siluet(rnd, bicim, gen, yuk)]
    ust, alt = -yuk - kaldir, -kaldir

    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img">',
         f'<title>{ad} — taslak görsel</title>', '<defs>']
    # karanlık atölye: özneyi arkadan hafifçe ayıran dikey düşüş
    s.append('''<linearGradient id="duvar" x1=".2" y1="0" x2=".9" y2="1">
      <stop offset="0" stop-color="#2b2721"/><stop offset=".5" stop-color="#1c1814"/>
      <stop offset="1" stop-color="#0c0a08"/></linearGradient>''')
    s.append('''<radialGradient id="hale" cx=".42" cy=".38" r=".62">
      <stop offset="0" stop-color="#6d6459" stop-opacity=".26"/>
      <stop offset="1" stop-color="#6d6459" stop-opacity="0"/></radialGradient>''')
    s.append('''<linearGradient id="yer" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#181410"/><stop offset="1" stop-color="#080706"/></linearGradient>''')
    s.append('''<radialGradient id="temas" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#000" stop-opacity=".88"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>''')
    # tek yönlü ışık rampası — dar ve keskin
    s.append('''<linearGradient id="isik" x1="0" y1=".1" x2="1" y2=".8">
      <stop offset="0" stop-color="#9c9285"/><stop offset=".10" stop-color="#6a6156"/>
      <stop offset=".26" stop-color="#3b352d"/><stop offset=".52" stop-color="#1d1915"/>
      <stop offset="1" stop-color="#0a0807"/></linearGradient>''')
    s.append(f'''<linearGradient id="bounce" x1="1" y1=".2" x2=".3" y2="1">
      <stop offset="0" stop-color="{vurgu}" stop-opacity=".34"/>
      <stop offset=".55" stop-color="{vurgu}" stop-opacity=".04"/>
      <stop offset="1" stop-color="{vurgu}" stop-opacity="0"/></linearGradient>''')
    s.append(f'''<filter id="as{no}"><feTurbulence type="fractalNoise" baseFrequency="{.010 if sinif=="tas" else .026}"
      numOctaves="4" seed="{no*13}" result="t"/>
      <feDisplacementMap in="SourceGraphic" in2="t" scale="{26 if sinif=="tas" else 13}" xChannelSelector="R" yChannelSelector="G"/></filter>''')
    s.append(f'''<filter id="gr{no}" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="4" seed="{no*7}"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="linear" slope=".9"/></feComponentTransfer></filter>''')
    s.append(f'<clipPath id="{K}"><path d="{poly(pts)}"/></clipPath>')
    s.append('</defs>')

    s.append(f'<rect width="{W}" height="{H}" fill="url(#duvar)"/>')
    s.append(f'<rect width="{W}" height="{H}" fill="url(#hale)"/>')
    s.append(f'<rect y="{TABAN}" width="{W}" height="{H-TABAN}" fill="url(#yer)"/>')

    cx = W/2 + rnd.uniform(-16, 16)
    s.append(f'<g transform="translate({cx:.1f},{TABAN})">')
    s.append(f'<ellipse cy="{6 if not havada else 14}" rx="{gen*0.9:.0f}" ry="{max(13, gen*0.17):.0f}" fill="url(#temas)"/>')
    if havada:
        s.append(f'<rect x="-2" y="{-TABAN}" width="4" height="{TABAN + ust + 10:.0f}" fill="#0b0908"/>')
        s.append(f'<rect x="-2" y="{-TABAN}" width="1.1" height="{TABAN + ust + 10:.0f}" fill="{INK}" opacity=".2"/>')

    s.append(f'<g filter="url(#as{no})">')
    s.append(f'<path d="{poly(pts)}" fill="url(#isik)"/>')
    s.append(f'<g clip-path="url(#{K})">')
    # üç büyük açılı düzlem — çok düşük opaklık, şerit okunmasın diye eğimli
    for i in range(3):
        ax = rnd.uniform(-gen, gen)
        ay = ust + (alt-ust) * rnd.uniform(.1, .8)
        egim = rnd.uniform(-2.2, 2.2)
        ton = '#ffffff' if i == 0 else '#000000'
        op = rnd.uniform(.035, .07) if i == 0 else rnd.uniform(.10, .19)
        s.append(f'<path d="{poly([(ax-gen*2, ay), (ax+gen*2, ay+egim*gen), (ax+gen*2, alt+yuk), (ax-gen*2, alt+yuk)])}" fill="{ton}" opacity="{op:.3f}"/>')
    s.append(f'<rect x="{-gen*.35:.0f}" y="{ust:.0f}" width="{gen*1.4:.0f}" height="{yuk+kaldir:.0f}" fill="url(#bounce)"/>')
    # yüzey çizikleri
    for _ in range(14):
        x0 = rnd.uniform(-gen*.55, gen*.55); y0 = rnd.uniform(ust, alt)
        s.append(f'<path d="M{x0:.0f},{y0:.0f} l{rnd.uniform(-gen*.3,gen*.3):.0f},{rnd.uniform(-yuk*.06,yuk*.06):.0f}" '
                 f'stroke="#000" stroke-opacity="{rnd.uniform(.10,.30):.2f}" stroke-width="{rnd.uniform(1,3.6):.1f}" fill="none"/>')
    s.append('</g></g>')

    if bicim == 'iskele':
        for _ in range(6):
            bx, by = rnd.uniform(-gen*.5, gen*.2), -yuk*rnd.uniform(.12, .92)
            s.append(f'<rect x="{bx:.0f}" y="{by:.0f}" width="{gen*rnd.uniform(.5,.95):.0f}" height="{max(6, yuk*.028):.0f}" '
                     f'fill="#0a0807" opacity=".78" transform="rotate({rnd.uniform(-14,14):.0f},{bx:.0f},{by:.0f})"/>')
    s.append('</g>')
    s.append(f'<rect width="{W}" height="{H}" filter="url(#gr{no})" opacity=".16" style="mix-blend-mode:overlay"/>')
    s.append('</svg>')
    return '\n'.join(s)

os.makedirs('public/taslak', exist_ok=True)
for a in ESERLER:
    open(f'public/taslak/eser-{a[0]:02d}.svg', 'w', encoding='utf-8').write(uret(*a))
print(f'{len(ESERLER)} eser karesi v3')
