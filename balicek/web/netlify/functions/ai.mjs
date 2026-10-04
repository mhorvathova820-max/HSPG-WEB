// /api/ai – interní: jeden dotaz na jednu AI pro majitele, odpověď se streamuje jako prostý text.
// Tělo: { ai: "claude"|"gpt"|"gemini"|"grok", zpravy: [{ role, text }], pokyn?: string }
// Na konci streamu přijde řádek "\n\u0000STAT" + JSON s počtem tokenů a odhadem ceny.
// Chyba poskytovatele přijde jako "\n\u0000CHYBA" + JSON { zprava } – klient ji nesmí brát jako odpověď.
import { POSKYTOVATELE, jeZapnuty, vytvorAdaptery } from "../lib/ai/poskytovatele.mjs";
import { PRAVIDLA_PRAVDIVOSTI } from "../lib/ai/pravidla.mjs";
import { overPozadavek } from "../lib/ai/autorizace.mjs";
import { vychoziUloziste, zapisUtratu, odhadKc, rezervuj, odhadTokenu, odhadTokenuKlienta, mesicniLimitKc } from "../lib/ai/limity.mjs";

const MAX_TOKENU = 8000;
const MAX_ZNAKU_VSTUPU = 60000;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export function vytvorAI({ env = process.env, adaptery, uloziste, ted = () => Date.now() } = {}) {
  let ul = uloziste;
  const dejUloziste = async () => (ul ||= await vychoziUloziste());

  return async function handler(req) {
    if (req.method !== "POST") return json({ chyba: "Použijte POST." }, 405);
    const a = await overPozadavek(req, env, ted(), dejUloziste);
    if (!a.ok) return json({ chyba: a.duvod }, a.status);

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

    const system = pokyn ? `${PRAVIDLA_PRAVDIVOSTI}\n\nRole v této úloze:\n${String(pokyn)}` : PRAVIDLA_PRAVDIVOSTI;
    // Měsíční rozpočet AI platí i pro majitele – kredity Netlify jsou společné s chodem webu.
    // Rezervuje se nejvyšší možná cena volání; po odpovědi se vyrovná na skutečnou.
    // Bez úložiště nejde rozpočet ověřit → AI se nevolá (kredity nesmí dojít ani přes panel majitele).
    let rezerva;
    let store;
    const model = POSKYTOVATELE[ai].model(env);
    const t0 = ted(); // rezervace i vyrovnání patří do stejného období rozpočtu
    try {
      store = await dejUloziste();
      rezerva = await rezervuj(store, ai, odhadTokenu(PRAVIDLA_PRAVDIVOSTI) + odhadTokenuKlienta(JSON.stringify(zpravy) + String(pokyn || "")), MAX_TOKENU, env, t0, model);
    } catch {
      return json({ chyba: "Rozpočet AI teď nejde ověřit (úložiště je nedostupné). Zkuste to za chvíli." }, 503);
    }
    if (rezerva === false) return json({ chyba: `Měsíční rozpočet AI (${mesicniLimitKc(env)} Kč, proměnná AI_MESICNI_LIMIT_KC) by se překročil.` }, 402);
    const adapter = (adaptery || vytvorAdaptery(env))[ai];
    const enc = new TextEncoder();
    const body = new ReadableStream({
      async start(ctrl) {
        const posli = (t) => { try { ctrl.enqueue(enc.encode(t)); } catch {} }; // klient mohl odejít (Zastavit)
        let stat = null;
        let odeslano = false;
        try {
          for await (const kus of adapter.stream({ system, zpravy, maxTokenu: MAX_TOKENU, signal: req.signal })) {
            if (kus.text) { odeslano = true; posli(kus.text); }
            // Usage může přijít ve více kusech (kumulativně) – vyrovná se jednou, po skončení streamu.
            if (kus.stat) stat = { vstup: Math.max(stat?.vstup || 0, kus.stat.vstup || 0), vystup: Math.max(stat?.vystup || 0, kus.stat.vystup || 0) };
          }
        } catch (e) {
          // Poskytovatel požadavek odmítl dřív, než cokoli vygeneroval (HTTP chyba) → nic neúčtoval, rezervace se vrátí.
          // Přerušení nebo vypršení času rezervaci nechá (tokeny, i neviditelné uvažování, mohly být účtované).
          if (!odeslano && !stat && e?.status >= 400 && e.status <= 599 && e.status !== 504 && e.status !== 422) {
            try { await zapisUtratu(store, ai, { vstup: 0, vystup: 0 }, env, t0, rezerva, model); } catch {}
          }
          // Klíče se do chyby nedostanou; vracíme jen stav a zprávu poskytovatele.
          const kod = e?.status ? ` (${e.status})` : "";
          posli("\n\u0000CHYBA" + JSON.stringify({ zprava: `Chyba ${POSKYTOVATELE[ai].nazev}${kod}: ${String(e?.message || e).slice(0, 300)}` }));
        }
        if (stat) {
          try {
            await zapisUtratu(store, ai, stat, env, t0, rezerva, model);
          } catch {
            // Útrata se nezapíše (rezervace zůstane), odpověď ale doběhne.
          }
          const kc = odhadKc(ai, stat.vstup || 0, stat.vystup || 0, env, model);
          posli("\n\u0000STAT" + JSON.stringify({ ...stat, kc: Math.round(kc * 100) / 100 }));
        }
        try { ctrl.close(); } catch {}
      },
    });
    return new Response(body, {
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" },
    });
  };
}

export default vytvorAI();

export const config = { path: "/api/ai" };
