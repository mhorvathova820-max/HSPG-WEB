/* HOLUB 360 · scéna (ES modul). Three.js r184 z vlastní kopie assets/vendor/three/ (žádné CDN).
 *
 * vytvorPrulet(host, { mobil })  – digitální průlet nad stylizovanou Starou Prahou v hero: Týnský chrám,
 *   sv. Vít na hradním návrší, Staroměstská mostecká věž, Karlův most přes Vltavu, Petřínská rozhledna,
 *   tisíce střech (InstancedMesh), zlaté hrany, mlha a úsvitová zlatá záře; kamera pomalu po spline.
 * vytvorModel(host, { obrys, staticky, mobil }) – ILUSTRAČNÍ model domu z obrysu (ne zaměření): výška je pevná
 *   a z měření se nebere; zlatý skenovací laser, štětec Před/Po, u cesty A perlící a stékající kapky,
 *   u cesty B přebarvení střechy a fasády zvoleným odstínem.
 * Výkon: smyčka běží jen při viditelném prvku a otevřené kartě; mobil má méně instancí a nižší rozlišení.
 * Měřítko: 1 jednotka = 10 m (Praha), u modelu domu 1 jednotka = 1 m.
 */
import * as THREE from "./vendor/three/three.module.min.js";
import { OrbitControls } from "./vendor/three/OrbitControls.js";

const ZLATA = 0xd4af37;
const MLHA = 0x241e2b;
const SLUNCE = new THREE.Vector3(0.74, 0.08, -0.67).normalize(); // svítání od severovýchodu
const vec3 = (hex) => `vec3(${[16, 8, 0].map((b) => (((hex >> b) & 255) / 255).toFixed(4)).join(", ")})`;
// Záře úsvitu v prostoru sRGB – stejný vzorec pro oblohu i pro mlhu, aby obzor nebyl ostrý.
const ZARE_GLSL = `const vec3 HSPG_SLUNCE = vec3(${SLUNCE.x.toFixed(4)}, ${SLUNCE.y.toFixed(4)}, ${SLUNCE.z.toFixed(4)});
const vec3 HSPG_ZARE = ${vec3(0xf0b85c)};
vec3 hspgZare(vec3 d) { float s = max(dot(d, HSPG_SLUNCE), 0.0); float pas = 1.0 - smoothstep(0.0, 0.42, max(d.y, 0.0));
  return HSPG_ZARE * (pow(s, 3.0) * 0.14 + pow(s, 14.0) * 0.3 + pow(s, 160.0) * 0.75) * pas; }`;
// Mlha s teplou září ve směru slunce (úprava chunků Three.js jen pro tuto scénu – model domu mlhu nemá).
function upravMlhu() {
  const c = THREE.ShaderChunk;
  if (c.fog_vertex.includes("vHspgSmer")) return;
  c.fog_pars_vertex = c.fog_pars_vertex.replace("#ifdef USE_FOG", "#ifdef USE_FOG\n\tvarying vec3 vHspgSmer;");
  c.fog_vertex = c.fog_vertex.replace("#ifdef USE_FOG", "#ifdef USE_FOG\n\tvHspgSmer = transpose( mat3( viewMatrix ) ) * mvPosition.xyz;");
  c.fog_pars_fragment = c.fog_pars_fragment.replace("#ifdef USE_FOG", `#ifdef USE_FOG\n\tvarying vec3 vHspgSmer;\n${ZARE_GLSL}`);
  c.fog_fragment = c.fog_fragment.replace("gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );",
    "gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor + hspgZare( normalize( vHspgSmer ) ), fogFactor );");
}

// ------------------------------------------------------------------ společné
function nahodne(seed = 1) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function vytvorRenderer(host, { mobil, alfa = false }) {
  const r = new THREE.WebGLRenderer({ antialias: !mobil, alpha: alfa, powerPreference: "high-performance" });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobil ? 1.5 : 2));
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.2;
  const c = r.domElement;
  c.setAttribute("aria-hidden", "true");
  c.tabIndex = -1;
  host.append(c);
  return r;
}

