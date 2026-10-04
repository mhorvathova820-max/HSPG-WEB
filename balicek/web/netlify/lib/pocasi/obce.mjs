// Obec → souřadnice pro předpověď. Z textu adresy (pole formuláře, LOCATION z kalendáře) se vezme jen
// obec (případně okres a PSČ); ulice ani číslo domu se nikam neposílají. Vyhledává se v přibaleném
// seznamu obcí a částí obcí ČR (content/obce.json ze scripts/build-obce.mjs, ČÚZK – RÚIAN, CC BY 4.0) –
// bez externí služby a bez klíče. Statický import: Netlify soubor přibalí do funkce sám.
import vychoziData from "../../../content/obce.json" with { type: "json" };

export const bezDiakritiky = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

// Text adresy → { obec, okres, psc } (okres a psc mohou chybět).
// Snese: „Kolín“, „Lipová 12, Kolín“, „Lipová 12, 280 02 Kolín, Česko“, „Lipová (Cheb)“, „Lipová, okres Cheb“,
// „Praha 8 - Karlín“ → Praha, „Kolín IV“ → Kolín.
export function obecZTextu(text) {
  let s = String(text || "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 200);
  s = s.replace(/[,\s]*(Česká republika|Česko|Czech Republic|Czechia|CZE?)\s*$/i, "").trim();
  let okres = null;
  const mOk = s.match(/\(\s*(?:okres\s+)?([^()]+?)\s*\)\s*$/i) || s.match(/,\s*okres\s+([^,]+)$/i);
  if (mOk) { okres = mOk[1].trim(); s = s.slice(0, mOk.index).replace(/[,\s]+$/, ""); }
  let psc = null, obec = null;
  const mPsc = s.match(/(?:^|[,\s])(\d{3}) ?(\d{2})\s+([^,\d][^,]*)$/);
  if (mPsc) { psc = mPsc[1] + mPsc[2]; obec = mPsc[3]; }
  else {
    const casti = s.split(",").map((x) => x.trim()).filter(Boolean);
    obec = [...casti].reverse().find((c) => !/\d/.test(c)) || casti.at(-1) || "";
  }
  obec = obec.replace(/\s+-\s+.*$/, "").replace(/\s+\d+$/, "").replace(/\s+[IVX]{1,4}$/, "").replace(/^\d+\s+/, "").trim();
  if (!/\p{L}{2}/u.test(obec)) return null;
  return { obec: obec.slice(0, 80), okres: okres?.slice(0, 80) || null, psc };
}

let data = null;
function index(seznam) {
  const obce = new Map(), casti = new Map(), kody = new Map();
  for (const [nazev, okres, lat, lon, kod, pou] of seznam.obce || []) {
    const o = { obec: nazev, okres, lat, lon, kod, ...(pou ? { pou } : {}) };
    const k = bezDiakritiky(nazev);
    if (!obce.has(k)) obce.set(k, []);
    obce.get(k).push(o);
    kody.set(kod, o);
  }
  for (const [nazev, obec, okres, lat, lon, kod] of seznam.casti || []) {
    const k = bezDiakritiky(nazev);
    if (!casti.has(k)) casti.set(k, []);
    casti.get(k).push({ obec: nazev, castObce: obec, okres, lat, lon, kod });
  }
  return { obce, casti, kody, pocet: (seznam.obce || []).length, zdroj: seznam.zdroj || null };
}
const dejData = () => (data ||= index(vychoziData));
// Pro testy: vlastní (malý) seznam místo přibaleného.
export function _nastavObce(seznam) { data = seznam ? index(seznam) : null; }

const popis = (k) => ({ obec: k.obec, okres: k.okres, kod: k.kod, ...(k.castObce ? { castObce: k.castObce } : {}), ...(k.pou ? { pou: k.pou } : {}) });

// dotaz: text | { obec, okres?, kod? } →
//   { obec, okres, lat, lon, kod, castObce?, pou? } | { nejednoznacne: [{ obec, okres, kod, castObce?, pou? }] } | null
// Pořadí: kód obce (z výběru v plánovači) → obec → část obce (jen když obec tohoto jména není).
// Okres v dotazu (nebo POU – „Březina (Tišnov)“) zúží kandidáty. Nikdy se nehádá: víc kandidátů = nejednoznacne.
export async function najdiObec(vstup) {
  const d = dejData();
  if (vstup && typeof vstup === "object" && Number.isInteger(Number(vstup.kod)) && d.kody.has(Number(vstup.kod))) {
    const o = d.kody.get(Number(vstup.kod));
    if (!vstup.obec || bezDiakritiky(vstup.obec) === bezDiakritiky(o.obec)) return o;
    // Kód části obce: v seznamu částí se hledá podle jména + kódu obce.
    const c = (d.casti.get(bezDiakritiky(vstup.obec)) || []).find((x) => x.kod === o.kod);
    if (c) return c;
  }
  const dotaz = typeof vstup === "string" ? obecZTextu(vstup) : vstup;
  if (!dotaz?.obec) return null;
  const klic = bezDiakritiky(dotaz.obec);
  let kandidati = d.obce.get(klic) || [];
  // „Brno-sever“, „Ostrava-Poruba“: městská část → město (jen když přesný název neexistuje – „Frýdek-Místek“ je obec).
  if (!kandidati.length && dotaz.obec.includes("-")) kandidati = d.obce.get(bezDiakritiky(dotaz.obec.split("-")[0])) || [];
  if (!kandidati.length) kandidati = d.casti.get(klic) || [];
  if (!kandidati.length) return null;
  if (dotaz.okres) {
    const u = bezDiakritiky(dotaz.okres);
    const zuzeni = kandidati.filter((k) => bezDiakritiky(k.okres) === u || (k.pou && bezDiakritiky(k.pou) === u) || (k.castObce && bezDiakritiky(k.castObce) === u));
    if (zuzeni.length) kandidati = zuzeni;
  }
  if (kandidati.length === 1) return kandidati[0];
  return { nejednoznacne: kandidati.slice(0, 40).map(popis) };
}

// Návrhy pro našeptávač plánovače (lokálně, bez externí služby): obce začínající zadaným textem.
export function navrhyObci(text, limit = 8) {
  const d = dejData();
  const k = bezDiakritiky(text);
  if (k.length < 2) return [];
  const presne = (d.obce.get(k) || []).map(popis);
  const out = [...presne];
  for (const [nazev, seznam] of d.obce) {
    if (out.length >= limit) break;
    if (nazev === k || !nazev.startsWith(k)) continue;
    for (const o of seznam) out.push(popis(o));
  }
  return out.slice(0, limit);
}

export async function infoObci() {
  const d = dejData();
  return { pocet: d.pocet, zdroj: d.zdroj };
}
export const ZDROJ_OBCI = "Obce: ČÚZK – RÚIAN (CC BY 4.0)";
