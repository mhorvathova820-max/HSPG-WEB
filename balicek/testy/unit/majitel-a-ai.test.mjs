import { test } from "node:test";
import assert from "node:assert/strict";
import { vytvorPrihlaseni } from "../../web/netlify/functions/majitel.mjs";
import { vytvorAI } from "../../web/netlify/functions/ai.mjs";
import { vytvorStav } from "../../web/netlify/functions/ai-stav.mjs";
import { vydejToken, overToken, overPozadavek } from "../../web/netlify/lib/ai/autorizace.mjs";
import { HESLO, env, falesnyAdapter, pametoveUloziste, pozadavek } from "../pomocne.mjs";

test("token: platný, podvržený, prošlý, po změně hesla neplatný", () => {
  const e = env();
  const { token, platnost } = vydejToken(e, 1_000_000);
  assert.ok(overToken(token, e, 1_000_001));
  assert.equal(overToken(token, e, platnost + 1), false);
  assert.equal(overToken(token.replace(/.$/, (c) => (c === "A" ? "B" : "A")), e, 1_000_001), false);
  assert.equal(overToken(`${platnost + 99999}.${token.split(".")[1]}`, e, 1_000_001), false);
  assert.equal(overToken(token, env({ HSPG_PANEL_HESLO: "jine-heslo-0123456789" }), 1_000_001), false);
});

test("krátké nebo chybějící heslo = interní část zamčená (503)", () => {
  const r = overPozadavek(pozadavek("/api/ai-stav", { headers: { "x-panel-heslo": "kratke" } }), { HSPG_PANEL_HESLO: "kratke" });
  assert.equal(r.status, 503);
});

test("přihlášení: špatné heslo 401, po 5 pokusech 429, správné vydá token", async () => {
  const ul = pametoveUloziste();
  const h = vytvorPrihlaseni({ env: env(), uloziste: ul, zdrzeniMs: 0 });
  const zkus = (heslo, ip = "9.9.9.9") => h(pozadavek("/api/majitel", { method: "POST", body: { heslo } }), { ip });
  for (let i = 0; i < 5; i++) assert.equal((await zkus("spatne-heslo-123456789")).status, 401);
  assert.equal((await zkus(HESLO)).status, 429, "po 5 chybách je zámek i pro správné heslo");
  const ok = await zkus(HESLO, "8.8.8.8");
  assert.equal(ok.status, 200);
  const j = await ok.json();
  assert.ok(overToken(j.token, env()));
  const g = await h(pozadavek("/api/majitel", { headers: { authorization: `Bearer ${j.token}` } }));
  assert.equal(g.status, 200);
});

test("ai-stav: bez přihlášení 401, s tokenem vrátí AI bez klíčů a útratu", async () => {
  const h = vytvorStav({ env: env(), uloziste: pametoveUloziste() });
  assert.equal((await h(pozadavek("/api/ai-stav"))).status, 401);
  const { token } = vydejToken(env());
  const r = await h(pozadavek("/api/ai-stav", { headers: { authorization: `Bearer ${token}` } }));
  const j = await r.json();
  assert.equal(r.status, 200);
  assert.deepEqual(j.ai.map((a) => [a.id, a.zapnuto]), [["claude", true], ["gpt", true], ["gemini", true], ["grok", false]]);
  assert.ok(!JSON.stringify(j).includes("test"), "hodnota klíče se nesmí vrátit");
  assert.equal(j.limitKc, 25);
});

test("ai: streamuje text, na konci STAT s odhadem Kč, zapíše útratu", async () => {
  const ul = pametoveUloziste();
  const ad = { claude: falesnyAdapter({ text: "Ahoj světe" }) };
  const h = vytvorAI({ env: env(), adaptery: ad, uloziste: ul });
  const { token } = vydejToken(env());
  const r = await h(pozadavek("/api/ai", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: { ai: "claude", zpravy: [{ role: "user", text: "x" }], pokyn: "role" } }));
  const t = await r.text();
  const [text, stat] = t.split("\n\u0000STAT");
  assert.equal(text, "Ahoj světe");
  assert.equal(JSON.parse(stat).vstup, 120);
  assert.match(ad.claude.volani[0].system, /Pravidla pravdivosti[\s\S]*Role v této úloze:\nrole/);
  const mesic = new Date().toISOString().slice(0, 7);
  assert.equal((await ul.get(`utrata/${mesic}`)).ai.claude.dotazu, 1);
});

test("ai: bez přihlášení 401, chybějící klíč 400, chyba AI se vrátí v textu bez pádu", async () => {
  const h = vytvorAI({ env: env(), adaptery: { claude: falesnyAdapter({ chyba: "overloaded" }) }, uloziste: pametoveUloziste() });
  const body = { ai: "claude", zpravy: [{ role: "user", text: "x" }] };
  assert.equal((await h(pozadavek("/api/ai", { method: "POST", body }))).status, 401);
  const auth = { authorization: `Bearer ${vydejToken(env()).token}` };
  assert.equal((await h(pozadavek("/api/ai", { method: "POST", headers: auth, body: { ...body, ai: "grok" } }))).status, 400);
  const t = await (await h(pozadavek("/api/ai", { method: "POST", headers: auth, body }))).text();
  const [, chyba] = t.split("\n\u0000CHYBA");
  assert.equal(JSON.parse(chyba).zprava, "Chyba Claude (500): overloaded", "chyba je oddělená od textu odpovědi");
});

test("starší AI centrum: heslo v x-panel-heslo stále funguje", async () => {
  const h = vytvorStav({ env: env(), uloziste: pametoveUloziste() });
  assert.equal((await h(pozadavek("/api/ai-stav", { headers: { "x-panel-heslo": HESLO } }))).status, 200);
});

test("Netlify AI Gateway: bez beta parametrů (hlavičky neprojdou), Grok přes OpenRouter", async () => {
  const { claudeParametry, pres_gateway, jeZapnuty, POSKYTOVATELE } = await import("../../web/netlify/lib/ai/poskytovatele.mjs");
  const p = { system: "s", zpravy: [{ role: "user", text: "x" }], maxTokenu: 10, rychle: true };
  const gw = { ANTHROPIC_API_KEY: "k", ANTHROPIC_BASE_URL: "https://gateway.netlify.app/anthropic" };
  assert.equal(pres_gateway(gw), true);
  assert.equal(claudeParametry(p, gw).fallbacks, undefined);
  assert.equal(claudeParametry(p, gw).betas, undefined);
  assert.equal(claudeParametry(p, gw).output_config.effort, "low");
  const prime = { ANTHROPIC_API_KEY: "k" };
  assert.equal(pres_gateway(prime), false);
  assert.equal(claudeParametry(p, prime).fallbacks, "default");
  assert.equal(jeZapnuty("grok", { OPENROUTER_API_KEY: "k" }), true);
  assert.equal(POSKYTOVATELE.grok.model({ OPENROUTER_API_KEY: "k" }), "x-ai/grok-4");
  assert.equal(POSKYTOVATELE.grok.model({ XAI_API_KEY: "k" }), "grok-4");
});
