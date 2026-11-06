// Rada AI (rozhodnutí majitele 22. 10. 2026): stejný pseudonymizovaný dotaz jde paralelně vybraným AI
// (časový limit, opakování, rozpočet přes rezervaci v limity.mjs), pak předseda – Claude Opus – sepíše
// shodu, rozdíly a doporučení. Používá ji /api/ai (režim „rada“, jen majitel) a scripts/rada.mjs
// (Claude Code ve VS Code). Výsledek obsahuje jen PSEUDONYMIZOVANÉ texty; zpětné doplnění osobních údajů
// smí udělat jen panel majitele. Knihovna sama nic neloguje – volající loguje jen role, model, stav a čas.
//
// Člen rady: { id, nazev, model, adapter: { dotaz }, zdr: boolean, minTokenu? }
// Model bez ZDR (Muse Wonder) dotaz s osobními údaji nedostane – ani pseudonymizovaný.
import { PRAVIDLA_PRAVDIVOSTI } from "./pravidla.mjs";
import { vytvorPseudonymizaci, mozneOsobniUdaje } from "./pseudonymizace.mjs";
import { sLimitem } from "./poskytovatele.mjs";
import { odhadTokenu, odhadTokenuKlienta } from "./limity.mjs";

export const POKYN_CLEN = `Jsi člen rady několika AI. Na zadání odpověz samostatně, věcně a stručně (nejvýš asi 350 slov).
Odděl ověřená fakta od odhadů a napiš, co je potřeba ověřit. Nevymýšlej zdroje, čísla ani citace.
Značky v hranatých závorkách jako [JMENO_1] nebo [EMAIL_1] zastupují osobní údaje: ponech je beze změny, nic za ně nedosazuj a nedomýšlej.`;

export const POKYN_PREDSEDA = `Jsi předseda rady AI. Dostaneš zadání a odpovědi členů rady (každá je podepsaná jménem člena).
Porovnej je a vrať POUZE JSON bez dalšího textu:
{"shoda":["…"],"rozdily":["…"],"doporuceni":"…"}
- shoda: body, na kterých se členové shodují (nejvýš 6 krátkých bodů),
- rozdily: v čem se liší – u každého bodu uveď, kdo co tvrdí (nejvýš 6 bodů),
- doporuceni: co z odpovědí platí, co ověřit a jaký je další krok (nejvýš 120 slov).
Vycházej jen ze zadání a z odpovědí členů, nic nepřidávej. Značky [TYP_N] ponech beze změny.`;

// Chyba nastavení nebo obsahu – opakování nepomůže.
const BEZ_OPAKOVANI = new Set([400, 401, 402, 403, 404, 413, 422]);
const MAX_ZNAKU_ZADANI = 12_000;
const MAX_ZNAKU_ODPOVEDI = 8_000;

const popis = (c) => ({ id: c.id, nazev: c.nazev || c.id, model: c.model || null, zdr: c.zdr !== false });
const zkrat = (t, n) => (t.length > n ? t.slice(0, n) + "\n[zkráceno]" : t);
const textChyby = (e) => `${e?.status ? `(${e.status}) ` : ""}${String(e?.message || e || "chyba").slice(0, 200)}`;

// Výstup předsedy: první objekt JSON nejvyšší úrovně (i obalený textem nebo ```json). Bez platného JSON → null.
export function prectiJson(text) {
  const t = String(text || "");
  for (let od = t.indexOf("{"); od !== -1; od = t.indexOf("{", od + 1)) {
    let hloubka = 0, vRetezci = false, unik = false;
    for (let i = od; i < t.length; i++) {
      const c = t[i];
      if (vRetezci) {
        if (unik) unik = false;
        else if (c === "\\") unik = true;
        else if (c === '"') vRetezci = false;
      } else if (c === '"') vRetezci = true;
      else if (c === "{") hloubka++;
      else if (c === "}" && --hloubka === 0) {
        try {
          const j = JSON.parse(t.slice(od, i + 1));
          const body = (x) => (Array.isArray(x) ? x.filter((b) => typeof b === "string" && b.trim()).map((b) => b.trim().slice(0, 400)).slice(0, 8) : []);
          if (j && typeof j === "object" && (Array.isArray(j.shoda) || Array.isArray(j.rozdily) || typeof j.doporuceni === "string")) {
            return { shoda: body(j.shoda), rozdily: body(j.rozdily), doporuceni: typeof j.doporuceni === "string" ? j.doporuceni.trim().slice(0, 2000) : "" };
          }
        } catch {}
        break;
      }
    }
  }
  return null;
}

