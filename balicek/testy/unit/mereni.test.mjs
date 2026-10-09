// Měření budovy z adresy (úkol 23): tři adresy – s půdorysem v RÚIAN, bez půdorysu (záloha OpenStreetMap),
// náměstí místo domu. Odpovědi RÚIAN jsou záznam ze 9. 10. 2026 (testy/fixtures/mereni-ruian.json);
// výškopis a OSM jsou syntetické. Nic nejde na internet.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { vytvorMereni, SCHEMA } from "../../web/netlify/functions/mereni.mjs";
import { spocitej, strany, obdelnik, vyskyZVzorku, plocha, oznacSpolecne } from "../../web/netlify/lib/mereni/geometrie.mjs";
import { vydejToken } from "../../web/netlify/lib/ai/autorizace.mjs";
import { env, pametoveUloziste, pozadavek } from "../pomocne.mjs";

const FIX = JSON.parse(readFileSync(new URL("../fixtures/mereni-ruian.json", import.meta.url), "utf8"));
const odp = (j, status = 200) => new Response(JSON.stringify(j), { status, headers: { "content-type": "application/json" } });

// Výškopis: sedlová střecha nad obrysem z fixtury – terén 213 m, okap 9 m, hřeben podél delší strany, sklon 35°.
// Výška bodu se počítá ze vzdálenosti od osy obdélníku obrysu (stejná geometrie jako v knihovně).
function falesnyFetch({ bezPudorysu = false, overpassChyba = 0, vyskopis = true } = {}) {
  const volani = [];
  const rings = FIX.stavebni_objekt.features[0].geometry.rings[0];
  const cx = rings.slice(0, -1).reduce((s, p) => s + p[0], 0) / (rings.length - 1);
  const cy = rings.slice(0, -1).reduce((s, p) => s + p[1], 0) / (rings.length - 1);
  const o = obdelnik(rings.slice(0, -1).map(([x, y]) => [x - cx, y - cy]));
  const tg = Math.tan((35 * Math.PI) / 180);
  const f = async (url, init = {}) => {
    const u = String(url);
    volani.push({ u, metoda: init.method || "GET" });
    if (u.includes("findAddressCandidates")) return odp(/n%C3%A1m%C4%9Bst%C3%AD%2C|náměstí,/.test(decodeURIComponent(u)) && !/n%C3%A1m%C4%9Bst%C3%AD\+8|náměstí 8/.test(decodeURIComponent(u)) ? FIX.geocode_namesti : FIX.geocode_dum);
    if (u.includes("/MapServer/1/query")) return odp(FIX.adresni_misto);
    if (u.includes("/MapServer/3/query") && init.method === "POST") return odp(FIX.sousede);
    if (u.includes("/MapServer/3/query")) {
      if (!bezPudorysu) return odp(FIX.stavebni_objekt);
      const so = structuredClone(FIX.stavebni_objekt);
      delete so.features[0].geometry;
      return odp(so);
    }
    if (u.includes("/ImageServer/identify")) {
      if (!vyskopis) return odp({ error: { code: 500, message: "down" } });
      const g = JSON.parse(new URL(u).searchParams.get("geometry"));
      if (u.includes("dmr5g")) return odp({ value: "213.0" });
      let x = g.x - cx, y = g.y - cy;
      if (g.spatialReference.wkid === 4326) return odp({ value: String(213 + 7) }); // OSM větev: plochá 7 m
      const c = Math.cos(o.uhel), s = Math.sin(o.uhel);
      const b = -x * s + y * c - (o.minB + o.maxB) / 2;
      return odp({ value: String(213 + 9 + tg * (o.sirka / 2 - Math.abs(b))) });
    }
    if (u.includes("overpass")) {
      if (overpassChyba-- > 0) return new Response("busy", { status: 504 });
      const lat = 50.0287, lon = 15.2005, dx = 0.00012, dy = 0.00008; // ~ 8,6 × 8,9 m
      return odp({ elements: [{ type: "way", id: 1, tags: { building: "house", "building:levels": "2" }, geometry: [[lat, lon], [lat, lon + dx], [lat + dy, lon + dx], [lat + dy, lon], [lat, lon]].map(([la, lo]) => ({ lat: la, lon: lo })) }] });
    }
    if (u.includes("nominatim")) return odp([]);
    return new Response("neznámá adresa v testu", { status: 404 });
  };
  f.volani = volani;
  return f;
}
const auth = () => ({ authorization: `Bearer ${vydejToken(env()).token}` });
const mer = (h, body) => h(pozadavek("/api/mereni", { method: "POST", headers: auth(), body }));

