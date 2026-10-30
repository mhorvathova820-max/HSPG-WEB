// E2E (úkol 56): puls plakety, rozcestník „Celý web na jednom místě“, zvuk a vibrace (přepínač), hejno při měření
// na HOLUB 360 a malé hejno u obálky „Cena hned“ – ve skutečném Chromiu, bez internetu.
// Spuštění: CHROMIUM=/opt/pw-browsers/chromium node --test balicek/testy/e2e/zazitek-rozcestnik.test.mjs
import { test, before, after, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { spustServer } from "../server.mjs";

const require = createRequire(import.meta.url);
const AXE = require.resolve("axe-core/axe.min.js");
let prohlizec, server;
const kontexty = [];
before(async () => {
  prohlizec = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined, args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=user-gesture-required"] });
  server = await spustServer({ rezim: "bez-ai" });
});
afterEach(async () => { await Promise.all(kontexty.splice(0).map((c) => c.close().catch(() => {}))); });
after(async () => { await prohlizec?.close(); await server?.zavri(); });

// Špeh zvuku a vibrací: počítá vzniklé AudioContexty, zdroje zvuku a volání navigator.vibrate (nic se nepřehrává ven).
function spehZazitku() {
  window.__zaz = { kontexty: 0, zdroje: 0, vibrace: [] };
  const AC = window.AudioContext;
  if (AC) {
    window.AudioContext = class extends AC { constructor(...a) { super(...a); window.__zaz.kontexty++; } };
    for (const m of ["createOscillator", "createBufferSource"]) {
      const puvodni = BaseAudioContext.prototype[m];
      BaseAudioContext.prototype[m] = function (...a) { window.__zaz.zdroje++; return puvodni.apply(this, a); };
    }
  }
  Object.defineProperty(Navigator.prototype, "vibrate", { configurable: true, value(v) { window.__zaz.vibrace.push(v); return true; } });
}

async function stranka({ cesta = "/cenik.html", sirka = 1280, vyska = 800, pohyb = "no-preference", barvy = "none", init = [], pred } = {}) {
  const ctx = await prohlizec.newContext({ viewport: { width: sirka, height: vyska }, reducedMotion: pohyb, forcedColors: barvy, hasTouch: sirka < 500 });
  kontexty.push(ctx);
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  for (const s of init) await ctx.addInitScript(s);
  if (pred) await pred(ctx);
  const p = await ctx.newPage();
  const chyby = [];
  p.on("pageerror", (e) => chyby.push(e.message));
  p.on("console", (m) => {
    if (m.type() !== "error") return;
    const zdroj = m.location()?.url || "";
    if (/Failed to load resource/.test(m.text()) && /\/assets\/fonts\/|favicon|apple-touch|cena-z-adresy/.test(zdroj)) return;
    chyby.push(`${m.text()} ${zdroj}`);
  });
  await p.goto(server.url + cesta, { waitUntil: "load" });
  return { p, ctx, chyby };
}
const rychlyPuls = () => { window.HSPG_HBOT_PULS = [300, 1600, 2900]; };
// Zákazník si zvuk a vibrace už zapnul (výchozí stav je vypnuto – rozhodnutí 22. 10. 2026 podle rešerše).
const zvukZapnut = () => { try { localStorage.setItem("hspg-zazitek", "1"); } catch { /* bez úložiště */ } };
const pocitejPulsy = () => {
  window.__pulsy = 0;
  addEventListener("DOMContentLoaded", () => {
    new MutationObserver(() => { if (document.querySelector(".hb-pulzuje")) window.__pulsy++; }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ["class"] });
  });
};
const posunyRozvrzeni = () => {
  window.__posuny = [];
  try { new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__posuny.push(e.value); }).observe({ type: "layout-shift", buffered: true }); } catch { /* bez podpory */ }
};
async function axeVazne(p, kde) {
  if (!(await p.evaluate(() => !!window.axe))) await p.addScriptTag({ path: AXE });
  // Ustálený stav: po doběhnutí animací vjezdu.
  await p.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity), null, { timeout: 5000 }).catch(() => {});
  const v = await p.evaluate(async (kde) => (await window.axe.run(kde, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } })).violations
    .filter((x) => x.impact === "serious" || x.impact === "critical").map((x) => ({ id: x.id, cil: x.nodes.slice(0, 3).map((n) => n.target.join(" ")) })), kde);
  return v;
}

