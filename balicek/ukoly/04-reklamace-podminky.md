# Úkol 04: Reklamace a spotřebitelské informace
> Priorita P0 · Závisí na: 03 včetně jeho fáze B (fáze A2 navíc 02; v pořadí `PORADI.md` oba úkoly předcházejí, stejně jako 17, jehož `assets/spolecne.js` formulář použije) · Čeká na majitele: text obchodních podmínek a reklamačního řádu od právníka (fáze B), schválení textu potvrzení reklamace (A2), souhlas s jedním odesláním `TEST` na náhledu (A2), zda lze reklamaci podat i osobně v sídle · Rozsah: **fáze A1** = stránka `/reklamace/` s formulářem `hspg-reklamace`, odkaz v patičce všech stránek a nepublikovaná šablona podmínek; **fáze A2** = lhůta a potvrzení v oznámeních a koncový test na náhledu; **fáze B** = obchodní podmínky a reklamační řád po dodání textu od právníka. Po každé fázi podej hlášení a počkej na „pokračuj“.

## Proč (s důkazy)
- **Na webu o reklamacích nic není.** V 247 HTML stránkách kopie živého webu je 0 výskytů výrazů „reklamac“, „obchodní podmínk“, „odstoup“, „mimosoudn“ i „coi.cz“ (grep 4. 10. 2026). GET 4. 10. 2026 vrací 404 pro `/reklamace.html`, `/reklamace`, `/reklamace/`, `/obchodni-podminky`, `/obchodni-podminky.html` i `/reklamacni-rad`. Žádná patička na reklamaci neodkazuje (audit-formulare #2 a #4, audit-pravni_pravdivost #2).
- **Zákon to vyžaduje.** Znění jsem ověřil 4. 10. 2026. Zákon o ochraně spotřebitele (dále ZOS) č. 634/1992 Sb. platí ve znění od 20. 8. 2025 do 31. 12. 2026 a § 13, 14 a 19 zůstávají beze změny i ve znění od 1. 1. 2027 (novela 159/2026 Sb.). Občanský zákoník (dále OZ) č. 89/2012 Sb. platí ve znění od 1. 1. do 31. 12. 2026.

  | Ustanovení | Co ukládá | Kde ho úkol řeší |
  |---|---|---|
  | § 13 odst. 1 ZOS | informovat o rozsahu, podmínkách a způsobu reklamace a o tom, kde ji lze uplatnit | A1, stránka |
  | § 13 odst. 2 ZOS | u služeb mimo provozovnu (práce probíhá u zákazníka) uvést písemně jméno a adresu, kde lze reklamaci uplatnit | A1, stránka; B |
  | § 14 odst. 1 ZOS | uvést subjekt mimosoudního řešení sporů (ADR) včetně internetové adresy, a to na webu i v obchodních podmínkách | A1; B |
  | § 19 odst. 2 ZOS | při uplatnění vydat písemné potvrzení s datem, obsahem reklamace, požadovaným způsobem vyřízení a kontaktem | A1 (potvrzení na stránce, ruční e-mail), A2 (automatický e-mail) |
  | § 19 odst. 3 ZOS | vyřídit reklamaci a informovat o tom **nejpozději do 30 dnů** ode dne uplatnění, pokud se strany nedohodnou na delší lhůtě | A1, text; A2, lhůta v oznámení |
  | § 19 odst. 4 a 5 ZOS | po marném uplynutí lhůty smí spotřebitel odstoupit nebo žádat slevu; podnikatel vydá potvrzení o vyřízení, případně odůvodní zamítnutí | A1, text a návod pro majitele |
  | § 1820 odst. 1, § 1824a odst. 3, § 1829, § 1834, § 1837 písm. a) OZ | předsmluvní informace a poučení o odstoupení u smluv na dálku a mimo obchodní prostory; bez poučení se lhůta k odstoupení prodlouží o rok (§ 1829 odst. 4) | B |
  | § 2113 odst. 2 OZ | záruka za jakost vznikne i prohlášením v reklamě | A1: text záruky jen z centrálních dat |
  | § 2587, 2615, 2618 a 2619 OZ | čištění a impregnace jsou dílo (údržba nebo úprava věci); práva z vad díla; vady je třeba oznámit nejpozději do 2 let od předání; záruční doba běží od předání | B (výklad dá právník) |

  Další ověřená fakta:
  - Vzorové poučení a vzorový formulář pro odstoupení stanoví **nařízení vlády č. 29/2023 Sb.** Od 18. 2. 2023 nahradilo NV č. 363/2013 Sb.
  - Evropská platforma ODR je **od 20. 7. 2025 zrušená** (ec.europa.eu přesměrovává na stránku o ukončení), proto na ni neodkazuj.
  - `adr.coi.cz` vrací 301 na `https://coi.gov.cz/informace-o-adr/`. Česká obchodní inspekce tam uvádí, že je subjektem ADR.
