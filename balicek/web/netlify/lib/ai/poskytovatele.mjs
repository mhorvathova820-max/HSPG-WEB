// Adaptéry AI. Každá AI se zapne sama, jakmile má klíč; model jde přepsat proměnnou.
// Netlify AI Gateway klíče a adresy (ANTHROPIC_*, OPENAI_*, GEMINI_API_KEY + GOOGLE_GEMINI_BASE_URL,
// OPENROUTER_*) do funkcí vkládá sám a účtuje v kreditech Netlify; vlastní klíč v Netlify má přednost.
// Gateway nepředává hlavičky požadavků, proto se přes ni nepoužívají beta funkce (např. fallbacks).
// Rozhraní adaptéru:
//   dotaz({ system, zpravy, maxTokenu, signal, rychle }) -> { text, stat: { vstup, vystup, cena?, model? } }
//   stream({ system, zpravy, maxTokenu, signal }) -> async iterator { text } | { stat }
//   (cena = usage.cost od OpenRouter v jeho kreditech, model = skutečně použitý model – jen když je pošle)
// zpravy = [{ role: "user" | "assistant", text }]
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

// Vlastní klíče majitele (rozhodnutí 9. 10. 2026): role, která má v Netlify vlastní klíč, běží přímo
// u svého poskytovatele (účtuje poskytovatel, ne kredity Netlify). Bez vlastního klíče jede jako dosud
// přes Netlify AI Gateway. Jména se záměrně liší od proměnných Gateway (ANTHROPIC_API_KEY …), aby se
// vlastní klíč nemíchal s adresou Gateway. xAI zatím bez vlastního klíče (XAI_API_KEY jako dřív).
export const VLASTNI_KLICE = {
  claude: { promenna: "HSPG_KLIC_ANTHROPIC", url: "https://api.anthropic.com" },
  gpt: { promenna: "HSPG_KLIC_OPENAI", url: "https://api.openai.com/v1" },
  gemini: { promenna: "HSPG_KLIC_GEMINI" },
  mistral: { promenna: "HSPG_KLIC_MISTRAL", url: "https://api.mistral.ai/v1" },
  llama: { promenna: "HSPG_KLIC_GROQ", url: "https://api.groq.com/openai/v1" },
  grok: { promenna: "XAI_API_KEY", url: "https://api.x.ai/v1" },
};
export const vlastniKlic = (id, env = process.env) => String(env[VLASTNI_KLICE[id]?.promenna] || "");

// Vlastní klíč OpenRouter majitele (rozhodnutí 22. 10. 2026): s ním jdou role přes OpenRouter přímo na
// openrouter.ai (účtuje OpenRouter, ne kredity Netlify) a v těle požadavku nesou směrování, které vynutí
// nulové uchovávání dat (provider.zdr) a zakáže sběr dat (provider.data_collection = "deny") – R10.
// Bez něj jedou jako dosud přes Netlify AI Gateway (OPENROUTER_API_KEY); Gateway sama pustí přes OpenRouter
// jen poskytovatele se ZDR (changelog Netlify 6. 8. 2026), tělo požadavku se tam nemění.
export const KLIC_OPENROUTER = "HSPG_KLIC_OPENROUTER";
export const OPENROUTER_PRIMO = "https://openrouter.ai/api/v1";
export const vlastniOpenRouter = (env = process.env) => String(env[KLIC_OPENROUTER] || "");

