// Měření budovy (úkol 23) – veřejné zdroje bez klíče:
//   ČÚZK RÚIAN (ags.cuzk.gov.cz): vyhledání adresy, adresní místo, stavební objekt (polygon z katastru,
//     počet podlaží, zastavěná plocha, způsob využití) – CC BY 4.0, „ČÚZK, rok“.
//   ČÚZK výškopis DMP 1G (povrch vč. budov, střední chyba 0,4 m) a DMR 5G (terén, 0,18 m) – jen dotaz na bod
//     (identify); hromadný getSamples služba zakazuje (403). Data z leteckého skenování 2009–2013.
//   Záloha obrysu: OpenStreetMap přes Overpass (střídání serverů), pak polygon z Nominatim (nejvýš 1 dotaz/s,
//     identifikace User-Agentem, mezipaměť) – ODbL, „© přispěvatelé OpenStreetMap“.
import { aktualizuj } from "../ai/limity.mjs";

export const RUIAN = "https://ags.cuzk.gov.cz/arcgis/rest/services/RUIAN";
export const VYSKOPIS = "https://ags.cuzk.gov.cz/arcgis2/rest/services";
export const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
export const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const UA = "hspg.cz mereni-budov/1.0 (+https://hspg.cz; info@hspg.cz)";

export const ZDROJE = {
  ruian: { nazev: "ČÚZK – RÚIAN", licence: "CC BY 4.0", uvedeni: "ČÚZK, 2026", odkaz: "https://ags.cuzk.gov.cz/arcgis/rest/services/RUIAN" },
  vyskopis: { nazev: "ČÚZK – DMP 1G a DMR 5G (letecké laserové skenování 2009–2013)", licence: "CC BY 4.0", uvedeni: "ČÚZK, 2026", odkaz: "https://ags.cuzk.gov.cz/arcgis2/rest/services" },
  osm: { nazev: "OpenStreetMap (Overpass / Nominatim)", licence: "ODbL 1.0", uvedeni: "© přispěvatelé OpenStreetMap", odkaz: "https://www.openstreetmap.org/copyright" },
};

// Způsob využití stavebního objektu – oficiální číselník VFR_ZpusobVyuzitiObjektu (doména vrstvy RÚIAN, 9. 10. 2026).
export const ZPUSOB_VYUZITI = {
  1: "průmyslový objekt", 2: "zemědělská usedlost", 3: "objekt k bydlení", 4: "objekt lesního hospodářství", 5: "objekt občanské vybavenosti",
  6: "bytový dům", 7: "rodinný dům", 8: "stavba pro rodinnou rekreaci", 9: "stavba pro shromažďování většího počtu osob", 10: "stavba pro obchod",
  11: "stavba ubytovacího zařízení", 12: "stavba pro výrobu a skladování", 13: "zemědělská stavba", 14: "stavba pro administrativu",
  15: "stavba občanského vybavení", 16: "stavba technického vybavení", 17: "stavba pro dopravu", 18: "garáž", 19: "jiná stavba",
  20: "víceúčelová stavba", 21: "skleník", 30: "rozestavěné jednotky",
};

async function jsonZ(fetchFn, url, init = {}, ms = 10_000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try {
    const r = await fetchFn(url, { ...init, signal: ac.signal, headers: { "user-agent": UA, accept: "application/json", ...(init.headers || {}) } });
    if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status });
    const j = await r.json();
    if (j?.error) throw Object.assign(new Error(j.error.message || "chyba služby"), { status: j.error.code });
    return j;
  } finally {
    clearTimeout(t);
  }
}
const q = (o) => new URLSearchParams(Object.entries(o).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)])).toString();

// --- RÚIAN -----------------------------------------------------------------------------------------
// Vyhledání adresy → kandidáti [{ adresa, typ ("AdresniMisto" | "Ulice" | "Obec" …), skore, x, y (S-JTSK) }].
export async function hledejAdresu(fetchFn, text) {
  const j = await jsonZ(fetchFn, `${RUIAN}/Vyhledavaci_sluzba_nad_daty_RUIAN/MapServer/exts/GeocodeSOE/findAddressCandidates?${q({ SingleLine: String(text).slice(0, 100), outSR: "5514", maxLocations: "5", f: "json" })}`);
  return (j.candidates || []).map((c) => ({ adresa: c.address, typ: c.attributes?.Type || "", skore: c.score, x: c.location?.x, y: c.location?.y }));
}

