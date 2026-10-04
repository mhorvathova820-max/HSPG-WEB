// /api/pocasi-kalendar/<klíč>.ics – kalendář s varováním počasí (iCalendar) pro Google Kalendář majitele:
// Google Kalendář → Další kalendáře → + → Z adresy URL → odkaz z panelu (H-WEATHER CONTROL → „Odkaz pro Google Kalendář“).
// Obsah: ke každé zakázce z kalendáře a rezervaci z plánovače v dosahu předpovědi celodenní událost
// „✅/⚠️/⛔ obec – důvod“; rezervace mimo dosah jako „🟡 Rezervace … (předpověď zatím není)“.
// Google si odkaz stahuje sám zhruba několikrát denně (interval neovlivníme). Výsledek se drží 30 minut
// v Blobs, takže ani častější stahování nestojí výpočet ani dotazy na MET Norway.
// Špatný nebo starý klíč → 404 (nic neprozradí). Klíč ani adresy kalendářů se nelogují.
import cfgVychozi from "../../content/planovac.json" with { type: "json" };
import pravidlaVychozi from "../../content/pocasi-prace.json" with { type: "json" };
import { createHash } from "node:crypto";
import { tajemstviServeru } from "../lib/ai/autorizace.mjs";
import { vychoziUloziste } from "../lib/ai/limity.mjs";
import { najdiObec } from "../lib/pocasi/obce.mjs";
import { vytvorZdroj, ZDROJ } from "../lib/pocasi/zdroj.mjs";
import { POPIS_UROVNE, ZNACKA_UROVNE, shrnuti } from "../lib/pocasi/vyhodnoceni.mjs";
import { mistni, dalsiDen, vyrobKalendar } from "../lib/pocasi/ical.mjs";
import { vytvorKalendarZakazek } from "../lib/planovac/obsazenost.mjs";
import { vychoziUlozistePlanovac } from "../lib/planovac/kupony.mjs";
import { rezervaceVObdobi } from "../lib/planovac/rezervace.mjs";
import { polozky, vyhodnotPolozky, HORIZONT_POCASI_DNI, verzeKalendare, overKlicKalendare } from "../lib/planovac/prehled.mjs";

