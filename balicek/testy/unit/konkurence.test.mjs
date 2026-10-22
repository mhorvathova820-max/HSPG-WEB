// Kontrola nabídky jiného zhotovitele (22. 10. 2026): deterministický přehled proti Standardu HOLUB,
// neutrální formulace (§ 2980 OZ), limity, text se neukládá ani neloguje, AI shrnutí jen na vyžádání
// a jen z pseudonymizovaných řádků přehledu. Žádné skutečné volání AI.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { vytvorKonkurenci } from "../../web/netlify/functions/konkurence.mjs";
import { kontrolujNabidku, KRITERIA, NEUVEDENO, NEURCUJE, MAX_CITACE, citace } from "../../web/netlify/lib/konkurence/kontrola.mjs";
import { env, falesnyAdapter, pametoveUloziste, pozadavek, obdobi } from "../pomocne.mjs";

const obsah = (p) => JSON.parse(readFileSync(new URL(`../../web/content/${p}`, import.meta.url), "utf8"));
const NABIDKA = `CENOVÁ NABÍDKA č. 2026/117 – ZNACKA-XQ7
Objednatel: Ing. Jan Novák, Lipová 12, 280 02 Kolín, tel. 777 123 456, jan.novak@seznam.cz
Předmět: Čištění a impreg-
nace střešní krytiny (betonové tašky), plocha 190 m².
Postup: vysokotlaké mytí střechy, aplikace přípravku proti mechu a řasám, následně 2× nástřik hydrofobní impregnace na bázi siloxanu.
Cena: 145 Kč/m² bez DPH, celkem 27 550 Kč bez DPH.
Záruka na impregnaci 5 let. Práce provádíme z vysokozdvižné plošiny, lešení není potřeba.
Platební podmínky: záloha 50 % předem, doplatek po dokončení.`;

function sestav({ e = env(), adaptery, ul = pametoveUloziste() } = {}) {
  return { ul, e, h: vytvorKonkurenci({ env: e, adaptery, uloziste: ul }) };
}
const post = (h, body, { ip = "203.0.113.7", headers = {} } = {}) =>
  h(pozadavek("/api/konkurence", { method: "POST", body, headers }), { ip });

test("přehled: 14 bodů, uvedeno s citací ≤ 120 znaků, jinak neutrálně „v nabídce neuvedeno“", () => {
  const { radky, souhrn } = kontrolujNabidku(NABIDKA);
  assert.equal(radky.length, KRITERIA.length);
  assert.deepEqual(radky.map((r) => r.id), ["krok-01", "krok-02", "krok-03", "krok-04", "krok-05", "typ-vrstvy", "pocet-vrstev", "zaruka", "fotodokumentace", "pojisteni", "leseni", "dph", "cena-m2", "zaloha"]);
  const stav = Object.fromEntries(radky.map((r) => [r.id, r.vNabidce]));
  assert.deepEqual(stav, {
    "krok-01": "uvedeno", "krok-02": "neuvedeno", "krok-03": "uvedeno", "krok-04": "neuvedeno", "krok-05": "uvedeno",
    "typ-vrstvy": "uvedeno", "pocet-vrstev": "uvedeno", zaruka: "uvedeno", fotodokumentace: "neuvedeno", pojisteni: "neuvedeno",
    leseni: "uvedeno", dph: "uvedeno", "cena-m2": "uvedeno", zaloha: "uvedeno",
  });
  assert.deepEqual(souhrn, { celkem: 14, uvedeno: 10, neuvedeno: 4 });
  for (const r of radky) {
    assert.deepEqual(Object.keys(r), ["id", "kriterium", "standardHolub", "vNabidce", "citace"]);
    assert.ok(r.citace.length <= MAX_CITACE, r.citace);
    if (r.vNabidce === "neuvedeno") assert.equal(r.citace, NEUVEDENO);
  }
  assert.equal(radky.find((r) => r.id === "zaruka").citace, "Záruka na impregnaci 5 let.");
  assert.match(radky.find((r) => r.id === "cena-m2").citace, /145 Kč\/m² bez DPH/);
  assert.match(radky.find((r) => r.id === "krok-01").citace, /Čištění a impregnace/, "dělení slov z PDF se spojí");
});

