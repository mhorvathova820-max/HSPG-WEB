// /api/mcp – HSPG AI Gateway: vzdálený MCP server pro Claude majitele (úkol 59). Streamable HTTP, bezstavový.
//   POST /api/mcp                      JSON-RPC (initialize, tools/list, tools/call, ping); tools/call s Accept
//                                      text/event-stream jde jako SSE s udržovacími řádky (dlouhé dotazy, rada)
//   GET/DELETE /api/mcp                405 (žádný proud od serveru, žádné relace)
//   GET  /.well-known/oauth-protected-resource[/api/mcp]   metadata chráněného zdroje (RFC 9728)
//   GET  /.well-known/oauth-authorization-server           metadata autorizačního serveru (RFC 8414)
//   POST /api/mcp/oauth/register       dynamická registrace klienta (RFC 7591) – bez zápisu do úložiště
//   GET/POST /api/mcp/oauth/authorize  stránka s heslem panelu majitele → autorizační kód (PKCE S256)
//   POST /api/mcp/oauth/token          kód → přístupový (12 h) + obnovovací (90 dní) token; obnova tokenu
// Přijímané tokeny (Authorization: Bearer …): token panelu (/api/majitel), přístupový token OAuth této brány,
// nebo pevný HSPG_MCP_TOKEN (≥ 32 znaků, zadává majitel v Netlify – pro Claude Code / Desktop / hlavičku
// konektoru). Bez platného tokenu 401 s WWW-Authenticate → Claude sám spustí přihlášení OAuth.
// Limity: hádání hesla 5 pokusů / 15 min (společný zámek s /api/majitel), OAuth endpointy 60 / 10 min na
// klienta, nástroje 120 volání / 10 min (společné s panelem). Logy bez obsahu dotazů. Klíče se nikdy nevrací.
import { createHash, timingSafeEqual } from "node:crypto";
import { vytvorMcp } from "../lib/ai/mcp.mjs";
import {
  CESTY, metadataAutorizacnihoServeru, metadataChranenehoZdroje, registrujKlienta, overKlienta, overAutorizacniParametry,
  vydejKod, presmerovaniSKodem, presmerovaniSChybou, vymenKod, obnovToken, overPristupovyToken, klicTokenu, klicKlientu,
  strankaPrihlaseni, strankaChyby,
} from "../lib/ai/mcp-oauth.mjs";
import { overToken, hesloNastaveno, overHeslo, tajemstviServeru, povolenyOrigin } from "../lib/ai/autorizace.mjs";
import { vychoziUloziste, otiskKlienta, sitKlienta, povolPokusOPrihlaseni, vratPokusOPrihlaseni, pricti } from "../lib/ai/limity.mjs";

export const MIN_DELKA_MCP_TOKENU = 32;
const MAX_TELO = 300_000;
const KEEPALIVE_MS = 10_000;
const LIMIT_OAUTH = { pocet: 60, oknoMs: 10 * 60_000 };

