# Úkol 13: Pravdivost tvrzení – technologie, H-BIO, kariéra, akce
> Priorita P0 · Závisí na: 00 (Git, `CLAUDE.md`, `scripts/nasadit.mjs`); navazuje na úkoly 05 a 17, které jsou v pořadí dřív (záruka z dat, statické hodnoty čítačů a výpočty kalkulačky SVJ) · Čeká na majitele: odpovědi O1–O14 níže (stav HYDRA/MAST/RAIL/SCAN 5, štítek SENTINEL, MASK, doklady H-STONE a H-BIO, podklad k cenám lešení, skutečná volná místa, pravidla akce a daň z výhry, originály fotek, text spotu, název certifikátu) · Rozsah: **fáze A** = inventura tvrzení, registr, kontrolní test v CI a okamžitá neutralizace absolutních a nedoložených tvrzení bez čekání na majitele → hlášení a stop; **fáze B** = promítnutí odpovědí a dokladů majitele

## Proč (s důkazy)
Pravidlo `KONTEXT.md` §4.1: žádná nedoložená tvrzení, technologie ve vývoji nevydávat za hotové. Podklad: `audit-pravni_pravdivost.json` nálezy #3, #10, #11, #12, #16, #18, #19 a `audit-seo.json` #7. Výskyty jsou ověřené v kopii živého webu ze 4. 10. 2026. Živý web se s ní shoduje (porovnáno na `/`, `/kariera`, `/cenik`, liší se jen dnes vypnutý odznak Netlify). Čísla řádků platí pro publikované HTML. Ve zdroji (šablony, generátory) se mohou lišit.

| ID | Tvrzení | Kde (stav 4. 10. 2026) | Proč je to problém |
|---|---|---|---|
| T01–T02 | „bez lešení“ jako bezpodmínečný slib | 767× ve zdroji 160 HTML stránek: 554× v `<head>`, 210× v těle (H1 „Čištění fasád/střech ‹okres› — bez lešení“ na 156 okresních stránkách), 3× v JSON-LD na `/`. Absolutní znění: `/cenik` ř. 204 „Bez lešení a plošin.“, `/` ř. 1240 „Bez lešení … lešení neplatíte“, čítač `/` ř. 1595 „0 Kč · ZA LEŠENÍ — VLASTNÍ TECHNIKA“, H1 `/kalkulacka-svj` „Kolik ušetříte bez lešení.“, H1 `/nabidka-svj` „… — bez lešení.“, `/en` ř. 268 „No scaffolding charge.“ a 7× „without scaffolding“. „lešení neplatíte“ je 110× na 51 stránkách: 76× v `<head>` 38 okresních stránek střech (meta a `og:description` „Vlastní technika, lešení neplatíte.“), dále 12 okresních stránek fasád („bez stavby lešení — lešení neplatíte“) a `/`. Dále `assets/hbot.js`, `assets/svj-podklad.js` a veřejná `/reel/index.html` (3×). | Odporuje to textům na webu: FAQ okresních stránek „Většinou ne … kdyby bylo lešení výjimečně nutné, uvedeme to v nabídce“, `/cisteni-strech/` „Lešení není automatický předpoklad ani univerzální slib“, ceník „mohou vyžadovat jinou přístupovou techniku“, `/nabidka-svj` ř. 166 „… potvrdíme po posouzení objektu“. Hrozí klamavá reklama (§ 5 zákona o ochraně spotřebitele). |
| T03–T05 | „vlastní receptura“, parametry H-STONE | „vlastní receptura“ 79× na 78 stránkách (`/` a 77× `/cisteni-fasad/‹okres›/`). Na `/` ř. 1646 „Žádné nakupované náhražky. H-STONE je naše vlastní receptura“ a ř. 1649–1650 „8–10 m² Z JEDNOHO LITRU“ a „24 h PLNÁ FUNKCE“. Na `/en` „Own H-STONE impregnation“ (JSON-LD) a „our own technology“. Spojení „neviditelná a prodyšná“ 81× na 79 stránkách. | Majitel zatím nedodal recepturu ani technický list (`KONTEXT.md` §3). |
| T06–T07 | Biocid „H-BIO“ a jeho účinnost | „H-BIO“ 215× ve zdroji 82 HTML stránek (80× v `<head>`). Stránky: 78 pod `/cisteni-strech/`, dále `/`, `/cenik`, `/en`, `/cisteni-fasad/`. Také v `assets/hbot.js`, `assets/svj-podklad.js`, `assets/en-sections.js` a `/reel/`. Absolutní tvrzení: `/` ř. 1842 „Biocid zahubí mech a řasy do kořene“, ř. 1283 (přepis spotu) „likvidace spor v hloubce pórů“, totéž v `assets/hbot.js` ř. 58, `assets/svj-podklad.js` ř. 84 a `/reel/`. Věta „Křehké povrchy ošetřujeme šetrným biocidním postupem bez tlaku“ je 79× (`/`, 77× `/cisteni-fasad/‹okres›/`, JSON-LD FAQ na `/` ř. 48, `assets/hbot.js` ř. 26). | Chybí název povoleného přípravku a číslo povolení. Biocid se smí dodávat a používat jen s povolením a pod povoleným názvem a jeho reklama nesmí bagatelizovat riziko (nařízení (EU) 528/2012, čl. 17 a 72, podle auditu). Majitel doklad zatím nedodal (§3). |
| T08–T10 | Technologie HYDRA, MAST, RAIL, SCAN 5, MASK a „štítek Sentinel“ | HYDRA 6× (patička `/` ř. 1905, `/kariera`). MAST 2× (`/kariera`). RAIL 7× (`/cenik` ř. 332 „Systém RAIL – Na dotaz“, patička `/`, `/kariera`). SCAN 5 5× (`/kariera`). „MASK“ je 9× v 6 souborech: „Zakrývání oken systémem MASK“ na `/cenik`, `/kalkulacka-svj`, `/nabidka-svj`, `/cisteni-fasad/` a v `assets/svj-podklad.js`, „vč. zakrývání oken MASK“ na `/cenik` a „(MASK)“ v `assets/hbot.js`. „Štítek Sentinel“ je 5× (`/pas-domu`, `/recenze/`). Ukázka pasu `/pas-domu` ř. 206 uvádí „Sentinel osazen na severní fasádu — pas aktivován, indikátor zelený“. | Web nikde nevysvětluje, co RAIL, HYDRA, MAST ani SCAN 5 jsou, a `/kariera` ř. 151 píše „Stavíme systém…“, tedy jde o vývoj. Stav těchto technologií čeká na majitele (§3). Tarif SENTINEL START je součástí potvrzené podmínky záruky (`KONTEXT.md` §2). **Tarify SENTINEL START/PLUS/PREMIUM a jejich podmínky se v tomto úkolu nemění** (jen návrh mimo rozsah). |
| T11 | Práce ve výškách | `/kariera`: „Žádné lešení, žádné visení na laně — technika ve výšce, ty na zemi s ovladačem“, „žádné výšky“, H1 „Technika zvládá výšky“. Proti tomu `/` ř. 1750 „Víme, kam šlápnout, a váhu rozkládáme“ a `/spoluprace` ř. 85 „lana … pro bezpečný pohyb při práci ve výškách“. | Stránky si navzájem odporují. |
| T12 | Kariéra a JobPosting | `/kariera` ř. 30: 3× JobPosting („Technik flotily — obsluha HYDRA & MAST“, „Montážník RAIL — instalace kolejnic a doků“, „Pilot dronu — SCAN 5, zaměřování“) s datePosted 2026-09-12, bez validThrough, employmentType a baseSalary. hiringOrganization je obchodní název, zaměstnavatelem je ale OSVČ Dušan Holub. Dále ř. 162 „každá instalace nese tvůj podpis dalších 20 let“, ř. 175 „první technici povedou regiony franšízy“ a meta description „technik flotily HYDRA, montážník RAIL a pilot dronu SCAN 5 … práce bez výšek“. | Pozice jsou vázané na nepotvrzené technologie. Zaměření dnes dělá člověk z map, ne dron (`POSUDEK-MASTER-PLANU.md`). Google penalizuje nepravdivé pracovní nabídky. |
| T13–T14 | Srovnání s lešením | `/cenik` ř. 355 „lešení se na trhu orientačně účtuje kolem 120 Kč/m² … 190 Kč/m² … u nás ho neplatíte“ (`content/ceny.json` → `scaffold_market_rate`). Kalkulačka na `/` ř. 1634 „Orientačně odpadá lešení/plošina 18 720 Kč“, `/en` ř. 300 „Scaffolding / platform you avoid (approx.) 18,720 CZK“. `/kalkulacka-svj` ř. 246 „Lešení — pronájem, montáž, demontáž (trh, orientačně) 190 Kč/m²“, sloupec „KLASICKY — S LEŠENÍM“, „VAŠE ÚSPORA“ a „CENA ODKLADU“ s výchozím ročním růstem 6,4 % (ř. 277). `assets/svj-podklad.js` ř. 48. | Sazby ani růst cen nemají uvedený ani doložený zdroj (srovnávací a úsporná tvrzení, § 5 ZOS, § 2980 OZ). |
| T15 | Čítače | `/` ř. 1594–1596: statické HTML ukazuje „0 h“ (cíl 24, „OD ADRESY K CENĚ“), „0 Kč“ („ZA LEŠENÍ — VLASTNÍ TECHNIKA“) a „0×“ (cíl 2, „ROČNĚ SERVIS — TARIF SENTINEL PLUS“). Správnou hodnotu dopočítá až skript (`index.html` ř. 2360). | Bez JS, pro vyhledávače a v náhledech jsou čísla nepravdivá. Statický text a animaci opravuje **úkol 17** (v pořadí dřív). Tady zbývá bezpodmínečný popisek „0 Kč · ZA LEŠENÍ — VLASTNÍ TECHNIKA“ (T02) a test e jako hlídač. |
| T16 | „Skutečná zakázka HOLUB“ | 9× na 3 stránkách (`/`, `/nabidka-svj`, `/cisteni-strech/`) a ve spotu. Snímky nemají metadata, takže pravost nelze ověřit. `/reference` ř. 150 přitom píše „zatím prázdno a nic jsme nedoplnili naoko“. | Skutečné zakázky s fotkami a souhlasy čekají na majitele (§3). |
| T17 | Akce „Vypusťte holuba“ | `/pravidla-akce/` má 7 bodů (ř. 59–65). Chybí doba konání, okruh účastníků, vymezení území („dojezdová vzdálenost“ v ř. 61 není definovaná), definice výhry, postup při nezpůsobilém povrchu, lhůta k čerpání, způsob prokázání pořadí a daňové ošetření. Pořadatel si vyhrazuje změnu „kdykoli“ (ř. 64). Vlastní část o osobních údajích (ř. 68 a dál) se liší od zásad. Sdělení „každá desátá poptávka … vyhrává“ je na `/` (lišta ř. 1406), `/akce/` (ř. 85, 100), v `assets/holub-let.js` a ve spotu, vždy bez data platnosti. | Riziko klamavé praktiky a sporů s výherci. Výhra nad 10 000 Kč podléhá dani (podle auditu má posoudit daňový poradce). |
| T18 | `/en` | 5× „Request a quote“ vede na český soutěžní formulář `/akce/` (ř. 134, 147, 258, 301, 340). „Privacy policy“ (ř. 355) a „Cookie settings“ (ř. 358) vedou na českou stránku. | Anglický návštěvník se nevědomky účastní české soutěže a souhlasí s textem, kterému nerozumí. |
| T21 | Prevence („Master plán“) | Na webu je dnes 0× AggregateRating, ratingValue nebo „4,9/5“, 0× pojištění, 0× „satelit“, 0× „polymerace“ a 0× superlativ (nejlepší, č. 1, lídr). | E-mail „Master plán“ je chce doplnit (`POSUDEK-MASTER-PLANU.md`), kontrola je proto musí trvale blokovat. |
| T24 | „Garantovaný certifikát“ | `/` 1× (`certifikat__nazev`, „Garantovaný certifikát H-STONE · 10 let · co obsahuje a kdy platí“). Úkol 05 blok certifikátu převádí na data, ale slovo „Garantovaný“ výslovně předává sem. | Délka záruky je potvrzená, název a existence certifikátu ne. Nikdo jiný ho neposuzuje. |

