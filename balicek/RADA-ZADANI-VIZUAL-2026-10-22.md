# Zadání pro radu 5 AI – vizuální a zákaznická dokonalost celého webu (22. 10. 2026)

> **Jak použít:** openrouter.ai/chat → předvolba „Flagship models“ (Gemini Pro Latest, Claude Opus Latest, Grok Latest,
> GPT Astra Latest, Muse Wonder) → celý blok níže do pole „Ask anything…“ → odeslat. Odpovědi sloučí Claude Code
> (koordinátor) a zapracuje je přes Claude Design a agenta ve VS Code. Do pole nikdy osobní údaje ani klíče
> (Muse Wonder nemá nulové uchovávání dat).

```text
HSPG – ZADÁNÍ PRO TÝM 5 AI: VIZUÁLNÍ A ZÁKAZNICKÁ DOKONALOST CELÉHO WEBU (22. 10. 2026)
Koordinátor je Claude Code (hlavní mozek). Vaše výstupy sloučí, ověří testy a zapracuje přes Claude Design a agenta ve VS Code do webu hspg.cz. Odpovídej JEN za svou roli, česky, konkrétně, bez úvodních zdvořilostí.

FIRMA (veřejné údaje): HOLUB Surface Protection Group (HSPG) – čištění a ochrana povrchů staveb v ČR: střechy, fasády, dlažby, fotovoltaika. OSVČ, neplátce DPH. Web https://hspg.cz (veřejné stránky si prohlédněte, pokud umíte číst web; do stránek po přihlášení přístup nemáte – popis je níže).

CÍL: Celý web (veřejné stránky, plovoucí asistent H-BOT a stránky po přihlášení majitele) dotáhnout na úroveň „Apple × Porsche“: klidný luxus, přívětivost a důvěra. Návštěvník má být nadšený, hned pochopit, co dostane, spočítat si orientační cenu a rezervovat termín – a stát se zákazníkem. Správci SVJ, developeři, architekti a dodavatelé se mají stát partnery.

CO UŽ EXISTUJE:
1) Vzhled Apex: matná čerň #05070f / #0b0f19, obsidiánové sklo (rozostření 22 px, rámeček rgba(212,175,55,.22), zaoblení 22 px), tekuté zlato #D4AF37 (světlé #F6E7A8, tmavé #8A6A12), písma Playfair Display (nadpisy, lining číslice) a Manrope (text), tlačítka-pilulky min. 48 px, zlatá záře při fokusu.
2) H-BOT v5: plaketa vlevo dole se zlatým 3D origami holubem nad střechou (Canvas 2D, žádný robot, žádné kulaté logo), hejno 9 holubů při otevření, panel ze skla, trvalé oznámení „AI asistent“ (AI Act čl. 50). Na mobilu lišta Zavolat · Zeptat se · Cena hned.
3) „Cena hned“: 5 kroků (objekt → povrchy → ochrana A / B / jen čištění s odstíny RAL → plochy → zapečetěná obálka s voskovou pečetí) → orientační cena z ceníku, PDF kalkulace a nezávazný NÁVRH smlouvy (vzniká jen v prohlížeči), neutrální porovnání s cizí nabídkou.
4) HOLUB 360: průlet nad Starou Prahou (Three.js), kapky „klepněte kamkoliv“, zaměření na dálku (HOLUB CORE QUANTUM SENSE), ilustrační 3D model domu, štětec Před/Po, kalkulace, kalendář 21 dní se šrafovanými technologicky nevhodnými dny, rezervace.
5) Standard HOLUB – vždy 5 kroků (01 Čištění, 02 Odmaštění, 03 Ošetření biocidy, 04 Oplach, 05 Ochranná vrstva); cesta A neviditelný štít H-STONE, cesta B barevná renovace v odstínu RAL. Péče SENTINEL BASE 499 / PLUS 2 490 / PRESTIGE 5 890 Kč ročně.
6) Pas domu – trezor (kód pasu + přístupový kód).
7) Po přihlášení majitele: panel „Vše ve tvých rukách“ a AI centrum (rada AI, H-WEATHER CONTROL s počasím a rezervacemi, kupony, Lovec SVJ) – vzhled zatím technický.
8) Ceník od 1. 10. 2026 (Kč/m²): cesta A střecha 178, fasáda 168, dlažba 119; cesta B střecha 268, fasáda 298; jen čištění střecha 99, fasáda 89, dlažba 69, fotovoltaika 39. Minimum zakázky 4 900 Kč.

NEPŘEKROČITELNÁ PRAVIDLA: žádné roboty ani robotičtí maskoti (symbol je zlatý origami holub); žádná vymyšlená čísla, recenze, hodnocení, certifikace, pojištění ani srovnání s konkurencí (směrnice EU 2024/825); výsledek kalkulace je „orientační cena“, nikdy „nabídka“; u záruky 10 let vždy podmínka péče SENTINEL BASE; zakázaná slova v textech pro zákazníky: „letecké mapy“, „satelitní snímky“, „Google Maps“, „katastr“, „RÚIAN“, „z map“ (místo toho „HOLUB CORE QUANTUM SENSE · zaměření na dálku“); WCAG 2.1 AA, prefers-reduced-motion, cíle dotyku min. 44 px, šířka 390 px bez vodorovného posunu; zvuk a vibrace jen po akci uživatele a s možností vypnout (web na iOS vibrace nepodporuje); LCP do 2,5 s; žádné CDN ani cizí písma; žádné blokování pravého tlačítka nebo F12 ani zamlžování kódu; žádné osobní údaje. Když si nejsi jistý, napiš „ověřit“ a kde.

ROLE PODLE JMÉNA:
• GEMINI – art direction a pohyb: pro každou stránku (úvod, služby, HOLUB 360, Standard HOLUB, Pas domu, plánovač termínu, panel majitele) navrhni kompozici úvodní části, jeden hlavní „wow“ moment a choreografii pohybu. Tabulka: prvek · spouštěč · délka (ms) · křivka · co při omezení pohybu. Navrhni let hejna origami holubů a průlet kamery nad Prahou.
• CLAUDE – zážitek a cesta zákazníka i partnera: informační architektura celého webu; cesta návštěvník → orientační cena → rezervace → péče SENTINEL; samostatná cesta pro partnery (správci SVJ, developeři, architekti, dodavatelé – co jim pravdivě nabídnout); UX panelu majitele po přihlášení (poptávky, rezervace, počasí, AI) – co patří na první obrazovku. Přesné české texty tlačítek, prázdných a chybových stavů.
• GPT (ASTRA) – implementace: 6 originálních komponent (zlaté tlačítko s odleskem, zaškrtnutí „fajfka“ s kreslenou animací, „srdíčko“ pro uložení odstínu, přepínač zvuku, načítání se zlatou nití, karta ze skla) v čistém CSS a vanilla JS s předponou tříd a tokeny Apex (--apex-…), s přístupností a omezením pohybu; k tomu malý modul zvuku (Web Audio, syntéza bez souborů, výchozí vypnuto) a haptiky (navigator.vibrate jen když existuje a po akci uživatele). Kód stručně a kompletně.
• GROK – kritik: 10 věcí, kvůli kterým by český majitel domu nebo správce SVJ webu nevěřil nebo odešel, každá s konkrétní opravou; 5 míst, kde luxus škodí rychlosti nebo srozumitelnosti; co by napadla konkurence.
• MUSE – luxusní české texty (tón Apple/Porsche, bez superlativů a bez nepravdivých tvrzení): hlavní nadpis a podnadpis pro každou stránku, 5 pozdravů H-BOTa (bez slova robot), texty obálky a pečeti, název a 3 věty pro partnerský program, 5 textů hlavních tlačítek.

FORMÁT ODPOVĚDI (pro všechny stejný):
## ROLE – jméno modelu
**Shrnutí** (3 věty) · **Návrhy** (číslovaně, nejvýš 12) · **Konkrétní specifikace / texty / kód** · **Rizika** · **Ověřit a kde**.
Nejvýš 900 slov (GPT u kódu může víc).
```
