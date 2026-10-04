# Úkol 11: SEO – strukturovaná data, snippety, stránka Kontakt
> Priorita P1 · Závisí na: 05, 06 (podle `PORADI.md` jsou před ním hotové i 03, 04, 08, 13, 16, 17 – jejich výsledky se tu jen převezmou) · Čeká na majitele: nic, co by práci blokovalo. Před produkcí schválí náhled (titulky `/` a `/en`, nadtitulek H1, texty `/kontakt` a `/cisteni-fotovoltaiky/`, nový OG obrázek). Dále odpověď O12 z úkolu 13 (působnost v EU) a odkazy na Firmy.cz a Firemní profil Google po převzetí (Claude v Chrome, úkoly C5 a C6) · Rozsah: **fáze A** = jedna entita firmy v JSON-LD, viditelné drobečky, H1 s klíčovým slovem, Service na rozcestnících, stránka `/kontakt`, `robots.txt` → hlášení a stop; **fáze B** = titulky a popisy, OG/Twitter a nové OG obrázky, stránka čištění fotovoltaiky, výstup bez interních komentářů, údaje NAP pro katalogy

## Proč (s důkazy)
Podklad: `audit-seo.json`, nálezy #6, #9–#13 a #15–#19. Jinam patří #7 JobPosting (úkol 13), #8 Firmy.cz (Claude v Chrome C6), #1 a #2 okresní stránky a prolinkování (úkol 12) a #3, #4, #5, #14 (úkoly 05 a 06). Údaje níže jsou ověřené **4. 10. 2026** v kopii živého webu (247 HTML) a dotazy GET na hspg.cz. Čísla řádků platí pro publikované HTML, ve zdroji se mohou lišit. Úkoly 03, 05, 06, 08, 13 a 17 část stavu změní dřív než tento úkol (e-mail v JSON-LD, záruka, podoba URL, patička, „H-BIO“, odkaz na Facebook). Výchozí čísla proto změř znovu (krok A3).

| # | Nález | Důkaz |
|---|---|---|
| #6 | **Firma je v datech v mnoha kopiích, žádná nemá `@id`.** | `/` ř. 45: `HomeAndConstructionBusiness` „HOLUB Surface Protection Group“ bez `@id` a bez `legalName` (provozovatel je OSVČ Dušan Holub). `identifier` je řetězec „IČO 09291881“, `url` je „https://hspg.cz“ bez lomítka, `areaServed` obsahuje i `Place` „Evropská unie“, který ve viditelném textu `/` není. `geo` 50.0925 / 14.449 leží **332 m** od adresního místa RÚIAN 22348603 (Pernerova 10/32). Podle ČÚZK má bod WGS84 souřadnice 50.090789 / 14.452810, ověřeno dotazem GET na `ags.cuzk.cz`. `/en` ř. 35 má druhou entitu s `url` …/en.html. Na 232 stránkách (231 okresních a `/cisteni-dlazby/`) je `Service.provider` samostatná kopie bez `@id` s `addressLocality` „Praha 8“, kdežto `/` uvádí „Praha 8 – Karlín“. Na `/` mají 4× `Service` vlastní `provider` a `VideoObject.publisher` je samostatná `Organization`. Zbylé 3 `Organization` jsou `hiringOrganization` ve 3× `JobPosting` na `/kariera` (ř. 30), které odstraňuje úkol 13. Celkem 238 uzlů `HomeAndConstructionBusiness` a 4 `Organization`, `@id` 0×. JSON-LD jde naparsovat bez chyby (0 chyb `JSON.parse`). |
| #9 | **„bez lešení“ jako bezpodmínečný slib ve snippetech** | Na 160 stránkách je v 557 polích `<head>`: `title` 154×, `og:title` 154×, `description` 121×, `og:description` 122×, `twitter:description` 6×. Úkol 13 uvádí 554 výskytů na 159 stránkách, rozdíl je v metodě počítání. Rozhoduje test. Text stránek slib omezuje: FAQ okresních stránek „Většinou ne … kdyby bylo lešení výjimečně nutné, uvedeme to v nabídce“, `/cisteni-strech/` „Lešení není automatický předpoklad ani univerzální slib.“ Úkol 13 převádí tělo a H1 na schválenou formulaci F1 „zpravidla bez lešení“. `<head>` výslovně nechává sem. |
| #10 | **Rozcestníky služeb jsou nejednotné** | `/cisteni-strech/` a `/cisteni-fasad/` jsou psané ručně (bez `data-gen`). Mají jen `BreadcrumbList`, žádný `Service` a žádné viditelné drobečky. `/cisteni-dlazby/` (generuje `build-regions`) má `Service` se 2 nabídkami a drobečky. H1 jsou slogany. Klíčové slovo stojí v `<div class="kicker">` těsně **před** H1: „Čištění a ochrana střech / fasád / dlažby“. |
| #11 | **BreadcrumbList bez viditelných drobečků** | Na 9 stránkách: `/cenik`, `/kariera`, `/pas-domu`, `/nabidka-svj`, `/kalkulacka-svj`, `/ochrana-osobnich-udaju`, `/pravidla-akce/`, `/cisteni-strech/`, `/cisteni-fasad/`. Vzor komponenty je na 232 generovaných stránkách: `<nav class="crumbs wrap" aria-label="Drobečková navigace"><ol>…<li aria-current="page">…</li></ol></nav>` na začátku `<main>`. |
| #12 | **H1 bez klíčového slova** | `/` ř. 1203 „Věci stárnou. My zůstáváme.“ (nadtitulek ř. 1202 „PROFESIONÁLNÍ ČIŠTĚNÍ A TRVALÁ OCHRANA POVRCHŮ“ je `div` mimo H1). `/en` ř. 144 „Things age. We remain.“ (nadtitulek ř. 143). Rozcestníky: „Střecha bez mechu. Postup podle krytiny.“, „Čistší fasáda. Připravená na další roky.“, „Vjezd a terasa bez zelených spár.“ |
| #13 | **Náhledy na sociálních sítích** | `og:image` je `https://hspg.cz/assets/og.png` na 247 z 247 stránek. Soubor má 1200 × 630, 336 560 B a `cache-control: max-age=3600`. V obrázku jsou vypálené štítky „Záruka 10 let“, „Cena do 24 h“, „Bez lešení“ a podtitulek „… — bez lešení.“ (ověřeno prohlédnutím staženého souboru). `twitter:card` má jen 13 stránek (chybí na všech 234 `/cisteni-*`), `og:image:width` 12, `og:image:alt` 12. `/en` má `og:locale` en_GB, ale český obrázek. `og:locale:alternate` není nikde. `og:title` se na 245 stránkách rovná `title` včetně přípony značky. Vlastní `og:description` má 12 ručně psaných stránek. |
| #15 | **Chybí Kontakt** | `/kontakt` i `/o-nas` vrací 404 (GET 4. 10.). Identifikace je jen v patičkách (sjednocuje je úkol 08), e-mail je jen za odkazy `data-mail` (úkol 03). |
| #16 | **Chybí stránka čištění fotovoltaiky** | `content/ceny.json`: `cisteni_only.solar` 39, `minimum.fve` 2 490. Na ceníku ř. 233 je „Fotovoltaika – samostatná zakázka od 2 490 Kč – 39“. Homepage má sekci „04 Fotovoltaika“ (texty v `damageData.solar`, ř. 2122) a poster `media/fve-panely-poster.webp` (200). `/cisteni-fotovoltaiky/` vrací 404. |
| #17 | **Hygiena snippetů** | Popis delší než 160 znaků má 5 stránek: `cisteni-dlazby/` rychnov-nad-kneznou 164, jindrichuv-hradec 162, ceske-budejovice 161, uherske-hradiste 161 a `cisteni-fasad/rychnov-nad-kneznou` 163. Přípona titulku: „\| HOLUB HSPG“ 238×, „\| HOLUB“ 6× (`cenik`, `kalkulacka-svj`, `kariera`, `nabidka-svj`, `ochrana-osobnich-udaju`, `pas-domu`), „\| HSPG“ 1× (`reference`). `/` má „… \| celá ČR“, `/en` „… \| Czech Republic & EU“. |
| #18 | **Interní poznámky v produkčním HTML** | 37 komentářů HTML v 8 souborech, např. `/` ř. 1461 „Real job confirmed by the owner … (docs/UKOLY-AGENTI.md)“, značky generátorů s cestami ke skriptům a `/cenik` ř. 206 a 295. Dalších 120 komentářů je v inline CSS a JS ve 13 souborech, např. `/` ř. 303 „docs/design-system.md“, ř. 586 „trace 2026-10-04“, ř. 1090 „QA audit 2026-09-28“. Komentář v živém `/sw.js` říká, že `scripts/build-site.mjs` zapisuje do `dist/`, takže publikovaný výstup je nejspíš oddělený od zdroje (**ověř ve zdroji**). |
| #19 | **`robots.txt` zveřejňuje interní cestu** | Obsah: `User-agent: *`, `Allow: /`, `Disallow:` s cestou interního panelu, `Sitemap: https://hspg.cz/sitemap.xml`. Panel už posílá `x-robots-tag: noindex, nofollow` (GET). Zákaz v `robots.txt` brání Googlu tu hlavičku přečíst. |

