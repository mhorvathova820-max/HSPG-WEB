# HSPG-WEB – pravidla pro Claude (cloud i VS Code rozšíření)

## Co je v repozitáři
- `public/index.html` – AI centrum „Vše ve tvých rukách“ (Claude, ChatGPT, Gemini, volitelně Grok v jednom okně).
- `netlify/functions/ai.mjs` – volání AI se streamováním; `ai-stav.mjs` – ověření hesla a stav klíčů.
- `netlify/lib/spolecne.mjs` – heslo, seznam AI, **pravidla pravdivosti** (jediné místo, kde se mění).
- Hlavní web hspg.cz (Netlify `tourmaline-dasik-9de005`) zde zatím není – nasazuje se mimo Git.

## Spolupráce dvou agentů (cloud + VS Code)
- Každý agent pracuje **jen na své větvi** (`claude/...`). Nepřepínat cizí větve, nedělat reset/force-push.
- Před prací `git fetch` a `git status`; rozdělanou cizí práci nemazat.
- Změny do `main` jen přes pull request.

## Nepřekročitelná pravidla obsahu
- Žádné vymyšlené reference, recenze, hodnocení, zakázky, záruky, certifikáty ani loga AI.
- Žádné cizí fotky. Chybějící fakta označit `[DOPLNIT: …]`.
- API klíče a hesla nikdy do kódu, commitů ani chatu – jen Netlify → Environment variables.

## Kontrola před commitem
- `npm run check` (syntaxe funkcí).
