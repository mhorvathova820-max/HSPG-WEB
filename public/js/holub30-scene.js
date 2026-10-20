import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export function mountBuilding(host, { revealInput, orbitButton } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#171613');
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(7, 6, 9);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
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
  const main = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.5, 2.6), facadeMaterial);
  main.position.y = 1.25;
  building.add(main);
  const roofMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uTreatment: { value: 0.35 },
      uSlope: { value: 0.48 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vLocalPosition;
      void main() {
        vUv = uv;
        vLocalPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uTreatment;
      uniform float uSlope;
      varying vec2 vUv;
      varying vec3 vLocalPosition;

      float pearl(vec2 uv, vec2 center, float radius) {
        vec2 delta = uv - center;
        delta.x *= 1.8;
        return 1.0 - smoothstep(radius * 0.55, radius, length(delta));
      }

      void main() {
        vec2 uv = vUv;
        float flowSpeed = 0.045 + uSlope * 0.075;
        vec2 grid = uv * vec2(11.0, 17.0);
        vec2 cell = floor(grid);
        vec2 local = fract(grid);
        float drift = sin(cell.y * 2.17 + cell.x * 0.63) * 0.12;
        float fall = fract(uTime * flowSpeed + fract(cell.y * 0.371));
        vec2 dropCenter = vec2(0.5 + drift, 1.12 - fall);
        float beads = pearl(local, dropCenter, 0.19) * 0.68;
        float highlight = pearl(local, dropCenter + vec2(-0.035, 0.045), 0.075) * 0.48;
        float trail = (1.0 - smoothstep(0.012, 0.045, abs(local.x - dropCenter.x))) *
          (1.0 - smoothstep(0.0, 0.72, abs(local.y - dropCenter.y))) * 0.1;
        vec3 dry = vec3(0.30, 0.265, 0.20);
        vec3 protectedSurface = vec3(0.43, 0.385, 0.285);
        vec3 surface = mix(dry, protectedSurface, clamp(uTreatment, 0.0, 1.0));
        float softSheen = pow(max(0.0, 1.0 - abs(vUv.x - 0.36)), 5.0) *
          (0.04 + clamp(uTreatment, 0.0, 1.0) * 0.12);
        surface += vec3(0.13, 0.105, 0.055) * softSheen;
        surface += vec3(0.30, 0.36, 0.39) * (beads + trail);
        surface += vec3(0.52, 0.49, 0.36) * highlight;
        gl_FragColor = vec4(surface, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.45, 1.35, 4), roofMaterial);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 3.15;
  building.add(roof);
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(main.geometry),
    new THREE.LineBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0.85 }),
  );
  outline.position.copy(main.position);
  building.add(outline);
  const windows = new THREE.Group();
  for (const x of [-0.85, 0, 0.85]) {
    const pane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.45, 0.62),
      new THREE.MeshBasicMaterial({ color: 0x6d897e, side: THREE.DoubleSide }),
    );
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

  const revealMaterial = new THREE.MeshBasicMaterial({
    color: 0xe8e0cc,
    transparent: true,
    opacity: 0.22,
    wireframe: true,
  });
  const cleanLayer = new THREE.Mesh(new THREE.BoxGeometry(3.27, 2.58, 2.67), revealMaterial);
  cleanLayer.position.copy(main.position);
  building.add(cleanLayer);

  const applyReveal = () => {
    const amount = Number(revealInput?.value ?? 35) / 100;
    revealMaterial.opacity = 0.08 + amount * 0.45;
    facadeMaterial.color.setRGB(0.72 + amount * 0.15, 0.66 + amount * 0.18, 0.53 + amount * 0.25);
    roofMaterial.uniforms.uTreatment.value = amount;
  };
  revealInput?.addEventListener('input', applyReveal);
  applyReveal();

  const resizeObserver = new ResizeObserver(() => {
    const width = host.clientWidth;
    const height = host.clientHeight;
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  });
  resizeObserver.observe(host);

  const onOrbitClick = () => {
    controls.autoRotate = !controls.autoRotate;
    controls.autoRotateSpeed = 0.6;
    orbitButton?.setAttribute('aria-pressed', String(controls.autoRotate));
    if (orbitButton) {
      orbitButton.textContent = controls.autoRotate ? 'Zastavit otáčení modelu' : 'Spustit otáčení modelu';
    }
  };
  orbitButton?.addEventListener('click', onOrbitClick);

  let frameId = 0;
  let lastTime = 0;
  let disposed = false;
  function animate(time) {
    if (disposed || document.hidden) return;
    const delta = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    scanMaterial.uniforms.time.value += delta;
    roofMaterial.uniforms.uTime.value += delta;
    controls.update();
    renderer.render(scene, camera);
    frameId = requestAnimationFrame(animate);
  }
  function onVisibilityChange() {
    if (document.hidden) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    } else if (!disposed && !frameId) {
      lastTime = 0;
      frameId = requestAnimationFrame(animate);
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange);
  if (!document.hidden) frameId = requestAnimationFrame(animate);

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frameId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      resizeObserver.disconnect();
      revealInput?.removeEventListener('input', applyReveal);
      orbitButton?.removeEventListener('click', onOrbitClick);
      controls.dispose();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) material.dispose();
        }
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
