import { test } from "node:test";
import assert from "node:assert/strict";
import { vytvorAsistenta, prectiVerdikt, poradi, maskujKontakty } from "../../web/netlify/functions/asistent.mjs";
import { env, falesnyAdapter, pametoveUloziste, pozadavek } from "../pomocne.mjs";

const OTAZKA = { zpravy: [{ role: "user", text: "Kolik stojí čištění střechy?" }] };
const post = (body = OTAZKA) => pozadavek("/api/asistent", { method: "POST", body });

function sestav({ e = env(), adaptery = {}, ul = pametoveUloziste(), casy } = {}) {
  const ad = {
    claude: falesnyAdapter({ text: "Střecha od 99 Kč/m²." }),
    gemini: falesnyAdapter({ text: '{"ok": true, "odpoved": ""}' }),
    gpt: falesnyAdapter({ text: '{"ok": true, "odpoved": ""}' }),
    grok: falesnyAdapter(),
    ...adaptery,
  };
  return { h: vytvorAsistenta({ env: e, adaptery: ad, uloziste: ul, znalosti: "ZNALOSTI", ...(casy ? { casy } : {}) }), ad, ul };
}

test("GET hlásí dostupné AI v pořadí", async () => {
  const { h } = sestav();
  const r = await h(pozadavek("/api/asistent"));
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ai: true, poskytovatele: ["Claude", "Gemini", "ChatGPT"] });
});

test("bez klíčů: GET ai=false, POST 503 bez-ai (prohlížeč odpoví z FAQ)", async () => {
  const { h } = sestav({ e: { HSPG_PANEL_HESLO: "x".repeat(16) } });
  assert.deepEqual(await (await h(pozadavek("/api/asistent"))).json(), { ai: false, poskytovatele: [] });
  const r = await h(post());
  assert.equal(r.status, 503);
  assert.equal((await r.json()).rezim, "bez-ai");
});

test("AI_ZAPNUTO=0 vypne veřejnou AI i s klíči", async () => {
  const { h } = sestav({ e: env({ AI_ZAPNUTO: "0" }) });
  assert.equal((await h(post())).status, 503);
});

test("spolupráce: Claude píše, Gemini ověří → overeno=true", async () => {
  const { h, ad } = sestav();
  const j = await (await h(post())).json();
  assert.deepEqual(j, { rezim: "ai", odpoved: "Střecha od 99 Kč/m².", overeno: true, ai: ["Claude", "Gemini"] });
  assert.match(ad.claude.volani[0].system, /Pravidla pravdivosti/);
  assert.match(ad.claude.volani[0].system, /ZNALOSTI/);
  assert.equal(ad.claude.volani[0].rychle, true);
  assert.match(ad.gemini.volani[0].zpravy[0].text, /NÁVRH ODPOVĚDI:\nStřecha od 99 Kč\/m²\./);
});

test("kontrolor opraví nepodložené tvrzení → vrací opravu", async () => {
  const { h } = sestav({ adaptery: { gemini: falesnyAdapter({ text: 'Výsledek: ```json\n{"ok": false, "odpoved": "Opraveno."}\n```' }) } });
  const j = await (await h(post())).json();
  assert.equal(j.odpoved, "Opraveno.");
  assert.equal(j.overeno, true);
});

test("kontrolor: znalosti neodpovídají → predat (prohlížeč nabídne zavolání)", async () => {
  const { h } = sestav({ adaptery: { gemini: falesnyAdapter({ text: '{"ok": false, "odpoved": ""}' }) } });
  assert.equal((await (await h(post())).json()).rezim, "predat");
});

test("selže-li autor, napíše návrh další AI a ověří ji jiná", async () => {
  const { h } = sestav({ adaptery: { claude: falesnyAdapter({ chyba: "529 overloaded" }), gemini: falesnyAdapter({ text: "Návrh od Gemini." }) } });
  const j = await (await h(post())).json();
  assert.equal(j.odpoved, "Návrh od Gemini.");
  assert.deepEqual(j.ai, ["Gemini", "ChatGPT"]);
  assert.equal(j.overeno, true);
});

test("všechny AI selžou → 502 chyba (prohlížeč odpoví z FAQ)", async () => {
  const chyba = falesnyAdapter({ chyba: "down" });
  const { h } = sestav({ adaptery: { claude: chyba, gemini: chyba, gpt: chyba } });
  const r = await h(post());
  assert.equal(r.status, 502);
  assert.equal((await r.json()).rezim, "chyba");
});

