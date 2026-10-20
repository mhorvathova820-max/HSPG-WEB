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
  const printableAddress = estimate.address
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);

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
      .text(`Adresa: ${printableAddress}`)
      .text('Způsob stanovení: pevné ilustrační předpoklady; žádné satelitní ani jiné dálkové měření nebylo provedeno.')
      .moveDown();

    document.font('Helvetica-Bold').text('Modelové výměry a cenové položky');
    document.font('Helvetica').moveDown(0.3)
      .text(`Fasáda: ${estimate.area.facadeNetM2} m² × ${formatCzk(estimate.pricing.facadeRatePerM2)} = ${formatCzk(estimate.pricing.facadePrice)}`)
      .text(`Odečet oken v modelu: ${estimate.area.windowsDeductedM2} m²`)
      .text(`Střecha: ${estimate.area.roofNetM2} m² × ${formatCzk(estimate.pricing.roofRatePerM2)} = ${formatCzk(estimate.pricing.roofPrice)}`)
      .text(`Modelový odečet komínů: ${estimate.area.chimneysDeductedM2} m²; FVE: ${estimate.area.solarPanelsDeductedM2} m²`)
      .moveDown();

    document.font('Helvetica-Bold').text('Měděný hřebenový prvek CopperGuard');
    document.font('Helvetica').moveDown(0.3);
    if (estimate.copperGuard?.available) {
      document.text(
        `Ověřená délka hřebene: ${estimate.copperGuard.verifiedRidgeLengthM} m; orientační cena: ${formatCzk(estimate.copperGuard.priceCzk)} (základní balení do 4 m a další započaté metry dle cenové matice).`,
      ).text(estimate.copperGuard.description);
    } else {
      document.text('Délka hřebene nebyla ověřena; cenu měděného prvku proto nelze stanovit.');
    }
    document.text('Uvedený ceník je orientační a před objednávkou jej musí potvrdit provozovatel.').moveDown();

    if (estimate.housingCooperative?.eligible) {
      document.font('Helvetica-Bold').text('Cenový model pro bytový dům / SVJ');
      document.font('Helvetica').moveDown(0.3)
        .text(`Zakrývání oken: ${estimate.area.windowsDeductedM2} m² × ${formatCzk(estimate.pricing.windowCoverRatePerM2)} = ${formatCzk(estimate.pricing.windowCoverPrice)}.`)
        .text(estimate.housingCooperative.guildDiscountConfigured
          ? `Cechovní sleva: ${estimate.pricing.svjGuildDiscountPercent} % (${formatCzk(estimate.pricing.svjGuildDiscount)}); sazbu je nutné před objednávkou potvrdit.`
          : 'Cechovní sazba slevy není v systému nakonfigurována; sleva nebyla odečtena.')
        .text(`Orientační celková cena po uvedené slevě: ${formatCzk(estimate.pricing.totalPrice)}.`)
        .moveDown();
    }

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
      .text(`Místo plnění: ${printableAddress}. Předmět, skutečné výměry, technologický postup, cena, termín, předání, vady, záruka a odpovědnost musí být doplněny a oboustranně odsouhlaseny.`)
      .text('Záloha, splatnost po předání, případná záruka i spotřebitelská práva se řídí až individuální písemnou dohodou a ověřenými obchodními podmínkami.')
      .text('Podpisy: objednatel ____________________   zhotovitel ____________________');

    document.end();
  });
}

