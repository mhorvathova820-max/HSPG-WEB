# Zadání pro Claude Design: HOLUB 360 · Apex (stránka hspg.cz/holub-360/)

> **Jak použít:** celý blok „PROMPT“ níže zkopírujte do nového projektu v Claude Design. Hotový návrh vyexportujte
> podle části „Export“ na konci. Návrh je podklad pro vzhled – funkční kód už je v balíčku (seznam souborů níže)
> a agent ve VS Code z návrhu převezme rozložení, CSS a texty rozhraní; logiku nepřepisuje.

---

## PROMPT

Navrhni jednu stránku **HOLUB 360** pro web hspg.cz (HOLUB Surface Protection Group – čištění, impregnace a barevné
renovace střech, fasád a dlažeb). Stránka zákazníka provede od adresy domu k ceně, postupu, termínu a rezervaci.
Vzhled: **Apple × Porsche luxus** – matná vesmírná čerň, těžké obsidiánové sklo, tekuté zlato, hodně vzduchu,
velká serifová typografie, žádné laciné efekty. Jazyk: čeština. Desktop 1440 × 900 a mobil **390 × 844**.

### Cíl
1. Zákazník zadá adresu a během pár sekund vidí svůj dům (ilustrační model z obrysu) a odhad ploch.
2. Vybere cestu: **A – Neviditelný štít** (impregnace H-STONE) nebo **B – Barevná renovace** v odstínu RAL.
3. Rozlomí voskovou pečeť a uvidí **orientační kalkulaci** (luxusní „certifikát“) s cenou, postupem a péčí SENTINEL.
4. Vybere den v kalendáři na 21 dní (šrafované dny jsou technologicky nevhodné) a odešle rezervaci.

### Designové tokeny (soubor `assets/apex-tokens.css` – používej jen tyto hodnoty)
- Barvy: `--apex-cern-0 #05070f` (pozadí stránky), `--apex-cern-1 #0b0f19`, `--apex-cern-2 #111827`,
  `--apex-cern-3 #1f2937`, zlato `--apex-zlato #d4af37`, světlé zlato `#f6e7a8`, tmavé zlato `#8a6a12`,
  safír `#7addff` (jen jemný akcent), text `#f4f1e8`, tlumený text `#a3a9b5`, linky `rgba(212,175,55,.22)` a `.45`.
- Sklo: `linear-gradient(180deg, rgba(17,24,39,.66), rgba(5,7,15,.86))`, `backdrop-filter: blur(22px) saturate(1.4)`,
  rámeček `1px rgba(212,175,55,.22)`, zaoblení `22px`, stín `0 40px 120px rgba(0,0,0,.6)`.
- Tekuté zlato (text): přechod `110deg, #8a6a12 → #d4af37 → #f6e7a8 → #d4af37 → #8a6a12`, pomalý posun 7 s
  (jen bez omezení pohybu).
- Tlačítko: pilulka min. 48 px, přechod `135deg, #f6e7a8 → #d4af37 → #9c7b16`, text `#17120a`; duch = průhledné se
  zlatou linkou. Pole: výška 48 px, při zaměření zlatá záře `0 0 15px rgba(212,175,55,.4)`.
- Šrafa nevhodného dne: `repeating-linear-gradient(45deg, #111827 0 6px, #1f2937 6px 12px)`.
- Písma: **Playfair Display** (nadpisy, číslice jako lining) a **Manrope** (text). Web je hostuje sám – v návrhu je
  použij jménem, **nenačítej Google Fonts ani jiné CDN**.
- Třídy pojmenuj s předponou `h3a-` (tokeny mají předponu `apex-`); nic globálního.

### Sekce a pořadí
1. **Hlavička** (průhledná nad hero): značka HOLUB / Surface Protection Group (zlatý lineární holub), vpravo
   tlačítko-duch s telefonem „736 618 486“.
