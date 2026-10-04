// E2E: AI centrum → sekce H-WEATHER CONTROL & plánovač (počasí pro zakázku, zakázky a rezervace,
// kalendář s varováním pro Google, dárkové kupony). Falešná předpověď a kalendář z testy/pomocne.mjs,
// nic nejde na internet. Spuštění: HSPG_MIRROR=… CHROMIUM=… npm run test:e2e
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { spustServer } from "../server.mjs";
import { HESLO } from "../pomocne.mjs";
import { mistni, dalsiDen } from "../../web/netlify/lib/pocasi/ical.mjs";

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

// Přihlášené AI centrum. pozadavky = všechny požadavky stránky (URL, metoda, hlavička authorization).
async function centrum({ sirka = 1280, vyska = 900, kalendar = true, pred } = {}) {
  const s = await spustServer({ kalendar });
  servery.push(s);
  const ctx = await prohlizec.newContext({ viewport: { width: sirka, height: vyska } });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  if (pred) await pred(ctx);
  const p = await ctx.newPage();
  const chyby = [];
  p.on("pageerror", (e) => chyby.push(e.message));
  const pozadavky = [];
  p.on("request", (r) => pozadavky.push({ url: r.url(), metoda: r.method(), auth: r.headers().authorization || "" }));
  await p.goto(s.url + "/ai-centrum/", { waitUntil: "domcontentloaded" });
  await p.fill("#heslo", HESLO);
  await p.click("#formPrihlaseni button");
  await p.waitForSelector("#aplikace:not(.skryte) .cip.on");
  return { p, s, chyby, pozadavky };
}
const api = (pozadavky, cesta) => pozadavky.filter((x) => new URL(x.url).pathname === cesta);
const otevri = async (p, tab) => {
  if ((await p.getAttribute("#hwcOtevrit", "aria-expanded")) !== "true") await p.click("#hwcOtevrit");
  if (tab) await p.click(`#hwcTab-${tab}`);
};
async function axe(p, kde = "#hwc") {
  await p.addScriptTag({ path: AXE });
  return p.evaluate(async (k) => (await window.axe.run(k)).violations.map((x) => ({ id: x.id, impact: x.impact, n: x.nodes.length, cil: x.nodes[0]?.target })), kde);
}
const dnesMistne = () => mistni(Date.now()).datum;
const jePrehled = (u) => u.pathname === "/api/pocasi-prace" && u.searchParams.has("prehled");

