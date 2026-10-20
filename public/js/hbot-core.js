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
    if (!reducedMotion.matches) {
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
    }
    playWingSound();
    playLaserSound();
    if (document.querySelector('#haptics-toggle')?.checked && typeof navigator.vibrate === 'function') {
      navigator.vibrate(35);
    }
  });

  const competitorForm = document.querySelector('#competitor-review-form');
  if (competitorForm) {
    competitorForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const status = document.querySelector('#competitor-review-status');
      const resultPanel = document.querySelector('#competitor-review-result');
      const fileInput = document.querySelector('#competitor-document');
      const file = fileInput.files?.[0];
      resultPanel.hidden = true;
      resultPanel.replaceChildren();
      if (!file || !document.querySelector('#competitor-consent').checked) {
        status.textContent = 'Vyberte dokument a potvrďte jednorázové zpracování.';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        status.textContent = 'Soubor překračuje maximální velikost 5 MB.';
        return;
      }

      const submitButton = competitorForm.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      status.textContent = 'Soubor se bezpečně předává k posouzení…';
      try {
        const body = new FormData();
        body.append('document', file);
        body.append('processingConsent', 'true');
        const response = await fetch('/api/competitor-review', {
          method: 'POST',
          headers: { 'X-Processing-Consent': 'true' },
          body,
          cache: 'no-store',
        });
        const review = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(review.error || `Požadavek selhal (${response.status}).`);
        status.textContent = review.message;

        const heading = document.createElement('h3');
        heading.textContent = 'Kontrolní oblasti pro odborné srovnání';
        const table = document.createElement('table');
        const tableHead = document.createElement('thead');
        tableHead.innerHTML = '<tr><th scope="col">Oblast</th><th scope="col">Co ověřit</th><th scope="col">Výsledek skenu</th></tr>';
        table.append(tableHead);
        const bodyElement = document.createElement('tbody');
        for (const checklistItem of review.comparisonChecklist || []) {
          const row = document.createElement('tr');
          for (const value of [checklistItem, 'Posouzení odborníkem', 'Automatická analýza neprovedena']) {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.append(cell);
          }
          bodyElement.append(row);
        }
        table.append(bodyElement);
        resultPanel.append(heading, table);
        resultPanel.hidden = false;
        competitorForm.reset();
      } catch (error) {
        status.textContent = error.message;
      } finally {
        submitButton.disabled = false;
      }
    });
  }

  let audioContext = null;
  let audioEnabled = false;
  const soundToggle = document.querySelector('#sound-toggle');
  async function enableAudioFromGesture() {
    if (!soundToggle?.checked) {
      audioEnabled = false;
      return;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      soundToggle.checked = false;
      return;
    }
    try {
      audioContext ||= new AudioContextClass();
      await audioContext.resume();
      audioEnabled = audioContext.state === 'running';
    } catch {
      audioEnabled = false;
      soundToggle.checked = false;
    }
  }
  soundToggle?.addEventListener('change', enableAudioFromGesture);

  function makeVoice(frequency, endFrequency, duration, type, pan = 0, delay = 0) {
    if (!audioEnabled || !audioContext || audioContext.state !== 'running') return null;
    const start = audioContext.currentTime + delay;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const panner = audioContext.createStereoPanner();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency > 0) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.035, start + Math.min(0.025, duration / 3));
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), start);
    oscillator.connect(gain).connect(panner).connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
    oscillator.addEventListener('ended', () => {
      oscillator.disconnect();
      gain.disconnect();
      panner.disconnect();
    }, { once: true });
    return start;
  }

  function makeNoise(duration, lowpassFrequency, pan = 0, volume = 0.025, delay = 0) {
    if (!audioEnabled || !audioContext || audioContext.state !== 'running') return;
    const length = Math.ceil(audioContext.sampleRate * duration);
    const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) {
      const fadeIn = Math.min(index / (audioContext.sampleRate * 0.008), 1);
      const fadeOut = Math.max(0, 1 - index / length);
      samples[index] = (Math.random() * 2 - 1) * fadeIn * fadeOut;
    }
    const source = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const gain = audioContext.createGain();
    const panner = audioContext.createStereoPanner();
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.value = lowpassFrequency;
    gain.gain.value = volume;
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    source.connect(filter).connect(gain).connect(panner).connect(audioContext.destination);
    source.start(audioContext.currentTime + delay);
    source.addEventListener('ended', () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
      panner.disconnect();
    }, { once: true });
  }

  function playWingSound() {
    if (!audioEnabled) return;
    const now = audioContext.currentTime;
    for (let beat = 0; beat < 3; beat += 1) {
      const delay = now + beat * 0.115 - audioContext.currentTime;
      makeVoice(68, 45, 0.09, 'sine', -0.35 + beat * 0.3, delay);
      makeNoise(0.11, 260, -0.35 + beat * 0.3, 0.012, delay);
    }
  }

  function playLaserSound() {
    makeVoice(92, 48, 0.42, 'sine', 0.15);
    makeVoice(184, 92, 0.3, 'triangle', 0.15);
  }

  function playEnvelopeSound() {
    makeNoise(0.055, 4200, -0.1, 0.04);
    makeNoise(0.38, 1150, 0.1, 0.025);
    makeVoice(118, 74, 0.22, 'triangle', 0.05);
  }
  window.addEventListener('holub360:envelope-open', playEnvelopeSound);
  window.addEventListener('holub360:laser-focus', playLaserSound);

  window.addEventListener('pagehide', () => {
    observer.disconnect();
    if (frame) cancelAnimationFrame(frame);
    audioEnabled = false;
    if (audioContext && audioContext.state !== 'closed') audioContext.close();
  });
}
