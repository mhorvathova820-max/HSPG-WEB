# Úkol 17: Funkční chyby – kotvy na homepage, formuláře, kalkulačky, tisk, offline
> Priorita **P0** (kotvy na homepage, fáze A krok 4) / **P1** (ostatní) · Závisí na: 00 (v pořadí `PORADI.md` běží po 01 a 02, které mění `assets/hbot-panel.js`, `assets/fotky-upload.js` a `/akce/dekujeme/`; jejich stav ověř v kroku 2) · Čeká na majitele: – (jen schválení produkčního nasazení) · Rozsah: opravy funkčních chyb v HTML/CSS/JS bez změny cen, sazeb, záruky a tvrzení; jeden sdílený skript `assets/spolecne.js`; testy. Dvě fáze (A, B), po fázi A hlášení.

## Proč (s důkazy)
Zdroje: audit funkčnosti JS (Playwright nad hspg.cz, 4. 10. 2026), audit formulářů #8, kopie živého webu a GET dotazy na hspg.cz. Kotvy (P0) jsem znovu přehrál v Chromiu nad kopií webu a ověřil i navrženou opravu. Čísla řádků platí pro živý web. Ve zdroji se mohou lišit.

### P0 – hlavní tlačítko na homepage nedovede návštěvníka k formuláři
- Hero CTA „🕊 VYPUSŤTE HOLUBA — CENA DO 24 H“ (`a[href="#holub-sekce"]`, ř. 1207) a dalších 7 odkazů vede na `#holub-sekce` (celkem 8: ř. 1207, 1223–1227, 1304, 1885). Na `#predpo` vedou 4 odkazy (mj. „Před / po“ v menu), na `#sluzby` 3, na `#spot` 1 a na `#obsah` 1. Ve vykresleném DOM je to celkem **17 odkazů s kotvou** (ověřeno v Chromiu nad kopií webu). Další 2 odkazy `href="#"` („Napsat týmu“ s `data-mail`) kotvy nejsou. Pozor: `grep 'href="#holub-sekce"'` najde 10 řádků, protože počítá i 2 selektory CSS (ř. 714 a 718).
- Mimo statické HTML: plovoucí nabídka `#cta-stack` (otevírá ji `#cta-main`) vytváří v JS odkaz „🕊 ODESLAT POPTÁVKU“ na `#holub-sekce` s vlastním `home.scrollIntoView({behavior:'smooth',block:'start'})` (ř. 2007–2008). `/akce/` ř. 95 odkazuje na `/#spot-prepis` (`<details>` uvnitř `#spot`, ř. 1276) a inline skript ř. 2032–2033 posouvá na přepis spotu.
- **Příčina:** ř. 590 `[data-cv] { content-visibility:auto; contain-intrinsic-size:auto 1400px; }` platí pro 11 prvků (ř. 1259–1703). Nad cíli kotev leží `#spot` (ř. 1259), `#sluzby` (ř. 1308) a pruh `.pas` (ř. 1379), který má po vykreslení asi 51 px místo odhadovaných 1 400 px. Během posunu se tyto sekce vykreslí, zmenší se a cíl uteče nahoru. Druhý klik už funguje, protože prohlížeč si skutečnou výšku pamatuje (`auto`).
- Handler ř. 2391 `a[href^="#"]` zavolá jednou `scrollIntoView({behavior:'smooth',block:'start'})`. Polohu po dojetí nedorovná a nebere ohled na `prefers-reduced-motion`. Deep link `/#holub-sekce` řeší jen prohlížeč a skončí stejně špatně.
- Sticky hlavička (ř. 1137) je vysoká 126–127 px. Cíl zarovnaný na `block:'start'` tak zajede pod ni, protože chybí `scroll-margin-top`.

| Měření (čerstvé načtení, první klik, 3 s po kliku) | `#holub-sekce` top | `#hspg-form-panel` top |
|---|---|---|
| 1366×900, živý stav | **−1 849 px** | **−1 446 px** (formulář je celý nad obrazovkou) |
| 375×812, živý stav | −393 px | 395 px (vidět jen náhodou) |
| 1366×900, `data-cv` odebrané z `#spot`, `#sluzby`, `.pas` | 0 px | 400 px |
| 375×812, `data-cv` odebrané z `#spot`, `#sluzby`, `.pas` | 0 px | 791 px (tlačítko průvodce je pod okrajem) |

Audit dále naměřil: 1920×1080 −1 351/−948 px, 1280×720 −1 849/−1 446 px, s `prefers-reduced-motion` −1 751/−1 348 px, deep link −1 849 px a „Před / po“ na desktopu −498 px.

Na mobilu je mezi začátkem `#holub-sekce` a tlačítkem „🕊 VYPUSŤTE HOLUBA“ v průvodci 882 px obsahu. Samotná oprava kotvy tedy na mobilu nestačí (krok 4c).