test("pomalý kontrolor nezdrží odpověď: návrh se vrátí neověřený v časovém limitu", async () => {
  const { h } = sestav({
    adaptery: { gemini: falesnyAdapter({ text: '{"ok":true}', zpozdeni: 5000 }) },
    casy: { celkem: 900, maxNavrh: 500, minNavrh: 300, minKontrola: 200 },
  });
  const t0 = Date.now();
  const j = await (await h(post())).json();
  assert.ok(Date.now() - t0 < 1500, "odpověď musí přijít do limitu");
  assert.equal(j.rezim, "ai");
  assert.equal(j.overeno, false);
});

test("jen jedna AI: odpověď bez kontroly, overeno=false", async () => {
  const { h } = sestav({ e: { HSPG_PANEL_HESLO: "x".repeat(16), ANTHROPIC_API_KEY: "k" } });
  const j = await (await h(post())).json();
  assert.equal(j.overeno, false);
  assert.deepEqual(j.ai, ["Claude"]);
});

test("limit na návštěvníka: 13. dotaz za 10 minut → 429", async () => {
  const { h } = sestav();
  for (let i = 0; i < 12; i++) assert.equal((await h(post(), { ip: "1.2.3.4" })).status, 200);
  const r = await h(post(), { ip: "1.2.3.4" });
  assert.equal(r.status, 429);
  assert.equal((await h(post(), { ip: "5.6.7.8" })).status, 200, "jiný návštěvník limit nemá");
});

test("vyčerpaný měsíční rozpočet → 503 bez-ai, GET ai=false", async () => {
  const ul = pametoveUloziste();
  const mesic = new Date().toISOString().slice(0, 7);
  await ul.setJSON(`utrata/${mesic}`, { celkemKc: 600, ai: {} });
  const { h } = sestav({ ul });
  assert.equal((await h(post())).status, 503);
  assert.equal((await (await h(pozadavek("/api/asistent"))).json()).ai, false);
});

test("útrata se zapisuje za oba kroky", async () => {
  const { h, ul } = sestav();
  await h(post());
  const mesic = new Date().toISOString().slice(0, 7);
  const u = await ul.get(`utrata/${mesic}`);
  assert.equal(u.ai.claude.dotazu, 1);
  assert.equal(u.ai.gemini.dotazu, 1);
  assert.ok(u.celkemKc > 0);
});

test("výpadek úložiště: AI se nevolá (ochrana kreditů), GET ai=false, odpoví FAQ", async () => {
  const rozbite = { get: async () => { throw new Error("blobs down"); }, setJSON: async () => { throw new Error("blobs down"); } };
  const { h, ad } = sestav({ ul: rozbite });
  const r = await h(post());
  assert.equal(r.status, 503);
  assert.equal((await r.json()).rezim, "bez-ai");
  assert.equal(ad.claude.volani.length, 0);
  assert.equal((await (await h(pozadavek("/api/asistent"))).json()).ai, false);
});

test("honeypot vyplněný robotem → predat bez volání AI", async () => {
  const { h, ad } = sestav();
  const j = await (await h(post({ ...OTAZKA, _honey: "spam" }))).json();
  assert.equal(j.rezim, "predat");
  assert.equal(ad.claude.volani.length, 0);
});

test("neplatné vstupy → 400", async () => {
  const { h } = sestav();
  assert.equal((await h(pozadavek("/api/asistent", { method: "POST", body: "{" }))).status, 400);
  assert.equal((await h(post({ zpravy: [] }))).status, 400);
  assert.equal((await h(post({ zpravy: [{ role: "assistant", text: "x" }] }))).status, 400);
  assert.equal((await h(post({ zpravy: Array(9).fill({ role: "user", text: "x" }) }))).status, 400);
  assert.equal((await h(post({ zpravy: [{ role: "system", text: "x" }] }))).status, 400);
});

test("dlouhá zpráva se ořízne na 600 znaků", async () => {
  const { h, ad } = sestav();
  await h(post({ zpravy: [{ role: "user", text: "a".repeat(5000) }] }));
  assert.equal(ad.claude.volani[0].zpravy[0].text.length, 600);
});

test("prectiVerdikt zvládne obalený i rozbitý JSON", () => {
  assert.deepEqual(prectiVerdikt('```json\n{"ok":true,"odpoved":""}\n```'), { ok: true, odpoved: "" });
  assert.equal(prectiVerdikt("bez json"), null);
  assert.equal(prectiVerdikt('{"ok":"ano"}'), null);
  assert.equal(prectiVerdikt("{rozbité"), null);
});

test("pořadí AI jde nastavit a vynechá AI bez klíče", () => {
  assert.deepEqual(poradi(env({ ASISTENT_PORADI: "gpt, grok, claude" })), ["gpt", "claude"]);
});

