# Úkol 08: Jednotná hlavička, patička a vzhled
> Priorita P1 · Závisí na: 03 (patička přebírá jeho kontakty); doporučeno mít sloučené i 01 (nové plovoucí tlačítko, kvůli měření překryvů). 04 ani 06 podmínkou nejsou: odkaz na reklamace a podoba URL se doplní z dat · Čeká na majitele: schválení vzhledu podle snímků před/po a náhledu (před produkcí); název evidujícího živnostenského úřadu, pokud ho agent neověří ve veřejném RŽP · Rozsah: **fáze A** = inventura, snímky „před“, data, design tokeny a jednotná patička na všech stránkách; **fáze B** = jednotná hlavička a menu, paleta, typografie, minimální velikost písma, plovoucí prvky, snímky „po“ (pokud se nevejde do jednoho sezení, dělí se na B1 a B2, viz začátek fáze B). Po fázi A podej hlášení a počkej na „pokračuj“.

## Proč (s důkazy)
Ověřeno 4. 10. 2026 v kopii živého webu (247 HTML) a Playwrightem v Chromiu nad touto kopií. Namátkově ověřeno i na https://hspg.cz, kde je stav shodný. Zdroje: audit z Chrome (`KONTEXT.md` §2), `audit-pravni_pravdivost.json` #13 a #14, `audit-formulare.json` #4, `audit-seo.json` #10.

**Web nemá společnou hlavičku ani patičku.** Každý typ stránky má vlastní značkování, vlastní menu a vlastní CSS, takže každá oprava se musí dělat na 6 a více místech.

| Typ stránek | Hlavička | Položky menu |
|---|---|---|
| `/` | `div#hspg-header-row` s inline styly, `#nav-odkazy`, na ≤ 760 px `details#mobile-menu` | Služby (`#sluzby`), Před / po (`#predpo`), Ceník, Kariéra, Pro firmy, Pro SVJ, Kalkulačka SVJ, Chci nabídku (`/akce/` otevírá v novém okně, `target="_blank"`) |
| `/cenik`, `/pas-domu`, `/kariera`, `/kalkulacka-svj`, `/ochrana-osobnich-udaju`, `/reference`, `/spoluprace`, `/recenze/`, `/pravidla-akce/` | `header.site-head` (na 4 stránkách s inline `max-width` 840 nebo 1080 px) | Úvod, Ceník, Pas domu, Kariéra, Chci cenu. Na `/spoluprace` je Pro firmy místo Pas domu, na `/recenze/` jen Úvod, Reference, Pas domu a Chci cenu |
| `/nabidka-svj` | `header.sheet-head` | jako řádek výše |
| `/akce/` | `header.hdr` | jen logo a telefon, bez menu |
| `/cisteni-strech/`, `/cisteni-fasad/`, `/cisteni-dlazby/` a 231 okresních stránek | `header.head` s `nav.nav` nebo `nav.rnav` | Úvod, Čištění fasád / střech / dlažby (každá stránka jinak), Ceník, Chci cenu |
| `/en` | `header.header`, logo `holub.svg` místo `logo-160.webp`, chybí odkaz pro přeskočení na obsah (ostatních 246 stránek ho má) | Services, Before / after, Prices, Process, CZ, Request a quote |

**Menu se zalamuje** (měřeno po 10 px a v okolí hranice po 5 px):
- Na `/` se při šířce 761–995 px položky „Před / po“, „Pro firmy“ a „Chci nabídku“ lámou na dva řádky. Pod 761 px nastupuje mobilní menu, od 999 px je menu v pořádku.
- Podstránky skládané menu nemají. Na 320–360 px se menu skládá do 2–3 řádků a hlavička je vysoká 168–253 px: `/cenik` má na 320 px 253 px, `/cisteni-fasad/kolin/` 225 px se 3 řádky.
- Na `/en` se při 320 px láme „Request a quote“.

**Čtyři pozadí, tři zlaté a čtyři písma** (vypočtené styly v Chromiu):

| Pozadí stránky | Stránky |
|---|---|
| `rgb(20, 24, 31)` = `#14181F` | `/` a všech 234 stránek `/cisteni-*` |
| `rgb(12, 18, 30)` = `#0C121E` + radiální přechod | `/cenik`, `/pas-domu`, `/kariera`, `/kalkulacka-svj`, `/nabidka-svj`, `/reference`, `/spoluprace`, `/recenze/` |
| `rgb(11, 26, 43)` = `#0B1A2B` (`assets/brand.css`) | `/akce/`, `/pravidla-akce/` |
| `rgb(22, 24, 28)` = `#16181C` | `/ochrana-osobnich-udaju`, `/en` |

- Zlatá je na webu ve třech odstínech: `#C9A962` (`--gold` na homepage a `--lux-gold` ve vloženém bloku `:root{--lux-…}` na všech 247 stránkách), `#E7CF8B` (`--gold` na `/cisteni-*`) a `#C9A227` (`assets/brand.css`, `assets/en-sections.css`). Odstín `#C9A227` má podle R4 i AI tlačítko.
- V kódu je **2 922 definic barevných proměnných s pevnou hodnotou** (`--ink`, `--navy*`, `--gold*`, `--lux-*`, `--copper*`, `--paper`, `--mist`, `--panel`, `--line` …). Z toho 2 772 pochází ze šablony okresních stránek (12 na stránku). Na ručně psaných stránkách je jich 6–16 na stránku, další jsou v `brand.css` a `en-sections.css`.
- V `assets/fonts/` jsou 4 rodiny písma: Cormorant Garamond, Playfair Display, Manrope a Inter. H1 má Playfair Display na 244 stránkách a Cormorant Garamond na 3 (`/`, `/ochrana-osobnich-udaju`, `/en`). Text je v Manrope, jen odstavce na `/cenik` jsou v Helvetice/Arialu.

**Písmo pod 12 px.** Audit z Chrome našel 36 prvků na homepage a 13 na `/en`. Počet se liší podle metody měření: když se počítají i popisky v SVG, vychází při 1280 px 50 prvků na `/` a 23 na `/en`. Ve zdrojích je `font-size` nebo `font` pod 12 px celkem 73× v 10 souborech:
- `index.html`: 34×, například „SURFACE PROTECTION GROUP“ v hlavičce má 8,5 px; v SVG jsou `font-size="9.5"` a `"10"`; `.reel-bublina__stitek` má 9 px,
- `nabidka-svj.html`: 13×,
- `assets/en-sections.css`: 9× (`.brand-sub` na `/en` má 9 px),
- `assets/svj-podklad.css`: 7×,
- `assets/holub-let.css`: 3×,
- `kalkulacka-svj.html` a `pas-domu.html`: po 2×,
- `kariera.html`, `en.html` a starý `assets/hbot.js`: po 1×.

Dále jsou pod 12 px:
- hodnoty v `rem` (6×): `assets/brand.css` 4×, načítá ho 239 stránek, a `akce/index.html` 2×, rozsah `.56rem`–`.74rem`, tedy asi 9–11,8 px. Například `.brand span{font-size:.56rem}` u „Surface Protection Group“ v hlavičce `/akce/`,
- v souborech z úkolu 01: `assets/hbot.js` 1× (`.hb-odznak` 10 px) a `assets/hbot.css` 3× (11–11,5 px v panelu majitele).

**Plovoucí prvky zakrývají obsah:**
- `#reel-bublina` je jen na `/`. Je fixní 18 px zleva a 84 px zdola, má 64 × 64 px a skrývá se na ≤ 760 px a v době, kdy je vidět výzva v úvodní části (hero).
- `#cta-stack` je jen na `/`, vpravo dole.
- `#hbot-btn` je přes `/assets/hbot.js` na 243 stránkách, vlevo dole. Po úkolu 01 zůstává 18 px zleva a 18 px zdola, má 52 px a od 1500 px zobrazuje i text, takže je širší.
- Podle auditu z Chrome `#reel-bublina` a `#hbot-btn` překrývají úvodní odstavec. Při načtení (bez posunu) se v kopii webu potvrdilo:
  - `#hbot-btn` překrývá text na `/akce/` (1004 × 700, seznam „✓ Digitální pas domu“), na `/cisteni-fasad/kolin/` (1004 × 700 nadpis H2, 768 × 1024 odstavec) a na `/reference` (1004 × 700),
  - `#cta-stack` překrývá odstavec v úvodní části `/` (1280 × 720).
