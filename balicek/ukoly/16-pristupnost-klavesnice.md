# Úkol 16: Přístupnost a ovládání klávesnicí
> Priorita P1 · Závisí na: 08 (sdílená hlavička, patička, `<head>` a CSS); v pořadí z `PORADI.md` běží až po 17 (kotvy a `content-visibility`) a 07 (výkon) · Čeká na majitele: – (jen schválení produkčního nasazení) · Rozsah: fokus a pořadí Tabu, překryvy a dialogy, přepínač pohybu, ARIA a landmarky, kontrast prvků, dotykové cíle, nadpisy, 320 px a telefon na šířku. Do repozitáře přibude test průchodu klávesnicí (Playwright) a axe-core. Dvě fáze (A, B), po fázi A podej hlášení a zastav se (fáze B je další sezení).

## Proč (s důkazy)
Lighthouse dává homepage za přístupnost 100 (KONTEXT §2). Měří ale jen to, co jde zkontrolovat automaticky. Audit přístupnosti a funkčnosti (Playwright, axe-core 4.13, 8 typů stránek, 320–1920 px) našel chyby v ovládání klávesnicí, které Lighthouse nezachytí. Hlavní body jsem **4. 10. 2026 znovu ověřil** skriptem nad lokální kopií živého webu (Playwright Chromium, axe-core 4.13; ven nešlo nic, nic se neodesílalo). Citované soubory (`assets/souhlas.js`, `svj-podklad.js`, `holub-let.js`, `brand.css`, `hbot.js`) jsou na živém webu shodné s kopií. `index.html` se liší jen odstraněným odznakem Netlify.

Čísla řádků platí pro živý web. Po úkolech 07, 08 a 17 se kód mohl změnit, proto hledej podle selektoru, ne podle čísla řádku. Zvlášť: inline JS homepage (zde „inline `/` ř. …“) přesouvá úkol 07 ve fázi B do `assets/domov.js`, hlavičku `/` (`#nav-odkazy`, `#mobile-menu`, CTA ř. 1151) nahrazuje úkol 08 sdílenou komponentou a handler kotev (ř. 2391) přepsal úkol 17 na `dojedNaCil`.

**A – Klávesnice, fokus a překryvy (fáze A)**