test("H-WEATHER: před otevřením sekce žádné požadavky; Kolín → dny s ⛔ v deštivém dni, upozornění na nepotvrzená pravidla, zdroj, axe 0", async () => {
  const { p, chyby, pozadavky } = await centrum();
  await p.waitForTimeout(400);
  assert.equal(await p.isHidden("#hwcObsah"), true, "sekce je zavřená");
  for (const c of ["/api/pocasi-prace", "/api/kupon", "/api/planovac"]) assert.deepEqual(api(pozadavky, c), [], `${c} se nesmí volat při načtení`);

  await otevri(p);
  assert.equal(await p.getAttribute("#hwcOtevrit", "aria-expanded"), "true");
  await p.waitForTimeout(200);
  assert.deepEqual(api(pozadavky, "/api/pocasi-prace"), [], "otevření sekce samo nic nestahuje");

  // Našeptávač z veřejného /api/planovac?navrh= (bez tokenu).
  await p.fill("#hwcObec", "Kol");
  await p.waitForFunction(() => [...document.querySelectorAll("#hwcNavrhy option")].some((o) => o.value === "Kolín (okres Kolín)"));
  const navrh = api(pozadavky, "/api/planovac").at(-1);
  assert.equal(new URL(navrh.url).searchParams.get("navrh"), "Kol");
  assert.equal(navrh.auth, "", "veřejný našeptávač neposílá token");

  await p.fill("#hwcObec", "Kolín (okres Kolín)");
  await p.click("#hwcVyhodnotit");
  await p.waitForSelector("#hwcVysledekPocasi .hwc-den");
  const dotaz = api(pozadavky, "/api/pocasi-prace").at(-1);
  const q = new URL(dotaz.url).searchParams;
  assert.equal(q.get("kod"), "533165", "vybraná obec jde s kódem RÚIAN");
  assert.equal(q.get("typ"), "impregnace", "výchozí typ práce");
  assert.match(dotaz.auth, /^Bearer \S+/, "požadavek s tokenem");

  assert.ok(await p.locator("#hwcVysledekPocasi .hwc-den").count() >= 7, "aspoň týden dní");
  const desta = p.locator(`#hwcVysledekPocasi .hwc-den[data-datum="${dalsiDen(dnesMistne(), 2)}"]`);
  const text = await desta.textContent();
  assert.match(text, /⛔/);
  assert.match(text, /nevhodné/i, "stav i textem, ne jen barvou");
  assert.match(text, /Déšť v\spracovní době/);
  assert.match(text, /Spolehlivost/);
  assert.match(await p.textContent("#hwcVysledekPocasi .hwc-pravidla"), /^Pravidla jsou výchozí odhad – porovnejte je s\stechnickým listem H-STONE a\spotvrďte \(content\/pocasi-prace\.json\)\.$/);
  assert.equal(await p.getAttribute("#hwcVysledekPocasi .hwc-zdroj a[href='https://api.met.no/']", "rel"), "noopener noreferrer");
  assert.match(await p.textContent("#hwcVysledekPocasi .hwc-zdroj"), /MET Norway.*aktualizováno/s);
  assert.match(await p.textContent("#hwcStavPocasi"), /Kolín: \d+ dní – nevhodné \d+/);
  // Typy práce přišly ze serveru (content/pocasi-prace.json).
  assert.deepEqual(await p.$$eval("#hwcTyp option", (o) => o.map((x) => x.value)), ["impregnace", "cisteni", "biocid"]);

  assert.deepEqual(await axe(p), []);

  // Víc obcí stejného jména → tlačítka s okresy → nový dotaz s kódem.
  await p.fill("#hwcObec", "Lipová");
  await p.press("#hwcObec", "Enter");
  await p.waitForSelector("#hwcVysledekPocasi .hwc-vyber button >> text=okres Cheb");
  assert.match(await p.textContent("#hwcStavPocasi"), /Lipová.*vyberte okres/);
  assert.deepEqual(await axe(p), [], "axe s výběrem okresu");
  await p.click("#hwcVysledekPocasi .hwc-vyber button >> text=okres Cheb");
  await p.waitForSelector("#hwcVysledekPocasi h4 >> text=Lipová (okres Cheb)");
  assert.equal(new URL(api(pozadavky, "/api/pocasi-prace").at(-1).url).searchParams.get("kod"), "554626");
  assert.equal(await p.inputValue("#hwcObec"), "Lipová (okres Cheb)");
  assert.deepEqual(chyby, []);
});

test("H-WEATHER: zakázky a rezervace – zítřejší zakázka v Kolíně vyhodnocená, „Lipová“ s radou k okresu, Praha 8 → Praha", async () => {
  const { p, chyby, pozadavky } = await centrum();
  await otevri(p, "zakazky");
  await p.waitForTimeout(200);
  assert.deepEqual(api(pozadavky, "/api/pocasi-prace"), [], "záložka sama nic nestahuje – až tlačítko Načíst");
  await p.click("#hwcNacistPrehled");
  await p.waitForSelector("#hwcVysledekPrehled .hwc-polozka");
  assert.match(api(pozadavky, "/api/pocasi-prace").at(-1).url, /prehled=1/);
  assert.match(await p.textContent("#hwcVysledekPrehled .hwc-kal"), /Kalendář zakázek připojen/);

  const polozka = (nazev) => p.locator("#hwcVysledekPrehled .hwc-polozka", { hasText: nazev });
  const kolin = await polozka("Impregnace střechy – Novák").textContent();
  assert.match(kolin, /Kalendář/);
  assert.match(kolin, /Kolín \(okres Kolín\)/);
  assert.match(kolin, /Impregnace \(H-STONE\)/);
  assert.match(kolin, /okno 8–15\sh/);
  assert.match(kolin, /(✅|⚠️|⛔)\s(vhodné|riziko|nevhodné)/);
  assert.match(kolin, /Spolehlivost/);

  const lipova = await polozka("Mytí dlažby").textContent();
  assert.match(lipova, /Obcí „Lipová“ je víc/);
  assert.match(lipova, /připište do místa okres/);
  assert.match(lipova, /Čištění a tlakové mytí/, "typ práce čitelně i u položky bez vyhodnocení");

  const praha = polozka("Čištění FVE");
  assert.match(await praha.locator(".hwc-kde").textContent(), /^Praha \(okres Praha\) · Čištění a tlakové mytí/);
  assert.match(await praha.textContent(), /Místo v události: Praha 8/);
  assert.match(await praha.textContent(), /(✅|⚠️|⛔)\s(vhodné|riziko|nevhodné)/);

  // Položky seskupené podle dne, nadpis dne s datem.
  assert.ok(await p.locator("#hwcVysledekPrehled .hwc-skupina h4").count() >= 3);
  await p.waitForSelector("#hwcVysledekPrehled .hwc-pravidla");
  assert.match(await p.textContent("#hwcVysledekPrehled"), /Rezervace mimo dosah předpovědi/);
  assert.deepEqual(await axe(p), []);
  assert.deepEqual(chyby, []);
});

