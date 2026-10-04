// iCalendar (RFC 5545) pro H-WEATHER CONTROL: čtení kalendáře majitele (tajná adresa iCal z Google
// Kalendáře) a výroba kalendáře s varováním počasí, který si majitel přidá do Google Kalendáře „z URL“.
// Bez závislostí. Čte jen to, co plánování potřebuje: UID, SUMMARY, LOCATION, DESCRIPTION, DTSTART, DTEND,
// STATUS, RRULE, RECURRENCE-ID. Opakované události (RRULE) se nerozepisují – vrátí se jako přeskočené.

export const ZONA = "Europe/Prague";

const formaty = new Map();
function format(zona) {
  if (!formaty.has(zona)) {
    formaty.set(zona, new Intl.DateTimeFormat("en-US", {
      timeZone: zona, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    }));
  }
  return formaty.get(zona);
}

function platnaZona(zona) {
  try { format(zona); return true; } catch { return false; }
}

// Místní čas v zóně pro okamžik (ms UTC) → { datum: "RRRR-MM-DD", hodina, minuta }.
export function mistni(ms, zona = ZONA) {
  const c = Object.fromEntries(format(zona).formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  return { datum: `${c.year}-${c.month}-${c.day}`, hodina: Number(c.hour), minuta: Number(c.minute) };
}

function posunZony(ms, zona) {
  const c = Object.fromEntries(format(zona).formatToParts(new Date(ms)).map((p) => [p.type, p.value]));
  return Date.UTC(+c.year, +c.month - 1, +c.day, +c.hour, +c.minute, +c.second) - Math.floor(ms / 1000) * 1000;
}

// Místní čas v zóně → ms UTC (dvě iterace stačí i na přechod letního času).
export function zMistniho(rok, mesic, den, hod = 0, min = 0, sek = 0, zona = ZONA) {
  const odhad = Date.UTC(rok, mesic - 1, den, hod, min, sek);
  let utc = odhad - posunZony(odhad, zona);
  utc = odhad - posunZony(utc, zona);
  return utc;
}

export const dalsiDen = (datum, o = 1) => new Date(Date.parse(`${datum}T12:00:00Z`) + o * 864e5).toISOString().slice(0, 10);

// --- čtení ---------------------------------------------------------------------------------------

const odescapuj = (s) => s.replace(/\\([\\;,nN])/g, (_, z) => (z === "n" || z === "N" ? "\n" : z));

// Řádek „NAZEV;PARAM=a;PARAM2="x:y":hodnota“ → { nazev, parametry, hodnota }.
function radek(r) {
  let i = 0, uvozovky = false;
  for (; i < r.length; i++) {
    const z = r[i];
    if (z === '"') uvozovky = !uvozovky;
    else if (z === ":" && !uvozovky) break;
  }
  const hlava = r.slice(0, i), hodnota = r.slice(i + 1);
  const casti = hlava.match(/(?:[^;"]|"[^"]*")+/g) || [""];
  const parametry = {};
  for (const p of casti.slice(1)) {
    const j = p.indexOf("=");
    if (j > 0) parametry[p.slice(0, j).toUpperCase()] = p.slice(j + 1).replace(/^"|"$/g, "");
  }
  return { nazev: casti[0].toUpperCase(), parametry, hodnota };
}

// Datum/čas z iCal → { datum (místní v ZONA), celyDen, ms (UTC, u celého dne začátek dne v ZONA) } | null.
export function ctiCas(hodnota, parametry = {}) {
  const v = String(hodnota || "").trim();
  const d = v.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (d || String(parametry.VALUE || "").toUpperCase() === "DATE") {
    if (!d) return null;
    const datum = `${d[1]}-${d[2]}-${d[3]}`;
    if (Number.isNaN(Date.parse(`${datum}T00:00:00Z`))) return null;
    return { datum, celyDen: true, ms: zMistniho(+d[1], +d[2], +d[3]) };
  }
  const t = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!t) return null;
  const [, r, m, dd, h, mi, s, z] = t;
  let ms;
  if (z) ms = Date.UTC(+r, +m - 1, +dd, +h, +mi, +s);
  else {
    // Bez zóny („plovoucí“ čas) nebo s neznámou zónou (např. názvy z Windows) = čas v Česku.
    const zona = parametry.TZID && platnaZona(parametry.TZID) ? parametry.TZID : ZONA;
    ms = zMistniho(+r, +m, +dd, +h, +mi, +s, zona);
  }
  if (!Number.isFinite(ms)) return null;
  return { datum: mistni(ms).datum, celyDen: false, ms };
}

// Celý text kalendáře → { udalosti: [...], preskoceno: { opakovane, zrusene, bezCasu } }.
// Opakované události (RRULE) s FREQ=DAILY/WEEKLY (INTERVAL, COUNT, UNTIL, BYDAY, EXDATE) se rozepíší
// v okně { od, do } (výchozí dnes až +120 dní); upravené výskyty (RECURRENCE-ID) nahradí původní.
// Složitější pravidla (měsíční, roční, BYSETPOS…) se nerozepisují – započtou se do preskoceno.opakovane.
export function ctiKalendar(text, { od, do: do_ } = {}) {
  const radky = String(text || "").replace(/\r\n|\r/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const surove = [];
  const preskoceno = { opakovane: 0, zrusene: 0, bezCasu: 0 };
  let u = null, hloubka = 0;
  for (const r of radky) {
    if (!r) continue;
    const { nazev, parametry, hodnota } = radek(r);
    if (nazev === "BEGIN") {
      if (hodnota.toUpperCase() === "VEVENT" && !u) { u = { parametry: {}, EXDATY: [] }; hloubka = 0; }
      else if (u) hloubka++; // VALARM uvnitř události
      continue;
    }
    if (nazev === "END") {
      if (!u) continue;
      if (hloubka > 0) { hloubka--; continue; }
      if (hodnota.toUpperCase() !== "VEVENT") continue;
      surove.push(u);
      u = null;
      continue;
    }
    if (!u || hloubka > 0) continue;
    if (nazev === "EXDATE") { for (const h of hodnota.split(",")) u.EXDATY.push([h, parametry]); continue; }
    if (!(nazev in u)) { u[nazev] = hodnota; u.parametry[nazev] = parametry; }
  }
  const dnes = mistni(Date.now()).datum;
  const okno = { od: od || dnes, do: do_ || dalsiDen(od || dnes, 120) };
  // Výskyty nahrazené samostatnou úpravou (RECURRENCE-ID) – původní výskyt série se vynechá.
  const nahrazene = new Map();
  for (const x of surove) {
    if (!x["RECURRENCE-ID"]) continue;
    const d = ctiCas(x["RECURRENCE-ID"], x.parametry["RECURRENCE-ID"])?.datum;
    if (!d) continue;
    const k = String(x.UID || "");
    if (!nahrazene.has(k)) nahrazene.set(k, new Set());
    nahrazene.get(k).add(d);
  }
  const udalosti = [];
  for (const x of surove) {
    if (String(x.STATUS || "").toUpperCase() === "CANCELLED") { preskoceno.zrusene++; continue; }
    const zaklad = dokonci(x);
    if (!zaklad) { preskoceno.bezCasu++; continue; }
    if (!x.RRULE) { udalosti.push(zaklad); continue; }
    const exdaty = new Set(x.EXDATY.map(([h, p]) => ctiCas(h, p)?.datum).filter(Boolean));
    const vyskyty = rozepis(zaklad, x.RRULE, exdaty, nahrazene.get(String(x.UID || "")) || new Set(), okno);
    if (!vyskyty) { preskoceno.opakovane++; continue; }
    udalosti.push(...vyskyty);
  }
  return { udalosti, preskoceno };
}

const DEN_RRULE = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 7 };
const denTydne = (d) => new Date(`${d}T12:00:00Z`).getUTCDay() || 7;
const dnyMezi = (a, b) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / 864e5);

// Výskyty série v okně, nebo null u nepodporovaného pravidla.
export function rozepis(zaklad, rrule, exdaty, nahrazene, okno) {
  const p = Object.fromEntries(String(rrule).split(";").map((x) => x.split("=")).filter((x) => x.length === 2).map(([k, v]) => [k.toUpperCase(), v.toUpperCase()]));
  if (!["DAILY", "WEEKLY"].includes(p.FREQ) || p.BYMONTHDAY || p.BYSETPOS || p.BYMONTH || p.BYYEARDAY || p.BYWEEKNO || p.BYHOUR) return null;
  if (p.FREQ === "DAILY" && p.BYDAY) return null;
  const interval = Math.max(1, parseInt(p.INTERVAL || "1", 10) || 1);
  const pocet = p.COUNT ? Math.max(0, parseInt(p.COUNT, 10) || 0) : Infinity;
  const until = p.UNTIL ? ctiCas(p.UNTIL, {})?.datum || null : null;
  const start = zaklad.dny[0];
  const delka = zaklad.dny.length;
  const dnyTydne = p.FREQ === "WEEKLY" && p.BYDAY ? p.BYDAY.split(",").map((x) => DEN_RRULE[x.replace(/^[+-]?\d+/, "")]).filter(Boolean) : null;
  if (dnyTydne && !dnyTydne.length) return null;
  const startTyden = denTydne(start);
  const out = [];
  let n = 0;
  for (let i = 0, d = start; i < 4000 && d <= okno.do; i++, d = dalsiDen(d)) {
    if (until && d > until) break;
    const odStartu = dnyMezi(start, d);
    const shoda = p.FREQ === "DAILY"
      ? odStartu % interval === 0
      : Math.floor((odStartu + startTyden - 1) / 7) % interval === 0 && (dnyTydne ? dnyTydne.includes(denTydne(d)) : denTydne(d) === startTyden);
    if (!shoda) continue;
    n++;
    if (n > pocet) break;
    if (exdaty.has(d) || nahrazene.has(d)) continue;
    const posledni = dalsiDen(d, delka - 1);
    if (posledni < okno.od) continue;
    const dny = [];
    for (let j = 0; j < delka; j++) dny.push(dalsiDen(d, j));
    out.push({ ...zaklad, dny, opakovani: true });
  }
  return out;
}

function dokonci(u) {
  const od = ctiCas(u.DTSTART, u.parametry.DTSTART);
  if (!od) return null;
  const konec = u.DTEND ? ctiCas(u.DTEND, u.parametry.DTEND) : null;
  // Dny události (místní data). DTEND u celodenních je výlučný; u časových se den konce počítá,
  // pokud událost nekončí přesně o půlnoci. Nejvýš 14 dní (delší „události“ nejsou zakázky).
  const dny = [];
  let posledni = od.datum;
  if (od.celyDen) {
    if (konec?.celyDen && konec.datum > od.datum) posledni = dalsiDen(konec.datum, -1);
  } else if (konec && !konec.celyDen && konec.ms > od.ms) {
    const m = mistni(konec.ms);
    posledni = m.hodina === 0 && m.minuta === 0 ? mistni(konec.ms - 1).datum : m.datum;
  }
  for (let d = od.datum; d <= posledni && dny.length < 14; d = dalsiDen(d)) dny.push(d);
  const hodinyOd = od.celyDen ? null : mistni(od.ms).hodina;
  let hodinyDo = null;
  if (!od.celyDen && konec && !konec.celyDen && konec.ms > od.ms && dny.length === 1) {
    const m = mistni(konec.ms);
    hodinyDo = Math.min(24, Math.max(hodinyOd + 1, m.hodina + (m.minuta > 0 ? 1 : 0) || 24));
  }
  return {
    uid: odescapuj(String(u.UID || "")).slice(0, 300),
    nazev: odescapuj(String(u.SUMMARY || "")).slice(0, 300),
    misto: odescapuj(String(u.LOCATION || "")).slice(0, 300),
    popis: odescapuj(String(u.DESCRIPTION || "")).slice(0, 2000),
    dny,
    celyDen: od.celyDen,
    hodinyOd,
    hodinyDo,
  };
}

// --- výroba --------------------------------------------------------------------------------------

export const escapuj = (s) => String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// Zalomení na 75 oktetů (UTF-8), pokračování začíná mezerou; vícebajtové znaky se nedělí.
export function zalom(r) {
  const out = [];
  let akt = "", bajty = 0, limit = 75;
  for (const z of r) {
    const b = Buffer.byteLength(z);
    if (bajty + b > limit) {
      out.push(akt);
      akt = " ";
      bajty = 1;
      limit = 75;
    }
    akt += z;
    bajty += b;
  }
  out.push(akt);
  return out.join("\r\n");
}

const zakladni = (ms) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const datumIcs = (d) => d.replace(/-/g, "");

// udalosti: [{ uid, datum, nazev, popis, misto?, url? }] → text kalendáře (CRLF).
export function vyrobKalendar({ nazev, popis, udalosti = [], ted = Date.now(), obnovaHodin = 6 }) {
  const r = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HOLUB HSPG//H-WEATHER CONTROL//CS",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapuj(nazev)}`,
    ...(popis ? [`X-WR-CALDESC:${escapuj(popis)}`] : []),
    `X-WR-TIMEZONE:${ZONA}`,
    `REFRESH-INTERVAL;VALUE=DURATION:PT${obnovaHodin}H`,
    `X-PUBLISHED-TTL:PT${obnovaHodin}H`,
  ];
  for (const u of udalosti) {
    r.push(
      "BEGIN:VEVENT",
      `UID:${escapuj(u.uid)}`,
      `DTSTAMP:${zakladni(ted)}`,
      `DTSTART;VALUE=DATE:${datumIcs(u.datum)}`,
      `DTEND;VALUE=DATE:${datumIcs(dalsiDen(u.datum))}`,
      `SUMMARY:${escapuj(u.nazev)}`,
      ...(u.popis ? [`DESCRIPTION:${escapuj(u.popis)}`] : []),
      ...(u.misto ? [`LOCATION:${escapuj(u.misto)}`] : []),
      ...(u.url ? [`URL:${String(u.url).replace(/[\r\n]/g, "")}`] : []),
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    );
  }
  r.push("END:VCALENDAR");
  return r.map(zalom).join("\r\n") + "\r\n";
}