## Cíl (měřitelný)
1. **Inventura:** `node scripts/inventura-tvrzeni.mjs` zapíše každý výskyt sledovaných tvrzení do `docs/tvrzeni/inventura.csv` (ID, stav, oblast, soubor, řádek, shoda, kontext). Registr `content/tvrzeni.json` má u každého tvrzení stav `dolozeno` / `preformulovat` / `odstranit` / `ceka` a k němu doklad, nebo důvod a číslo otázky.
2. **Po fázi A** ve výstupu webu, v JS a ve znalostech H-BOT platí:
   - tvrzení ve stavu `odstranit` mají 0 výskytů,
   - „bez lešení“ / „without scaffolding“ je v těle stránek, v JSON-LD a v JS jen ve schválených formulacích (výjimka: `<head>`, který řeší úkol 11),
   - na webu je 0× JobPosting,
   - čítače bez JS ukazují „24 h“, „0 Kč“ a „2×“ (statické hodnoty z úkolu 17) a popisek čítače „0 Kč“ nese podmínku podle F3,
   - `/en` nemá žádný odkaz na `/akce/`,
   - sazby lešení, úspora ani „cena odkladu“ s výchozím růstem se bez zdroje nezobrazují.
3. **Hlídání:** `npm run kontrola:tvrzeni` běží lokálně i v GitHub Actions. Selže, pokud se kterýkoli zakázaný výraz vrátí (ověřeno negativním testem).
4. **Po fázi B:** žádné tvrzení není ve stavu `ceka`, nebo je v hlášení seznam zbylých s důvodem. Pravidla akce mají verzi 2 s datem (nebo je akce ukončená). JobPosting je jen u písemně potvrzených pozic se všemi povinnými poli.
5. **Žádné nové tvrzení:** každé číslo nebo vlastnost, která v diffu přibyla, má zdroj v registru.

