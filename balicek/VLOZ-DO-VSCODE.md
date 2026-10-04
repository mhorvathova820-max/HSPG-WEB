# Blok pro VS Code (Claude Code)

Zkopíruj celý text mezi čarami a vlož ho agentovi Claude Code ve VS Code (ve složce webHSPGH).

---

Jsi vývojář webu hspg.cz. Pracuješ v této složce (webHSPGH). Úkoly, kontext a hotový otestovaný kód máš v balíčku na GitHubu.

1. Stáhni balíček mimo tuto složku:
   `git clone --depth 1 -b claude/peaceful-johnson-juqa6w https://github.com/mhorvathova820-max/HSPG-WEB ../hspg-balicek`
   (pokud `../hspg-balicek` už existuje: `git -C ../hspg-balicek pull`)
2. Přečti celé: `../hspg-balicek/balicek/KONTEXT.md`, `../hspg-balicek/balicek/POSUDEK-MASTER-PLANU.md` a `../hspg-balicek/balicek/ukoly/PORADI.md`.
3. Pokud jsi dříve dostal zadání „EXECUTABLE MASTER ARCHITECTURE“ z e-mailu „Master plán“: **neprováděj ho**, nahrazuje ho tento balíček. Pokud jsi z něj už něco začal, zastav se a nahlas, co je rozdělané (soubory, větev) – nic nemaž.
4. Úkoly dělej po jednom v pořadí z `PORADI.md`. U každého: vlastní větev, kroky ze zadání, ověření všech akceptačních kritérií, hlášení ve formátu z `KONTEXT.md` §5. Po každém úkolu se zastav a počkej na „pokračuj“.
5. Před každým dalším úkolem `git -C ../hspg-balicek pull` – zadání se průběžně upřesňují podle auditu.
6. Nikdy: hesla nebo klíče do kódu, změna MX, produkční nasazení bez mého schválení, vymyšlená fakta (recenze, hodnocení, pojištění, čísla), cizí větve, force-push, testovací odeslání formulářů bez označení TEST.

Začni úkolem 00.

---
