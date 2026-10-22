/* Panel H-BOT – načítá ho /assets/hbot.js až při prvním zájmu.
   Zákazník: rychlé otázky (okamžitě z ověřených FAQ, bez AI), vlastní otázka (spolupracující AI přes
   /api/asistent; bez AI nebo při chybě odpoví FAQ), zavolání zpět (Netlify formulář hspg-zavolejte).
   Majitel: po přihlášení karta „Vše ve tvých rukách“ (/assets/hbot-majitel.js). */
(function () {
  'use strict';
  // Pozdě doběhlé první načtení a „Zkusit znovu“ ze záložního okna nesmí vytvořit dva panely.
  if (window.HSPG_HBOT) return;
  var d = document;
  var Z = window.HSPG_HBOT_ZAVADEC || { tlacitka: [], majitel: function () {}, otevreno: function () {} };
  var TOKEN_KLIC = 'hspg-majitel-token', PLATNOST_KLIC = 'hspg-majitel-platnost';
  var TEL = '+420736618486', TEL_TEXT = '+420 736 618 486', DOBA = 'Po–So 7:00–19:00';

  function ss(k, v) {
    try { if (v === undefined) return sessionStorage.getItem(k); if (v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) {}
    return null;
  }
  function token() { return Number(ss(PLATNOST_KLIC) || 0) > Date.now() ? ss(TOKEN_KLIC) : null; }
  function udalost(nazev, data) {
    try { window.dataLayer = window.dataLayer || []; var o = { event: nazev }; for (var k in data || {}) o[k] = data[k]; window.dataLayer.push(o); } catch (e) {}
  }
  function esc(t) { return String(t).replace(/[<>&"]/g, function (c) { return { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]; }); }
  // Text AI → bezpečné HTML: vše se escapuje, pak se z hspg.cz adres a telefonu udělají odkazy.
  function odkazy(t) {
    return esc(t)
      .replace(/(?:https?:\/\/)?(?:www\.)?hspg\.cz(\/(?!\/)[A-Za-z0-9\-._\/#?=]*[A-Za-z0-9\/])?/g, function (m, p) { return '<a href="' + (p || '/') + '">' + m + '</a>'; })
      .replace(/\+?420 ?736 ?618 ?486/g, function (m) { return '<a href="tel:' + TEL + '">' + m + '</a>'; })
      .replace(/\n/g, '<br>');
  }
  // fetch + přečtení těla v jednom časovém limitu: tělo zaseknuté po hlavičkách limit neobejde.
  function jsonSLimitem(ms, url, opt) {
    var c = window.AbortController ? new AbortController() : null;
    opt = opt || {}; if (c) opt.signal = c.signal;
    return new Promise(function (ok, chyba) {
      var t = setTimeout(function () { if (c) c.abort(); chyba(new Error('timeout')); }, ms);
      fetch(url, opt)
        .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
        .then(function (j) { clearTimeout(t); ok(j); }, function (e) { clearTimeout(t); chyba(e); });
    });
  }

  // --- styly a data ---------------------------------------------------------------------------
  var styly = new Promise(function (ok) {
    if (d.getElementById('hbot-styly')) return ok();
    var l = d.createElement('link'); l.id = 'hbot-styly'; l.rel = 'stylesheet'; l.href = '/assets/hbot.css';
    l.onload = ok; l.onerror = ok; d.head.appendChild(l);
    // Pomalá síť nesmí panel zablokovat: po 3 s se otevře se základními styly z hbot.js.
    setTimeout(ok, 3000);
  });
  var ZALOZNI = { firma: { telefon: TEL, telefon_zobrazeni: TEL_TEXT, pracovni_doba: DOBA }, rychle_otazky: [], otazky: [] };
  var KB = null;
  // Znalosti do 4 s, jinak záložní minimum (telefon, doba) – panel nikdy nečeká donekonečna.
  var znalosti = jsonSLimitem(4000, '/assets/hbot-znalosti.json', { cache: 'no-cache' })
    .then(function (j) { return j && Array.isArray(j.otazky) ? j : ZALOZNI; })
    .catch(function () { return ZALOZNI; })
    .then(function (j) { KB = j; return j; });
  var stavAI = { ai: false, poskytovatele: [] };
  var stavNacten = jsonSLimitem(3000, '/api/asistent', { headers: { accept: 'application/json' } })
    .then(function (s) { if (s && typeof s.ai === 'boolean') stavAI = s; })
    .catch(function () {});

  // --- kostra panelu ------------------------------------------------------------------------------
  var box = d.createElement('section');
  box.id = 'hbot'; box.hidden = true;
  // Fokusovatelný panel: klik do textu odpovědi nechá fokus v panelu, takže Escape dál funguje.
  box.tabIndex = -1;
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'false'); box.setAttribute('aria-labelledby', 'hb-titulek'); box.setAttribute('aria-describedby', 'hb-podtitulek');
  // Microsoft Clarity nesmí nahrávat otázky ani kontakty psané do panelu.
  box.setAttribute('data-clarity-mask', 'true');
  box.innerHTML =
    // Znak: zlatý origami holub nad střechou (kreslí ho zavaděč, R18) – žádné kulaté logo.
    '<div class="hb-head"><span class="hb-znak" aria-hidden="true"></span><div class="hb-titul"><h2 id="hb-titulek">H-SPG CORE</h2><p id="hb-podtitulek">Budoucnost ve Vašich rukách</p></div>' +
    // AI Act čl. 50: když na vlastní otázky odpovídá AI, je to vidět trvale v hlavičce (ne jen v úvodní zprávě).
    '<span class="hb-ai-znacka" hidden>AI asistent</span>' +
    // Přepínač „Zvuk a vibrace“ (úkol 56) – místo je rezervované, ukáže se, jakmile se načte hspg-zazitek.js.
    '<div class="hb-head-akce"><button type="button" class="hb-zazitek hb-zazitek--ceka" aria-label="Zvuk a vibrace" title="Zvuk a vibrace" aria-pressed="true"></button>' +
    '<button type="button" class="hb-close" aria-label="Zavřít pomocníka">✕</button></div></div>' +
    '<div class="hb-tabs" role="tablist" hidden>' +
    '<button type="button" role="tab" class="hb-tab" id="hb-tab-z" aria-controls="hb-view-z" aria-selected="true">Pro zákazníky</button>' +
    '<button type="button" role="tab" class="hb-tab" id="hb-tab-m" aria-controls="hb-view-m" aria-selected="false" tabindex="-1">Vše ve tvých rukách</button></div>' +
    '<div class="hb-view" id="hb-view-z" role="tabpanel" aria-labelledby="hb-tab-z">' +
    '<div class="hb-log" aria-live="polite"></div>' +
    '<form class="hb-form"><label class="hb-skryte" for="hb-q">Vaše otázka</label>' +
    '<input id="hb-q" type="text" autocomplete="off" enterkeyhint="send" placeholder="Napište otázku…" maxlength="500">' +
    '<input type="text" name="_honey" tabindex="-1" autocomplete="off" class="hb-skryte" aria-hidden="true">' +
    '<button class="hb-zlate" type="submit">Poslat</button></form></div>' +
    '<div class="hb-view" id="hb-view-m" role="tabpanel" aria-labelledby="hb-tab-m" hidden></div>' +
    // Okamžitá kalkulace (úkol 48): /assets/hbot-nabidka.js se načte až po kliknutí na „Cena hned“.
    '<div class="hb-view hb-view-n" id="hb-view-n" hidden></div>' +
    '<div class="hb-pata"><span>' + esc(DOBA) + ' · <a href="tel:' + TEL + '">' + TEL_TEXT + '</a></span>' +
    '<button type="button" class="hb-odkaz" data-majitel hidden>Přihlášení majitele</button></div>';
  d.body.appendChild(box);

  var log = box.querySelector('.hb-log');
  // Klik do textu odpovědi fokusuje deník (ne celý panel) – šipky a PageDown pak posouvají konverzaci, ne stránku.
  log.tabIndex = -1;
  var vstup = box.querySelector('#hb-q');
  var honey = box.querySelector('input[name=_honey]');
  var tabs = box.querySelector('.hb-tabs');
  var tabZ = box.querySelector('#hb-tab-z'), tabM = box.querySelector('#hb-tab-m');
  var viewZ = box.querySelector('#hb-view-z'), viewM = box.querySelector('#hb-view-m');
  var majitelBtn = box.querySelector('[data-majitel]');
  var viewN = box.querySelector('#hb-view-n'), aiZnacka = box.querySelector('.hb-ai-znacka');

  // --- zážitek: zvuk a vibrace (úkol 56) ------------------------------------------------------------------
  // /assets/hspg-zazitek.js se načte s panelem (nic neblokuje); zvuk i vibrace jen po vědomé akci zákazníka.
  var zazitekTl = box.querySelector('.hb-zazitek'), zazitekSlib = null;
  function nactiZazitek() {
    if (window.HSPGZazitek) return Promise.resolve(window.HSPGZazitek);
    if (!zazitekSlib) {
      zazitekSlib = new Promise(function (ok) {
        var s = d.createElement('script'); s.src = '/assets/hspg-zazitek.js'; s.async = true;
        s.onload = function () { ok(window.HSPGZazitek || null); };
        s.onerror = function () { ok(null); }; // bez sítě se nezkouší znovu – zvuky nejsou nutné
        d.head.appendChild(s);
      });
    }
    return zazitekSlib;
  }
  // Zvuk (a vibrace) k akci; když se modul ještě načítá, zazní jen do 1,5 s od akce – nikdy později.
  function zazitek(zvuk, haptika) {
    var hraj = function (z) {
      if (!z) return;
      try { if (zvuk) z.zvuk(zvuk); if (haptika) z.haptika(haptika); } catch (e) {}
    };
    if (window.HSPGZazitek) return hraj(window.HSPGZazitek);
    var t = Date.now();
    nactiZazitek().then(function (z) { if (Date.now() - t < 1500) hraj(z); });
  }
  nactiZazitek().then(function (z) {
    if (z) z.prepinac(zazitekTl); else zazitekTl.hidden = true;
    zazitekTl.classList.remove('hb-zazitek--ceka');
  });

  // --- znak v hlavičce: holub ze zavaděče (canvas), záložně plochý holub v SVG -------------------
  var znak = box.querySelector('.hb-znak'), znakPlatno = null, znakCtx = null;
  if (Z.holub && Z.platno) { try { znakPlatno = Z.platno(52, 38); znakCtx = znakPlatno.getContext('2d'); znak.appendChild(znakPlatno); } catch (e) { znakCtx = null; } }
  if (!znakCtx && Z.holubSvg) znak.innerHTML = Z.holubSvg;
  function kresliZnak(t, mav) {
    if (!znakCtx) return;
    var r = znakPlatno._r;
    znakCtx.setTransform(1, 0, 0, 1, 0, 0);
    znakCtx.clearRect(0, 0, znakPlatno.width, znakPlatno.height);
    Z.holub.kresli(znakCtx, { x: 26 * r, y: 15.5 * r, meritko: 12.5 * r, mav: mav, cas: t, strecha: true, hreben: -0.84, strechaVelikost: 0.72, stoupani: 0.05 * Math.sin(t * 2.2) });
  }
  kresliZnak(0, 0.22);
  var znakDo = 0, znakBezi = false;
  // Holub mávne křídly při otevření a když odpovídá (jen bez prefers-reduced-motion).
  function animujZnak(sekund) {
    if (Z.klid || !znakCtx || !window.requestAnimationFrame) return;
    znakDo = Math.max(znakDo, performance.now() + sekund * 1000);
    if (znakBezi) return;
    znakBezi = true;
    requestAnimationFrame(function snimek(ted) {
      var zbyva = znakDo - ted, t = ted / 1000;
      if (zbyva <= 0 || box.hidden || d.hidden) { znakBezi = false; kresliZnak(t, 0.22); return; }
      kresliZnak(t, 0.22 + 0.3 * Math.sin(t * Math.PI * 2 * 1.5) * Math.min(1, zbyva / 900));
      requestAnimationFrame(snimek);
    });
  }
  // Návštěvníci odkaz nevidí. Majitel otevře panel přes hspg.cz/#majitel; zařízení si to pak pamatuje.
  var ZARIZENI_KLIC = 'hspg-majitel-zarizeni';
  // Hodnota = podepsaný příznak zařízení ze serveru (výjimka z globálního stropu pokusů o přihlášení).
  function znackaZarizeni() { try { return localStorage.getItem(ZARIZENI_KLIC) || ''; } catch (e) { return ''; } }
  function zarizeniMajitele() { return !!znackaZarizeni(); }
  function zapamatujZarizeni(z) { try { localStorage.setItem(ZARIZENI_KLIC, z || '1'); } catch (e) {} }
  function ukazOdkazMajitele() { majitelBtn.hidden = !(token() || zarizeniMajitele() || location.hash === '#majitel'); }

  function msg(html, trida) {
    var m = d.createElement('div'); m.className = 'hb-msg' + (trida ? ' ' + trida : '');
    if (trida === 'hb-me') m.textContent = html; else { m.innerHTML = html; animujZnak(1.2); }
    log.appendChild(m); log.scrollTop = log.scrollHeight; return m;
  }

  // --- zákazník: FAQ bez AI ------------------------------------------------------------------------
  // Bez diakritiky a velikosti písmen, aby „cenik“ i „CENÍK“ našly totéž.
  function bezDiakritiky(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function skoreFaq(text) {
    var t = ' ' + bezDiakritiky(text).replace(/[^a-z0-9-]+/g, ' ') + ' ', nej = null, skore = 0;
    (KB.otazky || []).forEach(function (e) {
      var s = 0, videne = {};
      // Klíč musí začínat na hranici slova (kmen „impregn“ najde „impregnace“, „cena“ ne „necenzurovaný“).
      // Klíč do 3 znaků nebo s „=“ na začátku jen jako celé slovo („let“ nenajde „letos“, „=panel“ ne
      // „panelák“) – kmeny proto piš aspoň 4znakové nebo vypiš tvary. Stejný klíč se počítá jednou.
      (e.k || []).forEach(function (k) {
        var cele = k.charAt(0) === '=';
        var n = bezDiakritiky(cele ? k.slice(1) : k).trim();
        if (!n || videne[n]) return;
        videne[n] = 1;
        if (t.indexOf(' ' + n + (cele || n.length <= 3 ? ' ' : '')) !== -1) s++;
      });
      if (bezDiakritiky(e.q) === bezDiakritiky(text).trim()) s += 5;
      if (s > skore) { skore = s; nej = e; }
    });
    return { e: nej, skore: skore };
  }
  function najdi(text) { return skoreFaq(text).e; }
  function odpovedFaq(e) {
    var html = esc(e.a);
    if (e.link) html += ' <a href="' + esc(e.link[0]) + '">' + esc(e.link[1]) + ' →</a>';
    msg(html);
  }
  function dalsiKrok() {
    var w = d.createElement('div'); w.className = 'hb-chips';
    // R16: okamžitá orientační cena přímo v H-BOTovi (dřív odkaz „Chci cenu do 24 h“ na /akce/).
    var a = cipCenaHned('hbot_cta');
    var c = d.createElement('button'); c.type = 'button'; c.className = 'hb-chip'; c.textContent = '☎ Zavolejte mi';
    c.addEventListener('click', function () { zazitek('tuk', 'tuk'); zavolejteMi(); });
    w.appendChild(a); w.appendChild(c); log.appendChild(w); log.scrollTop = log.scrollHeight;
  }
  function faq(text) {
    var e = najdi(text);
    udalost('hbot_odpoved', { zdroj: e ? 'faq' : 'zadna' });
    if (e) { odpovedFaq(e); dalsiKrok(); }
    else { msg('Na tohle vám nejlépe odpoví přímo náš tým.'); zavolejteMi(); }
  }
  function rychlaOtazka(q) { msg(q, 'hb-me'); faq(q); }

  // --- zákazník: spolupracující AI ----------------------------------------------------------------
  var historie = [], aiBezi = false, aiVypnuto = false, poznamkaAI = false, aiChyby = 0;
  // Markdown, který AI občas pošle navzdory pokynu, se nezobrazí doslova.
  function bezMarkdownu(t) { return String(t).replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#{1,6}\s+/gm, '').replace(/^\s*[-*]\s+/gm, '• '); }
  function vlastniOtazka(text) {
    msg(text, 'hb-me');
    // Jasná shoda s ověřenou odpovědí: okamžitě a zdarma, bez AI.
    var shoda = skoreFaq(text);
    if (shoda.skore >= 2) { odpovedFaq(shoda.e); dalsiKrok(); udalost('hbot_odpoved', { zdroj: 'faq' }); return; }
    if (aiVypnuto || !stavAI.ai || !window.fetch) { faq(text); return; }
    aiBezi = true;
    historie.push({ role: 'user', text: text });
    var pise = msg('<span class="hb-pise">Holub svolává AI…</span>');
    var piseText = pise.querySelector('.hb-pise');
    var KROKY = { navrh: ' píše odpověď z ověřených informací…', kontrola: ' ověřuje fakta v odpovědi…' };
    // Průběh spolupráce chodí po řádcích (NDJSON); poslední řádek je výsledek.
    function prectiProud(r) {
      if (!r.body || (r.headers.get('content-type') || '').indexOf('ndjson') === -1) {
        return r.json().catch(function () { return {}; }).then(function (j) { return { s: r.status, j: j }; });
      }
      var ctecka = r.body.getReader(), dek = new TextDecoder(), zbytek = '', vysledek = null;
      function radek(t) {
        if (!t.trim()) return;
        var o; try { o = JSON.parse(t); } catch (e) { return; }
        if (o.krok && KROKY[o.krok]) piseText.textContent = o.ai + KROKY[o.krok];
        if (o.rezim && !vysledek) vysledek = o;
      }
      function dalsi() {
        return ctecka.read().then(function (x) {
          if (x.done) { radek(zbytek); return { s: r.status, j: vysledek || {} }; }
          zbytek += dek.decode(x.value, { stream: true });
          var casti = zbytek.split('\n'); zbytek = casti.pop();
          casti.forEach(radek);
          // Výsledek je venku → dál nečekáme (zbytek spojení se zavře).
          if (vysledek) { try { ctecka.cancel(); } catch (e) {} return { s: r.status, j: vysledek }; }
          return dalsi();
        });
      }
      return dalsi();
    }
    // Visící spojení nesmí nechat návštěvníka čekat: po 12 s (včetně čtení průběhu) odpoví FAQ.
    var ctrl = window.AbortController ? new AbortController() : null;
    var limit = setTimeout(function () { if (ctrl) ctrl.abort(); }, 12000);
    fetch('/api/asistent', {
      method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/x-ndjson, application/json' },
      body: JSON.stringify({ zpravy: historie.slice(-8), stranka: location.pathname, _honey: honey.value }),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(prectiProud)
      .then(function (x) {
        pise.remove();
        var j = x.j || {};
        if (j.rezim === 'ai' && j.odpoved) {
          aiChyby = 0;
          historie.push({ role: 'assistant', text: j.odpoved });
          var html = odkazy(bezMarkdownu(j.odpoved));
          var kdo = (j.ai || []).join(' + ');
          html += '<span class="hb-stitek">' + (j.overeno ? '✓ Odpověď ověřila druhá AI' : 'Odpověď AI') + (kdo ? ' · ' + esc(kdo) : '') + '</span>';
          if (!poznamkaAI) { poznamkaAI = true; html += '<span class="hb-stitek">Ceny a podmínky jsou orientační – závazně je potvrdí tým v nabídce.</span>'; }
          msg(html);
          udalost('hbot_odpoved', { zdroj: 'ai', overeno: !!j.overeno });
          dalsiKrok();
          return;
        }
        historie.pop();
        if (j.rezim === 'predat') { msg('Na tohle vám nejlépe odpoví přímo náš tým.'); zavolejteMi(); return; }
        // Bez AI, po limitu nebo po dvou chybách za sebou už se zbytek návštěvy AI nevolá – odpovídá FAQ.
        if (x.s === 503 || x.s === 429 || j.rezim === 'bez-ai' || j.rezim === 'limit' || ++aiChyby >= 2) aiVypnuto = true;
        faq(text);
      })
      .catch(function () { pise.remove(); historie.pop(); if (++aiChyby >= 2) aiVypnuto = true; faq(text); })
      .then(function () { clearTimeout(limit); aiBezi = false; });
  }

  // --- zákazník: zavolání zpět (Netlify Forms) --------------------------------------------------
  // souhrn = text kalkulace (číslo, povrchy, plochy, cena) – jde do pole Zdroj, ať tým ví, co zákazník spočítal.
  function zavolejteMi(souhrn) {
    if (typeof souhrn !== 'string') souhrn = '';
    var stary = log.querySelector('form.hb-call:not(.hb-login)');
    if (stary) { if (souhrn) stary._souhrn = souhrn; stary.querySelector('input').focus(); return; }
    var f = d.createElement('form'); f.className = 'hb-msg hb-call'; f.noValidate = true; f._souhrn = souhrn;
    var id = 'hbc' + Date.now();
    f.innerHTML =
      '<b style="color:#f4e4b8">Zavoláme vám</b>' +
      '<label class="hb-skryte" for="' + id + 'j">Jméno</label><input id="' + id + 'j" type="text" name="jmeno" autocomplete="name" placeholder="Jméno" required maxlength="80">' +
      '<label class="hb-skryte" for="' + id + 't">Telefon</label><input id="' + id + 't" type="tel" name="telefon" autocomplete="tel" inputmode="tel" placeholder="Telefon" required maxlength="20">' +
      '<label class="hb-souhlas"><input type="checkbox" name="souhlas" required> <span>Souhlasím se zpracováním jména a telefonu pro zpětné zavolání (<a href="/ochrana-osobnich-udaju.html">zásady</a>).</span></label>' +
      '<input type="text" name="_honey" tabindex="-1" autocomplete="off" class="hb-skryte" aria-hidden="true">' +
      '<p class="hb-chyba" id="' + id + 'ch" role="alert" hidden></p>' +
      '<button class="hb-zlate" type="submit">Chci zavolat zpět</button>';
    log.appendChild(f); log.scrollTop = log.scrollHeight;
    var chyba = f.querySelector('.hb-chyba');
    function ukaz(t, pole) {
      zazitek('chyba', 'chyba');
      // Text se nastaví až po odkrytí, aby čtečka chybu ohlásila i podruhé.
      chyba.textContent = ''; chyba.hidden = false;
      setTimeout(function () { chyba.textContent = t; }, 30);
      if (pole) { pole.setAttribute('aria-invalid', 'true'); pole.setAttribute('aria-describedby', id + 'ch'); pole.focus(); }
    }
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      chyba.hidden = true;
      var jm = f.elements.jmeno, tl = f.elements.telefon;
      [jm, tl, f.elements.souhlas].forEach(function (p) { p.removeAttribute('aria-invalid'); p.removeAttribute('aria-describedby'); });
      if (!jm.value.trim()) return ukaz('Vyplňte prosím jméno.', jm);
      var tel = tl.value.replace(/[\s\-().]/g, '');
      if (!/^\+?\d{9,15}$/.test(tel)) return ukaz('Zkontrolujte prosím telefonní číslo (9–15 číslic, může začínat +).', tl);
      if (!f.elements.souhlas.checked) return ukaz('Bez souhlasu vám nemůžeme zavolat.', f.elements.souhlas);
      var body = new URLSearchParams({
        'form-name': 'hspg-zavolejte', '_honey': f.elements._honey.value,
        'Jméno': jm.value.trim(), 'Telefon': tel, 'Souhlas': 'ano', 'Stránka': location.pathname, 'Zdroj': 'H-BOT' + (f._souhrn ? ' · kalkulace ' + f._souhrn.slice(0, 300) : '')
      });
      var b = f.querySelector('button[type=submit]'); b.disabled = true; b.textContent = 'Odesílám…';
      fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })
        .then(function (r) {
          if (!r.ok) throw new Error('http ' + r.status);
          f.remove();
          var dik = msg('Děkujeme. Ozveme se vám během pracovní doby (' + esc(DOBA) + ').');
          dik.tabIndex = -1; dik.focus({ preventScroll: true });
          zazitek('srdce');
          udalost('generate_lead', { lead_type: 'callback_hbot' });
        })
        .catch(function () {
          b.disabled = false; b.textContent = 'Chci zavolat zpět';
          ukaz('Odeslání se nepodařilo. Zavolejte prosím přímo: ' + TEL_TEXT + '.', b);
        });
    });
    f.elements.jmeno.focus({ preventScroll: true });
  }

  // --- majitel: přihlášení a karta „Vše ve tvých rukách“ ------------------------------------------
  var majitelNacten = null;
  function nactiMajitele() {
    if (majitelNacten) return majitelNacten;
    function skript(src) {
      return new Promise(function (ok, ch) { var s = d.createElement('script'); s.src = src; s.onload = ok; s.onerror = ch; d.head.appendChild(s); });
    }
    majitelNacten = (window.HSPG_AI ? Promise.resolve() : skript('/assets/ai-klient.js'))
      .then(function () { return window.HSPG_HBOT_MAJITEL ? null : skript('/assets/hbot-majitel.js'); })
      .catch(function (e) { majitelNacten = null; throw e; });
    return majitelNacten;
  }
  function vyberKartu(m) {
    tabZ.setAttribute('aria-selected', m ? 'false' : 'true'); tabZ.tabIndex = m ? -1 : 0;
    tabM.setAttribute('aria-selected', m ? 'true' : 'false'); tabM.tabIndex = m ? 0 : -1;
    viewZ.hidden = !!m; viewM.hidden = !m; viewN.hidden = true;
    box.classList.toggle('hb-siroky', !!m);
    box.classList.remove('hb-kalkulace');
    d.getElementById('hb-titulek').textContent = m ? 'Vše ve tvých rukách' : 'H-SPG CORE';
    d.getElementById('hb-podtitulek').textContent = m ? 'Všechny AI pro majitele · interní' : 'Budoucnost ve Vašich rukách';
  }
  function odhlas() {
    ss(TOKEN_KLIC, null); ss(PLATNOST_KLIC, null);
    ss('hspgHistorie', null); // historie AI centra (zadání se zákaznickými údaji) se odhlášením maže i tady
    tabs.hidden = true; viewM.innerHTML = ''; vyberKartu(false);
    majitelBtn.textContent = 'Přihlášení majitele';
    Z.majitel(false);
  }
  function zapniMajitele(prepnout) {
    var t = token();
    if (!t) return odhlas();
    tabs.hidden = false; majitelBtn.textContent = 'Odhlásit majitele';
    Z.majitel(true);
    if (prepnout) vyberKartu(true);
    if (!viewM.firstChild) {
      viewM.innerHTML = '<p class="hb-msg hb-info" style="margin:14px">Načítám AI panel…</p>';
      nactiMajitele().then(function () {
        window.HSPG_HBOT_MAJITEL.vykresli(viewM, { token: t, odhlas: odhlas });
      }).catch(function () {
        viewM.innerHTML = '<p class="hb-msg hb-chyba" style="margin:14px">AI panel se nepodařilo načíst. Zkuste to znovu, nebo otevřete <a href="/ai-centrum/">velké AI centrum</a>.</p>';
      });
    }
  }
  function prihlaseni() {
    if (token()) { odhlas(); return; }
    vyberKartu(false);
    if (log.querySelector('form.hb-login')) { log.querySelector('form.hb-login input').focus(); return; }
    var f = d.createElement('form'); f.className = 'hb-msg hb-call hb-login';
    f.innerHTML = '<b style="color:#f4e4b8">Přihlášení majitele</b>' +
      '<label class="hb-skryte" for="hb-heslo">Heslo</label><input id="hb-heslo" type="password" autocomplete="current-password" placeholder="Heslo interního panelu" required minlength="16">' +
      '<p class="hb-chyba" id="hb-heslo-chyba" role="alert" hidden></p><button class="hb-zlate" type="submit">Přihlásit</button>';
    log.appendChild(f); log.scrollTop = log.scrollHeight;
    var pole = f.querySelector('input'), ch = f.querySelector('.hb-chyba'), b = f.querySelector('button');
    pole.focus();
    f.addEventListener('submit', function (ev) {
      ev.preventDefault(); ch.hidden = true; b.disabled = true; b.textContent = 'Ověřuji…';
      fetch('/api/majitel', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ heslo: pole.value, zarizeni: znackaZarizeni() }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || !j.token) throw new Error(j.chyba || 'Přihlášení selhalo.'); return j; }); })
        .then(function (j) {
          ss(TOKEN_KLIC, j.token); ss(PLATNOST_KLIC, String(j.platnost));
          zapamatujZarizeni(j.zarizeni);
          f.remove(); zapniMajitele(true); tabM.focus();
        })
        .catch(function (e) {
          ch.textContent = ''; ch.hidden = false;
          setTimeout(function () { ch.textContent = e.message; }, 30);
          b.disabled = false; b.textContent = 'Přihlásit';
          pole.setAttribute('aria-invalid', 'true'); pole.setAttribute('aria-describedby', 'hb-heslo-chyba');
          pole.focus(); pole.select();
        });
    });
  }

  // --- okamžitá kalkulace „Cena hned“ (úkol 48) ---------------------------------------------------
  function skript(src) {
    return new Promise(function (ok, ch) { var s = d.createElement('script'); s.src = src; s.async = true; s.onload = function () { ok(); }; s.onerror = ch; d.head.appendChild(s); });
  }
  var kalkulaceNacitani = null, kalkulace = null;
  function nactiKalkulaci() {
    if (kalkulaceNacitani) return kalkulaceNacitani;
    kalkulaceNacitani = Promise.all([window.HSPGCena ? null : skript('/assets/hspg-cena.js'), window.HSPGNabidka ? null : skript('/assets/hbot-nabidka.js')])
      .then(function () { if (!window.HSPGCena || !window.HSPGNabidka) throw new Error('kalkulace'); })
      .catch(function (e) { kalkulaceNacitani = null; throw e; });
    return kalkulaceNacitani;
  }
  function cipCenaHned(zdroj) {
    var c = d.createElement('button'); c.type = 'button'; c.className = 'hb-chip hb-plny hb-cena-hned'; c.textContent = '✦ Cena hned';
    c.addEventListener('click', function () { udalost('hbot_cta', { cil: 'kalkulace', zdroj: zdroj }); zazitek('tuk', 'tuk'); otevriKalkulaci(); });
    return c;
  }
  function ukazKalkulaci(ano) {
    viewN.hidden = !ano; viewZ.hidden = !!ano;
    if (ano) { viewM.hidden = true; tabZ.setAttribute('aria-selected', 'true'); tabM.setAttribute('aria-selected', 'false'); }
    box.classList.toggle('hb-siroky', !!ano);
    box.classList.toggle('hb-kalkulace', !!ano);
    d.getElementById('hb-titulek').textContent = ano ? 'Cena hned' : 'H-SPG CORE';
    d.getElementById('hb-podtitulek').textContent = ano ? 'Orientační kalkulace z ceníku HSPG' : 'Budoucnost ve Vašich rukách';
  }
  function otevriKalkulaci() {
    ukazKalkulaci(true);
    if (kalkulace) { kalkulace.fokus(); return; }
    if (!viewN.firstChild) viewN.innerHTML = '<p class="hb-msg hb-info" style="margin:14px">Připravuji kalkulaci…</p>';
    nactiKalkulaci().then(function () {
      if (kalkulace) return;
      kalkulace = window.HSPGNabidka.spust(viewN, {
        zavadec: Z,
        zpet: function () { ukazKalkulaci(false); vstup.focus({ preventScroll: true }); },
        zavolejte: function (souhrn) { ukazKalkulaci(false); msg('Rádi vám zavoláme k vaší kalkulaci. Nechte nám prosím jméno a telefon.'); zavolejteMi(souhrn); },
        // Zákazník váhá → otázka do rozhovoru (ověřené FAQ, případně AI); kalkulace zůstane rozpracovaná.
        zeptejSe: function (otazka) { ukazKalkulaci(false); vlastniOtazka(otazka); },
        dokumenty: '/assets/hspg-dokumenty.js', konkurence: '/assets/hspg-konkurence.js', planovac: '/planovac/', poptavka: '/akce/',
        // „Plochu neznám“ → HOLUB 360 (úkol 49): zaměření na dálku, bez služby měření ruční plochy nebo adresa + telefon.
        zamereni: '/holub-360/#h3a-adresa'
      });
      if (!box.hidden && !viewN.hidden) kalkulace.fokus();
    }).catch(function () {
      viewN.innerHTML = '<p class="hb-msg hb-chyba" style="margin:14px">Kalkulaci se teď nepodařilo načíst. Cenu vám spočítáme z <a href="/akce/">poptávky</a> nebo po telefonu <a href="tel:' + TEL + '">' + TEL_TEXT + '</a>.</p>';
    });
  }

  // --- otevření, zavření, klávesnice ------------------------------------------------------------
  var zacatek = false, otvirac = null;
  // Na mobilu panel zakryje skoro celou obrazovku → chová se jako modální okno: zbytek stránky je
  // „inert“ (čtečka ani Tab se do něj nedostanou). Na počítači zůstává panel nemodální vedle obsahu.
  var mobil = window.matchMedia ? matchMedia('(max-width: 760px)') : null;
  // Prvky, které stránka přidá až po otevření (např. lišta souhlasu), musí být inert také.
  var hlidac = window.MutationObserver ? new MutationObserver(function () { nastavModal(true); }) : null;
  function nastavModal(otevreno) {
    var modal = !!(otevreno && mobil && mobil.matches);
    box.setAttribute('aria-modal', modal ? 'true' : 'false');
    if (hlidac) { if (modal) hlidac.observe(d.body, { childList: true }); else hlidac.disconnect(); }
    Array.prototype.forEach.call(d.body.children, function (el) {
      if (el === box || el.tagName === 'SCRIPT') return;
      if (modal && !el.inert) { el.inert = true; el.setAttribute('data-hbot-inert', ''); }
      else if (!modal && el.hasAttribute('data-hbot-inert')) { el.inert = false; el.removeAttribute('data-hbot-inert'); }
    });
  }
  if (mobil && mobil.addEventListener) mobil.addEventListener('change', function () { if (!box.hidden) nastavModal(true); });

  // --- rozcestník „Celý web na jednom místě“ (úkol 56) ---------------------------------------------------
  // Výchozí cíle; přepíše je klíč „rozcestnik“ v /assets/hbot-znalosti.json (zdroj content/hbot-rozcestnik.json,
  // scripts/build-hbot.mjs). Odkaz smí vést jen na stránku tohoto webu (cesta začíná „/“, ne „//“, bez mezer
  // a zpětných lomítek), jinak jen akce panelu: kalkulace | zavolat | otazka. Neplatné cíle se zahodí.
  var ROZC_VYCHOZI = [
    { id: 'cena', titul: 'Cena hned', popis: 'Orientační cena z ceníku HSPG', akce: 'kalkulace', ikona: 'cena', hlavni: true },
    { id: 'holub-360', titul: 'HOLUB 360', popis: 'Zaměření na dálku a ilustrační 3D model domu', href: '/holub-360/', ikona: 'holub360' },
    { id: 'standard', titul: 'Standard HOLUB', popis: 'Pět kroků ochrany povrchu, které nezkracujeme', href: '/standard-holub/', ikona: 'standard' },
    { id: 'sentinel', titul: 'Péče SENTINEL', popis: 'BASE · PLUS · PRESTIGE – pravidelná péče o dům', href: '/cenik.html#sentinel', ikona: 'sentinel' },
    { id: 'pas-domu', titul: 'Pas domu', popis: 'Trezor dokumentů a péče o váš dům', href: '/pas-domu/trezor.html', ikona: 'pas' },
    { id: 'termin', titul: 'Volný termín', popis: 'Kalendář technologicky vhodných dnů', href: '/planovac/', ikona: 'termin' },
    { id: 'poptavka', titul: 'Nezávazná poptávka', popis: 'Popište zakázku, ozveme se', href: '/akce/', ikona: 'poptavka' },
    { id: 'zavolat', titul: 'Zavolejte mi', popis: DOBA, akce: 'zavolat', ikona: 'telefon' }
  ];
  // Ikony jen z této mapy (data z JSON vybírají klíč, nikdy nevkládají SVG).
  var ROZC_IKONY = {
    cena: 'M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8zM7.5 7.5h.01',
    holub360: 'M12 3 4 7.5v9L12 21l8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
    standard: 'M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6zM9 12l2 2 4-4',
    sentinel: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z',
    pas: 'M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6zM9 3v18M13.5 8.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM12 16.5h3',
    termin: 'M4 6h16v14H4zM4 10h16M9 3v4m6-4v4M9 15l2 2 4-4',
    poptavka: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
    telefon: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z',
    otazka: 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.6A8 8 0 1 1 21 12zM9.8 9.6a2.3 2.3 0 0 1 4.4.9c0 1.5-2.2 2-2.2 3.2M12 16.5h.01',
    odkaz: 'M5 12h14M13 6l6 6-6 6'
  };
  var ROZC_AKCE = { kalkulace: 1, zavolat: 1, otazka: 1 };
  function vlastni(o, k) { return typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k); }
  // Česká typografie: nezlomitelná mezera po jednopísmenných předložkách a spojkách (KONTEXT §4.9).
  function typo(t) { return String(t).replace(/(^|[\s(„])([vkszaiouVKSZAIOU])\s+/g, '$1$2\u00a0'); }
  function bezpecnaCesta(h) {
    if (typeof h !== 'string' || h.length > 200 || !/^\/(?![\/\\])[^\s\\]*$/.test(h)) return false;
    try { return new URL(h, location.href).origin === location.origin; } catch (e) { return false; }
  }
  function textRozc(t, max) { return typeof t === 'string' && t.trim() && t.length <= max ? t.trim() : null; }
  function overRozcestnik(seznam) {
    var videne = Object.create(null), vysledek = [];
    (Array.isArray(seznam) ? seznam : []).forEach(function (c) {
      if (!c || typeof c !== 'object' || vysledek.length >= 12) return;
      var id = typeof c.id === 'string' && /^[a-z0-9-]{1,32}$/.test(c.id) ? c.id : null;
      var titul = textRozc(c.titul, 48), popis = c.popis == null || c.popis === '' ? '' : textRozc(c.popis, 120);
      if (!id || videne[id] || !titul || popis === null) return;
      var cil = { id: id, titul: titul, popis: popis, ikona: vlastni(ROZC_IKONY, c.ikona) ? c.ikona : null, hlavni: c.hlavni === true };
      if (c.href != null && c.akce == null) {
        if (!bezpecnaCesta(c.href)) return;
        cil.href = c.href;
      } else if (c.akce != null && c.href == null && vlastni(ROZC_AKCE, c.akce)) {
        cil.akce = c.akce;
        if (c.akce === 'otazka' && !(cil.otazka = textRozc(c.otazka, 200))) return;
      } else return;
      videne[id] = 1;
      vysledek.push(cil);
    });
    return vysledek;
  }
  function rozcestnikZDat() {
    if (!KB || !Array.isArray(KB.rozcestnik)) return overRozcestnik(ROZC_VYCHOZI);
    if (!KB.rozcestnik.length) return []; // web rozcestník vypnul (prázdný seznam)
    var cile = overRozcestnik(KB.rozcestnik);
    return cile.length ? cile : overRozcestnik(ROZC_VYCHOZI); // poškozená data → výchozí cíle
  }
  function ikonaRozc(c) {
    var k = c.ikona || (c.akce === 'kalkulace' ? 'cena' : c.akce === 'zavolat' ? 'telefon' : c.akce === 'otazka' ? 'otazka' : 'odkaz');
    return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="' + ROZC_IKONY[k] + '"/></svg>';
  }
  function cestaStranky(p) { return String(p || '/').replace(/\/index\.html?$/, '/'); }
  function vykresliRozcestnik(cile) {
    var obal = d.createElement('div');
    obal.className = 'hb-rozcestnik';
    obal.setAttribute('role', 'navigation'); obal.setAttribute('aria-labelledby', 'hb-rozc-nadpis');
    var nadpis = d.createElement('h3'); nadpis.className = 'hb-rozc-nadpis'; nadpis.id = 'hb-rozc-nadpis'; nadpis.textContent = 'Celý web na jednom místě';
    var seznam = d.createElement('ul'); seznam.className = 'hb-rozc-mriz'; seznam.setAttribute('role', 'list');
    // Hlavní (zlatá) dlaždice první a přes celou šířku; lichá poslední dlaždice také přes celou šířku.
    var hlavni = cile.filter(function (c) { return c.hlavni; }), ostatni = cile.filter(function (c) { return !c.hlavni; });
    var sama = ostatni.length % 2 ? ostatni[ostatni.length - 1] : null;
    hlavni.concat(ostatni).forEach(function (c, i) {
      var li = d.createElement('li'), el, kotva = null;
      if (c.hlavni || c === sama) li.className = 'hb-rozc-sirka';
      li.style.setProperty('--i', String(i));
      if (c.href) {
        el = d.createElement('a'); el.href = c.href;
        var u = new URL(c.href, location.href);
        var tady = cestaStranky(u.pathname) === cestaStranky(location.pathname) && u.search === location.search;
        if (tady && !u.hash) el.setAttribute('aria-current', 'page');
        if (tady && u.hash) kotva = u.hash;
      } else { el = d.createElement('button'); el.type = 'button'; }
      el.className = 'hb-rozc' + (c.hlavni ? ' hb-rozc--hlavni' : '') + (c.akce === 'kalkulace' ? ' hb-cena-hned' : '');
      el.setAttribute('data-cil', c.id);
      // Mezera mezi názvem a popisem: přístupný název „Cena hned Orientační cena…“, ne „hnedOrientační“.
      el.innerHTML = '<span class="hb-rozc-ikona">' + ikonaRozc(c) + '</span><span class="hb-rozc-text"><span class="hb-rozc-titul"></span> <span class="hb-rozc-popis"></span></span>' +
        (el.hasAttribute('aria-current') ? '<span class="hb-rozc-tady" aria-hidden="true">jste zde</span>' : '');
      el.querySelector('.hb-rozc-titul').textContent = typo(c.titul);
      if (c.popis) el.querySelector('.hb-rozc-popis').textContent = typo(c.popis); else el.querySelector('.hb-rozc-popis').remove();
      el.addEventListener('click', function () {
        udalost('hbot_rozcestnik', { cil: c.id });
        zazitek('tuk', 'tuk');
        if (c.akce === 'kalkulace') otevriKalkulaci();
        else if (c.akce === 'zavolat') zavolejteMi();
        else if (c.akce === 'otazka') rychlaOtazka(c.otazka);
        else if (kotva) {
          // Místo na této stránce: panel uhne, cíl dostane fokus (prohlížeč k němu sám posune).
          zavri();
          setTimeout(function () {
            var t = d.getElementById(decodeURIComponent(kotva.slice(1)));
            if (!t) return;
            if (!t.hasAttribute('tabindex')) t.setAttribute('tabindex', '-1');
            t.focus({ preventScroll: true });
            if (location.hash === kotva) t.scrollIntoView({ block: 'start' });
          }, 0);
        }
      });
      li.appendChild(el);
      seznam.appendChild(li);
    });
    obal.appendChild(nadpis);
    obal.appendChild(seznam);
    return obal;
  }
  // Ovládací prvky uvítání (rozcestník, rychlé otázky) se do živé oblasti deníku vloží potichu – čtečka by jinak
  // předčítala desítky dlaždic jako zprávu. Uvítání (vložené o snímek dřív) a oznámení o AI se ohlásí.
  function potichu(fn) {
    return new Promise(function (ok) {
      var hotovo = false;
      var spust = function () {
        if (hotovo) return;
        hotovo = true;
        log.setAttribute('aria-live', 'off');
        try { fn(); } catch (e) {}
        setTimeout(function () { log.setAttribute('aria-live', 'polite'); ok(); }, 250);
      };
      if (window.requestAnimationFrame) requestAnimationFrame(function () { requestAnimationFrame(spust); });
      setTimeout(spust, 120);
    });
  }
  function uvitani() {
    zacatek = true;
    znalosti.then(function () {
      msg('Dobrý den, jsem holub H-BOT. Vyberte, kam chcete jít, nebo se zeptejte.');
      var poznamka = d.createElement('div'); log.appendChild(poznamka);
      // Místo pro rozcestník a rychlé otázky drží pořadí, i když zákazník mezitím položí otázku.
      var misto = d.createElement('div'); misto.className = 'hb-uvod'; log.appendChild(misto);
      var cile = rozcestnikZDat();
      var ticho = potichu(function () {
        if (cile.length) misto.appendChild(vykresliRozcestnik(cile));
        var w = d.createElement('div'); w.className = 'hb-chips hb-chips--otazky';
        // „Cena hned“ a „Zavolejte mi“ jsou v rozcestníku; když v něm nejsou, zůstanou jako čipy.
        if (!cile.some(function (c) { return c.akce === 'kalkulace'; })) w.appendChild(cipCenaHned('hbot_uvitani'));
        (KB.rychle_otazky || []).forEach(function (q) {
          var c = d.createElement('button'); c.type = 'button'; c.className = 'hb-chip'; c.textContent = q;
          c.addEventListener('click', function () { zazitek('tuk', 'tuk'); rychlaOtazka(q); }); w.appendChild(c);
        });
        if (!cile.some(function (c) { return c.akce === 'zavolat'; })) {
          var call = d.createElement('button'); call.type = 'button'; call.className = 'hb-chip'; call.textContent = '☎ Zavolejte mi';
          call.addEventListener('click', function () { zazitek('tuk', 'tuk'); zavolejteMi(); }); w.appendChild(call);
        }
        misto.appendChild(w);
      });
      // Stav AI dorazí do 3 s; úvod, rozcestník a rychlé otázky na něj nečekají.
      stavNacten.then(function () {
        if (!stavAI.ai) return poznamka.remove();
        poznamka.className = 'hb-msg hb-info';
        // AI Act (nařízení EU 2024/1689) čl. 50: člověk musí vědět, že komunikuje s AI.
        var oznameni = function () {
          poznamka.innerHTML = 'Píšete si s asistentem, který používá umělou inteligenci (AI) – nejste ve spojení s člověkem. Na vlastní otázky odpovídají spolupracující AI (' + esc(stavAI.poskytovatele.join(', ')) + ') jen z ověřených informací HSPG; druhá AI odpověď kontroluje. Text otázky se zpracuje u poskytovatele AI (USA). Nepište sem prosím osobní údaje. Okamžitou cenu počítá ceník HSPG, ne AI.';
        };
        oznameni();
        aiZnacka.hidden = false;
        // Oznámení dorazilo během tichého vkládání → po něm se vloží znovu, aby ho čtečka ohlásila.
        if (log.getAttribute('aria-live') === 'off') ticho.then(oznameni);
      });
    });
  }
  function otevri(zdroj, rezim) {
    otvirac = zdroj || d.activeElement;
    styly.then(function () {
      box.hidden = false; Z.otevreno(true); nastavModal(true);
      animujZnak(2.4);
      // Vzdušné švihnutí a ťuknutí (jen když panel otevřel zákazník – při otevření z adresy #hbot nic nezazní).
      zazitek('otevrit', 'tuk');
      if (!zacatek) uvitani();
      ukazOdkazMajitele();
      if (token()) zapniMajitele(location.hash === '#majitel');
      else if (location.hash === '#majitel') prihlaseni();
      if (rezim === 'nabidka') { otevriKalkulaci(); udalost('hbot_open', { majitel: !!token(), rezim: 'kalkulace' }); return; }
      // Na dotyku by fokus do pole vysunul klávesnici dřív, než zákazník uvidí rychlé otázky.
      var dotyk = window.matchMedia && matchMedia('(pointer: coarse)').matches;
      var heslo = d.getElementById('hb-heslo');
      if (!viewM.hidden) (viewM.querySelector('textarea') || tabM).focus({ preventScroll: true });
      else if (heslo) heslo.focus({ preventScroll: true });
      else if (dotyk) box.focus({ preventScroll: true });
      else vstup.focus({ preventScroll: true });
      udalost('hbot_open', { majitel: !!token() });
    });
  }
  // Viditelný prvek (getClientRects – offsetParent je u position:fixed vždy null).
  function viditelny(el) { return !!(el && el !== d.body && el.focus && d.contains(el) && !box.contains(el) && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden'); }
  function zavri() {
    box.hidden = true; Z.otevreno(false); nastavModal(false);
    // Fokus zpět na otvírač, jinak na první viditelné tlačítko (na mobilu lišta, na počítači #hbot-btn).
    var cil = [otvirac].concat(Z.tlacitka).filter(viditelny)[0];
    // Na úvodu úvodní stránky jsou tlačítka schovaná (hlavní výzva je vidět) – fokus pak na začátek obsahu.
    if (!cil && (cil = d.querySelector('main')) && !cil.hasAttribute('tabindex')) cil.tabIndex = -1;
    if (cil) cil.focus({ preventScroll: true });
  }
  box.querySelector('.hb-close').addEventListener('click', zavri);
  majitelBtn.addEventListener('click', prihlaseni);
  tabZ.addEventListener('click', function () { vyberKartu(false); vstup.focus(); });
  tabM.addEventListener('click', function () { vyberKartu(true); });
  tabs.addEventListener('keydown', function (e) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    var m = tabZ.getAttribute('aria-selected') === 'true';
    vyberKartu(m); (m ? tabM : tabZ).focus(); e.preventDefault();
  });
  // Escape zavře jen panel, ve kterém je fokus – ostatní dialogy stránky (cookie lišta, menu) neovlivní.
  box.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !box.hidden) zavri(); });
  box.querySelector('.hb-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var v = vstup.value.trim();
    if (!v || aiBezi) return;
    vstup.value = '';
    // Otázka položená dřív, než dorazí znalosti, se nezahodí – zodpoví se hned po načtení.
    // Do té doby platí zámek aiBezi – další odeslání počká v poli (žádná souběžná placená volání).
    if (KB) vlastniOtazka(v);
    else { aiBezi = true; znalosti.then(function () { aiBezi = false; vlastniOtazka(v); }); }
  });

  window.HSPG_HBOT = {
    otevri: otevri,
    zavri: zavri,
    prepni: function (zdroj) { box.hidden ? otevri(zdroj) : zavri(); },
    // Rovnou okamžitá kalkulace (lišta „Cena hned“, odkazy data-hbot-cena, #cena).
    nabidka: function (zdroj) { if (box.hidden) otevri(zdroj, 'nabidka'); else otevriKalkulaci(); }
  };
})();