test("H-WEATHER: kalendář zakázek nenastaven → návod s HSPG_KALENDAR_ICS_URL", async () => {
  const { p, chyby } = await centrum({ kalendar: false });
  await otevri(p, "zakazky");
  await p.click("#hwcNacistPrehled");
  await p.waitForSelector("#hwcVysledekPrehled .hwc-kal .hwc-info");
  const t = await p.textContent("#hwcVysledekPrehled .hwc-kal");
  assert.match(t, /Vložte do Netlify proměnnou HSPG_KALENDAR_ICS_URL = tajná adresa iCal vašeho kalendáře zakázek \(Google Kalendář → Nastavení → kalendář → Integrace kalendáře\)\. Adresu nikomu neposílejte\./);
  assert.match(await p.textContent("#hwcStavPrehled"), /Načteno: 0 položek/);
  assert.deepEqual(chyby, []);
});

test("H-WEATHER: odkaz pro Google Kalendář – nový odkaz zneplatní starý (404), aktuální vrací text/calendar", async () => {
  const { p, s, chyby, pozadavky } = await centrum();
  await otevri(p, "kalendar");
  await p.click("#hwcOdkaz");
  await p.waitForSelector("#hwcOdkazBox:not([hidden])");
  const stary = await p.inputValue("#hwcOdkazPole");
  assert.match(stary, /^https:\/\/[^/]+\/api\/pocasi-kalendar\/[A-Za-z0-9_-]{43}\.ics$/);
  assert.equal(await p.getAttribute("#hwcOdkazPole", "readonly"), "");
  assert.match(await p.textContent("#hwcPanel-kalendar"), /Odkaz je tajný/);
  const post = api(pozadavky, "/api/pocasi-prace").filter((x) => x.metoda === "POST");
  assert.equal(post.length, 1);
  assert.match(post[0].auth, /^Bearer /);

  // Zrušené potvrzení nic neodešle.
  p.once("dialog", (d) => d.dismiss());
  await p.click("#hwcNovyOdkaz");
  await p.waitForTimeout(300);
  assert.equal(api(pozadavky, "/api/pocasi-prace").filter((x) => x.metoda === "POST").length, 1, "bez potvrzení žádný nový odkaz");

  p.once("dialog", (d) => d.accept());
  await p.click("#hwcNovyOdkaz");
  await p.waitForFunction((st) => document.getElementById("hwcOdkazPole").value !== st, stary);
  const novy = await p.inputValue("#hwcOdkazPole");
  assert.match(novy, /\/api\/pocasi-kalendar\/[A-Za-z0-9_-]{43}\.ics$/);
  assert.notEqual(novy, stary);
  assert.match(await p.textContent("#hwcStavKalendar"), /starý už nefunguje/);

  const r1 = await p.request.get(s.url + new URL(stary).pathname);
  assert.equal(r1.status(), 404, "starý odkaz už nefunguje");
  const r2 = await p.request.get(s.url + new URL(novy).pathname);
  assert.equal(r2.status(), 200);
  assert.match(r2.headers()["content-type"], /^text\/calendar/);
  assert.match(await r2.text(), /BEGIN:VCALENDAR/);

  await p.click("#hwcOdkazKopirovat");
  await p.waitForFunction(() => /zkopírovaný|Schránka není dostupná/.test(document.getElementById("hwcStavKalendar").textContent));
  assert.deepEqual(await axe(p), []);
  assert.deepEqual(chyby, []);
});

