// Rada AI a OpenRouter (rozhodnutí majitele 22. 10. 2026): rada.mjs (paralelně, limit, opakování, rozpočet,
// předseda), režim „rada“ v /api/ai, role argon a muse, vlastní klíč HSPG_KLIC_OPENROUTER se směrováním ZDR
// a CLI scripts/rada.mjs. Žádné skutečné volání AI – falešné adaptéry a falešný fetch.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { poradaRady, prectiJson, POKYN_PREDSEDA } from "../../web/netlify/lib/ai/rada.mjs";
import { vytvorAI } from "../../web/netlify/functions/ai.mjs";
import { vytvorStav } from "../../web/netlify/functions/ai-stav.mjs";
import { poradi } from "../../web/netlify/functions/asistent.mjs";
import { POSKYTOVATELE, MODELY_OPENROUTER, jeZapnuty, cestaRole, mimoKredity, smerovaniOpenRouter, varovaniRole, vytvorAdaptery, sCenami } from "../../web/netlify/lib/ai/poskytovatele.mjs";
import { odhadKc } from "../../web/netlify/lib/ai/limity.mjs";
import { vydejToken } from "../../web/netlify/lib/ai/autorizace.mjs";
import { main } from "../../web/scripts/rada.mjs";
import { env, falesnyAdapter, pametoveUloziste, pozadavek, obdobi } from "../pomocne.mjs";

const PII = "Napiš panu Novákovi na jan.novak@seznam.cz, tel. 777 123 456";
const auth = (e) => ({ authorization: `Bearer ${vydejToken(e).token}` });
const udalosti = async (r) => (await r.text()).trim().split("\n").map((x) => JSON.parse(x));
const JSON_PREDSEDY = JSON.stringify({ shoda: ["Kontaktovat [JMENO_1]"], rozdily: ["GPT chce e-mail, Grok telefon"], doporuceni: "Napsat na [EMAIL_1]." });
const jePredseda = (p) => p.system.includes(POKYN_PREDSEDA);
function zachytLog() {
  const puvodni = [console.warn, console.log, console.error];
  const zaznamy = [];
  console.warn = console.log = console.error = (...a) => zaznamy.push(a.join(" "));
  return { zaznamy, vrat: () => { [console.warn, console.log, console.error] = puvodni; } };
}

// --- knihovna rada.mjs ---
test("rada: stejný pseudonymizovaný dotaz všem členům PARALELNĚ, předseda vrátí shodu, rozdíly a doporučení", async () => {
  let aktivni = 0, nejvic = 0;
  const clen = (id, cena) => ({
    id, nazev: id.toUpperCase(), model: `m/${id}`, zdr: true,
    adapter: {
      volani: [],
      async dotaz(p) {
        this.volani.push(p);
        aktivni++; nejvic = Math.max(nejvic, aktivni);
        await new Promise((ok) => setTimeout(ok, 20));
        aktivni--;
        return jePredseda(p) ? { text: "```json\n" + JSON_PREDSEDY + "\n```", stat: { vstup: 50, vystup: 20, cena } } : { text: `Návrh ${id}`, stat: { vstup: 10, vystup: 5, cena } };
      },
    },
  });
  const clenove = [clen("opus", 0.01), clen("astra", 0.02), clen("grok", 0.001)];
  const sled = [];
  const v = await poradaRady({ zpravy: [{ role: "user", text: PII }], clenove, predseda: clenove[0], naUdalost: (u) => sled.push(u.udalost) });
  assert.equal(nejvic, 3, "členové běží souběžně");
  const zadani = clenove.map((c) => c.adapter.volani[0].zpravy[0].text);
  assert.ok(zadani.every((t) => t === zadani[0]), "všichni dostali stejný text");
  assert.equal(zadani[0], "Napiš panu [JMENO_1] na [EMAIL_1], tel. [TELEFON_1]");
  assert.deepEqual(sled, ["start", "clen", "clen", "clen", "predseda", "hotovo"]);
  assert.deepEqual(v.predseda.shoda, ["Kontaktovat [JMENO_1]"]);
  assert.equal(v.predseda.doporuceni, "Napsat na [EMAIL_1].");
  assert.equal(v.predseda.nahradni, false);
  const podklad = clenove[0].adapter.volani.find(jePredseda).zpravy[0].text;
  assert.match(podklad, /--- ASTRA \(m\/astra\) ---\nNávrh astra/);
  assert.deepEqual(v.stat, { vstup: 80, vystup: 35, dotazu: 4, cena: 0.01 + 0.02 + 0.001 + 0.01 });
  assert.deepEqual(v.pseudonymizace, { nahrazeno: 3, typy: { JMENO: 1, EMAIL: 1, TELEFON: 1 } });
  assert.ok(!JSON.stringify(v).includes("Novák"), "výsledek knihovny je pseudonymizovaný");
});

