/* HOLUB 360 · hejno při měření na dálku (úkol 56; přání majitele 22. 10. 2026: „více holubů, každý dělá jiný úkol –
 * měří, počítají, ověřují, komunikují“).
 *
 * Čtyři origami holubi, každý má svou práci. Rozsvěcují se jen podle skutečného průběhu v holub360-apex.js – nic se
 * uměle nezdržuje a výsledek se ukáže hned:
 *   meri       – požadavek na měření běží (holub obkresluje obrys domu se střechou),
 *   pocita     – z odpovědi se počítají plochy (normalizujMereni),
 *   overuje    – kontrola výběru budovy a údajů (stav „vyber“ / „neni-budova“, chybějící plochy),
 *   komunikuje – výsledek se oznámí zákazníkovi (stavový řádek, krok 02).
 * Stavový řádek (role=status, aria-live=polite, je ve stránce od začátku) říká totéž textem. Při omezení pohybu je to
 * statický seznam s fajfkami. Holuby kreslí zavaděč H-BOTa (window.HSPG_HBOT_ZAVADEC.holub, vlastní 3D projekce do
 * canvasu); bez něj plochý SVG holub. Chyba měření hejno vrátí do klidu (zrus()).
 */
const KROKY = [
  { id: "meri", nazev: "Měří", prace: "obrys domu", text: "Měří – obkresluje obrys domu na dálku…" },
  { id: "pocita", nazev: "Počítá", prace: "plochy z obrysu", text: "Počítá – plochy z obrysu." },
  { id: "overuje", nazev: "Ověřuje", prace: "budovu a údaje", text: "Ověřuje – budovu a údaje." },
  { id: "komunikuje", nazev: "Komunikuje", prace: "výsledek pro vás", text: "Komunikuje – výsledek máte níže." },
];
const STAV_TEXT = { ceka: "čeká", bezi: "pracuje", hotovo: "hotovo" };
// Póza každého holuba (pohled kamery) – ať je vidět, že každý dělá něco jiného.
const POZY = { meri: { yaw: -1.25, pitch: 0.2 }, pocita: { yaw: -0.42, pitch: 0.55 }, overuje: { yaw: 0.62, pitch: 0.3 }, komunikuje: { yaw: -0.2, pitch: 0.12, stoupani: 0.06 } };
const NS = "http://www.w3.org/2000/svg";
const SVG_HOLUB = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g transform="translate(0 3)">' +
  '<polygon points="11.2,10.4 5.2,2.6 14.2,9.2" fill="#7a5a0e"/><polygon points="2.4,13.6 7.6,12.2 12.6,10.2 19.4,9.6 17.4,13.6 10.6,16.2 5.6,15.8" fill="#c99d2e"/>' +
  '<polygon points="7.6,12.2 12.6,10.2 19.4,9.6 12.8,12.8" fill="#e9c766"/><polygon points="12.6,10.2 16.6,1.8 15.2,10.2" fill="#f6e7a8"/>' +
  '<polygon points="12.6,10.2 15.2,10.2 13.4,12.6" fill="#d4af37"/><polygon points="17.6,9.7 22.2,8.4 19.6,12.2" fill="#f0d68a"/>' +
  '<polygon points="2.4,13.6 0.6,11.2 4.6,12.8" fill="#a8841e"/><polygon points="2.4,13.6 1.2,16.4 5.6,15.8" fill="#8a6a12"/></g></svg>';
// Malé značky práce (statické tvary z tohoto souboru).
const ZNACKY = {
  pocita: "M4 7h16M4 12h10M4 17h7M17 14l3 3-3 3",
  overuje: "M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6zM9 12l2 2 4-4",
  komunikuje: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12zM8.5 12h.01M12 12h.01M15.5 12h.01",
};
const FAJFKA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 6 9 17l-5-5"/></svg>';

function svgEl(tag, atributy) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(atributy)) e.setAttribute(k, v);
  return e;
}

/**
 * @param {HTMLOListElement} seznam  prázdný <ol> ve stránce (#h3a-hejno-kroky)
 * @param {HTMLElement} stavovyRadek  <p role="status"> ve stránce (#h3a-hejno-stav)
 * @param {{ klid?: boolean | (() => boolean), zavadec?: object, typo?: (t: string) => string }} volby  klid = omezení pohybu
 */