// Jedno volání jednoho člena: rezervace rozpočtu → dotaz s časovým limitem → vyrovnání; opakování při
// přechodné chybě. Odmítnutí poskytovatelem (HTTP chyba, nic neúčtováno) rezervaci vrátí; vypršení času
// (504) a odmítnutí obsahu (422) ji nechají – tokeny mohly být účtované (stejně jako /api/ai).
async function zavolej(c, system, zpravy, maxTokenu, vstupTokenu, { casLimitMs, opakovani, rozpocet, signal, pocitadlo }) {
  let posledni = null, pokusu = 0;
  for (let pokus = 1; pokus <= 1 + opakovani; pokus++) {
    if (signal?.aborted) break;
    let rezerva = 0;
    if (rozpocet) {
      try { rezerva = await rozpocet.rezervuj(c, vstupTokenu, maxTokenu); } catch { rezerva = false; }
      if (rezerva === false) return { ok: false, duvod: "rozpocet", chyba: "Rozpočet AI by se překročil – dotaz neodešel.", pokusu };
    }
    pokusu = pokus;
    pocitadlo.dotazu++;
    const start = Date.now();
    try {
      const r = await sLimitem(casLimitMs, (s) => c.adapter.dotaz({ system, zpravy, maxTokenu, signal: signal ? AbortSignal.any([s, signal]) : s }));
      const stat = { vstup: r?.stat?.vstup || 0, vystup: r?.stat?.vystup || 0, ...(typeof r?.stat?.cena === "number" ? { cena: r.stat.cena } : {}) };
      if (rozpocet) { try { await rozpocet.vyrovnej(c, stat, rezerva); } catch {} }
      const text = String(r?.text || "").trim();
      if (!text) { posledni = Object.assign(new Error("prázdná odpověď"), { status: 204 }); continue; }
      return { ok: true, text, stat, pokusu, ms: Date.now() - start, ...(r?.stat?.model && r.stat.model !== c.model ? { modelPouzity: r.stat.model } : {}) };
    } catch (e) {
      posledni = e;
      if (rozpocet && e?.status >= 400 && e.status <= 599 && e.status !== 504 && e.status !== 422) {
        try { await rozpocet.vyrovnej(c, { vstup: 0, vystup: 0 }, rezerva); } catch {}
      }
      if (signal?.aborted || BEZ_OPAKOVANI.has(e?.status)) break;
    }
  }
  return { ok: false, status: posledni?.status || null, chyba: textChyby(posledni), pokusu };
}

function podkladProPredsedu(zpravy, odpovedi) {
  const zadani = zpravy.map((z) => (z.role === "user" ? z.text : `[dřívější odpověď] ${z.text}`)).join("\n\n");
  return "ZADÁNÍ:\n" + zkrat(zadani, MAX_ZNAKU_ZADANI) +
    "\n\nODPOVĚDI ČLENŮ RADY:\n" + odpovedi.map((v) => `--- ${v.nazev}${v.model ? ` (${v.model})` : ""} ---\n${zkrat(v.text, MAX_ZNAKU_ODPOVEDI)}`).join("\n\n");
}

