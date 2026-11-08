// Mapy.com (úkol 60): adaptér s falešným fetch (klíč v hlavičce, parametry, převod odpovědí, strop kreditů),
// nástroje brány MCP včetně obrázku, /api/mapa pro panel. Bez skutečných volání Mapy.com.
import { test } from "node:test";
import assert from "node:assert/strict";
import { vytvorMapy, souradnice, prevedPolozku, adresaText, rezervujKredity, kredityMesice, kmText, casText, KREDITY } from "../../web/netlify/lib/ai/mapy.mjs";
import { vytvorMcpFunkci } from "../../web/netlify/functions/mcp.mjs";
import { vytvorMapaFunkci } from "../../web/netlify/functions/mapa.mjs";
import { NASTROJE } from "../../web/netlify/lib/ai/mcp.mjs";
import { vydejToken } from "../../web/netlify/lib/ai/autorizace.mjs";
import { env, falesnyAdapter, pametoveUloziste, pozadavek } from "../pomocne.mjs";

const PNG_1PX = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
const POLOZKA_HK = { name: "Stavební 1066", label: "Adresa", position: { lon: 15.8426, lat: 50.2208 }, type: "regional.address", location: "Hradec Králové, Česko", zip: "500 03", regionalStructure: [{ name: "Stavební 1066", type: "regional.address" }, { name: "Stavební", type: "regional.street" }, { name: "Slezské Předměstí", type: "regional.municipality_part" }, { name: "Hradec Králové", type: "regional.municipality" }, { name: "Královéhradecký kraj", type: "regional.region" }, { name: "Česko", type: "regional.country", isoCode: "CZ" }] };
const POLOZKA_PHA = { name: "Pernerova 10/32", label: "Adresa", position: { lon: 14.4506, lat: 50.0922 }, type: "regional.address", location: "Praha 8 – Karlín", zip: "186 00", regionalStructure: [{ name: "Pernerova 10/32", type: "regional.address" }, { name: "Pernerova", type: "regional.street" }, { name: "Karlín", type: "regional.municipality_part" }, { name: "Praha", type: "regional.municipality" }, { name: "Hlavní město Praha", type: "regional.region" }, { name: "Česko", type: "regional.country" }] };

// Falešné api.mapy.com: zaznamená požadavky, odpoví podle cesty.
function falesneMapy(volby = {}) {
  const pozadavky = [];
  const f = async (url, o) => {
    const u = new URL(url);
    pozadavky.push({ url: u, hlavicky: o?.headers || {} });
    const json = (data, status = 200) => ({ ok: status < 400, status, headers: new Headers({ "content-type": "application/json" }), json: async () => data, arrayBuffer: async () => Buffer.from(JSON.stringify(data)) });
    const obrazek = (typ) => ({ ok: true, status: 200, headers: new Headers({ "content-type": typ }), arrayBuffer: async () => PNG_1PX, json: async () => ({}) });
    if (volby.status) return json({ detail: { msg: volby.detail || "chyba" } }, volby.status);
    switch (u.pathname) {
      case "/v1/geocode": case "/v1/suggest": return json({ items: u.searchParams.get("query")?.includes("nikde") ? [] : [POLOZKA_HK, POLOZKA_PHA].slice(0, Number(u.searchParams.get("limit")) || 5) });
      case "/v1/rgeocode": return json({ items: [POLOZKA_HK] });
      case "/v1/routing/route": return json({ length: 123456, duration: 5400, geometry: "abcd", parts: [{ length: 100000, duration: 4000 }, { length: 23456, duration: 1400 }] });
      case "/v1/routing/matrix-m": return json({ matrix: [[{ length: 0, duration: 0 }, { length: 123456, duration: 5400 }], [{ length: 123000, duration: 5300 }, { length: 0, duration: 0 }]] });
      case "/v1/elevation": return json({ items: [{ position: { lon: 15.8426, lat: 50.2208 }, elevation: 234.6 }] });
      case "/v1/static/map": return obrazek("image/jpeg");
      case "/v1/static/pano": return volby.bezPanoramy ? json({ detail: "not found" }, 404) : obrazek("image/jpeg");
      default: return json({ detail: "neznámá cesta" }, 404);
    }
  };
  return { f, pozadavky };
}

