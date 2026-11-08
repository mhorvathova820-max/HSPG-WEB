// /api/mapa – Mapy.com pro panel majitele (úkol 60). POST JSON { akce, … } s Authorization: Bearer (token panelu,
// OAuth brány nebo HSPG_MCP_TOKEN). Akce: adresa { dotaz, limit, typ, blizko } · zpetne { bod } · snimek { misto, zoom,
// sada, sirka, vyska, polygon } · panorama { misto, polomer, sirka, vyska } · trasa { start, cil, pruchozi, typ, bezDalnic,
// bezMyta, odjezd } · matice { body, cile, typ } · vyska { body } · stav. Obrázky se vrací jako data URL (base64) –
// klíč Mapy.com nikdy neopouští server. Limit 120 volání / 10 min společný s panelem a bránou; kredity hlídá adaptér.
import { vytvorMapy, mapyZapnuto, adresaText, KLIC_MAPY, TYPY_TRASY, SADY_MAP, kredityMesice } from "../lib/ai/mapy.mjs";
import { povolenyOrigin } from "../lib/ai/autorizace.mjs";
import { vychoziUloziste, pricti } from "../lib/ai/limity.mjs";
import { vytvorOvereniMajitele } from "../lib/ai/pristup-majitele.mjs";

const LIMIT_VOLANI = { klic: "limit/ai-majitel", pocet: 120, oknoMs: 10 * 60_000 };
const MAX_TELO = 100_000;
const json = (data, status = 200, hlavicky = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...hlavicky } });
const retezec = (v, n) => (typeof v === "string" ? v.slice(0, n).trim() : "");
const cele = (v, min, max, vychozi) => (v !== undefined && v !== null && v !== "" && Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Math.floor(Number(v)))) : vychozi);
const seznam = (a, n) => (Array.isArray(a) ? a.slice(0, n).map((x) => retezec(x, 200)).filter(Boolean) : []);
const dataUrl = (o) => `data:${o.mimeType || "image/jpeg"};base64,${o.base64}`;

