// E2E: okamžitá kalkulace „Cena hned“ v H-BOTovi (úkol 48, R16) ve skutečném Chromiu.
// Bez HSPG_MIRROR běží na zástupných stránkách z testy/fixtures/web. Spuštění:
//   CHROMIUM=/opt/pw-browsers/chromium node --test balicek/testy/e2e/hbot-kalkulace.test.mjs
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { chromium } from "playwright";
import { spustServer } from "../server.mjs";
import { navrhyObci } from "../../web/netlify/lib/pocasi/obce.mjs";

const require = createRequire(import.meta.url);
const AXE = require.resolve("axe-core/axe.min.js");
const WEB = new URL("../../web/", import.meta.url);
const BALICEK = JSON.parse(readFileSync(new URL("assets/hspg-cenik.json", WEB), "utf8"));
let prohlizec;
const servery = [];

before(async () => { prohlizec = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined }); });
after(async () => { await prohlizec?.close(); await Promise.all(servery.map((s) => s.zavri())); });

// Očekávaná cena přímo z cenového jádra (stejný soubor jako v prohlížeči).
function jadro() {
  const ctx = { module: { exports: {} }, Math, Number, String, Object, Array, Promise, Error, isFinite };
  vm.runInNewContext(readFileSync(new URL("assets/hspg-cena.js", WEB), "utf8"), ctx);
  return ctx.module.exports.vytvor(BALICEK);
}
const kc = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " Kč";
const mezery = (t) => String(t).replace(/[\s ]+/g, " ").trim();

async function textPdf(cesta) {
  const pdfjs = await import(new URL("assets/vendor/pdfjs/pdf.min.js", WEB).href);
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("assets/vendor/pdfjs/pdf.worker.min.js", WEB).href;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(readFileSync(cesta)), disableFontFace: true, verbosity: 0 }).promise;
  let t = "";
  for (let i = 1; i <= doc.numPages; i++) t += (await (await doc.getPage(i)).getTextContent()).items.map((x) => x.str).join(" ") + "\n";
  return { stran: doc.numPages, text: mezery(t) };
}

async function stranka({ sirka = 1280, vyska = 860, cesta = "/cenik.html", rezim = "bez-ai", ctxVolby = {}, pred } = {}) {
  const s = await spustServer({ rezim });
  servery.push(s);
  const ctx = await prohlizec.newContext({ viewport: { width: sirka, height: vyska }, acceptDownloads: true, ...ctxVolby });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  if (pred) await pred(ctx);
  const p = await ctx.newPage();
  const chyby = [];
  p.on("pageerror", (e) => chyby.push(e.message));
  p.on("console", (m) => { if (m.type() === "error") chyby.push(m.text()); });
  const pozadavky = [];
  p.on("request", (r) => pozadavky.push({ url: r.url(), metoda: r.method(), telo: r.postData() || "" }));
  await p.goto(s.url + cesta, { waitUntil: "domcontentloaded" });
  return { p, s, chyby, pozadavky };
}

// Projde kalkulaci: rodinný dům, střecha A 190 m², fasáda B (2. odstín palety) z obvodu 40 m × 8,5 m, obec Kolín.
async function projdi(p, { otevrit = true } = {}) {
  if (otevrit) {
    await p.click("#hbot-btn");
    await p.click("#hbot .hb-cena-hned");
  }
  await p.click("#hbot label[for=hn-typ-rd]");
  await p.waitForSelector("#hbot label[for=hn-povrch-strecha]");
  await p.click("#hbot label[for=hn-povrch-strecha]");
  await p.click("#hbot label[for=hn-povrch-fasada]");
  await p.click("#hbot .hn-tl--zlate");
  await p.click("#hbot label[for=hn-cesta-fasada-B]");
  await p.click("#hbot [data-povrch=fasada] .hn-vzorek >> nth=1");
  await p.click("#hbot .hn-tl--zlate");
  await p.fill("#hn-plocha-strecha", "190");
  assert.equal(await p.getAttribute("#hbot [data-povrch=strecha] .hn-odkaz--tichy", "href"), "/holub-360/#h3a-adresa", "„Plochu neznám“ vede na zaměření HOLUB 360");
  await p.click("#hbot [data-povrch=fasada] .hn-odkaz");
  await p.fill("#hn-fasada-obvod", "40");
  await p.fill("#hn-fasada-vyska", "8,5");
  await p.fill("#hn-obec", "Kolí");
  await p.click("#hn-obec-navrhy li >> nth=0");
  await p.click("#hbot .hn-tl--zlate");
}
function ocekavana() {
  const kolin = navrhyObci("Kolín")[0];
  const barva = BALICEK.standard.barvy_renovace.fasada[1];
  return jadro().spocitej({ typObjektu: "rd", lat: kolin.lat, lon: kolin.lon, polozky: [
    { povrch: "strecha", cesta: "A", plocha: 190 },
    { povrch: "fasada", cesta: "B", plocha: 340, barva },
  ] });
}

