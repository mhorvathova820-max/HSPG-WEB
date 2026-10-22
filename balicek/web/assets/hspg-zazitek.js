/*! HSPG zážitek – zvuky a haptika webu hspg.cz (úkol 56; přání majitele 22. 10. 2026).
 * Jen syntéza Web Audio: žádné zvukové soubory, žádná síť. Každý zvuk je kratší než 450 ms, hlavní hlasitost je
 * nízká a jde přes kompresor. Pravidla:
 *  - nic nezazní ani nezavibruje při načtení, najetí myší ani rolování: AudioContext vznikne až při prvním vědomém
 *    kliknutí, klepnutí nebo stisku klávesy (aktivace uživatelem), vibrace jen během takové aktivace,
 *  - nikdy ve skryté kartě (při skrytí se zvukový výstup uspí),
 *  - výchozí stav „vypnuto“: zapíná si je zákazník sám (rozhodnutí 22. 10. 2026 podle rešerše – nečekaný zvuk
 *    v kanceláři nebo v tramvaji odrazuje; ePrivacy čl. 5(3): volba se ukládá až po jeho aktivním přepnutí).
 *    Pozvánka „Zvuk a jemné vibrace jsou vypnuté – Zapnout“ se ukáže jednou za relaci u přepínače po první vědomé
 *    akci (otevření pomocníka, start zaměření) a sama zmizí. Přepínač „Zvuk a vibrace“ je vždy po ruce (hlavička
 *    H-BOTa, hlavička HOLUB 360), volba se pamatuje v localStorage „hspg-zazitek“ („0“ / „1“) a platí ve všech kartách,
 *  - iPhone: navigator.audioSession.type = 'ambient' – přepínač ticha na telefonu zvuk ztlumí; vibrace web na iOS
 *    nemá (navigator.vibrate chybí) – haptika pak tiše nic nedělá.
 *
 * Prohlížeč: HSPGZazitek.zvuk('fajfka'); HSPGZazitek.haptika('fajfka'); HSPGZazitek.prepinac(tlacitko);
 *            HSPGZazitek.pozvanka(tlacitko); HSPGZazitek.zapnuto(); HSPGZazitek.nastav(false);
 *            HSPGZazitek.naZmenu(function (zapnuto) {…})
 * Zvuky: tuk, otevrit, fajfka, srdce, pecet, cena, kridla, chyba. Haptika: tuk, fajfka, pecet, cena, chyba.
 * Testy/Node: soubor se spustí ve vm kontextu (balicek/testy/unit/zazitek.test.mjs).
 */
