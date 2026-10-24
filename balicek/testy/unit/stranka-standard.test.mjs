// Stránka /standard-holub/ (úkol 50): generuje ji scripts/build-hbot.mjs z content/*.json.
// Hlídá, že texty a čísla jdou jen z dat, ceny jen s potvrzeným ceníkem a že stránka neobsahuje nic zakázaného.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { strankaStandard, typografie } from "../../web/scripts/stranka-standard.mjs";

const json = (s) => JSON.parse(readFileSync(new URL(`../../web/content/${s}.json`, import.meta.url), "utf8"));
const standard = json("standard"), sentinel = json("sentinel"), ceny = json("ceny"), potvrzeni = json("cenik-potvrzeni");
// Text stránky bez značek, entit a s obyčejnými mezerami (pro porovnání s daty).
const text = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/[\s ]+/g, " ");
const kc = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " Kč";

test("vygenerovaný soubor je aktuální (stejný jako build-hbot)", () => {
  const ulozeny = readFileSync(new URL("../../web/standard-holub/index.html", import.meta.url), "utf8");
  assert.equal(ulozeny, strankaStandard({ standard, sentinel, ceny, potvrzeni }), "spusť: node balicek/web/scripts/build-hbot.mjs");
});

test("postup, cesty, odstíny a SENTINEL přesně z dat", () => {
  const t = text(strankaStandard({ standard, sentinel, ceny, potvrzeni }));
  for (const k of standard.kroky) assert.ok(t.includes(`${k.cislo} ${k.nazev}`.replace(/\s+/g, " ")) || (t.includes(k.cislo) && t.includes(k.nazev)), k.nazev);
  for (const id of ["A", "B"]) assert.ok(t.includes(standard.cesty[id].popis.replace(/\s+/g, " ")), `cesta ${id}`);
  for (const b of [...standard.barvy_renovace.strecha, ...standard.barvy_renovace.fasada]) assert.ok(t.includes(b.ral) && t.includes(b.nazev), b.ral);
  for (const x of sentinel.tarify) assert.ok(t.includes(x.nazev) && t.includes(kc(x.cena_rok) + " ročně"), x.nazev);
  assert.ok(t.includes(sentinel.podminka_zaruky + " Zákonná práva z vadného plnění tím nejsou dotčena."), "podmínka záruky + zákonná práva");
  assert.ok(t.includes(standard.biocidy_veta), "věta o biocidech");
  assert.ok(t.includes(`střecha ${ceny.ochrana_hstone.roof} Kč/m²`) && t.includes(`fasáda ${ceny.renovace_color.facade} Kč/m²`), "sazby z ceníku");
  assert.ok(t.includes("Nejsme plátci DPH, DPH se nepřipočítává."));
});

test("bez potvrzeného ceníku žádné sazby v Kč/m² (pravidlo úkolu 27)", () => {
  const html = strankaStandard({ standard, sentinel, ceny, potvrzeni: { ...potvrzeni, platnost_od: "2000-01-01" } });
  assert.doesNotMatch(text(html), /Kč\/m²/);
  assert.match(text(html), /Cenu potvrdíme individuálně\./);
});

test("pravdivost a embargo: žádná zakázaná slova, kalkulace se nevydává za nabídku", () => {
  const t = text(strankaStandard({ standard, sentinel, ceny, potvrzeni }));
  for (const s of [/letecké mapy/i, /satelitní/i, /Google Maps/i, /katastr/i, /RÚIAN/i, /H-BIO/, /certifikovan/i, /oborový standard/i, /nejlepší/i, /jediní/i]) assert.doesNotMatch(t, s);
  assert.doesNotMatch(t, /PDF nabídk/i);
});

test("strukturovaná data a odkazy: HowTo s 5 kroky, drobečková navigace, CTA otevírá H-BOT", () => {
  const html = strankaStandard({ standard, sentinel, ceny, potvrzeni });
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const howto = ld.find((x) => x["@type"] === "HowTo");
  assert.equal(howto.step.length, standard.kroky.length);
  assert.ok(ld.some((x) => x["@type"] === "BreadcrumbList"));
  assert.equal((html.match(/data-hbot-cena/g) || []).length, 2, "dvě tlačítka „Spočítat cenu hned“");
  assert.match(html, /<link rel="canonical" href="https:\/\/hspg\.cz\/standard-holub\/">/);
  assert.match(html, /<script src="\/assets\/hbot\.js" defer><\/script>/);
  assert.doesNotMatch(html, /https?:\/\/(?!hspg\.cz|schema\.org)/, "žádné cizí domény (CDN, písma)");
});

test("typografie: nezlomitelné mezery po předložkách a mezi číslem a jednotkou", () => {
  assert.equal(typografie("Záruka 10 let a péče v ceně 499 Kč"), "Záruka 10 let a péče v ceně 499 Kč");
  assert.equal(typografie("2 490 Kč"), "2 490 Kč");
});