test("sloupec Standard HOLUB jen ze schválených podkladů; pojištění netvrdí; žádné hodnocení konkurence", () => {
  const { radky } = kontrolujNabidku("Nabídka: mytí střechy.");
  const s = Object.fromEntries(radky.map((r) => [r.id, r.standardHolub]));
  const standard = obsah("standard.json");
  const bezNbsp = (t) => t.replace(/ /g, " ");
  for (const k of standard.kroky) assert.equal(bezNbsp(s[`krok-${k.cislo}`]), `${k.cislo} ${k.nazev} – ${k.popis}.`);
  assert.equal(bezNbsp(s.zaruka), obsah("sentinel.json").podminka_zaruky);
  assert.equal(s.pojisteni, NEURCUJE, "pojištění není doložené – přehled ho netvrdí");
  assert.match(s.dph, /neplátce DPH/);
  assert.match(s.leseni, /bez lešení/);
  assert.match(s.zaloha, /záloha 0 Kč/);
  assert.match(s["cena-m2"], /178 Kč/);
  const vse = JSON.stringify(radky);
  assert.doesNotMatch(vse, /H-BIO|nekvalitn|horší|lepší než|podvod|nedoporuč|šmejd/i);
});

test("ceny ve sloupci Standard HOLUB jen s potvrzeným ceníkem", () => {
  const { radky } = kontrolujNabidku("x", { potvrzeni: { platnost_od: "2027-01-01" } });
  assert.equal(radky.find((r) => r.id === "cena-m2").standardHolub, NEURCUJE);
});

test("text z PDF s rozloženými háčky (NFD) i bez diakritiky se rozpozná; citace krátí mezi slovy", () => {
  const nfd = "Provedeme odštraňení mechu biocidem a óplach.".normalize("NFD");
  const r = kontrolujNabidku(nfd).radky;
  assert.equal(r.find((x) => x.id === "krok-03").vNabidce, "uvedeno");
  assert.equal(kontrolujNabidku("ZARUKA 10 LET, ODMASTENI POVRCHU").radky.find((x) => x.id === "krok-02").vNabidce, "uvedeno");
  const dlouhy = "slovo ".repeat(40) + "fotodokumentace před a po " + "dalsi ".repeat(40);
  const c = citace(dlouhy, dlouhy.indexOf("foto"), dlouhy.indexOf("foto") + 15);
  assert.ok(c.length <= MAX_CITACE);
  assert.match(c, /^…(\S+ )+.*fotodokumentace.*…$/);
  assert.match(c, /^…slovo /, "řez je mezi slovy, ne uprostřed slova");
});

test("POST /api/konkurence: přehled, upozornění, bez AI; text se neukládá ani neloguje", async () => {
  const { h, ul } = sestav();
  const puvodni = [console.warn, console.log, console.error];
  const log = [];
  console.warn = console.log = console.error = (...a) => log.push(a.join(" "));
  let r;
  try {
    r = await post(h, { text: NABIDKA });
  } finally { [console.warn, console.log, console.error] = puvodni; }
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("cache-control"), "no-store");
  const j = await r.json();
  assert.equal(j.radky.length, 14);
  assert.equal(j.ai, null);
  assert.match(j.upozorneni, /nehodnotí/);
  const ulozeno = JSON.stringify([...ul._mapa.entries()]);
  assert.ok(!ulozeno.includes("ZNACKA-XQ7") && !ulozeno.includes("Novák") && !ulozeno.includes("777 123 456"), "v úložišti jen čítače limitů");
  assert.ok([...ul._mapa.keys()].every((k) => k.startsWith("limit/konkurence")), [...ul._mapa.keys()].join());
  assert.ok(log.every((z) => !z.includes("ZNACKA-XQ7")), "nic z textu nabídky v logu");
});

