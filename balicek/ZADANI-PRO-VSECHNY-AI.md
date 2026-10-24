# Společné zadání pro všechny AI – HSPG (22. 10. 2026)

> Jeden blok pro všechny: Claude (chat, Pro/Max), Claude Design, Claude v Chrome, Claude Code ve VS Code,
> GitHub Copilot a modely v OpenRouter. Každá AI si najde svou roli (A–F) a dělá jen ji. Výstupy vložte zpět
> do chatu s Claude Code (cloud) – sloučí je, otestuje a předá k nasazení. Nikam nevkládejte hesla, klíče ani osobní údaje.

```text
HSPG · SPOLEČNÉ ZADÁNÍ PRO VŠECHNY AI (22. 10. 2026)
Koordinátor: Claude Code (cloud) – hlavní mozek. Kód do webu zapracovává Claude Code ve VS Code (složka webHSPGH), produkci nasazuje jen se souhlasem majitele. Odpovídej česky, věcně, jen za svou roli.

FIRMA (veřejné údaje): HOLUB Surface Protection Group (HSPG) – čištění a ochrana povrchů staveb v ČR: střechy, fasády, dlažby, fotovoltaika. OSVČ, neplátce DPH. Web https://hspg.cz. Balíček kódu a zadání: github.com/mhorvathova820-max/HSPG-WEB, větev claude/apex-48-53, složka balicek/.

CÍL: Celý web (veřejné stránky, plovoucí asistent H-BOT, stránky po přihlášení majitele) na úrovni „Apple × Porsche“: klidný luxus, přívětivost, důvěra. Návštěvník pochopí, co dostane, spočítá si orientační cenu, rezervuje termín a stane se zákazníkem; správci SVJ, developeři, architekti a dodavatelé partnery.

VZHLED APEX: matná čerň #05070f / #0b0f19, obsidiánové sklo (rozostření 22 px, rámeček rgba(212,175,55,.22), zaoblení 22 px), tekuté zlato #D4AF37 (#F6E7A8 / #8A6A12), Playfair Display (nadpisy, lining číslice) + Manrope (text), tlačítka-pilulky min. 48 px, zlatá záře při fokusu. Symbol: zlatý 3D origami holub nad střechou – žádné roboty.

CO EXISTUJE: H-BOT v5 (plaketa s holubem, hejno, panel ze skla, oznámení „AI asistent“, na mobilu lišta Zavolat · Zeptat se · Cena hned) · „Cena hned“ (objekt → povrchy → ochrana → plochy → zapečetěná obálka → orientační cena, PDF kalkulace, NÁVRH smlouvy) · HOLUB 360 (průlet nad Prahou, zaměření na dálku, 3D model, kalendář 21 dní, rezervace) · Standard HOLUB (vždy celý postup: 01 Čištění, 02 Odmaštění, 03 Ošetření biocidy, 04 Oplach, 05 Ochranná vrstva – cesta A neviditelný štít H-STONE, cesta B barevná renovace v RAL; nebo čištění a ošetření 01–04) · péče SENTINEL BASE 499 / PLUS 2 490 / PRESTIGE 5 890 Kč ročně · Pas domu – trezor · panel majitele a AI centrum.

PRAVIDLA (nepřekročitelná): žádná vymyšlená čísla, recenze, hodnocení, certifikace, pojištění ani srovnání s konkurencí (směrnice EU 2024/825) · výsledek kalkulace = „orientační cena“, nikdy „nabídka“ · u záruky 10 let vždy podmínka péče SENTINEL BASE · v textech pro zákazníky nikdy „letecké mapy“, „satelitní snímky“, „Google Maps“, „katastr“, „RÚIAN“, „z map(ových podkladů)“ – místo toho „HOLUB CORE QUANTUM SENSE · zaměření na dálku“ (licence „© ČÚZK“ malým písmem zůstává) · WCAG 2.1 AA, prefers-reduced-motion, cíle dotyku min. 44 px, 390 px bez vodorovného posunu · zvuk a vibrace jen po akci uživatele a s vypínačem · LCP do 2,5 s · žádné CDN ani cizí písma · žádné blokování pravého tlačítka/F12 ani zamlžování kódu · žádné osobní údaje, hesla ani klíče · co nevíš jistě, označ „ověřit“.

ROLE – NAJDI SVOU:
A) CLAUDE DESIGN – navrhni a vylaď vizuál celého balíčku v projektu „HSPG Apex – kompletní návrh“: H-BOT (plaketa, panel, Cena hned s celým postupem 01–05, obálka s voskovou pečetí, orientační cena), HOLUB 360, Standard HOLUB, Pas domu, plánovač, panel majitele, partnerská stránka. Ke každé obrazovce desktop 1440 a mobil 390, stavy (načítání, chyba, prázdno, omezení pohybu) a tabulku animací (prvek · spouštěč · ms · křivka · co bez pohybu). Export: Share → Export → Project HTML (zip) → nahrát do GitHubu balicek/navrhy na větev claude/apex-48-53.
B) CLAUDE V CHROME – projdi https://hspg.cz (desktop a 375 px) a vypiš: zakázaná slova, nesoulad se Standardem HOLUB (např. jen 4 kroky, tarify START/PREMIUM místo BASE/PLUS/PRESTIGE), „Cena ihned“ bez celého postupu, kontrast, nefunkční odkazy, chyby konzole. Nic neodesílej a nic v účtech neměň bez „ano“ majitele.
C) CLAUDE (CHAT, PRO/MAX) – připrav texty k rozhodnutí majitele: partnerský program „HOLUB Partner“ (co pravdivě nabídnout správcům SVJ, developerům, architektům a dodavatelům), texty podstránek, e-mail po rezervaci. Právní texty jen jako návrh pro advokáta.
D) MODELY V OPENROUTER – GEMINI: art direction a choreografie pohybu; CLAUDE OPUS: cesta zákazníka a partnera, UX panelu majitele; GPT ASTRA: originální komponenty v CSS/vanilla JS s tokeny --apex-*; GROK: kritika a rizika důvěry; MUSE: luxusní texty bez superlativů (Muse nikdy nedostane osobní údaje).
E) CLAUDE CODE VE VS CODE – postupuj podle balicek/VLOZ-DO-VSCODE.md (blok A) a balicek/ukoly/PORADI.md; každý úkol na vlastní větvi, testy, náhled zdarma, hlášení a stop.
F) GITHUB COPILOT – úkoly s popiskem „copilot“ v repozitáři HSPG-WEB (#3–#6), pravidla v AGENTS.md, PR do claude/apex-48-53.

FORMÁT VÝSTUPU (všichni stejně):
## Role – kdo jsi
**Shrnutí** (3 věty) · **Výstup** (číslovaně; u návrhů obrazovky a stavy, u kódu kompletní soubory) · **Rizika** · **Ověřit a kde**.
```
