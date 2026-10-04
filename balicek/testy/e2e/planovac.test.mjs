// E2E: veřejný plánovač termínu (/planovac/), poděkování a dárkový kupon (/kupon/) ve skutečném Chromiu.
// Falešná předpověď a kalendář zakázek z testy/pomocne.mjs – nic nejde na internet.
// Spuštění: HSPG_MIRROR=/cesta/k/mirror/hspg.cz CHROMIUM=/opt/pw-browsers/chromium npm run test:e2e
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { spustServer } from "../server.mjs";
import { vytvorKupon } from "../../web/netlify/lib/planovac/kupony.mjs";

const require = createRequire(import.meta.url);
const AXE = require.resolve("axe-core/axe.min.js");
const CFG = JSON.parse(await readFile(new URL("../../web/content/planovac.json", import.meta.url), "utf8"));
let prohlizec;
const servery = [];

before(async () => {
  prohlizec = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
});
after(async () => {
  await prohlizec?.close();
  await Promise.all(servery.map((s) => s.zavri()));
});

async function stranka({ cesta = "/planovac/", sirka = 1280, vyska = 900, kalendar = true, js = true, pred } = {}) {
  const s = await spustServer({ rezim: "bez-ai", kalendar });
  servery.push(s);
  const ctx = await prohlizec.newContext({ viewport: { width: sirka, height: vyska }, javaScriptEnabled: js });
  const venku = [];
  // Externí služby (GTM, Clarity) test nepotřebuje – a stránka plánovače žádné volat nemá.
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => { venku.push(r.request().url()); return r.abort(); });
  if (pred) await pred(ctx);
  const p = await ctx.newPage();
  const chyby = [];
  p.on("pageerror", (e) => chyby.push(e.message));
  const api = [];
  p.on("request", (r) => { const u = new URL(r.url()); if (u.pathname.startsWith("/api/")) api.push(u.pathname + u.search); });
  await p.goto(s.url + cesta, { waitUntil: "domcontentloaded" });
  return { p, s, ctx, chyby, api, venku };
}

const novyKupon = (s) => vytvorKupon(s.ulozistePlanovac, { poznamka: "e2e" }, CFG.kupon);
const bezMezer = (t) => String(t).replace(/ /g, " ").replace(/\s+/g, " ").trim();
const bezDoplnit = (t) => bezMezer(String(t).replace(/\s*\[DOPLNIT[^\]]*\]/g, ""));

async function vyberObec(p, dotaz, nazev) {
  await p.fill("#obec", "");
  await p.type("#obec", dotaz, { delay: 30 });
  const volba = p.locator("#obec-navrhy li[role=option]", { hasText: new RegExp(`^${nazev}\\s`) }).first();
  await volba.waitFor();
  await volba.click();
}

async function axe(p) {
  await p.addScriptTag({ path: AXE });
  return p.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }))
    .violations.map((v) => ({ id: v.id, impact: v.impact, cil: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) })));
}

