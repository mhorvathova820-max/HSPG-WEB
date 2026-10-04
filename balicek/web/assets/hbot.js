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
    '#hbot-btn{position:fixed;left:18px;bottom:18px;z-index:62;display:flex;align-items:center;gap:10px;min-height:52px;padding:0 18px 0 8px;border-radius:999px;border:1px solid #c9a227;background:#0d0f12;color:#f4e4b8;font:800 14px Manrope,Inter,system-ui,sans-serif;letter-spacing:.3px;cursor:pointer;box-shadow:0 14px 40px -14px rgba(0,0,0,.8);isolation:isolate;transition:box-shadow .3s ease}' +
    '#hbot-btn::before{content:"";position:absolute;inset:-3px;z-index:-1;border-radius:inherit;padding:2px;background:conic-gradient(from var(--hb-uhel,0deg),transparent 0 78%,#00f0ff 88%,transparent 96%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:0;transition:opacity .3s ease;pointer-events:none}' +
    '#hbot-btn:hover,#hbot-btn:focus-visible{box-shadow:0 0 20px rgba(0,240,255,.55),0 14px 40px -14px rgba(0,0,0,.8)}' +
    '#hbot-btn:hover::before,#hbot-btn:focus-visible::before{opacity:1}' +
    '@property --hb-uhel{syntax:"<angle>";inherits:false;initial-value:0deg}' +
    '@media (prefers-reduced-motion:no-preference){#hbot-btn:hover::before,#hbot-btn:focus-visible::before{animation:hb-nit 2.4s linear infinite}@keyframes hb-nit{to{--hb-uhel:360deg}}}' +
    '#hbot-btn img{width:38px;height:38px;border-radius:50%;object-fit:cover;object-position:center top;border:1px solid rgba(201,169,98,.6)}' +
    '#hbot-btn .hb-odznak{font:800 10px Manrope,Inter,system-ui,sans-serif;font-style:normal;padding:2px 6px;border-radius:999px;background:#22d3ee;color:#0b1114}' +
    '#hbot-btn:focus-visible{outline:2px solid #fff3c4;outline-offset:2px}' +
    '@media (max-width:1499px){#hbot-btn .hb-btn-text{display:none}#hbot-btn{padding:0 7px}}' +
    '#hspg-lista{display:none}' +
    '@media (max-width:760px){#hbot-btn,#cta-stack{display:none !important}' +
    '#hspg-lista{position:fixed;left:0;right:0;bottom:0;z-index:61;display:flex;gap:6px;padding:8px 8px calc(8px + env(safe-area-inset-bottom));background:rgba(10,15,26,.95);border-top:1px solid rgba(201,169,98,.45);backdrop-filter:blur(12px);box-shadow:0 -14px 34px -18px rgba(0,0,0,.9);transition:transform .3s ease,visibility 0s}' +
    '#hspg-lista a,#hspg-lista button{display:flex;align-items:center;justify-content:center;gap:6px;min-height:48px;padding:0 8px;border-radius:12px;font:800 14px Manrope,Inter,system-ui,sans-serif;letter-spacing:.2px;text-decoration:none;cursor:pointer;white-space:nowrap;flex:1 1 auto;min-width:0}' +
    '#hspg-lista svg{width:18px;height:18px;flex:none}' +
    '#hspg-lista .hl-tel{color:#f4e4b8;border:1px solid rgba(201,169,98,.55);background:transparent}' +
    '#hspg-lista .hl-bot{color:#f4e4b8;border:1px solid rgba(201,169,98,.55);background:rgba(201,169,98,.12)}' +
    '#hspg-lista .hl-cena{color:#16181c;background:linear-gradient(160deg,#f4e4b8,#c9a962 55%,#9a7a3d);border:0}' +
    '#hspg-lista a:focus-visible,#hspg-lista button:focus-visible{outline:2px solid #fff3c4;outline-offset:2px}' +
    'body{padding-bottom:calc(66px + env(safe-area-inset-bottom))}' +
    'body.hero-cta-na-obrazovce #hspg-lista{transform:translateY(110%);visibility:hidden;transition:transform .3s ease,visibility 0s linear .3s}}' +
    '@media (max-width:360px){#hspg-lista a,#hspg-lista button{font-size:13px}}' +
    '@media (max-width:370px){#hspg-lista svg{display:none}}' +
    '@media (prefers-reduced-motion:reduce){#hspg-lista{transition:none}}';
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

  var nacitani = null;
  function nactiPanel() {
    if (window.HSPG_HBOT) return Promise.resolve(window.HSPG_HBOT);
    if (nacitani) return nacitani;
    nacitani = new Promise(function (ok, chyba) {
      var s = d.createElement('script');
      s.src = '/assets/hbot-panel.js'; s.async = true;
      s.onload = function () { window.HSPG_HBOT ? ok(window.HSPG_HBOT) : chyba(new Error('panel')); };
      s.onerror = function () { nacitani = null; chyba(new Error('panel')); };
      d.head.appendChild(s);
    });
    return nacitani;
  }
  function predem() { nactiPanel().catch(function () {}); }
  function otevri(e) {
    var zdroj = e && e.currentTarget;
    nactiPanel()
      .then(function (h) { h.prepni(zdroj); })
      // Když se panel nenačte (výpadek sítě), návštěvník skončí u poptávky, ne u mrtvého tlačítka.
      .catch(function () { location.href = '/akce/'; });
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
