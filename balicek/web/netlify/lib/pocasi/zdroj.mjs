// H-WEATHER CONTROL – zdroj předpovědi: MET Norway Locationforecast 2.0 (api.met.no).
// Bez klíče, data pod licencí CC BY 4.0 (komerční použití dovoleno, nutné uvést zdroj). Podmínky služby:
// identifikace User-Agentem s kontaktem, souřadnice nejvýš na 4 desetinná místa, respektovat Expires
// (a If-Modified-Since), žádné zbytečné dotazy. Proto mezipaměť v Netlify Blobs (úložiště „hspg-pocasi“)
// a v paměti instance; souřadnice se zaokrouhlí na 2 desetinná místa (~1 km), takže stejná obec = jeden dotaz.
// Ven odchází jen zaokrouhlená poloha obce – žádná adresa ani jméno.

export const MET_URL = "https://api.met.no/weatherapi/locationforecast/2.0/complete";
// Uvedení zdroje podle CC BY 4.0: autor, odkaz na licenci a že data byla upravena (vyhodnocení pro práci).
// Slovo „Yr“ ani logo Yr se podle podmínek MET nesmí používat.
export const ZDROJ = {
  nazev: "MET Norway",
  licence: "CC BY 4.0",
  odkazLicence: "https://creativecommons.org/licenses/by/4.0/",
  odkaz: "https://api.met.no/",
  text: "Na základě dat MET Norway (licence CC BY 4.0, https://creativecommons.org/licenses/by/4.0/), upraveno: vyhodnocení pro venkovní práce.",
};
const VYCHOZI_UA = "hspg.cz H-WEATHER CONTROL/1.0 (+https://hspg.cz; info@hspg.cz)";
const HOD = 36e5;
const LIMIT_MS = 8000;
const NEJKRATSI_PLATNOST_MS = 10 * 60e3; // i při krátkém Expires se stejné místo nedotazuje častěji
const NEJDELSI_ZASTARALOST_MS = 6 * HOD; // starší uložená předpověď se nepoužije ani při výpadku

export async function vychoziUlozistePocasi() {
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: "hspg-pocasi", consistency: "eventual" });
}

export const zaokrouhli = (x) => Math.round(Number(x) * 100) / 100;

// Odpověď MET → { aktualizovano, rada } (formát řady viz vyhodnoceni.mjs).
// Srážky: hodinové bloky, kde existují, jinak šestihodinové; kurzor zabrání dvojímu započtení na přechodu.
export function normalizujMet(json) {
  const ts = json?.properties?.timeseries;
  if (!Array.isArray(ts) || !ts.length) throw new Error("MET: odpověď bez předpovědi");
  const rada = [];
  let pokryto = -Infinity;
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i];
    const od = Date.parse(t.time);
    if (!Number.isFinite(od)) continue;
    const ins = t.data?.instant?.details || {};
    const dalsi = i + 1 < ts.length ? Date.parse(ts[i + 1].time) : null;
    const b = {
      od,
      teplota: num(ins.air_temperature),
      vitr: num(ins.wind_speed),
      narazy: num(ins.wind_speed_of_gust),
      vlhkost: num(ins.relative_humidity),
      srazky: null,
      srazkyHodin: 0,
      pravdepodobnost: null,
      teplotaMinBlok: null,
      teplotaMaxBlok: null,
    };
    if (od >= pokryto) {
      const n1 = t.data?.next_1_hours?.details, n6 = t.data?.next_6_hours?.details;
      if (n1 && num(n1.precipitation_amount) != null && dalsi === od + HOD) {
        Object.assign(b, { srazky: num(n1.precipitation_amount), srazkyHodin: 1, pravdepodobnost: num(n1.probability_of_precipitation) });
        pokryto = od + HOD;
      } else if (n6 && num(n6.precipitation_amount) != null) {
        Object.assign(b, {
          srazky: num(n6.precipitation_amount), srazkyHodin: 6, pravdepodobnost: num(n6.probability_of_precipitation),
          teplotaMinBlok: num(n6.air_temperature_min), teplotaMaxBlok: num(n6.air_temperature_max),
        });
        pokryto = od + 6 * HOD;
      } else if (n1 && num(n1.precipitation_amount) != null) {
        Object.assign(b, { srazky: num(n1.precipitation_amount), srazkyHodin: 1, pravdepodobnost: num(n1.probability_of_precipitation) });
        pokryto = od + HOD;
      }
    }
    rada.push(b);
  }
  return { aktualizovano: json?.properties?.meta?.updated_at || null, rada };
}

