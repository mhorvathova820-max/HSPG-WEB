// E2E: Pas domu – trezor (balicek/web/pas-domu/trezor.html) a jeho ukázka (balicek/ukazky/pas-trezor.html)
// ve skutečném Chromiu. /api/sentinel/validate a /api/pocasi se mockují přes page.route – nic nejde na server
// ani na internet. Data jsou fiktivní (obec „Testov“, kódy HS-2099-…, @example.com).
// Spuštění:  CHROMIUM=/opt/pw-browsers/chromium npm run test:e2e
// Volitelně: HSPG_MIRROR=<kopie webu> (sdílený vzhled, písma, logo) · PDT_SNIMKY=<složka> (snímky obrazovky)
// Ruční prohlížení: PDT_SERVER=8790 node balicek/testy/e2e/pas-trezor.test.mjs
//   → http://127.0.0.1:8790/pas-trezor.html (ukázka) a /pas-domu/trezor.html (šablona, API jen s mockem)
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import vm from "node:vm";
import { readFile, stat, mkdir } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const WEB = fileURLToPath(new URL("../../web/", import.meta.url));
const UKAZKY = fileURLToPath(new URL("../../ukazky/", import.meta.url));
const MIRROR = process.env.HSPG_MIRROR ? normalize(process.env.HSPG_MIRROR + sep) : null;
const SNIMKY = process.env.PDT_SNIMKY || null;
const TYPY = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };

// Soubory živého webu, které balíček nemá (sdílený vzhled, kontakty, písma, logo). Bez HSPG_MIRROR je server
// nahradí prázdnými, ať test hlídá jen trezor. Lištu souhlasu (souhlas.js) testuje úkol 10 – tady je vždy prázdná.
const ZIVY_WEB = /^\/(?:assets\/(?:brand\.css|kontakt\.js|fonts\/[\w.-]+|v\/[\w.-]+|favicon-\d+\.png|apple-touch-icon\.png|og\.png)|manifest\.webmanifest)$/;
const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
const BRAND_NAHRADA = ".hdr{border-bottom:1px solid rgba(212,175,55,.22)}.wrap{max-width:1180px;margin:0 auto;padding:0 16px}.bar{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:68px}.brand{display:flex;align-items:center;gap:10px;color:#f4f1e8;text-decoration:none}.brand span span{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#a3a9b5}.brand-logo{width:40px;height:40px;border-radius:50%;background:#1f2937}.btn{color:#f6e7a8;text-decoration:none}.skip{position:absolute;left:-9999px}footer{border-top:1px solid rgba(212,175,55,.22);padding:24px 0 96px;color:#a3a9b5;font:13px/1.6 Manrope,system-ui,sans-serif}footer a{color:#f6e7a8}";

async function existuje(p) {
  try { return (await stat(p)).isFile(); } catch { return false; }
}

export async function spustServer({ port = 0 } = {}) {
  const koreny = [WEB, UKAZKY, ...(MIRROR ? [MIRROR] : [])];
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      let cesta = decodeURIComponent(url.pathname);
      if (cesta.endsWith("/")) cesta += "index.html";
      if (cesta === "/assets/souhlas.js") {
        res.writeHead(200, { "content-type": TYPY[".js"] });
        return res.end("/* test: lišta souhlasu se testuje v úkolu 10 */");
      }
      for (const k of koreny) {
        const soubor = join(k, normalize(cesta));
        if (!soubor.startsWith(k)) continue;
        if (await existuje(soubor)) {
          res.writeHead(200, { "content-type": TYPY[extname(soubor)] || "application/octet-stream", "cache-control": "no-store" });
          return res.end(await readFile(soubor));
        }
      }
      if (ZIVY_WEB.test(cesta)) {
        const typ = extname(cesta);
        res.writeHead(200, { "content-type": TYPY[typ] || "application/octet-stream" });
        if (cesta === "/assets/brand.css") return res.end(BRAND_NAHRADA);
        return res.end([".png", ".webp"].includes(typ) ? PIXEL : "");
      }
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("404");
    } catch (err) {
      res.writeHead(500);
      res.end(String(err));
    }
  });
  await new Promise((ok) => server.listen(port, "127.0.0.1", ok));
  return { url: `http://127.0.0.1:${server.address().port}`, zavri: () => new Promise((ok) => { server.close(ok); server.closeAllConnections?.(); }) };
}

// ---------------------------------------------------------------------------------------------------------------
const KOD = "HS-2099-0001";
const PRISTUP = "ABCD-EFGH-JKMN";
const NENALEZENO = "Pas jsme nenašli. Zkontrolujte kód pasu a přístupový kód z certifikátu, nebo zavolejte +420 736 618 486.";
const LIMIT = "Příliš mnoho pokusů. Zkuste to za 15 minut, nebo zavolejte +420 736 618 486.";
const SIT = "Pas se teď nepodařilo načíst. Zkuste to prosím za chvíli, nebo zavolejte +420 736 618 486.";
const NAPOVEDA = "Kód pasu i přístupový kód najdete na certifikátu. Bez přístupového kódu pas neotevřeme – chráníme údaje o vašem domě.";
const FIRMA = JSON.parse(readFileSync(new URL("content/firma.json", `file://${WEB}`), "utf8"));
const SENTINEL = JSON.parse(readFileSync(new URL("content/sentinel.json", `file://${WEB}`), "utf8"));
const STANDARD = JSON.parse(readFileSync(new URL("content/standard.json", `file://${WEB}`), "utf8"));
const NIKDY = ["HS", "2026", "0001"].join("-"); // možný skutečný kód (úkol 14) – nesmí být nikde

// Pole, která API nikdy nevrací (úkol 14). Mock je přesto pošle – stránka je nesmí vykreslit.
const ZAKAZANE = {
  poznamka: "INTERNI-POZNAMKA-7Q3",
  psc: "999 99",
  adresa: "Zkušební 12",
  kontakt: "majitel@example.com",
  souhlas: { obec: true, doklad: "DOKLAD-SOUHLASU-9" },
  historie: [{ datum: "2025-01-01", text: "HISTORIE-TAJNA" }],
  pristup_otisk: "f00dfeed",
  verejne_id: "pub-77x",
};
const ZAKAZANE_HODNOTY = ["INTERNI-POZNAMKA-7Q3", "999 99", "Zkušební 12", "majitel@example.com", "DOKLAD-SOUHLASU-9", "HISTORIE-TAJNA", "f00dfeed", "pub-77x"];