test("plánovač: načte se bez chyb, našeptávač → Kolín, 21 dnů s obsazeností a fakty o počasí", async () => {
  const { p, s, chyby, api, venku } = await stranka();
  await p.waitForSelector("#kal-dny .pl-den");
  assert.equal(await p.locator("h1").count(), 1);
  assert.equal(await p.getAttribute('link[rel="canonical"]', "href"), "https://hspg.cz/planovac/");
  assert.equal(await p.locator("#kal-dny .pl-den").count(), CFG.horizontDni, "21 dnů ještě bez obce (jen obsazenost)");

  // Našeptávač: min. 2 znaky, prodleva ≥ 300 ms, ovládání klávesnicí.
  await p.type("#obec", "K", { delay: 20 });
  await p.waitForTimeout(450);
  assert.equal(api.filter((u) => u.includes("navrh=")).length, 0, "po 1 znaku se nic nehledá");
  await p.type("#obec", "ol", { delay: 20 });
  await p.waitForSelector("#obec-navrhy:not([hidden]) li[role=option]");
  assert.equal(api.filter((u) => u.includes("navrh=")).length, 1, "jeden dotaz po dopsání (debounce)");
  assert.equal(await p.getAttribute("#obec", "role"), "combobox");
  assert.equal(await p.getAttribute("#obec", "aria-expanded"), "true");
  await p.keyboard.press("ArrowDown");
  assert.equal(await p.getAttribute("#obec", "aria-activedescendant"), "obec-n0");
  assert.equal(await p.getAttribute("#obec-n0", "aria-selected"), "true");
  await p.keyboard.press("Escape");
  assert.equal(await p.isHidden("#obec-navrhy"), true);
  await vyberObec(p, "Kol", "Kolín");
  assert.equal(await p.inputValue("#obec"), "Kolín");
  await p.waitForSelector("#obec-info >> text=Předpověď počasí pro: Kolín (okres Kolín)");
  assert.ok(api.some((u) => u.startsWith("/api/planovac?obec=Kol%C3%ADn&kod=533165")), "dotaz s kódem obce z našeptávače");

  // Mřížka odpovídá API: obsazenost, déšť jen jako fakt (mm), teplota, vítr.
  const data = await (await fetch(`${s.url}/api/planovac?obec=Kol%C3%ADn&kod=533165`)).json();
  assert.equal(data.dny.length, 21);
  const tlacitka = p.locator("#kal-dny .pl-den");
  assert.equal(await tlacitka.count(), 21);
  const prvni = tlacitka.nth(0);
  assert.equal(data.dny[0].volno, false, "falešný kalendář má zakázku zítra (kapacita 1)");
  assert.equal(await prvni.isDisabled(), true, "zítřek je obsazený");
  assert.match(await prvni.innerText(), /obsazeno/);
  let destivych = 0;
  for (const [i, d] of data.dny.entries()) {
    const text = await tlacitka.nth(i).innerText();
    if (!d.pracovni) { assert.match(text, /nepracujeme/); assert.equal(await tlacitka.nth(i).isDisabled(), true); }
    if (!d.pocasi) continue;
    assert.match(text, new RegExp(`${d.pocasi.tmin}–${d.pocasi.tmax}\\u00a0°C`), `teplota ${d.datum}`);
    assert.match(text, /vítr 3 m\/s/);
    if (!d.pocasi.sucho) { destivych++; assert.match(text, new RegExp(`☔\\s+srážky\\s+${String(d.pocasi.srazky).replace(".", ",")}\\u00a0mm`), `déšť ${d.datum}`); }
    else if (!d.pocasi.srazky) assert.match(text, /bez deště/);
  }
  assert.ok(destivych >= 2, `falešná předpověď má deštivé dny (${destivych})`);
  assert.ok(data.dny.some((d) => d.pocasi === null), "za dosahem předpovědi bez počasí");

  // Uvedení zdroje (MET Norway + licence + RÚIAN) a věta o počasí; žádné hodnocení vhodnosti.
  const zdroj = p.locator("#kal-zdroj");
  assert.equal(await zdroj.isVisible(), true);
  assert.equal(await zdroj.locator('a[href="https://api.met.no/"]').count(), 1);
  assert.equal(await zdroj.locator('a[href="https://creativecommons.org/licenses/by/4.0/"]').count(), 1);
  assert.match(await zdroj.innerText(), /Aktualizováno \d+\.\s\d+\.\s\d+:\d\d\..*ČÚZK.*RÚIAN/s);
  assert.match(await p.innerText("main"), /Konečný termín potvrdíme podle aktuální předpovědi – při dešti ho po dohodě posuneme a sleva zůstává\./);
  assert.doesNotMatch(await p.innerText("#kal-dny"), /vhodn/i);

  // Nabídky z API (stejné jako content/planovac.json) a upozornění, dokud nejsou podmínky potvrzené.
  assert.match(bezMezer(await p.innerText("#nabidka-sleva h2")), /^Rezervujte online a ušetřete 10 %$/);
  assert.equal(await p.isVisible('[data-n="sleva-pozn"]'), !CFG.sleva.potvrzeno);
  assert.equal(await p.isVisible('[data-n="kupon-pozn"]'), !CFG.kupon.potvrzeno);
  assert.doesNotMatch(await p.innerText("main"), /DOPLNIT/);
  assert.deepEqual(chyby, []);
  assert.deepEqual(venku, [], "stránka nevolá nic mimo vlastní web");
  assert.ok(api.every((u) => /^\/api\/(planovac|kupon)\b/.test(u)), api.join(", "));
});