// Nejnovější modely na OpenRouter, ověřeno 22. 10. 2026 v /api/v1/models a /api/v1/endpoints/zdr.
// Výchozí jsou PŘIPNUTÉ modely se ZDR koncovými body; aliasy „~…-latest“ v seznamu ZDR nejsou – jen volitelné
// přepsání proměnnou (varovaniRole to v panelu ukáže). cenaUsd = vstup/výstup za milion tokenů, zaokrouhleno
// nahoru nad ceník OpenRouter (odhad rozpočtu má být spíš vyšší). Muse Wonder ZDR koncový bod nemá.
export const MODELY_OPENROUTER = {
  opus: { nazev: "Claude Opus", model: "anthropic/claude-opus-5.5", alias: "~anthropic/claude-opus-latest", zdr: true, cenaUsd: [5, 25] },
  astra: { nazev: "GPT Astra", model: "openai/gpt-6-astra", alias: "~openai/gpt-astra-latest", zdr: true, cenaUsd: [12, 60] },
  argon: { nazev: "Gemini Argon", model: "google/gemini-4-argon", alias: "~google/gemini-pro-latest", zdr: true, cenaUsd: [3, 12] },
  grok: { nazev: "Grok", model: "x-ai/grok-4.7", alias: "~x-ai/grok-latest", zdr: true, cenaUsd: [5, 15] },
  muse: { nazev: "Muse Wonder", model: "meta/muse-wonder", alias: null, zdr: false, cenaUsd: [5, 25] },
};

// Výchozí modely ověřené 9. 10. 2026 v dokumentaci poskytovatelů (R8: majitel má nejlepší modely):
// Anthropic claude-opus-5-5 aktivní (vyřazení nejdřív 22. 9. 2027); OpenAI gpt-6-astra = nejschopnější,
// gpt-5 (snapshot 2025-08-07) končí 11. 12. 2026; Google: 2.5 jen pro dřívější uživatele, novým projektům
// 3.8 Flash (nejschopnější stabilní, Pro jen preview); xAI grok-4.7 nejschopnější (grok-4 v dokumentaci není);
// Groq: Llama 4 vypnuté (9. 3. a 17. 7. 2026), llama-3.3 končí 16. 8. 2026 → openai/gpt-oss-120b (produkční).
// Mistral: přesné ID modelu dokumentace nepotvrdila – mistral-large-2512 (Large 3) ověř v konzoli Mistral.
// Cesta přes Gateway (bez vlastního klíče) má modely beze změny – podporu nových modelů v Gateway nešlo ověřit.
export const POSKYTOVATELE = {
  claude: { nazev: "Claude", klic: "ANTHROPIC_API_KEY", model: (env) => env.CLAUDE_MODEL || "claude-opus-5-5" },
  gpt: { nazev: "ChatGPT", klic: "OPENAI_API_KEY", model: (env) => env.OPENAI_MODEL || (vlastniKlic("gpt", env) ? "gpt-6-astra" : "gpt-5") },
  gemini: { nazev: "Gemini", klic: "GEMINI_API_KEY", model: (env) => env.GEMINI_MODEL || (vlastniKlic("gemini", env) ? "gemini-3.8-flash" : "gemini-2.5-pro") },
  // Grok: vlastní klíč xAI, jinak přes OpenRouter (Netlify AI Gateway ho nabízí jen u poskytovatelů se ZDR).
  // S vlastním klíčem OpenRouter nejnovější Grok 4.7 (ZDR u xAI); přes Gateway beze změny.
  grok: { nazev: "Grok", klic: "XAI_API_KEY", jinyKlic: "OPENROUTER_API_KEY", openrouter: true, model: (env) => env.XAI_MODEL || (env.XAI_API_KEY ? "grok-4.7" : vlastniOpenRouter(env) ? MODELY_OPENROUTER.grok.model : "x-ai/grok-4.5") },
  // Další AI jen pro majitele (panel a AI centrum), přes OpenRouter v Netlify AI Gateway – jen modely
  // s nulovým uchováváním dat (ZDR, ověřeno 4. 10. na openrouter.ai/api/v1/endpoints/zdr). Veřejný asistent
  // je nepoužívá (ASISTENT_PORADI). Klíč OPENROUTER_API_KEY dodává Gateway; model jde přepsat proměnnou.
  mistral: { nazev: "Mistral", klic: "OPENROUTER_API_KEY", openrouter: true, model: (env) => env.MISTRAL_MODEL || (vlastniKlic("mistral", env) ? "mistral-large-2512" : "mistralai/mistral-large-2512") },
  deepseek: { nazev: "DeepSeek", klic: "OPENROUTER_API_KEY", openrouter: true, model: (env) => env.DEEPSEEK_MODEL || "deepseek/deepseek-v4-flash" },
  // Role „llama“: s klíčem Groq běží u Groq – Llama tam pro nové zákazníky už není, proto GPT-OSS 120B
  // (název v panelu to říká, ať nikdo nečte odpověď jako Llamu).
  llama: { nazev: "Llama", nazevVlastni: "Groq · GPT-OSS 120B", klic: "OPENROUTER_API_KEY", openrouter: true, model: (env) => env.LLAMA_MODEL || (vlastniKlic("llama", env) ? "openai/gpt-oss-120b" : "meta-llama/llama-4-maverick") },
  // Perplexity hledá na webu – fakta z webu nejsou schválené znalosti HSPG, výsledky ber jako podklad k ověření.
  perplexity: { nazev: "Perplexity", klic: "OPENROUTER_API_KEY", openrouter: true, model: (env) => env.PERPLEXITY_MODEL || "perplexity/sonar-pro" },
  // Gemini 4 Argon (22. 10. 2026) – rešerše patentů a užitných vzorů pro majitele. Hledání na webu
  // (plugin OpenRouter) jen s HSPG_PATENTY_WEB=1 a vlastním klíčem OpenRouter; jen pro majitele (jenMajitel).
  argon: { nazev: "Gemini Argon", klic: "OPENROUTER_API_KEY", openrouter: true, jenMajitel: true, model: (env) => env.ARGON_MODEL || MODELY_OPENROUTER.argon.model },
  // Muse Wonder BEZ ZDR: jen majitel, jen neosobní podklady (dotaz s osobními údaji se neodešle), jen
  // s vlastním klíčem OpenRouter – Gateway modely bez ZDR nepustí. V požadavku aspoň data_collection = "deny".
  muse: { nazev: "Muse Wonder (bez ZDR)", klic: KLIC_OPENROUTER, openrouter: true, jenMajitel: true, bezZdr: true, model: (env) => env.MUSE_MODEL || MODELY_OPENROUTER.muse.model },
};
export const nazevAI = (id, env = process.env) => (vlastniKlic(id, env) && POSKYTOVATELE[id]?.nazevVlastni) || POSKYTOVATELE[id]?.nazev || id;

