/* =====================================================================
   HSPG – Pas domu · trezor (předpona pdt-, vzhled z apex-tokens.css)
   ---------------------------------------------------------------------
   • Pas se otevře dvojicí kód pasu + přístupový kód z certifikátu:
     POST /api/sentinel/validate {sentinel_code, pristup}.
   • Odkaz z certifikátu …/pas-domu#kod=HS-…&pristup=… : kód se z adresního
     řádku odstraní dřív, než odejde jakýkoli požadavek (inline skript
     v <head> a pro jistotu ještě zde).
   • Vykresluje se jen whitelist polí z API, vše přes textContent
     a setAttribute. Neznámá pole se zahodí hned po přijetí.
   • Každé selhání ověření = jedna neutrální hláška (neprozradí, který
     údaj nesedí).
   • prefers-reduced-motion: žádné animace (přeskupování znaků, vlna,
     rozostření, plynulé posouvání).
   • Funguje bez AI. Žádné externí knihovny ani písma z cizích serverů.
   Nastavení (volitelné, např. pro ukázku): window.PdtNastaveni =
   { fetch, api, pocasi, obsah } – výchozí /api/sentinel/validate,
   /api/pocasi a /assets/hspg-cenik.json (záložně /content/).
   ===================================================================== */
(function (koren, tovarna) {
  var api = tovarna(koren);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (koren) koren.HSPGPasTrezor = api;
})(typeof self !== 'undefined' ? self : this, function (g) {
  'use strict';

  var doc = g && g.document;
  var NB = '\u00a0';
  var TELEFON = '+420' + NB + '736' + NB + '618' + NB + '486';
  var TEL_ODKAZ = 'tel:+420736618486';

  /* ---------- 1. Kód z odkazu certifikátu: převzít a hned odstranit ---------- */
  // Inline skript v <head> ho mohl odstranit už dřív a předat v __pdtFragment.
  function prectiFragment() {
    var h = '';
    if (g.__pdtFragment) {
      h = String(g.__pdtFragment);
      g.__pdtFragment = undefined;
    } else if (g.location && /(?:^#|&)(?:kod|pristup)=/.test(g.location.hash)) {
      h = g.location.hash;
      history.replaceState(null, '', location.pathname);
    }
    return zOdkazu(h);
  }

  // Z textu odkazu (celá adresa, „#kod=…&pristup=…“ i „kod=…“) vytáhne obě hodnoty.
  function zOdkazu(text) {
    var s = String(text == null ? '' : text);
    var i = s.search(/(?:^|[#?&])(?:kod|pristup)=/);
    if (i < 0) return null;
    var p = new URLSearchParams(s.slice(i).replace(/^[#?&]/, ''));
    var kod = p.get('kod') || '';
    var pristup = p.get('pristup') || '';
    return kod || pristup ? { kod: kod, pristup: pristup } : null;
  }

  /* ---------- 2. Masky polí ---------- */
  // Kód pasu HS-RRRR-ČČČČ: počítají se jen číslice, kurzor zůstane za stejným
  // počtem číslic jako před úpravou (oprava uprostřed kódu nepřeskočí na konec).
  function maskaKodu(hodnota, kurzor) {
    hodnota = String(hodnota == null ? '' : hodnota);
    if (kurzor == null || kurzor > hodnota.length) kurzor = hodnota.length;
    var cislice = hodnota.replace(/\D/g, '').slice(0, 8);
    if (!cislice) return { hodnota: '', kurzor: 0 };
    var pred = Math.min(hodnota.slice(0, kurzor).replace(/\D/g, '').length, cislice.length);
    var v = 'HS-' + cislice.slice(0, 4) + (cislice.length > 4 ? '-' + cislice.slice(4) : '');
    return { hodnota: v, kurzor: pred <= 4 ? 3 + pred : 4 + pred };
  }

  // Přístupový kód: 12 znaků Crockford Base32 ve skupinách XXXX-XXXX-XXXX.
  // Velká písmena, O → 0, I a L → 1; mezery, pomlčky a ostatní znaky pryč.
  function znakPristupu(z) {
    z = z.toUpperCase();
    if (z === 'O') return '0';
    if (z === 'I' || z === 'L') return '1';
    return /[0-9A-HJKMNP-TV-Z]/.test(z) ? z : '';
  }
  function cistyPristup(s) {
    var o = '';
    for (var i = 0; i < s.length; i++) o += znakPristupu(s.charAt(i));
    return o;
  }
  function maskaPristupu(hodnota, kurzor) {
    hodnota = String(hodnota == null ? '' : hodnota);
    if (kurzor == null || kurzor > hodnota.length) kurzor = hodnota.length;
    var znaky = cistyPristup(hodnota).slice(0, 12);
    var pred = Math.min(cistyPristup(hodnota.slice(0, kurzor)).length, znaky.length);
    return { hodnota: (znaky.match(/.{1,4}/g) || []).join('-'), kurzor: pred + Math.max(0, Math.ceil(pred / 4) - 1) };
  }

  var KOD_TVAR = /^HS-\d{4}-\d{4}$/;
  var PRISTUP_TVAR = /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

  // Kód v ozdobném displeji trezoru: chybějící číslice jako tečky.
  function displejKodu(v) {
    var c = String(v || '').replace(/\D/g, '').slice(0, 8), s = '';
    for (var i = 0; i < 8; i++) s += i < c.length ? c.charAt(i) : '·';
    return 'HS-' + s.slice(0, 4) + '-' + s.slice(4);
  }

  /* ---------- 3. Čeština: tvary, data, čísla, typografie ---------- */
  function tvar(n, jeden, dva, pet) {
    n = Math.abs(Math.round(n));
    return n === 1 ? jeden : n >= 2 && n <= 4 ? dva : pet;
  }
  function zbyvaCasti(dni) {
    dni = Math.max(0, Math.round(Number(dni) || 0));
    if (dni < 365) return { hlavni: dni + NB + tvar(dni, 'den', 'dny', 'dní'), vedlejsi: '' };
    var roky = Math.floor(dni / 365);
    var mesice = Math.floor((dni - roky * 365) / 30.4375);
    return {
      hlavni: roky + NB + tvar(roky, 'rok', 'roky', 'let'),
      vedlejsi: mesice > 0 ? 'a' + NB + mesice + NB + tvar(mesice, 'měsíc', 'měsíce', 'měsíců') : ''
    };
  }
  // 365 → „1 rok“, 730 → „2 roky“, 1 → „1 den“, 2 → „2 dny“, 5 → „5 dní“ (úkol 17).
  function zbyva(dni) {
    var c = zbyvaCasti(dni);
    return c.vedlejsi ? c.hlavni + ' ' + c.vedlejsi : c.hlavni;
  }
  function typografie(text) {
    return String(text == null ? '' : text)
      .replace(/(^|[\s(„])([vkszaiouVKSZAIOU])\s+/g, '$1$2' + NB)
      .replace(/(\d)\s+(\d{3})(?!\d)/g, '$1' + NB + '$2')
      .replace(/(\d)\s+(Kč|m²|m|km|%|dnů|dny|dní|let|roky|h|ks|l|°C|mm)(?![0-9A-Za-z\u00C0-\u017F])/g, '$1' + NB + '$2');
  }
  function cislo(n, des) {
    return Number(n).toLocaleString('cs-CZ', { maximumFractionDigits: des || 0 }).replace(/\s/g, NB);
  }
  function kc(n) { return cislo(n) + NB + 'Kč'; }
  function dvoj(n) { return (n < 10 ? '0' : '') + n; }
  // Konečné číslo, jinak null (null, '' i chybějící hodnota = údaj chybí, ne nula).
  function num(x) {
    if (x == null || x === '' || typeof x === 'boolean') return null;
    var n = Number(x);
    return isFinite(n) ? n : null;
  }
  function isoDatum(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s == null ? '' : s));
    return m ? { r: +m[1], m: +m[2], d: +m[3] } : null;
  }
  function datum(s) {
    var d = isoDatum(s);
    if (d) return d.d + '.' + NB + d.m + '.' + NB + d.r;
    var m = /^(\d{4})-(\d{2})$/.exec(String(s == null ? '' : s));
    if (m) return +m[2] + '/' + m[1];
    return s == null ? '' : String(s);
  }
  function dnes() {
    var t = new Date();
    return t.getFullYear() + '-' + dvoj(t.getMonth() + 1) + '-' + dvoj(t.getDate());
  }
  function dniMezi(a, b) {
    var x = isoDatum(a), y = isoDatum(b);
    if (!x || !y) return null;
    return Math.round((Date.UTC(y.r, y.m - 1, y.d) - Date.UTC(x.r, x.m - 1, x.d)) / 864e5);
  }
  var DNY_TYDNE = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
  function denTydne(s) {
    var d = isoDatum(s);
    return d ? DNY_TYDNE[new Date(Date.UTC(d.r, d.m - 1, d.d)).getUTCDay()] : '';
  }

  /* ---------- 4. Data pasu: jen whitelist ---------- */
  // Pole z kontraktu /api/sentinel/validate (úkol 14). Volitelná pole se
  // vykreslí, jen když je API pošle (tarif, termíny kontrol, fotky se souhlasem).
  var POLE = ['kod', 'obec', 'povrchy', 'plocha_m2', 'datum', 'materialy', 'sarze', 'zaruka', 'dalsi_kontrola', 'srazky'];
  var VOLITELNA = ['tarif', 'kontroly', 'fotky'];

  function vycisti(data) {
    var zdroj = data && typeof data === 'object' ? (data.pas && typeof data.pas === 'object' ? data.pas : data) : {};
    var pas = {};
    POLE.concat(VOLITELNA).forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(zdroj, k) && zdroj[k] != null) pas[k] = zdroj[k];
    });
    if (pas.zaruka && typeof pas.zaruka === 'object') {
      pas.zaruka = { platna: pas.zaruka.platna, do: pas.zaruka['do'], zbyva_dni: pas.zaruka.zbyva_dni, uplynulo_procent: pas.zaruka.uplynulo_procent };
    } else delete pas.zaruka;
    if (pas.srazky && typeof pas.srazky === 'object') {
      pas.srazky = { mm: pas.srazky.mm, do: pas.srazky['do'], zdroj: typeof pas.srazky.zdroj === 'string' ? pas.srazky.zdroj : undefined };
    } else delete pas.srazky;
    return pas;
  }

  var NAZVY_POVRCHU = { strecha: 'Střecha', fasada: 'Fasáda', dlazba: 'Dlažba', fve: 'Fotovoltaika', fotovoltaika: 'Fotovoltaika' };
  function bezDiakritiky(s) { return s.normalize ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '') : s; }
  function nazevPovrchu(p) {
    if (p == null) return '';
    if (typeof p === 'object') return nazevPovrchu(p.povrch || p.nazev || '');
    var s = String(p).trim();
    var k = bezDiakritiky(s.toLowerCase()).split('.').pop();
    return NAZVY_POVRCHU[k] || (s.charAt(0).toUpperCase() + s.slice(1));
  }
  function seznamPovrchu(povrchy) {
    if (povrchy == null || povrchy === '') return [];
    if (!Array.isArray(povrchy)) povrchy = String(povrchy).split(/\s*[,;]\s*/);
    return povrchy.map(function (p) {
      return { nazev: nazevPovrchu(p), plocha: p && typeof p === 'object' && isFinite(p.plocha_m2) ? Number(p.plocha_m2) : null };
    }).filter(function (x) { return x.nazev; });
  }
  function seznam(x) {
    if (x == null || x === '') return [];
    return (Array.isArray(x) ? x : [x]).map(function (s) { return typeof s === 'object' && s ? String(s.nazev || '') : String(s); })
      .map(function (s) { return s.trim(); }).filter(Boolean);
  }

  /* ---------- 5. DOM jen přes textContent a setAttribute ---------- */
  var SVG_NS = 'http://www.w3.org/2000/svg';
  function pridej(e, deti) {
    (deti || []).forEach(function (d) {
      if (d == null || d === false || d === '') return;
      e.appendChild(typeof d === 'string' || typeof d === 'number' ? doc.createTextNode(String(d)) : d);
    });
    return e;
  }
  function el(tag, vl, deti) {
    var e = doc.createElement(tag);
    if (vl) Object.keys(vl).forEach(function (k) {
      var v = vl[k];
      if (v == null || v === false) return;
      if (k === 'text') e.textContent = v;
      else if (k === 'trida') e.className = v;
      else e.setAttribute(k, v === true ? '' : String(v));
    });
    return pridej(e, deti);
  }
  function svgEl(tag, vl, deti) {
    var e = doc.createElementNS(SVG_NS, tag);
    if (vl) Object.keys(vl).forEach(function (k) { if (vl[k] != null) e.setAttribute(k, String(vl[k])); });
    return pridej(e, deti);
  }
  function telLink(trida) { return el('a', { href: TEL_ODKAZ, trida: trida || null, text: TELEFON }); }
  // Text s telefonním číslem → text + odkaz tel: (číslo se nezalomí).
  function sTelefonem(text) {
    var t = typografie(text);
    var m = /\+420[\s\u00a0]*736[\s\u00a0]*618[\s\u00a0]*486/.exec(t);
    if (!m) return [t];
    return [t.slice(0, m.index), telLink(), t.slice(m.index + m[0].length)];
  }
  function modul(trida, stitek, nadpis, deti) {
    return el('section', { trida: 'pdt-modul apex-sklo ' + trida }, [
      el('p', { trida: 'pdt-modul-stitek', 'aria-hidden': 'true', 'data-stitek': stitek, text: stitek }),
      el('h3', { trida: 'pdt-modul-h', text: nadpis })
    ].concat(deti));
  }
  // Pořadová čísla štítků (01 — Záruka …) a pořadí pro postupné odhalení.
  function precislovat(mrizka) {
    Array.prototype.forEach.call(mrizka.children, function (m, i) {
      m.style.setProperty('--pdt-i', String(i));
      var s = m.querySelector('.pdt-modul-stitek');
      if (s) s.textContent = dvoj(i + 1) + ' — ' + s.getAttribute('data-stitek');
    });
  }

  /* ---------- 6. Moduly pasu ---------- */
  function regionPuvodni(pas, sentinel) {
    var d = isoDatum(pas.datum);
    return !!(d && sentinel && sentinel.ucinnost && String(pas.datum).slice(0, 10) < sentinel.ucinnost);
  }

  function modulZaruka(pas, obsah, dnesni) {
    var z = pas.zaruka;
    if (!z) return null;
    var firma = (obsah.firma && obsah.firma.zaruka) || {};
    var konec = isoDatum(z['do']) ? dniMezi(dnesni, z['do']) : null;
    var platna = z.platna !== false && !(konec != null && konec < 0);
    var proc = num(z.uplynulo_procent);
    if (proc != null) proc = Math.min(100, Math.max(0, proc));
    var zbyvaDni = num(z.zbyva_dni);
    var zbyvajici = platna ? (proc != null ? 100 - proc : 100) : 0;

    var prsten = el('div', { trida: 'pdt-prsten' + (platna ? '' : ' pdt-prsten--vyhasly') });
    var r = 78;
    var oblouk = svgEl('circle', { 'class': 'pdt-prsten-oblouk', cx: 90, cy: 90, r: r, fill: 'none', stroke: 'url(#pdt-prsten-zlato)', 'stroke-width': 7, 'stroke-linecap': 'round', pathLength: 100, 'stroke-dasharray': zbyvajici.toFixed(2) + ' 100', transform: 'rotate(-90 90 90)' });
    oblouk.style.setProperty('--pdt-oblouk', zbyvajici.toFixed(2));
    prsten.appendChild(svgEl('svg', { viewBox: '0 0 180 180', 'aria-hidden': 'true', focusable: 'false', trida: 'pdt-prsten-svg' }, [
      svgEl('defs', null, [svgEl('linearGradient', { id: 'pdt-prsten-zlato', x1: '0', y1: '0', x2: '1', y2: '1' }, [
        svgEl('stop', { offset: '0', 'stop-color': '#f6e7a8' }),
        svgEl('stop', { offset: '.5', 'stop-color': '#d4af37' }),
        svgEl('stop', { offset: '1', 'stop-color': '#8a6a12' })
      ])]),
      svgEl('circle', { cx: 90, cy: 90, r: r + 9, fill: 'none', stroke: 'rgba(212,175,55,.18)', 'stroke-width': 1, pathLength: 120, 'stroke-dasharray': '0.4 0.6', transform: 'rotate(-90 90 90)' }),
      svgEl('circle', { cx: 90, cy: 90, r: r, fill: 'none', stroke: 'rgba(212,175,55,.14)', 'stroke-width': 7 }),
      oblouk
    ]));
    var casti = zbyvaDni != null ? zbyvaCasti(zbyvaDni) : null;
    prsten.appendChild(el('div', { trida: 'pdt-prsten-text' }, platna && casti ? [
      el('span', { trida: 'pdt-prsten-maly', text: 'zbývá' }),
      el('span', { trida: 'pdt-prsten-velky', text: casti.hlavni }),
      casti.vedlejsi ? el('span', { trida: 'pdt-prsten-maly', text: casti.vedlejsi }) : null
    ] : [
      el('span', { trida: 'pdt-prsten-maly', text: 'záruka' }),
      el('span', { trida: 'pdt-prsten-velky', text: platna ? 'platí' : (konec != null && konec < 0 ? 'skončila' : 'neplatí') })
    ]));

    var info = [];
    if (platna) {
      info.push(el('p', { trida: 'pdt-zaruka-stav' }, [
        el('span', { trida: 'pdt-cip pdt-cip--ok', text: 'Platná' }),
        z['do'] ? ' do ' + datum(z['do']) : ''
      ]));
    } else {
      info.push(el('p', { trida: 'pdt-zaruka-stav' }, [
        el('span', { trida: 'pdt-cip pdt-cip--pozor', text: konec != null && konec < 0 ? 'Skončila' : 'Neplatí' }),
        konec != null && konec < 0 ? ' ' + datum(z['do']) : ''
      ]));
      info.push(el('p', { trida: 'pdt-mini' }, sTelefonem('Chcete ochranu obnovit? Zavolejte +420 736 618 486.')));
    }
    if (proc != null && platna) info.push(el('p', { trida: 'pdt-mini', text: typografie('Uplynulo ' + cislo(proc) + ' % doby záruky.') }));
    var podminka = regionPuvodni(pas, obsah.sentinel) ? firma.podminka_puvodni : firma.podminka;
    if (firma.veta && firma.potvrzeno !== false) {
      info.push(el('p', { trida: 'pdt-zaruka-veta' }, [
        el('strong', { text: typografie(firma.veta) }),
        podminka ? ' ' + typografie(podminka) : ''
      ]));
      if (firma.odkaz) info.push(el('p', { trida: 'pdt-mini' }, [el('a', { href: firma.odkaz, text: firma.odkaz_text || 'Podmínky záruky' })]));
    }
    return modul('pdt-modul--zaruka', 'Záruka', 'Stav záruky', [el('div', { trida: 'pdt-zaruka-telo' }, [prsten, el('div', { trida: 'pdt-zaruka-info' }, info)])]);
  }

  function posledniUdalost(pas, dnesni) {
    var kandidati = [pas.datum].concat(Array.isArray(pas.kontroly) ? pas.kontroly : []).filter(function (d) {
      var x = dniMezi(d, dnesni);
      return x != null && x >= 0;
    }).map(function (d) { return String(d).slice(0, 10); }).sort();
    return kandidati.length ? kandidati[kandidati.length - 1] : null;
  }

  function modulKontrola(pas, dnesni) {
    var cil = pas.dalsi_kontrola;
    if (!cil) return null;
    var d = dniMezi(dnesni, cil);
    var deti = [];
    if (d == null) {
      deti.push(el('p', { trida: 'pdt-odpocet' }, [el('span', { trida: 'pdt-odpocet-cislo pdt-odpocet-cislo--text', text: datum(cil) })]));
    } else if (d > 0) {
      deti.push(el('p', { trida: 'pdt-odpocet' }, [
        el('span', { trida: 'pdt-odpocet-cislo', text: cislo(d) }),
        el('span', { trida: 'pdt-odpocet-jednotka', text: tvar(d, 'den', 'dny', 'dní') })
      ]));
      deti.push(el('p', { trida: 'pdt-mini', text: typografie('do další technické kontroly · termín ' + datum(cil)) }));
    } else if (d === 0) {
      deti.push(el('p', { trida: 'pdt-odpocet' }, [el('span', { trida: 'pdt-odpocet-cislo pdt-odpocet-cislo--text', text: 'Dnes' })]));
      deti.push(el('p', { trida: 'pdt-mini', text: 'je termín technické kontroly' }));
    } else {
      deti.push(el('p', { trida: 'pdt-odpocet' }, [el('span', { trida: 'pdt-odpocet-cislo pdt-odpocet-cislo--text', text: 'Po termínu' })]));
      deti.push(el('p', { trida: 'pdt-mini' }, sTelefonem('Kontrola měla proběhnout ' + datum(cil) + '. Domluvte termín: +420 736 618 486.')));
    }
    var od = posledniUdalost(pas, dnesni);
    var celkem = od ? dniMezi(od, cil) : null;
    if (d != null && d >= 0 && celkem && celkem > 0) {
      var podil = Math.min(1, Math.max(0, 1 - d / celkem));
      var lista = el('div', { trida: 'pdt-lista', 'aria-hidden': 'true' }, [el('span', { trida: 'pdt-lista-vypln' })]);
      lista.firstChild.style.setProperty('--pdt-podil', podil.toFixed(3));
      deti.push(lista);
      deti.push(el('p', { trida: 'pdt-mini pdt-lista-popis' }, [
        el('span', { text: 'od ' + datum(od) }), el('span', { text: datum(cil) })
      ]));
    }
    return modul('pdt-modul--kontrola', 'Kontrola', 'Další technická kontrola', deti);
  }

  function modulSentinel(pas, obsah) {
    var s = obsah.sentinel || {};
    var tarify = Array.isArray(s.tarify) ? s.tarify : [];
    if (!tarify.length) return null;
    var puvodni = regionPuvodni(pas, s);
    var vas = pas.tarif ? tarify.filter(function (t) { return t.id === String(pas.tarif).toLowerCase(); })[0] : null;
    var deti = [];
    if (vas) deti.push(el('p', { trida: 'pdt-vas-tarif' }, ['Váš tarif ', el('strong', { text: vas.nazev })]));
    else deti.push(el('p', { trida: 'pdt-mini', text: typografie('Pravidelná péče o ochranu domu. Tarify a ceny:') }));
    var seznamT = el('ul', { trida: 'pdt-tarify' });
    tarify.forEach(function (t) {
      var oznacit = !puvodni && t.povinny_pro_zaruku;
      var souhrn = el('summary', { trida: 'pdt-tarif-souhrn' }, [
        el('span', { trida: 'pdt-tarif-nazev', text: t.nazev }),
        el('span', { trida: 'pdt-tarif-cena', text: t.cena_rok ? kc(t.cena_rok) + '/rok' : 'zdarma' })
      ]);
      var telo = el('div', { trida: 'pdt-tarif-telo' }, [
        t.popis ? el('p', { trida: 'pdt-mini', text: typografie(t.popis) }) : null,
        oznacit ? el('p', { trida: 'pdt-cip pdt-cip--zlato', text: 'Podmínka trvání záruky' }) : null,
        Array.isArray(t.body) && t.body.length ? el('ul', { trida: 'pdt-body' }, t.body.map(function (b) { return el('li', { text: typografie(b) }); })) : null
      ]);
      seznamT.appendChild(el('li', { trida: 'pdt-tarif' + (vas && vas.id === t.id ? ' pdt-tarif--vas' : '') + (oznacit ? ' pdt-tarif--zaklad' : '') }, [
        el('details', null, [souhrn, telo])
      ]));
    });
    deti.push(seznamT);
    deti.push(el('p', { trida: 'pdt-mini' }, sTelefonem('Sjednat nebo změnit tarif: +420 736 618 486')));
    return modul('pdt-modul--sentinel', 'Péče', 'Péče SENTINEL', deti);
  }

  function modulHistorie(pas, dnesni) {
    var udalosti = [];
    var materialy = seznam(pas.materialy);
    var povrchy = seznamPovrchu(pas.povrchy);
    if (pas.datum) {
      var popis = povrchy.map(function (p) { return p.nazev + (p.plocha != null ? ' ' + cislo(p.plocha) + NB + 'm²' : ''); }).join(', ');
      if (num(pas.plocha_m2) != null && !povrchy.some(function (p) { return p.plocha != null; })) {
        popis += (popis ? ' · ' : '') + cislo(num(pas.plocha_m2)) + NB + 'm²';
      }
      udalosti.push({ datum: pas.datum, nazev: 'Ošetření' + (materialy.length ? ' – ' + materialy.join(', ') : ''), popis: popis, druh: 'hotovo' });
    }
    (Array.isArray(pas.kontroly) ? pas.kontroly : []).forEach(function (k) {
      var d = typeof k === 'object' && k ? k.datum : k;
      if (!isoDatum(d)) return;
      var x = dniMezi(d, dnesni);
      udalosti.push({ datum: d, nazev: 'Technická kontrola', popis: '', druh: x != null && x >= 0 ? 'hotovo' : 'plan' });
    });
    if (isoDatum(pas.dalsi_kontrola)) {
      var y = dniMezi(dnesni, pas.dalsi_kontrola);
      udalosti.push({ datum: pas.dalsi_kontrola, nazev: 'Další technická kontrola', popis: y != null && y < 0 ? 'po termínu' : 'plánováno', druh: y != null && y < 0 ? 'pozor' : 'plan' });
    }
    if (pas.zaruka && isoDatum(pas.zaruka['do'])) {
      udalosti.push({ datum: pas.zaruka['do'], nazev: 'Konec záruky', popis: '', druh: dniMezi(dnesni, pas.zaruka['do']) < 0 ? 'hotovo' : 'plan' });
    }
    if (!udalosti.length) return null;
    udalosti.sort(function (a, b) { return String(a.datum).slice(0, 10) < String(b.datum).slice(0, 10) ? -1 : 1; });
    var ol = el('ol', { trida: 'pdt-osa' }, udalosti.map(function (u) {
      return el('li', { trida: 'pdt-osa-bod pdt-osa-bod--' + u.druh }, [
        el('time', { datetime: String(u.datum).slice(0, 10), trida: 'pdt-osa-datum', text: datum(u.datum) }),
        el('span', { trida: 'pdt-osa-nazev', text: typografie(u.nazev) }),
        u.popis ? el('span', { trida: 'pdt-osa-popis', text: typografie(u.popis) }) : null
      ]);
    }));
    return modul('pdt-modul--historie', 'Historie', 'Historie ošetření', [ol]);
  }

  function modulMaterialy(pas) {
    var materialy = seznam(pas.materialy);
    var sarze = seznam(pas.sarze);
    var povrchy = seznamPovrchu(pas.povrchy);
    var plocha = num(pas.plocha_m2);
    if (!materialy.length && !sarze.length && !povrchy.length && plocha == null) return null;
    var deti = [];
    if (materialy.length) deti.push(el('ul', { trida: 'pdt-materialy', 'aria-label': 'Materiály' }, materialy.map(function (m) { return el('li', { trida: 'pdt-material', text: m }); })));
    var dl = el('dl', { trida: 'pdt-udaje' });
    function radek(nazev, hodnota, trida) {
      if (!hodnota) return;
      dl.appendChild(el('div', { trida: 'pdt-udaj' }, [el('dt', { text: nazev }), el('dd', { trida: trida || null, text: hodnota })]));
    }
    radek('Šarže', sarze.join(', '), 'pdt-sarze');
    radek('Ošetřené povrchy', povrchy.map(function (p) { return p.nazev + (p.plocha != null ? ' ' + cislo(p.plocha) + NB + 'm²' : ''); }).join(', '));
    radek('Plocha celkem', plocha != null ? cislo(plocha) + NB + 'm²' : '');
    if (dl.firstChild) deti.push(dl);
    return modul('pdt-modul--materialy', 'Materiály', 'Materiály a šarže', deti);
  }

  // Předpověď: vydatné srážky ≥ 10 mm za den (klimatologický práh ČHMÚ pro „dny se srážkami ≥ 10 mm“),
  // silný vítr ≥ 11 m/s (Beaufortův stupeň 6 začíná na 10,8 m/s; API vrací zaokrouhlené maximum dne).
  var VYDATNE_MM = 10;
  var SILNY_VITR = 11;

  function modulPocasi(pas) {
    var s = pas.srazky;
    var maSrazky = !!(s && num(s.mm) != null && num(s.mm) >= 0);
    if (!maSrazky && !pas.obec) return null;
    var deti = [];
    if (maSrazky) {
      deti.push(el('div', { trida: 'pdt-srazky' }, [
        el('p', { trida: 'pdt-mini', text: 'Od ošetření napršelo' }),
        el('p', { trida: 'pdt-srazky-cislo' }, [el('span', { trida: 'pdt-velke', text: cislo(num(s.mm)) }), NB + 'mm']),
        el('p', { trida: 'pdt-mini', text: typografie('Úhrn srážek v obci od data ošetření' + (s['do'] ? ', údaj do ' + datum(s['do']) : '') + '.') }),
        s.zdroj ? el('p', { trida: 'pdt-zdroj', text: typografie('Zdroj: ' + s.zdroj) }) : null
      ]));
    }
    var predpoved = el('div', { trida: 'pdt-predpoved', 'aria-busy': 'true' }, [
      pas.obec ? el('p', { trida: 'pdt-mini pdt-nacitam', text: 'Načítám předpověď počasí…' }) : null
    ]);
    deti.push(predpoved);
    var m = modul('pdt-modul--pocasi', 'Počasí', pas.obec ? 'Počasí a péče' : 'Srážky od ošetření', deti);
    m.__predpoved = predpoved;
    m.__maSrazky = maSrazky;
    return m;
  }

  function vyplnPredpoved(m, data, sentinel) {
    var box = m.__predpoved;
    while (box.firstChild) box.removeChild(box.firstChild);
    box.removeAttribute('aria-busy');
    var dny = data && Array.isArray(data.dny) ? data.dny.filter(function (d) { return d && isoDatum(d.datum); }).slice(0, 7) : [];
    if (!dny.length) {
      var mrizka = m.parentNode;
      if (!m.__maSrazky && mrizka) { mrizka.removeChild(m); precislovat(mrizka); }
      return;
    }
    var maxMm = Math.max(VYDATNE_MM, Math.max.apply(null, dny.map(function (d) { return Number(d.srazky) || 0; })));
    var soucet = dny.reduce(function (a, d) { return a + (Number(d.srazky) || 0); }, 0);
    var vitrMax = Math.max.apply(null, dny.map(function (d) { return Number(d.vitr) || 0; }));
    var silne = dny.filter(function (d) { return (Number(d.srazky) || 0) >= VYDATNE_MM || (Number(d.vitr) || 0) >= SILNY_VITR; });

    box.appendChild(el('h4', { trida: 'pdt-predpoved-h', text: typografie('Předpověď na 7 dní – ' + (data.obec || '') + (data.okres && data.okres !== data.obec ? ' (okres ' + data.okres + ')' : '')) }));
    box.appendChild(el('p', { trida: 'pdt-legenda', text: 'Srážky v mm za den', 'aria-hidden': 'true' }));
    box.appendChild(el('ol', { trida: 'pdt-dny' }, dny.map(function (d) {
      var mm = Number(d.srazky) || 0;
      var sloupec = el('span', { trida: 'pdt-den-sloupec', 'aria-hidden': 'true' }, [el('span', { trida: 'pdt-den-vypln' })]);
      sloupec.firstChild.style.setProperty('--pdt-vyska', (mm / maxMm).toFixed(3));
      var vydatne = mm >= VYDATNE_MM || (Number(d.vitr) || 0) >= SILNY_VITR;
      return el('li', { trida: 'pdt-den' + (vydatne ? ' pdt-den--vydatny' : '') }, [
        el('span', { trida: 'pdt-den-nazev', 'aria-hidden': 'true', text: denTydne(d.datum) }),
        sloupec,
        el('span', { trida: 'pdt-den-mm', 'aria-hidden': 'true', text: cislo(mm, 1) }),
        el('span', { trida: 'pdt-sr', text: typografie(datum(d.datum) + ': srážky ' + cislo(mm, 1) + ' mm, vítr až ' + cislo(Number(d.vitr) || 0) + ' m/s.') })
      ]);
    })));

    var zprava;
    if (silne.length) {
      var prvni = silne[0];
      var co = [];
      if ((Number(prvni.srazky) || 0) >= VYDATNE_MM) co.push('srážky ' + cislo(Number(prvni.srazky), 1) + ' mm');
      if ((Number(prvni.vitr) || 0) >= SILNY_VITR) co.push('vítr až ' + cislo(Number(prvni.vitr)) + ' m/s');
      var rychly = (Array.isArray(sentinel && sentinel.tarify) ? sentinel.tarify : []).filter(function (t) {
        return (t.body || []).some(function (b) { return /48\s*hodin/.test(b); });
      })[0];
      zprava = el('p', { trida: 'pdt-upozorneni', role: 'note' }, [el('strong', { text: typografie(denTydne(prvni.datum) + ' ' + datum(prvni.datum) + ' předpověď hlásí ' + co.join(' a ') + '.') }), ' ']
        .concat(sTelefonem('Po vydatném dešti nebo silném větru doporučujeme kontrolu stavu ochrany – zavolejte +420 736 618 486.'))
        .concat(rychly ? [' ' + typografie('V tarifu ' + rychly.nazev + ' zasahujeme do 48 hodin.')] : []));
    } else {
      zprava = el('p', { trida: 'pdt-mini', text: typografie('Srážky celkem ' + cislo(soucet, 1) + ' mm, vítr nejvýš ' + cislo(vitrMax) + ' m/s. Vydatný déšť (10 mm a víc za den) ani silný vítr předpověď neukazuje.') });
    }
    box.appendChild(zprava);

    var zdrojOdkaz = /^https:\/\//.test(String(data.zdrojOdkaz || '')) ? data.zdrojOdkaz : 'https://api.met.no/';
    box.appendChild(el('p', { trida: 'pdt-zdroj' }, [
      'Předpověď: ', el('a', { href: zdrojOdkaz, rel: 'noopener', text: data.zdroj || 'MET Norway' }),
      ' (licence ', el('a', { href: 'https://creativecommons.org/licenses/by/4.0/', rel: 'noopener license', text: 'CC BY 4.0' }), '), upraveno: denní souhrn.'
    ]));
  }

  function bezpecnaAdresa(u) {
    var s = String(u == null ? '' : u).trim();
    if (/^\/(?!\/)/.test(s)) return s;
    if (/^https:\/\/(?:www\.)?hspg\.cz\//.test(s)) return s;
    return null;
  }

  function modulFotky(pas) {
    var fotky = (Array.isArray(pas.fotky) ? pas.fotky : []).map(function (f) {
      if (typeof f === 'string') f = { src: f };
      if (!f || typeof f !== 'object') return null;
      var src = bezpecnaAdresa(f.src || f.url);
      return src ? { src: src, alt: String(f.alt || f.popis || ''), typ: f.typ, datum: f.datum } : null;
    }).filter(Boolean).slice(0, 12);
    if (!fotky.length) return null;
    var TYP = { pred: 'Před', po: 'Po' };
    var mrizka = el('div', { trida: 'pdt-fotky' }, fotky.map(function (f) {
      var popisek = [TYP[f.typ] || '', isoDatum(f.datum) ? datum(f.datum) : ''].filter(Boolean).join(' · ');
      return el('figure', { trida: 'pdt-foto' }, [
        el('img', { src: f.src, alt: f.alt || popisek || 'Fotografie z ošetření', loading: 'lazy', decoding: 'async', referrerpolicy: 'no-referrer' }),
        popisek ? el('figcaption', { text: popisek }) : null
      ]);
    }));
    return modul('pdt-modul--fotky', 'Fotky', 'Fotodokumentace', [mrizka]);
  }

  function ulozPredvyplneni(data) {
    try { g.sessionStorage.setItem('hspg-predvyplnit', JSON.stringify(data)); } catch (e) { /* bez úložiště jen bez předvyplnění */ }
  }

  function vykresliPas(pas, obsah, moznosti) {
    var dnesni = moznosti.dnes || dnes();
    var kod = pas.kod || moznosti.kod || '';
    var frag = doc.createDocumentFragment();
    var meta = [];
    if (pas.obec) meta.push(el('span', { text: pas.obec }));
    if (isoDatum(pas.datum)) meta.push(el('span', { text: 'ošetřeno ' + datum(pas.datum) }));
    if (num(pas.plocha_m2) != null) meta.push(el('span', { text: cislo(num(pas.plocha_m2)) + NB + 'm²' }));

    frag.appendChild(el('header', { trida: 'pdt-pas-hlava' }, [
      el('p', { trida: 'apex-stitek', text: 'Digitální pas domu' }),
      el('h2', { id: 'pdt-pas-h', trida: 'pdt-pas-h', tabindex: '-1' }, ['Pas domu ', el('span', { trida: 'pdt-pas-kod apex-zlaty-text', text: kod })]),
      meta.length ? el('p', { trida: 'pdt-pas-meta' }, meta.reduce(function (a, m, i) {
        if (i) a.push(el('span', { trida: 'pdt-tecka', text: ' · ' }));
        a.push(m);
        return a;
      }, [])) : null
    ]));

    var moduly = [
      modulZaruka(pas, obsah, dnesni),
      modulKontrola(pas, dnesni),
      modulSentinel(pas, obsah),
      modulHistorie(pas, dnesni),
      modulMaterialy(pas),
      modulPocasi(pas),
      modulFotky(pas)
    ].filter(Boolean);
    var mrizka = el('div', { trida: 'pdt-mrizka' }, moduly);
    precislovat(mrizka);
    frag.appendChild(mrizka);

    var objednat = el('a', { href: '/akce/', trida: 'apex-tlacitko apex-tlacitko--duch', text: 'Objednat službu' });
    objednat.addEventListener('click', function () { if (pas.obec) ulozPredvyplneni({ adresa: String(pas.obec).slice(0, 140) }); });
    var hodnotit = el('a', { href: '/recenze/', trida: 'apex-tlacitko apex-tlacitko--duch', text: 'Ohodnotit naši práci' });
    hodnotit.addEventListener('click', function () { if (KOD_TVAR.test(kod)) ulozPredvyplneni({ kod: kod }); });
    var tisk = el('button', { type: 'button', trida: 'apex-tlacitko apex-tlacitko--duch', text: 'Vytisknout pas' });
    tisk.addEventListener('click', function () { g.print(); });
    var zavrit = el('button', { type: 'button', trida: 'apex-tlacitko', 'data-pdt-zavrit': true, text: 'Zavřít pas' });
    frag.appendChild(el('div', { trida: 'pdt-akce' }, [objednat, hodnotit, tisk, zavrit]));
    frag.appendChild(el('p', { trida: 'pdt-soukromi', text: typografie('Pas nezobrazuje adresu ani kontakty. Na sdíleném zařízení ho po prohlédnutí zavřete.') }));
    return { fragment: frag, pocasi: moduly.filter(function (m) { return m.__predpoved; })[0] || null };
  }

  /* ---------- 7. Efekty (jen bez prefers-reduced-motion) ---------- */
  function klid() { return !!(g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  var ZNAKY = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  function nahodnyZnak() { return ZNAKY.charAt(Math.floor(Math.random() * ZNAKY.length)); }
  function ted() { return g.performance && g.performance.now ? g.performance.now() : Date.now(); }

  // Maticové přeskupování znaků na displeji trezoru, dokud nepřijde odpověď.
  function michani(prvek, vzor) {
    var bezi = true, posledni = 0, start = ted();
    function snimek(t) {
      if (!bezi) return;
      if (t - posledni > 55) {
        posledni = t;
        var s = '';
        for (var i = 0; i < vzor.length; i++) s += vzor.charAt(i) === '-' ? '-' : nahodnyZnak();
        prvek.textContent = s;
      }
      g.requestAnimationFrame(snimek);
    }
    g.requestAnimationFrame(snimek);
    return {
      dokonci: function (cil) {
        return new Promise(function (hotovo) {
          setTimeout(function () {
            bezi = false;
            var i = 0;
            var krok = setInterval(function () {
              i++;
              var s = cil.slice(0, i);
              for (var j = i; j < cil.length; j++) s += cil.charAt(j) === '-' ? '-' : nahodnyZnak();
              prvek.textContent = s;
              if (i >= cil.length) { clearInterval(krok); hotovo(); }
            }, 34);
          }, Math.max(0, 650 - (ted() - start)));
        });
      }
    };
  }

  // Radiální rázová vlna ze středu ciferníku (plátno přes celé okno, bez zachytávání kliknutí).
  function vlna(x, y) {
    return new Promise(function (hotovo) {
      var c = doc.createElement('canvas');
      c.className = 'pdt-vlna';
      c.setAttribute('aria-hidden', 'true');
      var w = g.innerWidth, h = g.innerHeight, dpr = Math.min(2, g.devicePixelRatio || 1);
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      doc.body.appendChild(c);
      var ctx = c.getContext && c.getContext('2d');
      var konec = false;
      function ukonci() { if (konec) return; konec = true; if (c.parentNode) c.parentNode.removeChild(c); hotovo(); }
      if (!ctx) return ukonci();
      ctx.scale(dpr, dpr);
      var maxR = Math.sqrt(Math.pow(Math.max(x, w - x), 2) + Math.pow(Math.max(y, h - y), 2)) + 40;
      var T = 1150, t0 = null;
      function snimek(ts) {
        if (konec) return;
        if (t0 === null) t0 = ts;
        var t = Math.min(1, (ts - t0) / T);
        ctx.clearRect(0, 0, w, h);
        if (t < 0.35) {
          var a = 0.3 * (1 - t / 0.35);
          var zar = ctx.createRadialGradient(x, y, 0, x, y, 240);
          zar.addColorStop(0, 'rgba(246,231,168,' + a.toFixed(3) + ')');
          zar.addColorStop(1, 'rgba(212,175,55,0)');
          ctx.fillStyle = zar;
          ctx.fillRect(0, 0, w, h);
        }
        for (var k = 0; k < 3; k++) {
          var tk = (t - k * 0.12) / (1 - k * 0.12);
          if (tk <= 0 || tk >= 1) continue;
          var r = (1 - Math.pow(1 - tk, 3)) * maxR, alfa = Math.pow(1 - tk, 1.6);
          ctx.beginPath();
          ctx.arc(x, y, Math.max(1, r), 0, Math.PI * 2);
          ctx.lineWidth = (k === 0 ? 10 : 4) * (1 - tk) + 1;
          ctx.strokeStyle = 'rgba(212,175,55,' + (alfa * (k === 0 ? 0.9 : 0.5)).toFixed(3) + ')';
          ctx.shadowColor = 'rgba(246,231,168,' + alfa.toFixed(3) + ')';
          ctx.shadowBlur = 30 * (1 - tk);
          ctx.stroke();
        }
        if (t < 1) g.requestAnimationFrame(snimek); else ukonci();
      }
      g.requestAnimationFrame(snimek);
      setTimeout(ukonci, T + 500); // záloha pro skrytou kartu (requestAnimationFrame tam stojí)
    });
  }

  /* ---------- 8. Síť ---------- */
  var TEXT = {
    nenalezeno: 'Pas jsme nenašli. Zkontrolujte kód pasu a přístupový kód z certifikátu, nebo zavolejte +420 736 618 486.',
    limit: 'Příliš mnoho pokusů. Zkuste to za 15 minut, nebo zavolejte +420 736 618 486.',
    sit: 'Pas se teď nepodařilo načíst. Zkuste to prosím za chvíli, nebo zavolejte +420 736 618 486.',
    tvarKodu: 'Zadejte kód pasu ve tvaru HS-RRRR-ČČČČ – najdete ho na certifikátu.',
    tvarPristupu: 'Zadejte přístupový kód z certifikátu – 12 znaků ve tvaru XXXX-XXXX-XXXX.'
  };

  function nastaveni() {
    var n = g.PdtNastaveni || {};
    return {
      fetch: typeof n.fetch === 'function' ? n.fetch : g.fetch && g.fetch.bind(g),
      api: n.api || '/api/sentinel/validate',
      pocasi: n.pocasi || '/api/pocasi',
      obsah: n.obsah || '/content/',
      // Jeden veřejný soubor z build-hbot.mjs (složka content nemusí být na webu veřejná) – úkol 48.
      balicek: n.balicek === false ? null : (n.balicek || '/assets/hspg-cenik.json')
    };
  }

  function textChyby(data, vychozi) {
    var t = data && typeof data.chyba === 'string' ? data.chyba.trim() : '';
    return t && t.length <= 300 ? t : vychozi;
  }

  function overit(N, kod, pristup) {
    var ovladac = typeof AbortController === 'function' ? new AbortController() : null;
    var casovac = setTimeout(function () { if (ovladac) ovladac.abort(); }, 15000);
    return Promise.resolve().then(function () {
      return N.fetch(N.api, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ sentinel_code: kod, pristup: pristup }),
        cache: 'no-store',
        credentials: 'same-origin',
        signal: ovladac ? ovladac.signal : undefined
      });
    }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (data) {
        if (r.ok && data && data.success !== false) return { stav: 'ok', pas: vycisti(data) };
        if (r.status === 429) return { stav: 'limit', text: textChyby(data, TEXT.limit) };
        if (r.status === 404 || r.status === 400) return { stav: 'nenalezeno', text: textChyby(data, TEXT.nenalezeno) };
        return { stav: 'chyba', text: TEXT.sit };
      });
    }).catch(function () {
      return { stav: 'chyba', text: TEXT.sit };
    }).then(function (v) {
      clearTimeout(casovac);
      return v;
    });
  }

  function nactiJson(N, url) {
    return Promise.resolve().then(function () {
      return N.fetch(url, { headers: { accept: 'application/json' }, credentials: 'same-origin' });
    }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
  }

  function nactiObsah(N) {
    return (N.balicek ? nactiJson(N, N.balicek) : Promise.resolve(null)).then(function (b) {
      if (b && (b.firma || b.sentinel)) return { firma: b.firma || {}, sentinel: b.sentinel || {} };
      return Promise.all([nactiJson(N, N.obsah + 'firma.json'), nactiJson(N, N.obsah + 'sentinel.json')]).then(function (x) {
        return { firma: x[0] || {}, sentinel: x[1] || {} };
      });
    });
  }

  /* ---------- 9. Ovládání stránky ---------- */
  function spust() {
    var koren = doc && doc.querySelector('[data-pdt]');
    if (!koren || koren.getAttribute('data-pdt') === 'bezi') return;
    // Jako první: kód z odkazu pryč z adresního řádku – dřív, než odejde jakýkoli požadavek.
    var zOdkazuCert = prectiFragment();
    koren.setAttribute('data-pdt', 'bezi');

    var N = nastaveni();
    var dvere = koren.querySelector('.pdt-dvere');
    var form = doc.getElementById('pdt-formular');
    var sada = doc.getElementById('pdt-sada');
    var poleKod = doc.getElementById('pdt-kod');
    var polePristup = doc.getElementById('pdt-pristup');
    var chyba = doc.getElementById('pdt-chyba');
    var stav = doc.getElementById('pdt-stav');
    var displej = doc.getElementById('pdt-displej');
    var tlacitko = doc.getElementById('pdt-otevrit');
    var otevrenoBox = doc.getElementById('pdt-otevreno');
    var pasEl = doc.getElementById('pdt-pas');
    if (!form || !poleKod || !polePristup || !pasEl) return;

    var obsahSlib = nactiObsah(N);
    var probiha = false;
    var textTlacitka = tlacitko ? tlacitko.textContent : '';

    function ohlasit(text) {
      if (!stav) return;
      stav.textContent = '';
      setTimeout(function () { stav.textContent = text; }, 30);
    }
    function nastavStav(s) { if (dvere) dvere.setAttribute('data-stav', s); }
    function vymazChybu() {
      if (chyba) while (chyba.firstChild) chyba.removeChild(chyba.firstChild);
      [poleKod, polePristup].forEach(function (p) { p.removeAttribute('aria-invalid'); });
    }
    function ukazChybu(text) {
      if (!chyba) return;
      while (chyba.firstChild) chyba.removeChild(chyba.firstChild);
      pridej(chyba, sTelefonem(text));
    }
    function chybaPole(pole, text) {
      ukazChybu(text);
      pole.setAttribute('aria-invalid', 'true');
      pole.focus();
    }

    function napojMasku(pole, maska, poZmene) {
      pole.addEventListener('input', function () {
        var v = pole.value;
        var odkaz = /(?:^|[#?&])(?:kod|pristup)=/.test(v) ? zOdkazu(v) : null;
        if (odkaz) { vyplnit(odkaz); if (tlacitko) tlacitko.focus(); return; }
        var m = maska(v, pole.selectionStart);
        if (m.hodnota !== v) {
          pole.value = m.hodnota;
          if (doc.activeElement === pole) { try { pole.setSelectionRange(m.kurzor, m.kurzor); } catch (e) { /* jiný typ pole */ } }
        }
        pole.removeAttribute('aria-invalid');
        if (poZmene) poZmene();
      });
    }
    function obnovDisplej() { if (displej) displej.textContent = displejKodu(poleKod.value); }
    napojMasku(poleKod, maskaKodu, obnovDisplej);
    napojMasku(polePristup, maskaPristupu);

    function vyplnit(f) {
      if (f.kod) poleKod.value = maskaKodu(f.kod).hodnota;
      if (f.pristup) polePristup.value = maskaPristupu(f.pristup).hodnota;
      obnovDisplej();
    }

    function otres() {
      if (!dvere || klid()) return;
      dvere.classList.remove('pdt-otres');
      void dvere.offsetWidth;
      dvere.classList.add('pdt-otres');
    }

    function vyprazdni(e) { while (e.firstChild) e.removeChild(e.firstChild); }

    function zavrit() {
      vyprazdni(pasEl);
      pasEl.hidden = true;
      pasEl.classList.remove('pdt-odhaleni');
      form.hidden = false;
      if (otevrenoBox) otevrenoBox.hidden = true;
      poleKod.value = '';
      polePristup.value = '';
      obnovDisplej();
      vymazChybu();
      nastavStav('zamceno');
      var ukazkovy = doc.getElementById('ukazkovy-pas');
      if (ukazkovy) ukazkovy.hidden = false;
      ohlasit('Pas domu je zavřený.');
      poleKod.focus();
    }

    function odhalit(pas) {
      return obsahSlib.then(function (obsah) {
        var vystup = vykresliPas(pas, obsah, { kod: poleKod.value });
        vyprazdni(pasEl);
        pasEl.appendChild(vystup.fragment);
        Array.prototype.forEach.call(pasEl.querySelectorAll('[data-pdt-zavrit]'), function (b) { b.addEventListener('click', zavrit); });
        polePristup.value = '';
        form.hidden = true;
        if (otevrenoBox) otevrenoBox.hidden = false;
        nastavStav('otevreno');
        var ukazkovy = doc.getElementById('ukazkovy-pas');
        if (ukazkovy) ukazkovy.hidden = true;

        var tichy = klid();
        var efekt = Promise.resolve();
        if (!tichy && dvere) {
          var cif = dvere.querySelector('.pdt-cifernik') || dvere;
          var box = cif.getBoundingClientRect();
          koren.classList.add('pdt-rozostreni');
          efekt = vlna(box.left + box.width / 2, box.top + box.height / 2).then(function () { koren.classList.remove('pdt-rozostreni'); });
        }
        var nadpis = doc.getElementById('pdt-pas-h');
        var zobraz = function () {
          pasEl.hidden = false;
          if (!tichy) pasEl.classList.add('pdt-odhaleni');
          if (pasEl.scrollIntoView) pasEl.scrollIntoView({ behavior: tichy ? 'auto' : 'smooth', block: 'start' });
          if (nadpis) { try { nadpis.focus({ preventScroll: true }); } catch (e) { nadpis.focus(); } }
          ohlasit('Pas domu ' + (pas.kod || '') + ' je otevřený.');
        };
        if (tichy) zobraz(); else setTimeout(zobraz, 320);

        if (vystup.pocasi && pas.obec) {
          nactiJson(N, N.pocasi + '?q=' + encodeURIComponent(String(pas.obec).slice(0, 80))).then(function (data) {
            vyplnPredpoved(vystup.pocasi, data, obsah.sentinel);
          });
        } else if (vystup.pocasi) vyplnPredpoved(vystup.pocasi, null, obsah.sentinel);
        return efekt;
      });
    }

    function otevrit() {
      if (probiha) return;
      vymazChybu();
      var kod = maskaKodu(poleKod.value).hodnota;
      var pristup = maskaPristupu(polePristup.value).hodnota;
      if (!KOD_TVAR.test(kod)) return chybaPole(poleKod, TEXT.tvarKodu);
      if (!PRISTUP_TVAR.test(pristup)) return chybaPole(polePristup, TEXT.tvarPristupu);
      probiha = true;
      form.setAttribute('aria-busy', 'true');
      if (tlacitko) { tlacitko.disabled = true; tlacitko.textContent = 'Ověřuji…'; }
      nastavStav('overuji');
      ohlasit('Ověřuji kód pasu…');
      var mich = !klid() && displej ? michani(displej, kod) : null;
      overit(N, kod, pristup).then(function (v) {
        var hotovo;
        if (mich) hotovo = mich.dokonci(kod);
        else { if (displej) displej.textContent = kod; hotovo = Promise.resolve(); }
        return hotovo.then(function () { return v; });
      }).then(function (v) {
        probiha = false;
        form.removeAttribute('aria-busy');
        if (tlacitko) { tlacitko.disabled = false; tlacitko.textContent = textTlacitka; }
        if (v.stav === 'ok') return odhalit(v.pas);
        nastavStav('zamceno');
        ukazChybu(v.text);
        otres();
      });
    }

    form.addEventListener('submit', function (e) { e.preventDefault(); otevrit(); });
    Array.prototype.forEach.call(doc.querySelectorAll('[data-pdt-zavrit]'), function (b) { b.addEventListener('click', zavrit); });
    if (sada) sada.disabled = false;
    obnovDisplej();
    nastavStav('zamceno');

    if (zOdkazuCert) {
      vyplnit(zOdkazuCert);
      if (KOD_TVAR.test(poleKod.value) && PRISTUP_TVAR.test(polePristup.value)) otevrit();
      else (KOD_TVAR.test(poleKod.value) ? polePristup : poleKod).focus();
    }
  }

  if (doc) {
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', spust);
    else spust();
  }

  return {
    maskaKodu: maskaKodu,
    maskaPristupu: maskaPristupu,
    displejKodu: displejKodu,
    zOdkazu: zOdkazu,
    vycisti: vycisti,
    zbyva: zbyva,
    tvar: tvar,
    datum: datum,
    typografie: typografie,
    TEXT: TEXT,
    PRAHY: { VYDATNE_MM: VYDATNE_MM, SILNY_VITR: SILNY_VITR }
  };
});
