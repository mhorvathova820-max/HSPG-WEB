# Revize prototypu HSPG „Apex“ a balíčku webu – co chybí do 10/10

**Datum:** 22. 10. 2026 · **Režim:** jen čtení (zdrojové soubory, bez vykreslení – runtime `support.js` není k dispozici) · **Měřítko:** „nejvyšší úroveň v ČR“ = Apple × Porsche klid, pravdivost podle § 4 KONTEXT a směrnice 2024/825, WCAG 2.1 AA, 390 px, žádné CDN.

**Co bylo přečteno:** 5 desek Claude Design (`Main`, `Tlacitko`, `CenaHned`, `Mobil`, `Mikro`, `canvas.json`), balíček `assets/{hbot.js, hbot-panel.js, hbot-nabidka.js, hbot.css, hspg-zazitek.js, holub360-hejno.js, holub360-apex.js, holub360-apex.css, apex-tokens.css, apex-prvky.css, hspg-cena.js, hspg-cenik.json, hbot-znalosti.json}`, `holub-360/index.html`, `standard-holub/index.html`, `KONTEXT.md` (R15–R20, § 4), `AUDIT-WEB-2026-10-22.md` (Top 15), `RADA-ZADANI-DOKONALOST-2026-10-22.md`, `ukoly/56-puls-rozcestnik-zazitek.md`.

---

## 1. Verdikt (0–10 po osách)

| Osa | Prototyp | Balíček | Jednou větou |
|---|---|---|---|
| **Vizuál** | **7** | 7 | Paleta, sklo a zlato drží „Apex“ a hero desky `Tlacitko` je nejlepší obrazovka celého projektu; sráží to chybějící typografická škála (9–11 px štítky, 9 různých velikostí nadpisů), hodnoty natvrdo místo tokenů a **tři různé kresby holuba a tři různé pečeti** (prototyp zlatá s holubem · H-BOT zlatá · HOLUB 360 **červený vosk s písmenem H**). |
| **Funkce** | **6** | 8 | Prototyp je skriptované demo: 7,3 s pevného zdržení před pečetí, cena pro cestu B / RAL 9001, kterou zákazník nikdy nevybral, krok 3 „Cena hned“ ukazuje vstupy kroku 4, chybí „zobrazit bez animace“, chybové stavy a ruční plochy – to vše balíček umí. |
| **Koncept** | **7** | 8 | „Hejno = průhledný proces“ a pečeť jsou silný, vlastní motiv; ale hejno v prototypu slibuje kroky, které systém nedělá (kóty výšek, sklon 38°, „plochy z druhého úhlu a komín“, „Ověření 3/3“), a sekvence je choreograficky ještě hračka (sprite se 3 snímky, bez náklonu, obrys se kreslí nezávisle na holubovi). |
| **Důvěra / právo** | **5** | 8 | Deska `Tlacitko` opakuje nedoložená čísla „2 000+ objektů v ČR · 450+ v Anglii“, která audit (Top 6) výslovně vylučuje; „© ČÚZK“ stojí pod smyšleným domem; věta o záruce 10 let je u ceny s cestou B bezpodmínečná; štítek „AI asistent“ visí nad hejnem, kde žádná AI není; písma z Google Fonts. Balíček je v tomhle o třídu výš (jen podmínky, jen potvrzený ceník, licence jen z dat). |
| **Přístupnost** | **7** | 8 | Základ je správně (`aria-pressed`, `role=status`, `focus-visible`, 44 px u většiny cílů, `prefers-reduced-motion`); chyby: jednovýběr přes `button[aria-pressed]` místo radia, čipy 40 px, nápověda bez `aria-describedby`, puls na mobilu 5,2 s (> 5 s, WCAG 2.2.2), při omezení pohybu sekvence stejně trvá 7,3 s, štítky 9 px. |
| **Texty** | **7** | 8 | „Orientační cena, ne nabídka“ a „ne z AI“ drží všude; kazí to „Hejno to zvládne za pár vteřin“ (časový slib), tři názvy jedné věci („Cena hned“ / „Spočítat orientační cenu“ / „Zaměřit“ vs. „Změřit“), směs značek v jednom panelu (H-SPG CORE · H-BOT · HOLUB 360 · HOLUB CORE QUANTUM SENSE) a osiřelá věta „Srdíčkem si odstín uložíte…“ bez srdíčka. |

**Celkem prototyp ≈ 6,5/10, balíček ≈ 7,8/10.** Největší vzdálenost od 10 není v pixelech, ale v tom, že prototyp a kód vyprávějí dva různé příběhy (viz § 3) a že prototyp na několika místech porušuje pravidla, která balíček dodržuje.

---

## 2. Dvacet změn, které posunou prototyp na 10/10

Formát: **kde** · co přesně změnit · proč · pracnost (S = do 2 h, M = půl dne až den, L = víc dní).

### A. Důvěra a právo (nejdřív – jinak nic z dalšího nemá cenu)

