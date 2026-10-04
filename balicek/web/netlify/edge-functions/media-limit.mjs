// Brzda rychlého stahování videí a obrázků z /media/ (přenos dat stojí 20 kreditů za GB). Běžná návštěva
// stáhne desítky souborů; rychlá smyčka (> 100 požadavků / min z jedné IP a domény) dostane 429.
// Pomalé stahování z jedné IP pravidlo NEzastaví (~100 GB/den ≈ 2 000 kreditů) – proti tomu chrání
// auto-recharge a hlídání přenosu dat (úkol 15). Přísnější limit by rozbil úvodní stránku.
// Pravidlo Netlify v kódu (tarif Personal: max. 2 na projekt – druhé má /api/asistent).
export default async (req, context) => context.next();

export const config = {
  path: "/media/*",
  rateLimit: { windowLimit: 100, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
