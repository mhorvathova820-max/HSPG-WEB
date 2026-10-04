// H-WEATHER CONTROL – vyhodnocení dne pro venkovní práci z hodinové/šestihodinové předpovědi.
// Interní pomůcka plánování pro majitele (ne veřejné tvrzení): prahy jsou v content/pocasi-prace.json
// a platí pro ně „potvrzeno“ až po kontrole s technickým listem H-STONE.
//
// Řada předpovědi (normalizovaná, viz zdroj.mjs): [{ od: ms UTC, teplota °C, vitr m/s, narazy m/s|null,
//   vlhkost %|null, srazky mm|null, srazkyHodin 0|1|6, pravdepodobnost %|null }]
// srazky platí pro interval [od, od + srazkyHodin h); ostatní hodnoty jsou okamžité v čase od.
import { zMistniho } from "./ical.mjs";

const HOD = 36e5;
const nb = " ";
const cislo = (x, des = 1) => (Math.round(x * 10 ** des) / 10 ** des).toLocaleString("cs-CZ", { maximumFractionDigits: des });

export const UROVNE = ["vhodne", "riziko", "nevhodne"];
export const POPIS_UROVNE = { vhodne: "vhodné", riziko: "riziko", nevhodne: "nevhodné", neznamo: "bez předpovědi" };
export const ZNACKA_UROVNE = { vhodne: "✅", riziko: "⚠️", nevhodne: "⛔", neznamo: "❔" };
const horsi = (a, b) => (UROVNE.indexOf(b) > UROVNE.indexOf(a) ? b : a);

// Součet srážek v [od, do) s poměrným podílem částečně překrytých intervalů.
// Vrací { mm, pokryto } – pokryto = podíl intervalu, pro který předpověď srážek existuje (0–1).
export function srazkyVOkne(rada, od, do_) {
  let mm = 0, pokrytoMs = 0;
  for (const b of rada) {
    if (!b.srazkyHodin || b.srazky == null) continue;
    const z = b.od, k = b.od + b.srazkyHodin * HOD;
    const prekryv = Math.min(k, do_) - Math.max(z, od);
    if (prekryv <= 0) continue;
    mm += b.srazky * (prekryv / (k - z));
    pokrytoMs += prekryv;
  }
  return { mm, pokryto: do_ > od ? Math.min(1, pokrytoMs / (do_ - od)) : 1 };
}

// Okamžité hodnoty v [od, do]; když tam žádný bod není (šestihodinový krok), vezme nejbližší body kolem.
function body(rada, od, do_) {
  const uvnitr = rada.filter((b) => b.od >= od && b.od <= do_);
  if (uvnitr.length) return uvnitr;
  const pred = rada.filter((b) => b.od < od).at(-1);
  const po = rada.find((b) => b.od > do_);
  return pred && po && po.od - pred.od <= 12 * HOD ? [pred, po] : [];
}

const maxZ = (xs, k) => { const v = xs.map((b) => b[k]).filter((x) => typeof x === "number"); return v.length ? Math.max(...v) : null; };
const minZ = (xs, k) => { const v = xs.map((b) => b[k]).filter((x) => typeof x === "number"); return v.length ? Math.min(...v) : null; };