2. **Hero – digitální průlet nad Starou Prahou** (celá výška okna): stylizovaná 3D scéna za úsvitu – Týnský chrám,
   katedrála sv. Víta na hradním návrší, Staroměstská mostecká věž, Karlův most přes Vltavu, Petřínská rozhledna
   (zlatá příhradová konstrukce), tisíce střech, zlaté hrany staveb, mlha nad řekou, zlatá záře slunce na obzoru,
   kamera pomalu letí po křivce. Na scéně vlevo dole: štítek „HOLUB 360 · Standard HOLUB“, nadpis ve dvou řádcích
   „Jedna adresa.“ / „Celý dům v 360°.“ (druhý řádek tekuté zlato), úvodní věta, tlačítka „Zadat adresu“ a
   „Plánovač termínu“, pod nimi malá tlačítka „Klepněte kamkoliv – voda na ošetřeném povrchu perlí“ a
   „Zvuk: vypnutý“ a poznámka „Ilustrační vizualizace Staré Prahy“. Navrhni i **statický první snímek** (SVG/obrázek
   stejné kompozice), který se ukáže okamžitě a při omezení pohybu zůstane jako jediný.
3. **01 Adresa** – „Kde stojí váš dům?“: skleněná karta, pole s našeptávačem adres (rozbalený seznam návrhů),
   tlačítko „Změřit na dálku“, řádek se zlatou tečkou „HOLUB CORE QUANTUM SENSE · zaměření na dálku“, stavová věta,
   malé tlačítko „Plochy znám – zadám je sám“.
4. **02 Plochy** – „Váš dům v 360°“: vlevo 3D model domu (4 : 3) s popiskem „Ilustrační model z obrysu, ne
   zaměření.“, pod ním posuvník **Štětec Před / Po**; vpravo tři karty ploch se zaškrtnutím a číslem v m² a štítkem
   „ODHAD“ (Střecha, Fasáda, Dlažba a zpevněné plochy – ta se doplňuje ručně), drobně zastavěná plocha a licence
   „© ČÚZK“ / „© přispěvatelé OpenStreetMap“.
5. **03 Cesta** – „Neviditelný štít, nebo nová barva?“: dvě velké karty-volby (A, B) s názvem, popisem a sazbami za
   m², pod nimi „Typ objektu“ a „Měděný hřebenový prvek s ražbou holuba (m, nepovinné)“; u cesty B vzorníky
   odstínů RAL (kruhy 44 px s popiskem, vybraný se zlatým prstencem) zvlášť pro střechu a fasádu a pole „Vlastní
   odstín RAL nebo NCS“, věta „Barvy na obrazovce jsou orientační – přesný odstín potvrdí vzorník při zaměření.“
6. **04 Cena** – „Vaše orientační cena je zapečetěná“: tmavá obálka s klopou, uprostřed **vosková pečeť** (burgundská,
   reliéf „H“ ve zlatém kruhu), pod pečetí „HOLUB 360“ a adresa; pod obálkou „Klepněte na pečeť“.
   Po rozlomení pečeti (pečeť se rozpůlí, klopa se otevře) vyjede certifikát **„Orientační kalkulace HOLUB 360“**:
   štítek „Osobní kalkulace“, adresa, datum vystavení, „Ceník platný od …“, velká cena v tekutém zlatě se štítkem
   „Orientační cena · jednorázově“, věta „Orientační výpočet, ne nabídka. Přesnou cenu potvrdíme po ověření rozsahu
   na místě. Nejsme plátci DPH, DPH se nepřipočítává.“, tabulka položek (Položka / Množství / Částka, řádky služeb,
   sleva, doprava, zaokrouhlení, „Celkem (orientačně)“), bloky **Platba** („Záloha 0 Kč. Platíte až po předání díla,
   splatnost 7 dnů.“), **Standard HOLUB** (5 kroků 01–05) a zvolená cesta, **Péče SENTINEL** (tři karty BASE –
   „drží záruku“, PLUS, PRESTIGE s cenou ročně a body), podmínka záruky ve zlatě orámovaném bloku, drobně věta
   o biocidech, tlačítka „Vybrat termín“ a „Vytisknout nebo uložit PDF“. Navrhni i tiskovou verzi (bílý papír,
   zlaté linky).
