// Rozcestník „Celý web na jednom místě“ (úkol 56): kontrola cílů z content/hbot-rozcestnik.json při buildu
// (netlify/lib/ai/rozcestnik.mjs → klíč „rozcestnik“ v assets/hbot-znalosti.json). Odkazy jen na stránky webu.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { bezpecnaCesta, rozcestnikProProhlizec, typografie, AKCE } from "../../web/netlify/lib/ai/rozcestnik.mjs";
import { znalostiProProhlizec } from "../../web/netlify/lib/ai/znalosti.mjs";

const json = async (p) => JSON.parse(await readFile(new URL(`../../web/${p}`, import.meta.url), "utf8"));
const obsah = await json("content/hbot-rozcestnik.json");
const firma = await json("content/firma.json");
const s = (cile) => ({ cile });

test("bezpečná cesta: jen stránky tohoto webu", () => {
  for (const h of ["/", "/holub-360/", "/cenik.html#sentinel", "/pas-domu/trezor.html", "/planovac/?obec=Kol%C3%ADn"]) assert.equal(bezpecnaCesta(h), true, h);
  for (const h of ["//evil.example", "//evil.example/akce/", "javascript:alert(1)", "JaVaScRiPt:alert(1)", "https://evil.example/", "http://hspg.cz/",
    "/\\evil.example", "\\\\evil.example", "/\t/evil.example", "/\n/evil.example", " /akce/", "/akce/ ", "/a b", "/x\u0000", "", "akce/", "data:text/html,x",
    "/" + "a".repeat(200), null, undefined, 42, { toString: () => "/akce/" }]) {
    assert.equal(bezpecnaCesta(h), false, JSON.stringify(String(h)));
  }
});

test("obsah z content/hbot-rozcestnik.json: 8 cílů, zlatá „Cena hned“ první, pracovní doba z firma.json, česká typografie", () => {
  const cile = rozcestnikProProhlizec(obsah, { firma });
  assert.equal(cile.length, 8);
  assert.deepEqual(cile[0], { id: "cena", titul: "Cena hned", popis: "Orientační cena z\u00a0ceníku HSPG", akce: "kalkulace", ikona: "cena", hlavni: true });
  assert.deepEqual(cile.map((c) => c.href || c.akce), ["kalkulace", "/holub-360/", "/standard-holub/", "/cenik.html#sentinel", "/pas-domu/trezor.html", "/planovac/", "/akce/", "zavolat"]);
  assert.equal(cile.at(-1).popis, firma.pracovni_doba);
  assert.ok(cile.every((c) => (c.href ? bezpecnaCesta(c.href) : AKCE.includes(c.akce))));
  assert.equal(typografie("péče o dům a zahradu"), "péče o\u00a0dům a\u00a0zahradu");
});

test("vygenerované assets/hbot-znalosti.json nese zkontrolovaný rozcestník", async () => {
  const soubor = await json("assets/hbot-znalosti.json");
  assert.deepEqual(soubor.rozcestnik, rozcestnikProProhlizec(obsah, { firma }));
  assert.deepEqual(soubor.rozcestnik, znalostiProProhlizec().rozcestnik);
  assert.match(soubor.vygenerovano_z, /content\/hbot-rozcestnik\.json/);
  const text = JSON.stringify(soubor.rozcestnik);
  for (const re of [/letecké map/i, /satelit/i, /Google Maps/i, /katastr/i, /RÚIAN|RUIAN/i, /\bz map/i, /nabídk/i]) assert.doesNotMatch(text, re, String(re));
});

test("build odmítne cizí a nebezpečné odkazy („//evil“, „javascript:“) i neplatné akce", () => {
  const zkus = (c, re) => assert.throws(() => rozcestnikProProhlizec(s([c]), { firma }), re);
  zkus({ id: "zly", titul: "Zlý", href: "//evil.example" }, /cíl 1 „zly“: href „\/\/evil\.example“ musí být cesta na tomto webu/);
  zkus({ id: "js", titul: "JS", href: "javascript:alert(1)" }, /musí být cesta na tomto webu/);
  zkus({ id: "cizi", titul: "Cizí", href: "https://evil.example/" }, /musí být cesta na tomto webu/);
  zkus({ id: "lomitko", titul: "Lomítko", href: "/\\evil.example" }, /musí být cesta na tomto webu/);
  zkus({ id: "akce", titul: "Akce", akce: "smazat" }, /akce musí být kalkulace \| zavolat \| otazka/);
  zkus({ id: "oba", titul: "Oba", href: "/akce/", akce: "zavolat" }, /buď href/);
  zkus({ id: "nic", titul: "Nic" }, /buď href/);
  zkus({ id: "otazka", titul: "Otázka", akce: "otazka" }, /potřebuje text otázky/);
  zkus({ id: "Velka", titul: "ID", href: "/" }, /id jen malá písmena/);
  zkus({ id: "ikona", titul: "Ikona", href: "/", ikona: "<svg onload=x>" }, /ikona musí být/);
  zkus({ id: "pole", titul: "Pole", href: "/", onclick: "x" }, /neznámé pole onclick/);
  zkus({ id: "dlouhy", titul: "x".repeat(49), href: "/" }, /titul musí mít 1–48 znaků/);
  zkus({ id: "sablona", titul: "{{neco}}", href: "/" }, /neznámá šablona/);
  assert.throws(() => rozcestnikProProhlizec(s([{ id: "a", titul: "A", href: "/" }, { id: "a", titul: "B", href: "/akce/" }]), { firma }), /id se opakuje/);
  assert.throws(() => rozcestnikProProhlizec(s(Array.from({ length: 13 }, (_, i) => ({ id: `c${i}`, titul: "C", href: "/" }))), { firma }), /nejvýš 12 cílů/);
  assert.throws(() => rozcestnikProProhlizec({}, { firma }), /chybí seznam/);
  // Platná akce „otazka“ i prázdný seznam (rozcestník vypnutý) projdou.
  assert.deepEqual(rozcestnikProProhlizec(s([{ id: "postup", titul: "Postup", akce: "otazka", otazka: "Jaký je postup?" }]), { firma }), [{ id: "postup", titul: "Postup", akce: "otazka", otazka: "Jaký je postup?" }]);
  assert.deepEqual(rozcestnikProProhlizec(s([]), { firma }), []);
});
