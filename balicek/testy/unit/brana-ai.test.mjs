// Brána /api/ai = /api/agent/:id (úkol 22): vlastní klíče majitele, opakování, převzetí Claudem,
// časový limit prvního textu, limit požadavků, přepínač modelů v panelu (Blobs). Bez skutečných volání AI.
import { test } from "node:test";
import assert from "node:assert/strict";
import { vytvorAI } from "../../web/netlify/functions/ai.mjs";
import { vytvorStav } from "../../web/netlify/functions/ai-stav.mjs";
import { POSKYTOVATELE, jeZapnuty, nazevAI, verejneEnv, sModely } from "../../web/netlify/lib/ai/poskytovatele.mjs";
import { vydejToken } from "../../web/netlify/lib/ai/autorizace.mjs";
import { env, falesnyAdapter, pametoveUloziste, pozadavek, obdobi } from "../pomocne.mjs";

const auth = (e = env()) => ({ authorization: `Bearer ${vydejToken(e).token}` });
const telo = { zpravy: [{ role: "user", text: "Tajný dotaz zákazníka Novák 736 618 486" }] };
const rozdel = (t) => {
  const [hlava, stat] = t.split("\n\u0000STAT");
  return { text: hlava.split("\n\u0000CHYBA")[0], stat: stat ? JSON.parse(stat) : null, chyba: t.includes("\u0000CHYBA") ? JSON.parse(t.split("\n\u0000CHYBA")[1].split("\n\u0000")[0]) : null };
};
const sChybou = (status) => {
  const volani = [];
  return { volani, async dotaz() { throw Object.assign(new Error("x"), { status }); }, async *stream(p) { volani.push(p); throw Object.assign(new Error(`chyba ${status}`), { status }); } };
};
function zachytLog() {
  const puvodni = console.warn;
  const zaznamy = [];
  console.warn = (...a) => zaznamy.push(a.join(" "));
  return { zaznamy, vrat: () => { console.warn = puvodni; } };
}

test("/api/agent/:id: role z adresy, při chybě jedno opakování a pak převezme Claude (log bez dotazu)", async () => {
  const ad = { gemini: falesnyAdapter({ chyba: "down" }), claude: falesnyAdapter({ text: "Odpověď Clauda" }) };
  const h = vytvorAI({ env: env(), adaptery: ad, uloziste: pametoveUloziste() });
  const log = zachytLog();
  let t;
  try {
    t = await (await h(pozadavek("/api/agent/gemini", { method: "POST", headers: auth(), body: telo }))).text();
  } finally { log.vrat(); }
  const r = rozdel(t);
  assert.equal(ad.gemini.volani.length, 2, "jedno opakování");
  assert.match(r.text, /^⟲ Claude převzal úlohu – Gemini teď neodpovídá\.\n\nOdpověď Clauda$/);
  assert.equal(r.stat.prevzal, "claude");
  assert.equal(r.stat.puvodni, "gemini");
  assert.equal(r.chyba, null);
  assert.ok(log.zaznamy.some((z) => z.includes('"udalost":"ai-prevzal"')));
  assert.ok(log.zaznamy.every((z) => !z.includes("Novák") && !z.includes("736")), "log bez osobních údajů a textu dotazu");
});

test("chyba nastavení (401) se neopakuje – rovnou Claude; chyba Clauda samotného → CHYBA", async () => {
  const gem = sChybou(401);
  const h = vytvorAI({ env: env(), adaptery: { gemini: gem, claude: falesnyAdapter({ text: "ok" }) }, uloziste: pametoveUloziste() });
  const log = zachytLog();
  try {
    const r = rozdel(await (await h(pozadavek("/api/ai", { method: "POST", headers: auth(), body: { ...telo, ai: "gemini" } }))).text());
    assert.equal(gem.volani.length, 1);
    assert.equal(r.stat.prevzal, "claude");
    const h2 = vytvorAI({ env: env(), adaptery: { claude: sChybou(529) }, uloziste: pametoveUloziste() });
    const r2 = rozdel(await (await h2(pozadavek("/api/agent/claude", { method: "POST", headers: auth(), body: telo }))).text());
    assert.match(r2.chyba.zprava, /^Chyba Claude \(529\)/);
  } finally { log.vrat(); }
});

test("časový limit prvního textu (AI_LIMIT_PRVNI_TEXT_MS) → opakování → Claude", async () => {
  const e = env({ AI_LIMIT_PRVNI_TEXT_MS: "40" });
  const pomala = falesnyAdapter({ text: "pozdě", zpozdeni: 300 });
  const h = vytvorAI({ env: e, adaptery: { gpt: pomala, claude: falesnyAdapter({ text: "včas" }) }, uloziste: pametoveUloziste() });
  const log = zachytLog();
  try {
    const r = rozdel(await (await h(pozadavek("/api/agent/gpt", { method: "POST", headers: auth(e), body: telo }))).text());
    assert.equal(pomala.volani.length, 2);
    assert.match(r.text, /včas$/);
    assert.equal(r.stat.puvodni, "gpt");
  } finally { log.vrat(); }
});