**Co funguje a nesmí se zhoršit** (`audit-seo.json`, část „funguje dobře“): každá stránka má jedinečný title a description, 1 canonical a 1 H1. Na webu není žádné `AggregateRating`, `Review` ani hodnocení. Všech 618 nabídek v JSON-LD odpovídá `content/ceny.json`. `FAQPage` na `/` odpovídá viditelnému textu. Platí vzájemný hreflang cs↔en. Lighthouse SEO má 100 na `/`, `/cenik` i na okresní stránce. Telefon je všude stejný.

## Cíl (měřitelný)
1. **Jedna entita firmy.** Uzel `HomeAndConstructionBusiness` s `@id` `https://hspg.cz/#firma` je v plném znění jen na `/` a `/kontakt`, na obou stránkách v **identické** podobě, protože ho vytváří jedna funkce z `content/firma.json`. Všechny ostatní uzly na firmu jen odkazují. Uzlů firmy bez `@id` je 0 (dnes 238 + 4). Uzel obsahuje `legalName` „Dušan Holub“ a `identifier` jako `PropertyValue` IČO 09291881. `geo` leží do 30 m od bodu RÚIAN. `sameAs` neobsahuje `/share/`. `areaServed` neobsahuje EU, dokud majitel nepotvrdí O12.
2. **Drobečky.** Počet stránek, kde se `BreadcrumbList` neshoduje s viditelnými drobečky, je 0 (dnes 9). Shoda platí pro položky i URL.
3. **H1.** H1 na `/`, `/en` a na 4 rozcestnících (střechy, fasády, dlažba, fotovoltaika) obsahuje název služby. Každá stránka má právě 1 H1.
4. **Snippety.** Všechny titulky končí „ | HOLUB HSPG“ a mají nejvýš 65 znaků. Všechny popisy mají nejvýš 160 znaků (dnes 5 delších). „bez lešení“ se v `<head>` vyskytuje jen jako F1 „zpravidla bez lešení“ (dnes 557 polí bez podmínky). Registr tvrzení z úkolu 13 hlídá i `<head>`.
5. **Sociální sítě.** Všechny veřejné stránky mají `twitter:card`, `og:image:width`, `og:image:height` a `og:image:alt` (dnes 13, 12 a 12 z 247). `/en` má anglický obrázek. Obrázky mají méně než 300 KB a nenesou žádný slib (záruka, lešení, „24 h“, ceny).
6. **Nové stránky.** `/kontakt` a `/cisteni-fotovoltaiky/` vrací 200, jsou v sitemap a vede na ně patička všech stránek (`/cisteni-fotovoltaiky/` i menu Služby).
7. **Výstup bez interních poznámek.** V nasazeném HTML je 0 komentářů a 0 odkazů na `docs/` a `scripts/` (dnes 37 komentářů HTML a 120 komentářů CSS/JS).
8. **`robots.txt`** neobsahuje žádnou interní cestu.
9. **Validace.** validator.schema.org hlásí 0 chyb a 0 varování na kontrolních stránkách. Rich Results Test hlásí 0 chyb. Lighthouse SEO zůstává 100.

## Rozsah (ANO / NE výslovně)
**ANO:**
- data: `content/firma.json` (souřadnice, strojová pracovní doba, oblast působnosti, profily) a nový `content/seo.json` (drobečky, typ JSON-LD a texty pro sítě po stránkách),
- knihovna `scripts/lib/seo.mjs`, generátor `scripts/build-seo.mjs`, inventura `scripts/seo-inventura.mjs`, napojení `scripts/build-regions.mjs` na knihovnu (jen `<head>`, JSON-LD, drobečky a H1 rozcestníku dlažby),
- JSON-LD na všech stránkách (struktura, `@id`, odkazy na firmu, `Service`, `BreadcrumbList`, `WebSite`),
- viditelné drobečky, H1 (přesun nadtitulku do H1),
- nové stránky `/kontakt` a `/cisteni-fotovoltaiky/` a odkazy na ně v `content/navigace.json` a v řádku ceníku „Fotovoltaika“,
- `robots.txt`,
- ve fázi B: titulky a popisy (pravidla, „bez lešení“ v `<head>`, přípona, délka), blok OG/Twitter, nové OG obrázky, odstranění komentářů z výstupu, karta NAP pro katalogy,
- testy, náhled, hlášení.

**NE (patří jinam, jen zapiš do hlášení):**
- Texty tvrzení v těle a v textech JSON-LD (FAQ, popisy Service), „H-BIO“, technologie, JobPosting a kariéra → **úkol 13**. Tady se mění jen struktura JSON-LD a `<head>`.
- Znění záruky → **úkol 05**. Text se bere z `scripts/lib/zaruka.mjs`, nikdy natvrdo.
- Podoba URL `/x` × `/x.html`, canonical, `og:url` podle canonical, generátor sitemap a `lastmod`, 301 a `netlify.app` → **úkol 06**. Tady se nové stránky jen zařadí jeho mechanismem.
- Hlavička, patička, paleta a typografie → **úkol 08**. Tady se jen doplní položky v `content/navigace.json` a styl drobečků do sdíleného CSS.
- Okresní stránky (architektura, huby, podobnost textů, věta „Tato stránka je pro okres“) a prolinkování z homepage a ceníku na rozcestníky → **úkol 12**. Výjimka: odkaz na `/cisteni-fotovoltaiky/` z řádku ceníku a z navigace.
- Přeskládání první obrazovky homepage, slib „do 24 hodin“, menu „Pro firmy“ a „Kariéra“, FAQ, „Kde nás najdete“ a vysvětlení základny v Hradci Králové → **úkol 18**.
- E-maily a jejich zobrazení → **úkol 03** (tady se jen použije `blokKontaktu()`). Kanonický odkaz na Facebook → **úkol 17**.
- Výkon nad rámec „nezhoršit“ → **úkol 07**. CSP → **úkol 15**. Hlavičky interního panelu → **úkoly 14 a 01**. Cookies → **úkol 10**.
- Převzetí Firmy.cz, doplnění Firemního profilu Google a webmaster nástroje provádí majitel s Claude v Chrome (C5, C6, C7). Tady se jen připraví karta NAP a po převzetí se doplní `sameAs`.
- `AggregateRating`, `Review` ani hvězdičky se **nikdy** nepřidávají (`POSUDEK-MASTER-PLANU.md`).

## Postup

### Fáze A – jedna entita firmy, drobečky, H1, Kontakt, robots.txt
1. **Větev `ukol-11-seo-data-snippety` z aktuální `main`** (`git fetch`, pak `git switch -c ukol-11-seo-data-snippety origin/main`). Balíček aktualizuj mimo webHSPGH (`git -C ../hspg-balicek pull`). Ověř předpoklady:
   - **05 (povinné):** `content/firma.json` má `zaruka.delka_let` a existuje `scripts/lib/zaruka.mjs` s `formy()`. Pokud ne, **zastav se a nahlas**.
   - **06 (povinné):** canonical `/cenik` je bez `.html` a sitemap vytváří skript (zapiš jeho název). Pokud ne, **zastav se a nahlas**.
   - Do hlášení zapiš stav těchto úkolů (bez zastavení):
     - 03: `scripts/lib/kontakty.mjs` s `blokKontaktu()` a `nbsp()`,
     - 04: existuje `/reklamace/`,
     - 08: `content/navigace.json`, `firma.sidlo`, `firma.facebook`, `scripts/lib/layout.mjs`, sdílené CSS (`assets/zaklad.css`) a vizuální test,
     - 13: `content/tvrzeni.json` s F1, `"JobPosting"` 0×,
     - 16: testy axe,
     - 17: `facebook.com/share` 0×.
   - Bez 08 udělej `/kontakt` a odkazy v patičce až po jeho sloučení, ostatní kroky fáze A proveď. Bez 17 se zastav u `sameAs` a nahlas to. Odkaz na Facebook neměň sám.
2. **Najdi v repozitáři soubory, které generují `<head>`, JSON-LD, drobečky a H1 stránek:**
   - publikační adresář a build: `netlify.toml` (`publish`, `command`), `package.json`, `scripts/build-site.mjs` (podle `sw.js` zapisuje `dist/`), pořadí generátorů a to, které generátory a režimy `--kontrola` čtou zdroj a které publikační adresář,
   - `scripts/build-regions.mjs`: šablona `<head>` (title, description, `og:*`, JSON-LD `Service` + `BreadcrumbList`), drobečky `nav.crumbs`, H1 a `provider`. Zjisti, odkud bere názvy nabídek („Střecha — čištění“ …),
   - ručně psané stránky s JSON-LD nebo H1 z tabulky výše, dále `/zaruka` (úkol 05) a `/reklamace/` (úkol 04),
   - zdroj `robots.txt` a `assets/og.png` (vzniká skriptem?),
   - knihovny předchozích úkolů: `scripts/lib/zaruka.mjs`, `scripts/lib/kontakty.mjs`, `scripts/lib/layout.mjs`, `content/tvrzeni.json`, generátor sitemap,
   - adresář a konvenci testů (`tests/` nebo `testy/`) a dostupnost Playwrightu.

   Výsledek dej do hlášení jako tabulku: typ stránky → zdroj → kdo generuje head, JSON-LD a H1.
