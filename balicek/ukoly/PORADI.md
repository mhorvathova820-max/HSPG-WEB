# Pořadí úkolů

**Pořadí provádění (agent ve VS Code jde přesně takto):**
00 → 20 → 01 → 02 → 21 → 22 → 23 → 24 → 25 → 27 → **50 → 48 → 52 → 49** → 26 → 17 → 03 → 04 → 05 → 13 → 09 → 06 → 07 → 08 → 16 → 10 → 11 → 18 → 19 → **53** → **59** → 15 → **54** → **56** → **57** → 14 → **51** → 12 → **58**

**Úkoly 48–53 (rozhodnutí majitele 22. 10. 2026, R15–R19; čísla 28–47 nejsou obsazená):** pokud už jsi v pořadí za úkolem 27, udělej hned jako další **50 → 48 → 52 → 49** (48 a 52 nasaď ve stejné dávce – kalkulace volá `/api/konkurence`), pak pokračuj tam, kde jsi skončil. **53** až po 19 (CI), **59** (brána MCP pro Claude majitele, rozhodnutí 30. 10. – R22) hned po 53 (potřebuje 22 a 52), **54** (štít obsahu) a **56** (puls, rozcestník, zvuk a haptika, hejno při zaměření) po 15 (hlavičky), **51** až po 14 (přístupové kódy pasů). **55** (opravy živého webu podle auditu z 22. 10.) udělej hned po 50 – jsou to texty a pravdivost. Kód je v balíčku na větvi `claude/apex-48-53` (obsahuje i vše z `claude/peaceful-johnson-juqa6w`). Závěry rady AI k textům a smlouvě: `balicek/RADA-AI-2026-10-22.md`.

Důvod: nejdřív bezpečí a záloha (00), malé ověření webu v Seznamu a Bingu (20 – soubory jedou s nejbližším schváleným nasazením), asistent (01), poptávky (02), plánovač s počasím a rychlou rezervací (21 – zároveň odstraňuje licenční riziko stávajícího počasí z Open-Meteo) a chyba, kvůli které se návštěvník nedostane k formuláři (17), pak právní a pravdivostní rizika (03–05, 13, 09), pak technika a kvalita (06–08, 16, 10, 11, 18, 19, 15) a nakonec věci čekající na data (14, 12).

Stav „hotové zadání“ = zadání je kompletní. „v1“ = zadání je napsané z ověřených nálezů, po dokončení
zbývajících oblastí auditu se může zpřesnit (před každým úkolem `git pull` balíčku).

