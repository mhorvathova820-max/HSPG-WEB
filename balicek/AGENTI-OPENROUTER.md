# AI agenti přes OpenRouter – rada AI, pseudonymizace, spolupráce agentů

Rozhodnutí majitele 22. 10. 2026: AI agenti spolupracují přes OpenRouter (Claude Opus, GPT Astra, Gemini Argon na patenty, Grok, Muse Wonder), data se před odesláním modelům pseudonymizují (GDPR) a Claude Code ve VS Code spolupracuje s agentem GitHubu. Platí dál R8 (zákazníci levnější modely), R10 (přes OpenRouter jen modely s nulovým uchováváním dat – ZDR) a R13 (vlastní klíče, při výpadku převezme Claude).

Kód: `web/netlify/lib/ai/poskytovatele.mjs` (role a směrování), `lib/ai/pseudonymizace.mjs`, `lib/ai/rada.mjs`, `functions/ai.mjs` (režim rady), `scripts/rada.mjs` (terminál), `functions/konkurence.mjs` + `lib/konkurence/kontrola.mjs`. Testy: `testy/unit/pseudonymizace.test.mjs`, `rada.test.mjs`, `konkurence.test.mjs` (bez skutečných volání AI).

## Role → model → ZDR → účel → kdo smí

Modely ověřené 22. 10. 2026 v `openrouter.ai/api/v1/models` a `/api/v1/endpoints/zdr`. Výchozí jsou **připnuté** modely se ZDR koncovým bodem.

| Role (web / terminál) | Model | ZDR | Účel | Kdo smí |
|---|---|---|---|---|
| `claude` / `opus` | web: `claude-opus-5-5` (Anthropic – Gateway, nebo `HSPG_KLIC_ANTHROPIC`); terminál: `anthropic/claude-opus-5.5` | ano (Amazon Bedrock) | předseda rady, texty, kód | majitel (AI centrum, rada), Claude Code |
| `gpt` / `astra` | web: `gpt-6-astra` s `HSPG_KLIC_OPENAI`, jinak `gpt-5` přes Gateway; terminál: `openai/gpt-6-astra` | ano (Azure) | druhý názor, oponentura | majitel, Claude Code |
| `argon` | `google/gemini-4-argon` | ano (Google) | rešerše patentů a užitných vzorů; hledání na webu jen s `HSPG_PATENTY_WEB=1` | **jen majitel** (H-BOT ho nepoužije), Claude Code |
| `grok` | `x-ai/grok-4.7` (s `HSPG_KLIC_OPENROUTER` i v terminálu), `grok-4.7` s `XAI_API_KEY`, přes Gateway beze změny `x-ai/grok-4.5` | ano (xAI) | aktuální dění, jiný úhel pohledu | majitel, Claude Code |
| `muse` | `meta/muse-wonder` | **NE – bez ZDR** | jen **neosobní** podklady (nápady, obecné rešerše) | **jen majitel**, jen s `HSPG_KLIC_OPENROUTER` (Gateway modely bez ZDR nepustí) |

- Aliasy „nejnovější verze“ (`~anthropic/claude-opus-latest`, `~openai/gpt-astra-latest`, `~google/gemini-pro-latest`, `~x-ai/grok-latest`) v seznamu ZDR **nejsou** a jejich cíl se mění bez ohlášení. Jdou nastavit jen jako volitelné přepsání proměnnou (`ARGON_MODEL`, `XAI_MODEL`, v terminálu `RADA_<ROLE>_MODEL`) – panel i terminál pak ukážou varování. Dotaz i tak nese `provider.zdr`, takže OpenRouter ho pošle jen na ZDR koncový bod vyřešeného modelu, nebo selže.
- Ostatní role webu (`gemini`, `mistral`, `deepseek`, `llama`, `perplexity`) zůstávají; s `HSPG_KLIC_OPENROUTER` jdou role přes OpenRouter (`mistral`, `deepseek`, `llama`, `perplexity`, `grok` bez `XAI_API_KEY`) také přímo se směrováním ZDR.
- Zákaznický H-BOT dál používá jen levnější modely (`ASISTENT_PORADI`); role `argon` a `muse` ignoruje, i kdyby v pořadí byly.

