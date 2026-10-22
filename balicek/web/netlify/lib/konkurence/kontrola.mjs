// Kontrola nabídky jiného zhotovitele proti Standardu HOLUB – deterministická, bez AI (rozhodnutí majitele
// 22. 10. 2026, CompetitorShield). Pro každý bod vrátí řádek
//   { id, kriterium, standardHolub, vNabidce: "uvedeno" | "neuvedeno", citace }
// citace = úryvek z nabídky (nejvýš 120 znaků), u neuvedeného bodu neutrální „v nabídce neuvedeno“.
// Přehled nabídku ani jejího autora NEHODNOTÍ a nesrovnává (žádná srovnávací reklama, § 2980 OZ):
// „uvedeno“ znamená jen, že text bod zmiňuje, „neuvedeno“ jen, že ho v textu nenašel.
// Sloupec „Standard HOLUB“ bere texty jen ze schválených podkladů (content/*.json); co v nich není
// (pojištění), netvrdí. Text nabídky se nikam neukládá – zpracuje se jen v paměti.
import standardData from "../../../content/standard.json" with { type: "json" };
import sentinelData from "../../../content/sentinel.json" with { type: "json" };
import firmaData from "../../../content/firma.json" with { type: "json" };
import cenyData from "../../../content/ceny.json" with { type: "json" };
import potvrzeniData from "../../../content/cenik-potvrzeni.json" with { type: "json" };
import faqData from "../../../content/hbot-faq.json" with { type: "json" };

export const MAX_ZNAKU = 30_000;
export const MAX_CITACE = 120;
export const NEUVEDENO = "v nabídce neuvedeno";
export const NEURCUJE = "Standard HOLUB tento bod neurčuje.";
export const UPOZORNENI =
  "Přehled jen ukazuje, které body Standardu HOLUB text nabídky zmiňuje. Nabídku ani jejího autora nehodnotí. " +
  "„V nabídce neuvedeno“ znamená, že bod v textu nebyl nalezen – může být ve smlouvě nebo v přílohách; zeptejte se na něj zhotovitele.";

