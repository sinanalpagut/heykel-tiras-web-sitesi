# -*- coding: utf-8 -*-
"""Atölye süreç kareleri — v2. Eser kareleriyle aynı ışık dili: karanlık sahne,
soldan tek yönlü ışık, düşük ortalama parlaklık."""
import math, random, os

INK, METAL, TAS = '#EAEAEA', '#367C65', '#C15D3B'

def kabuk(no, w, h, ic):
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" role="img">
<defs>
<linearGradient id="d" x1=".2" y1="0" x2=".9" y2="1">
  <stop offset="0" stop-color="#2a2620"/><stop offset=".5" stop-color="#1a1613"/><stop offset="1" stop-color="#0b0908"/></linearGradient>
<radialGradient id="hale" cx=".38" cy=".32" r=".65">
  <stop offset="0" stop-color="#6d6459" stop-opacity=".22"/><stop offset="1" stop-color="#6d6459" stop-opacity="0"/></radialGradient>
<linearGradient id="m" x1="0" y1=".1" x2="1" y2=".9">
  <stop offset="0" stop-color="#8f867a"/><stop offset=".14" stop-color="#5a5249"/>
  <stop offset=".42" stop-color="#2a2520"/><stop offset="1" stop-color="#0d0b09"/></linearGradient>
<radialGradient id="temas" cx=".5" cy=".5" r=".5">
  <stop offset="0" stop-color="#000" stop-opacity=".85"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<filter id="as"><feTurbulence type="fractalNoise" baseFrequency=".014" numOctaves="4" seed="{no*13}" result="t"/>
  <feDisplacementMap in="SourceGraphic" in2="t" scale="16" xChannelSelector="R" yChannelSelector="G"/></filter>
<filter id="g" x="0" y="0" width="100%" height="100%">
  <feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="4" seed="{no*7}"/>
  <feColorMatrix type="saturate" values="0"/>
  <feComponentTransfer><feFuncA type="linear" slope=".9"/></feComponentTransfer></filter>
