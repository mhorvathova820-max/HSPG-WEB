# HSPG – skládaná vizitka „Vila“

Skládaný triptych (gate-fold) v jazyce luxusních značek. Skládání nese sdělení: zavřená karta ukazuje rytinu zašlé vily, jejíž vstupní dveře leží na švu obou křídel („Věci stárnou.“). Otevřením křídel otevíráš dveře domu a uvnitř je tatáž vila čistá, ve zlatě („My zůstáváme.“).

- **Zavřeno:** štít se střešním vrcholem 90 × 56 mm. Líc = dvě křídla s rytinou zašlé vily: na portálu nad vchodem stojí dvě sochy jako na kostele, vlevo čert s netopýřími křídly, vpravo anděl; mech jako skutečný mech (drobné trsy s vlákny na okraji střechy, u komína, v okapu, pod parapety a na soklu), lišejníky, stékající špína, praskliny; malý emblém a HSPG, „Věci stárnou.“ a „Otevřete“; obrysy vily jsou navíc ve slepotisku. Rub = emblém holuba nad gilošovou rozetou, monogram HSPG, claim, jméno, kontakt a číslo edice.
- **Otevřeno:** 180 × 56 mm. Střed = vila čistá s rozsvícenými okny, čert je pryč, na vrcholu portálu stojí anděl s rozepjatými křídly jako socha, po stranách klasické urny; „My zůstáváme.“ Levé křídlo = postup v pěti krocích (římské číslice). Pravé křídlo = emblém, HSPG, jméno, telefon, hspg.cz, QR.
- **Rozložený arch:** koruna se třemi vrcholy, křídla 45 mm, střed 90 mm; spodní rohy křídel zaoblené r 6 mm, takže zavřená karta má dole půlkruhový výřez na otevření.
- **Barvy:** navy `#08112a`, zlatá `#d4af37`, champagne `#f1e8d2`. Každé pole má dvojitou zlatou linku 1,6 a 2,6 mm od hrany.

Soubory: `out/vila_tisk.pdf` (tisk), `out/vila_vysek.svg` (výsek a bigy), náhledy `out/vila_zavreno.png`, `out/vila_rub.png`, `out/vila_otevreno.png`, `out/vila_nahled.jpg`.

## Zadání pro tiskárnu

- PDF má 5 stran, každá 196 × 72 mm včetně okraje: 1 = strana A (vnější: pravé křídlo, zadní obálka, levé křídlo), 2 = strana B (vnitřní: levé křídlo, střed, pravé křídlo), 3 = maska zlaté fólie pro A, 4 = maska zlaté fólie pro B (černá = fólie), 5 = matrice slepotisku pro A (černá = slepotisk, obrysy vily na křídlech).
- Slepotisk (blind deboss): mosazná matrice, hloubka 0,2–0,3 mm, linky 0,3 mm; registrace na tisk ±0,15 mm. Dělá se po tisku a laminu, před fólií a výsekem.
- Číslovaná edice: na zadní obálce je linka „Nº ____“, číslo se dopisuje ručně zlatým inkoustem (např. Sakura Pen-Touch gold, 1 mm). Strana B je nakreslená tak, jak ji čtenář vidí; arch se otáčí po svislé ose, obrys je symetrický.
- Výsek: spotová barva **CutContour** (magenta, 0,25 pt). Bigy (rýhy pro sklad): spotová barva **Crease** (cyan, čárkovaně) na x = 45 a 135 mm. Obojí netisknout. Totéž je v `out/vila_vysek.svg`.
- Spadávka 2 mm za výsekem, obsah min. 3,5 mm uvnitř.
- Fólie: hot-foil, matná zlatá (např. Kurz Luxor 362 nebo ekvivalent). Rytiny a giloš se tisknou z CMYK, na fólii jsou příliš jemné.
- Materiál: křída nebo bavlněný papír 350–400 g, soft-touch lamino oboustranně, zlatě barvené hrany, bigování před skladem (navy plocha na lomu jinak praská: lamino nebo lak nutný).
- CMYK: navy cílově C100 M85 Y35 K40, zlatá C20 M30 Y80 K10. Před nákladem nátisk, vzorek fólie a složený maket.

## Úpravy a nové verze

```sh
cd marketing/vizitky
python3 src/build.py
```

Vyžaduje Node.js s Playwrightem (Chromium) a Python balíčky `numpy pillow opencv-python-headless segno reportlab pypdf`.

- `src/art.py`: geometrie archu a polí (`FLAT`, `PANEL_*`), emblém (vektorizace loga), giloš, rytina vily (`villa`, dva stavy), kompozice polí (`closed_front`, `back_cover`, `inside_*`). Vše ručně stavěné SVG, bez AI a fotobank.
- `src/build.py`: render přes Chromium, PDF se spotovými linkami CutContour a Crease a maskami fólie.
- Texty a kontakty: `PHONE`, `WEB`, `STEPS` a texty v `src/art.py`. Držet se pravidel HSPG: bez cen, záruk a názvů přípravků.
- Logo a fonty (Playfair Display, Inter, OFL) jsou v `assets/` a pocházejí z HSPG Reels Studia.
