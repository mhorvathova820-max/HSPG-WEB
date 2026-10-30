# Úkol 60: „Cena ihned“ – přesná cena z měření na dálku, odečet oken, dokonalý vzhled
> Priorita **P1** · Závisí na: 23 (`/api/mereni`), 50 (cenové jádro `HSPGCena`), 27 (`/api/cena-z-adresy`), 48 (H-BOT, PDF), 49 (HOLUB 360) · Rozhodnutí: KONTEXT **R23** (30. 10. 2026) · Čeká na majitele: potvrzení `content/otvory.json`, tolerance garance (výchozí 5 %), text advokáta (§ 1820, § 1829 OZ), výslovné ANO k režimu „garantovana-cena“.

## Cíl
Zákazník na hspg.cz klikne **„Cena ihned“**, zadá adresu a do ~20 s dostane profesionální cenu: rozměry střechy a fasád, odečet oken a otvorů, rozpis po položkách, jednu konečnou cenu (neplátce DPH), termín a rezervaci. Vizuálně na úrovni prémiové značky.

## Embargo slov (KONTEXT §4 bod 10) – platí pro všechny texty tohoto úkolu
V textech pro zákazníky nikdy „katastr“, „RÚIAN“, „letecké mapy“, „letecký snímek“, „satelitní snímky“, „Google Maps“, „z map“ / „z mapových“. Měření se jmenuje **HOLUB CORE QUANTUM SENSE · zaměření na dálku** (jen název, žádná tvrzení o kvantové technologii). Licenční uvedení „© ČÚZK, CC BY 4.0“ / „© přispěvatelé OpenStreetMap“ malým písmem zůstává všude, kde se podklad zobrazuje. Výhrada u výkresů: „Schéma, ne geodetické zaměření.“

## 1) Jedno tlačítko „Cena ihned“ na celém webu
- Hlavička (desktop i mobil), hero homepage, každá stránka služby, ceník, H-BOT, mobilní lišta.
- Vede na `/holub-360/#h3a-adresa` (adresa předvyplněná, pokud ji zákazník už zadal); bez JS odkaz na `/akce/`. Zlaté tlačítko Apex, jemný puls (vypnutý při `prefers-reduced-motion`).

## 2) Měření (server – rozšíření `/api/mereni` a `/api/cena-z-adresy`)
- Obrys výhradně z RÚIAN; OSM jen záloha s upozorněním a nižší přesností.
- Výška okapu/hřebene z DMP 1G − DMR 5G; když dům ve výškopisu není (stavba po roce skenu), výška z počtu podlaží a přesnost se sníží – vždy pravdivě.
- Výstup navíc: fasády po stranách (délka × výška, štíty u sedlové střechy, bez společných zdí se sousedy), plocha střechy po sklonu, hrubá plocha fasád, **přesnost v %** u každé plochy (z chyby zdrojů: obrys, 0,4 m výškopisu, odhad vs. zadání oken).
- Veřejně dál nikdy: výškový model, sousední budovy, souřadnice bodů (pravidlo úkolu 27).

## 3) Odečet oken a otvorů
a) **Automatický odhad:** podíl otvorů podle typu budovy (způsob využití + podlaží) z nového `content/otvory.json`. Výchozí NÁVRH k potvrzení majitelem: rodinný dům 15 %, bytový dům cihlový 22 %, panelový dům 28 %, administrativní 38 %, hala 5 %, jiný 18 %. Do potvrzení `"potvrzeno": false` a u odečtu štítek „odhad“.
b) **Zpřesnění zákazníkem** (volitelné, do 60 s): u každé fasády počítadlo s rychlými velikostmi – okno 90×120, 120×150, 150×150, balkonové dveře 80×210, vchodové dveře 100×210, garáž 250×210, vlastní rozměr; lodžie/balkon jako plocha. Odečet se přepočítá živě.
c) **Fotky fasád** (volitelné, z mobilu): uloží se k poptávce, majitel do 24 h potvrdí plochy → stav „Ověřeno HSPG“ v nabídce i v e-mailu.
- Plocha k ošetření = hrubá plocha fasády − otvory. Ostění přidat jen, pokud to obsahuje ceník – jinak nic nepřidávat. Zakrývání oken u bytových domů = `addons.svj_window_masking` z `ceny.json`. **Vše počítá `HSPGCena` – žádná druhá logika cen.**