3. **Inventura před změnou** – `scripts/seo-inventura.mjs` (Node, bez sítě):
   - **Parsování:** stejný způsob jako testy úkolů 03, 05 a 08. Pokud žádný není, přidej `node-html-parser` do `devDependencies`.
   - **Co prochází:** všechna HTML v publikačním adresáři kromě interních `rd-control-panel/` a `ai-centrum/`, nebo jeden soubor (`--soubor`).
   - **Co zapíše pro každou stránku:** cesta podle canonical, `lang`, `robots`, title a jeho délka a přípona, description a délka, všechny `og:*` a `twitter:*`, H1, typy uzlů JSON-LD, hodnoty `@id`, položky `BreadcrumbList` a viditelných drobečků, pole `<head>` s „bez lešení“, počet komentářů HTML a CSS/JS a `main_hash`. `main_hash` je SHA-256 textu `<main>` bez `nav.crumbs`, H1, `script` a `style`, s mezerami sjednocenými podle pravidla níže. Slouží jako pojistka, že se tělo stránek nezměnilo (ani po čištění výstupu ve fázi B).
   - **Porovnávání textů** (inventura i všechny testy úkolu): před porovnáním nahraď každou posloupnost bílých znaků včetně NBSP (`\s+` v JS) jednou mezerou a ořízni okraje. Jinak by `nbsp()` z úkolu 03 rozbil shodu.
   - **„H1 s klíčovým slovem“** počítá inventura stejně jako test v kroku 12: rozcestník = H1 obsahuje „Čištění a ochrana střech|fasád|dlažby“ (ve fázi B i „fotovoltaick“), `/` = „Čištění“ a „střech“, `/en` = „cleaning“.
   - **`--souhrn`** vypíše tabulku metrik. Stav 4. 10. pro srovnání:

     | Metrika | 4. 10. |
     |---|---|
     | stránky | 247 |
     | uzly firmy bez `@id` | 238 + 4 `Organization` |
     | stránky s `BreadcrumbList` bez shodných viditelných drobečků | 9 |
     | `twitter:card` / `og:image:width` / `og:image:alt` | 13 / 12 / 12 |
     | `og:locale:alternate` | 0 |
     | titulky s „ \| HOLUB HSPG“ | 238 |
     | popisy > 160 znaků | 5 |
     | pole `<head>` s „bez lešení“ bez „zpravidla“ | 557 (160 stránek) |
     | H1 s klíčovým slovem na `/`, `/en` a rozcestnících | 0 z 5 |
     | komentáře HTML / CSS a JS ve výstupu | 37 / 120 |
     | chyby `JSON.parse` / `AggregateRating` + `Review` | 0 / 0 |

   Výstup ulož do `.artefakty/ukol-11/pred.json` (`.artefakty/` je v `.gitignore` z úkolu 08). Souhrn dej do hlášení a commitni skript.
   - **Lighthouse před změnou:** z čisté větve (stav `main`, ještě bez změn úkolu) udělej náhled `node scripts/nasadit.mjs` (0 kreditů) a změř `/` (desktop: CLS, přístupnost, SEO) prvním příkazem Lighthouse z části Ověření, jen s `--output-path=.artefakty/ukol-11/lh-pred.json`. S ním se porovnává krok 9 a akceptační kritéria.
4. **Data.**
   - `content/firma.json` je jediný zdroj faktů a druhý nezakládej. Ostatní klíče neměň. Doplň:
   ```json
   "sidlo": { "…": "ponech z úkolu 08",
     "geo": { "lat": 50.09079, "lon": 14.45281, "zdroj": "RÚIAN – adresní místo 22348603 (ČÚZK), ověřeno 2026-10-04" } },
   "pracovni_doba_strojove": { "dny": ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"], "od": "07:00", "do": "19:00" },
   "oblast_pusobnosti": [ { "typ": "Country", "kod": "CZ", "nazev": "Česká republika", "nazev_en": "Czech Republic" } ],
   "profily": {
     "firmy_cz": "[DOPLNIT: URL detailu na Firmy.cz po převzetí záznamu – Claude v Chrome C6]",
     "google": "[DOPLNIT: odkaz na existující Firemní profil Google – C5]"
   }
   ```
     - Souřadnice ověř znovu jedním GET: `https://ags.cuzk.cz/arcgis/rest/services/RUIAN/Prohlizeci_sluzba_nad_daty_RUIAN/MapServer/1/query?where=kod%3D22348603&outFields=kod&returnGeometry=true&outSR=4326&f=json`. Pokud se hodnota liší o víc než 2 m, použij novou a zapiš to.
     - EU se do `oblast_pusobnosti` přidá až po kladné odpovědi na O12 (úkol 13, fáze B), a to zároveň do viditelného textu. Klíč `pusobnost` (text pro H-BOT) neměň.
     - Test ověří, že `pracovni_doba` (text) odpovídá `pracovni_doba_strojove`.
     - Po úpravě spusť `node scripts/build-hbot.mjs` a pak `--kontrola`.
   - **Nový `content/seo.json`** (mimo publikaci, `content/` se nepublikuje). Jsou v něm jen údaje, které nejsou jinde:
   ```json
   {
     "_poznamka": "SEO údaje stránek: drobečky, JSON-LD, texty pro sociální sítě. Fakta o firmě jsou v firma.json, ceny v ceny.json, záruka přes scripts/lib/zaruka.mjs. Generuje scripts/build-seo.mjs.",
     "znacka_titulku": "HOLUB HSPG",
     "slogan": { "cs": "Věci stárnou. My zůstáváme.", "en": "Things age. We remain." },
     "popis_firmy": "Čištění a ochrana střech, fasád, dlažeb a fotovoltaiky. Impregnace H-STONE – {zaruka.s_podminkou}.",
     "stranky": {
       "/":        { "jsonld": ["firma", "web"] },
       "/kontakt": { "jsonld": ["firma", "kontaktni-stranka"], "drobecky": [["Úvod", "/"], ["Kontakt", "/kontakt"]] },
       "/cenik":   { "drobecky": [["Úvod", "/"], ["Ceník", "/cenik"]] },
       "/cisteni-strech/": { "typ": "rozcestnik", "povrch": "roof", "drobecky": [["Úvod", "/"], ["Čištění střech", "/cisteni-strech/"]] }
     }
   }
   ```
     - Klíče stránek jsou cesty v kanonické podobě z úkolu 06.
     - Názvy drobečků převezmi z dnešního `BreadcrumbList`: Ceník, Kariéra, Digitální pas domu, Nabídka pro SVJ a bytová družstva, Kalkulačka úspor pro SVJ, Zásady ochrany osobních údajů, Pravidla akce a ochrana údajů, Čištění střech, Čištění fasád. Pokud úkol 13 název stránky změnil (např. u kalkulačky), použij nový.
5. **Knihovna `scripts/lib/seo.mjs`** (čisté funkce bez závislostí, data dostávají parametrem, `[DOPLNIT` nikdy nevypíší):
   - `ID_FIRMY = "https://hspg.cz/#firma"`, `ID_WEBU = "https://hspg.cz/#web"`.
   - `uzelFirmy({ firma, ceny, seo, zaruka })` vrací plný uzel:

     | Pole | Hodnota | Zdroj |
     |---|---|---|
     | `@type` | `HomeAndConstructionBusiness` | beze změny |
     | `@id` | `https://hspg.cz/#firma` | konstanta |
     | `name` / `alternateName` / `legalName` | „HOLUB Surface Protection Group“ / „HOLUB – HSPG“ / „Dušan Holub“ | `obchodni_oznaceni` / `znacka` / `provozovatel` |
     | `identifier` | `{"@type":"PropertyValue","propertyID":"IČO","value":"09291881"}` | `ico` |
     | `url` | `https://hspg.cz/` | konstanta |
     | `telephone`, `email` | `+420736618486`, `firma.email` (po úkolu 03 `info@hspg.cz`, viditelný na `/kontakt`) | `firma.json` |
     | `address` | `PostalAddress` (`streetAddress`, `postalCode`, `addressLocality` = `sidlo.obec`, `addressCountry` „CZ“) | `sidlo` |
     | `geo` | `GeoCoordinates` | `sidlo.geo` |
     | `openingHoursSpecification` | dny, `opens`, `closes` | `pracovni_doba_strojove` |
     | `areaServed` | `Country` podle `oblast_pusobnosti` | `firma.json` |
     | `priceRange` | „od {nejnižší `cisteni_only`} Kč/m², konečné ceny (neplátce DPH)“ | `ceny.json` |
     | `logo`, `image` | `https://hspg.cz/assets/logo-holub-google-512.png` (GET 200) | beze změny |
     | `slogan` | `seo.slogan.cs` | `seo.json` |
     | `description` | `seo.popis_firmy` s `{zaruka.s_podminkou}` z `formy("cs")` úkolu 05 | `seo.json` + 05 |
     | `sameAs` | `firma.facebook` + vyplněné hodnoty `profily.*` | `firma.json` |

     **Nepřidávej** `aggregateRating`, `review`, `award`, `hasCredential` ani `ContactPoint`. Telefon a e-mail má uzel přímo, `ContactPoint` by je jen zdvojil. Nepřidávej ani `warranty` (předávka z úkolu 05 to nabízí ke zvážení). Samostatné pole by záruku oddělilo od podmínky, záruka proto zůstává v `description` jako `s_podminkou`.
   - `odkazNaFirmu()` → `{ "@id": ID_FIRMY }`. `kratkyUzelFirmy()` → `@type`, `@id`, `name`, `legalName`, `url` pro kontexty, kde je jméno povinné (budoucí `JobPosting` v úkolu 13, fáze B).
   - `uzelWebu()` → `WebSite` (`@id` `ID_WEBU`, `url`, `name` „HOLUB HSPG“, `alternateName` „HOLUB Surface Protection Group“, `inLanguage` „cs“, `publisher` `odkazNaFirmu()`). Google podle něj volí název webu ve výsledcích.
   - `sluzba({ povrch, url, nazev, ceny })` → `Service` s `@id` `<url>#sluzba`, `provider` `odkazNaFirmu()`, `areaServed` z `oblast_pusobnosti` (okresní stránky si `AdministrativeArea` ponechají) a `offers`. Nabídky jsou ze všech položek daného povrchu v `ceny.json` (`cisteni_only`, `ochrana_hstone`, `renovace_color`) se stávající strukturou `UnitPriceSpecification` (`minPrice`, `CZK`, `m²`). Popisky nabídek přesuň sem ze šablony `build-regions`.
   - `drobecky(polozky, jazyk)` → `{ html, jsonld }` z jednoho seznamu, takže nemohou nastat rozdíly.
     - HTML je shodné s dnešní komponentou: `<nav class="crumbs wrap" aria-label="Drobečková navigace">`, `<ol>` a poslední položka `aria-current="page"` bez odkazu. Pro en je `aria-label` „Breadcrumb“.
     - `item` v JSON-LD jsou absolutní URL v kanonické podobě z úkolu 06.
   - `jsonLdSkript(data)` → `<script type="application/ld+json">` s `JSON.stringify` a s každým `<` převedeným na escape `\u003c` (šest znaků: zpětné lomítko, `u003c`), aby text nemohl ukončit skript. `JSON.parse` z toho vrátí původní `<`.
   - Viditelné texty prožeň `nbsp()` z úkolu 03 (KONTEXT §4.9).