test("souradnice: pole, objekt, řetězec; prohozené lat,lon pro ČR se opraví; mimo rozsah selže", () => {
  assert.deepEqual(souradnice([15.84, 50.22]), [15.84, 50.22]);
  assert.deepEqual(souradnice({ lon: 15.84, lat: 50.22 }), [15.84, 50.22]);
  assert.deepEqual(souradnice("15.84, 50.22"), [15.84, 50.22]);
  assert.deepEqual(souradnice("50.22,15.84"), [15.84, 50.22], "lat,lon pro ČR se prohodí");
  assert.deepEqual(souradnice([-73.98, 40.75]), [-73.98, 40.75], "mimo ČR beze změny");
  assert.throws(() => souradnice("abc"), /lon,lat/);
  assert.throws(() => souradnice([200, 10]), /lon musí být/);
  const z = prevedPolozku(POLOZKA_HK);
  assert.equal(z.obec, "Hradec Králové");
  assert.equal(z.kraj, "Královéhradecký kraj");
  assert.equal(adresaText(z), "Stavební 1066, 500 03 Hradec Králové");
  assert.equal(kmText(123456), "123 km");
  assert.equal(kmText(850), "850 m");
  assert.equal(casText(5400), "1 h 30 min");
  assert.equal(casText(1500), "25 min");
});

