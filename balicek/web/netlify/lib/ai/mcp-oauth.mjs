// OAuth 2.1 pro bránu HSPG AI Gateway (/api/mcp) – úkol 59. Přihlášení = heslo panelu majitele (HSPG_PANEL_HESLO),
// žádné nové heslo ani účet. Vše je BEZSTAVOVÉ: registrace klienta (DCR), autorizační kód, přístupový i obnovovací
// token jsou podepsané HMAC-SHA256 (tajemství serveru z Blobs + heslo panelu – změna hesla zneplatní všechny
// tokeny, stejně jako u tokenů panelu). Jediný zápis do úložiště: použitý autorizační kód (ochrana proti
// opakovanému použití, onlyIfNew). Podporuje PKCE S256 (povinné), „Register automatically“ (dynamická
// registrace, RFC 7591) i „Use Claude's published identity“ (client_id = adresa dokumentu metadat klienta,
// CIMD). Veřejní klienti bez tajemství (token_endpoint_auth_method none) – přesně tak se připojuje Claude.
import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const CESTY = {
  zdroj: "/api/mcp",
  autorizace: "/api/mcp/oauth/authorize",
  token: "/api/mcp/oauth/token",
  registrace: "/api/mcp/oauth/register",
  metadataAS: "/.well-known/oauth-authorization-server",
  metadataZdroj: "/.well-known/oauth-protected-resource",
};
export const SCOPE = "mcp";
export const PLATNOST_KODU_MS = 5 * 60_000;
export const PLATNOST_PRISTUPU_MS = 12 * 60 * 60_000; // jako token panelu
export const PLATNOST_OBNOVY_MS = 90 * 24 * 60 * 60_000;
const MAX_REDIRECT_URI = 10;
const MAX_DELKA_URI = 2000;
const MAX_DELKA_CLIENT_ID = 4000;
const PLATNOST_CIMD_MS = 60 * 60_000;

const b64u = (b) => Buffer.from(b).toString("base64url");
const otisk = (s) => createHash("sha256").update(String(s)).digest();
export const otiskHex = (s) => createHash("sha256").update(String(s)).digest("hex");
const stejne = (a, b) => timingSafeEqual(otisk(a), otisk(b));
export const uniklo = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// --- podpisové klíče ---
// Tokeny a kódy: tajemství serveru + heslo panelu (změna hesla = odhlášení všech klientů).
export function klicTokenu(env, tajemstvi) {
  const heslo = String(env?.HSPG_PANEL_HESLO || "");
  if (heslo.length < 16 || !tajemstvi) return null;
  return createHmac("sha256", String(tajemstvi)).update(`hspg-mcp|${heslo}`).digest();
}
// Registrace klientů: jen tajemství serveru – změna hesla registrace Clauda nezruší (jen ho odhlásí).
export const klicKlientu = (tajemstvi) => (tajemstvi ? createHmac("sha256", String(tajemstvi)).update("hspg-mcp-klient").digest() : null);