6. **Generátor `scripts/build-seo.mjs`**:
   - Bloky vkládá mezi neutrální značky bez cest a poznámek (audit #18):
     - `<!-- HSPG:JSONLD:START -->` … `<!-- HSPG:JSONLD:END -->` v `<head>`,
     - `<!-- HSPG:DROBECKY:START -->` … `END` hned za otevřením `<main …>`,
     - `<!-- HSPG:KONTAKT:START -->` … `END` v `kontakt.html`.
   - Stránku pozná podle canonical a nastavení bere ze `seo.json`. Stránka s nastavením bez značek, nebo se značkami bez nastavení, je chyba.
   - Popisy, ve kterých jsou údaje z dat (`/kontakt`, `/cisteni-fotovoltaiky/`), skládá ze šablony v `seo.json` (`popis` se zástupci `{firma.…}` a `{ceny.…}`). Ručně se tak nikdy nemění.
   - **Při prvním běhu** nahradí staré bloky JSON-LD, za které odpovídá (firma na `/` a `/en`, `BreadcrumbList`), a vloží značky. Každá stránka musí mít právě jednu shodu, jinak skončí chybou se jménem souboru.
   - Stránky s `data-gen="build-regions"` nepřepisuje. Ty zapisuje `build-regions` stejnými funkcemi, `build-seo --kontrola` je ale kontroluje také.
   - `--kontrola`: nic nezapíše a skončí kódem 1 se seznamem stránek, které se liší.
   - Zařazení do buildu: za `build-regions` a `build-ceny`. Pořadí vůči `build-zaruka` nehraje roli, protože text záruky bere z téže knihovny. Ověř, že po celém buildu vrací `--kontrola` všech generátorů 0.
   - Do `package.json` přidej skripty `seo` a `seo:kontrola`. Vygenerovaný výstup commitni, pokud se HTML commituje.
7. **JSON-LD na stránkách:**
   - **`/`:** generovaný blok obsahuje `uzelFirmy()` a `uzelWebu()`. Starý blok ř. 45 zmizí. U ručně psaných bloků ř. 46 (4× `Service`) změň `provider` na `odkazNaFirmu()` a u ř. 47 (`VideoObject`) změň `publisher` na `odkazNaFirmu()`. Texty těchto bloků a `FAQPage` (ř. 48) neměň, patří úkolům 05 a 13.
   - **`/en`:** druhou entitu (ř. 35) nahraď uzlem `{"@type":"WebPage","url":<canonical>,"inLanguage":"en","about":odkazNaFirmu()}`.
   - **`/kontakt`:** `uzelFirmy()`, `ContactPage` (`url`, `about` → firma) a `BreadcrumbList`.
   - **Rozcestníky** (a ve fázi B fotovoltaika): `sluzba()` a `BreadcrumbList`.
   - **Šablona `build-regions`** (231 okresních stránek a `/cisteni-dlazby/`): `provider` → `odkazNaFirmu()`, drobečky z `drobecky()`, `Service` ze `sluzba()`. Nabídky a ceny musí zůstat stejné (test). Přegeneruj stránky a zkontroluj rozsah diffu. `main_hash` okresních stránek se nesmí změnit.
   - **9 stránek z nálezu #11, `/zaruka` a `/reklamace/` (pokud existují):** `BreadcrumbList` z `drobecky()`.
   - Nikde nepřidávej `AggregateRating`, `Review`, `FAQPage` na nové stránky ani `JobPosting`. Pokud na `/kariera` ještě je `JobPosting` (úkol 13 nesloučen), neodstraňuj ho (patří úkolu 13). Jen jeho `hiringOrganization` nahraď `kratkyUzelFirmy()`, aby test `@id` prošel, a nahlas to.
8. **Viditelné drobečky** vlož přes značky `HSPG:DROBECKY` na 9 stránek z nálezu #11, na `/zaruka`, `/reklamace/` a `/kontakt`.
   - Styl `.crumbs` přesuň do sdíleného CSS z úkolu 08 a použij tokeny: písmo 14 px, cíle ≥ 44 px jako dnes, oddělovač „›“, barva textu s kontrastem ≥ 4,5 : 1.
   - Duplicitní pravidla v inline CSS odstraň jen tam, kde už nic necílí (ověř přes `git grep`).
   - Drobečky nesmí zakrýt pevná hlavička ani plovoucí prvky (měřicí modul z úkolu 08).
9. **Rozcestníky a H1.** Klíčové slovo už na stránkách je v nadtitulku. Nadtitulek se proto **přesune do H1** a vzhled zůstane stejný.
   - **`/cisteni-strech/`, `/cisteni-fasad/`, `/cisteni-dlazby/`** (dlažba přes šablonu `build-regions`):
     - na `<html>` přidej `data-seo="rozcestnik"`, doplň `Service` a viditelné drobečky (střechy a fasády je zatím nemají),
     - z `<div class="kicker">Čištění a ochrana střech</div><h1>Střecha bez mechu. Postup podle krytiny.</h1>` udělej `<h1><span class="kicker">Čištění a ochrana střech</span> Střecha bez mechu. Postup podle krytiny.</h1>`,
     - ve sdíleném CSS přidej `h1 .kicker{display:block; …}` se stejným písmem, velikostí, prokladem, barvou a odsazením jako `.kicker` a bez stínu a písma nadpisu,
     - mezi `</span>` a textem nech mezeru, aby čtečka nespojila slova.
   - **`/`:** nadtitulek ř. 1202 přesuň do H1 (ř. 1203) s textem „Čištění a ochrana střech, fasád a dlažeb“ místo „Profesionální čištění a trvalá ochrana povrchů“.
     - Nadtitulek je dnes `<div style="…display:flex…">` s dekorativní čárou `<span>`. Uvnitř H1 musí být `<span>` (blokový prvek v `<h1>` je neplatné HTML a validátor ho hlásí). `display:flex` ponech, dekorativní čáře přidej `aria-hidden="true"` a za `</span>` nadtitulku nech mezeru.
     - Velká písmena jen přes `text-transform:uppercase`, ne v textu.
     - Inline styly nadtitulku ponech a doplň písmo textu, `font-weight:400`, vlastní `line-height` a `text-shadow` nadtitulku, aby nezdědil styl H1.
   - **`/en`:** nadtitulek ř. 143 (`<div class="kicker">`) přesuň do H1 jako `<span class="kicker">` stejně jako u rozcestníků, s textem „Roof, facade and paving cleaning and protection“.
   - **Kontrola:**
     - vizuální test z úkolu 08 smí ukázat rozdíl jen v textu nadtitulku na `/` a `/en` a v nových drobečcích. Referenční snímky aktualizuj jen pro tyto stránky a snímky před a po přilož k hlášení,
     - Lighthouse desktop `/`: CLS nesmí být horší než před úkolem (uveď čísla).
   - Přeskládání první obrazovky (cena, telefon, lišty) řeší úkol 18. Tady jen text H1.
10. **Stránka `/kontakt`.** Soubor `kontakt.html` podle konvence webu (jako `cenik.html`), adresa `/kontakt` podle úkolu 06, `index,follow`.
    - **Head:**
      - `<title>Kontakt a údaje o firmě | HOLUB HSPG</title>`,
      - description ze šablony v `seo.json` (krok 6, zástupci `{firma.znacka}`, `{firma.provozovatel}`, `{firma.sidlo.ulice}`, `{firma.sidlo.obec}`). Dnes vyjde „Telefon, e-mail, sídlo a IČO provozovatele HOLUB – HSPG: Dušan Holub, Pernerova 10/32, Praha 8 – Karlín, neplátce DPH.“ (≤ 160 znaků). Natvrdo ji nepiš,
      - canonical podle úkolu 06,
      - hlavička a patička z komponent úkolu 08 (značky `build-layout`),
      - skripty jako na ostatních stránkách (`kontakt.js`, `souhlas.js`, `hbot.js` s `defer`).
    - **Tělo:** drobečky, `<h1>Kontakt</h1>` a blok `HSPG:KONTAKT`, který vytvoří `kontaktniStranka()` jen z dat:
      - telefon jako `<a href="tel:+420736618486">` a pracovní doba,
      - e-maily přes `blokKontaktu("cs")` z úkolu 03 (5 rolí, `data-kontakt`, čitelná záloha bez JS). Vlastní kopii nepiš,
      - **Provozovatel:** identifikační řádek přes funkci z úkolu 08. Vytáhni ji z `scripts/lib/layout.mjs` jako `identifikace(jazyk)` tak, aby se patička nezměnila (`npm run layout:kontrola` → 0),
      - **Sídlo:** adresa z `firma.sidlo`. Nic o provozovně, návštěvách ani „Kde nás najdete“ (úkol 18),
      - **Působnost:** z `oblast_pusobnosti`, dnes „celá Česká republika“,
      - Facebook z `firma.facebook`,
      - odkazy: poptávka (stejný cíl jako „Chci cenu“ v hlavičce), Reklamace (`/reklamace/`, pokud existuje), Záruka (`/zaruka`), Ochrana osobních údajů,
      - `<section id="o-nas">` s nadpisem „O nás“ a větou „Za HOLUB – HSPG stojí Dušan Holub, zakladatel a provozovatel.“ (údaje z `firma.json` a z podpisu příběhu na homepage) a odkazem „Příběh zakladatele“ na `/#pribeh`. Pokud blok „Můj příběh“ na `/` nemá `id`, přidej `id="pribeh"`. Nic dalšího nedopisuj.
    - Bez mapy v `iframe` (úkol 15 zavádí CSP `frame-src 'none'`) a bez formuláře.
    - **`content/navigace.json`** (úkol 08): do sloupce patičky „Na webu“ přidej `{"text":"Kontakt a údaje o firmě","href":"/kontakt"}`, v en `{"text":"Contact details (in Czech)","href":"/kontakt"}`. Spusť `build-layout`, `layout:kontrola` musí vrátit 0.
    - Sitemap doplň mechanismem z úkolu 06. `/o-nas` **nevytvářej**: jedna stránka stačí a nic na tu adresu neodkazuje.
    - Pokud `content/hbot-faq.json` má otázku na kontakt nebo adresu, přidej k ní `"link": ["/kontakt", "Kontakt"]` a spusť `build-hbot` (kód balíčku neměň).
11. **`robots.txt`:** odstraň řádek `Disallow:` s cestou interního panelu. Zůstane `User-agent: *`, `Allow: /`, `Sitemap: https://hspg.cz/sitemap.xml`. Do `robots.txt` nepiš žádnou interní cestu (ani `/ai-centrum/`, `/api/`). Neveřejné stránky chrání přihlášení na serveru a hlavička `X-Robots-Tag: noindex` z úkolů 01 a 14. Ty se v tomto úkolu nemění.
12. **Testy fáze A** (adresář a konvence podle kroku 2, `node:test`, bez sítě):
    - **`seo-knihovna.test.mjs`:**
      - `uzelFirmy()` má všechna pole z tabulky v kroku 5 a žádné zakázané,
      - `[DOPLNIT` v `profily` se do `sameAs` nedostane,
      - `drobecky()` vrací stejné položky v HTML i v JSON-LD,
      - `jsonLdSkript()` převede `</script>` v textu,
      - výpočet vzdálenosti (haversine) funguje.
    - **`seo.test.mjs`** nad publikačním adresářem (využívá `seo-inventura.mjs`):
      - každý blok JSON-LD projde `JSON.parse` a nikde není `AggregateRating`, `Review` ani `ratingValue`,
      - každý uzel `HomeAndConstructionBusiness` i `Organization` má `@id` = `ID_FIRMY`; uzly s `address` jsou jen na `/` a `/kontakt` a jsou shodné; `provider` a `publisher` jsou jen odkazy,
      - `legalName` je „Dušan Holub“, `identifier.value` je „09291881“, `url` je „https://hspg.cz/“,
      - `geo` leží do 30 m od RÚIAN 50.090789 / 14.452810 (konstanta v testu se zdrojem a datem),
      - `sameAs` neobsahuje `/share/` a `areaServed` neobsahuje „Evropská unie“ ani „European Union“, dokud `oblast_pusobnosti` EU nemá,
      - NAP (adresa, telefon, IČO) je v uzlu firmy, v patičce i na `/kontakt` stejný po normalizaci z kroku 3: telefon se porovnává jen podle číslic (JSON-LD `+420736618486` × zobrazení `+420 736 618 486`), adresa po složkách `ulice`, `psc` a `obec` z `firma.sidlo` (každá musí být v textu patičky i `/kontakt` a v příslušném poli `PostalAddress`; v anglické patičce místo `obec` hodnota `obec_en`), IČO znakově,
      - každá stránka s `BreadcrumbList` má právě jeden `nav.crumbs` se stejnými názvy a URL a naopak,
      - 3 rozcestníky mají `data-seo="rozcestnik"`, `Service` s cenami rovnými `ceny.json` a H1 s „Čištění a ochrana střech|fasád|dlažby“ (po normalizaci mezer z kroku 3, `nbsp()` vloží za „a“ NBSP),
      - žádný H1 neobsahuje blokový prvek (`div`, `p`, `section`),
      - H1 na `/` obsahuje „Čištění“ a „střech“, na `/en` „cleaning“ a každá stránka má právě 1 H1,
      - `/kontakt` obsahuje „Dušan Holub“, „09291881“, `sidlo.ulice`, odkaz `tel:` a 5 prvků `a[data-kontakt]`, žádné `[DOPLNIT` a odkazuje na něj patička všech stránek,
      - `robots.txt` neobsahuje žádnou cestu kromě `/` a URL sitemap,
      - `main_hash` okresních stránek je shodný se stavem před úkolem (`.artefakty/ukol-11/pred.json`, test se přeskočí, pokud soubor chybí, a vypíše to).
    - **Negativní testy** (kontrola opravdu kontroluje): HTML s `AggregateRating`, stránka s `BreadcrumbList` bez `nav.crumbs` a uzel firmy bez `@id` → každý test najde porušení.
    - **`--kontrola` nad dočasnou kopií:** změna telefonu ve `firma.json` → `build-seo --kontrola` vrátí 1, po spuštění generátoru 0.
    - Do e2e a axe testů z úkolů 08 a 16 přidej `/kontakt`.
13. **Build a kontroly:**
    - build, pak `--kontrola` všech generátorů a testy úkolů 01, 05, 08, 13, 16 a 17,
    - náhled `node scripts/nasadit.mjs` (0 kreditů) a na něm příkazy z části Ověření,
    - ruční krok (agent, nebo Claude v Chrome v rámci C9): validator.schema.org (URL náhledu) pro `/`, `/kontakt`, `/cisteni-strech/`, `/cisteni-strech/kolin/` a `/cenik` a Rich Results Test pro `/` a `/cenik` (URL nebo vložený kód),
    - Lighthouse SEO a přístupnost pro `/` a `/kontakt`.
14. **Hlášení fáze A a stop.** Fáze A se smí sloučit do `main` samostatně po ověření na náhledu. Produkce jen po schválení majitelem a v dávce.

> Pokud fázi B v tomto sezení nestihneš, podej hlášení po fázi A a fázi B začni v novém sezení ve stejné větvi.

### Fáze B – titulky a popisy, OG/Twitter, fotovoltaika, čistý výstup, NAP
15. **Pravidla titulků a popisů** (funkce v `seo.mjs`, kontroluje je test):
    - **Titulek** je `<text> | HOLUB HSPG` (`seo.znacka_titulku`) a má nejvýš 65 znaků (ideálně ≤ 60). Titulky jsou jedinečné.
      - `/`: návrh „Čištění a ochrana střech, fasád a dlažeb | HOLUB HSPG“ (53 znaků),
      - `/en`: návrh „Roof, facade & paving cleaning – Czech Republic | HOLUB HSPG“ (60 znaků),
      - 6 stránek s „| HOLUB“ a `reference` s „| HSPG“: změň jen příponu.
      - Konečné znění `/` a `/en` schválí majitel na náhledu.
    - **Popis** má nejvýš 160 znaků a je jedinečný.
    - **„bez lešení“ v `<head>`:** jen jako F1 „zpravidla bez lešení“ (en „usually without scaffolding“). Text F1 čti z `content/tvrzeni.json` → `schvalene_formulace.F1`, ne natvrdo.
      - **Okresní titulky** (šablona `build-regions`): `Čištění střech {okres} – zpravidla bez lešení | HOLUB HSPG`, pokud se vejde do 60 znaků. Jinak bez části o lešení. Titulek pak sedí s H1 z úkolu 13.
      - **Okresní popisy:** F1. Pokud je popis delší než 160 znaků, zkracuj v tomto pořadí: 1) vypusť „ (‹kraj›)“, 2) vypusť „Zaměření z map, “, 3) vypusť část o lešení. Když ani pak nevyhoví, generátor skončí chybou.
      - **Ručně psané stránky** (`/`, `/cenik`, `/akce/`, `/en`, `/kalkulacka-svj`, `/nabidka-svj`, rozcestníky): v `<head>` nahraď „bez lešení“ formou F1, nebo ho vypusť. Jiný text neměň: „do 24 hodin“ patří úkolu 18, záruka úkolu 05.
    - **EU:** dokud není kladná odpověď na O12, neuváděj EU v `<head>` `/en` (titulek ani popis). Viditelný text těla neměň (úkol 13).
    - V `content/tvrzeni.json` odeber u T01 `"head"` z `vyjimky_oblasti`. `npm run kontrola:tvrzeni` pak hlídá i `<head>` a musí vrátit 0.