## Co odchází k modelům (GDPR)

1. **Pseudonymizace** (`pseudonymizace.mjs`, jediná implementace pro celý web): e-maily, telefony CZ/SK i mezinárodní, rodná čísla, čísla účtů a IBAN, čísla platebních karet, data narození, adresy (ulice + číslo, PSČ), SPZ, kódy pasu domu `HS-RRRR-ČČČČ`, přístupové kódy a hesla, jména po oslovení nebo titulu (pan, paní, Ing., Mgr. …) → značky `[EMAIL_1]`, `[TELEFON_1]`… Stejný údaj = stejná značka. Ceny („1 490 Kč“), plochy („120 m²“), lhůty a běžná data zůstávají. Jméno **bez** oslovení se nepozná – v zadání pište „pan Novák“, ne jen „Novák“.
2. **Zpětné doplnění** jen v odpovědi panelu majitele (`/api/ai`, i v proudu po kouscích). Mapa značek žije jen v paměti jednoho požadavku, do logu nejde nic z obsahu (jen role, model, stav a čas). Terminál ani soubory rady se zpět nedoplňují. Pozor: AI nezná skloňování jména za značkou – oslovení po doplnění zkontrolujte.
3. **Muse Wonder** dotaz s osobními údaji nedostane vůbec (`/api/ai` vrátí 422, v radě je vynechána).
4. **Směrování v požadavku** – při přímém volání `openrouter.ai` (vlastní klíč majitele nebo terminál): role se ZDR posílají `provider: { zdr: true, data_collection: "deny" }`, Muse `provider: { data_collection: "deny" }`, Argon s `HSPG_PATENTY_WEB=1` navíc `plugins: [{ id: "web", max_results: 5 }]` (pseudonymizovaný dotaz pak jde i vyhledávači). Přes Netlify AI Gateway se tělo požadavku nemění – Gateway sama pustí přes OpenRouter jen poskytovatele se ZDR.
5. Zákaznické texty (H-BOT, kontrola nabídky) dostávají obecné štítky (`[telefon]`, `[e-mail]` …) bez mapy.

## Proměnné prostředí

Klíče **jen** v Netlify → Site configuration → Environment variables (nebo v proměnné prostředí terminálu). Nikdy do repozitáře, commitu, chatu ani do příkazu.

| Proměnná | Kde | Význam |
|---|---|---|
| `HSPG_KLIC_OPENROUTER` | Netlify (+ terminál) | Vlastní klíč OpenRouter majitele. Role přes OpenRouter jdou přímo na openrouter.ai se směrováním ZDR, účtuje OpenRouter (ne kredity Netlify). Zapíná i `muse`. |
| `OPENROUTER_API_KEY`, `OPENROUTER_BASE_URL` | vkládá Netlify AI Gateway sama | Bez vlastního klíče jedou role přes Gateway jako dosud (kredity Netlify). V terminálu jde `OPENROUTER_API_KEY` použít místo `HSPG_KLIC_OPENROUTER`. |
| `HSPG_PATENTY_WEB=1` | Netlify / terminál | Argon smí hledat na webu (jen s vlastním klíčem; účtuje se za hledání). |
| `ARGON_MODEL`, `MUSE_MODEL`, `XAI_MODEL` | Netlify (nebo přepínač modelů v panelu – bez aliasů `~`) | Přepsání modelu role. |
| `RADA_OPUS_MODEL`, `RADA_ASTRA_MODEL`, `RADA_ARGON_MODEL`, `RADA_GROK_MODEL`, `RADA_MUSE_MODEL` | terminál | Přepsání modelu v `scripts/rada.mjs` (s varováním). |
| `HSPG_RADA_LIMIT_KC` | terminál | Strop odhadované útraty jednoho spuštění rady (výchozí 30 Kč). |
| `HSPG_RADA_LIMIT_MS`, `AI_RADA_LIMIT_MS` | terminál / Netlify | Časový limit jednoho volání v radě (výchozí 120 s v terminálu, 60 s na webu). |
| `CENA_ARGON_VSTUP`, `CENA_ARGON_VYSTUP`, `CENA_MUSE_*` | Netlify (volitelné) | Cena v USD za milion tokenů pro odhad rozpočtu (výchozí z ceníku OpenRouter, zaokrouhleno nahoru). |

