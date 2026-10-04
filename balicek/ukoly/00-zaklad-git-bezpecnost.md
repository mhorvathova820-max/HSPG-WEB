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
6. Nasazování a kredity – do `CLAUDE.md` i do hlášení:
   - průběžně `netlify dev` lokálně nebo `netlify deploy` (náhled, bez `--prod`); produkční `netlify deploy --prod` jen po schválení majitelem, ideálně 1× denně v dávce,
   - před produkčním nasazením zkontroluj zbývající kredity (Netlify → Team → Billing / Usage),
   - napojení Netlify na Git (automatické nasazení při každém pushi do `main`) **zatím nezapínat** – každé nasazení stojí 15 kreditů; rozhodne majitel po sloučení prvních úkolů.
7. Checklist pro majitele (vlož do hlášení, majitel provede sám):
   - [ ] Změnit heslo Wedos (klientské centrum) a zapnout dvoufázové ověření.
   - [ ] Změnit heslo Seznam (profiserv@seznam.cz i schránky @hspg.cz, pokud sdílely heslo) a zapnout dvoufázové ověření.
   - [ ] Zneplatnit token z 4. 10. (tam, kde byl vydán) a vydat nový jen do Netlify proměnných.
   - [ ] Heslo z e-mailu „Master plán“ považovat za prozrazené; pokud se používá jinde, změnit. Do Netlify zadat nové `HSPG_PANEL_HESLO` (16+ znaků, generátor hesel).
   - [ ] Netlify → Billing: upozornění na kredity 50 / 75 / 90 / 100 %; rozhodnout o auto-recharge nebo vyšším tarifu (bez toho hrozí pozastavení webu).
   - [ ] Rozhodnout, zda repozitář `HSPG-WEB` (balíček) přepnout na soukromý.

## Akceptační kritéria
- [ ] `git status` čistý, `git log --oneline -5` ukazuje commit se zálohou rozdělané práce (nebo potvrzení, že nebyla).
- [ ] `gitleaks detect` (nebo trufflehog) bez nálezů v pracovním stromu; nálezy v historii nahlášené bez hodnot.
- [ ] Vzdálený repozitář existuje, je **private**, `git push` všech větví proběhl.
- [ ] `CLAUDE.md` obsahuje pravidla pro dva agenty, nasazování a kredity.
- [ ] Hlášení obsahuje checklist pro majitele.

## Ověření
`git status`, `git branch -a`, `git remote -v`, `npx -y gitleaks detect --source . --no-banner`, náhled repozitáře na GitHubu (Settings → visibility: Private).

## Nepřekročitelná pravidla
`balicek/KONTEXT.md` §4. Žádné hodnoty tajemství v hlášení ani v commitech. Žádné přepisování historie bez souhlasu majitele.

## Hlášení po dokončení
Formát z `KONTEXT.md` §5 + checklist pro majitele + seznam větví a co obsahují.