test("rada: opakování při přechodné chybě, bez opakování u 401, časový limit 504; předseda zastoupen", async () => {
  let pokusA = 0;
  const a = { id: "a", nazev: "A", model: "a", zdr: true, adapter: { async dotaz() { if (++pokusA === 1) throw Object.assign(new Error("přetížení"), { status: 529 }); return { text: "A ok", stat: { vstup: 1, vystup: 1 } }; } } };
  const b = { id: "b", nazev: "B", model: "b", zdr: true, adapter: falesnyAdapter({}) };
  b.adapter.dotaz = async function (p) { this.volani.push(p); throw Object.assign(new Error("klíč"), { status: 401 }); };
  const c = { id: "c", nazev: "C", model: "c", zdr: true, adapter: falesnyAdapter({ text: "pozdě", zpozdeni: 500 }) };
  const d = { id: "d", nazev: "D", model: "d", zdr: true, adapter: falesnyAdapter({ text: (p) => (jePredseda(p) ? JSON_PREDSEDY : "D ok") }) };
  const predseda = { id: "p", nazev: "P", model: "p", zdr: true, adapter: { async dotaz() { throw Object.assign(new Error("výpadek"), { status: 500 }); } } };
  const v = await poradaRady({ zpravy: [{ role: "user", text: "Otázka" }], clenove: [a, b, c, d], predseda, casLimitMs: 40 });
  const [ra, rb, rc] = v.clenove;
  assert.equal(ra.ok, true); assert.equal(ra.pokusu, 2);
  assert.equal(rb.ok, false); assert.equal(rb.status, 401); assert.equal(b.adapter.volani.length, 1, "401 se neopakuje");
  assert.equal(rc.ok, false); assert.equal(rc.status, 504); assert.equal(c.adapter.volani.length, 2, "timeout se jednou zopakuje");
  assert.equal(v.predseda.ok, true);
  assert.equal(v.predseda.id, "a", "za selhaného předsedu zaskočí první člen se ZDR, který odpověděl");
  assert.equal(v.predseda.nahradni, true);
});

test("rada: model bez ZDR (Muse) nedostane dotaz s osobními údaji; bez nich ano; jediná odpověď → bez předsedy", async () => {
  const muse = { id: "muse", nazev: "Muse", model: "meta/muse-wonder", zdr: false, adapter: falesnyAdapter({ text: "muse" }) };
  const opus = { id: "opus", nazev: "Opus", model: "o", zdr: true, adapter: falesnyAdapter({ text: "opus" }) };
  const v = await poradaRady({ zpravy: [{ role: "user", text: PII }], clenove: [opus, muse], predseda: opus });
  assert.equal(muse.adapter.volani.length, 0);
  assert.equal(v.clenove[1].vynechano, "osobni-udaje");
  assert.match(v.predseda.preskoceno, /jen jeden/);
  const w = await poradaRady({ zpravy: [{ role: "user", text: "Rešerše patentů na hydrofobní impregnaci střech" }], clenove: [opus, muse], predseda: opus });
  assert.equal(muse.adapter.volani.length, 1);
  assert.equal(w.clenove[1].ok, true);
});