## Kdo radu používá

### AI centrum (`/ai-centrum/`, jen majitel)
- Nové role se objeví samy přes `/api/ai-stav` (u každé role `cesta`: `vlastni-klic` / `openrouter-vlastni` / `gateway`, `zdr`, `jenMajitel`, `varovani`). Režim **Porada** s nimi funguje beze změny – každé volání `/api/ai` se na serveru pseudonymizuje a odpověď se doplní zpět.
- **Režim rady na serveru**: `POST /api/ai` s `{ rezim: "rada", role?: ["claude","gpt","argon","grok"], zpravy, pokyn?, maxTokenu? }` (nejvýš 6 členů). Odpověď je NDJSON: `start` → `clen` po každé AI → `predseda` (`shoda`, `rozdily`, `doporuceni`) → `hotovo` (`stat` s tokeny a Kč). Každé volání se počítá do limitu 120 / 10 min a rezervuje rozpočet zvlášť; s vlastním klíčem jde mimo kredity Netlify. Napojení tlačítka v AI centru (`assets/ai-centrum.js`, režim Porada) je úkol pro agenta ve VS Code.

### Claude Code ve VS Code (`scripts/rada.mjs`)
```bash
export HSPG_KLIC_OPENROUTER=…            # jen v terminálu, nikdy do souboru v repozitáři
node balicek/web/scripts/rada.mjs "Jak řešit X?" --role opus,astra,argon,grok
node balicek/web/scripts/rada.mjs "Rešerše: hydrofobní nano-impregnace střešních tašek" --role argon,opus --pokyn "patentový rešeršér" --md
node balicek/web/scripts/rada.mjs "Shrň tento návrh" --soubor balicek/ukoly/01-plovouci-asistent.md --json
```
- Výstup je pseudonymizovaný; `--json` pro agenty, `--md` uloží do `balicek/rada/` (složka sama sebe ignoruje přes `.gitignore` – výstupy rady do veřejného repozitáře nepatří).
- Klíč z argumentu (`--klic`), text podobný klíči a soubory typu `.env`/`*.pem` skript odmítne. Muse se volá jen na výslovné přání (`--role …,muse`) a jen bez osobních údajů.
- Cena se vypíše z `usage.cost`, které vrací OpenRouter; strop běhu hlídá stejná rezervace jako na webu (`limity.mjs`).

### GitHub Copilot (agent na GitHubu)
- Spolupráce přes Issues a pull requesty podle [`AGENTS.md`](../AGENTS.md) v kořeni repozitáře (připravuje hlavní agent): Claude Code ve VS Code spustí radu, pseudonymizovaný souhrn (`--json`/`--md`) vloží do Issue, Copilot připraví PR na vlastní větvi, Claude Code ho zkontroluje (`npm test`, `node balicek/web/scripts/build-hbot.mjs --kontrola`) a nasazení schvaluje majitel.
- Má-li Copilot radu spouštět sám: samostatný klíč OpenRouter s nízkým limitem kreditu jen jako tajemství prostředí `copilot` v nastavení repozitáře na GitHubu – nikdy v kódu.

## Co majitel platí

