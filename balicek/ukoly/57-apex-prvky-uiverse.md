# Úkol 57: Prvky Apex z Uiverse.io – jednotná sada tlačítek, přepínačů, karet a vstupů (MIT)
> Priorita P2 · Závisí na: 48 (H-BOT v5), 49 (HOLUB 360), 50 (Standard HOLUB), 56 (přepínač zvuku, puls plakety), 08 (šablona patičky – odkaz „Licence“) · Čeká na majitele: nic – licence MIT všech dvanácti prvků ověřena 22. 10. 2026 (patička uiverse.io a panel „License“ u každého prvku).

## Co to je
Dvanáct prvků rozhraní vybraných na uiverse.io (jen CSS, bez JavaScriptu, bez Tailwindu) a upravených pro vzhled
**Apex** (R18): matná čerň, obsidiánové sklo, tekuté zlato. Všechno je v jednom souboru `assets/apex-prvky.css`
(třídy s předponou `ap-`, nekolidují s `apex-*` z `apex-tokens.css`). Žádný prvek nepotřebuje skript, CDN ani
písmo; stav řídí nativní `<input>` (zůstává v DOM, jen vizuálně skrytý) nebo atributy `aria-pressed` /
`aria-expanded`, které už web nastavuje. Ukázka se vším a s úryvky „Jak použít“: `balicek/navrhy/apex-prvky/index.html`
(otevři ze složky balíčku; jen podklad, **nikdy se nenasazuje**).

Pravidla, která sada dodržuje a která při nasazení nesmíš porušit:
- barvy jen přes tokeny `--apex-*` (s náhradní hodnotou), žádné pevné hex v komponentách; text na skle ≥ 4,5:1;
- cíle dotyku ≥ 44 × 44 px, šířka 100 % na 390 px bez vodorovného posunu;
- nativní vstupy skryté přístupně (ne `display:none`), fokus viditelný (obrys 2 px světlé zlato, odsazení 3 px),
  vazby `label for`/`id`, `aria-*`;
- `@media (prefers-reduced-motion: reduce)` vypíná smyčkové animace; jediná nekonečná smyčka je otáčení nitě
  (stav čekání), vše ostatní jsou přechody po akci;
- **nic nepulzuje při načtení** – `ap-puls--aktivni` přidává skript webu až po akci návštěvníka, puls doběhne
  nejvýš 3× (`animation-iteration-count: 3`) a třída se v `animationend` odebere.

## Soubory z balíčku (`balicek/web/` → kořen webHSPGH)
| Soubor | Poznámka |
|---|---|
| `assets/apex-prvky.css` | nový; načítat **po** `assets/apex-tokens.css` (`<link rel="stylesheet">`, stejný původ, cache jako ostatní `/assets/*` z úkolu 07) |
| `LICENSES-THIRD-PARTY.md` | nový; kopíruje se do kořene webu jako `/LICENSES-THIRD-PARTY.md` (krok 8) |
| `balicek/navrhy/apex-prvky/index.html` | ukázka pro vývoj – **nekopírovat na web** |
| Testy: unit `testy/unit/apex-prvky.test.mjs`, e2e `testy/e2e/apex-prvky.test.mjs` | e2e otevírá ukázku z balíčku, spouští axe, měří cíle, fokus a omezení pohybu |

