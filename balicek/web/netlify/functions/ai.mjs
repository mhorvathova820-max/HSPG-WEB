// /api/ai – interní: jeden dotaz na jednu AI pro majitele, odpověď se streamuje jako prostý text.
// Tělo: { ai: "claude"|"gpt"|"gemini"|"grok", zpravy: [{ role, text }], pokyn?: string }
// Na konci streamu přijde řádek "\n\u0000STAT" + JSON s počtem tokenů a odhadem ceny.
// Chyba poskytovatele přijde jako "\n\u0000CHYBA" + JSON { zprava } – klient ji nesmí brát jako odpověď.
import { POSKYTOVATELE, jeZapnuty, vytvorAdaptery } from "../lib/ai/poskytovatele.mjs";
import { PRAVIDLA_PRAVDIVOSTI } from "../lib/ai/pravidla.mjs";
import { overPozadavek } from "../lib/ai/autorizace.mjs";
import { vychoziUloziste, zapisUtratu, odhadKc, rozpocetVycerpan, mesicniLimitKc } from "../lib/ai/limity.mjs";

const MAX_TOKENU = 8000;
const MAX_ZNAKU_VSTUPU = 60000;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export function vytvorAI({ env = process.env, adaptery, uloziste, ted = () => Date.now() } = {}) {
  let ul = uloziste;
  const dejUloziste = async () => (ul ||= await vychoziUloziste());

  return async function handler(req) {
    if (req.method !== "POST") return json({ chyba: "Použijte POST." }, 405);
    const a = overPozadavek(req, env, ted());
    if (!a.ok) {
      await new Promise((r) => setTimeout(r, 800));
      return json({ chyba: a.duvod }, a.status);
    }

    let telo;
    try {
      telo = await req.json();
    } catch {
      return json({ chyba: "Neplatný JSON." }, 400);
    }
    const { ai, zpravy, pokyn } = telo || {};
    if (!POSKYTOVATELE[ai]) return json({ chyba: "Neznámá AI." }, 400);
    if (!jeZapnuty(ai, env)) return json({ chyba: `Chybí klíč ${POSKYTOVATELE[ai].klic} v Netlify.` }, 400);
    const platne =
      Array.isArray(zpravy) &&
      zpravy.length > 0 &&
      zpravy.every((z) => (z?.role === "user" || z?.role === "assistant") && typeof z.text === "string" && z.text.trim()) &&
      zpravy.at(-1).role === "user";
    if (!platne) return json({ chyba: "Zprávy musí končit dotazem uživatele." }, 400);
    if (JSON.stringify(zpravy).length + String(pokyn || "").length > MAX_ZNAKU_VSTUPU) return json({ chyba: "Dotaz je příliš dlouhý." }, 413);

    // Měsíční rozpočet AI platí i pro majitele – kredity Netlify jsou společné s chodem webu.
    try {
      if (await rozpocetVycerpan(await dejUloziste(), env, ted()))
        return json({ chyba: `Měsíční rozpočet AI (${mesicniLimitKc(env)} Kč, proměnná AI_MESICNI_LIMIT_KC) je vyčerpaný.` }, 402);
    } catch {
      // Úložiště nedostupné: přihlášený majitel smí pokračovat (nízký objem), útrata se dopočítá později.
    }
    const system = pokyn ? `${PRAVIDLA_PRAVDIVOSTI}\n\nRole v této úloze:\n${String(pokyn)}` : PRAVIDLA_PRAVDIVOSTI;
    const adapter = (adaptery || vytvorAdaptery(env))[ai];
    const enc = new TextEncoder();
    const body = new ReadableStream({
      async start(ctrl) {
        try {
          for await (const kus of adapter.stream({ system, zpravy, maxTokenu: MAX_TOKENU, signal: req.signal })) {
            if (kus.text) ctrl.enqueue(enc.encode(kus.text));
            if (kus.stat) {
              const kc = odhadKc(ai, kus.stat.vstup || 0, kus.stat.vystup || 0, env);
              ctrl.enqueue(enc.encode("\n\u0000STAT" + JSON.stringify({ ...kus.stat, kc: Math.round(kc * 100) / 100 })));
              try {
                await zapisUtratu(await dejUloziste(), ai, kus.stat, env, ted());
              } catch {
                // Útrata se nezapíše, odpověď ale doběhne.
              }
            }
          }
        } catch (e) {
          // Klíče se do chyby nedostanou; vracíme jen stav a zprávu poskytovatele.
          const kod = e?.status ? ` (${e.status})` : "";
          ctrl.enqueue(enc.encode("\n\u0000CHYBA" + JSON.stringify({ zprava: `Chyba ${POSKYTOVATELE[ai].nazev}${kod}: ${String(e?.message || e).slice(0, 300)}` })));
        }
        ctrl.close();
      },
    });
    return new Response(body, {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" },
    });
  };
}

export default vytvorAI();

export const config = { path: "/api/ai" };