16. **Blok OG/Twitter** `socialniBlok()` mezi značkami `<!-- HSPG:SOCIAL:START/END -->` v `<head>`. Ručně psané stránky obsluhuje `build-seo`, generované `build-regions`.
    - **Značky v bloku:** `og:type`, `og:site_name` (`firma.obchodni_oznaceni`), `og:locale` (cs_CZ / en_GB), na `/` a `/en` navíc vzájemné `og:locale:alternate`, `og:url` (= canonical), `og:title`, `og:description`, `og:image` (podle jazyka), `og:image:width` 1200, `og:image:height` 630, `og:image:type`, `og:image:alt`, `twitter:card` `summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`, `twitter:image:alt`.
    - **Odkud se texty berou:**
      - `og:title` = titulek bez přípony značky, `og:description` = meta description,
      - stávající vlastní texty (`og:title` na `/` a `/akce/`, `og:description` na 12 stránkách z tabulky Proč) převeď do `seo.json` → `stranky[…].og_titulek` / `og_popis`. Uprav v nich jen „bez lešení“ (F1) a délku,
      - `twitter:*` = stejné hodnoty jako `og:*`.
    - Staré značky mimo blok odstraň. Každá vlastnost smí být v `<head>` právě jednou (test). `fb:app_id` a `og:video*` na `/` ponech mimo blok beze změny.
