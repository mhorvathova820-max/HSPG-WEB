# Úkol 07: Výkon a Core Web Vitals
> Priorita P1 · Závisí na: 06 · Čeká na majitele: – (jen schválení produkčního nasazení v dávce) · Rozsah: rychlost načítání a stabilita rozvržení (LCP, TBT, CLS) bez změny obsahu, cen, adres a vzhledu. Dvě fáze: A = měření a rychlé opravy, B = otisky souborů, cache a hlavní vlákno. Každá fáze je samostatné sezení, po fázi A hlášení a zastavení. Stav zadání: v1, po auditu výkonu se může zpřesnit.

## Proč (s důkazy)
Zdroje: Lighthouse 13.5 z 4. 10. 2026 dopoledne (`lh-home-mobile.json`, `lh-home-desktop.json`, simulované omezení), kontrolní běh Lighthouse 13 téhož dne odpoledne (headless Chromium, už bez odznaku Netlify), kopie živého webu a GET dotazy na https://hspg.cz. Řádky v HTML platí pro živý web, ve zdroji se mohou lišit.

**Výchozí čísla**

| Stránka | Mobil: výkon · LCP · TBT · CLS | Desktop: výkon · CLS |
|---|---|---|
| `/` (dopoledne, ještě s odznakem Netlify) | **83** · 3,6 s · 290 ms · 0,006 | **84** · **0,259** |
| `/` (odpoledne, kontrolní běh) | 57\* · 3,6 s · 3 940 ms\* · 0 | 65\* · **0,265** |
| `/cenik.html` | 99 · 2,0 s · 10 ms · 0,007 | 100 · 0,002 |
| `/akce/` | 99 · 1,4 s · 110 ms · 0,057 | 100 · 0,051 |
| `/cisteni-fasad/praha/` (okresní) | 98 · 1,5 s · 150 ms · 0,019 | 100 · 0,047 |
| `/kalkulacka-svj.html` | 98 · 2,4 s · 20 ms · 0,042 | 100 · 0,060 |

\* Kontejner bez GPU: dekorativní animace `assets/hstone-rain.js` tam spotřebovala 6,9 s CPU. Číslo závisí na prostředí a není to výchozí stav. Ukazuje ale, že animace může na slabém zařízení blokovat hlavní vlákno. Výchozí stav změří agent sám (krok 3), jedním nástrojem pro „před“ i „po“.

**Co výsledky způsobuje**
1. **CLS na desktopu (0,259) vzniká výměnou písma v úvodu.** Posouvá se pravý sloupec úvodu `main#obsah > section#hero > div#hero-parallax-popredi > div` (karta „ZAMĚŘENÍ NA DÁLKU · 0 Kč“, `display:grid;align-content:center`). Při načtení `manrope-normal-latin.woff2` je posun 0,223, při Manrope latin-ext a Cormorant dalších 0,033. Web má záložní řezy se `size-adjust` (`'Manrope Fallback'` → `local('Arial')`, `'Cormorant Fallback'` a `'Playfair Fallback'` → `local('Georgia')`). **V Chromiu na Linuxu se ale `local('Arial')` ani `local('Georgia')` nenačte.** Ověřeno: `document.fonts.load` skončí chybou, kdežto `local('Liberation Sans')` funguje. Lighthouse a PageSpeed běží na Linuxu a Android tato písma obvykle nemá (ověř). Záložní řez se tak nepoužije a text se nejdřív vykreslí systémovým písmem s jinou šířkou. Na podstránkách dává stejná příčina CLS 0,05–0,06 (desktop). Některé zápisy písma záložní rodinu vůbec neuvádějí, např. na `/cenik.html` `font-family: 'Playfair Display', Georgia, serif` a `Manrope, Inter, Helvetica, Arial, sans-serif`.
2. **LCP na mobilu je 3,6 s.** LCP prvek je `img#hero-brand-fallback`: `<picture>` s AVIF/WebP, mobil stáhl `hero-luxury-768.avif` (14 KB). Obrázek má `fetchpriority="high"`, není lazy a je v HTML od začátku, takže to je správně. Brzdí ho souběžné požadavky. Současně s ním se stahuje 8 souborů písem (~220 KB). Čtyři z nich jdou přes `preload` (`cormorant-garamond-normal-latin(-ext)`, `manrope-normal-latin(-ext)`), další čtyři (Playfair, Cormorant kurzíva) najde až CSS. Dále `logo-320.webp` (20 KB pro zobrazení 58 px) a hned za nimi plakáty videí. Simulace Lighthouse počítá s požadavky, které začnou před vykreslením LCP, takže písma a plakáty LCP přímo prodlužují.
3. **Plakáty videí tvoří 46 % dat homepage.** Homepage má 15 `<video>`, z toho 13 s atributem `poster`. Prohlížeč stáhne plakát hned, i když má video `preload="none"`. Při načtení se stáhlo 12 plakátů, celkem ≈ 436 KB z 956 KB (mobil). Žádné video nemá `width`/`height` a prostor drží jen některé kontejnery (`aspect-ratio` je v HTML 13×). Video bez plakátu a bez rozměrů se zhroutí na 300×150 a pak skočí, což by způsobilo CLS.
4. **TBT 290 ms (mobil) pochází z hlavního dokumentu.** Všechny dlouhé úlohy, které se do TBT počítají, patří `https://hspg.cz/` (246 ms v čase 1,36 s, dále 107 ms a 84 ms). Jde o jediný inline skript homepage (44 KB, ř. 1916) a o přepočty stylů a rozvržení (Style & Layout 1,5 s). K tomu přispívá dokument 245 KB s 1 158 prvky DOM, 30 nekonečných CSS animací (`infinite`, z toho 26 v atributech `style`) a výška stránky na mobilu 21 855 px (KONTEXT §2). `hstone-rain.js` (déšť na plátně) spotřeboval 1,4 s CPU. Spouští se hned po načtení a vypíná se jen při `prefers-reduced-motion`, Save-Data a méně než 3 jádrech.
5. **Cache** (živé hlavičky, GET 4. 10.):
   - HTML `public,max-age=0,must-revalidate`, to je správně.
   - `/assets/*` (CSS, JS, písma, `/assets/v/*.webp|avif`, SVG, PNG) má `public,max-age=3600,must-revalidate`. Vracející se návštěvník je tedy po hodině znovu ověřuje. Po nasazení může až hodinu dostávat starý CSS/JS k novému HTML.
   - `/media/*` (plakáty, MP4) má `public,max-age=31536000,immutable`, ale **bez otisku v názvu**. Výměna souboru pod stejným jménem by se vracejícím se návštěvníkům rok neprojevila.
   - Audit z prohlížeče: rok + immutable má jen 13 WebP a 22 MP4.