(function (koren, tovarna) {
  'use strict';
  // Druhé načtení (stránka i panel H-BOTa) nesmí vytvořit druhý stav ani druhý zvukový výstup.
  var hotove = koren && koren.HSPGZazitek;
  var api = hotove || tovarna(koren || {});
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (koren && !hotove) koren.HSPGZazitek = api;
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : this), function (W) {
  'use strict';
  var d = W.document || null, nav = W.navigator || null;
  var KLIC = 'hspg-zazitek';
  var HLASITOST = 0.15; // hlavní hlasitost 0–1: zvuky jsou jen jemný doprovod
  var MAX_DELKA = 0.45; // s – žádný zvuk není delší
  var USNOUT_PO = 30000; // ms bez zvuku → zvukový výstup se uspí (baterie)
  // Vibrace se slibují jen tam, kde je motor: dotykové zařízení s navigator.vibrate (Android). Stolní Chrome funkci má,
  // ale motor ne; iPhone funkci nemá – tam i na počítači se mluví jen o zvuku (rada AI 22. 10., kolo 3).
  var DOTYK = !!(nav && nav.maxTouchPoints > 0);
  var NABIZI_VIBRACE = !!(nav && typeof nav.vibrate === 'function') && DOTYK;
  var NAZEV = NABIZI_VIBRACE ? 'Zvuk a vibrace' : 'Zvuk';
  var casovac = typeof setTimeout === 'function' ? setTimeout : function () { return 0; };
  var zrusCasovac = typeof clearTimeout === 'function' ? clearTimeout : function () {};

  // --- volba (localStorage; nedostupné úložiště = volba platí jen do zavření stránky) ----------------------------
  function cti() {
    try { var v = W.localStorage.getItem(KLIC); return v === '0' ? false : v === '1' ? true : null; } catch (e) { return null; }
  }
  function zapis(zap) {
    try { W.localStorage.setItem(KLIC, zap ? '1' : '0'); return true; } catch (e) { return false; }
  }
  var volba = cti(); // null = zákazník nic nezvolil → vypnuto (zapne si sám: přepínač nebo pozvánka)
  function zapnuto() { return volba === true; }

  var posluchaci = [];
  function oznam() {
    var z = zapnuto();
    posluchaci.slice().forEach(function (fn) { try { fn(z); } catch (e) { /* posluchač nesmí rozbít ostatní */ } });
  }
  function naZmenu(fn) {
    if (typeof fn !== 'function') return function () {};
    posluchaci.push(fn);
    return function () { var i = posluchaci.indexOf(fn); if (i !== -1) posluchaci.splice(i, 1); };
  }

  // --- aktivace uživatelem ---------------------------------------------------------------------------------
  // Moderní prohlížeče: navigator.userActivation.isActive (krátce po kliknutí, klepnutí, klávese). Starší: vlastní
  // záznam posledního gesta. Najetí myší, rolování ani načtení stránky aktivaci nedávají.
  var gestoCas = 0;
  function gesto(e) { if (e && e.isTrusted === false) return; gestoCas = Date.now(); }
  function aktivni() {
    var ua = nav && nav.userActivation;
    if (ua && typeof ua.isActive === 'boolean') return ua.isActive;
    return Date.now() - gestoCas < 1500;
  }
  function skryto() { return !!(d && d.hidden); }

  // --- zvukový výstup -------------------------------------------------------------------------------------------
  var ctx = null, vystup = null, sumBuf = null, spanek = null;
  function maZvuk() { return !!(W.AudioContext || W.webkitAudioContext); }
  function maVibrace() { return !!(nav && typeof nav.vibrate === 'function'); }
  function nastavParam(p, v) { if (p) { try { p.value = v; } catch (e) { /* jen nastavení */ } } }

  function graf() {
    if (ctx) return ctx;
    var AC = W.AudioContext || W.webkitAudioContext;
    if (!AC) return null;
    // iPhone (Safari 17+): „ambient“ = respektuje přepínač ticha a nepřeruší hudbu jiné aplikace.
    try { if (nav && nav.audioSession && nav.audioSession.type !== 'ambient') nav.audioSession.type = 'ambient'; } catch (e) { /* nepodporováno */ }
    var c;
    try { c = new AC({ latencyHint: 'interactive' }); } catch (e) { try { c = new AC(); } catch (e2) { return null; } }
    try {
      var komp = c.createDynamicsCompressor();
      nastavParam(komp.threshold, -20); nastavParam(komp.knee, 14); nastavParam(komp.ratio, 4);
      nastavParam(komp.attack, 0.002); nastavParam(komp.release, 0.14);
      var g = c.createGain();
      nastavParam(g.gain, HLASITOST);
      g.connect(komp); komp.connect(c.destination);
      // Odemknutí zvuku na iOS: tichý vzorek přímo v obsluze gesta.
      var ticho = c.createBufferSource();
      ticho.buffer = c.createBuffer(1, 1, c.sampleRate || 44100);
      ticho.connect(c.destination); ticho.start(0);
      ctx = c; vystup = g;
    } catch (e) {
      try { if (c.close) c.close(); } catch (e2) { /* nic */ }
      return null;
    }
    return ctx;
  }
  function uspi() {
    zrusCasovac(spanek);
    if (ctx && ctx.state === 'running') { try { var p = ctx.suspend(); if (p && p.catch) p.catch(function () {}); } catch (e) { /* nic */ } }
  }
  function sum() {
    if (sumBuf) return sumBuf;
    var rate = ctx.sampleRate || 44100, n = Math.floor(rate * 0.5);
    sumBuf = ctx.createBuffer(1, n, rate);
    var data = sumBuf.getChannelData(0);
    for (var i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    return sumBuf;
  }
  // Obálka hlasitosti: rychlý náběh, exponenciální doznění do ticha přesně v čase konec.
  function obalka(p, t, utok, hlas, konec) {
    p.setValueAtTime(0.0001, t);
    p.exponentialRampToValueAtTime(Math.max(0.0002, hlas), t + utok);
    p.exponentialRampToValueAtTime(0.0001, konec);
  }
  // o = { f, f2?, klouz?, typ?, detune?, utok?, delka, hlas }
  function ton(t, o) {
    var osc = ctx.createOscillator(), g = ctx.createGain(), konec = t + o.delka;
    osc.type = o.typ || 'sine';
    osc.frequency.setValueAtTime(o.f, t);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t + (o.klouz || o.delka));
    if (o.detune && osc.detune) osc.detune.setValueAtTime(o.detune, t);
    obalka(g.gain, t, o.utok || 0.004, o.hlas, konec);
    osc.connect(g); g.connect(vystup);
    osc.start(t); osc.stop(konec + 0.01);
  }
  // Filtrovaný šum. o = { filtr?, f, f2?, q?, utok?, delka, hlas }
  function sumovy(t, o) {
    var src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), konec = t + o.delka;
    src.buffer = sum();
    f.type = o.filtr || 'bandpass';
    f.frequency.setValueAtTime(o.f, t);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(o.f2, konec);
    f.Q.setValueAtTime(o.q || 1, t);
    obalka(g.gain, t, o.utok || 0.002, o.hlas, konec);
    src.connect(f); f.connect(g); g.connect(vystup);
    src.start(t, Math.random() * 0.25);
    src.stop(konec + 0.01);
  }

  // Recepty zvuků (t = začátek). Délky: viz test „každý zvuk < 450 ms“.
  var ZVUKY = {
    // Jemné ťuknutí – volba, dlaždice, přepnutí.
    tuk: function (t) {
      ton(t, { f: 660, f2: 330, klouz: 0.05, delka: 0.075, hlas: 0.5, utok: 0.002 });
      ton(t, { f: 1320, typ: 'triangle', delka: 0.035, hlas: 0.08, utok: 0.001 });
    },
    // Vzdušné stoupající švihnutí – otevření pomocníka.
    otevrit: function (t) {
      sumovy(t, { filtr: 'bandpass', f: 420, f2: 3600, q: 0.9, delka: 0.34, hlas: 0.42, utok: 0.16 });
      ton(t + 0.17, { f: 1568, delka: 0.22, hlas: 0.06, utok: 0.03 });
    },
    // Dvoutónová stoupající zvonkohra – hotovo, staženo, změřeno.
    fajfka: function (t) {
      ton(t, { f: 1046.5, delka: 0.17, hlas: 0.3 });
      ton(t, { f: 2093, delka: 0.1, hlas: 0.05 });
      ton(t + 0.11, { f: 1568, delka: 0.27, hlas: 0.3 });
      ton(t + 0.11, { f: 3136, delka: 0.14, hlas: 0.04 });
    },
    // Hřejivý dvojitý tep – poděkování.
    srdce: function (t) {
      [0, 0.19].forEach(function (z, i) {
        ton(t + z, { f: 92 - i * 6, f2: 58, klouz: 0.12, delka: 0.15, hlas: i ? 0.65 : 0.85, utok: 0.006 });
        ton(t + z, { f: 184 - i * 12, f2: 116, typ: 'triangle', klouz: 0.1, delka: 0.11, hlas: 0.16, utok: 0.006 });
      });
    },
    // Prasknutí voskové pečeti: šumový praskot a hluboký úder.
    pecet: function (t) {
      sumovy(t, { filtr: 'highpass', f: 1700, q: 0.7, delka: 0.05, hlas: 0.75, utok: 0.001 });
      sumovy(t + 0.032, { filtr: 'bandpass', f: 3100, q: 1.4, delka: 0.045, hlas: 0.45, utok: 0.001 });
      ton(t + 0.012, { f: 130, f2: 46, klouz: 0.16, delka: 0.24, hlas: 0.9, utok: 0.003 });
      ton(t + 0.012, { f: 260, f2: 96, typ: 'triangle', klouz: 0.1, delka: 0.12, hlas: 0.16, utok: 0.003 });
    },
    // Zlaté třpytivé arpeggio – odhalení ceny.
    cena: function (t) {
      [1046.5, 1318.5, 1568, 2093].forEach(function (f, i) {
        var z = t + i * 0.055, delka = i === 3 ? 0.25 : 0.18;
        ton(z, { f: f, delka: delka, hlas: 0.2, utok: 0.003 });
        ton(z, { f: f, detune: 9, delka: delka * 0.8, hlas: 0.07, utok: 0.003 });
      });
    },
    // Krátké zamávání křídel – hejno holubů.
    kridla: function (t) {
      for (var i = 0; i < 5; i++) sumovy(t + i * 0.058, { filtr: 'bandpass', f: 950 + (i % 2) * 380, q: 1.1, delka: 0.05, hlas: 0.5 - i * 0.07, utok: 0.004 });
    },
    // Jemný nízký dvoutón – něco chybí nebo nejde.
    chyba: function (t) {
      ton(t, { f: 392, typ: 'triangle', delka: 0.14, hlas: 0.24, utok: 0.008 });
      ton(t + 0.13, { f: 311.1, typ: 'triangle', delka: 0.2, hlas: 0.24, utok: 0.008 });
    }
  };
  var HAPTIKA = { tuk: 8, fajfka: [12, 40, 18], pecet: [18, 30, 42], cena: [10, 50, 10, 50, 24], chyba: [30, 60, 30] };
  function ma(o, k) { return typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k); }

  function hraj(recept) {
    if (!ctx || ctx.state !== 'running' || !zapnuto() || skryto()) return false;
    try { recept(ctx.currentTime + 0.005); } catch (e) { return false; }
    zrusCasovac(spanek);
    spanek = casovac(uspi, USNOUT_PO);
    return true;
  }

  /** Zahraje krátký zvuk. Vrací true, když se zvuk hraje (nebo spustí po probuzení výstupu v rámci gesta). */
  function zvuk(nazev) {
    if (!ma(ZVUKY, nazev) || !zapnuto() || skryto()) return false;
    // Bez vědomé akce se výstup nevytvoří ani neprobudí (načtení, najetí, rolování); běžící výstup (např. měření
    // spuštěné kliknutím, které doběhne o chvíli později) zahrát smí.
    if ((!ctx || ctx.state !== 'running') && !aktivni()) return false;
    var c = graf();
    if (!c) return false;
    if (c.state === 'running') return hraj(ZVUKY[nazev]);
    if (c.state === 'closed') return false;
    // Uspaný nebo právě vzniklý výstup: probudit a zahrát hned po probuzení – nikdy později (pozdní zvuk by
    // zazněl bez souvislosti s akcí).
    var pozadano = Date.now();
    try {
      var p = c.resume();
      if (p && typeof p.then === 'function') p.then(function () { if (Date.now() - pozadano < 400) hraj(ZVUKY[nazev]); }, function () {});
      else return hraj(ZVUKY[nazev]);
    } catch (e) { return false; }
    return true;
  }

  /** Krátká vibrace (Android); jen během aktivace uživatelem, jinak a na iOS tiše nic. */
  function haptika(nazev) {
    if (!ma(HAPTIKA, nazev) || !zapnuto() || skryto() || !maVibrace() || !aktivni()) return false;
    var v = HAPTIKA[nazev];
    try { return !!nav.vibrate(Array.isArray(v) ? v.slice() : v); } catch (e) { return false; }
  }

  // --- přepínač „Zvuk a vibrace“ ---------------------------------------------------------------------------------
  var SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 9.5v5h3.6l4.9 4v-13l-4.9 4z"/>';
  var IKONA_ZAP = SVG + '<path d="M15.6 9.2a4 4 0 0 1 0 5.6M18.3 6.6a7.7 7.7 0 0 1 0 10.8"/></svg>';
  var IKONA_VYP = SVG + '<path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
  var prepinace = [];
  function vykresliPrepinac(tl) {
    var z = zapnuto();
    tl.setAttribute('aria-pressed', z ? 'true' : 'false');
    tl.setAttribute('title', NAZEV + ': ' + (z ? 'zapnuto' : 'vypnuto')); // aria-label zůstává stejný, stav nese aria-pressed
    var ik = tl.querySelector && tl.querySelector('.hz-ikona');
    if (ik) ik.innerHTML = z ? IKONA_ZAP : IKONA_VYP;
  }
  function vsechnyPrepinace() {
    prepinace = prepinace.filter(function (tl) { return tl.isConnected !== false; });
    prepinace.forEach(vykresliPrepinac);
  }

  /** Zapne / vypne zvuky i vibrace (volba se uloží). */
  function nastav(zap) {
    zap = !!zap;
    var zmena = zapnuto() !== zap;
    volba = zap;
    zapis(zap);
    zrusPozvanku(); // po rozhodnutí zákazníka už pozvánka nemá co nabízet
    if (!zap) uspi();
    vsechnyPrepinace();
    if (zmena) oznam();
    return zap;
  }

  // --- pozvánka „Zapnout zvuk?“ ----------------------------------------------------------------------------------
  // Ukáže se u přepínače jednou za relaci, jen dokud zákazník nic nezvolil, a po 9 s sama zmizí (odpočet se zastaví,
  // dokud na ní je ukazatel nebo fokus – WCAG 2.2.1). Do sessionStorage se zapíše až po rozhodnutí zákazníka
  // („Zapnout“ nebo ✕; ePrivacy čl. 5(3) – rada AI 22. 10.); samo zmizení se pamatuje jen do nového načtení stránky.
  // Volá ji stránka po první vědomé akci; bez dokumentu, bez zvuku i vibrací nebo ve skryté kartě nic.
  var POZVANKA_KLIC = 'hspg-zazitek-pozvanka', POZVANKA_TRVANI = 9000, STAV_TRVANI = 3000;
  var pozvankaEl = null, pozvankaCasovac = null, pozvankaByla = false, pozvankaPrepinac = null, stavEl = null, stavCasovac = null;
  function pozvankaUkazana() {
    if (pozvankaByla) return true;
    try { return W.sessionStorage.getItem(POZVANKA_KLIC) === '1'; } catch (e) { return false; }
  }
  function pozvankaRozhodnuta() {
    try { W.sessionStorage.setItem(POZVANKA_KLIC, '1'); } catch (e) { /* bez úložiště platí jen do nového načtení */ }
  }
  function odeber(el) {
    try { if (typeof el.remove === 'function') el.remove(); else if (el.parentNode) el.parentNode.removeChild(el); } catch (e) { /* nic */ }
  }
  function fokusUvnitr(el) {
    var a = d && d.activeElement;
    return !!(a && el && typeof el.contains === 'function' && el.contains(a));
  }
  function zrusPozvanku() {
    zrusCasovac(pozvankaCasovac); pozvankaCasovac = null;
    if (!pozvankaEl) return;
    var el = pozvankaEl, tl = pozvankaPrepinac; pozvankaEl = null; pozvankaPrepinac = null;
    // Fokus nesmí zmizet s prvkem – vrátí se na přepínač.
    if (fokusUvnitr(el) && tl && typeof tl.focus === 'function') { try { tl.focus({ preventScroll: true }); } catch (e) { /* nic */ } }
    odeber(el);
  }
  function zrusStav() { zrusCasovac(stavCasovac); stavCasovac = null; if (stavEl) { odeber(stavEl); stavEl = null; } }
  function prvek(tag, trida, text) {
    var el = d.createElement(tag);
    el.className = trida;
    if (text) el.textContent = text;
    return el;
  }
  function naplanujZmizeni() {
    zrusCasovac(pozvankaCasovac);
    pozvankaCasovac = casovac(function () { if (pozvankaEl && !fokusUvnitr(pozvankaEl)) zrusPozvanku(); }, POZVANKA_TRVANI);
  }
  // Krátké potvrzení po „Zapnout“ (role=status, 3 s) na místě pozvánky. Text se vloží až v dalším tiku – živou
  // oblast vloženou rovnou s textem čtečky většinou neohlásí.
  function ukazStav(tl, text) {
    zrusStav();
    if (!tl || !tl.parentNode) return null;
    var el = prvek('p', 'hz-stav', '');
    el.setAttribute('role', 'status');
    tl.parentNode.insertBefore(el, tl.nextSibling || null);
    stavEl = el;
    casovac(function () { if (stavEl === el) el.textContent = text; }, 30);
    stavCasovac = casovac(zrusStav, STAV_TRVANI);
    return el;
  }
  /** Pozvánka vedle přepínače tl (vloží se za něj). Vrací prvek pozvánky, nebo null, když se neukazuje. */
  function pozvanka(tl) {
    if (!d || typeof d.createElement !== 'function' || !tl || !tl.parentNode) return null;
    if (volba !== null || pozvankaUkazana() || (!maZvuk() && !maVibrace()) || skryto()) return null;
    zrusPozvanku(); zrusStav();
    var box = prvek('div', 'hz-pozvanka');
    box.setAttribute('role', 'group');
    box.setAttribute('aria-label', 'Nabídka: ' + NAZEV);
    var ano = prvek('button', 'hz-pozvanka-ano', 'Zapnout');
    ano.type = 'button';
    var ne = prvek('button', 'hz-pozvanka-ne', '✕');
    ne.type = 'button';
    ne.setAttribute('aria-label', 'Nechat vypnuté');
    box.appendChild(prvek('span', 'hz-pozvanka-text', NABIZI_VIBRACE ? 'Zvuk a jemné vibrace jsou vypnuté.' : 'Zvuk je vypnutý.'));
    box.appendChild(ano);
    box.appendChild(ne);
    // „Zapnout“ je vědomá akce: uloží volbu, potvrdí ji zvukem otevření a ťuknutím a 3 s ukáže stav.
    ano.addEventListener('click', function () {
      pozvankaRozhodnuta();
      nastav(true); // zruší pozvánku
      zvuk('otevrit'); haptika('tuk');
      ukazStav(tl, NABIZI_VIBRACE ? 'Zapnuto. Vypnete stejným tlačítkem.' : DOTYK ? 'Zvuk zapnut. V tichém režimu telefonu ho neuslyšíte.' : 'Zvuk zapnut. Vypnete stejným tlačítkem.');
    });
    ne.addEventListener('click', function () { pozvankaRozhodnuta(); zrusPozvanku(); });
    // Odpočet zmizení se zastaví, dokud je na pozvánce ukazatel nebo fokus.
    if (typeof box.addEventListener === 'function') {
      box.addEventListener('pointerenter', function () { zrusCasovac(pozvankaCasovac); pozvankaCasovac = null; });
      box.addEventListener('focusin', function () { zrusCasovac(pozvankaCasovac); pozvankaCasovac = null; });
      box.addEventListener('pointerleave', naplanujZmizeni);
      box.addEventListener('focusout', function () { casovac(function () { if (pozvankaEl === box && !fokusUvnitr(box)) naplanujZmizeni(); }, 0); });
    }
    tl.parentNode.insertBefore(box, tl.nextSibling || null);
    pozvankaEl = box; pozvankaPrepinac = tl;
    pozvankaByla = true; // samo zmizení = jen do nového načtení; rozhodnutí zákazníka se zapíše do sessionStorage
    naplanujZmizeni();
    return box;
  }

  /** Udělá z tlačítka (nebo vytvoří v kontejneru) přepínač „Zvuk a vibrace“ s aria-pressed a ikonou reproduktoru.
   *  Na zařízení bez zvuku i vibrací zůstane skrytý. Vrací tlačítko (nebo null bez dokumentu). */
  function prepinac(el) {
    if (!d || typeof d.createElement !== 'function') return null;
    var tl = el && el.tagName === 'BUTTON' ? el : d.createElement('button');
    if (tl !== el && el && typeof el.appendChild === 'function') el.appendChild(tl);
    if (!maZvuk() && !maVibrace()) { tl.hidden = true; return tl; }
    if (!tl._hspgZazitek) {
      tl._hspgZazitek = true;
      tl.type = 'button';
      tl.setAttribute('aria-label', NAZEV);
      if (tl.classList) tl.classList.add('hz-prepinac');
      tl.innerHTML = '<span class="hz-ikona" aria-hidden="true"></span><span class="hz-text">' + NAZEV + '</span>';
      tl.addEventListener('click', function () {
        var zap = nastav(!zapnuto());
        if (zap) { zvuk('tuk'); haptika('tuk'); }
      });
      prepinace.push(tl);
    }
    vykresliPrepinac(tl);
    tl.hidden = false;
    return tl;
  }

  // --- události prohlížeče --------------------------------------------------------------------------------------
  if (d && typeof d.addEventListener === 'function') {
    ['pointerdown', 'keydown', 'touchend', 'click'].forEach(function (t) {
      try { d.addEventListener(t, gesto, { capture: true, passive: true }); } catch (e) { /* nic */ }
    });
    d.addEventListener('visibilitychange', function () { if (d.hidden) uspi(); });
  }
  if (typeof W.addEventListener === 'function') {
    W.addEventListener('pagehide', uspi);
    // Volba změněná v jiné kartě platí hned i tady.
    W.addEventListener('storage', function (e) {
      if (!e || e.key !== KLIC) return;
      var pred = zapnuto();
      volba = e.newValue === '0' ? false : e.newValue === '1' ? true : null;
      if (volba !== null) zrusPozvanku();
      if (!zapnuto()) uspi();
      vsechnyPrepinace();
      if (pred !== zapnuto()) oznam();
    });
  }

  return {
    verze: '1.2.0',
    zvuk: zvuk,
    haptika: haptika,
    zapnuto: zapnuto,
    nastav: nastav,
    prepinac: prepinac,
    pozvanka: pozvanka,
    naZmenu: naZmenu,
    ZVUKY: Object.keys(ZVUKY),
    HAPTIKA: Object.keys(HAPTIKA),
    MAX_DELKA: MAX_DELKA,
    KLIC: KLIC
  };
});