- Překryv `#reel-bublina` se při načtení nepotvrdil, protože je v tu chvíli skrytá. Agent ho změří i po posunu stránky.

**Patička a povinné údaje** (247 stránek, stav 4. 10. – úkoly 03, 04, 05, 09 a 13 běží v pořadí před tímto a do patiček mezitím přidají blok `KONTAKTY`, odkaz „Reklamace“, odkaz na zásady a upraví `/en`; skutečný stav zjistí inventura v kroku 2). § 435 odst. 1 OZ vyžaduje na webu jméno, sídlo a údaj o zápisu v jiné evidenci (u OSVČ živnostenský rejstřík). Podle čl. 12 a 13 GDPR mají být zásady snadno dostupné.

| Údaj v patičce | Chybí na |
|---|---|
| „Dušan Holub“ | 2: `/cisteni-strech/`, `/en` |
| IČO 09291881 a „neplátce DPH“ | 1: `/cisteni-strech/` (patička je jen „HOLUB Surface Protection Group · +420 736 618 486 · Napsat e-mail · Nastavení cookies“) |
| Sídlo Pernerova 10/32 | 2: `/cisteni-strech/`, `/cisteni-fasad/` |
| Zápis v živnostenském rejstříku | **všech 247** |
| Odkaz „Ochrana osobních údajů“ | 234: 231 okresních stránek a 3 rozcestníky. `/akce/` má „Pravidla akce a ochrana údajů“ |
| Odkaz na reklamace | všech 247 |

