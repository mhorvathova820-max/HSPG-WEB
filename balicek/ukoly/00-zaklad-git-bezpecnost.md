# Úkol 00: Základ – Git jako jediný zdroj pravdy, prozrazená hesla, kredity Netlify, pravidla pro dva agenty
> Priorita P0 · Závisí na: nic · Čeká na majitele: změna hesel, výběr soukromého repozitáře · Rozsah: nastavení a kontrola, bez změn vzhledu webu

## Proč
- Zdroj webu existuje jen ve složce **webHSPGH** na jednom počítači; cloudové relace ji nevidí a rozdělaná práce (firemní e-maily, `/reklamace.html`, úpravy formulářů) není nikde zálohovaná. VS Code „cloud agent“ přepínal větve a mazal rozdělanou práci.
- Do chatu a e-mailu unikla hesla: Wedos, Seznam, token z 4. 10. a heslo interního panelu (v e-mailu „Master plán“).
- Produkce se nasazuje ručně; 32 produkčních nasazení spotřebovalo 480 z 1 000 kreditů Netlify. **Po vyčerpání kreditů Netlify pozastaví celý web** (zbývalo 426, auto-recharge vypnuté).

## Cíl
1. webHSPGH je v Gitu, veškerá rozdělaná práce je commitnutá a zálohovaná v **soukromém** vzdáleném repozitáři.
2. V repozitáři ani v historii nejsou hesla, tokeny ani klíče.
3. Platí pravidla pro dva agenty a dávkové nasazování; majitel má checklist rotace hesel a hlídání kreditů.

## Rozsah
ANO: Git, `.gitignore`, kontrola tajemství, záloha rozdělané práce, pravidla spolupráce, checklisty pro majitele.
NE: změny obsahu webu, produkční nasazení, mazání čehokoli z historie bez souhlasu majitele.

## Postup
1. `git status` ve webHSPGH. Pokud složka není repozitář: `git init -b main`. Zjisti všechny větve (`git branch -a`) a **neztrať** žádnou rozdělanou práci: necommitnuté změny ulož na větev `zaloha/2026-10-04` (commit „Záloha rozdělané práce před úkoly balíčku“).
2. `.gitignore`: `node_modules/`, `.netlify/`, `.env*`, `*.log`, `.DS_Store`, výstupy buildů, které se generují (pokud se generují při nasazení).
3. Kontrola tajemství v pracovním stromu i historii: `git grep -nIiE "(api[_-]?key|token|secret|heslo|password)\s*[:=]"` a `npx -y gitleaks detect --source . --no-banner` (nebo `trufflehog filesystem .`). Konkrétní heslo z e-mailu „Master plán“ hledej bez jeho vypisování do hlášení. Každý nález: odstranit ze souborů, nahradit proměnnou prostředí a uvést v hlášení (soubor, typ – **ne hodnotu**). Pokud je tajemství v historii, **nepřepisuj historii sám** – nahlas majiteli, rozhodne se po rotaci hesla.
4. Vzdálený repozitář: majitel vytvoří **soukromý** GitHub repozitář (doporučení: nový, např. `hspg-web-zdroj`; veřejný `HSPG-WEB` je jen balíček). `git remote add origin …`, `git push -u origin main` a všechny větve. Ověř, že je repozitář private.
5. Pravidla pro dva agenty – vytvoř/aktualizuj `CLAUDE.md` v kořeni webHSPGH (zachovej existující obsah) se sekcí:
   - každý agent jen ve své větvi `ukol-NN-…`; paralelní práce přes `git worktree add ../webHSPGH-ukol-NN ukol-NN-…`, nikdy přepnutí větve v pracovním stromu, kde pracuje jiný agent,
   - žádný `push --force`, `reset --hard`, `clean -fd` ani mazání větví bez souhlasu majitele,
   - do `main` jen sloučením ověřené větve; před sloučením `git fetch` a kontrola, že `main` nemá cizí nové commity,
   - pravidla z `balicek/KONTEXT.md` §4 (pravdivost, tajemství, kredity, formuláře).
   - Doporuč majiteli ve VS Code vypnout automatickou synchronizaci/přepínání větví u „cloud agenta“ (nastavení rozšíření), dokud běží úkoly.
