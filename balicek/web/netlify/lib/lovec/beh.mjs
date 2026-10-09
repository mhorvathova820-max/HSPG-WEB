// Lovec SVJ (úkol 24) – běh po krocích. Každé volání /api/lovec-svj { akce: "krok" } udělá jednu fázi jednoho
// subjektu (měření, hledání, ověření, oslovení) a uloží průběh do Blobs – žádná fáze nepřekročí ~20 s.
// Výstup jsou NÁVRHY kontaktů; do databáze jdou až po schválení majitelem.
import { createHash, randomBytes } from "node:crypto";
import { aktualizuj, rezervuj, zapisUtratu, odhadTokenu } from "../ai/limity.mjs";
import { POSKYTOVATELE, jeZapnuty, vlastniKlic } from "../ai/poskytovatele.mjs";
import { PRAVIDLA_PRAVDIVOSTI } from "../ai/pravidla.mjs";
import { PANELY } from "../mereni/zdroje.mjs";
import { stahniStranku, najdiNaStrance, citace, radekKolem, patriSVJ, ROLE_RE, OBYVATEL_RE, predsedaVyboru, bezpecnaAdresa } from "./zdroje.mjs";

export const PRAVNI_ZAKLAD = "oprávněný zájem správce (čl. 6 odst. 1 písm. f) GDPR) – nabídka služeb právnické osobě (SVJ) na kontakt zveřejněný pro komunikaci se SVJ nebo jeho správcem ve veřejném zdroji";
export const KANALY = { dopis: true, telefon: "jednotlivě, ne automaticky", email: false };
const FAZE = ["mereni", "hledani", "overeni", "osloveni"];

export async function vychoziUlozisteLovec() {
  const { getStore } = await import("@netlify/blobs");
  return getStore({ name: "hspg-lovec", consistency: "strong" });
}

// Skóre příležitosti 0–100: fasády (bez společných zdí) až 60 bodů (3 000 m² = plný počet), střecha až 30 (1 000 m²),
// panelová konstrukce +10. Jen orientace pro pořadí oslovení – žádný slib zakázky ani ceny.
export function skore({ fasady, strecha, panel }) {
  const f = Number.isFinite(fasady) ? Math.min(60, (fasady / 3000) * 60) : 0;
  const s = Number.isFinite(strecha) ? Math.min(30, (strecha / 1000) * 30) : 0;
  return Math.round(Math.min(100, f + s + (panel ? 10 : 0)));
}

// Bytový dům s aspoň 4 podlažími (RÚIAN: způsob využití bytový dům / objekt k bydlení); panel = stěnové panely.
export function shrnBudovu(m) {
  const b = m?.budova || {};
  const zpusob = b.zpusobVyuziti?.kod;
  const panel = PANELY.has(b.druhKonstrukce?.kod);
  const bytovy = zpusob === 6 || zpusob === 3;
  const podlazi = b.podlazi ?? null;
  const fasady = m?.fasadyCelkem ?? null, strecha = m?.strecha?.plocha ?? m?.strecha?.plochaPudorysu ?? null;
  return {
    zpusobVyuziti: b.zpusobVyuziti?.nazev || null, druhKonstrukce: b.druhKonstrukce?.nazev || null, panel, bytovy, podlazi,
    plochaPudorysu: m?.pudorys?.plocha ?? null, fasady, strecha, sklon: m?.vysky?.sklon ?? null, okap: m?.vysky?.okap ?? null,
    cil: bytovy && (podlazi == null ? true : podlazi >= 4),
    skore: skore({ fasady, strecha, panel }),
  };
}

const jsonZTextu = (t) => { const m = String(t || "").match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : null; } catch { return null; } };

