// Lovec SVJ (úkol 24) – veřejné zdroje: ARES (MF ČR) a veřejné weby SVJ / správců.
// Pravidla: jen právnické osoby (SVJ 145, družstva 205) a kontakty zveřejněné pro SVJ nebo správce; žádné
// osobní údaje obyvatel; robots.txt se respektuje; weby za přihlášením se nečtou; nic se nedoplňuje odhadem.

export const ARES = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest";
const UA = "hspg.cz lovec-svj/1.0 (+https://hspg.cz; info@hspg.cz)";
export const ZDROJ_ARES = { nazev: "ARES – Administrativní registr ekonomických subjektů (MF ČR)", odkaz: "https://ares.gov.cz/" };

async function fetchSLimitem(fetchFn, url, init = {}, ms = 10_000) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  try { return await fetchFn(url, { ...init, signal: ac.signal, headers: { "user-agent": UA, ...(init.headers || {}) } }); }
  finally { clearTimeout(t); }
}

// SVJ (145) a volitelně bytová družstva (205) se sídlem v obci (kód obce RÚIAN). ARES vrací nejvýš 1 000 výsledků
// na dotaz – u velkých měst (Praha, Brno…) vrátí chybu „příliš mnoho“ → volající ohlásí, že je třeba užší výběr.
export async function hledejSubjekty(fetchFn, { kodObce, pravniFormy = ["145"], start = 0, pocet = 25 }) {
  const r = await fetchSLimitem(fetchFn, `${ARES}/ekonomicke-subjekty/vyhledat`, {
    method: "POST", headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ pravniForma: pravniFormy, sidlo: { kodObce: Number(kodObce) }, start, pocet: Math.min(100, pocet) }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (j?.kod === "CHYBA_VSTUPU" && /příliš mnoho/i.test(j?.popis || "")) throw Object.assign(new Error("ARES: příliš mnoho výsledků"), { kod: "prilis-mnoho" });
    throw Object.assign(new Error(`ARES: HTTP ${r.status}`), { status: r.status });
  }
  return {
    celkem: j.pocetCelkem ?? 0,
    subjekty: (j.ekonomickeSubjekty || []).filter((e) => !e.datumZaniku).map((e) => ({
      ico: String(e.ico), nazev: e.obchodniJmeno, pravniForma: String(e.pravniForma),
      sidlo: e.sidlo?.textovaAdresa || "", kodAdresnihoMista: e.sidlo?.kodAdresnihoMista || null,
      ulice: e.sidlo?.nazevUlice || "", cisloDomovni: e.sidlo?.cisloDomovni || null, obec: e.sidlo?.nazevObce || "",
    })),
  };
}

const velka = (s) => String(s || "").toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase());
// Předseda výboru z veřejného rejstříku – JEN jméno a funkce pro oslovení v dopise. Datum narození a bydliště,
// které ARES u fyzických osob vrací, se zahodí hned tady a nikam se neukládají.
export async function predsedaVyboru(fetchFn, ico) {
  const r = await fetchSLimitem(fetchFn, `${ARES}/ekonomicke-subjekty-vr/${encodeURIComponent(ico)}`, { headers: { accept: "application/json" } });
  if (!r.ok) return null;
  const j = await r.json().catch(() => null);
  const z = (j?.zaznamy || []).find((x) => x.primarniZaznam) || j?.zaznamy?.[0];
  for (const o of z?.statutarniOrgany || []) {
    for (const c of o.clenoveOrganu || []) {
      const funkce = c.clenstvi?.funkce?.nazev || "";
      if (c.datumVymazu || !/^předseda/i.test(funkce)) continue;
      const fo = c.fyzickaOsoba;
      if (!fo?.prijmeni) continue;
      return { osloveni: [fo.titulPredJmenem, velka(fo.jmeno), velka(fo.prijmeni), fo.titulZaJmenem].filter(Boolean).join(" "), funkce, zdroj: "veřejný rejstřík (ARES)" };
    }
  }
  return null;
}

// --- veřejné weby -------------------------------------------------------------------------------------
// Ochrana před zneužitím adres od AI (SSRF): jen https/http na veřejné doméně, žádné IP adresy ani interní jména.
export function bezpecnaAdresa(u) {
  let url;
  try { url = new URL(u); } catch { return null; }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) return null;
  const h = url.hostname.toLowerCase();
  if (!h.includes(".") || /^[\d.]+$/.test(h) || h.includes(":") || /(^|\.)(localhost|local|internal|lan|home|netlify)$/.test(h) || h.endsWith(".netlify.app")) return null;
  url.hash = "";
  return url;
}

