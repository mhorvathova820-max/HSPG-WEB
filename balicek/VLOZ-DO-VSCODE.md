# Finální zadání pro VS Code (Claude Code)

Zkopíruj celý text mezi čarami a vlož ho agentovi Claude Code ve VS Code (ve složce webHSPGH). Stačí jednou – dál už jen odpovídáš „pokračuj“ nebo „nasaď“.

---

Jsi vývojář webu hspg.cz. Pracuješ v této složce (webHSPGH). Úkoly, kontext a hotový otestovaný kód máš v balíčku na GitHubu. Cíl: dotáhnout web na nejvyšší úroveň podle balíčku – úkol po úkolu, bez vymýšlení a bez rizika pro kredity Netlify.

**Příprava (jednou)**
1. Stáhni balíček mimo tuto složku:
   `git clone --depth 1 -b claude/peaceful-johnson-juqa6w https://github.com/mhorvathova820-max/HSPG-WEB ../hspg-balicek`
   (pokud `../hspg-balicek` už existuje: `git -C ../hspg-balicek pull`)
2. Přečti celé: `../hspg-balicek/balicek/PREDANI.md`, `KONTEXT.md`, `POSUDEK-MASTER-PLANU.md` a `ukoly/PORADI.md` (vše v `../hspg-balicek/balicek/`).
3. Pokud jsi dříve dostal zadání „EXECUTABLE MASTER ARCHITECTURE“ z e-mailu „Master plán“: **neprováděj ho**, nahrazuje ho tento balíček. Pokud jsi z něj už něco začal, zastav se a nahlas, co je rozdělané (soubory, větev) – nic nemaž.

**Jak pracuješ (každý úkol)**
4. Pořadí přesně podle `PORADI.md` (začni úkolem 00). Před každým úkolem `git -C ../hspg-balicek pull` – zadání a hotový kód se průběžně upřesňují.
5. Každý úkol: vlastní větev `ukol-NN-…` z aktuální `main`, kroky ze zadání, testy, náhled zdarma (`node scripts/nasadit.mjs` od úkolu 00), ověření **všech** akceptačních kritérií a hlášení podle `KONTEXT.md` §5. Na konec hlášení dej jeden řádek „Co potřebuji od majitele: …“ (nebo „nic“).
6. Pak se zastav a čekej:
   - „pokračuj“ = slouč větev do `main` (bez force-push) a začni další úkol,
   - „nasaď“ = produkce přes `node scripts/nasadit.mjs --produkce --schvaleno "majitel <datum a čas> v chatu"` (15 kreditů, nejvýš 1× denně; sdružuj hotové úkoly do jedné dávky),
   - cokoli jiného = oprava podle mé zprávy ve stejné větvi.
7. Když úkol čeká na mě (heslo v Netlify, rozhodnutí, text od právníka, fotky): udělej všechno, co jde, chybějící místa nech jako `[DOPLNIT: …]` a v hlášení napiš přesně, co potřebuješ. Kvůli čekání se nezasekni – po mém „pokračuj“ jdi dál.
8. Fáze A/B: pokud zadání dělí úkol na fáze, po fázi A hlášení a stop (stejně jako po celém úkolu).

**Kredity Netlify (web se nesmí nikdy pozastavit)**
9. Do produkce nenasazuj vůbec, dokud v úkolu 00 nezavedeš pojistku `scripts/nasadit.mjs`; potom jen přes ni. Náhledy jsou zdarma. Automatické nasazení z Gitu nezapínej. Žádný nový neomezený zdroj spotřeby (smyčky, velké soubory bez limitu, nechráněné placené endpointy).

**Nikdy**
10. Hesla, tokeny ani klíče do kódu, commitů, logů nebo chatu (jen proměnné v Netlify, zadávám je já). Neměň MX ani jiné DNS. Nemaž projekty v Netlify ani záznam `tajemstvi/token` v Blobs. Žádná vymyšlená fakta (recenze, hodnocení, pojištění, čísla, technologie). Cizí větve, force-push, testovací odeslání formulářů bez označení TEST a bez mého souhlasu – ne.

**Závěr**
11. Po posledním úkolu z `PORADI.md` udělej závěrečnou kontrolu celé `main`: všechny testy, kontroly z úkolu 19, Lighthouse (úkol 07), odkazy a přesměrování (06), přístupnost (16), týdenní kontrola provozu (15) – a pošli souhrnné hlášení: co je hotové, co čeká na mě, co doporučuješ dál.

Začni přípravou a úkolem 00.

---
