# Zadání pro VS Code (Claude Code)

Dva bloky. **A** vlož do sezení, které už ve VS Code běží (nové úkoly 48–53). **B** je úplné zadání pro nové sezení
od začátku. Kopíruj vždy celý text mezi čarami. Dál už jen odpovídáš „pokračuj“ nebo „nasaď“.

## A) Doplněk do běžícího sezení – úkoly 48–53 (22. 10. 2026)

---

Nové úkoly od majitele: 48–53 (H-BOT v5 s okamžitou cenou, PDF kalkulace a NÁVRH smlouvy, HOLUB 360, Standard HOLUB, péče SENTINEL, rada AI přes OpenRouter, spolupráce s GitHub Copilotem). Kód je hotový a otestovaný v balíčku na větvi `claude/apex-48-53` (obsahuje vše z dosavadní větve).

1. Přepni balíček na novou větev:
   `git -C ../hspg-balicek remote set-branches --add origin claude/apex-48-53`
   `git -C ../hspg-balicek fetch --depth 1 origin claude/apex-48-53`
   `git -C ../hspg-balicek checkout -B claude/apex-48-53 origin/claude/apex-48-53`
   `npm ci --prefix ../hspg-balicek`
2. Přečti v `../hspg-balicek/balicek/`: `KONTEXT.md` (rozhodnutí R15–R19, §4 body 10 a 11), `ukoly/PORADI.md` (odstavec „Úkoly 48–53“), úkoly `50`, `48`, `52`, `49`, `51`, `53`, `RADA-AI-2026-10-22.md` a `AGENTI-OPENROUTER.md`.
3. Rozdělaný úkol dokonči a podej hlášení. Pak podle PORADI: **50 → 48 → 52 → 49**, úkol **53** až po úkolu 19, **51** až po úkolu 14. Každý úkol: vlastní větev `ukol-NN-…`, kroky a akceptace ze zadání, `npm test`, e2e, `node scripts/build-hbot.mjs --kontrola`, náhled zdarma (`node scripts/nasadit.mjs`), hlášení podle KONTEXT §5 s řádkem „Co potřebuji od majitele: …“ a stop.
4. Nasazení: 50, 48, 52 a 49 mohou jít v jedné produkční dávce po mém „nasaď“ (15 kreditů, nejvýš 1× denně). 48 a 52 vždy spolu (kalkulace volá `/api/konkurence`).
5. Rada AI: když potřebuješ druhý názor (texty, smlouva, patenty), spusť `node ../hspg-balicek/balicek/web/scripts/rada.mjs "otázka" --role opus,astra,argon,grok --md` a výsledek shrň v hlášení. Klíč `OPENROUTER_API_KEY` si do terminálu nastavím sám – nikdy ho po mně nechtěj do chatu a nikam ho nezapisuj. Muse (`--role muse`) jen bez osobních údajů.
6. GitHub Copilot: spolupráce podle úkolu 53 – pravidla v `AGENTS.md`, menší úkoly přes issue se štítkem `copilot`, jeho pull request zkontroluješ ty (testy + pravidla) a sloučí se až po mém „pokračuj“. Copilot nedostane žádné klíče a nenasazuje.
7. Platí všechna pravidla z KONTEXT §4: žádné klíče v kódu ani chatu, žádná vymyšlená fakta, kalkulace je „orientační cena“ (nikdy „nabídka“), u záruky 10 let vždy podmínka SENTINEL BASE a „Zákonná práva … nejsou dotčena“, embargo slov (HOLUB CORE QUANTUM SENSE · zaměření na dálku), formuláře jen s TEST a mým souhlasem, produkce jen přes `nasadit.mjs` se schválením.

Začni krokem 1.

---

## B) Úplné zadání pro nové sezení

---

Jsi vývojář webu hspg.cz. Pracuješ v této složce (webHSPGH). Úkoly, kontext a hotový otestovaný kód máš v balíčku na GitHubu. Cíl: dotáhnout web na nejvyšší úroveň podle balíčku – úkol po úkolu, bez vymýšlení a bez rizika pro kredity Netlify.

