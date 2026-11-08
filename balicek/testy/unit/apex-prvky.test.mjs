// Prvky Apex z Uiverse.io (úkol 57): assets/apex-prvky.css, ukázka navrhy/apex-prvky/index.html,
// licence web/LICENSES-THIRD-PARTY.md a zadání ukoly/57-apex-prvky-uiverse.md.
// Hlídá pravidla z prehledu: jen tokeny --apex-* (žádné pevné hex mimo náhradní hodnoty), přístupné skrytí vstupů,
// viditelný fokus, omezení pohybu, puls jen třídou a nejvýš 3×, žádné CDN ani písma, embargo slov v ukázce.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const soubor = (cesta) => readFileSync(new URL(cesta, import.meta.url), "utf8");
const CSS = soubor("../../web/assets/apex-prvky.css");
const DEMO = soubor("../../navrhy/apex-prvky/index.html");
const LICENCE = soubor("../../web/LICENSES-THIRD-PARTY.md");
const UKOL = soubor("../../ukoly/57-apex-prvky-uiverse.md");

const TRIDY = ["ap-tlacitko", "ap-tlacitko-obrys", "ap-prepinac", "ap-fajfka", "ap-srdce", "ap-nit", "ap-karta",
  "ap-napoveda", "ap-segment", "ap-volba-seznam", "ap-pole", "ap-puls"];
const URL_PRVKU = [
  "https://uiverse.io/dexter-st/young-newt-20",
  "https://uiverse.io/Galahhad/modern-quail-75",
  "https://uiverse.io/SelfMadeSystem/green-bobcat-29",
  "https://uiverse.io/catraco/plastic-moth-91",
  "https://uiverse.io/xXJollyHAKERXx/lucky-falcon-75",
  "https://uiverse.io/joe-watson-sbf/honest-bullfrog-6",
  "https://uiverse.io/vnuny/stale-mouse-74",
  "https://uiverse.io/chase2k25/slimy-chipmunk-97",
  "https://uiverse.io/Smit-Prajapati/quick-panther-98",
  "https://uiverse.io/liyaxu123/warm-eel-62",
  "https://uiverse.io/vinodjangid07/pink-cheetah-68",
  "https://uiverse.io/Li-Deheng/shy-moth-10",
];
const AUTORI = ["dexter-st", "Galahhad (Galahad)", "SelfMadeSystem (SelfMadeSystem)", "catraco (Catraco)", "xXJollyHAKERXx",
  "joe-watson-sbf (Joseph Watzson)", "vnuny (Diaa)", "chase2k25 (chandu.exe)", "Smit-Prajapati (Smit Prajapati)", "liyaxu123",
  "vinodjangid07 (Vinod Jangid)", "Li-Deheng (李德恒)"];
// Embargo slov (KONTEXT §4 bod 10) + výsledek ceny se nikdy nejmenuje „nabídka“.
const ZAKAZANO = [/letecké mapy/i, /satelitní/i, /Google Maps/i, /katastr/i, /RÚIAN/i, /\bz map\b/i, /nabídk/i];

const bezKomentaru = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
// Odstraní každé var(…) včetně vnořených závorek (náhradní hodnoty mohou obsahovat gradient s rgba()).
function bezVar(css) {
  let vystup = "", i = 0;
  while (i < css.length) {
    const z = css.indexOf("var(", i);
    if (z < 0) { vystup += css.slice(i); break; }
    vystup += css.slice(i, z) + "var(…)";
    let hloubka = 0, j = z + 3;
    do { if (css[j] === "(") hloubka++; else if (css[j] === ")") hloubka--; j++; } while (hloubka > 0 && j < css.length);
    i = j;
  }
  return vystup;
}
// Text ukázky bez značek a skriptu (pro kontrolu slov).
const textDema = DEMO.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");