17. **OG obrázky** – `scripts/build-og.mjs` a šablona `scripts/og/sablona.html` (mimo publikační adresář). Pokud `og.png` už vzniká skriptem, uprav ten.
    - **Vzhled jako dnešní `og.png`:** logo, „HOLUB“ / „SURFACE PROTECTION GROUP“, slogan z `seo.slogan`, „hspg.cz“, paleta R7. Bez slibů:
      - podtitulek cs „Čištění a ochrana střech, fasád a dlažeb“, en „Cleaning and protection of roofs, facades and paving“,
      - **žádné štítky** (záruka, „Cena do 24 h“, „Bez lešení“) a žádné ceny. Sítě obrázek dlouho drží v mezipaměti, proto v něm nesmí být nic, co se může změnit.
    - **Vykreslení:** Playwright 1200 × 630, `deviceScaleFactor` 1, písma z `assets/fonts/` lokálně (bez sítě), JPEG s kvalitou 85. Pokud má soubor 300 KB nebo víc, snižuj kvalitu až na 75.
    - **Výstup:** `assets/og/og-cs.<8 znaků sha256>.jpg` a `og-en.<…>.jpg`. Manifest `content/og-obrazky.json` obsahuje soubor, rozměry, bajty a `zdroj_hash` (šablona + data + písma). `socialniBlok()` bere cestu z manifestu.
    - **`--kontrola`:** bez Chromia přepočítá `zdroj_hash` a ověří, že soubory existují a mají méně než 300 KB.
    - **`assets/og.png`** přepiš českou variantou ve formátu PNG, aby i staré sdílené odkazy ukázaly obrázek bez slibů. Název souboru zůstává.
    - Po produkčním nasazení majitel v Facebook Sharing Debuggeru dá „Scrape Again“ pro `/`, `/akce/` a `/cenik` (je k tomu potřeba jeho přihlášení, provést ho může Claude v Chrome).
18. **Stránka `/cisteni-fotovoltaiky/`** (`cisteni-fotovoltaiky/index.html`, adresářová podoba jako ostatní `/cisteni-*/`). Obsah jen z dat a z textů, které už na webu jsou:
    - **Head a struktura:**
      - title „Čištění fotovoltaiky a solárních panelů | HOLUB HSPG“, description ze šablony v `seo.json` s cenami z `ceny.json` (dnes vyjde „Čištění fotovoltaických panelů od 39 Kč/m², samostatná zakázka od 2 490 Kč. Konečné ceny, nejsme plátci DPH. Postup potvrdíme podle objektu.“),
      - `data-seo="rozcestnik"`, drobečky „Úvod › Čištění fotovoltaiky“ a `<h1>Čištění fotovoltaických panelů</h1>`.
    - **Texty** (z `damageData.solar` na `/`, ř. 2122):
      - úvod: „U fotovoltaiky posuzujeme přístup, povrch panelů a bezpečný způsob čištění.“,
      - seznam „Co na panelech obvykle najdeme“: „Prach, pyl a nánosy“, „Usazeniny u spodních rámů“, „Stopy po ptácích“,
      - postup: „Vhodný a bezpečný postup čištění potvrdíme podle objektu a dostupných podkladů.“
      - Pokud se tyto texty na `/` generují z dat, čti je odtud a nekopíruj.
    - **Cena:**
      - čištění od `<span data-cena="cisteni_only.solar">`, samostatná zakázka od `<span data-cena="minimum.fve">` (ověř, že je `build-ceny` vyplní),
      - věta „konečné ceny (nejsme plátci DPH)“ a odkaz na podmínky dopravy v ceníku. Pravidla dopravy nekopíruj.
    - **Obrázek** `media/fve-panely-poster.webp` s `width`/`height` a `alt` z popisku videa. Bez označení „Skutečná zakázka“ a bez videa.
    - Výzva k akci a telefon jako na ostatních rozcestnících.
    - **JSON-LD:** `sluzba({ povrch: "solar" })` + nabídka „samostatná zakázka“ (`PriceSpecification` `minPrice` 2 490) a `BreadcrumbList`. **Bez** FAQ.
    - **Zakázáno:** „lešení“, „H-STONE“ a „impregnace“ v `<main>`, protože ceník pro panely uvádí jen čištění.
    - **Odkazy:**
      - v `content/navigace.json` do podmenu Služby a do sloupce patičky Služby přidej „Čištění fotovoltaiky → /cisteni-fotovoltaiky/“ (menu se nesmí zalomit, testy úkolu 08),
      - v řádku „Fotovoltaika“ ceníku (`cenik.html` ř. 233, nebo v `build-ceny`, pokud ho generuje) přidej odkaz.
    - Stránka je indexovatelná, je v sitemap a nemá okresní klony (úkol 12).