// Adresní místo podle kódu nebo nejbližší k bodu (do 3 m) → { kod, adresa, stavebniObjekt, x, y }.
export async function adresniMisto(fetchFn, { kod, x, y }) {
  const zaklad = { outFields: "kod,adresa,stavebniobjekt", returnGeometry: "true", outSR: "5514", f: "json" };
  const parametry = kod
    ? { ...zaklad, where: `kod=${Number(kod)}` }
    : { ...zaklad, geometry: `${x},${y}`, geometryType: "esriGeometryPoint", inSR: "5514", distance: "3", units: "esriSRUnit_Meter", spatialRel: "esriSpatialRelIntersects" };
  const j = await jsonZ(fetchFn, `${RUIAN}/Prohlizeci_sluzba_nad_daty_RUIAN/MapServer/1/query?${q(parametry)}`);
  const f = j.features?.[0];
  if (!f) return null;
  return { kod: f.attributes.kod, adresa: f.attributes.adresa, stavebniObjekt: f.attributes.stavebniobjekt, x: f.geometry?.x ?? x, y: f.geometry?.y ?? y };
}

// Stavební objekt → { kod, podlazi, zastavenaPlocha, zpusobVyuzitiKod, obestavenyProstor, prstence (S-JTSK) }.
export async function stavebniObjekt(fetchFn, kod) {
  const j = await jsonZ(fetchFn, `${RUIAN}/Prohlizeci_sluzba_nad_daty_RUIAN/MapServer/3/query?${q({
    where: `kod=${Number(kod)}`, outFields: "kod,pocetpodlazi,zastavenaplocha,zpusobvyuzitikod,obestavenyprostor,typstavebnihoobjektukod", returnGeometry: "true", outSR: "5514", f: "json",
  })}`);
  const f = j.features?.[0];
  if (!f) return null;
  const a = f.attributes || {};
  return {
    kod: a.kod, podlazi: a.pocetpodlazi ?? null, zastavenaPlocha: a.zastavenaplocha ?? null,
    zpusobVyuzitiKod: a.zpusobvyuzitikod ?? null, obestavenyProstor: a.obestavenyprostor ?? null,
    prstence: Array.isArray(f.geometry?.rings) ? f.geometry.rings : [],
  };
}

// Sousední stavební objekty dotýkající se obrysu (řadové domy) → prstence v S-JTSK; kvůli společným zdem.
export async function sousedniObjekty(fetchFn, kod, prstenec) {
  const j = await jsonZ(fetchFn, `${RUIAN}/Prohlizeci_sluzba_nad_daty_RUIAN/MapServer/3/query`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: q({ geometry: { rings: [prstenec], spatialReference: { wkid: 5514 } }, geometryType: "esriGeometryPolygon", inSR: "5514", spatialRel: "esriSpatialRelIntersects", where: `kod<>${Number(kod)}`, outFields: "kod", returnGeometry: "true", outSR: "5514", f: "json" }),
  });
  return (j.features || []).flatMap((f) => f.geometry?.rings || []).slice(0, 30);
}

// --- výškopis ----------------------------------------------------------------------------------------
// Výška v bodě (S-JTSK nebo WGS84) z DMP 1G nebo DMR 5G; null když služba bod nezná.
export async function vyskaBodu(fetchFn, sluzba, [x, y], wkid = 5514) {
  const j = await jsonZ(fetchFn, `${VYSKOPIS}/${sluzba}/ImageServer/identify?${q({
    geometry: { x, y, spatialReference: { wkid } }, geometryType: "esriGeometryPoint", returnGeometry: "false", returnCatalogItems: "false", f: "json",
  })}`, {}, 8_000);
  const v = Number(j?.value);
  return Number.isFinite(v) && v > -100 ? v : null;
}

