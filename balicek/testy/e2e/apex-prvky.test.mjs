// E2E: ukázka prvků Apex (úkol 57) ve skutečném Chromiu – balicek/navrhy/apex-prvky/index.html.
// Stránka je statická (jen apex-tokens.css + apex-prvky.css), proto ji servíruje malý souborový server
// nad složkou balicek/ (žádné /api, žádná AI). Nic nejde ven – cizí adresy se blokují a hlídají.
// Spuštění:  CHROMIUM=/opt/pw-browsers/chromium node --test balicek/testy/e2e/apex-prvky.test.mjs
// Snímky:    PDT_SNIMKY=<složka> (1440 × 900 a 390 × 844)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { createRequire } from "node:module";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const AXE = require.resolve("axe-core/axe.min.js");
const KOREN = fileURLToPath(new URL("../../", import.meta.url)); // složka balicek/
const TYPY = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".md": "text/markdown; charset=utf-8", ".json": "application/json" };
const SNIMKY = process.env.PDT_SNIMKY || null;
const TRIDY = ["ap-tlacitko", "ap-tlacitko-obrys", "ap-prepinac", "ap-fajfka", "ap-srdce", "ap-nit", "ap-karta",
  "ap-napoveda", "ap-segment", "ap-volba-seznam", "ap-pole", "ap-puls"];
let prohlizec, server, url;