// Vyhodnotí jeden místní den. typ = pravidla jednoho typu práce z pocasi-prace.json.
// okno = { od, do } v místních hodinách (výchozí pracovní doba z pravidel); ted = čas výpočtu.
export function vyhodnotDen(rada, datum, typ, { okno, ted = Date.now() } = {}) {
  const [r, m, d] = datum.split("-").map(Number);
  const hOd = okno?.od ?? typ.pracovniDoba?.od ?? 7;
  const hDo = okno?.do ?? typ.pracovniDoba?.do ?? 19;
  const zacatek = zMistniho(r, m, d, hOd);
  const konec = hDo >= 24 ? zMistniho(r, m, d, 0) + 24 * HOD : zMistniho(r, m, d, hDo);
  const vysledek = { datum, okno: { od: hOd, do: hDo }, uroven: "neznamo", duvody: [], hodnoty: {}, spolehlivost: "neznamo" };
  if (!rada?.length) return vysledek;

  const prace = srazkyVOkne(rada, zacatek, konec);
  const bodyPrace = body(rada, zacatek, konec);
  // Bez předpovědi pro pracovní dobu (za horizontem) se nic netvrdí.
  if (prace.pokryto < 0.5 || !bodyPrace.length) return vysledek;

  const predH = typ.suchoPredHodin ?? 0, poH = typ.suchoPoHodin ?? 0, mrazH = typ.mrazPoHodin ?? 0;
  const pred = predH ? srazkyVOkne(rada, zacatek - predH * HOD, zacatek) : null;
  const po = poH ? srazkyVOkne(rada, konec, konec + poH * HOD) : null;
  const bodyMraz = mrazH ? body(rada, zacatek, konec + mrazH * HOD) : [];
  // Šestihodinové bloky nesou i min/max teploty za blok – zpřesní odhad tam, kde chybí hodinové body.
  const bloky = rada.filter((b) => b.srazkyHodin === 6 && b.od < konec && b.od + 6 * HOD > zacatek);
  const sMin = (a, b) => (a == null ? b : b == null ? a : Math.min(a, b));
  const sMax = (a, b) => (a == null ? b : b == null ? a : Math.max(a, b));
  const h = {
    srazkyPrace: prace.mm,
    pravdepodobnostMax: sMax(maxZ(bodyPrace, "pravdepodobnost"), maxZ(bloky, "pravdepodobnost")),
    teplotaMin: sMin(minZ(bodyPrace, "teplota"), minZ(bloky, "teplotaMinBlok")),
    teplotaMax: sMax(maxZ(bodyPrace, "teplota"), maxZ(bloky, "teplotaMaxBlok")),
    vitrMax: maxZ(bodyPrace, "vitr"),
    narazyMax: maxZ(bodyPrace, "narazy"),
    vlhkostMax: maxZ(bodyPrace, "vlhkost"),
    srazkyPred: pred?.mm ?? null,
    srazkyPo: po?.mm ?? null,
    teplotaMinPo: mrazH ? minZ(bodyMraz, "teplota") : null,
  };
  vysledek.hodnoty = Object.fromEntries(Object.entries(h).map(([k, v]) => [k, v == null ? null : Math.round(v * 10) / 10]));

  let u = "vhodne";
  const duvod = (uroven, text) => { u = horsi(u, uroven); vysledek.duvody.push({ uroven, text }); };
  const mm = (x) => `${cislo(x)}${nb}mm`;
  const st = (x) => `${cislo(x)}${nb}°C`;
  const ms = (x) => `${cislo(x)}${nb}m/s`;

  if (typ.srazkyBehemMm != null && h.srazkyPrace > typ.srazkyBehemMm) duvod("nevhodne", `Déšť v pracovní době ${mm(h.srazkyPrace)} (limit ${mm(typ.srazkyBehemMm)}).`);
  else if (typ.pravdepodobnostRiziko != null && h.pravdepodobnostMax != null && h.pravdepodobnostMax >= typ.pravdepodobnostRiziko) duvod("riziko", `Pravděpodobnost srážek až ${cislo(h.pravdepodobnostMax, 0)}${nb}%.`);
  if (pred && typ.suchoPredMm != null && pred.mm > typ.suchoPredMm) duvod("nevhodne", `Za ${predH}${nb}h před začátkem napadne ${mm(pred.mm)} – povrch nemusí být suchý.`);
  if (po && typ.suchoPoMm != null && po.mm > typ.suchoPoMm) duvod("nevhodne", `Do ${poH}${nb}h po skončení napadne ${mm(po.mm)}.`);
  if (po && po.pokryto < 0.9) duvod("riziko", `Předpověď nepokrývá celých ${poH}${nb}h po skončení práce.`);
  if (typ.teplotaMin != null && h.teplotaMin != null && h.teplotaMin < typ.teplotaMin) duvod("nevhodne", `Teplota klesne na ${st(h.teplotaMin)} (minimum ${st(typ.teplotaMin)}).`);
  if (typ.teplotaMax != null && h.teplotaMax != null && h.teplotaMax > typ.teplotaMax) duvod("nevhodne", `Teplota vystoupá na ${st(h.teplotaMax)} (maximum ${st(typ.teplotaMax)}).`);
  if (mrazH && typ.mrazMin != null && h.teplotaMinPo != null && h.teplotaMinPo < typ.mrazMin) duvod("nevhodne", `Do ${mrazH}${nb}h po skončení klesne teplota na ${st(h.teplotaMinPo)}.`);
  if (typ.vitrMaxMs != null && h.vitrMax != null && h.vitrMax > typ.vitrMaxMs) duvod("nevhodne", `Vítr až ${ms(h.vitrMax)} (limit ${ms(typ.vitrMaxMs)}).`);
  if (typ.narazyMaxMs != null && h.narazyMax != null && h.narazyMax > typ.narazyMaxMs) duvod("riziko", `Nárazy větru až ${ms(h.narazyMax)}.`);
  if (typ.vlhkostMax != null && h.vlhkostMax != null && h.vlhkostMax > typ.vlhkostMax) duvod("riziko", `Relativní vlhkost až ${cislo(h.vlhkostMax, 0)}${nb}% (limit ${cislo(typ.vlhkostMax, 0)}${nb}%).`);

  vysledek.uroven = u;
  // Předpověď na víc než 3 dny dopředu je orientační, na víc než 6 dní hrubá.
  const dniDopredu = (zacatek - ted) / (24 * HOD);
  vysledek.spolehlivost = dniDopredu <= 3 ? "vysoka" : dniDopredu <= 6 ? "stredni" : "nizka";
  if (!vysledek.duvody.length) vysledek.duvody.push({ uroven: "vhodne", text: "Bez překročení nastavených limitů." });
  return vysledek;
}