// --------------------------------------------------------------------------------------------- 1. puls
test("puls: plaketa se krátce nabídne (dvě zlaté vlny, štítek „Celý web na jednom místě“), bez posunu rozvržení; po otevření panelu už ne", async () => {
  const { p, chyby } = await stranka({ init: [rychlyPuls, posunyRozvrzeni] });
  await p.waitForSelector("#hbot-btn");
  const pred = await p.evaluate(() => { const b = document.getElementById("hbot-btn"); const r = b.getBoundingClientRect(); return { label: b.getAttribute("aria-label"), r: [r.x, r.y, r.width, r.height] }; });
  await p.waitForSelector("#hbot-btn.hb-pulzuje", { timeout: 3000 });
  await p.evaluate(() => { window.__posuny.length = 0; }); // jen posuny během dávky
  await p.waitForTimeout(700);
  const behem = await p.evaluate(() => {
    const b = document.getElementById("hbot-btn"), r = b.getBoundingClientRect(), puls = b.querySelector(".hb-puls");
    return {
      label: b.getAttribute("aria-label"), r: [r.x, r.y, r.width, r.height],
      stitek: getComputedStyle(b.querySelector(".hb-stitek-puls")).opacity, zakl: getComputedStyle(b.querySelector(".hb-stitek-zakl")).opacity,
      vlny: puls.getAnimations({ subtree: true }).length, pseudo: getComputedStyle(puls, "::before").animationName,
      lista: document.querySelector("#hspg-lista .hl-cena").classList.contains("hb-pulzuje"),
    };
  });
  assert.equal(behem.label, pred.label, "přístupný název tlačítka se nemění");
  assert.deepEqual(behem.r, pred.r, "plaketa se během pulsu nepohne ani nezmění velikost");
  assert.equal(behem.stitek, "1");
  assert.equal(behem.zakl, "0");
  assert.equal(behem.pseudo, "hb-puls");
  assert.equal(behem.lista, true, "„Cena hned“ na liště pulzuje současně");
  assert.match(await p.textContent("#hbot-btn .hb-stitek-puls"), /^Celý web na jednom místě$/);
  // Dávka je krátká (WCAG 2.2.2): do 4,5 s sama skončí.
  await p.waitForSelector("#hbot-btn:not(.hb-pulzuje)", { timeout: 4600 });
  assert.equal(await p.evaluate(() => window.__posuny.reduce((s, x) => s + x, 0)), 0, "žádný posun rozvržení");
  // Otevření panelu: puls do konce relace skončí (i po novém načtení stránky).
  await p.click("#hbot-btn");
  await p.waitForSelector("#hbot:not([hidden])");
  assert.equal(await p.evaluate(() => sessionStorage.getItem("hspg-hbot-otevreno")), "1");
  assert.equal(await p.locator(".hb-pulzuje").count(), 0);
  await p.keyboard.press("Escape");
  await p.waitForTimeout(3200);
  assert.equal(await p.locator(".hb-pulzuje").count(), 0, "po otevření panelu žádná další dávka");
  await p.reload({ waitUntil: "load" });
  await p.waitForTimeout(1300);
  assert.equal(await p.locator(".hb-pulzuje").count(), 0, "ani po novém načtení ve stejné relaci");
  assert.deepEqual(chyby, []);
});

test("puls: najetí myší dávku hned ukončí; mobilní lišta pulzuje u „Cena hned“", async () => {
  const { p } = await stranka({ init: [rychlyPuls] });
  await p.waitForSelector("#hbot-btn.hb-pulzuje", { timeout: 3000 });
  await p.hover("#hbot-btn");
  assert.equal(await p.locator("#hbot-btn.hb-pulzuje").count(), 0);
  const m = await stranka({ sirka: 390, vyska: 844, init: [rychlyPuls] });
  await m.p.waitForSelector("#hspg-lista .hl-cena.hb-pulzuje", { timeout: 3000 });
  assert.equal(await m.p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(await m.p.$$eval("#hspg-lista > *", (e) => e.map((x) => x.textContent.trim())), ["Zavolat", "Zeptat se", "Cena hned"]);
});

test("puls: při omezení pohybu ani ve vynucených barvách vůbec nepulzuje", async () => {
  for (const volby of [{ pohyb: "reduce" }, { barvy: "active" }]) {
    const { p } = await stranka({ ...volby, init: [rychlyPuls, pocitejPulsy] });
    await p.waitForSelector("#hbot-btn");
    await p.waitForTimeout(1500);
    assert.equal(await p.evaluate(() => window.__pulsy), 0, JSON.stringify(volby));
    assert.equal(await p.evaluate(() => getComputedStyle(document.querySelector("#hbot-btn .hb-puls")).display), "none", JSON.stringify(volby));
  }
});

// --------------------------------------------------------------------------------------------- 2. rozcestník
const CILE = [["cena", null], ["holub-360", "/holub-360/"], ["standard", "/standard-holub/"], ["sentinel", "/cenik.html#sentinel"], ["pas-domu", "/pas-domu/trezor.html"], ["termin", "/planovac/"], ["poptavka", "/akce/"], ["zavolat", null]];

test("rozcestník: 8 dlaždic (skutečné odkazy a tlačítka), zlatá „Cena hned“ první, klávesnice, fokus a měření", async () => {
  const { p, chyby } = await stranka();
  await p.click("#hbot-btn");
  await p.waitForSelector("#hbot .hb-rozc");
  assert.equal(await p.textContent("#hbot .hb-rozc-nadpis"), "Celý web na jednom místě");
  const dlazdice = await p.$$eval("#hbot .hb-rozc", (e) => e.map((x) => ({ cil: x.dataset.cil, tag: x.tagName, href: x.getAttribute("href"), h: x.getBoundingClientRect().height, text: x.textContent.replace(/\s+/g, " ").trim() })));
  assert.deepEqual(dlazdice.map((d) => [d.cil, d.href]), CILE);
  assert.deepEqual(dlazdice.map((d) => d.tag), ["BUTTON", "A", "A", "A", "A", "A", "A", "BUTTON"]);
  assert.ok(dlazdice.every((d) => d.h >= 44), "cíle aspoň 44 px");
  assert.match(dlazdice[0].text, /^Cena hned Orientační cena z ceníku HSPG$/);
  assert.match(dlazdice[7].text, /Zavolejte mi Po–So 7:00–19:00/);
  assert.equal(await p.getAttribute("#hbot .hb-rozc[data-cil=cena]", "class"), "hb-rozc hb-rozc--hlavni hb-cena-hned");
  // Rychlé otázky zůstávají (bez duplicitních čipů „Cena hned“ a „Zavolejte mi“).
  assert.deepEqual(await p.$$eval("#hbot .hb-uvod .hb-chip", (e) => e.map((x) => x.textContent)), ["Kolik to stojí?", "Jak si rezervovat termín?", "Potřebujete lešení?", "Jak dlouho vydrží impregnace H-STONE?", "Kde působíte?", "Děláte i pro SVJ a bytové domy?"]);
  // Klávesnice: Tab prochází dlaždice, fokus je vidět, Enter na „Cena hned“ otevře kalkulaci.
  await p.focus("#hbot .hb-rozc[data-cil=cena]");
  await p.keyboard.press("Tab");
  assert.equal(await p.evaluate(() => document.activeElement.getAttribute("href")), "/holub-360/");
  assert.equal(await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle), "solid", "viditelný fokus");
  await p.keyboard.press("Shift+Tab");
  await p.keyboard.press("Enter");
  await p.waitForSelector("#hbot .hn-karta");
  assert.ok(await p.evaluate(() => window.dataLayer.some((e) => e.event === "hbot_rozcestnik" && e.cil === "cena")));
  assert.deepEqual(chyby, []);
});

