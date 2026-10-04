// Hráz proti hromadnému stahování videí a obrázků z /media/ (útok na kredity: přenos dat stojí
// 20 kreditů za GB). Běžná návštěva stáhne desítky souborů; skript, který stahuje dokola, dostane 429.
// Pravidlo Netlify v kódu (tarif Personal: max. 2 na projekt – druhé má /api/asistent).
export default async (req, context) => context.next();

export const config = {
  path: "/media/*",
  rateLimit: { windowLimit: 100, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
