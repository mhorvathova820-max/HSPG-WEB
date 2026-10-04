/* AI klient pro majitele – sdílí ho plovoucí panel (hbot-majitel.js) i velké AI centrum (/ai-centrum/).
   Mluví jen s vlastními endpointy webu (/api/ai, /api/ai-stav); klíče AI zůstávají v Netlify. */
(function (g) {
  'use strict';

  var ULOHY = {
    volny: { nazev: 'Volný dotaz', pokyn: '' },
    stranka: { nazev: 'Zkontroluj tuto stránku',
      pokyn: 'Zkontroluj text stránky webu hspg.cz. Vypiš číslovaně: 1) tvrzení, která nejsou doložená nebo mohou být klamavá (ČOI), 2) překlepy a gramatiku, 3) nejasná nebo matoucí místa pro majitele domu, 4) chybějící informace, které zákazník potřebuje k poptávce. U každého bodu cituj původní text a navrhni opravu. Nic nevymýšlej.' },
    poptavka: { nazev: 'Odpověď na poptávku',
      pokyn: 'Napiš e-mailovou odpověď zákazníkovi na poptávku. Poděkuj, shrň, co poptává, navrhni další krok (zaměření z mapy, fotky, termín) a uveď, jaké údaje ještě potřebujeme (plocha, materiál, fotky). Ceny a termíny jen ze zadání, jinak [DOPLNIT].' },
    facebook: { nazev: 'Příspěvek na Facebook',
      pokyn: 'Napiš příspěvek na Facebook HSPG (max. 120 slov, 1–3 emoji, výzva k akci s odkazem hspg.cz). Pouze fakta ze zadání. Konkrétní zakázku zmiň jen, pokud je v zadání i se souhlasem majitele domu.' },
    nabidka: { nazev: 'Text nabídky',
      pokyn: 'Připrav text cenové nabídky: rozsah prací, postup, přípravky, co je v ceně a co ne, platnost nabídky. Čísla jen ze zadání, jinak [DOPLNIT].' },
    recenze: { nazev: 'Odpověď na recenzi',
      pokyn: 'Napiš veřejnou odpověď na recenzi zákazníka. Krátce, lidsky, bez výmluv. U negativní recenze nabídni řešení a kontakt.' },
    preklad: { nazev: 'Překlad do angličtiny',
      pokyn: 'Přelož text ze zadání do přirozené angličtiny. Zachovej význam, nic nepřidávej. Odbornou terminologii (čištění, impregnace, střecha, fasáda) přelož správně.' }
  };
  var BARVY = { claude: '#e08a4f', gpt: '#2dbfa8', gemini: '#6aa0f5', grok: '#c9ced6' };
  var ODDELOVAC = '\n\u0000STAT';
  var CHYBA = '\n\u0000CHYBA';

  function hlavicky(token, extra) {
    var h = { authorization: 'Bearer ' + token };
    for (var k in extra || {}) h[k] = extra[k];
    return h;
  }

  function chyba(r, d) {
    var e = new Error((d && d.chyba) || ('HTTP ' + r.status));
    e.status = r.status;
    return e;
  }

  function nactiStav(token) {
    return fetch('/api/ai-stav', { headers: hlavicky(token), cache: 'no-store' }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw chyba(r, d); return d; });
    });
  }

  // Nouzový vypínač AI pro zákazníky (platí okamžitě, bez nasazení).
  function nastavVerejnouAI(token, zapnuto) {
    return fetch('/api/ai-stav', { method: 'POST', headers: hlavicky(token, { 'content-type': 'application/json' }), body: JSON.stringify({ verejnaAI: !!zapnuto }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw chyba(r, d); return d; }); });
  }

  // Jedno volání jedné AI; text chodí průběžně do naText(celyTextZatim).
  function zavolej(o) {
    return fetch('/api/ai', {
      method: 'POST', signal: o.signal,
      headers: hlavicky(o.token, { 'content-type': 'application/json' }),
      body: JSON.stringify({ ai: o.ai, zpravy: o.zpravy, pokyn: o.pokyn || '' })
    }).then(function (r) {
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (d) { throw chyba(r, d); });
      var ctecka = r.body.getReader(), dek = new TextDecoder(), vse = '';
      function dalsi() {
        return ctecka.read().then(function (x) {
          if (x.done) return;
          vse += dek.decode(x.value, { stream: true });
          if (o.naText) o.naText(vse.split(ODDELOVAC)[0].split(CHYBA)[0]);
          return dalsi();
        });
      }
      return dalsi().then(function () {
        // Chyba poskytovatele uprostřed streamu = výjimka, ne odpověď (spolupráce nesmí pokračovat nad chybou).
        var ch = vse.indexOf(CHYBA);
        if (ch !== -1) {
          var zprava = 'Chyba AI';
          try { zprava = JSON.parse(vse.slice(ch + CHYBA.length).split(ODDELOVAC)[0]).zprava; } catch (e) {}
          var err = new Error(zprava); err.castecne = vse.slice(0, ch); throw err;
        }
        var casti = vse.split(ODDELOVAC);
        var stat = { vstup: 0, vystup: 0, kc: 0 };
        casti.slice(1).forEach(function (s) {
          try { var j = JSON.parse(s); stat.vstup += j.vstup || 0; stat.vystup += j.vystup || 0; stat.kc += j.kc || 0; } catch (e) {}
        });
        return { text: casti[0].trim(), stat: stat };
      });
    });
  }

  // Doporučené obsazení: GPT píše, Claude kontroluje pravdivost, Gemini spojí. Chybějící AI nahradí dostupné.
  function obsazeni(zapnute) {
    var ids = zapnute.map(function (a) { return a.id; });
    // Každá role jinou AI, pokud jich je dost; opakuje se až ve chvíli, kdy zapnuté AI dojdou.
    var pouzite = [];
    function vyber(chci) {
      var id = ids.indexOf(chci) !== -1 && pouzite.indexOf(chci) === -1 ? chci
        : (ids.filter(function (x) { return pouzite.indexOf(x) === -1; })[0] || ids[pouzite.length % ids.length]);
      pouzite.push(id);
      return id;
    }
    return { autor: vyber('gpt'), kontrola: vyber('claude'), final: vyber('gemini') };
  }

  // Spolupráce: návrh → kontrola pravdivosti → finální verze. naKrok(index, nazev, aiId) vrací prvek pro text.
  function spolupracuj(o) {
    var kroky = {};
    function krok(i, nazev, ai, zpravy, pokyn) {
      var cil = o.naKrok(i, nazev, ai);
      return zavolej({ ai: ai, zpravy: zpravy, pokyn: pokyn, token: o.token, signal: o.signal, naText: function (t) { cil(t); } })
        .then(function (r) { return r.text; });
    }
    return krok(1, 'Návrh', o.autor, [{ role: 'user', text: o.dotaz }], o.pokyn)
      .then(function (t) {
        kroky.navrh = t;
        return krok(2, 'Kontrola pravdivosti', o.kontrola, [{ role: 'user', text:
          'ZADÁNÍ (jediný zdroj faktů):\n' + o.dotaz + '\n\nNÁVRH:\n' + t +
          '\n\nZkontroluj návrh proti zadání a pravidlům pravdivosti. Vypiš body: co je vymyšlené nebo nepodložené, co chybí, co přepsat. Nepiš novou verzi.' }],
          'Jsi přísný kontrolor pravdivosti a srozumitelnosti.');
      })
      .then(function (t) {
        kroky.kontrola = t;
        return krok(3, 'Finální verze', o.final, [{ role: 'user', text:
          'ZADÁNÍ:\n' + o.dotaz + '\n\nNÁVRH:\n' + kroky.navrh + '\n\nPŘIPOMÍNKY KONTROLY:\n' + t +
          '\n\nNapiš finální verzi, která zapracuje všechny oprávněné připomínky. Vrať jen hotový text.' }], o.pokyn);
      })
      .then(function (t) { kroky.final = t; return kroky; });
  }

  // Text aktuální stránky pro úlohu „Zkontroluj tuto stránku“ (bez panelu H-BOT a skriptů).
  function textStranky(max) {
    var kopie = document.body.cloneNode(true);
    ['#hbot', '#hbot-btn', '#hspg-lista', 'script', 'style', 'noscript', 'svg', 'template'].forEach(function (s) {
      var n = kopie.querySelectorAll(s);
      for (var i = 0; i < n.length; i++) n[i].remove();
    });
    var t = (kopie.innerText || kopie.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
    return 'Stránka: ' + document.title + '\nAdresa: ' + location.href + '\n\n' + t.slice(0, max || 30000);
  }

  g.HSPG_AI = { ULOHY: ULOHY, BARVY: BARVY, nactiStav: nactiStav, nastavVerejnouAI: nastavVerejnouAI, zavolej: zavolej, spolupracuj: spolupracuj, obsazeni: obsazeni, textStranky: textStranky };
})(window);
