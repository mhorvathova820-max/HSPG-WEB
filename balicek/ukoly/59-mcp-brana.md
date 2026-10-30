# Úkol 59: HSPG AI Gateway – vzdálený MCP server `/api/mcp` (Perplexity, You.com, Grok, ChatGPT … pro Claude majitele)
> Priorita P1 · Závisí na: 01 (heslo panelu), 22 (brána AI, vlastní klíče), 52 (rada AI, pseudonymizace) · Čeká na majitele: `HSPG_KLIC_OPENROUTER` v Netlify (R19), volitelně `HSPG_KLIC_YOUCOM` a `HSPG_MCP_TOKEN`; přidání konektoru v claude.ai (dělá sám, viz krok 6).

Rozhodnutí majitele 30. 10. 2026 (R22): propojit Claude s Perplexity, You.com, Grokem a ChatGPT **jednou bránou na Netlify** – jeden klíč OpenRouter, žádné nové klíče xAI/OpenAI, stejný rozpočet a pseudonymizace jako panel majitele, jeden konektor pro všechny relace Clauda (claude.ai, Cowork, Chrome, Desktop, Claude Code, Managed Agents).

## Co to dělá
- **`/api/mcp`** = MCP server (Streamable HTTP, bezstavový, JSON-RPC 2.0). Nástroje: `ai_zeptat` (jedna role: gpt, grok, gemini, perplexity, mistral, deepseek, llama, argon, claude), `perplexity_hledat`, `youcom_hledat`, `rada_ai` (paralelně + předseda Claude), `ai_stav`. Muse Wonder (bez ZDR) přes bránu **není**.
- **Stejná cesta jako panel:** role a klíče z `poskytovatele.mjs` (vlastní klíč OpenRouter se ZDR → jinak Netlify AI Gateway), pseudonymizace před každým modelem a doplnění zpět v odpovědi, rozpočet `AI_MESICNI_LIMIT_KC` s rezervací, limit 120 volání / 10 min společný s panelem. Logy jen nástroj, role, stav, čas.
- **Přihlášení:** `Authorization: Bearer …` – token panelu (`/api/majitel`), přístupový token OAuth brány, nebo pevný `HSPG_MCP_TOKEN` (≥ 32 znaků). Bez tokenu 401 + `WWW-Authenticate … resource_metadata=…` → Claude sám spustí **OAuth 2.1**: metadata (`/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource`), dynamická registrace (`/api/mcp/oauth/register`), stránka s **heslem panelu** (`/api/mcp/oauth/authorize`, PKCE S256, zámek 5 pokusů / 15 min společný s `/api/majitel`), `/api/mcp/oauth/token` (přístup 12 h, obnova 90 dní). Vše podepsané HMAC tajemstvím serveru + heslem panelu; změna hesla odhlásí všechny klienty. Jediný zápis do Blobs: použitý kód (`mcp/kod/<otisk>`). Podporuje i „Use Claude's published identity“ (client_id = adresa dokumentu metadat).
- **Dlouhé dotazy:** `tools/call` s `Accept: text/event-stream` jde jako SSE – hlavičky hned, udržovací řádek každých 10 s, výsledek jako jedna událost. Streamovaná funkce Netlify smí běžet **nejvýš 60 s** (dokumentace Functions API → Streaming responses), proto: jeden dotaz nejvýš 45 s (`MCP_LIMIT_MS`), opakování jen do společné hranice 55 s (`MCP_HRANICE_MS`); rada 24 s na volání bez opakování (`MCP_RADA_LIMIT_MS` – členové paralelně, pak předseda). Delší úlohy patří do panelu majitele (`/api/ai`, 45 s na první text) nebo do terminálu (`scripts/rada.mjs`).
- **You.com:** REST `POST https://ydc-index.io/v1/search` (`X-API-Key` = `HSPG_KLIC_YOUCOM`); bez klíče nástroj poradí oficiální konektor You.com (`https://api.you.com/mcp`). Účtuje You.com (mimo kredity Netlify).

## Soubory z balíčku
`netlify/functions/mcp.mjs`; `netlify/lib/ai/mcp.mjs`, `mcp-oauth.mjs`, `youcom.mjs`. Testy: unit `mcp` (17) a `mcp-sdk` (2 – oficiální klient `@modelcontextprotocol/sdk`, jen devDependency balíčku; do webu se nepřenáší). Žádná nová závislost webu.

