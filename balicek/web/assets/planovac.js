/* Plánovač termínu a dárkový kupon: bez inline skriptů (CSP), bez JS fungují stránky jako formulář.
   Volá jen /api/planovac a /api/kupon. */
(() => {
"use strict";
const $ = (id) => document.getElementById(id);
const NB = "\u00a0", DATUM = /^\d{4}-\d{2}-\d{2}$/;
const kazdy = (sel, f) => document.querySelectorAll(sel).forEach(f);
// Typografie: nbsp po jednopísmenné předložce a za číslem.
const PRED = /(^|[\s(„])([vkszaiouVKSZAIOU]) /g;
const typo = (s) => String(s ?? "").replace(PRED, `$1$2${NB}`).replace(PRED, `$1$2${NB}`).replace(/(\d\.?) /g, `$1${NB}`);
const el = (tag, cls, ...obsah) => { const e = document.createElement(tag); if (cls) e.className = cls; e.append(...obsah); return e; };
const sr = (t) => el("span", "sr", t);
const skryte = (t) => { const s = el("span", "", t); s.setAttribute("aria-hidden", "true"); return s; };
const info = (e, t, cls) => { e.textContent = t || ""; e.classList.remove("ok", "chyba"); if (cls) e.classList.add(cls); };
// Hlášky jsou v HTML (data-*).
const hlas = (e, k, cls, obec = "") => info(e, (e.dataset[k] || "").replace("{obec}", obec), cls);
const datum = (iso, o) => typo(new Intl.DateTimeFormat("cs-CZ", { timeZone: "UTC", ...o }).format(new Date(iso + "T12:00:00Z")));
const dlouze = (iso) => datum(iso, { weekday: "long", day: "numeric", month: "long" });
const datumCz = (iso) => datum(iso, { day: "numeric", month: "numeric", year: "numeric" });

async function ziskej(url, signal, limit = 10000) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), limit);
  signal?.addEventListener("abort", () => ac.abort());
  try {
    const r = await fetch(url, { signal: ac.signal });
    return { ok: r.ok, status: r.status, j: await r.json().catch(() => null) };
  } finally { clearTimeout(t); }
}

// Jako normalizujKod na serveru.
function normKod(v) {
  let s = String(v || "").toUpperCase().replace(/[\s\-_.]/g, "");
  if (s.startsWith("HS")) s = s.slice(2);
  s = s.replace(/O/g, "0").replace(/[IL]/g, "1");
  return /^[0-9A-HJKMNP-TV-Z]{8}$/.test(s) ? `HS-${s.slice(0, 4)}-${s.slice(4)}` : null;
}

// Každý kód nejvýš 1 ověření za návštěvu (limit 20/h).
const kupony = {};
const overKupon = (kod) => (kupony[kod] ||= ziskej("/api/kupon?kod=" + encodeURIComponent(kod)).then(({ status, j }) => {
  if (status === 429) return { stav: "limit", text: j?.chyba || "Příliš mnoho pokusů." };
  if (typeof j?.platny === "boolean") return j.platny ? { stav: "ok", k: j } : { stav: "neplatny", text: j.zprava || "Kupon neplatí." };
  throw new Error("kupon");
}).catch(() => ({ stav: "chyba", text: "Kupon teď nejde ověřit." })).then((v) => { if (!v.k && v.stav !== "neplatny") delete kupony[kod]; return v; }));

// Nabídky z content/planovac.json (HTML je záloha).
function nabidky(j) {
  const nastav = (n, t) => { if (t != null) kazdy(`[data-n="${n}"]`, (e) => { e.textContent = typo(t); }); };
  for (const k of ["sleva", "kupon"]) {
    const o = j?.[k];
    if (!o) continue;
    for (const x of ["kratce", "nazev", "nabidka"]) nastav(`${k}-${x}`, o[x]);
    nastav("procent", o.procent);
    if (o.podminky?.length) kazdy(`[data-n="${k}-podminky"]`, (ul) => {
      ul.textContent = "";
      for (const t of o.podminky) {
        const li = el("li", "", typo(String(t).replace(/\s*\[DOPLNIT[^\]]*\]/g, "")));
        if (/\[DOPLNIT/.test(t)) li.append(" ", el("span", "pl-upr", `(upřesníme v${NB}nabídce)`));
        ul.append(li);
      }
    });
    kazdy(`[data-n="${k}-pozn"]`, (e) => { e.hidden = o.potvrzeno === true; });
  }
}

const misto = (m) => m.obec + (m.castObce ? ` (${m.castObce})` : m.okres !== m.obec ? ` (okres ${m.okres})` : "");
const popis = (m) => (m.castObce ? `část obce ${m.castObce}, ` : "") + `okres ${m.okres}`;