6. **Skripty.**
   - `/assets/ceny.js` nemá `defer` na `/` ani na `/kalkulacka-svj.html` (na `/en.html` ho už má). **Past:** hned za ním je inline skript, který čte `window.HSPG_CENY` při spuštění. Na homepage je to `const CENY=window.HSPG_CENY;` (ř. 2116), na kalkulačce `const CENY = window.HSPG_CENY;` (ř. 323). Pouhé přidání `defer` by ceny tiše přepnulo na záložní hodnoty zapsané v kódu (`Math.round(area*168/10)*10`).
   - `holub-let.css` je v hlavičce dvakrát: jednou jako `<link rel="preload" … onload="this.rel='stylesheet'">` a jednou jako `<link rel="stylesheet">`.
   - Odznak Netlify (`/.netlify/scripts/hud`) se v dopoledním měření ještě načítal. Teď už ne (ověřeno na živém HTML).
7. **Ostatní nálezy:**
   - `favicon-192.png` (192×192, 56 KB) se stahuje na každé stránce. Na `/cenik.html` je to čtvrtina všech dat (224 KB).
   - 17 z 29 `<img>` na homepage nemá `width`/`height`. Ostatní stránky v kopii jsou bez nálezu.
   - Inline CSS homepage: 5 bloků `<style>` (79,7 KB) a 436 atributů `style` (40,6 KB).
   - Okresní stránky generuje `scripts/build-regions.mjs` (232 stránek s `data-gen="build-regions"`).
8. **Na co při měření pamatovat.**
   - Na homepage jsou `#hbot-btn` a `#cta-stack` skryté, dokud je úvodní výzva na obrazovce (`body.hero-cta-na-obrazovce`). Lighthouse je při načtení nevidí, asistenta z úkolu 01 proto měř na `/cenik`.
   - LCP prvek na `/cenik` a `/kalkulacka-svj` je text lišty souhlasu `#souhlas-lista p.sl-text` (vkládá `souhlas.js`).
   - Na `/akce/` je LCP prvek plakát `video.spotvid`, na okresní stránce `section.rhero > p.lead`.

## Cíl (měřitelný)
Měří se medián z 5 běhů jedním nástrojem a verzí. Rozhoduje PageSpeed Insights (servery Google) na náhledovém nasazení, pro kontrolu i na produkci po nasazení. Lokální Lighthouse CI slouží jako hlídač regresí.

| Metrika | `/` | `/cenik`, `/akce/`, okresní stránka, `/kalkulacka-svj` |
|---|---|---|
| Výkon mobil | **≥ 90** (ideál 95) | ≥ 95 a ne horší než výchozí stav |
| Výkon desktop | **≥ 95** | ≥ 95 |
| CLS mobil i desktop | **< 0,1** (ideál < 0,05) | < 0,1 |
| LCP mobil | ≤ 2,5 s | ≤ 2,5 s |
| TBT mobil | ≤ 200 ms | ≤ 200 ms |
| Přístupnost | 100 (beze změny) | 100 |
| Data při načtení (mobil, bez posunu) | ≤ 600 KB (dnes 956), nejvýš 2 plakáty | nezvýšit |