## Kde který prvek použít
| Třída | Prvek | Kde na webu | Poznámka k nasazení |
|---|---|---|---|
| `ap-tlacitko` | skleněné obsidiánové tlačítko s leskem | hlavní CTA „Zaměřit na dálku“ na úvodní stránce (sekce HOLUB 360 / plaketa) a `#h3a-zmerit` v HOLUB 360 (text stránky „Změřit na dálku“ zůstává), „Rezervovat termín“ v plánovači | funguje jako `<button>` i `<a>`; stav čekání `aria-busy="true"` + `<span class="ap-nit ap-nit--mala" aria-hidden="true">` uvnitř; varianta `ap-tlacitko--velke` pro hero |
| `ap-prepinac` | přepínač „Zvuk a vibrace“ | hlavička panelu H-BOT a `#h3a-zazitek` v HOLUB 360 (úkol 56) | **neměň značkování ani JS z úkolu 56** – stávající `<button aria-pressed>` dostane třídu `ap-prepinac` a vnitřní `<span class="ap-prepinac__draha">` s kolečkem a ikonami (viz ukázka); vzhled se řídí atributem `aria-pressed`, `aria-label="Zvuk a vibrace"` zůstává; testy úkolu 56 (`aria-pressed`) musí projít beze změny |
| `ap-fajfka` | zaškrtávací pole | souhlasy v poptávce (`/akce/`), v rezervaci plánovače a v HOLUB 360; volitelné položky v „Cena hned“ | `pathLength` na cestě SVG nechat; text souhlasu zůstává z úkolu 09 |
| `ap-srdce` | „Uložit odstín RAL …“ | vzorník odstínů u cesty B v „Cena hned“ (`hbot-nabidka.js`) a na `/standard-holub/` (`.sh-vzorek`), uložení dlaždice v Pasu domu | jen vzhled výběru odstínu – stav drží stávající logika (`:checked` radia/checkboxu, bez nového úložiště); `aria-label="Uložit odstín RAL 9001"` z dat `content/standard.json` |
| `ap-nit` | zlatá nit (čekání) | „Měříme na dálku…“ (`#h3a-adresa-stav`), „Počítáme…“ v „Cena hned“, příprava PDF (`hspg-dokumenty.js`), čekání na odpověď H-BOTa | `role="status"` jen na prvku s textem; prstenec bez textu `aria-hidden`; `--ap-nit-pozadi` = barva pozadí, na kterém leží |
| `ap-karta` | skleněná karta | karta ORIENTAČNÍ CENA v H-BOTovi, dlaždice ploch a kót v HOLUB 360, karty rozcestníku, moduly Pasu domu | nahrazuje ad hoc karty; `--ap-karta-max` pro maximální šířku; bez `backdrop-filter` má neprůhledný obsidián |
| `ap-napoveda` | vysvětlivka s odkazovou čárou | kóty v HOLUB 360 (hřeben, krokev, sklon, plochy – `ap-napoveda__bod--kota` ukáže hodnotu), vysvětlivky u položek ceny (záloha, doprava, minimum zakázky) | bod = `<button type="button" aria-describedby>` ≥ 44 px, obsah `role="tooltip"`; na dotyku tlačítko nedostává fokus → po klepnutí přepni `aria-expanded` (3 řádky, viz ukázka); směr čáry `data-smer` volit tak, aby text na 390 px nevyjel z obrazovky |
| `ap-segment` | segmentový přepínač | volba cesty v „Cena hned“ (A · B · Čištění a ošetření), Střecha / Fasáda / Obojí v HOLUB 360, Standard / SENTINEL v péči | zachovej `name`, `id` a obsluhu změny z `hbot-nabidka.js` / `holub360-apex.js` (JS čte `:checked`), mění se jen obal: `<fieldset class="ap-sada"><legend class="ap-sada__nazev">` + `<div class="ap-segment" style="--ap-segmenty: 3">`; vstupy a popisky se střídají, jezdec je poslední |
| `ap-volba-seznam` | svislý výběr se světelnou linkou | postup 01–05 (Standard HOLUB) v levém panelu „Cena hned“, volba cesty v panelu, rozcestník H-BOT (mimo zlatou dlaždici „Cena hned“) | `--ap-volby` = počet položek; řádky mají stejnou výšku (mřížka) |
| `ap-pole` | pole s plovoucím popiskem | `#h3a-adresa-vstup` v HOLUB 360, pole poptávky a rezervace (jméno, e-mail, telefon), „Zavolejte mi“ v H-BOTovi | nutné `placeholder=" "` (mezera) – dosavadní text placeholderu („Ulice a číslo domu, obec“) přesuň do `<p class="ap-pole__napoveda" id="…">` pod pole a nech `aria-describedby`; u combo adresy zachovej `role="listbox"`, `aria-expanded`, `aria-activedescendant` a `#h3a-navrhy` (testy `holub360`); chyby přes `aria-invalid="true"` + `ap-pole__chyba` |
| `ap-tlacitko-obrys` | zlatý kovový rámeček | sekundární tlačítka „Stáhnout kalkulaci (PDF)“, „Upravit plochy“, „Zobrazit NÁVRH smlouvy o dílo“, „Plochy znám – zadám je sám“ | text je obsah tlačítka (ne `content:`) |
| `ap-puls` / `ap-puls--aktivni` | zlaté CTA se šipkami a prstencem | „Pokračovat na cenu“ po rozlomení pečeti v H-BOTovi; `ap-puls--aktivni` navíc kolem `#h3a-zmerit` po výběru adresy ze seznamu | **plaketa H-BOT má vlastní puls z úkolu 56 – neměnit, nedublovat**; `ap-puls--aktivni` lze přidat i jinému prvku (jen prstenec), nikdy při načtení; při omezení pohybu se nespustí |

## Postup
1. Větev `ukol-57-apex-prvky` z aktuální `main`. Zkopíruj `assets/apex-prvky.css` a `LICENSES-THIRD-PARTY.md`
   podle tabulky. Spusť `npm test` a `npm run test:e2e` **před** změnami (musí být zelené – jinak nejdřív
   oprav stav z předchozích úkolů).
2. Načtení stylu: `<link rel="stylesheet" href="/assets/apex-prvky.css">` hned za `apex-tokens.css` v
   `holub-360/index.html`, v šabloně `/standard-holub/` (`scripts/stranka-standard.mjs` → pak `node
   scripts/build-hbot.mjs`), v Pasu domu a na stránkách s poptávkou/rezervací. Panel H-BOT: `hbot.js` si styl
   dotáhne stejně jako `hbot.css` (stejný původ – CSP `style-src 'self'` beze změny).