export function vytvorMapaFunkci({ env = process.env, uloziste, ted = () => Date.now(), fetch: f } = {}) {
  let ul = uloziste;
  const dejUloziste = async () => (ul ||= await vychoziUloziste());
  const { overBearer, hlavicky401 } = vytvorOvereniMajitele({ env, dejUloziste, ted });

  async function vyrid(telo, store, signal) {
    const akce = retezec(telo.akce, 20);
    if (akce === "stav") return { zapnuto: mapyZapnuto(env), kredity: await kredityMesice(store, env, ted()) };
    if (!mapyZapnuto(env)) throw Object.assign(new Error(`Mapy.com nejsou zapnuté: chybí ${KLIC_MAPY} v Netlify.`), { status: 400 });
    const m = vytvorMapy({ env, fetch: f, store, ted });
    switch (akce) {
      case "adresa": {
        const polozky = await m.geokoduj({ dotaz: retezec(telo.dotaz, 150), limit: cele(telo.limit, 1, 15, 5), typ: retezec(telo.typ, 10) || "vse", blizko: retezec(telo.blizko, 60) || undefined }, signal);
        return { polozky: polozky.map((p) => ({ ...p, adresa: adresaText(p) })) };
      }
      case "zpetne": {
        const polozky = await m.zpetne({ bod: retezec(telo.bod, 60) }, signal);
        return { polozky: polozky.map((p) => ({ ...p, adresa: adresaText(p) })) };
      }
      case "snimek": {
        const b = await m.bod(retezec(telo.misto, 150), signal);
        const o = await m.snimek({ bod: [b.lon, b.lat], zoom: cele(telo.zoom, 12, 19, 19), sada: SADY_MAP.includes(telo.sada) ? telo.sada : "aerial", sirka: cele(telo.sirka, 100, 1024, 640), vyska: cele(telo.vyska, 100, 1024, 640), polygon: seznam(telo.polygon, 60) }, signal);
        return { bod: b, sada: o.sada, zoom: o.zoom, sirka: o.sirka, vyska: o.vyska, obrazek: dataUrl(o) };
      }
      case "panorama": {
        const b = await m.bod(retezec(telo.misto, 150), signal);
        try {
          const o = await m.panorama({ bod: [b.lon, b.lat], polomer: cele(telo.polomer, 0, 100, 50), sirka: cele(telo.sirka, 100, 1024, 800), vyska: cele(telo.vyska, 100, 1024, 500) }, signal);
          return { bod: b, panorama: true, obrazek: dataUrl(o) };
        } catch (e) {
          if (e?.status === 404) return { bod: b, panorama: false };
          throw e;
        }
      }
      case "trasa": {
        const [s, c] = await Promise.all([m.bod(retezec(telo.start, 150), signal), m.bod(retezec(telo.cil, 150), signal)]);
        const pruchozi = [];
        for (const p of seznam(telo.pruchozi, 15)) pruchozi.push(await m.bod(p, signal));
        const t = await m.trasa({ start: [s.lon, s.lat], cil: [c.lon, c.lat], pruchozi: pruchozi.map((p) => [p.lon, p.lat]), typ: TYPY_TRASY.includes(telo.typ) ? telo.typ : "car_fast", bezDalnic: Boolean(telo.bezDalnic), bezMyta: Boolean(telo.bezMyta), odjezd: retezec(telo.odjezd, 40) || undefined }, signal);
        return { start: s, cil: c, pruchozi, ...t };
      }
      case "matice": {
        const body = [];
        for (const b of seznam(telo.body, 10)) body.push(await m.bod(b, signal));
        const cile = [];
        for (const b of seznam(telo.cile, 10)) cile.push(await m.bod(b, signal));
        const v = await m.matice({ body: body.map((b) => [b.lon, b.lat]), cile: cile.map((b) => [b.lon, b.lat]), typ: TYPY_TRASY.includes(telo.typ) ? telo.typ : "car_fast" }, signal);
        return { body, cile, ...v };
      }
      case "vyska": {
        const body = [];
        for (const b of seznam(telo.body, 50)) body.push(await m.bod(b, signal));
        const v = await m.vyska({ body: body.map((b) => [b.lon, b.lat]) }, signal);
        return { body: v.map((x, i) => ({ ...x, adresa: body[i]?.adresa })) };
      }
      default:
        throw Object.assign(new Error("Neznámá akce. Povolené: adresa, zpetne, snimek, panorama, trasa, matice, vyska, stav."), { status: 400 });
    }
  }

  return async function handler(req, context = {}) {
    const url = new URL(req.url);
    if (!povolenyOrigin(req.headers.get("origin"), env)) return json({ chyba: "Nepovolený původ požadavku." }, 403);
    if (req.method !== "POST") return json({ chyba: "Použijte POST s JSON { akce, … }." }, 405, { allow: "POST" });
    const a = await overBearer(req, url.origin);
    if (!a.ok) return json({ chyba: a.duvod }, a.status, a.status === 401 ? hlavicky401(url.origin, a.bezTokenu) : {});
    let telo;
    try {
      const text = await req.text();
      if (text.length > MAX_TELO) return json({ chyba: "Tělo je příliš velké." }, 413);
      telo = JSON.parse(text || "{}");
      if (!telo || typeof telo !== "object" || Array.isArray(telo)) throw new Error();
    } catch { return json({ chyba: "Neplatný JSON." }, 400); }
    let store;
    try {
      store = await dejUloziste();
      if (!(await pricti(store, LIMIT_VOLANI.klic, LIMIT_VOLANI.pocet, LIMIT_VOLANI.oknoMs, ted()))) return json({ chyba: "Příliš mnoho dotazů za 10 minut (limit 120 společný s panelem a bránou)." }, 429);
    } catch { return json({ chyba: "Úložiště není dostupné – zkuste to za chvíli." }, 503); }
    const start = Date.now();
    try {
      const v = await vyrid(telo, store, req.signal);
      console.warn(JSON.stringify({ udalost: "mapa", akce: retezec(telo.akce, 20), stav: "ok", ms: Date.now() - start, cas: new Date().toISOString() }));
      return json({ ok: true, ...v });
    } catch (e) {
      console.warn(JSON.stringify({ udalost: "mapa", akce: retezec(telo.akce, 20), stav: "chyba", duvod: e?.status || "vyjimka", ms: Date.now() - start, cas: new Date().toISOString() }));
      return json({ ok: false, chyba: String(e?.message || e).slice(0, 400) }, e?.status && e.status >= 400 && e.status <= 599 ? e.status : 502);
    }
  };
}

export default vytvorMapaFunkci();

export const config = { path: "/api/mapa" };
