// Dárkový kupon pro sousedy a známé (content/planovac.json → kupon): majitel ho vytvoří v panelu,
// zákazník ho předá dál, nový zákazník zadá kód v plánovači. Kód je náhodný (40 bitů, Crockford base32),
// stav (platnost, počet použití) je v Netlify Blobs (úložiště „hspg-planovac“). Žádné údaje o sousedech
// se nesbírají – kupon předává zákazník sám. Zápisy jsou atomické (etag), počet použití nepřeteče.
import { randomBytes } from "node:crypto";
import { aktualizuj } from "../ai/limity.mjs";

const ABECEDA = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const PREFIX = "kupony/";

export async function vychoziUlozistePlanovac() {
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: "hspg-planovac", consistency: "strong" });
}

function nahodnyKod() {
  const b = randomBytes(5); // 40 bitů = 8 znaků base32
  let n = 0n;
  for (const x of b) n = (n << 8n) | BigInt(x);
  let s = "";
  for (let i = 0; i < 8; i++) { s = ABECEDA[Number(n & 31n)] + s; n >>= 5n; }
  return `HS-${s.slice(0, 4)}-${s.slice(4)}`;
}

// Vstup od člověka → kanonický tvar „HS-XXXX-XXXX“, nebo null. Snese malá písmena, mezery, pomlčky
// a záměny O→0, I/L→1 (Crockford). U nevalidního tvaru se úložiště vůbec nečte.
export function normalizujKod(vstup) {
  let s = String(vstup || "").toUpperCase().replace(/[\s\-_.]/g, "");
  if (s.startsWith("HS")) s = s.slice(2);
  s = s.replace(/O/g, "0").replace(/[IL]/g, "1");
  if (!/^[0-9A-HJKMNP-TV-Z]{8}$/.test(s)) return null;
  return `HS-${s.slice(0, 4)}-${s.slice(4)}`;
}

const datum = (ms) => new Date(ms).toISOString().slice(0, 10);

export async function vytvorKupon(ul, { poznamka = "", maxPouziti, platnostDni, ted = Date.now() } = {}, cfg = {}) {
  const max = Math.min(50, Math.max(1, Math.trunc(Number(maxPouziti) || cfg.maxPouziti || 5)));
  const dni = Math.min(730, Math.max(1, Math.trunc(Number(platnostDni) || cfg.platnostDni || 180)));
  for (let i = 0; i < 5; i++) {
    const kod = nahodnyKod();
    const kupon = {
      kod,
      vytvoreno: new Date(ted).toISOString(),
      platnostDo: datum(ted + dni * 864e5),
      maxPouziti: max,
      pouziti: [],
      aktivni: true,
      // Interní poznámka majitele (komu kupon dal) – krátká, bez kontaktů.
      poznamka: String(poznamka || "").replace(/[\r\n\t]/g, " ").slice(0, 80),
    };
    const r = await ul.setJSON(PREFIX + kod, kupon, { onlyIfNew: true });
    if (r?.modified === true && r.etag) return kupon;
    if (r?.modified !== false) throw new Error("Kupon nejde uložit.");
  }
  throw new Error("Kupon nejde vytvořit (kolize kódů).");
}

function stav(k, ted) {
  if (!k) return "neexistuje";
  if (!k.aktivni) return "zrusen";
  if (datum(ted) > k.platnostDo) return "vyprsel";
  if ((k.pouziti?.length || 0) >= k.maxPouziti) return "vycerpan";
  return null;
}

export const DUVODY = {
  neplatny: "Kód kuponu nemá správný tvar (HS-XXXX-XXXX).",
  neexistuje: "Kupon s tímto kódem neexistuje.",
  zrusen: "Kupon byl zrušen.",
  vyprsel: "Platnost kuponu skončila.",
  vycerpan: "Kupon už byl použit nejvyšším povoleným počtem domácností.",
  pouzity: "Kupon už je u této rezervace použitý.",
};

// Veřejné ověření: { platny, kod?, platnostDo?, zbyva?, duvod? } – bez poznámky majitele a bez historie.
export async function overKupon(ul, vstup, ted = Date.now()) {
  const kod = normalizujKod(vstup);
  if (!kod) return { platny: false, duvod: "neplatny" };
  const k = await ul.get(PREFIX + kod, { type: "json" });
  const s = stav(k, ted);
  if (s) return { platny: false, kod, duvod: s };
  return { platny: true, kod, platnostDo: k.platnostDo, zbyva: k.maxPouziti - k.pouziti.length };
}

// Uplatnění při rezervaci (submission-created). Idempotentní podle id rezervace (Netlify může funkci
// spustit znovu). Vrací { ok, kod, zbyva } nebo { ok: false, duvod }.
export async function uplatniKupon(ul, vstup, idRezervace, ted = Date.now()) {
  const kod = normalizujKod(vstup);
  if (!kod) return { ok: false, duvod: "neplatny" };
  const id = String(idRezervace || "").slice(0, 40);
  const v = await aktualizuj(ul, PREFIX + kod, (k) => {
    if (k?.pouziti?.some((p) => p.rezervace === id)) return { hodnota: k, vysledek: { ok: true, kod, zbyva: k.maxPouziti - k.pouziti.length, opakovane: true } };
    const s = stav(k, ted);
    if (s) return null;
    const novy = { ...k, pouziti: [...k.pouziti, { rezervace: id, kdy: new Date(ted).toISOString() }] };
    return { hodnota: novy, vysledek: { ok: true, kod, zbyva: novy.maxPouziti - novy.pouziti.length } };
  });
  if (v) return v;
  const k = await ul.get(PREFIX + kod, { type: "json" });
  return { ok: false, kod, duvod: stav(k, ted) || "neexistuje" };
}

export async function zrusKupon(ul, vstup) {
  const kod = normalizujKod(vstup);
  if (!kod) return null;
  return aktualizuj(ul, PREFIX + kod, (k) => (k ? { hodnota: { ...k, aktivni: false }, vysledek: { ...k, aktivni: false } } : null));
}

// Pro panel majitele: nejvýš `limit` kuponů, nejnovější první (čte nejvýš 500 záznamů).
export async function seznamKuponu(ul, limit = 200) {
  const { blobs = [] } = await ul.list({ prefix: PREFIX });
  const kupony = (await Promise.all(blobs.slice(0, 500).map((b) => ul.get(b.key, { type: "json" })))).filter(Boolean);
  return kupony.sort((a, b) => (a.vytvoreno < b.vytvoreno ? 1 : -1)).slice(0, limit);
}
