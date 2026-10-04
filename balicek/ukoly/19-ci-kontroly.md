# Úkol 19: CI – automatické kontroly před sloučením (a provoz formulářů)
> Priorita P1 · Závisí na: 00 (soukromý repozitář webu na GitHubu, `scripts/nasadit.mjs`) a 07 fáze B (build do `dist/`, `publish = "dist"`, `lighthouserc*.json`). Kontroly přebírá z úkolů, které jsou podle `PORADI.md` sloučené dřív (01, 02, 03, 05, 07, 13, 16, 17 a další). Co v `main` chybí, nahlas · Čeká na majitele: doba uchování poptávek (úkol 09, O1), místo pro zálohy exportu formulářů, rozhodnutí o GitHub Pro (bez něj nejde u soukromého repozitáře nastavit ochranu větve `main`), nastavení ochrany větve, potvrzení, že 8 dosavadních podání jsou testy · Rozsah: **fáze A** (podle potřeby dvě sezení A1/A2, viz Postup) = GitHub Actions jen s kontrolami (nikdy nasazení), kontroly výstupu, e2e, Lighthouse, gitleaks, brána před sloučením → hlášení a stop; **fáze B** = skript pro výpis, export a mazání podání Netlify Forms (výchozí `--nasucho`), týdenní záloha mimo Netlify, ověření formuláře `hspg-fotky` → hlášení.

## Proč (s důkazy)
Zdroje: `audit-nasazeni_provoz.json` #5 (chybí CI), #13 (doba uchování bez postupu mazání, zálohy formulářů), #19 (sitemap ručně), #20 (formulář `hspg-fotky`), #23 (chybí strojová kontrola tvrzení) a `audit-formulare.json` #21. Ověřeno 4. 10. 2026 na kopii živého webu (247 HTML) a dotazy GET na https://hspg.cz. Čísla řádků platí pro publikované HTML, ve zdroji se mohou lišit.

**Žádná automatická kontrola.** V repozitáři balíčku `HSPG-WEB` není `.github/workflows`. Ve webHSPGH stav ověř ve zdroji (úkol 13 tam mohl přidat `kontrola-tvrzeni.yml`). Testy zatím existují jen jako ruční příkazy v zadáních. Chyba se tak pozná až na produkci a každé opravné produkční nasazení stojí 15 kreditů. Podle KONTEXT §2 spotřebovalo 32 produkčních nasazení 480 kreditů a po vyčerpání kreditů Netlify pozastaví celý web.

**Výchozí stav, který CI musí udržet nebo zlepšit:**

| Kontrola | Stav 4. 10. 2026 | Poznámka |
|---|---|---|
| html-validate 11.16 s presetem `html-validate:standard` bez 6 stylistických pravidel (`attr-quotes`, `no-inline-style`, `doctype-style`, `tel-non-breaking`, `no-trailing-whitespace`, `void-style`) | **6 chyb ve 2 souborech:** na `/` `aria-label-misuse` (ř. 1218, 1269, 1379, 1400) a `valid-autocomplete` (ř. 1775, `autocomplete="street-address"` na `<input type="text">` `#rz-adresa`); na `/kalkulacka-svj` `aria-labelledby` na `div.odklad` (ř. 275). `/akce/dekujeme/` má 0 chyb. | ARIA opravuje úkol 16 (B4 a `.odklad`). S výchozí sadou `recommended` je zpráv 3 985 (`tel-non-breaking` 2 404, `attr-quotes` 818 …). Bez vypnutí stylistiky by CI byla trvale červená. Konfiguraci předávej přes `--config`. U souborů mimo složku s konfigurací ji html-validate jinak nenajde (ověřeno). |
| JSON-LD | 479 bloků ve 247 souborech, 0 chyb parsování. Typy: BreadcrumbList 241, Service 236, HomeAndConstructionBusiness 2, JobPosting 3, VideoObject 1, FAQPage 1. AggregateRating, Review ani `ratingValue` nikde. | JobPosting na `/kariera` obsahuje jen `title`, `description`, `datePosted`, `hiringOrganization`, `jobLocation` a `directApply`, chybí `validThrough` a `employmentType`. Odstraňuje je úkol 13. |
| Šablonové značky | `${` ani `{{` nejsou mimo `<script>`/`<style>` (0× ve 247 souborech), v JSON-LD ani v publikovaných `*.json`. Uvnitř spustitelných skriptů jsou 34× ve 3 souborech (`/`, `/kalkulacka-svj.html`, `/pas-domu.html`). | Výskyty ve skriptech jsou legitimní JS (úkol 17, krok 11). Kontrola je nesmí počítat, JSON-LD ale kontrolovat musí. |
| Odkazy | linkinator 8.1 (`--clean-urls --check-fragments`, jen lokální odkazy) nad kopií a `/akce/dekujeme/`: 561 různých odkazů, 558 OK. Zbylé 3 vyšly jako rozbité jen proto, že soubory v kopii chybí (`/assets/fotky-upload.js`, `/assets/nabidka-pdf.js`, `/assets/nabidka-pdf.css`), na živém webu vrací 200. Audit z prohlížeče: 0 rozbitých odkazů z 255 URL (KONTEXT §2). | Glob se zadává relativně k pracovní složce. Absolutní glob vrátil 0 souborů (ověřeno). |
| Sitemap | 245× `<loc>`, což je přesně množina kanonických URL všech stránek bez `noindex` (z 247 stránek mají `noindex` jen `/recenze/` a `/reference.html`). `/akce/dekujeme/` (`noindex`) v sitemap není. `lastmod` je ruční: 232× 2026-09-29, 10× 2026-09-12, 2× 2026-09-27, 1× 2026-10-03. | Generátor a `lastmod` dělá úkol 06, tady jen kontrola. |
| Formuláře | Statické registrační formuláře: `hspg-poptavka` a `hspg-zavolejte` (`/`, skryté), `hspg-akce` (`/akce/`), `hspg-recenze` (`/recenze/`) a `hspg-fotky` (`/akce/dekujeme/`, v kopii chybí). V publikovaném HTML formuláře nemají atribut `data-netlify`. Netlify ho nejspíš odstraňuje při zpracování, ověř ve zdroji. | Viz odstavec níže. |
| Interní soubory | `/package.json`, `/CLAUDE.md`, `/netlify.toml`, `/content/firma.json`, `/scripts/build-hbot.mjs` → 404 | Hlídat, aby to tak zůstalo. |
| Build | Živý `sw.js`: „VERSION is stamped with a build id by scripts/build-site.mjs in dist/sw.js“. Web tedy nejspíš staví do `dist/` (ověř ve zdroji). | CI kontroluje výstup buildu, ne zdroj. |

**`hspg-fotky` není osiřelý, audit #20 neplatí.** Audit formulář hledal jen v kopii webu. Ta stránku `/akce/dekujeme/` neobsahuje, protože stránka není v sitemap, má `noindex` a otevře se až po odeslání poptávky. GET 4. 10. ukazuje na `/akce/dekujeme/` ř. 73 `<form action='/akce/dekujeme/' enctype='multipart/form-data' id='fotky-form' method='POST' name='hspg-fotky' novalidate>` a skript `/assets/fotky-upload.js` s hlavičkou „Thank-you page: attach photos to the enquiry (Netlify form "hspg-fotky")“. Úkoly 02, 09 a 10 s formulářem už počítají. **Ponaučení pro CI:** kontroly musí procházet všechny publikované HTML, ne jen sitemap. Registraci formuláře v Netlify nemaž.