// Smyčka, která běží jen když je prvek vidět a karta otevřená; při změně velikosti přepočítá kameru.
function smycka(host, renderer, camera, krok, { stale = true } = {}) {
  let bezi = false, viditelne = true, pauza = false, id = 0, posledni = 0;
  const velikost = () => {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const snimek = (t) => {
    id = 0;
    const dt = posledni ? Math.min(0.1, (t - posledni) / 1000) : 0.016;
    posledni = t;
    krok(dt, t / 1000);
    if (bezi) id = requestAnimationFrame(snimek);
  };
  const spust = () => {
    const ma = stale && viditelne && !pauza && document.visibilityState !== "hidden";
    if (ma && !bezi) { bezi = true; posledni = 0; id = requestAnimationFrame(snimek); }
    else if (!ma && bezi) { bezi = false; if (id) cancelAnimationFrame(id); id = 0; }
  };
  velikost();
  const ro = new ResizeObserver(() => { velikost(); if (!bezi) krok(0, performance.now() / 1000); });
  ro.observe(host);
  const io = new IntersectionObserver((z) => { viditelne = z.some((x) => x.isIntersecting); spust(); }, { rootMargin: "120px" });
  io.observe(host);
  return {
    spust,
    vykresli: () => krok(0, performance.now() / 1000),
    pauza() { pauza = true; spust(); },
    pokracuj() { pauza = false; spust(); },
    zastav() { pauza = true; spust(); ro.disconnect(); io.disconnect(); },
    nastavStale(v) { stale = v; spust(); },
  };
}

function texturaZPlatna(w, h, kresli) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  kresli(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const mekkaZare = (barvy) => texturaZPlatna(128, 128, (g, w) => {
  const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  barvy.forEach(([o, c]) => gr.addColorStop(o, c));
  g.fillStyle = gr;
  g.fillRect(0, 0, w, w);
});

function zlateHrany(geom, material, uhel = 28) {
  return new THREE.LineSegments(new THREE.EdgesGeometry(geom, uhel), material);
}

// Kvádr se základnou v y = 0.
function kvadr(w, h, d) {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(0, h / 2, 0);
  return g;
}
// Jehlan (čtyřboká střecha / věžní špice) se základnou v y = 0, natočený hranami podél os.
function jehlan(sirka, vyska, hloubka = sirka) {
  const g = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4, 1);
  g.rotateY(Math.PI / 4);
  g.scale(sirka, vyska, hloubka);
  g.translate(0, vyska / 2, 0);
  return g;
}
// Sedlová střecha (hřeben podél osy x) se základnou v y = 0.
function sedlo(w, h, d) {
  const s = new THREE.Shape();
  s.moveTo(-d / 2, 0); s.lineTo(d / 2, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
  g.rotateY(Math.PI / 2);
  g.translate(-w / 2, 0, 0);
  return g;
}
function slouc(casti) {
  // Jednoduché sloučení geometrií bez indexů (bez závislosti na BufferGeometryUtils).
  const pos = [], nor = [];
  for (const { g, m } of casti) {
    const x = (g.index ? g.toNonIndexed() : g).clone();
    if (m) x.applyMatrix4(m);
    x.computeVertexNormals();
    pos.push(...x.attributes.position.array);
    nor.push(...x.attributes.normal.array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
  return out;
}
const posun = (x, y, z, ry = 0, s = null) => {
  const m = new THREE.Matrix4().makeRotationY(ry);
  if (s) m.scale(s);
  m.setPosition(x, y, z);
  return m;
};

// ------------------------------------------------------------------ průlet nad Prahou (hero)
// Terén: hradní návrší a Petřín jako zploštělé elipsoidy; ostatní v nule.
const KOPCE = [
  { x: -95, z: -55, a: 62, c: 34, h: 6.2, y0: -6 },   // Hradčany
  { x: -102, z: 86, a: 40, c: 50, h: 13, y0: -16 },  // Petřín
];
function vyskaTerenu(x, z) {
  let y = 0;
  for (const k of KOPCE) {
    const q = ((x - k.x) / k.a) ** 2 + ((z - k.z) / k.c) ** 2;
    if (q < 1) y = Math.max(y, k.y0 + (k.h - k.y0) * Math.sqrt(1 - q));
  }
  return Math.max(0, y);
}
// Osa Vltavy (sever = −z) a vzdálenost bodu od ní.
const VLTAVA = [[-60, -420], [-22, -260], [6, -140], [2, -40], [0, 40], [-14, 150], [-6, 270], [24, 420]];
function vzdalenostOdReky(x, z) {
  let d = Infinity;
  for (let i = 0; i < VLTAVA.length - 1; i++) {
    const [ax, az] = VLTAVA[i], [bx, bz] = VLTAVA[i + 1];
    const vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz)));
    d = Math.min(d, Math.hypot(x - (ax + t * vx), z - (az + t * vz)));
  }
  return d;
}
const SIRKA_REKY = 13;

// Jednotkový dům: tělo 1×1×1 (y 0..1) a sedlová střecha (y 1..1.6) s hřebenem podél x – dvě geometrie,
// aby střechy mohly mít lesklejší materiál (zlaté odlesky nízkého slunce).
function domek() {
  const telo = kvadr(1, 1, 1);
  const strecha = sedlo(1.08, 0.6, 1.12);
  strecha.translate(0, 1, 0);
  return { telo, strecha };
}

function ctvrti(rnd, mobil) {
  // [x0, x1, z0, z1, úhel ulic, hustota]
  const c = [
    [24, 150, -112, 118, 0.14, 1], [150, 330, -70, 270, -0.22, 0.85], [22, 150, -230, -112, 0.06, 0.95],
    [-84, -20, -36, 96, 0.32, 1], [-215, -128, -120, -8, 0.02, 0.85], [-70, -20, 112, 320, 0.26, 0.9],
    [-210, -70, 150, 330, 0.24, 0.8], [150, 360, -300, -70, 0.1, 0.65], [-330, -215, -260, 120, -0.12, 0.6],
    [-60, 20, -360, -230, 0.2, 0.7], [330, 480, -260, 300, 0.05, 0.5], [-420, -230, 120, 380, 0.1, 0.5],
  ];
  return mobil ? c.slice(0, 8) : c;
}

function rozmistiDomy(rnd, mobil) {
  const out = [];
  const vynech = [
    { x: 95, z: -15, r: 12 }, { x: 72, z: -18, r: 15 }, { x: 24, z: 0, r: 5 }, { x: -28, z: 0, r: 5 },
    { x: -95, z: -52, r: 30, sx: 1.5 }, { x: -102, z: 86, r: 40 },
  ];
  const max = mobil ? 1500 : 3800;
  for (const [x0, x1, z0, z1, uhel, hustota] of ctvrti(rnd, mobil)) {
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, cos = Math.cos(uhel), sin = Math.sin(uhel);
    const krokX = 2.7, krokZ = 2.3;
    for (let u = -(x1 - x0) / 2; u < (x1 - x0) / 2; u += krokX) {
      if (rnd() < 0.12) continue; // ulice
      for (let v = -(z1 - z0) / 2; v < (z1 - z0) / 2; v += krokZ) {
        if (rnd() > hustota * 0.9 || Math.round(v / krokZ) % 6 === 0) continue;
        const x = cx + u * cos - v * sin, z = cz + u * sin + v * cos;
        if (vzdalenostOdReky(x, z) < SIRKA_REKY + 3) continue;
        if (vynech.some((e) => Math.hypot((x - e.x) / (e.sx || 1), z - e.z) < e.r)) continue;
        const daleko = Math.hypot(x, z) > 260;
        out.push({
          x, z, y: vyskaTerenu(x, z), uhel: -uhel + (rnd() < 0.18 ? Math.PI / 2 : 0) + (rnd() - 0.5) * 0.08,
          w: krokX * (0.62 + rnd() * 0.33), d: krokZ * (0.6 + rnd() * 0.32), h: (daleko ? 1.3 : 0.9) + rnd() * 0.65,
        });
        if (out.length >= max) return out;
      }
    }
  }
  return out;
}

function stavbyPrahy(material, hrany) {
  const skupina = new THREE.Group();
  const pridej = (casti) => {
    const g = slouc(casti);
    skupina.add(new THREE.Mesh(g, material), zlateHrany(g, hrany));
  };
  // Týnský chrám: loď, dvě západní věže s hlavní špicí a čtyřmi nárožními věžičkami.
  const tx = 95, tz = -15, casti = [{ g: kvadr(6.4, 2.6, 2.6), m: posun(tx + 2, 0, tz) }, { g: sedlo(6.4, 2.4, 2.8), m: posun(tx + 2, 2.6, tz) }];
  for (const dz of [-1.75, 1.75]) {
    casti.push({ g: kvadr(1.4, 5.2, 1.4), m: posun(tx - 1.4, 0, tz + dz) });
    casti.push({ g: jehlan(1.5, 3.1), m: posun(tx - 1.4, 5.2, tz + dz) });
    for (const [ox, oz] of [[-0.62, -0.62], [0.62, -0.62], [0.62, 0.62], [-0.62, 0.62]]) casti.push({ g: jehlan(0.34, 1.15), m: posun(tx - 1.4 + ox, 5.2, tz + dz + oz) });
  }
  pridej(casti);
  // Staroměstská mostecká věž a Malostranské mostecké věže.
  const vez = (x, z, s, h, k) => [{ g: kvadr(s, h, s), m: posun(x, 0, z) }, { g: jehlan(s * 1.06, k), m: posun(x, h, z) },
    ...[[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => ({ g: jehlan(s * 0.18, k * 0.34), m: posun(x + a * s * 0.46, h, z + b * s * 0.46) }))];
  pridej(vez(24.5, 0, 1.5, 3.6, 2.2));
  pridej([...vez(-28.5, -1.4, 1.3, 3.1, 1.8), ...vez(-28, 1.6, 0.9, 1.9, 1.1)]);
  // Karlův most: mostovka, pilíře, oblouky a sochy.
  const most = [{ g: kvadr(51, 0.32, 1.05), m: posun(-1.5, 1.25, 0) }];
  for (let i = 0; i <= 15; i++) {
    const x = -25.5 + i * 3.4;
    most.push({ g: kvadr(0.7, 1.25, 1.3), m: posun(x, 0, 0) });
    if (i % 2 === 0) for (const z of [-0.45, 0.45]) most.push({ g: kvadr(0.12, 0.42, 0.12), m: posun(x + 1.7, 1.57, z) });
  }
  pridej(most);
  for (let i = 0; i < 15; i++) {
    const g = new THREE.TorusGeometry(1.32, 0.16, 5, 14, Math.PI);
    const m = new THREE.Mesh(g, material);
    m.position.set(-25.5 + i * 3.4 + 1.7, 0, 0);
    skupina.add(m);
  }
  // Pražský hrad a katedrála sv. Víta na návrší.
  const hy = vyskaTerenu(-95, -55) - 0.3;
  const hrad = [
    { g: kvadr(46, 1.9, 2.2), m: posun(-100, hy, -40) }, { g: sedlo(46, 0.8, 2.4), m: posun(-100, hy + 1.9, -40) },
    { g: kvadr(2.2, 1.9, 16), m: posun(-124, hy, -48) }, { g: kvadr(2.2, 1.7, 14), m: posun(-76, hy, -50) },
    { g: kvadr(10.5, 3.3, 2.5), m: posun(-91, hy, -55) }, { g: sedlo(10.5, 1.9, 2.7), m: posun(-91, hy + 3.3, -55) },
    { g: kvadr(1.5, 6.4, 1.5), m: posun(-89, hy, -52.6) }, { g: kvadr(1.9, 0.25, 1.9), m: posun(-89, hy + 6.4, -52.6) },
    { g: new THREE.SphereGeometry(0.78, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.62), m: posun(-89, hy + 6.62, -52.6, 0, new THREE.Vector3(1, 1.5, 1)) },
    { g: jehlan(0.24, 1.2), m: posun(-89, hy + 7.7, -52.6) },
  ];
  for (const dz of [-0.75, 0.75]) hrad.push({ g: kvadr(0.95, 5.4, 0.95), m: posun(-96.6, hy, -55 + dz) }, { g: jehlan(1.0, 3.1), m: posun(-96.6, hy + 5.4, -55 + dz) });
  pridej(hrad);
  // Petřínská rozhledna – zlatá příhradová konstrukce (osmiboký komolý jehlan) na vrcholu Petřína.
  const py = vyskaTerenu(-102, 86) - 0.2;
  const rozhledna = new THREE.CylinderGeometry(0.2, 0.9, 6.35, 8, 7, true);
  rozhledna.translate(-102, py + 3.18, 86);
  const prihrada = new THREE.LineSegments(new THREE.WireframeGeometry(rozhledna), new THREE.LineBasicMaterial({ color: 0xf0d27a, transparent: true, opacity: 0.85 }));
  skupina.add(prihrada);
  const spicka = jehlan(0.36, 0.7);
  spicka.translate(-102, py + 6.35, 86);
  skupina.add(new THREE.Mesh(spicka, material), zlateHrany(spicka, hrany));
  return skupina;
}

function reka() {
  const krivka = new THREE.CatmullRomCurve3(VLTAVA.map(([x, z]) => new THREE.Vector3(x, 0.12, z)), false, "centripetal");
  const n = 160, pos = [], idx = [];
  for (let i = 0; i <= n; i++) {
    const p = krivka.getPointAt(i / n), t = krivka.getTangentAt(i / n), nx = -t.z, nz = t.x, l = Math.hypot(nx, nz) || 1;
    pos.push(p.x + (nx / l) * SIRKA_REKY, 0.12, p.z + (nz / l) * SIRKA_REKY, p.x - (nx / l) * SIRKA_REKY, 0.12, p.z - (nz / l) * SIRKA_REKY);
    if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return new THREE.Mesh(g, new THREE.MeshPhongMaterial({ color: 0x0a1424, specular: 0xe8c66a, shininess: 70, side: THREE.DoubleSide }));
}

function obloha() {
  const g = new THREE.SphereGeometry(1, 32, 16);
  const m = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: "varying vec3 vSmer; void main(){ vSmer = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }",
    fragmentShader: `varying vec3 vSmer;
      ${ZARE_GLSL}
      void main(){ vec3 d = normalize(vSmer); float h = d.y;
        vec3 c = mix(${vec3(MLHA)}, ${vec3(0x0d1120)}, smoothstep(0.0, 0.22, h)); c = mix(c, ${vec3(0x05070f)}, smoothstep(0.22, 0.75, h));
        gl_FragColor = vec4(c + hspgZare(d), 1.0); }`,
  });
  const o = new THREE.Mesh(g, m);
  o.scale.setScalar(2400);
  o.frustumCulled = false;
  o.renderOrder = -10;
  return o;
}

export async function vytvorPrulet(host, { mobil = false } = {}) {
  const renderer = vytvorRenderer(host, { mobil });
  const scena = new THREE.Scene();
  scena.background = new THREE.Color(MLHA);
  scena.fog = new THREE.FogExp2(MLHA, mobil ? 0.0058 : 0.005);
  const kamera = new THREE.PerspectiveCamera(42, 16 / 9, 1, 6000);
  upravMlhu();
  const smerSlunce = SLUNCE;
  const nebe = obloha();
  scena.add(nebe);

  scena.add(new THREE.HemisphereLight(0x46557a, 0x0b0f19, 1.15));
  const slunce = new THREE.DirectionalLight(0xffc56e, 2.2);
  slunce.position.copy(smerSlunce).multiplyScalar(500);
  scena.add(slunce);
  const protisvetlo = new THREE.DirectionalLight(0x7addff, 0.35);
  protisvetlo.position.set(-300, 120, -200);
  const vyplnove = new THREE.DirectionalLight(0xe9d6b8, 0.75); // měkké světlo od jihozápadu na fasády proti kameře
  vyplnove.position.set(-160, 140, 260);
  scena.add(protisvetlo, vyplnove);

  const zem = new THREE.Mesh(new THREE.PlaneGeometry(5000, 5000), new THREE.MeshStandardMaterial({ color: 0x0b0f18, roughness: 1 }));
  zem.rotation.x = -Math.PI / 2;
  scena.add(zem);
  for (const k of KOPCE) {
    const g = new THREE.SphereGeometry(1, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: k.h > 10 ? 0x101a14 : 0x141a22, roughness: 1 }));
    m.scale.set(k.a, k.h - k.y0, k.c);
    m.position.set(k.x, k.y0, k.z);
    scena.add(m);
  }
  scena.add(reka());

  const rnd = nahodne(20261022);
  const domy = rozmistiDomy(rnd, mobil);
  const { telo, strecha } = domek();
  const tela = new THREE.InstancedMesh(telo, new THREE.MeshStandardMaterial({ color: 0x8f877a, roughness: 0.9, metalness: 0.02 }), domy.length);
  const krytiny = new THREE.InstancedMesh(strecha, new THREE.MeshStandardMaterial({ color: 0x8c4632, roughness: 0.48, metalness: 0.32 }), domy.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), osaY = new THREE.Vector3(0, 1, 0), barva = new THREE.Color();
  domy.forEach((d, i) => {
    q.setFromAxisAngle(osaY, d.uhel);
    m4.compose(new THREE.Vector3(d.x, d.y, d.z), q, new THREE.Vector3(d.w, d.h, d.d));
    tela.setMatrixAt(i, m4);
    krytiny.setMatrixAt(i, m4);
    barva.setHSL(0.09 + rnd() * 0.05, 0.08 + rnd() * 0.14, 0.5 + rnd() * 0.3);
    tela.setColorAt(i, barva);
    barva.setHSL(0.03 + rnd() * 0.04, 0.35 + rnd() * 0.25, 0.42 + rnd() * 0.3);
    krytiny.setColorAt(i, barva);
  });
  for (const x of [tela, krytiny]) { x.instanceMatrix.needsUpdate = true; if (x.instanceColor) x.instanceColor.needsUpdate = true; scena.add(x); }

  const stromy = [];
  const lesy = [{ x: -102, z: 86, a: 34, c: 44, n: mobil ? 260 : 620 }, { x: -92, z: -76, a: 30, c: 9, n: mobil ? 60 : 160 }];
  for (const l of lesy) {
    for (let i = 0; i < l.n * 3 && stromy.length < 900; i++) {
      const u = rnd() * Math.PI * 2, r = Math.sqrt(rnd());
      const x = l.x + Math.cos(u) * r * l.a, z = l.z + Math.sin(u) * r * l.c;
      if (Math.hypot(x + 102, z - 86) < 3.5) continue;
      stromy.push([x, vyskaTerenu(x, z) - 0.2, z, 0.7 + rnd() * 0.7]);
      if (stromy.filter((t) => t).length >= l.n + (l === lesy[1] ? lesy[0].n : 0)) break;
    }
  }
  const les = new THREE.InstancedMesh(new THREE.ConeGeometry(0.55, 1.7, 6).translate(0, 0.85, 0), new THREE.MeshStandardMaterial({ color: 0x24331f, roughness: 1 }), stromy.length);
  stromy.forEach(([x, y, z, k], i) => { m4.compose(new THREE.Vector3(x, y, z), q.identity(), new THREE.Vector3(k, k * (0.9 + rnd() * 0.5), k)); les.setMatrixAt(i, m4); });
  les.instanceMatrix.needsUpdate = true;
  scena.add(les);

  const kamen = new THREE.MeshStandardMaterial({ color: 0x3b414e, roughness: 0.78, metalness: 0.08 });
  const hrany = new THREE.LineBasicMaterial({ color: ZLATA, transparent: true, opacity: 0.62 });
  scena.add(stavbyPrahy(kamen, hrany));

  // Úsvitová záře a mlha nad řekou.
  const mlhaTex = mekkaZare([[0, "rgba(236,230,214,.55)"], [0.6, "rgba(236,230,214,.12)"], [1, "rgba(236,230,214,0)"]]);
  const mlhy = [];
  const pocetMlh = mobil ? 7 : 14;
  for (let i = 0; i < pocetMlh; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mlhaTex, transparent: true, depthWrite: false, opacity: 0.1 + rnd() * 0.08 }));
    const z = -240 + (480 * i) / pocetMlh + rnd() * 20;
    s.position.set(-10 + (rnd() - 0.5) * 60, 2.5 + rnd() * 4, z);
    s.scale.set(90 + rnd() * 80, 16 + rnd() * 10, 1);
    s.userData.faze = rnd() * Math.PI * 2;
    mlhy.push(s);
    scena.add(s);
  }

  // Kamera po uzavřené spline; cíl kousek před ní, stažený ke středu města.
  const trasa = new THREE.CatmullRomCurve3([
    [185, 34, 150], [96, 24, 74], [34, 16, 24], [-6, 18, -24], [-48, 26, -104], [-150, 34, -78],
    [-176, 38, 34], [-128, 34, 160], [-24, 26, 186], [104, 30, 176],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z)), true, "centripetal");
  const stred = new THREE.Vector3(-10, 3, -12), cil = new THREE.Vector3();
  const DOBA = mobil ? 150 : 135;
  let cas = DOBA * 0.8;
  const krok = (dt) => {
    cas += dt;
    const u = (cas / DOBA) % 1;
    kamera.position.copy(trasa.getPointAt(u));
    cil.copy(trasa.getPointAt((u + 0.07) % 1)).lerp(stred, 0.58);
    cil.y = kamera.position.y * 0.5;
    kamera.lookAt(cil);
    nebe.position.copy(kamera.position);
    for (const s of mlhy) s.position.x += Math.sin(cas * 0.05 + s.userData.faze) * dt * 0.8;
    renderer.render(scena, kamera);
  };
  const beh = smycka(host, renderer, kamera, krok);
  krok(0);
  beh.spust();
  return {
    canvas: renderer.domElement,
    pocetDomu: domy.length,
    pauza: beh.pauza, pokracuj: beh.pokracuj,
    zastav() { beh.zastav(); renderer.dispose(); },
  };
}