test("Cena hned: kalkulace se načte až po kliknutí; obálka s pečetí; cena přesně z cenového jádra; PDF kalkulace", async () => {
  const { p, chyby, pozadavky } = await stranka();
  await p.click("#hbot-btn");
  await p.waitForSelector("#hbot .hb-cena-hned");
  assert.ok(!pozadavky.some((r) => /hbot-nabidka|hspg-cena\.js|hspg-dokumenty|pdfmake/.test(r.url)), "kalkulace a PDF se nestahují předem");
  await p.click("#hbot .hb-cena-hned");
  await p.waitForSelector("#hbot .hn-karta");
  assert.equal(await p.textContent("#hb-titulek"), "Cena hned");
  await projdi(p, { otevrit: false });
  await p.waitForSelector("#hbot .hn-pecet");
  assert.equal(await p.locator("#hbot .hn-cena-castka").count(), 0, "cena je do rozlomení pečeti skrytá");
  await p.click("#hbot .hn-pecet");
  await p.waitForSelector("#hbot .hn-certifikat");
  const n = ocekavana();
  await p.waitForFunction((t) => document.querySelector("#hbot .hn-cena-castka")?.textContent === t, kc(n.vysledna), { timeout: 5000 });
  const rozpis = mezery(await p.textContent("#hbot .hn-rozpis"));
  assert.ok(rozpis.includes(mezery(kc(n.radky[0].castka))) && rozpis.includes(mezery(kc(n.radky[1].castka))), rozpis);
  assert.match(rozpis, /RAL \d{4}/);
  assert.match(rozpis, /Doprava.*Hradec Králové/);
  assert.match(mezery(await p.textContent("#hbot .hn-platba")), /záloha 30 % na materiál/);
  // Záruka: číslo (10 let při SENTINEL BASE) jen u cesty A; u barevné renovace (B) jen zákonná práva a odkaz na konečnou smlouvu.
  assert.match(mezery(await p.textContent("#hbot .hn-zaruka:not(.hn-zaruka--b)")), /Záruka 10 let.*Zákonná práva z vadného plnění tím nejsou dotčena\./);
  assert.match(mezery(await p.textContent("#hbot .hn-zaruka--b")), /^Barevná renovace: platí zákonná práva z vadného plnění; smluvní záruku k nátěrovému systému výrobce barvy stanoví konečná smlouva\.$/);
  assert.ok(!pozadavky.some((r) => /pdfmake/.test(r.url)), "pdfmake až po kliknutí na PDF");
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#hbot .hn-akce-tl--zlate")]);
  assert.match(dl.suggestedFilename(), /^HSPG-kalkulace-NK-\d{8}-\d{4}\.pdf$/);
  const pdf = await textPdf(await dl.path());
  assert.ok(pdf.text.includes("ORIENTAČNÍ CENOVÁ KALKULACE"));
  assert.ok(pdf.text.includes(mezery(kc(n.vysledna))), "cena v PDF");
  assert.ok(pdf.text.includes("Používejte biocidy bezpečným způsobem"));
  assert.ok(pozadavky.some((r) => r.url.includes("/assets/vendor/pdfmake/pdfmake.min.js")), "pdfmake hostovaný u sebe");
  assert.ok(!pozadavky.some((r) => /cdn|cdnjs|jsdelivr|unpkg/.test(r.url)), "žádné CDN");
  assert.deepEqual(chyby, []);
});

