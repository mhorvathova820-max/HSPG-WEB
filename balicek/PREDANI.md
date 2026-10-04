# Předání – web hspg.cz (stav k 4. 10. 2026)

Jedna stránka: co je hotové, kdo co dělá a v jakém pořadí, co zbývá na majiteli. Podrobnosti: `KONTEXT.md` (fakta a pravidla), `ukoly/PORADI.md` (pořadí úkolů), `README.md` (technika).

## 1. Co je hotové (v tomto balíčku)

| Část | Stav |
|---|---|
| Plovoucí tlačítko **H-SPG CORE · Budoucnost ve Vašich rukách** (zákazník) a **Vše ve tvých rukách** (majitel) | hotový kód v `web/` – web funguje i bez AI (FAQ, zavolání zpět, poptávka, telefon) |
| Spolupráce AI | zákazník: jedna AI píše jen ze schválených znalostí, druhá kontroluje; čísla mimo znalosti → předání týmu. Majitel: všechny AI najednou nebo spolupráce, AI centrum `/ai-centrum/` |
| Ochrana kreditů Netlify | rozpočet AI za období kreditů (11.–10.) s rezervací před voláním, podíl zákazníků (výchozí polovina), nouzový vypínač v panelu, při výpadku úložiště AI vypnutá, pojistka nasazení `scripts/nasadit.mjs` (náhled zdarma, produkce jen se schválením, max. 1× denně) |
| Bezpečnost | přihlášení majitele tokenem (heslo jen v Netlify), zámek pokusů, tajemství podpisu na serveru, žádné klíče v kódu |
| Ověření vyhledávačů | soubory Seznam a Bing v `web/overeni/` (úkol 20) |
| Testy | 78 jednotkových + 17 v prohlížeči (Chromium nad kopií živého webu), všechny prochází |
| Zadání pro agenta ve VS Code | úkoly 00–20 v `ukoly/` |
| Zadání pro Claude v Chrome | `ZADANI-CHROME.md` (C1–C10) |
| Zadání pro Claude Pro | `ZADANI-CLAUDE-PRO.md` (P1–P7) |

## 2. Kdo co dělá

| Kdo | Co | Kde |
|---|---|---|
| **Agent ve VS Code** (složka webHSPGH) | mění kód webu, úkol po úkolu, každý na vlastní větvi, s hlášením | vlož mu text z `VLOZ-DO-VSCODE.md`, pak jen „pokračuj“ |
| **Claude v Chrome** | ověřuje v prohlížeči, provádí majitele nastavením (v Netlify nic nenastavuje) | vlož mu text z `ZADANI-CHROME.md` |
| **Claude Pro** | rozhodnutí majitele, texty, podklady pro právníka | `ZADANI-CLAUDE-PRO.md` |
| **Majitel** | schvaluje produkci, hesla a platby, rozhodnutí | seznam níže |

Pořadí úkolů agenta: **00 → 20 → 01 → 02 → 17 → 03 → 04 → 05 → 13 → 09 → 06 → 07 → 08 → 16 → 10 → 11 → 18 → 19 → 15 → 14 → 12** (`ukoly/PORADI.md`).

## 3. Úkoly majitele (zaškrtávejte)

**Hned**
- [ ] Netlify: koupit rezervu kreditů (zakoupené nepropadají) a mít platnou kartu; auto-recharge je zapnutý (R9). E-maily Netlify o čerpání 50/75/100 % číst.
- [ ] Změnit hesla, která unikla v e-mailu „Master plán“ (Seznam, Wedos, Netlify) a zapnout dvoufázové ověření. Uniklé heslo **nikdy** nepoužít.
- [ ] Repozitář HSPG-WEB na GitHubu přepnout na soukromý.
- [ ] Google Firemní profil: natočit ověřovací video (profil čeká na ověření, do té doby nejsou změny veřejné).

**Když se agent ozve**
- [ ] Netlify → proměnné prostředí: `HSPG_PANEL_HESLO` – nové heslo, aspoň 16 znaků (zadáváte sami, nikomu ho nepište). Volitelně `AI_MESICNI_LIMIT_KC`, `AI_VEREJNY_LIMIT_KC`, `AI_OBDOBI_DEN` (den začátku období kreditů – ověřte v Usage & billing, výchozí 11).
- [ ] Schvalovat produkční nasazení (každé stojí 15 kreditů) – nejdřív si prohlédnout náhled.
- [ ] Po nasazení úkolu 20: v Seznam Webmasteru i Bing Webmaster Tools kliknout **Ověřit** a odeslat sitemap `https://hspg.cz/sitemap.xml`.
- [ ] Úkol 02: zvolit kanál upozornění na poptávky (ntfy / Telegram) a heslo aplikace pro SMTP Seznam. `POTVRZENI_ZAKAZNIKOVI` nezapínat, dokud úkol 02 není hotový.

**Rozhodnutí (Claude Pro, úkol P1)**
- [ ] Doba uchování poptávek, newsletter Holubí pošta, stav technologií HYDRA / MAST / RAIL / SCAN / SENTINEL, pojištění, doklady H-BIO, slib reakční doby, tvrzení z Facebooku („25 let zkušeností“, „Technologie z Velké Británie“).
- [ ] Text obchodních a reklamačních podmínek od právníka (úkol 04).

**Nikdy**
- Neměnit MX záznamy hspg.cz (pošta běží na Seznamu).
- Nemazat v Netlify Blobs záznam `tajemstvi/token` (odhlášení všech zařízení = změna hesla + nové nasazení).
- Nezakládat nové klíče Gemini / xAI / OpenWeatherMap – AI dodává Netlify AI Gateway.
- Nenasazovat do produkce jinak než přes `scripts/nasadit.mjs`.
- Nezveřejňovat nedoložená tvrzení (recenze, hodnocení, pojistné částky).

## 4. Jak poznat, že je hotovo
- Každý úkol agenta končí hlášením podle `KONTEXT.md` §5 a odškrtnutými akceptačními kritérii.
- Claude v Chrome po každém úkolu zkontroluje náhled (C9) a po schváleném nasazení produkci.
- Týdenní kontrola provozu a kreditů (úkol 15) hlídá útratu AI, přenos dat, formuláře a dostupnost.
