// PDF dokumenty z H-BOTa (úkol 48): orientační nabídka a NÁVRH smlouvy o dílo. Testuje se čistá definice
// dokumentu pdfmake (bez knihovny) – čísla z cenového jádra, nezávaznost, typografie a pravdivost textů.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const koren = new URL("../../web/", import.meta.url);
const json = (p) => JSON.parse(readFileSync(new URL(p, koren), "utf8"));
function nacti(soubor) {
  const ctx = { module: { exports: {} }, Math, Number, String, Object, Array, Promise, Error, isFinite, Date };
  vm.runInNewContext(readFileSync(new URL("assets/" + soubor, koren), "utf8"), ctx, { filename: soubor });
  return ctx.module.exports;
}
const C = nacti("hspg-cena.js");
const D = nacti("hspg-dokumenty.js");
const balicek = json("assets/hspg-cenik.json");
const jadro = C.vytvor(balicek);
const text = (def) => JSON.stringify(def, (k, v) => (typeof v === "function" ? undefined : v));
const kontext = (extra = {}) => ({
  cislo: "NK-20261022-0001", datum: new Date("2026-10-22T10:00:00Z"), firma: balicek.firma, standard: jadro.standard,
  tarify: jadro.tarify(), podminkaZaruky: jadro.podminkaZaruky(), cenik: jadro.cenik, obec: "Kolín", ...extra,
});
const rd = jadro.spocitej({ typObjektu: "rd", lat: 50.028, lon: 15.201, polozky: [
  { povrch: "strecha", cesta: "A", plocha: 190, zpusob: "plocha zadaná zákazníkem" },
  { povrch: "fasada", cesta: "B", plocha: 340, barva: { ral: "RAL 9001", nazev: "Krémově bílá" }, zpusob: "obvod 40 m × výška 8,5 m" },
] });

test("kalkulace: cena a řádky přesně z cenového jádra, celkem s nezlomitelnými mezerami", () => {
  const t = text(D.definiceKalkulace(rd, kontext()));
  assert.equal(rd.vysledna, 128790);
  assert.ok(t.includes("ORIENTAČNÍ CENOVÁ KALKULACE"));
  assert.ok(t.includes("128 790 Kč"), "celková cena");
  assert.ok(t.includes("33 820 Kč") && t.includes("101 320 Kč"), "řádky prací");
  assert.ok(t.includes("RAL 9001"), "zvolený odstín");
  assert.ok(t.includes("NK-20261022-0001"));
  assert.match(t, /není nabídkou ve smyslu § 1732/);
  assert.match(t, /Záloha|záloha 30/, "platební podmínky z ceníku");
});

test("NÁVRH smlouvy: vodoznak, nezávaznost podle § 1732, zákonné náležitosti a přílohy", () => {
  const def = D.definiceSmlouvy(rd, kontext({ objednatel: { jmeno: "Jan Novák", adresa: "Lipová 12, Kolín" } }));
  const t = text(def);
  assert.equal(def.watermark.text, "NÁVRH");
  for (const s of ["NEZÁVAZNÝ NÁVRH – NEJDE O NABÍDKU", "§ 1732", "§ 2586", "§ 1829", "§ 1834", "§ 1837", "www.coi.cz/informace-o-adr", "živnostenském rejstříku", "60\u00a0dnů", "Ukončením péče SENTINEL BASE", "Příloha č. 1 – Rozpis ceny", "Příloha č. 2 – Vzorový formulář pro odstoupení od smlouvy", "Jan Novák", "Lipová 12, Kolín", "neplátce DPH"]) {
    assert.ok(t.includes(s), s);
  }
  assert.match(t, /Záruka 10\slet na impregnaci H-STONE trvá při aktivní péči SENTINEL/, "podmínka záruky z sentinel.json");
  assert.match(t, /zálohu 30 % ceny na materiál ve výši 38 640 Kč/);
});

test("NÁVRH bez údajů objednatele má prázdná pole k vyplnění, záruka H-STONE jen u cesty A", () => {
  const b = jadro.spocitej({ typObjektu: "rd", polozky: [{ povrch: "fasada", cesta: "B", plocha: 120, barva: { ral: "RAL 7035", nazev: "Světle šedá" } }] });
  const t = text(D.definiceSmlouvy(b, kontext({ obec: "" })));
  assert.ok(t.includes("……………………………"));
  assert.doesNotMatch(t, /Záruka 10\slet na impregnaci/, "u samotné barevné renovace se záruka H-STONE neslibuje");
  assert.match(t, /Zálohu zhotovitel nepožaduje/);
});

test("dokumenty neobsahují zakázaná a nepravdivá tvrzení ani zdroje měření (embargo)", () => {
  const t = text(D.definiceKalkulace(rd, kontext())) + text(D.definiceSmlouvy(rd, kontext()));
  for (const re of [/H-BIO/, /certifikovan/i, /kvantov/i, /letecké map/i, /satelit/i, /Google Maps/i, /katastr/i, /RÚIAN|RUIAN/i, /Open-Meteo/i, /pojišťovn/i, /CO₂|CO2/]) {
    assert.doesNotMatch(t, re, String(re));
  }
  assert.match(t, /Používejte biocidy bezpečným způsobem/, "povinná věta u biocidů");
});

test("typografie: jednopísmenná předložka a jednotka se nezalomí", () => {
  assert.equal(D.typografie("k nabídce za 268 Kč/m² v odstínu"), "k nabídce za 268 Kč/m² v odstínu");
  const t = text(D.definiceSmlouvy(rd, kontext()));
  assert.ok(t.includes("k nabídce č. NK-20261022-0001"));
  assert.doesNotMatch(t, /\d \d{3} Kč/, "tisíce bez obyčejné mezery");
});