const PLATNOST_MS = 30 * 60e3;
const nenalezeno = () => new Response("Nenalezeno.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
const SPOLEHLIVOST = { vysoka: "vysoká (do 3 dnů)", stredni: "střední (4–6 dní)", nizka: "nízká (7 a více dní)", neznamo: "—" };
const uidZ = (s) => `${createHash("sha256").update(s).digest("hex").slice(0, 32)}@hspg.cz`;

export function udalostiZPrehledu(vyhodnocene, mimoHorizont, pravidla) {
  const out = [];
  for (const p of vyhodnocene) {
    const kde = p.obec || p.misto || "bez místa";
    const hlava = p.zdroj === "rezervace" ? `🟡 ${p.nazev.replace(/^Rezervace /, "Rez. ")} · ` : "";
    if (p.chyba) {
      out.push({ uid: uidZ(`${p.uid}|${p.datum}`), datum: p.datum, nazev: `${hlava}❔ ${kde} – počasí nejde vyhodnotit`, popis: `${p.nazev}\n${p.chyba}` });
      continue;
    }
    const v = p.vysledek;
    const radky = [
      p.nazev,
      `Typ práce: ${p.typNazev}${p.pravidlaPotvrzena ? "" : " (pravidla zatím nepotvrzená – ověřte podle technického listu)"}`,
      `Hodnocení: ${ZNACKA_UROVNE[v.uroven]} ${POPIS_UROVNE[v.uroven]} · spolehlivost předpovědi ${SPOLEHLIVOST[v.spolehlivost]}`,
      `Pracovní okno: ${v.okno.od}–${v.okno.do} h`,
      ...v.duvody.map((d) => `• ${d.text}`),
      p.kupon ? `Kupon: ${p.kuponOk ? "platný – 1 l H-STONE zdarma" : "neplatný nebo neověřený – zkontrolujte v panelu"}` : null,
      p.zdroj === "rezervace" ? "Sleva 10 % za rezervaci v plánovači (podle podmínek akce)." : null,
      `Předpověď aktualizována: ${p.aktualizovano || "—"}${p.zastarale ? " (uložená kopie – zdroj teď neodpovídá)" : ""}`,
      ZDROJ.text,
    ].filter(Boolean);
    out.push({ uid: uidZ(`${p.uid}|${p.datum}`), datum: p.datum, nazev: `${hlava}${shrnuti(v).replace(/^(\S+) /, `$1 ${kde} – `)}`, popis: radky.join("\n") });
  }
  for (const r of mimoHorizont) {
    out.push({
      uid: uidZ(`rez-${r.cislo}|${r.termin}`), datum: r.termin,
      nazev: `🟡 Rezervace #${r.cislo} – ${r.obec || "bez obce"} (předpověď zatím není)`,
      popis: [`Služba: ${r.sluzba || "—"}`, r.nahradni ? `Náhradní termín: ${r.nahradni}` : null, r.kupon ? `Kupon: ${r.kuponOk ? "platný" : "zkontrolujte"}` : null, "Počasí se vyhodnotí, až bude termín v dosahu předpovědi (~9 dní)."].filter(Boolean).join("\n"),
    });
  }
  return out;
}

export function vytvorKalendarPocasi({ env = process.env, uloziste, ulozistePlanovac, fetchFn = fetch, ted = () => Date.now(), cfg = cfgVychozi, pravidla = pravidlaVychozi, predpoved, kalendar, obce } = {}) {
  let ul = uloziste, ulP = ulozistePlanovac;
  const dejUloziste = async () => (ul ||= await vychoziUloziste());
  const dejPlanovac = async () => (ulP ||= await vychoziUlozistePlanovac());
  const zdroj = predpoved || vytvorZdroj({ env, fetchFn, ted });
  const hledej = obce || najdiObec;
  let kal = kalendar;

  return async function handler(req) {
    if (req.method !== "GET" && req.method !== "HEAD") return nenalezeno();
    const u = new URL(req.url);
    const klic = u.pathname.match(/\/api\/pocasi-kalendar\/([A-Za-z0-9_-]{43})\.ics$/)?.[1] || u.searchParams.get("klic") || "";
    if (!/^[A-Za-z0-9_-]{43}$/.test(klic)) return nenalezeno();
    const t = ted();
    let store, verze;
    try {
      store = await dejUloziste();
      verze = await verzeKalendare(store);
      if (!overKlicKalendare(klic, await tajemstviServeru(env, store), verze)) return nenalezeno();
    } catch {
      return new Response("Dočasně nedostupné.", { status: 503, headers: { "retry-after": "600", "cache-control": "no-store" } });
    }
    const odpoved = (text) => new Response(req.method === "HEAD" ? null : text, {
      // Klíč je v cestě → CDN Netlify drží odpověď 30 minut jen pro tuto adresu (šetří volání funkce).
      headers: { "content-type": "text/calendar; charset=utf-8", "cache-control": "private, max-age=0", "netlify-cdn-cache-control": "public, max-age=1800", "content-disposition": 'inline; filename="h-weather-control.ics"' },
    });

    const P = await dejPlanovac().catch(() => null);
    const klicVystupu = `kalendar/vystup-${verze}`;
    try {
      const ulozeny = P ? await P.get(klicVystupu, { type: "json" }) : null;
      if (ulozeny && t - ulozeny.vytvoreno < PLATNOST_MS) return odpoved(ulozeny.text);
    } catch { /* bez mezipaměti */ }

    kal ||= vytvorKalendarZakazek({ env, fetchFn, uloziste: P, ted });
    const k = await kal();
    const dnes = mistni(t).datum;
    let rezervace = [];
    if (P) { try { rezervace = await rezervaceVObdobi(P, dnes, dalsiDen(dnes, cfg.horizontDni ?? 21), t); } catch { rezervace = []; } }
    const vyhodnocene = await vyhodnotPolozky(polozky({ kalendar: k, rezervace, cfg, pravidla, ted: t }), { pravidla, hledej, zdroj, ted: t });
    const mez = dalsiDen(dnes, HORIZONT_POCASI_DNI);
    const udalosti = udalostiZPrehledu(vyhodnocene, rezervace.filter((r) => r.termin > mez), pravidla);
    if (k.nastaveno && k.chyba) {
      udalosti.push({ uid: uidZ(`chyba-kalendare|${dnes}`), datum: dnes, nazev: "❔ H-WEATHER: kalendář zakázek nejde načíst", popis: "Zkontrolujte HSPG_KALENDAR_ICS_URL v Netlify (tajná adresa iCal kalendáře zakázek)." });
    }
    const text = vyrobKalendar({
      nazev: "H-WEATHER CONTROL – HSPG",
      popis: "Počasí pro zakázky a rezervace z plánovače (interní). Na základě dat MET Norway, CC BY 4.0.",
      udalosti,
      ted: t,
    });
    if (P) await P.setJSON(klicVystupu, { vytvoreno: t, text }).catch(() => {});
    return odpoved(text);
  };
}

export default vytvorKalendarPocasi();

export const config = { path: ["/api/pocasi-kalendar", "/api/pocasi-kalendar/*"] };
