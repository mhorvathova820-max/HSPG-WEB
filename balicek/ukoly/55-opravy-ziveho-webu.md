# Úkol 55: Opravy živého webu podle auditu 22. 10. – embargo slov, 5 kroků, SENTINEL, „Cena ihned“ s celým postupem
> Priorita P0 · Závisí na: 50 (cenové jádro, Standard HOLUB) · Čeká na majitele: nic – jde o pravdivost a soulad s rozhodnutími R15–R18.

## Proč
Živý hspg.cz (stav 22. 10. 2026, 5:30) ukazuje starší verzi obsahu, která je v rozporu s rozhodnutími majitele a s balíčkem:
- úvodní část: „z mapových podkladů“ (embargo slov, KONTEXT §4.10);
- okno „Cena ihned“: text „z veřejných mapových podkladů ČÚZK“ a jen dvě volby („Čištění a impregnace H-STONE“ a barevná renovace) – chybí celý postup Standardu HOLUB a volba „Čištění a ošetření“;
- úvodní stránka: 4 kroky místo 5 (chybí 02 Odmaštění / 04 Oplach podle toho, jak je to dnes rozepsané) a tarify START / PLUS / PREMIUM místo SENTINEL BASE 499 / PLUS 2 490 / PRESTIGE 5 890 Kč ročně.
Zákazník tak vidí jiný postup a jiné tarify než v kalkulaci, PDF a smlouvě z úkolu 48 → nedůvěra a riziko podle směrnice 2024/825.

## Co udělat
1. Větev `ukol-55-opravy`. Před úpravou `git grep -n -i -E "mapov|satelit|katastr|RÚIAN|z map|letecké|google maps" -- '*.html' '*.js' '*.json' '*.md'` → každý výskyt v textech pro zákazníky nahradit: „HOLUB CORE QUANTUM SENSE · zaměření na dálku“; licenční „© ČÚZK“ zůstává jen malým písmem u zobrazení dat (nikdy ve větě pro zákazníka).
2. **„Cena ihned“ (modal / sekce na úvodní stránce):** nahradit vlastní kalkulačku voláním jádra z úkolu 50/48 (`HSPGCena` + `HSPGNabidka.spust`) – stejný postup jako v H-BOTu: objekt → povrchy (Střecha · Fasáda · Dlažba · Fotovoltaika) → ochrana (**A Neviditelný štít H-STONE · B Barevná renovace RAL · Čištění a ošetření 01–04**) s panelem Standardu HOLUB 01–05 (krok 05 podle volby) → plochy → zapečetěná obálka → orientační cena. Karta „Váháte?“ (`hlidejVahani`) s tlačítky „Zeptat se H-BOTa“ a „Raději zavolejte“. Odkaz „Plochu neznám“ → `/holub-360/#h3a-adresa`. Žádná vlastní kopie sazeb v HTML – jen z `assets/hspg-cenik.json`.
3. **Úvodní stránka:** sekce postupu = 5 kroků z `standard.kroky` (build-hbot generuje `assets/hspg-cenik.json`; text brát odtud, ne natvrdo); věta „Pět kroků ochrany povrchu, které nezkracujeme. Samotné čištění končí krokem 04.“; tarify ze `sentinel.tarify` (BASE/PLUS/PRESTIGE, ceny, body) a podmínka záruky `sentinel.podminka_zaruky`. Všechny výskyty „START“, „PREMIUM“ u tarifů odstranit; stránka `/cenik.html#sentinel` totéž.
4. **Texty u záruky:** všude „Záruka 10 let na impregnaci H-STONE při péči SENTINEL BASE“ – nikde bez podmínky (úkol 05 je zdroj pravdy).
5. Výsledek kalkulace nikde nenazývat „nabídka“ – „orientační cena“ / „orientační kalkulace“ (R15).
6. Doplnit nálezy z auditu Claude v Chrome (`balicek/AUDIT-WEB-2026-10-22.md`, až bude): odkazy, kontrast, konzole, mobil 375 px, SEO – každý nález jako položka s přesným textem a selektorem; opravit v tomtéž úkolu, pokud je to text/CSS; kód a výkon → úkol 07/16.

## Akceptace
- [ ] `git grep` z bodu 1 nenajde nic v textech pro zákazníky; `node scripts/build-hbot.mjs --kontrola` prošel (kontrola embarga).
- [ ] „Cena ihned“ na úvodní stránce má tři volby ochrany, panel 01–05 a kartu „Váháte?“; test e2e `tests/e2e/cena-ihned.test.mjs` (klik → 3 volby → plochy → pečeť → cena; `axe` bez chyb).
- [ ] Úvodní stránka a `/cenik.html` ukazují 5 kroků a SENTINEL BASE/PLUS/PRESTIGE s cenami z `hspg-cenik.json` (test: text stránky obsahuje „05“, „PRESTIGE“, neobsahuje „PREMIUM“).
- [ ] Nikde „nabídka“ jako název výsledku kalkulace; záruka vždy s podmínkou.
- [ ] Náhled zdarma, screenshoty 1440 a 375 px v hlášení; produkce až po schválení majitelem.
- [ ] Hlášení a stop.
