// POST /api/ai – jeden dotaz na jednu AI, odpověď se streamuje jako prostý text.
// Tělo: { ai: "claude"|"gpt"|"gemini"|"grok", zpravy: [{ role: "user"|"assistant", text }], pokyn?: string }
// Na konci streamu přijde řádek "\n\u0000STAT" + JSON s počtem tokenů.
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { POSKYTOVATELE, PRAVIDLA_PRAVDIVOSTI, jeZapnuty, overHeslo, json, pockej } from "../lib/spolecne.mjs";

const MAX_TOKENU = 8000;
const MAX_ZNAKU_VSTUPU = 60000;

async function* claude(system, zpravy, model) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const stream = client.beta.messages.stream({
    model,
    max_tokens: MAX_TOKENU,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    // Když Claude dotaz odmítne, API ho samo zkusí na záložním modelu.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system,
    messages: zpravy.map((z) => ({ role: z.role, content: z.text })),
  });
  for await (const ev of stream) {
    if (ev.type === "content_block_delta" && ev.delta.type === "text_delta") yield { text: ev.delta.text };
  }
  const zprava = await stream.finalMessage();
  if (zprava.stop_reason === "refusal") yield { text: "\n\n[Claude dotaz odmítl zpracovat.]" };
  yield { stat: { vstup: zprava.usage.input_tokens, vystup: zprava.usage.output_tokens } };
}

// ChatGPT i Grok používají stejné rozhraní (Grok má jen jinou adresu).
async function* openaiKompatibilni(system, zpravy, model, apiKey, baseURL) {
  const client = new OpenAI({ apiKey, baseURL });
  const stream = await client.chat.completions.create({
    model,
    stream: true,
    stream_options: { include_usage: true },
    max_completion_tokens: MAX_TOKENU,
    messages: [{ role: "system", content: system }, ...zpravy.map((z) => ({ role: z.role, content: z.text }))],
  });
  for await (const chunk of stream) {
    const text = chunk.choices?.[0]?.delta?.content;
    if (text) yield { text };
    if (chunk.usage) yield { stat: { vstup: chunk.usage.prompt_tokens, vystup: chunk.usage.completion_tokens } };
  }
}

async function* gemini(system, zpravy, model) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const stream = await ai.models.generateContentStream({
    model,
    contents: zpravy.map((z) => ({ role: z.role === "assistant" ? "model" : "user", parts: [{ text: z.text }] })),
    config: { systemInstruction: system, maxOutputTokens: MAX_TOKENU },
  });
  let posledni;
  for await (const chunk of stream) {
    if (chunk.text) yield { text: chunk.text };
    if (chunk.usageMetadata) posledni = chunk.usageMetadata;
  }
  if (posledni) yield { stat: { vstup: posledni.promptTokenCount ?? 0, vystup: posledni.candidatesTokenCount ?? 0 } };
}

function zdroj(id, system, zpravy) {
  const model = POSKYTOVATELE[id].model();
  if (id === "claude") return claude(system, zpravy, model);
  if (id === "gpt") return openaiKompatibilni(system, zpravy, model, process.env.OPENAI_API_KEY);
  if (id === "grok") return openaiKompatibilni(system, zpravy, model, process.env.XAI_API_KEY, "https://api.x.ai/v1");
  return gemini(system, zpravy, model);
}

export default async (req) => {
  if (req.method !== "POST") return json({ chyba: "Použijte POST." }, 405);
  const heslo = overHeslo(req);
  if (!heslo.ok) {
    await pockej(1500);
    return json({ chyba: heslo.duvod }, 401);
  }

  let telo;
  try {
    telo = await req.json();
  } catch {
    return json({ chyba: "Neplatný JSON." }, 400);
  }
  const { ai, zpravy, pokyn } = telo || {};
  if (!POSKYTOVATELE[ai]) return json({ chyba: "Neznámá AI." }, 400);
  if (!jeZapnuty(ai)) return json({ chyba: `Chybí klíč ${POSKYTOVATELE[ai].klic} v Netlify.` }, 400);
  const platne =
    Array.isArray(zpravy) &&
    zpravy.length > 0 &&
    zpravy.every((z) => (z.role === "user" || z.role === "assistant") && typeof z.text === "string" && z.text.trim()) &&
    zpravy.at(-1).role === "user";
  if (!platne) return json({ chyba: "Zprávy musí končit dotazem uživatele." }, 400);
  if (JSON.stringify(zpravy).length + String(pokyn || "").length > MAX_ZNAKU_VSTUPU)
    return json({ chyba: "Dotaz je příliš dlouhý." }, 413);

  const system = pokyn ? `${PRAVIDLA_PRAVDIVOSTI}\n\nRole v této úloze:\n${String(pokyn)}` : PRAVIDLA_PRAVDIVOSTI;
  const enc = new TextEncoder();
  const body = new ReadableStream({
    async start(ctrl) {
      try {
        for await (const kus of zdroj(ai, system, zpravy)) {
          if (kus.text) ctrl.enqueue(enc.encode(kus.text));
          if (kus.stat) ctrl.enqueue(enc.encode("\n\u0000STAT" + JSON.stringify(kus.stat)));
        }
      } catch (e) {
        // Klíče se do chyby nedostanou; vracíme jen stav a zprávu poskytovatele.
        const kod = e?.status ? ` (${e.status})` : "";
        ctrl.enqueue(enc.encode(`\n\n[Chyba ${POSKYTOVATELE[ai].nazev}${kod}: ${String(e?.message || e).slice(0, 300)}]`));
      }
      ctrl.close();
    },
  });
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
};

export const config = { path: "/api/ai" };