// Přepínač modelů v panelu (Blobs, bez nasazení): { claude: "claude-…", … } → proměnné modelů.
export const PROMENNA_MODELU = { claude: "CLAUDE_MODEL", gpt: "OPENAI_MODEL", gemini: "GEMINI_MODEL", grok: "XAI_MODEL", mistral: "MISTRAL_MODEL", deepseek: "DEEPSEEK_MODEL", llama: "LLAMA_MODEL", perplexity: "PERPLEXITY_MODEL", argon: "ARGON_MODEL", muse: "MUSE_MODEL" };
export const MODEL_RE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{1,79}$/;
export function sModely(env, modely) {
  const out = { ...env };
  for (const [id, m] of Object.entries(modely || {})) if (PROMENNA_MODELU[id] && MODEL_RE.test(String(m))) out[PROMENNA_MODELU[id]] = m;
  return out;
}

const OPENROUTER_URL = (env) => env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

const ZKRACENO = "\n\n[Odpověď byla zkrácena – dosažen limit délky.]";

// Rozhodnutí majitele (4. 10., varianta B): zákazníkům odpovídají levnější rychlé modely, majitel
// má v panelu ty nejlepší. Přepsat jde proměnnými ASISTENT_CLAUDE_MODEL / ASISTENT_GEMINI_MODEL /
// ASISTENT_OPENAI_MODEL / ASISTENT_XAI_MODEL. Všechny výchozí modely nabízí Netlify AI Gateway.
export function verejneEnv(env = process.env) {
  return {
    ...env,
    CLAUDE_MODEL: env.ASISTENT_CLAUDE_MODEL || "claude-sonnet-5-5",
    // Vlastní klíč = nový účet: Gemini 2.5 je jen pro dřívější uživatele, gpt-5-mini končí 11. 12. 2026.
    GEMINI_MODEL: env.ASISTENT_GEMINI_MODEL || (vlastniKlic("gemini", env) ? "gemini-3.5-flash-lite" : "gemini-2.5-flash"),
    OPENAI_MODEL: env.ASISTENT_OPENAI_MODEL || (vlastniKlic("gpt", env) ? "gpt-6-luna" : "gpt-5-mini"),
    ...(env.ASISTENT_XAI_MODEL ? { XAI_MODEL: env.ASISTENT_XAI_MODEL } : {}),
  };
}