test("výběr termínu a náhradního termínu vyplní pole; klávesnice; Lipová nabídne okresy; neznámá obec", async () => {
  const { p, chyby } = await stranka();
  await p.waitForSelector("#kal-dny .pl-den");
  const volne = p.locator("#kal-dny .pl-den:not(:disabled)");
  const d1 = await volne.nth(0).getAttribute("data-datum");
  const d2 = await volne.nth(1).getAttribute("data-datum");
  await volne.nth(0).click();
  assert.equal(await p.inputValue("#termin"), d1);
  assert.equal(await p.getAttribute(`[data-datum="${d1}"]`, "aria-pressed"), "true");
  assert.equal(await p.getAttribute('[data-rezim="nahradni"]', "aria-pressed"), "true", "po termínu se vybírá náhradní");
  assert.equal(await p.evaluate(() => document.activeElement?.dataset?.datum), d1, "fokus zůstává na dni");
  await p.click(`[data-datum="${d2}"]`);
  assert.equal(await p.inputValue("#nahradni"), d2);
  assert.match(await p.innerText("#kal-stav"), /^Termín: .+ · náhradní termín: .+/);
  assert.match(await p.innerText(`[data-datum="${d1}"]`), /termín/);
  assert.match(await p.innerText(`[data-datum="${d2}"]`), /náhradní/);
  // Druhé klepnutí výběr zruší; klávesnice: Enter i mezerník na dni.
  await p.click(`[data-datum="${d1}"]`);
  assert.equal(await p.inputValue("#termin"), "");
  assert.equal(await p.getAttribute('[data-rezim="termin"]', "aria-pressed"), "true", "po zrušení termínu se vybírá znovu termín");
  await p.focus(`[data-datum="${d1}"]`);
  await p.keyboard.press("Enter");
  assert.equal(await p.inputValue("#termin"), d1);
  assert.equal(await p.evaluate(() => document.activeElement?.dataset?.datum), d1, "fokus zůstává na dni i po překreslení");
  await p.click('[data-rezim="nahradni"]');
  await p.keyboard.press("Tab"); // fokus jinam; pak mezerník na třetím dni
  const d3 = await volne.nth(2).getAttribute("data-datum");
  await p.focus(`[data-datum="${d3}"]`);
  await p.keyboard.press("Space");
  assert.equal(await p.inputValue("#nahradni"), d3);
  assert.equal(await p.inputValue("#termin"), d1);
  // Ruční zadání data se promítne do kalendáře.
  await p.fill("#nahradni", "");
  await p.dispatchEvent("#nahradni", "change");
  assert.equal(await p.getAttribute(`[data-datum="${d3}"]`, "aria-pressed"), "false");

  // Nejednoznačná obec: tlačítka okresů, výběr načte počasí pro správnou obec.
  await p.fill("#obec", "Lipová");
  await p.keyboard.press("Tab");
  await p.waitForSelector("#obec-okresy:not([hidden]) .pl-ok");
  assert.ok(await p.locator("#obec-okresy .pl-ok").count() >= 2);
  await p.click("#obec-okresy .pl-ok >> text=Lipová – okres Cheb");
  await p.waitForSelector("#obec-info >> text=Předpověď počasí pro: Lipová (okres Cheb)");
  assert.equal(await p.inputValue("#obec"), "Lipová (okres Cheb)");
  assert.equal(await p.isHidden("#obec-okresy"), true);
  assert.equal(await p.inputValue("#termin"), d1, "výběr termínu zůstal");

  // Neznámá obec: hláška, plánovač funguje dál bez předpovědi.
  await p.fill("#obec", "Xyzzyqov");
  await p.keyboard.press("Tab");
  await p.waitForSelector("#obec-info >> text=/jsme v.seznamu nenašli/");
  assert.equal(await p.locator("#kal-dny .pl-den").count(), 21);
  assert.equal(await p.isHidden("#kal-zdroj"), true);
  assert.deepEqual(chyby, []);
});