**Kontrola tvrzení zatím jen čeká na spuštění** (#23). Úkol 05 přináší `build-zaruka.mjs --kontrola` a pravidlo, že „15 let“ není nikde. Úkol 13 přináší `npm run kontrola:tvrzeni` s výrazy T21: AggregateRating, „4,9/5“, pojištění, superlativy, „až X % úspor“. Bez CI je ale nikdo nespustí automaticky. Záruka 10 let je potvrzená (R1). Kontrola hlídá, aby text záruky byl jen z centrálního zdroje.

**Doba uchování nemá postup** (#13, formuláře #21). Zásady (čl. 4) uvádějí: „Poptávky 12 měsíců … Poté údaje mažeme.“ Mazání ani záloha podání v Netlify Forms neexistují. O době (12 měsíců, nebo 3 roky) rozhoduje majitel (KONTEXT §3, úkol 09 O1). Podle auditu vznikly formuláře `hspg-poptavka` a `hspg-akce` 12. 9. 2026, takže lhůta 12 měsíců uplyne poprvé 12. 9. 2027. Na přípravu postupu je čas.

**Omezení platforem** (dokumentace GitHubu a Netlify, 4. 10. 2026):
- **GitHub:**
  - Chráněné větve v soukromém repozitáři má osobní účet až s GitHub Pro, Free je nemá.
  - Povinné kontroly propustí stav `success`, `skipped` i `neutral`.
  - Actions pro soukromé repozitáře: 2 000 minut měsíčně (Free), 3 000 (Pro). Bez platební metody se Actions po vyčerpání minut zastaví a nic se nedoúčtuje.
- **Netlify:**
  - Osobní přístupový token nejde omezit jen na formuláře, jde mu jen nastavit platnost. Token v GitHubu by tedy znamenal plný přístup k účtu včetně produkčních nasazení (kredity). Proto **CI žádný token Netlify nedostane** a skript formulářů (fáze B) běží jen na počítači majitele přes přihlášené Netlify CLI.
  - API: `GET /api/v1/sites/{site_id}/forms`, `GET /api/v1/forms/{form_id}/submissions`, `DELETE /api/v1/submissions/{submission_id}`, stránkování `page`/`per_page` (nejvýš 100 na stránku).
  - Nahrané soubory zůstávají po smazání formuláře dostupné ještě 24 h (cache).

## Cíl (měřitelný)
1. Každý pull request do `main` a každý push do `main` spustí workflow `kontroly` v GitHub Actions. Workflow jen kontroluje. **Nikdy nenasazuje**, nemá žádné tajemství a nevolá produkci ani skutečnou AI. Hlídá to test workflow.
2. Workflow selže, když PR udělá cokoli z tohoto:
   - rozbije JSON-LD,
   - odstraní statický formulář,
   - překryje hlavní výzvu,
   - přidá „15 let“ nebo zakázané tvrzení,
   - rozbije interní odkaz nebo kotvu,
   - přidá novou chybu HTML,
   - dá do sitemap stránku s `noindex`,
   - nechá generovaný výstup neaktuální,
   - obsahuje tajemství.

   Prokáže to negativní PR, který se nikdy nesloučí.
3. Na aktuálním `main` jsou všechny joby zelené. Běh PR trvá nejvýš 20 min (cíl 15 min). Odhad měsíční spotřeby je s rezervou pod 2 000 minut.
4. Do `main` jde jen větev, jejíž poslední commit má zelený běh. Pokud má majitel GitHub Pro, zajistí to technicky ochrana větve. Jinak brána `node scripts/ci/pred-sloucenim.mjs` a pravidlo v `CLAUDE.md`.
5. Fáze B: `node scripts/formulare.mjs` umí `seznam`, `export` a `promaz` (výchozí `--nasucho`). Mazání nejde spustit bez rozhodnuté doby uchování, bez čerstvého exportu a bez schválení majitele. Export končí mimo repozitář i mimo CI. Postup týdenní zálohy popisuje `docs/provoz-formulare.md`.

## Rozsah
**ANO:**
- `.github/workflows/kontroly.yml` (včetně převzetí případného `kontrola-tvrzeni.yml` z úkolu 13) a šablona PR
- statické kontroly výstupu:
  - html-validate se základní linií
  - JSON-LD (syntaxe a povinná pole)
  - šablonové značky v datech
  - registr formulářů
  - konzistence sitemap
  - zákaz `noindex` pro celý web
  - žádné interní soubory ve výstupu
- kontrola odkazů (linkinator) nad lokálně servírovaným výstupem
- e2e testy:
  - převzetí testů asistenta z balíčku do webu (server servíruje výstup webu, AI jsou falešné)
  - smoke testy stránek ve 3 šířkách
  - zařazení e2e testů ostatních úkolů
- spouštění Lighthouse CI z úkolu 07, gitleaks a `--kontrola` všech generátorů
- brána před sloučením, `npm run ci:lokalne`, `docs/ci.md`, sekce v `CLAUDE.md` a návod pro majitele na ochranu větve
- fáze B:
  - skript pro Netlify Forms a jeho testy s falešným API
  - `docs/provoz-formulare.md` a `.gitignore` pro exporty
  - ověření `hspg-fotky`

**NE (patří jinam, zapiš jen do hlášení):**
- opravy chyb HTML, ARIA a formulářů → úkol **16** (ARIA), **17** (formuláře, `autocomplete`), **04** (`/reklamace/`); tady se jen zapíšou do základní linie
- generátor sitemap, `lastmod`, přesměrování a podoba adres → **06**; tady jen kontrola
- obsah a struktura JSON-LD (LocalBusiness, `areaServed`, JobPosting) → **11** a **13**; tady jen syntaxe a povinná pole
- seznam zakázaných výrazů a registr tvrzení → **13**, text záruky → **05**; tady se jejich kontroly jen spouštějí
- rozpočty a cíle výkonu, `lighthouserc*.json` → **07**; tady se jen spouštějí v CI
- monitoring, týdenní provozní kontrola, hlavičky a CSP, uptime, DNS → **15**. Ten do CI později přidá `build-hlavicky.mjs --kontrola` a plánovaný běh `provoz-tyden.mjs --verejne`.
- text zásad a doby uchování v zásadách → **09**; tady jen skript, který doby čte z `content/zpracovani.json`
- jakékoli nasazení (náhled i produkce), napojení Netlify na Git, nové tokeny Netlify nebo AI, změny DNS
- mazání formuláře `hspg-fotky` nebo jiné registrace v Netlify, mazání podání bez schválení majitele, mazání e-mailových kopií poptávek (dělá je majitel ručně)

## Postup

### Fáze A – kontroly před sloučením
1. **Větev `ukol-19-ci-kontroly` z aktuální `main`** (`git fetch`, `git switch main`, `git pull --ff-only`, `git switch -c ukol-19-ci-kontroly`).
   - Ověř, že `origin` je soukromý repozitář z úkolu 00 (`gh repo view --json visibility` → `PRIVATE`). Jinak se zastav.
   - Zapiš `git log --oneline -40` a podle commitů vypiš, které úkoly už jsou v `main`.
   - Stáhni nebo aktualizuj balíček: `git -C ../hspg-balicek pull` (případně `git clone` podle úkolu 01).
2. **Najdi v repozitáři soubory, které generují publikovaný výstup, a existující kontroly.** Výsledek zapiš do hlášení.
   - **Build:** `netlify.toml` → `[build] command` a `publish`. Podle živého `sw.js` jde pravděpodobně o `npm run build` → `dist/` přes `scripts/build-site.mjs`. Dále verze Node (`NODE_VERSION`, `.nvmrc`, `engines`), `package.json` a `package-lock.json`.
     - Pokud `publish` chybí nebo je `.` (úkol 07 fáze B ještě nezavedl `dist/`), výstup nejde oddělit od interních souborů (kontrola 6f by trvale selhávala na `package.json`). Zastav se a nahlas, že úkol 19 čeká na sloučení úkolu 07 fáze B.
   - **Generátory a jejich `--kontrola`:** všechny `scripts/build-*.mjs`, například:
     - `build-hbot` (úkol 01), `build-kontakty` (03), `build-zaruka` (05)
     - `build-otisky` a `kontrola-media` (07), `build-layout` (08), `build-zasady` (09), `build-souhlas` (10)
     - `build-regions`, `build-ceny`, generátor sitemap (06)
     - dále `scripts/inventura-tvrzeni.mjs` (13)
   - **Formuláře:**
     - stránky s formuláři: `index.html`, `akce/index.html`, `akce/dekujeme/index.html`, `recenze/index.html`, případně `reklamace/` z úkolu 04
     - skripty s `form-name`: `git grep -n "form-name"`
     - mapa `smerovani_formularu` a štítky formulářů (úkol 02) v `content/firma.json`
   - **Testy:**
     - `tests/**`; rozděl je na testy bez prohlížeče a testy s Playwrightem (`git grep -l "playwright" -- tests/`)
     - npm skripty `test`, `test:e2e`, `test:a11y:rychle` (16), `kontrola:tvrzeni` (13) a `vykon` (07)
     - `lighthouserc*.json`
     - Playwright a `axe-core` v `devDependencies`
   - **Ostatní:**
     - existující `.github/` (workflow z úkolu 13, šablony), `.gitleaks.toml`, `.gitleaksignore`, `CLAUDE.md`
     - adresář funkcí (`netlify.toml` → `[functions] directory`) a soubory asistenta z úkolu 01 (`asistent.mjs`, `majitel.mjs`, `ai.mjs`, `ai-stav.mjs`, `netlify/lib/ai/*`)
     - jak se dnes slučuje do `main` (lokální merge a push, nebo PR přes `gh`)

   Generované HTML nikdy neopravuj ručně. CI kontroluje výstup buildu.
3. **Lokální běh jako první.** Přidej `npm run ci:lokalne` (`scripts/ci/lokalne.mjs`).
   - Skript spustí stejné kroky ve stejném pořadí jako CI (kroky 4–11) a na konci vypíše tabulku „krok → výsledek → čas“.
   - Chybějící nástroj (např. gitleaks) vypíše jako výrazné varování, nikdy ho tiše nepřeskočí.
   - Nastaví stejné proměnné jako CI (`BEZ_SNIMKU=1`, `A11Y_RYCHLE=1`). Krok 4 vyžaduje čistý pracovní strom, proto skript na začátku při neprázdném `git status --porcelain` skončí s hláškou „nejdřív commitni nebo odlož změny“.
   - Všechno, co dělá CI, musí jít spustit lokálně bez tajemství a bez sítě. Výjimkou je jen instalace balíčků.
4. **Build a generátory:** `scripts/ci/generatory.mjs` (npm `kontrola:generatory`).
   - Spustí build (`npm run build`, pokud existuje) a potom výslovný seznam příkazů `--kontrola` z kroku 2. Seznam je pole v souboru. Chybějící skript ze seznamu je chyba, ne důvod k přeskočení. Úkoly 15, 14 a 12 seznam později rozšíří.
   - Na závěr musí `git status --porcelain` vrátit prázdný výstup, tedy commitnuté výstupy odpovídají generátorům. `dist/` a další výstupy buildu patří do `.gitignore`.
   - **Brány pro produkci nespouštěj.** `build-zasady.mjs --brana` (úkol 09) selže, dokud zásady obsahují `[DOPLNIT`. To je v pořádku, ale do CI to nepatří. Zapiš to do `docs/ci.md`.
5. **Testy a tvrzení:**
   - jednotkové testy webu ze všech úkolů. Job `staticke` nemá prohlížeč, ale `npm test` podle úkolu 07 spouští i Playwright testy `tests/vykon/` (včetně snímků `vzhled.test.mjs`). Přidej proto npm skript `test:bez-prohlizece`: všechny `tests/**/*.test.mjs` bez Playwrightu, kromě `tests/ci/vystup.test.mjs` (ten spouští `kontrola:vystup`) a `tests/e2e/**`. Testy s Playwrightem patří do `test:e2e:ci` (krok 9). `npm test` neměň. Každý testovací soubor běží v CI právě jednou. Seznam souborů v obou skupinách dej do hlášení.
   - `npm run kontrola:tvrzeni` (13)
   - `node scripts/build-hbot.mjs --kontrola` (01), pokud ho nespouští už krok 4
   - testy záruky (05)

   Pokud skript chybí, protože úkol ještě není v `main`, zapiš to do hlášení.
6. **Kontroly výstupu:** `tests/ci/vystup.test.mjs` (`node:test`, bez závislostí), npm skript `kontrola:vystup` = `node --test tests/ci/vystup.test.mjs`. Publikační adresář čte z `netlify.toml`, přepsat ho jde proměnnou `HSPG_PUB`. Prochází **všechny** `*.html` a `*.json` v publikačním adresáři, ne sitemap. Před napsáním každé kontroly ověř `git grep`em, zda ji už nemá test jiného úkolu (02 registr formulářů, 05 záruka, 06 `tests/sitemap.test.mjs` a `tests/adresy.test.mjs`, 11 JSON-LD, 13 `[DOPLNIT`, 17 `tests/vystup.test.mjs` s `${` mimo skripty). Pokud ano, kontrolu nepřidávej, jen zajisti, že běží v CI.

   a) **JSON-LD:** každý `<script type="application/ld+json">` jde parsovat, `@context` je `https://schema.org` a každý uzel nejvyšší úrovně (i položka `@graph`) má `@type`. Vnořený odkaz na uzel (objekt jen s `@id`, případně s `@type`, např. `provider` → `https://hspg.cz/#firma` z úkolu 11) je povolený, pokud se jeho `@id` rovná `@id` plného uzlu někde ve výstupu. Povinná pole platí pro plné uzly. Povinná pole podle typu:

      | Typ | Povinné |
      |---|---|
      | BreadcrumbList | neprázdné `itemListElement`; `position` 1…n bez mezer; `name` u všech položek; `item` u všech kromě poslední; absolutní `https://hspg.cz/…` |
      | HomeAndConstructionBusiness / LocalBusiness | `name`, `url`, `telephone` shodný s telefonem v `content/firma.json`, `address` (`streetAddress`, `addressLocality`, `postalCode`, `addressCountry`) |
      | Service | `name`, `provider` |
      | FAQPage | `mainEntity` s položkami `Question`, které mají `name` a `acceptedAnswer.text` |
      | VideoObject | `name`, `thumbnailUrl`, `uploadDate` |
      | JobPosting | jen pokud ho povoluje registr `content/tvrzeni.json` (13); potom `title`, `description`, `datePosted`, `validThrough`, `employmentType`, `hiringOrganization`, `jobLocation` |
      | AggregateRating, Review, `ratingValue`, `reviewCount` | **selhání**, dokud registr tvrzení (13, T21) výslovně nepovolí hodnocení se zdrojem ve skutečných recenzích; potom se čísla musí rovnat zdroji |

      Dnešní stav kontrolou projde (ověřeno nad kopií), kromě JobPosting, které odstraňuje úkol 13. Telefon porovnávej po odstranění mezer (`+420736618486`).

   b) **Šablonové značky:** `${` ani `{{` se nesmí objevit ve viditelném HTML (mimo **spustitelné** `<script>` a mimo `<style>`), v JSON-LD ani v publikovaných `*.json`. Definice odpovídá úkolu 17 (34 výskytů v JS je správných). Pokud test úkolu 17 existuje, jen ho rozšiř o JSON-LD a `*.json`.

   c) **Registr formulářů Netlify Forms:**
      - Ke každému jménu formuláře, které posílá JS (`form-name` v `assets/*.js` a v inline skriptech), existuje ve výstupu statický `<form name="…">` s atributem pro Netlify (`data-netlify="true"` nebo `netlify`). Jak ho zapisuje zdroj, ověř. Na živém webu atribut chybí.
      - Každý statický formulář má záznam v `content/firma.json` → `smerovani_formularu` (a štítek z úkolu 02).
      - Záznam bez formuláře na webu (v balíčku `hspg-spoluprace`, `hspg-podpora`) jen vypiš jako varování.
      - Dnes musí kontrola najít `hspg-poptavka`, `hspg-zavolejte`, `hspg-akce`, `hspg-recenze` a `hspg-fotky`, k tomu `hspg-reklamace`, pokud je sloučený úkol 04.
      - Pokud totéž kontroluje test úkolu 02, kontrolu nepřidávej.

   d) **Sitemap:**
      - platné XML bez duplicit,
      - každá `<loc>` vede na existující soubor výstupu (čisté URL jako na Netlify),
      - množina `<loc>` se rovná kanonickým URL stránek bez `noindex` (meta i pravidla `X-Robots-Tag` v `netlify.toml`/`_headers`),
      - `lastmod` má tvar `RRRR-MM-DD` a není v budoucnosti.

      Generátor z úkolu 06, pokud existuje, kontroluje svou `--kontrola` v kroku 4.

   e) **Indexace:**
      - V `netlify.toml` ani `_headers` není `X-Robots-Tag` s `noindex` pro `/*` nebo `/`. Audit #6 našel takové pravidlo v historii repozitáře `HSPG-WEB` (commit `84d8e90`, `netlify.toml`). Kdyby se dostalo do webu, vyřadilo by celý web z vyhledávačů.
      - `robots.txt` neobsahuje samotné `Disallow: /`.
      - Až úkol 15 zavede generátor hlaviček, jeho `--kontrola` tuto kontrolu nahradí. Pak ji odstraň.

   f) **Interní soubory:** ve výstupu nesmí být `package.json`, `package-lock.json`, `netlify.toml`, `CLAUDE.md`, `*.md`, `content/`, `scripts/`, `tests/`, `docs/`, `.github/`, `node_modules/`, `lighthouserc*.json`, `.nasazeni-produkce.json`, `.provoz/` ani soubory exportu formulářů (fáze B).
