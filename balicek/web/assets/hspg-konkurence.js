/* HSPG · Porovnání s jinou nabídkou (CompetitorShield, úkol 48 + funkce /api/konkurence z větve C).
   Zákazník vloží PDF nebo text nabídky jiného zhotovitele; prohlížeč z PDF vytáhne jen text (PDF.js hostovaný
   u sebe, /assets/vendor/pdfjs/ – soubor se nikam nenahrává) a pošle ho na /api/konkurence. Server text
   neukládá ani neloguje a vrátí neutrální přehled bodů Standardu HOLUB: „uvedeno“ s citací / „v nabídce
   neuvedeno“. Žádné hodnocení nabídky ani zhotovitele (§ 2980 občanského zákoníku – srovnávací reklama).
   Rozhraní: HSPGKonkurence.spust(kontejner, { nabidka?, cena? }) – nabidka = výsledek HSPGCena.spocitej. */
(function () {
  'use strict';
  if (window.HSPGKonkurence) return;
  var d = document;
  var PDFJS = '/assets/vendor/pdfjs/pdf.min.js', WORKER = '/assets/vendor/pdfjs/pdf.worker.min.js';
  var MAX_ZNAKU = 30000, MAX_STRAN = 30, MAX_SOUBOR = 15 * 1024 * 1024;

  function T(s) { return window.HSPGCena ? window.HSPGCena.typografie(s) : String(s); }
  function h(tag, vl, deti) {
    var e = d.createElement(tag);
    Object.keys(vl || {}).forEach(function (k) {
      var v = vl[k];
      if (v == null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
      else if (k === 'hidden' || k === 'disabled' || k === 'checked') e[k] = !!v;
      else e.setAttribute(k, v === true ? '' : v);
    });
    (deti || []).forEach(function (c) { if (c != null && c !== false) e.appendChild(typeof c === 'string' ? d.createTextNode(T(c)) : c); });
    return e;
  }
  // Kolik kroků Standardu HOLUB kalkulace obsahuje: s ochrannou vrstvou všech 5, samotné čištění 01–04.
  function rozsahStandardu(n) {
    var prace = (n.radky || []).filter(function (r) { return r.druh === 'prace'; });
    var sVrstvou = prace.filter(function (r) { return r.cesta === 'A' || r.cesta === 'B'; }).length;
    if (prace.length && sVrstvou === prace.length) return 'Standard HOLUB, všech 5 kroků';
    if (!sVrstvou) return 'Standard HOLUB, kroky 01–04 – čištění bez ochranné vrstvy';
    return 'Standard HOLUB, kroky podle zvolené ochrany';
  }
  function udalost(krok) { try { (window.dataLayer = window.dataLayer || []).push({ event: 'hbot_konkurence', krok: krok }); } catch (e) {} }

  // Text z PDF jen v prohlížeči (bez fontů a bez eval), nejvýš 30 stran a 30 000 znaků.
  function textZPdf(soubor) {
    return import(PDFJS).then(function (pdfjs) {
      pdfjs.GlobalWorkerOptions.workerSrc = WORKER;
      return soubor.arrayBuffer().then(function (data) {
        return pdfjs.getDocument({ data: new Uint8Array(data), isEvalSupported: false, disableFontFace: true, useSystemFonts: false }).promise;
      }).then(function (pdf) {
        var kusy = [], i = 1, n = Math.min(pdf.numPages, MAX_STRAN);
        function dalsi() {
          if (i > n || kusy.join(' ').length > MAX_ZNAKU) return Promise.resolve(kusy.join('\n'));
          return pdf.getPage(i++).then(function (s) { return s.getTextContent(); }).then(function (c) {
            kusy.push(c.items.map(function (x) { return x.str; }).join(' '));
            return dalsi();
          });
        }
        return dalsi().then(function (t) { try { pdf.destroy(); } catch (e) {} return t; });
      });
    });
  }

  function spust(kontejner, moznosti) {
    moznosti = moznosti || {};
    kontejner.innerHTML = '';
    var stav = h('p', { class: 'hn-napoveda', 'aria-live': 'polite' });
    var soubor = h('input', { type: 'file', id: 'hk-soubor', accept: 'application/pdf,.pdf,text/plain,.txt', class: 'hk-vstup' });
    var pole = h('textarea', { id: 'hk-text', class: 'hn-pole', rows: '6', maxlength: String(MAX_ZNAKU), placeholder: 'Nebo sem vložte text nabídky (Ctrl+V)…' });
    var aiPrepinac = h('input', { type: 'checkbox', id: 'hk-ai' });
    var aiRadek = h('label', { class: 'hn-zaskrtavaci', for: 'hk-ai', hidden: true }, [aiPrepinac, h('span', null, ['Přidat krátké shrnutí od AI (dostane jen přehled níže; telefony, e-maily a adresy skryjeme – jména raději předem smažte)'])]);
    var tl = h('button', { type: 'button', class: 'hn-tl hn-tl--zlate' }, ['Porovnat se Standardem HOLUB']);
    var vysledek = h('div', { class: 'hk-vysledek', 'aria-live': 'polite' });
    var obal = h('div', { class: 'hk' }, [
      h('p', { class: 'hk-titul' }, ['Porovnání s jinou nabídkou']),
      h('p', { class: 'hn-pozn' }, ['Ukážeme, které body Standardu HOLUB text nabídky zmiňuje. Nabídku ani firmu nehodnotíme. PDF se čte jen ve vašem prohlížeči; na náš server jde jen text a neukládá se. Jména a adresy z textu můžete předem smazat.']),
      h('div', { class: 'hk-soubor' }, [h('label', { class: 'hn-popisek', for: 'hk-soubor' }, ['Soubor s nabídkou (PDF nebo TXT)']), soubor]),
      h('label', { class: 'hn-popisek', for: 'hk-text' }, ['Text nabídky']),
      pole, aiRadek, tl, stav, vysledek
    ]);
    kontejner.appendChild(obal);
    udalost('otevreno');

    fetch('/api/konkurence', { headers: { accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j && j.ai) aiRadek.hidden = false; })
      .catch(function () {});

    soubor.addEventListener('change', function () {
      var f = soubor.files && soubor.files[0];
      if (!f) return;
      if (f.size > MAX_SOUBOR) { stav.textContent = T('Soubor je příliš velký (nejvýš 15 MB).'); return; }
      stav.textContent = T('Čtu text ze souboru…');
      var cteni = /\.txt$/i.test(f.name) || f.type === 'text/plain' ? f.text() : textZPdf(f);
      cteni.then(function (t) {
        t = String(t || '').replace(/\s+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
        if (t.length < 40) { stav.textContent = T('V souboru jsme nenašli text – asi je naskenovaný. Vložte prosím text nabídky ručně.'); return; }
        pole.value = t.slice(0, MAX_ZNAKU);
        stav.textContent = T('Text načten (' + Math.min(t.length, MAX_ZNAKU).toLocaleString('cs-CZ') + ' znaků). Zkontrolujte ho a klikněte na Porovnat.');
      }).catch(function () { stav.textContent = T('Soubor se nepodařilo přečíst. Vložte prosím text nabídky ručně.'); });
    });

    tl.addEventListener('click', function () {
      var text = pole.value.trim().slice(0, MAX_ZNAKU);
      if (text.length < 40) { stav.textContent = T('Vložte prosím text nabídky (aspoň pár vět).'); pole.focus(); return; }
      tl.disabled = true; stav.textContent = T('Porovnávám…'); vysledek.innerHTML = '';
      udalost('odeslano');
      fetch('/api/konkurence', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ text: text, ai: !aiRadek.hidden && aiPrepinac.checked }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok) throw new Error(j.chyba || 'Porovnání teď není dostupné.'); return j; }); })
        .then(function (j) { stav.textContent = ''; vykresli(j); })
        .catch(function (e) { stav.textContent = T(e.message || 'Porovnání teď není dostupné.'); })
        .then(function () { tl.disabled = false; });
    });

    function vykresli(j) {
      var telo = h('tbody');
      (j.radky || []).forEach(function (r) {
        var ano = r.vNabidce === 'uvedeno';
        telo.appendChild(h('tr', null, [
          h('th', { scope: 'row' }, [r.kriterium]),
          h('td', null, [r.standardHolub]),
          h('td', null, [h('span', { class: ano ? 'hk-ano' : 'hk-ne' }, [ano ? 'uvedeno' : 'v nabídce neuvedeno']), ano && r.citace ? h('span', { class: 'hk-citace' }, ['„' + r.citace + '“']) : null])
        ]));
      });
      var s = j.souhrn || {};
      vysledek.appendChild(h('p', { class: 'hn-paleta-nazev' }, ['Text nabídky zmiňuje ' + (s.uvedeno || 0) + ' z ' + (s.celkem || 0) + ' bodů.']));
      if (moznosti.nabidka && moznosti.cena) vysledek.appendChild(h('p', { class: 'hn-pozn' }, ['Vaše orientační kalkulace HSPG: ' + moznosti.cena.kc(moznosti.nabidka.vysledna) + ' (' + rozsahStandardu(moznosti.nabidka) + ').']));
      vysledek.appendChild(h('div', { class: 'hk-tabulka-obal' }, [h('table', { class: 'hk-tabulka' }, [
        h('thead', null, [h('tr', null, [h('th', { scope: 'col' }, ['Bod']), h('th', { scope: 'col' }, ['Standard HOLUB']), h('th', { scope: 'col' }, ['Text nabídky'])])]),
        telo
      ])]));
      if (j.ai && j.ai.text) vysledek.appendChild(h('div', { class: 'hb-msg hb-info' }, [j.ai.text, h('span', { class: 'hb-stitek' }, [(j.ai.poznamka || 'Shrnutí napsala AI.') + (j.ai.model ? ' · ' + j.ai.model : '')])]));
      if (j.upozorneni) vysledek.appendChild(h('p', { class: 'hn-pozn' }, [j.upozorneni]));
      udalost('vysledek');
    }
    return { zavri: function () { kontejner.innerHTML = ''; } };
  }

  window.HSPGKonkurence = { verze: '1.0.0', spust: spust, textZPdf: textZPdf };
})();
