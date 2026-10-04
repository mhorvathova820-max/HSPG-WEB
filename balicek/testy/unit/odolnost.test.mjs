// Odolnost a rozpočet: výpadky úložiště, souběh, vracení rezervací, období kreditů, zámek přihlášení.
import { test } from "node:test";
import assert from "node:assert/strict";
import { vytvorAsistenta } from "../../web/netlify/functions/asistent.mjs";
import { vytvorPrihlaseni } from "../../web/netlify/functions/majitel.mjs";
import { vytvorAI } from "../../web/netlify/functions/ai.mjs";
import { vytvorStav } from "../../web/netlify/functions/ai-stav.mjs";
import { vydejToken, tajemstviServeru } from "../../web/netlify/lib/ai/autorizace.mjs";
import { mesic, sitKlienta, odhadKc, rezervuj, povolPokusOPrihlaseni, otiskKlienta } from "../../web/netlify/lib/ai/limity.mjs";
import { HESLO, env, falesnyAdapter, pametoveUloziste, pozadavek, obdobi } from "../pomocne.mjs";

const OTAZKA = { zpravy: [{ role: "user", text: "Kolik stojí čištění střechy?" }] };
const post = (body = OTAZKA, headers = {}) => pozadavek("/api/asistent", { method: "POST", body, headers });
const ZNALOSTI = "ZNALOSTI: střecha od 99 Kč/m², záruka 10 let.";
function sestav({ e = env(), adaptery = {}, ul = pametoveUloziste(), casy } = {}) {
  const ad = {
    claude: falesnyAdapter({ text: "Střecha od 99 Kč/m²." }),
    gemini: falesnyAdapter({ text: '{"ok": true, "odpoved": ""}' }),
    gpt: falesnyAdapter({ text: '{"ok": true, "odpoved": ""}' }),
    grok: falesnyAdapter(),
    ...adaptery,
  };
  return { h: vytvorAsistenta({ env: e, adaptery: ad, uloziste: ul, znalosti: ZNALOSTI, ...(casy ? { casy } : {}) }), ad, ul };
}
// Úložiště, které zápis „potvrdí“ bez etagu – tak @netlify/blobs hlásí chybu zápisu jinou než 412.
function nepotvrzujiciZapis() {
  const ul = pametoveUloziste();
  ul.setJSON = async () => ({ modified: true, etag: "" });
  return ul;
}

test("zápis bez etagu (chyba Blobs jiná než 412) = výjimka: rozpočet, zámek ani tajemství se neotevřou", async () => {
  const ul = nepotvrzujiciZapis();
  await assert.rejects(rezervuj(ul, "claude", 100, 100, env(), Date.now(), "claude-sonnet-5-5", true));
  await assert.rejects(povolPokusOPrihlaseni(ul, "x", Date.now()));
  await assert.rejects(tajemstviServeru(env({ HSPG_TOKEN_TAJEMSTVI: "" }), ul));
  const { h, ad } = sestav({ ul });
  const r = await h(post());
  assert.equal(r.status, 503);
  assert.equal((await r.json()).duvod, "uloziste");
  assert.equal(ad.claude.volani.length, 0, "AI se nevolá");
  const prihlas = vytvorPrihlaseni({ env: env(), uloziste: nepotvrzujiciZapis() });
  assert.equal((await prihlas(pozadavek("/api/majitel", { method: "POST", body: { heslo: HESLO } }), { ip: "1.2.3.4" })).status, 503);
});