Dále platí:
- Soubory s otiskem v názvu mají `max-age=31536000, immutable`. Soubory bez otisku nikdy nemají `immutable`, výjimkou je `/media/` s kontrolou neměnnosti.
- Rozpočty Lighthouse CI jsou v repozitáři.
- Vzhled po načtení se nemění, ověřeno snímky.

Čísla z e-mailu „Master plán“ („60 FPS“, „< 0,4 s“, „CLS přesně 0“) cílem nejsou (POSUDEK).

## Rozsah
**ANO:**
- měření před a po, Lighthouse CI a rozpočty
- záložní řezy písem a jejich zápisy ve stylech
- revize preloadů písem
- rozměry obrázků a videí
- líné plakáty
- komprese favikon a loga
- `defer` u skriptů (včetně bezpečného pořadí inline kódu)
- odložený start dekorativních animací
- otisky souborů a hlavičky `Cache-Control`
- přesun inline JS homepage do souboru a rozdělení inicializace
- `content-visibility` a pozastavení animací mimo obrazovku
- vytažení inline CSS, jen kde to měření potvrdí

**NE:**
- texty, ceny a `content/ceny.json`
- adresy a přesměrování (úkoly 06 a 12)
- hlavička, patička, paleta, typografie a počet rodin písma (úkol 08)
- CSP a ostatní bezpečnostní hlavičky (úkol 15, zde jen `Cache-Control`)
- lišta souhlasu a měření (úkol 10)
- OG obrázek (úkol 11)
- soubory asistenta z úkolu 01 (`assets/hbot*.js`, `hbot.css`, `ai-klient.js`, `hbot-znalosti.json`): panel se už načítá líně, neměnit
- odstranění dekorativních efektů nebo videí (jen odložit nebo pozastavit, o odstranění rozhoduje majitel)
- externí CDN a placené služby pro obrázky
- produkční nasazení bez schválení

## Postup

### Fáze A – měření a rychlé opravy (bez změny architektury)
1. **Větev `ukol-07-vykon` z aktuální `main`** (`git fetch`, `git switch main`, `git pull`, `git switch -c ukol-07-vykon`). Ověř, že je sloučený úkol 06 (jedna podoba adres a 301). Měř na kanonických adresách z úkolu 06, pravděpodobně `/cenik` a `/kalkulacka-svj` bez `.html`. Pokud 06 sloučený není, zastav se a nahlas to. Do měření zapiš, které úkoly už jsou v `main` (`git log --oneline -20`).
2. **Najdi v repozitáři soubory, které generují:**
   - homepage `index.html` (ručně psaná, nebo šablona?)
   - okresní stránky (`scripts/build-regions.mjs`)
   - `assets/ceny.js` (`scripts/build-ceny.mjs`)
   - další build skripty (`build-recenze.mjs`, `build-references.mjs`, `build-hbot.mjs` z úkolu 01)
   - varianty obrázků a videí v `assets/v/` a `media/v/`
   - bloky `@font-face`, které jsou inline v každé stránce: odkud se vkládají?
   - `netlify.toml` (`[build] command`, `publish`, `[[headers]]`) a případný `_headers`
   - způsob nasazení (příkaz `netlify deploy …`; spouští se build?)

   Výsledek zapiš do hlášení. U generovaných stránek vždy měň šablonu nebo skript a výstup přegeneruj, nikdy ne výstup ručně.
3. **Měřicí nástroj a výchozí stav.**
   - Přidej do devDependencies `@lhci/cli` a `serve`. Vytvoř `lighthouserc.json` (mobil) a `lighthouserc.desktop.json` (`"settings": {"preset": "desktop"}`) a npm skript `vykon`, který spustí obě. Kostra je níže, aserce ve fázi A nastav jako `warn`.
   - Výchozí stav změř (a) lokálně (`npm run vykon`), (b) přes PageSpeed Insights na produkci a (c) na náhledovém nasazení, jakmile bude.
   - Náhledové nasazení je `netlify deploy` bez `--prod`, nejvýš 1× za fázi. Předtím zkontroluj kredity (KONTEXT §4).
   - Výsledky zapiš do `docs/vykon/vychozi-stav.md`: verze Lighthouse, `benchmarkIndex`, medián z 5 běhů, URL.
   - Pořiď snímky Playwright pro 5 stránek při 360×800 a 1280×900. Snímej po `document.fonts.ready` a s `reducedMotion: 'reduce'`, aby animace stály. Ulož je jako výchozí stav vizuálního testu.
   - Zaznamenej výsledek kalkulačky pro pevný vstup na `/` (výpočet fasády) a na `/kalkulacka-svj`. Použije ho test cen.
   ```json
   {
     "ci": {
       "collect": {
         "startServerCommand": "npx serve -l 8080 <publish složka z netlify.toml>",
         "url": ["http://localhost:8080/", "http://localhost:8080/cenik", "http://localhost:8080/akce/",
                 "http://localhost:8080/cisteni-fasad/praha/", "http://localhost:8080/kalkulacka-svj"],
         "numberOfRuns": 3,
         "settings": { "chromeFlags": "--no-sandbox" }
       },
       "assert": {
         "assertions": {
           "categories:performance": ["warn", { "minScore": 0.9 }],
           "categories:accessibility": ["error", { "minScore": 1 }],
           "cumulative-layout-shift": ["warn", { "maxNumericValue": 0.1 }],
           "largest-contentful-paint": ["warn", { "maxNumericValue": 2500 }],
           "total-blocking-time": ["warn", { "maxNumericValue": 200 }],
           "unsized-images": ["warn", { "minScore": 1 }],
           "resource-summary:font:count": ["warn", { "maxNumericValue": 8 }],
           "resource-summary:total:size": ["warn", { "maxNumericValue": 614400 }]
         }
       },
       "upload": { "target": "filesystem", "outputDir": ".lighthouseci" }
     }
   }
   ```
   Poznámky ke kostře:
   - Lokální server nemá hlavičky ani HTTP/2 Netlify, takže absolutní skóre se od produkce liší. Lokálně hlídej hlavně CLS, počty a velikosti, skóre ber z PageSpeed.
   - `@lhci/cli` 0.15 obsahuje Lighthouse 12.6. Srovnávej jen výsledky stejného nástroje.
   - `.lighthouseci/` patří do `.gitignore`.
