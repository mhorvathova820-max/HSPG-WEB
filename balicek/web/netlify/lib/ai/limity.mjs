// Limity a útrata AI. Ukládá se do Netlify Blobs (úložiště „hspg-ai“); IP adresy se neukládají,
// jen jejich otisk se solí dne, takže je nejde zpětně dohledat ani propojit mezi dny.
// Všechny zápisy jsou podmíněné (etag): souběžné požadavky se nepřepíšou a limit ani rozpočet nepřetečou.
import { createHash } from "node:crypto";

export async function vychoziUloziste() {
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: "hspg-ai", consistency: "strong" });
}

// Paměťové úložiště pro testy a lokální běh – chová se jako Blobs včetně podmíněných zápisů.
export function pametoveUloziste() {
  const m = new Map();
  let verze = 0;
  return {
    async get(k) { return m.has(k) ? JSON.parse(m.get(k).v) : null; },
    async getWithMetadata(k) { return m.has(k) ? { data: JSON.parse(m.get(k).v), etag: m.get(k).etag, metadata: {} } : null; },
    async setJSON(k, v, o = {}) {
      if (o.onlyIfNew && m.has(k)) return { modified: false };
      if (o.onlyIfMatch && (!m.has(k) || m.get(k).etag !== o.onlyIfMatch)) return { modified: false };
      const etag = `e${++verze}`;
      m.set(k, { v: JSON.stringify(v), etag });
      return { modified: true, etag };
    },
    _mapa: m,
  };
}

const den = (ted) => new Date(ted).toISOString().slice(0, 10);
export const mesic = (ted) => new Date(ted).toISOString().slice(0, 7);

export function otiskKlienta(ip, ted) {
  return createHash("sha256").update(`${den(ted)}|${ip || "neznama"}`).digest("hex").slice(0, 24);
}

// Chyba úložiště se nepolyká: volající rozhodne (veřejná AI se při výpadku úložiště vypne).
async function cti(ul, k) {
  return (await ul.get(k, { type: "json" })) ?? null;
}

// Atomická změna: přečti s etagem, spočítej novou hodnotu, zapiš jen pokud se mezitím nezměnila.
// zmena(stara) vrací { hodnota, vysledek } nebo null = nic nezapisovat (vysledek se vrátí jako null).
async function aktualizuj(ul, klic, zmena, pokusu = 8) {
  for (let i = 0; i < pokusu; i++) {
    const r = ul.getWithMetadata ? await ul.getWithMetadata(klic, { type: "json" }) : null;
    const stara = r ? r.data : null;
    const krok = zmena(stara);
    if (!krok) return null;
    const podminka = r && r.etag ? { onlyIfMatch: r.etag } : { onlyIfNew: true };
    const z = await ul.setJSON(klic, krok.hodnota, podminka);
    if (!z || z.modified !== false) return krok.vysledek;
    await new Promise((ok) => setTimeout(ok, 5 + Math.random() * 20 * (i + 1)));
  }
  throw new Error(`Úložiště: souběžné zápisy na ${klic} – vzdávám po ${pokusu} pokusech`);
}

// Okénkový čítač: vrací true, když se požadavek do limitu vejde (a započítá ho).
async function pricti(ul, klic, limit, oknoMs, ted) {
  const v = await aktualizuj(ul, klic, (z) => {
    const platny = z && ted - z.od < oknoMs ? { ...z } : { n: 0, od: ted };
    if (platny.n >= limit) return null;
    platny.n += 1;
    return { hodnota: platny, vysledek: true };
  });
  return v === true;
}

const cislo = (v, vychozi) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : vychozi);

// Veřejný asistent: na návštěvníka 12 dotazů / 10 min a 40 / den, celkem ASISTENT_DENNI_LIMIT / den (výchozí 40).
export async function povolVerejnyDotaz(ul, klient, env, ted) {
  const naKlienta10 = await pricti(ul, `limit/k10/${klient}`, 12, 10 * 60_000, ted);
  if (!naKlienta10) return { ok: false, duvod: "klient" };
  const naKlientaDen = await pricti(ul, `limit/kden/${klient}`, 40, 86_400_000, ted);
  if (!naKlientaDen) return { ok: false, duvod: "klient" };
  const celkem = await pricti(ul, `limit/den/${den(ted)}`, cislo(env.ASISTENT_DENNI_LIMIT, 40), 86_400_000, ted);
  if (!celkem) return { ok: false, duvod: "den" };
  return { ok: true };
}

// Hádání hesla: 5 neúspěšných pokusů / 15 min na klienta.
export async function povolPokusOPrihlaseni(ul, klient, ted) {
  const z = await cti(ul, `limit/login/${klient}`);
  return !(z && ted - z.od < 15 * 60_000 && z.n >= 5);
}
export async function zapisNeuspesnePrihlaseni(ul, klient, ted) {
  await pricti(ul, `limit/login/${klient}`, Infinity, 15 * 60_000, ted);
}