test("kupon v plánovači: ověření jen při změně pole, platný / neplatný / špatný tvar; odeslání rezervace", async () => {
  const { p, s, api, chyby } = await stranka();
  const k = await novyKupon(s);
  await p.waitForSelector("#kal-dny .pl-den");
  // Psaní po znacích neposílá dotazy (limit 20 ověření za hodinu).
  await p.type("#kupon", k.kod.toLowerCase().replace(/-/g, " "), { delay: 15 });
  assert.equal(api.filter((u) => u.startsWith("/api/kupon")).length, 0);
  await p.keyboard.press("Tab");
  await p.waitForSelector("#kupon-stav.ok");
  assert.equal(await p.inputValue("#kupon"), k.kod, "kód se srovná do tvaru HS-XXXX-XXXX");
  assert.match(bezMezer(await p.innerText("#kupon-stav")), new RegExp(`Kupon platí: 1 litr impregnace H-STONE zdarma · platnost do ${Number(k.platnostDo.slice(8))}\\. ${Number(k.platnostDo.slice(5, 7))}\\. ${k.platnostDo.slice(0, 4)}`));
  assert.equal(api.filter((u) => u.startsWith("/api/kupon")).length, 1);

  await p.fill("#kupon", "HS-0000-0000");
  await p.keyboard.press("Tab");
  await p.waitForSelector("#kupon-stav >> text=/Kupon s tímto kódem neexistuje/");
  assert.match(await p.innerText("#kupon-stav"), /odeslat i\s+tak/);
  await p.fill("#kupon", "abc");
  await p.keyboard.press("Tab");
  await p.waitForSelector("#kupon-stav >> text=/nemá správný tvar/");
  assert.equal(api.filter((u) => u.startsWith("/api/kupon")).length, 2, "špatný tvar se neověřuje na serveru");

  // Odeslání: neplatný tvar kuponu odeslání neblokuje; tady ale vrátíme platný kód.
  await p.fill("#kupon", k.kod);
  await p.keyboard.press("Tab");
  await p.waitForSelector("#kupon-stav.ok");
  assert.equal(api.filter((u) => u.startsWith("/api/kupon")).length, 2, "už ověřený kód se znovu neposílá");
  await p.selectOption("#sluzba", "Čištění + impregnace H-STONE");
  await vyberObec(p, "Kol", "Kolín");
  await p.waitForSelector("#obec-info >> text=Předpověď počasí pro: Kolín");
  await p.fill("#adresa", "TEST Lipová 12");
  const den = await p.locator("#kal-dny .pl-den:not(:disabled)").first().getAttribute("data-datum");
  await p.click(`[data-datum="${den}"]`);
  await p.fill("#jmeno", "TEST Testovací");
  await p.fill("#tel", "+420 777 123 456");
  await p.fill("#mail", "test@example.com");
  await p.check('input[name="Souhlas se zpracováním osobních údajů"]');
  await Promise.all([p.waitForURL("**/planovac/dekujeme/"), p.click("#rezervace button[type=submit]")]);
  assert.equal(s.formulare.length, 1);
  const f = s.formulare[0];
  assert.equal(f["form-name"], "hspg-rezervace");
  assert.equal(f["Termín"], den);
  assert.equal(f["Náhradní termín"], "");
  assert.equal(f["Obec"], "Kolín");
  assert.equal(f["Kód kuponu"], k.kod);
  assert.equal(f["Služba"], "Čištění + impregnace H-STONE");
  assert.equal(f["Adresa objektu"], "TEST Lipová 12");
  assert.equal(f["_honey"], "");
  // Poděkování: pracovní doba, věta o počasí a o kuponu; noindex.
  const text = await p.innerText("main");
  assert.match(text, /Po–So 7:00–19:00/);
  assert.match(text, /Konečný termín potvrdíme podle aktuální předpovědi – při dešti ho po dohodě posuneme a\s+sleva zůstává\./);
  assert.match(text, /Po dokončení zakázky vám rádi dáme dárkový kupon pro sousedy a známé/);
  assert.match(await p.getAttribute('meta[name="robots"]', "content"), /noindex/);
  assert.equal(await p.locator("h1").count(), 1);
  assert.deepEqual(chyby, []);
});

