// /api/konkurence – kontrola nabídky jiného zhotovitele proti Standardu HOLUB (veřejné, bez přihlášení).
//   GET  -> { maxZnaku, limitZaHodinu, ai: boolean }
//   POST { text, ai?: true } – text nabídky (prohlížeč ho vytáhne z PDF; nejvýš 30 000 znaků)
//     -> { radky: [{ id, kriterium, standardHolub, vNabidce: "uvedeno"|"neuvedeno", citace }], souhrn, upozorneni, ai }
// Přehled je deterministický (lib/konkurence/kontrola.mjs) a nabídku ani zhotovitele nehodnotí (§ 2980 OZ).
// Text nabídky se NIKAM neukládá ani neloguje – porovná se jen v paměti. Limit 10 kontrol za hodinu na otisk
// IP (limity.mjs: SHA-256 dne a IP, adresa se neukládá) a 300 za den celkem; tělo požadavku nejvýš 160 kB.
// AI shrnutí jen na vyžádání (ai: true) a se zapnutou zákaznickou AI: dostane jen řádky přehledu
// s pseudonymizovanými citacemi (ne celý text), levnější zákaznický model (R8), platí se z rozpočtu
// zákaznické AI (verejne = true). Bez AI přehled funguje stejně (KONTEXT §4.6).
import { povolenyOrigin } from "../lib/ai/autorizace.mjs";
import { vychoziUloziste, otiskKlienta, sitKlienta, pricti, rezervuj, zapisUtratu, rozpocetVycerpan, nactiNastaveni, odhadTokenu, odhadTokenuKlienta } from "../lib/ai/limity.mjs";
import { POSKYTOVATELE, jeZapnuty, vytvorAdaptery, sLimitem, verejneEnv, vlastniKlic } from "../lib/ai/poskytovatele.mjs";
import { PRAVIDLA_PRAVDIVOSTI } from "../lib/ai/pravidla.mjs";
import { vytvorPseudonymizaci, znackyNaStitky } from "../lib/ai/pseudonymizace.mjs";
import { kontrolujNabidku, MAX_ZNAKU, UPOZORNENI } from "../lib/konkurence/kontrola.mjs";

const MAX_BAJTU = 160_000; // 30 000 znaků × až 4 bajty UTF-8 + obálka JSON
const LIMIT_HODINA = 10;
const LIMIT_DEN = 300;
const AI_PORADI = ["claude", "gemini", "gpt"];
const AI_MAX_TOKENU = 500;
const AI_LIMIT_MS = 9000;

export const POKYN_SHRNUTI = `Dostaneš přehled bodů Standardu HOLUB a u každého, zda ho text nabídky jiného zhotovitele zmiňuje („uvedeno“ s citací) nebo ne („neuvedeno“).
Napiš 2–4 krátké věty: které body text nabídky popisuje a na které se zákazník může zhotovitele doptat.
Nehodnoť nabídku ani zhotovitele, nesrovnávej ceny ani kvalitu, nedoporučuj žádnou firmu a nic nepřidávej nad rámec přehledu.
Bez Markdownu. Značky v hranatých závorkách ponech beze změny.`;

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });
const den = (ted) => new Date(ted).toISOString().slice(0, 10);

// Tělo s horní mezí velikosti (i bez hlavičky content-length).
async function nactiTelo(req, max) {
  if (Number(req.headers.get("content-length")) > max) return null;
  if (!req.body) return "";
  const cteni = req.body.getReader();
  const kusy = [];
  let n = 0;
  for (;;) {
    const { done, value } = await cteni.read();
    if (done) break;
    n += value.byteLength;
    if (n > max) { try { await cteni.cancel(); } catch {} return null; }
    kusy.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(kusy));
}

