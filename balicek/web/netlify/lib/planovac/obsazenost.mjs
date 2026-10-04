// Obsazenost dnů pro plánovač: čte kalendář zakázek majitele (HSPG_KALENDAR_ICS_URL – tajná adresa iCal
// z Google Kalendáře, jen v Netlify) a rezervace z plánovače. Zákazník dostane jen volno/obsazeno po dnech,
// nikdy názvy, místa ani lidi. Kalendář se stahuje nejvýš jednou za 10 minut (paměť instance + Blobs).
import { ctiKalendar, mistni, dalsiDen } from "../pocasi/ical.mjs";

const PLATNOST_MS = 10 * 60e3;
const NEJDELSI_ZASTARALOST_MS = 24 * 36e5;
const MAX_BAJTU = 5 * 1024 * 1024;
const LIMIT_MS = 10_000;
const KLIC = "kalendar/udalosti";

// Text odpovědi s limitem velikosti (Google posílá celou historii kalendáře – desítky kB až jednotky MB).
async function textSLimitem(r, max) {
  if (!r.body?.getReader) { const b = Buffer.from(await r.arrayBuffer()); if (b.length > max) throw new Error("Kalendář je příliš velký."); return odfolduj(b); }
  const cteni = r.body.getReader();
  const kusy = [];
  let n = 0;
  for (;;) {
    const { done, value } = await cteni.read();
    if (done) break;
    n += value.byteLength;
    if (n > max) { await cteni.cancel().catch(() => {}); throw new Error("Kalendář je příliš velký."); }
    kusy.push(value);
  }
  return odfolduj(Buffer.concat(kusy.map((x) => Buffer.from(x))));
}

// Rozbalení zalomených řádků (CRLF/LF + mezera/tab) ještě na bajtech: zalomení podle RFC 5545 smí
// rozdělit i vícebajtový znak UTF-8 – po dekódování by z něj zbyly dva neplatné znaky.
export function odfolduj(buf) {
  const out = Buffer.allocUnsafe(buf.length);
  let j = 0;
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    if (b === 0x0d && buf[i + 1] === 0x0a && (buf[i + 2] === 0x20 || buf[i + 2] === 0x09)) { i += 2; continue; }
    if (b === 0x0a && (buf[i + 1] === 0x20 || buf[i + 1] === 0x09)) { i += 1; continue; }
    out[j++] = b;
  }
  return out.subarray(0, j).toString("utf8");
}

// Jen budoucí události (do 120 dní), jen pole potřebná pro plánování.
export function zuzUdalosti(udalosti, ted) {
  const dnes = mistni(ted).datum;
  const mez = dalsiDen(dnes, 120);
  return udalosti
    .map((u) => ({ ...u, dny: u.dny.filter((d) => d >= dnes && d <= mez) }))
    .filter((u) => u.dny.length)
    .map(({ uid, nazev, misto, dny, celyDen, hodinyOd, hodinyDo }) => ({ uid, nazev, misto, dny, celyDen, hodinyOd, hodinyDo }));
}

export function vytvorKalendarZakazek({ env = process.env, fetchFn = fetch, uloziste, ted = () => Date.now() } = {}) {
  let pamet = null;
  return async function udalosti() {
    const url = env.HSPG_KALENDAR_ICS_URL || "";
    if (!/^https:\/\//i.test(url)) return { nastaveno: false, udalosti: [], preskoceno: null };
    const t = ted();
    if (pamet && t - pamet.stazeno < PLATNOST_MS) return pamet.vystup;
    let ulozeno = null;
    if (uloziste) { try { ulozeno = await uloziste.get(KLIC, { type: "json" }); } catch { ulozeno = null; } }
    if (ulozeno && t - ulozeno.stazeno < PLATNOST_MS) { pamet = ulozeno; return ulozeno.vystup; }
    const ac = new AbortController();
    const casovac = setTimeout(() => ac.abort(), LIMIT_MS);
    try {
      const r = await fetchFn(url, { headers: { accept: "text/calendar" }, signal: ac.signal });
      if (!r.ok) throw new Error(`Kalendář: HTTP ${r.status}`);
      const dnes = mistni(t).datum;
      const { udalosti: vse, preskoceno } = ctiKalendar(await textSLimitem(r, MAX_BAJTU), { od: dnes, do: dalsiDen(dnes, 120) });
      const vystup = { nastaveno: true, udalosti: zuzUdalosti(vse, t), preskoceno, stazeno: new Date(t).toISOString() };
      pamet = { stazeno: t, vystup };
      if (uloziste) await uloziste.setJSON(KLIC, pamet).catch(() => {});
      return vystup;
    } catch (e) {
      // Adresu kalendáře (tajnou) nikdy do logu ani do odpovědi.
      console.warn("planovac: kalendář nejde načíst –", String(e?.message || e).replace(/https?:\/\/\S+/g, "[adresa]"));
      const zalozni = pamet || ulozeno;
      if (zalozni && t - zalozni.stazeno < NEJDELSI_ZASTARALOST_MS) return { ...zalozni.vystup, zastarale: true };
      return { nastaveno: true, chyba: true, udalosti: [], preskoceno: null };
    } finally {
      clearTimeout(casovac);
    }
  };
}

// Události zakázek (podle značky v názvu, pokud je nastavená).
export function jeZakazka(u, znacka = "") {
  return !znacka || u.nazev.toLowerCase().includes(String(znacka).toLowerCase());
}

// Dny plánovače: od dnes + nejdriveZaDni na horizontDni dopředu; pracovní dny podle cfg.pracovniDny (1 = po … 7 = ne).
export function dnyPlanovace(ted, cfg) {
  const dnes = mistni(ted).datum;
  const dny = [];
  for (let i = cfg.nejdriveZaDni ?? 1; i <= (cfg.horizontDni ?? 21); i++) {
    const d = dalsiDen(dnes, i);
    const tyden = new Date(`${d}T12:00:00Z`).getUTCDay() || 7;
    dny.push({ datum: d, pracovni: (cfg.pracovniDny || [1, 2, 3, 4, 5, 6]).includes(tyden) });
  }
  return dny;
}

// Počet zakázek po dnech → volno (true/false). Bez kalendáře (nenastaven / chyba) volno = null („termín potvrdíme“).
export function volneDny(dny, kalendar, cfg) {
  const pocty = new Map();
  if (kalendar?.nastaveno && !kalendar.chyba) {
    for (const u of kalendar.udalosti) {
      if (!jeZakazka(u, cfg.kalendar?.znacka)) continue;
      for (const d of u.dny) pocty.set(d, (pocty.get(d) || 0) + 1);
    }
  }
  const znamo = Boolean(kalendar?.nastaveno && !kalendar.chyba);
  const kapacita = Math.max(1, Number(cfg.kapacitaZakazekNaDen) || 1);
  return dny.map((d) => ({ ...d, volno: !d.pracovni ? false : znamo ? (pocty.get(d.datum) || 0) < kapacita : null }));
}