4. **Písma a CLS.**
   a) Záložní řezy musí fungovat i na Linuxu a Androidu:
      - Bezpatkové písmo: řez se zdroji `local('Arial'), local('Liberation Sans'), local('Arimo')` (metricky shodná písma) a samostatný řez pro `local('Roboto')` (Android) s vlastními hodnotami.
      - Patkové písmo: samostatné řezy pro `local('Georgia')` a pro dostupné náhrady (např. `local('Liberation Serif')`, `local('Noto Serif')`), každý s vlastními hodnotami.
      - Hodnoty `size-adjust`, `ascent-override`, `descent-override` a `line-gap-override` spočítej z metrik skutečných souborů woff2 nástrojem (např. `fontaine` nebo `@capsizecss/metrics` + `@capsizecss/unpack`), ne odhadem.
      - Výpočet ulož jako `scripts/build-pisma-zaloha.mjs`, aby šel zopakovat.
   b) Ve všech zápisech `font-family` s webovým písmem musí hned za ním následovat záložní rodina (`'Manrope','Manrope Fallback',…`). Projdi inline styly, `brand.css`, `holub-let.css`, `en-sections.css`, `svj-podklad.css` i šablonu `build-regions.mjs`. Neměň, která webová písma se používají (to je úkol 08).
   c) Pokud po bodu a) zůstane posun `#hero-parallax-popredi > div` na desktopu nad 0,02, stabilizuj sloupec (např. `align-content:start` nebo `min-height`). Smí to být jen tehdy, když se vzhled po načtení písma nezmění, ověř snímkem.
   d) `font-display: optional` použij až jako poslední možnost, pokud a)–c) nestačí, a nahlas to (první návštěva by pak viděla záložní písmo).
   Po každém kroku změř CLS na všech 5 stránkách (desktop i mobil).
5. **Preloady písem.**
   - Playwright při 412×915 a 1350×940 zjistí, které soubory woff2 se použijí v první obrazovce (`performance.getEntriesByType('resource')` a vypočtené `font-family` viditelných prvků). H1 je v Playfair Display, který dnes preload nemá. Preloadovaný Cormorant ověř.
   - `preload` nech jen pro 1–3 soubory, které se v první obrazovce opravdu použijí. Ostatní odstraň a v konzoli nesmí zůstat varování „preloaded but not used“.
   - Volitelně můžeš sloučit subsety latin + latin-ext do jednoho „cs“ subsetu na rodinu (`pyftsubset` nebo `glyphhanger`; čeština potřebuje U+0100–017F). Podmínky: licence (OFL) to dovoluje, zkontroluj Reserved Font Name v souboru licence, a měření ukáže zisk. Jinak nech subsety beze změny.
6. **Obrázky.**
   - Doplň `width` a `height` (skutečné rozměry souboru) ke všem 17 `<img>` na homepage. Zobrazenou velikost dál určuje CSS, kde se mění jen šířka, přidej `height:auto`.
   - U LCP obrázku `#hero-brand-fallback` nech `fetchpriority="high"` a nikdy mu nedávej `loading="lazy"`.
   - Na ostatních 4 stránkách nastav `fetchpriority="high"` jen tam, kde je LCP prvek obrázek. Na `/akce/` je to plakát, viz krok 7.
   - `favicon-192.png` zmenši (oxipng nebo pngquant) na méně než 15 KB tak, aby byl vizuálně shodný. Totéž zkus u `favicon-48.png` a `apple-touch-icon.png`. Názvy souborů neměň, odkazuje na ně manifest.
   - Logo: `logo-320.webp` (20 KB) se na mobilu stahuje pro zobrazení 58 px. Přidej variantu 2× pro skutečnou velikost nebo soubor překomprimuj a uprav jen `srcset`, vzhled hlavičky patří úkolu 08.
   - Plakáty s velkou úsporou podle Lighthouse (desktop): `media/hspg-roof-detail-poster-960.webp` 78 KB (úspora ~54 KB), `media/reel/poster-30s.webp` 52 KB (~47 KB). Pro ně připrav responzivní varianty, viz krok 7.
