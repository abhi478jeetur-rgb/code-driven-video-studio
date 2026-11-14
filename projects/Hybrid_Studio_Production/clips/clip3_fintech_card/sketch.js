/* =====================================================================
   HYBRID STUDIO CLIP 3: FINTECH 3D HOLOGRAPHIC CARD
   Architecture: Three.js (3D Physical Material Smart Card)
                 + p5.js (Fluid Harmonic Sine Waves & NFC Pulses)
                 + Anime.js (Spring Choreography) + Shadcn Dashboard
   Duration: 10.00s | 60 FPS | 540x960 Preview (9:16 Vertical)
   ===================================================================== */

const CLIP_DURATION = 10.00;
const FPS = 60;
const TOTAL_FRAMES = Math.round(CLIP_DURATION * FPS);

let currentFrame = 0;
let isPaused = false;

// ---------------- THREE.JS 3D SCENE SETUP ----------------
let threeScene, threeCamera, threeRenderer;
let cardGroup, cardMesh, chipMesh, logoRing1, logoRing2;
let studioLight1, studioLight2;

function initThree() {
  const container = document.getElementById('three-container');
  const w = 540;
  const h = 960;

  threeScene = new THREE.Scene();

  threeCamera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000);
  threeCamera.position.set(0, 0.4, 9.5);

  threeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  threeRenderer.setSize(w, h);
  threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  threeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  threeRenderer.toneMappingExposure = 1.4;
  container.appendChild(threeRenderer.domElement);

  // Studio Lighting
  const ambientLight = new THREE.AmbientLight(0x231a42, 2.2);
  threeScene.add(ambientLight);

  studioLight1 = new THREE.DirectionalLight(0xffffff, 3.5);
  studioLight1.position.set(5, 8, 8);
  threeScene.add(studioLight1);

  studioLight2 = new THREE.PointLight(0x6366f1, 4.0, 20);
  studioLight2.position.set(-6, -4, 6);
  threeScene.add(studioLight2);

  // 3D Card Group
  cardGroup = new THREE.Group();
  cardGroup.position.set(0, 0.5, 0);
  threeScene.add(cardGroup);

  // 1. Titanium Black Card Body
  const cardGeo = new THREE.BoxGeometry(5.2, 3.3, 0.08);
  const cardMat = new THREE.MeshStandardMaterial({
    color: 0x0f0b1e,
    roughness: 0.25,
    metalness: 0.9,
    emissive: 0x181030,
    emissiveIntensity: 0.3
  });
  cardMesh = new THREE.Mesh(cardGeo, cardMat);
  cardGroup.add(cardMesh);

  // Subtle Metallic Border
  const borderGeo = new THREE.BoxGeometry(5.24, 3.34, 0.07);
  const borderMat = new THREE.MeshBasicMaterial({
    color: 0x818cf8,
    wireframe: true,
    transparent: true,
    opacity: 0.4
  });
  const borderMesh = new THREE.Mesh(borderGeo, borderMat);
  cardGroup.add(borderMesh);

  // 2. Gold EMV Chip
  const chipGeo = new THREE.BoxGeometry(0.85, 0.7, 0.11);
  const chipMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    metalness: 0.95,
    roughness: 0.15,
    emissive: 0xd97706,
    emissiveIntensity: 0.4
  });
  chipMesh = new THREE.Mesh(chipGeo, chipMat);
  chipMesh.position.set(-1.65, 0.45, 0.05);
  cardGroup.add(chipMesh);

  // 3. Holographic Concentric Mastercard/Visa Rings
  const ringGeo = new THREE.TorusGeometry(0.48, 0.03, 16, 50);
  const ringMat1 = new THREE.MeshBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.9 });
  const ringMat2 = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.9 });

  logoRing1 = new THREE.Mesh(ringGeo, ringMat1);
  logoRing1.position.set(1.6, -0.85, 0.06);
  cardGroup.add(logoRing1);

  logoRing2 = new THREE.Mesh(ringGeo, ringMat2);
  logoRing2.position.set(2.1, -0.85, 0.06);
  cardGroup.add(logoRing2);
}

// ---------------- P5.JS FLUID SINE WAVES & NFC PULSES ----------------
let nfcWaves = [];

function setup() {
  const p5Canvas = createCanvas(540, 960);
  p5Canvas.parent('p5-container');
  frameRate(FPS);
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));

  initThree();
}