test("rozcestník na mobilu 390 a 320 px: 2 sloupce, bez vodorovného posunu; axe bez vážných chyb; „Zavolejte mi“ otevře formulář", async () => {
  for (const sirka of [390, 320]) {
    const { p, chyby } = await stranka({ sirka, vyska: 844 });
    await p.click("#hspg-lista .hl-bot");
    await p.waitForSelector("#hbot .hb-rozc");
    const r = await p.$$eval("#hbot .hb-rozc", (e) => e.map((x) => { const b = x.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width)]; }));
    assert.equal(r[1][1], r[2][1], "HOLUB 360 a Standard HOLUB v jedné řadě");
    assert.ok(r[2][0] > r[1][0], "dva sloupce");
    assert.ok(r[0][2] > r[1][2] * 1.8 && r[7][2] > r[1][2] * 1.8, "hlavní a lichá poslední dlaždice přes celou šířku");
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${sirka}: vodorovný posun`);
    assert.deepEqual(await axeVazne(p, "#hbot"), [], `${sirka}: axe`);
    await p.click("#hbot .hb-rozc[data-cil=zavolat]");
    await p.waitForSelector("#hbot form.hb-call input[name=jmeno]");
    assert.deepEqual(chyby, []);
  }
});

test("rozcestník z hbot-znalosti.json: cizí a nebezpečné odkazy se zahodí, bez cílů „Cena hned“ a „Zavolejte mi“ zůstanou čipy", async () => {
  const pred = (ctx) => ctx.route("**/assets/hbot-znalosti.json", async (r) => {
    const j = await (await r.fetch()).json();
    j.rozcestnik = [
      { id: "zly", titul: "Zlý", href: "//evil.example" }, { id: "js", titul: "JS", href: "javascript:alert(1)" },
      { id: "lomitko", titul: "Lomítko", href: "/\\evil.example" }, { id: "tab", titul: "Tab", href: "/\t/evil.example" },
      { id: "cizi", titul: "Cizí", href: "https://evil.example/" }, { id: "akce", titul: "Akce", akce: "smazat" },
      { id: "ikona", titul: "Plánovač", popis: "Volné dny", href: "/planovac/", ikona: "<img src=x onerror=alert(1)>" },
      { id: "dotaz", titul: "Postup", akce: "otazka", otazka: "Jaký je postup?" },
    ];
    return r.fulfill({ json: j });
  });
  const { p, chyby } = await stranka({ pred });
  await p.click("#hbot-btn");
  await p.waitForSelector("#hbot .hb-rozc");
  assert.deepEqual(await p.$$eval("#hbot .hb-rozc", (e) => e.map((x) => [x.dataset.cil, x.getAttribute("href")])), [["ikona", "/planovac/"], ["dotaz", null]]);
  assert.equal(await p.locator("#hbot img").count(), 0, "z dat se nevloží žádné HTML");
  const cipy = await p.$$eval("#hbot .hb-uvod .hb-chip", (e) => e.map((x) => x.textContent));
  assert.equal(cipy[0], "✦ Cena hned");
  assert.equal(cipy.at(-1), "☎ Zavolejte mi");
  await p.click("#hbot .hb-rozc[data-cil=dotaz]");
  await p.waitForSelector("#hbot .hb-msg >> text=/01 Čištění/");
  assert.deepEqual(chyby, []);
});

test("rozcestník na stránce HOLUB 360: dlaždice této stránky má aria-current=page", async () => {
  const { p } = await stranka({ cesta: "/holub-360/" });
  await p.waitForSelector('body[data-h3a="pripraveno"]');
  await p.click("#hbot-btn");
  await p.waitForSelector("#hbot .hb-rozc");
  assert.equal(await p.getAttribute("#hbot .hb-rozc[data-cil=holub-360]", "aria-current"), "page");
  assert.equal(await p.locator("#hbot .hb-rozc[aria-current]").count(), 1);
});

// --------------------------------------------------------------------------------------------- 3. zvuk a vibrace
test("zvuk a vibrace: výchozí vypnuto; otevření ukáže pozvánku „Zapnout“ (jednou za relaci); Zapnout zahraje, ťukne a uloží „1“; přepínač se pamatuje", async () => {
  const { p, chyby } = await stranka({ init: [spehZazitku] });
  await p.hover("#hbot-btn");
  await p.mouse.wheel(0, 600);
  await p.waitForTimeout(400);
  assert.deepEqual(await p.evaluate(() => window.__zaz), { kontexty: 0, zdroje: 0, vibrace: [] }, "nic bez vědomé akce");
  await p.click("#hbot-btn");
  await p.waitForSelector("#hbot .hb-zazitek:not(.hb-zazitek--ceka)");
  const tl = "#hbot .hb-head .hb-zazitek";
  assert.equal(await p.getAttribute(tl, "aria-pressed"), "false", "výchozí stav vypnuto – zapíná zákazník");
  assert.equal(await p.getAttribute(tl, "aria-label"), "Zvuk", "počítač bez dotyku: žádný slib vibrací");
  assert.equal(await p.evaluate(() => localStorage.getItem("hspg-zazitek")), null, "bez rozhodnutí zákazníka se nic neukládá");
  // Pozvánka pod přepínačem: text, Zapnout, ✕; nic zatím nezaznělo ani nezavibrovalo.
  const poz = "#hbot .hb-head-akce .hz-pozvanka";
  await p.waitForSelector(poz);
  assert.equal(await p.textContent(`${poz} .hz-pozvanka-text`), "Zvuk je vypnutý.");
  assert.equal(await p.getAttribute(poz, "role"), "group");
  assert.equal(await p.getAttribute(`${poz} .hz-pozvanka-ne`, "aria-label"), "Nechat vypnuté");
  assert.deepEqual(await p.evaluate(() => window.__zaz), { kontexty: 0, zdroje: 0, vibrace: [] }, "vypnuto: otevření je tiché");
  await p.click(`${poz} .hz-pozvanka-ano`);
  await p.waitForFunction(() => window.__zaz.zdroje > 1);
  const z1 = await p.evaluate(() => window.__zaz);
  assert.equal(z1.kontexty, 1);
  assert.deepEqual(z1.vibrace, [8], "Zapnout = zvuk otevření + ťuknutí 8 ms");
  assert.equal(await p.getAttribute(tl, "aria-pressed"), "true");
  assert.equal(await p.getAttribute(tl, "title"), "Zvuk: zapnuto");
  assert.equal(await p.evaluate(() => localStorage.getItem("hspg-zazitek")), "1");
  assert.equal(await p.evaluate(() => sessionStorage.getItem("hspg-zazitek-pozvanka")), "1", "rozhodnutí zákazníka se zapíše do relace");
  assert.equal(await p.locator(poz).count(), 0, "pozvánka po rozhodnutí zmizí");
  await p.waitForFunction(() => document.querySelector("#hbot .hb-head-akce .hz-stav")?.textContent === "Zvuk zapnut. Vypnete stejným tlačítkem.", null, { timeout: 2000 });
  assert.equal(await p.getAttribute("#hbot .hb-head-akce .hz-stav", "role"), "status");
  // Přepínač stojí v hlavičce hned vedle zavírání (potvrzení je jen absolutně umístěný text mezi nimi); cíle ≥ 44 px se ověřují níže.
  assert.equal(await p.evaluate(() => { let e = document.querySelector("#hbot .hb-zazitek").nextElementSibling; while (e && e.tagName !== "BUTTON") e = e.nextElementSibling; return e.classList.contains("hb-close"); }), true);
  // Vypnutí přepínačem: ticho, uloží se „0“.
  await p.click(tl);
  assert.equal(await p.getAttribute(tl, "aria-pressed"), "false");
  assert.equal(await p.evaluate(() => localStorage.getItem("hspg-zazitek")), "0");
  const pred = await p.evaluate(() => ({ ...window.__zaz, vibrace: window.__zaz.vibrace.length }));
  await p.click("#hbot .hb-chip >> text=Potřebujete lešení?");
  await p.waitForTimeout(300);
  assert.deepEqual(await p.evaluate(() => ({ ...window.__zaz, vibrace: window.__zaz.vibrace.length })), pred, "vypnuto: žádný zvuk ani vibrace");
  // Volba platí i po novém načtení; s uloženou volbou už žádná pozvánka.
  await p.reload({ waitUntil: "load" });
  await p.click("#hbot-btn");
  await p.waitForSelector("#hbot .hb-zazitek:not(.hb-zazitek--ceka)");
  assert.equal(await p.getAttribute(tl, "aria-pressed"), "false");
  await p.waitForTimeout(300);
  assert.equal(await p.evaluate(() => window.__zaz.kontexty), 0, "vypnuto: výstup se ani nevytvoří");
  assert.equal(await p.locator(poz).count(), 0);
  await p.click(tl);
  assert.equal(await p.getAttribute(tl, "aria-pressed"), "true");
  assert.equal(await p.evaluate(() => localStorage.getItem("hspg-zazitek")), "1");
  assert.deepEqual(await axeVazne(p, "#hbot"), []);
  assert.deepEqual(chyby, []);
});

test("pozvánka: ✕ = nechat vypnuté (nic se neuloží), podruhé v téže relaci se neukáže; při omezení pohybu bez animace", async () => {
  const { p, chyby } = await stranka({ pohyb: "reduce", init: [spehZazitku] });
  await p.click("#hbot-btn");
  const poz = "#hbot .hb-head-akce .hz-pozvanka";
  await p.waitForSelector(poz);
  assert.equal(await p.evaluate(() => document.querySelector("#hbot .hz-pozvanka").getAnimations().length), 0, "omezení pohybu: žádný vjezd");
  assert.deepEqual(await axeVazne(p, "#hbot .hb-head"), []);
  const cile = await p.$$eval(`${poz} button`, (b) => b.map((x) => { const r = x.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
  assert.ok(cile.every(([w, h]) => w >= 44 && h >= 44), `cíle ≥ 44 px: ${JSON.stringify(cile)}`);
  assert.equal(await p.evaluate(() => sessionStorage.getItem("hspg-zazitek-pozvanka")), null, "zobrazení samo nic nezapíše (ePrivacy)");
  // Ukazatel na pozvánce zastaví odpočet (WCAG 2.2.1): po 9,5 s je pořád vidět.
  await p.hover(`${poz} .hz-pozvanka-text`);
  await p.waitForTimeout(9500);
  assert.equal(await p.locator(poz).count(), 1, "s ukazatelem na pozvánce nezmizí");
  await p.click(`${poz} .hz-pozvanka-ne`);
  assert.equal(await p.locator(poz).count(), 0);
  assert.equal(await p.evaluate(() => localStorage.getItem("hspg-zazitek")), null);
  assert.equal(await p.evaluate(() => sessionStorage.getItem("hspg-zazitek-pozvanka")), "1");
  await p.click("#hbot .hb-close");
  await p.click("#hbot-btn");
  await p.waitForTimeout(300);
  assert.equal(await p.locator(poz).count(), 0, "jednou za relaci");
  assert.deepEqual(await p.evaluate(() => window.__zaz), { kontexty: 0, zdroje: 0, vibrace: [] });
  assert.deepEqual(chyby, []);
});

test("zvuk: otevření z adresy #hbot (bez kliknutí) nic nezahraje ani neukáže pozvánku", async () => {
  const { p } = await stranka({ cesta: "/cenik.html#hbot", init: [spehZazitku, zvukZapnut] });
  await p.waitForSelector("#hbot:not([hidden]) .hb-rozc");
  await p.waitForTimeout(500);
  assert.deepEqual(await p.evaluate(() => window.__zaz), { kontexty: 0, zdroje: 0, vibrace: [] });
  const b = await stranka({ cesta: "/cenik.html#hbot", init: [spehZazitku] });
  await b.p.waitForSelector("#hbot:not([hidden]) .hb-rozc");
  await b.p.waitForTimeout(300);
  assert.equal(await b.p.locator("#hbot .hz-pozvanka").count(), 0, "bez vědomé akce žádná pozvánka");
});

// Projde kalkulaci na střechu 120 m² až k obálce.
async function kObalce(p) {
  await p.click("#hbot-btn");
  await p.click("#hbot .hb-cena-hned");
  await p.click("#hbot label[for=hn-typ-rd]");
  await p.waitForSelector("#hbot label[for=hn-povrch-strecha]");
  await p.click("#hbot label[for=hn-povrch-strecha]");
  await p.click("#hbot .hn-tl--zlate");
  await p.click("#hbot .hn-tl--zlate");
  await p.fill("#hn-plocha-strecha", "120");
  await p.click("#hbot .hn-tl--zlate");
}

test("obálka „Cena hned“: malé hejno s pravdivými popisky do 1,2 s, pečeť jde rozlomit hned; pečeť a cena zazní a zavibrují", async () => {
  const { p, chyby } = await stranka({ init: [spehZazitku, zvukZapnut] });
  await kObalce(p);
  await p.waitForSelector("#hbot .hn-hejno");
  assert.equal(await p.getAttribute("#hbot .hn-hejno", "aria-hidden"), "true", "jen dekorace");
  assert.deepEqual(await p.$$eval("#hbot .hn-hejno-holub", (e) => e.map((x) => x.textContent)), ["Plochy", "Ceník", "Kontrola", "Pečeť"]);
  assert.doesNotMatch(await p.textContent("#hbot .hn-obrad"), /Měří|změřen|QUANTUM/i, "nic se neměřilo – plochy zadal zákazník");
  const trvani = await p.evaluate(() => Math.max(...document.querySelector("#hbot .hn-hejno").getAnimations({ subtree: true }).map((a) => { const t = a.effect.getComputedTiming(); return t.delay + t.activeDuration; })));
  assert.ok(trvani <= 1200, `hejno doběhne do 1,2 s (${trvani} ms)`);
  await p.click("#hbot .hn-pecet"); // hned, bez čekání na hejno
  await p.waitForSelector("#hbot .hn-certifikat");
  await p.waitForFunction(() => JSON.stringify(window.__zaz.vibrace.at(-1)) === "[10,50,10,50,24]");
  const v = await p.evaluate(() => JSON.parse(JSON.stringify(window.__zaz.vibrace)));
  assert.deepEqual(v.slice(-2), [[18, 30, 42], [10, 50, 10, 50, 24]], "pečeť, pak cena");
  assert.deepEqual(chyby, []);
});

test("kalkulace: chyba ve validaci = jemný tón a vibrace [30, 60, 30]; volba karty ťukne", async () => {
  const { p } = await stranka({ init: [spehZazitku, zvukZapnut] });
  await p.click("#hbot-btn");
  await p.click("#hbot .hb-cena-hned");
  await p.waitForSelector("#hbot .hn-karta");
  await p.click("#hbot .hn-tl--zlate"); // bez výběru objektu
  await p.waitForSelector("#hbot .hn-chyba:not([hidden])");
  assert.deepEqual(await p.evaluate(() => JSON.parse(JSON.stringify(window.__zaz.vibrace.at(-1)))), [30, 60, 30]);
  await p.click("#hbot label[for=hn-typ-firma]");
  assert.equal(await p.evaluate(() => window.__zaz.vibrace.at(-1)), 8);
});

// --------------------------------------------------------------------------------------------- 4. HOLUB 360
const ADRESA = "Lipová 12, 280 02 Kolín";
const MERENI = {
  stav: "hotovo", adresa: ADRESA, obec: "Kolín", okres: "Kolín", poloha: { lat: 50.028, lon: 15.201 },
  plochy: { strecha: 190, fasady: 340, pudorys: 150 },
  obrys: [{ lat: 50.02795, lng: 15.20085 }, { lat: 50.02795, lng: 15.20115 }, { lat: 50.02806, lng: 15.20115 }, { lat: 50.02806, lng: 15.20085 }],
  zdroje: ["ČÚZK"],
};
// Měření čeká, dokud test nezavolá pust(odpověď).
async function h360({ pohyb = "no-preference", sirka = 1440, vyska = 900, init = [] } = {}) {
  let pust;
  const odpoved = new Promise((ok) => { pust = ok; });
  const s = await stranka({
    cesta: "/holub-360/", sirka, vyska, pohyb, init,
    pred: (ctx) => ctx.route("**/api/cena-z-adresy**", async (r) => {
      if (r.request().method() === "GET") return r.fulfill({ json: { navrhy: [{ kod: 21717718, adresa: ADRESA }] } });
      const o = await odpoved;
      return o.status ? r.fulfill({ status: o.status, json: o.telo || {} }) : r.fulfill({ json: o });
    }),
  });
  await s.p.waitForSelector('body[data-h3a="pripraveno"]');
  return { ...s, pust };
}
async function zmer(p) {
  await p.click("#h3a-adresa-vstup");
  await p.type("#h3a-adresa-vstup", "Lip", { delay: 20 });
  await p.waitForSelector("#h3a-navrhy:not([hidden]) li[role=option]");
  await p.keyboard.press("ArrowDown");
  await p.keyboard.press("Enter");
}
const stavy = (p) => p.$$eval("#h3a-hejno-kroky .h3a-holub", (e) => e.map((x) => `${x.dataset.krok}:${x.dataset.stav}`));

test("HOLUB 360: hejno při měření – Měří jen během skutečného požadavku, pak Počítá · Ověřuje · Komunikuje; stavový řádek; zvuky", async () => {
  const { p, chyby, pust } = await h360({ init: [spehZazitku, zvukZapnut] });
  assert.equal(await p.isHidden("#h3a-hejno-kroky"), true, "před měřením hejno není");
  assert.equal(await p.getAttribute("#h3a-hejno-stav", "role"), "status");
  await zmer(p);
  await p.waitForSelector("#h3a-hejno-kroky:not([hidden])");
  assert.deepEqual(await stavy(p), ["meri:bezi", "pocita:ceka", "overuje:ceka", "komunikuje:ceka"]);
  assert.match(await p.textContent("#h3a-hejno-stav"), /^Měří – obkresluje obrys domu/);
  assert.match(await p.textContent("#h3a-hejno-kroky"), /Měří.*Počítá.*Ověřuje.*Komunikuje/s);
  assert.ok(await p.evaluate(() => document.querySelector("[data-krok=meri] .h3a-holub-obrys path").getAnimations().length > 0), "obkreslování obrysu běží");
  await p.waitForTimeout(600);
  assert.deepEqual(await stavy(p), ["meri:bezi", "pocita:ceka", "overuje:ceka", "komunikuje:ceka"], "bez odpovědi se dál nic nerozsvítí");
  pust(MERENI);
  await p.waitForSelector("#h3a-vysledek:not([hidden])");
  assert.deepEqual(await stavy(p), ["meri:hotovo", "pocita:hotovo", "overuje:hotovo", "komunikuje:hotovo"]);
  assert.equal(await p.textContent("#h3a-hejno-stav"), "Komunikuje – výsledek máte níže.");
  assert.match((await p.textContent("[data-krok=pocita] .h3a-holub-prace")).replace(/\u00a0/g, " "), /střecha 190 m² · fasáda 340 m²/);
  assert.equal(await p.inputValue("#h3a-plocha-strecha"), "190", "výsledek je hned vidět");
  // Zvuk: křídla při startu, fajfka po změření (výstup vznikl kliknutím); žádná chyba stránky.
  await p.waitForFunction(() => window.__zaz.zdroje >= 10, null, { timeout: 2000 }); // křídla (5 + odemknutí) + fajfka (4)
  assert.equal(await p.evaluate(() => window.__zaz.kontexty), 1);
  assert.deepEqual(await axeVazne(p, "#h3a-adresa-karta"), []);
  assert.deepEqual(chyby, []);
});

test("HOLUB 360: chyba měření hejno vrátí do klidu; omezení pohybu = statický seznam bez animací", async () => {
  const a = await h360();
  await zmer(a.p);
  await a.p.waitForSelector("#h3a-hejno-kroky:not([hidden])");
  a.pust({ status: 503, telo: { chyba: "Mimo provoz" } });
  await a.p.waitForFunction(() => /Měření teď není dostupné/.test(document.getElementById("h3a-adresa-stav").textContent));
  assert.equal(await a.p.isHidden("#h3a-hejno-kroky"), true);
  assert.deepEqual(await stavy(a.p), ["meri:ceka", "pocita:ceka", "overuje:ceka", "komunikuje:ceka"]);
  assert.equal(await a.p.textContent("#h3a-hejno-stav"), "");
  assert.deepEqual(a.chyby, []);

  const b = await h360({ pohyb: "reduce", sirka: 390, vyska: 844 });
  await zmer(b.p);
  await b.p.waitForSelector("#h3a-hejno-kroky:not([hidden])");
  // Stránka při omezení pohybu zkracuje všechny přechody na 0,01 ms – počítají se jen skutečné (delší nebo nekonečné) animace.
  const dlouhe = () => b.p.evaluate(() => document.getElementById("h3a-hejno").getAnimations({ subtree: true })
    .filter((x) => { const t = x.effect.getComputedTiming(); return t.iterations === Infinity || t.duration > 50; }).length);
  assert.equal(await dlouhe(), 0, "žádné obkreslování ani mávání");
  const snimek = () => b.p.evaluate(() => [...document.querySelectorAll("#h3a-hejno-kroky canvas")].map((c) => c.toDataURL()).join("|"));
  const prvni = await snimek();
  await b.p.waitForTimeout(400);
  assert.equal(await snimek(), prvni, "holubi na plátně stojí (žádná smyčka kreslení)");
  b.pust(MERENI);
  await b.p.waitForSelector("#h3a-vysledek:not([hidden])");
  assert.deepEqual(await stavy(b.p), ["meri:hotovo", "pocita:hotovo", "overuje:hotovo", "komunikuje:hotovo"]);
  assert.equal(await b.p.evaluate(() => document.querySelectorAll("#h3a-hejno-kroky .h3a-holub-fajfka").length), 4);
  assert.equal(await b.p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0, "390 px bez vodorovného posunu");
  assert.deepEqual(await axeVazne(b.p, "#h3a-adresa-karta"), []);
  assert.deepEqual(b.chyby, []);
});

test("HOLUB 360: přepínač „Zvuk a vibrace“ v hlavičce (sdílený s H-BOTem), pečeť zazní a zavibruje; kulisa respektuje hlavní vypínač", async () => {
  const { p, chyby, pust } = await h360({ init: [spehZazitku, zvukZapnut] });
  const tl = "#h3a-zazitek";
  await p.waitForSelector(`${tl}:not([hidden])`);
  assert.equal(await p.getAttribute(tl, "aria-pressed"), "true", "zákazník si zvuk zapnul dříve");
  assert.equal(await p.getAttribute(tl, "aria-label"), "Zvuk");
  assert.match(await p.textContent(tl), /Zvuk/);
  assert.equal(await p.evaluate(() => !!document.querySelector("#h3a-zazitek").closest(".h3a-hlavicka")), true);
  await zmer(p);
  pust(MERENI);
  await p.waitForSelector("#h3a-obalka:not([hidden])");
  await p.click("#h3a-pecet");
  await p.waitForSelector("#h3a-certifikat:not([hidden])");
  await p.waitForFunction(() => window.__zaz.vibrace.length >= 2);
  const v = await p.evaluate(() => JSON.parse(JSON.stringify(window.__zaz.vibrace)));
  assert.deepEqual(v.slice(-2), [[18, 30, 42], [10, 50, 10, 50, 24]]);
  // Vypnutí v hlavičce platí i v panelu H-BOTa na téže stránce.
  await p.click(tl);
  assert.equal(await p.getAttribute(tl, "aria-pressed"), "false");
  await p.click("#hbot-btn");
  await p.waitForSelector("#hbot .hb-zazitek:not(.hb-zazitek--ceka)");
  assert.equal(await p.getAttribute("#hbot .hb-zazitek", "aria-pressed"), "false");
  await p.click("#hbot .hb-zazitek");
  assert.equal(await p.getAttribute(tl, "aria-pressed"), "true", "oba přepínače ukazují totéž");
  assert.equal(await p.evaluate(() => document.querySelectorAll('script[src$="/hspg-zazitek.js"]').length), 1, "modul se nenačte dvakrát");
  // Zvuková kulisa v úvodu: hlavní vypínač ji vypne; zapnutí kulisy zapne i hlavní vypínač.
  await p.click("#hbot .hb-close");
  assert.match(await p.textContent("#h3a-zvuk"), /Zvuková kulisa: vypnutá/);
  await p.click("#h3a-zvuk");
  await p.waitForSelector('#h3a-zvuk[aria-pressed="true"]');
  await p.click(tl);
  await p.waitForSelector('#h3a-zvuk[aria-pressed="false"]');
  assert.match(await p.textContent("#h3a-zvuk"), /Zvuková kulisa: vypnutá/);
  await p.click("#h3a-zvuk");
  await p.waitForSelector('#h3a-zvuk[aria-pressed="true"]');
  assert.equal(await p.getAttribute(tl, "aria-pressed"), "true");
  assert.deepEqual(chyby, []);
});

test("HOLUB 360: výchozí vypnuto; start zaměření ukáže pozvánku u přepínače v hlavičce; Zapnout uloží „1“ a zapne oba přepínače", async () => {
  const { p, chyby, pust } = await h360({ init: [spehZazitku] });
  const tl = "#h3a-zazitek";
  await p.waitForSelector(`${tl}:not([hidden])`);
  assert.equal(await p.getAttribute(tl, "aria-pressed"), "false");
  assert.equal(await p.locator(".hz-pozvanka").count(), 0, "před vědomou akcí nic");
  await zmer(p);
  const poz = "#h3a-adresa-karta .h3a-zazitek-radek .hz-pozvanka";
  await p.waitForSelector(poz);
  // Pozvánka je v kartě adresy (hlavička je nad výřezem) a celá ve výřezu okna.
  const r = await p.evaluate((sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return { top: b.top, bottom: b.bottom, left: b.left, right: b.right, h: innerHeight, w: innerWidth }; }, poz);
  assert.ok(r.top >= 0 && r.bottom <= r.h && r.left >= 0 && r.right <= r.w, `pozvánka ve výřezu: ${JSON.stringify(r)}`);
  assert.deepEqual(await p.evaluate(() => window.__zaz), { kontexty: 0, zdroje: 0, vibrace: [] }, "vypnuto: křídla nezazní");
  pust(MERENI);
  await p.waitForSelector("#h3a-vysledek:not([hidden])");
  await p.click(`${poz} .hz-pozvanka-ano`);
  await p.waitForFunction(() => window.__zaz.zdroje > 1);
  assert.equal(await p.getAttribute(tl, "aria-pressed"), "true");
  assert.equal(await p.evaluate(() => localStorage.getItem("hspg-zazitek")), "1");
  assert.deepEqual(await p.evaluate(() => JSON.parse(JSON.stringify(window.__zaz.vibrace))), [8]);
  assert.equal(await p.locator(poz).count(), 0);
  assert.equal(await p.getAttribute("#h3a-zazitek-karta", "aria-pressed"), "true", "oba přepínače HOLUB 360 ukazují totéž");
  assert.deepEqual(await axeVazne(p, "#h3a-adresa-karta"), []);
  assert.deepEqual(chyby, []);
});
