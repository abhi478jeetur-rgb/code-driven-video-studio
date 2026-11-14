/* =====================================================================
   HYBRID STUDIO CLIP 1: CYBER CORE & AI GENESIS
   Architecture: Three.js (3D Mesh/Lighting) + p5.js (Procedural VFX)
                 + Anime.js (Timeline Engine) + HTML/CSS (Shadcn HUD)
   Duration: 10.00s | 60 FPS | 540x960 Preview (9:16 Vertical)
   ===================================================================== */

const CLIP_DURATION = 10.00;
const FPS = 60;
const TOTAL_FRAMES = Math.round(CLIP_DURATION * FPS);

let currentFrame = 0;
let isPaused = false;

// ---------------- THREE.JS 3D SCENE SETUP ----------------
let threeScene, threeCamera, threeRenderer;
let coreGroup, innerCore, wireframeCore, ring1, ring2, satellites = [];
let pointLightCyan, pointLightMagenta;

function initThree() {
  const container = document.getElementById('three-container');
  const w = 540;
  const h = 960;

  threeScene = new THREE.Scene();
  threeScene.fog = new THREE.FogExp2(0x030009, 0.035);

  threeCamera = new THREE.PerspectiveCamera(52, w / h, 0.1, 1000);
  threeCamera.position.set(0, 0, 16);

  threeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  threeRenderer.setSize(w, h);
  threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  threeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  threeRenderer.toneMappingExposure = 1.3;
  container.appendChild(threeRenderer.domElement);

  // 3D Lighting
  const ambientLight = new THREE.AmbientLight(0x2d0b5a, 1.8);
  threeScene.add(ambientLight);

  pointLightCyan = new THREE.PointLight(0x06b6d4, 4, 30);
  pointLightCyan.position.set(8, 6, 8);
  threeScene.add(pointLightCyan);

  pointLightMagenta = new THREE.PointLight(0xec4899, 4, 30);
  pointLightMagenta.position.set(-8, -6, 8);
  threeScene.add(pointLightMagenta);

  // Cyber Core Hierarchy
  coreGroup = new THREE.Group();
  threeScene.add(coreGroup);

  // 1. Inner Glowing Icosahedron
  const innerGeo = new THREE.IcosahedronGeometry(2.4, 1);
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0x9333ea,
    emissive: 0x581c87,
    emissiveIntensity: 0.6,
    roughness: 0.2,
    metalness: 0.85,
    flatShading: true
  });
  innerCore = new THREE.Mesh(innerGeo, innerMat);
  coreGroup.add(innerCore);

  // 2. Outer Wireframe Cage
  const wireGeo = new THREE.IcosahedronGeometry(2.8, 1);
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.85
  });
  wireframeCore = new THREE.Mesh(wireGeo, wireMat);
  coreGroup.add(wireframeCore);

  // 3. Concentric Orbit Rings
  const ring1Geo = new THREE.TorusGeometry(4.2, 0.06, 16, 100);
  const ring1Mat = new THREE.MeshStandardMaterial({
    color: 0xc084fc,
    emissive: 0x9333ea,
    emissiveIntensity: 0.8,
    metalness: 0.9,
    roughness: 0.1
  });
  ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
  coreGroup.add(ring1);

  const ring2Geo = new THREE.TorusGeometry(5.4, 0.05, 16, 100);
  const ring2Mat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x0891b2,
    emissiveIntensity: 0.8,
    metalness: 0.9,
    roughness: 0.1
  });
  ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
  ring2.rotation.x = Math.PI * 0.45;
  coreGroup.add(ring2);

  // 4. 8 Satellite Energy Nodes
  const satGeo = new THREE.OctahedronGeometry(0.45);
  const satMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xc084fc,
    emissiveIntensity: 1.0,
    metalness: 0.8
  });

  for (let i = 0; i < 8; i++) {
    const sat = new THREE.Mesh(satGeo, satMat);
    const angle = (i / 8) * Math.PI * 2;
    const r = 5.4;
    sat.position.set(Math.cos(angle) * r, Math.sin(angle * 2) * 1.5, Math.sin(angle) * r);
    coreGroup.add(sat);
    satellites.push({ mesh: sat, baseAngle: angle, r: r });
  }
}