- Na webu je 10 různých podob patičky. Každá má právě 1 e-mailový odkaz `data-mail`; úkol 03 je mění na 5 adres podle rolí. „Nastavení cookies“ (`data-souhlas-nastaveni`) je na 247 z 247 stránek.
- Na `/akce/` leží „Nastavení cookies“ mimo `<p>` (`audit-formulare.json` #4).
- Patička homepage nese natvrdo větu „Hydrofobní impregnace H-STONE se zárukou 10 let.“. Znění záruky má být jen na jednom místě (úkol 05).
- ARES (`audit-pravni_pravdivost.json` #13 a veřejné API ARES) uvádí: Dušan Holub, sídlo Pernerova 10/32, Karlín, 186 00 Praha 8, neplátce DPH, živnost od 29. 6. 2020, živnostenský úřad s kódem 310008. Název úřadu je potřeba ověřit ve výpisu z RŽP.

**Jak web vzniká** (pro orientaci, ověř ve zdroji):
- 232 stránek nese `<html data-gen="build-regions">` (231 okresních a `/cisteni-dlazby/`).
- Na `/cisteni-strech/` a `/cisteni-fasad/` je značka `<!-- regiony:start (generuje scripts/build-regions.mjs — neupravovat ručně) -->`, na `/cenik` `<!-- SENTINEL:START (vygenerováno z content/sentinel.json) -->`.
- Blok `:root{--lux-…}` je inline na všech 247 stránkách, takže ho nejspíš vkládá skript.
- Ostatní stránky jsou psané ručně.
- Web tedy už vkládá obsah skripty mezi značky. Stejný postup se použije pro hlavičku a patičku.

## Cíl (měřitelný)
1. **Jedna komponenta hlavičky a jedna komponenta patičky** generované z dat do všech veřejných stránek. Varianty jsou jen přes parametry: jazyk `cs`/`en`, aktivní položka a „soustředěná“ hlavička pro `/akce/`. Po normalizaci `aria-current` zůstanou nejvýš 3 podoby hlavičky (cs, en, soustředěná) a 2 podoby patičky (cs, en).
2. **Jedna sada CSS proměnných** (tokeny) pro barvy, typografii a rozměry:
   - jedno pozadí stránky a jeden zlatý akcent (R7: tmavě modrá + zlatá),
   - dvě rodiny písma,
   - mimo soubor tokenů 0 definic barevných proměnných s pevnou hodnotou. Výjimkou jsou soubory AI tlačítka a interní stránky.
3. **Patička na 100 % veřejných stránek** obsahuje:
   - identifikaci podle § 435 OZ: jméno, obchodní označení, IČO, sídlo, zápis v živnostenském rejstříku, neplátce DPH,
   - odkazy Ochrana osobních údajů, Reklamace, Nastavení cookies a Pravidla akce,
   - kontakty z úkolu 03.
4. **Menu bez zalomení a bez vodorovného posunu** na každé šířce 320–1920 px (krok 10 px). Hlavička je vysoká nejvýš 96 px. Mobilní menu funguje i bez JavaScriptu.
5. **Písmo:** viditelný text má nejméně 12 px, běžný text (`main p`, `main li`) nejméně 14 px (ideálně 16 px).
6. **Plovoucí prvky** při načtení nezakrývají H1, úvodní odstavec ani hlavní výzvu k akci a na konci stránky nezakrývají patičku.
7. **Vizuální regrese:**
   - snímky před a po na šířkách 360, 768, 1004, 1280 a 1920 px pro všechny typy stránek,
   - potom základ (hlavička, patička, první obrazovka) uložený v repozitáři a test, který hlídá, aby se vzhled znovu nerozjel.
8. **Nic se nezhorší:** přístupnost (axe; skóre Lighthouse neklesne a kde bylo 100, zůstane 100 – 100 je ověřené jen u homepage), CLS ani výkon. Všechny dosavadní testy webu (úkoly 02–07, 09, 13, 17) projdou dál.

## Rozsah
ANO:
- inventura,
- `content/firma.json` (doplnění údajů) a nový `content/navigace.json`,
- soubor tokenů a základních stylů,
- skript, který vkládá hlavičku a patičku (a napojení `build-regions.mjs`),
- odstranění starých stylů hlaviček a patiček,
- převod barev a písem na tokeny,
- oprava písma pod 12 px,
- bezpečná zóna pro plovoucí prvky,
- snímky před/po a testy, náhled.

NE:
- obsah a podoba e-mailových adres, ochrana `data-mail` a zobrazení e-mailu bez JS (úkol 03 – jeho blok se jen převezme beze změny),
- stránka reklamací a obchodní podmínky (úkol 04 – tady jen odkaz; odkaz na obchodní podmínky zůstane skrytý do schválení 04B),
- znění záruky (úkol 05 – v patičce jen z centrálního zdroje, nebo vůbec),
- podoba URL `/x` × `/x.html`, přesměrování, canonical (úkol 06 – odkazy se berou z `navigace.json` v podobě, kterou web používá),
- výkonové úpravy nad rámec tohoto úkolu (úkol 07): vytahování inline CSS/JS, cache, preloady a subsety písem, obrázky. Tady jen „nezhoršit“ a koordinovaně omezit počet rodin písma,
- text zásad a souhlasy (úkol 09), cookie lišta a její chování (úkol 10 – odkaz „Nastavení cookies“ zůstává, jak funguje),
- JSON-LD, viditelné drobečky, H1, title a description, obsah rozcestníků (úkol 11),
- **obsahové** prolinkování z homepage a ceníku na rozcestníky a Prahu a krajské huby (úkol 12 B). Tady jde jen o navigační komponentu, viz krok 4,
- tvrzení o technologiích, H-BIO, kariéře a akci, včetně textu proužku akce na homepage (úkol 13),
- vzhled a chování plovoucího tlačítka H-SPG CORE (úkol 01, R4). Výjimkou je bezpečná zóna (krok 16) a zvednutí 4 velikostí písma pod 12 px v jeho souborech (krok 15),
- interní stránky `/rd-control-panel/` a `/ai-centrum/` (R7: tam zůstává antracit), jejich hlavička ani patička se nemění,
- samostatná offline stránka `/offline/` z úkolu 17 (inline CSS, bez externích souborů) – generátor ji vynechá,
- zavírání mobilního menu klávesou Esc a kliknutím mimo, jednotný indikátor fokusu, `scroll-padding` a `assets/pristupnost.js` (úkol 16, běží po tomto; tady jen menu na `<details>` funkční bez JS a zachovaný stávající viditelný fokus),
- jakékoli texty v těle stránek.

## Postup

### Fáze A – inventura, snímky „před“, data, tokeny a patička
1. Větev `ukol-08-jednotny-design` z aktuální `main`. Předtím `git -C ../hspg-balicek pull`.
   - Testy patří do adresáře a konvence, které na webu zavedly předchozí úkoly (`tests/`, e2e v `tests/e2e/`). Cesty `tests/…` níže tomu odpovídají; pokud web používá jinou konvenci, drž se jí a uveď to v hlášení.
   - Ověř, že je sloučený úkol 03: v patičkách je kontaktní blok s 5 adresami @hspg.cz. Kontrola: na 3 namátkových stránkách má `<footer>` 5 prvků `a[data-mail]` s různými hodnotami a obráceně čtené končí na `@hspg.cz`. Pokud ne, **zastav se a nahlas to**.
   - Zjisti a zapiš do hlášení, zda je sloučený úkol 01 (`assets/hbot.js` obsahuje „H-SPG CORE“), 04 (existuje stránka reklamací) a 06 (jednotná podoba URL).
2. **Najdi v repozitáři soubory, které generují hlavičky, patičky a styly stránek:**
   - `scripts/build-regions.mjs`: kde je šablona `header.head` / `nav.rnav`, `footer.foot` a `:root` s barvami a jak se spouští,
   - skript, který vkládá blok `:root{--lux-…}` do všech stránek (`git grep -n "lux-ink" -- scripts`), a ostatní generátory se značkami (`SENTINEL`, `REFERENCE`, `RECENZE`, `build-ceny.mjs`, `build-references.mjs`, `build-hbot.mjs`),
   - ručně psané stránky (`index.html`, `cenik.html`, `pas-domu.html`, `kariera.html`, `kalkulacka-svj.html`, `nabidka-svj.html`, `spoluprace.html`, `reference.html`, `ochrana-osobnich-udaju.html`, `en.html`, `akce/`, `pravidla-akce/`, `recenze/`, `cisteni-strech/`, `cisteni-fasad/`, případně `404.html`) a sdílené CSS `assets/brand.css`, `assets/en-sections.css`,
   - build příkaz (`netlify.toml`, `package.json`) a jestli se vygenerované HTML commituje. Zjisti i co nahrává `scripts/nasadit.mjs`,
   - JS, který závisí na selektorech hlavičky a patičky: `git grep -nE "nav-odkazy|mobile-menu|hspg-header|site-head|sheet-head|rnav|data-souhlas-nastaveni|data-mail|data-kontakt|KONTAKTY|data-zaruka|hero-cta-na-obrazovce|hspg-lista|--hlavicka" -- '*.js' '*.html' '*.mjs' '*.css'`. Patří sem i měření výšky sticky hlavičky pro kotvy z úkolu 17 (`--hlavicka`, `ResizeObserver`, např. `assets/spolecne.js`). Každý nalezený selektor musí po změně fungovat, nebo se v témže commitu upraví i skript,
   - generátory předchozích úkolů, které píšou do patičky nebo hlavičky: `scripts/build-kontakty.mjs` a `scripts/lib/kontakty.mjs` (úkol 03, blok `KONTAKTY`), `scripts/build-zaruka.mjs` (úkol 05, prvky `data-zaruka`), a v jakém pořadí se spouštějí,
   - seznam veřejných HTML stránek ze souborů: `git ls-files '*.html' ':!ai-centrum/*' ':!rd-control-panel/*' ':!offline/*' ':!tests/*' ':!node_modules/*'` (případné další neveřejné soubory vyřaď a vyjmenuj v hlášení). Ve zdroji jsou i stránky, které kopie živého webu nemá: `404.html`, `zaruka.html` (úkol 05), `reklamace/` a `reklamace/dekujeme/` (úkol 04), `akce/dekujeme/`. Počet nikde natvrdo nepiš, v kopii živého webu je to 247. Tentýž seznam (stejný příkaz) používají generátor, testy a akceptační kritéria jako „N“.

   Výsledek zapiš do hlášení jako tabulku: typ stránky → soubor nebo generátor → hlavička → patička.
3. **Snímky „před“ – dřív než cokoli změníš.**
   - Vytvoř `tests/vizualni.mjs` (Playwright, Chromium). Pokud úkol 07 zavedl snímkování (`tests/vykon/vzhled.test.mjs`), převezmi jeho pomocné funkce pro stabilní snímek a nepiš je podruhé.
   - Statický server: použij ten, který už ve `tests/` zavedly předchozí úkoly (vzor `balicek/testy/server.mjs`: `/x` → `x.html`, `/adresar/` → `adresar/index.html`). Jen pokud žádný není, vytvoř `tests/server-staticky.mjs` se stejným mapováním a `/api/*` → 404. Alternativně lze použít `netlify dev`.
   - Typy stránek: `/`, `/cenik`, `/pas-domu`, `/kariera`, `/kalkulacka-svj`, `/nabidka-svj`, `/spoluprace`, `/reference`, `/ochrana-osobnich-udaju`, `/akce/`, `/pravidla-akce/`, `/recenze/`, `/cisteni-strech/`, `/cisteni-fasad/`, `/cisteni-dlazby/`, `/cisteni-fasad/kolin/`, `/cisteni-strech/praha/`, `/en`. Přidej `/zaruka`, `/reklamace/`, `/akce/dekujeme/` a `404.html`, pokud existují. Konečný seznam zapiš do `tests/typy-stranek.json`; z něj čtou všechny testy a jeho délka je „počet typů stránek“.
   - **Selektor hlavičky:** homepage dnes nemá prvek `<header>`. Na `/` snímej a měř sticky obal, který obsahuje `#hspg-header-row` (`#hspg-header-row` a jeho rodič s `position:sticky`, včetně proužku akce), jinde první `body header`. Mapování selektorů ulož do téhož JSON, aby snímky „před“ i „po“ měřily totéž.
   - Šířky 360, 768, 1004, 1280 a 1920 px, výška 900 px.
   - Stabilní snímky:
     - souhlas předvyplň (`localStorage` `hspg-souhlas` = `nezbytne`, lišta se pak nezobrazí),
     - `reducedMotion: 'reduce'`,
     - vložený styl `*{animation:none!important;transition:none!important}`,
     - čekej na `document.fonts.ready`,
     - videa nech na posteru.
   - Ukládej celou stránku a samostatně `header` a `footer` do `.artefakty/ukol-08/pred/<typ>@<šířka>.png`. `.artefakty/` přidej do `.gitignore`.
   - Stejný měřicí modul (`tests/mereni-layout.mjs`) uloží `.artefakty/ukol-08/pred/mereni.json`: výška hlavičky, počet řádků menu a zalomených položek, pozadí `html`/`body`, rodiny písma, počet viditelných textů pod 12 px (u SVG skutečná vykreslená velikost, tj. `font-size` × měřítko z `getScreenCTM()`), překryvy plovoucích prvků a **počet porušení axe-core s dopadem `serious`/`critical` na celé stránce** (360 a 1280 px; výchozí stav pro kritérium „nezhoršit“ ve fázi B). Stejný modul pak použijí testy ve fázi B.
4. **Data – `content/firma.json`** (jediný zdroj faktů o firmě z úkolu 01, nezakládej druhý). Doplň:
   ```json
   "obchodni_oznaceni": "HOLUB Surface Protection Group",
   "sidlo": { "ulice": "Pernerova 10/32", "psc": "186 00", "obec": "Praha 8 – Karlín", "obec_en": "Prague 8 – Karlín", "stat_en": "Czech Republic" },
   "zapis": {
     "text": "zapsán v živnostenském rejstříku",
     "text_en": "registered in the Czech Trade Licensing Register",
     "urad": "[DOPLNIT: název evidujícího živnostenského úřadu – ARES uvádí kód úřadu 310008; ověř ve výpisu z RŽP podle IČO 09291881]",
     "potvrzeno": false
   },
   "facebook": "<stávající odkaz z patičky homepage>"
   ```
   - Sídlo je na webu na 245 stránkách a podle auditu odpovídá ARES, takže ho převezmi.
   - Název úřadu zkus ověřit ve veřejném RŽP (jen GET, vyhledání podle IČO). Když ho najdeš, vyplň `urad`, `zdroj` a `overeno` (datum) a nech `potvrzeno: false`, dokud ho majitel nepotvrdí v hlášení.
   - Patička vždy vypíše „zapsán v živnostenském rejstříku“, protože zápis eviduje ARES. Název úřadu vypíše jen tehdy, když `urad` neobsahuje `[DOPLNIT`.
   - Facebook: převezmi stávající odkaz. Výměnu za kanonickou adresu profilu řeší úkol 11.
   - Po úpravě spusť `node scripts/build-hbot.mjs` a `node scripts/build-hbot.mjs --kontrola`, protože znalosti asistenta se generují z `content/`.

   **Data – nový `content/navigace.json`** (jediné místo pro menu a odkazy patičky). Návrh vychází ze sjednocení dnešních menu: žádná nová stránka, žádné nové texty, „Chci cenu“ je dnes v hlavičce 244 stránek. Agent ho ukáže na snímcích a majitel ho může změnit jedním souborem:
   ```json
   {
     "cs": {
       "menu": [
         { "text": "Služby", "podmenu": [
           { "text": "Čištění střech", "href": "/cisteni-strech/" },
           { "text": "Čištění fasád", "href": "/cisteni-fasad/" },
           { "text": "Čištění dlažby", "href": "/cisteni-dlazby/" } ] },
         { "text": "Ceník", "href": "/cenik" },
         { "text": "Pro SVJ", "href": "/nabidka-svj" },
         { "text": "Pas domu", "href": "/pas-domu" },
         { "text": "Kariéra", "href": "/kariera" },
         { "text": "Pro firmy", "href": "/spoluprace" }
       ],
       "cta": { "text": "Chci cenu", "href": "/akce/" },
       "paticka": [
         { "nadpis": "Služby", "odkazy": ["Čištění střech", "Čištění fasád", "Čištění dlažby", "Ceník", "Pro SVJ a družstva → /nabidka-svj", "Kalkulačka SVJ → /kalkulacka-svj"] },
         { "nadpis": "Na webu", "odkazy": ["Dokumentace zakázky → /pas-domu", "Reference → /reference", "Ohodnoťte naši práci → /recenze/", "Kariéra", "Pro firmy a dodavatele → /spoluprace", "English → /en"] },
         { "nadpis": "Dokumenty", "odkazy": ["Ochrana osobních údajů → /ochrana-osobnich-udaju", "Nastavení cookies (data-souhlas-nastaveni)", "Reklamace → stránka z úkolu 04, jen pokud existuje", "Pravidla akce → /pravidla-akce/", "Obchodní podmínky → zobrazit: false (do schválení 04B)"] }
       ]
     },
     "en": { "menu": ["Services #services", "Before / after #results", "Prices #prices", "Process #process"], "jazyk": { "text": "CZ", "href": "/" }, "cta": { "text": "Request a quote", "href": "<cíl tlačítek „Request a quote“ v en.html po úkolu 13 – kotva kontaktního panelu>" }, "paticka": "stejná struktura; popisky a cíle odkazů na zásady a cookies převzaté z en.html po úkolech 09 a 13, „Česká verze“" },
     "varianty": { "/akce/": "soustredena" }
   }
   ```
   Zápis výše je zkrácený, skutečný soubor má u každého odkazu `text` a `href`. Interní odkazy piš v podobě, kterou web používá (dnes `/x` bez `.html`; po úkolu 06 jeho podoba). Kotvy, které existují jen na homepage (`#sluzby`, `#predpo`), v globálním menu nejsou. Anglické položky zůstávají jako dnes. **`/en` se nevrací do stavu před úkoly 09 a 13:** úkol 13 směruje „Request a quote“ na kotvu kontaktního panelu (ne na český formulář `/akce/`) a úkol 09 vede „Privacy policy“ na `/ochrana-osobnich-udaju#english` a odstraňuje „(in Czech)“. Cíl CTA i popisky a `href` odkazů na zásady a cookies proto převezmi z aktuálního `en.html`; pokud 09 nebo 13 sloučené nejsou, ponech dnešní stav `en.html` a uveď to v hlášení.
5. **Tokeny a základní styly – `assets/zaklad.css`** (název přizpůsob konvenci webu). Hodnoty jsou převzaté z webu (kontrast WCAG spočítaný proti `#0C121E`):

   | Token | Hodnota | Odkud na webu | Kontrast |
   |---|---|---|---|
   | `--c-pozadi` | `#0C121E` | pozadí `/cenik` a 7 dalších stránek (tmavě modrá) | – |
   | `--c-pozadi-2` | `#111A2C` | přechod na `/cenik` | – |
   | `--c-panel` | `#16283E` | `--navy-800` na homepage | – |
   | `--c-zlata` | `#C9A962` | `--gold` na homepage, `--lux-gold` na 247 stránkách | 8,33 : 1 |
   | `--c-zlata-svetla` | `#E7CF8B` | `--gold-200` na homepage, `--gold` na `/cisteni-*` | 12,22 : 1 |
   | `--c-text` | `#F4F6F9` | `--mist` na homepage | 17,3 : 1 |
   | `--c-text-tlumeny` | `#C3C8CE` | odkazy menu na homepage | 11,13 : 1 |
   | `--c-papir` / `--c-text-na-papiru` | `#F4F2ED` / `#25282C` | světlé plochy ceníku | – |
   | `--f-text` | Manrope (+ stávající fallback) | text většiny stránek | – |
   | `--f-nadpis` | Playfair Display (+ fallback) | H1 na 244 stránkách | – |
   | `--fs-min` / `--fs-mala` / `--fs-text` | 12 / 14 / 16 px (desktop text 17 px jako dnes) | – | – |
   | `--plovouci-zona` | výška zóny plovoucích prvků (18 + 52 + rezerva, změř) | – | – |

   - `#C9A227` zůstává jen u AI tlačítka (R4). Antracit a cyan zůstávají jen u AI tlačítka a interního panelu (R7).
   - Paleta je výchozí návrh sestavený z hodnot, které už na webu jsou. Pokud ji majitel po snímcích změní, mění se jen tento soubor.
   - Soubor obsahuje tokeny, základ typografie, komponenty hlavičky a patičky, viditelný fokus, odkaz pro přeskočení na obsah a třídu `.sr-only`.
   - Velikost nejvýš 15 KB. Žádné nové soubory písem, žádné inline skripty ani `on…=` atributy (CSP, úkol 15).
   - Do `<head>` všech stránek ho vkládá skript z kroku 6 jako `<link rel="stylesheet">` s otiskem verze (`?v=` prvních 8 znaků SHA-256 obsahu). Pokud úkol 07 už zavedl jiný mechanismus otisků, použij jeho.
6. **Komponenta a generátor.**
   - **`scripts/lib/layout.mjs`** obsahuje čisté funkce `hlavicka({ jazyk, cesta, varianta })`, `paticka({ jazyk })` a `odkazCss()`. Čtou `content/firma.json` a `content/navigace.json`. Escapují HTML a vkládají nezlomitelné mezery podle `KONTEXT.md` §4.9: po v, k, s, z, a, i, o, u, dále v „186 00“, „Praha 8“, „IČO 09291881“ a v telefonu.
     - **Kontroluje, že každý interní `href` vede na existující soubor** (kotva `#…` na `id` cílové stránky). Když ne, skončí chybou, aby nevznikl mrtvý odkaz.
     - Položky s `zobrazit: false` a hodnoty obsahující `[DOPLNIT` nikdy nevypíše.
     - **Blok kontaktů nekopíruje jako HTML:** `paticka()` volá `blokKontaktu(jazyk)` ze `scripts/lib/kontakty.mjs` (úkol 03) a značky `<!-- KONTAKTY:START -->…<!-- KONTAKTY:END -->` zůstávají uvnitř patičky, aby `build-kontakty.mjs` i jeho `--kontrola` fungovaly dál beze změny.
   - **`scripts/build-layout.mjs`** projde všechny veřejné HTML (seznam z kroku 2, tedy ne `/rd-control-panel/`, `/ai-centrum/`, `/offline/`) a nahradí obsah mezi značkami:
     `<!-- HSPG:PATICKA:START (generuje scripts/build-layout.mjs — neupravovat ručně) -->` … `<!-- HSPG:PATICKA:END -->`
     a stejně `HSPG:HLAVICKA` (fáze B) a `HSPG:ZAKLAD-CSS` v `<head>`.
     - Při prvním běhu jednorázově nahradí stávající `<footer>…</footer>` značkami. Na každé stránce musí najít právě jednu shodu, jinak se zastaví a vypíše soubor. Stránka bez `<footer>` (např. děkovací) dostane patičku na konec `<body>` před skripty; stránka s více shodami je chyba k ruční opravě zdroje. Každý takový případ uveď v hlášení.
     - Jazyk určí z `<html lang>`.
     - Režim `--kontrola` skončí kódem 1 a vypíše seznam, pokud se kterákoli stránka liší od komponenty. Porovnává stav po celém řetězci generátorů (obsah bloku `KONTAKTY` a prvků `data-zaruka` doplňují `build-kontakty` a `build-zaruka`).
     - Režim `--ukazka` vypíše samostatné HTML s hlavičkou a patičkou pro validátor.
   - **`scripts/build-regions.mjs`** importuje tytéž funkce. Vlastní kopie hlavičky a patičky ze šablony odstraň, aby byly generované stránky shodné hned po vygenerování.
   - Do `package.json` přidej skripty `layout` a `layout:kontrola` a zařaď `build-layout` do pořadí generátorů za `build-regions` a **před** `build-kontakty` a `build-zaruka`. Po změně spusť celý řetězec a `node scripts/build-kontakty.mjs --kontrola` (a `build-zaruka.mjs --kontrola`, je-li úkol 05 sloučený) → kód 0.
   - Vygenerované HTML se commituje stejně jako dnes výstup `build-regions`.
7. **Patička** (cs). V `<footer class="hspg-paticka">`:
   - tři sloupce z `navigace.json` (Služby / Na webu / Dokumenty) a sloupec Kontakt: telefon `tel:`, pracovní doba, **blok 5 e-mailů z úkolu 03 beze změny** – výstup `blokKontaktu(jazyk)` včetně značek `KONTAKTY` (`data-mail`, `data-subject`, popisky rolí) – a Facebook,
   - pod tím řádek identifikace:
     > Dušan Holub, podnikající pod označením HOLUB Surface Protection Group · IČO 09291881 · sídlo Pernerova 10/32, 186 00 Praha 8 – Karlín · zapsán v živnostenském rejstříku (úřad z `firma.json`, je-li ověřen) · neplátce DPH

     Znění vychází z doporučení auditu #13. Pokud ho upraví právník (úkol 04 B), mění se na jednom místě,
   - **„Nastavení cookies“** ponech jako dnes: `<a data-souhlas-nastaveni href="…#cookies">`, aby ho dál zachytil `souhlas.js`,
   - **věta o záruce v jednotné patičce není** (ani odkaz na podmínky záruky). Důvod: patička je na všech stránkách a test úkolu 05 vyžaduje 0 zmínek o záruce na 154 stránkách střech a dlažeb. Prvky `data-zaruka`, které úkol 05 vložil do dnešní patičky homepage, tím z patičky zmizí; záruka zůstává v těle homepage. Uveď to v hlášení; přání majitele mít záruku v patičce je návrh mimo rozsah (musí se sladit s testy 05). Popis služeb převezmi z patičky homepage ve stavu po úkolu 13, bez tvrzení,
   - `/en`: stejná komponenta anglicky, včetně jména Dušan Holub a „registered office Pernerova 10/32, 186 00 Prague 8 – Karlín, Czech Republic“, „Company ID (IČO) 09291881“, „not registered for VAT“; odkazy na zásady a cookies s popisky a cíli z aktuálního `en.html` (viz krok 4),
   - na `/akce/` je stejná patička, takže zmizí chyba s textem mimo `<p>`,
   - **bezpečná zóna pro plovoucí prvky** (už ve fázi A, protože ji kontroluje test kroku 9): patička má na ≥ 761 px `padding-bottom: calc(var(--plovouci-zona) + env(safe-area-inset-bottom))`. Na ≤ 760 px ověř, že stačí rezerva pro spodní lištu z úkolu 01 (`body{padding-bottom:…}`), jinak ji v patičce doplň stejným způsobem.
8. Spusť `build-layout` pro patičky. Ze inline stylů stránek, `brand.css` a `en-sections.css` odstraň pravidla pro staré patičky (`.foot`, `footer …`), ale jen ta, která už nic necílí (ověř `git grep` a snímkem). Nic jiného v CSS stránek ve fázi A neměň.
9. **Testy fáze A:**
   - `tests/layout.test.mjs` (node:test, bez prohlížeče, nad všemi veřejnými HTML ze seznamu kroku 2):
     - právě 1 blok `HSPG:PATICKA` a jeho obsah se rovná výstupu řetězce generátorů pro `paticka({jazyk})` (stejné porovnání jako `--kontrola`),
     - patička obsahuje „Dušan Holub“, „09291881“, „Pernerova 10/32“, „živnostenském rejstříku“ / „Trade Licensing Register“ a „neplátce DPH“ / „not registered for VAT“,
     - odkaz s textem „Ochrana osobních údajů“ / „Privacy policy“, `[data-souhlas-nastaveni]`, odkaz „Pravidla akce“, odkaz „Reklamace“ (pokud stránka existuje),
     - 5 `a[data-mail]` s různými hodnotami,
     - ve výstupu žádné `[DOPLNIT`,
     - v textu patičky žádná obyčejná mezera po jednopísmenné předložce.
   - `tests/e2e/layout.e2e.test.mjs` (Playwright), část patička:
     - na 320 px žádný vodorovný posun,
     - po posunu na konec stránky žádný odkaz ani text patičky neleží pod `#hbot-btn`, `#reel-bublina`, `#cta-stack` (≥ 761 px) ani pod spodní lištou `#hspg-lista` (≤ 760 px). Kontrola přes `elementFromPoint` ve středu každého odkazu.
   - Validace: `node scripts/build-layout.mjs --ukazka > .artefakty/ukol-08/komponenty.html && npx -y html-validate .artefakty/ukol-08/komponenty.html`.
   - Dosavadní testy webu (`npm test` a e2e testy úkolů 02–07, 09, 13, 17) projdou. Pokud některý počítal se starou podobou patičky (např. pevný počet `data-mail` nebo `data-zaruka`), uprav jen očekávanou hodnotu a každou změnu zdůvodni v hlášení.
10. Náhled: `node scripts/nasadit.mjs` (bez parametrů = náhled zdarma). Na náhledu GETem ověř 3 stránky (`/`, `/cisteni-strech/`, `/en`), že patička obsahuje IČO a odkaz na zásady: `for p in / /cisteni-strech/ /en; do curl -s "<náhled>$p" | grep -oE "09291881|ochrana-osobnich-udaju|Pernerova|ivnostensk|Trade Licensing" | sort -u | wc -l; done` → u každé stránky 4 (IČO, zásady, sídlo, zápis v RŽP).
11. **Hlášení po fázi A** (formát `KONTEXT.md` §5) a **zastav se**.

### Fáze B – hlavička, menu, paleta, typografie, plovoucí prvky
> Pokud fázi B v jednom sezení nestihneš, rozděl ji: **B1** = kroky 12 a 17 a z kroku 18 testy hlavičky, menu a mobilního menu (náhled a hlášení po B1); **B2** = kroky 13–16, zbytek kroku 18 a kroky 19–21. B1 se smí sloučit do `main` samostatně až po schválení vzhledu majitelem. Před B2 `git pull`.

12. **Komponenta hlavičky** (z `navigace.json`). Kostra:
    ```html
    <a class="hspg-skip" href="#obsah">Přeskočit na obsah</a>
    <header class="hspg-hlavicka">
      <a class="hspg-logo" href="/" aria-label="HOLUB Surface Protection Group – úvodní stránka">
        <img src="/assets/v/logo-160.webp" srcset="/assets/v/logo-160.webp 1x, /assets/v/logo-320.webp 2x" width="44" height="44" alt="">
        <span>HOLUB <small>Surface Protection Group</small></span></a>
      <nav class="hspg-menu" aria-label="Hlavní navigace">
        <details class="hspg-podmenu"><summary>Služby</summary> … </details>
        <a href="/cenik">Ceník</a> … <a class="hspg-cta" href="/akce/">Chci cenu</a></nav>
      <details class="hspg-menu-mobil"><summary>Menu</summary><nav aria-label="Hlavní navigace">…</nav></details>
    </header>
    ```
    - Desktopové a mobilní menu mají stejný název „Hlavní navigace“ (vidět je vždy jen jedno; tak to čeká i úkol 16). V en variantě „Main navigation“ a odkaz pro přeskočení „Skip to content“.
    - Cíl odkazu pro přeskočení vezmi z `id` stávajícího `<main>` (dnes `#main` nebo `#obsah`). Pokud `id` chybí (dnes `/en`), přidej `id="main"` – většina stránek ho má a úkol 16 ho na `/en` očekává.
    - `aria-current="page"` určí generátor z cesty. U okresních stránek a rozcestníků je to „Služby“ a příslušná položka podmenu.
    - **Zalamování:** položky mají `white-space: nowrap`. Přechod na mobilní menu nastav podle změřené šířky celé hlavičky (cs i en), ne odhadem. Test v kroku 18 to hlídá na každých 10 px.
    - **Bez JS:** menu i podmenu jsou `<details>` a fungují bez JavaScriptu. Žádný nový skript pro menu ani inline skript: zavírání klávesou Esc a kliknutím mimo doplní úkol 16 (`assets/pristupnost.js`, háček `data-hspg-menu` na kořen menu – přidej ho už teď).
    - **Mobil:** na ≤ 760 px je v hlavičce jen logo a „Menu“. Výzvu „Chci cenu“ tam nese spodní lišta z úkolu 01 (je jen do 760 px). Pokud změřený přechod na skládané menu vyjde nad 760 px, má hlavička mezi 761 px a tímto přechodem logo, výzvu „Chci cenu“ a „Menu“.
    - **Sticky:** sjednoť (doporučení: sticky od 761 px, jako dnes homepage; na mobilu ne, kvůli spodní liště).
    - Logo bude všude `logo-160.webp` s `width`/`height` (kvůli CLS), včetně `/en`.
    - Výzva k akci se otevírá ve stejném okně (bez `target="_blank"`).
    - **Proužek akce** nad hlavičkou homepage zachovej jako volitelný slot `oznameni` uvnitř `<header>`, jen na `/`. Jeho text neměň (úkol 13). Test podob hlavičky slot před porovnáním odstraní stejně jako `aria-current`.
    - **Kotvy z úkolu 17:** výšku sticky hlavičky pro `scroll-margin-top` (`--hlavicka`, `ResizeObserver`) musí skript úkolu 17 dál měřit na nové hlavičce; uprav jeho selektor v témže commitu. Testy kotev úkolu 17 projdou; pokud se kvůli odebraným položkám menu `#sluzby` a `#predpo` změní počet odkazů na kotvy na homepage, uprav jen očekávaný počet a zdůvodni to v hlášení.
    - **Soustředěná varianta** pro `/akce/`: logo a telefon, stejné styly.
    - Selektory, na které se váže JS (krok 2), zachovej nebo uprav i skript.
13. **Paleta.**
    - Všechny definice barevných proměnných s pevnou hodnotou převeď na tokeny: šablona v `build-regions.mjs`, ručně psané stránky, `brand.css`, `en-sections.css` a skript bloku `--lux-*` (např. `--lux-gold: var(--c-zlata)`).
    - Nejbezpečnější postup: v `zaklad.css` sekce „přechodové aliasy“ (`--gold: var(--c-zlata)`, `--ink: var(--c-pozadi)`, …) a v jednotlivých stránkách místní definice smazat. Inline `:root` ve stránce by jinak tokeny přebil.
    - Pozadí `html` i `body` je na všech stránkách `var(--c-pozadi)`. Dekorativní přechod buď všude stejný jako token, nebo nikde. Světlé plochy ceníku zůstávají přes `--c-papir`.
    - Výjimky: `assets/hbot*`, `/rd-control-panel/`, `/ai-centrum/`.
14. **Typografie.**
    - Text: `--f-text` (Manrope) všude, Helvetica/Arial na `/cenik` a Inter nahraď.
    - Nadpisy: `--f-nadpis` (Playfair Display). Cormorant Garamond na `/`, `/ochrana-osobnich-udaju` a `/en` nahraď.
    - `@font-face` a preload rodiny smaž, jen když ji `git grep` už nikde nenajde. Pokud úkol 07 už změnil strategii písem, drž se jeho postupu.
    - Velikosti převeď na škálu tokenů.
15. **Minimální písmo.**
    - Každé `font-size` nebo `font` pod 12 px (a `rem`/`em` pod 0,75 rem) nahraď nejméně `var(--fs-min)`. Běžný text v `main` má nejméně 14 px.
    - SVG popisky (`font-size="9.5"`, `"10"` v `index.html`) uprav tak, aby vykreslená velikost byla ≥ 12 px na nejužší šířce, kde se SVG zobrazuje. Jinak informaci dej do HTML pod obrázek a v SVG ji skryj před čtečkami (duplicitu).
    - Text „Surface Protection Group“ v logu má nejméně 12 px.
    - **Jediné povolené změny v souborech úkolu 01:** zvednout velikosti pod 12 px na 12 px, a to `.hb-odznak` v `assets/hbot.js` (10 px) a `.hbm-karta h3 span`, `.hbm-krok` a `.hbm-pata` v `assets/hbot.css` (11 a 11,5 px). Nic jiného v těchto souborech neměň. Zapiš to do hlášení, aby se to převzalo i do balíčku.
16. **Plovoucí prvky.**
    - Rezerva v patičce už je z fáze A (krok 7). Po změně hlavičky a typografie ji jen přeměř a případně uprav `--plovouci-zona`.
    - Pro první obrazovku: `#reel-bublina` a `#cta-stack` (jen homepage) skrývej, dokud je vidět výzva v úvodní části. Mechanismus `body.hero-cta-na-obrazovce` už existuje, jen ho zkontroluj na všech šířkách.
    - U `#hbot-btn` nejdřív zkus místo: okraje nebo šířku textového sloupce v úvodní části. Skrývání tlačítka na dalších stránkách použij jen tehdy, když jinak test neprojde, a zapiš to do hlášení. Majitel chce tlačítko vidět (R3, R4).
    - Vzhled ani polohu tlačítka neměň.
17. Spusť `build-layout` pro hlavičky, odstraň pravidla pro staré hlavičky (`.site-head`, `.sheet-head`, `.hdr`, `.head`, `.rnav`, `.header`, `#hspg-header-row`, `#nav-odkazy`, `#mobile-menu`) a ověř `git grep`, že je nic nepoužívá.
18. **Testy fáze B** – rozšiř `tests/layout.test.mjs` a `tests/e2e/layout.e2e.test.mjs`:
    - **Hlavička (statický test):** právě 1 blok `HSPG:HLAVICKA` na stránku. Po odstranění `aria-current` a slotu `oznameni` nejvýš 3 různé podoby hlavičky a 2 podoby patičky.
    - **Menu (e2e):** jedno načtení na typ stránky, pak `setViewportSize` od 320 do 1920 px po 10 px. Na každé šířce platí:
      - žádný viditelný odkaz ani `summary` v hlavičce nemá víc než jeden řádek (`Range.getClientRects()`),
      - viditelné položky menu leží v jedné řadě,
      - výška hlavičky (bez proužku akce) je ≤ 96 px a na stejné šířce se mezi typy stránek liší nejvýš o 2 px,
      - `scrollWidth ≤ innerWidth`.
    - **Mobilní menu (e2e):**
      - otevře se klávesou Enter i mezerníkem (Esc a klik mimo testuje úkol 16),
      - fokus na `summary` je viditelný (vypočtený `outline` nebo `box-shadow` není `none`),
      - s vypnutým JavaScriptem (`javaScriptEnabled: false`) jde otevřít a obsahuje všechny položky.
    - **Paleta (e2e):** na všech typech stránek je stejné vypočtené pozadí stránky, pozadí hlavičky, pozadí patičky a barva `.hspg-cta`.
    - **Písma (e2e):** u viditelných textů jsou nejvýš 2 rodiny písma. Počítá se první rodina z vypočteného `font-family` (záložní rodiny z úkolu 07 se nepočítají), bez prvků H-BOT (`#hbot`, `#hbot-btn` a jejich potomci).
    - **Minimální písmo (e2e):** na 360 a 1280 px při načtení i po posunu na konec mají všechny viditelné texty vykreslenou velikost ≥ 12 px (SVG přes měřítko). `main p` a `main li` mají ≥ 14 px.
    - **Překryvy (e2e):** při načtení na 768 × 1024, 1004 × 700, 1280 × 720, 1366 × 768 a 1920 × 1080 se plovoucí prvky nepřekrývají s H1, prvním `main p` ani prvním odkazem na `/akce/` v úvodní části. Na konci stránky se nepřekrývají s patičkou.
    - **Přístupnost (axe-core, `include: ['header', 'footer']`):** 0 porušení na 360 i 1280 px. Celkový počet závažných porušení (`serious`/`critical`) na stránkách není vyšší než výchozí stav v `.artefakty/ukol-08/pred/mereni.json` (uveď čísla).
19. **Snímky „po“ a porovnání:**
    - `node testy/vizualni.mjs --stav po`, pak `--porovnej` → `.artefakty/ukol-08/porovnani.html` (vedle sebe před / po / rozdíl, `pixelmatch` + `pngjs`, procento změněných pixelů u každé stránky a šířky).
    - Pak `--zaklad` uloží do repozitáře `testy/vizualni/zaklad/` jen `header` a `footer` na 360 a 1280 px a první obrazovku na 1280 px (celkem do ~3 MB).
    - `--kontrola` porovná aktuální stav se základem s tolerancí 0,5 % pixelů. Pozdější úkoly tak uvidí, když vzhled rozbijí.
20. **Lighthouse** (mobil) na náhledu před a po:
    - stránky: `/`, `/cenik`, `/cisteni-fasad/kolin/`, `/akce/`, `/en`,
    - náhled „před“ = náhled z `main`, náhled „po“ = náhled větve. Oba přes `node scripts/nasadit.mjs`, zdarma,
    - přístupnost zůstane 100, výkon neklesne o víc než 2 body, CLS se nezvýší.
21. Náhled pošli majiteli s odkazem na `porovnani.html`, aby vzhled schválil. Kontrolu náhledu v prohlížeči může udělat i Claude v Chrome. Produkce až po schválení majitelem a v dávce s dalšími úkoly.

## Akceptační kritéria
Fáze A:
- [ ] Hlášení obsahuje inventuru (typ stránky → soubor nebo generátor → hlavička → patička) a stav úkolů 01, 03, 04 a 06.
- [ ] `ls .artefakty/ukol-08/pred/*.png | wc -l` = 3 × 5 × počet typů stránek (celá stránka, hlavička, patička) a existuje `mereni.json`. Snímky vznikly z commitu před první změnou (uveď jeho hash).
- [ ] `content/firma.json` obsahuje `obchodni_oznaceni`, `sidlo` a `zapis`. `node scripts/build-hbot.mjs --kontrola` → OK.
- [ ] `node scripts/build-layout.mjs --kontrola` → 0 rozdílů. `git grep -l "HSPG:PATICKA:START" -- '*.html' | wc -l` = počet veřejných stránek.
- [ ] `node --test testy/layout.test.mjs`: patička na N/N stránkách splňuje všechny body z kroku 9 (uveď N).
- [ ] `git grep -n "\[DOPLNIT" -- '*.html'` → prázdné.
- [ ] e2e: na 320 px bez vodorovného posunu. Na konci stránky není žádný odkaz patičky zakrytý (360 i 1280 px, všechny typy stránek).
- [ ] `html-validate` na `komponenty.html` → 0 chyb.
- [ ] Náhled: GET `/`, `/cisteni-strech/`, `/en` → patička s IČO, sídlem, zápisem v RŽP a odkazem na zásady (URL náhledu v hlášení).

Fáze B:
- [ ] Nejvýš 3 podoby hlavičky a 2 podoby patičky (test). `build-regions.mjs` nemá vlastní kopii hlavičky ani patičky: `git grep -n "<footer\|<header" -- scripts/build-regions.mjs` → prázdné, značkování vytváří jen `scripts/lib/layout.mjs`.
- [ ] Menu se na žádné šířce 320–1920 px (krok 10 px) nezalomí, hlavička je ≤ 96 px a stránka nemá vodorovný posun. Uveď počet otestovaných kombinací stránka × šířka.
- [ ] Mobilní menu funguje klávesnicí i s vypnutým JavaScriptem (test).
- [ ] Definice barevných proměnných s pevnou hodnotou mimo tokeny: `git grep -hoE -e "--(ink|navy[-a-z0-9]*|gold[-a-z0-9]*|lux-(gold[-a-z]*|navy|ink|sapphire)|copper[-a-z]*|cream|paper|mist|panel|line|muted[-a-z]*)[[:space:]]*:[[:space:]]*(#|rgb)" -- '*.html' '*.css' 'scripts/*.mjs' ':!assets/zaklad.css' ':!assets/hbot*' ':!ai-centrum/*' ':!rd-control-panel/*' | wc -l` → 0 (výchozí stav v kopii webu: 2 922 výskytů).
- [ ] Na všech typech stránek je stejné pozadí stránky, hlavičky a patičky a stejná barva výzvy k akci. U textu jsou nejvýš 2 rodiny písma (test).
- [ ] Písmo pod 12 px ve zdrojích:
  - `git grep -hoE "font(-size)?:[[:space:]]*([0-9]{3}[[:space:]]+)?([0-9]|1[01])(\.[0-9]+)?px" -- '*.html' '*.css' '*.js' ':!ai-centrum/*' ':!rd-control-panel/*' | wc -l` → 0. Výchozí stav v kopii webu je 73 výskytů v 10 souborech a k tomu 4 v souborech úkolu 01.
  - `git grep -hoE "font(-size)?:[[:space:]]*([0-9]{3}[[:space:]]+)?0?\.([0-6][0-9]*|7|7[0-4][0-9]*)r?em" -- '*.html' '*.css' '*.js' ':!ai-centrum/*' ':!rd-control-panel/*' | wc -l` → 0. Výchozí stav: 6 (`brand.css` 4×, `akce/index.html` 2×).
- [ ] e2e: 0 viditelných textů pod 12 px (včetně SVG) a `main p`/`main li` ≥ 14 px.
- [ ] Plovoucí prvky nezakrývají H1, úvodní odstavec, hlavní výzvu ani patičku (test na všech typech stránek a uvedených rozměrech).
- [ ] axe: 0 porušení v hlavičce a patičce. Celkový počet závažných porušení není vyšší než před úkolem.
- [ ] Lighthouse mobil (5 stránek): přístupnost 100, výkon nejvýš −2 body, CLS nezvýšené (tabulka před/po).
- [ ] `porovnani.html` existuje a hlášení uvádí stránky a šířky s největší změnou. Základ je v `testy/vizualni/zaklad/` a `node testy/vizualni.mjs --kontrola` → 0 odchylek.
- [ ] Balíček funguje dál: v `../hspg-balicek` `HSPG_MIRROR=<cesta k webHSPGH> CHROMIUM=… npm run test:e2e` → vše prošlo (asistent i bez AI).

## Ověření
```bash
# Fáze A
node scripts/build-layout.mjs --kontrola                # → OK: N stránek, 0 rozdílů
node --test testy/layout.test.mjs                       # → fail 0
node scripts/build-hbot.mjs --kontrola                  # → OK
git grep -l "HSPG:PATICKA:START" -- '*.html' | wc -l    # → N (všechny veřejné stránky)
git grep -L "09291881" -- '*.html' ':!ai-centrum/*' ':!rd-control-panel/*'                  # → prázdné
git grep -L "Ochrana osobních údajů\|Privacy policy" -- '*.html' ':!ai-centrum/*' ':!rd-control-panel/*'  # → prázdné
git grep -n "\[DOPLNIT" -- '*.html'                     # → prázdné
node scripts/build-layout.mjs --ukazka > .artefakty/ukol-08/komponenty.html && npx -y html-validate .artefakty/ukol-08/komponenty.html   # → 0 chyb
CHROMIUM=<cesta k Chromiu> node --test --test-concurrency=1 testy/layout.e2e.test.mjs   # → fail 0
node scripts/nasadit.mjs                                # → URL náhledu (zdarma)

# Fáze B (navíc)
git grep -hoE -e "--(ink|navy[-a-z0-9]*|gold[-a-z0-9]*|lux-(gold[-a-z]*|navy|ink|sapphire)|copper[-a-z]*|cream|paper|mist|panel|line|muted[-a-z]*)[[:space:]]*:[[:space:]]*(#|rgb)" -- '*.html' '*.css' 'scripts/*.mjs' ':!assets/zaklad.css' ':!assets/hbot*' ':!ai-centrum/*' ':!rd-control-panel/*' | wc -l   # → 0 (předtím 2 922)
git grep -hoE "font(-size)?:[[:space:]]*([0-9]{3}[[:space:]]+)?([0-9]|1[01])(\.[0-9]+)?px" -- '*.html' '*.css' '*.js' ':!ai-centrum/*' ':!rd-control-panel/*' | wc -l   # → 0 (předtím 73 + 4 z úkolu 01)
git grep -hoE "font(-size)?:[[:space:]]*([0-9]{3}[[:space:]]+)?0?\.([0-6][0-9]*|7|7[0-4][0-9]*)r?em" -- '*.html' '*.css' '*.js' ':!ai-centrum/*' ':!rd-control-panel/*' | wc -l   # → 0 (předtím 6)
node testy/vizualni.mjs --stav po && node testy/vizualni.mjs --porovnej   # → .artefakty/ukol-08/porovnani.html
node testy/vizualni.mjs --zaklad && node testy/vizualni.mjs --kontrola    # → 0 odchylek nad 0,5 %
npx -y lighthouse <náhled>/cenik --only-categories=performance,accessibility --form-factor=mobile --quiet --chrome-flags="--headless" --output=json --output-path=.artefakty/ukol-08/lh-cenik-po.json
(cd ../hspg-balicek && HSPG_MIRROR=<cesta k webHSPGH> CHROMIUM=<cesta> npm run test:e2e)   # → vše prošlo
```
Testy, které agent přidá:
- `testy/layout.test.mjs` (statické),
- `testy/layout.e2e.test.mjs` (Playwright, včetně axe-core),
- `testy/mereni-layout.mjs` (sdílené měření),
- `testy/vizualni.mjs` (snímky, porovnání, základ, kontrola),
- `testy/server-staticky.mjs`.

Nové devDependencies: `playwright`, `axe-core`, `pixelmatch`, `pngjs` (kromě těch, které web už má). Testy nesmí volat produkční `/api/*` ani odesílat formuláře.

## Bez AI / s AI
- Hlavička, patička a styly jsou statické HTML a CSS ve zdroji stránky, bez AI a bez závislosti na JavaScriptu. Fungují bez JS a nezpůsobují posun rozvržení.
- AI se úkol dotýká jen přes plovoucí tlačítko H-SPG CORE (úkol 01): nesmí zakrývat obsah ani patičku, jeho vzhled podle R4 se nemění.
- Asistent musí po změnách fungovat s AI i bez ní. Ověří to e2e testy balíčku nad webHSPGH (poslední kritérium).

## Nepřekročitelná pravidla
Viz `balicek/KONTEXT.md` §4 (pravdivost, tajemství, Git a dva agenti, kredity Netlify, formuláře, bez AI, rozsah, ověření, čeština). K tomu pro tento úkol:
- **Snímky „před“ vznikají dřív než první změna.** Bez nich se fáze A nepovažuje za hotovou.
- **Vygenerované HTML se ručně neupravuje.** Mění se data (`content/*.json`), komponenta nebo generátor a stránky se znovu vygenerují.
- **Žádná nová tvrzení.**
  - Patička obsahuje jen údaje z `content/firma.json`.
  - Záruka jen z centrálního zdroje (úkol 05), jinak vůbec.
  - Žádná hodnocení, pojištění ani technologie.
  - `[DOPLNIT …]` se nikdy nevypíše na web.
- **Mimo hlavičku a patičku se texty stránek nemění.** Mění se jen styly (tokeny, velikosti písma) a odstraňují se mrtvá pravidla.
- **R4 a R7:** vzhled AI tlačítka zůstává (grafit, zlatý lem `#C9A227`, tyrkysová záře). Antracit a cyan nepoužívat jinde. Interní stránky se nemění.
- **Žádné nové inline skripty, `on…=` atributy ani externí zdroje** (CSP, úkol 15). Písma zůstávají na vlastní doméně.
- **Selektory, na které se váže JavaScript, musí fungovat dál:** `souhlas.js` (`data-souhlas-nastaveni`), `kontakt.js` (`data-mail`), `hbot.js` (`#hspg-lista`), skripty homepage. Ověř testem nebo ručním klikem na náhledu a výsledek uveď.
- **Nasazování** jen přes `node scripts/nasadit.mjs`: náhled zdarma, produkce jen po schválení majitelem a v dávce.
- **Velké snímky necommituj.** `.artefakty/` patří do `.gitignore` a v repozitáři zůstává jen malý základ v `testy/vizualni/zaklad/`.

## Hlášení po dokončení
Formát z `KONTEXT.md` §5 (po fázi A i po fázi B) a k tomu:
- inventura generátorů a stránek (fáze A),
- tabulka **před → po**:
  - počet podob hlavičky a patičky,
  - počet různých pozadí stránek a zlatých odstínů,
  - rodiny písma,
  - definice barevných proměnných s pevnou hodnotou (2 922 → 0),
  - deklarace písma pod 12 px (73 v px + 4 z úkolu 01 + 6 v rem → 0) a viditelné texty pod 12 px na `/` a `/en`,
  - výška hlavičky na 320, 768, 1004 a 1920 px pro `/`, `/cenik`, `/cisteni-fasad/kolin/` a `/en`,
  - zalomené položky menu,
  - nalezené překryvy,
- počty stránek se splněnou identifikací (N/N) a s odkazy na zásady, reklamace a cookies,
- cesta k `porovnani.html`, 5 největších vizuálních změn (stránka @ šířka, % pixelů) s jednou větou proč,
- Lighthouse a axe před/po,
- URL náhledu,
- **čeká na majitele:** schválení vzhledu, potvrzení evidujícího úřadu RŽP (nebo `[DOPLNIT]`, pokud se nepodařilo ověřit), případné změny položek menu v `content/navigace.json`,
- změny v souborech úkolu 01 (velikosti písma v `hbot.js` a `hbot.css`) k převzetí do balíčku,
- návrhy mimo rozsah (např. obsah proužku akce, kanonický odkaz na Facebook → úkol 11, e-mail bez JS → úkol 03).