test("H-WEATHER: dárkové kupony – kontakt v poznámce odmítnut, vytvoření HS-XXXX-XXXX, karta, text pro SMS, tisk jen karty, seznam a zrušení", async () => {
  const { p, chyby, pozadavky } = await centrum();
  await otevri(p, "kupony");
  await p.waitForSelector("#hwcStavSeznam >> text=Zatím žádné kupony.");
  const seznam = api(pozadavky, "/api/kupon");
  assert.equal(seznam.length, 1, "seznam se stáhne jednou po otevření záložky");
  assert.match(seznam[0].auth, /^Bearer /);
  await p.waitForSelector("#hwcStavNabidek .hwc-pozor >> text=/Podmínky zatím nejsou potvrzené/");

  // Telefon v poznámce → chyba, nic se neodešle.
  await p.fill("#hwcPoznamka", "Novákovi 777 123 456");
  await p.click("#hwcVytvorit");
  await p.waitForSelector("#hwcStavKupon.chyba >> text=/telefon ani e-mail/");
  assert.equal(await p.getAttribute("#hwcPoznamka", "aria-invalid"), "true");
  assert.equal(api(pozadavky, "/api/kupon").filter((x) => x.metoda === "POST").length, 0);

  await p.fill("#hwcPoznamka", "Sousedé Novákových");
  await p.click("#hwcVytvorit");
  await p.waitForSelector("#hwcKarta:not([hidden]) .hwc-karta-kod");
  const kod = (await p.textContent("#hwcKarta .hwc-karta-kod")).trim();
  assert.match(kod, /^HS-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  const vytvoreni = api(pozadavky, "/api/kupon").filter((x) => x.metoda === "POST");
  assert.equal(vytvoreni.length, 1);
  assert.match(vytvoreni[0].auth, /^Bearer /);
  const karta = await p.textContent("#hwcKarta .hwc-karta");
  assert.match(karta, /1\slitr impregnace H-STONE zdarma k\szakázce/);
  assert.match(karta, /Platí do .*pro 5 domácností/);
  const sms = await p.inputValue("#hwcSms");
  assert.match(sms, new RegExp(`^Dobrý den, posílám vám dárkový kupon od HOLUB – HSPG: 1\\slitr impregnace H-STONE zdarma k\\szakázce\\. Kód ${kod}, platí do \\d+\\.\\s\\d+\\.\\s\\d{4}\\. Rezervace: https://hspg\\.cz/kupon/\\?k=${kod}$`));

  // V seznamu: aktivní, 0 z 5, poznámka.
  const polozka = p.locator(`#hwcKupony li[data-kod="${kod}"]`);
  await polozka.waitFor();
  const t = await polozka.textContent();
  assert.match(t, /aktivní/);
  assert.match(t, /Použito 0 z\s5 domácností/);
  assert.match(t, /Sousedé Novákových/);
  const [rok, mes, den] = dnesMistne().split("-").map(Number);
  assert.match(t, new RegExp(`vytvořen ${den}\\.\\s${mes}\\.\\s${rok}`), "datum vytvoření podle českého času, ne UTC");

  // Tisk: jen karta (ostatní obsah stránky má v tiskovém stylu display:none).
  await p.evaluate(() => { window.print = () => { window.__tisk = (window.__tisk || 0) + 1; }; });
  await p.click("#hwcKarta button >> text=Tisk karty");
  assert.equal(await p.evaluate(() => window.__tisk), 1);
  await p.emulateMedia({ media: "print" });
  assert.equal(await p.isVisible("#hwcTiskObal .hwc-karta-kod"), true, "karta se tiskne");
  assert.equal(await p.isVisible("#aplikace"), false, "zbytek stránky se netiskne");
  assert.equal((await p.textContent("#hwcTiskObal .hwc-karta-kod")).trim(), kod);
  await p.emulateMedia({ media: "screen" });
  await p.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  assert.equal(await p.evaluate(() => document.body.classList.contains("hwc-tisk")), false);

  assert.deepEqual(await axe(p), []);

  // Zrušení s potvrzením.
  p.once("dialog", (d) => d.accept());
  await polozka.locator("button.hwc-zrusit").click();
  await p.waitForSelector("#hwcStavSeznam >> text=/je zrušený/");
  assert.match(await polozka.textContent(), /zrušený/);
  assert.equal(await polozka.locator("button.hwc-zrusit").count(), 0, "zrušený kupon už nejde zrušit");
  assert.equal(await p.isHidden("#hwcKarta"), true, "karta zrušeného kuponu zmizí");
  const zruseni = api(pozadavky, "/api/kupon").filter((x) => x.metoda === "POST");
  assert.equal(zruseni.length, 2);
  assert.deepEqual(chyby, []);
});

test("H-WEATHER: 503 → vlídná zpráva a „Zkusit znovu“; 401 → odhlášení a sekce vyčištěná", async () => {
  let prvni = true;
  const { p, chyby } = await centrum({
    pred: (ctx) => ctx.route(jePrehled, (r) => {
      if (prvni) { prvni = false; return r.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ chyba: "Úložiště není dostupné – zkuste to prosím za chvíli." }) }); }
      return r.continue();
    }),
  });
  await otevri(p, "zakazky");
  await p.click("#hwcNacistPrehled");
  await p.waitForSelector("#hwcStavPrehled.chyba >> text=/zkuste to prosím za chvíli/");
  await p.click("#hwcPanel-zakazky .hwc-znovu");
  await p.waitForSelector("#hwcVysledekPrehled .hwc-polozka");
  assert.equal(await p.locator("#hwcPanel-zakazky .hwc-znovu").count(), 0);

  await p.context().route((u) => u.pathname === "/api/kupon" && u.searchParams.has("seznam"), (r) => r.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ chyba: "Přihlášení vypršelo." }) }));
  await p.click("#hwcTab-kupony");
  await p.waitForSelector("#prihlaseni:not(.skryte)");
  assert.match(await p.textContent("#prihlaseniChyba"), /Přihlášení vypršelo/);
  assert.equal(await p.locator("#hwcVysledekPrehled *").count(), 0, "po odhlášení nezůstanou zakázky");
  assert.equal(await p.isHidden("#hwcObsah"), true);
  assert.deepEqual(chyby, []);
});