// Volání AI přes stejný rozpočet jako /api/ai (rezervace + vyrovnání; vlastní klíč mimo kredity Netlify).
export async function volejAI({ id, adaptery, env, ulAI, ted, system, text, maxTokenu = 900 }) {
  if (!jeZapnuty(id, env) || !adaptery[id]) throw Object.assign(new Error(`${id} není zapnuté`), { kod: "nezapnuto" });
  const t0 = ted(), model = POSKYTOVATELE[id].model(env), vlastni = Boolean(vlastniKlic(id, env));
  const rez = await rezervuj(ulAI, id, odhadTokenu(system + text), maxTokenu, env, t0, model, false, vlastni);
  if (rez === false) throw Object.assign(new Error("Měsíční rozpočet AI by se překročil."), { kod: "rozpocet" });
  try {
    const r = await adaptery[id].dotaz({ system, zpravy: [{ role: "user", text }], maxTokenu, rychle: true });
    await zapisUtratu(ulAI, id, r.stat, env, t0, rez, model, false, vlastni).catch(() => {});
    return r.text;
  } catch (e) {
    if (e?.status >= 400 && e.status < 500) await zapisUtratu(ulAI, id, { vstup: 0, vystup: 0 }, env, t0, rez, model, false, vlastni).catch(() => {});
    throw e;
  }
}

const SYSTEM_HLEDANI = `${PRAVIDLA_PRAVDIVOSTI}
Úkol: najdi na veřejném webu oficiální stránku daného společenství vlastníků jednotek (SVJ) nebo jeho správce (správcovské firmy) a kontakt, který je tam zveřejněný PRO KOMUNIKACI SE SVJ (e-mail nebo telefon výboru, SVJ či správce).
Pravidla: jen kontakty, které na stránce doslova stojí; žádné odhady, žádné soukromé kontakty obyvatel, žádné stránky za přihlášením, žádné sociální sítě. Když nic nenajdeš, vrať prázdný seznam.
Odpověz POUZE JSON: {"kandidati":[{"url":"https://…","typ":"email"|"telefon","hodnota":"…"}]} – nejvýš 4 položky.`;

const SYSTEM_OVERENI = `${PRAVIDLA_PRAVDIVOSTI}
Úkol: posuď výřez z veřejné webové stránky. Patří uvedený kontakt k danému SVJ (nebo jeho správci) a je zveřejněný pro komunikaci se SVJ? Soukromý kontakt obyvatele nebo vlastníka bytu = NE.
Odpověz POUZE JSON: {"patri":true|false,"role":"svj"|"vybor"|"spravce"|"jine","duvod":"krátce"}`;

