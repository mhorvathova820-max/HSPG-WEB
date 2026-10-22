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
// GDPR (22. 10. 2026): osobní údaje v zadání se před odesláním AI nahradí značkami [EMAIL_1] … (pseudonymizace.mjs);
// odpověď se pro panel majitele doplní zpět. Muse Wonder (bez ZDR) dotaz s osobními údaji nedostane (422).
// Režim rady: { rezim: "rada", role?: [id…], zpravy, pokyn?, maxTokenu? (256–4000, výchozí 3000) } → stejný dotaz
// paralelně vybraným AI (výchozí claude, gpt, argon, grok; nejvýš 6), pak shrnutí předsedou Claude (rada.mjs).
// Odpověď je NDJSON: {udalost:"start"} → {udalost:"clen"} po každé AI → {udalost:"predseda"} → {udalost:"hotovo"}.
// Každé volání se počítá do limitu 120 / 10 min a rezervuje rozpočet zvlášť.
import { POSKYTOVATELE, jeZapnuty, vytvorAdaptery, sModely, nazevAI, mimoKredity, sCenami } from "../lib/ai/poskytovatele.mjs";
import { PRAVIDLA_PRAVDIVOSTI } from "../lib/ai/pravidla.mjs";
import { overPozadavek } from "../lib/ai/autorizace.mjs";
import { vychoziUloziste, zapisUtratu, odhadKc, rezervuj, odhadTokenu, odhadTokenuKlienta, mesicniLimitKc, nactiNastaveni, pricti } from "../lib/ai/limity.mjs";
import { vytvorPseudonymizaci, vytvorDoplnovac, STITKY, mozneOsobniUdaje } from "../lib/ai/pseudonymizace.mjs";
import { poradaRady } from "../lib/ai/rada.mjs";

const MAX_TOKENU = 8000;
const MAX_ZNAKU_VSTUPU = 60000;
const LIMIT_PRVNI_TEXT_MS = 45_000;
const BEZ_OPAKOVANI = new Set([400, 401, 403, 404]); // chyba nastavení (klíč, model) – opakování nepomůže
const RADA_VYCHOZI = ["claude", "gpt", "argon", "grok"];
const RADA_MAX_CLENU = 6;
const RADA_LIMIT_MS = 60_000;

const platneZpravy = (zpravy) =>
  Array.isArray(zpravy) &&
  zpravy.length > 0 &&
  zpravy.every((z) => (z?.role === "user" || z?.role === "assistant") && typeof z.text === "string" && z.text.trim()) &&
  zpravy.at(-1).role === "user";
const typyUdaju = (typy) => Object.keys(typy).map((t) => STITKY[t] || t).join(", ");

