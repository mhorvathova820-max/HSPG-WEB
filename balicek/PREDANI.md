# Předání – web hspg.cz (stav k 22. 10. 2026)

Jedna stránka: co je hotové, kdo co dělá a v jakém pořadí, co zbývá na majiteli. Podrobnosti: `KONTEXT.md` (fakta a pravidla), `ukoly/PORADI.md` (pořadí úkolů), `README.md` (technika).

## 1. Co je hotové (v tomto balíčku)

| Část | Stav |
|---|---|
| Stříbrné plovoucí tlačítko s vyrytým textem **Budoucnost ve Vašich rukách** (zákazník) a **Vše ve tvých rukách** (majitel); futuristické AI centrum s robotem H-BOT, 8 AI a režimem Porada | hotový kód v `web/` – web funguje i bez AI (FAQ, zavolání zpět, poptávka, telefon) |
| Spolupráce AI | zákazník: jedna AI píše jen ze schválených znalostí, druhá kontroluje; čísla mimo znalosti → předání týmu. Majitel: 8 AI (Claude, ChatGPT, Gemini, Grok, Mistral, DeepSeek, Llama, Perplexity) najednou nebo ve spolupráci, AI centrum `/ai-centrum/` |
| Ochrana kreditů Netlify | rozpočet AI za období kreditů (11.–10.) s rezervací před voláním, podíl zákazníků (výchozí polovina), nouzový vypínač v panelu, při výpadku úložiště AI vypnutá, pojistka nasazení `scripts/nasadit.mjs` (náhled zdarma, produkce jen se schválením, max. 1× denně) |
| Bezpečnost | přihlášení majitele tokenem (heslo jen v Netlify), zámek pokusů, tajemství podpisu na serveru, žádné klíče v kódu |
| Ověření vyhledávačů | soubory a meta tagy Seznamu a Bingu v `web/overeni/` (úkol 20; všechny vygenerované kódy najednou) |
| Testy | 186 jednotkových + 79 v prohlížeči (Chromium; kopie živého webu nebo zástupné stránky), všechny prochází (22. 10. 2026) |
| **H-BOT v5 a „Cena hned“** (úkol 48) | zlatý 3D origami holub nad střechou, hejno, oznámení AI; orientační cena z ceníku v zapečetěné obálce, PDF kalkulace, NÁVRH smlouvy o dílo (nezávazný, jen v prohlížeči), porovnání s cizí nabídkou |
| **HOLUB 360** (úkol 49) | `/holub-360/`: průlet nad Prahou, zaměření na dálku, 3D model, cesta A/B, kalkulace, kalendář s technologickým oknem, rezervace |
| **Standard HOLUB, SENTINEL, cenové jádro** (úkol 50) | `/standard-holub/` z dat, tarify BASE / PLUS / PRESTIGE, jedna cena pro všechny části webu |
| **Pas domu – trezor** (úkol 51) | kód pasu + přístupový kód, nic citlivého v adrese |
| **Rada AI přes OpenRouter** (úkol 52) | Claude, GPT, Gemini (patenty), Grok, Muse; pseudonymizace; závěry rady v `RADA-AI-2026-10-22.md` |
| **Spolupráce agentů** (úkol 53) | šablony AGENTS.md, Copilot, issue a CI v `sablony/github/` |
| Zadání pro agenta ve VS Code | úkoly 00–27 a 48–53 v `ukoly/` |
| Zadání pro Claude Design | `ZADANI-CLAUDE-DESIGN-HOLUB360.md` (vzhled HOLUB 360) |
| Zadání pro Claude v Chrome | `ZADANI-CHROME.md` (C1–C14) |
| Zadání pro Claude Pro | `ZADANI-CLAUDE-PRO.md` (P1–P7) |

## 2. Kdo co dělá

| Kdo | Co | Kde |
|---|---|---|
| **Agent ve VS Code** (složka webHSPGH) | mění kód webu, úkol po úkolu, každý na vlastní větvi, s hlášením | vlož mu text z `VLOZ-DO-VSCODE.md`, pak jen „pokračuj“ |
| **Claude v Chrome** | ověřuje v prohlížeči, provádí majitele nastavením (v Netlify nic nenastavuje) | vlož mu text z `ZADANI-CHROME.md` |
| **Claude Pro** | rozhodnutí majitele, texty, podklady pro právníka | `ZADANI-CLAUDE-PRO.md` |
| **GitHub Copilot** | menší úkoly přes issue a pull request; kontroluje je agent ve VS Code, slučuje se po vašem souhlasu | úkol 53, `AGENTS.md` |
| **Rada AI (OpenRouter)** | druhý názor 4–5 modelů na texty, smlouvu, patenty; jen pseudonymizovaně | panel majitele, terminál VS Code (úkol 52) |
| **Majitel** | schvaluje produkci, hesla a platby, rozhodnutí | seznam níže |

Pořadí úkolů agenta: **00 → 20 → 01 → 02 → 21 → 22 → 23 → 24 → 25 → 27 → 50 → 48 → 52 → 49 → 26 → 17 → 03 → 04 → 05 → 13 → 09 → 06 → 07 → 08 → 16 → 10 → 11 → 18 → 19 → 53 → 15 → 14 → 51 → 12** (`ukoly/PORADI.md`). Agentovi, který už pracuje, vložte blok A z `VLOZ-DO-VSCODE.md`.