7. **Videa a plakáty.**
   - **Nejdřív** všem 15 videím na homepage rezervuj prostor: `width`/`height` podle skutečného poměru, nebo `aspect-ratio` na videu či kontejneru. Snímkem ověř, že se nic neposunulo.
   - Atribut `poster` nech jen u videí v první obrazovce. Dnes jsou to `#hero-main-video` a `#hero-medailon-video`, ověř to při 412×915 i 1350×940.
   - Ostatním videím plakát odlož. Doporučené řešení je `<img loading="lazy" decoding="async" width height alt="" srcset sizes>` v kontejneru videa, které se skryje, jakmile video hraje. Funguje bez JS, umí responzivní varianty a prohlížeč ho načte sám před příjezdem na obrazovku. U `#holub-klec-video` takový obrázek už existuje, sjednoť ostatní podle něj. Alternativou je `data-poster` doplněný ve stávajícím IntersectionObserveru (`rootMargin` ~600 px). Volbu zdůvodni v hlášení.
   - `prefers-reduced-motion`: video se nespustí, ale plakát se musí zobrazit (test).
   - `media/holub-medailon.mp4` (82 KB, v H1 na mobilu, stahuje se hned) spouštěj až po události `load`. Do té doby zůstává `#hero-medailon-still`.
   - Na `/akce/` je plakát LCP prvek, ten nech. Video `media/v/reel-30s-v1-720.mp4` (403 KB) se stahuje hned. Start po `load` jen volitelně a jen pokud se LCP nezhorší.
8. **Skripty.**
   - Dej `defer` souboru `ceny.js` na `/` a `/kalkulacka-svj`, včetně šablon. Ve stejném commitu musí inline skript, který čte `window.HSPG_CENY` a `window.HSPG_VYPOCET`, běžet až po `ceny.js`. Obal jeho tělo do `document.addEventListener('DOMContentLoaded', …)`, protože skripty s `defer` doběhnou před touto událostí. Ve fázi B se kód přesune do souboru. Test cen musí projít před i po.
   - Zdvojené `holub-let.css`: nech jen `<link rel="stylesheet">` a ověř, že dvojice preload + `onload` nemá jiný účel. Zmizí tím jediný inline handler `onload` na homepage, což pomůže úkolu 15.
   - `hstone-rain.js`: efekt neodstraňuj. Spouštěj ho až po `load` + `requestIdleCallback` (s `timeout` ~2 s) a jen když je úvod na obrazovce. Stávající vypnutí (reduced motion, Save-Data, méně než 3 jádra) ponech. Přidej strop snímků (např. 30 fps) a méně kapek na úzkém displeji. Ověř, že v Lighthouse (mobil) netvoří dlouhé úlohy před TTI.
   - Soubory úkolu 01 (`assets/hbot*.js`, `hbot.css`, `ai-klient.js`, `hbot-znalosti.json`) neměň.
9. **Testy fáze A** přidej podle části Ověření, body 1–8.
10. **Měření po fázi A** proveď stejně jako v kroku 3 a zapiš ho do `docs/vykon/po-fazi-a.md`. U každého kroku 4–8 uveď, co přinesl. Krok bez přínosu vrať. **Podej hlášení fáze A** a pokračuj až potom.

