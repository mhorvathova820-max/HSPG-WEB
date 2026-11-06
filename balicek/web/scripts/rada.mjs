#!/usr/bin/env node
// Rada AI z terminálu – pro Claude Code ve VS Code (a GitHub Copilot, má-li klíč jako tajemství prostředí).
// Stejná pseudonymizovaná otázka jde paralelně vybraným modelům na OpenRouter, pak předseda Claude Opus
// sepíše shodu, rozdíly a doporučení (logika je jen jednou: netlify/lib/ai/rada.mjs).
//
//   node balicek/web/scripts/rada.mjs "otázka" [--role opus,astra,argon,grok,muse] [--soubor cesta]
//        [--pokyn "role pro AI"] [--md] [--json] [--limit-kc 30] [--max-tokenu 3000]
//
// Klíč JEN z proměnné prostředí HSPG_KLIC_OPENROUTER nebo OPENROUTER_API_KEY – nikdy z argumentu ani ze
// souboru v repozitáři (repozitář je veřejný). Do modelů jde jen pseudonymizovaný text a výstup (terminál
// i Markdown v balicek/rada/, kterou git ignoruje) zůstává pseudonymizovaný – zpětné doplnění osobních údajů
// je jen v panelu majitele. ZDR role posílají provider.zdr + data_collection = "deny"; Muse Wonder (bez ZDR)
// dotaz s osobními údaji nedostane. Cena = usage.cost, které vrací OpenRouter (jeho kredity ≈ USD).
// Rozpočet běhu hlídá stejná rezervace jako na webu (limity.mjs) – výchozí strop 30 Kč na jedno spuštění.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { basename, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { MODELY_OPENROUTER, adapterOpenRouter, sCenami } from "../netlify/lib/ai/poskytovatele.mjs";
import { poradaRady } from "../netlify/lib/ai/rada.mjs";
import { pametoveUloziste, rezervuj, zapisUtratu } from "../netlify/lib/ai/limity.mjs";
import { STITKY } from "../netlify/lib/ai/pseudonymizace.mjs";

const VYCHOZI_ROLE = ["opus", "astra", "argon", "grok"]; // Muse (bez ZDR) jen na výslovné přání
const MAX_ZNAKU = 60_000;
const MODEL_RE = /^~?[A-Za-z0-9][A-Za-z0-9._:/-]{1,79}$/;
// Vzory tajemství – takový text se modelům neposílá (klíč patří jen do proměnné prostředí).
// Pomlčky a podtržítka předpon jsou zapsané jako \x2D a \x5F, aby zdrojový kód sám nevypadal jako klíč.
const TAJEMSTVI = /\b(sk\x2Dor\x2Dv1\x2D[A-Za-z0-9]{16,}|sk\x2Dant\x2D[A-Za-z0-9_-]{16,}|sk\x2Dproj\x2D[A-Za-z0-9_-]{16,}|sk\x2D[A-Za-z0-9]{32,}|gh[pousr]\x5F[A-Za-z0-9]{30,}|github\x5Fpat\x5F[A-Za-z0-9_]{30,}|AIza[0-9A-Za-z_-]{30,}|xai\x2D[A-Za-z0-9]{30,})\b/;
const ZAKAZANE_SOUBORY = /(^|[\\/])(\.env[^\\/]*|.*\.pem|.*\.key|id_rsa[^\\/]*|id_ed25519[^\\/]*|\.npmrc|\.netrc)$/i;
const VYCHOZI_ADRESAR = fileURLToPath(new URL("../../rada/", import.meta.url));

export const POMOC = `Rada AI (OpenRouter) – stejná otázka více modelům, shrnutí předsedou Claude Opus.

  node balicek/web/scripts/rada.mjs "otázka" [volby]

  --role a,b,…      členové rady: ${Object.keys(MODELY_OPENROUTER).join(", ")} (výchozí ${VYCHOZI_ROLE.join(",")})
  --soubor cesta    připojí text souboru (nejvýš ${MAX_ZNAKU.toLocaleString("cs-CZ")} znaků; ne .env ani klíče)
  --pokyn "text"    role pro AI v této úloze (např. „patentový rešeršér“)
  --md              uloží výsledek do balicek/rada/ (git ho ignoruje)
  --json            výstup jako JSON (pro agenty a GitHub)
  --limit-kc N      strop odhadované útraty jednoho spuštění (výchozí HSPG_RADA_LIMIT_KC nebo 30)
  --max-tokenu N    strop délky odpovědi člena (256–8000, výchozí 3000)

Klíč: export HSPG_KLIC_OPENROUTER=… (nebo OPENROUTER_API_KEY) v terminálu – nikdy do příkazu ani do repozitáře.
Přepsání modelu: RADA_<ROLE>_MODEL, např. RADA_OPUS_MODEL=~anthropic/claude-opus-latest (alias není v seznamu ZDR).
Hledání na webu pro argon (patenty): HSPG_PATENTY_WEB=1.`;

