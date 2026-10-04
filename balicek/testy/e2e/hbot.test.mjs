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

async function stranka(rezim, { sirka = 1280, vyska = 800, cesta = "/cenik.html", zaseknout, pred } = {}) {
  const s = await spustServer({ rezim, zaseknout });
  servery.push(s);
  const ctx = await prohlizec.newContext({ viewport: { width: sirka, height: vyska } });
  // Externí služby (GTM, Clarity, videa) test nepotřebuje.
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  if (pred) await pred(ctx); // vlastní úpravy sítě (zdržení, 404) před načtením stránky
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
  // Během animace vjezdu vrací boundingBox i 39,99998 → zaokrouhlit.
  assert.ok(zavrit.y >= 0 && Math.round(zavrit.height) >= 40, "zavírací tlačítko je vidět a má ≥ 40 px");
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.ok(await p.evaluate(() => document.getElementById("hbot").getBoundingClientRect().width <= innerWidth), "panel není širší než obrazovka");
  // Na mobilu je panel modální: zbytek stránky je inert, po zavření se vše vrátí.
  assert.equal(await p.getAttribute("#hbot", "aria-modal"), "true");
  assert.equal(await p.evaluate(() => document.getElementById("hspg-lista").inert), true);
  await p.click("#hbot .hb-close");
  assert.equal(await p.evaluate(() => document.querySelectorAll("[data-hbot-inert]").length + document.querySelectorAll("body > [inert]").length), 0);
  assert.equal(await p.evaluate(() => document.activeElement?.closest("#hspg-lista") !== null), true, "fokus zpět na liště");
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
  // Historie (zadání mohou obsahovat údaje zákazníků) jen v sessionStorage a po odhlášení zmizí.
  assert.equal(await p.evaluate(() => localStorage.getItem("hspgHistorie")), null);
  assert.ok(await p.evaluate(() => JSON.parse(sessionStorage.getItem("hspgHistorie") || "[]").length) >= 1);
  await p.click("#odhlasit");
  assert.equal(await p.evaluate(() => sessionStorage.getItem("hspgHistorie")), null);
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

test("hbot-panel.js 404: záložní okno bez přesměrování, „Zkusit znovu“ otevře panel; Escape mimo panel ho nezavře", async () => {
  const { p, chyby } = await stranka("bez-ai");
  await p.context().route("**/assets/hbot-panel.js", (r) => r.fulfill({ status: 404, body: "404" }));
  await p.click("#hbot-btn");
  await p.waitForSelector("#hbot-zaloha:not([hidden])");
  assert.equal(new URL(p.url()).pathname, "/cenik.html", "žádné přesměrování");
  assert.equal(await p.evaluate(() => document.activeElement.id), "hbot-zaloha");
  await p.context().unroute("**/assets/hbot-panel.js");
  await p.click("#hbot-zaloha [data-znovu]");
  await p.waitForSelector("#hbot:not([hidden]) .hb-chip");
  assert.equal(await p.isHidden("#hbot-zaloha"), true);
  assert.equal(await p.locator("section#hbot").count(), 1, "jeden panel");
  await p.evaluate(() => [...document.querySelectorAll("a[href]")].find((a) => !a.closest("#hbot") && a.getClientRects().length).focus());
  await p.keyboard.press("Escape");
  assert.equal(await p.isVisible("#hbot"), true, "Escape mimo panel ho nezavře");
  // Klik do textu odpovědi nechá fokus v panelu – Escape pak panel zavře.
  await p.click("#hbot .hb-msg");
  await p.keyboard.press("Escape");
  assert.equal(await p.isHidden("#hbot"), true);
  assert.deepEqual(chyby, []);
});

test("průběh AI se zasekne po 1. řádku → do ~12 s odpověď z FAQ a další dotaz funguje", async () => {
  const { p, chyby } = await stranka("ai", { zaseknout: { "POST /api/asistent": ["application/x-ndjson", '{"krok":"navrh","ai":"Claude"}\n'] } });
  await p.click("#hbot-btn");
  await p.waitForSelector("#hbot .hb-info");
  const t0 = Date.now();
  await p.fill("#hb-q", "Kolik by stálo vyčistit střechu u rodinného domu?");
  await p.press("#hb-q", "Enter");
  await p.waitForSelector("#hbot .hb-pise >> text=/Claude píše/");
  await p.waitForSelector("#hbot .hb-msg >> text=/střecha od \\d+ Kč/i", { timeout: 16000 });
  assert.ok(Date.now() - t0 >= 11000, "odpověď z FAQ až po limitu");
  assert.equal(await p.locator("#hbot .hb-pise").count(), 0);
  await p.fill("#hb-q", "potřebujete lešení?");
  await p.press("#hb-q", "Enter");
  await p.waitForSelector("#hbot .hb-msg >> text=/bez lešení/");
  assert.deepEqual(chyby, []);
});

test("znalosti se zaseknou po hlavičkách → do 6 s uvítání a položená otázka se nezahodí", async () => {
  const { p } = await stranka("bez-ai", { zaseknout: { "GET /assets/hbot-znalosti.json": ["application/json", '{"firma":'] } });
  await p.click("#hbot-btn");
  await p.fill("#hb-q", "potřebujete lešení?");
  await p.press("#hb-q", "Enter");
  await p.waitForSelector("#hbot .hb-msg >> text=/Dobrý den, jsem holub/", { timeout: 6000 });
  await p.waitForSelector("#hbot .hb-msg.hb-me >> text=potřebujete lešení?", { timeout: 2000 });
});

test("FAQ bez AI: tvary slov (ceny, cenu, péče) najdou odpověď, „panelák“ nenajde fotovoltaiku", async () => {
  const { p } = await stranka("bez-ai");
  await p.click("#hbot-btn");
  await p.waitForSelector("#hbot .hb-chip");
  const zeptej = async (q) => {
    const n = await p.locator("#hbot .hb-msg").count();
    await p.fill("#hb-q", q);
    await p.press("#hb-q", "Enter");
    await p.waitForFunction((n) => document.querySelectorAll("#hbot .hb-msg").length >= n + 2, n);
    return p.locator("#hbot .hb-msg").nth(n + 1).textContent();
  };
  for (const [q, re] of [["Jaké máte ceny?", /střecha od \d+ Kč/i], ["Chci znát cenu", /střecha od \d+ Kč/i], ["Co obnáší trvalá péče?", /SENTINEL/], ["Čistíte solární panely?", /fotovolt/i]]) {
    assert.match(await zeptej(q), re, q);
  }
  assert.doesNotMatch(await zeptej("Bydlíme v paneláku, je to pro nás?"), /fotovolt/i);
});

// --- Odolnost panelu (testy z nezávislé kontroly oprav) ---
const zeptejSe = async (p, otazky) => { for (const q of otazky) { await p.fill("#hb-q", q); await p.press("#hb-q", "Enter"); await p.waitForTimeout(80); } };
const SEST = ["Kolik to stojí?", "Potřebujete lešení?", "Musím být doma?", "Kde působíte?", "Jak dlouho vydrží impregnace H-STONE?", "Děláte i pro SVJ a bytové domy?"];

test("hbot-panel.js visí → do 7 s záložní okno; „Zkusit znovu“ → po doběhnutí obou skriptů jeden panel", async () => {
  let n = 0;
  const { p } = await stranka("bez-ai", { pred: (ctx) => ctx.route("**/assets/hbot-panel.js", async (r) => { if (n++ === 0) await new Promise((ok) => setTimeout(ok, 8000)); await r.continue().catch(() => {}); }) });
  const t0 = Date.now();
  await p.click("#hbot-btn");
  await p.waitForSelector("#hbot-zaloha:not([hidden])", { timeout: 7000 });
  assert.ok(Date.now() - t0 < 7000);
  await p.click("#hbot-zaloha [data-znovu]");
  await p.waitForSelector("#hbot:not([hidden]) .hb-chip");
  await p.waitForTimeout(3000);
  assert.equal(await p.locator("section#hbot").count(), 1, "jeden panel");
});

test("mobil: prvek přidaný do body po otevření je inert, po ✕ nic inert nezůstane", async () => {
  const { p } = await stranka("bez-ai", { sirka: 390, vyska: 844 });
  await p.click("#hspg-lista .hl-bot");
  await p.waitForSelector("#hbot:not([hidden]) .hb-chip");
  const inert = await p.evaluate(async () => { const x = document.createElement("div"); x.innerHTML = "<button>x</button>"; document.body.appendChild(x); await new Promise((ok) => setTimeout(ok, 50)); return x.inert; });
  assert.equal(inert, true);
  await p.click("#hbot .hb-close");
  assert.equal(await p.evaluate(() => document.querySelectorAll("body [inert]").length), 0);
});

test("AI: dvě otázky před načtením znalostí → jedno POST /api/asistent, druhá zůstane v poli", async () => {
  const { p } = await stranka("ai", { pred: (ctx) => ctx.route("**/assets/hbot-znalosti.json", async (r) => { await new Promise((ok) => setTimeout(ok, 2500)); await r.continue().catch(() => {}); }) });
  const posty = [];
  p.on("request", (r) => { if (r.method() === "POST" && r.url().endsWith("/api/asistent")) posty.push(r.url()); });
  await p.click("#hbot-btn");
  await p.waitForSelector("#hbot:not([hidden])");
  // Otázka mimo FAQ (dotaz na volný termín by teď správně odpověděl FAQ o plánovači – úkol 21).
  await zeptejSe(p, ["Stihnete to ještě v listopadu?", "A v prosinci?"]);
  await p.waitForSelector("#hbot .hb-stitek", { timeout: 15000 });
  await p.waitForTimeout(500);
  assert.equal(posty.length, 1);
  assert.equal(await p.inputValue("#hb-q"), "A v prosinci?");
});

test("mobil /cenik.html#hbot → ✕ → fokus na „Zeptat se“", async () => {
  const { p } = await stranka("bez-ai", { sirka: 390, vyska: 844, cesta: "/cenik.html#hbot" });
  await p.waitForSelector("#hbot:not([hidden]) .hb-chip");
  await p.click("#hbot .hb-close");
  assert.equal(await p.evaluate(() => document.activeElement.classList.contains("hl-bot")), true);
});

test("mobil, 404 panelu, /cenik.html#hbot → Zavřít → fokus na „Zeptat se“", async () => {
  const { p } = await stranka("bez-ai", { sirka: 390, vyska: 844, cesta: "/cenik.html#hbot", pred: (ctx) => ctx.route("**/assets/hbot-panel.js", (r) => r.fulfill({ status: 404, body: "404" })) });
  await p.waitForSelector("#hbot-zaloha:not([hidden])");
  await p.click("#hbot-zaloha [data-zavrit]");
  assert.equal(await p.evaluate(() => document.activeElement.classList.contains("hl-bot")), true);
});

test("bez hbot.css: deník se posouvá, pole otázky je vidět a skrytá karta majitele má display:none", async () => {
  const { p } = await stranka("bez-ai", { pred: (ctx) => ctx.route("**/assets/hbot.css", (r) => r.abort()) });
  await p.click("#hbot-btn");
  await p.waitForSelector("#hbot .hb-chip");
  await zeptejSe(p, SEST);
  await p.waitForTimeout(3200);
  const r = await p.evaluate(() => { const l = document.querySelector("#hbot .hb-log"), q = document.getElementById("hb-q").getBoundingClientRect(); const el = document.elementFromPoint(q.x + 5, q.y + q.height / 2); return { posun: l.scrollHeight > l.clientHeight, pole: el && el.id === "hb-q" }; });
  assert.deepEqual(r, { posun: true, pole: true });
  assert.equal(await p.evaluate(() => getComputedStyle(document.getElementById("hb-view-m")).display), "none");
});

test("počítač: klik do textu odpovědi + PageDown posune deník, ne stránku", async () => {
  const { p } = await stranka("bez-ai");
  await p.click("#hbot-btn");
  await p.waitForSelector("#hbot .hb-chip");
  await zeptejSe(p, SEST);
  await p.evaluate(() => { document.querySelector("#hbot .hb-log").scrollTop = 0; scrollTo(0, 0); });
  const b = await p.locator("#hbot .hb-msg").first().boundingBox();
  await p.mouse.click(b.x + 10, b.y + 10);
  await p.keyboard.press("PageDown");
  await p.waitForTimeout(600);
  const r = await p.evaluate(() => ({ log: document.querySelector("#hbot .hb-log").scrollTop > 0, stranka: scrollY }));
  assert.deepEqual(r, { log: true, stranka: 0 });
  await p.keyboard.press("Escape");
  assert.equal(await p.isHidden("#hbot"), true);
});

test("úvodní stránka /#hbot (tlačítko skryté u hlavní výzvy) → ✕ → fokus není na <body>", async () => {
  const { p } = await stranka("bez-ai", { cesta: "/#hbot" });
  await p.waitForSelector("#hbot:not([hidden]) .hb-chip");
  await p.focus("#hbot .hb-close");
  await p.keyboard.press("Enter");
  assert.equal(await p.evaluate(() => document.activeElement !== document.body && !document.activeElement.closest("#hbot")), true);
});

test("FAQ bez AI: „s cenou“ a „pečovat“ najdou odpověď", async () => {
  const { p } = await stranka("bez-ai");
  await p.click("#hbot-btn");
  await p.waitForSelector("#hbot .hb-chip");
  for (const [q, re] of [["Jak je to s cenou?", /střecha od \d+ Kč/i], ["Můžete o střechu pečovat pravidelně?", /SENTINEL/]]) {
    const n = await p.locator("#hbot .hb-msg").count();
    await p.fill("#hb-q", q); await p.press("#hb-q", "Enter");
    await p.waitForFunction((n) => document.querySelectorAll("#hbot .hb-msg").length >= n + 2, n);
    assert.match(await p.locator("#hbot .hb-msg").nth(n + 1).textContent(), re, q);
  }
});

test("AI centrum: porada se 3 AI = 7 volání /api/ai, závěr ve vlákně; za běhu nejde přepnout režim", async () => {
  const { p, chyby } = await stranka("ai", { cesta: "/ai-centrum/" });
  const volani = [];
  p.on("request", (r) => { if (r.method() === "POST" && r.url().endsWith("/api/ai")) volani.push(JSON.parse(r.postData() || "{}")); });
  await p.fill("#heslo", HESLO);
  await p.click("#formPrihlaseni button");
  await p.waitForSelector("#aplikace:not(.skryte) .cip.on");
  await p.selectOption("#rezim", "porada");
  await p.fill("#dotaz", "Test porady");
  await p.click("#odeslat");
  assert.equal(await p.isDisabled("#rezim"), true, "režim je za běhu zamčený");
  await p.waitForSelector("#info >> text=Hotovo.", { timeout: 30000 });
  assert.equal(volani.length, 7);
  assert.ok(volani.filter((v) => v.maxTokenu === 1500).length === 3, "připomínky mají malou rezervaci");
  assert.ok((await p.getAttribute("#s-porada", "data-final"))?.length > 0);
  assert.equal(await p.isDisabled("#rezim"), false);
  await p.click("#odhlasit");
  assert.equal(await p.inputValue("#dotaz"), "", "po odhlášení zadání zmizí");
  assert.deepEqual(chyby, []);
});

test("stříbrné tlačítko: text vidět, po odrolování se sbalí, najetí ho rozbalí", async () => {
  const { p } = await stranka("bez-ai", { sirka: 1280, vyska: 800 });
  await p.waitForSelector("#hbot-btn");
  const sirka = (podminka) => p.waitForFunction(podminka, null, { timeout: 5000 }).then(() => true, () => false);
  assert.ok(await sirka(() => document.getElementById("hbot-btn").getBoundingClientRect().width > 200), "rozbalené s textem");
  await p.evaluate(() => scrollTo(0, 2000));
  assert.ok(await sirka(() => document.getElementById("hbot-btn").getBoundingClientRect().width < 120), "sbalené do medailonu");
  await p.hover("#hbot-btn");
  assert.ok(await sirka(() => document.getElementById("hbot-btn").getBoundingClientRect().width > 200), "najetí rozbalí");
});
