# Úkol 22: H-SPG CORE v3 – konzole majitele „Vše ve tvých rukách“ (brána AI, vlastní klíče, přepínač modelů)
> Priorita P1 · Závisí na: 01 (přihlášení, `/api/ai`, AI centrum), 21 (H-WEATHER CONTROL, kupony) · Čeká na majitele: vlastní klíče v Netlify (zadává sám), export návrhu `HBOT Majitel v3.dc.html` z Claude Design (fáze 2 a 3) · Dvě fáze: A = brána a modely (kód hotový v balíčku), B = vzhled v3 (až bude export).

## Proč
- Prototyp v3 volá AI přímo z prohlížeče s klíči v prohlížeči – na ostrém webu nepřípustné (KONTEXT §4 bod 2). Na webu jde všechno přes server a jen pro přihlášeného majitele.
- Majitel 9. 10. 2026 rozhodl: vlastní klíče u Anthropic, OpenAI, Google, Mistral a Groq (xAI zatím ne); role bez vlastního klíče jede dál přes Netlify AI Gateway; R8 platí i pro v3 (majitel má nejlepší modely); přepínač modelů v panelu bez nasazení.
- Kontrola dokumentace 9. 10. 2026: `gpt-5` / `gpt-5-mini` (snapshoty 2025-08-07) končí 11. 12. 2026; Gemini 2.5 jen pro dřívější uživatele (nový klíč = nový účet); Llama 4 na Groq vypnutá, `llama-3.3-70b-versatile` končí 16. 8. 2026; `grok-4` v dokumentaci xAI není. Claude Opus 5.5 a Sonnet 5.5 aktivní (vyřazení nejdřív 9/2027).

## Fáze A – brána a modely (hotový kód v `../hspg-balicek/balicek/web/`)
1. Větev `ukol-22-konzole-v3` z aktuální `main`; převezmi soubory:
   - `netlify/lib/ai/poskytovatele.mjs` – vlastní klíče (`VLASTNI_KLICE`), výchozí modely, `sModely`, `nazevAI`;
   - `netlify/functions/ai.mjs` – **jedna** brána na `/api/ai` i `/api/agent/:id`: první text do 45 s (`AI_LIMIT_PRVNI_TEXT_MS`), jedno opakování (ne u 400/401/403/404), pak převezme Claude (řádek „⟲ Claude převzal…“, STAT `{ prevzal, puvodni }`, log `ai-prevzal` bez textu dotazu), limit 120 volání / 10 min, modely z přepínače;
   - `netlify/functions/ai-stav.mjs` – POST `{ modely }` (Blobs), GET ukazuje cestu (vlastní klíč / Gateway), nikdy hodnoty klíčů;
   - `netlify/lib/ai/limity.mjs` – volání s vlastním klíčem se nerezervují v rozpočtu kreditů Netlify, evidují se zvlášť (`vlastniKc`);
   - `netlify/functions/asistent.mjs` – totéž pro zákazníky (limity požadavků platí dál);
   - `assets/ai-klient.js`, `assets/ai-centrum.js`, `ai-centrum/index.html`, `assets/ai-centrum.css` – sekce „Modely AI“.
2. Testy balíčku: `npm test` (94, z toho `testy/unit/brana-ai.test.mjs` 7) a e2e (47) proti webHSPGH.
3. Náhled zdarma; v AI centru „Modely AI“ ukáže u každé AI cestu. Bez vlastních klíčů musí vše běžet jako dosud (Gateway).
4. Hlášení a stop. Produkce jen se schválením majitele.

## Vlastní klíče – kam je vloží majitel (sám, hodnoty nikomu)
Netlify → projekt **tourmaline-dasik-9de005** → **Project configuration → Environment variables → Add a variable** (scope Functions, hodnota jako secret). Projeví se po nejbližším nasazení.

