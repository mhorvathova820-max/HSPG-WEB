// Schválené znalosti H-BOTa: jediný zdroj pro okamžité odpovědi (prohlížeč) i pro AI (server).
// Zdroje: content/hbot-faq.json, content/firma.json, content/ceny.json, content/sentinel.json, content/standard.json,
// content/hbot-rozcestnik.json (rozcestník „Celý web na jednom místě“, úkol 56).
import faqData from "../../../content/hbot-faq.json" with { type: "json" };
import firmaData from "../../../content/firma.json" with { type: "json" };
import cenyData from "../../../content/ceny.json" with { type: "json" };
import sentinelData from "../../../content/sentinel.json" with { type: "json" };
import standardData from "../../../content/standard.json" with { type: "json" };
import rozcestnikData from "../../../content/hbot-rozcestnik.json" with { type: "json" };
import { rozcestnikProProhlizec } from "./rozcestnik.mjs";

const kc = (n) => Number(n).toLocaleString("cs-CZ");

export function odpovedCena(C) {
  const o = C.ochrana_hstone;
  const c = C.cisteni_only;
  return `Cena vychází z plochy, materiálu a znečištění. Orientačně s ochranou H-STONE: fasáda od ${o.facade} Kč/m², střecha od ${o.roof} Kč/m², dlažba od ${o.driveway} Kč/m²; jen čištění: dlažba od ${c.driveway}, fasáda od ${c.facade}, střecha od ${c.roof} Kč/m². Konečné ceny — nejsme plátci DPH. Do ${kc(C.platby.hranice_zalohy)} Kč bez zálohy. Orientační cenu spočítáte hned tady v H-BOTovi – tlačítko „Cena hned“. Přesnou cenu potvrdíme do 24 hodin od zadání adresy (zaměření na dálku HOLUB CORE QUANTUM SENSE), zdarma a nezávazně.`;
}

const malym = (t) => String(t || "").charAt(0).toLowerCase() + String(t || "").slice(1);
const bezTecky = (t) => String(t || "").replace(/[.\s]+$/, "");

// „Jaký je postup?“ – pětikrokový Standard HOLUB z content/standard.json (R15; značka biocidu se neuvádí).
export function odpovedPostup(standard) {
  const kroky = (standard.kroky || []).map((k) => `${k.cislo} ${k.nazev} – ${malym(bezTecky(k.popis))}.`).join(" ");
  const A = standard.cesty?.A, B = standard.cesty?.B;
  const cesty = A && B ? ` Cesta A – ${A.nazev}: ${bezTecky(A.popis)}. Cesta B – ${B.nazev}: ${bezTecky(B.popis)}.` : "";
  return `Vždy celý ${standard.nazev || "Standard HOLUB"}: ${kroky}${cesty} ${standard.biocidy_veta || ""}`.trim();
}

// „Jak funguje trvalá péče?“ – tarify SENTINEL a podmínka záruky z content/sentinel.json (R15).
export function odpovedSentinel(sentinel) {
  const tarify = (sentinel.tarify || []).map((t) => `${t.nazev} za ${kc(t.cena_rok)} Kč ročně – ${(t.body || []).map((b) => malym(b)).join(", ")}.`).join(" ");
  return `Péče SENTINEL: ${tarify} ${sentinel.podminka_zaruky || ""} ${sentinel.puvodni_podminka || ""}`.replace(/\s{2,}/g, " ").trim();
}

// Doplní {{zaruka}} a {{zaruka_podminka}}; nepotvrzená záruka se nahradí neutrální větou.
export function doplnFirmu(text, firma) {
  const z = firma.zaruka || {};
  const veta = z.potvrzeno && z.veta ? z.veta : z.nahradni_veta || "";
  const podminka = z.potvrzeno && z.podminka ? z.podminka : "";
  return text.replace(/\{\{zaruka\}\}/g, veta).replace(/\{\{zaruka_podminka\}\}/g, podminka).replace(/\s{2,}/g, " ").trim();
}

// Data pro prohlížeč (assets/hbot-znalosti.json).
export function znalostiProProhlizec({ faq = faqData, firma = firmaData, ceny = cenyData, sentinel = sentinelData, standard = standardData, rozcestnik = rozcestnikData } = {}) {
  return {
    vygenerovano_z: "content/hbot-faq.json, content/firma.json, content/ceny.json, content/sentinel.json, content/standard.json, content/hbot-rozcestnik.json",
    firma: {
      telefon: firma.telefon,
      telefon_zobrazeni: firma.telefon_zobrazeni,
      pracovni_doba: firma.pracovni_doba,
    },
    rychle_otazky: faq.rychle_otazky,
    otazky: faq.otazky.map((e) => ({
      k: e.k,
      q: e.q,
      a: e.typ === "cena" ? odpovedCena(ceny) : e.typ === "postup" ? odpovedPostup(standard) : e.typ === "sentinel" ? odpovedSentinel(sentinel) : doplnFirmu(e.a, firma),
      ...(e.link ? { link: e.link } : {}),
    })),
    // Rozcestník v uvítání H-BOTa (úkol 56) – zkontrolovaný; neplatný obsah zastaví build.
    rozcestnik: rozcestnikProProhlizec(rozcestnik, { firma }),
  };
}

