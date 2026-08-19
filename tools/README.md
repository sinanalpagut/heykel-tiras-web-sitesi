# tools/

`public/taslak/` altındaki yer tutucu görselleri üreten betikler. Bağımlılık yok, salt Python 3.

```bash
python3 tools/taslak-eserler.py   # 15 eser karesi
python3 tools/taslak-surec.py     # 5 atölye süreç karesi
```

Betikler proje kökünden çalıştırılmalıdır (`public/taslak/` yoluna yazarlar).

Kadrajı değiştirmek için `taslak-eserler.py` içindeki `TABAN` (zemin çizgisi) ve
`olcek` (özneyi kareye sığdırma) değerlerine bakın. Bir esere farklı bir biçim
vermek için `ESERLER` listesindeki son alanı değiştirin:
`govde · disk · sutun · kirik · kutle · yarik · yatik · asili · iskele`.

Gerçek fotoğraflar yüklendikçe bu klasöre ihtiyaç kalmaz.
