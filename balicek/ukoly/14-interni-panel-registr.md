# Úkol 14: Interní panel: AI centrum, registr čistých domů, recenze
> Priorita P2 · Závisí na: 01 (navazuje na 05 – centrální text záruky a 06 – podoba URL; export registru čte úkol 12; SMTP z úkolu 02 je volitelné) · Čeká na majitele: odkaz na recenze z **existujícího** Firemního profilu Google, schválení textu souhlasu majitele domu a textu žádosti o hodnocení, předání nových přístupových kódů ke stávajícím pasům (pokud nějaké jsou), doklad o pojištění (do té doby se pojištění nikde neuvádí), doba uchování kontaktů (úkol 09), přihlášení na náhledu (heslo zná jen majitel) · Rozsah: čtyři fáze – **A** panel: jedno přihlášení, stav a útrata AI, vypínač AI, cesta do AI centra; **B1** registr zakázek a bezpečný pas domu; **B2** zadání zakázky v panelu do 2 minut; **C** výstupy z registru: export realizací, žádost o hodnocení, šablony odpovědí, podklad pro SVJ. **Jedna fáze = jedno sezení**; po každé fázi hlášení a stop, další fázi začni až na pokyn majitele. Podle `PORADI.md` běží tento úkol po všech ostatních kromě 12. Co zavedly dřívější úkoly (02 SMTP, 05 zdroj záruky, 06 podoba URL, 09 registr zpracování, 15 `zdravi` a `/api/provoz-stav`, 17 e2e testy), převezmi. Když něco chybí, nahlas to a pokračuj záložní cestou ze zadání.

## Proč (s důkazy)
Ověřeno 4. 10. 2026 na živém webu (jen GET) a v kopii webu. Čísla nálezů odpovídají pořadí v souborech auditu.

