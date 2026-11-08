# HSPG – tvarové vizitky (die-cut)

Vysekávané oboustranné vizitky s kreslenou postavou řemeslníka a technikou. Formát vychází z virálních „pop-up cards“.
Líc: ilustrace + bílý okraj 3 mm. Rub: navy + zlatá, kontakty, QR na hspg.cz, claim.

| Varianta | Soubor pro tisk | Rozměr výseku |
|---|---|---|
| Střechy | `out/strecha_tisk.pdf` | 89,7 × 62,1 mm |
| Fasády | `out/fasada_tisk.pdf` | 89,9 × 65,2 mm |
| Dlažby a terasy | `out/dlazba_tisk.pdf` | 90,9 × 64,2 mm |

Náhledy: `out/<varianta>_nahled.jpg` (líc + rub), `out/<varianta>_lic.png`, `out/<varianta>_rub.png`.

## Zadání pro tiskárnu

- PDF má 2 strany: 1 = líc, 2 = rub. Rub je už zrcadlově otočený podle tvaru líce.
- Výsek: vektorová linka ve spotové barvě **CutContour** (100 % magenta, 0,25 pt) na obou stranách. Netiskne se. Samotná linka je i v `out/<varianta>_vysek.svg`.
- Rub má spadávku 2 mm za výsekem, texty jsou min. 3,5 mm uvnitř.
- Doporučení: křída 350 g, matné lamino oboustranně, tvarový výsek (plotter/laser).
- Barvy jsou v RGB (navy `#0e1b33`, zlatá `#d4af37`): tiskárna je převede do CMYK. Kdo chce zlatou fólii nebo přesné CMYK, ať si vyžádá nátisk.

## Úpravy a nové verze

```sh
cd marketing/vizitky
python3 src/build.py            # všechny varianty
python3 src/build.py strecha    # jen jedna
```

Vyžaduje Node.js s Playwrightem (Chromium) a Python balíčky `numpy pillow opencv-python-headless segno reportlab pypdf`.

- `src/art.py`: ilustrace jako ručně stavěné SVG (žádné AI ani fotobanky). Nová varianta = nová funkce `scene_*` a záznam v `SCENES`.
- `src/build.py`: výsek se počítá automaticky z obrysu ilustrace a musí to být jeden kus. Rub se vkládá do největší volné plochy tvaru a kontroluje se bezpečná zóna (`back content inside the safe zone`).
- Texty a kontakty jsou v `src/build.py` (`PHONE`, `WEB`, `back_block`). Držet se pravidel HSPG: bez cen, záruk a názvů přípravků.
- Logo a fonty (Playfair Display, Inter, OFL) jsou v `assets/` a pocházejí z HSPG Reels Studia.
