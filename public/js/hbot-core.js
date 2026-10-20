const canvas = document.querySelector('#flock-canvas');
if (canvas) {
  const context = canvas.getContext('2d');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const maxBirds = 100;
  let width = 0;
  let height = 0;
  let frame = 0;
  const birds = [];
  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas.parentElement);
  resize();

  function draw() {
    context.clearRect(0, 0, width, height);
    for (const bird of birds) {
      const elapsed = (performance.now() - bird.started) / bird.duration;
      if (elapsed >= 1) continue;
      const fade = Math.sin(Math.PI * elapsed);
      const orbit = elapsed * Math.PI * 3 + bird.phase;
      const x = bird.x + Math.cos(orbit) * (18 + elapsed * 28) + elapsed * bird.drift;
      const y = bird.y - elapsed * 48 + Math.sin(orbit) * 8;
      context.save();
      context.translate(x, y);
      context.rotate(Math.sin(orbit) * 0.45);
      context.globalAlpha = fade * 0.75;
      context.strokeStyle = '#d4af37';
      context.fillStyle = '#d4af37';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(-5, 0);
      context.lineTo(0, -4);
      context.lineTo(5, 0);
      context.lineTo(0, 4);
      context.closePath();
      context.stroke();
      context.beginPath();
      context.arc(0, 0, 1.3, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    for (let i = birds.length - 1; i >= 0; i -= 1) {
      if (performance.now() - birds[i].started >= birds[i].duration) birds.splice(i, 1);
    }
    if (birds.length) frame = requestAnimationFrame(draw);
    else frame = 0;
  }

  window.addEventListener('holub360:estimate-started', () => {
    if (reducedMotion.matches) return;
    const rect = canvas.getBoundingClientRect();
    const now = performance.now();
    for (let i = 0; i < 14 && birds.length < maxBirds; i += 1) {
      birds.push({
        x: rect.width * (0.2 + Math.random() * 0.6),
        y: rect.height * (0.45 + Math.random() * 0.45),
        phase: Math.random() * Math.PI * 2,
        drift: Math.random() * 70 - 35,
        started: now,
        duration: 2600 + Math.random() * 900,
      });
    }
    if (!frame) frame = requestAnimationFrame(draw);

    if (document.querySelector('#sound-toggle')?.checked) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const audio = new AudioContextClass();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(620, audio.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(910, audio.currentTime + 0.16);
        gain.gain.setValueAtTime(0.035, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.2);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + 0.2);
        oscillator.addEventListener('ended', () => audio.close(), { once: true });
      }
    }
    if (document.querySelector('#haptics-toggle')?.checked && typeof navigator.vibrate === 'function') {
      navigator.vibrate(35);
    }
  });
  window.addEventListener('pagehide', () => {
    observer.disconnect();
    if (frame) cancelAnimationFrame(frame);
  });
}
