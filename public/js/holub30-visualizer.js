const host = document.querySelector('#building-view');
const status = document.querySelector('#status');
const form = document.querySelector('#estimate-form');
const summary = document.querySelector('#estimate-summary');
const reveal = document.querySelector('#surface-reveal');
const downloadPdf = document.querySelector('#download-pdf');
const downloadSvjResolution = document.querySelector('#download-svj-resolution');
const svjPageNote = document.querySelector('#svj-page-note');
let currentEstimateId = null;
if (!host) throw new Error('Chybí kontejner 3D modelu.');
if (window.location.pathname === '/kalkulacka-svj') {
  svjPageNote.hidden = false;
  document.querySelector('.hero h1').textContent = 'Kalkulace pro bytové domy a SVJ.';
  document.title = 'HOLUB 360 — kalkulace pro SVJ';
}

let sceneController = null;
let sceneLoadStarted = false;
let pageActive = true;
const orbitButton = document.querySelector('#orbit-toggle');
async function loadScene() {
  if (sceneLoadStarted || !pageActive) return;
  sceneLoadStarted = true;
  try {
    const { mountBuilding } = await import('./holub30-scene.js');
    if (!pageActive) return;
    sceneController = mountBuilding(host, { revealInput: reveal, orbitButton });
  } catch {
    status.textContent = 'Ilustrační 3D model se nepodařilo načíst. Orientační kalkulace zůstává dostupná.';
  }
}