// ------------------------------------------------------------------ ilustrační model domu z obrysu
function zjednodus(body) {
  let p = body.map(([x, y]) => [x, y]).filter((b, i, a) => i === 0 || Math.hypot(b[0] - a[i - 1][0], b[1] - a[i - 1][1]) > 0.05);
  if (p.length > 3 && Math.hypot(p[0][0] - p.at(-1)[0], p[0][1] - p.at(-1)[1]) < 0.05) p.pop();
  // Odstraní téměř přímé lomy (pod 4°).
  let zmena = true;
  while (zmena && p.length > 3) {
    zmena = false;
    for (let i = 0; i < p.length; i++) {
      const a = p[(i - 1 + p.length) % p.length], b = p[i], c = p[(i + 1) % p.length];
      const u = [b[0] - a[0], b[1] - a[1]], v = [c[0] - b[0], c[1] - b[1]];
      const sin = (u[0] * v[1] - u[1] * v[0]) / ((Math.hypot(...u) * Math.hypot(...v)) || 1);
      if (Math.abs(sin) < 0.07 && u[0] * v[0] + u[1] * v[1] > 0) { p.splice(i, 1); zmena = true; break; }
    }
  }
  const plocha = p.reduce((s, b, i) => { const c = p[(i + 1) % p.length]; return s + b[0] * c[1] - c[0] * b[1]; }, 0) / 2;
  if (plocha < 0) p.reverse();
  return { body: p, plocha: Math.abs(plocha) };
}