function renderHousingCooperativeResolutionPdf(estimate) {
  if (
    !estimate ||
    estimate.housingCooperative?.eligible !== true ||
    typeof estimate.address !== 'string' ||
    !Number.isFinite(estimate.pricing?.totalPrice)
  ) {
    throw new TypeError('Návrh usnesení vyžaduje ověřený profil bytového domu a platnou kalkulaci.');
  }
  const printableAddress = estimate.address
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);

  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      size: 'A4',
      margins: { top: 58, bottom: 58, left: 62, right: 62 },
      info: {
        Title: 'Pracovní návrh usnesení pro schůzi vlastníků',
        Author: 'HOLUB 360',
      },
    });
    const chunks = [];
    document.on('data', (chunk) => chunks.push(chunk));
    document.on('error', reject);
    document.on('end', () => resolve(Buffer.concat(chunks)));

    document.fillColor('#806522').font('Helvetica-Bold').fontSize(19)
      .text('Návrh usnesení pro schůzi vlastníků', { align: 'center' });
    document.moveDown(0.4);
    document.fillColor('#555').font('Helvetica').fontSize(10)
      .text('Pracovní tiskový podklad — nejde o právní radu ani o schválené usnesení.', { align: 'center' })
      .moveDown(1.8);

    document.fillColor('#222').font('Helvetica-Bold').fontSize(12).text('Identifikace bodu jednání');
    document.font('Helvetica').fontSize(10).moveDown(0.4)
      .text(`Objekt: ${printableAddress}`)
      .text('Bod programu: Projednání nabídky na odborné ošetření vnějších povrchů objektu.')
      .text('Datum schůze: ____________________    Číslo bodu: ____________________')
      .moveDown();

    document.font('Helvetica-Bold').fontSize(12).text('Navržené znění usnesení');
    document.font('Helvetica').fontSize(10).moveDown(0.5)
      .text(
        `Shromáždění vlastníků bere na vědomí předložený nezávazný modelový rozpočet na práce na objektu ${printableAddress}.`,
        { align: 'justify' },
      )
      .moveDown(0.7)
      .text(
        'Shromáždění vlastníků schvaluje pokračování v přípravě zakázky, přičemž konečný rozsah prací, skutečné výměry, technologický postup, cenu, termín, zdroj financování a podmínky předání stanoví až závazná nabídka a smluvní dokumentace předložená ke schválení oprávněným orgánem společenství.',
        { align: 'justify' },
      )
      .moveDown(0.7)
      .text('Výsledek hlasování: pro ______  proti ______  zdržel(a) se ______')
      .text('Předsedající: ____________________    Zapisovatel: ____________________')
      .moveDown();

    document.font('Helvetica-Bold').fontSize(12).text('Orientační finanční podklad pro fond oprav');
    document.font('Helvetica').fontSize(10).moveDown(0.4)
      .text(`Modelová cena po uvedeném příplatku a slevě: ${formatCzk(estimate.pricing.totalPrice)}.`)
      .text(`Zakrývání oken: ${formatCzk(estimate.pricing.windowCoverPrice)} (${estimate.pricing.windowCoverRatePerM2} Kč/m²).`)
      .text(estimate.housingCooperative.guildDiscountConfigured
        ? `Cechovní sleva v modelu: ${estimate.pricing.svjGuildDiscountPercent} % (${formatCzk(estimate.pricing.svjGuildDiscount)}); vyžaduje potvrzení provozovatele.`
        : 'Cechovní sazba slevy není nakonfigurována a v modelu nebyla odečtena.')
      .text('Cena odkladu není vyčíslena: chybí ověřené údaje o stavu objektu, vývoji znečištění a budoucích nákladech. Nepodložená procentní tvrzení nejsou prognózou ani podkladem pro rozhodnutí.')
      .moveDown();

    document.font('Helvetica-Bold').fontSize(12).text('Podklady a omezení');
    document.font('Helvetica').fontSize(9).moveDown(0.4)
      .text('Tento dokument je upravitelný pracovní návrh. Před hlasováním ověřte působnost orgánu, požadavky stanov, pravidla svolání a hlasování, financování a konečné smluvní podmínky. Případné usnesení musí odpovídat konkrétnímu společenství a jeho právnímu posouzení.', { align: 'justify' })
      .text('Výměry a cena vycházejí z modelových předpokladů a nenahrazují zaměření ani závaznou cenovou nabídku.');
    document.end();
  });
}

module.exports = { renderEstimatePdf, renderHousingCooperativeResolutionPdf };