| # | Problém | Důkaz | WCAG |
|---|---|---|---|
| A1 (audit-pristupnost_ux #3) | Cookie lišta je v DOM až na konci `<body>`, takže se na ni klávesnicí dostanete až na konci stránky. Navíc zakrývá fokusovaná pole. | `assets/souhlas.js` ř. 111 `document.body.appendChild(box)`, ř. 99 `position:fixed;…bottom:88px`. Ověřeno 4. 10.: první tlačítko lišty je až **76.** zastávka Tabu na `/` (1280 px), **24.** na `/akce/` a **39.** na `/cisteni-strech/kolin/`. Na `/akce/` při 390 px lišta zakrývá z ≥ 50 % 14–15 zastávek, mezi nimi `#adresa`, `#typ`, `#sluzba`, `#pozn` a tlačítko „🕊 Vypustit holuba“. | 2.4.3, 2.4.11 |
| A2 (#4) | Spodní lišta `#hspg-lista` (≤ 760 px) zakrývá fokus. | Ověřeno 4. 10., `/akce/` 390×844: lišta je na 779–844 px (65 px), pole `#tel` je zakryté ze 100 %, `#pozn` z 50 %. `scroll-padding` není na celém webu ani jednou (grep kopie = 0). Lišta má výšku ~66 px: dnešní `hbot.js` ř. 96–100, v balíčku úkolu 01 `hbot.js` ř. 31–39. | 2.4.11 |
| A3 (#2) | Fokus se může ocitnout mimo obrazovku v sekcích s `content-visibility:auto`. | `index.html` ř. 590 `[data-cv]{content-visibility:auto;contain-intrinsic-size:auto 1400px}` je na **11** blocích (ř. 1259–1703). Audit naměřil fokus na „OTEVŘÍT FACEBOOK HSPG →“ 842 px nad viewportem (1280×800) a 601 px nad ním při 390 px. Při opakovaném měření 4. 10. (čekání na ustálení posunu, 129 zastávek) se to **nezopakovalo**, projev tedy závisí na časování. Příčina je stejná jako u kotev (úkol 17). | 2.4.7, 2.4.11 |
| A4 (#8) | Indikátor fokusu není jednotný. | Ověřeno 4. 10. (1280 px): na `/cisteni-strech/kolin/` mělo výchozí `outline: auto` prohlížeče 50 z 59 zastávek, na `/akce/` 31 z 58, na `/` 0 (vlastní 2px `#fff3c4` / `#e7cf8b`). Okresní šablona (234 stránek `/cisteni-*`) má jen `.btn:focus-visible,.btn-alt:focus-visible{…}` a blok `.lux--gold:focus-visible, … !important`. | 2.4.7, 1.4.11 |
| A5 (#6) | Mobilní menu `details#mobile-menu` (`/`) nejde zavřít Escapem, klikem mimo ani výběrem položky. | Ověřeno 4. 10.: Enter → otevřeno, Tab, Escape → zůstane otevřené. Jediný handler Escape na stránce (ř. 2070) patří spotu. Podle auditu po ťuknutí na „Služby“ zůstane panel 206×434 px přes obsah. | 2.1.1, 3.2.1 |
| A6 (#7, audit-funkcnost_js #17) | Podklad pro schůzi SVJ (`/kalkulacka-svj.html` → `.sp-overlay`) se hlásí jako modální dialog, ale fokus z něj uteče. | `svj-podklad.js` ř. 127 `role:'dialog','aria-modal':'true'`, Escape jen na overlayi (ř. 139), `close()` (ř. 142) fokus nevrací. Ověřeno 4. 10.: Tab projde „Uložit jako PDF“, „Zavřít“, pak BODY, skip link, logo, „Úvod“, „Ceník“, „Pas domu“. Escape z pozadí dialog nezavře. | 2.4.3, 2.1.2 |
| A7 (funkcnost #5) | Scéna „Holub vyletěl“: po doletu se ztratí fokus. | `holub-let.js` ř. 393–396: po 4,1 s se přidá `hd-landed` a `holub-let.css` ř. 449 skryje `.hd-skip`, na kterém je fokus. Fokus tak spadne na `body`. Past `onKey` (ř. 398–408) cyklí jen tehdy, když je fokus na prvním nebo posledním prvku. Audit: 8× Tab vedlo za dialog. | 2.4.3, 2.1.2 |
| A8 (#16) | Vodorovně posuvný pás `.povrchy__row` (≤ 760 px) nejde ovládat klávesnicí. | `index.html` ř. 735 (`overflow-x:auto`), ř. 1495. Uvnitř jsou jen `figure/img`. Ověřeno 4. 10.: axe na `/` 390 px hlásí **serious** `scrollable-region-focusable`. Chromium pás do pořadí Tabu zařadí sám (22. zastávka při 390 px), jiné prohlížeče na to spoléhat nemusí. Pás nemá název ani viditelný fokus. | 2.1.1 |
| A9 (#23) | `/en.html` nemá skip link a pod 900 px chybí navigace. | Ověřeno 4. 10.: všech 246 CZ stránek začíná skip linkem (`.skip` 239×, `.skip-link` 6×, `.hspg-skip` 1×), `/en.html` ne. `<main>` (ř. 139) nemá `id`. Ř. 98–99 `@media (max-width:900px){.nav a:not(.language):not(.offer){display:none}}` odkazy skryje bez náhrady. | 2.4.1 |
| A10 (#24) | Interní odkazy otevírají novou kartu bez upozornění. | Ověřeno 4. 10. (všech 247 HTML): 5× na `/`. 4× `/akce/` (ř. 1151 CTA „Chci nabídku“ v hlavičce, 1345, 1635, 1866) a 1× zásady v průvodci (ř. 2200). | G201 (3.2.5) |

**B – Pohyb, sémantika, kontrast, zobrazení (fáze B)**

| # | Problém | Důkaz | WCAG |
|---|---|---|---|
| B1 (#14) | Nekonečný pohyb nejde zastavit, pokud návštěvník nemá v systému zapnuté omezení pohybu. | Ověřeno 4. 10.: na první obrazovce `/` běží **17** nekonečných animací (`mossFall`, `prach`, `doveFloat`, `beh`). K tomu plátno deště (`hstone-rain.js`) a 16 `<video>`, z toho 15 s `loop`. Dál `.pas__track` (`pasJede` 48 s, ř. 198), `.btn-lux::after` (`luxSweep` 4,6 s, ř. 583) a `.btn-gold::after` (`btnSweep` 5,2 s, `brand.css` ř. 50–54; `/akce/`, `/recenze/`), všechny `infinite`. Spot na `/akce/` je `loop` a ovládání (`controls`) dostane jen v režimu omezeného pohybu. Ovládání pauzy chybí (kromě dialogu spotu). | 2.2.2 |
| B2 (#15) | Při `prefers-reduced-motion: reduce` zůstává plynulé posouvání a zavádějící nápověda. | Ověřeno 4. 10. v emulaci reduce: `scroll-behavior` = `smooth` (`brand.css` ř. 23, `index.html` ř. 50, `en.html` ř. 39). JS volá `behavior:'smooth'` v `index.html` ř. 2008, 2033, 2391, `pas-domu.html` ř. 311 a `recenze/` ř. 239. Nápověda „☂ klikněte kamkoliv — …“ (ř. 1215) je vidět, přestože plátno deště se v tomto režimu nevytvoří (`hstone-rain.js` ř. 10). | 2.3.3 (AAA) |
| B3 (#17) | Homepage nemá landmark `<header>` a desktopové menu je `div#nav-odkazy` (ř. 1143). | Ověřeno 4. 10.: axe `region` hlásí 3 uzly (390 px) a 4 uzly (1280 px). Ostatní šablony `<header>` + `<nav aria-label="Hlavní navigace">` mají. | 1.3.1 |
| B4 (#18) | Chybné nebo neúplné ARIA. | Ověřeno 4. 10. (axe incomplete): `aria-prohibited-attr` = `aria-label` na `div` bez role (`#hero-rychla-poptavka` ř. 1218, `.spot-meta` ř. 1269, `.pas` ř. 1379, `.dove-steps` ř. 1400; na `/kalkulacka-svj.html` `.odklad` ř. 275 s `aria-labelledby`). `aria-allowed-attr` = `aria-pressed` na `path/rect.damage-hotspot` uvnitř `<svg role="img">` (JS `index.html` ř. 2127, `assets/en-sections.js` ř. 26). Handler `keydown` na hotspotech (ř. 2143) je mrtvý, hotspoty nejsou fokusovatelné. Záložky `.dg-tabs` (ř. 1571–1575, `en.html` ř. 245–249) nemají `aria-controls` ani `role="tabpanel"` a nereagují na šipky. | 4.1.2 |
| B5 (#21) | Při 320 px (= zoom 400 %) je tlačítko „Menu“ z větší části mimo obrazovku. | Ověřeno 4. 10.: summary leží na 290–355 px při šířce 320 px. Příčina je podnázev `font-size:8.5px;letter-spacing:3.2px;white-space:nowrap` (ř. 1141). | 1.4.10 |
| B6 (#22) | Telefon na šířku (740×360): na obsah zbývá málo místa a cookie lišta zakrývá „Menu“. | Ověřeno 4. 10.: sticky hlavička zabírá 0–109 px, `#hspg-lista` 293–360 px, na obsah zbývá 184 z 360 px. Cookie lišta (61–272 px) zakrývá „Menu“. | 1.4.10 |
| B7 (#25) | Netextový kontrast pod 3 : 1. | `/recenze/` nevybraná hvězdička `rgba(201,169,98,.32)` (ř. 54) ≈ 1,9 : 1, okraj polí `rgba(201,169,98,.35)` (ř. 45) ≈ 2,0 : 1. `/akce/` okraj polí `brand.css` ř. 159–160 `rgba(201,162,39,.3)` ≈ 1,7 : 1. `/pas-domu.html` `#sentinel-code-input` ≈ 2,6 : 1 (výpočet auditu). Hodnoty pro tmavé pozadí `rgb(12,18,30)` jsem 4. 10. přepočítal se stejným výsledkem. | 1.4.11 |
| B8 (#27) | Hraniční kontrast textu. | `#spot p` „Spot je bez zvukové stopy…“ `#9aa2ac` 13 px na `#1E3A5F` = 4,46 : 1 (ř. 1279). | 1.4.3 |
| B9 (#26) | Dotykové cíle pod 44 px (AA 24 px je splněno, cíl majitele je špička). | Audit: FAQ `summary` 22 px (`/` ≥ 768 px), kontakty v hero 26 px (mobil), odkazy patičky 28 px, posuvníky 34 px, `/en` „CZ“ 33×32. Ověřeno 4. 10.: souhlasové checkboxy 24×24 (`brand.css` ř. 167, `/akce/` ř. 63). | 2.5.8 (AA), 2.5.5 (AAA) |
| B10 (#28) | Kalkulačka SVJ a Pas domu mají jen jeden nadpis. | Ověřeno 4. 10.: `/kalkulacka-svj.html` má jen H1 (ř. 227). Výsledkové části jsou `div.result-title` (ř. 252, 260) a `div.saving-title` (ř. 271, 276). `/pas-domu.html` má jen H1 (ř. 179) a „HISTORIE OŠETŘENÍ“ je `div.history-title`. | 1.3.1, 2.4.6 |

**Co funguje a nesmí se rozbít** (audit, `funguje_dobre`):
- Skip linky na CZ stránkách jsou první zastávkou a přesunou fokus do `<main>`.
- Dialog spotu na `/` (fokus na „Zavřít video“, past, Escape, návrat fokusu) slouží jako **vzor**.
- Režim reduce zastaví animace i videa na všech 8 testovaných stránkách.
- H-BOT se zavře Escapem.
- Rozestupy textu (1.4.12), atributy `lang` a meta viewport jsou v pořádku.
- axe na `/cenik.html`, `/akce/`, kolíně, kalkulačce, `/en.html`, `/recenze/` a `/pas-domu.html` hlásí 0 porušení.

## Cíl (měřitelný)
WCAG 2.2 AA na všech typech stránek, ovládání klávesnicí bez slepých míst a test, který to v repozitáři hlídá:
1. **axe-core:** 0 porušení s dopadem `serious`/`critical` a 0 porušení `region` na všech typech stránek (seznam v kroku 3) při 390×844 i 1280×800. Platí ve stavech: výchozí, otevřená cookie lišta, otevřené menu, podklad SVJ, spot, scéna holuba, H-BOT.
2. **Průchod Tabem** přes celou stránku (všechny typy, obě šířky):
   - 0 zastávek mimo viewport po ustálení posunu,
   - 0 zastávek zakrytých z ≥ 50 % fixním nebo sticky prvkem,
   - každá zastávka má jednotný indikátor fokusu,
   - tlačítko „Přijmout“ cookie lišty je nejpozději 3. zastávka.
3. **Escape** zavře každý překryv (cookie lišta, mobilní menu, podklad SVJ, spot, scéna holuba, H-BOT) a fokus se vrátí na spouštěč. Modální dialogy drží fokus uvnitř (10× Tab i Shift+Tab).
4. **Pohyb:**
   - viditelný přepínač „Zastavit animace“ (`aria-pressed`) na všech stránkách,
   - po zapnutí do 1 s 0 běžících animací a všechna videa `paused`, volba trvá i po obnovení stránky,
   - v režimu reduce `scroll-behavior: auto` a žádná nápověda k efektu, který neběží,
   - třpytky tlačítek nejvýš 5 s.
5. **Zobrazení:** při 320×640 nevzniká vodorovný posun a tlačítko menu je celé vidět. Při 740×360 zabírají fixní a sticky prvky (bez cookie lišty) ≤ 25 % výšky a cookie lišta nezakrývá menu.
6. **Kontrast a cíle:**
   - okraje polí a nevybrané hvězdičky ≥ 3 : 1, `#spot p` ≥ 4,5 : 1,
   - samostatné ovládací prvky ≥ 44×44 px,
   - kalkulačka a pas domu mají osnovu nadpisů bez přeskoků.
7. **Lighthouse** mobil: přístupnost 100 (homepage ji má už dnes, ostatní stránky nesmí klesnout a cíl je 100) a výkon neklesne o víc než 2 body (5 stránek z kroku 13).

## Rozsah
**ANO:**
- nový `assets/pristupnost.js` (zásobník překryvů a Escape, past fokusu, mobilní menu, pojistka fokusu, přepínač pohybu, posuvné regiony) a jeho načtení na všech stránkách,
- pravidla fokusu, `scroll-padding` a pohybu ve sdíleném CSS z úkolu 08,
- `assets/souhlas.js`: jen umístění v DOM, fokus, Escape a `scroll-padding`,
- `assets/svj-podklad.js` (dialog),
- `assets/holub-let.js` a `.css` (fokus po doletu, respektování přepínače),
- `assets/hstone-rain.js`, `assets/video-autoplay.js`, `assets/en-sections.js` a inline skripty `/`, po fázi B úkolu 07 `assets/domov.js` (respektování přepínače, `behavior` posunu, záložky a hotspoty),
- `tests/vykon/staticke.test.mjs` z úkolu 07: jen jedna výjimka pro inline řádek volby pohybu v `<head>` (krok 4),
- pravidlo `scroll-margin-top` a měření `--hlavicka` z úkolu 17 (jen sjednocení se `scroll-padding`, krok 7),
- `en.html`: skip link a `id` na `<main>`,
- `target="_blank"` na `/`,
- ARIA atributy a role u uvedených prvků,
- nadpisy na kalkulačce a pasu domu (jen typ prvku, ne text),
- barvy okrajů polí a hvězdiček, kontrast `#spot p`, velikost cílů,
- 320 px a telefon na šířku ve sdílené hlavičce,
- testy a jejich skripty v `package.json`.

**NE (patří jinam):**
- Lámání menu 761–1240 px, překryvy plovoucích prvků (`#reel-bublina`, `#hbot-btn`, `#cta-stack`) přes text, jednotná hlavička a patička, paleta, typografie a písmo < 12 px (audit #1, #5, #9–#13) → **úkol 08**. Pokud test fokusu selže kvůli `#hbot-btn`/`#cta-stack`/`#reel-bublina`, případ označ `todo` s odkazem na 08 a nahlas, neopravuj.
- H-BOT: soubory `hbot*.js` a `hbot.css`, štítky polí, velikost `.hb-close`/`.hb-chip`, dostupnost na mobilu (audit #19, #20) → **úkol 01**. Tady jen regresní test Escape a návratu fokusu.
- Kotvy na homepage a `content-visibility` pro cíle kotev (funkcnost #1), tisk (#6, #13), scéna na `/akce/dekujeme/` bez poptávky a cookie lišta pod ní (#18) → **úkol 17**.
- Obsah a logika cookie lišty (kategorie, texty, Consent Mode) → **úkol 10**. Tady se mění jen umístění, fokus, Escape a odsazení.
- První obrazovka na mobilu na výšku (lišty ≤ 15 %), obsah `/en`, cesta k poptávce, přestavba průvodce → **úkol 18**.
- Výkon a rozpočty Lighthouse (`content-visibility` jako optimalizace) → **úkol 07**. CSP a hash inline skriptu → **úkol 15**. Spouštění testů v CI → **úkol 19**.
- Texty na kalkulačce a pasu domu (lešení, záruka) → **úkoly 13 a 05**. Měníš jen typ prvku na nadpis.
- Chybové stavy formulářů a průvodce jako `<form>` (audit-formulare #7, #16) a `aria-pressed` u výběru služby v průvodci (#17) → jen návrh do hlášení, pokud je nevyřešil úkol 17. Úkol 18 (přestavba průvodce) běží až po tomto úkolu, proto je předej jemu.
- **Žádné přístupnostní „overlay“ widgety třetích stran** (lišty typu „zvětšit písmo / kontrast“ z cizích skriptů).

## Postup

### Fáze A – klávesnice, fokus, překryvy a dialogy
1. Větev `ukol-16-pristupnost-klavesnice` z aktuální `main` (pravidla v `CLAUDE.md` z úkolu 00). Pak ověř předpoklady:
   - `git branch --merged main` / `git log --oneline main` ukazuje sloučený **úkol 08** (sdílená hlavička, patička a CSS). Bez něj nezačínej a podej hlášení „blokováno“.
   - Pokud chybí úkol 17 nebo 07, pokračuj, ale v hlášení uveď, které kroky na nich závisí (krok 7).
2. Najdi v repozitáři soubory, které generují:
   - publikační adresář a build (`netlify.toml` → `[build] publish`/`command`, `package.json`),
   - sdílenou hlavičku, patičku, `<head>` a sdílené CSS z úkolu 08 (partial nebo build skript). Dnes `assets/brand.css` načítá 239 stránek a nenačítá `/`, `cenik`, `kalkulacka-svj`, `kariera`, `ochrana-osobnich-udaju`, `pas-domu`, `nabidka-svj` a `en`. Po 08 má být všude, ověř to,
   - `scripts/build-regions.mjs` (232 stránek s `data-gen="build-regions"`) a ručně psané stránky včetně 404 a `akce/dekujeme/`,
   - skripty `assets/souhlas.js` (na všech 247 stránkách), `svj-podklad.js`, `holub-let.js` + `.css`, `video-autoplay.js`, `hstone-rain.js` a `en-sections.js`,
   - inline skripty v `index.html` (spot, vizualizace poškození, kotvy, videa), po fázi B úkolu 07 v `assets/domov.js`,
   - mechanismus otisků z úkolu 07 (`scripts/build-otisky.mjs`, manifest `otisky.json`, složka `/o/`) a jeho statický test `tests/vykon/staticke.test.mjs`,
   - kde úkol 17 nastavuje `--hlavicka` a pravidlo `scroll-margin-top` (dnes jen homepage),
   - offline stránku `offline/index.html` z úkolu 17 (samostatná, bez externích souborů),
   - existující testy a statický server (úkoly 03 a 17).

   Pak spusť `git grep -nE "prefers-reduced-motion|scroll-behavior|behavior: ?'smooth'|target=\"_blank\"|aria-pressed|content-visibility|:focus-visible"` (mimo `node_modules`) a výsledek ulož do hlášení jako inventuru.
3. **Testy napřed.** Než začneš cokoli měnit, změř výchozí stav. Pokud web má testovací strukturu, drž se jí (vzor: `balicek/testy/e2e/hbot.test.mjs`, tj. `node:test` + `playwright` + `axe-core` z `require.resolve("axe-core/axe.min.js")`).
   - `npm i -D playwright axe-core`, pokud chybí.
   - `tests/e2e/a11y-pomocne.mjs`:
     - `spustServer(PUB)`: statický server nad publikačním adresářem. Adresy `/x` a `/x/` obslouží jako Netlify (`x.html`, `x/index.html`) a vrací 404 stránku webu.
     - `kontext(prohlizec, {sirka, vyska, pohyb})`: blokuje externí požadavky (`ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort())`) a **každý jiný požadavek než GET/HEAD** (abort, zapsat do seznamu). Test na konci ověří, že seznam je prázdný.
     - `axe(page)`: tagy `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice`.
     - `pruchodTabem(page, {max})`: Tab, dokud se fokus nevrátí na první zastávku, nejvýš `max`. U každé zastávky počkej na ustálení (scrollY i pozice prvku beze změny 3× po 50 ms, nejvýš 2,5 s) a změř **dvakrát**: hned po ustálení a znovu po dalších 600 ms. Zachytí to i přeskládání `content-visibility`. U každé zastávky vrať:
       - selektor a text,
       - `rect` vůči viewportu,
       - `zakryti`: největší podíl plochy prvku překrytý viditelným prvkem s `position: fixed|sticky`, který prvek neobsahuje, nemá `pointer-events:none` ani `aria-hidden="true"`,
       - indikátor: computed `outline-style/width/color`, `box-shadow`.
   - `tests/e2e/pristupnost.e2e.test.mjs`: kontroly z akceptačních kritérií. Typy stránek (podoba adres podle úkolu 06): `/`, `/cenik`, `/akce/`, `/akce/dekujeme/`, `/cisteni-strech/`, `/cisteni-strech/kolin/`, `/cisteni-fasad/kolin/`, `/cisteni-dlazby/kolin/`, `/kalkulacka-svj`, `/pas-domu`, `/nabidka-svj`, `/kariera`, `/spoluprace`, `/reference`, `/recenze/`, `/ochrana-osobnich-udaju`, `/pravidla-akce/`, `/en` a 404. Seznam doplň o stránky, které mezitím přibyly (např. `/reklamace` z úkolu 04). Seznam drž jako jednu konstantu v `a11y-pomocne.mjs`, aby ho pozdější úkoly (11, 18) mohly rozšířit. `/offline/` (úkol 17) do průchodů nepatří. Šířky 390×844 a 1280×800. Proměnná `A11Y_RYCHLE=1` omezí běh na `/`, `/akce/`, `/cisteni-strech/kolin/`, `/kalkulacka-svj` a `/en` (pro CI, úkol 19).
   - `tests/pristupnost-staticke.test.mjs` (Node, bez prohlížeče): průchod HTML v `$PUB` podle akceptačních kritérií.
   - Kontroly fáze B označ ve fázi A `{ todo: "fáze B" }`.
   - Spusť testy **před změnami** a čísla (zastávky, mimo viewport, zakryté, výchozí indikátor, pozice cookie lišty, axe) ulož do hlášení jako „před“. Testy budou červené, to je výchozí stav.
4. **`assets/pristupnost.js`** (bez závislostí, ES5 kompatibilní jako ostatní `assets/*.js`, `defer`) a jeho načtení:
   - `<script src="/assets/pristupnost.js" defer>` přidej do sdíleného `<head>` z úkolu 08. Pokud 08 `<head>` nesdílí, přidej ho do šablony v `build-regions.mjs`, do ručně psaných stránek a do 404. Statický test ověří, že ho každá HTML (kromě `rd-control-panel/`, `ai-centrum/` a `offline/`) načítá právě 1×.
   - Otisky (úkol 07): ve zdroji odkazuj `/assets/pristupnost.js`, build ho přepíše na `/o/pristupnost.<hash>.js`. Soubor do výjimek otisků nedávej. Statický test nad `$PUB` proto hledá `pristupnost(\.[0-9a-f]+)?\.js`, nebo cestu přeloží přes `otisky.json`.
   - Do stejného `<head>` dej jednořádkový inline skript, aby volba pohybu platila před prvním vykreslením: `<script>try{if(localStorage.getItem('hspg-pohyb')==='omezeny')document.documentElement.setAttribute('data-pohyb','omezeny')}catch(e){}</script>`. CSP je zatím Report-Only s `'unsafe-inline'`. Pro vynucenou CSP předej hash úkolu 15 (ten s jedním hashem pro tento řádek počítá).
     - Statický test úkolu 07 (`tests/vykon/staticke.test.mjs`, fáze B) vyžaduje 0 inline skriptů s kódem na homepage. Přidej do něj **jedinou** výjimku: přesná shoda obsahu s tímto řádkem (porovnej SHA-256), s komentářem a odkazem na úkol 16. Jiný inline kód nepřidávej. Test 07 musí dál projít.
   - API `window.HSPGA11y`. Kostra:
     ```js
     // zásobník překryvů: jeden Escape zavře jen vrchní překryv
     var zasobnik = [];
     document.addEventListener('keydown', function (e) {
       if (e.key !== 'Escape' || e.defaultPrevented || !zasobnik.length) return;
       var z = zasobnik[zasobnik.length - 1];
       if (z.jenUvnitr && !z.el.contains(document.activeElement)) return;
       e.preventDefault(); z.zavri();
     });
     // prekryv(el, {modalni, jenUvnitr, zavri, navrat}) → uvolni(vratitFokus)
     //  modalni: ostatním potomkům <body> nastaví inert, Tab/Shift+Tab cyklí uvnitř el
     //           (i když fokus utekl ven, vrátí ho na první prvek); uvolni() inert vrátí
     //  navrat:  prvek pro návrat fokusu (výchozí document.activeElement při otevření)
     ```
     Dál exportuj `omezenyPohyb()`, `nastavPohyb(bool)`, `chovaniPosunu()` → `'auto'|'smooth'` (implementace ve fázi B, ve fázi A stačí, aby `chovaniPosunu()` vracel `'auto'` při reduce).
   - Existující dialog spotu a H-BOT nepřepisuj. Jen ověř testem, že jeden Escape nezavře dva překryvy najednou. Pokud jejich handler Escape nevolá `preventDefault()`, u spotu ho doplň (inline `index.html` ř. 2070). H-BOT neměň.
5. **Indikátor fokusu (A4).** Do sdíleného CSS z úkolu 08:
   ```css
   :root { --fokus: #fff3c4; --fokus-lem: #0b1a2b; }
   :where(a[href], button, input, select, textarea, summary, [tabindex]):focus-visible {
     outline: 2px solid var(--fokus); outline-offset: 2px;
     box-shadow: 0 0 0 5px var(--fokus-lem);   /* dvoubarevný prstenec: viditelný na tmavém i světlém pozadí */
   }
   ```
   - Lokální pravidla `…:focus-visible` (včetně bloku s `!important` v okresní šabloně a na `/akce/`) sjednoť na tyto tokeny nebo je odstraň. Speciální případy nech, ale zapiš je do seznamu výjimek v testu s důvodem: hvězdičky na `/recenze/` a `.rz-opt` mají indikátor na sesterském `label/span`, hotspoty SVG mají `stroke`.
   - Totéž platí pro odkaz v cookie liště (`#souhlas-lista a`).
   - V režimu `forced-colors` zůstane `outline` (box-shadow zmizí), takže nic dalšího není potřeba.
6. **Cookie lišta (A1)** v `assets/souhlas.js`. Texty, kategorie ani logiku souhlasu neměň (úkol 10).
   - Lištu vlož hned **za skip link**: `var skip = document.querySelector('a.hspg-skip, a.skip, a.skip-link'); skip ? skip.after(box) : document.body.prepend(box);` (první odkaz pro přeskočení v pořadí dokumentu; úkol 08 používá `a.hspg-skip`). Vizuálně zůstane `fixed` dole.
   - Zachovej změny úkolu 17 v `souhlas.js`: během scény holuba se lišta nezobrazí (události `hspg:scena-otevrena` / `hspg:scena-zavrena`) a ukáže se po jejím zavření.
   - Dokud je lišta vidět, nastav na `<html>` třídu `souhlas-otevrena` a proměnnou `--souhlas-spodek` = `innerHeight − box.getBoundingClientRect().top + 12` px (přepočet přes `ResizeObserver` a `resize`). Proměnnou použije `scroll-padding-bottom` z kroku 7. Po zavření třídu a proměnnou odeber.
   - Escape: registruj lištu přes `HSPGA11y.prekryv(box, {jenUvnitr: true, …})`.
     - **První zobrazení** (volba ještě neuložena): Escape = „Jen nezbytné“, tj. uloží `nezbytne` a nenačte žádný nástroj.
     - **Znovu otevřená** lišta přes `[data-souhlas-nastaveni]`: Escape zavře bez změny volby.
   - Po zavření lišty (kterýmkoli tlačítkem nebo Escapem) nesmí fokus zůstat na `body`. Vrať ho na prvek, odkud uživatel do lišty přišel (`relatedTarget` prvního `focusin`). Při znovuotevření ho vrať na odkaz „Nastavení cookies“. Jinak ho dej na skip link.
   - Pokud `HSPGA11y` chybí (stará stránka), lišta musí fungovat jako dosud.
7. **Překryvy u horního a spodního okraje (A2, A3).**
   - Do sdíleného CSS přidej:
     ```css
     html { scroll-padding-top: calc(var(--hlavicka, 0px) + 8px);
            scroll-padding-bottom: calc(max(var(--hspg-spodek, 0px), var(--souhlas-spodek, 0px)) + 12px); }
     ```
   - `scroll-padding-top` a `scroll-margin-top` se při posunu na cíl **sčítají**. Pravidlo úkolu 17 `main [id]{scroll-margin-top:calc(var(--hlavicka) + 8px)}` proto odstraň (zarovnání pod hlavičku teď zajistí `scroll-padding-top`), jinak kotvy přistanou o výšku hlavičky níž. Logiku `dojedNaCil` (výjimka `#holub-sekce`, dorovnání) neměň.
   - V `pristupnost.js` měř a zapisuj do těchto proměnných:
     - `--hlavicka` = výška sticky hlavičky. Proměnnou zavedl úkol 17 a úkol 08 ji napojil na novou hlavičku. **Druhou proměnnou nezakládej.** Pokud ji dnes měří jen skript homepage, přesuň měření do `pristupnost.js` pro všechny stránky (háček `data-hspg-hlavicka` na kořen hlavičky v partialu) a skript homepage ji jen čte. Pokud hlavička není sticky, hodnota je 0.
     - `--hspg-spodek` = největší `innerHeight − rect.top` z viditelných prvků `#hspg-lista`, `#hbot-btn` a `#cta-stack` (seznam jako konstanta v souboru).
     - Přepočet: `ResizeObserver`, `resize` a `MutationObserver` na třídu `body` (`hero-cta-na-obrazovce` lištu schovává). `hbot.js` neměň.
   - **Pojistka fokusu** (A3 závisí na časování, proto ji přidej vždy). Na `focusin`, pokud `e.target.matches(':focus-visible')` a není otevřený modální překryv:
     - po 2× `requestAnimationFrame` a znovu po `scrollend` (případně po 600 ms) zkontroluj, že prvek leží celý v pásu `[hlavicka, innerHeight − spodek]`,
     - pokud ne, `scrollBy({top: delta, behavior: HSPGA11y.chovaniPosunu()})`,
     - u prvků vyšších než pás zarovnej horní hranu.
   - `content-visibility`: nejdřív zjisti, co změnil úkol 17 (kotvy). Pokud test kroku 3 i s pojistkou najde fokus mimo viewport, uprav `contain-intrinsic-size` u dotčených sekcí na skutečnou výšku, nebo z nich `data-cv` odeber. Změnu změř Lighthouse (úkol 07, výkon nesmí klesnout o víc než 2 body).
   - Spusť test kotev z úkolu 17. `scroll-padding-top` mění, kde kotva přistane, a test musí dál projít.
8. **Mobilní menu (A5)** ve sdílené hlavičce z úkolu 08. Do partialu přidej háček `data-hspg-menu` na kořen menu (`details` nebo obal s tlačítkem). V `pristupnost.js`:
   - Escape (fokus v menu nebo menu otevřené) menu zavře a fokus dá na `summary`/tlačítko,
   - klik na odkaz uvnitř menu ho zavře,
   - `pointerdown` mimo menu ho zavře, fokus nepřesouvej,
   - `focusout` na prvek mimo menu ho zavře,
   - pokud je menu tlačítko, synchronizuj `aria-expanded`.

   Platí pro všechny šablony, které menu mají.
9. **Podklad SVJ (A6)** v `assets/svj-podklad.js`:
   - v `open()` si zapamatuj spouštěč (`document.activeElement`, obvykle `#tisk-kalkulace`) a zavolej `HSPGA11y.prekryv(overlay, {modalni: true, zavri: close, navrat: spoustec})`,
   - posluchač Escape na overlayi (ř. 139) nahradí zásobník,
   - `close()` zavolá `uvolni()`, vrátí fokus na `#tisk-kalkulace` a zruší `inert`,
   - záloha bez `HSPGA11y`: Escape poslouchej na `document`, dokud je overlay otevřený.

   Úkol 17 v souboru opravuje tisk (Ctrl+P). Zachovej jeho změny a slouč je ručně.
10. **Scéna holuba (A7)** v `assets/holub-let.js`:
    - časovač doletu (ř. 393) udělá totéž co `skipToEnd()`: odebere `.hd-skip` a fokus přesune na `built.close`, ale jen pokud byl fokus na `.hd-skip` nebo mimo scénu,
    - v `onKey` ošetři stav, kdy `document.activeElement` není uvnitř scény: vrať ho na první prvek,
    - po dobu otevření nastav ostatním potomkům `body` `inert` (přes `HSPGA11y.prekryv`, `modalni: true`, se zálohou bez něj),
    - Escape a návrat fokusu (ř. 418–427) zachovej.

    Test spouští scénu přes `HSPGHolub.play({ sky: false })` na `/`, **ne odesláním formuláře**.
11. **Posuvné regiony (A8).**
    - `.povrchy__row` dostane `role="region"`, `aria-labelledby` na `p.povrchy__kicker` (přidej `id`, text neměň) a `data-posuvny`.
    - `pristupnost.js` nastaví všem `[data-posuvny]` `tabindex="0"` jen tehdy, když `scrollWidth > clientWidth` (přepočet při `resize`), jinak `tabindex` odebere. Na desktopu tak nevznikne zbytečná zastávka.
    - Šipky posouvají nativně. Indikátor fokusu je z kroku 5.
12. **`/en` a nové karty (A9, A10).**
    - `/en`: první prvek `<body>` je `<a class="skip" href="#main">Skip to content</a>` a `<main id="main">`. Pokud úkol 08 dal `/en` sdílenou hlavičku s menu, jen to ověř testem. Jinak doplň stejné menu (anglické popisky) místo skrývání odkazů pod 900 px (ř. 98–99).
    - `/`: odstraň `target="_blank"` u odkazů na `/akce/` (dnes 4: ř. 1345, 1635, 1866 a CTA v hlavičce ř. 1151, které už měl odstranit úkol 08; pokud tam zůstalo, odstraň ho v partialu a nahlas to úkolu 08).
    - U odkazu na zásady v průvodci (ř. 2200, odkaz vzniká v JS přes `innerHTML`) novou kartu ponech (návštěvník neztratí rozepsaný formulář). Doplň vizuálně skrytý text „(otevře se v&nbsp;novém okně)“ s třídou pro skrytý text ze sdíleného CSS (`.sr-only` z úkolu 08, dnes `.sr` v `brand.css`) a ikonu `↗` s `aria-hidden="true"`.
    - Statický test: žádný interní `a[target=_blank]` bez textu „v novém okně“ / „new window“ v přístupném názvu. Kontroluje HTML i řetězce s HTML v JS (inline skripty, `assets/*.js`, např. průvodce).
13. Spusť testy fáze A, testy úkolů 03, 07 (`tests/vykon/staticke.test.mjs`) a 17 a Lighthouse mobil (`/`, `/cenik`, `/akce/`, `/cisteni-strech/kolin/`, `/kalkulacka-svj`, lokálně nebo na náhledu stejně jako v úkolu 07). Podej **hlášení fáze A** (KONTEXT §5), commitni a **zastav se**. Fáze B je další sezení ve stejné větvi (`ukol-16-pristupnost-klavesnice`; pokud mezitím přibyly změny v `main`, nejdřív `git merge main`).

> Pokud fázi A v jednom sezení nestihneš, rozděl ji: **A1** = kroky 1–7 (testy, `pristupnost.js`, indikátor fokusu, cookie lišta, `scroll-padding` a pojistka fokusu), pak commit a hlášení „ÚKOL 16 – A1 částečně“ s čísly „před“ a stop. **A2** = kroky 8–13 v dalším sezení na téže větvi. Stejně fázi B: **B1** = kroky 14–15 (pohyb), **B2** = kroky 16–22. Do `main` se slučuje až po hlášení celé fáze a ověření na náhledu (KONTEXT §4 bod 3).

### Fáze B – pohyb, sémantika, kontrast a zobrazení
14. **Přepínač pohybu (B1).**
    - **Tlačítko:** `<button type="button" class="pohyb-prepinac" data-pohyb-prepinac aria-pressed="false" hidden>Zastavit animace</button>` (en: „Pause animations“).
      - Umístění: do sdílené patičky (všechny stránky) a na `/` do hero hned za rychlou poptávku (`#hero-rychla-poptavka`). Dnes je to zastávka Tabu 20 při 1280 px a 13 při 390 px, tedy dřív než cokoli ze sekce `#spot`. Na dalších stránkách s pohybem v první obrazovce (`/akce/`) stačí patička a ovládání videa (níže).
      - Popisek se nemění, stav nese `aria-pressed` a vzhled (ikona `⏸`/`▶` s `aria-hidden`).
      - `hidden` odebere až `pristupnost.js`. Bez JS se tlačítko nezobrazí, protože by nefungovalo.
    - **`nastavPohyb(omezit)`:**
      - uloží `localStorage['hspg-pohyb']` (`omezeny` / smazat, vše v `try/catch`) a nastaví `data-pohyb` na `<html>`,
      - synchronizuje všechna tlačítka a vyšle `document.dispatchEvent(new CustomEvent('hspg:pohyb'))`,
      - při zapnutí pozastaví všechna `video[data-autoplay-motion], video[data-autoplay-view]` a nastaví jim `controls`.
      - Funkce `omezenyPohyb()` vrací `true`, pokud je `data-pohyb="omezeny"` **nebo** platí `prefers-reduced-motion: reduce`.
    - **CSS:**
      - Každý blok `@media (prefers-reduced-motion: reduce) { … }`, který vypíná dekorace, zkopíruj i se selektorem `html[data-pohyb="omezeny"] …`. Na `/` jsou to ř. 106–118 (`.vpluj`, `#ritual`, `#cteni`, `[style*="animation:padMech"]` …, `.moss-field`), dál `.pas__track`, `.btn-lux::after`, `brand.css` ř. 55 a `holub-let.css`.
      - K tomu záchranná síť:
        ```css
        html[data-pohyb="omezeny"] *, html[data-pohyb="omezeny"] *::before, html[data-pohyb="omezeny"] *::after {
          animation-duration: .01ms !important; animation-delay: 0s !important; animation-iteration-count: 1 !important;
          transition-duration: .01ms !important; scroll-behavior: auto !important; }
        ```
    - **JS:** všechna místa s `matchMedia('(prefers-reduced-motion: reduce)')` (`hstone-rain.js` ř. 10, `video-autoplay.js` ř. 8, `holub-let.js` ř. 71, `en-sections.js` ř. 6, inline `/` ř. 2074) přepni na `HSPGA11y.omezenyPohyb()` se zálohou na `matchMedia`, pokud helper chybí.
      - Na `hspg:pohyb` musí `hstone-rain.js` plátno zastavit a odstranit a videa se pozastavit.
      - Při vypnutí přepínače se videa ve viewportu znovu spustí přes stávající `IntersectionObserver`. Déšť může naběhnout až po dalším načtení stránky (zdokumentuj).
    - **Bez přepínače (třpytky):** `.btn-gold::after` (`brand.css`) a `.btn-lux::after` (`/`) poběží celkem nejvýš 5 s (počet průběhů × délka ≤ 5 s, např. 1 průběh) a znovu při `:hover`/`:focus-visible`. Spot na `/akce/` (`video.spotvid`) dostane trvale `controls`.
15. **Omezený pohyb (B2).**
    - `scroll-behavior:smooth` (`brand.css` ř. 23, `index.html` ř. 50 pro `html, body`, `en.html` ř. 39) přesuň do `@media (prefers-reduced-motion: no-preference) { html:not([data-pohyb="omezeny"]) { scroll-behavior: smooth } }`.
    - Všechna volání `behavior:'smooth'` (`/` ř. 2008, `pas-domu` ř. 311, `recenze/` ř. 239) nahraď `behavior: HSPGA11y.chovaniPosunu()` se zálohou.
    - Handler kotev (ř. 2391) a odkaz na přepis spotu (ř. 2033) už obsluhuje `dojedNaCil` z úkolu 17. Funkci nepřepisuj, jen její volbu pohybu („`smooth` jen bez `prefers-reduced-motion`“) nahraď `HSPGA11y.chovaniPosunu()` se zálohou na `matchMedia`. Testy kotev úkolu 17 musí projít.
    - Nápověda „☂ klikněte kamkoliv — …“ (`/` ř. 1215) bude výchozí `hidden` a zobrazí ji až `hstone-rain.js`, když efekt opravdu běží. Při `hspg:pohyb` ji zase skryje. Text neměň.
16. **Landmarky (B3).**
    - Ověř axe `region` na všech typech stránek.
    - Pokud po úkolu 08 zůstává: sticky blok homepage obal do `<header>` (promo pruh patří dovnitř), menu do `<nav aria-label="Hlavní navigace">`. Mobilní varianta má stejný název (ne „Mobilní navigace“), protože je vidět vždy jen jedna.
    - Oprav to ve sdíleném partialu, ne v jedné stránce.
17. **ARIA (B4).**
    - `#hero-rychla-poptavka`, `.spot-meta`, `.pas` a `.dove-steps` dostanou `role="group"` (nebo odstraň `aria-label`, pokud skupina nic nepřidává). Text neměň.
    - `/kalkulacka-svj`: `.odklad` → `<section aria-labelledby="odklad-nadpis">` (s krokem 18).
    - Hotspoty `.damage-hotspot` (`/` i `/en`, JS `index.html` ř. 2127 a `en-sections.js` ř. 26):
      - místo `aria-pressed` použij třídu `is-active` (CSS `index.html` ř. 1000 `[aria-pressed="true"]` → `.is-active`),
      - mrtvý `keydown` (ř. 2143, `en-sections.js` ř. 39) odstraň,
      - hotspoty zůstanou zkratkou pro myš, klávesnice používá záložky.
    - Záložky `.dg-tabs` doplň podle vzoru WAI-ARIA Tabs:
      - každá záložka dostane `id` a `aria-controls` → panel s detailem (`role="tabpanel"`, `aria-labelledby` = aktivní záložka, `tabindex="0"`),
      - roving `tabindex` (aktivní 0, ostatní −1),
      - klávesy ←/→ s cyklením, Home/End, aktivace hned při posunu šipkou,
      - totéž na `/en`.
18. **Nadpisy (B10).** Mění se jen typ prvku, texty ne (úkol 13). Třídy a vzhled zůstanou, výchozí styl nadpisu vynuluj (`margin:0; font:inherit`).
    - `/kalkulacka-svj`: `div.result-title` (2×) → `h2.result-title`, „VAŠE ÚSPORA“ → `h2.saving-title`, `#odklad-nadpis` → `h2`.
    - `/pas-domu`: `div.history-title` → `h2` ve statické ukázce i ve výsledku, který vykresluje JS.
    - Test osnovy: na žádné stránce se nepřeskakuje úroveň.
19. **Kontrast (B7, B8).** Hodnoty jsem 4. 10. přepočítal vůči `rgb(12,18,30)` a `rgb(11,26,43)`. Barvy dej jako tokeny do sdíleného CSS (úkol 08):
    - okraj polí `rgba(201,169,98,.7)` (≈ 4,4–4,6 : 1) nebo `#9c8450` (≈ 4,9–5,2 : 1): `brand.css` `.field input/select/textarea`, `/recenze/` ř. 45, `/pas-domu` `.lookup input`,
    - nevybraná hvězdička `#7d6c45` (≈ 3,4–3,7 : 1) nebo světlejší,
    - `#spot p` `#a9b1bc` (5,3 : 1 na `#1E3A5F`).

    Pokud úkol 08 změnil pozadí, přepočítej. Test počítá kontrast z computed stylů (alfa smíchaná s nejbližším neprůhledným pozadím předka, gradienty se ignorují; zapiš to do komentáře testu).
20. **Dotykové cíle (B9).** Samostatné ovládací prvky ≥ 44×44 px na 390 i 1280 px. Odkazy uvnitř věty, skryté radio inputy a H-BOT (úkol 01) jsou výjimky.
    - FAQ `summary`: `min-height:44px` a zarovnání,
    - kontakty v hero, odkazy patičky, `/en` „CZ“: `padding`/`min-height` (patička je sdílená z 08, uprav ji tam),
    - posuvníky `#kalk-obvod`, `#kalk-vyska`, `#roky-posuvnik`: výška 44 px přes `padding`,
    - souhlasové checkboxy: celý řádek je `<label>` (klik na text zaškrtne) s `min-height:44px`,
    - odkaz loga na `/cenik`: 44×44.
21. **320 px a na šířku (B5, B6)** ve sdílené hlavičce z úkolu 08:
    - **320×640:** tlačítko menu `flex-shrink:0`. Pokud se nevejde, pod 380 px skryj podnázev značky nebo povol zalomení (podnázev je i v `alt` loga).
    - **`@media (max-height: 500px) and (orientation: landscape)`:**
      - hlavička není sticky (`--hlavicka` = 0),
      - promo pruh jen nahoře stránky,
      - cookie lišta je v toku dokumentu nahoře (`position: static; max-width: none; margin: 8px`). Díky kroku 6 je v DOM hned za skip linkem, takže nic nezakrývá.
    - Ověř, že tím nevzniká CLS v Lighthouse (měří na výšku).
22. Celkové ověření:
    - axe ve všech stavech, úplný průchod Tabem (bez `A11Y_RYCHLE`), Lighthouse před a po,
    - `node scripts/build-hbot.mjs --kontrola` a ostatní `--kontrola` skripty z předchozích úkolů, všechny testy webu,
    - náhled `npm run nahled` (= `node scripts/nasadit.mjs` bez parametrů, 0 kreditů) a na něm průchod Tabem na `/`, `/akce/`, `/kalkulacka-svj`,
    - **hlášení fáze B**.

    Produkce jen po schválení majitelem, v dávce s dalšími úkoly (KONTEXT §4 bod 4).

## Akceptační kritéria
Fáze A:
- [ ] `node --test tests/pristupnost-staticke.test.mjs` projde. Kontroluje:
  - každá HTML v `$PUB` (kromě `rd-control-panel/`, `ai-centrum/` a `offline/`) načítá `pristupnost.js` (i s otiskem z úkolu 07) právě 1× a sdílené CSS s pravidlem `:focus-visible`,
  - první prvek `<body>` je skip link na existující `id` (včetně `/en`; mimo stejné výjimky),
  - žádný interní `a[target=_blank]` (v HTML ani v řetězcích HTML v JS) není bez textu „v novém okně“ / „new window“,
  - v `<head>` je nejvýš jeden inline skript s kódem z tohoto úkolu (řádek volby pohybu) a `tests/vykon/staticke.test.mjs` (úkol 07) projde.
- [ ] Průchod Tabem (všechny typy stránek z kroku 3, 390×844 i 1280×800, `reducedMotion: 'no-preference'`, cookie volba uložena), obě měření u každé zastávky:
  - 0 zastávek mimo viewport,
  - 0 zastávek se `zakryti ≥ 0,5`,
  - 0 zastávek s `outline-style: auto|none` bez `box-shadow` (mimo seznam výjimek v testu).
- [ ] Cookie lišta při první návštěvě (všechny typy, obě šířky):
  - „Přijmout“ je nejpozději 3. zastávka, „Jen nezbytné“ nejpozději 4.,
  - při Tabu přes stránku s otevřenou lištou 0 zastávek se `zakryti ≥ 0,5` způsobeným `#souhlas-lista`,
  - Escape v liště uloží `nezbytne` a nevznikne požadavek na `googletagmanager`/`clarity`,
  - po znovuotevření přes „Nastavení cookies“ zavře Escape lištu bez změny a fokus je na tomto odkazu,
  - po každé volbě `document.activeElement !== document.body`.
- [ ] `/akce/` 390×844: `#tel` a `#pozn` po fokusu celé nad `#hspg-lista`.
- [ ] Mobilní menu (390 px, každá šablona s menu):
  - Escape menu zavře a fokus je na jeho tlačítku,
  - klik na položku menu zavře,
  - klik mimo menu zavře,
  - Tab z poslední položky menu zavře.
- [ ] Podklad SVJ: 10× Tab i 10× Shift+Tab zůstane v `.sp-overlay`. Escape ho zavře z libovolného prvku i po kliknutí do listu. Po zavření má fokus `#tisk-kalkulace`. Při otevření mají ostatní potomci `body` `inert`.
- [ ] Scéna holuba (`HSPGHolub.play({sky:false})` na `/`, bez reduce):
  - 5 s po spuštění je `document.activeElement` uvnitř `#hspg-dove-scene`,
  - 10× Tab i Shift+Tab scénu neopustí,
  - Escape ji zavře a fokus se vrátí na původní prvek.
- [ ] Spot a H-BOT (regrese): Escape zavře a fokus je zpět na spouštěči. S otevřeným menu a cookie lištou zavře jeden Escape jen vrchní překryv.
- [ ] axe `/` 390 px: 0 `scrollable-region-focusable`. `.povrchy__row` má po Tab + ArrowRight větší `scrollLeft`. Při 1280 px není v Tab pořadí.
- [ ] `/en`: 1. zastávka je skip link a Enter přesune fokus do `<main>`. Při 390 px jsou odkazy na sekce dostupné přes menu.
- [ ] Testy úkolů 03 a 17 (včetně kotev) projdou beze změny. `git grep -nE "scroll-margin-top: ?calc\(var\(--hlavicka" -- '*.html' '*.css' '*.js' '*.mjs'` → nic (odsazení pod hlavičku nese jen `scroll-padding-top`) a `git grep -n -e "--hspg-hlavicka"` → nic. Test zaznamená 0 požadavků jiných než GET/HEAD.

Fáze B:
- [ ] Přepínač pohybu na každé stránce (kromě `rd-control-panel/`, `ai-centrum/` a `offline/`):
  - `button[data-pohyb-prepinac]` s `aria-pressed` je v patičce, na `/` navíc v hero a v pořadí Tabu před prvním prvkem `#spot`,
  - po zapnutí do 1 s `document.getAnimations().filter(a => a.playState === 'running').length === 0`, všechna `video` mají `paused === true` a plátno deště neexistuje,
  - po obnovení stránky platí `aria-pressed="true"` a `data-pohyb="omezeny"`,
  - po vypnutí se video ve viewportu znovu přehrává.
- [ ] Bez přepínače: `.btn-gold::after` a `.btn-lux::after` mají `animation-iteration-count × animation-duration ≤ 5 s` (computed). `video.spotvid` na `/akce/` má `controls`.
- [ ] Emulace `reducedMotion: 'reduce'`: computed `scroll-behavior` na `<html>` je `auto` na všech typech stránek a nápověda „klikněte kamkoliv“ není vidět. Statický test najde 0 literálů `behavior:'smooth'` mimo `pristupnost.js`.
- [ ] axe (všechny typy, 390 i 1280, stavy: výchozí, cookie lišta, menu, podklad SVJ, spot, scéna, H-BOT):
  - 0 porušení `serious`/`critical`, 0 porušení `region`,
  - 0 incomplete `aria-allowed-attr` a `aria-prohibited-attr`,
  - ostatní incomplete (např. `video-caption` u videí bez zvukové stopy) jsou vypsané v hlášení s ručním posouzením.
- [ ] Záložky vizualizace (`/`, `/en`): ←/→/Home/End přepínají. V Tab pořadí je jen aktivní záložka. `aria-controls` vede na existující `[role=tabpanel]`.
- [ ] Osnova nadpisů: `/kalkulacka-svj` má ≥ 4 `h2` (obě varianty, úspora, odklad), `/pas-domu` ≥ 1 `h2`. Na žádné stránce se nepřeskakuje úroveň (test).
- [ ] Kontrast (test): okraje polí na `/akce/`, `/recenze/`, `/pas-domu` ≥ 3 : 1, nevybraná hvězdička ≥ 3 : 1, `#spot p` ≥ 4,5 : 1.
- [ ] Dotykové cíle (test, 390 i 1280): samostatné ovládací prvky ≥ 44×44 px, výjimky jsou v testu s důvodem.
- [ ] 320×640 (všechny typy): `scrollWidth <= innerWidth`, tlačítko menu má `right <= 320`.
- [ ] 740×360 (`/`, `/akce/`): po volbě cookies zabírají fixní a sticky prvky ≤ 90 px. S otevřenou cookie lištou je tlačítko menu nezakryté (`elementFromPoint` ve středu tlačítka vrací tlačítko nebo jeho potomka).
- [ ] Lighthouse mobil (`/`, `/cenik`, `/akce/`, `/cisteni-strech/kolin/`, `/kalkulacka-svj`): přístupnost 100 a výkon nanejvýš −2 oproti stavu před úkolem. Uveď čísla před a po. Pokud některá stránka 100 nedosáhne, hlášení uvede konkrétní audit Lighthouse a důvod.
- [ ] Všechny testy webu a `--kontrola` skripty projdou. `git diff main --stat -- 'assets/hbot*'` je prázdný. Viditelný text `<main>` stránek `/ochrana-osobnich-udaju` a podmínek a reklamací z úkolu 04 je shodný s `main` (statický test porovná `textContent` se soubory z `git show main:…`; přidaný `<script>`, skip link ani tlačítko pohybu v patičce se nepočítají).

## Ověření
```bash
PUB=<publikační adresář z netlify.toml>
# build podle netlify.toml (generátory z předchozích úkolů), pak:
PUB=$PUB node --test tests/pristupnost-staticke.test.mjs                          # → vše prošlo (uveď počet)
node --test tests/vykon/staticke.test.mjs                                         # → projde (úkol 07, výjimka jen pro řádek pohybu)
A11Y_RYCHLE=1 PUB=$PUB CHROMIUM=<cesta k Chromiu> node --test --test-concurrency=1 tests/e2e/pristupnost.e2e.test.mjs
PUB=$PUB CHROMIUM=<cesta k Chromiu> node --test --test-concurrency=1 tests/e2e/pristupnost.e2e.test.mjs   # úplný běh (~10–15 min)
git grep -nE "behavior: ?'smooth'" -- '*.html' 'assets/*.js' ':!assets/pristupnost.js'   # → nic
git grep -n 'target="_blank"' -- '*.html' 'assets/*.js'                           # → jen odkazy s upozorněním nebo externí
node scripts/build-hbot.mjs --kontrola                                            # → kód 0 (úkol 01)
```
Do `package.json` webu přidej `"test:a11y": "node --test --test-concurrency=1 tests/e2e/pristupnost.e2e.test.mjs"` a `"test:a11y:rychle"` s `A11Y_RYCHLE=1`.

Testy, které přidáš:
- `tests/e2e/a11y-pomocne.mjs`: server, kontext s blokací externích a ne-GET požadavků, `axe`, `pruchodTabem`, `zakryti`, výpočet kontrastu, osnova nadpisů.
- `tests/e2e/pristupnost.e2e.test.mjs`: vše z akceptačních kritérií. Cookie lišta se testuje v novém kontextu bez `localStorage`. Ostatní průchody mají předem uloženou volbu: `ctx.addInitScript(() => localStorage.setItem('hspg-souhlas', 'nezbytne'))` (klíč a hodnoty jsou v `souhlas.js` ř. 13, pokud je úkol 10 nezměnil). Mezi kroky nic neodesílej. Scénu holuba spouštěj přes `HSPGHolub.play({sky:false})`, podklad SVJ přes Enter na `#tisk-kalkulace`, spot přes `[data-action="otevriSpot"]` a H-BOT přes jeho tlačítko (1280 px) nebo položku „Zeptat se“ v liště (390 px).
- `tests/pristupnost-staticke.test.mjs`: načtení skriptu a CSS, skip linky, `target=_blank`, literály `behavior:'smooth'`, `scroll-behavior:smooth` jen uvnitř `prefers-reduced-motion: no-preference`.

Na náhledu (GET, nic neodesílat): `curl -s <náhled>/ | grep -cE 'pristupnost(\.[0-9a-f]+)?\.js'` → 1. `curl -s <náhled>/ | grep -c 'href="/akce/" target="_blank"'` → 0. Průchod Tabem ručně na `/`, `/akce/` a `/kalkulacka-svj` (360 a 1280 px) se snímky do hlášení. Čtečku obrazovky agent neověří, viz hlášení.

## Bez AI / s AI
Úkol AI nepoužívá a vše funguje bez AI i bez externích služeb. H-BOT (úkol 01) je v testu jen jako regresní kontrola Escape a návratu fokusu. Odpověď z FAQ k tomu stačí a `/api/*` test nevolá.

## Nepřekročitelná pravidla
Viz `balicek/KONTEXT.md` §4. Pro tento úkol navíc:
- **Žádné nové obsahové texty ani tvrzení.** Přibývají jen ovládací a přístupnostní popisky: „Zastavit animace“ / „Pause animations“, „(otevře se v&nbsp;novém okně)“ a anglický skip link. Česky s nezlomitelnou mezerou po jednopísmenných předložkách (§4 bod 9).
- Logiku souhlasu, kategorie a texty cookie lišty neměň (úkol 10). Escape smí znamenat jen „Jen nezbytné“, nikdy souhlas.
- `localStorage['hspg-pohyb']` je jen volba návštěvníka (technicky nezbytné úložiště na jeho žádost), žádné měření. Předej úkolu 09 k uvedení v zásadách.
- Soubory H-BOTu z úkolu 01 neměň. Nález v nich patří do hlášení.
- Testy nikdy neodesílají formuláře (POST se blokuje a test hlídá, že žádný neproběhl). Scény a dialogy se spouštějí přes JS API.
- Žádné přístupnostní widgety ani skripty třetích stran. Žádné nové externí zdroje.
- Výkon: změny `content-visibility` jen s měřením Lighthouse před a po (úkol 07). Pojistka fokusu nesmí běžet při myši (`:focus-visible`).
- Produkce jen po schválení majitelem, v dávce, přes `node scripts/nasadit.mjs`.

## Hlášení po dokončení
Po **fázi A** i **fázi B** formát z `KONTEXT.md` §5 a k tomu:
- tabulku před a po pro každý typ stránky a obě šířky: počet zastávek, mimo viewport, zakryté ≥ 50 %, výchozí indikátor, pozice „Přijmout“ v pořadí Tabu,
- axe před a po (porušení podle dopadu, incomplete s ručním posouzením, zvlášť `video-caption`),
- Lighthouse mobil před a po (přístupnost, výkon, CLS) pro 5 stránek z kroku 13,
- seznam změněných souborů, počty testů, inventuru z kroku 2 a odkaz na náhled se snímky průchodu Tabem.
- Předávky:
  - **07:** změny `content-visibility` a jejich vliv na výkon, výjimka pro inline řádek pohybu v `tests/vykon/staticke.test.mjs` a nový soubor s otiskem `pristupnost.js`,
  - **08:** případy `todo` kvůli plovoucím prvkům nebo hlavičce,
  - **09:** úložiště `hspg-pohyb`,
  - **10:** nové umístění cookie lišty, Escape = „Jen nezbytné“ a test, který musí dál projít,
  - **15:** hash inline řádku v `<head>` pro vynucenou CSP,
  - **17:** `scroll-padding` a kotvy (odstraněné `scroll-margin-top`, měření `--hlavicka` v `pristupnost.js`, volba pohybu v `dojedNaCil`),
  - **18:** odstraněné `target=_blank` u CTA na `/akce/`,
  - **19:** `npm run test:a11y:rychle` do CI na každý PR,
  - **01:** `.hb-close` a `.hb-chip` mají 40 px (< 44 px).
- Neověřeno: čtečky obrazovky (NVDA, VoiceOver, TalkBack), Safari a Firefox, skutečná zařízení. Navrhni majiteli (nebo Claude v Chrome) desetiminutovou ruční kontrolu na náhledu: Tab přes `/` a `/akce/`, otevřít a zavřít menu, cookie lištu a podklad SVJ, zapnout přepínač pohybu.
- Návrhy mimo rozsah: audit-formulare #7 (průvodce jako `<form>`, Enter), #16 (inline chyby s `aria-invalid`/`aria-describedby` a souhrn chyb), #17 (`aria-pressed` u výběru služby), pokud je nevyřešil úkol 17 (úkol 18 běží až po tomto úkolu, předej mu je). Dál režim `forced-colors` (ruční kontrola).
