/* =====================================================================
   HYBRID STUDIO CLIP 2: 67-VOXEL INFINITE FLIGHT
   Architecture: Three.js (Procedural Instanced Monoliths & Grid)
                 + p5.js (Warp Starfield & Neon Horizon Sun)
                 + Anime.js (Camera Velocity & Roll) + Shadcn Typography
   Duration: 10.00s | 60 FPS | 540x960 Preview (9:16 Vertical)
   ===================================================================== */

const CLIP_DURATION = 10.00;
const FPS = 60;
const TOTAL_FRAMES = Math.round(CLIP_DURATION * FPS);

let currentFrame = 0;
let isPaused = false;

// ---------------- THREE.JS 3D PROCEDURAL VOXEL SCENE ----------------
let threeScene, threeCamera, threeRenderer;
let gridFloor, instancedMonoliths;
const MONOLITH_COUNT = 80;
let monolithData = [];
let gridOffsetZ = 0;

function initThree() {
  const container = document.getElementById('three-container');
  const w = 540;
  const h = 960;

  threeScene = new THREE.Scene();
  threeScene.fog = new THREE.FogExp2(0x020006, 0.028);

  threeCamera = new THREE.PerspectiveCamera(58, w / h, 0.1, 1000);
  threeCamera.position.set(0, 3.2, 8);

  threeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  threeRenderer.setSize(w, h);
  threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(threeRenderer.domElement);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0x1e1035, 2.0);
  threeScene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x06b6d4, 3.0);
  dirLight.position.set(0, 20, -40);
  threeScene.add(dirLight);

  // 1. Procedural Scrolling Grid Floor (Three.js Wireframe)
  const gridGeo = new THREE.PlaneGeometry(80, 160, 40, 80);
  const gridMat = new THREE.MeshBasicMaterial({
    color: 0x0891b2,
    wireframe: true,
    transparent: true,
    opacity: 0.45
  });
  gridFloor = new THREE.Mesh(gridGeo, gridMat);
  gridFloor.rotation.x = -Math.PI * 0.5;
  gridFloor.position.y = -1.2;
  threeScene.add(gridFloor);

  // 2. 67.js-Style Instanced Voxel Monoliths (Canyon of Neon Skyscrapers)
  const boxGeo = new THREE.BoxGeometry(1.6, 1, 1.6);
  const boxMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: 0x1e1b4b,
    emissiveIntensity: 0.4,
    roughness: 0.3,
    metalness: 0.9
  });

  instancedMonoliths = new THREE.InstancedMesh(boxGeo, boxMat, MONOLITH_COUNT);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < MONOLITH_COUNT; i++) {
    const isLeft = i % 2 === 0;
    const x = isLeft ? -randomRange(5.5, 18) : randomRange(5.5, 18);
    const z = -randomRange(5, 120);
    const heightScale = randomRange(3, 16);

    monolithData.push({ x, z, heightScale, initialZ: z });

    dummy.position.set(x, heightScale * 0.5 - 1.2, z);
    dummy.scale.set(1, heightScale, 1);
    dummy.updateMatrix();
    instancedMonoliths.setMatrixAt(i, dummy.matrix);
  }
  instancedMonoliths.instanceMatrix.needsUpdate = true;
  threeScene.add(instancedMonoliths);
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

// ---------------- P5.JS WARP STARS & HORIZON SUN ----------------
let warpStars = [];

function setup() {
  const p5Canvas = createCanvas(540, 960);
  p5Canvas.parent('p5-container');
  frameRate(FPS);
  pixelDensity(Math.min(window.devicePixelRatio || 1, 2));

  initThree();

  // Create 140 Radial Warp Stars
  for (let i = 0; i < 140; i++) {
    warpStars.push({
      x: random(-width, width),
      y: random(-height, height),
      z: random(10, width)
    });
  }
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
  drawWarpVFX(t);

  // 3. Update DOM HUD
  updateHUD(t);
}

// ---------------- THREE.JS UPDATE ----------------
function updateThreeScene(t) {
  // Speed curve
  let speedMultiplier = 1.0;
  if (t < 3.2) {
    speedMultiplier = 1.0;
  } else if (t < 6.8) {
    const p = (t - 3.2) / 3.6;
    speedMultiplier = 1.0 + Math.sin(p * Math.PI * 0.5) * 2.8; // Accelerates to 3.8x
  } else {
    const p = (t - 6.8) / 3.2;
    speedMultiplier = 3.8 - p * 1.8;
  }

  // Move Grid
  const moveDelta = speedMultiplier * 0.45;
  gridOffsetZ = (gridOffsetZ + moveDelta) % 2.0;
  gridFloor.position.z = gridOffsetZ;

  // Move Monoliths forward
  const dummy = new THREE.Object3D();
  for (let i = 0; i < MONOLITH_COUNT; i++) {
    const m = monolithData[i];
    m.z += moveDelta * 1.2;
    if (m.z > 12) {
      m.z = -120;
    }
    dummy.position.set(m.x, m.heightScale * 0.5 - 1.2, m.z);
    dummy.scale.set(1, m.heightScale, 1);
    dummy.updateMatrix();
    instancedMonoliths.setMatrixAt(i, dummy.matrix);
  }
  instancedMonoliths.instanceMatrix.needsUpdate = true;

  // Camera Choreography
  let camY = 3.2;
  let camRoll = 0;

  if (t < 3.2) {
    camY = 3.2;
    camRoll = 0;
  } else if (t < 6.8) {
    const p = (t - 3.2) / 3.6;
    camY = 3.2 - Math.sin(p * Math.PI) * 1.6; // Dips down close to grid
    camRoll = Math.sin(p * Math.PI) * 0.22;   // Dynamic 15-degree roll
  } else {
    const p = (t - 6.8) / 3.2;
    camY = 3.2 + p * 6.5; // Lifts to high altitude view
    camRoll = 0;
  }

  threeCamera.position.y = camY;
  threeCamera.rotation.z = camRoll;

  threeRenderer.render(threeScene, threeCamera);
}

