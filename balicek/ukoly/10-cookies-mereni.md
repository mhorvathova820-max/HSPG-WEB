# Úkol 10: Cookies a měření konverzí
> Priorita P1 · Závisí na: 09 (a na úkolech 02, 04, 06, 08, 16, 17, které mění stejné soubory nebo adresy; úkol 09 se slučuje až po schválení majitelem, viz krok 1) · Čeká na majitele: jen fáze C – ID měření GA4 (`G-…`) a nastavení property, import a publikace kontejneru GTM, rozhodnutí o reklamách (Google Ads / Sklik a ID jejich konverzí), kontrola nastavení Microsoft Clarity. Sekci cookies v zásadách schvaluje spolu se zásadami z úkolu 09 · Rozsah: lišta souhlasu (kategorie, odvolání, Consent Mode v2, Clarity Consent API v2), maskování a osobní údaje v URL, jednotné události `dataLayer`, GA4 přes GTM. **Tři fáze, po každé hlášení:** A soukromí a lišta, B události a příprava měření (obě bez účtů a bez majitele), C aktivace GA4/GTM s majitelem.

## Proč (s důkazy)
Ověřeno 4. 10. 2026. Živý `assets/souhlas.js` je shodný s kopií webu (`diff` beze rozdílu). Čísla řádků platí pro kopii živého webu, ve zdroji se mohou lišit.

**Co funguje a musí zůstat:**
- Před volbou nejde nic třetím stranám: 0 požadavků na cizí domény na 15 typech stránek (`audit-pravni_pravdivost.json`, „funguje dobře“).
- „Jen nezbytné“ funguje. `souhlas.js` i odkaz „Nastavení cookies“ (`data-souhlas-nastaveni`) jsou na 247 z 247 stránek.
- `souhlas.js` registruje i service worker (ř. 147–150). To není měření a musí zůstat.