const json = (data, status = 200, hlavicky = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...hlavicky } });
const html = (text, status = 200) =>
  new Response(text, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-frame-options": "DENY", "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'", "referrer-policy": "no-referrer" } });
const chybaOauth = (chyba, popis, status = 400) => json({ error: chyba, error_description: popis }, status);
const otisk = (s) => createHash("sha256").update(String(s)).digest();
const stejne = (a, b) => timingSafeEqual(otisk(a), otisk(b));

async function prectiTelo(req) {
  const typ = (req.headers.get("content-type") || "").toLowerCase();
  const text = await req.text();
  if (text.length > MAX_TELO) throw Object.assign(new Error("Tělo je příliš velké."), { status: 413 });
  // JSON podle hlavičky, nebo podle tvaru těla (klient bez Content-Type); jinak formulář (x-www-form-urlencoded).
  if (typ.includes("application/json") || (!typ.includes("x-www-form-urlencoded") && /^\s*[[{]/.test(text))) {
    try { return JSON.parse(text || "{}"); } catch { throw Object.assign(new Error("Neplatný JSON."), { status: 400 }); }
  }
  return Object.fromEntries(new URLSearchParams(text));
}

export function vytvorMcpFunkci({ env = process.env, adaptery, uloziste, ted = () => Date.now(), fetch: f } = {}) {
  let ul = uloziste;
  const dejUloziste = async () => (ul ||= await vychoziUloziste());
  const mcp = vytvorMcp({ env, adaptery, dejUloziste, ted, fetch: f });
  const klient = (req, context, t) => otiskKlienta(sitKlienta(context?.ip || req.headers.get("x-nf-client-connection-ip")), t);

  // Tajemství serveru je povinné pro všechny podpisy; bez úložiště → 503 (nikdy průchod).
  const tajemstvi = async () => tajemstviServeru(env, await dejUloziste());

  async function overBearer(req, zaklad) {
    if (!hesloNastaveno(env)) return { ok: false, status: 503, duvod: "HSPG_PANEL_HESLO není v Netlify nastavené (min. 16 znaků)." };
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ") || auth.length > 4200) return { ok: false, status: 401, duvod: "Chybí přístupový token.", bezTokenu: true };
    const token = auth.slice(7).trim();
    const pevny = String(env.HSPG_MCP_TOKEN || "");
    if (pevny.length >= MIN_DELKA_MCP_TOKENU && stejne(token, pevny)) return { ok: true, zpusob: "pevny" };
    let t;
    try { t = await tajemstvi(); } catch { return { ok: false, status: 503, duvod: "Úložiště není dostupné – přihlášení teď nejde ověřit." }; }
    const ted0 = ted();
    if (overToken(token, env, ted0, t)) return { ok: true, zpusob: "panel" };
    if (overPristupovyToken(token, klicTokenu(env, t), zaklad, ted0)) return { ok: true, zpusob: "oauth" };
    return { ok: false, status: 401, duvod: "Přístupový token je neplatný nebo vypršel." };
  }

  const hlavicky401 = (zaklad, bezTokenu) => ({
    "www-authenticate": `Bearer realm="HSPG AI Gateway"${bezTokenu ? "" : ', error="invalid_token"'}, resource_metadata="${zaklad}${CESTY.metadataZdroj}"`,
  });

  async function limitOauth(req, context) {
    const t = ted();
    const store = await dejUloziste();
    if (!(await pricti(store, `limit/mcp-oauth/${klient(req, context, t)}`, LIMIT_OAUTH.pocet, LIMIT_OAUTH.oknoMs, t))) throw Object.assign(new Error("Příliš mnoho požadavků. Zkuste to za chvíli."), { status: 429 });
    return { t, store };
  }

  async function autorizace(req, context, zaklad) {
    const url = new URL(req.url);
    const q = req.method === "POST" ? await prectiTelo(req) : Object.fromEntries(url.searchParams);
    const v = overAutorizacniParametry(q, zaklad);
    if (!v.ok && !v.presmerovat) return html(strankaChyby("Neplatný požadavek", v.popis), 400);
    const p = v.ok ? v.p : { redirect_uri: String(q.redirect_uri || ""), state: String(q.state || "").slice(0, 1024) };
    let t;
    try { t = await tajemstvi(); } catch { return html(strankaChyby("Úložiště není dostupné", "Přihlášení teď nejde ověřit. Zkuste to za chvíli."), 503); }
    const k = await overKlienta(String(q.client_id || ""), p.redirect_uri, klicKlientu(t), { fetch: f, ted: ted() });
    if (!k.ok) return html(strankaChyby("Neznámý klient", "client_id nebo redirect_uri neodpovídá registraci. V Claude konektor odeberte a přidejte znovu."), 400);
    if (!v.ok) return Response.redirect(presmerovaniSChybou(p, v.chyba, v.popis, zaklad), 302);
    if (req.method === "GET") return html(strankaPrihlaseni({ p, nazevKlienta: k.nazev, akce: CESTY.autorizace }));

    // POST: zámek proti hádání hesla (společný s /api/majitel), pak heslo, pak kód.
    const t0 = ted();
    const kl = klient(req, context, t0);
    let store;
    try {
      store = await dejUloziste();
      const povoleno = await povolPokusOPrihlaseni(store, kl, t0, false);
      if (povoleno === "klient") return html(strankaPrihlaseni({ p, nazevKlienta: k.nazev, chyba: "Příliš mnoho pokusů. Zkuste to za 15 minut." }), 429);
      if (povoleno !== true) return html(strankaPrihlaseni({ p, nazevKlienta: k.nazev, chyba: "Přihlášení je kvůli mnoha pokusům dočasně zamčené. Zkuste to za hodinu." }), 429);
    } catch {
      return html(strankaChyby("Úložiště není dostupné", "Přihlášení teď nejde ověřit. Zkuste to za chvíli."), 503);
    }
    if (!overHeslo(String(q.heslo || ""), env)) {
      console.warn(JSON.stringify({ udalost: "mcp-oauth", stav: "spatne-heslo", cas: new Date().toISOString() }));
      return html(strankaPrihlaseni({ p, nazevKlienta: k.nazev, chyba: "Špatné heslo." }), 401);
    }
    await vratPokusOPrihlaseni(store, kl).catch(() => {});
    const kod = vydejKod(p, klicTokenu(env, t), t0);
    console.warn(JSON.stringify({ udalost: "mcp-oauth", stav: "kod-vydan", cimd: Boolean(k.cimd), cas: new Date().toISOString() }));
    return Response.redirect(presmerovaniSKodem(p, kod, zaklad), 302);
  }

  async function token(req, context, zaklad) {
    let telo;
    try { telo = await prectiTelo(req); } catch (e) { return chybaOauth("invalid_request", e.message, e.status || 400); }
    let t, store;
    try { ({ store } = await limitOauth(req, context)); t = await tajemstvi(); } catch (e) {
      return e?.status === 429 ? chybaOauth("slow_down", e.message, 429) : chybaOauth("temporarily_unavailable", "Úložiště není dostupné – zkuste to za chvíli.", 503);
    }
    const klic = klicTokenu(env, t);
    if (!klic) return chybaOauth("server_error", "HSPG_PANEL_HESLO není v Netlify nastavené (min. 16 znaků).", 503);
    const t0 = ted();
    let v;
    if (telo.grant_type === "authorization_code") {
      // Použitý kód se zapíše podmíněně – druhé použití téhož kódu selže (ochrana proti opakování).
      const oznac = async (otiskKodu) => {
        const r = await store.setJSON(`mcp/kod/${otiskKodu}`, { pouzito: new Date(t0).toISOString() }, { onlyIfNew: true });
        if (r?.modified === true) return true;
        if (r?.modified === false) return false;
        throw new Error("Zápis použitého kódu selhal.");
      };
      v = await vymenKod(telo, klic, t0, oznac);
    } else if (telo.grant_type === "refresh_token") {
      v = obnovToken(telo, klic, t0);
    } else {
      return chybaOauth("unsupported_grant_type", "Podporované jsou authorization_code a refresh_token.");
    }
    if (!v.ok) return chybaOauth(v.chyba, v.popis, v.status);
    console.warn(JSON.stringify({ udalost: "mcp-oauth", stav: telo.grant_type === "refresh_token" ? "token-obnoven" : "token-vydan", cas: new Date().toISOString() }));
    return json(v.tokeny, 200, { pragma: "no-cache" });
  }

  async function registrace(req, context) {
    let telo, t;
    try { telo = await prectiTelo(req); } catch (e) { return chybaOauth("invalid_client_metadata", e.message, e.status || 400); }
    try { await limitOauth(req, context); t = await tajemstvi(); } catch (e) {
      return e?.status === 429 ? chybaOauth("slow_down", e.message, 429) : chybaOauth("temporarily_unavailable", "Úložiště není dostupné – zkuste to za chvíli.", 503);
    }
    const r = registrujKlienta(telo, klicKlientu(t), ted());
    if (!r.ok) return chybaOauth(r.chyba, r.popis, r.status);
    console.warn(JSON.stringify({ udalost: "mcp-oauth", stav: "klient-registrovan", cas: new Date().toISOString() }));
    return json(r.klient, 201);
  }

  // JSON-RPC přes HTTP. Dlouhé volání nástroje jde jako SSE: hlavičky hned, udržovací komentář každých 10 s,
  // výsledek jako jedna událost „message“ – spojení tak nevyprší dřív než odpověď AI.
  async function rpc(req, zaklad) {
    const a = await overBearer(req, zaklad);
    if (!a.ok) return json({ chyba: a.duvod }, a.status, a.status === 401 ? hlavicky401(zaklad, a.bezTokenu) : {});
    let telo;
    try { telo = await prectiTelo(req); } catch (e) { return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: e.message } }, e.status || 400); }
    const zpravy = Array.isArray(telo) ? telo : [telo];
    if (!zpravy.length || zpravy.length > 20) return json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Prázdná nebo příliš dlouhá dávka." } }, 400);
    const accept = (req.headers.get("accept") || "").toLowerCase();
    const dlouhe = accept.includes("text/event-stream") && zpravy.some((z) => z?.method === "tools/call" && z?.id !== undefined);
    const vyrid = async () => (await Promise.all(zpravy.map((z) => mcp.zpracuj(z, { signal: req.signal })))).filter((o) => o !== null);
    if (!dlouhe) {
      const odpovedi = await vyrid();
      if (!odpovedi.length) return new Response(null, { status: 202 });
      return json(Array.isArray(telo) ? odpovedi : odpovedi[0], 200);
    }
    const enc = new TextEncoder();
    const body = new ReadableStream({
      async start(ctrl) {
        const posli = (s) => { try { ctrl.enqueue(enc.encode(s)); } catch {} };
        posli(": hspg-ai-gateway\n\n");
        const udrzovac = setInterval(() => posli(": keepalive\n\n"), KEEPALIVE_MS);
        try {
          const odpovedi = await vyrid();
          for (const o of odpovedi) posli(`event: message\ndata: ${JSON.stringify(o)}\n\n`);
        } catch (e) {
          posli(`event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32603, message: "Vnitřní chyba brány." } })}\n\n`);
        } finally {
          clearInterval(udrzovac);
          try { ctrl.close(); } catch {}
        }
      },
    });
    return new Response(body, { status: 200, headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "x-accel-buffering": "no" } });
  }

  return async function handler(req, context = {}) {
    const url = new URL(req.url);
    const zaklad = url.origin;
    const cesta = url.pathname.replace(/\/+$/, "") || "/";
    // Prohlížeč (Origin) sem nepatří – MCP klienti jsou servery a aplikace; cizí původ = 403 (DNS rebinding).
    if (!povolenyOrigin(req.headers.get("origin"), env)) return json({ chyba: "Nepovolený původ požadavku." }, 403);
    try {
      if (cesta === CESTY.metadataAS) return req.method === "GET" ? json(metadataAutorizacnihoServeru(zaklad), 200, { "cache-control": "public, max-age=3600" }) : json({ chyba: "Použijte GET." }, 405);
      if (cesta === CESTY.metadataZdroj || cesta === `${CESTY.metadataZdroj}${CESTY.zdroj}`) return req.method === "GET" ? json(metadataChranenehoZdroje(zaklad), 200, { "cache-control": "public, max-age=3600" }) : json({ chyba: "Použijte GET." }, 405);
      if (cesta === CESTY.registrace) return req.method === "POST" ? registrace(req, context) : json({ chyba: "Použijte POST." }, 405);
      if (cesta === CESTY.autorizace) return req.method === "GET" || req.method === "POST" ? autorizace(req, context, zaklad) : json({ chyba: "Použijte GET nebo POST." }, 405);
      if (cesta === CESTY.token) return req.method === "POST" ? token(req, context, zaklad) : json({ chyba: "Použijte POST." }, 405);
      if (cesta === CESTY.zdroj) {
        if (req.method === "POST") return await rpc(req, zaklad);
        return json({ chyba: "Brána přijímá jen POST (JSON-RPC 2.0, Streamable HTTP bez relací)." }, 405, { allow: "POST" });
      }
      return json({ chyba: "Nenalezeno." }, 404);
    } catch (e) {
      console.warn(JSON.stringify({ udalost: "mcp", stav: "vyjimka", cesta, duvod: e?.status || "vyjimka", cas: new Date().toISOString() }));
      return json({ chyba: "Vnitřní chyba brány." }, 500);
    }
  };
}

export default vytvorMcpFunkci();

export const config = {
  path: [CESTY.zdroj, `${CESTY.zdroj}/oauth/:akce`, CESTY.metadataAS, CESTY.metadataZdroj, `${CESTY.metadataZdroj}/api/mcp`],
};
