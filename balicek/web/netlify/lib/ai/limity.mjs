// Limity a útrata AI. Ukládá se do Netlify Blobs (úložiště „hspg-ai“). IP adresa se neukládá, jen její otisk
// SHA-256(den|IP). Bez tajné soli jde o pseudonymizaci (kdo má přístup k Blobs, mohl by IP dopočítat) –
// tajnou denní sůl a mazání starých otisků doplní úkol 09 (krok 8), teprve pak platí věta o anonymizaci.
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

// Klíč rozpočtu = období kreditů Netlify, ne kalendářní měsíc: na tarifu Personal běží od 11. do 10.
// (AI_OBDOBI_DEN, výchozí 11; 1 = kalendářní měsíc). Vrací „RRRR-MM“ měsíce, ve kterém období začalo (UTC),
// takže v jednom období kreditů nejde utratit limit dvakrát.
export const mesic = (ted, env = {}) => {
  const zacatek = Math.min(28, Math.max(1, Math.trunc(cislo(env.AI_OBDOBI_DEN, 11))));
  const d = new Date(ted);
  let rok = d.getUTCFullYear(), m = d.getUTCMonth();
  if (d.getUTCDate() < zacatek) { m -= 1; if (m < 0) { m = 11; rok -= 1; } }
  return `${rok}-${String(m + 1).padStart(2, "0")}`;
};

// IPv6: celá síť /64 (jedna domácnost nebo server jich má tisíce), IPv4 celá adresa.
export function sitKlienta(ip) {
  const s = String(ip || "").trim().toLowerCase();
  const v4 = s.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4) return v4[1];
  if (!s.includes(":")) return s;
  const [hlava, ocas = ""] = s.split("::");
  const h = hlava ? hlava.split(":") : [], o = ocas ? ocas.split(":") : [];
  const plna = s.includes("::") ? [...h, ...Array(Math.max(0, 8 - h.length - o.length)).fill("0"), ...o] : h;
  return plna.slice(0, 4).map((x) => x.replace(/^0+(?=.)/, "")).join(":") + "::/64";
}

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
    // @netlify/blobs vrací {modified:false} jen při konfliktu (412); jiná chyba zápisu (403, 5xx po opakování)
    // vrátí {modified:true, etag:""} bez výjimky. Úspěch je proto jen zápis s etagem – jinak výjimka (fail-closed).
    if (z?.modified === true && z.etag) return krok.vysledek;
    if (z?.modified !== false) throw new Error(`Úložiště: zápis ${klic} se nepotvrdil`);
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

// Hádání hesla: 5 pokusů / 15 min na klienta (IPv6 po sítích /64, viz sitKlienta) a 100 / hodinu celkem.
// Pokus se započítá atomicky PŘED ověřením hesla, takže ani souběžné požadavky nezkusí víc hesel.
// Po úspěšném přihlášení se pokus vrátí (vratPokusOPrihlaseni) – do zámku se počítají jen neúspěchy.
const LOGIN_CELKEM = "limit/login-vse";
export async function povolPokusOPrihlaseni(ul, klient, ted) {
  if (!(await pricti(ul, `limit/login/${klient}`, 5, 15 * 60_000, ted))) return false;
  return pricti(ul, LOGIN_CELKEM, 100, 3_600_000, ted);
}
async function vrat(ul, klic) {
  await aktualizuj(ul, klic, (z) => (z && z.n > 0 ? { hodnota: { ...z, n: z.n - 1 }, vysledek: true } : null));
}
export async function vratPokusOPrihlaseni(ul, klient) {
  await vrat(ul, `limit/login/${klient}`);
  await vrat(ul, LOGIN_CELKEM);
}

// ODHAD ceny v Kč (ne faktura – přesnou útratu ukazuje Netlify / poskytovatel). Ceny v USD za milion
// tokenů (vstup, výstup) podle modelu. Claude podle ceníku Anthropic; ostatní jsou ZÁMĚRNĚ nadsazené
// odhady (raději dřív vypnout AI než vyčerpat kredity) – přesné ceny ověř u poskytovatele.
// Nový model doplň sem; dokud tu chybí, počítá se cenou 15/75 USD (rozpočet ho raději zastaví).
const CENY_MODELU_USD = {
  "claude-opus-5-5": [4, 20],
  "claude-sonnet-5-5": [2, 10],
  "claude-haiku-4-5": [1, 5],
  "claude-haiku-4-5-20251001": [1, 5],
  "gemini-2.5-flash": [0.5, 4],
  "gemini-2.5-pro": [2.5, 15],
  "gpt-5-mini": [0.5, 4],
  "gpt-5": [2.5, 15],
  "grok-4": [5, 20], // ceník xAI 3/15 USD – záměrně nadsazeno
  "x-ai/grok-4": [5, 20], // přes OpenRouter (Netlify AI Gateway)
};
const NEZNAMY_MODEL_USD = [15, 75];
export function odhadKc(id, vstup, vystup, env, model) {
  const znamy = CENY_MODELU_USD[model];
  const [cv, cy] = znamy || NEZNAMY_MODEL_USD;
  // CENA_<ID>_VSTUP / _VYSTUP: u neznámého modelu nastaví cenu, u známého ji smí jen zvýšit
  // (levná cena zákaznického modelu nesmí podhodnotit dražší model majitele téhož poskytovatele).
  const cena = (k, c) => { const x = cislo(env[`CENA_${id.toUpperCase()}_${k}`], c); return znamy ? Math.max(c, x) : x; };
  const kurz = cislo(env.KURZ_USD_CZK, 24);
  return ((vstup * cena("VSTUP", cv) + vystup * cena("VYSTUP", cy)) / 1e6) * kurz;
}

