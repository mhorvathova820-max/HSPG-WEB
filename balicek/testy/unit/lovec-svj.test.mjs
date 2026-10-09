// Lovec SVJ (úkol 24): uložené odpovědi (ARES syntetické, RÚIAN ze záznamu 9. 10. 2026, web SVJ, robots.txt,
// AI). Žádné živé hledání ani skutečné osobní údaje.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { vytvorLovce } from "../../web/netlify/functions/lovec-svj.mjs";
import { parsujRobots, najdiNaStrance, bezpecnaAdresa, patriSVJ } from "../../web/netlify/lib/lovec/zdroje.mjs";
import { skore } from "../../web/netlify/lib/lovec/beh.mjs";
import { vydejToken } from "../../web/netlify/lib/ai/autorizace.mjs";
import { env, pametoveUloziste, pozadavek } from "../pomocne.mjs";

const FIX = JSON.parse(readFileSync(new URL("../fixtures/mereni-ruian.json", import.meta.url), "utf8"));
const KOD_AM = FIX.adresni_misto.features[0].attributes.kod;
const odp = (j, status = 200, h = {}) => new Response(typeof j === "string" ? j : JSON.stringify(j), { status, headers: { "content-type": typeof j === "string" ? "text/html" : "application/json", ...h } });

const ARES_SEZNAM = {
  pocetCelkem: 3,
  ekonomickeSubjekty: [
    { ico: "12345678", obchodniJmeno: "Společenství vlastníků jednotek Testovací 8", pravniForma: "145", sidlo: { textovaAdresa: "Karlovo náměstí 8, Kolín I, 28002 Kolín", kodAdresnihoMista: KOD_AM, nazevUlice: "Karlovo náměstí", cisloDomovni: 8, nazevObce: "Kolín" } },
    { ico: "23456789", obchodniJmeno: "SVJ bez adresy", pravniForma: "145", sidlo: { textovaAdresa: "Kolín" } },
    { ico: "34567890", obchodniJmeno: "SVJ na seznamu neozývat", pravniForma: "145", sidlo: { textovaAdresa: "Kolín", kodAdresnihoMista: 1 } },
  ],
};
const VR = { zaznamy: [{ primarniZaznam: true, statutarniOrgany: [{ clenoveOrganu: [
  { clenstvi: { funkce: { nazev: "místopředseda výboru" } }, fyzickaOsoba: { jmeno: "PETR", prijmeni: "TESTOVACÍ", datumNarozeni: "1970-01-01", adresa: { textovaAdresa: "Soukromá 1" } } },
  { clenstvi: { funkce: { nazev: "předseda výboru" } }, fyzickaOsoba: { titulPredJmenem: "Ing.", jmeno: "JANA", prijmeni: "VZOROVÁ", datumNarozeni: "1971-02-02", adresa: { textovaAdresa: "Soukromá 2" } } },
] }] }] };
const STRANKA = `<html><body><h1>Společenství vlastníků jednotek Testovací 8</h1><p>IČO: 12345678, Karlovo náměstí 8, Kolín</p>
<p>Kontakt pro SVJ: výbor společenství, e-mail vybor@svj-test.example</p>
<p>Vlastník bytu č. 12, tel. 777 123 456</p></body></html>`;