// zpravy = [{ role: "user" | "assistant", text }] v původním znění – pseudonymizují se zde (jedna mapa
// pro celý dotaz). naUdalost dostává průběh: start → clen (po každém členovi) → predseda → hotovo.
export async function poradaRady({
  zpravy,
  clenove,
  predseda = null,
  pokyn = "",
  system = PRAVIDLA_PRAVDIVOSTI,
  maxTokenu = 3000,
  maxTokenuPredseda = 2500,
  casLimitMs = 90_000,
  opakovani = 1,
  rozpocet = null,
  naUdalost = () => {},
  signal,
  pseudonymizace = vytvorPseudonymizaci(),
} = {}) {
  if (!Array.isArray(zpravy) || !zpravy.length || zpravy.at(-1)?.role !== "user") throw new Error("Rada potřebuje zprávy zakončené dotazem uživatele.");
  if (!Array.isArray(clenove) || !clenove.length) throw new Error("Rada potřebuje aspoň jednoho člena.");
  const [pokynP, ...texty] = pseudonymizace.pseudonymizujVse([String(pokyn || ""), ...zpravy.map((z) => String(z.text ?? ""))]);
  const zpravyP = zpravy.map((z, i) => ({ role: z.role, text: texty[i] }));
  // Modely bez ZDR (Muse) dostanou dotaz jen bez osobních údajů – i bez těch, které pseudonymizace nepozná (jméno bez oslovení, adresa).
  const osobni = pseudonymizace.pocet > 0 || mozneOsobniUdaje([pokyn, ...zpravy.map((z) => z.text)].join("\n")).length > 0;
  const volby = { casLimitMs, opakovani, rozpocet, signal, pocitadlo: { dotazu: 0 } };
  const systemClen = [system, POKYN_CLEN, pokynP && `Role v této úloze:\n${pokynP}`].filter(Boolean).join("\n\n");
  const vstupTokenu = odhadTokenu(systemClen) + odhadTokenuKlienta(JSON.stringify(zpravyP));
  naUdalost({ udalost: "start", clenove: clenove.map(popis), predseda: predseda ? popis(predseda) : null, pseudonymizace: pseudonymizace.souhrn() });

  const vysledky = await Promise.all(clenove.map(async (c) => {
    const v = !c.zdr && osobni
      ? { ...popis(c), ok: false, vynechano: "osobni-udaje", chyba: "Model bez ZDR: dotaz obsahuje osobní údaje, proto mu nebyl poslán." }
      : { ...popis(c), ...(await zavolej(c, systemClen, zpravyP, Math.max(maxTokenu, c.minTokenu || 0), vstupTokenu, volby)) };
    naUdalost({ udalost: "clen", ...v });
    return v;
  }));

  const uspesne = vysledky.filter((v) => v.ok);
  let vyrok = null;
  if (!uspesne.length) {
    vyrok = { ok: false, preskoceno: "Žádný člen rady neodpověděl." };
  } else if (uspesne.length === 1) {
    vyrok = { ok: false, preskoceno: "Odpověděl jen jeden člen rady – není co porovnat." };
  } else if (!predseda) {
    vyrok = { ok: false, preskoceno: "Předseda (Claude) není zapnutý." };
  } else {
    // Předseda; když selže, jednou zastoupí jiný člen se ZDR, který odpověděl.
    const systemP = [system, POKYN_PREDSEDA].join("\n\n");
    const podklad = [{ role: "user", text: podkladProPredsedu(zpravyP, uspesne) }];
    const vstupP = odhadTokenu(systemP) + odhadTokenuKlienta(podklad[0].text);
    const nahradni = clenove.find((c) => c.id !== predseda.id && c.zdr !== false && uspesne.some((v) => v.id === c.id));
    for (const [i, k] of [predseda, nahradni].filter(Boolean).entries()) {
      const r = await zavolej(k, systemP, podklad, maxTokenuPredseda, vstupP, volby);
      if (r.ok) {
        const j = prectiJson(r.text);
        vyrok = { ...popis(k), ok: true, nahradni: i > 0, ...(j || { shoda: [], rozdily: [], doporuceni: "" }), ...(j ? {} : { text: r.text }), stat: r.stat, pokusu: r.pokusu };
        break;
      }
      vyrok = { ...popis(k), ok: false, chyba: r.chyba, nahradni: i > 0 };
    }
  }
  naUdalost({ udalost: "predseda", ...vyrok });

  const vse = [...vysledky, vyrok].filter((v) => v?.stat);
  const stat = {
    vstup: vse.reduce((s, v) => s + v.stat.vstup, 0),
    vystup: vse.reduce((s, v) => s + v.stat.vystup, 0),
    dotazu: volby.pocitadlo.dotazu,
    ...(vse.some((v) => typeof v.stat.cena === "number") ? { cena: vse.reduce((s, v) => s + (v.stat.cena || 0), 0) } : {}),
  };
  const souhrn = pseudonymizace.souhrn();
  naUdalost({ udalost: "hotovo", stat, pseudonymizace: souhrn });
  return { zadani: zpravyP.at(-1).text, clenove: vysledky, predseda: vyrok, pseudonymizace: souhrn, stat };
}