test("CSS je syntakticky celistvé (závorky, bloky) a bez CDN, @import a písem", () => {
  const css = bezKomentaru(CSS);
  const pocet = (z) => (css.match(new RegExp("\\" + z, "g")) || []).length;
  assert.equal(pocet("{"), pocet("}"), "složené závorky");
  assert.equal(pocet("("), pocet(")"), "kulaté závorky");
  // Každý blok má selektor nebo @pravidlo a žádný blok není prázdný.
  assert.doesNotMatch(css, /\{\s*\}/, "prázdný blok");
  assert.doesNotMatch(css, /@import|@font-face|url\(\s*["']?https?:/i, "žádné externí zdroje");
  assert.ok(CSS.length > 10_000 && CSS.length < 80_000, `velikost ${CSS.length} B`);
});

test("obsahuje všech 12 tříd ap-, viditelný fokus a omezení pohybu", () => {
  for (const t of TRIDY) assert.match(CSS, new RegExp(`\\.${t}(?![\\w-])`), t);
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\)/);
  const fokusy = CSS.match(/:focus-visible[^{]*\{[^}]*outline: 2px solid var\(--ap-fokus\);\s*outline-offset: 3px;/g) || [];
  assert.ok(fokusy.length >= 10, `viditelný fokus u ${fokusy.length} prvků`);
  assert.match(CSS, /--ap-fokus: var\(--apex-zlato-svetle, #f6e7a8\)/, "barva fokusu = světlé zlato");
  assert.match(CSS, /@media \(forced-colors: active\)/);
});

test("barvy jen přes tokeny: hex pouze jako náhradní hodnota var(--apex-…, #…), ne v komponentách", () => {
  const css = bezKomentaru(CSS);
  const bezNahrad = css.replace(/var\(\s*--apex-[\w-]+\s*,\s*#[0-9a-fA-F]{3,8}\s*\)/g, "var(…)");
  const zbytek = bezNahrad.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  assert.deepEqual(zbytek, [], "pevné hex mimo náhradní hodnoty tokenů");
  // Komponenty (vše za paletou) nepoužívají ani rgba() napřímo – jen proměnné --ap-* (náhradní hodnoty uvnitř var() nevadí).
  const komponenty = css.slice(css.indexOf(".ap-skryte"));
  assert.doesNotMatch(bezVar(komponenty), /rgba?\(|hsla?\(/, "rgba() mimo paletu");
  // Paleta bere každou barvu z tokenu --apex-*.
  for (const t of ["cern-0", "cern-1", "zlato", "zlato-svetle", "zlato-tmave", "text", "tlumene", "linka", "linka-silna", "pismo", "pismo-nadpis", "krivka"]) {
    assert.match(css, new RegExp(`--ap-${t}: var\\(--apex-${t},`), `token --apex-${t}`);
  }
});

test("nativní vstupy jsou skryté přístupně (ne display:none) a všechny komponenty mají cíl ≥ 44 px", () => {
  const css = bezKomentaru(CSS);
  const skryteVstupy = css.match(/\.ap-skryte,[\s\S]*?\{([\s\S]*?)\}/)[1];
  assert.match(skryteVstupy, /clip-path: inset\(50%\)/);
  assert.doesNotMatch(skryteVstupy, /display:\s*none/);
  for (const v of ["prepinac", "fajfka", "srdce", "segment", "volba-seznam"]) assert.match(css, new RegExp(`\\.ap-${v}__vstup,?`), `skrytý vstup ${v}`);
  assert.doesNotMatch(css, /__vstup[^{]*\{[^}]*display:\s*none/, "display:none u vstupu");
  // min-height / rozměr u každého interaktivního prvku.
  for (const [selektor, min] of [[".ap-tlacitko {", 48], [".ap-tlacitko-obrys {", 44], [".ap-prepinac {", 44], [".ap-fajfka {", 44],
    [".ap-napoveda__bod {", 44], [".ap-segment__volba {", 44], [".ap-volba-seznam__volba {", 48], [".ap-pole__vstup {", 48], [".ap-puls {", 48]]) {
    const blok = css.slice(css.indexOf(selektor));
    const telo = blok.slice(0, blok.indexOf("}"));
    assert.match(telo, new RegExp(`min-(?:height|width): ${min}px`), `${selektor} ≥ ${min} px`);
  }
  assert.match(css, /\.ap-srdce \{[^}]*width: 50px;[^}]*height: 50px;/);
});

test("puls: jen třídou ap-puls--aktivni, nejvýš 3 cykly, nikdy při najetí; omezení pohybu vše zastaví", () => {
  const css = bezKomentaru(CSS);
  assert.match(css, /\.ap-puls--aktivni \{ animation: ap-puls-vlna [\d.]+s [\w-]+ 3; \}/);
  const zakladniPuls = css.match(/\.ap-puls \{([^}]*)\}/)[1];
  assert.doesNotMatch(zakladniPuls, /animation/, "puls bez třídy --aktivni nesmí mít animaci");
  assert.doesNotMatch(css, /\.ap-puls:hover \{[^}]*animation/, "žádný puls při najetí");
  assert.doesNotMatch(css, /\.ap-tlacitko[^{]*\{[^}]*animation:/, "skleněné tlačítko bez animace po písmenech a blikání");
  const omezeni = css.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/)[1];
  for (const s of [".ap-nit", ".ap-puls--aktivni", ".ap-srdce__ikony .ap-srdce__plne", ".ap-srdce__ikony .ap-srdce__jiskry"]) assert.ok(omezeni.includes(s), `omezení pohybu: ${s}`);
  assert.match(omezeni, /animation: none;/);
  assert.match(omezeni, /transition: none;/);
  // Jediné nekonečné smyčky: otáčení nitě (stav čekání) – nic jiného.
  const smycky = [...css.matchAll(/animation:[^;]*infinite/g)].map((m) => m[0]);
  assert.deepEqual(smycky, ["animation: ap-nit-otaceni 1.7s linear infinite"]);
});

test("ukázka: odkazuje na tokeny i prvky, ukazuje každou třídu, nic nepulzuje při načtení, bez cizích zdrojů", () => {
  assert.match(DEMO, /<html lang="cs">/);
  assert.match(DEMO, /<link rel="stylesheet" href="\.\.\/\.\.\/web\/assets\/apex-tokens\.css">/);
  assert.match(DEMO, /<link rel="stylesheet" href="\.\.\/\.\.\/web\/assets\/apex-prvky\.css">/);
  for (const t of TRIDY) assert.match(DEMO, new RegExp(`class="[^"]*\\b${t}(?![\\w-])`), `ukázka ${t}`);
  assert.doesNotMatch(DEMO, /class="[^"]*ap-puls--aktivni/, "puls při načtení");
  assert.doesNotMatch(DEMO, /<(?:link|script|img|iframe)[^>]+(?:href|src)="https?:/i, "cizí zdroje (CDN, písma)");
  assert.match(DEMO, /name="robots" content="noindex/);
  // Skryté vstupy mají popisek: každý input bez viditelného labelu má aria-label nebo label[for].
  for (const m of DEMO.matchAll(/<input ([^>]*)>/g)) {
    const atributy = m[1];
    const id = atributy.match(/\bid="([^"]+)"/)?.[1];
    const maPopisek = /aria-label="/.test(atributy) || (id && new RegExp(`<label [^>]*for="${id}"`).test(DEMO)) || /ap-(?:prepinac|fajfka)__vstup/.test(atributy);
    assert.ok(maPopisek, `vstup bez popisku: ${atributy.slice(0, 60)}`);
  }
});

test("ukázka: české texty bez embarga a bez slova „nabídka“, licence a autoři uvedeni", () => {
  for (const z of ZAKAZANO) assert.doesNotMatch(textDema, z);
  for (const t of ["Zaměřit na dálku", "Zvuk a vibrace", "Neviditelný štít", "Uložit odstín RAL 9001", "Adresa domu", "Pokračovat na cenu", "Jak použít"]) {
    assert.ok(DEMO.replace(/&nbsp;/g, " ").includes(t), t);
  }
  assert.match(DEMO, /LICENSES-THIRD-PARTY\.md/);
  assert.match(DEMO, /nikdy se nenasazuje/);
});

test("licence: 12 adres, autoři s řádkem Copyright - 2026, plné znění MIT a popis změn", () => {
  for (const u of URL_PRVKU) assert.ok(LICENCE.includes(u), u);
  for (const a of AUTORI) assert.ok(LICENCE.includes(`Copyright - 2026 ${a}`), `Copyright - 2026 ${a}`);
  assert.match(LICENCE, /Permission is hereby granted, free of charge, to any person obtaining a copy/);
  assert.match(LICENCE, /THE SOFTWARE IS PROVIDED "AS IS"/);
  assert.match(LICENCE, /https:\/\/opensource\.org\/license\/mit/);
  for (const t of TRIDY) assert.ok(LICENCE.includes(`\`${t}\``), `třída ${t} v tabulce`);
  assert.match(LICENCE, /## Co bylo změněno/);
});

test("zadání 57 existuje a odkazuje na soubory balíčku a krok s licencí", () => {
  assert.match(UKOL, /^# Úkol 57:/m);
  for (const s of ["assets/apex-prvky.css", "LICENSES-THIRD-PARTY.md", "navrhy/apex-prvky/index.html", "apex-prvky.test.mjs", "ap-puls--aktivni"]) assert.ok(UKOL.includes(s), s);
  for (const t of TRIDY) assert.ok(UKOL.includes(t), `zadání zmiňuje ${t}`);
  for (const z of ZAKAZANO.slice(0, 6)) assert.doesNotMatch(UKOL.replace(/„nabídk[^“]*“/g, ""), z);
});