test("rada: rozpočet – bez rezervace se nevolá, odmítnutí poskytovatelem rezervaci vrátí, úspěch vyrovná", async () => {
  const zapisy = [];
  const rozpocet = {
    async rezervuj(c) { return c.id === "chudy" ? false : 1.5; },
    async vyrovnej(c, stat, rez) { zapisy.push([c.id, stat, rez]); },
  };
  const chudy = { id: "chudy", nazev: "Chudý", model: "x", zdr: true, adapter: falesnyAdapter({}) };
  const chyba = { id: "chyba", nazev: "Chyba", model: "y", zdr: true, adapter: falesnyAdapter({ chyba: "down" }) };
  const ok = { id: "ok", nazev: "OK", model: "z", zdr: true, adapter: falesnyAdapter({ text: "ano" }) };
  const v = await poradaRady({ zpravy: [{ role: "user", text: "x" }], clenove: [chudy, chyba, ok], rozpocet, opakovani: 0 });
  assert.equal(chudy.adapter.volani.length, 0);
  assert.equal(v.clenove[0].duvod, "rozpocet");
  assert.deepEqual(zapisy.find((z) => z[0] === "chyba"), ["chyba", { vstup: 0, vystup: 0 }, 1.5], "HTTP 500 → rezervace vrácena");
  assert.deepEqual(zapisy.find((z) => z[0] === "ok"), ["ok", { vstup: 100, vystup: 50 }, 1.5]);
});

test("prectiJson: JSON v textu i v ```json, vnořené řetězce se závorkami; bez JSON → null", () => {
  assert.deepEqual(prectiJson('Tady: ```json\n{"shoda":["a {b}"],"rozdily":[],"doporuceni":"x"}\n```'), { shoda: ["a {b}"], rozdily: [], doporuceni: "x" });
  assert.deepEqual(prectiJson('{"jine":1} a pak {"doporuceni":"y"}'), { shoda: [], rozdily: [], doporuceni: "y" });
  assert.equal(prectiJson("žádný JSON"), null);
  assert.equal(prectiJson('{"shoda": [neplatné'), null);
});

// --- /api/ai: režim rady a pseudonymizace ---
function radaAI(extra = {}, adaptery) {
  const e = env({ OPENROUTER_API_KEY: "gateway-test", ...extra });
  const ul = pametoveUloziste();
  const ad = adaptery || {
    claude: falesnyAdapter({ text: (p) => (jePredseda(p) ? JSON_PREDSEDY : "Claude: oslovit [JMENO_1]") }),
    gpt: falesnyAdapter({ text: (p) => `GPT: ${p.zpravy[0].text}` }),
    argon: falesnyAdapter({ text: "Argon: bez osobních údajů" }),
    grok: falesnyAdapter({ text: "Grok: zavolat [TELEFON_1]" }),
    muse: falesnyAdapter({ text: "Muse" }),
  };
  return { e, ul, ad, h: vytvorAI({ env: e, adaptery: ad, uloziste: ul }) };
}

test("/api/ai rezim rada: NDJSON průběh, AI vidí jen značky, panel majitele dostane doplněné údaje, útrata za každé volání", async () => {
  const { e, ul, ad, h } = radaAI();
  const log = zachytLog();
  let u;
  try {
    u = await udalosti(await h(pozadavek("/api/ai", { method: "POST", headers: auth(e), body: { rezim: "rada", zpravy: [{ role: "user", text: PII }] } })));
  } finally { log.vrat(); }
  assert.deepEqual(u.map((x) => x.udalost), ["start", "clen", "clen", "clen", "clen", "predseda", "hotovo"]);
  assert.deepEqual(u[0].clenove.map((c) => c.id), ["claude", "gpt", "argon", "grok"]);
  assert.equal(u[0].predseda.id, "claude");
  for (const id of ["claude", "gpt", "argon", "grok"]) {
    const t = ad[id].volani[0].zpravy[0].text;
    assert.equal(t, "Napiš panu [JMENO_1] na [EMAIL_1], tel. [TELEFON_1]", id);
  }
  const gpt = u.find((x) => x.udalost === "clen" && x.id === "gpt");
  assert.equal(gpt.text, `GPT: ${PII}`, "zpětné doplnění jen v odpovědi panelu");
  assert.equal(u.find((x) => x.id === "grok").text, "Grok: zavolat 777 123 456");
  const p = u.find((x) => x.udalost === "predseda");
  assert.deepEqual(p.shoda, ["Kontaktovat Novákovi"]);
  assert.equal(p.doporuceni, "Napsat na jan.novak@seznam.cz.");
  assert.ok(p.stat.kc > 0);
  const hotovo = u.at(-1);
  assert.equal(hotovo.stat.dotazu, 5);
  assert.ok(hotovo.stat.kc > 0);
  const utrata = await ul.get(`utrata/${obdobi(e)}`);
  assert.equal(utrata.ai.claude.dotazu, 2, "člen + předseda");
  for (const id of ["gpt", "argon", "grok"]) assert.equal(utrata.ai[id].dotazu, 1, id);
  assert.ok(log.zaznamy.some((z) => z.includes('"udalost":"ai-rada"')));
  assert.ok(log.zaznamy.every((z) => !/Novák|seznam|777/.test(z)), "log bez osobních údajů");
});