7. **Validace HTML:** `npm run kontrola:html` (`scripts/ci/html-validate.mjs`).
   - `html-validate` s pinovanou verzí v `devDependencies`.
   - `.htmlvalidate.json`: `"extends": ["html-validate:standard"]`, vypnutá jen pravidla `attr-quotes`, `no-inline-style`, `doctype-style`, `tel-non-breaking`, `no-trailing-whitespace` a `void-style`. Každé další vypnuté pravidlo zdůvodni v `docs/ci.md`.
   - Spouštěj CLI s `--config .htmlvalidate.json --formatter json` nad všemi HTML ve výstupu. Výsledek porovnej v Node se **základní linií** `tests/ci/html-validate-zaklad.json`: `[{ "soubor", "pravidlo", "pocet", "ukol", "duvod" }]`.
   - Kontrola selže při novém pravidle v souboru i při vyšším počtu. Selže i při nižším počtu, s hláškou „oprava – sniž `pocet` v základní linii“. Opravená chyba se tak nemůže tiše vrátit.
   - Do základní linie dej jen chyby, které v době úkolu na `main` zbývají, vždy s odpovědným úkolem. Po úkolu 16 očekávej jen `index.html` `valid-autocomplete` 1× (→ návrh pro 17). Pokud úkol 04 použil `autocomplete="street-address"` u `<input>`, přidej i tuto chybu (→ návrh pro 04). Sám nic neopravuj.