**1. `Tlacitko.dc.html` ř. 108–112 (tři dlaždice `.cislo`)** · Smazat „2 000+ ošetřených objektů v ČR“ a „450+ objektů v Anglii“. Nahradit třemi ověřitelnými fakty: „IČO 09291881 · od roku 2020“ · „Standard HOLUB · 5 kroků, které nezkracujeme“ · „Záruka 10 let při péči SENTINEL BASE“. · AUDIT Top 6 tato čísla vylučuje (firma od 2020, bez evidence); § 4.1 KONTEXT; směrnice 2024/825 – nedoložené tvrzení o výkonu. · **S**

**2. `Main.dc.html` ř. 312–316 (kóty), ř. 334 (dlaždice „Ověření 3/3 · plochy z obou úhlů · komín“), ř. 415 a 418 (texty „z druhého úhlu a komín“), ř. 333 („sedlová střecha“)** · Kóty výšek a sklonu nahradit tím, co systém opravdu vrací: `střecha ≈ 190 m² · fasáda ≈ 340 m² · půdorys ≈ 132 m²` se štítkem „ODHAD“ (třída `.h3a-odhad` v balíčku). „Ověřuje“ přeformulovat na „Ověřuje – vybranou budovu a úplnost údajů“ (přesně `KROKY[2]` v `holub360-hejno.js`). Dlaždici „Ověření“ nahradit „Půdorys“. · Balíček výslovně nezobrazuje výšky z měření (`holub360-apex.js` hlavička: „žádné výšky z měření“; model „ilustrační z obrysu, ne zaměření“); sklon si zákazník volí koeficientem v `hspg-cena.js` (plochá/mírná/běžná/strmá). Prototyp tedy prezentuje nedokončenou technologii jako hotovou (§ 4.1). · **S**

**3. `Main.dc.html` ř. 238 a `Mobil.dc.html` ř. 190 (věta o záruce)** · Záruku ukázat jen podmíněně a přesně: „Záruka 10 let se vztahuje na neviditelný štít H-STONE (zde střecha) při péči SENTINEL BASE. Zákonná práva z vadného plnění tím nejsou dotčena.“ Pro cestu B nic netvrdit (délka záruky barevné renovace není v datech – `[DOPLNIT]`). · Karta v prototypu kombinuje A + B a záruku uvádí bez omezení; balíček (`hbot-nabidka.js` ř. 734, `maA`) ji ukazuje jen u cesty A. · **S**

**4. `Main.dc.html` ř. 327 („Ilustrační model · © ČÚZK“)** · Změnit na „Ilustrační model · ukázka“. Licenční „© ČÚZK, CC BY 4.0“ psát jen tam, kde se opravdu zobrazují data ČÚZK (balíček: `licenceZDat()` jen z odpovědi API). · Uvedení zdroje pod smyšleným domem naznačuje úřední data, která tam nejsou – obrácený omyl. · **S**

**5. `Main.dc.html` ř. 201 (čip „AI asistent“ nad hejnem) a `Tlacitko.dc.html` ř. 134 + 139 (odznak v hlavičce, uvítání)** · Čip u hejna smazat. V panelu odznak „AI asistent“ zobrazovat jen když AI opravdu odpovídá (jako `aiZnacka.hidden` v `hbot-panel.js` ř. 655) a do uvítání doplnit oznámení podle AI Act čl. 50 (text z `hbot-panel.js` ř. 652, zkráceně: „Na vlastní otázky odpovídá asistent s umělou inteligencí – nejste ve spojení s člověkem. Nepište sem osobní údaje. Cenu počítá ceník HSPG, ne AI.“). · Hejno měří přes API a ceník, ne AI – štítek odporuje patičce „ne z AI“ na téže desce. · **S**

**6. `Main.dc.html` ř. 184–185, 231–236; `Mobil.dc.html` ř. 170, 183–188 (ukázková adresa a demo částky)** · Adresu „Lipová 128, Hradec Králové“ nahradit „Ukázkový dům (smyšlený)“ s pilulkou **UKÁZKA** (balíček: `#h3a-ukazka-stitek`, `UKAZKOVY_DUM`). Řádek „Doprava · 34 km nad 30 km zdarma × 12 Kč · 408 Kč“ přepsat na „Doprava · do 30 km od základny Hradec Králové zdarma · 0 Kč“ (nebo adresu přesunout mimo HK). · Hradec Králové je podle `hspg-cenik.json` základna (`doprava.zakladny`), takže 34 km placené dopravy je nesmysl, který místní zákazník odhalí; „Lipová 128“ může být skutečná adresa. · **S**

### B. Choreografie hejna a pečeti (ať to není hračka)

