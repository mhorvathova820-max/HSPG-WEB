// Společné ověření majitele pro serverové body brány (/api/mcp, /api/mapa …) – úkol 59/60.
// Přijímá Authorization: Bearer … = token panelu (/api/majitel), přístupový token OAuth brány (mcp-oauth.mjs)
// nebo pevný HSPG_MCP_TOKEN (≥ 32 znaků). Bez hesla panelu v Netlify 503, bez úložiště 503 – nikdy průchod.
import { createHash, timingSafeEqual } from "node:crypto";
import { overToken, hesloNastaveno, tajemstviServeru } from "./autorizace.mjs";
import { CESTY, overPristupovyToken, klicTokenu } from "./mcp-oauth.mjs";

export const MIN_DELKA_MCP_TOKENU = 32;
const otisk = (s) => createHash("sha256").update(String(s)).digest();
const stejne = (a, b) => timingSafeEqual(otisk(a), otisk(b));

export function vytvorOvereniMajitele({ env = process.env, dejUloziste, ted = () => Date.now() }) {
  if (typeof dejUloziste !== "function") throw new Error("vytvorOvereniMajitele: chybí dejUloziste().");
  const tajemstvi = async () => tajemstviServeru(env, await dejUloziste());

  async function overBearer(req, zaklad) {
    if (!hesloNastaveno(env)) return { ok: false, status: 503, duvod: "HSPG_PANEL_HESLO není v Netlify nastavené (min. 16 znaků)." };
    const auth = req.headers.get("authorization") || "";
    if (!auth.startsWith("Bearer ") || auth.length > 4200) return { ok: false, status: 401, duvod: "Chybí přístupový token.", bezTokenu: true };
    const token = auth.slice(7).trim();
    const pevny = String(env.HSPG_MCP_TOKEN || "");
    if (pevny.length >= MIN_DELKA_MCP_TOKENU && stejne(token, pevny)) return { ok: true, zpusob: "pevny" };
    let t;
    try { t = await tajemstvi(); } catch { return { ok: false, status: 503, duvod: "Úložiště není dostupné – přihlášení teď nejde ověřit." }; }
    const ted0 = ted();
    if (overToken(token, env, ted0, t)) return { ok: true, zpusob: "panel" };
    if (overPristupovyToken(token, klicTokenu(env, t), zaklad, ted0)) return { ok: true, zpusob: "oauth" };
    return { ok: false, status: 401, duvod: "Přístupový token je neplatný nebo vypršel." };
  }

  const hlavicky401 = (zaklad, bezTokenu) => ({
    "www-authenticate": `Bearer realm="HSPG AI Gateway"${bezTokenu ? "" : ', error="invalid_token"'}, resource_metadata="${zaklad}${CESTY.metadataZdroj}"`,
  });

  return { overBearer, hlavicky401, tajemstvi };
}