- **Smlouvy vznikají na dálku nebo mimo provozovnu.** Nabídka chodí e-mailem a práce probíhá u zákazníka. Ceník stanoví zálohu 30 % nad 100 000 Kč a splatnost 7 dní, u SVJ 14 dní (`content/ceny.json`). Tarify SENTINEL jsou opakované plnění bez smluvních podmínek (audit-pravni #15).
- **Datum uplatnění se nedá doložit a reklamace mohou zapadnout.** Ve sdílené schránce je 2 710 nepřečtených zpráv (KONTEXT §2). Funkce `submission-created` se spouští jen pro ověřená podání. Podání, které Akismet označí jako spam, majitel uvidí jen v Netlify → Forms → Spam, a 30denní lhůta přitom běží.
- **Podklady už existují:**
  - `content/firma.json` směruje `hspg-reklamace` na `reklamace@hspg.cz` (s kopií na zálohu).
  - Úkol 02 přidává štítek `"hspg-reklamace": "Reklamace"`.
  - Úkol 03 přidává mechanismus `data-kontakt="reklamace"` a v patičce blok KONTAKTY.
  - Schránka `reklamace@hspg.cz` funguje (KONTEXT §2).
  - Úkol 00 uvádí ve webHSPGH rozpracovanou `/reklamace.html` (v kopii živého webu není, ověř ve zdroji v kroku 2). Pokud existuje, navaž na ni a nepiš ji znovu.
- **Technické podklady z živého webu:**
  - **Patičky (5 variant):**
    - 234× `footer.foot`: 232 stránek generuje `scripts/build-regions.mjs`, ručně psané jsou rozcestníky `/cisteni-fasad/` a `/cisteni-strech/`,
    - 9× `footer.site-foot`, stejnou má i stránka 404,
    - 1× `footer.sheet-foot` (`/nabidka-svj`),
    - 1× patička s inline stylem (`/`),
    - 2× holý `<footer>` (`/akce/`, `/en.html`).
  - **Fotky:** `/akce/` i `assets/fotky-upload.js` zmenšují nejvýš 3 fotky na 1 600 px (JPEG 0,82). Obrázek dekódují přes `URL.createObjectURL` (adresa `blob:`). CSP, zatím jen Report-Only, měla 4. 10. v `img-src` `'self' data:` a hostitele Clarity, ale ne `blob:`. `blob:` přidává až fáze B úkolu 17. Nový skript proto `blob:` adresy nepoužívá, aby na tom nezávisel.
  - **Netlify Forms** (dokumentace Forms setup, aktualizovaná 16. 9. 2026):
    - na jedno pole jen 1 soubor,
    - požadavek nejvýš 8 MB,
    - nahrávání souborů vyprší po 30 s,
    - honeypot se zapíná atributem `netlify-honeypot`,
    - nahrané soubory jsou dostupné odkazem v oznámení, CSV i API. U souborů s osobními údaji Netlify doporučuje integraci Very Good Security.
  - **Clarity:** `assets/souhlas.js` (funkce `mask()`) označí pro maskování jen prvky, které existují v okamžiku spuštění Clarity po souhlasu (`form, input, textarea, select, [data-lead], [contenteditable]`). Obsah vložený skriptem později maskovaný není.
  - **Kód pasu domu:** `/recenze/` ho ověřuje voláním `/api/sentinel/validate`. Ochranu kódu a tohoto rozhraní řeší úkol 14. Reklamační formulář kód jen přenáší jako text a nic neověřuje.

## Cíl (měřitelný)
1. `/reklamace/` vrací 200 a dá se indexovat. `/reklamace` a `/reklamace.html` vrací 301 na `/reklamace/`. Stránka obsahuje informace podle § 13, 14 a 19 ZOS (test hledá povinné věty, odkazy a údaje z `firma.json`).
2. Formulář `hspg-reklamace` je zaregistrovaný v Netlify Forms a funguje s JavaScriptem i bez něj. S JS po odeslání ukáže potvrzení s číslem `R-RRMMDD-XXXX`, časem odeslání a obsahem reklamace. E2E testy: 0 požadavků mimo localhost, axe-core 0 porušení. Lighthouse mobil `/reklamace/`: přístupnost 100.
3. Odkaz „Reklamace“ je v patičce **100 %** veřejných stránek s `<footer>` (bez interních `rd-control-panel/` a `ai-centrum/`). Stav k 4. 10.: 247 stránek + 404 + 2 nové stránky = 250, plus stránky přidané mezitím (např. `/offline/` z úkolu 17). Rozhoduje rovnost počtů v testu.
4. (A2) O každé reklamaci přijde push do 60 s a e-mail na `reklamace@` do 2 min, s datem „vyřídit do“. Potvrzení zákazníkovi chodí automaticky až po schválení textu, do té doby ho majitel posílá ručně podle šablony.
5. (B) Obchodní podmínky a reklamační řád se zveřejní až s písemným schválením majitele. Do té doby je šablona mimo web (na náhledu vrací 404).
6. Na webu není žádné `[DOPLNIT` a žádné nové nedoložené tvrzení.

## Rozsah
**ANO:**
- stránka `/reklamace/` a děkovací stránka `/reklamace/dekujeme/` pro odeslání bez JS,
- formulář `hspg-reklamace` a skript `assets/reklamace.js`,
- klíče `reklamace` a `potvrzeni_reklamace` (a `sidlo`, pokud chybí) v `content/firma.json`,
- odkaz v patičce všech stránek (včetně šablony v `build-regions.mjs` a stránky 404),
- přesměrování 301 a záznam v sitemap,
- jedna položka FAQ v H-BOT,
- šablona obchodních podmínek a reklamačního řádu (nepublikovaná),
- testy a náhled,
- v A2 rozšíření `submission-created` o reklamace a koncový test,
- v B stránka podmínek po schválení.

**NE (patří jinam):**
- e-mailové adresy, `data-mail`, blok KONTAKTY a jejich build → **úkol 03** (jen použij `data-kontakt="reklamace"`),
- předmět a Reply-To u ostatních formulářů, kanály ntfy/Telegram/SMTP, limity potvrzení → **úkol 02** (v A2 je jen rozšiřuješ o reklamace),
- délka a text záruky, jejich centralizace → **úkol 05** (jen čti `firma.json`),
- globální sjednocení `/x` vs. `/x.html`, generátor sitemap → **úkol 06** (dodrž jeho konvenci, pokud je sloučený),
- jednotná patička a identifikace podle § 435 OZ → **úkol 08** (sem patří jen odkaz „Reklamace“),
- text zásad ochrany osobních údajů → **úkol 09** (na `/reklamace/` patří jen krátká informace u formuláře),
- události měření a GA4 → **úkol 10** (žádné nové `dataLayer.push`),
- JSON-LD a drobečková navigace → **úkol 11** (na nové stránky JSON-LD nedávej),
- sdílené pomocné funkce validace a masky kódu (`assets/spolecne.js`) a `blob:` v CSP → **úkol 17** (funkce jen použij, soubor ani CSP neměň),
- anglická informace o reklamaci → **úkol 18** (na `/en` sem patří jen odkaz z kroku 10),
- ochrana kódu pasu domu a registr zakázek → **úkol 14**,
- CSP a monitoring → **úkol 15**,
- sjednocení validace a zmenšování fotek v ostatních formulářích → jen návrh do hlášení,
- produkční nasazení, DNS a MX.

## Postup

### Fáze A1 – stránka, formulář a patičky (lokálně, nic se neodesílá)
1. **Větev `ukol-04-reklamace` z aktuální `main`.** Nejdřív `git -C ../hspg-balicek pull`.
   - Ověř, že je sloučený úkol 03 **včetně fáze B** (úkol 03 smí sloučit fázi A samostatně): v `content/firma.json` existuje `emaily_na_webu`, existuje `scripts/build-kontakty.mjs`, `scripts/lib/kontakty.mjs` exportuje `blokKontaktu` a patička stránky 404 obsahuje značku `<!-- KONTAKTY:START -->`. Stránka potřebuje blok KONTAKTY, kotvu `#kontakty` a `data-reveal="load"` z fáze B. **Pokud cokoli chybí, zastav se a nahlas.**
   - Zapiš, zda je sloučený úkol 02 (`nazvy_formularu` ve `firma.json`), 17 (`assets/spolecne.js`), 05 a 06.
2. **Najdi v repozitáři soubory, které generují:**
   - dokumentové stránky (vzor: `/pravidla-akce/index.html` s `header.site-head` a `footer.site-foot`), stránku 404 a 5 variant patičky (viz Proč), u 232 stránek šablonu v `scripts/build-regions.mjs`,
   - `sitemap.xml` (ručně, nebo skriptem z úkolu 06), pravidla přesměrování (`_redirects` nebo `netlify.toml` → `[[redirects]]`), `netlify.toml` → `[build] publish` a `command`,
   - `content/firma.json`, `content/hbot-faq.json`, `scripts/build-hbot.mjs`, `scripts/lib/kontakty.mjs` (funkce `nbsp()` z úkolu 03), adresář funkcí a stávající testy,
   - **rozpracovanou reklamaci:** `git log --all --oneline -- '*reklamac*'` a `git grep -il reklamac $(git for-each-ref --format='%(refname)' refs/heads refs/remotes)`. Pokud najdeš rozpracovaný soubor, převezmi z něj použitelné části. Každé tvrzení v něm ověř proti `KONTEXT.md` a vše nedoložené vynech.

   Pokud se HTML generuje skriptem, uprav generátor, ne výstup.
3. **Ověř právní předpisy v den práce.** Na e-Sbírce (`https://e-sbirka.gov.cz/sb/1992/634`, `/sb/2012/89`, `/sb/2023/29`) ověř znění citovaných ustanovení (tabulka v Proč), zvlášť § 13, 14 a 19 ZOS. Do hlášení zapiš verzi a datum účinnosti, které jsi viděl. Pokud se znění liší od tabulky, příslušnou část nepublikuj a nahlas ji. Ověř také `curl -sIL https://coi.gov.cz/informace-o-adr/` (výsledek 200).
4. **Data v `content/firma.json`** (jediný zdroj pro stránku, H-BOT i funkci; ostatní klíče neměň):
   ```json
   "reklamace": {
     "_poznamka": "Pro /reklamace/, H-BOT a submission-created. Lhůta: § 19 odst. 3 zákona č. 634/1992 Sb.; ADR: § 14 téhož zákona (ověřeno v e-Sbírce).",
     "url": "/reklamace/",
     "lhuta_dni": 30,
     "adr": { "nazev": "Česká obchodní inspekce", "url": "https://coi.gov.cz/informace-o-adr/" },
     "osobne_v_sidle": null,
     "reseni": ["Odstranění vady", "Přiměřená sleva z ceny", "Odstoupení od smlouvy kvůli vadě", "Jiné / poraďte mi"]
   }
   ```
   - `osobne_v_sidle` zůstává `null`, dokud majitel nepotvrdí text věty (otázka do hlášení).
   - Pokud chybí `sidlo`, přidej ho přesně ve tvaru z úkolu 08: `{ "ulice": "Pernerova 10/32", "psc": "186 00", "obec": "Praha 8 – Karlín" }`. Údaj je na webu a odpovídá ARES (audit-pravni #13).
   - Pokud chybí `nazvy_formularu["hspg-reklamace"]` (úkol 02), doplň `"Reklamace"`.
   - Přidej i `potvrzeni_reklamace` s `"schvaleno": false` a textem z kroku 20. V A1 slouží jako šablona pro ruční potvrzení.
5. **Stránka `reklamace/index.html`.** Kanonická adresa je `https://hspg.cz/reklamace/`. Pokud je sloučený úkol 06, platí jeho konvence. Bez něj zvol podobu s lomítkem, stejně jako `/akce/`, `/recenze/` a `/pravidla-akce/`.
   - **Hlava** jako `/pravidla-akce/` (písma, `brand.css`, `header.site-head`):
     - `title` „Reklamace | HOLUB HSPG“,
     - `description` do 160 znaků, např. „Jak reklamovat práci HOLUB – HSPG: formulář s fotkami, e-mail nebo dopis. Reklamaci vyřídíme do 30 dnů. Mimosoudní řešení sporů: ČOI.“,
     - `canonical`, `og:url`, `og:title` a `og:description` jako na ostatních dokumentových stránkách,
     - **bez** `noindex` a bez JSON-LD.
   - **Patička** stejná jako ostatní `site-foot` stránky po úkolu 03, včetně bloku KONTAKTY a odkazu „Reklamace“ s `aria-current="page"`. Skripty `kontakt.js`, `souhlas.js` a `hbot.js` načti s `defer` jako na `/cenik.html` (vzorová `/pravidla-akce/` `hbot.js` nenačítá, na `/reklamace/` ho přidej, potřebuje ho test H-BOT). Navíc `/assets/spolecne.js` (úkol 17, pokud existuje) a za ním `/assets/reklamace.js`, oba s `defer`, aby se zachovalo pořadí.
   - **Text** – drž se tohoto návrhu. Stránku piš jako statické HTML, nový generátor nepřidávej. Údaje přepiš z `firma.json`, jejich shodu s daty hlídá test z kroku 13. Nezlomitelné mezery (KONTEXT §4 bod 9) vlož jako `&nbsp;`. Za jednopísmenné předložky a spojky je umí doplnit `nbsp()` z úkolu 03. Ta ale neřeší mezeru mezi číslem a jednotkou („30&nbsp;dnů“, „8&nbsp;MB“) ani za „§“ („§&nbsp;19“), ty vlož ručně.
     ```text
     H1  Reklamace
     Perex  Pokud s naší prací něco není v pořádku, dejte nám vědět. Uplatnění reklamace vám písemně
            potvrdíme a reklamaci vyřídíme nejpozději do 30 dnů.

     H2  Jak reklamaci uplatnit
       • Formulářem na této stránce – můžete přiložit až 3 fotografie.
       • E-mailem: <a data-kontakt="reklamace" data-reveal="load" href="#kontakty">reklamace (zavináč) hspg.cz</a>
       • Dopisem na adresu: Dušan Holub, Pernerova 10/32, 186 00 Praha 8 – Karlín.
       • [jen pokud firma.reklamace.osobne_v_sidle není null: text věty od majitele]
       Máte dotaz k reklamaci? Volejte +420 736 618 486 (Po–So 7:00–19:00).

     H2  Co do reklamace uvést
       jméno a kontakt (telefon a e-mail) · adresu objektu, kde jsme pracovali · kdy jsme práce prováděli
       (stačí měsíc a rok) a kód pasu domu HS-RRRR-ČČČČ, pokud ho máte · popis vady: co se děje, na které
       části objektu a od kdy · jaké řešení požadujete · fotografie vady, pokud je můžete pořídit

     H2  Jak reklamaci vyřídíme
       1. Uplatnění reklamace vám písemně potvrdíme: uvedeme datum uplatnění, obsah reklamace,
          požadovaný způsob vyřízení a vaše kontaktní údaje.
       2. Reklamaci včetně odstranění vady vyřídíme a o vyřízení vás budeme informovat nejpozději
          do 30 dnů ode dne uplatnění, pokud se spolu nedohodneme na delší lhůtě.
       3. Pokud tuto lhůtu nedodržíme, můžete od smlouvy odstoupit nebo požadovat přiměřenou slevu.
       4. Po vyřízení vám vydáme potvrzení o datu a způsobu vyřízení, včetně potvrzení o provedení
          opravy a době jejího trvání, případně písemné odůvodnění zamítnutí reklamace.
       Postup se řídí § 19 zákona č. 634/1992 Sb., o ochraně spotřebitele.

     H2  Záruka na impregnaci H-STONE
       {firma.zaruka.veta} {firma.zaruka.podminka} Záruka je navíc k vašim zákonným právům
       z vadného plnění a tato práva neomezuje.

     H2  Mimosoudní řešení sporů
       Pokud se nám spor nepodaří vyřešit dohodou, můžete se obrátit na subjekt mimosoudního řešení
       spotřebitelských sporů. Je jím Česká obchodní inspekce: <a href="https://coi.gov.cz/informace-o-adr/"
       rel="noopener">coi.gov.cz/informace-o-adr</a> (§ 14 zákona o ochraně spotřebitele).

     H2  Kdo reklamace vyřizuje
       Dušan Holub, IČO 09291881, sídlo Pernerova 10/32, 186 00 Praha 8 – Karlín ·
       e-mail (data-kontakt="reklamace") · tel. +420 736 618 486

     H2  Reklamační formulář   (krok 6)
     ```
   - **Záruka:** větu ber **doslova** z `firma.zaruka.veta` a `firma.zaruka.podminka` (lišit se smí jen nezlomitelnými mezerami), nepřeformulovávej (§ 2113 odst. 2 OZ: text záruky z reklamy zavazuje). Pokud je sloučený úkol 05, použij jeho jediný zdroj. Věta „Záruka je navíc…“ vychází z § 2113 odst. 1 OZ.
   - **Nepiš:** pojištění ani pojistnou částku, hodnocení a hvězdičky, lhůtu prohlídky nebo odpovědi („do 2 hodin“, „do 48 h“), slovo „garance“, odkazy na ODR ani nic o rozsahu záruky (to přijde až ve fázi B).
6. **Formulář `hspg-reklamace`** – statické HTML ve stránce, tím se v Netlify zaregistruje (samostatný skrytý registrační formulář není potřeba). Pokud generátor formulář vykresluje JavaScriptem, přidej statický registrační formulář jako v `index.html` u `hspg-poptavka`. **Každé pole, které posílá JS, musí být i ve statickém HTML** (hlídá to test).
   `<form id="reklamace-form" name="hspg-reklamace" method="POST" action="/reklamace/dekujeme/" enctype="multipart/form-data" data-netlify="true" netlify-honeypot="_honey" data-clarity-mask="true">`

   | Pole (`name`) | Typ a atributy | Povinné |
   |---|---|---|
   | `form-name` = `hspg-reklamace` | hidden | – |
   | `subject` | hidden, `data-remove-prefix`, statická hodnota `[HSPG] Reklamace %{submissionId}`. JS ji přepíše na `[HSPG] Reklamace R-… · vyřídit do D. M. RRRR` (datum odeslání + `lhuta_dni`) | – |
   | `Číslo reklamace` | hidden, vyplní JS | – |
   | `_honey` | `<p hidden><label>Nevyplňujte <input name="_honey" tabindex="-1" autocomplete="off"></label></p>` (jako `/recenze/`) | – |
   | `Jméno` | text, `autocomplete="name"`, `maxlength="80"` | ano |
   | `Telefon` | tel, `autocomplete="tel"`, `maxlength="20"`; JS kontroluje a normalizuje přes `telefon()` z `assets/spolecne.js` (úkol 17: CZ, SK i ostatní E.164, pevné linky), do payloadu jde normalizovaná `hodnota` | ano |
   | `email` | email, `autocomplete="email"`, `maxlength="120"` (malé `email` kvůli Reply-To v Netlify) | ano |
   | `Adresa objektu` | text, `autocomplete="street-address"`, `maxlength="140"` | ano |
   | `Kód pasu domu` | text, `pattern="HS-[0-9]{4}-[0-9]{4}"`, `maxlength="12"`, `autocomplete="off"`, maska přes `kod()` z `assets/spolecne.js` (úkol 17). **Bez ověřování přes `/api/sentinel/validate`.** | ne |
   | `Kdy jsme práce prováděli` | text, `maxlength="20"`, placeholder „např. 8/2026“ | ne |
   | `Popis vady` | textarea, `minlength="20"`, `maxlength="2000"`, nápověda „Co se děje, na které části objektu a od kdy.“ | ano |
   | `Požadované řešení` | select s hodnotami z `firma.reklamace.reseni` | ano |
   | `Fotografie 1`, `Fotografie 2`, `Fotografie 3` | tři samostatná viditelná pole `type="file"` (Netlify: 1 soubor na pole), `accept="image/jpeg,image/png,image/webp,image/heic,image/heif"`; bez JS nápověda „celkem nejvýš 8 MB“ | ne |
   | `Zpracování údajů` | checkbox, `value="beru na vědomí"`, popisek „Beru na vědomí informace o zpracování osobních údajů uvedené výše.“ | ano |

   - **Nad checkboxem** krátká informace o zpracování údajů (úkol 09 ji později převezme do zásad):
     > Údaje z formuláře a fotografie použijeme jen k vyřízení vaší reklamace. Právním důvodem je plnění smlouvy a povinností podle zákona o ochraně spotřebitele (čl. 6 odst. 1 písm. b) a c) GDPR). Formulář technicky zpracovává Netlify, e-maily doručuje Seznam.cz. Reklamaci a její vyřízení uchováváme spolu se smluvní a záruční dokumentací. Vaše práva a obecné informace o zpracování najdete v [zásadách ochrany osobních údajů](/ochrana-osobnich-udaju).

     Jde o **vzetí na vědomí, ne o souhlas.** Slovo „souhlas“ u tohoto pole nepoužívej: u reklamace je právním titulem smlouva a zákonná povinnost (§ 19 ZOS). Souhlas by šel odvolat a odporoval by nálezům audit-pravni #4 a audit-formulare #10. Zdůvodnění uveď v hlášení.
   - U fotek nápověda: „Až 3 fotografie. Fotky z mobilu před odesláním zmenšíme. Nefoťte prosím osoby ani poznávací značky.“
   - Tlačítko „Odeslat reklamaci“. Písmo polí 16 px, výška ovládacích prvků ≥ 44 px, `label` u každého pole, nápovědy přes `aria-describedby`.
