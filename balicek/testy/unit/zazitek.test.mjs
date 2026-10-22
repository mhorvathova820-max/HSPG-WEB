// Zvuky a haptika webu (assets/hspg-zazitek.js, úkol 56): soubor pro prohlížeč se spouští ve vm kontextu
// s falešným AudioContextem, navigator.vibrate a localStorage – nic nehraje, nic nevibruje doopravdy.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const KOD = readFileSync(new URL("../../web/assets/hspg-zazitek.js", import.meta.url), "utf8");
const KLIC = "hspg-zazitek";

function pametoveUloziste(pocatek = {}) {
  const m = new Map(Object.entries(pocatek));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } };
}
const rozbiteUloziste = { getItem() { throw new Error("SecurityError"); }, setItem() { throw new Error("QuotaExceededError"); } };

// Falešný Web Audio: zaznamená vznik výstupu, zdroje a jejich start/stop (časy v sekundách výstupu).
function falesneAudio(z) {
  class Param {
    constructor(v = 0) { this.value = v; }
    setValueAtTime(v) { this.value = v; return this; }
    exponentialRampToValueAtTime(v) { if (!(v > 0)) throw new RangeError("exp ramp k nule"); return this; }
    linearRampToValueAtTime() { return this; }
  }
  class Uzel { connect(x) { return x; } disconnect() {} }
  class Zdroj extends Uzel {
    start(t = 0, offset = 0) { this.t0 = t; z.starty.push({ t, offset, druh: this.druh }); }
    stop(t) { z.stopy.push({ od: this.t0, do: t, druh: this.druh }); }
  }
  class Osc extends Zdroj { constructor() { super(); this.druh = "osc"; this.frequency = new Param(440); this.detune = new Param(0); this.type = "sine"; } }
  class Buf extends Zdroj { constructor() { super(); this.druh = "buf"; this.buffer = null; } }
  return class AudioContext {
    constructor() { z.kontexty++; this.state = "suspended"; this.currentTime = 1; this.sampleRate = 8000; this.destination = new Uzel(); }
    resume() { z.probuzeni++; this.state = "running"; return Promise.resolve(); }
    suspend() { z.uspani++; this.state = "suspended"; return Promise.resolve(); }
    createGain() { const g = new Uzel(); g.gain = new Param(1); return g; }
    createOscillator() { z.osc++; return new Osc(); }
    createBufferSource() { z.buf++; return new Buf(); }
    createBiquadFilter() { const f = new Uzel(); f.type = "lowpass"; f.frequency = new Param(350); f.Q = new Param(1); return f; }
    createDynamicsCompressor() { const k = new Uzel(); for (const p of ["threshold", "knee", "ratio", "attack", "release"]) k[p] = new Param(0); return k; }
    createBuffer(kanaly, n) { const data = new Float32Array(n); return { length: n, getChannelData: () => data }; }
  };
}

// Falešný prvek (jen to, co hspg-zazitek.js používá): přepínač i prvky pozvánky (děti, textContent, remove).
function falesneTlacitko(tag = "button") {
  const a = {}, posluchaci = {};
  const ikona = { innerHTML: "" };
  const el = {
    tagName: tag.toUpperCase(), hidden: true, type: "", isConnected: true, a, ikona, deti: [], parentNode: null, className: "", textContent: "",
    classList: { add() {} },
    setAttribute(k, v) { a[k] = String(v); }, getAttribute(k) { return k in a ? a[k] : null },
    addEventListener(t, fn) { (posluchaci[t] ||= []).push(fn); },
    klikni() { (posluchaci.click || []).forEach((fn) => fn({})); },
    appendChild(c) { el.deti.push(c); c.parentNode = el; return c; },
    insertBefore(c) { el.deti.push(c); c.parentNode = el; return c; },
    remove() { if (el.parentNode) el.parentNode.deti = el.parentNode.deti.filter((x) => x !== el); el.parentNode = null; el.isConnected = false; },
    contains(x) { return x === el || el.deti.some((c) => c.contains ? c.contains(x) : c === x); },
    focus() { el.fokus = true; },
    najdi(trida) { return el.deti.find((x) => x.className === trida) || null; },
    set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html || ""; },
    querySelector(sel) { return sel === ".hz-ikona" && this._html ? ikona : null; },
  };
  return el;
}

