// Pseudonymizace osobních údajů před odesláním textu externí AI (GDPR; rozhodnutí majitele 22. 10. 2026).
// Jediná implementace pro celý web:
//   - /api/ai, rada AI a scripts/rada.mjs: značky [EMAIL_1], [TELEFON_1] … (stejný údaj = stejná značka);
//     mapa značka → původní text žije jen v paměti jednoho požadavku. Zpětné doplnění (doplnZpet) je jen
//     pro panel majitele – mapa ani doplněný text nikdy nejdou do logu.
//   - veřejný H-BOT a kontrola nabídek: anonymizuj() – obecné štítky bez mapy ([telefon], [e-mail] …).
// Pozná: e-maily, telefony CZ/SK i mezinárodní, rodná čísla, čísla účtů a IBAN, čísla platebních karet,
// data narození, adresy (ulice + číslo, PSČ), SPZ, kódy pasu domu HS-RRRR-ČČČČ, přístupové kódy a hesla
// a jména po oslovení nebo titulu (pan, paní, Ing., Mgr. …). Jméno bez oslovení se nepozná.
// Čísla s jednotkou (ceny „1 490 Kč“, plochy „120 m²“, lhůty „30 dní“) a běžná data se nemaskují.
// Detektory běží podle priority nad „maskovanou kopií“ textu: nalezený úsek se v kopii přepíše znaky
// z privátní oblasti Unicode (nejsou písmena ani číslice), takže další detektor ho nemůže zachytit znovu
// ani přes něj „přeskočit“ – a pozice v kopii i v originálu zůstávají stejné.

const M = "[ \\t\\u00a0\\u202f]"; // mezera v řádku (i nezlomitelná a úzká nezlomitelná)
const KRYT = "";
const ZNACKA_RE = /\[([A-Z]+(?:_[A-Z]+)*)_(\d+)\]/g;

// Typ → obecný štítek pro anonymizuj() (veřejné texty; bez mapy, nic se nedoplňuje).
export const STITKY = {
  EMAIL: "e-mail",
  TELEFON: "telefon",
  RODNE_CISLO: "rodné číslo",
  UCET: "číslo účtu",
  IBAN: "číslo účtu",
  KARTA: "číslo karty",
  DATUM_NAROZENI: "datum narození",
  ADRESA: "adresa",
  PSC: "PSČ",
  SPZ: "SPZ",
  KOD_PASU: "kód pasu domu",
  PRISTUPOVY_KOD: "přístupový kód",
  JMENO: "jméno",
};

// Za číslem stojí jednotka → jde o množství (cena, plocha, lhůta), ne o osobní údaj.
const JEDNOTKA = new RegExp(
  `^${M}*(?:Kč|CZK|EUR|USD|€|\\$|,-|m²|m³|%|×|°|(?:m2|m3|m|km|cm|mm|kg|t|l|x|ks|let|roků|roky|rok|měsíců|měsíce|měsíc|měs|dní|dnů|dny|den|týdnů|týdny|týden|hodin|hodiny|hod|h|min|s|tis|mil|Wp|kWp|kW|W)(?![\\p{L}\\d]))`,
  "u",
);
const bezJednotky = (za) => !JEDNOTKA.test(za) && !/^[.,:]\d/.test(za);
const cislice = (s) => s.replace(/\D/g, "");

// Kódy bank v ČR a SR (číselník ČNB a NBS; pro odlišení účtu od čísla jednacího „12/2026“).
const KODY_BANK = new Set((
  "0100 0300 0600 0710 0800 2010 2020 2060 2070 2100 2200 2220 2240 2250 2260 2275 2600 2700 3030 3050 3060 3500 " +
  "4000 4300 5500 5800 6000 6100 6200 6210 6300 6363 6700 6800 7910 7950 7960 7970 7990 8030 8040 8060 8090 8150 " +
  "8190 8198 8199 8200 8220 8230 8240 8250 8255 8265 8270 8280 8293 8299 8500 " +
  "0200 0720 0900 1100 1111 3000 3100 5200 5600 5900 6500 7300 7500 7930 8120 8130 8160 8170 8180 8191 8320 8330 8360 8370 8400 8410 8420 8430"
).split(" "));
const KONTEXT_UCTU = /(účt|účet|č\.\s?ú\.|bankovní\s+spojení|platb|převod|IBAN|bank)/i;

