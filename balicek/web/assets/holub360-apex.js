/* HOLUB 360 · Apex – řadič stránky /holub-360/ (ES modul, bez inline skriptů kvůli CSP).
 *
 * Tok: adresa (našeptávač) → měření na dálku (/api/cena-z-adresy, úkol 27: obrys a tři plochy jako odhad)
 *      → cesta A/B a odstín RAL → cena z cenového jádra (assets/hspg-cena.js) → obálka s pečetí → certifikát
 *      → kalendář 21 dní (/api/planovac, technologické okno R17) → rezervace (formulář Netlify „hspg-rezervace“).
 * Pravidla: ceny výhradně přes HSPGCena (nic natvrdo), texty z JSON přes HSPGCena.typografie(); bez potvrzeného
 * ceníku žádná částka v Kč; 3D model je ilustrační (pevná výška, žádné výšky z měření); ukázka jen s ?ukazka=1.
 * Volá jen vlastní web: /content/*.json (jádro), /api/cena-z-adresy, /api/planovac a odeslání formuláře na „/“.
 */
import { vytvorHejno } from "./holub360-hejno.js";

const $ = (id) => document.getElementById(id);
const NB = "\u00a0";
const API_MERENI = "/api/cena-z-adresy";
const API_PLAN = "/api/planovac";
const dotaz = new URLSearchParams(location.search);
const UKAZKA = dotaz.get("ukazka") === "1";
const pohybDolu = matchMedia("(prefers-reduced-motion: reduce)");
const MOBIL = matchMedia("(max-width: 720px)").matches || (navigator.maxTouchPoints > 0 && matchMedia("(pointer: coarse)").matches);
const POVRCHY = ["strecha", "fasada", "dlazba"];
const NAZEV_POVRCHU = { strecha: "Střecha", fasada: "Fasáda", dlazba: "Dlažba" };
const SLUZBA = { A: "Čištění + impregnace H-STONE", B: "Plná renovace barevným nástřikem" };
const TYP_POVRCHU = { strecha: "Střecha", fasada: "Fasáda", dlazba: "Dlažba" };

// Ukázkový dům pro ?ukazka=1 (smyšlený, vždy se štítkem UKÁZKA; nic se neměří ani neodesílá).
const UKAZKOVY_DUM = {
  stav: "hotovo", ukazka: true, adresa: "Ukázkový dům (smyšlený)", obec: "Praha",
  plochy: { strecha: 168, fasada: 236, pudorys: 132 },
  obrys: { jednotka: "m", body: [[-6, -5.5], [6, -5.5], [6, 1.5], [2.5, 1.5], [2.5, 5.5], [-6, 5.5]] },
};

const stav = {
  jadro: null, C: null, mereni: null, cesta: "A", barvy: { strecha: null, fasada: null }, vlastni: "",
  typObjektu: "rd", med: 0, nabidka: null, otevreno: false, termin: "", plan: null, planKlic: null,
  model: null, modelSlib: null, scena: null, zvuk: null, kapky: null, rucne: false, hejno: null,
};

// ---------------------------------------------------------------- pomůcky
function el(tag, cls, ...obsah) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  for (const x of obsah) if (x != null && x !== false) e.append(x);
  return e;
}
const sr = (t) => el("span", "h3a-sr", t);
const typo = (t) => (stav.C ? stav.C.typografie(t) : String(t ?? ""));
const kc = (n) => typo(stav.C.kc(n));
const m2 = (n) => typo(`${String(Math.round(n * 10) / 10).replace(".", ",")} m²`);
function info(e, text, cls) {
  if (!e) return;
  e.textContent = text || "";
  e.classList.remove("ok", "chyba");
  if (cls) e.classList.add(cls);
}
const hlas = (e, klic, cls) => info(e, e?.dataset[klic] || "", cls);
const plynule = () => (pohybDolu.matches ? "auto" : "smooth");
function cislo(v) {
  const n = Number(String(v ?? "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}
const datumIso = (iso, o) => new Intl.DateTimeFormat("cs-CZ", { timeZone: "UTC", ...o }).format(new Date(`${iso}T12:00:00Z`));

async function ziskej(url, { method = "GET", telo, limit = 12000, signal } = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), limit);
  signal?.addEventListener("abort", () => ac.abort());
  try {
    const r = await fetch(url, {
      method, signal: ac.signal, credentials: "same-origin",
      headers: telo ? { "content-type": "application/json" } : undefined,
      body: telo ? JSON.stringify(telo) : undefined,
    });
    let j = null;
    try { j = await r.json(); } catch { /* bez těla */ }
    return { ok: r.ok, status: r.status, j };
  } finally { clearTimeout(t); }
}

// Jádro cen (UMD skript hspg-cena.js se načítá před tímto modulem; pojistka pro případ, že by chyběl).
async function nactiJadro() {
  if (!window.HSPGCena) {
    await new Promise((ok) => {
      const s = document.createElement("script");
      s.src = "/assets/hspg-cena.js"; s.onload = ok; s.onerror = ok;
      document.head.append(s);
    });
  }
  if (!window.HSPGCena) return null;
  stav.C = window.HSPGCena;
  try { return await window.HSPGCena.nacti(); } catch { return null; }
}
const cenyPotvrzene = () => !!(stav.jadro && stav.jadro.potvrzeno);

// ---------------------------------------------------------------- zvuk (jen po zapnutí)
// Převzato a zjednodušeno z SensoryEngine (hspg-balik/public/js/holub30-visualizer.js): tichý pad a krátké tóny.
class Zvuk {
  constructor() { this.ctx = null; this.on = false; this.uzly = []; }
  async zapni() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    this.ctx ||= new AC();
    await this.ctx.resume();
    const t = this.ctx.currentTime;
    this.master = this.ctx.createGain();
    this.master.gain.setValueAtTime(0, t);
    this.master.gain.linearRampToValueAtTime(0.32, t + 1.2);
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 420;
    this.master.connect(lp); lp.connect(this.ctx.destination);
    this.uzly.push(lp);
    for (const f of [55, 82.4, 110.3]) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.frequency.value = f; g.gain.value = 0.05; o.connect(g); g.connect(this.master); o.start();
      this.uzly.push(o, g);
    }
    this.on = true;
    return true;
  }
  vypni() {
    if (!this.ctx || !this.on) return;
    this.on = false;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(0, t + 0.5);
    const uzly = this.uzly; this.uzly = [];
    setTimeout(() => { for (const n of uzly) { try { n.stop?.(); n.disconnect(); } catch { /* uzel už neexistuje */ } } this.master?.disconnect(); }, 600);
  }
  ton(frekvence, delka = 0.5, hlasitost = 0.08, zpozdeni = 0) {
    if (!this.on) return;
    const t = this.ctx.currentTime + zpozdeni, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(frekvence, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(hlasitost, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + delka);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + delka + 0.05);
  }
  sken() { this.ton(1320, 0.18, 0.05); this.ton(1760, 0.22, 0.04, 0.12); }
  pecet() { this.ton(392, 1.4, 0.09); this.ton(587.3, 1.4, 0.06, 0.05); this.ton(784, 1.6, 0.05, 0.1); }
  kapka() { this.ton(1900 + Math.random() * 900, 0.12, 0.03); }
}