export function vytvorHejno(seznam, stavovyRadek, { klid = false, zavadec = window.HSPG_HBOT_ZAVADEC, typo = (t) => t } = {}) {
  const jeKlid = typeof klid === "function" ? klid : () => !!klid;
  const Z = zavadec && zavadec.holub && typeof zavadec.holub.kresli === "function" && typeof zavadec.platno === "function" ? zavadec : null;
  const stanice = KROKY.map((k) => {
    const li = document.createElement("li");
    li.className = "h3a-holub";
    li.dataset.krok = k.id;
    li.dataset.stav = "ceka";
    const scena = document.createElement("span");
    scena.className = "h3a-holub-scena";
    scena.setAttribute("aria-hidden", "true");
    const st = { krok: k, li, stav: "ceka", platno: null, ctx: null, w: 56, h: 40 };
    if (k.id === "meri") {
      // Obrys domu se střechou, který holub obkresluje (dokud měření běží).
      const obrys = svgEl("svg", { viewBox: "0 0 64 48", class: "h3a-holub-obrys", focusable: "false" });
      obrys.append(svgEl("path", { d: "M6 31 32 11 58 31", pathLength: "100" }), svgEl("path", { d: "M11 27v17h42V27", pathLength: "100" }));
      scena.append(obrys);
      st.w = 30; st.h = 22;
    }
    if (Z) {
      try {
        st.platno = Z.platno(st.w, st.h, k.id === "meri" ? "h3a-holub-ptak h3a-holub-jezdec" : "h3a-holub-ptak");
        st.ctx = st.platno.getContext("2d");
      } catch { st.platno = null; st.ctx = null; }
    }
    if (st.ctx) scena.append(st.platno);
    else {
      const s = document.createElement("span");
      s.className = "h3a-holub-ptak h3a-holub-ptak--svg" + (k.id === "meri" ? " h3a-holub-jezdec" : "");
      s.innerHTML = SVG_HOLUB;
      scena.append(s);
    }
    if (ZNACKY[k.id]) {
      const z = svgEl("svg", { viewBox: "0 0 24 24", class: "h3a-holub-znacka", fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round", focusable: "false" });
      z.append(svgEl("path", { d: ZNACKY[k.id] }));
      scena.append(z);
    }
    const fajfka = document.createElement("span");
    fajfka.className = "h3a-holub-fajfka";
    fajfka.innerHTML = FAJFKA;
    scena.append(fajfka);
    const nazev = document.createElement("span");
    nazev.className = "h3a-holub-nazev";
    nazev.textContent = k.nazev;
    st.prace = document.createElement("span");
    st.prace.className = "h3a-holub-prace";
    st.prace.textContent = typo(k.prace);
    st.stavText = document.createElement("span");
    st.stavText.className = "h3a-sr";
    st.stavText.textContent = `, ${STAV_TEXT.ceka}`;
    li.append(scena, nazev, st.prace, st.stavText);
    seznam.append(li);
    return st;
  });

  function kresli(st, t, mav) {
    if (!st.ctx) return;
    const r = st.platno._r || 1, p = POZY[st.krok.id] || {};
    st.ctx.setTransform(1, 0, 0, 1, 0, 0);
    st.ctx.clearRect(0, 0, st.platno.width, st.platno.height);
    const meritko = (st.krok.id === "meri" ? 8.5 : 13.5) * r;
    Z.holub.kresli(st.ctx, { x: (st.w / 2) * r, y: st.h * 0.56 * r, meritko, mav, cas: t, yaw: p.yaw, pitch: p.pitch, stoupani: (p.stoupani || 0) + 0.04 * Math.sin(t * 2.2) });
  }
  const klidovy = (st) => kresli(st, 0, st.krok.id === "komunikuje" && st.stav === "hotovo" ? 0.5 : 0.22);
  stanice.forEach(klidovy);

  // Mává jen holub, který právě pracuje (a jen bez omezení pohybu a ve viditelné kartě).
  let snimek = 0;
  function smycka(ted) {
    snimek = 0;
    if (jeKlid() || document.hidden) return;
    const t = ted / 1000;
    let dal = false;
    for (const st of stanice) {
      if (st.stav !== "bezi") continue;
      kresli(st, t, 0.22 + 0.34 * Math.sin(t * Math.PI * 2 * 1.6));
      dal = true;
    }
    if (dal) snimek = requestAnimationFrame(smycka);
  }
  function rozjed() { if (!jeKlid() && !snimek && window.requestAnimationFrame) snimek = requestAnimationFrame(smycka); }

  function nastavStav(st, stav) {
    if (st.stav === stav) return;
    st.stav = stav;
    st.li.dataset.stav = stav;
    st.stavText.textContent = `, ${STAV_TEXT[stav]}`;
    if (stav !== "bezi") klidovy(st);
  }
  function rekni(text) { stavovyRadek.textContent = text ? typo(text) : ""; }
  function obnov() {
    for (const st of stanice) { nastavStav(st, "ceka"); st.prace.textContent = typo(st.krok.prace); }
  }

  return {
    KROKY: KROKY.map((k) => k.id),
    /** Měření začíná (požadavek odešel): první holub měří. */
    start() {
      obnov();
      seznam.hidden = false;
      nastavStav(stanice[0], "bezi");
      rekni(KROKY[0].text);
      rozjed();
    },
    /** Skutečný krok měření: předchozí holubi hotovo, tento pracuje. data.plochy = spočítané plochy (pro „Počítá“). */
    krok(id, data = {}) {
      const i = KROKY.findIndex((k) => k.id === id);
      if (i < 0) return;
      seznam.hidden = false;
      stanice.forEach((st, j) => { if (j < i) nastavStav(st, "hotovo"); });
      nastavStav(stanice[i], "bezi");
      const pl = data.plochy;
      if (pl && (pl.strecha || pl.fasada)) {
        const m2 = (n) => `${String(n).replace(".", ",")} m²`;
        stanice[1].prace.textContent = typo([pl.strecha ? `střecha ${m2(pl.strecha)}` : null, pl.fasada ? `fasáda ${m2(pl.fasada)}` : null].filter(Boolean).join(" · "));
      }
      rekni(KROKY[i].text);
      rozjed();
    },
    /** Výsledek je venku a oznámený – všichni hotovo (statický stav, smyčka se zastaví). */
    hotovo() {
      stanice.forEach((st) => nastavStav(st, "hotovo"));
      rekni(KROKY[KROKY.length - 1].text);
    },
    /** Chyba, nové měření nebo jiný dům: hejno zmizí a vrátí se do klidu (stavový řádek se vyprázdní). */
    zrus() {
      if (snimek) { cancelAnimationFrame(snimek); snimek = 0; }
      obnov();
      seznam.hidden = true;
      rekni("");
    },
    stav: () => stanice.map((st) => st.stav),
  };
}