**7. `Main.dc.html` ř. 100–102 (keyframes `let-meri`, `let-overuje`, `let-komunikuje`), ř. 321–324** · Let řešit přes `offset-path`, ne `translate` mezi body. „Měří“ letí **po obrysu střechy** `offset-path: path("M207,182 L772,168 L884,316 L346,349 Z")` s `offset-distance 0→100 %` za 2 600 ms `cubic-bezier(.33,0,.2,1)`, `offset-rotate: auto` v obalu s omezením náklonu ±28° (vnitřní `<g>` s `rotate` −28…28°), a **obrys `.obrys` se kreslí tímtéž časováním** (`kresli 2.6s` stejná křivka) – holub viditelně kreslí linku, kterou právě letí. Mávnutí jen při stoupání (první 35 % dráhy, 2,3 Hz), pak plachtění (póza `p2` + náklon 2°), měřítko 0,55→0,70 podle y (hloubka). Přistání 320 ms `cubic-bezier(.2,.9,.3,1.2)` se zploštěním 2 px a stínem (elipsa 24 × 6 px, opacity .35) pod sedícím holubem. · Dnes se obrys kreslí odleva, zatímco holub je vpravo; mávání je stálé; v zatáčkách nemění natočení – přesně to, co Grok pojmenuje jako „hračka“. · **L**

**8. `Main.dc.html` ř. 101, 317–319, 397 (razítka vs. let „Ověřuje“)** · Sladit pořadí: waypointy letu dát na pozice razítek k1 (552,254) → k2 (595,422) → k3 (637,108) a časy razítek na dolet (450 / 850 / 1 250 ms → 520 / 980 / 1 400 ms při délce letu 1 400 ms, `razitko .45s cubic-bezier(.2,1.4,.3,1)` beze změny). · Teď se k1 (střecha) objeví, když je holub na fasádě – příběh „holub razítkuje“ nesedí. · **S**

**9. `Main.dc.html` ř. 48–58, 322** · Všichni čtyři holubi ať v klidu (fáze 0) sedí **spolu na hřebeni** (x 300 / 450 / 600 / 737, y 170, póza `h-klid`, 20 % `vanek`), do úkolu vzlétne vždy jeden a vrátí se. Přidat `transition: opacity .35s var(--apex-krivka)` na `.holub` a 120ms rozestup kót (`animation-delay: calc(var(--i) * 120ms)`). · „Počítá“ dnes vyskočí z ničeho na komíně, ostatní se objeví bez přechodu – čtyři nesouvisející sprity nejsou hejno. · **M**

**10. `Main.dc.html` ř. 109, 138–142 (prasknutí, obálka) + `holub360-apex.css` ř. 220–223 + `hbot.css` ř. 258–260** · Jeden orchestrovaný moment „pečeť → cena“ ve všech třech místech: stisk 80 ms (`scale(.96)`) → vosk praskne na dvě půlky (`clip-path` jako `.h3a-vosk--l/--p`, 420 ms `cubic-bezier(.2,.8,.2,1)`, zvuk `pecet` v 0 ms, haptika [18, 30, 42]) → klopa `rotateX(-170deg)` 650 ms, `perspective: 1400px`, `transform-origin: 50% 0` → karta ceny `translateY(18px→0)` + opacity 520 ms od 380 ms → částka naběhne 1 100 ms křivkou `1 − 2^(−10u)` **po desítkách Kč** (jako `hbot-nabidka.js` ř. 671), začíná od „—“, ne od „0 Kč“; zvuk `cena` na konci. Omezení pohybu: vše ihned, částka ohlášena přes `aria-live`. · Prototyp má jen `scale(1.3) rotate(-14deg); opacity:0` („puf“), obálka se místo otevření zmenší (clip-path 100 % → 58 %), počítadlo ukazuje liché mezihodnoty. · **M**

**11. `Main.dc.html` ř. 391–400 a `Mobil.dc.html` ř. 258–265 (`zamerit()` s pevnými 2 600 / 4 300 / 5 900 / 7 300 ms)** · Fáze vázat na skutečné události (`stav.hejno.start/krok/hotovo` z `holub360-apex.js` ř. 409–431): minimum 450 ms na fázi, maximum = doba odpovědi (když API odpoví za 1,2 s, sekvence se stáhne na 4 × 450 ms + dolet); „Měří“ při pomalé odpovědi krouží v smyčce, ostatní čekají. Přidat tichý odkaz „Zobrazit výsledek bez animace“ (`hn-odkaz--tichy` v `hbot-nabidka.js` ř. 632). Při `prefers-reduced-motion` skočit rovnou do fáze 5 (dnes běží timeouty i tam). · Zadání rady: „5 míst, kde animace zdržuje cestu k ceně“ – tady je jich 7,3 s; balíček nic uměle nezdržuje (úkol 56). · **M**

**12. `Main.dc.html` ř. 401–407 + nová volba před pečetí** · Po „Komunikuje“ a před obálkou vložit dvoukartovou volbu „Cesta A · Neviditelný štít / Cesta B · Barevná renovace“ (vzhled `.volba` z `CenaHned`, nativní `<input type=radio>`), výchozí A pro oba povrchy; u B zobrazit vzorník RAL. Štítek ceny: „Orientační cena · cesta A“. · Dnes pečeť vydá cenu „Fasáda · cesta B · RAL 9001“, kterou zákazník nezvolil – první otázka Čecha bude „kdo mi vybral barvu?“. Balíček má krok 03 Cesta před 04 Cena. · **M**

