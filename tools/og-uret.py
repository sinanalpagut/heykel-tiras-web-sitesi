# -*- coding: utf-8 -*-
"""Sosyal paylaşım (Open Graph) görseli: 1200×630.

Kaynak, kayrak taban üzerindeki yeşil patinalı bronz — koyu zemini OG kartında
kendiliğinden galeri havası veriyor. Yazı bilerek YOK: paylaşım kartında başlık
zaten og:title'dan basılır ve elimizde Syne olmadan yazı çizmek ucuz görünürdü.
"""
import os
from PIL import Image, ImageOps, ImageDraw, ImageFilter

# Masaüstündeki orijinal varsa onu, yoksa depodaki işlenmiş kopyayı kullan —
# kaynak klasör geçici, repo kalıcı.
_ADAYLAR = [
    os.path.expanduser('~/Desktop/heykel/a9901872-034a-4853-be3f-787938e94e58.JPG'),
    'public/foto/bronz-kollar.webp',
]
KAYNAK = next(a for a in _ADAYLAR if os.path.exists(a))
G, Y = 1200, 630
ODAK = 0.30  # dikey kırpma odağı — gövde/kollar bandı

im = ImageOps.exif_transpose(Image.open(KAYNAK)).convert('RGB')

# cover kırpma
olcek = max(G / im.width, Y / im.height)
im = im.resize((round(im.width * olcek), round(im.height * olcek)), Image.LANCZOS)
ust = max(0, min(round((im.height - Y) * ODAK), im.height - Y))
sol = (im.width - G) // 2
im = im.crop((sol, ust, sol + G, ust + Y))

# kenarlara hafif karartma — kart küçük görünürken özne öne çıksın
maske = Image.new('L', (G, Y), 0)
d = ImageDraw.Draw(maske)
d.rectangle([90, 60, G - 90, Y - 60], fill=255)
maske = maske.filter(ImageFilter.GaussianBlur(120))
koyu = Image.new('RGB', (G, Y), (16, 13, 11))
im = Image.composite(im, Image.blend(im, koyu, 0.55), maske)

im.save('public/og.jpg', 'JPEG', quality=84, optimize=True, progressive=True)
print('public/og.jpg —', os.path.getsize('public/og.jpg') // 1024, 'KB')
