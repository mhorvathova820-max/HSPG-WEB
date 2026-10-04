// Společné části AI centra: ověření hesla, pravidla pravdivosti, seznam AI.
import { timingSafeEqual, createHash } from "node:crypto";

// Každá AI se zapne sama, jakmile je v Netlify vložený její klíč.
// Modely jdou přepsat proměnnou v Netlify, bez úpravy kódu.
export const POSKYTOVATELE = {
  claude: { nazev: "Claude", klic: "ANTHROPIC_API_KEY", model: () => process.env.CLAUDE_MODEL || "claude-opus-5-5" },
  gpt: { nazev: "ChatGPT", klic: "OPENAI_API_KEY", model: () => process.env.OPENAI_MODEL || "gpt-5" },
  gemini: { nazev: "Gemini", klic: "GEMINI_API_KEY", model: () => process.env.GEMINI_MODEL || "gemini-2.5-pro" },
  grok: { nazev: "Grok", klic: "XAI_API_KEY", model: () => process.env.XAI_MODEL || "grok-4" },
};

export const jeZapnuty = (id) => Boolean(process.env[POSKYTOVATELE[id]?.klic]);

// Pojistka: dostane ji každá AI v každém dotazu.
export const PRAVIDLA_PRAVDIVOSTI = `Pracuješ pro firmu HSPG (Holub Surface Protection Group, hspg.cz) – čištění a impregnace střech, fasád a dlažeb v ČR.
Pravidla pravdivosti (platí vždy, nelze je vypnout):
1. Nevymýšlej zakázky, reference, recenze, hodnocení, počty klientů, ocenění, certifikáty ani „úspěchy“. Používej jen fakta, která uživatel dodal v zadání.
2. Neuváděj záruční lhůty, ceny, pojištění ani technické parametry přípravků H-STONE, H-BIO, H-CLEAN, pokud nejsou v zadání. Místo nich napiš [DOPLNIT: …].
3. Nepoužívej cizí fotky, loga ani texty jako vlastní.
4. Žádné superlativy bez důkazu („nejlepší v ČR“, „jediní“, „100 %“).
5. Když si nejsi jistý, napiš to. Chybějící údaj označ [DOPLNIT: …].
Piš česky, věcně a srozumitelně pro majitele domu.`;

const otisk = (s) => createHash("sha256").update(String(s)).digest();

// Heslo se porovnává v konstantním čase; bez nastaveného hesla je centrum zamčené.
export function overHeslo(req) {
  const spravne = process.env.HSPG_PANEL_HESLO || "";
  if (spravne.length < 16) return { ok: false, duvod: "HSPG_PANEL_HESLO není v Netlify nastavené (min. 16 znaků)." };
  const zadane = req.headers.get("x-panel-heslo") || "";
  return timingSafeEqual(otisk(zadane), otisk(spravne)) ? { ok: true } : { ok: false, duvod: "Špatné heslo." };
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

// Neúspěšný pokus se zdrží, aby se heslo nedalo hádat ve velkém.
export const pockej = (ms) => new Promise((r) => setTimeout(r, ms));