### C. Řemeslo: typografie, tokeny, značka

**13. Všechny desky (`.stitek` 10 px ř. Main 21 / Tlacitko 19 / CenaHned 19; `Mobil` ř. 19 9 px, ř. 35 9 px, ř. 88 10 px; `.radek .d` 11 px; `.clen .stav` 10 px; `.ai` 10 px; `.hap` 11 px)** · Zavést škálu 11 · 12,5 · 14 · 16 · 20 · 26 · 34 · 44 · 62 px (poměr ≈ 1,3) a dodržet dno **11 px** pro štítky (`letter-spacing .22em`), **12,5 px / 1,5** pro právní a vysvětlující věty, **13 px** pro rozpis ceny na mobilu. Nadpisy: Main h1 26 → 34, Mobil h1 20 → 26. · Audit (Top 14–15) vytýká živému webu písmo < 12 px; prototyp ho zavádí znovu, a to u dokumentu, který zdůvodňuje 128 790 Kč. · **S**

**14. Všechny desky (`<style>` v `<helmet>`)** · Vložit blok `:root` s tokeny 1 : 1 z `apex-tokens.css` (`--apex-cern-0 #05070f`, `--apex-zlato #d4af37`, `--apex-zlato-svetle #f6e7a8`, `--apex-zlato-tmave #8a6a12`, `--apex-tlumene`, `--apex-linka rgba(212,175,55,.22)`, `--apex-linka-silna .45`, `--apex-zaobleni 22px`, `--apex-krivka cubic-bezier(.2,.8,.2,1)`) a všechny hodnoty natvrdo nahradit `var()`. Sjednotit tlumenou šedou: prototyp teplá `#b9b3a4`, token studená `#a3a9b5` – zvolit **teplou** (`#b9b3a4`, kontrast 9,6 : 1 na `#05070f`, ladí se zlatem) a přepsat token na jednom místě. Zaoblení jen 12 / 22 / 999 px, alfa linek jen .22 / .45. · Dnes 12 různých alf, 9 zaoblení, 2 šedé – a každý vývojář to při portu přepíše po svém. · **S**

**15. `Main.dc.html` ř. 156–159 (symbol `h-klid`, 36 polygonů) ↔ `hbot.js` ř. 176–180 (`HOLUB_SVG`, 8 polygonů) ↔ `holub-360/index.html` ř. 36 (abstraktní čárový znak) ↔ `holub360-hejno.js` ř. 24–28** · Jeden holub: symbol `h-klid` z prototypu exportovat jako jediný zdroj (`/assets/holub.svg` + inline `<symbol id="hspg-holub">`), použít jako záložní znak v `hbot.js`, v hlavičce HOLUB 360, v reliéfu pečeti a ve favikoně; 3D holub v canvasu (`hbot.js` HOLUB) převzít jeho siluetu (poměr zobák : ocas, výška křídla). · Tři kresby = tři značky. · **M**

**16. `holub360-apex.css` ř. 213–214 (červený vosk `#b3262b`) a `holub-360/index.html` ř. 225 (glyf „H“)** · Pečeť sjednotit na zlatý vosk s vyraženým holubem: gradient z `hbot.css` ř. 251 (`radial-gradient(circle at 35% 30%, #f6e7a8 0, #d4af37 38%, #9c7b16 72%, #6e520c 100%)`), reliéf `filter: brightness(.52) sepia(.4) drop-shadow(0 1px 0 rgba(255,243,196,.5))` jako v prototypu, půlení vosku z `h3a-vosk--l/--p`. Vytvořit sdílené `ap-pecet` + `ap-obalka` v `apex-prvky.css` a použít ve všech třech místech. · R18: zlatý holub, žádné kulaté logo; červená pečeť s „H“ je cizí prvek. · **S–M**

### D. Funkce a rozhraní

**17. `CenaHned.dc.html` ř. 131–135 (`.volba` s `aria-pressed`), ř. 124–128 (povrchy), ř. 150 („Srdíčkem…“), ř. 173–178 (plochy v kroku 3), ř. 186 („podle adresy“)** · Cesta = `fieldset` + nativní `<input type=radio>` skrytý přístupně, vzhled přes `:has(:checked)` (jako `.h3a-cesta`); povrchy = `checkbox`. Vstupy ploch z kroku 3 odstranit, místo nich řádek „Plochy 190 / 340 m² · upřesníte v kroku 4“; „Doprava · podle obce (krok 4)“. Větu o srdíčku buď smazat, nebo doplnit `ap-srdce` (44 px) a funkci „uložit odstín“ do balíčku. Přidat „Barvy na obrazovce jsou orientační – přesný odstín potvrdí vzorník.“ · Čtečka dnes slyší tři nezávislé přepínače místo jednoho výběru; krok 3 ukazuje ovládání kroku 4; věta slibuje prvek, který na desce není. · **S**

