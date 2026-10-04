# AI centrum „Vše ve tvých rukách“

Jedno okno, jeden dotaz, 3 AI (Claude, ChatGPT, Gemini) + volitelně Grok. Za heslem interního panelu.

## Režimy
| Režim | Co dělá |
|---|---|
| Všechny najednou | Stejné zadání jde všem AI, odpovědi vedle sebe. Každý sloupec umí doplňující dotaz. |
| Spolupráce | 1. návrh (výchozí ChatGPT) → 2. kontrola pravdivosti (Claude) → 3. finál (Gemini). Role jdou přehodit. |

Hotové úlohy: odpověď na poptávku, příspěvek na Facebook, text nabídky, odpověď na recenzi, překlad do angličtiny, volný dotaz.
Pojistka: každá AI dostane pravidla pravdivosti z `netlify/lib/spolecne.mjs` (žádné vymyšlené zakázky, recenze, záruky).

## Zprovoznění (jednorázově, cca 15 min)
1. Netlify → **Add new project → Import from Git** → `mhorvathova820-max/HSPG-WEB`, větev `main` (po sloučení PR).
   Build command prázdný, publish `public` (načte se z `netlify.toml`).
2. Doména: Netlify → Domain management → přidat `ai.hspg.cz` (u Wedos DNS záznam CNAME `ai` → adresa projektu na netlify.app).
3. Netlify → **Environment variables** (Scope: Functions):

| Proměnná | Povinná | Kde získat |
|---|---|---|
| `HSPG_PANEL_HESLO` | ano, 16+ znaků | stejné jako interní panel |
| `ANTHROPIC_API_KEY` | pro Claude | console.anthropic.com |
| `OPENAI_API_KEY` | pro ChatGPT | platform.openai.com |
| `GEMINI_API_KEY` | pro Gemini | aistudio.google.com → Get API key |
| `XAI_API_KEY` | volitelně Grok | console.x.ai |
| `CLAUDE_MODEL`, `OPENAI_MODEL`, `GEMINI_MODEL`, `XAI_MODEL` | ne | přepíše výchozí model, pokud poskytovatel vydá novější |

4. Deploy → otevřít `ai.hspg.cz` → zadat heslo. AI bez klíče se zobrazí šedě s názvem chybějící proměnné.
5. U každého poskytovatele nastavit **měsíční limit útraty** (doporučeno 200–500 Kč). Předplatné Plus/Advanced/Pro se na API nevztahuje.

Výchozí modely: `claude-opus-5-5`, `gpt-5`, `gemini-2.5-pro`, `grok-4`. Názvy OpenAI/Google/xAI ověřte v jejich konzoli – pokud vrátí chybu „model not found“, nastavte proměnnou `*_MODEL`.

## Bezpečnost
- Heslo se ověřuje na serveru (porovnání v konstantním čase, zdržení 1,5 s po chybě). Bez nastaveného hesla je centrum zamčené.
- Klíče zůstávají v Netlify, do prohlížeče se nedostanou.
- Stránka má `noindex` a nejde vložit do cizího webu.
- Historie a počty tokenů se ukládají jen v daném prohlížeči (max. 30 záznamů). Do zadání nepište rodná čísla ani hesla.

## Google (Gmail, Drive) a Claude v VS Code
- Claude (cloud i VS Code rozšíření přihlášené účtem claude.ai) má Google přes **konektory claude.ai**: Settings → Connectors → Gmail, Google Drive (Google Calendar). Gmail a Drive jsou už připojené.
  Použití: „najdi v info@hspg.cz poptávky z tohoto týdne“, „ulož nabídku na Drive“.
- Gemini v AI centru jede přes API klíč z AI Studia – samostatné MCP pro něj není potřeba.
- `.mcp.json` v repozitáři: GitHub + soubory projektu pro VS Code rozšíření. GitHub potřebuje proměnnou `GITHUB_TOKEN` v systému (ne v souboru).
- VS Code „cloud agent“: pracuje na své větvi; pravidla spolupráce jsou v `CLAUDE.md`.