// /kupon/ má vlastní kód, jinak plánovač.
if ($("kupon-karta")) return kuponStranka();
const form = $("rezervace");
if (!form) return;
const obec = $("obec"), navrhy = $("obec-navrhy"), okresy = $("obec-okresy"), okresyTl = okresy.querySelector("div");
const obecInfo = $("obec-info"), kal = $("kalendar"), dnyEl = $("kal-dny"), stav = $("kal-stav"), zdroj = $("kal-zdroj"), kalInfo = $("kal-info");
const termin = $("termin"), nahradni = $("nahradni"), kupon = $("kupon"), kuponStav = $("kupon-stav"), rezimy = kal.querySelectorAll("[data-rezim]");
const btn = form.querySelector("[type=submit]"), q = new URLSearchParams(location.search), cache = {};
let dny = [], rezim = "termin", posledni, ctrlPlan, ctrlNavrh, casovac, seznam = [], aktivni = -1, vybrana, odeslano, kuponPosledni;

// Našeptávač obcí (ARIA combobox).
const attr = (a, v) => obec.setAttribute(a, v);
attr("role", "combobox"); attr("aria-autocomplete", "list"); attr("aria-controls", "obec-navrhy"); attr("aria-expanded", false);
const zavri = () => { navrhy.hidden = true; navrhy.textContent = ""; seznam = []; aktivni = -1; attr("aria-expanded", false); obec.removeAttribute("aria-activedescendant"); };
const ukaz = (s) => {
  zavri();
  if (!s.length || document.activeElement !== obec) return;
  seznam = s;
  s.forEach((n, i) => {
    const li = el("li", "", n.obec + " ", el("small", "", popis(n)));
    li.id = "obec-n" + i;
    li.setAttribute("role", "option");
      li.onclick = () => zvol(n);
    navrhy.append(li);
  });
  navrhy.hidden = false;
  attr("aria-expanded", true);
  navrhy.scrollIntoView({ block: "nearest" });
};
const zvol = (n) => { obec.value = misto(n); vybrana = n; zavri(); okresy.hidden = true; nactiPlan({ obec: n.obec, kod: n.kod }); };
async function navrhni(t) {
  const k = t.toLowerCase();
  if (cache[k]) return ukaz(cache[k]);
  ctrlNavrh?.abort();
  const c = ctrlNavrh = new AbortController();
  try {
    const r = await ziskej("/api/planovac?navrh=" + encodeURIComponent(t.slice(0, 60)), c.signal);
    const s = Array.isArray(r.j?.navrhy) ? r.j.navrhy : [];
    if (r.ok) cache[k] = s;
    if (ctrlNavrh === c && obec.value.trim() === t) ukaz(s);
  } catch { /* nevadí */ }
}
const potvrdObec = () => {
  const t = obec.value.trim();
  if (!t) nactiPlan({});
  else if (!vybrana && t.length > 1) nactiPlan({ obec: t });
};
navrhy.onmousedown = (e) => e.preventDefault();
obec.addEventListener("input", () => {
  vybrana = null; okresy.hidden = true; clearTimeout(casovac);
  const t = obec.value.trim();
  if (t.length < 2) { ctrlNavrh?.abort(); return zavri(); }
  casovac = setTimeout(() => navrhni(t), 350);
});
obec.addEventListener("keydown", (e) => {
  const n = seznam.length, k = e.key;
  if ((k === "ArrowDown" || k === "ArrowUp") && n) {
    e.preventDefault();
    aktivni = k === "ArrowDown" ? (aktivni + 1) % n : aktivni < 1 ? n - 1 : aktivni - 1;
    [...navrhy.children].forEach((li, i) => li.setAttribute("aria-selected", i === aktivni));
    attr("aria-activedescendant", "obec-n" + aktivni);
  } else if (k === "Enter") {
    e.preventDefault(); // neodesílat formulář
    if (n && (aktivni >= 0 || n === 1)) zvol(seznam[Math.max(0, aktivni)]);
    else { zavri(); potvrdObec(); }
  } else if (k === "Escape" && n) { e.preventDefault(); zavri(); }
});
obec.addEventListener("blur", () => { clearTimeout(casovac); setTimeout(zavri, 150); potvrdObec(); });

