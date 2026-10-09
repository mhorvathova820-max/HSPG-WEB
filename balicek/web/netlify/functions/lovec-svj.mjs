// /api/lovec-svj – Lovec SVJ (úkol 24), jen pro přihlášeného majitele. Běh po krocích s průběhem:
//   POST { akce: "start", obec, n?=25 (1–50), druzstva?=false, osloveniJmenem?=false } → { beh, celkem, fronta }
//   POST { akce: "krok", beh } → jedna fáze jednoho subjektu (měření → hledání → ověření → oslovení), vrací průběh
//   GET  ?beh=ID → průběh;  GET ?navrhy=1 → návrhy ke schválení;  GET ?databaze=1 → schválené kontakty
//   POST { akce: "schvalit", ico, kontakty: [index…] } → zápis do databáze se zdrojem, datem a právním základem
//   POST { akce: "zamitnout", ico }  ·  POST { akce: "neozyvat", ico | kod, duvod? } (trvalý seznam, přeskočí se navždy)
//   POST { akce: "dopis", ico } → HTML dopis k tisku (Mistral píše, Claude kontroluje; jinak šablona) s QR a kuponem
// E-maily: hromadné rozesílání systém nemá a nepovolí (zákon 480/2004 Sb., § 7). Kanál = dopis, jednotlivý telefonát;
// e-mail jen u souhlasu nebo stávajícího zákazníka (pole emailPovolen nastavuje majitel ručně u konkrétního záznamu).
import firma from "../../content/firma.json" with { type: "json" };
import { overPozadavek, povolenyOrigin, tajemstviServeru } from "../lib/ai/autorizace.mjs";
import { vychoziUloziste, pricti, nactiNastaveni, aktualizuj } from "../lib/ai/limity.mjs";
import { vytvorAdaptery, sModely } from "../lib/ai/poskytovatele.mjs";
import { najdiObec } from "../lib/pocasi/obce.mjs";
import { zmerAdresu, vychoziUlozisteMereni } from "../lib/mereni/mereni.mjs";
import { hledejSubjekty, ZDROJ_ARES } from "../lib/lovec/zdroje.mjs";
import { zpracujFazi, vychoziUlozisteLovec, idBehu, zaberKrok, kodOdmitnuti, PRAVNI_ZAKLAD, KANALY } from "../lib/lovec/beh.mjs";
import { faktaDopisu, napisDopis, htmlDopisu } from "../lib/lovec/dopis.mjs";
import { vytvorKupon, vychoziUlozistePlanovac } from "../lib/planovac/kupony.mjs";
import cfgPlanovac from "../../content/planovac.json" with { type: "json" };

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const ICO_RE = /^\d{8}$/;

function prubeh(b) {
  const s = Object.values(b.subjekty || {});
  return {
    beh: b.id, obec: b.vstup.obec, hotovo: Boolean(b.hotovo), celkem: b.fronta.length,
    zpracovano: s.filter((x) => x.faze === "hotovo").length,
    navrhu: s.filter((x) => x.vysledek === "navrh").length,
    aktualni: s.find((x) => x.faze !== "hotovo") ? { ico: s.find((x) => x.faze !== "hotovo").ico, faze: s.find((x) => x.faze !== "hotovo").faze } : null,
    log: (b.log || []).slice(-20),
  };
}

