/* =====================================================================
   HYBRID STUDIO MASTER PRODUCTION ENGINE
   Architecture: Three.js (3D Geometry/PBR) + p5.js (Procedural VFX)
                 + Anime.js (Timeline Core) + HTML/CSS (Shadcn UI)
   Duration: 10.00s | 60 FPS | 540x960 Preview (9:16 Vertical)
   ===================================================================== */

const TOTAL_DURATION = 10.00;
const FPS = 60;
const TOTAL_FRAMES = Math.round(TOTAL_DURATION * FPS);

let currentFrame = 0;
let isPaused = false;
let currentClipMode = 0; // 0: Master, 1: Cyber Core, 2: 67-Voxel, 3: Fintech Card

// ---------------- THREE.JS MULTI-SCENE ENGINE ----------------
let threeScene, threeCamera, threeRenderer;
let ambientLight, dirLight1, pointLight1, pointLight2;

// Objects for Clip 1 (Cyber Core)
let coreGroup, innerCore, wireframeCore, ring1, ring2, satellites = [];

// Objects for Clip 2 (67-Voxel Horizon)
let gridFloor, instancedMonoliths;
const MONOLITH_COUNT = 70;
let monolithData = [];
let gridOffsetZ = 0;

// Objects for Clip 3 (Fintech 3D Card)
let cardGroup, cardMesh, chipMesh, logoRing1, logoRing2;

function initThreeMaster() {
  const container = document.getElementById('three-container');
  const w = 540;
  const h = 960;

  threeScene = new THREE.Scene();
  threeScene.fog = new THREE.FogExp2(0x020008, 0.032);

  threeCamera = new THREE.PerspectiveCamera(52, w / h, 0.1, 1000);
  threeCamera.position.set(0, 0, 16);

  threeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  threeRenderer.setSize(w, h);
  threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  threeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  threeRenderer.toneMappingExposure = 1.35;
  container.appendChild(threeRenderer.domElement);

  // Lights
  ambientLight = new THREE.AmbientLight(0x2d0b5a, 2.0);
  threeScene.add(ambientLight);

  dirLight1 = new THREE.DirectionalLight(0x38bdf8, 3.2);
  dirLight1.position.set(5, 12, 10);
  threeScene.add(dirLight1);

  pointLight1 = new THREE.PointLight(0xec4899, 4.0, 25);
  pointLight1.position.set(-6, -4, 6);
  threeScene.add(pointLight1);

  pointLight2 = new THREE.PointLight(0x06b6d4, 4.0, 25);
  pointLight2.position.set(6, 4, 6);
  threeScene.add(pointLight2);

  // Build Scene 1: Cyber Core
  buildCyberCore();

  // Build Scene 2: 67-Voxel Horizon
  buildVoxelHorizon();

  // Build Scene 3: Fintech 3D Card
  buildFintechCard();
}

function buildCyberCore() {
  coreGroup = new THREE.Group();
  threeScene.add(coreGroup);

  const innerGeo = new THREE.IcosahedronGeometry(2.3, 1);
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

  const wireGeo = new THREE.IcosahedronGeometry(2.7, 1);
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, wireframe: true, transparent: true, opacity: 0.8 });
  wireframeCore = new THREE.Mesh(wireGeo, wireMat);
  coreGroup.add(wireframeCore);

  const r1Geo = new THREE.TorusGeometry(4.0, 0.05, 16, 80);
  const r1Mat = new THREE.MeshStandardMaterial({ color: 0xc084fc, emissive: 0x9333ea, emissiveIntensity: 0.7, metalness: 0.9 });
  ring1 = new THREE.Mesh(r1Geo, r1Mat);
  coreGroup.add(ring1);

  const r2Geo = new THREE.TorusGeometry(5.2, 0.05, 16, 80);
  const r2Mat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0891b2, emissiveIntensity: 0.7, metalness: 0.9 });
  ring2 = new THREE.Mesh(r2Geo, r2Mat);
  ring2.rotation.x = Math.PI * 0.4;
  coreGroup.add(ring2);

  const satGeo = new THREE.OctahedronGeometry(0.4);
  const satMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xc084fc, emissiveIntensity: 0.9 });
  for (let i = 0; i < 8; i++) {
    const sat = new THREE.Mesh(satGeo, satMat);
    const angle = (i / 8) * Math.PI * 2;
    sat.position.set(Math.cos(angle) * 5.2, Math.sin(angle * 2) * 1.2, Math.sin(angle) * 5.2);
    coreGroup.add(sat);
    satellites.push({ mesh: sat, baseAngle: angle, r: 5.2 });
  }
}