// Jedna fáze jednoho subjektu. deps: { fetchFn, adaptery, env, ulAI, ted, zmerAdresu, storeMereni, osloveniJmenem }.
export async function zpracujFazi(s, deps) {
  const { fetchFn, ted } = deps;
  if (s.faze === "mereni") {
    if (!s.kodAdresnihoMista) return { ...s, faze: "hotovo", vysledek: "bez-adresy", poznamka: "ARES nemá kód adresního místa sídla – nejde změřit." };
    const r = await deps.zmerAdresu({ kod: s.kodAdresnihoMista }, { fetchFn, store: deps.storeMereni, ted });
    if (r.status !== 200 || r.data?.stav !== "hotovo") return { ...s, faze: "hotovo", vysledek: "mereni-selhalo", poznamka: r.data?.chyba || r.data?.zprava || "měření se nepodařilo" };
    const budova = shrnBudovu(r.data);
    if (!budova.cil) return { ...s, budova, faze: "hotovo", vysledek: "mimo-cil", poznamka: "Sídlo není bytový dům se 4 a více podlažími." };
    return { ...s, budova, mereniZdroje: r.data.zdroje?.map((z) => z.nazev), faze: "hledani" };
  }
  if (s.faze === "hledani") {
    let kandidati = [];
    try {
      const odp = await volejAI({ id: "perplexity", ...deps, system: SYSTEM_HLEDANI, text: `SVJ: ${s.nazev}\nIČO: ${s.ico}\nAdresa domu (sídlo): ${s.sidlo}` });
      kandidati = (jsonZTextu(odp)?.kandidati || []).filter((k) => bezpecnaAdresa(k?.url) && ["email", "telefon"].includes(k?.typ) && k?.hodnota).slice(0, 4);
    } catch (e) {
      return { ...s, faze: "osloveni", kandidati: [], hledaniChyba: e?.kod === "nezapnuto" ? "Hledací AI (Perplexity přes Netlify AI Gateway) není zapnutá." : e?.kod === "rozpocet" ? "Rozpočet AI je vyčerpaný." : "Hledání selhalo." };
    }
    return { ...s, kandidati, faze: kandidati.length ? "overeni" : "osloveni" };
  }
  if (s.faze === "overeni") {
    const robots = new Map(), stranky = new Map(), kontakty = [], zahozeno = [];
    for (const k of s.kandidati || []) {
      if (!stranky.has(k.url)) stranky.set(k.url, await stahniStranku(fetchFn, k.url, robots).catch(() => ({ duvod: "stránka nejde stáhnout" })));
      const st = stranky.get(k.url);
      if (!st.text) { zahozeno.push({ ...k, duvod: st.duvod }); continue; }
      const idx = najdiNaStrance(st.text, k.typ, k.hodnota);
      if (idx < 0) { zahozeno.push({ ...k, duvod: "kontakt na stránce není" }); continue; }
      if (!patriSVJ(st.text, s)) { zahozeno.push({ ...k, duvod: "stránka neuvádí IČO ani adresu tohoto SVJ" }); continue; }
      const okoli = citace(st.text, idx, 220);
      const radek = radekKolem(st.text, idx);
      if (!ROLE_RE.test(radek) || OBYVATEL_RE.test(radek)) { zahozeno.push({ ...k, duvod: "kontakt není označený jako kontakt SVJ/výboru/správce" }); continue; }
      let verdikt = null;
      try {
        verdikt = jsonZTextu(await volejAI({ id: "claude", ...deps, system: SYSTEM_OVERENI, text: `SVJ: ${s.nazev}, IČO ${s.ico}, ${s.sidlo}\nKontakt: ${k.hodnota}\nVýřez ze stránky ${st.url}:\n${okoli}`, maxTokenu: 300 }));
      } catch { verdikt = null; }
      if (!verdikt?.patri) { zahozeno.push({ ...k, duvod: verdikt ? `kontrola AI: ${verdikt.duvod || "nepatří"}` : "kontrola AI nedostupná – bez ověření se neukládá" }); continue; }
      const hodnota = k.typ === "email" ? k.hodnota.trim().toLowerCase() : k.hodnota.replace(/[^\d+]/g, "");
      if (kontakty.some((x) => x.hodnota === hodnota)) continue;
      kontakty.push({ typ: k.typ, hodnota, role: verdikt.role || "svj", url: st.url, citace: radek.slice(0, 200), overeno: new Date(ted()).toISOString() });
    }
    return { ...s, kontakty, zahozeno, faze: "osloveni" };
  }
  if (s.faze === "osloveni") {
    const predseda = deps.osloveniJmenem ? await predsedaVyboru(fetchFn, s.ico).catch(() => null) : null;
    return { ...s, ...(predseda ? { predseda } : {}), faze: "hotovo", vysledek: (s.kontakty || []).length ? "navrh" : "navrh-bez-kontaktu" };
  }
  return s;
}

export const idBehu = () => randomBytes(6).toString("hex");
export const kodOdmitnuti = (ico, tajemstvi) => createHash("sha256").update(`${tajemstvi}|neozyvat|${ico}`).digest("base64url").slice(0, 10);

// Nárok na zpracování: jen jeden krok běhu najednou (dvě karty panelu nesmí zpracovat totéž dvakrát).
export async function zaberKrok(ul, id, ted) {
  return aktualizuj(ul, `behy/${id}`, (b) => {
    if (!b || b.hotovo) return null;
    if (b.zamek && ted - b.zamek < 60_000) return null;
    return { hodnota: { ...b, zamek: ted }, vysledek: b };
  });
}
export const DALSI_FAZE = FAZE;
