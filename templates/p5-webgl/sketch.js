// p5 WEBGL template — deterministic 3D. Camera, objects, lights all read from KF.
const CONFIG = { W: 540, H: 960, PD: 2, FPS: 60, DURATION: 8, SEED: 3 };
const { kf, Ez, prog, clamp, rng } = SC;
const KF = {
  camEye:    [[0, [0, -120, 700]], [4, [380, -220, 520], 'inOutSine'], [8, [0, -60, 420], 'inOutSine']],
  camTarget: [[0, [0, 0, 0]], [8, [0, -20, 0], 'inOutSine']],
  fov:       [[0, 38], [8, 32, 'linear']],
  cubeRot:   [[0, 0], [8, Math.PI * 2, 'linear']],
  pop:       [[0.2, 0], [1.0, 1, 'outBack']]
};
let bgTex, fbA;
function setup() {
  createCanvas(CONFIG.W, CONFIG.H, WEBGL); setAttributes({ antialias: true }); // recreates the context: call once, in setup, before anything else pixelDensity(CONFIG.PD); frameRate(CONFIG.FPS);
  bgTex = createGraphics(256, 456); const c = bgTex.drawingContext, gr = c.createRadialGradient(128, 190, 5, 128, 190, 420);
  gr.addColorStop(0, '#1fa3b8'); gr.addColorStop(1, '#06303a'); c.fillStyle = gr; c.fillRect(0, 0, 256, 456);
  if (SC.RENDER_MODE) noLoop();
  STUDIO._resolve();
}
function background3D() { // full-screen quad in clip space, drawn first, no depth write
  const gl = drawingContext; push(); resetMatrix(); ortho(-width / 2, width / 2, -height / 2, height / 2, -10, 10); camera(0, 0, 5, 0, 0, 0, 0, 1, 0);
  gl.disable(gl.DEPTH_TEST); noStroke(); texture(bgTex); plane(width, height); gl.enable(gl.DEPTH_TEST); pop();
}
function mat(c, shine) { // ALWAYS reset material state; p5 keeps specular/emissive until changed
  noStroke(); emissiveMaterial(0);
  if (shine) { specularMaterial(c[0], c[1], c[2]); shininess(shine); } else { specularMaterial(0); shininess(1); }
  ambientMaterial(c[0], c[1], c[2]); fill(c[0], c[1], c[2]);
}
function setCamera(t) {
  const e = kf(KF.camEye, t), tg = kf(KF.camTarget, t);
  perspective(kf(KF.fov, t) * Math.PI / 180, width / height, 5, 5000);
  camera(e[0], e[1], e[2], tg[0], tg[1], tg[2], 0, 1, 0);
}
function lights3(t) {
  ambientLight(70, 80, 90);
  directionalLight(255, 240, 220, -0.5, 0.6, -0.6); // warm key
  directionalLight(80, 170, 200, 0.7, -0.1, 0.5);   // cool rim
}
function render(t) {
  clear(); background3D();
  setCamera(t); lights3(t);
  // ground
  push(); translate(0, 120, 0); rotateX(Math.PI / 2); mat([30, 90, 105]); plane(2000, 2000); pop();
  // hero
  const s = kf(KF.pop, t);
  push(); rotateY(kf(KF.cubeRot, t)); rotateX(0.4); scale(Math.max(0.001, s)); mat([255, 196, 110], 60); box(140, 140, 140); pop();
  // satellites (deterministic positions)
  const r = rng(CONFIG.SEED);
  for (let i = 0; i < 24; i++) { const a = r() * 6.283 + t * (0.3 + r() * 0.5), R = 220 + r() * 120, y = -80 + r() * 160;
    push(); translate(Math.cos(a) * R, y, Math.sin(a) * R); mat([228, 58, 92]); sphere(8 + r() * 8, 12, 8); pop(); }
  // transparent things last, far to near
}
let t0 = null;
function draw() { if (SC.RENDER_MODE) return; if (t0 === null) t0 = performance.now(); render(((performance.now() - t0) / 1000) % CONFIG.DURATION); }
window.STUDIO = { width: CONFIG.W * CONFIG.PD, height: CONFIG.H * CONFIG.PD, fps: CONFIG.FPS, duration: CONFIG.DURATION, ready: null, _resolve: null,
  renderFrame(f) { render(f / CONFIG.FPS); }, canvas: () => document.querySelector('canvas') };
STUDIO.ready = new Promise(r => { STUDIO._resolve = () => (document.fonts ? document.fonts.ready : Promise.resolve()).then(r); });