// Zvuková kulisa v úvodu (tichý pad, jen po zapnutí). Hlavní vypínač „Zvuk a vibrace“ platí i pro ni.
async function prepniKulisu(zapnout) {
  const b = $("h3a-zvuk");
  stav.zvuk ||= new Zvuk();
  if (zapnout) {
    if (!(await stav.zvuk.zapni())) return;
    const z = zazitekModul();
    if (z && !z.zapnuto()) z.nastav(true); // zákazník zvuk výslovně chce → zapne i hlavní vypínač
  } else stav.zvuk.vypni();
  b.setAttribute("aria-pressed", String(zapnout));
  b.querySelector("span").textContent = zapnout ? "Zvuková kulisa: zapnutá" : "Zvuková kulisa: vypnutá";
}
function nastavZvuk() {
  const b = $("h3a-zvuk");
  if (!b || !(window.AudioContext || window.webkitAudioContext)) return;
  b.hidden = false;
  b.addEventListener("click", () => prepniKulisu(b.getAttribute("aria-pressed") !== "true"));
}

// ---------------------------------------------------------------- zvuk a vibrace (assets/hspg-zazitek.js, úkol 56)
// Krátké zvuky a vibrace jen po vědomé akci (pečeť, cena, měření, chyba); přepínač „Zvuk a vibrace“ v hlavičce.
const zazitekModul = () => window.HSPGZazitek || null;
function zazitek(zvuk, haptika) {
  const z = zazitekModul();
  if (!z) return;
  try { if (zvuk) z.zvuk(zvuk); if (haptika) z.haptika(haptika); } catch { /* bez zvuku */ }
}
function nastavZazitek() {
  const tl = $("h3a-zazitek"), tlKarta = $("h3a-zazitek-karta");
  const pripoj = () => {
    const z = zazitekModul();
    if (!z || !tl) return;
    z.prepinac(tl);
    if (tlKarta) z.prepinac(tlKarta); // druhý přepínač v kartě adresy – u něj se ukazuje pozvánka (hlavička je mimo výřez)
    z.naZmenu((zap) => { if (!zap && stav.zvuk?.on) prepniKulisu(false); });
  };
  if (zazitekModul()) pripoj();
  else document.querySelector('script[src$="/hspg-zazitek.js"]')?.addEventListener("load", pripoj, { once: true });
}

// ---------------------------------------------------------------- hero: průlet a kapky
let webgl;
function podporaWebGL() {
  if (webgl !== undefined) return webgl;
  try {
    const c = document.createElement("canvas");
    const g = window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"));
    webgl = !!g;
    g?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch { webgl = false; }
  return webgl;
}
function pozdeji(fn) {
  const spust = () => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 1800 }) : setTimeout(fn, 400));
  if (document.readyState === "complete") spust(); else addEventListener("load", spust, { once: true });
}
function nastavHero() {
  const hero = $("holub-360-hero"), host = $("holub-360-hero-viewport"), tip = $("h3a-kapky-tip");
  pozdeji(async () => {
    // Kapky („klepněte kamkoliv“): při omezení pohybu vypnuté.
    if (!pohybDolu.matches) {
      try {
        const { pripojKapky } = await import("./hspg-kapky.js");
        stav.kapky = pripojKapky(hero, { priKapce: () => stav.zvuk?.kapka(), tridaPlatna: "h3a-kapky-vrstva" });
        if (stav.kapky.aktivni && tip) {
          tip.hidden = false;
          tip.addEventListener("click", () => {
            const r = tip.getBoundingClientRect(), h = hero.getBoundingClientRect();
            stav.kapky.vystrel(r.left - h.left + r.width / 2, r.top - h.top - 12, 1.4);
          });
        }
      } catch { /* bez kapek */ }
    }
    // Průlet nad Starou Prahou: až po načtení stránky, jen s WebGL a bez omezení pohybu; jinak zůstane statický obraz.
    // Slabá zařízení a úsporný režim dat: zůstane statický obraz (šetří baterii i data).
    const slabe = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
    if (pohybDolu.matches || !podporaWebGL() || navigator.connection?.saveData || slabe) { host.dataset.scena = "staticka"; return; }
    try {
      const { vytvorPrulet } = await import("./holub360-scena.js");
      stav.scena = await vytvorPrulet(host, { mobil: MOBIL });
      host.classList.add("je-3d");
      host.dataset.scena = "3d";
    } catch { host.dataset.scena = "staticka"; }
  });
  pohybDolu.addEventListener?.("change", () => { if (pohybDolu.matches) { stav.scena?.zastav(); host.classList.remove("je-3d"); stav.kapky?.vypni(); } });
}