test("živý průběh (NDJSON): kdo píše, kdo ověřuje, pak výsledek", async () => {
  const { h } = sestav();
  const r = await h(pozadavek("/api/asistent", { method: "POST", body: OTAZKA, headers: { accept: "application/x-ndjson" } }));
  assert.match(r.headers.get("content-type"), /ndjson/);
  const radky = (await r.text()).trim().split("\n").map((x) => JSON.parse(x));
  assert.deepEqual(radky.slice(0, 2), [{ krok: "navrh", ai: "Claude" }, { krok: "kontrola", ai: "Gemini" }]);
  assert.equal(radky.at(-1).rezim, "ai");
  assert.equal(radky.at(-1).overeno, true);
});

test("živý průběh: při pádu autora ukáže i náhradní AI", async () => {
  const { h } = sestav({ adaptery: { claude: falesnyAdapter({ chyba: "down" }), gemini: falesnyAdapter({ text: "Návrh." }) } });
  const r = await h(pozadavek("/api/asistent", { method: "POST", body: OTAZKA, headers: { accept: "application/x-ndjson" } }));
  const radky = (await r.text()).trim().split("\n").map((x) => JSON.parse(x));
  assert.deepEqual(radky.filter((x) => x.krok).map((x) => `${x.krok}:${x.ai}`), ["navrh:Claude", "navrh:Gemini", "kontrola:ChatGPT"]);
});

test("telefon a e-mail návštěvníka do AI neodchází", async () => {
  assert.equal(maskujKontakty("volejte 777 123 456 nebo +420777123456, mail jan.novak@seznam.cz"), "volejte [telefon] nebo [telefon], mail [e-mail]");
  assert.equal(maskujKontakty("plocha 120 m2, rok 2019"), "plocha 120 m2, rok 2019");
  const { h, ad } = sestav();
  await h(post({ zpravy: [{ role: "user", text: "Zavolejte mi na 603 111 222" }] }));
  assert.equal(ad.claude.volani[0].zpravy[0].text, "Zavolejte mi na [telefon]");
});

test("rozpočet: rezervace před voláním – při malém limitu AI vůbec nezavolá", async () => {
  const { h, ad } = sestav({ e: env({ AI_MESICNI_LIMIT_KC: "0.01" }) });
  const r = await h(post());
  assert.equal(r.status, 503);
  assert.equal((await r.json()).duvod, "rozpocet");
  assert.equal(ad.claude.volani.length, 0);
});

test("souběžné dotazy nepřetečou limit na návštěvníka (podmíněné zápisy)", async () => {
  const { h } = sestav();
  const vysledky = await Promise.all(Array.from({ length: 20 }, () => h(post(), { ip: "7.7.7.7" })));
  assert.equal(vysledky.filter((r) => r.status === 200).length, 12);
  assert.equal(vysledky.filter((r) => r.status === 429).length, 8);
});

test("cizí web nesmí asistenta volat (Origin), web a náhledy ano", async () => {
  const { h } = sestav();
  const s = (origin) => h(pozadavek("/api/asistent", { method: "POST", body: OTAZKA, headers: { origin } })).then((r) => r.status);
  assert.equal(await s("https://zly-web.example"), 403);
  assert.equal(await s("https://hspg.cz"), 200);
  assert.equal(await s("https://deploy-preview-3--tourmaline-dasik-9de005.netlify.app"), 200);
});

test("pravidlo Netlify rateLimit je v konfiguraci funkce", async () => {
  const { config } = await import("../../web/netlify/functions/asistent.mjs");
  assert.equal(config.path, "/api/asistent");
  assert.deepEqual(config.rateLimit.aggregateBy, ["ip", "domain"]);
});

test("prectiVerdikt: první úplný objekt, ne hladové spojení dvou", () => {
  assert.deepEqual(prectiVerdikt('{"ok": false, "odpoved": "A {x}"} a ještě {"ok": true}'), { ok: false, odpoved: "A {x}" });
  assert.deepEqual(prectiVerdikt('{"pozn": 1} {"ok": true, "odpoved": ""}'), { ok: true, odpoved: "" });
});

test("kontrolor odpoví nečitelně → predat (nic neověřeného ven)", async () => {
  const { h } = sestav({ adaptery: { gemini: falesnyAdapter({ text: "Návrh obsahuje chybu v ceně." }) } });
  assert.equal((await (await h(post())).json()).rezim, "predat");
});

test("veřejný asistent smí jen svůj podíl rozpočtu (AI_VEREJNY_LIMIT_KC)", async () => {
  const ul = pametoveUloziste();
  const mesic = new Date().toISOString().slice(0, 7);
  await ul.setJSON(`utrata/${mesic}`, { celkemKc: 13, verejneKc: 13, ai: {} });
  const { h } = sestav({ ul, e: { ...env(), AI_MESICNI_LIMIT_KC: "100", AI_VEREJNY_LIMIT_KC: "13" } });
  const r = await h(post());
  assert.equal(r.status, 503);
  assert.equal((await r.json()).duvod, "rozpocet");
});