## 4) Cena
- Jedno číslo + rozpis: povrchy × sazba, příplatky, sleva (nejvyšší, nesčítají se), doprava, minimum 4 900 Kč, „Nejsme plátci DPH – cena je konečná“.
- Režim v `content/cenik-potvrzeni.json` → `"rezim"`:
  - `"orientacni-cena"` (výchozí, pravidla beze změny): „Orientační cena“, „Orientační výpočet, ne nabídka“.
  - `"garantovana-cena"` (připravit, **NEZAPÍNAT**): „Garantovaná cena“ + podmínka „Cena platí, pokud se skutečná plocha při kontrole na místě neliší o více než 5 %. Menší plocha = nižší cena. Při rozdílu nad 5 % přepočítáme stejnou sazbou za m² a můžete bez sankce odstoupit.“ Tolerance v `content/cena-ihned.json`. Přepnutí jen po výslovném ANO majitele a s textem advokáta (informace spotřebiteli § 1820 OZ, odstoupení 14 dnů § 1829, žádost o zahájení před uplynutím lhůty); do té doby `[DOPLNIT: text advokáta]` a test, že s prázdným textem režim zapnout nejde.
- Záruka 10 let jen s podmínkou SENTINEL BASE + „Zákonná práva … nejsou dotčena“; cesta B bez čísla. Bez potvrzeného ceníku žádné Kč.

## 5) Vzhled – pro zákazníka dokonalý
Identita Apex: matná čerň, obsidiánové sklo, zlato #D4AF37 / #C9A227, navy #1E3A5F, nadpisy Playfair Display, čísla tabulkovými číslicemi. Nic dětského, žádný robot. Každý krok má statickou verzi pro reduced-motion, animace 60 fps.
1. **Adresa:** velké skleněné pole s našeptávačem, pod ním „HOLUB CORE QUANTUM SENSE · zaměření na dálku“.
2. **Sken:** výřez snímku, po něm se kreslí zlatý obrys domu (1,2 s), zlatá skenovací linka, naskakující čísla Střecha / Fasády / Okna. Licence „© ČÚZK“ malým písmem.
3. **Pohledy na fasády:** technické náčrty (SVG) každé strany s kótami v metrech; okna jako průsvitné obdélníky, které se při odečtu „vyjmou“ (fade + posun čísla). Přepínání stran S/J/V/Z. Dole „Schéma, ne geodetické zaměření.“
4. **Zpřesnění oken:** elegantní počítadla +/−, náhled velikosti okna v měřítku.
5. **Nabídka:** dokument na tmavém skle jako papírová nabídka – hlavička s holubem, „Dušan Holub, IČO 09291881“, číslo NK-RRRR-NNNN, datum, platnost 30 dní, tabulka položek (m², sazba, cena), zlatá konečná cena s animovaným dopočtem, přesnost („Přesnost ±4 %“), štítky „odhad“ / „zadáno zákazníkem“ / „Ověřeno HSPG“.
6. **Akce:** „Rezervovat termín“ (kalendář s technologickým oknem), „Stáhnout PDF“ (A4, tisk bez tmavého pozadí), „Zavolejte mi“ (+420 736 618 486), „Poslat na e-mail“.
- Mobil 390 × 844 a 375 bez vodorovného posunu, ovladatelné palcem; desktop dvousloupcově (vlevo dům a pohledy, vpravo nabídka).
- Výkon: LCP ≤ 2,5 s, snímek jeden WebP výřez, bez těžké mapové knihovny; Three.js jen v HOLUB 360 a až po LCP. Přístupnost: axe bez vážných chyb, čísla čitelná čtečkou.
- Mikrotexty ověř s radou AI (`rada.mjs --role opus,astra`) – srozumitelnost, žádné přehánění.

## 6) Pojistky
Limity z úkolu 27 (hash IP, 5 měření/h, 15/den, denní strop), cache adresy, bez AI v ceně. Žádná vymyšlená čísla – co zdroj nevrátí, je `null` a zákazník zadá ručně. V logu jen obec. Formulář podle úkolů 09/55; test jen s TEST a souhlasem majitele.

## Akceptace
- [ ] Unit testy: plochy po odečtu (ručně spočítané 3 domy: rodinný, panelový, řadový), přesnost, oba režimy ceny, blokace „garantovana-cena“ bez textu advokáta, žádné Kč bez potvrzeného ceníku, embargo slov.
- [ ] Náhled na 5 reálných adresách (RD, panelák, řadový dům, novostavba mimo výškopis, hala): snímky všech 6 scén desktop + mobil, tabulka naměřených ploch pro kontrolu majitelem.
- [ ] Lighthouse mobil LCP ≤ 2,5 s, axe OK, reduced-motion OK, PDF s CSP z úkolu 15.
- [ ] Hlášení podle §5 s řádkem „Co potřebuji od majitele: potvrzení otvory.json, tolerance, text advokáta, ANO k režimu garantovaná cena“ a stop. Produkce jen po „nasaď“.
