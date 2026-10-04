import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { znalostiProProhlizec, znalostiProAI, doplnFirmu } from "../../web/netlify/lib/ai/znalosti.mjs";
import { vytvorOznameni, shrnuti, adresat } from "../../web/netlify/functions/submission-created.mjs";
import { pozadavek } from "../pomocne.mjs";

const firma = JSON.parse(await readFile(new URL("../../web/content/firma.json", import.meta.url)));
const ceny = JSON.parse(await readFile(new URL("../../web/content/ceny.json", import.meta.url)));

test("záruka: potvrzená se doplní z firma.json, nepotvrzená se nahradí neutrální větou", () => {
  assert.equal(doplnFirmu("{{zaruka}} Text. {{zaruka_podminka}}", firma), `${firma.zaruka.veta} Text. ${firma.zaruka.podminka}`);
  const nepotvrzena = { zaruka: { ...firma.zaruka, potvrzeno: false } };
  const t = doplnFirmu("{{zaruka}} Text. {{zaruka_podminka}}", nepotvrzena);
  assert.equal(t, `${firma.zaruka.nahradni_veta} Text.`);
  assert.doesNotMatch(t, /10 let/);
});

test("znalosti pro prohlížeč: cena z ceníku, žádné nevyplněné šablony", () => {
  const z = znalostiProProhlizec();
  const cena = z.otazky.find((e) => e.q === "Kolik to stojí?");
  assert.match(cena.a, new RegExp(`střecha od ${ceny.ochrana_hstone.roof} Kč/m²`));
  assert.ok(z.otazky.every((e) => !/\{\{/.test(e.a)));
  assert.equal(z.rychle_otazky.length, 6);
});

test("vygenerovaný assets/hbot-znalosti.json odpovídá zdrojům", async () => {
  const soubor = JSON.parse(await readFile(new URL("../../web/assets/hbot-znalosti.json", import.meta.url)));
  assert.deepEqual(soubor, znalostiProProhlizec());
});

test("znalosti pro AI obsahují IČO, OSVČ, ceník, minimum a SENTINEL", () => {
  const t = znalostiProAI();
  for (const s of ["IČO 09291881", "OSVČ", "neplátce DPH", "Minimální zakázka 4", "SENTINEL PLUS", "+420 736 618 486"]) assert.ok(t.includes(s), s);
});

test("oznámení: shrnutí bez interních polí, číslo poptávky, e-mail pro Reply-To", () => {
  const s = shrnuti({ form_name: "hspg-akce", id: "abc123def456", data: { "form-name": "hspg-akce", _honey: "", Jméno: "Jan", "E-mail": "jan@example.cz", Telefon: "777" } });
  assert.equal(s.cislo, "DEF456");
  assert.equal(s.email, "jan@example.cz");
  assert.doesNotMatch(s.text, /form-name|_honey/);
  assert.match(s.text, /Jméno: Jan/);
});

test("oznámení: ntfy + Telegram + e-mail + potvrzení; chyba jednoho kanálu neblokuje ostatní", async () => {
  const volani = [];
  const f = async (url, opt) => { volani.push([url, JSON.parse(opt.body)]); return { ok: !url.includes("telegram") }; };
  const maily = [];
  const transport = { sendMail: async (m) => { maily.push(m); } };
  const h = vytvorOznameni({
    env: { NTFY_TEMA: "tajne-tema", TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "1", SMTP_UZIVATEL: "info@hspg.cz", SMTP_HESLO: "x", NOTIFIKACE_EMAIL: "majitel@hspg.cz", POTVRZENI_ZAKAZNIKOVI: "1" },
    f, transport,
  });
  const r = await h(pozadavek("/", { method: "POST", body: { payload: { form_name: "hspg-poptavka", id: "x1", data: { Email: "zakaznik@example.cz", Zpráva: "Střecha" } } } }));
  assert.equal(r.status, 200);
  assert.equal(volani[0][0], "https://ntfy.sh");
  assert.equal(volani[0][1].topic, "tajne-tema");
  assert.equal(volani[0][1].title, "🕊 Nová poptávka (hspg-poptavka) #X1", "push bez osobních údajů");
  assert.doesNotMatch(volani[0][1].message, /zakaznik@example\.cz|Střecha/);
  assert.equal(maily.length, 2);
  assert.equal(maily[0].to, "majitel@hspg.cz");
  assert.equal(maily[0].cc, "profiserv@seznam.cz", "záložní kopie na Seznam vždy");
  assert.equal(maily[0].replyTo, "zakaznik@example.cz");
  assert.equal(maily[1].to, "zakaznik@example.cz");
});

test("oznámení bez nastaveného kanálu nespadne", async () => {
  const r = await vytvorOznameni({ env: {} })(pozadavek("/", { method: "POST", body: { payload: { data: {} } } }));
  assert.equal(r.status, 200);
});

test("směrování formulářů na 5 firemních schránek + záloha", () => {
  assert.deepEqual(adresat("hspg-akce", {}), { to: "poptavky@hspg.cz", cc: "profiserv@seznam.cz" });
  assert.deepEqual(adresat("hspg-reklamace", {}), { to: "reklamace@hspg.cz", cc: "profiserv@seznam.cz" });
  assert.deepEqual(adresat("hspg-spoluprace", {}), { to: "spoluprace@hspg.cz", cc: "profiserv@seznam.cz" });
  assert.deepEqual(adresat("neznamy-formular", {}), { to: "info@hspg.cz", cc: "profiserv@seznam.cz" });
  assert.deepEqual(adresat("hspg-akce", { NOTIFIKACE_EMAIL: "profiserv@seznam.cz" }), { to: "profiserv@seznam.cz", cc: undefined });
});

test("push s osobními údaji jen po výslovném povolení (OZNAMENI_S_UDAJI=1)", async () => {
  const volani = [];
  const f = async (url, opt) => { volani.push(JSON.parse(opt.body)); return { ok: true }; };
  await vytvorOznameni({ env: { NTFY_TEMA: "t", OZNAMENI_S_UDAJI: "1" }, f })(pozadavek("/", { method: "POST", body: { payload: { form_name: "hspg-zavolejte", id: "q9", data: { Jméno: "Eva", Telefon: "777111222" } } } }));
  assert.match(volani[0].title, /Poptávka – Eva, 777111222 \(hspg-zavolejte\)/);
});

test("shrnutí: předmět nebere interní pole (form-name ani ip)", () => {
  const s = shrnuti({ form_name: "hspg-akce", id: "x1", data: { "form-name": "hspg-akce", ip: "1.2.3.4", Telefon: "777123456" } });
  assert.ok(!JSON.stringify(s).includes("1.2.3.4"));
  assert.ok(!/hspg-akce,/.test(JSON.stringify(s)));
});
