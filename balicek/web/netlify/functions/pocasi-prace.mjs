// /api/pocasi-prace – H-WEATHER CONTROL pro majitele (Bearer token z /api/majitel).
//   GET ?obec=Kolín[&okres=…][&typ=impregnace|cisteni|biocid] → vyhodnocení dnů v dosahu předpovědi (~9 dní)
//   GET ?prehled=1   → zakázky z kalendáře + rezervace z plánovače s vyhodnocením počasí
//   POST { akce: "odkaz" }      → tajný odkaz na kalendář s varováním (pro Google Kalendář → Přidat z URL)
//   POST { akce: "novy-odkaz" } → nový odkaz, starý přestane fungovat
import cfgVychozi from "../../content/planovac.json" with { type: "json" };
import pravidlaVychozi from "../../content/pocasi-prace.json" with { type: "json" };
import { overPozadavek, povolenyOrigin, tajemstviServeru } from "../lib/ai/autorizace.mjs";
import { vychoziUloziste } from "../lib/ai/limity.mjs";
import { najdiObec, obecZTextu, infoObci } from "../lib/pocasi/obce.mjs";
import { vytvorZdroj, ZDROJ } from "../lib/pocasi/zdroj.mjs";
import { vyhodnotDen } from "../lib/pocasi/vyhodnoceni.mjs";
import { mistni, dalsiDen } from "../lib/pocasi/ical.mjs";
import { vytvorKalendarZakazek } from "../lib/planovac/obsazenost.mjs";
import { vychoziUlozistePlanovac } from "../lib/planovac/kupony.mjs";
import { rezervaceVObdobi } from "../lib/planovac/rezervace.mjs";
import { polozky, vyhodnotPolozky, HORIZONT_POCASI_DNI, klicKalendare, verzeKalendare, novaVerzeKalendare, odkazKalendare } from "../lib/planovac/prehled.mjs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export function vytvorPocasiPrace({ env = process.env, uloziste, ulozistePlanovac, fetchFn = fetch, ted = () => Date.now(), cfg = cfgVychozi, pravidla = pravidlaVychozi, predpoved, kalendar, obce } = {}) {
  let ul = uloziste, ulP = ulozistePlanovac;
  const dejUloziste = async () => (ul ||= await vychoziUloziste());
  const dejPlanovac = async () => (ulP ||= await vychoziUlozistePlanovac());
  const zdroj = predpoved || vytvorZdroj({ env, fetchFn, ted });
  const hledej = obce || najdiObec;
  let kal = kalendar;
  const zaklad = () => (env.URL && /^https:\/\//.test(env.URL) ? env.URL : "https://hspg.cz");

  return async function handler(req) {
    const t = ted();
    const a = await overPozadavek(req, env, t, dejUloziste);
    if (!a.ok) return json({ chyba: a.duvod }, a.status);
    const url = new URL(req.url);
    try {
      if (req.method === "POST") {
        if (!povolenyOrigin(req.headers.get("origin"), env)) return json({ chyba: "Nepovolený původ požadavku." }, 403);
        let telo;
        try { telo = await req.json(); } catch { return json({ chyba: "Neplatný JSON." }, 400); }
        const store = await dejUloziste();
        const tajemstvi = await tajemstviServeru(env, store);
        if (telo?.akce === "odkaz") return json({ odkaz: odkazKalendare(zaklad(), klicKalendare(tajemstvi, await verzeKalendare(store))) });
        if (telo?.akce === "novy-odkaz") return json({ odkaz: odkazKalendare(zaklad(), klicKalendare(tajemstvi, await novaVerzeKalendare(store))), novy: true });
        return json({ chyba: "Neznámá akce (odkaz | novy-odkaz)." }, 400);
      }
      if (req.method !== "GET") return json({ chyba: "Použijte GET nebo POST." }, 405);

      const zdrojInfo = { text: ZDROJ.text, odkaz: ZDROJ.odkaz, licence: ZDROJ.odkazLicence };
      if (url.searchParams.get("prehled")) {
        kal ||= vytvorKalendarZakazek({ env, fetchFn, uloziste: await dejPlanovac(), ted });
        const k = await kal();
        const dnes = mistni(t).datum;
        let rezervace = [];
        try { rezervace = await rezervaceVObdobi(await dejPlanovac(), dnes, dalsiDen(dnes, cfg.horizontDni ?? 21), t); } catch { rezervace = []; }
        const seznam = polozky({ kalendar: k, rezervace, cfg, pravidla, ted: t });
        return json({
          kalendar: { nastaveno: k.nastaveno, chyba: Boolean(k.chyba), zastarale: Boolean(k.zastarale), preskoceno: k.preskoceno, stazeno: k.stazeno || null },
          horizont: dalsiDen(dnes, HORIZONT_POCASI_DNI),
          polozky: await vyhodnotPolozky(seznam, { pravidla, hledej, zdroj, ted: t }),
          rezervaceMimoHorizont: rezervace.filter((r) => r.termin > dalsiDen(dnes, HORIZONT_POCASI_DNI)).map(({ cislo, termin, nahradni, obec, sluzba, kupon, kuponOk }) => ({ cislo, termin, nahradni, obec, sluzba, kupon: Boolean(kupon), kuponOk })),
          zdroj: zdrojInfo,
        });
      }

      const obecVstup = (url.searchParams.get("obec") || "").slice(0, 120);
      const dotaz = obecZTextu(obecVstup);
      if (!dotaz) return json({ chyba: "Zadejte obec." }, 400);
      const okres = (url.searchParams.get("okres") || "").slice(0, 80);
      const kod = (url.searchParams.get("kod") || "").replace(/\D/g, "").slice(0, 9);
      const n = await hledej({ ...dotaz, okres: okres || dotaz.okres, ...(kod ? { kod: Number(kod) } : {}) });
      if (!n) return json({ chyba: `Obec „${dotaz.obec}“ jsme v seznamu nenašli.`, obci: (await infoObci()).pocet }, 404);
      if (n.nejednoznacne) return json({ nejednoznacne: n.nejednoznacne });
      const typId = pravidla.typy[url.searchParams.get("typ")] ? url.searchParams.get("typ") : cfg.kalendar?.vychoziTyp || "impregnace";
      const typ = pravidla.typy[typId];
      let p;
      try { p = await zdroj(n.lat, n.lon, n.vyska); } catch { return json({ chyba: "Předpověď je dočasně nedostupná (MET Norway). Zkuste to za chvíli." }, 503); }
      const dnes = mistni(t).datum;
      const dny = [];
      for (let i = 0; i <= HORIZONT_POCASI_DNI; i++) {
        const v = vyhodnotDen(p.rada, dalsiDen(dnes, i), typ, { okno: pravidla.pracovniDoba, ted: t });
        if (v.uroven !== "neznamo") dny.push(v);
      }
      return json({ misto: { obec: n.obec, okres: n.okres, kod: n.kod, ...(n.castObce ? { castObce: n.castObce } : {}) }, typ: typId, typNazev: typ.nazev, pravidlaPotvrzena: typ.potvrzeno === true, typy: Object.fromEntries(Object.entries(pravidla.typy).map(([id, x]) => [id, x.nazev])), dny, aktualizovano: p.aktualizovano, zastarale: p.zastarale, zdroj: zdrojInfo });
    } catch {
      return json({ chyba: "Úložiště není dostupné – zkuste to prosím za chvíli." }, 503);
    }
  };
}

export default vytvorPocasiPrace();

export const config = { path: "/api/pocasi-prace" };
