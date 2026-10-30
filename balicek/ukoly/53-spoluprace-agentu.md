# Úkol 53: Spolupráce agentů – Claude Code + GitHub Copilot (AGENTS.md, issue, PR, CI) a rada AI z terminálu
> Priorita P1 · Závisí na: 00 (repozitář webHSPGH na GitHubu), 19 (workflow `kontroly.yml`, šablona PR, ochrana větve), 52 (rada AI) · Čeká na majitele: zapnout GitHub Copilot coding agent pro repozitář webHSPGH (github.com → Settings → Copilot → Coding agent; podle tarifu Copilot), případně GitHub Pro kvůli ochraně větve `main` (úkol 19).

## Co to dělá
- **Role (R19):** Claude Code ve VS Code = hlavní vývojář a koordinátor (úkoly z balíčku, kontrola PR, hlášení majiteli). GitHub Copilot coding agent = menší, jasně ohraničené úkoly přes issue → vlastní větev → **pull request do `main`**. Copilot nikdy nenasazuje a nedostává žádné klíče ani tajemství. Majitel schvaluje sloučení a produkci.
- **Společná pravidla** v kořeni webu: `AGENTS.md` (čte Copilot, Claude Code i další agenti) a `.github/copilot-instructions.md`.
- **Prostředí Copilota:** `.github/workflows/copilot-setup-steps.yml` (Node 22, `npm ci`, Chromium pro e2e) – jen příprava, žádné tajemství, žádné nasazení.
- **Issue pro Copilota:** šablona `.github/ISSUE_TEMPLATE/ukol-copilot.md` (cíl, soubory, akceptace, zakázané věci).
- **CI z úkolu 19** navíc spouští `node scripts/build-hbot.mjs --kontrola` a kontrolu embarga v textech pro zákazníky.
- **Rada AI z terminálu** (úkol 52) – jen Claude Code u majitele, klíč v proměnné prostředí terminálu.

## Šablony v balíčku (`balicek/sablony/github/` → cíl ve webHSPGH)
| Šablona | Cíl |
|---|---|
| `AGENTS.md` | `AGENTS.md` (kořen) |
| `copilot-instructions.md` | `.github/copilot-instructions.md` |
| `workflows/copilot-setup-steps.yml` | `.github/workflows/copilot-setup-steps.yml` |
| `ISSUE_TEMPLATE/ukol-copilot.md` | `.github/ISSUE_TEMPLATE/ukol-copilot.md` |
| `kontroly-doplnek.yml` | kroky vložit do jobu `staticke` v `.github/workflows/kontroly.yml` (úkol 19) |

## Postup
1. Větev `ukol-53-agenti`. Zkopíruj šablony na cílová místa; v `copilot-setup-steps.yml` a v doplňku nahraď `@vX` u akcí připnutým SHA stejně jako v úkolu 19 (`tests/ci/workflow.test.mjs` musí projít i pro nový soubor).
2. `AGENTS.md`: doplň skutečné příkazy webu (`npm test`, e2e, build) podle `package.json` webHSPGH; pravidla neměň, jen odkazuj na `CLAUDE.md` a balíček.
3. Štítek `copilot` v repozitáři (`gh label create copilot --description "Úkol pro GitHub Copilot" --color D4AF37`).
4. Postup spolupráce zapiš do `docs/agenti.md`:
   - Claude Code založí issue ze šablony (`gh issue create --template ukol-copilot.md --label copilot`) jen pro úkoly typu: texty a překlepy, přístupnost, testy, malé opravy CSS, dokumentace. **Nikdy:** platby, ceny, formuláře s osobními údaji, AI, hlavičky a CSP, `netlify.toml`, nasazení.
   - Majitel (nebo Claude Code s jeho souhlasem) přiřadí issue Copilotovi.
   - Claude Code PR zkontroluje: `gh pr checkout <č>`, `npm test`, e2e, `build-hbot --kontrola`, pravidla KONTEXT §4 → komentář v PR s výsledkem („doporučuji sloučit“ / co opravit). Slučuje jen po „pokračuj“ od majitele.
5. Rada AI: ve VS Code terminálu majitel jednou `export OPENROUTER_API_KEY="…"` (nikdy do chatu); Claude Code pak `node ../hspg-balicek/balicek/web/scripts/rada.mjs "otázka" --role opus,astra,argon,grok --md`, výsledek shrne v hlášení. Muse (`--role muse`) jen bez osobních údajů.

## Akceptace
- [ ] `AGENTS.md`, `.github/copilot-instructions.md`, `copilot-setup-steps.yml`, šablona issue a `docs/agenti.md` existují; `node --test tests/ci/workflow.test.mjs` prošel i s novým workflow.
- [ ] `git grep -nE "secrets\.|NETLIFY_AUTH_TOKEN|OPENROUTER|_API_KEY|nasadit\.mjs" -- .github/` → nic.
- [ ] Zkušební issue (např. překlep) → PR od Copilota → kontrola Claude Code s výsledkem v komentáři (odkaz do hlášení); nic se nesloučilo bez majitele.
- [ ] Hlášení a stop.
