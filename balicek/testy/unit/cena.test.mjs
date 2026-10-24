// Cenové jádro HSPG (úkol 50): modelové příklady z /cenik musí sedět na korunu,
// pětikrokový standard, cesta B s barvou, tarify SENTINEL z dat a potvrzení ceníku.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const koren = new URL("../../web/", import.meta.url);
const json = (p) => JSON.parse(readFileSync(new URL(p, koren), "utf8"));
const cenik = json("content/ceny.json");
const standard = json("content/standard.json");
const sentinel = json("content/sentinel.json");
const potvrzeni = json("content/cenik-potvrzeni.json");

function nactiJadro() {
  const kod = readFileSync(new URL("assets/hspg-cena.js", koren), "utf8");
  const ctx = { module: { exports: {} }, Math, Number, String, Object, Array, Promise, Error, isFinite };
  vm.runInNewContext(kod, ctx, { filename: "hspg-cena.js" });
  return ctx.module.exports;
}
const C = nactiJadro();
// Pole a objekty z vm kontextu mají jiné prototypy – porovnává se přes JSON.
const cist = (x) => JSON.parse(JSON.stringify(x));
const jadro = C.vytvor({ cenik, standard, sentinel, potvrzeni });

test("modelový rodinný dům 340 m² fasády + 190 m² střechy, cesta A, sleva 5 % = 86 390 Kč", () => {
  const n = jadro.spocitej({ typObjektu: "rd", polozky: [{ povrch: "fasada", cesta: "A", plocha: 340 }, { povrch: "strecha", cesta: "A", plocha: 190 }] });
  assert.equal(n.vysledna, 86390);
  assert.equal(n.sleva.id, "vice-povrchu");
});

test("vjezd a terasa 90 m² dlažby = 10 710 Kč", () => {
  assert.equal(jadro.spocitej({ polozky: [{ povrch: "dlazba", cesta: "A", plocha: 90 }] }).vysledna, 10710);
});

test("panelový dům 1 400 m² fasády se zakrýváním oken a slevou SVJ = 250 040 Kč", () => {
  const n = jadro.spocitej({ typObjektu: "bytovy", polozky: [{ povrch: "fasada", cesta: "A", plocha: 1400 }] });
  assert.equal(n.vysledna, 250040);
  assert.equal(n.platba.zalohaNutna, true);
  assert.equal(n.platba.splatnostDni, 14);
});

test("kalkulačka SVJ 80 m × 6 podlaží = 186 460 Kč", () => {
  const plocha = 80 * 6 * C.VYSKA_PODLAZI * (1 - C.ODECET_OTVORU);
  assert.equal(jadro.spocitej({ typObjektu: "bytovy", polozky: [{ povrch: "fasada", cesta: "A", plocha }] }).vysledna, 186460);
});

test("minimum zakázky 4 900 Kč a samostatná fotovoltaika 2 490 Kč", () => {
  const a = jadro.spocitej({ polozky: [{ povrch: "dlazba", cesta: "A", plocha: 10 }] });
  assert.equal(a.vysledna, 4900); assert.equal(a.minimumPouzito, true);
  assert.equal(jadro.spocitej({ polozky: [{ povrch: "fve", plocha: 20 }] }).vysledna, 2490);
});

test("cesta B – barevná renovace střechy 268 Kč/m² s vybraným odstínem RAL", () => {
  const barva = standard.barvy_renovace.strecha[0];
  const n = jadro.spocitej({ polozky: [{ povrch: "strecha", cesta: "B", plocha: 100, barva }] });
  assert.equal(n.radky[0].sazba, 268);
  assert.match(n.radky[0].detail, new RegExp(barva.ral));
  assert.equal(n.vysledna, 26800);
  assert.deepEqual(cist(n.cesty.map((c) => c.id)), ["B"]);
});

test("cesta B pro dlažbu ceník nemá → chyba, cesty pro povrch nabízí jen A", () => {
  assert.throws(() => jadro.spocitej({ polozky: [{ povrch: "dlazba", cesta: "B", plocha: 50 }] }));
  assert.deepEqual(cist(jadro.cestyPro("dlazba").map((c) => c.id)), ["A"]);
  assert.deepEqual(cist(jadro.cestyPro("strecha").map((c) => c.id)), ["A", "B"]);
  assert.deepEqual(cist(jadro.cestyPro("fve")), []);
});