export const jeZapnuty = (id, env = process.env) => {
  const p = POSKYTOVATELE[id];
  return Boolean(p && (vlastniKlic(id, env) || env[p.klic] || (p.jinyKlic && env[p.jinyKlic]) || (p.openrouter && vlastniOpenRouter(env))));
};

// Kudy role jede a kdo ji platí: "vlastni-klic" (vlastní klíč poskytovatele), "openrouter-vlastni"
// (vlastní klíč OpenRouter, přímo na openrouter.ai) nebo "gateway" (Netlify AI Gateway = kredity Netlify).
export function cestaRole(id, env = process.env) {
  if (vlastniKlic(id, env)) return "vlastni-klic"; // u Groku je vlastním klíčem XAI_API_KEY
  if (POSKYTOVATELE[id]?.openrouter && vlastniOpenRouter(env)) return "openrouter-vlastni";
  return "gateway";
}
// Volání mimo kredity Netlify (účtuje poskytovatel nebo OpenRouter) – do rozpočtu kreditů se nerezervuje.
export const mimoKredity = (id, env = process.env) => cestaRole(id, env) !== "gateway";

// Tělo požadavku navíc pro přímé volání openrouter.ai (ověřeno 22. 10. 2026 v dokumentaci OpenRouter:
// Provider Routing – provider.zdr (boolean) a provider.data_collection ("allow" | "deny"); Web Search –
// plugins: [{ id: "web", max_results }], výchozí 5 výsledků, u Google nativní hledání).
export function smerovaniOpenRouter({ zdr = true, web = false } = {}) {
  return {
    provider: zdr ? { zdr: true, data_collection: "deny" } : { data_collection: "deny" },
    ...(web ? { plugins: [{ id: "web", max_results: 5 }] } : {}),
  };
}
const smerovaniRole = (id, env) =>
  smerovaniOpenRouter({ zdr: !POSKYTOVATELE[id]?.bezZdr, web: id === "argon" && env.HSPG_PATENTY_WEB === "1" });

// Upozornění k roli pro panel majitele (texty bez hodnot klíčů).
export function varovaniRole(id, env = process.env) {
  const p = POSKYTOVATELE[id];
  if (!p) return [];
  const v = [];
  if (p.bezZdr) v.push("Bez ZDR (nulového uchovávání dat): jen neosobní podklady – dotaz s osobními údaji se neodešle.");
  if (p.openrouter && String(p.model(env)).startsWith("~")) {
    v.push("Model je alias nejnovější verze (~…): v seznamu ZDR není a jeho cíl se mění bez ohlášení – dotaz půjde jen na ZDR koncový bod vyřešeného modelu, jinak selže. Doporučený je připnutý model.");
  }
  if (id === "argon" && env.HSPG_PATENTY_WEB === "1") {
    v.push(cestaRole(id, env) === "openrouter-vlastni"
      ? "Hledání na webu je zapnuté: pseudonymizovaný dotaz jde i vyhledávači a OpenRouter ho účtuje zvlášť za každý dotaz."
      : "Hledání na webu funguje jen s vlastním klíčem OpenRouter (HSPG_KLIC_OPENROUTER); přes Netlify AI Gateway se nepoužije.");
  }
  return v;
}

