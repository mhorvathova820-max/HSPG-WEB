// Rezervace z plánovače (Netlify Forms „hspg-rezervace“ → submission-created). Do Blobs se ukládá jen to,
// co potřebuje kalendář majitele (termín, obec, služba, kupon) – jméno, telefon a adresa zůstávají
// v Netlify Forms a v e-mailu. Záznam se po termínu + 30 dnech maže (uklidRezervaci).
import { normalizujKod } from "./kupony.mjs";

export const FORMULAR = "hspg-rezervace";
const PREFIX = "rezervace/";
const DATUM_RE = /^\d{4}-\d{2}-\d{2}$/;

const pole = (data, ...nazvy) => {
  for (const n of nazvy) {
    const v = data?.[n];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
};
const platneDatum = (s) => (DATUM_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) ? s : "");

// payload z Netlify → rezervace (nebo null, když to není rezervace z plánovače).
export function zPayloadu(payload) {
  const data = payload?.data || {};
  const formular = payload?.form_name || data["form-name"];
  if (formular !== FORMULAR) return null;
  const id = String(payload?.id || "").replace(/[^A-Za-z0-9]/g, "").slice(-12) || null;
  const kupon = pole(data, "Kód kuponu", "kupon");
  return {
    id,
    cislo: id ? id.slice(-6).toUpperCase() : "—",
    termin: platneDatum(pole(data, "Termín", "termin")),
    nahradni: platneDatum(pole(data, "Náhradní termín", "nahradni")),
    obec: pole(data, "Obec", "obec").slice(0, 80),
    sluzba: pole(data, "Služba", "sluzba").slice(0, 80),
    kupon: kupon ? normalizujKod(kupon) || kupon.slice(0, 20) : "",
    vytvoreno: payload?.created_at || new Date().toISOString(),
  };
}

export async function ulozRezervaci(ul, r, kuponVysledek) {
  if (!r?.id || !r.termin) return false;
  const z = await ul.setJSON(PREFIX + r.id, { ...r, kuponOk: kuponVysledek?.ok ?? null }, { onlyIfNew: true });
  return z?.modified === true;
}

// Rezervace s termínem v [od, do] (RRRR-MM-DD); zároveň smaže záznamy starší než termín + 30 dní.
export async function rezervaceVObdobi(ul, od, do_, ted = Date.now()) {
  const { blobs = [] } = await ul.list({ prefix: PREFIX });
  const mez = new Date(ted - 30 * 864e5).toISOString().slice(0, 10);
  const vysledek = [];
  for (const b of blobs.slice(0, 1000)) {
    const r = await ul.get(b.key, { type: "json" });
    if (!r) continue;
    const posledni = r.nahradni && r.nahradni > r.termin ? r.nahradni : r.termin;
    if (posledni < mez) {
      try { await ul.delete(b.key); } catch { /* smaže se při dalším čtení */ }
      continue;
    }
    if ((r.termin >= od && r.termin <= do_) || (r.nahradni && r.nahradni >= od && r.nahradni <= do_)) vysledek.push(r);
  }
  return vysledek.sort((a, b) => (a.termin < b.termin ? -1 : 1));
}