function buildVoxelHorizon() {
  const gridGeo = new THREE.PlaneGeometry(80, 140, 36, 70);
  const gridMat = new THREE.MeshBasicMaterial({ color: 0x0891b2, wireframe: true, transparent: true, opacity: 0.4 });
  gridFloor = new THREE.Mesh(gridGeo, gridMat);
  gridFloor.rotation.x = -Math.PI * 0.5;
  gridFloor.position.y = -1.5;
  threeScene.add(gridFloor);

  const boxGeo = new THREE.BoxGeometry(1.6, 1, 1.6);
  const boxMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, emissive: 0x1e1b4b, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.9 });
  instancedMonoliths = new THREE.InstancedMesh(boxGeo, boxMat, MONOLITH_COUNT);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < MONOLITH_COUNT; i++) {
    const isLeft = i % 2 === 0;
    const x = isLeft ? -randomRange(5.5, 18) : randomRange(5.5, 18);
    const z = -randomRange(5, 110);
    const h = randomRange(3, 15);
    monolithData.push({ x, z, h });
    dummy.position.set(x, h * 0.5 - 1.5, z);
    dummy.scale.set(1, h, 1);
    dummy.updateMatrix();
    instancedMonoliths.setMatrixAt(i, dummy.matrix);
  }
  instancedMonoliths.instanceMatrix.needsUpdate = true;
  threeScene.add(instancedMonoliths);
}

function buildFintechCard() {
  cardGroup = new THREE.Group();
  threeScene.add(cardGroup);

  const cardGeo = new THREE.BoxGeometry(5.2, 3.3, 0.08);
  const cardMat = new THREE.MeshStandardMaterial({ color: 0x0f0b1e, roughness: 0.25, metalness: 0.9, emissive: 0x181030, emissiveIntensity: 0.3 });
  cardMesh = new THREE.Mesh(cardGeo, cardMat);
  cardGroup.add(cardMesh);

  const chipGeo = new THREE.BoxGeometry(0.85, 0.7, 0.11);
  const chipMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.95, roughness: 0.15, emissive: 0xd97706, emissiveIntensity: 0.4 });
  chipMesh = new THREE.Mesh(chipGeo, chipMat);
  chipMesh.position.set(-1.65, 0.45, 0.05);
  cardGroup.add(chipMesh);

  const ringGeo = new THREE.TorusGeometry(0.48, 0.03, 16, 50);
  logoRing1 = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.9 }));
  logoRing1.position.set(1.6, -0.85, 0.06);
  cardGroup.add(logoRing1);

  logoRing2 = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.9 }));
  logoRing2.position.set(2.1, -0.85, 0.06);
  cardGroup.add(logoRing2);
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

// ---------------- P5.JS MULTI-VFX ENGINE ----------------
let p5Particles = [];
let warpStars = [];
let shockwaves = [];

function setup() {
  const p5Canvas = createCanvas(540, 960);
  p5Canvas.parent('p5-container');
  frameRate(FPS);
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));

  initThreeMaster();

  // Sparks
  for (let i = 0; i < 90; i++) {
    p5Particles.push({
      x: random(width),
      y: random(height),
      r: random(1.5, 3.5),
      vx: random(-0.5, 0.5),
      vy: random(-1.0, -0.2),
      alpha: random(120, 240),
      phase: random(TWO_PI),
      colorType: random() > 0.5 ? 'cyan' : 'magenta'
    });
  }

  // Warp Stars
  for (let i = 0; i < 120; i++) {
    warpStars.push({
      x: random(-width, width),
      y: random(-height, height),
      z: random(10, width)
    });
  }

  // Setup Timeline Click Scrubbing
  const track = document.getElementById('timeline-track');
  if (track) {
    track.addEventListener('click', (e) => {
      const rect = track.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(clickX / rect.width, 1));
      currentFrame = Math.round(pct * (TOTAL_FRAMES - 1));
    });
  }
}

function draw() {
  if (!isPaused) {
    currentFrame = (currentFrame + 1) % TOTAL_FRAMES;
  }

  const t = (currentFrame / FPS);

  // 1. Update 3D Three.js
  updateThreeMaster(t);

  // 2. Render 2D p5.js VFX (Clear for transparency)
  clear();
  drawP5MasterVFX(t);

  // 3. Update HUD Typography & Widgets
  updateMasterHUD(t);
}

