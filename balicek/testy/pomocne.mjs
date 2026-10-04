// Společné pomůcky testů: falešné AI adaptéry (žádné skutečné volání, žádné peníze) a prostředí.
import { pametoveUloziste, mesic } from "../web/netlify/lib/ai/limity.mjs";
import { mistni } from "../web/netlify/lib/pocasi/ical.mjs";

export const HESLO = "testovaci-heslo-1234567";

export function env(extra = {}) {
  return {
    HSPG_PANEL_HESLO: HESLO,
    // Testy podepisují tokeny tajemstvím z prostředí; cestu přes Netlify Blobs ověřuje samostatný test.
    HSPG_TOKEN_TAJEMSTVI: "testovaci-tajemstvi-serveru-0123456789",
    ANTHROPIC_API_KEY: "test",
    GEMINI_API_KEY: "test",
    OPENAI_API_KEY: "test",
    ...extra,
  };
}

const cekej = (ms, signal) =>
  new Promise((ok, chyba) => {
    const t = setTimeout(ok, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      chyba(Object.assign(new Error("aborted"), { name: "AbortError" }));
    });
  });

// chovani: { text, zpozdeni, chyba, kontrola: (zpravy) => text }
export function falesnyAdapter(chovani = {}) {
  const volani = [];
  return {
    volani,
    async dotaz(p) {
      volani.push(p);
      if (chovani.zpozdeni) await cekej(chovani.zpozdeni, p.signal);
      if (chovani.chyba) throw Object.assign(new Error(chovani.chyba), { status: 500 });
      const text = typeof chovani.text === "function" ? chovani.text(p) : (chovani.text ?? "Odpověď.");
      return { text, stat: { vstup: 100, vystup: 50 } };
    },
    async *stream(p) {
      volani.push(p);
      if (chovani.chyba) throw Object.assign(new Error(chovani.chyba), { status: 500 });
      const text = typeof chovani.text === "function" ? chovani.text(p) : (chovani.text ?? "Streamovaná odpověď.");
      for (const kus of text.match(/.{1,5}/gs) || []) {
        if (chovani.zpozdeni) await cekej(chovani.zpozdeni, p.signal);
        yield { text: kus };
      }
      yield { stat: { vstup: 120, vystup: 60 } };
    },
  };
}

export { pametoveUloziste };

export function pozadavek(url, { method = "GET", body, headers = {} } = {}) {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
}

// Klíč rozpočtu pro aktuální období kreditů (stejně jako ho počítá limity.mjs; AI_OBDOBI_DEN výchozí 11).
export const obdobi = (e = {}, ted = Date.now()) => mesic(ted, e);

// --- H-WEATHER CONTROL / plánovač (úkol 21) ---------------------------------------------------------
// Falešná předpověď (žádné volání MET Norway): deterministická řada od začátku aktuální hodiny – 48 hodinových
// bloků, pak šestihodinové bloky do 9. dne. Srážky po dnech od dneška (mm/den): dny se srážkami jsou
// 2 (5 mm), 4 (2 mm) a 7 (8 mm) podle místního data v Česku, ostatní suché (souhrnDne přesně odpovídá u dnů
// s hodinovými bloky; u šestihodinových se srážky mohou přelít do sousedního dne – testy to berou v úvahu); teplota 8–18 °C, vítr 3 m/s, vlhkost 70 %.
export const SRAZKY_DNY = [0, 0, 5, 0, 2, 0, 0, 8, 0, 0];
export function falesnaRada(ted = Date.now()) {
  const HOD = 36e5;
  const start = Math.floor(ted / HOD) * HOD;
  // Index dne podle místního data v Česku (stejně jako plánovač), ne podle UTC.
  const dnes = Date.parse(`${mistni(start).datum}T00:00:00Z`);
  const den = (ms) => Math.round((Date.parse(`${mistni(ms).datum}T00:00:00Z`) - dnes) / 864e5);
  const pulnoc = dnes;
  const teplota = (ms) => 13 + 5 * Math.sin(((ms / HOD) % 24 - 9) / 24 * 2 * Math.PI);
  const rada = [];
  let t = start;
  while (t < start + 48 * HOD) {
    rada.push({ od: t, teplota: teplota(t), vitr: 3, narazy: null, vlhkost: 70, srazky: (SRAZKY_DNY[den(t)] || 0) / 24, srazkyHodin: 1, pravdepodobnost: null, teplotaMinBlok: null, teplotaMaxBlok: null });
    t += HOD;
  }
  while (t < pulnoc + 9 * 864e5) {
    rada.push({ od: t, teplota: teplota(t), vitr: 3, narazy: null, vlhkost: 70, srazky: (SRAZKY_DNY[den(t)] || 0) / 4, srazkyHodin: 6, pravdepodobnost: null, teplotaMinBlok: 8, teplotaMaxBlok: 18 });
    t += 6 * HOD;
  }
  return rada;
}
export function falesnaPredpoved(ted = () => Date.now()) {
  const volani = [];
  const f = async (lat, lon, vyska) => {
    volani.push({ lat, lon, vyska });
    return { lat, lon, aktualizovano: new Date(ted()).toISOString(), rada: falesnaRada(ted()), zdroj: { nazev: "MET Norway" }, zastarale: false };
  };
  f.volani = volani;
  return f;
}
// Falešný kalendář zakázek: zítra zakázka v Kolíně, pozítří v Lipové (nejednoznačná obec), za 3 dny dvě akce.
export function falesnyKalendar(ted = () => Date.now()) {
  return async () => {
    const d = (o) => new Date(ted() + o * 864e5).toISOString().slice(0, 10);
    return {
      nastaveno: true,
      udalosti: [
        { uid: "z1", nazev: "Impregnace střechy – Novák", misto: "Lipová 12, 280 02 Kolín, Česko", popis: "", dny: [d(1)], celyDen: false, hodinyOd: 8, hodinyDo: 15 },
        { uid: "z2", nazev: "Mytí dlažby", misto: "Lipová", popis: "", dny: [d(2)], celyDen: true, hodinyOd: null, hodinyDo: null },
        { uid: "z3", nazev: "Čištění FVE", misto: "Praha 8", popis: "", dny: [d(3)], celyDen: true, hodinyOd: null, hodinyDo: null },
      ],
      preskoceno: { opakovane: 0, zrusene: 0, bezCasu: 0 },
    };
  };
}
