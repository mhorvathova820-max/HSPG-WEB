// /api/ai a /api/agent/:id – interní brána pro majitele (panel, AI centrum, konzole v3): jeden dotaz na jednu
// roli AI, odpověď se streamuje jako prostý text. U /api/agent/:id určuje roli adresa (tělo „ai“ netřeba).
// Role s vlastním klíčem majitele běží přímo u poskytovatele, jinak přes Netlify AI Gateway (poskytovatele.mjs).
// Odolnost: první text musí přijít do 45 s (AI_LIMIT_PRVNI_TEXT_MS); při chybě před prvním textem jedno
// opakování (ne u chyb nastavení 400/401/403/404), pak převezme Claude – odpověď začne řádkem
// „⟲ Claude převzal…“, STAT nese { prevzal, puvodni } a do logu jde záznam bez obsahu dotazu.
// Limit: 120 volání / 10 min (porada 8 AI × několik kol se vejde, smyčka ne).
// Tělo: { ai: id z POSKYTOVATELE, zpravy: [{ role, text }], pokyn?: string, maxTokenu?: číslo }
// maxTokenu (256–8000, výchozí 8000) = strop délky odpovědi; podle něj se rezervuje rozpočet, takže krátké
// kroky (připomínky v poradě, kontrola) neblokují rozpočet celou osmitisícovou rezervou.
// Na konci streamu přijde řádek "\n\u0000STAT" + JSON s počtem tokenů a odhadem ceny.
// Chyba poskytovatele přijde jako "\n\u0000CHYBA" + JSON { zprava } – klient ji nesmí brát jako odpověď.
import { POSKYTOVATELE, jeZapnuty, vytvorAdaptery, vlastniKlic, sModely, nazevAI } from "../lib/ai/poskytovatele.mjs";
import { PRAVIDLA_PRAVDIVOSTI } from "../lib/ai/pravidla.mjs";
import { overPozadavek } from "../lib/ai/autorizace.mjs";
import { vychoziUloziste, zapisUtratu, odhadKc, rezervuj, odhadTokenu, odhadTokenuKlienta, mesicniLimitKc, nactiNastaveni, pricti } from "../lib/ai/limity.mjs";

const MAX_TOKENU = 8000;
const MAX_ZNAKU_VSTUPU = 60000;
const LIMIT_PRVNI_TEXT_MS = 45_000;
const BEZ_OPAKOVANI = new Set([400, 401, 403, 404]); // chyba nastavení (klíč, model) – opakování nepomůže