// ---------------------------------------------------------------- měření na dálku (adaptér /api/cena-z-adresy)
function normNavrh(x) {
  if (!x) return null;
  if (typeof x === "string") return { kod: null, adresa: x.slice(0, 160) };
  const adresa = String(x.adresa ?? x.text ?? x.nazev ?? "").trim();
  if (!adresa) return null;
  const kod = x.kod ?? x.kodAdresy ?? x.id ?? null;
  return { kod: kod == null ? null : String(kod).replace(/[^\w-]/g, "").slice(0, 20), adresa: adresa.slice(0, 160), obec: x.obec ? String(x.obec).slice(0, 80) : null };
}
function plocha(x) {
  const v = typeof x === "object" && x ? (x.plocha ?? x.m2 ?? x.hodnota ?? x.odhad) : x;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n < 100000 ? Math.round(n * 10) / 10 : null;
}
// Obrys → body v metrech kolem těžiště (x na východ, y na sever) + těžiště ve WGS 84, pokud bylo v datech.
function obrysZDat(x) {
  if (!x) return null;
  let jednotka = x.jednotka || null, body = x;
  if (x.type === "Feature") x = x.geometry;
  if (x && x.type === "Polygon") { body = (x.coordinates?.[0] || []).map(([lon, lat]) => ({ lat, lon })); }
  else if (x && x.type === "MultiPolygon") { body = (x.coordinates?.[0]?.[0] || []).map(([lon, lat]) => ({ lat, lon })); }
  else if (!Array.isArray(x)) body = x.body || x.souradnice || x.points || null;
  if (!Array.isArray(body) || body.length < 3) return null;
  const vMetrech = jednotka === "m";
  let pole = body.map((b) => {
    if (Array.isArray(b)) {
      const [a, c] = b.map(Number);
      if (vMetrech || Math.abs(a) > 180 || Math.abs(c) > 180) return { m: [a, c] };
      if (a >= 45 && a <= 56 && c >= 5 && c <= 25) return { lat: a, lon: c };
      if (c >= 45 && c <= 56 && a >= 5 && a <= 25) return { lat: c, lon: a };
      return { m: [a, c] };
    }
    const lat = Number(b.lat), lon = Number(b.lon ?? b.lng);
    if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
    if (Number.isFinite(Number(b.x)) && Number.isFinite(Number(b.y))) return { m: [Number(b.x), Number(b.y)] };
    return null;
  }).filter(Boolean);
  if (pole.length > 2 && pole[0].lat === pole.at(-1).lat && pole[0].lon === pole.at(-1).lon && pole[0].m === undefined) pole = pole.slice(0, -1);
  if (pole.length < 3) return null;
  let wgs = null, m;
  if (pole.every((p) => p.m)) m = pole.map((p) => p.m);
  else if (pole.every((p) => p.lat != null)) {
    const lat0 = pole.reduce((s, p) => s + p.lat, 0) / pole.length, lon0 = pole.reduce((s, p) => s + p.lon, 0) / pole.length;
    const kx = Math.cos((lat0 * Math.PI) / 180) * 111320, ky = 110540;
    m = pole.map((p) => [(p.lon - lon0) * kx, (p.lat - lat0) * ky]);
    wgs = { lat: lat0, lon: lon0 };
  } else return null;
  const cx = m.reduce((s, p) => s + p[0], 0) / m.length, cy = m.reduce((s, p) => s + p[1], 0) / m.length;
  m = m.map(([a, b]) => [a - cx, b - cy]);
  const rozsah = Math.max(...m.map(([a, b]) => Math.hypot(a, b)));
  if (!(rozsah > 1 && rozsah < 400)) return null;
  return { body: m, wgs };
}
function polohaZDat(x) {
  if (!x) return null;
  const lat = Number(Array.isArray(x) ? x[0] : x.lat), lon = Number(Array.isArray(x) ? x[1] : (x.lon ?? x.lng));
  return lat >= 48 && lat <= 51.5 && lon >= 12 && lon <= 19.5 ? { lat, lon } : null;
}
// Uvedení zdroje: jen ustálené licenční značky, nikdy surový text ze zdrojů (embargo slov pro zákazníky).
function licenceZDat(j) {
  const t = JSON.stringify([j.zdroje ?? [], j.licence ?? [], j.zdroj ?? ""]);
  const out = [];
  if (/ČÚZK|CUZK|ČUZK/i.test(t)) out.push("© ČÚZK");
  if (/OpenStreetMap|\bOSM\b/i.test(t)) out.push("© přispěvatelé OpenStreetMap");
  return out;
}
export function normalizujMereni(j, volba = {}) {
  if (!j || typeof j !== "object") return { stav: "chyba" };
  const s = String(j.stav || (j.chyba ? "chyba" : "hotovo"));
  if (s === "vyber" || s === "neni-budova") return { stav: s, kandidati: (j.kandidati || []).map(normNavrh).filter(Boolean) };
  if (s !== "hotovo") return { stav: "chyba" };
  const pl = j.plochy && typeof j.plochy === "object" ? j.plochy : j;
  const plochy = {
    strecha: plocha(pl.strecha ?? pl.roof),
    fasada: plocha(pl.fasada ?? pl.fasady ?? pl.facade),
    pudorys: plocha(pl.pudorys ?? pl.zastavenaPlocha ?? pl.footprint),
  };
  const obrys = obrysZDat(j.obrys ?? j.polygon ?? null);
  const adresa = String(j.adresa || volba.adresa || "").slice(0, 160);
  const poloha = polohaZDat(j.poloha ?? j.stred ?? null) || obrys?.wgs || null;
  const obec = j.obec ? { obec: String(j.obec).slice(0, 80), okres: j.okres ? String(j.okres).slice(0, 80) : null } : obecZAdresy(adresa);
  if (!plochy.strecha && !plochy.fasada) return { stav: "chyba" };
  return { stav: "hotovo", adresa, obec, kodObce: j.kodObce ?? null, poloha, plochy, obrys: obrys?.body || null, licence: licenceZDat(j), ukazka: !!j.ukazka };
}
// Obec z textu adresy (jako obecZTextu na serveru) – plánovači se posílá jen obec, nikdy ulice a číslo.
export function obecZAdresy(text) {
  let s = String(text || "").replace(/\s+/g, " ").trim().slice(0, 200).replace(/[,\s]*(Česká republika|Česko|Czech Republic|Czechia)\s*$/i, "").trim();
  let okres = null;
  const mOk = s.match(/\(\s*(?:okres\s+)?([^()]+?)\s*\)\s*$/i) || s.match(/,\s*okres\s+([^,]+)$/i);
  if (mOk) { okres = mOk[1].trim(); s = s.slice(0, mOk.index).replace(/[,\s]+$/, ""); }
  let obec;
  const mPsc = s.match(/(?:^|[,\s])(\d{3}) ?(\d{2})\s+([^,\d][^,]*)$/);
  if (mPsc) obec = mPsc[3];
  else { const c = s.split(",").map((x) => x.trim()).filter(Boolean); obec = [...c].reverse().find((x) => !/\d/.test(x)) || c.at(-1) || ""; }
  obec = obec.replace(/\s+-\s+.*$/, "").replace(/\s+\d+$/, "").replace(/\s+[IVX]{1,4}$/, "").replace(/^\d+\s+/, "").trim();
  return /\p{L}{2}/u.test(obec) ? { obec: obec.slice(0, 80), okres } : null;
}

