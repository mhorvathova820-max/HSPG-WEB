// You.com – hledání na webu přes REST API (úkol 59). Klíč HSPG_KLIC_YOUCOM zadává majitel v Netlify
// (platforma you.com/platform). Bez klíče je nástroj vypnutý a brána poradí oficiální konektor You.com.
// Dokumentace (ověřeno 30. 10. 2026): POST https://ydc-index.io/v1/search, hlavička X-API-Key, tělo { query,
// count 1–100, freshness day|week|month|year, country, language, safesearch off|moderate|strict }.
// Odpověď: { results: { web: [{ url, title, page_age, contents: { highlights: [] } … }] }, metadata }.
// Výsledky jsou fakta z webu, ne schválené znalosti HSPG – k ověření. Dotaz se posílá pseudonymizovaný.
export const KLIC_YOUCOM = "HSPG_KLIC_YOUCOM";
export const YOUCOM_URL = "https://ydc-index.io/v1/search";
const CERSTVOST = new Set(["day", "week", "month", "year"]);
const MAX_VYSLEDKU = 20;

export const youcomZapnuto = (env = process.env) => Boolean(String(env[KLIC_YOUCOM] || "").trim());

const text = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

export function prevedVysledky(data, pocet = 10) {
  const web = Array.isArray(data?.results?.web) ? data.results.web : Array.isArray(data?.results) ? data.results : [];
  return web.slice(0, pocet).map((r) => {
    const vyrazky = Array.isArray(r?.contents?.highlights) ? r.contents.highlights : Array.isArray(r?.snippets) ? r.snippets : [];
    return {
      nazev: text(r?.title, 200),
      url: text(r?.url, 1000),
      stari: text(r?.page_age, 40) || undefined,
      uryvek: text([...vyrazky, r?.description].filter(Boolean).join(" … "), 600),
    };
  }).filter((r) => r.url);
}

// hledejYoucom({ dotaz, pocet, cerstvost, zeme, jazyk }, env, { fetch, signal }) → { vysledky, dotaz }
export async function hledejYoucom({ dotaz, pocet = 10, cerstvost, zeme = "CZ", jazyk = "cs" }, env = process.env, { fetch: f = globalThis.fetch, signal } = {}) {
  const klic = String(env[KLIC_YOUCOM] || "").trim();
  if (!klic) throw Object.assign(new Error(`Chybí ${KLIC_YOUCOM} v Netlify.`), { status: 400 });
  const q = text(dotaz, 500);
  if (!q) throw Object.assign(new Error("Prázdný dotaz."), { status: 400 });
  const n = Math.min(MAX_VYSLEDKU, Math.max(1, Math.floor(Number(pocet)) || 10));
  const telo = { query: q, count: n, safesearch: "moderate" };
  if (CERSTVOST.has(cerstvost)) telo.freshness = cerstvost;
  if (/^[A-Z]{2}$/.test(String(zeme || ""))) telo.country = zeme;
  if (/^[a-z]{2}(-[A-Z]{2})?$/.test(String(jazyk || ""))) telo.language = jazyk;
  const r = await f(YOUCOM_URL, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": klic, accept: "application/json" },
    body: JSON.stringify(telo),
    signal,
  });
  if (!r.ok) throw Object.assign(new Error(`You.com odpověděl ${r.status}.`), { status: r.status === 401 || r.status === 403 ? 401 : r.status === 429 ? 429 : 502 });
  const data = await r.json().catch(() => null);
  return { dotaz: q, vysledky: prevedVysledky(data, n) };
}

export function youcomNaText({ dotaz, vysledky }) {
  if (!vysledky.length) return `You.com: pro dotaz „${dotaz}“ nic nenašel.`;
  return [`You.com – ${vysledky.length} výsledků pro „${dotaz}“ (fakta z webu, k ověření):`, ...vysledky.map((v, i) => `${i + 1}. ${v.nazev || v.url}\n   ${v.url}${v.stari ? ` · ${v.stari}` : ""}${v.uryvek ? `\n   ${v.uryvek}` : ""}`)].join("\n");
}
