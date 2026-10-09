// Adaptéry AI. Každá AI se zapne sama, jakmile má klíč; model jde přepsat proměnnou.
// Netlify AI Gateway klíče a adresy (ANTHROPIC_*, OPENAI_*, GEMINI_API_KEY + GOOGLE_GEMINI_BASE_URL,
// OPENROUTER_*) do funkcí vkládá sám a účtuje v kreditech Netlify; vlastní klíč v Netlify má přednost.
// Gateway nepředává hlavičky požadavků, proto se přes ni nepoužívají beta funkce (např. fallbacks).
// Rozhraní adaptéru:
//   dotaz({ system, zpravy, maxTokenu, signal, rychle }) -> { text, stat: { vstup, vystup } }
//   stream({ system, zpravy, maxTokenu, signal }) -> async iterator { text } | { stat }
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
  grok: { nazev: "Grok", klic: "XAI_API_KEY", jinyKlic: "OPENROUTER_API_KEY", model: (env) => env.XAI_MODEL || (env.XAI_API_KEY ? "grok-4.7" : "x-ai/grok-4.5") },
  // Další AI jen pro majitele (panel a AI centrum), přes OpenRouter v Netlify AI Gateway – jen modely
  // s nulovým uchováváním dat (ZDR, ověřeno 4. 10. na openrouter.ai/api/v1/endpoints/zdr). Veřejný asistent
  // je nepoužívá (ASISTENT_PORADI). Klíč OPENROUTER_API_KEY dodává Gateway; model jde přepsat proměnnou.
  mistral: { nazev: "Mistral", klic: "OPENROUTER_API_KEY", model: (env) => env.MISTRAL_MODEL || (vlastniKlic("mistral", env) ? "mistral-large-2512" : "mistralai/mistral-large-2512") },
  deepseek: { nazev: "DeepSeek", klic: "OPENROUTER_API_KEY", model: (env) => env.DEEPSEEK_MODEL || "deepseek/deepseek-v4-flash" },
  // Role „llama“: s klíčem Groq běží u Groq – Llama tam pro nové zákazníky už není, proto GPT-OSS 120B
  // (název v panelu to říká, ať nikdo nečte odpověď jako Llamu).
  llama: { nazev: "Llama", nazevVlastni: "Groq · GPT-OSS 120B", klic: "OPENROUTER_API_KEY", model: (env) => env.LLAMA_MODEL || (vlastniKlic("llama", env) ? "openai/gpt-oss-120b" : "meta-llama/llama-4-maverick") },
  // Perplexity hledá na webu – fakta z webu nejsou schválené znalosti HSPG, výsledky ber jako podklad k ověření.
  perplexity: { nazev: "Perplexity", klic: "OPENROUTER_API_KEY", model: (env) => env.PERPLEXITY_MODEL || "perplexity/sonar-pro" },
};
export const nazevAI = (id, env = process.env) => (vlastniKlic(id, env) && POSKYTOVATELE[id]?.nazevVlastni) || POSKYTOVATELE[id]?.nazev || id;

// Přepínač modelů v panelu (Blobs, bez nasazení): { claude: "claude-…", … } → proměnné modelů.
export const PROMENNA_MODELU = { claude: "CLAUDE_MODEL", gpt: "OPENAI_MODEL", gemini: "GEMINI_MODEL", grok: "XAI_MODEL", mistral: "MISTRAL_MODEL", deepseek: "DEEPSEEK_MODEL", llama: "LLAMA_MODEL", perplexity: "PERPLEXITY_MODEL" };
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
  return Boolean(p && (vlastniKlic(id, env) || env[p.klic] || (p.jinyKlic && env[p.jinyKlic])));
};

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
const openaiKompatibilni = (env, id, apiKey, baseURL) => {
  const klient = () => new OpenAI({ apiKey, baseURL, maxRetries: 0 });
  // Uvažující modely (gpt-5…, o3…) počítají tokeny uvažování do max_completion_tokens – pro rychlé
  // veřejné odpovědi proto nízké uvažování, jinak by odpověď mohla zůstat prázdná.
  // gpt-6-luna podle dokumentace bez uvažování (none), ostatní uvažující modely nízce.
  const uvazovani = (p) => {
    const m = POSKYTOVATELE[id].model(env);
    if (!p.rychle || !/^(gpt-[56]|o\d)/.test(m)) return {};
    return { reasoning_effort: /luna/.test(m) ? "none" : "low" };
  };
  const zpravy = (p) => [{ role: "system", content: p.system }, ...p.zpravy.map((z) => ({ role: z.role, content: z.text }))];
  return {
    async dotaz(p) {
      const r = await klient().chat.completions.create(
        { model: POSKYTOVATELE[id].model(env), max_completion_tokens: p.maxTokenu, messages: zpravy(p), ...uvazovani(p) },
        { signal: p.signal },
      );
      return { text: r.choices?.[0]?.message?.content || "", stat: { vstup: r.usage?.prompt_tokens || 0, vystup: r.usage?.completion_tokens || 0 } };
    },
    async *stream(p) {
      const s = await klient().chat.completions.create(
        { model: POSKYTOVATELE[id].model(env), stream: true, stream_options: { include_usage: true }, max_completion_tokens: p.maxTokenu, messages: zpravy(p), ...uvazovani(p) },
        { signal: p.signal },
      );
      for await (const ch of s) {
        const text = ch.choices?.[0]?.delta?.content;
        if (text) yield { text };
        if (ch.choices?.[0]?.finish_reason === "length") yield { text: ZKRACENO };
        if (ch.usage) yield { stat: { vstup: ch.usage.prompt_tokens, vystup: ch.usage.completion_tokens } };
      }
    },
  };
};

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
  return {
    claude: claude(env),
    gpt: vlastniKlic("gpt", env)
      ? openaiKompatibilni(env, "gpt", vlastniKlic("gpt", env), VLASTNI_KLICE.gpt.url)
      : openaiKompatibilni(env, "gpt", env.OPENAI_API_KEY, env.OPENAI_BASE_URL || undefined),
    grok: env.XAI_API_KEY
      ? openaiKompatibilni(env, "grok", env.XAI_API_KEY, "https://api.x.ai/v1")
      : openaiKompatibilni(env, "grok", env.OPENROUTER_API_KEY, OPENROUTER_URL(env)),
    gemini: gemini(env),
    mistral: vlastniKlic("mistral", env)
      ? openaiKompatibilni(env, "mistral", vlastniKlic("mistral", env), VLASTNI_KLICE.mistral.url)
      : openaiKompatibilni(env, "mistral", env.OPENROUTER_API_KEY, OPENROUTER_URL(env)),
    deepseek: openaiKompatibilni(env, "deepseek", env.OPENROUTER_API_KEY, OPENROUTER_URL(env)),
    llama: vlastniKlic("llama", env)
      ? openaiKompatibilni(env, "llama", vlastniKlic("llama", env), VLASTNI_KLICE.llama.url)
      : openaiKompatibilni(env, "llama", env.OPENROUTER_API_KEY, OPENROUTER_URL(env)),
    perplexity: openaiKompatibilni(env, "perplexity", env.OPENROUTER_API_KEY, OPENROUTER_URL(env)),
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