// Datum v Česku (prohlížeč běží v Europe/Prague) a posuny po kalendářních dnech.
const DNES = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Prague" }).format(new Date());
function den(posun) {
  const d = new Date(`${DNES}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + posun);
  return d.toISOString().slice(0, 10);
}
const cesky = (iso) => { const [r, m, d] = iso.split("-").map(Number); return `${d}. ${m}. ${r}`; };
const bez = (t) => String(t).replace(/[\u00a0\u202f]/g, " ").replace(/\s+/g, " ").trim();

function pasMock(prepis = {}) {
  return {
    success: true, kod: KOD, obec: "Testov", povrchy: ["strecha", "fasada"], plocha_m2: 310, datum: den(-400),
    materialy: ["H-STONE"], sarze: "TEST-2099-07",
    zaruka: { platna: true, do: den(3250), zbyva_dni: 3250, uplynulo_procent: 11 },
    dalsi_kontrola: den(128), srazky: { mm: 1284, do: den(-1) },
    ...ZAKAZANE, ...prepis,
  };
}
const POCASI = {
  obec: "Testov", okres: "Testov",
  dny: [0, 12.4, 3, 0, 0, 1.2, 0].map((mm, i) => ({ datum: den(i + 1), srazky: mm, pravdepodobnost: null, tmin: 5, tmax: 14, vitr: i === 1 ? 12 : 4, sucho: mm < 0.5 })),
  zdroj: "MET Norway", zdrojText: "Na základě dat MET Norway (licence CC BY 4.0, https://creativecommons.org/licenses/by/4.0/), upraveno: vyhodnocení pro venkovní práce.", zdrojOdkaz: "https://api.met.no/",
};

if (process.env.PDT_SERVER) {
  const s = await spustServer({ port: Number(process.env.PDT_SERVER) || 8790 });
  console.log(`Ukázka: ${s.url}/pas-trezor.html · šablona: ${s.url}/pas-domu/trezor.html (API jen s mockem)`);
} else {
  const AXE = require.resolve("axe-core/axe.min.js");
  let chromium;
  let prohlizec;
  let server;

  before(async () => {
    ({ chromium } = await import("playwright"));
    prohlizec = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined });
    server = await spustServer();
  });
  after(async () => {
    await prohlizec?.close();
    await server?.zavri();
  });

  // validate: { status, body } | (zaznam, page) => { status, body } | { zrusit: true }
  async function stranka({ cesta = "/pas-domu/trezor.html", sirka = 1280, vyska = 900, pohyb = "no-preference", validate, pocasi = POCASI, initSkript } = {}) {
    const ctx = await prohlizec.newContext({ viewport: { width: sirka, height: vyska }, reducedMotion: pohyb, timezoneId: "Europe/Prague", locale: "cs-CZ" });
    const venku = [];
    await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => { venku.push(r.request().url()); return r.abort(); });
    let p;
    const pozadavky = [];
    await ctx.route("**/api/sentinel/validate", async (route) => {
      const req = route.request();
      let telo = null;
      try { telo = req.postDataJSON(); } catch { telo = req.postData(); }
      const zaznam = { metoda: req.method(), telo, typ: req.headers()["content-type"], adresaStranky: await p.evaluate(() => location.href) };
      pozadavky.push(zaznam);
      const o = typeof validate === "function" ? await validate(zaznam) : validate ?? { status: 404, body: { success: false, chyba: NENALEZENO } };
      if (o.zrusit) return route.abort("failed");
      if (o.zpozdeni) await new Promise((ok) => setTimeout(ok, o.zpozdeni));
      return route.fulfill({ status: o.status, contentType: "application/json; charset=utf-8", headers: { "cache-control": "no-store", "x-robots-tag": "noindex" }, body: JSON.stringify(o.body) });
    });
    const pocasiDotazy = [];
    await ctx.route(/\/api\/pocasi(?:\?|$)/, (route) => {
      pocasiDotazy.push(new URL(route.request().url()).searchParams.get("q"));
      return pocasi ? route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", body: JSON.stringify(pocasi) }) : route.fulfill({ status: 503, contentType: "application/json", body: '{"chyba":"Předpověď je dočasně nedostupná."}' });
    });
    if (initSkript) await ctx.addInitScript(initSkript);
    p = await ctx.newPage();
    const chyby = [];
    p.on("pageerror", (e) => chyby.push(e.message));
    // Prohlížeč sám vypisuje do konzole odpovědi 4xx/5xx. U /api/sentinel/validate (404, 429) a /api/pocasi (503)
    // jsou podle kontraktu očekávané – ostatní chyby konzole test hlídá.
    p.on("console", (m) => {
      if (m.type() !== "error") return;
      if (/^Failed to load resource/.test(m.text()) && /\/api\/(sentinel\/validate|pocasi)/.test(m.location()?.url || "")) return;
      chyby.push(`console: ${m.text()} ${m.location()?.url || ""}`);
    });
    const vsechny = [];
    p.on("request", (r) => vsechny.push(r.url()));
    await p.goto(server.url + cesta, { waitUntil: "load" });
    await p.waitForSelector("#pdt-sada:not([disabled])");
    return { p, ctx, pozadavky, pocasiDotazy, chyby, venku, vsechny };
  }

  async function axe(p, kde = "#obsah") {
    await p.addScriptTag({ path: AXE });
    const v = await p.evaluate(async (k) => (await window.axe.run(k, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }))
      .violations.map((x) => ({ id: x.id, impact: x.impact, cil: x.nodes.slice(0, 3).map((n) => n.target.join(" ")) })), kde);
    return v.filter((x) => x.impact === "serious" || x.impact === "critical");
  }
  async function snimek(p, nazev) {
    if (!SNIMKY) return;
    await mkdir(SNIMKY, { recursive: true });
    await p.screenshot({ path: join(SNIMKY, nazev), fullPage: true });
  }
  const bezPosunu = (p) => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  const preteceni = (p) => p.$$eval(".pdt *", (els) => els.filter((e) => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 0.5 || r.left < -0.5); })
    .filter((e) => !e.closest(".pdt-sr, [aria-hidden='true'] svg")).slice(0, 5).map((e) => `${e.tagName}.${e.className}`));

  async function zadat(p, kod = KOD, pristup = PRISTUP) {
    await p.click("#pdt-kod");
    await p.keyboard.type(kod.replace(/\D/g, ""), { delay: 5 });
    await p.click("#pdt-pristup");
    await p.keyboard.type(pristup.toLowerCase().replace(/-/g, " "), { delay: 5 });
  }
  async function otevritPas(p) {
    await p.keyboard.press("Enter");
    await p.waitForSelector("#pdt-pas:not([hidden]) .pdt-modul--zaruka");
    await p.waitForFunction(() => document.activeElement && document.activeElement.id === "pdt-pas-h");
  }

  // Sledování pořadí: odstranění fragmentu vs. první požadavek, vložená plátna a obsah displeje.
  const SLEDOVANI = () => {
    window.__poradi = [];
    window.__platna = 0;
    const rs = history.replaceState.bind(history);
    history.replaceState = function (...a) { window.__poradi.push(`replaceState:${String(a[2])}`); return rs(...a); };
    const f = window.fetch.bind(window);
    window.fetch = function (u, o) { window.__poradi.push(`fetch:${String(u)}`); return f(u, o); };
    new MutationObserver((z) => { for (const x of z) for (const n of x.addedNodes) if (n.nodeName === "CANVAS") window.__platna++; })
      .observe(document, { childList: true, subtree: true });
  };
  const SLEDUJ_DISPLEJ = (p) => p.evaluate(() => {
    window.__displej = [];
    const d = document.getElementById("pdt-displej");
    new MutationObserver(() => window.__displej.push(d.textContent)).observe(d, { childList: true, characterData: true, subtree: true });
  });

  test("zamčený trezor: struktura, nápověda, maska kódu (úkol 17), přístupový kód, chyba tvaru, axe", async () => {
    const { p, ctx, pozadavky, chyby, venku } = await stranka();
    assert.equal(await p.locator("h1").count(), 1);
    assert.equal(bez(await p.innerText("h1")), "Pas domu");
    assert.equal(bez(await p.textContent('label[for="pdt-kod"]')), "Kód pasu");
    assert.equal(bez(await p.textContent('label[for="pdt-pristup"]')), "Přístupový kód");
    assert.equal(bez(await p.innerText("#pdt-napoveda")), NAPOVEDA);
    for (const s of ["#pdt-kod", "#pdt-pristup", "#pdt-pas", "#pdt-displej"]) assert.equal(await p.getAttribute(s, "data-clarity-mask"), "true", s);
    assert.equal(await p.isHidden("#pdt-pas"), true);
    assert.equal(await p.getAttribute("#pdt-chyba", "role"), "alert");
    assert.equal(await p.getAttribute("#pdt-stav", "role"), "status");

    // Maska HS-RRRR-ČČČČ: oprava číslice uprostřed nepřeskočí kurzorem na konec.
    await p.click("#pdt-kod");
    await p.keyboard.type("20990001", { delay: 5 });
    assert.equal(await p.inputValue("#pdt-kod"), KOD);
    assert.equal(bez(await p.innerText("#pdt-displej")), KOD, "displej ukazuje zadaný kód");
    await p.evaluate(() => document.getElementById("pdt-kod").setSelectionRange(5, 5));
    await p.keyboard.press("Delete");
    await p.keyboard.type("5");
    assert.equal(await p.inputValue("#pdt-kod"), "HS-2059-0001");
    assert.equal(await p.evaluate(() => document.getElementById("pdt-kod").selectionStart), 6);
    await p.fill("#pdt-kod", "");
    assert.equal(bez(await p.innerText("#pdt-displej")), "HS-····-····");

    // Přístupový kód: Crockford Base32 – velká písmena, O→0, I/L→1, U a oddělovače pryč, skupiny po 4.
    await p.click("#pdt-pristup");
    await p.keyboard.type("ab-cd oil u", { delay: 5 });
    assert.equal(await p.inputValue("#pdt-pristup"), "ABCD-011");
    await p.fill("#pdt-pristup", "");

    // Chybný tvar: hláška u pole, nic se neodešle.
    await p.click("#pdt-otevrit");
    assert.equal(bez(await p.innerText("#pdt-chyba")), "Zadejte kód pasu ve tvaru HS-RRRR-ČČČČ – najdete ho na certifikátu.");
    assert.equal(await p.getAttribute("#pdt-kod", "aria-invalid"), "true");
    assert.equal(await p.evaluate(() => document.activeElement.id), "pdt-kod");
    await p.fill("#pdt-kod", KOD);
    await p.click("#pdt-otevrit");
    assert.match(bez(await p.innerText("#pdt-chyba")), /12 znaků ve tvaru XXXX-XXXX-XXXX/);
    assert.equal(await p.getAttribute("#pdt-pristup", "aria-invalid"), "true");
    assert.equal(pozadavky.length, 0, "s neúplnými kódy nic neodchází");

    assert.deepEqual(await axe(p), []);
    await p.fill("#pdt-kod", "");
    await p.fill("#pdt-pristup", "");
    await p.evaluate(() => {
      document.getElementById("pdt-chyba").textContent = "";
      for (const id of ["pdt-kod", "pdt-pristup"]) document.getElementById(id).removeAttribute("aria-invalid");
      document.activeElement.blur();
    });
    await snimek(p, "pas-zamceno-1280.png");
    assert.deepEqual(chyby, []);
    assert.deepEqual(venku, [], "stránka nevolá nic mimo vlastní web");
    await ctx.close();
  });

  test("úspěch: pas se otevře, vykreslí jen whitelist, efekty proběhnou, předpověď s uvedením zdroje, zavření", async () => {
    const { p, ctx, pozadavky, pocasiDotazy, chyby, venku } = await stranka({
      initSkript: SLEDOVANI,
      validate: (z) => (z.telo?.sentinel_code === KOD && z.telo?.pristup === PRISTUP ? { status: 200, body: pasMock({ tarif: "base" }), zpozdeni: 300 } : { status: 404, body: { success: false, chyba: NENALEZENO } }),
    });
    await zadat(p);
    await SLEDUJ_DISPLEJ(p);
    await otevritPas(p);

    // Požadavek podle kontraktu (úkol 14).
    assert.equal(pozadavky.length, 1);
    assert.equal(pozadavky[0].metoda, "POST");
    assert.match(pozadavky[0].typ, /application\/json/);
    assert.deepEqual(pozadavky[0].telo, { sentinel_code: KOD, pristup: PRISTUP });

    // Efekty bez reduced-motion: přeskupování znaků na displeji a rázová vlna na plátně.
    const displej = await p.evaluate(() => window.__displej);
    assert.ok(new Set(displej).size >= 4, `displej se přeskupoval (${new Set(displej).size} stavů)`);
    assert.equal(displej.at(-1), KOD);
    assert.ok(await p.evaluate(() => window.__platna) >= 1, "rázová vlna na plátně");
    await p.waitForTimeout(2600); // dobíhající animace (vlna, odhalení, prstenec)
    assert.equal(await p.locator("canvas.pdt-vlna").count(), 0, "plátno se po vlně odstraní");

    // Stav stránky: formulář schovaný, přístupový kód smazaný, pas ohlášený.
    assert.equal(await p.isHidden("#pdt-formular"), true);
    assert.equal(await p.isVisible("#pdt-otevreno"), true);
    assert.equal(await p.inputValue("#pdt-pristup"), "");
    await p.waitForFunction((k) => document.getElementById("pdt-stav").textContent === `Pas domu ${k} je otevřený.`, KOD);
    assert.equal(await p.getAttribute(".pdt-dvere", "data-stav"), "otevreno");

    const text = bez(await p.innerText("#pdt-pas"));
    assert.match(text, new RegExp(`Pas domu ${KOD}`));
    assert.match(text, /Testov · ošetřeno/);
    assert.match(text, /zbývá 8 let a 10 měsíců/i);
    assert.match(text, new RegExp(`Platná do ${cesky(den(3250))}`, "i"));
    const puvodni = den(-400) < SENTINEL.ucinnost;
    assert.ok(text.includes(bez(FIRMA.zaruka.veta)), "věta záruky z content/firma.json");
    assert.ok(text.includes(bez(puvodni ? FIRMA.zaruka.podminka_puvodni : FIRMA.zaruka.podminka)), "podmínka záruky podle data ošetření");
    assert.match(text, /128 dní do další technické kontroly/);
    assert.equal(await p.locator(".pdt-osa-bod").count(), 3, "ošetření, další kontrola, konec záruky");
    assert.match(text, /Ošetření – H-STONE Střecha, Fasáda · 310 m²/);
    assert.match(text, /H-STONE/);
    assert.match(text, /Šarže TEST-2099-07/);
    assert.match(text, /Od ošetření napršelo 1 284 mm/);
    // Tarify SENTINEL z content/sentinel.json, tarif z odpovědi zvýrazněný.
    for (const t of SENTINEL.tarify) assert.match(text, new RegExp(`${t.nazev} ${t.cena_rok.toLocaleString("cs-CZ").replace(/\s/g, " ")} Kč/rok`));
    assert.match(text, /Váš tarif SENTINEL BASE/);
    assert.equal(await p.locator(".pdt-tarif--vas").count(), 1);
    // Fotky API neposlalo → modul není.
    assert.equal(await p.locator(".pdt-modul--fotky").count(), 0);

    // Předpověď z /api/pocasi pro obec z pasu, pravdivé upozornění a uvedení zdroje (MET Norway, CC BY 4.0).
    await p.waitForSelector(".pdt-predpoved:not([aria-busy]) .pdt-dny");
    assert.deepEqual(pocasiDotazy, ["Testov"]);
    const pocasi = bez(await p.innerText(".pdt-modul--pocasi"));
    assert.match(pocasi, /předpověď hlásí srážky 12,4 mm a vítr až 12 m\/s/);
    assert.match(pocasi, /Po vydatném dešti nebo silném větru doporučujeme kontrolu stavu ochrany – zavolejte \+420 736 618 486\./);
    assert.match(pocasi, /V tarifu SENTINEL PRESTIGE zasahujeme do 48 hodin\./);
    assert.equal(await p.locator('.pdt-modul--pocasi a[href="https://api.met.no/"]').count(), 1);
    assert.equal(await p.locator('.pdt-modul--pocasi a[href="https://creativecommons.org/licenses/by/4.0/"]').count(), 1);
    assert.equal(await p.locator(".pdt-den").count(), 7);
    assert.equal(await p.locator(".pdt-den--vydatny").count(), 1);

    // Nic mimo whitelist: pole, která API nikdy nevrací, ani přístupový kód.
    const html = await p.content();
    for (const h of ZAKAZANE_HODNOTY) assert.ok(!html.includes(h), `v DOM nesmí být „${h}“`);
    assert.ok(!html.includes(PRISTUP), "přístupový kód v DOM není");
    // Odkazy dál bez kódu v URL (úkol 10).
    assert.equal(await p.getAttribute('#pdt-pas a:has-text("Ohodnotit naši práci")', "href"), "/recenze/");
    assert.equal(await p.getAttribute('#pdt-pas a:has-text("Objednat službu")', "href"), "/akce/");

    assert.deepEqual(await axe(p), []);
    await snimek(p, "pas-otevreno-1280.png");

    // Předání kódu na /recenze/ přes sessionStorage (úkol 10), ne přes URL.
    await p.evaluate(() => document.querySelector("#pdt-pas a[href='/recenze/']").addEventListener("click", (e) => e.preventDefault()));
    await p.click('#pdt-pas a:has-text("Ohodnotit naši práci")');
    assert.equal(await p.evaluate(() => sessionStorage.getItem("hspg-predvyplnit")), JSON.stringify({ kod: KOD }));

    // Zavření: obsah pryč, pole prázdná, fokus zpět na kód pasu.
    await p.click('#pdt-pas button:has-text("Zavřít pas")');
    assert.equal(await p.isHidden("#pdt-pas"), true);
    assert.equal(await p.locator("#pdt-pas *").count(), 0);
    assert.equal(await p.inputValue("#pdt-kod"), "");
    assert.equal(await p.evaluate(() => document.activeElement.id), "pdt-kod");
    await p.waitForFunction(() => document.getElementById("pdt-stav").textContent === "Pas domu je zavřený.");
    assert.equal(await p.getAttribute(".pdt-dvere", "data-stav"), "zamceno");
    assert.deepEqual(chyby, []);
    assert.deepEqual(venku, []);
    await ctx.close();
  });

  test("404: jedna neutrální hláška pro neznámý kód i špatný přístupový kód; 429 a výpadek sítě vlastní hláškou", async () => {
    let rezim = "404";
    const { p, ctx, pozadavky, chyby } = await stranka({
      validate: (z) => {
        if (rezim === "429") return { status: 429, body: { success: false, chyba: LIMIT } };
        if (rezim === "sit") return { zrusit: true };
        return z.telo?.sentinel_code === KOD && z.telo?.pristup === PRISTUP ? { status: 200, body: pasMock() } : { status: 404, body: { success: false, chyba: NENALEZENO } };
      },
    });
    const pokus = async (kod, pristup) => {
      await p.fill("#pdt-kod", kod);
      await p.fill("#pdt-pristup", pristup);
      const pred = pozadavky.length;
      await p.click("#pdt-otevrit");
      await p.waitForFunction((n) => document.getElementById("pdt-chyba").textContent.trim() && !document.getElementById("pdt-otevrit").disabled, pred);
      return bez(await p.innerText("#pdt-chyba")).replace(/^◆\s*/, "");
    };
    const neznamy = await pokus("HS-2099-0002", PRISTUP);
    const spatnyPristup = await pokus(KOD, "ABCD-EFGH-JKMP");
    assert.equal(neznamy, NENALEZENO);
    assert.equal(spatnyPristup, neznamy, "stejná hláška – neprozradí, který údaj nesedí");
    assert.equal(await p.getAttribute("#pdt-kod", "aria-invalid"), null);
    assert.equal(await p.getAttribute("#pdt-pristup", "aria-invalid"), null);
    assert.equal(await p.locator('#pdt-chyba a[href="tel:+420736618486"]').count(), 1);
    assert.equal(await p.isHidden("#pdt-pas"), true);
    assert.equal(await p.getAttribute(".pdt-dvere", "data-stav"), "zamceno");
    rezim = "429";
    assert.equal(await pokus(KOD, PRISTUP), LIMIT);
    rezim = "sit";
    assert.equal(await pokus(KOD, PRISTUP), SIT);
    assert.equal(pozadavky.length, 4);
    assert.deepEqual(chyby, [], "jen očekávané odpovědi API");
    await ctx.close();
  });

  test("odkaz z certifikátu: fragment zmizí z adresy dřív, než odejde požadavek; pas se otevře sám", async () => {
    const { p, ctx, pozadavky, chyby, vsechny } = await (async () => {
      const r = await stranka({
        cesta: `/pas-domu/trezor.html#kod=${KOD}&pristup=${PRISTUP}`,
        initSkript: SLEDOVANI,
        validate: () => ({ status: 200, body: pasMock() }),
      });
      return r;
    })();
    await p.waitForSelector("#pdt-pas:not([hidden]) .pdt-modul--zaruka");
    assert.equal(pozadavky.length, 1);
    assert.deepEqual(pozadavky[0].telo, { sentinel_code: KOD, pristup: PRISTUP });
    assert.ok(!/#|kod=|pristup=/.test(pozadavky[0].adresaStranky), `adresa v době požadavku: ${pozadavky[0].adresaStranky}`);
    assert.ok(!p.url().includes("#") && !p.url().includes("pristup"), p.url());
    const poradi = await p.evaluate(() => window.__poradi);
    assert.match(poradi[0], /^replaceState:\/pas-domu\/trezor\.html$/, poradi.join(" | "));
    assert.ok(poradi.findIndex((x) => x.startsWith("fetch:")) > 0, "první fetch až po odstranění fragmentu");
    assert.ok(vsechny.every((u) => !u.includes("pristup") && !u.includes(PRISTUP)), "přístupový kód není v žádné adrese");
    assert.equal(await p.inputValue("#pdt-pristup"), "");
    assert.deepEqual(chyby, []);
    await ctx.close();
  });

  test("390 × 844: bez vodorovného posunu (zamčeno, chyba, otevřeno), dotyková tlačítka ≥ 44 px", async () => {
    const { p, ctx, chyby } = await stranka({
      sirka: 390, vyska: 844,
      validate: (z) => (z.telo?.pristup === PRISTUP ? { status: 200, body: pasMock({ tarif: "plus" }) } : { status: 404, body: { success: false, chyba: NENALEZENO } }),
    });
    assert.equal(await bezPosunu(p), true, "zamčeno");
    assert.deepEqual(await preteceni(p), []);
    await snimek(p, "pas-zamceno-390.png");
    await p.fill("#pdt-kod", KOD);
    await p.fill("#pdt-pristup", "ABCD-EFGH-JKMP");
    await p.click("#pdt-otevrit");
    await p.waitForFunction(() => document.getElementById("pdt-chyba").textContent.trim().length > 0);
    await p.waitForTimeout(500);
    assert.equal(await bezPosunu(p), true, "chyba");
    await snimek(p, "pas-chyba-390.png");
    await p.fill("#pdt-pristup", PRISTUP);
    await p.click("#pdt-otevrit");
    await p.waitForSelector("#pdt-pas:not([hidden]) .pdt-modul--zaruka");
    await p.waitForSelector(".pdt-predpoved:not([aria-busy])");
    await p.waitForTimeout(2600);
    assert.equal(await bezPosunu(p), true, "otevřeno");
    assert.deepEqual(await preteceni(p), []);
    const male = await p.$$eval("#pdt-pas button, #pdt-pas a.apex-tlacitko, #pdt-pas summary", (els) => els.filter((e) => e.getBoundingClientRect().height < 44).map((e) => e.textContent.trim()));
    assert.deepEqual(male, []);
    assert.deepEqual(await axe(p), []);
    await snimek(p, "pas-otevreno-390.png");
    assert.deepEqual(chyby, []);
    await ctx.close();
  });

  test("prefers-reduced-motion: bez plátna, přeskupování znaků, animací i plynulého posouvání", async () => {
    const { p, ctx, chyby } = await stranka({
      pohyb: "reduce",
      initSkript: SLEDOVANI,
      validate: () => ({ status: 200, body: pasMock(), zpozdeni: 300 }),
    });
    const styl = (sel, vl) => p.$eval(sel, (e, v) => getComputedStyle(e)[v], vl);
    assert.equal(await styl(".pdt-cif-ambient", "animationName"), "none");
    assert.equal(await styl(".apex-zlaty-text", "animationName"), "none");
    await zadat(p);
    await SLEDUJ_DISPLEJ(p);
    await otevritPas(p);
    assert.equal(await p.evaluate(() => window.__platna), 0, "žádné plátno s vlnou");
    assert.deepEqual([...new Set(await p.evaluate(() => window.__displej))], [KOD], "displej se nepřeskupuje");
    assert.equal(await p.evaluate(() => document.querySelector("#pdt-pas").classList.contains("pdt-odhaleni")), false);
    assert.equal(await styl(".pdt-modul", "animationName"), "none");
    assert.equal(await styl(".pdt-cif-kruh", "transitionDuration"), "0s");
    assert.equal(await styl(".pdt-prsten-oblouk", "animationName"), "none");
    assert.equal(await p.evaluate(() => document.querySelector(".pdt-trezor").classList.contains("pdt-rozostreni") || document.querySelector("[data-pdt]").classList.contains("pdt-rozostreni")), false);
    assert.deepEqual(chyby, []);
    await ctx.close();
  });

  test("bez předpovědi a s fotkami: modul počasí ukáže jen srážky, fotky jen z vlastního webu", async () => {
    const { p, ctx, chyby } = await stranka({
      pocasi: null,
      validate: () => ({ status: 200, body: pasMock({ fotky: [{ src: "/assets/v/pred.webp", typ: "pred", datum: den(-400), alt: "Střecha před ošetřením" }, { src: "https://example.com/cizi.jpg", typ: "po" }, { src: "//example.com/x.jpg" }] }) }),
    });
    await zadat(p);
    await otevritPas(p);
    await p.waitForFunction(() => !document.querySelector(".pdt-predpoved[aria-busy]"));
    assert.equal(await p.locator(".pdt-modul--pocasi").count(), 1, "srážky od ošetření zůstanou");
    assert.equal(await p.locator(".pdt-modul--pocasi .pdt-dny").count(), 0);
    assert.equal(await p.locator(".pdt-foto").count(), 1, "cizí adresy fotek se zahodí");
    assert.equal(await p.getAttribute(".pdt-foto img", "src"), "/assets/v/pred.webp");
    assert.match(bez(await p.innerText(".pdt-foto figcaption")), new RegExp(`^Před · ${cesky(den(-400))}$`));
    assert.deepEqual(chyby, []);
    await ctx.close();
  });

  test("fotky před/po s jezdcem, postup ošetření a druh objektu (úkol 59), 390 × 844", async () => {
    const fotky = [
      { src: "/assets/v/fasada-pred.webp", typ: "pred", misto: "Uliční fasáda", datum: den(-401), alt: "fasáda se zeleným nánosem" },
      { src: "/assets/v/detail.webp", typ: "po", datum: den(-400) },
      { src: "/assets/v/fasada-po.webp", typ: "po", misto: "Uliční fasáda", datum: den(-400) },
      { src: "/assets/v/vstup-pred.webp", typ: "pred", misto: "Vstup" },
      { src: "https://example.com/cizi-po.jpg", typ: "po", misto: "Vstup" },
    ];
    const postup = [
      { cislo: "05", datum: den(-400) },
      { cislo: 1, datum: den(-401), text: "Fasáda vyčištěna tlakem a teplou vodou." },
      { cislo: "03", datum: den(-401) },
      { cislo: "x9", text: "neplatné číslo kroku se zahodí" },
    ];
    const { p, ctx, chyby } = await stranka({
      sirka: 390, vyska: 844,
      validate: () => ({ status: 200, body: pasMock({ objekt: "Mateřská škola", povrchy: ["fasada"], cesta: "A", postup, fotky }) }),
    });
    await zadat(p);
    await otevritPas(p);
    assert.match(bez(await p.innerText(".pdt-pas-meta")), /^Mateřská škola · Testov · ošetřeno /);

    // Pořadí: stav → doklady práce (fotky, postup) → podrobnosti.
    const poradi = await p.$$eval(".pdt-mrizka > .pdt-modul", (m) => m.map((x) => [...x.classList].find((c) => c.startsWith("pdt-modul--"))));
    assert.ok(poradi.indexOf("pdt-modul--zaruka") < poradi.indexOf("pdt-modul--fotky"), poradi.join(" "));
    assert.ok(poradi.indexOf("pdt-modul--fotky") < poradi.indexOf("pdt-modul--postup"), poradi.join(" "));
    assert.ok(poradi.indexOf("pdt-modul--postup") < poradi.indexOf("pdt-modul--historie"), poradi.join(" "));

    // Dvojice stejného místa → porovnání; zbytek (bez dvojice, cizí adresa zahozena) v mřížce.
    assert.equal(bez(await p.innerText(".pdt-modul--fotky .pdt-modul-h")), "Fotodokumentace před a po");
    assert.equal(await p.locator(".pdt-porovnani").count(), 1);
    assert.equal(bez(await p.innerText(".pdt-porovnani figcaption")), `Uliční fasáda · před ${cesky(den(-401))} · po ${cesky(den(-400))}`);
    assert.deepEqual(await p.$$eval(".pdt-porovnani img", (i) => i.map((x) => [x.getAttribute("src"), x.alt])), [
      ["/assets/v/fasada-po.webp", "Po ošetření: Uliční fasáda"],
      ["/assets/v/fasada-pred.webp", "Před ošetřením: fasáda se zeleným nánosem"],
    ]);
    assert.deepEqual(await p.$$eval(".pdt-foto img", (i) => i.map((x) => x.getAttribute("src"))), ["/assets/v/detail.webp", "/assets/v/vstup-pred.webp"]);
    assert.deepEqual((await p.$$eval(".pdt-foto figcaption", (f) => f.map((x) => x.textContent))).map(bez), [`Po · ${cesky(den(-400))}`, "Vstup · Před"]);

    // Jezdec: skutečný range s popiskem – klávesnice i tažení, horní vrstva „před“ se ořízne podle polohy.
    const rozsah = p.locator(".pdt-porovnani__rozsah");
    assert.equal(await p.locator(`label[for="${await rozsah.getAttribute("id")}"]`).count(), 1);
    assert.equal(await rozsah.getAttribute("aria-valuetext"), "50 % před, 50 % po");
    await rozsah.focus();
    for (let i = 0; i < 5; i++) await p.keyboard.press("ArrowRight");
    assert.equal(await rozsah.getAttribute("aria-valuetext"), "55 % před, 45 % po");
    assert.equal(await p.$eval(".pdt-porovnani__okno", (e) => e.style.getPropertyValue("--pdt-pozice")), "55%");
    const okno = await p.locator(".pdt-porovnani__okno").boundingBox();
    const stred = okno.y + okno.height / 2;
    await p.mouse.move(okno.x + okno.width * 0.55, stred);
    await p.mouse.down();
    await p.mouse.move(okno.x + okno.width * 0.2, stred, { steps: 8 });
    await p.mouse.up();
    const hodnota = Number(await rozsah.inputValue());
    assert.ok(Math.abs(hodnota - 20) <= 3, `poloha po tažení: ${hodnota}`);
    assert.equal(await p.$eval(".pdt-porovnani__okno", (e) => e.style.getPropertyValue("--pdt-pozice")), `${hodnota}%`);
    const orez = await p.$eval(".pdt-porovnani__pred", (e) => getComputedStyle(e).clipPath);
    const vpravo = /^inset\(0px (?:calc\()?([\d.]+)%/.exec(orez);
    assert.ok(vpravo && Math.abs(Number(vpravo[1]) - (100 - hodnota)) < 0.01, `ořez vrstvy „před“: ${orez}`);

    // Postup: jen zapsané kroky, seřazené; názvy a popisy ze Standardu HOLUB, cesta A u finální vrstvy.
    const krokStd = (c) => STANDARD.kroky.find((k) => k.cislo === c);
    assert.deepEqual(await p.$$eval(".pdt-postup-cislo", (e) => e.map((x) => x.textContent)), ["01", "03", "05"]);
    assert.deepEqual((await p.$$eval(".pdt-postup-nazev", (e) => e.map((x) => x.textContent))).map(bez),
      ["01", "03", "05"].map((c) => `Krok ${Number(c)}: ${krokStd(c).nazev}`));
    assert.deepEqual(await p.$$eval(".pdt-postup-datum", (e) => e.map((x) => x.getAttribute("datetime"))), [den(-401), den(-401), den(-400)]);
    assert.deepEqual((await p.$$eval(".pdt-postup-popis", (e) => e.map((x) => x.textContent))).map(bez),
      ["Fasáda vyčištěna tlakem a teplou vodou.", krokStd("03").popis, krokStd("05").popis].map(bez));
    assert.equal(await p.locator(".pdt-postup-cesta").count(), 1);
    assert.equal(bez(await p.innerText(".pdt-postup-cesta")), bez(`${STANDARD.cesty.A.nazev} – ${STANDARD.cesty.A.popis}`));
    assert.equal(await p.locator(".pdt-postup-krok:last-child .pdt-postup-cesta").count(), 1);

    await p.waitForTimeout(2600);
    assert.equal(await bezPosunu(p), true);
    assert.deepEqual(await preteceni(p), []);
    assert.deepEqual(await axe(p), []);
    await snimek(p, "pas-fotky-postup-390.png");
    assert.deepEqual(chyby, []);
    await ctx.close();
  });

  test("ukázka: HS-2099-0001 otevře pas bez serveru, jiná kombinace neutrální hláška; axe celé stránky", async () => {
    const { p, ctx, chyby, vsechny, venku } = await stranka({ cesta: "/pas-trezor.html", validate: () => { throw new Error("ukázka nesmí volat server"); } });
    assert.equal(await p.getAttribute('meta[name="robots"]', "content"), "noindex,nofollow");
    await p.fill("#pdt-kod", KOD);
    await p.fill("#pdt-pristup", "ABCD-EFGH-JKMP");
    await p.click("#pdt-otevrit");
    await p.waitForFunction(() => document.getElementById("pdt-chyba").textContent.trim().length > 0);
    assert.equal(bez(await p.innerText("#pdt-chyba")).replace(/^◆\s*/, ""), NENALEZENO);
    await p.click("#pdt-ukazka-vyplnit");
    assert.equal(await p.inputValue("#pdt-kod"), KOD);
    assert.equal(await p.inputValue("#pdt-pristup"), PRISTUP);
    await p.click("#pdt-otevrit");
    await p.waitForSelector("#pdt-pas:not([hidden]) .pdt-modul--zaruka");
    await p.waitForSelector(".pdt-predpoved:not([aria-busy]) .pdt-dny");
    await p.waitForTimeout(2600);
    const text = bez(await p.innerText("#pdt-pas"));
    assert.match(text, /Testov/);
    const puvodni = den(-430) < SENTINEL.ucinnost;
    assert.ok(text.includes(bez(puvodni ? FIRMA.zaruka.podminka_puvodni : FIRMA.zaruka.podminka)));
    assert.match(text, /Péče SENTINEL/);
    assert.ok(vsechny.every((u) => !u.includes("/api/")), "ukázka nevolá API");
    assert.deepEqual(venku, []);
    assert.ok(!(await p.content()).includes(NIKDY));
    assert.deepEqual(await axe(p, "body"), []);
    await snimek(p, "pas-ukazka-1280.png");
    assert.deepEqual(chyby, []);
    await ctx.close();
    const m = await stranka({ cesta: "/pas-trezor.html", sirka: 390, vyska: 844 });
    await m.p.click("#pdt-ukazka-vyplnit");
    await m.p.click("#pdt-otevrit");
    await m.p.waitForSelector("#pdt-pas:not([hidden]) .pdt-modul--zaruka");
    await m.p.waitForSelector(".pdt-predpoved:not([aria-busy]) .pdt-dny");
    await m.p.waitForTimeout(2600);
    assert.equal(await bezPosunu(m.p), true);
    await snimek(m.p, "pas-ukazka-390.png");
    assert.deepEqual(m.chyby, []);
    await m.ctx.close();
  });

  test("statické kontroly: pořadí replaceState → fetch, žádné innerHTML ani zakázaná tvrzení, skloňování (úkol 17)", async () => {
    const js = readFileSync(join(WEB, "assets/pas-trezor.js"), "utf8");
    const css = readFileSync(join(WEB, "assets/pas-trezor.css"), "utf8");
    const sablona = readFileSync(join(WEB, "pas-domu/trezor.html"), "utf8");
    const ukazka = readFileSync(join(UKAZKY, "pas-trezor.html"), "utf8");
    assert.ok(js.indexOf("history.replaceState(null, '', location.pathname)") > 0);
    assert.ok(js.indexOf("history.replaceState") < js.indexOf("fetch("), "v JS je odstranění fragmentu před prvním fetch");
    const prvniSkript = sablona.indexOf("<script");
    assert.ok(sablona.slice(prvniSkript, sablona.indexOf("</script>", prvniSkript)).includes("history.replaceState(null,'',location.pathname)"), "první skript stránky odstraní fragment");
    assert.ok(prvniSkript < sablona.indexOf("<script src="));
    for (const [nazev, zdroj] of Object.entries({ js, css, sablona, ukazka })) {
      assert.doesNotMatch(zdroj, /innerHTML/, `${nazev}: innerHTML`);
      assert.doesNotMatch(zdroj, /poznamka/, `${nazev}: poznamka`);
      assert.doesNotMatch(zdroj, /\?kod=|\?adresa=/, `${nazev}: kód nebo adresa v URL (úkol 10)`);
      assert.ok(!zdroj.includes(NIKDY), `${nazev}: možný skutečný kód`);
      assert.doesNotMatch(zdroj, /fonts\.googleapis|fonts\.gstatic|jsdelivr|unpkg|cdnjs/i, `${nazev}: cizí CDN`);
      assert.doesNotMatch(zdroj, /8[,.]4\s*%|nano|kinetick|autonomn|EPBD|pojist|pojišt|CO₂|CO2|satelit|katastr|RÚIAN|RUIAN|Google Maps|leteck|15\s*let|štít\w* Sentinel|indikátor/i, `${nazev}: zakázané tvrzení`);
    }
    assert.doesNotMatch(sablona, /HS-20\d\d-\d{4}/, "šablona bez ukázkových kódů");
    for (const s of ["#pdt-kod", "#pdt-pristup", "#pdt-pas"]) {
      const id = s.slice(1);
      assert.match(sablona, new RegExp(`id="${id}"[^>]*data-clarity-mask="true"`), `${s} maskovaný pro Clarity`);
    }
    // Čisté funkce (bez prohlížeče).
    const ctx = { module: { exports: {} }, URLSearchParams, Math, Number, String, Object, Array, Promise, JSON, isFinite, Date, setTimeout, clearTimeout };
    vm.runInNewContext(js, ctx, { filename: "pas-trezor.js" });
    const T = ctx.module.exports;
    const tvar = (d) => T.zbyva(d).replace(/\u00a0/g, " ");
    assert.deepEqual([365, 730, 1, 2, 5].map(tvar), ["1 rok", "2 roky", "1 den", "2 dny", "5 dní"]);
    assert.equal(tvar(3250), "8 let a 10 měsíců");
    assert.deepEqual(JSON.parse(JSON.stringify(T.maskaKodu("HS-209-0001", 5))), { hodnota: "HS-2090-001", kurzor: 5 });
    assert.deepEqual(JSON.parse(JSON.stringify(T.maskaKodu("HS-20590-001", 6))), { hodnota: "HS-2059-0001", kurzor: 6 });
    assert.equal(T.maskaPristupu("ilo0 uu-abcd efgh").hodnota, "1100-ABCD-EFGH");
    const cisty = JSON.parse(JSON.stringify(T.vycisti({ success: true, ...pasMock(), neznamePole: "x" })));
    assert.deepEqual(Object.keys(cisty).sort(), ["dalsi_kontrola", "datum", "kod", "materialy", "obec", "plocha_m2", "povrchy", "sarze", "srazky", "zaruka"]);
    // Volitelná pole z úkolu 59 se čistí: druh objektu nejvýš 60 znaků, cesta jen A/B, postup jen platné kroky.
    const volitelna = JSON.parse(JSON.stringify(T.vycisti({
      ...pasMock(), objekt: `  Mateřská škola ${"x".repeat(80)}`, cesta: "C",
      postup: [{ cislo: 2, datum: "2026-10-14", text: "  text  " }, { cislo: "abc" }, "x", null, { cislo: "05", datum: "zítra", text: 5, nazev: "N".repeat(70) }],
    })));
    assert.equal(volitelna.objekt.length, 60);
    assert.ok(volitelna.objekt.startsWith("Mateřská škola x"));
    assert.equal("cesta" in volitelna, false);
    assert.deepEqual(volitelna.postup, [{ cislo: "02", nazev: "", datum: "2026-10-14", text: "text" }, { cislo: "05", nazev: "N".repeat(60), datum: null, text: "" }]);
    const prazdne = JSON.parse(JSON.stringify(T.vycisti({ ...pasMock(), objekt: "   ", postup: [{ cislo: "?" }], cesta: "B" })));
    assert.deepEqual([prazdne.objekt, prazdne.postup, prazdne.cesta], [undefined, undefined, "B"]);
  });
}