// ---------------------------------------------------------------- krok 1: adresa a našeptávač
function nastavAdresu() {
  const karta = $("h3a-adresa-karta"), form = $("h3a-form-adresa"), vstup = $("h3a-adresa-vstup"), seznam = $("h3a-navrhy");
  const stavEl = $("h3a-adresa-stav"), sense = $("h3a-sense");
  karta.hidden = false;
  $("h3a-cta").href = "#h3a-adresa";
  vstup.setAttribute("role", "combobox");
  vstup.setAttribute("aria-autocomplete", "list");
  vstup.setAttribute("aria-controls", "h3a-navrhy");
  vstup.setAttribute("aria-expanded", "false");
  let navrhy = [], aktivni = -1, vybrana = null, casovac, ctrl, cache = new Map(), navrhChyba = false;

  const zavri = () => { seznam.hidden = true; seznam.textContent = ""; navrhy = []; aktivni = -1; vstup.setAttribute("aria-expanded", "false"); vstup.removeAttribute("aria-activedescendant"); };
  const ukaz = (s) => {
    zavri();
    if (!s.length || document.activeElement !== vstup) return;
    navrhy = s;
    s.forEach((n, i) => {
      const li = el("li", "", n.adresa);
      li.id = "h3a-n" + i; li.setAttribute("role", "option"); li.setAttribute("aria-selected", "false");
      li.addEventListener("click", () => zvol(n));
      seznam.append(li);
    });
    seznam.hidden = false;
    vstup.setAttribute("aria-expanded", "true");
  };
  const zvol = (n) => { vybrana = n; vstup.value = n.adresa; zavri(); zmer(n); };
  seznam.addEventListener("mousedown", (e) => e.preventDefault());

  async function navrhni(t) {
    const k = t.toLowerCase();
    if (cache.has(k)) return ukaz(cache.get(k));
    ctrl?.abort();
    const c = (ctrl = new AbortController());
    try {
      const r = await ziskej(`${API_MERENI}?navrh=${encodeURIComponent(t.slice(0, 80))}`, { signal: c.signal, limit: 8000 });
      navrhChyba = !r.ok;
      if (r.status === 429) return hlas(stavEl, "limit", "chyba");
      const s = Array.isArray(r.j?.navrhy) ? r.j.navrhy.map(normNavrh).filter(Boolean).slice(0, 8) : [];
      if (r.ok) cache.set(k, s);
      if (ctrl === c && vstup.value.trim() === t) ukaz(s);
    } catch { if (ctrl === c) navrhChyba = true; /* tiše – dá se psát dál */ }
  }
  vstup.addEventListener("input", () => {
    vybrana = null; clearTimeout(casovac);
    const t = vstup.value.trim();
    if (t.length < 3) { ctrl?.abort(); return zavri(); }
    casovac = setTimeout(() => navrhni(t), 300);
  });
  vstup.addEventListener("keydown", (e) => {
    const n = navrhy.length, k = e.key;
    if ((k === "ArrowDown" || k === "ArrowUp") && n) {
      e.preventDefault();
      aktivni = k === "ArrowDown" ? (aktivni + 1) % n : aktivni < 1 ? n - 1 : aktivni - 1;
      [...seznam.children].forEach((li, i) => li.setAttribute("aria-selected", String(i === aktivni)));
      vstup.setAttribute("aria-activedescendant", "h3a-n" + aktivni);
    } else if (k === "Enter" && n && (aktivni >= 0 || n === 1)) {
      e.preventDefault();
      zvol(navrhy[Math.max(0, aktivni)]);
    } else if (k === "Escape" && n) { e.preventDefault(); zavri(); }
  });
  vstup.addEventListener("blur", () => setTimeout(zavri, 150));
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (vybrana) return zmer(vybrana);
    if (navrhy.length === 1) return zvol(navrhy[0]);
    const t = vstup.value.trim();
    vstup.focus(); // návrhy se ukazují jen u zaměřeného pole
    if (t.length < 3) { zazitek("chyba", "chyba"); return hlas(stavEl, "vyber"); }
    await navrhni(t);
    if (navrhy.length === 1) zvol(navrhy[0]);
    else if (navrhChyba) { zazitek("chyba"); hlas(stavEl, "chyba", "chyba"); rucniZadani({ adresa: t }); }
    else { vstup.focus(); if (!navrhy.length) zazitek("chyba"); hlas(stavEl, navrhy.length ? "vyber" : "nenalezeno", navrhy.length ? null : "chyba"); }
  });

  // Hejno při měření (úkol 56): holubi se rozsvěcují jen podle skutečných kroků níže, nic se nezdržuje.
  stav.hejno = vytvorHejno($("h3a-hejno-kroky"), $("h3a-hejno-stav"), { klid: () => pohybDolu.matches, typo });
  let mereniCtrl;
  async function zmer(volba) {
    mereniCtrl?.abort();
    const c = (mereniCtrl = new AbortController());
    hlas(stavEl, "nacitam");
    sense.classList.add("je-aktivni");
    $("h3a-zmerit").disabled = true;
    stav.hejno.start(); // holub „Měří“: požadavek právě odchází
    zazitek("kridla");
    zazitekModul()?.pozvanka($("h3a-zazitek-karta") || $("h3a-zazitek")); // první vědomá akce: pozvánka „Zapnout zvuk?“ v kartě adresy (ve výřezu)
    try {
      const r = await ziskej(API_MERENI, { method: "POST", telo: { kod: volba.kod, adresa: volba.adresa }, signal: c.signal, limit: 25000 });
      if (mereniCtrl !== c) return;
      if (r.status === 429) { zazitek("chyba"); hlas(stavEl, "limit", "chyba"); zahodMereni(volba.adresa); return rucniZadani({ adresa: volba.adresa }); }
      if (r.status === 404) { zazitek("chyba"); zahodMereni(volba.adresa); return hlas(stavEl, "nenalezeno", "chyba"); }
      if (!r.ok) { zazitek("chyba"); hlas(stavEl, "chyba", "chyba"); zahodMereni(volba.adresa); return rucniZadani({ adresa: volba.adresa }); }
      stav.hejno.krok("pocita"); // odpověď je tu – počítají se plochy
      const m = normalizujMereni(r.j, volba);
      stav.hejno.krok("overuje", { plochy: m.plochy }); // výběr budovy a úplnost údajů
      if (m.stav === "vyber" || m.stav === "neni-budova") {
        zazitek("chyba");
        hlas(stavEl, m.stav === "vyber" ? "vyber" : "neniBudova", "chyba");
        zahodMereni(volba.adresa);
        vstup.focus();
        return ukaz(m.kandidati);
      }
      if (m.stav !== "hotovo") { zazitek("chyba"); hlas(stavEl, "chyba", "chyba"); zahodMereni(volba.adresa); return rucniZadani({ adresa: volba.adresa }); }
      stav.hejno.krok("komunikuje");
      hlas(stavEl, "hotovo", "ok");
      zobrazMereni(m);
      stav.hejno.hotovo(); // výsledek je oznámený a vidět v kroku 02
      zazitek("fajfka");
    } catch {
      if (mereniCtrl === c) { zazitek("chyba"); hlas(stavEl, "chyba", "chyba"); zahodMereni(volba.adresa); rucniZadani({ adresa: volba.adresa }); }
    } finally {
      if (mereniCtrl === c) { sense.classList.remove("je-aktivni"); $("h3a-zmerit").disabled = false; }
    }
  }
  $("h3a-rucne").addEventListener("click", () => rucniZadani({ adresa: vstup.value.trim(), fokus: true }));

  if (UKAZKA) {
    $("h3a-ukazka-stitek").hidden = false;
    vstup.value = UKAZKOVY_DUM.adresa;
    hlas(stavEl, "ukazka", "ok");
    zobrazMereni(normalizujMereni(UKAZKOVY_DUM), { posun: false });
  }
}

// Neúspěšné nové měření nesmí nechat plochy, cenu ani adresu předchozího domu (ručně zadané plochy zůstávají).
function zahodMereni(adresa = "") {
  stav.hejno?.zrus(); // neúspěšné měření: hejno zpět do klidu, stavový řádek prázdný
  if (!stav.mereni || stav.mereni.stav === "rucne") return;
  stav.mereni = null;
  for (const p of ["strecha", "fasada"]) { $("h3a-plocha-" + p).value = ""; $("h3a-chce-" + p).checked = false; }
  $("h3a-pudorys").hidden = true;
  $("h3a-licence").hidden = true;
  $("h3a-licence").textContent = "";
  $("h3a-model").hidden = true;
  $("h3a-predpo-obal").hidden = true;
  $("h3a-vysledek-adresa").textContent = "";
  $("h3a-f-adresa").value = adresa;
  $("h3a-obalka-adresa").textContent = adresa;
  prepocitej();
}

// Bez měření (výpadek, limit nebo přání zákazníka): plochy zadá sám, model se neukáže.
function rucniZadani({ adresa = "", fokus = false } = {}) {
  stav.rucne = true;
  if (!stav.mereni) {
    stav.mereni = { stav: "rucne", adresa, obec: obecZAdresy(adresa), poloha: null, plochy: {}, obrys: null, licence: [] };
    odkryjKroky();
    $("h3a-model").hidden = true;
    $("h3a-predpo-obal").hidden = true;
    if (adresa) { $("h3a-f-adresa").value ||= adresa; }
    nactiPlan(stav.mereni.obec);
    prepocitej();
  }
  if (fokus) { $("h3a-vysledek").scrollIntoView({ behavior: plynule() }); $("h3a-plocha-strecha").focus({ preventScroll: true }); }
}

function odkryjKroky() {
  for (const id of ["h3a-vysledek", "h3a-cesta", "h3a-termin"]) $(id).hidden = false;
}

