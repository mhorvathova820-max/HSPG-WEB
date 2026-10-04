# Úkol 18: Obsah a cesta k poptávce
> Priorita P1 · Závisí na: 02, 13 (podle `PORADI.md` běží po 08, 10, 11, 16 a 17; co z nich ještě není sloučené, uveď v hlášení a použij náhradní postup u příslušného kroku) · Čeká na majitele: znění slibu reakční doby, pokračování akce „Vypusťte holuba“ (O9 v úkolu 13), které fotky a videa jsou vlastní, komunikace v angličtině, sídlo × provozovna a základna Hradec Králové, firemní zákazníci, odsouhlasení textů (otázky O18-1 až O18-10 níže) · Rozsah: **fáze A** = struktura bez nových faktů – neutrální poptávka mimo soutěž, jeden formulář z jedné definice, předávání údajů z kalkulaček, menu, anglický formulář (**A1**), přestavba homepage a první obrazovky na mobilu (**A2**); po A1 i po A2 hlášení a stop · **fáze B** = texty po rozhodnutích majitele (slib „do 24 hodin“, akce, označení vizuálů, žargon, identita, `/en`, FAQ)

## Proč (s důkazy)
Zdroje: `audit-obsah_konverze.json` (#4, #5, #6, #8, #10, #11, #13, #16–#21), `audit-formulare.json` (#7, #11, #12), `audit-pravni_pravdivost.json` #19 a `audit-funkcnost_js.json` #22. Počty jsem ověřil nad kopií živého webu (247 HTML). Měření na mobilu jsem 4. 10. 2026 zopakoval na https://hspg.cz: Playwright, 390 × 844, jen GET, lišta souhlasu předem zavřená (`hspg-souhlas = nezbytne`), po proskrolování vynucená `content-visibility`. Čísla řádků platí pro živý web, ve zdroji se mohou lišit.

### 1. Poptávka vede do soutěže (obsah #4, #5, formuláře #11, #12)
- Na `/akce/` vede **968 odkazů `href="/akce/"` ze 246 stránek**, tedy ze všech kromě `/akce/` samotné:
  - 927 odkazů je na 232 stránkách generovaných `scripts/build-regions.mjs`, po 4 na stránku (menu, úvodní tlačítko, „poptávkový formulář“, závěrečná výzva),
  - 41 odkazů je na 14 ručně psaných stránkách: `/` 13, `/en` 5, `/cisteni-fasad/` 4, `/cisteni-strech/` 3, `/pravidla-akce/` 3, po 2 na `/cenik`, `/kalkulacka-svj`, `/pas-domu` a `/reference`, po 1 na `/nabidka-svj`, `/kariera`, `/spoluprace`, `/recenze/` a `/ochrana-osobnich-udaju`.
- Na `/akce/` míří také:
  - `LANDING_URL = '/akce/'` na `/` (ř. 1922, plovoucí menu `#cta-stack`),
  - H-BOT z úkolu 01: spodní lišta „🕊 Cena do 24 h“ (`assets/hbot.js`), čip „Chci cenu do 24 h“ (`hbot-panel.js`) a znalosti AI „formulář hspg.cz/akce/“ (`netlify/lib/ai/znalosti.mjs`, `pravidla.mjs`).
- `/akce/` je stránka soutěže s H1 „Vypusťte holuba. Každá desátá poptávka z této stránky vyhrává.“
  - Jediný povinný checkbox (ř. 156–157) zní: „Souhlasím se zpracováním osobních údajů pro přípravu cenové nabídky a se zásadami ochrany údajů a pravidly akce.“
  - Pravidla uvádějí: „Do akce je zařazena každá poptávka odeslaná přes formulář na hspg.cz/akce“ a „Účastí v akci účastník potvrzuje, že se s pravidly seznámil a souhlasí s nimi.“
  - Kdo chce jen nabídku (správce SVJ, firma, cizinec), nemá mimo homepage jiný plnohodnotný formulář. Telefon (247 stránek) a zavolání zpět v H-BOT (243 stránek) fungují.
- Na homepage stojí přímo nad průvodcem (ř. 1406) banner „🎁 Akce: každá desátá poptávka ze stránky akce = základní ošetření do 99 m² ZDARMA“ a průvodce nese název soutěže (H2 ř. 1393 „Vypusťte holuba. Přiletí k vám.“). Odesílá ale `hspg-poptavka` a do akce se nepočítá (ř. 2234 „odsud ji neslibujeme“, `gift:false`). Promo je i v přilepené horní liště (ř. 1138).
- Po odeslání z homepage:
  - scéna v `assets/holub-let.js` (ř. 278–283) zve „zapojit se“ do akce,
  - tlačítko „📷 FOTKY K POPTÁVCE“ (ř. 317) vede na `/akce/dekujeme/?fotky=1#fotky`,
  - živá `/akce/dekujeme/` píše „U akce evidujeme poptávky podle pravidel a pořadí doručení.“

### 2. Homepage na mobilu (obsah #6, #10)
| Měření (390 × 844, 4. 10. 2026) | Hodnota |
|---|---|
| `scrollHeight` | **27 585 px** (32,7 výšky obrazovky) |
| H2 průvodce „Vypusťte holuba. Přiletí k vám.“ | y = 6 571 px (≈ 7,8 obrazovky) |
| „Poctivé ceny. Bez příplatku za lešení.“ | y = 12 514 px |
| FAQ / „Šest kroků“ | y = 18 584 / 19 436 px |
| „Můj příběh“ (kdo za webem stojí) | y = 24 274 px (≈ 28,8 obrazovky) |
| patička | y = 25 770 px |
| H1 | „Věci stárnou. My zůstáváme.“ (slogan), y = 291 |
| první odkaz `tel:` | y = 860, tedy pod ohybem 844 px |
| přilepené a fixní lišty | 126 px při načtení (horní lišta s promem a logem, 14,9 %), po posunu + `#hspg-lista` 67 px = **193 px = 22,9 %** |

- **Výšky bloků na 390 px:**
  - hlavní obsah: úvod 2 107, `#spot` 1 658, `#sluzby` 2 138, `#holub-sekce` 1 349, `#predpo` 2 333, diagnostika „Vyberte část domu.“ 1 734, `#cenik` 2 278,
  - další sekce: H-STONE 1 327, Měď 1 265, předávání 802, FAQ 852, „Šest kroků“ 884, riziko řas 1 410, „Co udělá čas s fasádou“ 1 528, „Holub se vždy vrací domů“ 433, „Žádné zkratky“ s „Můj příběh“ 1 734,
  - patička ≈ 1 800.
- Trojice „24 h / 0 Kč / 10 let“ je v úvodu dvakrát (ř. 1211–1213 a 1248–1250). „0 Kč“ znamená jednou „za zaměření“ a jednou „za lešení“.
- Na první obrazovce není cena ani telefon.

### 3. Průvodce (obsah #8, formuláře #7)
- Průvodce má 6 kroků: start → jméno a příjmení (obojí povinné) → adresa → telefon → e-mail (povinný) → povrch, plocha, služba, poznámka a souhlas. Počítadlo „krok N z 6“ (ř. 2174) se ukazuje i na úvodní obrazovce, kde žádná pole nejsou.
- Panel `#hspg-form-panel` není `<form>`:
  - Enter nic neodešle,
  - pole nemají `required` ani `enterkeyhint`.
- Telefon `phoneOk` (ř. 1935) přijme jen mobilní čísla 6xx/7xx. Opravu validace dělá úkol 17 (`assets/spolecne.js`).
- `/akce/` má 7 povinných polí: Jméno, Telefon, email, Adresa objektu, Typ povrchu, Požadovaná služba a souhlas. Pole Plocha chybí.
- Oba formuláře mají jiné sady polí i jiné možnosti: „Komplet“ na homepage proti „Kombinace / nevím“ na `/akce/`.

### 4. Kalkulačky a `/akce/` (obsah #21, formuláře #12)
- Odkazy z kalkulaček a nástrojů nepředají spočítané údaje:
  - kalkulačka na `/` (ř. 1635 `a.kalk__cta href="/akce/" target="_blank"`) nepředá obvod, výšku ani plochu,
  - riziko řas (ř. 2320) předá jen `?adresa=` a `/akce/` (ř. 177) předvyplní jen adresu,
  - `/kalkulacka-svj` (ř. 220, 288), `/nabidka-svj` (ř. 158) a `/pas-domu` (ř. 173, 210, 288 `'/akce/?adresa='+obec`) vedou na `/akce/` bez kontextu.
- `/akce/` na 390 × 844: H1 y = 149, „Reklamní spot — 30 s“ y = 671, formulář y = 1 643, `scrollHeight` 3 232. Spodní lišta s „Cena do 24 h“ je vidět hned.

### 5. Menu (obsah #11)
- Menu na `/` (ř. 1144–1160, desktop i mobil): Služby · Před / po · Ceník · **Kariéra** · **Pro firmy** · Pro SVJ · Kalkulačka SVJ · Chci nabídku.
- „Pro firmy“ vede na `/spoluprace`, kde je H1 „Máte WAP, plošinu nebo lidi? Pojďme to spojit.“, tedy nábor dodavatelů.
- Návrh `content/navigace.json` z úkolu 08 ponechává Kariéru i „Pro firmy“ v hlavním menu a v patičce má „Pro firmy a dodavatele“.

### 6. Fotky a videa (obsah #13)
- Slovo „ilustra“ se na webu nevyskytuje ani jednou (247 stránek).
- Sekce Před/po (ř. 1474–1498) má videa `strecha-mech` a `strecha-kapky` s popisky „BEZ PÉČE / S IMPREGNACÍ H-STONE“ a „BEZ OCHRANY / S H-STONE“ a pás „Co na střechách nacházíme“ (`povrch-*`).
- Dále jsou na webu vizuály `princip-*`, `hero-mech`, `hero-luxury`, `roof-detail`, `hstone-detail`, `h-stone-front-back` a `hydrofobni-*`.
- Nadtitulek „DŮKAZ MÍSTO SLIBŮ“ (ř. 1705) stojí nad textem, který žádný důkaz neobsahuje.
- Popisek „Skutečná zakázka“ u `realizace-strecha-*` řeší úkol 13 (T16).

### 7. Slib „do 24 hodin“ (obsah #17)
- 1 725 výskytů na 238 stránkách:
  - 1 692 na 232 generovaných stránkách (z toho 464 v `meta description` a `og:description`),
  - 33 na 6 ručně psaných stránkách: `/` 15 v těle a 6 v `<head>` a JSON-LD, `/akce/` 3 + 3, `/cisteni-fasad/` 1 + 2, `/cenik`, `/kalkulacka-svj` a `/nabidka-svj` po 1.
- **Znění se liší:**
  - na webu: „Cenu máte do 24 hodin“ 232×, „Chci cenu do 24 hodin“ 231×, „Nezávaznou cenu máte do 24 hodin“ 231×, „…nezávaznou cenu pošleme do 24 hodin“ 154× + 78× a další s názvem okresu, „Od adresy k ceně do 24 hodin“ 69×,
  - na `/akce/dekujeme/`: „ozveme se do 24 hodin“, i v `<title>` (GET 4. 10.),
  - v H-BOT: „Cena do 24 h“ a „Chci cenu do 24 h“.
- „Po–So 7:00–19:00“ je na 234 stránkách, ale „neděl/svátk/pracovní den“ na žádné. Poptávka odeslaná v sobotu večer slib poruší a stránky si odporují v tom, co za 24 h přijde (telefonát, nebo e-mail s cenou).
- Na `/` znamená „24 h“ i „plnou funkci“ impregnace. To řeší úkol 13 (T03–T05).

### 8. Značkový žargon (obsah #19)
- Výskyty:
  - `/cenik`: „Systém RAIL — Na dotaz“, „zakrývání oken systémem MASK“, „biocid H-BIO“,
  - `/pas-domu` a `/recenze/`: „štítek Sentinel“,
  - patička `/`: „HYDRA, RAIL, H-STONE a SENTINEL jsou obchodní označení HSPG“.
- **Co udělá úkol 13:** RAIL a HYDRA odstraní, „H-BIO“ nahradí „biocidním ošetřením“, MASK přeformuluje a „štítek Sentinel“ odstraní.
- **Co zbývá na tento úkol:** každá značka, která na webu zůstane (H-STONE, SENTINEL a cokoli, co vrátí fáze B úkolu 13), musí být při první zmínce na stránce vysvětlená.

### 9. Identita (obsah #20)
- „Můj příběh“ (ř. 1847–1856) je emotivní text bez ověřitelných faktů („Prošel jsem pádem i zradou…“).
- Patička `/` (ř. 1900–1901) má nadpis „KDE NÁS NAJDETE“ a odkaz „Otevřít trasu v mapě“ u adresy Pernerova 10/32. ARES tuto adresu uvádí jako sídlo.
- Pravidlo dopravy „od Prahy nebo Hradce Králové“ je na 233 stránkách (`content/ceny.json` → `doprava.zakladny`), na homepage se ale „Hradec“ nevyskytuje ani jednou.

### 10. Anglická stránka (obsah #18, právo #19, funkčnost #22)
- `/en.html`:
  - 5 tlačítek vede na `/akce/` (ř. 134, 147, 258, 301, 340),
  - „(in Czech)“ mají jen 2 z nich a jen jako `visually-hidden`,
  - „Privacy policy“ (ř. 355) vede na českou stránku,
  - stránka neříká, pro koho je ani v jakém jazyce odpovídáte,
  - H-BOT je na `/en` záměrně vypnutý.
- Úkol 13 (krok 11) přesměruje tlačítka na kontaktní panel s telefonem a e-mailem. Poptávku v angličtině bez soutěže dodá tento úkol.

### 11. FAQ (obsah #16)
- Homepage má 7 otázek napsaných ručně dvakrát: viditelně (`<details>` ř. 1724–1750) a v JSON-LD `FAQPage` (ř. 48).
- Nové otázky připraví majitel s Claude Pro (`ZADANI-CLAUDE-PRO.md`, P2) do `content/hbot-faq.json`. Na web se ale bez ruční úpravy HTML nedostanou.

### Co funguje a musí zůstat
- `/akce/` odesílá nativním `POST` (`action="/akce/dekujeme/"`), takže funguje bez JS i bez AI. Při selhání nabídne telefon.
- Průvodce vědomě neslibuje výhru (`gift:false`).
- Ceny mají jeden zdroj (`content/ceny.json` → `assets/ceny.js`, `data-cena` na 235–240 stránkách).
- Děkovná stránka vysvětluje „Co bude dál“ ve 3 krocích a nabízí orientační PDF a nahrání fotek.

## Cíl (měřitelný)
1. Každá trvalá výzva k poptávce vede na **`/poptavka/`**, nebo na formulář na téže stránce, a to bez soutěže a bez nového panelu. Patří sem menu, ručně psané stránky, kalkulačky, pas domu, SVJ, okresní stránky (jen přes šablonu), H-BOT a plovoucí menu.
   - `href="/akce/"` zůstane jen na `/akce/`, `/akce/dekujeme/`, `/pravidla-akce/` a v proužku akce na `/`.
   - Ukončení akce pak nevyžaduje změnu trvalých odkazů.
2. Účast v akci je dobrovolná volba: akce má vlastní stránku `/akce/` s odkazem na běžnou poptávku. Ve fázi B případně přibude nepovinné pole ve formulářích podle rozhodnutí O9 / O18-2.
3. Jeden poptávkový formulář z jedné definice (`content/poptavka.json`) na `/`, `/poptavka/` a anglicky na `/en`:
   - **3 povinná pole:** Co ošetřit, Adresa, Telefon. Souhlas jen tehdy, pokud ho ponechá úkol 09,
   - jeden krok,
   - skutečný `<form>`: Enter odešle a vše funguje i bez JS.
4. Kalkulačky, riziko řas, diagnostika a pas domu předvyplní formulář přes parametry URL: povrch, plocha, služba, typ objektu a adresa. Formulář se otevře ve stejném panelu.
5. Homepage na 390 × 844 (s vynucenou `content-visibility`):
   - `scrollHeight` ≤ **12 000 px**,
   - formulář začíná do 2. obrazovky,
   - ceny „od“ jsou do 5. obrazovky,
   - blok „Kdo za tím stojí“ s IČO je do 8. obrazovky.
6. První obrazovka na mobilu po zavření lišty souhlasu:
   - celé nad ohybem jsou H1 s tím, co firma dělá, cena „od … Kč/m²“ z `content/ceny.json`, tlačítko poptávky a telefon,
   - fixní a přilepené lišty zabírají dohromady ≤ **15 % výšky** (≤ 126 px při 844 px), a to při načtení i po posunu.
7. V menu žádný odkaz „Pro firmy“ nevede na nábor dodavatelů. Kariéra i spolupráce s dodavateli jsou jen v patičce.
8. Každý vizuál, který nepochází z doložené vlastní zakázky, má viditelný štítek „Ilustrační …“.
9. **(B)** Slib reakční doby má na webu, v H-BOT a v potvrzení zákazníkovi jedno schválené znění (krátký tvar a věta) z `content/firma.json`, včetně pravidla pro neděle a svátky.
10. **(B)** Značky jsou při první zmínce vysvětlené. Identita obsahuje alespoň 2 ověřitelná fakta. `/en` říká, pro koho je. FAQ na webu i v JSON-LD se generuje z jednoho zdroje.
11. Žádné nové tvrzení. Chybějící údaje jsou `[DOPLNIT]` a otázky pro majitele.

## Rozsah
**ANO:**
- nová stránka `/poptavka/` a děkovné stránky `/poptavka/dekujeme/` a `/poptavka/thank-you/` (EN),
- `content/poptavka.json`, `scripts/build-poptavka.mjs` a `assets/poptavka-formular.js`: jedna definice formuláře pro `/`, `/poptavka/` a `/en`,
- přesměrování trvalých výzev, a to i v šabloně okresních stránek (**jen** cíl odkazu) a v H-BOT (jen cíl odkazu a text odkazu ve znalostech),
- předávání parametrů z kalkulaček, rizika řas, diagnostiky, SVJ a pasu domu,
- `/akce/`: pořadí formuláře a spotu a odkaz na běžnou poptávku,
- chování scény „Holub vyletěl“ pro poptávky mimo akci (`holub-let.js`: jen blok akce a odkaz na fotky),
- data menu v `content/navigace.json` (úkol 08): položky, cíl výzvy, patička „Na webu“,
- anglický formulář na `/en`,
- přestavba homepage (pořadí, první obrazovka, přesun bloků beze změny textu na novou stránku `/jak-pracujeme/` a kalkulačky na `/cenik`),
- blok „Kdo za tím stojí“,
- FAQ na webu generované z `content/hbot-faq.json`,
- štítky ilustračních vizuálů (`content/vizualy.json`),
- mechanismus slibu reakční doby (`content/firma.json` → `reakce`, `scripts/build-sliby.mjs`) a glosář značek (`firma.json` → `znacky`),
- testy,
- ve fázi B texty podle rozhodnutí majitele.

**NE (patří jinam):**
- Měření, GA4/GTM, Clarity a cookie lišta → **úkol 10**. Události `dataLayer` zachovej. Co se mění (kroky průvodce), jen nahlas.
- Znění záruky („10 let“, podmínka) → **úkol 05**. Bere se jen z centrálního zdroje.
- Tvrzení o lešení, kalkulačky úspor, čítače, H-BIO, technologie, popisek „Skutečná zakázka“, texty a pravidla akce, spot a jeho přepis, kariéra → **úkol 13**.
- Doklady důvěry (pojištění, reference, registr zakázek) → **úkoly 13 a 14**.
- Obsah, struktura, URL a sitemap okresních stránek → **úkol 12**. Tady se na nich mění jen cíl výzvy (A) a slib (B) přes šablonu.
- E-mailové adresy, `data-mail`, FormSubmit → **úkol 03**.
- Komponenta hlavičky a patičky, paleta a písmo → **úkol 08**. Tady se mění jen data v `navigace.json` a případně nadpis „Kde nás najdete“ (krok B5).
- Text zásad, souhlasy (i na `/akce/`), anglické shrnutí zásad → **úkol 09**.
- `<title>`, description, OG a JSON-LD kromě `FAQPage` a slibu v `<head>` ve fázi B → **úkol 11**. H1 homepage → **úkol 11**, pokud ho už změnil.
- Validace telefonu, e-mailu a plochy, kotvy, scéna na `/akce/dekujeme/` → **úkol 17**. Použij jeho `assets/spolecne.js`.
- Fokus, klávesnice, umístění cookie lišty, `target="_blank"` na `/` → **úkol 16**. Pokud `target="_blank"` zůstal u odkazu, který tu přesměrováváš, odstraň ho.
- Vytahování inline CSS/JS kvůli výkonu, cache a obrázky → **úkol 07**. Tady platí jen „nezhoršit“.
- Podoba URL `/x` × `/x.html` a mechanismus přesměrování → **úkol 06**. Nové stránky jsou adresářové (`/poptavka/`, `/jak-pracujeme/`) jako `/akce/`.
- Oznámení, číslo poptávky a zdroj návštěvy → **úkol 02**. Použij `assets/poptavka-zdroj.js`.
- Logika H-BOT → **úkol 01**. Interní panel → **úkol 14**. CI → **úkol 19**.

## Postup

### Fáze A1 – cesta k poptávce (struktura, bez nových faktů)
1. **Větev `ukol-18-obsah-cesta-k-poptavce` z aktuální `main`.** Pravidla jsou v `CLAUDE.md` z úkolu 00, paralelní práce jen přes `git worktree`. Spusť `git -C ../hspg-balicek pull`.
   - Zjisti, které úkoly jsou sloučené v `main`: z `git log --oneline main` a podle existence `assets/poptavka-zdroj.js` (02), `assets/spolecne.js` (17), `content/navigace.json` a `scripts/build-layout.mjs` (08), registru tvrzení (13).
   - **Pokud chybí 02 nebo 13, zastav se a nahlas.** Chybějící 08, 09, 10, 11, 16 nebo 17 zapiš do hlášení a postupuj podle náhradního postupu u příslušného kroku.
2. **Najdi v repozitáři soubory, které generují:**
   - **homepage** (`index.html`, případně jeho generátor):
     - průvodce `#holub-sekce` a `#hspg-form-panel` (`renderFormInner`, `submitLead`, `prehrajHolubaLet`, `phoneOk`),
     - skrytý registrační formulář `hspg-poptavka` (podle úkolu 02 těsně před `</body>`),
     - `LANDING_URL`, kalkulačku (`.kalk__cta`, `#kalk-obvod`, `#kalk-vyska`), riziko řas (`#rz-cta`) a diagnostiku (ř. 1585),
     - CSS pravidlo `a[href="/akce/"]` (ř. 715) a banner akce nad průvodcem (ř. 1406),
   - **stránky:** `akce/index.html`, `akce/dekujeme/` (zjisti, jak vzniká), `pravidla-akce/`, `en.html`, `cenik.html`, `kalkulacka-svj.html`, `nabidka-svj.html`, `pas-domu.html`, `reference.html`, `cisteni-strech/index.html` a `cisteni-fasad/index.html`,
   - **generátory:** šablona `scripts/build-regions.mjs` (232 stránek s `data-gen="build-regions"`), `scripts/build-ceny.mjs` (`data-cena`), `scripts/build-hbot.mjs`, případně `scripts/build-layout.mjs` a `content/navigace.json` (08) a generátor sitemap (06),
   - **skripty:** `assets/holub-let.js`, `fotky-upload.js`, `nabidka-pdf.js`, `poptavka-zdroj.js` (02), `spolecne.js` (17), `hbot.js`, `hbot-panel.js`, `netlify/lib/ai/znalosti.mjs` a `pravidla.mjs` (01),
   - **konfigurace:** `netlify.toml` (`publish`, přesměrování, CSP včetně `form-action`), `_redirects`, existující testy a Playwright.

   Pak spusť `git grep -n -E 'href="/akce/|LANDING_URL|/akce/\?|target="_blank"' -- '*.html' '*.js' '*.mjs'` a počty podle souborů ulož do hlášení. Pokud se HTML generuje, uprav generátor, ne výstup.
3. **Výchozí stav.** Výsledky ulož do `.artefakty/ukol-18/pred/`, mimo publikovaný adresář.
   - Napiš měřicí pomocník `tests/e2e/pomocne-obsah.mjs`, který použijí i testy:
     - **Kontext:** 390 × 844, `isMobile`. Před načtením nastav `localStorage['hspg-souhlas'] = 'nezbytne'`. Všechny požadavky mimo lokální server a všechny ne-GET zablokuj (`page.route`).
     - **Postup:** posun po 700 px až na konec, pak styl `[data-cv]{content-visibility:visible!important}`. Vrací `scrollHeight` a polohy prvků.
     - **„Lišty“** jsou prvky s vypočteným `position` `fixed` nebo `sticky`, které:
       - jsou vidět (`display` ≠ none, `visibility` ≠ hidden, `opacity` > 0, výška ≥ 8 px) a protínají viewport,
       - nejsou skip link (pokud nemá fokus), `#souhlas-lista` ani otevřený panel H-BOT.
       Výsledek je délka sjednocení jejich svislých intervalů při načtení a po `scrollTo(0, 1000)`.
   - Změř `/` a `/akce/`. Na `/` dnes vyjde 27 585 px a lišty 126 / 193 px, na `/akce/` formulář 1 643 px.
   - Pořiď snímky `/`, `/akce/`, `/en` a `/cenik` na 390 × 844 a 1280 × 800.
   - Změř Lighthouse mobil `/` a `/akce/` (medián ze 3 běhů).
   - Spusť testy úkolů 02, 16 a 17 a testy balíčku (`npm test`, `npm run test:e2e` v `../hspg-balicek` proti webu). Výsledky jsou pro srovnání.
4. **Definice formuláře – `content/poptavka.json`** (jediné místo pro pole, popisky a parametry). Kostra:
   ```json
   {
     "url": "/poptavka/",
     "formular": "hspg-poptavka",
     "dekujeme": { "cs": "/poptavka/dekujeme/", "en": "/poptavka/thank-you/" },
     "zdroj": { "/": "Web HSPG / úvodní stránka", "/poptavka/": "Web HSPG / poptávka", "/en": "Web HSPG / anglická stránka" },
     "pole": [ … viz tabulka … ],
     "hlasky_en": { "povinne": "…", "telefon": "…", "email": "…", "plocha": "…" }
   }
   ```
   | `name` (pole Netlify) | Popisek cs / en | Typ | Povinné | Parametr URL (whitelist) |
   |---|---|---|---|---|
   | `Typ povrchu` | Co ošetřit / What needs treatment | `fieldset` s přepínači | **ano** | `povrch`: `strecha`, `fasada`, `dlazba`, `fotovoltaika`, `vice` (možnosti Střecha, Fasáda, Dlažba, Fotovoltaika, „Více povrchů / nevím“; sjednocuje „Komplet“ a „Kombinace / nevím“) |
   | `Adresa nemovitosti` | Adresa domu / Property address | text, max 140, `autocomplete="street-address"` | **ano** | `adresa` (jako dnes na `/akce/`) |
   | `Telefon` | Telefon / Phone | `tel`, max 20, `autocomplete="tel"`, `inputmode="tel"` | **ano** | nikdy z URL |
   | `Jméno` | Jméno a příjmení (nepovinné) / Name (optional) | text, max 80, `autocomplete="name"` | ne | – |
   | `email` | E-mail (nepovinné, pokud chcete nabídku i písemně) | `email`, max 120 | ne | – (název `email` z úkolu 02 kvůli Reply-To) |
   | `Typ objektu` | Typ objektu / Type of building | výběr | ne | `objekt`: `rd`, `bytovy-dum`, `jiny` (Rodinný dům, Bytový dům / SVJ, Jiný objekt; „Firemní objekt“ až po O18-7) |
   | `Přibližná plocha (m²)` | … / Approx. area (m²) | text, `inputmode="decimal"` | ne | `plocha` (kontrola `HSPG_SPOLECNE.plocha` z úkolu 17) |
   | `Požadovaná služba` | … | výběr | ne | `sluzba`: `cisteni`, `ochrana`, `renovace`, `med`, `poradte` (stejné možnosti jako dnes) |
   | `Poznámka` | … | textarea, max 1200 | ne | – |
   | `Kontext z kalkulačky` | skryté | hidden | – | `obvod` (30–200), `vyska` (3–20), `podlazi` (2–13), `riziko` (`nizke`/`stredni`/`vysoke`) |
   | `Jazyk`, `Zdroj` | skryté | hidden | – | – |

   - Dále obsahuje pole úkolu 02 (`subject`, `Číslo poptávky`, `Předchozí stránka`, `Kampaň`, `Reklamní kliknutí`), honeypot `_honey` a souhlas **přesně podle úkolu 09**. Pokud 09 ještě není sloučený, převezmi souhlas ze stávajícího průvodce beze změny textu.
   - Souhlas s pravidly akce v definici není.
   - Pole, která dnes posílá `submitLead` a v tabulce nejsou (`Příjmení`, `Čas odeslání`), vypusť a vyjmenuj je v hlášení. Netlify u starých podání sloupce ponechá.
   - Popisky a hlášky jsou česky i anglicky. Anglické popisky jsou překladem českých, nic nového nepřidávají.
5. **Generátor `scripts/build-poptavka.mjs`.**
   - Vykreslí formulář mezi značky `<!-- HSPG:POPTAVKA:START (generuje scripts/build-poptavka.mjs — neupravovat ručně) -->` … `<!-- HSPG:POPTAVKA:END -->` na `/`, `/poptavka/` (cs) a `/en` (en).
   - Tvar: `<form name="hspg-poptavka" method="POST" action="…dekujeme…" data-hspg-poptavka="cs|en">` se skrytým `form-name`, `Zdroj` podle stránky a `Jazyk`.
   - Povinná pole mají `required` a `aria-required="true"`.
   - Další atributy polí: `enterkeyhint` (`next`, u posledního `send`), `autocomplete` a `<label for>`. Volba povrchu je `<fieldset><legend>` s přepínači.
   - Nepovinná pole jsou v `<details>` „Upřesnit (nepovinné)“. Na `/poptavka/` je `<details>` otevřené.
   - Tlačítko je `<button type="submit">`. Nevkládej žádné inline skripty ani `on…=` (CSP, úkol 15). Povolené hodnoty parametrů vlož do `data-` atributů, aby je skript nemusel stahovat.
   - **Registrace pro Netlify:** v celém publikovaném výstupu je **právě jeden** formulář `hspg-poptavka` s `data-netlify` (nebo `netlify`) a obsahuje všechna pole definice i pole úkolu 02 (`subject` s `data-remove-prefix`). Ostatní výskyty nesou jen skrytý `form-name`.
     - Chování formulářů stejného jména na více stránkách a nativního POST ověř v dokumentaci Netlify Forms (detekce při nasazení) a odkaz uveď v hlášení.
     - Starý skrytý registrační `hspg-poptavka` v `index.html` odstraň, pokud registrace přejde na `/poptavka/`. `hspg-zavolejte` zůstává.
   - **`--kontrola`:** skončí kódem 1, pokud se blok mezi značkami liší od výstupu, pokud registrace chybí nebo je víckrát, nebo pokud pole odesílané skriptem chybí v registraci.
   - Zařaď generátor do build příkazu za `build-ceny` a do `package.json` přidej skripty `poptavka` a `poptavka:kontrola`.
6. **Skript `assets/poptavka-formular.js`** (`defer`, do 8 KB, bez závislostí). Načítá se na stránkách s `form[data-hspg-poptavka]`.
   - **Předvyplnění z URL:**
     - jen parametry z tabulky a jen hodnoty z whitelistu,
     - `plocha` přes `HSPG_SPOLECNE.plocha`, `adresa` oříznutá na 140 znaků,
     - `obvod`, `vyska`, `podlazi` a `riziko` jen jako celá čísla v rozsahu nebo povolené hodnoty → text do `Kontext z kalkulačky`. Ukázky: „Kalkulačka SVJ: obvod 80 m, 6 podlaží“, „Kalkulačka fasády: obvod 26 m, výška 6 m“, „Riziko řas: střední“,
     - hodnoty vkládej **jen** přes `.value` a `textContent`, nikdy přes `innerHTML`. Neznámé parametry ignoruj,
     - po předvyplnění zobraz krátký souhrn (`textContent`) a otevři `<details>`,
     - telefon, e-mail ani jméno se z URL nikdy nečtou.
   - **Odeslání:**
     - `novalidate` přidá až skript. Pak kontrola povinných polí a `HSPG_SPOLECNE.telefon`/`email`/`plocha` (úkol 17) s chybou u pole (`aria-invalid`, `aria-describedby`, fokus na první chybné pole). Anglické hlášky jsou z `hlasky_en`,
     - přidej pole z `HSPGPoptavka.pole('hspg-poptavka', cislo)` (úkol 02) a normalizovaný telefon,
     - pak `fetch('/', POST urlencoded)`,
     - **po úspěchu:** do `sessionStorage['hspg-holub-lead']` ulož stejná data jako dnes, k nim `cislo` (02) a `zdroj:'poptavka'`. Pak buď přechod na děkovnou stránku, nebo na `/` háček pro scénu holuba (krok 8),
     - **při selhání `fetch`:** `form.submit()` nativně. Bez `mailto` zálohy, chybová hláška s telefonem a e-mailem podle úkolu 03.
   - **Záloha:** pokud `HSPG_SPOLECNE` nebo `HSPGPoptavka` chybí, jen minimální kontrola (aspoň 9 číslic). Odeslání nikdy neblokuj kvůli chybějícímu pomocnému skriptu.
   - **`dataLayer`:**
     - `generate_lead` a `lead_submit` zachovej s dnešními parametry: `lead_type` je `b2c_complete` pro „Více povrchů / nevím“, jinak `b2c_surface`,
     - `lead_funnel_step` posílej při prvním vstupu do formuláře (`step_number:1, step_name:'contact_started'`) a před odesláním (`step_number:2, step_name:'form_completed'`),
     - pokud úkol 10 zavedl jinou specifikaci, drž se jí. Změnu oznam v hlášení pro úkol 10.
7. **Nové stránky:**
   - **`poptavka/index.html`:**
     - Hlavička a patička z komponenty úkolu 08. Bez 08 použij soustředěnou hlavičku jako `/akce/` (logo a telefon).
     - V A použij jen dosavadní texty webu. H1 „Nezávazná poptávka“, věta „Stačí adresa domu a telefon — technik nemusí na místo.“ a slib jako `<span data-slib="veta">` se stávajícím zněním (krok 21).
     - Pod tím formulář (první pole do 844 px), telefon `tel:` s pracovní dobou z `content/firma.json` a „Co bude dál“ ve 3 krocích z děkovné stránky.
     - Žádný odkaz na akci.
     - `<title>`, description a canonical sestav z dosavadních textů (úkol 11 je může upravit). Stránka nemá noindex a do sitemap ji dostaň přes generátor úkolu 06 (bez něj ručně a nahlas).
   - **`poptavka/dekujeme/`** (noindex) vzniká **ze stejného zdroje** jako `/akce/dekujeme/` (sdílená šablona nebo generátor), aby fotky (`hspg-fotky`, `action` na vlastní stránku), číslo poptávky (02), orientační PDF (`nabidka-pdf.js`), „Co bude dál“ a pravidlo přehrání scény (17) byly na jednom místě.
     - Jediný rozdíl: věta „U akce evidujeme…“ je jen na `/akce/dekujeme/`.
     - `?fotky=1` funguje jako dnes.
   - **`poptavka/thank-you/`** (noindex, `lang="en"`) má jen texty přeložené z české děkovné stránky:
     - potvrzení, číslo poptávky, „We will call you back during working hours (Mon–Sat 7:00–19:00)“,
     - telefon a odkaz zpět na `/en`,
     - bez formuláře fotek (je jen česky; nahlas jako návrh).
   - Ověř, že CSP `form-action` povoluje nativní POST na obě děkovné stránky.
8. **Homepage – formulář místo průvodce.**
   - V `#holub-sekce` nahraď panel průvodce vygenerovaným formulářem (značky z kroku 5). Na ≤ 760 px je formulář v normálním toku hned pod nadpisem a scéna holuba (klec, vzlet) pod ním.
   - Odstraň `renderFormInner`, `submitLead`, počítadlo „krok N z 6“ a `phoneOk`/`emailOk`, pokud je ještě neodstranil úkol 17. `id="holub-sekce"` zachovej.
   - Animaci a `prehrajHolubaLet` napoj na háček úspěchu z kroku 6, s `gift:false`.
   - Nadpis sekce už nenese název soutěže. V A použij dosavadní „Orientační cena z adresy“ (z boxu v úvodu), konečné znění je otázka O18-9.
   - **Banner akce nad formulářem (ř. 1406) odstraň.** Proužek akce (ř. 1138) zůstává jako slot `oznameni` (08) a jeho text řeší úkol 13. Pokud je ve zdroji stále uvnitř přilepené lišty, přesuň ho mimo ni (jen poloha).
   - **`assets/holub-let.js`:**
     - pro `gift:false` nevykresluj blok `hd-gift` vůbec, tedy žádnou pozvánku do akce,
     - tlačítko „📷 FOTKY K POPTÁVCE“ vede pro `gift:false` na `/poptavka/dekujeme/?fotky=1#fotky` a pro `gift:true` na `/akce/dekujeme/?fotky=1#fotky`,
     - texty bloku pro `gift:true` neměň (úkol 13).
   - **Testy jiných úkolů**, které počítají se starým průvodcem, uprav jen v selektorech a očekáváních a nic nemaž:
     - e2e úkolu 02 (5 formulářů),
     - test kotev úkolu 17: cílem `#holub-sekce` je teď první pole formuláře místo tlačítka „🕊 VYPUSŤTE HOLUBA“,
     - každou změnu vypiš v hlášení.
9. **Přesměrování trvalých výzev.** Cíl se bere z `content/poptavka.json` → `url`.
   - **Stránky s vlastním formulářem** (`/`, `/en`) vedou výzvy na kotvu formuláře na stránce: na `/` `#holub-sekce` (ř. 1345, 1858, 1866, `LANDING_URL` v `#cta-stack`), na `/en` `#quote`. Ostatní vedou na `/poptavka/`.
   - **Ručně psané stránky:** `/cenik` (ř. 198, 350), `/nabidka-svj` (158), `/kalkulacka-svj` (220, 288), `/pas-domu` (173, 210, 288), `/reference` (130, 153), `/cisteni-strech/` (6), `/cisteni-fasad/` (16, 17, 21, 23) a hlavičky `/kariera`, `/spoluprace`, `/recenze/` a `/ochrana-osobnich-udaju` (s úkolem 08 přes `navigace.json`).
   - **CSS na `/`:** pravidlo `a[href="/akce/"]` (ř. 715) uprav na nový cíl, aby se zachoval vzhled.
   - **Šablona `build-regions.mjs`:** změň **jen** `href` čtyř výzev. Vygeneruj stránky a proveď normalizační kontrolu z části Ověření (jiná změna = 0).
   - **H-BOT** (soubory převzaté z balíčku, změny jen v cíli odkazu):
     - `assets/hbot.js`: lišta „Cena do 24 h“ vede na stránkách s `form[data-hspg-poptavka]` na tento formulář, na `/akce/` jako dnes na `#poptavka` a jinde na `/poptavka/`. Konstantu cíle kontroluje test shody s `content/poptavka.json`,
     - `hbot-panel.js`: čip vede na `/poptavka/`, parametr události `hbot_cta` je `cil:'poptavka'`,
     - `netlify/lib/ai/znalosti.mjs` a `pravidla.mjs`: text `hspg.cz/akce/` → `hspg.cz/poptavka/`,
     - potom spusť `node scripts/build-hbot.mjs` a `--kontrola`,
     - diff těchto souborů dej do hlášení, aby se promítl zpět do balíčku.
   - U každého odkazu, který měníš, odstraň `target="_blank"`, pokud ho neodstranil úkol 16.
   - **Zůstává na `/akce/`:** odkazy z `/pravidla-akce/` („Zpět na akci“), proužek akce na `/`, `holub-let.js` pro `gift:true` a text přepisu spotu.
10. **Kalkulačky a nástroje → parametry** (statické `href` je záložní cíl bez JS, skript ho při změně vstupů přepíše):
    | Odkud | Cíl |
    |---|---|
    | kalkulačka `/` (`.kalk__cta`, po A2 na `/cenik`) | `/poptavka/?povrch=fasada&sluzba=ochrana&plocha=<plocha>&obvod=<o>&vyska=<h>` |
    | riziko řas (`#rz-cta`) | `/poptavka/?povrch=fasada&sluzba=ochrana&riziko=<úroveň>&adresa=<…>` |
    | diagnostika (ř. 1585) | `/poptavka/?povrch=<zvolená část>`, jen pokud se volba jednoznačně mapuje na povrch, jinak bez parametru |
    | `/kalkulacka-svj` (`#perimeter`, `#floors`, `#area-output`) | `/poptavka/?objekt=bytovy-dum&povrch=fasada&sluzba=ochrana&plocha=<m²>&obvod=<p>&podlazi=<f>` |
    | `/nabidka-svj` | `/poptavka/?objekt=bytovy-dum` |
    | `/pas-domu` ř. 288 | `/poptavka/?adresa=<obec>` |
    | kalkulačka `/en` (ř. 301) | vyplní formulář na stránce a posune na `#quote`, záložní `href="#quote"` |
    - **Cenu do URL nikdy nedávej**, dala by se podvrhnout. Pokud ji chceš na cílové stránce ukázat, přepočítej ji z `HSPG_VYPOCET` a označ jako orientační.
    - **Kód pasu domu do URL nedávej.** Kód je dnes jediným klíčem k údajům (úkol 14) a URL končí v historii, logu a analytice.
11. **`/akce/`.**
    - Přesuň sekci s H2 a formulářem `#poptavka` hned pod úvod a spot dej pod formulář.
    - Neměň `name`, `action`, pole, povinnost polí, „Suché dny u vás“ ani souhlas. Souhlas je úkol 09, povinnost polí podle pravidel řeší O18-2 a úkol 13.
    - Pod formulář přidej řádek bez nových faktů: „Chcete jen cenovou nabídku bez zapojení do akce? <a href="/poptavka/">Běžná poptávka</a>“.
    - Odkaz na přepis spotu (ř. 95 `/#spot-prepis`) uprav v kroku 17, až se přepis přesune.
12. **Menu.** Data jsou v `content/navigace.json` z úkolu 08.
    - `cs.menu`: odeber „Kariéra“ a „Pro firmy“.
    - Patička „Na webu“: „Kariéra → /kariera“ a „Spolupráce a dodavatelé → /spoluprace“ místo „Pro firmy a dodavatele“.
    - `cs.cta.href` = `url` z `content/poptavka.json`, text „Chci cenu“ ponech. `en.cta.href` = adresa `/en` (v podobě podle úkolu 06) + `#quote`.
    - Firemní zákazníky do menu nepřidávej, dokud majitel neodpoví O18-7. „Reference“ do hlavního menu jen s alespoň 1 zveřejněnou položkou.
    - Spusť `build-layout` a jeho `--kontrola`. Test šířky menu z úkolu 08 (320–1920 px) musí projít.
    - **Bez úkolu 08:** stejné změny udělej přímo v menu `/` (ř. 1144–1160, desktop i `#mobile-menu`) a v hlavičkách, které „Kariéra“ nebo „Pro firmy“ obsahují. V hlášení napiš úkolu 08, ať je převezme do dat.
13. **Anglický formulář na `/en`.**
    - Do sekce kontaktního panelu (`id="quote"`, `lang="en"`) vygeneruj anglickou variantu se stejnými názvy polí, `Jazyk=en`, `Zdroj` podle stránky a `action="/poptavka/thank-you/"`. Bez akce a bez odkazu na pravidla.
    - Informační věta o zpracování údajů je překladem české věty, kterou u formuláře používá úkol 09. Odkaz „Privacy policy (in Czech)“ ponech, dokud úkol 09 nedodá anglické shrnutí.
    - Všech 5 tlačítek (úkol 13 je přesměroval na kontaktní panel) veď na `#quote`. Skryté „(in Czech)“ u tlačítek a větu úkolu 13 „formulář je jen v češtině“ odstraň, protože formulář už je anglický. Telefon a pracovní doba zůstávají.
    - Větu o tom, pro koho stránka je a jak komunikujete, přidá až fáze B (O18-6). **Do produkce jde anglický formulář až s odpovědí na O18-6.**
14. **Testy A1, náhled, mezihlášení.**
    - Testy (sekce Ověření): `tests/poptavka.test.mjs`, `tests/e2e/poptavka.e2e.test.mjs`. Spusť i testy úkolů 02, 16 a 17 a testy balíčku.
    - Náhled: `npm run nahled` (0 kreditů). Na náhledu jen GET: `/poptavka/`, `/`, `/en`, `/akce/`, `/kalkulacka-svj` a jedna okresní stránka. V Netlify → Forms (jen čtení) ověř, že `hspg-poptavka` je zaregistrovaný se všemi poli. **Nic neodesílej** (test na náhledu jen se souhlasem majitele podle úkolu 02).
    - **Mezihlášení A1** a stop, pokud se fáze A2 do sezení nevejde. Jinak pokračuj.

### Fáze A2 – homepage a první obrazovka (struktura, texty beze změny)
15. **Návrh přestavby.** Do hlášení dej tabulku: blok → výška před → kam (zůstává / sloučit / `/jak-pracujeme/` / `/cenik`) → odhad výšky po. Cílové pořadí na `/`:
    1. úvod (krok 16),
    2. formulář `#holub-sekce`,
    3. služby: 3 karty (střecha, fasáda, dlažba) s cenami „od“ přes `data-cena` (jen čištění i s ochranou H-STONE) a odkazem na `/cenik`, převzaté z `#sluzby` a tabulky ceníku,
    4. Před/po: jedna fotka a nejvýš jedno video se štítky z kroku 20,
    5. postup „Šest kroků“ a blok předávání „Co od nás dostanete písemně“ (krok 20),
    6. Kdo za tím stojí (krok 18),
    7. FAQ (krok 19),
    8. závěrečná výzva,
    9. patička (08).

    - **Beze změny textu přesuň na `/jak-pracujeme/`:** spot `#spot` (s `#spot-prepis` a JSON-LD `VideoObject`), diagnostiku „Vyberte část domu.“, H-STONE, Měď, riziko řas `#riziko-rasy`, „Co udělá čas s fasádou“, „Holub se vždy vrací domů“ a „Žádné zkratky“.
    - **Na `/cenik`:** kalkulačka „Spočítejte si to sami“, pokud tam ještě není.
    - **Odstraň:** druhý řádek statistik a běžící pás (ř. 1255–1256).
    - Efekt deště v úvodu ponech, jen pokud se vejde do kritérií první obrazovky. Jinak ho z úvodu odstraň a uveď v hlášení.
    - Pokud odhad přesáhne 12 000 px, navrhni v hlášení další přesuny a počkej.
16. **První obrazovka** (≤ 760 px, pořadí v úvodu):
    - **H1:** pokud ho upravil úkol 11, převezmi ho. Jinak podle `audit-seo.json` #12: `<h1><span>Čištění a ochrana střech, fasád a dlažeb</span> Věci stárnou. My zůstáváme.</h1>`, slogan vizuálně jako menší podtitulek.
    - **Věta:** jedna stávající věta „Dům zaměříme na dálku: stačí adresa“ + `<span data-slib="veta">` se stávajícím zněním.
    - **Ceny:** „Čištění střech od <span data-cena="cisteni_only.roof">99</span>, fasád od 89, dlažby od 69 Kč/m² · konečné ceny, nejsme plátci DPH“. Hodnoty přes `data-cena` a `build-ceny.mjs`.
    - **Tlačítko** „Chci cenu“ na `#holub-sekce` a `tel:` s `telefon_zobrazeni`.
    - **Mikrořádek** „Dušan Holub · IČO 09291881“ z `content/firma.json`.
    - **Statistiky** nejvýš jednou, ve znění po úkolu 13.
    - **Box `#hero-rychla-poptavka`:** volba povrchu předvyplní pole „Co ošetřit“ a posune na formulář. Událost `hero_service_selected` zachovej. Pokud se box do první obrazovky nevejde, odstraň ho, protože formulář následuje hned za úvodem.
    - **Lišty ≤ 15 %:** s úkolem 08 je mobilní hlavička nepřilepená, takže zbývá `#hspg-lista` (67 px). **Bez 08** na ≤ 760 px zruš přilepení horní lišty (jen `position`) a proužek akce dej mimo ni. Lišta souhlasu se nepočítá (úkol 16).
17. **Stránka `/jak-pracujeme/`.** Název je převzatý z nadtitulku „JAK PRACUJEME“ na `/`.
    - Hlavička a patička z úkolu 08. `<title>` a description sestav z nadpisů přesunutých bloků. Canonical, sitemap (06), indexovatelná.
    - Na `/` ji ohlásí krátký blok se třemi odkazy (dosavadní nadpisy). V `navigace.json` dej položku „Jak pracujeme“ za „Služby“. Majitel ji může odebrat a test šířky menu musí projít.
    - **CSS a JS** přesunutých bloků přesuň do `assets/jak-pracujeme.css` a `assets/jak-pracujeme.js` (`defer`, žádné inline skripty ani `on…=`). Pokud úkol 07 už rozdělil inline kód do souborů, použij je.
    - **Zachovej `id`:** `#spot`, `#spot-prepis`, `#riziko-rasy`, `#riziko-form`, `#roky-posuvnik`, `.damage-visualizer` a další.
    - Testy úkolů 16 a 17, které tyto prvky hledají na `/`, přesměruj na novou stránku a nic nemaž.
    - Pravidlo úkolu 17 platí i tady: žádný prvek s `data-cv` nad cílem kotvy.
    - **Odkazy na přesunuté kotvy** uprav: `/akce/` ř. 95 → `/jak-pracujeme/#spot-prepis` a další podle `git grep -n 'href="/#'`.
    - JSON-LD `VideoObject` přesuň beze změny obsahu spolu s videem a nahlas úkolu 11.
    - Lighthouse `/jak-pracujeme/` nesmí být horší než `/` před úkolem.
18. **Kdo za tím stojí.**
    - Blok „Můj příběh“ přesuň **beze změny textu** na pozici 6 a dej mu `data-blok="kdo-za-tim-stoji"`.
    - Doplň řádek identity z `content/firma.json`: provozovatel, OSVČ, IČO, telefon a pracovní doba. Fotka zakladatele zůstává.
    - Pokud úkol 11 vytvořil `/o-nas`, přidej odkaz.
    - Roky podnikání, počty zakázek ani „tým“ nepřidávej. Řeší je fáze B (O18-5).
19. **FAQ z jednoho zdroje** (místo pro otázky z Claude Pro, P2).
    - Položky v `content/hbot-faq.json` dostanou volitelné pole `"web": { "poradi": n, "a": "odpověď pro web" }`.
    - **Převod dnešních 7 otázek z `/`** (text po úkolech 05 a 13):
      - pokud existuje položka se stejným `q`, doplň jí `web` s dosavadní odpovědí z webu doslova,
      - jinak přidej položku s `k` (klíčová slova), `a` a `web` se stejnou odpovědí. H-BOT ji pak umí také.
    - **Nový `scripts/build-faq-web.mjs` (+ `--kontrola`):** vykreslí `<details>` mezi `<!-- HSPG:FAQ:START/END -->` a JSON-LD `FAQPage` mezi `<!-- HSPG:FAQ-LD:START/END -->` ze stejných položek. Zástupné `{{zaruka}}` atd. nahradí stejně jako `build-hbot.mjs` (úkol 05).
    - Ověř, že `build-hbot.mjs --kontrola` nové pole snese. Pokud ne, uprav ho minimálně a diff nahlas pro balíček.
    - Test JSON-LD z úkolu 11 musí projít.
20. **Ilustrační vizuály.**
    - **Nový `content/vizualy.json`:** jméno souboru bez velikosti a přípony → `stav`:
      - `vlastni` = doložená vlastní zakázka se souhlasem,
      - `ceka` = čeká na úkol 13 O10 (`realizace-strecha`),
      - `ilustracni`,
      - `grafika` (logo, ikony, infografiky, animace holuba; bez štítku).
    - Výchozí stav všech fotek a videí povrchů a střech je `ilustracni`: `strecha-mech`, `strecha-kapky`, `povrch-*`, `princip-*`, `hero-mech`, `hero-luxury`, `roof-detail`, `hstone-detail`, `h-stone-front-back`, `hydrofobni-veda` a další z inventury `git grep -n -E 'src=|poster=|srcset='`.
    - **Štítky:** u každého `ilustracni` vizuálu viditelný štítek z dat: „Ilustrační snímek“ / „Ilustrační video“, EN „Illustrative image“ / „Illustrative video“. Štítek je ve `figcaption` nebo v překryvu s kontrastem podle úkolu 08 a písmem ≥ 12 px.
    - Popisek u `ceka` je ten z úkolu 13.
    - Nadtitulek „DŮKAZ MÍSTO SLIBŮ“ (ř. 1705) nahraď „Co od nás dostanete písemně“ podle doporučení auditu #13 (bez nového faktu).
21. **Slib reakční doby – jen mechanismus, bez viditelné změny.**
    - `content/firma.json` → `"reakce"`:
      ```json
      { "potvrzeno": false,
        "kratka": "[DOPLNIT: krátké znění pro tlačítka a lišty]",
        "veta": "[DOPLNIT: věta – co přijde (telefonát / e-mail s orientační cenou), do kdy, pravidlo pro neděle a svátky]" }
      ```
    - **`scripts/build-sliby.mjs`** má tři režimy:
      - `--inventura` zapíše CSV `.artefakty/ukol-18/sliby.csv` (stránka; kontext tělo / `<head>` / JSON-LD / JS; přesné znění; počet),
      - `--kontrola` (A: jen vypíše počet variant, kód 0),
      - `--prisne` (B: kód 1 při jakémkoli jiném znění, než je `kratka`/`veta`, nebo při `potvrzeno:false`).
    - Plní `[data-slib="kratka|veta"]` jako `build-ceny.mjs` plní `data-cena`. Dokud je `potvrzeno:false`, text v nich nemění.
    - Nová místa z fáze A (úvod, `/poptavka/`) obal do `data-slib` se stávajícím zněním. **Ostatních 1 725 výskytů v A neměň.**
22. **Glosář značek – jen data a test v režimu hlášení.**
    - `content/firma.json` → `"znacky"`. Vysvětlení jen z dosavadních textů webu, se zdrojem:
      - `"H-STONE": { "vysvetleni": "hydrofobní impregnace", "zdroj": "/cenik – „hydrofobní impregnace H-STONE“" }`,
      - `"SENTINEL": { "vysvetleni": "tarify péče o dům po ošetření", "zdroj": "/cenik – „Tarify péče navazují na ošetření H-STONE“" }`.
    - Test `tests/znacky.test.mjs`: na každé veřejné stránce má první viditelný výskyt značky do 60 znaků před ním nebo za ním vysvětlení nebo jeho obecné slovo (`impregnac`, `tarif`, `péč`). V A jen vypíše porušení, ve fázi B je přísný.
23. **Testy A2, měření a hlášení fáze A.**
    - Testy: `tests/e2e/obsah-homepage.e2e.test.mjs`, `tests/obsah.test.mjs` a všechny předchozí.
    - Lighthouse mobil před a po pro `/`, `/poptavka/`, `/jak-pracujeme/` a `/akce/`.
    - Snímky 390 × 844 a 1280 × 800 před a po do `.artefakty/ukol-18/`.
    - `npm run nahled` a GET kontrola na náhledu.
    - **Hlášení fáze A** (formát níže) a **stop**.

### Fáze B – texty po rozhodnutích majitele
Každý krok proveď jen tehdy, když je odpověď na příslušnou otázku písemně v hlášení, v `ROZHODNUTI.md` (Claude Pro, P1) nebo ve zprávě majitele. Bez odpovědi krok přeskoč a nech `[DOPLNIT]`. Ten se na web nikdy nevypíše, generátory takovou hodnotu vynechají.

24. **Slib reakční doby (O18-1).**
    - Vyplň `reakce` a nastav `potvrzeno:true`. `kratka` musí být pravdivá sama o sobě, bez hvězdiček a poznámek.
    - **Šablona `build-regions.mjs`:** všechny varianty v těle i v `<head>` nahraď hodnotami z `reakce`. Description nesmí přesáhnout limit úkolu 11 a jeho test musí projít.
    - **Ručně psané stránky:** v těle obal výskyty do `data-slib` a spusť build. V `<head>` a JSON-LD (11 výskytů ve 3 souborech) je uprav ručně.
    - **H-BOT:** lišta a čip (test shody s `kratka`) a `znalosti.mjs`. Upravená očekávání testů balíčku dej do hlášení.
    - **Děkovné stránky:** `<title>` a text obou podle `reakce`.
    - **Úkol 02:** `potvrzeni_zakaznikovi.text` → lhůta podle `veta` (nahradí tamní `[DOPLNIT]`).
    - Kontrola: „24 h“ na webu neznamená nic jiného. Čítač a „plná funkce“ řeší úkoly 13 a 17, jen ověř, že se popisky slibu nepletou.
    - `build-sliby --prisne` musí skončit kódem 0.
25. **Akce (O9 v úkolu 13, O18-2):**
    - **(a) Pokračuje a účast je volbou ve všech poptávkových formulářích:**
      - do `content/poptavka.json` (jen cs) přidej nepovinný, výchozí nezaškrtnutý checkbox `Účast v akci` s textem „Chci se zapojit do akce Vypusťte holuba“ a odkazem na pravidla,
      - pole doplň do registrace,
      - `gift` ve scéně = hodnota pole a věta „U akce…“ na děkovné stránce jen při „ano“,
      - na `/akce/` stejný checkbox,
      - publikace pravidel v2, která říkají, které formuláře se počítají, patří úkolu 13. Bez nich tuto variantu nepublikuj.
    - **(b) Pokračuje jen na `/akce/`:** stav z fáze A.
    - **(c) Končí:**
      - `/akce/` → 301 na `/poptavka/` a `/akce/dekujeme/` → `/poptavka/dekujeme/` mechanismem úkolu 06,
      - `/pravidla-akce/` zůstává s datem ukončení (úkol 13),
      - ověř `curl -sI`.
26. **Vizuály (O18-3, O10 v úkolu 13).** Podle seznamu majitele uprav `content/vizualy.json`. Stav `vlastni` jen s archivovaným originálem a souhlasem majitele domu, ostatní zůstávají `ilustracni`. Popisek „Skutečná zakázka“ vrací úkol 13.
27. **Žargon (po fázi B úkolu 13, O1–O3, O5):**
    - doplň `znacky` o značky, které na webu zůstaly, a uprav jejich první zmínky,
    - SENTINEL popisuj na `/pas-domu` a `/cenik` stejně (z `content/sentinel.json`),
    - test značek přepni do přísného režimu.
28. **Identita (O18-4, O18-5):**
    - příběh zkrať na schválené znění (3–4 věty) s alespoň 2 ověřitelnými fakty, např. „Podnikám pod IČO 09291881 od roku 2020 (ARES)“ až po potvrzení,
    - patička: „Sídlo“ nebo „Provozovna“ podle odpovědi. Pokud komponenta 08 stále vypisuje „Kde nás najdete“ nebo „trasu v mapě“ u sídla, uprav jen tento nadpis a odkaz přes data `firma.json`,
    - „Vyjíždíme z Prahy a z Hradce Králové“ uveď na `/` i `/cenik` stejně jako `content/ceny.json` → `doprava.zakladny`, jen pokud majitel základnu potvrdí,
    - „tým“ používej jen v potvrzeném rozsahu.
29. **`/en` (O18-6, O12 v úkolu 13):**
    - úvodní věta, pro koho stránka je a v jakém jazyce a jak odpovídáte,
    - odkaz „Privacy policy“ na anglické shrnutí z úkolu 09, jakmile existuje,
    - pak teprve anglický formulář do produkce.
30. **Firmy a SVJ (O18-7, O18-8):**
    - při kladné odpovědi možnost „Firemní objekt“ a sekce „Bytové domy a firmy“ na `/nabidka-svj` s texty od majitele,
    - pole pro SVJ (Role, Počet jednotek, IČO SVJ, Termín shromáždění) jako nepovinná, zobrazená jen při `Typ objektu = Bytový dům / SVJ`, a doplněná do registrace.
31. **FAQ (O18-10):** položky z P2 vlož do `content/hbot-faq.json`. Pole `web` dostanou jen ty, které majitel chce i na webu. Pak build a test shody.
32. **Texty k odsouhlasení (O18-9):** úvod, tlačítka, nadpis formuláře a „Co od nás dostanete písemně“ podle odpovědi.
33. **Ověření a hlášení fáze B:**
    - testy v přísném režimu a všechny dřívější testy,
    - náhled, snímky,
    - hlášení fáze B.

### Otázky pro majitele (vlož do hlášení fáze A)
- **O18-1 Slib reakční doby.**
  - Co přesně do 24 hodin přijde: telefonát, nebo e-mail s orientační cenou?
  - Platí lhůta Po–So? Vyřídíte poptávky z neděle a svátků následující pracovní den?
  - Navrhněte krátké znění pro tlačítka a větu. Totéž je otázka P1 v `ZADANI-CLAUDE-PRO.md`.
- **O18-2 Akce** (navazuje na O9 v úkolu 13). Pokud akce pokračuje:
  - (a) Má být účast nepovinným zaškrtávacím polem ve všech poptávkových formulářích, nebo (b) jen na `/akce/`?
  - Mají se na `/akce/` zmírnit povinná pole (jméno, e-mail)? Pravidla dnes žádají „úplné údaje“.
- **O18-3 Vizuály.** U každého souboru z `content/vizualy.json` uveďte:
  - vlastní fotka nebo video z vaší zakázky (kdy, kde, souhlas majitele domu, originál),
  - nebo ilustrační (fotobanka, generované, 3D).
- **O18-4 Adresa a základny.**
  - Je Pernerova 10/32 jen sídlo, nebo provozovna, kde zákazník někoho zastihne?
  - Vyjíždíte i z Hradce Králové? Jak smí web základnu popsat?
- **O18-5 Kdo za tím stojí.** Souhlasíte se zkrácením příběhu na 3–4 věty a s fakty „podnikám pod IČO 09291881 od roku 2020“?
  - Jaká další doložitelná fakta smí web uvést: roky praxe, počet zakázek, kdo na zakázkách pracuje (sám / zaměstnanci / subdodavatelé)?
- **O18-6 Angličtina.**
  - Kdo komunikuje anglicky a jak (telefon, e-mail, obojí)?
  - Pro koho je anglická stránka (cizinci v ČR, zákazníci z EU)?
- **O18-7 Firemní zákazníci.** Obsluhujete firmy (haly, kanceláře, areály)? S jakou nabídkou?
- **O18-8 SVJ.** Chcete pro bytové domy pole Role (výbor / správce / vlastník), Počet jednotek, IČO SVJ a Termín shromáždění?
- **O18-9 Texty.** Schvalte znění:
  - první obrazovky (H1, věta, tlačítka) a nadpisu formuláře místo „Vypusťte holuba. Přiletí k vám.“,
  - tlačítek: zachovat motiv holuba, nebo „Chci cenu“?
  - nadtitulku „Co od nás dostanete písemně“.
- **O18-10 FAQ.** Které nové otázky z P2 mají být i na webu, nejen v H-BOT?

## Akceptační kritéria
**Fáze A1**
- [ ] `node scripts/build-poptavka.mjs --kontrola` → kód 0. `/`, `/poptavka/` a `/en` mají blok `HSPG:POPTAVKA` právě jednou.
- [ ] Test: ve výstupu je právě 1 formulář `hspg-poptavka` s `data-netlify`/`netlify` a obsahuje všechna pole z `content/poptavka.json` i pole úkolu 02. Každý klíč zachyceného payloadu existuje v registraci.
- [ ] **Test odkazů:**
  - `href="/akce/"` je jen v povolených souborech (`akce/`, `akce/dekujeme/`, `pravidla-akce/`, proužek akce na `/`),
  - na okresních stránkách 0,
  - žádný interní odkaz na `/poptavka/` nemá `target="_blank"`,
  - `hbot.js` a `content/poptavka.json` mají stejný cíl.
- [ ] Normalizační kontrola okresních stránek → „jiné změny: 0“.
- [ ] **E2E odeslání:** na `/poptavka/` i na `/` lze odeslat poptávku vyplněním jen „Co ošetřit“, „Adresa“ a „Telefon“ (+ souhlas, pokud ho úkol 09 ponechal). Zachycený payload obsahuje:
  - `form-name=hspg-poptavka` a telefon ve tvaru `+420…`,
  - `Zdroj` podle stránky a pole úkolu 02,
  - žádné pole o pravidlech akce.
  
  `/poptavka/dekujeme/` neobsahuje „U akce“ ani „každá desátá“.
- [ ] E2E: `222 123 456`, `+421 905 123 456` a `+44 7700 900123` projdou validací (modul úkolu 17).
- [ ] **E2E bez JS** (`javaScriptEnabled: false`): prázdné povinné pole odeslání zablokuje. Vyplněný formulář odejde nativním POST s `action` `/poptavka/dekujeme/` (zachyceno).
- [ ] E2E: Enter v poli Adresa s vyplněnými povinnými poli odešle. S prázdným Telefonem ukáže chybu u pole Telefon a fokus je na něm.
- [ ] **E2E předvyplnění:**
  - `/poptavka/?povrch=fasada&plocha=156&sluzba=ochrana&objekt=bytovy-dum&obvod=80&podlazi=6` → pole předvyplněná a `Kontext z kalkulačky` = „Kalkulačka SVJ: obvod 80 m, 6 podlaží“,
  - `?plocha=-5&povrch=<img src=x onerror=alert(1)>&telefon=123` → nic se nepředvyplní, v DOM nevznikne žádný nový prvek a neobjeví se dialog.
- [ ] E2E: výzva kalkulačky, rizika řas, `/kalkulacka-svj` a `/pas-domu` otevře `/poptavka/` ve stejném panelu (počet stránek kontextu beze změny) s předvyplněnými hodnotami.
- [ ] **`/akce/`** (390 × 844):
  - formulář je nad spotem a jeho první pole ≤ 1 000 px,
  - stránka odkazuje na `/poptavka/`,
  - pole, povinnost polí a souhlas jsou beze změny (`git diff` jen přesun bloku a jeden řádek).
- [ ] Po odeslání z `/` vede „📷 FOTKY K POPTÁVCE“ na `/poptavka/dekujeme/?fotky=1#fotky` a scéna nezobrazí pozvánku do akce. Z `/akce/` je chování beze změny.
- [ ] **Menu:**
  - žádný `<a>` s textem obsahujícím „Pro firmy“ nevede na `/spoluprace`,
  - hlavní menu (desktop i mobil, všechny šablony) neobsahuje Kariéru ani Spolupráci, patička ano,
  - `build-layout --kontrola` a test šířky menu z úkolu 08 projdou.
- [ ] **`/en`:**
  - formulář má anglické popisky, `Jazyk=en` a žádný odkaz na `/akce/` ani `/pravidla-akce/`,
  - 5 tlačítek vede na `#quote`,
  - zachycené odeslání vede na `/poptavka/thank-you/`.
- [ ] `node scripts/build-hbot.mjs --kontrola` → OK. Testy úkolů 02, 16, 17 a balíčku projdou. Upravené jsou jen selektory a očekávání a jejich seznam je v hlášení.

**Fáze A2**
- [ ] **`/` (390 × 844, vynucená `content-visibility`):**
  - `scrollHeight` ≤ 12 000,
  - první pole formuláře ≤ 1 688 px,
  - první „od N Kč/m²“ v sekci služeb ≤ 4 220 px,
  - `[data-blok="kdo-za-tim-stoji"]` obsahující „09291881“ ≤ 6 752 px.
- [ ] **První obrazovka** (390 × 844, lišta souhlasu zavřená):
  - H1 obsahuje „Čištění“ a alespoň jeden z povrchů,
  - text „od N Kč/m²“ (N z `content/ceny.json`), odkaz na formulář a `a[href^="tel:"]` leží celé v 0–844 px,
  - `elementFromPoint` v jejich středu vrací je samotné (nic je nepřekrývá).
- [ ] Lišty (definice z kroku 3) ≤ 126 px při načtení i po posunu o 1 000 px.
- [ ] Viditelný text `/` mimo FAQ a patičku: „24 h“ i „24 hodin“ dohromady ≤ 2×, „10 let“ ≤ 2×, „lešení“ ≤ 2×.
- [ ] **`/jak-pracujeme/`:**
  - obsahuje všechna `id` a nadpisy přesunutých bloků (test porovná seznam před a po, nic se neztratilo),
  - kontrola odkazů a kotev na `/`, `/jak-pracujeme/`, `/akce/` a `/cenik` → 0 mrtvých,
  - přesměrované testy úkolů 16 a 17 projdou.
- [ ] `node scripts/build-faq-web.mjs --kontrola` → kód 0. Viditelné FAQ a JSON-LD `FAQPage` mají stejné otázky i odpovědi. Testovací položka s `web` se po buildu objeví (test v dočasném adresáři).
- [ ] Test vizuálů: každý vizuál ve stavu `ilustracni` má na všech stránkách viditelný štítek. „DŮKAZ MÍSTO SLIBŮ“ se vyskytuje 0×.
- [ ] `node scripts/build-sliby.mjs --inventura` vytvoří CSV a součet odpovídá `grep` (dnes 1 725 výskytů). `--kontrola` → kód 0.
- [ ] Lighthouse mobil `/`: výkon ani přístupnost neklesly (čísla před a po v hlášení). `/poptavka/` a `/jak-pracujeme/` mají přístupnost alespoň takovou jako `/`.

**Fáze B** (u každého bodu, na který majitel odpověděl)
- [ ] `node scripts/build-sliby.mjs --prisne` → kód 0. Slib je ve výstupu, v H-BOT a v textu potvrzení úkolu 02 jen ve schváleném znění (počty v hlášení).
- [ ] Akce podle rozhodnutí: (a) pole účasti je nepovinné a výchozí nezaškrtnuté a `Účast v akci` je v payloadu; (c) `curl -sI <náhled>/akce/` → 301 na `/poptavka/`.
- [ ] Test značek v přísném režimu projde. `/pas-domu` a `/cenik` popisují SENTINEL stejně.
- [ ] Blok identity obsahuje alespoň 2 ověřitelná fakta schválená majitelem. Patička rozlišuje sídlo a provozovnu podle odpovědi. Výchozí místa dopravy jsou na `/` i `/cenik` stejná.
- [ ] `/en` uvádí, pro koho je a jak komunikujete (O18-6).
- [ ] Ve výstupu není žádné `[DOPLNIT` (`grep -rc "\[DOPLNIT" <publish> | grep -v ":0"` → nic).

## Ověření
```bash
node scripts/build-poptavka.mjs --kontrola            # kód 0
node scripts/build-faq-web.mjs --kontrola             # kód 0 (A2)
node scripts/build-sliby.mjs --inventura              # CSV v .artefakty/ukol-18/
node scripts/build-sliby.mjs --kontrola               # A: report, kód 0; B: --prisne → kód 0
node scripts/build-hbot.mjs --kontrola                # znalosti H-BOT aktuální
node --test tests/poptavka.test.mjs tests/obsah.test.mjs tests/znacky.test.mjs
CHROMIUM=<cesta> node --test tests/e2e/poptavka.e2e.test.mjs tests/e2e/obsah-homepage.e2e.test.mjs
# testy jiných úkolů musí dál projít:
CHROMIUM=<cesta> node --test tests/e2e/formulare.test.mjs          # úkol 02
# + testy úkolů 16 a 17 podle jejich názvů v repozitáři
cd ../hspg-balicek && npm test && HSPG_MIRROR=$(pwd)/../webHSPGH CHROMIUM=<cesta> npm run test:e2e

# odkazy na /akce/ – jen povolené soubory (cestu uprav podle publikačního adresáře)
git grep -c 'href="/akce/"' -- '*.html' | sort -t: -k2 -nr

# okresní stránky: kromě cíle výzvy žádná jiná změna (fáze A; blok hlavičky z úkolu 08 se porovnává zvlášť testem menu)
git diff --name-only main -- 'cisteni-*/*/index.html' > .artefakty/ukol-18/okresni.txt
node -e '
const fs=require("fs"),{execSync}=require("child_process");
const bez=(t)=>t.replace(/<!-- HSPG:HLAVICKA:START[\s\S]*?HSPG:HLAVICKA:END -->/g,"");
const f=fs.readFileSync(".artefakty/ukol-18/okresni.txt","utf8").split("\n").filter(Boolean);let jine=0;
for(const s of f){const a=bez(execSync(`git show main:${s}`).toString());
 const b=bez(fs.readFileSync(s,"utf8").split("href=\"/poptavka/\"").join("href=\"/akce/\""));
 if(a!==b){jine++;console.log("jiná změna:",s);}}
console.log(f.length,"změněných okresních stránek, jiné změny:",jine);'   # očekávej: 232 …, jiné změny: 0

# náhled (0 kreditů), jen GET
npm run nahled
curl -s <náhled>/poptavka/ | grep -c 'name="hspg-poptavka"'                 # 1
curl -s <náhled>/en | grep -c 'href="/akce/'                                # 0
curl -s <náhled>/ | grep -c 'data-hspg-poptavka'                            # 1
curl -s <náhled>/poptavka/dekujeme/ | grep -c 'U akce evidujeme'           # 0
```

**Testy, které agent přidá:**
- `tests/poptavka.test.mjs` (statický, `node:test`):
  - platný `content/poptavka.json` a nejvýš 3 povinná datová pole,
  - shoda registrace, payloadu a definice,
  - whitelist odkazů na `/akce/`,
  - `target="_blank"` u interních odkazů na poptávku,
  - shoda cíle v `hbot.js`, `navigace.json` a `poptavka.json`,
  - menu bez „Pro firmy“ a Kariéry,
  - `/en` bez `/akce/`.
- `tests/obsah.test.mjs`: FAQ (viditelné = JSON-LD), štítky vizuálů, „DŮKAZ MÍSTO SLIBŮ“ 0×, `data-slib` a `data-cena` v úvodu, žádné `[DOPLNIT` ve výstupu.
- `tests/znacky.test.mjs`: režim hlášení v A, přísný v B.
- `tests/e2e/pomocne-obsah.mjs`: měřicí pomocník z kroku 3.
- `tests/e2e/poptavka.e2e.test.mjs`:
  - odeslání na `/`, `/poptavka/` a `/en`,
  - bez JS, Enter, předvyplnění včetně škodlivých parametrů,
  - výzvy z kalkulaček ve stejném panelu,
  - `/akce/` pořadí, scéna a fotky.
  
  Všechny POST zachytit přes `page.route` a ověřit, že žádný požadavek neodešel mimo lokální server.
- `tests/e2e/obsah-homepage.e2e.test.mjs`: výška a polohy, první obrazovka, lišty ≤ 15 % a počty slibů na `/`.

Úkol 19 tyto testy převezme do CI. Napiš mu do hlášení jejich názvy a příkaz.

## Bez AI / s AI
Úkol nic nevolá přes AI.
- Formuláře, předvyplnění, děkovné stránky a generátory fungují bez AI. Formuláře fungují i bez JavaScriptu díky nativnímu POST.
- H-BOT dostane jen nový cíl odkazu. Odpovědi z FAQ bez AI i znalosti AI odkazují na `/poptavka/` a po změně je ověří `build-hbot.mjs --kontrola`.
- Texty pro fázi B může majitel připravit s Claude Pro (P1 slib, P2 FAQ, P5 pravidla akce). Web na tom nezávisí a bez odpovědí zůstává ve stavu fáze A.

## Nepřekročitelná pravidla
Viz `balicek/KONTEXT.md` §4. Zvlášť pro tento úkol:
- **Žádná nová fakta.** Bez písemného potvrzení majitele se nepíší roky, počty zakázek, tým, pojištění, angličtina, základna Hradec Králové, služby pro firmy ani podmínky akce.
  - Chybějící údaj je `[DOPLNIT]` a ten se na web nikdy nevypíše.
  - Ceny jen čti z `content/ceny.json`, záruku jen z centrálního zdroje (úkol 05).
- **Formuláře:**
  - nic neodesílej do produkčních formulářů,
  - na náhledu jen se souhlasem majitele, s `TEST` a podle úkolu 02,
  - v testech všechny POST zachyť,
  - živý web jen GET.
- **URL a úložiště:**
  - do URL nikdy telefon, e-mail, jméno, kód pasu domu ani cenu,
  - hodnoty z URL jen z whitelistu a jen přes `.value` a `textContent`,
  - kvůli předvyplnění ani zdroji nic neukládej do prohlížeče (úkol 02). `hspg-holub-lead` zůstává jako dnes.
- **Cizí rozsah neměň:**
  - pravidla a texty akce (13),
  - souhlasy a zásady (09),
  - záruku (05),
  - patičku a komponenty mimo popsané kroky (08),
  - události `dataLayer` bez oznámení úkolu 10,
  - okresní stránky mimo cíl výzvy (A) a slib (B).
- **CSP a testy:**
  - žádné inline skripty ani `on…=` (úkol 15),
  - testy jiných úkolů nemaž ani nevypínej, jen uprav selektory.
- **Nasazení a jazyk:**
  - nasazuj jen náhled `npm run nahled`,
  - produkce jen po schválení majitelem a v dávce,
  - anglický formulář do produkce až s odpovědí O18-6,
  - čeština podle §4 bod 9 (nezlomitelné mezery, uvozovky „…“).

## Hlášení po dokončení
Formát z `KONTEXT.md` §5, zvlášť po A1 (mezihlášení), po A a po B. Navíc:
- **A1:**
  - inventura odkazů na `/akce/` před a po (počty podle souborů),
  - seznam změněných a nových souborů a výsledek normalizační kontroly okresních stránek,
  - výsledky testů (počty),
  - seznam upravených testů úkolů 02, 16, 17 a balíčku s důvodem,
  - diff souborů převzatých z balíčku (`hbot.js`, `hbot-panel.js`, `znalosti.mjs`, `pravidla.mjs`, případně `build-hbot.mjs`) k promítnutí zpět,
  - odkaz na dokumentaci Netlify Forms k registraci a odkaz na náhled.
- **A:**
  - tabulka bloků homepage (výška před → kam → výška po),
  - měření před a po (`scrollHeight`, polohy formuláře, cen a identity, lišty na `/` a `/akce/`),
  - Lighthouse před a po, snímky,
  - souhrn inventury slibu (počet variant, kde jsou),
  - výchozí stavy v `content/vizualy.json`,
  - porušení glosáře v režimu hlášení,
  - **otázky O18-1 až O18-10.**
- **B:** u každého kroku odpověď majitele (zdroj a datum), co se změnilo a výsledky testů v přísném režimu.
- **Návrhy mimo rozsah:**
  - pro úkol 11: title a description `/poptavka/` a `/jak-pracujeme/`, `VideoObject`, odkaz na `/o-nas`,
  - pro úkol 10: změna kroků průvodce a `hbot_cta cil:'poptavka'`,
  - pro úkol 12: výzvy hubů na `/poptavka/`,
  - pro úkol 14: kód pasu domu,
  - pro úkol 09: anglické shrnutí zásad,
  - pro balíček: formulář fotek na anglické děkovné stránce.
