// /api/majitel – přihlášení majitele do plovoucího panelu „Vše ve tvých rukách“ a do AI centra.
//   POST { heslo } -> { token, platnost }   (5 pokusů / 15 min, pak 429; bez úložiště 503)
//   GET  (Authorization: Bearer …) -> { ok: true } | 401
import { overHeslo, vydejToken, overPozadavek, hesloNastaveno, povolenyOrigin, tajemstviServeru, vydejZarizeni, overZarizeni } from "../lib/ai/autorizace.mjs";
import { vychoziUloziste, otiskKlienta, sitKlienta, povolPokusOPrihlaseni, vratPokusOPrihlaseni } from "../lib/ai/limity.mjs";

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

    const t = ted(); // jeden čas pro zámek i jeho vrácení (stejný klíč)
    const klient = otiskKlienta(sitKlienta(context.ip || req.headers.get("x-nf-client-connection-ip")), t);
    let heslo = "";
    let zarizeni = "";
    try {
      const telo = await req.json();
      heslo = String(telo?.heslo || "");
      zarizeni = String(telo?.zarizeni || "");
    } catch {
      return json({ chyba: "Neplatný JSON." }, 400);
    }
    // Pokus se započítá dřív, než se heslo ověří (atomicky) – souběžné požadavky limit neobejdou.
    // Bez úložiště se přihlášení odmítne: zámek proti hádání hesla je povinný.
    let tajemstvi;
    let zname;
    try {
      const store = await dejUloziste();
      tajemstvi = await tajemstviServeru(env, store);
      zname = overZarizeni(zarizeni, t, tajemstvi);
      const povoleno = await povolPokusOPrihlaseni(store, klient, t, zname);
      if (povoleno === "klient") return json({ chyba: "Příliš mnoho pokusů. Zkuste to za 15 minut." }, 429);
      if (povoleno !== true) return json({ chyba: "Přihlášení je kvůli mnoha pokusům dočasně zamčené. Zkuste to za hodinu." }, 429);
      if (!overHeslo(heslo, env)) {
        if (zdrzeniMs) await pockej(zdrzeniMs);
        return json({ chyba: "Špatné heslo." }, 401);
      }
      // Úspěch se do zámku nepočítá (majitel se přihlašuje v každé nové kartě).
      await vratPokusOPrihlaseni(store, klient, { celkem: !zname }).catch(() => {});
    } catch {
      return json({ chyba: "Přihlášení je dočasně nedostupné. Zkuste to za chvíli." }, 503);
    }
    return json({ ...vydejToken(env, t, tajemstvi), zarizeni: vydejZarizeni(t, tajemstvi) });
  };
}

export default vytvorPrihlaseni();

// Bez pravidla Netlify: tarif Personal má jen 2 pravidla v kódu (mají je /api/asistent a /media/*).
// Hádání hesla brzdí atomický zámek 5 pokusů / 15 min v Netlify Blobs.
export const config = { path: "/api/majitel" };
