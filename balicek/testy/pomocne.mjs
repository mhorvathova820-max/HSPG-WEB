// Společné pomůcky testů: falešné AI adaptéry (žádné skutečné volání, žádné peníze) a prostředí.
import { pametoveUloziste, mesic } from "../web/netlify/lib/ai/limity.mjs";

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
