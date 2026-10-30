// HSPG AI Gateway – /api/mcp (úkol 59): protokol MCP (JSON-RPC, SSE), tokeny (panel, pevný, OAuth), OAuth 2.1
// s PKCE a heslem panelu, pseudonymizace, rozpočet a limity, You.com, rada AI. Bez skutečných volání AI.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import { vytvorMcpFunkci } from "../../web/netlify/functions/mcp.mjs";
import { NASTROJE, ROLE_MCP, VYCHOZI_VERZE } from "../../web/netlify/lib/ai/mcp.mjs";
import { CESTY, registrujKlienta, overPodpis, klicKlientu, vymazCimdMezipamet } from "../../web/netlify/lib/ai/mcp-oauth.mjs";
import { prevedVysledky, youcomNaText } from "../../web/netlify/lib/ai/youcom.mjs";
import { vydejToken } from "../../web/netlify/lib/ai/autorizace.mjs";
import { mesic } from "../../web/netlify/lib/ai/limity.mjs";
import { env, falesnyAdapter, pametoveUloziste, pozadavek, HESLO } from "../pomocne.mjs";

const ZAKLAD = "http://localhost";
const auth = (e = env()) => ({ authorization: `Bearer ${vydejToken(e).token}` });
const rpc = (method, params, id = 1) => ({ jsonrpc: "2.0", id, method, ...(params ? { params } : {}) });
const volani = (name, args, id = 2) => rpc("tools/call", { name, arguments: args }, id);
const b64u = (b) => Buffer.from(b).toString("base64url");
const pkce = () => { const verifier = b64u(randomBytes(32)); return { verifier, challenge: b64u(createHash("sha256").update(verifier).digest()) }; };
const form = (url, data, headers = {}) => new Request(`${ZAKLAD}${url}`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", ...headers }, body: new URLSearchParams(data).toString() });
function zachytLog() {
  const puvodni = console.warn;
  const zaznamy = [];
  console.warn = (...a) => zaznamy.push(a.join(" "));
  return { zaznamy, vrat: () => { console.warn = puvodni; } };
}
const brana = (volby = {}) => {
  const ul = volby.uloziste || pametoveUloziste();
  const e = volby.env || env();
  const h = vytvorMcpFunkci({ env: e, adaptery: volby.adaptery || { gpt: falesnyAdapter({ text: "Odpověď GPT" }), claude: falesnyAdapter({ text: "Odpověď Clauda" }) }, uloziste: ul, fetch: volby.fetch });
  return { h, ul, e };
};

test("metadata: autorizační server a chráněný zdroj ukazují na správné adresy brány", async () => {
  const { h } = brana();
  const as = await (await h(pozadavek(CESTY.metadataAS))).json();
  assert.equal(as.issuer, ZAKLAD);
  assert.equal(as.authorization_endpoint, `${ZAKLAD}${CESTY.autorizace}`);
  assert.equal(as.token_endpoint, `${ZAKLAD}${CESTY.token}`);
  assert.equal(as.registration_endpoint, `${ZAKLAD}${CESTY.registrace}`);
  assert.deepEqual(as.code_challenge_methods_supported, ["S256"]);
  assert.equal(as.client_id_metadata_document_supported, true);
  for (const cesta of [CESTY.metadataZdroj, `${CESTY.metadataZdroj}/api/mcp`]) {
    const z = await (await h(pozadavek(cesta))).json();
    assert.equal(z.resource, `${ZAKLAD}/api/mcp`);
    assert.deepEqual(z.authorization_servers, [ZAKLAD]);
  }
  assert.equal((await h(pozadavek("/api/mcp/neco"))).status, 404);
  const r405 = await h(pozadavek("/api/mcp"));
  assert.equal(r405.status, 405);
  assert.equal(r405.headers.get("allow"), "POST");
});

test("bez tokenu 401 s WWW-Authenticate (resource_metadata) – Claude podle toho spustí OAuth; cizí Origin 403", async () => {
  const { h } = brana();
  const r = await h(pozadavek("/api/mcp", { method: "POST", body: rpc("initialize", { protocolVersion: "2025-06-18" }) }));
  assert.equal(r.status, 401);
  assert.match(r.headers.get("www-authenticate"), /^Bearer realm="HSPG AI Gateway", resource_metadata="http:\/\/localhost\/\.well-known\/oauth-protected-resource"$/);
  const r2 = await h(pozadavek("/api/mcp", { method: "POST", headers: { authorization: "Bearer neplatny" }, body: rpc("ping") }));
  assert.equal(r2.status, 401);
  assert.match(r2.headers.get("www-authenticate"), /error="invalid_token"/);
  const r3 = await h(pozadavek("/api/mcp", { method: "POST", headers: { ...auth(), origin: "https://cizi.example" }, body: rpc("ping") }));
  assert.equal(r3.status, 403);
  const r4 = await h(pozadavek("/api/mcp", { method: "POST", headers: { ...auth(), origin: "https://hspg.cz" }, body: rpc("ping") }));
  assert.equal(r4.status, 200);
});

test("protokol: initialize, tools/list (5 nástrojů), ping, oznámení bez odpovědi (202), neznámá metoda, dávka", async () => {
  const { h } = brana();
  const init = await (await h(pozadavek("/api/mcp", { method: "POST", headers: auth(), body: rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test" } }) }))).json();
  assert.equal(init.result.protocolVersion, "2025-03-26", "známou verzi klienta zopakuje");
  assert.equal(init.result.serverInfo.name, "hspg-ai-gateway");
  assert.ok(init.result.capabilities.tools);
  assert.match(init.result.instructions, /pseudonymizuje/);
  const init2 = await (await h(pozadavek("/api/mcp", { method: "POST", headers: auth(), body: rpc("initialize", { protocolVersion: "1999-01-01" }) }))).json();
  assert.equal(init2.result.protocolVersion, VYCHOZI_VERZE, "neznámá verze → výchozí");
  const seznam = await (await h(pozadavek("/api/mcp", { method: "POST", headers: auth(), body: rpc("tools/list") }))).json();
  assert.deepEqual(seznam.result.tools.map((t) => t.name), ["ai_zeptat", "perplexity_hledat", "youcom_hledat", "rada_ai", "ai_stav"]);
  assert.ok(NASTROJE.every((t) => t.inputSchema?.type === "object" && typeof t.description === "string"));
  assert.ok(!ROLE_MCP.includes("muse"), "Muse (bez ZDR) přes bránu není");
  assert.ok(ROLE_MCP.includes("perplexity") && ROLE_MCP.includes("grok") && ROLE_MCP.includes("gpt"));
  const ping = await (await h(pozadavek("/api/mcp", { method: "POST", headers: auth(), body: rpc("ping", undefined, "p1") }))).json();
  assert.deepEqual(ping, { jsonrpc: "2.0", id: "p1", result: {} });
  const ozn = await h(pozadavek("/api/mcp", { method: "POST", headers: auth(), body: { jsonrpc: "2.0", method: "notifications/initialized" } }));
  assert.equal(ozn.status, 202);
  const nezn = await (await h(pozadavek("/api/mcp", { method: "POST", headers: auth(), body: rpc("resources/list") }))).json();
  assert.equal(nezn.error.code, -32601);
  const spatny = await (await h(pozadavek("/api/mcp", { method: "POST", headers: auth(), body: "{" }))).json();
  assert.equal(spatny.error.code, -32700);
  const davka = await (await h(pozadavek("/api/mcp", { method: "POST", headers: auth(), body: [rpc("ping", undefined, 1), { jsonrpc: "2.0", method: "notifications/initialized" }, rpc("ping", undefined, 2)] }))).json();
  assert.deepEqual(davka.map((o) => o.id), [1, 2]);
});

test("ai_zeptat: pseudonymizace před modelem, doplnění zpět, útrata a limit v úložišti, log bez obsahu", async () => {
  const gpt = falesnyAdapter({ text: (p) => `Napíšu ${p.zpravy[0].text.match(/\[TELEFON_1\]/) ? "[TELEFON_1]" : "nic"} a [EMAIL_1]` });
  const { h, ul } = brana({ adaptery: { gpt } });
  const log = zachytLog();
  let r;
  try {
    r = await (await h(pozadavek("/api/mcp", { method: "POST", headers: auth(), body: volani("ai_zeptat", { ai: "gpt", dotaz: "Zavolej panu Novákovi na 736 618 486, e-mail novak@example.com", pokyn: "Jsi asistent." }) }))).json();
  } finally { log.vrat(); }
  assert.equal(gpt.volani.length, 1);
  const p = gpt.volani[0];
  assert.ok(!p.zpravy[0].text.includes("736") && !p.zpravy[0].text.includes("novak@"), "model dostane jen značky");
  assert.match(p.zpravy[0].text, /\[TELEFON_1\]/);
  assert.match(p.system, /HSPG AI Gateway/);
  assert.match(p.system, /Role v této úloze:\nJsi asistent\./);
  assert.equal(p.maxTokenu, 4000);
  assert.equal(r.result.isError, undefined);
  assert.match(r.result.content[0].text, /^Napíšu 736 618 486 a novak@example\.com\n\n— ChatGPT \(gpt-5\) · 100\/50 tokenů · ≈ [\d.]+ Kč \(kredity Netlify\) · pseudonymizováno 3$/);
  assert.equal(r.result.structuredContent.ai, "gpt");
  assert.equal(r.result.structuredContent.cesta, "gateway");
  const utrata = await ul.get(`utrata/${mesic(Date.now())}`);
  assert.equal(utrata.ai.gpt.dotazu, 1);
  assert.ok(utrata.celkemKc > 0);
  assert.equal((await ul.get("limit/ai-majitel")).n, 1);
  assert.ok(log.zaznamy.some((z) => z.includes('"udalost":"mcp"') && z.includes('"nastroj":"ai_zeptat"')));
  assert.ok(log.zaznamy.every((z) => !z.includes("Novák") && !z.includes("736") && !z.includes("Napíšu")), "log bez osobních údajů a textu");
});

test("ai_zeptat: role bez klíče, neznámá role, prázdný dotaz, rozpočet a limit 120/10 min → isError (ne chyba protokolu)", async () => {
  const { h, ul } = brana({ env: env({ AI_MESICNI_LIMIT_KC: "0.0001" }) });
  const zavolej = async (args) => (await (await h(pozadavek("/api/mcp", { method: "POST", headers: auth(), body: volani("ai_zeptat", args) }))).json()).result;
  const bezKlice = await zavolej({ ai: "mistral", dotaz: "Ahoj" });
  assert.equal(bezKlice.isError, true);
  assert.match(bezKlice.content[0].text, /nemá v Netlify klíč/);
  const nezn = await zavolej({ ai: "nic", dotaz: "Ahoj" });
  assert.match(nezn.content[0].text, /Neznámá role/);
  const prazdny = await zavolej({ ai: "gpt", dotaz: "   " });
  assert.match(prazdny.content[0].text, /prázdný/);
  const rozpocet = await zavolej({ ai: "gpt", dotaz: "Ahoj" });
  assert.equal(rozpocet.structuredContent.status, 402);
  assert.match(rozpocet.content[0].text, /rozpočet AI/);
  await ul.setJSON("limit/ai-majitel", { n: 120, od: Date.now() });
  const limit = await zavolej({ ai: "gpt", dotaz: "Ahoj" });
  assert.equal(limit.structuredContent.status, 429);
  const r = await (await h(pozadavek("/api/mcp", { method: "POST", headers: auth(), body: volani("neexistuje", {}) }))).json();
  assert.equal(r.error.code, -32602, "neznámý nástroj = chyba protokolu");
});

test("ai_zeptat: přechodná chyba → jedno opakování; chyba nastavení (401) se neopakuje; vlastní klíč OpenRouter = mimo kredity", async () => {
  let pokusy = 0;
  const grok = { async dotaz() { pokusy++; if (pokusy === 1) throw Object.assign(new Error("down"), { status: 503 }); return { text: "Grok ok", stat: { vstup: 10, vystup: 5, model: "x-ai/grok-4.7" } }; }, async *stream() {} };
  const { h, ul } = brana({ env: env({ HSPG_KLIC_OPENROUTER: "sk-test" }), adaptery: { grok } });
  const log = zachytLog();
  let r;
  try { r = await (await h(pozadavek("/api/mcp", { method: "POST", headers: auth(), body: volani("ai_zeptat", { ai: "grok", dotaz: "Co je nového?" }) }))).json(); } finally { log.vrat(); }
  assert.equal(pokusy, 2);
  assert.match(r.result.content[0].text, /^Grok ok\n\n— Grok \(x-ai\/grok-4\.7\) · 10\/5 tokenů · ≈ [\d.]+ Kč \(vlastní klíč, mimo kredity Netlify\)$/);
  assert.equal(r.result.structuredContent.cesta, "openrouter-vlastni");
  const utrata = await ul.get(`utrata/${mesic(Date.now())}`);
  assert.equal(utrata.celkemKc, 0, "vlastní klíč se do kreditů nepočítá");
  assert.ok(utrata.vlastniKc > 0);
  let pokusy2 = 0;
  const gpt = { async dotaz() { pokusy2++; throw Object.assign(new Error("bad key"), { status: 401 }); }, async *stream() {} };
  const { h: h2 } = brana({ adaptery: { gpt } });
  const log2 = zachytLog();
  let r2;
  try { r2 = await (await h2(pozadavek("/api/mcp", { method: "POST", headers: auth(), body: volani("ai_zeptat", { ai: "gpt", dotaz: "Ahoj" }) }))).json(); } finally { log2.vrat(); }
  assert.equal(pokusy2, 1);
  assert.equal(r2.result.isError, true);
  assert.match(r2.result.content[0].text, /ChatGPT neodpověděl: \(401\) bad key/);
});

test("ai_zeptat: časová hranice streamované funkce – po vypršení prvního pokusu se bez zbytku času neopakuje (504), rezervace zůstává", async () => {
  const pomaly = falesnyAdapter({ text: "pozdě", zpozdeni: 400 });
  const { h, ul } = brana({ env: env({ MCP_LIMIT_MS: "40", MCP_HRANICE_MS: "50" }), adaptery: { gpt: pomaly } });
  const log = zachytLog();
  let r;
  try { r = await (await h(pozadavek("/api/mcp", { method: "POST", headers: auth(), body: volani("ai_zeptat", { ai: "gpt", dotaz: "Ahoj" }) }))).json(); } finally { log.vrat(); }
  assert.equal(pomaly.volani.length, 1, "na opakování už není čas");
  assert.equal(r.result.isError, true);
  assert.equal(r.result.structuredContent.status, 504);
  assert.ok((await ul.get(`utrata/${mesic(Date.now())}`)).celkemKc > 0, "rezervace po vypršení zůstává (tokeny mohly být účtované)");
  // S dostatkem času se vypršení jednou zopakuje.
  const pomaly2 = falesnyAdapter({ text: "pozdě", zpozdeni: 400 });
  const { h: h2 } = brana({ env: env({ MCP_LIMIT_MS: "40", MCP_HRANICE_MS: "5000" }), adaptery: { gpt: pomaly2 } });
  const log2 = zachytLog();
  let r2;
  try { r2 = await (await h2(pozadavek("/api/mcp", { method: "POST", headers: auth(), body: volani("ai_zeptat", { ai: "gpt", dotaz: "Ahoj" }) }))).json(); } finally { log2.vrat(); }
  assert.equal(pomaly2.volani.length, 2);
  assert.equal(r2.result.structuredContent.status, 504);
});

test("SSE: tools/call s Accept text/event-stream přijde jako proud s udržovacím komentářem a jednou událostí message", async () => {
  const { h } = brana();
  const r = await h(pozadavek("/api/mcp", { method: "POST", headers: { ...auth(), accept: "application/json, text/event-stream" }, body: volani("ai_stav", {}, "s1") }));
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type"), /^text\/event-stream/);
  const text = await r.text();
  assert.ok(text.startsWith(": hspg-ai-gateway\n\n"));
  const udalosti = text.split("\n\n").filter((u) => u.startsWith("event: message"));
  assert.equal(udalosti.length, 1);
  const data = JSON.parse(udalosti[0].replace(/^event: message\ndata: /, ""));
  assert.equal(data.id, "s1");
  assert.match(data.result.content[0].text, /Role přes bránu/);
  // Bez tools/call (tools/list) zůstává JSON i s Accept text/event-stream.
  const r2 = await h(pozadavek("/api/mcp", { method: "POST", headers: { ...auth(), accept: "application/json, text/event-stream" }, body: rpc("tools/list") }));
  assert.match(r2.headers.get("content-type"), /^application\/json/);
});

test("ai_stav: role, cesta, You.com a rozpočet – bez klíčů", async () => {
  const { h } = brana({ env: env({ HSPG_KLIC_YOUCOM: "ydc-test", HSPG_KLIC_OPENROUTER: "sk-test" }) });
  const r = await (await h(pozadavek("/api/mcp", { method: "POST", headers: auth(), body: volani("ai_stav", {}) }))).json();
  const d = r.result.structuredContent;
  assert.equal(d.youcom, true);
  assert.equal(d.role.find((x) => x.id === "perplexity").cesta, "openrouter-vlastni");
  assert.equal(d.role.find((x) => x.id === "claude").cesta, "gateway");
  assert.equal(d.limitKc, 25);
  assert.ok(!JSON.stringify(r).includes("ydc-test") && !JSON.stringify(r).includes("sk-test"), "klíče se nevrací");
});

test("pevný token HSPG_MCP_TOKEN (≥ 32 znaků) platí; kratší se ignoruje", async () => {
  const dlouhy = "a".repeat(40);
  const { h } = brana({ env: env({ HSPG_MCP_TOKEN: dlouhy }) });
  assert.equal((await h(pozadavek("/api/mcp", { method: "POST", headers: { authorization: `Bearer ${dlouhy}` }, body: rpc("ping") }))).status, 200);
  assert.equal((await h(pozadavek("/api/mcp", { method: "POST", headers: { authorization: `Bearer ${"a".repeat(39)}` }, body: rpc("ping") }))).status, 401);
  const { h: h2 } = brana({ env: env({ HSPG_MCP_TOKEN: "kratky" }) });
  assert.equal((await h2(pozadavek("/api/mcp", { method: "POST", headers: { authorization: "Bearer kratky" }, body: rpc("ping") }))).status, 401);
});

test("youcom_hledat: bez klíče poradí konektor; s klíčem pošle pseudonymizovaný dotaz a vrátí výsledky", async () => {
  const { h } = brana();
  const bez = await (await h(pozadavek("/api/mcp", { method: "POST", headers: auth(), body: volani("youcom_hledat", { dotaz: "nano impregnace" }) }))).json();
  assert.equal(bez.result.isError, true);
  assert.match(bez.result.content[0].text, /HSPG_KLIC_YOUCOM/);
  assert.match(bez.result.content[0].text, /api\.you\.com\/mcp/);
  const pozadavky = [];
  const f = async (url, o) => {
    pozadavky.push({ url, o });
    return { ok: true, status: 200, json: async () => ({ results: { web: [{ title: "Nano ochrana střech", url: "https://example.com/a", page_age: "2026-10-01", contents: { highlights: ["Hydrofobní   vrstva", "10 let"] } }, { title: "", url: "https://example.com/b", description: "Popis" }] } }) };
  };
  const { h: h2 } = brana({ env: env({ HSPG_KLIC_YOUCOM: "ydc-test" }), fetch: f });
  const r = await (await h2(pozadavek("/api/mcp", { method: "POST", headers: auth(), body: volani("youcom_hledat", { dotaz: "nano impregnace střech pan Novák 736618486", pocet: 5, cerstvost: "month" }) }))).json();
  assert.equal(pozadavky.length, 1);
  assert.equal(pozadavky[0].url, "https://ydc-index.io/v1/search");
  assert.equal(pozadavky[0].o.headers["x-api-key"], "ydc-test");
  const telo = JSON.parse(pozadavky[0].o.body);
  assert.ok(!telo.query.includes("736"), "dotaz jde pseudonymizovaný");
  assert.equal(telo.count, 5);
  assert.equal(telo.country, "CZ");
  assert.equal(telo.freshness, "month");
  assert.equal(r.result.isError, undefined);
  assert.equal(r.result.structuredContent.vysledky.length, 2);
  assert.equal(r.result.structuredContent.vysledky[0].uryvek, "Hydrofobní vrstva … 10 let");
  assert.match(r.result.content[0].text, /^You\.com – 2 výsledků/);
  assert.ok(!JSON.stringify(r).includes("ydc-test"));
  assert.equal(prevedVysledky({ results: { web: [{ url: "" }] } }).length, 0);
  assert.match(youcomNaText({ dotaz: "x", vysledky: [] }), /nic nenašel/);
});

test("rada_ai: členové paralelně, předseda Claude shrne, texty doplněné zpět, cena celkem", async () => {
  const claude = falesnyAdapter({ text: (p) => (p.zpravy[0].text.includes("ODPOVĚDI ČLENŮ RADY") ? '{"shoda":["Cena [TELEFON_1] platí"],"rozdily":["GPT chce víc"],"doporuceni":"Ověřit u [JMENO_1]."}' : "Claude člen") });
  const gpt = falesnyAdapter({ text: "GPT člen" });
  const { h } = brana({ adaptery: { claude, gpt } });
  const r = await (await h(pozadavek("/api/mcp", { method: "POST", headers: auth(), body: volani("rada_ai", { dotaz: "Nabídka pro pana Nováka, tel. 736 618 486", role: ["claude", "gpt", "mistral"] }) }))).json();
  const d = r.result.structuredContent;
  assert.equal(r.result.isError, undefined);
  assert.equal(d.clenove.length, 2, "mistral bez klíče je vynechaný");
  assert.ok(d.clenove.every((c) => c.ok));
  assert.equal(d.predseda.ok, true);
  assert.deepEqual(d.predseda.shoda, ["Cena 736 618 486 platí"]);
  assert.match(d.predseda.doporuceni, /Ověřit u Nováka\./, "značka jména se doplní zpět (pseudonymizace ukládá jméno bez oslovení)");
  assert.match(r.result.content[0].text, /RADA AI – 2\/2 členů odpovědělo \(bez klíče: mistral\)/);
  assert.match(r.result.content[0].text, /=== PŘEDSEDA Claude/);
  assert.match(r.result.content[0].text, /— celkem ≈ [\d.]+ Kč · 3 volání/);
  assert.ok(gpt.volani[0].zpravy[0].text.includes("[TELEFON_1]") && !gpt.volani[0].zpravy[0].text.includes("736"));
});

test("OAuth: registrace → autorizace s heslem panelu → kód (PKCE) → tokeny → přístup; opakování kódu a špatný verifier selžou; obnova", async () => {
  const { h, ul } = brana();
  const reg = await h(pozadavek(CESTY.registrace, { method: "POST", body: { client_name: "Claude", redirect_uris: ["https://claude.ai/api/mcp/auth_callback", "http://localhost:3333/callback"], token_endpoint_auth_method: "none", grant_types: ["authorization_code", "refresh_token"] } }));
  assert.equal(reg.status, 201);
  const klient = await reg.json();
  assert.ok(klient.client_id.startsWith("k."));
  assert.equal(klient.token_endpoint_auth_method, "none");
  const { verifier, challenge } = pkce();
  const q = { response_type: "code", client_id: klient.client_id, redirect_uri: "https://claude.ai/api/mcp/auth_callback", code_challenge: challenge, code_challenge_method: "S256", state: "st-1", scope: "mcp", resource: `${ZAKLAD}/api/mcp` };
  const stranka = await h(pozadavek(`${CESTY.autorizace}?${new URLSearchParams(q)}`));
  assert.equal(stranka.status, 200);
  const htmlText = await stranka.text();
  assert.match(htmlText, /<form method="post"/);
  assert.match(htmlText, /name="client_id" value="k\./);
  assert.match(htmlText, /Claude<\/strong>/);
  assert.doesNotMatch(htmlText, /<script/);
  const spatne = await h(form(CESTY.autorizace, { ...q, heslo: "spatne-heslo" }));
  assert.equal(spatne.status, 401);
  assert.match(await spatne.text(), /Špatné heslo/);
  const ok = await h(form(CESTY.autorizace, { ...q, heslo: HESLO }));
  assert.equal(ok.status, 302);
  const presmer = new URL(ok.headers.get("location"));
  assert.equal(presmer.origin + presmer.pathname, "https://claude.ai/api/mcp/auth_callback");
  assert.equal(presmer.searchParams.get("state"), "st-1");
  assert.equal(presmer.searchParams.get("iss"), ZAKLAD);
  const kod = presmer.searchParams.get("code");
  assert.ok(kod.startsWith("c."));
  const klicZamku = [...ul._mapa.keys()].find((k) => k.startsWith("limit/login/"));
  assert.equal((await ul.get(klicZamku)).n, 1, "úspěch pokus vrátí (zůstal jen ten špatný)");
  const spatnyVerifier = await h(form(CESTY.token, { grant_type: "authorization_code", code: kod, client_id: klient.client_id, redirect_uri: q.redirect_uri, code_verifier: "x".repeat(50) }));
  assert.equal(spatnyVerifier.status, 400);
  assert.equal((await spatnyVerifier.json()).error, "invalid_grant");
  const tok = await h(form(CESTY.token, { grant_type: "authorization_code", code: kod, client_id: klient.client_id, redirect_uri: q.redirect_uri, code_verifier: verifier, resource: `${ZAKLAD}/api/mcp` }));
  assert.equal(tok.status, 200);
  const tokeny = await tok.json();
  assert.equal(tokeny.token_type, "Bearer");
  assert.equal(tokeny.expires_in, 12 * 3600);
  assert.ok(tokeny.access_token.startsWith("a.") && tokeny.refresh_token.startsWith("r."));
  const znovu = await h(form(CESTY.token, { grant_type: "authorization_code", code: kod, client_id: klient.client_id, redirect_uri: q.redirect_uri, code_verifier: verifier }));
  assert.equal(znovu.status, 400, "kód jde použít jen jednou");
  const init = await h(pozadavek("/api/mcp", { method: "POST", headers: { authorization: `Bearer ${tokeny.access_token}` }, body: rpc("initialize", { protocolVersion: "2025-06-18" }) }));
  assert.equal(init.status, 200);
  const jinyZaklad = new Request("https://jiny.example/api/mcp", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${tokeny.access_token}` }, body: JSON.stringify(rpc("ping")) });
  assert.equal((await h(jinyZaklad)).status, 401, "token platí jen pro adresu brány (aud)");
  const obnova = await h(pozadavek(CESTY.token, { method: "POST", body: { grant_type: "refresh_token", refresh_token: tokeny.refresh_token, client_id: klient.client_id } }));
  assert.equal(obnova.status, 200);
  const nove = await obnova.json();
  assert.ok(nove.access_token && nove.access_token !== tokeny.access_token);
  assert.equal((await h(pozadavek("/api/mcp", { method: "POST", headers: { authorization: `Bearer ${nove.access_token}` }, body: rpc("ping") }))).status, 200);
  const cizi = await h(pozadavek(CESTY.token, { method: "POST", body: { grant_type: "refresh_token", refresh_token: tokeny.refresh_token, client_id: "jiny" } }));
  assert.equal(cizi.status, 400);
  const grant = await h(pozadavek(CESTY.token, { method: "POST", body: { grant_type: "password" } }));
  assert.equal((await grant.json()).error, "unsupported_grant_type");
});

test("OAuth: vadný klient / redirect_uri → stránka 400 (nikdy přesměrování); chybějící PKCE → přesměrování s error; registrace odmítne http mimo localhost a tajemství klienta", async () => {
  const { h } = brana();
  const reg = await (await h(pozadavek(CESTY.registrace, { method: "POST", body: { redirect_uris: ["https://claude.ai/cb"] } }))).json();
  const neregistrovany = await h(pozadavek(`${CESTY.autorizace}?${new URLSearchParams({ response_type: "code", client_id: "k.neco.podpis", redirect_uri: "https://utocnik.example/cb", code_challenge: "a".repeat(43), code_challenge_method: "S256" })}`));
  assert.equal(neregistrovany.status, 400);
  assert.match(await neregistrovany.text(), /Neznámý klient/);
  const jinyRedirect = await h(pozadavek(`${CESTY.autorizace}?${new URLSearchParams({ response_type: "code", client_id: reg.client_id, redirect_uri: "https://utocnik.example/cb", code_challenge: "a".repeat(43), code_challenge_method: "S256" })}`));
  assert.equal(jinyRedirect.status, 400);
  const bezPkce = await h(pozadavek(`${CESTY.autorizace}?${new URLSearchParams({ response_type: "code", client_id: reg.client_id, redirect_uri: "https://claude.ai/cb", state: "s" })}`));
  assert.equal(bezPkce.status, 302);
  const u = new URL(bezPkce.headers.get("location"));
  assert.equal(u.searchParams.get("error"), "invalid_request");
  assert.equal(u.searchParams.get("state"), "s");
  const jinyZdroj = await h(pozadavek(`${CESTY.autorizace}?${new URLSearchParams({ response_type: "code", client_id: reg.client_id, redirect_uri: "https://claude.ai/cb", code_challenge: "a".repeat(43), code_challenge_method: "S256", resource: "https://jiny.example/api/mcp" })}`));
  assert.equal(new URL(jinyZdroj.headers.get("location")).searchParams.get("error"), "invalid_target");
  const http = await h(pozadavek(CESTY.registrace, { method: "POST", body: { redirect_uris: ["http://utocnik.example/cb"] } }));
  assert.equal(http.status, 400);
  const tajne = await h(pozadavek(CESTY.registrace, { method: "POST", body: { redirect_uris: ["https://claude.ai/cb"], token_endpoint_auth_method: "client_secret_post" } }));
  assert.equal(tajne.status, 400);
  const r = registrujKlienta({ redirect_uris: ["https://a.example/cb"] }, klicKlientu("tajemstvi"), 1000);
  assert.deepEqual(overPodpis(r.klient.client_id, "k", klicKlientu("tajemstvi")).ru, ["https://a.example/cb"]);
  assert.equal(overPodpis(r.klient.client_id, "k", klicKlientu("jine")), null, "jiné tajemství = neplatný klient");
});

test("OAuth: zámek 5 pokusů / 15 min na heslo (společný s /api/majitel) a limit 60 / 10 min na registrace", async () => {
  const { h, ul } = brana();
  const reg = await (await h(pozadavek(CESTY.registrace, { method: "POST", body: { redirect_uris: ["https://claude.ai/cb"] } }))).json();
  const q = { response_type: "code", client_id: reg.client_id, redirect_uri: "https://claude.ai/cb", code_challenge: "a".repeat(43), code_challenge_method: "S256" };
  for (let i = 0; i < 5; i++) assert.equal((await h(form(CESTY.autorizace, { ...q, heslo: "spatne" }))).status, 401);
  const sesty = await h(form(CESTY.autorizace, { ...q, heslo: HESLO }));
  assert.equal(sesty.status, 429, "i správné heslo po 5 neúspěších čeká");
  const klic = [...ul._mapa.keys()].find((k) => k.startsWith("limit/mcp-oauth/"));
  await ul.setJSON(klic, { n: 60, od: Date.now() });
  const r = await h(pozadavek(CESTY.registrace, { method: "POST", body: { redirect_uris: ["https://claude.ai/cb"] } }));
  assert.equal(r.status, 429);
});

test("OAuth: klient s dokumentem metadat (CIMD, „Use Claude's published identity“) se ověří z jeho adresy", async () => {
  vymazCimdMezipamet();
  const adresa = "https://claude.ai/.well-known/client-metadata.json";
  const f = async (url) => ({ ok: url === adresa, json: async () => ({ client_id: adresa, client_name: "Claude (Anthropic)", redirect_uris: ["https://claude.ai/api/mcp/auth_callback"] }) });
  const { h } = brana({ fetch: f });
  const { verifier, challenge } = pkce();
  const q = { response_type: "code", client_id: adresa, redirect_uri: "https://claude.ai/api/mcp/auth_callback", code_challenge: challenge, code_challenge_method: "S256", state: "x" };
  const stranka = await h(pozadavek(`${CESTY.autorizace}?${new URLSearchParams(q)}`));
  assert.equal(stranka.status, 200);
  assert.match(await stranka.text(), /Claude \(Anthropic\)/);
  const ok = await h(form(CESTY.autorizace, { ...q, heslo: HESLO }));
  assert.equal(ok.status, 302);
  const kod = new URL(ok.headers.get("location")).searchParams.get("code");
  const tok = await h(form(CESTY.token, { grant_type: "authorization_code", code: kod, client_id: adresa, redirect_uri: q.redirect_uri, code_verifier: verifier }));
  assert.equal(tok.status, 200);
  const cizi = await h(pozadavek(`${CESTY.autorizace}?${new URLSearchParams({ ...q, redirect_uri: "https://utocnik.example/cb" })}`));
  assert.equal(cizi.status, 400);
});

test("bez HSPG_PANEL_HESLO → 503 (brána se bez hesla panelu nespustí)", async () => {
  const { h } = brana({ env: { HSPG_TOKEN_TAJEMSTVI: "testovaci-tajemstvi-serveru-0123456789" } });
  assert.equal((await h(pozadavek("/api/mcp", { method: "POST", headers: { authorization: "Bearer x" }, body: rpc("ping") }))).status, 503);
  const r = await h(pozadavek(CESTY.token, { method: "POST", body: { grant_type: "refresh_token", refresh_token: "r.x.y" } }));
  assert.equal(r.status, 503);
});
