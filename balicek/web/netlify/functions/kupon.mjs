// /api/kupon – dárkový kupon pro sousedy a známé (1 l impregnace H-STONE zdarma, content/planovac.json).
//   GET ?kod=HS-XXXX-XXXX            veřejné ověření (plánovač, /kupon/) → { platny, platnostDo, zbyva, nabidka } | { platny:false, duvod, zprava }
//                                    limit 20 ověření / hodinu na návštěvníka a 2 000 / den celkem (hádání kódů)
//   GET ?seznam=1   (Bearer token)   seznam kuponů pro panel majitele
//   POST (Bearer token) { akce: "vytvorit", poznamka?, maxPouziti?, platnostDni? } → { kupon, odkaz }
//   POST (Bearer token) { akce: "zrusit", kod }
import cfgVychozi from "../../content/planovac.json" with { type: "json" };
import { overPozadavek, povolenyOrigin } from "../lib/ai/autorizace.mjs";
import { vychoziUloziste, otiskKlienta, sitKlienta, pricti } from "../lib/ai/limity.mjs";
import { vychoziUlozistePlanovac, overKupon, vytvorKupon, zrusKupon, seznamKuponu, DUVODY } from "../lib/planovac/kupony.mjs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export const odkazKuponu = (kod) => `https://hspg.cz/kupon/?k=${encodeURIComponent(kod)}`;

export function vytvorKuponApi({ env = process.env, uloziste, ulozisteLimitu, ted = () => Date.now(), cfg = cfgVychozi } = {}) {
  let ul = uloziste, ulL = ulozisteLimitu;
  const dejUloziste = async () => (ul ||= await vychoziUlozistePlanovac());
  const dejLimity = async () => (ulL ||= await vychoziUloziste());

  return async function handler(req, context = {}) {
    const url = new URL(req.url);
    const t = ted();
    try {
      if (req.method === "GET" && url.searchParams.has("kod")) {
        const klient = otiskKlienta(sitKlienta(context.ip || req.headers.get("x-nf-client-connection-ip")), t);
        const L = await dejLimity();
        if (!(await pricti(L, `limit/kupon/${klient}`, 20, 3_600_000, t))) return json({ chyba: "Příliš mnoho pokusů. Zkuste to prosím za hodinu, nebo nám zavolejte." }, 429);
        if (!(await pricti(L, `limit/kupon-den/${new Date(t).toISOString().slice(0, 10)}`, 2000, 86_400_000, t))) return json({ chyba: "Ověření kuponů je teď přetížené. Kód napište do poznámky – ověříme ho ručně." }, 429);
        const v = await overKupon(await dejUloziste(), url.searchParams.get("kod").slice(0, 40), t);
        return json(v.platny
          ? { platny: true, kod: v.kod, platnostDo: v.platnostDo, zbyva: v.zbyva, nabidka: cfg.kupon.nabidka }
          : { platny: false, duvod: v.duvod, zprava: DUVODY[v.duvod] || DUVODY.neexistuje });
      }

      // Vše ostatní jen pro majitele.
      const a = await overPozadavek(req, env, t, dejLimity);
      if (!a.ok) return json({ chyba: a.duvod }, a.status);
      if (req.method === "GET") return json({ kupony: (await seznamKuponu(await dejUloziste())).map((k) => ({ ...k, odkaz: odkazKuponu(k.kod) })) });
      if (req.method !== "POST") return json({ chyba: "Použijte GET nebo POST." }, 405);
      if (!povolenyOrigin(req.headers.get("origin"), env)) return json({ chyba: "Nepovolený původ požadavku." }, 403);
      let telo;
      try { telo = await req.json(); } catch { return json({ chyba: "Neplatný JSON." }, 400); }
      if (telo?.akce === "vytvorit") {
        const kupon = await vytvorKupon(await dejUloziste(), { poznamka: telo.poznamka, maxPouziti: telo.maxPouziti, platnostDni: telo.platnostDni, ted: t }, cfg.kupon);
        return json({ kupon, odkaz: odkazKuponu(kupon.kod) });
      }
      if (telo?.akce === "zrusit") {
        const k = await zrusKupon(await dejUloziste(), telo.kod);
        return k ? json({ kupon: k }) : json({ chyba: "Kupon nenalezen." }, 404);
      }
      return json({ chyba: "Neznámá akce (vytvorit | zrusit)." }, 400);
    } catch {
      return json({ chyba: "Úložiště není dostupné – zkuste to prosím za chvíli." }, 503);
    }
  };
}

export default vytvorKuponApi();

export const config = { path: "/api/kupon" };
