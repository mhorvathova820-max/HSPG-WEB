// Vygeneruje soubory pro prohlížeč ze stejných zdrojů, ze kterých čerpá AI a funkce:
//  • assets/hbot-znalosti.json – okamžité odpovědi H-BOTa (content/hbot-faq.json, firma.json, ceny.json),
//  • assets/hspg-cenik.json – data cenového jádra pro okamžitou kalkulaci, HOLUB 360 a PDF (úkol 48):
//    content/ceny.json, standard.json, sentinel.json, cenik-potvrzeni.json a veřejná část firma.json,
//  • standard-holub/index.html – stránka Standard HOLUB (úkol 50) ze stejných dat (scripts/stranka-standard.mjs).
// Spouštět po každé změně těchto souborů (a v CI kontrolovat, že je výstup aktuální: --kontrola).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { znalostiProProhlizec } from "../netlify/lib/ai/znalosti.mjs";
import { strankaStandard } from "./stranka-standard.mjs";
import ceny from "../content/ceny.json" with { type: "json" };
import standard from "../content/standard.json" with { type: "json" };
import sentinel from "../content/sentinel.json" with { type: "json" };
import potvrzeni from "../content/cenik-potvrzeni.json" with { type: "json" };
import firma from "../content/firma.json" with { type: "json" };

// Interní poznámky (_klíče a poznámky k zapnutí služeb) do prohlížeče nepatří.
const bezPoznamek = (x) => Array.isArray(x) ? x.map(bezPoznamek)
  : x && typeof x === "object" ? Object.fromEntries(Object.entries(x).filter(([k]) => !k.startsWith("_") && k !== "poznamka").map(([k, v]) => [k, bezPoznamek(v)]))
  : x;

export function cenikProProhlizec() {
  const verejnaFirma = {
    znacka: firma.znacka, provozovatel: firma.provozovatel, pravni_forma: firma.pravni_forma, ico: firma.ico, dph: firma.dph,
    sidlo: firma.sidlo, telefon: firma.telefon, telefon_zobrazeni: firma.telefon_zobrazeni, email: firma.email, web: firma.web,
    pracovni_doba: firma.pracovni_doba,
    // Záruka jen potvrzená (pravidlo pravdivosti); podmínky čte i Pas domu (podminka_puvodni pro domy před R15).
    zaruka: firma.zaruka?.potvrzeno ? { potvrzeno: true, veta: firma.zaruka.veta, podminka: firma.zaruka.podminka || null, podminka_puvodni: firma.zaruka.podminka_puvodni || null } : null,
  };
  return {
    zdroj: "Vygenerováno scripts/build-hbot.mjs z content/*.json – needitovat ručně.",
    cenik: bezPoznamek(ceny),
    standard: bezPoznamek(standard),
    sentinel: bezPoznamek(sentinel),
    potvrzeni: potvrzeni?.platnost_od && potvrzeni?.datum ? { platnost_od: potvrzeni.platnost_od, potvrdil: potvrzeni.potvrdil, datum: potvrzeni.datum, rezim: potvrzeni.rezim || null } : null,
    firma: verejnaFirma,
  };
}

const vystupy = [
  ["assets/hbot-znalosti.json", JSON.stringify(znalostiProProhlizec()) + "\n"],
  ["assets/hspg-cenik.json", JSON.stringify(cenikProProhlizec()) + "\n"],
  ["standard-holub/index.html", strankaStandard({ standard, sentinel, ceny, potvrzeni })],
];

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let chyba = false;
  for (const [soubor, obsah] of vystupy) {
    const cil = fileURLToPath(new URL("../" + soubor, import.meta.url));
    if (process.argv.includes("--kontrola")) {
      const stary = await readFile(cil, "utf8").catch(() => "");
      if (stary !== obsah) { console.error(`${soubor} není aktuální – spusť: node scripts/build-hbot.mjs`); chyba = true; }
      else console.log(`${soubor} je aktuální.`);
    } else {
      await mkdir(dirname(cil), { recursive: true });
      await writeFile(cil, obsah);
      console.log("Zapsáno:", cil);
    }
  }
  if (chyba) process.exit(1);
}