test("limit 120 dotazů / 10 min → 429; neznámá role 400", async () => {
  const ul = pametoveUloziste();
  await ul.setJSON("limit/ai-majitel", { n: 120, od: Date.now() });
  const h = vytvorAI({ env: env(), adaptery: { claude: falesnyAdapter() }, uloziste: ul });
  assert.equal((await h(pozadavek("/api/ai", { method: "POST", headers: auth(), body: { ...telo, ai: "claude" } }))).status, 429);
  assert.equal((await h(pozadavek("/api/agent/nic", { method: "POST", headers: auth(), body: telo }))).status, 400);
});

test("přepínač modelů: ai-stav POST uloží model do Blobs, brána ho použije; neplatný model 400, prázdný vrátí výchozí", async () => {
  const ul = pametoveUloziste();
  const e = env();
  const stav = vytvorStav({ env: e, uloziste: ul });
  const post = (b) => stav(pozadavek("/api/ai-stav", { method: "POST", headers: auth(e), body: b }));
  assert.equal((await post({ modely: { claude: "claude-sonnet-5-5" } })).status, 200);
  assert.equal((await post({ modely: { claude: "rm -rf /;" } })).status, 400);
  assert.equal((await post({ modely: { neznama: "x1" } })).status, 400);
  const h = vytvorAI({ env: e, adaptery: { claude: falesnyAdapter({ text: "ok" }) }, uloziste: ul });
  const r = rozdel(await (await h(pozadavek("/api/ai", { method: "POST", headers: auth(e), body: { ...telo, ai: "claude" } }))).text());
  assert.equal(r.stat.model, "claude-sonnet-5-5");
  const g = await (await stav(pozadavek("/api/ai-stav", { headers: auth(e) }))).json();
  const c = g.ai.find((x) => x.id === "claude");
  assert.equal(c.model, "claude-sonnet-5-5");
  assert.equal(c.prepsano, true);
  assert.equal(c.modelVychozi, "claude-opus-5-5");
  assert.equal((await post({ modely: { claude: "" } })).status, 200);
  assert.equal((await (await stav(pozadavek("/api/ai-stav", { headers: auth(e) }))).json()).ai.find((x) => x.id === "claude").model, "claude-opus-5-5");
});

test("vlastní klíče majitele: role se zapne, výchozí modely podle dokumentace 9. 10., Groq = GPT-OSS, klíč se nevrací", async () => {
  const k = { HSPG_KLIC_ANTHROPIC: "a", HSPG_KLIC_OPENAI: "o", HSPG_KLIC_GEMINI: "g", HSPG_KLIC_MISTRAL: "m", HSPG_KLIC_GROQ: "q" };
  for (const id of ["claude", "gpt", "gemini", "mistral", "llama"]) assert.equal(jeZapnuty(id, k), true, id);
  assert.equal(POSKYTOVATELE.gpt.model(k), "gpt-6-astra");
  assert.equal(POSKYTOVATELE.gemini.model(k), "gemini-3.8-flash");
  assert.equal(POSKYTOVATELE.llama.model(k), "openai/gpt-oss-120b");
  assert.equal(nazevAI("llama", k), "Groq · GPT-OSS 120B");
  assert.equal(POSKYTOVATELE.mistral.model(k), "mistral-large-2512");
  assert.equal(verejneEnv(k).GEMINI_MODEL, "gemini-3.5-flash-lite");
  assert.equal(verejneEnv(k).OPENAI_MODEL, "gpt-6-luna");
  // Bez vlastního klíče (Gateway) beze změny.
  assert.equal(POSKYTOVATELE.gpt.model({ OPENAI_API_KEY: "x" }), "gpt-5");
  assert.equal(POSKYTOVATELE.gemini.model({ GEMINI_API_KEY: "x" }), "gemini-2.5-pro");
  assert.equal(sModely(k, { gpt: "gpt-6.1-sol", claude: "špatně!" }).OPENAI_MODEL, "gpt-6.1-sol");
  assert.equal(sModely(k, { claude: "špatně!" }).CLAUDE_MODEL, undefined);
  const e = env(k);
  const g = await (await vytvorStav({ env: e, uloziste: pametoveUloziste() })(pozadavek("/api/ai-stav", { headers: auth(e) }))).json();
  assert.equal(g.ai.find((x) => x.id === "gpt").cesta, "vlastni-klic");
  assert.equal(g.ai.find((x) => x.id === "gpt").vlastniKlicPromenna, "HSPG_KLIC_OPENAI");
  assert.ok(!JSON.stringify(g).includes('"o"') && !JSON.stringify(g).includes(':"q"'), "hodnoty klíčů se nevrací");
});

test("vlastní klíč: volání se nepočítá do rozpočtu kreditů Netlify, eviduje se zvlášť", async () => {
  const ul = pametoveUloziste();
  const e = env({ HSPG_KLIC_ANTHROPIC: "a", AI_MESICNI_LIMIT_KC: "0.0001" });
  const h = vytvorAI({ env: e, adaptery: { claude: falesnyAdapter({ text: "ok" }) }, uloziste: ul });
  const r = rozdel(await (await h(pozadavek("/api/ai", { method: "POST", headers: auth(e), body: { ...telo, ai: "claude" } }))).text());
  assert.equal(r.text, "ok", "malý rozpočet kreditů vlastní klíč neblokuje");
  assert.equal(r.stat.vlastniKlic, true);
  const u = await ul.get(`utrata/${obdobi(e)}`);
  assert.equal(u.celkemKc, 0);
  assert.ok(u.vlastniKc > 0);
});
