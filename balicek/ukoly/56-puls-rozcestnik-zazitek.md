# Úkol 56: Puls plakety, rozcestník „Celý web na jednom místě“, zvuk a vibrace, hejno při měření
> Priorita P2 · Závisí na: 48 (H-BOT v5), 49 (HOLUB 360), 50 (build znalostí) · Čeká na majitele: nic nového – rozhodnuto 22. 10. 2026: zvuk a vibrace **zapnuté po první vědomé akci**, přepínač vždy po ruce. Jiné cíle rozcestníku = jen úprava `content/hbot-rozcestnik.json`.

## Co to dělá (přání majitele 22. 10. 2026)
- **Puls – „tlačítko se nabízí celý web“:** plaketa H-BOTa (a „Cena hned“ na mobilní liště) vyšle dvě zlaté vlny. **Nikdy trvale (WCAG 2.2.2):** nejvýš 3 dávky po ~4 s (3 s po načtení, ~30 s, ~75 s); po prvním otevření panelu už do konce relace ne (`sessionStorage` „hspg-hbot-otevreno“). Ne při najetí/fokusu (tehdy běží obíhající světlo), při omezení pohybu, ve skryté kartě, ve vynucených barvách ani majiteli. Během dávky zlatý štítek plakety ukáže „Celý web na jednom místě“; `aria-label` se nemění, vlny jsou stín mimo tlačítko (žádný posun rozvržení).
- **Rozcestník v uvítání panelu:** mřížka cílů – zlatá „Cena hned“ (kalkulace) přes celou šířku, HOLUB 360, Standard HOLUB, Péče SENTINEL, Pas domu, Volný termín, Nezávazná poptávka, Zavolejte mi. Skutečné `<a href>` / `<button>`, cíle ≥ 44 px, viditelný fokus, 2 sloupce, aktuální stránka má `aria-current="page"`, měření `hbot_rozcestnik { cil }`. Rychlé otázky zůstávají pod mřížkou (čipy „Cena hned“ a „Zavolejte mi“ jsou teď dlaždice; když je web z rozcestníku odebere, čipy se vrátí). Dlaždice se do živé oblasti deníku vloží potichu – čtečka ohlásí uvítání a oznámení o AI, ne 8 dlaždic.
- **Zvuk a vibrace (`assets/hspg-zazitek.js`):** jen syntéza Web Audio (žádné soubory, žádná síť), každý zvuk < 450 ms, hlavní hlasitost 0,15 přes kompresor, na iPhonu `audioSession = 'ambient'` (tichý režim = ticho). Nic při načtení, najetí ani rolování, nikdy ve skryté kartě; vibrace (Android) jen během kliknutí/klepnutí, iOS nic. Přepínač **„Zvuk a vibrace“** (`aria-pressed`, ikona reproduktoru) v hlavičce panelu vedle ✕ a v hlavičce HOLUB 360; volba v `localStorage` „hspg-zazitek“ („0“/„1“), platí i v jiných kartách.
  | Kdy | Zvuk | Vibrace |
  |---|---|---|
  | otevření panelu (plaketa, lišta) | otevrit | tuk 8 ms |
  | dlaždice, čipy, volby kalkulace, odstín, cesta A/B, den v kalendáři | tuk | tuk |
  | rozlomení pečeti (H-BOT i HOLUB 360) | pecet | [18, 30, 42] |
  | odhalení ceny | cena | [10, 50, 10, 50, 24] |
  | PDF / NÁVRH se stahuje | fajfka | [12, 40, 18] |
  | chyba ve validaci (kalkulace, zavolání, adresa, nevhodný den) | chyba | [30, 60, 30] |
  | start / konec měření na HOLUB 360 | kridla / fajfka | – |
  | „Děkujeme, ozveme se“ | srdce | – |
