# AGENTS.md – HSPG-WEB (balíček pro web hspg.cz)

Pravidla pro všechny AI agenty (Claude Code, GitHub Copilot a další) v tomto repozitáři. Platí totéž co v `CLAUDE.md`:

- Obsah je v `balicek/` – začni `balicek/README.md`; fakta, rozhodnutí majitele a nepřekročitelná pravidla jsou v `balicek/KONTEXT.md`.
- **Repozitář je veřejný:** žádná hesla, tokeny, klíče ani podrobnosti o slabinách webu – v kódu, commitech, issue, PR ani chatu.
- Každý agent pracuje jen na své větvi, do cizích větví nezasahuje; žádný force-push.
- Nic se odtud nenasazuje. Kód z `balicek/web/` přenáší do webu agent ve VS Code podle `balicek/ukoly/`.
- Před commitem: `npm test`, `npm run test:e2e` (mění-li se `balicek/web/assets` nebo stránky), `node balicek/web/scripts/build-hbot.mjs --kontrola`.
- Žádná vymyšlená fakta; ceny jen z `balicek/web/content/ceny.json` přes `assets/hspg-cena.js`; výsledek kalkulace je „orientační cena“, nikdy „nabídka“.
- Šablony pro spolupráci Claude Code + GitHub Copilot ve webu: `balicek/sablony/github/` (úkol 53).
