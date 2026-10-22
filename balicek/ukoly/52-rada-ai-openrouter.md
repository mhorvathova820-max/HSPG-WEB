# Úkol 52: Rada AI přes OpenRouter, pseudonymizace a kontrola cizí nabídky (`/api/konkurence`)
> Priorita P1 · Závisí na: 01, 22 (brána AI, vlastní klíče) · Čeká na majitele: `HSPG_KLIC_OPENROUTER` v Netlify (zadá **sám**), kredit na OpenRouter, volitelně `HSPG_PATENTY_WEB=1` (rešerše patentů s vyhledáváním).

## Co to dělá
- **Role modelů (R19):** `claude`/`opus`, `gpt`/`astra`, `argon` (patenty – jen majitel), `grok`, `muse` (jen majitel, **bez ZDR, nikdy osobní údaje**). Výchozí jsou připnuté modely se ZDR; aliasy „~latest“ jen jako volitelné přepsání s varováním. Podrobně `balicek/AGENTI-OPENROUTER.md`.
- **Pseudonymizace** před každým externím modelem (`netlify/lib/ai/pseudonymizace.mjs` – jediná implementace); zpětné doplnění jen v odpovědi panelu majitele, mapa značek jen v paměti požadavku.
- **Režim rady v `/api/ai`** (panel majitele): jeden dotaz → více rolí paralelně → shrnutí předsedou (Claude Opus).
- **`/api/konkurence`:** neutrální kontrola textu cizí nabídky proti bodům Standardu HOLUB (používá H-BOT, úkol 48); volitelně krátké shrnutí AI jen z pseudonymizovaného přehledu. Limity 10/h na IP, 300/den, tělo ≤ 160 kB; text se neukládá ani neloguje; bez úložiště limitů se kontrola neprovede.
- **`scripts/rada.mjs`:** rada z terminálu pro Claude Code ve VS Code. **Zůstává v balíčku** a spouští se z `../hspg-balicek` (jednou `npm ci --prefix ../hspg-balicek`). Klíč jen z proměnné prostředí `HSPG_KLIC_OPENROUTER` nebo `OPENROUTER_API_KEY` v terminálu majitele; výstup zůstává pseudonymizovaný (`balicek/rada/`, git ho ignoruje); strop 30 Kč na spuštění. GitHub Copilot ani CI klíč nedostanou (úkol 19, 53).

## Soubory z balíčku
`netlify/lib/ai/poskytovatele.mjs`, `pseudonymizace.mjs`, `rada.mjs`; `netlify/functions/ai.mjs`, `ai-stav.mjs`, `asistent.mjs`, `konkurence.mjs`; `netlify/lib/konkurence/kontrola.mjs`. Testy: unit `pseudonymizace`, `rada`, `konkurence`, `majitel-a-ai`. (`scripts/rada.mjs` se do webu nekopíruje.)

## Postup
1. Větev `ukol-52-rada-ai`. Přenes; `netlify.toml` → nová funkce `konkurence` na `/api/konkurence` se stejnými hlavičkami jako `/api/asistent`.
2. Majitel zadá `HSPG_KLIC_OPENROUTER` v Netlify (Project configuration → Environment variables, scope Functions). Klíč nikdy nevidíš, nežádáš a nevypisuješ.
3. Rozpočet: rada i konkurence jdou přes stávající rozpočet AI (`lib/ai/limity.mjs`) a nouzový vypínač v panelu – ověř, že vypnutí veřejné AI vypne i shrnutí v `/api/konkurence` (přehled bodů funguje dál bez AI).
4. Zásady (úkol 09): OpenRouter jako zpracovatel pro panel majitele a kontrolu nabídky (jen pseudonymizovaný text, ZDR); Muse jen bez osobních údajů.
5. Terminál (jednou, majitel sám ve VS Code): `export OPENROUTER_API_KEY="…"` – nikdy do chatu ani do souboru v repozitáři. Pak např. `node ../hspg-balicek/balicek/web/scripts/rada.mjs "otázka" --role opus,astra,argon,grok --md`.

## Akceptace
- [ ] Unit testy zelené; testy nevolají žádnou skutečnou AI.
- [ ] Náhled: `/api/ai-stav` ukáže role a ZDR; dotaz pro Muse s e-mailem, telefonem, jménem nebo adresou (i bez oslovení, např. „Martinu Kalousovi“, „Tř. Míru 7“) → 422; rada z panelu odpoví všemi dostupnými rolemi; log neobsahuje text dotazu.
- [ ] `/api/konkurence`: GET vrátí limity, POST s textem vrátí přehled; 11. požadavek z jedné IP za hodinu → 429; GET hlásí `ai: false`, když je veřejná AI v panelu vypnutá.
- [ ] `git grep -nE "sk-or-v1-[A-Za-z0-9]{16,}"` nic nenajde.
- [ ] Hlášení a stop.
