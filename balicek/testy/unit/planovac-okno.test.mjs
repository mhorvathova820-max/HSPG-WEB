// Technologické okno pro veřejný kalendář (R17): pravděpodobnost srážek > 30 % nebo teplota < 5 °C v pracovní
// době 7–19 h místního času → technologicky nevhodný den. Pravidlo z content/pocasi-prace.json, předpověď
// v normalizovaném tvaru MET Norway (viz lib/pocasi/zdroj.mjs). Nic nejde na internet.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pravidloOkna, oknoDne } from "../../web/netlify/lib/planovac/okno.mjs";
import { vytvorPlanovac } from "../../web/netlify/functions/planovac.mjs";
import { zMistniho, mistni, dalsiDen } from "../../web/netlify/lib/pocasi/ical.mjs";
import { pametoveUloziste, pozadavek } from "../pomocne.mjs";

const PRAVIDLA = JSON.parse(readFileSync(new URL("../../web/content/pocasi-prace.json", import.meta.url), "utf8"));
const P = pravidloOkna(PRAVIDLA);
const HOD = 36e5;
const D = "2026-11-03"; // úterý, SEČ

const zacatekDne = (datum) => { const [r, m, d] = datum.split("-").map(Number); return zMistniho(r, m, d, 0); };
const blok = (od, h, x = {}) => ({ od, teplota: 12, vitr: 3, narazy: null, vlhkost: 70, srazky: 0, srazkyHodin: h, pravdepodobnost: 10, teplotaMinBlok: null, teplotaMaxBlok: null, ...x });

// Hodinová řada pro celý místní den; hodnoty podle místní hodiny (na den přechodu času má den 25 hodin).
function hodinovaRada(datum, { pravdepodobnost = () => 10, teplota = () => 12 } = {}) {
  const rada = [];
  for (let t = zacatekDne(datum); t < zacatekDne(dalsiDen(datum)); t += HOD) {
    const h = mistni(t).hodina;
    rada.push(blok(t, 1, { teplota: teplota(h), pravdepodobnost: pravdepodobnost(h) }));
  }
  return rada;
}
// Šestihodinové bloky (v zimě začínají v 1, 7, 13 a 19 h místního času).
function sestihodinova(datum, bloky) {
  const [r, m, d] = datum.split("-").map(Number);
  return bloky.map((b) => blok(zMistniho(r, m, d, b.hod), 6, { teplota: b.t ?? 10, pravdepodobnost: b.p ?? 10, teplotaMinBlok: b.tmin ?? 8, teplotaMaxBlok: 14 }));
}

test("pravidlo z pocasi-prace.json: 30 %, 5 °C, 7–19 h a text pro zákazníky; bez potvrzení se nepoužije", () => {
  assert.deepEqual(P, {
    text: "Technologicky nevhodný den (Ochranné vrstvy a barvy vyžadují bezsrážkové klima)",
    pravdepodobnostSrazekMax: 30,
    teplotaMin: 5,
    pracovniDoba: { od: 7, do: 19 },
  });
  assert.equal(pravidloOkna({ verejne: { technologickeOkno: { ...PRAVIDLA.verejne.technologickeOkno, potvrzeno: false } } }), null);
  assert.equal(pravidloOkna({ verejne: { suchoMm: 0.5 } }), null);
  assert.equal(pravidloOkna(undefined), null);
});

test("suchý teplý den je vhodný; přesně 30 % a 5 °C pravidlo ještě nepřekračují", () => {
  assert.deepEqual(oknoDne(hodinovaRada(D), D, P), { od: 7, do: 19, pravdepodobnostMax: 10, teplotaMin: 12, nevhodne: false, duvody: [] });
  const hranice = oknoDne(hodinovaRada(D, { pravdepodobnost: () => 30, teplota: () => 5 }), D, P);
  assert.equal(hranice.nevhodne, false);
  assert.deepEqual(hranice.duvody, []);
});

