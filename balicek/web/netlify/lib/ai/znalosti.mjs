// Schválené znalosti H-BOTa: jediný zdroj pro okamžité odpovědi (prohlížeč) i pro AI (server).
// Zdroje: content/hbot-faq.json, content/firma.json, content/ceny.json, content/sentinel.json.
import faqData from "../../../content/hbot-faq.json" with { type: "json" };
import firmaData from "../../../content/firma.json" with { type: "json" };
import cenyData from "../../../content/ceny.json" with { type: "json" };
import sentinelData from "../../../content/sentinel.json" with { type: "json" };

const kc = (n) => Number(n).toLocaleString("cs-CZ");

export function odpovedCena(C) {
  const o = C.ochrana_hstone;
  const c = C.cisteni_only;
  return `Cena vychází z plochy, materiálu a znečištění. Orientačně s ochranou H-STONE: fasáda od ${o.facade} Kč/m², střecha od ${o.roof} Kč/m², dlažba od ${o.driveway} Kč/m²; jen čištění: dlažba od ${c.driveway}, fasáda od ${c.facade}, střecha od ${c.roof} Kč/m². Konečné ceny — nejsme plátci DPH. Do ${kc(C.platby.hranice_zalohy)} Kč bez zálohy. Přesnou cenu spočítáme z mapy do 24 hodin od zadání adresy, zdarma a nezávazně.`;
}

// Doplní {{zaruka}} a {{zaruka_podminka}}; nepotvrzená záruka se nahradí neutrální větou.
export function doplnFirmu(text, firma) {
  const z = firma.zaruka || {};
  const veta = z.potvrzeno && z.veta ? z.veta : z.nahradni_veta || "";
  const podminka = z.potvrzeno && z.podminka ? z.podminka : "";
  return text.replace(/\{\{zaruka\}\}/g, veta).replace(/\{\{zaruka_podminka\}\}/g, podminka).replace(/\s{2,}/g, " ").trim();
}

// Data pro prohlížeč (assets/hbot-znalosti.json).
export function znalostiProProhlizec({ faq = faqData, firma = firmaData, ceny = cenyData } = {}) {
  return {
    vygenerovano_z: "content/hbot-faq.json, content/firma.json, content/ceny.json",
    firma: {
      telefon: firma.telefon,
      telefon_zobrazeni: firma.telefon_zobrazeni,
      pracovni_doba: firma.pracovni_doba,
    },
    rychle_otazky: faq.rychle_otazky,
    otazky: faq.otazky.map((e) => ({
      k: e.k,
      q: e.q,
      a: e.typ === "cena" ? odpovedCena(ceny) : doplnFirmu(e.a, firma),
      ...(e.link ? { link: e.link } : {}),
    })),
  };
}

// Text znalostí pro AI (systémový pokyn).
export function znalostiProAI({ faq = faqData, firma = firmaData, ceny = cenyData, sentinel = sentinelData } = {}) {
  const z = znalostiProProhlizec({ faq, firma, ceny });
  const tarify = (sentinel.tarify || [])
    .map((t) => `- ${t.nazev}: ${t.cena_rok ? `${kc(t.cena_rok)} Kč/rok (${kc(t.cena_mesic)} Kč/měsíc)` : "zdarma"} – ${t.popis}. ${t.body.join("; ")}.`)
    .join("\n");
  const sazby = (nazev, t) => Object.entries(t).map(([k, v]) => `${{ facade: "fasáda", roof: "střecha", driveway: "dlažba", solar: "fotovoltaika" }[k] || k} od ${v} Kč/m²`).join(", ");
  return `SCHVÁLENÉ ZNALOSTI HSPG (jediný zdroj faktů):
Firma: ${firma.znacka}, provozovatel ${firma.provozovatel} (${firma.pravni_forma}), IČO ${firma.ico}, ${firma.dph}. Telefon ${firma.telefon_zobrazeni}, pracovní doba ${firma.pracovni_doba} (tj. ${String(firma.pracovni_doba).replace(/:00/g, "")} h). Působnost: ${firma.pusobnost}. Web ${firma.web}.
Poptávka a přesná cena zdarma: formulář hspg.cz/akce/ (adresa → cena z mapy do 24 hodin), nebo zavolání zpět přes H-BOT.
Ceník (platný od ${ceny.platnost_od}, konečné ceny, neplátce DPH):
- Ochrana H-STONE (čištění + impregnace): ${sazby("ochrana", ceny.ochrana_hstone)}.
- Jen čištění: ${sazby("cisteni", ceny.cisteni_only)}.
- Renovace barvou: ${sazby("renovace", ceny.renovace_color)}.
- Minimální zakázka ${kc(ceny.minimum.zakazka)} Kč (samotná fotovoltaika ${kc(ceny.minimum.fve)} Kč). Doprava: prvních ${ceny.doprava.zdarma_km} km od základny (${ceny.doprava.zakladny.join(", ")}) zdarma, dál ${ceny.doprava.kc_za_km} Kč/km.
- Slevy se nesčítají, platí nejvyšší: více povrchů ${ceny.discounts.multi_surface * 100} %, SVJ od 1 000 m² ${ceny.discounts.svj_1000m * 100} %, od 2 500 m² ${ceny.discounts.svj_2500m * 100} %. Zakrývání oken u bytových domů +${ceny.addons.svj_window_masking} Kč/m² fasády. Silné znečištění +${ceny.addons.heavy_dirt_surcharge_min}–${ceny.addons.heavy_dirt_surcharge_max} Kč/m².
- Platby: do ${kc(ceny.platby.hranice_zalohy)} Kč bez zálohy, nad tuto částku záloha ${ceny.platby.zaloha_nad_hranici * 100} %; splatnost ${ceny.platby.splatnost_dni} dní (SVJ ${ceny.platby.splatnost_svj_dni} dní).
Záruka: ${firma.zaruka?.potvrzeno ? `${firma.zaruka.veta} ${firma.zaruka.podminka || ""}` : "délku záruky neuváděj; podmínky potvrdí tým v nabídce."}
Péče SENTINEL:
${tarify}
Časté otázky a schválené odpovědi:
${z.otazky.map((e) => `- ${e.q} → ${e.a}`).join("\n")}`;
}