// ---------------- P5.JS PROCEDURAL VFX SETUP ----------------
let p5Particles = [];
let shockwaves = [];

function setup() {
  const p5Canvas = createCanvas(540, 960);
  p5Canvas.parent('p5-container');
  frameRate(FPS);
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));

  // Init 3D Scene
  initThree();

  // Create 100 Procedural Floating Energy Sparks
  for (let i = 0; i < 110; i++) {
    p5Particles.push({
      x: random(width),
      y: random(height),
      r: random(1.5, 3.8),
      vx: random(-0.6, 0.6),
      vy: random(-1.2, -0.3),
      alpha: random(120, 255),
      pulseSpeed: random(0.04, 0.12),
      phase: random(TWO_PI),
      colorType: random() > 0.5 ? 'cyan' : 'magenta'
    });
  }
}

function draw() {
  if (!isPaused) {
    currentFrame = (currentFrame + 1) % TOTAL_FRAMES;
  }

  const t = (currentFrame / FPS); // Timeline in seconds: 0.00 to 10.00

  // 1. UPDATE THREE.JS 3D SCENE
  updateThreeScene(t);

  // 2. RENDER P5.JS PROCEDURAL VFX OVERLAY
  clear(); // Transparent canvas over Three.js
  drawProceduralVFX(t);

  // 3. UPDATE SHADCN HTML HUD & KINETIC TYPOGRAPHY
  updateHUD(t);
}

// ---------------- THREE.JS CHOREOGRAPHY (Master Timing) ----------------
function updateThreeScene(t) {
  // Phase 1 (0.0s - 3.2s): Smooth Low-angle Orbit
  // Phase 2 (3.2s - 6.8s): Dramatic Zoom In & Overclock Spin
  // Phase 3 (6.8s - 10.0s): High-angle Wide Panoramic Orbit
  let camX, camY, camZ;
  let spinSpeed = 0.015;

  if (t < 3.2) {
    const p = t / 3.2;
    const angle = p * 1.2;
    camX = Math.sin(angle) * 15;
    camY = -1.5 + p * 1.5;
    camZ = Math.cos(angle) * 15;
  } else if (t < 6.8) {
    const p = (t - 3.2) / 3.6;
    const easeZoom = Math.sin(p * Math.PI * 0.5);
    const dist = 15 - easeZoom * 5.5; // Zooms to dist = 9.5
    const angle = 1.2 + p * 2.8;
    camX = Math.sin(angle) * dist;
    camY = 0 + Math.sin(p * 4) * 0.8;
    camZ = Math.cos(angle) * dist;
    spinSpeed = 0.015 + p * 0.045; // Accelerates spin
  } else {
    const p = (t - 6.8) / 3.2;
    const dist = 9.5 + p * 5.0; // Pulls back to 14.5
    const angle = 4.0 + p * 1.8;
    camX = Math.sin(angle) * dist;
    camY = 1.2 + p * 2.2; // Rises to high angle
    camZ = Math.cos(angle) * dist;
    spinSpeed = 0.06 - p * 0.03;
  }

  threeCamera.position.set(camX, camY, camZ);
  threeCamera.lookAt(0, 0, 0);

  // Core Rotations
  coreGroup.rotation.y += spinSpeed;
  innerCore.rotation.x += spinSpeed * 0.7;
  innerCore.rotation.z += spinSpeed * 0.5;
  wireframeCore.rotation.y -= spinSpeed * 1.2;

  ring1.rotation.x += spinSpeed * 1.5;
  ring1.rotation.y += spinSpeed * 0.9;
  ring2.rotation.z -= spinSpeed * 1.3;

  // Pulse Inner Core scale
  const corePulse = 1.0 + Math.sin(t * 8) * 0.05;
  innerCore.scale.set(corePulse, corePulse, corePulse);

  // Orbit Satellites
  for (let i = 0; i < satellites.length; i++) {
    const s = satellites[i];
    const satAng = s.baseAngle + t * 1.5;
    s.mesh.position.x = Math.cos(satAng) * s.r;
    s.mesh.position.z = Math.sin(satAng) * s.r;
    s.mesh.position.y = Math.sin(satAng * 3) * 1.2;
    s.mesh.rotation.x += 0.03;
    s.mesh.rotation.y += 0.05;
  }

  // Dynamic Point Lights
  pointLightCyan.position.x = Math.cos(t * 2.2) * 10;
  pointLightCyan.position.z = Math.sin(t * 2.2) * 10;
  pointLightMagenta.position.x = -Math.cos(t * 1.8) * 10;
  pointLightMagenta.position.z = -Math.sin(t * 1.8) * 10;

  threeRenderer.render(threeScene, threeCamera);
}