19. **Výstup bez interních poznámek** (audit #18). Zdroj si značky ponechá, protože je generátory potřebují. Čistí se jen výstup pro nasazení.
    - Pokud publikační adresář **není** oddělený od zdroje, krok neprováděj, nahlas to a navrhni řešení. Nový build systém nezakládej.
    - Jinak přidej `scripts/vycistit-vystup.mjs` jako **poslední krok buildu** nad publikačním adresářem. Použij `html-minifier-terser` (devDependency) jen s volbami:
      - `removeComments: true`,
      - `minifyCSS: true`,
      - `minifyJS: { compress: false, mangle: false, format: { comments: false } }`,
      - **bez** `collapseWhitespace` a dalších voleb, protože mění vykreslení.
    - JSON-LD a jiné typy skriptů se nezpracují (výchozí chování). Ověř, že žádný skript nečte komentáře z DOM: `git grep -nE "COMMENT_NODE|nodeType *=== *8|createTreeWalker"`.
    - Generátory a jejich `--kontrola` musí běžet nad zdrojem nebo **před** tímto krokem. Ověř to: po celém buildu vrací `--kontrola` všech generátorů 0.
    - Po kroku musí projít vizuální test úkolu 08 (0 rozdílů proti stavu před krokem), testy e2e a axe a test kotev úkolu 17. Na náhledu ověř, že Netlify formuláře dál rozpozná (bez odeslání, viz Ověření).
    - Pokud cokoli selže, ponech jen `removeComments` a důvod napiš do hlášení.
    - Uveď velikost HTML `/` před a po (předávka pro úkol 07).
20. **NAP pro katalogy** – `scripts/nap.mjs` vypíše z `firma.json` kartu ke vložení do Firemního profilu Google a Firmy.cz: název (obchodní označení a jméno provozovatele), adresu, telefon, web `https://hspg.cz/`, pracovní dobu, IČO, služby z navigace a působnost. Kartu dej do hlášení a do checklistu pro majitele níže.
    - Adresu karta označí „sídlo (ne provozovna)“ podle `firma.sidlo_zdroj`. Firemní profil Google je dnes bez adresy s oblastí obsluhy (KONTEXT §2). Karta proto u Google adresu **nenavrhuje zveřejnit**, jen ji uvede pro kontrolu.
    - Působnost na kartě je z `oblast_pusobnosti` (dnes ČR). Profil Google dnes uvádí oblast obsluhy Česko, Slovensko, Polsko. Rozdíl jen nahlas, sjednocení rozhodne majitel spolu s O12. Až majitel s Claude v Chrome dodá URL profilů, doplň je do `firma.profily`, spusť build a ověř `sameAs`.
21. **Testy fáze B** (rozšíření `seo.test.mjs` a `seo-knihovna.test.mjs`):
    - všechny titulky končí „ | HOLUB HSPG“, mají ≤ 65 znaků a jsou jedinečné; popisy mají ≤ 160 znaků a jsou jedinečné,
    - v polích `<head>` každý výskyt „bez lešení“ předchází „zpravidla “ a každý „without scaffolding“ předchází „usually “,
    - na všech veřejných stránkách jsou vlastnosti ze seznamu v kroku 16 právě jednou, `og:url` se rovná canonical, `og:image` odpovídá jazyku a `og:locale:alternate` je jen na `/` a `/en`,
    - OG obrázky mají 1200 × 630 a < 300 KB a text šablony neobsahuje `záruk|warrant|lešení|scaffold|24 h|Kč`,
    - `/cisteni-fotovoltaiky/` obsahuje cenu rovnou `ceny.json` a v `<main>` nemá „lešení“, „H-STONE“ ani „impregnac“; odkazuje na ni ceník a navigace,
    - publikační adresář po buildu obsahuje 0× `<!--` a 0× `docs/`, `scripts/build-` a `content/*.json` v HTML (jen pokud krok 19 proběhl; jinak se test přeskočí a vypíše důvod),
    - negativní testy: popis se 161 znaky, titulek bez přípony a „bez lešení“ bez „zpravidla“ → každý test najde porušení.
22. Build, všechny kontroly a testy, náhled, ruční validace (jako v kroku 13, navíc `/cisteni-fotovoltaiky/`), Lighthouse a **hlášení fáze B**.

### Doplněk: ověření v Seznam Webmasteru a Bing Webmaster Tools
Seznam web zatím vůbec nezná (site:hspg.cz nic, KONTEXT §2). Ověření má dvě cesty – vyber podle toho, co majitel dodá:
- **Meta tag** (doporučeno, bez změny DNS): majitel pošle ověřovací kód ze Seznam Webmasteru (`<meta name="seznam-wmt" content="…">`) a případně z Bingu (`<meta name="msvalidate.01" content="…">`). Vlož je jen do `<head>` úvodní stránky (zdroj, ne výstup), ověř `curl -s <náhled>/ | grep -E 'seznam-wmt|msvalidate'` a nasaď v dávce s ostatními změnami (žádné samostatné produkční nasazení kvůli tagu). Kódy nejsou tajné.
- **DNS TXT** přes Claude v Chrome (C7) jen po souhlasu majitele; MX se nemění.
Po ověření odešli v obou nástrojích sitemap `https://hspg.cz/sitemap.xml` (dělá majitel / C7) a zapiš datum do hlášení.

## Akceptační kritéria
### Fáze A
- [ ] `node scripts/build-seo.mjs --kontrola` → kód 0. Simulace změny telefonu v kopii `firma.json` → kód 1, po běhu generátoru 0 (test).
- [ ] `node --test <testy>/seo-knihovna.test.mjs <testy>/seo.test.mjs` → všechny testy prošly, včetně negativních (uveď počet).
- [ ] `node scripts/seo-inventura.mjs --souhrn`:
  - uzly firmy bez `@id` 0 (dříve 238 + 4),
  - stránky s nesouladem drobečků 0 (dříve 9),
  - H1 s klíčovým slovem 5 z 5 (`/`, `/en`, 3 rozcestníky),
  - chyby `JSON.parse` 0, `AggregateRating` + `Review` 0.
- [ ] Test potvrdí `legalName`, `PropertyValue` IČO, `geo` < 30 m od RÚIAN, `sameAs` bez `/share/`, `areaServed` bez EU a shodné NAP v uzlu firmy, patičce a na `/kontakt`.
- [ ] `main_hash` všech 231 okresních stránek je beze změny (test).
- [ ] Na náhledu `curl -s -o /dev/null -w "%{http_code}" <náhled>/kontakt` → 200. Sitemap obsahuje `https://hspg.cz/kontakt` a patička všech veřejných stránek na `/kontakt` odkazuje (test).
- [ ] `curl -s <náhled>/robots.txt` neobsahuje interní cestu. `curl -sI <náhled>/rd-control-panel/` dál vrací `x-robots-tag: noindex, nofollow`.
- [ ] (ruční krok, nástroj nemá CLI) validator.schema.org: `/`, `/kontakt`, `/cisteni-strech/`, `/cisteni-strech/kolin/` a `/cenik` mají 0 chyb a 0 varování. Rich Results Test pro `/` a `/cenik` má 0 chyb a drobečky jsou platné. Čísla nebo snímky jsou v hlášení. Strojově totéž částečně hlídá `seo.test.mjs` (`JSON.parse`, `@id`, drobečky).
- [ ] Lighthouse (příkaz z Ověření) na `/` a `/kontakt`: SEO 100, přičemž audit `is-crawlable` se na náhledu s `X-Robots-Tag: noindex` nepočítá (uveď skóre i seznam neprošlých auditů). Přístupnost a CLS desktop `/` nejsou horší než v `.artefakty/ukol-11/lh-pred.json` (uveď čísla).
- [ ] Testy úkolů 05, 08 (`layout:kontrola`, vizuální test s aktualizovanými referencemi jen pro `/` a `/en` a pro stránky s novými drobečky), 13 (`kontrola:tvrzeni`), 16 (axe včetně `/kontakt`: 0 serious/critical) a e2e balíčku z úkolu 01 prošly.

### Fáze B
- [ ] Souhrn inventury:
  - titulky bez přípony „ | HOLUB HSPG“ 0, titulky nad 65 znaků 0,
  - popisy nad 160 znaků 0 (dříve 5),
  - pole `<head>` s „bez lešení“ bez „zpravidla“ 0 (dříve 557),
  - `twitter:card`, `og:image:width` a `og:image:alt` = počet veřejných stránek (dříve 13, 12, 12),
  - `og:locale:alternate` 2.
- [ ] V `content/tvrzeni.json` nemá T01 výjimku `head`. `npm run kontrola:tvrzeni` → 0.
- [ ] `node scripts/build-og.mjs --kontrola` → 0. Oba obrázky mají 1200 × 630 a < 300 KB (`file`, `stat -c %s`). `/en` používá anglický obrázek. `assets/og.png` má nový obsah (jiný SHA-256 než 336 560 B soubor ze 4. 10.).
- [ ] `/cisteni-fotovoltaiky/` vrací na náhledu 200, je v sitemap, `Service` má cenu 39 z `ceny.json` a odkazuje na ni ceník i navigace (test).
- [ ] Publikační adresář po buildu: `grep -rl "<!--" --include=*.html "$PUB"` i `grep -rlE "docs/|scripts/build-" --include=*.html "$PUB"` jsou prázdné. `--kontrola` všech generátorů vrací 0 a vizuální, e2e a axe testy prošly i nad čistým výstupem. Pokud publikační adresář není oddělený od zdroje (krok 19 se neprovádí), je toto kritérium „blokováno“ a v hlášení je návrh řešení. Cíl 7 se pak nesplní a úkol se hlásí jako „částečně“.
- [ ] Na náhledu `curl -s <náhled>/akce/ | grep -c 'name="form-name"'` → ≥ 1 (Netlify formuláře dál rozpozná, nic se neodesílá).
- [ ] `node scripts/nap.mjs` vypíše kartu NAP, která se po normalizaci z kroku 3 shoduje s českou patičkou (test: telefon podle číslic, `ulice`, `psc`, `obec` a IČO) a je v hlášení.
- [ ] (ruční krok) validator.schema.org a Rich Results Test pro `/cisteni-fotovoltaiky/` mají 0 chyb. Lighthouse SEO 100 na `/`, `/cenik` a `/cisteni-fotovoltaiky/` (bez `is-crawlable` na náhledu, jako ve fázi A).

## Ověření
```bash
PUB=<publikační adresář z kroku 2>         # např. dist – ověř v netlify.toml
N=<adresa náhledu z node scripts/nasadit.mjs>

# před změnami (krok 3)
node scripts/seo-inventura.mjs --souhrn | tee .artefakty/ukol-11/pred-souhrn.txt

# build a kontroly generátorů
<build příkaz z netlify.toml / package.json>
node scripts/build-seo.mjs --kontrola           # → 0
node scripts/build-layout.mjs --kontrola        # → 0 (úkol 08)
node scripts/build-zaruka.mjs --kontrola        # → 0 (úkol 05)
npm run kontrola:tvrzeni                        # → 0 (úkol 13; ve fázi B i <head>)
node scripts/build-hbot.mjs --kontrola          # → OK
node scripts/build-og.mjs --kontrola            # fáze B → 0

# testy
node --test <testy>/seo-knihovna.test.mjs <testy>/seo.test.mjs     # → vše prošlo (počet do hlášení)
# + testy úkolů 01 (e2e balíčku), 05, 08 (vizuální), 13, 16 (axe), 17 (kotvy)

# souhrn po změnách – očekávané hodnoty viz Akceptační kritéria
node scripts/seo-inventura.mjs --souhrn

# náhled (jen GET, žádné odesílání formulářů)
curl -s "$N/robots.txt"                                        # 3 řádky, žádná interní cesta
curl -sI "$N/rd-control-panel/" | grep -i '^x-robots-tag'      # noindex, nofollow
for u in /kontakt /cisteni-fotovoltaiky/ /zaruka /cenik /cisteni-strech/ /en; do
  curl -s -o /dev/null -w "$u %{http_code}\n" "$N$u"; done    # vše 200 (/cisteni-fotovoltaiky/ až po fázi B, ve fázi A 404)
curl -s "$N/sitemap.xml" | grep -cE "<loc>https://hspg.cz/(kontakt|cisteni-fotovoltaiky/)</loc>"   # 2 (po fázi B)
curl -s "$N/" -o .artefakty/ukol-11/home.html && node scripts/seo-inventura.mjs --soubor .artefakty/ukol-11/home.html
                                                               # firma s @id, WebSite, 4× Service s provider @id, žádné AggregateRating
curl -s "$N/akce/" | grep -c 'name="form-name"'                # ≥ 1
curl -sI "$N/assets/og/<soubor z manifestu>" | grep -iE "^HTTP|content-length"   # 200, < 307200

# Lighthouse (pokud náhled posílá X-Robots-Tag: noindex, audit is-crawlable ignoruj – stejně jako v úkolu 04)
npx -y lighthouse "$N/" --only-categories=seo,accessibility,performance --preset=desktop --quiet --chrome-flags="--headless" --output=json --output-path=.artefakty/ukol-11/lh-home.json
npx -y lighthouse "$N/kontakt" --only-categories=seo,accessibility --preset=desktop --quiet --chrome-flags="--headless" --output=json --output-path=.artefakty/ukol-11/lh-kontakt.json
node -e 'for (const f of process.argv.slice(1)) { const r = require(require("path").resolve(f)); console.log(f, "SEO", r.categories.seo.score*100, "A11y", r.categories.accessibility.score*100, "CLS", r.audits["cumulative-layout-shift"]?.numericValue ?? "-", "neprošlo:", Object.values(r.audits).filter(a => a.score === 0).map(a => a.id).join(",")) }' .artefakty/ukol-11/lh-pred.json .artefakty/ukol-11/lh-home.json .artefakty/ukol-11/lh-kontakt.json
```
Ruční kroky (výsledek a snímky do hlášení): validator.schema.org (URL náhledu, nebo vložený kód) a Google Rich Results Test pro stránky z akceptačních kritérií.

Testy, které agent přidá: `seo-knihovna.test.mjs` a `seo.test.mjs` (obsah v krocích 12 a 21), rozšíření axe a e2e seznamů o `/kontakt` a `/cisteni-fotovoltaiky/`. Názvy skriptů a adresářů přizpůsob repozitáři a skutečné příkazy uveď v hlášení. Úkol 19 je převezme do CI.

## Bez AI / s AI
Úkol AI nepoužívá a nic z jeho výstupu na AI nezávisí. JSON-LD, stránky i OG obrázky vznikají buildem z `content/*.json`. H-BOT čte `content/firma.json`, proto po každé změně spusť `node scripts/build-hbot.mjs` a `--kontrola`. Kód balíčku (`netlify/lib/ai/*`) se nemění.

## Nepřekročitelná pravidla
Viz `balicek/KONTEXT.md` §4. Pro tento úkol navíc:
- **Nikdy** `AggregateRating`, `Review`, `ratingValue` ani hvězdičky, ani „ukázkově“, ani převzaté z Google profilu. Hodnocení smí na web jen ze skutečných recenzí přes úkol 14 a registr úkolu 13. Žádné „4,9/5“, pojistné částky, certifikáty, „satelitní analýza“ ani počty zakázek.
- **Žádná nová tvrzení.** Titulky, popisy, texty pro sítě, `/kontakt`, `/cisteni-fotovoltaiky/` a OG obrázky vznikají jen z `content/*.json` a z textů, které už na webu jsou. Chybějící údaj je `[DOPLNIT: …]` jen v datech, ve výstupu nikdy (test).
- OG obrázek nenese záruku, „bez lešení“, „24 h“ ani ceny.
- Druhý Google profil ani nový záznam na Firmy.cz **nezakládat**. Převzetí a úpravy profilů dělá majitel (Claude v Chrome C5, C6). NAP musí znakově odpovídat webu.
- `robots.txt` neslouží k ochraně a nesmí obsahovat interní cesty. Přihlášení ani hlavičky interních stránek neměň a do hlášení ani dokumentace nepiš nic o přístupu k interním stránkám.
- Žádné mazání ani přejmenování URL a žádná 301 (úkoly 06 a 12). Texty těla měň jen na vyjmenovaných místech: nadtitulek v H1, drobečky, `/kontakt` a `/cisteni-fotovoltaiky/`.
- Formuláře neodesílej, ani na náhledu. Validátorům dávej jen URL náhledu (GET) nebo vložený kód.
- Nasazuj jen přes `node scripts/nasadit.mjs` (náhled zdarma). Produkce jen po schválení majitelem a v dávce. MX ani DNS se nemění. Úkol nepotřebuje žádné klíče. Ověření v Seznam a Bing Webmaster řeší C7 přes DNS TXT po souhlasu majitele.

## Hlášení po dokončení
Po **fázi A** i **fázi B** použij formát z `KONTEXT.md` §5 a doplň:
- tabulku z kroku 2 (typ stránky → zdroj → generátor) a stav předpokladů (03, 04, 08, 13, 16, 17),
- souhrn inventury **před → po** (všechny metriky z kroku 3) a seznam změněných souborů a generátorů,
- výsledky testů (počty), `--kontrola` všech generátorů, validator.schema.org a Rich Results Test (čísla nebo snímky) a Lighthouse (SEO, přístupnost, CLS desktop `/`) před a po,
- snímky před a po: H1 na `/`, `/en` a rozcestníku, drobečky na `/cenik`, `/kontakt`, `/cisteni-fotovoltaiky/` a oba OG obrázky,
- velikost HTML `/` před a po čištění výstupu,
- kartu NAP z `node scripts/nap.mjs`,
- **checklist pro majitele:**
  - [ ] Na náhledu schválit titulky `/` a `/en`, nadtitulek H1 na `/`, texty `/kontakt` a `/cisteni-fotovoltaiky/` a nový OG obrázek.
  - [ ] Odpovědět na O12 (působnost v EU) z úkolu 13.
  - [ ] S Claude v Chrome (C5): doplnit **existující** Firemní profil Google podle karty NAP (druhý nezakládat) a poslat odkaz na profil. Adresu sídla v profilu nezveřejňovat (sídlo není provozovna). Oblast obsluhy (dnes Česko, Slovensko, Polsko) sjednotit s webem podle odpovědi O12.
  - [ ] S Claude v Chrome (C6): převzít záznam na Firmy.cz („Dušan Holub, Praha“, IČO 09291881, dnes neověřený), vyplnit ho podle karty NAP a poslat URL detailu.
  - [ ] S Claude v Chrome (C7): Seznam Webmaster a Bing Webmaster (DNS TXT ve Wedosu, MX neměnit) a odeslat sitemap.
  - [ ] Po produkčním nasazení: Facebook Sharing Debugger, „Scrape Again“ pro `/`, `/akce/` a `/cenik`.
- **předávky:**
  - **12:** `scripts/lib/seo.mjs` (`sluzba`, `drobecky`, `odkazNaFirmu`, `socialniBlok`, pravidla titulků a popisů) použije šablona hubů. Rozcestníky mají sdílené komponenty a `data-seo="rozcestnik"`, tělo střech a fasád ale zůstává ručně psané. Kontrola v kroku 1 úkolu 12 = `build-seo --kontrola` a 4 stránky s `data-seo`. `/cisteni-fotovoltaiky/` nemá okresní klony.
  - **13:** `<head>` hotový, výjimka T01 `head` je zrušená. Odpověď O12 → `firma.oblast_pusobnosti` a titulek `/en`. Pokud se ve fázi B vrátí `JobPosting`, `hiringOrganization` = `kratkyUzelFirmy()` (má `legalName`).
  - **18:** H1 na `/` a `/en` = nadtitulek uvnitř H1. Přeskládání první obrazovky a slib „do 24 hodin“ zůstávají na úkolu 18. `/kontakt` je cíl pro identitu a „Kde nás najdete“. Blok „Můj příběh“ má `id="pribeh"`, na který odkazuje `/kontakt`. Při přesunu bloku (úkol 18, krok 18) musí `id` zůstat. `/o-nas` nevzniklo.
  - **19:** do CI `node --test seo*.test.mjs`, `build-seo --kontrola`, `build-og --kontrola` a kontrolu komentářů ve výstupu.
  - **15:** pokud se zavedou hashe inline skriptů v CSP, počítat je z výstupu **po** čištění (krok 19).
  - **07:** OG obrázky mají otisk v názvu (`/assets/og/`), smí mít dlouhou cache; přidej velikost HTML po čištění.
  - **06:** nové URL `/kontakt` a `/cisteni-fotovoltaiky/` (sitemap, canonical).
  - **14:** `robots.txt` interní panel neuvádí, hlavičky panelu zůstávají na úkolu 14.
- návrhy mimo rozsah (např. odstranění nevyužívaného `<meta name="keywords">` na `/` a anglická verze `/kontakt`).
