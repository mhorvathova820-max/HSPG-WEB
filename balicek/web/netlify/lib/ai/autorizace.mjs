// Přihlášení majitele: heslo HSPG_PANEL_HESLO se ověří jednou a výměnou se vydá podepsaný token.
// Heslo tak nezůstává v prohlížeči; token platí 12 hodin a jde zneplatnit změnou hesla.
// Podpisový klíč = náhodné tajemství serveru + heslo. Tajemství vznikne samo při prvním přihlášení
// (Netlify Blobs, úložiště „hspg-ai“), majitel nic dalšího nenastavuje. Z uniklého tokenu tak nejde
// heslo hádat offline – bez tajemství serveru je podpis k ničemu.
import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";

const PLATNOST_MS = 12 * 60 * 60 * 1000;
const MIN_DELKA_HESLA = 16;
const MIN_DELKA_TAJEMSTVI = 32;
const KLIC_TAJEMSTVI = "tajemstvi/token";

const otisk = (s) => createHash("sha256").update(String(s)).digest();
const stejne = (a, b) => timingSafeEqual(otisk(a), otisk(b));
const NEPLATNE = "Přihlášení vypršelo nebo je neplatné.";

// Volitelně HSPG_TOKEN_TAJEMSTVI (aspoň 32 znaků) místo tajemství v Blobs – např. pro lokální běh.
function tajemstviZProstredi(env) {
  const t = env.HSPG_TOKEN_TAJEMSTVI || "";
  if (t && t.length < MIN_DELKA_TAJEMSTVI) console.warn("autorizace: HSPG_TOKEN_TAJEMSTVI je kratší než 32 znaků – ignoruji ho");
  return t.length >= MIN_DELKA_TAJEMSTVI ? t : null;
}

const vMezipameti = new WeakMap(); // úložiště -> tajemství (jedno čtení na instanci funkce)

// Tajemství serveru: z prostředí, jinak z Blobs; při prvním použití se vygeneruje a zapíše podmíněně
// (souběžné první přihlášení nevytvoří dvě různá tajemství). Chyba úložiště se nepolyká – volající vrátí 503.
export async function tajemstviServeru(env, ul) {
  const zEnv = tajemstviZProstredi(env);
  if (zEnv) return zEnv;
  if (!ul) throw new Error("Úložiště není k dispozici.");
  if (vMezipameti.has(ul)) return vMezipameti.get(ul);
  let z = await ul.get(KLIC_TAJEMSTVI, { type: "json" });
  if (!z?.hodnota) {
    const nove = { hodnota: randomBytes(32).toString("hex"), vytvoreno: new Date().toISOString() };
    const r = await ul.setJSON(KLIC_TAJEMSTVI, nove, { onlyIfNew: true });
    // Platí jen potvrzený zápis (s etagem); {modified:false} = souběžná instance zapsala dřív → přečíst její.
    // Jiný výsledek (chyba zápisu bez výjimky) → výjimka: tajemství, které není v Blobs, nesmí do mezipaměti.
    if (r?.modified === true && r.etag) z = nove;
    else if (r?.modified === false) z = await ul.get(KLIC_TAJEMSTVI, { type: "json" });
    else throw new Error("Tajemství serveru nejde uložit.");
  }
  if (!z?.hodnota) throw new Error("Tajemství serveru nejde načíst.");
  vMezipameti.set(ul, z.hodnota);
  return z.hodnota;
}

function klicPodpisu(env, tajemstvi) {
  const heslo = env.HSPG_PANEL_HESLO || "";
  const t = tajemstvi || tajemstviZProstredi(env);
  if (heslo.length < MIN_DELKA_HESLA || !t) return null;
  // Heslo je součástí klíče: jeho změna zneplatní všechny vydané tokeny.
  return createHmac("sha256", t).update(`hspg-token|${heslo}`).digest();
}

const podpis = (data, klic) => createHmac("sha256", klic).update(data).digest("base64url");

export function hesloNastaveno(env = process.env) {
  return (env.HSPG_PANEL_HESLO || "").length >= MIN_DELKA_HESLA;
}

export function overHeslo(zadane, env = process.env) {
  if (!hesloNastaveno(env)) return false;
  return stejne(String(zadane || ""), env.HSPG_PANEL_HESLO);
}

export function vydejToken(env = process.env, ted = Date.now(), tajemstvi) {
  const klic = klicPodpisu(env, tajemstvi);
  if (!klic) throw new Error("HSPG_PANEL_HESLO nebo tajemství serveru chybí.");
  const platnost = ted + PLATNOST_MS;
  return { token: `${platnost}.${podpis(String(platnost), klic)}`, platnost };
}

export function overToken(token, env = process.env, ted = Date.now(), tajemstvi) {
  const klic = klicPodpisu(env, tajemstvi);
  if (!klic || typeof token !== "string") return false;
  const [platnost, sig] = token.split(".");
  if (!/^\d{1,15}$/.test(platnost || "") || !sig) return false;
  if (Number(platnost) < ted) return false;
  return stejne(sig, podpis(platnost, klic));
}

// Interní endpointy přijmou jen token (Authorization: Bearer …). Heslo se ověřuje výhradně v /api/majitel,
// kde platí zámek 5 pokusů / 15 min – jinde by šlo heslo hádat bez omezení.
// Bez hlavičky se odmítá hned (bez čtení úložiště a bez umělého zdržení – zdržení by jen pálilo výpočetní kredity).
// dejUloziste: async () => úložiště (pro tajemství serveru); výpadek úložiště = 503, nikdy průchod.
export async function overPozadavek(req, env = process.env, ted = Date.now(), dejUloziste) {
  if (!hesloNastaveno(env)) return { ok: false, status: 503, duvod: "HSPG_PANEL_HESLO není v Netlify nastavené (min. 16 znaků)." };
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ") || auth.length > 200) return { ok: false, status: 401, duvod: NEPLATNE };
  let tajemstvi;
  try {
    tajemstvi = await tajemstviServeru(env, tajemstviZProstredi(env) ? null : await dejUloziste?.());
  } catch {
    return { ok: false, status: 503, duvod: "Úložiště není dostupné – přihlášení teď nejde ověřit. Zkuste to za chvíli." };
  }
  return overToken(auth.slice(7), env, ted, tajemstvi) ? { ok: true } : { ok: false, status: 401, duvod: NEPLATNE };
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