// Nejmenší opsaný obdélník (otáčení podle hran).
function obdelnik(body) {
  let nej = null;
  for (let i = 0; i < body.length; i++) {
    const a = body[i], b = body[(i + 1) % body.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l < 0.01) continue;
    const ux = (b[0] - a[0]) / l, uy = (b[1] - a[1]) / l;
    let mnU = Infinity, mxU = -Infinity, mnV = Infinity, mxV = -Infinity;
    for (const [x, y] of body) {
      const u = x * ux + y * uy, v = -x * uy + y * ux;
      mnU = Math.min(mnU, u); mxU = Math.max(mxU, u); mnV = Math.min(mnV, v); mxV = Math.max(mxV, v);
    }
    const plocha = (mxU - mnU) * (mxV - mnV);
    if (!nej || plocha < nej.plocha) nej = { ux, uy, cu: (mnU + mxU) / 2, cv: (mnV + mxV) / 2, a: (mxU - mnU) / 2, b: (mxV - mnV) / 2, plocha };
  }
  if (nej.b > nej.a) { // delší osa = u
    const { ux, uy, cu, cv, a, b } = nej;
    nej = { ux: -uy, uy: ux, cu: cv, cv: -cu, a: b, b: a, plocha: nej.plocha };
  }
  return nej;
}

