---
name: Úkol pro Copilota
about: Malý, jasně ohraničený úkol (texty, přístupnost, testy, CSS, dokumentace)
labels: copilot
---

## Cíl
<!-- Jedna věta: co má být po úkolu jinak. -->

## Soubory
<!-- Které soubory smí Copilot měnit. Nic jiného. -->

## Akceptace
- [ ] `npm test` a `node scripts/build-hbot.mjs --kontrola` prošly
- [ ] `npm run test:e2e` prošel (mění-li se stránky nebo `assets/`)
- [ ] Snímky 1440 × 900 a 390 × 844 v popisu PR (mění-li se vzhled)
- [ ] Žádné nové tvrzení, číslo ani cena mimo data (`content/*.json`)

## Zakázáno (AGENTS.md)
Klíče a tajemství · nasazení · `netlify.toml`, hlavičky, CSP · ceny a platby · formuláře s osobními údaji · AI · právní texty.