6. Nasazování a kredity – **pojistka proti vyčerpání kreditů** (po vyčerpání Netlify pozastaví celý web):
   - zkopíruj `balicek/web/scripts/nasadit.mjs` do `scripts/nasadit.mjs`, přidej `.nasazeni-produkce.json` do repozitáře (prázdné pole `[]`) a do `package.json` skripty `"nahled": "node scripts/nasadit.mjs"` a `"produkce": "node scripts/nasadit.mjs --produkce"`,
   - propoj složku s projektem: `npx netlify link --id e4dff53f-791b-4c8c-946c-a23d06421774` (ověř `npx netlify status` → hspg.cz),
   - ověř pojistku: `node scripts/nasadit.mjs --produkce` bez `--schvaleno` musí skončit „PRODUKCE ZAMÍTNUTA“ (nic se nenasadí); `npm run nahled` vytvoří náhled zdarma,
   - do `CLAUDE.md`: nasazovat jen přes `npm run nahled` / `npm run produkce -- --schvaleno "…"`; přímé `netlify deploy --prod` je zakázané; žádné automatické nasazování při uložení,
   - napojení Netlify na Git (automatické produkční nasazení při každém pushi do `main`) **nezapínat**; pokud je už zapnuté, nahlas to majiteli (Netlify → Project configuration → Build & deploy → Stop builds / Lock publishing),
   - zjisti, kdo a jak dosud nasazoval 32× za měsíc (git log, historie Netlify Deploys, skripty s `deploy --prod`, cloud agent) a všechna taková místa převeď na pojistku nebo odstraň.
7. Checklist pro majitele (vlož do hlášení, majitel provede sám):
   - [ ] Změnit heslo Wedos (klientské centrum) a zapnout dvoufázové ověření.
   - [ ] Změnit heslo Seznam (profiserv@seznam.cz i schránky @hspg.cz, pokud sdílely heslo) a zapnout dvoufázové ověření.
   - [ ] Zneplatnit token z 4. 10. (tam, kde byl vydán) a vydat nový jen do Netlify proměnných.
   - [ ] Heslo z e-mailu „Master plán“ považovat za prozrazené; pokud se používá jinde, změnit. Do Netlify zadat nové `HSPG_PANEL_HESLO` (16+ znaků, generátor hesel).
   - [x] **Netlify → Usage & billing → auto-recharge: zapnuto majitelem 4. 10.** (500 kreditů za 5 USD).
   - [ ] Ověřit, že e-maily Netlify o spotřebě (50 / 75 / 100 %) chodí do schránky, kterou čtete (e-mail účtu vlastníka týmu Netlify).
   - [ ] Jednou týdně: Usage & billing → Account usage insights (graf spotřeby podle položek).
   - [ ] Rozhodnout, zda repozitář `HSPG-WEB` (balíček) přepnout na soukromý.

## Akceptační kritéria
- [ ] `git status` čistý, `git log --oneline -5` ukazuje commit se zálohou rozdělané práce (nebo potvrzení, že nebyla).
- [ ] `gitleaks detect` (nebo trufflehog) bez nálezů v pracovním stromu; nálezy v historii nahlášené bez hodnot.
- [ ] Vzdálený repozitář existuje, je **private**, `git push` všech větví proběhl.
- [ ] `CLAUDE.md` obsahuje pravidla pro dva agenty, nasazování a kredity.
- [ ] `node scripts/nasadit.mjs --produkce` bez schválení → „PRODUKCE ZAMÍTNUTA“; `npm run nahled` → adresa náhledu (0 kreditů).
- [ ] V repozitáři nezůstalo žádné jiné místo, které volá `netlify deploy --prod` (`git grep -n "deploy --prod"` jen v `scripts/nasadit.mjs`).
- [ ] Hlášení obsahuje checklist pro majitele.

## Ověření
`git status`, `git branch -a`, `git remote -v`, `npx -y gitleaks detect --source . --no-banner`, náhled repozitáře na GitHubu (Settings → visibility: Private).

## Nepřekročitelná pravidla
`balicek/KONTEXT.md` §4. Žádné hodnoty tajemství v hlášení ani v commitech. Žádné přepisování historie bez souhlasu majitele.

## Hlášení po dokončení
Formát z `KONTEXT.md` §5 + checklist pro majitele + seznam větví a co obsahují.