| Proměnná | Poskytovatel | Role |
|---|---|---|
| `HSPG_KLIC_ANTHROPIC` | Anthropic | claude |
| `HSPG_KLIC_OPENAI` | OpenAI | gpt |
| `HSPG_KLIC_GEMINI` | Google (Gemini API) | gemini |
| `HSPG_KLIC_MISTRAL` | Mistral | mistral |
| `HSPG_KLIC_GROQ` | Groq | llama (u Groq model `openai/gpt-oss-120b`, v panelu „Groq · GPT-OSS 120B“) |
| `XAI_API_KEY` | xAI | grok – zatím nezakládat |

Jména se záměrně liší od proměnných Gateway (`ANTHROPIC_API_KEY` …) – ty nepřepisovat ani nemazat. Doporučení majiteli: v konzoli každého poskytovatele nastavit měsíční limit útraty (vlastní klíč nejde přes rozpočet kreditů Netlify).

## Výchozí modely (ověřeno v dokumentaci 9. 10. 2026; přepínač v panelu je přepíše)
| Role | S vlastním klíčem | Přes Gateway (beze změny – podporu nových modelů v Gateway nešlo ověřit) |
|---|---|---|
| claude | `claude-opus-5-5` | `claude-opus-5-5` |
| gpt | `gpt-6-astra` | `gpt-5` (končí 11. 12. 2026) |
| gemini | `gemini-3.8-flash` (nejschopnější stabilní; Pro jen preview) | `gemini-2.5-pro` |
| mistral | `mistral-large-2512` – **ID neověřené**, ověř v konzoli Mistral | `mistralai/mistral-large-2512` |
| llama | `openai/gpt-oss-120b` (Groq) | `meta-llama/llama-4-maverick` |
| grok | `grok-4.7` (jen s `XAI_API_KEY`) | `x-ai/grok-4.5` |
| zákazníci | Claude `claude-sonnet-5-5`, Gemini `gemini-3.5-flash-lite`, GPT `gpt-6-luna` (`reasoning_effort: none`) | Gemini `gemini-2.5-flash`, GPT `gpt-5-mini` (končí 11. 12. 2026) |

Ceny nových modelů OpenAI/Google/Groq/Mistral nejsou v tabulce odhadů (`limity.mjs`) – počítají se nouzově 15/75 USD; u vlastních klíčů to rozpočet kreditů neovlivní. Před 11. 12. 2026 přepnout Gateway modely GPT (nebo zadat vlastní klíč).

## Fáze B – vzhled v3 (až dorazí export z Claude Design)
> **Nahrazeno úkolem 25** (export v8). Fázi B zvlášť nedělej – body níže platí v úkolu 25.

5. v3 **nahradí vzhled `/ai-centrum/`** – žádná druhá stránka majitele. Plovoucí tlačítko na webu zůstává jako rychlý vstup s odkazem do `/ai-centrum/`.
6. Z exportu převzít jen vzhled a rozložení. Každé volání AI přepsat na `/api/agent/<role>` s tokenem z `/api/majitel`; **odstranit** jakékoli ukládání klíčů v prohlížeči a přímá volání poskytovatelů (`git grep -nE "api\.anthropic|api\.openai|generativelanguage|api\.groq|api\.mistral|localStorage.*(key|klic)"` v novém kódu = 0).
7. Části v3 napojit na existující API: tým AI → `/api/agent/:id` + `/api/ai-stav`; počasí a zakázky → `/api/pocasi-prace`; kupony → `/api/kupon`; obce → `/api/planovac?navrh=`. „Připojení služeb“ jen ukazuje stav z `/api/ai-stav` (cesta, zapnuto) – žádná pole pro klíče.
8. Kontakty a SEO radar: jen to, co nepotřebuje nové klíče ani cizí služby; jinak `[DOPLNIT]` a návrh v hlášení.
9. Testy: e2e AI centra musí projít (přihlášení, porada, H-WEATHER, modely), axe 0 chyb, 375 px.

## Měření zakázky z adresy
Hotové jako samostatný úkol 23 (`/api/mereni`) – konzole v3 ho jen zobrazí (půdorys, pohledy, střecha, 3D z jednoho JSON).

## Nepřekročitelná pravidla
KONTEXT §4; hodnoty klíčů nikdy v kódu, logu, chatu ani v odpovědi API; nic neslučovat ani nenasazovat do produkce bez schválení majitele.