test("měděný prvek 6 m = 1 490 + 2 × 290 Kč", () => {
  const n = jadro.spocitej({ polozky: [{ povrch: "strecha", cesta: "A", plocha: 100, med: 6 }] });
  assert.equal(n.doplnky, 2070);
  assert.equal(n.vysledna, 17800 + 2070);
});

test("záloha 0 Kč do 100 000 Kč, splatnost 7 dnů", () => {
  const n = jadro.spocitej({ polozky: [{ povrch: "strecha", cesta: "A", plocha: 200 }] });
  assert.equal(n.platba.zaloha, 0);
  assert.match(n.platba.text, /Záloha 0 Kč/);
});

test("Skip Pay se ukáže jen se zapnutým příznakem v ceny.json", () => {
  assert.equal(jadro.spocitej({ polozky: [{ povrch: "strecha", cesta: "A", plocha: 100 }] }).skipPay, null);
  const zap = C.vytvor({ cenik: { ...cenik, platby: { ...cenik.platby, skip_pay: { ...cenik.platby.skip_pay, zapnuto: true } } }, standard, sentinel, potvrzeni });
  const n = zap.spocitej({ polozky: [{ povrch: "strecha", cesta: "A", plocha: 100 }] });
  assert.equal(n.skipPay.splatek, 3);
  assert.equal(n.skipPay.splatka, Math.ceil(17800 / 3));
});

test("pětikrokový standard: 5 kroků, bez názvu značky biocidu", () => {
  const n = jadro.spocitej({ polozky: [{ povrch: "fasada", cesta: "A", plocha: 150 }] });
  assert.equal(n.kroky.length, 5);
  const text = JSON.stringify(n);
  assert.doesNotMatch(text, /H-BIO/);
  assert.match(n.biocidy, /Používejte biocidy bezpečným způsobem/);
});

test("tarify SENTINEL BASE 499, PLUS 2 490, PRESTIGE 5 890 Kč/rok; BASE drží záruku", () => {
  const t = jadro.tarify();
  assert.deepEqual(cist(t.map((x) => [x.id, x.cena_rok])), [["base", 499], ["plus", 2490], ["prestige", 5890]]);
  assert.equal(t[0].povinny_pro_zaruku, true);
  assert.match(jadro.podminkaZaruky(), /BASE/);
});

test("ceník je potvrzený jen při shodě platnosti; jinak potvrzeno = false", () => {
  assert.equal(jadro.potvrzeno, true);
  const jiny = C.vytvor({ cenik: { ...cenik, platnost_od: "2027-01-01" }, standard, sentinel, potvrzeni });
  assert.equal(jiny.potvrzeno, false);
  assert.equal(C.vytvor({ cenik, standard, sentinel }).potvrzeno, false);
});

test("doprava: do 30 km zdarma, dál 12 Kč/km; bez polohy se upřesní", () => {
  assert.equal(C.dopravaPro(cenik, 50.0875, 14.4214).cena, 0);
  const lib = C.dopravaPro(cenik, 50.7663, 15.0543);
  assert.equal(lib.znamo, true); assert.ok(lib.cena > 0);
  assert.equal(C.dopravaPro(cenik).znamo, false);
});

test("měření mnohoúhelníku: obdélník ~7,15 × 11,12 m ≈ 79,5 m²", () => {
  const m = C.metrikyMnohouhelniku([{ lat: 50, lng: 15 }, { lat: 50, lng: 15.0001 }, { lat: 50.0001, lng: 15.0001 }, { lat: 50.0001, lng: 15 }]);
  assert.ok(Math.abs(m.plocha - 79.5) < 0.5);
});

test("typografie: nezlomitelná mezera po předložce a mezi číslem a jednotkou", () => {
  assert.equal(C.typografie("Penetrace a 2× nástřik v odstínu za 268 Kč/m²"), "Penetrace a\u00a02× nástřik v\u00a0odstínu za 268\u00a0Kč/m²");
  assert.equal(C.typografie("od 1 490 Kč"), "od 1\u00a0490\u00a0Kč");
});