before(async () => {
  server = http.createServer(async (req, res) => {
    try {
      let cesta = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      if (cesta.endsWith("/")) cesta += "index.html";
      const soubor = join(KOREN, normalize(cesta));
      if (!soubor.startsWith(KOREN) || !(await stat(soubor).then((s) => s.isFile(), () => false))) {
        res.writeHead(404, { "content-type": "text/plain" });
        return res.end("404");
      }
      res.writeHead(200, { "content-type": TYPY[extname(soubor)] || "application/octet-stream" });
      res.end(await readFile(soubor));
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  url = `http://127.0.0.1:${server.address().port}/navrhy/apex-prvky/index.html`;
  prohlizec = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
});
after(async () => {
  await prohlizec?.close();
  await new Promise((ok) => { server.close(ok); server.closeAllConnections?.(); });
});

async function stranka({ sirka = 1440, vyska = 900, ctxVolby = {} } = {}) {
  const ctx = await prohlizec.newContext({ viewport: { width: sirka, height: vyska }, ...ctxVolby });
  const ven = [];
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => { ven.push(r.request().url()); return r.abort(); });
  const p = await ctx.newPage();
  const chyby = [];
  p.on("pageerror", (e) => chyby.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") chyby.push(m.text()); });
  const odpovedi = [];
  p.on("response", (r) => odpovedi.push([r.url(), r.status()]));
  await p.goto(url, { waitUntil: "load" });
  return { p, ctx, chyby, ven, odpovedi };
}

async function axe(p, kde = "body") {
  await p.addScriptTag({ path: AXE });
  return p.evaluate(async (kde) => (await window.axe.run(kde, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"] } }))
    .violations.map((v) => ({ id: v.id, impact: v.impact, cil: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) })), kde);
}

// Výška cíle: u přístupně skrytého vstupu (1 px) se měří jeho popisek (skutečný cíl dotyku).
const VYSKY_CILU = () => [...document.querySelectorAll("button, input, select, textarea, a[class*='ap-'], label[class*='ap-']:not(.ap-pole__popisek)")]
  .map((e) => {
    let cil = e;
    if (e instanceof HTMLInputElement && e.getBoundingClientRect().width <= 1) cil = e.labels?.[0] || e.closest("label") || e;
    const r = cil.getBoundingClientRect();
    return { popis: (e.id || e.className || e.tagName).toString().slice(0, 40), vyska: r.height, sirka: r.width, viditelny: r.width > 0 && r.height > 0 };
  });

test("desktop 1440: styly se načetly, všech 12 prvků je na stránce, bez chyb, nic nejde ven, axe 0 chyb", async () => {
  const { p, chyby, ven, odpovedi } = await stranka();
  for (const [u, status] of odpovedi) assert.equal(status, 200, u);
  assert.ok(odpovedi.some(([u]) => u.endsWith("/web/assets/apex-prvky.css")), "apex-prvky.css");
  assert.ok(odpovedi.some(([u]) => u.endsWith("/web/assets/apex-tokens.css")), "apex-tokens.css");
  assert.equal(await p.evaluate(() => getComputedStyle(document.body).backgroundColor), "rgb(5, 7, 15)", "pozadí Apex");
  for (const t of TRIDY) assert.ok((await p.locator(`.${t}`).count()) >= 1, `prvek ${t}`);
  // Token zlata se propsal do prvku (jezdec segmentu = zlatý přechod, text vybrané volby tmavý).
  assert.equal(await p.locator("#cesta-a + label").evaluate((e) => getComputedStyle(e).color), "rgb(5, 7, 15)");
  assert.match(await p.locator(".ap-segment__jezdec").first().evaluate((e) => getComputedStyle(e).backgroundImage), /rgb\(212, 175, 55\)/);
  assert.equal(await p.locator(".ap-puls--aktivni").count(), 0, "nic nepulzuje při načtení");
  const v = await axe(p);
  assert.deepEqual(v, [], "axe " + JSON.stringify(v));
  if (SNIMKY) await p.screenshot({ path: `${SNIMKY}/apex-prvky-1440.png`, fullPage: true });
  assert.deepEqual(ven, [], "nic mimo web (CDN, písma)");
  assert.deepEqual(chyby, []);
});

test("cíle dotyku: každé tlačítko, vstup a popisek skrytého vstupu má výšku ≥ 44 px (1440 i 390)", async () => {
  for (const [sirka, vyska, ctxVolby] of [[1440, 900, {}], [390, 844, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
    const { p, chyby } = await stranka({ sirka, vyska, ctxVolby });
    const cile = (await p.evaluate(VYSKY_CILU)).filter((c) => c.viditelny);
    assert.ok(cile.length >= 40, `${sirka}: změřeno ${cile.length} cílů`);
    for (const c of cile) assert.ok(c.vyska >= 44, `${sirka}: ${c.popis} má ${c.vyska} px`);
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${sirka}: vodorovný posun`);
    assert.deepEqual(chyby, []);
  }
});

test("mobil 390 × 844: bez vodorovného posunu, segment a pole na 100 %, axe 0 chyb", async () => {
  const { p, chyby } = await stranka({ sirka: 390, vyska: 844, ctxVolby: { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } });
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "vodorovný posun");
  const [segment, obal] = await p.locator("#segment .ap-segment").first().evaluate((e) => [e.getBoundingClientRect().width, e.parentElement.getBoundingClientRect().width]);
  assert.ok(Math.abs(segment - obal) < 1, `segment ${segment} px z ${obal} px`);
  const [pole, obalPole] = await p.locator("#adresa").evaluate((e) => [e.getBoundingClientRect().width, e.parentElement.getBoundingClientRect().width]);
  assert.ok(Math.abs(pole - obalPole) < 1, `pole ${pole} px z ${obalPole} px`);
  const v = await axe(p);
  assert.deepEqual(v, [], "axe " + JSON.stringify(v));
  if (SNIMKY) await p.screenshot({ path: `${SNIMKY}/apex-prvky-390.png`, fullPage: true });
  assert.deepEqual(chyby, []);
});

test("klávesnice: Tab dojde na první ap-tlacitko a ukáže zlatý obrys 2 px; mezerník přepne přepínač", async () => {
  const { p, chyby } = await stranka();
  let kroky = 0;
  do {
    await p.keyboard.press("Tab");
    kroky++;
  } while (!(await p.evaluate(() => document.activeElement?.classList.contains("ap-tlacitko"))) && kroky < 40);
  assert.ok(kroky < 40, "Tab nedošel na ap-tlacitko");
  const fokus = await p.evaluate(() => {
    const e = document.activeElement, s = getComputedStyle(e);
    return { prvni: e === document.querySelector(".ap-tlacitko"), text: e.textContent.trim(), outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, outlineColor: s.outlineColor, outlineOffset: s.outlineOffset };
  });
  assert.equal(fokus.prvni, true, "první ap-tlacitko");
  assert.equal(fokus.text, "Zaměřit na dálku");
  assert.equal(fokus.outlineStyle, "solid");
  assert.equal(fokus.outlineWidth, "2px");
  assert.equal(fokus.outlineColor, "rgb(246, 231, 168)");
  assert.equal(fokus.outlineOffset, "3px");
  // Přepínač: fokus jde na skrytý vstup, obrys ukáže dráha; mezerník přepne stav.
  await p.focus(".ap-prepinac__vstup");
  await p.keyboard.press("Space");
  assert.equal(await p.locator(".ap-prepinac__vstup").first().isChecked(), false);
  await p.keyboard.press("Space");
  assert.equal(await p.locator(".ap-prepinac__vstup").first().isChecked(), true);
  await p.keyboard.press("Tab"); // pryč a zpět, ať je fokus z klávesnice (:focus-visible)
  await p.keyboard.press("Shift+Tab");
  const draha = await p.locator(".ap-prepinac__vstup ~ .ap-prepinac__draha").first().evaluate((e) => getComputedStyle(e).outlineWidth + " " + getComputedStyle(e).outlineColor);
  assert.equal(draha, "2px rgb(246, 231, 168)", "obrys dráhy přepínače");
  // Segment: šipka doprava vybere další volbu a jezdec se posune.
  await p.focus("#cesta-a");
  await p.keyboard.press("ArrowRight");
  assert.equal(await p.locator("#cesta-b").isChecked(), true);
  assert.match(await p.locator("#segment .ap-segment__jezdec").first().evaluate((e) => getComputedStyle(e).transform), /^matrix\(1, 0, 0, 1, (\d+(?:\.\d+)?), 0\)$/);
  assert.deepEqual(chyby, []);
});

test("puls: po akci se spustí nejvýš 3×, při omezení pohybu vůbec; nit při omezení pohybu stojí", async () => {
  const { p, chyby } = await stranka();
  assert.equal(await p.locator("#uk-puls-cil").evaluate((e) => getComputedStyle(e).animationName), "none", "před akcí");
  await p.click("#uk-puls-spustit");
  const puls = await p.locator("#uk-puls-cil").evaluate((e) => ({ trida: e.classList.contains("ap-puls--aktivni"), nazev: getComputedStyle(e).animationName, pocet: getComputedStyle(e).animationIterationCount }));
  assert.deepEqual(puls, { trida: true, nazev: "ap-puls-vlna", pocet: "3" });
  assert.equal(await p.locator(".ap-nit").first().evaluate((e) => getComputedStyle(e).animationName), "ap-nit-otaceni");
  assert.deepEqual(chyby, []);

  const r = await stranka({ ctxVolby: { reducedMotion: "reduce" } });
  await r.p.click("#uk-puls-spustit");
  const omezeny = await r.p.locator("#uk-puls-cil").evaluate((e) => ({ trida: e.classList.contains("ap-puls--aktivni"), nazev: getComputedStyle(e).animationName, pocet: getComputedStyle(e).animationIterationCount }));
  assert.equal(omezeny.trida, true, "třída je, ale animace ne");
  assert.ok(omezeny.nazev === "none" || omezeny.pocet === "0", `puls při omezení pohybu: ${JSON.stringify(omezeny)}`);
  assert.equal(await r.p.locator(".ap-nit").first().evaluate((e) => getComputedStyle(e).animationName), "none", "nit stojí");
  assert.equal(await r.p.locator(".ap-segment__jezdec").first().evaluate((e) => getComputedStyle(e).transitionDuration), "0s", "bez přechodů");
  assert.deepEqual(r.chyby, []);
});

test("vysvětlivka: skrytá, po najetí i po fokusu viditelná, tooltip je popisem tlačítka; srdce a pole fungují", async () => {
  const { p, chyby } = await stranka();
  const obsah = p.locator("#np-hreben");
  assert.equal(await obsah.evaluate((e) => getComputedStyle(e).visibility), "hidden");
  await p.hover("#napoveda .ap-napoveda__bod >> nth=0");
  await p.waitForFunction(() => getComputedStyle(document.getElementById("np-hreben")).visibility === "visible");
  assert.equal(await p.locator("#napoveda .ap-napoveda__bod >> nth=0").getAttribute("aria-describedby"), "np-hreben");
  assert.equal(await obsah.getAttribute("role"), "tooltip");
  await p.mouse.move(0, 0);
  await p.focus("#napoveda .ap-napoveda__bod >> nth=2");
  await p.waitForFunction(() => getComputedStyle(document.getElementById("np-sklon")).visibility === "visible");
  // Srdce: zaškrtnutí vyplní srdce (opacity 1), název pro čtečku je „Uložit odstín RAL 9001“.
  assert.equal(await p.locator("#ral-9001").getAttribute("aria-label"), "Uložit odstín RAL 9001");
  await p.click("#ral-9001 ~ .ap-srdce__ikony");
  assert.equal(await p.locator("#ral-9001").isChecked(), true);
  await p.waitForFunction(() => getComputedStyle(document.querySelector("#ral-9001 ~ .ap-srdce__ikony .ap-srdce__plne")).opacity === "1");
  // Pole: popisek vypluje po zadání textu (i bez fokusu), ne před ním.
  const popisek = p.locator('label[for="adresa"]');
  assert.equal(await popisek.evaluate((e) => getComputedStyle(e).transform), "none");
  await p.fill("#adresa", "Stavební 1066, Hradec Králové");
  await p.locator("body").click({ position: { x: 5, y: 5 } });
  await p.waitForFunction(() => { const s = getComputedStyle(document.querySelector('label[for="adresa"]')); return s.transform !== "none" && s.color === "rgb(212, 175, 55)"; }, null, { timeout: 3000 });
  assert.equal(await p.locator("#adresa").evaluate((e) => document.activeElement === e), false, "popisek zůstal nahoře i bez fokusu");
  assert.deepEqual(chyby, []);
});