## Postup
1. Větev `ukol-59-mcp-brana` z aktuální `main`. Přenes soubory; cesty funkce jsou v `config.path` (`/api/mcp`, `/api/mcp/oauth/:akce`, `/.well-known/oauth-authorization-server`, `/.well-known/oauth-protected-resource[/api/mcp]`) – v `netlify.toml` nic navíc. Ověř, že `/.well-known/` z úkolu 54 (`tdmrep.json`, statický soubor) zůstává a nekoliduje (funkce má jen dvě konkrétní cesty).
2. `npm test` (balíček) – 229 testů zelených, žádné skutečné volání AI.
3. Náhled: `node scripts/nasadit.mjs` (0 kreditů). Ověř:
   - `curl -s https://<náhled>/.well-known/oauth-authorization-server` → JSON s `issuer` = adresa náhledu; `…/oauth-protected-resource` → `resource` = `<náhled>/api/mcp`.
   - `curl -si -X POST https://<náhled>/api/mcp -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18"}}'` → `401` a hlavička `WWW-Authenticate: Bearer realm="HSPG AI Gateway", resource_metadata="…"`.
   - Totéž s `-H "Authorization: Bearer <token z /api/majitel>"` → `200`, `result.serverInfo.name = "hspg-ai-gateway"`.
   - `GET /api/mcp/oauth/authorize?…` bez klienta → stránka 400 „Neznámý klient“ (nikdy přesměrování na cizí adresu).
   - Volitelně MCP Inspector (`npx @modelcontextprotocol/inspector`, transport Streamable HTTP, adresa náhledu `/api/mcp`): projde celý OAuth tok se stránkou s heslem panelu; `tools/list` ukáže 5 nástrojů; `ai_stav` odpoví bez klíčů.
   - **Časový limit funkce:** zavolej `ai_zeptat` s `maxTokenu` 4000 na pomalejší roli a `rada_ai` se třemi rolemi – obojí musí doběhnout (SSE drží spojení, hranice 55 s je pod limitem 60 s streamované funkce). Když Netlify spojení přesto ukončí, sniž `MCP_LIMIT_MS` / `MCP_RADA_LIMIT_MS` a napiš to do hlášení.
4. Produkce až po schválení majitelem (15 kreditů) – brána na `https://hspg.cz/api/mcp`. Bez produkce jde konektor přidat i na adresu náhledu (jen na zkoušku; náhledy se mění).
5. Proměnné v Netlify (zadává majitel sám, scope Functions): `HSPG_KLIC_OPENROUTER` (R19 – bez něj jedou role přes Netlify AI Gateway a kredity), volitelně `HSPG_KLIC_YOUCOM` (klíč z https://you.com/platform), volitelně `HSPG_MCP_TOKEN` (náhodných ≥ 32 znaků, např. `openssl rand -base64 36` – pro Claude Code / Desktop bez OAuth), volitelně `MCP_LIMIT_MS`, `MCP_RADA_LIMIT_MS`, `MCP_HRANICE_MS`. Klíče nikdy nevidíš, nežádáš a nevypisuješ.
6. **Majitel přidá konektor** (Claude v Chrome ho tím provede, úloha C15):
   - claude.ai / Cowork / Desktop: https://claude.ai/settings/connectors → **Add custom connector** → název `HSPG AI Gateway`, URL `https://hspg.cz/api/mcp`, Authentication **Sign in now**, OAuth client **Use Claude's published identity** (záložně **Register automatically**) → **Add** → Claude otevře stránku brány → heslo panelu → hotovo. Pak v chatu `+` → Connectors → zapnout.
   - Claude Code (terminál majitele): `claude mcp add --transport http hspg-ai https://hspg.cz/api/mcp` a v relaci `/mcp` → přihlášení v prohlížeči; nebo bez OAuth `claude mcp add --transport http hspg-ai https://hspg.cz/api/mcp --header "Authorization: Bearer <HSPG_MCP_TOKEN>"` (token jen z proměnné prostředí, nikdy do chatu ani do souboru v repozitáři).
   - Managed Agents (Claude Console, hspg-infinity-matrix): stejná adresa jako MCP server agenta s pevným tokenem v hlavičce.
7. Zásady (úkol 09): brána = stejný zpracovatel jako panel majitele (OpenRouter / Netlify AI Gateway, pseudonymizovaně); You.com jako další zpracovatel jen s klíčem majitele – doplnit větu do seznamu zpracovatelů.

## Akceptace
- [ ] Unit testy zelené (včetně `mcp-sdk` s oficiálním klientem); žádný test nevolá skutečnou AI.
- [ ] Náhled: metadata, 401 s `WWW-Authenticate`, `initialize` s tokenem panelu, stránka s heslem (5× špatně → 429), výměna kódu, `ai_stav` bez klíčů v odpovědi; log bez textu dotazů.
- [ ] `git grep -nE "sk-or-v1-[A-Za-z0-9]{16,}|ydc-[A-Za-z0-9]{16,}"` nic nenajde; `HSPG_MCP_TOKEN` ani heslo nikde v repozitáři.
- [ ] Po přidání konektoru v claude.ai: `ai_stav` vrátí role, `ai_zeptat` s `gpt` odpoví (útrata se objeví v `/api/ai-stav`), `rada_ai` doběhne přes SSE.
- [ ] Hlášení a stop.