export function vytvorKonkurenci({ env = process.env, adaptery, uloziste, ted = () => Date.now() } = {}) {
  let ul = uloziste;
  const dejUloziste = async () => (ul ||= await vychoziUloziste());
  const envV = verejneEnv(env); // zákazníci: levnější modely (R8)
  const aiId = () => (env.AI_ZAPNUTO === "0" ? null : AI_PORADI.find((id) => jeZapnuty(id, envV)) || null);

  // Volitelné AI shrnutí z řádků přehledu (ne z celého textu). Vrací { text, model } nebo { stav }.
  async function shrnuti(store, radky, t0) {
    const id = aiId();
    if (!id) return { stav: "nedostupne" };
    try {
      if ((await nactiNastaveni(store)).verejnaAI === false || (await rozpocetVycerpan(store, env, t0, true))) return { stav: "nedostupne" };
    } catch {
      return { stav: "nedostupne" };
    }
    const ps = vytvorPseudonymizaci();
    const prehled = radky.map((r) => `- ${r.kriterium}: ${r.vNabidce}${r.vNabidce === "uvedeno" ? ` – „${ps.pseudonymizuj(r.citace)}“` : ""}`).join("\n");
    const system = `${PRAVIDLA_PRAVDIVOSTI}\n\n${POKYN_SHRNUTI}`;
    const model = POSKYTOVATELE[id].model(envV);
    const vlastni = Boolean(vlastniKlic(id, envV));
    let rezerva;
    try {
      rezerva = await rezervuj(store, id, odhadTokenu(system) + odhadTokenuKlienta(prehled), AI_MAX_TOKENU, envV, t0, model, true, vlastni);
    } catch {
      return { stav: "nedostupne" };
    }
    if (rezerva === false) return { stav: "rozpocet" };
    const ad = adaptery || vytvorAdaptery(envV);
    try {
      const r = await sLimitem(AI_LIMIT_MS, (signal) => ad[id].dotaz({ system, zpravy: [{ role: "user", text: `PŘEHLED:\n${prehled}` }], maxTokenu: AI_MAX_TOKENU, signal, rychle: true }));
      try { await zapisUtratu(store, id, r.stat, envV, t0, rezerva, model, true, vlastni); } catch {}
      const text = znackyNaStitky(String(r.text || "").trim()); // veřejná odpověď: žádné zpětné doplnění
      return text ? { text, model: POSKYTOVATELE[id].nazev, poznamka: "Shrnutí napsala AI jen z přehledu výše." } : { stav: "chyba" };
    } catch (e) {
      if (e?.status >= 400 && e.status <= 599 && e.status !== 504 && e.status !== 422) {
        try { await zapisUtratu(store, id, { vstup: 0, vystup: 0 }, envV, t0, rezerva, model, true, vlastni); } catch {}
      }
      return { stav: "chyba" };
    }
  }

  return async function handler(req, context = {}) {
    if (req.method === "GET") {
      // Zaškrtávátko „shrnutí od AI“ jen tehdy, když ho POST opravdu může dát (vypínač v panelu, rozpočet, klíč).
      let ai = Boolean(aiId());
      if (ai) {
        try {
          const store = await dejUloziste();
          ai = (await nactiNastaveni(store)).verejnaAI !== false && !(await rozpocetVycerpan(store, env, ted(), true));
        } catch { ai = false; }
      }
      return json({ maxZnaku: MAX_ZNAKU, limitZaHodinu: LIMIT_HODINA, ai }, 200, { "cache-control": "public, max-age=60" });
    }
    if (req.method !== "POST") return json({ chyba: "Použijte POST." }, 405, { allow: "GET, POST" });
    if (!povolenyOrigin(req.headers.get("origin"), env)) return json({ chyba: "Nepovolený původ požadavku." }, 403);

    const surove = await nactiTelo(req, MAX_BAJTU);
    if (surove === null) return json({ chyba: `Text nabídky je příliš dlouhý (nejvýš ${MAX_ZNAKU.toLocaleString("cs-CZ")} znaků).` }, 413);
    let telo;
    try {
      telo = JSON.parse(surove);
    } catch {
      return json({ chyba: "Neplatný JSON." }, 400);
    }
    const text = typeof telo?.text === "string" ? telo.text.trim() : "";
    if (!text) return json({ chyba: "Chybí text nabídky." }, 400);
    if (text.length > MAX_ZNAKU) return json({ chyba: `Text nabídky je příliš dlouhý (nejvýš ${MAX_ZNAKU.toLocaleString("cs-CZ")} znaků).` }, 413);

    const t0 = ted();
    let store;
    try {
      store = await dejUloziste();
      const klient = otiskKlienta(sitKlienta(context.ip || req.headers.get("x-nf-client-connection-ip")), t0);
      if (!(await pricti(store, `limit/konkurence/${klient}`, LIMIT_HODINA, 3_600_000, t0))) return json({ chyba: "Kontrol nabídek bylo za poslední hodinu moc. Zkuste to později." }, 429);
      if (!(await pricti(store, `limit/konkurence-den/${den(t0)}`, LIMIT_DEN, 86_400_000, t0))) return json({ chyba: "Dnešní limit kontrol nabídek je vyčerpaný. Zkuste to zítra." }, 429);
    } catch {
      // Bez úložiště nejde hlídat limit → kontrola se neprovede (ochrana proti zneužití). Text se neloguje.
      console.warn("konkurence: úložiště limitů nedostupné");
      return json({ chyba: "Kontrola teď není dostupná. Zkuste to za chvíli." }, 503);
    }

    const { radky, souhrn } = kontrolujNabidku(text);
    const ai = telo.ai === true ? await shrnuti(store, radky, t0) : null;
    return json({ radky, souhrn, upozorneni: UPOZORNENI, ai });
  };
}

export default vytvorKonkurenci();

export const config = { path: "/api/konkurence" };
