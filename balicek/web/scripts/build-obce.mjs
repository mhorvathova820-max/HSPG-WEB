#!/usr/bin/env node
// Sestaví content/obce.json – seznam obcí ČR (a částí obcí) se souřadnicemi WGS84 pro předpověď počasí.
// Zdroj: ČÚZK, RÚIAN – výměnný formát, soubor za stát ST_UZSZ (otevřená data, licence CC BY 4.0,
// komerční použití dovoleno, uvedení zdroje „ČÚZK, rok“). Bez závislostí: ZIP rozbalí zlib, XML se čte
// regulárními výrazy (formát je strojový a stabilní), S-JTSK (EPSG:5514) → WGS84 přepočte Křovák + Helmert.
//
//   node scripts/build-obce.mjs                   stáhne nejnovější soubor (poslední den minulého měsíce)
//   node scripts/build-obce.mjs --soubor X.zip    použije stažený soubor
//   node scripts/build-obce.mjs --kontrola        jen ověří, že content/obce.json existuje a sedí kontrolní body
// Obnovit jednou ročně (v lednu – změny obcí platí od 1. 1.) nebo při hlášení „obec nenalezena“.
import { readFile, writeFile } from "node:fs/promises";
import { inflateRawSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const CIL = fileURLToPath(new URL("../content/obce.json", import.meta.url));
const KONTROLNI = [["Kolín", "Kolín", 50.028, 15.201], ["Praha", "Praha", 50.085, 14.418], ["Lipová", "Zlín", 49.122, 17.88]];

// --- S-JTSK → WGS84 ------------------------------------------------------------------------------
const rad = (x) => (x * Math.PI) / 180;
const a = 6377397.155, f = 1 / 299.1528128, e2 = 2 * f - f * f, e = Math.sqrt(e2);
const phic = rad(49.5), lam0 = rad(24 + 50 / 60), alphac = rad(30 + 17 / 60 + 17.30311 / 3600), phip = rad(78.5), kp = 0.9999;
const A = (a * Math.sqrt(1 - e2)) / (1 - e2 * Math.sin(phic) ** 2);
const B = Math.sqrt(1 + (e2 * Math.cos(phic) ** 4) / (1 - e2));
const g0 = Math.asin(Math.sin(phic) / B);
const t0 = (Math.tan(Math.PI / 4 + g0 / 2) * ((1 + e * Math.sin(phic)) / (1 - e * Math.sin(phic))) ** ((e * B) / 2)) / Math.tan(Math.PI / 4 + phic / 2) ** B;
const n = Math.sin(phip), r0 = (kp * A) / Math.tan(phip);

export function sjtskNaWgs84(E, N) {
  const X = -N, Y = -E;
  const r = Math.hypot(X, Y), th = Math.atan2(Y, X), D = th / Math.sin(phip);
  const T = 2 * (Math.atan((r0 / r) ** (1 / n) * Math.tan(Math.PI / 4 + phip / 2)) - Math.PI / 4);
  const U = Math.asin(Math.cos(alphac) * Math.sin(T) - Math.sin(alphac) * Math.cos(T) * Math.cos(D));
  const V = Math.asin((Math.cos(T) * Math.sin(D)) / Math.cos(U));
  let phi = U;
  for (let i = 0; i < 10; i++) {
    phi = 2 * (Math.atan(t0 ** (-1 / B) * Math.tan(U / 2 + Math.PI / 4) ** (1 / B) * ((1 + e * Math.sin(phi)) / (1 - e * Math.sin(phi))) ** (e / 2)) - Math.PI / 4);
  }
  const lam = lam0 - V / B;
  // Bessel → ECEF → Helmert (7 parametrů, S-JTSK → WGS84) → WGS84
  const Nn = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  const x = Nn * Math.cos(phi) * Math.cos(lam), y = Nn * Math.cos(phi) * Math.sin(lam), z = Nn * (1 - e2) * Math.sin(phi);
  const [tx, ty, tz, s] = [570.8, 85.7, 462.8, 3.56e-6];
  const [rx, ry, rz] = [4.998, 1.587, 5.261].map((v) => rad(v / 3600));
  const x2 = tx + (1 + s) * (x - rz * y + ry * z), y2 = ty + (1 + s) * (rz * x + y - rx * z), z2 = tz + (1 + s) * (-ry * x + rx * y + z);
  const aw = 6378137.0, fw = 1 / 298.257223563, ew2 = 2 * fw - fw * fw;
  const lon = Math.atan2(y2, x2), p = Math.hypot(x2, y2);
  let lat = Math.atan2(z2, p * (1 - ew2));
  for (let i = 0; i < 10; i++) { const Nw = aw / Math.sqrt(1 - ew2 * Math.sin(lat) ** 2); lat = Math.atan2(z2 + ew2 * Nw * Math.sin(lat), p); }
  return [(lat * 180) / Math.PI, (lon * 180) / Math.PI];
}

// --- ZIP (jeden soubor, deflate) -----------------------------------------------------------------
export function rozbalJedinySoubor(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("ZIP: chybí konec centrálního adresáře");
  const cd = buf.readUInt32LE(eocd + 16);
  if (buf.readUInt32LE(cd) !== 0x02014b50) throw new Error("ZIP: poškozený centrální adresář");
  const metoda = buf.readUInt16LE(cd + 10), velikost = buf.readUInt32LE(cd + 20), lh = buf.readUInt32LE(cd + 42);
  const nazev = buf.toString("utf8", cd + 46, cd + 46 + buf.readUInt16LE(cd + 28));
  if (buf.readUInt32LE(lh) !== 0x04034b50) throw new Error("ZIP: poškozená hlavička souboru");
  const zacatek = lh + 30 + buf.readUInt16LE(lh + 26) + buf.readUInt16LE(lh + 28);
  const data = buf.subarray(zacatek, zacatek + velikost);
  return { nazev, obsah: metoda === 8 ? inflateRawSync(data) : data };
}

// --- XML → seznam --------------------------------------------------------------------------------
const tag = (blok, t) => blok.match(new RegExp(`<${t}>([^<]*)</${t}>`))?.[1] ?? null;
const pos = (blok) => blok.match(/<gml:pos>([-\d.]+) ([-\d.]+)<\/gml:pos>/);
const xmlText = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const r3 = (x) => Math.round(x * 1e3) / 1e3; // ~100 m – předpověď se stejně zaokrouhluje na 0,01°

export function zpracujXml(xml) {
  const okresy = new Map(), pou = new Map(), obce = [], casti = [];
  for (const m of xml.matchAll(/<vf:Okres [\s\S]*?<\/vf:Okres>/g)) okresy.set(tag(m[0], "oki:Kod"), xmlText(tag(m[0], "oki:Nazev")));
  for (const m of xml.matchAll(/<vf:Pou [\s\S]*?<\/vf:Pou>/g)) pou.set(tag(m[0], "pui:Kod"), xmlText(tag(m[0], "pui:Nazev")));
  const obecPodleKodu = new Map();
  for (const m of xml.matchAll(/<vf:Obec [\s\S]*?<\/vf:Obec>/g)) {
    const b = m[0], p = pos(b);
    if (!p) continue;
    const okresKod = b.match(/<obi:Okres><oki:Kod>(\d+)<\/oki:Kod>/)?.[1];
    const pouKod = b.match(/<obi:Pou><pui:Kod>(\d+)<\/pui:Kod>/)?.[1];
    const [lat, lon] = sjtskNaWgs84(Number(p[1]), Number(p[2]));
    const o = { kod: Number(tag(b, "obi:Kod")), nazev: xmlText(tag(b, "obi:Nazev")), okres: okresy.get(okresKod) || "Praha", pou: pou.get(pouKod) || null, lat: r3(lat), lon: r3(lon) };
    obce.push(o);
    obecPodleKodu.set(String(o.kod), o);
  }
  for (const m of xml.matchAll(/<vf:CastObce [\s\S]*?<\/vf:CastObce>/g)) {
    const b = m[0], p = pos(b);
    if (!p) continue;
    const obec = obecPodleKodu.get(b.match(/<coi:Obec><obi:Kod>(\d+)<\/obi:Kod>/)?.[1]);
    const nazev = xmlText(tag(b, "coi:Nazev") || "");
    if (!obec || !nazev || nazev === obec.nazev) continue; // část se jménem obce = obec sama
    const [lat, lon] = sjtskNaWgs84(Number(p[1]), Number(p[2]));
    casti.push({ nazev, obec, lat: r3(lat), lon: r3(lon) });
  }
  // POU jen tam, kde se stejné jméno opakuje ve stejném okrese (Březina, Mezholezy) – jinak zbytečné bajty.
  const pocet = new Map();
  for (const o of obce) pocet.set(`${o.nazev}|${o.okres}`, (pocet.get(`${o.nazev}|${o.okres}`) || 0) + 1);
  obce.sort((x, y) => x.nazev.localeCompare(y.nazev, "cs") || x.okres.localeCompare(y.okres, "cs"));
  casti.sort((x, y) => x.nazev.localeCompare(y.nazev, "cs") || x.obec.nazev.localeCompare(y.obec.nazev, "cs"));
  return {
    obce: obce.map((o) => [o.nazev, o.okres, o.lat, o.lon, o.kod, ...(pocet.get(`${o.nazev}|${o.okres}`) > 1 ? [o.pou] : [])]),
    casti: casti.map((c) => [c.nazev, c.obec.nazev, c.obec.okres, c.lat, c.lon, c.obec.kod]),
    pocetOkresu: okresy.size,
  };
}

export function kontrola(data) {
  const chyby = [];
  if (!(data?.obce?.length > 6000)) chyby.push(`obcí je ${data?.obce?.length ?? 0} (čekám přes 6 000)`);
  for (const [nazev, okres, lat, lon] of KONTROLNI) {
    const o = data?.obce?.find((x) => x[0] === nazev && x[1] === okres);
    if (!o) chyby.push(`chybí ${nazev} (okres ${okres})`);
    else if (Math.abs(o[2] - lat) > 0.01 || Math.abs(o[3] - lon) > 0.01) chyby.push(`${nazev}: ${o[2]}, ${o[3]} – čekám ${lat}, ${lon}`);
  }
  return chyby;
}

function adresaSouboru(o = 0) {
  const d = new Date();
  const posledni = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - o, 0));
  return `https://vdp.cuzk.gov.cz/vymenny_format/soucasna/${posledni.toISOString().slice(0, 10).replace(/-/g, "")}_ST_UZSZ.xml.zip`;
}

