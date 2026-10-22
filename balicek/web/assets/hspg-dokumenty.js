/*! HSPG dokumenty (úkol 48 · R16): orientační cenová kalkulace a NÁVRH smlouvy o dílo v PDF.
 * PDF vzniká jen v prohlížeči zákazníka (pdfmake hostovaný u sebe v /assets/vendor/pdfmake/) – nic se
 * neodesílá na server. Čísla a texty jen z výsledku cenového jádra (HSPGCena.spocitej) a z dat webu
 * (assets/hspg-cenik.json: ceník, Standard HOLUB, SENTINEL, veřejné údaje firmy).
 * NÁVRH smlouvy je zřetelně nezávazný: není nabídkou ve smyslu § 1732 občanského zákoníku.
 *
 * Prohlížeč: HSPGDokumenty.kalkulace(nabidka, kontext) / HSPGDokumenty.navrhSmlouvy(nabidka, kontext) → Promise
 * Testy:     definiceKalkulace / definiceSmlouvy vrací čistou definici dokumentu pdfmake (bez knihovny).
 * kontext = { cislo, datum: Date, firma, standard, tarify, podminkaZaruky, cenik, obec, objednatel?: { jmeno, ico, adresa, telefon, email } }
 */
(function (koren, tovarna) {
  'use strict';
  var api = tovarna(koren);
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (koren) koren.HSPGDokumenty = api;
})(typeof self !== 'undefined' ? self : (typeof globalThis !== 'undefined' ? globalThis : this), function (koren) {
  'use strict';

  var PDFMAKE = '/assets/vendor/pdfmake/pdfmake.min.js';
  var PISMA = '/assets/vendor/pdfmake/vfs_fonts.js';
  var BARVY = { text: '#1b2430', tlumena: '#5b6472', zlato: '#a8841e', zlatoSvetle: '#f7f0da', linka: '#e4dcc4', tmava: '#0b0f19' };
  var CARY = '……………………………';

  // Česká typografie (KONTEXT §4.9) – stejná pravidla jako HSPGCena.typografie.
  function T(text) {
    return String(text == null ? '' : text)
      .replace(/(^|[\s(„])([vkszaiouVKSZAIOU])\s+/g, '$1$2 ')
      .replace(/(\d)\s+(\d{3})(?!\d)/g, '$1 $2')
      .replace(/(\d)\s+(Kč|m²|m|km|%|dnů|dny|let|roky|h|ks|l|°C|mm)(?![0-9A-Za-zÀ-ſ])/g, '$1 $2');
  }
  function kc(n) { return T(Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' Kč'); }
  function cislo(n, des) { var f = Math.pow(10, des == null ? 1 : des); return String(Math.round(Number(n) * f) / f).replace('.', ','); }
  function datum(d) { d = d instanceof Date ? d : new Date(d || Date.now()); return d.getDate() + '. ' + (d.getMonth() + 1) + '. ' + d.getFullYear(); }
  function datumIso(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? Number(m[3]) + '. ' + Number(m[2]) + '. ' + m[1] : ''; }
  function nazevPovrchu(p) { return { strecha: 'Střecha', fasada: 'Fasáda', dlazba: 'Dlažba a zpevněné plochy', fve: 'Fotovoltaika' }[p] || p; }
  function firmaZ(k) {
    var f = (k && k.firma) || {};
    return {
      znacka: f.znacka || 'HOLUB – HSPG', jmeno: f.provozovatel || 'Dušan Holub', ico: f.ico || '09291881',
      forma: f.pravni_forma || 'OSVČ', dph: f.dph || 'neplátce DPH', sidlo: f.sidlo || 'Pernerova 10/32, 186 00 Praha 8 – Karlín',
      telefon: f.telefon_zobrazeni || '+420 736 618 486', email: f.email || 'info@hspg.cz', web: String(f.web || 'https://hspg.cz').replace(/^https?:\/\//, '')
    };
  }
  // Znak: zlatý origami holub (stejné tvary jako H-BOT).
  var HOLUB_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g transform="translate(0 3)">' +
    '<polygon points="11.2,10.4 5.2,2.6 14.2,9.2" fill="#7a5a0e"/><polygon points="2.4,13.6 7.6,12.2 12.6,10.2 19.4,9.6 17.4,13.6 10.6,16.2 5.6,15.8" fill="#c99d2e"/>' +
    '<polygon points="7.6,12.2 12.6,10.2 19.4,9.6 12.8,12.8" fill="#e9c766"/><polygon points="12.6,10.2 16.6,1.8 15.2,10.2" fill="#f0d68a"/>' +
    '<polygon points="12.6,10.2 15.2,10.2 13.4,12.6" fill="#d4af37"/><polygon points="17.6,9.7 22.2,8.4 19.6,12.2" fill="#e9c766"/>' +
    '<polygon points="2.4,13.6 0.6,11.2 4.6,12.8" fill="#a8841e"/><polygon points="2.4,13.6 1.2,16.4 5.6,15.8" fill="#8a6a12"/></g></svg>';

  var STYLY = {
    znacka: { fontSize: 15, bold: true, color: BARVY.tmava },
    podznacka: { fontSize: 7, color: BARVY.zlato, characterSpacing: 2.2 },
    titul: { fontSize: 15, bold: true, color: BARVY.tmava },
    podtitul: { fontSize: 8, color: BARVY.tlumena },
    sekce: { fontSize: 8, bold: true, color: BARVY.zlato, characterSpacing: 1.6, margin: [0, 14, 0, 6] },
    male: { fontSize: 7.5, color: BARVY.tlumena },
    th: { fontSize: 7, bold: true, color: BARVY.tlumena, characterSpacing: 1 },
    clanek: { fontSize: 9.5, bold: true, color: BARVY.tmava, margin: [0, 10, 0, 3] }
  };

  function hlavicka(titul, podtitul) {
    return {
      columns: [
        { width: 30, svg: HOLUB_SVG },
        { width: '*', margin: [8, 3, 0, 0], stack: [{ text: 'HOLUB – HSPG', style: 'znacka' }, { text: 'OCHRANA POVRCHŮ · STANDARD HOLUB', style: 'podznacka' }] },
        { width: 'auto', stack: [{ text: titul, style: 'titul', alignment: 'right' }, { text: podtitul, style: 'podtitul', alignment: 'right' }] }
      ],
      margin: [0, 0, 0, 8]
    };
  }
  function linka(barva, tl) { return { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 499, y2: 0, lineWidth: tl || 0.8, lineColor: barva || BARVY.zlato }], margin: [0, 2, 0, 10] }; }
  function pata(f) {
    return function (stranka, pocet) {
      return {
        columns: [
          { text: T(f.znacka + ' · ' + f.jmeno + ' · IČO ' + f.ico + ' · ' + f.dph + ' · ' + f.telefon + ' · ' + f.email + ' · ' + f.web), style: 'male' },
          { text: stranka + '/' + pocet, alignment: 'right', style: 'male', width: 34 }
        ],
        margin: [48, 22, 48, 0]
      };
    };
  }
  function sloupecStrany(titul, radky) {
    return { width: '*', stack: [{ text: titul, style: 'sekce', margin: [0, 0, 0, 4] }].concat(radky.filter(Boolean).map(function (t, i) { return { text: T(t), bold: i === 0, fontSize: 9, margin: [0, 0, 0, 1.5] }; })) };
  }
  function strany(k) {
    var f = firmaZ(k), o = k.objednatel || {};
    return {
      columns: [
        sloupecStrany('ZHOTOVITEL', [f.jmeno, 'IČO ' + f.ico + ' · ' + f.forma + ' zapsaná v živnostenském rejstříku, ' + f.dph, 'Sídlo: ' + f.sidlo, 'Obchodní značka: ' + f.znacka, 'Tel. ' + f.telefon + ' · ' + f.email]),
        sloupecStrany('OBJEDNATEL', [o.jmeno || CARY, o.ico ? 'IČO ' + o.ico : null, 'Bydliště / sídlo: ' + CARY, 'Adresa objektu: ' + (o.adresa || (k.obec ? k.obec + ', ' : '') + CARY), o.telefon ? 'Tel. ' + o.telefon : null, o.email ? 'E-mail: ' + o.email : null])
      ],
      columnGap: 24
    };
  }
  function popisRadku(r) {
    var detail = [r.detail, r.druh === 'prace' && r.zpusob ? r.zpusob : null].filter(Boolean).join(' · ');
    return { stack: [{ text: T(r.nazev), bold: true, fontSize: 9 }, detail ? { text: T(detail), style: 'male', margin: [0, 1, 0, 0] } : null].filter(Boolean) };
  }
  function tabulkaCeny(n) {
    var P = function (t, extra) { var o = { text: T(t), alignment: 'right', fontSize: 9 }; for (var k in extra || {}) o[k] = extra[k]; return o; };
    var telo = [[{ text: 'POLOŽKA', style: 'th' }, { text: 'MNOŽSTVÍ', style: 'th', alignment: 'right' }, { text: 'SAZBA', style: 'th', alignment: 'right' }, { text: 'CENA', style: 'th', alignment: 'right' }]];
    n.radky.forEach(function (r) {
      telo.push([popisRadku(r), P(r.jednotka === 'm' ? r.mnozstvi + ' m' : cislo(r.mnozstvi, 1) + ' m²'), P(r.sazba ? r.sazba + ' Kč/' + r.jednotka : '—'), P(kc(r.castka))]);
    });
    if (n.sleva) telo.push([{ text: T(n.sleva.nazev + ' (' + Math.round(n.sleva.sazba * 100) + ' %)'), colSpan: 3, fontSize: 9 }, {}, {}, P('−' + kc(n.sleva.castka))]);
    telo.push([{ stack: [{ text: 'Doprava', bold: true, fontSize: 9 }, { text: T(n.doprava.text), style: 'male' }], colSpan: 3 }, {}, {}, P(n.doprava.znamo ? kc(n.doprava.cena) : 'upřesníme')]);
    if (n.minimumPouzito) telo.push([{ text: T('Doplatek do minimální zakázky ' + kc(n.minimum)), colSpan: 3, fontSize: 9 }, {}, {}, P(kc(n.minimum - n.predMinimem))]);
    if (Math.abs(n.zaokrouhleni) >= 0.5) telo.push([{ text: 'Zaokrouhlení na celé desítky Kč', colSpan: 3, fontSize: 9 }, {}, {}, P((n.zaokrouhleni > 0 ? '+' : '−') + kc(Math.abs(n.zaokrouhleni)))]);
    telo.push([
      { stack: [{ text: 'CENA CELKEM (orientační)', bold: true, fontSize: 10.5 }, { text: T('Zhotovitel není plátcem DPH, DPH se k ceně nepřipočítává.'), style: 'male' }], colSpan: 3 }, {}, {},
      P(kc(n.vysledna), { bold: true, fontSize: 13, color: BARVY.tmava })
    ]);
    var posledni = telo.length - 1;
    return {
      table: { headerRows: 1, widths: ['*', 62, 66, 78], body: telo },
      layout: {
        hLineWidth: function (i) { return i === 0 ? 0 : i === posledni ? 1.2 : 0.6; },
        vLineWidth: function () { return 0; },
        hLineColor: function (i) { return i === posledni ? BARVY.zlato : BARVY.linka; },
        paddingTop: function () { return 6; }, paddingBottom: function (i) { return i === posledni ? 2 : 6; },
        paddingLeft: function () { return 0; }, paddingRight: function () { return 0; }
      }
    };
  }
  function ramecek(obsah, vypln, okraj) {
    return {
      table: { widths: ['*'], body: [[{ stack: [].concat(obsah), margin: [10, 8, 10, 8] }]] },
      layout: { fillColor: function () { return vypln || BARVY.zlatoSvetle; }, hLineColor: function () { return okraj || BARVY.zlato; }, vLineColor: function () { return okraj || BARVY.zlato; }, hLineWidth: function () { return 0.8; }, vLineWidth: function () { return 0.8; } },
      margin: [0, 8, 0, 4]
    };
  }
  function seznam(polozky) { return { ul: polozky.map(function (t) { return { text: T(t), fontSize: 9, margin: [0, 0, 0, 2] }; }), markerColor: BARVY.zlato }; }
  function postup(n) {
    var obsah = [{ ol: (n.kroky || []).map(function (k) { return { text: [{ text: T(k.nazev) + ' – ', bold: true }, T(String(k.popis || '').replace(/\.$/, '') + '.')], fontSize: 9, margin: [0, 0, 0, 2] }; }) }];
    (n.cesty || []).forEach(function (c) { obsah.push({ text: [{ text: T('Cesta ' + c.id + ' – ' + c.nazev + ': '), bold: true }, T(c.popis)], fontSize: 9, margin: [0, 4, 0, 0] }); });
    var barvy = n.radky.filter(function (r) { return r.cesta === 'B' && r.barva; }).map(function (r) { return nazevPovrchu(r.povrch) + ': ' + r.barva.ral + (r.barva.nazev ? ' (' + r.barva.nazev + ')' : ''); });
    if (barvy.length) obsah.push({ text: T('Zvolený odstín – ' + barvy.join('; ') + '. Přesný odstín potvrdí vzorník při zaměření.'), fontSize: 9, margin: [0, 4, 0, 0] });
    return obsah;
  }
  function sentinel(n, k) {
    if (!n.radky.some(function (r) { return r.cesta === 'A'; }) || !(k.tarify || []).length) return [];
    var telo = [[{ text: 'TARIF', style: 'th' }, { text: 'ROČNĚ', style: 'th', alignment: 'right' }, { text: 'CO OBSAHUJE', style: 'th' }]];
    k.tarify.forEach(function (t) {
      telo.push([
        { stack: [{ text: T(t.nazev), bold: true, fontSize: 9 }, t.povinny_pro_zaruku ? { text: 'podmínka záruky', fontSize: 7.5, color: BARVY.zlato, bold: true } : null].filter(Boolean) },
        { text: kc(t.cena_rok), alignment: 'right', fontSize: 9 },
        { text: T((t.body || []).join(' · ')), fontSize: 8.5 }
      ]);
    });
    return [
      { text: 'PÉČE SENTINEL A ZÁRUKA', style: 'sekce' },
      { text: T(k.podminkaZaruky || ''), fontSize: 9, margin: [0, 0, 0, 6] },
      { table: { headerRows: 1, widths: [96, 56, '*'], body: telo }, layout: { hLineWidth: function (i) { return i === 0 ? 0 : 0.6; }, vLineWidth: function () { return 0; }, hLineColor: function () { return BARVY.linka; }, paddingTop: function () { return 5; }, paddingBottom: function () { return 5; } } }
    ];
  }
  function typObjektu(n, k) { return T(n.typObjektuNazev + (k.obec ? ' · obec ' + k.obec : '')); }

  /** Orientační cenová kalkulace z H-BOTa (není nabídkou podle § 1732 OZ). */
  function definiceKalkulace(n, k) {
    k = k || {};
    var f = firmaZ(k), a = (k.cenik && k.cenik.addons) || {};
    var podminky = [n.platba.text];
    if (n.skipPay) podminky.push(n.skipPay.text);
    podminky.push('Slevy se nesčítají – uplatňujeme nejvýhodnější.');
    if (a.heavy_dirt_surcharge_min) podminky.push('Silné znečištění se může projevit příplatkem ' + a.heavy_dirt_surcharge_min + '–' + a.heavy_dirt_surcharge_max + ' Kč/m², vždy předem.');
    return {
      pageSize: 'A4', pageMargins: [48, 48, 48, 64], footer: pata(f),
      info: { title: 'Orientační cenová kalkulace ' + k.cislo, author: f.znacka, subject: 'Kalkulace z H-BOTa na hspg.cz', creator: 'H-BOT · hspg.cz' },
      content: [
        hlavicka('ORIENTAČNÍ CENOVÁ KALKULACE', 'č. ' + k.cislo + ' · ' + datum(k.datum)),
        linka(),
        strany(k),
        { text: 'OBJEKT A ROZSAH', style: 'sekce' },
        { text: typObjektu(n, k), fontSize: 9.5, margin: [0, 0, 0, 6] },
        tabulkaCeny(n),
        { text: 'PLATEBNÍ PODMÍNKY', style: 'sekce' },
        seznam(podminky),
        { text: 'POSTUP – STANDARD HOLUB', style: 'sekce' }
      ].concat(postup(n)).concat(sentinel(n, k)).concat([
        ramecek([
          { text: 'NEZÁVAZNÁ ORIENTAČNÍ KALKULACE', bold: true, fontSize: 9, color: BARVY.tmava, margin: [0, 0, 0, 3] },
          { text: T('Cena vychází z ploch, které zadal zákazník, a z ceníku platného od ' + datumIso(n.platnostCeniku) + '. Přesnou cenu potvrdíme písemně po prohlídce na místě. Dokument vytvořil online asistent H-BOT na hspg.cz; není nabídkou ve smyslu § 1732 občanského zákoníku.'), fontSize: 8.5 }
        ]),
        n.biocidy ? { text: T(n.biocidy), style: 'male', margin: [0, 6, 0, 0] } : null
      ]).filter(Boolean),
      styles: STYLY, defaultStyle: { font: 'Roboto', fontSize: 9.5, color: BARVY.text, lineHeight: 1.22 }
    };
  }

  function clanek(c, titul, odstavce) {
    return [{ text: 'Čl. ' + c + ' ' + titul, style: 'clanek' }].concat(odstavce.filter(Boolean).map(function (p, i) {
      return { text: [{ text: c + '.' + (i + 1) + ' ', bold: true }, T(p)], fontSize: 9, margin: [0, 0, 0, 3], alignment: 'justify' };
    }));
  }
  /** NÁVRH smlouvy o dílo – nezávazný, s vodoznakem NÁVRH. */
  function definiceSmlouvy(n, k) {
    k = k || {};
    var f = firmaZ(k), o = k.objednatel || {}, a = (k.cenik && k.cenik.addons) || {}, pl = (k.cenik && k.cenik.platby) || {};
    var misto = o.adresa || (k.obec ? k.obec + ', ' + CARY : CARY);
    var maA = n.radky.some(function (r) { return r.cesta === 'A'; });
    var platba = n.platba.zalohaNutna
      ? 'Před zahájením prací uhradí objednatel zálohu ' + Math.round((pl.zaloha_nad_hranici || 0.3) * 100) + ' % ceny na materiál ve výši ' + kc(n.platba.zaloha) + '; zbytek ceny je splatný do ' + n.platba.splatnostDni + ' dnů od předání díla.'
      : 'Zálohu zhotovitel nepožaduje. Cena je splatná do ' + n.platba.splatnostDni + ' dnů od předání díla.';
    var kroky = (n.kroky || []).map(function (x) { return x.cislo + ' ' + x.nazev; }).join(', ');
    var cesty = (n.cesty || []).map(function (c) {
      var veta = String(c.popis || '').split(/\.\s/)[0].replace(/\.$/, '');
      return 'cesta ' + c.id + ' – ' + c.nazev + (veta ? ' (' + veta.charAt(0).toLowerCase() + veta.slice(1) + ')' : '');
    }).join('; ');
    // Návrh se nepodepisuje: podpisy patří až na konečné znění (čl. 10.1), jinak by podpisem návrhu mohla vzniknout smlouva.
    var dnu = k.cenik && k.cenik.smlouva && k.cenik.smlouva.odstoupeni_posun_dnu;
    return {
      pageSize: 'A4', pageMargins: [48, 48, 48, 64], footer: pata(f),
      watermark: { text: 'NÁVRH', color: BARVY.zlato, opacity: 0.1, bold: true, angle: -40 },
      info: { title: 'NÁVRH smlouvy o dílo ' + k.cislo, author: f.znacka, subject: 'Nezávazný návrh z H-BOTa na hspg.cz', creator: 'H-BOT · hspg.cz' },
      content: [
        hlavicka('NÁVRH SMLOUVY O DÍLO', 'ke kalkulaci č. ' + k.cislo + ' · vytvořeno ' + datum(k.datum)),
        linka(),
        ramecek([
          { text: 'NEZÁVAZNÝ NÁVRH – NEJDE O NABÍDKU', bold: true, fontSize: 9.5, color: BARVY.tmava, margin: [0, 0, 0, 3] },
          { text: T('Tento dokument vytvořil online asistent H-BOT na hspg.cz z údajů zadaných zákazníkem. Není nabídkou ve smyslu § 1732 zákona č. 89/2012 Sb., občanský zákoník – nevyjadřuje vůli zhotovitele být smlouvou vázán. Smlouva vznikne až podpisem konečného znění oběma stranami po ověření rozsahu díla na místě.'), fontSize: 8.5 }
        ]),
        { text: 'SMLUVNÍ STRANY', style: 'sekce' },
        strany(k),
        { text: T('uzavírají podle § 2586 a násl. zákona č. 89/2012 Sb., občanský zákoník, tuto smlouvu o dílo:'), fontSize: 9, margin: [0, 10, 0, 0] }
      ]
        .concat(clanek(1, 'Předmět díla', [
          'Zhotovitel se zavazuje provést pro objednatele na svůj náklad a nebezpečí ošetření povrchů objektu v rozsahu podle Přílohy č. 1 a objednatel se zavazuje dílo převzít a zaplatit cenu.',
          'Místo plnění: ' + misto + ' (' + n.typObjektuNazev + ').',
          'Dílo se provede postupem Standard HOLUB: ' + kroky + (cesty ? '; finální vrstva: ' + cesty : '') + '.',
          n.radky.some(function (r) { return r.cesta === 'B'; }) ? 'Odstín barevné renovace je uveden v Příloze č. 1; přesný odstín potvrdí vzorník při zaměření.' : null
        ]))
        .concat(clanek(2, 'Cena díla', [
          'Cena díla je stanovena podle ceníku zhotovitele platného od ' + datumIso(n.platnostCeniku) + ' a podle tohoto návrhu činí orientačně ' + kc(n.vysledna) + ' (rozpis v Příloze č. 1). Zhotovitel není plátcem DPH, DPH se k ceně nepřipočítává.',
          'Výměry vycházejí z údajů objednatele. Cenu díla stanoví konečné znění smlouvy po ověření skutečné plochy a stavu povrchu na místě; liší-li se skutečná plocha, cena se upraví podle sazeb ceníku.',
          'Doprava se účtuje podle ceníku: prvních ' + ((k.cenik && k.cenik.doprava && k.cenik.doprava.zdarma_km) || 30) + ' km od nejbližší základny zhotovitele (' + (((k.cenik && k.cenik.doprava && k.cenik.doprava.zakladny) || ['Praha', 'Hradec Králové']).join(', ')) + ') zdarma, každý další kilometr ' + ((k.cenik && k.cenik.doprava && k.cenik.doprava.kc_za_km) || 12) + ' Kč. V tomto návrhu je doprava odhadnuta za jednu cestu; způsob účtování a skutečnou vzdálenost uvede konečné znění smlouvy.',
          a.heavy_dirt_surcharge_min ? 'Příplatek za silné znečištění (' + a.heavy_dirt_surcharge_min + '–' + a.heavy_dirt_surcharge_max + ' Kč/m²) lze účtovat jen, je-li uveden v konečném znění smlouvy.' : null
        ]))
        .concat(clanek(3, 'Doba plnění', [
          'Termín zahájení prací: ' + CARY + ' (sjedná se písemně).',
          'Práce se provádějí jen za počasí vhodného pro použitou technologii – ochranné vrstvy a barvy vyžadují bezsrážkové klima. Za nevhodný se považuje zejména den s předpovědí pravděpodobnosti srážek nad 30 % nebo s teplotou pod 5 °C v pracovní době 7–19 h.',
          'Neumožní-li počasí práce, zhotovitel to objednateli oznámí bez zbytečného odkladu, zpravidla nejpozději den předem, a strany se dohodnou na náhradním termínu. Posun z důvodu počasí není prodlením zhotovitele. Přesáhne-li posun ' + (dnu ? dnu + ' dnů od sjednaného termínu zahájení' : 'lhůtu uvedenou v konečném znění smlouvy') + ', může kterákoli strana od smlouvy bez sankce odstoupit.'
        ]))
        .concat(clanek(4, 'Platební podmínky', [
          platba,
          'Platba proběhne převodem na účet zhotovitele uvedený na faktuře.',
          n.platba.zalohaNutna ? 'Neuskuteční-li se práce z důvodů podle čl. 3, vrátí zhotovitel zálohu v plné výši do 14 dnů. Odstoupí-li spotřebitel podle čl. 8, vrátí mu zhotovitel zálohu do 14 dnů od odstoupení (§ 1831 občanského zákoníku), sníženou jen o poměrnou část ceny za plnění poskytnuté do odstoupení (§ 1834).' : null,
          n.skipPay ? 'Objednatel může využít ' + n.skipPay.text.replace(/^Skip Pay – /, 'Skip Pay – ') : null
        ]))
        .concat(clanek(5, 'Součinnost objednatele', [
          'Objednatel zajistí přístup k vodě a elektřině a domluvený přístup na pozemek. Jeho přítomnost při práci není nutná.',
          'Objednatel upozorní zhotovitele na známé vady, poškozené nebo křehké části objektu a na citlivé rostliny či zvířata v místě plnění.'
        ]))
        .concat(clanek(6, 'Předání díla', [
          'Dílo se předá předávacím protokolem s fotodokumentací stavu před a po ošetření.'
        ]))
        .concat(clanek(7, 'Záruka a odpovědnost za vady', [
          maA ? 'Na ochrannou vrstvu H-STONE poskytuje zhotovitel smluvní záruku za jakost 10 let od předání díla. ' + (k.podminkaZaruky ? k.podminkaZaruky + ' ' : '') + 'Smluvní záruka zaniká, jestliže objednatel péči SENTINEL BASE ukončí nebo ji neuhradí; neprovede-li zhotovitel sjednanou kontrolu, záruka trvá. Podmínky péče SENTINEL BASE (roční kontrola s fotodokumentací, cena podle ceníku) a rozsah záruky stanoví konečné znění smlouvy.' : null,
          'Střešní tašku, která byla podle úvodní fotodokumentace bez viditelného poškození a praskla v souvislosti s pracemi zhotovitele, zhotovitel vymění na vlastní náklady; tím nejsou dotčena další práva objednatele na náhradu škody.',
          'Smluvní záruka nezužuje zákonná práva objednatele z vadného plnění (§ 2615 a násl. občanského zákoníku). Vadu díla objednatel vytkne zhotoviteli bez zbytečného odkladu poté, co ji zjistil – písemně na adresu sídla, e-mailem na ' + f.email + ' nebo telefonicky na ' + f.telefon + '. Zhotovitel vydá potvrzení o uplatnění reklamace a reklamaci vyřídí, u spotřebitele nejpozději do 30 dnů od jejího uplatnění, nedohodnou-li se strany na delší lhůtě.'
        ]))
        .concat(clanek(8, 'Odstoupení od smlouvy (objednatel – spotřebitel)', [
          'Je-li objednatel spotřebitelem a smlouva se uzavírá distančně nebo mimo obchodní prostory, může od ní odstoupit bez udání důvodu do 14 dnů ode dne jejího uzavření (§ 1829 občanského zákoníku), například vzorovým formulářem v Příloze č. 2.',
          'Požádá-li objednatel o zahájení prací před uplynutím této lhůty, uhradí při odstoupení poměrnou část ceny za plnění poskytnuté do okamžiku odstoupení (§ 1834). Byla-li služba s jeho předchozím výslovným souhlasem zcela splněna před uplynutím lhůty a byl-li předem poučen, že tím právo na odstoupení ztrácí, nemůže od smlouvy odstoupit (§ 1837 písm. a).',
          '[   ] Žádám o zahájení prací před uplynutím lhůty pro odstoupení a beru na vědomí, že při odstoupení uhradím poměrnou část ceny a že po úplném provedení díla právo na odstoupení ztrácím.'
        ]))
        .concat(clanek(9, 'Mimosoudní řešení sporů a osobní údaje', [
          'K mimosoudnímu řešení spotřebitelských sporů je příslušná Česká obchodní inspekce (www.coi.cz, informace o řízení: www.coi.cz/informace-o-adr/).',
          'Osobní údaje zpracovává zhotovitel podle zásad ochrany osobních údajů zveřejněných na ' + f.web + '.'
        ]))
        .concat(clanek(10, 'Závěrečná ustanovení', [
          'Smlouva vzniká podpisem konečného znění oběma smluvními stranami. Stejnopis podepsané smlouvy obdrží objednatel v listinné podobě nebo e-mailem jako soubor PDF (trvalý nosič dat). Změny a doplňky vyžadují písemnou formu.',
          'Smlouva se řídí právním řádem České republiky, zejména zákonem č. 89/2012 Sb., občanský zákoník.',
          'Přílohy: č. 1 Rozpis ceny, č. 2 Vzorový formulář pro odstoupení od smlouvy.'
        ]))
        .concat([
          { text: T('Tento návrh se nepodepisuje. Podpisy obou stran se připojí až ke konečnému znění smlouvy po ověření rozsahu díla na místě.'), fontSize: 9, italics: true, color: BARVY.tmava, margin: [0, 14, 0, 0] },
          { text: 'Příloha č. 1 – Rozpis ceny', style: 'titul', pageBreak: 'before', margin: [0, 0, 0, 4] },
          { text: typObjektu(n, k) + T(' · kalkulace č. ' + k.cislo), fontSize: 9, margin: [0, 0, 0, 8] },
          tabulkaCeny(n),
          n.biocidy ? { text: T(n.biocidy), style: 'male', margin: [0, 8, 0, 0] } : null,
          { text: 'Příloha č. 2 – Vzorový formulář pro odstoupení od smlouvy', style: 'titul', margin: [0, 26, 0, 4] },
          { text: '(vyplňte tento formulář a pošlete jej zpět pouze v případě, že chcete od smlouvy odstoupit)', style: 'male', margin: [0, 0, 0, 8] },
          {
            stack: [
              T('Adresát: ' + f.jmeno + ', ' + f.sidlo + ', e-mail: ' + f.email),
              T('Oznamuji, že tímto odstupuji od smlouvy o poskytnutí těchto služeb: ' + CARY),
              'Datum uzavření smlouvy: ' + CARY,
              'Jméno a příjmení spotřebitele: ' + CARY,
              'Adresa spotřebitele: ' + CARY,
              'Podpis spotřebitele (pouze pokud je tento formulář zasílán v listinné podobě): ' + CARY,
              'Datum: ' + CARY
            ], fontSize: 9, lineHeight: 1.7
          }
        ]).filter(Boolean),
      styles: STYLY, defaultStyle: { font: 'Roboto', fontSize: 9.5, color: BARVY.text, lineHeight: 1.22 }
    };
  }

  // --- prohlížeč: líné načtení pdfmake a stažení ------------------------------------------------------
  var nacitani = null;
  function skript(src) {
    return new Promise(function (ok, chyba) {
      var d = koren.document, s = d.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { ok(); }; s.onerror = function () { chyba(new Error('Nelze načíst ' + src)); };
      d.head.appendChild(s);
    });
  }
  function nactiPdfmake() {
    if (koren.pdfMake && koren.pdfMake.createPdf && nacitani) return nacitani;
    if (!nacitani) {
      nacitani = (koren.pdfMake && koren.pdfMake.createPdf ? Promise.resolve() : skript(PDFMAKE))
        .then(function () { return skript(PISMA); })
        .then(function () { if (!koren.pdfMake || !koren.pdfMake.createPdf) throw new Error('pdfmake'); return koren.pdfMake; })
        .catch(function (e) { nacitani = null; throw e; });
    }
    return nacitani;
  }
  function bezDiakritiky(t) { return String(t).normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function stahni(definice, soubor) {
    return nactiPdfmake().then(function (pdf) { return pdf.createPdf(definice).download(bezDiakritiky(soubor)); });
  }

  return {
    verze: '1.0.0',
    definiceKalkulace: definiceKalkulace,
    definiceSmlouvy: definiceSmlouvy,
    kalkulace: function (n, k) { return stahni(definiceKalkulace(n, k), 'HSPG-kalkulace-' + k.cislo + '.pdf'); },
    navrhSmlouvy: function (n, k) { return stahni(definiceSmlouvy(n, k), 'HSPG-NAVRH-smlouvy-o-dilo-' + k.cislo + '.pdf'); },
    typografie: T
  };
});