test("pravděpodobnost srážek nad 30 % v pracovní době → nevhodný den; bloky 6–7 h a 19–20 h se nepočítají", () => {
  const o = oknoDne(hodinovaRada(D, { pravdepodobnost: (h) => (h === 14 ? 45 : 10) }), D, P);
  assert.equal(o.nevhodne, true);
  assert.deepEqual(o.duvody, ["srazky"]);
  assert.equal(o.pravdepodobnostMax, 45);
  const mimo = oknoDne(hodinovaRada(D, { pravdepodobnost: (h) => (h === 6 || h === 19 ? 90 : 10) }), D, P);
  assert.equal(mimo.nevhodne, false);
  assert.equal(mimo.pravdepodobnostMax, 10);
});

test("teplota pod 5 °C v pracovní době → nevhodný den; noční mráz mimo pracovní dobu ne", () => {
  const noc = oknoDne(hodinovaRada(D, { teplota: (h) => (h < 7 || h > 19 ? -2 : 8) }), D, P);
  assert.equal(noc.nevhodne, false);
  assert.equal(noc.teplotaMin, 8);
  const rano = oknoDne(hodinovaRada(D, { teplota: (h) => (h === 8 ? 4.4 : 9) }), D, P);
  assert.deepEqual([rano.nevhodne, rano.duvody, rano.teplotaMin], [true, ["teplota"], 4.4]);
  const obe = oknoDne(hodinovaRada(D, { teplota: () => 2, pravdepodobnost: () => 70 }), D, P);
  assert.deepEqual(obe.duvody, ["srazky", "teplota"]);
});

test("šestihodinové bloky: rozhoduje překryv s pracovní dobou, noční minimum bloku 1–7 h se nezapočítá", () => {
  const den = "2026-11-05";
  const zaklad = [{ hod: 1, p: 80, tmin: -3 }, { hod: 7, p: 20, tmin: 6 }, { hod: 13, p: 25, tmin: 7 }, { hod: 19, p: 70, tmin: -1 }];
  const o = oknoDne(sestihodinova(den, zaklad), den, P);
  assert.deepEqual([o.nevhodne, o.pravdepodobnostMax, o.teplotaMin], [false, 25, 6]);
  const dest = oknoDne(sestihodinova(den, zaklad.map((b) => (b.hod === 13 ? { ...b, p: 35 } : b))), den, P);
  assert.deepEqual([dest.nevhodne, dest.duvody], [true, ["srazky"]]);
  const zima = oknoDne(sestihodinova(den, zaklad.map((b) => (b.hod === 7 ? { ...b, tmin: 4 } : b))), den, P);
  assert.deepEqual([zima.nevhodne, zima.duvody], [true, ["teplota"]]);
});

test("25. 10. 2026 (konec letního času): pracovní doba se počítá v místním čase", () => {
  const den = "2026-10-25";
  assert.equal(zMistniho(2026, 10, 25, 7), Date.UTC(2026, 9, 25, 6), "7:00 SEČ = 6:00 UTC");
  // 6:00–7:00 místního času (5:00 UTC) ještě mimo pracovní dobu; při chybném posunu o hodinu by den padl.
  const rano = oknoDne(hodinovaRada(den, { pravdepodobnost: (h) => (h === 6 ? 90 : 10) }), den, P);
  assert.equal(rano.nevhodne, false);
  const odpoledne = oknoDne(hodinovaRada(den, { pravdepodobnost: (h) => (h === 18 ? 90 : 10) }), den, P);
  assert.equal(odpoledne.nevhodne, true);
});