7. **`assets/reklamace.js`** – bez závislostí, jen na této stránce, `defer`. Bez JS formulář funguje nativně.
   - **Inicializace:** `form.noValidate = true` (bez JS zůstává validace prohlížeče), sloučení tří polí fotek do jednoho výběru s náhledy a tlačítky „Odebrat“. Původní tři pole zůstanou v DOM jako `hidden`.
   - **Validace:**
     - u pole vlastní text `<p id="<pole>-chyba">`, `aria-invalid="true"` a `aria-describedby`,
     - souhrn chyb nahoře s `role="alert"` a odkazy na pole, fokus na první chybné pole,
     - konkrétní hlášky, např. „Popis vady musí mít aspoň 20 znaků (teď má 12).“, „Kód pasu domu má tvar HS-RRRR-ČČČČ.“
   - **Fotky:**
     - nejvýš 3; při výběru více se zobrazí „Odešleme první 3 fotografie.“,
     - dekóduj přes `createImageBitmap(file)`, při selhání přes `FileReader` → `data:`. **Nepoužívej `blob:` adresy**, CSP `img-src` povoluje jen `'self' data:`,
     - zmenši na 1 600 px, JPEG 0,82 (parametry jako `fotky-upload.js`); pokud má výsledek přes 2 MB, ještě jednou s kvalitou 0,7, jinak fotku odmítni,
     - celý požadavek nejvýš 7 MB (rezerva pod limitem 8 MB),
     - náhled přes `canvas.toDataURL`,
     - nerozpoznaný formát (PDF, HEIC v prohlížeči, který ho neumí) odmítni hláškou „Fotku {název} neumíme zpracovat. Vyfoťte ji prosím jako JPG, nebo ji pošlete e-mailem (adresa je výše).“
   - **Odeslání:**
     - ochrana proti dvojímu odeslání, tlačítko ukáže „Odesílám…“,
     - číslo `R-RRMMDD-XXXX`: datum odeslání a 4 znaky z `crypto.getRandomValues`, abeceda bez 0, O, 1 a I. Pokud `assets/poptavka-zdroj.js` z úkolu 02 umí předponu, použij ho, **neupravuj ho** – jinak vlastní pětiřádková funkce,
     - `subject` a `Číslo reklamace` nastav v `FormData`, pole fotek nahraď zmenšenými soubory (`fd.set('Fotografie 1', blob, 'foto-1.jpg')`),
     - `fetch('/', { method: 'POST', body: fd })` bez hlavičky `Content-Type`, s časovým limitem 30 s (`AbortController`).
   - **Úspěch:** formulář nahraď sekcí `<section id="reklamace-potvrzeni" tabindex="-1" data-lead data-clarity-mask="true">` a přesuň na ni fokus. Obsah:
     - nadpis „Reklamaci jsme přijali“,
     - číslo reklamace a čas odeslání (`cs-CZ`, `Europe/Prague`),
     - požadované řešení, popis vady, adresa objektu, kontakt, počet fotek – **vše přes `textContent`, nikdy `innerHTML`**,
     - „Uplatnění reklamace vám potvrdíme také e-mailem z adresy reklamace@hspg.cz. Reklamaci vyřídíme nejpozději do 30 dnů ode dne uplatnění (do D. M. RRRR).“ Adresu doplň z `data-mail`, ne natvrdo,
     - tlačítko „Vytisknout nebo uložit potvrzení“ (`window.print()`). Tiskové CSS ukáže jen potvrzení a identifikaci firmy.
   - **Chyba** (`!r.ok`, síť, časový limit): zůstaň na stránce. Zobraz trvalou hlášku s `role="alert"`: „Reklamaci se nepodařilo odeslat. Vaše údaje i fotky zůstaly ve formuláři – zkuste to prosím znovu, nebo zavolejte +420 736 618 486 (Po–So 7:00–19:00), případně napište na …“ (odkaz `data-kontakt="reklamace"`). Tlačítko odemkni, nic nemaž. **Žádná záloha přes FormSubmit ani `mailto:` s údaji.**
   - **Soukromí:**
     - nic neukládej do `localStorage`, `sessionStorage` ani cookies,
     - žádné osobní údaje v URL,
     - žádné `dataLayer.push`.