// ODHAD ceny v Kč (ne faktura – přesnou útratu ukazuje Netlify / poskytovatel). Ceny v USD za milion
// tokenů (vstup, výstup) jdou přepsat proměnnými CENA_<ID>_VSTUP / CENA_<ID>_VYSTUP; kurz KURZ_USD_CZK.
const VYCHOZI_CENY_USD = {
  claude: [4, 20], // claude-opus-5-5 (ceník Anthropic); jiný model → nastav CENA_CLAUDE_*
  gpt: [5, 20], // odhad, ověř ceník OpenAI pro zvolený model
  gemini: [5, 20], // odhad, ověř ceník Google pro zvolený model
  grok: [5, 20], // odhad
};
// Ceny podle modelu. Claude podle ceníku Anthropic; ostatní jsou ZÁMĚRNĚ nadsazené odhady
// (raději dřív vypnout AI než vyčerpat kredity) – přesné ceny ověř u poskytovatele.
const CENY_MODELU_USD = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-4-5": [1, 5],
  "gemini-2.5-flash": [0.5, 4],
  "gemini-2.5-pro": [2.5, 15],
  "gpt-5-mini": [0.5, 4],
  "gpt-5": [2.5, 15],
};
export function odhadKc(id, vstup, vystup, env, model) {
  const [cv, cy] = CENY_MODELU_USD[model] || VYCHOZI_CENY_USD[id] || [5, 20];
  const v = cislo(env[`CENA_${id.toUpperCase()}_VSTUP`], cv);
  const y = cislo(env[`CENA_${id.toUpperCase()}_VYSTUP`], cy);
  const kurz = cislo(env.KURZ_USD_CZK, 24);
  return ((vstup * v + vystup * y) / 1e6) * kurz;
}

// Hrubý odhad počtu tokenů z délky textu (čeština ~3 znaky na token – raději víc než míň).
export const odhadTokenu = (text) => Math.ceil(String(text || "").length / 3);

// Výchozí limit je záměrně nízký: přes Netlify AI Gateway se AI platí kredity Netlify a po jejich
// vyčerpání Netlify pozastaví CELÝ web. 25 Kč ≈ 1 USD ≈ 190 kreditů. S vlastními API klíči
// (účtují se u poskytovatele, ne v Netlify) nebo se zapnutým auto-recharge jde limit zvýšit.
export const mesicniLimitKc = (env) => cislo(env.AI_MESICNI_LIMIT_KC, 25);

// 1 USD = 180 kreditů Netlify (AI Gateway).
export const kcNaKredity = (kc, env) => Math.round((kc / cislo(env.KURZ_USD_CZK, 24)) * 180);

// Rezervace PŘED voláním AI: připočte nejvyšší možnou cenu volání (vstup + plný strop výstupu).
// Když by se rozpočet překročil, vrátí false a AI se nevolá. Souběžné požadavky tak strop nepřetečou.
export async function rezervuj(ul, id, vstupTokenu, maxVystup, env, ted, model) {
  const kc = odhadKc(id, vstupTokenu, maxVystup, env, model);
  const limit = mesicniLimitKc(env);
  const v = await aktualizuj(ul, `utrata/${mesic(ted)}`, (z) => {
    const u = z ? { ...z, ai: { ...z.ai } } : { celkemKc: 0, ai: {} };
    if (u.celkemKc + kc > limit) return null;
    u.celkemKc += kc;
    return { hodnota: u, vysledek: kc };
  });
  return v === null ? false : v;
}

// Zápis skutečné útraty; rezervaKc = dříve rezervovaná částka, která se tím vyrovná.
// Selhané volání se nevyrovnává (rezervace zůstane – tokeny mohly být účtovány).
export async function zapisUtratu(ul, id, stat, env, ted, rezervaKc = 0, model) {
  if (!stat) return;
  const kc = odhadKc(id, stat.vstup || 0, stat.vystup || 0, env, model);
  await aktualizuj(ul, `utrata/${mesic(ted)}`, (z) => {
    const u = z ? { ...z, ai: { ...z.ai } } : { celkemKc: 0, ai: {} };
    u.celkemKc = Math.max(0, u.celkemKc + kc - rezervaKc);
    const a = { ...(u.ai[id] || { dotazu: 0, vstup: 0, vystup: 0, kc: 0 }) };
    a.dotazu += 1;
    a.vstup += stat.vstup || 0;
    a.vystup += stat.vystup || 0;
    a.kc += kc;
    u.ai[id] = a;
    return { hodnota: u, vysledek: true };
  });
}

export async function utrataMesice(ul, ted) {
  return (await cti(ul, `utrata/${mesic(ted)}`)) || { celkemKc: 0, ai: {} };
}

export async function rozpocetVycerpan(ul, env, ted) {
  return (await utrataMesice(ul, ted)).celkemKc >= mesicniLimitKc(env);
}
