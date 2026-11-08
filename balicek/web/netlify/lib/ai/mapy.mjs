// Mapy.com REST API (Seznam.cz) – adaptér pro bránu AI a panel majitele (úkol 60, R23). Klíč HSPG_KLIC_MAPY
// zadává majitel v Netlify (developer.mapy.com → projekt → API klíč); posílá se v hlavičce X-Mapy-Api-Key,
// nikdy v URL (logy, odkazy). Funkce (ověřeno v OpenAPI api.mapy.com/v1/docs 8. 11. 2026):
//   GET /v1/geocode, /v1/suggest (query, lang, limit ≤ 15, type[], locality[], preferNear=lon,lat) → items[]
//   GET /v1/rgeocode (lon, lat, lang) → items[]
//   GET /v1/routing/route (start, end = lon,lat; routeType; waypoints ≤ 15; avoidToll; avoidHighways; format)
//   GET /v1/routing/matrix-m (starts[], ends[], routeType) – starts×ends ≤ 100, vzdušně ≤ 500 km
//   GET /v1/elevation (positions=lon,lat;… ≤ 256)
//   GET /v1/static/map (width, height ≤ 1024, lon, lat, zoom 1–19, mapset basic|outdoor|aerial|aerial-names-overlay|winter,
//        markers[], shapes[], format png|jpg|webp|gif, scale 1–2) → obrázek
//   GET /v1/static/pano (width, height, lon, lat, radius ≤ 100 m, yaw auto|point|azimut, pitch, fov) → JPEG
// Kredity: dlaždice 1, geokódování / trasa / výškopis / statický snímek 4, matice 10×10 = 40 (Basic tarif:
// 250 000 kreditů měsíčně zdarma, dál 1,60 Kč / 1 000). Počítadlo v Blobs `mapy/kredity/<měsíc>` a strop
// MAPY_MESICNI_LIMIT_KREDITU (výchozí 200 000) drží spotřebu pod bezplatnou kvótou – žádný nový zdroj útraty (§4.4).
// Souřadnice všude jako [lon, lat] (pořadí Mapy.com). Adresy objektů jsou firemní údaje zakázek; Seznam.cz je
// zpracovatel (úkol 09). Pozor: slova o leteckých snímcích / mapách nepatří do textů pro zákazníky (embargo).
export const KLIC_MAPY = "HSPG_KLIC_MAPY";
export const MAPY_URL = "https://api.mapy.com";
export const KREDITY = { dlazdice: 1, geokodovani: 4, trasa: 4, vyska: 4, snimek: 4, panorama: 4, maticeZa100: 40 };
export const VYCHOZI_STROP_KREDITU = 200_000;
export const ZDARMA_KREDITU = 250_000;
export const TYPY_TRASY = ["car_fast", "car_fast_traffic", "car_short", "foot_fast", "foot_hiking", "bike_road", "bike_mountain"];
export const SADY_MAP = ["basic", "outdoor", "aerial", "aerial-names-overlay", "winter"];
const TYPY_HLEDANI = { adresa: ["regional.address"], ulice: ["regional.street"], obec: ["regional.municipality", "regional.municipality_part"], misto: ["poi"], vse: ["regional", "poi"] };
const MAX_SNIMEK_PX = 1024;

export const mapyZapnuto = (env = process.env) => Boolean(String(env[KLIC_MAPY] || "").trim());
export const mesicMapy = (t = Date.now()) => new Date(t).toISOString().slice(0, 7);
export const stropKreditu = (env = process.env) => (Number(env.MAPY_MESICNI_LIMIT_KREDITU) > 0 ? Math.floor(Number(env.MAPY_MESICNI_LIMIT_KREDITU)) : VYCHOZI_STROP_KREDITU);