**Souhlas není konkrétní a odvolání nic nemaže** (`audit-pravni_pravdivost.json` #6):
- „Přijmout“ (ř. 112 → `loadGtm(true)`, ř. 27) nastaví `ad_storage`, `ad_user_data` i `ad_personalization` na `granted`, přestože web žádnou reklamu neměří.
- Clarity se spouští starým voláním `clarity('consent')` (ř. 49). Podle dokumentace Microsoftu ([Consent API v2](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2)) uděluje stejný stav všem typům souhlasu včetně `ad_Storage`. Staré API se má přestat používat a od 31. 10. 2025 Clarity v EHP vyžaduje platný signál souhlasu.
- Audit po „Přijmout“ naměřil cookies `_clck` (.hspg.cz), `CLID`, `MUID` (.bing.com a .clarity.ms), `MR`, `SRM_B`, `SM` a `ANONCHK`. `MUID` je podle [seznamu cookies Clarity](https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-cookies) identifikátor Microsoftu, který slouží i reklamě.
- Zásady (`ochrana-osobnich-udaju.html`, sekce 7 `#cookies`) uvádějí jen `_clck`, `CLID`, `_clsk`, `_ga` a `_ga_*`. `MUID` ani doménu bing.com nezmiňují.
- Odvolání (ř. 113–117) jen uloží `nezbytne` a znovu načte stránku. Nevolá `clarity('consent', false)`, takže `_clck`, `CLID`, `MUID` a `_cltk` v `sessionStorage` zůstanou.
- Tlačítka nemají stejnou váhu (ř. 107–108): „Přijmout“ je zlatě vyplněné, „Jen nezbytné“ je průhledné s obrysem.

**GTM se načítá, ale nic neměří** (`audit-vykon.json` #9, `audit-obsah_konverze.json` #1):
- Kontejner `GTM-TDTGMBRK` stažený dnes GETem: `"version":"1"`, `"tags":[]`, `"rules":[]`, `"predicates":[]`, 336 720 B. Každý souhlasící návštěvník přesto stáhne 119 KB a spustí 337 KB JS.
- Na webu není `gtag/js` ani ID `G-…`. Lišta přitom slibuje „Google Tag Manager — návštěvnost a účinnost reklam“ (ř. 83) a zásady popisují cookies Google Analytics s platností 2 roky.

**Měření konverzí chybí, i když kód události posílá** (`audit-obsah_konverze.json` #1):

| Událost v `dataLayer` | Kde (kopie webu) |
|---|---|
| `lead_funnel_step` (kroky 1–5), `lead_submit` + `generate_lead` (`b2c_complete` / `b2c_surface`), `hero_service_selected`, `video_play`, `video_complete` | inline skript `index.html` (ř. 2048–2049, 2167–2194, 2253, 2270) |
| `lead_funnel_step` (`weather_forecast_shown`), `generate_lead` (`akce`) | `akce/index.html` ř. 205 a 296 (push těsně před `location.href='/akce/dekujeme/'`) |
| `review_submitted` | `recenze/index.html` ř. 293 |
| `hbot_open`, `hbot_odpoved` (`zdroj`: `faq`/`ai`/`zadna`), `hbot_cta`, `generate_lead` (`callback_hbot`) | `assets/hbot-panel.js` z úkolu 01 (funkce `udalost`) |

- Kliky na telefon (724 odkazů `tel:` na 247 stránkách), e-mail (258 prvků `data-mail`) a WhatsApp (odkaz `wa.me` v plovoucím menu `#cta-stack` na homepage, funkce `renderCta`) do `dataLayer` nejdou vůbec. Clarity je zachytí jen jako `telefon` a `email` (ř. 61–62).
- Clarity chytá jen nativní `submit` (ř. 69–71). Průvodce na homepage (odesílá přes `fetch`) ani zavolání zpět z H-BOT proto nevidí.
- Klik na `#cta-main` se zapisuje jako `vypustit_holuba` (ř. 60), ale tlačítko jen otevírá plovoucí menu.
- Zdroj návštěvy u poptávek řeší úkol 02. Úkol 10 dodá jen kategorii marketing pro `maSouhlas('marketing')`.

**Osobní údaje mohou odcházet do Clarity a do URL** (`audit-pravni_pravdivost.json` #7):
- `mask()` (ř. 35–38) proběhne jen jednou při spuštění Clarity. Prvky přidané později maskované nejsou.
- Atribut `[data-lead]` se na webu nevyskytuje (0× mimo `souhlas.js`).
- Dynamicky vznikají:
  - panel průvodce `#hspg-form-panel` s textem „Děkujeme, <jméno>.“ (`index.html`, `renderFormInner`, ř. 2179),
  - scéna `#hspg-dove-scene` (`assets/holub-let.js`), která ukazuje křestní jméno a adresu,
  - okno H-BOT. Nový panel z úkolu 01 dává `data-clarity-mask` na `#hbot`, ověř to.
- V režimu Balanced Clarity v textu maskuje jen čísla a e-maily, jméno a text dotazu se nahrají (audit podle dokumentace Microsoftu). Lišta přitom tvrdí: „Obsah formulářů se nikdy nezaznamenává.“ (ř. 93).
- Adresa a kód pasu se předávají v URL:
  - `index.html` ř. 2320: `#rz-cta` → `/akce/?adresa=…`,
  - `pas-domu.html` ř. 288: `/akce/?adresa=<obec>`, ř. 290: `/recenze/?kod=<kód pasu>`.
  - `/akce/` čte `adresa` (ř. 177) a `/recenze/` čte `kod` (ř. 269).
  - Clarity i GA4 ukládají URL stránky včetně parametrů.

**Výkon a mrtvý kód:**
- Na `/cenik.html` a `/kalkulacka-svj.html` je prvkem LCP text lišty `#souhlas-lista p.sl-text`. JS ho vkládá až po DOMContentLoaded (render delay 470–800 ms, LCP mobil na `/cenik.html` 2,06–2,20 s). Zdroj: `audit-vykon.json` #11. Úkol 07 lištu výslovně vyřadil a odkázal sem.
- `index.html` obsahuje mrtvý kód staré lišty: CSS `#cookie-banner` (ř. 323 a 1094) a JS `hspg-cookies-ok` / `[data-action="prijmoutCookies"]` (ř. 1975–1981). Prvek `#cookie-banner` na webu není ani jednou.

**Další fakta:**
- CSP (Report-Only) na živém webu: `script-src` povoluje clarity.ms a googletagmanager.com, `connect-src` `*.google-analytics.com` a `*.analytics.google.com`. Domény Google Ads ani Sklik v ní nejsou.
- Interní `/rd-control-panel/` `souhlas.js` nenačítá (ověřeno GETem), `ai-centrum/index.html` z balíčku také ne.
- Sklik od 1. 8. 2024 vyžaduje v kódech parametr `consent` ([blog Seznamu](https://blog.seznam.cz/en/2024/07/as-of-august-sklik-ad-codes-have-to-include-the-consent-parameter/), [nápověda Sklik](https://napoveda.sklik.cz/en/tracking-scripts/conversion-code/)).

**Vazby na dřívější úkoly (podle jejich zadání, stav ověř ve zdroji):**
- Úkol 06: kanonické adresy jsou bez `.html` (`/cenik`, `/kalkulacka-svj`, `/en`, `/pas-domu`, `/ochrana-osobnich-udaju`), stará podoba vrací 301. Čísla řádků a adresy výše jsou z živého webu před úkolem 06. Nové odkazy musí projít `node scripts/kontrola-adres.mjs`.
- Úkol 04: potvrzení reklamace `<section id="reklamace-potvrzeni" … data-lead data-clarity-mask="true">`. Formulář `hspg-reklamace` nemá žádnou událost (úkol 04 ji výslovně nechal sem).
- Úkol 09: úložiště v prohlížeči vede registr `content/zpracovani.json` (`uloziste_prohlizece`, blok `ZPRACOVANI:ULOZISTE` v `#cookies`), příjemce a předávání mimo EHP `prijemci`. Bloky generuje jako karty `<dl>` (bez vodorovného posunu na 360 px). Odstavce o Clarity a GTM převzal beze změny a obalil značkami `<!-- COOKIES:START -->` / `<!-- COOKIES:END -->`, jejichž obsah přepisuje generátor tohoto úkolu. Anglické shrnutí zásad `#english` je hotové, sekce `#cookies` zůstává česky. Do `main` se slučuje až ve své fázi C po schválení majitelem. Předává sem: otázku, zda Cache Storage service workeru potřebuje souhlas, mrtvý kód `hspg-cookies-ok` a odkaz „Details“ v liště na `/en` (`#english`).
- Úkol 16: jeho kritéria počítají s tlačítky „Přijmout“ a „Jen nezbytné“ a s uložením `nezbytne` po Escape v liště.
- Úkol 19 (CI) spouští všechny `tests/e2e/*.e2e.test.mjs`.

## Cíl (měřitelný)
1. Před volbou návštěvníka **0 požadavků** na cizí domény na všech typech stránek (zachovat).
2. První vrstva lišty má „Přijmout vše“ a „Odmítnout vše“ se **shodným vypočteným stylem** a „Nastavení“ se zaškrtávátky kategorií. Zaškrtávátka nejsou předem zaškrtnutá.
3. Kategorie **analytika** a **marketing**. Reklamní signály (`ad_storage`, `ad_user_data`, `ad_personalization`), Google Ads a Sklik se zapnou **jen** se souhlasem s marketingem. Clarity dostává vždy `ad_Storage: 'denied'` a po souhlasu s analytikou nevznikne cookie `MUID` ani žádná cookie na `.bing.com`.
4. Odvolání je stejně snadné jako udělení. Zavolá `clarity('consent', false)` a smaže `_clck`, `_clsk`, `_ga`, `_ga_*` a `_gcl_*` na doméně webu i `_cltk` v `sessionStorage`. Po novém načtení odejde 0 požadavků třetím stranám.
5. Po souhlasu má každé pole formuláře a každý kontejner s údaji návštěvníka předka s `data-clarity-mask="true"`. Adresa ani kód pasu nejsou v query žádné URL.
6. Každé úspěšné odeslání poptávkového formuláře vyvolá **právě jednu** událost `generate_lead` s `lead_type`. Kliky na telefon, e-mail a WhatsApp vyvolají `contact_click` s `method`. Žádná položka `dataLayer` neobsahuje osobní údaje (test).
7. GTM se načítá, jen když publikovaný kontejner obsahuje tagy (fáze C). GA4 pak přijímá `generate_lead` a `contact_click`, což ověří zachycené požadavky `/g/collect` v Playwrightu. Požadavky se přeruší, takže do GA4 nic neodejde.
8. Lišta, blok cookies v zásadách a skutečně nastavené cookies a úložiště (skript na náhledu) se shodují. Nástroje a jejich cookies mají jediný zdroj `content/mereni.json`, nezbytné úložiště jediný zdroj v registru úkolu 09 (`content/zpracovani.json` → `uloziste_prohlizece`). Žádný seznam není nikde podruhé.
9. Na `/cenik` a `/kalkulacka-svj` (kanonické adresy po úkolu 06; Lighthouse mobil, medián z 5 běhů) lišta buď není prvkem LCP, nebo se vykreslí do 100 ms po FCP. Medián LCP se nezhorší. Lišta u návštěvníka s platnou volbou ani neblikne.

## Rozsah
**ANO:**
- `assets/souhlas.js` (lišta, kategorie, ukládání volby, Consent Mode v2, Clarity Consent API v2, odvolání, maskování, Clarity události)
- nový `content/mereni.json`, generátor `scripts/build-souhlas.mjs` a sekce `#cookies` v zásadách, **jen** blok nástrojů a odstavce o cookies
- v registru úkolu 09 (`content/zpracovani.json` → `uloziste_prohlizece`) jen: přidat `hspg-predvyplnit`, odebrat `hspg-cookies-ok`, upravit popis `hspg-souhlas` podle nového formátu volby
- odstranění adresy a kódu pasu z URL: `index.html` (kalkulačka rizika), `pas-domu.html`, `/akce/`, `/recenze/`
- statické `data-clarity-mask` v kódu, který vytváří `#hspg-form-panel` a `#hspg-dove-scene`; odstranění atributu `data-lead` z `#reklamace-potvrzeni` (úkol 04, `data-clarity-mask` zůstává)
- jednotné události: pomocník `HSPGMereni.udalost`, `contact_click`, `form_submitted` po úspěchu `hspg-fotky` (`/akce/dekujeme/`) a `hspg-reklamace` (úkol 04), oprava názvů Clarity událostí, odstranění duplicitního `lead_submit`
- úprava testů úkolů 02 (`gclid`) a 16 (popisky tlačítek, formát volby po Escape) na novou lištu, se zachováním jejich záměru
- jednořádková změna funkce `udalost` v `assets/hbot-panel.js` (delegace na pomocníka)
- napojení `maSouhlas('marketing')` z úkolu 02 na novou kategorii
- odstranění mrtvého kódu `#cookie-banner`
- LCP lišty
- skripty `scripts/kontrola-gtm.mjs` a `scripts/kontrola-cookies.mjs`
- návod a importní soubor GTM, nastavení GA4 (fáze C s majitelem)
- testy, sekce „Měření a souhlas“ v `CLAUDE.md`

**NE:**
- ostatní text zásad, právní tituly, doby uchování → **úkol 09**. Sekce `#cookies` jde ke schválení spolu se zásadami a publikuje se až po něm.
- přístupnost lišty (pořadí tabulátoru, zakrývání fokusu, Escape) → **úkol 16**. Jeho úpravy a testy musí zůstat funkční.
- skrytí lišty při tisku a scéna na `/akce/dekujeme/` → **úkol 17** (zachovat)
- zdroj návštěvy v poptávkách (`Předchozí stránka`, `Kampaň`, `Reklamní kliknutí`) → **úkol 02**. Tady jen napojení `maSouhlas`.
- vynucení CSP, inventura inline skriptů → **úkol 15**. Tady jen doplnění domén do Report-Only CSP u nástroje, který se skutečně zapne, a zápis do hlášení.
- obecný výkon, otisky souborů, cache → **úkol 07**. Tady jen LCP lišty a nenačítání prázdného GTM.
- anglické zásady a poptávka na `/en` → **úkol 18**
- přístupový token pasu domu → **úkol 14**. Tady jen to, aby kód pasu nebyl v URL odkazu na `/recenze/`. Příchozí odkaz `/recenze/?kod=…` (např. z e-mailu se žádostí o hodnocení, úkol 14) dál funguje přes cestu pro staré odkazy v kroku 9.
- nové poptávkové formuláře z úkolu 18. Tady jen pravidlo v `CLAUDE.md`, že musí volat `generate_lead`.
- zakládání účtů GA4, Google Ads a Sklik, reklamní kampaně, Facebook Pixel a jakékoli další měřicí nástroje
- produkční nasazení

## Postup

### Fáze A – soukromí a lišta (bez účtů, nic se neodesílá ven)
1. **Větev `ukol-10-cookies-mereni` z aktuální `main`.** Před začátkem `git -C ../hspg-balicek pull`.
   - Ověř `git log main --oneline`, zda jsou sloučené úkoly 02, 04, 06, 08, 16 a 17. Mění `souhlas.js`, lištu, `poptavka-zdroj.js`, adresy a šablonu. Jejich rozdělané větve neměň.
     - Pokud chybí 06, 08, 16 nebo 17, zastav se a nahlas to.
     - Bez 02 vynech napojení `maSouhlas` a úpravu jeho testu, bez 04 vše o `/reklamace/`. Obojí uveď v hlášení.
   - **Úkol 09** se do `main` slučuje až po schválení majitelem (jeho fáze C). Pokud v `main` je, postupuj podle všech kroků. Pokud ještě není, **nečekej**:
     - fáze A a B udělej bez zásahu do zásad a do `content/zpracovani.json` (krok 11 a zápis úložiště do registru odlož),
     - `build-souhlas.mjs` zatím zapisuje jen `souhlas.js` (do zásad zapisuje, jakmile jsou ve zdroji značky `COOKIES:START/END` z úkolu 09),
     - registr úkolu 09 čti bez přepnutí větve: `git show ukol-09-zasady-souhlasy:content/zpracovani.json`,
     - návrh bloku `#cookies` a změn registru dej do hlášení fáze A,
     - odložené kroky dokonči po sloučení úkolu 09 (rebase na aktuální `main`), nejpozději před fází C.
2. **Najdi v repozitáři soubory, které generují:**
   - `assets/souhlas.js`: zdroj, nebo generátor
   - build a publikovaný adresář. Komentář v živém `sw.js` uvádí `scripts/build-site.mjs` → `dist/`, ověř to v `netlify.toml` a `package.json`.
   - homepage: inline skript s `renderFormInner`, `submitLead`, `renderCta`, kalkulačkou rizika (`#rz-cta`) a mrtvým kódem `#cookie-banner`
   - `/akce/` (čtení `adresa`, `lead_funnel_step`, `generate_lead` před přesměrováním), `/akce/dekujeme/` (`hspg-fotky`), `/recenze/` (`review_submitted`, čtení `kod`), `pas-domu.html`, `/reklamace/` z úkolu 04 (`hspg-reklamace`, `#reklamace-potvrzeni`), pokud existuje
   - `assets/holub-let.js`, `assets/hbot-panel.js` (úkol 01), `assets/poptavka-zdroj.js` (úkol 02, funkce `maSouhlas`)
   - zásady: jak je po úkolu 09 generovaná sekce `#cookies`
   - sdílenou šablonu hlavičky/patičky z úkolu 08 a případně hlavy stránky
   - `docs/ads-plan.md`, pokud existuje, a zda je `docs/` mimo publikovaný adresář
   - testy, které se lišty dotýkají: `grep -rlnE "souhlas-lista|hspg-souhlas|data-souhlas-nastaveni" tests/`

   Pokud se HTML generuje skriptem, uprav generátor, ne výstup.
3. **Stav před změnou** (do hlášení):
   - Lighthouse mobil `/cenik` a `/kalkulacka-svj` (kanonické adresy, ne `.html` s přesměrováním) stejným nástrojem jako v úkolu 07, medián z 5 běhů, bez uloženého souhlasu: LCP, FCP, prvek LCP, CLS
   - výsledky stávajících testů (úkoly 02, 16, 17 a testy balíčku)
4. **Jediný zdroj `content/mereni.json`** pro nástroje měření. Z něj se generuje konfigurace v `souhlas.js` a blok nástrojů v `#cookies` zásad. Nezbytné úložiště (bez souhlasu) má jediný zdroj v registru úkolu 09 (`uloziste_prohlizece`), do `mereni.json` ho nekopíruj. Kostra (ID nejsou tajemství, jsou veřejně v kódu stránky):
   ```json
   {
     "verze": "2026-10-a",
     "platnost_volby_dni": 365,
     "kategorie": {
       "analytika": { "nazev": { "cs": "Analytika", "en": "Analytics" }, "popis": { "cs": "…", "en": "…" } },
       "marketing": { "nazev": { "cs": "Marketing", "en": "Marketing" }, "popis": { "cs": "…", "en": "…" } }
     },
     "nastroje": [
       { "id": "clarity", "kategorie": "analytika", "aktivni": true, "projekt": "yp2o44eo6r",
         "prijemce": "microsoft", "ucel": { "cs": "…", "en": "…" },
         "cookies": [ { "nazev": "_clck", "domena": "doména webu", "platnost": "[podle kontroly v kroku 12]", "strana": "první" } ],
         "uloziste": [ { "nazev": "_cltk", "typ": "sessionStorage" } ] },
       { "id": "gtm-ga4", "kategorie": "analytika", "aktivni": false, "gtm": "GTM-TDTGMBRK", "ga4": "[DOPLNIT: G-… od majitele]", "cookies": [] },
       { "id": "google-ads", "kategorie": "marketing", "aktivni": false, "konverze": "[DOPLNIT]" },
       { "id": "sklik", "kategorie": "marketing", "aktivni": false, "konverze": "[DOPLNIT]" }
     ]
   }
   ```
   Pravidla:
   - Nástroj s `aktivni: false` se nenačítá a nezmiňuje v liště ani v tabulce. Do `souhlas.js` se generují **jen aktivní** nástroje, takže `[DOPLNIT` se do publikovaných souborů nedostane (brána `build-zasady.mjs --brana` z úkolu 09 by jinak zablokovala produkci).
   - `prijemce` je klíč z `prijemci` v registru úkolu 09. Název poskytovatele a předání mimo EHP generátor bere odtud, sám je nevymýšlej ani nepiš natvrdo.
   - Kategorie se v liště zobrazí, jen když má aspoň jeden aktivní nástroj. Marketing se proto objeví až s reklamou (fáze C). Žádat souhlas s účelem, který se nepoužívá, je klamavé. Proto audit doporučuje odstranit „účinnost reklam“, dokud reklamy neběží.
   - Platnosti cookies nevymýšlej, doplň je z výstupu kroku 12.
   - **Nezbytné úložiště** (registr úkolu 09, `uloziste_prohlizece`): projdi `grep` `localStorage`/`sessionStorage` ve zdroji a zajisti, aby tam byly všechny skutečné klíče. Přidej `hspg-predvyplnit` (`sessionStorage`, „předání adresy nebo kódu do formuláře, o který návštěvník požádal“), odeber `hspg-cookies-ok` (mrtvý kód, krok 6) a u `hspg-souhlas` uveď, že volba platí `platnost_volby_dni` dní. Pokud úkol 09 ještě není v `main`, jen do hlášení (krok 1).
5. **`scripts/build-souhlas.mjs`** (vzor `build-hbot.mjs` z úkolu 01):
   - z `content/mereni.json` vygeneruje konfigurační blok v `assets/souhlas.js` mezi značkami `/* KONFIGURACE:START */ … /* KONFIGURACE:END */` (žádný další požadavek na síť)
   - vygeneruje blok nástrojů v sekci `#cookies` zásad mezi značkami `<!-- COOKIES:START -->` a `<!-- COOKIES:END -->`, hned vedle bloku `ZPRACOVANI:ULOZISTE` z úkolu 09. Stejný tvar jako bloky úkolu 09 (karty `<dl>`, bez vodorovného posunu na 360 px). Bloky úkolu 09 nepřepisuje. Pokud značky ve zdroji zásad ještě nejsou (úkol 09 není v `main`), zásady nezapisuje a vypíše „zásady přeskočeny“.
   - `--kontrola` skončí kódem 1, pokud výstupy nejsou aktuální
   - přidej ho do build příkazu vedle `build-hbot.mjs`
6. **Lišta a souhlas (`assets/souhlas.js`)**:
   - **První vrstva:** nadpis, krátký pravdivý text z konfigurace (jen aktivní nástroje podle kategorií), tlačítka „Přijmout vše“ a „Odmítnout vše“ a odkaz „Podrobnosti“ na `/ochrana-osobnich-udaju#cookies` (na `lang=en` „Details“ na `/ochrana-osobnich-udaju#english`, předávka z úkolu 09).
     - Obě tlačítka mají stejnou třídu a stejný vzhled. Zvol neutrální, kontrastní styl, který projde testem úkolu 16.
     - Třetí tlačítko „Nastavení“ otevře v téže liště zaškrtávátka aktivních kategorií (výchozí stav nezaškrtnuto) a „Uložit volbu“.
     - Pořadí v DOM: odkaz „Podrobnosti“, „Přijmout vše“, „Odmítnout vše“, „Nastavení“ (pořadí zastávek z úkolu 16 tím zůstane).
     - Česky s nezlomitelnými mezerami (`KONTEXT.md` §4.9), pro `lang=en` anglicky.
     - Větu o maskování napiš až po zelených testech kroku 10, např. „Pole formulářů a okno pomocníka jsou při měření skrytá.“
   - **Zachovej:**
     - umístění a ovládání z úkolu 16 (pořadí tabulátoru, `scroll-padding`, Escape). Escape v první vrstvě při první návštěvě = „Odmítnout vše“ (uloží odmítnutí v novém formátu), nikdy souhlas. Escape po znovuotevření lištu zavře beze změny.
     - skrytí při tisku z úkolu 17
     - zobrazení až po úvodní animaci na homepage a nezobrazení během scény holuba na `/akce/dekujeme/` (úkol 17)
     - otevření lišty odkazem `data-souhlas-nastaveni`, a to s fokusem na první tlačítko a s předvyplněnou aktuální volbou
     - registraci service workeru
   - **Testy úkolu 16** uprav jen tam, kde se mění popisky a formát: „Přijmout“ → „Přijmout vše“ (dál nejpozději 3. zastávka), „Jen nezbytné“ → „Odmítnout vše“ (dál nejpozději 4. zastávka), po Escape se čeká uložené odmítnutí (`analytika:false, marketing:false`) místo `nezbytne`. Ostatní kontroly 16 se nemění. Diff testů dej do hlášení.
   - **Uložení volby:** `localStorage['hspg-souhlas']` = `{"v":2,"verze":"…","analytika":false,"marketing":false,"cas":"ISO"}`.
     - Stará hodnota `nezbytne` = odmítnutí, `cas` = teď (testy úkolu 08 ji dál používají).
     - Stará hodnota `analytika` = **zeptat se znovu**, do volby se nic nenačte. Starý souhlas zahrnoval i reklamní signály a nástroje a účely se mění.
     - Znovu se ptej po `platnost_volby_dni` a při změně `verze`, pokud původní volba něco povolila.
   - **Rozhraní pro ostatní skripty:**
     - `window.HSPGSouhlas = { ma(kategorie), volba(), otevri() }`
     - po každé změně `document.dispatchEvent(new CustomEvent('hspg:souhlas', { detail: volba }))`
     - `maSouhlas('marketing')` z úkolu 02 přepoj na `HSPGSouhlas.ma('marketing')`
     - test úkolu 02 s `gclid` uprav na nový formát (`marketing: true`)
   - **Načítání nástrojů:**
     - **Clarity** jen s analytikou: tag, potom `clarity('consentv2', { analytics_Storage: 'granted', ad_Storage: 'denied' })`. `ad_Storage` je **vždy** `denied`, protože web nepoužívá reklamu Microsoftu. Staré `clarity('consent')` odstraň.
     - **GTM** jen pokud je `gtm-ga4.aktivni` a návštěvník povolil analytiku nebo marketing. Pořadí:
       1. `gtag('consent','default', vše 'denied')`
       2. `gtag('consent','update', { analytics_storage: A, ad_storage: M, ad_user_data: M, ad_personalization: M })`
       3. `gtag('set','ads_data_redaction', !marketing)`
       4. push `gtm.js` a vložení skriptu

       `granted` u `ad_*` jen při souhlasu s marketingem. Žádný „rozšířený“ Consent Mode (pingy bez souhlasu).
     - Přidání kategorie během návštěvy zapne nástroj bez nového načtení stránky. Odebrání kategorie spustí odvolání.
   - **Odvolání** (odebrání kterékoli kategorie):
     1. Pokud běží Clarity nebo existují její cookies: `clarity('consentv2', { analytics_Storage: 'denied', ad_Storage: 'denied' })` a `clarity('consent', false)`. Podle dokumentace Microsoftu to maže cookies Clarity.
     2. `gtag('consent','update', …'denied')` pro odebrané kategorie.
     3. Smaž first-party cookies nástrojů z konfigurace (`_clck`, `_clsk`, `_ga`, `_ga_*`, `_gcl_*`) s `path=/`, bez `domain` i pro každou nadřazenou doménu `location.hostname` (na produkci `.hspg.cz`, na náhledu doména náhledu).
     4. Smaž `sessionStorage` `_cltk` a další klíče nástrojů zjištěné v kroku 12.
     5. Znovu načti stránku (zachovat).

     Cookies na doménách třetích stran web smazat neumí. Proto jim předchází `ad_Storage: 'denied'`. V zásadách to napiš pravdivě, jen pokud je kontrola v kroku 12 najde.
   - **Mrtvý kód:** odstraň práci s `#cookie-banner` v `souhlas.js` a v homepage CSS `#cookie-banner` a JS `hspg-cookies-ok` / `prijmoutCookies`.
7. **LCP lišty** (`audit-vykon.json` #11). Zvol variantu a zdůvodni ji v hlášení:
   - **Varianta A** (přednostně, pokud úkol 08 zavedl sdílenou šablonu pro všechny stránky):
     - Statické HTML první vrstvy je v šabloně na místě v DOM, kam lištu umístil úkol 16, ve výchozím stavu skryté přes CSS. CSS lišty je ve sdíleném stylu (včetně pravidla pro tisk z úkolu 17).
     - Inline skript v `<head>` (≤ 300 B, `try/catch`, při chybě zobrazit) přidá `<html>` třídu `sl-ukaz`, když není platná volba. Zobrazí se pak už s prvním vykreslením. Výjimky zůstávají: na homepage až po úvodní animaci, na `/akce/dekujeme/` až po scéně (úkol 17) – tam třídu přidá až `souhlas.js`.
     - `souhlas.js` jen připojí ovládání.
     - Bez JS lišta zůstane skrytá (bez JS se žádný nástroj nespustí).
     - Hash `sha256` inline skriptu zapiš do hlášení pro úkol 15 (CSP).
   - **Varianta B:** lišta se dál vkládá z JS, ale text první vrstvy bude kratší a rozdělený tak, aby jeho blok nebyl největším prvkem první obrazovky. Ověř, že prvkem LCP je pak obsah stránky.
8. **Maskování** (`audit-pravni_pravdivost.json` #7):
   - Statické `data-clarity-mask="true"` dej:
     - na každý `<form>` ve zdroji
     - do kódu, který vytváří `#hspg-form-panel` (`renderFormInner`) a `#hspg-dove-scene` (`holub-let.js`)
     - na každý další prvek, který zobrazuje údaje zadané návštěvníkem. Hledej ve zdroji `state.name`, `opts.address`, `textContent` / `innerHTML` s hodnotami z formulářů.
   - Ověř `data-clarity-mask` na `#hbot` z úkolu 01.
   - `mask()` v `souhlas.js`:
     - selektor `form, input, textarea, select, [contenteditable]` (zruš `[data-lead]`; jediný výskyt po úkolu 04 je `#reklamace-potvrzeni`, ten atribut odstraň, jeho `data-clarity-mask="true"` ho chrání dál)
     - spustit **před** vložením tagu Clarity
     - `MutationObserver` (subtree) maskuje i později přidané prvky
   - Režim maskování v administraci Clarity nastavuje majitel (fáze C). Kód musí chránit údaje v každém režimu.
9. **Osobní údaje v URL**:
   - `#rz-cta` (homepage) a odkaz „Objednat službu“ v `pas-domu.html`: při kliku ulož `sessionStorage['hspg-predvyplnit'] = {"adresa":"…"}` a odkaz vede na čisté `/akce/`.
   - Odkaz „Ohodnotit naši práci“: `{"kod":"…"}` a čisté `/recenze/`.
   - `/akce/` a `/recenze/` hodnotu přečtou, předvyplní a klíč smažou.
   - **Staré odkazy** (záložky, sdílené URL): parametr `adresa` / `kod` přečti, předvyplň a hned `history.replaceState` bez něj. Ostatní parametry (např. `utm_*`) zachovej.
   - Pojistka v `souhlas.js`: před načtením jakéhokoli nástroje odstraní z URL parametry `adresa`, `kod`, `q`, `jmeno`, `email`, `telefon`, `tel` (`replaceState`).
   - Úložiště slouží jen službě, o kterou návštěvník požádal. Zapiš ho do `uloziste_prohlizece` registru úkolu 09 (krok 4).
10. **Testy fáze A** (adresář testů webu, `node --test`, Playwright jako v úkolu 02; testy se nesmí publikovat):
    - `tests/souhlas.test.mjs`. Funkce `souhlas.js` zpřístupni pro test bez změny chování na webu, např. načtení přes `node:vm`. Pokrytí:
      - převod uložené volby: `nezbytne` → odmítnutí, `analytika` → znovu se ptát, prošlá → znovu, změna `verze` → znovu jen při dřívějším povolení
      - `vycistiUrl` (odstraní `adresa`/`kod`/…, zachová `utm_*`)
      - seznam domén pro mazání cookies (`hspg.cz`, `www.hspg.cz`, adresa náhledu)
      - `build-souhlas.mjs --kontrola`
    - `tests/e2e/souhlas.e2e.test.mjs` (přípona `.e2e.test.mjs`, aby ho spouštěla CI z úkolu 19):
      - lokální server nad publikovaným adresářem `$PUB` po buildu (jako testy úkolů 02 a 16), **všechny požadavky na cizí domény zachycené**: tag Clarity a `gtm.js` nahraď pahýly, které zapisují volání do `window.__volani`
      - POST na `/` odpověz 200, nic nesmí odejít ven
      - testovací konfigurace s aktivním GTM a s aktivním marketingovým nástrojem pro scénáře 4 a 5

      Scénáře:
      1. `/`, `/akce/`, `/cenik`, `/kalkulacka-svj`, `/recenze/`, `/en` a jedna okresní stránka: před volbou 0 požadavků na cizí domény, lišta je vidět. Text lišty neobsahuje „Tag Manager“, „Google“ ani „reklam“ (dokud příslušný nástroj není aktivní).
      2. „Přijmout vše“ a „Odmítnout vše“: shodné `getComputedStyle` (`background-color`, `background-image`, `color`, `border`, `font-size`, `font-weight`, `min-height`, `padding`).
      3. „Odmítnout vše“ → 0 požadavků ven, uložené `analytika:false, marketing:false`. Po novém načtení se lišta nezobrazí ani na okamžik (`MutationObserver` z `addInitScript` sleduje vložení `#souhlas-lista` i třídu `sl-ukaz` na `<html>`).
      4. Nastavení → jen analytika:
         - pahýl Clarity dostal `consentv2` s `analytics_Storage:'granted'` a `ad_Storage:'denied'` a nikdy `consent` bez argumentu
         - v `dataLayer` je `analytics_storage:'granted'`, všechna `ad_*` `'denied'` a `ads_data_redaction: true`
      5. Marketing: `ad_*` jsou `granted` jen tehdy. `HSPGSouhlas.ma('marketing') === true` a při URL s `?gclid=TEST` je pole `Reklamní kliknutí` z úkolu 02 v odeslaném (zachyceném) payloadu.
      6. Odvolání:
         - předem nastav cookies `_clck`, `_clsk`, `_ga`, `_ga_TEST` a `sessionStorage` `_cltk`
         - „Nastavení cookies“ → „Odmítnout vše“
         - pahýl dostal `consent,false`, cookies i `_cltk` zmizely, po načtení 0 požadavků ven
      7. Stará hodnota `analytika` → lišta se zobrazí a nic se nenačte.
      8. Maskování: po souhlasu otevři H-BOT, napiš dotaz, projdi průvodce na homepage až k poděkování (POST zachycený), otevři `/akce/` a `/recenze/`. Každý `input`, `textarea` a `select` i `#hbot`, `#hspg-form-panel` a `#hspg-dove-scene` mají předka nebo sebe s `[data-clarity-mask="true"]`.
      9. URL:
         - `/akce/?adresa=TEST%20Ulice%201&utm_source=t` → pole adresy předvyplněné, `location.search === '?utm_source=t'`
         - kalkulačka rizika → `#rz-cta` → `/akce/` bez query a s předvyplněnou adresou
         - odkazy v pasu domu (`/pas-domu`) neobsahují `?adresa=` ani `?kod=`
         - `/recenze/?kod=HS-TEST&utm_source=t` → kód předvyplněný, `location.search === '?utm_source=t'`
      10. `/ai-centrum/` a `/rd-control-panel/` nenačítají `souhlas.js` ani žádný nástroj.
11. **Sekce `#cookies` v zásadách** (jen pokud je úkol 09 v `main`, jinak do hlášení, viz krok 1):
    - Do zdroje zásad (nebo do šablony generátoru úkolu 09) vlož značky `COOKIES:START/END` vedle bloku `ZPRACOVANI:ULOZISTE` a spusť `build-souhlas.mjs`.
    - Vygenerovaný blok obsahuje jen aktivní nástroje: název, poskytovatel a předání mimo EHP (z `prijemci` registru 09), účel, kategorie, cookies s doménou a platností. Nezbytné úložiště uvádí blok `ZPRACOVANI:ULOZISTE` úkolu 09, neopakuj ho.
    - Dál odstavec o odvolání přes „Nastavení cookies“.
    - Dokud GTM a GA4 nejsou aktivní, zásady je neuvádějí. Odstavec o nich (úkol 09 ho převzal beze změny) odstraň, ve fázi C se vrátí.
    - Text předlož ke schválení spolu se zásadami (úkol 09) a nepublikuj ho samostatně.
12. **`scripts/kontrola-cookies.mjs <url>`** (Playwright, skutečná síť):
    - **přeruší každý POST** a každý požadavek na `*/g/collect*`
    - nikdy nevyplňuje formuláře
    - scénáře: jen analytika → výpis cookies všech domén a klíčů `localStorage`/`sessionStorage`, potom odvolání → výpis
    - porovná výsledek s `content/mereni.json` (cookies a úložiště nástrojů) a s `uloziste_prohlizece` registru úkolu 09 (nezbytné klíče; dokud 09 není v `main`, s jeho kopií přes parametr `--registr <soubor>` z `git show ukol-09-zasady-souhlasy:content/zpracovani.json`). Kódem 1 skončí, když vznikne cookie nebo klíč, který není v žádném zdroji, nebo když po souhlasu nevznikne cookie aktivního nástroje uvedená v `mereni.json`. Nezbytné klíče, které vznikají až po akci návštěvníka (např. `hspg-holub-lead`), jen vypíše jako „nevzniklo bez interakce“.
    - spusť na náhledu (`npm run nahled`, 0 kreditů), doplň platnosti cookies do `content/mereni.json` a výstup vlož do hlášení

    Při přerušených POST se záznam relace do Clarity neodešle. V síťovém výpisu ověř, že žádný požadavek na `*/collect` neprošel.
    **Pokud `MUID` nebo cookie na `.bing.com` vznikne i s `ad_Storage: 'denied'`, zastav se a nahlas to.** Rozhodne majitel: buď Clarity vypnout, nebo cookie pravdivě uvést v zásadách.
13. Náhled `npm run nahled`, Lighthouse po změně (stejně jako v kroku 3), všechny testy, `node scripts/kontrola-adres.mjs` (úkol 06). **Hlášení fáze A a zastav se.**

### Fáze B – události a příprava měření (bez účtů)
14. **Pomocník `window.HSPGMereni.udalost(nazev, parametry)`** v `souhlas.js`:
    - povolené názvy a klíče parametrů podle tabulky níže, neznámý název ani klíč neprojde
    - hodnoty: řetězec ≤ 100 znaků (delší zahoď, nezkracuj), konečné číslo nebo boolean. Zahoď řetězec s `@`, řetězec i číslo s 6 a více číslicemi za sebou a jiné typy (objekty, pole).
    - u `generate_lead` bez `form_name` ho doplní podle `lead_type` (`callback_hbot` → `hspg-zavolejte`; H-BOT ho sám neposílá a jeho soubor se mění jen ve funkci `udalost`)
    - vždy `dataLayer.push`. Lokálně, bez GTM nic neodejde.
    - pokud běží Clarity, `clarity('event', <název pro Clarity>)`

    Kontrakt událostí (zapiš do `docs/mereni/plan-mereni.md`; `docs/` je mimo publikovaný adresář jako v úkolu 09, pokud není, zastav se a nahlas to):

    | Událost | Kde | Parametry | Klíčová v GA4 | Clarity |
    |---|---|---|---|---|
    | `generate_lead` | úspěšné odeslání `hspg-poptavka`, `hspg-akce`, `hspg-zavolejte` a každého dalšího poptávkového formuláře | `lead_type`, `form_name`, `service` | ano | `formular_<form_name>` |
    | `contact_click` | klik na `tel:`, `data-mail`, `wa.me` | `method` (`tel`/`email`/`whatsapp`), `placement` | ano | `telefon` / `email` / `whatsapp` |
    | `lead_funnel_step` | průvodce, `/akce/` | `step_number`, `step_name`, `dry_days` | ne | – |
    | `hero_service_selected` | homepage | `service` | ne | – |
    | `review_submitted` | `/recenze/` | `rating`, `has_code` | ne | `hodnoceni` |
    | `form_submitted` | `hspg-fotky` a `hspg-reklamace` (úkol 04, pokud existuje) | `form_name` | ne | `formular_<form_name>` |
    | `hbot_open`, `hbot_odpoved`, `hbot_cta` | H-BOT | `majitel`, `zdroj`, `overeno`, `cil` | ne | – |
    | `video_play`, `video_complete` | homepage | `video` | ne | – |

    `placement` je identifikátor místa, nikdy text odkazu. Určí se podle nejbližšího předka v tomto pořadí: `#hbot` → `hbot`, `#cta-stack` → `cta-stack`, `#hspg-lista` → `hspg-lista`, `header` (sdílená hlavička z úkolu 08) → `hlavicka`, `footer` (sdílená patička) → `paticka`, `section[id]` → jeho `id`, jinak `obsah`.
15. **Zapojení:**
    - Přímé `dataLayer.push` v homepage, `/akce/`, `/recenze/` a ve videích nahraď voláním `(window.HSPGMereni ? HSPGMereni.udalost : záložní push)(…)`.
    - V `hbot-panel.js` změň jen tělo funkce `udalost` (delegace s dosavadní zálohou). Pokud by to rozbilo testy balíčku, nech soubor beze změny a uveď to.
    - `lead_submit` odstraň (kontejner je prázdný, nic na něm nezávisí). `generate_lead` na homepage dostane `service` a `form_name`.
    - `generate_lead` na `/akce/` před přesměrováním: pokud běží GTM, použij `eventCallback` s `eventTimeout: 1500` a přesměruj v callbacku. Jinak přesměruj hned. Nikdy nečekej déle než 1,5 s.
    - `contact_click`: delegovaný posluchač kliknutí (fáze capture) v `souhlas.js`. Pokrývá i odkazy vytvořené později (`renderCta`, H-BOT).
    - `form_submitted { form_name }` po úspěšném odeslání `hspg-fotky` (`/akce/dekujeme/`) a `hspg-reklamace` (`/reklamace/`, úkol 04, pokud existuje). Jen jedno volání `udalost` v místě úspěchu, logiku formulářů a scény z úkolu 17 neměň.
    - Clarity: `#cta-main` → `plovouci_menu`. Posluchač nativního `submit` odstraň, formulářové události jdou jen přes `udalost` po úspěchu.
16. **GTM do aktivace vypnutý:** `gtm-ga4.aktivni: false` → `gtm.js` se vůbec nenačte (`audit-vykon.json` #9, varianta a).
    `scripts/kontrola-gtm.mjs` (jen GET):
    - stáhne `gtm.js?id=<gtm>`, vypíše `"version"` kontejneru, spočítá `"tags"` a najde ID `G-…`
    - skončí kódem 1, když `aktivni: true` a tagů je 0 nebo ID nesouhlasí s `content/mereni.json`
    - při `aktivni: false` vypíše „GTM vypnutý – nenačítá se“
17. **Návod pro GTM a GA4** `docs/mereni/gtm-nastaveni.md` (mimo publikovaný adresář):
    - **Proměnné:**
      - konstanta `GA4 ID`
      - proměnné vrstvy dat pro parametry z tabulky
      - vlastní JS proměnná „Stránka bez osobních údajů“: `page_location` bez parametrů `adresa`, `kod`, `q`, `jmeno`, `email`, `telefon`, `tel`
    - **Google tag (GA4):** `page_location` = ta proměnná, souhlas navíc vyžaduje `analytics_storage`.
    - **Událost GA4:** jeden tag s názvem `{{Event}}`, spouštěč Custom Event s regulárním výrazem `^(generate_lead|contact_click|lead_funnel_step|hero_service_selected|review_submitted|form_submitted|hbot_open|hbot_odpoved|hbot_cta|video_play|video_complete)$`, parametry z tabulky.
    - **Reklamní tagy** v tomto návodu nejsou (fáze C, krok 25).
    - **Volitelně** `docs/mereni/gtm-import.json` (formát exportu GTM, `exportFormatVersion: 2`), jen pokud ho dokážeš sestavit tak, aby šel importovat. Import do nového pracovního prostoru nic nepublikuje. Jinak stačí návod.
18. **Testy fáze B** (doplň `tests/e2e/souhlas.e2e.test.mjs`):
    - klik na `tel:` v patičce → `contact_click {method:'tel', placement:'paticka'}`. Stejně `data-mail` → `email` a WhatsApp v `#cta-stack` → `whatsapp`.
    - odeslání průvodce na homepage, `/akce/` a H-BOT „Zavolejte mi“ s daty `TEST` (POST zachycený) → u každého **právě jedna** `generate_lead` se správným `lead_type` a `form_name` (`hspg-poptavka`, `hspg-akce`, `hspg-zavolejte`)
    - odeslání `hspg-fotky` na `/akce/dekujeme/` (POST zachycený, testovací obrázek) → právě jedna `form_submitted`, žádná `generate_lead`
    - `JSON.stringify(window.dataLayer)` po všech scénářích neobsahuje testovací jméno, telefon, e-mail ani adresu
    - pahýl Clarity dostal `formular_hspg-poptavka`, `formular_hspg-akce`, `formular_hspg-zavolejte` a `plovouci_menu`, a žádné `vypustit_holuba`
    - jednotkový test filtru parametrů v `tests/souhlas.test.mjs` (zahodí `@`, 6+ číslic v řetězci i čísle, řetězec nad 100 znaků, objekt, neznámý klíč; propustí číslo a boolean; doplní `form_name` u `callback_hbot`)
19. **`CLAUDE.md` – sekce „Měření a souhlas“:**
    - nové měřicí nástroje jen přes `content/mereni.json` a se souhlasem
    - osobní údaje nikdy v query URL (předávat přes `hspg-predvyplnit`)
    - každý nový poptávkový formulář volá `HSPGMereni.udalost('generate_lead', { lead_type, form_name })` po úspěchu
    - kontejnery s údaji návštěvníka mají `data-clarity-mask="true"`
    - žádné `clarity('identify')`, GA4 `user_id` ani „rozšířené konverze“ s e-mailem nebo telefonem
20. Náhled, testy. **Hlášení fáze B a zastav se.**

### Fáze C – aktivace s majitelem (náhledové nasazení, produkce jen po schválení)
21. **Majitel (podle návodu z hlášení):**
    - **GA4:** založí property „hspg.cz“ (časové pásmo Praha, měna CZK) a webový stream a pošle ID měření `G-…`. ID není tajemství, ale nevymýšlej ho.
    - **Nastavení GA4:**
      - Google signály vypnuté
      - personalizace reklam vypnutá, dokud neběží marketing
      - doba uchování dat [DOPLNIT: 2 nebo 14 měsíců – rozhodne majitel]
      - vlastní dimenze (rozsah událost) `lead_type`, `service`, `form_name`, `method`, `placement`, `step_name`, `zdroj`
      - po prvních událostech označit `generate_lead` a `contact_click` jako klíčové
    - **Clarity:** pošle snímek nastavení maskování a souhlasu. Doporučení: Balanced stačí díky maskování v kódu, Strict je nejbezpečnější a rozhodne majitel.
22. **GTM:** majitel podle návodu (nebo importu) připraví pracovní prostor. Ověří ho v režimu Preview (Tag Assistant) na adrese náhledu a publikuje verzi „Úkol 10 – GA4“. Agent nic nepublikuje bez majitele.
23. **Agent:**
    - doplní `ga4` a `aktivni: true` do `content/mereni.json`, `node scripts/build-souhlas.mjs`
    - `node scripts/kontrola-gtm.mjs` → tagů ≥ 1, ID souhlasí
    - lišta teď uvádí Google Analytics v kategorii analytika a blok cookies v zásadách `_ga` a `_ga_<id>`. Platnosti doplní `kontrola-cookies.mjs` na náhledu. Text zásad jde ke schválení majiteli.
24. **`tests/e2e/ga4-zive.test.mjs`** (spouští se jen s `HSPG_ZIVE_URL=<náhled>`, bez něj se přeskočí; přípona záměrně bez `.e2e`, aby ho CI z úkolu 19 nespouštěla):
    - skutečný kontejner, souhlas jen s analytikou, POST formulářů zachycené (odpověď 200)
    - **všechny požadavky `*/g/collect*` zachytit, přečíst (`en`, `ep.*`, `epn.*`, `dl`) a přerušit**, do GA4 nic neodejde
    - ověř `en=page_view`, `en=generate_lead` s `ep.lead_type` u 3 poptávkových formulářů a `en=contact_click` s `ep.method=tel`
    - `dl` nikdy neobsahuje `adresa=` ani `kod=`
    - žádný požadavek neobsahuje testovací jméno, telefon, e-mail ani adresu
    - po odmítnutí 0 požadavků na `googletagmanager.com`
25. **Marketing – jen pokud majitel potvrdí, že reklamy běží nebo poběží, a dodá ID** (podle `docs/ads-plan.md`, pokud existuje). Jinak tento krok přeskoč a uveď to v hlášení.
    - **Google Ads:** konverzní tag (`AW-…/štítek`) na `generate_lead` a `contact_click` (`method=tel`) a Conversion Linker. Oba s dodatečným souhlasem `ad_storage` a `ad_user_data`. Bez rozšířených konverzí.
    - **Sklik:** konverze přes GTM (`https://c.seznam.cz/js/rc.js`, `consent: 1`) jen při souhlasu s marketingem.
      - Seznam doporučuje spouštět kód i bez souhlasu s `consent: 0`. Web ale před souhlasem nic třetím stranám neposílá. Zda to změnit, rozhodne majitel s právníkem, ty nic takového nezapínej.
    - nástroj `aktivni: true` → v liště se objeví kategorie marketing
    - do Report-Only CSP doplň jen domény, které zapnutý nástroj skutečně volá (zjisti z výstupu `kontrola-cookies.mjs` a z hlášení CSP), a zapiš je pro úkol 15
    - zásady ke schválení
26. Lighthouse `/cenik` bez souhlasu (nemá se změnit) a s uloženým souhlasem s analytikou (pro informaci), velikost přenosu GTM + GA4. **Hlášení fáze C.**

## Akceptační kritéria
**Fáze A**
Kontroly `git grep` vynechávají testy a dokumentaci (testy a návody tyto řetězce obsahovat smějí a musí): pathspec `-- . ':!tests' ':!docs' ':!CLAUDE.md'`.

- [ ] `node scripts/build-souhlas.mjs --kontrola` → OK. `content/mereni.json` je platný JSON.
- [ ] `node --test tests/souhlas.test.mjs` a `tests/e2e/souhlas.e2e.test.mjs`: vše prošlo (uveď počty). Během testů neodešel žádný požadavek mimo lokální server (test to ověřuje).
- [ ] Testy úkolů 02, 16 a 17 a testy balíčku dál procházejí (příkazy v Ověření, uveď počty; u 02 a 16 jen úpravy z kroků 6 a 10).
- [ ] `git grep -nE "clarity\('consent'\)" -- . ':!tests' ':!docs' ':!CLAUDE.md'` → nic (zůstává jen `consentv2` a `consent', false`).
- [ ] `git grep -nE "\?adresa=|\?kod=" -- '*.html' '*.js' ':!tests' ':!docs'` → nic.
- [ ] `git grep -nE "cookie-banner|hspg-cookies-ok|prijmoutCookies|data-lead" -- . ':!tests' ':!docs' ':!CLAUDE.md'` → nic.
- [ ] `grep -c "\[DOPLNIT" "$PUB/assets/souhlas.js"` → 0 (do lišty jdou jen aktivní nástroje).
- [ ] Text lišty neobsahuje „Tag Manager“, „Google“ ani „reklam“, dokud příslušný nástroj není aktivní (scénář 1 testu čte text lišty).
- [ ] `node scripts/kontrola-cookies.mjs <náhled>` → kód 0 (shoda s `content/mereni.json` a registrem úkolu 09). Po odvolání 0 cookies nástrojů na doméně náhledu. Žádné `MUID` ani cookie na `.bing.com` (výstup v hlášení).
- [ ] Lighthouse mobil `/cenik` a `/kalkulacka-svj` (medián z 5): prvek LCP není `#souhlas-lista …`, nebo je vykreslen do 100 ms po FCP. LCP ani CLS se nezhoršily (tabulka před/po).
- [ ] `node scripts/kontrola-adres.mjs` (úkol 06) → 0 nálezů.
- [ ] Pokud je úkol 09 v `main`: zdroj zásad obsahuje značky `COOKIES:START/END` a `node scripts/build-zasady.mjs --kontrola` → kód 0. Pokud není: v hlášení je návrh bloku `#cookies` a změn registru a uvedeno, že kroky 4 (úložiště) a 11 čekají na sloučení úkolu 09.

**Fáze B**
- [ ] Testy událostí (krok 18) prošly. `generate_lead` právě 1× na formulář, `form_submitted` 1× u `hspg-fotky`, `contact_click` pro `tel`/`email`/`whatsapp`, `dataLayer` bez osobních údajů.
- [ ] `git grep -nE "lead_submit|vypustit_holuba" -- . ':!tests' ':!docs' ':!CLAUDE.md'` → nic.
- [ ] `node scripts/kontrola-gtm.mjs` → „GTM vypnutý – nenačítá se“. Na náhledu po souhlasu 0 požadavků na `googletagmanager.com` (test).
- [ ] `test -f docs/mereni/plan-mereni.md && test -f docs/mereni/gtm-nastaveni.md && test ! -e "$PUB/docs"` → kód 0.

**Fáze C**
- [ ] `node scripts/kontrola-gtm.mjs` → verze ≥ 2, tagů ≥ 1, ID `G-…` = `content/mereni.json`.
- [ ] `HSPG_ZIVE_URL=<náhled> node --test tests/e2e/ga4-zive.test.mjs` → prošlo. Zachycené `generate_lead` (3 typy) a `contact_click`, `dl` bez `adresa=`/`kod=`, žádné osobní údaje. Všechny `/g/collect` přerušené.
- [ ] `node scripts/kontrola-cookies.mjs <náhled>` po aktivaci → kód 0 a `node scripts/build-souhlas.mjs --kontrola` → OK (blok v zásadách odpovídá `content/mereni.json`).
- [ ] Marketing: buď aktivní s testem „`ad_*` granted a Sklik/Ads požadavky jen při souhlasu s marketingem“, nebo v hlášení uvedeno, že majitel reklamy nepotvrdil a kategorie se nezobrazuje.

## Ověření
```bash
PUB=<publikační adresář z netlify.toml>                             # build podle netlify.toml před testy
node scripts/build-souhlas.mjs --kontrola                          # OK
node --test tests/souhlas.test.mjs                                  # pass N, fail 0
PUB=$PUB CHROMIUM=<cesta> node --test tests/e2e/souhlas.e2e.test.mjs   # pass N, fail 0, 0 externích požadavků
CHROMIUM=<cesta> node --test tests/e2e/formulare.test.mjs           # úkol 02 dál prochází (gclid s novým formátem)
node --test tests/pristupnost-staticke.test.mjs && A11Y_RYCHLE=1 PUB=$PUB CHROMIUM=<cesta> node --test --test-concurrency=1 tests/e2e/pristupnost.e2e.test.mjs   # úkol 16
node --test tests/spolecne.test.mjs tests/vystup.test.mjs && CHROMIUM=<cesta> node --test --test-concurrency=1 tests/e2e/*.e2e.test.mjs   # úkol 17 (a všechny e2e)
git grep -nE "clarity\('consent'\)|cookie-banner|hspg-cookies-ok|prijmoutCookies|data-lead|lead_submit|vypustit_holuba" -- . ':!tests' ':!docs' ':!CLAUDE.md'   # nic (lead_submit/vypustit_holuba až po fázi B)
git grep -nE "\?adresa=|\?kod=" -- '*.html' '*.js' ':!tests' ':!docs'   # nic
grep -c "\[DOPLNIT" "$PUB/assets/souhlas.js"                        # 0
node scripts/kontrola-adres.mjs                                     # 0 nálezů (úkol 06)
node scripts/kontrola-gtm.mjs                                       # A/B: „GTM vypnutý“; C: verze ≥ 2, tagů ≥ 1, G-ID souhlasí
npm run nahled                                                      # náhled zdarma (pojistka z úkolu 00)
node scripts/kontrola-cookies.mjs <náhled>                          # kód 0, po odvolání 0, bez MUID
HSPG_ZIVE_URL=<náhled> node --test tests/e2e/ga4-zive.test.mjs      # jen fáze C
PUB_ABS=$(realpath "$PUB"); (cd ../hspg-balicek && npm test && HSPG_MIRROR="$PUB_ABS" CHROMIUM=<cesta> npm run test:e2e)   # H-BOT dál prochází
```
Lighthouse: stejný nástroj a verze jako v úkolu 07, medián z 5 běhů, `/cenik` a `/kalkulacka-svj` mobil, bez uloženého souhlasu.

Testy, které agent přidá:
- `tests/souhlas.test.mjs` (jednotkové: volba, migrace, URL, domény cookies, filtr parametrů, build)
- `tests/e2e/souhlas.e2e.test.mjs` (Playwright: lišta, kategorie, odvolání, maskování, URL, události, interní stránky)
- `tests/e2e/ga4-zive.test.mjs` (jen fáze C, skutečný kontejner, zachycené a přerušené hity)
- skripty `scripts/kontrola-gtm.mjs` a `scripts/kontrola-cookies.mjs`

## Bez AI / s AI
Měření na AI nezávisí a žádnou AI nepoužívá. `hbot_odpoved` nese jen `zdroj` (`faq` / `ai` / `zadna`) a `overeno`, nikdy text otázky ani odpovědi. Bez AI (`AI_ZAPNUTO=0`, chyba, limit) se H-BOT měří stejně, jen se `zdroj: 'faq'`. Clarity okno H-BOT vždy maskuje.

## Nepřekročitelná pravidla
Viz `balicek/KONTEXT.md` §4. Zvlášť pro tento úkol:
- **Před souhlasem nic třetím stranám.** Žádný „rozšířený“ Consent Mode, žádné pingy bez souhlasu. Google Ads ani Sklik bez souhlasu s marketingem.
- `ad_*` = `granted` jen se souhlasem s marketingem. Clarity `ad_Storage` vždy `denied`.
- **Žádné osobní údaje** v `dataLayer`, GA4, Clarity událostech ani v URL. Žádné `clarity('identify')`, `user_id`, rozšířené konverze ani Measurement Protocol.
- Lišta ani zásady neuvádějí nástroj, který neběží, a neslibují nic, co test neověřil (např. „nikdy nezaznamenává“).
- **Formuláře:** v testech jen zachycené POST s daty `TEST`. `kontrola-cookies.mjs` a `ga4-zive` přerušují každý POST a každý hit `/g/collect`. Do produkčních formulářů nic.
- Účty (GA4, GTM, Google Ads, Sklik, Clarity) zakládá a nastavuje majitel. Žádná hesla ani tokeny v repozitáři. Publikaci kontejneru GTM schvaluje majitel.
- Žádné nové měřicí nástroje (Facebook Pixel apod.).
- Zásady se publikují jen po schválení (úkol 09).
- Soubory asistenta z úkolu 01 neměň kromě funkce `udalost` v `hbot-panel.js`.
- Nasazení jen `npm run nahled`, produkce jen po schválení majitelem v dávce.
- **MX a DNS neměnit.**

## Hlášení po dokončení
Formát z `KONTEXT.md` §5, po každé fázi zvlášť, a navíc:
- **Fáze A:**
  - změněné a nové soubory
  - výsledky testů (počty, včetně testů úkolů 02, 16, 17 a balíčku)
  - zvolená varianta LCP se zdůvodněním a tabulka Lighthouse před/po
  - hash `sha256` inline skriptu (varianta A) pro úkol 15
  - výstup `kontrola-cookies.mjs` z náhledu (cookies podle domén, platnosti, úložiště, stav po odvolání)
  - text lišty CS/EN a sekce `#cookies` ke schválení se zásadami (úkol 09); pokud úkol 09 ještě není v `main`, i návrh změn jeho registru (`uloziste_prohlizece`)
  - diff `poptavka-zdroj.js` (úkol 02) a diff testů úkolů 02 a 16
  - odpověď na předávku z úkolu 09: zda Cache Storage service workeru považuješ za nezbytnou a proč (rozhodne majitel s právníkem, souhlas pro ni nezaváděj)
  - odkaz na náhled
- **Fáze B:**
  - kontrakt událostí (tabulka)
  - výstup testů událostí
  - diff `hbot-panel.js`, aby se promítl zpět do balíčku (`balicek/web/assets/hbot-panel.js`)
  - `kontrola-gtm.mjs`
  - návod GTM/GA4 pro majitele (krok 17) a checklist fáze C (GA4 ID, nastavení GA4, Clarity, GTM, rozhodnutí o reklamách)
- **Fáze C:**
  - verze kontejneru GTM
  - výstup `kontrola-gtm.mjs` a `ga4-zive`
  - potvrzené nastavení GA4 a Clarity (ze snímků majitele)
  - stav marketingu
  - domény doplněné do CSP pro úkol 15
- **Návrhy mimo rozsah:**
  - `/akce/` posílala celou adresu GETem na `/api/pocasi?q=`. Úkol 09 to řeší („počasí jen s obcí“); ověř, že je to v `main`, jinak zapiš.
  - předávka pro úkol 14: jeho zadání počítá s odkazem „OHODNOTIT NAŠI PRÁCI“ na `/recenze/?kod=<kód>`. Po úkolu 10 platí předání přes `hspg-predvyplnit` a čisté `/recenze/` (pravidlo v `CLAUDE.md`). Příchozí odkaz `/recenze/?kod=` z e-mailu se žádostí o hodnocení funguje (krok 9, parametr se hned odstraní).
  - doklad o souhlasu se ukládá jen v prohlížeči. Serverový záznam souhlasu je na rozhodnutí majitele a právníka.
  - anglické informace o cookies na `/en` → úkol 18