const lze = (d) => d.pracovni && d.volno !== false;
function vykresli(fokus) {
  dnyEl.textContent = "";
  dny.forEach((d, i) => {
    const D = d.datum, p = d.pocasi, w = new Date(D).getUTCDay() || 7, b = el("button", "pl-den");
    const vyb = termin.value === D ? "termín" : nahradni.value === D ? "náhradní" : "";
    b.type = "button"; b.dataset.datum = D; b.disabled = !lze(d); b.onclick = () => klik(D);
    b.setAttribute("aria-pressed", !!vyb);
    if (d.volno) b.classList.add("volno");
    if (vyb) b.classList.add(vyb[0] === "t" ? "termin" : "nahradni");
    b.append(el("b", "", sr(dlouze(D)), skryte(datum(D, { weekday: "short", day: "numeric", month: "numeric" }))), sr(", "),
      !d.pracovni || d.volno === false ? el("span", "o", d.pracovni ? "obsazeno" : "nepracujeme")
        : d.volno === null ? el("span", "p", "termín potvrdíme") : el("span", "v", skryte("✓" + NB), "volno"));
    if (p) {
      b.append(sr(", "), el("span", p.sucho ? "" : "dest", ...(p.srazky
        ? [skryte((p.sucho ? "🌤" : "☔") + NB), sr("srážky "), `${String(p.srazky).replace(".", ",")}${NB}mm`]
        : [skryte("☀" + NB), "bez deště"])));
      if (p.tmin != null && p.tmax != null) b.append(sr(", teplota "), el("span", "", `${p.tmin}–${p.tmax}${NB}°C`));
      if (p.vitr != null) b.append(sr(", "), el("span", "", `vítr ${p.vitr}${NB}m/s`));
    }
    if (vyb) b.append(sr(", vybráno: "), el("span", "vyb", vyb));
    dnyEl.append(el("li", !i && w > 1 ? "z" + w : "", b));
  });
  if (fokus) dnyEl.querySelector(`[data-datum="${fokus}"]`)?.focus();
  const t = termin.value, n = nahradni.value, d = dny.find((x) => x.datum === t);
  stav.textContent = DATUM.test(t) ? `Termín: ${dlouze(t)}${DATUM.test(n) ? ` · náhradní termín: ${dlouze(n)}` : ""}` : "";
  if (d && !lze(d)) hlas(kalInfo, "obsazeno", "chyba");
  else if (t && t === n) hlas(kalInfo, "stejny", "chyba");
  else if (kalInfo.classList.contains("chyba") && dny.length) info(kalInfo, "");
}
const nastavRezim = (r) => { rezim = r; rezimy.forEach((b) => b.setAttribute("aria-pressed", b.dataset.rezim === r)); };
rezimy.forEach((b) => { b.onclick = () => nastavRezim(b.dataset.rezim); });
function klik(d) {
  if (termin.value === d) { termin.value = ""; nastavRezim("termin"); }
  else if (nahradni.value === d) nahradni.value = "";
  else if (rezim === "termin" || !termin.value) { termin.value = d; if (!nahradni.value) nastavRezim("nahradni"); }
  else nahradni.value = d;
  vykresli(d);
}
[termin, nahradni].forEach((x) => x.addEventListener("change", () => vykresli()));

