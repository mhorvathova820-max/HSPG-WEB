// E2E: stránka HOLUB 360 (/holub-360/) ve skutečném Chromiu. Měření na dálku (/api/cena-z-adresy, úkol 27)
// je podstrčené přes page.route; plánovač běží z testovacího serveru (falešná předpověď MET Norway a kalendář).
// Cena se porovnává s cenovým jádrem assets/hspg-cena.js spuštěným v Node. Nic nejde na internet.
// Spuštění: CHROMIUM=/opt/pw-browsers/chromium npm run test:e2e   (HSPG_MIRROR nepovinný – bez něj prázdná složka)
import { test, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import vm from "node:vm";
import { chromium } from "playwright";
import { spustServer } from "../server.mjs";

const require = createRequire(import.meta.url);
const AXE = require.resolve("axe-core/axe.min.js");
const WEB = new URL("../../web/", import.meta.url);
const json = (p) => JSON.parse(readFileSync(new URL(p, WEB), "utf8"));
const MIRROR = process.env.HSPG_MIRROR || mkdtempSync(join(tmpdir(), "hspg-mirror-"));

// Cenové jádro v Node (stejně jako testy/unit/cena.test.mjs).
const C = (() => {
  const ctx = { module: { exports: {} }, Math, Number, String, Object, Array, Promise, Error, isFinite };
  vm.runInNewContext(readFileSync(new URL("assets/hspg-cena.js", WEB), "utf8"), ctx, { filename: "hspg-cena.js" });
  return ctx.module.exports;
})();
const STANDARD = json("content/standard.json");
const SENTINEL = json("content/sentinel.json");
const jadro = C.vytvor({ cenik: json("content/ceny.json"), standard: STANDARD, sentinel: SENTINEL, potvrzeni: json("content/cenik-potvrzeni.json") });
const PRAVIDLO = json("content/pocasi-prace.json").verejne.technologickeOkno;

const ADRESA = "Lipová 12, 280 02 Kolín";
// Odpověď /api/cena-z-adresy podle úkolu 27; navíc pole, která stránka NESMÍ ukázat (výšky, model3d, strany, sousedé).
const MERENI = {
  stav: "hotovo", adresa: ADRESA, obec: "Kolín", okres: "Kolín",
  poloha: { lat: 50.028, lon: 15.201 },
  plochy: { strecha: 190, fasady: 340, pudorys: 150 },
  obrys: [{ lat: 50.02795, lng: 15.20085 }, { lat: 50.02795, lng: 15.20115 }, { lat: 50.02806, lng: 15.20115 }, { lat: 50.02806, lng: 15.20085 }],
  zdroje: [{ nazev: "ČÚZK – RÚIAN", co: "obrys budovy (katastrální mapa)" }],
  vysky: { okap: 6.1, hreben: 9.4 }, model3d: { body: [[0, 0, 0]] }, strany: [{ delka: 21.4 }], sousede: [[1, 2]],
};
const EMBARGO = /letecké mapy|satelitní snímky|Google Maps|katastr|RÚIAN|H-BIO|certifikovan|\+8,4/i;
const bezMezer = (t) => String(t).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
const cislo = (t) => Number(String(t).replace(/[^\d]/g, ""));

let prohlizec, server;
const kontexty = [];
// Každý test po sobě zavře své stránky i při chybě – jinak by běžící WebGL smyčky brzdily další testy.
afterEach(async () => { await Promise.all(kontexty.splice(0).map((c) => c.close().catch(() => {}))); });
before(async () => {
  prohlizec = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  server = await spustServer({ rezim: "bez-ai", mirror: MIRROR });
});
after(async () => {
  await prohlizec?.close();
  await server?.zavri();
});

// mereni: odpověď na POST (objekt | { status, telo } | funkce); plan: úprava odpovědi plánovače (funkce nad JSON).
async function stranka({ cesta = "/holub-360/", sirka = 1440, vyska = 900, js = true, pohyb = "no-preference", mereni = MERENI, plan, pred, ocekavane = null, navrhStatus = 200 } = {}) {
  const ctx = await prohlizec.newContext({ viewport: { width: sirka, height: vyska }, javaScriptEnabled: js, reducedMotion: pohyb, hasTouch: sirka < 500, isMobile: sirka < 500 });
  kontexty.push(ctx);
  const venku = [], chyby = [], api = [];
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => { venku.push(r.request().url()); return r.abort(); });
  await ctx.route("**/api/cena-z-adresy**", async (r) => {
    const u = new URL(r.request().url());
    if (r.request().method() === "GET" && u.searchParams.has("navrh")) {
      if (navrhStatus !== 200) return r.fulfill({ status: navrhStatus, body: "" });
      const t = u.searchParams.get("navrh").toLowerCase();
      const navrhy = ["Lipová 12, 280 02 Kolín", "Lipová 14, 280 02 Kolín"].filter((a) => a.toLowerCase().startsWith(t.slice(0, 3))).map((adresa, i) => ({ kod: 21717718 + i, adresa }));
      return r.fulfill({ json: { navrhy } });
    }
    const odp = typeof mereni === "function" ? await mereni(r.request()) : mereni;
    if (odp && odp.status) return r.fulfill({ status: odp.status, json: odp.telo || {} });
    return r.fulfill({ json: odp });
  });
  if (plan) await ctx.route("**/api/planovac**", async (r) => {
    const puvodni = await r.fetch();
    return r.fulfill({ response: puvodni, json: plan(await puvodni.json()) });
  });
  if (pred) await pred(ctx);
  const p = await ctx.newPage();
  p.on("pageerror", (e) => chyby.push(e.message));
  // Chyby konzole jen ze stránky HOLUB 360. Písma a favicon jsou jen na produkci (mirror) – jejich 404 v testu
  // není chyba stránky; „ocekavane“ = adresy, které test schválně shodí (výpadek měření).
  p.on("console", (m) => {
    if (m.type() !== "error" || !new URL(p.url()).pathname.startsWith("/holub-360/")) return;
    const zdroj = m.location()?.url || "";
    if (/Failed to load resource/.test(m.text()) && (/\/assets\/fonts\/|favicon|apple-touch/.test(zdroj) || ocekavane?.test(zdroj))) return;
    chyby.push(`${m.text()} ${zdroj}`);
  });
  p.on("request", (r) => { const u = new URL(r.url()); if (u.pathname.startsWith("/api/")) api.push(`${r.method()} ${u.pathname}${u.search}`); });
  await p.goto(server.url + cesta, { waitUntil: "load" });
  if (js) await p.waitForSelector('body[data-h3a="pripraveno"]');
  return { p, ctx, venku, chyby, api };
}

