// /api/asistent – veřejný H-BOT. AI spolupracují: jedna napíše odpověď ze schválených znalostí,
// druhá (jiný poskytovatel) ji ověří a případně opraví. Web na AI nezávisí: bez klíče, po vyčerpání
// rozpočtu, při limitu nebo chybě vrátí stav, podle kterého prohlížeč odpoví z ověřených FAQ.
//   GET  -> { ai: boolean, poskytovatele: ["Claude", …] }
//   POST { zpravy: [{ role, text }], stranka?, _honey? } -> { rezim: "ai", odpoved, overeno, ai: [...] }
//        nebo { rezim: "bez-ai" | "limit" | "predat" | "chyba" } (prohlížeč pak použije FAQ / zavolání zpět)
//        S hlavičkou Accept: application/x-ndjson přijde nejdřív živý průběh spolupráce, pak výsledek.
import { POSKYTOVATELE, jeZapnuty, vytvorAdaptery, sLimitem } from "../lib/ai/poskytovatele.mjs";
import { PRAVIDLA_PRAVDIVOSTI, POKYN_ZAKAZNIK, POKYN_KONTROLOR } from "../lib/ai/pravidla.mjs";
import { znalostiProAI } from "../lib/ai/znalosti.mjs";
import { vychoziUloziste, otiskKlienta, povolVerejnyDotaz, zapisUtratu, rozpocetVycerpan } from "../lib/ai/limity.mjs";

const MAX_ZPRAV = 8;
const MAX_ZNAKU = 600;
// Časový rozpočet jednoho dotazu: prohlížeč čeká max. 12 s, pak odpoví z FAQ.
const CASY = { celkem: 9000, maxNavrh: 6500, minNavrh: 3500, minKontrola: 2500 };

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });

const aiZapnuto = (env) => env.AI_ZAPNUTO !== "0";

export function poradi(env) {
  const chtene = (env.ASISTENT_PORADI || "claude,gemini,gpt,grok").split(",").map((s) => s.trim());
  return chtene.filter((id) => POSKYTOVATELE[id] && jeZapnuty(id, env));
}

// Z odpovědi kontrolora vytáhne JSON i tehdy, když ho AI obalí textem nebo ```.
export function prectiVerdikt(text) {
  const m = String(text || "").match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const v = JSON.parse(m[0]);
    return typeof v.ok === "boolean" ? { ok: v.ok, odpoved: typeof v.odpoved === "string" ? v.odpoved.trim() : "" } : null;
  } catch {
    return null;
  }
}