test("/api/ai rezim rada: neznámá role a víc než 6 členů → 400; limit 120 / 10 min počítá každé volání", async () => {
  const { e, ul, h } = radaAI();
  const post = (body) => h(pozadavek("/api/ai", { method: "POST", headers: auth(e), body: { rezim: "rada", zpravy: [{ role: "user", text: "x" }], ...body } }));
  assert.equal((await post({ role: ["claude", "nic"] })).status, 400);
  assert.equal((await post({ role: ["claude", "gpt", "gemini", "grok", "mistral", "deepseek", "llama"] })).status, 400);
  await ul.setJSON("limit/ai-majitel", { n: 117, od: Date.now() });
  assert.equal((await post({})).status, 429, "4 členové + předseda se do zbývajících 3 volání nevejdou");
});

test("/api/ai rezim rada: Muse bez ZDR s osobními údaji vynechána; malý rozpočet zastaví Gateway, vlastní klíč OpenRouter ne", async () => {
  const { e, ad, h } = radaAI({ HSPG_KLIC_OPENROUTER: "vlastni-or-test", AI_MESICNI_LIMIT_KC: "0.0001" });
  const u = await udalosti(await h(pozadavek("/api/ai", { method: "POST", headers: auth(e), body: { rezim: "rada", role: ["claude", "argon", "muse"], zpravy: [{ role: "user", text: PII }] } })));
  const clen = (id) => u.find((x) => x.udalost === "clen" && x.id === id);
  assert.equal(clen("muse").vynechano, "osobni-udaje");
  assert.equal(ad.muse.volani.length, 0);
  assert.equal(clen("claude").duvod, "rozpocet", "Claude přes Gateway: rozpočet kreditů je vyčerpaný");
  assert.equal(ad.claude.volani.length, 0);
  assert.equal(clen("argon").ok, true, "argon s vlastním klíčem OpenRouter jde mimo kredity Netlify");
  assert.equal(clen("argon").stat.vlastniKlic, true);
});

test("/api/ai: pseudonymizace i v jednotlivém dotazu, odpověď doplněná zpět; Muse s osobními údaji 422", async () => {
  const e = env({ HSPG_KLIC_OPENROUTER: "vlastni-or-test" });
  const ad = { claude: falesnyAdapter({ text: (p) => `Odpověď pro ${p.zpravy[0].text}` }), muse: falesnyAdapter({ text: "ok" }) };
  const h = vytvorAI({ env: e, adaptery: ad, uloziste: pametoveUloziste() });
  const t = await (await h(pozadavek("/api/agent/claude", { method: "POST", headers: auth(e), body: { zpravy: [{ role: "user", text: PII }], pokyn: "Piš paní Dvořákové" } }))).text();
  const [text, stat] = t.split("\n\u0000STAT");
  assert.match(ad.claude.volani[0].system, /Piš paní \[JMENO_1\]/, "pokyn se pseudonymizuje stejnou mapou (jako první)");
  assert.equal(ad.claude.volani[0].zpravy[0].text, "Napiš panu [JMENO_2] na [EMAIL_1], tel. [TELEFON_1]");
  assert.equal(text, `Odpověď pro ${PII}`);
  assert.equal(JSON.parse(stat).pseudonymizovano, 4);
  const m = await h(pozadavek("/api/agent/muse", { method: "POST", headers: auth(e), body: { zpravy: [{ role: "user", text: PII }] } }));
  assert.equal(m.status, 422);
  assert.match((await m.json()).chyba, /neosobní/);
  assert.equal(ad.muse.volani.length, 0);
  const ok = await h(pozadavek("/api/agent/muse", { method: "POST", headers: auth(e), body: { zpravy: [{ role: "user", text: "Shrň trendy v nátěrech střech" }] } }));
  assert.equal(ok.status, 200);
});