8. **`reklamace/dekujeme/index.html`** pro odeslání bez JS:
   - `<meta name="robots" content="noindex">`, stejná hlavička a patička,
   - text: „Reklamaci jsme přijali. Uplatnění vám potvrdíme e-mailem z adresy reklamace@hspg.cz (odkaz `data-kontakt`). Reklamaci vyřídíme nejpozději do 30 dnů ode dne uplatnění. Spěcháte? Volejte +420 736 618 486 (Po–So 7:00–19:00).“,
   - žádné osobní údaje, nepatří do sitemap.
9. **Adresy a sitemap:**
   - Pravidlo `/reklamace.html  /reklamace/  301` přidej tam, kde jsou ostatní přesměrování. `/reklamace` → `/reklamace/` zajistí Netlify samo (stejně jako u `/recenze`); ověř to na náhledu.
   - Do `sitemap.xml` přidej jen `/reklamace/` (generátorem z úkolu 06, nebo ručně s dnešním `lastmod`).
   - `/reklamace/index.html` neřeš, to dělá úkol 06 globálně.
10. **Odkaz „Reklamace“ v patičce všech stránek** (`href="/reklamace/"`, případně podle konvence úkolu 06). Text, pořadí ani styl patičky jinak neměň (úkol 08):

    | Varianta | Kam |
    |---|---|
    | `footer.foot` (šablona v `build-regions.mjs` + 2 rozcestníky) | před „Nastavení cookies“, oddělené „ · “ jako ostatní odkazy; pak přegeneruj 232 stránek |
    | `footer.site-foot` (9 stránek, 404, 2 nové) | do `.site-foot-links` za „Ochrana osobních údajů“ |
    | `footer.sheet-foot` (`/nabidka-svj`) | k ostatním odkazům patičky |
    | `/` (inline styl) | sloupec DOKUMENTY za „Zásady ochrany osobních údajů“ |
    | `/akce/` | vedle „Pravidla akce“ uvnitř `<p class="fbot">` |
    | `/en.html` | `<a href="/reklamace/" hreflang="cs">Complaints (in Czech)</a>` |

    Pak spusť `node scripts/build-kontakty.mjs --kontrola` (úkol 03). Pokud jeho testy počítají pevné počty `data-mail`, uprav je kvůli novým stránkám a uveď to v hlášení.