8. **Odkazy:** `npm run kontrola:odkazy`. Linkinator s pinovanou verzí se spouští **v publikačním adresáři**:
   `npx linkinator "**/*.html" --clean-urls --check-fragments --skip "^https?://(?!localhost|127\.0\.0\.1)" --skip "/\.netlify/" --skip "/api/"`
   - Vnější odkazy se v PR nekontrolují: výsledky nejsou stabilní, zatěžují cizí servery a změna v PR je neovlivní.
   - Ověř, že kontrola na aktuálním výstupu projde.
   - Negativním testem ověř, že selže rozbitý interní odkaz i neexistující kotva `#…`.

   > **Bod zastavení (A1/A2).** Fáze A je na jedno sezení velká. Pokud ji nestihneš, skonči po kroku 8 (**A1**): `npm run kontrola:generatory`, `test:bez-prohlizece`, `kontrola:vystup`, `kontrola:html` a `kontrola:odkazy` lokálně prošly. Commitni, pushni větev `ukol-19-ci-kontroly` (push do `ukol-*` CI nespouští, workflow ještě neexistuje) a podej průběžné hlášení. **A2** = kroky 9–16 ve stejné větvi v dalším sezení.

9. **E2E testy (Playwright, Chromium):** `npm run test:e2e:ci`.
   - **Testy asistenta z balíčku:**
     - Zkopíruj z `../hspg-balicek/balicek/testy/` soubory `server.mjs`, `pomocne.mjs`, `e2e/hbot.test.mjs` a `unit/*.test.mjs` do `tests/asistent/`. Do hlavičky každého souboru napiš „převzato z HSPG-WEB@<commit>, upraveny jen cesty“ (u souboru s upravenou asercí doplň „a aserce podle úkolu NN“).
     - Uprav jen importy, aby vedly na funkce a knihovnu **webu** (adresář funkcí z kroku 2, `netlify/lib/ai/`, `scripts/nasadit.mjs`).
     - Část, kterou web už převzal (např. oznámení z `znalosti-a-oznameni.test.mjs` v `tests/oznameni.test.mjs`, úkol 02), nepřebírej podruhé. Pokud převzatý test selže, protože pozdější úkol chování záměrně změnil (např. 02 oznámení, 09 filtr poskytovatelů v `poradi`), uprav aserci podle zadání toho úkolu a uveď v hlášení test, úkol a důvod. Jinak jde o chybu, nahlas ji a test neměň.
     - V `server.mjs` odeber servírování složky balíčku (`BALICEK`). Server pak servíruje jen publikační adresář webu (`HSPG_MIRROR` = výstup buildu), `/api/*` obsluhuje falešnými AI a POST na `/` ukládá jen do paměti. Testy tak ověřují kód, který se opravdu nasazuje.
     - Jednotkové testy přidej do `npm test` i `test:bez-prohlizece`, e2e do `test:e2e:ci`. V CI nenastavuj `CHROMIUM`, použije se prohlížeč Playwrightu.
   - **Smoke testy** `tests/e2e/smoke.e2e.test.mjs` (server z předchozího bodu v režimu `bez-ai`):
     - **Stránky:** `/`, ceník, `/akce/`, `/akce/dekujeme/`, `/recenze/`, jedna okresní stránka za každou službu (fasády, střechy, dlažby), `/kalkulacka-svj`, `/pas-domu`, `/nabidka-svj`, `/en`, `/ochrana-osobnich-udaju`, `/404.html` a stránky z úkolů 04 a 05 (`/reklamace/`, `/zaruka`), pokud existují. Adresy v kanonické podobě (canonical stránky, úkol 06).
     - **Šířky:** 375×812, 768×1024, 1280×800.
     - **Ověř:**
       - odpověď 200 (u 404 jen obsah stránky)
       - 0 `pageerror` a 0 `console.error`
       - právě jeden `<h1>`
       - žádný vodorovný posun (`scrollWidth ≤ clientWidth`)
       - hlavní výzvy jdou kliknout. Po volbě „Jen nezbytné“ v liště souhlasu (dnes `localStorage` `hspg-souhlas` = `nezbytne`, ověř v `assets/souhlas.js`; volba „přijmout“ by načetla GTM a jeho POST by test shodil) vrátí `document.elementFromPoint` ve středu prvku ten prvek nebo jeho potomka. Na mobilu se to týká položek spodní lišty `#hspg-lista` z úkolu 01. Na desktopu jde o `#hbot-btn` a na `/` o `#cta-main`. Tlačítko se u úvodní výzvy schovává, proto nejdřív posuň stránku (úkol 07). Selektory ověř ve zdroji.
     - **Síť:**
       - Vše mimo `127.0.0.1`/`localhost` se ruší (`context.route` → `abort`) a zapisuje do logu.
       - **Každý POST se ruší** a zapisuje do logu, protože smoke testy nic neodesílají.
       - Log `artefakty/e2e/zablokovane-pozadavky.json` je artefakt běhu: pole záznamů `{ "url", "metoda", "test" }` (bez těl požadavků). Smoke test selže, pokud log obsahuje POST.
   - **E2E ostatních úkolů** (02, 05, 07, 16, 17 …): zařaď všechny `tests/e2e/*.e2e.test.mjs`, k tomu `tests/e2e/formulare.test.mjs` (úkol 02, název bez `.e2e`) a Playwright testy `tests/vykon/*.test.mjs` (úkol 07). Přístupnost běží v rychlém režimu (`A11Y_RYCHLE=1`, `npm run test:a11y:rychle` z úkolu 16).
   - **Nikdy v CI:** `tests/e2e/ga4-zive.test.mjs` (úkol 10, volá náhled na Netlify, název záměrně bez `.e2e`).
   - **Testy snímků obrazovky** (úkol 07, `tests/vykon/vzhled.test.mjs`, a úkol 08, `tests/vizualni.mjs --kontrola`) v CI nespouštěj. Referenční snímky vznikly v jiném prostředí a písmo se na runneru vykresluje jinak, takže by vznikaly plané poplachy. Přeskoč je proměnnou (např. `BEZ_SNIMKU=1` v CI). Změnu v jejich souboru udělej co nejmenší a uveď ji v hlášení.
   - Žádný test nesmí volat https://hspg.cz ani skutečnou AI. V CI nejsou žádné klíče.