// robots.txt (RFC 9309): skupina pro náš User-Agent, jinak „*“; nejdelší shoda Allow/Disallow vyhrává.
// 4xx = bez omezení, 5xx nebo nedostupné = vše zakázáno (konzervativně).
export async function robotsPovoli(fetchFn, url, mezipamet = new Map()) {
  const zaklad = `${url.protocol}//${url.host}`;
  if (!mezipamet.has(zaklad)) {
    mezipamet.set(zaklad, (async () => {
      try {
        const r = await fetchSLimitem(fetchFn, `${zaklad}/robots.txt`, {}, 5_000);
        if (r.status >= 400 && r.status < 500) return [];
        if (!r.ok) return null;
        return parsujRobots(await r.text());
      } catch { return null; }
    })());
  }
  const pravidla = await mezipamet.get(zaklad);
  if (pravidla === null) return false;
  const cesta = url.pathname + url.search;
  let nej = null;
  for (const p of pravidla) {
    if (p.cesta && cesta.startsWith(p.cesta) && (!nej || p.cesta.length > nej.cesta.length || (p.cesta.length === nej.cesta.length && p.povolit))) nej = p;
  }
  return !nej || nej.povolit;
}
export function parsujRobots(text) {
  const skupiny = [];
  let akt = null, vPravidlech = false;
  for (const r0 of String(text).split(/\r?\n/)) {
    const r = r0.replace(/#.*/, "").trim();
    const m = r.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const [, k, v] = [null, m[1].toLowerCase(), m[2].trim()];
    if (k === "user-agent") {
      if (!akt || vPravidlech) { akt = { agenti: [], pravidla: [] }; skupiny.push(akt); vPravidlech = false; }
      akt.agenti.push(v.toLowerCase());
    } else if ((k === "allow" || k === "disallow") && akt) {
      vPravidlech = true;
      akt.pravidla.push({ povolit: k === "allow", cesta: v });
    }
  }
  const nase = skupiny.find((s) => s.agenti.some((a) => a !== "*" && "hspg.cz lovec-svj".includes(a)));
  return (nase || skupiny.find((s) => s.agenti.includes("*")))?.pravidla || [];
}

export function textZHtml(html) {
  return String(html)
    .replace(/<(script|style|noscript|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/[ \t ]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();
}

// Stažení stránky: jen text/HTML do 1,5 MB, nejvýš 3 přesměrování (každé znovu ověřené), žádné přihlášení.
export async function stahniStranku(fetchFn, adresa, robotsMez) {
  let url = bezpecnaAdresa(adresa);
  for (let i = 0; url && i < 4; i++) {
    if (!(await robotsPovoli(fetchFn, url, robotsMez))) return { duvod: "robots.txt zakazuje" };
    const r = await fetchSLimitem(fetchFn, url.href, { redirect: "manual", headers: { accept: "text/html,text/plain" } }, 8_000);
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { url = bezpecnaAdresa(new URL(r.headers.get("location"), url).href); continue; }
    if (r.status === 401 || r.status === 403) return { duvod: "stránka vyžaduje přihlášení" };
    if (!r.ok) return { duvod: `HTTP ${r.status}` };
    if (!/text\/html|text\/plain|application\/xhtml/i.test(r.headers.get("content-type") || "text/html")) return { duvod: "není to webová stránka" };
    const html = await r.text();
    if (html.length > 1_500_000) return { duvod: "stránka je příliš velká" };
    if (/<input[^>]+type=["']?password/i.test(html)) return { duvod: "stránka vyžaduje přihlášení" };
    return { url: url.href, text: textZHtml(html) };
  }
  return { duvod: "neplatná nebo nepovolená adresa" };
}

// Je kontakt na stránce doslova? E-mail přesně (bez ohledu na velikost písmen), telefon jako 9 číslic (+420 volitelně).
export function najdiNaStrance(text, typ, hodnota) {
  if (typ === "email") {
    const e = String(hodnota).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(e)) return -1;
    return text.toLowerCase().indexOf(e);
  }
  if (typ === "telefon") {
    const cil = String(hodnota).replace(/\D/g, "").replace(/^(00)?420/, "");
    if (!/^\d{9}$/.test(cil)) return -1;
    const re = /(?:\+?420[\s .-]?)?\d{3}[\s .-]?\d{3}[\s .-]?\d{3}/g;
    for (const m of text.matchAll(re)) if (m[0].replace(/\D/g, "").replace(/^420/, "") === cil) return m.index;
    return -1;
  }
  return -1;
}
// Řádek (odstavec) stránky, ve kterém kontakt stojí – podle něj se posuzuje, komu kontakt patří.
export function radekKolem(text, idx) {
  const z = text.lastIndexOf("\n", idx) + 1;
  const k = text.indexOf("\n", idx);
  return text.slice(z, k < 0 ? text.length : k).slice(0, 400);
}
export const citace = (text, idx, okraj = 140) => text.slice(Math.max(0, idx - okraj), idx + okraj).replace(/\s+/g, " ").trim();

// Stránka patří tomuto SVJ: IČO, nebo ulice + číslo domovní, nebo „čp. N“ s obcí.
export function patriSVJ(text, s) {
  const t = text.toLowerCase().replace(/\s+/g, " ");
  if (s.ico && t.replace(/\s/g, "").includes(s.ico)) return true;
  const cp = s.cisloDomovni ? String(s.cisloDomovni) : null;
  if (cp && s.ulice && new RegExp(`${s.ulice.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*${cp}\\b`).test(t)) return true;
  if (cp && s.obec && new RegExp(`(č\\.\\s*p\\.|čp\\.?)\\s*${cp}\\b`).test(t) && t.includes(s.obec.toLowerCase())) return true;
  return false;
}
// Okolí kontaktu musí mluvit o SVJ, výboru nebo správci; ne o konkrétním bytě nebo obyvateli.
export const ROLE_RE = /(společenstv|svj\b|výbor|předsed|správ[ac]|správce|kontakt pro|kancelář)/i;
export const OBYVATEL_RE = /(byt\s*(č\.|číslo)|vlastník bytu|nájemník|nájemce bytu|obyvatel)/i;