- **S `HSPG_KLIC_OPENROUTER`** platí kredit u OpenRouter (předplacený), kredity Netlify se nečerpají. Ceník OpenRouter 22. 10. 2026 (USD za milion tokenů vstup / výstup): Claude Opus 5.5 4 / 20, GPT-6 Astra 10 / 50 (nad 272 tis. tokenů vstupu 20 / 75), Gemini 4 Argon 2 / 10 (uvažování se počítá do výstupu; hledání na webu podle ceníku modelu), Grok 4.7 2 / 6, Muse Wonder 4 / 20. Jedna rada se 4 členy a předsedou vyjde orientačně na jednotky Kč (odhad, skutečnou cenu ukazuje terminál z `usage.cost` a účet OpenRouter).
- **Bez vlastního klíče** jde vše přes Netlify AI Gateway za **kredity Netlify** (1 USD = 180 kreditů) v měsíčním rozpočtu `AI_MESICNI_LIMIT_KC` (výchozí 25 Kč) – rezervace před každým voláním brání přečerpání (vyčerpané kredity by pozastavily celý web). Muse přes Gateway nejde.
- **Terminál** platí z klíče v proměnné prostředí (OpenRouter), strop jednoho spuštění 30 Kč (odhad).

## Kontrola nabídky konkurence (`/api/konkurence`)

Veřejné `POST { text, ai? }` – text nabídky vytažený v prohlížeči z PDF (nejvýš 30 000 znaků). Deterministický přehled 14 bodů Standardu HOLUB (5 kroků, typ a počet vrstev, záruka, fotodokumentace, pojištění, lešení, DPH, cena za m², záloha): `{ id, kriterium, standardHolub, vNabidce: "uvedeno"|"neuvedeno", citace ≤ 120 znaků }`, u chybějícího bodu neutrálně „v nabídce neuvedeno“. Nabídku ani zhotovitele nehodnotí (§ 2980 OZ). Sloupec „Standard HOLUB“ bere texty jen ze schválených `content/*.json` (pojištění netvrdí – není doložené; ceny jen s potvrzeným ceníkem). Text se neukládá ani neloguje; limit 10 kontrol / hodinu na otisk IP a 300 / den. AI shrnutí jen s `ai: true` a zapnutou zákaznickou AI – dostane jen řádky přehledu s pseudonymizovanými citacemi a platí se z rozpočtu zákaznické AI.

## Ověřeno v dokumentaci (22. 10. 2026)

- Provider routing – `provider.zdr` (boolean: jen ZDR koncové body), `provider.data_collection` (`"allow"` / `"deny"`): https://openrouter.ai/docs/guides/routing/provider-selection
- ZDR – požadavek se `zdr: true` jde jen na ZDR koncové body, seznam `https://openrouter.ai/api/v1/endpoints/zdr`, implicitní cache v paměti se za uchovávání nepovažuje: https://openrouter.ai/docs/guides/features/zdr
- Web search plugin – `plugins: [{ id: "web", max_results }]`, výchozí 5 výsledků, u Google nativní hledání: https://openrouter.ai/docs/guides/features/plugins/web-search
- Usage – `usage.cost` (v kreditech OpenRouter) přichází automaticky, `usage: { include: true }` je zastaralé: https://openrouter.ai/docs/cookbook/administration/usage-accounting a https://openrouter.ai/docs/api/api-reference/chat/create-a-chat-completion (`max_completion_tokens`, `provider`, `plugins`, `usage.cost`, `model` = skutečně použitý model)
- Aliasy `~…-latest` – vyřeší se na nejnovější model rodiny, v odpovědi je skutečný model: https://openrouter.ai/docs/guides/routing/routers/latest-resolution
- Gemini 4 – vždy uvažuje, `reasoning.effort` low/medium/high: https://openrouter.ai/docs/cookbook/evaluate-and-optimize/model-migrations/gemini-4
- Netlify AI Gateway pouští přes OpenRouter jen poskytovatele se ZDR: https://www.netlify.com/changelog/2026-08-06-ai-gateway-openrouter/

**Neověřeno** (dokumentace neříká): jakou chybu vrátí OpenRouter, když model nemá dostupný ZDR koncový bod; jak se alias `~…` chová spolu se `zdr: true`; zda Netlify AI Gateway předává pole `provider` a `plugins` (proto je přes Gateway neposíláme); zda nativní hledání na webu spadá pod ZDR poskytovatele.