// Odhad rozpočtu: limity.mjs nové modely OpenRouter nezná (počítal by nouzových 15/75 USD za milion
// tokenů). Pro role s připnutým modelem z MODELY_OPENROUTER doplní výchozí CENA_<ROLE>_VSTUP/_VYSTUP;
// proměnná nastavená v Netlify má přednost. role = [[id, model], …] (výchozí všechny role webu).
const CENY_OPENROUTER = Object.fromEntries(Object.values(MODELY_OPENROUTER).map((m) => [m.model, m.cenaUsd]));
export function sCenami(env, role = Object.keys(POSKYTOVATELE).map((id) => [id, POSKYTOVATELE[id].model(env)])) {
  const out = { ...env };
  for (const [id, model] of role) {
    const c = CENY_OPENROUTER[model];
    if (!c) continue;
    const k = String(id).toUpperCase();
    if (out[`CENA_${k}_VSTUP`] === undefined) out[`CENA_${k}_VSTUP`] = String(c[0]);
    if (out[`CENA_${k}_VYSTUP`] === undefined) out[`CENA_${k}_VYSTUP`] = String(c[1]);
  }
  return out;
}

// Běží Claude přes Netlify AI Gateway (nebo jinou proxy), a ne přímo na api.anthropic.com?
export const pres_gateway = (env) => !vlastniKlic("claude", env) && Boolean(env.ANTHROPIC_BASE_URL && !/^https:\/\/api\.anthropic\.com\/?$/.test(env.ANTHROPIC_BASE_URL));

// --- Claude ---
export function claudeParametry({ system, zpravy, maxTokenu, rychle }, env) {
  const model = POSKYTOVATELE.claude.model(env);
  // Haiku 4.5 nepodporuje adaptivní uvažování ani effort – jede bez nich.
  const haiku = /^claude-haiku/.test(model);
  const zaklad = {
    model,
    max_tokens: maxTokenu,
    ...(haiku ? {} : {
      thinking: { type: "adaptive" },
      // Veřejné odpovědi musí být rychlé; interní úlohy smí přemýšlet víc.
      output_config: { effort: rychle ? "low" : "medium" },
    }),
    system,
    messages: zpravy.map((z) => ({ role: z.role, content: z.text })),
  };
  // Přímo na API: když Claude dotaz odmítne, API ho samo zkusí na záložním modelu (beta hlavička).
  // Přes Gateway hlavičky neprojdou – parametr by skončil chybou 400, proto se vynechá.
  return pres_gateway(env) ? zaklad : { ...zaklad, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" };
}
const claudeKlient = (env) => vlastniKlic("claude", env)
  ? new Anthropic({ apiKey: vlastniKlic("claude", env), baseURL: VLASTNI_KLICE.claude.url, maxRetries: 0 })
  : new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, baseURL: env.ANTHROPIC_BASE_URL || undefined, maxRetries: 0 });
const claudeVolani = (env) => (pres_gateway(env) ? claudeKlient(env).messages : claudeKlient(env).beta.messages);

const claude = (env) => ({
  async dotaz(p) {
    const m = await claudeVolani(env).create(claudeParametry(p, env), { signal: p.signal });
    if (m.stop_reason === "refusal") throw Object.assign(new Error("Claude dotaz odmítl."), { status: 422 });
    const text = m.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    return { text, stat: { vstup: m.usage.input_tokens, vystup: m.usage.output_tokens } };
  },
  async *stream(p) {
    const s = claudeVolani(env).stream(claudeParametry(p, env), { signal: p.signal });
    for await (const ev of s) {
      if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") yield { text: ev.delta.text };
    }
    const m = await s.finalMessage();
    if (m.stop_reason === "refusal") yield { text: "\n\n[Claude dotaz odmítl zpracovat.]" };
    if (m.stop_reason === "max_tokens") yield { text: ZKRACENO };
    yield { stat: { vstup: m.usage.input_tokens, vystup: m.usage.output_tokens } };
  },
});