### Fáze A – formuláře a drobné chyby
| Nález | Důkaz (živý web) |
|---|---|
| **Validace telefonu a e-mailu** (funkčnost #3, formuláře #8): čtyři různá pravidla, na jednom místě chybí úplně | `/` průvodce ř. 1935 `phoneOk` `^(?:\+420\|00420)?[6-7]\d{8}$` odmítne pevnou linku „224 123 456“, „+421 905 123 456“ i „+49 151 23456789“ s hláškou „Zadejte platné české telefonní číslo.“ · `/akce/` ř. 119 `#tel` (`type=tel`, bez `pattern`, bez kontroly v JS → „abc“ projde) a ř. 122 `#mail` (`type=email` → „audit@example“ projde) · `/assets/fotky-upload.js` ř. 67 `^\+?\d{9,15}$` (podle telefonu se fotky přiřazují k poptávce) · `/recenze/` ř. 187 `#kontakt` („Telefon nebo e-mail“, nepovinné) bez kontroly · nový H-BOT z úkolu 01 (`balicek/web/assets/hbot-panel.js` ř. 224) `^\+?\d{9,15}$` |
| **Plocha v průvodci** (#16) | ř. 2198 `type=number`, `min=0`, `max=999999`, ale průvodce nevolá `checkValidity`. Projde „-50“ i „1e9“ a z „12,5“ se stane „125“ (Chromium, locale cs-CZ, audit) |
| **Maska kódu HS-RRRR-ČČČČ** (#20) | `pas-domu.html` ř. 236 a 323, `/recenze/` ř. 252 a 267: hodnota se přepisuje při každém `input` a kurzor skočí na konec. Oprava číslice uprostřed fiktivního kódu „HS-2099-0001“ (kurzor za „HS-20“, `Delete`, „5“) dá „HS-2090-0015“ místo „HS-2059-0001“. V zadání, testech i fixturách používej jen fiktivní kódy `HS-2099-…` (úkol 14: `git grep "HS-2026-0001"` → 0, mohl by to být skutečný kód) |
| **`/akce/dekujeme/` bez poptávky** (#18) | inline skript ř. 120 `else prehrat();` spustí scénu „Holub vyletěl“ při každém otevření i reloadu, i bez údajů v `sessionStorage`. Scéna má `z-index:4000` (`holub-let.css` ř. 8), cookie lišta 90 (`souhlas.js` ř. 99), takže lištu pod scénou nejde ovládat |
| **Odkaz na Facebook** (#23) | `https://www.facebook.com/share/1ERehBQGsC/` je 6× ve 4 souborech: `index.html` ř. 45 (JSON-LD `sameAs`), 1715 a 1897, `en.html` ř. 35 (JSON-LD), `reference.html` ř. 154 a `kariera.html` ř. 180. GET vrací 302 na `https://www.facebook.com/HolubSurfaceProtection?rdid=…&share_url=…` |
| **`${VIDEO_SPOT}` v HTML – podezření ze zadání se nepotvrdilo** | `index.html` ř. 2023 obsahuje `${VIDEO_POSTER}`, `${VIDEO_SPOT_MOBILE}` a `${VIDEO_SPOT}` uvnitř JS template literálu (``o.innerHTML=`…` ``) a konstanty jsou definované na ř. 1923–1925. Prohlížeč takové adresy nestahuje: Lighthouse network-requests (mobil 39, desktop 41 požadavků) neobsahuje žádné `%7B`. Ve 247 HTML je mimo `<script>` **0** výskytů `${`. Uvnitř `<script>` je jich 34 ve 3 souborech (`/`, `/kalkulacka-svj.html`, `/pas-domu.html`) a všechno jsou legitimní JS interpolace. Falešný nález vznikl regexovým výpisem `.mp4` z HTML. Hrozí ale, že kontrola „výstup neobsahuje `${`“ z úkolu 19 bude hlásit planý poplach (krok 11) |

### Fáze B – kalkulačky, tisk, offline, CSP, plátno
| Nález | Důkaz (živý web) |
|---|---|
| **Tisk podkladu SVJ přes Ctrl+P / „Sdílet → Tisk“** (#6) | `svj-podklad.css` ř. 66–71: tisková pravidla platí jen pro `html.sp-print`. Třídu přidá jen tlačítko v overlayi (`svj-podklad.js` ř. 132) a odebere ji `afterprint` nebo časovač 60 s (ř. 133–136). Nápověda ř. 120 přitom radí „Na telefonu: Sdílet → Tisk → Uložit PDF“. Ověřeno: při otevřeném overlayi (`html.sp-open`) bez `sp-print` se v tiskovém režimu ukazuje `.sp-bar` i 3 další prvky stránky. Audit: PDF s ovládacím panelem, opakováním a useknutou sekcí 2 |
| **„Odklad rozhodnutí prodraží o“** (#9) | `kalkulacka-svj.html` ř. 394 počítá `classicLater − rounded(last.classic)`, tedy z **varianty s lešením**, a v textu to není uvedené. Výchozí stav (80 m, 6 podlaží, 6,4 %, 5 let) ukazuje „+ 140 000 Kč“. Pro variantu HSPG (186 460 Kč dnes, ≈ 254 000 Kč za 5 let) je to **+ 68 000 Kč** (přepočteno enginem `ceny.js`). Tištěný podklad přebírá stejný řádek (`svj-podklad.js` ř. 76–81) |
| **Součty v kalkulačce SVJ** (#10) | V **495 z 2 052** kombinací (obvod 30–200 m × podlaží 2–13) platí `hspg-output + mask-output ≠ hspg-total-output` (přepočteno enginem). Příklad 30 m × 2: 22 008 + 2 620 = 24 628, ale Celkem je 24 630 Kč. Zaokrouhlení na desítky se promítá jen do řádku slevy, který je bez slevy skrytý. Ve 247 kombinacích je rozdíl záporný a skrytý `#sleva-output` obsahuje „− -2 Kč“. Komentář ř. 362 přitom slibuje, že řádky vždy sečtou na Celkem |
| **Skloňování** (#11) | Homepage ř. 2348–2349 `y+' let'` dává „1 let“ až „4 let“ v textu i v `aria-valuetext` (posuvník `#roky-posuvnik` 0–10). `pas-domu.html` ř. 245–249 `zbyva()` dává „1 roky“, „1 dní“ a „2 dní“. Kalkulačka SVJ má správnou funkci `let_` (ř. 377) |
| **Nuly ve statickém HTML** (#12) | Homepage ř. 1594–1596: `.citac` s `data-cil` 24 / 0 / 2 má v HTML text „0 h“, „0 Kč“ a „0×“. Skutečnou hodnotu doplní až animace (ř. 2360 a dál). Tisk bez scrollu, uživatelé bez JS i crawlery tak vidí „0 h od adresy k ceně“ a „0× ročně servis“. `kalkulacka-svj.html` ř. 254–284 má všechny výsledky „—“ |
| **Tisk: lišty a plovoucí prvky** (#13) | Ověřeno emulací tisku na `/cenik.html`, `/cisteni-strech/kolin/`, `/akce/` a `/`: `#souhlas-lista` má `display:block` a `#hbot-btn` `display:flex`, na `/` navíc `#reel-bublina` a `canvas.hstone-rain` `block`. `souhlas.js`, `hbot.js` ani `brand.css` nemají `@media print`. `souhlas.js` je na všech 247 stránkách, `brand.css` chybí na 8 z nich. Pozor: `souhlas.js` vkládá svůj `<style>` jen ve funkci `banner()` (ř. 78–110), tedy jen když se lišta ukazuje. Po volbě „Přijmout“ / „Jen nezbytné“ se při dalším načtení žádné jeho CSS nevloží. Audit: na `/cisteni-strech/kolin/` lišta „Vaše soukromí“ zakrývá ceny, homepage má v tisku 19 stran a 7 MB |
| **Offline ukazuje 404** (#14) | `sw.js` ř. 11–14 předukládá jen `/404.html` a `/manifest.webmanifest`. Navigace offline (ř. 52–54) vrací uloženou stránku, jinak `/` a jinak `/404.html` („Stránka nenalezena \| Tahle stránka odletěla.“). `GET /offline.html` → 404. Podle komentáře ř. 7 razítkuje verzi SW `scripts/build-site.mjs` do `dist/sw.js` (ověř ve zdroji) |
| **CSP bez `blob:`** (#15) | `GET /akce/`: `content-security-policy-report-only: … img-src 'self' data: https://*.clarity.ms …` bez `blob:`. Zmenšování fotek používá `URL.createObjectURL` (`/akce/` ř. 217, `fotky-upload.js` ř. 24). Po vynucení CSP (úkol 15) by nahrávání fotek přestalo fungovat |
| **Plátno `hstone-rain` na mobilu** (#21) | `hstone-rain.js` ř. 26–39 `resize()` bere celou výšku hera (mobil 375×2 242 CSS px), CSS `.hstone-rain{inset:0;height:100%}` (homepage ř. 376). Plátno se kreslí, dokud je vidět aspoň 5 % hera (ř. 150), i když první obrazovka už je odscrollovaná. Na desktopu je hero vysoké 964 px (1280×720, 1366×900 i 1920×1080), vejde se tedy jen na 1920×1080. Skript plátno vůbec nevytvoří při `prefers-reduced-motion`, `saveData` nebo `hardwareConcurrency < 3` (ř. 10–13) |

## Cíl (měřitelný)
1. **P0:** Na čerstvě načtené homepage první klik na kterýkoli odkaz na `#holub-sekce` (i deep link `/#holub-sekce`) ukáže tlačítko „🕊 VYPUSŤTE HOLUBA“ v průvodci celé pod hlavičkou. Platí pro 375×812, 1280×720, 1366×900 i 1920×1080, s plynulým posunem i s `prefers-reduced-motion`. U ostatních kotev je horní hrana cíle 0–80 px pod hlavičkou.
2. Jedna sdílená validace telefonu, e-mailu a plochy (`assets/spolecne.js`) na `/`, `/akce/`, `/akce/dekujeme/` a `/recenze/`. Stejný vstup dává všude stejný výsledek a poptávka obsahuje telefon v normalizovaném tvaru (`+420XXXXXXXXX`).
3. Kalkulačka SVJ: řádky ve 2 052 z 2 052 kombinací sečtou přesně na Celkem, cena odkladu říká, ke které variantě patří, a výsledky jsou vidět i bez JS.
4. Tisk: žádná lišta ani plovoucí prvek na papíře. Podklad SVJ vypadá stejně přes tlačítko i přes Ctrl+P.
5. Offline: místo „Stránka nenalezena“ se ukáže stránka „Jste offline“ s telefonem.
6. Žádné nové tvrzení. Ceny, sazby, text záruky a sliby („24 h“, „0 Kč za lešení“, „2× ročně“) zůstanou beze změny.

## Rozsah
**ANO:**
- `content-visibility` na homepage a obsluha kotev (handler, deep link, `scroll-margin-top`),
- nový `assets/spolecne.js` (telefon, e-mail, plocha, maska kódu, skloňování) a jeho napojení na `/`, `/akce/`, `/akce/dekujeme/` (`fotky-upload.js`), `/recenze/`, `/pas-domu.html` a `/kalkulacka-svj.html`,
- přehrávání scény na `/akce/dekujeme/` a viditelnost cookie lišty během scény (`holub-let.js`, `souhlas.js` – jen tato vazba),
- odkaz na Facebook všude včetně JSON-LD `sameAs`,
- test výstupu na nenahrazené šablonové proměnné,
- kalkulačka SVJ (řádky, odklad, předvyplnění při buildu) a `svj-podklad.js|css` (řádky, tisk),
- čítače na homepage (jen statický text a start animace),
- tiskové styly plovoucích prvků,
- `sw.js` a nová stránka `/offline/`,
- `blob:` v `img-src` CSP,
- výška plátna `hstone-rain`,
- testy.

**NE (patří jinam):**
- Text a délka záruky, včetně „záruka 10 let“ v `svj-podklad.js`, `kalkulacka-svj.html` a `nabidka-pdf.js` → **úkol 05**. Tyto literály neměň.
- FormSubmit a ztráta fotek při záložním odeslání (funkčnost #4, formuláře #5), e-mailové adresy → **úkol 03**. Na `/akce/` a `/recenze/` měníš jen validaci.
- H-BOT: FAQ, výpadek AI, mobilní dostupnost (funkčnost #7, #8, #19) → **úkol 01** (hotovo). Soubory `assets/hbot*.js|css` neměň.
- Pravdivost obsahu kalkulaček a čítačů: sazby lešení 120/190 Kč/m², „VAŠE ÚSPORA“, výchozí růst cen 6,4 %, „0 Kč za lešení“, „2× ročně servis“ → **úkol 13**. Slib „do 24 hodin“ → **úkol 18**. Opravuješ jen výpočet a popisky, které výpočet nepravdivě popisují.
- Fokus klávesnice v sekcích s `content-visibility`, past fokusu ve scéně „Holub vyletěl“ (#5) a v podkladu SVJ (#17), pořadí a překrývání cookie lišty, CSS `scroll-behavior` při reduced motion → **úkol 16**.
- Výkon `hstone-rain` (časový limit, cache gradientů, `pointer: coarse`), strategie cache v `sw.js` pro CSS/JS, další ladění `content-visibility` → **úkol 07**.
- Vynucení CSP, `report-uri` a další hlavičky → **úkol 15**. Odebrání `formsubmit.co` z `form-action` → **úkol 03**.
- Anglická stránka (#22) → **úkol 18**. Na `/en.html` měníš jen odkaz na Facebook v JSON-LD.
- Zbytek JSON-LD (`legalName`, `@id`, geo) → **úkol 11**. Tady jen URL Facebooku.
- Spouštění kontrol v CI → **úkol 19**. Testy z tohoto úkolu tam jen převezme.

## Postup

### Fáze A – kotvy (P0), formuláře, drobnosti
1. Větev `ukol-17-funkcni-chyby` z aktuální `main` (pravidla v `CLAUDE.md` z úkolu 00).
2. Najdi v repozitáři soubory, které generují:
   - publikační adresář a build (`netlify.toml` `[build] publish` a `command`, `package.json`). Podle `sw.js` vzniká výstup skriptem `scripts/build-site.mjs` do `dist/` (ověř ve zdroji),
   - zdroj homepage: inline CSS s `[data-cv]`, inline skript s `phoneOk`, `focusTarget`, `a[href^="#"]`, `.citac`, `#roky-posuvnik` a `field('hspg-area'…)`,
   - zdroje `akce/index.html`, `akce/dekujeme/`, `recenze/index.html`, `pas-domu.html`, `kalkulacka-svj.html`, `reference.html`, `kariera.html`, `en.html`,
   - `assets/fotky-upload.js`, `svj-podklad.js|css`, `souhlas.js`, `holub-let.js|css`, `hstone-rain.js` a `sw.js`,
   - `scripts/build-ceny.mjs` (generuje `assets/ceny.js` a plní `data-cena`) a další `scripts/build-*.mjs`,
   - místo s CSP (`netlify.toml [[headers]]` nebo `_headers`), existující testy a Playwright v `devDependencies`,
   - stav úkolů 01 a 02 v `main` (existuje `assets/hbot-panel.js`, resp. `assets/poptavka-zdroj.js` a pole `Číslo poptávky` ve formuláři `hspg-fotky`). Jejich změny ve `fotky-upload.js` a na `/akce/dekujeme/` zachovej a stav zapiš do hlášení.

   Pak `git grep -nE "data-cv|phoneOk|emailOk|maskuj|prehrat\(\)|facebook\.com/share|' let'|zbyva|citac|404\.html|img-src|hstone-rain"` (mimo `node_modules`). Inventuru ulož do hlášení a porovnej s tabulkami v části Proč.
3. **Výchozí stav a test napřed.**
   - Změř Lighthouse homepage (mobil i desktop, 3 běhy, medián výkonu a CLS) **ve stejném prostředí, ve kterém budeš měřit po změně**: lokální statický server nad `$PUB` sestaveným z aktuální `main` (nebo náhled z `main`). Produkci (jen GET) změř navíc jen orientačně. Prostředí a verzi Lighthouse zapiš do hlášení.
   - Napiš e2e test kotev (sekce Ověření) a ukaž, že **na současném stavu selže**. Výsledek dej do hlášení.
4. **Kotvy (P0)** – ve zdroji homepage:
   - a) Odeber `data-cv` z `#spot`, `#sluzby` a `.pas`. Ověřeno v Chromiu: cíle pak skončí na 0 px na 375 i 1366 px. U zbývajících 8 prvků `data-cv` ponech. K pravidlu ř. 590 napiš komentář: „Žádný prvek s `data-cv` nesmí ležet v pořadí dokumentu nad cílem kotvy (hlídá test).“
   - b) `scroll-margin-top` pro cíle kotev podle výšky sticky hlavičky:
     - CSS proměnná `--hlavicka` s výchozí hodnotou `130px` (funguje i bez JS),
     - JS ji nastaví ze skutečné výšky hlavičky (`ResizeObserver`),
     - pravidlo např. `main [id]{scroll-margin-top:calc(var(--hlavicka) + 8px)}`.
   - c) Handler ř. 2391 nahraď funkcí `dojedNaCil(el, plynule)`:
     - pohyb: `smooth` jen bez `prefers-reduced-motion`, jinak `auto`,
     - zarovnání pod hlavičku přes `scroll-margin-top`,
     - **výjimka `#holub-sekce`:** pokud se od začátku sekce po spodní hranu prvního tlačítka v `#hspg-form-panel` obsah nevejde do `innerHeight − výška hlavičky − 16 px` (dnes mobil 882 px > 670 px), zarovnej místo sekce panel průvodce. Na desktopu (494 px) zůstane zarovnání na nadpis sekce. Bez JS panel neexistuje a `href="#holub-sekce"` funguje nativně,
     - dorovnání: po `scrollend` (záloha 2× `requestAnimationFrame` + 800 ms) změř odchylku. Je-li větší než 4 px, zarovnej znovu s `behavior:'auto'`, nejvýš 3×. Skonči, pokud stránka už dál scrollovat nemůže,
     - fokus jako dnes (`focusTarget`, `preventScroll`),
     - stejnou funkci použij pro odkaz na přepis spotu (ř. 2033) a pro odkaz „🕊 ODESLAT POPTÁVKU“ v `#cta-stack` (ř. 2007–2008): jeho vlastní `scrollIntoView` nahraď voláním `dojedNaCil` (s `preventDefault`), aby na cíl nemířily dva posuny najednou. Handler musí fungovat i pro odkazy vytvořené až po načtení (delegace na `document` místo `qsa(...).forEach`),
     - při načtení s `location.hash` a při `hashchange` zavolej totéž bez animace, po `load` a ještě jednou po `document.fonts.ready`.
   - d) Pokud Lighthouse mobil klesne o víc než 2 body, zkus místo odebrání `data-cv` realistické `contain-intrinsic-size` pro tyto 3 prvky (změřené na 375 a 1366 px). E2E kritéria kotev musí projít v obou variantách. Ve variantě d se mění jen statická kontrola: test výstupu „žádný `data-cv` nad cílem kotvy“ nahradí kontrola, že každý takový prvek má vlastní `contain-intrinsic-size` místo obecných 1400 px, komentář k ř. 590 tomu odpovídá a `grep … data-cv` z Ověření dá 11 místo 8. Volbu zdůvodni čísly v hlášení.
5. **`assets/spolecne.js`** – jediný zdroj pomocných funkcí, bez závislostí:
   - UMD: `window.HSPG_SPOLECNE` a `module.exports`, aby šel testovat v Node,
   - velikost do 3 KB,
   - každá funkce vrací objekt a nikdy nevyhazuje výjimku.
   - `telefon(v)` → `{ ok, hodnota, chyba }`:
     - odstraní mezery, `-`, `.`, `/`, `(` a `)`; počáteční `00` převede na `+`,
     - `+420` nebo bez předvolby: přesně 9 číslic, první 2–9 → `+420XXXXXXXXX`,
     - `+421`: přesně 9 číslic → `+421XXXXXXXXX`,
     - jiná předvolba: E.164 `+[1-9]` a celkem 8–15 číslic,
     - předvolby +420 a +421 se kontrolují **přesně** a obecné E.164 pro ně neplatí (jinak by prošlo „+420 736 618 4867“),
     - hláška: „Zkontrolujte prosím telefon – 9 číslic, např. 736 618 486, případně s předvolbou (+420, +421 …).“ Jako příklad na webu uváděj jen firemní číslo, nikdy cizí (vymyšlené číslo může někomu patřit). Testovací vektory níže se na web nepíšou.
   - `email(v)` → `{ ok, hodnota, chyba }`: ořízne mezery, jeden `@`, doména s tečkou a TLD aspoň 2 znaky, bez mezer, max. 254 znaků. Hláška „Zkontrolujte prosím e-mail – např. jan.novak@email.cz.“
   - `plocha(v)` → `{ ok, prazdne, cislo, text, chyba }`:
     - mezery ve skupinách číslic se ignorují, desetinná čárka i tečka, max. 2 desetinná místa,
     - rozsah 1–999 999, `e`/`E` a znaménko nejsou povolené,
     - `text` je český zápis bez mezer („12,5“),
     - prázdné pole → `{ ok:true, prazdne:true }` (pole zůstává nepovinné; minimalizace polí patří úkolu 18).
   - `kod(hodnota, kurzor)` → `{ hodnota, kurzor }`: stávající maska HS-RRRR-ČČČČ z `pas-domu.html` ř. 236 a kurzor za stejným počtem číslic jako před úpravou.
   - `sklonuj(n, [jeden, dva_az_ctyri, pet_a_vic])` pro celá čísla: 1 → první tvar, 2–4 → druhý, 0 a 5+ → třetí. Mezi číslo a slovo vlož nezlomitelnou mezeru U+00A0 (v JS `'\u00A0'`, KONTEXT §4 bod 9).
6. **Napojení validace** (hlášky u pole: `aria-invalid="true"`, text přes `aria-describedby`, fokus na pole):
   - `/` průvodce: `phoneOk`/`emailOk` nahraď voláním modulu, chybové UI `chybaPole` zachovej. Do payloadu (ř. 2243 a `sessionStorage` ř. 2227) dej `hodnota` z modulu.
   - `/akce/`:
     - `#tel` dostane záložní `pattern` pro prohlížeč bez JS, např. `[\+0-9 \(\)\-\.\/]{9,20}`. Pattern platí i se zapnutým JS, proto musí být **nadmnožinou** toho, co přijme modul: všechny přijímané vektory z akceptačních kritérií (např. „(+420) 736 618 486“) ním musí projít, jinak je prohlížeč zablokuje dřív než JS. Escapování musí fungovat i s příznakem `v`, který Chromium u `pattern` používá; ověř testem,
     - `#mail` dostane `pattern="[^@\s]+@[^@\s]+\.[^@\s]{2,}"`,
     - v JS před odesláním proveď kontrolu modulem a `setCustomValidity` / hlášku u pole. Do `FormData` dej normalizovaný telefon.
   - `/akce/dekujeme/` (`fotky-upload.js` ř. 67): modul, normalizovaný telefon. Fotky se tak spárují s poptávkou podle stejného tvaru čísla. Pole `Číslo poptávky` a ostatní změny úkolu 02 zachovej. Pokud funkce úkolu 02 (`submission-created`) telefon porovnává nebo zobrazuje, ověř testem, že s tvarem `+420XXXXXXXXX` funguje. Jinak ji neměň, rozdíl jen zapiš do hlášení.
   - `/recenze/` `#kontakt`: prázdné pole je OK. Vyplněné musí být platný telefon nebo e-mail, jinak hláška u pole. Odesílá se normalizovaný tvar.
   - Načtení: `<script src="/assets/spolecne.js"></script>` těsně před první skript, který modul používá (inline skript, na `/akce/dekujeme/` `fotky-upload.js`). Skripty jsou na konci `<body>` a soubor je malý.
   - **Záloha:** pokud `window.HSPG_SPOLECNE` chybí (skript se nenačetl), použij jen minimální kontrolu (aspoň 9 číslic, v e-mailu `@`). Odeslání poptávky nikdy neblokuj kvůli chybějícímu pomocnému skriptu.
   - H-BOT (`hbot-panel.js`, úkol 01) **neměň**. Do testu zařaď jeho pravidlo jako referenci a rozdíly zapiš do hlášení (např. „123 456 789“ H-BOT přijme, modul odmítne).
7. **Plocha v průvodci** (ř. 2198): `type="text"`, `inputmode="decimal"`, `autocomplete="off"`, kontrola modulem `plocha()` s hláškou u pole přes `chybaPole`. Do payloadu jde `text` („12,5“) nebo „neuvedeno“.
8. **Maska kódu** na `pas-domu.html` a `/recenze/`: v obsluze `input` použij `kod(input.value, input.selectionStart)` a `setSelectionRange`. Zachovej dosavadní chování:
   - „hs 2099 12“ → „HS-2099-12“,
   - „20990001“ → „HS-2099-0001“ (jen fiktivní kódy `HS-2099-…`, viz Proč),
   - předvyplnění z `?kod=` na `/recenze/`,
   - ukázkový pas `#ukazkovy-pas`.
9. **`/akce/dekujeme/`:**
   - Scénu přehraj jen tehdy, když `sessionStorage` obsahoval údaje poptávky (`if (raw) prehrat()`). Tlačítko „Přehrát vypuštění holuba“ zůstane. `?fotky=1` se chová jako dnes.
   - Cookie lišta během scény: `holub-let.js` vyšle na `document` události `hspg:scena-otevrena` a `hspg:scena-zavrena`.
   - `souhlas.js` během otevřené scény lištu nezobrazí (nebo ji skryje) a ukáže ji po zavření. Výchozí stav pro lištu je, že consent ještě nepadl, takže se tím nic nespouští dřív.
   - `z-index` ani pořadí fokusu neměň (úkol 16).
10. **Facebook:**
    - Všech 6 výskytů nahraď kanonickou adresou `https://www.facebook.com/HolubSurfaceProtection` bez parametrů, včetně JSON-LD `sameAs` na `/` a `/en.html`.
    - Pokud se HTML generuje, ber adresu z jednoho místa: klíč `facebook` v `content/firma.json` už existuje (převzatý z `balicek/web/content/firma.json`, úkol 01) a má správnou hodnotu. Nový klíč nezakládej.
    - Facebook nepřihlášeným klientům odpovídá přesměrováním na přihlášení, takže kontrola je statická (v HTML není `/share/` ani `?`) a jednou ručně v prohlížeči.
11. **Šablonové proměnné:**
    - Ve zdroji ověř, jestli build používá nějaký šablonovací mechanismus (`${…}`, `{{…}}`, `%…%`) a jestli všechny proměnné nahradí. Výsledek uveď v hlášení.
    - Přidej test výstupu: v žádném HTML v publikačním adresáři není **mimo `<script>` a `<style>`** řetězec `${` ani `{{`. Dnes 0 výskytů, 247 souborů.
    - Výskyty v `index.html` ř. 2023 jsou správné JS a neměň je. Do hlášení pro úkol 19 napiš přesnou definici kontroly (mimo `<script>`), jinak by CI hlásila 34 planých poplachů.
12. Testy fáze A (sekce Ověření), Lighthouse po změně a náhled přes `npm run nahled` (0 kreditů). Na náhledu spusť e2e test kotev (jen GET, nic neodesílá). **Hlášení po fázi A.**

### Fáze B – kalkulačky, tisk, offline, CSP, plátno
13. **Součty v kalkulačce SVJ** (`kalkulacka-svj.html` ř. 336–372):
    - řádek slevy = `Math.round((práce + MASK) × r.sleva)`, jen když je sleva větší než 0,
    - nový řádek „Zaokrouhlení na desítky Kč“ = Celkem − (práce + MASK − sleva) se znaménkem („+ 2 Kč“ / „− 3 Kč“), jen když je nenulový,
    - kdyby se někdy uplatnilo `r.minimum_uplatneno`, přidej řádek „Doplatek do minimální ceny zakázky“ (s dnešním rozsahem posuvníků nenastane, prokaž testem),
    - komentář ř. 362 uprav podle skutečnosti,
    - `svj-podklad.js` (ř. 66) přebírá i řádek zaokrouhlení.
14. **Cena odkladu** (ř. 380–397 a `svj-podklad.js` ř. 76–81):
    - hlavní (součtový) řádek „Odklad prodraží ošetření HSPG o“ = zaokrouhlená hodnota HSPG za N let − zaokrouhlená hodnota HSPG dnes. Výchozí stav dá „+ 68 000 Kč“,
    - dokud úkol 13 nerozhodne o variantě s lešením, ponech její řádky jako běžné řádky s jednoznačným popiskem: „Varianta s lešením za 5 let“ a „Odklad by variantu s lešením prodražil o“,
    - stejné popisky a hodnoty v tištěném podkladu,
    - výchozí růst 6,4 % ani text vzorce neměň (úkol 13).
15. **Smysluplný stav bez JS:**
    - Homepage `.citac`: ve zdroji (nebo buildem) zapiš do textu cílovou hodnotu `data-cil` + `data-pripona` ve formátu `cs-CZ` („24 h“, „0 Kč“, „2×“).
    - Animace smí text přepsat na 0 až v okamžiku, kdy začne (prvek ve viewportu, bez reduced motion). Na `beforeprint` nastav cílové hodnoty. Hodnoty a popisky neměň (úkoly 13 a 18).
    - Kalkulačka SVJ: build doplní do `<output>` výsledky pro výchozí stav posuvníků (80 m, 6 podlaží, 6,4 %, 5 let) **stejným enginem**: `assets/ceny.js` spuštěný v Node přes `vm`, žádná ručně opsaná čísla.
      - Rozšiř `scripts/build-ceny.mjs`, nebo přidej `scripts/build-kalkulacky.mjs` do build příkazu.
      - Režim `--kontrola` skončí kódem 1, když se HTML liší od výpočtu.
      - Hodnoty se mapují podle `id` výstupů, aby po úpravách z úkolu 13 předvyplnění neselhalo.
      - Dnešní `content/ceny.json` dává: 1 044 m², práce 175 392 Kč, MASK 20 880 Kč, sleva 5 %, Celkem 186 460 Kč, lešení 198 360 Kč, klasicky 384 820 Kč, úspora 198 360 Kč / 52 %.
16. **Skloňování přes `sklonuj()`:**
    - homepage ř. 2348–2349 (text i `aria-valuetext`): 0 let, 1 rok, 2–4 roky, 5–10 let,
    - `pas-domu.html` `zbyva()`: rok/roky/let a den/dny/dní. Zkratky „r.“ a „měs.“ ve složeném tvaru můžeš ponechat,
    - `let_` v kalkulačce SVJ (posuvník 1–10) nahraď modulem. Výstup musí zůstat stejný, jen obyčejnou mezeru nahradí U+00A0.
17. **Tisk podkladu SVJ:** v `svj-podklad.css` ř. 66–71 podmiň tisková pravidla třídou `html.sp-open` (otevřený overlay) místo `html.sp-print`. Třída `sp-print` může zůstat jako nadbytečná. Overlay se při tisku nikdy neskrývá a nápověda ř. 120 tak bude pravdivá.
18. **Tisk plovoucích prvků:**
    - Do CSS, které vkládá `assets/souhlas.js` (jediný skript na všech 247 stránkách; `brand.css` na 8 stránkách chybí), přidej:
      `@media print{#souhlas-lista,#hbot,#hbot-btn,#hspg-lista,#cta-stack,#reel-bublina,#ritual,#cteni,#postup-cteni,canvas.hstone-rain,.hspg-dove-scene{display:none!important}}`
    - Pokud build vkládá společnou hlavičku do všech stránek, dej pravidlo raději tam (jedno místo).
    - **Nikdy neskrývej `.sp-overlay`** (tisk podkladu SVJ).
19. **Offline:**
    - Nová stránka `offline/index.html` na adrese **`/offline/`**. Adresářová podoba jako `/akce/` je zvolená proto, aby ji nezměnilo sjednocení `/x` vs. `/x.html` v úkolu 06. Service worker nesmí uložit přesměrovanou odpověď.
    - Stránka je samostatná: inline CSS v paletě R7 (tmavě modrá a zlatá), žádné externí fonty ani skripty, `<meta name="robots" content="noindex">`, `<title>Jste offline | HOLUB – HSPG</title>`.
    - Obsah: nadpis „Jste offline“, věta „Stránku teď nejde načíst, protože zařízení není připojené k internetu.“, odkaz `tel:` s telefonem a pracovní doba z `content/firma.json` (`telefon`, `telefon_zobrazeni`, `pracovni_doba`; vygeneruj buildem, pokud to jde) a odkaz „Úvodní stránka“.
    - E-mail na stránku nedávej (úkol 03). Stránka nesmí být v sitemap.
    - `sw.js`:
      - `CORE = ['/offline/', '/manifest.webmanifest']`,
      - navigace offline: uložená stránka, jinak `/offline/`,
      - fallback na `/` a `/404.html` odstraň,
      - strategii pro CSS/JS a obrázky ani razítkování verze neměň.
20. **CSP:** do `img-src` stávající hlavičky `Content-Security-Policy-Report-Only` přidej `blob:`, na jednom místě konfigurace. Nic dalšího v CSP neměň (úkoly 03 a 15).
21. **`hstone-rain`:**
    - V `resize()` použij `H = Math.min(výška hera, innerHeight)`. Plátnu dej v CSS stejnou výšku, např. `.hstone-rain{height:min(100%,100svh);bottom:auto}`.
    - `IntersectionObserver` sleduj na plátně, ne na celém heru.
    - Počet kapek se dál odvozuje z `W×H`, takže se na mobilu sám sníží.
    - Na desktopu, kde se hero vejde na obrazovku, se vzhled nesmí změnit (snímek před a po).
    - Ostatní optimalizace jsou úkol 07.
22. Testy fáze B, Lighthouse před a po (homepage, `/kalkulacka-svj.html`), náhled, **hlášení po fázi B**. Produkce jen po schválení majitelem, v dávce s dalšími úkoly (15 kreditů za nasazení, KONTEXT §4 bod 4).

## Akceptační kritéria
Fáze A:
- [ ] E2E kotvy. Pro viewporty 375×812, 1280×720, 1366×900 a 1920×1080, každý bez i s `reducedMotion: 'reduce'`, čerstvé načtení a první klik na první viditelný odkaz na `#holub-sekce`:
  - po ustálení posunu je první tlačítko v `#hspg-form-panel` celé mezi spodní hranou sticky hlavičky a `innerHeight`,
  - totéž při druhém kliku.
- [ ] E2E kotvy: pro `#predpo`, `#sluzby`, `#spot` a `#obsah` leží horní hrana cíle mezi `hlavička − 2 px` a `hlavička + 80 px`. Výjimka: stránka už dál scrollovat nemůže a cíl je vidět.
- [ ] E2E kotvy na 1366×900: každý z 19 odkazů `href="#…"` na homepage, každý na čerstvé stránce (`el.click()`), splní kritérium svého cíle.
- [ ] E2E deep linky `/#holub-sekce`, `/#predpo` a `/#sluzby` (čerstvé načtení): stejná kritéria po `load` a `document.fonts.ready`.
- [ ] Test výstupu: v `index.html` publikačního adresáře neleží žádný prvek s `data-cv` v pořadí dokumentu nad prvkem, jehož `id` je cílem nějakého odkazu `#…` nebo `/#…` na webu.
- [ ] Unit `spolecne`. Přijme:
  - „736 618 486“ → `+420736618486`,
  - „224 123 456“ → `+420224123456`,
  - „+420 224 123 456“ → `+420224123456`,
  - „00420 736-618-486“ → `+420736618486`,
  - „(+420) 736 618 486“ → `+420736618486`,
  - „+421 905 123 456“ → `+421905123456`,
  - „00421905123456“ → `+421905123456`,
  - „+49 151 23456789“ → `+4915123456789`.
- [ ] Unit `spolecne`. Odmítne:
  - telefon: „abc“, „12345“, „123 456 789“, „+420 12 345 678“, „+420 736 618 4867“, „+421 12345“,
  - e-mail: „a@b“, „audit@example“, „jan @email.cz“, „jan@@email.cz“,
  - e-mail přijme „jan.novak+poptavka@firma.co.uk“.
- [ ] Unit `spolecne` – plocha:
  - „12,5“ → 12,5 („12,5“) a „1 200“ → 1200,
  - „“ → `prazdne`,
  - „-50“, „0“, „1e9“, „abc“, „1000000“ a „12,555“ → chyba.
- [ ] Unit `spolecne` – kód a skloňování:
  - `kod("HS-206-0001", 5)` → `{hodnota:"HS-2060-001", kurzor:5}`,
  - `sklonuj` dává pro 0, 1, 2, 4, 5 a 22 tvary let, rok, roky, roky, let a let, mezi číslem a slovem vždy U+00A0.
- [ ] E2E formuláře (`/` krok Telefon, `/akce/`, `/akce/dekujeme/` fotky, `/recenze/` `#kontakt`):
  - přijímané vstupy projdou, odmítané ukážou českou hlášku u pole s `aria-invalid="true"`,
  - zachycený POST (`page.route`, nic neodchází ven) obsahuje normalizovaný telefon.
- [ ] `/akce/` s `javaScriptEnabled: false`: `#tel` = „abc“ → `checkValidity() === false` a `#mail` = „audit@example“ → `false`. „736 618 486“ a „jan@email.cz“ → `true`.
- [ ] E2E plocha v průvodci: „-50“ a „1e9“ nejdou dál (hláška u pole), „12,5“ se odešle jako „12,5“ a prázdné pole jako „neuvedeno“.
- [ ] E2E maska na `pas-domu.html` i `/recenze/`: v „HS-2026-0001“ kurzor na pozici 5, `Delete`, napsat „5“ → „HS-2056-0001“ a `selectionStart === 6`. Dosavadní případy z kroku 8 fungují.
- [ ] E2E `/akce/dekujeme/`:
  - bez údajů v `sessionStorage` se scéna (`.hspg-dove-scene`) do 3 s neobjeví,
  - s údaji (`addInitScript`) se přehraje,
  - s `?fotky=1` se nepřehraje,
  - během scény není cookie lišta vidět,
  - po zavření scény je vidět a `document.elementFromPoint` ve středu tlačítka „Jen nezbytné“ vrátí toto tlačítko.
- [ ] `grep -rIc "facebook.com/share" "$PUB"` → všude 0. Všechny výskyty `facebook.com/` jsou `https://www.facebook.com/HolubSurfaceProtection` bez `?`. JSON-LD na `/` a `/en.html` jde parsovat a `sameAs` obsahuje kanonickou adresu.
- [ ] Test výstupu: mimo `<script>`/`<style>` není v žádném HTML v `$PUB` `${` ani `{{` (uveď počet kontrolovaných souborů).
- [ ] Lighthouse mobil homepage: výkon nejvýš o 2 body pod stavem před úkolem a CLS ne horší (uveď medián 3 běhů před a po).
- [ ] Všechny původní testy webu projdou. Pokud je převzatý úkol 01, projde `node scripts/build-hbot.mjs --kontrola`.

Fáze B:
- [ ] E2E kalkulačka SVJ, průchod všech 2 052 kombinací (obvod 30–200 × podlaží 2–13, v `page.evaluate`):
  - viditelné řádky karty HSPG sečtou přesně na Celkem,
  - Celkem = `HSPG_VYPOCET.spocitej`,
  - 0× `NaN`,
  - žádný výstup neobsahuje „− -“ ani „--“,
  - počet kombinací s `minimum_uplatneno` je 0.
- [ ] Výchozí stav: „Odklad prodraží ošetření HSPG o“ = „+ 68 000 Kč“. Řádky varianty s lešením (pokud zůstaly) mají v popisku slovo „lešením“. Sekce „3 · Cena odkladu“ v podkladu má stejné popisky i hodnoty jako stránka (test porovná).
- [ ] S `javaScriptEnabled: false`:
  - homepage `.citac` ukazuje „24 h“, „0 Kč“ a „2×“ a nikde „0 h“ ani „0×“,
  - výstupy kalkulačky SVJ nejsou „—“ a rovnají se výpočtu enginem pro výchozí stav (test hodnoty počítá, neopisuje je).
- [ ] Emulace tisku homepage bez scrollu: `.citac` mají cílové hodnoty.
- [ ] `node scripts/build-ceny.mjs --kontrola` (nebo nový skript) → kód 0. Po dočasné změně sazby v kopii `content/ceny.json` → kód 1.
- [ ] Skloňování:
  - posuvník 0–10 → „0 let“, „1 rok“, „2 roky“, „3 roky“, „4 roky“, „5 let“ … „10 let“ (text i `aria-valuetext`),
  - pas domu s mockovanou odpovědí `/api/sentinel/validate` (`page.route`, tvar odpovědi podle funkce `sentinel-validate` ve zdroji): `zbyva_dni` 365 → „1 rok“, 730 → „2 roky“, 1 → „1 den“, 2 → „2 dny“, 5 → „5 dní“.
- [ ] Tisk podkladu SVJ: overlay otevřený přes `#tisk-kalkulace`, bez kliknutí na tlačítko tisku, `emulateMedia({media:'print'})`:
  - `.sp-bar` má `display:none`,
  - žádný jiný potomek `body` než `.sp-overlay` není vidět,
  - všech 7 sekcí („1 ·“ až „7 ·“) je vidět,
  - `page.pdf()` má stejný počet stran jako cesta přes tlačítko (dnes 3).
- [ ] Tisk plovoucích prvků: na `/`, `/cenik.html`, `/nabidka-svj.html`, `/pas-domu.html`, `/cisteni-strech/kolin/`, `/akce/`, `/kariera.html`, `/kalkulacka-svj.html`, `/recenze/` a `/en.html` mají v emulaci tisku `#souhlas-lista`, `#hbot-btn`, `#hspg-lista`, `#cta-stack`, `#reel-bublina` a `canvas.hstone-rain` `display:none`, nebo neexistují.
- [ ] E2E offline:
  - po návštěvě `/` a `/cenik.html` je SW aktivní a stránku ovládá,
  - po zastavení testovacího serveru: `/cenik.html` → uložená stránka, `/kariera.html` (nenavštívená) → stránka „Jste offline“ s `a[href="tel:+420736618486"]`, `/` → uložená nebo offline stránka,
  - nikde text „Stránka nenalezena“,
  - v cache není žádná odpověď s `redirected === true`.
- [ ] CSP: `img-src` v konfiguraci obsahuje `blob:`. E2E s hlavičkou CSP načtenou z konfigurace (testovací server ji posílá stejně jako produkce): výběr fotky na `/akce/` a `/akce/dekujeme/` vyvolá 0 událostí `securitypolicyviolation`.
- [ ] `hstone-rain`:
  - na 375×812 je výška plátna v CSS ≤ 812 px a `canvas.height` ≤ 812 × 1,5,
  - na 1366×900 je vzhled první obrazovky stejný (snímky před a po v hlášení),
  - po odscrollování první obrazovky se kreslení zastaví (test: `requestAnimationFrame` z `hstone-rain.js` nebo neměnné pixely).
- [ ] Lighthouse homepage a `/kalkulacka-svj.html` (mobil a desktop): přístupnost a SEO neklesly, výkon nejvýš o 2 body pod stavem před úkolem.

## Ověření
```bash
PUB=<publikační adresář z netlify.toml>
<build příkaz z netlify.toml>                                   # např. node scripts/build-site.mjs (ověř)
node scripts/build-ceny.mjs --kontrola                           # → kód 0 (fáze B)
node --test tests/spolecne.test.mjs tests/vystup.test.mjs        # → vše prošlo (uveď počty)
CHROMIUM=<cesta k Chromiu> node --test --test-concurrency=1 tests/e2e/kotvy.e2e.test.mjs   # P0
CHROMIUM=<cesta k Chromiu> node --test --test-concurrency=1 tests/e2e/*.e2e.test.mjs
grep -o '<[^>]* data-cv[ >]' "$PUB/index.html" | wc -l           # → 8 (varianta z kroku 4a)
grep -rIl "facebook.com/share" "$PUB"                            # → nic
grep -rIl '\[6-7\]\\d{8}' "$PUB"                                 # → nic (staré phoneOk)
npx -y lighthouse <url> --only-categories=performance,accessibility,seo --output=json --output-path=lh.json          # mobil
npx -y lighthouse <url> --preset=desktop --only-categories=performance,accessibility,seo --output=json --output-path=lh-d.json
```
Testy, které přidáš (styl jako `balicek/testy`: `node:test` + `playwright`):
- `tests/spolecne.test.mjs` (Node, bez závislostí): všechny vektory z akceptačních kritérií a pravidlo H-BOT jako reference (rozdíly se vypíšou, test kvůli nim neselže).
- `tests/vystup.test.mjs` (Node, nad `$PUB`):
  - `${`/`{{` mimo `<script>`/`<style>`,
  - pravidlo „žádný `data-cv` nad cílem kotvy“,
  - statický text `.citac` = `data-cil` + `data-pripona`,
  - předvyplněná kalkulačka SVJ = výpočet enginem (`vm`),
  - žádné `facebook.com/share`,
  - `offline/index.html` existuje, má `noindex` a `tel:`, není v sitemap,
  - `sw.js` obsahuje `/offline/` a neobsahuje `404.html`.
- `tests/e2e/kotvy.e2e.test.mjs`:
  - viewporty a odkazy podle kritérií, čerstvý kontext pro každý případ,
  - před klikem klikni na „Jen nezbytné“ v cookie liště a počkej, až zmizí úvodní překryv `#ritual`,
  - ustálení = `scrollY` se 300 ms nemění, nejvýš 4 s,
  - proměnná `BASE_URL` umožní spustit test i proti náhledu (jen GET).
- `tests/e2e/formulare-validace.e2e.test.mjs`, `tests/e2e/drobnosti.e2e.test.mjs` (maska, `/akce/dekujeme/`, skloňování, čítače bez JS), `tests/e2e/kalkulacka-svj.e2e.test.mjs`, `tests/e2e/tisk.e2e.test.mjs`, `tests/e2e/offline.e2e.test.mjs`, `tests/e2e/csp-fotky.e2e.test.mjs`, `tests/e2e/hstone-rain.e2e.test.mjs`.
- Pravidla pro všechny e2e testy:
  - statický server nad `$PUB` (vzor `balicek/testy/server.mjs`),
  - externí požadavky blokuj `ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, r => r.abort())`,
  - každý POST (formuláře, `/api/sentinel/validate`) zachyť přes `page.route` a odpověz lokálně,
  - testovací fotku vytvoř v testu (malé PNG),
  - offline simuluj zastavením testovacího serveru po instalaci SW (`context.setOffline` požadavky SW spolehlivě neodpojí).

Na náhledu (jen GET, **formuláře neodesílej**):
- `BASE_URL=<náhled> … tests/e2e/kotvy.e2e.test.mjs` → projde,
- `curl -s <náhled>/offline/ | grep -c 'tel:+420736618486'` ≥ 1 a `grep -c noindex` ≥ 1,
- `curl -s <náhled>/sw.js | grep -c "404.html"` → 0,
- `curl -sI <náhled>/akce/ | grep -i content-security-policy` obsahuje `img-src 'self' data: blob:`,
- `curl -s <náhled>/ | grep -c "facebook.com/share"` → 0.

Na produkci totéž až po schváleném nasazení.

## Bez AI / s AI
Úkol AI nepoužívá a nic z něj na AI nezávisí. Validace, kotvy, kalkulačky, tisk i offline stránka fungují bez serveru a bez AI. Kde to jde, fungují i bez JS: nativní kotvy, `pattern` na `/akce/`, předvyplněné výsledky a čítače. Soubory H-BOT (úkol 01) se nemění.

## Nepřekročitelná pravidla
Viz `balicek/KONTEXT.md` §4. Pro tento úkol navíc:
- **Žádná změna obsahu tvrzení:** ceny a sazby (`content/ceny.json`), text záruky, „24 h“, „0 Kč za lešení“, „2× ročně“ i výchozí 6,4 % zůstanou. Měníš jen výpočty, popisky výpočtů a technické chování. Nové texty (hlášky, offline stránka, popisky řádků) neobsahují nová fakta a dodržují nezlomitelné mezery a uvozovky „…“.
- Testy nikdy neodesílají data do produkčních ani náhledových formulářů a nevolají produkční `/api/*`. Vše lokálně přes `page.route`.
- Odeslání poptávky se nikdy nesmí zablokovat kvůli chybějícímu pomocnému skriptu (záloha v kroku 6).
- Service worker nikdy neukládá POST, `/api/`, `/.netlify/`, videa ani přesměrované odpovědi.
- `data-cv` neodebírej z dalších prvků bez měření Lighthouse. Na `assets/hbot*` nesahej.
- Nasazení jen `npm run nahled` (0 kreditů). Produkce jen po schválení majitelem v dávce.

## Hlášení po dokončení
Po **fázi A** i **fázi B** formát z `KONTEXT.md` §5 a k tomu:
- inventura z kroku 2 a seznam změněných souborů,
- výsledky testů (počty) včetně důkazu, že test kotev před opravou selhal,
- naměřené pozice kotev před a po (tabulka viewport × odkaz),
- Lighthouse před a po (medián 3 běhů, mobil i desktop) a snímky plátna `hstone-rain` před a po,
- odkaz na náhled.
- Předávky pro jiné úkoly:
  - **07:** které prvky ztratily `data-cv` a dopad na výkon, plátno `hstone-rain` (výška hotová, CPU zbývá), strategie cache v `sw.js` beze změny.
  - **11:** `sameAs` už má kanonickou adresu Facebooku.
  - **13:** cena odkladu se počítá z varianty HSPG, ale řádky varianty s lešením a výchozí 6,4 % čekají na rozhodnutí. Čítače mají ve statickém HTML cílové hodnoty, jejich pravdivost posuzuje 13.
  - **15:** v `img-src` je `blob:`, takže vynucení CSP už nahrávání fotek nerozbije.
  - **16:** změna `content-visibility` a nový handler kotev (fokus `preventScroll`), události `hspg:scena-*` a odložené zobrazení cookie lišty.
  - **18:** předvyplněná kalkulačka a hodnota „24“ v čítači, pokud se bude slib „do 24 hodin“ centralizovat.
  - **19:** přesná definice kontroly `${` (mimo `<script>`/`<style>`) a seznam testů k zařazení do CI.
  - **01:** rozdíly mezi validací H-BOT (`^\+?\d{9,15}$`) a `spolecne.js`.
  - **03 a 04:** formulář reklamace a další formuláře mají používat `assets/spolecne.js`.
- Návrhy mimo rozsah: průvodce na `/` není `<form>` a Enter nic neodešle (formuláře #7), formuláře bez JS (#9), `autocomplete` u adresy na `/akce/` (#18).
