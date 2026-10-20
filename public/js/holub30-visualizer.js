const host = document.querySelector('#building-view');
const status = document.querySelector('#status');
const form = document.querySelector('#estimate-form');
const summary = document.querySelector('#estimate-summary');
const reveal = document.querySelector('#surface-reveal');
const downloadPdf = document.querySelector('#download-pdf');
const downloadSvjResolution = document.querySelector('#download-svj-resolution');
let currentEstimateId = null;
if (!host) throw new Error('Chybí kontejner 3D modelu.');

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
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

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
      } catch (error) {
        status.textContent = error.message;
      } finally {
        downloadSvjResolution.disabled = false;
      }
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
  } catch (error) {
    status.textContent = error.message;
  } finally {
    downloadPdf.disabled = false;
  }
});

window.addEventListener('pagehide', () => {
  pageActive = false;
  sceneController?.dispose();
});