// Odhad tokenů pevného textu (pokyny, znalosti; čeština ~2,7 znaku na token – raději víc než míň).
export const odhadTokenu = (text) => Math.ceil(String(text || "").length / 2.5);
// Horní mez pro text od klienta (libovolné Unicode): tokenizéry nevyrobí víc tokenů než bajtů UTF-8.
export const odhadTokenuKlienta = (text) => Buffer.byteLength(String(text || ""), "utf8");

// Výchozí limit je záměrně nízký: přes Netlify AI Gateway se AI platí kredity Netlify a po jejich
// vyčerpání Netlify pozastaví CELÝ web. 25 Kč ≈ 1 USD ≈ 190 kreditů za období kreditů (viz mesic()). S vlastními API klíči
// (účtují se u poskytovatele, ne v Netlify) nebo se zapnutým auto-recharge jde limit zvýšit.
export const mesicniLimitKc = (env) => cislo(env.AI_MESICNI_LIMIT_KC, 25);
// Veřejný asistent smí spotřebovat jen část rozpočtu (výchozí polovinu) – zbytek zůstává majiteli.
export const verejnyLimitKc = (env) => Math.min(mesicniLimitKc(env), cislo(env.AI_VEREJNY_LIMIT_KC, mesicniLimitKc(env) / 2));

// 1 USD = 180 kreditů Netlify (AI Gateway).
export const kcNaKredity = (kc, env) => Math.round((kc / cislo(env.KURZ_USD_CZK, 24)) * 180);

// Rezervace PŘED voláním AI: připočte nejvyšší možnou cenu volání (vstup + plný strop výstupu).
// Když by se rozpočet překročil, vrátí false a AI se nevolá. Souběžné požadavky tak strop nepřetečou.
// verejne=true: volání veřejného asistenta – hlídá i podlimit verejnyLimitKc.
// Vyrovnání (zapisUtratu) volej se stejným `ted` jako rezervaci – jinak by se přes přelom období
// odečetla rezerva z nového období.
export async function rezervuj(ul, id, vstupTokenu, maxVystup, env, ted, model, verejne = false) {
  const kc = odhadKc(id, vstupTokenu, maxVystup, env, model);
  const limit = mesicniLimitKc(env);
  const v = await aktualizuj(ul, `utrata/${mesic(ted, env)}`, (z) => {
    const u = z ? { ...z, ai: { ...z.ai } } : { celkemKc: 0, ai: {} };
    if (u.celkemKc + kc > limit) return null;
    if (verejne && (u.verejneKc || 0) + kc > verejnyLimitKc(env)) return null;
    u.celkemKc += kc;
    if (verejne) u.verejneKc = (u.verejneKc || 0) + kc;
    return { hodnota: u, vysledek: kc };
  });
  return v === null ? false : v;
}

// Zápis skutečné útraty; rezervaKc = dříve rezervovaná částka, která se tím vyrovná.
// Volání odmítnuté poskytovatelem (HTTP chyba, nic se neúčtuje) volající vyrovná se stat {vstup:0, vystup:0};
// u vypršení času (504) a odmítnutí obsahu (422) rezervace zůstane – tokeny mohly být účtovány.
export async function zapisUtratu(ul, id, stat, env, ted, rezervaKc = 0, model, verejne = false) {
  if (!stat) return;
  const kc = odhadKc(id, stat.vstup || 0, stat.vystup || 0, env, model);
  await aktualizuj(ul, `utrata/${mesic(ted, env)}`, (z) => {
    const u = z ? { ...z, ai: { ...z.ai } } : { celkemKc: 0, ai: {} };
    u.celkemKc = Math.max(0, u.celkemKc + kc - rezervaKc);
    if (verejne) u.verejneKc = Math.max(0, (u.verejneKc || 0) + kc - rezervaKc);
    // Vrácená rezervace odmítnutého volání (0 tokenů) se do statistiky dotazů nepočítá.
    if (!stat.vstup && !stat.vystup) return { hodnota: u, vysledek: true };
    const a = { ...(u.ai[id] || { dotazu: 0, vstup: 0, vystup: 0, kc: 0 }) };
    a.dotazu += 1;
    a.vstup += stat.vstup || 0;
    a.vystup += stat.vystup || 0;
    a.kc += kc;
    u.ai[id] = a;
    return { hodnota: u, vysledek: true };
  });
}

export async function utrataMesice(ul, ted, env = {}) {
  return (await cti(ul, `utrata/${mesic(ted, env)}`)) || { celkemKc: 0, ai: {} };
}

export async function rozpocetVycerpan(ul, env, ted, verejne = false) {
  const u = await utrataMesice(ul, ted, env);
  return u.celkemKc >= mesicniLimitKc(env) || (verejne && (u.verejneKc || 0) >= verejnyLimitKc(env));
}

// Provozní nastavení měněné za běhu (bez nasazení – změna proměnné v Netlify by vyžadovala nové
// nasazení za 15 kreditů). Majitel přepíná v panelu „Vše ve tvých rukách“.
const NASTAVENI = "nastaveni/provoz";
export async function nactiNastaveni(ul) {
  return { verejnaAI: true, ...((await cti(ul, NASTAVENI)) || {}) };
}
export async function ulozNastaveni(ul, zmena, ted) {
  return aktualizuj(ul, NASTAVENI, (z) => {
    const nove = { verejnaAI: true, ...(z || {}), ...zmena, zmeneno: new Date(ted).toISOString() };
    return { hodnota: nove, vysledek: nove };
  });
}
