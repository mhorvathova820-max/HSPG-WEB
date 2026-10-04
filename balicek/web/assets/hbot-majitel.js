/* „Vše ve tvých rukách“ – karta majitele v plovoucím panelu H-BOT.
   Všechny AI najednou (porovnání) nebo ve spolupráci (návrh → kontrola pravdivosti → finál),
   hotové úlohy včetně „Zkontroluj tuto stránku“. Načítá se jen po přihlášení majitele. */
(function () {
  'use strict';
  var d = document;

  function el(tag, attrs, text) {
    var e = d.createElement(tag);
    for (var k in attrs || {}) {
      if (k === 'class') e.className = attrs[k];
      else if (k === 'style') e.setAttribute('style', attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    if (text != null) e.textContent = text;
    return e;
  }

  function vykresli(koren, o) {
    var AI = window.HSPG_AI;
    koren.innerHTML = '';
    var obal = el('div', { class: 'hbm' });
    koren.appendChild(obal);

    var stav = el('div', { class: 'hbm-stav', 'aria-live': 'polite' }, 'Načítám stav AI…');
    var radek = el('div', { class: 'hbm-radek' });
    var ulohaW = el('div'), rezimW = el('div');
    ulohaW.appendChild(el('label', { for: 'hbm-uloha' }, 'Úloha'));
    var uloha = el('select', { id: 'hbm-uloha' });
    Object.keys(AI.ULOHY).forEach(function (k) { var op = el('option', { value: k }, AI.ULOHY[k].nazev); uloha.appendChild(op); });
    ulohaW.appendChild(uloha);
    rezimW.appendChild(el('label', { for: 'hbm-rezim' }, 'Režim'));
    var rezim = el('select', { id: 'hbm-rezim' });
    rezim.appendChild(el('option', { value: 'vsechny' }, 'Všechny AI najednou'));
    rezim.appendChild(el('option', { value: 'spoluprace' }, 'Spolupráce: návrh → kontrola → finál'));
    rezimW.appendChild(rezim);
    radek.appendChild(ulohaW); radek.appendChild(rezimW);

    var dotazW = el('div');
    dotazW.appendChild(el('label', { for: 'hbm-dotaz' }, 'Zadání (fakta pište sem – AI nesmí nic vymýšlet)'));
    var dotaz = el('textarea', { id: 'hbm-dotaz', placeholder: 'Např.: Paní Nováková z Kolína poptává čištění eternitové střechy 120 m²…' });
    dotazW.appendChild(dotaz);

    var akce = el('div', { class: 'hbm-akce' });
    var odeslat = el('button', { type: 'button', class: 'hb-zlate' }, 'Odeslat');
    var zastavit = el('button', { type: 'button', class: 'hb-obrys', disabled: '' }, 'Zastavit');
    var info = el('span', { class: 'hbm-info', role: 'status' });
    akce.appendChild(odeslat); akce.appendChild(zastavit); akce.appendChild(info);

    var vysledky = el('div', { class: 'hbm-vysledky' });
    var odkazy = el('div', { class: 'hbm-odkazy' });
    [['/ai-centrum/', 'Velké AI centrum ↗'], ['https://chatgpt.com/', 'ChatGPT ↗'], ['https://gemini.google.com/', 'Gemini ↗'], ['https://claude.ai/', 'Claude ↗'], ['https://grok.com/', 'Grok ↗']]
      .forEach(function (x) { var a = el('a', { href: x[0], target: '_blank', rel: 'noopener' }, x[1]); odkazy.appendChild(a); });

    [stav, radek, dotazW, akce, vysledky, odkazy].forEach(function (x) { obal.appendChild(x); });

    var zapnute = [];
    var preruseni = null;

    function odhlasPriChybe(e) {
      if (e && e.status === 401) { info.textContent = 'Přihlášení vypršelo.'; o.odhlas(); return true; }
      return false;
    }

    AI.nactiStav(o.token).then(function (s) {
      stav.innerHTML = '';
      zapnute = s.ai.filter(function (a) { return a.zapnuto; });
      s.ai.forEach(function (a) {
        stav.appendChild(el('span', { class: 'hbm-cip' + (a.zapnuto ? ' on' : ''), title: a.zapnuto ? a.model : 'Vložte ' + a.klic + ' do Netlify' }, a.zapnuto ? a.nazev + ' ✓' : a.nazev + ': chybí klíč'));
      });
      if (s.utrata) {
        stav.appendChild(el('span', { class: 'hbm-cip' }, 'Útrata AI měsíce ≈ ' + Math.round(s.utrata.celkemKc) + ' / ' + s.limitKc + ' Kč'));
      }
      if (s.gateway && s.kredity) {
        stav.appendChild(el('span', { class: 'hbm-cip', title: 'AI běží přes Netlify AI Gateway a platí se kredity Netlify. Po vyčerpání kreditů Netlify pozastaví celý web.' },
          'Kredity Netlify na AI ≈ ' + s.kredity.utraceno + ' / ' + s.kredity.limit));
      }
      stav.appendChild(el('span', { class: 'hbm-cip' + (s.verejnyAsistent ? ' on' : '') }, s.verejnyAsistent ? 'AI pro zákazníky zapnutá' : 'AI pro zákazníky vypnutá (AI_ZAPNUTO=0)'));
      if (!zapnute.length) info.textContent = 'Žádná AI nemá klíč – vložte ho do Netlify → Environment variables.';
    }).catch(function (e) {
      if (!odhlasPriChybe(e)) stav.textContent = 'Stav AI se nepodařilo načíst: ' + e.message;
    });

    uloha.addEventListener('change', function () {
      if (uloha.value === 'stranka' && !dotaz.value.trim()) {
        dotaz.value = AI.textStranky(30000);
        info.textContent = 'Vložen text této stránky (' + dotaz.value.length.toLocaleString('cs-CZ') + ' znaků).';
      }
    });

    function karta(nazev, barva, podnadpis) {
      var k = el('article', { class: 'hbm-karta', style: '--c:' + barva });
      var h = el('h3', null, nazev);
      h.appendChild(el('span', null, podnadpis || ''));
      var text = el('div', { class: 'hbm-text', 'aria-live': 'polite' });
      var pata = el('div', { class: 'hbm-pata' });
      var kop = el('button', { type: 'button' }, 'Kopírovat');
      var st = el('span');
      kop.addEventListener('click', function () {
        var t = k.getAttribute('data-final') || text.innerText;
        if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { kop.textContent = 'Zkopírováno'; setTimeout(function () { kop.textContent = 'Kopírovat'; }, 1500); });
      });
      pata.appendChild(kop); pata.appendChild(st);
      k.appendChild(h); k.appendChild(text); k.appendChild(pata);
      vysledky.appendChild(k);
      return { k: k, text: text, st: st };
    }

    function zacni() { preruseni = new AbortController(); odeslat.disabled = true; zastavit.disabled = false; return preruseni.signal; }
    function skonci(t) { odeslat.disabled = false; zastavit.disabled = true; preruseni = null; info.textContent = t || 'Hotovo.'; }
    zastavit.addEventListener('click', function () { if (preruseni) preruseni.abort(); });

    odeslat.addEventListener('click', function () {
      var zadani = dotaz.value.trim();
      if (!zadani) { info.textContent = 'Napište zadání.'; dotaz.focus(); return; }
      if (!zapnute.length) { info.textContent = 'Žádná AI není zapnutá.'; return; }
      var pokyn = AI.ULOHY[uloha.value].pokyn;
      var signal = zacni();
      vysledky.innerHTML = '';

      if (rezim.value === 'vsechny') {
        info.textContent = 'Ptám se ' + zapnute.length + ' AI…';
        Promise.all(zapnute.map(function (a) {
          var c = karta(a.nazev, AI.BARVY[a.id] || '#c9a962', a.model);
          return AI.zavolej({ ai: a.id, zpravy: [{ role: 'user', text: zadani }], pokyn: pokyn, token: o.token, signal: signal, naText: function (t) { c.text.textContent = t; } })
            .then(function (r) { c.st.textContent = r.stat.vstup + ' + ' + r.stat.vystup + ' tokenů' + (r.stat.kc ? ' · ≈ ' + r.stat.kc.toFixed(2) + ' Kč' : ''); })
            .catch(function (e) { if (!odhlasPriChybe(e)) { c.text.textContent = e.name === 'AbortError' ? 'Zastaveno.' : e.message; c.text.classList.add('hb-chyba'); } });
        })).then(function () { skonci(); });
        return;
      }

      var role = AI.obsazeni(zapnute);
      var jmeno = function (id) { var a = zapnute.filter(function (x) { return x.id === id; })[0]; return a ? a.nazev : id; };
      var c = karta('Spolupráce', '#c9a962', jmeno(role.autor) + ' → ' + jmeno(role.kontrola) + ' → ' + jmeno(role.final));
      AI.spolupracuj({
        autor: role.autor, kontrola: role.kontrola, final: role.final, dotaz: zadani, pokyn: pokyn, token: o.token, signal: signal,
        naKrok: function (i, nazev, ai) {
          info.textContent = i + '/3 ' + nazev.toLowerCase() + '…';
          c.text.appendChild(el('div', { class: 'hbm-krok' }, i + '. ' + nazev + ' – ' + jmeno(ai)));
          var cil = el('div'); c.text.appendChild(cil);
          return function (t) { cil.textContent = t; c.text.scrollTop = c.text.scrollHeight; };
        }
      }).then(function (k) {
        c.k.setAttribute('data-final', k.final);
        c.st.textContent = 'Kopírovat zkopíruje jen finální verzi.';
        skonci();
      }).catch(function (e) {
        if (!odhlasPriChybe(e)) c.text.appendChild(el('div', { class: 'hb-chyba' }, e.name === 'AbortError' ? 'Zastaveno.' : e.message));
        skonci(' ');
      });
    });
  }

  window.HSPG_HBOT_MAJITEL = { vykresli: vykresli };
})();