**18. `CenaHned.dc.html` ř. 138 (věta o biocidech 11 px šedě v rohu)** · Dát ji na vlastní řádek pod pás 01–05, 12,5 px / 1,5, barva `--apex-text` (ne tlumená), bez zkrácení. Totéž v balíčku (`hbot.css` ř. 171 `.hn-pozn--biocid` 11,5 px, opacity .9). · Nařízení (EU) 528/2012 čl. 72 vyžaduje, aby věta byla „jasně odlišitelná a snadno čitelná“ – 11 px šedá na skle to není. · **S**

**19. `Mobil.dc.html` ř. 118–194 (pořadí), ř. 22 (`scrollbar-width:none`), ř. 64 + 215–216 (puls 2,6 s × 2 od 1,5 s)** · Pořadí: adresa + „Změřit na dálku“ nahoře, scéna pod tím, hejno jako jeden řádek čtyř čipů se stavem, datové dlaždice až po výsledku, „Zaměřit znovu“ mimo kartu ceny. Posuvník neskrývat. Puls 2 × 2,1 s = 4,2 s, první dávka ve 3 s, pak 30 / 75 s, po otevření už nikdy (`sessionStorage`) – přesně `hbot.js` ř. 464–496. · Hlavní výzva je dnes pod ohybem; puls 5,2 s překračuje hranici 5 s (WCAG 2.2.2) a časy nesouhlasí s balíčkem. · **M**

**20. `Mikro.dc.html` ř. 49–51 + 135–136 (nápověda), ř. 96 (souhlas), ř. 120 (nit), ř. 169–177 (zvuky) a totéž v `Main`/`Tlacitko`/`CenaHned`/`Mobil` (vlastní Web Audio)** · Nápověda: `aria-describedby` z tlačítka na `role=tooltip`, otevírat na `:focus-visible` (ne `:focus-within`). Nit: `aria-busy="true"` na obalu, `role=progressbar` bez hodnot = neurčitá. Zvuk: všechny desky volat jedno API `HSPGZazitek.zvuk()/haptika()` s recepty z `hspg-zazitek.js` (hlavní hlasitost 0,15 přes kompresor, každý zvuk < 450 ms – `cena` v prototypu má ≈ 470 ms, `pecet` v prototypu je o ~8 dB hlasitější než `tuk`), vibrace jen během aktivace uživatelem, bez haptiky `srdce`/`otevrit` (balíček je nemá). Souhlas: místo zaškrtávátka „Souhlasím se zpracováním jména a telefonu“ informační věta „Odesláním zpracujeme jméno a telefon pro přípravu kalkulace a rezervace – zásady ochrany údajů“ (právní základ smlouva, čl. 6 odst. 1 b GDPR; **ověřit s advokátem**, platí i pro `holub-360/index.html` ř. 313). · Prototyp dnes předvádí zvuk, který se nenasadí, a souhlasový checkbox je český zlozvyk, ne požadavek GDPR. · **M**

*Bonus mimo dvacítku (S):* `Mobil`/`Main` – řádek „Zaokrouhlení −1 Kč“ → „Zaokrouhlení na desítky“; „Sleva za dva povrchy 5 %“ → „Sleva za dva a více povrchů (5 %)“ (název z `hspg-cena.js` ř. 215); `Tlacitko` – `.cip` 40 → 44 px, `.nav a` padding 10 → 14 px; `Main` – `.tep-tlacitko` 2 × 2,6 s = 5,2 s → 2 × 2,1 s; `backdrop-filter` jen na vnější kartě (v `Main` jsou skla vnořená – na slabších GPU trhá); pomalý nájezd scény `scale(1→1.04)` 8 s a detail pečeti `scale(1→1.03)` 400 ms při najetí jako jediné „záběry kamery“ (jen `transform`, nic při omezení pohybu).

---

## 3. Rozpory prototyp × kód balíčku (na co vývojář narazí při portu)

