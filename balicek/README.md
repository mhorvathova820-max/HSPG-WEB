# Balíček pro web hspg.cz

| Soubor | K čemu |
|---|---|
| [VLOZ-DO-VSCODE.md](VLOZ-DO-VSCODE.md) | **blok, který majitel vloží agentovi Claude Code ve VS Code** (mění kód webu) |
| [ZADANI-CHROME.md](ZADANI-CHROME.md) | blok pro **Claude v Chrome** – administrace (Netlify, Seznam, Google, Wedos) a kontrola náhledů v prohlížeči |
| [ZADANI-CLAUDE-PRO.md](ZADANI-CLAUDE-PRO.md) | projekt a úkoly pro **Claude Pro** (claude.ai) – rozhodnutí majitele, texty, podklady pro právníka |
| [KONTEXT.md](KONTEXT.md) | ověřená fakta, rozhodnutí majitele a nepřekročitelná pravidla |
| [POSUDEK-MASTER-PLANU.md](POSUDEK-MASTER-PLANU.md) | co z e-mailu „Master plán“ převzít a co ne |
| [PREDANI.md](PREDANI.md) | **začni zde** – co je hotové, kdo co dělá, úkoly majitele |
| [ukoly/PORADI.md](ukoly/PORADI.md) | pořadí úkolů 00–27 a 48–53 |
| [ZADANI-CLAUDE-DESIGN-HOLUB360.md](ZADANI-CLAUDE-DESIGN-HOLUB360.md) | **prompt pro Claude Design** – vzhled stránky HOLUB 360 a postup exportu do `navrhy/` |
| [RADA-AI-2026-10-22.md](RADA-AI-2026-10-22.md) | závěry rady 5 AI (OpenRouter) k ceně, smlouvě, záruce a textům; co čeká na majitele |
| [RADA-VYSLEDKY-VIZUAL-2026-10-22.md](RADA-VYSLEDKY-VIZUAL-2026-10-22.md) | kolo 2 rady AI (vizuál, cesta zákazníka, kritika, komponenty, texty): co je přijaté a kde, co odmítnuté a proč |
| [RADA-VYSLEDKY-DOKONALOST-2026-10-22.md](RADA-VYSLEDKY-DOKONALOST-2026-10-22.md) | kolo 3 rady AI (pozvánka na zvuk, úložiště, choreografie, pečeť, texty): zapracováno v `hspg-zazitek.js` 1.2.0 a prototypu v10 |
| [RADA-ZADANI-2026-10-22.md](RADA-ZADANI-2026-10-22.md) | zadání, které se vkládá do pole OpenRouter Chat (rada 5 AI) – vzor pro další kola |
| [AGENTI-OPENROUTER.md](AGENTI-OPENROUTER.md) | role modelů, nulové uchovávání dat (ZDR), pseudonymizace, rada AI z terminálu |
| `sablony/github/` | šablony pro spolupráci Claude Code + GitHub Copilot ve webHSPGH (úkol 53) |
| `web/` | hotový kód – cesty odpovídají cílovým cestám ve webHSPGH |
| `web/overeni/` | ověřovací soubory Seznamu a Bingu – patří do **kořene** publikované složky webu, kopírovat bajt po bajtu; `meta-tagy.html` = dva meta tagy do `<head>` úvodní stránky (úkol 20) |
| `testy/` | jednotkové testy (`npm test`) a testy v prohlížeči nad kopií webu (`npm run test:e2e`) |

## Novinky 22. 10. 2026 (úkoly 48–53, rozhodnutí R15–R19)
- **H-BOT v5** – zlatý 3D origami holub nad střechou, hejno, oznámení AI (AI Act čl. 50); **„Cena hned“**: orientační cena z ceníku a ploch zákazníka v zapečetěné obálce, PDF kalkulace a **NÁVRH smlouvy o dílo** (nezávazný, vzniká jen v prohlížeči), neutrální porovnání s cizí nabídkou (`/api/konkurence`).
- **HOLUB 360** (`/holub-360/`) – průlet nad Starou Prahou, zaměření na dálku, ilustrační 3D model, cesta A/B s odstíny RAL, kalkulace, kalendář s technologickým oknem (R17), rezervace.
- **Standard HOLUB** (`/standard-holub/`, generovaná z dat) a **péče SENTINEL** BASE / PLUS / PRESTIGE; jedno cenové jádro `assets/hspg-cena.js`.
- **Pas domu – trezor** (kód pasu + přístupový kód), **rada AI přes OpenRouter** s pseudonymizací, spolupráce s **GitHub Copilotem**.