test("adaptér: klíč jen v hlavičce, parametry podle OpenAPI, převod odpovědí, kredity v úložišti", async () => {
  const { f, pozadavky } = falesneMapy();
  const ul = pametoveUloziste();
  const m = vytvorMapy({ env: env({ HSPG_KLIC_MAPY: "mapy-test-klic" }), fetch: f, store: ul });
  const g = await m.geokoduj({ dotaz: "Stavební 1066, Hradec Králové", limit: 3, typ: "adresa", blizko: "15.8,50.2" });
  assert.equal(g.length, 2);
  assert.equal(g[0].lon, 15.8426);
  const u = pozadavky[0].url;
  assert.equal(u.origin + u.pathname, "https://api.mapy.com/v1/geocode");
  assert.equal(u.searchParams.get("query"), "Stavební 1066, Hradec Králové");
  assert.equal(u.searchParams.get("limit"), "3");
  assert.deepEqual(u.searchParams.getAll("type"), ["regional.address"]);
  assert.equal(u.searchParams.get("preferNear"), "15.8,50.2");
  assert.equal(u.searchParams.get("lang"), "cs");
  assert.equal(pozadavky[0].hlavicky["X-Mapy-Api-Key"], "mapy-test-klic");
  assert.equal(u.searchParams.get("apikey"), null, "klíč nikdy v URL");
  const zp = await m.zpetne({ bod: "15.8426,50.2208" });
  assert.equal(zp[0].obec, "Hradec Králové");
  assert.equal(pozadavky[1].url.searchParams.get("lon"), "15.8426");
  const b1 = await m.bod("50.2208,15.8426");
  assert.deepEqual([b1.lon, b1.lat], [15.8426, 50.2208], "souřadnice nestojí kredit a opraví pořadí");
  const b2 = await m.bod("Pernerova 10/32, Praha");
  assert.equal(b2.adresa, "Stavební 1066, 500 03 Hradec Králové", "první výsledek geokódování");
  const t = await m.trasa({ start: [15.8426, 50.2208], cil: [14.4506, 50.0922], pruchozi: [[15.0, 50.1]], typ: "car_fast", bezDalnic: true });
  assert.equal(t.delkaM, 123456);
  assert.equal(t.useky.length, 2);
  const ut = pozadavky.at(-1).url;
  assert.equal(ut.pathname, "/v1/routing/route");
  assert.equal(ut.searchParams.get("start"), "15.8426,50.2208");
  assert.equal(ut.searchParams.get("end"), "14.4506,50.0922");
  assert.deepEqual(ut.searchParams.getAll("waypoints"), ["15,50.1"]);
  assert.equal(ut.searchParams.get("avoidHighways"), "true");
  assert.equal(ut.searchParams.get("avoidToll"), null);
  assert.equal(ut.searchParams.get("format"), "polyline");
  await assert.rejects(m.trasa({ start: [15, 50], cil: [14, 50], typ: "letadlo" }), /Typ trasy/);
  const mat = await m.matice({ body: [[15.8426, 50.2208], [14.4506, 50.0922]] });
  assert.equal(mat.matice[0][1].delkaM, 123456);
  assert.deepEqual(pozadavky.at(-1).url.searchParams.getAll("starts"), ["15.8426,50.2208", "14.4506,50.0922"]);
  await assert.rejects(m.matice({ body: [[15, 50]] }), /2–100 bodů/);
  const v = await m.vyska({ body: [[15.8426, 50.2208]] });
  assert.equal(v[0].vyskaM, 234.6);
  assert.deepEqual(pozadavky.at(-1).url.searchParams.getAll("positions"), ["15.8426,50.2208"]);
  const s = await m.snimek({ bod: [15.8426, 50.2208], zoom: 19, sada: "aerial", polygon: [[15.842, 50.22], [15.843, 50.22], [15.843, 50.221]] });
  assert.equal(s.mimeType, "image/jpeg");
  assert.equal(s.base64, PNG_1PX.toString("base64"));
  const us = pozadavky.at(-1).url;
  assert.equal(us.searchParams.get("mapset"), "aerial");
  assert.equal(us.searchParams.get("zoom"), "19");
  assert.equal(us.searchParams.get("width"), "640");
  assert.match(us.searchParams.get("markers"), /^color:#D4AF37;size:normal;15\.8426,50\.2208$/);
  assert.match(us.searchParams.get("shapes"), /^color:#D4AF37;fill:#D4AF3733;width:3;polygon:15\.842,50\.22;15\.843,50\.22;15\.843,50\.221$/);
  await assert.rejects(m.snimek({ bod: [15, 50], sada: "satelit" }), /Sada map/);
  const p = await m.panorama({ bod: [15.8426, 50.2208] });
  assert.equal(p.polomer, 50);
  assert.equal(pozadavky.at(-1).url.searchParams.get("yaw"), "point");
  // Kredity: 4 (geocode) + 4 (rgeocode) + 4 (bod/geocode) + 4 (trasa) + 4 (matice 2×2 → max(4, ceil(40·4/100)=2) = 4) + 4 (výška) + 4 (snímek) + 4 (panorama) = 32
  const k = await kredityMesice(ul, env({ HSPG_KLIC_MAPY: "x" }));
  assert.equal(k.pouzito, 32);
  assert.equal(k.volani, 8);
  assert.equal(k.strop, 200_000);
  assert.equal(k.zdarma, 250_000);
});

test("adaptér: bez klíče 400, strop kreditů 402 bez volání, chyby Mapy.com se překládají (401/404/422/429)", async () => {
  const { f, pozadavky } = falesneMapy();
  await assert.rejects(vytvorMapy({ env: env(), fetch: f, store: pametoveUloziste() }).geokoduj({ dotaz: "x" }), /chybí HSPG_KLIC_MAPY/);
  const ul = pametoveUloziste();
  const m = vytvorMapy({ env: env({ HSPG_KLIC_MAPY: "k", MAPY_MESICNI_LIMIT_KREDITU: "7" }), fetch: f, store: ul });
  await m.geokoduj({ dotaz: "a" });
  await assert.rejects(m.geokoduj({ dotaz: "b" }), (e) => e.status === 402 && /strop kreditů/.test(e.message));
  assert.equal(pozadavky.length, 1, "druhé volání vůbec neodešlo");
  assert.equal(await rezervujKredity(ul, 100, env({ MAPY_MESICNI_LIMIT_KREDITU: "7" })), false);
  for (const [status, ocekavany] of [[401, 401], [403, 401], [404, 404], [422, 400], [429, 429], [500, 502]]) {
    const { f: f2 } = falesneMapy({ status, detail: "detail" });
    const m2 = vytvorMapy({ env: env({ HSPG_KLIC_MAPY: "k" }), fetch: f2, store: pametoveUloziste() });
    await assert.rejects(m2.geokoduj({ dotaz: "a" }), (e) => e.status === ocekavany && new RegExp(`odpověděly ${status}`).test(e.message));
  }
});

test("brána MCP: mapa_adresa, mapa_snimek (obrázek + text), mapa_trasa, mapa_matice, mapa_vyska, mapa_panorama; bez klíče isError", async () => {
  assert.deepEqual(NASTROJE.map((t) => t.name).slice(5), ["mapa_adresa", "mapa_snimek", "mapa_panorama", "mapa_trasa", "mapa_matice", "mapa_vyska"]);
  const { f, pozadavky } = falesneMapy();
  const ul = pametoveUloziste();
  const e = env({ HSPG_KLIC_MAPY: "k" });
  const h = vytvorMcpFunkci({ env: e, adaptery: { gpt: falesnyAdapter({ text: "x" }) }, uloziste: ul, fetch: f });
  const auth = { authorization: `Bearer ${vydejToken(e).token}` };
  const zavolej = async (name, args) => (await (await h(pozadavek("/api/mcp", { method: "POST", headers: auth, body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } } }))).json()).result;
  const log = console.warn; console.warn = () => {};
  try {
    const adresa = await zavolej("mapa_adresa", { dotaz: "Stavební 1066, Hradec Králové", typ: "adresa" });
    assert.equal(adresa.isError, undefined);
    assert.match(adresa.content[0].text, /^Mapy\.com – 2 výsledků/);
    assert.match(adresa.content[0].text, /Stavební 1066, 500 03 Hradec Králové · regional\.address · lon 15\.842600, lat 50\.220800/);
    assert.match(adresa.content[0].text, /kredity \d{4}-\d{2}: 4\/200000/);
    assert.equal(adresa.structuredContent.polozky[0].kraj, "Královéhradecký kraj");
    const zpetne = await zavolej("mapa_adresa", { dotaz: "15.8426,50.2208" });
    assert.equal(pozadavky.at(-1).url.pathname, "/v1/rgeocode");
    assert.match(zpetne.content[0].text, /1 výsledků/);
    const nic = await zavolej("mapa_adresa", { dotaz: "nikde" });
    assert.match(nic.content[0].text, /nic nenašly/);
    const snimek = await zavolej("mapa_snimek", { misto: "Stavební 1066, Hradec Králové", zoom: 18 });
    assert.equal(snimek.isError, undefined);
    assert.equal(snimek.content[0].type, "image");
    assert.equal(snimek.content[0].mimeType, "image/jpeg");
    assert.equal(snimek.content[0].data, PNG_1PX.toString("base64"));
    assert.match(snimek.content[1].text, /^Snímek Mapy\.com \(aerial, zoom 18, 640×640 px\) – Stavební 1066, 500 03 Hradec Králové \(15\.842600, 50\.220800\)/);
    assert.equal(snimek.structuredContent.zoom, 18);
    const trasa = await zavolej("mapa_trasa", { start: "15.8426,50.2208", cil: "Pernerova 10/32, Praha", typ: "car_fast" });
    assert.match(trasa.content[0].text, /^Trasa Mapy\.com \(car_fast\): 123 km, 1 h 30 min\nstart: 15\.8426,50\.2208/);
    assert.match(trasa.content[0].text, /úsek 2: 23 km, 23 min\n— kredity/);
    const matice = await zavolej("mapa_matice", { body: ["15.8426,50.2208", "14.4506,50.0922"] });
    assert.match(matice.content[0].text, /řádky = odkud/);
    assert.match(matice.content[0].text, /1: 1=0 m\/0 min  2=123 km\/1 h 30 min/);
    const vyska = await zavolej("mapa_vyska", { body: ["15.8426,50.2208"] });
    assert.match(vyska.content[0].text, /235 m n\. m\./);
    const pano = await zavolej("mapa_panorama", { misto: "15.8426,50.2208", polomer: 30 });
    assert.equal(pano.content[0].type, "image");
    assert.equal(pozadavky.at(-1).url.searchParams.get("radius"), "30");
    assert.ok(!JSON.stringify([adresa, snimek, trasa, matice, vyska, pano]).includes("mapy-test-klic") && !JSON.stringify(adresa).includes('"k"'));
    const stav = await zavolej("ai_stav", {});
    assert.equal(stav.structuredContent.mapy.zapnuto, true);
    assert.match(stav.content[0].text, /Mapy\.com: zapnuto · kredity/);
    assert.ok((await ul.get("limit/ai-majitel")).n >= 8, "každé volání se počítá do společného limitu");
    // Bez panoramy v okolí → text, ne chyba.
    const { f: f2 } = falesneMapy({ bezPanoramy: true });
    const h2 = vytvorMcpFunkci({ env: e, adaptery: {}, uloziste: pametoveUloziste(), fetch: f2 });
    const bez = await (await h2(pozadavek("/api/mcp", { method: "POST", headers: auth, body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "mapa_panorama", arguments: { misto: "15.8426,50.2208" } } } }))).json();
    assert.equal(bez.result.isError, undefined);
    assert.match(bez.result.content[0].text, /Panorama Mapy\.com v okolí .* není/);
    // Bez klíče.
    const h3 = vytvorMcpFunkci({ env: env(), adaptery: {}, uloziste: pametoveUloziste(), fetch: f });
    const bezKlice = await (await h3(pozadavek("/api/mcp", { method: "POST", headers: auth, body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "mapa_adresa", arguments: { dotaz: "x" } } } }))).json();
    assert.equal(bezKlice.result.isError, true);
    assert.match(bezKlice.result.content[0].text, /chybí HSPG_KLIC_MAPY/);
    const stav3 = await (await h3(pozadavek("/api/mcp", { method: "POST", headers: auth, body: { jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: "ai_stav", arguments: {} } } }))).json();
    assert.match(stav3.result.content[0].text, /Mapy\.com: vypnuto \(chybí HSPG_KLIC_MAPY\)/);
  } finally { console.warn = log; }
});