function draw() {
  if (!isPaused) {
    currentFrame = (currentFrame + 1) % TOTAL_FRAMES;
  }

  const t = (currentFrame / FPS);

  // 1. Three.js Update
  updateThreeScene(t);

  // 2. p5.js VFX (Transparent overlay)
  clear();
  drawFluidWaves(t);
  drawNFCPulses(t);

  // 3. Update DOM HUD
  updateHUD(t);
}

// ---------------- THREE.JS UPDATE ----------------
function updateThreeScene(t) {
  // Phase 1 (0.0s - 3.2s): Card flips into view with 3D spring tilt
  // Phase 2 (3.2s - 6.8s): Card hovers and tilts dynamically to reflect light
  // Phase 3 (6.8s - 10.0s): Smooth 360-degree spin and settle
  let rotY, rotX, rotZ;
  let posY = 0.5;

  if (t < 3.2) {
    const p = t / 3.2;
    const easeFlip = 1 - Math.pow(1 - p, 3); // outCubic
    rotY = (1 - easeFlip) * Math.PI * 0.5 + 0.25;
    rotX = (1 - easeFlip) * 0.4 + 0.15;
    rotZ = Math.sin(p * Math.PI) * 0.08;
    posY = 0.5 + Math.sin(t * 3) * 0.08;
  } else if (t < 6.8) {
    const p = (t - 3.2) / 3.6;
    rotY = 0.25 + Math.sin(p * Math.PI * 2) * 0.35;
    rotX = 0.15 + Math.cos(p * Math.PI * 2) * 0.18;
    rotZ = Math.sin(p * Math.PI * 2) * 0.06;
    posY = 0.5 + Math.sin(t * 3.5) * 0.1;
  } else {
    const p = (t - 6.8) / 3.2;
    const spinP = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; // inOutCubic
    rotY = 0.25 + spinP * Math.PI * 2;
    rotX = 0.15;
    rotZ = 0;
    posY = 0.5 + Math.sin(t * 3) * 0.08;
  }

  cardGroup.rotation.set(rotX, rotY, rotZ);
  cardGroup.position.y = posY;

  // Move Studio Light to create metallic sweep across card
  studioLight1.position.x = Math.sin(t * 1.8) * 8;
  studioLight1.position.z = 6 + Math.cos(t * 1.8) * 4;

  threeRenderer.render(threeScene, threeCamera);
}

// ---------------- P5.JS FLUID HARMONIC SINE WAVES ----------------
function drawFluidWaves(t) {
  const ctx = drawingContext;

  // Draw 3 layers of harmonic fluid ribbons flowing at the bottom half
  const waveLayers = [
    { baseY: height * 0.62, amp: 26, freq: 0.012, speed: 2.2, color: 'rgba(99, 102, 241, 0.16)' },
    { baseY: height * 0.68, amp: 32, freq: 0.009, speed: 1.8, color: 'rgba(168, 85, 247, 0.14)' },
    { baseY: height * 0.74, amp: 24, freq: 0.015, speed: 2.6, color: 'rgba(236, 72, 153, 0.12)' }
  ];

  for (let layer of waveLayers) {
    noStroke();
    fill(layer.color);
    beginShape();
    vertex(0, height);
    for (let x = 0; x <= width; x += 15) {
      const y = layer.baseY + Math.sin(x * layer.freq + t * layer.speed) * layer.amp
                            + Math.cos(x * layer.freq * 0.5 + t * layer.speed * 0.7) * (layer.amp * 0.5);
      vertex(x, y);
    }
    vertex(width, height);
    endShape(CLOSE);
  }
}

