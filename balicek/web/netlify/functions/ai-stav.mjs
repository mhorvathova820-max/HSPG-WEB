// /api/ai-stav – interní: které AI mají klíč (klíče samotné nikdy), útrata měsíce a limit.
//   GET  -> stav;  POST { verejnaAI: true|false } -> nouzový vypínač AI pro zákazníky (okamžitě, bez nasazení)
import { POSKYTOVATELE, jeZapnuty } from "../lib/ai/poskytovatele.mjs";
import { overPozadavek } from "../lib/ai/autorizace.mjs";
import { vychoziUloziste, utrataMesice, mesic, zacatekObdobi, mesicniLimitKc, verejnyLimitKc, kcNaKredity, nactiNastaveni, ulozNastaveni } from "../lib/ai/limity.mjs";
import { pres_gateway, verejneEnv } from "../lib/ai/poskytovatele.mjs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export function vytvorStav({ env = process.env, uloziste, ted = () => Date.now() } = {}) {
  let ul = uloziste;
  const dejUloziste = async () => (ul ||= await vychoziUloziste());

  return async function handler(req) {
    const a = await overPozadavek(req, env, ted(), dejUloziste);
    if (!a.ok) return json({ chyba: a.duvod }, a.status);
    if (req.method === "POST") {
      let telo;
      try {
        telo = await req.json();
      } catch {
        return json({ chyba: "Neplatný JSON." }, 400);
      }
      if (typeof telo?.verejnaAI !== "boolean") return json({ chyba: "Očekávám { verejnaAI: true|false }." }, 400);
      try {
        return json({ nastaveni: await ulozNastaveni(await dejUloziste(), { verejnaAI: telo.verejnaAI }, ted()) });
      } catch {
        return json({ chyba: "Úložiště není dostupné – zkuste to znovu." }, 503);
      }
    }
    let utrata = null;
    let nastaveni = null;
    try {
      const ul0 = await dejUloziste();
      utrata = await utrataMesice(ul0, ted(), env);
      nastaveni = await nactiNastaveni(ul0);
    } catch {
      // Úložiště nedostupné – stav AI ukážeme i bez útraty.
    }
    return json({
      ai: Object.entries(POSKYTOVATELE).map(([id, p]) => ({ id, nazev: p.nazev, zapnuto: jeZapnuty(id, env), model: p.model(env), modelZakaznik: p.model(verejneEnv(env)), klic: p.klic })),
      verejnyAsistent: env.AI_ZAPNUTO !== "0" && nastaveni?.verejnaAI !== false,
      nastaveni,
      utrata,
      limitKc: mesicniLimitKc(env),
      // Období kreditů Netlify, za které se útrata počítá (AI_OBDOBI_DEN, výchozí 11.).
      obdobi: mesic(ted(), env),
      obdobiOd: zacatekObdobi(ted(), env),
      verejnyLimitKc: verejnyLimitKc(env),
      // Přes Netlify AI Gateway se platí kredity Netlify – jejich vyčerpání pozastaví celý web.
      gateway: pres_gateway(env),
      kredity: utrata ? { utraceno: kcNaKredity(utrata.celkemKc, env), limit: kcNaKredity(mesicniLimitKc(env), env) } : null,
    });
  };
}

export default vytvorStav();

export const config = { path: "/api/ai-stav" };