## Plovoucí asistent „H-SPG CORE · Budoucnost ve Vašich rukách“
- **Zákazník:** okamžité ověřené odpovědi (FAQ, ceník z `content/ceny.json`), spolupracující AI (jedna píše, druhá ověřuje – průběh vidí živě), zavolání zpět. Telefony a e-maily do AI neodchází.
- **Majitel:** po přihlášení „Vše ve tvých rukách“ – všechny AI najednou nebo ve spolupráci, hotové úlohy, kontrola aktuální stránky, útrata v Kč a v kreditech Netlify; velké AI centrum na `/ai-centrum/`.
- **Bez AI:** plně funkční (FAQ, formulář, telefon). AI běží přes Netlify AI Gateway (klíče dodává Netlify, platí se kredity) nebo přes vlastní klíče; rozpočet `AI_MESICNI_LIMIT_KC` za období kreditů Netlify (11.–10., `AI_OBDOBI_DEN`; zákazníci nejvýš `AI_VEREJNY_LIMIT_KC`, výchozí polovina) hlídá, aby AI nevyčerpala kredity a nepozastavila web.

| Endpoint | Kdo | Co |
|---|---|---|
| `GET/POST /api/asistent` | veřejné | spolupráce AI pro zákazníka (JSON nebo živý průběh NDJSON) |
| `POST /api/majitel` | veřejné | přihlášení majitele → podepsaný token 12 h |
| `POST /api/ai` = `/api/agent/:id` | majitel | jedna AI, streamovaná odpověď; vlastní klíč nebo Gateway, 45 s, opakování, převzetí Claudem |
| `GET /api/ai-stav` | majitel | stav AI, cesta (vlastní klíč / Gateway), útrata, kredity; POST `{ modely }` = přepínač modelů |
| `submission-created` | Netlify | druhý kanál upozornění na poptávky (ntfy / Telegram / SMTP), směrování na 5 schránek |
| `POST /api/ai-stav` | majitel | nouzový vypínač AI pro zákazníky (okamžitě, bez nasazení) |
| edge `media-limit` | Netlify | brzda rychlého stahování `/media/*` (100 / min na IP; pomalé stahování nezastaví – přenos hlídá úkol 15) |

## Plánovač termínu a H-WEATHER CONTROL (úkol 21)
- **Zákazník – `/planovac/`:** obec (našeptávač z lokálního seznamu obcí ČÚZK), 21 dní volno/obsazeno z kalendáře zakázek (bez detailů), u ~9 dní předpověď (srážky, teplota, vítr – jen fakta, MET Norway), rychlá rezervace se **slevou 10 %**, kód **dárkového kuponu** (1 l impregnace H-STONE zdarma pro sousedy a známé). Funguje bez JS i bez AI. `/kupon/?k=…` – stránka kuponu k předání.
- **Majitel – AI centrum → H-WEATHER CONTROL:** počasí pro obec a typ práce (✅/⚠️/⛔ s důvody podle `content/pocasi-prace.json`), zakázky z Google Kalendáře a rezervace s hodnocením, tajný odkaz na kalendář s varováním pro Google, vytváření a rušení kuponů.
- **Bez klíčů a registrací:** počasí MET Norway (CC BY 4.0, komerčně zdarma), obce ČÚZK – RÚIAN (CC BY 4.0, přibalené `content/obce.json`, obnova `node web/scripts/build-obce.mjs`), kalendář přes tajnou adresu iCal (`HSPG_KALENDAR_ICS_URL`, zadává majitel v Netlify).

| Endpoint | Kdo | Co |
|---|---|---|
| `GET /api/planovac` | veřejné (CDN 10 min) | dny volno/obsazeno + počasí, našeptávač obcí, nabídky |
| `GET /api/pocasi` | veřejné (CDN 30 min) | náhrada stávající funkce pro `/akce/` (stejné rozhraní, MET Norway místo nekomerčního Open-Meteo) |
| `GET /api/kupon?kod=` | veřejné (20/h) | ověření kuponu; vytvoření, seznam a zrušení jen majitel |
| `GET/POST /api/pocasi-prace` | majitel | vyhodnocení počasí, přehled zakázek a rezervací, odkaz na kalendář |
| `GET /api/pocasi-kalendar/<klíč>.ics` | Google Kalendář majitele | kalendář s varováním počasí (tajný odkaz, jde vyměnit) |
| `POST /api/mereni` | majitel | měření budovy z adresy: RÚIAN půdorys + výškopis ČÚZK, záloha OSM; schéma, ne zaměření (úkol 23) |
| `GET/POST /api/lovec-svj` | majitel | Lovec SVJ: ARES + měření + ověřené veřejné kontakty → návrhy ke schválení, seznam neozývat, dopis k tisku s QR a kuponem; bez hromadného e-mailu (úkol 24) |
| `submission-created` (`hspg-rezervace`) | Netlify | rezervace do přehledu, uplatnění kuponu, sleva a kupon v oznámení |

## Testy
```
npm install
npm test                                                      # 210 jednotkových testů
HSPG_MIRROR=/cesta/k/webu CHROMIUM=/cesta/k/chromium npm run test:e2e   # 102 testů v prohlížeči (bez HSPG_MIRROR na zástupných stránkách testy/fixtures/web)
HSPG_MIRROR=/cesta/k/webu node balicek/testy/server.mjs       # ruční prohlížení na http://127.0.0.1:8787
```
Testy nevolají žádnou skutečnou AI a nic neodesílají ven. `HSPG_MIRROR` = složka webHSPGH nebo kopie živého webu (`wget --mirror https://hspg.cz`).
