// Rozcestník „Celý web na jednom místě“ (úkol 56): kontrola a příprava cílů z content/hbot-rozcestnik.json pro
// prohlížeč (klíč „rozcestnik“ v assets/hbot-znalosti.json, generuje scripts/build-hbot.mjs).
// Stejná pravidla kontroluje i panel H-BOTa (assets/hbot-panel.js), který neplatný cíl potichu zahodí; tady se nic
// nezahazuje – build skončí chybou se seznamem problémů, ať je autor opraví.
export const AKCE = ["kalkulace", "zavolat", "otazka"];
export const IKONY = ["cena", "holub360", "standard", "sentinel", "pas", "termin", "poptavka", "telefon", "otazka", "odkaz"];
export const MAX_CILU = 12;
const POLE = ["id", "titul", "popis", "href", "akce", "otazka", "ikona", "hlavni"];
const ZKUSEBNI_PUVOD = "https://hspg.cz";

/** Cesta na tomto webu: začíná „/“ (ne „//“ ani „/\“), bez mezer, řídicích znaků a zpětných lomítek, do 200 znaků.
 *  Odmítne tedy i „//cizi.cz“, „javascript:…“, „https://…“ a „/\t/cizi.cz“ (prohlížeč tabulátor vypustí). */
export function bezpecnaCesta(h) {
  if (typeof h !== "string" || h.length > 200) return false;
  if (!/^\/(?![/\\])[^\s\\]*$/.test(h) || /[\u0000-\u001f\u007f]/.test(h)) return false;
  try { return new URL(h, ZKUSEBNI_PUVOD).origin === ZKUSEBNI_PUVOD; } catch { return false; }
}

/** Česká typografie (KONTEXT §4.9): nezlomitelná mezera po jednopísmenných předložkách a spojkách. */
export function typografie(t) {
  return String(t ?? "").replace(/(^|[\s(„])([vkszaiouVKSZAIOU])\s+/g, "$1$2\u00a0");
}

/** Zkontroluje content/hbot-rozcestnik.json a vrátí cíle pro prohlížeč; při chybě vyhodí Error se všemi problémy. */
export function rozcestnikProProhlizec(data, { firma = {} } = {}) {
  const cile = data && Array.isArray(data.cile) ? data.cile : null;
  if (!cile) throw new Error("content/hbot-rozcestnik.json: chybí seznam „cile“.");
  const chyby = [], videne = new Set(), vystup = [];
  if (cile.length > MAX_CILU) chyby.push(`nejvýš ${MAX_CILU} cílů (je jich ${cile.length})`);
  const doplnit = (t) => String(t ?? "").replace(/\{\{pracovni_doba\}\}/g, firma.pracovni_doba || "").trim();
  cile.forEach((c, i) => {
    const kde = `cíl ${i + 1}${c && typeof c.id === "string" ? ` „${c.id}“` : ""}`;
    if (!c || typeof c !== "object" || Array.isArray(c)) { chyby.push(`${kde}: není objekt`); return; }
    const nezname = Object.keys(c).filter((k) => !POLE.includes(k));
    if (nezname.length) chyby.push(`${kde}: neznámé pole ${nezname.join(", ")}`);
    if (typeof c.id !== "string" || !/^[a-z0-9-]{1,32}$/.test(c.id)) chyby.push(`${kde}: id jen malá písmena bez diakritiky, číslice a pomlčka (1–32 znaků)`);
    else if (videne.has(c.id)) chyby.push(`${kde}: id se opakuje`);
    else videne.add(c.id);
    const titul = doplnit(c.titul), popis = doplnit(c.popis);
    if (!titul || titul.length > 48) chyby.push(`${kde}: titul musí mít 1–48 znaků`);
    if (popis.length > 120) chyby.push(`${kde}: popis nejvýš 120 znaků`);
    if (/\{\{|\}\}/.test(titul + popis)) chyby.push(`${kde}: neznámá šablona {{…}}`);
    const maOdkaz = c.href !== undefined, maAkci = c.akce !== undefined;
    if (maOdkaz === maAkci) chyby.push(`${kde}: zadejte buď href (stránka webu), nebo akci`);
    else if (maOdkaz && !bezpecnaCesta(c.href)) chyby.push(`${kde}: href „${String(c.href).slice(0, 60)}“ musí být cesta na tomto webu (začíná „/“, ne „//“, bez mezer)`);
    else if (maAkci && !AKCE.includes(c.akce)) chyby.push(`${kde}: akce musí být ${AKCE.join(" | ")}`);
    const otazka = typeof c.otazka === "string" ? c.otazka.trim() : "";
    if (c.akce === "otazka" && (!otazka || otazka.length > 200)) chyby.push(`${kde}: akce „otazka“ potřebuje text otázky (1–200 znaků)`);
    if (c.akce !== "otazka" && c.otazka !== undefined) chyby.push(`${kde}: pole „otazka“ patří jen k akci „otazka“`);
    if (c.ikona !== undefined && !IKONY.includes(c.ikona)) chyby.push(`${kde}: ikona musí být ${IKONY.join(" | ")}`);
    if (c.hlavni !== undefined && typeof c.hlavni !== "boolean") chyby.push(`${kde}: hlavni je true, nebo false`);
    vystup.push({
      id: c.id,
      titul: typografie(titul),
      ...(popis ? { popis: typografie(popis) } : {}),
      ...(maOdkaz ? { href: c.href } : { akce: c.akce }),
      ...(c.akce === "otazka" ? { otazka } : {}),
      ...(c.ikona ? { ikona: c.ikona } : {}),
      ...(c.hlavni ? { hlavni: true } : {}),
    });
  });
  if (chyby.length) throw new Error(`content/hbot-rozcestnik.json – oprav prosím:\n- ${chyby.join("\n- ")}`);
  return vystup;
}