class ChybaPouziti extends Error {}

export function rozeberArgumenty(argv) {
  const o = { otazka: [], role: null, soubor: null, pokyn: "", md: false, json: false, limitKc: null, maxTokenu: null, pomoc: false };
  for (let i = 0; i < argv.length; i++) {
    const a = String(argv[i]);
    if (/^--?(klic|key|api-?key|token|heslo)(=|$)/i.test(a)) throw new ChybaPouziti("Klíč nepatří do příkazu (zůstal by v historii terminálu). Nastav proměnnou prostředí HSPG_KLIC_OPENROUTER nebo OPENROUTER_API_KEY.");
    if (TAJEMSTVI.test(a)) throw new ChybaPouziti("Argument vypadá jako klíč nebo token – takový text se modelům neposílá. Klíč patří jen do proměnné prostředí.");
    const [nazev, rovno] = a.startsWith("--") && a.includes("=") ? [a.slice(0, a.indexOf("=")), a.slice(a.indexOf("=") + 1)] : [a, null];
    const hodnota = () => {
      if (rovno !== null) return rovno;
      if (i + 1 >= argv.length) throw new ChybaPouziti(`Chybí hodnota za ${nazev}.`);
      return String(argv[++i]);
    };
    if (nazev === "--role") o.role = hodnota();
    else if (nazev === "--soubor") o.soubor = hodnota();
    else if (nazev === "--pokyn") o.pokyn = hodnota();
    else if (nazev === "--limit-kc") o.limitKc = Number(hodnota());
    else if (nazev === "--max-tokenu") o.maxTokenu = Number(hodnota());
    else if (nazev === "--md") o.md = true;
    else if (nazev === "--json") o.json = true;
    else if (nazev === "--help" || nazev === "-h") o.pomoc = true;
    else if (a.startsWith("--")) throw new ChybaPouziti(`Neznámá volba ${nazev}.`);
    else o.otazka.push(a);
  }
  return o;
}

const kcText = (x) => `${(Math.round(x * 100) / 100).toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kč`;
const usd = (x) => `$${x.toFixed(4)}`;
const tokeny = (s) => `${(s.vstup || 0).toLocaleString("cs-CZ")} + ${(s.vystup || 0).toLocaleString("cs-CZ")} tokenů`;
const typyText = (typy) => Object.entries(typy).map(([t, n]) => `${STITKY[t] || t} ${n}`).join(", ");

function textovyVystup(v, kurz) {
  const r = [];
  const p = v.pseudonymizace;
  r.push(`Rada AI · ${v.clenove.length} ${v.clenove.length === 1 ? "člen" : v.clenove.length < 5 ? "členové" : "členů"} · předseda Claude Opus`);
  r.push(p.nahrazeno ? `Pseudonymizace: ${p.nahrazeno} osobních údajů (${typyText(p.typy)}) – modely viděly jen značky [TYP_N].` : "Pseudonymizace: v zadání nebyly nalezeny osobní údaje.");
  for (const c of v.clenove) {
    r.push("");
    if (c.ok) {
      r.push(`## ${c.nazev} · ${c.modelPouzity || c.model} · ${tokeny(c.stat)}${typeof c.stat.cena === "number" ? ` · ${usd(c.stat.cena)}` : ""}`);
      r.push(c.text);
    } else {
      r.push(`## ${c.nazev} · ${c.model} · ✗ ${c.vynechano === "osobni-udaje" ? "vynecháno" : "bez odpovědi"}`);
      r.push(c.chyba || "");
    }
  }
  const pr = v.predseda;
  r.push("", `=== Předseda${pr?.nazev ? ` (${pr.nazev}${pr.nahradni ? ", náhradní" : ""})` : ""} ===`);
  if (pr?.ok) {
    if (pr.shoda?.length) r.push("Shoda:", ...pr.shoda.map((b) => ` • ${b}`));
    if (pr.rozdily?.length) r.push("Rozdíly:", ...pr.rozdily.map((b) => ` • ${b}`));
    if (pr.doporuceni) r.push("Doporučení:", pr.doporuceni);
    if (pr.text) r.push(pr.text);
  } else {
    r.push(pr?.preskoceno || pr?.chyba || "Shrnutí chybí.");
  }
  const s = v.stat;
  r.push("", `Celkem: ${s.dotazu} dotazů · ${tokeny(s)}${typeof s.cena === "number" ? ` · OpenRouter ${usd(s.cena)} (≈ ${kcText(s.cena * kurz)})` : " · cenu OpenRouter neuvedl"}`);
  return r.join("\n");
}

