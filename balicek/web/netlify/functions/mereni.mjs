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
import { sjtskNaWgs84 } from "../lib/mereni/sjtsk.mjs";
import { spocitej, bodyVzorku, vyskyZVzorku, vyskyZPodlazi, plocha, normalizujPrstenec, cz } from "../lib/mereni/geometrie.mjs";
import { hledejAdresu, adresniMisto, stavebniObjekt, sousedniObjekty, vzorkyVysek, obrysOverpass, obrysNominatim, wgsNaLokalni, ZDROJE, ZPUSOB_VYUZITI } from "../lib/mereni/zdroje.mjs";

export const SCHEMA = "Schéma z mapových podkladů, ne geodetické zaměření.";
const PLATNOST_MS = 180 * 864e5;
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export async function vychoziUlozisteMereni() {
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: "hspg-mereni", consistency: "strong" });
}

// Výpočet pro obrys v lokálních metrech + funkce, která lokální bod převede na dotaz do výškopisu.
async function zmer({ fetchFn, lokalni, naDotaz, wkid, podlazi, vyskaOsm, presnostObrysuM, upozorneni, zdroje, sousede = [] }) {
  const { body: vzorky, obdelnik: obd } = bodyVzorku(lokalni);
  let vysky = null, presnostVyskyM = null;
  if (vzorky.length >= 3) {
    try {
      const v = await vzorkyVysek(fetchFn, vzorky.map((b) => ({ ...b, dotaz: naDotaz(b.bod) })), wkid);
      vysky = vyskyZVzorku(v, obd);
      if (vysky?.neodpovida) {
        upozorneni.push("Výškopis ČÚZK (skenování 2009–2013) budovu na tomto místě nezachycuje – výška je odhad z počtu podlaží.");
        vysky = null;
      } else if (vysky) {
        presnostVyskyM = 0.5;
        zdroje.push({ ...ZDROJE.vyskopis, co: `výška okapu a hřebene, sklon (${vysky.bodu} bodů uvnitř půdorysu)` });
        if (vysky.tvar === "sedlová") upozorneni.push("Tvar střechy je odvozený z výšek ve 2m rastru: sedlová/valbová se nerozliší, plocha střechy platí pro obě (stejný sklon).");
        if (vysky.tvar === "nepravidelná") upozorneni.push(`Budova má části různé výšky (${cz(vysky.rozsahVysek[0])}–${cz(vysky.rozsahVysek[1], "m")}) – fasády jsou počítané s mediánem ${cz(vysky.okap, "m")}, ověřte na místě.`);
        else if (podlazi && vysky.okap && (vysky.okap / podlazi < 2.2 || vysky.okap / podlazi > 4.5)) upozorneni.push(`Výška okapu ${cz(vysky.okap, "m")} neodpovídá ${podlazi} podlažím z RÚIAN – ověřte na místě.`);
      }
    } catch {
      vysky = null;
    }
    if (!vysky && !upozorneni.some((u) => u.startsWith("Výškopis"))) upozorneni.push("Výškopis ČÚZK teď neodpověděl pro dost bodů – výška je odhad z počtu podlaží.");
  } else upozorneni.push("Budova je na výškopis (rastr 2 m) příliš malá nebo úzká – výška je odhad z počtu podlaží.");
  if (!vysky) {
    vysky = vyskaOsm ? { tvar: "neurčeno", okap: vyskaOsm, hreben: null, sklon: null, odhadZOsm: true } : vyskyZPodlazi(podlazi);
    if (!vysky) upozorneni.push("Výšku nejde určit (chybí výškopis i počet podlaží) – fasády a střechu doměřte na místě.");
  }
  const vysledek = spocitej(lokalni, vysky, { presnostObrysuM, presnostVyskyM, sousede });
  const spolecne = vysledek.pudorys.strany.filter((x) => x.spolecnaZed).length;
  if (spolecne) upozorneni.push(`${spolecne} ${spolecne === 1 ? "strana sousedí" : "strany sousedí"} s jinou budovou (společná zeď) – do fasád se nepočítá.`);
  return vysledek;
}

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

    const upozorneni = [];
    const zdroje = [];
    try {
      // 1) Adresa → adresní místo (RÚIAN).
      let am = null;
      if (kod) am = await adresniMisto(fetchFn, { kod });
      else {
        const kandidati = await hledejAdresu(fetchFn, text);
        const adresy = kandidati.filter((k) => k.typ === "AdresniMisto");
        const prvni = kandidati[0];
        if (prvni && prvni.typ !== "AdresniMisto") {
          return json({ stav: "neni-budova", zprava: `„${prvni.adresa}“ je ${prvni.typ === "Ulice" ? "ulice nebo náměstí" : "místo"}, ne budova – vyberte konkrétní číslo domu.`, kandidati: adresy.slice(0, 5).map((k) => ({ adresa: k.adresa })) });
        }
        const presne = adresy.filter((k) => k.skore >= 95);
        if (presne.length > 1 && presne[0].adresa !== presne[1].adresa) return json({ stav: "vyber", zprava: "Adrese odpovídá víc míst – vyberte jedno.", kandidati: presne.slice(0, 5).map((k) => ({ adresa: k.adresa })) });
        if (presne.length) am = await adresniMisto(fetchFn, { x: presne[0].x, y: presne[0].y });
        else if (adresy.length) return json({ stav: "vyber", zprava: "Přesnou shodu jsme nenašli – vyberte z nabídky.", kandidati: adresy.slice(0, 5).map((k) => ({ adresa: k.adresa })) });
      }

      // 2) Mezipaměť podle kódu adresního místa.
      const klic = am ? `adresa/${am.kod}` : `text/${text.toLowerCase().replace(/\s+/g, " ")}`.slice(0, 200);
      try {
        const z = await store.get(klic, { type: "json" });
        if (z && t - z.ulozeno < PLATNOST_MS) return json({ ...z.vysledek, zMezipameti: true });
      } catch { /* bez mezipaměti */ }

      let vysledek;
      if (am) zdroje.push({ ...ZDROJE.ruian, co: "adresa, adresní místo" });
      const so = am?.stavebniObjekt ? await stavebniObjekt(fetchFn, am.stavebniObjekt) : null;
      const budova = so ? {
        kodStavebnihoObjektu: so.kod, podlazi: so.podlazi, zastavenaPlochaRuian: so.zastavenaPlocha, obestavenyProstor: so.obestavenyProstor,
        zpusobVyuziti: so.zpusobVyuzitiKod ? { kod: so.zpusobVyuzitiKod, nazev: ZPUSOB_VYUZITI[so.zpusobVyuzitiKod] || null } : null, zdroj: "ČÚZK – RÚIAN",
      } : null;

      if (so?.prstence?.length) {
        // 3a) Půdorys z RÚIAN (katastrální mapa) v S-JTSK – největší prstenec = obrys, ostatní uvnitř = dvory.
        const prstence = so.prstence.map(normalizujPrstenec).sort((x, y) => plocha(y) - plocha(x));
        const obrys = prstence[0];
        const cx = obrys.reduce((s, p) => s + p[0], 0) / obrys.length, cy = obrys.reduce((s, p) => s + p[1], 0) / obrys.length;
        const lokalni = obrys.map(([x, y]) => [x - cx, y - cy]);
        zdroje.push({ ...ZDROJE.ruian, co: "půdorys (katastrální mapa), počet podlaží, zastavěná plocha, způsob využití" });
        let sousede = [];
        try { sousede = (await sousedniObjekty(fetchFn, so.kod, so.prstence[0])).map((r) => r.map(([x, y]) => [x - cx, y - cy])); } catch { /* bez sousedů */ }
        vysledek = await zmer({ fetchFn, lokalni, naDotaz: ([x, y]) => [x + cx, y + cy], wkid: 5514, podlazi: so.podlazi, presnostObrysuM: 0.3, upozorneni, zdroje, sousede });
        if (prstence.length > 1) {
          const dvory = prstence.slice(1).reduce((s, p) => s + plocha(p), 0);
          vysledek.pudorys.plochaDvoru = Math.round(dvory * 10) / 10;
          vysledek.pudorys.plocha = Math.round((vysledek.pudorys.plocha - dvory) * 10) / 10;
          upozorneni.push(`Budova má ${prstence.length - 1} vnitřní dvůr/dvory – jejich fasády nejsou v součtu.`);
        }
        const [lat, lon] = sjtskNaWgs84(cx, cy);
        vysledek.stred = { wgs84: [Math.round(lat * 1e6) / 1e6, Math.round(lon * 1e6) / 1e6], sjtsk: [Math.round(cx * 100) / 100, Math.round(cy * 100) / 100] };
      } else {
        // 3b) Bez polygonu v RÚIAN → OpenStreetMap: Overpass (střídání serverů), pak Nominatim.
        if (am) upozorneni.push("RÚIAN k této adrese nemá půdorys budovy – obrys je z OpenStreetMap (méně přesný).");
        let stred = am ? sjtskNaWgs84(am.x, am.y) : null;
        let obrys = null;
        if (stred) { try { obrys = await obrysOverpass(fetchFn, stred[0], stred[1]); } catch { upozorneni.push("Overpass (OpenStreetMap) teď neodpovídá."); } }
        if (!obrys) {
          const n = await obrysNominatim(fetchFn, am?.adresa || text, store, ted);
          if (n?.omezeno) return json({ chyba: "Záložní mapová služba přijímá nejvýš 1 dotaz za sekundu – zkuste to znovu za chvíli." }, 503);
          if (n?.body) obrys = { body: n.body, zdroj: "Nominatim" };
          if (!obrys && n?.lat && !stred) { stred = [n.lat, n.lon]; try { obrys = await obrysOverpass(fetchFn, n.lat, n.lon); } catch { /* nic */ } }
        }
        if (!obrys) {
          if (!am && !stred) return json({ chyba: "Adresu jsme nenašli. Zkontrolujte ulici, číslo domu a obec." }, 404);
          vysledek = { pudorys: null, vysky: null, fasady: [], strecha: null, model3d: null, presnost: null };
          upozorneni.push("Půdorys budovy není v RÚIAN ani v OpenStreetMap – rozměry je nutné změřit na místě nebo z fotografie.");
        } else {
          const { body: lokalni, zpet, stred: s0 } = wgsNaLokalni(normalizujPrstenec(obrys.body));
          zdroje.push({ ...ZDROJE.osm, co: `obrys budovy (${obrys.server || obrys.zdroj || "OSM"})` });
          vysledek = await zmer({ fetchFn, lokalni, naDotaz: zpet, wkid: 4326, podlazi: so?.podlazi ?? obrys.podlazi, vyskaOsm: obrys.vyska, presnostObrysuM: 1, upozorneni, zdroje });
          vysledek.stred = { wgs84: s0.map((x) => Math.round(x * 1e6) / 1e6) };
        }
      }

      if (budova?.zastavenaPlochaRuian && vysledek.pudorys?.plocha) {
        const rozdil = Math.abs(vysledek.pudorys.plocha - budova.zastavenaPlochaRuian) / budova.zastavenaPlochaRuian;
        if (rozdil > 0.1) upozorneni.push(`Plocha z obrysu (${cz(vysledek.pudorys.plocha, "m²")}) se liší od zastavěné plochy v RÚIAN (${cz(budova.zastavenaPlochaRuian, "m²")}) o ${Math.round(rozdil * 100)}\u00a0%.`);
      }
      const vystup = {
        stav: "hotovo", schema: SCHEMA,
        adresa: am ? { text: am.adresa, kodAdresnihoMista: am.kod } : { text },
        budova, ...vysledek,
        zdroje: Object.values(Object.fromEntries(zdroje.map((z) => [`${z.nazev}|${z.co}`, z]))),
        upozorneni: [...new Set(upozorneni)],
        vytvoreno: new Date(t).toISOString(),
      };
      try { await store.setJSON(klic, { ulozeno: t, vysledek: vystup }); } catch { /* bez mezipaměti */ }
      return json(vystup);
    } catch (e) {
      return json({ chyba: "Mapové služby ČÚZK teď neodpovídají – zkuste to za chvíli.", detail: e?.status || null }, 503);
    }
  };
}

export default vytvorMereni();

export const config = { path: "/api/mereni" };