test("NÁVRH smlouvy o dílo: vznikne jen v prohlížeči (údaje se neodešlou), vodoznak NÁVRH a § 1732", async () => {
  const { p, chyby, pozadavky } = await stranka();
  await projdi(p);
  await p.click("#hbot .hn-pecet");
  await p.waitForSelector("#hbot .hn-certifikat");
  await p.click("#hbot .hn-akce-tl >> text=NÁVRH smlouvy");
  await p.fill("#hn-s-jmeno", "Jana Testovací");
  await p.fill("#hn-s-adresa", "Zkušební 7, Kolín");
  const pred = pozadavky.length;
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#hbot .hn-smlouva .hn-tl--zlate")]);
  assert.match(dl.suggestedFilename(), /^HSPG-NAVRH-smlouvy-o-dilo-NK-/);
  const odeslane = pozadavky.slice(pred).filter((r) => r.metoda !== "GET" || /Testov|Zku%C5%A1ebn|Zkušební/.test(r.url));
  assert.deepEqual(odeslane, [], "jméno ani adresa nikam neodešly");
  const pdf = await textPdf(await dl.path());
  for (const s of ["NÁVRH SMLOUVY O DÍLO", "NEJDE O NABÍDKU", "§ 1732", "§ 2586", "Jana Testovací", "Zkušební 7, Kolín", "Příloha č. 2"]) assert.ok(pdf.text.includes(s), s);
  assert.ok(pdf.stran >= 2);
  assert.deepEqual(chyby, []);
});

test("mobil 390 × 844: lišta „Cena hned“ otevře rovnou kalkulaci; žádný vodorovný posun; axe bez vážných chyb", async () => {
  const { p, chyby } = await stranka({ sirka: 390, vyska: 844 });
  await p.click("#hspg-lista .hl-cena");
  await p.waitForSelector("#hbot .hn-karta");
  assert.equal(new URL(p.url()).pathname, "/cenik.html", "odkaz na /akce/ se s JavaScriptem nepoužije");
  const axe = async (kde) => {
    if (!(await p.evaluate(() => !!window.axe))) await p.addScriptTag({ path: AXE });
    const v = await p.evaluate(async () => (await window.axe.run("#hbot")).violations.map((x) => ({ id: x.id, impact: x.impact, n: x.nodes.length })));
    assert.deepEqual(v.filter((x) => x.impact === "serious" || x.impact === "critical"), [], kde + " " + JSON.stringify(v));
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, kde + ": vodorovný posun");
  };
  await axe("objekt");
  await projdi(p, { otevrit: false });
  await p.waitForSelector("#hbot .hn-pecet");
  await axe("obálka");
  await p.click("#hbot .hn-pecet");
  await p.waitForSelector("#hbot .hn-certifikat");
  await axe("výsledek");
  const box = await p.locator("#hbot").boundingBox();
  assert.ok(box.width <= 390 && box.x >= 0);
  assert.deepEqual(chyby, []);
});