function mod97(iban) {
  const s = (iban.slice(4) + iban.slice(0, 4)).toUpperCase().replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let r = 0;
  for (const ch of s) r = (r * 10 + Number(ch)) % 97;
  return r;
}
function luhn(d) {
  let soucet = 0;
  for (let i = 0; i < d.length; i++) {
    let x = Number(d[d.length - 1 - i]);
    if (i % 2) { x *= 2; if (x > 9) x -= 9; }
    soucet += x;
  }
  return soucet % 10 === 0;
}
function rodneCislo(m) {
  const yy = Number(m[1]), mm = Number(m[2]), dd = Number(m[3]), lomitko = m[4] === "/", konec = m[5];
  const mesic = mm > 70 ? mm - 70 : mm > 50 ? mm - 50 : mm > 20 ? mm - 20 : mm;
  if (mesic < 1 || mesic > 12 || dd < 1 || dd > 31) return false;
  if (konec.length === 3) return lomitko && yy <= 53; // devítimístná (před r. 1954) jen s lomítkem
  const cele = m[1] + m[2] + m[3] + konec;
  const kontrola = Number(cele) % 11 === 0 || (Number(cele.slice(0, 9)) % 11 === 10 && konec.endsWith("0"));
  return lomitko || kontrola; // s lomítkem i s chybou v kontrolní číslici (pořád je to rodné číslo)
}

const SEP = "[ \\u00a0\\u202f\\-./]?";
const TEL9 = `(?:[2-9]\\d{2}${SEP}\\d{3}${SEP}\\d{3}|[2-9]\\d{2}${SEP}\\d{2}${SEP}\\d{2}${SEP}\\d{2})`;
const MESICE = "ledna|února|března|dubna|května|června|července|srpna|září|října|listopadu|prosince";
const DATUM = `\\d{1,2}\\.${M}*\\d{1,2}\\.${M}*\\d{4}|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}\\/\\d{1,2}\\/\\d{4}|\\d{1,2}\\.${M}*(?:${MESICE})${M}+\\d{4}`;
const KOD_SLOVO =
  `(?:(?:přístupov[ýéáí]|vstupní|bezpečnostní|ověřovací|aktivační|jednorázov[ýéá]|zabezpečovací|alarmov[ýé]|PIN)${M}+kód(?:u|em)?` +
  `|kód(?:u|em)?${M}+(?:k|ke|od|na|do|pro)${M}+\\p{L}+` +
  `|kód(?:u|em)?${M}+(?:brány|vrat|dveří|domu|bytu|alarmu|zámku|trezoru|schránky|garáže|vchodu|branky)` +
  `|PIN|heslo|hesla|heslem|OTP|password|passcode|kód(?=${M}*[:=]))`;
const TOKEN = "[\\p{L}\\d#*_@$%&+\\-]+(?:[.!?][\\p{L}\\d#*_@$%&+\\-]+)*";
const PREDLOZKA = "(?:Na|U|V|Ve|K|Ke|Pod|Nad|Za|Před|Při|Mezi|Nám\\.|nám\\.|Náměstí|náměstí|Třída|třída|tř\\.|Nábřeží|nábřeží|Sídliště|sídliště)";
const SLOVO = "\\p{Lu}\\p{Ll}+(?:-\\p{Lu}?\\p{Ll}+)?";
const CISLO_DOMU = "\\d{1,4}(?:\\/\\d{1,3})?[a-zA-Z]?";
const ZA_DOMEM = "(?![\\p{L}\\d\\/])(?![.,:]\\d)(?!\\.\\s*\\p{Ll})";
// Slova s „adresní“ koncovkou, která ulicí skoro nikdy nejsou („Další 3 body“, „Celková 120“…).
const NE_ULICE = "(?:Další|Ostatní|Poslední|Celková|Celkové|Ochranná|Finální|Konečná|Každá|Každé|Jiná|Jiné|Stejná|Stejné|Následující|Předchozí|Uvedená|Uvedené|Standardní|Orientační|Minimální|Maximální|Průměrná|Roční|Měsíční|Denní|Týdenní|Celá|Celé|Záruční|Garanční|Zkušební|Technická|Technické|Výsledná|Výsledné|Původní|Stará|Staré|Čištění|Odmaštění|Ošetření|Biocidní|Ochranné|Finální)";
const OSLOVENI = "(?:[Pp]an(?:a|u|e|em|ovi)?|[Pp]aní|[Ss]lečn(?:a|y|ě|u|o|ou)|[Pp]\\.|[Mm]r\\.|[Mm]rs\\.|[Mm]s\\.)";
const TITUL = `(?:Ing\\.(?:${M}*arch\\.)?|Mgr\\.|MgA\\.|Bc\\.|BcA\\.|MUDr\\.|MVDr\\.|MDDr\\.|JUDr\\.|PhDr\\.|RNDr\\.|PharmDr\\.|ThDr\\.|PaedDr\\.|PhMr\\.|Dr\\.|doc\\.|Doc\\.|prof\\.|Prof\\.)`;
const JMENO_SLOVO = "\\p{Lu}[\\p{Ll}\\p{Lu}'’]*(?:-\\p{Lu}[\\p{Ll}\\p{Lu}'’]*)?(?![\\p{L}'’-])";
const JMENO_DALSI = `${JMENO_SLOVO}(?!${M}*\\d)`; // „pan Novák Lipová 12“ → jméno je jen „Novák“