7. **05 Termín** – „Den, kdy počasí přeje“: skleněná karta s legendou, řádek Po–Ne a mřížka **21 dní** (7 sloupců):
   v buňce číslo dne (Playfair), stav (volno / potvrdíme / obsazeno / zavřeno / nevhodný) a u nejbližších ~9 dní
   ikonka ☀/☔ s teplotou; dny bez předpovědi „předpověď upřesníme“. **Technologicky nevhodný den** = šrafa, nedá
   se vybrat, při najetí titulek „Technologicky nevhodný den (Ochranné vrstvy a barvy vyžadují bezsrážkové klima)“.
   Neděle „zavřeno“. Vybraný den zlatě. Pod mřížkou drobně uvedení zdroje „Na základě dat MET Norway (licence
   CC BY 4.0, …)“.
8. **06 Rezervace** – „Rezervujte termín“: skleněný formulář – shrnutí výběru (přerušovaný zlatý rámeček), Adresa
   domu, Telefon, Jméno a příjmení, E-mail (nepovinné), Termín (nepovinné), Kód kuponu, Poznámka, souhlas se
   zpracováním údajů (nezaškrtnutý), tlačítko „Odeslat rezervaci“, odkaz „Otevřít v plánovači“, řádek s telefonem.
9. **Patička**: „Věci stárnou. My zůstáváme.“ (Playfair kurzíva), „HOLUB Surface Protection Group · Dušan Holub,
   IČO 09291881, neplátce DPH · Pernerova 10/32, 186 00 Praha 8 – Karlín · +420 736 618 486 · Po–So 7:00–19:00“,
   odkazy hspg.cz, Plánovač termínu, Akce a poptávka, Ochrana osobních údajů.

Nad stránkou plave H-BOT (na desktopu pilulka vlevo dole, na mobilu spodní lišta „Zavolat · Zeptat se · Cena hned“
asi 96 px) – nech mu místo, nic důležitého pod ním.

### Interakce (popiš je v návrhu poznámkami nebo prototypem)
- **Průlet**: kamera letí plynule po uzavřené křivce (jedno kolo ~2 min), zastaví se, když hero není vidět.
- **Kapky „klepněte kamkoliv“**: po klepnutí do hero se objeví shluk kapek, které nejdřív perlí (kulaté čočky se
  světlým odleskem a zlatou kaustikou), pak stékají a nechávají vlhkou stopu; čím rychlejší pohyb myši/prstu,
  tím víc a větších kapek; tažením vzniká stopa. Při omezení pohybu vypnuto.
- **Sken**: po výběru adresy přejede přes model zlatý laser shora dolů (~2 s) a obrys domu na zemi se rozsvítí.
- **Štětec Před / Po**: posuvník dělí model svislou zlatou světelnou stěnou – vlevo „Po“ (čistý povrch; u cesty A
  na něm perlí a stékají kapky), vpravo „Před“ (mech na střeše, šmouhy a řasy na fasádě).
- **Cesta B**: výběr odstínu RAL okamžitě přebarví střechu / fasádu modelu.
- **Obálka**: pečeť je tlačítko; po klepnutí praskne na dvě půlky, klopa se otočí a certifikát vyjede nahoru
  (~1 s), pak se na něj přesune fokus.
- **Kalendář**: klepnutí na volný den ho vybere a propíše do formuláře; na šrafovaný nebo zavřený den jen vysvětlí
  proč nejde vybrat.
- **Zvuk** jen po zapnutí tlačítkem (tichý pad, krátký tón při skenu a rozlomení pečeti), nikdy automaticky.

### Stavy, které navrhni
- **Načítání**: „Měříme na dálku…“ (blikající zlatá tečka u HOLUB CORE QUANTUM SENSE), kalendář „Načítáme volné dny
  a předpověď…“.
- **Chyba / výpadek**: „Měření teď není dostupné. Plochy můžete zadat sami níže, nebo nám nechte adresu a telefon –
  cenu pošleme do 24 hodin.“ (model se nezobrazí, plochy se zadají ručně); kalendář „Kalendář se teď nepodařilo
  načíst – termín zadejte do rezervace níže, potvrdíme ho telefonicky.“