// ---------------------------------------------------------------- krok 2: plochy a model
function zobrazMereni(m, { posun = true } = {}) {
  stav.mereni = m;
  stav.rucne = false;
  odkryjKroky();
  const p = m.plochy;
  $("h3a-plocha-strecha").value = p.strecha ?? "";
  $("h3a-plocha-fasada").value = p.fasada ?? "";
  $("h3a-chce-strecha").checked = !!p.strecha;
  $("h3a-chce-fasada").checked = !!p.fasada;
  const pud = $("h3a-pudorys");
  pud.hidden = !p.pudorys;
  if (p.pudorys) pud.textContent = typo(`Zastavěná plocha: odhad ${String(p.pudorys).replace(".", ",")} m² (jen pro představu, do ceny se nepočítá).`);
  const lic = $("h3a-licence");
  lic.hidden = !m.licence.length;
  lic.textContent = m.licence.join(" · ");
  $("h3a-vysledek-adresa").textContent = typo(m.ukazka
    ? "Ukázka se smyšleným domem – plochy i obrys jsou vymyšlené pro předvedení."
    : `${m.adresa}. Obrys a plochy z měření na dálku jsou odhad – přesně je změříme na místě. Pokud některou plochu znáte přesněji, upravte ji.`);
  $("h3a-model").hidden = !m.obrys;
  $("h3a-predpo-obal").hidden = !m.obrys;
  if (m.obrys) kresliObrysSvg(m.obrys);
  if (!m.ukazka) {
    $("h3a-f-adresa").value = m.adresa;
  }
  $("h3a-obalka-adresa").textContent = m.ukazka ? "Ukázkový dům" : m.adresa;
  if (m.obrys) pripravModel(m.obrys);
  nactiPlan(m.obec, m.kodObce);
  prepocitej();
  if (posun) {
    $("h3a-vysledek").scrollIntoView({ behavior: plynule() });
    const h = $("h3a-h-vysledek");
    h.tabIndex = -1;
    h.focus({ preventScroll: true });
  }
}

