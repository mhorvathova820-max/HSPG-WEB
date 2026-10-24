// E2E: stránka /standard-holub/ (úkol 50) ve skutečném Chromiu – vygenerovaná z content/*.json.
// Soubory živého webu, které balíček nemá (písma, logo, kontakt.js, souhlas.js), se bez HSPG_MIRROR doplní prázdné.
// Spuštění:  CHROMIUM=/opt/pw-browsers/chromium node --test balicek/testy/e2e/standard-holub.test.mjs
// Snímky:    PDT_SNIMKY=<složka> (1440 × 900 a 390 × 844)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { chromium } from "playwright";
import { spustServer } from "../server.mjs";

const require = createRequire(import.meta.url);
const AXE = require.resolve("axe-core/axe.min.js");
const json = (s) => JSON.parse(readFileSync(new URL(`../../web/content/${s}.json`, import.meta.url), "utf8"));
const STANDARD = json("standard"), SENTINEL = json("sentinel"), CENY = json("ceny");
const SNIMKY = process.env.PDT_SNIMKY || null;
const ZIVY_WEB = /\/(?:assets\/(?:kontakt\.js|souhlas\.js|fonts\/[\w.-]+|v\/[\w.-]+|favicon-\d+\.png|apple-touch-icon\.png|og\.png)|manifest\.webmanifest)$/;
const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const mezery = (t) => String(t).replace(/[\s ]+/g, " ").trim();
let prohlizec;
const servery = [];

before(async () => { prohlizec = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined }); });
after(async () => { await prohlizec?.close(); await Promise.all(servery.map((s) => s.zavri())); });

async function stranka({ sirka = 1440, vyska = 900, ctxVolby = {} } = {}) {
  const s = await spustServer({ rezim: "bez-ai" });
  servery.push(s);
  const ctx = await prohlizec.newContext({ viewport: { width: sirka, height: vyska }, ...ctxVolby });
  const ven = [];
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => { ven.push(r.request().url()); return r.abort(); });
  if (!process.env.HSPG_MIRROR) {
    await ctx.route(ZIVY_WEB, (r) => {
      const u = r.request().url();
      if (/\.(png|webp)$/.test(u)) return r.fulfill({ status: 200, contentType: "image/png", body: PIXEL });
      return r.fulfill({ status: 200, contentType: /\.js$/.test(u) ? "text/javascript" : /\.woff2$/.test(u) ? "font/woff2" : "application/json", body: /manifest/.test(u) ? "{}" : "" });
    });
  }
  const p = await ctx.newPage();
  const chyby = [];
  p.on("pageerror", (e) => chyby.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to decode downloaded font|OTS parsing error/.test(m.text())) chyby.push(m.text()); });
  await p.goto(s.url + "/standard-holub/", { waitUntil: "load" });
  return { p, chyby, ven };
}

async function axe(p, kde) {
  if (!(await p.evaluate(() => !!window.axe))) await p.addScriptTag({ path: AXE });
  const v = await p.evaluate(async () => (await window.axe.run("main")).violations.map((x) => ({ id: x.id, impact: x.impact, n: x.nodes.length })));
  assert.deepEqual(v.filter((x) => x.impact === "serious" || x.impact === "critical"), [], kde + " " + JSON.stringify(v));
}

test("desktop 1440: postup, cesty, odstíny a SENTINEL z dat; bez chyb a bez volání ven; axe", async () => {
  const { p, chyby, ven } = await stranka();
  const t = mezery(await p.textContent("main"));
  assert.equal(await p.locator(".sh-krok").count(), STANDARD.kroky.length);
  for (const k of STANDARD.kroky) assert.ok(t.includes(k.nazev), k.nazev);
  assert.ok(t.includes(`střecha ${CENY.ochrana_hstone.roof} Kč/m²`), "sazba cesty A");
  assert.ok(t.includes(`fasáda ${CENY.renovace_color.facade} Kč/m²`), "sazba cesty B");
  assert.equal(await p.locator(".sh-tarif").count(), SENTINEL.tarify.length);
  assert.ok(t.includes("Zákonná práva z vadného plnění tím nejsou dotčena."));
  assert.equal(await p.locator(".sh-vzorek").count(), STANDARD.barvy_renovace.strecha.length + STANDARD.barvy_renovace.fasada.length);
  // Vzorník: barva kruhu je přesně hex z dat.
  const prvni = STANDARD.barvy_renovace.strecha[0].hex;
  const barva = await p.locator(".sh-vzorek").first().evaluate((e) => getComputedStyle(e).backgroundColor);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(prvni.slice(i, i + 2), 16));
  assert.equal(barva, `rgb(${r}, ${g}, ${b})`);
  // Písmo nadpisu a tmavé pozadí Apex.
  assert.equal(await p.evaluate(() => getComputedStyle(document.body).backgroundColor), "rgb(5, 7, 15)");
  await axe(p, "desktop");
  if (SNIMKY) await p.screenshot({ path: `${SNIMKY}/standard-1440.png`, fullPage: true });
  assert.deepEqual(ven, [], "nic mimo web");
  assert.deepEqual(chyby, []);
});

test("„Spočítat cenu hned“ otevře kalkulaci H-BOTa (bez odchodu na /akce/)", async () => {
  const { p, chyby } = await stranka();
  await p.waitForSelector("#hbot-btn");
  await p.click(".sh-uvod [data-hbot-cena]");
  await p.waitForSelector("#hbot label[for=hn-typ-rd]");
  assert.equal(new URL(p.url()).pathname, "/standard-holub/");
  assert.deepEqual(chyby, []);
});

test("mobil 390 × 844: bez vodorovného posunu, cíle dotyku ≥ 44 px, axe bez vážných chyb", async () => {
  const { p, chyby } = await stranka({ sirka: 390, vyska: 844, ctxVolby: { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } });
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "vodorovný posun");
  for (const box of await p.locator("main .apex-tlacitko").evaluateAll((el) => el.map((e) => e.getBoundingClientRect().height))) assert.ok(box >= 44, `tlačítko ${box} px`);
  await axe(p, "mobil");
  if (SNIMKY) await p.screenshot({ path: `${SNIMKY}/standard-390.png`, fullPage: true });
  assert.deepEqual(chyby, []);
});

test("omezení pohybu: tekuté zlato stojí, stránka funguje", async () => {
  const { p, chyby } = await stranka({ ctxVolby: { reducedMotion: "reduce" } });
  assert.equal(await p.locator(".sh-nadpis .apex-zlaty-text").evaluate((e) => getComputedStyle(e).animationName), "none");
  assert.deepEqual(chyby, []);
});