export function vytvorLovce({ env = process.env, fetchFn = fetch, uloziste, ulozisteAI, ulozisteMereni, ulozistePlanovac, adaptery, ted = () => Date.now() } = {}) {
  let ul = uloziste, ulAI = ulozisteAI, ulM = ulozisteMereni, ulP = ulozistePlanovac;
  const dej = async () => (ul ||= await vychoziUlozisteLovec());
  const dejAI = async () => (ulAI ||= await vychoziUloziste());
  const dejM = async () => (ulM ||= await vychoziUlozisteMereni());
  const dejP = async () => (ulP ||= await vychoziUlozistePlanovac());

  return async function handler(req) {
    const t = ted();
    const a = await overPozadavek(req, env, t, dejAI);
    if (!a.ok) return json({ chyba: a.duvod }, a.status);
    try {
      const store = await dej();
      const L = await dejAI();
      if (!(await pricti(L, "limit/lovec", 300, 10 * 60_000, t))) return json({ chyba: "Příliš mnoho požadavků za 10 minut." }, 429);
      const url = new URL(req.url);

      if (req.method === "GET") {
        if (url.searchParams.get("beh")) {
          const b = await store.get(`behy/${url.searchParams.get("beh").replace(/[^a-f0-9]/g, "")}`, { type: "json" });
          return b ? json(prubeh(b)) : json({ chyba: "Běh nenalezen." }, 404);
        }
        const prefix = url.searchParams.get("databaze") ? "databaze/" : url.searchParams.get("neozyvat") ? "neozyvat/" : "navrhy/";
        const { blobs = [] } = await store.list({ prefix });
        const polozky = (await Promise.all(blobs.slice(0, 500).map((x) => store.get(x.key, { type: "json" })))).filter(Boolean);
        return json({ polozky: polozky.sort((x, y) => (y.budova?.skore || 0) - (x.budova?.skore || 0)) });
      }
      if (req.method !== "POST") return json({ chyba: "Použijte GET nebo POST." }, 405);
      if (!povolenyOrigin(req.headers.get("origin"), env)) return json({ chyba: "Nepovolený původ požadavku." }, 403);
      let telo;
      try { telo = await req.json(); } catch { return json({ chyba: "Neplatný JSON." }, 400); }

      if (telo?.akce === "start") {
        const n = Math.min(50, Math.max(1, Math.trunc(Number(telo.n) || 25)));
        const obec = await najdiObec(String(telo.obec || "").slice(0, 120));
        if (!obec) return json({ chyba: "Obec jsme nenašli (zadejte název obce, u stejných jmen s okresem: „Lipová (Cheb)“)." }, 404);
        if (obec.nejednoznacne) return json({ stav: "vyber", kandidati: obec.nejednoznacne });
        if (obec.castObce) return json({ chyba: `„${obec.obec}“ je část obce ${obec.castObce} – zadejte obec.` }, 400);
        let vysledek;
        try {
          vysledek = await hledejSubjekty(fetchFn, { kodObce: obec.kod, pravniFormy: telo.druzstva ? ["145", "205"] : ["145"], start: 0, pocet: Math.min(100, n * 3) });
        } catch (e) {
          if (e.kod === "prilis-mnoho") return json({ chyba: `V obci ${obec.obec} je víc než 1 000 subjektů – ARES je najednou nevydá. U velkých měst zatím nejde; zvolte menší obec.` }, 422);
          return json({ chyba: "ARES teď neodpovídá – zkuste to za chvíli." }, 503);
        }
        const fronta = [];
        const subjekty = {};
        for (const s of vysledek.subjekty) {
          if (fronta.length >= n) break;
          if (await store.get(`neozyvat/${s.ico}`, { type: "json" })) continue; // trvalý seznam „neozývat“
          if (await store.get(`databaze/${s.ico}`, { type: "json" })) continue; // už schválené
          fronta.push(s.ico);
          subjekty[s.ico] = { ...s, faze: "mereni", zdroj: ZDROJ_ARES.nazev };
        }
        const id = idBehu();
        await store.setJSON(`behy/${id}`, { id, vytvoreno: new Date(t).toISOString(), vstup: { obec: obec.obec, okres: obec.okres, kodObce: obec.kod, n, druzstva: Boolean(telo.druzstva), osloveniJmenem: Boolean(telo.osloveniJmenem) }, fronta, subjekty, log: [`ARES: ${vysledek.celkem} subjektů v obci ${obec.obec}, ke zpracování ${fronta.length}`] });
        return json({ beh: id, celkem: fronta.length, aresCelkem: vysledek.celkem });
      }

      if (telo?.akce === "krok") {
        const id = String(telo.beh || "").replace(/[^a-f0-9]/g, "");
        const b = await zaberKrok(store, id, t);
        if (!b) {
          const x = await store.get(`behy/${id}`, { type: "json" });
          return x ? json({ ...prubeh(x), zaneprazdneno: !x.hotovo }) : json({ chyba: "Běh nenalezen." }, 404);
        }
        const ico = b.fronta.find((i) => b.subjekty[i].faze !== "hotovo");
        let novy = null, zapis = null;
        if (ico) {
          const envM = sModely(env, (await nactiNastaveni(L)).modely);
          const s = b.subjekty[ico];
          try {
            novy = await zpracujFazi(s, { fetchFn, adaptery: adaptery || vytvorAdaptery(envM), env: envM, ulAI: L, ted, zmerAdresu, storeMereni: await dejM(), osloveniJmenem: b.vstup.osloveniJmenem });
          } catch {
            novy = { ...s, faze: "hotovo", vysledek: "chyba", poznamka: "Krok selhal (služba neodpověděla)." };
          }
          if (novy.faze === "hotovo" && (novy.vysledek === "navrh" || novy.vysledek === "navrh-bez-kontaktu")) {
            zapis = { ico, nazev: novy.nazev, sidlo: novy.sidlo, pravniForma: novy.pravniForma, budova: novy.budova, kontakty: novy.kontakty || [], zahozeno: (novy.zahozeno || []).map(({ url, typ, duvod }) => ({ url, typ, duvod })), predseda: novy.predseda || null, zdroje: [ZDROJ_ARES.nazev, ...(novy.mereniZdroje || [])], hledaniChyba: novy.hledaniChyba || null, beh: id, navrzeno: new Date(t).toISOString(), stav: "navrh" };
          }
        }
        if (zapis) await store.setJSON(`navrhy/${ico}`, zapis);
        const po = await aktualizuj(store, `behy/${id}`, (x) => {
          if (!x) return null;
          const subjekty = ico ? { ...x.subjekty, [ico]: novy } : x.subjekty;
          const log = ico && novy.faze === "hotovo" ? [...(x.log || []), `${novy.nazev}: ${novy.vysledek}${novy.poznamka ? ` – ${novy.poznamka}` : ""}${novy.vysledek === "navrh" ? ` (${novy.kontakty.length} ověřené kontakty, skóre ${novy.budova?.skore})` : ""}`] : x.log;
          const hotovo = x.fronta.every((i) => subjekty[i].faze === "hotovo");
          const h = { ...x, subjekty, log, hotovo, zamek: null };
          return { hodnota: h, vysledek: h };
        });
        return json(prubeh(po));
      }

      // Odmítnutí podle kódu z dopisu (adresát zavolá nebo napíše kód, majitel ho zadá) – kód se dopočítá z IČO.
      if (telo?.akce === "neozyvat" && telo.kod && !telo.ico) {
        const tajemstvi = await tajemstviServeru(env, L);
        const { blobs = [] } = await store.list({ prefix: "databaze/" });
        telo.ico = blobs.map((x) => x.key.slice("databaze/".length)).find((i) => kodOdmitnuti(i, tajemstvi) === String(telo.kod).trim());
        if (!telo.ico) return json({ chyba: "Kód jsme nenašli – zadejte IČO společenství." }, 404);
      }
      const ico = String(telo?.ico || "");
      if (!ICO_RE.test(ico)) return json({ chyba: "Chybí IČO (8 číslic)." }, 400);

      if (telo.akce === "neozyvat") {
        await store.setJSON(`neozyvat/${ico}`, { ico, datum: new Date(t).toISOString(), duvod: String(telo.duvod || "na žádost").slice(0, 120) });
        await store.delete(`navrhy/${ico}`).catch(() => {});
        await store.delete(`databaze/${ico}`).catch(() => {});
        return json({ ok: true });
      }
      if (telo.akce === "zamitnout") {
        await store.delete(`navrhy/${ico}`).catch(() => {});
        return json({ ok: true });
      }
      if (telo.akce === "schvalit") {
        const n = await store.get(`navrhy/${ico}`, { type: "json" });
        if (!n) return json({ chyba: "Návrh nenalezen." }, 404);
        const vybrane = Array.isArray(telo.kontakty) ? telo.kontakty.map(Number).filter((i) => n.kontakty[i]).map((i) => n.kontakty[i]) : n.kontakty;
        const zaznam = {
          ...n, kontakty: vybrane, stav: "schvaleno", schvaleno: new Date(t).toISOString(),
          pravniZaklad: PRAVNI_ZAKLAD, zdrojUdaju: [...n.zdroje, ...vybrane.map((k) => k.url)],
          kanaly: KANALY, emailPovolen: false, // e-mail jen po souhlasu nebo u stávajícího zákazníka – nastavuje se ručně
          schvalenyKontakt: vybrane[0] || null,
        };
        delete zaznam.zahozeno;
        await store.setJSON(`databaze/${ico}`, zaznam);
        await store.delete(`navrhy/${ico}`).catch(() => {});
        return json({ ok: true, zaznam });
      }
      if (telo.akce === "dopis") {
        const z = await store.get(`databaze/${ico}`, { type: "json" });
        if (!z) return json({ chyba: "Dopis jde jen pro schválený záznam." }, 404);
        if (await store.get(`neozyvat/${ico}`, { type: "json" })) return json({ chyba: "SVJ je na seznamu neozývat." }, 409);
        let kupon = null;
        try { kupon = await vytvorKupon(await dejP(), { poznamka: `SVJ ${ico}`, maxPouziti: 1, ted: t }, cfgPlanovac.kupon); } catch { kupon = null; }
        const tajemstvi = await tajemstviServeru(env, L);
        const fakta = faktaDopisu(z, firma, { kupon, kodOdmitnuti: kodOdmitnuti(ico, tajemstvi) });
        const envM = sModely(env, (await nactiNastaveni(L)).modely);
        const d = await napisDopis(fakta, { adaptery: adaptery || vytvorAdaptery(envM), env: envM, ulAI: L, ted });
        const odkazQR = kupon ? `https://hspg.cz/planovac/?kupon=${encodeURIComponent(kupon.kod)}` : "https://hspg.cz/planovac/";
        const html = await htmlDopisu({ text: d.text, fakta, odkazQR, datum: new Date(t).toLocaleDateString("cs-CZ") });
        await aktualizuj(store, `databaze/${ico}`, (x) => (x ? { hodnota: { ...x, dopisy: [...(x.dopisy || []), { datum: new Date(t).toISOString(), autor: d.autor, kupon: kupon?.kod || null }] }, vysledek: true } : null)).catch(() => {});
        return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-dopis-autor": d.autor, "x-dopis-kontrola": encodeURIComponent(d.kontrola) } });
      }
      return json({ chyba: "Neznámá akce." }, 400);
    } catch {
      return json({ chyba: "Úložiště nebo služby nejsou dostupné – zkuste to za chvíli." }, 503);
    }
  };
}

export default vytvorLovce();

export const config = { path: "/api/lovec-svj" };
