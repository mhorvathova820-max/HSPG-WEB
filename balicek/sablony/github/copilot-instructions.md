# Pokyny pro GitHub Copilot – web hspg.cz

- Nejdřív si přečti `AGENTS.md` v kořeni repozitáře. Jeho pravidla mají přednost před zadáním v issue.
- Piš česky (texty webu, commity, popis PR). Typografie: nezlomitelná mezera po jednopísmenných předložkách a spojkách
  (v, k, s, z, a, i, o, u) a mezi číslem a jednotkou (`10&nbsp;let`, `499&nbsp;Kč`).
- Pracuj jen na větvi z issue, vždy přes pull request do `main`. Nenasazuj, neměň `netlify.toml`, hlavičky, CSP, ceny,
  formuláře s osobními údaji, AI ani právní texty – takové issue vrať s komentářem „patří Claude Code“.
- Nikdy nevkládej hesla, tokeny ani klíče; nevymýšlej fakta, čísla, recenze ani certifikace.
- Ceny jen přes `assets/hspg-cena.js` z `content/ceny.json`; výsledek kalkulace je „orientační cena“, nikdy „nabídka“.
- Před PR spusť `npm test`, `npm run test:e2e` (mění-li se stránky nebo `assets/`) a `node scripts/build-hbot.mjs --kontrola`.
  Do popisu PR dej výstup testů a snímky 1440 × 900 a 390 × 844.
- Vzhled: tokeny `apex-*` (`assets/apex-tokens.css`), třídy s předponou podle stránky (`hb-`, `hn-`, `h3a-`, `sh-`, `pdt-`),
  žádné CDN ani externí písma, WCAG 2.1 AA, prefers-reduced-motion.
