const host = document.querySelector('#building-view');
const status = document.querySelector('#status');
const form = document.querySelector('#estimate-form');
const summary = document.querySelector('#estimate-summary');
const reveal = document.querySelector('#surface-reveal');
const downloadPdf = document.querySelector('#download-pdf');
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
    currentEstimateId = data.estimateId;
    summary.hidden = false;
    downloadPdf.hidden = false;
    summary.textContent = `Pouze model — nikoli měření. Fasáda ${data.area.facadeNetM2} m², střecha ${data.area.roofNetM2} m². Orientační součet: ${new Intl.NumberFormat('cs-CZ').format(data.pricing.totalPrice)} Kč.`;
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
