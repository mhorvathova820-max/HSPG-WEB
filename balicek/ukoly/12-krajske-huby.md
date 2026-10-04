# Úkol 12: Krajské huby místo okresních stránek
> Priorita P2 · Závisí na: 11 (a přes něj na 05 a 06) a 13 (znění popisů u cen a vět bez nedoložených tvrzení); fáze A2 navíc 08 (hlavička a patička) a 14 (export realizací `content/realizace.json`). V pořadí `PORADI.md` všechny tyto úkoly předcházejí · Čeká na majitele: souhlas se strategií (před fází B), volba indexace hubů, skutečné zakázky s fotkami a souhlasy majitelů domů · Rozsah: **fáze A** = návrh struktury, data, mapování URL, šablona hubů jen na náhledu a oprava textů u cen na okresních stránkách; **fáze B** (až po souhlasu) = 301, sitemap, prolinkování, Search Console

## Proč (s důkazy)
Ověřeno v kopii webu a na živém webu 4. 10. 2026 a v auditech:
- **234 URL tvoří jeden šablonový shluk.** Na `/cisteni-strech/`, `/cisteni-fasad/` i `/cisteni-dlazby/` je po 77 podstránkách (76 okresů + Praha), celkem tedy 231 okresních stránek a k nim 3 rozcestníky. Všech 234 URL je v `sitemap.xml` (ta má celkem 245 URL) a okresní stránky mají `index,follow`. Okresní stránky a `/cisteni-dlazby/` nesou `<html data-gen="build-regions">` (232 souborů). Sekci „podle okresu“ na `/cisteni-strech/` a `/cisteni-fasad/` vkládá `scripts/build-regions.mjs` (značka `<!-- regiony:start … -->`).
- **Liší se jen názvem okresu, což je riziko doorway pages** (audit-seo.json #1). U 10 vzorových dvojic střešních stránek se surový text shoduje z 51–70 % (Kolín × Liberec 52 %). Po zamaskování názvů míst je medián shody 71–73 % a 18 dvojic je shodných na 100 %. 198 z 231 stránek nemá kromě názvů míst ani jeden vlastní pětislovný úsek. Věta „Tato stránka je pro okres X.“ je na 56 stránkách. Kromě loga nemají žádný obrázek ani skutečnou zakázku. Mají 445–528 slov.
- **Uzavřený shluk** (audit-seo.json #2). `grep -c 'cisteni-'` vrací 0 v `index.html`, `cenik.html`, `akce/index.html`, `en.html`, `nabidka-svj.html`, `kalkulacka-svj.html` i `reference.html`. Rozcestníky dostávají odkazy jen z okresních stránek a z ostatních rozcestníků, `/cisteni-*/praha/` má jen 3 příchozí odkazy.
- **Rozsah služby u ceny se liší od ceníku** (audit-pravni_pravdivost.json #17; cena musí říkat, co zahrnuje). Tabulka je stav k 4. 10. 2026, tedy **před úkolem 13**, který „H-BIO“ na webu nahrazuje obecným „biocid“ (13, T06). Platné znění ceníku proto vezmi z `cenik.html` v aktuální `main`, ne z tabulky:

  | Položka (klíč v `content/ceny.json`) | Ceník (`cenik.html`) | Všech 231 okresních stránek |
  |---|---|---|
  | `ochrana_hstone.driveway` 119 | čištění · zapískování spár · impregnace H-STONE | čištění, biocid a impregnace H-STONE |
  | `ochrana_hstone.facade` 168 | čištění · odmaštění · biocid H-BIO · impregnace H-STONE | čištění, biocid a impregnace H-STONE |
  | `ochrana_hstone.roof` 178 | odstranění mechu a lišejníku · biocid H-BIO · impregnace H-STONE | čištění, biocid a impregnace H-STONE |
  | `renovace_color.roof` 268 | čištění · biocid · penetrace · 2× barevný nástřik | čištění, penetrace a 2× barevný nástřik |
  | `renovace_color.facade` 298 | čištění · penetrace · 2× fasádní nátěr strojním nástřikem | čištění, penetrace a 2× barevný nástřik |

- **Skutečné realizace zatím nejsou.** `/reference.html` uvádí „Sbíráme první ověřené reference.“ a obsah generuje `scripts/build-references.mjs` z `content/reference.json`. Blok `REALIZACE-PAS` na homepage je prázdný. Hub proto nesmí ukazovat zakázky, počty ani fotky, dokud k nim nejsou data se souhlasem.
- **E-mail „Master plán“** navrhuje 14 krajských hubů a smazání 234 stránek. Podle `POSUDEK-MASTER-PLANU.md` se to přebírá jen s 301, skutečnými daty a pravdivým textem pro začátek („cold start“). Smazat stránky bez přesměrování by znamenalo ztratit indexaci i odkazy.
- **Hledanost se neměřila.** Data ze Search Console ani ze Skliku nejsou k dispozici (audit-seo.json, oddíl „neověřeno“). Volba struktury proto vychází z toho, jak jsou dotazy postavené, a z nároků na údržbu. Žádná čísla hledanosti nepiš.

## Cíl (měřitelný)
**Fáze A** (bez nových dat; na produkci jen oprava z kroků 4–5, a to v dávce):
1. Návrh informační architektury, který majitel může schválit: 14 krajů × 3 služby = 42 hubů. Doporučení a zdůvodnění je v kroku 7.
2. `content/presmerovani-okresy.csv` s 234 řádky (228 × `301`, 3 × `hub` pro Prahu, 3 × `rozcestnik`). Generuje ho skript z dat a hlídá test.
3. Šablona hubu v `scripts/build-regions.mjs` vytvoří v režimu náhledu 42 hubů (noindex, mimo sitemap, bez odkazů z webu). Obsah je jen z dat a pokrývají ho testy.
4. Okresní stránky zůstávají, ale text u každé ceny se shoduje s ceníkem (jeden zdroj) a věta „Tato stránka je pro okres“ se nevyskytuje nikde.

**Fáze B** (až po písemném souhlasu majitele):
5. 228 okresních URL vede jedním skokem 301 na hub. Sitemap ani výstup webu na ně neobsahují žádný odkaz. Homepage a ceník odkazují na rozcestníky. Majitel má checklist pro Search Console.

## Rozsah
ANO:
- data krajů a okresů na jednom místě,
- popisy rozsahu cen na jednom místě (ceník i okresní stránky),
- odstranění výplňové věty,
- mapovací CSV, šablona hubu, režimy generátoru, skript pro měření podobnosti, testy, náhled,
- ve fázi B: přesměrování, sitemap, sekce regionů na rozcestnících, odkazy z homepage a ceníku, checklist Search Console.

NE:
- **mazání okresních stránek, 301 ani změny sitemap ve fázi A**,
- title, description, H1 a „bez lešení“ na okresních stránkách a rozcestnících, Service JSON-LD a drobečky rozcestníků, stránka fotovoltaiky (úkoly 11 a 13 – tady se jejich výsledek jen převezme),
- znění záruky (úkol 05 – jen převzít z centrálního místa),
- podoba URL `/x` × `/x.html` a obecné přesměrování `/index.html` (úkol 06),
- hlavička a patička (úkol 08 – jen převzít komponentu),
- tvrzení o H-BIO a technologiích (úkol 13),
- registr realizací, zadávání zakázek a souhlasy (úkol 14 – tady se jen čte export),
- parametr zdroje ve formulářích (úkol 02),
- vypočtené vzdálenosti a částky za dopravu pro jednotlivé okresy a místní statistiky ČSÚ/ČHMÚ – jen jako návrh do hlášení.

## Postup

### Fáze A1 – data, mapování, oprava okresních stránek
1. Větev `ukol-12-krajske-huby` z aktuální `main`. Ověř, že jsou sloučené úkoly 11, 06 a 13: rozcestníky jdou z jednoho generátoru, URL mají jednotnou podobu, sitemap vytváří skript a v `cenik.html` ani v šabloně okresních stránek už není „H-BIO“ (`grep -c "H-BIO" cenik.html scripts/build-regions.mjs` → 0, pokud úkol 13 nerozhodl jinak). Před fází A2 ověř i sloučení úkolů 08 (komponenta hlavičky a patičky), 05 (centrální text záruky) a 14 (`content/realizace.json`). Pokud některý chybí, zastav se a nahlas to.
2. Najdi v repozitáři soubory, které generují okresní stránky a rozcestníky:
   - `scripts/build-regions.mjs` (podle komentáře v HTML), a odkud bere okresy a kraje včetně tvarů „Středočeského kraje“ a „ve Středočeském kraji“, které už na webu jsou,
   - generátor sitemap (úkol 06), `_redirects` a `netlify.toml`, `scripts/build-ceny.mjs`, `scripts/build-references.mjs` a `content/reference.json`,
   - jak se spouštějí testy (`package.json`).

   Zjisti, jestli generátory zapisují přímo do pracovního stromu (vygenerované HTML se commituje), nebo do výstupní složky při nasazení (po úkolu 07 může build běžet přes `npm run build` do ignorované složky `dist/`, viz `netlify.toml` → `publish`). Podle toho nastav režimy v kroku 8 a příkazy `grep`/`git diff` v ověření spouštěj nad skutečným výstupem.
3. **Data krajů na jednom místě.** Pokud jsou kraje natvrdo ve skriptu, přesuň je do `content/kraje.json` (nebo rozšiř existující datový soubor; nezakládej druhý zdroj). U každého kraje: `slug`, `nazev`, `nazev_2p`, `nazev_6p` (s předložkou), `okresy` (u každého okresu `slug` ve stávajícím tvaru, `nazev` a všechny tvary, které generátor dnes používá, např. „okolí Brna“; z nich čerpá CSV i maskování v kroku 12), `kotva` (stávající `id="kraj-<sluzba>-<kotva>"` na rozcestnících), `sousedni` (slugy krajů). Do souboru zapiš i `zdroj_sousednosti`, tedy oficiální mapu krajů ČSÚ nebo ČÚZK s odkazem a datem. Navržené slugy hubů:

   | Kraj | Slug hubu | Okresů | Kotva |
   |---|---|---|---|
   | Hlavní město Praha | `praha` (stávající URL, mění se na hub) | 1 | `praha` |
   | Středočeský kraj | `stredocesky-kraj` | 12 | `stredocesky` |
   | Jihočeský kraj | `jihocesky-kraj` | 7 | `jihocesky` |
   | Plzeňský kraj | `plzensky-kraj` | 7 | `plzensky` |
   | Karlovarský kraj | `karlovarsky-kraj` | 3 | `karlovarsky` |
   | Ústecký kraj | `ustecky-kraj` | 7 | `ustecky` |
   | Liberecký kraj | `liberecky-kraj` | 4 | `liberecky` |
   | Královéhradecký kraj | `kralovehradecky-kraj` | 5 | `kralovehradecky` |
   | Pardubický kraj | `pardubicky-kraj` | 4 | `pardubicky` |
   | Kraj Vysočina | `kraj-vysocina` | 5 | `vysocina` |
   | Jihomoravský kraj | `jihomoravsky-kraj` | 7 | `jihomoravsky` |
   | Olomoucký kraj | `olomoucky-kraj` | 5 | `olomoucky` |
   | Zlínský kraj | `zlinsky-kraj` | 4 | `zlinsky` |
   | Moravskoslezský kraj | `moravskoslezsky-kraj` | 6 | `moravskoslezsky` |

   Kromě Prahy (stávající URL `praha` se záměrně mění na hub) žádný slug hubu nekoliduje se slugem okresu. Ověř to testem.
4. **Popisy u cen na jednom místě.** Do `content/ceny.json` přidej klíč `popisy` se stejnými klíči jako ceny (např. `"ochrana_hstone.driveway": "čištění · zapískování spár · impregnace H-STONE"`). Výchozí znění je **ceníkové**: převezmi ho z `cenik.html` v aktuální `main`, tedy už po úkolu 13. Tabulka v části Proč je jen stav ze 4. 10. a „H-BIO“ z ní zpět nevracej. Pokud `build-ceny.mjs` nebo `assets/ceny.js` nový klíč nesnese, použij samostatný `content/ceny-popisy.json` a v hlášení to zdůvodni. Text pak z dat berou `cenik.html` (např. `<span data-popis="…">` vyplněný při buildu, stejně jako `data-cena`) i generátor regionů. Znění o biocidu tu sám neměň: platí to, co zavedl úkol 13, a případné další změny (např. název povoleného přípravku po dodání dokladu) proběhnou na tomto jednom místě. Pokud úkol 05 už do ceníku zavedl centrální text záruky, nesmíš ho rozbít.
5. **Okresní stránky** (zůstávají živé): v šabloně generátoru nahraď texty rozsahu daty z kroku 4 a odstraň výplňovou větu „Tato stránka je pro okres …“. Nic jiného na nich neměň.
6. **Mapovací CSV** `content/presmerovani-okresy.csv` generuje skript z `content/kraje.json`, ne ručně. Přidej k němu `--kontrola`, která selže, když CSV neodpovídá datům. Formát:
   ```
   stara_url,akce,nova_url,kotva,sluzba,okres_slug,okres_nazev,kraj_slug,kraj_nazev
   /cisteni-strech/kolin/,301,/cisteni-strech/stredocesky-kraj/,okres-kolin,strech,kolin,Kolín,stredocesky-kraj,Středočeský kraj
   /cisteni-strech/praha/,hub,/cisteni-strech/praha/,,strech,praha,Praha,praha,Hlavní město Praha
   /cisteni-strech/,rozcestnik,/cisteni-strech/,,strech,,,,
   ```
   Řádků je 234: 3 služby × 76 okresů = 228 × `301`, 3 × `hub` a 3 × `rozcestnik`. Podoby `/…/index.html` a URL bez koncového lomítka se v CSV nevypisují, ve fázi B je z CSV odvodí generátor přesměrování.
7. **Návrh pro majitele** `docs/krajske-huby.md` (nebo tam, kde repozitář drží dokumentaci). Obsahuje tabulku krajů a slugů, seznam 42 URL, strukturu hubu (krok 9), plán 301, volbu indexace (krok 17) a otázky na majitele. Doporučení a jeho zdůvodnění převezmi a doplň:

   | Kritérium | **14 krajů × 3 služby (42 URL) – doporučeno** | 14 krajů, všechny služby na jedné stránce (14 URL) |
   |---|---|---|
   | Shoda s dotazy | Dotazy mají tvar služba + místo („čištění střech Kolín“). Celý web je členěný po službách. H1 může přesně znít „Čištění střech ve Středočeském kraji“. | Jeden H1 pro tři služby, takže slabší shoda s každým dotazem. |
   | Kvalita 301 | `/cisteni-strech/kolin/` → `/cisteni-strech/stredocesky-kraj/` vede na stejné téma a je rovnocenný cíl. | Ze střešní stránky na obecnou stránku kraje, tedy méně rovnocenný cíl. |
   | Struktura | Zachová větve `/cisteni-<sluzba>/`, drobečky i kotvy krajů na rozcestnících. | Nová větev URL a nové drobečky. |
   | Údržba | Jedna šablona a 42 výstupů z dat. Ceny, popisy a okresy jdou z jednoho zdroje. | Jedna šablona, 14 výstupů a delší stránky. |
   | Riziko šablony | 14 stránek na službu se stejnou kostrou, proto měření podobnosti (krok 12) a volba indexace (krok 17). | Menší počet, ale stejná kostra. |
   | Hledanost | neměřeno | neměřeno |

   Pokud majitel dodá export Search Console (Výkon → Dotazy) nebo data ze Skliku, doplň je do návrhu. Bez nich nic neodhaduj.
> **Pokud A2 v tomto sezení nestihneš, podej hlášení po A1.** Před hlášením po A1 přidej testy A1 z kroku 13 (data krajů, CSV, shoda textů u cen, výplňová věta) a ověř kritéria „Fáze A1“. A1 se smí sloučit do `main` samostatně (po ověření). Na produkci se změní jen texty u cen a zmizí výplňová věta, a to v dávce s dalšími úkoly.

### Fáze A2 – šablona hubu na náhledu
8. **Režimy generátoru** přepíná proměnná `HUBY_REZIM`, výchozí hodnota je v `content/kraje.json`:
   - `vypnuto` je výchozí v `main`. Nevznikne žádný hub a produkční výstup se nezmění.
   - `nahled` vytvoří huby jen v kopii webu v ignorované složce (např. `.nahled/`, přidej ji do `.gitignore`), nikdy v pracovním stromu. Hub Prahy tam nahradí `/cisteni-*/praha/`. Všechny huby mají `noindex,nofollow`, nejsou v sitemap a web na ně neodkazuje.
   - `ostry` je pro fázi B.
9. **Šablona hubu** používá stejné komponenty jako rozcestníky po úkolu 11 a hlavičku a patičku po úkolu 08. Vlastní komponenty nevytvářej. Obsah je jen z dat, bez rotujících variant textu (spinning) a s nezlomitelnými mezerami podle `KONTEXT.md` §4.9. Pořadí sekcí:
   1. Viditelné drobečky: Úvod › Čištění střech › Středočeský kraj.
   2. H1 `Čištění střech|fasád|dlažby` + `nazev_6p` (např. „Čištění fasád v Kraji Vysočina“, „Čištění dlažby v Praze“). Title a description podle pravidel z úkolu 11 (značka, ≤ 160 znaků, žádný bezpodmínečný slib).
   3. Perex jen z vět, které web už po úkolech 11, 13 a 18 používá, např. zaměření na dálku z map a leteckých a uličních snímků (dnes na okresních stránkách). Lhůtu nabídky („do 24 hodin“) uveď jen ve znění, které po úkolu 18 zůstalo na webu nebo v datech jako potvrzený slib reakční doby. Rozcestníky dnes žádnou lhůtu neuvádějí, a pokud potvrzená není, v hubu lhůta nebude. Nepiš „pobočka v kraji“, „místní tým“ ani nic o satelitech.
   4. Ceny jen dané služby: `data-cena` a `data-popis` z kroku 4, minimální zakázka a pravidla platby z `content/ceny.json`, odkaz na ceník.
   5. Doprava: pravidlo z `content/ceny.json`, tedy zdarma do `doprava.zdarma_km` km od `doprava.zakladny`, dál `doprava.kc_za_km` Kč za km (jedna cesta). Přesnou částku uvádí nabídka. Pokud v kraji leží místo z `doprava.zakladny` (Praha, Hradec Králové), uveď to. Žádné vzdálenosti ani částky bez zdroje.
   6. Okresy kraje jako text, ne odkazy: `<li id="okres-<slug>">Kolín</li>`.
   7. Krátký postup ze stejného zdroje jako rozcestník a odkaz na něj pro podrobnosti.
   8. Realizace (krok 11).
   9. FAQ: 3–5 otázek z odpovědí, které už prošly úkoly 11 a 13. Otázka na dopravu se sestaví z dat, otázka na záruku jen z centrálního textu z úkolu 05. FAQPage JSON-LD nepřidávej.
   10. Odkazy: sousední kraje (huby stejné služby podle `sousedni`), další dvě služby ve stejném kraji. U fasád navíc `/nabidka-svj` a `/kalkulacka-svj` (v podobě URL z úkolu 06).
   11. Výzva k akci se stejným cílem a textem tlačítka jako na rozcestníku (dnes `/akce/`; pokud úkol 18 zavedl jiný poptávkový formulář, použij ten) + telefon z `content/firma.json`. Parametr zdroje přidej, jen pokud ho zavedl úkol 02.

   U hubu Prahy převezmi z dnešní `/cisteni-*/praha/` jen věty, které prošly úkoly 11 a 13.
10. **JSON-LD** obsahuje `Service` s `areaServed` (`AdministrativeArea` = kraj), `provider` odkazem na `@id` firmy z úkolu 11, `offers` z `content/ceny.json` a `BreadcrumbList`. **Nikdy** `AggregateRating` ani `Review`. Canonical vede na finální `https://hspg.cz/cisteni-<sluzba>/<slug>/` i v režimu náhledu.
11. **Realizace se zobrazují jen ze skutečných dat se souhlasem.** Zdrojem je `content/realizace.json` – veřejný export registru z úkolu 14 (fáze C, krok 1; `scripts/stahni-realizace.mjs`) – a jeho názvy polí. Položky s `povrch` mimo tři služby hubů (např. `fotovoltaika`) huby ignorují. Jen pokud úkol 14 ještě není sloučený, použij `content/reference.json` přes mapovací funkci a tato minimální pole (vypiš je do hlášení pro úkol 14): `id`, `obec`, `okres_slug`, `kraj_slug`, `mesic` (RRRR-MM), `povrch` (`strecha|fasada|dlazba`), `sluzba` (klíč z ceníku), volitelně `plocha_m2` a `fotky[{pred, po, alt}]`, `souhlas{obec: bool, fotky: bool, datum}`.

    Pravidla platí v pořadí. Při jakékoli nejistotě se nezobrazí nic.
    - Položka bez `souhlas.obec === true` se nezobrazí nikde. Když chybí pole souhlasu, platí, že souhlas není.
    - Fotky se zobrazí jen se `souhlas.fotky === true`.
    - Nikdy se nezobrazí adresa, jméno ani kód pasu domu.
    - Stav **vlastní kraj** nastane, když existuje realizace dané služby v kraji. Zobraz nejvýš 6 nejnovějších: obec, měsíc, povrch, případně fotky.
    - Stav **sousední kraj** (cold start) nastane, když v kraji realizace není, ale je v kraji z `sousedni`. Nadpis „Realizace v sousedním <kraji>“, kraj musí být jasně uvedený.
    - Stav **bez realizace** zobrazí text „V tomto kraji zatím nemáme zveřejněnou realizaci. Zakázky zveřejňujeme jen se souhlasem majitele domu – nic nedoplňujeme naoko.“ a výzvu k akci.
    - **Žádné čítače.** Žádné číslo o počtu zakázek, zákazníků, m², letech praxe ani hodnocení, které nevzniklo z dat. Počet okresů z dat je povolený.

    Pro testy založ fixturu `…/fixtures/realizace-TEST.json` s obcemi zjevně fiktivními (např. „Testov“). Ověř, že žádné ID z fixtury není v produkčním výstupu.
12. **Měření podobnosti** zajistí `scripts/podobnost-stranek.mjs`. Vezme text `<main>` bez skriptů a stylů, převede ho na malá písmena a nahradí všechny názvy krajů a okresů ve všech tvarech z `content/kraje.json` tokenem `@misto`. Pak spočítá Jaccardovu podobnost nad pětislovnými úseky mezi stránkami téže služby. Pro každou službu vypíše medián a maximum zvlášť pro okresní stránky a pro huby. Kontrola správnosti: na okresních stránkách ve stavu `main` **před změnami tohoto úkolu** (např. `git worktree add ../kontrola-main main`) musí vyjít medián blízko auditu (71–73 %, audit měřil 2 926 dvojic na službu nad kopií ze 4. 10.). Pokud vyjde mimo 66–78 %, nejdřív oprav maskování tvarů. Pokud je metrika správně a rozdíl vysvětlují změny šablony z úkolů 11 a 13, uveď to v hlášení. Ve fázi A čísla jen nahlas, nastavený práh neblokuje.
13. **Testy** (`node --test`, nebo podle konvence repozitáře; nové závislosti nepřidávej). Pokrývají vše z akceptačních kritérií fáze A. Patří sem i příprava testu pro fázi B, který v režimu `ostry` selže, pokud je ve výstupu `[DOPLNIT`. Testy A1 (data krajů, CSV, shoda textů u cen, výplňová věta) napiš už ve fázi A1. Pokud úkol 19 zavedl CI, zařaď do něj testy úkolu 12 stejným způsobem jako ostatní testy.
14. **Náhled:** spusť `HUBY_REZIM=nahled` build a náhled nasaď **jen přes `node scripts/nasadit.mjs`** (`KONTEXT.md` §4.4, 0 kreditů). Huby sestav vždy do samostatné ignorované složky `.nahled/`, nikdy do složky `publish` z `netlify.toml` (ani do `dist/`), aby se nedostaly do příštího produkčního nasazení. Skript dnes nasazuje jen složku `publish`. Pokud volbu pro jinou složku nemá, přidej `--dir <složka>`, kterou skript přijme jen bez `--produkce` (s `--produkce` skončí chybou), a pokryj ji testem. `netlify deploy` přímo nevolej, **nikdy `--prod`**. Proti URL náhledu ověř všech 42 hubů (GET, nejvýš 3 souběžně). Formuláře neodesílej.
15. Hlášení po fázi A a **zastav se**. Větev A2 se smí sloučit do `main`, jen pokud je výstup v režimu `vypnuto` stejný jako po A1. Jinak zůstane ve větvi až do souhlasu.

### Fáze B – až po písemném souhlasu majitele se strategií
16. `git fetch` a aktualizuj větev z `main`. Pokud se mezitím změnily `build-regions.mjs` nebo sitemap, slouč je ručně a znovu spusť testy fáze A.
17. **Indexaci hubů** určuje `indexace_hubu` v `content/kraje.json` podle volby majitele:
    - `jen_s_realizaci` (doporučeno): hub dostane `index,follow`, jen když má aspoň 1 zveřejněnou realizaci dané služby ve vlastním kraji. Huby Prahy jsou vždy `index`, protože jde o stávající URL a domovský trh. Ostatní huby mají `noindex,follow` a nejsou v sitemap. S přibývajícími daty z úkolu 14 se indexace zapíná sama.
    - `vse`: všechny huby jsou `index,follow`.

    Do hlášení dej čísla podobnosti z kroku 12, ať majitel volí s daty.
18. **Režim `ostry`:**
    - Huby se vygenerují do produkčního výstupu.
    - Generátor ve **stejném commitu** přestane vytvářet okresní stránky. Jejich vygenerované soubory se smažou až s přesměrováním, nikdy dřív.
    - Přesměrování generuje skript z CSV do bloku mezi značkami v `_redirects` (nebo v `netlify.toml`, podle úkolu 06). Pro každý řádek `301` platí pravidlo pro `/x/`, `/x` i `/x/index.html` se stavem `301!`, a to **před** obecným pravidlem pro `index.html` z úkolu 06, aby nevznikl řetězec.
    - Kotvu `#okres-<slug>` dej do cíle, jen pokud ji náhled vrátí v hlavičce `Location` beze změny (`curl -sI`). Jinak cíl zůstane bez kotvy.
    - CSV ani přesměrování nikdy neodstraňuj.
19. **Sitemap** (generátor z úkolu 06): odeber všech 228 URL s akcí `301`, přidej huby s `index`. Žádná stránka s `noindex` v sitemap být nesmí.
20. **Rozcestníky:** sekci regionů změň na „… podle kraje“ se 14 odkazy na huby. Okresy zůstanou pod krajem jako text, stávající `id="kraj-…"` se zachovají.
21. **Prolinkování** (audit-seo.json #2):
    - homepage `#sluzby` → 3 rozcestníky s popisným textem odkazu,
    - řádky ceníku střecha/fasáda/dlažba → rozcestníky,
    - homepage → huby Prahy,
    - hub Středočeského kraje ↔ hub Prahy.

    Odkazy z homepage na rozcestníky na strategii nezávisí. Pokud je majitel chce dřív, smí jít jako samostatný malý commit hned po fázi A.
22. **Náhled:** `scripts/over-presmerovani.mjs <URL náhledu>` (jen GET/HEAD, `redirect: "manual"`, nejvýš 3 souběžně) a testy fáze B. Produkční nasazení jen po schválení majitelem, v dávce a po kontrole kreditů. Po nasazení stejný skript spusť proti `https://hspg.cz`.
23. **Search Console – checklist pro majitele** (vlož do hlášení):
    - [ ] Vlastnictví webu ověřit přes HTML značku nebo soubor, případně záznam TXT v DNS u Wedosu. U Wedosu **jen přidat TXT, MX ani jiné záznamy neměnit**.
    - [ ] Odeslat `https://hspg.cz/sitemap.xml`.
    - [ ] Za 2, 4 a 8 týdnů zkontrolovat: Indexování stránek → „Stránka s přesměrováním“ roste k 228. Huby s `index` jsou „Odesláno a zaindexováno“. V přehledu Výkon porovnat dotazy „čištění střech / fasád / dlažby“ za 28 dní před nasazením a po něm.
    - [ ] Volitelně stejnou kontrolu v nástroji pro webmastery od Seznamu, pokud ho majitel používá.

## Akceptační kritéria
**Fáze A1**
- [ ] `content/kraje.json` obsahuje 14 krajů a 77 okresů v pořadí tabulky z kroku 3: Praha 1, Středočeský 12, Jihočeský 7, Plzeňský 7, Karlovarský 3, Ústecký 7, Liberecký 4, Královéhradecký 5, Pardubický 4, Vysočina 5, Jihomoravský 7, Olomoucký 5, Zlínský 4, Moravskoslezský 6. Každý okres patří právě do jednoho kraje. Sousednost je symetrická a Praha má jediného souseda, Středočeský kraj. Žádný slug hubu kromě `praha` se neshoduje se slugem okresu (test).
- [ ] CSV má 234 datových řádků = 228 × `301` + 3 × `hub` + 3 × `rozcestnik`. `stara_url` jsou unikátní a každá `nova_url` je hub nebo rozcestník. Žádná `nova_url` není `stara_url` s akcí `301`. `--kontrola` skončí s kódem 0 (test).
- [ ] Text u každé ceny na 231 okresních stránkách a v `cenik.html` (ve fázi A2 i v hubech) se shoduje s daty z kroku 4 (test porovnání řetězců, 0 rozdílů). `grep -ro "H-BIO" <výstup> | wc -l` nevrací víc výskytů než stejný příkaz nad `main` před tímto úkolem.
- [ ] `grep -rl "Tato stránka je pro okres" cisteni-*/` → 0 souborů.

**Fáze A2**
- [ ] V režimu `vypnuto` se výstup proti `main` liší jen texty rozsahu cen (v `cenik.html` včetně `data-popis`) a výplňovou větou. Ověří to test `vypnuto`: po odstranění těchto textů z obou verzí jsou všechny vygenerované soubory shodné s `main`, 0 jiných rozdílů. Pokud už je A1 v `main`, nesmí se výstup lišit vůbec. Dále `git diff --quiet main -- sitemap.xml` → kód 0 a `ls -d cisteni-*/*-kraj cisteni-*/kraj-vysocina 2>/dev/null | wc -l` → 0 (ve stromu ani v `publish` není žádný hub). `git diff --stat main` je v hlášení.
- [ ] V režimu `nahled` vznikne 42 hubů a každý splňuje:
  - právě 1 H1 s „Čištění střech|fasád|dlažby“ a `nazev_6p`,
  - `noindex,nofollow`, canonical na finální URL,
  - JSON-LD projde `JSON.parse`, obsahuje `Service` a `BreadcrumbList` a neobsahuje `AggregateRating`, `Review` ani `FAQPage`,
  - každá hodnota `data-cena` odpovídá `content/ceny.json`,
  - seznam okresů odpovídá `content/kraje.json`.
- [ ] Realizace (test s fixturou TEST) ověřují:
  - stavy vlastní kraj, sousední kraj a bez realizace,
  - položka bez souhlasu se nezobrazí, fotky jen se `souhlas.fotky`,
  - ve výstupu není adresa, jméno ani kód pasu domu (fixtura je obsahuje v polích navíc a test jejich hodnoty i vzor `HS-\d{4}-\d{4}` ve výstupu nenajde),
  - se skutečnými daty jsou dnes všechny huby ve stavu bez realizace (nebo odpovídají skutečným datům).
- [ ] V hubech je 0 čítačů. Test s regexem `/\d[\d  ]*\s*(zakáz|realizac|zákazník|spokojen|hodnocen|let praxe)/i` nad textem hubů vrací 0 shod.
- [ ] `podobnost-stranek.mjs --typ okresy` nad `main` před změnami tohoto úkolu dá medián v rozmezí 71–73 % ± 5 p. b. (kontrola metriky, krok 12). Hodnoty okresních stránek po A1 jsou v hlášení.
- [ ] `podobnost-stranek.mjs --typ huby --vstup .nahled` vypíše medián a maximum hubů pro každou službu.
- [ ] Na náhledu (nasazeném přes `scripts/nasadit.mjs`) vrací všech 42 hubů 200 a `noindex`. `git diff main -- .nasazeni-produkce.json` je prázdný (žádné produkční nasazení) a v hlášení je výstup `nasadit.mjs` s adresou náhledu.
- [ ] Lighthouse mobil na 1 hubu (náhled): přístupnost ≥ 95. Nižší skóre SEO kvůli `noindex` je očekávané, uveď ho.

**Fáze B**
- [ ] `over-presmerovani.mjs` na náhledu: 228/228 starých URL ve všech třech podobách (`/x/`, `/x`, `/x/index.html`) vede právě jedním skokem 301 na `nova_url` z CSV a cíl vrací 200.
- [ ] `sitemap.xml` neobsahuje žádnou URL s akcí `301` ani žádnou stránku s `noindex`. Obsahuje 3 rozcestníky a všechny huby s `index` (test).
- [ ] V celém výstupu (HTML, JS, JSON) není žádný odkaz na URL s akcí `301` (test).
- [ ] `index.html` i `cenik.html` odkazují na všechny 3 rozcestníky. Každý rozcestník odkazuje na 14 hubů. Fasádní huby odkazují na `/nabidka-svj` (test).
- [ ] Indexace hubů odpovídá `indexace_hubu`. Seznam indexovaných hubů je v hlášení. Výstup režimu `ostry` neobsahuje `[DOPLNIT`.
- [ ] Produkce byla nasazena až po schválení. Stejný skript proti `https://hspg.cz` vrací 228/228.

## Ověření
```
node scripts/build-regions.mjs --kontrola            # vygenerované soubory i CSV odpovídají datům → kód 0
node --test <testy úkolu 12>                         # vše prošlo, uveď počet
grep -rl "Tato stránka je pro okres" cisteni-*/ | wc -l          # 0
grep -ro "H-BIO" <výstup> | wc -l                    # ≤ hodnota nad main před úkolem
node scripts/podobnost-stranek.mjs --typ okresy --vstup ../kontrola-main   # medián ≈ 71–73 % (kontrola metriky)
node scripts/podobnost-stranek.mjs --typ okresy      # po A1, čísla do hlášení
HUBY_REZIM=nahled node scripts/build-regions.mjs --vystup .nahled
node scripts/podobnost-stranek.mjs --typ huby --vstup .nahled   # čísla do hlášení
HUBY_REZIM=vypnuto <build> && git diff --stat main   # jen texty rozsahu a výplňová věta
git diff --quiet main -- sitemap.xml; echo $?        # fáze A: 0
ls -d cisteni-*/*-kraj cisteni-*/kraj-vysocina 2>/dev/null | wc -l   # fáze A: 0 hubů ve stromu
node scripts/nasadit.mjs --dir .nahled               # náhled zdarma → URL náhledu (volba --dir viz krok 14); nikdy --prod
npx lighthouse <URL náhledu>/cisteni-strech/stredocesky-kraj/ --only-categories=accessibility --form-factor=mobile --quiet --output=json --output-path=/tmp/lh-hub.json \
  && node -e "console.log(require('/tmp/lh-hub.json').categories.accessibility.score)"   # ≥ 0.95
node scripts/over-presmerovani.mjs <URL náhledu>     # fáze B: 228/228, 1 skok, cíl 200
curl -s <URL>/sitemap.xml | grep -o '<loc>[^<]*' | sed 's#<loc>https://hspg.cz##' \
  | grep -Fxf <(awk -F, '$2=="301"{print $1}' content/presmerovani-okresy.csv) | wc -l   # fáze B: 0
```
Názvy skriptů a parametrů přizpůsob repozitáři a skutečné příkazy uveď v hlášení. Testy, které agent přidá: data krajů, CSV, shoda textů u cen, šablona hubu (H1, robots, canonical, JSON-LD, ceny, okresy), stavy realizací s fixturou, zákaz čítačů, režim `vypnuto` beze změn a pro fázi B přesměrování, sitemap a interní odkazy.

## Bez AI / s AI
Huby i okresní stránky generuje deterministický skript z dat a při buildu se žádná AI nevolá. Web funguje stejně bez AI. Pokud majitel bude chtít od AI koncept textu pro kraj (např. přes AI centrum z úkolu 14), smí AI jen přeformulovat dodanou tabulku faktů. Výsledek je pouhý návrh do `content/`: nová fakta se označí `[DOPLNIT: …]`, změnu si majitel prohlédne v diffu a schválí. Nic se nikdy nenasadí přímo (audit-ai_integrace.json #16).

## Nepřekročitelná pravidla
Viz `balicek/KONTEXT.md` §4. Pro tento úkol navíc:
- Ve fázi A se okresní stránky nemažou, nepřesměrovávají ani nemizí ze sitemap. Huby jsou jen na náhledu.
- Nic se nevymýšlí: realizace, počty, fotky, vzdálenosti, hledanost, „pobočky“, recenze, hvězdičky ani pojištění. Chybějící fakt se označí `[DOPLNIT: …]` a nahlásí. Texty z e-mailu „Master plán“ (satelitní analýza, hodnocení 4,9/5, pojistné částky) se nepřebírají.
- Z realizací se zveřejňuje jen obec a jen se souhlasem. Údaje zákazníků nepatří do veřejného repozitáře `HSPG-WEB` ani do hlášení.
- Přesměrování a CSV jsou trvalé. Mezi starou URL a hubem smí být nejvýš jeden skok.
- Kredity: průběžně testuj lokálně a na náhledu. Do produkce se nasazuje jen po schválení a v dávce.
- DNS: pro Search Console se smí jen přidat TXT, **MX neměnit**. Žádné nové API klíče ani tokeny.

## Hlášení po dokončení
Formát z `KONTEXT.md` §5. Navíc:
- **Fáze A:**
  - odkaz na náhled a seznam 42 URL hubů,
  - statistika CSV (234 = 228/3/3),
  - výsledky testů,
  - podobnost (medián a maximum pro okresní stránky i huby, pro každou službu),
  - `git diff --stat` režimu `vypnuto`,
  - schéma polí realizací pro úkol 14,
  - otázky na majitele: souhlas se strategií 14 × 3, volba `indexace_hubu`, schválení textů hubů na náhledu, skutečné zakázky se souhlasy, případně export Search Console.
- **Fáze B:**
  - výsledek `over-presmerovani.mjs` (náhled i produkce),
  - počty v sitemap,
  - seznam indexovaných hubů,
  - checklist Search Console s daty kontrol.
- **Návrhy mimo rozsah:** tabulka vzdáleností a dopravy podle okresů se zdrojem a datem, místní údaje ČSÚ/ČHMÚ s citací (audit-seo.json #1, bod 2), další úpravy podle dat ze Search Console.
