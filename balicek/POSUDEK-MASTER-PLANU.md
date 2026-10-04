# Posudek e-mailu „ABSOLUTNÍ MASTER PLÁN HOLDINGU HSPG“ (4. 10. 2026)

E-mail obsahuje blok „EXECUTABLE MASTER ARCHITECTURE“ určený pro Claude Code. **Nevkládej ho
agentovi tak, jak je.** Dobré části jsou převzaté do úkolů tohoto balíčku; zbytek je klamavý,
rizikový nebo technicky chybný.

## Okamžitě
- V e-mailu je **otevřeně napsané heslo** k internímu panelu. Ber ho jako prozrazené: nepoužívat, nikam neukládat; pokud ho majitel používá i jinde, změnit tam. Heslo panelu zadá majitel sám jen v Netlify (`HSPG_PANEL_HESLO`, 16+ znaků).
- **MX na Wedos neměnit.** Pošta hspg.cz běží na Seznam Email Profi a funguje (ověřeno); změna MX by ji rozbila.
- **Klíče Gemini, xAI ani OpenWeatherMap nezakládat** – AI běží přes Netlify AI Gateway, počasí přes open-meteo.com (ověřit ve funkci `pocasi`).
- Google Calendar ID z e-mailu nedávat do kódu; kalendář viz níže.

## Co z plánu převzít (je v úkolech)
| Požadavek z e-mailu | Kde v balíčku | Úprava |
|---|---|---|
| Plovoucí tlačítko „H-SPG CORE: Budoucnost ve Vašich rukách“, grafit/zlatá/tyrkysová | `balicek/web/assets/hbot*.js` (úkol 01) | vlevo dole – vpravo dole je `#cta-stack`; „laserová nit“ jen při najetí a jen bez `prefers-reduced-motion` |
| Spolupráce více AI viditelná pro zákazníka | úkol 01 | zákazník živě vidí, která AI píše a která ověřuje; 2 AI na dotaz (rychlost, kredity), majitel má všechny AI |
| Záloha bez AI, web nikdy nespadne | úkol 01 | FAQ, zavolání zpět, poptávka; časový limit; vypnutí AI po chybách |
| GDPR souhlas pod chatem | úkol 01 | souhlas je u formuláře zavolání zpět; do AI se telefony a e-maily neposílají (maskují se) |
| 5 firemních schránek + záloha na Seznam | úkoly 02, 03 | `content/firma.json` → `submission-created` |
| Jediný zdroj cen | úkoly 01, 05 | **existující** `content/ceny.json` (generuje `assets/ceny.js`) – žádný paralelní `pricing.json`. Příklady z e-mailu (86 390 Kč, 10 710 Kč, 250 040 Kč) z něj vychází správně |
| Krajské huby místo 234 okresních stránek | úkol 11 | jen s 301 přesměrováním, skutečnými daty a pravdivým „cold start“ textem |
| Registr čistých domů / zadání zakázky do 2 minut | úkol 14 | kód pasu domu nesmí být jediným klíčem k údajům (náhodný token), souhlas majitele domu s fotkami |
| Žádost o recenzi všem zákazníkům bez filtrování a bez odměn | úkol 14 | e-mailem/SMS jen se souhlasem; odkaz z existujícího Google profilu |
| Tisková šablona pro schůze SVJ | úkol 14 | bez pojistné částky, dokud ji majitel nedoloží |

## Co NEDĚLAT a proč
| Z e-mailu | Proč ne |
|---|---|
| JSON-LD hodnocení 4,9/5 („zlaté hvězdičky“) | žádné skutečné recenze → klamavá praktika (ČOI) a porušení zásad Google; hvězdičky jen ze skutečných recenzí |
| „Pojištění odpovědnosti do 10 000 000 Kč“ | nedoloženo (čeká na doklad od majitele) |
| SMS „specialisté právě spustili satelitní analýzu“ | nepravdivé (zaměření dělá člověk z map); navíc SMS brána neexistuje |
| „Ušetří až 80 % investic“, „60 FPS, < 0,4 s“, „CLS přesně 0“ | nedoložená čísla; cíle výkonu jsou v úkolu 07 měřitelně (mobil ≥ 90, CLS < 0,1) |
| Grok jako „vizionář v Elon Musk stylu“ fascinující HYDRA-5 | HYDRA-5 není potvrzená jako hotová; žádné hype texty |
| Gemini sleduje ceny konkurence (HousePro, Domerino, …) | automatické stahování cizích webů a srovnávací reklama = právní riziko a nespolehlivá data |
| „Agresivně tahat telefony“, telefon z chatu „izolovat v pozadí“ a poslat jako poptávku | zpracování osobních údajů bez souhlasu (GDPR); poptávka jen přes formulář se souhlasem |
| Výpočet doby „polymerace“ na minuty, blikající banner „ideální klima“ | bez technického listu H-STONE nejde doložit; počasí jen jako informace s odkazem na zdroj |
| Kalendář s „max. 2 rezervace na okres a den“ | bez skutečného rozpisu techniků by sliboval nepravdu; nanejvýš „preferovaný termín“, který tým potvrdí |
| „5 placených AI agentů“, „Claude AI Pro“ jako mozek webu | předplatné Claude Pro se na web nevztahuje; web používá API přes Netlify a musí fungovat i bez AI |
| Hardcoded heslo, Google Calendar ID, cesta `/pages/api/…`, `src/data/pricing.json` | tajemství nepatří do kódu; struktura webu je jiná (statický web + `netlify/functions`, `content/*.json`) |
| Smazat 234 okresních stránek bez přesměrování | ztráta indexace a odkazů; jen s 301 na krajské huby (úkol 11) |