// Text znalostí pro AI (systémový pokyn).
export function znalostiProAI({ faq = faqData, firma = firmaData, ceny = cenyData, sentinel = sentinelData, standard = standardData } = {}) {
  const z = znalostiProProhlizec({ faq, firma, ceny, sentinel, standard });
  const tarify = (sentinel.tarify || [])
    .map((t) => `- ${t.nazev}: ${t.cena_rok ? `${kc(t.cena_rok)} Kč/rok${t.cena_mesic ? ` (${kc(t.cena_mesic)} Kč/měsíc)` : ""}` : "zdarma"}${t.povinny_pro_zaruku ? " (podmínka trvání záruky)" : ""} – ${t.popis}. ${t.body.join("; ")}.`)
    .join("\n");
  const sazby = (nazev, t) => Object.entries(t).map(([k, v]) => `${{ facade: "fasáda", roof: "střecha", driveway: "dlažba", solar: "fotovoltaika" }[k] || k} od ${v} Kč/m²`).join(", ");
  return `SCHVÁLENÉ ZNALOSTI HSPG (jediný zdroj faktů):
Firma: ${firma.znacka}, provozovatel ${firma.provozovatel} (${firma.pravni_forma}), IČO ${firma.ico}, ${firma.dph}. Telefon ${firma.telefon_zobrazeni}, pracovní doba ${firma.pracovni_doba} (tj. ${String(firma.pracovni_doba).replace(/:00/g, "")} h). Působnost: ${firma.pusobnost}. Web ${firma.web}.
Poptávka a přesná cena zdarma: formulář hspg.cz/akce/ (adresa → cena do 24 hodin), nebo zavolání zpět přes H-BOT. Orientační cenu si zákazník spočítá hned v H-BOTovi tlačítkem „Cena hned“ (kalkulace z ceníku, ne AI) a stáhne si ji v PDF i s NÁVRHEM smlouvy o dílo (nezávazný).
Měření na dálku se jmenuje HOLUB CORE QUANTUM SENSE – neuváděj, z jakých podkladů měříme, a nic netvrď o kvantové technologii.
Ceník (platný od ${ceny.platnost_od}, konečné ceny, neplátce DPH):
- Ochrana H-STONE (čištění + impregnace): ${sazby("ochrana", ceny.ochrana_hstone)}.
- Jen čištění: ${sazby("cisteni", ceny.cisteni_only)}.
- Renovace barvou: ${sazby("renovace", ceny.renovace_color)}.
- Minimální zakázka ${kc(ceny.minimum.zakazka)} Kč (samotná fotovoltaika ${kc(ceny.minimum.fve)} Kč). Doprava: prvních ${ceny.doprava.zdarma_km} km od základny (${ceny.doprava.zakladny.join(", ")}) zdarma, dál ${ceny.doprava.kc_za_km} Kč/km.
- Slevy se nesčítají, platí nejvyšší: více povrchů ${ceny.discounts.multi_surface * 100} %, SVJ od 1 000 m² ${ceny.discounts.svj_1000m * 100} %, od 2 500 m² ${ceny.discounts.svj_2500m * 100} %. Zakrývání oken u bytových domů +${ceny.addons.svj_window_masking} Kč/m² fasády. Silné znečištění +${ceny.addons.heavy_dirt_surcharge_min}–${ceny.addons.heavy_dirt_surcharge_max} Kč/m².
- Platby: do ${kc(ceny.platby.hranice_zalohy)} Kč bez zálohy, nad tuto částku záloha ${ceny.platby.zaloha_nad_hranici * 100} %; splatnost ${ceny.platby.splatnost_dni} dní (SVJ ${ceny.platby.splatnost_svj_dni} dní).
Záruka: ${firma.zaruka?.potvrzeno ? `${firma.zaruka.veta} ${firma.zaruka.podminka || ""}${firma.zaruka.podminka_puvodni ? ` ${firma.zaruka.podminka_puvodni}` : ""}` : "délku záruky neuváděj; podmínky potvrdí tým v nabídce."}
${standard?.kroky ? `${standard.nazev} – postup vždy celý: ${standard.kroky.map((k) => `${k.cislo} ${k.popis}`).join(" → ")}. Finální vrstva: cesta A ${standard.cesty.A.nazev} (${standard.cesty.A.popis}) nebo cesta B ${standard.cesty.B.nazev} (${standard.cesty.B.popis}) – odstín RAL si zákazník vybere, přesný odstín potvrdí vzorník. Název značky biocidu neuváděj.` : ""}
Péče SENTINEL:
${tarify}
Časté otázky a schválené odpovědi:
${z.otazky.map((e) => `- ${e.q} → ${e.a}`).join("\n")}`;
}