test("odeslání přes fetch selže → formulář se odešle klasicky; výpadek API a limit kuponů nic nerozbijí", async () => {
  const { p, chyby } = await stranka({
    pred: async (ctx) => {
      await ctx.route((u) => u.pathname === "/", (r) => (r.request().method() === "POST" ? r.abort() : r.continue()));
      await ctx.route("**/api/planovac*", (r) => r.fulfill({ status: 500, contentType: "application/json", body: '{"chyba":"x"}' }));
      await ctx.route("**/api/kupon*", (r) => r.fulfill({ status: 429, contentType: "application/json", body: '{"chyba":"Příliš mnoho pokusů. Zkuste to prosím za hodinu, nebo nám zavolejte."}' }));
    },
  });
  await p.waitForSelector("#kal-info >> text=/Kalendář se teď nepodařilo načíst/");
  assert.equal(await p.isHidden("#kalendar"), true);
  await p.fill("#kupon", "HS-ABCD-EFGH");
  await p.keyboard.press("Tab");
  await p.waitForSelector("#kupon-stav >> text=/Příliš mnoho pokusů/");
  await p.selectOption("#sluzba", "Čištění");
  await p.fill("#obec", "Kolín");
  await p.fill("#adresa", "TEST Lipová 12");
  await p.fill("#termin", "2031-06-10");
  await p.fill("#jmeno", "TEST Testovací");
  await p.fill("#tel", "+420 777 123 456");
  await p.fill("#mail", "test@example.com");
  await p.check('input[name="Souhlas se zpracováním osobních údajů"]');
  await Promise.all([p.waitForURL("**/planovac/dekujeme/"), p.click("#rezervace button[type=submit]")]);
  assert.match(await p.innerText("h1"), /Děkujeme/);
  assert.deepEqual(chyby, []);
});

test("bez JavaScriptu: obyčejný formulář s datem, statické nabídky odpovídají content/planovac.json", async () => {
  const { p, chyby } = await stranka({ js: false });
  const form = p.locator('form[name="hspg-rezervace"]');
  assert.equal(await form.getAttribute("action"), "/planovac/dekujeme/");
  assert.equal(await form.getAttribute("method"), "POST");
  assert.equal(await p.inputValue('input[name="form-name"]'), "hspg-rezervace");
  assert.equal(await p.locator('input[name="_honey"]').count(), 1);
  assert.equal(await p.getAttribute('input[name="Termín"]', "type"), "date");
  assert.equal(await p.isVisible('input[name="Termín"]'), true);
  assert.equal(await p.isVisible('input[name="Náhradní termín"]'), true);
  assert.equal(await p.isHidden("#kalendar"), true, "kalendář jen s JS");
  for (const n of ["Služba", "Obec", "Adresa objektu", "Termín", "Jméno", "Telefon", "email"]) {
    assert.equal(await p.locator(`[name="${n}"][required]`).count(), 1, `${n} je povinné`);
  }
  for (const n of ["Náhradní termín", "Kód kuponu", "Poznámka", "Typ povrchu"]) {
    assert.equal(await p.locator(`[name="${n}"]:not([required])`).count(), 1, `${n} je nepovinné`);
  }
  assert.equal(await p.locator('select[name="Služba"] option').count(), 6);
  assert.equal(await p.locator('a[href="/ochrana-osobnich-udaju"]').first().isVisible(), true);
  // Statický text nabídek = content/planovac.json (bez značek [DOPLNIT]).
  const seznam = async (n) => (await p.locator(`[data-n="${n}"] li`).allTextContents()).map((t) => bezMezer(t.replace("(upřesníme v nabídce)", "").replace("(upřesníme v nabídce)", "")));
  assert.deepEqual(await seznam("sleva-podminky"), CFG.sleva.podminky.map(bezDoplnit));
  assert.deepEqual(await seznam("kupon-podminky"), CFG.kupon.podminky.map(bezDoplnit));
  assert.equal(bezMezer(await p.locator('[data-n="sleva-kratce"]').textContent()), CFG.sleva.kratce);
  assert.equal(bezMezer(await p.locator('[data-n="kupon-kratce"]').textContent()), CFG.kupon.kratce);
  assert.equal(bezMezer(await p.locator('[data-n="kupon-nabidka"]').textContent()), CFG.kupon.nabidka);
  assert.equal(bezMezer(await p.locator('[data-n="kupon-nazev"]').textContent()), CFG.kupon.nazev);
  assert.equal(bezMezer(await p.locator('[data-n="procent"]').textContent()), String(CFG.sleva.procent));
  // Klasické odeslání funguje (POST na action).
  await p.selectOption("#sluzba", "Čištění");
  await p.fill("#obec", "Kolín");
  await p.fill("#adresa", "TEST Lipová 12");
  await p.fill("#termin", "2031-06-10");
  await p.fill("#jmeno", "TEST Testovací");
  await p.fill("#tel", "+420 777 123 456");
  await p.fill("#mail", "test@example.com");
  await p.check('input[name="Souhlas se zpracováním osobních údajů"]');
  await Promise.all([p.waitForURL("**/planovac/dekujeme/"), p.click("#rezervace button[type=submit]")]);
  assert.match(await p.innerText("h1"), /Děkujeme/);
  // /kupon/ bez JS: nabídka, odkaz do plánovače a pole pro kód (GET → /planovac/?kupon=).
  await p.goto(p.url().replace(/\/planovac\/dekujeme\/.*$/, "/kupon/?k=HS-ABCD-EFGH"));
  assert.match(await p.innerText("h1"), /1 litr impregnace H-STONE zdarma/);
  assert.equal(await p.getAttribute("#kupon-cta", "href"), "/planovac/");
  assert.equal(await p.getAttribute(".kp-form", "action"), "/planovac/");
  assert.equal(await p.getAttribute("#kupon-vstup", "name"), "kupon");
  assert.deepEqual(chyby, []);
});