// Fakta pro zákazníky (plánovač, /akce/) za celý místní den: srážky, teplota min/max, vítr.
// Bez hodnocení vhodnosti. Vrací null, když předpověď den nepokrývá aspoň z 80 %.
export function souhrnDne(rada, datum, { suchoMm = 0.5 } = {}) {
  const [r, m, d] = datum.split("-").map(Number);
  const od = zMistniho(r, m, d, 0);
  const konec = od + 24 * HOD;
  if (!rada?.length) return null;
  const s = srazkyVOkne(rada, od, konec);
  const b = body(rada, od, konec);
  if (s.pokryto < 0.8 || !b.length) return null;
  const bloky = rada.filter((x) => x.srazkyHodin === 6 && x.od < konec && x.od + 6 * HOD > od);
  const tmin = [minZ(b, "teplota"), minZ(bloky, "teplotaMinBlok")].filter((x) => x != null);
  const tmax = [maxZ(b, "teplota"), maxZ(bloky, "teplotaMaxBlok")].filter((x) => x != null);
  const srazky = Math.round(s.mm * 10) / 10;
  return {
    datum,
    srazky,
    tmin: tmin.length ? Math.round(Math.min(...tmin)) : null,
    tmax: tmax.length ? Math.round(Math.max(...tmax)) : null,
    vitr: maxZ(b, "vitr") == null ? null : Math.round(maxZ(b, "vitr")),
    sucho: srazky <= suchoMm,
  };
}

// Text jedné řádky pro kalendář a panel: „⛔ nevhodné · Kolín · déšť 6,2 mm“.
export function shrnuti(v) {
  const hlavni = v.duvody.find((x) => x.uroven === v.uroven) || v.duvody[0];
  return `${ZNACKA_UROVNE[v.uroven]} ${POPIS_UROVNE[v.uroven]}${hlavni && v.uroven !== "vhodne" ? ` – ${hlavni.text.replace(/\.$/, "")}` : ""}`;
}