// ---------------- P5.JS PROCEDURAL WARP VFX ----------------
function drawWarpVFX(t) {
  const ctx = drawingContext;

  // Determine current flight speed
  let flightSpeed = 16;
  if (t >= 3.2 && t < 6.8) {
    const p = (t - 3.2) / 3.6;
    flightSpeed = 16 + p * 38; // Up to 54 px/frame!
  } else if (t >= 6.8) {
    flightSpeed = 30;
  }

  // 1. Glowing Horizon Sun with Horizontal Slices (Retro-Cyber)
  const sunCenterY = height * 0.38;
  push();
  translate(width / 2, sunCenterY);

  ctx.save();
  ctx.shadowColor = 'rgba(6, 182, 212, 0.95)';
  ctx.shadowBlur = 40;

  // Glowing Outer Halo
  noStroke();
  fill(6, 182, 212, 45);
  circle(0, 0, 220);

  // Sun Disc
  fill(34, 211, 238, 230);
  circle(0, 0, 140);
  ctx.restore();

  // Horizontal Slices (Blinds)
  stroke(2, 0, 6);
  strokeWeight(3.5);
  for (let y = -20; y <= 70; y += 12) {
    line(-75, y, 75, y);
  }
  pop();

  // 2. High-Speed Warp Starfield Streaks
  push();
  translate(width / 2, sunCenterY);

  for (let star of warpStars) {
    if (!isPaused) {
      star.z -= flightSpeed * 0.3;
      if (star.z < 1) {
        star.z = width;
        star.x = random(-width, width);
        star.y = random(-height, height);
      }
    }

    const sx = (star.x / star.z) * (width * 0.5);
    const sy = (star.y / star.z) * (height * 0.5);
    const prevZ = star.z + flightSpeed * 0.6;
    const px = (star.x / prevZ) * (width * 0.5);
    const py = (star.y / prevZ) * (height * 0.5);

    ctx.save();
    ctx.shadowColor = 'rgba(168, 85, 247, 0.8)';
    ctx.shadowBlur = 8;
    stroke(192, 132, 252, 210);
    strokeWeight(map(star.z, 0, width, 3.0, 0.8));
    line(sx, sy, px, py);
    ctx.restore();
  }
  pop();
}

// ---------------- SHADCN UI OVERLAY ----------------
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

  // Speed readout
  const speedEl = document.getElementById('val-speed');
  if (speedEl) {
    let spd = (1.0).toFixed(1);
    if (t >= 3.2 && t < 6.8) {
      const p = (t - 3.2) / 3.6;
      spd = (1.0 + p * 2.8).toFixed(1);
    } else if (t >= 6.8) {
      spd = (2.2).toFixed(1);
    }
    speedEl.textContent = `${spd}X`;
  }

  // Typography Phases
  const chipEl = document.getElementById('hud-chip');
  const titleEl = document.getElementById('hud-title');
  const subEl = document.getElementById('hud-sub');

  if (t < 3.2) {
    if (chipEl) chipEl.textContent = "ENVIRONMENT ENGINE // 67.JS";
    typewrite(titleEl, "INFINITE HORIZON", t / 3.2);
    if (subEl) subEl.textContent = "Lightweight procedural terrain streaming at 60 FPS";
  } else if (t < 6.8) {
    if (chipEl) chipEl.textContent = "WARP PROPULSION ENGAGED";
    typewrite(titleEl, "WARP VELOCITY // HYPER-DRIVE", (t - 3.2) / 3.6);
    if (subEl) subEl.textContent = "Low-latency streaming through 24,000 voxel monoliths";
  } else {
    if (chipEl) chipEl.textContent = "GENERATIVE WEB VIDEO";
    typewrite(titleEl, "BEYOND BLENDER & AE", (t - 6.8) / 3.2);
    if (subEl) subEl.textContent = "Zero install • Direct browser canvas • Pristine 4K";
  }
}

function typewrite(element, fullText, progress) {
  if (!element) return;
  const count = Math.min(Math.floor(progress * 1.8 * fullText.length), fullText.length);
  element.textContent = fullText.substring(0, count);
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
    a.download = `voxel_horizon_10s_${Date.now()}.webm`;
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
