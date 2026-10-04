// /api/majitel – přihlášení majitele do plovoucího panelu „Vše ve tvých rukách“ a do AI centra.
//   POST { heslo } -> { token, platnost }   (5 pokusů / 15 min, pak 429; bez úložiště 503)
//   GET  (Authorization: Bearer …) -> { ok: true } | 401
import { overHeslo, vydejToken, overPozadavek, hesloNastaveno, povolenyOrigin, tajemstviServeru } from "../lib/ai/autorizace.mjs";
import { vychoziUloziste, otiskKlienta, povolPokusOPrihlaseni } from "../lib/ai/limity.mjs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const pockej = (ms) => new Promise((r) => setTimeout(r, ms));

// Bez umělého zdržení: hádání brzdí atomický zámek 5 pokusů / 15 min; zdržení by jen pálilo výpočetní kredity.
export function vytvorPrihlaseni({ env = process.env, uloziste, ted = () => Date.now(), zdrzeniMs = 0 } = {}) {
  let ul = uloziste;
  const dejUloziste = async () => (ul ||= await vychoziUloziste());

  return async function handler(req, context = {}) {
    if (req.method === "GET") {
      const a = await overPozadavek(req, env, ted(), dejUloziste);
      return a.ok ? json({ ok: true }) : json({ chyba: a.duvod }, a.status);
    }
    if (req.method !== "POST") return json({ chyba: "Použijte POST." }, 405);
    if (!povolenyOrigin(req.headers.get("origin"), env)) return json({ chyba: "Nepovolený původ požadavku." }, 403);
    if (!hesloNastaveno(env)) return json({ chyba: "HSPG_PANEL_HESLO není v Netlify nastavené (min. 16 znaků)." }, 503);

    const klient = otiskKlienta(context.ip || req.headers.get("x-nf-client-connection-ip"), ted());
    let heslo = "";
    try {
      heslo = String((await req.json())?.heslo || "");
    } catch {
      return json({ chyba: "Neplatný JSON." }, 400);
    }
    // Pokus se započítá dřív, než se heslo ověří (atomicky) – souběžné požadavky limit neobejdou.
    // Bez úložiště se přihlášení odmítne: zámek proti hádání hesla je povinný.
    let tajemstvi;
    try {
      const store = await dejUloziste();
      if (!(await povolPokusOPrihlaseni(store, klient, ted()))) return json({ chyba: "Příliš mnoho pokusů. Zkuste to za 15 minut." }, 429);
      if (!overHeslo(heslo, env)) {
        if (zdrzeniMs) await pockej(zdrzeniMs);
        return json({ chyba: "Špatné heslo." }, 401);
      }
      tajemstvi = await tajemstviServeru(env, store);
    } catch {
      return json({ chyba: "Přihlášení je dočasně nedostupné. Zkuste to za chvíli." }, 503);
    }
    return json(vydejToken(env, ted(), tajemstvi));
  };
}

export default vytvorPrihlaseni();

// Bez pravidla Netlify: tarif Personal má jen 2 pravidla v kódu (mají je /api/asistent a /media/*).
// Hádání hesla brzdí atomický zámek 5 pokusů / 15 min v Netlify Blobs.
export const config = { path: "/api/majitel" };