// Česká typografie: nezlomitelná mezera za jednopísmennou předložkou a mezi číslem a jednotkou.
export const typografie = (t) => String(t)
  .replace(/(^|[\s(„])([ksvzouaiKSVZOUAI]) /g, "$1$2 ")
  .replace(/(\d) (?=\d{3}(?!\d))/g, "$1 ")
  .replace(/(\d) (?=(?:Kč|%|dní|dnů|let|m²|×))/g, "$1 ");
const kc = (n) => `${Number(n).toLocaleString("cs-CZ")} Kč`;
const prvniVelke = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// Věty z odpovědi H-BOTa (content/hbot-faq.json), které obsahují hledané slovo – jen schválený text.
function vetyZFaq(faq, otazka, slovo) {
  const polozky = (faq?.otazky || []).filter((o) => !otazka || otazka.test(o.q || ""));
  const vety = polozky.flatMap((o) => String(o.a || "").split(/(?<=[.!?])\s+/)).filter((v) => slovo.test(v));
  return [...new Set(vety)];
}

// Texty sloupce „Standard HOLUB“ ze schválených podkladů.
export function textyStandardu({ standard = standardData, sentinel = sentinelData, firma = firmaData, ceny = cenyData, potvrzeni = potvrzeniData, faq = faqData } = {}) {
  const t = {};
  for (const k of standard.kroky || []) t[`krok-${k.cislo}`] = `${k.cislo} ${k.nazev} – ${k.popis}.`;
  const A = standard.cesty?.A, B = standard.cesty?.B;
  if (A && B) {
    t["typ-vrstvy"] = `Cesta A – ${A.nazev}: ${A.popis} Cesta B – ${B.nazev}: ${B.popis}`;
    const n = (c) => String(c.popis).match(/(\d+)×/)?.[1];
    if (n(A) && n(B)) t["pocet-vrstev"] = `Cesta A: ${n(A)}× nástřik H-STONE. Cesta B: penetrace a ${n(B)}× nástřik barvy.`;
  }
  if (sentinel?.podminka_zaruky) t.zaruka = sentinel.podminka_zaruky;
  const foto = vetyZFaq(faq, null, /fotodokumentaci před\/po/i).map((v) => v.split(/\s+[—–]\s+/).at(-1));
  const kontrola = (sentinel?.tarify || []).find((x) => x.id === "base")?.body?.find((b) => /fotodokument/i.test(b));
  if (foto.length) t.fotodokumentace = prvniVelke(foto[0].replace(/\.$/, "")) + "." + (kontrola ? ` SENTINEL BASE: ${kontrola.charAt(0).toLowerCase() + kontrola.slice(1)}.` : "");
  const leseni = vetyZFaq(faq, /lešení/i, /lešen/i);
  if (leseni.length) t.leseni = leseni.join(" ");
  if (firma?.dph === "neplátce DPH") t.dph = "HSPG je neplátce DPH – k ceně se DPH nepřipočítává.";
  // Ceny jen s potvrzeným ceníkem (stejný mechanismus jako H-BOT, úkol 27).
  if (potvrzeni?.platnost_od && potvrzeni.platnost_od === ceny?.platnost_od && ceny.ochrana_hstone && ceny.renovace_color) {
    const a = ceny.ochrana_hstone, b = ceny.renovace_color;
    const od = new Date(`${ceny.platnost_od}T12:00:00Z`);
    t["cena-m2"] = `Ceník od ${od.getUTCDate()}. ${od.getUTCMonth() + 1}. ${od.getUTCFullYear()} za m²: cesta A (H-STONE) střecha ${kc(a.roof)}, fasáda ${kc(a.facade)}, dlažba ${kc(a.driveway)}; cesta B (barva) střecha ${kc(b.roof)}, fasáda ${kc(b.facade)}.`;
  }
  const p = ceny?.platby;
  if (p?.hranice_zalohy && typeof p.zaloha_nad_hranici === "number") {
    t.zaloha = `Do ${kc(p.hranice_zalohy)} záloha 0 Kč, nad ${kc(p.hranice_zalohy)} záloha ${Math.round(p.zaloha_nad_hranici * 100)} %.` +
      (p.splatnost_dni ? ` Splatnost ${p.splatnost_dni} dní${p.splatnost_svj_dni ? ` (SVJ ${p.splatnost_svj_dni} dní)` : ""}.` : "");
  }
  for (const k of Object.keys(t)) t[k] = typografie(t[k]);
  return t;
}

// Body kontroly. Vzory běží nad textem bez diakritiky a malými písmeny (stejné pozice jako originál).
export const KRITERIA = [
  { id: "krok-01", kriterium: "Krok 01 – Čištění", vzor: /\b(cisten|cistim|cistit|vycist|cistic|myti\b|myt[iy]|omyt|umyt|myjem|tlakov|tlakem|vysokotlak|wap\b|karcher)\w*/ },
  { id: "krok-02", kriterium: "Krok 02 – Odmaštění", vzor: /\b(odmast|odmasc|degreas)\w*/ },
  { id: "krok-03", kriterium: "Krok 03 – Ošetření biocidy", vzor: /\b(biocid|algicid|fungicid|herbicid|dezinfek|desinfek|antimech|antialg)\w*|\bproti (mechu|mechum|rasam|plisnim|lisejnikum|nasazeni)\b/ },
  { id: "krok-04", kriterium: "Krok 04 – Oplach", vzor: /\b(oplach|splach|proplach)\w*/ },
  { id: "krok-05", kriterium: "Krok 05 – Ochranná vrstva", vzor: /\bochrann\w* (vrstv|nater|film|povlak|nastrik|impregnac)\w*|\b(impregn|hydrofob|nater|nastrik|penetrac|lakovan|zapecet|sealant)\w*|\bfinaln\w* vrstv\w*/ },
  { id: "typ-vrstvy", kriterium: "Typ ochranné vrstvy", vzor: /\b(impregn|hydrofob|nano|silan|siloxan|silikon|akryl|polyuretan|epoxid|fluoro|barv|lak|penetrac|vosk|keramick)\w*/ },
  {
    id: "pocet-vrstev",
    kriterium: "Počet vrstev",
    vzor: /\b\d+ ?(x|×|krat) ?(nater|nastrik|vrstv|nanos|aplikac)\w*|\b(jednou|dvakrat|trikrat|jedn\w*|dv[aeou]\w*|tri|trech|ctyr\w*|dvoj\w*|troj\w*) ?(nater|nastrik|vrstv|nanos|aplikac)\w*|\b(nater|nastrik|vrstv|nanos|aplikac)\w* ?\d+ ?(x|×)|\bve? (dvou|trech|jedne) vrstv\w*/,
  },
  { id: "zaruka", kriterium: "Záruka", vzor: /\b(zaruk|garanc|garantuj|zarucuj|zarucen)\w*/ },
  { id: "fotodokumentace", kriterium: "Fotodokumentace", vzor: /\b(fotodokument|foto ?dokument)\w*|\b(fotografi|fotk|snimk|foto)\w* (pred|po|stavu|prubehu|dokonceni)\b/ },
  { id: "pojisteni", kriterium: "Pojištění odpovědnosti zhotovitele", vzor: /\b(pojist|pojisten|pojistn)\w*/ },
  { id: "leseni", kriterium: "Lešení a přístup k povrchu", vzor: /\b(lesen|plosin|horolez|vysokozdvizn)\w*|\bvyskov\w* (technik|prac)\w*/ },
  { id: "dph", kriterium: "DPH", vzor: /\bdph\b|\bdan\w* z pridane hodnoty|\bvat\b/ },
  {
    id: "cena-m2",
    kriterium: "Cena za m²",
    vzor: /(?<![a-z])(kc|czk|,-|eur|€) ?(\/|za|na) ?(1 ?)?(m2|m²|m(?![a-z0-9])|metr\w* ctverecn\w*)|\b(cena|cenou|sazba|sazbou|jednotkov\w* cen\w*) (za|na|\/) ?(1 ?)?(m2|m²|metr\w* ctverecn\w*)|\/ ?m(2|²)(?![a-z0-9])/,
  },
  { id: "zaloha", kriterium: "Záloha", vzor: /\b(zaloh|akontac|zavdav)\w*|\b(platb|uhrad|zaplat|splatn)\w*( [a-z]+){0,3} predem\b|\d+ ?% (z ceny |ceny )?predem\b/ },
];

// Text z PDF: konce řádků, dělení slov na konci řádku, řídicí znaky; NFC kvůli rozloženým háčkům.
export const vycisti = (text) => String(text ?? "")
  .normalize("NFC")
  .replace(/\r\n?/g, "\n")
  .replace(/(\p{L})-\n(\p{Ll})/gu, "$1$2")
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ");

// Bez diakritiky a malými písmeny, ZNAK PO ZNAKU – pozice nálezu platí i v originálu.
export function normalizuj(text) {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    out += ((c.normalize("NFD")[0] || c).toLowerCase()[0]) || c;
  }
  return out;
}

