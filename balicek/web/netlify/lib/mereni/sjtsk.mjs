// S-JTSK (EPSG:5514, Křovák East-North) → WGS84: inverzní Křovák + Helmert (7 parametrů). Bez závislostí.
// Přesnost ~1e-4° proti GeoNames (ověřeno při sestavení seznamu obcí).
const rad = (x) => (x * Math.PI) / 180;
const a = 6377397.155, f = 1 / 299.1528128, e2 = 2 * f - f * f, e = Math.sqrt(e2);
const phic = rad(49.5), lam0 = rad(24 + 50 / 60), alphac = rad(30 + 17 / 60 + 17.30311 / 3600), phip = rad(78.5), kp = 0.9999;
const A = (a * Math.sqrt(1 - e2)) / (1 - e2 * Math.sin(phic) ** 2);
const B = Math.sqrt(1 + (e2 * Math.cos(phic) ** 4) / (1 - e2));
const g0 = Math.asin(Math.sin(phic) / B);
const t0 = (Math.tan(Math.PI / 4 + g0 / 2) * ((1 + e * Math.sin(phic)) / (1 - e * Math.sin(phic))) ** ((e * B) / 2)) / Math.tan(Math.PI / 4 + phic / 2) ** B;
const n = Math.sin(phip), r0 = (kp * A) / Math.tan(phip);

export function sjtskNaWgs84(E, N) {
  const X = -N, Y = -E;
  const r = Math.hypot(X, Y), th = Math.atan2(Y, X), D = th / Math.sin(phip);
  const T = 2 * (Math.atan((r0 / r) ** (1 / n) * Math.tan(Math.PI / 4 + phip / 2)) - Math.PI / 4);
  const U = Math.asin(Math.cos(alphac) * Math.sin(T) - Math.sin(alphac) * Math.cos(T) * Math.cos(D));
  const V = Math.asin((Math.cos(T) * Math.sin(D)) / Math.cos(U));
  let phi = U;
  for (let i = 0; i < 10; i++) {
    phi = 2 * (Math.atan(t0 ** (-1 / B) * Math.tan(U / 2 + Math.PI / 4) ** (1 / B) * ((1 + e * Math.sin(phi)) / (1 - e * Math.sin(phi))) ** (e / 2)) - Math.PI / 4);
  }
  const lam = lam0 - V / B;
  // Bessel → ECEF → Helmert (7 parametrů, S-JTSK → WGS84) → WGS84
  const Nn = a / Math.sqrt(1 - e2 * Math.sin(phi) ** 2);
  const x = Nn * Math.cos(phi) * Math.cos(lam), y = Nn * Math.cos(phi) * Math.sin(lam), z = Nn * (1 - e2) * Math.sin(phi);
  const [tx, ty, tz, s] = [570.8, 85.7, 462.8, 3.56e-6];
  const [rx, ry, rz] = [4.998, 1.587, 5.261].map((v) => rad(v / 3600));
  const x2 = tx + (1 + s) * (x - rz * y + ry * z), y2 = ty + (1 + s) * (rz * x + y - rx * z), z2 = tz + (1 + s) * (-ry * x + rx * y + z);
  const aw = 6378137.0, fw = 1 / 298.257223563, ew2 = 2 * fw - fw * fw;
  const lon = Math.atan2(y2, x2), p = Math.hypot(x2, y2);
  let lat = Math.atan2(z2, p * (1 - ew2));
  for (let i = 0; i < 10; i++) { const Nw = aw / Math.sqrt(1 - ew2 * Math.sin(lat) ** 2); lat = Math.atan2(z2 + ew2 * Nw * Math.sin(lat), p); }
  return [(lat * 180) / Math.PI, (lon * 180) / Math.PI];
}
