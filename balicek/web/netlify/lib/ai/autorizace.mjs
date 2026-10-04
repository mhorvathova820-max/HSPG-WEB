// Přihlášení majitele: heslo HSPG_PANEL_HESLO se ověří jednou a výměnou se vydá podepsaný token.
// Heslo tak nezůstává v prohlížeči; token platí 12 hodin a jde zneplatnit změnou hesla.
import { createHmac, createHash, timingSafeEqual } from "node:crypto";

const PLATNOST_MS = 12 * 60 * 60 * 1000;
const MIN_DELKA_HESLA = 16;

const otisk = (s) => createHash("sha256").update(String(s)).digest();
const stejne = (a, b) => timingSafeEqual(otisk(a), otisk(b));

function tajemstvi(env) {
  const heslo = env.HSPG_PANEL_HESLO || "";
  if (heslo.length < MIN_DELKA_HESLA) return null;
  // Samostatné tajemství je volitelné; bez něj se odvodí z hesla, takže změna hesla odhlásí všechny.
  return env.HSPG_TOKEN_TAJEMSTVI || `hspg-token:${heslo}`;
}

const podpis = (data, klic) => createHmac("sha256", klic).update(data).digest("base64url");

export function hesloNastaveno(env = process.env) {
  return tajemstvi(env) !== null;
}

export function overHeslo(zadane, env = process.env) {
  if (!hesloNastaveno(env)) return false;
  return stejne(String(zadane || ""), env.HSPG_PANEL_HESLO);
}

export function vydejToken(env = process.env, ted = Date.now()) {
  const klic = tajemstvi(env);
  if (!klic) throw new Error("HSPG_PANEL_HESLO není nastavené.");
  const platnost = ted + PLATNOST_MS;
  return { token: `${platnost}.${podpis(String(platnost), klic)}`, platnost };
}

export function overToken(token, env = process.env, ted = Date.now()) {
  const klic = tajemstvi(env);
  if (!klic || typeof token !== "string") return false;
  const [platnost, sig] = token.split(".");
  if (!/^\d{1,15}$/.test(platnost || "") || !sig) return false;
  if (Number(platnost) < ted) return false;
  return stejne(sig, podpis(platnost, klic));
}

// Interní endpointy přijmou jen token (Authorization: Bearer …). Heslo se ověřuje výhradně v /api/majitel,
// kde platí zámek po 5 chybných pokusech – jinde by šlo heslo hádat bez omezení.
export function overPozadavek(req, env = process.env, ted = Date.now()) {
  if (!hesloNastaveno(env)) return { ok: false, status: 503, duvod: "HSPG_PANEL_HESLO není v Netlify nastavené (min. 16 znaků)." };
  const auth = req.headers.get("authorization") || "";
  if (auth.startsWith("Bearer ") && overToken(auth.slice(7), env, ted)) return { ok: true };
  return { ok: false, status: 401, duvod: "Přihlášení vypršelo nebo je neplatné." };
}

// Požadavky smí posílat jen stránky webu (a náhledy na Netlify); ASISTENT_POVOLENE_ORIGINY přidá další.
export function povolenyOrigin(origin, env = process.env) {
  if (!origin) return true; // prohlížeče u fetch POST Origin posílají; bez něj (server, curl) rozhodují limity
  let h;
  try { h = new URL(origin).hostname; } catch { return false; }
  const dalsi = (env.ASISTENT_POVOLENE_ORIGINY || "").split(",").map((x) => x.trim()).filter(Boolean);
  return h === "hspg.cz" || h === "www.hspg.cz" || h === "localhost" || h === "127.0.0.1" ||
    h === "tourmaline-dasik-9de005.netlify.app" || h.endsWith("--tourmaline-dasik-9de005.netlify.app") || dalsi.includes(h);
}