test("za dosahem předpovědi nic netvrdí: null; neznámá pravděpodobnost → rozhodne jen porušená teplota", () => {
  assert.equal(oknoDne(hodinovaRada(D), dalsiDen(D), P), null, "den bez předpovědi");
  assert.equal(oknoDne(hodinovaRada(D).filter((b) => mistni(b.od).hodina < 10), D, P), null, "pracovní doba pokrytá jen ze 3/12");
  assert.equal(oknoDne([], D, P), null);
  assert.equal(oknoDne(hodinovaRada(D), D, null), null);
  assert.equal(oknoDne(hodinovaRada(D), "zitra", P), null);
  const bezP = oknoDne(hodinovaRada(D, { pravdepodobnost: () => null }), D, P);
  assert.deepEqual([bezP.nevhodne, bezP.pravdepodobnostMax], [null, null]);
  const bezPzima = oknoDne(hodinovaRada(D, { pravdepodobnost: () => null, teplota: () => 3 }), D, P);
  assert.deepEqual([bezPzima.nevhodne, bezPzima.duvody], [true, ["teplota"]]);
});

// --- /api/planovac -------------------------------------------------------------------------------------------
const TED = Date.parse("2026-11-02T08:00:00Z"); // pondělí 2. 11. 2026, 9:00 SEČ
function radaPlanovace() {
  const rada = [];
  for (let t = Math.floor(TED / HOD) * HOD; t < zacatekDne("2026-11-11"); t += HOD) {
    const { datum, hodina } = mistni(t);
    rada.push(blok(t, 1, {
      pravdepodobnost: datum === "2026-11-04" && hodina === 10 ? 60 : 10,
      teplota: datum === "2026-11-06" && hodina === 8 ? 3 : 12,
    }));
  }
  return rada;
}
const planovac = (pravidla = PRAVIDLA) => vytvorPlanovac({
  env: {},
  uloziste: pametoveUloziste(),
  ted: () => TED,
  pravidla,
  predpoved: async () => ({ aktualizovano: new Date(TED).toISOString(), rada: radaPlanovace() }),
  kalendar: async () => ({ nastaveno: false, udalosti: [], preskoceno: null }),
});

test("/api/planovac: dny mají okno, nevhodné dny podle pravidla, za předpovědí null a pravidlo pro stránku", async () => {
  const r = await planovac()(pozadavek("/api/planovac?obec=Kol%C3%ADn"));
  assert.equal(r.status, 200);
  const j = await r.json();
  assert.equal(j.misto.obec, "Kolín");
  assert.equal(j.dny.length, 21);
  assert.deepEqual(j.technologickeOkno, P);
  const den = (d) => j.dny.find((x) => x.datum === d);
  assert.deepEqual(den("2026-11-03").okno, { od: 7, do: 19, pravdepodobnostMax: 10, teplotaMin: 12, nevhodne: false, duvody: [] });
  assert.deepEqual([den("2026-11-04").okno.nevhodne, den("2026-11-04").okno.duvody], [true, ["srazky"]]);
  assert.deepEqual([den("2026-11-06").okno.nevhodne, den("2026-11-06").okno.duvody, den("2026-11-06").okno.teplotaMin], [true, ["teplota"], 3]);
  assert.equal(den("2026-11-12").okno, null, "za dosahem předpovědi");
  // Stávající pole zůstávají (plánovač a /akce/ je dál používají).
  for (const d of j.dny) assert.ok("pocasi" in d && "volno" in d && "pracovni" in d);
  assert.equal(den("2026-11-04").pocasi.sucho, true);
  assert.ok(j.sleva && j.kupon && j.zdrojPocasi);
});

test("/api/planovac bez obce a bez potvrzeného pravidla: odpověď beze změny (žádné okno)", async () => {
  const bezObce = await (await planovac()(pozadavek("/api/planovac"))).json();
  assert.ok(bezObce.dny.every((d) => d.okno === null && d.pocasi === null));
  const pravidla = structuredClone(PRAVIDLA);
  pravidla.verejne.technologickeOkno.potvrzeno = false;
  const j = await (await planovac(pravidla)(pozadavek("/api/planovac?obec=Kol%C3%ADn"))).json();
  assert.equal("technologickeOkno" in j, false);
  assert.ok(j.dny.every((d) => !("okno" in d)));
});