const chyba = (text, status = 400) => Object.assign(new Error(text), { status });
const cislo = (v, min, max, nazev) => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw chyba(`${nazev} musí být číslo ${min} až ${max}.`);
  return n;
};
// [lon, lat] z pole, objektu {lon,lat} nebo řetězce "lon,lat" (toleruje i "lat, lon" u zjevných hodnot pro ČR).
export function souradnice(v) {
  let lon, lat;
  if (Array.isArray(v) && v.length === 2) [lon, lat] = v;
  else if (v && typeof v === "object" && "lon" in v && "lat" in v) ({ lon, lat } = v);
  else if (typeof v === "string") {
    const m = v.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
    if (!m) throw chyba(`Souřadnice „${v.slice(0, 40)}“ nejsou ve tvaru lon,lat.`);
    [lon, lat] = [Number(m[1]), Number(m[2])];
  } else throw chyba("Souřadnice musí být [lon, lat], {lon, lat} nebo „lon,lat“.");
  lon = Number(lon); lat = Number(lat);
  if (lat >= 48 && lat <= 51.1 && lon >= 12 && lon <= 18.9) return [lon, lat]; // ČR v pořadí lon,lat
  if (lon >= 48 && lon <= 51.1 && lat >= 12 && lat <= 18.9) return [lat, lon]; // prohozeno (lat,lon)
  cislo(lon, -180, 180, "lon"); cislo(lat, -90, 90, "lat");
  return [lon, lat];
}
export const jeSouradnice = (s) => typeof s === "string" && /^\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*$/.test(s);

// Položka geokódování → stručný záznam (bez interních polí). regionalStructure: od nejmenšího (adresa) k zemi.
export function prevedPolozku(p) {
  const struktura = Array.isArray(p?.regionalStructure) ? p.regionalStructure : [];
  const najdi = (typ) => struktura.find((s) => s?.type === typ)?.name || "";
  return {
    nazev: String(p?.name || ""),
    popis: String(p?.label || ""),
    typ: String(p?.type || ""),
    lon: Number(p?.position?.lon),
    lat: Number(p?.position?.lat),
    psc: String(p?.zip || ""),
    oblast: String(p?.location || ""),
    ulice: najdi("regional.street"),
    obec: najdi("regional.municipality"),
    castObce: najdi("regional.municipality_part"),
    kraj: najdi("regional.region"),
    zeme: najdi("regional.country"),
  };
}
export const adresaText = (z) => [z.nazev, [z.psc, z.obec !== z.nazev ? z.obec : ""].filter(Boolean).join(" ")].filter(Boolean).join(", ");

// Počítadlo kreditů v úložišti (měsíc). Vrátí false, když by se překročil strop – nic se nevolá.
export async function rezervujKredity(store, pocet, env = process.env, t = Date.now()) {
  if (!store) return true;
  const klic = `mapy/kredity/${mesicMapy(t)}`;
  const z = (await store.get(klic)) || { n: 0, volani: 0 };
  if (z.n + pocet > stropKreditu(env)) return false;
  await store.setJSON(klic, { n: z.n + pocet, volani: (z.volani || 0) + 1, aktualizovano: new Date(t).toISOString() });
  return true;
}
export async function kredityMesice(store, env = process.env, t = Date.now()) {
  const z = store ? (await store.get(`mapy/kredity/${mesicMapy(t)}`)) || { n: 0, volani: 0 } : { n: 0, volani: 0 };
  return { mesic: mesicMapy(t), pouzito: z.n || 0, volani: z.volani || 0, strop: stropKreditu(env), zdarma: ZDARMA_KREDITU };
}

