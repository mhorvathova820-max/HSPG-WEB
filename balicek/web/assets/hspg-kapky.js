/* HSPG kapky – překryv „klepněte kamkoliv“: kapky vody na ošetřeném povrchu perlí a stékají.
 * Počet, velikost a rychlost kapek se řídí zrychlením myši nebo prstu; tažením vzniká stopa kapek.
 * Znovupoužitelné na libovolném prvku s position: relative:
 *   import { pripojKapky } from "/assets/hspg-kapky.js";
 *   const k = pripojKapky(prvek, { max: 160, priKapce: () => {} });  // → { aktivni, vystrel(x, y, sila), vypni() }
 * Při prefers-reduced-motion se nic nespustí (aktivni = false). Plátno nepřijímá kliknutí (pointer-events: none)
 * a smyčka běží jen dokud nějaká kapka existuje – v klidu nestojí nic.
 */
export function pripojKapky(host, { max = 160, priKapce = null, tridaPlatna = "hspg-kapky" } = {}) {
  const omezit = matchMedia("(prefers-reduced-motion: reduce)");
  const nic = { aktivni: false, vystrel() {}, vypni() {} };
  if (!host || omezit.matches) return nic;

  const platno = document.createElement("canvas");
  platno.className = tridaPlatna;
  platno.setAttribute("aria-hidden", "true");
  Object.assign(platno.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "1" });
  host.append(platno);
  const g = platno.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  const velikost = () => {
    const r = host.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    platno.width = Math.max(1, Math.round(W * dpr));
    platno.height = Math.max(1, Math.round(H * dpr));
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  velikost();
  const ro = new ResizeObserver(velikost);
  ro.observe(host);

  const kapky = [];
  let id = 0, posledniCas = 0, ukazatel = null, zrychleni = 0;

  function pridej(x, y, r, vx = 0, vy = 0, cekani) {
    if (kapky.length >= max) kapky.shift();
    kapky.push({ x, y, r, vx, vy, faze: "perli", cekani: cekani ?? 0.35 + Math.random() * 1.9 * (6 / (r + 3)), rust: 0, zivot: 0, stopa: [], vlneni: Math.random() * 6.28 });
    if (!id) { posledniCas = 0; id = requestAnimationFrame(snimek); }
  }

  // Výstřel kapek kolem bodu; sila 1–3,5 (z akcelerace ukazatele).
  function vystrel(x, y, sila = 1) {
    const s = Math.max(0.6, Math.min(3.5, sila));
    const n = Math.round(4 + s * 4 + Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * (10 + 16 * s);
      const r = Math.min(11, 1.6 + Math.random() ** 1.6 * 5.2 * (0.6 + s * 0.4));
      pridej(x + Math.cos(u) * d, y + Math.sin(u) * d * 0.8, r, Math.cos(u) * 12 * s, Math.sin(u) * 6 * s);
    }
    try { priKapce?.(); } catch { /* zvuk je nepovinný */ }
  }

  const bod = (e) => { const r = host.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: e.timeStamp || performance.now(), vx: 0, vy: 0 }; };
  function pohyb(e) {
    const b = bod(e);
    if (ukazatel) {
      const dt = Math.max(4, b.t - ukazatel.t) / 1000;
      b.vx = (b.x - ukazatel.x) / dt; b.vy = (b.y - ukazatel.y) / dt;
      const a = Math.hypot((b.vx - ukazatel.vx) / dt, (b.vy - ukazatel.vy) / dt);
      zrychleni = zrychleni * 0.82 + Math.min(60000, a) * 0.18;
      const tazeni = e.buttons > 0 || e.pointerType === "touch";
      const rychlost = Math.hypot(b.vx, b.vy);
      if (tazeni && rychlost > 260 && Math.random() < Math.min(0.85, rychlost / 2600)) {
        pridej(b.x + (Math.random() - 0.5) * 8, b.y + (Math.random() - 0.5) * 8, 1.4 + Math.random() * 2.8, b.vx * 0.04, b.vy * 0.04, 0.25 + Math.random() * 0.6);
      }
    }
    ukazatel = b;
  }
  function stisk(e) {
    const b = bod(e);
    vystrel(b.x, b.y, 1 + zrychleni / 9000);
  }
  host.addEventListener("pointermove", pohyb, { passive: true });
  host.addEventListener("pointerdown", stisk, { passive: true });

  function slij() {
    for (let i = 0; i < kapky.length; i++) {
      const a = kapky[i];
      for (let j = i + 1; j < kapky.length; j++) {
        const b = kapky[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < (a.r + b.r) * 0.72) {
          const r = Math.sqrt(a.r * a.r + b.r * b.r), wa = a.r * a.r / (r * r);
          a.x = a.x * wa + b.x * (1 - wa); a.y = a.y * wa + b.y * (1 - wa);
          a.vx = a.vx * wa + b.vx * (1 - wa); a.vy = Math.max(a.vy, b.vy);
          a.r = Math.min(14, r); a.rust = Math.max(a.rust, b.rust);
          if (a.r > 6.5 && a.faze === "perli") a.cekani = Math.min(a.cekani, 0.12);
          kapky.splice(j, 1); j--;
        }
      }
    }
  }

  function kresli(k) {
    const r = k.r * Math.min(1, k.rust), x = k.x, y = k.y;
    if (r < 0.4) return;
    const protazeni = k.faze === "steka" ? 1 + Math.min(0.75, k.vy / 320) : 1;
    // Stopa stékající kapky (tenký vlhký pruh).
    if (k.stopa.length > 1) {
      g.beginPath();
      g.moveTo(k.stopa[0].x, k.stopa[0].y);
      for (const p of k.stopa) g.lineTo(p.x, p.y);
      g.lineTo(x, y - r * 0.6);
      g.strokeStyle = "rgba(210,226,244,.16)";
      g.lineWidth = Math.max(1, r * 0.55);
      g.lineCap = "round";
      g.stroke();
    }
    g.save();
    g.translate(x, y);
    g.scale(1, protazeni);
    // Stín pod kapkou.
    g.beginPath(); g.ellipse(r * 0.22, r * 0.34, r, r * 0.96, 0, 0, Math.PI * 2);
    g.fillStyle = "rgba(0,0,0,.24)"; g.fill();
    // Tělo kapky: tmavší střed, světlý lom na okraji (čočka).
    const t = g.createRadialGradient(-r * 0.28, -r * 0.34, r * 0.08, 0, 0, r);
    t.addColorStop(0, "rgba(255,255,255,.5)");
    t.addColorStop(0.32, "rgba(196,214,234,.14)");
    t.addColorStop(0.82, "rgba(110,140,172,.2)");
    t.addColorStop(1, "rgba(236,244,255,.5)");
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2);
    g.fillStyle = t; g.fill();
    // Odlesk a zlatá kaustika.
    g.beginPath(); g.ellipse(-r * 0.34, -r * 0.4, r * 0.3, r * 0.2, -0.6, 0, Math.PI * 2);
    g.fillStyle = "rgba(255,255,255,.88)"; g.fill();
    g.beginPath(); g.ellipse(r * 0.18, r * 0.5, r * 0.36, r * 0.16, 0.2, 0, Math.PI * 2);
    g.fillStyle = "rgba(246,231,168,.32)"; g.fill();
    g.restore();
  }

  function snimek(t) {
    const dt = posledniCas ? Math.min(0.05, (t - posledniCas) / 1000) : 0.016;
    posledniCas = t;
    g.clearRect(0, 0, W, H);
    for (const k of kapky) {
      k.zivot += dt;
      k.rust = Math.min(1, k.rust + dt * 7);
      if (k.faze === "perli") {
        k.x += k.vx * dt; k.y += k.vy * dt;
        k.vx *= 0.82; k.vy *= 0.82;
        k.cekani -= dt;
        if (k.cekani <= 0) k.faze = "steka";
      } else {
        const tihove = 380 + k.r * 70, mezni = 30 + k.r * 26;
        k.vy = Math.min(mezni, k.vy + tihove * dt);
        k.vlneni += dt * (2 + k.r * 0.3);
        k.vx = k.vx * 0.9 + Math.sin(k.vlneni) * 6;
        k.x += k.vx * dt; k.y += k.vy * dt;
        const posledni = k.stopa[k.stopa.length - 1];
        if (!posledni || Math.hypot(posledni.x - k.x, posledni.y - k.y) > 6) { k.stopa.push({ x: k.x, y: k.y }); if (k.stopa.length > 22) k.stopa.shift(); }
        // Cestou kapka ztrácí vodu do stopy.
        k.r = Math.max(1.2, k.r - dt * 0.18);
      }
    }
    slij();
    for (let i = kapky.length - 1; i >= 0; i--) {
      const k = kapky[i];
      if (k.y - k.r * 2 > H + 20 || k.zivot > 24) kapky.splice(i, 1);
    }
    for (const k of kapky) kresli(k);
    id = kapky.length ? requestAnimationFrame(snimek) : 0;
    if (!id) g.clearRect(0, 0, W, H);
  }

  function vypni() {
    host.removeEventListener("pointermove", pohyb);
    host.removeEventListener("pointerdown", stisk);
    if (id) cancelAnimationFrame(id);
    id = 0;
    kapky.length = 0;
    ro.disconnect();
    platno.remove();
    api.aktivni = false;
  }
  omezit.addEventListener?.("change", () => { if (omezit.matches) vypni(); });
  const api = { aktivni: true, vystrel, vypni, get pocet() { return kapky.length; } };
  return api;
}