// Vzorky povrchu a terénu pro body (souběžně nejvýš 3 body = 6 dotazů – služba je veřejná, nepřetěžovat).
// Chyba nebo pomalá odpověď jednoho bodu výpočet neshodí (bod se vynechá); celkový čas hlídá limitMs.
export async function vzorkyVysek(fetchFn, body, wkid, { limitMs = 14_000 } = {}) {
  const konec = Date.now() + limitMs;
  const bezpecne = (sluzba, b) => vyskaBodu(fetchFn, sluzba, b, wkid).catch(() => null);
  const vysledky = [];
  for (let i = 0; i < body.length && Date.now() < konec; i += 3) {
    const davka = body.slice(i, i + 3);
    vysledky.push(...(await Promise.all(davka.map(async (b) => {
      const [povrch, teren] = await Promise.all([bezpecne("dmp1g", b.dotaz), bezpecne("dmr5g", b.dotaz)]);
      return { napric: b.napric, povrch, teren };
    }))));
  }
  return vysledky;
}

// --- OpenStreetMap -----------------------------------------------------------------------------------
// Obrys budovy obsahující bod (nebo nejbližší do 20 m) přes Overpass; servery se střídají při chybě.
export async function obrysOverpass(fetchFn, lat, lon) {
  const dotaz = `[out:json][timeout:20];way(around:20,${lat.toFixed(6)},${lon.toFixed(6)})["building"];out geom 10;`;
  let posledni;
  for (const url of OVERPASS) {
    try {
      const j = await jsonZ(fetchFn, url, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: `data=${encodeURIComponent(dotaz)}` }, 15_000);
      const cesty = (j.elements || []).filter((e) => e.type === "way" && e.geometry?.length >= 4);
      if (!cesty.length) return null;
      const prstence = cesty.map((e) => ({ id: e.id, body: e.geometry.map((g) => [g.lon, g.lat]), podlazi: Number(e.tags?.["building:levels"]) || null, vyska: Number.parseFloat(e.tags?.height) || null }));
      return { ...vybratObrys(prstence, lon, lat), server: new URL(url).host };
    } catch (e) {
      posledni = e;
    }
  }
  throw posledni || new Error("Overpass nedostupný");
}
function vybratObrys(prstence, lon, lat) {
  const uvnitr = prstence.find((p) => bodVKruhu([lon, lat], p.body));
  if (uvnitr) return uvnitr;
  const d = (p) => Math.min(...p.body.map(([x, y]) => Math.hypot(x - lon, y - lat)));
  return prstence.sort((a, b) => d(a) - d(b))[0];
}
function bodVKruhu([x, y], body) {
  let c = false;
  for (let i = 0, j = body.length - 1; i < body.length; j = i++) {
    const [xi, yi] = body[i], [xj, yj] = body[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

// Nominatim: nejvýš 1 dotaz za sekundu pro celý web (zámek v Blobs), jen když Overpass nic nedal.
export async function obrysNominatim(fetchFn, adresa, ul, ted = Date.now) {
  if (ul) {
    const ok = await aktualizuj(ul, "mereni/nominatim-posledni", (z) => (z && ted() - z.cas < 1100 ? null : { hodnota: { cas: ted() }, vysledek: true }));
    if (!ok) return { omezeno: true };
  }
  const j = await jsonZ(fetchFn, `${NOMINATIM}?${q({ q: String(adresa).slice(0, 200), format: "jsonv2", polygon_geojson: "1", countrycodes: "cz", limit: "1" })}`, {}, 10_000);
  const g = j?.[0]?.geojson;
  if (!g) return null;
  if (g.type === "Polygon") return { body: g.coordinates[0], lat: Number(j[0].lat), lon: Number(j[0].lon) };
  return { bezObrysu: true, lat: Number(j[0].lat), lon: Number(j[0].lon) };
}

// WGS84 ↔ lokální metry (rovinná aproximace kolem středu budovy; chyba < 1 cm na desítkách metrů).
export function wgsNaLokalni(body) {
  const lon0 = body.reduce((s, p) => s + p[0], 0) / body.length, lat0 = body.reduce((s, p) => s + p[1], 0) / body.length;
  const kx = 111320 * Math.cos((lat0 * Math.PI) / 180), ky = 110574;
  return { body: body.map(([lo, la]) => [(lo - lon0) * kx, (la - lat0) * ky]), zpet: ([x, y]) => [lon0 + x / kx, lat0 + y / ky], stred: [lat0, lon0] };
}