// Záznam do logu funkce: jen role, model, stav a čas – nikdy text dotazu ani odpovědi.
const loguj = (udalost, data) => console.warn(JSON.stringify({ udalost, ...data, cas: new Date().toISOString() }));

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
    const zCesty = new URL(req.url).pathname.match(/^\/api\/agent\/([a-z]+)\/?$/)?.[1];
    const ai = zCesty || telo?.ai;
    const { zpravy, pokyn } = telo || {};
    const maxTokenu = Math.min(MAX_TOKENU, Math.max(256, Math.floor(Number(telo?.maxTokenu)) || MAX_TOKENU));
    if (!POSKYTOVATELE[ai]) return json({ chyba: "Neznámá AI." }, 400);
    const platne =
      Array.isArray(zpravy) &&
      zpravy.length > 0 &&
      zpravy.every((z) => (z?.role === "user" || z?.role === "assistant") && typeof z.text === "string" && z.text.trim()) &&
      zpravy.at(-1).role === "user";
    if (!platne) return json({ chyba: "Zprávy musí končit dotazem uživatele." }, 400);
    if (JSON.stringify(zpravy).length + String(pokyn || "").length > MAX_ZNAKU_VSTUPU) return json({ chyba: "Dotaz je příliš dlouhý." }, 413);

    const system = pokyn ? `${PRAVIDLA_PRAVDIVOSTI}\n\nRole v této úloze:\n${String(pokyn)}` : PRAVIDLA_PRAVDIVOSTI;
    const t0 = ted(); // rezervace i vyrovnání patří do stejného období rozpočtu
    // Bez úložiště nejde ověřit rozpočet ani limit → AI se nevolá (kredity nesmí dojít ani přes panel majitele).
    let store, envM;
    try {
      store = await dejUloziste();
      if (!(await pricti(store, "limit/ai-majitel", 120, 10 * 60_000, t0))) return json({ chyba: "Příliš mnoho dotazů na AI za 10 minut. Zkuste to za chvíli." }, 429);
      envM = sModely(env, (await nactiNastaveni(store)).modely); // přepínač modelů v panelu (Blobs)
    } catch {
      return json({ chyba: "Rozpočet AI teď nejde ověřit (úložiště je nedostupné). Zkuste to za chvíli." }, 503);
    }
    if (!jeZapnuty(ai, envM)) return json({ chyba: `Chybí klíč ${POSKYTOVATELE[ai].klic} v Netlify.` }, 400);
    const vstup = odhadTokenu(PRAVIDLA_PRAVDIVOSTI) + odhadTokenuKlienta(JSON.stringify(zpravy) + String(pokyn || ""));
    const vlastni = (id) => Boolean(vlastniKlic(id, envM));
    // Měsíční rozpočet AI platí i pro majitele – kredity Netlify jsou společné s chodem webu (vlastní klíč ne).
    // Rezervuje se nejvyšší možná cena volání; po odpovědi se vyrovná na skutečnou.
    const zarezervuj = async (id) => rezervuj(store, id, vstup, maxTokenu, envM, t0, POSKYTOVATELE[id].model(envM), false, vlastni(id));
    let rezerva;
    try {
      rezerva = await zarezervuj(ai);
    } catch {
      return json({ chyba: "Rozpočet AI teď nejde ověřit (úložiště je nedostupné). Zkuste to za chvíli." }, 503);
    }
    if (rezerva === false) return json({ chyba: `Měsíční rozpočet AI (${mesicniLimitKc(env)} Kč, proměnná AI_MESICNI_LIMIT_KC) by se překročil.` }, 402);
    const vsechny = adaptery || vytvorAdaptery(envM);
    const limitPrvni = Number(env.AI_LIMIT_PRVNI_TEXT_MS) > 0 ? Number(env.AI_LIMIT_PRVNI_TEXT_MS) : LIMIT_PRVNI_TEXT_MS;
    const enc = new TextEncoder();
    const body = new ReadableStream({
      async start(ctrl) {
        const posli = (t) => { try { ctrl.enqueue(enc.encode(t)); } catch {} }; // klient mohl odejít (Zastavit)
        // Pokusy: role, jedno opakování, pak Claude (pokud to není sama role a je zapnutý).
        const pokusy = [ai, ai, ...(ai !== "claude" && jeZapnuty("claude", envM) ? ["claude"] : [])];
        let id = ai, rez = rezerva, prevzal = null, posledniChyba = null, vraceno = false;
        for (let i = 0; i < pokusy.length; i++) {
          const jina = pokusy[i] !== id;
          if (jina || vraceno) {
            // Nová rezervace: převzetí jinou AI, nebo opakování po vrácené rezervaci (jinak by se vyrovnala dvakrát).
            id = pokusy[i];
            try { rez = await zarezervuj(id); } catch { rez = false; }
            vraceno = false;
            if (rez === false) break; // rozpočet už nestačí
          }
          if (jina) {
            prevzal = id;
            loguj("ai-prevzal", { role: ai, prevzal: id, duvod: posledniChyba?.status || posledniChyba?.message || "chyba" });
            posli(`⟲ ${nazevAI(id, envM)} převzal úlohu – ${nazevAI(ai, envM)} teď neodpovídá.\n\n`);
          }
          const model = POSKYTOVATELE[id].model(envM);
          const casovac = new AbortController();
          const t = setTimeout(() => casovac.abort(), limitPrvni);
          const signal = AbortSignal.any([req.signal, casovac.signal].filter(Boolean));
          let stat = null, odeslano = false;
          try {
            for await (const kus of vsechny[id].stream({ system, zpravy, maxTokenu, signal })) {
              if (kus.text) { if (!odeslano) clearTimeout(t); odeslano = true; posli(kus.text); }
              // Usage může přijít ve více kusech (kumulativně) – vyrovná se jednou, po skončení streamu.
              if (kus.stat) stat = { vstup: Math.max(stat?.vstup || 0, kus.stat.vstup || 0), vystup: Math.max(stat?.vystup || 0, kus.stat.vystup || 0) };
            }
          } catch (e0) {
            const e = casovac.signal.aborted && !req.signal?.aborted ? Object.assign(new Error("timeout"), { status: 504 }) : e0;
            // Poskytovatel požadavek odmítl dřív, než cokoli vygeneroval (HTTP chyba) → nic neúčtoval, rezervace se vrátí.
            // Přerušení nebo vypršení času rezervaci nechá (tokeny, i neviditelné uvažování, mohly být účtované).
            if (!odeslano && !stat && e?.status >= 400 && e.status <= 599 && e.status !== 504 && e.status !== 422) {
              try { await zapisUtratu(store, id, { vstup: 0, vystup: 0 }, envM, t0, rez, model, false, vlastni(id)); vraceno = true; } catch {}
            }
            posledniChyba = e;
            clearTimeout(t);
            if (req.signal?.aborted) break; // majitel zastavil – nic dalšího
            if (!odeslano) {
              loguj("ai-chyba", { role: id, model, stav: e?.status || null, pokus: i + 1 });
              if (pokusy[i + 1] === id && BEZ_OPAKOVANI.has(e?.status)) i++; // chyba nastavení → rovnou Claude
              continue;
            }
            // Text už odešel – přepnout jinam nejde, klient dostane chybu (klíče se do ní nedostanou).
            const kod = e?.status ? ` (${e.status})` : "";
            posli("\n\u0000CHYBA" + JSON.stringify({ zprava: `Chyba ${nazevAI(id, envM)}${kod}: ${String(e?.message || e).slice(0, 300)}` }));
          }
          clearTimeout(t);
          if (stat) {
            try { await zapisUtratu(store, id, stat, envM, t0, rez, model, false, vlastni(id)); } catch { /* rezervace zůstane, odpověď doběhne */ }
            const kc = odhadKc(id, stat.vstup || 0, stat.vystup || 0, envM, model);
            posli("\n\u0000STAT" + JSON.stringify({ ...stat, kc: Math.round(kc * 100) / 100, model, ...(prevzal ? { prevzal, puvodni: ai } : {}), ...(vlastni(id) ? { vlastniKlic: true } : {}) }));
          }
          posledniChyba = odeslano || stat ? null : posledniChyba;
          if (odeslano || stat || posledniChyba === null) break;
        }
        if (posledniChyba && !req.signal?.aborted) {
          const kod = posledniChyba.status ? ` (${posledniChyba.status})` : "";
          posli("\n\u0000CHYBA" + JSON.stringify({ zprava: `Chyba ${nazevAI(id, envM)}${kod}: ${String(posledniChyba.message || posledniChyba).slice(0, 300)}` }));
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

export const config = { path: ["/api/ai", "/api/agent/:id"] };