function markdown(v, kurz, kdy) {
  const r = [`# Rada AI – ${kdy.toISOString().slice(0, 16).replace("T", " ")} UTC`, "", "> Pseudonymizovaný výstup (osobní údaje nahrazené značkami). Soubor git ignoruje – nepřidávej ho do repozitáře.", ""];
  r.push("## Zadání", "", "```text", v.zadani, "```", "");
  r.push(textovyVystup(v, kurz).split("\n").slice(2).join("\n"));
  return r.join("\n") + "\n";
}

// deps: { env, fetch, vypis, chyby, ted, adresarRady } – pro testy (falešný fetch, zachycený výstup).
export async function main(argv = process.argv.slice(2), deps = {}) {
  const env = deps.env || process.env;
  const vypis = deps.vypis || ((t) => process.stdout.write(t + "\n"));
  const chyby = deps.chyby || ((t) => process.stderr.write(t + "\n"));
  const ted = deps.ted || (() => Date.now());
  const klic = String(env.HSPG_KLIC_OPENROUTER || env.OPENROUTER_API_KEY || "");
  const bezKlice = (t) => (klic ? String(t).split(klic).join("[klíč]") : String(t)); // klíč se nikdy nevypíše

  let o;
  try {
    o = rozeberArgumenty(argv);
  } catch (e) {
    chyby(e instanceof ChybaPouziti ? e.message : String(e));
    return 2;
  }
  if (o.pomoc) { vypis(POMOC); return 0; }
  const otazka = o.otazka.join(" ").trim();
  if (!otazka) { chyby("Chybí otázka.\n\n" + POMOC); return 2; }
  if (!klic) {
    chyby("Chybí klíč OpenRouter. V terminálu nastav proměnnou prostředí (ne do repozitáře):\n  export HSPG_KLIC_OPENROUTER=…   (nebo OPENROUTER_API_KEY)");
    return 2;
  }
  const role = [...new Set((o.role || VYCHOZI_ROLE.join(",")).split(",").map((x) => x.trim().toLowerCase()).filter(Boolean))];
  const nezname = role.filter((r) => !MODELY_OPENROUTER[r]);
  if (!role.length || nezname.length) { chyby(`Neznámá role: ${nezname.join(", ") || "(žádná)"}. Povolené: ${Object.keys(MODELY_OPENROUTER).join(", ")}.`); return 2; }

  let text = otazka;
  if (o.soubor) {
    if (ZAKAZANE_SOUBORY.test(o.soubor)) { chyby("Tento soubor může obsahovat tajemství (.env, klíče) – modelům se neposílá."); return 2; }
    let obsah;
    try { obsah = readFileSync(o.soubor, "utf8"); } catch { chyby(`Soubor ${basename(o.soubor)} nejde přečíst.`); return 2; }
    if (obsah.length > MAX_ZNAKU) { chyby(`Soubor je delší než ${MAX_ZNAKU.toLocaleString("cs-CZ")} znaků – vyber jen potřebnou část.`); return 2; }
    text += `\n\nPŘILOŽENÝ SOUBOR (${basename(o.soubor)}):\n${obsah}`;
  }
  if (TAJEMSTVI.test(text) || TAJEMSTVI.test(o.pokyn)) { chyby("Zadání obsahuje něco, co vypadá jako klíč nebo token – modelům se neposílá. Odstraň ho."); return 2; }
  if (text.length + o.pokyn.length > MAX_ZNAKU) { chyby(`Zadání je delší než ${MAX_ZNAKU.toLocaleString("cs-CZ")} znaků.`); return 2; }

  // Modely: připnuté ZDR modely; přepsání proměnnou RADA_<ROLE>_MODEL s varováním.
  const modelPro = (r) => {
    const prepis = String(env[`RADA_${r.toUpperCase()}_MODEL`] || "");
    if (prepis && MODEL_RE.test(prepis)) return prepis;
    return MODELY_OPENROUTER[r].model;
  };
  for (const r of new Set([...role, "opus"])) {
    const m = modelPro(r);
    if (m.startsWith("~")) chyby(`Pozor: ${r} = ${m} je alias nejnovější verze – v seznamu ZDR není a cíl se mění bez ohlášení; dotaz půjde jen na ZDR koncový bod (provider.zdr), jinak selže.`);
    else if (m !== MODELY_OPENROUTER[r].model) chyby(`Pozor: ${r} používá přepsaný model ${m} (výchozí ${MODELY_OPENROUTER[r].model}).`);
  }
  if (role.includes("muse")) chyby("Muse Wonder je bez ZDR: dostane jen zadání bez osobních údajů.");
  if (role.includes("argon") && env.HSPG_PATENTY_WEB === "1") chyby("Argon hledá na webu (HSPG_PATENTY_WEB=1): pseudonymizovaný dotaz jde i vyhledávači, OpenRouter účtuje hledání zvlášť.");

  const fetch = deps.fetch;
  const clen = (r, nazev = MODELY_OPENROUTER[r].nazev) => {
    const m = MODELY_OPENROUTER[r];
    const model = modelPro(r);
    return {
      id: r, nazev: m.zdr ? nazev : `${nazev} (bez ZDR)`, model, zdr: m.zdr,
      adapter: adapterOpenRouter({ klic, model, zdr: m.zdr, web: r === "argon" && env.HSPG_PATENTY_WEB === "1", fetch }),
      ...(r === "argon" ? { minTokenu: 4000 } : {}),
    };
  };
  const t0 = ted();
  const limitKc = Number(o.limitKc) > 0 ? Number(o.limitKc) : Number(env.HSPG_RADA_LIMIT_KC) > 0 ? Number(env.HSPG_RADA_LIMIT_KC) : 30;
  const kurz = Number(env.KURZ_USD_CZK) > 0 ? Number(env.KURZ_USD_CZK) : 24;
  // Strop jednoho spuštění: stejná rezervace jako na webu, jen v paměti (nic se neukládá).
  const ul = pametoveUloziste();
  const envR = sCenami({ AI_MESICNI_LIMIT_KC: String(limitKc), KURZ_USD_CZK: String(kurz) }, [...new Set([...role, "opus"])].map((r) => [r, modelPro(r)]));
  const rozpocet = {
    rezervuj: (c, vstupT, maxT) => rezervuj(ul, c.id, vstupT, maxT, envR, t0, c.model),
    vyrovnej: (c, stat, rez) => zapisUtratu(ul, c.id, stat, envR, t0, rez, c.model),
  };
  const maxTokenu = Math.min(8000, Math.max(256, Math.floor(Number(o.maxTokenu)) || 3000));

  let v;
  try {
    v = await poradaRady({
      zpravy: [{ role: "user", text }], pokyn: o.pokyn, clenove: role.map((r) => clen(r)), predseda: clen("opus", "Claude Opus"),
      maxTokenu, casLimitMs: Number(env.HSPG_RADA_LIMIT_MS) > 0 ? Number(env.HSPG_RADA_LIMIT_MS) : 120_000, opakovani: 1, rozpocet,
    });
  } catch (e) {
    chyby(bezKlice(`Rada se nedokončila: ${e?.message || e}`));
    return 1;
  }

  if (o.json) vypis(bezKlice(JSON.stringify(v, null, 2)));
  else vypis(bezKlice(textovyVystup(v, kurz)));
  if (o.md) {
    const adresar = deps.adresarRady || VYCHOZI_ADRESAR;
    try {
      mkdirSync(adresar, { recursive: true });
      // Výstupy rady do veřejného repozitáře nepatří – složka ignoruje sama sebe.
      if (!existsSync(join(adresar, ".gitignore"))) writeFileSync(join(adresar, ".gitignore"), "# Výstupy scripts/rada.mjs – necommitovat.\n*\n");
      const kdy = new Date(t0);
      const soubor = join(adresar, `rada-${kdy.toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "-")}.md`);
      writeFileSync(soubor, bezKlice(markdown(v, kurz, kdy)));
      chyby(`Uloženo: ${soubor}`);
    } catch (e) {
      chyby(`Markdown se nepodařilo uložit: ${e?.message || e}`);
    }
  }
  return v.clenove.some((c) => c.ok) ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