10. **Lighthouse CI:** spusť `npm run vykon` s konfigurací z úkolu 07. Rozpočty ani prahy neměň a soubory `lighthouserc*.json` neupravuj.
    - Pokud úkol 07 není dokončený (aserce `warn`), výkon jen varuje. Po úkolu 07 platí jeho `error`, včetně výkonu na mobilu ≥ 0,9.
    - Konfigurace úkolu 07 už má 5 běhů a `"aggregationMethod": "median-run"`. Pokud job `lighthouse` trvá déle než 15 min, sniž **jen v CI** počet běhů na 3 přepisem z prostředí nebo příkazové řádky (způsob ověř v dokumentaci LHCI, např. `--collect.numberOfRuns=3`) a uveď to v hlášení.
    - Kolísání ověř takto: když `lighthouse` v CI selže jen na `categories:performance`, spusť job na stejném commitu ještě 2× (`gh run rerun <id> --job <job-id>`). Pokud výsledek mezi běhy kolísá (aspoň jeden běh projde) a `npm run vykon` lokálně projde, přepni v CI **jen** `categories:performance` na `warn` (přepisem v CI, ne v souborech úkolu 07). Ostatní aserce (CLS, velikosti, přístupnost) nech na `error`. Změnu nahlas s odkazy na všechny 3 běhy. Pokud selhávají všechny 3 běhy, jde o skutečné zhoršení: nic nepřepínej a nahlas ho.
    - LHCI zapisuje reporty podle úkolu 07 do `.lhci-vystup/mobil` a `.lhci-vystup/desktop`. Jako artefakt nahraj `.lhci-vystup/`. Samotný `.lighthouseci/` nestačí, protože druhý `lhci collect` (desktop) výsledky mobilu v něm smaže.
11. **Gitleaks:** samostatný job nad celou historií (`fetch-depth: 0`).
    - Použij gitleaks z oficiálního vydání s pinovanou verzí: binárku s ověřeným kontrolním součtem, nebo oficiální kontejner. Od v8.19 se používá podpříkaz `git` (dříve `detect`), ověř přes `--help`.
    - Vždy spouštěj s `--redact`, aby se hodnoty neobjevily v logu.
    - Nálezy z historie, které nahlásil úkol 00 a majitel je vyřešil rotací, patří do `.gitleaksignore`. Zapisují se jen otisky, nikdy hodnoty, a jen s vědomím majitele. Uveď je v hlášení.
    - Negativní test dělej **lokálně** v dočasné složce mimo repozitář. Použij náhodně vygenerovaný řetězec ve tvaru, který pravidla gitleaks zachytí, a do Gitu ho necommituj.
12. **Workflow `.github/workflows/kontroly.yml`.** Kostra (SHA, verze a instalaci gitleaks doplň skutečné):
    ```yaml
    name: kontroly
    on:
      pull_request:
        branches: [main]
      push:
        branches: [main]
      workflow_dispatch:
    permissions:
      contents: read
    concurrency:
      group: kontroly-${{ github.ref }}
      cancel-in-progress: true
    jobs:
      zmeny:            # má smysl pouštět Lighthouse?
        runs-on: ubuntu-latest
        timeout-minutes: 5
        outputs:
          web: ${{ steps.z.outputs.web }}
        steps:
          - uses: actions/checkout@<SHA> # vX.Y.Z
            with: { fetch-depth: 0, persist-credentials: false }
          - id: z
            env:
              UDALOST: ${{ github.event_name }}
              ZAKLAD: ${{ github.base_ref }}
            run: |
              if [ "$UDALOST" != "pull_request" ]; then echo "web=true" >> "$GITHUB_OUTPUT"; exit 0; fi
              if git diff --name-only "origin/$ZAKLAD...HEAD" | grep -qE '\.(html|css|js|mjs|json|toml|avif|webp|png|svg|woff2|mp4)$'
              then echo "web=true" >> "$GITHUB_OUTPUT"; else echo "web=false" >> "$GITHUB_OUTPUT"; fi
      staticke:
        runs-on: ubuntu-latest
        timeout-minutes: 15
        steps:
          - uses: actions/checkout@<SHA> # vX.Y.Z
            with: { persist-credentials: false }
          - uses: actions/setup-node@<SHA> # vX.Y.Z
            with: { node-version-file: .nvmrc, cache: npm }
          - run: npm ci
          - run: npm run kontrola:generatory
          - run: npm run test:bez-prohlizece
          - run: npm run kontrola:tvrzeni
          - run: npm run kontrola:vystup
          - run: npm run kontrola:html
          - run: npm run kontrola:odkazy
      tajemstvi:
        runs-on: ubuntu-latest
        timeout-minutes: 10
        steps:
          - uses: actions/checkout@<SHA> # vX.Y.Z
            with: { fetch-depth: 0, persist-credentials: false }
          - run: <instalace gitleaks pinované verze s ověřením kontrolního součtu>
          - run: gitleaks git --redact --no-banner -v .
      e2e:
        runs-on: ubuntu-latest
        timeout-minutes: 25
        env: { BEZ_SNIMKU: "1", A11Y_RYCHLE: "1" }
        steps:
          - uses: actions/checkout@<SHA> # vX.Y.Z
            with: { persist-credentials: false }
          - uses: actions/setup-node@<SHA> # vX.Y.Z
            with: { node-version-file: .nvmrc, cache: npm }
          - run: npm ci
          - run: npm run build --if-present
          - uses: actions/cache@<SHA> # vX.Y.Z – ~/.cache/ms-playwright, klíč podle verze Playwrightu
          - run: npx playwright install --with-deps chromium
          - run: npm run test:e2e:ci
          - if: always()
            uses: actions/upload-artifact@<SHA> # vX.Y.Z
            with: { name: e2e, path: artefakty/e2e/, retention-days: 7 }
      lighthouse:
        needs: [zmeny, staticke]
        if: needs.zmeny.outputs.web == 'true'
        runs-on: ubuntu-latest
        timeout-minutes: 20
        steps:
          - uses: actions/checkout@<SHA> # vX.Y.Z
            with: { persist-credentials: false }
          - uses: actions/setup-node@<SHA> # vX.Y.Z
            with: { node-version-file: .nvmrc, cache: npm }
          - run: npm ci
          - run: npm run build --if-present
          - run: npm run vykon
          - if: always()
            uses: actions/upload-artifact@<SHA> # vX.Y.Z
            with: { name: lighthouse, path: .lhci-vystup/, retention-days: 7 }
    ```
    Pravidla:
    - **Pinování akcí:** každou akci pinuj na plný SHA commitu a do komentáře napiš verzi. SHA zjistíš např. `git ls-remote --tags https://github.com/actions/checkout`. Žádné `@main` ani `@v4`.
    - **Zakázáno ve workflow:**
      - `secrets.*`, proměnné `NETLIFY_*` a `*_API_KEY`
      - `netlify deploy`, `netlify api` a `scripts/nasadit.mjs`
      - `pull_request_target`
    - **Povinné:** `permissions: contents: read` a `persist-credentials: false`.
    - **Hodnoty z události** (`github.event.*`, `github.head_ref`, `github.base_ref`) nikdy nevkládej přímo do `run:`, jen přes `env:`. Chrání to před vložením příkazů.
    - **Které joby běží:**
      - `staticke`, `tajemstvi` a `e2e` vždy.
      - `lighthouse` u PR jen při změně HTML, CSS, JS, obrázků, videí nebo písem. Vždy po pushi do `main` a při ručním spuštění.
      - Podmínku dej do `if:` jobu, ne do `paths:` workflow. Přeskočený job je pro povinné kontroly v pořádku, kdežto nespuštěný workflow by sloučení zablokoval.
      - Node ber z `.nvmrc`. Pokud soubor chybí, vytvoř ho podle `NODE_VERSION` z `netlify.toml`. `node --test` s globem potřebuje Node 22 nebo novější.
    - **Provozní nastavení:**
      - `timeout-minutes` u každého jobu a `concurrency` s `cancel-in-progress`
      - cache npm a prohlížečů Playwrightu
      - artefakty s `retention-days: 7`, bez osobních údajů
    - **Workflow z úkolu 13** (`kontrola-tvrzeni.yml`), pokud existuje: jeho krok už běží v jobu `staticke`, proto samostatný soubor odstraň. Jinak by se kontrola spouštěla dvakrát a spotřebovávala minuty. Uveď to v hlášení.
    - **`tests/ci/workflow.test.mjs`** (Node): ověří pravidla výše pro **všechny** soubory v `.github/workflows/`. Pohlídá je tak i u workflow, které přidají úkoly 15, 14 a 12. YAML zpracuj parserem v `devDependencies`, nebo jednoduchými regulárními výrazy.
