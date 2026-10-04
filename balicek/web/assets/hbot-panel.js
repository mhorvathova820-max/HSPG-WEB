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
    '<div class="hb-head"><img src="/assets/v/logo-160.webp" alt="" width="40" height="40"><div><h2 id="hb-titulek">H-SPG CORE</h2><p id="hb-podtitulek">Budoucnost ve Vašich rukách</p></div>' +
    '<button type="button" class="hb-close" aria-label="Zavřít pomocníka">✕</button></div>' +
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
    '<div class="hb-pata"><span>' + esc(DOBA) + ' · <a href="tel:' + TEL + '">' + TEL_TEXT + '</a></span>' +
    '<button type="button" class="hb-odkaz" data-majitel hidden>Přihlášení majitele</button></div>';
  d.body.appendChild(box);

  var log = box.querySelector('.hb-log');
  var vstup = box.querySelector('#hb-q');
  var honey = box.querySelector('input[name=_honey]');
  var tabs = box.querySelector('.hb-tabs');
  var tabZ = box.querySelector('#hb-tab-z'), tabM = box.querySelector('#hb-tab-m');
  var viewZ = box.querySelector('#hb-view-z'), viewM = box.querySelector('#hb-view-m');
  var majitelBtn = box.querySelector('[data-majitel]');
  // Návštěvníci odkaz nevidí. Majitel otevře panel přes hspg.cz/#majitel; zařízení si to pak pamatuje.
  var ZARIZENI_KLIC = 'hspg-majitel-zarizeni';
  // Hodnota = podepsaný příznak zařízení ze serveru (výjimka z globálního stropu pokusů o přihlášení).
  function znackaZarizeni() { try { return localStorage.getItem(ZARIZENI_KLIC) || ''; } catch (e) { return ''; } }
  function zarizeniMajitele() { return !!znackaZarizeni(); }
  function zapamatujZarizeni(z) { try { localStorage.setItem(ZARIZENI_KLIC, z || '1'); } catch (e) {} }
  function ukazOdkazMajitele() { majitelBtn.hidden = !(token() || zarizeniMajitele() || location.hash === '#majitel'); }

  function msg(html, trida) {
    var m = d.createElement('div'); m.className = 'hb-msg' + (trida ? ' ' + trida : '');
    if (trida === 'hb-me') m.textContent = html; else m.innerHTML = html;
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
    var a = d.createElement('a'); a.className = 'hb-chip hb-plny'; a.href = '/akce/'; a.textContent = 'Chci cenu do 24 h';
    a.addEventListener('click', function () { udalost('hbot_cta', { cil: 'akce' }); });
    var c = d.createElement('button'); c.type = 'button'; c.className = 'hb-chip'; c.textContent = '☎ Zavolejte mi';
    c.addEventListener('click', zavolejteMi);
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
  function zavolejteMi() {
    if (log.querySelector('form.hb-call')) { log.querySelector('form.hb-call input').focus(); return; }
    var f = d.createElement('form'); f.className = 'hb-msg hb-call'; f.noValidate = true;
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
        'Jméno': jm.value.trim(), 'Telefon': tel, 'Souhlas': 'ano', 'Stránka': location.pathname, 'Zdroj': 'H-BOT'
      });
      var b = f.querySelector('button[type=submit]'); b.disabled = true; b.textContent = 'Odesílám…';
      fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() })
        .then(function (r) {
          if (!r.ok) throw new Error('http ' + r.status);
          f.remove();
          var dik = msg('Děkujeme. Ozveme se vám během pracovní doby (' + esc(DOBA) + ').');
          dik.tabIndex = -1; dik.focus({ preventScroll: true });
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
    viewZ.hidden = !!m; viewM.hidden = !m;
    box.classList.toggle('hb-siroky', !!m);
    d.getElementById('hb-titulek').textContent = m ? 'Vše ve tvých rukách' : 'H-SPG CORE';
    d.getElementById('hb-podtitulek').textContent = m ? 'Všechny AI pro majitele · interní' : 'Budoucnost ve Vašich rukách';
  }
  function odhlas() {
    ss(TOKEN_KLIC, null); ss(PLATNOST_KLIC, null);
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
  function uvitani() {
    zacatek = true;
    znalosti.then(function () {
      msg('Dobrý den, jsem holub H-BOT. Vyberte otázku, nebo napište vlastní.');
      var poznamka = d.createElement('div'); log.appendChild(poznamka);
      // Stav AI dorazí do 3 s; úvod a rychlé otázky na něj nečekají.
      stavNacten.then(function () {
        if (!stavAI.ai) return poznamka.remove();
        poznamka.className = 'hb-msg hb-info';
        poznamka.innerHTML = 'Na vlastní otázky odpovídají spolupracující AI (' + esc(stavAI.poskytovatele.join(', ')) + ') jen z ověřených informací HSPG; druhá AI odpověď kontroluje. Text otázky se zpracuje u poskytovatele AI (USA). Nepište sem prosím osobní údaje.';
      });
      var w = d.createElement('div'); w.className = 'hb-chips';
      (KB.rychle_otazky || []).forEach(function (q) {
        var c = d.createElement('button'); c.type = 'button'; c.className = 'hb-chip'; c.textContent = q;
        c.addEventListener('click', function () { rychlaOtazka(q); }); w.appendChild(c);
      });
      var call = d.createElement('button'); call.type = 'button'; call.className = 'hb-chip'; call.textContent = '☎ Zavolejte mi';
      call.addEventListener('click', zavolejteMi); w.appendChild(call);
      log.appendChild(w);
    });
  }
  function otevri(zdroj) {
    otvirac = zdroj || d.activeElement;
    styly.then(function () {
      box.hidden = false; Z.otevreno(true); nastavModal(true);
      if (!zacatek) uvitani();
      ukazOdkazMajitele();
      if (token()) zapniMajitele(location.hash === '#majitel');
      else if (location.hash === '#majitel') prihlaseni();
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
  function viditelny(el) { return !!(el && el !== d.body && el.focus && d.contains(el) && !box.contains(el) && el.getClientRects().length); }
  function zavri() {
    box.hidden = true; Z.otevreno(false); nastavModal(false);
    // Fokus zpět na otvírač, jinak na první viditelné tlačítko (na mobilu lišta, na počítači #hbot-btn).
    var cil = [otvirac].concat(Z.tlacitka).filter(viditelny)[0];
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
    prepni: function (zdroj) { box.hidden ? otevri(zdroj) : zavri(); }
  };
})();
