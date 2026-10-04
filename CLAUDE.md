# HSPG-WEB – balíček pro web hspg.cz

- Obsah: `balicek/` (kód plovoucího asistenta a AI vrstvy, testy, zadání úkolů pro VS Code Claude Code). Začni `balicek/README.md`.
- Zdroj samotného webu (webHSPGH) v tomto repozitáři NENÍ; kód v `balicek/web/` se do něj přenáší podle `balicek/ukoly/01-plovouci-asistent.md`.
- Repozitář je veřejný: žádná hesla, tokeny, klíče ani podrobnosti o slabinách webu.

## Pravidla
- Fakta, rozhodnutí a nepřekročitelná pravidla: `balicek/KONTEXT.md` (pravdivost, tajemství, kredity Netlify, dva agenti).
- Každý agent pracuje jen na své větvi; žádný force-push, nepřepínat cizí větve.
- Před commitem: `npm test` (a `npm run test:e2e`, pokud se měnil kód v `balicek/web/assets`), `node balicek/web/scripts/build-hbot.mjs --kontrola`.