3. Nasazuj prvky **po jednom** v pořadí tabulky a po každém spusť příslušné e2e testy (`hbot`, `hbot-kalkulace`,
   `holub360`, `zazitek-rozcestnik`, `standard-holub`, `pas-trezor`, `planovac`). Nemění se chování, jen vzhled:
   ponech `id`, `name`, `data-*`, `aria-*` a obsluhu událostí; nové jsou jen třídy a obalové prvky.
4. Puls: skript webu přidá `ap-puls--aktivni` jen v reakci na akci (rozlomení pečeti, výběr adresy) a v
   `animationend` ji odebere; při `matchMedia("(prefers-reduced-motion: reduce)").matches` třídu nepřidávej vůbec.
5. Vysvětlivky na dotyku: na `.ap-napoveda__bod` přepínej `aria-expanded` po kliknutí (vzor v ukázce). Zvuk podle
   úkolu 56 („tuk“) smí doprovázet jen kliknutí, ne zobrazení vysvětlivky.
6. Zkontroluj na 390 × 844 (Android i iPhone) a 1440: žádný vodorovný posun, cíle ≥ 44 px, klávesnice (Tab po
   všech prvcích, viditelný fokus, mezerník/Enter přepíná), čtečka (přepínač hlásí „zapnuto/vypnuto“, srdce
   „Uložit odstín RAL …“, vysvětlivka se čte jako popis tlačítka), omezení pohybu (nit stojí, nic nepulzuje).
7. Texty: nic z embarga (KONTEXT §4 bod 10), výsledek kalkulace se nikdy nenazývá slovem „nabídka“, nezlomitelné
   mezery (§4.9). Ukázkové hodnoty kót z `navrhy/` na web nepatří – kóty jdou z `/api/cena-z-adresy`.
8. **Licence:** zkopíruj `LICENSES-THIRD-PARTY.md` do kořene webu (`/LICENSES-THIRD-PARTY.md`), v `netlify.toml`
   přidej pro tuto cestu hlavičku `Content-Type = "text/plain; charset=utf-8"` (ať ji prohlížeč zobrazí, ne
   stáhne), a do patičky každé stránky (šablona úkolu 08) odkaz **„Licence“** → `/LICENSES-THIRD-PARTY.md`.
   Soubory `LICENSE` v `assets/vendor/*` zůstávají. Při každém dalším převzetí cizího prvku se do souboru doplní
   autor, adresa, řádek Copyright a popis změn – bez toho se prvek nenasazuje.
9. Náhled zdarma (`node scripts/nasadit.mjs` bez parametrů), snímky (desktop + 390 px: tlačítka, přepínač v H-BOTovi,
   segment v „Cena hned“, srdce u vzorníku, kóty s vysvětlivkou, pole adresy, karta ceny), hlášení.

## Akceptace
- [ ] `npm test` (vč. `apex-prvky`) a `npm run test:e2e` (vč. `apex-prvky` + všechny dotčené e2e) zelené;
      `node scripts/build-hbot.mjs --kontrola` OK.
- [ ] `apex-prvky.css` obsahuje jen tokeny `--apex-*` (test), žádné CDN, písma ani skripty; CSP beze změny.
- [ ] Vysvětlivky (`ap-napoveda`, `<details>` v kalkulaci): Enter/mezerník otevře, Escape zavře jen vysvětlivku a vrátí fokus na `<summary>` – **nesmí zároveň zavřít H-BOT** (rada AI 22. 10., GPT); stavová nit `ap-nit` bez falešných procent, s `aria-busy` na obsahu.
- [ ] Každý prvek z tabulky je na uvedeném místě; žádné `id`/`name`/`aria-*` z úkolů 48, 49, 56 se nezměnilo; e2e
      testy těchto úkolů procházejí beze změny.
- [ ] axe (wcag2a/aa, 2.1) bez vážných a kritických chyb na HOLUB 360, panelu H-BOT s kalkulací a `/standard-holub/`;
      všechny cíle ≥ 44 px; Tab ukáže zlatý obrys na každém prvku; 390 px bez vodorovného posunu.
- [ ] Při omezení pohybu žádná běžící animace (`getComputedStyle(...).animationName === "none"` u `.ap-nit` i
      `.ap-puls--aktivni`); puls se nikdy nespustí při načtení a doběhne nejvýš 3×.
- [ ] `/LICENSES-THIRD-PARTY.md` je dostupný jako text, patička má odkaz „Licence“, všech 12 adres a autorů je uvedeno.
- [ ] Hlášení se snímky a stop.

## Návrat zpět
- Celý úkol: `git revert` sloučení úkolu 57 v `main` → náhled → produkce jen se souhlasem majitele (KONTEXT §4.4).
- Bez nového kódu: odstranit `<link href="/assets/apex-prvky.css">` – prvky se vrátí ke vzhledu z `hbot.css`,
  `holub360-apex.css` a `apex-tokens.css` (značkování se třídami `ap-` funguje i bez stylu, jen vypadá jinak,
  protože stavy řídí nativní vstupy a atributy). Odkaz „Licence“ a soubor v kořeni nech – uvedení autorů je
  podmínka licence MIT u všeho, co z prvků na webu zůstane.