13. **Brána před sloučením a šablona PR:**
    - **`scripts/ci/pred-sloucenim.mjs`:**
      - přes `gh run list --workflow kontroly.yml --commit <HEAD> --json status,conclusion` (volby ověř v `gh run list --help`) ověří, že poslední běh pro **aktuální HEAD** větve skončil `success`,
      - po `git fetch` ověří, že větev obsahuje aktuální `origin/main` (`git merge-base --is-ancestor origin/main HEAD`),
      - jinak skončí kódem 1 a vypíše, co udělat. Bez `gh` nebo bez přihlášení skončí kódem 2,
      - logiku pokryje test s podvrženým výstupem `gh` (`tests/ci/pred-sloucenim.test.mjs`).
    - **Jak agent spustí CI:** pushne větev a otevře **koncept PR** do `main` (`gh pr create --draft`). Samotný push do `ukol-*` CI nespouští, což šetří minuty.
    - **`.github/pull_request_template.md`:**
      - úkol a co se mění
      - ověření (příkazy a výsledky)
      - zaškrtávací pole:
        - [ ] `npm run ci:lokalne` prošlo
        - [ ] změnu tvrzení (záruka, ceny, technologie, recenze, čísla) schválil majitel (kdo, kdy), nebo PR tvrzení nemění
        - [ ] v diffu není žádné tajemství
        - [ ] žádné produkční nasazení
      - odkaz na náhled, pokud vznikl
14. **Dokumentace:**
    - **`docs/ci.md`** (mimo publikační adresář) popíše:
      - co který job kontroluje a jak číst selhání
      - `npm run ci:lokalne`
      - základní linii html-validate a jak ji snižovat
      - jak úkol přidá vlastní kontrolu (seznam v `generatory.mjs`, test do `tests/`, e2e do `tests/e2e/`)
      - co do CI nepatří: brány produkce, testy snímků, vnější odkazy a cokoli s tajemstvím
      - spotřebu minut
    - **`CLAUDE.md`** (zachovej stávající obsah), nová sekce „CI“:
      - Do `main` jde jen větev se zeleným během `kontroly` pro poslední commit (`node scripts/ci/pred-sloucenim.mjs` → 0). Po zapnutí ochrany větve se slučuje jen přes PR (`gh pr merge`), ne lokálním merge a push.
      - Když je `main` červená, má oprava přednost a nesmí proběhnout žádné produkční nasazení.
      - Kontroly se kvůli zelenému výsledku nevypínají ani nezmírňují. Práh nebo základní linii jde změnit jen se zdůvodněním v PR.
      - CI nikdy nenasazuje.
    - **Návod pro majitele – ochrana větve `main`** (do `docs/ci.md` i do hlášení). Funguje jen s GitHub Pro. Názvy voleb ověř v aktuální dokumentaci GitHubu.
      1. GitHub → repozitář webu → Settings → Branches → Add branch protection rule (nebo Rules → Rulesets → New branch ruleset, pokud je nabízen), vzor `main`.
      2. Require a pull request before merging. Počet schválení nech 0, schvaluješ v chatu. Volba zakáže přímý push do `main`.
      3. Require status checks to pass before merging a Require branches to be up to date. Vyber `staticke`, `tajemstvi`, `e2e` a `lighthouse`. Kontroly se v nabídce objeví až po prvním běhu workflow.
      4. Do not allow bypassing the above settings (platí i pro správce), Block force pushes, Restrict deletions.
      5. Ověření: PR s červeným během nejde sloučit (tlačítko Merge je neaktivní).

      Bez GitHub Pro tyto volby nastavit nejdou. Pak platí brána `pred-sloucenim.mjs` a pravidlo v `CLAUDE.md`.
15. **Negativní test.** Z větve `ukol-19-ci-kontroly` vytvoř `ukol-19-negativni-test`. Každou chybu zaveď v **samostatném commitu** a otevři koncept PR. Očekávané výsledky:

    | Rozbití | Musí selhat |
    |---|---|
    | chybějící čárka v jednom bloku JSON-LD | `staticke` (kontrola výstupu) |
    | odstraněný statický `<form name="hspg-poptavka">` | `staticke` (formuláře) |
    | `<iframe>` s `position:fixed` a vyšším `z-index` přes `#hspg-lista` a `#cta-main` | `e2e` (smoke, klikatelnost) |
    | věta „záruka 15 let“ na stránce | `staticke` (05 / 13) |
    | odkaz na `/neexistuje-19` a na `#neexistujici-kotva` | `staticke` (odkazy) |
    | duplicitní `id` | `staticke` (html-validate) |
    | stránka s `noindex` přidaná do sitemap | `staticke` (sitemap) |
    | `${PROMENNA}` ve viditelném textu | `staticke` (šablonové značky) |
    | ruční změna generovaného souboru (např. `assets/hbot-znalosti.json`) | `staticke` (generátory) |

    Jeden běh odhalí jen první chybu v jobu, protože kroky běží za sebou. Ověřuj proto po commitech: pro každé rozbití buď samostatný běh (`git revert` předchozího), nebo stejný test lokálně přes `npm run ci:lokalne`. Další commit pushni až po dokončení předchozího běhu (`gh run watch`), jinak ho `concurrency` s `cancel-in-progress` zruší. Kvůli minutám stačí v CI aspoň jedno rozbití pro `staticke` a jedno pro `e2e`, ostatní lokálně. Do hlášení dej odkazy na červené běhy. PR zavři **bez sloučení** a vlastní větev `ukol-19-negativni-test` smaž lokálně i na GitHubu. Negativní test gitleaks proveď lokálně podle kroku 11.
16. **Pozitivní běh a minuty.** Otevři PR z `ukol-19-ci-kontroly`, všechny joby musí být zelené.
    - Zapiš trvání jobů. GitHub účtuje každý job zaokrouhleně nahoru na celé minuty.
    - Spočítej průměr na PR a odhad za měsíc (počet PR a pushů do `main` za posledních 30 dní) proti 2 000 minutám.
    - Pokud odhad přesáhne 60 %, navrhni úspory (Lighthouse jen na `main`, méně stránek ve smoke testech).
    - **Podej hlášení fáze A a zastav se.** Sloučit smíš až po potvrzení majitelem.

### Fáze B – provoz formulářů (export, mazání, záloha)
17. Větev `ukol-19-formulare` z aktuální `main` (fáze A už je sloučená). Spusť `git -C ../hspg-balicek pull`.
18. **Ověř `hspg-fotky` ve zdroji:** `git grep -n "hspg-fotky"` by měl najít `akce/dekujeme/index.html` (nebo šablonu), `assets/fotky-upload.js`, `content/firma.json` a případně registr `content/zpracovani.json` (09).
    - Očekávaný závěr: formulář je napojený na stránku `/akce/dekujeme/` a hlídá ho kontrola z kroku 6c.
    - Do hlášení napiš, že audit #20 byl planý poplach kvůli neúplné kopii webu.
    - Registraci v Netlify nemaž.