| # | Téma | Prototyp | Balíček | Co platí |
|---|---|---|---|---|
| 1 | Pečeť | zlatý vosk, vyražený holub, „puf“ (`scale 1.3 rotate -14 opacity 0`) | H-BOT: zlatý vosk + SVG holub, stejný „puf“ · HOLUB 360: **červený vosk, písmeno H**, vosk se láme na dvě půlky (`h3a-vosk--l/--p`) | zlatý vosk + holub + lámání na půlky (R18) – sjednotit do `ap-pecet` |
| 2 | Obálka | klopa se zmenší `clip-path` 100 % → 58 %, obálka 214 → 118 px | HOLUB 360 `rotateX(178deg)` s `perspective 1600px`; H-BOT `rotateX(180deg)` + dopis vyjede o 40 % | balíček (3D otočení) |
| 3 | Hejno | 4 sprity (3 snímky, `steps(1)` 0,44 s) létají ve scéně s domem, kótami, skenem a razítky; 7,3 s pevný skript | 4 statické dlaždice `<li class="h3a-holub">` s malým canvasovým holubem (3D projekce z `hbot.js`), „Měří“ jezdí po mini-obrysu (`offset-path`), stavy podle skutečných kroků API; **scéna s domem v balíčku neexistuje** (2D obrys SVG / volitelný WebGL model s laserovou linkou `.h3a-laser`) | port scény = nová práce (L); logiku fází převzít z `holub360-hejno.js` |
| 4 | Kóty, sklon, „Ověření 3/3“ | hřeben 14,2 m, krokev 6,7 m, sklon 38°, fasáda 7,1 m, „plochy z obou úhlů · komín“ | záměrně nic (`žádné výšky z měření`); sklon volí zákazník koeficientem; „Ověřuje – budovu a údaje“ | balíček |
| 5 | Pořadí toku | adresa → hejno → pečeť → cena (A pro střechu + B/RAL 9001 pro fasádu předvoleno) | 01 Adresa → 02 Plochy (úprava, dlažba ručně) → 03 Cesta + RAL → 04 Cena (obálka) → 05 Termín (21 dní, technologické okno) → 06 Rezervace | balíček; prototypu chybí volba cesty a ruční plochy |
| 6 | Nadpis HOLUB 360 | „Dům zaměříme na dálku. Hejno to zvládne za pár vteřin.“ | „Jedna adresa. Celý dům v 360°.“ + „Zadat adresu“ / „Plánovač termínu“ | rozhodnout; bez časového slibu |
| 7 | Tlačítka | „Zaměřit na dálku“, „Rezervovat termín“, „Stáhnout kalkulaci (PDF)“, „Zaměřit znovu“ | „Změřit na dálku“, „Vybrat termín“ / „Vybrat termín v plánovači“, HOLUB 360 „Vytisknout nebo uložit PDF“ (`print()`), H-BOT „Stáhnout kalkulaci (PDF)“ (generátor `hspg-dokumenty.js`) | jeden slovník: Cena hned · Spočítat cenu hned · Změřit na dálku · Vybrat termín · Stáhnout kalkulaci (PDF) |
| 8 | Zvuk | v každé desce vlastní Web Audio, přímo do `destination`, zisky 0,05–0,16, `tuk` 420→300 Hz, `fajfka` 660 + 990 Hz, `srdce` 330 Hz, `cena` C5–C6 (≈ 470 ms) | jeden UMD modul `HSPGZazitek`: master 0,15 + `DynamicsCompressor`, gesto (`userActivation`), uspání po 30 s, `localStorage` + synchronizace karet, `tuk` 660→330 + 1320 Hz, `fajfka` 1046 + 1568 Hz, `srdce` 92→58 Hz, `cena` C6–C7 (≈ 415 ms); **navíc** HOLUB 360 má druhý motor `class Zvuk` (kulisa, master 0,32, `pecet()` 1,4–1,6 s) – při rozlomení hrají oba (`holub360-apex.js` ř. 688–689) | modul; kulisu sloučit do modulu jako volitelnou vrstvu |
| 9 | Haptika | i `srdce` [10,30,10] a `otevrit` [10,30,14]; vibrace i 7,3 s po kliku | jen tuk / fajfka / pecet / cena / chyba, jen během aktivace | balíček |
| 10 | Puls plakety | `Tlacitko`: dávky v 1,5 s a 15,5 s, délka 4,6 s, 3 kruhy `scale 1→1.55`; `Mobil`: 1,5–7 s (5,2 s); `Mikro` text tvrdí „3 s, 30 s, 75 s“ | 3 s / 30 s / 75 s, nejvýš 3 dávky po 4,2 s, `sessionStorage` po otevření, bez pulsu při najetí/fokusu/skryté kartě/vynucených barvách; vlny jen `box-shadow` (CLS 0) | balíček |
| 11 | Panel H-BOT | `aria-modal="false"` vždy; odznak „AI asistent“ trvale; uvítání bez oznámení AI; čipy „Jaký je postup? · Co je neviditelný štít? · Jak dlouho to trvá?“; `aria-label` plakety obsahuje „celý web na jednom místě“ | na mobilu `aria-modal=true` + `inert` zbytku stránky; odznak jen když AI běží; oznámení čl. 50; čipy z `hbot-znalosti.json` (Kolik to stojí? · Jak si rezervovat termín? · Potřebujete lešení? · …); `aria-label` neměnný | balíček |
| 12 | Rozcestník | 8 dlaždic, kotvy `#cena`, `#holub-360`… | stejných 8 cílů z `content/hbot-rozcestnik.json`, skutečné cesty (`/holub-360/`, `/cenik.html#sentinel`, `/pas-domu/trezor.html`…), `aria-current="page"`, vjezd 45 ms rozestup | shoda ✓ (jen cesty) |
| 13 | Písma | Google Fonts `<link>` (CDN, přenos IP), Playfair 500/600/700 + **italic 500** | self-host `/assets/fonts/*.woff2`, Playfair 500–700 **bez italiky** (prototyp `<em>` v nadpisech, balíček `.h3a-cesta-pismeno{font:italic}` → syntetická kurzíva) | self-host; buď přidat italic woff2 (~30 kB), nebo kurzívu nepoužívat |
| 14 | Barvy | natvrdo; tlumená `#b9b3a4` (teplá), `#8f8a7c` | tokeny `--apex-*`; tlumená `#a3a9b5` (studená) | tokeny; jedna šedá |
| 15 | Minimum zakázky | `CenaHned` uplatní minimum 4 900 Kč **před** dopravou („doprava podle adresy“) | `hspg-cena.js` ř. 222–229: minimum **po** přičtení dopravy; KONTEXT: „včetně dopravy, nebo jen za práci“ čeká na majitele | jádro `HSPGCena.spocitej()` – nic nepočítat v UI |
| 16 | Sleva | „Sleva za dva povrchy 5 %“ | „Sleva za dva a více povrchů“; navíc SVJ 1 000/2 500 m², sleva plánovače | názvy z jádra |
| 17 | Počítadlo ceny | 1 400 ms, ease-out kubická, po jednotkách Kč, start „0 Kč“ | 1 100 ms, `1 − 2^(−10u)`, po desítkách, fokus na štítek, `aria-live` věta | balíček |
| 18 | Plochy / krok 3 | vstupy ploch viditelné v kroku 3 „Ochrana“ | plochy až v kroku 4 (`'Jak velké jsou plochy?'`); krok 3 nadpis „Jakou ochranu zvolíte?“ (prototyp „Jak má povrch vypadat po práci?“ je lepší – převzít do `hbot-nabidka.js` ř. 182) | balíček + lepší nadpis z prototypu |
| 19 | Ukázka | „Lipová 128, Hradec Králové“, 128 790 Kč, 34 km dopravy | `?ukazka=1`, „Ukázkový dům (smyšlený)“, štítek UKÁZKA, rezervace se v ukázce neodesílá | balíček |
| 20 | Inline skripty | `onClick="{{…}}"` (runtime Claude Design) | ES modul bez inline skriptů (CSP) | `addEventListener` |
| 21 | Hejno u obálky „Cena hned“ | není | `hn-hejno` s popisky Plochy · Ceník · Kontrola · Pečeť (pravdivé: nic se neměřilo) | zachovat |
| 22 | Po rozlomení | otevřená obálka zůstává nad kartou, posádka zmizí | HOLUB 360 obálku skryje a vyjede certifikát (950 ms); dlaždice hejna zůstávají „hotovo“ | rozhodnout (doporučeno: obálka zůstane 1 krok jako „hlavička“, posádka zůstává) |