// Telefon a e-mail z textu návštěvníka do AI neodchází (patří do formuláře, ne k poskytovateli AI).
export function maskujKontakty(t) {
  return t
    .replace(/[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/gi, "[e-mail]")
    .replace(/(?:\+|00)?\d[\d \-/().]{7,}\d/g, (m) => (m.replace(/\D/g, "").length >= 9 ? "[telefon]" : m));
}

function platneZpravy(zpravy) {
  if (!Array.isArray(zpravy) || !zpravy.length || zpravy.length > MAX_ZPRAV) return null;
  const vycistene = zpravy.map((z) => ({ role: z?.role, text: typeof z?.text === "string" ? maskujKontakty(z.text.trim().slice(0, MAX_ZNAKU)) : "" }));
  const ok = vycistene.every((z) => (z.role === "user" || z.role === "assistant") && z.text) && vycistene.at(-1).role === "user";
  return ok ? vycistene : null;
}

export function vytvorAsistenta({ env = process.env, adaptery, uloziste, ted = () => Date.now(), znalosti, casy = CASY } = {}) {
  let ul = uloziste;
  const dejUloziste = async () => (ul ||= await vychoziUloziste());
  const dejAdaptery = () => adaptery || vytvorAdaptery(env);
  const textZnalosti = () => znalosti ?? znalostiProAI();

  return async function handler(req, context = {}) {
    const dostupne = aiZapnuto(env) ? poradi(env) : [];

    if (req.method === "GET") {
      let vycerpano = false;
      try {
        vycerpano = dostupne.length > 0 && (await rozpocetVycerpan(await dejUloziste(), env, ted()));
      } catch {
        vycerpano = true; // bez úložiště AI nevoláme (viz POST)
      }
      const ai = dostupne.length > 0 && !vycerpano;
      return json({ ai, poskytovatele: ai ? dostupne.map((id) => POSKYTOVATELE[id].nazev) : [] }, 200, { "cache-control": "public, max-age=60" });
    }
    if (req.method !== "POST") return json({ rezim: "chyba", chyba: "Použijte GET nebo POST." }, 405);

    let telo;
    try {
      telo = await req.json();
    } catch {
      return json({ rezim: "chyba", chyba: "Neplatný JSON." }, 400);
    }
    if (telo?._honey) return json({ rezim: "predat" }); // robot vyplnil skryté pole
    const zpravy = platneZpravy(telo?.zpravy);
    if (!zpravy) return json({ rezim: "chyba", chyba: "Neplatné zprávy." }, 400);
    if (!dostupne.length) return json({ rezim: "bez-ai" }, 503);

    const start = ted();
    const zbyva = () => casy.celkem - (ted() - start);
    let store;
    try {
      store = await dejUloziste();
      if (await rozpocetVycerpan(store, env, start)) return json({ rezim: "bez-ai", duvod: "rozpocet" }, 503);
      const klient = otiskKlienta(context.ip || req.headers.get("x-nf-client-connection-ip"), start);
      const povoleno = await povolVerejnyDotaz(store, klient, env, start);
      if (!povoleno.ok) return json({ rezim: "limit" }, 429);
    } catch (e) {
      // Bez úložiště nejde hlídat limity ani rozpočet → AI se nevolá (ochrana kreditů), odpoví FAQ.
      console.warn("asistent: úložiště nedostupné, AI vypnuta", e?.message);
      return json({ rezim: "bez-ai", duvod: "uloziste" }, 503);
    }

    const ad = dejAdaptery();
    const system = `${PRAVIDLA_PRAVDIVOSTI}\n\n${POKYN_ZAKAZNIK}\n\n${textZnalosti()}`;
    // Útrata se zapisuje souběžně s odpovědí; Netlify ji nechá doběhnout přes waitUntil.
    const zapisy = [];
    const zapis = (id, stat) => store && zapisy.push(zapisUtratu(store, id, stat, env, ted()).catch(() => {}));
    const dokonci = () => {
      const hotovo = Promise.allSettled(zapisy);
      if (typeof context.waitUntil === "function") context.waitUntil(hotovo);
      return hotovo;
    };

    // Spolupráce AI. emit() hlásí průběh (kdo právě píše / ověřuje) – prohlížeč ho ukazuje živě.
    async function spoluprace(emit) {
      const selhane = new Set();
      // 1) Návrh: první dostupná AI; při chybě zkusí další, dokud zbývá čas.
      let navrh = null;
      let autor = null;
      for (const id of dostupne) {
        if (zbyva() < casy.minNavrh) break;
        emit({ krok: "navrh", ai: POSKYTOVATELE[id].nazev });
        try {
          const r = await sLimitem(Math.min(casy.maxNavrh, zbyva() - casy.minKontrola), (signal) =>
            ad[id].dotaz({ system, zpravy, maxTokenu: 700, signal, rychle: true }),
          );
          zapis(id, r.stat);
          if (r.text.trim()) {
            navrh = r.text.trim();
            autor = id;
            break;
          }
        } catch (e) {
          selhane.add(id);
          console.warn(`asistent: ${id} návrh selhal`, e?.status || "", e?.message);
        }
      }
      if (!navrh) return [{ rezim: "chyba" }, 502];

      // 2) Kontrola: jiná AI ověří návrh proti znalostem. Když druhá AI není nebo nestihne, vrátí se
      //    návrh (je psaný jen ze znalostí) s příznakem overeno=false.
      const kontrolor = dostupne.find((id) => id !== autor && !selhane.has(id));
      let odpoved = navrh;
      let overeno = false;
      const ai = [POSKYTOVATELE[autor].nazev];
      if (kontrolor && zbyva() >= casy.minKontrola) {
        emit({ krok: "kontrola", ai: POSKYTOVATELE[kontrolor].nazev });
        try {
          const otazka = zpravy.at(-1).text;
          const r = await sLimitem(zbyva() - 300, (signal) =>
            ad[kontrolor].dotaz({
              system: `${PRAVIDLA_PRAVDIVOSTI}\n\n${POKYN_KONTROLOR}\n\n${textZnalosti()}`,
              zpravy: [{ role: "user", text: `OTÁZKA NÁVŠTĚVNÍKA:\n${otazka}\n\nNÁVRH ODPOVĚDI:\n${navrh}` }],
              maxTokenu: 700,
              signal,
              rychle: true,
            }),
          );
          zapis(kontrolor, r.stat);
          const v = prectiVerdikt(r.text);
          if (v) {
            ai.push(POSKYTOVATELE[kontrolor].nazev);
            if (v.ok) overeno = true;
            else if (v.odpoved) {
              odpoved = v.odpoved;
              overeno = true;
            } else return [{ rezim: "predat", ai }, 200];
          }
        } catch (e) {
          console.warn(`asistent: ${kontrolor} kontrola selhala`, e?.status || "", e?.message);
        }
      }
      return [{ rezim: "ai", odpoved, overeno, ai }, 200];
    }

    // Prohlížeč, který umí průběh, pošle Accept: application/x-ndjson – dostane řádky JSON:
    // {"krok":"navrh","ai":"Claude"} … {"krok":"kontrola","ai":"Gemini"} … a nakonec výsledek s "rezim".
    if ((req.headers.get("accept") || "").includes("application/x-ndjson")) {
      const enc = new TextEncoder();
      const body = new ReadableStream({
        async start(ctrl) {
          const posli = (o) => ctrl.enqueue(enc.encode(JSON.stringify(o) + "\n"));
          try {
            const [data] = await spoluprace(posli);
            posli(data);
          } catch (e) {
            console.warn("asistent: neočekávaná chyba", e?.message);
            posli({ rezim: "chyba" });
          }
          await dokonci();
          ctrl.close();
        },
      });
      return new Response(body, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
    }
    const [data, status] = await spoluprace(() => {});
    await dokonci();
    return json(data, status);
  };
}

export default vytvorAsistenta();

export const config = { path: "/api/asistent" };