11. **H-BOT** (`content/hbot-faq.json`, pak `node scripts/build-hbot.mjs` a `--kontrola`). Přidej otázku:
    ```json
    { "k": ["reklam", "vada", "vady", "vadn", "zavad", "nespokoj", "stiznost"],
      "q": "Jak reklamovat provedenou práci?",
      "a": "Reklamaci uplatníte nejrychleji formulářem na stránce Reklamace, kde můžete přiložit i fotky. Najdete tam také e-mail a adresu pro písemné podání. Uplatnění vám písemně potvrdíme a reklamaci vyřídíme nejpozději do 30 dnů ode dne uplatnění.",
      "link": ["/reklamace/", "Reklamace"] }
    ```
    Adresu do JSON nepiš (soubor je veřejný, ochrana proti sběračům adres). Testy balíčku proti webu (`npm test`, `npm run test:e2e` v `../hspg-balicek`) musí dál projít.
12. **Šablona obchodních podmínek a reklamačního řádu (NEPUBLIKOVAT).**
    - **Umístění:** soubor `obchodni-podminky.sablona.md` dej mimo publikovaný adresář. Pokud se publikuje kořen repozitáře, ověř na náhledu (krok 14), že cesta vrací 404. Pokud ne, šablonu do repozitáře webu nedávej, dej ji jen do hlášení a nahlas to pro úkol 15.
    - **Obsah:** sekce, u každé zdroj a `[DOPLNIT: …]` pro právníka. Čísla jen jako odkaz na data:
      1. **Identifikace podnikatele:** Dušan Holub, IČO, sídlo, zápis v RŽP `[DOPLNIT: evidující úřad – úkol 08]`, neplátce DPH, kontakty (§ 435 a § 1820 odst. 1 písm. b–d OZ).
      2. **Pro koho podmínky platí:** spotřebitel, podnikatel, SVJ.
      3. **Uzavření smlouvy:** poptávka → zaměření → písemná nabídka e-mailem → přijetí. Smlouva na dálku nebo mimo obchodní prostory, předsmluvní informace (§ 1820), potvrzení smlouvy (§ 1824a).
      4. **Cena, záloha, splatnost, minimální zakázka a doprava** z `content/ceny.json` (`platby`, `minimum`, `doprava`).
      5. **Termín, počasí a součinnost** (voda, elektřina, přístup) `[DOPLNIT]`.
      6. **Provedení a předání díla**, předávací protokol `[DOPLNIT]`.
      7. **Odpovědnost za škodu** `[DOPLNIT: právník]`. Pojištění **neuváděj**, dokud majitel nedoloží pojistku (KONTEXT §3).
      8. **Práva z vadného plnění:** § 2615 a násl., § 2618, případně § 2629 OZ `[DOPLNIT: právník – které ustanovení se uplatní]`.
      9. **Reklamační řád:** shodně se stránkou `/reklamace/`, § 13 a 19 ZOS.
      10. **Záruka za jakost H-STONE:** text z `firma.zaruka`, záruční doba běží od předání (§ 2619), co záruka kryje a co ne `[DOPLNIT]`, vztah k tarifu SENTINEL a co se stane po jeho ukončení `[DOPLNIT]` (audit-pravni #15).
      11. **Odstoupení od smlouvy:**
          - 14 dní (§ 1829),
          - žádost o zahájení prací ve lhůtě (§ 1824a odst. 3 a § 1828 odst. 5),
          - poměrná část ceny (§ 1834),
          - zánik práva po úplném provedení (§ 1837 písm. a)),
          - vzorové poučení a vzorový formulář podle NV č. 29/2023 Sb. (přílohy předpisu převezmi doslova z e-Sbírky).
      12. **Tarify SENTINEL:**
          - ceny z `content/sentinel.json`,
          - celková roční cena při měsíční platbě (12 × 219 = 2 628 Kč; 12 × 389 = 4 668 Kč, ověř výpočtem z dat),
          - doba, prodloužení, výpověď, platba a význam „zásahu do X dnů“ `[DOPLNIT]` (§ 1820 odst. 1 písm. e), o), p)).
      13. **Prodej doplňků technikem u zákazníka** `[DOPLNIT: probíhá? – kariera.html zmiňuje provizi z prodeje]`.
      14. **Mimosoudní řešení sporů:** ČOI a odkaz podle `firma.reklamace.adr` (§ 14 ZOS).
      15. **Ochrana osobních údajů:** odkaz na zásady (úkol 09).
      16. **Závěrečná ustanovení:** „Platné od“ a verze.
