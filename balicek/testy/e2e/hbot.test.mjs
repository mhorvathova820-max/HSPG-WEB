// E2E: plovoucí asistent na kopii živého webu ve skutečném Chromiu.
// Spuštění: HSPG_MIRROR=/cesta/k/mirror/hspg.cz CHROMIUM=/opt/pw-browsers/chromium npm run test:e2e
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { spustServer } from "../server.mjs";
import { HESLO } from "../pomocne.mjs";

const require = createRequire(import.meta.url);
const AXE = require.resolve("axe-core/axe.min.js");
let prohlizec;
const servery = [];

before(async () => {
  prohlizec = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
});
after(async () => {
  await prohlizec?.close();
  await Promise.all(servery.map((s) => s.zavri()));
});

async function stranka(rezim, { sirka = 1280, vyska = 800, cesta = "/cenik.html" } = {}) {
  const s = await spustServer({ rezim });
  servery.push(s);
  const ctx = await prohlizec.newContext({ viewport: { width: sirka, height: vyska } });
  // Externí služby (GTM, Clarity, videa) test nepotřebuje.
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  const p = await ctx.newPage();
  const chyby = [];
  p.on("pageerror", (e) => chyby.push(e.message));
  const pozadavky = [];
  p.on("request", (r) => pozadavky.push(r.url()));
  await p.goto(s.url + cesta, { waitUntil: "domcontentloaded" });
  return { p, s, chyby, pozadavky };
}

test("panel se načte až při zájmu – první načtení stránky ho nestahuje", async () => {
  const { p, pozadavky, chyby } = await stranka("ai");
  await p.waitForSelector("#hbot-btn");
  await p.waitForTimeout(300);
  assert.ok(!pozadavky.some((u) => u.includes("hbot-panel.js")), "hbot-panel.js se nesmí stahovat hned");
  assert.ok(!pozadavky.some((u) => u.includes("/api/")), "žádné API volání při načtení");
  assert.deepEqual(chyby, []);
});

test("zákazník bez AI: rychlá otázka odpoví z FAQ, Escape zavře a vrátí fokus", async () => {
  const { p, chyby } = await stranka("bez-ai");
  await p.click("#hbot-btn");
  await p.waitForSelector("#hbot:not([hidden]) .hb-chip");
  assert.equal(await p.getAttribute("#hbot-btn", "aria-expanded"), "true");
  assert.equal(await p.locator("#hbot .hb-info").count(), 0, "bez AI se nezobrazuje upozornění o AI");
  assert.equal(await p.isVisible("#hb-tab-m"), false, "záložka majitele není bez přihlášení vidět");
  await p.click("#hbot .hb-chip >> text=Kolik to stojí?");
  await p.waitForSelector("#hbot .hb-msg >> text=/střecha od \\d+ Kč/");
  await p.keyboard.press("Escape");
  assert.equal(await p.isHidden("#hbot"), true);
  assert.equal(await p.evaluate(() => document.activeElement.id), "hbot-btn");
  assert.deepEqual(chyby, []);
});

test("zákazník bez AI: vlastní otázka → FAQ; neznámá otázka → zavolání zpět s validací a odesláním", async () => {
  const { p, s } = await stranka("bez-ai");
  await p.click("#hbot-btn");
  await p.waitForSelector("#hbot .hb-chip");
  await p.fill("#hb-q", "potřebujete lešení?");
  await p.press("#hb-q", "Enter");
  await p.waitForSelector("#hbot .hb-msg >> text=/vlastní technikou bez lešení/");
  await p.fill("#hb-q", "umíte opravit klavír");
  await p.press("#hb-q", "Enter");
  await p.waitForSelector("#hbot form.hb-call");
  await p.fill("#hbot form.hb-call input[name=jmeno]", "Test Testovací");
  await p.fill("#hbot form.hb-call input[name=telefon]", "12");
  await p.click("#hbot form.hb-call button[type=submit]");
  await p.waitForSelector("#hbot .hb-chyba:not([hidden]) >> text=/telefonní číslo/");
  await p.fill("#hbot form.hb-call input[name=telefon]", "+420 777 123 456");
  await p.check("#hbot form.hb-call input[name=souhlas]");
  await p.click("#hbot form.hb-call button[type=submit]");
  await p.waitForSelector("#hbot .hb-msg >> text=/Děkujeme. Ozveme se/");
  assert.equal(s.formulare.length, 1);
  assert.equal(s.formulare[0]["form-name"], "hspg-zavolejte");
  assert.equal(s.formulare[0]["Telefon"], "+420777123456");
  assert.equal(s.formulare[0]["Zdroj"], "H-BOT");
});

