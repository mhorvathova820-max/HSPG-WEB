# Balíček pro web hspg.cz

| Soubor | K čemu |
|---|---|
| [VLOZ-DO-VSCODE.md](VLOZ-DO-VSCODE.md) | **blok, který majitel vloží agentovi Claude Code ve VS Code** (mění kód webu) |
| [ZADANI-CHROME.md](ZADANI-CHROME.md) | blok pro **Claude v Chrome** – administrace (Netlify, Seznam, Google, Wedos) a kontrola náhledů v prohlížeči |
| [ZADANI-CLAUDE-PRO.md](ZADANI-CLAUDE-PRO.md) | projekt a úkoly pro **Claude Pro** (claude.ai) – rozhodnutí majitele, texty, podklady pro právníka |
| [KONTEXT.md](KONTEXT.md) | ověřená fakta, rozhodnutí majitele a nepřekročitelná pravidla |
| [POSUDEK-MASTER-PLANU.md](POSUDEK-MASTER-PLANU.md) | co z e-mailu „Master plán“ převzít a co ne |
| [ukoly/PORADI.md](ukoly/PORADI.md) | pořadí úkolů 00–15 |
| `web/` | hotový kód – cesty odpovídají cílovým cestám ve webHSPGH |
| `testy/` | jednotkové testy (`npm test`) a testy v prohlížeči nad kopií webu (`npm run test:e2e`) |

## Plovoucí asistent „H-SPG CORE · Budoucnost ve Vašich rukách“
- **Zákazník:** okamžité ověřené odpovědi (FAQ, ceník z `content/ceny.json`), spolupracující AI (jedna píše, druhá ověřuje – průběh vidí živě), zavolání zpět. Telefony a e-maily do AI neodchází.
- **Majitel:** po přihlášení „Vše ve tvých rukách“ – všechny AI najednou nebo ve spolupráci, hotové úlohy, kontrola aktuální stránky, útrata v Kč a v kreditech Netlify; velké AI centrum na `/ai-centrum/`.
- **Bez AI:** plně funkční (FAQ, formulář, telefon). AI běží přes Netlify AI Gateway (klíče dodává Netlify, platí se kredity) nebo přes vlastní klíče; rozpočet `AI_MESICNI_LIMIT_KC` hlídá, aby AI nevyčerpala kredity a nepozastavila web.

| Endpoint | Kdo | Co |
|---|---|---|
| `GET/POST /api/asistent` | veřejné | spolupráce AI pro zákazníka (JSON nebo živý průběh NDJSON) |
| `POST /api/majitel` | veřejné | přihlášení majitele → podepsaný token 12 h |
| `POST /api/ai` | majitel | jedna AI, streamovaná odpověď |
| `GET /api/ai-stav` | majitel | stav AI, útrata, kredity |
| `submission-created` | Netlify | druhý kanál upozornění na poptávky (ntfy / Telegram / SMTP), směrování na 5 schránek |

## Testy
```
npm install
npm test                                                      # 39 jednotkových testů
HSPG_MIRROR=/cesta/k/webu CHROMIUM=/cesta/k/chromium npm run test:e2e   # 11 testů v prohlížeči
HSPG_MIRROR=/cesta/k/webu node balicek/testy/server.mjs       # ruční prohlížení na http://127.0.0.1:8787
```
Testy nevolají žádnou skutečnou AI a nic neodesílají ven. `HSPG_MIRROR` = složka webHSPGH nebo kopie živého webu (`wget --mirror https://hspg.cz`).
