'use strict';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function buildContractHtml({ estimate, customerName }) {
  const amount = new Intl.NumberFormat('cs-CZ').format(estimate.pricing.totalPrice);
  const deposit = new Intl.NumberFormat('cs-CZ').format(estimate.pricing.deposit);
  return `<!doctype html>
<html lang="cs"><head><meta charset="utf-8"><title>Nezávazný návrh smlouvy — HOLUB 360</title>
<style>body{font:16px/1.5 Arial,sans-serif;max-width:800px;margin:3rem auto;padding:0 1rem;color:#222}h1{color:#806522}.notice{padding:1rem;background:#fff4d6;border:1px solid #d4af37}</style></head>
<body><h1>Návrh smlouvy o dílo</h1>
<p class="notice">Nezávazný pracovní návrh. Před podpisem je nutné ověřit údaje, rozsah díla, cenu i právní podmínky; tento dokument není právním stanoviskem ani podepsanou smlouvou.</p>
<h2>Smluvní strany</h2><p>Objednatel: ${escapeHtml(customerName)}</p>
<h2>Místo a rozsah</h2><p>Adresa: ${escapeHtml(estimate.address)}</p>
<p>Orientační modelová plocha fasády: ${estimate.area.facadeNetM2} m²; střechy: ${estimate.area.roofNetM2} m². Plochy nebyly zaměřeny a musí být ověřeny před uzavřením smlouvy.</p>
<h2>Cena a úhrada</h2><p>Modelová cena: ${amount} Kč. Uvedená cena a daňový režim podléhají potvrzení zhotovitelem.</p>
<p>Modelová záloha: ${deposit} Kč. Splatnost případného doplatku a okamžik předání musí být sjednány smluvními stranami.</p>
<h2>Záruka</h2><p>Záruka na impregnaci H-STONE není v tomto návrhu potvrzena; její rozsah a dobu je nutné doložit závaznými podmínkami výrobce a zhotovitele.</p>
<h2>Podpis</h2><p>Tento soubor není elektronicky podepsán. Napojení na poskytovatele e-podpisu ani BankID není nakonfigurováno.</p>
</body></html>`;
}

module.exports = { buildContractHtml };