async function zadejAdresu(p) {
  await p.click("#h3a-adresa-vstup");
  await p.type("#h3a-adresa-vstup", "Lip", { delay: 25 });
  await p.waitForSelector("#h3a-navrhy:not([hidden]) li[role=option]");
  assert.equal(await p.getAttribute("#h3a-adresa-vstup", "aria-expanded"), "true");
  await p.keyboard.press("ArrowDown");
  assert.equal(await p.getAttribute("#h3a-adresa-vstup", "aria-activedescendant"), "h3a-n0");
  await p.keyboard.press("Enter");
  await p.waitForSelector("#h3a-vysledek:not([hidden])");
}

async function axe(p, kde = "body") {
  await p.addScriptTag({ path: AXE });
  return p.evaluate(async (kde) => (await window.axe.run(kde, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }))
    .violations.filter((v) => v.impact === "serious" || v.impact === "critical")
    .map((v) => ({ id: v.id, impact: v.impact, cil: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) })), kde);
}

const ocekavana = (polozky, typObjektu = "rd") => jadro.spocitej({ polozky, typObjektu, lat: MERENI.poloha.lat, lon: MERENI.poloha.lon });

test("tok: adresa → plochy (odhad) → cena = cenové jádro → obálka → certifikát s podmínkami z dat", async () => {
  const { p, ctx, chyby, venku, api } = await stranka();
  assert.equal(await p.locator("h1").count(), 1);
  assert.equal(await p.getAttribute('link[rel="canonical"]', "href"), "https://hspg.cz/holub-360/");
  assert.equal(await p.getAttribute("#h3a-cta", "href"), "#h3a-adresa", "s JS vede CTA na adresu");
  await zadejAdresu(p);

  // Plochy z měření jako odhad; výšky, strany ani sousedé se nikde neukážou.
  assert.equal(await p.inputValue("#h3a-plocha-strecha"), "190");
  assert.equal(await p.inputValue("#h3a-plocha-fasada"), "340");
  assert.match(bezMezer(await p.textContent("#h3a-adresa-stav")), /Plochy jsou odhad/);
  assert.match(bezMezer(await p.textContent("#h3a-pudorys")), /odhad 150 m²/);
  assert.equal(bezMezer(await p.textContent("#h3a-licence")), "© ČÚZK");
  assert.match(bezMezer(await p.textContent("#h3a-model")), /Ilustrační model z obrysu, ne zaměření/);
  const text = bezMezer(await p.textContent("main"));
  assert.doesNotMatch(text, /9,4|6,1|21,4|model3d|hřeben domu|sousední/i);
  assert.doesNotMatch(text, EMBARGO);
  assert.match(text, /HOLUB CORE QUANTUM SENSE · zaměření na dálku/);

  // Cena podle jádra: cesta A, střecha 190 + fasáda 340, doprava z polohy.
  const a = ocekavana([{ povrch: "strecha", cesta: "A", plocha: 190 }, { povrch: "fasada", cesta: "A", plocha: 340 }]);
  await p.waitForSelector("#h3a-obalka:not([hidden])");
  assert.equal(Number(await p.getAttribute("#h3a-cena", "data-kc")), a.vysledna);
  assert.equal(cislo(await p.textContent("#h3a-cena")), a.vysledna);
  assert.equal(await p.locator("#h3a-radky tbody tr.h3a-radek").count(), a.radky.length);
  assert.equal(await p.isVisible("#h3a-certifikat"), false, "certifikát je zapečetěný");

  // Pečeť → certifikát (fokus na certifikát, aria-expanded).
  await p.click("#h3a-pecet");
  await p.waitForSelector("#h3a-certifikat:not([hidden])");
  assert.equal(await p.getAttribute("#h3a-pecet", "aria-expanded"), "true");
  await p.waitForFunction(() => document.activeElement?.id === "h3a-certifikat");
  const cert = bezMezer(await p.textContent("#h3a-certifikat"));
  assert.match(cert, /Orientační kalkulace HOLUB 360/);
  assert.match(cert, /Orientační cena · jednorázově/);
  assert.match(cert, /Orientační výpočet, ne nabídka\. Přesnou cenu potvrdíme po ověření rozsahu na místě\. Nejsme plátci DPH, DPH se nepřipočítává\./);
  assert.doesNotMatch(cert, /nabídk[ay] HOLUB|Osobní nabídka/, "kalkulace se nevydává za nabídku (§ 1732 OZ)");
  assert.match(cert, new RegExp(bezMezer(a.platba.text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(cert, /Záloha 0 Kč/);
  assert.doesNotMatch(cert, /Skip Pay/, "Skip Pay je v ceníku vypnutý");
  for (const t of SENTINEL.tarify) assert.match(cert, new RegExp(`${t.nazev}.*?${C.kc(t.cena_rok).replace(/\s/g, " ")} ročně`));
  assert.equal(bezMezer(await p.textContent("#h3a-zaruka")), bezMezer(`${SENTINEL.podminka_zaruky} Zákonná práva z vadného plnění tím nejsou dotčena.`));
  assert.equal(bezMezer(await p.textContent("#h3a-biocidy")), bezMezer(STANDARD.biocidy_veta));
  for (const k of STANDARD.kroky) assert.match(cert, new RegExp(`${k.cislo}\\s*${k.nazev}`));
  assert.match(cert, /Cesta A – Neviditelný štít/);
  assert.doesNotMatch(cert, EMBARGO);

  // Typografie (§4.9): částky s nezlomitelnými mezerami.
  assert.match(await p.textContent("#h3a-cena"), /\d\u00a0\d{3}\u00a0Kč/);

  assert.deepEqual(chyby, []);
  assert.deepEqual(venku, [], "stránka nevolá nic mimo vlastní web");
  assert.ok(!api.some((u) => /\/api\/(ai|asistent)/.test(u)), "tok nepotřebuje AI");
  assert.ok(api.some((u) => u.startsWith("GET /api/planovac?obec=Kol")), "plánovači jde jen obec");
  assert.ok(!api.some((u) => /planovac.*Lipov/.test(u)), "ulice ani číslo domu do plánovače nejdou");
  await ctx.close();
});

test("cesta B a odstín RAL: cena podle jádra, přebarvení modelu, dlažba jen cestou A", async () => {
  const { p, ctx, chyby } = await stranka();
  await zadejAdresu(p);
  await p.check('input[name="h3a-cesta"][value="B"]');
  await p.waitForSelector("#h3a-barvy-obal:not([hidden])");
  const ral = STANDARD.barvy_renovace.strecha.find((b) => b.ral === "RAL 7016");
  await p.check('input[name="h3a-ral-strecha"][value="RAL 7016"]', { force: true });
  const b = ocekavana([{ povrch: "strecha", cesta: "B", plocha: 190, barva: ral }, { povrch: "fasada", cesta: "B", plocha: 340 }]);
  await p.waitForFunction((x) => document.getElementById("h3a-cena")?.dataset.kc === String(x), b.vysledna);
  assert.equal(await p.getAttribute("#h3a-model", "data-cesta"), "B");
  assert.equal((await p.getAttribute("#h3a-model", "data-barva-strecha")).toLowerCase(), ral.hex.toLowerCase());
  assert.equal(await p.getAttribute("#h3a-model", "data-barva-fasada"), "");
  const radky = bezMezer(await p.textContent("#h3a-radky"));
  assert.match(radky, /Střecha – Cesta B – Barevná renovace/);
  assert.match(radky, /odstín RAL 7016 Antracitová šedá/);
  assert.match(radky, /Fasáda – Cesta B – Barevná renovace.*odstín určíte podle vzorníku/);
  assert.match(radky, /190 m² × 268 Kč/);

  // Dlažba se v cestě B počítá cestou A (ceník B pro dlažbu nemá).
  await p.fill("#h3a-plocha-dlazba", "60");
  const s = ocekavana([{ povrch: "strecha", cesta: "B", plocha: 190, barva: ral }, { povrch: "fasada", cesta: "B", plocha: 340 }, { povrch: "dlazba", cesta: "A", plocha: 60 }]);
  await p.waitForFunction((x) => document.getElementById("h3a-cena")?.dataset.kc === String(x), s.vysledna);
  assert.match(bezMezer(await p.textContent("#h3a-cesta-stav")), /Dlažbu ošetřujeme jen cestou A/);

  // Vlastní odstín platí pro povrch bez vybraného vzorku.
  await p.fill("#h3a-vlastni", "NCS S 1002-Y");
  await p.waitForFunction(() => /NCS S 1002-Y/.test((document.getElementById("h3a-radky")?.textContent || "").replace(/\u00a0/g, " ")));
  assert.deepEqual(chyby, []);
  await ctx.close();
});

test("kalendář 21 dní: šrafovaný technologicky nevhodný den nejde vybrat, zavřeno v neděli, rezervace do hspg-rezervace", async () => {
  let nevhodny = null;
  const plan = (j) => {
    // Plánovač s potvrzeným pravidlem R17: první volný den s předpovědí označíme jako nevhodný.
    j.technologickeOkno = { text: PRAVIDLO.text, pravdepodobnostSrazekMax: PRAVIDLO.pravdepodobnostSrazekMax, teplotaMin: PRAVIDLO.teplotaMin, pracovniDoba: PRAVIDLO.pracovniDoba };
    for (const d of j.dny) {
      d.okno = d.pocasi ? { od: 7, do: 19, pravdepodobnostMax: 10, teplotaMin: 9, nevhodne: false, duvody: [] } : null;
      if (!nevhodny && d.pracovni && d.volno !== false && d.pocasi) { nevhodny = d.datum; d.okno = { od: 7, do: 19, pravdepodobnostMax: 64, teplotaMin: 9, nevhodne: true, duvody: ["srazky"] }; }
    }
    return j;
  };
  const { p, ctx, chyby } = await stranka({ plan });
  await zadejAdresu(p);
  await p.waitForSelector("#h3a-kal .h3a-den");
  assert.equal(await p.locator("#h3a-kal .h3a-den").count(), 21);
  assert.ok(nevhodny, "v testovacích datech je nevhodný den");
  const srafa = p.locator(`#h3a-kal [data-datum="${nevhodny}"]`);
  assert.match(await srafa.getAttribute("class"), /apex-srafa/);
  assert.equal(await srafa.getAttribute("aria-disabled"), "true");
  assert.equal(await srafa.getAttribute("title"), C.typografie(PRAVIDLO.text));
  await srafa.click({ force: true }); // aria-disabled: klik projde, stránka den nevybere a řekne proč
  assert.equal(await p.inputValue("#h3a-f-termin"), "", "nevhodný den nejde vybrat");
  assert.equal(await srafa.getAttribute("aria-pressed"), "false");
  assert.match(bezMezer(await p.textContent("#h3a-kal-info")), /Technologicky nevhodný den/);
  // Neděle = zavřeno, nejde vybrat.
  const nedele = p.locator("#h3a-kal .h3a-den--zavreno").first();
  assert.match(await nedele.textContent(), /zavřeno/);
  await nedele.click({ force: true });
  assert.equal(await p.inputValue("#h3a-f-termin"), "");
  // Dny bez předpovědi: „předpověď upřesníme“; zdroj MET Norway podle CC BY 4.0.
  assert.ok((await p.locator("#h3a-kal .h3a-den", { hasText: "předpověď upřesníme" }).count()) > 0);
  assert.match(bezMezer(await p.textContent("#h3a-kal-zdroj")), /MET Norway.*CC BY 4\.0/);
  // Volný den jde vybrat a propíše se do rezervace.
  const volny = p.locator("#h3a-kal .h3a-den--volno").first();
  const datum = await volny.getAttribute("data-datum");
  await volny.click();
  assert.equal(await p.inputValue("#h3a-f-termin"), datum);
  assert.equal(await p.getAttribute(`#h3a-kal [data-datum="${datum}"]`, "aria-pressed"), "true");

  // Rezervace: stávající formulář hspg-rezervace (pole jako v plánovači), shrnutí HOLUB 360 v poznámce.
  await p.check('input[name="h3a-cesta"][value="B"]');
  await p.check('input[name="h3a-ral-strecha"][value="RAL 8004"]', { force: true });
  await p.fill("#h3a-f-tel", "+420 777 000 000");
  await p.fill("#h3a-f-jmeno", "Test HOLUB 360");
  await p.fill("#h3a-f-mail", "test@example.com");
  await p.check('input[name="Souhlas se zpracováním osobních údajů"]');
  const pred = server.formulare.length;
  await Promise.all([p.waitForURL("**/planovac/dekujeme/"), p.click("#h3a-odeslat")]);
  const f = server.formulare.slice(pred).at(-1);
  assert.equal(f["form-name"], "hspg-rezervace");
  assert.equal(f.Zdroj, "Web HSPG / HOLUB 360");
  assert.equal(f["Adresa objektu"], ADRESA);
  assert.equal(f.Obec, "Kolín");
  assert.equal(f["Termín"], datum);
  assert.equal(f["Služba"], "Plná renovace barevným nástřikem");
  assert.equal(f["Typ povrchu"], "Kombinace / nevím");
  assert.equal(f.Telefon, "+420 777 000 000");
  assert.match(f["Poznámka"], /^HOLUB 360: Orientační cena [\d ]+ Kč · Cesta B – Barevná renovace · Střecha 190 m² \(RAL 8004 Měděnohnědá \(cihlová\)\), Fasáda 340 m² · Rodinný dům · termín/);
  assert.equal(f._honey, "");
  assert.deepEqual(chyby, []);
  await ctx.close();
});

test("390 × 844: bez vodorovného posunu, vše ovladatelné; přístupnost (axe) bez vážných chyb", async () => {
  const { p, ctx, chyby } = await stranka({ sirka: 390, vyska: 844 });
  const posun = () => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.equal(await posun(), 0);
  assert.deepEqual(await axe(p), [], "úvod");
  await zadejAdresu(p);
  await p.click("#h3a-pecet");
  await p.waitForSelector("#h3a-certifikat:not([hidden])");
  await p.waitForSelector("#h3a-kal .h3a-den");
  assert.equal(await posun(), 0, "po měření, s certifikátem a kalendářem");
  for (const sel of ["#h3a-zmerit", "#h3a-plocha-strecha", 'label.h3a-cesta', "#h3a-odeslat"]) {
    const box = await p.locator(sel).first().boundingBox();
    assert.ok(box && box.width >= 24 && box.height >= 24 && box.x >= 0 && box.x + box.width <= 390, `${sel} se vejde a dá se trefit`);
  }
  assert.deepEqual(await axe(p), [], "s výsledkem, certifikátem a kalendářem");
  assert.deepEqual(chyby, []);
  await ctx.close();
});

test("přístupnost na šířku (axe) a ovládání klávesnicí: Tab na pečeť, Enter otevře certifikát", async () => {
  const { p, ctx, chyby } = await stranka();
  // Zlaté tlačítko-odkaz má tmavý text (axe kontrast na přechodu neumí ověřit): pravidlo pro odkazy ho nesmí přebít.
  assert.equal(await p.locator("#h3a-cta").evaluate((e) => getComputedStyle(e).color), "rgb(23, 18, 10)");
  await zadejAdresu(p);
  await p.check('input[name="h3a-cesta"][value="B"]');
  assert.deepEqual(await axe(p), []);
  await p.focus("#h3a-pecet");
  await p.keyboard.press("Enter");
  await p.waitForSelector("#h3a-certifikat:not([hidden])");
  assert.deepEqual(await axe(p, "#h3a-obalka"), []);
  assert.deepEqual(chyby, []);
  await ctx.close();
});

test("stavy: načítání, výpadek měření → ruční plochy, nepotvrzený ceník → žádná částka v Kč", async () => {
  let pust;
  const zdrzeni = new Promise((ok) => { pust = ok; });
  const { p, ctx, chyby } = await stranka({ ocekavane: /\/api\/cena-z-adresy/, mereni: async () => { await zdrzeni; return { status: 503, telo: { chyba: "Mapové služby neodpovídají" } }; } });
  await p.click("#h3a-adresa-vstup");
  await p.type("#h3a-adresa-vstup", "Lip", { delay: 25 });
  await p.waitForSelector("#h3a-navrhy li[role=option]");
  await p.click("#h3a-navrhy li[role=option] >> nth=0");
  await p.waitForFunction(() => /Měříme na dálku/.test(document.getElementById("h3a-adresa-stav").textContent));
  pust();
  await p.waitForFunction(() => /Měření teď není dostupné/.test(document.getElementById("h3a-adresa-stav").textContent));
  assert.equal(await p.isVisible("#h3a-vysledek"), true, "nabídne ruční zadání ploch");
  assert.equal(await p.isVisible("#h3a-model"), false, "bez obrysu žádný model");
  await p.fill("#h3a-plocha-strecha", "120");
  await p.waitForSelector("#h3a-cena", { state: "attached" });
  assert.equal(Number(await p.getAttribute("#h3a-cena", "data-kc")), jadro.spocitej({ polozky: [{ povrch: "strecha", cesta: "A", plocha: 120 }], typObjektu: "rd" }).vysledna);
  assert.deepEqual(chyby, []);
  await ctx.close();

  // Ceník bez potvrzení → stránka neukáže žádnou částku v Kč (úkol 27).
  // (jádro čte nejdřív balíček assets/hspg-cenik.json, záložně content/*.json – bez potvrzení v obou)
  const bez = await stranka({
    ocekavane: /hspg-cenik\.json|cenik-potvrzeni\.json/,
    pred: async (c) => {
      await c.route("**/assets/hspg-cenik.json", (r) => r.fulfill({ status: 404, body: "" }));
      await c.route("**/content/cenik-potvrzeni.json", (r) => r.fulfill({ status: 404, body: "" }));
    },
  });
  await zadejAdresu(bez.p);
  await bez.p.waitForSelector("#h3a-obalka:not([hidden])");
  await bez.p.click("#h3a-pecet");
  await bez.p.waitForSelector("#h3a-certifikat:not([hidden])");
  for (const sel of ["#h3a-vysledek", "#h3a-cesta", "#h3a-obalka"]) assert.doesNotMatch(await bez.p.textContent(sel), /Kč/, sel);
  assert.match(bezMezer(await bez.p.textContent("#h3a-certifikat")), /Cenu vám pošleme do 24 hodin/);
  assert.deepEqual(bez.chyby, []);
  await bez.ctx.close();

  // Služba měření na webu ještě není (404): tlačítko „Změřit“ nabídne ruční plochy, nic se nezasekne.
  const nic = await stranka({ navrhStatus: 404, ocekavane: /cena-z-adresy/ });
  await nic.p.fill("#h3a-adresa-vstup", "Lipová 12, 280 02 Kolín");
  await nic.p.click("#h3a-zmerit");
  await nic.p.waitForFunction(() => /Měření teď není dostupné/.test(document.getElementById("h3a-adresa-stav").textContent));
  assert.equal(await nic.p.isVisible("#h3a-plocha-strecha"), true);
  assert.equal(await nic.p.inputValue("#h3a-f-adresa"), "Lipová 12, 280 02 Kolín");
  await nic.p.waitForSelector("#h3a-kal .h3a-den");
  assert.deepEqual(nic.chyby, []);
});

test("ukázka ?ukazka=1: štítek UKÁZKA, smyšlený dům, rezervace se neodešle", async () => {
  const { p, ctx, chyby, api } = await stranka({ cesta: "/holub-360/?ukazka=1" });
  await p.waitForSelector("#h3a-vysledek:not([hidden])");
  assert.equal(await p.isVisible("#h3a-ukazka-stitek"), true);
  assert.match(await p.textContent("#h3a-ukazka-stitek"), /UKÁZKA/);
  assert.ok(!api.some((u) => u.includes("cena-z-adresy")), "ukázka nic neměří");
  await p.click("#h3a-pecet");
  await p.waitForSelector("#h3a-certifikat:not([hidden])");
  assert.match(await p.textContent("#h3a-certifikat"), /UKÁZKA/);
  await p.fill("#h3a-f-adresa", "Ukázková 1, Praha");
  await p.fill("#h3a-f-tel", "+420 777 000 000");
  await p.check('input[name="Souhlas se zpracováním osobních údajů"]');
  const pred = server.formulare.length;
  await p.click("#h3a-odeslat");
  await p.waitForFunction(() => /V\s+ukázce se rezervace neodesílá/.test(document.getElementById("h3a-form-stav").textContent));
  assert.equal(server.formulare.length, pred, "ukázka nic neodeslala");
  assert.deepEqual(chyby, []);
  await ctx.close();
});

test("omezení pohybu: statický obraz místo průletu, bez kapek; bez JavaScriptu formulář, adresa firmy, telefon a odkazy", async () => {
  const { p, ctx, chyby } = await stranka({ pohyb: "reduce" });
  await p.waitForTimeout(2500);
  assert.equal(await p.isVisible("#h3a-plakat"), true);
  assert.equal(await p.locator("#holub-360-hero-viewport canvas").count(), 0, "žádné WebGL v hero");
  assert.equal(await p.locator(".h3a-kapky-vrstva").count(), 0, "kapky vypnuté");
  assert.equal(await p.isVisible("#h3a-kapky-tip"), false);
  assert.deepEqual(chyby, []);
  await ctx.close();

  const bez = await stranka({ js: false });
  const q = bez.p;
  assert.equal(await q.isVisible("#h3a-form"), true);
  assert.equal(await q.getAttribute("#h3a-form", "name"), "hspg-rezervace");
  assert.equal(await q.getAttribute("#h3a-form", "action"), "/planovac/dekujeme/");
  assert.equal(await q.isVisible("#h3a-f-adresa"), true);
  assert.equal(await q.isVisible("#h3a-f-tel"), true);
  assert.equal(await q.isVisible("#h3a-adresa-karta"), false, "měření bez JS skryté");
  assert.equal(await q.getAttribute("#h3a-cta", "href"), "#h3a-rezervace");
  const html = await q.content();
  assert.match(html, /<noscript>[\s\S]*href="\/akce\/"[\s\S]*href="\/planovac\/"/);
  const pata = bezMezer(await q.textContent("footer"));
  assert.match(pata, /Pernerova 10\/32, 186 00 Praha 8 – Karlín/);
  assert.match(pata, /\+420 736 618 486/);
  assert.equal(await q.locator('footer a[href="/akce/"]').count(), 1);
  assert.equal(await q.locator('footer a[href="/planovac/"]').count(), 1);
  await bez.ctx.close();
});

test("zdroj stránky: bez embarga slov, bez H-BIO, bez CDN, Three.js z vlastní kopie, adaptér měření nečte zakázaná pole", async () => {
  const soubory = ["holub-360/index.html", "assets/holub360-apex.js", "assets/holub360-scena.js", "assets/hspg-kapky.js", "assets/holub360-apex.css"];
  for (const s of soubory) {
    const t = readFileSync(new URL(s, WEB), "utf8");
    assert.doesNotMatch(t, /letecké mapy|satelitní snímky|Google Maps|katastr|RÚIAN|H-BIO|certifikovan|\+8,4|open-meteo/i, s);
    assert.doesNotMatch(t, /cdn\.jsdelivr|unpkg\.com|cdnjs|googleapis|gstatic|esm\.sh|skypack/i, s);
  }
  const scena = readFileSync(new URL("assets/holub360-scena.js", WEB), "utf8");
  assert.match(scena, /from "\.\/vendor\/three\/three\.module\.min\.js"/);
  assert.match(readFileSync(new URL("assets/vendor/three/OrbitControls.js", WEB), "utf8"), /from '\.\/three\.module\.min\.js'/);
  assert.match(readFileSync(new URL("assets/vendor/three/LICENSE", WEB), "utf8"), /MIT License/);
  const kontroler = readFileSync(new URL("assets/holub360-apex.js", WEB), "utf8");
  assert.doesNotMatch(kontroler, /\.(vysky|model3d|strany|sousede)\b/, "adaptér nečte výšky, model3d, strany ani sousedy");
  // Adaptér v prohlížeči: obrys v GeoJSON i v metrech, licence jen jako ustálené značky.
  const { p, ctx } = await stranka();
  const v = await p.evaluate(async () => {
    const m = await import("/assets/holub360-apex.js");
    const geo = m.normalizujMereni({ stav: "hotovo", adresa: "Na Výsluní 3, 252 41 Dolní Břežany", plochy: { strecha: { plocha: 101.26 }, fasada: 210 },
      obrys: { type: "Polygon", coordinates: [[[14.45, 49.96], [14.4502, 49.96], [14.4502, 49.9601], [14.45, 49.9601], [14.45, 49.96]]] }, zdroje: ["OpenStreetMap"] });
    const metry = m.normalizujMereni({ stav: "hotovo", plochy: { strecha: 80, fasady: 150 }, obrys: { jednotka: "m", body: [[0, 0], [10, 0], [10, 8], [0, 8]] } }, { adresa: "Polní 5, 466 01 Jablonec nad Nisou" });
    return { geo, metry, vyber: m.normalizujMereni({ stav: "vyber", kandidati: [{ adresa: "A 1, Praha", kod: 1 }] }), obec: m.obecZAdresy("Lipová 12, 280 02 Kolín, Česko") };
  });
  assert.deepEqual(v.geo.plochy, { strecha: 101.3, fasada: 210, pudorys: null });
  assert.equal(v.geo.obrys.length, 4);
  assert.deepEqual(v.geo.licence, ["© přispěvatelé OpenStreetMap"]);
  assert.ok(Math.abs(v.geo.poloha.lat - 49.96005) < 1e-4 && Math.abs(v.geo.poloha.lon - 14.4501) < 1e-4);
  assert.deepEqual(v.geo.obec, { obec: "Dolní Břežany", okres: null });
  assert.equal(v.metry.poloha, null);
  assert.deepEqual(v.metry.obrys.map(([x, y]) => [x, y]), [[-5, -4], [5, -4], [5, 4], [-5, 4]]);
  assert.deepEqual(v.metry.obec, { obec: "Jablonec nad Nisou", okres: null });
  assert.equal(v.vyber.stav, "vyber");
  assert.deepEqual(v.obec, { obec: "Kolín", okres: null });
  await ctx.close();
});

test("nové měření, které selže (429), nenechá plochy ani adresu předchozího domu", async () => {
  let volani = 0;
  const { p, ctx, chyby } = await stranka({ mereni: () => (++volani === 1 ? MERENI : { status: 429 }), ocekavane: /cena-z-adresy/ });
  await zadejAdresu(p);
  await p.waitForFunction(() => document.getElementById("h3a-plocha-strecha").value !== "");
  await p.fill("#h3a-adresa-vstup", "");
  await p.type("#h3a-adresa-vstup", "Lip", { delay: 25 });
  await p.waitForSelector("#h3a-navrhy:not([hidden]) li[role=option]");
  await p.keyboard.press("ArrowDown");
  await p.keyboard.press("ArrowDown");
  await p.keyboard.press("Enter");
  await p.waitForFunction(() => document.getElementById("h3a-f-adresa").value.includes("Lipová 14"));
  assert.equal(volani, 2);
  assert.equal(await p.inputValue("#h3a-plocha-strecha"), "", "plocha střechy předchozího domu zmizela");
  assert.equal(await p.inputValue("#h3a-plocha-fasada"), "");
  assert.equal(await p.isVisible("#h3a-model"), false, "model předchozího domu se neukazuje");
  assert.deepEqual(chyby, []);
  await ctx.close();
});