test("H-WEATHER: server neodpoví → po 15 s zpráva s „Zkusit znovu“, tlačítko zase funguje", async () => {
  const { p } = await centrum({ pred: (ctx) => ctx.route(jePrehled, () => { /* nikdy neodpoví */ }) });
  await otevri(p, "zakazky");
  const t0 = Date.now();
  await p.click("#hwcNacistPrehled");
  assert.equal(await p.isDisabled("#hwcNacistPrehled"), true, "za běhu nejde klikat znovu");
  await p.waitForSelector("#hwcStavPrehled.chyba >> text=/neodpověděl do 15\\ss/", { timeout: 20000 });
  assert.ok(Date.now() - t0 >= 14000);
  assert.equal(await p.isDisabled("#hwcNacistPrehled"), false);
  assert.equal(await p.locator("#hwcPanel-zakazky .hwc-znovu").count(), 1);
});

test("H-WEATHER: klávesnice – šipky přepínají záložky (roving tabindex)", async () => {
  const { p } = await centrum();
  await otevri(p);
  await p.focus("#hwcTab-pocasi");
  await p.keyboard.press("ArrowRight");
  assert.equal(await p.evaluate(() => document.activeElement.id), "hwcTab-zakazky");
  assert.equal(await p.getAttribute("#hwcTab-zakazky", "aria-selected"), "true");
  assert.equal(await p.isVisible("#hwcPanel-zakazky"), true);
  assert.equal(await p.isHidden("#hwcPanel-pocasi"), true);
  await p.keyboard.press("End");
  assert.equal(await p.evaluate(() => document.activeElement.id), "hwcTab-kupony");
  await p.keyboard.press("ArrowRight");
  assert.equal(await p.evaluate(() => document.activeElement.id), "hwcTab-pocasi");
  assert.deepEqual(await p.$$eval("[role=tab]", (t) => t.map((x) => x.tabIndex)), [0, -1, -1, -1]);
});

test("H-WEATHER: mobil 375 px – výsledky, přehled a kupon bez vodorovného posunu", async () => {
  const { p, chyby } = await centrum({ sirka: 375, vyska: 812 });
  const bezPosunu = () => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  await otevri(p);
  await p.fill("#hwcObec", "Kolín");
  await p.click("#hwcVyhodnotit");
  await p.waitForSelector("#hwcVysledekPocasi .hwc-den");
  assert.equal(await bezPosunu(), true, "počasí");
  await p.click("#hwcTab-zakazky");
  await p.click("#hwcNacistPrehled");
  await p.waitForSelector("#hwcVysledekPrehled .hwc-polozka");
  assert.equal(await bezPosunu(), true, "přehled");
  await p.click("#hwcTab-kalendar");
  await p.click("#hwcOdkaz");
  await p.waitForSelector("#hwcOdkazBox:not([hidden])");
  assert.equal(await bezPosunu(), true, "odkaz");
  await p.click("#hwcTab-kupony");
  await p.fill("#hwcPoznamka", "Test");
  await p.click("#hwcVytvorit");
  await p.waitForSelector("#hwcKarta:not([hidden]) .hwc-karta-kod");
  await p.waitForSelector("#hwcKupony li");
  assert.equal(await bezPosunu(), true, "kupon");
  const tab = await p.locator("#hwcTab-kalendar").boundingBox();
  assert.ok(tab.height >= 44, "záložky mají dost velký cíl pro prst");
  assert.deepEqual(chyby, []);
});
