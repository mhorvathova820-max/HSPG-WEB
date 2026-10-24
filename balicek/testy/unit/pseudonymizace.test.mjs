// Pseudonymizace (rozhodnutí majitele 22. 10. 2026, GDPR): osobní údaje → značky [TYP_N] před odesláním AI,
// ceny, plochy, data a značky produktů zůstávají; zpětné doplnění jen pro panel majitele; veřejný H-BOT
// dostává obecné štítky. Jediná implementace: web/netlify/lib/ai/pseudonymizace.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { vytvorPseudonymizaci, anonymizuj, najdiOsobniUdaje, vytvorDoplnovac, znackyNaStitky, mozneOsobniUdaje } from "../../web/netlify/lib/ai/pseudonymizace.mjs";
import { maskujKontakty } from "../../web/netlify/functions/asistent.mjs";

const ps = (t) => vytvorPseudonymizaci().pseudonymizuj(t);

test("e-mail a telefony CZ/SK/mezinárodní → značky; stejný údaj má všude stejnou značku", () => {
  const p = vytvorPseudonymizaci();
  const t = p.pseudonymizuj("Volejte 777 123 456 nebo +420 777 123 456, SK 0905 123 456, UK +44 20 7946 0958, mail Jan.Novak@seznam.cz i jan.novak@seznam.cz");
  assert.equal(t, "Volejte [TELEFON_1] nebo [TELEFON_1], SK [TELEFON_2], UK [TELEFON_3], mail [EMAIL_1] i [EMAIL_1]");
  assert.deepEqual(p.souhrn(), { nahrazeno: 4, typy: { TELEFON: 3, EMAIL: 1 } });
  assert.equal(ps("tel. (+420) 777-123-456, 00420 603 111 222, 777 98 76 54, 736618486, znovu 777 12 34 56"), "tel. [TELEFON_1], [TELEFON_2], [TELEFON_3], [TELEFON_4], znovu [TELEFON_1]");
});

test("ceny, plochy, data, lhůty, IČO a názvy produktů se NEmaskují", () => {
  for (const t of [
    "Cena 1 490 Kč, plocha 120 m², střecha 190 m2, fasáda 340 m², celkem 86 390 Kč a 250 040 Kč",
    "Velká zakázka 123 456 789 Kč, 1 490 000 Kč, sleva 5 %, záruka 10 let, do 30 dnů, 2× nástřik",
    "Termín 22. 10. 2026 v 8:00, kontrola 1.10.2026 – 31.12.2026, 2026-10-22 08:30, do 30. 11. 2026",
    "SENTINEL BASE 499 Kč, PLUS 2490, PRESTIGE 5890; HOLUB 360; Standard HOLUB 5 kroků; RAL 7016; kód odstínu RAL 7016",
    "IČO 09291881, DIČ CZ09291881, č. j. 123/2026, smlouva 15/2026, Praha 8, V Praze 8, Krok 3",
    "Další 3 body, Ostatní 4 kroky, Celková 120, Ochranná vrstva 2×, 01 Čištění, Jan Novák volal",
    "plocha 120 m2, rok 2019",
  ]) assert.equal(ps(t), t, t);
});

test("rodné číslo, účet, IBAN, číslo karty a datum narození", () => {
  assert.equal(ps("r. č. 780123/4567 a 0001010009"), "r. č. [RODNE_CISLO_1] a [RODNE_CISLO_2]");
  assert.equal(ps("Účet 19-2000145399/0800, IBAN CZ65 0800 0000 1920 0014 5399, DE89 3704 0044 0532 0130 00"), "Účet [UCET_1], IBAN [IBAN_1], [IBAN_2]");
  assert.equal(ps("číslo účtu 123456/9999"), "číslo účtu [UCET_1]", "neznámý kód banky, ale v kontextu účtu");
  assert.equal(ps("Karta 4111 1111 1111 1111, náhodné 1234 5678 9012 3456"), "Karta [KARTA_1], náhodné 1234 5678 9012 3456");
  assert.equal(ps("nar. 12. 3. 1980, datum narození: 1980-03-12, * 5. května 1975, narozena 1. 1. 1990"),
    "nar. [DATUM_NAROZENI_1], datum narození: [DATUM_NAROZENI_2], * [DATUM_NAROZENI_3], narozena [DATUM_NAROZENI_4]");
});