---

## 4. Co nedávat do produkce (riziko omylu nebo nepravdy)

1. **„2 000+ ošetřených objektů v ČR · 450+ objektů v Anglii“** (`Tlacitko` ř. 109–110) – nedoložené, firma od 2020; audit Top 6, § 4.1, 2024/825.
2. **Kóty a sklon** „hřeben 14,2 m · krokev 6,7 m · sklon 38° · fasáda 7,1 m · sedlová střecha“, **„Ověření 3/3 · plochy z obou úhlů · komín“** (`Main` ř. 312–316, 333–334, 415, 418) – schopnosti, které zaměření na dálku nemá; v produkci jen plochy jako **odhad** a půdorys.
3. **„Hejno to zvládne za pár vteřin“** (`Main` ř. 248) – časový slib; limit požadavku je 25 s (`holub360-apex.js` ř. 412). Náhrada: „Dům zaměříme na dálku. Bez návštěvy technika.“ / „Jedna adresa. Plochy střechy a fasády jako odhad, přesně na místě.“
4. **„© ČÚZK“ pod smyšleným modelem** (`Main` ř. 327) – licenci uvádět jen u skutečných dat.
5. **Čip „AI asistent“ nad hejnem** (`Main` ř. 201) – žádná AI; a naopak v panelu chybí oznámení podle AI Act čl. 50 (`Tlacitko` ř. 139).
6. **Demo hodnoty jako výchozí stav** – 190 / 340 m², RAL 9001, 128 790 Kč, záloha 38 640 Kč, „34 km“, „Lipová 128, Hradec Králové“ – vše jen pod štítkem UKÁZKA; v produkci výhradně `HSPGCena` s potvrzeným ceníkem (R16), jinak žádná částka v Kč.
7. **Věta o záruce bez podmínky cesty A** (`Main` ř. 238, `Mobil` ř. 190) a bez „zákonná práva nejsou dotčena“.
8. **Minimum 4 900 Kč uplatněné před dopravou** (`CenaHned` ř. 185, 261–263) – rozhodnutí majitele chybí; počítat jen jádrem.
9. **Google Fonts `<link>`** (všechny desky ř. 11) – CDN a přenos IP do USA; balíček hostuje sám.
10. **„Srdíčkem si odstín uložíte do kalkulace i PDF“** (`CenaHned` ř. 150) – funkce v balíčku neexistuje.
11. **Zvuky a vibrace 2,6–7,3 s po kliknutí v pevném skriptu** (`Main` ř. 396–399) – v produkci jen k reálným událostem a přes `HSPGZazitek` (gesto, 450 ms, kompresor).
12. **Dva zvukové motory na HOLUB 360** (`class Zvuk` kulisa + `HSPGZazitek`; `pecet()` 1,4 s porušuje pravidlo < 450 ms a při rozlomení hraje dvakrát) – před nasazením sloučit.
13. **Červená pečeť s „H“ na HOLUB 360** (`holub360-apex.css` ř. 213–214) – odporuje R18 i prototypu.
14. **Panel H-BOT z prototypu bez modálního chování na mobilu** – balíček má `inert`; prototypové `aria-modal=false` nepřenášet.
15. **Štítky 9–10 px** (`Mobil` ř. 19, 35, 88; `.stitek` 10 px všude) – audit Top 14/15.