- **Nepotvrzený ceník**: v certifikátu místo částky „Cenu vám pošleme do 24 hodin“ – **nikde žádná částka v Kč**.
- **Bez AI**: stránka AI nepotřebuje vůbec – vše funguje stejně.
- **Bez JavaScriptu**: statický první snímek hero, místo měření věta „Měření na dálku potřebuje zapnutý
  JavaScript. Napište nám adresu a telefon do rezervace níže – nezávaznou cenu vám pošleme do 24 hodin.“ s odkazy
  na /akce/ a /planovac/, formulář rezervace funguje, v patičce adresa firmy a telefon.
- **Ukázka** (`?ukazka=1`): štítek „UKÁZKA“ u adresy i v certifikátu, smyšlený dům, rezervace se neodesílá.

### Texty (použij přesně; nezlomitelná mezera po v, k, s, z, a, i, o, u a mezi číslem a jednotkou)
- Lead hero: „Napište adresu domu. Plochu střechy a fasády odhadneme na dálku, cenu spočítáme podle platného ceníku
  a ukážeme volné dny, kdy počasí přeje ochranným vrstvám a barvám.“
- 01: „Vyberte adresu ze seznamu. HOLUB CORE QUANTUM SENSE z ní připraví obrys domu a odhad ploch. Přesně vše
  změříme na místě před zahájením prací.“
- 02: „Obrys a plochy z měření na dálku jsou odhad – přesně je změříme na místě. Pokud některou plochu znáte
  přesněji, upravte ji.“
- 03: „Kroky 01–04 Standardu HOLUB jsou vždy stejné. Cesta určuje finální ochrannou vrstvu.“
  A „Neviditelný štít“ – „2× nástřik hydrofobní nano-impregnace H-STONE. Voda perlí, povrch dýchá, vzhled zůstává.“
  B „Barevná renovace“ – „Penetrace a 2× strojní airless nástřik ohřívanou barvou v odstínu podle vašeho výběru.“
- 04: „Rozlomte pečeť. Uvnitř je orientační cena, postup podle Standardu HOLUB a péče, se kterou trvá záruka.“
- Kroky: 01 Čištění – Čištění tlakem a teplotou vody podle materiálu · 02 Odmaštění – Odmaštění povrchu bez usazenin ·
  03 Ošetření biocidy – Ošetření biocidy v pórech materiálu · 04 Oplach – Důkladný oplach uvolněné biomasy ·
  05 Ochranná vrstva – Finální ochranná vrstva podle zvolené cesty.
- SENTINEL: BASE 499 Kč ročně (drží záruku), PLUS 2 490 Kč ročně, PRESTIGE 5 890 Kč ročně (body z `content/sentinel.json`).
- Záruka: „Záruka 10 let na impregnaci H-STONE trvá při aktivní péči SENTINEL (nejméně tarif BASE za 499 Kč ročně)
  s technickou kontrolou jednou ročně. Zákonná práva z vadného plnění tím nejsou dotčena.“ (stejně viditelně jako cena)
- Biocidy: „Používejte biocidy bezpečným způsobem. Před použitím si vždy přečtěte označení a informace o přípravku.“
- Ukázková čísla do návrhu ber jen z modelového příkladu ceníku: rodinný dům 340 m² fasády + 190 m² střechy, cesta A,
  sleva 5 % za dva povrchy = **86 390 Kč** (střecha 190 m² × 178 Kč, fasáda 340 m² × 168 Kč).

### Pravidla (nepřekročitelná)
- **Pravdivost (KONTEXT §4.1):** žádné vymyšlené reference, recenze, hodnocení, statistiky, ocenění, certifikace,
  pojištění ani technické parametry. Nepoužívej „certifikovaný“, „+8,4 %“, tvrzení o pojištění, o kvantové
  technologii ani o fyzickém skenu – „HOLUB CORE QUANTUM SENSE · zaměření na dálku“ je jen název funkce.
  3D model je **ilustrační** (žádné výšky, rozměry stěn ani sousední budovy).
