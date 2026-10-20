import * as THREE from '/vendor/three.module.js';
import { OrbitControls } from '/vendor/three/examples/jsm/controls/OrbitControls.js';

const host = document.querySelector('#building-view');
const status = document.querySelector('#status');
const form = document.querySelector('#estimate-form');
const summary = document.querySelector('#estimate-summary');
const reveal = document.querySelector('#surface-reveal');
const downloadPdf = document.querySelector('#download-pdf');
let currentEstimateId = null;
if (!host) throw new Error('Chybí kontejner 3D modelu.');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#171613');
const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
camera.position.set(7, 6, 9);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(host.clientWidth, host.clientHeight);
renderer.setClearColor('#171613', 1);
host.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1.25, 0);

scene.add(new THREE.HemisphereLight(0xe7dfc9, 0x353026, 2.1));
const keyLight = new THREE.DirectionalLight(0xffe7aa, 3);
keyLight.position.set(4, 8, 5);
scene.add(keyLight);

const building = new THREE.Group();
scene.add(building);
const facadeMaterial = new THREE.MeshStandardMaterial({ color: 0xd6c9a6, roughness: 0.72, metalness: 0.03 });
const edgesMaterial = new THREE.LineBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0.85 });
const main = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.5, 2.6), facadeMaterial);
main.position.y = 1.25;
building.add(main);
const roof = new THREE.Mesh(
  new THREE.ConeGeometry(2.45, 1.35, 4),
  new THREE.MeshStandardMaterial({ color: 0x544a34, roughness: 0.8, wireframe: true }),
);
roof.rotation.y = Math.PI / 4;
roof.position.y = 3.15;
building.add(roof);
const outline = new THREE.LineSegments(new THREE.EdgesGeometry(main.geometry), edgesMaterial);
outline.position.copy(main.position);
building.add(outline);
const windows = new THREE.Group();
for (const x of [-0.85, 0, 0.85]) {
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.62), new THREE.MeshBasicMaterial({ color: 0x6d897e, side: THREE.DoubleSide }));
  pane.position.set(x, 1.48, 1.306);
  windows.add(pane);
}
building.add(windows);

const scanMaterial = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: { time: { value: 0 } },
  vertexShader: 'varying vec3 vPosition; void main(){ vPosition=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
  fragmentShader: `
    uniform float time;
    varying vec3 vPosition;
    void main(){
      float scanY = mod(time * 1.15, 3.8) - 0.2;
      float band = 1.0 - smoothstep(0.035, 0.11, abs(vPosition.y - scanY));
      float halo = 1.0 - smoothstep(0.08, 0.38, abs(vPosition.y - scanY));
      float alpha = max(band, halo * 0.25);
      gl_FragColor = vec4(0.83, 0.686, 0.216, alpha * 0.9);
    }`,
});
const scan = new THREE.Mesh(new THREE.BoxGeometry(3.23, 2.55, 2.63), scanMaterial);
scan.position.copy(main.position);
building.add(scan);

const revealMaterial = new THREE.MeshBasicMaterial({ color: 0xe8e0cc, transparent: true, opacity: 0.22, wireframe: true });
const cleanLayer = new THREE.Mesh(new THREE.BoxGeometry(3.27, 2.58, 2.67), revealMaterial);
cleanLayer.position.copy(main.position);
building.add(cleanLayer);
let revealAmount = 0.35;
reveal?.addEventListener('input', () => {
  revealAmount = Number(reveal.value) / 100;
  revealMaterial.opacity = 0.08 + revealAmount * 0.45;
  facadeMaterial.color.setRGB(0.72 + revealAmount * 0.15, 0.66 + revealAmount * 0.18, 0.53 + revealAmount * 0.25);
});

const resizeObserver = new ResizeObserver(() => {
  const width = host.clientWidth;
  const height = host.clientHeight;
  if (!width || !height) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
});
resizeObserver.observe(host);

let lastTime = 0;
function animate(time) {
  const delta = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;
  scanMaterial.uniforms.time.value += delta;
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

document.querySelector('#orbit-toggle')?.addEventListener('click', (event) => {
  controls.autoRotate = !controls.autoRotate;
  controls.autoRotateSpeed = 0.6;
  event.currentTarget.setAttribute('aria-pressed', String(controls.autoRotate));
  event.currentTarget.textContent = controls.autoRotate ? 'Zastavit otáčení modelu' : 'Spustit otáčení modelu';
});

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
  resizeObserver.disconnect();
  controls.dispose();
  renderer.dispose();
});
