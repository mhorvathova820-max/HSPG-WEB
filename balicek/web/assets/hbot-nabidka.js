/* H-BOT · Okamžitá kalkulace („Cena hned“) – úkol 48, rozhodnutí majitele R16 (22. 10. 2026).
   Načítá se líně z panelu (/assets/hbot-panel.js) až po kliknutí na „Cena hned“. Cenu počítá výhradně
   cenové jádro HSPGCena (/assets/hspg-cena.js) z ceníku webu – žádné číslo není v tomto souboru natvrdo
   a žádná AI se nevolá. Bez potvrzeného ceníku (content/cenik-potvrzeni.json) se částka neukáže.
   Postup: objekt → povrchy → ochrana (cesta A / B s odstínem RAL / čištění) → plochy → obálka s cenou →
   PDF kalkulace, NÁVRH smlouvy o dílo, plánovač, zavolání zpět, porovnání s jinou nabídkou.
   Rozhraní: HSPGNabidka.spust(kontejner, moznosti) a HSPGNabidka.nastav({ mereni, naseptavac }) – adaptér
   měření z adresy (úkol 27, /api/cena-z-adresy) zapojí agent ve VS Code podle skutečného rozhraní webu. */
(function () {
  'use strict';
  if (window.HSPGNabidka) return;
  var d = document;
  var C = null; // HSPGCena (cenové jádro)
  var NASTAVENI = { mereni: null, naseptavac: null };
  var KLID = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

  function T(s) { return C ? C.typografie(s) : String(s); }
  // DOM bez innerHTML pro texty: řetězce jdou přes textContent (bezpečné) s českou typografií.
  function h(tag, vlastnosti, deti) {
    var e = d.createElement(tag);
    if (vlastnosti) Object.keys(vlastnosti).forEach(function (k) {
      var v = vlastnosti[k];
      if (v == null || v === false) return;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = T(v);
      else if (k === 'svg') e.innerHTML = v; // jen statické ikony z tohoto souboru
      else if (k.indexOf('on') === 0) e.addEventListener(k.slice(2), v);
      else if (k === 'hidden' || k === 'disabled' || k === 'checked' || k === 'required') e[k] = !!v;
      else if (k === 'value') e.value = v;
      else e.setAttribute(k, v === true ? '' : v);
    });
    (deti || []).forEach(function (c) {
      if (c == null || c === false) return;
      e.appendChild(typeof c === 'string' || typeof c === 'number' ? d.createTextNode(T(c)) : c);
    });
    return e;
  }
  function ikona(cesta) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="' + cesta + '"/></svg>'; }
  var IKONY = {
    rd: 'M3 11.5 12 4l9 7.5M5.5 9.8V20h13V9.8M10 20v-5h4v5',
    bytovy: 'M5 21V4h10v17M15 9h4v12M8 7h1m2 0h1M8 10h1m2 0h1M8 13h1m2 0h1M8 16h1m2 0h1M3 21h18',
    firma: 'M3 21V10l5 3v-3l5 3v-3l5 3V5h3v16zM3 21h18M7 17h2m3 0h2m3 0h2',
    jiny: 'M4 14h6v6H4zM17 17m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M14 4l4 7h-8z',
    strecha: 'M2 13.5 12 5l10 8.5M5 11v8h14v-8M9 15.5h6',
    fasada: 'M4 21V5h16v16M8 9h2m4 0h2M8 13h2m4 0h2M10 21v-4h4v4',
    dlazba: 'M3 7h18M3 12h18M3 17h18M8 7v5m6 0v5m2-10v5M6 12v5m5 0v4m7-4v4',
    fve: 'M4 15 7 5h10l3 10zM5.5 10h13M9.5 5l-1 10m6-10 1 10M12 15v4m-4 0h8',
    A: 'M12 3l7 3v5c0 4.5-3 8.5-7 10-4-1.5-7-5.5-7-10V6zM12 9s2.4 2.7 2.4 4.4a2.4 2.4 0 0 1-4.8 0C9.6 11.7 12 9 12 9z',
    B: 'M12 3a9 9 0 1 0 0 18c1 0 1.5-.7 1.5-1.5 0-1.2-1-1.5-1-2.5 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.1-4-7.5-9-7.5zM7.5 11h.01M10 7.5h.01m4.5 0h.01',
    cisteni: 'M12 3s5 6 5 10a5 5 0 0 1-10 0c0-4 5-10 5-10zM10 14a2 2 0 0 0 2 2',
    zpet: 'M15 18l-6-6 6-6',
    pdf: 'M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6M9 9h2',
    smlouva: 'M14 3H6v18h12V7zM14 3v4h4M9 12h6M9 15h6M9 18h3',
    kalendar: 'M4 6h16v14H4zM4 10h16M9 3v4m6-4v4',
    telefon: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z',
    vaha: 'M12 3v18M5 7h14M5 7l-3 7a3.5 3.5 0 0 0 6 0zM19 7l-3 7a3.5 3.5 0 0 0 6 0zM8 21h8',
    upravit: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
    odeslat: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
    kontrola: 'M20 6 9 17l-5-5'
  };
  // Pečeť: zlatý origami holub (stejné tvary jako znak H-BOTa).
  var HOLUB_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g transform="translate(0 3)">' +
    '<polygon points="11.2,10.4 5.2,2.6 14.2,9.2" fill="#5c430a"/><polygon points="2.4,13.6 7.6,12.2 12.6,10.2 19.4,9.6 17.4,13.6 10.6,16.2 5.6,15.8" fill="#8a6a12"/>' +
    '<polygon points="7.6,12.2 12.6,10.2 19.4,9.6 12.8,12.8" fill="#a8841e"/><polygon points="12.6,10.2 16.6,1.8 15.2,10.2" fill="#c99d2e"/>' +
    '<polygon points="12.6,10.2 15.2,10.2 13.4,12.6" fill="#7a5a0e"/><polygon points="17.6,9.7 22.2,8.4 19.6,12.2" fill="#a8841e"/>' +
    '<polygon points="2.4,13.6 0.6,11.2 4.6,12.8" fill="#6e520c"/><polygon points="2.4,13.6 1.2,16.4 5.6,15.8" fill="#5c430a"/></g></svg>';

  var POPIS_TYPU = {
    rd: 'Střecha, fasáda, dlažba kolem domu',
    bytovy: 'Bytové domy a SVJ, hromadné zakázky',
    firma: 'Haly, administrativa, zpevněné plochy',
    jiny: 'Jiná stavba – plochy zadáte sami'
  };
  var KROKY = ['Objekt', 'Povrchy', 'Ochrana', 'Plochy', 'Cena'];
  var POVRCHY_PORADI = ['strecha', 'fasada', 'dlazba', 'fve'];
  var MAX_PLOCHA = 100000;

  function cislo(text) {
    var n = Number(String(text == null ? '' : text).replace(/\s| /g, '').replace(',', '.'));
    return isFinite(n) ? n : NaN;
  }
  function udalost(nazev, data) {
    try { window.dataLayer = window.dataLayer || []; var o = { event: nazev }; for (var k in data || {}) o[k] = data[k]; window.dataLayer.push(o); } catch (e) {}
  }
  // Zvuk a vibrace (assets/hspg-zazitek.js, úkol 56) – načítá ho panel; bez něj se nic nestane.
  function zazitek(zvuk, haptika) {
    var z = window.HSPGZazitek;
    if (!z) return;
    try { if (zvuk) z.zvuk(zvuk); if (haptika) z.haptika(haptika); } catch (e) {}
  }
  function skript(src) {
    return new Promise(function (ok, chyba) {
      var s = d.createElement('script'); s.src = src; s.async = true;
      s.onload = function () { ok(); }; s.onerror = function () { chyba(new Error('Nelze načíst ' + src)); };
      d.head.appendChild(s);
    });
  }
  function cisloKalkulace() {
    var t = new Date(), p = function (x) { return (x < 10 ? '0' : '') + x; }, n = 0;
    try { var a = new Uint16Array(1); (window.crypto || window.msCrypto).getRandomValues(a); n = a[0] % 10000; } catch (e) { n = Math.floor(Math.random() * 10000); }
    return 'NK-' + t.getFullYear() + p(t.getMonth() + 1) + p(t.getDate()) + '-' + ('000' + n).slice(-4);
  }
  function datumCz(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? Number(m[3]) + '. ' + Number(m[2]) + '. ' + m[1] : ''; }

  /** Spustí kalkulaci v kontejneru. moznosti = { jadro?: engine, zpet: fn, zavadec: HSPG_HBOT_ZAVADEC,
   *  zavolejte: fn(souhrn), dokumenty: url, konkurence: url, planovac: url, poptavka: url } */
  function spust(kontejner, moznosti) {
    moznosti = moznosti || {};
    C = window.HSPGCena;
    var Z = moznosti.zavadec || window.HSPG_HBOT_ZAVADEC || null;
    var jadroSlib = moznosti.jadro ? Promise.resolve(moznosti.jadro) : C.nacti();
    var J = null;
    var S = {
      krok: 0, hotovo: -1, typ: null,
      povrchy: {}, volba: {}, plochy: {}, zpusob: {}, rozmery: {},
      med: { zapnuto: false, delka: '' }, obec: null, vysledek: null, cislo: null, otevreno: false,
      gen: 0 // roste s každým krokem – odložené akce (animace, výběr myší) starého kroku se pak neprovedou
    };

    kontejner.innerHTML = '';
    var hlas = h('p', { class: 'hb-skryte', 'aria-live': 'polite' });
    var nadpisKroku = h('h3', { class: 'hn-nadpis', id: 'hn-nadpis', tabindex: '-1' }, ['Cena hned']);
    var seznamKroku = h('ol', { class: 'hn-kroky', 'aria-label': 'Postup kalkulace' });
    var telo = h('div', { class: 'hn-telo' });
    var tlZpet = h('button', { type: 'button', class: 'hn-tl hn-tl--duch', onclick: function () { if (S.krok > 0) jdi(S.krok - 1); else zavri(); } }, ['Zpět']);
    var tlDal = h('button', { type: 'button', class: 'hn-tl hn-tl--zlate', onclick: function () { dalsi(); } }, ['Pokračovat']);
    var chyba = h('p', { class: 'hn-chyba', role: 'alert', hidden: true });
    var pata = h('div', { class: 'hn-pata' }, [chyba, h('div', { class: 'hn-pata-tl' }, [tlZpet, tlDal])]);
    // div místo header/section: styly webu pro tyto prvky (šířka, okraje) by se do panelu propsaly.
    var obal = h('div', { class: 'hn', role: 'region', 'aria-labelledby': 'hn-nadpis' }, [
      h('div', { class: 'hn-hlava' }, [
        h('button', { type: 'button', class: 'hn-zpet', 'aria-label': 'Zpět do rozhovoru', svg: ikona(IKONY.zpet), onclick: function () { zavri(); } }),
        h('div', { class: 'hn-titul' }, [h('p', { class: 'hn-stitek' }, ['Okamžitá kalkulace · ceník HSPG']), nadpisKroku]),
        seznamKroku
      ]),
      telo, pata, hlas
    ]);
    kontejner.appendChild(obal);
    telo.appendChild(h('p', { class: 'hn-nacitam' }, ['Načítám ceník…']));
    tlDal.disabled = true;

    function zavri() { if (moznosti.zpet) moznosti.zpet(); }

    jadroSlib.then(function (jadro) {
      J = jadro;
      udalost('hbot_kalkulace', { krok: 'start', potvrzeno: !!J.potvrzeno });
      jdi(0, true);
    }).catch(function () {
      telo.innerHTML = '';
      telo.appendChild(h('p', { class: 'hn-chyba' }, ['Ceník se teď nepodařilo načíst. Cenu vám rádi spočítáme po telefonu nebo z poptávky.']));
      telo.appendChild(akceKontakt());
    });

    // --- kroky ---------------------------------------------------------------------------------------
    function vykresliKroky() {
      seznamKroku.innerHTML = '';
      KROKY.forEach(function (nazev, i) {
        var stav = i === S.krok ? 'aktualni' : i <= S.hotovo ? 'hotovo' : 'dalsi';
        var polozka = h('li', { class: 'hn-krok hn-krok--' + stav, 'aria-current': i === S.krok ? 'step' : null });
        if (stav === 'hotovo' && i !== 4) {
          polozka.appendChild(h('button', { type: 'button', onclick: function () { jdi(i); }, 'aria-label': 'Krok ' + (i + 1) + ': ' + nazev + ' (upravit)' }, [h('span', { class: 'hn-krok-c' }, [String(i + 1)]), h('span', { class: 'hn-krok-n' }, [nazev])]));
        } else {
          polozka.appendChild(h('span', { class: 'hn-krok-c', 'aria-hidden': 'true' }, [String(i + 1)]));
          polozka.appendChild(h('span', { class: 'hn-krok-n' }, [nazev]));
        }
        seznamKroku.appendChild(polozka);
      });
    }
    function povrchyVybrane() { return POVRCHY_PORADI.filter(function (p) { return S.povrchy[p]; }); }
    function jenFve() { var v = povrchyVybrane(); return v.length === 1 && v[0] === 'fve'; }
    function jdi(krok, prvni) {
      if (krok === 2 && jenFve()) krok = S.krok > 2 ? 1 : 3; // u samotné fotovoltaiky se ochrana nevybírá
      S.krok = krok;
      S.gen++;
      chyba.hidden = true;
      telo.innerHTML = '';
      vykresliKroky();
      tlZpet.textContent = T(krok === 0 ? 'Zpět do rozhovoru' : 'Zpět');
      tlDal.hidden = krok === 4;
      tlDal.disabled = false;
      tlDal.textContent = T(krok === 3 ? 'Spočítat cenu' : 'Pokračovat');
      nadpisKroku.textContent = T(['O jaký objekt jde?', 'Co chcete ošetřit?', 'Jakou ochranu zvolíte?', 'Jak velké jsou plochy?', 'Vaše orientační cena'][krok]);
      [krokObjekt, krokPovrchy, krokOchrana, krokPlochy, krokNabidka][krok]();
      telo.scrollTop = 0;
      hlas.textContent = T('Krok ' + (krok + 1) + ' z 5: ' + KROKY[krok]);
      if (!prvni) nadpisKroku.focus({ preventScroll: true });
      udalost('hbot_kalkulace', { krok: KROKY[krok] });
    }
    function ukazChybu(text, pole) {
      zazitek('chyba', 'chyba');
      chyba.textContent = ''; chyba.hidden = false;
      setTimeout(function () { chyba.textContent = T(text); }, 30);
      if (pole && pole.focus) { pole.setAttribute('aria-invalid', 'true'); pole.focus(); }
    }
    function dalsi() {
      if (S.krok === 0 && !S.typ) return ukazChybu('Vyberte prosím typ objektu.', telo.querySelector('input'));
      if (S.krok === 1 && !povrchyVybrane().length) return ukazChybu('Vyberte prosím aspoň jeden povrch.', telo.querySelector('input'));
      if (S.krok === 2) {
        var bezBarvy = povrchyVybrane().filter(function (p) { return S.volba[p] && S.volba[p].cesta === 'B' && !S.volba[p].barva; })[0];
        if (bezBarvy) return ukazChybu('Vyberte prosím odstín pro ' + (bezBarvy === 'strecha' ? 'střechu' : 'fasádu') + ' – nebo napište vlastní kód RAL či NCS.', telo.querySelector('[data-povrch="' + bezBarvy + '"] .hn-ral-pole'));
      }
      if (S.krok === 3) {
        var spatne = povrchyVybrane().filter(function (p) { var n = cislo(S.plochy[p]); return !(n > 0 && n <= MAX_PLOCHA); })[0];
        if (spatne) return ukazChybu('Zadejte prosím plochu – ' + C.POVRCHY[spatne].nazev.toLowerCase() + ' (m²), nebo ji spočítejte z rozměrů.', telo.querySelector('#hn-plocha-' + spatne));
        if (S.med.zapnuto && !(cislo(S.med.delka) > 0)) return ukazChybu('Zadejte délku hřebene pro měděný prvek, nebo ho vypněte.', telo.querySelector('#hn-med-delka'));
      }
      S.hotovo = Math.max(S.hotovo, S.krok);
      jdi(S.krok + 1);
    }

    // Karta volby (radio / checkbox schované, karta je popisek → nativní klávesnice a čtečky).
    function karta(typ, jmeno, hodnota, zaskrtnuto, titulek, popis, cena, ikonaCesta, priZmene) {
      var id = 'hn-' + jmeno + '-' + hodnota;
      var vstup = h('input', { type: typ, name: jmeno, id: id, value: hodnota, class: 'hn-skryty-vstup', checked: zaskrtnuto, onchange: function (e) { zazitek('tuk', 'tuk'); priZmene(e); } });
      return h('div', { class: 'hn-volba' }, [
        vstup,
        h('label', { for: id, class: 'hn-karta' + (cena ? ' hn-karta--cena' : '') }, [
          ikonaCesta ? h('span', { class: 'hn-karta-ikona', svg: ikona(ikonaCesta) }) : null,
          h('span', { class: 'hn-karta-text' }, [
            h('span', { class: 'hn-karta-titul' }, [titulek]),
            popis ? h('span', { class: 'hn-karta-popis' }, [popis]) : null
          ]),
          cena ? h('span', { class: 'hn-karta-cena' }, [cena]) : null,
          h('span', { class: 'hn-karta-znacka', svg: ikona(IKONY.kontrola) })
        ])
      ]);
    }

    function krokObjekt() {
      var sk = h('fieldset', { class: 'hn-otazka' }, [h('legend', { class: 'hb-skryte' }, ['Typ objektu'])]);
      var mriz = h('div', { class: 'hn-volby' });
      Object.keys(C.TYPY_OBJEKTU).forEach(function (id) {
        mriz.appendChild(karta('radio', 'typ', id, S.typ === id, C.TYPY_OBJEKTU[id], POPIS_TYPU[id], null, IKONY[id], function () {
          S.typ = id; chyba.hidden = true;
          // výběr myší rovnou pokračuje (klávesnice šipkami jen vybírá)
          if (zadanoMysi) { var gen = S.gen; setTimeout(function () { if (gen === S.gen) dalsi(); }, 160); }
        }));
      });
      sk.appendChild(mriz);
      telo.appendChild(sk);
      telo.appendChild(h('p', { class: 'hn-pozn' }, ['Bez zadání kontaktu. Orientační cenu počítá ceník HSPG platný od ' + datumCz(J.cenik.platnost_od) + ', ne umělá inteligence; konečnou cenu potvrdíme po ověření rozsahu na místě. Výpočet běží ve vašem prohlížeči; odešle se jen rozepsaný název obce pro našeptávač.']));
      sledujMys(sk);
    }
    var zadanoMysi = false;
    function sledujMys(el) {
      el.addEventListener('pointerdown', function () { zadanoMysi = true; });
      el.addEventListener('keydown', function () { zadanoMysi = false; });
    }

    function sazbaText(povrch) {
      if (!J.potvrzeno) return ''; // sazby jen s potvrzeným ceníkem (pravidlo úkolu 27)
      var c = J.cenik, k = C.POVRCHY[povrch].klic;
      var vse = [(c.cisteni_only || {})[k], (c.ochrana_hstone || {})[k], (c.renovace_color || {})[k]].filter(function (x) { return x > 0; });
      return vse.length ? 'od ' + Math.min.apply(null, vse) + ' Kč/m²' : '';
    }
    function krokPovrchy() {
      var sk = h('fieldset', { class: 'hn-otazka' }, [h('legend', { class: 'hb-skryte' }, ['Povrchy k ošetření (můžete vybrat víc)'])]);
      var mriz = h('div', { class: 'hn-volby' });
      var popisy = { strecha: 'Tašky, plech, eternit', fasada: 'Omítka, cihla, obklad', dlazba: 'Vjezdy, terasy, chodníky', fve: 'Šetrné čištění panelů' };
      POVRCHY_PORADI.forEach(function (p) {
        mriz.appendChild(karta('checkbox', 'povrch', p, !!S.povrchy[p], C.POVRCHY[p].nazev, popisy[p], sazbaText(p), IKONY[p], function (e) {
          S.povrchy[p] = e.target.checked; chyba.hidden = true;
          if (S.povrchy[p] && !S.volba[p] && p !== 'fve') S.volba[p] = { cesta: 'A', barva: null };
        }));
      });
      sk.appendChild(mriz);
      telo.appendChild(sk);
      var sl = J.cenik.discounts || {};
      if (J.potvrzeno && sl.multi_surface) telo.appendChild(h('p', { class: 'hn-pozn' }, ['Dva a více povrchů: sleva ' + Math.round(sl.multi_surface * 100) + ' %. Slevy se nesčítají – uplatní se nejvýhodnější.']));
    }

    // Celý postup Standardu HOLUB nad volbou: kroky 01–04 vždy, krok 05 podle zvolené cesty (přání majitele 22. 10.).
    function postupStandardu() {
      var kroky = (J.standard && J.standard.kroky) || [];
      if (!kroky.length) return null;
      return h('div', { class: 'hn-postup', role: 'group', 'aria-label': 'Postup Standard HOLUB' }, [
        h('p', { class: 'hn-postup-titul' }, ['Postup je vždy celý – Standard HOLUB']),
        h('ol', { class: 'hn-postup-kroky' }, kroky.map(function (k) {
          var volitelny = k.cislo === '05';
          return h('li', { class: 'hn-postup-krok' + (volitelny ? ' hn-postup-krok--volba' : '') }, [
            h('span', { class: 'hn-postup-c' }, [k.cislo]),
            h('span', { class: 'hn-postup-n' }, [volitelny ? k.nazev + ' podle volby' : k.nazev])
          ]);
        }))
      ]);
    }
    // Když zákazník váhá (dlouho bez volby nebo opakované přepínání), nabídne H-BOT vysvětlení – nic se samo neotevře.
    function hlidejVahani(misto) {
      if (S.pomocNabidnuta || !moznosti.zeptejSe) return function () {};
      var gen = S.gen, prepnuti = 0;
      function nabidni() {
        if (gen !== S.gen || S.pomocNabidnuta) return;
        S.pomocNabidnuta = true;
        udalost('hbot_kalkulace', { krok: 'vahani' });
        misto.appendChild(h('div', { class: 'hn-vahani', role: 'note' }, [
          h('p', { class: 'hn-vahani-text' }, ['Nevíte, kterou cestu zvolit? Rozdíl mezi neviditelným štítem a barevnou renovací vám vysvětlím.']),
          h('div', { class: 'hn-vahani-akce' }, [
            h('button', { type: 'button', class: 'hn-tl hn-tl--duch', onclick: function () { moznosti.zeptejSe('Jaký je rozdíl mezi neviditelným štítem a barevnou renovací?'); } }, ['Zeptat se H-BOTa']),
            moznosti.zavolejte ? h('button', { type: 'button', class: 'hn-odkaz hn-odkaz--tichy', onclick: function () { moznosti.zavolejte(S.cislo ? S.cislo + ': váhá mezi cestou A a B' : 'Váhá mezi cestou A a B'); } }, ['Raději zavolejte']) : null
          ])
        ]));
      }
      setTimeout(nabidni, 20000);
      return function () { prepnuti++; if (prepnuti >= 3) nabidni(); };
    }

    function krokOchrana() {
      var postup = postupStandardu();
      if (postup) telo.appendChild(postup);
      var prepnuto = function () {};
      povrchyVybrane().filter(function (p) { return p !== 'fve'; }).forEach(function (p) {
        if (!S.volba[p]) S.volba[p] = { cesta: 'A', barva: null };
        var volba = S.volba[p];
        var sk = h('fieldset', { class: 'hn-otazka hn-otazka--povrch', 'data-povrch': p }, [h('legend', { class: 'hn-legenda' }, [C.POVRCHY[p].nazev])]);
        var mriz = h('div', { class: 'hn-volby hn-volby--cesty' });
        var cesty = J.cestyPro(p).concat([{ id: 'cisteni', nazev: 'Čištění a ošetření', popis: 'Kroky 01–04 Standardu HOLUB – čištění, odmaštění, ošetření biocidy a oplach – bez finální ochranné vrstvy.', sazba: (J.cenik.cisteni_only || {})[C.POVRCHY[p].klic] }]);
        if (!cesty.some(function (c) { return c.id === volba.cesta; })) volba.cesta = cesty[0].id;
        var paleta = h('div', { class: 'hn-paleta', hidden: volba.cesta !== 'B' });
        cesty.forEach(function (c) {
          if (!c.sazba) return;
          var titul = c.id === 'A' ? 'A · ' + c.nazev + ' H-STONE' : c.id === 'B' ? 'B · ' + c.nazev : c.nazev;
          var popis = c.id === 'A' && zarukaKratce() ? c.popis + ' ' + zarukaKratce() : c.popis;
          mriz.appendChild(karta('radio', 'cesta-' + p, c.id, volba.cesta === c.id, titul, popis, J.potvrzeno ? c.sazba + ' Kč/m²' : null, IKONY[c.id], function () {
            volba.cesta = c.id; chyba.hidden = true; paleta.hidden = c.id !== 'B'; prepnuto();
          }));
        });
        sk.appendChild(mriz);
        if (J.cestyPro(p).some(function (c) { return c.id === 'B'; })) { vykresliPaletu(paleta, p, volba); sk.appendChild(paleta); }
        telo.appendChild(sk);
      });
      if (S.povrchy.fve) telo.appendChild(h('p', { class: 'hn-pozn' }, ['Fotovoltaiku jen šetrně čistíme – ochrannou vrstvu na panely nedáváme.']));
      if (J.standard && J.standard.biocidy_veta) telo.appendChild(h('p', { class: 'hn-pozn hn-pozn--biocid' }, [J.standard.biocidy_veta]));
      var mistoPomoci = h('div', { class: 'hn-pomoc-misto' });
      telo.appendChild(mistoPomoci);
      prepnuto = hlidejVahani(mistoPomoci);
    }
    // „Záruka 10 let při péči SENTINEL BASE (499 Kč ročně).“ – z dat, jen když je tarif povinný pro záruku.
    function zarukaKratce() {
      var base = J.tarify().filter(function (t) { return t.povinny_pro_zaruku; })[0];
      return base ? 'Záruka 10 let při péči ' + base.nazev + ' (' + C.kc(base.cena_rok) + ' ročně).' : '';
    }
    function vykresliPaletu(paleta, p, volba) {
      var barvy = J.barvy(p);
      var nazev = h('p', { class: 'hn-paleta-nazev', 'aria-live': 'polite' }, [volba.barva ? volba.barva.ral + ' · ' + (volba.barva.nazev || '') : 'Vyberte odstín']);
      var mriz = h('div', { class: 'hn-ral', role: 'radiogroup', 'aria-label': 'Odstín ' + (p === 'strecha' ? 'střechy' : 'fasády') });
      var vlastni = h('input', { type: 'text', class: 'hn-pole hn-ral-pole', id: 'hn-ral-' + p, maxlength: '24', placeholder: 'např. RAL 7016 nebo NCS S 2005-Y20R', autocomplete: 'off', value: volba.barva && volba.barva.vlastni ? volba.barva.ral : '' });
      function vyber(b, tl) {
        zazitek('tuk', 'tuk');
        volba.barva = b;
        Array.prototype.forEach.call(mriz.children, function (x) { x.setAttribute('aria-checked', x === tl ? 'true' : 'false'); x.tabIndex = x === tl ? 0 : -1; });
        nazev.textContent = T(b.ral + (b.nazev ? ' · ' + b.nazev : ''));
        if (!b.vlastni) vlastni.value = '';
        chyba.hidden = true;
      }
      barvy.forEach(function (b, i) {
        var vybrana = volba.barva && !volba.barva.vlastni && volba.barva.ral === b.ral;
        var tl = h('button', { type: 'button', role: 'radio', class: 'hn-vzorek', 'aria-checked': vybrana ? 'true' : 'false', tabindex: vybrana || (!volba.barva && i === 0) ? '0' : '-1', 'aria-label': b.ral + ' ' + b.nazev, title: b.ral + ' · ' + b.nazev, style: '--vzorek:' + b.hex });
        tl.addEventListener('click', function () { vyber({ ral: b.ral, nazev: b.nazev, hex: b.hex }, tl); });
        mriz.appendChild(tl);
      });
      // šipky v radiogroup
      mriz.addEventListener('keydown', function (e) {
        var kl = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!kl) return;
        var deti = Array.prototype.slice.call(mriz.children), i = deti.indexOf(d.activeElement);
        var dalsiTl = deti[(i + kl + deti.length) % deti.length];
        dalsiTl.focus(); dalsiTl.click(); e.preventDefault();
      });
      vlastni.addEventListener('input', function () {
        var t = vlastni.value.trim().replace(/\s+/g, ' ');
        if (/^(RAL ?\d{4}|NCS ?S? ?\d{4}-?[A-Z0-9]{0,5})$/i.test(t)) {
          volba.barva = { ral: t.toUpperCase().replace(/^RAL ?/, 'RAL ').replace(/^NCS ?/, 'NCS '), nazev: 'vlastní odstín', vlastni: true };
          Array.prototype.forEach.call(mriz.children, function (x) { x.setAttribute('aria-checked', 'false'); });
          nazev.textContent = T(volba.barva.ral + ' · vlastní odstín');
          vlastni.removeAttribute('aria-invalid');
        } else if (volba.barva && volba.barva.vlastni) { volba.barva = null; nazev.textContent = T('Vyberte odstín'); }
      });
      paleta.appendChild(h('p', { class: 'hn-paleta-titul' }, ['Odstín ' + (p === 'strecha' ? 'střechy' : 'fasády')]));
      paleta.appendChild(mriz);
      paleta.appendChild(nazev);
      paleta.appendChild(h('label', { class: 'hn-popisek', for: 'hn-ral-' + p }, ['Vlastní odstín (RAL nebo NCS)']));
      paleta.appendChild(vlastni);
      paleta.appendChild(h('p', { class: 'hn-pozn' }, ['Barvy na obrazovce jsou orientační – přesný odstín potvrdí vzorník při zaměření.']));
    }

    // --- plochy ------------------------------------------------------------------------------------
    function krokPlochy() {
      if (NASTAVENI.mereni) telo.appendChild(blokMereni());
      povrchyVybrane().forEach(function (p) { telo.appendChild(blokPlochy(p)); });
      telo.appendChild(blokObec());
    }
    function poleCisla(id, popisek, hodnota, jednotka, priZmene, napoveda) {
      var vstup = h('input', { type: 'text', inputmode: 'decimal', class: 'hn-pole', id: id, value: hodnota == null ? '' : String(hodnota).replace('.', ','), autocomplete: 'off', 'aria-describedby': napoveda ? id + '-n' : null });
      vstup.addEventListener('input', function () { vstup.removeAttribute('aria-invalid'); chyba.hidden = true; priZmene(vstup.value); });
      return h('div', { class: 'hn-cislo' }, [
        h('label', { for: id, class: 'hn-popisek' }, [popisek]),
        h('div', { class: 'hn-cislo-obal' }, [vstup, jednotka ? h('span', { class: 'hn-jednotka', 'aria-hidden': 'true' }, [jednotka]) : null]),
        napoveda ? h('p', { class: 'hn-napoveda', id: id + '-n' }, [napoveda]) : null
      ]);
    }
    function blokPlochy(p) {
      var nazev = C.POVRCHY[p].nazev;
      var hlavni = poleCisla('hn-plocha-' + p, p === 'fve' ? 'Plocha panelů' : 'Plocha – ' + nazev.toLowerCase(), S.plochy[p], 'm²', function (v) {
        S.plochy[p] = v; S.zpusob[p] = 'plocha zadaná zákazníkem'; stavZpusobu.textContent = '';
      }, p === 'strecha' ? 'Plocha střešních rovin, ne půdorys domu.' : null);
      var plochaVstup = hlavni.querySelector('input');
      var stavZpusobu = h('p', { class: 'hn-zpusob', 'aria-live': 'polite' }, [S.zpusob[p] && S.zpusob[p] !== 'plocha zadaná zákazníkem' ? S.zpusob[p] : '']);
      var kalk = h('div', { class: 'hn-rozmery', hidden: true });
      var r = S.rozmery[p] = S.rozmery[p] || {};
      function nastavPlochu(m2, zpusob) {
        var x = Math.round(m2 * 10) / 10;
        if (!(x > 0)) return;
        S.plochy[p] = String(x); S.zpusob[p] = zpusob;
        plochaVstup.value = C.cislo(x, 1);
        plochaVstup.removeAttribute('aria-invalid');
        stavZpusobu.textContent = T('= ' + C.cislo(x, 1) + ' m² · ' + zpusob);
      }
      function prepocti() {
        var a = cislo(r.a), b = cislo(r.b), n;
        if (p === 'strecha') {
          var sk = C.SKLONY.filter(function (s) { return s.id === (r.sklon || 'bezna'); })[0] || C.SKLONY[2];
          if (a > 0 && b > 0) nastavPlochu(a * b * sk.koeficient, 'půdorys ' + C.cislo(a, 1) + ' × ' + C.cislo(b, 1) + ' m, sklon ' + sk.nazev.toLowerCase() + ' (× ' + C.cislo(sk.koeficient, 2) + ')');
        } else if (p === 'fasada') {
          var obvod = cislo(r.obvod) > 0 ? cislo(r.obvod) : (a > 0 && b > 0 ? 2 * (a + b) : NaN);
          var vyska = cislo(r.vyska) > 0 ? cislo(r.vyska) : (cislo(r.podlazi) > 0 ? cislo(r.podlazi) * C.VYSKA_PODLAZI : NaN);
          var odecet = r.otvory ? C.ODECET_OTVORU : 0;
          if (obvod > 0 && vyska > 0) nastavPlochu(obvod * vyska * (1 - odecet), 'obvod ' + C.cislo(obvod, 1) + ' m × výška ' + C.cislo(vyska, 1) + ' m' + (odecet ? ' − okna a dveře ' + Math.round(odecet * 100) + ' %' : ''));
        } else if (p === 'dlazba') {
          if (a > 0 && b > 0) nastavPlochu(a * b, C.cislo(a, 1) + ' × ' + C.cislo(b, 1) + ' m');
        } else if (p === 'fve') {
          n = Math.round(cislo(r.panely));
          if (n > 0) nastavPlochu(n * C.PANEL_M2, n + ' panelů × ' + C.cislo(C.PANEL_M2, 1) + ' m²');
        }
      }
      function radek(deti) { return h('div', { class: 'hn-radek' }, deti); }
      if (p === 'strecha') {
        kalk.appendChild(radek([
          poleCisla('hn-' + p + '-a', 'Délka půdorysu', r.a, 'm', function (v) { r.a = v; prepocti(); }),
          poleCisla('hn-' + p + '-b', 'Šířka půdorysu', r.b, 'm', function (v) { r.b = v; prepocti(); })
        ]));
        var sklon = h('select', { class: 'hn-pole', id: 'hn-strecha-sklon' });
        C.SKLONY.forEach(function (s) { sklon.appendChild(h('option', { value: s.id }, [s.nazev])); });
        sklon.value = r.sklon || 'bezna';
        sklon.addEventListener('change', function () { r.sklon = sklon.value; prepocti(); });
        kalk.appendChild(h('div', { class: 'hn-cislo' }, [h('label', { for: 'hn-strecha-sklon', class: 'hn-popisek' }, ['Sklon střechy']), sklon]));
        kalk.appendChild(h('p', { class: 'hn-napoveda' }, ['Půdorys měřte včetně přesahů střechy.']));
      } else if (p === 'fasada') {
        kalk.appendChild(radek([
          poleCisla('hn-' + p + '-obvod', 'Obvod domu', r.obvod, 'm', function (v) { r.obvod = v; prepocti(); }, 'nebo délka a šířka níže'),
          poleCisla('hn-' + p + '-vyska', 'Výška fasády', r.vyska, 'm', function (v) { r.vyska = v; prepocti(); }, 'nebo počet podlaží')
        ]));
        kalk.appendChild(radek([
          poleCisla('hn-' + p + '-a', 'Délka', r.a, 'm', function (v) { r.a = v; prepocti(); }),
          poleCisla('hn-' + p + '-b', 'Šířka', r.b, 'm', function (v) { r.b = v; prepocti(); }),
          poleCisla('hn-' + p + '-podlazi', 'Podlaží', r.podlazi, '×', function (v) { r.podlazi = v; prepocti(); })
        ]));
        if (r.otvory == null) r.otvory = S.typ === 'bytovy';
        var otv = h('input', { type: 'checkbox', id: 'hn-fasada-otvory', checked: r.otvory });
        otv.addEventListener('change', function () { r.otvory = otv.checked; prepocti(); });
        kalk.appendChild(h('label', { class: 'hn-zaskrtavaci', for: 'hn-fasada-otvory' }, [otv, h('span', null, ['Odečíst okna a dveře (' + Math.round(C.ODECET_OTVORU * 100) + ' %)'])]));
      } else if (p === 'dlazba') {
        kalk.appendChild(radek([
          poleCisla('hn-' + p + '-a', 'Délka', r.a, 'm', function (v) { r.a = v; prepocti(); }),
          poleCisla('hn-' + p + '-b', 'Šířka', r.b, 'm', function (v) { r.b = v; prepocti(); })
        ]));
      } else if (p === 'fve') {
        kalk.appendChild(poleCisla('hn-' + p + '-panely', 'Počet panelů', r.panely, 'ks', function (v) { r.panely = v; prepocti(); }, 'Jeden panel počítáme jako ' + C.cislo(C.PANEL_M2, 1) + ' m².'));
      }
      var prepinac = h('button', { type: 'button', class: 'hn-odkaz', 'aria-expanded': 'false', 'aria-controls': 'hn-rozmery-' + p }, [p === 'fve' ? 'Spočítat z počtu panelů' : 'Spočítat z rozměrů']);
      kalk.id = 'hn-rozmery-' + p;
      prepinac.addEventListener('click', function () {
        kalk.hidden = !kalk.hidden; prepinac.setAttribute('aria-expanded', kalk.hidden ? 'false' : 'true');
        if (!kalk.hidden) { var prvni = kalk.querySelector('input,select'); if (prvni) prvni.focus(); }
      });
      var blok = h('div', { class: 'hn-plocha', 'data-povrch': p }, [
        h('div', { class: 'hn-plocha-hlava' }, [h('span', { class: 'hn-plocha-ikona', svg: ikona(IKONY[p]) }), h('span', { class: 'hn-legenda' }, [nazev])]),
        hlavni, stavZpusobu, h('div', { class: 'hn-plocha-odkazy' }, [prepinac, h('a', { class: 'hn-odkaz hn-odkaz--tichy', href: moznosti.zamereni || moznosti.poptavka || '/akce/' }, ['Plochu neznám – změříme ji na dálku'])]), kalk
      ]);
      var med = p === 'strecha' ? blokMed() : null;
      if (med) blok.appendChild(med);
      return blok;
    }
    function blokMed() {
      var a = J.cenik.addons || {};
      if (!a.copper_guard_base_4m) return null;
      var delka = poleCisla('hn-med-delka', 'Délka hřebene', S.med.delka, 'm', function (v) { S.med.delka = v; });
      delka.hidden = !S.med.zapnuto;
      var zap = h('input', { type: 'checkbox', id: 'hn-med', checked: S.med.zapnuto });
      zap.addEventListener('change', function () {
        S.med.zapnuto = zap.checked; delka.hidden = !zap.checked;
        if (zap.checked && !S.med.delka && S.rozmery.strecha && cislo(S.rozmery.strecha.a) > 0) {
          S.med.delka = String(Math.max(cislo(S.rozmery.strecha.a), cislo(S.rozmery.strecha.b) || 0));
          delka.querySelector('input').value = S.med.delka.replace('.', ',');
        }
        if (zap.checked) delka.querySelector('input').focus();
      });
      return h('div', { class: 'hn-med' }, [
        h('label', { class: 'hn-zaskrtavaci', for: 'hn-med' }, [zap, h('span', null, ['Měděný hřebenový prvek s ražbou holuba' + (J.potvrzeno ? ' – ' + C.kc(a.copper_guard_base_4m) + ' do 4 m, každý další metr ' + C.kc(a.copper_guard_per_meter) : '')])]),
        delka
      ]);
    }
    // Obec objektu → odhad dopravy (našeptávač obcí z veřejného /api/planovac?navrh=, bez ulice a čísla domu).
    function blokObec() {
      var id = 'hn-obec';
      var vstup = h('input', { type: 'text', id: id, class: 'hn-pole', autocomplete: 'off', maxlength: '60', placeholder: 'např. Kolín', role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-controls': id + '-navrhy', value: S.obec ? S.obec.obec : '' });
      var navrhy = h('ul', { class: 'hn-navrhy', id: id + '-navrhy', role: 'listbox', hidden: true });
      var info = h('p', { class: 'hn-napoveda', 'aria-live': 'polite' }, [S.obec ? textDopravy() : 'Bez obce dopravu upřesníme při potvrzení ceny.']);
      var casovac = null, rizeni = null, aktivni = -1, seznam = [];
      function textDopravy() { var x = C.dopravaPro(J.cenik, S.obec.lat, S.obec.lon); return x.text; }
      function zavriNavrhy() { navrhy.hidden = true; navrhy.innerHTML = ''; seznam = []; aktivni = -1; vstup.setAttribute('aria-expanded', 'false'); vstup.removeAttribute('aria-activedescendant'); }
      function zvol(n) {
        S.obec = n; vstup.value = n.obec + (n.okres && n.okres !== n.obec ? ' (okres ' + n.okres + ')' : '');
        zavriNavrhy(); info.textContent = T(textDopravy());
      }
      vstup.addEventListener('input', function () {
        S.obec = null; info.textContent = T('Bez obce dopravu upřesníme v nabídce.');
        clearTimeout(casovac);
        var t = vstup.value.trim();
        if (t.length < 2) return zavriNavrhy();
        casovac = setTimeout(function () {
          if (rizeni) rizeni.abort();
          rizeni = window.AbortController ? new AbortController() : null;
          fetch('/api/planovac?navrh=' + encodeURIComponent(t.slice(0, 60)), { signal: rizeni ? rizeni.signal : undefined, headers: { accept: 'application/json' } })
            .then(function (r) { return r.ok ? r.json() : { navrhy: [] }; })
            .then(function (j) {
              seznam = (j && Array.isArray(j.navrhy) ? j.navrhy : []).filter(function (n) { return typeof n.lat === 'number' && typeof n.lon === 'number'; }).slice(0, 8);
              navrhy.innerHTML = '';
              if (!seznam.length || d.activeElement !== vstup) return zavriNavrhy();
              seznam.forEach(function (n, i) {
                var li = h('li', { role: 'option', id: id + '-n' + i, 'aria-selected': 'false' }, [n.obec + ' ', h('small', null, [(n.castObce ? 'část obce ' + n.castObce + ', ' : '') + 'okres ' + n.okres])]);
                li.addEventListener('mousedown', function (e) { e.preventDefault(); zvol(n); });
                navrhy.appendChild(li);
              });
              navrhy.hidden = false; vstup.setAttribute('aria-expanded', 'true');
            })
            .catch(function () {});
        }, 250);
      });
      vstup.addEventListener('keydown', function (e) {
        if (navrhy.hidden || !seznam.length) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          aktivni = (aktivni + (e.key === 'ArrowDown' ? 1 : -1) + seznam.length) % seznam.length;
          Array.prototype.forEach.call(navrhy.children, function (li, i) { li.setAttribute('aria-selected', i === aktivni ? 'true' : 'false'); });
          vstup.setAttribute('aria-activedescendant', id + '-n' + aktivni); e.preventDefault();
        } else if (e.key === 'Enter' && aktivni >= 0) { zvol(seznam[aktivni]); e.preventDefault(); }
        else if (e.key === 'Escape') { zavriNavrhy(); e.stopPropagation(); }
      });
      vstup.addEventListener('blur', function () { setTimeout(zavriNavrhy, 150); });
      return h('div', { class: 'hn-obec' }, [
        h('label', { for: id, class: 'hn-popisek' }, ['Obec objektu (pro dopravu, nepovinné)']),
        h('div', { class: 'hn-obec-obal' }, [vstup, navrhy]),
        info,
        h('p', { class: 'hn-zdroj' }, ['Seznam obcí: © ČÚZK, CC BY 4.0, upraveno'])
      ]);
    }
    // Měření z adresy (úkol 27) – jen když web adaptér nastavil. Výsledek je odhad, zákazník ho může upravit.
    function blokMereni() {
      var vstup = h('input', { type: 'text', id: 'hn-adresa', class: 'hn-pole', autocomplete: 'street-address', maxlength: '120', placeholder: 'Ulice a číslo, obec' });
      var stav = h('p', { class: 'hn-napoveda', 'aria-live': 'polite' });
      var tl = h('button', { type: 'button', class: 'hn-tl hn-tl--duch' }, ['Změřit']);
      tl.addEventListener('click', function () {
        var t = vstup.value.trim();
        if (t.length < 5) { stav.textContent = T('Napište prosím adresu objektu.'); vstup.focus(); return; }
        tl.disabled = true; stav.textContent = T('Měřím…');
        Promise.resolve(NASTAVENI.mereni(t)).then(function (v) {
          var pl = (v && v.plochy) || {}, nalez = [];
          ['strecha', 'fasada'].forEach(function (p) {
            if (S.povrchy[p] && pl[p] > 0) { S.plochy[p] = String(Math.round(pl[p] * 10) / 10); S.zpusob[p] = 'odhad HOLUB CORE QUANTUM SENSE'; nalez.push(p); }
          });
          if (v && typeof v.lat === 'number' && typeof v.lon === 'number') S.obec = { obec: v.obec || '', okres: v.okres || '', lat: v.lat, lon: v.lon };
          tl.disabled = false;
          if (!nalez.length) { stav.textContent = T('Plochy se teď nepodařilo změřit – zadejte je prosím níže.'); return; }
          jdi(3, true);
          var s2 = telo.querySelector('.hn-mereni .hn-napoveda');
          if (s2) s2.textContent = T('Hotovo – plochy jsou odhad, upravte je podle skutečnosti.');
        }).catch(function () { tl.disabled = false; stav.textContent = T('Měření teď není k dispozici – zadejte prosím plochy níže.'); });
      });
      return h('div', { class: 'hn-mereni' }, [
        h('p', { class: 'hn-mereni-titul' }, ['HOLUB CORE QUANTUM SENSE · zaměření na dálku']),
        h('label', { for: 'hn-adresa', class: 'hn-popisek' }, ['Adresa objektu']),
        h('div', { class: 'hn-mereni-radek' }, [vstup, tl]),
        stav
      ]);
    }

    // --- výsledek: obálka s pečetí → cena --------------------------------------------------------------
    function vstupProJadro() {
      var polozky = povrchyVybrane().map(function (p) {
        var v = S.volba[p] || {};
        return { povrch: p, cesta: p === 'fve' ? 'cisteni' : (v.cesta || 'A'), plocha: cislo(S.plochy[p]), barva: v.cesta === 'B' ? v.barva : null, zpusob: S.zpusob[p] || 'plocha zadaná zákazníkem', med: p === 'strecha' && S.med.zapnuto ? cislo(S.med.delka) : 0 };
      });
      return { typObjektu: S.typ, polozky: polozky, lat: S.obec ? S.obec.lat : undefined, lon: S.obec ? S.obec.lon : undefined };
    }
    function souhrn(n) {
      var casti = n.radky.filter(function (r) { return r.druh === 'prace'; }).map(function (r) {
        return C.POVRCHY[r.povrch].nazev.toLowerCase() + ' ' + (r.cesta === 'A' ? 'A' : r.cesta === 'B' ? 'B' + (r.barva ? ' ' + r.barva.ral : '') : 'čištění') + ' ' + C.cislo(r.mnozstvi, 1) + ' m²';
      });
      return S.cislo + ': ' + casti.join(', ') + (S.obec ? ' · ' + S.obec.obec : '') + ' → ' + C.kc(n.vysledna);
    }
    function krokNabidka() {
      var n;
      try { n = J.spocitej(vstupProJadro()); } catch (e) {
        var zprava = e && e.message ? e.message : 'Kalkulaci se nepodařilo spočítat – zkontrolujte prosím plochy.';
        setTimeout(function () { jdi(3); ukazChybu(zprava); }, 0); // až po dokončení jdi(4), jinak by chybu hned skryl
        return;
      }
      S.vysledek = n;
      S.cislo = S.cislo || cisloKalkulace();
      S.hotovo = 4;
      vykresliKroky();
      udalost('hbot_kalkulace', { krok: 'vysledek', povrchu: n.radky.filter(function (r) { return r.druh === 'prace'; }).length, potvrzeno: n.potvrzeno });
      if (!n.potvrzeno) {
        telo.appendChild(h('div', { class: 'hn-vysledek' }, [
          h('p', { class: 'hn-cena-stitek' }, ['Ceník právě potvrzujeme']),
          h('p', null, ['Orientační cenu vám pošleme do 24 hodin – stačí poptávka nebo zavolání.']),
          akceKontakt()
        ]));
        return;
      }
      var vysledek = vykresliVysledek(n);
      if (KLID || S.otevreno) { telo.appendChild(vysledek); S.otevreno = true; ukazCenu(vysledek, n, true); return; }
      // Obřad: zapečetěná obálka, pečeť se rozlomí, dopis vyjede, holubi vzlétnou, částka naběhne.
      var pecet = h('button', { type: 'button', class: 'hn-pecet', svg: HOLUB_SVG, 'aria-label': 'Rozlomit pečeť a ukázat cenu' });
      var obalka = h('div', { class: 'hn-obalka', 'data-stav': 'zapecetena' }, [
        h('div', { class: 'hn-obalka-zadni' }),
        h('div', { class: 'hn-obalka-dopis' }, [h('span', { class: 'hn-obalka-cislo' }, ['Kalkulace č. ' + S.cislo]), h('span', { class: 'hn-obalka-linka' })]),
        h('div', { class: 'hn-obalka-predni' }),
        h('div', { class: 'hn-obalka-klopa' }),
        pecet
      ]);
      // § 1732 odst. 2 OZ: že nejde o nabídku, musí být zřejmé už před otevřením, ne až pod částkou (rada AI 22. 10.).
      var vyzva = h('p', { class: 'hn-obalka-vyzva' }, ['Vaše orientační cena je zapečetěná. Rozlomte pečeť – otevřením nic neobjednáváte, jde o orientační výpočet, ne nabídku.']);
      var preskocit = h('button', { type: 'button', class: 'hn-odkaz hn-odkaz--tichy' }, ['Zobrazit cenu bez animace']);
      // Malé hejno (dekorace, úkol 56) popisuje jen to, co kalkulace opravdu udělala: plochy zadal zákazník (nic se
      // neměřilo), cena je z ceníku, vstupy prošly kontrolou, výsledek je zapečetěný. Doběhne do 1,2 s, nic nezdrží.
      var hejnoObalky = h('div', { class: 'hn-hejno', 'aria-hidden': 'true' }, ['Plochy', 'Ceník', 'Kontrola', 'Pečeť'].map(function (t, i) {
        var holub = h('span', { class: 'hn-hejno-holub', svg: (Z && Z.holubSvg) || HOLUB_SVG }, [t]);
        holub.style.setProperty('--i', String(i));
        return holub;
      }));
      telo.appendChild(h('div', { class: 'hn-obrad' }, [hejnoObalky, obalka, vyzva, preskocit]));
      var otevreno = false, genObalky = S.gen;
      function otevri() {
        if (otevreno) return; otevreno = true; S.otevreno = true;
        zazitek('pecet', 'pecet');
        obalka.setAttribute('data-stav', 'otevrena');
        if (Z && Z.hejno) Z.hejno(pecet);
        setTimeout(function () {
          if (genObalky !== S.gen) return; // mezitím jiný krok
          telo.innerHTML = '';
          telo.appendChild(vysledek);
          ukazCenu(vysledek, n, false);
        }, 1050);
      }
      pecet.addEventListener('click', otevri);
      preskocit.addEventListener('click', function () {
        otevreno = true; S.otevreno = true;
        telo.innerHTML = ''; telo.appendChild(vysledek); ukazCenu(vysledek, n, true);
      });
      setTimeout(function () { pecet.focus({ preventScroll: true }); }, 60);
    }
    function ukazCenu(vysledek, n, hned) {
      zazitek('cena', 'cena');
      var cil = vysledek.querySelector('.hn-cena-castka');
      var castka = n.vysledna;
      if (hned || KLID || !window.requestAnimationFrame) { cil.textContent = T(C.kc(castka)); }
      else {
        var start = null;
        var krok = function (ted) {
          if (start === null) start = ted;
          var u = Math.min(1, (ted - start) / 1100), e = u === 1 ? 1 : 1 - Math.pow(2, -10 * u);
          cil.textContent = T(C.kc(Math.round(castka * e / 10) * 10));
          if (u < 1) requestAnimationFrame(krok);
        };
        requestAnimationFrame(krok);
      }
      var nadpis = vysledek.querySelector('.hn-cena-stitek');
      if (nadpis) { nadpis.tabIndex = -1; nadpis.focus({ preventScroll: true }); }
      hlas.textContent = T('Orientační cena celkem ' + C.kc(castka) + '.');
    }
    function radekRozpisu(nazev, detail, castka, trida) {
      return h('tr', { class: trida || null }, [
        h('th', { scope: 'row' }, [h('span', { class: 'hn-r-nazev' }, [nazev]), detail ? h('span', { class: 'hn-r-detail' }, [detail]) : null]),
        h('td', null, [castka])
      ]);
    }
    function vykresliVysledek(n) {
      var a = J.cenik.addons || {};
      var rozpis = h('tbody');
      n.radky.forEach(function (r) {
        var mnozstvi = r.jednotka === 'm' ? r.mnozstvi + ' m' : C.cislo(r.mnozstvi, 1) + ' m²' + (r.sazba ? ' × ' + r.sazba + ' Kč' : '');
        var detail = [r.detail, r.druh === 'prace' && r.zpusob ? r.zpusob : null, mnozstvi].filter(Boolean).join(' · ');
        rozpis.appendChild(radekRozpisu(r.nazev, detail, C.kc(r.castka)));
      });
      if (n.sleva) rozpis.appendChild(radekRozpisu(n.sleva.nazev + ' (' + Math.round(n.sleva.sazba * 100) + ' %)', null, '−' + C.kc(n.sleva.castka), 'hn-r-sleva'));
      rozpis.appendChild(radekRozpisu('Doprava', n.doprava.text, n.doprava.znamo ? C.kc(n.doprava.cena) : 'upřesníme'));
      if (n.minimumPouzito) rozpis.appendChild(radekRozpisu('Doplatek do minimální zakázky ' + C.kc(n.minimum), null, C.kc(n.minimum - n.predMinimem)));
      if (Math.abs(n.zaokrouhleni) >= 0.5) rozpis.appendChild(radekRozpisu('Zaokrouhlení na desítky Kč', null, (n.zaokrouhleni > 0 ? '+' : '−') + C.kc(Math.abs(n.zaokrouhleni))));
      var tabulka = h('table', { class: 'hn-rozpis' }, [h('caption', { class: 'hb-skryte' }, ['Rozpis orientační ceny']), rozpis, h('tfoot', null, [radekRozpisu('Celkem (orientačně)', 'nejsme plátci DPH, DPH se nepřipočítává', C.kc(n.vysledna), 'hn-r-celkem')])]);

      var maA = n.radky.some(function (r) { return r.cesta === 'A'; });
      // Cesta B (barevná renovace) nemá číselnou smluvní záruku (rozhodnutí 22. 10. 2026): platí zákonná práva
      // z vadného plnění; případnou záruku k nátěrovému systému výrobce stanoví konečná smlouva (čl. 7 návrhu).
      var maB = n.radky.some(function (r) { return r.cesta === 'B'; });
      var kroky = h('ol', { class: 'hn-standard' });
      (n.kroky || []).forEach(function (k) { kroky.appendChild(h('li', null, [h('b', null, [k.cislo + ' ' + k.nazev]), ' ' + k.popis])); });
      var cesty = (n.cesty || []).map(function (c) { return h('p', { class: 'hn-cesta' }, [h('b', null, ['Cesta ' + c.id + ' – ' + c.nazev + ': ']), c.popis]); });

      var tarify = null;
      if (maA && J.tarify().length) {
        tarify = h('div', { class: 'hn-tarify' });
        J.tarify().forEach(function (t) {
          tarify.appendChild(h('div', { class: 'hn-tarif' + (t.povinny_pro_zaruku ? ' hn-tarif--zaklad' : '') }, [
            h('p', { class: 'hn-tarif-nazev' }, [t.nazev]),
            h('p', { class: 'hn-tarif-cena' }, [C.kc(t.cena_rok) + ' ročně']),
            t.povinny_pro_zaruku ? h('p', { class: 'hn-tarif-stitek' }, ['podmínka záruky']) : null,
            h('ul', null, (t.body || []).map(function (b) { return h('li', null, [b]); }))
          ]));
        });
      }
      var akce = h('div', { class: 'hn-akce' }, [
        tlAkce('pdf', 'Stáhnout kalkulaci (PDF)', function (tl) { dokument('kalkulace', tl); }, true),
        tlAkce('smlouva', 'NÁVRH smlouvy o dílo (PDF)', function () { formularSmlouvy(); }),
        odkazAkce('kalendar', 'Vybrat termín v plánovači', moznosti.planovac || '/planovac/'),
        moznosti.zavolejte ? tlAkce('telefon', 'Zavolejte mi k této kalkulaci', function () { udalost('hbot_kalkulace', { krok: 'zavolat' }); moznosti.zavolejte(souhrn(n)); }) : odkazAkce('odeslat', 'Poslat poptávku', moznosti.poptavka || '/akce/'),
        tlAkce('vaha', 'Porovnat s jinou nabídkou', function () { porovnani(); }),
        tlAkce('upravit', 'Upravit zadání', function () { S.otevreno = true; jdi(3); })
      ]);
      var smlouvaMisto = h('div', { class: 'hn-smlouva-misto' });
      var porovnaniMisto = h('div', { class: 'hn-porovnani-misto' });
      return h('div', { class: 'hn-vysledek' }, [
        h('div', { class: 'hn-certifikat' }, [
          h('p', { class: 'hn-cena-stitek' }, ['Orientační cena celkem']),
          h('p', { class: 'hn-cena-castka' }, [C.kc(0)]),
          h('p', { class: 'hn-cena-dph' }, ['Nejsme plátci DPH · kalkulace č. ' + S.cislo]),
          h('p', { class: 'hn-nezavazne' }, ['Orientační výpočet, ne nabídka. Přesnou cenu potvrdíme po ověření rozsahu na místě.']),
          h('p', { class: 'hn-platba' }, [n.platba.text]),
          maA && zarukaKratce() ? h('p', { class: 'hn-platba hn-zaruka' }, [zarukaKratce() + ' Zákonná práva z vadného plnění tím nejsou dotčena.']) : null,
          maB ? h('p', { class: 'hn-platba hn-zaruka hn-zaruka--b' }, ['Barevná renovace: platí zákonná práva z vadného plnění; smluvní záruku k nátěrovému systému výrobce barvy stanoví konečná smlouva.']) : null,
          n.skipPay ? h('p', { class: 'hn-platba hn-platba--skip' }, [n.skipPay.text + ' Orientačně ' + n.skipPay.splatek + ' × ' + C.kc(n.skipPay.splatka) + '.']) : null
        ]),
        akce, smlouvaMisto, porovnaniMisto,
        h('details', { class: 'hn-detail', open: true }, [h('summary', null, ['Rozpis ceny']), tabulka]),
        h('details', { class: 'hn-detail' }, [h('summary', null, ['Postup podle Standardu HOLUB']), kroky].concat(cesty)),
        tarify ? h('details', { class: 'hn-detail' }, [h('summary', null, ['Péče SENTINEL a záruka']), h('p', null, [J.podminkaZaruky()]), tarify]) : null,
        h('p', { class: 'hn-pozn' }, ['Orientační cena z ceníku platného od ' + datumCz(n.platnostCeniku) + ' a z ploch, které jste zadali. Přesnou cenu potvrdíme po prohlídce na místě. Silné znečištění může znamenat příplatek ' + (a.heavy_dirt_surcharge_min || 0) + '–' + (a.heavy_dirt_surcharge_max || 0) + ' Kč/m², vždy předem.']),
        n.biocidy ? h('p', { class: 'hn-pozn hn-pozn--biocid' }, [n.biocidy]) : null
      ]);
      function tlAkce(ik, text, fn, hlavni) {
        var tl = h('button', { type: 'button', class: 'hn-akce-tl' + (hlavni ? ' hn-akce-tl--zlate' : '') }, [h('span', { class: 'hn-akce-ikona', svg: ikona(IKONY[ik]) }), h('span', null, [text])]);
        tl.addEventListener('click', function () { fn(tl); });
        return tl;
      }
      function odkazAkce(ik, text, href) { return h('a', { class: 'hn-akce-tl', href: href }, [h('span', { class: 'hn-akce-ikona', svg: ikona(IKONY[ik]) }), h('span', null, [text])]); }

      function formularSmlouvy() {
        if (smlouvaMisto.firstChild) { smlouvaMisto.innerHTML = ''; return; }
        var pole = [['jmeno', 'Jméno a příjmení / firma', 'name'], ['ico', 'IČO (u firmy, nepovinné)', 'off'], ['adresa', 'Adresa objektu', 'street-address'], ['telefon', 'Telefon (nepovinné)', 'tel'], ['email', 'E-mail (nepovinné)', 'email']];
        var f = h('form', { class: 'hn-smlouva', novalidate: true });
        f.appendChild(h('p', { class: 'hn-smlouva-titul' }, ['Údaje do NÁVRHU smlouvy']));
        f.appendChild(h('p', { class: 'hn-napoveda' }, ['Nepovinné. Dokument se vytvoří jen ve vašem prohlížeči – údaje se nikam neodesílají. Prázdná pole zůstanou k vyplnění rukou.']));
        pole.forEach(function (x) {
          f.appendChild(h('div', { class: 'hn-cislo' }, [h('label', { class: 'hn-popisek', for: 'hn-s-' + x[0] }, [x[1]]), h('input', { type: x[0] === 'email' ? 'email' : x[0] === 'telefon' ? 'tel' : 'text', id: 'hn-s-' + x[0], name: x[0], class: 'hn-pole', autocomplete: x[2], maxlength: '120' })]));
        });
        var tl = h('button', { type: 'submit', class: 'hn-tl hn-tl--zlate' }, ['Vytvořit NÁVRH (PDF)']);
        f.appendChild(tl);
        f.addEventListener('submit', function (e) {
          e.preventDefault();
          var o = {}; pole.forEach(function (x) { o[x[0]] = f.elements[x[0]].value.trim().slice(0, 120); });
          dokument('smlouva', tl, o);
        });
        smlouvaMisto.appendChild(f);
        f.elements.jmeno.focus();
      }
      function porovnani() {
        if (porovnaniMisto.firstChild) { porovnaniMisto.innerHTML = ''; return; }
        porovnaniMisto.appendChild(h('p', { class: 'hn-nacitam' }, ['Načítám porovnání…']));
        (window.HSPGKonkurence ? Promise.resolve() : skript(moznosti.konkurence || '/assets/hspg-konkurence.js'))
          .then(function () {
            porovnaniMisto.innerHTML = '';
            window.HSPGKonkurence.spust(porovnaniMisto, { nabidka: n, cena: C, standard: J.standard });
          })
          .catch(function () { porovnaniMisto.innerHTML = ''; porovnaniMisto.appendChild(h('p', { class: 'hn-chyba' }, ['Porovnání se teď nepodařilo načíst. Zkuste to prosím znovu.'])); });
      }
    }
    function dokument(druh, tl, objednatel) {
      var puvodni = tl.textContent;
      tl.disabled = true; tl.setAttribute('aria-busy', 'true');
      var stav = tl.querySelector('span:last-child') || tl;
      stav.textContent = T('Připravuji PDF…');
      udalost('hbot_kalkulace', { krok: druh === 'kalkulace' ? 'pdf' : 'navrh-smlouvy' });
      (window.HSPGDokumenty ? Promise.resolve() : skript(moznosti.dokumenty || '/assets/hspg-dokumenty.js'))
        .then(function () {
          var kontext = { cislo: S.cislo, datum: new Date(), firma: J.firma || null, standard: J.standard, tarify: J.tarify(), podminkaZaruky: J.podminkaZaruky(), cenik: J.cenik, obec: S.obec ? S.obec.obec : '', objednatel: objednatel || null };
          return druh === 'kalkulace' ? window.HSPGDokumenty.kalkulace(S.vysledek, kontext) : window.HSPGDokumenty.navrhSmlouvy(S.vysledek, kontext);
        })
        .then(function () { zazitek('fajfka', 'fajfka'); stav.textContent = T(druh === 'kalkulace' ? 'Kalkulace se stahuje' : 'NÁVRH se stahuje'); setTimeout(function () { stav.textContent = puvodni; }, 2600); })
        .catch(function () { zazitek('chyba'); stav.textContent = T('PDF se nepodařilo vytvořit – zkuste znovu'); setTimeout(function () { stav.textContent = puvodni; }, 3200); })
        .then(function () { tl.disabled = false; tl.removeAttribute('aria-busy'); });
    }
    function akceKontakt() {
      return h('div', { class: 'hn-akce' }, [
        h('a', { class: 'hn-akce-tl hn-akce-tl--zlate', href: moznosti.poptavka || '/akce/' }, [h('span', { class: 'hn-akce-ikona', svg: ikona(IKONY.odeslat) }), h('span', null, ['Poptávka – cena do 24 hodin'])]),
        h('a', { class: 'hn-akce-tl', href: 'tel:+420736618486' }, [h('span', { class: 'hn-akce-ikona', svg: ikona(IKONY.telefon) }), h('span', null, ['Zavolat +420 736 618 486'])])
      ]);
    }

    return {
      zavri: zavri,
      fokus: function () { nadpisKroku.focus({ preventScroll: true }); },
      stav: function () { return S; }
    };
  }

  window.HSPGNabidka = {
    verze: '1.0.0',
    spust: spust,
    /** Adaptér měření z adresy (úkol 27): mereni(adresaText) → Promise<{ plochy: { strecha?, fasada? }, obec?, okres?, lat?, lon? }> */
    nastav: function (o) { o = o || {}; if (typeof o.mereni === 'function') NASTAVENI.mereni = o.mereni; if (typeof o.naseptavac === 'function') NASTAVENI.naseptavac = o.naseptavac; }
  };
  // Web může adaptér nastavit dřív, než se kalkulace načte: window.HSPG_MERENI = { mereni: fn }.
  if (window.HSPG_MERENI) window.HSPGNabidka.nastav(window.HSPG_MERENI);
})();
