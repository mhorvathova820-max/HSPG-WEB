/*! HSPG cenové jádro (úkol 50 · R15–R16)
 * Jeden výpočet ceny pro H-BOT, HOLUB 360 a nabídky v PDF. Čísla bere výhradně z content/ceny.json,
 * texty postupu z content/standard.json a tarify z content/sentinel.json – nic natvrdo v kódu.
 *
 * Prohlížeč:  HSPGCena.nacti().then(function (jadro) { var n = jadro.spocitej(vstup); })
 * Testy/Node: soubor se spustí ve vm kontextu s objektem module (viz balicek/testy/unit/cena.test.mjs).
 *
 * vstup = {
 *   polozky: [{ povrch: "strecha"|"fasada"|"dlazba"|"fve", cesta: "A"|"B"|"cisteni", plocha: m², med?: m, barva?: {ral, nazev, hex}, zpusob?: text }],
 *   typObjektu: "rd"|"bytovy"|"firma"|"jiny",
 *   lat?, lon?           – poloha objektu pro odhad dopravy (bez ní se doprava upřesní v nabídce)
 *   slevaPlanovac?: číslo – sleva za rezervaci v plánovači (např. 0.1), jen z ceny prací, nesčítá se
 * }
 */
(function (koren, tovarna) {
  'use strict';
  var api = tovarna();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (koren) koren.HSPGCena = api;
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
  'use strict';

  var POVRCHY = {
    strecha: { nazev: 'Střecha', klic: 'roof' },
    fasada: { nazev: 'Fasáda', klic: 'facade' },
    dlazba: { nazev: 'Dlažba a zpevněné plochy', klic: 'driveway' },
    fve: { nazev: 'Fotovoltaika', klic: 'solar' }
  };
  var TYPY_OBJEKTU = { rd: 'Rodinný dům', bytovy: 'Bytový dům / SVJ / BD', firma: 'Firma / areál', jiny: 'Jiný objekt' };
  // Koeficienty sklonu: plocha střechy = půdorys × koeficient (1 / cos sklonu, zaokrouhleno).
  var SKLONY = [
    { id: 'plocha', nazev: 'Plochá (do 10°)', koeficient: 1.0 },
    { id: 'mirna', nazev: 'Mírná (asi 25°)', koeficient: 1.1 },
    { id: 'bezna', nazev: 'Běžná (asi 35°)', koeficient: 1.22 },
    { id: 'strma', nazev: 'Strmá (asi 45°)', koeficient: 1.41 }
  ];
  var PANEL_M2 = 1.8;          // orientační plocha jednoho fotovoltaického panelu
  var VYSKA_PODLAZI = 2.9;     // shodně s kalkulačkou SVJ na webu
  var ODECET_OTVORU = 0.25;    // bytové domy: okna a dveře

  function zaokrouhli10(x) { return Math.round(x / 10) * 10; }
  function rad(x) { return x * Math.PI / 180; }

  function kc(n) {
    var s = Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return s + ' Kč';
  }
  function cislo(n, des) {
    var f = Math.pow(10, des == null ? 1 : des);
    return String(Math.round(Number(n) * f) / f).replace('.', ',');
  }

  /** Česká typografie (KONTEXT §4.9): nezlomitelná mezera po jednopísmenných předložkách a spojkách
   *  a mezi číslem a jednotkou. Použije se na texty z JSON před vykreslením. */
  function typografie(text) {
    return String(text == null ? '' : text)
      .replace(/(^|[\s(„])([vkszaiouVKSZAIOU])\s+/g, '$1$2\u00a0')
      .replace(/(\d)\s+(\d{3})(?!\d)/g, '$1\u00a0$2')
      .replace(/(\d)\s+(Kč|m²|m|km|%|dnů|dny|let|roky|h|ks|l|°C|mm)(?![0-9A-Za-z\u00C0-\u017F])/g, '$1\u00a0$2');
  }

  function vzdusnaKm(a, b) {
    var R = 6371.0088, dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /** Plocha, obvod a nejdelší hrana mnohoúhelníku [{lat, lng}] v metrech (místní rovinná projekce). */
  function metrikyMnohouhelniku(body) {
    if (!body || body.length < 3) return { plocha: 0, obvod: 0, nejdelsiHrana: 0 };
    var R = 6371008.8, lat0 = 0, i;
    for (i = 0; i < body.length; i++) lat0 += body[i].lat;
    lat0 = rad(lat0 / body.length);
    var xy = body.map(function (b) { return [R * rad(b.lng) * Math.cos(lat0), R * rad(b.lat)]; });
    var plocha = 0, obvod = 0, nejdelsi = 0;
    for (i = 0; i < xy.length; i++) {
      var a = xy[i], c = xy[(i + 1) % xy.length];
      plocha += a[0] * c[1] - c[0] * a[1];
      var d = Math.sqrt((c[0] - a[0]) * (c[0] - a[0]) + (c[1] - a[1]) * (c[1] - a[1]));
      obvod += d;
      if (d > nejdelsi) nejdelsi = d;
    }
    return { plocha: Math.abs(plocha) / 2, obvod: obvod, nejdelsiHrana: nejdelsi };
  }

  /** Výchozí data pro případ, že se JSON nenačte (shodná s content/*.json k 22. 10. 2026). */
  var VYCHOZI = {
    cenik: {
      platnost_od: '2026-10-01',
      ochrana_hstone: { facade: 168, roof: 178, driveway: 119 },
      cisteni_only: { facade: 89, roof: 99, driveway: 69, solar: 39 },
      renovace_color: { roof: 268, facade: 298 },
      addons: { copper_guard_base_4m: 1490, copper_guard_per_meter: 290, svj_window_masking: 20, heavy_dirt_surcharge_min: 10, heavy_dirt_surcharge_max: 30 },
      discounts: { multi_surface: 0.05, svj_1000m: 0.05, svj_2500m: 0.08 },
      minimum: { zakazka: 4900, fve: 2490 },
      doprava: { zdarma_km: 30, zakladny: ['Praha', 'Hradec Králové'], kc_za_km: 12, zakladny_gps: { 'Praha': [50.0925, 14.451], 'Hradec Králové': [50.2092, 15.8328] }, koeficient_silnice: 1.3 },
      platby: { hranice_zalohy: 100000, zaloha_nad_hranici: 0.3, splatnost_dni: 7, splatnost_svj_dni: 14, skip_pay: { zapnuto: false, nazev: 'Skip Pay – Na třetiny', splatek: 3 } }
    },
    standard: {
      kroky: [
        { cislo: '01', nazev: 'Čištění', popis: 'Čištění tlakem a teplotou vody podle materiálu' },
        { cislo: '02', nazev: 'Odmaštění', popis: 'Odmaštění povrchu bez usazenin' },
        { cislo: '03', nazev: 'Ošetření biocidy', popis: 'Ošetření biocidy v pórech materiálu' },
        { cislo: '04', nazev: 'Oplach', popis: 'Důkladný oplach uvolněné biomasy' },
        { cislo: '05', nazev: 'Ochranná vrstva', popis: 'Finální ochranná vrstva podle zvolené cesty' }
      ],
      cesty: {
        A: { id: 'A', nazev: 'Neviditelný štít', sluzba: 'hstone', popis: '2× nástřik hydrofobní nano-impregnace H-STONE. Voda perlí, povrch dýchá, vzhled zůstává.', povrchy: ['strecha', 'fasada', 'dlazba'] },
        B: { id: 'B', nazev: 'Barevná renovace', sluzba: 'renovace', popis: 'Penetrace a 2× strojní airless nástřik ohřívanou barvou v odstínu podle vašeho výběru.', povrchy: ['strecha', 'fasada'] }
      },
      biocidy_veta: 'Používejte biocidy bezpečným způsobem. Před použitím si vždy přečtěte označení a informace o přípravku.',
      barvy_renovace: { strecha: [], fasada: [] }
    },
    sentinel: { podminka_zaruky: '', tarify: [] },
    potvrzeni: null
  };

  function sazba(cenik, povrch, cesta) {
    var k = POVRCHY[povrch] && POVRCHY[povrch].klic;
    if (!k) return null;
    if (cesta === 'A') return (cenik.ochrana_hstone || {})[k] || null;
    if (cesta === 'B') return (cenik.renovace_color || {})[k] || null;
    if (cesta === 'cisteni') return (cenik.cisteni_only || {})[k] || null;
    return null;
  }

  function nazevSluzby(standard, povrch, cesta) {
    if (povrch === 'fve') return 'Čištění fotovoltaiky';
    if (cesta === 'cisteni') return 'Čištění bez ochranné vrstvy';
    var c = standard.cesty && standard.cesty[cesta];
    return c ? 'Cesta ' + cesta + ' – ' + c.nazev : cesta;
  }

  function detailSluzby(standard, povrch, cesta, barva) {
    if (povrch === 'fve') return 'šetrné čištění panelů vodou';
    if (cesta === 'cisteni') return 'kroky 01–04 Standardu HOLUB';
    var c = standard.cesty && standard.cesty[cesta];
    // Jen první věta popisu a malé jen první písmeno (značka H-STONE zůstane velkými).
    var veta = c ? String(c.popis || '').split(/\.\s/)[0].replace(/\.$/, '') : '';
    if (cesta === 'B' && barva && barva.ral) veta = veta.replace(/\s+v odstínu podle vašeho výběru$/, '');
    var t = 'kroky 01–04 + ' + (veta ? veta.charAt(0).toLowerCase() + veta.slice(1) : 'ochranná vrstva');
    if (cesta === 'B') t += barva && barva.ral ? ' · odstín ' + barva.ral + (barva.nazev ? ' ' + barva.nazev : '') : ' · odstín určíte podle vzorníku';
    return t;
  }

  function dopravaPro(cenik, lat, lon) {
    var d = cenik.doprava || {};
    if (typeof lat !== 'number' || typeof lon !== 'number' || !isFinite(lat) || !isFinite(lon)) {
      return { znamo: false, cena: 0, text: 'Doprava zdarma do ' + d.zdarma_km + '\u00a0km od Prahy nebo Hradce Králové, dál ' + d.kc_za_km + '\u00a0Kč/km – upřesníme v\u00a0nabídce.' };
    }
    var gps = d.zakladny_gps || {}, nejblizsi = null;
    Object.keys(gps).forEach(function (n) {
      var km = vzdusnaKm([lat, lon], gps[n]);
      if (!nejblizsi || km < nejblizsi.km) nejblizsi = { zakladna: n, km: km };
    });
    if (!nejblizsi) return { znamo: false, cena: 0, text: 'Dopravu upřesníme v\u00a0nabídce.' };
    var silnice = Math.round(nejblizsi.km * (d.koeficient_silnice || 1.3));
    var placene = Math.max(0, silnice - (d.zdarma_km || 0));
    return {
      znamo: true, zakladna: nejblizsi.zakladna, km: silnice, placeneKm: placene, cena: placene * (d.kc_za_km || 0),
      text: placene > 0
        ? 'Odhad ' + silnice + '\u00a0km od základny ' + nejblizsi.zakladna + ': ' + placene + '\u00a0km nad ' + d.zdarma_km + '\u00a0km × ' + d.kc_za_km + '\u00a0Kč (jedna cesta).'
        : 'Do ' + d.zdarma_km + '\u00a0km od základny ' + nejblizsi.zakladna + ' – doprava zdarma.'
    };
  }

  function vytvor(data) {
    data = data || {};
    var cenik = data.cenik || VYCHOZI.cenik;
    var standard = data.standard || VYCHOZI.standard;
    var sentinel = data.sentinel || VYCHOZI.sentinel;
    var potvrzeni = data.potvrzeni || null;
    var firma = data.firma || null; // veřejné údaje o firmě pro dokumenty (z assets/hspg-cenik.json)
    var potvrzeno = !!(potvrzeni && potvrzeni.platnost_od && potvrzeni.platnost_od === cenik.platnost_od && potvrzeni.datum);

    function spocitej(vstup) {
      var polozky = (vstup && vstup.polozky) || [];
      if (!polozky.length) throw new Error('Kalkulace nemá žádnou položku.');
      var typ = TYPY_OBJEKTU[vstup.typObjektu] ? vstup.typObjektu : 'rd';
      var radky = [], prace = 0, priplatky = 0, doplnky = 0, plochaCelkem = 0, povrchy = {}, cesty = {};

      polozky.forEach(function (p) {
        var povrch = p.povrch;
        var cesta = povrch === 'fve' ? 'cisteni' : p.cesta;
        var s = sazba(cenik, povrch, cesta);
        var plocha = Math.round(Math.max(0, Number(p.plocha) || 0) * 10) / 10;
        if (!s) throw new Error('Pro povrch „' + povrch + '“ a cestu „' + cesta + '“ ceník sazbu nemá.');
        if (!(plocha > 0)) throw new Error('Plocha musí být větší než 0\u00a0m².');
        var castka = plocha * s;
        prace += castka; plochaCelkem += plocha; povrchy[povrch] = true; if (povrch !== 'fve') cesty[cesta] = true;
        radky.push({
          druh: 'prace', povrch: povrch, cesta: cesta, barva: p.barva || null,
          nazev: POVRCHY[povrch].nazev + ' – ' + nazevSluzby(standard, povrch, cesta),
          detail: detailSluzby(standard, povrch, cesta, p.barva), zpusob: p.zpusob || '',
          mnozstvi: plocha, jednotka: 'm²', sazba: s, castka: castka
        });
        if (typ === 'bytovy' && povrch === 'fasada') {
          var m = (cenik.addons || {}).svj_window_masking || 0;
          if (m) {
            priplatky += plocha * m;
            radky.push({ druh: 'priplatek', povrch: povrch, nazev: 'Zakrývání oken – bytový dům', detail: 'příplatek k ploše fasády', mnozstvi: plocha, jednotka: 'm²', sazba: m, castka: plocha * m });
          }
        }
        if (povrch === 'strecha' && Number(p.med) > 0) {
          var a = cenik.addons || {}, metry = Math.ceil(Number(p.med));
          var med = (a.copper_guard_base_4m || 0) + Math.max(0, metry - 4) * (a.copper_guard_per_meter || 0);
          doplnky += med;
          radky.push({ druh: 'doplnek', povrch: povrch, nazev: 'Měděný hřebenový prvek s ražbou holuba', detail: 'základ do 4\u00a0m, každý další metr ' + (a.copper_guard_per_meter || 0) + '\u00a0Kč', mnozstvi: metry, jednotka: 'm', sazba: null, castka: med });
        }
      });

      // Slevy se nesčítají – uplatní se nejvýhodnější.
      var sl = cenik.discounts || {}, zaklad = prace + priplatky + doplnky, kandidati = [];
      if (Object.keys(povrchy).length >= 2 && sl.multi_surface) kandidati.push({ id: 'vice-povrchu', nazev: 'Sleva za dva a více povrchů', sazba: sl.multi_surface, castka: zaklad * sl.multi_surface });
      if (typ === 'bytovy' && plochaCelkem >= 2500 && sl.svj_2500m) kandidati.push({ id: 'svj-2500', nazev: 'Množstevní sleva SVJ/BD od 2\u00a0500\u00a0m²', sazba: sl.svj_2500m, castka: zaklad * sl.svj_2500m });
      else if (typ === 'bytovy' && plochaCelkem >= 1000 && sl.svj_1000m) kandidati.push({ id: 'svj-1000', nazev: 'Množstevní sleva SVJ/BD od 1\u00a0000\u00a0m²', sazba: sl.svj_1000m, castka: zaklad * sl.svj_1000m });
      if (Number(vstup.slevaPlanovac) > 0) kandidati.push({ id: 'planovac', nazev: 'Sleva za rezervaci v\u00a0plánovači (z\u00a0ceny prací)', sazba: Number(vstup.slevaPlanovac), castka: prace * Number(vstup.slevaPlanovac) });
      kandidati.sort(function (x, y) { return y.castka - x.castka; });
      var sleva = kandidati[0] || null;

      var doprava = dopravaPro(cenik, vstup.lat, vstup.lon);
      var mezisoucet = zaklad - (sleva ? sleva.castka : 0);
      var celkem = mezisoucet + doprava.cena;
      var jenFve = Object.keys(povrchy).length === 1 && povrchy.fve;
      var minimum = jenFve ? (cenik.minimum || {}).fve : (cenik.minimum || {}).zakazka;
      var predMinimem = celkem;
      var minimumPouzito = !!minimum && celkem < minimum;
      if (minimumPouzito) celkem = minimum;
      var vysledna = zaokrouhli10(celkem);

      var pl = cenik.platby || {}, svj = typ === 'bytovy';
      var splatnost = svj ? pl.splatnost_svj_dni : pl.splatnost_dni;
      var zalohaNutna = vysledna > (pl.hranice_zalohy || Infinity);
      var zaloha = zalohaNutna ? zaokrouhli10(vysledna * (pl.zaloha_nad_hranici || 0)) : 0;
      var skip = pl.skip_pay && pl.skip_pay.zapnuto
        ? { nazev: pl.skip_pay.nazev, splatek: pl.skip_pay.splatek, splatka: Math.ceil(vysledna / pl.skip_pay.splatek), text: 'Skip Pay – ' + pl.skip_pay.splatek + '\u00a0splátky podle podmínek a\u00a0schválení Skip Pay.' }
        : null;

      return {
        potvrzeno: potvrzeno,
        platnostCeniku: cenik.platnost_od,
        typObjektu: typ, typObjektuNazev: TYPY_OBJEKTU[typ],
        radky: radky, prace: prace, priplatky: priplatky, doplnky: doplnky, plochaCelkem: plochaCelkem,
        sleva: sleva, doprava: doprava, minimum: minimum, minimumPouzito: minimumPouzito, predMinimem: predMinimem,
        celkem: celkem, vysledna: vysledna, zaokrouhleni: vysledna - celkem,
        platba: {
          zalohaNutna: zalohaNutna, zaloha: zaloha, splatnostDni: splatnost,
          text: zalohaNutna
            ? 'Nad ' + kc(pl.hranice_zalohy) + ' záloha ' + Math.round((pl.zaloha_nad_hranici || 0) * 100) + '\u00a0% na materiál (' + kc(zaloha) + '), zbytek do ' + splatnost + '\u00a0dnů po předání díla.'
            : 'Záloha 0\u00a0Kč. Platíte až po předání díla, splatnost ' + splatnost + '\u00a0dnů.'
        },
        skipPay: skip,
        kroky: standard.kroky,
        cesty: Object.keys(cesty).map(function (c) { return standard.cesty && standard.cesty[c]; }).filter(Boolean),
        biocidy: (cesty.A || cesty.B || cesty.cisteni) ? standard.biocidy_veta : null
      };
    }

    return {
      spocitej: spocitej,
      cenik: cenik, standard: standard, sentinel: sentinel, potvrzeno: potvrzeno, firma: firma,
      barvy: function (povrch) { return ((standard.barvy_renovace || {})[povrch] || []).slice(); },
      cestyPro: function (povrch) {
        if (povrch === 'fve') return [];
        return ['A', 'B'].filter(function (c) {
          var x = standard.cesty && standard.cesty[c];
          return x && x.povrchy.indexOf(povrch) >= 0 && sazba(cenik, povrch, c);
        }).map(function (c) { return { id: c, nazev: standard.cesty[c].nazev, popis: standard.cesty[c].popis, sazba: sazba(cenik, povrch, c) }; });
      },
      tarify: function () { return (sentinel.tarify || []).slice(); },
      podminkaZaruky: function () { return sentinel.podminka_zaruky || ''; }
    };
  }

  /** Načte ceník, standard, tarify a potvrzení z webu; při chybě použije výchozí data (ceny se pak neukazují).
   *  Nejdřív jeden soubor assets/hspg-cenik.json (generuje ho scripts/build-hbot.mjs z content/*.json – na webu
   *  nemusí být složka content veřejná), záložně jednotlivé soubory z /content/. */
  function nacti(moznosti) {
    moznosti = moznosti || {};
    var zaklad = moznosti.zaklad || '/content/';
    var f = moznosti.fetch || (typeof fetch === 'function' ? fetch.bind(typeof self !== 'undefined' ? self : this) : null);
    function json(url) {
      if (!f) return Promise.resolve(null);
      return f(url, { credentials: 'same-origin', cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; });
    }
    var balicek = moznosti.balicek === false ? Promise.resolve(null) : json(moznosti.balicek || '/assets/hspg-cenik.json');
    return balicek.then(function (b) {
      if (b && b.cenik && b.cenik.platnost_od) {
        return vytvor({ cenik: b.cenik, standard: b.standard || VYCHOZI.standard, sentinel: b.sentinel || VYCHOZI.sentinel, potvrzeni: b.potvrzeni || null, firma: b.firma || null });
      }
      return Promise.all([json(zaklad + 'ceny.json'), json(zaklad + 'standard.json'), json(zaklad + 'sentinel.json'), json(zaklad + 'cenik-potvrzeni.json')]).then(function (v) {
        return vytvor({ cenik: v[0] || VYCHOZI.cenik, standard: v[1] || VYCHOZI.standard, sentinel: v[2] || VYCHOZI.sentinel, potvrzeni: v[0] ? v[3] : null });
      });
    });
  }

  return {
    verze: '1.0.0',
    nacti: nacti, vytvor: vytvor, VYCHOZI: VYCHOZI,
    POVRCHY: POVRCHY, TYPY_OBJEKTU: TYPY_OBJEKTU, SKLONY: SKLONY,
    PANEL_M2: PANEL_M2, VYSKA_PODLAZI: VYSKA_PODLAZI, ODECET_OTVORU: ODECET_OTVORU,
    metrikyMnohouhelniku: metrikyMnohouhelniku, vzdusnaKm: vzdusnaKm, dopravaPro: dopravaPro,
    zaokrouhli10: zaokrouhli10, kc: kc, cislo: cislo, typografie: typografie
  };
});
