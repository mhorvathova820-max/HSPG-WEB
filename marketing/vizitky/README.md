# HSPG – vizitky, couture edice

Tvarové (die-cut) oboustranné vizitky v jazyce luxusních značek: emblém, rytina, monogram, zlatá fólie, přesná geometrie, prázdný prostor.

- **Tvar:** štít se střešním vrcholem, 90 × 56 mm, přesná vektorová geometrie s kruhovými zaobleními, dvojitá zlatá linka 1,6 a 2,6 mm od hrany.
- **Líc:** holub HSPG jako vektorový emblém ve zlaté fólii nad gilošovou rozetou (bankovková technika), monogram HSPG (Playfair Display, prostrkání), popis „Čištění a ochrana povrchů“, claim. Dole pás rytiny se šrafurou a světlem zleva: střechy / palácová fasáda / terasa s balustrádou podle varianty.
- **Rub:** středová typografická kompozice: emblém, HSPG, jméno, telefon, hspg.cz, linka k variantě, pět kroků, decentní QR v rohu.
- **Barvy:** navy `#08112a`, zlatá `#d4af37`, champagne `#f1e8d2`.

| Varianta | Soubor pro tisk |
|---|---|
| Střechy | `out/strecha_tisk.pdf` |
| Fasády | `out/fasada_tisk.pdf` |
| Dlažby a terasy | `out/dlazba_tisk.pdf` |

Náhledy: `out/<varianta>_nahled.jpg` (líc + rub), `out/<varianta>_lic.png`, `out/<varianta>_rub.png`.

## Zadání pro tiskárnu

- PDF má 4 strany: 1 = líc, 2 = rub, 3 = maska zlaté fólie pro líc, 4 = maska zlaté fólie pro rub (černá = fólie, stejná poloha jako strany 1 a 2).
- Výsek: vektorová linka ve spotové barvě **CutContour** (100 % magenta, 0,25 pt) na všech stranách, netiskne se. Tvar je symetrický, rub se neotáčí. Samotná linka je i v `out/<varianta>_vysek.svg`.
- Spadávka 2 mm za výsekem, obsah min. 3,5 mm uvnitř (dvojitá linka je na 1,6 mm záměrně).
- Fólie: hot-foil, matná zlatá (např. Kurz Luxor 362 nebo ekvivalent). Pás rytiny a giloš se tisknou z CMYK (na fólii jsou příliš jemné).
- Doporučené provedení: dvouvrstvá lepená karta 2 × 350 g (celkem cca 700 g), soft-touch lamino oboustranně, zlatá fólie, **zlatě barvené hrany**, tvarový výsek plotrem nebo laserem.
- Převod do CMYK: navy cílově C100 M85 Y35 K40, zlatá C20 M30 Y80 K10. Před nákladem vyžádat nátisk a vzorek fólie.

## Úpravy a nové verze

```sh
cd marketing/vizitky
python3 src/build.py            # všechny varianty
python3 src/build.py strecha    # jen jedna
```

Vyžaduje Node.js s Playwrightem (Chromium) a Python balíčky `numpy pillow opencv-python-headless segno reportlab pypdf`.

- `src/art.py`: geometrie tvaru (`SHAPE`, `RADII`), emblém (vektorizace loga), giloš, rytiny (`engraving_*`), líc a rub. Vše ručně stavěné SVG, bez AI a fotobank.
- `src/build.py`: render přes Chromium, PDF se spotovou linkou CutContour a maskami fólie.
- Texty a kontakty: `PHONE`, `WEB`, `CLAIM`, `VARIANTS` v `src/art.py`. Držet se pravidel HSPG: bez cen, záruk a názvů přípravků.
- Logo a fonty (Playfair Display, Inter, OFL) jsou v `assets/` a pocházejí z HSPG Reels Studia.