test("/api/mapa (panel majitele): jen POST s tokenem; akce adresa, snimek jako data URL, trasa, stav; limit a chyby", async () => {
  const { f } = falesneMapy();
  const ul = pametoveUloziste();
  const e = env({ HSPG_KLIC_MAPY: "k", HSPG_MCP_TOKEN: "p".repeat(40) });
  const h = vytvorMapaFunkci({ env: e, uloziste: ul, fetch: f });
  const auth = { authorization: `Bearer ${vydejToken(e).token}` };
  const log = console.warn; console.warn = () => {};
  try {
    assert.equal((await h(pozadavek("/api/mapa"))).status, 405);
    const bez = await h(pozadavek("/api/mapa", { method: "POST", body: { akce: "stav" } }));
    assert.equal(bez.status, 401);
    assert.match(bez.headers.get("www-authenticate"), /resource_metadata=/);
    const stav = await (await h(pozadavek("/api/mapa", { method: "POST", headers: auth, body: { akce: "stav" } }))).json();
    assert.equal(stav.zapnuto, true);
    assert.equal(stav.kredity.pouzito, 0);
    const adresa = await (await h(pozadavek("/api/mapa", { method: "POST", headers: { authorization: `Bearer ${"p".repeat(40)}` }, body: { akce: "adresa", dotaz: "Stavební 1066" } }))).json();
    assert.equal(adresa.ok, true);
    assert.equal(adresa.polozky[0].adresa, "Stavební 1066, 500 03 Hradec Králové");
    const snimek = await (await h(pozadavek("/api/mapa", { method: "POST", headers: auth, body: { akce: "snimek", misto: "15.8426,50.2208", sada: "basic", zoom: 17 } }))).json();
    assert.equal(snimek.ok, true);
    assert.equal(snimek.sada, "basic");
    assert.ok(snimek.obrazek.startsWith("data:image/jpeg;base64,"));
    const trasa = await (await h(pozadavek("/api/mapa", { method: "POST", headers: auth, body: { akce: "trasa", start: "15.8426,50.2208", cil: "14.4506,50.0922" } }))).json();
    assert.equal(trasa.delkaM, 123456);
    const spatna = await h(pozadavek("/api/mapa", { method: "POST", headers: auth, body: { akce: "letadlo" } }));
    assert.equal(spatna.status, 400);
    assert.match((await spatna.json()).chyba, /Neznámá akce/);
    const neplatny = await h(pozadavek("/api/mapa", { method: "POST", headers: auth, body: "[" }));
    assert.equal(neplatny.status, 400);
    await ul.setJSON("limit/ai-majitel", { n: 120, od: Date.now() });
    assert.equal((await h(pozadavek("/api/mapa", { method: "POST", headers: auth, body: { akce: "stav" } }))).status, 429);
    const h2 = vytvorMapaFunkci({ env: env(), uloziste: pametoveUloziste(), fetch: f });
    const bezKlice = await (await h2(pozadavek("/api/mapa", { method: "POST", headers: { authorization: `Bearer ${vydejToken(env()).token}` }, body: { akce: "adresa", dotaz: "x" } }))).json();
    assert.equal(bezKlice.ok, false);
    assert.match(bezKlice.chyba, /chybí HSPG_KLIC_MAPY/);
  } finally { console.warn = log; }
});
