# Úkol 03: Firemní e-maily @hspg.cz na webu
> Priorita P1 · Závisí na: 00 · Čeká na majitele: – (jen schválení produkčního nasazení) · Rozsah: všechny e-mailové adresy na webu → @hspg.cz z jednoho zdroje, patička s 5 schránkami, odstranění záložního odesílání přes FormSubmit. Dvě fáze (A, B), po fázi A hlášení.

## Proč (s důkazy)
Schránky `info@`, `poptavky@`, `reklamace@`, `spoluprace@` a `podpora@hspg.cz` běží na Seznam Email Profi a fungují (DKIM, SPF i DMARC pass; KONTEXT §2). Všech pět vede do **jedné** schránky. Web je ale nepoužívá: veřejně ukazuje jen `profiserv@seznam.cz`, a to v řadě různých podob.

Inventura z kopie živého webu a GET dotazů na hspg.cz (4. 10. 2026). Čísla řádků platí pro živý web, ve zdroji se mohou lišit:

| Kde | Co tam je | Důkaz |
|---|---|---|
| 247 HTML stránek | 258× `a[data-mail="zc.manzes@vresiforp"]` (obráceně `profiserv@seznam.cz`, rozbaluje `/assets/kontakt.js`): 247 v patičkách (na každé stránce právě 1) a 11 v textu | `grep -rhoE 'data-mail="[^"]*"'` → 258× stejná hodnota |
| 232 generovaných stránek (`<html data-gen="build-regions">`, okresní stránky a rozcestník dlažeb) | patička „Napsat týmu“ s `data-reveal="off"` | generuje `scripts/build-regions.mjs` |
| JSON-LD `/` (ř. 45) a `/en.html` (ř. 35) | `"email":"profiserv@seznam.cz"` | audit-formulare #1 |
| `/` inline skript ř. 1921 | `const EMAIL = ['profiserv','seznam.cz'].join('@')` → ruční `mailto:`, když selže průvodce poptávkou (ř. 1937, 2257) | audit-formulare #1, #6 |
| `/akce/` ř. 174, `/recenze/` ř. 233 | `FORMSUBMIT='https://formsubmit.co/'+['profiserv','seznam.cz'].join('@')` jako záložní odeslání | audit-formulare #5 |
| `/assets/holub-let.js` ř. 16 | `var EMAIL = ['profiserv','seznam.cz']…`, nikde se nepoužívá | grep `EMAIL` → 1 výskyt |
| `/assets/svj-podklad.js` ř. 27 a 106 | adresa ve **viditelném** textu tiskového podkladu pro SVJ (`/kalkulacka-svj.html`) | nový nález, audit ho nezachytil |
| `/assets/nabidka-pdf.js` ř. 172 a 182 | adresa v **PDF nabídce** na `/akce/dekujeme/` | nový nález, jen na živém webu |
| stránka 404 | patička s `data-mail` | GET na neexistující URL |
| hlavička CSP (zatím Report-Only) | `form-action 'self' https://formsubmit.co` | `curl -sI https://hspg.cz/` |

