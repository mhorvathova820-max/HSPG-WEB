// Vygeneruje assets/hbot-znalosti.json (okamžité odpovědi H-BOTa v prohlížeči) ze stejných zdrojů,
// ze kterých čerpá AI: content/hbot-faq.json, content/firma.json, content/ceny.json.
// Spouštět po každé změně těchto souborů (a v CI kontrolovat, že je výstup aktuální: --kontrola).
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { znalostiProProhlizec } from "../netlify/lib/ai/znalosti.mjs";

const cil = fileURLToPath(new URL("../assets/hbot-znalosti.json", import.meta.url));
const obsah = JSON.stringify(znalostiProProhlizec()) + "\n";

if (process.argv.includes("--kontrola")) {
  const stary = await readFile(cil, "utf8").catch(() => "");
  if (stary !== obsah) {
    console.error("assets/hbot-znalosti.json není aktuální – spusť: node scripts/build-hbot.mjs");
    process.exit(1);
  }
  console.log("assets/hbot-znalosti.json je aktuální.");
} else {
  await writeFile(cil, obsah);
  console.log("Zapsáno:", cil);
}