## Rozsah
**ANO:**
- registr, inventura a test tvrzení a workflow pro CI,
- změny textů tvrzení ve všech oblastech stránek: tělo, JSON-LD, inline skripty, `assets/*.js`, znalosti H-BOT, `reel/index.html`,
- texty promptů a automatických odpovědí ve funkcích (`holub-ai`, `facebook-webhook` aj.), pokud obsahují vzor z tabulky T – jen text, logiku ne,
- šablona v `scripts/build-regions.mjs` a nové vygenerování stránek,
- JobPosting na `/kariera` a neutrální text kariéry,
- popisek čítače „0 Kč“ (statické hodnoty a animaci čítačů zavádí úkol 17),
- skrytí srovnání s lešením, dokud chybí zdroj (řízené daty),
- odkazy z `/en` mimo soutěž,
- návrh pravidel akce v2 (nepublikovaný),
- otázky pro majitele a fáze B podle jeho odpovědí.

**NE (patří jinam, jen zapiš do hlášení):**
- Text záruky („10 let“, podmínka, „chráněný dalších 10 let“) → **úkol 05**. Při úpravě vět, které záruku obsahují, část o záruce neměň. Výjimka: slovo „Garantovaný“ v názvu certifikátu posuzuje tento úkol (T24), protože ho úkol 05 výslovně předává sem.
- „bez lešení“ v `<title>`, meta description a `og:`/`twitter:` (554× na 159 stránkách), struktura JSON-LD LocalBusiness/Service, `areaServed` „Evropská unie“, titulek `/en` „Czech Republic & EU“, H1 kvůli klíčovým slovům → **úkol 11**. Předáš mu schválené formulace. Ostatní tvrzení (absolutní sliby T02 jako „lešení neplatíte“, H-BIO, technologie, receptura) opravuješ i v `<head>`.
- Statický text a animace čítačů, výpočty a předvyplnění kalkulačky SVJ → **úkol 17** (v pořadí dřív). Na jeho výsledek navazuješ, viz kroky 8 a 9.
- Slib „do 24 hodin“ a „24 h · OD ADRESY K CENĚ“ (reakční doba) → **úkol 18**. Hodnotu čítače „24 h“ neměň.
- Ostatní obsah `/en`, anglický poptávkový formulář a anglická informace o reklamaci (návrh z úkolu 04) → **úkol 18**. Na `/en` tady měníš jen odkazy na soutěž a tvrzení z tabulky T.
- Zařazení kontroly do společného CI → **úkol 19** (převezme `npm run kontrola:tvrzeni`).
- Obsah zásad (anglické shrnutí, uchazeči o práci, údaje v akci), souhlas na `/akce/` → **úkol 09**. FormSubmit a e-maily → **úkol 03**.
- Rozsah služeb a architektura okresních stránek → **úkol 12**. Ty měníš jen věty s tvrzeními v šabloně, URL ani stránky nemažeš.
- Bezpečnost pasu domu → **úkol 14**. Podmínky tarifů SENTINEL a technická logika H-BOT (úkol 01) se tu neřeší.
- Formuláře kariéry a spolupráce a neutrální poptávkový formulář mimo soutěž (`audit-formulare.json` #11, #12, #20) zapiš jako návrh.

## Postup
### Fáze A – bez čekání na majitele
1. Větev `ukol-13-pravdivost-tvrzeni` z aktuální `main` (`git fetch` a pak `git switch -c ukol-13-pravdivost-tvrzeni origin/main`).
2. Najdi v repozitáři soubory, které generují zmíněná tvrzení. Skutečné cesty zapiš do hlášení.
   - **Co se publikuje:** `netlify.toml` → `[build] publish` a build příkaz. Ověřeno na živém webu: `/content/ceny.json` a `/scripts/build-regions.mjs` vrací 404, `/reel/index.html` vrací 200 (veřejná stránka s `noindex`). Inventura musí projít **všechny** publikované `*.html`, nejen ty v sitemap.
   - **Generátory:** `scripts/build-regions.mjs` (stránky s `data-gen="build-regions"`: 231 okresních a `/cisteni-dlazby/`, celkem 232) a `scripts/build-ceny.mjs` (`content/ceny.json` → `assets/ceny.js` a bloky ceníku). Dále `content/sentinel.json`, případně `build-recenze.mjs` a `build-references.mjs`.
   - **Ručně psané stránky:** `index.html`, `cenik.html`, `kariera.html`, `spoluprace.html`, `pas-domu.html`, `nabidka-svj.html`, `kalkulacka-svj.html`, `en.html`, `akce/index.html`, `pravidla-akce/index.html`, `recenze/index.html`, `cisteni-strech/index.html`, `cisteni-fasad/index.html` a `reel/index.html`. Komentář v `index.html` u přepisu spotu uvádí „Znění je doslovné podle `reel/index.html`“.
   - **JS:** `assets/hbot.js`, nebo po sloučení úkolu 01 `content/hbot-faq.json` → `assets/hbot-znalosti.json`. Dále `assets/svj-podklad.js`, `assets/en-sections.js` a `assets/holub-let.js`.
   - **Funkce** (adresář podle `netlify.toml` → `[functions]`, obvykle `netlify/functions/`: `holub-ai`, `facebook-webhook` a další, po úkolu 01 i `netlify/lib/ai/`): prompty a texty automatických odpovědí zahrň do inventury. Opravuješ jen text, který obsahuje vzor z tabulky T (krok 14), logiku funkcí neměň. Úkol 09 sem předává případné „satelitní analýze“ v odpovědích `facebook-webhook`.
   - **Testy:** adresář testů a `package.json`. Test runner ověř ve zdroji. Pokud žádný není, použij `node --test` bez závislostí.
3. **Registr `content/tvrzeni.json`.** Musí být mimo publikovaný adresář, nebo z publikace vyloučený. Struktura:
   ```json
   {
     "verze": "2026-10-DD",
     "schvalene_formulace": { "F1": "zpravidla bez lešení", "...": "..." },
     "tvrzeni": [
       { "id": "T01", "popis": "Lešení – bezpodmínečný slib", "vzory": ["[Bb]ez lešení", "[Ww]ithout scaffolding"],
         "stav": "preformulovat", "povolene_formulace": ["F1", "F2", "F3", "F4"], "vyjimky_oblasti": ["head"],
         "vyjimka_duvod": "title/description/og řeší úkol 11", "otazka": "O6",
         "doklad": null, "rozhodl": "úkol 13 – výchozí neutralizace", "datum": "2026-10-DD" }
     ],
     "kariera": { "pozice": [] }
   }
   ```
   Výchozí obsah tvoří tabulky T01–T23 a F1–F8 níže. Samotné doklady (faktury, technické listy, nabídky lešení s údaji třetích osob) **do repozitáře nedávej**. V registru stačí popis dokladu, jeho datum a místo uložení.
4. **Skript `scripts/inventura-tvrzeni.mjs`** (Node, bez závislostí):
   - **Co prochází:** publikované `*.html`, `assets/**/*.js`, `content/*.json` (kromě `tvrzeni.json`) a zdrojové kódy funkcí.
   - **Normalizace:** odstraní tagy, sjednotí `&nbsp;` a U+00A0 na mezeru a zkrátí bílé znaky.
   - **Oblast výskytu:** `head` (title, meta, `og:`, `twitter:`), `jsonld`, `skript-inline`, `telo`, `js`, `json`, `funkce`.
   - **Výstup:**
     - `docs/tvrzeni/inventura.csv` v UTF-8 s BOM, oddělovač `;`, sloupce `id;stav;oblast;soubor;radek;shoda;kontext` (kontext má ±60 znaků),
     - souhrn na stdout: počet výskytů a stránek pro každé ID a oblast.
   - **Přepínač `--kontrola`:** vrátí kód 1 a vypíše porušení. Pravidla porušení jsou stejná jako v testu (krok 5).
   - **Umístění:** pokud je `docs/` v publikovaném adresáři, dej CSV jinam. Na náhledu musí vracet 404.
5. **Test `‹adresář testů›/tvrzeni.test.mjs`** (`node:test`). Před testem spusť generátory, aby výstupy byly aktuální.
   - a) Tvrzení ve stavu `odstranit` mají 0 shod ve všech oblastech kromě `vyjimky_oblasti`.
   - b) U stavu `preformulovat` se z normalizovaného textu nejdřív vypustí všechny `povolene_formulace` (bez ohledu na velikost písmen, aby prošlo i „Zpravidla bez lešení“ na začátku věty) a potom musí být 0 shod. Výjimky oblastí (T01 `head`) jen vypíší počet jako varování.
   - c) Stav `ceka` test neshodí. Vypíše počet a vyžaduje vyplněné pole `otazka`.
   - d) Stav `dolozeno` vyžaduje vyplněné `doklad`, `datum` a `rozhodl`.
   - e) Každý `.citac` má v HTML text `Number(data-cil).toLocaleString('cs-CZ') + data-pripona`.
   - f) `"@type": "JobPosting"` se smí vyskytnout jen pro pozice z `kariera.pozice`. Každá musí mít title, description, datePosted, validThrough v budoucnu, employmentType, baseSalary v CZK, hiringOrganization s `legalName` „Dušan Holub“ a skutečné jobLocation.
   - g) `en.html` neobsahuje `href` na `/akce/`.
   - h) Každý blok `application/ld+json` projde přes `JSON.parse`.
   - i) Publikovaný výstup obsahuje 0× `[DOPLNIT`.
   - j) Každá stránka s „každá desátá“ obsahuje odkaz na `/pravidla-akce/`.
   - k) **Negativní test:** kontrola nad řetězcem `<p>Bez lešení a plošin. Biocid H-BIO zahubí mech do kořene.</p>` najde aspoň 3 porušení. Tím se ověří, že kontrola opravdu kontroluje.
