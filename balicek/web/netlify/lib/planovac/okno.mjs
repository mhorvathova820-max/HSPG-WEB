// Technologické okno pro veřejný kalendář (HOLUB 360, plánovač) – rozhodnutí majitele 22. 10. 2026 (R17).
// Den je pro ochranné vrstvy a barvy technologicky nevhodný, když v pracovní době (místní čas, výchozí 7–19 h)
// pravděpodobnost srážek překročí hranici (výchozí 30 %) nebo teplota klesne pod minimum (výchozí 5 °C).
// Pravidlo i text pro zákazníky jsou jen v content/pocasi-prace.json → verejne.technologickeOkno; bez
// "potvrzeno": true se nepoužije a plánovač odpovídá jako dřív. Fakta jen z předpovědi MET Norway (CC BY 4.0).
// Za dosahem předpovědi se nic netvrdí (okno = null → stránka ukáže „předpověď upřesníme“).
import { zMistniho } from "../pocasi/ical.mjs";
import { srazkyVOkne } from "../pocasi/vyhodnoceni.mjs";

const HOD = 36e5;
const cislo = (x, vychozi) => (typeof x === "number" && Number.isFinite(x) ? x : vychozi);
const hodina = (x, vychozi) => (Number.isInteger(x) && x >= 0 && x <= 24 ? x : vychozi);

// Pravidlo z pocasi-prace.json → { text, pravdepodobnostSrazekMax, teplotaMin, pracovniDoba: { od, do } } | null.
export function pravidloOkna(pravidla) {
  const o = pravidla?.verejne?.technologickeOkno;
  if (!o || o.potvrzeno !== true) return null;
  const od = hodina(o.pracovniDoba?.od, 7);
  let do_ = hodina(o.pracovniDoba?.do, 19);
  if (do_ <= od) do_ = 19;
  return {
    text: String(o.text || "Technologicky nevhodný den"),
    pravdepodobnostSrazekMax: cislo(o.pravdepodobnostSrazekMax, 30),
    teplotaMin: cislo(o.teplotaMin, 5),
    pracovniDoba: { od, do: do_ },
  };
}

// Jeden místní den (RRRR-MM-DD) → { od, do, pravdepodobnostMax, teplotaMin, nevhodne, duvody } | null.
//   pravdepodobnostMax – nejvyšší pravděpodobnost srážek (%) z bloků předpovědi, které pracovní dobu překrývají
//                        (hodinové i šestihodinové; pravděpodobnost bloku nejde rozdělit, proto stačí překryv);
//   teplotaMin         – nejnižší okamžitá teplota v pracovní době; u šestihodinových bloků i jejich minimum,
//                        když blok leží v pracovní době aspoň z poloviny (noční minimum se nezapočítá);
//   nevhodne           – true = porušené pravidlo; false = obě hodnoty známé a v mezích; null = nelze říct;
//   duvody             – "srazky" | "teplota".
export function oknoDne(rada, datum, pravidlo) {
  if (!pravidlo || !Array.isArray(rada) || !rada.length || !/^\d{4}-\d{2}-\d{2}$/.test(String(datum))) return null;
  const [r, m, d] = datum.split("-").map(Number);
  const { od: hOd, do: hDo } = pravidlo.pracovniDoba;
  const zacatek = zMistniho(r, m, d, hOd);
  const konec = hDo >= 24 ? zMistniho(r, m, d, 0) + 24 * HOD : zMistniho(r, m, d, hDo);
  if (srazkyVOkne(rada, zacatek, konec).pokryto < 0.5) return null;

  let p = null, t = null;
  const min = (a, b) => (a == null ? b : Math.min(a, b));
  for (const b of rada) {
    const delka = (b.srazkyHodin || 0) * HOD;
    if (delka && typeof b.pravdepodobnost === "number" && b.od < konec && b.od + delka > zacatek) {
      p = p == null ? b.pravdepodobnost : Math.max(p, b.pravdepodobnost);
    }
    if (typeof b.teplota === "number" && b.od >= zacatek && b.od <= konec) t = min(t, b.teplota);
    if (b.srazkyHodin === 6 && typeof b.teplotaMinBlok === "number") {
      const prekryv = Math.min(b.od + delka, konec) - Math.max(b.od, zacatek);
      if (prekryv >= delka / 2) t = min(t, b.teplotaMinBlok);
    }
  }
  const duvody = [];
  if (p != null && p > pravidlo.pravdepodobnostSrazekMax) duvody.push("srazky");
  if (t != null && t < pravidlo.teplotaMin) duvody.push("teplota");
  return {
    od: hOd,
    do: hDo,
    pravdepodobnostMax: p == null ? null : Math.round(p * 10) / 10,
    teplotaMin: t == null ? null : Math.round(t * 10) / 10,
    nevhodne: duvody.length ? true : p != null && t != null ? false : null,
    duvody,
  };
}