function podepis(typ, data, klic) {
  const payload = b64u(JSON.stringify(data));
  const sig = createHmac("sha256", klic).update(`${typ}.${payload}`).digest("base64url");
  return `${typ}.${payload}.${sig}`;
}
// Ověří podpis a platnost; vrátí data nebo null. Nikdy nevyhazuje.
export function overPodpis(token, typ, klic, ted = Date.now()) {
  if (!klic || typeof token !== "string" || token.length > MAX_DELKA_CLIENT_ID) return null;
  const [t, payload, sig] = token.split(".");
  if (t !== typ || !payload || !sig) return null;
  const ocekavany = createHmac("sha256", klic).update(`${t}.${payload}`).digest("base64url");
  if (!stejne(sig, ocekavany)) return null;
  let data;
  try { data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { return null; }
  if (!data || typeof data !== "object") return null;
  if (typeof data.exp === "number" && data.exp < ted) return null;
  return data;
}

// --- metadata (RFC 8414, RFC 9728) ---
export const zdrojMcp = (zaklad) => `${zaklad}${CESTY.zdroj}`;
export function metadataAutorizacnihoServeru(zaklad) {
  return {
    issuer: zaklad,
    authorization_endpoint: `${zaklad}${CESTY.autorizace}`,
    token_endpoint: `${zaklad}${CESTY.token}`,
    registration_endpoint: `${zaklad}${CESTY.registrace}`,
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: [SCOPE],
    client_id_metadata_document_supported: true,
    authorization_response_iss_parameter_supported: true,
    service_documentation: `${zaklad}/ai-centrum/`,
  };
}
export function metadataChranenehoZdroje(zaklad) {
  return {
    resource: zdrojMcp(zaklad),
    authorization_servers: [zaklad],
    bearer_methods_supported: ["header"],
    scopes_supported: [SCOPE],
    resource_name: "HSPG AI Gateway",
  };
}

// --- klienti ---
const platnaRedirectUri = (u) => {
  if (typeof u !== "string" || !u || u.length > MAX_DELKA_URI || u.includes("#")) return false;
  let p;
  try { p = new URL(u); } catch { return false; }
  // https kdekoli; http jen na vlastním počítači (Claude Code, MCP Inspector).
  return p.protocol === "https:" || (p.protocol === "http:" && (p.hostname === "localhost" || p.hostname === "127.0.0.1" || p.hostname === "[::1]"));
};

// Dynamická registrace (RFC 7591): client_id nese podepsaný seznam redirect_uri – žádný zápis do úložiště.
export function registrujKlienta(telo, klic, ted = Date.now()) {
  if (!klic) return { ok: false, status: 503, chyba: "server_error", popis: "Tajemství serveru není k dispozici." };
  const uris = Array.isArray(telo?.redirect_uris) ? telo.redirect_uris : [];
  if (!uris.length || uris.length > MAX_REDIRECT_URI || !uris.every(platnaRedirectUri)) {
    return { ok: false, status: 400, chyba: "invalid_redirect_uri", popis: "redirect_uris: 1–10 adres https:// (nebo http://localhost)." };
  }
  const metoda = telo?.token_endpoint_auth_method ?? "none";
  if (metoda !== "none") return { ok: false, status: 400, chyba: "invalid_client_metadata", popis: "Podporovaný je jen veřejný klient (token_endpoint_auth_method: none)." };
  const granty = Array.isArray(telo?.grant_types) && telo.grant_types.length ? telo.grant_types : ["authorization_code", "refresh_token"];
  if (granty.some((g) => g !== "authorization_code" && g !== "refresh_token")) return { ok: false, status: 400, chyba: "invalid_client_metadata", popis: "grant_types: jen authorization_code a refresh_token." };
  const nazev = String(telo?.client_name || "").slice(0, 80);
  const vydano = Math.floor(ted / 1000);
  const client_id = podepis("k", { ru: [...new Set(uris)], n: nazev, iat: vydano }, klic);
  return {
    ok: true,
    status: 201,
    klient: {
      client_id,
      client_id_issued_at: vydano,
      client_name: nazev || undefined,
      redirect_uris: [...new Set(uris)],
      token_endpoint_auth_method: "none",
      grant_types: granty,
      response_types: ["code"],
      scope: SCOPE,
    },
  };
}

// Metadata klienta z adresy (CIMD): client_id = https adresa dokumentu JSON s polem redirect_uris.
const cimdMezipamet = new Map();
export async function nactiCimd(adresa, { fetch: f = globalThis.fetch, ted = Date.now(), limitMs = 5000 } = {}) {
  const z = cimdMezipamet.get(adresa);
  if (z && z.do > ted) return z.data;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), limitMs);
  try {
    const r = await f(adresa, { signal: ctrl.signal, headers: { accept: "application/json" }, redirect: "error" });
    if (!r.ok) return null;
    const data = await r.json();
    if (!data || data.client_id !== adresa || !Array.isArray(data.redirect_uris) || !data.redirect_uris.every(platnaRedirectUri)) return null;
    cimdMezipamet.set(adresa, { data, do: ted + PLATNOST_CIMD_MS });
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
export const vymazCimdMezipamet = () => cimdMezipamet.clear();

const jeCimd = (clientId) => typeof clientId === "string" && /^https:\/\/[^\s]+$/.test(clientId) && clientId.length <= MAX_DELKA_URI;

// Ověří klienta a jeho redirect_uri (přesná shoda). Vrátí { ok, nazev } nebo { ok: false }.
export async function overKlienta(clientId, redirectUri, klicKl, { fetch: f, ted } = {}) {
  if (typeof clientId !== "string" || !clientId || clientId.length > MAX_DELKA_CLIENT_ID || !platnaRedirectUri(redirectUri)) return { ok: false };
  if (jeCimd(clientId)) {
    const m = await nactiCimd(clientId, { fetch: f, ted });
    if (!m || !m.redirect_uris.includes(redirectUri)) return { ok: false };
    return { ok: true, nazev: String(m.client_name || new URL(clientId).hostname).slice(0, 80), cimd: true };
  }
  const d = overPodpis(clientId, "k", klicKl, ted);
  if (!d || !Array.isArray(d.ru) || !d.ru.includes(redirectUri)) return { ok: false };
  return { ok: true, nazev: d.n || "", cimd: false };
}

// --- autorizace ---
const PKCE_RE = /^[A-Za-z0-9._~-]{43,128}$/;
export const normalizujZdroj = (u) => String(u || "").replace(/\/+$/, "");

// Kontrola parametrů autorizačního požadavku. Vrátí { ok: true, p } nebo { ok: false, chyba, popis, presmerovat }.
// presmerovat=false → chybu ukázat majiteli (vadný klient/redirect se NIKDY nepřesměrovává).
export function overAutorizacniParametry(q, zaklad) {
  const p = {
    response_type: String(q.response_type || ""),
    client_id: String(q.client_id || ""),
    redirect_uri: String(q.redirect_uri || ""),
    code_challenge: String(q.code_challenge || ""),
    code_challenge_method: String(q.code_challenge_method || ""),
    state: String(q.state || "").slice(0, 1024),
    scope: String(q.scope || SCOPE).trim(),
    resource: String(q.resource || "").trim(),
  };
  if (!p.client_id || !platnaRedirectUri(p.redirect_uri)) return { ok: false, chyba: "invalid_request", popis: "Chybí nebo je neplatné client_id / redirect_uri.", presmerovat: false };
  if (p.response_type !== "code") return { ok: false, chyba: "unsupported_response_type", popis: "Podporované je jen response_type=code.", presmerovat: true };
  if (p.code_challenge_method !== "S256" || !PKCE_RE.test(p.code_challenge)) return { ok: false, chyba: "invalid_request", popis: "PKCE S256 je povinné (code_challenge, code_challenge_method=S256).", presmerovat: true };
  if (p.scope.split(/\s+/).some((s) => s && s !== SCOPE)) return { ok: false, chyba: "invalid_scope", popis: `Podporovaný rozsah je jen „${SCOPE}“.`, presmerovat: true };
  p.scope = SCOPE;
  const zdroj = zdrojMcp(zaklad);
  if (p.resource && normalizujZdroj(p.resource) !== zdroj) return { ok: false, chyba: "invalid_target", popis: `Brána obsluhuje jen zdroj ${zdroj}.`, presmerovat: true };
  p.resource = zdroj;
  return { ok: true, p };
}

export function vydejKod(p, klic, ted = Date.now()) {
  return podepis("c", { cid: p.client_id, ru: p.redirect_uri, cc: p.code_challenge, aud: p.resource, sc: p.scope, exp: ted + PLATNOST_KODU_MS, j: randomBytes(8).toString("hex") }, klic);
}

export function presmerovaniSKodem(p, kod, zaklad) {
  const u = new URL(p.redirect_uri);
  u.searchParams.set("code", kod);
  if (p.state) u.searchParams.set("state", p.state);
  u.searchParams.set("iss", zaklad);
  return u.toString();
}
export function presmerovaniSChybou(p, chyba, popis, zaklad) {
  const u = new URL(p.redirect_uri);
  u.searchParams.set("error", chyba);
  if (popis) u.searchParams.set("error_description", popis);
  if (p.state) u.searchParams.set("state", p.state);
  u.searchParams.set("iss", zaklad);
  return u.toString();
}

// --- tokeny ---
function vydejTokeny(d, klic, ted) {
  const pristup = podepis("a", { cid: d.cid, aud: d.aud, sc: d.sc, exp: ted + PLATNOST_PRISTUPU_MS }, klic);
  const obnova = podepis("r", { cid: d.cid, aud: d.aud, sc: d.sc, exp: ted + PLATNOST_OBNOVY_MS, j: randomBytes(8).toString("hex") }, klic);
  return { access_token: pristup, token_type: "Bearer", expires_in: Math.floor(PLATNOST_PRISTUPU_MS / 1000), refresh_token: obnova, scope: d.sc };
}

// Výměna kódu za tokeny. oznacKodPouzity(otisk) → true, když kód ještě nebyl použitý (fail-closed: výjimka = 503).
export async function vymenKod({ code, client_id, redirect_uri, code_verifier, resource }, klic, ted, oznacKodPouzity) {
  const d = overPodpis(String(code || ""), "c", klic, ted);
  if (!d) return { ok: false, status: 400, chyba: "invalid_grant", popis: "Autorizační kód je neplatný nebo vypršel." };
  if (String(client_id || "") !== d.cid || String(redirect_uri || "") !== d.ru) return { ok: false, status: 400, chyba: "invalid_grant", popis: "client_id nebo redirect_uri nesouhlasí s autorizací." };
  if (!PKCE_RE.test(String(code_verifier || "")) || !stejne(b64u(createHash("sha256").update(String(code_verifier)).digest()), d.cc)) {
    return { ok: false, status: 400, chyba: "invalid_grant", popis: "PKCE: code_verifier neodpovídá code_challenge." };
  }
  if (resource && normalizujZdroj(resource) !== d.aud) return { ok: false, status: 400, chyba: "invalid_target", popis: "resource nesouhlasí s autorizací." };
  let poprve;
  try { poprve = await oznacKodPouzity(otiskHex(code)); } catch { return { ok: false, status: 503, chyba: "temporarily_unavailable", popis: "Úložiště není dostupné – zkuste to za chvíli." }; }
  if (!poprve) return { ok: false, status: 400, chyba: "invalid_grant", popis: "Autorizační kód už byl použit." };
  return { ok: true, status: 200, tokeny: vydejTokeny(d, klic, ted) };
}

export function obnovToken({ refresh_token, client_id, resource }, klic, ted) {
  const d = overPodpis(String(refresh_token || ""), "r", klic, ted);
  if (!d) return { ok: false, status: 400, chyba: "invalid_grant", popis: "Obnovovací token je neplatný nebo vypršel." };
  if (client_id && String(client_id) !== d.cid) return { ok: false, status: 400, chyba: "invalid_grant", popis: "client_id nesouhlasí." };
  if (resource && normalizujZdroj(resource) !== d.aud) return { ok: false, status: 400, chyba: "invalid_target", popis: "resource nesouhlasí." };
  return { ok: true, status: 200, tokeny: vydejTokeny(d, klic, ted) };
}

// Přístupový token pro /api/mcp: podpis, platnost a publikum (aud = adresa brány).
export function overPristupovyToken(token, klic, zaklad, ted = Date.now()) {
  const d = overPodpis(token, "a", klic, ted);
  return Boolean(d && d.aud === zdrojMcp(zaklad) && d.sc === SCOPE);
}

// --- stránka přihlášení (bez skriptů, bez cizích zdrojů; vzhled Apex: matná čerň, zlato) ---
const STYL = `:root{color-scheme:dark}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#05070f;color:#e8e6df;font:16px/1.5 system-ui,Segoe UI,Roboto,sans-serif}
main{width:min(92vw,420px);padding:28px 26px;border:1px solid rgba(212,175,55,.35);border-radius:16px;background:rgba(11,15,25,.92);box-shadow:0 20px 60px rgba(0,0,0,.6)}
h1{margin:0 0 6px;font-size:20px;color:#D4AF37;letter-spacing:.02em}p{margin:6px 0 14px;color:#b9b6ab;font-size:14px}
label{display:block;font-size:13px;color:#b9b6ab;margin-bottom:6px}input[type=password]{width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #2a3142;background:#0b0f19;color:#fff;font-size:16px}
button{margin-top:14px;width:100%;padding:12px;border:0;border-radius:10px;background:linear-gradient(135deg,#D4AF37,#f3d777);color:#05070f;font-weight:700;font-size:16px;cursor:pointer}
.chyba{border:1px solid #b23b3b;background:rgba(178,59,59,.15);color:#ffb4b4;padding:10px 12px;border-radius:10px;font-size:14px;margin-bottom:12px}
.kdo{font-size:13px;color:#8f8c82;margin-top:14px}code{color:#e8e6df}`;

export function strankaPrihlaseni({ p, nazevKlienta, chyba = "", akce = CESTY.autorizace }) {
  const skryte = ["response_type", "client_id", "redirect_uri", "code_challenge", "code_challenge_method", "state", "scope", "resource"]
    .filter((k) => p[k])
    .map((k) => `<input type="hidden" name="${k}" value="${uniklo(p[k])}">`)
    .join("");
  const cil = (() => { try { return new URL(p.redirect_uri).hostname; } catch { return ""; } })();
  return `<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>HSPG AI Gateway – připojení</title><style>${STYL}</style></head>
<body><main><h1>HSPG AI Gateway</h1><p>Klient <strong>${uniklo(nazevKlienta || "AI klient")}</strong> žádá o přístup k bráně AI pro majitele (návrat na <code>${uniklo(cil)}</code>). Zadejte heslo panelu „Vše ve tvých rukách“.</p>
${chyba ? `<div class="chyba" role="alert">${uniklo(chyba)}</div>` : ""}
<form method="post" action="${uniklo(akce)}" autocomplete="off">${skryte}<label for="heslo">Heslo panelu majitele</label><input id="heslo" name="heslo" type="password" required autofocus autocomplete="current-password" maxlength="200"><button type="submit">Povolit přístup</button></form>
<p class="kdo">Přístup platí 12 hodin a obnovuje se sám až 90 dní; zruší ho změna hesla panelu. Dotazy jdou přes pseudonymizaci a rozpočet AI (<code>/api/ai-stav</code>).</p></main></body></html>`;
}

export function strankaChyby(nadpis, text) {
  return `<!doctype html><html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>HSPG AI Gateway – chyba</title><style>${STYL}</style></head>
<body><main><h1>${uniklo(nadpis)}</h1><p>${uniklo(text)}</p></main></body></html>`;
}