// ---------------- THREE.JS MASTER CHOREOGRAPHY ----------------
function updateThreeMaster(t) {
  // Hide/Show layers based on active mode
  if (currentClipMode === 0) {
    // MASTER COMBINED 10s:
    // 0.0s - 3.3s: 67-Voxel Horizon
    // 3.3s - 6.6s: Cyber Core
    // 6.6s - 10.0s: Fintech 3D Card
    if (t < 3.3) {
      gridFloor.visible = true;
      instancedMonoliths.visible = true;
      coreGroup.visible = false;
      cardGroup.visible = false;
      renderVoxelFlight(t / 3.3);
    } else if (t < 6.6) {
      gridFloor.visible = false;
      instancedMonoliths.visible = false;
      coreGroup.visible = true;
      cardGroup.visible = false;
      renderCyberCore((t - 3.3) / 3.3);
    } else {
      gridFloor.visible = false;
      instancedMonoliths.visible = false;
      coreGroup.visible = false;
      cardGroup.visible = true;
      renderFintechCard((t - 6.6) / 3.4);
    }
  } else if (currentClipMode === 1) {
    // Clip 1 Only: Cyber Core (10s deep dive)
    gridFloor.visible = false;
    instancedMonoliths.visible = false;
    coreGroup.visible = true;
    cardGroup.visible = false;
    renderCyberCore(t / 10.0);
  } else if (currentClipMode === 2) {
    // Clip 2 Only: 67-Voxel Horizon (10s deep dive)
    gridFloor.visible = true;
    instancedMonoliths.visible = true;
    coreGroup.visible = false;
    cardGroup.visible = false;
    renderVoxelFlight(t / 10.0);
  } else if (currentClipMode === 3) {
    // Clip 3 Only: Fintech 3D Card (10s deep dive)
    gridFloor.visible = false;
    instancedMonoliths.visible = false;
    coreGroup.visible = false;
    cardGroup.visible = true;
    renderFintechCard(t / 10.0);
  }

  threeRenderer.render(threeScene, threeCamera);
}

function renderVoxelFlight(p) {
  const speed = 1.0 + Math.sin(p * Math.PI) * 2.5;
  const moveDelta = speed * 0.45;
  gridOffsetZ = (gridOffsetZ + moveDelta) % 2.0;
  gridFloor.position.z = gridOffsetZ;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < MONOLITH_COUNT; i++) {
    const m = monolithData[i];
    m.z += moveDelta * 1.2;
    if (m.z > 12) m.z = -110;
    dummy.position.set(m.x, m.h * 0.5 - 1.5, m.z);
    dummy.scale.set(1, m.h, 1);
    dummy.updateMatrix();
    instancedMonoliths.setMatrixAt(i, dummy.matrix);
  }
  instancedMonoliths.instanceMatrix.needsUpdate = true;

  threeCamera.position.set(0, 3.2 - Math.sin(p * Math.PI) * 1.4, 8);
  threeCamera.rotation.set(0, 0, Math.sin(p * Math.PI) * 0.18);
}

function renderCyberCore(p) {
  const angle = p * Math.PI * 2 + 0.5;
  const dist = 14 - Math.sin(p * Math.PI) * 4.5;
  threeCamera.position.set(Math.sin(angle) * dist, Math.sin(p * 4) * 1.2, Math.cos(angle) * dist);
  threeCamera.lookAt(0, 0, 0);

  const spin = 0.02 + p * 0.04;
  coreGroup.rotation.y += spin;
  innerCore.rotation.x += spin * 0.7;
  wireframeCore.rotation.y -= spin * 1.2;
  ring1.rotation.x += spin * 1.4;
  ring2.rotation.z -= spin * 1.3;

  for (let s of satellites) {
    const satAng = s.baseAngle + p * 12;
    s.mesh.position.x = Math.cos(satAng) * s.r;
    s.mesh.position.z = Math.sin(satAng) * s.r;
    s.mesh.position.y = Math.sin(satAng * 2) * 1.2;
  }
}

function renderFintechCard(p) {
  threeCamera.position.set(0, 0.4, 9.5);
  threeCamera.lookAt(0, 0.4, 0);

  const rotY = 0.25 + Math.sin(p * Math.PI * 2) * 0.4;
  const rotX = 0.15 + Math.cos(p * Math.PI * 2) * 0.18;
  cardGroup.rotation.set(rotX, rotY, Math.sin(p * Math.PI * 2) * 0.05);
  cardGroup.position.y = 0.5 + Math.sin(p * 10) * 0.08;

  dirLight1.position.x = Math.sin(p * 6) * 8;
}