6. Spusť inventuru **před změnami** a výstup ulož jako `docs/tvrzeni/inventura-pred.csv`. Počty pro jednotlivá ID dej do hlášení a porovnej je s tabulkou v části Proč. Commitni.

   > Fáze A je rozsáhlá. Pokud ji nestihneš v jednom sezení, zastav se po tomto kroku: commitni, podej průběžné hlášení „ÚKOL 13 – částečně“ s počty z inventury a v dalším sezení pokračuj ve stejné větvi krokem 7. Testy a a b do té doby padají, to je v pořádku. Do `main` se slučuje až celá fáze A.
7. **Neutralizace podle tabulky T.** Měň šablony a generátory, ne vygenerované stránky. Po změně spusť generátory. Ručně psané stránky a JS uprav přímo. Text v JSON-LD (FAQ odpovědi, popisy Service) musí odpovídat viditelnému textu. Nové texty piš s typografií podle §4.9: nezlomitelná mezera po v, k, s, z, a, i, o, u a mezi číslem a jednotkou, uvozovky „…“. Na `/en` a v `assets/en-sections.js` použij věrný překlad formulací F bez nových vlastností. „without scaffolding“ smí zůstat jen jako „usually without scaffolding“ (F1 EN).

   | ID | Vzory (regex) | Výchozí stav | Fáze A (hned) | Fáze B (po odpovědi) |
   |---|---|---|---|---|
   | T01 | `[Bb]ez lešení`, `[Ww]ithout scaffolding` | preformulovat | V těle, JSON-LD a JS jen F1–F4. H1 okresních stránek změň na „… — zpravidla bez lešení“ (F1). Měděný prvek: vypusť „— bez lešení“. | O6: majitel potvrdí nebo upraví F1–F4 |
   | T02 | `[Bb]ez lešení a plošin`, `lešení neplatíte`, `[Nn]o scaffolding charge`, `[Žž]ádné lešení`, `ZA LEŠENÍ — VLASTNÍ TECHNIKA` | odstranit | Nahraď F2 nebo F3. H1 `/kalkulacka-svj` a `/nabidka-svj` přeformuluj bez slibu. Platí i v `<head>`: v šabloně okresních stránek střech změň „Vlastní technika, lešení neplatíte.“ na „Vlastní technika, zpravidla bez lešení.“ (F1). Na `/en` nahraď „No scaffolding charge.“ za „Usually without scaffolding.“ Popisek čítače viz krok 8. | – |
   | T03 | `[Vv]lastní receptur`, `nakupované náhražky`, `[Oo]wn (H-STONE\|technology\|formula)` | odstranit | Použij F7. | O4: s dokladem lze vrátit |
   | T04 | `8–10 m²` (vydatnost), `PLNÁ FUNKCE` | odstranit | Odstraň oba údaje z `/`. | O4: vrátit jen s technickým listem |
   | T05 | `prodyšn`, `neviditeln` | ceka | Zatím ponech. | O4: bez technického listu zkrať na „hydrofobní impregnace“ |
   | T06 | `H-BIO` | odstranit | Nahraď „biocidní ošetření“ nebo „biocid“ (EN „biocide treatment“), i v `<head>`, `assets/*.js` a znalostech H-BOT. | O5: název přípravku a číslo povolení. Pokud web přípravek jmenuje, přidej povinnou větu podle čl. 72 odst. 1 nařízení (EU) 528/2012 (české znění vezmi z EUR-Lex). |
   | T07 | `do kořene`, `[Ll]ikvidace spor`, `šetrným biocid` | odstranit | Použij F5 a F6. | – |
   | T08 | `HYDRA`, `\bMAST\b`, `\bRAIL\b`, `SCAN ?5` | odstranit | Smaž řádek „Systém RAIL – Na dotaz“ z `/cenik` (ověř, že ho negeneruje `build-ceny.mjs`). V patičce `/` ponech jen označení, která web nabízí („H-STONE a SENTINEL“). Kariéru řeší T12, a to i v meta description. | O1: hotové → popsat jen doložené vlastnosti; ve vývoji → nanejvýš „připravujeme“ bez parametrů a termínů; interní název → nikde |
   | T09 | `\bMASK\b` (velkými písmeny; zachytí „systémem MASK“, „oken MASK“ i „(MASK)“) | preformulovat | Použij F8 „zakrývání oken“. Cena zůstává z `ceny.json`. | O3 |
   | T10 | `štítk\w* Sentinel`, `indikátor` | odstranit | „Kód najdete na certifikátu.“ V ukázce pasu nahraď událost „Sentinel osazen … indikátor zelený“ textem „Pas domu aktivován“. Tarify SENTINEL neměň. | O2 |
   | T11 | `visení na laně`, `[Žž]ádné výšky`, `bez výšek`, `[Tt]echnika zvládá výšky`, `[Tt]echnika ve výšce` | odstranit | Odstraň. | O6: jednotný popis práce ve výškách na všech stránkách |
   | T12 | `"JobPosting"`, `franšíz`, `dalších 20 let`, `flotil` | odstranit | Viz krok 10. | O8 |
   | T13 | `odpadá lešení`, `platform you avoid`, `lešení se na trhu`, `trh, orientačně`, `tržní sazba`, `VAŠE ÚSPORA` | ceka | Bez zdroje se nezobrazuje, viz krok 9. | O7 |
   | T14 | výchozí růst ceny 6,4 % | ceka | Bez výchozí hodnoty, viz krok 9. | O7 |
   | T15 | čítače `.citac` | – (test e) | Viz krok 8. | – |
   | T16 | `Skutečná zakázka` | ceka | Popisek a `alt` změň na neutrální popis obsahu („Střecha: vlevo před čištěním, vpravo po něm“), bez tvrzení o pravosti. | O10: s originálem a souhlasem vrátit |
   | T17 | `[Kk]aždá (desátá\|10\.)` | ceka | Text zůstává. Připrav návrh pravidel v2, viz krok 12. | O9 |
   | T18 | `href="/akce/` v `en.html` | odstranit | Viz krok 11. | – |
   | T19 | `Evropská unie`, `European Union`, `& EU` | ceka | Neměň. Předej úkolu 11. | O12 |
   | T20 | `Připomenutí kontroly SMS` (`content/sentinel.json`) | ceka | Neměň. | O13 |
   | T21 | `AggregateRating\|ratingValue\|reviewCount`, `4[,.]9 ?/ ?5`, `[Pp]ojiš[tť]\|[Pp]ojist`, `mil(\.\|ion[a-zů]*) Kč`, `[Ss]atelit`, `[Nn]ejlepší\|č\. ?1\b\|[Ll]ídr`, `až \d+ ?% (úspor\|investic)`, `polymerac`, `ideální klima` | odstranit | Dnes 0×, slouží jako prevence. | Povolit jen s dokladem změnou registru (hodnocení jen ze skutečných recenzí) |
   | T22 | `\[DOPLNIT` ve výstupu | odstranit | Placeholdery smí být jen v nepublikovaných návrzích. | – |
   | T23 | Spot (`reel/index.html` a přepis na `/`) | ceka | Viz krok 13. | O11 |
   | T24 | `Garantovan[a-zý]* certifikát` | ceka | Neměň (blok certifikátu spravuje úkol 05). | O14: podle odpovědi ponechat, nebo přejmenovat na „Certifikát H-STONE“ (bez změny textu záruky) |

   **Výchozí schválené formulace.** Jsou převzaté z textů, které na webu už jsou, takže nejde o nová tvrzení. Majitel je může upravit (O6).

   | F | Znění |
   |---|---|
   | F1 | „zpravidla bez lešení“ (EN „usually without scaffolding“) |
   | F2 | „Většinou pracujeme vlastní technikou bez lešení. Přístup posoudíme předem z map a snímků; kdyby bylo lešení výjimečně nutné, uvedeme to v nabídce.“ Obě stávající varianty FAQ (okresní stránky a `hbot-faq.json`) zapiš jako přesné řetězce. |
   | F3 | „0 Kč za lešení při variantě, kde lze práci provést vlastní technikou bez lešení; potvrdíme po posouzení objektu“ (`/nabidka-svj` ř. 166). Zkrácený popisek čítače na `/` je přesně „ZA LEŠENÍ, KDYŽ STAČÍ VLASTNÍ TECHNIKA“. |
   | F4 | „Lešení není automatický předpoklad ani univerzální slib.“ (`/cisteni-strech/`) |
   | F5 | „Biocidní ošetření zasáhne zbytky mechů a řas, které po čištění zůstávají v pórech.“ (zobecněná věta okresních stránek střech „Ošetření zasáhne zbytky mechů a řas, které po čištění zůstávají v pórech krytiny“, 77×) |
   | F6 | „Křehké povrchy ošetřujeme bez tlaku, biocidním postupem.“ (původní věta bez slova „šetrným“) |
   | F7 | „H-STONE je hydrofobní impregnace — voda perlí a špína stéká, takže mech a řasy nemají z čeho žít.“ |
   | F8 | „zakrývání oken“ |