test("bez kalendáře zakázek: pracovní dny ukazují „termín potvrdíme“ a jdou vybrat", async () => {
  const { p, chyby } = await stranka({ kalendar: false });
  await p.waitForSelector("#kal-dny .pl-den");
  const dny = p.locator("#kal-dny .pl-den");
  assert.equal(await dny.count(), 21);
  assert.equal(await p.locator("#kal-dny .pl-den >> text=obsazeno").count(), 0);
  const potvrdime = await p.locator("#kal-dny .pl-den:not(:disabled)").allInnerTexts();
  assert.ok(potvrdime.length >= 17 && potvrdime.every((t) => /termín potvrdíme/.test(t)), "všechny pracovní dny čekají na potvrzení");
  assert.equal(await p.locator("#kal-dny .pl-den:disabled").count(), 21 - potvrdime.length);
  assert.match(await p.innerText("#kal-info"), /vybraný termín vám potvrdíme/);
  await dny.first().click();
  assert.notEqual(await p.inputValue("#termin"), "");
  assert.deepEqual(chyby, []);
});

test("/kupon/?k=KÓD: ověří kód jednou, ukáže platnost a odkaz do plánovače s kódem; tisk; neplatný kód", async () => {
  const { p, s, api, chyby } = await stranka({ cesta: "/" });
  const k = await novyKupon(s);
  await p.goto(`${s.url}/kupon/?k=${k.kod.toLowerCase()}`);
  await p.waitForSelector("#kupon-stav.ok");
  assert.equal(await p.innerText("#kupon-kod"), k.kod);
  assert.match(bezMezer(await p.innerText("#kupon-stav")), /Kupon je platný do \d+\. \d+\. \d{4}/);
  assert.equal(await p.getAttribute("#kupon-cta", "href"), `/planovac/?kupon=${encodeURIComponent(k.kod)}`);
  assert.equal(await p.isVisible("#kupon-tisk"), true);
  assert.equal(api.filter((u) => u.startsWith("/api/kupon")).length, 1, "ověření jen jednou");
  assert.match(await p.getAttribute('meta[name="robots"]', "content"), /noindex/);
  assert.equal(await p.getAttribute('link[rel="canonical"]', "href"), "https://hspg.cz/kupon/");
  assert.equal(await p.locator("h1").count(), 1);
  // Tisk: jen karta kuponu s velkým kódem.
  await p.emulateMedia({ media: "print" });
  assert.equal(await p.isHidden(".hdr"), true);
  assert.equal(await p.isHidden(".kp-form"), true);
  assert.equal(await p.isHidden("#kupon-cta"), true);
  const velikost = await p.evaluate(() => parseFloat(getComputedStyle(document.getElementById("kupon-kod")).fontSize));
  assert.ok(velikost >= 40, `kód v tisku je velký (${velikost} px)`);
  await p.emulateMedia({ media: "screen" });
  // Odkaz vede do plánovače s předvyplněným a ověřeným kódem.
  await Promise.all([p.waitForURL("**/planovac/?kupon=*"), p.click("#kupon-cta")]);
  assert.equal(await p.inputValue("#kupon"), k.kod);
  await p.waitForSelector("#kupon-stav.ok");
  // Neplatný kód: důvod, odkaz bez kódu.
  await p.goto(`${s.url}/kupon/?k=HS-0000-0000`);
  await p.waitForSelector("#kupon-stav >> text=Kupon s tímto kódem neexistuje.");
  assert.equal(await p.getAttribute("#kupon-cta", "href"), "/planovac/");
  assert.equal(await p.isHidden("#kupon-tisk"), true);
  assert.deepEqual(chyby, []);
});