function num(x) {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

// Předpověď pro bod. Vrací { lat, lon, aktualizovano, rada, zdroj, zastarale } nebo vyhodí chybu
// (bez uložené kopie). fetchFn a uloziste jdou podstrčit v testech.
export function vytvorZdroj({ env = process.env, fetchFn = fetch, uloziste, ted = () => Date.now() } = {}) {
  const pamet = new Map();
  let ul = uloziste;
  const dejUloziste = async () => {
    if (ul !== undefined) return ul;
    try { ul = await vychoziUlozistePocasi(); } catch { ul = null; }
    return ul;
  };

  // vyska (m n. m., celé číslo) zpřesní teplotu – MET opravuje hrubý model 9 km podle výšky místa.
  return async function predpoved(lat, lon, vyska) {
    const la = zaokrouhli(lat), lo = zaokrouhli(lon);
    if (!(la >= -90 && la <= 90 && lo >= -180 && lo <= 180)) throw new Error("Neplatné souřadnice.");
    const alt = Number.isFinite(Number(vyska)) && vyska !== null && vyska !== "" ? Math.round(Math.min(5000, Math.max(-100, Number(vyska)))) : null;
    const klic = `met/${la.toFixed(2)}/${lo.toFixed(2)}${alt === null ? "" : `/${alt}`}`;
    const t = ted();
    let ulozeno = pamet.get(klic);
    const store = await dejUloziste();
    if (!ulozeno && store) {
      try { ulozeno = await store.get(klic, { type: "json" }); } catch { ulozeno = null; }
    }
    if (ulozeno?.plati > t) return vystup(la, lo, ulozeno, false);

    const hlavicky = { "user-agent": env.POCASI_USER_AGENT || VYCHOZI_UA, accept: "application/json" };
    if (ulozeno?.zmeneno) hlavicky["if-modified-since"] = ulozeno.zmeneno;
    const ac = new AbortController();
    const casovac = setTimeout(() => ac.abort(), LIMIT_MS);
    try {
      const r = await fetchFn(`${MET_URL}?lat=${la.toFixed(2)}&lon=${lo.toFixed(2)}${alt === null ? "" : `&altitude=${alt}`}`, { headers: hlavicky, signal: ac.signal });
      const plati = Math.max(t + NEJKRATSI_PLATNOST_MS, Date.parse(r.headers.get("expires") || "") || 0);
      let zaznam;
      if (r.status === 304 && ulozeno) zaznam = { ...ulozeno, plati, stazeno: t };
      else if (r.ok) zaznam = { ...normalizujMet(await r.json()), plati, stazeno: t, zmeneno: r.headers.get("last-modified") || null };
      else throw Object.assign(new Error(`MET: HTTP ${r.status}`), { status: r.status });
      pamet.set(klic, zaznam);
      if (store) await store.setJSON(klic, zaznam).catch(() => {});
      return vystup(la, lo, zaznam, false);
    } catch (e) {
      // Výpadek zdroje: raději nedávná uložená předpověď (s označením) než nic.
      if (ulozeno && t - (ulozeno.stazeno || 0) < NEJDELSI_ZASTARALOST_MS) return vystup(la, lo, ulozeno, true);
      throw e;
    } finally {
      clearTimeout(casovac);
    }
  };
}

function vystup(lat, lon, z, zastarale) {
  return { lat, lon, aktualizovano: z.aktualizovano, rada: z.rada, zdroj: ZDROJ, zastarale };
}