test("bez potvrzeného ceníku se žádná částka neukáže (pravidlo úkolu 27)", async () => {
  const bezPotvrzeni = JSON.stringify({ ...BALICEK, potvrzeni: null });
  const { p } = await stranka({ pred: (ctx) => ctx.route("**/assets/hspg-cenik.json", (r) => r.fulfill({ status: 200, contentType: "application/json", body: bezPotvrzeni })) });
  // Ani v průběhu kalkulace žádné sazby, slevy ani ceny doplňků (jen podmínka záruky z péče SENTINEL).
  await p.click("#hbot-btn");
  await p.click("#hbot .hb-cena-hned");
  await p.click("#hbot label[for=hn-typ-rd]");
  await p.waitForSelector("#hbot label[for=hn-povrch-strecha]");
  await p.click("#hbot label[for=hn-povrch-strecha]");
  await p.click("#hbot label[for=hn-povrch-fasada]");
  assert.doesNotMatch(mezery(await p.textContent("#hbot .hn-telo")), /Kč|%/, "povrchy bez sazeb a slev");
  await p.click("#hbot .hn-tl--zlate");
  await p.waitForSelector("#hbot label[for=hn-cesta-fasada-B]");
  assert.doesNotMatch(mezery(await p.textContent("#hbot .hn-telo")), /Kč\/m²/, "cesty bez sazeb");
  await p.click("#hbot label[for=hn-cesta-fasada-B]");
  await p.click("#hbot [data-povrch=fasada] .hn-vzorek >> nth=1");
  await p.click("#hbot .hn-tl--zlate");
  await p.waitForSelector("#hn-plocha-strecha");
  if (await p.locator("#hbot .hn-med").count()) assert.doesNotMatch(mezery(await p.textContent("#hbot .hn-med")), /Kč/, "měděný prvek bez ceny");
  await p.fill("#hn-plocha-strecha", "190");
  await p.click("#hbot [data-povrch=fasada] .hn-odkaz");
  await p.fill("#hn-fasada-obvod", "40");
  await p.fill("#hn-fasada-vyska", "8,5");
  await p.click("#hbot .hn-tl--zlate");
  await p.waitForSelector("#hbot .hn-vysledek");
  const t = mezery(await p.textContent("#hbot .hn-vysledek"));
  assert.match(t, /Ceník právě potvrzujeme/);
  assert.doesNotMatch(t, /\d Kč/);
  assert.equal(await p.locator("#hbot .hn-pecet").count(), 0);
});

test("prefers-reduced-motion: bez obálky a bez hejna, cena hned bez animace", async () => {
  const { p, chyby } = await stranka({ ctxVolby: { reducedMotion: "reduce" } });
  await projdi(p);
  await p.waitForSelector("#hbot .hn-certifikat");
  assert.equal(await p.locator("#hbot .hn-obalka").count(), 0);
  assert.equal(await p.locator(".hb-hejno").count(), 0, "žádné hejno");
  assert.equal(await p.textContent("#hbot .hn-cena-castka"), kc(ocekavana().vysledna));
  assert.deepEqual(chyby, []);
});

test("odkaz data-hbot-cena na stránce i adresa #cena otevřou kalkulaci", async () => {
  const { p } = await stranka();
  await p.click("main a[data-hbot-cena]");
  await p.waitForSelector("#hbot:not([hidden]) .hn-karta");
  assert.equal(new URL(p.url()).pathname, "/cenik.html");
  const { p: p2 } = await stranka({ cesta: "/cenik.html#cena" });
  await p2.waitForSelector("#hbot:not([hidden]) .hn-karta");
});

test("cesta B bez odstínu nepustí dál; vlastní kód RAL projde; volby jdou ovládat klávesnicí", async () => {
  const { p } = await stranka();
  await p.click("#hbot-btn");
  await p.click("#hbot .hb-cena-hned");
  await p.waitForSelector("#hn-typ-rd", { state: "attached" });
  await p.focus("#hn-typ-rd");
  await p.keyboard.press("Space");
  assert.equal(await p.isChecked("#hn-typ-rd"), true, "výběr mezerníkem");
  await p.focus("#hbot .hn-tl--zlate");
  await p.keyboard.press("Enter");
  await p.waitForSelector("#hn-povrch-fasada", { state: "attached" });
  await p.focus("#hn-povrch-fasada");
  await p.keyboard.press("Space");
  await p.click("#hbot .hn-tl--zlate");
  await p.click("#hbot label[for=hn-cesta-fasada-B]");
  await p.click("#hbot .hn-tl--zlate");
  await p.waitForSelector("#hbot .hn-chyba:not([hidden]) >> text=/Vyberte prosím odstín/");
  await p.fill("#hn-ral-fasada", "RAL 5010");
  await p.click("#hbot .hn-tl--zlate");
  await p.waitForSelector("#hn-plocha-fasada");
});