test("zákazník s AI: upozornění o AI, odpověď ověřená druhou AI, odkazy a další krok", async () => {
  const { p, chyby } = await stranka("ai");
  await p.click("#hbot-btn");
  await p.waitForSelector("#hbot .hb-info >> text=/spolupracující AI \\(Claude, Gemini, ChatGPT\\)/");
  await p.fill("#hb-q", "Kolik by stálo vyčistit střechu u rodinného domu?");
  await p.press("#hb-q", "Enter");
  await p.waitForSelector("#hbot .hb-stitek >> text=/Odpověď ověřila druhá AI · Claude \\+ Gemini/");
  assert.equal(await p.locator('#hbot .hb-msg a[href="/akce/"]').count() > 0, true, "hspg.cz/akce/ je odkaz");
  assert.equal(await p.locator('#hbot .hb-msg a[href="tel:+420736618486"]').count() > 0, true, "telefon je odkaz");
  await p.waitForSelector("#hbot .hb-chip.hb-plny >> text=Chci cenu do 24 h");
  assert.deepEqual(chyby, []);
});

test("AI selže → návštěvník dostane odpověď z FAQ, ne chybu", async () => {
  const { p } = await stranka("chyba");
  await p.click("#hbot-btn");
  await p.waitForSelector("#hbot .hb-chip");
  await p.fill("#hb-q", "jaký je postup?");
  await p.press("#hb-q", "Enter");
  await p.waitForSelector("#hbot .hb-msg >> text=/01 Čištění/");
});

test("mobil 390 px: lišta Zavolat · Zeptat se · Cena, panel jako spodní list, bez vodorovného posunu", async () => {
  const { p } = await stranka("ai", { sirka: 390, vyska: 844 });
  await p.waitForSelector("#hspg-lista .hl-bot");
  assert.equal(await p.isHidden("#hbot-btn"), true);
  const polozky = await p.$$eval("#hspg-lista > *", (e) => e.map((x) => x.textContent.trim()));
  assert.deepEqual(polozky, ["Zavolat", "Zeptat se", "Cena do 24 h"]);
  await p.evaluate(() => { localStorage.removeItem("hspg-souhlas"); });
  await p.click("#hspg-lista .hl-bot");
  await p.waitForSelector("#hbot:not([hidden]) .hb-chip");
  // Otevřený panel musí ležet nad lištou souhlasu i čímkoli jiným: vstup je klikací.
  const nahore = await p.evaluate(() => { const r = document.querySelector("#hb-q").getBoundingClientRect(); const el = document.elementFromPoint(r.x + 10, r.y + r.height / 2); return el && el.closest("#hbot") !== null; });
  assert.equal(nahore, true, "pole pro otázku nesmí nic překrývat");
  const box = await p.locator("#hbot").boundingBox();
  assert.ok(box.x <= 1 && Math.round(box.width) >= 389, "panel přes celou šířku");
  const zavrit = await p.locator("#hbot .hb-close").boundingBox();
  assert.ok(zavrit.y >= 0 && zavrit.height >= 40, "zavírací tlačítko je vidět a má ≥ 40 px");
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.ok(await p.evaluate(() => document.getElementById("hbot").getBoundingClientRect().width <= innerWidth), "panel není širší než obrazovka");
});

test("mobilní lišta: popisky na jeden řádek a bez přetečení na šířkách 320–412 px", async () => {
  for (const sirka of [320, 344, 360, 375, 390, 393, 412]) {
    const { p } = await stranka("ai", { sirka, vyska: 800 });
    await p.waitForSelector("#hspg-lista .hl-bot");
    const vada = await p.$$eval("#hspg-lista > *", (e) => e.filter((x) => x.getBoundingClientRect().height > 52 || x.scrollWidth > x.clientWidth + 1 || x.getBoundingClientRect().right > innerWidth).map((x) => x.textContent.trim()));
    assert.deepEqual(vada, [], `šířka ${sirka}px`);
    await p.context().close();
  }
});

test("běžný návštěvník nevidí přihlášení majitele", async () => {
  const { p } = await stranka("ai");
  await p.click("#hbot-btn");
  await p.waitForSelector("#hbot .hb-chip");
  assert.equal(await p.isVisible("#hbot [data-majitel]"), false);
});

test("přístupnost otevřeného panelu (axe): žádné vážné ani kritické chyby", async () => {
  const { p } = await stranka("ai");
  await p.click("#hbot-btn");
  await p.waitForSelector("#hbot .hb-chip");
  await p.addScriptTag({ path: AXE });
  const v = await p.evaluate(async () => (await window.axe.run("#hbot")).violations.map((x) => ({ id: x.id, impact: x.impact, n: x.nodes.length })));
  const vazne = v.filter((x) => x.impact === "serious" || x.impact === "critical");
  assert.deepEqual(vazne, [], JSON.stringify(v));
});