Další problémy:
- **Patičky** mají po jednom odkazu „Napsat e-mail“ nebo „Napsat týmu“. Návštěvník nevidí, kam psát s poptávkou, reklamací nebo nabídkou spolupráce (audit-formulare #4). Patičky existují v 5 variantách (`footer.foot` 234×, `footer.site-foot` 9×, `footer.sheet-foot` 1×, 2× holý `<footer>`, 1× s inline stylem). Na `/akce/` je odkaz „Nastavení cookies“ až za `</p>`, tedy mimo odstavec (ř. 316).
- **FormSubmit ztrácí data.** Při selhání Netlify posílá `/akce/` zálohu bez fotek (soubory mají 2 B). Zákazník pak skončí na cizí anglické stránce s reCAPTCHA, a když vypadne síť, na `chrome-error://`. Chybová hláška se v tu chvíli vůbec nezobrazí (audit-formulare #5). Zálohu navíc nevidí Netlify Forms ani budoucí upozornění z úkolu 02.
- **Texty odkazů** se čtou nesmyslně: „Napište na Napsat e-mail“ (`/akce/` ř. 161, `/ochrana-osobnich-udaju.html` ř. 97), „napiš na Napsat e-mail“ (`/kariera.html` ř. 180), „Uplatníte je na Napsat e-mail“ (`/pravidla-akce/` ř. 74).
- Všechny `a[data-mail]` mají `href="#"`, takže bez JavaScriptu nikam nevedou (audit-formulare #9).

**Rozhodnutí o zásadách:** v textu zásad (`/ochrana-osobnich-udaju.html`) ani pravidel akce není `profiserv@seznam.cz` vypsaný. Je jen za odkazy `data-mail` (čl. 1 kontakt správce, čl. 6 práva). Výjimka tedy není potřeba. Kontakt správce bude `info@hspg.cz` a test zakáže `profiserv` v celém publikovaném výstupu. `profiserv@seznam.cz` zůstává jen jako serverová záložní kopie oznámení v `content/firma.json` (`emaily.zaloha`, úkol 02), na web se nikdy nedostane.

## Cíl (měřitelný)
1. Publikovaný web obsahuje 0× `profiserv`, 0× `vresiforp` (obrácená podoba) a 0× `formsubmit.co`, a to v HTML, JS i v hlavičkách.
2. Každá e-mailová adresa na webu pochází z `content/firma.json` (`emaily`). Změna adresy = změna jednoho souboru a spuštění `node scripts/build-kontakty.mjs`. Kontrola `--kontrola` odhalí neaktuální výstup.
3. Patička každé stránky (247 + 404) má blok **5 schránek s popiskem účelu** (cs, na `/en.html` en). Adresy jsou vidět bez kliknutí, ochrana proti sběračům (`data-mail`) zůstává a bez JS je adresa čitelná.
4. `/akce/` a `/recenze/` při selhání odeslání zůstanou na stránce. Zobrazí trvalou hlášku (`role="alert"`) s telefonem a e-mailem, zachovají vyplněné údaje i fotky a dovolí odeslat znovu.

## Rozsah
**ANO:** `content/firma.json` (`emaily` + popisky pro web), sdílená knihovna a build skript kontaktů, všech 258 odkazů `data-mail`, šablona patičky v `scripts/build-regions.mjs`, JS konstanty (`/` inline, `svj-podklad.js`, `nabidka-pdf.js`, `holub-let.js`), hodnota `email` v JSON-LD na `/` a `/en.html`, odstranění FormSubmitu z `/akce/` a `/recenze/` včetně chybového stavu, odebrání `https://formsubmit.co` z CSP `form-action`, úprava `/assets/kontakt.js`, texty e-mailových odkazů, oprava odkazu „Nastavení cookies“ v patičce `/akce/`, testy.

**NE (patří jinam):**
- Netlify Forms: e-mailová oznámení, skryté pole `subject`, Reply-To, druhý kanál, SMTP, směrování na schránky → **úkol 02**.
- Stránka `/reklamace`, formulář `hspg-reklamace` a odkaz na něj v patičce → **úkol 04**. Blok kontaktů obsahuje jen adresu `reklamace@`.
- Jednotná hlavička a patička, identifikace podle § 435 OZ, barvy a typografie → **úkol 08**. Blok kontaktů se vloží do stávajících patiček a úkol 08 ho převezme beze změny.
- Text zásad a pravidel akce, včetně zmínek o FormSubmit (`/ochrana-osobnich-udaju.html` ř. 96 a 98, `/pravidla-akce/` ř. 73) → **úkol 09** (pravidla akce také 13). V těchto souborech měníš **jen** e-mailové odkazy.
- Ostatní JSON-LD (legalName, `@id`, geo, sameAs, ContactPoint) a stránka `/kontakt` → **úkol 11**.
- CSP nad rámec odebrání `formsubmit.co`, DMARC → **úkol 15**. DNS a MX **neměnit**.
- Jednotné selhání ostatních formulářů (průvodce na `/`, H-BOT, `hspg-fotky`; audit-formulare #6) a chování formulářů bez JS (#9 kromě odkazů `data-mail`) → jen návrh do hlášení. Na `/` měníš jen adresu.
- Validace polí na `/akce/` a `/recenze/` → **úkol 17** (v pořadí běží před tímto úkolem). Navazuj na jeho kód a validaci neměň, měníš jen cestu při selhání odeslání.
- Stránka `/offline/` z úkolu 17 (bez skriptů): e-mail na ni nedávej, testy fáze B ji vynechají.
- Zakládání nových schránek (např. `kariera@`, `gdpr@`): **nezakládat**. Kariéra a ochrana údajů jdou na `info@`.

## Postup

### Fáze A – žádný `profiserv` na webu (adresy @hspg.cz z jednoho zdroje, konec FormSubmitu)
1. Větev `ukol-03-firemni-emaily` z aktuální `main` (pravidla v `CLAUDE.md` z úkolu 00).
2. Najdi v repozitáři soubory, které generují HTML a JS s e-mailem:
   - publikační adresář (`netlify.toml` → `[build] publish`) a build příkaz (`[build] command` / `package.json`),
   - `scripts/build-regions.mjs` (šablona patičky 232 stránek) a další `scripts/build-*.mjs` (konvence značek `<!-- XXX:START -->`),
   - zdroj stránky 404, místo s CSP (`netlify.toml [[headers]]` nebo `_headers`) a existující testy.

   Pokud `publish` chybí nebo je `.` (kořen repozitáře; stejnou výchozí hodnotu používá `scripts/nasadit.mjs`), spouštěj všechny `grep` nad `$PUB` s vyloučením nepublikovaných složek (proměnná `X` v části Ověření). Na náhledu pak ověř, že `content/firma.json` není dostupný (krok 17). Kdyby dostupný byl, dostala by se `emaily.zaloha` na web. To je blokující nález: zastav se a nahlas ho.

   Pak `git grep -nIiE "profiserv|vresiforp|formsubmit|seznam\.cz"` (mimo `node_modules`). Výsledek (soubor, řádek, typ výskytu) ulož do hlášení a porovnej s tabulkou v části Proč. Co v tabulce chybí, doplň do inventury. Výskyty v interních `rd-control-panel/` a `ai-centrum/` (skript z kroku 4 je nezpracovává) uprav ručně na `info@hspg.cz` v rozdělené podobě. Kritérium „0× `profiserv`“ platí pro celý `$PUB`.
3. `content/firma.json`: pokud ve webHSPGH ještě není (úkol 01 neproběhl), zkopíruj ho z balíčku (`../hspg-balicek/balicek/web/content/firma.json`). Balíček stáhni mimo webHSPGH stejně jako v úkolu 01: `git clone --depth 1 -b claude/peaceful-johnson-juqa6w https://github.com/mhorvathova820-max/HSPG-WEB ../hspg-balicek`, nebo když už tam je, `git -C ../hspg-balicek pull`. Ostatní klíče neměň. Uprav `emaily._poznamka` na pravdivý stav: „Schránky existují a jsou ověřené (4. 10. 2026). `zaloha` = serverová kopie oznámení (úkol 02), na webu se nikdy nezobrazuje.“ Přidej klíč:
   ```json
   "emaily_na_webu": {
     "_poznamka": "Co a v jakém pořadí ukazuje web. Adresy se berou z 'emaily'. Generuje scripts/build-kontakty.mjs.",
     "poradi": ["poptavky", "reklamace", "podpora", "spoluprace", "info"],
     "popisky": {
       "poptavky":   { "cs": "Poptávka a cenová nabídka", "en": "Quotes and enquiries", "predmet_cs": "Poptávka z hspg.cz", "predmet_en": "Enquiry from hspg.cz" },
       "reklamace":  { "cs": "Reklamace", "en": "Complaints", "predmet_cs": "Reklamace", "predmet_en": "Complaint" },
       "podpora":    { "cs": "Péče po zakázce a pas domu", "en": "Aftercare and digital house passport", "predmet_cs": "Péče po zakázce", "predmet_en": "Aftercare" },
       "spoluprace": { "cs": "Spolupráce a dodavatelé", "en": "Partners and suppliers", "predmet_cs": "Spolupráce", "predmet_en": "Partnership" },
       "info":       { "cs": "Ostatní dotazy, kariéra, ochrana osobních údajů", "en": "General questions, careers, privacy", "predmet_cs": "Dotaz z hspg.cz", "predmet_en": "Question from hspg.cz" }
     }
   }
   ```
   Do popisků nepiš „oddělení“ ani nic, co naznačuje větší organizaci (všechny adresy vedou do jedné schránky). Nepiš ani název tarifu SENTINEL, dokud úkol 13 nepotvrdí jeho stav. Pokud je převzatý asistent (úkol 01), spusť `node scripts/build-hbot.mjs --kontrola` (musí projít).
4. `scripts/lib/kontakty.mjs` (bez závislostí):
   - `adresa(role)` vrátí adresu pro roli z `poradi`. Pro `zaloha` nebo neznámou roli **vyhodí chybu**.
   - `obracene(adresa)`, `predmet(role, jazyk)` (vrací `encodeURIComponent`, jak to čeká `kontakt.js`), `zalozniText(role, jazyk)` vrací `poptavky (zavináč) hspg.cz` / `poptavky (at) hspg.cz`.
   - `nbsp(text)` dá nezlomitelnou mezeru za jednopísmenné předložky a spojky (KONTEXT §4 bod 9).
   - `blokKontaktu(jazyk)` přidáš až ve fázi B.

   `scripts/build-kontakty.mjs` projde HTML v publikačním adresáři (kromě interních `rd-control-panel/` a `ai-centrum/`) a JS v `assets/` a provede:
   - u každého `<a … data-kontakt="ROLE" …>` nastaví `data-mail` na obrácenou adresu role. Chybí-li `data-subject`, doplní výchozí předmět podle jazyka stránky (`<html lang>`),
   - v JS (soubory v `assets/` i inline skripty v HTML) přepíše výraz za značkou `/*KONTAKT:ROLE*/` na `['mistni-cast','hspg.cz'].join('@')` (rozdělená podoba kvůli sběračům zůstává). Za značkou smí stát jen výraz tvaru `['…','…'].join('@')`. Skript hledá regexem `/\/\*KONTAKT:([a-z]+)\*\/\s*\[\s*'[^']*'\s*,\s*'[^']*'\s*\]\.join\('@'\)/g`, nahradí jen pole a značku ponechá. Neznámá role nebo značka bez platného výrazu = chyba a kód 1,
   - `--kontrola`: nic nezapíše, vypíše soubory, které by se změnily, a skončí kódem 1, pokud nějaké jsou.

   Měň jen dotčené atributy a výrazy. Žádné přeformátování celého souboru. Napoj skript do build příkazu **za** `build-regions` (vedle `build-ceny`/`build-hbot`). Pokud se HTML commituje vygenerované (značky „Neupravovat ručně“ tomu nasvědčují), spusť ho a commitni výstup.
5. Ke všem 258 odkazům přidej `data-kontakt` podle tabulky. Hodnotu `data-mail` doplní skript. Ve fázi A neměň texty ani `data-reveal`.

   | Kde | `data-kontakt` | `data-subject` (dekódovaně) |
   |---|---|---|
   | patičky všech stránek kromě `/nabidka-svj.html` (246×) a 404, u generovaných stránek **v šabloně** `build-regions.mjs` | `info` (ve fázi B je nahradí blok) | výchozí |
   | `/` hero „NAPSAT TÝMU“ (ř. 1208) | `poptavky` | Poptávka z hspg.cz |
   | `/en.html` hero „E-mail us“ (ř. 148) | `info` | Question from hspg.cz |
   | `/akce/` „Nefunguje formulář?“ (ř. 161) | `poptavky` | ponechat stávající |
   | `/kariera.html` ř. 180 | `info` | ponechat „Kariéra HOLUB“ |
   | `/spoluprace.html` tlačítko „Napsat nám“ (ř. 95) | `spoluprace` | ponechat stávající |
   | `/reference.html` ř. 167 | `info` | ponechat stávající |
   | `/recenze/` ř. 213 (stažení hodnocení) | `info` | ponechat stávající |
   | `/ochrana-osobnich-udaju.html` ř. 92 a 97 | `info` | Ochrana osobních údajů |
   | `/pravidla-akce/` ř. 69 a 74 | `info` | Ochrana osobních údajů – akce |
   | `/nabidka-svj.html` patička (`sheet-foot`) | `poptavky` | ponechat „Nabídka pro SVJ“ |
6. JS konstanty:
   - `/` inline `EMAIL` → `/*KONTAKT:poptavky*/…` (ruční e-mail při selhání průvodce),
   - `assets/svj-podklad.js` → `/*KONTAKT:poptavky*/…`,
   - `assets/nabidka-pdf.js` (oba výskyty) → `/*KONTAKT:poptavky*/…`,
   - v `assets/holub-let.js` nepoužitou konstantu `EMAIL` **smaž** (před smazáním ověř `grep -n EMAIL`, že se nikde nepoužívá).

   Spusť `node scripts/build-kontakty.mjs`.
7. JSON-LD na `/` a `/en.html`: změň jen hodnotu `email` na `info@hspg.cz` (= `firma.email`). Strukturu neměň (úkol 11). Adresa `info@` bude v JSON-LD čitelná. Je to vědomý kompromis: jde o obecnou adresu a strukturovaná data ji potřebují ve skutečné podobě.
8. FormSubmit pryč (`/akce/`, `/recenze/`):
   - odstraň `FORMSUBMIT`, `pressFormSubmit()`, proměnnou `odeslano` (slouží jen záloze) a zmínky o FormSubmit v komentářích. Parametr URL `?odeslano=1` na `/recenze/` zůstává, ukazuje poděkování po odeslání bez JS. Nativní odeslání bez JS (`action='/akce/dekujeme/'`, `'/recenze/?odeslano=1'`) nech beze změny,
   - při `!r.ok` i při síťové chybě zůstaň na stránce:
     - zobraz **trvalou** hlášku s `role="alert"` uvnitř formuláře. Hláška je **statická** část HTML skrytá atributem `hidden` a skript ji při chybě jen odkryje,
     - na `/recenze/` použij stávající `#chyba`. Funkce `chyba(text)` ale zapisuje přes `textContent` a odkazy by smazala. Proto do `#chyba` vlož vnitřní `<span>` pro text (zapisuje do něj `chyba()`, i u validačních hlášek) a vedle něj skrytou kontaktní část, kterou odkryje jen chyba odeslání,
     - text `/akce/`: „Odeslání se nepodařilo. Vaše údaje i fotky zůstaly ve formuláři – zkuste to prosím znovu, nebo zavolejte na +420 736 618 486 (Po–So 7:00–19:00), případně napište na poptavky@hspg.cz.“
     - text `/recenze/`: „Odeslání se nepodařilo. Vaše hodnocení zůstalo ve formuláři – zkuste to prosím znovu, nebo zavolejte na +420 736 618 486 (Po–So 7:00–19:00), případně napište na info@hspg.cz – hodnocení zapíšeme za vás.“ Slib „hodnocení zapíšeme za vás“ stránka obsahuje už dnes (stávající chybová hláška), nový není,
     - v obou textech nezlomitelné mezery podle KONTEXT §4 bod 9 (např. „i&nbsp;fotky“),
     - telefon jako `<a href="tel:+420736618486">`. E-mail jako statický odkaz `<a href="#kontakty" data-kontakt="poptavky">poptavky (zavináč) hspg.cz</a>` (na `/recenze/` role `info`). `data-mail` mu doplní `build-kontakty.mjs` jako ostatním. Při chybě skript nastaví text odkazu na obrácený `data-mail`, adresa tedy v kódu není natvrdo,
     - **bez** těla zprávy s údaji v `mailto:`: osobní údaje v URL by mohly skončit v měření kliků,
   - po chybě odemkni tlačítko s původním textem a nemaž pole ani vybrané fotky (proměnná `fotky`). Další kliknutí odešle znovu stejná data včetně fotek,
   - CSP: `form-action 'self' https://formsubmit.co` → `form-action 'self'`. Nic jiného v CSP neměň (úkol 15).
9. Testy fáze A (viz Ověření): `tests/kontakty.test.mjs` (Node test runner) a `tests/e2e/formulare-chyba.e2e.test.mjs` (Playwright, lokální server, POST zachycený přes `page.route`, nic neodchází ven). Pokud web už má testovací strukturu, drž se jí. `playwright` přidej do `devDependencies` jen tehdy, když chybí. Prohlížeč se předává přes `CHROMIUM`.
10. **Hlášení fáze A** (KONTEXT §5) a commit. Pokračuj fází B ve stejné větvi.

> Pokud fázi B v tomto sezení nestihneš, skonči hlášením fáze A a pushem větve. Fáze A je sama o sobě ucelená: všechny adresy jsou @hspg.cz a FormSubmit je pryč. Po ověření ji proto smíš sloučit do `main` i samostatně. Fázi B pak začni `git pull` a příkazem `node scripts/build-kontakty.mjs --kontrola` (musí vrátit kód 0).

### Fáze B – patička s 5 schránkami a srozumitelné odkazy
11. `assets/kontakt.js` (zachovej ochranu, tedy adresu obráceně v `data-mail`, a delegovaný klik):
    - nová hodnota `data-reveal="load"`: po načtení (skript má `defer`) nastaví `href` na `mailto:…?subject=…` a text odkazu na adresu,
    - stávající chování (odhalení prvním klikem, `data-reveal="off"` pro tlačítka) beze změny,
    - uprav úvodní komentář souboru.
12. `blokKontaktu(jazyk)` v knihovně. Struktura (cs; en se liší popisky, nadpisem „Write to us“ a „(at)“):
    ```html
    <!-- KONTAKTY:START -->
    <div class="kontakty" id="kontakty">
      <p class="kontakty-nadpis">Napište nám</p>
      <ul class="kontakty-seznam">
        <li><span class="kontakty-ucel">Poptávka a&nbsp;cenová nabídka</span>
          <a href="#kontakty" data-kontakt="poptavky" data-mail="zc.gpsh@ykvatpop" data-subject="Popt%C3%A1vka%20z%20hspg.cz" data-reveal="load">poptavky (zavináč) hspg.cz</a></li>
        <!-- … reklamace, podpora, spoluprace, info v pořadí 'poradi' … -->
      </ul>
    </div>
    <!-- KONTAKTY:END -->
    ```
    Do značek nepiš cesty ani interní poznámky (audit-seo #18). `build-kontakty.mjs` přepíše obsah mezi značkami podle `<html lang>` a `--kontrola` hlídá i bloky.
13. Vlož značky `KONTAKTY` do patičky:
    - 15 ručně psaných stránek a stránka 404: blok **nahradí** stávající jediný odkaz `data-mail` v patičce, telefon a ostatní odkazy zůstanou,
    - šablona patičky v `build-regions.mjs`: importuj `blokKontaktu` (stejný výstup jako skript) a přegeneruj 232 stránek,
    - na `/akce/` přesuň „Nastavení cookies“ dovnitř `<p class="fbot">`.

    Ostatní obsah patiček nesjednocuj (úkol 08).
14. Odkazy v textu (fáze A, krok 5):
    - **Uvnitř věty:** přidej `data-reveal="load"`, text bude záložní podoba adresy z `zalozniText()` (skript ho udržuje) a větu přeformuluj. Například: „Nefunguje formulář? Napište nám na `poptavky (zavináč) hspg.cz`.“, „Kontakt: `info (zavináč) hspg.cz`, tel. …“, „Uplatníte je na `info (zavináč) hspg.cz`.“
    - **Tlačítka a výzvy** („NAPSAT TÝMU“, „Napsat nám“, „E-mail us“) nech s popiskem a stávajícím `data-reveal`.
    - Všem `a[data-mail]` dej `href="#kontakty"` místo `#`, aby bez JS vedly na blok v patičce s čitelnými adresami.
15. Styl bloku: minimum pravidel (seznam v řádcích, zalomení na mobilu, odkazy min. 44 px na výšku jako `.site-foot-links a`, kontrast podle stávající patičky). Dej ho do sdíleného CSS jen tehdy, pokud ho načítají všechny stránky. `brand.css` ho dnes nenačítá na 8 stránkách (`/`, `cenik`, `kalkulacka-svj`, `kariera`, `ochrana-osobnich-udaju`, `pas-domu`, `nabidka-svj`, `en`). Jinak použij atributy `style` v generovaném bloku (CSP povoluje `'unsafe-inline'` pro styly). Sjednocení stylů je úkol 08.
16. Testy fáze B a Lighthouse před a po:
    - „před“ změř na commitu fáze A, ještě před krokem 11, „po“ na konci,
    - obojí proti stejnému lokálnímu statickému serveru nad `$PUB`, mobil, `/` a `/cenik.html`, 3 běhy a medián: `npx -y lighthouse http://127.0.0.1:<port>/ --only-categories=performance,accessibility,seo --form-factor=mobile --quiet --chrome-flags="--headless" --output=json --output-path=.artefakty/ukol-03/lh-<stránka>-<před|po>-<n>.json`.

    Snímky patičky (360 a 1280 px) z `/`, `/cenik.html`, `/en.html` a okresní stránky ulož do `.artefakty/ukol-03/` (`.artefakty/` patří do `.gitignore`, necommituje se) a přilož k hlášení.
17. Náhledové nasazení přes `node scripts/nasadit.mjs` (bez parametrů = náhled za 0 kreditů; přímé `netlify deploy` je zakázané, KONTEXT §4 bod 4) a ověření na náhledu (viz Ověření). Produkce jen po schválení majitelem, v dávce s dalšími úkoly (`--produkce --schvaleno "…"`, 15 kreditů za nasazení).

## Akceptační kritéria
Fáze A:
- [ ] `grep -rIlE "profiserv|vresiforp" "${X[@]}" "$PUB"` → nic a `grep -rIil "formsubmit\.co" "${X[@]}" "$PUB" netlify.toml _headers` → nic (`$PUB` = publikační adresář, `X` = vyloučené nepublikované složky, viz Ověření).
- [ ] `git grep -n profiserv -- ':!content/firma.json' ':!tests/' ':!*.md'` → nic. V `content/firma.json` je jen `emaily.zaloha`. V `tests/` se `profiserv` smí objevit jen jako očekávaná záložní kopie (testy úkolu 02) nebo jako zakázaný vzor (testy tohoto úkolu). Do hlášení vypiš i nefiltrovaný `git grep -n profiserv`.
- [ ] Každý `a[data-mail]` má `data-kontakt` z `poradi` a jeho `data-mail` po obrácení = `firma.emaily[role]`. Každý `data-subject` jde dekódovat přes `decodeURIComponent` a neobsahuje mezery (test).
- [ ] Rozdělené JS adresy (`['x','hspg.cz']`) v `assets/` i v inline skriptech HTML mají místní část jen z povolených rolí a nikde z toho není `'seznam.cz'` (test).
- [ ] JSON-LD na `/` a `/en.html` jde parsovat přes `JSON.parse` a `email === firma.email` (test).
- [ ] `node scripts/build-kontakty.mjs --kontrola` → kód 0. Po změně adresy v dočasné kopii `firma.json` → kód 1 (test).
- [ ] E2E `/akce/`:
  - zrušený POST nebo odpověď 500 → URL zůstane `/akce/`,
  - je vidět `[role=alert]` s `a[href="tel:+420736618486"]` a s odkazem `a[data-kontakt="poptavky"]`, jehož text je `poptavky@hspg.cz` a obrácený `data-mail` je stejná adresa,
  - tlačítko je aktivní a pole i fotky zůstaly,
  - druhý pokus (odpověď 200) pošle `Fotografie 1` s velikostí > 0 B,
  - žádný požadavek na `formsubmit.co`.
- [ ] E2E `/recenze/`: zrušený POST → `#chyba` je vidět s `a[href="tel:+420736618486"]` a odkazem s textem `info@hspg.cz`, tlačítko je aktivní, vyplněná pole zůstala, žádná navigace ani požadavek na `formsubmit.co`. Validační hláška (odeslání bez hvězdiček) kontaktní část neukazuje.

Fáze B:
- [ ] Každá stránka s `<footer>` (247 + 404; bez `/offline/` z úkolu 17) má v patičce právě jeden blok `KONTAKTY` s 5 odkazy na 5 různých adres v pořadí `poradi`. Každý odkaz má neprázdný popisek účelu a `/en.html` má anglické popisky (test).
- [ ] Počet `data-mail` ve výstupu = 5 × počet stránek s patičkou + odkazy v textu + 2 odkazy v chybových hláškách (`/akce/`, `/recenze/`, krok 8). Stav 4. 10.: (247 stránek + stránka 404) × 5 = 1 240, k tomu 11 + 2, celkem 1 253. Vypiš skutečná čísla a vysvětli každý rozdíl, např. stránky přidané úkoly 02 a 17.
- [ ] Žádný `a[data-mail]` nemá `href="#"`. V textovém obsahu stránek (po odstranění HTML značek) není „na Napsat e-mail“ (test).
- [ ] Popisky v bloku dodržují nezlomitelnou mezeru po jednopísmenných předložkách a spojkách (test regexem).
- [ ] E2E se zapnutým JS (`/`, `/cenik.html`, `/akce/`, `/en.html`, `/cisteni-strech/praha/`, 404; šířky 360 a 1280 px):
  - 5 odkazů v `#kontakty` ukazuje adresy `…@hspg.cz`,
  - po načtení, bez kliknutí, má odkaz poptávek `href` začínající `mailto:poptavky@hspg.cz?subject=` (klik by otevřel poštovního klienta a v prohlížeči bez obsluhy `mailto:` by způsobil chybu),
  - `scrollWidth <= innerWidth`,
  - na 360 px je výška odkazů ≥ 44 px,
  - žádná chyba konzole. Výjimkou jsou jen odpovědi 404 na `/api/*`, protože lokální statický server funkce neobsluhuje. Test je vypíše.
- [ ] E2E s `javaScriptEnabled: false`: blok ukazuje „poptavky (zavináč) hspg.cz“ a odkaz v textu vede na `#kontakty`.
- [ ] Na `/akce/` je v patičce odkaz „Nastavení cookies“ uvnitř `<p>` (test: za `</p>` v patičce není `·` ani `<a`).
- [ ] Lighthouse mobil `/` a `/cenik.html`: přístupnost ani SEO neklesly oproti měření před úkolem (homepage 4. 10.: obojí 100), výkon (medián ze 3 běhů) nižší nanejvýš o 2 body. Měření podle kroku 16. Uveď čísla před a po a cesty k JSON v `.artefakty/ukol-03/`.
- [ ] `node scripts/build-hbot.mjs --kontrola` projde (pokud je úkol 01 převzatý) a všechny původní testy webu projdou.

## Ověření
```bash
PUB=<publikační adresář z netlify.toml>
# PUB = . (kořen repozitáře) → vyluč nepublikované složky; jinak X=()
X=(--exclude-dir=node_modules --exclude-dir=.git --exclude-dir=content --exclude-dir=tests --exclude-dir=scripts --exclude-dir=netlify --exclude-dir=.artefakty '--exclude=*.md')
node scripts/build-regions.mjs && node scripts/build-kontakty.mjs
node scripts/build-kontakty.mjs --kontrola                       # → kód 0
grep -rIlE "profiserv|vresiforp" "${X[@]}" "$PUB"; echo "kód $?"            # → nic, kód 1
grep -rIil "formsubmit\.co" "${X[@]}" "$PUB" netlify.toml _headers 2>/dev/null   # → nic
git grep -n profiserv -- ':!content/firma.json' ':!tests/' ':!*.md'          # → nic
grep -rhoE 'data-mail="[^"]*"' --include=*.html "${X[@]}" "$PUB" | sort | uniq -c
#   → jen zc.gpsh@ykvatpop, zc.gpsh@ecamalker, zc.gpsh@aropdop, zc.gpsh@ecarpulops, zc.gpsh@ofni
node --test tests/kontakty.test.mjs                              # → vše prošlo (uveď počet)
CHROMIUM=<cesta k Chromiu> node --test --test-concurrency=1 tests/e2e/*.e2e.test.mjs
```
Testy, které přidáš:
- `tests/kontakty.test.mjs` (Node, bez závislostí): knihovna (`adresa('zaloha')` vyhodí chybu, obrácení tam a zpět, `predmet`, `nbsp`) a průchod všech HTML a JS v `$PUB` (se stejnými výjimkami jako `X`) podle akceptačních kritérií. Navíc `--kontrola` nad dočasnou kopií: upravená `firma.json` → kód 1, po spuštění skriptu → kód 0.
- `tests/e2e/formulare-chyba.e2e.test.mjs` a `tests/e2e/paticka-kontakty.e2e.test.mjs` (Playwright):
  - vlastní statický server nad `$PUB` (vzor `balicek/testy/server.mjs`),
  - externí požadavky blokuj přes `ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort())` a seznam požadavků kontroluj na `formsubmit.co`,
  - POST na `/akce/` a `/recenze/` zachyť přes `page.route` (`abort('failed')`, `fulfill({status: 500})`, `fulfill({status: 200})`),
  - testovací fotku vytvoř v testu (malé PNG),
  - povinná pole vyplň podle zdroje (`/akce/`: `#poptavka` – jméno, telefon, e-mail, adresa, typ povrchu, služba, souhlas; `/recenze/`: `#recenze-form` – hvězdičky, text ≥ 10 znaků, jméno, dvě potvrzení).
- Na náhledu (GET, náhled z `node scripts/nasadit.mjs`):
  - `curl -s <náhled>/ | grep -c vresiforp` → 0,
  - `curl -s -o /dev/null -w '%{http_code}' <náhled>/content/firma.json` → 404 (záložní adresa se nepublikuje),
  - `curl -sI <náhled>/ | grep -i content-security` bez `formsubmit`,
  - `curl -s <náhled>/assets/nabidka-pdf.js | grep -c "'hspg.cz'"` ≥ 1.

  Na produkci totéž až po schváleném nasazení. **Formuláře na náhledu ani produkci neodesílej**; chybové stavy se testují jen lokálně.

## Bez AI / s AI
Úkol AI nepoužívá. Kontakty fungují bez AI i bez JavaScriptu (čitelná záložní podoba adresy a odkaz na `#kontakty`). `content/firma.json` čte i plovoucí asistent (úkol 01), proto po změně spusť `build-hbot.mjs --kontrola`. Adresa, kterou asistent uvádí (`firma.email` = `info@hspg.cz`), se nemění.

## Nepřekročitelná pravidla
Viz `balicek/KONTEXT.md` §4. Pro tento úkol navíc:
- **MX ani DNS neměnit.** Nezakládej nové schránky ani aliasy. Pracuje se jen s 5 existujícími.
- `profiserv@seznam.cz` (`emaily.zaloha`) se na web nikdy nedostane, ani obráceně nebo rozděleně. Knihovna roli `zaloha` odmítne.
- Pravdivost: popisky nesmí naznačovat oddělení ani tým, který neexistuje, ani slibovat dobu odpovědi, kterou majitel nepotvrdil. Žádná nová tvrzení.
- Testy nikdy neposílají data do produkčních ani náhledových formulářů a neposílají e-maily. Vše lokálně přes `page.route`.
- V zásadách a pravidlech akce měň jen e-mailové odkazy. Text patří úkolu 09.
- Produkce jen po schválení majitelem, v dávce. Před nasazením zkontroluj zbývající kredity Netlify.

## Hlášení po dokončení
Po **fázi A** i **fázi B** formát z `KONTEXT.md` §5 a k tomu:
- inventuru výskytů před a po (tabulka soubor, řádek, typ, nová role), včetně nálezů, které v tabulce Proč chyběly,
- seznam změněných souborů, výstupy testů (počty), čísla `data-mail` a `--kontrola`,
- Lighthouse před a po (fáze B) a snímky patičky na 360 a 1280 px,
- odkaz na náhled.
- Předávky pro jiné úkoly:
  - **09:** FormSubmit už web nepoužívá. Zásady čl. 5 a sekce recenzí a pravidla akce ř. 73 ho stále uvádějí.
  - **02:** oznámení Netlify chodí na `profiserv@` a `info@`, směrování na role je v `firma.json`.
  - **08:** kde je blok `KONTAKTY` a jeho styl.
  - **11:** `email` v JSON-LD a viditelnost adresy.
  - **15:** změna CSP `form-action`.
- Návrhy mimo rozsah:
  - audit-formulare #6: sjednotit selhání průvodce na `/`, H-BOT a `hspg-fotky` se stejnou hláškou. Průvodce na `/` dnes vkládá do `mailto:` tělo s osobními údaji (funkce `mailto(subject, body)`). Úkol 02 nález #6 přiřazuje tomuto úkolu, tady je ale jen návrh. Nahlas, že nález nemá vlastníka, a navrhni ho zařadit do úkolu 17 nebo 18,
  - #9 (formuláře bez JS),
  - #20 (formuláře pro kariéru a spolupráci).