const ZAPNUTO = () => pametoveUloziste({ [KLIC]: "1" }); // zákazník si zvuk už zapnul
function prostredi({ audio = true, vibrace = true, dotyk = true, aktivni = true, skryto = false, uloziste = pametoveUloziste(), relace = pametoveUloziste(), dokument = true, bezAktivaceApi = false } = {}) {
  const z = { kontexty: 0, osc: 0, buf: 0, probuzeni: 0, uspani: 0, starty: [], stopy: [], vibrace: [] };
  const posluchaciOkna = {};
  const document = dokument ? {
    hidden: skryto,
    addEventListener() {},
    createElement: (tag) => falesneTlacitko(tag),
  } : undefined;
  const navigator = bezAktivaceApi ? {} : { userActivation: { isActive: aktivni, hasBeenActive: aktivni } };
  navigator.maxTouchPoints = dotyk ? 5 : 0;
  if (vibrace) navigator.vibrate = (v) => { z.vibrace.push(v); return true; };
  const ctx = {
    module: { exports: {} }, document, navigator, localStorage: uloziste, sessionStorage: relace, Float32Array,
    // Uspávací časovač nesmí držet proces testu naživu.
    setTimeout: (fn, ms) => { const t = setTimeout(fn, ms); t.unref?.(); return t; }, clearTimeout,
    addEventListener: (t, fn) => { (posluchaciOkna[t] ||= []).push(fn); },
  };
  if (audio) ctx.AudioContext = falesneAudio(z);
  vm.runInNewContext(KOD, ctx, { filename: "hspg-zazitek.js" });
  return { Z: ctx.module.exports, z, ctx, posluchaciOkna };
}
const pockej = () => new Promise((ok) => setImmediate(ok));

test("rozhraní: zvuk, haptika, zapnuto, nastav, prepinac a všech 8 zvuků / 5 vibrací ze zadání", () => {
  const { Z, ctx } = prostredi();
  for (const f of ["zvuk", "haptika", "zapnuto", "nastav", "prepinac", "pozvanka", "naZmenu"]) assert.equal(typeof Z[f], "function", f);
  assert.equal(ctx.HSPGZazitek, Z, "window.HSPGZazitek");
  assert.deepEqual([...Z.ZVUKY].sort(), ["cena", "chyba", "fajfka", "kridla", "otevrit", "pecet", "srdce", "tuk"]);
  assert.deepEqual([...Z.HAPTIKA].sort(), ["cena", "chyba", "fajfka", "pecet", "tuk"]);
  assert.equal(Z.KLIC, KLIC);
});

test("bez AudioContextu, vibrací, úložiště i dokumentu nic nespadne a nic se nestane", () => {
  const { Z, z } = prostredi({ audio: false, vibrace: false, uloziste: rozbiteUloziste });
  assert.equal(Z.zvuk("tuk"), false);
  assert.equal(Z.haptika("tuk"), false);
  assert.equal(Z.zapnuto(), false, "bez uložené volby je vypnuto – zapíná si zákazník sám (rešerše 22. 10. 2026)");
  assert.doesNotThrow(() => Z.nastav(true));
  assert.equal(Z.zapnuto(), true, "volba platí aspoň do zavření stránky");
  const tl = falesneTlacitko();
  assert.equal(Z.prepinac(tl), tl);
  assert.equal(tl.hidden, true, "bez zvuku i vibrací se přepínač neukáže");
  assert.equal(z.kontexty, 0);
  const bezDok = prostredi({ dokument: false, audio: false, vibrace: false });
  assert.equal(bezDok.Z.prepinac(null), null);
  assert.equal(bezDok.Z.zvuk("pecet"), false);
});

test("volba se pamatuje v localStorage „hspg-zazitek“ („0“ / „1“) a platí i po novém načtení", () => {
  const uloziste = pametoveUloziste();
  const a = prostredi({ uloziste });
  assert.equal(a.Z.zapnuto(), false, "výchozí stav vypnuto");
  assert.equal(uloziste.getItem(KLIC), null, "ePrivacy čl. 5(3): bez rozhodnutí zákazníka se nic neukládá");
  a.Z.nastav(true);
  assert.equal(uloziste.getItem(KLIC), "1");
  const b = prostredi({ uloziste });
  assert.equal(b.Z.zapnuto(), true, "nové načtení stránky");
  b.Z.nastav(false);
  assert.equal(uloziste.getItem(KLIC), "0");
  assert.equal(prostredi({ uloziste }).Z.zapnuto(), false);
});