async function main() {
  const arg = process.argv.slice(2);
  if (arg.includes("--kontrola")) {
    const chyby = kontrola(JSON.parse(await readFile(CIL, "utf8")));
    if (chyby.length) { console.error("content/obce.json:", chyby.join("; ")); process.exit(1); }
    console.log("content/obce.json je v pořádku.");
    return;
  }
  let buf, soubor;
  const i = arg.indexOf("--soubor");
  if (i >= 0) { soubor = arg[i + 1]; buf = await readFile(soubor); }
  else {
    for (const o of [0, 1, 2]) {
      soubor = adresaSouboru(o);
      const r = await fetch(soubor, { headers: { "user-agent": "hspg.cz build-obce (info@hspg.cz)" } });
      if (r.ok) { buf = Buffer.from(await r.arrayBuffer()); break; }
      console.warn(`${soubor}: HTTP ${r.status}`);
    }
    if (!buf) throw new Error("Soubor ST_UZSZ se nepodařilo stáhnout.");
  }
  const { nazev, obsah } = rozbalJedinySoubor(buf);
  const v = zpracujXml(obsah.toString("utf8"));
  const rok = nazev.slice(0, 4);
  const data = {
    zdroj: `ČÚZK, ${rok} – RÚIAN, ${nazev} (licence CC BY 4.0, https://creativecommons.org/licenses/by/4.0/); souřadnice přepočtené do WGS84`,
    _format: "obce: [název, okres, lat, lon, kód obce, (POU – jen u stejného jména ve stejném okrese)]; casti: [název části, obec, okres, lat, lon, kód obce]",
    obce: v.obce,
    casti: v.casti,
  };
  const chyby = kontrola(data);
  if (chyby.length) throw new Error(`Kontrola selhala: ${chyby.join("; ")}`);
  const text = `{"zdroj":${JSON.stringify(data.zdroj)},\n"_format":${JSON.stringify(data._format)},\n"obce":[\n${data.obce.map((x) => JSON.stringify(x)).join(",\n")}\n],\n"casti":[\n${data.casti.map((x) => JSON.stringify(x)).join(",\n")}\n]}\n`;
  await writeFile(CIL, text);
  console.log(`content/obce.json: ${data.obce.length} obcí, ${data.casti.length} částí obcí, ${v.pocetOkresu} okresů, ${Math.round(Buffer.byteLength(text) / 1024)} kB (zdroj ${soubor})`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch((e) => { console.error(e.message); process.exit(1); });
