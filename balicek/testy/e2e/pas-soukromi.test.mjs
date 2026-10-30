// E2E: ochrana soukromí veřejného Pasu domu (štítek SENTINEL, úkol 59, issue #9).
// Pas otevře každý, kdo naskenuje štítek na budově. Test hlídá, že stránka nikdy nevykreslí název objektu, adresu,
// jméno, telefon, e-mail ani souřadnice – ani když je registr omylem pošle – a že kód z adresy zmizí dřív,
// než odejde první požadavek na /api/. /api/sentinel/validate a /api/pocasi se mockují přes page.route,
// nic nejde na server ani na internet. Data jsou fiktivní (obec „Testov“, kódy HS-2099-…).
// Fotky s adresou mimo vlastní web pokrývá test úkolu 59 v pas-trezor.test.mjs – tady se neduplikuje.
// Spuštění:  CHROMIUM=/opt/pw-browsers/chromium npm run test:e2e
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const WEB = fileURLToPath(new URL("../../web/", import.meta.url));
const TYPY = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".svg": "image/svg+xml" };
const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");

// Statický server jen nad balicek/web. Soubory živého webu, které balíček nemá (vzhled, písma, logo), vrátí prázdné –
// test hlídá jen to, co stránka vykreslí z odpovědi registru.
async function spustServer() {
  const server = http.createServer(async (req, res) => {
    const cesta = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const soubor = join(WEB, normalize(cesta.endsWith("/") ? cesta + "index.html" : cesta));
    try {
      if (soubor.startsWith(WEB) && (await stat(soubor)).isFile()) {
        res.writeHead(200, { "content-type": TYPY[extname(soubor)] || "application/octet-stream", "cache-control": "no-store" });
        return res.end(await readFile(soubor));
      }
    } catch { /* soubor není */ }
    const typ = extname(cesta);
    if (/^\/(assets|manifest)/.test(cesta)) {
      res.writeHead(200, { "content-type": TYPY[typ] || "application/octet-stream" });
      return res.end([".png", ".webp"].includes(typ) ? PIXEL : "");
    }
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("404");
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  return { url: `http://127.0.0.1:${server.address().port}`, zavri: () => new Promise((ok) => { server.close(ok); server.closeAllConnections?.(); }) };
}

const KOD = "HS-2099-0001";
const PRISTUP = "ABCD-EFGH-JKMN";
// Unikátní řetězce v polích, která registr nikdy nesmí poslat – a stránka je nesmí nikde ukázat.
const TAJNE = {
  nazev: "TAJNE-NAZEV-4K7",
  adresa: "TAJNE-ADRESA-123",
  ulice: "TAJNE-ULICE-58Q",
  jmeno: "TAJNE-JMENO-2PX",
  telefon: "+420 999 111 222",
  email: "tajne-majitel-91@example.com",
  gps: "50.123456, 15.654321",
  poloha: { lat: 50.987654, lng: 15.123987, popis: "TAJNE-POLOHA-6WZ" },
};
const HLEDAT = ["TAJNE-NAZEV-4K7", "TAJNE-ADRESA-123", "TAJNE-ULICE-58Q", "TAJNE-JMENO-2PX", "999 111 222", "999111222", "tajne-majitel-91",
  "50.123456", "15.654321", "50.987654", "15.123987", "TAJNE-POLOHA-6WZ"];

const DNES = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Prague" }).format(new Date());
function den(posun) {
  const d = new Date(`${DNES}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + posun);
  return d.toISOString().slice(0, 10);
}

// Platná pole z úkolu 59 (druh objektu, cesta, postup, fotky z vlastního webu) + citlivá pole navíc.
function pasSTajnymi() {
  return {
    success: true, kod: KOD, obec: "Testov", objekt: "Rodinný dům", povrchy: ["strecha", "fasada"], plocha_m2: 210, datum: den(-400),
    materialy: ["H-STONE"], sarze: "TEST-2099-07", cesta: "A",
    zaruka: { platna: true, do: den(3250), zbyva_dni: 3250, uplynulo_procent: 11 },
    dalsi_kontrola: den(128), srazky: { mm: 1284, do: den(-1) },
    postup: [{ cislo: "01", datum: den(-401), text: "Střecha vyčištěna tlakem." }, { cislo: "05", datum: den(-400) }],
    fotky: [{ src: "/assets/v/strecha-pred.webp", typ: "pred", misto: "Střecha", datum: den(-401), alt: "střecha před ošetřením" },
      { src: "/assets/v/strecha-po.webp", typ: "po", misto: "Střecha", datum: den(-400) }],
    ...TAJNE,
  };
}

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

async function otevrit() {
  const ctx = await prohlizec.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "Europe/Prague", locale: "cs-CZ" });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
  let p;
  const api = [];
  const vsechny = [];
  await ctx.route("**/api/**", async (route) => {
    const req = route.request();
    // Stav adresy v okamžiku, kdy požadavek odchází (dřív, než na něj odpovíme).
    const stav = await p.evaluate(() => ({ hash: location.hash, href: location.href }));
    let telo = null;
    try { telo = req.postDataJSON(); } catch { telo = req.postData(); }
    api.push({ url: req.url(), metoda: req.method(), telo, ...stav });
    if (/\/api\/sentinel\/validate/.test(req.url())) {
      return route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", headers: { "cache-control": "no-store" }, body: JSON.stringify(pasSTajnymi()) });
    }
    return route.fulfill({ status: 503, contentType: "application/json; charset=utf-8", body: '{"chyba":"test"}' });
  });
  p = await ctx.newPage();
  const chyby = [];
  p.on("pageerror", (e) => chyby.push(e.message));
  p.on("request", (r) => vsechny.push(r.url()));
  await p.goto(`${server.url}/pas-domu/trezor.html#kod=${KOD}&pristup=${PRISTUP}`, { waitUntil: "load" });
  await p.waitForSelector("#pdt-pas:not([hidden]) .pdt-modul--zaruka", { timeout: 10000 });
  return { p, ctx, api, vsechny, chyby };
}

// Najde tajné řetězce v textu stránky, v atributech title/alt/aria-*/data-*/value/href/src a v celém HTML.
async function uniky(p) {
  return p.evaluate((hledat) => {
    const nalez = [];
    const zkus = (kde, s) => { const t = String(s || ""); for (const h of hledat) if (t.includes(h)) nalez.push(`${kde}: ${h}`); };
    zkus("text", document.body.innerText);
    for (const el of document.querySelectorAll("*")) {
      for (const a of el.attributes) {
        if (/^(title|alt|aria-.+|data-.+|value|href|src|content|placeholder)$/.test(a.name)) zkus(`${el.tagName.toLowerCase()}[${a.name}]`, a.value);
      }
      if (el.shadowRoot) zkus("shadow", el.shadowRoot.innerHTML);
    }
    zkus("html", document.documentElement.outerHTML);
    zkus("title", document.title);
    return nalez;
  }, HLEDAT);
}

test("registr omylem pošle název, adresu, jméno, kontakty a souřadnice – stránka je nikde nevykreslí (obrazovka i tisk)", async () => {
  const { p, ctx, chyby } = await otevrit();
  // Pas se opravdu vykreslil (platná pole jsou vidět) – jinak by test nic neověřil.
  assert.match(await p.innerText("#pdt-pas"), /Testov/);
  assert.deepEqual(await uniky(p), [], "obrazovka");
  await p.emulateMedia({ media: "print" });
  assert.deepEqual(await uniky(p), [], "tisková verze");
  await p.emulateMedia({ media: "screen" });
  assert.deepEqual(chyby, []);
  await ctx.close();
});

test("kód z adresy zmizí dřív, než odejde první požadavek na /api/; přístupový kód není v žádné adrese", async () => {
  const { p, ctx, api, vsechny, chyby } = await otevrit();
  assert.ok(api.length >= 1, "pas se načetl přes /api/sentinel/validate");
  assert.equal(api[0].hash, "", `location.hash při prvním požadavku na /api/: ${api[0].hash}`);
  assert.ok(!/kod=|pristup=/.test(api[0].href), `adresa stránky při prvním požadavku: ${api[0].href}`);
  const validate = api.find((x) => /\/api\/sentinel\/validate/.test(x.url));
  assert.equal(validate.metoda, "POST");
  assert.deepEqual(validate.telo, { sentinel_code: KOD, pristup: PRISTUP }, "kódy jdou v těle požadavku");
  assert.ok(vsechny.every((u) => !u.includes(PRISTUP) && !/pristup=/i.test(u)), "přístupový kód není v URL žádného požadavku");
  assert.equal(await p.evaluate(() => location.hash), "");
  assert.deepEqual(chyby, []);
  await ctx.close();
});