test("adresy: ulice + číslo, číslo popisné/orientační, PSČ; obec a město zůstávají", () => {
  assert.equal(ps("Bydlím Lipová 12, 280 02 Kolín."), "Bydlím [ADRESA_1], [PSC_1] Kolín.");
  assert.equal(ps("Adresa: Na Příkopě 12/3, Praha. Vinohradská 1234/56. 28. října 15, Brno."), "Adresa: [ADRESA_1], Praha. [ADRESA_2]. [ADRESA_3], Brno.");
  assert.equal(ps("Masarykova 5 je náš dům, Palackého 10, Karlovo náměstí 13, U Dvora 5a, č. p. 123, PSČ 130 00"),
    "[ADRESA_1] je náš dům, [ADRESA_2], [ADRESA_3], [ADRESA_4], č. p. [ADRESA_5], PSČ [PSC_1]");
  assert.equal(ps("bydlí v Kolíně 5 let"), "bydlí v Kolíně 5 let", "číslo s jednotkou není číslo domu");
});

test("SPZ, kód pasu domu HS-RRRR-ČČČČ a přístupové kódy", () => {
  assert.equal(ps("SPZ 1AB 2345, 5S1 2345, BA-123AB, ABC 12-34"), "SPZ [SPZ_1], [SPZ_2], [SPZ_3], [SPZ_4]");
  assert.equal(ps("Pas domu HS-2026-0042 a hs-2025-A1B2"), "Pas domu [KOD_PASU_1] a [KOD_PASU_2]");
  assert.equal(
    ps("přístupový kód: 4821, PIN 1234, kód k bráně 1234#, heslo je Holub2026, heslo: tajne, OTP 123456, heslo pro wifi je Abc12345."),
    "přístupový kód: [PRISTUPOVY_KOD_1], PIN [PRISTUPOVY_KOD_2], kód k bráně [PRISTUPOVY_KOD_3], heslo je [PRISTUPOVY_KOD_4], heslo: [PRISTUPOVY_KOD_5], OTP [PRISTUPOVY_KOD_6], heslo pro wifi je [PRISTUPOVY_KOD_7].",
  );
});

test("jména po oslovení nebo titulu (oslovení i titul zůstanou); bez oslovení se jméno nepozná", () => {
  assert.equal(ps("Dobrý den, pan Novák volal. Paní Nováková-Svobodová z Kolína. Ing. Jan Novák, Ph.D., Mgr. Petra Svobodová."),
    "Dobrý den, pan [JMENO_1] volal. Paní [JMENO_2] z Kolína. Ing. [JMENO_3], Ph.D., Mgr. [JMENO_4].");
  assert.equal(ps("Vážený pane Nováku, kontaktní osoba p. Dvořák"), "Vážený pane [JMENO_1], kontaktní osoba p. [JMENO_2]");
  assert.equal(ps("pan Novák Lipová 12"), "pan [JMENO_1] [ADRESA_1]", "jméno nepohltí ulici");
  assert.equal(ps("pan Novák 12 let"), "pan [JMENO_1] 12 let");
  assert.equal(ps("panel 120 m² a pan majitel"), "panel 120 m² a pan majitel");
});

test("zpětné doplnění: přesně původní text; cizí značky beze změny; doslovná značka uživatele se nepřepíše", () => {
  const p = vytvorPseudonymizaci();
  const puvodni = "Ing. Jan Novák, Lipová 12, 280 02 Kolín, tel. 777 123 456, jan.novak@seznam.cz, r. č. 780123/4567";
  const t = p.pseudonymizuj(puvodni);
  assert.ok(!/Novák|Lipová|777|seznam|780123/.test(t), t);
  assert.equal(p.doplnZpet(t), puvodni);
  assert.equal(p.doplnZpet("Neznámá [EMAIL_9] a [NECO_1]"), "Neznámá [EMAIL_9] a [NECO_1]");
  const q = vytvorPseudonymizaci();
  const [a, b] = q.pseudonymizujVse(["Šablona: napiš na [EMAIL_1]", "skutečný e-mail jan@x.cz"]);
  assert.equal(a, "Šablona: napiš na [EMAIL_1]");
  assert.equal(b, "skutečný e-mail [EMAIL_2]", "doslovná značka [EMAIL_1] se nepoužije znovu");
  assert.equal(q.doplnZpet(a + " | " + b), "Šablona: napiš na [EMAIL_1] | skutečný e-mail jan@x.cz");
});