---

## 5. Koncept: co by udělal lídr trhu navíc (pravdivé, zvládnutelné pro OSVČ s partnery, bez vymyšlených čísel)

1. **Zdroj každého čísla na jedno klepnutí.** U každé položky kalkulace malé „i“: „Plocha střechy 190 m² – odhad z obrysu domu (veřejná data © ČÚZK) × koeficient sklonu, který jste zvolili · sazba 178 Kč/m² z ceníku platného od 1. 10. 2026 · přesně změříme na místě.“ Licenční povinnost se tím mění v důvěryhodnost; nic se nevymýšlí, vše už je v `n.radky` (`hspg-cena.js`) a `licenceZDat()`. *(S–M)*
2. **Kalkulace jako dokument s identitou.** Číslo kalkulace (balíček už má `S.cislo`), datum, platnost ceníku, QR na stejnou kalkulaci v Pasu domu – trezoru; „Sdílet kalkulaci odkazem“ (stav zakódovaný v `#hash`, bez serveru) pro výbor SVJ nebo rodinu. Lídr nedává cenu „na obrazovku“, ale „do ruky“. *(M)*
3. **Režim „Pro správce SVJ a architekty“** přímo v Cena hned: přepínač typu objektu na bytový dům odhalí množstevní slevy (v ceníku už jsou: 1 000 / 2 500 m²), zakrývání oken, splatnost 14 dnů, a PDF v podobě **podkladu pro shromáždění** (rozpis, Standard HOLUB, podmínky záruky, co SVJ potřebuje k hlasování). Stejná data, jiný formát; partnerská síť (R14 Lovec SVJ) dostane konkrétní vstupní bod. *(M)*
4. **Příplatek za silné znečištění vyřešit předem fotkou.** Po rozlomení pečeti nabídnout „Přidejte 1–2 fotky domu (nepovinné)“ přes existující formulář `hspg-fotky`; na kartě věta „Silné znečištění může znamenat příplatek 10–30 Kč/m² – z fotky ho potvrdíme nebo vyloučíme ještě před termínem.“ Pravdivé (hodnoty jsou v ceníku `addons`), levné, odstraňuje největší obavu zákazníka z „ceny, která se na místě změní“. *(S–M)*
5. **Cena a termín na jedné kartě.** Pod orientační cenou hned řádek „Nejbližší technologicky vhodný den: čt 29. 10. (bez srážek, 9–14 °C)“ z `/api/planovac` (R17, MET Norway) s tlačítkem „Vybrat termín“ – spojení ceny s počasím nikdo v ČR neukazuje; je to to, co hejno „Komunikuje“ má reálně oznámit. Bez slibu kapacity: text „volno potvrdíme“, dokud kalendář zakázek není napojen (`HSPG_KALENDAR_ICS_URL`). *(S)*

*Volitelně šestá, k rozhodnutí majitele:* „Orientační cena platí **[DOPLNIT] dnů** od data kalkulace, pokud se plochy při ověření neliší o více než **[DOPLNIT] %**“ – zámek ceny je nejsilnější důvěryhodnostní slib, ale potřebuje čísla od majitele a advokáta, ne od návrhu.

---

### Shrnutí jednou větou
Prototyp má správný tvar a správný motiv (zlatý holub, pečeť, klidné sklo), ale do „nejvyšší úrovně v ČR“ mu chybí tři věci: **pravdivost** (body 1–6 § 2), **choreografie vázaná na skutečné události** (body 7–12) a **jedna sada pravidel pro prototyp i kód** (body 13–16, § 3) – teprve pak má smysl ladit mikrointerakce.
