// GET /api/ai-stav – ověří heslo a vrátí, které AI mají vložený klíč (klíče samotné nikdy).
import { POSKYTOVATELE, jeZapnuty, overHeslo, json, pockej } from "../lib/spolecne.mjs";

export default async (req) => {
  const heslo = overHeslo(req);
  if (!heslo.ok) {
    await pockej(1500);
    return json({ chyba: heslo.duvod }, 401);
  }
  const ai = Object.entries(POSKYTOVATELE).map(([id, p]) => ({
    id,
    nazev: p.nazev,
    zapnuto: jeZapnuty(id),
    model: p.model(),
    klic: p.klic,
  }));
  return json({ ai });
};

export const config = { path: "/api/ai-stav" };