// ---------------- P5.JS PROCEDURAL VFX ----------------
function drawProceduralVFX(t) {
  const ctx = drawingContext;

  // 1. Floating Energy Dust
  noStroke();
  for (let p of p5Particles) {
    if (!isPaused) {
      p.y += p.vy;
      p.x += p.vx + Math.sin(t * 2 + p.phase) * 0.3;
      if (p.y < -10) {
        p.y = height + 10;
        p.x = random(width);
      }
    }

    const alphaGlow = p.alpha * (0.6 + 0.4 * Math.sin(t * 6 + p.phase));
    if (p.colorType === 'cyan') {
      fill(6, 182, 212, alphaGlow);
    } else {
      fill(236, 72, 153, alphaGlow);
    }
    circle(p.x, p.y, p.r * 2);
  }

  // 2. Triggerable Concentric Laser Shockwaves
  // Trigger at t = 3.2s and t = 6.8s
  if (Math.abs(t - 3.2) < 0.03 && shockwaves.length === 0) {
    shockwaves.push({ startT: 3.2, maxR: 380, color: '#06b6d4' });
  }
  if (Math.abs(t - 6.8) < 0.03 && shockwaves.length <= 1) {
    shockwaves.push({ startT: 6.8, maxR: 440, color: '#ec4899' });
  }

  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i];
    const age = t - sw.startT;
    if (age >= 0 && age < 1.2) {
      const progress = age / 1.2;
      const r = progress * sw.maxR;
      const alphaVal = (1.0 - progress) * 255;

      ctx.save();
      ctx.shadowColor = sw.color;
      ctx.shadowBlur = 24;
      noFill();
      stroke(sw.color === '#06b6d4' ? 6 : 236, sw.color === '#06b6d4' ? 182 : 72, sw.color === '#06b6d4' ? 212 : 153, alphaVal);
      strokeWeight(4.5 * (1.0 - progress));
      circle(width / 2, height * 0.46, r * 2);
      ctx.restore();
    } else if (age >= 1.2) {
      shockwaves.splice(i, 1);
    }
  }

  // 3. Center Holographic Grid Crosshairs
  push();
  translate(width / 2, height * 0.46);
  ctx.save();
  ctx.shadowColor = 'rgba(168, 85, 247, 0.8)';
  ctx.shadowBlur = 12;
  noFill();
  stroke(192, 132, 252, 90 + 40 * Math.sin(t * 5));
  strokeWeight(1.2);
  circle(0, 0, 160);
  line(-90, 0, -65, 0);
  line(65, 0, 90, 0);
  line(0, -90, 0, -65);
  line(0, 65, 0, 90);
  ctx.restore();
  pop();
}