test("majitel: přihlášení přes #majitel, Vše ve tvých rukách – všechny AI najednou i spolupráce, odhlášení", async () => {
  const { p, chyby } = await stranka("ai", { cesta: "/cenik.html#majitel" });
  await p.waitForSelector("#hb-heslo");
  await p.fill("#hb-heslo", "spatne-heslo-123456789");
  await p.press("#hb-heslo", "Enter");
  await p.waitForSelector("#hbot .hb-login .hb-chyba:not([hidden]) >> text=Špatné heslo.");
  await p.fill("#hb-heslo", HESLO);
  await p.press("#hb-heslo", "Enter");
  await p.waitForSelector("#hb-tab-m[aria-selected=true]");
  await p.waitForSelector("#hbot .hbm-cip.on >> text=Claude ✓");
  assert.match(await p.textContent("#hbot-btn"), /Vše ve tvých rukách/);
  assert.equal(await p.locator("#hbot.hb-siroky").count(), 1);

  await p.fill("#hbm-dotaz", "Napiš krátký příspěvek o jarním čištění střech.");
  await p.selectOption("#hbm-uloha", "facebook");
  await p.click("#hbot .hbm-akce .hb-zlate");
  await p.waitForFunction(() => document.querySelectorAll("#hbot .hbm-karta").length === 3 && [...document.querySelectorAll("#hbot .hbm-text")].every((t) => t.textContent.length > 5));
  const texty = await p.$$eval("#hbot .hbm-text", (e) => e.map((x) => x.textContent));
  assert.ok(texty[0].startsWith("[claude]") && texty[1].startsWith("[gpt]") && texty[2].startsWith("[gemini]"), texty.join(" | "));
  await p.waitForSelector("#hbot .hbm-info >> text=Hotovo.");

  await p.selectOption("#hbm-rezim", "spoluprace");
  await p.click("#hbot .hbm-akce .hb-zlate");
  await p.waitForSelector("#hbot .hbm-krok >> text=/3. Finální verze – Gemini/");
  await p.waitForSelector("#hbot .hbm-info >> text=Hotovo.");
  const kroky = await p.$$eval("#hbot .hbm-krok", (e) => e.map((x) => x.textContent));
  assert.deepEqual(kroky, ["1. Návrh – ChatGPT", "2. Kontrola pravdivosti – Claude", "3. Finální verze – Gemini"]);
  // Panel se posunul k výsledku: finální krok je v zorném poli panelu.
  const videt = await p.evaluate(() => {
    const obal = document.querySelector("#hbot .hbm");
    const posledni = [...document.querySelectorAll("#hbot .hbm-krok")].pop();
    const o = obal.getBoundingClientRect(), k = posledni.getBoundingClientRect();
    return obal.scrollTop > 0 && k.top >= o.top - 1 && k.top <= o.bottom;
  });
  assert.equal(videt, true, "finální verze musí být po dokončení vidět");

  await p.selectOption("#hbm-uloha", "stranka");
  await p.fill("#hbm-dotaz", "");
  await p.selectOption("#hbm-uloha", "volny");
  await p.selectOption("#hbm-uloha", "stranka");
  assert.match(await p.inputValue("#hbm-dotaz"), /^Stránka: .*\nAdresa: http/);

  await p.click("#hbot [data-majitel]"); // Odhlásit majitele
  await p.waitForSelector("#hbot .hb-tabs[hidden]", { state: "attached" });
  assert.match(await p.textContent("#hbot-btn"), /Budoucnost ve Vašich rukách/);
  assert.deepEqual(chyby, []);
});

test("velké AI centrum /ai-centrum/: přihlášení tokenem a odpovědi všech AI", async () => {
  const { p, chyby } = await stranka("ai", { cesta: "/ai-centrum/" });
  await p.fill("#heslo", HESLO);
  await p.click("#formPrihlaseni button");
  await p.waitForSelector("#aplikace:not(.skryte) .cip.on");
  await p.fill("#dotaz", "Test");
  await p.click("#odeslat");
  await p.waitForSelector("#info >> text=Hotovo.");
  const n = await p.$$eval(".sloupec .vystup", (e) => e.filter((x) => x.textContent.startsWith("[")).length);
  assert.equal(n, 3);
  assert.deepEqual(chyby, []);
});

test("úvodní stránka: tlačítko se schová u hlavní výzvy v úvodu a objeví se po posunu", async () => {
  const { p, chyby } = await stranka("ai", { cesta: "/" });
  await p.waitForSelector("#hbot-btn", { state: "attached" });
  await p.evaluate(() => window.scrollTo(0, 2500));
  await p.waitForSelector("#hbot-btn", { state: "visible" });
  await p.click("#hbot-btn");
  await p.waitForSelector("#hbot:not([hidden]) .hb-chip");
  assert.deepEqual(chyby, []);
});

test("anglická stránka asistenta nevkládá (obsah je česky)", async () => {
  const { p } = await stranka("ai", { cesta: "/en.html" });
  await p.waitForTimeout(500);
  assert.equal(await p.locator("#hbot-btn").count(), 0);
});