// --- ChatGPT, Grok a AI přes OpenRouter (stejné rozhraní OpenAI, jiná adresa) ---
// volby: extra = pole těla navíc (směrování OpenRouter), model = funkce vracející model, fetch = pro testy.
// OpenRouter v usage vrací i cost (kredity OpenRouter) a v poli model skutečně použitý model – jdou do stat.
const openaiKompatibilni = (env, id, apiKey, baseURL, { extra = {}, model = () => POSKYTOVATELE[id].model(env), fetch } = {}) => {
  const klient = () => new OpenAI({ apiKey, baseURL, maxRetries: 0, ...(fetch ? { fetch } : {}) });
  // Uvažující modely (gpt-5…, o3…) počítají tokeny uvažování do max_completion_tokens – pro rychlé
  // veřejné odpovědi proto nízké uvažování, jinak by odpověď mohla zůstat prázdná.
  // gpt-6-luna podle dokumentace bez uvažování (none), ostatní uvažující modely nízce.
  const uvazovani = (p) => {
    const m = model();
    if (!p.rychle || !/^(gpt-[56]|o\d)/.test(m)) return {};
    return { reasoning_effort: /luna/.test(m) ? "none" : "low" };
  };
  const zpravy = (p) => [{ role: "system", content: p.system }, ...p.zpravy.map((z) => ({ role: z.role, content: z.text }))];
  const stat = (u, m) => ({
    vstup: u?.prompt_tokens || 0,
    vystup: u?.completion_tokens || 0,
    ...(typeof u?.cost === "number" ? { cena: u.cost } : {}),
    ...(m ? { model: m } : {}),
  });
  return {
    async dotaz(p) {
      const r = await klient().chat.completions.create(
        { ...extra, model: model(), max_completion_tokens: p.maxTokenu, messages: zpravy(p), ...uvazovani(p) },
        { signal: p.signal },
      );
      return { text: r.choices?.[0]?.message?.content || "", stat: stat(r.usage, r.model) };
    },
    async *stream(p) {
      const s = await klient().chat.completions.create(
        { ...extra, model: model(), stream: true, stream_options: { include_usage: true }, max_completion_tokens: p.maxTokenu, messages: zpravy(p), ...uvazovani(p) },
        { signal: p.signal },
      );
      for await (const ch of s) {
        const text = ch.choices?.[0]?.delta?.content;
        if (text) yield { text };
        if (ch.choices?.[0]?.finish_reason === "length") yield { text: ZKRACENO };
        if (ch.usage) yield { stat: stat(ch.usage, ch.model) };
      }
    },
  };
};

// Adaptér pro přímé volání openrouter.ai s pevným modelem (scripts/rada.mjs – Claude Code ve VS Code).
// Klíč předává volající (jen z proměnné prostředí); ZDR role posílají provider.zdr + data_collection = deny.
export function adapterOpenRouter({ klic, model, zdr = true, web = false, url = OPENROUTER_PRIMO, fetch } = {}) {
  return openaiKompatibilni({}, null, klic, url, { extra: smerovaniOpenRouter({ zdr, web }), model: () => model, fetch });
}

