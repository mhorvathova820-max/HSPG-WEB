// /api/majitel – přihlášení majitele do plovoucího panelu „Vše ve tvých rukách“ a do AI centra.
//   POST { heslo } -> { token, platnost }   (5 neúspěšných pokusů / 15 min, pak 429)
//   GET  (Authorization: Bearer …) -> { ok: true } | 401
import { overHeslo, vydejToken, overPozadavek, hesloNastaveno, povolenyOrigin } from "../lib/ai/autorizace.mjs";
import { vychoziUloziste, otiskKlienta, povolPokusOPrihlaseni, zapisNeuspesnePrihlaseni } from "../lib/ai/limity.mjs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const pockej = (ms) => new Promise((r) => setTimeout(r, ms));

export function vytvorPrihlaseni({ env = process.env, uloziste, ted = () => Date.now(), zdrzeniMs = 1200 } = {}) {
  let ul = uloziste;
  const dejUloziste = async () => (ul ||= await vychoziUloziste());

  return async function handler(req, context = {}) {
    if (req.method === "GET") {
      const a = overPozadavek(req, env, ted());
      return a.ok ? json({ ok: true }) : json({ chyba: a.duvod }, a.status);
    }
    if (req.method !== "POST") return json({ chyba: "Použijte POST." }, 405);
    if (!povolenyOrigin(req.headers.get("origin"), env)) return json({ chyba: "Nepovolený původ požadavku." }, 403);
    if (!hesloNastaveno(env)) return json({ chyba: "HSPG_PANEL_HESLO není v Netlify nastavené (min. 16 znaků)." }, 503);

    const klient = otiskKlienta(context.ip || req.headers.get("x-nf-client-connection-ip"), ted());
    let store = null;
    try {
      store = await dejUloziste();
      if (!(await povolPokusOPrihlaseni(store, klient, ted()))) return json({ chyba: "Příliš mnoho pokusů. Zkuste to za 15 minut." }, 429);
    } catch {
      // Bez úložiště zůstává ochranou aspoň zdržení po chybném hesle.
    }

    let heslo = "";
    try {
      heslo = String((await req.json())?.heslo || "");
    } catch {
      return json({ chyba: "Neplatný JSON." }, 400);
    }
    if (!overHeslo(heslo, env)) {
      if (store) await zapisNeuspesnePrihlaseni(store, klient, ted()).catch(() => {});
      await pockej(zdrzeniMs);
      return json({ chyba: "Špatné heslo." }, 401);
    }
    return json(vydejToken(env, ted()));
  };
}

export default vytvorPrihlaseni();

// Bez pravidla Netlify: tarif Personal má jen 2 pravidla v kódu (mají je /api/asistent a /media/*).
// Hádání hesla brzdí zámek 5 pokusů / 15 min v Netlify Blobs a zdržení po chybě.
export const config = { path: "/api/majitel" };
