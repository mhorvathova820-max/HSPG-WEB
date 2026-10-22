# Licence třetích stran – prvky rozhraní na hspg.cz

Soubor `assets/apex-prvky.css` (vzhled Apex, úkol 57) vychází z dvanácti prvků zveřejněných na
[uiverse.io](https://uiverse.io) pod licencí **MIT**. Patička uiverse.io: „MIT License — All content (UI elements)
on this site are published under the MIT License.“ Každá stránka prvku má navíc panel „License“ s plným zněním
licence MIT a řádkem „Copyright - 2026 <autor>“ (ověřeno 22. 10. 2026). Podle podmínek licence zde uvádíme
autory, odkazy a plné znění licence. Soubor je dostupný na webu jako `/LICENSES-THIRD-PARTY.md` (odkaz „Licence“
v patičce).

## Převzaté prvky a jejich autoři

| # | Třída v `apex-prvky.css` | Prvek (původní název) | Autor (uiverse.io) | Copyright | Zdroj |
|---|---|---|---|---|---|
| 01 | `ap-tlacitko` | Button – skleněné tlačítko s leskem („Generate“) | dexter-st | Copyright - 2026 dexter-st | https://uiverse.io/dexter-st/young-newt-20 |
| 02 | `ap-prepinac` | Switch – přepínač s fajfkou a křížkem | Galahhad (Galahad) | Copyright - 2026 Galahhad (Galahad) | https://uiverse.io/Galahhad/modern-quail-75 |
| 03 | `ap-fajfka` | Checkbox – rámeček překreslený na fajfku (stroke-dashoffset) | SelfMadeSystem | Copyright - 2026 SelfMadeSystem (SelfMadeSystem) | https://uiverse.io/SelfMadeSystem/green-bobcat-29 |
| 04 | `ap-srdce` | Checkbox – srdce „Like“ s jiskřením | catraco (Catraco) | Copyright - 2026 catraco (Catraco) | https://uiverse.io/catraco/plastic-moth-91 |
| 05 | `ap-nit` | Loader – zářící prstenec (gradient + blur) | xXJollyHAKERXx | Copyright - 2026 xXJollyHAKERXx | https://uiverse.io/xXJollyHAKERXx/lucky-falcon-75 |
| 06 | `ap-karta` | Card – skleněná karta (backdrop-filter) | joe-watson-sbf (Joseph Watzson) | Copyright - 2026 joe-watson-sbf (Joseph Watzson) | https://uiverse.io/joe-watson-sbf/honest-bullfrog-6 |
| 07 | `ap-napoveda` | Tooltip – bod s odkazovou čárou | vnuny (Diaa) | Copyright - 2026 vnuny (Diaa) | https://uiverse.io/vnuny/stale-mouse-74 |
| 08 | `ap-segment` | Radio – segmentový přepínač ze skla s jezdcem | chase2k25 (chandu.exe) | Copyright - 2026 chase2k25 (chandu.exe) | https://uiverse.io/chase2k25/slimy-chipmunk-97 |
| 09 | `ap-volba-seznam` | Radio – svislý výběr se světelnou linkou | Smit-Prajapati (Smit Prajapati) | Copyright - 2026 Smit-Prajapati (Smit Prajapati) | https://uiverse.io/Smit-Prajapati/quick-panther-98 |
| 10 | `ap-pole` | Input – podtržené pole s plovoucím popiskem | liyaxu123 | Copyright - 2026 liyaxu123 | https://uiverse.io/liyaxu123/warm-eel-62 |
| 11 | `ap-tlacitko-obrys` | Button – zlatý rámeček s kovovým přechodem („SUBSCRIBE“) | vinodjangid07 (Vinod Jangid) | Copyright - 2026 vinodjangid07 (Vinod Jangid) | https://uiverse.io/vinodjangid07/pink-cheetah-68 |
| 12 | `ap-puls` | Button – CTA s pulzujícím prstencem a šipkami („NEXT“) | Li-Deheng (李德恒) | Copyright - 2026 Li-Deheng (李德恒) | https://uiverse.io/Li-Deheng/shy-moth-10 |

Poznámka k 10: zobrazované jméno autora liyaxu123 je na uiverse.io v nelatinském písmu a v licenčním panelu se
vykreslilo jako otazníky; uvádíme proto jen uživatelské jméno.

## Co bylo změněno (všechny prvky)

Úpravy provedl HOLUB Surface Protection Group (Dušan Holub) pro web hspg.cz, 22. 10. 2026; licence MIT úpravy
dovoluje. Společné změny:

- barvy nahrazeny tokeny vzhledu Apex (`--apex-*` z `assets/apex-tokens.css`): čerň `#05070f` / `#0b0f19`,
  zlato `#d4af37`, světlé zlato `#f6e7a8`; žádné pevné barvy v komponentách;
- třídy přejmenovány s předponou `ap-` (BEM), vlastní české názvy;
- cíle dotyku nejméně 44 × 44 px, šířka 100 % na úzkých displejích;
- nativní `<input>` není `display: none`, ale přístupně skrytý (zůstává ovladatelný klávesnicí a čtečkou), doplněn
  viditelný stav `:focus-visible` (obrys 2 px světlé zlato, odsazení 3 px), vazby `label for`/`id`, `aria-*`;
- `@media (prefers-reduced-motion: reduce)` vypíná smyčkové animace a přechody;
- `@media (forced-colors: active)` zachovává stavy při vynucených barvách;
- odstraněna písma z Google Fonts (Poppins) – používá se písmo webu.

Změny u jednotlivých prvků:

- **01 ap-tlacitko:** odstraněna animace po písmenech (čtečky četly písmena zvlášť), blikání ikony ve smyčce a
  přepnutí textu na „Generating“ při `:focus`; modrý odstín (`hue 210deg`) nahrazen zlatem; halo přes `box-shadow`
  místo obalového prvku; doplněn stav `aria-busy`.
- **02 ap-prepinac:** velikost 56 × 30 px, zelená → zlato, kolečko → světlé zlato; druhá varianta řízená
  `aria-pressed` na `<button>`; pružná křivka nahrazena klidnou.
- **03 ap-fajfka:** `stroke-width` 6 → 4, bílá → zlato (nezaškrtnuto tlumená šedá), doplněn text popisku.
- **04 ap-srdce:** růžová → zlato; `display: none` uvnitř `@keyframes` (neplatné) nahrazeno `visibility`; jiskry se
  při omezení pohybu nezobrazí; název pro čtečku přes `aria-label`.
- **05 ap-nit:** fialovo-modrý přechod → zlatý, velikost 100 px → 48 px (a 28 px), vnitřní kruh jako pseudoprvek
  s barvou pozadí přes proměnnou; `role="status"` s textem.
- **06 ap-karta:** pevné rozměry → 100 % šířky s maximem, oranžový odlesk → zlatý, blur 20 px → 12 px, doplněna
  náhrada bez `backdrop-filter`, patkový nadpis a tabulkové číslice.
- **07 ap-napoveda:** bod je `<button aria-describedby>` 44 px, obsah `role="tooltip"`; zobrazení i při
  `:focus-within`, `aria-expanded` a trvale (`ap-napoveda--stale`); čtyři směry čáry přes `data-smer`; odstraněny
  ukázkové okraje (`margin: 150px auto`, `padding-right: 170px`); šířka omezena na `min(300px, 60vw)`.
- **08 ap-segment:** tři barevné jezdce (stříbro / zlato / platina) nahrazeny jedním zlatým, text vybrané položky
  tmavý; počet segmentů přes `--ap-segmenty`; `<fieldset>` + `<legend>`.
- **09 ap-volba-seznam:** `#f7e479` → světlé zlato, šedé popisky → tlumená šedá s kontrastem ≥ 4,5:1; řádky ve
  mřížce se stejnou výškou; počet voleb přes `--ap-volby`.
- **10 ap-pole:** `lightblue` → zlato, šířka 190 px → 100 %, `type="value"` → `type="text"`; vyplutí popisku přes
  `:not(:placeholder-shown)` místo `:valid`; vazba `for`/`id`; animace po písmenech jen jako varianta
  `ap-pole--vlna` se skrytým celým textem pro čtečky; doplněn stav chyby (`aria-invalid`).
- **11 ap-tlacitko-obrys:** text přesunut z `content: "SUBSCRIBE"` do skutečného obsahu tlačítka; 140 × 40 px →
  výška 44 px a šířka podle textu; hnědo-žlutý přechod → zlaté tokeny; přechod 1 s → 0,5 s.
- **12 ap-puls:** růžová → zlato, bílý text → tmavý; puls (`outline` ripple) se nespouští při najetí ani při
  načtení, ale jen třídou `ap-puls--aktivni` po akci uživatele a doběhne nejvýš 3×; blikání šipek a změna barvy ve
  smyčce odstraněny; fokus přes dvojitý `box-shadow`.

## Licence MIT (plné znění, platí pro všech dvanáct prvků)

Držitelé práv: autoři uvedení v tabulce výše (řádek „Copyright - 2026 <autor>“ u každého prvku na uiverse.io).

```
MIT License

Copyright - 2026 <autor prvku podle tabulky výše>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Odkaz na licenci: https://opensource.org/license/mit

## Další knihovny hostované na webu (`assets/vendor/`)

Mají vlastní soubory `LICENSE` vedle kódu, které musí zůstat zachované:

- PDF.js 6.4.299 – Apache License 2.0, © Mozilla a přispěvatelé (`assets/vendor/pdfjs/LICENSE`)
- pdfmake 0.3.11 – MIT, © bpampuch (`assets/vendor/pdfmake/LICENSE`); písmo Roboto ve `vfs_fonts.js` © Google, Apache License 2.0
- three.js r184 – MIT, © 2010–2026 three.js authors (`assets/vendor/three/LICENSE`)

Zdroje dat uváděné přímo u obsahu (© ČÚZK, CC BY 4.0; © přispěvatelé OpenStreetMap, ODbL; MET Norway, CC BY 4.0)
zůstávají u příslušných stránek a nejsou součástí tohoto souboru.