19. **`scripts/formulare.mjs`** (Node, bez nových závislostí).
    - **Přístup k Netlify:**
      - Volá Netlify API **jen přes přihlášené Netlify CLI na počítači majitele**: `npx netlify api <operace> --data '<json>'`.
      - Názvy operací ověř přes `npx netlify api --list`. Očekávané jsou `listSiteForms`, `listFormSubmissions` a `deleteSubmission`.
      - Žádný token v kódu, v `.env` repozitáře ani v GitHubu. Nový token nezakládej.
      - ID projektu vezmi z `scripts/nasadit.mjs` (`PROJEKT`).
      - Volání API odděl do injektovatelné funkce kvůli testům.
    - **Výpisy:** skript nikdy nevypisuje obsah podání, jen jména formulářů, počty, data a ID.
    - **`seznam`** (jen čtení):
      - Porovná formuláře v Netlify (jméno, id, počet podání, datum vytvoření) se statickými formuláři ve výstupu (krok 6c).
      - Vypíše tabulku „v Netlify i na webu / jen v Netlify / jen na webu“.
      - Výsledek patří do hlášení. Formulář „jen v Netlify“ jen nahlas majiteli, nemaž ho.
    - **`export --cil <adresář>`** (nebo proměnná `HSPG_ZALOHA_FORMULARE`):
      - Stáhne všechna ověřená podání všech formulářů (stránkování po 100).
      - Pokud to API umožní, stáhne i spam, protože i ten obsahuje osobní údaje. Jak API spam vrací, ověř v dokumentaci.
      - Stáhne přílohy (fotky) z jejich URL. Ověř, zda URL vyžadují přihlášení a jak dlouho platí.
      - Výstup: `<cil>/RRRR-MM-DD/<formular>.json`, přílohy a `manifest.json` (počty po formulářích, ID podání, SHA-256 souborů, čas).
      - Cíl uvnitř repozitáře Git (`git rev-parse --show-toplevel`) odmítne. Volbu úložiště jinak nechává na majiteli.
      - Úplnost: počet podání v manifestu se musí rovnat počtu podle API.
      - Po úspěchu zapíše `.provoz/formulare-export.json` jen s klíči `datum` (ISO), `pocty` (formulář → počet) a `manifest_sha256` (`.provoz/` patří do `.gitignore`). Z tohoto souboru čte týdenní kontrola úkolu 15 („poslední export ≤ 7 dní“).
    - **`promaz`** (výchozí **`--nasucho`**):
      - Doby uchování čte z `content/zpracovani.json` (úkol 09: `ucely[].formulare`, `ucely[].uchovani.mesice`).
      - Pokud formulář nemá záznam nebo má `mesice: null`, vypíše `[DOPLNIT: doba uchování – rozhodnutí majitele, úkol 09 O1]`, nic nesmaže a skončí kódem 3.
      - Jinak vypíše po formulářích počty podání podle stáří (starší než lhůta / v lhůtě) a co by smazal.
      - **Skutečné mazání proběhne jen při splnění všech podmínek najednou:**
        - `--smazat` a `--schvaleno "kdo a kdy"`,
        - export není starší než 24 h a jeho manifest obsahuje **každé** mazané ID,
        - mazané ID není v seznamu výjimek `--ponechat <soubor>` (soubor mimo repozitář, např. podání k probíhající zakázce nebo reklamaci).
      - Maže po jednom podání a zapisuje log `.provoz/formulare-mazani-RRRR-MM-DD.json` (ID, formulář, datum vytvoření, výsledek; žádný obsah).
      - **Rotace záloh:** ponechá posledních `[DOPLNIT: počet týdenních exportů, návrh 8]` složek, starší smaže jen s `--smazat`. Zálohy tak nedrží data déle než lhůta plus doba rotace. Tuto dobu předej úkolu 09 do zásad.
    - **npm skripty:** `formulare:seznam`, `formulare:export` a `formulare:promaz` (bez `--smazat`).
    - **`.gitignore`:** `.provoz/`, `zalohy-formularu/`, `*formulare-export*` a podobné vzory. Kontrola 6f a jednoduchý test hlídají, že `git ls-files` žádný takový soubor neobsahuje.
20. **Testy** `tests/formulare/formulare.test.mjs`. Používají falešné API, žádnou síť a fiktivní data označená „TEST“. Ověří:
    - stránkování (250 podání → 3 stránky),
    - hranice lhůty: přesně N měsíců, přechod měsíce a přestupný rok,
    - `--nasucho` ani výchozí režim nikdy nevolají mazání,
    - `mesice: null` → kód 3 a text `[DOPLNIT`,
    - mazání bez exportu, se starým exportem nebo s ID mimo manifest je odmítnuto,
    - výjimky z `--ponechat` zůstanou,
    - cíl exportu uvnitř repozitáře je odmítnut,
    - výstup na konzoli neobsahuje jména, telefony ani e-maily z testovacích dat,
    - rotace ponechá správný počet složek.

    Testy zařaď do `npm test` i `test:bez-prohlizece`. Poběží v CI, protože API je falešné.
21. **Ověření na počítači majitele.** Jen se souhlasem majitele, CLI je přihlášené z úkolu 00.
    - `npm run formulare:seznam`
    - `npm run formulare:export -- --cil "[DOPLNIT: cesta od majitele]"` → počty v manifestu se rovnají počtům v Netlify.
    - `npm run formulare:promaz` → `[DOPLNIT` a kód 3, dokud není rozhodnuta otázka O1 z úkolu 09. Nic se nesmaže, počty v Netlify jsou před i po stejné.
    - Obsah exportu neotvírej ani nevypisuj.
22. **`docs/provoz-formulare.md`:**
    - **Týdenní rutina:** kdo a kdy (`[DOPLNIT: majitel / agent na pokyn, den v týdnu]`), příkaz a kam se ukládá.
    - **Úložiště:** `[DOPLNIT: soukromé úložiště majitele]`. Doporučení: šifrovaný disk, nebo složka v osobním cloudu s dvoufázovým ověřením. Nikdy repozitář, CI, e-mail ani sdílený odkaz.
    - **Mazání:** měsíčně, jakmile je rozhodnutá lhůta.
    - **Ruční záloha a mazání bez skriptu:** Netlify → Forms → formulář → Download as CSV. Mazání: zaškrtnout podání → Delete submission.
    - **E-mailové kopie poptávek** ve schránkách Seznam (`info@hspg.cz`, `profiserv@seznam.cz`) maže majitel ručně podle stejné lhůty.
    - **Žádost o výmaz:** dohledat podání podle telefonu nebo e-mailu v Netlify i v exportech.
    - **Obnova:** export je jen záloha dat, zpět do Netlify Forms se nenahrává.
23. **Hlášení fáze B** včetně checklistu pro majitele (viz Hlášení po dokončení).

## Akceptační kritéria

**Fáze A**
- [ ] `.github/workflows/kontroly.yml` existuje a `node --test tests/ci/workflow.test.mjs` prošel. Test kontroluje spouštěče, `permissions: contents: read`, piny na SHA, `timeout-minutes`, `concurrency` a absenci `secrets.`, `pull_request_target` i nasazování.
- [ ] `git grep -nE "netlify (deploy|api)|nasadit\.mjs|NETLIFY_AUTH_TOKEN|_API_KEY|secrets\." -- .github/` → žádný výsledek.
- [ ] PR z `ukol-19-ci-kontroly`: joby `staticke`, `tajemstvi`, `e2e` a `lighthouse` jsou zelené (`gh pr checks <číslo>`, odkaz na běh). V hlášení je trvání jobů a odhad minut za měsíc.
- [ ] Negativní test: každé rozbití z tabulky v kroku 15 shodilo očekávaný job (odkazy na běhy, případně výstup `npm run ci:lokalne`). PR je zavřený bez sloučení a `git ls-remote --heads origin ukol-19-negativni-test` vrací prázdný výstup.
- [ ] Artefakt `zablokovane-pozadavky.json` z e2e: každý požadavek mimo localhost je zrušený a smoke testy neobsahují žádný POST (`node -e 'const l=require("./artefakty/e2e/zablokovane-pozadavky.json"); const p=l.filter(z=>z.metoda==="POST"); console.log(l.length, p.length); process.exit(p.length?1:0)'` → kód 0).
- [ ] Lighthouse: artefakt obsahuje reporty pro mobil i desktop (`D=$(mktemp -d); gh run download <id> -n lighthouse -D "$D" && ls "$D/mobil" "$D/desktop"` → obě složky neprázdné), aserce odpovídají úkolu 07 (případné přepnutí výkonu na `warn` je doložené 3 běhy podle kroku 10).
- [ ] `npm run test:bez-prohlizece` a `npm run test:e2e:ci` prošly. V hlášení je seznam souborů v obou skupinách a žádný soubor není v obou (ani `tests/e2e/ga4-zive.test.mjs` a testy snímků v žádné).
- [ ] `npm run ci:lokalne` lokálně prošel, tabulka kroků a časů je v hlášení.
- [ ] `node --test tests/ci/*.test.mjs tests/asistent/unit/*.test.mjs` → vše prošlo (uveď počty).
- [ ] `git grep -nE "hspg-balicek|balicek/web" -- tests/` → nic. Testy asistenta používají kód webu a server neservíruje nic mimo publikační adresář.
- [ ] `npm run kontrola:html` prošel. Základní linie obsahuje jen zbývající chyby, každou s odpovědným úkolem.
- [ ] `npm run kontrola:vystup` prošel: JSON-LD, šablonové značky, formuláře (všech 5, případně 6 s `hspg-reklamace`), sitemap, indexace a interní soubory.
- [ ] `node scripts/ci/pred-sloucenim.mjs` → kód 0 na zelené větvi, kód 1 na `ukol-19-negativni-test` (před jejím smazáním).
- [ ] `gitleaks git --redact --no-banner` → 0 nálezů, nebo jen otisky v `.gitleaksignore` se souhlasem majitele.
- [ ] Existují `docs/ci.md`, `.github/pull_request_template.md` a sekce „CI“ v `CLAUDE.md` (`test -f docs/ci.md && test -f .github/pull_request_template.md && grep -n "^#.*CI" CLAUDE.md` → kód 0). Návod na ochranu větve je v hlášení.

