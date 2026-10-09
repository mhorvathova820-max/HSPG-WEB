// /api/mereni – měření budovy z adresy (úkol 23), jen pro přihlášeného majitele (Bearer token z /api/majitel).
//   POST { adresa: "Ulice č., Obec" } nebo { kod: <kód adresního místa RÚIAN> }
//   → 200 { stav: "hotovo", schema, adresa, budova, pudorys, vysky, fasady, strecha, model3d, presnost, zdroje, upozorneni }
//   → 200 { stav: "vyber" | "neni-budova", zprava, kandidati: [{ adresa }] }   (víc adres / ulice či náměstí)
//   → 404 adresa nenalezena · 429 limit · 503 zdroje nedostupné
// Postup: RÚIAN (adresa → adresní místo → stavební objekt s polygonem z katastru, podlaží, zastavěná plocha),
// výšky z DMP 1G − DMR 5G uvnitř půdorysu; když RÚIAN polygon nemá → OSM Overpass → Nominatim.
// Když výškopis budovu nezná (stavba po skenování 2009–2013) → odhad z počtu podlaží.
// Výsledek je vždy „schéma z mapových podkladů, ne geodetické zaměření“. Mezipaměť v Blobs podle kódu adresy (180 dní).
import { overPozadavek, povolenyOrigin } from "../lib/ai/autorizace.mjs";
import { vychoziUloziste, pricti } from "../lib/ai/limity.mjs";
import { zmerAdresu, vychoziUlozisteMereni, SCHEMA } from "../lib/mereni/mereni.mjs";

export { zmerAdresu, vychoziUlozisteMereni, SCHEMA };
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export function vytvorMereni({ env = process.env, fetchFn = fetch, uloziste, ulozisteLimitu, ted = () => Date.now() } = {}) {
  let ul = uloziste, ulL = ulozisteLimitu;
  const dejUloziste = async () => (ul ||= await vychoziUlozisteMereni());
  const dejLimity = async () => (ulL ||= await vychoziUloziste());

  return async function handler(req) {
    if (req.method !== "POST") return json({ chyba: "Použijte POST." }, 405);
    const t = ted();
    const a = await overPozadavek(req, env, t, dejLimity);
    if (!a.ok) return json({ chyba: a.duvod }, a.status);
    if (!povolenyOrigin(req.headers.get("origin"), env)) return json({ chyba: "Nepovolený původ požadavku." }, 403);
    let telo;
    try { telo = await req.json(); } catch { return json({ chyba: "Neplatný JSON." }, 400); }
    const text = String(telo?.adresa || "").trim().slice(0, 200);
    const kod = Number.isInteger(Number(telo?.kod)) && Number(telo?.kod) > 0 ? Number(telo.kod) : null;
    if (!text && !kod) return json({ chyba: "Zadejte adresu (ulice a číslo domu, obec)." }, 400);

    let store;
    try {
      if (!(await pricti(await dejLimity(), "limit/mereni", 60, 10 * 60_000, t))) return json({ chyba: "Příliš mnoho měření za 10 minut. Zkuste to za chvíli." }, 429);
      store = await dejUloziste();
    } catch {
      return json({ chyba: "Úložiště není dostupné – zkuste to za chvíli." }, 503);
    }

    const r = await zmerAdresu({ text, kod }, { fetchFn, store, ted });
    return json(r.data, r.status);
  };
}

export default vytvorMereni();

export const config = { path: "/api/mereni" };