test("adresa s půdorysem v RÚIAN: plocha, obvod, strany, sedlová střecha z výškopisu, společné zdi, zdroje, mezipaměť", async () => {
  const f = falesnyFetch();
  const ul = pametoveUloziste();
  const h = vytvorMereni({ env: env(), fetchFn: f, uloziste: ul, ulozisteLimitu: pametoveUloziste() });
  const j = await (await mer(h, { adresa: "Karlovo náměstí 8, Kolín" })).json();
  assert.equal(j.stav, "hotovo");
  assert.equal(j.schema, SCHEMA);
  assert.match(j.schema, /ne geodetické zaměření/);
  assert.equal(j.budova.zpusobVyuziti.nazev, "rodinný dům");
  assert.ok(Math.abs(j.pudorys.plocha - 645) < 5, `plocha ${j.pudorys.plocha}`);
  assert.ok(j.pudorys.strany.length >= 4);
  assert.equal(j.vysky.tvar, "sedlová");
  assert.ok(Math.abs(j.vysky.sklon - 35) <= 2, `sklon ${j.vysky.sklon}`);
  assert.ok(Math.abs(j.vysky.okap - 9) <= 0.5, `okap ${j.vysky.okap}`);
  assert.ok(Math.abs(j.strecha.plocha - j.pudorys.plocha / Math.cos((j.vysky.sklon * Math.PI) / 180)) < 1);
  assert.ok(j.pudorys.strany.some((s) => s.spolecnaZed), "řadový dům má společnou zeď");
  assert.ok(j.fasady.filter((x) => x.spolecnaZed).every((x) => x.plocha === 0));
  assert.ok(j.model3d.podstava.length >= 4 && j.model3d.vyskaHrebene > j.model3d.vyskaOkapu);
  assert.ok(j.presnost.plochaProcent > 0 && j.presnost.plochaProcent < 20);
  assert.ok(j.zdroje.some((z) => z.licence === "CC BY 4.0" && /RÚIAN/.test(z.nazev)));
  assert.ok(j.zdroje.some((z) => /DMP 1G/.test(z.nazev)));
  assert.ok(f.volani.filter((v) => v.u.includes("identify")).length <= 24, "nejvýš 12 bodů × 2 služby");
  // Druhé měření stejné adresy jde z mezipaměti (bez výškopisu a sousedů).
  const pred = f.volani.length;
  const j2 = await (await mer(h, { adresa: "Karlovo náměstí 8, Kolín" })).json();
  assert.equal(j2.zMezipameti, true);
  assert.ok(f.volani.length - pred <= 2, "jen vyhledání adresy");
  assert.ok([...ul._mapa.keys()].some((k) => k.startsWith("adresa/")));
});

test("adresa bez půdorysu v RÚIAN: obrys z OpenStreetMap (Overpass se střídáním serverů), výška z výškopisu", async () => {
  const f = falesnyFetch({ bezPudorysu: true, overpassChyba: 1 });
  const h = vytvorMereni({ env: env(), fetchFn: f, uloziste: pametoveUloziste(), ulozisteLimitu: pametoveUloziste() });
  const j = await (await mer(h, { adresa: "Karlovo náměstí 8, Kolín" })).json();
  assert.equal(j.stav, "hotovo");
  const servery = f.volani.filter((v) => v.u.includes("overpass")).map((v) => new URL(v.u).host);
  assert.equal(servery.length, 2, "první server selhal, druhý odpověděl");
  assert.notEqual(servery[0], servery[1]);
  assert.ok(Math.abs(j.pudorys.plocha - 8.6 * 8.9) < 6, `plocha ${j.pudorys.plocha}`);
  assert.equal(j.vysky.tvar, "plochá");
  assert.ok(Math.abs(j.vysky.okap - 7) < 0.2);
  assert.ok(j.zdroje.some((z) => z.licence === "ODbL 1.0"));
  assert.ok(j.upozorneni.some((u) => /OpenStreetMap/.test(u)));
  assert.ok(j.presnost.plochaProcent > 10, "OSM obrys má větší nejistotu");
});