</defs>
<rect width="{w}" height="{h}" fill="url(#d)"/><rect width="{w}" height="{h}" fill="url(#hale)"/>
{ic}
<rect width="{w}" height="{h}" filter="url(#g)" opacity=".17" style="mix-blend-mode:overlay"/></svg>'''

os.makedirs('public/taslak', exist_ok=True)
out = []

# P.01 KALIP AÇMA — açılmış kalıp yarımları, tezgâhta
w, h = 800, 1120; r = random.Random(1); c = []
c.append(f'<rect y="{h*.70:.0f}" width="{w}" height="{h*.30:.0f}" fill="#100d0b"/>')
c.append(f'<rect y="{h*.70:.0f}" width="{w}" height="1.2" fill="{INK}" opacity=".07"/>')
for x, ang, bw, bh in [(.12,-14,.30,.30),(.46,9,.34,.40),(.30,-3,.26,.20)]:
    px, py = w*x, h*.70
    c.append(f'<ellipse cx="{px+w*bw/2:.0f}" cy="{py+6:.0f}" rx="{w*bw*.6:.0f}" ry="{h*.018:.0f}" fill="url(#temas)"/>')
    c.append(f'<g transform="translate({px:.0f},{py:.0f}) rotate({ang})" filter="url(#as)">'
             f'<path d="M0,0 L{w*bw:.0f},{-h*bh*.12:.0f} L{w*bw*.92:.0f},{-h*bh:.0f} L{w*bw*.08:.0f},{-h*bh*.88:.0f} Z" fill="url(#m)"/></g>')
# kalıptan sızan iz
c.append(f'<path d="M{w*.30:.0f},{h*.70:.0f} q{w*.06:.0f},{h*.06:.0f} {w*.14:.0f},{h*.07:.0f}" stroke="{TAS}" stroke-opacity=".22" stroke-width="7" fill="none"/>')
out.append(('surec-01', kabuk(1, w, h, '\n'.join(c))))

# P.02 BAKIR DÖKÜM — karanlıkta akan sıcak metal
w, h = 900, 1000; r = random.Random(2); c = []
c.append(f'<rect y="{h*.80:.0f}" width="{w}" height="{h*.20:.0f}" fill="#0c0a08"/>')
c.append(f'<path d="M{w*.26:.0f},{h*.12:.0f} L{w*.62:.0f},{h*.16:.0f} L{w*.56:.0f},{h*.36:.0f} L{w*.34:.0f},{h*.33:.0f} Z" fill="url(#m)" filter="url(#as)"/>')
# akış
c.append(f'<path d="M{w*.42:.0f},{h*.35:.0f} C{w*.45:.0f},{h*.52:.0f} {w*.40:.0f},{h*.66:.0f} {w*.44:.0f},{h*.80:.0f}" stroke="{METAL}" stroke-opacity=".22" stroke-width="34" fill="none"/>')
c.append(f'<path d="M{w*.42:.0f},{h*.35:.0f} C{w*.45:.0f},{h*.52:.0f} {w*.40:.0f},{h*.66:.0f} {w*.44:.0f},{h*.80:.0f}" stroke="#cfe6dc" stroke-opacity=".55" stroke-width="7" fill="none"/>')
c.append(f'<ellipse cx="{w*.44:.0f}" cy="{h*.805:.0f}" rx="{w*.34:.0f}" ry="{h*.055:.0f}" fill="{METAL}" opacity=".10"/>')
c.append(f'<ellipse cx="{w*.44:.0f}" cy="{h*.805:.0f}" rx="{w*.12:.0f}" ry="{h*.022:.0f}" fill="#d8ebe2" opacity=".30"/>')
for _ in range(24):  # kıvılcım
    sx, sy = w*.44 + r.uniform(-w*.2, w*.2), h*.80 - abs(r.gauss(0, h*.09))
    c.append(f'<circle cx="{sx:.0f}" cy="{sy:.0f}" r="{r.uniform(.8,2.6):.1f}" fill="#e6f2ec" opacity="{r.uniform(.2,.7):.2f}"/>')
out.append(('surec-02', kabuk(2, w, h, '\n'.join(c))))

# P.03 TALAŞ — zeminde metal talaşı
w, h = 720, 720; r = random.Random(3); c = [f'<rect width="{w}" height="{h}" fill="#131010"/>',
                                            f'<rect width="{w}" height="{h}" fill="url(#hale)"/>']
for _ in range(120):
    x, y = r.uniform(0, w), r.uniform(0, h)
    ln, a = r.uniform(20, 90), r.uniform(0, 360)
    c.append(f'<path d="M{x:.0f},{y:.0f} q{ln*.5:.0f},{-ln*.4:.0f} {ln:.0f},{r.uniform(-10,10):.0f}" '
             f'transform="rotate({a:.0f},{x:.0f},{y:.0f})" fill="none" stroke="#b3a99b" '
             f'stroke-opacity="{r.uniform(.10,.55):.2f}" stroke-width="{r.uniform(1.1,3.2):.1f}"/>')
out.append(('surec-03', kabuk(3, w, h, '\n'.join(c))))

# P.04 AŞINDIRMA — taşlanmış yüzey, yakın plan
w, h = 800, 900; r = random.Random(4); c = []
c.append(f'<rect x="{w*.05:.0f}" y="{h*.08:.0f}" width="{w*.90:.0f}" height="{h*.84:.0f}" fill="url(#m)" filter="url(#as)"/>')
for i in range(44):
    yy = h*.10 + i*(h*.80/44) + r.uniform(-3, 3)
    c.append(f'<path d="M{w*.07:.0f},{yy:.0f} q{w*.4:.0f},{r.uniform(-7,7):.0f} {w*.86:.0f},{r.uniform(-5,5):.0f}" '
             f'stroke="{INK}" stroke-opacity="{r.uniform(.02,.10):.2f}" stroke-width="{r.uniform(.8,2.4):.1f}" fill="none"/>')
c.append(f'<ellipse cx="{w*.34:.0f}" cy="{h*.40:.0f}" rx="{w*.26:.0f}" ry="{h*.20:.0f}" fill="{INK}" opacity=".05"/>')
c.append(f'<ellipse cx="{w*.66:.0f}" cy="{h*.62:.0f}" rx="{w*.15:.0f}" ry="{h*.09:.0f}" fill="{TAS}" opacity=".08"/>')
out.append(('surec-04', kabuk(4, w, h, '\n'.join(c))))

# P.05 GÜNEY DUVARI — duvara yaslanmış terk edilmiş işler
w, h = 1400, 900; r = random.Random(5); c = []
c.append(f'<rect y="{h*.78:.0f}" width="{w}" height="{h*.22:.0f}" fill="#0d0b09"/>')
c.append(f'<rect y="{h*.78:.0f}" width="{w}" height="1.2" fill="{INK}" opacity=".06"/>')
x = w*.03
while x < w*.96:
    bw = r.uniform(w*.045, w*.115); bh = r.uniform(h*.20, h*.60); ang = r.uniform(-9, 9)
    c.append(f'<ellipse cx="{x+bw/2:.0f}" cy="{h*.785:.0f}" rx="{bw*.8:.0f}" ry="{h*.020:.0f}" fill="url(#temas)"/>')
    c.append(f'<g transform="translate({x:.0f},{h*.78:.0f}) rotate({ang:.0f})" filter="url(#as)">'
             f'<path d="M0,0 L{bw:.0f},0 L{bw*r.uniform(.75,1.0):.0f},{-bh:.0f} L{bw*r.uniform(0,.2):.0f},{-bh*r.uniform(.85,1.0):.0f} Z" fill="url(#m)"/></g>')
    x += bw + r.uniform(w*.006, w*.03)
out.append(('surec-05', kabuk(5, w, h, '\n'.join(c))))

for ad, ic in out:
    open(f'public/taslak/{ad}.svg', 'w', encoding='utf-8').write(ic)
print(f'{len(out)} süreç karesi v2')