test("veřejný podíl: atomicky při souběhu, vyrovnání verejneKc, GET ai=false, majitel pokračuje", async () => {
  const ul = pametoveUloziste();
  let max = 0;
  const setJSON = ul.setJSON.bind(ul);
  ul.setJSON = async (k, v, o) => { const z = await setJSON(k, v, o); if (z.modified && k.startsWith("utrata/")) max = Math.max(max, v.verejneKc || 0); return z; };
  const e = env({ AI_MESICNI_LIMIT_KC: "100", AI_VEREJNY_LIMIT_KC: "1", ASISTENT_DENNI_LIMIT: "1000" });
  const { h } = sestav({ e, ul, adaptery: { claude: falesnyAdapter({ text: "Střecha od 99 Kč/m².", zpozdeni: 50 }) } });
  await Promise.all(Array.from({ length: 15 }, (_, i) => h(post(), { ip: `10.0.0.${i}` })));
  assert.ok(max <= 1 + 1e-9, `verejneKc ${max}`);
  const klic = `utrata/${obdobi(e)}`;
  const u = await ul.get(klic);
  assert.ok(Math.abs(u.verejneKc - u.celkemKc) < 1e-9, "verejneKc se vyrovná na skutečnou útratu");
  await ul.setJSON(klic, { ...u, verejneKc: 1 });
  assert.equal((await (await h(pozadavek("/api/asistent"))).json()).ai, false);
  const r = await vytvorAI({ env: e, adaptery: { claude: falesnyAdapter() }, uloziste: ul })(pozadavek("/api/ai", { method: "POST", headers: { authorization: `Bearer ${vydejToken(e).token}` }, body: { ai: "claude", zpravy: [{ role: "user", text: "x" }] } }));
  assert.equal(r.status, 200, "vyčerpaný veřejný podíl nesmí zamknout majitele");
});

test("NDJSON: odpověď nečeká na zápis útraty, útrata doběhne přes waitUntil", async () => {
  const ul = pametoveUloziste();
  let pomalu = false;
  const setJSON = ul.setJSON.bind(ul);
  ul.setJSON = async (k, v, o) => { if (pomalu && k.startsWith("utrata/")) await new Promise((r) => setTimeout(r, 300)); return setJSON(k, v, o); };
  const gemini = falesnyAdapter({ text: '{"ok": true, "odpoved": ""}' });
  const dotaz = gemini.dotaz;
  gemini.dotaz = (p) => { pomalu = true; return dotaz(p); };
  const { h } = sestav({ ul, adaptery: { gemini } });
  const cekani = [];
  const r = await h(post(OTAZKA, { accept: "application/x-ndjson" }), { waitUntil: (p) => cekani.push(p) });
  assert.equal(JSON.parse((await r.text()).trim().split("\n").at(-1)).rezim, "ai");
  const klic = `utrata/${obdobi()}`;
  assert.equal((await ul.get(klic))?.ai?.gemini, undefined, "stream skončil dřív než zápis");
  assert.equal(cekani.length, 1, "zápis útraty musí jít do waitUntil");
  await cekani[0];
  assert.equal((await ul.get(klic)).ai.gemini.dotazu, 1);
});

test("NDJSON: klient odejde po prvním řádku → žádná výjimka, kontrola se už nevolá, útrata přes waitUntil", async () => {
  const { h, ad } = sestav({ adaptery: { claude: falesnyAdapter({ text: "Střecha od 99 Kč/m².", zpozdeni: 30 }) } });
  const cekani = [];
  const r = await h(post(OTAZKA, { accept: "application/x-ndjson" }), { waitUntil: (p) => cekani.push(p) });
  const ctecka = r.body.getReader();
  const prvni = new TextDecoder().decode((await ctecka.read()).value);
  assert.match(prvni, /"krok":"navrh"/);
  await ctecka.cancel();
  await new Promise((ok) => setTimeout(ok, 120));
  assert.equal(ad.gemini.volani.length, 0, "po odchodu klienta se kontrola nevolá");
  assert.equal(cekani.length, 1);
  await cekani[0];
});

test("kontrola bez rezervy (výpadek úložiště / rozpočet) → návrh neověřený, kontrolor se nevolá", async () => {
  const ul = pametoveUloziste();
  let rozbito = false;
  const gwm = ul.getWithMetadata.bind(ul);
  ul.getWithMetadata = async (k, o) => { if (rozbito && k.startsWith("utrata/")) throw new Error("blobs down"); return gwm(k, o); };
  const claude = falesnyAdapter({ text: "Střecha od 99 Kč/m²." });
  const dotaz = claude.dotaz;
  claude.dotaz = async (p) => { const x = await dotaz(p); rozbito = true; return x; };
  const a = sestav({ ul, adaptery: { claude } });
  assert.deepEqual(await (await a.h(post())).json(), { rezim: "ai", odpoved: "Střecha od 99 Kč/m².", overeno: false, ai: ["Claude"] });
  assert.equal(a.ad.gemini.volani.length, 0);
  const b = sestav({ e: env({ CENA_GEMINI_VYSTUP: "1000" }) });
  assert.equal((await (await b.h(post())).json()).overeno, false);
  assert.equal(b.ad.gemini.volani.length, 0);
});

