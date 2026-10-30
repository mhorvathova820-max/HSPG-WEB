// HSPG AI Gateway – MCP server (Model Context Protocol, transport Streamable HTTP) pro Claude majitele (úkol 59).
// Jedna brána = jeden konektor: Claude (claude.ai, Cowork, Chrome, Desktop, Claude Code, Managed Agents)
// se přes ni ptá ostatních AI – ChatGPT, Grok, Gemini, Perplexity, Mistral, DeepSeek, Llama – a hledá přes
// You.com. Všechno jde stávající cestou webu: role a klíče z poskytovatele.mjs (vlastní klíč OpenRouter se ZDR,
// jinak Netlify AI Gateway), pseudonymizace před každým externím modelem, rozpočet a limity z limity.mjs,
// rada AI z rada.mjs. Knihovna je čistá (bez HTTP) – funkce netlify/functions/mcp.mjs řeší cesty a autorizaci.
// Loguje se jen nástroj, role, stav a čas – nikdy text dotazu ani odpovědi.
import { POSKYTOVATELE, jeZapnuty, vytvorAdaptery, sModely, nazevAI, mimoKredity, sCenami, cestaRole, sLimitem } from "./poskytovatele.mjs";
import { PRAVIDLA_PRAVDIVOSTI } from "./pravidla.mjs";
import { zapisUtratu, odhadKc, rezervuj, odhadTokenu, odhadTokenuKlienta, mesicniLimitKc, nactiNastaveni, pricti, utrataMesice } from "./limity.mjs";
import { vytvorPseudonymizaci } from "./pseudonymizace.mjs";
import { poradaRady } from "./rada.mjs";
import { hledejYoucom, youcomNaText, youcomZapnuto, KLIC_YOUCOM } from "./youcom.mjs";

export const VERZE_PROTOKOLU = ["2025-06-18", "2025-03-26", "2024-11-05", "2025-11-25"];
export const VYCHOZI_VERZE = "2025-06-18";
export const INFO_SERVERU = { name: "hspg-ai-gateway", title: "HSPG AI Gateway", version: "1.0.0" };
export const POKYNY_SERVERU = `Brána AI majitele HSPG (hspg.cz). Nástroje se ptají jiných AI (ChatGPT, Grok, Gemini, Perplexity, Mistral, DeepSeek, Llama) a hledají na webu (You.com). Každý dotaz se před odesláním pseudonymizuje (osobní údaje → značky [EMAIL_1]…), odpověď přijde doplněná zpět. Každé volání stojí peníze a počítá se do rozpočtu AI – ptej se cíleně, nejdřív ai_stav, když nevíš, co je zapnuté. Fakta z webu (Perplexity, You.com) jsou podklad k ověření, ne schválené znalosti HSPG.`;

// Role dostupné přes bránu: všechny se ZDR (Muse Wonder bez ZDR zůstává jen v panelu majitele).
export const ROLE_MCP = Object.keys(POSKYTOVATELE).filter((id) => !POSKYTOVATELE[id].bezZdr);
const RADA_VYCHOZI = ["claude", "gpt", "argon", "grok"];
const RADA_MAX_CLENU = 6;
const MAX_TOKENU = 8000;
const MAX_ZNAKU = 60_000;
// Streamovaná funkce Netlify smí běžet nejvýš 60 s (dokumentace Netlify, Functions API → Streaming responses):
// jeden dotaz nejvýš 45 s (MCP_LIMIT_MS), opakování jen do společné hranice 55 s; rada 24 s na volání
// (MCP_RADA_LIMIT_MS – členové paralelně, pak předseda), bez opakování.
const LIMIT_MS = 45_000;
const LIMIT_RADA_MS = 24_000;
const HRANICE_MS = 55_000;
const MIN_ZBYTEK_MS = 3_000;
const BEZ_OPAKOVANI = new Set([400, 401, 402, 403, 404, 413, 422]);
const LIMIT_VOLANI = { klic: "limit/ai-majitel", pocet: 120, oknoMs: 10 * 60_000 }; // společný s panelem majitele

const POKYN_BRANA = `Odpovídáš přes bránu HSPG AI Gateway jiné AI (Claude majitele), ne zákazníkovi. Buď věcný a strukturovaný, odděl ověřená fakta od odhadů. Značky v hranatých závorkách jako [JMENO_1] nebo [EMAIL_1] zastupují osobní údaje – ponech je beze změny a nic za ně nedosazuj.`;
const POKYN_PERPLEXITY = `Hledej na webu a odpověz jen z nalezených zdrojů. U každého podstatného tvrzení uveď zdroj (URL). Když nic spolehlivého nenajdeš, řekni to – nic nedomýšlej.`;