// ---------------- P5.JS MASTER PROCEDURAL VFX ----------------
function drawP5MasterVFX(t) {
  const ctx = drawingContext;

  // Determine which VFX to render based on mode or phase
  const isVoxelPhase = (currentClipMode === 2) || (currentClipMode === 0 && t < 3.3);
  const isCorePhase = (currentClipMode === 1) || (currentClipMode === 0 && t >= 3.3 && t < 6.6);
  const isCardPhase = (currentClipMode === 3) || (currentClipMode === 0 && t >= 6.6);

  if (isVoxelPhase) {
    // 1. Horizon Sun & Warp Starfield
    const sunY = height * 0.38;
    push();
    translate(width / 2, sunY);
    ctx.save();
    ctx.shadowColor = 'rgba(6, 182, 212, 0.95)';
    ctx.shadowBlur = 35;
    noStroke();
    fill(34, 211, 238, 220);
    circle(0, 0, 130);
    ctx.restore();

    stroke(3, 1, 10);
    strokeWeight(3.5);
    for (let y = -20; y <= 65; y += 12) line(-70, y, 70, y);

    // Warp Stars
    for (let s of warpStars) {
      if (!isPaused) {
        s.z -= 20;
        if (s.z < 1) { s.z = width; s.x = random(-width, width); s.y = random(-height, height); }
      }
      const sx = (s.x / s.z) * (width * 0.5);
      const sy = (s.y / s.z) * (height * 0.5);
      const prevZ = s.z + 30;
      const px = (s.x / prevZ) * (width * 0.5);
      const py = (s.y / prevZ) * (height * 0.5);

      stroke(192, 132, 252, 200);
      strokeWeight(map(s.z, 0, width, 2.5, 0.8));
      line(sx, sy, px, py);
    }
    pop();
  }

  if (isCorePhase) {
    // 2. Cyber Sparks & Radial Crosshair
    noStroke();
    for (let p of p5Particles) {
      if (!isPaused) {
        p.y += p.vy;
        p.x += p.vx + Math.sin(t * 2 + p.phase) * 0.3;
        if (p.y < -10) { p.y = height + 10; p.x = random(width); }
      }
      const alphaGlow = p.alpha * (0.6 + 0.4 * Math.sin(t * 6 + p.phase));
      fill(p.colorType === 'cyan' ? 6 : 236, p.colorType === 'cyan' ? 182 : 72, p.colorType === 'cyan' ? 212 : 153, alphaGlow);
      circle(p.x, p.y, p.r * 2);
    }

    push();
    translate(width / 2, height * 0.46);
    ctx.save();
    ctx.shadowColor = 'rgba(168, 85, 247, 0.8)';
    ctx.shadowBlur = 14;
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

  if (isCardPhase) {
    // 3. Fluid Harmonic Waves
    const waveLayers = [
      { baseY: height * 0.65, amp: 24, freq: 0.012, speed: 2.2, color: 'rgba(99, 102, 241, 0.16)' },
      { baseY: height * 0.70, amp: 28, freq: 0.009, speed: 1.8, color: 'rgba(168, 85, 247, 0.14)' },
      { baseY: height * 0.76, amp: 22, freq: 0.015, speed: 2.6, color: 'rgba(236, 72, 153, 0.12)' }
    ];

    for (let layer of waveLayers) {
      noStroke();
      fill(layer.color);
      beginShape();
      vertex(0, height);
      for (let x = 0; x <= width; x += 15) {
        const y = layer.baseY + Math.sin(x * layer.freq + t * layer.speed) * layer.amp;
        vertex(x, y);
      }
      vertex(width, height);
      endShape(CLOSE);
    }
  }
}

// ---------------- MASTER HUD & TYPOGRAPHY ----------------
function updateMasterHUD(t) {
  // Timecode
  const timecodeEl = document.getElementById('hud-timecode');
  const mm = Math.floor(t / 60).toString().padStart(2, '0');
  const ss = Math.floor(t % 60).toString().padStart(2, '0');
  const ms = Math.floor((t % 1) * 100).toString().padStart(2, '0');
  if (timecodeEl) timecodeEl.textContent = `${mm}:${ss}.${ms}`;

  // Progress Bar
  const progEl = document.getElementById('timeline-progress');
  if (progEl) {
    const pct = Math.min((t / TOTAL_DURATION) * 100, 100);
    progEl.style.width = `${pct}%`;
  }

  const badgeEl = document.getElementById('badge-text');
  const tagEl = document.getElementById('hud-tag');
  const titleEl = document.getElementById('hud-title');
  const descEl = document.getElementById('hud-desc');

  if (currentClipMode === 0) {
    // MASTER COMBINED SCRIPT
    if (t < 3.3) {
      if (badgeEl) badgeEl.textContent = "PHASE 01: 67-VOXEL HORIZON";
      if (tagEl) tagEl.textContent = "LIGHTWEIGHT 3D WORLD";
      typewrite(titleEl, "INFINITE HORIZON", t / 3.3);
      if (descEl) descEl.textContent = "Procedural streaming through 24,000 blocks at 60 FPS";
    } else if (t < 6.6) {
      if (badgeEl) badgeEl.textContent = "PHASE 02: THREE.JS CYBER CORE";
      if (tagEl) tagEl.textContent = "HERO 3D GEOMETRY";
      typewrite(titleEl, "QUANTUM AI GENESIS", (t - 3.3) / 3.3);
      if (descEl) descEl.textContent = "Cinematic lighting + metallic PBR materials + shockwaves";
    } else {
      if (badgeEl) badgeEl.textContent = "PHASE 03: FINTECH & SHADCN UI";
      if (tagEl) tagEl.textContent = "GLASSMORPHIC PRODUCTION";
      typewrite(titleEl, "THE FUTURE IS WEB-DRIVEN", (t - 6.6) / 3.4);
      if (descEl) descEl.textContent = "Zero install • p5.js + Three.js + Anime.js pipeline";
    }
  } else if (currentClipMode === 1) {
    if (badgeEl) badgeEl.textContent = "CLIP 1: CYBER CORE AI";
    if (tagEl) tagEl.textContent = "QUANTUM COMPUTE";
    typewrite(titleEl, "NEURAL SYNAPSE // ACTIVE", t / 10.0);
    if (descEl) descEl.textContent = "Deep-dive into 3D nested meshes and particle attraction";
  } else if (currentClipMode === 2) {
    if (badgeEl) badgeEl.textContent = "CLIP 2: 67-VOXEL FLIGHT";
    if (tagEl) tagEl.textContent = "HIGH-SPEED TERRAIN";
    typewrite(titleEl, "WARP VELOCITY STREAM", t / 10.0);
    if (descEl) descEl.textContent = "Retro-cyber horizon with radial star streaks";
  } else if (currentClipMode === 3) {
    if (badgeEl) badgeEl.textContent = "CLIP 3: FINTECH 3D CARD";
    if (tagEl) tagEl.textContent = "LIQUIDITY ACCUMULATED";
    typewrite(titleEl, "APEX TITANIUM REEL", t / 10.0);
    if (descEl) descEl.textContent = "Harmonic fluid ribbons + real-time counter metrics";
  }
}

function typewrite(element, fullText, progress) {
  if (!element) return;
  const count = Math.min(Math.floor(progress * 1.8 * fullText.length), fullText.length);
  element.textContent = fullText.substring(0, count);
}

// ---------------- MODE SWITCHER ----------------
function switchClip(modeIdx) {
  currentClipMode = modeIdx;
  currentFrame = 0;

  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach((tab, i) => {
    if (i === modeIdx) tab.classList.add('active');
    else tab.classList.remove('active');
  });
}

// ---------------- CONTROLS & WEBM RECORDER ----------------
function keyPressed() {
  if (key === ' ' || key === 'p' || key === 'P') {
    isPaused = !isPaused;
  } else if (key === 'r' || key === 'R') {
    toggleRecording();
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

function toggleRecording() {
  const recBtn = document.getElementById('btn-record');
  const recLabel = document.getElementById('rec-label');

  if (isRecording) {
    if (mediaRecorder) mediaRecorder.stop();
    isRecording = false;
    if (recBtn) recBtn.classList.remove('recording');
    if (recLabel) recLabel.textContent = "EXPORT 60FPS WEBM";
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

  mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 18000000 });
  recordedChunks = [];

  mediaRecorder.ondataavailable = e => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hybrid_production_reel_${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (recBtn) recBtn.classList.remove('recording');
    if (recLabel) recLabel.textContent = "EXPORT 60FPS WEBM";
    console.log("Master Video Export Complete!");
  };

  currentFrame = 0;
  isPaused = false;
  mediaRecorder.start();
  isRecording = true;
  if (recBtn) recBtn.classList.add('recording');
  if (recLabel) recLabel.textContent = "RECORDING (10s)...";

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