test("vypnuto = žádný zvukový výstup ani vibrace; zapnuto = zvuk hraje", async () => {
  const { Z, z } = prostredi({ uloziste: pametoveUloziste({ [KLIC]: "0" }) });
  for (const n of Z.ZVUKY) assert.equal(Z.zvuk(n), false, n);
  for (const n of Z.HAPTIKA) assert.equal(Z.haptika(n), false, n);
  assert.equal(z.kontexty, 0, "výstup se ani nevytvoří");
  assert.deepEqual(z.vibrace, []);
  Z.nastav(true);
  assert.equal(Z.zvuk("pecet"), true);
  await pockej();
  assert.equal(z.kontexty, 1);
  assert.ok(z.osc + z.buf > 1, "pečeť = šum + úder");
  Z.nastav(false);
  assert.ok(z.uspani >= 1, "vypnutí výstup uspí");
  const pred = z.osc + z.buf;
  assert.equal(Z.zvuk("tuk"), false);
  assert.equal(z.osc + z.buf, pred);
});

test("bez aktivace uživatelem (načtení, najetí, rolování) nic nezazní a nic nevibruje", async () => {
  const { Z, z } = prostredi({ aktivni: false, uloziste: ZAPNUTO() });
  assert.equal(Z.zvuk("otevrit"), false);
  assert.equal(Z.haptika("tuk"), false);
  await pockej();
  assert.equal(z.kontexty, 0, "AudioContext vzniká až při vědomé akci");
  assert.deepEqual(z.vibrace, []);
  // Starší prohlížeč bez navigator.userActivation: bez zaznamenaného gesta také nic.
  const stary = prostredi({ bezAktivaceApi: true, uloziste: ZAPNUTO() });
  assert.equal(stary.Z.zvuk("tuk"), false);
  assert.equal(stary.z.kontexty, 0);
});

test("skrytá karta: žádný zvuk ani vibrace", async () => {
  const { Z, z } = prostredi({ skryto: true, uloziste: ZAPNUTO() });
  assert.equal(Z.zvuk("cena"), false);
  assert.equal(Z.haptika("cena"), false);
  await pockej();
  assert.equal(z.kontexty, 0);
  assert.deepEqual(z.vibrace, []);
});

test("každý zvuk je kratší než 450 ms", async () => {
  for (const nazev of prostredi().Z.ZVUKY) {
    const { Z, z } = prostredi({ uloziste: ZAPNUTO() });
    assert.equal(Z.zvuk(nazev), true, nazev);
    await pockej();
    assert.ok(z.stopy.length > 0, `${nazev}: něco zazní`);
    const od = Math.min(...z.stopy.map((s) => s.od)), konec = Math.max(...z.stopy.map((s) => s.do));
    assert.ok(konec - od < Z.MAX_DELKA && Z.MAX_DELKA <= 0.45, `${nazev}: ${(konec - od).toFixed(3)} s`);
    assert.ok(od >= 1, `${nazev}: nehraje do minulosti`);
  }
});

test("haptika: vzory ze zadání, neznámý název nic", () => {
  const { Z, z } = prostredi({ uloziste: ZAPNUTO() });
  for (const n of ["tuk", "fajfka", "pecet", "cena", "chyba"]) assert.equal(Z.haptika(n), true, n);
  assert.equal(Z.haptika("otevrit"), false);
  assert.equal(Z.haptika("__proto__"), false);
  assert.equal(Z.zvuk("constructor"), false);
  assert.deepEqual(JSON.parse(JSON.stringify(z.vibrace)), [8, [12, 40, 18], [18, 30, 42], [10, 50, 10, 50, 24], [30, 60, 30]]);
  // iOS: navigator.vibrate chybí → tichý no-op.
  assert.equal(prostredi({ vibrace: false, uloziste: ZAPNUTO() }).Z.haptika("pecet"), false);
});

