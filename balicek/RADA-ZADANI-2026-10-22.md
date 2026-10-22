# Zadání pro radu 5 AI (OpenRouter Chat) – 22. 10. 2026

> **Jak použít:** openrouter.ai/chat → přidejte modely Gemini Pro Latest, Claude Opus Latest, Grok Latest, GPT Astra Latest a Muse Wonder (režim porovnání) → celý blok níže vložte do pole „Ask anything…“ → odeslat. Odpovědi sloučí Claude Code (koordinátor) – výsledek tohoto kola je v `RADA-AI-2026-10-22.md`.
> Do pole nikdy nevkládejte osobní údaje zákazníků ani klíče (Muse Wonder nemá nulové uchovávání dat). Pro opakované a levnější kolo z terminálu: `node balicek/web/scripts/rada.mjs "otázka" --md` (úkol 52).

```text
RADA HSPG – týmové zadání pro 5 AI (22. 10. 2026)
Koordinátor projektu je Claude Code (hlavní mozek). Pracujete jako tým: každý má roli podle svého jména níže. Odpovídej JEN za svou roli, česky, věcně a prakticky. Výstupy sloučím a rovnou zapracuji do webu hspg.cz.

FIRMA (veřejné údaje): HOLUB Surface Protection Group (HSPG) – čištění a ochrana povrchů staveb v ČR: střechy, fasády, dlažby, čištění fotovoltaiky. OSVČ, neplátce DPH.

CO DNES STOJÍ:
1) H-BOT v5 – plovoucí asistent webu: zlatý 3D origami holub nad střechou, hejno holubů při otevření. Odpovídá z ověřených FAQ; když je zapnutá AI, je to v panelu oznámeno (AI Act čl. 50).
2) Okamžitá kalkulace „Cena hned“ v H-BOTovi: objekt → povrchy → ochrana (cesta A neviditelný štít H-STONE / cesta B barevná renovace v odstínu RAL / jen čištění) → plochy (m², z rozměrů, obec pro odhad dopravy) → zapečetěná obálka s cenou → PDF orientační nabídka + NÁVRH smlouvy o dílo (nezávazný, PDF vzniká jen v prohlížeči) + neutrální porovnání s cizí nabídkou.
3) Ceník od 1. 10. 2026 (Kč/m², konečné ceny): cesta A (2× H-STONE): střecha 178, fasáda 168, dlažba 119. Cesta B (penetrace + 2× airless nástřik ohřívanou barvou): střecha 268, fasáda 298. Jen čištění: střecha 99, fasáda 89, dlažba 69, fotovoltaika 39. Minimum zakázky 4 900 Kč (samotná FVE 2 490). Slevy se nesčítají: 2+ povrchy 5 %, SVJ od 1 000 m² 5 %, od 2 500 m² 8 %. Doprava zdarma do 30 km od Prahy nebo Hradce Králové, dál 12 Kč/km. Do 100 000 Kč záloha 0 Kč, splatnost 7 dnů po předání (SVJ 14); nad 100 000 Kč záloha 30 % na materiál.
4) Standard HOLUB – vždy všech 5 kroků: 01 Čištění (tlak a teplota vody podle materiálu), 02 Odmaštění, 03 Ošetření biocidy, 04 Oplach, 05 Ochranná vrstva (cesta A nebo B).
5) Péče SENTINEL: BASE 499 Kč/rok (kontrola 1× ročně s fotodokumentací, aktualizace digitálního pasu domu; podmínka trvání záruky 10 let na H-STONE), PLUS 2 490 Kč/rok, PRESTIGE 5 890 Kč/rok.
6) NÁVRH smlouvy o dílo (osnova): nezávaznost (není nabídkou ve smyslu § 1732 OZ); smluvní strany; čl. 1 předmět a postup Standard HOLUB; čl. 2 cena podle ceníku, konečná cena po ověření rozsahu na místě, příplatek za silné znečištění 10–30 Kč/m² jen je-li v konečném znění; čl. 3 doba plnění jen za vhodného počasí, posun není porušením; čl. 4 platby podle ceníku; čl. 5 součinnost (voda, elektřina, přístup, přítomnost není nutná); čl. 6 předání s fotodokumentací před/po; čl. 7 záruka H-STONE 10 let při SENTINEL BASE, prasklou zdravou tašku vyměníme na své náklady, zákonná práva nedotčena, reklamace do 30 dnů; čl. 8 odstoupení spotřebitele (§ 1829, § 1834, § 1837 písm. a); čl. 9 ČOI a osobní údaje; čl. 10 závěrečná ustanovení; příloha 1 rozpis ceny, příloha 2 vzorový formulář pro odstoupení.

NEPŘEKROČITELNÁ PRAVIDLA: žádná vymyšlená čísla, reference, certifikáty ani srovnání s konkurencí bez důkazu (směrnice EU 2024/825, § 2980 OZ); žádné osobní údaje; „HOLUB CORE QUANTUM SENSE“ je jen název měření na dálku – žádná tvrzení o kvantové fyzice; u biocidů věta „Používejte biocidy bezpečným způsobem. Před použitím si vždy přečtěte označení a informace o přípravku.“ Když si nejsi jistý, napiš „ověřit“ a kde.

ROLE PODLE JMÉNA:
• GEMINI – patenty a ochranné známky: (a) má smysl užitný nebo průmyslový vzor na „měděný hřebenový prvek s ražbou holuba“ (měděný pás pod hřebenáči, déšť z mědi zpomaluje návrat mechů)? Jaký je známý stav techniky (zinkové a měděné pásy proti mechu)? Co je chránitelné – technické řešení, nebo vzhled ražby? (b) riziko kolize slovních známek HOLUB, H-STONE, SENTINEL, HOLUB 360, H-BOT, HOLUB CORE QUANTUM SENSE ve třídách 2, 19, 37, 42 – co a jak hledat v databázích ÚPV, TMview a EUIPO; (c) doporučené pořadí podání.
• CLAUDE – právní kontrola NÁVRHU smlouvy a kalkulace podle českého práva: chybí povinné informace u smluv mimo obchodní prostory a distančních (§ 1811, § 1820 OZ)? Je nezávaznost formulovaná správně? Odstoupení u služeb (§ 1829–1837)? Rizika ve větách o záruce a počasí? Navrhni přesné znění opravených článků.
• GPT (ASTRA) – zážitek zákazníka a konverze „Cena hned“: 10 nejsilnějších vylepšení (UX, texty, důvěra, přístupnost, mobil), co měřit a dva A/B testy. Konkrétní české texty tlačítek a nápověd.
• GROK – kritik a pohled konkurence: kde nás zákazník nebo konkurent napadne (cena, záruka podmíněná předplatným, tvrzení, smlouva), 10 námitek zákazníka s poctivou odpovědí a 5 největších rizik pro firmu.
• MUSE – luxusní české texty (tón Apple/Porsche, bez superlativů a bez nepravdivých tvrzení): 5 variant hlavního nadpisu stránky HOLUB 360, 5 textů na obálku s cenou („Vaše cena je zapečetěná…“), 5 krátkých popisků tlačítka H-BOT, 3 varianty věty o záruce s podmínkou SENTINEL BASE.

FORMÁT ODPOVĚDI (pro všechny stejný):
## ROLE – jméno modelu
**Shrnutí** (3 věty) · **Zjištění** (číslovaně, nejvýš 10) · **Návrh přesného znění** · **Rizika** · **Ověřit a kde** (zdroj, URL).
Bez úvodních zdvořilostí, nejvýš 700 slov.
```