test("„Zavolejte mi k této kalkulaci“: formulář hspg-zavolejte nese číslo a souhrn kalkulace v poli Zdroj", async () => {
  const { p, s } = await stranka();
  await projdi(p);
  await p.click("#hbot .hn-pecet");
  await p.waitForSelector("#hbot .hn-certifikat");
  await p.click("#hbot .hn-akce-tl >> text=Zavolejte mi");
  await p.waitForSelector("#hbot form.hb-call");
  await p.fill("#hbot form.hb-call input[name=jmeno]", "TEST Kalkulace");
  await p.fill("#hbot form.hb-call input[name=telefon]", "+420 777 123 456");
  await p.click("#hbot form.hb-call button[type=submit]");
  await p.waitForSelector("#hbot .hb-msg >> text=/Děkujeme. Ozveme se/");
  const f = s.formulare.at(-1);
  assert.equal(f["form-name"], "hspg-zavolejte");
  assert.match(f.Zdroj, /^H-BOT · kalkulace NK-\d{8}-\d{4}: střecha A 190 m², fasáda B RAL \d{4} 340 m² · Kolín → /);
});

test("porovnání s jinou nabídkou: PDF se čte v prohlížeči, server vrátí neutrální přehled bodů Standardu HOLUB", async () => {
  const { p, chyby, pozadavky } = await stranka();
  await projdi(p);
  await p.click("#hbot .hn-pecet");
  await p.waitForSelector("#hbot .hn-certifikat");
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#hbot .hn-akce-tl--zlate")]);
  const soubor = await dl.path();
  await p.click("#hbot .hn-akce-tl >> text=Porovnat s jinou nabídkou");
  await p.waitForSelector("#hk-soubor");
  await p.setInputFiles("#hk-soubor", { name: "nabidka.pdf", mimeType: "application/pdf", buffer: readFileSync(soubor) });
  await p.waitForFunction(() => document.getElementById("hk-text")?.value.length > 200, null, { timeout: 15000 });
  assert.ok(!pozadavky.some((r) => r.metoda === "POST" && r.url.includes("/api/konkurence")), "PDF se nikam neposílá, jen text po kliknutí");
  await p.click("#hbot .hk .hn-tl--zlate");
  await p.waitForSelector("#hbot .hk-tabulka tbody tr");
  const post = pozadavky.find((r) => r.metoda === "POST" && r.url.includes("/api/konkurence"));
  assert.ok(post && JSON.parse(post.telo).text.length <= 30000);
  const t = mezery(await p.textContent("#hbot .hk-vysledek"));
  assert.match(t, /Text nabídky zmiňuje \d+ z \d+ bodů/);
  assert.match(t, /nehodnotí/);
  assert.doesNotMatch(t, /lepší|horší|nekvalitní|podvod/i, "žádné hodnocení konkurence");
  assert.deepEqual(chyby.filter((x) => !/Cannot polyfill|@napi-rs/.test(x)), []);
});

test("ochrana: celý postup Standardu HOLUB 01–05, volba „Čištění a ošetření“; při váhání H-BOT nabídne vysvětlení", async () => {
  const { p, chyby } = await stranka();
  await p.click("#hbot-btn");
  await p.click("#hbot .hb-cena-hned");
  await p.click("#hbot label[for=hn-typ-rd]");
  await p.waitForSelector("#hbot label[for=hn-povrch-strecha]");
  await p.click("#hbot label[for=hn-povrch-strecha]");
  await p.click("#hbot .hn-tl--zlate");
  await p.waitForSelector("#hbot .hn-postup");
  assert.equal(await p.locator("#hbot .hn-postup-krok").count(), 5);
  assert.match(mezery(await p.textContent("#hbot .hn-postup")), /01\s*Čištění.*04\s*Oplach.*05\s*Ochranná vrstva podle volby/);
  assert.match(mezery(await p.textContent("#hbot label[for=hn-cesta-strecha-cisteni]")), /Čištění a ošetření/);
  // Trojí přepnutí cesty = váhání → nabídka vysvětlení (nic se samo neotevře).
  for (const c of ["B", "A", "cisteni"]) await p.click(`#hbot label[for=hn-cesta-strecha-${c}]`);
  await p.waitForSelector("#hbot .hn-vahani");
  await p.click("#hbot .hn-vahani .hn-tl");
  await p.waitForFunction(() => /Kroky 01–04 Standardu HOLUB jsou vždy stejné/.test(document.querySelector("#hbot")?.textContent || ""));
  assert.deepEqual(chyby, []);
});