test("náměstí místo domu: žádné měření, nabídka konkrétních adres; bez výškopisu odhad z podlaží", async () => {
  const f = falesnyFetch();
  const h = vytvorMereni({ env: env(), fetchFn: f, uloziste: pametoveUloziste(), ulozisteLimitu: pametoveUloziste() });
  const j = await (await mer(h, { adresa: "Karlovo náměstí, Kolín" })).json();
  assert.equal(j.stav, "neni-budova");
  assert.match(j.zprava, /ulice nebo náměstí/);
  assert.ok(j.kandidati.length >= 1 && j.kandidati.every((k) => /Karlovo náměstí \d+/.test(k.adresa)));
  assert.ok(!f.volani.some((v) => v.u.includes("identify") || v.u.includes("/MapServer/3/")), "nic se neměří");
  // Výškopis nedostupný → výška z počtu podlaží (fixture podlaží nemá → upozornění), plocha dál z RÚIAN.
  const h2 = vytvorMereni({ env: env(), fetchFn: falesnyFetch({ vyskopis: false }), uloziste: pametoveUloziste(), ulozisteLimitu: pametoveUloziste() });
  const j2 = await (await mer(h2, { adresa: "Karlovo náměstí 8, Kolín" })).json();
  assert.equal(j2.stav, "hotovo");
  assert.ok(j2.upozorneni.some((u) => /Výškopis/.test(u)));
  assert.ok(Math.abs(j2.pudorys.plocha - 645) < 5);
});

test("jen přihlášený majitel; limit 60 měření / 10 min", async () => {
  const L = pametoveUloziste();
  const h = vytvorMereni({ env: env(), fetchFn: falesnyFetch(), uloziste: pametoveUloziste(), ulozisteLimitu: L });
  assert.equal((await h(pozadavek("/api/mereni", { method: "POST", body: { adresa: "x" } }))).status, 401);
  await L.setJSON("limit/mereni", { n: 60, od: Date.now() });
  assert.equal((await mer(h, { adresa: "Karlovo náměstí 8, Kolín" })).status, 429);
});

test("geometrie: obdélník 10 × 8 m, strany a orientace, sedlová střecha 30°, štíty a společná zeď", () => {
  const b = [[0, 0], [10, 0], [10, 8], [0, 8]];
  assert.equal(plocha(b), 80);
  const s = strany(b);
  assert.deepEqual(s.map((x) => x.delka), [10, 8, 10, 8]);
  assert.deepEqual(s.map((x) => x.orientace), ["J", "V", "S", "Z"]);
  const vz = [-3, -1.5, 0, 1.5, 3].map((n) => ({ napric: n, teren: 200, povrch: 200 + 6 + Math.tan(Math.PI / 6) * (4 - Math.abs(n)) }));
  const v = vyskyZVzorku(vz, obdelnik(b));
  assert.equal(v.tvar, "sedlová");
  assert.equal(v.sklon, 30);
  assert.equal(v.okap, 6);
  const r = spocitej(b, v, { presnostVyskyM: 0.5, sousede: [[[10, 0], [20, 0], [20, 8], [10, 8]]] });
  assert.equal(r.strecha.plocha, Math.round((80 / Math.cos(Math.PI / 6)) * 10) / 10);
  assert.ok(r.stity > 0);
  assert.equal(r.fasady[1].spolecnaZed, true);
  assert.equal(r.fasady[1].plocha, 0);
  assert.equal(oznacSpolecne(s, []).length, 4);
  assert.match(r.presnost.vyska, /0,5 m/);
});