test("/api/ai: role argon s vlastním klíčem OpenRouter neblokuje malý rozpočet kreditů a eviduje se zvlášť", async () => {
  const e = env({ HSPG_KLIC_OPENROUTER: "vlastni-or-test", AI_MESICNI_LIMIT_KC: "0.0001" });
  const ul = pametoveUloziste();
  const h = vytvorAI({ env: e, adaptery: { argon: falesnyAdapter({ text: "rešerše" }) }, uloziste: ul });
  const t = await (await h(pozadavek("/api/agent/argon", { method: "POST", headers: auth(e), body: { zpravy: [{ role: "user", text: "Patenty na nano-impregnaci" }] } }))).text();
  assert.match(t, /^rešerše/);
  assert.equal(JSON.parse(t.split("\n\u0000STAT")[1]).vlastniKlic, true);
  const u = await ul.get(`utrata/${obdobi(e)}`);
  assert.equal(u.celkemKc, 0);
  assert.ok(u.vlastniKc > 0);
});

// --- poskytovatele.mjs: role argon/muse, cesty, směrování ---
test("argon a muse: zapnutí, cesty a kdo platí; Grok s vlastním klíčem OpenRouter = 4.7, přes Gateway beze změny", () => {
  assert.equal(jeZapnuty("argon", { OPENROUTER_API_KEY: "k" }), true);
  assert.equal(jeZapnuty("muse", { OPENROUTER_API_KEY: "k" }), false, "Muse přes Gateway nejde (bez ZDR)");
  assert.equal(jeZapnuty("muse", { HSPG_KLIC_OPENROUTER: "k" }), true);
  assert.equal(jeZapnuty("deepseek", { HSPG_KLIC_OPENROUTER: "k" }), true);
  assert.equal(cestaRole("argon", { OPENROUTER_API_KEY: "k" }), "gateway");
  assert.equal(cestaRole("argon", { HSPG_KLIC_OPENROUTER: "k" }), "openrouter-vlastni");
  assert.equal(cestaRole("grok", { XAI_API_KEY: "k", HSPG_KLIC_OPENROUTER: "k" }), "vlastni-klic");
  assert.equal(cestaRole("claude", { HSPG_KLIC_OPENROUTER: "k", ANTHROPIC_API_KEY: "g" }), "gateway", "Claude přes OpenRouter nejde");
  assert.equal(mimoKredity("argon", { HSPG_KLIC_OPENROUTER: "k" }), true);
  assert.equal(POSKYTOVATELE.grok.model({ HSPG_KLIC_OPENROUTER: "k" }), "x-ai/grok-4.7");
  assert.equal(POSKYTOVATELE.grok.model({ OPENROUTER_API_KEY: "k" }), "x-ai/grok-4.5");
  assert.equal(POSKYTOVATELE.argon.model({}), "google/gemini-4-argon");
  assert.equal(POSKYTOVATELE.muse.model({}), "meta/muse-wonder");
  assert.equal(POSKYTOVATELE.argon.model({ ARGON_MODEL: "~google/gemini-pro-latest" }), "~google/gemini-pro-latest");
  assert.deepEqual(Object.values(MODELY_OPENROUTER).map((m) => [m.model, m.zdr]), [["anthropic/claude-opus-5.5", true], ["openai/gpt-6-astra", true], ["google/gemini-4-argon", true], ["x-ai/grok-4.7", true], ["meta/muse-wonder", false]]);
  assert.deepEqual(poradi(env({ ASISTENT_PORADI: "argon,muse,claude", OPENROUTER_API_KEY: "k", HSPG_KLIC_OPENROUTER: "k" })), ["claude"], "veřejný H-BOT argon ani muse nepoužije");
});