export function vytvorMapy({ env = process.env, fetch: f = globalThis.fetch, store = null, ted = () => Date.now() } = {}) {
  const klic = () => {
    const k = String(env[KLIC_MAPY] || "").trim();
    if (!k) throw chyba(`Mapy.com nejsou zapnuté: chybí ${KLIC_MAPY} v Netlify (klíč z https://developer.mapy.com/account/).`, 400);
    return k;
  };
  async function zavolej(cesta, params, kredity, { signal, obrazek = false } = {}) {
    const k = klic();
    if (!(await rezervujKredity(store, kredity, env, ted()))) {
      throw chyba(`Měsíční strop kreditů Mapy.com (${stropKreditu(env)}, proměnná MAPY_MESICNI_LIMIT_KREDITU) by se překročil – volání neodešlo.`, 402);
    }
    const url = new URL(cesta, MAPY_URL);
    for (const [kl, v] of Object.entries(params)) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) v.forEach((x) => url.searchParams.append(kl, String(x)));
      else url.searchParams.set(kl, String(v));
    }
    const r = await f(url.toString(), { headers: { "X-Mapy-Api-Key": k, accept: obrazek ? "image/*" : "application/json" }, signal });
    if (!r.ok) {
      let detail = "";
      try { const j = await r.json(); detail = j?.detail?.msg || j?.detail || j?.message || ""; } catch {}
      const status = r.status === 401 || r.status === 403 ? 401 : r.status === 404 ? 404 : r.status === 422 ? 400 : r.status === 429 ? 429 : 502;
      throw chyba(`Mapy.com odpověděly ${r.status}${detail ? ` (${String(detail).slice(0, 160)})` : ""}.`, status);
    }
    if (obrazek) {
      const typ = r.headers.get("content-type") || "image/png";
      const buf = Buffer.from(await r.arrayBuffer());
      return { mimeType: typ.split(";")[0].trim(), base64: buf.toString("base64"), bajtu: buf.length };
    }
    return r.json();
  }

  async function hledej(cesta, { dotaz, limit = 5, typ = "vse", lokalita, blizko, jazyk = "cs" }, signal) {
    const q = String(dotaz || "").trim().slice(0, 150);
    if (!q) throw chyba("Prázdný dotaz.");
    const params = { query: q, lang: jazyk, limit: Math.min(15, Math.max(1, Math.floor(Number(limit)) || 5)), type: TYPY_HLEDANI[typ] || TYPY_HLEDANI.vse };
    if (lokalita) params.locality = Array.isArray(lokalita) ? lokalita.slice(0, 5) : [String(lokalita)];
    if (blizko) params.preferNear = souradnice(blizko).join(",");
    const data = await zavolej(cesta, params, KREDITY.geokodovani, { signal });
    return (Array.isArray(data?.items) ? data.items : []).map(prevedPolozku);
  }

  return {
    zapnuto: () => mapyZapnuto(env),
    geokoduj: (v, signal) => hledej("/v1/geocode", v, signal),
    naseptej: (v, signal) => hledej("/v1/suggest", v, signal),
    async zpetne({ bod, jazyk = "cs" }, signal) {
      const [lon, lat] = souradnice(bod);
      const data = await zavolej("/v1/rgeocode", { lon, lat, lang: jazyk }, KREDITY.geokodovani, { signal });
      return (Array.isArray(data?.items) ? data.items : []).map(prevedPolozku);
    },
    // Adresa nebo „lon,lat“ → jeden bod {lon, lat, adresa}. Řetězec se souřadnicemi nestojí žádný kredit.
    async bod(v, signal) {
      if (Array.isArray(v) || (v && typeof v === "object") || jeSouradnice(v)) { const [lon, lat] = souradnice(v); return { lon, lat, adresa: `${lon},${lat}` }; }
      const [prvni] = await hledej("/v1/geocode", { dotaz: v, limit: 1, typ: "vse" }, signal);
      if (!prvni) throw chyba(`Adresu „${String(v).slice(0, 80)}“ se nepodařilo najít.`, 404);
      return { lon: prvni.lon, lat: prvni.lat, adresa: adresaText(prvni), polozka: prvni };
    },
    async trasa({ start, cil, pruchozi = [], typ = "car_fast", bezMyta = false, bezDalnic = false, odjezd }, signal) {
      if (!TYPY_TRASY.includes(typ)) throw chyba(`Typ trasy musí být jeden z: ${TYPY_TRASY.join(", ")}.`);
      const body = (Array.isArray(pruchozi) ? pruchozi : []).slice(0, 15).map((p) => souradnice(p).join(","));
      const params = { start: souradnice(start).join(","), end: souradnice(cil).join(","), routeType: typ, format: "polyline", lang: "cs", avoidToll: bezMyta ? "true" : undefined, avoidHighways: bezDalnic ? "true" : undefined, departure: odjezd || undefined };
      if (body.length) params.waypoints = body;
      const data = await zavolej("/v1/routing/route", params, KREDITY.trasa, { signal });
      return { delkaM: Number(data?.length) || 0, trvaniS: Number(data?.duration) || 0, useky: Array.isArray(data?.parts) ? data.parts.map((u) => ({ delkaM: Number(u?.length) || 0, trvaniS: Number(u?.duration) || 0 })) : [], polyline: typeof data?.geometry === "string" ? data.geometry : data?.geometry?.polyline || "" };
    },
    async matice({ body, cile, typ = "car_fast", bezMyta = false }, signal) {
      if (!TYPY_TRASY.includes(typ)) throw chyba(`Typ trasy musí být jeden z: ${TYPY_TRASY.join(", ")}.`);
      const starts = (Array.isArray(body) ? body : []).map((b) => souradnice(b).join(","));
      const ends = (Array.isArray(cile) ? cile : []).map((b) => souradnice(b).join(","));
      if (starts.length < (ends.length ? 1 : 2) || starts.length > 100 || ends.length > 100) throw chyba("Matice: 2–100 bodů (nebo 1–100 startů a 1–100 cílů).");
      const bunek = starts.length * (ends.length || starts.length);
      if (bunek > 100) throw chyba("Matice: nejvýš 100 dvojic (např. 10×10).");
      const params = { starts, routeType: typ, lang: "cs", avoidToll: bezMyta ? "true" : undefined };
      if (ends.length) params.ends = ends;
      const data = await zavolej("/v1/routing/matrix-m", params, Math.max(KREDITY.trasa, Math.ceil(KREDITY.maticeZa100 * bunek / 100)), { signal });
      return { matice: Array.isArray(data?.matrix) ? data.matrix.map((radek) => (Array.isArray(radek) ? radek.map((b) => ({ delkaM: Number(b?.length), trvaniS: Number(b?.duration) })) : [])) : [] };
    },
    async vyska({ body }, signal) {
      const pozice = (Array.isArray(body) ? body : [body]).slice(0, 256).map((b) => souradnice(b).join(","));
      if (!pozice.length) throw chyba("Zadejte aspoň jeden bod.");
      const data = await zavolej("/v1/elevation", { positions: pozice, lang: "cs" }, KREDITY.vyska, { signal });
      return (Array.isArray(data?.items) ? data.items : []).map((p) => ({ lon: Number(p?.position?.lon), lat: Number(p?.position?.lat), vyskaM: Number(p?.elevation) }));
    },
    // Statický snímek: střed + zoom (19 ≈ jeden dům), sada aerial/basic/…, značka na objektu, volitelně polygon (střecha).
    async snimek({ bod, zoom = 19, sada = "aerial", sirka = 640, vyska = 640, znacka = true, polygon, format = "jpg", meritko = 1 }, signal) {
      if (!SADY_MAP.includes(sada)) throw chyba(`Sada map musí být jedna z: ${SADY_MAP.join(", ")}.`);
      const [lon, lat] = souradnice(bod);
      const params = { lon, lat, zoom: cislo(zoom, 1, 19, "zoom"), width: cislo(sirka, 10, MAX_SNIMEK_PX, "sirka"), height: cislo(vyska, 10, MAX_SNIMEK_PX, "vyska"), mapset: sada, format: ["png", "jpg", "webp", "gif"].includes(format) ? format : "jpg", scale: cislo(meritko, 1, 2, "meritko"), lang: "cs" };
      if (znacka) params.markers = [`color:#D4AF37;size:normal;${lon},${lat}`];
      if (Array.isArray(polygon) && polygon.length >= 3) params.shapes = [`color:#D4AF37;fill:#D4AF3733;width:3;polygon:${polygon.map((p) => souradnice(p).join(",")).join(";")}`];
      const o = await zavolej("/v1/static/map", params, KREDITY.snimek, { signal, obrazek: true });
      return { ...o, lon, lat, zoom: params.zoom, sada, sirka: params.width, vyska: params.height };
    },
    async panorama({ bod, polomer = 50, sirka = 800, vyska = 500, smer = "point", sklon, zorne }, signal) {
      const [lon, lat] = souradnice(bod);
      const params = { lon, lat, radius: cislo(polomer, 0, 100, "polomer"), width: cislo(sirka, 10, MAX_SNIMEK_PX, "sirka"), height: cislo(vyska, 10, MAX_SNIMEK_PX, "vyska"), yaw: smer, lang: "cs" };
      if (sklon !== undefined) params.pitch = cislo(sklon, -1.5, 1.5, "sklon");
      if (zorne !== undefined) params.fov = cislo(zorne, 0.16, 1.57, "zorne");
      const o = await zavolej("/v1/static/pano", params, KREDITY.panorama, { signal, obrazek: true });
      return { ...o, lon, lat, polomer: params.radius };
    },
    kredity: () => kredityMesice(store, env, ted()),
  };
}

export const kmText = (m) => (m >= 1000 ? `${(m / 1000).toFixed(m >= 10_000 ? 0 : 1)} km` : `${m} m`);
export const casText = (s) => { const min = Math.round(s / 60); return min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min` : `${min} min`; };