| # | Úkol | Priorita | Závisí na | Čeká na majitele |
|---|---|---|---|---|
| 00 | [Základ: Git, prozrazená hesla, kredity, dva agenti](00-zaklad-git-bezpecnost.md) | P0 | – | změna hesel, soukromý repozitář |
| 01 | [Plovoucí asistent H-SPG CORE · Vše ve tvých rukách](01-plovouci-asistent.md) | P0 | 00 | `HSPG_PANEL_HESLO` |
| 02 | [Poptávky: viditelnost a druhý kanál upozornění](02-poptavky-upozorneni.md) | P0 | 00, 01 | kanál upozornění (ntfy / Telegram), heslo aplikace pro SMTP |
| 03 | [Firemní e-maily @hspg.cz na webu](03-firemni-emaily.md) | P1 | 00 | – |
| 04 | [Reklamace a spotřebitelské informace](04-reklamace-podminky.md) | P0 | 03 | text podmínek od právníka |
| 05 | [Záruka 10 let z jednoho místa](05-zaruka-centralne.md) | P1 | 00 | – |
| 06 | [Jedna adresa pro každou stránku (301)](06-jedna-adresa-301.md) | P1 | 00 | – |
| 07 | [Výkon a Core Web Vitals](07-vykon.md) | P1 | 06 | – |
| 08 | [Jednotná hlavička, patička a vzhled](08-jednotny-design.md) | P1 | 03 | – |
| 09 | [Zásady ochrany osobních údajů a souhlasy](09-zasady-souhlasy.md) | P0 | 02, 03 | doba uchování, Holubí pošta |
| 10 | [Cookies a měření konverzí](10-cookies-mereni.md) | P1 | 09 | – |
| 11 | [SEO: strukturovaná data, snippety, Kontakt](11-seo-data-snippety.md) | P1 | 05, 06 | – |
| 12 | [Krajské huby místo okresních stránek](12-krajske-huby.md) | P2 | 11 | skutečné zakázky, souhlas se strategií |
| 13 | [Pravdivost tvrzení: technologie, H-BIO, kariéra, akce](13-pravdivost-tvrzeni.md) | P0 | – | stav HYDRA/RAIL/SCAN/SENTINEL, doklady H-BIO, pravidla akce |
| 14 | [Interní panel: AI centrum, registr čistých domů, recenze](14-interni-panel-registr.md) | P2 | 01 | odkaz na Google recenze, schválení textů (souhlas, žádost, odpovědi), přístupové kódy ke stávajícím pasům, doklad o pojištění |
| 15 | [Provoz: kredity, monitoring, bezpečnostní hlavičky](15-provoz-bezpecnost.md) | P1 | 00 | rozhodnutí o auto-recharge |
| 16 | [Přístupnost a ovládání klávesnicí](16-pristupnost-klavesnice.md) | P1 | 08 | – |
| 17 | [Funkční chyby: kotvy na homepage, kalkulačky, tisk, offline](17-funkcni-chyby.md) | P0 (kotvy) / P1 | 00 | – |
| 18 | [Obsah a cesta k poptávce](18-obsah-cesta-k-poptavce.md) | P1 | 02, 13 | slib reakční doby, texty |
| 19 | [CI: automatické kontroly před sloučením (a provoz formulářů)](19-ci-kontroly.md) | P1 | 00, 07 (fáze B, `dist/`) | doba uchování poptávek, místo pro zálohy exportu, GitHub Pro (ochrana větve) |
| 20 | [Ověření webu v Seznam a Bing Webmasteru (soubory + meta tagy)](20-overeni-seznam.md) | P1 | 00 | schválení produkčního nasazení, kliknutí na „Ověřit“ v Seznam Webmasteru a Bing Webmaster Tools |
| 21 | [H-WEATHER CONTROL: plánovač s počasím, rychlá rezervace (sleva 10 %), dárkový kupon, kalendář majitele](21-planovac-pocasi.md) | P1 | 00, 01, 02 | podmínky slevy a kuponu, kapacita za den, technický list H-STONE (pravidla počasí), kalendář zakázek + `HSPG_KALENDAR_ICS_URL` |
| 22 | [H-SPG CORE v3: brána AI, vlastní klíče, přepínač modelů, vzhled v3](22-konzole-v3.md) | P1 | 01, 21 | vlastní klíče v Netlify, export v3 z Claude Design |
| 23 | [Měření budovy z adresy (`/api/mereni`)](23-mereni-budov.md) | P1 | 01, 22 | – |
| 24 | [Lovec SVJ: veřejné kontakty, návrhy ke schválení, dopis s QR (`/api/lovec-svj`)](24-lovec-svj.md) | P2 | 01, 21, 22, 23 | zapnutí Perplexity v AI Gateway, text nabídky v dopise, právní posouzení (telefon, oprávněný zájem, zásady – úkol 09) |
| 25 | [Konzole v9 za „Vše ve tvých rukách“ a H-BOT v3 pro zákazníky (části a–d)](25-konzole-v9-hbot-v3.md) | P1 | 01, 21, 22 A, 23, 24 (nahrazuje 22 B) | export z Claude Design do `balicek/navrhy/`, potvrzení ceníku, podmínky kuponu, technický list H-STONE, klíče v Netlify, zapnutí Perplexity, druhý faktor přihlášení |
| 26 | [Mapa příležitostí: střechy a fasády obce/ulice, riziko mechu, letáky a sousedské kupony](26-mapa-prilezitosti.md) | P2 | 21, 23, 25 | potvrzení ceníku, souhlas zákazníka se zmínkou o zakázce na letáku |
| 27 | [Okamžitá cena z adresy: sken domu z H-BOT v3, cena do 24 h, plánovač a kupon (navazuje na 25 d)](27-cena-z-adresy.md) | P2 | 02, 09, 21, 23, 25 d | potvrzení ceníku (`content/cenik-potvrzeni.json`), slib „cena do 24 hodin“ |
| 48 | [H-BOT v5: zlatý holub, „Cena hned“, PDF kalkulace, NÁVRH smlouvy o dílo, porovnání nabídek](48-hbot-v5-cena-hned.md) | P1 | 01, 50, 52 (stejná dávka) | advokát (smlouva, podmínky), lhůta 60 dnů, 12 Kč/km za jednu cestu, doklad k měděnému prvku |
| 49 | [HOLUB 360 (`/holub-360/`) a technologické okno v plánovači (R17)](49-holub-360.md) | P1 | 21, 50, 48, 27 (měření; bez něj ruční plochy) | jedna cena vs. pásmo, slib „do 24 hodin“, podmínky slevy 10 %, export z Claude Design |
| 50 | [Cenové jádro, Standard HOLUB, péče SENTINEL a stránka `/standard-holub/`](50-cenove-jadro-standard.md) | P1 | 00 (05 a 08 ideálně dřív, ne nutně) | – |
| 51 | [Pas domu – trezor](51-pas-domu-trezor.md) | P2 | 14, 50 | přístupové kódy k pasům, TEST pas |
| 52 | [Rada AI přes OpenRouter, pseudonymizace, `/api/konkurence`](52-rada-ai-openrouter.md) | P1 | 01, 22 | `HSPG_KLIC_OPENROUTER` v Netlify, kredit OpenRouter |
| 53 | [Spolupráce agentů: Claude Code + GitHub Copilot (AGENTS.md, issue, PR, CI), rada AI z terminálu](53-spoluprace-agentu.md) | P1 | 00, 19, 52 | zapnout Copilot coding agent, GitHub Pro (ochrana větve) |
| 54 | [Štít obsahu: výhrada vytěžování dat (TDM), zákaz rámování, ochrana médií, IPTC, postup proti kopiím](54-stit-obsahu.md) | P1 | 00, 08, 15 | ochranné známky (podklady v DOKUMENTY-K-ODESLANI), seznam fotek k podpisu |
| 55 | [Opravy živého webu podle auditu 22. 10.: embargo slov, 5 kroků, SENTINEL BASE/PLUS/PRESTIGE, „Cena ihned“ s celým postupem](55-opravy-ziveho-webu.md) | P0 | 50 | – |
| 56 | [Pulzující plaketa a rozcestník celého webu, zvuk a haptika s vypínačem, hejno 4 holubů při zaměření](56-puls-rozcestnik-zazitek.md) | P1 | 48, 49, 15 | – |
| 57 | [Komponenty Apex z Uiverse (MIT): tlačítka, přepínač, fajfka, srdce, nit, karta, nápověda, segment, radio, pole, puls](57-apex-prvky-uiverse.md) | P2 | 08, 56 | – |
| 58 | [Jedna cesta zákazníka, stránka HOLUB Partner, obrazovka „Dnes“ v panelu majitele](58-cesta-zakaznika-partner-dnes.md) | P3 | 55, 48, 49, 21, 51, 25 | lhůty odpovědí, technický list H-STONE, výběr textů |
| 59 | [HSPG AI Gateway – vzdálený MCP server `/api/mcp` (Perplexity, You.com, Grok, ChatGPT … pro Claude majitele)](59-mcp-brana.md) | P1 | 01, 22, 52 | `HSPG_KLIC_OPENROUTER`, volitelně `HSPG_KLIC_YOUCOM` a `HSPG_MCP_TOKEN`; přidání konektoru v claude.ai (C15) |