// Záložní 2D obrys (bez WebGL, při omezení pohybu i během načítání 3D).
function kresliObrysSvg(body) {
  const svg = $("h3a-model-svg");
  const xs = body.map((b) => b[0]), ys = body.map((b) => b[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const k = Math.min(180 / (maxX - minX || 1), 130 / (maxY - minY || 1));
  const bod = ([x, y]) => `${(100 + (x - (minX + maxX) / 2) * k).toFixed(1)},${(75 - (y - (minY + maxY) / 2) * k).toFixed(1)}`;
  const ns = "http://www.w3.org/2000/svg";
  svg.textContent = "";
  const poly = document.createElementNS(ns, "polygon");
  poly.setAttribute("points", body.map(bod).join(" "));
  poly.setAttribute("fill", "rgba(212,175,55,.08)");
  poly.setAttribute("stroke", "#d4af37");
  poly.setAttribute("stroke-width", "1.4");
  poly.setAttribute("stroke-linejoin", "round");
  poly.id = "h3a-obrys-svg";
  svg.append(poly);
}

function pripravModel(obrys) {
  const host = $("h3a-model");
  const nastav = () => {
    stav.model?.nastavObrys(obrys);
    aktualizujModel();
    if (!pohybDolu.matches) { host.classList.add("je-sken"); setTimeout(() => host.classList.remove("je-sken"), 2400); }
    stav.zvuk?.sken();
    stav.model?.sken();
  };
  if (stav.model) return nastav();
  if (!podporaWebGL()) { host.dataset.model = "2d"; return aktualizujModel(); }
  stav.modelSlib ||= import("./holub360-scena.js")
    .then((m) => m.vytvorModel(host, { obrys, staticky: pohybDolu.matches, mobil: MOBIL }))
    .then((model) => { stav.model = model; host.classList.add("je-3d"); host.dataset.model = "3d"; })
    .catch(() => { host.dataset.model = "2d"; });
  stav.modelSlib.then(nastav);
}

function aktualizujModel() {
  const host = $("h3a-model");
  const barva = (povrch) => (stav.cesta === "B" && stav.barvy[povrch]?.hex) || "";
  host.dataset.cesta = stav.cesta;
  host.dataset.barvaStrecha = barva("strecha");
  host.dataset.barvaFasada = barva("fasada");
  host.dataset.predpo = $("h3a-predpo").value;
  const poly = $("h3a-obrys-svg");
  if (poly) poly.setAttribute("fill", barva("strecha") ? `${barva("strecha")}cc` : "rgba(212,175,55,.08)");
  stav.model?.nastavCestu(stav.cesta);
  stav.model?.nastavBarvy({ strecha: barva("strecha") || null, fasada: barva("fasada") || null });
}

function nastavPlochy() {
  for (const p of POVRCHY) {
    const v = $("h3a-plocha-" + p), ch = $("h3a-chce-" + p);
    v.addEventListener("input", () => { if (cislo(v.value) > 0) ch.checked = true; prepocitej(); });
    ch.addEventListener("change", prepocitej);
  }
  $("h3a-predpo").addEventListener("input", (e) => {
    const h = Number(e.target.value) / 100;
    stav.model?.predPo(h);
    $("h3a-model").dataset.predpo = e.target.value;
  });
}

// ---------------------------------------------------------------- krok 3: cesta, typ objektu, odstín
function nastavCesty() {
  const J = stav.jadro, pole = $("h3a-cesty");
  const cesty = J?.standard?.cesty || {};
  for (const id of ["A", "B"]) {
    const c = cesty[id];
    if (!c) continue;
    const vstup = el("input");
    vstup.type = "radio"; vstup.name = "h3a-cesta"; vstup.value = id; vstup.checked = id === stav.cesta;
    vstup.addEventListener("change", () => { zazitek("tuk", "tuk"); stav.cesta = id; zobrazBarvy(); aktualizujModel(); prepocitej(); });
    const sazby = cenyPotvrzene()
      ? POVRCHY.map((p) => { const x = J.cestyPro(p).find((k) => k.id === id); return x ? `${NAZEV_POVRCHU[p]} ${x.sazba} Kč/m²` : null; }).filter(Boolean).join(" · ")
      : "";
    pole.append(el("label", "h3a-cesta", vstup,
      el("span", "h3a-cesta-pismeno", `Cesta ${id}`),
      el("span", "h3a-cesta-nazev", typo(c.nazev)),
      el("span", "h3a-cesta-popis", typo(c.popis)),
      sazby ? el("span", "h3a-cesta-sazby", typo(sazby)) : null));
  }
  const typ = $("h3a-typ");
  for (const [k, v] of Object.entries(stav.C?.TYPY_OBJEKTU || { rd: "Rodinný dům" })) {
    const o = el("option", "", v);
    o.value = k;
    typ.append(o);
  }
  typ.value = stav.typObjektu;
  typ.addEventListener("change", () => { stav.typObjektu = typ.value; prepocitej(); });
  $("h3a-med").addEventListener("input", (e) => { const n = cislo(e.target.value); stav.med = n > 0 ? Math.min(200, n) : 0; prepocitej(); });
  for (const povrch of ["strecha", "fasada"]) {
    const vzornik = $("h3a-barvy-" + povrch).querySelector(".h3a-vzornik");
    for (const b of J?.barvy(povrch) || []) {
      const v = el("input");
      v.type = "radio"; v.name = "h3a-ral-" + povrch; v.value = b.ral;
      v.addEventListener("change", () => { zazitek("tuk", "tuk"); stav.barvy[povrch] = b; aktualizujModel(); prepocitej(); });
      const kruh = el("i");
      kruh.style.setProperty("background", b.hex);
      vzornik.append(el("label", "h3a-vzorek", v, kruh, el("span", "", b.ral.replace("RAL ", `RAL${NB}`)), sr(` ${b.nazev}`)));
    }
  }
  $("h3a-vlastni").addEventListener("input", (e) => { stav.vlastni = e.target.value.trim().slice(0, 40); prepocitej(); });
  zobrazBarvy();
}
function zobrazBarvy() {
  $("h3a-barvy-obal").hidden = stav.cesta !== "B";
}
function barvaPro(povrch) {
  if (stav.barvy[povrch]) return { ral: stav.barvy[povrch].ral, nazev: stav.barvy[povrch].nazev, hex: stav.barvy[povrch].hex };
  if (stav.vlastni) return { ral: stav.vlastni, nazev: "", hex: null };
  return null;
}

// ---------------------------------------------------------------- výpočet a obálka
function vstupCeny() {
  const J = stav.jadro, polozky = [];
  for (const povrch of POVRCHY) {
    if (!$("h3a-chce-" + povrch).checked) continue;
    const pl = cislo($("h3a-plocha-" + povrch).value);
    if (!(pl > 0)) continue;
    const mozne = J.cestyPro(povrch).map((c) => c.id);
    const cesta = mozne.includes(stav.cesta) ? stav.cesta : mozne[0] || "A";
    const p = { povrch, cesta, plocha: pl };
    if (cesta === "B") { const b = barvaPro(povrch); if (b) p.barva = b; }
    if (povrch === "strecha" && stav.med > 0) p.med = stav.med;
    polozky.push(p);
  }
  const poloha = stav.mereni?.poloha;
  return { polozky, typObjektu: stav.typObjektu, ...(poloha ? { lat: poloha.lat, lon: poloha.lon } : {}) };
}

function prepocitej() {
  const sekce = $("h3a-obalka"), stavEl = $("h3a-cesta-stav");
  const dlazbaB = stav.cesta === "B" && $("h3a-chce-dlazba").checked && cislo($("h3a-plocha-dlazba").value) > 0;
  if (!stav.jadro) { sekce.hidden = false; vykresliNabidku(null); return; }
  const vstup = vstupCeny();
  if (!vstup.polozky.length) {
    stav.nabidka = null;
    info(stavEl, "Vyberte aspoň jednu plochu a zadejte její velikost.", "chyba");
    sekce.hidden = true;
    aktualizujFormular();
    return;
  }
  try {
    stav.nabidka = stav.jadro.spocitej(vstup);
    stav.nabidka.vstup = vstup;
  } catch (e) {
    stav.nabidka = null;
    info(stavEl, typo(e.message), "chyba");
    sekce.hidden = true;
    return;
  }
  info(stavEl, dlazbaB ? typo("Dlažbu ošetřujeme jen cestou A – v kalkulaci je proto s Neviditelným štítem.") : "");
  sekce.hidden = false;
  vykresliNabidku(stav.nabidka);
  aktualizujFormular();
}

function nastavObalku() {
  const b = $("h3a-pecet"), papir = $("h3a-obalka-papir");
  b.addEventListener("click", () => {
    if (stav.otevreno) return;
    stav.otevreno = true;
    b.setAttribute("aria-expanded", "true");
    papir.classList.add("je-otevrena");
    stav.zvuk?.pecet();
    zazitek("pecet", "pecet"); // vibrace jen přes přepínač „Zvuk a vibrace“
    const ukaz = () => {
      document.querySelector(".h3a-obalka-scena").hidden = true;
      zazitek("cena", "cena");
      const cert = $("h3a-certifikat");
      cert.hidden = false;
      cert.classList.add("je-novy");
      cert.focus({ preventScroll: true });
      cert.scrollIntoView({ behavior: plynule(), block: "start" });
    };
    if (pohybDolu.matches) ukaz(); else setTimeout(ukaz, 950);
  });
}

function radek(nazev, detail, mnozstvi, castka, cls) {
  const tr = el("tr", cls || "");
  tr.append(el("td", "", el("span", "", typo(nazev)), detail ? el("small", "", typo(detail)) : null), el("td", "h3a-mnozstvi", mnozstvi || ""), el("td", "", castka));
  return tr;
}

function vykresliNabidku(n) {
  const cert = $("h3a-certifikat");
  cert.textContent = "";
  const J = stav.jadro, potvrzeno = !!(n && n.potvrzeno);
  const dnes = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" }).format(new Date());
  const adresa = stav.mereni?.ukazka ? "Ukázkový dům (smyšlený)" : stav.mereni?.adresa || $("h3a-f-adresa").value || "";
  const meta = el("div", "h3a-cert-meta",
    adresa ? el("p", "", typo(adresa)) : null,
    el("p", "", typo(`Vystaveno ${dnes}`)),
    potvrzeno ? el("p", "", typo(`Ceník platný od ${datumIso(n.platnostCeniku, { day: "numeric", month: "numeric", year: "numeric" })}`)) : null);
  const nadpis = el("h3", "", `Orientační kalkulace HOLUB${NB}360`);
  nadpis.id = "h3a-cert-nadpis";
  cert.append(el("div", "h3a-cert-hlava", el("div", "", el("p", "apex-stitek", stav.mereni?.ukazka ? "UKÁZKA" : "Osobní kalkulace"), nadpis), meta));

  if (!potvrzeno) {
    // Bez potvrzeného ceníku (nebo bez jádra) žádná částka v Kč – jen postup a slib nabídky.
    cert.append(el("div", "h3a-cena",
      el("span", "h3a-cena-stitek", "Cena"),
      el("span", "h3a-cena-castka h3a-cena-castka--text", typo("Cenu vám pošleme do 24 hodin")),
      el("span", "h3a-cena-veta", typo("Ceník pro okamžitou cenu právě ověřujeme. Přesnou cenu vám pošleme e-mailem nebo zavoláme."))));
    if (n) cert.append(blokPostupu(n));
    cert.append(el("div", "h3a-cert-akce", tlacitkoTermin()));
    $("h3a-pecet").setAttribute("aria-label", "Rozlomit pečeť a zobrazit kalkulaci");
    return;
  }

  const castka = el("span", "h3a-cena-castka apex-zlaty-text", kc(n.vysledna));
  castka.id = "h3a-cena";
  castka.dataset.kc = String(n.vysledna);
  cert.append(el("div", "h3a-cena",
    el("span", "h3a-cena-stitek", "Orientační cena · jednorázově"),
    castka,
    el("span", "h3a-cena-veta", typo("Orientační výpočet, ne nabídka. Přesnou cenu potvrdíme po ověření rozsahu na místě. Nejsme plátci DPH, DPH se nepřipočítává."))));

  const tab = el("table", "h3a-radky");
  tab.id = "h3a-radky";
  tab.append(el("caption", "h3a-sr", "Položky kalkulace"));
  const hl = el("tr");
  for (const t of ["Položka", "Množství", "Částka"]) { const th = el("th", "", t); th.scope = "col"; hl.append(th); }
  tab.append(el("thead", "", hl));
  const telo = el("tbody");
  for (const r of n.radky) {
    const mn = r.jednotka === "m²" ? `${m2(r.mnozstvi)}${r.sazba ? typo(` × ${r.sazba} Kč`) : ""}` : typo(`${r.mnozstvi} ${r.jednotka}`);
    telo.append(radek(r.nazev, r.detail, mn, kc(r.castka), "h3a-radek"));
  }
  if (n.sleva) telo.append(radek(n.sleva.nazev, `${Math.round(n.sleva.sazba * 100)} %`, "", `−${NB}${kc(n.sleva.castka)}`));
  telo.append(radek("Doprava", n.doprava.text, "", n.doprava.znamo ? kc(n.doprava.cena) : "upřesníme"));
  if (n.minimumPouzito) telo.append(radek("Doplatek do minimální ceny zakázky", `minimum ${stav.C.kc(n.minimum)} podle ceníku`, "", kc(n.minimum - n.predMinimem)));
  if (Math.abs(n.zaokrouhleni) >= 1) telo.append(radek("Zaokrouhlení na desítky", "", "", `${n.zaokrouhleni > 0 ? "+" : "−"}${NB}${kc(Math.abs(n.zaokrouhleni))}`));
  tab.append(telo);
  const soucet = el("tr");
  soucet.append(el("td", "", "Celkem (orientačně)"), el("td", "h3a-mnozstvi", typo(`${m2(n.plochaCelkem)} celkem`)), el("td", "", kc(n.vysledna)));
  tab.append(el("tfoot", "", soucet));
  cert.append(tab);

  const platba = el("div", "h3a-cert-blok", el("h4", "", "Platba"), el("p", "", typo(n.platba.text)));
  if (n.skipPay) platba.append(el("p", "", typo(`${n.skipPay.text} Orientačně ${n.skipPay.splatek} × ${stav.C.kc(n.skipPay.splatka)}.`)));
  const mrizka = el("div", "h3a-cert-mrizka", platba, blokPostupu(n));
  cert.append(mrizka);

  const tarify = J.tarify();
  if (tarify.length) {
    const t = el("div", "h3a-tarify");
    for (const x of tarify) {
      t.append(el("div", "h3a-tarif" + (x.povinny_pro_zaruku ? " je-zakladni" : ""),
        el("h5", "", x.nazev),
        el("p", "h3a-tarif-cena", typo(`${stav.C.kc(x.cena_rok)} ročně`)),
        x.povinny_pro_zaruku ? el("span", "h3a-tarif-zaruka", "drží záruku") : null,
        el("ul", "", ...(x.body || []).map((b) => el("li", "", typo(b)))))) ;
    }
    cert.append(el("div", "h3a-cert-blok", el("h4", "", "Péče SENTINEL"), t));
  }
  const zaruka = J.podminkaZaruky();
  if (zaruka) { const z = el("p", "h3a-zaruka", typo(`${zaruka} Zákonná práva z vadného plnění tím nejsou dotčena.`)); z.id = "h3a-zaruka"; cert.append(z); }
  if (n.biocidy) { const b = el("p", "h3a-biocidy", typo(n.biocidy)); b.id = "h3a-biocidy"; cert.append(b); }
  const tisk = el("button", "apex-tlacitko apex-tlacitko--duch", "Vytisknout nebo uložit PDF");
  tisk.type = "button";
  tisk.addEventListener("click", () => print());
  cert.append(el("div", "h3a-cert-akce", tlacitkoTermin(), tisk));
  $("h3a-pecet").setAttribute("aria-label", typo(`Rozlomit pečeť a zobrazit orientační cenu (${stav.C.kc(n.vysledna)})`));
}

function blokPostupu(n) {
  const kroky = el("ol", "h3a-kroky");
  for (const k of n.kroky || []) kroky.append(el("li", "", el("b", "", k.cislo), el("span", "", el("strong", "", typo(k.nazev)), ` – ${typo(k.popis)}`)));
  const blok = el("div", "h3a-cert-blok", el("h4", "", "Standard HOLUB"), kroky);
  for (const c of n.cesty || []) blok.append(el("p", "", el("strong", "", typo(`Cesta ${c.id} – ${c.nazev}: `)), typo(c.popis)));
  if (n.biocidy && !n.potvrzeno) blok.append(el("p", "h3a-biocidy", typo(n.biocidy)));
  return blok;
}
function tlacitkoTermin() {
  const a = el("a", "apex-tlacitko", "Vybrat termín");
  a.href = "#h3a-termin";
  return a;
}

// ---------------------------------------------------------------- krok 5: kalendář
async function nactiPlan(obec, kodObce, okres) {
  const u = new URLSearchParams();
  if (obec?.obec) u.set("obec", obec.obec.slice(0, 80));
  if (okres || obec?.okres) u.set("okres", (okres || obec.okres).slice(0, 80));
  if (kodObce) u.set("kod", String(kodObce).replace(/\D/g, "").slice(0, 9));
  const klic = u.toString();
  if (klic === stav.planKlic && stav.plan) return;
  stav.planKlic = klic;
  const infoEl = $("h3a-kal-info");
  hlas(infoEl, "nacitam");
  let r = null;
  try { r = await ziskej(API_PLAN + (klic ? "?" + klic : ""), { limit: 12000 }); } catch { r = null; }
  if (stav.planKlic !== klic) return;
  if (!r?.ok || !Array.isArray(r.j?.dny)) { stav.plan = null; stav.planKlic = null; return hlas(infoEl, "chyba", "chyba"); }
  stav.plan = r.j;
  info(infoEl, "");
  if (r.j.kalendar === false) hlas(infoEl, "bezKalendare");
  const okresy = $("h3a-okresy");
  okresy.textContent = ""; okresy.hidden = true;
  if (r.j.nejednoznacne?.length) {
    hlas(infoEl, "okres");
    for (const o of r.j.nejednoznacne.slice(0, 12)) {
      const b = el("button", "h3a-tl-mini", `${o.obec}${o.castObce ? ` (${o.castObce})` : ""} – okres ${o.okres}`);
      b.type = "button";
      b.addEventListener("click", () => nactiPlan({ obec: o.obec, okres: o.okres }, o.kod));
      okresy.append(b);
    }
    okresy.hidden = false;
  }
  vykresliKalendar();
}

function stavDne(d, okno) {
  if (!d.pracovni) return { trida: "zavreno", text: "zavřeno", lze: false };
  if (d.volno === false) return { trida: "obsazeno", text: "obsazeno", lze: false };
  if (okno && d.okno?.nevhodne === true) return { trida: "nevhodny", text: "nevhodný", lze: false };
  if (d.volno === null) return { trida: "potvrdime", text: "potvrdíme", lze: true };
  return { trida: "volno", text: "volno", lze: true };
}

function vykresliKalendar(fokus) {
  const j = stav.plan, seznam = $("h3a-kal");
  if (!j) return;
  seznam.textContent = "";
  const okno = j.technologickeOkno || null;
  j.dny.forEach((d, i) => {
    const s = stavDne(d, okno), p = d.pocasi, w = new Date(`${d.datum}T12:00:00Z`).getUTCDay() || 7;
    const b = el("button", `h3a-den h3a-den--${s.trida}${s.trida === "nevhodny" ? " apex-srafa" : ""}`);
    b.type = "button";
    b.dataset.datum = d.datum;
    b.setAttribute("aria-pressed", String(stav.termin === d.datum));
    if (!s.lze) b.setAttribute("aria-disabled", "true");
    if (s.trida === "nevhodny") b.title = typo(okno.text);
    const dlouze = datumIso(d.datum, { weekday: "long", day: "numeric", month: "long" });
    b.append(sr(`${dlouze}, `), el("span", "h3a-den-cislo", datumIso(d.datum, { day: "numeric" })), el("span", "h3a-den-stav", s.text));
    if (s.trida === "nevhodny") b.append(sr(`, ${typo(okno.text)}`));
    if (p) {
      const ikona = el("span", "", p.sucho ? "☀" : "☔");
      ikona.setAttribute("aria-hidden", "true");
      const t = p.tmin != null && p.tmax != null ? el("span", "t", typo(` ${p.tmin}–${p.tmax} °C`)) : null;
      b.append(el("span", "h3a-den-pocasi", ikona, t), sr(p.sucho ? ", bez deště" : typo(`, srážky ${String(p.srazky).replace(".", ",")} mm`)));
      if (p.tmin != null && p.tmax != null) b.append(sr(typo(`, teplota ${p.tmin} až ${p.tmax} °C`)));
    } else if (d.pracovni && !d.okno) {
      b.append(el("span", "h3a-den-pocasi", el("span", "t", "předpověď upřesníme")), sr(", předpověď upřesníme"));
    }
    if (d.okno && d.okno.pravdepodobnostMax != null) b.append(sr(typo(`, pravděpodobnost srážek v pracovní době ${String(d.okno.pravdepodobnostMax).replace(".", ",")} %`)));
    b.addEventListener("click", () => vyberDen(d, s, okno));
    const li = el("li", "", b);
    if (!i && w > 1) li.style.setProperty("grid-column-start", String(w));
    seznam.append(li);
  });
  if (fokus) seznam.querySelector(`[data-datum="${fokus}"]`)?.focus();
  const zdroj = $("h3a-kal-zdroj"), z = j.zdrojPocasi;
  zdroj.textContent = "";
  zdroj.hidden = !z;
  if (z) {
    // Uvedení zdroje podle CC BY 4.0 (text z /api/planovac, odkazy na MET Norway a licenci).
    for (const c of String(z.text || "").split(/(MET Norway|https:\/\/\S+\/)/)) {
      const h = c === "MET Norway" ? z.odkaz : c === z.licence ? c : null;
      if (!h || !/^https:\/\//.test(h)) { zdroj.append(c); continue; }
      const a = el("a", "", c);
      a.href = h; a.rel = "noopener"; a.target = "_blank";
      zdroj.append(a);
    }
    if (z.aktualizovano) zdroj.append(typo(` Aktualizováno ${new Date(z.aktualizovano).toLocaleString("cs-CZ", { timeZone: "Europe/Prague", day: "numeric", month: "numeric", hour: "numeric", minute: "2-digit" })}.`));
  }
  const vyber = $("h3a-kal-vyber");
  vyber.textContent = stav.termin ? typo(`Vybraný termín: ${datumIso(stav.termin, { weekday: "long", day: "numeric", month: "long" })}`) : "";
}

function vyberDen(d, s, okno) {
  const infoEl = $("h3a-kal-info");
  if (!s.lze) {
    zazitek("chyba", "chyba");
    if (s.trida === "nevhodny") info(infoEl, typo(`${okno.text} – vyberte prosím jiný den.`), "chyba");
    else hlas(infoEl, "obsazeno", "chyba");
    return;
  }
  zazitek("tuk", "tuk");
  info(infoEl, "");
  stav.termin = stav.termin === d.datum ? "" : d.datum;
  $("h3a-f-termin").value = stav.termin;
  vykresliKalendar(d.datum);
  aktualizujFormular();
}

// ---------------------------------------------------------------- krok 6: rezervace
function aktualizujFormular() {
  const n = stav.nabidka, vstup = n?.vstup;
  const povrchy = vstup?.polozky.map((p) => p.povrch) || [];
  $("h3a-f-sluzba").value = povrchy.length ? SLUZBA[vstup.polozky.some((p) => p.cesta === "B") ? "B" : "A"] : "Poradíte mi";
  $("h3a-f-typ").value = povrchy.length === 1 ? TYP_POVRCHU[povrchy[0]] : povrchy.length ? "Kombinace / nevím" : "";
  const obec = stav.mereni?.obec || obecZAdresy($("h3a-f-adresa").value);
  $("h3a-f-obec").value = obec?.obec || "";
  const odkaz = $("h3a-do-planovace");
  odkaz.href = "/planovac/" + (obec?.obec ? "?obec=" + encodeURIComponent(obec.obec) : "");
  const shrnuti = $("h3a-shrnuti");
  const text = shrnutiText();
  shrnuti.hidden = !text;
  shrnuti.textContent = text;
}

function shrnutiText() {
  const n = stav.nabidka;
  if (!n) return "";
  const casti = [];
  if (n.potvrzeno) casti.push(`Orientační cena ${stav.C.kc(n.vysledna)}`);
  const cesty = [...new Set(n.vstup.polozky.map((p) => p.cesta))].map((c) => `Cesta ${c} – ${stav.jadro.standard.cesty[c]?.nazev || c}`);
  casti.push(cesty.join(", "));
  casti.push(n.vstup.polozky.map((p) => `${NAZEV_POVRCHU[p.povrch]} ${String(p.plocha).replace(".", ",")} m²${p.barva ? ` (${p.barva.ral}${p.barva.nazev ? " " + p.barva.nazev : ""})` : ""}`).join(", "));
  if (stav.med > 0) casti.push(`měděný prvek ${stav.med} m`);
  casti.push(n.typObjektuNazev);
  if (stav.termin) casti.push(`termín ${datumIso(stav.termin, { day: "numeric", month: "numeric", year: "numeric" })}`);
  return typo(`HOLUB 360: ${casti.filter(Boolean).join(" · ")}`);
}

function nastavFormular() {
  const form = $("h3a-form"), btn = $("h3a-odeslat"), stavEl = $("h3a-form-stav");
  $("h3a-f-adresa").addEventListener("change", () => {
    aktualizujFormular();
    if (!stav.mereni || stav.rucne) { const o = obecZAdresy($("h3a-f-adresa").value); if (o) { $("h3a-termin").hidden = false; nactiPlan(o); } }
  });
  $("h3a-f-termin").addEventListener("change", (e) => { stav.termin = e.target.value; vykresliKalendar(); aktualizujFormular(); });
  let odeslano = false;
  form.addEventListener("submit", async (e) => {
    if (UKAZKA) { e.preventDefault(); return hlas(stavEl, "ukazka", "chyba"); }
    if (odeslano || !form.checkValidity()) return;
    e.preventDefault();
    odeslano = true;
    aktualizujFormular();
    const data = new FormData(form);
    const souhrn = shrnutiText();
    if (souhrn) {
      const pozn = String(data.get("Poznámka") || "").trim();
      data.set("Poznámka", ((pozn ? `${pozn}\n\n` : "") + souhrn.replace(/\u00a0/g, " ")).slice(0, 1200));
    }
    const popisek = btn.textContent, ac = new AbortController(), t = setTimeout(() => ac.abort(), 30000);
    btn.disabled = true; btn.textContent = "Odesílám…";
    try {
      const r = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(data).toString(), signal: ac.signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      try { (window.dataLayer ||= []).push({ event: "generate_lead", lead_type: "holub360", service: data.get("Služba") }); } catch { /* nevadí */ }
      location.href = "/planovac/dekujeme/";
    } catch {
      try {
        if (souhrn) $("h3a-f-pozn").value = data.get("Poznámka");
        form.submit();
      } catch {
        odeslano = false; btn.disabled = false; btn.textContent = popisek;
        hlas(stavEl, "chyba", "chyba");
      }
    } finally { clearTimeout(t); }
  });
}

// ---------------------------------------------------------------- start
document.addEventListener("visibilitychange", () => {
  const skryto = document.visibilityState === "hidden";
  for (const x of [stav.scena, stav.model]) x?.[skryto ? "pauza" : "pokracuj"]?.();
});

async function start() {
  document.documentElement.classList.add("h3a-js");
  nastavZazitek();
  nastavZvuk();
  nastavHero();
  stav.jadro = await nactiJadro();
  nastavCesty();
  nastavPlochy();
  nastavObalku();
  nastavFormular();
  nastavAdresu();
  document.body.dataset.h3a = "pripraveno";
}
start();