// Záznam do logu funkce: jen role, model, stav a čas – nikdy text dotazu ani odpovědi.
const loguj = (udalost, data) => console.warn(JSON.stringify({ udalost, ...data, cas: new Date().toISOString() }));

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export function vytvorAI({ env = process.env, adaptery, uloziste, ted = () => Date.now() } = {}) {
  let ul = uloziste;
  const dejUloziste = async () => (ul ||= await vychoziUloziste());

  // Režim rady (rada.mjs): stejný pseudonymizovaný dotaz více AI paralelně, pak shrnutí předsedou Claude.
  async function rada(req, telo) {
    const { zpravy, pokyn } = telo;
    if (!platneZpravy(zpravy)) return json({ chyba: "Zprávy musí končit dotazem uživatele." }, 400);
    if (JSON.stringify(zpravy).length + String(pokyn || "").length > MAX_ZNAKU_VSTUPU) return json({ chyba: "Dotaz je příliš dlouhý." }, 413);
    const role = [...new Set(Array.isArray(telo.role) && telo.role.length ? telo.role : RADA_VYCHOZI)];
    if (role.length > RADA_MAX_CLENU || role.some((id) => !POSKYTOVATELE[id])) return json({ chyba: `Neznámá AI nebo víc než ${RADA_MAX_CLENU} členů rady.` }, 400);
    const maxTokenu = Math.min(4000, Math.max(256, Math.floor(Number(telo.maxTokenu)) || 3000));
    const t0 = ted();
    let store, envM;
    try {
      store = await dejUloziste();
      // Každý člen i předseda je samostatné volání AI – do limitu 120 / 10 min se počítají všechna.
      for (let i = 0; i <= role.length; i++) {
        if (!(await pricti(store, "limit/ai-majitel", 120, 10 * 60_000, t0))) return json({ chyba: "Příliš mnoho dotazů na AI za 10 minut. Zkuste to za chvíli." }, 429);
      }
      envM = sCenami(sModely(env, (await nactiNastaveni(store)).modely));
    } catch {
      return json({ chyba: "Rozpočet AI teď nejde ověřit (úložiště je nedostupné). Zkuste to za chvíli." }, 503);
    }
    const zapnute = role.filter((id) => jeZapnuty(id, envM));
    if (!zapnute.length) return json({ chyba: "Žádná ze zvolených AI nemá v Netlify klíč." }, 400);
    const vsechny = adaptery || vytvorAdaptery(envM);
    const clen = (id) => ({
      id, nazev: nazevAI(id, envM), model: POSKYTOVATELE[id].model(envM), adapter: vsechny[id], zdr: !POSKYTOVATELE[id].bezZdr,
      ...(id === "argon" ? { minTokenu: 4000 } : {}), // Gemini 4 Argon vždy uvažuje – malý strop by vyčerpalo uvažování
    });
    const predseda = jeZapnuty("claude", envM) ? clen("claude") : null;
    const ps = vytvorPseudonymizaci();
    const rozpocet = {
      rezervuj: (c, vstupT, maxT) => rezervuj(store, c.id, vstupT, maxT, envM, t0, c.model, false, mimoKredity(c.id, envM)),
      vyrovnej: (c, stat, rez) => zapisUtratu(store, c.id, stat, envM, t0, rez, c.model, false, mimoKredity(c.id, envM)),
    };
    const limitMs = Number(env.AI_RADA_LIMIT_MS) > 0 ? Number(env.AI_RADA_LIMIT_MS) : RADA_LIMIT_MS;
    let kcCelkem = 0;
    // Události pro panel majitele: texty doplněné zpět (jen tady), k volání odhad ceny v Kč.
    const proMajitele = (u) => {
      const o = { ...u };
      if (typeof o.text === "string") o.text = ps.doplnZpet(o.text);
      if (typeof o.doporuceni === "string") o.doporuceni = ps.doplnZpet(o.doporuceni);
      for (const k of ["shoda", "rozdily"]) if (Array.isArray(o[k])) o[k] = o[k].map((x) => ps.doplnZpet(x));
      if (o.stat && o.id) {
        const kc = Math.round(odhadKc(o.id, o.stat.vstup, o.stat.vystup, envM, o.model) * 100) / 100;
        kcCelkem += kc;
        o.stat = { ...o.stat, kc, ...(mimoKredity(o.id, envM) ? { vlastniKlic: true } : {}) };
      }
      if (o.udalost === "start") o.vypnute = role.filter((id) => !zapnute.includes(id));
      if (o.udalost === "hotovo") o.stat = { ...o.stat, kc: Math.round(kcCelkem * 100) / 100 };
      return o;
    };
    const enc = new TextEncoder();
    const body = new ReadableStream({
      async start(ctrl) {
        const posli = (o) => { try { ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n")); } catch {} };
        try {
          const v = await poradaRady({
            zpravy, pokyn, clenove: zapnute.map(clen), predseda, maxTokenu, casLimitMs: limitMs, opakovani: 1,
            rozpocet, signal: req.signal, pseudonymizace: ps, naUdalost: (u) => posli(proMajitele(u)),
          });
          loguj("ai-rada", { role: zapnute, predseda: v.predseda?.id || null, odpovedelo: v.clenove.filter((c) => c.ok).length, stav: "hotovo" });
        } catch (e) {
          loguj("ai-rada", { role: zapnute, stav: "chyba", duvod: e?.status || "vyjimka" });
          posli({ udalost: "chyba", zprava: "Rada se nedokončila." });
        }
        try { ctrl.close(); } catch {}
      },
    });
    return new Response(body, {
      headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" },
    });
  }

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
    if (telo?.rezim === "rada") return rada(req, telo);
    const zCesty = new URL(req.url).pathname.match(/^\/api\/agent\/([a-z]+)\/?$/)?.[1];
    const ai = zCesty || telo?.ai;
    const { zpravy, pokyn } = telo || {};
    const maxTokenu = Math.min(MAX_TOKENU, Math.max(256, Math.floor(Number(telo?.maxTokenu)) || MAX_TOKENU));
    if (!POSKYTOVATELE[ai]) return json({ chyba: "Neznámá AI." }, 400);
    if (!platneZpravy(zpravy)) return json({ chyba: "Zprávy musí končit dotazem uživatele." }, 400);
    if (JSON.stringify(zpravy).length + String(pokyn || "").length > MAX_ZNAKU_VSTUPU) return json({ chyba: "Dotaz je příliš dlouhý." }, 413);

    // Osobní údaje → značky (jedna mapa pro pokyn i celou konverzaci); mapa zůstává jen v paměti požadavku.
    const ps = vytvorPseudonymizaci();
    const [pokynP, ...textyP] = ps.pseudonymizujVse([String(pokyn || ""), ...zpravy.map((z) => z.text)]);
    const zpravyP = zpravy.map((z, i) => ({ role: z.role, text: textyP[i] }));
    const system = pokyn ? `${PRAVIDLA_PRAVDIVOSTI}\n\nRole v této úloze:\n${pokynP}` : PRAVIDLA_PRAVDIVOSTI;
    const t0 = ted(); // rezervace i vyrovnání patří do stejného období rozpočtu
    // Bez úložiště nejde ověřit rozpočet ani limit → AI se nevolá (kredity nesmí dojít ani přes panel majitele).
    let store, envM;
    try {
      store = await dejUloziste();
      if (!(await pricti(store, "limit/ai-majitel", 120, 10 * 60_000, t0))) return json({ chyba: "Příliš mnoho dotazů na AI za 10 minut. Zkuste to za chvíli." }, 429);
      envM = sCenami(sModely(env, (await nactiNastaveni(store)).modely)); // přepínač modelů v panelu (Blobs)
    } catch {
      return json({ chyba: "Rozpočet AI teď nejde ověřit (úložiště je nedostupné). Zkuste to za chvíli." }, 503);
    }
    if (!jeZapnuty(ai, envM)) return json({ chyba: `Chybí klíč ${POSKYTOVATELE[ai].klic} v Netlify.` }, 400);
    if (POSKYTOVATELE[ai].bezZdr && ps.pocet) {
      return json({ chyba: `${nazevAI(ai, envM)} je jen na neosobní podklady – dotaz obsahuje osobní údaje (${typyUdaju(ps.souhrn().typy)}). Pošlete ho AI se ZDR.` }, 422);
    }
    // Model bez ZDR: pseudonymizace nepozná jméno bez oslovení ani každou adresu → přísnější kontrola, raději odmítnout.
    const podezreni = POSKYTOVATELE[ai].bezZdr ? mozneOsobniUdaje([pokyn, ...zpravy.map((z) => z.text)].join("\n")) : [];
    if (podezreni.length) {
      return json({ chyba: `${nazevAI(ai, envM)} je jen na neosobní podklady – text možná obsahuje ${podezreni.join(" a ")}. Napište ho obecně (bez jmen a adres), nebo ho pošlete AI se ZDR.` }, 422);
    }
    const vstup = odhadTokenu(PRAVIDLA_PRAVDIVOSTI) + odhadTokenuKlienta(JSON.stringify(zpravy) + String(pokyn || ""));
    // Vlastní klíč poskytovatele nebo vlastní klíč OpenRouter = mimo kredity Netlify (rozpočet se nerezervuje).
    const vlastni = (id) => mimoKredity(id, envM);
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
    const doplnovac = vytvorDoplnovac(ps); // značky → původní údaje, jen v odpovědi panelu majitele
    const body = new ReadableStream({
      async start(ctrl) {
        const posli = (t) => { if (t) try { ctrl.enqueue(enc.encode(t)); } catch {} }; // klient mohl odejít (Zastavit)
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
            for await (const kus of vsechny[id].stream({ system, zpravy: zpravyP, maxTokenu, signal })) {
              if (kus.text) { if (!odeslano) clearTimeout(t); odeslano = true; posli(doplnovac.pridej(kus.text)); }
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
            posli(doplnovac.dokonci());
            posli("\n\u0000CHYBA" + JSON.stringify({ zprava: `Chyba ${nazevAI(id, envM)}${kod}: ${String(e?.message || e).slice(0, 300)}` }));
          }
          clearTimeout(t);
          posli(doplnovac.dokonci());
          if (stat) {
            try { await zapisUtratu(store, id, stat, envM, t0, rez, model, false, vlastni(id)); } catch { /* rezervace zůstane, odpověď doběhne */ }
            const kc = odhadKc(id, stat.vstup || 0, stat.vystup || 0, envM, model);
            posli("\n\u0000STAT" + JSON.stringify({ ...stat, kc: Math.round(kc * 100) / 100, model, ...(prevzal ? { prevzal, puvodni: ai } : {}), ...(vlastni(id) ? { vlastniKlic: true } : {}), ...(ps.pocet ? { pseudonymizovano: ps.pocet } : {}) }));
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
