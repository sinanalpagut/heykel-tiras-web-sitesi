# -*- coding: utf-8 -*-
"""Masaüstündeki gerçek heykel fotoğraflarını siteye hazırlar.

Kaynaklara DOKUNULMAZ; çıktılar public/foto/ altına yazılır.
Telefon fotoğrafları EXIF yönlendirmesi taşıyor — exif_transpose ile düzeltilir,
yoksa bazıları yan yatık görünür.
"""
import os
from PIL import Image, ImageOps

KAYNAK = os.path.expanduser('~/Desktop/heykel')
HEDEF = 'public/foto'

# (kaynak dosya, çıktı adı, dikey kırpma odağı 0=üst 1=alt)
KARELER = [
    ('a9901872-034a-4853-be3f-787938e94e58.JPG', 'bronz-kollar',   0.45),
    ('429ff8d5-19a1-43ea-85d1-09ad90a46fb4.jpg', 'ikili-figur',    0.55),
    ('5fd92e5e-5f3d-436f-9f10-688b0504b94e.jpg', 'blok-govde',     0.45),
    ('a8161eee-cb0d-4e6d-96b7-b2532a98484a.jpg', 'alci-figur',     0.42),
    ('0e765c12-21b8-47d9-951c-4cfc4cc2deb9.JPG', 'seritli-bronz',  0.40),
    ('f6aee362-2a7c-4cc8-afbd-d8b06d475490.jpg', 'ceketli-bust',   0.42),
    ('aeed306e-3477-4a0e-b1df-91f9312d7cf2.JPG', 'seritli-bronz-2',0.40),
    ('d91f8c16-71d9-4a9b-acf3-5dbaf37dba49.jpg', 'atolye-ic',      0.50),
]


def kirp(im, oran_g, oran_y, odak):
    """Merkezden yatay, `odak` oranında dikey kırpma."""
    g, y = im.size
    hedef = oran_g / oran_y
    mevcut = g / y
    if mevcut > hedef:                     # çok geniş → yanlardan kırp
        yeni_g = int(round(y * hedef))
        sol = (g - yeni_g) // 2
        kutu = (sol, 0, sol + yeni_g, y)
    else:                                  # çok uzun → üst/alttan kırp
        yeni_y = int(round(g / hedef))
        ust = int(round((y - yeni_y) * odak))
        ust = max(0, min(ust, y - yeni_y))
        kutu = (0, ust, g, ust + yeni_y)
    return im.crop(kutu)


def yaz(im, yol, genislik, yukseklik, kalite=80):
    im = im.resize((genislik, yukseklik), Image.LANCZOS)
    im.save(yol, 'WEBP', quality=kalite, method=6)
    return os.path.getsize(yol)


os.makedirs(HEDEF, exist_ok=True)
toplam = 0
for dosya, ad, odak in KARELER:
    kaynak = os.path.join(KAYNAK, dosya)
    im = ImageOps.exif_transpose(Image.open(kaynak)).convert('RGB')

    # Eser kartı: 3:4 (çemberdeki kart oranı)
    b = yaz(kirp(im, 3, 4, odak), f'{HEDEF}/{ad}.webp', 1020, 1360)
    toplam += b
    print(f'{ad:18s} 3:4  {b//1024:4d} KB   (kaynak {im.size[0]}×{im.size[1]})')

# Atölye süreç kareleri: 4:5, biraz daha geniş bağlam
SUREC = [
    ('f6aee362-2a7c-4cc8-afbd-d8b06d475490.jpg', 'surec-01', 0.45),
    ('0e765c12-21b8-47d9-951c-4cfc4cc2deb9.JPG', 'surec-02', 0.42),
    ('a8161eee-cb0d-4e6d-96b7-b2532a98484a.jpg', 'surec-03', 0.50),
    ('5fd92e5e-5f3d-436f-9f10-688b0504b94e.jpg', 'surec-04', 0.48),
    ('d91f8c16-71d9-4a9b-acf3-5dbaf37dba49.jpg', 'surec-05', 0.50),
]
for dosya, ad, odak in SUREC:
    im = ImageOps.exif_transpose(Image.open(os.path.join(KAYNAK, dosya))).convert('RGB')
    b = yaz(kirp(im, 4, 5, odak), f'{HEDEF}/{ad}.webp', 1100, 1375)
    toplam += b
    print(f'{ad:18s} 4:5  {b//1024:4d} KB')

print(f'\ntoplam {toplam//1024} KB, {len(KARELER)+len(SUREC)} dosya')
