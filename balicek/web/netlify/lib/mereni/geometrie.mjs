// Měření budovy (úkol 23) – čistá geometrie v metrech (lokální rovina: x = východ, y = sever).
// Výsledek je schéma z mapových podkladů, ne geodetické zaměření.

const st = (rad) => (rad * 180) / Math.PI;
// Česká čísla: desetinná čárka, nezlomitelná mezera před jednotkou.
export const cz = (x, jednotka = "") => `${Number(x).toLocaleString("cs-CZ", { maximumFractionDigits: 1 })}${jednotka ? `\u00a0${jednotka}` : ""}`;
const r2 = (x) => Math.round(x * 100) / 100;
const r1 = (x) => Math.round(x * 10) / 10;

export function plochaZnam(body) {
  let s = 0;
  for (let i = 0; i < body.length; i++) {
    const [x1, y1] = body[i], [x2, y2] = body[(i + 1) % body.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}
export const plocha = (body) => Math.abs(plochaZnam(body));
export function obvod(body) {
  let s = 0;
  for (let i = 0; i < body.length; i++) s += Math.hypot(body[(i + 1) % body.length][0] - body[i][0], body[(i + 1) % body.length][1] - body[i][1]);
  return s;
}
export function vPolygonu([x, y], body) {
  let c = false;
  for (let i = 0, j = body.length - 1; i < body.length; j = i++) {
    const [xi, yi] = body[i], [xj, yj] = body[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function vzdalenostOdHrany([x, y], body) {
  let min = Infinity;
  for (let i = 0; i < body.length; i++) {
    const [ax, ay] = body[i], [bx, by] = body[(i + 1) % body.length];
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
    min = Math.min(min, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
  }
  return min;
}

// Vnější prstenec bez opakovaného posledního bodu, proti směru hodinových ručiček.
export function normalizujPrstenec(body) {
  let b = body.map(([x, y]) => [Number(x), Number(y)]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y));
  if (b.length > 1 && b[0][0] === b.at(-1)[0] && b[0][1] === b.at(-1)[1]) b = b.slice(0, -1);
  return plochaZnam(b) < 0 ? b.reverse() : b;
}

const ORIENTACE = ["S", "SV", "V", "JV", "J", "JZ", "Z", "SZ"];
// Strana obíhaná proti směru hodin má vnější normálu vpravo: (dy, -dx). Azimut normály = kam fasáda „kouká“.
function orientaceFasady(dx, dy) {
  const az = (st(Math.atan2(dy, -dx)) + 360) % 360; // azimut od severu po směru hodin
  return { azimut: Math.round(az), orientace: ORIENTACE[Math.round(az / 45) % 8] };
}

// Strany obrysu: sloučí téměř přímé lomy (< 8°) a velmi krátké úseky (< 0,4 m) do sousedních stran.
export function strany(body) {
  const n = body.length;
  const seg = [];
  for (let i = 0; i < n; i++) {
    const a = body[i], b = body[(i + 1) % n];
    seg.push({ od: i, a, b, dx: b[0] - a[0], dy: b[1] - a[1] });
  }
  const sm = (s) => Math.atan2(s.dy, s.dx);
  const sloucene = [];
  for (const s of seg) {
    const p = sloucene.at(-1);
    const delka = Math.hypot(s.dx, s.dy);
    if (p && (delka < 0.4 || Math.abs(((sm(p) - sm(s) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) < (8 * Math.PI) / 180)) {
      p.b = s.b; p.dx = p.b[0] - p.a[0]; p.dy = p.b[1] - p.a[1];
    } else sloucene.push({ ...s });
  }
  if (sloucene.length > 2) {
    const f = sloucene[0], l = sloucene.at(-1);
    if (Math.abs(((sm(l) - sm(f) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) < (8 * Math.PI) / 180) {
      f.a = l.a; f.dx = f.b[0] - f.a[0]; f.dy = f.b[1] - f.a[1]; sloucene.pop();
    }
  }
  return sloucene.map((s, i) => ({ strana: i + 1, delka: r2(Math.hypot(s.dx, s.dy)), ...orientaceFasady(s.dx, s.dy), od: s.a.map(r2), do: s.b.map(r2) }));
}

// Obdélník s nejmenší plochou kolem obrysu (rotující kalipery přes strany konvexního obalu).
function konvexniObal(body) {
  const p = [...body].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const kriz = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const dolni = [], horni = [];
  for (const q of p) { while (dolni.length >= 2 && kriz(dolni.at(-2), dolni.at(-1), q) <= 0) dolni.pop(); dolni.push(q); }
  for (const q of [...p].reverse()) { while (horni.length >= 2 && kriz(horni.at(-2), horni.at(-1), q) <= 0) horni.pop(); horni.push(q); }
  return dolni.slice(0, -1).concat(horni.slice(0, -1));
}
export function obdelnik(body) {
  const h = konvexniObal(body);
  let nej = null;
  for (let i = 0; i < h.length; i++) {
    const [ax, ay] = h[i], [bx, by] = h[(i + 1) % h.length];
    const u = Math.atan2(by - ay, bx - ax), c = Math.cos(u), s = Math.sin(u);
    let minA = Infinity, maxA = -Infinity, minB = Infinity, maxB = -Infinity;
    for (const [x, y] of h) {
      const a = x * c + y * s, b = -x * s + y * c;
      minA = Math.min(minA, a); maxA = Math.max(maxA, a); minB = Math.min(minB, b); maxB = Math.max(maxB, b);
    }
    const pl = (maxA - minA) * (maxB - minB);
    if (!nej || pl < nej.pl) nej = { pl, u, minA, maxA, minB, maxB };
  }
  let { u, minA, maxA, minB, maxB } = nej;
  // Delší strana = osa „podél“ (směr hřebene u sedlové střechy).
  if (maxB - minB > maxA - minA) { [minA, maxA, minB, maxB] = [minB, maxB, -maxA, -minA]; u += Math.PI / 2; }
  return { delka: maxA - minA, sirka: maxB - minB, uhel: u, minA, maxA, minB, maxB };
}

// Body pro výškopis: mřížka v obdélníku, jen uvnitř obrysu a aspoň 1,2 m od zdi (pixel výškopisu je 2 m).
export function bodyVzorku(body, max = 12) {
  const o = obdelnik(body);
  const c = Math.cos(o.uhel), s = Math.sin(o.uhel);
  const out = [];
  for (const fb of [0.12, 0.3, 0.5, 0.7, 0.88]) {
    for (const fa of [0.25, 0.5, 0.75]) {
      const a = o.minA + fa * (o.maxA - o.minA), b = o.minB + fb * (o.maxB - o.minB);
      const p = [a * c - b * s, a * s + b * c];
      if (vPolygonu(p, body) && vzdalenostOdHrany(p, body) >= 1.2) out.push({ bod: p, napric: b - (o.minB + o.maxB) / 2 });
    }
  }
  return { body: out.slice(0, max), obdelnik: o };
}

// Výšky z rozdílu DMP 1G (povrch) a DMR 5G (terén) v bodech uvnitř budovy → okap, hřeben, sklon, tvar.
// vzorky: [{ napric (m od osy podél delší strany), povrch, teren }]
export function vyskyZVzorku(vzorky, obd) {
  const v = vzorky.filter((x) => Number.isFinite(x.povrch) && Number.isFinite(x.teren)).map((x) => ({ ...x, h: x.povrch - x.teren }));
  if (v.length < 3) return null;
  const teren = median(v.map((x) => x.teren));
  const hs = v.map((x) => x.h);
  const rozsah = Math.max(...hs) - Math.min(...hs);
  if (Math.max(...hs) < 2) return { neodpovida: true, teren }; // výškopis budovu nezná (stavba po skenování 2009–2013?)
  if (rozsah < 1) return { tvar: "plochá", okap: r1(median(hs)), hreben: r1(median(hs)), sklon: 0, teren, bodu: v.length };
  // Sedlová (nebo valbová) střecha s hřebenem podél delší strany: h = hreben − tg(sklon) · |napříč|.
  const xs = v.map((x) => Math.abs(x.napric)), mx = mean(xs), my = mean(hs);
  let sxx = 0, sxy = 0;
  for (let i = 0; i < v.length; i++) { sxx += (xs[i] - mx) ** 2; sxy += (xs[i] - mx) * (hs[i] - my); }
  const b = sxx > 0 ? sxy / sxx : 0;
  // Části různé výšky (např. křídla budovy): fasády se počítají s mediánem, rozsah se vrací zvlášť.
  if (b >= -0.05) return { tvar: "nepravidelná", okap: r1(median(hs)), hreben: r1(Math.max(...hs)), sklon: null, rozsahVysek: [r1(Math.min(...hs)), r1(Math.max(...hs))], teren, bodu: v.length };
  const hreben = my - b * mx;
  const okap = hreben + b * (obd.sirka / 2);
  return { tvar: "sedlová", okap: r1(Math.max(0, okap)), hreben: r1(hreben), sklon: Math.round(st(Math.atan(-b))), teren, bodu: v.length };
}
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

// Odhad z počtu podlaží (když výškopis nejde použít): 3,0 m na podlaží + 0,5 m sokl; střecha neznámá.
export function vyskyZPodlazi(podlazi) {
  const n = Number(podlazi);
  if (!(n >= 1 && n <= 60)) return null;
  return { tvar: "neurčeno", okap: r1(n * 3 + 0.5), hreben: null, sklon: null, odhadZPodlazi: true };
}

// Strany, které leží na hranici sousední budovy (řadové domy) = společná zeď, ne fasáda.
// sousede: prstence v lokálních metrech. Strana je společná, když její střed i čtvrtiny leží do 0,5 m od souseda.
export function oznacSpolecne(strany, sousede) {
  if (!sousede?.length) return strany;
  const blizko = (p) => sousede.some((r) => vzdalenostOdHrany(p, r) <= 0.5);
  return strany.map((x) => {
    const bod = (f) => [x.od[0] + f * (x.do[0] - x.od[0]), x.od[1] + f * (x.do[1] - x.od[1])];
    return [0.25, 0.5, 0.75].every((f) => blizko(bod(f))) ? { ...x, spolecnaZed: true } : x;
  });
}

// Celý výpočet z obrysu (lokální metry) a výšek. presnostObrysuM = střední polohová chyba zdroje (RÚIAN/KN ~0,2 m, OSM ~1 m).
export function spocitej(body, vysky, { presnostObrysuM = 0.2, presnostVyskyM = null, sousede = [] } = {}) {
  const b = normalizujPrstenec(body);
  const A = plocha(b), O = obvod(b);
  const s = oznacSpolecne(strany(b), sousede);
  const obd = obdelnik(b);
  const okap = vysky?.okap ?? null;
  const sklon = vysky?.sklon;
  const fasady = s.map((x) => ({ strana: x.strana, orientace: x.orientace, delka: x.delka, vyska: okap, ...(x.spolecnaZed ? { spolecnaZed: true } : {}), plocha: okap == null || x.spolecnaZed ? (x.spolecnaZed ? 0 : null) : r1(x.delka * okap) }));
  // Štíty sedlové střechy: trojúhelníky na dvou kratších stranách obdélníku (přidají se ke dvěma nejkratším čelům).
  let stity = 0;
  if (vysky?.tvar === "sedlová" && vysky.hreben > okap) stity = 2 * (obd.sirka * (vysky.hreben - okap)) / 2;
  const strechaPlocha = sklon == null ? null : r1(A / Math.cos((sklon * Math.PI) / 180));
  const presnostPlochy = Math.round(((O * presnostObrysuM) / A) * 1000) / 10;
  return {
    pudorys: {
      body: b.map(([x, y]) => [r2(x), r2(y)]),
      plocha: r1(A), obvod: r1(O), strany: s,
      obdelnik: { delka: r2(obd.delka), sirka: r2(obd.sirka), natoceni: Math.round((st(obd.uhel) + 360) % 180) },
    },
    vysky: vysky ? { ...vysky } : null,
    fasady,
    fasadyCelkem: okap == null ? null : r1(fasady.reduce((x, f) => x + f.plocha, 0) + stity),
    stity: stity ? r1(stity) : 0,
    strecha: { tvar: vysky?.tvar || "neurčeno", sklon: sklon ?? null, plochaPudorysu: r1(A), plocha: strechaPlocha, bezPresahu: true },
    model3d: {
      podstava: b.map(([x, y]) => [r2(x), r2(y)]), vyskaOkapu: okap, vyskaHrebene: vysky?.hreben ?? okap,
      smerHrebene: vysky?.tvar === "sedlová" ? Math.round((st(obd.uhel) + 360) % 180) : null,
    },
    presnost: {
      plochaProcent: presnostPlochy,
      vyska: presnostVyskyM != null ? `±${cz(presnostVyskyM, "m")} (střední chyba výškopisu DMP 1G 0,4 m a DMR 5G 0,18 m, rastr 2 m)` : vysky?.odhadZPodlazi ? "±15 % (odhad z počtu podlaží: 3 m na podlaží + 0,5 m sokl)" : null,
      predpoklady: `předpoklad polohové chyby obrysu ${cz(presnostObrysuM, "m")}; plocha střechy bez přesahů a vikýřů; společné zdi se sousedy nejsou fasáda`,
    },
  };
}