test("limity: 10 kontrol za hodinu na otisk IP, jiná IP projde; velikost, prázdný text, JSON, cizí původ", async () => {
  const { h } = sestav();
  for (let i = 0; i < 10; i++) assert.equal((await post(h, { text: "mytí střechy" })).status, 200, `kontrola ${i + 1}`);
  assert.equal((await post(h, { text: "mytí střechy" })).status, 429);
  assert.equal((await post(h, { text: "mytí střechy" }, { ip: "198.51.100.9" })).status, 200);
  assert.equal((await post(h, { text: "x".repeat(30_001) }, { ip: "198.51.100.10" })).status, 413);
  assert.equal((await post(h, "x".repeat(200_000), { ip: "198.51.100.11" })).status, 413, "velké tělo se odmítne i bez content-length");
  assert.equal((await post(h, { text: "   " }, { ip: "198.51.100.12" })).status, 400);
  assert.equal((await post(h, "{neplatné", { ip: "198.51.100.13" })).status, 400);
  assert.equal((await post(h, { text: "x" }, { ip: "198.51.100.14", headers: { origin: "https://cizi.example" } })).status, 403);
  const g = await h(pozadavek("/api/konkurence"), {});
  assert.equal(g.status, 200);
  assert.equal((await g.json()).maxZnaku, 30_000);
  assert.equal((await h(pozadavek("/api/konkurence", { method: "PUT", body: {} }), {})).status, 405);
});

test("bez úložiště limitů se kontrola neprovede (503) a text se nikam nezapíše", async () => {
  const rozbite = { async get() { throw new Error("down"); }, async getWithMetadata() { throw new Error("down"); }, async setJSON() { throw new Error("down"); } };
  const puvodni = console.warn;
  console.warn = () => {};
  try {
    const { h } = sestav({ ul: rozbite });
    assert.equal((await post(h, { text: NABIDKA })).status, 503);
  } finally { console.warn = puvodni; }
});

test("AI shrnutí jen na vyžádání: dostane jen řádky s pseudonymizovanými citacemi, platí rozpočet zákaznické AI", async () => {
  const ad = { claude: falesnyAdapter({ text: "Nabídka popisuje mytí a impregnaci; doptejte se na oplach a fotodokumentaci. Kontakt [TELEFON_1]." }) };
  const e = env();
  const { h, ul } = sestav({ e, adaptery: ad });
  const j = await (await post(h, { text: NABIDKA.replace("Záruka na impregnaci 5 let.", "Záruka na impregnaci 5 let, reklamace p. Novák na tel. 777 123 456."), ai: true })).json();
  assert.equal(ad.claude.volani.length, 1);
  const p = ad.claude.volani[0];
  assert.match(p.system, /Nehodnoť nabídku ani zhotovitele/);
  const vstup = p.zpravy[0].text;
  assert.match(vstup, /^PŘEHLED:\n- Krok 01 – Čištění: uvedeno/);
  assert.ok(!/Novák|777 123 456|seznam\.cz|Lipová/.test(vstup), "do AI jen značky");
  assert.match(vstup, /reklamace p\. \[JMENO_1\] na tel\. \[TELEFON_1\]/, "citace s osobními údaji jen se značkami");
  assert.ok(!vstup.includes("ZNACKA-XQ7"), "AI nedostane celý text nabídky, jen citace u bodů");
  assert.equal(j.ai.text, "Nabídka popisuje mytí a impregnaci; doptejte se na oplach a fotodokumentaci. Kontakt [telefon].");
  assert.equal(j.ai.model, "Claude");
  const u = await ul.get(`utrata/${obdobi(e)}`);
  assert.ok(u.verejneKc > 0, "útrata z rozpočtu zákaznické AI");
  const vyp = sestav({ e: env({ AI_ZAPNUTO: "0" }), adaptery: ad });
  assert.deepEqual((await (await post(vyp.h, { text: NABIDKA, ai: true }, { ip: "192.0.2.1" })).json()).ai, { stav: "nedostupne" });
  assert.equal(ad.claude.volani.length, 1, "s vypnutou AI se nevolá");
  const chudy = sestav({ e: env({ AI_MESICNI_LIMIT_KC: "0.0001" }), adaptery: ad });
  assert.equal((await (await post(chudy.h, { text: NABIDKA, ai: true }, { ip: "192.0.2.2" })).json()).ai.stav, "rozpocet");
});

test("přehled je deterministický: stejný text → stejný výsledek", () => {
  assert.deepEqual(kontrolujNabidku(NABIDKA), kontrolujNabidku(NABIDKA));
});
