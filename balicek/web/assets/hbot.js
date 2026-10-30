/* H-BOT – plovoucí pomocník hspg.cz (zavaděč, verze 5 „Apex“ – rozhodnutí majitele 22. 10. 2026, R18).
   Hned vykreslí jen plaketu se zlatým origami holubem nad střechou (počítač) a spodní lištu (mobil).
   Panel (/assets/hbot-panel.js) se načte až při prvním zájmu – najetí, fokus, dotyk nebo klik – takže první
   načtení stránky nezpomalí. Zákazník: okamžitá orientační cena (kalkulace z ceníku, bez AI), odpovědi
   z ověřených FAQ, a když je AI zapnutá, odpovědi spolupracujících AI. Majitel (po přihlášení v panelu):
   „Vše ve tvých rukách“. Web funguje i bez AI a bez JavaScriptu (telefon a /akce/ jsou obyčejné odkazy).
   Holub je kreslený vlastní 3D projekcí do <canvas> (žádná knihovna); při prefers-reduced-motion se nehýbe. */
(function () {
  'use strict';
  var d = document;
  if (d.getElementById('hbot-btn')) return;
  if ((d.documentElement.lang || '').indexOf('en') === 0) return; // obsah je česky; /en odkazuje na český formulář

  var TEL = '+420736618486';
  var majitel = false;
  try { majitel = Number(sessionStorage.getItem('hspg-majitel-platnost') || 0) > Date.now(); } catch (e) {}
  var KLID = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------------------------------------------------------------------------------------------
  // Zlatý origami holub nad střechou: vlastní 3D projekce do Canvas 2D (asi 40 faset, žádná knihovna).
  // Model: x dopředu (zobák), y nahoru, z doprava (pravé křídlo). Sdílí ho panel (znak) a hejno.
  // ---------------------------------------------------------------------------------------------
  var HOLUB = (function () {
    var V = {
      zobak: [0.97, 0.44, 0], celo: [0.73, 0.61, 0], krk: [0.46, 0.49, 0],
      hlavaL: [0.69, 0.45, -0.11], hlavaP: [0.69, 0.45, 0.11],
      hrud: [0.58, 0.07, 0], kyl: [0.08, -0.22, 0], hrbet: [0.02, 0.38, 0],
      bokL: [0.24, 0.14, -0.29], bokP: [0.24, 0.14, 0.29],
      zadL: [-0.40, 0.16, -0.14], zadP: [-0.40, 0.16, 0.14], kostrc: [-0.48, 0.26, 0], bricho: [-0.36, 0.02, 0],
      ocasS: [-0.98, 0.28, 0], ocasL: [-0.90, 0.22, -0.38], ocasP: [-0.90, 0.22, 0.38]
    };
    // Pravé křídlo (levé je zrcadlové): kořen vpředu a vzadu, loket, špička, zadní hrana.
    var K = { koren: [0.30, 0.30, 0.12], korenZ: [-0.28, 0.26, 0.10], loket: [0.12, 0.46, 0.72], spicka: [-0.50, 0.58, 1.36], hrana: [-0.44, 0.34, 0.66] };
    var TELO = [
      ['zobak', 'celo', 'hlavaP'], ['zobak', 'hlavaL', 'celo'], ['zobak', 'hlavaP', 'hrud'], ['zobak', 'hrud', 'hlavaL'],
      ['celo', 'krk', 'hlavaP'], ['celo', 'hlavaL', 'krk'],
      ['krk', 'hrbet', 'bokP'], ['krk', 'bokL', 'hrbet'], ['krk', 'bokP', 'hlavaP'], ['krk', 'hlavaL', 'bokL'],
      ['hlavaP', 'bokP', 'hrud'], ['hlavaL', 'hrud', 'bokL'], ['hrud', 'bokP', 'kyl'], ['hrud', 'kyl', 'bokL'],
      ['hrbet', 'kostrc', 'zadP'], ['hrbet', 'zadL', 'kostrc'], ['hrbet', 'zadP', 'bokP'], ['hrbet', 'bokL', 'zadL'],
      ['bokP', 'zadP', 'kyl'], ['bokL', 'kyl', 'zadL'], ['kyl', 'zadP', 'bricho'], ['kyl', 'bricho', 'zadL'],
      ['kostrc', 'ocasS', 'ocasP'], ['kostrc', 'ocasL', 'ocasS'], ['zadP', 'ocasP', 'bricho'], ['zadL', 'bricho', 'ocasL'],
      ['kostrc', 'ocasP', 'zadP'], ['kostrc', 'zadL', 'ocasL'], ['bricho', 'ocasP', 'ocasS'], ['bricho', 'ocasS', 'ocasL']
    ];
    var KRIDLO = [['koren', 'loket', 'hrana'], ['koren', 'hrana', 'korenZ'], ['loket', 'spicka', 'hrana']];
    // Tekuté zlato: tma → plné zlato #D4AF37 → světlé zlato → odlesk.
    var ZLATO = [[0, [40, 28, 6]], [0.28, [110, 82, 14]], [0.52, [184, 146, 38]], [0.7, [216, 178, 62]], [0.86, [240, 214, 130]], [1, [255, 243, 196]]];
    function zlato(i) {
      i = i < 0 ? 0 : i > 1 ? 1 : i;
      for (var k = 1; k < ZLATO.length; k++) {
        if (i <= ZLATO[k][0]) {
          var a = ZLATO[k - 1], b = ZLATO[k], u = (i - a[0]) / (b[0] - a[0]);
          return 'rgb(' + Math.round(a[1][0] + (b[1][0] - a[1][0]) * u) + ',' + Math.round(a[1][1] + (b[1][1] - a[1][1]) * u) + ',' + Math.round(a[1][2] + (b[1][2] - a[1][2]) * u) + ')';
        }
      }
      return 'rgb(255,243,196)';
    }
    function norm(v) { var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; }
    function kolemX(p, uhel, osaY) {
      var c = Math.cos(uhel), s = Math.sin(uhel), y = p[1] - osaY;
      return [p[0], osaY + y * c - p[2] * s, y * s + p[2] * c];
    }
    // Mávnutí: vnější část křídla (loket → špička) se ohýbá víc; mav > 0 = křídla nahoru.
    function kridlo(strana, mav) {
      var b = {};
      for (var k in K) {
        var p = K[k], podil = Math.min(1, Math.abs(p[2]) / 1.36);
        var q = kolemX(p, -mav * (0.55 + 0.75 * podil), 0.28);
        b[k] = [q[0], q[1], q[2] * strana];
      }
      return b;
    }

    /** o = { x, y (střed v px plátna), meritko (px na jednotku), mav, cas (s), stoupani, naklon, yaw, pitch,
     *        strecha (bool), hreben (výška hřebene), strechaVelikost, uhel (natočení v rovině), zrcadlo, pruhlednost } */
    function kresli(ctx, o) {
      var yaw = o.yaw != null ? o.yaw : -0.42, pitch = o.pitch != null ? o.pitch : 0.32, roll = o.naklon || 0;
      var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
      var D = 6.5, f = o.meritko * D, vyska = o.stoupani || 0, cas = o.cas || 0;
      var svetlo = norm([-0.45 + 0.3 * Math.sin(cas * 0.9), 0.85, 0.55 + 0.25 * Math.cos(cas * 0.6)]);
      var pul = norm([svetlo[0], svetlo[1], svetlo[2] + 1]);
      function pohled(p, ptak) {
        var x = p[0], y = p[1], z = p[2];
        if (ptak) { var y2 = y * cr - z * sr; z = y * sr + z * cr; y = y2 + vyska; }
        var x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
        return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
      }
      function promitni(v) { var k = f / (D - v[2]); return [v[0] * k, -v[1] * k]; }

      ctx.save();
      ctx.translate(o.x, o.y);
      if (o.uhel) ctx.rotate(o.uhel);
      if (o.zrcadlo) ctx.scale(-1, 1);
      ctx.globalAlpha = o.pruhlednost == null ? 1 : o.pruhlednost;
      ctx.lineJoin = 'round';

      if (o.strecha) {
        // Sedlová střecha domu, štít k divákovi: obsidiánové plochy, zlaté hrany, světlo putující po hřebeni.
        var rs = o.strechaVelikost || 1, H = o.hreben != null ? o.hreben : -0.95, W = 1.05 * rs, E = H - 0.62 * rs, L = 0.95 * rs;
        var r = function (x, y, z) { return promitni(pohled([x, y, z], false)); };
        var plocha = function (body, vypln) {
          ctx.beginPath(); ctx.moveTo(body[0][0], body[0][1]);
          for (var j = 1; j < body.length; j++) ctx.lineTo(body[j][0], body[j][1]);
          ctx.closePath(); ctx.fillStyle = vypln; ctx.fill();
        };
        var cara = function (a, b, styl, tl) { ctx.strokeStyle = styl; ctx.lineWidth = tl; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
        var prechod = function (a, b, c1, c2) { var g = ctx.createLinearGradient(a[0], a[1], b[0], b[1]); g.addColorStop(0, c1); g.addColorStop(1, c2); return g; };
        var hz = r(0, H, -L), hp = r(0, H, L), lz = r(-W, E, -L), lp = r(-W, E, L), pz = r(W, E, -L), pp = r(W, E, L);
        var zl = r(-W, E - 0.36 * rs, L), zp = r(W, E - 0.36 * rs, L);
        plocha([lp, pp, zp, zl], prechod([0, lp[1]], [0, zl[1]], 'rgba(17,24,39,.9)', 'rgba(5,7,15,0)'));
        plocha([hz, hp, lp, lz], prechod(hz, lp, 'rgba(36,46,64,.98)', 'rgba(10,14,24,.98)'));
        plocha([hz, pz, pp, hp], prechod(hz, pp, 'rgba(58,70,92,.98)', 'rgba(16,21,34,.98)'));
        plocha([hp, pp, lp], prechod([0, hp[1]], [0, lp[1]], 'rgba(20,27,42,.99)', 'rgba(8,11,20,.99)'));
        var tl = Math.max(0.5, o.meritko * 0.01);
        for (var k3 = 1; k3 < 4; k3++) {
          var u = k3 / 4, yy = H + (E - H) * u;
          cara(r(-W * u, yy, -L), r(-W * u, yy, L), 'rgba(212,175,55,.16)', tl);
          cara(r(W * u, yy, -L), r(W * u, yy, L), 'rgba(212,175,55,.22)', tl);
        }
        var th = Math.max(0.8, o.meritko * 0.018);
        cara(lz, lp, 'rgba(212,175,55,.45)', th); cara(pz, pp, 'rgba(212,175,55,.55)', th);
        cara(hp, lp, 'rgba(232,200,90,.85)', th); cara(hp, pp, 'rgba(232,200,90,.85)', th);
        cara(hz, lz, 'rgba(212,175,55,.3)', th); cara(hz, pz, 'rgba(212,175,55,.3)', th);
        var s = (cas * 0.22) % 1, gh = ctx.createLinearGradient(hz[0], hz[1], hp[0], hp[1]);
        gh.addColorStop(0, '#8a6a12'); gh.addColorStop(Math.max(0, s - 0.2), '#d4af37'); gh.addColorStop(s, '#fff3c4');
        gh.addColorStop(Math.min(1, s + 0.2), '#d4af37'); gh.addColorStop(1, '#b8922c');
        ctx.lineCap = 'round';
        cara(hz, hp, gh, Math.max(1.1, o.meritko * 0.03));
        var od = r(0.05, H - 0.05, 0.1), go = ctx.createRadialGradient(od[0], od[1], 0, od[0], od[1], o.meritko * 0.5);
        go.addColorStop(0, 'rgba(246,231,168,' + Math.max(0.06, 0.24 - Math.abs(vyska) * 0.5).toFixed(3) + ')'); go.addColorStop(1, 'rgba(246,231,168,0)');
        ctx.fillStyle = go; ctx.beginPath(); ctx.ellipse(od[0], od[1], o.meritko * 0.5, o.meritko * 0.16, 0, 0, Math.PI * 2); ctx.fill();
      }

      // Fasety ptáka odzadu dopředu; papír je oboustranný (normála vždy k divákovi).
      var tvary = [], ptak = {}, k;
      for (k in V) ptak[k] = pohled(V[k], true);
      TELO.forEach(function (t) { tvary.push([ptak[t[0]], ptak[t[1]], ptak[t[2]]]); });
      [1, -1].forEach(function (strana) {
        var kr = kridlo(strana, o.mav || 0), q = {};
        for (var k2 in kr) q[k2] = pohled(kr[k2], true);
        KRIDLO.forEach(function (t) { tvary.push([q[t[0]], q[t[1]], q[t[2]]]); });
      });
      var tloustka = Math.max(0.45, o.meritko * 0.011);
      tvary.map(function (t) {
        var a = t[0], b = t[1], c = t[2];
        var u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
        var n = norm([u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]);
        if (n[2] < 0) n = [-n[0], -n[1], -n[2]];
        var dif = Math.max(0, n[0] * svetlo[0] + n[1] * svetlo[1] + n[2] * svetlo[2]);
        var lesk = Math.pow(Math.max(0, n[0] * pul[0] + n[1] * pul[1] + n[2] * pul[2]), 28);
        return { p: [promitni(a), promitni(b), promitni(c)], z: (a[2] + b[2] + c[2]) / 3, i: 0.16 + 0.62 * dif + 0.42 * lesk };
      }).sort(function (x, y) { return x.z - y.z; }).forEach(function (t) {
        ctx.beginPath(); ctx.moveTo(t.p[0][0], t.p[0][1]); ctx.lineTo(t.p[1][0], t.p[1][1]); ctx.lineTo(t.p[2][0], t.p[2][1]); ctx.closePath();
        ctx.fillStyle = zlato(t.i); ctx.fill();
        ctx.strokeStyle = 'rgba(255,240,190,' + (0.18 + 0.4 * Math.min(1, t.i)).toFixed(3) + ')';
        ctx.lineWidth = tloustka; ctx.stroke();
      });
      ctx.restore();
    }
    return { kresli: kresli };
  })();

  // Plátno v rozlišení displeje (nejvýš 2,5×, ať to na 4K nežere výkon).
  function platno(sirka, vyska, trida) {
    var c = d.createElement('canvas'), r = Math.min(2.5, window.devicePixelRatio || 1);
    c.width = Math.round(sirka * r); c.height = Math.round(vyska * r);
    c.style.width = sirka + 'px'; c.style.height = vyska + 'px';
    if (trida) c.className = trida;
    c.setAttribute('aria-hidden', 'true');
    c._r = r;
    return c;
  }

  // Ikony jako SVG: na všech systémech vypadají stejně (emoji kreslí každý telefon jinak).
  var IKONA = function (cesta) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="' + cesta + '"/></svg>'; };
  // Plochý origami holub pro lištu a záložní znak (stejné tvary jako 3D model, tři odstíny zlata).
  var HOLUB_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g transform="translate(0 3)">' +
    '<polygon points="11.2,10.4 5.2,2.6 14.2,9.2" fill="#7a5a0e"/><polygon points="2.4,13.6 7.6,12.2 12.6,10.2 19.4,9.6 17.4,13.6 10.6,16.2 5.6,15.8" fill="#c99d2e"/>' +
    '<polygon points="7.6,12.2 12.6,10.2 19.4,9.6 12.8,12.8" fill="#e9c766"/><polygon points="12.6,10.2 16.6,1.8 15.2,10.2" fill="#f6e7a8"/>' +
    '<polygon points="12.6,10.2 15.2,10.2 13.4,12.6" fill="#d4af37"/><polygon points="17.6,9.7 22.2,8.4 19.6,12.2" fill="#f0d68a"/>' +
    '<polygon points="2.4,13.6 0.6,11.2 4.6,12.8" fill="#a8841e"/><polygon points="2.4,13.6 1.2,16.4 5.6,15.8" fill="#8a6a12"/></g></svg>';
  var JISKRA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>';

  // Kritické styly plakety a lišty; styly panelu přijdou s panelem (/assets/hbot.css).
  var css = d.createElement('style');
  css.id = 'hbot-zaklad';
  css.textContent = [
    // Plaketa z obsidiánového skla se zlatou vlasovou linkou (žádné kulaté logo – R18).
    '#hbot-btn{position:fixed;left:18px;bottom:18px;z-index:62;display:flex;align-items:center;min-height:60px;padding:6px 8px 6px 6px;border-radius:18px;border:1px solid rgba(212,175,55,.42);',
    'background:linear-gradient(180deg,rgba(17,24,39,.8),rgba(5,7,15,.94));-webkit-backdrop-filter:blur(18px) saturate(1.4);backdrop-filter:blur(18px) saturate(1.4);color:#f4f1e8;cursor:pointer;isolation:isolate;',
    'box-shadow:0 22px 48px -16px rgba(0,0,0,.9),inset 0 1px 0 rgba(255,255,255,.08),inset 0 0 0 1px rgba(5,7,15,.55);transition:box-shadow .35s cubic-bezier(.2,.8,.2,1),border-color .35s,transform .25s cubic-bezier(.2,.8,.2,1)}',
    // Světlo obíhající po zlaté hraně – jen při najetí nebo fokusu.
    '#hbot-btn::before{content:"";position:absolute;inset:-2px;z-index:-1;border-radius:inherit;padding:1.5px;background:conic-gradient(from var(--hb-uhel,0deg),transparent 0 70%,#f6e7a8 84%,#d4af37 90%,transparent 97%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:0;transition:opacity .35s;pointer-events:none}',
    '#hbot-btn:hover,#hbot-btn:focus-visible{border-color:rgba(246,231,168,.7);box-shadow:0 0 0 1px rgba(212,175,55,.25),0 0 30px rgba(212,175,55,.28),0 22px 48px -16px rgba(0,0,0,.9),inset 0 1px 0 rgba(255,255,255,.1);transform:translateY(-1px)}',
    '#hbot-btn:hover::before,#hbot-btn:focus-visible::before{opacity:1}',
    '#hbot-btn:active{transform:translateY(1px)}',
    '@property --hb-uhel{syntax:"<angle>";inherits:false;initial-value:0deg}',
    '@media (prefers-reduced-motion:no-preference){#hbot-btn:hover::before,#hbot-btn:focus-visible::before{animation:hb-nit 2.6s linear infinite}@keyframes hb-nit{to{--hb-uhel:360deg}}}',
    '#hbot-btn .hb-holub,#hbot-btn .hb-znak-svg{flex:none;display:block;width:64px;height:46px}',
    '#hbot-btn .hb-znak-svg svg{width:46px;height:46px;margin:0 9px}',
    // Text: nadpis Playfair, nad ním zlatý štítek. Sbalí se (třída hb-sbaleno), rozbalí při najetí a fokusu.
    '#hbot-btn .hb-btn-text{display:flex;flex-direction:column;align-items:flex-start;overflow:hidden;white-space:nowrap;max-width:300px;margin:0 16px 0 6px;font:600 15px/1.2 "Playfair Display",Georgia,"Times New Roman",serif;letter-spacing:.01em;text-align:left;transition:max-width .4s cubic-bezier(.2,.8,.2,1),margin .4s cubic-bezier(.2,.8,.2,1),opacity .25s}',
    '#hbot-btn .hb-btn-text small{display:grid;margin-bottom:4px;font:800 10px/1 Manrope,Inter,system-ui,sans-serif;letter-spacing:.26em;text-transform:uppercase;color:#d4af37}',
    // Štítek během pulsu („Celý web na jednom místě“) leží ve stejné buňce jako běžný – šířka plakety se nemění.
    '#hbot-btn .hb-stitek{grid-area:1/1;white-space:nowrap;transition:opacity .45s}',
    '#hbot-btn .hb-stitek-puls{opacity:0;letter-spacing:.1em}',
    '#hbot-btn.hb-pulzuje .hb-stitek-zakl{opacity:0}#hbot-btn.hb-pulzuje .hb-stitek-puls{opacity:1}',
    // Puls „nabízím se“: dvě zlaté vlny kolem plakety a kolem „Cena hned“ na liště. Jen krátké dávky (WCAG 2.2.2,
    // viz pulsuj()), vlny jsou stín mimo tlačítko (žádný posun rozvržení), nikdy při najetí/fokusu, omezení pohybu
    // ani ve vynucených barvách.
    '.hb-puls{position:absolute;inset:0;z-index:-1;border-radius:inherit;pointer-events:none}',
    '.hb-puls::before,.hb-puls::after{content:"";position:absolute;inset:0;border-radius:inherit;opacity:0}',
    '@media (prefers-reduced-motion:no-preference){.hb-pulzuje .hb-puls::before,.hb-pulzuje .hb-puls::after{animation:hb-puls 1.8s cubic-bezier(.2,.8,.2,1) 2 both}.hb-pulzuje .hb-puls::after{animation-delay:.6s}}',
    '@keyframes hb-puls{0%{opacity:1;box-shadow:0 0 0 0 rgba(246,231,168,.7),0 0 0 0 rgba(212,175,55,.5)}75%{opacity:1}100%{opacity:0;box-shadow:0 0 0 8px rgba(246,231,168,0),0 0 0 20px rgba(212,175,55,0)}}',
    '#hbot-btn.hb-pulzuje{border-color:rgba(246,231,168,.75)}',
    '#hbot-btn:hover .hb-puls,#hbot-btn:focus-visible .hb-puls,#hspg-lista .hl-cena:focus-visible .hb-puls{display:none}',
    '@media (prefers-reduced-motion:reduce),(forced-colors:active){.hb-puls{display:none}}',
    // Odznak AI majitele: safírový kámen.
    '#hbot-btn .hb-odznak{flex:none;margin-right:10px;font:800 10px Manrope,Inter,system-ui,sans-serif;font-style:normal;letter-spacing:.06em;padding:3px 7px;border-radius:999px;color:#eaf6ff;background:linear-gradient(180deg,#4f8fca,#1b406d 60%,#10284d);box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 0 0 1px #0c1f3c}',
    '#hbot-btn .hb-btn-text+.hb-odznak{margin-left:-6px}',
    '#hbot-btn:focus-visible{outline:2px solid #f6e7a8;outline-offset:3px}',
    // Do 1499 px se text po odrolování sbalí, aby plaketa nepřekrývala obsah; od 1500 px je vidět stále.
    '@media (max-width:1499px){#hbot-btn.hb-sbaleno:not(:hover):not(:focus-visible) .hb-btn-text{max-width:0;margin:0;opacity:0}#hbot-btn.hb-sbaleno:not(:hover):not(:focus-visible) .hb-odznak{margin:0 6px 0 4px}}',
    '@media (prefers-reduced-motion:reduce){#hbot-btn,#hbot-btn .hb-btn-text{transition:none}}',
    '@media (forced-colors:active){#hbot-btn{border:1px solid ButtonText;background:ButtonFace;color:ButtonText}}',
    // Hejno při otevření (dekorace pod panelem, nikdy nepřekryje ovládání).
    '.hb-hejno{position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:94;pointer-events:none}',
    '#hspg-lista{display:none}',
    '@media (max-width:760px){#hbot-btn,#cta-stack{display:none !important}',
    '#hspg-lista{position:fixed;left:0;right:0;bottom:0;z-index:61;display:flex;gap:6px;padding:8px 8px calc(8px + env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(11,15,25,.9),rgba(5,7,15,.97));border-top:1px solid rgba(212,175,55,.38);-webkit-backdrop-filter:blur(16px) saturate(1.4);backdrop-filter:blur(16px) saturate(1.4);box-shadow:0 -16px 36px -18px rgba(0,0,0,.95);transition:transform .3s ease,visibility 0s}',
    '#hspg-lista a,#hspg-lista button{display:flex;align-items:center;justify-content:center;gap:6px;min-height:48px;padding:0 8px;border-radius:14px;font:800 14px Manrope,Inter,system-ui,sans-serif;letter-spacing:.2px;text-decoration:none;cursor:pointer;white-space:nowrap;flex:1 1 auto;min-width:0}',
    '#hspg-lista svg{width:18px;height:18px;flex:none}',
    '#hspg-lista .hl-bot svg{width:22px;height:22px}',
    '#hspg-lista .hl-tel{color:#f6e7a8;border:1px solid rgba(212,175,55,.5);background:transparent}',
    '#hspg-lista .hl-bot{color:#f4f1e8;border:1px solid rgba(212,175,55,.42);background:linear-gradient(180deg,rgba(31,41,55,.85),rgba(11,15,25,.95));box-shadow:inset 0 1px 0 rgba(255,255,255,.07)}',
    '#hspg-lista .hl-cena{position:relative;color:#17120a;border:0;background:linear-gradient(135deg,#f6e7a8 0%,#d4af37 42%,#9c7b16 100%);box-shadow:0 10px 26px -10px rgba(212,175,55,.55),inset 0 1px 0 rgba(255,255,255,.55)}',
    '#hspg-lista a:focus-visible,#hspg-lista button:focus-visible{outline:2px solid #f6e7a8;outline-offset:2px}',
    'body{padding-bottom:calc(66px + env(safe-area-inset-bottom))}',
    'body.hero-cta-na-obrazovce #hspg-lista{transform:translateY(110%);visibility:hidden;transition:transform .3s ease,visibility 0s linear .3s}}',
    '@media (max-width:360px){#hspg-lista a,#hspg-lista button{font-size:13px}}',
    '@media (max-width:370px){#hspg-lista svg{display:none}}',
    '@media (prefers-reduced-motion:reduce){#hspg-lista{transition:none}}',
    // Nouzové minimum pro panel, kdyby se hbot.css nenačetl (hbot.css ho pak přepíše).
    '#hbot{position:fixed;left:18px;bottom:88px;z-index:95;display:flex;flex-direction:column;width:min(420px,calc(100vw - 32px));max-height:80dvh;overflow:hidden;background:#0b0f19;color:#f4f1e8;border:1px solid #d4af37;border-radius:16px;font:15px/1.5 Inter,system-ui,sans-serif}#hbot[hidden],#hbot [hidden]{display:none}#hbot .hb-view{flex:1;min-height:0;display:flex;flex-direction:column}#hbot .hb-view[hidden]{display:none}#hbot .hb-log{flex:1;min-height:0;overflow-y:auto;padding:12px}#hbot .hb-skryte{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}#hbot input{font-size:16px}',
    '@media print{#hbot,#hbot-btn,#hbot-zaloha,#hspg-lista,.hb-hejno{display:none !important}}'
  ].join('');
  d.head.appendChild(css);

  // --- plaketa -----------------------------------------------------------------------------------
  var btn = d.createElement('button');
  btn.id = 'hbot-btn'; btn.type = 'button';
  btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'hbot'); btn.setAttribute('aria-haspopup', 'dialog');
  var holubPlatno = null, holubCtx = null;
  try {
    holubPlatno = platno(64, 46, 'hb-holub');
    holubCtx = holubPlatno.getContext('2d');
  } catch (e) { holubPlatno = null; }
  var znak = holubCtx ? holubPlatno : (function () { var s = d.createElement('span'); s.className = 'hb-znak-svg'; s.innerHTML = HOLUB_SVG; return s; })();
  var popisek = d.createElement('span'); popisek.className = 'hb-btn-text';
  var odznak = d.createElement('i'); odznak.className = 'hb-odznak'; odznak.setAttribute('aria-hidden', 'true'); odznak.textContent = 'AI';
  var vlny = d.createElement('span'); vlny.className = 'hb-puls'; vlny.setAttribute('aria-hidden', 'true');
  btn.appendChild(vlny); btn.appendChild(znak); btn.appendChild(popisek);
  function popisTlacitka(m) {
    // Druhý štítek se ukáže jen během pulsu; přístupný název tlačítka (aria-label) zůstává stejný.
    popisek.innerHTML = '<small><span class="hb-stitek hb-stitek-zakl">' + (m ? 'H-BOT · majitel' : 'H-BOT · cena hned') + '</span>' +
      '<span class="hb-stitek hb-stitek-puls" aria-hidden="true">Celý web na jednom místě</span></small>' + (m ? 'Vše ve tvých rukách' : 'Budoucnost ve Vašich rukách');
    if (m) btn.appendChild(odznak); else if (odznak.parentNode) odznak.parentNode.removeChild(odznak);
    btn.setAttribute('aria-label', m ? 'Vše ve tvých rukách – AI panel majitele' : 'Budoucnost ve Vašich rukách – holub H-BOT: cena hned a odpovědi na otázky');
  }
  popisTlacitka(majitel);

  // Holub na plaketě: klidový snímek hned, krátký přílet po načtení stránky, mávání při najetí/fokusu.
  function kresliPlaketu(t, mav) {
    if (!holubCtx) return;
    var r = holubPlatno._r;
    holubCtx.setTransform(1, 0, 0, 1, 0, 0);
    holubCtx.clearRect(0, 0, holubPlatno.width, holubPlatno.height);
    holubCtx.lineCap = 'butt';
    HOLUB.kresli(holubCtx, { x: 32 * r, y: 18.5 * r, meritko: 15.5 * r, mav: mav, cas: t, stoupani: 0.05 * Math.sin(t * 2.2), naklon: 0.05 * Math.sin(t * 1.4), strecha: true, hreben: -0.84, strechaVelikost: 0.72 });
  }
  var anim = { do: 0, bezi: false, najeto: false };
  function snimekPlakety(ted) {
    var t = ted / 1000, zbyva = anim.do - ted;
    if (d.hidden || (zbyva <= 0 && !anim.najeto)) { anim.bezi = false; kresliPlaketu(t, 0.22); return; }
    var sila = anim.najeto ? 1 : Math.max(0, Math.min(1, zbyva / 900));
    kresliPlaketu(t, 0.22 + 0.3 * Math.sin(t * Math.PI * 2 * 1.7) * sila);
    requestAnimationFrame(snimekPlakety);
  }
  function animuj(sekund) {
    if (KLID || !holubCtx || !window.requestAnimationFrame) return;
    anim.do = Math.max(anim.do, (window.performance ? performance.now() : Date.now()) + sekund * 1000);
    if (!anim.bezi) { anim.bezi = true; requestAnimationFrame(snimekPlakety); }
  }
  kresliPlaketu(0, 0.22);
  btn.addEventListener('pointerenter', function () { anim.najeto = true; animuj(0.1); });
  btn.addEventListener('pointerleave', function () { anim.najeto = false; animuj(1.2); });
  btn.addEventListener('focus', function () { anim.najeto = true; animuj(0.1); });
  btn.addEventListener('blur', function () { anim.najeto = false; animuj(1.2); });
  function prilet() { setTimeout(function () { animuj(3.2); }, 700); }
  if (d.readyState === 'complete') prilet(); else window.addEventListener('load', prilet, { once: true });

  // --- hejno: holubi vzlétnou z plakety (při prvním otevření a při odhalení ceny) ------------------
  function hejno(odkud) {
    if (KLID || !window.requestAnimationFrame || !odkud || !odkud.getBoundingClientRect) return;
    var o = odkud.getBoundingClientRect();
    if (!o.width || !o.height) return;
    var c, ctx;
    try { c = platno(window.innerWidth, window.innerHeight, 'hb-hejno'); ctx = c.getContext('2d'); } catch (e) { return; }
    if (!ctx) return;
    c.style.width = ''; c.style.height = '';
    d.body.appendChild(c);
    var r = c._r, sirka = window.innerWidth, vyska = window.innerHeight;
    var x0 = o.left + o.width * 0.5, y0 = o.top + o.height * 0.45, ptaci = [];
    for (var i = 0; i < 9; i++) {
      var cx = sirka * (0.3 + 0.65 * Math.random()), cyy = vyska * (0.04 + 0.42 * Math.random());
      ptaci.push({
        a: [x0, y0], b: [x0 + (cx - x0) * 0.2 + (Math.random() - 0.5) * 160, y0 - vyska * (0.25 + 0.2 * Math.random())],
        c: [cx + (Math.random() - 0.5) * 120, cyy + 60], e: [cx, cyy],
        zpozdeni: i * 0.07, trvani: 1.5 + Math.random() * 0.7, velikost: 15 + Math.random() * 9, faze: Math.random() * 6.28, f: 2.6 + Math.random() * 1.2
      });
    }
    var start = performance.now();
    function bod(p, u) { var v = 1 - u; return [v * v * v * p.a[0] + 3 * v * v * u * p.b[0] + 3 * v * u * u * p.c[0] + u * u * u * p.e[0], v * v * v * p.a[1] + 3 * v * v * u * p.b[1] + 3 * v * u * u * p.c[1] + u * u * u * p.e[1]]; }
    function snimek(ted) {
      var t = (ted - start) / 1000, zivi = 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, c.width, c.height);
      ptaci.forEach(function (p) {
        var u = (t - p.zpozdeni) / p.trvani;
        if (u >= 1) return;
        zivi++;
        if (u < 0) return;
        var e = 1 - Math.pow(1 - u, 3), q = bod(p, e), q2 = bod(p, Math.min(1, e + 0.02));
        var dx = q2[0] - q[0], dy = q2[1] - q[1], vlevo = dx < 0, uhel = Math.atan2(dy, dx);
        // Natočení podle směru letu, ale nejvýš ±30° – kolmo vzhůru by holub vypadal jako šipka.
        uhel = vlevo ? uhel - Math.PI : uhel;
        uhel = Math.atan2(Math.sin(uhel), Math.cos(uhel));
        uhel = Math.max(-0.52, Math.min(0.52, uhel));
        var alfa = u < 0.12 ? u / 0.12 : u > 0.65 ? Math.max(0, (1 - u) / 0.35) : 1;
        HOLUB.kresli(ctx, {
          x: q[0] * r, y: q[1] * r, meritko: p.velikost * r * (0.75 + 0.45 * e), mav: 0.15 + 0.6 * Math.sin(t * Math.PI * 2 * p.f + p.faze),
          cas: t + p.faze, yaw: -0.2, pitch: 0.48, uhel: uhel, zrcadlo: vlevo, pruhlednost: alfa
        });
      });
      if (zivi) requestAnimationFrame(snimek); else if (c.parentNode) c.parentNode.removeChild(c);
    }
    requestAnimationFrame(snimek);
  }

  // --- mobilní lišta -----------------------------------------------------------------------------
  var lista = d.createElement('nav');
  lista.id = 'hspg-lista'; lista.setAttribute('aria-label', 'Rychlý kontakt');
  var naAkci = /^\/akce\/?$/.test(location.pathname) && d.getElementById('poptavka');
  lista.innerHTML =
    '<a class="hl-tel" href="tel:' + TEL + '">' + IKONA('M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z') + 'Zavolat</a>' +
    '<button type="button" class="hl-bot" aria-controls="hbot" aria-expanded="false" aria-haspopup="dialog">' + HOLUB_SVG + 'Zeptat se</button>' +
    // Bez JavaScriptu (nebo když se panel nenačte) vede na poptávku; jinak otevře okamžitou kalkulaci v H-BOTovi.
    '<a class="hl-cena" href="' + (naAkci ? '#poptavka' : '/akce/') + '" data-hbot-cena><span class="hb-puls" aria-hidden="true"></span>' + JISKRA + 'Cena hned</a>';

  d.body.appendChild(btn);
  d.body.appendChild(lista);

  // Text je vidět od chvíle, kdy se plaketa objeví; po dalších 600 px rolování se sbalí k holubovi
  // (jen do šířky 1499 px, viz CSS). Na úvodní stránce je plaketa skrytá, dokud je vidět výzva v úvodu
  // (body.hero-cta-na-obrazovce) – počítá se proto až od jejího zobrazení.
  var videnOd = null, sbalCeka = false;
  function sbal() {
    sbalCeka = false;
    var y = window.pageYOffset || d.documentElement.scrollTop || 0;
    if (d.body.classList.contains('hero-cta-na-obrazovce')) { videnOd = null; return; }
    if (videnOd === null || y < videnOd) videnOd = y;
    btn.classList.toggle('hb-sbaleno', y - videnOd > 600);
  }
  window.addEventListener('scroll', function () { if (!sbalCeka) { sbalCeka = true; (window.requestAnimationFrame || setTimeout)(sbal); } }, { passive: true });
  sbal();

  // --- líné načtení panelu --------------------------------------------------------------------------
  var nacitani = null;
  function nactiPanel() {
    if (window.HSPG_HBOT) return Promise.resolve(window.HSPG_HBOT);
    if (nacitani) return nacitani;
    nacitani = new Promise(function (ok, chyba) {
      var s = d.createElement('script');
      s.src = '/assets/hbot-panel.js'; s.async = true;
      s.onload = function () { if (window.HSPG_HBOT) ok(window.HSPG_HBOT); else { nacitani = null; chyba(new Error('panel')); } };
      s.onerror = function () { nacitani = null; chyba(new Error('panel')); };
      d.head.appendChild(s);
      // Visící spojení (ztrátová mobilní síť) nesmí nechat tlačítko bez odezvy: po 6 s záložní okno.
      // Když skript dorazí později, další klik už panel otevře (hbot-panel.js se dvakrát nespustí).
      setTimeout(function () { if (!window.HSPG_HBOT) { nacitani = null; chyba(new Error('timeout')); } }, 6000);
    });
    return nacitani;
  }
  function predem() { nactiPanel().catch(function () {}); }
  // Když se panel nenačte (výpadek sítě), návštěvník dostane malé okno s telefonem a poptávkou –
  // žádné přesměrování, rozepsaný formulář na stránce nezmizí.
  function viditelne(x) { return !!(x && x.getClientRects && x.getClientRects().length && getComputedStyle(x).visibility !== 'hidden'); }
  // Kam vrátit fokus po zavření okna: zdroj, jinak začátek obsahu stránky (tlačítka mohou být schovaná).
  function vratFokus(b) {
    var cil = b._zdroj || d.querySelector('main');
    if (cil && cil === d.querySelector('main') && !cil.hasAttribute('tabindex')) cil.tabIndex = -1;
    if (cil) cil.focus({ preventScroll: true });
  }
  function zalozni(zdroj, rezim) {
    var b = d.getElementById('hbot-zaloha');
    if (!b) {
      b = d.createElement('div');
      b.id = 'hbot-zaloha'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Kontakt'); b.tabIndex = -1;
      b.style.cssText = 'position:fixed;left:16px;right:16px;bottom:84px;z-index:96;max-width:360px;padding:16px;border-radius:16px;border:1px solid rgba(212,175,55,.6);background:#0b0f19;color:#f4f1e8;font:600 15px/1.45 Manrope,Inter,system-ui,sans-serif;box-shadow:0 18px 50px -12px rgba(0,0,0,.85)';
      var a = 'display:block;margin-top:10px;padding:12px;border-radius:12px;text-align:center;font-weight:800;text-decoration:none;';
      b.innerHTML = '<p style="margin:0">Pomocníka se teď nepodařilo načíst. Ozvěte se nám napřímo:</p>' +
        '<a style="' + a + 'background:linear-gradient(135deg,#f6e7a8,#d4af37 42%,#9c7b16);color:#17120a" href="tel:' + TEL + '">Zavolat ' + TEL + '</a>' +
        '<a style="' + a + 'border:1px solid rgba(212,175,55,.6);color:#f6e7a8" href="/akce/">Poptávka – cena do 24 h</a>' +
        '<button type="button" data-znovu style="' + a + 'width:100%;border:0;background:transparent;color:#f6e7a8;cursor:pointer;font:inherit">Zkusit znovu</button>' +
        '<button type="button" data-zavrit style="' + a + 'width:100%;border:0;background:transparent;color:#cbd5e1;cursor:pointer;font:inherit">Zavřít</button>';
      b.addEventListener('click', function (e) {
        var t = e.target.closest('button');
        if (!t) return;
        b.hidden = true;
        if (t.hasAttribute('data-znovu')) otevri({ currentTarget: b._zdroj }, b._rezim);
        else vratFokus(b);
      });
      b.addEventListener('keydown', function (e) { if (e.key === 'Escape') { b.hidden = true; vratFokus(b); } });
      d.body.appendChild(b);
    }
    // Zdroj si okno pamatuje při každém otevření (ne jen při prvním) – fokus se vrací na viditelné tlačítko.
    b._zdroj = viditelne(zdroj) ? zdroj : [btn, botLista].filter(viditelne)[0] || null;
    b._rezim = rezim || null;
    b.hidden = false;
    b.focus();
  }
  // rezim 'nabidka' = rovnou okamžitá kalkulace (lišta „Cena hned“, odkazy s data-hbot-cena, #cena).
  function otevri(e, rezim) {
    var zdroj = e && e.currentTarget;
    pulsHotovo();
    nactiPanel()
      .then(function (h) {
        var z = d.getElementById('hbot-zaloha'); if (z) z.hidden = true;
        if (rezim === 'nabidka' && h.nabidka) h.nabidka(zdroj); else h.prepni(zdroj);
      })
      .catch(function () { zalozni(zdroj, rezim); });
  }

  var botLista = lista.querySelector('.hl-bot'), cenaLista = lista.querySelector('.hl-cena');
  [btn, botLista].forEach(function (el) { el.addEventListener('click', otevri); });
  [btn, botLista, cenaLista].forEach(function (el) {
    el.addEventListener('pointerenter', predem, { once: true });
    el.addEventListener('focus', predem, { once: true });
    el.addEventListener('touchstart', predem, { once: true, passive: true });
  });
  // „Cena hned“ kdekoli na webu: <a href="/akce/" data-hbot-cena>…</a> otevře kalkulaci; klik s Ctrl/Cmd
  // nebo prostředním tlačítkem dál otevře odkaz v nové kartě.
  d.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('[data-hbot-cena]');
    if (!a || e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    otevri({ currentTarget: a }, 'nabidka');
  });

  // --- puls: plaketa (a „Cena hned“ na liště) se krátce nabídne ----------------------------------------
  // WCAG 2.2.2: nikdy trvale – nejvýš tři dávky po ~4 s (3 s po načtení, pak ~30 s a ~75 s). Po prvním otevření
  // panelu už do konce relace ne (sessionStorage). Nepulzuje při najetí ani fokusu (tehdy běží obíhající světlo),
  // při omezení pohybu, ve skryté kartě, ve vynucených barvách ani majiteli. Časy jde zkrátit jen pro testy
  // (window.HSPG_HBOT_PULS = [ms, ms, ms] nastavené před načtením tohoto souboru).
  var PULS_KLIC = 'hspg-hbot-otevreno', PULS_DAVKA = 4200, PULS_ROZESTUP = 12000;
  var puls = { casovace: [], konec: 0, davek: 0, posledni: -1e9, stop: false };
  function relace(k, v) {
    try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) {}
    return null;
  }
  function plati(dotaz) { return !!(window.matchMedia && matchMedia(dotaz).matches); }
  function pulsKonec() {
    clearTimeout(puls.konec);
    btn.classList.remove('hb-pulzuje'); cenaLista.classList.remove('hb-pulzuje');
  }
  function pulsStop() { puls.stop = true; puls.casovace.forEach(clearTimeout); puls.casovace = []; pulsKonec(); }
  function pulsHotovo() { relace(PULS_KLIC, '1'); pulsStop(); }
  function pulsuj(pokus) {
    if (puls.stop || puls.davek >= 3) return;
    if (plati('(prefers-reduced-motion: reduce)')) return pulsStop();
    var hover = false;
    try { hover = btn.matches(':hover'); } catch (e) {}
    var ted = Date.now();
    var ceka = d.hidden || hover || d.activeElement === btn || d.activeElement === cenaLista || btn.getAttribute('aria-expanded') === 'true' ||
      plati('(forced-colors: active)') || ted - puls.posledni < PULS_ROZESTUP || ![btn, cenaLista].some(viditelne);
    // Teď se nehodí (skrytá karta, najetí, plaketa schovaná u hlavní výzvy) → zkusit za chvíli, nejvýš 8×.
    if (ceka) { if (pokus < 8) puls.casovace.push(setTimeout(function () { pulsuj(pokus + 1); }, 4000)); return; }
    puls.davek++; puls.posledni = ted;
    btn.classList.add('hb-pulzuje'); cenaLista.classList.add('hb-pulzuje');
    clearTimeout(puls.konec);
    puls.konec = setTimeout(pulsKonec, PULS_DAVKA);
  }
  function pulsPlan() {
    if (KLID || majitel || relace(PULS_KLIC) === '1') return;
    var casy = Array.isArray(window.HSPG_HBOT_PULS) ? window.HSPG_HBOT_PULS : [3000, 30000, 75000];
    casy.slice(0, 3).forEach(function (ms) { puls.casovace.push(setTimeout(function () { pulsuj(0); }, Math.max(0, Number(ms) || 0))); });
  }
  // Najetí, fokus nebo skrytí karty dávku hned ukončí (vlny i štítek se vrátí).
  btn.addEventListener('pointerenter', pulsKonec);
  btn.addEventListener('focus', pulsKonec);
  cenaLista.addEventListener('focus', pulsKonec);
  d.addEventListener('visibilitychange', function () { if (d.hidden) pulsKonec(); });
  if (window.matchMedia) {
    var pohybDotaz = matchMedia('(prefers-reduced-motion: reduce)');
    var priZmenePohybu = function () { if (pohybDotaz.matches) pulsStop(); };
    if (pohybDotaz.addEventListener) pohybDotaz.addEventListener('change', priZmenePohybu); else if (pohybDotaz.addListener) pohybDotaz.addListener(priZmenePohybu);
  }
  if (d.readyState === 'complete') pulsPlan(); else window.addEventListener('load', pulsPlan, { once: true });

  // Rozhraní pro panel: popisek po přihlášení majitele, aria-expanded, hejno a holub pro znak v panelu.
  var hejnoVzletlo = false;
  window.HSPG_HBOT_ZAVADEC = {
    tlacitka: [btn, botLista],
    majitel: function (m) { popisTlacitka(m); if (m) pulsStop(); },
    otevreno: function (o) {
      btn.setAttribute('aria-expanded', o ? 'true' : 'false');
      botLista.setAttribute('aria-expanded', o ? 'true' : 'false');
      if (o) pulsHotovo();
      if (o && !hejnoVzletlo) { hejnoVzletlo = true; hejno([btn, botLista].filter(viditelne)[0]); }
    },
    nabidka: function (zdroj) { otevri({ currentTarget: zdroj }, 'nabidka'); },
    hejno: hejno,
    holub: HOLUB,
    holubSvg: HOLUB_SVG,
    platno: platno,
    klid: KLID
  };
  // Odkaz s #hbot (např. z e-mailu nebo z interního panelu) otevře pomocníka rovnou, #cena rovnou kalkulaci.
  if (location.hash === '#hbot' || location.hash === '#majitel') otevri();
  else if (location.hash === '#cena') otevri(null, 'nabidka');
})();