function sit() {
  const volani = [];
  const so = structuredClone(FIX.stavebni_objekt);
  Object.assign(so.features[0].attributes, { zpusobvyuzitikod: 6, pocetpodlazi: 8, druhkonstrukcekod: 41 });
  const f = async (url, init = {}) => {
    const u = String(url);
    volani.push(u);
    if (u.includes("ekonomicke-subjekty/vyhledat")) {
      const t = JSON.parse(init.body);
      if (t.sidlo.kodObce === 554782) return odp({ kod: "CHYBA_VSTUPU", popis: "Zadaný dotaz vrací příliš mnoho výsledků (12 000)." }, 400);
      return odp(ARES_SEZNAM);
    }
    if (u.includes("ekonomicke-subjekty-vr/")) return odp(VR);
    if (u.includes("/MapServer/1/query")) return odp(FIX.adresni_misto);
    if (u.includes("/MapServer/3/query") && init.method === "POST") return odp(FIX.sousede);
    if (u.includes("/MapServer/3/query")) return odp(so);
    if (u.includes("identify")) return odp({ value: u.includes("dmr5g") ? "213" : "237" }); // plochá střecha 24 m
    if (u === "https://svj-test.example/robots.txt") return odp("User-agent: *\nDisallow: /interni\n", 200, { "content-type": "text/plain" });
    if (u === "https://svj-test.example/kontakt") return odp(STRANKA);
    if (u === "https://jiny.example/robots.txt") return odp("", 404);
    if (u === "https://jiny.example/") return odp("<p>Kontakt: x@jiny.example – správa domů</p>");
    return odp("nenalezeno", 404);
  };
  f.volani = volani;
  return f;
}
const ai = ({ kontrolaDopisu = true } = {}) => {
  const volani = [];
  const ad = (fn) => ({ async dotaz(p) { volani.push(p); return { text: fn(p), stat: { vstup: 100, vystup: 50 } }; } });
  return {
    volani,
    perplexity: ad(() => JSON.stringify({ kandidati: [
      { url: "https://svj-test.example/kontakt", typ: "email", hodnota: "vybor@svj-test.example" },
      { url: "https://svj-test.example/kontakt", typ: "telefon", hodnota: "+420 777 123 456" },
      { url: "https://svj-test.example/interni/kontakty", typ: "email", hodnota: "tajne@svj-test.example" },
      { url: "https://jiny.example/", typ: "email", hodnota: "x@jiny.example" },
      { url: "http://127.0.0.1/admin", typ: "email", hodnota: "a@b.cz" },
    ] })),
    claude: ad((p) => (/Zkontroluj dopis/.test(p.system) ? JSON.stringify(kontrolaDopisu ? { ok: true, problemy: [] } : { ok: false, problemy: ["vymyšlená cena"] }) : '{"patri":true,"role":"vybor","duvod":"kontakt výboru"}')),
    mistral: ad(() => "nabízíme vám zaměření domu zdarma. Podle mapových podkladů má dům fasády přibližně 1 400 m²."),
  };
};
const e = env({ OPENROUTER_API_KEY: "test" });
const auth = () => ({ authorization: `Bearer ${vydejToken(e).token}` });
const post = (h, body) => h(pozadavek("/api/lovec-svj", { method: "POST", headers: auth(), body }));
async function dobehni(h, beh) {
  let p;
  for (let i = 0; i < 25; i++) { p = await (await post(h, { akce: "krok", beh })).json(); if (p.hotovo) return p; }
  return p;
}
function lovec(opts = {}) {
  const ul = pametoveUloziste();
  const a = ai(opts);
  const f = sit();
  const h = vytvorLovce({ env: e, fetchFn: f, uloziste: ul, ulozisteAI: pametoveUloziste(), ulozisteMereni: pametoveUloziste(), ulozistePlanovac: pametoveUloziste(), adaptery: a });
  return { h, ul, a, f };
}

test("běh: ARES → měření → hledání → ověření; uloží jen ověřený kontakt SVJ se zdrojem, citací a datem", async () => {
  const { h, ul, f } = lovec();
  await ul.setJSON("neozyvat/34567890", { ico: "34567890" });
  const s = await (await post(h, { akce: "start", obec: "Kolín", n: 5 })).json();
  assert.equal(s.celkem, 2, "subjekt ze seznamu neozývat se přeskočí");
  const p = await dobehni(h, s.beh);
  assert.equal(p.hotovo, true);
  assert.equal(p.navrhu, 1, JSON.stringify(p.log));
  const n = await ul.get("navrhy/12345678");
  assert.equal(n.budova.panel, true);
  assert.equal(n.budova.cil, true);
  assert.ok(n.budova.skore > 0 && n.budova.skore <= 100);
  assert.equal(n.kontakty.length, 1, JSON.stringify(n.zahozeno));
  assert.deepEqual([n.kontakty[0].typ, n.kontakty[0].hodnota, n.kontakty[0].url], ["email", "vybor@svj-test.example", "https://svj-test.example/kontakt"]);
  assert.match(n.kontakty[0].citace, /výbor společenství/);
  assert.ok(n.kontakty[0].overeno);
  const duvody = n.zahozeno.map((z) => z.duvod).join(" | ");
  assert.match(duvody, /není označený jako kontakt SVJ/, "telefon vlastníka bytu se zahodí");
  assert.match(duvody, /robots\.txt zakazuje/);
  assert.match(duvody, /neuvádí IČO ani adresu/);
  assert.ok(!f.volani.some((u) => u.includes("127.0.0.1")), "interní adresy od AI se nestahují");
  assert.ok(!f.volani.some((u) => u.includes("ekonomicke-subjekty-vr")), "bez souhlasu se jméno předsedy nehledá");
  assert.equal(n.predseda, null);
  assert.ok(!JSON.stringify(await ul.get("navrhy/12345678")).includes("777123456"));
});

test("schválení → databáze s právním základem, e-mail zakázán; dopis s QR, kuponem, zdrojem a odmítnutím", async () => {
  const { h, ul } = lovec();
  const s = await (await post(h, { akce: "start", obec: "Kolín", n: 1 })).json();
  await dobehni(h, s.beh);
  const r = await (await post(h, { akce: "schvalit", ico: "12345678", kontakty: [0] })).json();
  assert.equal(r.ok, true);
  const z = await ul.get("databaze/12345678");
  assert.match(z.pravniZaklad, /oprávněný zájem/);
  assert.equal(z.kanaly.email, false);
  assert.equal(z.emailPovolen, false);
  assert.ok(z.zdrojUdaju.includes("https://svj-test.example/kontakt"));
  assert.equal(await ul.get("navrhy/12345678"), null);
  const d = await post(h, { akce: "dopis", ico: "12345678" });
  assert.equal(d.headers.get("x-dopis-autor"), "mistral");
  const html = await d.text();
  assert.match(html, /Odkud máme vaše údaje/);
  assert.match(html, /neoslovovat/);
  assert.match(html, /<svg/);
  assert.match(html, /planovac\/\?kupon=HS-/);
  assert.match(html, /ne geodetické zaměření/);
  assert.match(html, /k rukám výboru společenství/);
  const kod = html.match(/\(kód ([\w-]{10})\)/)[1];
  assert.equal((await (await post(h, { akce: "neozyvat", kod })).json()).ok, true, "odmítnutí podle kódu z dopisu");
  assert.ok(await ul.get("neozyvat/12345678"));
  assert.equal(await ul.get("databaze/12345678"), null);
});

