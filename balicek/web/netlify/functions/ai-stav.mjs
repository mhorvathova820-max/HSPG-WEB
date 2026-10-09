// /api/ai-stav – interní: které AI mají klíč (klíče samotné nikdy), útrata měsíce a limit.
//   GET  -> stav;  POST { verejnaAI: true|false } -> nouzový vypínač AI pro zákazníky (okamžitě, bez nasazení)
//   POST { modely: { claude: "claude-opus-5-5", gpt: "" … } } -> přepínač modelů majitele (Blobs, bez nasazení;
//   prázdný text = výchozí model). Klíče se nikdy nevrací – jen zda je nastavený vlastní klíč.
import { POSKYTOVATELE, jeZapnuty, vlastniKlic, nazevAI, sModely, MODEL_RE, PROMENNA_MODELU, VLASTNI_KLICE } from "../lib/ai/poskytovatele.mjs";
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
      if (telo?.modely && typeof telo.modely === "object") {
        const zmeny = Object.entries(telo.modely);
        if (!zmeny.length || zmeny.some(([id, m]) => !PROMENNA_MODELU[id] || typeof m !== "string" || (m !== "" && !MODEL_RE.test(m)))) {
          return json({ chyba: "Neplatný model (povolená písmena, číslice a . _ : / -, nejvýš 80 znaků)." }, 400);
        }
        try {
          const ul0 = await dejUloziste();
          const stare = (await nactiNastaveni(ul0)).modely || {};
          const modely = { ...stare };
          for (const [id, m] of zmeny) { if (m) modely[id] = m; else delete modely[id]; }
          return json({ nastaveni: await ulozNastaveni(ul0, { modely }, ted()) });
        } catch {
          return json({ chyba: "Úložiště není dostupné – zkuste to znovu." }, 503);
        }
      }
      if (typeof telo?.verejnaAI !== "boolean") return json({ chyba: "Očekávám { verejnaAI: true|false } nebo { modely: {…} }." }, 400);
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
      ai: Object.entries(POSKYTOVATELE).map(([id, p]) => {
        const envM = sModely(env, nastaveni?.modely);
        return {
          id, nazev: nazevAI(id, env), zapnuto: jeZapnuty(id, env), model: p.model(envM), modelVychozi: p.model(env),
          prepsano: Boolean(nastaveni?.modely?.[id]), modelZakaznik: p.model(verejneEnv(env)),
          // Kudy role běží: vlastní klíč majitele (účtuje poskytovatel) / Netlify AI Gateway (kredity).
          cesta: vlastniKlic(id, env) ? "vlastni-klic" : "gateway", klic: p.klic, vlastniKlicPromenna: VLASTNI_KLICE[id]?.promenna || null,
        };
      }),
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