test("předvyplnění ?obec= načte rovnou předpověď", async () => {
  const { p, chyby } = await stranka({ cesta: "/planovac/?obec=Kol%C3%ADn" });
  await p.waitForSelector("#obec-info >> text=Předpověď počasí pro: Kolín");
  assert.equal(await p.inputValue("#obec"), "Kolín");
  assert.ok(await p.locator("#kal-dny .pl-den >> text=/°C/").count() > 0);
  assert.deepEqual(chyby, []);
});

test("přístupnost (axe, WCAG 2.1 A/AA): /planovac/ s kalendářem a výběrem, /kupon/, poděkování", async () => {
  const { p, s } = await stranka();
  await p.waitForSelector("#kal-dny .pl-den");
  await vyberObec(p, "Kol", "Kolín");
  await p.waitForSelector("#kal-zdroj:not([hidden])");
  const volne = p.locator("#kal-dny .pl-den:not(:disabled)");
  await volne.nth(0).click();
  await volne.nth(1).click();
  await p.fill("#kupon", "HS-0000-0000");
  await p.keyboard.press("Tab");
  await p.waitForSelector("#kupon-stav.chyba");
  await p.locator("details").first().evaluate((d) => { d.open = true; });
  assert.deepEqual(await axe(p), [], "/planovac/");
  await p.fill("#obec", "Lipová");
  await p.keyboard.press("Tab");
  await p.waitForSelector("#obec-okresy:not([hidden]) .pl-ok");
  assert.deepEqual(await axe(p), [], "/planovac/ s výběrem okresu");
  await p.focus("#obec");
  await p.fill("#obec", "");
  await p.type("#obec", "Kol", { delay: 20 });
  await p.waitForSelector("#obec-navrhy:not([hidden]) li");
  assert.deepEqual(await axe(p), [], "/planovac/ s otevřeným našeptávačem");
  const k = await novyKupon(s);
  await p.goto(`${s.url}/kupon/?k=${k.kod}`);
  await p.waitForSelector("#kupon-stav.ok");
  assert.deepEqual(await axe(p), [], "/kupon/");
  await p.goto(`${s.url}/planovac/dekujeme/`);
  assert.deepEqual(await axe(p), [], "/planovac/dekujeme/");
});

test("mobil 375 px: bez vodorovného posunu, kalendář ve 3 sloupcích, dny čitelné", async () => {
  const { p, s, chyby } = await stranka({ sirka: 375, vyska: 812 });
  await p.waitForSelector("#kal-dny .pl-den");
  await vyberObec(p, "Kol", "Kolín");
  await p.waitForSelector("#kal-zdroj:not([hidden])");
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "planovac bez vodorovného posunu");
  const sloupce = await p.evaluate(() => getComputedStyle(document.getElementById("kal-dny")).gridTemplateColumns.split(" ").length);
  assert.equal(sloupce, 3);
  const pretece = await p.$$eval("#kal-dny .pl-den", (b) => b.filter((x) => x.scrollWidth > x.clientWidth + 1).length);
  assert.equal(pretece, 0, "text dne se vejde do tlačítka");
  const k = await novyKupon(s);
  await p.goto(`${s.url}/kupon/?k=${k.kod}`);
  await p.waitForSelector("#kupon-stav.ok");
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "kupon bez vodorovného posunu");
  await p.goto(`${s.url}/planovac/dekujeme/`);
  assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "poděkování bez vodorovného posunu");
  assert.deepEqual(chyby, []);
});