- **Hejno při měření (HOLUB 360):** čtyři origami holubi – **Měří** (obkresluje obrys domu, svítí jen dokud běží skutečný požadavek `/api/cena-z-adresy`), **Počítá** (plochy z odpovědi, ukáže spočítané m²), **Ověřuje** (výběr budovy, úplnost údajů), **Komunikuje** (výsledek oznámen). Žádné umělé zdržení – výsledek je vidět hned. Stavový řádek `role="status"` říká totéž textem. Omezení pohybu = statický seznam s fajfkami. Chyba měření hejno vrátí do klidu (`zahodMereni`).
- **Malé hejno u obálky „Cena hned“:** dekorace (`aria-hidden`) s pravdivými popisky Plochy · Ceník · Kontrola · Pečeť (plochy zadal zákazník, nic se neměřilo), doběhne do 1,2 s, pečeť jde rozlomit hned.
- Zvuková kulisa v úvodu HOLUB 360 se přejmenovala na „Zvuková kulisa: vypnutá/zapnutá“ (ať se neplete s hlavním přepínačem) a hlavní vypínač ji vypne; přímá vibrace u pečeti bez možnosti vypnutí je pryč (jde přes přepínač).

## Soubory z balíčku (`balicek/web/` → kořen webHSPGH)
| Soubor | Poznámka |
|---|---|
| `assets/hspg-zazitek.js`, `assets/holub360-hejno.js` | nové |
| `content/hbot-rozcestnik.json`, `netlify/lib/ai/rozcestnik.mjs` | nové – cíle rozcestníku a jejich kontrola při buildu |
| `assets/hbot.js`, `hbot-panel.js`, `hbot-nabidka.js`, `hbot.css` | puls, rozcestník, přepínač, zvuky, hejno u obálky |
| `holub-360/index.html`, `assets/holub360-apex.js`, `holub360-apex.css` | přepínač v hlavičce, hejno, zvuky, kulisa |
| `netlify/lib/ai/znalosti.mjs`, `scripts/build-hbot.mjs`, `assets/hbot-znalosti.json` (generovaný) | klíč `rozcestnik` |
| Testy: unit `zazitek.test.mjs`, `rozcestnik.test.mjs`; e2e `zazitek-rozcestnik.test.mjs` | |

## Postup
1. Větev `ukol-56-zazitek` z aktuální `main`. Přenes soubory; `content/hbot-rozcestnik.json` je nový, ostatní soubory úkolů 48–50 slučuj podle diffu balíčku.
2. `node scripts/build-hbot.mjs`, pak `--kontrola` (musí projít). Neplatný cíl rozcestníku (cizí adresa, `//…`, `javascript:`, neznámá akce) build **zastaví** se seznamem chyb – oprav obsah, ne kontrolu.
3. Cíle rozcestníku ověř na webu: `/holub-360/`, `/standard-holub/`, `/cenik.html#sentinel` (kotva `id="sentinel"` musí na ceníku existovat – jinak ji doplň k tarifům SENTINEL), `/pas-domu/trezor.html`, `/planovac/`, `/akce/`. Chybějící stránku z obsahu odeber, nevymýšlej náhradu.
4. HOLUB 360: při převzetí hlavičky ze šablony webu (úkol 08) zachovej `.h3a-hlavicka-akce` s tlačítkem `#h3a-zazitek`; `<script src="/assets/hspg-zazitek.js" defer>` musí být **před** modulem `holub360-apex.js`; `modulepreload` pro `holub360-hejno.js`.
5. Hlavičky a CSP: nové soubory jen ze stejného původu, žádná CDN ani písma; Web Audio ani `navigator.vibrate` nic nepotřebují. Cache jako ostatní `/assets/*` (úkol 07).
6. Měření (úkol 10): vlastní událost `hbot_rozcestnik` s parametrem `cil` (jen id cíle, žádné osobní údaje) – přidej do GTM po souhlasu.
7. Náhled (zdarma, `node scripts/nasadit.mjs` bez parametrů): Android (vibrace, přepínač), iPhone (tichý režim = ticho, žádná chyba), klávesnice (Tab po dlaždicích, Enter), čtečka (uvítání se ohlásí, dlaždice ne; měření na HOLUB 360 se ohlásí stavovým řádkem).

