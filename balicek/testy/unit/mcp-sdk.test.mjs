// Shoda brány s oficiálním klientem MCP (@modelcontextprotocol/sdk, jen devDependency balíčku): skutečný HTTP
// server na localhostu, Streamable HTTP transport, přihlášení pevným tokenem i celý tok OAuth 2.1 (objevení
// metadat, dynamická registrace, PKCE, výměna kódu) tak, jak ho dělá Claude. Bez skutečných volání AI.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { UnauthorizedError } from "@modelcontextprotocol/sdk/client/auth.js";
import { vytvorMcpFunkci } from "../../web/netlify/functions/mcp.mjs";
import { CESTY } from "../../web/netlify/lib/ai/mcp-oauth.mjs";
import { env, falesnyAdapter, pametoveUloziste, HESLO } from "../pomocne.mjs";

// Most Node http → Request/Response funkce (jako Netlify): tělo se přečte celé, odpověď se streamuje.
async function spustBranu(handler) {
  const server = http.createServer(async (req, res) => {
    const kusy = [];
    for await (const k of req) kusy.push(k);
    const telo = Buffer.concat(kusy);
    const url = `http://127.0.0.1:${server.address().port}${req.url}`;
    const hlavicky = Object.fromEntries(Object.entries(req.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(", ") : v]));
    let r;
    try {
      r = await handler(new Request(url, { method: req.method, headers: hlavicky, body: ["GET", "HEAD"].includes(req.method) ? undefined : telo }), { ip: "127.0.0.1" });
    } catch (e) {
      res.writeHead(500); res.end(String(e)); return;
    }
    res.writeHead(r.status, Object.fromEntries(r.headers));
    if (r.body) { const reader = r.body.getReader(); for (;;) { const { done, value } = await reader.read(); if (done) break; res.write(value); } }
    res.end();
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  return { server, url: `http://127.0.0.1:${server.address().port}`, zavri: () => new Promise((ok) => server.close(ok)) };
}

const TOKEN = "pevny-token-pro-claude-code-0123456789abcdef";
const brana = () => vytvorMcpFunkci({
  env: env({ HSPG_MCP_TOKEN: TOKEN, MCP_LIMIT_MS: "5000" }),
  adaptery: { gpt: falesnyAdapter({ text: "Odpověď GPT přes SDK" }), claude: falesnyAdapter({ text: "Claude" }) },
  uloziste: pametoveUloziste(),
});

test("SDK klient: pevný token v hlavičce → initialize, tools/list, tools/call (SSE i JSON)", async () => {
  const { url, zavri } = await spustBranu(brana());
  const log = console.warn; console.warn = () => {};
  try {
    const transport = new StreamableHTTPClientTransport(new URL(`${url}/api/mcp`), { requestInit: { headers: { authorization: `Bearer ${TOKEN}` } } });
    const klient = new Client({ name: "test-sdk", version: "1.0.0" });
    await klient.connect(transport);
    assert.equal(klient.getServerVersion()?.name, "hspg-ai-gateway");
    assert.match(klient.getInstructions() || "", /pseudonymizuje/);
    const { tools } = await klient.listTools();
    assert.deepEqual(tools.map((t) => t.name), ["ai_zeptat", "perplexity_hledat", "youcom_hledat", "rada_ai", "ai_stav"]);
    const stav = await klient.callTool({ name: "ai_stav", arguments: {} });
    assert.match(stav.content[0].text, /Role přes bránu/);
    assert.equal(stav.structuredContent.youcom, false);
    const odpoved = await klient.callTool({ name: "ai_zeptat", arguments: { ai: "gpt", dotaz: "Ahoj" } });
    assert.equal(odpoved.isError, undefined);
    assert.match(odpoved.content[0].text, /^Odpověď GPT přes SDK\n\n— ChatGPT/);
    const chyba = await klient.callTool({ name: "ai_zeptat", arguments: { ai: "mistral", dotaz: "Ahoj" } });
    assert.equal(chyba.isError, true);
    await assert.rejects(klient.callTool({ name: "neexistuje", arguments: {} }), /Neznámý nástroj/);
    assert.deepEqual(await klient.ping(), {});
    await transport.close();
  } finally { console.warn = log; await zavri(); }
});

test("SDK klient: OAuth 2.1 jako Claude – objevení metadat, dynamická registrace, PKCE, heslo panelu, výměna kódu, přístup", async () => {
  const { url, zavri } = await spustBranu(brana());
  const log = console.warn; console.warn = () => {};
  try {
    const poskytovatel = {
      redirectUrl: "http://localhost:3999/callback",
      clientMetadata: { client_name: "Claude (test)", redirect_uris: ["http://localhost:3999/callback"], token_endpoint_auth_method: "none", grant_types: ["authorization_code", "refresh_token"], response_types: ["code"] },
      info: undefined, toks: undefined, verifier: "", adresaAutorizace: null,
      clientInformation() { return this.info; },
      saveClientInformation(i) { this.info = i; },
      tokens() { return this.toks; },
      saveTokens(t) { this.toks = t; },
      redirectToAuthorization(u) { this.adresaAutorizace = u; },
      saveCodeVerifier(v) { this.verifier = v; },
      codeVerifier() { return this.verifier; },
    };
    let transport = new StreamableHTTPClientTransport(new URL(`${url}/api/mcp`), { authProvider: poskytovatel });
    await assert.rejects(new Client({ name: "t", version: "1" }).connect(transport), (e) => e instanceof UnauthorizedError, "bez tokenu: 401 → klient zahájí OAuth a čeká na přesměrování");
    assert.ok(poskytovatel.info?.client_id?.startsWith("k."), "dynamická registrace proběhla");
    assert.ok(poskytovatel.adresaAutorizace instanceof URL);
    const q = Object.fromEntries(poskytovatel.adresaAutorizace.searchParams);
    assert.equal(q.code_challenge_method, "S256");
    assert.equal(q.resource, `${url}/api/mcp`);
    // „Prohlížeč“ majitele: stránka s heslem → odeslání formuláře → přesměrování s kódem.
    const stranka = await fetch(poskytovatel.adresaAutorizace);
    assert.equal(stranka.status, 200);
    assert.match(await stranka.text(), /Claude \(test\)/);
    const odeslani = await fetch(`${url}${CESTY.autorizace}`, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded", origin: url }, body: new URLSearchParams({ ...q, heslo: HESLO }), redirect: "manual" });
    assert.equal(odeslani.status, 302);
    const navrat = new URL(odeslani.headers.get("location"));
    assert.equal(navrat.origin + navrat.pathname, "http://localhost:3999/callback");
    assert.equal(navrat.searchParams.get("state") ?? undefined, q.state, "state se vrací jen tehdy, když ho klient poslal");
    assert.equal(navrat.searchParams.get("iss"), url);
    await transport.finishAuth(navrat.searchParams.get("code"));
    assert.ok(poskytovatel.toks?.access_token?.startsWith("a.") && poskytovatel.toks?.refresh_token?.startsWith("r."));
    transport = new StreamableHTTPClientTransport(new URL(`${url}/api/mcp`), { authProvider: poskytovatel });
    const klient = new Client({ name: "t", version: "1" });
    await klient.connect(transport);
    const r = await klient.callTool({ name: "ai_zeptat", arguments: { ai: "gpt", dotaz: "Ahoj" } });
    assert.match(r.content[0].text, /^Odpověď GPT přes SDK/);
    await transport.close();
  } finally { console.warn = log; await zavri(); }
});