const loguj = (data) => console.warn(JSON.stringify({ udalost: "mcp", ...data, cas: new Date().toISOString() }));
const kc2 = (x) => Math.round(x * 100) / 100;
const textChyby = (e) => `${e?.status ? `(${e.status}) ` : ""}${String(e?.message || e || "chyba").slice(0, 300)}`;
const chybaNastroje = (text, data) => ({ content: [{ type: "text", text }], isError: true, ...(data ? { structuredContent: data } : {}) });
const vysledek = (text, data) => ({ content: [{ type: "text", text }], ...(data ? { structuredContent: data } : {}) });

const popisRoli = () => ROLE_MCP.map((id) => `${id} = ${POSKYTOVATELE[id].nazev}`).join(", ");

export const NASTROJE = [
  {
    name: "ai_zeptat",
    title: "Zeptat se jiné AI",
    description: `Položí jeden dotaz zvolené AI přes bránu HSPG (vlastní klíče majitele nebo OpenRouter se ZDR). Role: ${popisRoli()}. Dotaz se pseudonymizuje, odpověď se doplní zpět. Vrací text odpovědi, model a odhad ceny v Kč.`,
    inputSchema: {
      type: "object",
      properties: {
        ai: { type: "string", enum: ROLE_MCP, description: "Role AI (např. gpt = ChatGPT, grok = Grok, perplexity = Perplexity Sonar, argon = Gemini Argon)." },
        dotaz: { type: "string", description: "Otázka nebo zadání (nejvýš 60 000 znaků)." },
        pokyn: { type: "string", description: "Volitelná role/instrukce pro model (např. „Jsi oponent, hledej slabiny návrhu“)." },
        maxTokenu: { type: "integer", minimum: 256, maximum: MAX_TOKENU, description: "Strop délky odpovědi (výchozí 4000)." },
      },
      required: ["ai", "dotaz"],
      additionalProperties: false,
    },
  },
  {
    name: "perplexity_hledat",
    title: "Perplexity – hledání na webu",
    description: "Dotaz pro Perplexity Sonar (hledání na webu se zdroji). Fakta z webu jsou podklad k ověření, ne schválené znalosti HSPG. Dotaz se pseudonymizuje.",
    inputSchema: {
      type: "object",
      properties: {
        dotaz: { type: "string", description: "Co hledat – konkrétně, s kontextem (trh, země, období)." },
        maxTokenu: { type: "integer", minimum: 256, maximum: MAX_TOKENU, description: "Strop délky odpovědi (výchozí 2500)." },
      },
      required: ["dotaz"],
      additionalProperties: false,
    },
  },
  {
    name: "youcom_hledat",
    title: "You.com – vyhledávač",
    description: `Hledání na webu přes You.com (výsledky: název, adresa, stáří, úryvek). Potřebuje klíč ${KLIC_YOUCOM} v Netlify; bez něj nástroj poradí oficiální konektor You.com. Dotaz se pseudonymizuje.`,
    inputSchema: {
      type: "object",
      properties: {
        dotaz: { type: "string", description: "Hledaný výraz (nejvýš 500 znaků)." },
        pocet: { type: "integer", minimum: 1, maximum: 20, description: "Počet výsledků (výchozí 10)." },
        cerstvost: { type: "string", enum: ["day", "week", "month", "year"], description: "Jen stránky z posledního dne/týdne/měsíce/roku." },
        zeme: { type: "string", pattern: "^[A-Z]{2}$", description: "Země (výchozí CZ)." },
        jazyk: { type: "string", pattern: "^[a-z]{2}(-[A-Z]{2})?$", description: "Jazyk (výchozí cs)." },
      },
      required: ["dotaz"],
      additionalProperties: false,
    },
  },
  {
    name: "rada_ai",
    title: "Rada AI – více názorů a shrnutí",
    description: `Stejný dotaz paralelně více AI (výchozí ${RADA_VYCHOZI.join(", ")}; nejvýš ${RADA_MAX_CLENU}), pak předseda Claude sepíše shodu, rozdíly a doporučení. Dražší než jeden dotaz – používej na rozhodnutí, texty a oponenturu.`,
    inputSchema: {
      type: "object",
      properties: {
        dotaz: { type: "string", description: "Zadání pro radu." },
        role: { type: "array", items: { type: "string", enum: ROLE_MCP }, maxItems: RADA_MAX_CLENU, description: `Členové rady (výchozí ${RADA_VYCHOZI.join(", ")}).` },
        pokyn: { type: "string", description: "Volitelná role/instrukce pro všechny členy." },
        maxTokenu: { type: "integer", minimum: 256, maximum: 4000, description: "Strop délky odpovědi každého člena (výchozí 3000)." },
      },
      required: ["dotaz"],
      additionalProperties: false,
    },
  },
  {
    name: "ai_stav",
    title: "Stav brány AI",
    description: "Které role mají klíč a kudy jedou (vlastní klíč / OpenRouter / Netlify AI Gateway), útrata a limit rozpočtu AI za období, zda je zapnutý You.com. Klíče samotné nikdy nevrací. Zdarma.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

const jeObjekt = (x) => x && typeof x === "object" && !Array.isArray(x);
const retezec = (v, n) => (typeof v === "string" ? v.slice(0, n) : "");
const celeCislo = (v, min, max, vychozi) => (Number.isFinite(Number(v)) && v !== null && v !== "" ? Math.min(max, Math.max(min, Math.floor(Number(v)))) : vychozi);

export function vytvorMcp({ env = process.env, adaptery, dejUloziste, ted = () => Date.now(), fetch: f } = {}) {
  if (typeof dejUloziste !== "function") throw new Error("vytvorMcp: chybí dejUloziste().");
  const limitMs = () => (Number(env.MCP_LIMIT_MS) > 0 ? Number(env.MCP_LIMIT_MS) : LIMIT_MS);
  const limitRadaMs = () => (Number(env.MCP_RADA_LIMIT_MS) > 0 ? Number(env.MCP_RADA_LIMIT_MS) : LIMIT_RADA_MS);
  const hraniceMs = () => Math.max(limitMs(), Number(env.MCP_HRANICE_MS) > 0 ? Number(env.MCP_HRANICE_MS) : HRANICE_MS);

  // Společná příprava: limit volání (120 / 10 min, společný s panelem), modely z přepínače v panelu, ceny.
  async function priprav(pocetVolani = 1) {
    const t0 = ted();
    let store;
    try { store = await dejUloziste(); } catch { throw Object.assign(new Error("Rozpočet AI teď nejde ověřit (úložiště je nedostupné). Zkuste to za chvíli."), { status: 503 }); }
    for (let i = 0; i < pocetVolani; i++) {
      if (!(await pricti(store, LIMIT_VOLANI.klic, LIMIT_VOLANI.pocet, LIMIT_VOLANI.oknoMs, t0))) {
        throw Object.assign(new Error("Příliš mnoho dotazů na AI za 10 minut (limit 120 společný s panelem majitele). Zkuste to za chvíli."), { status: 429 });
      }
    }
    const envM = sCenami(sModely(env, (await nactiNastaveni(store)).modely));
    return { t0, store, envM, vsechny: adaptery || vytvorAdaptery(envM) };
  }

  // Jeden dotaz jedné roli: rezervace rozpočtu → dotaz s limitem → vyrovnání; jedno opakování při přechodné chybě.
  async function zeptejSe({ ai, dotaz, pokyn = "", maxTokenu = 4000, signal }) {
    if (!ROLE_MCP.includes(ai)) throw Object.assign(new Error(`Neznámá role „${ai}“. Dostupné: ${ROLE_MCP.join(", ")}.`), { status: 400 });
    const text = retezec(dotaz, MAX_ZNAKU + 1).trim();
    if (!text) throw Object.assign(new Error("Dotaz je prázdný."), { status: 400 });
    if (text.length + String(pokyn).length > MAX_ZNAKU) throw Object.assign(new Error("Dotaz je příliš dlouhý (nejvýš 60 000 znaků)."), { status: 413 });
    const { t0, store, envM, vsechny } = await priprav(1);
    if (!jeZapnuty(ai, envM)) throw Object.assign(new Error(`${nazevAI(ai, envM)} nemá v Netlify klíč (${POSKYTOVATELE[ai].klic}${POSKYTOVATELE[ai].openrouter ? " nebo HSPG_KLIC_OPENROUTER" : ""}).`), { status: 400 });
    const ps = vytvorPseudonymizaci();
    const [pokynP, dotazP] = ps.pseudonymizujVse([String(pokyn || ""), text]);
    const system = [PRAVIDLA_PRAVDIVOSTI, POKYN_BRANA, pokynP && `Role v této úloze:\n${pokynP}`].filter(Boolean).join("\n\n");
    const zpravy = [{ role: "user", text: dotazP }];
    const model = POSKYTOVATELE[ai].model(envM);
    const vlastni = mimoKredity(ai, envM);
    const vstup = odhadTokenu(system) + odhadTokenuKlienta(dotazP);
    const adapter = vsechny[ai];
    if (!adapter) throw Object.assign(new Error(`Adaptér role ${ai} chybí.`), { status: 500 });
    let posledni = null;
    let rez = null; // rezervace rozpočtu; po vrácení (odmítnutí poskytovatelem) se před opakováním udělá nová
    const start = Date.now();
    const konec = start + hraniceMs(); // společná hranice pro první pokus i opakování (limit streamované funkce)
    for (let pokus = 1; pokus <= 2; pokus++) {
      const zbyva = Math.min(limitMs(), konec - Date.now());
      if (pokus > 1 && zbyva < Math.min(MIN_ZBYTEK_MS, limitMs() / 2)) break; // na opakování už není čas
      if (rez === null) {
        try { rez = await rezervuj(store, ai, vstup, maxTokenu, envM, t0, model, false, vlastni); } catch { throw Object.assign(new Error("Rozpočet AI teď nejde ověřit (úložiště je nedostupné)."), { status: 503 }); }
        if (rez === false) throw Object.assign(new Error(`Měsíční rozpočet AI (${mesicniLimitKc(envM)} Kč, proměnná AI_MESICNI_LIMIT_KC) by se překročil – dotaz neodešel.`), { status: 402 });
      }
      try {
        const r = await sLimitem(zbyva, (s) => adapter.dotaz({ system, zpravy, maxTokenu, signal: signal ? AbortSignal.any([s, signal]) : s }));
        const stat = { vstup: r?.stat?.vstup || 0, vystup: r?.stat?.vystup || 0 };
        try { await zapisUtratu(store, ai, stat, envM, t0, rez, model, false, vlastni); } catch { /* rezervace zůstane */ }
        rez = null; // vyrovnáno – případné opakování (prázdná odpověď) si rezervuje znovu
        const odpoved = ps.doplnZpet(String(r?.text || "").trim());
        if (!odpoved) { posledni = Object.assign(new Error("prázdná odpověď"), { status: 204 }); continue; }
        const kc = kc2(odhadKc(ai, stat.vstup, stat.vystup, envM, r?.stat?.model || model));
        loguj({ nastroj: "ai_zeptat", ai, model: r?.stat?.model || model, stav: "ok", ms: Date.now() - start, pokus });
        return { text: odpoved, meta: { ai, nazev: nazevAI(ai, envM), model: r?.stat?.model || model, cesta: cestaRole(ai, envM), vstup: stat.vstup, vystup: stat.vystup, kc, vlastniKlic: vlastni, pseudonymizovano: ps.pocet } };
      } catch (e) {
        posledni = e;
        // Odmítnuto poskytovatelem dřív, než cokoli vygeneroval → nic neúčtoval, rezervace se vrátí (504/422 ne –
        // tokeny mohly být účtované, rezervace zůstane a opakování jede na ni).
        if (e?.status >= 400 && e.status <= 599 && e.status !== 504 && e.status !== 422) {
          try { await zapisUtratu(store, ai, { vstup: 0, vystup: 0 }, envM, t0, rez, model, false, vlastni); rez = null; } catch {}
        }
        if (signal?.aborted || BEZ_OPAKOVANI.has(e?.status)) break;
      }
    }
    loguj({ nastroj: "ai_zeptat", ai, model, stav: "chyba", duvod: posledni?.status || "vyjimka", ms: Date.now() - start });
    throw Object.assign(new Error(`${nazevAI(ai, envM)} neodpověděl: ${textChyby(posledni)}`), { status: posledni?.status || 502 });
  }

  const shrnutiMeta = (m) => `— ${m.nazev} (${m.model}) · ${m.vstup}/${m.vystup} tokenů · ≈ ${m.kc} Kč ${m.vlastniKlic ? "(vlastní klíč, mimo kredity Netlify)" : "(kredity Netlify)"}${m.pseudonymizovano ? ` · pseudonymizováno ${m.pseudonymizovano}` : ""}`;

  async function nastrojAiZeptat(a, signal) {
    const { text, meta } = await zeptejSe({ ai: retezec(a.ai, 40), dotaz: a.dotaz, pokyn: retezec(a.pokyn, 8000), maxTokenu: celeCislo(a.maxTokenu, 256, MAX_TOKENU, 4000), signal });
    return vysledek(`${text}\n\n${shrnutiMeta(meta)}`, meta);
  }

  async function nastrojPerplexity(a, signal) {
    const { text, meta } = await zeptejSe({ ai: "perplexity", dotaz: a.dotaz, pokyn: POKYN_PERPLEXITY, maxTokenu: celeCislo(a.maxTokenu, 256, MAX_TOKENU, 2500), signal });
    return vysledek(`${text}\n\n${shrnutiMeta(meta)}`, meta);
  }

  async function nastrojYoucom(a, signal) {
    if (!youcomZapnuto(env)) {
      return chybaNastroje(`You.com není zapnutý: chybí ${KLIC_YOUCOM} v Netlify (klíč z https://you.com/platform). Alternativa bez klíče: oficiální konektor You.com v claude.ai (URL https://api.you.com/mcp).`, { zapnuto: false });
    }
    const dotaz = retezec(a.dotaz, 500).trim();
    if (!dotaz) throw Object.assign(new Error("Dotaz je prázdný."), { status: 400 });
    await priprav(1); // limit volání; You.com účtuje sám (mimo rozpočet kreditů)
    const ps = vytvorPseudonymizaci();
    const [dotazP] = ps.pseudonymizujVse([dotaz]);
    const start = Date.now();
    try {
      const v = await sLimitem(Math.min(limitMs(), 20_000), (s) => hledejYoucom({ dotaz: dotazP, pocet: celeCislo(a.pocet, 1, 20, 10), cerstvost: retezec(a.cerstvost, 10), zeme: retezec(a.zeme, 2) || "CZ", jazyk: retezec(a.jazyk, 5) || "cs" }, env, { fetch: f, signal: signal ? AbortSignal.any([s, signal]) : s }));
      loguj({ nastroj: "youcom_hledat", stav: "ok", vysledku: v.vysledky.length, ms: Date.now() - start });
      return vysledek(youcomNaText(v), { dotaz: v.dotaz, vysledky: v.vysledky, pseudonymizovano: ps.pocet });
    } catch (e) {
      loguj({ nastroj: "youcom_hledat", stav: "chyba", duvod: e?.status || "vyjimka", ms: Date.now() - start });
      throw Object.assign(new Error(`You.com neodpověděl: ${textChyby(e)}`), { status: e?.status || 502 });
    }
  }

  async function nastrojRada(a, signal) {
    const text = retezec(a.dotaz, MAX_ZNAKU + 1).trim();
    if (!text) throw Object.assign(new Error("Dotaz je prázdný."), { status: 400 });
    const pokyn = retezec(a.pokyn, 8000);
    if (text.length + pokyn.length > MAX_ZNAKU) throw Object.assign(new Error("Dotaz je příliš dlouhý (nejvýš 60 000 znaků)."), { status: 413 });
    const role = [...new Set(Array.isArray(a.role) && a.role.length ? a.role.map((r) => retezec(r, 40)) : RADA_VYCHOZI)];
    if (role.length > RADA_MAX_CLENU || role.some((id) => !ROLE_MCP.includes(id))) throw Object.assign(new Error(`Neznámá role nebo víc než ${RADA_MAX_CLENU} členů rady. Dostupné: ${ROLE_MCP.join(", ")}.`), { status: 400 });
    const maxTokenu = celeCislo(a.maxTokenu, 256, 4000, 3000);
    const { t0, store, envM, vsechny } = await priprav(role.length + 1);
    const zapnute = role.filter((id) => jeZapnuty(id, envM));
    if (!zapnute.length) throw Object.assign(new Error("Žádná ze zvolených AI nemá v Netlify klíč."), { status: 400 });
    const clen = (id) => ({ id, nazev: nazevAI(id, envM), model: POSKYTOVATELE[id].model(envM), adapter: vsechny[id], zdr: true, ...(id === "argon" ? { minTokenu: 4000 } : {}) });
    const predseda = jeZapnuty("claude", envM) ? clen("claude") : null;
    const ps = vytvorPseudonymizaci();
    const rozpocet = {
      rezervuj: (c, vstupT, maxT) => rezervuj(store, c.id, vstupT, maxT, envM, t0, c.model, false, mimoKredity(c.id, envM)),
      vyrovnej: (c, stat, rez) => zapisUtratu(store, c.id, stat, envM, t0, rez, c.model, false, mimoKredity(c.id, envM)),
    };
    const start = Date.now();
    let v;
    try {
      // Bez opakování: členové paralelně (≤ 24 s) a pak předseda (≤ 24 s) se musí vejít do 60 s streamované funkce.
      v = await poradaRady({ zpravy: [{ role: "user", text }], pokyn, clenove: zapnute.map(clen), predseda, maxTokenu, casLimitMs: limitRadaMs(), opakovani: 0, rozpocet, signal, pseudonymizace: ps });
    } catch (e) {
      loguj({ nastroj: "rada_ai", role: zapnute, stav: "chyba", duvod: e?.status || "vyjimka", ms: Date.now() - start });
      throw Object.assign(new Error(`Rada se nedokončila: ${textChyby(e)}`), { status: e?.status || 502 });
    }
    const zpet = (s) => ps.doplnZpet(String(s ?? ""));
    let kcCelkem = 0;
    const clenove = v.clenove.map((c) => {
      const kc = c.stat ? kc2(odhadKc(c.id, c.stat.vstup, c.stat.vystup, envM, c.modelPouzity || c.model)) : 0;
      kcCelkem += kc;
      return { id: c.id, nazev: c.nazev, model: c.modelPouzity || c.model, ok: Boolean(c.ok), ...(c.ok ? { text: zpet(c.text), kc } : { chyba: c.chyba || c.vynechano || "bez odpovědi" }) };
    });
    const p = v.predseda;
    const kcP = p?.stat ? kc2(odhadKc(p.id, p.stat.vstup, p.stat.vystup, envM, p.model)) : 0;
    kcCelkem += kcP;
    const predsedaVystup = p?.ok
      ? { ok: true, id: p.id, nazev: p.nazev, nahradni: Boolean(p.nahradni), shoda: (p.shoda || []).map(zpet), rozdily: (p.rozdily || []).map(zpet), doporuceni: zpet(p.doporuceni), ...(p.text ? { text: zpet(p.text) } : {}), kc: kcP }
      : { ok: false, duvod: p?.preskoceno || p?.chyba || "předseda neodpověděl" };
    const vypnute = role.filter((id) => !zapnute.includes(id));
    loguj({ nastroj: "rada_ai", role: zapnute, predseda: p?.id || null, odpovedelo: clenove.filter((c) => c.ok).length, stav: "hotovo", ms: Date.now() - start });
    const radky = [
      `RADA AI – ${clenove.filter((c) => c.ok).length}/${clenove.length} členů odpovědělo${vypnute.length ? ` (bez klíče: ${vypnute.join(", ")})` : ""}:`,
      ...clenove.map((c) => (c.ok ? `\n=== ${c.nazev} (${c.model}) · ≈ ${c.kc} Kč ===\n${c.text}` : `\n=== ${c.nazev} ===\n[bez odpovědi: ${c.chyba}]`)),
      predsedaVystup.ok
        ? `\n=== PŘEDSEDA ${predsedaVystup.nazev}${predsedaVystup.nahradni ? " (náhradní)" : ""} · ≈ ${predsedaVystup.kc} Kč ===\nShoda:\n${predsedaVystup.shoda.map((s) => `- ${s}`).join("\n") || "- (nic)"}\nRozdíly:\n${predsedaVystup.rozdily.map((s) => `- ${s}`).join("\n") || "- (nic)"}\nDoporučení: ${predsedaVystup.doporuceni || predsedaVystup.text || "(bez doporučení)"}`
        : `\n=== PŘEDSEDA ===\n[${predsedaVystup.duvod}]`,
      `\n— celkem ≈ ${kc2(kcCelkem)} Kč · ${v.stat.dotazu} volání${ps.pocet ? ` · pseudonymizováno ${ps.pocet}` : ""}`,
    ];
    return vysledek(radky.join("\n"), { clenove, predseda: predsedaVystup, stat: { ...v.stat, kc: kc2(kcCelkem) }, pseudonymizovano: ps.pocet });
  }

  async function nastrojStav() {
    let utrata = null, nastaveni = null;
    try {
      const store = await dejUloziste();
      utrata = await utrataMesice(store, ted(), env);
      nastaveni = await nactiNastaveni(store);
    } catch { /* stav i bez útraty */ }
    const envM = sModely(env, nastaveni?.modely);
    const role = ROLE_MCP.map((id) => ({ id, nazev: nazevAI(id, envM), zapnuto: jeZapnuty(id, envM), model: POSKYTOVATELE[id].model(envM), cesta: cestaRole(id, envM), ...(POSKYTOVATELE[id].jenMajitel ? { jenMajitel: true } : {}) }));
    const data = { role, youcom: youcomZapnuto(env), limitKc: mesicniLimitKc(env), utrata: utrata ? { celkemKc: kc2(utrata.celkemKc), vlastniKc: kc2(utrata.vlastniKc || 0) } : null };
    const text = [
      "Role přes bránu (zapnuto = má klíč):",
      ...role.map((r) => `- ${r.id} (${r.nazev}): ${r.zapnuto ? "zapnuto" : "VYPNUTO"} · ${r.model} · ${r.cesta}`),
      `You.com: ${data.youcom ? "zapnuto" : `vypnuto (chybí ${KLIC_YOUCOM})`}`,
      utrata ? `Rozpočet AI za období: ${data.utrata.celkemKc} Kč z ${data.limitKc} Kč (kredity Netlify); mimo kredity (vlastní klíče): ≈ ${data.utrata.vlastniKc} Kč` : `Rozpočet AI: limit ${data.limitKc} Kč (útrata teď nejde načíst)`,
    ].join("\n");
    return vysledek(text, data);
  }

  const NASTROJ = { ai_zeptat: nastrojAiZeptat, perplexity_hledat: nastrojPerplexity, youcom_hledat: nastrojYoucom, rada_ai: nastrojRada, ai_stav: nastrojStav };

  // Jedna zpráva JSON-RPC → odpověď (objekt) nebo null (oznámení bez odpovědi). Nikdy nevyhazuje.
  async function zpracuj(z, { signal } = {}) {
    const id = jeObjekt(z) && (typeof z.id === "string" || typeof z.id === "number") ? z.id : null;
    const chyba = (code, message, data) => (id === null ? null : { jsonrpc: "2.0", id, error: { code, message, ...(data ? { data } : {}) } });
    if (!jeObjekt(z) || z.jsonrpc !== "2.0" || typeof z.method !== "string") return { jsonrpc: "2.0", id, error: { code: -32600, message: "Neplatný požadavek JSON-RPC 2.0." } };
    const params = jeObjekt(z.params) ? z.params : {};
    const jeOznameni = z.id === undefined;
    try {
      switch (z.method) {
        case "initialize": {
          const pozadovana = String(params.protocolVersion || "");
          return { jsonrpc: "2.0", id, result: { protocolVersion: VERZE_PROTOKOLU.includes(pozadovana) ? pozadovana : VYCHOZI_VERZE, capabilities: { tools: { listChanged: false } }, serverInfo: INFO_SERVERU, instructions: POKYNY_SERVERU } };
        }
        case "ping":
          return jeOznameni ? null : { jsonrpc: "2.0", id, result: {} };
        case "tools/list":
          return jeOznameni ? null : { jsonrpc: "2.0", id, result: { tools: NASTROJE } };
        case "tools/call": {
          if (jeOznameni) return null;
          const nazev = String(params.name || "");
          const fn = NASTROJ[nazev];
          if (!fn) return chyba(-32602, `Neznámý nástroj „${nazev}“.`);
          const argumenty = jeObjekt(params.arguments) ? params.arguments : {};
          try {
            return { jsonrpc: "2.0", id, result: await fn(argumenty, signal) };
          } catch (e) {
            // Chyba nástroje (klíč, rozpočet, limit, poskytovatel) jde jako výsledek s isError – AI ji vidí a řekne majiteli.
            return { jsonrpc: "2.0", id, result: chybaNastroje(String(e?.message || e).slice(0, 600), { status: e?.status || null }) };
          }
        }
        default:
          if (z.method.startsWith("notifications/")) return null;
          return chyba(-32601, `Metoda „${z.method}“ není podporovaná.`);
      }
    } catch (e) {
      return chyba(-32603, "Vnitřní chyba brány.", { stav: e?.status || null });
    }
  }

  return { zpracuj, nastroje: NASTROJE, zeptejSe };
}