test("Claude dopis neschválí → šablona z ověřených faktů (bez AI textu)", async () => {
  const { h } = lovec({ kontrolaDopisu: false });
  const s = await (await post(h, { akce: "start", obec: "Kolín", n: 1 })).json();
  await dobehni(h, s.beh);
  await post(h, { akce: "schvalit", ico: "12345678" });
  const d = await post(h, { akce: "dopis", ico: "12345678" });
  assert.equal(d.headers.get("x-dopis-autor"), "sablona");
  assert.ok(!(await d.text()).includes("1 400 m²"), "text Mistralu se nepoužil");
});

test("neozývat: smaže záznam a příští běh subjekt přeskočí; dopis pro něj nejde", async () => {
  const { h, ul } = lovec();
  const s = await (await post(h, { akce: "start", obec: "Kolín", n: 1 })).json();
  await dobehni(h, s.beh);
  await post(h, { akce: "schvalit", ico: "12345678" });
  assert.equal((await (await post(h, { akce: "neozyvat", ico: "12345678", duvod: "telefonicky" })).json()).ok, true);
  assert.equal(await ul.get("databaze/12345678"), null);
  assert.equal((await post(h, { akce: "dopis", ico: "12345678" })).status, 404);
  const s2 = await (await post(h, { akce: "start", obec: "Kolín", n: 5 })).json();
  assert.equal(s2.celkem, 2);
});

test("oslovení jménem (zapnuté): jen jméno a funkce předsedy, datum narození ani bydliště se neuloží", async () => {
  const { h, ul } = lovec();
  const s = await (await post(h, { akce: "start", obec: "Kolín", n: 1, osloveniJmenem: true }));
  await dobehni(h, (await s.json()).beh);
  const n = await ul.get("navrhy/12345678");
  assert.deepEqual(n.predseda, { osloveni: "Ing. Jana Vzorová", funkce: "předseda výboru", zdroj: "veřejný rejstřík (ARES)" });
  const vse = JSON.stringify([...ul._mapa.values()]);
  assert.ok(!vse.includes("1971") && !vse.includes("Soukromá"), "žádné datum narození ani adresa osoby");
});

test("velké město (ARES > 1 000) → 422; bez přihlášení 401; neznámá obec 404", async () => {
  const { h } = lovec();
  assert.equal((await post(h, { akce: "start", obec: "Praha" })).status, 422);
  assert.equal((await h(pozadavek("/api/lovec-svj", { method: "POST", body: { akce: "start", obec: "Kolín" } }))).status, 401);
  assert.equal((await post(h, { akce: "start", obec: "Neexistujeov" })).status, 404);
});

test("pomůcky: robots.txt, telefon v různých zápisech, bezpečné adresy, identita SVJ, skóre", () => {
  const r = parsujRobots("User-agent: Googlebot\nDisallow: /\n\nUser-agent: *\nAllow: /kontakt\nDisallow: /\n");
  assert.deepEqual(r.map((x) => x.cesta), ["/kontakt", "/"]);
  for (const zapis of ["+420 777 123 456", "777123456", "777 123 456", "+420777-123-456"]) assert.ok(najdiNaStrance("tel.: 777 123 456 výbor", "telefon", zapis) >= 0, zapis);
  assert.equal(najdiNaStrance("tel.: 777 123 457", "telefon", "777123456"), -1);
  for (const u of ["http://127.0.0.1/", "http://localhost/", "https://x.netlify.app/", "file:///etc/passwd", "https://user:pw@a.cz/"]) assert.equal(bezpecnaAdresa(u), null, u);
  assert.ok(bezpecnaAdresa("https://svj-kolin.cz/kontakt"));
  assert.equal(patriSVJ("SVJ Karlovo náměstí 8, Kolín", { ico: "1", ulice: "Karlovo náměstí", cisloDomovni: 8, obec: "Kolín" }), true);
  assert.equal(patriSVJ("SVJ Karlovo náměstí 80, Kolín", { ico: "1", ulice: "Karlovo náměstí", cisloDomovni: 8, obec: "Kolín" }), false);
  assert.equal(skore({ fasady: 3000, strecha: 1000, panel: true }), 100);
  assert.equal(skore({ fasady: null, strecha: null, panel: false }), 0);
});