test("poskytovatel návrh odmítne (HTTP chyba) → rezervace se vrátí, rozpočet = jen skutečná útrata", async () => {
  const ul = pametoveUloziste();
  const { h } = sestav({ ul, adaptery: { claude: falesnyAdapter({ chyba: "404 model" }), gemini: falesnyAdapter({ text: "Střecha od 99 Kč/m²." }) } });
  const j = await (await h(post())).json();
  assert.equal(j.rezim, "ai");
  const u = await ul.get(`utrata/${obdobi()}`);
  const skutecne = Object.values(u.ai).reduce((s, a) => s + a.kc, 0);
  assert.ok(Math.abs(u.celkemKc - skutecne) < 1e-9, `celkem ${u.celkemKc} ≠ skutečně ${skutecne}`);
  assert.equal(u.ai.claude, undefined, "odmítnuté volání se do statistiky dotazů nepočítá");
});

test("ai (majitel): usage ve více kusech se vyrovná jednou; chyba před textem rezervaci vrátí", async () => {
  const ul = pametoveUloziste();
  const e = env();
  const auth = { authorization: `Bearer ${vydejToken(e).token}` };
  const dvaStaty = { async *stream() { yield { text: "Ahoj" }; yield { stat: { vstup: 10, vystup: 5 } }; yield { stat: { vstup: 100, vystup: 50 } }; } };
  const r = await vytvorAI({ env: e, adaptery: { gpt: dvaStaty }, uloziste: ul })(pozadavek("/api/ai", { method: "POST", headers: auth, body: { ai: "gpt", zpravy: [{ role: "user", text: "x" }] } }));
  assert.match(await r.text(), /\u0000STAT\{"vstup":100,"vystup":50/);
  let u = await ul.get(`utrata/${obdobi()}`);
  assert.equal(u.ai.gpt.dotazu, 1);
  assert.ok(Math.abs(u.celkemKc - odhadKc("gpt", 100, 50, e, "gpt-5")) < 1e-9);
  const odmitnuti = { async *stream() { throw Object.assign(new Error("model nenalezen"), { status: 404 }); } };
  const ul2 = pametoveUloziste();
  const r2 = await vytvorAI({ env: e, adaptery: { claude: odmitnuti }, uloziste: ul2 })(pozadavek("/api/ai", { method: "POST", headers: auth, body: { ai: "claude", zpravy: [{ role: "user", text: "x" }] } }));
  assert.match(await r2.text(), /\u0000CHYBA/);
  u = await ul2.get(`utrata/${obdobi()}`);
  assert.equal(u.celkemKc, 0, "rezervace odmítnutého volání se vrátila");
});

test("období rozpočtu = období kreditů Netlify (výchozí 11.–10.), AI_OBDOBI_DEN=1 = kalendářní měsíc", () => {
  const t = (d, e) => mesic(Date.parse(d), e);
  assert.equal(t("2026-09-10T23:59:00Z"), "2026-08");
  assert.equal(t("2026-09-11T00:00:00Z"), "2026-09");
  assert.equal(t("2026-10-01T00:00:00Z"), "2026-09", "1.–10. patří k období od 11. minulého měsíce");
  assert.equal(t("2026-01-05T00:00:00Z"), "2025-12");
  assert.equal(t("2026-10-01T00:00:00Z", { AI_OBDOBI_DEN: "1" }), "2026-10");
});

test("ceny: Grok a alias Haiku známé, CENA_* u známého modelu cenu jen zvýší, neznámý model draze", () => {
  assert.ok(odhadKc("grok", 1e6, 0, {}, "x-ai/grok-4") < odhadKc("grok", 1e6, 0, {}, "neznamy-model"));
  assert.equal(odhadKc("claude", 1e6, 0, {}, "claude-haiku-4-5-20251001"), odhadKc("claude", 1e6, 0, {}, "claude-haiku-4-5"));
  assert.equal(odhadKc("claude", 1e6, 0, { CENA_CLAUDE_VSTUP: "1" }, "claude-opus-5-5"), odhadKc("claude", 1e6, 0, {}, "claude-opus-5-5"), "levnější proměnná Opus nepodhodnotí");
  assert.ok(odhadKc("claude", 1e6, 0, { CENA_CLAUDE_VSTUP: "100" }, "claude-opus-5-5") > odhadKc("claude", 1e6, 0, {}, "claude-opus-5-5"));
  assert.equal(odhadKc("x", 1e6, 0, { KURZ_USD_CZK: "1" }, "neznamy"), 15);
});

test("zámek přihlášení: úspěch se nepočítá, IPv6 po sítích /64, globální strop 100 neúspěchů za hodinu", async () => {
  const ul = pametoveUloziste();
  const h = vytvorPrihlaseni({ env: env(), uloziste: ul });
  const zkus = (heslo, ip) => h(pozadavek("/api/majitel", { method: "POST", body: { heslo } }), { ip }).then((r) => r.status);
  const spatne = "spatne-heslo-123456789";
  const poradi = [];
  for (const heslo of [HESLO, HESLO, HESLO, spatne, spatne, HESLO, HESLO]) poradi.push(await zkus(heslo, "9.9.9.9"));
  assert.deepEqual(poradi, [200, 200, 200, 401, 401, 200, 200], "majitel se úspěšnými přihlášeními nezamkne");
  const sit = [];
  for (let i = 1; i <= 6; i++) sit.push(await zkus(spatne, `2001:db8:1:2::${i.toString(16)}`));
  assert.deepEqual(sit, [401, 401, 401, 401, 401, 429], "adresy jedné sítě /64 sdílí zámek");
  assert.equal(sitKlienta("::ffff:1.2.3.4"), "1.2.3.4");
  const ul2 = pametoveUloziste();
  const h2 = vytvorPrihlaseni({ env: env(), uloziste: ul2 });
  let posledni;
  for (let i = 0; i < 101; i++) posledni = await h2(pozadavek("/api/majitel", { method: "POST", body: { heslo: spatne } }), { ip: `10.1.${i >> 8}.${i & 255}` }).then((r) => r.status);
  assert.equal(posledni, 429, "101. neúspěch během hodiny z jakékoli adresy");
  assert.equal(typeof otiskKlienta("1.2.3.4", Date.now()), "string");
});

test("tajemství tokenu: dvě instance při souběžném prvním přihlášení sdílí jedno tajemství", async () => {
  const e = env({ HSPG_TOKEN_TAJEMSTVI: "" });
  const sdilene = pametoveUloziste();
  const instance = () => ({
    get: async (k, o) => { const v = await sdilene.get(k, o); await new Promise((r) => setTimeout(r, 10)); return v; },
    getWithMetadata: (k, o) => sdilene.getWithMetadata(k, o),
    setJSON: (k, v, o) => sdilene.setJSON(k, v, o),
  });
  const A = instance(), B = instance();
  const prihlas = (u, ip) => vytvorPrihlaseni({ env: e, uloziste: u })(pozadavek("/api/majitel", { method: "POST", body: { heslo: HESLO } }), { ip }).then((r) => r.json());
  const [ta, tb] = await Promise.all([prihlas(A, "1.1.1.1"), prihlas(B, "2.2.2.2")]);
  const stav = (u, t) => vytvorStav({ env: e, uloziste: u })(pozadavek("/api/ai-stav", { headers: { authorization: `Bearer ${t}` } })).then((r) => r.status);
  assert.equal(await stav(B, ta.token), 200);
  assert.equal(await stav(A, tb.token), 200);
});