test("přepínač „Zvuk a vibrace“: aria-pressed, ikona, uložení, posluchači a změna z jiné karty", async () => {
  const uloziste = pametoveUloziste();
  const { Z, posluchaciOkna } = prostredi({ uloziste });
  const tl = falesneTlacitko();
  const zmeny = [];
  Z.naZmenu((zap) => zmeny.push(zap));
  Z.prepinac(tl);
  assert.equal(tl.hidden, false);
  assert.equal(tl.type, "button");
  assert.equal(tl.getAttribute("aria-pressed"), "false", "výchozí stav vypnuto");
  assert.equal(tl.getAttribute("aria-label"), "Zvuk a vibrace");
  assert.equal(tl.getAttribute("title"), "Zvuk a vibrace: vypnuto", "stav nese title, aria-label je stálý");
  assert.match(tl.innerHTML, /hz-text">Zvuk a vibrace</);
  assert.match(tl.ikona.innerHTML, /<svg/);
  tl.klikni();
  assert.equal(tl.getAttribute("aria-pressed"), "true");
  assert.equal(tl.getAttribute("title"), "Zvuk a vibrace: zapnuto");
  assert.equal(uloziste.getItem(KLIC), "1");
  tl.klikni();
  assert.equal(tl.getAttribute("aria-pressed"), "false");
  assert.equal(uloziste.getItem(KLIC), "0");
  assert.deepEqual(zmeny, [true, false]);
  // Druhé volání prepinac na stejné tlačítko nepřidá druhý posluchač.
  Z.prepinac(tl);
  tl.klikni();
  assert.equal(tl.getAttribute("aria-pressed"), "true");
  // Volba změněná v jiné kartě (událost storage).
  posluchaciOkna.storage.forEach((fn) => fn({ key: KLIC, newValue: "0" }));
  assert.equal(Z.zapnuto(), false);
  assert.equal(tl.getAttribute("aria-pressed"), "false");
  assert.deepEqual(zmeny, [true, false, true, false]);
});

test("pozvánka „Zapnout zvuk?“: jednou za relaci u přepínače, jen bez uložené volby; Zapnout uloží „1“, zahraje a ukáže stav; ✕ nic neuloží; iPhone bez slova vibrace", async () => {
  const uloziste = pametoveUloziste(), relace = pametoveUloziste();
  const { Z, z } = prostredi({ uloziste, relace });
  const hlavicka = falesneTlacitko("div"), tl = falesneTlacitko();
  hlavicka.appendChild(tl);
  Z.prepinac(tl);
  const box = Z.pozvanka(tl);
  assert.ok(box, "pozvánka se ukázala");
  assert.equal(box.className, "hz-pozvanka");
  assert.equal(box.getAttribute("role"), "group");
  assert.equal(box.parentNode, hlavicka, "vložená vedle přepínače");
  assert.equal(box.najdi("hz-pozvanka-text").textContent, "Zvuk a jemné vibrace jsou vypnuté.");
  assert.equal(box.najdi("hz-pozvanka-ano").textContent, "Zapnout");
  assert.equal(box.najdi("hz-pozvanka-ne").getAttribute("aria-label"), "Nechat vypnuté");
  assert.equal(relace.getItem("hspg-zazitek-pozvanka"), null, "ePrivacy: zobrazení samo nic do úložiště nezapíše");
  assert.equal(uloziste.getItem(KLIC), null, "samotná pozvánka nic neukládá");
  assert.equal(Z.pozvanka(tl), null, "podruhé na téže stránce už ne");
  // Zapnout = vědomá akce: volba „1“, příznak relace, přepínač zapnutý, zvuk otevření + ťuknutí, pozvánka pryč, 3 s stav.
  box.najdi("hz-pozvanka-ano").klikni();
  assert.equal(uloziste.getItem(KLIC), "1");
  assert.equal(relace.getItem("hspg-zazitek-pozvanka"), "1", "rozhodnutí zákazníka se zapíše");
  assert.equal(tl.getAttribute("aria-pressed"), "true");
  assert.equal(box.parentNode, null, "pozvánka zmizela");
  const stav = hlavicka.najdi("hz-stav");
  assert.ok(stav, "krátké potvrzení na místě pozvánky");
  assert.equal(stav.getAttribute("role"), "status");
  assert.equal(stav.textContent, "", "živá oblast se vloží prázdná, text až v dalším tiku (čtečky)");
  await new Promise((ok) => setTimeout(ok, 60));
  assert.equal(stav.textContent, "Zapnuto. Vypnete stejným tlačítkem.");
  await pockej();
  assert.equal(z.kontexty, 1);
  assert.ok(z.osc + z.buf > 1, "zvuk otevření");
  assert.deepEqual(z.vibrace, [8]);
  // S uloženou volbou se pozvánka neukáže ani v nové relaci.
  assert.equal(prostredi({ uloziste, relace: pametoveUloziste() }).Z.pozvanka(tl), null);
  // ✕ = nechat vypnuté: zapíše se jen příznak relace, volba ne; bez zvuku i vibrací se neukáže vůbec.
  const relaceB = pametoveUloziste();
  const b = prostredi({ relace: relaceB });
  const tl2 = falesneTlacitko(); falesneTlacitko("div").appendChild(tl2);
  const box2 = b.Z.pozvanka(tl2);
  assert.ok(box2);
  box2.najdi("hz-pozvanka-ne").klikni();
  assert.equal(box2.parentNode, null);
  assert.equal(b.Z.zapnuto(), false);
  assert.equal(b.ctx.localStorage.getItem(KLIC), null);
  assert.equal(relaceB.getItem("hspg-zazitek-pozvanka"), "1");
  assert.equal(prostredi({ relace: relaceB }).Z.pozvanka(tl2), null, "po ✕ už v relaci ne");
  const c = prostredi({ audio: false, vibrace: false, relace: pametoveUloziste() });
  const tl3 = falesneTlacitko(); falesneTlacitko("div").appendChild(tl3);
  assert.equal(c.Z.pozvanka(tl3), null);
  // Rozbité úložiště relace: pozvánka se ukáže, ale jen jednou na načtení stránky.
  const r = prostredi({ relace: rozbiteUloziste });
  const tl4 = falesneTlacitko(); falesneTlacitko("div").appendChild(tl4);
  assert.ok(r.Z.pozvanka(tl4));
  assert.equal(r.Z.pozvanka(tl4), null);
  // iPhone (dotyk, bez navigator.vibrate): nikde slovo „vibrace“.
  const i = prostredi({ vibrace: false, dotyk: true, relace: pametoveUloziste() });
  const tl5 = falesneTlacitko(); const hl5 = falesneTlacitko("div"); hl5.appendChild(tl5);
  i.Z.prepinac(tl5);
  assert.equal(tl5.getAttribute("aria-label"), "Zvuk");
  assert.equal(tl5.getAttribute("title"), "Zvuk: vypnuto");
  const box5 = i.Z.pozvanka(tl5);
  assert.equal(box5.najdi("hz-pozvanka-text").textContent, "Zvuk je vypnutý.");
  box5.najdi("hz-pozvanka-ano").klikni();
  await new Promise((ok) => setTimeout(ok, 60));
  assert.equal(hl5.najdi("hz-stav").textContent, "Zvuk zapnut. V tichém režimu telefonu ho neuslyšíte.");
  assert.deepEqual(i.z.vibrace, []);
  // Stolní Chrome: navigator.vibrate existuje, motor ne (bez dotyku) → jen „Zvuk“, bez věty o telefonu.
  const pc = prostredi({ vibrace: true, dotyk: false, relace: pametoveUloziste() });
  const tl6 = falesneTlacitko(); const hl6 = falesneTlacitko("div"); hl6.appendChild(tl6);
  pc.Z.prepinac(tl6);
  assert.equal(tl6.getAttribute("aria-label"), "Zvuk");
  const box6 = pc.Z.pozvanka(tl6);
  assert.equal(box6.najdi("hz-pozvanka-text").textContent, "Zvuk je vypnutý.");
  box6.najdi("hz-pozvanka-ano").klikni();
  await new Promise((ok) => setTimeout(ok, 60));
  assert.equal(hl6.najdi("hz-stav").textContent, "Zvuk zapnut. Vypnete stejným tlačítkem.");
});

test("druhé načtení souboru (stránka i panel) nevytvoří druhý stav", () => {
  const { Z, ctx } = prostredi();
  ctx.module = { exports: {} };
  vm.runInContext(KOD, ctx, { filename: "hspg-zazitek.js" });
  assert.equal(ctx.module.exports, Z);
  assert.equal(ctx.HSPGZazitek, Z);
});