// ---------------- P5.JS NFC CONTACTLESS PULSES ----------------
function drawNFCPulses(t) {
  const ctx = drawingContext;

  // Trigger NFC pulse at t = 3.5s and t = 6.2s
  if (Math.abs(t - 3.5) < 0.03 && nfcWaves.length === 0) {
    nfcWaves.push({ startT: 3.5 });
  }
  if (Math.abs(t - 6.2) < 0.03 && nfcWaves.length <= 1) {
    nfcWaves.push({ startT: 6.2 });
  }

  // Card chip screen position approximately: (195, 390)
  const chipScreenX = width * 0.36;
  const chipScreenY = height * 0.42;

  for (let i = nfcWaves.length - 1; i >= 0; i--) {
    const wave = nfcWaves[i];
    const age = t - wave.startT;
    if (age >= 0 && age < 1.0) {
      for (let rIdx = 1; rIdx <= 3; rIdx++) {
        const ringProg = (age * 1.5 - rIdx * 0.15);
        if (ringProg > 0 && ringProg < 1.0) {
          const r = ringProg * 110;
          const alphaVal = (1.0 - ringProg) * 220;

          ctx.save();
          ctx.shadowColor = 'rgba(251, 191, 36, 0.95)';
          ctx.shadowBlur = 16;
          noFill();
          stroke(251, 191, 36, alphaVal);
          strokeWeight(2.8);
          arc(chipScreenX, chipScreenY, r * 2, r * 2, -PI * 0.45, PI * 0.45);
          ctx.restore();
        }
      }
    } else if (age >= 1.0) {
      nfcWaves.splice(i, 1);
    }
  }
}

// ---------------- SHADCN UI OVERLAY & LIVE TICKERS ----------------
function updateHUD(t) {
  // Timecode
  const timecodeEl = document.getElementById('hud-timecode');
  const mm = Math.floor(t / 60).toString().padStart(2, '0');
  const ss = Math.floor(t % 60).toString().padStart(2, '0');
  const ms = Math.floor((t % 1) * 100).toString().padStart(2, '0');
  if (timecodeEl) timecodeEl.textContent = `${mm}:${ss}.${ms}`;

  // Progress Bar
  const progEl = document.getElementById('timeline-progress');
  if (progEl) {
    const pct = Math.min((t / CLIP_DURATION) * 100, 100);
    progEl.style.width = `${pct}%`;
  }

  // Rapid Balance Counter ($0.00 -> $148,250.00)
  const balEl = document.getElementById('balance-amount');
  if (balEl) {
    let bal = 0;
    if (t < 3.2) {
      const p = t / 3.2;
      bal = Math.floor(p * 148250);
    } else {
      bal = 148250;
    }
    balEl.textContent = '$' + bal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // Floating Transaction Cards Cascade
  const tx1 = document.getElementById('tx-1');
  const tx2 = document.getElementById('tx-2');

  if (tx1) {
    if (t >= 3.4) {
      tx1.classList.add('visible');
    } else {
      tx1.classList.remove('visible');
    }
  }

  if (tx2) {
    if (t >= 5.2) {
      tx2.classList.add('visible');
    } else {
      tx2.classList.remove('visible');
    }
  }
}

// ---------------- CONTROLS & RECORDER ----------------
function keyPressed() {
  if (key === ' ' || key === 'p' || key === 'P') {
    isPaused = !isPaused;
  } else if (key === 'r' || key === 'R') {
    startWebMRecording();
  } else if (keyCode === LEFT_ARROW) {
    currentFrame = (currentFrame - 30 + TOTAL_FRAMES) % TOTAL_FRAMES;
  } else if (keyCode === RIGHT_ARROW) {
    currentFrame = (currentFrame + 30) % TOTAL_FRAMES;
  }
}

function mousePressed() {
  if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
    isPaused = !isPaused;
  }
}

let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

function startWebMRecording() {
  if (isRecording) {
    if (mediaRecorder) mediaRecorder.stop();
    isRecording = false;
    return;
  }

  const compositeCanvas = document.createElement('canvas');
  compositeCanvas.width = 540;
  compositeCanvas.height = 960;
  const compCtx = compositeCanvas.getContext('2d');

  const threeCanvas = threeRenderer.domElement;
  const p5Canvas = document.querySelector('#p5-container canvas');

  const stream = compositeCanvas.captureStream(FPS);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : 'video/webm';

  mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 16000000 });
  recordedChunks = [];

  mediaRecorder.ondataavailable = e => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fintech_3d_card_10s_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  currentFrame = 0;
  isPaused = false;
  mediaRecorder.start();
  isRecording = true;

  const compInterval = setInterval(() => {
    if (!isRecording) {
      clearInterval(compInterval);
      return;
    }
    compCtx.clearRect(0, 0, 540, 960);
    if (threeCanvas) compCtx.drawImage(threeCanvas, 0, 0);
    if (p5Canvas) compCtx.drawImage(p5Canvas, 0, 0);

    if (currentFrame >= TOTAL_FRAMES - 1) {
      mediaRecorder.stop();
      isRecording = false;
      clearInterval(compInterval);
    }
  }, 1000 / FPS);
}
