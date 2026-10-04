# Úkol 05: Záruka 10 let z jednoho místa
> Priorita P1 · Závisí na: 00 (koordinace s 01 a 03 přes `content/firma.json`, viz krok 4) · Čeká na majitele: rozsah záruky, výluky a postup uplatnění (text od právníka, úkol 04B), schválení produkčního nasazení · Rozsah: jediný zdroj textu záruky (`content/firma.json` → `zaruka`), generátor, který text propíše do stránek, meta, JSON-LD, skriptů a H-BOTu, stránka `/zaruka` s potvrzenými fakty a testy, které hlídají shodné znění, podmínku a „žádných 15 let“. Dvě fáze (A, B), po fázi A hlášení.

## Proč (s důkazy)
Majitel potvrdil záruku H-STONE **10 let** (R1). Platí při technické kontrole alespoň jednou za 24 měsíců, v tarifu SENTINEL START je kontrola zdarma. Podle `KONTEXT.md` §2 smí být text záruky **jen na jednom centrálním místě (data)** a stránky ho mají přebírat. Údaj „15 let“ je zastaralý.

Audity (`audit-pravni_pravdivost` #1, `audit-seo` #3, `audit-obsah_konverze` #2, `audit-funkcnost_js` #2, `audit-ai_integrace` #1, `audit-nasazeni_provoz` #23) vznikly **před** potvrzením délky. Doporučovaly neutrální větu bez čísla, to už neplatí. Platí jejich technický závěr: text je roztroušený a pokaždé jinak formulovaný.

Inventura z kopie živého webu (4. 10. 2026) a GET dotazů na hspg.cz. Čísla řádků platí pro živý web, ve zdroji se mohou lišit:

| Kde | Co tam je | Jak vzniká |
|---|---|---|
| `/cisteni-fasad/<okres>/` (77 stránek) | FAQ „Jaká je záruka?“ → „Na impregnaci H-STONE poskytujeme záruku 10 let. Rozsah záruky je uvedený v písemné nabídce a předávacích dokumentech.“ Na všech 77 stránkách chybí podmínka kontroly. | `<html data-gen="build-regions">`, tedy šablona `scripts/build-regions.mjs` (ověř) |
| `/cisteni-strech/<okres>/`, `/cisteni-dlazby/<okres>/` (2× 77) | záruka není uvedená vůbec | stejná šablona |
| `/` meta description (ř. 13), `twitter:description` (ř. 42) | „…Vlastní impregnace H-STONE se zárukou 10 let…“, „…Impregnace H-STONE se zárukou 10 let…“ | ručně |
| `/` JSON-LD (ř. 45–47): `HomeAndConstructionBusiness.description`, Service „Fasáda komplet“, `VideoObject.description` | „…se zárukou 10 let…“ | ručně (ověř) |
| `/` FAQ „Jak dlouho vydrží impregnace H-STONE?“: viditelně (ř. 1730) i ve `FAQPage` (ř. 48) | „Deset let se zárukou. … Záruka platí při technické kontrole alespoň jednou za 24 měsíců — v tarifu SENTINEL START ji děláme zdarma.“ | ručně |
| `/` dlaždice a pruhy (ř. 1213, 1248, 1648) | „10 let · záruka dle podmínek nabídky“, „10 let · záruka na impregnaci H-STONE“, „10 let · ZÁRUKA NA VRSTVU“ | ručně |
| `/` text (ř. 1384, 1646, 1836) a patička (ř. 1878) | „se zárukou 10 let dle podmínek nabídky“, „Jedna chemie, jeden standard, záruka 10 let.“, „Proto na impregnaci dáváme záruku 10 let.“, „Hydrofobní impregnace H-STONE se zárukou 10 let.“ | ručně |
| `/` certifikát (`details.certifikat`, ř. 1653–1659) | „Garantovaný certifikát H-STONE · 10 let · co obsahuje a kdy platí“, „Záruka 10 let platí při technické kontrole…“, „Rozsah záruky uvádíme písemně v nabídce a na certifikátu…“ | ručně |
| `/` přepis spotu (`#spot-prepis`, ř. 1285) | „H-STONE, záruka 10 let: …“ (text, který běží ve videu) | ručně, odpovídá videu |
| `/akce/` meta, `og:` a `twitter:description` (ř. 7, 17, 24) | „…bez lešení, záruka 10 let.“ (154 znaků) | ručně |
| `/akce/` ř. 86, 88 | „se zárukou 10 let“, odznak „✓ Záruka 10 let“ | ručně |
| `/cenik.html` ř. 210 | „…impregnace H-STONE se zárukou 10 let.“ | ručně |
| `/cenik.html` blok `<!-- SENTINEL:START -->` (ř. 325, 328) | PREMIUM „…a nová záruka 10 let“. Pod tarify `podminka_zaruky`: „Záruka 10 let na impregnaci H-STONE platí při technické kontrole alespoň jednou za 24 měsíců — v tarifu START ji děláme zdarma.“ | build z `content/sentinel.json` |
| `/en.html` JSON-LD (ř. 35) a text (ř. 145) | „with a 10-year warranty“, „carries a 10-year warranty (subject to the offer terms)“ | ručně |
| `/kalkulacka-svj.html` ř. 266, 273 | „Celkem · záruka 10 let“, „a dům je chráněný dalších 10 let“ | ručně |
| `/nabidka-svj.html` ř. 167 | „10 let · záruka na impregnaci H-STONE podle podmínek konkrétní písemné nabídky“ | ručně |
| `/pas-domu.html` ř. 198 (ukázkový pas, založen 22. 8. 2026) | „10 let · ZÁRUKA DO 8/2036“ | ručně |
| `/ochrana-osobnich-udaju.html` ř. 95 | „…po dobu záruky (10 let)…“ | ručně, text zásad patří úkolu 09 |
| `/cisteni-fasad/` ř. 18, 20 a `/cisteni-strech/` ř. 6 (rozcestníky bez `data-gen`) | „se zárukou 10 let“, „Rozsah záruky je vždy v písemných podmínkách.“, „Rozsah záruky uvádíme v nabídce a předávacích dokumentech.“ | ručně |
| `/assets/hbot.js` ř. 29 (H-BOT na 243 stránkách) | „Deset let se zárukou. …“ | ručně, nahrazuje úkol 01 |
| `/assets/svj-podklad.js` ř. 68, 95 (tiskový podklad pro SVJ z `/kalkulacka-svj.html`) | „Celkem · záruka 10 let“, „Impregnace H-STONE se zárukou 10 let.“ + `HSPG_SENTINEL.podminka_zaruky`, takže „10 let“ je v podkladu dvakrát za sebou | ručně |
| `/assets/nabidka-pdf.js` ř. 166 (PDF nabídka na `/akce/dekujeme/`, jen na živém webu, v kopii chybí) | „Impregnace H-STONE se zárukou 10 let.“ + `podminka_zaruky` | ručně |
| `/assets/og.png` (`og:image` všech 247 stránek, 1200×630) | štítek „Záruka 10 let“ vypálený v obrázku | obrázek |

Souhrn: 87 HTML souborů (86 s „10 let“ a `/en.html` s „10-year“), 113 shod regexu auditu (několik z nich záruka není, např. „DESET LET V JEDNOM POSUVNÍKU“), 3 ručně psané skripty, `ceny.js` a `og.png`.

Problémy:
- **Formulace:** aspoň 9 různých znění. Podmínka kontroly existuje ve 3 variantách: „— v tarifu SENTINEL START…“ (`/`, `hbot.js`), „— v tarifu START…“ (`/cenik.html`, `ceny.js`) a „– v tarifu SENTINEL START…“ (`firma.json` v balíčku).
- **Chybějící podmínka:** na 77 okresních stránkách, v meta popisech a na odznacích chybí podmínka kontroly i odkaz na ni. Zamlčet podstatnou podmínku je riziko klamavého opomenutí (zákon o ochraně spotřebitele, dozor ČOI).
- **Chybějící podmínky záruky:** `/zaruka` ani `/zarucni-podminky` neexistují (GET → 404) a `/reklamace.html` vrací 404.
- **Zdroj je jen napůl centrální:** `content/sentinel.json` (`podminka_zaruky` → `assets/ceny.js` → `HSPG_SENTINEL`) a `content/firma.json` → `zaruka` (balíček, H-BOT a AI přes `netlify/lib/ai/znalosti.mjs`). Nic dalšího z nich nečte.
- **Pracnost změny:** dnes by změna znamenala ruční úpravu přes 90 souborů.

Vzor, jak to udělat, už web má. `data-cena` je na 240 stránkách s vepsanou hodnotou, přitom `ceny.js` načítají v kopii jen 3 stránky (`/`, `/kalkulacka-svj.html`, `/en.html`; na živém webu navíc `/akce/dekujeme/`). Hodnoty tedy nejspíš vpisuje build (ověř v `build-ceny.mjs`). `/cenik.html` má generovaný blok `<!-- SENTINEL:START … -->`.

## Cíl (měřitelný)
1. **Jeden zdroj:** text záruky (cs i en) je jen v `content/firma.json` → `zaruka`. `content/sentinel.json` nemá `podminka_zaruky` a `git grep -n podminka_zaruky` nic nenajde.
2. **Vše generované:** každá zmínka o délce záruky v publikovaném výstupu pochází ze zdroje. Cesty jsou čtyři:
   - prvky `data-zaruka` (vyplní `scripts/build-zaruka.mjs`),
   - šablona `build-regions`,
   - `window.HSPG_ZARUKA` v `ceny.js` (pro JS),
   - `assets/hbot-znalosti.json` (H-BOT).

   Meta, OG, Twitter a JSON-LD obsahují jen přesné znění forem ze zdroje a generátor je při změně přepíše. Test najde **0** čísel let u slova záruka mimo tato místa. Výjimky jsou jen ty vyjmenované, každá se zdůvodněním a kontrolou čísla.
3. **Podmínka všude:** každá zmínka má buď podmínku kontroly 1× za 24 měsíců, nebo je odkazem na `/zaruka`, případně je v bloku, který podmínku obsahuje. Stránka `/zaruka` existuje a uvádí jen potvrzená fakta.
4. **Nikde „15 let“:** 0 výskytů „15 let“, „patnáct let“ ani „15-year“ v repozitáři webu (mimo `node_modules`, `tests/` a `CLAUDE.md`). V `tests/` smí „15 let“ být jen jako vstup testu detektoru a v `CLAUDE.md` jen v pravidle „nikde 15 let“.
5. **Změna na jednom místě:** změna v `firma.json` se po buildu propíše všude, kromě vyjmenovaných výjimek. Test se simulovanou změnou to ověří a výjimky vypíše jako seznam míst k ruční úpravě.

## Rozsah (ANO / NE výslovně)
**ANO:**
- data a skripty: `content/firma.json` → `zaruka`, `scripts/lib/zaruka.mjs`, `scripts/build-zaruka.mjs`, úprava `build-ceny.mjs` (blok SENTINEL, `HSPG_ZARUKA`) a šablony FAQ v `build-regions.mjs`, odebrání `podminka_zaruky` ze `content/sentinel.json`,
- všechny výskyty z tabulky výše: texty, meta, OG, Twitter, JSON-LD a skripty `svj-podklad.js` a `nabidka-pdf.js`,
- věta záruky na `/reklamace/`, pokud ji tam už vložil úkol 04 (jen převedení na `data-zaruka`, znění se nemění),
- H-BOT: odkaz na podmínky a přegenerování znalostí,
- nová stránka `/zaruka` a její záznam v sitemapě,
- testy a krátká sekce v `CLAUDE.md`.

**NE (patří jinam):**
- **Délku záruky ani její rozsah neměň a nic nedomýšlej.** Platí jen to, co je v `KONTEXT.md` §2. Rozsah, výluky, náhradní plnění, postup reklamace a vztah k zákonným právům z vadného plnění dodá právník (**úkol 04B**). Do té doby jsou jen v datech jako `[DOPLNIT]` a na web se nedostanou.
- Stránka `/reklamace`, formulář a reklamační řád → **úkol 04**. `/zaruka` na ni jen odkáže, pokud v `main` existuje.
- Text zásad ochrany osobních údajů včetně „(10 let)“ v čl. 4 → **úkol 09**. Tady jen výjimka v testu.
- Struktura JSON-LD, délky a znění ostatních částí meta popisů („bez lešení“ atd.), nový OG obrázek → **úkol 11**. Měníš jen část o záruce.
- Jednotná podoba URL (`/x` vs. `/x.html`), canonical a generovaná sitemapa → **úkol 06**. Jednotná hlavička a patička → **úkol 08**.
- Formulace „Garantovaný certifikát“, stav a název tarifu SENTINEL a ostatní tvrzení → **úkol 13**.
- Krajské huby → **úkol 12** (šablona hubu použije knihovnu z tohoto úkolu).
- Výměna H-BOTu → **úkol 01**. Spot (video) se nemění, jeho text čeká na majitele.
- Záruka na okresních stránkách střech a dlažeb se nepřidává (žádný nový obsah).

## Postup

### Fáze A – jeden zdroj, generátor, stránka `/zaruka`, generované stránky a skripty
1. Větev `ukol-05-zaruka-centralne` z aktuální `main` (pravidla v `CLAUDE.md` z úkolu 00). Balíček stáhni mimo webHSPGH: `git clone --depth 1 -b claude/peaceful-johnson-juqa6w https://github.com/mhorvathova820-max/HSPG-WEB ../hspg-balicek` (nebo `git -C ../hspg-balicek pull`).
2. Najdi v repozitáři soubory, které generují stránky, ceník a texty se zárukou:
   - publikační adresář a build příkaz (`netlify.toml` → `[build] publish` / `command`, `package.json`). Zjisti, zda se vygenerované HTML commituje (značky „Neupravovat ručně“ tomu nasvědčují),
   - `scripts/build-regions.mjs`, který podle `<html data-gen="build-regions">` generuje 232 stránek: kde je šablona FAQ fasád,
   - `scripts/build-ceny.mjs`: **jak vpisuje `data-cena`** do ručně psaných stránek (přepis na místě regexem nebo parserem?) a jak generuje blok `SENTINEL` a `assets/ceny.js`. Stejný přístup použiješ pro `data-zaruka`,
   - ostatní `scripts/build-*.mjs` (`build-references`, `build-recenze`, `build-hbot` a `build-kontakty`, pokud už proběhly úkoly 01 a 03) a jejich pořadí v build příkazu,
   - zdroj sitemapy (soubor, nebo generátor z úkolu 06), stránku 404, existující testy (`tests/`?) a zda je v `devDependencies` `playwright`.
3. Inventura: `git grep -nIiE "záruk|zaruk|warrant|garan[ct]|(10|15|deset|patnáct)([[:space:]]|&nbsp;)+(let|years?)|(10|15)-year|podminka_zaruky|HSPG_SENTINEL" -- . ':!node_modules'`. Výsledek (soubor, řádek, typ: text / meta / JSON-LD / JS / data) dej do hlášení a porovnej s tabulkou v části Proč. Co chybí, doplň. Pokud už je v `main` úkol 04, najdeš i `/reklamace/` s větou záruky z `firma.json` (`veta` + `podminka`); patří do kroku 13. Pokud se „15 let“ najde mimo web (dokumentace, poznámky) a jde o záruku, oprav ho na 10 let. Jinak ho uveď v hlášení.
4. `content/firma.json`:
   - Pokud v `main` už je (úkol 01 nebo 03), uprav **jen** klíč `zaruka`.
   - Pokud tam není, převezmi celý soubor z `../hspg-balicek/balicek/web/content/firma.json`, ostatní klíče nech beze změny a zapiš to do hlášení kvůli slučování s 01 a 03.
   - Nový obsah klíče (nezlomitelné mezery podle `KONTEXT.md` §4 bod 9 jako ` ` v českých formách `veta`, `podminka`, `rozsah`, `kratce`, `s_podminkou`, `delka`, `popisek` a `odkaz_text`; v `en` jen mezi číslem a jednotkou. `potvrzeno_kdy` a `nahradni_veta` ponech, jak jsou):
   ```json
   "zaruka": {
     "_poznamka": "JEDINÝ zdroj textu záruky pro web, H-BOT i AI. Do stránek ho propisují scripts/build-zaruka.mjs, build-ceny.mjs a build-regions.mjs. Měnit jen po písemném rozhodnutí majitele, pak spustit build a testy.",
     "potvrzeno": true,
     "potvrzeno_kdy": "…ponech stávající hodnotu…",
     "delka_let": 10,
     "veta": "Na impregnaci H-STONE je záruka 10 let.",
     "podminka": "Záruka platí při technické kontrole alespoň jednou za 24 měsíců – v tarifu SENTINEL START ji děláme zdarma.",
     "rozsah": "Rozsah záruky je uvedený v písemné nabídce a předávacích dokumentech.",
     "kratce": "Záruka 10 let",
     "s_podminkou": "záruka 10 let při kontrole 1× za 24 měsíců",
     "delka": "10 let",
     "popisek": "záruka na impregnaci H-STONE",
     "odkaz": "/zaruka",
     "odkaz_text": "Podmínky záruky",
     "nahradni_veta": "…ponech stávající hodnotu…",
     "en": {
       "veta": "The H-STONE impregnation comes with a 10-year warranty.",
       "podminka": "The warranty applies provided a technical inspection takes place at least once every 24 months – free of charge in the SENTINEL START plan.",
       "rozsah": "The scope of the warranty is set out in the written offer and the handover documents.",
       "kratce": "10-year warranty",
       "s_podminkou": "10-year warranty subject to an inspection every 24 months",
       "delka": "10 years",
       "popisek": "warranty on the H-STONE impregnation",
       "odkaz_text": "Warranty terms (in Czech)"
     },
     "podminky": {
       "schvaleno": false,
       "_DOPLNIT": "Text od právníka (úkol 04B): na co se záruka vztahuje, na co ne, postup uplatnění, vztah k zákonným právům z vadného plnění. Dokud schvaleno=false, build tyto části nevypisuje.",
       "kryje": [],
       "nekryje": [],
       "uplatneni": [],
       "zakonna_prava": ""
     }
   }
   ```
   Žádný z textů nepřidává nové tvrzení. Jde o přeformulování faktů z `KONTEXT.md` §2 a věty, kterou web už uvádí na 77 stránkách. Text o SENTINEL START zůstává, protože je součástí potvrzené podmínky. Kdyby ho úkol 13 přejmenoval, změní se jen tady.

   Pokud je převzatý asistent (úkol 01), spusť `node scripts/build-hbot.mjs` a pak `node scripts/build-hbot.mjs --kontrola` (musí projít, `hbot-znalosti.json` se mění kvůli nezlomitelným mezerám).
5. `scripts/lib/zaruka.mjs` (bez závislostí):
   - `nactiZaruku()`: načte `content/firma.json` a ověří data. **Vyhodí chybu**, když:
     - `potvrzeno !== true` nebo chybí `delka_let`,
     - některá forma s číslem (`veta`, `kratce`, `s_podminkou`, `delka`, cs i en) nemá shodu detektoru `CISLO_LET` (níže),
     - některý text cs nebo en (formy i `nahradni_veta`) má shodu `CISLO_LET` s jiným číslem než `delka_let`, tedy i „15 let“.

     Slovní čísla převáděj („deset“ = 10, „patnáct“ = 15). Formy bez čísla (`podminka`, `rozsah`, `popisek`, `odkaz_text`) číslo obsahovat nemusí. Web se tak nesestaví s nepotvrzenou nebo rozpornou délkou.
   - `formy(jazyk)`: `{veta, podminka, plne, rozsah, kratce, s_podminkou, delka, popisek, odkaz_text, odkaz}`, kde `plne = veta + " " + podminka`. Pro en se použijí texty z `en`, `odkaz` je společný.
   - `zarukaProProhlizec()`: objekt `{cs: formy("cs"), en: formy("en")}` pro `ceny.js`.
   - `DLOUHE_FORMY = ["plne", "veta", "podminka", "rozsah", "s_podminkou"]`.
   - Detektor sdílený generátorem i testy:
     `CISLO_LET = /(?<![\p{L}\p{N}])(\d{1,2}|deset|patnáct)(?:\s|&nbsp;| )+(?:let|roků|years?)(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])\d{1,2}-year(?![\p{L}\p{N}])/giu`.
     Shoda je „záruční“, když je do 80 znaků před ní nebo za ní `/záruk|zaruk|warrant|garan[ct]|guarantee/i`. „Po 10 letech“ tím pádem nevadí.
     U HTML měř okno v textu, kde je každá značka nahrazená mezerou (hodnoty atributů `content`, `alt`, `title` a `aria-label` a obsah `<script>` zůstávají). V surovém HTML by okno 80 znaků minulo 2 dnešní zmínky na `/`: dlaždici ř. 1248 („10 let“ a „záruka na impregnaci“ dělí dlouhý atribut `style`) a certifikát ř. 1653 („Garantovaný certifikát … 10 let“). Ověřeno nad kopií 4. 10.: takto detektor najde 115 shod v 90 souborech a nezachytí posuvník „DESET LET V JEDNOM POSUVNÍKU“ ani „Do 3 let / 3–8 let“ v kalkulačce na `/`.
6. `scripts/build-zaruka.mjs` přepisuje na místě, stejně jako `build-ceny` u `data-cena`. Projde HTML v publikačním adresáři kromě interních `rd-control-panel/` a `ai-centrum/` a jazyk bere z `<html lang>`:
   - **Prvky `data-zaruka="klíč"`:** obsah = forma (prostý text, HTML-escapovaný). U `<a data-zaruka=…>` nastaví také `href` na `zaruka.odkaz`. Neznámý klíč = chyba.
   - **Blok `<!-- ZARUKA:START -->…<!-- ZARUKA:END -->`:** jen v `zaruka.html`, obsah stránky podmínek z dat (krok 7). Do značek nepiš cesty ani interní poznámky (audit-seo #18).
   - **Atributy a JSON-LD:** v `content` u `meta[name=description]`, `meta[property=og:description]`, `meta[name=twitter:description]` a v blocích `application/ld+json` nahradí znění dlouhých forem uložené v `content/zaruka-vlozeno.json` aktuálním zněním (cs i en, nejdelší forma první). Pak zapíše aktuální znění do `content/zaruka-vlozeno.json`. Při prvním běhu soubor vytvoří a nic nenahrazuje. Po náhradě musí každý JSON-LD projít `JSON.parse`, jinak skončí chybou.
   - **`--kontrola`:** nic nezapíše, vypíše soubory, které by se změnily, a skončí kódem 1, pokud nějaké jsou.

   Měň jen dotčené prvky a řetězce, žádné přeformátování. Do build příkazu ho zařaď za `build-regions` a `build-ceny`, před `build-hbot`. Vygenerovaný výstup commitni, pokud se HTML commituje.
7. Stránka `/zaruka`:
   - Soubor podle konvence webu, tedy `zaruka.html` vedle `cenik.html`, odkazy `/zaruka`.
   - Hlavička, patička a skripty (`kontakt.js`, `souhlas.js`, `hbot.js` s `defer`) převezmi z `cenik.html` beze změny vzhledu (sjednocení je úkol 08).
   - `<title>Záruka na impregnaci H-STONE | HOLUB</title>`.
   - Meta description: „Impregnace H-STONE: {s_podminkou}. {rozsah}“. Vlož ji jako text dlouhých forem, aby ji generátor udržoval.
   - Canonical, `og:url` a sitemap podle konvence z úkolu 06. Pokud ještě neproběhl, udělej to stejně jako u `cenik.html` a zapiš do předávky pro 06. Stránka je indexovatelná.
   - Obsah bloku `ZARUKA`, který generuje `build-zaruka.mjs`:
   ```html
   <h1>Záruka na impregnaci H-STONE</h1>
   <p><strong data-zaruka="veta">…</strong></p>
   <h2>Podmínka platnosti</h2>
   <p data-zaruka="podminka">…</p>
   <p>Co obsahují tarify péče: <a href="/cenik#sentinel">SENTINEL</a>.</p>
   <h2>Rozsah záruky</h2>
   <p data-zaruka="rozsah">…</p>
   <h2>Jak záruku uplatnit</h2>
   <p>Zavolejte na <a href="tel:+420736618486">+420&nbsp;736&nbsp;618&nbsp;486</a> (Po–So 7:00–19:00).</p>
   ```
   - Telefon a pracovní dobu ber z `firma.json` (`telefon`, `telefon_zobrazeni`, `pracovni_doba`). Odstavec „Jak záruku uplatnit“ obsahuje jen tuto větu s kontakty (a odkazy z dalšího bodu). Nic nedopisuj o postupu, lhůtách, prohlídce ani dokladech: postup dodá právník (úkol 04B).
   - Pokud v `main` existuje `/reklamace` (úkol 04A), přidej odkaz na ni. Pokud proběhl úkol 03, přidej e-mail přes `a[data-kontakt="reklamace"]`. Jinak jen telefon a předávka pro 04.
   - Při `podminky.schvaleno === true` vloží generátor navíc sekce „Na co se záruka vztahuje“, „Na co se nevztahuje“, „Postup uplatnění“ a „Záruka a zákonná práva“ ze seznamů v datech. Do té doby se nevypíšou.
   - V `zaruka.html` ani v žádném souboru, který tento úkol mění, nesmí být `[DOPLNIT` (test). Výskyty z jiných úkolů jen uveď v hlášení.
8. `build-ceny.mjs` a `content/sentinel.json`:
   - ze `sentinel.json` odeber `podminka_zaruky`,
   - `build-ceny.mjs` importuje knihovnu a do `assets/ceny.js` přidá `g.HSPG_ZARUKA = zarukaProProhlizec()`; `HSPG_SENTINEL` zůstane bez `podminka_zaruky`,
   - odstavec `tarif__podminka` v bloku `SENTINEL` generuj jako `<span data-zaruka="plne">…</span> <a href="/zaruka" data-zaruka="odkaz_text">Podmínky záruky</a>`,
   - text PREMIUM „…a nová záruka 10 let“ v `sentinel.json` **nech**: je to obchodní podmínka tarifu a čte ji i AI (`znalosti.mjs`) bez šablon. Test ho vede jako výjimku a kontroluje číslo,
   - `git grep -n "podminka_zaruky\|HSPG_SENTINEL"`: každého dalšího spotřebitele přepni na `HSPG_ZARUKA`.
9. `build-regions.mjs`: FAQ „Jaká je záruka?“ v šabloně fasád generuj z knihovny jako `<span data-zaruka="plne">…</span> <span data-zaruka="rozsah">…</span> <a href="/zaruka" data-zaruka="odkaz_text">Podmínky záruky</a>`. Šablon střech a dlažeb se nedotýkej. Přegeneruj 232 stránek a zkontroluj diff: změnit se smí jen odpověď FAQ na 77 stránkách fasád.
10. Skripty: `assets/svj-podklad.js` (ř. 68, 95) a `assets/nabidka-pdf.js` (ř. 166). Obě stránky načítají `ceny.js`.
    - Objekt záruky: `var Z = window.HSPG_ZARUKA && window.HSPG_ZARUKA[document.documentElement.lang === 'en' ? 'en' : 'cs']`.
    - Řádek souhrnu: `'Celkem' + (Z ? ' · ' + Z.kratce : '')`.
    - Odstavec záruky: tučně `Z.veta`, pak `' ' + Z.podminka + ' ' + Z.odkaz_text + ': hspg.cz' + Z.odkaz`.
    - Bez `Z` použij stávající záložní větu „Podmínky záruky uvádíme v nabídce.“ (bez čísla).
    - V JS nesmí zůstat žádný literál s délkou záruky ani `podminka_zaruky`.
11. Testy fáze A: `tests/zaruka.test.mjs` (Node test runner, bez závislostí; pokud web má jinou testovací strukturu, drž se jí). Obsah viz Ověření.
12. **Hlášení fáze A** (KONTEXT §5) a commit. Pokračuj fází B ve stejné větvi.

> Pokud fázi B v tomto sezení nestihneš, podej hlášení po fázi A. Fáze A se smí sloučit do `main` samostatně, po ověření a na náhledu.

### Fáze B – ručně psané stránky, meta, JSON-LD, H-BOT
13. Ručně psané stránky. Číslo délky smí být jen uvnitř prvku `data-zaruka`. Vlastní věty se zárukou nahraď formou a okolní větu uprav tak, aby se dobře četla, **bez nových tvrzení**.

    | Typ místa | Forma | Podmínka / odkaz |
    |---|---|---|
    | věta v textu | `veta` + `podminka`, nebo `plne` | případně `a[data-zaruka="odkaz_text"]` |
    | text v řádku nebo seznamu | `s_podminkou` | podmínka je součástí formy |
    | odznak, štítek | `kratce` **jako odkaz** `<a href="/zaruka" data-zaruka="kratce">` | odkaz |
    | dlaždice s velkým číslem | `delka` + `popisek` | dlaždice je odkazem na `/zaruka`, nebo je to blok `data-zaruka-blok` s podmínkou či odkazem |
    | věta o rozsahu („Rozsah záruky…“) | `rozsah` | – |
    | FAQ viditelně | `veta` … `podminka` + odkaz | odkaz |

    Konkrétně:
    - **`/`:**
      - hero dlaždice ř. 1213, pruh ř. 1248 a dlaždice ř. 1648 (`delka` + `popisek`, odkaz),
      - ř. 1384 a 1646 (`s_podminkou`), ř. 1836 a patička ř. 1878 (`veta` + odkaz),
      - certifikát: `<details class="certifikat" data-zaruka-blok>`; v `summary` jen `delka`, v těle `plne` a `rozsah` a odkaz. Slovo „Garantovaný“ neměň, posoudí ho úkol 13,
      - FAQ ř. 1730: `<span data-zaruka="veta">` + „Hydrofobní vrstva odpuzuje vodu, takže mech a řasy nemají z čeho žít.“ + `<span data-zaruka="podminka">` + odkaz. Je to stejná odpověď jako v H-BOTu.
    - **`/akce/`:** ř. 86 `s_podminkou`, ř. 88 odznak `kratce` jako odkaz.
    - **`/cenik.html`:** ř. 210 `s_podminkou` + odkaz.
    - **`/en.html`:** ř. 145 `veta` + `podminka` (en) + odkaz s textem `odkaz_text` (en) na `/zaruka`.
    - **`/kalkulacka-svj.html`:** ř. 266 „Celkem · “ + `kratce`, ř. 273 „…a dům je chráněný dalších 10 let“ → „… % – “ + `veta` + odkaz. Tvrzení o ochraně domu zmizí.
    - **`/nabidka-svj.html`:** ř. 167 dlaždice `delka` + `popisek`, odkaz.
    - **`/pas-domu.html`:** ukázka ř. 198 → `delka`. Celou ukázku `#ukazkovy-pas` označ `data-zaruka-blok` a na její konec (uvnitř bloku) přidej odkaz `data-zaruka="odkaz_text"`. Datum „ZÁRUKA DO 8/2036“ v ukázce zůstává, test hlídá rok 2026 + `delka_let`. Skutečný pas (`p.zaruka.do` z API) je údaj konkrétní zakázky a nemění se.
    - **Rozcestníky `/cisteni-fasad/` (ř. 18, 20) a `/cisteni-strech/` (ř. 6):** `s_podminkou` + odkaz, věty o rozsahu → `rozsah`.
    - **`/reklamace/` (jen pokud je v `main` úkol 04):** větu záruky (`firma.zaruka.veta` + `podminka`) převeď na `<span data-zaruka="veta">` + `<span data-zaruka="podminka">`. Znění se nemění, takže testy úkolu 04 (doslovná shoda s `firma.json`) musí dál projít. Větu „Záruka je navíc k vašim zákonným právům…“ neměň. Pokud stránku generuje skript úkolu 04, napoj ho na knihovnu a výstup přegeneruj.

    Spusť `node scripts/build-zaruka.mjs`.
14. Meta, OG, Twitter a JSON-LD. Do textu vlož přesné znění forem (generátor je pak udržuje, krok 6):
    - **meta, OG, Twitter:** zmínka o záruce = `s_podminkou`. Pokud by popis přesáhl 160 znaků, záruku z popisu vypusť a jinak text neměň (úkol 11).
      Spočítáno 4. 10.:
      - `/` description: s formou by měl kolem 171 znaků (> 160) → vypusť celou větu „Vlastní impregnace H-STONE se zárukou 10 let.“, výsledek má 99 znaků,
      - `/` `twitter:description` „Čištění a trvalá ochrana povrchů bez lešení. Impregnace H-STONE: {s_podminkou}. Cena do 24 hodin.“ = 126 znaků → ponechat,
      - `/akce/` 3× (description, `og:`, `twitter:`): s formou 183 znaků → vypusť jen „, záruka 10 let“, výsledek má 139 znaků.
    - **JSON-LD `description`** (`/` ř. 45–47, `/en.html` ř. 35): záruka jen jako `s_podminkou` (en: forma en), např. „…hydrofobní impregnace H-STONE – bez lešení; {s_podminkou}.“ Strukturu JSON-LD neměň.
    - **`FAQPage` na `/` (ř. 48):** `acceptedAnswer.text` = přesně viditelný text odpovědi z kroku 13 bez textu odkazu.
    - Pokud JSON-LD generuje skript (ověř v kroku 2), napoj ho na knihovnu místo ruční úpravy.
15. H-BOT:
    - **Úkol 01 je v `main`:** v `content/hbot-faq.json` přidej k otázce „Jak dlouho vydrží impregnace H-STONE?“ `"link": ["/zaruka", "Podmínky záruky"]` (test ověří shodu s `zaruka.odkaz` a `odkaz_text`). Spusť `node scripts/build-hbot.mjs` a pak `--kontrola`. Kód balíčku (`netlify/lib/ai/*`) neměň.
    - **Úkol 01 ještě není v `main`:** ve starém `assets/hbot.js` ř. 29 nahraď text odpovědi přesně řetězcem `veta + " Hydrofobní vrstva odpuzuje vodu, takže mech a řasy nemají z čeho žít. " + podminka`. Test ho vede jako dočasnou výjimku s kontrolou přesné shody. Po sloučení 01 výjimku smaž.

    V obou případech předávka pro 01: `hbot-znalosti.json` generovat z `firma.json` ve webHSPGH, ne z balíčku.
16. Výjimky. Seznam `VYJIMKY` v testu (soubor, podřetězec, důvod, kontrola `cislo` = číslo musí být `delka_let`, nebo `presne`). Očekávané položky:
    - PREMIUM „nová záruka 10 let“: `content/sentinel.json`, blok SENTINEL v `/cenik.html` a `assets/ceny.js` (`cislo`),
    - `/ochrana-osobnich-udaju.html` „(10 let)“ (`cislo`, text mění úkol 09),
    - přepis spotu na `/` „H-STONE, záruka 10 let:“ (`cislo`; musí odpovídat videu, text spotu čeká na majitele),
    - dočasně `assets/hbot.js` (`presne`, jen bez úkolu 01),
    - případně nadpis „DESET LET V JEDNOM POSUVNÍKU“, pokud ho detektor zachytí (záruka to není).

    Obrázek `og.png` test neskenuje. Patří do předávky pro 11.

    Každou další výjimku zdůvodni v hlášení. Výjimka nesmí sloužit k obejití pravidla.
17. Do `CLAUDE.md` přidej krátkou sekci „Záruka“:
    - jediný zdroj `content/firma.json` → `zaruka`, měnit jen po písemném rozhodnutí majitele,
    - po změně spusť build a `node --test tests/zaruka.test.mjs`,
    - ručně se upravují jen výjimky z testu (vypíše je simulace změny),
    - nikde „15 let“.
18. E2E testy, simulace změny (viz Ověření), Lighthouse `/zaruka` na náhledu, náhledové nasazení (`node scripts/nasadit.mjs`, 0 kreditů) a ověření na náhledu. Produkce jen po schválení majitelem, v dávce s dalšími úkoly.

## Akceptační kritéria
Fáze A:
- [ ] `node scripts/build-zaruka.mjs --kontrola` → kód 0. V dočasné kopii s `potvrzeno: false`, s `delka_let: 12` bez úpravy textů nebo s „15 let“ v textu → kód 1 s hláškou (test).
- [ ] `git grep -n podminka_zaruky` → nic. `content/sentinel.json` je platný JSON bez tohoto klíče.
- [ ] `assets/ceny.js` obsahuje `HSPG_ZARUKA` hluboce shodné s `zarukaProProhlizec()` (test v `vm` sandboxu).
- [ ] 77 stránek `/cisteni-fasad/<okres>/`:
  - odpověď na „Jaká je záruka?“ má právě 1 unikátní znění,
  - obsahuje `veta`, `podminka`, `rozsah` a `a[href="/zaruka"]`,
  - ve 154 stránkách střech a dlažeb je 0 zmínek o záruce (test).
- [ ] V `assets/*.js` kromě `ceny.js`: 0 záručních shod detektoru, 0× `podminka_zaruky`. `svj-podklad.js` a `nabidka-pdf.js` čtou `HSPG_ZARUKA` (test).
- [ ] `zaruka.html`:
  - 1× `<h1>`, `title`, meta description s `s_podminkou`, canonical, `og:image`,
  - obsahuje `veta`, `podminka` a `rozsah`,
  - je v sitemapě,
  - `grep -rIl "\[DOPLNIT" "$PUB"` → nic.
- [ ] Data v `firma.json` → `zaruka` (test):
  - texty obsahují `delka_let`,
  - po jednopísmenných předložkách a spojkách ani mezi číslem a jednotkou není obyčejná mezera,
  - všechny klíče cs mají protějšek v `en` (kromě `odkaz`, `delka_let`, `podminky`, `nahradni_veta`, `potvrzeno*`).
- [ ] 0× „15 let“, „patnáct let“ a „15-year“ v repozitáři (mimo `node_modules`): příkaz v Ověření.
- [ ] Pokud je převzatý úkol 01: `node scripts/build-hbot.mjs --kontrola` projde. Původní testy webu projdou.

Fáze B:
- [ ] Úplný průchod publikovaného výstupu (HTML včetně inline skriptů, meta a JSON-LD, `assets/*.js`, `content/*.json`): 0 záručních shod detektoru mimo prvky `data-zaruka`, mimo přesné dlouhé formy a mimo `VYJIMKY`. Výjimky projdou svou kontrolou (`cislo`, `presne`). Test vypíše seznam výjimek. Z průchodu se vynechávají:
  - zdroj `content/firma.json` a záznam `content/zaruka-vlozeno.json`,
  - vložený objekt `HSPG_ZARUKA` v `assets/ceny.js` (kontroluje se zvlášť shodou s knihovnou),
  - `assets/hbot-znalosti.json` (kontroluje se shodou s `build-hbot.mjs --kontrola`).
- [ ] Staré formulace jsou pryč (0 výskytů ve výstupu): „Deset let se zárukou“, „poskytujeme záruku“, „dáváme záruku“, „chráněný dalších“, „dle podmínek nabídky“, „ZÁRUKA NA VRSTVU“, „subject to the offer terms“, „se zárukou 10 let“.
- [ ] Každý `description`, `og:description` a `twitter:description` se zmínkou o záruce obsahuje `s_podminkou` (en: forma en) a má nejvýš 160 znaků (test).
- [ ] Každý JSON-LD projde `JSON.parse`. Řetězce se záruční shodou obsahují `s_podminkou` nebo `veta` a `podminka`.
- [ ] E2E: `FAQPage` odpověď na „Jak dlouho vydrží impregnace H-STONE?“ se po normalizaci mezer rovná viditelné odpovědi a s H-BOTem se shoduje ve `veta` i `podminka`.
- [ ] E2E (Chromium, lokální server, stránky `/`, `/akce/`, `/cenik.html`, `/en.html`, `/kalkulacka-svj.html`, `/nabidka-svj.html`, `/pas-domu.html`, `/cisteni-fasad/`, `/cisteni-strech/`, `/cisteni-fasad/kolin/`, `/zaruka.html`):
  - text každého `[data-zaruka]` = forma pro `<html lang>`,
  - každý `[data-zaruka="kratce"]` a `[data-zaruka="delka"]` je uvnitř `a[href="/zaruka"]`, nebo jeho `closest('[data-zaruka-blok]')` obsahuje `[data-zaruka="podminka"]`, `[data-zaruka="plne"]` nebo `a[href="/zaruka"]`,
  - každá stránka se zárukou (kromě `/zaruka.html`) obsahuje `a[href="/zaruka"]`,
  - konzole je bez chyb a žádné požadavky nejdou ven.
- [ ] E2E podklad SVJ: na `/kalkulacka-svj.html` po kliknutí na `#tisk-kalkulace` obsahuje náhled `veta` a `podminka` a žádné jiné číslo let u záruky.
- [ ] E2E PDF nabídka: na `/akce/dekujeme/` se testovací lead podstrčí do `sessionStorage['hspg-holub-lead']` (formát ověř ve zdroji), nic se neodesílá. Nabídka obsahuje totéž co podklad SVJ.
- [ ] H-BOT:
  - s úkolem 01: odpověď v `assets/hbot-znalosti.json` obsahuje `veta` i `podminka` a odkaz `/zaruka`, a `znalostiProAI()` obsahuje `veta` i `podminka` (`node -e`, bez volání AI),
  - bez úkolu 01: výjimka `presne` projde.
- [ ] Simulace změny (test v kopii v `os.tmpdir()`): `delka_let` 12 a texty „10“ → „12“, pak build. Výsledek:
  - `--kontrola` = 0,
  - meta, JSON-LD, `data-zaruka`, `ceny.js` a 77 okresních stránek ukazují 12,
  - záruční shoda s číslem 10 zůstane **jen** ve výjimkách (vypiš je jako seznam míst k ruční úpravě).
- [ ] Na náhledu:
  - `curl -s <náhled>/zaruka` → 200 a obsahuje `veta`,
  - `curl -s <náhled>/ | grep -c "Deset let se zárukou"` → 0,
  - `curl -s <náhled>/cisteni-fasad/kolin/ | LC_ALL=C.UTF-8 grep -cP "24\x{00A0}měsíců"` ≥ 1 (podmínka je s nezlomitelnou mezerou).
- [ ] Lighthouse mobil `/zaruka` na náhledu: SEO i přístupnost 100 (jako homepage 4. 10.). U `/` se přístupnost ani SEO nezhoršily. Uveď čísla.
- [ ] V diffu nejsou hesla, tokeny ani klíče (úkol žádné nepotřebuje).

## Ověření
```bash
PUB=<publikační adresář z netlify.toml>
export LC_ALL=C.UTF-8
node scripts/build-regions.mjs && node scripts/build-ceny.mjs && node scripts/build-zaruka.mjs   # nebo celý build příkaz webu
node scripts/build-zaruka.mjs --kontrola                    # → kód 0
node --test tests/zaruka.test.mjs                           # → vše prošlo (uveď počet)
CHROMIUM=<cesta k Chromiu> node --test --test-concurrency=1 tests/e2e/zaruka.e2e.test.mjs
git grep -nIiP "(?<![\p{L}\p{N}])(15|patnáct)(\s|&nbsp;|\x{00A0}|-)+(let|roků|years?)(?![\p{L}\p{N}])" -- . ':!node_modules'; echo "kód $?"   # → nic, kód 1
grep -rIciE "deset let se zárukou|poskytujeme záruku|dáváme záruku|chráněný dalších|dle podmínek nabídky|záruka na vrstvu|subject to the offer terms" "$PUB" | grep -v ":0$"   # → nic
grep -rhoE 'data-zaruka="[a-z_]+"' --include=*.html "$PUB" | sort | uniq -c   # → počty podle klíčů (vypiš)
git grep -n podminka_zaruky                                 # → nic
grep -rIl "\[DOPLNIT" "$PUB"                                # → nic
node scripts/build-hbot.mjs --kontrola                      # jen s úkolem 01 → „je aktuální“
```

Testy, které přidáš:
- **`tests/zaruka.test.mjs`** (Node, bez závislostí):
  - knihovna: chyby z kroku 5 (kopie dat v paměti), `formy("cs")` a `formy("en")`, nezlomitelné mezery, detektor. Detektor má najít „10 let“, „Deset let“, „10&nbsp;let“, „10-year“, „15 let“ a nemá najít „Po 10 letech“ ani „Každá 10. poptávka“,
  - průchod `$PUB`, `assets/` a `content/` podle akceptačních kritérií fází A a B,
  - `--kontrola` nad dočasnou kopií: upravená `firma.json` → kód 1, po běhu generátoru → kód 0,
  - simulace změny na 12 let s výpisem výjimek,
  - kontrola ukázky pasu: rok v „ZÁRUKA DO M/RRRR“ = rok založení ukázky + `delka_let`.

  Skripty spouštěj v kopii (`cwd` = kopie). Pokud některý build skript používá pevné cesty, uprav ho, aby kořen bral z `import.meta.url` nebo z `cwd`.
- **`tests/e2e/zaruka.e2e.test.mjs`** (Playwright):
  - vlastní statický server nad `$PUB` podle vzoru `balicek/testy/server.mjs`, externí požadavky blokuj přes `ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort())`,
  - očekávané formy předej do stránky z knihovny,
  - `devDependency` `playwright` přidej, jen pokud chybí (úkol 03 ji přidává také),
  - **žádné odesílání formulářů**, POST se nikde nevolá.
- **Na náhledu jen GET** (příkazy v akceptačních kritériích). Na produkci totéž až po schváleném nasazení.

## Bez AI / s AI
Úkol AI nevolá. Bez AI odpovídá H-BOT z `assets/hbot-znalosti.json`, které se generuje z `firma.json`. S AI dostává model záruku v systémových znalostech (`znalostiProAI()`, řádek „Záruka: {veta} {podminka}“), tedy ze stejného zdroje. Ověř to přes `node -e` bez volání API. Pojistka v knihovně: při `potvrzeno !== true` se web nesestaví a H-BOT i AI v balíčku přejdou na `nahradni_veta` bez čísla.

## Nepřekročitelná pravidla
Viz `balicek/KONTEXT.md` §4. Pro tento úkol navíc:
- **Délka záruky je 10 let (R1).** Neměň ji a nikde nepoužívej „15 let“.
- Nepiš nic o rozsahu, výlukách, náhradním plnění ani trvanlivosti („vydrží 10 let“). Rozsah dodá právník (04B), do té doby `[DOPLNIT]` jen v datech, nikdy ve výstupu.
- Žádná nová tvrzení: žádné hvězdičky ani `AggregateRating`, pojistné částky, „garantovaný“ ani superlativy.
- Měň jen texty a značky související se zárukou. Žádné přeformátování celých souborů, žádné změny vzhledu. Zásady (09), JSON-LD strukturu (11) a obrázek `og.png` (11) neměň.
- Formuláře neodesílej (ani na náhledu). E2E podstrkuje data jen lokálně přes `sessionStorage`.
- Nasazuj jen přes `node scripts/nasadit.mjs` (náhled zdarma). Produkce jen po schválení majitelem, v dávce. MX ani DNS se nemění a úkol nepotřebuje žádné klíče.

## Hlášení po dokončení
Po **fázi A** i **fázi B** formát z `KONTEXT.md` §5 a k tomu:
- inventura před a po (tabulka soubor, řádek, typ, staré znění, nová forma nebo mechanismus), včetně nálezů navíc proti tabulce v části Proč,
- seznam výjimek s důvodem a výsledek simulace změny (místa k ruční úpravě),
- výstupy testů (počty), počty `data-zaruka` podle klíčů, délky meta popisů před a po,
- Lighthouse `/zaruka` a `/` (před a po), odkaz na náhled,
- zda `firma.json` vznikl v tomto úkolu (kvůli slučování s 01 a 03),
- předávky:
  - **01:** odkaz `/zaruka` v H-BOT FAQ; `hbot-znalosti.json` generovat z `firma.json` ve webHSPGH; případně smazat výjimku `assets/hbot.js`.
  - **04:** `/zaruka` → „Jak záruku uplatnit“ má odkazovat na `/reklamace` a `reklamace@`. Text 04B patří do `firma.json` → `zaruka.podminky` (+ `schvaleno: true`).
  - **06:** URL `/zaruka`, canonical, sitemap.
  - **08:** hlavička a patička `/zaruka` převzaté z `cenik.html`.
  - **09:** zásady čl. 4 „(10 let)“ → formulace navázaná na `/zaruka` nebo `data-zaruka="delka"`, pak smazat výjimku.
  - **11:** `og.png` má štítek „Záruka 10 let“ bez podmínky; nový OG obrázek generovat z `firma.json` (s `s_podminkou`, nebo bez záruky) pod novým názvem souboru; zvážit `warranty` ve strukturovaných datech jen z těchže dat.
  - **12:** šablona hubů použije `scripts/lib/zaruka.mjs` stejně jako `build-regions`.
  - **13:** „Garantovaný certifikát“; název SENTINEL START v `zaruka.podminka`; seznam zakázaných výrazů může převzít detektor z knihovny.
  - **Majitel:** spot (video) ukazuje „záruka 10 let“ bez podmínky. Při novém střihu zvážit „podmínky na hspg.cz/zaruka“.
- Návrhy mimo rozsah:
  - skloňování „1 let“ a „1 roky“ na `/` a v pasu domu (audit-funkcnost_js #11),
  - otázka „Jak dlouho vydrží impregnace H-STONE?“ je zodpovězená zárukou. Skutečná životnost potřebuje technický list H-STONE (čeká na majitele).