const re = (zdroj, priznaky = "gu") => new RegExp(zdroj, priznaky.includes("d") ? priznaky : priznaky + "d");

// Pořadí = priorita. skupina: která část shody se nahradí (0 = celá). over(m, kopie, konec): dodatečná kontrola.
// klic: normalizace pro „stejný údaj = stejná značka“.
const DETEKTORY = [
  { typ: "EMAIL", re: re("(?<![\\p{L}\\d._%+\\-])[\\p{L}\\d._%+\\-]+@[\\p{L}\\d\\-]+(?:\\.[\\p{L}\\d\\-]+)*\\.\\p{L}{2,}(?![\\p{L}\\d])"), klic: (h) => h.toLowerCase() },
  { typ: "KOD_PASU", re: re("(?<![\\p{L}\\d])HS-\\d{4}-[A-Z\\d]{4}(?![\\p{L}\\d])", "giu"), klic: (h) => h.toUpperCase() },
  { typ: "IBAN", re: re(`(?<![\\p{L}\\d])(?:CZ|SK)\\d{2}(?:[ \\u00a0]?\\d{4}){5}(?![\\p{L}\\d])`, "giu"), klic: (h) => h.replace(/\s/g, "").toUpperCase() },
  {
    typ: "IBAN",
    re: re(`(?<![\\p{L}\\d])[A-Z]{2}\\d{2}(?:[ \\u00a0]?[A-Z\\d]{4}){2,7}(?:[ \\u00a0]?[A-Z\\d]{1,3})?(?![\\p{L}\\d])`, "gu"),
    over: (m) => { const s = m[0].replace(/\s/g, ""); return s.length >= 15 && s.length <= 34 && mod97(s) === 1; },
    klic: (h) => h.replace(/\s/g, "").toUpperCase(),
  },
  { typ: "RODNE_CISLO", re: re("(?<![\\p{L}\\d\\/])(\\d{2})(\\d{2})(\\d{2})(\\/?)(\\d{3,4})(?![\\p{L}\\d\\/])"), over: rodneCislo, klic: (h) => h.replace("/", "") },
  {
    typ: "UCET",
    re: re("(?<![\\p{L}\\d\\-\\/])(?:\\d{1,6}-)?\\d{2,10}\\/(\\d{4})(?![\\p{L}\\d\\/])"),
    over: (m, kopie) => KODY_BANK.has(m[1]) || KONTEXT_UCTU.test(kopie.slice(Math.max(0, m.index - 40), m.index)),
    klic: (h) => h.replace(/\s/g, ""),
  },
  {
    typ: "KARTA",
    re: re("(?<![\\p{L}\\d])\\d(?:[ \\u00a0\\-]?\\d){12,18}(?![\\p{L}\\d])"),
    over: (m) => { const d = cislice(m[0]); return d.length >= 13 && d.length <= 19 && luhn(d); },
    klic: cislice,
  },
  {
    typ: "DATUM_NAROZENI",
    re: re(`(?:(?<![\\p{L}])(?:nar\\.|narozen[aáyýeéi]?|datum${M}+narození|dat\\.${M}*nar\\.|r\\.${M}*nar\\.|born|date${M}+of${M}+birth)${M}*[:,]?${M}*|(?<![\\p{L}\\d*])\\*${M}*)(${DATUM})`, "giu"),
    skupina: 1,
    klic: (h) => h.replace(/\s/g, ""),
  },
  { typ: "PRISTUPOVY_KOD", re: re(`(?<![\\p{L}])${KOD_SLOVO}(?:${M}+\\p{Ll}+){0,3}?${M}*(?:[:=]|${M}je(?=${M}))${M}*(${TOKEN})`, "giu"), skupina: 1, over: (m) => m[1].length >= 3 && m[1].length <= 40 && !/^(RAL|NCS)$/i.test(m[1]) },
  { typ: "PRISTUPOVY_KOD", re: re(`(?<![\\p{L}])${KOD_SLOVO}${M}+(${TOKEN})`, "giu"), skupina: 1, over: (m) => m[1].length >= 3 && m[1].length <= 40 && /[\d#*@$%&+_]/.test(m[1]) },
  {
    typ: "TELEFON",
    re: re(`(?<![\\p{L}\\d+(])(?:\\(?(?:\\+|00)${M}*\\(?42[01]\\)?${SEP}${M}*|0${SEP})?${TEL9}(?![\\p{L}\\d])`),
    over: (m, kopie, konec) => bezJednotky(kopie.slice(konec)),
    klic: (h) => cislice(h).slice(-9),
  },
  {
    typ: "TELEFON",
    re: re(`(?<![\\p{L}\\d+(])\\(?(?:\\+|00)${M}*\\(?[1-9]\\d{0,2}\\)?(?:${SEP}${M}*\\(?\\d{1,4}\\)?){2,5}(?![\\p{L}\\d])`),
    over: (m, kopie, konec) => { const n = cislice(m[0]).length; return n >= 8 && n <= 15 && bezJednotky(kopie.slice(konec)); },
    klic: (h) => cislice(h).replace(/^00/, ""),
  },
  { typ: "SPZ", re: re(`(?<![\\p{L}\\d])\\d[A-Z][A-Z\\d]${M}?\\d{4}(?![\\p{L}\\d])`), over: (m, kopie, konec) => bezJednotky(kopie.slice(konec)), klic: (h) => h.replace(/\s/g, "") },
  { typ: "SPZ", re: re(`(?<![\\p{L}\\d])[A-Z]{2,3}${M}?\\d{2}-\\d{2}(?![\\p{L}\\d])`), klic: (h) => h.replace(/\s/g, "") },
  { typ: "SPZ", re: re(`(?<![\\p{L}\\d])[A-Z]{2}[\\-\\u00a0 ]?\\d{3}[A-Z]{2}(?![\\p{L}\\d])`), klic: (h) => h.replace(/[\s-]/g, "") },
  // Adresy: klíčové slovo před adresou, ulice před PSČ, číslo popisné, číslo s lomítkem, …
  {
    typ: "ADRESA",
    re: re(`(?<![\\p{L}])(?:bytem|bydliště|bydlíme|bydlím|bydlí|adresa|adrese|adresou|ulice|ul\\.|sídlem|sídlo|místo${M}+realizace|na${M}+adrese)(?![\\p{L}])${M}*[:,]?${M}*(?:(?:v|na)${M}+ulici${M}+)?((?:${PREDLOZKA}${M}+)?\\p{L}[\\p{L}.\\-]*(?:${M}+[\\p{L}.\\-]+){0,3}?${M}+${CISLO_DOMU})${ZA_DOMEM}`, "giu"),
    skupina: 1,
    over: (m, kopie, konec) => bezJednotky(kopie.slice(konec)),
  },
  { typ: "ADRESA", re: re(`(?<![\\p{L}])${SLOVO}(?:${M}+\\p{Lu}?\\p{Ll}+){0,2}${M}+\\d{1,4}(?:\\/\\d{1,3})?[a-zA-Z]?(?=,?${M}+\\d{3}${M}?\\d{2}(?!\\d))`) },
  { typ: "PSC", re: re(`(?<![\\p{L}\\d])\\d{3}${M}?\\d{2}(?!\\d)(?=,?${M}+(?!Kč|CZK|EUR)\\p{Lu}\\p{Ll})`), klic: (h) => cislice(h) },
  { typ: "PSC", re: re(`(?<=PSČ${M}*:?${M}*)\\d{3}${M}?\\d{2}(?!\\d)`, "giu"), klic: (h) => cislice(h) },
  { typ: "ADRESA", re: re(`(?<![\\p{L}])(?:č\\.${M}*p\\.|čp\\.|č\\.${M}*o\\.)${M}*(\\d{1,4}(?:\\/\\d{1,4})?[a-z]?)(?![\\p{L}\\d])`, "giu"), skupina: 1 },
  { typ: "ADRESA", re: re(`(?<![\\p{L}])${SLOVO}(?:${M}+\\p{Lu}?\\p{Ll}+){0,2}${M}+\\d{1,4}\\/\\d{1,3}[a-zA-Z]?(?![\\p{L}\\d\\/])`) },
  // Jméno po oslovení nebo titulu (oslovení i titul zůstanou, nahradí se jen jméno).
  { typ: "JMENO", re: re(`(?<![\\p{L}])(?:${OSLOVENI}|${TITUL})(?:${M}+${TITUL})*${M}+(${JMENO_SLOVO}(?:${M}+${JMENO_DALSI}){0,2})`), skupina: 1 },
  { typ: "ADRESA", re: re(`(?<![\\p{L}])${PREDLOZKA}${M}+(?!(?:Praze|Praha|Prahy|Plzni|Plzeň|Plzně)(?![\\p{L}]))${SLOVO}(?:${M}+${SLOVO}){0,2}${M}+${CISLO_DOMU}${ZA_DOMEM}`), over: (m, kopie, konec) => bezJednotky(kopie.slice(konec)) },
  { typ: "ADRESA", re: re(`(?<![\\p{L}\\d])\\d{1,2}\\.${M}*(?:${MESICE})${M}+\\d{1,3}(?:\\/\\d{1,3})?[a-z]?(?![\\p{L}\\d\\/])(?![.,:]\\d)`), over: (m, kopie, konec) => bezJednotky(kopie.slice(konec)) },
  {
    typ: "ADRESA",
    re: re(`(?<![\\p{L}])(?!${NE_ULICE}${M})(?:\\p{Lu}\\p{Ll}+${M}+){0,2}\\p{Lu}\\p{Ll}*(?:á|é|í|ova|ovo|ův|ých|ích|ého|ího)(?:${M}+(?:náměstí|nábřeží|třída|sady|ulice))?${M}+${CISLO_DOMU}${ZA_DOMEM}`),
    over: (m, kopie, konec) => bezJednotky(kopie.slice(konec)),
  },
  // Záchytná síť pro telefony v neobvyklém zápisu (9–15 číslic; jako dřívější maskování H-BOTa).
  {
    typ: "TELEFON",
    re: re("(?<![\\p{L}\\d+])(?:\\+|00)?\\d[\\d \\u00a0\\-/().]{7,20}\\d(?![\\p{L}\\d])"),
    over: (m, kopie, konec) => { const n = cislice(m[0]).length; return n >= 9 && n <= 15 && bezJednotky(kopie.slice(konec)); },
    klic: cislice,
  },
];

// Najde osobní údaje: [{ typ, start, end, hodnota, klic }] seřazené podle pozice (bez překryvů).
export function najdiOsobniUdaje(text) {
  const puvodni = String(text ?? "");
  let kopie = puvodni;
  const nalezy = [];
  for (const d of DETEKTORY) {
    d.re.lastIndex = 0;
    const nove = [];
    for (const m of kopie.matchAll(d.re)) {
      const [start, end] = d.skupina ? m.indices[d.skupina] : m.indices[0];
      if (end <= start) continue;
      if (d.over && !d.over(m, kopie, m.index + m[0].length)) continue;
      const hodnota = puvodni.slice(start, end);
      nove.push({ typ: d.typ, start, end, hodnota, klic: `${d.typ}|${(d.klic || ((h) => h.replace(/\s+/g, " ").trim()))(hodnota)}` });
    }
    for (const n of nove) kopie = kopie.slice(0, n.start) + KRYT.repeat(n.end - n.start) + kopie.slice(n.end);
    nalezy.push(...nove);
  }
  return nalezy.sort((a, b) => a.start - b.start);
}

function nahrad(text, nalezy, naZnacku) {
  let out = "", pos = 0;
  for (const n of nalezy) {
    out += text.slice(pos, n.start) + naZnacku(n);
    pos = n.end;
  }
  return out + text.slice(pos);
}

// Pseudonymizace jednoho požadavku (více textů sdílí jednu mapu – stejný údaj má všude stejnou značku).
export function vytvorPseudonymizaci() {
  const podleKlice = new Map(); // klic → značka
  const zpet = new Map(); // značka bez závorek → původní text (první výskyt)
  const citac = {};
  const typy = {};
  const obsazene = new Set(); // značky, které uživatel napsal doslova – nové se jim vyhnou

  const zarezervuj = (texty) => {
    for (const t of texty) for (const m of String(t ?? "").matchAll(ZNACKA_RE)) obsazene.add(`${m[1]}_${m[2]}`);
  };
  const znacka = (n) => {
    const hotova = podleKlice.get(n.klic);
    if (hotova) return `[${hotova}]`;
    let z;
    do { citac[n.typ] = (citac[n.typ] || 0) + 1; z = `${n.typ}_${citac[n.typ]}`; } while (obsazene.has(z));
    podleKlice.set(n.klic, z);
    zpet.set(z, n.hodnota);
    typy[n.typ] = (typy[n.typ] || 0) + 1;
    return `[${z}]`;
  };
  const pseudonymizuj = (text) => {
    const t = String(text ?? "").normalize("NFC");
    return nahrad(t, najdiOsobniUdaje(t), znacka);
  };

  return {
    pseudonymizuj(text) { zarezervuj([text]); return pseudonymizuj(text); },
    // Všechny texty jednoho požadavku najednou (doslovné značky ve kterémkoli z nich se nepoužijí).
    pseudonymizujVse(texty) { zarezervuj(texty); return texty.map(pseudonymizuj); },
    // Zpětné doplnění – JEN pro odpověď panelu majitele. Neznámé značky zůstanou beze změny.
    doplnZpet(text) {
      return String(text ?? "").replace(ZNACKA_RE, (cela, typ, n) => (zpet.has(`${typ}_${n}`) ? zpet.get(`${typ}_${n}`) : cela));
    },
    get pocet() { return zpet.size; },
    // Souhrn bez hodnot (smí do odpovědi i do statistiky): { nahrazeno, typy: { EMAIL: 1, … } }.
    souhrn() { return { nahrazeno: zpet.size, typy: { ...typy } }; },
  };
}

// Zpětné doplňování proudu (stream po kouscích): značka může přijít rozdělená („[EMA“ + „IL_1]“).
export function vytvorDoplnovac(pseudonymizace) {
  let zasobnik = "";
  return {
    pridej(kus) {
      zasobnik += kus;
      const i = zasobnik.lastIndexOf("[");
      const otevrena = i !== -1 && zasobnik.indexOf("]", i) === -1 && zasobnik.length - i <= 40;
      const hotovo = otevrena ? zasobnik.slice(0, i) : zasobnik;
      zasobnik = otevrena ? zasobnik.slice(i) : "";
      return pseudonymizace.doplnZpet(hotovo);
    },
    dokonci() {
      const zbytek = zasobnik;
      zasobnik = "";
      return pseudonymizace.doplnZpet(zbytek);
    },
  };
}

// Veřejné texty: osobní údaje → obecné štítky („[telefon]“, „[e-mail]“ …), žádná mapa, nic se nedoplňuje.
export function anonymizuj(text) {
  const t = String(text ?? "").normalize("NFC");
  return nahrad(t, najdiOsobniUdaje(t), (n) => `[${STITKY[n.typ] || "osobní údaj"}]`);
}

// Značky v odpovědi pro veřejnost → obecné štítky (zpětné doplnění je jen pro panel majitele).
export const znackyNaStitky = (text) => String(text ?? "").replace(ZNACKA_RE, (cela, typ) => (STITKY[typ] ? `[${STITKY[typ]}]` : cela));