8. **Čítače** (`/`, ř. 1594–1596): statické hodnoty („24 h“, „0 Kč“, „2×“ přímo v textu prvku `.citac`) a start animace zavádí **úkol 17** (v pořadí dřív). Hodnoty ani animaci neměň.
   - Popisek „ZA LEŠENÍ — VLASTNÍ TECHNIKA“ nahraď přesně zkráceným F3 „ZA LEŠENÍ, KDYŽ STAČÍ VLASTNÍ TECHNIKA“. Čítač neodstraňuj ani neskrývej, rozvržení ověř při 375 a 1280 px.
   - Test e hlídá, že statické hodnoty zůstanou.
   - Pokud úkol 17 v `main` ještě není, doplň do textu `.citac` jen cílovou hodnotu (`Number(data-cil).toLocaleString('cs-CZ') + data-pripona`). Animaci neměň a v hlášení to uveď jako předávku pro úkol 17.
9. **Srovnání s lešením řízené daty.** V `content/ceny.json` přidej zdroj tržní sazby lešení: pole `zdroj` a `datum` s hodnotou `null`. Dej je jako sourozence `scaffold_market_rate`, nebo dovnitř, pokud to nerozbije `build-ceny.mjs` a kód, který s objektem pracuje (ověř). Dokud `zdroj` chybí:
   - poznámka o tržní ceně lešení v `/cenik` se nevygeneruje,
   - kalkulačky na `/` a `/en` nezobrazí „odpadá lešení“. Platí i pro záložní sazbu natvrdo v inline skriptu homepage (`index.html` ř. 2294, `… : 120` pro případ, že se `ceny.js` nenačte; upozornění z úkolu 07): bez zdroje se řádek nezobrazí ani v záložní větvi,
   - `/kalkulacka-svj` nezobrazí sloupec „KLASICKY — S LEŠENÍM“ ani „VAŠE ÚSPORA“; zůstane výpočet ceny ošetření,
   - `assets/svj-podklad.js` vynechá řádek sazby lešení.

   Pokud zdroj existuje, zobrazí se u něj text „zdroj: …, MM/RRRR“. „Cena odkladu“ nebude mít výchozí růst 6,4 %: buď výsledek ukáže až po zadání odhadu uživatelem, nebo se použije doložený zdroj s odkazem (O7). Upravené H1 kalkulačky SVJ nesmí slibovat úsporu. Větu „a dům je chráněný dalších 10 let“ nech úkolu 05.

   **Navázání na úkol 17:** úkol 17 při buildu předvyplňuje výsledky kalkulačky SVJ pro výchozí stav (včetně 6,4 %) a jeho testy čekají např. „Odklad prodraží ošetření HSPG o + 68 000 Kč“. Uprav předvyplnění tak, aby bez zdroje nevznikl sloupec s lešením, úspora ani cena odkladu s výchozím růstem. Dotčené testy úkolu 17 uprav na nový stav a každou změnu testu uveď v hlášení se zdůvodněním. Výpočet (součty, varianta HSPG) neměň.