## Akceptace
- [ ] `npm test` (+ unit `zazitek`, `rozcestnik`), `npm run test:e2e` (vč. `zazitek-rozcestnik`, `hbot`, `hbot-kalkulace`, `holub360`) zelené; `build-hbot --kontrola` OK.
- [ ] Puls: první dávka ~3 s po načtení, nejvýš 3 dávky ≤ 4,5 s, po otevření panelu do konce relace žádná; při omezení pohybu a ve vynucených barvách žádná; CLS 0; `aria-label` beze změny (test).
- [ ] Rozcestník: 8 cílů se správnými odkazy, zlatá „Cena hned“ první, 2 sloupce na 390 i 320 px bez vodorovného posunu, Tab + viditelný fokus, axe bez vážných chyb; cizí a `javascript:` odkazy se nevykreslí ani z poškozeného JSON (test).
- [ ] Zvuk: nic při načtení, najetí, rolování ani při otevření z adresy `#hbot`; po kliknutí zazní; vypnutý přepínač = žádný AudioContext ani vibrace, volba přežije nové načtení; každý zvuk < 450 ms (test).
- [ ] HOLUB 360: „Měří“ svítí jen během požadavku, další holubi až s odpovědí; chyba hejno schová a vyprázdní stavový řádek; omezení pohybu bez animací; 390 × 844 bez posunu.
- [ ] V textech žádné „nabídka“ u kalkulace a nic z embarga (KONTEXT §4 bod 10).
- [ ] Hlášení se snímky (plaketa při pulsu, panel s rozcestníkem desktop + mobil, obálka s hejnem, HOLUB 360 během měření a po něm) a stop.

## Návrat zpět
- Celý úkol: `git revert` sloučení úkolu 56 v `main` → náhled → produkce jen se souhlasem majitele (KONTEXT §4.4).
- Bez nového kódu: **rozcestník** vypne `"cile": []` v `content/hbot-rozcestnik.json` + build (vrátí se čipy „Cena hned“ a „Zavolejte mi“); **zvuk** si každý vypne přepínačem.
- Jednotlivě v kódu: **puls** – v `assets/hbot.js` nevolat `pulsPlan()`; **zvuk** – smazat `<script src="/assets/hspg-zazitek.js">` z HOLUB 360 a v `hbot-panel.js` volání `nactiZazitek()` (bez modulu je vše tiché a přepínač skrytý); výchozí stav „vypnuto“ = v `hspg-zazitek.js` `zapnuto()` vrací `volba === true`; **hejno HOLUB 360** – v `holub360-apex.js` vynechat volání `stav.hejno.*` (měření funguje beze změny).

## Doplněk 22. 10. 2026 – ověřená fakta k haptice a zvuku (rešerše `RESERSE-HAPTIKA-ZVUK-WEBGL-2026-10-22.md`)
- `navigator.vibrate` funguje jen v prohlížečích na Chromiu na Androidu a jen po gestu uživatele; Firefox ho od verze 129 nemá, Safari nikdy. Na iPhonu z webu programová vibrace nejde (trik se skrytým `switch` po iOS 26.5 nefunguje) – v textech webu proto nikdy „haptika na všech telefonech“ (směrnice 2024/825).
- Zvuk jen syntézou Web Audio (bez souborů), `AudioContext` až po gestu + `resume()` v téže obsluze; na iOS ponechat `audioSession.type = "ambient"` (respektuje tichý režim) – nikdy `"playback"` (zastavil by uživateli hudbu). Zvuky 50–200 ms, nejvýš 1 za 300 ms, nic při načtení, hoveru ani otevření panelu.
- Uložení volby „Zvuk a vibrace“ do `localStorage` až po aktivním přepnutí uživatelem a uvést ji v zásadách ochrany soukromí (ePrivacy čl. 5(3) – EDPB 2/2023); do té doby nic neukládat. Výchozí stav rozhodl majitel: zapnuto po první akci – rešerše doporučuje vypnuto; při stížnostech přepnout výchozí na vypnuto (jedna konstanta v `hspg-zazitek.js`).
- Přepínač jako skutečný prvek s `aria-pressed`/`role=switch`; při `prefers-reduced-motion` nabízet vypnuto. Každá haptika má vizuální ekvivalent.