test("směrování OpenRouter: ZDR + zákaz sběru dat jen při přímém volání; web jen pro argon s HSPG_PATENTY_WEB=1; Gateway beze změny", async () => {
  assert.deepEqual(smerovaniOpenRouter({}), { provider: { zdr: true, data_collection: "deny" } });
  assert.deepEqual(smerovaniOpenRouter({ zdr: false }), { provider: { data_collection: "deny" } });
  assert.deepEqual(smerovaniOpenRouter({ web: true }).plugins, [{ id: "web", max_results: 5 }]);
  const zaznam = [];
  const puvodni = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    zaznam.push({ url: String(url), auth: new Headers(init.headers).get("authorization"), body: JSON.parse(init.body) });
    return new Response(JSON.stringify({ id: "x", object: "chat.completion", model: "skutecny/model", choices: [{ index: 0, message: { role: "assistant", content: "ok" }, finish_reason: "stop" }], usage: { prompt_tokens: 3, completion_tokens: 1, cost: 0.0002 } }), { headers: { "content-type": "application/json" } });
  };
  const p = { system: "s", zpravy: [{ role: "user", text: "x" }], maxTokenu: 300 };
  let r;
  try {
    const prime = vytvorAdaptery({ HSPG_KLIC_OPENROUTER: "vlastni-or-test", OPENROUTER_API_KEY: "gw", OPENROUTER_BASE_URL: "https://gw.example/openrouter", HSPG_PATENTY_WEB: "1" });
    r = await prime.argon.dotaz(p);
    await prime.muse.dotaz(p);
    await prime.deepseek.dotaz(p);
    await vytvorAdaptery({ OPENROUTER_API_KEY: "gw", OPENROUTER_BASE_URL: "https://gw.example/openrouter", HSPG_PATENTY_WEB: "1" }).argon.dotaz(p);
  } finally { globalThis.fetch = puvodni; }
  const [argon, muse, deepseek, gw] = zaznam;
  assert.equal(argon.url, "https://openrouter.ai/api/v1/chat/completions");
  assert.equal(argon.auth, "Bearer vlastni-or-test");
  assert.equal(argon.body.model, "google/gemini-4-argon");
  assert.deepEqual(argon.body.provider, { zdr: true, data_collection: "deny" });
  assert.deepEqual(argon.body.plugins, [{ id: "web", max_results: 5 }]);
  assert.deepEqual(muse.body.provider, { data_collection: "deny" });
  assert.equal(muse.body.plugins, undefined);
  assert.deepEqual(deepseek.body.provider, { zdr: true, data_collection: "deny" });
  assert.equal(deepseek.body.plugins, undefined, "hledání na webu jen u argonu");
  assert.equal(gw.url, "https://gw.example/openrouter/chat/completions");
  assert.equal(gw.body.provider, undefined, "přes Gateway tělo jako dosud");
  assert.equal(gw.body.plugins, undefined);
  assert.deepEqual(r.stat, { vstup: 3, vystup: 1, cena: 0.0002, model: "skutecny/model" });
});