### Fáze B – otisky souborů, cache a hlavní vlákno
11. **Otisky souborů a cache.** Variantu vyber podle kroku 2 a zdůvodni ji:
    - **Varianta 1 (doporučená, když se nasazuje z lokálu):**
      - Build do výstupní složky `dist/`, která je v `.gitignore`. Build zkopíruje web, spustí stávající build skripty a pak `scripts/build-otisky.mjs`.
      - Skript vytvoří kopie se zkráceným SHA-256 v názvu ve vlastní složce, např. `/o/holub-let.3f9a1c2b7e.css`.
      - Skript přepíše odkazy ve všech HTML (`src`, `href`, `srcset`, `poster`, `<link rel=preload>`, inline `@font-face url()`) a v CSS (`url()`) a zapíše manifest `otisky.json`.
      - V `netlify.toml` nastav `publish = "dist"`. Nasazuje se `npm run build && netlify deploy --dir=dist` (náhled), produkce s `--prod` až po schválení. Nový postup zapiš do `CLAUDE.md`.
      - Zdrojová HTML zůstanou čitelná.
    - **Varianta 2 (jen když varianta 1 naráží, zdůvodni proč):** otisky přímo v repozitáři a `node scripts/build-otisky.mjs --kontrola` v testech.
    - **Nepoužívej** `?v=hash` s `immutable` pro celé `/assets/*`. Každý odkaz bez parametru by pak uvízl v cache na rok.
    - Do otisků nezahrnuj:
      - soubory úkolu 01 (načítají se pod pevným jménem)
      - soubory odkazované zvenku: `og.png`, favikony, `apple-touch-icon.png`, `manifest.webmanifest`, logo v JSON-LD, obrázky ze sitemapy
      - `/media/*`
    - Hlavičky (měň jen `Cache-Control`, ostatní hlavičky patří úkolu 15):

      | Cesta | `Cache-Control` |
      |---|---|
      | HTML | `public, max-age=0, must-revalidate` (beze změny) |
      | složka s otisky (`/o/*`) | `public, max-age=31536000, immutable` |
      | CSS/JS/JSON bez otisku | `public, max-age=0, must-revalidate` |
      | obrázky a písma bez otisku | `public, max-age=3600` (stačí) |
      | `/media/*` | ponechat rok + `immutable`, hlídá to kontrola níže |
    - Ověř v dokumentaci Netlify, jak se slučují hlavičky z více pravidel, která sedí na stejnou cestu. Proto má být složka s otisky mimo vzor `/assets/*`. Test kontroluje přesnou a jedinou hodnotu `Cache-Control`.
    - V nasazení ponech i předchozí generaci otisků (pro otevřené karty a bfcache). Starší generace maž skriptem.
    - `/media/*`: přidej `media/otisky.json` (název → SHA-256) a `scripts/kontrola-media.mjs`. Kontrola selže, když se obsah souboru změní pod stejným jménem. Změněný soubor pak musí dostat nový název.
    - Přidej `scripts/kontrola-cache.mjs <základní URL>`. Projde všechny stránky ze sitemapy a všechny jimi odkazované soubory a ověří stav 200 a hlavičky podle tabulky.
12. **Inline JS homepage (44 KB) přesuň do `assets/domov.js`.** Soubor dostane otisk a `defer` a bude za `ceny.js`. Obal `DOMContentLoaded` z kroku 8 odstraň.
    - Inicializaci rozděl: hned jen první obrazovka, ostatní sekce až při přiblížení (IntersectionObserver s `rootMargin`) nebo v `requestIdleCallback`.
    - Odstraň vynucené přepočty rozvržení (čtení rozměrů v cyklech a v posuvu).
    - Cíl: v Performance panelu (mobil, CPU 4×) žádná úloha nad 100 ms před TTI a TBT ≤ 200 ms.
    - Inline skript `/kalkulacka-svj` (6 KB) volitelně stejně.
    - Nepřidávej žádné nové inline skripty ani handlery `on*` (CSP, úkol 15). Pokud úkol 15 už CSP vynucuje, nové soubory musí projít (`'self'`).
13. **Vykreslování dlouhé homepage.**
    - Sekcím mimo první obrazovku dej `content-visibility:auto` + `contain-intrinsic-size:auto <odhad>px`. Úvodu ne.
    - Ověř skoky na kotvy (např. `#holub-sekce`), hledání v textu (Ctrl+F) a čtečku obrazovky.
    - 30 nekonečných CSS animací pozastav mimo obrazovku (`animation-play-state` přes třídu nastavenou IntersectionObserverem).
    - Měř Style & Layout a CLS při posunu (test 9). Když se CLS zhorší nebo posuvník skáče, změnu vrať.
14. **Inline CSS.** Vytahuj ho do souboru jen tam, kde měření (medián 5 běhů) ukáže lepší nebo stejné FCP/LCP a menší HTML.
    - Sdílené styly hlavičky, patičky a proměnné řeší úkol 08. Je-li 08 sloučený, napoj jeho soubor na otisky.
    - CSS jen pro homepage nech inline, pokud vytažení nepomůže.
    - Do hlášení zapiš variantu, kterou jsi zkusil, a její čísla.
15. **Lighthouse CI na `error`.**
    - Aserce z kroku 3 přepni na `error` a doplň rozpočty podle dosaženého stavu s rezervou ~10 %: `resource-summary:image:size`, `:font:size`, `:script:size`, `:total:size` a `unsized-images`.
    - Pokud je zdroj v soukromém repozitáři na GitHubu (úkol 00), přidej `.github/workflows/vykon.yml`. Workflow se spouští na pull request, staví a měří lokálně a nic nenasazuje, takže nespotřebuje žádné kredity Netlify.
16. **Náhledové nasazení**, měření jako v kroku 3 do `docs/vykon/vysledek.md`, `scripts/kontrola-cache.mjs <náhled>` a hlášení. Produkce jen po schválení majitelem, v dávce s dalšími úkoly. Po nasazení jeden běh PageSpeed na produkci (mobil i desktop).

