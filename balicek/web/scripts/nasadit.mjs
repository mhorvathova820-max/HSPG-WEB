#!/usr/bin/env node
// Pojistka proti vyčerpání kreditů Netlify (po vyčerpání Netlify pozastaví CELÝ web).
// Náhledové nasazení je zdarma, produkční stojí 15 kreditů. Jediný povolený způsob nasazení webu:
//
//   node scripts/nasadit.mjs
//       náhled (0 kreditů) – vypíše adresu náhledu
//   node scripts/nasadit.mjs --produkce --schvaleno "majitel 4. 10. 18:30 v chatu"
//       produkce (15 kreditů) – jen s výslovným schválením majitele, jen z čisté větve main,
//       nejvýš NASAZENI_DENNI_LIMIT× za den (výchozí 1)
//   node scripts/nasadit.mjs --produkce --schvaleno "…" --nouzove "web nefunguje: …"
//       jen pro opravu výpadku – překročí denní limit, důvod se zapíše
//
// Záznam produkčních nasazení: .nasazeni-produkce.json (commitovat – vidí ho všichni agenti).
import { spawnSync, execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const PROJEKT = "e4dff53f-791b-4c8c-946c-a23d06421774"; // tourmaline-dasik-9de005 = hspg.cz
export const KREDITY_ZA_PRODUKCI = 15;

const den = (d) => new Date(d).toISOString().slice(0, 10);

// Čistá logika (testovaná): smí se teď nasadit do produkce?
export function muzeDoProdukce({ zaznamy, ted, limit = 1, schvaleno, nouzove, vetev, cisto }) {
  if (!schvaleno || String(schvaleno).trim().length < 5) return { ok: false, duvod: "Chybí --schvaleno \"kdo a kdy schválil\" – produkci schvaluje jen majitel." };
  if (vetev !== "main") return { ok: false, duvod: `Produkce jen z větve main (teď: ${vetev}). Nejdřív slouč ověřenou větev.` };
  if (!cisto) return { ok: false, duvod: "Pracovní strom není čistý – commitni nebo odlož změny, do produkce jde jen commitnutý stav." };
  const dnes = zaznamy.filter((z) => den(z.cas) === den(ted)).length;
  if (dnes >= limit && !nouzove) return { ok: false, duvod: `Dnes už proběhlo ${dnes} produkční nasazení (limit ${limit}). Použij náhled, nebo při výpadku --nouzove "důvod".` };
  return { ok: true, dnesPoNasazeni: dnes + 1 };
}

function arg(nazev) {
  const i = process.argv.indexOf(nazev);
  return i === -1 ? undefined : process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : true;
}

function adresarPublikace() {
  try {
    const t = readFileSync("netlify.toml", "utf8");
    const m = t.match(/^\s*publish\s*=\s*"([^"]+)"/m);
    if (m) return m[1];
  } catch {}
  return ".";
}

function projektSouhlasi() {
  try {
    const s = JSON.parse(readFileSync(".netlify/state.json", "utf8"));
    return s.siteId === PROJEKT;
  } catch {
    return process.env.NETLIFY_SITE_ID === PROJEKT;
  }
}

function hlavni() {
  const produkce = Boolean(arg("--produkce"));
  if (!projektSouhlasi()) {
    console.error(`Složka není propojená s projektem hspg.cz (${PROJEKT}). Spusť: npx netlify link --id ${PROJEKT}`);
    process.exit(2);
  }
  const dir = adresarPublikace();
  const zprava = String(arg("--zprava") || execSync("git log -1 --format=%s", { encoding: "utf8" }).trim()).slice(0, 120);

  if (!produkce) {
    console.log(`Náhledové nasazení (0 kreditů) z „${dir}“…`);
    const r = spawnSync("npx", ["-y", "netlify-cli", "deploy", "--dir", dir, "--message", `náhled: ${zprava}`], { stdio: "inherit" });
    process.exit(r.status ?? 1);
  }

  const soubor = ".nasazeni-produkce.json";
  const zaznamy = existsSync(soubor) ? JSON.parse(readFileSync(soubor, "utf8")) : [];
  const vetev = execSync("git rev-parse --abbrev-ref HEAD", { encoding: "utf8" }).trim();
  const cisto = execSync("git status --porcelain", { encoding: "utf8" }).trim() === "";
  const ted = Date.now();
  const v = muzeDoProdukce({
    zaznamy, ted, vetev, cisto,
    limit: Number(process.env.NASAZENI_DENNI_LIMIT || 1),
    schvaleno: arg("--schvaleno"),
    nouzove: arg("--nouzove"),
  });
  if (!v.ok) {
    console.error(`PRODUKCE ZAMÍTNUTA: ${v.duvod}`);
    process.exit(3);
  }
  console.log(`Produkční nasazení stojí ${KREDITY_ZA_PRODUKCI} kreditů (dnes ${v.dnesPoNasazeni}.). Zkontroluj zbývající kredity: Netlify → Usage & billing.`);
  const r = spawnSync("npx", ["-y", "netlify-cli", "deploy", "--prod", "--dir", dir, "--message", zprava], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
  zaznamy.push({ cas: new Date(ted).toISOString(), commit: execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim(), zprava, schvaleno: arg("--schvaleno"), ...(arg("--nouzove") ? { nouzove: arg("--nouzove") } : {}) });
  writeFileSync(soubor, JSON.stringify(zaznamy, null, 2) + "\n");
  console.log(`Zapsáno do ${soubor} – commitni ho („Záznam produkčního nasazení“).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) hlavni();