function zobraz(j, par) {
  const m = j.misto, z = j.zdrojPocasi;
  nabidky(j);
  dny = j.dny;
  if (j.kalendar === false) hlas(kalInfo, "bezKalendare"); else info(kalInfo, "");
  if (dny[0]) termin.min = nahradni.min = dny[0].datum;
  okresy.hidden = true; okresyTl.textContent = "";
  if (m) info(obecInfo, typo(j.chybaPocasi) || `Předpověď počasí pro: ${m.obec}${m.castObce ? `, část obce ${m.castObce}` : ""} (okres ${m.okres}).`, j.chybaPocasi ? "chyba" : "ok");
  else if (j.nejednoznacne?.length) {
    hlas(obecInfo, "okres");
    for (const o of j.nejednoznacne) {
      const b = el("button", "pl-ok", `${o.obec} – ${popis(o)}`);
      b.type = "button";
      b.onclick = () => { obec.value = misto(o); vybrana = o; obec.focus(); nactiPlan({ obec: o.obec, kod: o.kod }); };
      okresyTl.append(b);
    }
    okresy.hidden = false;
  } else if (j.nenalezeno) hlas(obecInfo, "nenalezeno", "chyba", par.obec);
  else info(obecInfo, "");
  // Uvedení zdroje (CC BY 4.0).
  zdroj.textContent = ""; zdroj.hidden = !z;
  if (z) {
    for (const c of String(z.text || "").split(/(MET Norway|https:\/\/\S+\/)/)) {
      const h = c === "MET Norway" ? z.odkaz : c === z.licence && c;
      if (!/^https:\/\//.test(h)) { zdroj.append(c); continue; }
      const a = el("a", "", c);
      a.href = h; a.rel = "noopener"; a.target = "_blank";
      zdroj.append(a);
    }
    zdroj.append(` Aktualizováno ${typo(new Date(z.aktualizovano).toLocaleString("cs-CZ", { timeZone: "Europe/Prague", day: "numeric", month: "numeric", hour: "numeric", minute: "2-digit" }))}. ${z.obce || ""}`);
  }
  kal.hidden = !dny.length;
  vykresli();
}
async function nactiPlan(par) {
  const u = new URLSearchParams();
  if (par.obec) u.set("obec", par.obec.slice(0, 120));
  if (par.kod) u.set("kod", par.kod);
  const klic = u.toString();
  if (klic === posledni) return;
  posledni = klic;
  ctrlPlan?.abort();
  const c = ctrlPlan = new AbortController();
  if (par.obec) hlas(obecInfo, "nacitam");
  const r = await ziskej("/api/planovac" + (klic && "?" + klic), c.signal).catch(() => null);
  if (ctrlPlan !== c) return;
  if (r?.ok && Array.isArray(r.j?.dny)) return zobraz(r.j, par);
  posledni = null; info(obecInfo, ""); kal.hidden = !dny.length;
  hlas(kalInfo, "chyba", "chyba");
}

// Kupon: ověřit jen při změně pole, nikdy neblokovat odeslání.
async function zkontrolujKupon() {
  const v = kupon.value.trim(), kod = normKod(v);
  if (!kod) { kuponPosledni = ""; return v ? hlas(kuponStav, "tvar", "chyba") : info(kuponStav, ""); }
  kupon.value = kod;
  if (kod === kuponPosledni) return;
  kuponPosledni = kod;
  info(kuponStav, "Ověřuji…");
  const x = await overKupon(kod);
  if (normKod(kupon.value) !== kod) return;
  if (x.k) return info(kuponStav, `✓ Kupon platí: ${typo(x.k.nabidka)} · platnost do ${datumCz(x.k.platnostDo)}.`, "ok");
  if (x.stav !== "neplatny") kuponPosledni = "";
  info(kuponStav, x.text + (kuponStav.dataset.iTak || ""), "chyba");
}
kupon.addEventListener("change", zkontrolujKupon);

// Odeslání: fetch (30 s), při chybě klasické odeslání.
form.addEventListener("submit", async (e) => {
  if (odeslano || !form.checkValidity()) return;
  e.preventDefault();
  odeslano = true;
  const popisek = btn.textContent, ac = new AbortController(), t = setTimeout(() => ac.abort(), 30000);
  btn.disabled = true; btn.textContent = "Odesílám…";
  try {
    const r = await fetch("/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(new FormData(form)).toString(), signal: ac.signal });
    if (!r.ok) throw new Error("HTTP " + r.status);
    try { (window.dataLayer ||= []).push({ event: "generate_lead", lead_type: "rezervace", service: $("sluzba").value }); } catch { /* nevadí */ }
    location.href = "/planovac/dekujeme/";
  } catch {
    try { form.submit(); } catch {
      odeslano = btn.disabled = false; btn.textContent = popisek;
      hlas($("odeslani-chyba"), "text");
    }
  } finally { clearTimeout(t); }
});

// Předvyplnění ?kupon= a ?obec=.
const pk = (q.get("kupon") || q.get("k") || "").trim(), po = (q.get("obec") || "").trim().slice(0, 80);
if (pk) { kupon.value = pk.slice(0, 20); zkontrolujKupon(); }
obec.value ||= po;
potvrdObec(); // i obec obnovenou prohlížečem

async function kuponStranka() {
  const st = $("kupon-stav"), tisk = $("kupon-tisk"), k = (new URLSearchParams(location.search).get("k") || "").trim().slice(0, 20), kod = normKod(k);
  tisk.onclick = () => print();
  addEventListener("beforeprint", () => kazdy("#kupon-karta details", (d) => { d.open = true; }));
  ziskej("/api/planovac").then((r) => r.ok && nabidky(r.j), () => {});
  if (!k) return;
  $("kupon-box").hidden = false;
  $("kupon-kod").textContent = $("kupon-vstup").value = kod || k;
  if (!kod) return hlas(st, "tvar", "chyba");
  info(st, "Ověřuji…");
  const x = await overKupon(kod);
  info(st, x.k ? `✓ Kupon je platný do ${datumCz(x.k.platnostDo)}.` : x.text, x.k ? "ok" : "chyba");
  tisk.hidden = !x.k;
  // Neplatný kód nepředávat; při výpadku ověření ano (ověří majitel).
  if (x.stav !== "neplatny") $("kupon-cta").href = "/planovac/?kupon=" + encodeURIComponent(kod);
}

})();
