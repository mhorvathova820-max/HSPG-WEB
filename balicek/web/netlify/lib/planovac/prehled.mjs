// H-WEATHER CONTROL – přehled pro majitele: zakázky z kalendáře + rezervace z plánovače, ke každému dni
// vyhodnocení počasí podle interních pravidel (content/pocasi-prace.json). Sdílí ho panel (/api/pocasi-prace)
// i kalendář s varováním (/api/pocasi-kalendar).
import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { obecZTextu } from "../pocasi/obce.mjs";
import { vyhodnotDen } from "../pocasi/vyhodnoceni.mjs";
import { mistni, dalsiDen } from "../pocasi/ical.mjs";
import { jeZakazka } from "./obsazenost.mjs";
import { aktualizuj } from "../ai/limity.mjs";

export const HORIZONT_POCASI_DNI = 9;
const MAX_POLOZEK = 80;

// Typ práce podle klíčových slov v názvu a popisu události; jinak výchozí z planovac.json.
export function typZakazky(text, pravidla, vychozi = "impregnace") {
  const t = String(text || "").toLowerCase();
  for (const [id, typ] of Object.entries(pravidla.typy || {})) {
    if ((typ.klicovaSlova || []).some((k) => t.includes(k))) return id;
  }
  return pravidla.typy?.[vychozi] ? vychozi : Object.keys(pravidla.typy || {})[0];
}

// Položky k vyhodnocení: jedna za (událost, den) v dosahu předpovědi.
export function polozky({ kalendar, rezervace = [], cfg, pravidla, ted }) {
  const dnes = mistni(ted).datum;
  const mez = dalsiDen(dnes, HORIZONT_POCASI_DNI);
  const out = [];
  for (const u of kalendar?.udalosti || []) {
    if (!jeZakazka(u, cfg.kalendar?.znacka)) continue;
    const jedenDen = u.dny.length === 1 && !u.celyDen && u.hodinyOd != null;
    for (const d of u.dny) {
      if (d < dnes || d > mez) continue;
      out.push({
        zdroj: "kalendar", uid: u.uid || createHash("sha256").update(`${u.nazev}|${u.misto}`).digest("hex").slice(0, 16),
        nazev: u.nazev, misto: u.misto, datum: d,
        typ: typZakazky(`${u.nazev} ${u.popis || ""}`, pravidla, cfg.kalendar?.vychoziTyp),
        okno: jedenDen ? { od: u.hodinyOd, do: u.hodinyDo ?? Math.min(24, u.hodinyOd + 8) } : null,
      });
    }
  }
  for (const r of rezervace) {
    for (const [d, druh] of [[r.termin, "termín"], [r.nahradni, "náhradní termín"]]) {
      if (!d || d < dnes || d > mez) continue;
      out.push({
        zdroj: "rezervace", uid: `rez-${r.id}-${druh === "termín" ? "t" : "n"}`, cislo: r.cislo,
        nazev: `Rezervace #${r.cislo} (${druh})${r.sluzba ? ` – ${r.sluzba}` : ""}`, misto: r.obec, datum: d,
        typ: typZakazky(r.sluzba, pravidla, cfg.kalendar?.vychoziTyp), okno: null, kupon: Boolean(r.kupon), kuponOk: r.kuponOk,
      });
    }
  }
  return out.sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0)).slice(0, MAX_POLOZEK);
}

// Vyhodnocení položek: obec → souřadnice → předpověď → vyhodnotDen. Předpověď se pro stejné místo bere jednou.
export async function vyhodnotPolozky(seznam, { pravidla, hledej, zdroj, ted }) {
  const mista = new Map();
  const vysledky = [];
  for (const p of seznam) {
    const typ = pravidla.typy[p.typ];
    const dotaz = obecZTextu(p.misto);
    if (!dotaz) { vysledky.push({ ...p, chyba: "Chybí místo – doplňte do události obec (např. „Lipová 12, Kolín“)." }); continue; }
    const klic = `${dotaz.obec}|${dotaz.okres || ""}`;
    if (!mista.has(klic)) {
      mista.set(klic, (async () => {
        const n = await hledej(dotaz);
        if (!n) return { chyba: `Obec „${dotaz.obec}“ jsme nenašli – upřesněte ji v události.` };
        if (n.nejednoznacne) return { chyba: `Obcí „${dotaz.obec}“ je víc (${n.nejednoznacne.slice(0, 4).map((x) => `okres ${x.okres}`).join(", ")}…) – připište do místa okres v závorce, např. „${dotaz.obec} (${n.nejednoznacne[0].okres})“.` };
        try {
          return { obec: n, predpoved: await zdroj(n.lat, n.lon, n.vyska) };
        } catch {
          return { obec: n, chyba: "Předpověď je dočasně nedostupná." };
        }
      })());
    }
    const m = await mista.get(klic);
    if (m.chyba) { vysledky.push({ ...p, ...(m.obec ? { obec: m.obec.obec, okres: m.obec.okres } : {}), chyba: m.chyba }); continue; }
    const v = vyhodnotDen(m.predpoved.rada, p.datum, typ, { okno: p.okno || pravidla.pracovniDoba, ted });
    vysledky.push({
      ...p, obec: m.obec.obec, okres: m.obec.okres, typNazev: typ.nazev, pravidlaPotvrzena: typ.potvrzeno === true,
      vysledek: v, aktualizovano: m.predpoved.aktualizovano, zastarale: m.predpoved.zastarale,
    });
  }
  return vysledky;
}

// --- tajný odkaz na kalendář s varováním -----------------------------------------------------------
// Klíč = HMAC(tajemství serveru, verze). Nová verze (tlačítko „Nový odkaz“ v panelu) starý odkaz zneplatní.
// Heslo panelu v klíči není: změna hesla nevyžaduje nové přidání kalendáře do Google.
const KLIC_VERZE = "pocasi/kalendar-verze";
export const klicKalendare = (tajemstvi, verze) => createHmac("sha256", tajemstvi).update(`hspg-pocasi-kalendar|${verze}`).digest("base64url");

export async function verzeKalendare(ul) {
  return (await ul.get(KLIC_VERZE, { type: "json" }))?.verze || 1;
}
export async function novaVerzeKalendare(ul) {
  return aktualizuj(ul, KLIC_VERZE, (z) => {
    const verze = (z?.verze || 1) + 1;
    return { hodnota: { verze }, vysledek: verze };
  });
}
export function overKlicKalendare(klic, tajemstvi, verze) {
  if (typeof klic !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(klic) || !tajemstvi) return false;
  const ocekavany = Buffer.from(klicKalendare(tajemstvi, verze));
  const dany = Buffer.from(klic);
  return dany.length === ocekavany.length && timingSafeEqual(dany, ocekavany);
}
// Klíč v cestě a přípona .ics: Google Kalendář u odkazů s parametry v dotazu někdy hlásí „URL nejde načíst“.
export const odkazKalendare = (zaklad, klic) => `${zaklad.replace(/\/$/, "")}/api/pocasi-kalendar/${klic}.ics`;
