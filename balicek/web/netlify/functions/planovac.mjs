// /api/planovac – veřejný plánovač termínu (stránka /planovac/).
//   GET ?obec=Kolín[&okres=Kolín | &kod=<kód obce RÚIAN>] → { misto, dny: [{ datum, pracovni, volno, pocasi }], sleva, kupon, zdrojPocasi }
//   GET ?navrh=Kol → { navrhy: [{ obec, okres, kod }] } (našeptávač, lokální seznam obcí)
//   volno: true/false podle kalendáře zakázek (null = kalendář nenastaven → „termín potvrdíme“);
//   pocasi: fakta z předpovědi (srážky, teplota, vítr, bez deště) jen pro dny v dosahu předpovědi (~9 dní).
// Bez obce vrátí jen obsazenost. Odpověď je stejná pro všechny → CDN Netlify ji drží 10 minut
// (Netlify-Vary podle obce a okresu), takže opakované dotazy nestojí výpočet ani volání MET Norway.
import cfgVychozi from "../../content/planovac.json" with { type: "json" };
import pravidlaVychozi from "../../content/pocasi-prace.json" with { type: "json" };
import { najdiObec, obecZTextu, navrhyObci, ZDROJ_OBCI } from "../lib/pocasi/obce.mjs";
import { vytvorZdroj, ZDROJ } from "../lib/pocasi/zdroj.mjs";
import { souhrnDne } from "../lib/pocasi/vyhodnoceni.mjs";
import { vytvorKalendarZakazek, dnyPlanovace, volneDny } from "../lib/planovac/obsazenost.mjs";
import { vychoziUlozistePlanovac } from "../lib/planovac/kupony.mjs";

const json = (data, status = 200, cache = true) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(cache
        ? { "cache-control": "public, max-age=300", "netlify-cdn-cache-control": "public, s-maxage=600, stale-while-revalidate=300", "netlify-vary": "query=obec|okres|kod|navrh" }
        : { "cache-control": "no-store" }),
    },
  });

export function verejnaNabidka(cfg) {
  return {
    sleva: { procent: cfg.sleva.procent, nazev: cfg.sleva.nazev, kratce: cfg.sleva.kratce, podminky: cfg.sleva.podminky, potvrzeno: cfg.sleva.potvrzeno === true },
    kupon: { nabidka: cfg.kupon.nabidka, nazev: cfg.kupon.nazev, kratce: cfg.kupon.kratce, podminky: cfg.kupon.podminky, potvrzeno: cfg.kupon.potvrzeno === true },
  };
}

export function vytvorPlanovac({ env = process.env, uloziste, fetchFn = fetch, ted = () => Date.now(), cfg = cfgVychozi, pravidla = pravidlaVychozi, predpoved, kalendar, obce } = {}) {
  let ul = uloziste;
  const dejUloziste = async () => {
    if (ul !== undefined) return ul;
    try { ul = await vychoziUlozistePlanovac(); } catch { ul = null; }
    return ul;
  };
  let kal = kalendar;
  const zdroj = predpoved || vytvorZdroj({ env, fetchFn, ted });
  const hledej = obce || najdiObec;

  return async function handler(req) {
    if (req.method !== "GET") return json({ chyba: "Použijte GET." }, 405, false);
    const url = new URL(req.url);
    if (url.searchParams.has("navrh")) return json({ navrhy: navrhyObci((url.searchParams.get("navrh") || "").slice(0, 60)) });
    const obecVstup = (url.searchParams.get("obec") || "").slice(0, 120);
    const okresVstup = (url.searchParams.get("okres") || "").slice(0, 80);
    const kodVstup = (url.searchParams.get("kod") || "").replace(/\D/g, "").slice(0, 9);
    const t = ted();

    kal ||= vytvorKalendarZakazek({ env, fetchFn, uloziste: await dejUloziste(), ted });
    const dny = volneDny(dnyPlanovace(t, cfg), await kal(), cfg);

    let misto = null, nejednoznacne = null, pocasi = null, chybaPocasi = null;
    if (obecVstup) {
      const dotaz = obecZTextu(obecVstup);
      const nalez = dotaz ? await hledej({ ...dotaz, okres: okresVstup || dotaz.okres, ...(kodVstup ? { kod: Number(kodVstup) } : {}) }) : null;
      if (nalez?.nejednoznacne) nejednoznacne = nalez.nejednoznacne;
      else if (nalez) {
        misto = { obec: nalez.obec, okres: nalez.okres, kod: nalez.kod, ...(nalez.castObce ? { castObce: nalez.castObce } : {}) };
        try {
          pocasi = await zdroj(nalez.lat, nalez.lon, nalez.vyska);
        } catch {
          chybaPocasi = "Předpověď teď není dostupná – termín s vámi potvrdíme podle aktuálního počasí.";
        }
      }
    }
    const suchoMm = pravidla.verejne?.suchoMm ?? 0.5;
    return json({
      misto,
      ...(obecVstup && !misto && !nejednoznacne ? { nenalezeno: true } : {}),
      ...(nejednoznacne ? { nejednoznacne } : {}),
      dny: dny.map((d) => ({ ...d, pocasi: pocasi ? souhrnDne(pocasi.rada, d.datum, { suchoMm }) : null })),
      kalendar: dny.some((d) => d.volno !== null && d.pracovni),
      ...(pocasi ? { zdrojPocasi: { text: ZDROJ.text, odkaz: ZDROJ.odkaz, licence: ZDROJ.odkazLicence, aktualizovano: pocasi.aktualizovano, obce: ZDROJ_OBCI } } : {}),
      ...(chybaPocasi ? { chybaPocasi } : {}),
      ...verejnaNabidka(cfg),
    });
  };
}

export default vytvorPlanovac();

export const config = { path: "/api/planovac" };