## 3. Úkoly majitele (zaškrtávejte)

**Hned**
- [ ] Netlify: koupit rezervu kreditů (zakoupené nepropadají) a mít platnou kartu; auto-recharge je zapnutý (R9). E-maily Netlify o čerpání 50/75/100 % číst.
- [ ] Změnit hesla, která unikla v e-mailu „Master plán“ (Seznam, Wedos, Netlify) a zapnout dvoufázové ověření. Uniklé heslo **nikdy** nepoužít.
- [ ] Repozitář HSPG-WEB na GitHubu přepnout na soukromý.
- [ ] Google Firemní profil: natočit ověřovací video (profil čeká na ověření, do té doby nejsou změny veřejné).

**Když se agent ozve**
- [ ] Netlify → proměnné prostředí: `HSPG_PANEL_HESLO` – nové heslo, aspoň 16 znaků (zadáváte sami, nikomu ho nepište). Volitelně `AI_MESICNI_LIMIT_KC`, `AI_VEREJNY_LIMIT_KC`, `AI_OBDOBI_DEN` (den začátku období kreditů – ověřte v Usage & billing, výchozí 11).
- [ ] Schvalovat produkční nasazení (každé stojí 15 kreditů) – nejdřív si prohlédnout náhled.
- [ ] Po nasazení úkolu 20: v Seznam Webmasteru kliknout **Ověřit** (metodou zvolenou naposledy) a odeslat sitemap `https://hspg.cz/sitemap.xml`. Bing je už ověřený přes DNS (4. 10.). U Seznamu už **negenerovat další kód** – každý nový by se musel znovu nasadit.
- [ ] Úkol 02: zvolit kanál upozornění na poptávky (ntfy / Telegram) a heslo aplikace pro SMTP Seznam. `POTVRZENI_ZAKAZNIKOVI` nezapínat, dokud úkol 02 není hotový.

**Úkoly 48–53 (22. 10. 2026)**
- [ ] OpenRouter: klíč zadat **sami** do Netlify jako `HSPG_KLIC_OPENROUTER` a pro terminál VS Code `export OPENROUTER_API_KEY="…"` – nikdy do chatu ani do souboru. Na OpenRouter nabít kredit podle rozpočtu.
- [ ] Advokát: konečné znění smlouvy o dílo (NÁVRH v H-BOTovi), obchodní a reklamační podmínky.
- [ ] Potvrdit: lhůtu 60 dnů pro odstoupení při posunu kvůli počasí, dopravu 12 Kč/km „za jednu cestu“, na HOLUB 360 jednu orientační cenu místo pásma, slib „cenu pošleme do 24 hodin“.
- [ ] Doložit, nebo zmírnit tvrzení o měděném hřebenovém prvku (biocidy, EU 528/2012); ochranné známky podle `RADA-AI-2026-10-22.md` (rešerše ÚPV/TMview před podáním).
- [ ] Claude Design: vložit prompt ze `ZADANI-CLAUDE-DESIGN-HOLUB360.md`, export nahrát do `balicek/navrhy/` (postup v souboru).
- [ ] GitHub: zapnout Copilot coding agent pro repozitář webu (úkol 53).

**Rozhodnutí (Claude Pro, úkol P1)**
- [ ] Doba uchování poptávek, newsletter Holubí pošta, stav technologií HYDRA / MAST / RAIL / SCAN / SENTINEL, pojištění, doklady H-BIO, slib reakční doby, tvrzení z Facebooku („25 let zkušeností“, „Technologie z Velké Británie“).
- [ ] Text obchodních a reklamačních podmínek od právníka (úkol 04).
- [ ] Úkol 21 (plánovač s počasím): potvrdit podmínky **slevy 10 % za rychlou rezervaci** a **dárkového kuponu 1 l H-STONE zdarma** (`content/planovac.json` – místa `[DOPLNIT]`), kolik zakázek zvládnete za den, a poslat technický list H-STONE (pravidla počasí). Vytvořit kalendář „HSPG – zakázky“ a jeho **tajnou adresu iCal** vložit sám do Netlify jako `HSPG_KALENDAR_ICS_URL` (Claude v Chrome úloha C11). Kalendář s varováním přidat do Google z odkazu v AI centru. Vložený Google kalendář (iframe) zatím na web nedávat.

**Nikdy**
- Neměnit MX záznamy hspg.cz (pošta běží na Seznamu).
- Nemazat v Netlify Blobs záznam `tajemstvi/token` (odhlášení všech zařízení = změna hesla + nové nasazení).
- Nezakládat nové klíče Gemini / xAI / OpenWeatherMap – AI dodává Netlify AI Gateway. Výjimka: vlastní klíč OpenRouter (R19), zadáváte ho sami.
- Nenasazovat do produkce jinak než přes `scripts/nasadit.mjs`.
- Nezveřejňovat nedoložená tvrzení (recenze, hodnocení, pojistné částky).

## 4. Jak poznat, že je hotovo
- Každý úkol agenta končí hlášením podle `KONTEXT.md` §5 a odškrtnutými akceptačními kritérii.
- Claude v Chrome po každém úkolu zkontroluje náhled (C9) a po schváleném nasazení produkci.
- Týdenní kontrola provozu a kreditů (úkol 15) hlídá útratu AI, přenos dat, formuláře a dostupnost.