## Akceptační kritéria
Fáze A:
- [ ] `docs/vykon/vychozi-stav.md` a `docs/vykon/po-fazi-a.md` obsahují medián z 5 běhů (mobil i desktop) pro 5 adres, verzi Lighthouse a URL.
- [ ] CLS < 0,1 na všech 5 stránkách, mobil i desktop. Homepage desktop ideálně < 0,05 (PageSpeed na náhledu + `npm run vykon`).
- [ ] Test záložních písem: v testovacím Chromiu (Linux) vrací `document.fonts.load("16px '<rodina> Fallback'")` aspoň 1 řez pro každou záložní rodinu.
- [ ] Statický test: 0 `<img>` bez `width`/`height` ve všech HTML výstupu. Lighthouse `unsized-images` = 1 na všech 5 stránkách.
- [ ] Statický test: každé `<video>` má `width`/`height` nebo je na seznamu výjimek s kontejnerem s `aspect-ratio`.
- [ ] Homepage (mobil, bez posunu do `load` + 2 s): nejvýš 2 požadavky na plakáty. Celková data ≤ 600 KB (e2e nebo LHCI `resource-summary`).
- [ ] Statický test: žádný `<script src>` bez `defer`/`async`/`type="module"`. E2E test cen na `/` a `/kalkulacka-svj` dává stejné částky jako výchozí záznam.
- [ ] `wc -c favicon-192.png` < 15 360 B.
- [ ] Homepage má nejvýš 3 `<link rel="preload" as="font">` a v konzoli není varování o nepoužitém preloadu.
- [ ] E2E: plátno `.hstone-rain` nevznikne před `load`; s `reducedMotion: 'reduce'` nevznikne vůbec a plakáty se zobrazí.
- [ ] Vizuální test 5 stránek × 2 šířky: rozdíl ≤ 1 % pixelů, nebo je každý rozdíl vysvětlený v hlášení.
- [ ] Testy úkolu 01 (`npm run test:e2e` v balíčku proti webHSPGH) prochází.

Fáze B:
- [ ] `npm run build && node scripts/build-otisky.mjs --kontrola` → 0 odkazů na neexistující soubor, 0 odkazů na verzi bez otisku u souboru, který otisk má.
- [ ] `node scripts/kontrola-cache.mjs https://<náhled>` → 0 chyb. Soubory s otiskem mají právě jednu hodnotu `public, max-age=31536000, immutable`. Bez otisku nikde `immutable` mimo `/media/`. HTML `max-age=0`.
- [ ] `node scripts/kontrola-media.mjs` → OK.
- [ ] Homepage nemá žádný inline `<script>` s kódem (kromě `application/ld+json`) a žádný handler `on*` (statický test).
- [ ] PageSpeed na náhledu (medián 5): `/` mobil ≥ 90, desktop ≥ 95. Ostatní 4 stránky mobil ≥ 95 a ne horší než výchozí stav, desktop ≥ 95. CLS < 0,1 všude, přístupnost 100. TBT homepage mobil ≤ 200 ms. Nesplněný cíl LCP ≤ 2,5 s je v hlášení vysvětlený.
- [ ] E2E posun celou homepage (412×915 i 1280×900): součet `layout-shift` bez `hadRecentInput` < 0,1.
- [ ] `npm run vykon` s asercemi na `error` prochází. `lighthouserc*.json` jsou v repozitáři, `.lighthouseci/` a `dist/` v `.gitignore`.

## Ověření
Testy přidej do testů webu (rámec zjisti v `package.json`; pokud žádný není, použij `node:test` + Playwright jako balíček). Nic z nich nesmí odesílat formuláře: v Playwright zachytávej a ruš všechny POST.
1. `tests/vykon/staticke.test.mjs`: projde všechna HTML ve výstupu.
   - `<img>` bez `width`/`height` → 0
   - `<video>` bez rozměrů (mimo seznam výjimek) → 0
   - `<script src>` bez `defer`/`async`/`module` → 0
   - preload písem na homepage ≤ 3
   - každá rodina webového písma v `font-family` má za sebou svou záložní rodinu
   - ve fázi B navíc 0 inline skriptů s kódem a 0 handlerů `on*` na homepage
2. `tests/vykon/pisma.test.mjs`: `document.fonts.load` pro všechny záložní rodiny → aspoň 1 řez, žádná chyba.
3. `tests/vykon/ceny.test.mjs`: na `/` se výsledek výpočtu fasády pro pevný vstup rovná `window.HSPG_VYPOCET.spocitej(...)` a nesmí se zobrazit „cena podle objektu“. Na `/kalkulacka-svj` dá pevný vstup stejnou částku jako záznam z kroku 3.
4. `tests/vykon/plakaty.test.mjs` (412×915):
   - nejvýš 2 požadavky na plakáty do `load` + 2 s
   - po posunu k videu se plakát načte
   - s `reducedMotion: 'reduce'` je plakát vidět a video nehraje
5. `tests/vykon/animace.test.mjs`: `.hstone-rain` až po `load`, s reduced motion nikdy.
6. `tests/vykon/preload.test.mjs`: v konzoli 0 varování „was preloaded using link preload but not used“.
7. `tests/vykon/vzhled.test.mjs`: snímky 5 stránek × (360×800, 1280×900) po `document.fonts.ready`, `maxDiffPixelRatio: 0.01` proti výchozímu stavu.
8. Testy balíčku úkolu 01, hlavně „panel se načte až při zájmu – první načtení stránky ho nestahuje“ a „úvodní stránka: tlačítko se schová u hlavní výzvy v úvodu a objeví se po posunu“.
9. `tests/vykon/posun-cls.test.mjs` (fáze B): PerformanceObserver `layout-shift` a postupný posun celou homepage. Součet bez `hadRecentInput` < 0,1.