- **Kalkulace není nabídka (§ 1732 OZ, rada AI 22. 10. 2026):** výsledek nikde nenazývej „nabídka“ ani „cenová
  nabídka“ – jen „orientační cena“ / „kalkulace“; u ceny vždy slovo „orientační“.
- **Slova, která na stránce nesmí být:** „letecké mapy“, „satelitní snímky“, „Google Maps“, „katastr“, „RÚIAN“,
  „H-BIO“ (značka biocidu se neuvádí). Žádné satelitní ani letecké fotky domů.
- **Licence malým písmem zůstávají:** „© ČÚZK“, „© přispěvatelé OpenStreetMap“ u ploch a „Na základě dat MET Norway
  (licence CC BY 4.0, …)“ u kalendáře.
- **Omezení pohybu (prefers-reduced-motion):** bez průletu (jen statický snímek), bez kapek, bez animací pečeti;
  vše ostatní funguje.
- **Výkon:** LCP ≤ 2,5 s na mobilu – první snímek hero je lehký (SVG/obrázek), WebGL se načte až po zobrazení,
  žádná těžká knihovna navíc, žádné CDN, žádná externí písma ani měřicí skripty.
- **Přístupnost:** WCAG 2.1 AA – kontrast, viditelný zlatý fokus, ovládání klávesnicí (našeptávač šipkami,
  pečeť Enterem), popisky polí, 390 px bez vodorovného posunu, cíle dotyku ≥ 44 px.
- Žádná pole pro klíče, žádná přímá volání AI, žádný `localStorage` pro data zákazníka.

### Soubory kódu (reference – návrh se k nim má přizpůsobit)
- `balicek/web/holub-360/index.html` – struktura stránky, texty, statický první snímek (SVG), formulář `hspg-rezervace`
- `balicek/web/assets/holub360-apex.css` – vzhled (`h3a-*`), tisk certifikátu, mobil, omezení pohybu
- `balicek/web/assets/apex-tokens.css` – sdílené tokeny Apex (R18)
- `balicek/web/assets/holub360-apex.js` – řadič: našeptávač a měření (`/api/cena-z-adresy`), ceny přes
  `assets/hspg-cena.js`, obálka, certifikát, kalendář (`/api/planovac`), rezervace
- `balicek/web/assets/holub360-scena.js` – Three.js: průlet nad Prahou a ilustrační model domu (sken, štětec, RAL)
- `balicek/web/assets/hspg-kapky.js` – překryv s kapkami „klepněte kamkoliv“
- `balicek/web/assets/vendor/three/` – vlastní kopie Three.js r184 (MIT)
- `balicek/web/content/standard.json`, `sentinel.json`, `ceny.json`, `pocasi-prace.json` – texty a čísla

---

## Export (stejně jako v úkolu 25)
1. V Claude Design: **Share → Export → Project HTML (zip)**. Soubor pojmenujte `holub360-apex.zip` (max. 25 MB).
2. Otevřete https://github.com/mhorvathova820-max/HSPG-WEB/upload/claude/apex-48-53/balicek/navrhy
   → přetáhněte zip → „Commit directly to the claude/apex-48-53 branch“ → **Commit changes**.
3. Agent ve VS Code: `git pull`, rozbalit **mimo složku webu** (`unzip -o balicek/navrhy/holub360-apex.zip -d ../hspg-navrhy/holub360/`),
   prototyp se nikdy nenasazuje. Nejdřív vypsat, co v exportu je (přímá volání AI, pole pro klíče, `localStorage`,
   externí skripty a písma, ukázková data) a dát to do hlášení. Pak převzít rozložení, CSS a texty do
   `holub360-apex.css` / `index.html` (předpona `h3a-`, tokeny `apex-`), logiku ponechat v `holub360-apex.js`
   a ověřit `npm test` a `npm run test:e2e` (test `holub360.test.mjs`) včetně snímků 1440 × 900 a 390 × 844.
