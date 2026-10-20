'use strict';

const PDFDocument = require('pdfkit');

function formatCzk(value) {
  return `${new Intl.NumberFormat('cs-CZ').format(value)} Kč`;
}

function renderEstimatePdf(estimate) {
  if (
    !estimate || typeof estimate.address !== 'string' ||
    !Number.isFinite(estimate?.pricing?.totalPrice) ||
    !Number.isFinite(estimate?.area?.facadeNetM2) ||
    !Number.isFinite(estimate?.area?.roofNetM2)
  ) {
    throw new TypeError('K vytvoření PDF je nutná platná orientační kalkulace.');
  }

  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: 'A4', margins: { top: 54, bottom: 54, left: 56, right: 56 } });
    const chunks = [];
    document.on('data', (chunk) => chunks.push(chunk));
    document.on('error', reject);
    document.on('end', () => resolve(Buffer.concat(chunks)));

    document.rect(0, 0, 595.28, 842).fill('#24211b');
    document.circle(297.64, 285, 72).lineWidth(3).strokeColor('#d4af37').stroke();
    document.circle(297.64, 285, 60).lineWidth(1).strokeColor('#d4af37').stroke();
    document.fillColor('#d4af37').font('Helvetica-Bold').fontSize(28).text('HOLUB', 0, 265, { align: 'center' });
    document.fillColor('#f5f1e7').font('Helvetica').fontSize(16).text('ORIENTAČNÍ NABÍDKA', 0, 410, { align: 'center' });
    document.fontSize(11).text('Modelový výpočet — nikoli zaměření ani závazná nabídka', 50, 445, {
      align: 'center',
      width: 495,
    });
    document.fontSize(9).text('Návrh k projednání; žádná smlouva není tímto dokumentem uzavřena.', 50, 477, {
      align: 'center',
      width: 495,
    });

    document.addPage();
    document.fillColor('#806522').font('Helvetica-Bold').fontSize(20).text('Orientační kalkulace', { continued: false });
    document.moveDown(0.5);
    document.fillColor('#222').font('Helvetica').fontSize(10)
      .text(`Adresa: ${estimate.address}`)
      .text('Způsob stanovení: pevné ilustrační předpoklady; žádné satelitní ani jiné dálkové měření nebylo provedeno.')
      .moveDown();

    document.font('Helvetica-Bold').text('Modelové výměry a cenové položky');
    document.font('Helvetica').moveDown(0.3)
      .text(`Fasáda: ${estimate.area.facadeNetM2} m² × ${formatCzk(estimate.pricing.facadeRatePerM2)} = ${formatCzk(estimate.pricing.facadePrice)}`)
      .text(`Odečet oken v modelu: ${estimate.area.windowsDeductedM2} m²`)
      .text(`Střecha: ${estimate.area.roofNetM2} m² × ${formatCzk(estimate.pricing.roofRatePerM2)} = ${formatCzk(estimate.pricing.roofPrice)}`)
      .text(`Modelový odečet komínů: ${estimate.area.chimneysDeductedM2} m²; FVE: ${estimate.area.solarPanelsDeductedM2} m²`)
      .moveDown();

    document.font('Helvetica-Bold').fontSize(14).fillColor('#222')
      .text(`Celkem v modelu: ${formatCzk(estimate.pricing.totalPrice)}`);
    document.font('Helvetica').fontSize(10).moveDown(0.4)
      .text(`Modelová záloha: ${formatCzk(estimate.pricing.deposit)}. Daňový režim, ceník, rozsah i cenu musí potvrdit provozovatel.`)
      .text(`Rozdělení na tři stejné části je pouze matematická ilustrace (${estimate.pricing.threeInstallmentsIllustration.map(formatCzk).join(' / ')}); nejde o nabídku úvěru ani schválení Skip Pay/ČSOB.`)
      .moveDown();

    document.font('Helvetica-Bold').text('Rizika a rozhodnutí SVJ');
    document.font('Helvetica').moveDown(0.3)
      .text('Čištění vysokým tlakem může poškodit povrch nebo zatlačit vodu do konstrukce; vhodnost konkrétní technologie musí posoudit odborník na místě.')
      .text('Srovnání s chemií HSPG, životnost, účinnost i přínosy vyžadují doloženou produktovou dokumentaci a podmínky aplikace. Tento model netvrdí měřené výsledky.')
      .text('Odhad „nárůstu biologických nečistot o 42 % za 12 měsíců“ není doložen daty a nelze jej považovat za předpověď; finanční cenu odkladu proto PDF nevyčísluje.')
      .moveDown();

    document.font('Helvetica-Bold').text('Pracovní návrh smlouvy o dílo');
    document.font('Helvetica').moveDown(0.3)
      .text('Tento oddíl je pouze osnovou k právnímu dopracování. Nejde o úplné znění smlouvy ani o právní radu.')
      .text(`Místo plnění: ${estimate.address}. Předmět, skutečné výměry, technologický postup, cena, termín, předání, vady, záruka a odpovědnost musí být doplněny a oboustranně odsouhlaseny.`)
      .text('Záloha, splatnost po předání, případná záruka i spotřebitelská práva se řídí až individuální písemnou dohodou a ověřenými obchodními podmínkami.')
      .text('Podpisy: objednatel ____________________   zhotovitel ____________________');

    document.end();
  });
}

module.exports = { renderEstimatePdf };