Příkazy a očekávané výsledky:
```
npm run build                                      # → bez chyby (fáze B: vznikne dist/)
node scripts/build-otisky.mjs --kontrola           # → „OK“, 0 chybějících / neotiskovaných odkazů
node scripts/kontrola-media.mjs                    # → OK
npm test                                           # → všechny testy webu včetně tests/vykon prošly (uveď počty)
npm run vykon                                      # → LHCI mobil + desktop, aserce prošly
node scripts/kontrola-cache.mjs https://<náhled>   # → 0 chyb
curl -sI https://<náhled>/o/<soubor-s-otiskem>.css | grep -i cache-control   # → public, max-age=31536000, immutable (jednou)
curl -sI https://<náhled>/ | grep -i cache-control                            # → max-age=0, must-revalidate
git grep -n "immutable" -- netlify.toml _headers   # → jen pravidlo pro složku s otisky a /media/*
curl -s "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://<náhled>/&strategy=mobile&category=performance&category=accessibility" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const r=JSON.parse(d).lighthouseResult;console.log(r.categories.performance.score,r.audits['largest-contentful-paint'].displayValue,r.audits['total-blocking-time'].displayValue,r.audits['cumulative-layout-shift'].displayValue)})"
# → 5× pro každou stránku a strategii (mobile/desktop), do docs/vykon/ zapsat medián
```

## Bez AI / s AI
Úkol AI nepoužívá a nic na ní nemění. Úpravy výkonu nesmí změnit chování asistenta z úkolu 01: panel se načítá líně a bez AI zůstává funkční záloha. Ověřují to testy v bodě 8.

## Nepřekročitelná pravidla
Viz `balicek/KONTEXT.md` §4. Pro tento úkol navíc:
- **Pravdivost:** výsledky měření patří jen do hlášení a `docs/vykon/`. Žádná tvrzení o rychlosti webu na stránkách ani v marketingu („nejrychlejší“, „načtení za 0,4 s“).
- **Beze změny obsahu:** texty, ceny, `content/ceny.json`, adresy a vzhled po načtení zůstávají stejné (snímky). Dekorativní efekty, videa a animace jen odlož nebo pozastav mimo obrazovku. Odstranění navrhni majiteli v hlášení.
- **Pohyb a přístupnost:** respektuj `prefers-reduced-motion` a Save-Data. Přístupnost zůstává 100.
- **Hranice s jinými úkoly:**
  - soubory úkolu 01 neměň
  - hlavičky měň jen `Cache-Control` (CSP a ostatní patří úkolu 15)
  - nepřidávej inline skripty ani handlery
  - hlavičku, patičku a typografii nech úkolu 08
  - adresy nech úkolům 06 a 12
- **Vlastní doména:** žádné externí CDN, služby pro obrázky ani nové platby. Vše zůstává na vlastní doméně.
- **Kredity Netlify:**
  - měř lokálně a na náhledu, náhledové nasazení nejvýš 1× za fázi, předtím kontrola kreditů
  - produkce jen po schválení v dávce
  - proti produkci jen pár běhů (GET)
  - Lighthouse ani testy nesmí odeslat žádný formulář
- **Generované stránky:** neupravuj vygenerované výstupy ručně. Měň šablony a skripty a výstup přegeneruj.
- **Repozitář:** do repozitáře jen souhrny (`docs/vykon/*.md`). Surová data a `dist/` do `.gitignore`.

## Hlášení po dokončení
Formát z `KONTEXT.md` §5 (zvlášť po fázi A a po fázi B) a k tomu:
- tabulka před/po: 5 stránek × mobil/desktop (výkon, LCP, TBT, CLS, data v KB, počet požadavků), zdroj (PageSpeed / LHCI), verze Lighthouse, medián z 5 běhů, URL náhledu
- přínos jednotlivých kroků (co pomohlo, co bylo vráceno a proč)
- zjištěný build a postup nasazení, zvolená varianta otisků se zdůvodněním, nový příkaz nasazení (zapsaný v `CLAUDE.md`)
- pravidla `Cache-Control` před a po a výstup `kontrola-cache.mjs`
- výsledky všech testů (počty) a seznam nových a změněných souborů
- návrhy mimo rozsah:
  - záložní ceny natvrdo v inline skriptu homepage (`168` Kč/m² za fasádu, `120` Kč/m² za lešení). Když `ceny.js` selže, web ukáže neaktuální cenu. Patří k jednomu zdroji cen a k úkolu 13.
  - LCP prvek na `/cenik` a `/kalkulacka-svj` je lišta souhlasu (úkol 10).
  - OG obrázek 336 KB (úkol 11).
  - délka homepage 21 855 px na mobilu a 15 videí (obsah a design, rozhodnutí majitele / úkol 08).
  - video na `/akce/` (403 KB hned po načtení).