10. **Kariéra** (`kariera.html` včetně `<head>`): odstraň JobPosting (BreadcrumbList zůstává). Odstraň karty pozic, výhody a tvrzení z T08, T11 a T12. Nahraď je neutrálním textem bez tvrzení o volných místech, například nadpisem „Práce u HOLUB – HSPG“ a větou „Zajímá vás práce v čištění a ochraně povrchů? Pošlete nám pár vět o sobě.“ Kontakty ponech stávající. Title a description přepiš bez technologií.
11. **`/en`:** všech 5 tlačítek „Request a quote“ (ř. 134, 147, 258, 301, 340) nasměruj na kotvu kontaktního panelu `.contact-panel` (doplň `id`). Tlačítko v panelu vede na `tel:` a na e-mail přes stávající mechanismus `data-mail`. Přidej větu, že poptávkový formulář je zatím jen v češtině a soutěž platí jen pro český formulář. Odkazy „Privacy policy“ a „Cookie settings“ označ „(in Czech)“, dokud úkol 09 nedodá anglické shrnutí. Na `/en` oprav i T01–T07 a T13.
12. **Akce:** na webu nic neměň. Připrav nepublikovaný návrh `docs/tvrzeni/pravidla-akce-v2-navrh.md` s těmito body:
    - pořadatel podle ARES a živnostenský rejstřík `[DOPLNIT: úřad]`,
    - doba konání od `[DOPLNIT]` do `[DOPLNIT]`,
    - účastníci: věk, spotřebitelé a/nebo podnikatelé, vyloučené osoby, jedna účast na osobu a objekt `[DOPLNIT]`,
    - způsob zapojení,
    - určení pořadí: časové razítko Netlify Forms (záložní cestu FormSubmit odstraňuje úkol 03),
    - výhra: rozsah „základního ošetření“, materiál, max. 99 m², doprava, orientační hodnota z `ceny.json` `[DOPLNIT]`,
    - území: celá ČR, nebo X km od základen Praha a Hradec Králové (`ceny.json` → `doprava`) `[DOPLNIT]`,
    - postup při nezpůsobilém povrchu,
    - vyrozumění do 7 dnů a lhůta k čerpání výhry,
    - daňové ošetření podle stanoviska daňového poradce `[DOPLNIT]`,
    - osobní údaje: jen odkaz na zásady (úkol 09), žádný vlastní text,
    - kontakt pro stížnosti,
    - změny jen do budoucna se zveřejněním nové verze; poptávky se řídí verzí platnou v době odeslání,
    - číslo verze a datum,
    - krátký text na `/akce/` a do lišty na `/`: „Platí do … · podmínky“.
13. **Spot:** zdroj `reel/index.html` je veřejná stránka. Uprav ho podle F1 a F5 a odstraň „Skutečná zakázka“. Nové video vykresli jen tehdy, pokud repozitář obsahuje postup vykreslení (ověř ve zdroji). Pak aktualizuj odkazy na MP4, přepis na `/` a JSON-LD VideoObject. Pokud postup chybí, MP4 ani přepis na `/` neměň (přepis musí doslova odpovídat videu), uprav komentář u přepisu a zapiš otázku O11.
14. **Znalosti H-BOT:**
    - Pokud je úkol 01 sloučený, uprav `content/hbot-faq.json`, spusť `node scripts/build-hbot.mjs` a `node scripts/build-hbot.mjs --kontrola`.
    - Pokud sloučený není, uprav `assets/hbot.js` (ř. 26, 35, 38, 48, 58).
    - V obou případech zapiš do hlášení, že stejnou opravu potřebuje balíček (`balicek/web/content/hbot-faq.json` ř. 11, 23, 33, 43). Balíček sám neměň.
    - Funkce: prompty a texty automatických odpovědí (`holub-ai`, `facebook-webhook` aj.) projde inventura v oblasti `funkce`. Pokud obsahují vzor ve stavu `odstranit` nebo `preformulovat`, oprav jen tento text podle formulací F, logiku neměň. Soubory převzaté z balíčku (`netlify/lib/ai/*`) neměň, nález zapiš jako opravu pro balíček.
15. **CI a skripty:**
    - Do `package.json` přidej `"kontrola:tvrzeni"`. Skript spustí generátory, potom `git diff --exit-code` (výstupy musí odpovídat šablonám), `node scripts/inventura-tvrzeni.mjs --kontrola` a test. Lokálně ho spouštěj nad commitnutým stromem, jinak `git diff` správně selže.
    - Přidej `.github/workflows/kontrola-tvrzeni.yml` (spouští se při push a pull_request, `actions/setup-node` s verzí Node podle webu – ověř). Workflow nic nenasazuje, nepotřebuje tajemství a nespotřebuje kredity Netlify. Pokud už existuje společný workflow (úkol 19), přidej krok `npm run kontrola:tvrzeni` do něj místo nového souboru.
    - Do `CLAUDE.md` webu přidej řádek: „Před každým nasazením `npm run kontrola:tvrzeni`.“
16. Spusť inventuru **po změnách** (`docs/tvrzeni/inventura.csv`) a všechny testy. Nasaď náhled **jen přes `node scripts/nasadit.mjs`** (bez parametrů = náhled, 0 kreditů; přímé `netlify deploy` nepoužívej, `KONTEXT.md` §4.4) a projdi kontroly v části Ověření. Podej hlášení fáze A s otázkami O1–O14 a **zastav se**.

### Fáze B – po odpovědích a dokladech majitele
17. Každou odpověď zapiš do registru: stav, doklad (popis a místo uložení), `rozhodl` a `datum`. Co majitel nedoloží, zůstane odstraněné nebo přeformulované.
18. Promítni odpovědi podle sloupce „Fáze B“ v tabulce T.
    - **T08:** hotovou technologii popiš jen doloženými vlastnostmi. Pro technologie ve vývoji nanejvýš jedna věta „připravujeme“, bez parametrů a termínů, a nikdy v ceníku.
    - **T06:** pokud majitel nedodá doklad o povolení, zůstává obecné „biocidní ošetření“.
19. **Kariéra:** u každé písemně potvrzené pozice doplň `kariera.pozice` v registru a JobPosting se všemi poli podle testu f. Popis musí obsahovat náplň, místo výkonu, formu (HPP/DPP/OSVČ) a mzdu nebo rozpětí. Build musí markup po `validThrough` sám vypustit, ověř to testem s datem v minulosti. Rich Results Test projde majitel ručně. Pokud majitel žádnou pozici nepotvrdí, zůstane stav z fáze A.
20. **Akce:**
    - Pokud majitel akci prodlouží, publikuj pravidla v2 z vyplněného návrhu (bez `[DOPLNIT]`) a na `/akce/` a do lišty na `/` přidej „Platí do …“.
    - Pokud akci ukončí, vypni sdělení o výhře na `/`, `/akce/` a v `holub-let.js`. Stránku pravidel ponech s datem ukončení. Dosavadní účastníky se řídí původními pravidly (bod „již zařazené poptávky tím nejsou dotčeny“).
21. **Fotky, spot a EN:** vrať popisek „Skutečná zakázka“ jen u fotek s archivovaným originálem a souhlasem (O10). Spot vykresli nově podle schváleného textu (O11). Odkaz „Privacy policy“ nasměruj na anglické shrnutí, až ho dodá úkol 09.
22. Na konci spusť inventuru a test znovu. V hlášení uveď počet tvrzení ve stavu `ceka`: buď 0, nebo seznam s důvodem.

