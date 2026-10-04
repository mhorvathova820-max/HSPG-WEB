/* H-BOT – plovoucí pomocník hspg.cz (zavaděč).
   Hned vykreslí jen tlačítko (desktop) a spodní lištu (mobil). Panel (/assets/hbot-panel.js) se načte
   až při prvním zájmu – najetí, fokus, dotyk nebo klik – takže první načtení stránky nezpomalí.
   Zákazník: okamžité odpovědi z ověřených FAQ, a když je AI zapnutá, odpovědi spolupracujících AI.
   Majitel (po přihlášení v panelu): „Vše ve tvých rukách“ – všechny AI najednou nebo ve spolupráci.
   Web funguje i bez AI a bez JavaScriptu (telefon a /akce/ jsou obyčejné odkazy v HTML stránek). */
(function () {
  'use strict';
  var d = document;
  if (d.getElementById('hbot-btn')) return;
  if ((d.documentElement.lang || '').indexOf('en') === 0) return; // obsah je česky; /en odkazuje na český formulář

  var TEL = '+420736618486';
  var majitel = false;
  try { majitel = Number(sessionStorage.getItem('hspg-majitel-platnost') || 0) > Date.now(); } catch (e) {}

  // Kritické styly tlačítka a lišty; styly panelu přijdou s panelem (/assets/hbot.css).
  var css = d.createElement('style');
  css.id = 'hbot-zaklad';
  css.textContent =
    // Stříbrné tlačítko s gravírovaným textem (zadání majitele 4. 10.): leštěná plaketa, text zapuštěný do kovu.
    '#hbot-btn{--hb-stribro:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,0) 46%),linear-gradient(100deg,#d9dee2 0%,#f6f8f9 18%,#c2c8ce 38%,#e9ecef 55%,#b4bbc2 74%,#dfe3e7 100%);--hb-hrana:inset 0 0 0 1px rgba(255,255,255,.75),inset 0 0 0 3px rgba(125,133,142,.35),inset 0 0 0 4px rgba(255,255,255,.5),inset 0 -2px 3px rgba(0,0,0,.18);--hb-stin:0 12px 30px -10px rgba(0,0,0,.8),0 2px 5px rgba(0,0,0,.4);' +
    'position:fixed;left:18px;bottom:18px;z-index:62;display:flex;align-items:center;min-height:56px;padding:0 7px;border-radius:999px;border:1px solid #6f7780;background:var(--hb-stribro);color:#2b3138;font:800 12px Manrope,Inter,system-ui,sans-serif;letter-spacing:.13em;text-transform:uppercase;text-shadow:0 1px 0 rgba(255,255,255,.9),0 -1px 0 rgba(0,0,0,.34);cursor:pointer;box-shadow:var(--hb-hrana),var(--hb-stin);isolation:isolate;transition:box-shadow .3s ease,transform .2s ease,opacity .3s ease}' +
    // Světlo obíhající po obvodu (barva kapek z loga) – jen při najetí nebo fokusu.
    '#hbot-btn::before{content:"";position:absolute;inset:-4px;z-index:-1;border-radius:inherit;padding:2px;background:conic-gradient(from var(--hb-uhel,0deg),transparent 0 74%,#7addff 88%,transparent 97%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:0;transition:opacity .3s ease;pointer-events:none}' +
    '#hbot-btn:hover,#hbot-btn:focus-visible{box-shadow:var(--hb-hrana),0 0 0 1px rgba(122,221,255,.5),0 0 24px rgba(66,120,168,.85),var(--hb-stin)}' +
    '#hbot-btn:hover::before,#hbot-btn:focus-visible::before{opacity:1}' +
    '#hbot-btn:active{transform:translateY(1px);box-shadow:inset 0 2px 6px rgba(0,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.5),0 4px 12px -6px rgba(0,0,0,.8)}' +
    '@property --hb-uhel{syntax:"<angle>";inherits:false;initial-value:0deg}' +
    '@media (prefers-reduced-motion:no-preference){#hbot-btn:hover::before,#hbot-btn:focus-visible::before{animation:hb-nit 2.4s linear infinite}@keyframes hb-nit{to{--hb-uhel:360deg}}}' +
    // Medailon s logem zasazený do stříbra.
    '#hbot-btn img{flex:none;width:42px;height:42px;border-radius:50%;object-fit:cover;object-position:center top;box-shadow:0 0 0 1px #4d555d,0 0 0 2px rgba(255,255,255,.8)}' +
    // Gravírovaný text: sbalí se do medailonu (viz třída hb-sbaleno níže), rozbalí při najetí a fokusu.
    '#hbot-btn .hb-btn-text{display:block;overflow:hidden;white-space:nowrap;max-width:300px;margin:0 17px 0 11px;transition:max-width .35s ease,margin .35s ease,opacity .25s ease}' +
    // Odznak AI majitele: safírový kámen (modrá z křídla v logu).
    '#hbot-btn .hb-odznak{flex:none;margin-right:12px;font:800 10px Manrope,Inter,system-ui,sans-serif;font-style:normal;letter-spacing:.06em;padding:3px 7px;border-radius:999px;color:#eaf6ff;text-shadow:0 -1px 0 rgba(0,0,0,.45);background:linear-gradient(180deg,#4f8fca,#1b406d 60%,#10284d);box-shadow:inset 0 1px 0 rgba(255,255,255,.45),0 0 0 1px #0c1f3c,0 1px 0 rgba(255,255,255,.8)}' +
    '#hbot-btn .hb-btn-text+.hb-odznak{margin-left:-6px}' +
    '#hbot-btn:focus-visible{outline:2px solid #04060b;outline-offset:2px;box-shadow:var(--hb-hrana),0 0 0 6px #7addff,var(--hb-stin)}' +
    // Do 1499 px se text po odrolování sbalí, aby tlačítko nepřekrývalo obsah; od 1500 px je vidět stále.
    '@media (max-width:1499px){#hbot-btn.hb-sbaleno:not(:hover):not(:focus-visible) .hb-btn-text{max-width:0;margin:0;opacity:0}#hbot-btn.hb-sbaleno:not(:hover):not(:focus-visible) .hb-odznak{margin:0 5px 0 8px}}' +
    '@media (prefers-reduced-motion:reduce){#hbot-btn,#hbot-btn .hb-btn-text{transition:none}}' +
    '@media (forced-colors:active){#hbot-btn{border:1px solid ButtonText;background:ButtonFace;color:ButtonText;text-shadow:none}}' +
    '#hspg-lista{display:none}' +
    '@media (max-width:760px){#hbot-btn,#cta-stack{display:none !important}' +
    '#hspg-lista{position:fixed;left:0;right:0;bottom:0;z-index:61;display:flex;gap:6px;padding:8px 8px calc(8px + env(safe-area-inset-bottom));background:rgba(10,15,26,.95);border-top:1px solid rgba(201,169,98,.45);backdrop-filter:blur(12px);box-shadow:0 -14px 34px -18px rgba(0,0,0,.9);transition:transform .3s ease,visibility 0s}' +
    '#hspg-lista a,#hspg-lista button{display:flex;align-items:center;justify-content:center;gap:6px;min-height:48px;padding:0 8px;border-radius:12px;font:800 14px Manrope,Inter,system-ui,sans-serif;letter-spacing:.2px;text-decoration:none;cursor:pointer;white-space:nowrap;flex:1 1 auto;min-width:0}' +
    '#hspg-lista svg{width:18px;height:18px;flex:none}' +
    '#hspg-lista .hl-tel{color:#f4e4b8;border:1px solid rgba(201,169,98,.55);background:transparent}' +
    '#hspg-lista .hl-bot{color:#2b3138;border:1px solid #6f7780;background:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,0) 46%),linear-gradient(100deg,#d9dee2 0%,#f6f8f9 18%,#c2c8ce 38%,#e9ecef 55%,#b4bbc2 74%,#dfe3e7 100%);text-shadow:0 1px 0 rgba(255,255,255,.9),0 -1px 0 rgba(0,0,0,.3);box-shadow:inset 0 0 0 1px rgba(255,255,255,.75),inset 0 -2px 3px rgba(0,0,0,.18)}' +
    '#hspg-lista .hl-cena{color:#16181c;background:linear-gradient(160deg,#f4e4b8,#c9a962 55%,#9a7a3d);border:0}' +
    '#hspg-lista a:focus-visible,#hspg-lista button:focus-visible{outline:2px solid #fff3c4;outline-offset:2px}' +
    'body{padding-bottom:calc(66px + env(safe-area-inset-bottom))}' +
    'body.hero-cta-na-obrazovce #hspg-lista{transform:translateY(110%);visibility:hidden;transition:transform .3s ease,visibility 0s linear .3s}}' +
    '@media (max-width:360px){#hspg-lista a,#hspg-lista button{font-size:13px}}' +
    '@media (max-width:370px){#hspg-lista svg{display:none}}' +
    '@media (prefers-reduced-motion:reduce){#hspg-lista{transition:none}}' +
    // Nouzové minimum pro panel, kdyby se hbot.css nenačetl (hbot.css ho pak přepíše).
    '#hbot{position:fixed;left:18px;bottom:82px;z-index:95;display:flex;flex-direction:column;width:min(420px,calc(100vw - 32px));max-height:80dvh;overflow:hidden;background:#0d0f12;color:#e9edf3;border:1px solid #c9a227;border-radius:16px;font:15px/1.5 Inter,system-ui,sans-serif}#hbot[hidden],#hbot [hidden]{display:none}#hbot .hb-view{flex:1;min-height:0;display:flex;flex-direction:column}#hbot .hb-view[hidden]{display:none}#hbot .hb-log{flex:1;min-height:0;overflow-y:auto;padding:12px}#hbot .hb-skryte{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}#hbot input{font-size:16px}' +
    '@media print{#hbot,#hbot-btn,#hbot-zaloha,#hspg-lista{display:none !important}}';
  d.head.appendChild(css);

  var btn = d.createElement('button');
  btn.id = 'hbot-btn'; btn.type = 'button';
  btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-controls', 'hbot'); btn.setAttribute('aria-haspopup', 'dialog');
  function popisTlacitka(m) {
    btn.innerHTML = '<img src="/assets/v/logo-160.webp" alt="" width="38" height="38"><span class="hb-btn-text">' +
      (m ? 'Vše ve tvých rukách' : 'Budoucnost ve Vašich rukách') + '</span>' + (m ? '<i class="hb-odznak" aria-hidden="true">AI</i>' : '');
    btn.setAttribute('aria-label', m ? 'Vše ve tvých rukách – AI panel majitele' : 'Budoucnost ve Vašich rukách – zeptejte se holuba H-BOT');
  }
  popisTlacitka(majitel);

  var lista = d.createElement('nav');
  lista.id = 'hspg-lista'; lista.setAttribute('aria-label', 'Rychlý kontakt');
  var naAkci = /^\/akce\/?$/.test(location.pathname) && d.getElementById('poptavka');
  // Ikony jako SVG: na všech systémech vypadají stejně (emoji kreslí každý telefon jinak).
  var IKONA = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>'; };
  lista.innerHTML =
    '<a class="hl-tel" href="tel:' + TEL + '">' + IKONA('M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z') + 'Zavolat</a>' +
    '<button type="button" class="hl-bot" aria-controls="hbot" aria-expanded="false" aria-haspopup="dialog">' + IKONA('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z') + 'Zeptat se</button>' +
    '<a class="hl-cena" href="' + (naAkci ? '#poptavka' : '/akce/') + '">' + IKONA('M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8zM7 7h.01') + 'Cena do 24 h</a>';

  d.body.appendChild(btn);
  d.body.appendChild(lista);

  // Gravírovaný text je vidět od chvíle, kdy se tlačítko objeví; po dalších 600 px rolování se sbalí do medailonu
  // (jen do šířky 1499 px, viz CSS). Na úvodní stránce je tlačítko skryté, dokud je vidět výzva v úvodu
  // (body.hero-cta-na-obrazovce) – počítá se proto až od jeho zobrazení.
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
  function zalozni(zdroj) {
    var b = d.getElementById('hbot-zaloha');
    if (!b) {
      b = d.createElement('div');
      b.id = 'hbot-zaloha'; b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', 'Kontakt'); b.tabIndex = -1;
      b.style.cssText = 'position:fixed;left:16px;right:16px;bottom:84px;z-index:96;max-width:360px;padding:16px;border-radius:14px;border:1px solid #c9a227;background:#0d0f12;color:#f4e4b8;font:600 15px/1.45 Manrope,Inter,system-ui,sans-serif;box-shadow:0 18px 50px -12px rgba(0,0,0,.85)';
      var a = 'display:block;margin-top:10px;padding:12px;border-radius:10px;text-align:center;font-weight:800;text-decoration:none;';
      b.innerHTML = '<p style="margin:0">Pomocníka se teď nepodařilo načíst. Ozvěte se nám napřímo:</p>' +
        '<a style="' + a + 'background:#c9a227;color:#16181c" href="tel:' + TEL + '">Zavolat ' + TEL + '</a>' +
        '<a style="' + a + 'border:1px solid #c9a227;color:#f4e4b8" href="/akce/">Poptávka – cena do 24 h</a>' +
        '<button type="button" data-znovu style="' + a + 'width:100%;border:0;background:transparent;color:#f4e4b8;cursor:pointer;font:inherit">Zkusit znovu</button>' +
        '<button type="button" data-zavrit style="' + a + 'width:100%;border:0;background:transparent;color:#cbd5e1;cursor:pointer;font:inherit">Zavřít</button>';
      b.addEventListener('click', function (e) {
        var t = e.target.closest('button');
        if (!t) return;
        b.hidden = true;
        if (t.hasAttribute('data-znovu')) otevri({ currentTarget: b._zdroj });
        else vratFokus(b);
      });
      b.addEventListener('keydown', function (e) { if (e.key === 'Escape') { b.hidden = true; vratFokus(b); } });
      d.body.appendChild(b);
    }
    // Zdroj si okno pamatuje při každém otevření (ne jen při prvním) – fokus se vrací na viditelné tlačítko.
    b._zdroj = viditelne(zdroj) ? zdroj : [btn, botLista].filter(viditelne)[0] || null;
    b.hidden = false;
    b.focus();
  }
  function otevri(e) {
    var zdroj = e && e.currentTarget;
    nactiPanel()
      .then(function (h) { var z = d.getElementById('hbot-zaloha'); if (z) z.hidden = true; h.prepni(zdroj); })
      .catch(function () { zalozni(zdroj); });
  }

  var botLista = lista.querySelector('.hl-bot');
  [btn, botLista].forEach(function (el) {
    el.addEventListener('click', otevri);
    el.addEventListener('pointerenter', predem, { once: true });
    el.addEventListener('focus', predem, { once: true });
    el.addEventListener('touchstart', predem, { once: true, passive: true });
  });

  // Rozhraní pro panel: přepnutí popisku po přihlášení/odhlášení majitele a stav aria-expanded.
  window.HSPG_HBOT_ZAVADEC = {
    tlacitka: [btn, botLista],
    majitel: function (m) { popisTlacitka(m); },
    otevreno: function (o) {
      btn.setAttribute('aria-expanded', o ? 'true' : 'false');
      botLista.setAttribute('aria-expanded', o ? 'true' : 'false');
    }
  };
  // Odkaz s #hbot (např. z e-mailu nebo z interního panelu) otevře pomocníka rovnou.
  if (location.hash === '#hbot' || location.hash === '#majitel') otevri();
})();