1. **Dvě různá přihlášení.** Interní panel `https://hspg.cz/rd-control-panel/` posílá heslo v těle `POST /api/rd-stav` (zdroj stránky ř. 88). Heslo drží v proměnné stránky, aby ho při „Zkontrolovat znovu“ poslal znovu (ř. 83, 92, 112). Ověřuje se na serveru, ale jinak než u plovoucího panelu a AI centra z úkolu 01. Ty používají `POST /api/majitel` → podepsaný token na 12 h a zámek 5 chybných pokusů / 15 min (`netlify/lib/ai/autorizace.mjs`, `netlify/functions/majitel.mjs`). Jak `rd-stav` heslo ověřuje, zjisti ve zdroji (krok A2).
2. **Balíčková autorizace má ještě starou cestu.** `overPozadavek()` v `netlify/lib/ai/autorizace.mjs` přijímá kromě tokenu i heslo v hlavičce `x-panel-heslo` (pozůstatek staršího AI centra, commit 84d8e90). Cílem je jediná cesta k heslu: `/api/majitel` se zámkem pokusů (audit-ai_integrace.json #19).
3. **Panel neukazuje AI ani útratu a nevede do AI centra** (audit-ai_integrace.json #12). Jediné prvky související s AI jsou věta „… nastavení AI …“ (ř. 47) a odkaz „Konzole Claude (útrata AI)“ na `platform.claude.com` (ř. 72). AI ale běží přes Netlify AI Gateway a platí se kredity Netlify (KONTEXT §2), takže odkaz vede jinam, než kde se platí. Na produkci dnes `/ai-centrum/`, `/api/ai-stav`, `/api/majitel` i `/api/asistent` vrací 404 (úkol 01 ještě není nasazený). `ai.hspg.cz` neexistuje (DNS NXDOMAIN).
4. **Hlavičky panelu** (`curl -I`): `x-frame-options: SAMEORIGIN`, CSP (jen Report-Only) `frame-ancestors 'self'`, `x-robots-tag: noindex, nofollow`, `cache-control: no-store`. Interní stránka nemá jít vložit do rámu vůbec. AI centrum má z úkolu 01 `DENY`. Řádek `Disallow: /rd-control-panel/` v `robots.txt` řeší úkol 11 (audit-seo.json #19), tady ne.
5. **Pas domu se otevírá jen kódem pasu** (audit-pravni_pravdivost.json #20).
   - `pas-domu.html` přijme kód `^HS-\d{4}-\d{4}$` (ř. 234), pošle ho na `POST /api/sentinel/validate {sentinel_code}` (ř. 304) a vykreslí údaje zakázky včetně volné poznámky (ř. 259–286, poznámka ř. 285).
   - `/recenze/` volá stejný endpoint už při psaní kódu (ř. 251–263).
   - Jak `sentinel-validate` zachází s metodami, cache a počtem dotazů, zjisti ve zdroji (krok A2).
6. **Chybí cesta od zakázky na web.**
   - `/reference.html` uvádí „Sbíráme první ověřené reference.“ Blok generuje `scripts/build-references.mjs` z `content/reference.json`.
   - Blok `REALIZACE-PAS` na homepage je prázdný. U jediné skutečné fotky před/po je v HTML komentář „Town and month pending“ (index.html ř. 1461).
   - Kde dnes leží evidence zakázek, ze které čte `sentinel-validate`, z webu poznat nejde (komentář v pas-domu.html ř. 253 mluví o „job register“).
   - Krajské huby (úkol 12, krok 11) čekají na export „ve struktuře registru z úkolu 14“.
   - Odkaz „ZOBRAZIT CERTIFIKÁT“ v ukázce pasu vede jen zpět na ukázku (ř. 211). Certifikát k tisku neexistuje.
7. **Recenze.**
   - Vlastní formulář `/recenze/` (`hspg-recenze`) má podle majitele 0 odeslání (audit-ai_integrace.json #16). Schválená hodnocení zapisuje majitel do `content/recenze.json` (komentář ve skriptu stránky).
   - Blok s odkazem na Google (`RECENZE-GOOGLE`, generuje `scripts/build-recenze.mjs`) je na živém webu prázdný (recenze/index.html ř. 123). Odkaz na recenze na Googlu tedy dnes není nikde.
   - Firemní profil Google už existuje (KONTEXT §2), druhý se nezakládá.
   - Po odeslání ukáže stránka Google blok bez ohledu na počet hvězdiček (`ukazDiky()`, ř. 236–240). To je správně a musí to zůstat.
   - Kartička k tisku `/recenze/karta/` (QR na hspg.cz/recenze) existuje a panel na ni odkazuje.
8. **E-mail „Master plán“** chce zadání zakázky do 2 minut, registr čistých domů, žádosti o recenzi a tiskovou šablonu pro SVJ, ale také hvězdičky 4,9/5 a pojištění do 10 000 000 Kč. Podle `POSUDEK-MASTER-PLANU.md` se přebírá:
   - registr, ve kterém kód pasu nesmí být jediným klíčem a fotky jen se souhlasem majitele domu,
   - žádost o recenzi všem zákazníkům, bez filtrování a bez odměn, jen se souhlasem a s odkazem z existujícího profilu,
   - šablona pro SVJ **bez pojistné částky**.

   Hvězdičky bez skutečných recenzí a nedoložené pojištění se nepřebírají.
9. **Podklad pro SVJ už existuje.** `/kalkulacka-svj` má tlačítko „Vytisknout podklady pro schůzi vlastníků / Uložit PDF“ (ř. 290, `assets/svj-podklad.js`) a `/nabidka-svj` je „A4 k tisku i e-mailu“ (ř. 149). Výraz „pojišt…/pojist…“ se v celé kopii webu nevyskytuje (0 souborů). Mapa realizací na webu není. Jediný mapový odkaz vede na Google Maps se sídlem (index.html ř. 1901).

## Cíl (měřitelný)
**Fáze A – panel**
1. Jedno přihlášení přes `/api/majitel` platí v téže kartě pro plovoucí panel, interní panel i AI centrum. Heslo se neposílá nikam jinam, nikde se neukládá a jiná cesta než token neexistuje (`x-panel-heslo` ani heslo v těle `rd-stav` neprojdou).
2. Panel ukazuje stav AI, útratu měsíce v Kč i v kreditech Netlify a vypínač „AI pro zákazníky“. Přepnutí platí do 60 s bez nasazení.
3. Z panelu se jedním kliknutím dostaneš do `/ai-centrum/` a zpět, bez druhého přihlášení. `/rd-control-panel/*` vrací jedinou hlavičku `X-Frame-Options: DENY`.

**Fáze B1 – registr a pas domu**
4. Pas domu se otevře jen s kódem pasu **a** náhodným přístupovým kódem. Samotný kód nevrátí žádný údaj a z odpovědi nejde poznat, jestli kód existuje.
5. Odpověď pasu obsahuje jen povolená pole: žádnou poznámku, adresu, PSČ ani kontakt. Po 5 neúspěšných pokusech z jednoho klienta během 15 min vrací 429.
6. Registr je v Netlify Blobs, náhledy zapisují do odděleného úložiště a v Gitu nejsou žádná data zákazníků.

**Fáze B2 – zadání zakázky**
7. Formulář „Nová zakázka“ má nejvýš 7 povinných polí. Souhlasy jsou ve výchozím stavu nezaškrtnuté. Fotky odchází zmenšené (≤ 1,5 MB) a bez EXIF a polohy. Majitel zadá zakázku na mobilu do 2 minut (změří a uvede v hlášení).
8. Po uložení se jednou zobrazí přístupový kód a odkaz. Certifikát k tisku bere záruku z centrálního zdroje.

**Fáze C – výstupy**
9. Export realizací obsahuje jen zakázky se souhlasem, přesně ve schématu z úkolu 12 (+ volitelná pole níže), a nikdy kód pasu, PSČ, kontakt ani jméno.
10. Žádost o hodnocení jde všem zákazníkům se souhlasem a e-mailem, bez jakéhokoli výběru podle spokojenosti a bez odměn. Odkaz vede na existující Google profil (nebo jen na `/recenze/`, dokud odkaz chybí). Nic se neodesílá automaticky.
11. Šablony odpovědí na recenze fungují bez AI. V podkladech pro SVJ ani nikde jinde na webu není údaj o pojištění, dokud není doložený (hlídá to test).

## Rozsah
ANO:
- přihlášení interního panelu přes token z `/api/majitel`, odstranění přihlašování heslem v `rd-stav` a v hlavičce `x-panel-heslo`,
- sekce AI v panelu (data z `/api/ai-stav`) a vypínač AI pro zákazníky v Netlify Blobs,
- odkazy panel ↔ AI centrum, `X-Frame-Options: DENY` pro `/rd-control-panel/*`,
- registr zakázek (úložiště, schéma, API, validace, migrace stávajících záznamů), zabezpečení `sentinel-validate`, pas domu s přístupovým kódem, odstranění dotazu na registr z `/recenze/`,
- formulář „Nová zakázka“ s fotkami a souhlasy, certifikát k tisku,
- veřejný export realizací pro reference a krajské huby, žádost o hodnocení, šablony odpovědí na recenze,
- datové pole a test-pojistka pro pojištění, odkazy na podklady pro SVJ v panelu,
- záznam nového zpracování do registru zpracování z úkolu 09 (`content/zpracovani.json`), pokud existuje,
- úprava e2e testů z úkolu 17, které pracují s pasem domu,
- testy všeho výše.

NE (patří jinam):
- `robots.txt` a interní cesty v HTML (úkol 11),
- skutečný health-check AI, monitoring fallbacků, celková spotřeba kreditů a CSP (úkol 15). Panel zobrazí, co `/api/ai-stav` vrací, a co úkol 15 přidá, jen převezme,
- text záruky (úkol 05; tady jen převzít z centrálního zdroje), e-mailové adresy a FormSubmit na `/recenze/` a v `svj-podklad.js` (úkol 03), podoba URL `/x` × `/x.html` (úkol 06),
- generování krajských hubů a zavedení `content/kraje.json` (úkol 12 jen čte export), tvrzení o SENTINEL, štítcích a technologiích na `pas-domu` (úkol 13), znění zásad a doba uchování (úkol 09; tady jen záznam do jeho registru zpracování), cookie lišta a Clarity obecně (úkol 10),
- přechod tokenu ze `sessionStorage` na HttpOnly cookie, seznam poptávek z Netlify Forms API v panelu (potřebuje nový token), SMS brána, mapa realizací, nový podklad SVJ s realizacemi – jen jako návrhy do hlášení,
- `AggregateRating`/`Review`, hvězdičky, pojistné částky a „satelitní analýza“ – **nikdy**.

## Postup
Každá fáze má vlastní hlášení a dá se po ověření sloučit do `main` samostatně. Pokud fázi v sezení nestihneš, podej hlášení po poslední dokončené fázi a zastav se. Do produkce se nasazuje jen v dávce po schválení majitelem (KONTEXT §4.4).

### Fáze A – panel: jedno přihlášení, stav AI, AI centrum
1. **Větev `ukol-14-interni-panel-registr` z aktuální `main`.** Předtím `git -C ../hspg-balicek pull`. Ověř, že je sloučený úkol 01: existují `netlify/lib/ai/autorizace.mjs`, `netlify/lib/ai/limity.mjs`, `netlify/functions/majitel.mjs`, `ai-stav.mjs`, `asistent.mjs`, `ai-centrum/index.html`, `assets/ai-klient.js`, `assets/hbot-panel.js` a `assets/hbot-majitel.js`. Pokud ne, zastav se a nahlas to.
2. **Najdi v repozitáři soubory, které generují:**
   - interní panel `/rd-control-panel/`. Audit zmiňuje i `rd.html`, zjisti, jestli jde o zdroj, nebo přesměrování,
   - funkce `rd-stav` a `sentinel-validate` (adresář podle `netlify.toml` → `[functions]`) a mapování `/api/rd-stav` a `/api/sentinel/validate`,
   - pravidla hlaviček (`netlify.toml` / `_headers`), `publish` adresář, `package.json` (jak se spouští testy),
   - `pas-domu.html`, `recenze/index.html`, `recenze/karta/`, `scripts/build-recenze.mjs`, `scripts/build-references.mjs`, `scripts/build-regions.mjs`, `content/recenze.json`, `content/reference.json`, `content/sentinel.json`, `content/firma.json`, `content/ceny.json`, `assets/svj-podklad.js`, `kalkulacka-svj.html`, případně `content/kraje.json` (úkol 12).

   Pokud HTML generuje skript, upravuj generátor, ne výstup. Do hlášení zapiš **bez osobních údajů a bez hodnot tajemství**:
   - jak `rd-stav` ověřuje heslo: proměnná prostředí, způsob porovnání, zdržení, omezení pokusů. Pokud by se heslo kdekoli porovnávalo na klientovi (porovnání v JS, otisk hesla ve stránce), přesuň ověření na server. Ověř to přes `git grep -n "heslo"`,
   - kdo další volá `rd-stav` (`git grep -n "rd-stav"`),
   - odkud `sentinel-validate` bere zakázky (soubor v repozitáři / Netlify Blobs / jinak), kolik jich je (jen číslo), jaké metody přijímá, jak počítá záruku, příští kontrolu a srážky,
   - formát `content/reference.json` a `content/recenze.json` a které pole plní blok `RECENZE-GOOGLE`,
   - čím vznikl QR kód na `/recenze/karta/` (generátor v repozitáři, nebo jednorázově vložené SVG),
   - jestli jsou `tests/` a `docs/` ve výstupu nasazení. Neveřejné soubory se na web dostat nesmí.
3. **Jednotné přihlášení panelu.**
   - Formulář panelu posílá heslo **jen** na `POST /api/majitel`. Token a platnost uloží do `sessionStorage` pod stejnými klíči jako `assets/hbot-panel.js` a `ai-centrum/index.html` (dnes `hspg-majitel-token` a `hspg-majitel-platnost`; ověř v kódu). Přihlášení tak platí pro všechny tři části v téže kartě.
   - Pole hesla se po odeslání vymaže. Heslo se nedrží v proměnné ani v úložišti prohlížeče. Odstraň `drzene`, „Zkontrolovat znovu“ použije token.
   - Při načtení stránky s platným tokenem se data načtou rovnou. Odpověď 401 vrátí uživatele na přihlášení s hláškou „Přihlášení vypršelo.“, odpověď 429 zobrazí hlášku serveru. Tlačítko „Odhlásit“ smaže oba klíče.
   - `rd-stav` ověřuje požadavek přes `overPozadavek(req)` (hlavička `Authorization: Bearer …`). Čtení hesla z těla odstraň. Načítání stavu změň na `GET` s `cache-control: no-store`, nebo ponech `POST` bez hesla – zvol jedno a zdůvodni.
   - Pokud `rd-stav` dosud četl jinou proměnnou než `HSPG_PANEL_HESLO`, sjednoť to. Do hlášení napiš název staré proměnné (bez hodnoty), kterou má majitel po nasazení smazat.
   - V `overPozadavek()` odstraň větev `x-panel-heslo`. Napřed ověř přes `git grep -n "x-panel-heslo"`, že ji žádný klient nepoužívá. Jedinou cestou k heslu tak zůstane `/api/majitel` se zámkem pokusů. Testy webu uprav. Do hlášení napiš, že test balíčku „starší AI centrum: heslo v x-panel-heslo stále funguje“ je zastaralý (návrh pro balíček).
4. **Sekce AI v panelu** (data z `GET /api/ai-stav` s tokenem; vykreslení jen přes `textContent`):
   - Pro každého poskytovatele zobraz název, model a „klíč k dispozici“ / „klíč chybí“. **Nepiš „funguje“ ani ✓**, skutečný test funkčnosti přidá úkol 15. Až ho přidá do odpovědi `/api/ai-stav`, panel ho jen zobrazí.
   - Dále zobraz:
     - stav „AI pro zákazníky zapnutá / vypnutá“ a z jakého důvodu (proměnná `AI_ZAPNUTO=0`, vypínač v panelu, vyčerpaný rozpočet),
     - „Útrata tento měsíc ≈ X Kč z limitu Y Kč (≈ A z B kreditů Netlify) – odhad podle tokenů“,
     - upozornění „AI se platí kredity Netlify; jejich vyčerpání pozastaví celý web“, pokud `gateway` je true.
   - Když je `utrata` `null`, zobraz „Útratu teď nejde načíst.“ a zbytek panelu nech fungovat.
   - **Vypínač „AI pro zákazníky“ bez nasazení.** Ulož ho do Netlify Blobs (úložiště `hspg-ai`, klíč `nastaveni/verejna-ai/<produkce|nahled>`), ne do proměnné prostředí. Změna proměnné se v Netlify projeví až dalším nasazením (ověř v dokumentaci) a produkční nasazení stojí 15 kreditů.
     - `POST /api/ai-stav {"verejnyAsistent": false|true}` funguje jen s tokenem, jinak 401.
     - V `asistent.mjs` (dnes `aiZapnuto(env)`) platí AI pro zákazníky jen tehdy, když `AI_ZAPNUTO !== "0"` **a** vypínač není vypnutý. `AI_ZAPNUTO=0` má vždy přednost jako tvrdý vypínač.
     - Stav vypínače se drží v paměti funkce nejvýš 60 s. Když úložiště nejde přečíst, platí poslední známý stav, jinak „zapnuto“ (chování jako dnes).
     - Klíč s příponou kontextu (viz krok B1.1) zajistí, že přepnutí na náhledu nevypne produkci.
     - Odpověď `/api/ai-stav` rozšiř o `verejnyAsistentPanel` a `verejnyAsistentEnv`. Popisek v `assets/hbot-majitel.js` uprav tak, aby říkal skutečný důvod.
   - Odkaz „AI centrum“ vede na `/ai-centrum/` **ve stejné kartě**. Token je v `sessionStorage` té karty a do karty otevřené přes `target="_blank"` se nemusí přenést (ověř v Chrome i Safari). Do `ai-centrum/index.html` přidej odkaz „← Interní panel“ a do seznamu odkazů v `assets/hbot-majitel.js` přidej „Interní panel“.
   - Odkaz „Konzole Claude (útrata AI)“ odstraň, útrata je teď v panelu. Přidej „Netlify – spotřeba kreditů“ a přesnou adresu stránky Usage & billing ověř v účtu.
   - Do panelu nevkládej `souhlas.js`, GTM, Clarity ani `hbot.js` (dnes je panel bez externích skriptů a tak to zůstane).
5. **Hlavičky pro `/rd-control-panel/*`:** `X-Frame-Options: DENY`, `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow` (stejně jako `/ai-centrum/*` z úkolu 01). Ověř na náhledu, že každá hlavička přijde **jen jednou**. Pokud obecné pravidlo pro `/*` posílá `SAMEORIGIN`, uprav pravidla tak, aby pro panel vyšla jediná hodnota `DENY`. CSP neměň (úkol 15) a `robots.txt` neměň (úkol 11). Panel ani AI centrum se nikdy nevkládají do `iframe`.
6. **Testy fáze A** (`node --test` nebo konvence repozitáře; nové závislosti nepřidávej; soubory např. `tests/ukol-14/`). Funkce testuj přes jejich továrny (`vytvorX({ env, uloziste, ted })`) s paměťovým úložištěm, stejně jako testy balíčku:
   - `rd-stav`: bez tokenu 401, správné heslo v těle 401, správné heslo v `x-panel-heslo` 401, platný token 200, prošlý token 401,
   - `overPozadavek`: hlavička `x-panel-heslo` už neautorizuje,
   - vypínač: `POST /api/ai-stav` bez tokenu 401. S tokenem uloží a `GET /api/asistent` pak vrátí `ai:false` bez změny `env`. `AI_ZAPNUTO=0` přebije zapnutý vypínač. Klíč náhledu neovlivní produkční klíč,
   - statická kontrola souborů panelu: `heslo` se posílá jen na `/api/majitel` a v `sessionStorage`/`localStorage` se heslo nikdy neukládá (`grep` v testu).
7. **Lokální ověření:** `netlify dev` s **testovacím** heslem v `.env` (soubor je v `.gitignore`, nikdy skutečné heslo). Přihlas se do panelu → přejdi do AI centra bez druhého přihlášení → vrať se zpět → vyzkoušej vypínač → odhlas se. V záložce Network ověř, že heslo odešlo jen v jednom požadavku na `/api/majitel`. Pak `npm run nahled` (náhled zdarma) a `curl -sI` hlaviček. Přihlášení na náhledu provede majitel, agent heslo nezná.
8. **Hlášení fáze A a zastav se.**

### Fáze B1 – registr zakázek a bezpečný pas domu
1. **Úložiště.** Registr patří do Netlify Blobs: úložiště `hspg-registr` v produkci a `hspg-registr-nahled` jinde. Blobs z `getStore()` jsou sdílené napříč všemi nasazeními webu, takže bez oddělení by zkušební záznam z náhledu skončil v produkčním registru.
   - Kontext urči v Netlify Functions v2 z `context.deploy` (`context` a `published`). Produkční úložiště použij jen pro produkční publikované nasazení. Hodnoty ověř dočasným výpisem kontextu (bez dat) na náhledu i lokálně a výpis pak odstraň.
   - Pokud panel nebo `sentinel-validate` už Blobs používá, převezmi stávající název úložiště, ale oddělení náhledu doplň.
   - Paměťové úložiště pro testy musí umět `get`, `setJSON`, `set` (binárně, s metadaty), `list({ prefix })` a `delete`.
   - Klíče: `zakazka/<kod>`, `citac/<rok>`, `foto/<kod>/<pred|po>`, `limit/…`, `export/…` (fáze C).
2. **Schéma na jednom místě** – modul bez DOM a bez tajemství, který importují funkce i panel. Umístění zvol podle `publish` adresáře, např. `rd-control-panel/registr-schema.mjs` (funkce relativním importem). Obsahuje validaci, výpočty a výběr veřejných polí. Názvy polí odpovídají úkolu 12:
   ```json
   {
     "kod": "HS-2099-0001",
     "verejne_id": "r-k7q9m2",
     "pristup_otisk": "<sha256 hex nebo null>",
     "datum": "2099-10-03",
     "obec": "Testov", "psc": "999 99", "okres_slug": "…", "kraj_slug": "…",
     "polozky": [{ "sluzba": "ochrana_hstone.roof", "povrch": "strecha", "plocha_m2": 120 }],
     "materialy": ["H-STONE"], "sarze": "…",
     "fotky": { "pred": null, "po": null, "povrch": "strecha" },
     "souhlas": { "obec": false, "fotky": false, "hodnoceni_email": false, "datum": null, "doklad": "" },
     "kontakt": { "email": "", "telefon": "" },
     "hodnoceni": { "zadost_odeslana": null, "kanal": null },
     "stav": "aktivni",
     "vytvoreno": "…", "upraveno": "…",
     "historie": [{ "kdy": "…", "co": "zalozeno" }]
   }
   ```
   - `sluzba` je klíč z `content/ceny.json`: `ochrana_hstone.*`, `cisteni_only.*`, `renovace_color.*`. `povrch` se z něj odvodí (`roof` → `strecha`, `facade` → `fasada`, `driveway` → `dlazba`, `solar` → `fotovoltaika`). `fotovoltaika` je navíc proti úkolu 12, nahlas to tam.
   - `verejne_id` je náhodné (≥ 30 bitů, unikátní) a kód pasu z něj odvodit nejde.
   - **Volné textové pole „poznámka“ se nezavádí.** Pokud ho stará data mají, při migraci se nepřebírá do veřejných polí. Hodnota se nikam nevypisuje a do hlášení jde jen počet takových záznamů.
   - Žádné pole pro spokojenost ani hodnocení zákazníka (viz C2).
   - Záruka se nevypočítává natvrdo. Počet let a interval kontroly vezmi z centrálního zdroje záruky (úkol 05; dnes `content/firma.json` → `zaruka`, `content/sentinel.json` → `podminka_zaruky`). Pokud tam číselné hodnoty chybí, přidej je **do stejného** zdroje (např. `zaruka.roky`, `zaruka.kontrola_mesice`) a nahlas to úkolu 05.
   - Záruka platí jen u položek `ochrana_hstone.*` (impregnace H-STONE), jinak `zaruka: null`. Porovnej výpočet s dnešním `sentinel-validate`. Při rozdílu nic nevymýšlej a nahlas ho.
3. **Kód pasu a přístupový kód.**
   - Kód pasu zůstává `HS-RRRR-ČČČČ` (kvůli kompatibilitě s webem a vydanými certifikáty). Přiděluje se postupně z čítače `citac/<rok>`. Pokud verze `@netlify/blobs` umí podmíněný zápis, použij ho, jinak před zápisem ověř, že klíč neexistuje (jeden uživatel, souběh je zanedbatelný; ověř v dokumentaci).
   - Přístupový kód má 12 znaků Crockford Base32 (`0123456789ABCDEFGHJKMNPQRSTVWXYZ`, 60 bitů) z `crypto.randomBytes` (`bajt & 31` nemá zkreslení). Zobrazuje se jako `XXXX-XXXX-XXXX`.
   - Vstup se normalizuje: velká písmena, bez mezer a pomlček, `O`→`0`, `I`/`L`→`1`.
   - Ukládá se **jen** SHA-256 otisk a porovnává se přes `timingSafeEqual`. Hodnota se zobrazí jedinkrát (při založení nebo vydání nového). Vydání nového kódu zneplatní starý.
4. **`sentinel-validate`** (cesta `/api/sentinel/validate` se nemění):
   - Přijímá jen `POST {sentinel_code, pristup}`, ostatní metody vrací 405.
   - Omezení pokusů: otisk klienta přes `otiskKlienta()` z `netlify/lib/ai/limity.mjs` (IP se neukládá). Nejvýš 5 neúspěšných pokusů / 15 min, pak 429 „Příliš mnoho pokusů. Zkuste to za 15 minut, nebo zavolejte +420 736 618 486.“ Navíc nejvýš 30 dotazů za hodinu na klienta (chrání i volání Open-Meteo).
   - **Každý neúspěch vrací stejný stav 404 a stejné tělo.** Týká se to neexistujícího kódu, chybného nebo chybějícího přístupového kódu, záznamu bez přístupového kódu i zrušeného záznamu. Tělo: `{"success":false,"chyba":"Pas jsme nenašli. Zkontrolujte kód pasu a přístupový kód z certifikátu, nebo zavolejte +420 736 618 486."}`.
   - Úspěch 200 vrací **jen** pole, která pas vykresluje: `kod, obec, povrchy, plocha_m2, datum, materialy, sarze, zaruka{platna, do, zbyva_dni, uplynulo_procent}, dalsi_kontrola, srazky{mm, do}`. Tvar polí zachovej, výpočet srážek (Open-Meteo) neměň.
   - Nikdy nevrací `poznamka`, `psc`, adresu, `kontakt`, `souhlas`, `historie`, `pristup_otisk` ani `verejne_id`.
   - Hlavičky `cache-control: no-store` a `x-robots-tag: noindex`.
5. **Pas domu** (`pas-domu.html` nebo jeho generátor):
   - Druhé pole „Přístupový kód“ s `<label>` a nápovědou: „Kód pasu i přístupový kód najdete na certifikátu. Bez přístupového kódu pas neotevřeme – chráníme údaje o vašem domě.“
   - Odkaz z certifikátu má tvar `<kanonická URL pasu z úkolu 06>#kod=HS-…&pristup=XXXX-XXXX-XXXX`. Fragment se neposílá na server ani v Refereru.
   - Inline skript stránky (běží před `souhlas.js`, který má `defer`; pořadí ověř ve zdroji) fragment hned na začátku přečte, vyplní pole, **odstraní ho** přes `history.replaceState(null, '', location.pathname)` a otevře pas.
   - Poznámku nevykresluj (dnes ř. 285).
   - Výsledku pasu a oběma polím přidej `data-clarity-mask="true"` (údaje o domě se nemají nahrávat).
   - Ukázka `#ukazkovy-pas` zůstává beze změny. Odkaz „OHODNOTIT NAŠI PRÁCI“ vede na `/recenze/?kod=<kód>`, **bez** přístupového kódu.
6. **`/recenze/`:**
   - Odstraň dotaz na `/api/sentinel/validate` při psaní kódu (ř. 250–268). Formulář kód jen převezme z `?kod=`, zkontroluje jeho tvar a odešle ho s hodnocením. Zakázku ověří majitel v registru, takže věta „Ověříme zakázku podle kódu certifikátu nebo naší evidence“ zůstává pravdivá.
   - Placeholder `HS-2026-0001` (ř. 181) změň na `HS-RRRR-ČČČČ`, protože by to mohl být skutečný kód.
   - Přístupový kód nikdy nesmí být ve formuláři (dostal by se do Netlify Forms a do e-mailů).
   - Záložní FormSubmit tu neřeš (úkol 03).
7. **API registru** (interní; všechno přes `overPozadavek`, odpovědi `cache-control: no-store`, tělo JSON ≤ 20 kB, každé textové pole s max. délkou). Jedna funkce `registr.mjs` s cestami `/api/registr` a `/api/registr/*`:
   - `GET /api/registr` vrátí seznam bez `pristup_otisk`, nejnovější první, po 50, se stránkováním.
   - `POST /api/registr` zakázku založí. Odpověď `{kod, pristup, odkaz}` obsahuje přístupový kód jen tentokrát.
   - `GET /api/registr/<kod>` vrátí detail. `PATCH /api/registr/<kod>` smí měnit jen souhlasy, kontakt, stav a `fotky.povrch`. Každou změnu zapíše do `historie` (co a kdy, bez hodnot osobních údajů).
   - `POST /api/registr/<kod>/pristup` vydá nový přístupový kód.
   - `DELETE /api/registr/<kod>/kontakt` smaže kontakt (doba uchování `[DOPLNIT: úkol 09]`).
   - Chybu validace vrátí jako 400 `{"chyby": {"<pole>": "<zpráva>"}}`.
   - Do logu nikdy nejde obec, kontakt, kód ani přístupový kód (`console.log` jen technické stavy).
8. **Migrace stávající evidence** (podle zjištění z A2). Převeď záznamy do schématu B1.2. Migrované záznamy dostanou `pristup_otisk: null`, takže pas se neotevře, dokud majitel v panelu nevydá přístupový kód. Panel ukáže „N zakázek bez přístupového kódu“.
   - Migraci proveď jednorázově přes chráněný endpoint nebo přes `npx netlify blobs:set` (ověř `--help`).
   - Po ověření odstraň starý zdroj z repozitáře. Historii nepřepisuj, a pokud starý zdroj obsahoval osobní údaje, nahlas to majiteli (repozitář webu je soukromý, úkol 00).
   - Pokud `rd-stav` kontroloval evidenci v repozitáři, přepni kontrolu na registr. Výstupem jsou jen čísla: počet zakázek a počet zakázek bez přístupového kódu.
9. **Testy B1** – fixtury jen fiktivní: obec „Testov“, PSČ `999 99`, e-mail `@example.com`, kódy `HS-2099-…`. Pokrytí:
   - formát kódu, unikátnost a pořadí čísel,
   - přístupový kód: délka, abeceda, normalizace vstupu. V uloženém JSON se hodnota přístupového kódu nevyskytuje,
   - `sentinel-validate`: GET 405. Samotný kód, chybný přístupový kód, neexistující kód i záznam bez přístupového kódu dají **shodný** stav i tělo. Správná dvojice vrátí 200 přesně s povolenými klíči (test whitelistu). 6. neúspěch během 15 min vrátí 429,
   - výběr úložiště podle kontextu (produkční jen v produkci),
   - statické kontroly: `pas-domu` nevykresluje `poznamka`, `/recenze/` nevolá `/api/sentinel/validate`, formulář `/recenze/` nemá pole s přístupovým kódem.
10. **Hlášení fáze B1 a zastav se.** Uveď jen čísla (počty záznamů), žádné kódy ani obce.

### Fáze B2 – zadání zakázky do 2 minut (panel)
1. **Sekce „Registr“ v panelu.** Seznam obsahuje kód, datum, obec, služby, ikony souhlasů, stav žádosti o hodnocení a štítky „bez přístupového kódu“ a „bez fotek“. Tlačítko „+ Nová zakázka“. Vše se vykresluje přes `textContent`, žádné `innerHTML` s daty.
2. **Formulář** je navržený pro mobil: 390 px bez vodorovného posunu, ovládací prvky ≥ 44 px, `<label>` u každého pole, chyby u pole přes `aria-describedby`, po chybě se data zachovají.
   - **Povinná pole (nejvýš 7):**
     1. datum ošetření (výchozí dnes),
     2. obec,
     3. PSČ (`^\d{3} ?\d{2}$`, `inputmode="numeric"`),
     4. okres (výběr z `content/kraje.json`, pokud ho úkol 12 zavedl, jinak ze stejného zdroje jako `scripts/build-regions.mjs`; `kraj_slug` se doplní sám),
     5. služba (výběr z klíčů `content/ceny.json` s popisky z ceníku),
     6. plocha m² (číslo > 0 a ≤ 100 000),
     7. šarže H-STONE (povinná jen u `ochrana_hstone.*`; předvyplní se poslední hodnota z `localStorage`, protože to není osobní údaj).
   - Tlačítko „+ Další povrch“ přidá řádek se službou a plochou.
   - Volitelná pole: e-mail a telefon zákazníka (`type="email"`, `type="tel"`, jen pro žádost o hodnocení a připomenutí kontroly), foto před a foto po. Fotky jsou doporučené, ale nejsou povinné a dají se doplnit později.
   - **Souhlasy majitele domu**, ve výchozím stavu **nezaškrtnuté**:
     - ☐ zveřejnit obec, druh a rozsah práce a měsíc (reference, krajská stránka, případná mapa jen na úrovni obce),
     - ☐ zveřejnit fotky před/po,
     - ☐ poslat jeden e-mail se žádostí o hodnocení.

     Při zaškrtnutí kteréhokoli souhlasu je povinné pole „Doklad souhlasu“ (např. „předávací protokol 3. 10., podpis“), protože `/reference.html` slibuje písemný souhlas. `souhlas.datum` se doplní automaticky.
   - **Text souhlasu** dej do `content/registr.json` → `souhlas_text` (`"schvaleno": false`). Panel ho nabídne k přečtení a tisku. Návrh k revizi majitelem (případně právníkem; souvisí s úkolem 09), placeholdery z `content/firma.json`:
     > Souhlasím, aby {{znacka}} ({{provozovatel}}, IČO {{ico}}) zveřejnil na {{web}} a ve svých materiálech: ☐ obec, druh a rozsah provedené práce a měsíc realizace; ☐ fotografie před a po (bez adresy a bez osob, poloha z fotografií odstraněna). ☐ Souhlasím se zasláním jednoho e-mailu se žádostí o hodnocení. Souhlas mohu kdykoli odvolat na {{email}} nebo {{telefon_zobrazeni}}; zveřejnění pak odstraníte. [DOPLNIT: schválení znění majitelem]
3. **Fotky.**
   - Klient: `createImageBitmap(soubor, { imageOrientation: "from-image" })` → canvas, delší strana nejvýš 1600 px → `toBlob("image/webp", 0.8)`. Pokud prohlížeč WebP nevytvoří (kontroluj `blob.type`, Safari může vrátit PNG), použij `toBlob("image/jpeg", 0.85)`. Překreslením přes canvas zmizí EXIF i poloha (`/reference.html` slibuje „Z fotek odstraňujeme polohu“). Zobraz náhled a velikost.
   - Odesílání: každá fotka zvlášť přes `PUT /api/registr/<kod>/foto/<pred|po>` (binárně, `content-type` `image/webp` nebo `image/jpeg`, rozměry v hlavičkách `x-sirka` / `x-vyska`), až po uložení zakázky.
   - Server přijme jen WebP/JPEG podle magických bajtů a nejvýš 1,5 MB. Odmítne soubor s metadaty: JPEG s jakýmkoli segmentem APP1, WebP s blokem `EXIF` nebo `XMP `. Uloží ho do `foto/<kod>/<pred|po>` s metadaty (typ, velikost, rozměry).
   - Limit těla požadavku funkce ověř v dokumentaci Netlify. Ověř i to, jestli a jak se Netlify Blobs účtují v kreditech, a uveď to v hlášení.
   - Panel zobrazuje fotky přes `fetch` s tokenem → `URL.createObjectURL` (obrázek hlavičku `Authorization` neposlat neumí). `GET` a `DELETE` téže cesty jsou jen pro přihlášeného.
   - Ručně ověř na iPhonu (HEIC z galerie) i na Androidu.
4. **Po uložení** se zobrazí obrazovka „Hotovo“:
   - kód pasu, přístupový kód velkým písmem, odkaz na pas (tvar z B1.5) s tlačítkem „Kopírovat“,
   - tlačítka „Vytisknout certifikát“ a „Zpět na seznam“,
   - upozornění: „Přístupový kód se už znovu nezobrazí. Když se ztratí, vydejte nový.“
5. **Certifikát k tisku** (A5 nebo A4, `@media print` tiskne jen kartu). Data vrací `GET /api/registr/<kod>/certifikat`, takže text záruky jde ze serveru z centrálního zdroje (jeden zdroj, žádná kopie v panelu).
   - Obsah: značka, „Digitální pas domu“, kód pasu, přístupový kód (jen na obrazovce „Hotovo“; z detailu se znovu vytisknout nedá, je potřeba vydat nový), `hspg.cz/pas-domu`, obec, datum, služby a plochy, šarže, věta a podmínka záruky, příští kontrola.
   - Na certifikátu nesmí být jméno, adresa, pojištění ani hodnocení.
   - QR kód přidej jen tehdy, když repozitář už generátor má (zjištění z A2). Jinak QR vynech a navrhni ho v hlášení. Novou závislost nepřidávej.
6. **Testy B2:**
   - formulář má nejvýš 7 polí `required` a souhlasy nejsou ve výchozím stavu `checked`,
   - server: neplatné PSČ, plocha ≤ 0, neznámý okres a neznámý klíč služby vrátí 400 s názvem pole. Souhlas bez dokladu vrátí 400. Chybějící šarže u H-STONE vrátí 400,
   - fotky: soubor, který není obrázek, soubor > 1,5 MB a JPEG s APP1 / WebP s `EXIF` vrátí 400. Čistý WebP/JPEG vrátí 200. Fixtury sestav v testu z bajtů, ne ze skutečných fotek,
   - detail zakázky přístupový kód nevrací,
   - certifikát obsahuje větu a podmínku záruky **shodnou** s centrálním zdrojem a neobsahuje „15 let“ ani „pojišt“.
   - Pokud repozitář má Playwright, přidej e2e testy (zadání zakázky s fiktivními daty na 390 px, žádný vodorovný posun, axe bez vážných chyb). Jinak udělej ruční kontrolu na náhledu se snímky jen s fiktivními daty.
7. **Hlášení fáze B2 a zastav se.** Přilož čas zadání jedné zakázky na mobilu (změří majitel na náhledu, data „Testov“) a velikost testovací fotky před a po zmenšení.

### Fáze C – výstupy z registru
1. **Export realizací pro web (reference a krajské huby, úkol 12).**
   - Funkce `verejnyExport(zaznamy)` ve schématu z B1.2 vezme záznamy se `stav === "aktivni"` a `souhlas.obec === true`. Každá položka zakázky dá jednu realizaci:
     ```json
     { "id": "r-k7q9m2-1", "obec": "Testov", "okres_slug": "…", "kraj_slug": "…", "mesic": "2099-10",
       "povrch": "strecha", "sluzba": "ochrana_hstone.roof", "plocha_m2": 120,
       "fotky": [{ "pred": "/assets/realizace/r-k7q9m2-pred.webp", "po": "/assets/realizace/r-k7q9m2-po.webp",
                   "alt": "Střecha, Testov – před a po ošetření", "sirka": 1600, "vyska": 1200 }],
       "souhlas": { "obec": true, "fotky": true, "datum": "2099-10-03" } }
     ```
   - Fotky jsou jen u položky, jejíž povrch odpovídá `fotky.povrch`, a jen při `souhlas.fotky === true`, jinak `[]`. Při jakékoli nejistotě (chybějící pole, neznámá hodnota) se položka nevyexportuje.
   - Do exportu nikdy nejde `kod`, `psc`, `kontakt`, `sarze`, `historie` ani souřadnice. Mapa na webu není a export obsahuje jen obec a okres. Případná budoucí mapa smí ukázat jen bod obce a jen se souhlasem (návrh).
   - V panelu tlačítko „Připravit export pro web“ (`POST /api/registr/export`) zapíše do Blobs `export/realizace.json` a kopie fotek se souhlasem do `export/foto/<id>-<pred|po>.<přípona>`. Panel ukáže počty položek a fotek a připomene: „Na web se dostane až po sestavení a schváleném nasazení.“
   - Skript `scripts/stahni-realizace.mjs` stáhne export přes Netlify CLI (`npx netlify blobs:get …`; syntaxi ověř `--help`). CLI používá přihlášení majitele, žádný nový token. Výsledek zapíše do `content/realizace.json` a `assets/realizace/` a smaže fotky, které v exportu už nejsou (odvolaný souhlas).
   - Přepínač `--kontrola` skončí chybou, když JSON obsahuje jiný než povolený klíč nebo fotku bez souhlasu.
   - Pokud CLI příkaz neexistuje, udělej jedinou náhradní cestu: tlačítko „Stáhnout export“ v panelu (JSON s fotkami v base64) a `--soubor <cesta>`. Zdůvodni to v hlášení.
   - **Jeden zdroj realizací.** `scripts/build-references.mjs` (reference i blok `REALIZACE-PAS` na homepage) bere realizace z `content/realizace.json`. `content/reference.json` buď generuj z exportu, nebo build přepni. Ručně schválené záznamy zachovej nebo převeď. Dva ruční zdroje vzniknout nesmí. Úkol 12 čte stejný soubor.
   - Se skutečnými daty dnes nesmí build změnit `/reference.html` ani homepage, pokud žádná zakázka nemá souhlas (`git diff`).
   - **Odvolání souhlasu** (`PATCH souhlas.obec=false` nebo `fotky=false`): pokud zakázka byla v posledním exportu (ulož `export/posledni` s datem a seznamem `id`), panel zobrazí „Zakázka je na webu z exportu <datum>. Připravte nový export a požádejte o nasazení – do té doby zůstává zveřejněná.“ Do hlášení to zapiš jako bod, který musí jít v nejbližší dávce.
2. **Žádost o hodnocení.**
   - **Google odkaz.** Do `content/recenze.json` patří pole, ze kterého `build-recenze.mjs` vytváří blok `RECENZE-GOOGLE` (název ověř ve zdroji; pokud pole chybí, přidej `google_recenze_url`). Hodnota: `[DOPLNIT: odkaz na napsání recenze z existujícího Firemního profilu Google „HOLUB surface protection group“ – majitel ho zkopíruje v profilu (volba pro sdílení odkazu na recenze; přesný název ověř v rozhraní)]`. Build při `[DOPLNIT` nebo prázdné hodnotě blok nevytvoří. Jinak přijme jen `https://` adresu na `g.page` nebo `search.google.com`. Odkaz si nevymýšlej a nový profil nezakládej.
   - **Text žádosti** dej do `content/recenze.json` → `zadost` (`"schvaleno": false`). Placeholdery jsou z `content/firma.json`. `{{recenze_url}}` = `https://hspg.cz/recenze/?kod={{kod}}` (tvar URL podle úkolu 06). Návrh k revizi majitelem:
     > Předmět: Jak jsme pracovali? – {{znacka}}
     >
     > Dobrý den, děkujeme, že jste nám svěřili svůj dům. Budeme rádi, když napíšete, jak jsme pracovali – ať je vaše zkušenost dobrá, nebo ne. Hodnocení pomůže ostatním při rozhodování a nám ukáže, co zlepšit.
     > Hodnocení na Googlu: {{google_recenze_url}}
     > Hodnocení na našem webu: {{recenze_url}}
     > Zveřejňujeme dobrá i kritická hodnocení a za hodnocení nenabízíme žádnou odměnu ani slevu. Další e-maily tohoto druhu vám posílat nebudeme; souhlas můžete kdykoli odvolat odpovědí na tento e-mail.
     > {{provozovatel}} · {{znacka}} · {{telefon_zobrazeni}} · {{web}}

     Pokud Google odkaz chybí, řádek s Googlem vypadne a panel upozorní „Chybí odkaz na Google recenze“. Text nespojuj s akcí „Vypusťte holuba“ ani s žádnou soutěží.
   - **Sekce „Hodnocení“ v panelu.**
     - Seznam obsahuje **všechny** zakázky se `souhlas.hodnoceni_email === true`, vyplněným e-mailem a bez odeslané žádosti. Žádné řazení ani výběr podle spokojenosti: registr pole spokojenosti nemá a mít nebude.
     - Tlačítko „Připravit e-mail“ otevře `mailto:` s adresou, předmětem a textem (`encodeURIComponent`; ověř délku ≈ 2 000 znaků). Majitel e-mail odešle ze své schránky a potom klikne na „Označit jako odeslané“ (`PATCH hodnoceni.zadost_odeslana`, kanál `email-rucne`).
     - Pokud úkol 02 už nastavil SMTP (`SMTP_UZIVATEL`, `SMTP_HESLO` v Netlify), přibude tlačítko „Odeslat“ (`POST /api/registr/<kod>/hodnoceni`). Odesílá se přes transport sdílený se `submission-created`, odesílatel a Reply-To podle `content/firma.json`. Jedna žádost na zakázku: druhý pokus vrátí 409.
     - Tlačítka jsou neaktivní, dokud `zadost.schvaleno !== true`. Nic se neodesílá automaticky, hromadně ani opakovaně (žádné upomínky).
     - **SMS se neprogramuje.** U kanálu SMS panel uvede „SMS brána není zřízená (rozhodnutí majitele)“.
   - **`/recenze/`:** Google blok po odeslání zůstává pro všechna hodnocení bez ohledu na hvězdičky (`ukazDiky()`), přidej na to test. Kartičku `/recenze/karta/` neměň.
3. **Šablony odpovědí na recenze** (audit-ai_integrace.json #16, bod 3).
   - `content/recenze.json` → `odpovedi` (`"schvaleno": false`): `kladna` (5★), `smisena` (3–4★), `zaporna` (1–2★). Placeholdery `{{jmeno}}`, `{{telefon_zobrazeni}}` a `{{email_reklamace}}` (z `content/firma.json` → `emaily.reklamace`). Návrhy textů:
     - kladná: „Děkujeme, {{jmeno}}, za hodnocení i za důvěru. Jsme rádi, že jste spokojeni. {{provozovatel}}, {{znacka}}“
     - smíšená: „Děkujeme, {{jmeno}}, za upřímné hodnocení. Vaše připomínky bereme vážně a rádi je s vámi probereme – zavolejte prosím na {{telefon_zobrazeni}}. {{provozovatel}}“
     - záporná: „Mrzí nás, že jste spokojeni nebyli. Rádi to s vámi vyřešíme – ozvěte se prosím na {{telefon_zobrazeni}} nebo {{email_reklamace}}. {{provozovatel}}“
   - V panelu zvolíš počet hvězd a jméno, panel doplní šablonu a nabídne „Kopírovat“. Odpověď vkládá majitel ručně do Google profilu nebo na web.
   - Tlačítko „Návrh s AI“ otevře `/ai-centrum/?uloha=recenze`. Pokud AI centrum parametr neumí, doplň předvýběr úlohy `recenze` z `assets/ai-klient.js`. AI nic nepublikuje a neodesílá.
4. **Podklad pro schůzi SVJ – bez pojištění, dokud není doložené.**
   - Novou šablonu nezakládej. Existující tisk z `/kalkulacka-svj` (`assets/svj-podklad.js`) a `/nabidka-svj` se jen ověří. Neobsahují údaj o pojištění (dnes 0 výskytů), ceny berou z `content/ceny.json` a záruku z centrálního textu (pokud úkol 05 ještě neproběhl, jen to nahlas).
   - Do `content/firma.json` přidej `"pojisteni": { "dolozeno": false, "pojistovna": null, "limit_kc": null, "platnost_do": null, "_poznamka": "Vyplní se až po předložení dokladu (pojistná smlouva nebo certifikát). Do té doby se pojištění na webu ani v tiskovinách neuvádí." }`.
   - **Test-pojistka:** dokud `pojisteni.dolozeno !== true`, výstup webu (HTML a JS v publish adresáři) nesmí obsahovat `/pojišt|pojist/i`. Výjimky se smí uvést jen s odůvodněním v testu (např. zásady ochrany osobních údajů, pokud v nich pojišťovna vystupuje jako příjemce). Nikdy nesmí obsahovat `10 000 000` ani „10 mil“ ve spojení s pojištěním. Do tisku pro zákazníky se `[DOPLNIT]` nedává. Blok s pojištěním z dat se doplní až po doložení (samostatný krok, není součástí tohoto úkolu).
   - V panelu přidej sekci „Podklady“ s odkazy „Podklad pro schůzi SVJ“ → `/kalkulacka-svj` (podoba URL podle úkolu 06) a „Tisk kartiček“ → `/recenze/karta/` (už existuje).
5. **Testy C:**
   - export: položka bez `souhlas.obec` chybí, fotky jsou jen se `souhlas.fotky`. Klíče přesně odpovídají whitelistu. V exportu není `kod`, `psc`, `kontakt`, `sarze` ani hodnota ve tvaru `HS-\d{4}-\d{4}`. Po odvolání souhlasu položka zmizí. `--kontrola` neprojde se zakázaným klíčem,
   - build referencí se současnými daty nezmění HTML,
   - výběr kandidátů žádosti vrátí všechny záznamy se souhlasem a e-mailem bez odeslané žádosti, i když záznamy obsahují libovolná další pole (např. `spokojenost`, `hvezdy`) s jakoukoli hodnotou. Výsledek na nich nezávisí,
   - text žádosti a šablony odpovědí neobsahují `/slev|dárek|dárk|odměn|soutěž|výhr|zdarma|%/i` (kromě věty „nenabízíme žádnou odměnu ani slevu“, kterou test výslovně povolí),
   - `mailto:` je správně zakódované. Druhé odeslání vrátí 409. Při `schvaleno: false` jsou tlačítka neaktivní,
   - Google odkaz: hodnota s `[DOPLNIT` nebo cizí doména blok nevytvoří,
   - Google blok na `/recenze/` nezávisí na hodnocení,
   - test-pojistka z C4.
6. **Hlášení fáze C** (export s počtem 0 je v pořádku a očekávaný).

## Akceptační kritéria
**Fáze A**
- [ ] `git grep -n "x-panel-heslo"` → 0 výskytů v kódu. Test: požadavek s touto hlavičkou a správným heslem vrátí 401.
- [ ] Testy `rd-stav`: bez tokenu 401, heslo v těle 401, platný token 200, prošlý token 401.
- [ ] Heslo se v souborech panelu posílá jen na `/api/majitel` a nikde se neukládá (statický test). V DevTools → Application → Session/Local Storage je jen token a platnost, žádné heslo (ruční kontrola, snímek).
- [ ] Vypínač: test přepnutí bez nasazení (`/api/asistent` → `ai:false`), `AI_ZAPNUTO=0` má přednost, klíč náhledu ≠ klíč produkce.
- [ ] Panel ukazuje u AI „klíč k dispozici / chybí“ (nikde „funguje“ ani ✓), útratu v Kč i v kreditech a srozumitelný stav bez úložiště.
- [ ] `curl -sI <náhled>/rd-control-panel/`: `x-frame-options: DENY`, `x-robots-tag: noindex, nofollow`, `cache-control: no-store`, každá hlavička právě jednou. Totéž pro `/ai-centrum/`.
- [ ] Panel → AI centrum → panel bez druhého přihlášení (lokálně agent, na náhledu majitel). Odkaz „Konzole Claude“ zmizel.

**Fáze B1**
- [ ] `sentinel-validate`: GET 405. Samotný kód, chybný přístupový kód a neexistující kód dají shodný stav 404 i shodné tělo (test porovná řetězce). Správná dvojice vrátí 200 s klíči přesně podle whitelistu. 6. neúspěch → 429.
- [ ] V uloženém záznamu není hodnota přístupového kódu, jen otisk (test).
- [ ] `grep -n "poznamka" <zdroj pas-domu>` → 0. `grep -n "sentinel/validate" <zdroj recenze>` → 0. `grep -n 'placeholder="HS-2026-0001"'` → 0.
- [ ] Fragment s kódem se po načtení pasu odstraní z adresního řádku (e2e nebo ruční kontrola na náhledu s fiktivním záznamem v úložišti náhledu).
- [ ] `git grep -nE "HS-20[0-9]{2}-[0-9]{4}"` mimo testy najde jen ukázku `HS-2026-0000` (a vzory jako `HS-RRRR-ČČČČ`). V repozitáři nejsou žádné skutečné kódy, obce zákazníků ani kontakty.
- [ ] Úložiště: produkce `hspg-registr`, jinde `hspg-registr-nahled` (test výběru + výpis kontextu v hlášení).
- [ ] Hlášení obsahuje počet migrovaných záznamů a počet záznamů bez přístupového kódu (jen čísla).

**Fáze B2**
- [ ] Formulář: ≤ 7 polí `required`, souhlasy nejsou `checked`, souhlas bez dokladu → 400 (testy).
- [ ] Validace serveru (PSČ, plocha, okres, služba, šarže) → 400 s názvem pole (testy).
- [ ] Fotky: obrázek s EXIF/XMP → 400, > 1,5 MB → 400, čistý WebP/JPEG → 200 (testy). Testovací fotka z mobilu má po zmenšení ≤ 1,5 MB a `exiftool` (nebo jiná kontrola metadat) nenajde polohu.
- [ ] Přístupový kód se zobrazí jen jednou a detail ho nevrací (test).
- [ ] Certifikát obsahuje záruku shodnou s centrálním zdrojem a neobsahuje „15 let“ ani „pojišt“ (test).
- [ ] Na 390 px žádný vodorovný posun. Majitel na náhledu zadá fiktivní zakázku do 2 minut (čas v hlášení).
- [ ] `grep -n "innerHTML"` v nových souborech panelu → 0, nebo jen statické šablony bez dat (seznam v hlášení).

**Fáze C**
- [ ] Testy exportu (souhlas, whitelist, odvolání, `--kontrola`) prošly. Se současnými daty build nezměnil `/reference.html` ani homepage (`git diff --stat`).
- [ ] Testy žádosti o hodnocení (nezávislost na spokojenosti, zákaz pobídek, 409, neaktivní tlačítka bez schválení) prošly.
- [ ] Bez platného Google odkazu se blok `RECENZE-GOOGLE` nevytvoří a panel upozorní. S platným odkazem (fixtura) se vytvoří.
- [ ] Test-pojistka: `/pojišt|pojist/i` ve výstupu webu → 0 (nebo jen odůvodněné výjimky) a nikde `10 000 000` ve spojení s pojištěním.
- [ ] Panel má sekce Stav webu · AI · Registr · Hodnocení · Podklady a bez přihlášení nezobrazí žádná data.

## Ověření
```
git -C ../hspg-balicek pull
node --test tests/ukol-14/                      # nebo test skript repozitáře → vše prošlo, uveď počet
git grep -n "x-panel-heslo"                     # → nic
git grep -nE "HS-20[0-9]{2}-[0-9]{4}" -- . ':!tests'   # → jen HS-2026-0000 (ukázka)
netlify dev                                     # lokálně s testovacím heslem v .env (v .gitignore)
npm run nahled                                  # náhled zdarma → <náhled>
curl -sI <náhled>/rd-control-panel/ | grep -iE "x-frame-options|x-robots-tag|cache-control"  # DENY · noindex, nofollow · no-store, každé 1×
curl -sI <náhled>/ai-centrum/      | grep -iE "x-frame-options|x-robots-tag|cache-control"
curl -s -o /dev/null -w "%{http_code}\n" <náhled>/api/registr                 # 401
curl -s -o /dev/null -w "%{http_code}\n" <náhled>/api/ai-stav                 # 401
curl -s -o /dev/null -w "%{http_code}\n" <náhled>/api/sentinel/validate       # 405 (GET)
for i in 1 2 3 4 5 6; do curl -s -o /dev/null -w "%{http_code} " -X POST -H "content-type: application/json" \
  -d '{"sentinel_code":"HS-2099-0001","pristup":"0000-0000-0000"}' <náhled>/api/sentinel/validate; done   # 404 ×5, pak 429
node scripts/stahni-realizace.mjs --kontrola    # fáze C → kód 0
curl -s -o /dev/null -w "%{http_code}\n" <náhled>/tests/                      # 404 (testy nejsou na webu)
```
POST na `/api/sentinel/validate` posílej **jen na náhled** a jen s fiktivním kódem `HS-2099-…` (náhled používá `hspg-registr-nahled`). Na produkci žádné POST testy. Formuláře (`hspg-recenze` ani jiné) se v tomto úkolu neodesílají.

Testy, které agent přidá:
- `rd-stav` a autorizace (A6), vypínač AI (A6),
- schéma a validace, kód a přístupový kód, `sentinel-validate` (shodné odpovědi, whitelist, 429, 405), výběr úložiště (B1.9),
- formulář, fotky a EXIF, certifikát (B2.6),
- export a `--kontrola`, žádost o hodnocení, šablony, Google odkaz, Google blok na `/recenze/`, test-pojistka (C5),
- e2e jen pokud je ve webu Playwright, jinak ruční kontrola se snímky s fiktivními daty.

Lighthouse přístupnost `/pas-domu` (náhled, mobil): stejná nebo lepší než před úkolem, uveď čísla.

## Bez AI / s AI
- **Bez AI** funguje všechno: přihlášení, stav webu, registr, pas domu, certifikát, export, žádost o hodnocení (šablona + `mailto:`), šablony odpovědí i podklady pro SVJ. Registr ani pas nikdy nevolají AI a data zákazníků se do AI automaticky neposílají.
- **S AI:** panel jen ukazuje stav a útratu AI a vede do AI centra. Návrh odpovědi na recenzi vzniká v AI centru (`/ai-centrum/?uloha=recenze`) jako koncept, který majitel ručně upraví a vloží. AI nic nepublikuje ani neodesílá.
- Vypínač „AI pro zákazníky“ v panelu vypne veřejnou AI bez nasazení. H-BOT pak odpovídá z FAQ (úkol 01).

## Nepřekročitelná pravidla
Viz `balicek/KONTEXT.md` §4. Pro tento úkol navíc:
- **Data zákazníků** (kontakty, obce konkrétních zakázek, kódy a přístupové kódy, fotky, doklady souhlasu) nepatří do Gitu, hlášení, logů, chatu ani testovacích fixtur. Do veřejného repozitáře `HSPG-WEB` už vůbec ne. Fixtury jsou jen fiktivní („Testov“, `@example.com`, `HS-2099-…`). Testovací záznamy patří jen do úložiště náhledu nebo do paměti testu.
- Přístupový kód se ukládá jen jako otisk a zobrazí se jen jednou. Kód pasu sám k údajům nikdy nepustí.
- Bez souhlasu se nic nezveřejní. Při jakékoli nejistotě se položka nezobrazí. Odvolání souhlasu jde do nejbližší dávky nasazení.
- **Žádné** hvězdičky, `AggregateRating`/`Review`, hodnocení 4,9/5, pojistné částky ani „satelitní analýza“. Pojištění se neuvádí, dokud není doložené.
- Žádost o hodnocení jde všem zákazníkům se souhlasem, bez filtrování podle spokojenosti, bez odměn a slev a bez vazby na soutěž. Odkaz vede jen na **existující** Google profil. SMS až po zřízení brány majitelem.
- Heslo panelu zadává jen majitel v Netlify (`HSPG_PANEL_HESLO`). Heslo z e-mailu „Master plán“ nikde nepoužívej a nehledej. Nové API klíče nezakládej (Gemini, xAI, OpenWeatherMap ani jiné). MX neměň.
- Tento balíček je veřejný. Do souborů balíčku nepiš podrobnosti o slabinách, jen co se opravilo.
- Kredity: vše testuj lokálně a na náhledu (`npm run nahled`). Produkce jen přes `scripts/nasadit.mjs --produkce --schvaleno "…"` po schválení, v dávce, nejvýš 1× denně. Žádné automatické nasazování.

## Hlášení po dokončení
Formát z `KONTEXT.md` §5 po **každé** fázi. Navíc:
- **Fáze A:**
  - jak `rd-stav` dřív ověřoval heslo (popis bez hodnot) a co se změnilo,
  - stará proměnná ke smazání (jen název),
  - výsledky testů a výpis hlaviček z náhledu,
  - odkaz na náhled a co má majitel na náhledu vyzkoušet (přihlášení → AI centrum → zpět → vypínač),
  - zastaralý test balíčku k `x-panel-heslo`.
- **Fáze B1:**
  - kde byla evidence zakázek a jak proběhla migrace,
  - počty: záznamy celkem, bez přístupového kódu, se starou poznámkou,
  - hodnoty kontextu nasazení (produkce / náhled),
  - přehled API a schéma polí (pro úkol 12 i se zmínkou o `fotovoltaika`),
  - výsledky testů.
- **Fáze B2:**
  - snímky formuláře a certifikátu na 390 px (jen fiktivní data),
  - čas zadání změřený majitelem,
  - velikost fotky před a po zmenšení a výsledek kontroly metadat,
  - zjištění k limitu těla funkce a účtování Netlify Blobs.
- **Fáze C:**
  - počet položek a fotek v exportu (0 je v pořádku),
  - `git diff --stat` buildu referencí,
  - zvolená cesta stažení exportu (CLI / soubor),
  - stav Google odkazu,
  - texty čekající na schválení (souhlas, žádost, šablony odpovědí),
  - výsledek test-pojistky.
- **Čeká na majitele:**
  - odkaz na recenze z existujícího Google profilu,
  - schválení textu souhlasu, žádosti a šablon odpovědí,
  - vydání a předání přístupových kódů ke stávajícím pasům,
  - doklad o pojištění (do té doby se pojištění nikde neuvádí),
  - doba uchování kontaktů (úkol 09),
  - kontrola checklistu hesel z úkolu 00 (heslo panelu nesmí být to z e-mailu „Master plán“).
- **Pro úkol 09:** nové zpracování – registr zakázek v Netlify Blobs (obec, PSČ, okres, plochy, šarže), fotky před/po, kontakty pro žádost o hodnocení, souhlasy a jejich doklady, otisk klienta pro omezení pokusů u pasu domu.
- **Návrhy mimo rozsah:**
  - token v HttpOnly cookie místo `sessionStorage` (audit-ai_integrace.json #12, #19),
  - seznam poptávek v panelu přes Netlify Forms API (vyžaduje token, rozhodnutí majitele),
  - SMS brána,
  - mapa realizací na úrovni obce,
  - generátor QR pro certifikát,
  - interní poznámka k zakázce, která nikdy neopustí panel,
  - blok ověřených realizací v podkladu pro SVJ,
  - úprava testu balíčku k `x-panel-heslo`.
