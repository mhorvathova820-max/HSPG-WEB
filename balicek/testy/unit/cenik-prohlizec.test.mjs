// Data pro okamžitou kalkulaci v prohlížeči (úkol 48): assets/hspg-cenik.json ze scripts/build-hbot.mjs,
// načtení v HSPGCena.nacti() (nejdřív balíček, záložně /content/), našeptávač obcí se středem obce
// a schválené odpovědi H-BOTa podle Standardu HOLUB a tarifů SENTINEL (R15) bez zakázaných slov.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { cenikProProhlizec } from "../../web/scripts/build-hbot.mjs";
import { znalostiProProhlizec } from "../../web/netlify/lib/ai/znalosti.mjs";
import { navrhyObci } from "../../web/netlify/lib/pocasi/obce.mjs";

const koren = new URL("../../web/", import.meta.url);
const soubor = (p) => readFileSync(new URL(p, koren), "utf8");
function nactiJadro() {
  const ctx = { module: { exports: {} }, Math, Number, String, Object, Array, Promise, Error, isFinite };
  vm.runInNewContext(soubor("assets/hspg-cena.js"), ctx);
  return ctx.module.exports;
}
const odpoved = (data, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(data) });

test("assets/hspg-cenik.json odpovídá zdrojům a neobsahuje interní poznámky", () => {
  const b = JSON.parse(soubor("assets/hspg-cenik.json"));
  assert.deepEqual(b, cenikProProhlizec());
  assert.doesNotMatch(JSON.stringify(b), /"_[a-z]|"poznamka"|emaily|smerovani|zaloha"\s*:\s*"/);
  assert.equal(b.potvrzeni.platnost_od, b.cenik.platnost_od);
  assert.equal(b.firma.ico, "09291881");
});

test("HSPGCena.nacti: nejdřív balíček z assets, při chybě soubory z /content/", async () => {
  const C = nactiJadro();
  const b = JSON.parse(soubor("assets/hspg-cenik.json"));
  const volani = [];
  const j1 = await C.nacti({ fetch: (u) => { volani.push(u); return odpoved(b); } });
  assert.deepEqual(volani, ["/assets/hspg-cenik.json"]);
  assert.equal(j1.potvrzeno, true);
  assert.equal(j1.firma.ico, "09291881");
  const obsah = { "ceny.json": b.cenik, "standard.json": b.standard, "sentinel.json": b.sentinel, "cenik-potvrzeni.json": b.potvrzeni };
  const volani2 = [];
  const j2 = await C.nacti({ fetch: (u) => { volani2.push(u); return u.includes("hspg-cenik") ? odpoved(null, false) : odpoved(obsah[u.split("/").pop()]); } });
  assert.equal(volani2.length, 5);
  assert.equal(j2.potvrzeno, true);
  const j3 = await C.nacti({ fetch: () => Promise.reject(new Error("offline")) });
  assert.equal(j3.potvrzeno, false, "bez dat se ceny neukazují");
});

test("našeptávač obcí vrací střed obce pro odhad dopravy", () => {
  const [kolin] = navrhyObci("Kolín");
  assert.equal(kolin.obec, "Kolín");
  assert.equal(typeof kolin.lat, "number");
  assert.equal(typeof kolin.lon, "number");
  assert.ok(!("adresa" in kolin));
});

test("odpovědi H-BOTa: pět kroků Standardu HOLUB, tarify SENTINEL z dat, bez značky biocidu a bez embarga", () => {
  const z = znalostiProProhlizec();
  const postup = z.otazky.find((e) => e.q === "Jaký je postup?").a;
  for (const k of ["01 Čištění", "02 Odmaštění", "03 Ošetření biocidy", "04 Oplach", "05 Ochranná vrstva", "Cesta A", "Cesta B"]) assert.ok(postup.includes(k), k);
  const pece = z.otazky.find((e) => e.q === "Jak funguje trvalá péče?").a;
  assert.match(pece, /SENTINEL BASE za 499 Kč ročně/);
  assert.match(pece, /SENTINEL PRESTIGE za 5 890 Kč ročně/);
  const vse = JSON.stringify(z);
  for (const re of [/H-BIO/, /letecké map/i, /satelit/i, /Google Maps/i, /katastr/i, /RÚIAN|RUIAN/i, /\bz map/i]) assert.doesNotMatch(vse, re, String(re));
  assert.match(vse, /Cena hned/, "odkaz na okamžitou kalkulaci");
});