// Bod (x, y sever) → svět (x, z = −y).
const doSveta = (x, y, vyska) => new THREE.Vector3(x, vyska, -y);

function geometrieZTrojuhelniku(trojuhelniky) {
  const pos = [], uv = [];
  for (const t of trojuhelniky) for (const v of t) { pos.push(v.x, v.y, v.z); uv.push(v.x / 6, (v.z + v.y * 0.6) / 6); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

// Valbová střecha nad opsaným obdélníkem (s přesahem okapu); vrací geometrii, plochy pro kapky a výšku hřebene.
function valbovaStrecha(o, okap, sklon) {
  const p = 0.45, A = o.a + p, B = o.b + p, h = B * Math.tan(sklon), r = Math.max(0, A - B);
  const U = [o.ux, o.uy], V = [-o.uy, o.ux];
  const bod = (u, v, y) => doSveta(o.cu * U[0] + o.cv * V[0] + u * U[0] + v * V[0], o.cu * U[1] + o.cv * V[1] + u * U[1] + v * V[1], y);
  const E1 = bod(-A, -B, okap), E2 = bod(A, -B, okap), E3 = bod(A, B, okap), E4 = bod(-A, B, okap);
  const R1 = bod(-r, 0, okap + h), R2 = bod(r, 0, okap + h);
  const plochy = [[E1, E2, R2], [E1, R2, R1], [E3, E4, R1], [E3, R1, R2], [E2, E3, R2], [E4, E1, R1]];
  const podhled = [[E1, E3, E2], [E1, E4, E3]];
  return { g: geometrieZTrojuhelniku([...plochy, ...podhled]), plochy, hreben: okap + h };
}

// Odsazení mnohoúhelníku dovnitř (průsečíky posunutých hran); null, když se tvar zvrhne.
function odsad(body, d) {
  const n = body.length, cary = [];
  for (let i = 0; i < n; i++) {
    const a = body[i], b = body[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const nx = -(b[1] - a[1]) / l, ny = (b[0] - a[0]) / l; // vnitřní normála (CCW)
    cary.push({ p: [a[0] + nx * d, a[1] + ny * d], s: [(b[0] - a[0]) / l, (b[1] - a[1]) / l] });
  }
  const out = [];
  for (let i = 0; i < n; i++) {
    const c1 = cary[(i - 1 + n) % n], c2 = cary[i];
    const det = c1.s[0] * c2.s[1] - c1.s[1] * c2.s[0];
    if (Math.abs(det) < 1e-6) { out.push(c2.p); continue; }
    const t = ((c2.p[0] - c1.p[0]) * c2.s[1] - (c2.p[1] - c1.p[1]) * c2.s[0]) / det;
    out.push([c1.p[0] + c1.s[0] * t, c1.p[1] + c1.s[1] * t]);
  }
  for (let i = 0; i < n; i++) {
    const a = body[i], b = body[(i + 1) % n], c = out[i], e = out[(i + 1) % n];
    if ((b[0] - a[0]) * (e[0] - c[0]) + (b[1] - a[1]) * (e[1] - c[1]) <= 0) return null;
  }
  const pl = out.reduce((s, b, i) => { const c = out[(i + 1) % n]; return s + b[0] * c[1] - c[0] * b[1]; }, 0) / 2;
  return pl > 0.5 ? out : null;
}

function polomerVepsany(body) {
  // Hrubý odhad poloměru největší vepsané kružnice (mřížka 24×24).
  const xs = body.map((b) => b[0]), ys = body.map((b) => b[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const uvnitr = (x, y) => { let c = false; for (let i = 0, j = body.length - 1; i < body.length; j = i++) { const [xi, yi] = body[i], [xj, yj] = body[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  let r = 0;
  for (let i = 1; i < 24; i++) for (let j = 1; j < 24; j++) {
    const x = x0 + ((x1 - x0) * i) / 24, y = y0 + ((y1 - y0) * j) / 24;
    if (!uvnitr(x, y)) continue;
    let d = Infinity;
    for (let k = 0; k < body.length; k++) {
      const a = body[k], b = body[(k + 1) % body.length], vx = b[0] - a[0], vy = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / (vx * vx + vy * vy || 1)));
      d = Math.min(d, Math.hypot(x - a[0] - t * vx, y - a[1] - t * vy));
    }
    r = Math.max(r, d);
  }
  return r;
}

function odsazenaStrecha(body, okap, sklon) {
  const r = polomerVepsany(body), d = r * 0.82, vnitrni = d > 0.4 ? odsad(body, d) : null;
  if (!vnitrni) return null;
  const h = d * Math.tan(sklon), n = body.length, plochy = [];
  for (let i = 0; i < n; i++) {
    const a = doSveta(...body[i], okap), b = doSveta(...body[(i + 1) % n], okap);
    const c = doSveta(...vnitrni[(i + 1) % n], okap + h), e = doSveta(...vnitrni[i], okap + h);
    plochy.push([a, b, c], [a, c, e]);
  }
  const vrch = THREE.ShapeUtils.triangulateShape(vnitrni.map(([x, y]) => new THREE.Vector2(x, y)), []);
  const vrchol = vrch.map(([i, j, k]) => [doSveta(...vnitrni[i], okap + h), doSveta(...vnitrni[j], okap + h), doSveta(...vnitrni[k], okap + h)]);
  const spodek = THREE.ShapeUtils.triangulateShape(body.map(([x, y]) => new THREE.Vector2(x, y)), []).map(([i, j, k]) => [doSveta(...body[i], okap), doSveta(...body[k], okap), doSveta(...body[j], okap)]);
  return { g: geometrieZTrojuhelniku([...plochy, ...vrchol, ...spodek]), plochy, hreben: okap + h };
}

function plochaStrecha(body, okap) {
  const tvar = new THREE.Shape(body.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(tvar, { depth: 0.35, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.translate(0, okap, 0);
  const tr = THREE.ShapeUtils.triangulateShape(body.map(([x, y]) => new THREE.Vector2(x, y)), []);
  return { g, plochy: tr.map(([i, j, k]) => [doSveta(...body[i], okap + 0.35), doSveta(...body[j], okap + 0.35), doSveta(...body[k], okap + 0.35)]), hreben: okap + 0.35, plocha: true };
}

const fasadaPred = () => texturaZPlatna(256, 256, (g, w, h) => {
  const rnd = nahodne(77);
  g.fillStyle = "#a9a08d"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 46; i++) { // stékající šmouhy
    const x = rnd() * w, s = 3 + rnd() * 12, gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, "rgba(40,36,28,.35)"); gr.addColorStop(1, "rgba(40,36,28,0)");
    g.fillStyle = gr; g.fillRect(x, rnd() * 40, s, h * (0.4 + rnd() * 0.6));
  }
  for (let i = 0; i < 26; i++) { // řasy u soklu
    const x = rnd() * w, y = h * (0.7 + rnd() * 0.3), r = 10 + rnd() * 30, gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, "rgba(64,86,46,.55)"); gr.addColorStop(1, "rgba(64,86,46,0)");
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(30,28,22,${rnd() * 0.18})`; g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
});
const strechaPred = () => texturaZPlatna(256, 256, (g, w, h) => {
  const rnd = nahodne(91);
  g.fillStyle = "#4b3428"; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 10) { g.fillStyle = "rgba(0,0,0,.22)"; g.fillRect(0, y, w, 2); }
  for (let i = 0; i < 70; i++) { // mech
    const x = rnd() * w, y = rnd() * h, r = 6 + rnd() * 26, gr = g.createRadialGradient(x, y, 0, x, y, r);
    const c = rnd() < 0.5 ? "86,112,52" : "112,128,62";
    gr.addColorStop(0, `rgba(${c},.85)`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(214,206,160,${0.25 + rnd() * 0.4})`; g.beginPath(); g.arc(rnd() * w, rnd() * h, 0.6 + rnd() * 1.6, 0, Math.PI * 2); g.fill(); }
});
const tasky = () => texturaZPlatna(256, 256, (g, w, h) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 16) { g.fillStyle = "rgba(0,0,0,.16)"; g.fillRect(0, y + 13, w, 3); for (let x = (y / 16) % 2 ? 0 : 10; x < w; x += 20) g.fillRect(x, y, 1.5, 14); }
});

export async function vytvorModel(host, { obrys, staticky = false, mobil = false } = {}) {
  const renderer = vytvorRenderer(host, { mobil, alfa: true });
  renderer.localClippingEnabled = true;
  renderer.setClearColor(0x000000, 0);
  const scena = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(34, 4 / 3, 0.1, 2000);
  scena.add(new THREE.HemisphereLight(0xb6c3dc, 0x12161e, 1.25));
  const slunce = new THREE.DirectionalLight(0xffd9a2, 2.4);
  slunce.position.set(30, 44, 22);
  scena.add(slunce);
  const kontra = new THREE.DirectionalLight(0x7addff, 0.7);
  kontra.position.set(-34, 18, -30);
  scena.add(kontra);

  const ovladani = new OrbitControls(kamera, renderer.domElement);
  ovladani.enableDamping = !staticky;
  ovladani.enablePan = false;
  ovladani.enableZoom = false;
  ovladani.maxPolarAngle = 1.38;
  ovladani.minPolarAngle = 0.35;
  ovladani.autoRotate = !staticky;
  ovladani.autoRotateSpeed = 0.55;
  const dotyk = matchMedia("(pointer: coarse)").matches;
  ovladani.enabled = !dotyk; // na dotyku by otáčení blokovalo posun stránky
  if (dotyk) renderer.domElement.style.touchAction = "pan-y";
  ovladani.addEventListener("start", () => { ovladani.autoRotate = false; });

  const osa = new THREE.Vector3();
  const rovinaPo = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), rovinaPred = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
  const texFasada = fasadaPred(), texStrecha = strechaPred(), texTasky = tasky();
  for (const t of [texFasada, texStrecha, texTasky]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  texFasada.repeat.set(0.16, 0.16);
  texStrecha.repeat.set(0.9, 0.9);
  texTasky.repeat.set(0.9, 0.9);
  const VYCHOZI = { fasada: new THREE.Color(0xe8e1d2), strecha: new THREE.Color(0x96462e) };
  const mat = {
    zedPo: new THREE.MeshStandardMaterial({ color: VYCHOZI.fasada.clone(), roughness: 0.82, clippingPlanes: [rovinaPo] }),
    zedPred: new THREE.MeshStandardMaterial({ map: texFasada, roughness: 0.95, clippingPlanes: [rovinaPred] }),
    strechaPo: new THREE.MeshStandardMaterial({ color: VYCHOZI.strecha.clone(), map: texTasky, roughness: 0.62, clippingPlanes: [rovinaPo], side: THREE.DoubleSide }),
    strechaPred: new THREE.MeshStandardMaterial({ map: texStrecha, roughness: 0.96, clippingPlanes: [rovinaPred], side: THREE.DoubleSide }),
    kapka: new THREE.MeshStandardMaterial({ color: 0xe6f6ff, roughness: 0.04, metalness: 0.15, transparent: true, opacity: 0.88, emissive: 0x16303f, emissiveIntensity: 0.4, clippingPlanes: [rovinaPo] }),
  };
  const skupina = new THREE.Group();
  scena.add(skupina);
  const zem = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshStandardMaterial({ color: 0x0c111b, roughness: 1, transparent: true, opacity: 0.92 }));
  zem.rotation.x = -Math.PI / 2;
  scena.add(zem);
  const prstenec = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 96), new THREE.MeshBasicMaterial({ color: ZLATA, transparent: true, opacity: 0.45 }));
  prstenec.rotation.x = -Math.PI / 2;
  prstenec.position.y = 0.01;
  scena.add(prstenec);

  // Štětec: zlatá světelná stěna v místě řezu Před/Po.
  const stena = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  const hranaStetce = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1, 0.06), new THREE.MeshBasicMaterial({ color: 0xf6e7a8 }));
  scena.add(stena, hranaStetce);
  // Skenovací laser: vodorovná zlatá rovina.
  const laser = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: mekkaZare([[0, "rgba(246,231,168,.9)"], [0.45, "rgba(212,175,55,.35)"], [1, "rgba(212,175,55,0)"]]), transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  laser.rotation.x = -Math.PI / 2;
  laser.visible = false;
  scena.add(laser);

  const stavM = { cesta: "A", h: 0.5, rozsah: 10, vyska: 6.2, hreben: 9, body: [], strechy: [], zdi: [], sken: -1, okraje: [0, 0] };
  let kapky = null, dataKapek = [];
  const rnd = nahodne(4242);

  function postav(body0) {
    skupina.clear();
    const { body, plocha } = zjednodus(body0);
    stavM.body = body;
    const R = Math.max(...body.map(([x, y]) => Math.hypot(x, y)));
    stavM.rozsah = R;
    stavM.vyska = Math.min(12, Math.max(6.2, R * 0.38)); // ilustrační, nezávislé na měření
    const tvar = new THREE.Shape(body.map(([x, y]) => new THREE.Vector2(x, y)));
    const zdi = new THREE.ExtrudeGeometry(tvar, { depth: stavM.vyska, bevelEnabled: false });
    zdi.rotateX(-Math.PI / 2);
    skupina.add(new THREE.Mesh(zdi, mat.zedPo), new THREE.Mesh(zdi, mat.zedPred));
    skupina.add(zlateHrany(zdi, new THREE.LineBasicMaterial({ color: ZLATA, transparent: true, opacity: 0.35 }), 30));
    const o = obdelnik(body), sklon = (36 * Math.PI) / 180;
    const strecha = plocha / o.plocha > 0.88 ? valbovaStrecha(o, stavM.vyska, sklon) : odsazenaStrecha(body, stavM.vyska, sklon) || plochaStrecha(body, stavM.vyska);
    stavM.hreben = strecha.hreben;
    stavM.strechy = strecha.plochy;
    skupina.add(new THREE.Mesh(strecha.g, mat.strechaPo), new THREE.Mesh(strecha.g, mat.strechaPred));
    skupina.add(zlateHrany(strecha.g, new THREE.LineBasicMaterial({ color: ZLATA, transparent: true, opacity: 0.7 }), 20));
    // Obrys na zemi.
    const obrysCara = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(body.map(([x, y]) => doSveta(x, y, 0.03))), new THREE.LineBasicMaterial({ color: ZLATA }));
    skupina.add(obrysCara);
    stavM.zdi = body.map((a, i) => ({ a, b: body[(i + 1) % body.length], l: Math.hypot(body[(i + 1) % body.length][0] - a[0], body[(i + 1) % body.length][1] - a[1]) }));
    zem.scale.setScalar(R * 2.6 + 4);
    prstenec.scale.setScalar(R * 2.6 + 4);
    laser.scale.set(R * 3, R * 3, 1);
    const D = Math.max(16, R * 3.1 + stavM.hreben);
    kamera.position.set(D * 0.62, D * 0.5 + stavM.hreben * 0.4, D * 0.72);
    ovladani.target.set(0, stavM.hreben * 0.42, 0);
    ovladani.minDistance = D * 0.6;
    ovladani.maxDistance = D * 1.6;
    ovladani.update();
    postavKapky();
  }

  function nahodnyBodStrechy() {
    const t = stavM.strechy[Math.floor(rnd() * stavM.strechy.length)];
    let a = rnd(), b = rnd();
    if (a + b > 1) { a = 1 - a; b = 1 - b; }
    const p = t[0].clone().addScaledVector(t[1].clone().sub(t[0]), a).addScaledVector(t[2].clone().sub(t[0]), b);
    const n = t[1].clone().sub(t[0]).cross(t[2].clone().sub(t[0])).normalize();
    if (n.y < 0) n.negate();
    return { p: p.addScaledVector(n, 0.07), n, strecha: true };
  }
  function nahodnyBodZdi() {
    const celkem = stavM.zdi.reduce((s, z) => s + z.l, 0);
    let x = rnd() * celkem, z = stavM.zdi[0];
    for (const k of stavM.zdi) { if (x <= k.l) { z = k; break; } x -= k.l; }
    const t = rnd(), px = z.a[0] + (z.b[0] - z.a[0]) * t, py = z.a[1] + (z.b[1] - z.a[1]) * t;
    const nx = (z.b[1] - z.a[1]) / (z.l || 1), ny = -(z.b[0] - z.a[0]) / (z.l || 1); // vnější normála (CCW)
    const n = new THREE.Vector3(nx, 0, -ny);
    return { p: doSveta(px, py, 0.6 + rnd() * (stavM.vyska - 1.2)).addScaledVector(n, 0.07), n, strecha: false };
  }
  function novaKapka(k) {
    const b = rnd() < 0.62 && stavM.strechy.length ? nahodnyBodStrechy() : nahodnyBodZdi();
    const g = new THREE.Vector3(0, -1, 0);
    const dolu = g.clone().addScaledVector(b.n, -g.dot(b.n));
    if (dolu.lengthSq() < 1e-4) dolu.set(0, -1, 0);
    dolu.normalize();
    Object.assign(k, { p: b.p, dolu, faze: "perli", cekani: 0.6 + rnd() * 3.2, v: 0, vy: 0, mer: 0, velikost: 0.6 + rnd() * 0.9, okap: stavM.vyska + 0.02, strecha: b.strecha });
    return k;
  }
  function postavKapky() {
    if (kapky) { scena.remove(kapky); kapky.geometry.dispose(); }
    const pocet = mobil ? 110 : 220;
    kapky = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 10, 8), mat.kapka, pocet);
    kapky.frustumCulled = false;
    dataKapek = Array.from({ length: pocet }, () => novaKapka({}));
    scena.add(kapky);
    kapky.visible = stavM.cesta === "A";
    hybKapek(0);
  }
  const m4 = new THREE.Matrix4(), sc = new THREE.Vector3(), q0 = new THREE.Quaternion();
  function hybKapek(dt) {
    if (!kapky) return;
    dataKapek.forEach((k, i) => {
      if (!staticky && dt > 0) {
        if (k.faze === "perli") { k.mer = Math.min(1, k.mer + dt * 2.5); k.cekani -= dt; if (k.cekani <= 0) k.faze = "steka"; }
        else if (k.faze === "steka") {
          k.v = Math.min(k.strecha ? 2.2 : 2.8, k.v + dt * 1.6);
          k.p.addScaledVector(k.dolu, k.v * dt);
          if ((k.strecha && k.p.y <= k.okap) || (!k.strecha && k.p.y <= 0.08)) { k.faze = k.strecha ? "pada" : "konec"; k.vy = -k.v * Math.abs(k.dolu.y); }
        } else if (k.faze === "pada") { k.vy -= 9.8 * dt; k.p.y += k.vy * dt; k.p.addScaledVector(k.dolu.clone().setY(0), dt * 0.6); if (k.p.y <= 0.05) k.faze = "konec"; }
        if (k.faze === "konec") novaKapka(k);
      } else k.mer = 1;
      const tvar = k.faze === "steka" ? 1.35 : 1;
      sc.set(k.velikost * k.mer, k.velikost * k.mer * tvar, k.velikost * k.mer);
      m4.compose(k.p, q0, sc);
      kapky.setMatrixAt(i, m4);
    });
    kapky.instanceMatrix.needsUpdate = true;
  }

  function aktualizujStetec() {
    osa.setFromMatrixColumn(kamera.matrixWorld, 0);
    osa.y = 0;
    if (osa.lengthSq() < 1e-6) osa.set(1, 0, 0);
    osa.normalize();
    let mn = Infinity, mx = -Infinity;
    for (const [x, y] of stavM.body) { const d = x * osa.x + -y * osa.z; mn = Math.min(mn, d); mx = Math.max(mx, d); }
    mn -= 0.8; mx += 0.8;
    const s = mn + (mx - mn) * stavM.h;
    rovinaPo.normal.copy(osa).negate(); rovinaPo.constant = s;
    rovinaPred.normal.copy(osa); rovinaPred.constant = -s;
    const viditelny = stavM.h > 0.005 && stavM.h < 0.995;
    stena.visible = hranaStetce.visible = viditelny;
    if (viditelny) {
      const vys = stavM.hreben + 1.2;
      stena.position.set(osa.x * s, vys / 2, osa.z * s);
      stena.scale.set(stavM.rozsah * 2.4, vys, 1);
      stena.lookAt(stena.position.clone().add(osa));
      hranaStetce.position.copy(stena.position);
      hranaStetce.scale.set(1, vys, 1);
    }
  }

  const krok = (dt) => {
    if (ovladani.enabled || ovladani.autoRotate) ovladani.update(dt);
    if (stavM.sken >= 0) {
      stavM.sken += dt / 2.2;
      laser.visible = stavM.sken < 1;
      laser.position.y = (stavM.hreben + 1) * (1 - stavM.sken);
      laser.material.opacity = Math.sin(Math.min(1, stavM.sken) * Math.PI);
      if (stavM.sken >= 1) stavM.sken = -1;
    }
    if (stavM.cesta === "A") hybKapek(dt);
    kamera.updateMatrixWorld();
    aktualizujStetec();
    renderer.render(scena, kamera);
  };
  const beh = smycka(host, renderer, kamera, krok, { stale: !staticky });
  if (staticky) ovladani.addEventListener("change", () => beh.vykresli());
  postav(obrys);
  beh.vykresli();
  beh.spust();

  return {
    canvas: renderer.domElement,
    nastavObrys(b) { postav(b); beh.vykresli(); },
    nastavCestu(c) { stavM.cesta = c === "B" ? "B" : "A"; if (kapky) kapky.visible = stavM.cesta === "A"; beh.vykresli(); },
    nastavBarvy({ strecha, fasada } = {}) {
      mat.strechaPo.color.set(strecha || VYCHOZI.strecha);
      mat.zedPo.color.set(fasada || VYCHOZI.fasada);
      beh.vykresli();
    },
    predPo(h) { stavM.h = Math.max(0, Math.min(1, Number(h) || 0)); beh.vykresli(); },
    sken() { if (staticky) return beh.vykresli(); stavM.sken = 0; },
    pauza: beh.pauza, pokracuj: beh.pokracuj,
    zastav() { beh.zastav(); ovladani.dispose(); renderer.dispose(); },
  };
}