// Konec věty? Tečka za zkratkou („tel.“, „p.“, „č.“), v datu („30. 11.“) ani uvnitř slova („jan.novak“) není.
const ZKRATKY = new Set(["tel", "mob", "čp", "ing", "mgr", "bc", "ul", "nám", "tř", "apod", "atd", "tj", "např", "mj", "resp", "cca", "ks", "min", "max", "hod", "str", "zn", "kč", "vč", "př", "popř", "odst", "písm", "sb", "dr", "doc", "prof", "pozn"]);
function jeHranice(text, i) {
  const c = text[i];
  if (c === undefined) return true;
  if (/[!?\n•;|]/.test(c)) return true;
  if (c !== ".") return false;
  if (i + 1 < text.length && !/\s/.test(text[i + 1])) return false;
  const slovo = (text.slice(Math.max(0, i - 12), i).match(/[\p{L}\p{N}]+$/u) || [""])[0];
  if (/^\d+$/.test(slovo)) return /^\s+\p{Lu}/u.test(text.slice(i + 1, i + 4)); // „456. Záruka“ ano, „30. 11.“ ne
  return slovo.length > 1 && !ZKRATKY.has(slovo.toLowerCase());
}
// Úryvek kolem nálezu: ideálně celá věta, vždy nejvýš MAX_CITACE znaků (včetně „…“).
export function citace(text, od, doN) {
  let a = od, b = doN;
  while (a > 0 && !jeHranice(text, a - 1) && od - a < 90) a--;
  while (b < text.length && !jeHranice(text, b) && b - doN < 90) b++;
  if (b < text.length && /[.!?]/.test(text[b])) b++;
  const zacUriznut = a > 0 && !jeHranice(text, a - 1);
  const konUriznut = b < text.length && !jeHranice(text, b - 1);
  const pred = text.slice(a, od).replace(/\s+/g, " ").trimStart();
  let s = (pred + text.slice(od, b)).replace(/\s+/g, " ").trim();
  let zac = zacUriznut, kon = konUriznut;
  if (s.length + (zac ? 1 : 0) + (kon ? 1 : 0) > MAX_CITACE) {
    const okno = MAX_CITACE - 2;
    let start = Math.max(0, Math.min(pred.length - 30, s.length - okno));
    let konec = Math.min(s.length, start + okno);
    // Řez jen mezi slovy (nejvýš 15 znaků od okraje okna).
    if (start > 0) { const m = s.indexOf(" ", start); if (m !== -1 && m - start < 15) start = m + 1; }
    if (konec < s.length) { const m = s.lastIndexOf(" ", konec); if (m > start && konec - m < 15) konec = m; }
    zac = zac || start > 0;
    kon = kon || konec < s.length;
    s = s.slice(start, konec).trim();
  }
  return `${zac ? "…" : ""}${s}${kon ? "…" : ""}`.slice(0, MAX_CITACE);
}

// Hlavní funkce: text nabídky → řádky přehledu a souhrn (počty). Text se nikam neukládá.
export function kontrolujNabidku(text, podklady) {
  const cisty = vycisti(text).slice(0, MAX_ZNAKU);
  const norm = normalizuj(cisty);
  const standard = textyStandardu(podklady);
  const radky = KRITERIA.map((k) => {
    const m = k.vzor.exec(norm);
    return {
      id: k.id,
      kriterium: k.kriterium,
      standardHolub: standard[k.id] || NEURCUJE,
      vNabidce: m ? "uvedeno" : "neuvedeno",
      citace: m ? citace(cisty, m.index, m.index + m[0].length) : NEUVEDENO,
    };
  });
  const uvedeno = radky.filter((r) => r.vNabidce === "uvedeno").length;
  return { radky, souhrn: { celkem: radky.length, uvedeno, neuvedeno: radky.length - uvedeno } };
}