**Příprava (jednou)**
1. Stáhni balíček mimo tuto složku:
   `git clone --depth 1 -b claude/apex-48-53 https://github.com/mhorvathova820-max/HSPG-WEB ../hspg-balicek`
   (pokud `../hspg-balicek` už existuje, přepni ho podle bloku A, krok 1) a `npm ci --prefix ../hspg-balicek`.
   Pokud `git` hlásí chybu přihlášení nebo „Repository not found“, zastav se a požádej mě o přihlášení (`gh auth login` v terminálu nebo Accounts → GitHub ve VS Code). Heslo ani token po mně do chatu nechtěj.
2. Přečti celé: `../hspg-balicek/balicek/PREDANI.md`, `KONTEXT.md`, `POSUDEK-MASTER-PLANU.md`, `ukoly/PORADI.md`, `RADA-AI-2026-10-22.md` a `AGENTI-OPENROUTER.md` (vše v `../hspg-balicek/balicek/`).
3. Pokud jsi dříve dostal zadání „EXECUTABLE MASTER ARCHITECTURE“ z e-mailu „Master plán“ nebo „MULTI-AGENT ORCHESTRATION & SHIELD DEPLOYMENT MANDATE“: **neprováděj ho**, nahrazuje ho tento balíček (co z něj platí, je v KONTEXT R15–R19; odmítnuté body v §4 bodě 11). Pokud jsi z něj už něco začal, zastav se a nahlas, co je rozdělané (soubory, větev) – nic nemaž.

**Jak pracuješ (každý úkol)**
4. Pořadí přesně podle `PORADI.md` (začni úkolem 00). Před každým úkolem `git -C ../hspg-balicek pull` – zadání a hotový kód se průběžně upřesňují.
5. Každý úkol: vlastní větev `ukol-NN-…` z aktuální `main`, kroky ze zadání, testy, náhled zdarma (`node scripts/nasadit.mjs` od úkolu 00), ověření **všech** akceptačních kritérií a hlášení podle `KONTEXT.md` §5. Na konec hlášení dej jeden řádek „Co potřebuji od majitele: …“ (nebo „nic“).
6. Pak se zastav a čekej:
   - „pokračuj“ = slouč větev do `main` (bez force-push) a začni další úkol,
   - „nasaď“ = produkce přes `node scripts/nasadit.mjs --produkce --schvaleno "majitel <datum a čas> v chatu"` (15 kreditů, nejvýš 1× denně; sdružuj hotové úkoly do jedné dávky),
   - cokoli jiného = oprava podle mé zprávy ve stejné větvi.
7. Když úkol čeká na mě (heslo v Netlify, rozhodnutí, text od právníka, fotky): udělej všechno, co jde, chybějící místa nech jako `[DOPLNIT: …]` a v hlášení napiš přesně, co potřebuješ. Kvůli čekání se nezasekni – po mém „pokračuj“ jdi dál.
8. Fáze A/B: pokud zadání dělí úkol na fáze, po fázi A hlášení a stop (stejně jako po celém úkolu).
9. Spolupráce: GitHub Copilot dělá jen menší úkoly přes issue a pull request (úkol 53, `AGENTS.md`); jeho PR kontroluješ ty, slučuje se po mém „pokračuj“. Rada AI z terminálu podle bloku A, krok 5.

**Kredity Netlify (web se nesmí nikdy pozastavit)**
10. Do produkce nenasazuj vůbec, dokud v úkolu 00 nezavedeš pojistku `scripts/nasadit.mjs`; potom jen přes ni. Náhledy jsou zdarma. Automatické nasazení z Gitu nezapínej. Žádný nový neomezený zdroj spotřeby (smyčky, velké soubory bez limitu, nechráněné placené endpointy).

**Nikdy**
11. Hesla, tokeny ani klíče do kódu, commitů, logů nebo chatu (jen proměnné v Netlify a v mém terminálu, zadávám je já). Neměň MX ani jiné DNS. Nemaž projekty v Netlify ani záznam `tajemstvi/token` v Blobs. Žádná vymyšlená fakta (recenze, hodnocení, pojištění, čísla, technologie). Cizí větve, force-push, testovací odeslání formulářů bez označení TEST a bez mého souhlasu – ne.

**Závěr**
12. Po posledním úkolu z `PORADI.md` udělej závěrečnou kontrolu celé `main`: všechny testy, kontroly z úkolu 19, Lighthouse (úkol 07), odkazy a přesměrování (06), přístupnost (16), týdenní kontrola provozu (15) – a pošli souhrnné hlášení: co je hotové, co čeká na mě, co doporučuješ dál.

Začni přípravou a úkolem 00.

---