// ---------------- SHADCN HTML HUD & KINETIC TYPOGRAPHY ----------------
function updateHUD(t) {
  // 1. Timecode
  const timecodeEl = document.getElementById('hud-timecode');
  const mm = Math.floor(t / 60).toString().padStart(2, '0');
  const ss = Math.floor(t % 60).toString().padStart(2, '0');
  const ms = Math.floor((t % 1) * 100).toString().padStart(2, '0');
  if (timecodeEl) timecodeEl.textContent = `${mm}:${ss}.${ms}`;

  // 2. Timeline Progress Bar
  const progEl = document.getElementById('timeline-progress');
  if (progEl) {
    const pct = Math.min((t / CLIP_DURATION) * 100, 100);
    progEl.style.width = `${pct}%`;
  }

  // 3. Telemetry Tickers
  let computeVal, coherenceVal, tempVal;
  let barComputePct, barCoherencePct;

  if (t < 3.2) {
    const p = t / 3.2;
    computeVal = (p * 42.5).toFixed(2);
    coherenceVal = (p * 68.2).toFixed(1);
    tempVal = Math.round(300 + p * 350);
    barComputePct = p * 42;
    barCoherencePct = p * 68;
  } else if (t < 6.8) {
    const p = (t - 3.2) / 3.6;
    computeVal = (42.5 + p * 52.3).toFixed(2);
    coherenceVal = (68.2 + p * 31.4).toFixed(1);
    tempVal = Math.round(650 + p * 820);
    barComputePct = 42 + p * 53;
    barCoherencePct = 68 + p * 31;
  } else {
    const p = (t - 6.8) / 3.2;
    computeVal = (94.8 + Math.sin(p * 10) * 0.4).toFixed(2);
    coherenceVal = (99.6 + Math.sin(p * 8) * 0.2).toFixed(1);
    tempVal = Math.round(1470 - p * 210);
    barComputePct = 95;
    barCoherencePct = 99;
  }

  const valComp = document.getElementById('val-compute');
  const valCoh = document.getElementById('val-coherence');
  const valTemp = document.getElementById('val-temp');
  const barComp = document.getElementById('bar-compute');
  const barCoh = document.getElementById('bar-coherence');

  if (valComp) valComp.textContent = `${computeVal} PFLOPS`;
  if (valCoh) valCoh.textContent = `${coherenceVal} %`;
  if (valTemp) valTemp.textContent = `${tempVal} K`;
  if (barComp) barComp.style.width = `${barComputePct}%`;
  if (barCoh) barCoh.style.width = `${barCoherencePct}%`;

  // 4. Kinetic Typography Sequences
  const tagEl = document.getElementById('hud-tag');
  const titleEl = document.getElementById('hud-title');
  const descEl = document.getElementById('hud-desc');

  if (t < 3.2) {
    if (tagEl) tagEl.textContent = "SEQUENCE PHASE 01 // INITIATION";
    typewrite(titleEl, "INITIALIZING QUANTUM CORE...", t / 3.2);
    if (descEl) descEl.textContent = "Synchronizing high-dimensional neural tensors";
  } else if (t < 6.8) {
    if (tagEl) tagEl.textContent = "SEQUENCE PHASE 02 // OVERCLOCK";
    typewrite(titleEl, "SYNAPSE OVERCLOCKED // PEAK", (t - 3.2) / 3.6);
    if (descEl) descEl.textContent = "Broadcasting multi-agent cognitive frequency";
  } else {
    if (tagEl) tagEl.textContent = "SEQUENCE PHASE 03 // HARMONY";
    typewrite(titleEl, "INTELLIGENCE EXPANDED // STABLE", (t - 6.8) / 3.2);
    if (descEl) descEl.textContent = "Unified hyper-dimensional intelligence achieved";
  }
}

function typewrite(element, fullText, progress) {
  if (!element) return;
  const count = Math.min(Math.floor(progress * 1.8 * fullText.length), fullText.length);
  element.textContent = fullText.substring(0, count);
}

// ---------------- KEYBOARD & SCRUB CONTROLS ----------------
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

// ---------------- HIGH-RES WEBM COMPOSITE RECORDER ----------------
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

function startWebMRecording() {
  if (isRecording) {
    if (mediaRecorder) mediaRecorder.stop();
    isRecording = false;
    console.log("Recording stopped.");
    return;
  }

  // Composite Three.js + p5.js into a single recording stream
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
    a.download = `cyber_core_10s_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    console.log("10s Video downloaded!");
  };

  currentFrame = 0;
  isPaused = false;
  mediaRecorder.start();
  isRecording = true;
  console.log("Recording started for 10.0 seconds...");

  // Draw composite loop
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
