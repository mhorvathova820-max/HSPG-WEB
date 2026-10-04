// /api/ai-stav – interní: které AI mají klíč (klíče samotné nikdy), útrata měsíce a limit.
import { POSKYTOVATELE, jeZapnuty } from "../lib/ai/poskytovatele.mjs";
import { overPozadavek } from "../lib/ai/autorizace.mjs";
import { vychoziUloziste, utrataMesice, mesicniLimitKc, kcNaKredity } from "../lib/ai/limity.mjs";
import { pres_gateway, verejneEnv } from "../lib/ai/poskytovatele.mjs";

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export function vytvorStav({ env = process.env, uloziste, ted = () => Date.now() } = {}) {
  let ul = uloziste;
  const dejUloziste = async () => (ul ||= await vychoziUloziste());

  return async function handler(req) {
    const a = overPozadavek(req, env, ted());
    if (!a.ok) {
      await new Promise((r) => setTimeout(r, 800));
      return json({ chyba: a.duvod }, a.status);
    }
    let utrata = null;
    try {
      utrata = await utrataMesice(await dejUloziste(), ted());
    } catch {
      // Úložiště nedostupné – stav AI ukážeme i bez útraty.
    }
    return json({
      ai: Object.entries(POSKYTOVATELE).map(([id, p]) => ({ id, nazev: p.nazev, zapnuto: jeZapnuty(id, env), model: p.model(env), modelZakaznik: p.model(verejneEnv(env)), klic: p.klic })),
      verejnyAsistent: env.AI_ZAPNUTO !== "0",
      utrata,
      limitKc: mesicniLimitKc(env),
      // Přes Netlify AI Gateway se platí kredity Netlify – jejich vyčerpání pozastaví celý web.
      gateway: pres_gateway(env),
      kredity: utrata ? { utraceno: kcNaKredity(utrata.celkemKc, env), limit: kcNaKredity(mesicniLimitKc(env), env) } : null,
    });
  };
}

export default vytvorStav();

export const config = { path: "/api/ai-stav" };
