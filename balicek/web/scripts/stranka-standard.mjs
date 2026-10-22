// Stránka /standard-holub/ (úkol 50, R15) – generuje ji scripts/build-hbot.mjs z content/standard.json,
// sentinel.json, ceny.json a cenik-potvrzeni.json, aby texty na webu nikdy neutekly od dat (--kontrola v CI).
// Hlavička a patička kopírují šablonu stránek balíčku (planovac/index.html); agent ve VS Code je při převzetí
// sjednotí se šablonou webu (úkol 08). Bez JavaScriptu funguje celá; H-BOT a „Cena hned“ přidá /assets/hbot.js.

const NBSP = " ";
export function typografie(text) {
  return String(text ?? "")
    .replace(/(^|[\s(„])([vkszaiouVKSZAIOU])\s+/g, `$1$2${NBSP}`)
    .replace(/(\d)\s+(\d{3})(?!\d)/g, `$1${NBSP}$2`)
    .replace(/(\d)\s+(Kč|m²|m|km|%|dnů|dny|let|roky|h|ks|l|°C|mm)(?![0-9A-Za-zÀ-ſ])/g, `$1${NBSP}$2`);
}
const esc = (t) => String(t ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// Text pro HTML: escapovat a nezlomitelné mezery zapsat jako &nbsp; (čitelné ve zdroji).
const t = (s) => esc(typografie(s)).replace(/ /g, "&nbsp;");
const kc = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " Kč";
const datum = (iso) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? `${Number(m[3])}. ${Number(m[2])}. ${m[1]}` : ""; };

const PISMA = `@font-face {font-family: 'Manrope';font-style: normal;font-weight: 400 800;font-display: swap;src: url('/assets/fonts/manrope-normal-latin-ext.woff2') format('woff2');unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;}@font-face {font-family: 'Manrope';font-style: normal;font-weight: 400 800;font-display: swap;src: url('/assets/fonts/manrope-normal-latin.woff2') format('woff2');unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;}@font-face {font-family: 'Playfair Display';font-style: normal;font-weight: 500 700;font-display: swap;src: url('/assets/fonts/playfair-display-normal-latin-ext.woff2') format('woff2');unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF;}@font-face {font-family: 'Playfair Display';font-style: normal;font-weight: 500 700;font-display: swap;src: url('/assets/fonts/playfair-display-normal-latin.woff2') format('woff2');unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;}`;

export function strankaStandard({ standard, sentinel, ceny, potvrzeni }) {
  const potvrzeno = !!(potvrzeni?.platnost_od && potvrzeni.platnost_od === ceny.platnost_od && potvrzeni.datum);
  const nazvy = { strecha: "střecha", fasada: "fasáda", dlazba: "dlažba" };
  const klic = { strecha: "roof", fasada: "facade", dlazba: "driveway" };
  const sazbyCesty = (id) => {
    const zdroj = id === "A" ? ceny.ochrana_hstone : ceny.renovace_color;
    return (standard.cesty[id].povrchy || []).filter((p) => zdroj?.[klic[p]]).map((p) => `${nazvy[p]} ${zdroj[klic[p]]} Kč/m²`).join(" · ");
  };
  const base = (sentinel.tarify || []).find((x) => x.povinny_pro_zaruku);
  const kroky = standard.kroky.map((k) => `
        <li class="sh-krok">
          <span class="sh-krok-cislo" aria-hidden="true">${esc(k.cislo)}</span>
          <h3>${t(k.nazev)}</h3>
          <p>${t(k.popis)}.</p>
        </li>`).join("");
  const cesta = (id) => {
    const c = standard.cesty[id];
    const sazby = potvrzeno ? sazbyCesty(id) : "";
    return `
        <article class="sh-cesta apex-sklo">
          <p class="apex-stitek">Cesta ${esc(id)}</p>
          <h3>${t(c.nazev)}${id === "A" ? " H-STONE" : ""}</h3>
          <p>${t(c.popis)}</p>
          <p class="sh-povrchy">${t("Pro: " + c.povrchy.map((p) => nazvy[p]).join(", "))}</p>
          ${sazby ? `<p class="sh-sazby">${t(sazby)}</p>` : `<p class="sh-sazby">${t("Cenu potvrdíme individuálně.")}</p>`}
          ${id === "A" && base ? `<p class="sh-zaruka">${t(`Záruka 10 let při péči ${base.nazev} (${kc(base.cena_rok)} ročně).`)}</p>` : ""}
        </article>`;
  };
  const paleta = (p) => (standard.barvy_renovace?.[p] || []).map((b) => `<li><span class="sh-vzorek" style="--vzorek:${esc(b.hex)}" aria-hidden="true"></span>${t(b.ral)}<small>${t(b.nazev)}</small></li>`).join("");
  const tarify = (sentinel.tarify || []).map((x) => `
        <article class="sh-tarif apex-sklo${x.povinny_pro_zaruku ? " sh-tarif--zaklad" : ""}">
          <h3>${t(x.nazev)}</h3>
          <p class="sh-tarif-cena">${t(kc(x.cena_rok) + " ročně")}</p>
          ${x.povinny_pro_zaruku ? `<p class="sh-tarif-stitek">${t("podmínka záruky")}</p>` : ""}
          <ul>${(x.body || []).map((b) => `<li>${t(b)}</li>`).join("")}</ul>
        </article>`).join("");
  const howto = {
    "@context": "https://schema.org", "@type": "HowTo", name: "Standard HOLUB – čištění a ochrana povrchů staveb",
    step: standard.kroky.map((k, i) => ({ "@type": "HowToStep", position: i + 1, name: `${k.cislo} ${k.nazev}`, text: k.popis })),
  };
  const drobky = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Úvod", item: "https://hspg.cz/" }, { "@type": "ListItem", position: 2, name: "Standard HOLUB", item: "https://hspg.cz/standard-holub/" }] };
  const popis = "Pět kroků, které u nás nikdy nevynecháme: čištění, odmaštění, ošetření biocidy, oplach a ochranná vrstva – neviditelný štít H-STONE, nebo barevná renovace v odstínu podle vašeho výběru.";

  return `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!-- Vygenerováno scripts/build-hbot.mjs z content/*.json – needitovat ručně (úkol 50). -->
<title>Standard HOLUB – pět kroků čištění a ochrany povrchů | HOLUB HSPG</title>
<meta name="description" content="${t(popis)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="https://hspg.cz/standard-holub/">
<meta name="theme-color" content="#05070F">
<meta property="og:type" content="website">
<meta property="og:locale" content="cs_CZ">
<meta property="og:site_name" content="HOLUB Surface Protection Group">
<meta property="og:url" content="https://hspg.cz/standard-holub/">
<meta property="og:title" content="Standard HOLUB – pět kroků čištění a ochrany povrchů">
<meta property="og:description" content="${t(popis)}">
<meta property="og:image" content="https://hspg.cz/assets/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="HOLUB Surface Protection Group — čištění a ochrana povrchů">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" sizes="48x48" href="/assets/favicon-48.png">
<link rel="icon" type="image/png" sizes="192x192" href="/assets/favicon-192.png">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/apple-touch-icon.png">
<style>${PISMA}</style>
<link rel="stylesheet" href="/assets/brand.css">
<link rel="stylesheet" href="/assets/apex-tokens.css">
<link rel="stylesheet" href="/assets/standard-holub.css">
<link rel="manifest" href="/manifest.webmanifest">
<script type="application/ld+json">${JSON.stringify(drobky)}</script>
<script type="application/ld+json">${JSON.stringify(howto)}</script>
</head>
<body class="on-navy sh-stranka">

<a class="skip" href="#obsah">Přeskočit na obsah</a>
<header class="hdr">
  <div class="wrap bar">
    <a class="brand" href="/">
      <img class="brand-logo" src="/assets/v/logo-160.webp" srcset="/assets/v/logo-160.webp 1x, /assets/v/logo-320.webp 2x" width="48" height="48" alt="Logo HOLUB Surface Protection Group">
      <span><b>HOLUB</b><span>Surface Protection Group</span></span>
    </a>
    <a class="btn btn-ghost" href="tel:+420736618486">📞 736 618 486</a>
  </div>
</header>

<main class="sh" id="obsah">
  <section class="sh-uvod sh-obal">
    <p class="apex-stitek">${t(`Postup HSPG · verze ${standard.verze} · účinnost od ${datum(standard.ucinnost)}`)}</p>
    <h1 class="sh-nadpis"><span class="apex-zlaty-text">Standard HOLUB</span></h1>
    <p class="sh-perex">${t("Pět kroků, které u nás nikdy nevynecháme – na střeše, fasádě i dlažbě. Pak si zvolíte ochranu: neviditelný štít H-STONE, nebo barevnou renovaci v odstínu podle vašeho výběru.")}</p>
    <p class="sh-akce">
      <a class="apex-tlacitko" href="/akce/" data-hbot-cena>Spočítat cenu hned</a>
      <a class="apex-tlacitko apex-tlacitko--duch" href="/planovac/">Vybrat termín</a>
    </p>
  </section>
  <hr class="apex-linka sh-linka">

  <section class="sh-sekce sh-obal" aria-labelledby="sh-postup">
    <h2 id="sh-postup">${t("Postup: vždy celý")}</h2>
    <ol class="sh-kroky">${kroky}
    </ol>
    <p class="sh-pozn">${t("U samotného čištění končíme krokem 04 – bez ochranné vrstvy. " + (standard.biocidy_veta || ""))}</p>
  </section>

  <section class="sh-sekce sh-obal" aria-labelledby="sh-cesty">
    <h2 id="sh-cesty">${t("Krok 05: dvě cesty ochrany")}</h2>
    <div class="sh-cesty">${cesta("A")}${cesta("B")}
    </div>
    ${potvrzeno ? `<p class="sh-pozn">${t(`Ceny podle ceníku platného od ${datum(ceny.platnost_od)}. Nejsme plátci DPH, DPH se nepřipočítává. Orientační cenu spočítáte hned v H-BOTovi, přesnou potvrdíme po ověření rozsahu na místě.`)}</p>` : ""}
  </section>

  <section class="sh-sekce sh-obal" aria-labelledby="sh-odstiny">
    <h2 id="sh-odstiny">${t("Odstíny pro barevnou renovaci")}</h2>
    <div class="sh-palety">
      <div><h3>Střecha</h3><ul class="sh-paleta">${paleta("strecha")}</ul></div>
      <div><h3>Fasáda</h3><ul class="sh-paleta">${paleta("fasada")}</ul></div>
    </div>
    <p class="sh-pozn">${t("Barvy na obrazovce jsou orientační – přesný odstín potvrdí vzorník při zaměření. Můžete zvolit i vlastní odstín RAL nebo NCS.")}</p>
  </section>

  <section class="sh-sekce sh-obal" aria-labelledby="sh-sentinel">
    <h2 id="sh-sentinel">${t("Péče SENTINEL a záruka")}</h2>
    <p class="sh-perex sh-perex--maly">${t(sentinel.podminka_zaruky || "")} ${t("Zákonná práva z vadného plnění tím nejsou dotčena.")}</p>
    <div class="sh-tarify">${tarify}
    </div>
    ${sentinel.puvodni_podminka ? `<p class="sh-pozn">${t(sentinel.puvodni_podminka)}</p>` : ""}
  </section>

  <section class="sh-sekce sh-zaver sh-obal">
    <h2>${t("Spočítejte si cenu hned")}</h2>
    <p class="sh-perex sh-perex--maly">${t("Bez zadání kontaktu – orientační cena z ceníku a z ploch, které zadáte. PDF kalkulaci i nezávazný NÁVRH smlouvy si stáhnete jedním kliknutím.")}</p>
    <p class="sh-akce">
      <a class="apex-tlacitko" href="/akce/" data-hbot-cena>Spočítat cenu hned</a>
      <a class="apex-tlacitko apex-tlacitko--duch" href="tel:+420736618486">Zavolat +420 736 618 486</a>
    </p>
  </section>
</main>

<footer>
  <div class="wrap">
    <p class="claim">Věci stárnou. My zůstáváme.</p>
    <p class="fbot">HOLUB Surface Protection Group · Dušan Holub, IČO 09291881, neplátce DPH · Pernerova 10/32, 186 00 Praha 8 – Karlín ·
      <a href="tel:+420736618486">736 618 486</a> · <a href="#" data-mail="zc.gpsh@ofni">Napsat e-mail</a> ·
      <a href="/">hspg.cz</a> · <a href="/ochrana-osobnich-udaju">Ochrana osobních údajů</a> · <a data-souhlas-nastaveni href="/ochrana-osobnich-udaju#cookies">Nastavení cookies</a></p>
  </div>
</footer>
<script src="/assets/kontakt.js" defer></script>
<script src="/assets/souhlas.js" defer></script>
<script src="/assets/hbot.js" defer></script>
</body>
</html>
`;
}
