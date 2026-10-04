// /api/pocasi – náhrada stávající funkce (stránka /akce/, „Suché dny u vás“) se STEJNÝM rozhraním:
//   GET ?q=<adresa nebo obec> → 200 { obec, okres, dny: [7× { datum, srazky, pravdepodobnost, tmin, tmax, vitr, sucho }], zdroj }
//   bez q → 400 { chyba: "Zadejte prosím obec." };  obec nenalezena → 404 { chyba: "Obec jsme v mapě nenašli." }
// Proč náhrada: dosavadní zdroj (bezplatné API Open-Meteo) je podle jeho podmínek jen pro nekomerční
// použití; MET Norway (CC BY 4.0) komerční použití dovoluje a nepotřebuje klíč. Ven odchází jen poloha obce
// (ulice a číslo domu se odříznou už tady). pravdepodobnost je u MET pro Česko null (model ji pro ČR nemá).
import pravidla from "../../content/pocasi-prace.json" with { type: "json" };
import { najdiObec, obecZTextu } from "../lib/pocasi/obce.mjs";
import { vytvorZdroj, ZDROJ } from "../lib/pocasi/zdroj.mjs";
import { souhrnDne } from "../lib/pocasi/vyhodnoceni.mjs";
import { mistni, dalsiDen } from "../lib/pocasi/ical.mjs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": status === 200 ? "public,max-age=1800" : "no-store",
      ...(status === 200 ? { "netlify-cdn-cache-control": "public, s-maxage=1800, stale-while-revalidate=600", "netlify-vary": "query=q" } : {}),
    },
  });

export function vytvorPocasi({ env = process.env, fetchFn = fetch, ted = () => Date.now(), predpoved, obce } = {}) {
  const zdroj = predpoved || vytvorZdroj({ env, fetchFn, ted });
  const hledej = obce || najdiObec;
  return async function handler(req) {
    if (req.method !== "GET") return json({ chyba: "Použijte GET." }, 405);
    const q = (new URL(req.url).searchParams.get("q") || "").slice(0, 160);
    const dotaz = obecZTextu(q);
    if (!dotaz) return json({ chyba: "Zadejte prosím obec." }, 400);
    let nalez = await hledej(dotaz);
    // Víc obcí stejného jména a okres v adrese chybí: první z přibaleného seznamu (stejně jako dosud),
    // seznam ostatních jde v poli nejednoznacne – stránka může nabídnout upřesnění okresu.
    let nejednoznacne = null;
    if (nalez?.nejednoznacne) {
      nejednoznacne = nalez.nejednoznacne;
      nalez = await hledej({ obec: nejednoznacne[0].obec, kod: nejednoznacne[0].kod });
      if (nalez?.nejednoznacne) nalez = null;
    }
    if (!nalez) return json({ chyba: "Obec jsme v mapě nenašli." }, 404);
    let p;
    try {
      p = await zdroj(nalez.lat, nalez.lon, nalez.vyska);
    } catch {
      return json({ chyba: "Předpověď je dočasně nedostupná." }, 503);
    }
    const dnes = mistni(ted()).datum;
    const dny = [];
    // Dnešek během dne předpověď nepokrývá celý (začíná aktuální hodinou) → vypadne a přibude další den.
    for (let i = 0; i < 10 && dny.length < 7; i++) {
      const s = souhrnDne(p.rada, dalsiDen(dnes, i), { suchoMm: pravidla.verejne?.suchoMm ?? 0.5 });
      if (s) dny.push({ datum: s.datum, srazky: s.srazky, pravdepodobnost: null, tmin: s.tmin, tmax: s.tmax, vitr: s.vitr, sucho: s.sucho });
    }
    if (!dny.length) return json({ chyba: "Předpověď je dočasně nedostupná." }, 503);
    return json({ obec: nalez.obec, okres: nalez.okres, dny, zdroj: "MET Norway", zdrojText: ZDROJ.text, zdrojOdkaz: ZDROJ.odkaz, ...(nejednoznacne ? { nejednoznacne } : {}) });
  };
}

export default vytvorPocasi();

export const config = { path: "/api/pocasi" };