test("varování a ceny pro odhad rozpočtu; ai-stav ukáže cestu OpenRouter, ZDR a varování bez hodnot klíčů", async () => {
  assert.match(varovaniRole("muse", {}).join(" "), /Bez ZDR/);
  assert.match(varovaniRole("argon", { ARGON_MODEL: "~google/gemini-pro-latest" }).join(" "), /alias nejnovější verze/);
  assert.match(varovaniRole("argon", { HSPG_PATENTY_WEB: "1", OPENROUTER_API_KEY: "k" }).join(" "), /jen s vlastním klíčem OpenRouter/);
  assert.deepEqual(varovaniRole("claude", {}), []);
  const c = sCenami({ CENA_MUSE_VYSTUP: "40" });
  assert.equal(c.CENA_ARGON_VSTUP, "3");
  assert.equal(c.CENA_MUSE_VYSTUP, "40", "proměnná z Netlify má přednost");
  assert.equal(c.CENA_CLAUDE_VSTUP, undefined);
  assert.ok(odhadKc("argon", 1e6, 1e6, c, "google/gemini-4-argon") < odhadKc("argon", 1e6, 1e6, {}, "google/gemini-4-argon"), "známá cena místo nouzových 15/75 USD");
  assert.equal(sCenami({ ARGON_MODEL: "~google/gemini-pro-latest" }).CENA_ARGON_VSTUP, undefined, "u aliasu zůstane opatrná nouzová cena");
  const e = env({ HSPG_KLIC_OPENROUTER: "tajny-or-123" });
  const s = await (await vytvorStav({ env: e, uloziste: pametoveUloziste() })(pozadavek("/api/ai-stav", { headers: auth(e) }))).json();
  const role = (id) => s.ai.find((x) => x.id === id);
  assert.equal(role("argon").cesta, "openrouter-vlastni");
  assert.equal(role("argon").vlastniKlicPromenna, "HSPG_KLIC_OPENROUTER");
  assert.equal(role("argon").zdr, true);
  assert.equal(role("muse").zdr, false);
  assert.equal(role("muse").jenMajitel, true);
  assert.equal(role("muse").nazev, "Muse Wonder (bez ZDR)");
  assert.ok(role("muse").varovani.length > 0);
  assert.equal(role("claude").cesta, "gateway");
  assert.ok(!JSON.stringify(s).includes("tajny-or-123"), "hodnota klíče se nevrací");
});

// --- CLI scripts/rada.mjs (falešný fetch, žádná síť) ---
const KLIC = "testovaci-klic-openrouter";
function falesnyOpenRouter() {
  const volani = [];
  const fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    volani.push({ url: String(url), auth: new Headers(init.headers).get("authorization"), body });
    const predseda = body.messages[0].content.includes(POKYN_PREDSEDA);
    const content = predseda ? JSON_PREDSEDY : `Odpověď modelu ${body.model} na: ${body.messages.at(-1).content.slice(0, 60)}`;
    return new Response(JSON.stringify({ id: "x", object: "chat.completion", model: body.model, choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 20, cost: 0.0025 } }), { headers: { "content-type": "application/json" } });
  };
  return { fetch, volani };
}
async function spust(argv, envExtra = {}, deps = {}) {
  const or = falesnyOpenRouter();
  const vystup = [], chyby = [];
  const kod = await main(argv, { env: { OPENROUTER_API_KEY: KLIC, ...envExtra }, fetch: or.fetch, vypis: (t) => vystup.push(t), chyby: (t) => chyby.push(t), ...deps });
  return { kod, vystup: vystup.join("\n"), chyby: chyby.join("\n"), volani: or.volani };
}

test("CLI rada: OpenRouter přímo, ZDR směrování, pseudonymizace, Muse bez osobních údajů, cena z usage.cost, klíč se nevypíše", async () => {
  const r = await spust([PII, "--role", "opus,astra,argon,grok,muse", "--json"]);
  assert.equal(r.kod, 0, r.chyby);
  const clenove = r.volani.filter((v) => !v.body.messages[0].content.includes(POKYN_PREDSEDA));
  assert.deepEqual(clenove.map((v) => v.body.model).sort(), ["anthropic/claude-opus-5.5", "google/gemini-4-argon", "openai/gpt-6-astra", "x-ai/grok-4.7"]);
  for (const v of r.volani) {
    assert.equal(v.url, "https://openrouter.ai/api/v1/chat/completions");
    assert.equal(v.auth, `Bearer ${KLIC}`);
    assert.deepEqual(v.body.provider, { zdr: true, data_collection: "deny" });
    assert.ok(!/Novák|seznam\.cz|777 123/.test(JSON.stringify(v.body.messages)), "do modelů jen značky");
  }
  const j = JSON.parse(r.vystup);
  assert.equal(j.clenove.find((c) => c.id === "muse").vynechano, "osobni-udaje");
  assert.deepEqual(j.predseda.shoda, ["Kontaktovat [JMENO_1]"], "CLI nedoplňuje osobní údaje zpět");
  assert.equal(j.stat.dotazu, 5);
  assert.ok(Math.abs(j.stat.cena - 5 * 0.0025) < 1e-9, "cena sečtená z usage.cost");
  assert.ok(!r.vystup.includes(KLIC) && !r.chyby.includes(KLIC));
  assert.match(r.chyby, /Muse Wonder je bez ZDR/);
});