**Fáze B**
- [ ] `node --test tests/formulare/*.test.mjs` → vše prošlo (uveď počet).
- [ ] `git grep -nE "(NETLIFY_AUTH_TOKEN|Authorization)\s*[:=]" -- scripts/ tests/` → nic.
- [ ] `npm run formulare:seznam` na počítači majitele: `hspg-fotky` je ve skupině „v Netlify i na webu“. Tabulka je v hlášení.
- [ ] Export: počty v manifestu se rovnají počtům v Netlify, cíl je mimo repozitář, `git status --porcelain` je prázdný. `.provoz/formulare-export.json` existuje a neobsahuje osobní údaje (`node -e 'console.log(Object.keys(require("./.provoz/formulare-export.json")))'` → jen `datum`, `pocty`, `manifest_sha256`).
- [ ] `npm run formulare:promaz; echo $?` → `[DOPLNIT …` a 3, dokud není O1 rozhodnuto. Počet podání v Netlify je před i po stejný.
- [ ] `docs/provoz-formulare.md` existuje a `[DOPLNIT]` obsahuje jen u rozhodnutí majitele.

## Ověření
```bash
npm ci
npm run ci:lokalne                                   # → tabulka kroků, vše OK
npm run kontrola:generatory && git status --porcelain # → prázdný výstup
npm run test:bez-prohlizece                          # → vše prošlo (počty)
npm run kontrola:vystup && npm run kontrola:html && npm run kontrola:odkazy
npm run test:e2e:ci                                  # → vše prošlo; artefakty/e2e/zablokovane-pozadavky.json bez POST
npm run vykon                                        # → LHCI mobil i desktop podle úkolu 07
gitleaks git --redact --no-banner                    # → no leaks found
git grep -nE "netlify (deploy|api)|nasadit\.mjs|NETLIFY_AUTH_TOKEN|_API_KEY|secrets\." -- .github/   # → nic
gh pr create --draft --base main --head ukol-19-ci-kontroly && gh pr checks   # → vše pass
gh run view <id negativního běhu> --log-failed       # → očekávaná příčina selhání
node scripts/ci/pred-sloucenim.mjs; echo $?          # → 0 (zelená), 1 (červená / zastaralá vůči main)
# fáze B
node --test tests/formulare/*.test.mjs               # → vše prošlo
npm run formulare:seznam                             # u majitele → tabulka formulářů
npm run formulare:export -- --cil "<cesta od majitele>"   # → manifest, počty = Netlify
npm run formulare:promaz; echo $?                    # → [DOPLNIT …], 3
```

Testy, které přidáš:
- `tests/ci/vystup.test.mjs`: JSON-LD, šablonové značky, registr formulářů, sitemap, indexace, interní soubory (krok 6)
- `tests/ci/workflow.test.mjs`: pravidla workflow (krok 12)
- `tests/ci/pred-sloucenim.test.mjs`: logika brány s podvrženým `gh` (krok 13)
- `tests/ci/html-validate-zaklad.json` a `scripts/ci/html-validate.mjs` se zkouškou rohatky (nová chyba, vyšší počet i nižší počet selžou)
- `tests/asistent/**`: převzaté testy balíčku (unit i e2e) nad kódem webu
- `tests/e2e/smoke.e2e.test.mjs`: stránky × 3 šířky, chyby konzole, H1, vodorovný posun, klikatelnost výzev, blokování sítě a POST
- `tests/formulare/formulare.test.mjs` (fáze B)

## Bez AI / s AI
CI nikdy nevolá skutečnou AI. Testy asistenta běží s falešnými adaptéry (`falesnyAdapter`) v režimech `ai`, `bez-ai` a `chyba`. CI tak u každého PR ověřuje pravidlo KONTEXT §4.6: bez klíče, při chybě i po vypršení časového limitu web funguje a nabídne FAQ a zavolání zpět. Workflow neobsahuje proměnné `ANTHROPIC_*`, `OPENAI_*`, `GEMINI_*` ani `OPENROUTER_*` (hlídá test workflow), takže CI nespotřebuje kredity Netlify ani tokeny. Fáze B s AI nesouvisí.

## Nepřekročitelná pravidla
Platí `balicek/KONTEXT.md` §4. Navíc pro tento úkol:
- **CI jen kontroluje.** Žádné nasazení (ani náhled), žádný token Netlify ani AI v GitHubu, žádný `pull_request_target`. Napojení Netlify na Git nezapínej (úkol 00).
- **Nic se neodesílá.** Testy ruší všechny POST i vnější požadavky. Produkce se v CI vůbec nevolá a do produkčních formulářů nic nejde (§4.5).
- **Kontroly se nezmírňují kvůli zelenému výsledku.** Když v CI selže test jiného úkolu, najdi příčinu (prostředí, časování) a nahlas ji. Aserci jiného úkolu neměň bez zdůvodnění v hlášení. Předem povolené výjimky jsou jen dvě: přeskočení testů snímků v CI (krok 9) a přepnutí `categories:performance` na `warn` v CI po doloženém kolísání (krok 10).
- **Osobní údaje z formulářů** nesmí do Gitu, CI, artefaktů, logu ani chatu. Obsah podání nečti. Mazat se smí jen se schválením majitele a po ověřeném exportu.
- **Registrace formulářů v Netlify, e-mailové schránky a DNS zůstávají beze změny.**
- **Větve:** vlastní pomocnou větev `ukol-19-negativni-test` smíš smazat, cizí větve ne.
- **Veřejný balíček:** repozitář balíčku je veřejný, proto do něj nepiš hodnoty tajemství ani podrobnosti z exportů. Hlášení posíláš majiteli, ne do balíčku.

## Hlášení po dokončení
Formát z `KONTEXT.md` §5 a k tomu:

**Fáze A**
- úkoly v `main`, nalezené generátory, testy a npm skripty a co v CI chybí, protože úkol ještě není sloučený
- rozdělení testů: soubory v `test:bez-prohlizece` a v `test:e2e:ci`, co v CI záměrně neběží (snímky 07 a 08, `ga4-zive`) a úpravy převzatých testů balíčku
- tabulka jobů a kroků s trváním, odhad minut za měsíc proti 2 000
- odkaz na zelený běh a na negativní běhy s tabulkou „rozbití → job → hláška“
- obsah základní linie html-validate s odpovědnými úkoly
- změny v souborech jiných úkolů (přeskočení snímků, odstranění `kontrola-tvrzeni.yml`, rozšíření testu úkolu 17)
- návod na ochranu větve pro majitele
- návrhy mimo rozsah:
  - `autocomplete` u adres pro úkoly 17 a 04
  - kontrola zeleného CI pro HEAD `main` v `nasadit.mjs --produkce`, pro úkol 15
  - týdenní kontrola vnějších odkazů jen jako varování
  - Dependabot pro akce GitHubu

**Fáze B**
- tabulka z `formulare:seznam` a závěr k `hspg-fotky`
- výsledek exportu (jen počty a SHA-256 manifestu, žádný obsah)
- výstup `promaz --nasucho`
- výsledky testů

**Checklist pro majitele**
- [ ] Rozhodnout dobu uchování poptávek (úkol 09, O1) a doplnit `mesice` v `content/zpracovani.json`.
- [ ] Určit soukromé místo pro zálohy exportu a počet ponechaných týdenních exportů.
- [ ] Potvrdit, že 8 dosavadních podání jsou testy. Pokud ano, smazat je po exportu (`npm run formulare:promaz -- --smazat --schvaleno "…"`, nebo ručně v Netlify).
- [ ] Rozhodnout o GitHub Pro. S ním nastavit ochranu větve `main` podle návodu, bez něj platí brána `pred-sloucenim.mjs`.
- [ ] Hlídat minuty Actions (Settings → Billing). Bez platební metody se Actions po vyčerpání zastaví a nic se nedoúčtuje.
- [ ] Týdenní export podle `docs/provoz-formulare.md`, pokud ho nemá na starosti agent.