// --- Gemini ---
const gemini = (env) => {
  const ai = () => (vlastniKlic("gemini", env)
    ? new GoogleGenAI({ apiKey: vlastniKlic("gemini", env) })
    : new GoogleGenAI({ apiKey: env.GEMINI_API_KEY, ...(env.GOOGLE_GEMINI_BASE_URL ? { httpOptions: { baseUrl: env.GOOGLE_GEMINI_BASE_URL } } : {}) }));
  const obsah = (p) => p.zpravy.map((z) => ({ role: z.role === "assistant" ? "model" : "user", parts: [{ text: z.text }] }));
  // Tokeny uvažování (thoughtsTokenCount) se účtují jako výstup.
  const stat = (u) => ({ vstup: u?.promptTokenCount ?? 0, vystup: (u?.candidatesTokenCount ?? 0) + (u?.thoughtsTokenCount ?? 0) });
  const nastaveni = (p) => ({
    systemInstruction: p.system,
    maxOutputTokens: p.maxTokenu,
    abortSignal: p.signal,
    // thinkingBudget jen u 2.5 (u řady 3 se nastavuje jinak – necháme výchozí).
    ...(p.rychle && /gemini-2\.5/.test(POSKYTOVATELE.gemini.model(env)) ? { thinkingConfig: { thinkingBudget: 512 } } : {}),
  });
  return {
    async dotaz(p) {
      const r = await ai().models.generateContent({ model: POSKYTOVATELE.gemini.model(env), contents: obsah(p), config: nastaveni(p) });
      return { text: r.text || "", stat: stat(r.usageMetadata) };
    },
    async *stream(p) {
      const s = await ai().models.generateContentStream({ model: POSKYTOVATELE.gemini.model(env), contents: obsah(p), config: nastaveni(p) });
      let posledni;
      let konec;
      for await (const ch of s) {
        if (ch.text) yield { text: ch.text };
        if (ch.usageMetadata) posledni = ch.usageMetadata;
        if (ch.candidates?.[0]?.finishReason) konec = ch.candidates[0].finishReason;
      }
      if (konec === "MAX_TOKENS") yield { text: ZKRACENO };
      if (posledni) yield { stat: stat(posledni) };
    },
  };
};

export function vytvorAdaptery(env = process.env) {
  // Role přes OpenRouter: vlastní klíč majitele → přímo openrouter.ai se směrováním ZDR; jinak Gateway jako dosud.
  const pres = (id) => (vlastniOpenRouter(env)
    ? openaiKompatibilni(env, id, vlastniOpenRouter(env), OPENROUTER_PRIMO, { extra: smerovaniRole(id, env) })
    : openaiKompatibilni(env, id, env.OPENROUTER_API_KEY, OPENROUTER_URL(env)));
  return {
    claude: claude(env),
    gpt: vlastniKlic("gpt", env)
      ? openaiKompatibilni(env, "gpt", vlastniKlic("gpt", env), VLASTNI_KLICE.gpt.url)
      : openaiKompatibilni(env, "gpt", env.OPENAI_API_KEY, env.OPENAI_BASE_URL || undefined),
    grok: env.XAI_API_KEY ? openaiKompatibilni(env, "grok", env.XAI_API_KEY, "https://api.x.ai/v1") : pres("grok"),
    gemini: gemini(env),
    mistral: vlastniKlic("mistral", env) ? openaiKompatibilni(env, "mistral", vlastniKlic("mistral", env), VLASTNI_KLICE.mistral.url) : pres("mistral"),
    deepseek: pres("deepseek"),
    llama: vlastniKlic("llama", env) ? openaiKompatibilni(env, "llama", vlastniKlic("llama", env), VLASTNI_KLICE.llama.url) : pres("llama"),
    perplexity: pres("perplexity"),
    argon: pres("argon"),
    // Muse jen přímo s vlastním klíčem (bez něj je role vypnutá – jeZapnuty).
    muse: openaiKompatibilni(env, "muse", vlastniOpenRouter(env), OPENROUTER_PRIMO, { extra: smerovaniRole("muse", env) }),
  };
}

// Promise s časovým limitem: po vypršení zruší požadavek a vyhodí chybu „timeout“.
export async function sLimitem(ms, fn) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), Math.max(1, ms));
  try {
    return await fn(ctrl.signal);
  } catch (e) {
    if (ctrl.signal.aborted) throw Object.assign(new Error("timeout"), { status: 504 });
    throw e;
  } finally {
    clearTimeout(t);
  }
}