test("doplňování proudu: značka rozdělená mezi kousky se doplní; jiné hranaté závorky projdou", () => {
  const p = vytvorPseudonymizaci();
  assert.equal(p.pseudonymizuj("Napiš panu Novákovi na jan@x.cz"), "Napiš panu [JMENO_1] na [EMAIL_1]");
  const d = vytvorDoplnovac(p);
  let out = "";
  for (const kus of ["Vážený pane [JMENO", "_1], píšu na [EM", "AIL_1] a [odkaz](x) a [", "nic"]) out += d.pridej(kus);
  out += d.dokonci();
  assert.equal(out, "Vážený pane Novákovi, píšu na jan@x.cz a [odkaz](x) a [nic");
});

test("veřejné texty: obecné štítky bez mapy; maskujKontakty H-BOTa používá stejnou implementaci", () => {
  assert.equal(anonymizuj("pan Novák, Lipová 12, 777 123 456, jan@x.cz, HS-2026-0042"), "pan [jméno], [adresa], [telefon], [e-mail], [kód pasu domu]");
  assert.equal(maskujKontakty("volejte 777 123 456 nebo +420777123456, mail jan.novak@seznam.cz"), "volejte [telefon] nebo [telefon], mail [e-mail]");
  assert.equal(maskujKontakty("Bydlím Lipová 12, mám střechu 120 m², kolik to stojí?"), "Bydlím [adresa], mám střechu 120 m², kolik to stojí?");
  assert.equal(znackyNaStitky("Ozveme se na [TELEFON_1], [NECO_2]"), "Ozveme se na [telefon], [NECO_2]");
});

test("nálezy bez překryvů, seřazené, s přesnými pozicemi; rozložené háčky (NFD) se poznají", () => {
  const t = "pan Novák, jan@x.cz, 777 123 456";
  const n = najdiOsobniUdaje(t);
  assert.deepEqual(n.map((x) => [x.typ, x.hodnota]), [["JMENO", "Novák"], ["EMAIL", "jan@x.cz"], ["TELEFON", "777 123 456"]]);
  for (const x of n) assert.equal(t.slice(x.start, x.end), x.hodnota);
  for (let i = 1; i < n.length; i++) assert.ok(n[i].start >= n[i - 1].end);
  assert.equal(ps("pan Novák"), "pan [JMENO_1]");
});

test("odolnost: patologické vstupy do 60 000 znaků doběhnou rychle (žádné katastrofické zpětné hledání)", () => {
  for (const vstup of ["1".repeat(60000), "a".repeat(60000), "Aá ".repeat(20000), "1 ".repeat(30000), "x@".repeat(30000), "Lipová ".repeat(8000), "pan ".repeat(15000)]) {
    const t0 = performance.now();
    vytvorPseudonymizaci().pseudonymizuj(vstup);
    assert.ok(performance.now() - t0 < 1500, `pomalé: ${vstup.slice(0, 6)}…`);
  }
});

test("model bez ZDR (Muse): jméno bez oslovení a adresy mimo běžný tvar se poznají jako podezření; obecné zadání projde", () => {
  for (const t of ["Napiš e-mail Martinu Kalousovi do firmy", "Josef Kratochvíl, Tř. Míru 7", "Bratří Čapků 1234", "Pernerova 10/32, Praha 8", "Bydlí v Lipové 12", "Jan Novák", "dům na náměstí u kostela"]) {
    assert.ok(mozneOsobniUdaje(t).length > 0, t);
  }
  for (const t of ["Navrhni 5 sloganů pro HOLUB 360 v tónu Apple/Porsche", "Odstín RAL 9001 na fasádu, krok 5 a Krok 3", "Claude Opus a Gemini Argon: shrň patenty na měděné pásy", "Ceník od 1. 10. 2026: střecha 178 Kč/m²", "Muse, napiš 3 varianty textu pro obálku s cenou."]) {
    assert.deepEqual(mozneOsobniUdaje(t), [], t);
  }
});