### Otázky pro majitele (vlož do hlášení fáze A)
- **O1** HYDRA (HYDRA-5), MAST, RAIL, SCAN 5: u každé uveďte, zda je (a) hotová a nabízená zákazníkům, (b) ve vývoji, (c) jen interní název, nebo (d) zrušená.
- **O2** Existuje fyzický štítek nebo indikátor SENTINEL na fasádě? (Tarif SENTINEL START je potvrzený jako podmínka záruky.)
- **O3** Je MASK vlastní systém či výrobek, nebo běžné zakrytí oken? Smí web psát „systém MASK“?
- **O4** H-STONE: doklad vlastní receptury (receptura, výrobce, smlouva), technický a bezpečnostní list, test vydatnosti (8–10 m²/l) a doby do plné funkce (24 h). Platí „neviditelná a prodyšná“?
- **O5** H-BIO: skutečný obchodní název přípravku, číslo povolení v registru biocidů MZ ČR a bezpečnostní list. Jde o vlastní směs, nebo o přeznačený přípravek? Chcete název přípravku na webu uvádět?
- **O6** Lešení: u jakého podílu zakázek bylo potřeba lešení nebo plošinu? Jak reálně probíhá práce ve výškách (technik na střeše, plošina, lano, technika ovládaná ze země)? Souhlasíte s formulacemi F1–F4?
- **O7** Tržní sazby lešení 120 a 190 Kč/m²: podklad (aspoň 3 nabídky s datem), nebo souhlas, aby srovnání zůstalo skryté. Výchozí růst cen 6,4 %: zdroj, nebo bez výchozí hodnoty?
- **O8** Kariéra: které pozice jsou skutečně otevřené? U každé název, forma (HPP/DPP/OSVČ), mzda nebo rozpětí, místo výkonu a datum platnosti nabídky. Existuje franšíza (plán nebo smlouva)? Na čem stojí údaj „20 let“?
- **O9** Akce „Vypusťte holuba“: pokračovat, nebo ukončit? Pokud pokračovat, vyplňte body z návrhu v2 a dodejte stanovisko daňového poradce k dani z výhry.
- **O10** Fotky a videa „Skutečná zakázka HOLUB“ (`realizace-strecha-*`): existuje originál s datem a místem a souhlas majitele domu?
- **O11** Spot: schválíte nový text? Má spot do nového vykreslení zůstat, nebo ho skrýt?
- **O12** Působnost „celá ČR, na vyžádání i EU“ (`content/firma.json`): platí? (Údaj předám úkolu 11 pro `/en` a JSON-LD.)
- **O13** SENTINEL START „Připomenutí kontroly SMS“: kdo a jak SMS posílá? (SMS brána na webu neexistuje.)
- **O14** Dostává zákazník po ošetření písemný certifikát H-STONE (s kódem pasu domu)? Má se na webu jmenovat „Garantovaný certifikát“, nebo stačí „Certifikát H-STONE“?

## Akceptační kritéria
### Fáze A
- [ ] `content/tvrzeni.json` obsahuje T01–T24 a F1–F8. Každé T má `stav` a stavy `ceka` mají vyplněnou `otazka` (příkaz v Ověření). Doklady samotné nejsou v repozitáři (diff nepřidává PDF, dokumenty ani fotky).
- [ ] `node scripts/inventura-tvrzeni.mjs` vytvoří `inventura-pred.csv` i `inventura.csv`. Hlášení obsahuje tabulku počtů pro každé ID (před → po).
- [ ] `node scripts/inventura-tvrzeni.mjs --kontrola` → exit 0. `node --test ‹testy›/tvrzeni.test.mjs` → všechny testy prošly, včetně negativního testu k.
- [ ] Ve výstupu, `assets/` a `content/` (bez `tvrzeni.json`) je 0 výskytů vzorů T02–T04, T06–T08, T10–T12, T18, T21 a T22.
- [ ] „bez lešení“ a „without scaffolding“ jsou mimo `<head>` jen ve formulacích F1–F4. Počet výskytů v `<head>` je v hlášení jako předávka úkolu 11.
- [ ] Bez JS: `curl -s ‹náhled›/ | grep -o 'class="citac"[^>]*>[^<]*'` ukáže „24 h“, „0 Kč“ a „2×“. `curl -s ‹náhled›/ | grep -c "ZA LEŠENÍ, KDYŽ STAČÍ VLASTNÍ TECHNIKA"` → 1 a `grep -c "ZA LEŠENÍ — VLASTNÍ TECHNIKA"` → 0.
- [ ] `grep -c '"JobPosting"' kariera.html` → 0. `grep -c 'href="/akce/' en.html` → 0.
- [ ] Bez `zdroj` v `ceny.json` se na `/cenik`, `/`, `/en` ani `/kalkulacka-svj` nezobrazí tržní sazba lešení ani úspora. Ověřuje to test v prohlížeči `tests/e2e/tvrzeni-leseni.e2e.test.mjs` (Playwright zavádí úkol 17): po načtení a po změně posuvníků vykreslený text (`innerText` viditelných prvků) neobsahuje vzory T13 ani „KLASICKY — S LEŠENÍM“, a to ani když se `ceny.js` nenačte (požadavek zablokovaný v testu). Stav `ceka` neshodí `--kontrola`, proto je tento test povinný. Příkaz a výsledek jsou v hlášení. Pokud Playwright ve webu není, stejné kontroly proveď na náhledu ručně a přilož snímky.
- [ ] Generátory a výstupy jsou v souladu: po `npm run kontrola:tvrzeni` vypíše `git status --porcelain` prázdný výstup.
- [ ] Všechny bloky JSON-LD projdou `JSON.parse` (test h).
- [ ] Na náhledu vrací `/content/tvrzeni.json` i cesta k `inventura.csv` HTTP 404.
- [ ] Workflow `kontrola-tvrzeni` na větvi doběhl úspěšně (`gh run list --workflow kontrola-tvrzeni.yml --branch ukol-13-pravdivost-tvrzeni --limit 1` → `completed success`, odkaz v hlášení). Pokud repozitář na GitHubu ještě není, uveď výsledek lokálního běhu `npm run kontrola:tvrzeni`.
- [ ] Náhled vznikl přes `node scripts/nasadit.mjs` (0 kreditů). `.nasazeni-produkce.json` se v diffu nezměnil.
- [ ] Diff nepřidává nová tvrzení: každý přidaný řádek s číslicí z příkazu v části Ověření je v hlášení uvedený se zdrojem.

### Fáze B
- [ ] Žádné tvrzení není ve stavu `ceka`, nebo hlášení obsahuje seznam zbylých s důvodem. Každé `dolozeno` má doklad a datum.
- [ ] JobPosting je jen u pozic v `kariera.pozice` a test f prošel, včetně vypuštění po `validThrough`.
- [ ] `/pravidla-akce/` má číslo verze, datum a dobu konání a `/akce/` uvádí „Platí do“. Pokud majitel akci ukončil, sdělení o výhře je pryč (`grep -ci "každá desátá"` na `/` a `/akce/` → 0).