if ('IntersectionObserver' in window) {
  const sceneObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      sceneObserver.disconnect();
      loadScene();
    }
  }, { rootMargin: '160px' });
  sceneObserver.observe(host);
  window.addEventListener('pagehide', () => sceneObserver.disconnect(), { once: true });
} else {
  loadScene();
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button[type="submit"]');
  currentEstimateId = null;
  summary.hidden = true;
  downloadPdf.hidden = true;
  downloadSvjResolution.hidden = true;
  button.disabled = true;
  status.textContent = 'Připravuji orientační modelovou kalkulaci…';
  try {
    const response = await fetch('/api/satellite-scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ address: new FormData(form).get('address') }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Kalkulaci se nepodařilo připravit.');
    document.querySelector('#svj-savings-panel').hidden = true;
    if (data.status === 'awaiting-manual-address-review') {
      summary.hidden = true;
      downloadPdf.hidden = true;
      downloadSvjResolution.hidden = true;
      document.querySelector('#reference-status').textContent =
        'Adresu nyní ověří specialista. Dokud není ověřena, nezobrazujeme modelovou cenu ani místní referenci.';
      status.textContent = data.message;
      return;
    }
    currentEstimateId = data.estimateId;
    summary.hidden = false;
    downloadPdf.hidden = false;
    const formatCzk = (value) => `${new Intl.NumberFormat('cs-CZ').format(value)} Kč`;
    summary.replaceChildren();
    const baseLine = document.createElement('p');
    baseLine.textContent = `Pouze model — nikoli měření. Fasáda ${data.area.facadeNetM2} m², střecha ${data.area.roofNetM2} m². Orientační součet: ${formatCzk(data.pricing.totalPrice)}.`;
    summary.append(baseLine);
    const copperLine = document.createElement('p');
    copperLine.textContent = data.copperGuard?.available
      ? `${data.copperGuard.description} Ověřený hřeben ${data.copperGuard.verifiedRidgeLengthM} m; orientační cena CopperGuard ${formatCzk(data.copperGuard.priceCzk)} (vyžaduje potvrzení).`
      : 'Měděný hřebenový prvek: délka hřebene nebyla ověřena, proto cenu nelze stanovit.';
    summary.append(copperLine);
    if (data.housingCooperative?.eligible) {
      const svjLine = document.createElement('p');
      svjLine.textContent =
        `Model SVJ: zakrývání oken ${data.area.windowsDeductedM2} m² × ${formatCzk(data.pricing.windowCoverRatePerM2)}; ` +
        (data.housingCooperative.guildDiscountConfigured
          ? `cechovní sleva ${data.pricing.svjGuildDiscountPercent} % (${formatCzk(data.pricing.svjGuildDiscount)}). Výši slevy musí provozovatel potvrdit.`
          : 'cechovní sleva nebyla odečtena, protože její sazba není nakonfigurována.');
      summary.append(svjLine);
    }
    downloadSvjResolution.hidden = !data.housingCooperative?.eligible;
    const savingsScenario = data.housingCooperative?.savingsScenario;
    if (data.housingCooperative?.eligible) {
      renderSavingsScenario(savingsScenario);
      document.querySelector('#svj-savings-panel').hidden = false;
    }
    const referenceStatus = document.querySelector('#reference-status');
    referenceStatus.replaceChildren();
    if (data.socialProof?.status === 'verified-reference-found' && data.socialProof.reference) {
      referenceStatus.textContent =
        `${data.socialProof.reference.title}${data.socialProof.reference.locality ? ` · ${data.socialProof.reference.locality}` : ''} · přibližně ${data.socialProof.reference.distanceKm} km.`;
      if (data.socialProof.reference.evidenceUrl) {
        const evidenceLink = document.createElement('a');
        evidenceLink.href = data.socialProof.reference.evidenceUrl;
        evidenceLink.textContent = ' Zobrazit podklad reference';
        evidenceLink.rel = 'noopener noreferrer';
        evidenceLink.target = '_blank';
        referenceStatus.append(evidenceLink);
      }
    } else {
      referenceStatus.textContent =
        data.socialProof?.message || 'Pro tuto lokalitu není v systému dostupná ověřená reference.';
    }
    status.textContent = 'Model je připraven. Skutečné výměry a cenu je nutné ověřit.';
    window.dispatchEvent(new CustomEvent('holub360:estimate-started'));
    window.dispatchEvent(new CustomEvent('holub360:laser-focus'));
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

function renderSavingsScenario(scenario) {
  const panel = document.querySelector('#svj-savings-panel');
  const disclosure = document.querySelector('#svj-savings-disclosure');
  const result = document.querySelector('#svj-savings-result');
  const hspgPath = document.querySelector('#svj-hspg-path');
  const delayPath = document.querySelector('#svj-delay-path');
  const labels = document.querySelector('#svj-chart-labels');
  const svgNamespace = 'http://www.w3.org/2000/svg';
  hspgPath.setAttribute('d', '');
  delayPath.setAttribute('d', '');
  labels.replaceChildren();

  if (
    !scenario ||
    scenario.status !== 'verified-source-scenario' ||
    !Array.isArray(scenario.hspgAnnualCostsCzk) ||
    !Array.isArray(scenario.delayAnnualCostsCzk)
  ) {
    disclosure.textContent = 'Ověřená nákladová trajektorie ani srovnávací podklad nejsou dostupné. Graf neodhaduje ani nepředpokládá úsporu.';
    result.textContent = 'Procentní úspora nebyla vypočtena.';
    return;
  }

  const count = scenario.hspgAnnualCostsCzk.length;
  const allCosts = [...scenario.hspgAnnualCostsCzk, ...scenario.delayAnnualCostsCzk];
  const maximum = Math.max(...allCosts, 1);
  const x = (index) => 62 + (count === 1 ? 0 : index * 512 / (count - 1));
  const y = (value) => 210 - value / maximum * 174;
  const makePath = (values) => values.map((value, index) =>
    `${index === 0 ? 'M' : 'L'} ${x(index).toFixed(1)} ${y(value).toFixed(1)}`).join(' ');
  hspgPath.setAttribute('d', makePath(scenario.hspgAnnualCostsCzk));
  delayPath.setAttribute('d', makePath(scenario.delayAnnualCostsCzk));
  for (let index = 0; index < count; index += 1) {
    const label = document.createElementNS(svgNamespace, 'text');
    label.setAttribute('x', x(index));
    label.setAttribute('y', '226');
    label.setAttribute('text-anchor', 'middle');
    label.textContent = `Rok ${index + 1}`;
    labels.append(label);
  }
  disclosure.textContent =
    `Ověřený srovnávací scénář: ${scenario.sourceName}. Roční náklady v Kč podle doloženého podkladu; nejde o obecnou garanci výsledku.`;
  result.textContent =
    `Model HSPG: ${new Intl.NumberFormat('cs-CZ').format(scenario.hspgTotalCzk)} Kč · ` +
    `scénář odkladu: ${new Intl.NumberFormat('cs-CZ').format(scenario.delayTotalCzk)} Kč · ` +
    `rozdíl: ${scenario.savingsPercent} % za ${scenario.horizonYears} let.`;
  const evidenceLink = document.createElement('a');
  evidenceLink.href = scenario.evidenceUrl;
  evidenceLink.rel = 'noopener noreferrer';
  evidenceLink.target = '_blank';
  evidenceLink.textContent = 'Zobrazit ověřovací podklad';
  disclosure.append(document.createTextNode(' '), evidenceLink);
  hspgPath.classList.remove('is-visible');
  delayPath.classList.remove('is-visible');
  requestAnimationFrame(() => {
    hspgPath.classList.add('is-visible');
    delayPath.classList.add('is-visible');
  });
}

downloadPdf?.addEventListener('click', async () => {
  if (!currentEstimateId) return;
  downloadPdf.disabled = true;
  status.textContent = 'Připravuji orientační PDF…';
  try {
    const response = await fetch('/api/export-pdf', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ estimateId: currentEstimateId }),
    });

    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || 'PDF se nepodařilo připravit.');
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = 'holub360-orientacni-nabidka.pdf';
    link.click();
    URL.revokeObjectURL(url);
    status.textContent = 'Orientační PDF bylo připraveno ke stažení.';
    window.dispatchEvent(new CustomEvent('holub360:envelope-open'));
  } catch (error) {
    status.textContent = error.message;
  } finally {
    downloadPdf.disabled = false;
  }
});

downloadSvjResolution?.addEventListener('click', async () => {
  if (!currentEstimateId) return;
  downloadSvjResolution.disabled = true;
  status.textContent = 'Připravuji tiskový pracovní návrh usnesení…';
  try {
    const response = await fetch('/api/export-svj-resolution', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ estimateId: currentEstimateId }),
    });
    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || 'Návrh usnesení se nepodařilo připravit.');
    }
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = 'holub360-navrh-usneseni-svj.pdf';
    link.click();
    URL.revokeObjectURL(url);
    status.textContent = 'Pracovní návrh usnesení je připraven; před použitím jej ověřte pro konkrétní SVJ.';
    window.dispatchEvent(new CustomEvent('holub360:envelope-open'));
  } catch (error) {
    status.textContent = error.message;
  } finally {
    downloadSvjResolution.disabled = false;
  }
});

window.addEventListener('pagehide', () => {
  pageActive = false;
  sceneController?.dispose();
});
