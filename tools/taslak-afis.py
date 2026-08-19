# -*- coding: utf-8 -*-
"""Sergi afişi taslağı. Eser kareleriyle aynı ışık dili + brütalist tipografi."""
import math, os, random

INK, TAS = '#EAEAEA', '#C15D3B'
W, H = 900, 1270

def uret():
    r = random.Random(4242)
    p = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img">',
         '<title>KALINTI — sergi afişi taslağı</title>', '<defs>',
         '''<linearGradient id="d" x1=".2" y1="0" x2=".9" y2="1">
           <stop offset="0" stop-color="#2b2721"/><stop offset=".5" stop-color="#1a1613"/>
           <stop offset="1" stop-color="#0a0807"/></linearGradient>''',
         '''<linearGradient id="isik" x1="0" y1=".1" x2="1" y2=".85">
           <stop offset="0" stop-color="#9c9285"/><stop offset=".12" stop-color="#635a50"/>
           <stop offset=".38" stop-color="#2a2520"/><stop offset="1" stop-color="#0a0807"/></linearGradient>''',
         '''<radialGradient id="temas" cx=".5" cy=".5" r=".5">
           <stop offset="0" stop-color="#000" stop-opacity=".85"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>''',
         '''<filter id="as"><feTurbulence type="fractalNoise" baseFrequency=".022" numOctaves="4" seed="91" result="t"/>
           <feDisplacementMap in="SourceGraphic" in2="t" scale="14" xChannelSelector="R" yChannelSelector="G"/></filter>''',
         '''<filter id="gr" x="0" y="0" width="100%" height="100%">
           <feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="4" seed="7"/>
           <feColorMatrix type="saturate" values="0"/>
           <feComponentTransfer><feFuncA type="linear" slope=".9"/></feComponentTransfer></filter>''',
         '</defs>',
         f'<rect width="{W}" height="{H}" fill="url(#d)"/>']

    # Dövme çelik gövde — eser-03'ün diliyle
    taban, yuk, gen = 980, 620, 300
    pts = []
    n = 20
    sol, sag = [], []
    for i in range(n + 1):
        t = i / n
        k = .55 + .6 * math.sin(math.pi * t ** .85) - .25 * t
        sol.append((-gen / 2 * k + r.uniform(-24, 24), -yuk * t))
        sag.append((gen / 2 * k + r.uniform(-24, 24), -yuk * t))
    pts = sol + sag[::-1]
    yol = 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts) + ' Z'
    p.append(f'<g transform="translate({W/2:.0f},{taban})">')
    p.append(f'<ellipse cy="6" rx="{gen*.9:.0f}" ry="52" fill="url(#temas)"/>')
    p.append(f'<g filter="url(#as)"><path d="{yol}" fill="url(#isik)"/>')
    p.append(f'<clipPath id="k"><path d="{yol}"/></clipPath>')
    p.append('<g clip-path="url(#k)">')
    for i in range(3):
        ay = -yuk * r.uniform(.15, .8)
        p.append(f'<path d="M{-gen*2:.0f},{ay:.0f} L{gen*2:.0f},{ay+r.uniform(-160,160):.0f} L{gen*2:.0f},{yuk:.0f} L{-gen*2:.0f},{yuk:.0f} Z" '
                 f'fill="{"#ffffff" if i==0 else "#000000"}" opacity="{r.uniform(.04,.07) if i==0 else r.uniform(.12,.2):.3f}"/>')
    for _ in range(12):
        x0, y0 = r.uniform(-gen*.5, gen*.5), r.uniform(-yuk, 0)
        p.append(f'<path d="M{x0:.0f},{y0:.0f} l{r.uniform(-70,70):.0f},{r.uniform(-30,30):.0f}" stroke="#000" '
                 f'stroke-opacity="{r.uniform(.12,.3):.2f}" stroke-width="{r.uniform(1.5,4):.1f}" fill="none"/>')
    p.append('</g></g></g>')

    # Tipografi — Syne yoksa sans-serif'e düşer
    F = "Syne, 'Arial Black', sans-serif"
    M = "'Space Mono', ui-monospace, monospace"
    p.append(f'<text x="60" y="150" font-family="{F}" font-weight="800" font-size="132" letter-spacing="-4" fill="{INK}">KALINTI</text>')
    p.append(f'<text x="64" y="196" font-family="{M}" font-size="20" letter-spacing="7" fill="{INK}" opacity=".55">KESE BENAV — HEYKEL</text>')
    p.append(f'<rect x="60" y="228" width="{W-120}" height="1" fill="{INK}" opacity=".22"/>')
    p.append(f'<text x="64" y="284" font-family="{M}" font-size="21" letter-spacing="5" fill="{TAS}">29 EKİM — 20 ARALIK 2026</text>')
    p.append(f'<text x="64" y="{H-108}" font-family="{M}" font-size="19" letter-spacing="5" fill="{INK}" opacity=".8">GALERİ HAM</text>')
    p.append(f'<text x="64" y="{H-74}" font-family="{M}" font-size="16" letter-spacing="5" fill="{INK}" opacity=".45">KEMANKEŞ CAD. 44/B · KARAKÖY, İSTANBUL</text>')
    p.append(f'<text x="{W-64}" y="{H-74}" text-anchor="end" font-family="{M}" font-size="16" letter-spacing="5" fill="{INK}" opacity=".45">KİŞİSEL SERGİ</text>')
    p.append(f'<rect width="{W}" height="{H}" filter="url(#gr)" opacity=".15" style="mix-blend-mode:overlay"/>')
    p.append('</svg>')
    return '\n'.join(p)

os.makedirs('public/taslak', exist_ok=True)
open('public/taslak/afis-kalinti.svg', 'w', encoding='utf-8').write(uret())
print('afiş üretildi')