13. **Testy** (struktura testů z úkolů 02 a 03, Node test runner, Playwright a axe-core jako v `balicek/testy/e2e/hbot.test.mjs`, žádné jiné nové závislosti, testy se nepublikují):
    - **`tests/reklamace.test.mjs`** (statický průchod publikovaného adresáře `$PUB`):
      - **Formulář:** atributy z kroku 6; všechna pole z tabulky existují, povinnost odpovídá; tři pole souborů bez `multiple`; `subject` má `data-remove-prefix`.
      - **Text stránky:** obsahuje „30 dnů“, „§ 19“, „634/1992 Sb.“, „Česká obchodní inspekce“, odkaz `firma.reklamace.adr.url`, adresu sídla z `firma.sidlo` a doslovně `firma.zaruka.veta` i `podminka`.
      - **Zakázané výrazy:** žádné „15 let“, „[DOPLNIT“, „pojišt“, „ec.europa.eu/consumers/odr“, „formsubmit“, „profiserv“ ani `/api/sentinel/validate`.
      - **Nezlomitelné mezery:** viditelný text nové stránky nemá za jednopísmennou předložkou nebo spojkou (`v k s z o u a i`) ani mezi číslem a jednotkou (`dnů`, `Kč`, `MB`, `%`) obyčejnou mezeru; `§` následuje nezlomitelná mezera.
      - **Děkovací stránka:** `dekujeme/` má `noindex`; sitemap má `/reklamace/` právě 1× a `dekujeme` 0×; přesměrování `/reklamace.html` → `/reklamace/` 301 je v pravidlech.
      - **Patičky:** každý HTML soubor s `<footer>` má **uvnitř `<footer>`** odkaz na `/reklamace/`. Test vypíše počet stránek s patičkou a počet stránek s odkazem a ty se musí rovnat.
      - **Data:** `firma.json` je platný JSON; `smerovani_formularu["hspg-reklamace"] === "reklamace"`; `nazvy_formularu["hspg-reklamace"] === "Reklamace"`; `potvrzeni_reklamace.schvaleno === false`.
    - **`tests/e2e/reklamace.e2e.test.mjs`** (vlastní statický server nad `$PUB`; externí požadavky `ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort())` a test ověří, že žádný neodešel; POST zachyť přes `page.route`):
      - Prázdné odeslání: chyby u 7 povinných polí, `aria-invalid="true"`, souhrn `role="alert"`, fokus na „Jméno“ a **žádný POST**.
      - Platné odeslání s daty `TEST` a vygenerovaným PNG 2 400 × 1 600 (odpověď 200). Payload obsahuje:
        - `form-name=hspg-reklamace`,
        - `subject` odpovídající `^\[HSPG\] Reklamace R-\d{6}-[A-HJ-NP-Z2-9]{4} · vyřídit do `,
        - `Číslo reklamace` podle regexu,
        - `Fotografie 1` jako `image/jpeg` ≤ 2 MB,
        - celkem ≤ 7 MB,
        - **každý klíč payloadu existuje ve statickém formuláři**.
      - Potvrzení po odeslání: zobrazí číslo, „30 dnů“ a popis vady, fokus je na `#reklamace-potvrzeni` a sekce má `data-clarity-mask`.
      - 4 vybrané fotky → odešlou se 3 a zobrazí se hláška; PDF → odmítnuto s hláškou.
      - Odpověď 500 a zrušený požadavek → `role="alert"`, URL beze změny, údaje i fotky zůstanou, tlačítko je aktivní.
      - Úložiště prohlížeče: `localStorage`, `sessionStorage` a cookies jsou po odeslání stejné jako před ním.
      - `javaScriptEnabled: false`: nativní multipart POST na `/reklamace/dekujeme/` obsahuje všechna povinná pole.
      - Šířky 360 a 1 280 px: `scrollWidth <= innerWidth`, žádná chyba konzole.
      - axe-core (WCAG 2.2 AA) nad formulářem, stavem s chybami i potvrzením → 0 porušení.
      - H-BOT: dotaz „Chci reklamovat vadu“ → odpověď s odkazem `/reklamace/`.
14. **Náhled** (`npm run nahled`, tj. `node scripts/nasadit.mjs`, 0 kreditů). Jen GET, **nic neodesílej**:
    - kontroly `curl` z části Ověření,
    - formulář `hspg-reklamace` je v seznamu Netlify Forms (UI Forms nebo `npx netlify api listSiteForms --data '{"site_id":"e4dff53f-791b-4c8c-946c-a23d06421774"}'`, vypiš jen názvy),
    - šablona podmínek vrací 404,
    - Lighthouse mobil `/reklamace/`. Pokud náhled posílá `X-Robots-Tag: noindex` (ověř `curl -sI`), audit `is-crawlable` v SEO ignoruj a SEO změř i lokálně.

    Pokud se formulář v seznamu neobjeví, nahlas to. Neřeš to produkčním nasazením.
15. **Hlášení fáze A1** (formát níže) a **zastav se**.
    - Přilož **návod pro majitele**, který platí od zveřejnění stránky:
      - **Ruční potvrzení:** do zprovoznění A2 posílej potvrzení o uplatnění sám z `reklamace@hspg.cz` podle šablony `potvrzeni_reklamace` (krok 20, bez posledního řádku o automatickém odeslání). Datem uplatnění je čas podání v Netlify Forms nebo doručení e-mailu či dopisu.
      - **Lhůta:** zapiš si do kalendáře datum uplatnění + 30 dnů.
      - **Potvrzení o vyřízení** (§ 19 odst. 5): „Reklamace č. … uplatněná dne … byla vyřízena dne … takto: … (oprava provedena dne …, trvala …) / zamítnuta z důvodu: …“.
      - **Filtr ve schránce Seznam**, zařazený **před** filtry z úkolu 02: „Komu obsahuje reklamace@hspg.cz“ nebo „předmět obsahuje `[HSPG] Reklamace`“ → složka **Reklamace**, označit jako důležité.
      - **Jednou týdně** Netlify → Forms → `hspg-reklamace` → **Spam** (reklamace ve spamu nespustí oznámení, lhůta ale běží; souvisí s úkolem 15).
      - Dopisy na adresu sídla: datum doručení je datum uplatnění.
    - Do hlášení dej také **otázky pro majitele:**
      - lze reklamaci podat osobně v sídle,
      - schválení textu potvrzení,
      - souhlas s jedním `TEST` odesláním v A2.

### Fáze A2 – lhůta a potvrzení v oznámeních, koncový test (po sloučení úkolu 02 a se souhlasem majitele)
16. Ověř, že je sloučený úkol 02. Pokud ne, A2 nedělej a nahlas to.
17. **`submission-created.mjs` – reklamace:**
    - **Číslo:** vezmi z `data["Číslo reklamace"]`, pokud odpovídá `^R-\d{6}-[A-HJ-NP-Z2-9]{4}$`. Jinak použij záložní číslo z úkolu 02; neplatnou hodnotu nikam nepropisuj.
    - **Lhůta:** exportuj `lhutaVyrizeni(created_at, dni = firma.reklamace.lhuta_dni)`. Vrátí datum přijetí a „D. M. RRRR“ = datum přijetí v `Europe/Prague` + 30 dnů. Lhůta počíná dnem následujícím (§ 605 OZ). Posun na pracovní den (§ 607) nepoužívej, interní připomínka má být dřív, ne později.
    - **E-mail pro majitele:** předmět ve formátu z úkolu 02 a za ním „ · vyřídit do D. M. RRRR“. První řádek textu: „Lhůta pro vyřízení (§ 19 odst. 3 zákona o ochraně spotřebitele): do D. M. RRRR (30 dnů od přijetí D. M. RRRR).“
    - **Push:** `[HSPG] Reklamace R-… · vyřídit do D. M.`, **bez osobních údajů** (stávající logika `OZNAMENI_S_UDAJI`).
    - **Směrování a Reply-To:** na `reklamace@` s kopií na zálohu (už platí). Reply-To z `email`.
18. **Potvrzení o uplatnění zákazníkovi** (§ 19 odst. 2 ZOS) – samostatná konfigurace `potvrzeni_reklamace`. Do `potvrzeni_zakaznikovi.formulare` z úkolu 02 reklamace **nepřidávej**.
    - **Odejde jen při splnění všech podmínek:**
      - `POTVRZENI_ZAKAZNIKOVI=1`,
      - `potvrzeni_reklamace.schvaleno === true`,
      - text neobsahuje `[DOPLNIT`,
      - e-mail zákazníka je platný,
      - nejsou překročené limity z úkolu 02 (3 potvrzení na adresu za 24 h, 30 za den, otisk adresy v Blobs).
    - **Text** musí ze zákona obsahovat obsah reklamace. Je to **vědomá výjimka** z pravidla úkolu 02 „nic, co zákazník napsal“. Zmírnění:
      - jen ověřená podání,
      - limity,
      - čistý text,
      - `Popis vady` nejvýš 2 000 znaků, bez řídicích znaků a s odkazy (`https?://…`, `www.…`) nahrazenými „[odkaz odstraněn]“,
      - ostatní pole nejvýš 120 znaků,
      - `Požadované řešení` jen z `firma.reklamace.reseni`, jinak „Jiné / poraďte mi“.
    - **Hlavičky:** `from` je „HOLUB – HSPG“ `<SMTP_UZIVATEL>`, `replyTo` je `firma.emaily.reklamace`.
19. **Jednotkové testy** (`tests/oznameni.test.mjs` z úkolu 02, rozšiř ho):
    - **Číslo:** z pole, neplatné → záložní.
    - **`lhutaVyrizeni`:**
      - `2026-10-04T21:30:00Z` → přijato 4. 10. 2026, lhůta 3. 11. 2026,
      - `2026-10-04T22:30:00Z` → 5. 10. 2026 a 4. 11. 2026.
    - **E-mail a push:** předmět a první řádek e-mailu obsahují lhůtu; push nemá jméno, telefon, e-mail ani adresu.
    - **Adresáti:** `to = reklamace@hspg.cz`, `cc` = záloha.
    - **Kdy potvrzení neodejde:** při `schvaleno:false`, při `[DOPLNIT`, bez proměnné, s neplatným e-mailem ani po limitu.
    - **Obsah potvrzení:** obsahuje číslo, datum přijetí, popis a řešení; odkaz v popisu je nahrazený; neznámé řešení → „Jiné / poraďte mi“.
    - **Selhání kanálů** → 200.
20. **Text `potvrzeni_reklamace`** (do `firma.json` už v A1, schvaluje majitel):
    ```json
    "potvrzeni_reklamace": {
      "schvaleno": false,
      "predmet": "Potvrzení o uplatnění reklamace {{cislo}} – HOLUB – HSPG",
      "text": "Dobrý den,\n\npotvrzujeme, že jsme {{datum_prijeti}} přijali vaši reklamaci č. {{cislo}}.\n\nObsah reklamace: {{popis}}\nPožadovaný způsob vyřízení: {{reseni}}\nAdresa objektu: {{adresa}}\nVaše kontaktní údaje: {{jmeno}}, {{telefon}}, {{email}}\n\nReklamaci včetně odstranění vady vyřídíme a o vyřízení vás budeme informovat nejpozději do 30 dnů ode dne uplatnění, tj. do {{datum_lhuty}}, pokud se spolu nedohodneme na delší lhůtě.\n[DOPLNIT: další krok potvrzený majitelem, např. „Ozveme se vám kvůli prohlídce.“ – bez lhůty, kterou majitel nepotvrdil]\n\n{{provozovatel}}, IČO {{ico}}, {{sidlo}}\n{{telefon_zobrazeni}} · {{web}}/reklamace/\n\nTento e-mail byl odeslán automaticky na základě formuláře na hspg.cz."
    }
    ```
21. **Koncový test na náhledu** – jen se souhlasem majitele, **jedno** odeslání, majitelův e-mail a telefon:
    - jméno „TEST Reklamace – neodpovídat“, popis „TEST – zkouška formuláře, neřešit“, 1 malá fotka,
    - zapiš: čas → push (s) → e-mail (s), předměty oznámení Netlify i SMTP, Reply-To, lhůtu v textu, složku „Reklamace“, záznam v Netlify Forms (ověřené, fotka dostupná), log funkce (`ok`),
    - potvrzení zákazníkovi jen tehdy, pokud majitel text schválil a `schvaleno` je `true`,
    - poté požádej majitele o smazání podání (nebo ho s jeho souhlasem smaž sám).
22. **Hlášení fáze A2** a zastav se.

### Fáze B – obchodní podmínky a reklamační řád (po dodání textu od právníka)
23. Pracuj na nové větvi `ukol-04b-podminky` z aktuální `main`. Vstupem je text od majitele nebo právníka a **písemné schválení** („schválil kdo, kdy“). Bez schválení nic nepublikuj.
24. **Stránka `/obchodni-podminky/`** (adresa podle úkolu 06) z vyplněné šablony z kroku 12:
    - „Platné od“ a verze,
    - čísla generuj nebo testem porovnej s `content/ceny.json` a `content/sentinel.json`,
    - vzorový formulář pro odstoupení jako tisknutelná sekce,
    - ADR z `firma.reklamace.adr`.
25. **Provázání:**
    - odkaz v patičce všech stránek (pokud je sloučený úkol 08: přepni `zobrazit: true` v jeho datech; jinak jako v kroku 10),
    - odkaz z `/reklamace/` a z ceníku u tarifů SENTINEL,
    - informativní odkaz u poptávkových formulářů (bez povinného zaškrtnutí),
    - položka FAQ v H-BOT.
    - Pokud právník upraví reklamační postup, srovnej s ním `/reklamace/` i `potvrzeni_reklamace`.
26. **Šablona e-mailové nabídky** (mimo web, postup majitele). Připrav do hlášení text pro majitele: odkaz na podmínky, poučení o odstoupení a formulář, a žádost o zahájení prací ve lhůtě pro odstoupení (§ 1824a odst. 3, § 1828 odst. 5 OZ).
27. Testy (žádné `[DOPLNIT`, všechny sekce, čísla podle dat, odkazy, nezlomitelné mezery), náhled, hlášení. Produkce jen po schválení majitelem a v dávce.

## Akceptační kritéria
**Fáze A1:**
- [ ] `node --test tests/reklamace.test.mjs` prošel; hlášení uvádí počty a čísla patiček (stránek s `<footer>` = stránek s odkazem na `/reklamace/`).
- [ ] `node --test --test-concurrency=1 tests/e2e/reklamace.e2e.test.mjs` prošel, test ověřil 0 požadavků mimo 127.0.0.1 a axe-core hlásí 0 porušení.
- [ ] `node scripts/build-kontakty.mjs --kontrola` a `node scripts/build-hbot.mjs --kontrola` → kód 0. Testy úkolů 02 a 03 a testy balíčku proti webu prošly.
- [ ] Okresní stránky se změnily jen v patičce: `git diff main -U0 -- 'cisteni-*/*/index.html' | grep -E '^[+-][^+-]' | grep -vc 'reklamace'` → 0.
- [ ] Na náhledu:
  - `/reklamace/` → 200 bez `noindex`,
  - `/reklamace` a `/reklamace.html` → 301 s `location` na `/reklamace/` (bez řetězení),
  - `/reklamace/dekujeme/` → 200 s `noindex`,
  - sitemap obsahuje `/reklamace/` 1× a `dekujeme` 0×,
  - šablona podmínek → 404.
- [ ] Netlify Forms obsahuje formulář `hspg-reklamace`. Výpis jen názvů je v hlášení.
- [ ] Lighthouse mobil `/reklamace/`: přístupnost 100, SEO 100 (bez auditu `is-crawlable` na náhledu), výkon ≥ 90 (čísla v hlášení).
- [ ] `grep -rIl "\[DOPLNIT" "$PUB" --include=*.html` → nic. `git grep -nE "(SMTP_HESLO|NTFY_TEMA|TELEGRAM_BOT_TOKEN)\s*=\s*\S"` → nic.
- [ ] Hlášení obsahuje ověřenou verzi předpisů z e-Sbírky, návod pro majitele a otázky pro majitele.

**Fáze A2:**
- [ ] `node --test tests/oznameni.test.mjs` prošel, včetně testů z kroku 19.
- [ ] Koncový test: push do 60 s, e-mail do 2 min s „vyřídit do“, Reply-To = testovací e-mail, záznam v Netlify Forms mezi ověřenými s fotkou, push bez osobních údajů. Tabulka časů je v hlášení.
- [ ] Potvrzení zákazníkovi odešlo jen při `schvaleno: true` (jinak hlášení potvrdí, že neodešlo). `TEST` podání je smazané.

**Fáze B:**
- [ ] Písemné schválení je citované v hlášení i ve zprávě commitu. Stránka podmínek neobsahuje `[DOPLNIT` a obsahuje všech 16 sekcí, vzorový formulář pro odstoupení a ADR (test).
- [ ] Čísla v podmínkách odpovídají `content/ceny.json` a `content/sentinel.json` (test). Odkaz na podmínky je v patičce 100 % stránek s `<footer>`.

## Ověření
```bash
PUB=<publikační adresář z netlify.toml>
node scripts/build-regions.mjs && node scripts/build-kontakty.mjs && node scripts/build-hbot.mjs
node scripts/build-kontakty.mjs --kontrola && node scripts/build-hbot.mjs --kontrola     # → kód 0
node --test tests/reklamace.test.mjs                                                     # → pass N, fail 0
CHROMIUM=<cesta> node --test --test-concurrency=1 tests/e2e/reklamace.e2e.test.mjs       # → pass, fail 0
grep -rIl "\[DOPLNIT" "$PUB" --include=*.html                                            # → nic
grep -rIlE "15 let|pojišt|consumers/odr" "$PUB/reklamace"                                # → nic
git diff main -U0 -- 'cisteni-*/*/index.html' | grep -E '^[+-][^+-]' | grep -vc 'reklamace'   # → 0
cd ../hspg-balicek && npm test && HSPG_MIRROR=$(pwd)/../webHSPGH CHROMIUM=<cesta> npm run test:e2e   # → H-BOT dál prochází

N=<adresa náhledu z npm run nahled>
curl -sI "$N/reklamace/" | head -1                                  # → 200
curl -sI "$N/reklamace" | grep -iE '^(HTTP|location)'               # → 301, location …/reklamace/
curl -sI "$N/reklamace.html" | grep -iE '^(HTTP|location)'          # → 301, location …/reklamace/
curl -s "$N/reklamace/dekujeme/" | grep -c 'name="robots" content="noindex"'   # → 1
curl -s "$N/sitemap.xml" | grep -c '/reklamace/</loc>'              # → 1
curl -s -o /dev/null -w '%{http_code}\n' "$N/<cesta šablony podmínek>"        # → 404
curl -sIL https://coi.gov.cz/informace-o-adr/ | grep -c ' 200'      # → ≥ 1
```
Testy, které agent přidá:
- `tests/reklamace.test.mjs` (statický průchod, data, patičky, nezlomitelné mezery),
- `tests/e2e/reklamace.e2e.test.mjs` (Playwright a axe-core, s JS i bez JS, fotky, chyby, úložiště, H-BOT),
- v A2 rozšíření `tests/oznameni.test.mjs`,
- v B `tests/podminky.test.mjs`.

## Bez AI / s AI
Formulář, potvrzení, děkovací stránka, oznámení i H-BOT odpověď na „Jak reklamovat?“ fungují **bez AI**: odpověď jde z FAQ, i při `AI_ZAPNUTO=0`. AI reklamace nepřijímá ani nevyřizuje. Pokud zákazník popíše vadu v chatu, odpověď ho pošle na `/reklamace/` (FAQ je i ve znalostech AI po `build-hbot.mjs`). Kontakty se do AI nepředávají (maskování z úkolu 01).

## Nepřekročitelná pravidla
Viz `balicek/KONTEXT.md` §4. Pro tento úkol navíc:
- **Pravdivost:**
  - na webu jen ověřené údaje (`firma.json`, KONTEXT) a ověřené citace předpisů,
  - žádné pojištění, hodnocení, „garance“, nepotvrzené lhůty prohlídky nebo odpovědi, rozsah záruky ani výklad práva nad rámec § 13, 14 a 19 ZOS (to je fáze B a právník),
  - na publikovaných stránkách nesmí zůstat `[DOPLNIT` – nepotvrzenou větu vynech a nahlas,
  - text záruky jen doslova z centrálních dat.
- **Podmínky:** obchodní podmínky a reklamační řád **nepublikovat** bez písemného schválení majitele. Šablona nesmí být na webu (ověřeno 404).
- **Formuláře:**
  - žádné testovací odeslání na produkci,
  - na náhledu jen v A2, jednou, se souhlasem majitele a s označením `TEST`, potom smazat,
  - testy posílají POST jen lokálně přes `page.route`.
- **Osobní údaje:**
  - nic v úložišti prohlížeče ani v URL,
  - `textContent` místo `innerHTML`,
  - potvrzení i formulář maskované pro Clarity,
  - žádné události měření s údaji.
- **Bezpečnost:** reklamační formulář **nevolá** `/api/sentinel/validate` a nepřidává žádné nové veřejné místo, které ověřuje kód pasu domu (úkol 14).
- **Tajemství a nastavení:**
  - žádná hesla ani tokeny v kódu, hlášení ani logu,
  - `SMTP_HESLO` a další hodnoty zadává majitel jen v Netlify,
  - žádné nové API klíče ani služby (Gemini, xAI, OpenWeatherMap nezakládat),
  - MX ani DNS neměnit, nové schránky nezakládat.
- **Nasazení:** jen přes `node scripts/nasadit.mjs`. Náhled je zdarma, produkce jen po schválení majitelem a v dávce s dalšími úkoly.

## Hlášení po dokončení
Formát z `KONTEXT.md` §5 po každé fázi a navíc:
- **Fáze A1:**
  - seznam změněných a nových souborů,
  - výsledky testů (počty),
  - čísla patiček (s `<footer>` a s odkazem),
  - ověřená verze předpisů (e-Sbírka, datum),
  - odkaz na náhled a výsledky `curl`,
  - názvy formulářů v Netlify Forms,
  - Lighthouse,
  - kde je šablona podmínek a důkaz 404,
  - co bylo v rozpracované `/reklamace.html` a co z ní zůstalo,
  - odchylka „vzetí na vědomí“ místo souhlasu a její zdůvodnění,
  - návod pro majitele (krok 15),
  - otázky pro majitele,
  - diff souborů převzatých z balíčku (`firma.json`, `hbot-faq.json`), aby se promítly zpět do balíčku.
- **Fáze A2:**
  - tabulka koncového testu,
  - stav `potvrzeni_reklamace.schvaleno`,
  - zjištěný tvar payloadu (pole souborů, `created_at`),
  - potvrzení smazání `TEST`,
  - diff `submission-created.mjs` pro balíček.
- **Fáze B:** citace schválení, odkaz na náhled, text pro šablonu e-mailové nabídky.
- **Návrhy mimo rozsah:**
  - sjednotit zmenšování fotek (`/akce/`, `fotky-upload.js`) na sdílený skript bez adres `blob:` (CSP, úkoly 07 a 15),
  - sdílená validace formulářů (audit-formulare #16),
  - integrace pro soubory s osobními údaji podle doporučení Netlify (úkoly 09 a 15),
  - anglická informace o reklamaci (úkol 13),
  - evidence reklamací v interním panelu (úkol 14),
  - sekce „Reklamace“ v zásadách (úkol 09).