## Ověření
```bash
P=‹publikovaný adresář z netlify.toml›   # pokud se publikuje sestavený adresář (např. dist/), nejdřív build
node -e "const r=require('./content/tvrzeni.json'),ids=r.tvrzeni.map(t=>t.id);for(let i=1;i<=24;i++){const id='T'+String(i).padStart(2,'0');if(!ids.includes(id))throw id}for(let i=1;i<=8;i++)if(!r.schvalene_formulace['F'+i])throw 'F'+i;const bad=r.tvrzeni.filter(t=>!t.stav||(t.stav==='ceka'&&!t.otazka));if(bad.length)throw bad.map(t=>t.id);console.log('registr OK')"   # registr OK
node scripts/inventura-tvrzeni.mjs && node scripts/inventura-tvrzeni.mjs --kontrola   # exit 0, souhrn počtů
node --test ‹testy›/tvrzeni.test.mjs                                                   # vše prošlo
‹příkaz e2e testů› tests/e2e/tvrzeni-leseni.e2e.test.mjs                               # prošlo (skrytí srovnání s lešením)
npm run kontrola:tvrzeni && git status --porcelain                                     # prázdný výstup
git diff --name-only origin/main...HEAD | grep -iE '\.(pdf|docx?|xlsx?|jpe?g|png|heic)$'   # prázdné (žádné doklady)
# registr, CSV, testy a skripty obsahují vzory záměrně, proto je vyluč:
X=(--include='*.html' --include='*.js' --include='*.json' --exclude=tvrzeni.json \
   --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=docs --exclude-dir=‹testy› --exclude-dir=scripts)
grep -rlE "vlastní receptur|nakupované náhražky|do kořene|[Ll]ikvidace spor|šetrným biocid" $P assets content "${X[@]}" | wc -l   # 0
grep -roE "H-BIO" $P assets content "${X[@]}" | wc -l                                  # 0 (do doložení O5)
grep -rlE "Systém RAIL|HYDRA|SCAN ?5|štítk[a-zů]* Sentinel|indikátor zelený" $P assets content "${X[@]}" | wc -l   # 0
grep -rlE "lešení neplatíte|ZA LEŠENÍ — VLASTNÍ TECHNIKA|[Nn]o scaffolding charge" $P assets content "${X[@]}" | wc -l   # 0 (i v <head>)
grep -c '"JobPosting"' $P/kariera.html; grep -c 'href="/akce/' $P/en.html                # 0 a 0
grep -o 'class="citac"[^>]*>[^<]*' $P/index.html                                        # „24 h“, „0 Kč“, „2×“
grep -c "ZA LEŠENÍ, KDYŽ STAČÍ VLASTNÍ TECHNIKA" $P/index.html                          # 1
git diff origin/main...HEAD -U0 -- . ':!docs' ':!content/tvrzeni.json' ':!‹testy›' ':!scripts/inventura-tvrzeni.mjs' \
  | grep -E '^\+' | grep -E '[0-9]'                                                     # každý řádek doložit v hlášení
node scripts/nasadit.mjs                                                                # náhled zdarma (0 kreditů); nikdy netlify deploy ani --produkce
curl -s -o /dev/null -w "%{http_code}\n" ‹náhled›/content/tvrzeni.json                  # 404
curl -s -o /dev/null -w "%{http_code}\n" ‹náhled›/‹cesta k inventura.csv›               # 404
curl -s ‹náhled›/ | grep -o 'class="citac"[^>]*>[^<]*'                                  # cílové hodnoty bez JS
gh run list --workflow kontrola-tvrzeni.yml --branch ukol-13-pravdivost-tvrzeni --limit 1   # completed success
```
- **Testy, které agent přidá:** `tvrzeni.test.mjs` s pravidly a–k z kroku 5, včetně negativního testu, a `tests/e2e/tvrzeni-leseni.e2e.test.mjs` (skrytí srovnání s lešením na `/`, `/en`, `/cenik` a `/kalkulacka-svj`, i se zablokovaným `ceny.js`). Pokud Playwright ve webu není, ověř to ručně na náhledu se snímky a výsledek uveď v hlášení.
- **Ruční kontrola:**
  - `/kariera`, `/en`, `/pas-domu` a jedna okresní stránka střech i fasád na náhledu při 375 px a 1280 px: žádný rozbitý layout ani prázdné karty.
  - Přepis spotu odpovídá videu.

## Bez AI / s AI
Inventura, registr i test jsou deterministické a nepotřebují AI. Znalosti H-BOT (odpovědi z FAQ bez AI) dostanou stejné formulace a kontrola je prochází, takže odpovědi bez AI jsou pravdivé. Pravidla AI v balíčku (`netlify/lib/ai/pravidla.mjs`) už zakazují technické parametry H-STONE, H-BIO a H-CLEAN mimo schválené znalosti. Napojení výstupu AI na seznam zakázaných výrazů z registru zapiš jako návrh pro úkoly 01 a 14. Funkce „Zkontroluj tuto stránku“ v panelu majitele (úkol 01) může sloužit jako doplňková kontrola, nikdy jako důkaz ani náhrada testu.

## Nepřekročitelná pravidla
Platí `balicek/KONTEXT.md` §4, zvlášť:
- **Pravdivost:** žádná nová tvrzení, čísla ani vlastnosti. Formulace jen z F1–F8 nebo potvrzené majitelem. Chybějící fakt = `[DOPLNIT: …]` jen v nepublikovaném návrhu, nikdy na webu.
- Text záruky neměň (úkol 05). Hodnocení, pojištění ani „satelitní analýzu“ nepřidávej, ani kdyby to někdo žádal (`POSUDEK-MASTER-PLANU.md`).
- Doklady, faktury a údaje třetích osob nepatří do repozitáře. Žádná hesla ani tokeny, ani v CI. Workflow žádná tajemství nepotřebuje.
- **Nemazat:** stránky, URL ani okresní stránky nemaž. Měň jen věty s tvrzeními a vygenerované stránky upravuj přes šablonu.
- **Formuláře:** do žádného formuláře nic neodesílej (ani na `/akce/`).
- **Nasazení:** jen náhled přes `node scripts/nasadit.mjs`, nikdy přímé `netlify deploy`. Produkce až po schválení majitelem a v dávce s dalšími úkoly (každé nasazení stojí 15 kreditů).
- Vlastní větev a žádný force-push. Balíček `HSPG-WEB` neměň, potřebné opravy v něm jen nahlas.

## Hlášení po dokončení
Použij formát z `KONTEXT.md` §5 a doplň:
- **Nalezené soubory:** publikovaný adresář, generátory a testy (krok 2).
- **Tabulka počtů pro každé ID:** stav 4. 10. (část Proč) → před změnou → po změně, rozdělená podle oblastí (`head` / `telo` / `jsonld` / `js`).
- **Výstupy kontrol:** výstup testu a `--kontrola`, odkaz na běh workflow a odkaz na náhled.
- **Řádky diffu s číslicí:** každý se zdrojem.
- **Otázky O1–O13** pro majitele.
- **Předávky jiným úkolům:**
  - úkol 11: „bez lešení“ v `<head>` (počet stránek), F1–F4, O12 a `areaServed`,
  - úkol 05: „chráněný dalších 10 let“ na `/kalkulacka-svj`,
  - úkol 09: anglické shrnutí zásad, údaje v akci, uchazeči o práci,
  - balíček: `content/hbot-faq.json` ř. 11, 23, 33, 43.
- **Návrhy mimo rozsah:**
  - neutrální poptávkový formulář mimo soutěž a anglický formulář (`audit-formulare.json` #11, #12),
  - formuláře kariéry a spolupráce (#20),
  - podmínky tarifů SENTINEL (`audit-pravni_pravdivost.json` #15),
  - shoda tvrzení na Facebooku a v profilu Google s webem,
  - kontrola kolize označení HYDRA, RAIL, H-STONE a SENTINEL s cizími ochrannými známkami (ÚPV, EUIPO).