test("CLI rada: Muse bez osobních údajů dostane jen zákaz sběru dat; argon s HSPG_PATENTY_WEB hledá na webu; alias s varováním", async () => {
  const r = await spust(["Jaké jsou nové patenty na hydrofobní nano-impregnaci střešních tašek?", "--role", "argon,muse"], { HSPG_PATENTY_WEB: "1", RADA_OPUS_MODEL: "~anthropic/claude-opus-latest" });
  assert.equal(r.kod, 0, r.chyby);
  const muse = r.volani.find((v) => v.body.model === "meta/muse-wonder");
  assert.deepEqual(muse.body.provider, { data_collection: "deny" });
  const argon = r.volani.find((v) => v.body.model === "google/gemini-4-argon");
  assert.deepEqual(argon.body.plugins, [{ id: "web", max_results: 5 }]);
  assert.ok(argon.body.max_completion_tokens >= 4000, "Gemini 4 Argon vždy uvažuje – vyšší strop");
  const predseda = r.volani.find((v) => v.body.messages[0].content.includes(POKYN_PREDSEDA));
  assert.equal(predseda.body.model, "~anthropic/claude-opus-latest");
  assert.match(r.chyby, /alias nejnovější verze/);
  assert.match(r.vystup, /Shoda:\n • Kontaktovat \[JMENO_1\]/);
  assert.match(r.vystup, /OpenRouter \$0\.0075/);
});

test("CLI rada: klíč jen z prostředí; tajemství v argumentu ani v souboru se neodešle; neznámá role; strop útraty běhu", async () => {
  const bez = await spust(["otázka"], { OPENROUTER_API_KEY: "" });
  assert.equal(bez.kod, 2);
  assert.match(bez.chyby, /HSPG_KLIC_OPENROUTER/);
  assert.equal(bez.volani.length, 0);
  assert.equal((await spust(["otázka", "--klic", "abc"])).kod, 2);
  const podobny = "sk-or-" + "v1-" + "a".repeat(24); // skládá se až za běhu (v repozitáři žádný vzor klíče)
  const t = await spust([`otázka ${podobny}`]);
  assert.equal(t.kod, 2);
  assert.equal(t.volani.length, 0);
  assert.equal((await spust(["otázka", "--soubor", ".env"])).kod, 2);
  assert.equal((await spust(["otázka", "--role", "opus,nic"])).kod, 2);
  assert.equal((await spust(["otázka"])).kod, 0, "běžné spuštění s klíčem z prostředí projde");
  const strop = await spust(["otázka", "--limit-kc", "0.001"]);
  assert.equal(strop.kod, 1, "nikdo neodpověděl – rozpočet běhu");
  assert.equal(strop.volani.length, 0);
});

test("CLI rada --md: Markdown do složky, kterou git ignoruje; obsah pseudonymizovaný", async () => {
  const adresar = mkdtempSync(join(tmpdir(), "rada-"));
  try {
    const r = await spust([PII, "--role", "opus,grok", "--md"], {}, { adresarRady: adresar, ted: () => Date.parse("2026-10-22T10:30:00Z") });
    assert.equal(r.kod, 0, r.chyby);
    assert.equal(readFileSync(join(adresar, ".gitignore"), "utf8").trim().split("\n").at(-1), "*");
    const md = readdirSync(adresar).find((f) => f.endsWith(".md"));
    assert.equal(md, "rada-20261022-103000.md");
    const obsah = readFileSync(join(adresar, md), "utf8");
    assert.match(obsah, /Napiš panu \[JMENO_1\] na \[EMAIL_1\]/);
    assert.ok(!/Novák|seznam\.cz/.test(obsah));
    assert.ok(!obsah.includes(KLIC));
  } finally { rmSync(adresar, { recursive: true, force: true }); }
});
