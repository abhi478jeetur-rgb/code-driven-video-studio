// p5 2D template — deterministic. Edit CONFIG, KF and SHOTS only; keep render(t) pure.
const CONFIG = { W: 540, H: 960, PD: 2, FPS: 60, DURATION: 8, SEED: 7, BG: ['#120a26', '#010104'] };
const { kf, Ez, prog, clamp, lerp, rng, hash01, hex } = SC;

// Keyframes (fill from tools/analyze.py tracks when recreating a video). [time s, value, ease]
const KF = {
  camZoom: [[0, 1], [8, 1.15, 'linear']],
  orbR:    [[0, 0], [0.8, 150, 'outBack'], [5.5, 150, 'hold'], [6.5, 0, 'inExpo']],
  orbRot:  [[0, 0], [8, Math.PI * 2, 'linear']],
  titleA:  [[0.3, 0], [0.9, 1, 'outExpo'], [6.2, 1, 'hold'], [6.8, 0, 'inExpo']]
};
// Shots: [start, end, fn(u, t)]. Transitions overlap shots and take u in 0..1.
const SHOTS = [
  { start: 0, end: 4.2, draw: shotA },
  { start: 3.8, end: 8, draw: shotB }
];
const TRANSITIONS = [{ at: 3.8, dur: 0.4, type: 'crossfade' }];

let bgLayer, layerA, layerB;
function setup() {
  createCanvas(CONFIG.W, CONFIG.H); pixelDensity(CONFIG.PD); frameRate(CONFIG.FPS);
  bgLayer = createGraphics(CONFIG.W, CONFIG.H); paintBg(bgLayer);
  layerA = createGraphics(CONFIG.W, CONFIG.H); layerB = createGraphics(CONFIG.W, CONFIG.H);
  if (SC.RENDER_MODE) noLoop();
  STUDIO._resolve();
}
function paintBg(g) { const c = g.drawingContext, gr = c.createRadialGradient(g.width / 2, g.height * .42, 10, g.width / 2, g.height * .42, g.height * .75); gr.addColorStop(0, CONFIG.BG[0]); gr.addColorStop(1, CONFIG.BG[1]); c.fillStyle = gr; c.fillRect(0, 0, g.width, g.height); }

function shotA(g, u, t) {
  g.push(); g.translate(g.width / 2, g.height * .42); g.scale(kf(KF.camZoom, t)); g.rotate(kf(KF.orbRot, t));
  g.noStroke(); g.drawingContext.shadowBlur = 30; g.drawingContext.shadowColor = 'rgba(255,196,110,.9)';
  const R = kf(KF.orbR, t);
  for (let i = 0; i < 12; i++) { const a = i / 12 * TWO_PI; g.fill(255, 196, 110); g.circle(cos(a) * R, sin(a) * R, 14 + 6 * sin(t * 3 + i)); }
  g.pop();
}
function shotB(g, u, t) {
  g.push(); g.translate(g.width / 2, g.height * .42); g.noFill(); g.strokeWeight(3); g.stroke(228, 58, 92);
  const n = 400, shown = floor(n * Ez.outCubic(clamp(u * 1.4)));
  g.beginShape(); for (let i = 0; i < shown; i++) { const a = i / n * TWO_PI * 3; const r = 160 * cos(4 * a / 3); g.vertex(r * cos(a), r * sin(a)); } g.endShape();
  g.pop();
}
function drawTitle(t) {
  const a = kf(KF.titleA, t); if (a <= 0) return;
  push(); textAlign(CENTER, CENTER); textSize(34); textStyle(BOLD); fill(255, 255 * a);
  text('Your Title', width / 2, 95 + 20 * (1 - a)); pop();
}
function renderShot(shot, g, t) { g.clear(); shot.draw(g, (t - shot.start) / (shot.end - shot.start), t); }
function transitionAlpha(t) { for (const tr of TRANSITIONS) { if (t >= tr.at && t < tr.at + tr.dur) return Ez.inOutSine(prog(t, tr.at, tr.dur)); } return null; }

function render(t) {
  image(bgLayer, 0, 0, width, height);
  const act = SC.activeShots(SHOTS, t);
  const ta = transitionAlpha(t);
  if (act.length === 2 && ta !== null) {
    renderShot(act[0], layerA, t); renderShot(act[1], layerB, t);
    tint(255, 255 * (1 - ta)); image(layerA, 0, 0); tint(255, 255 * ta); image(layerB, 0, 0); noTint();
  } else if (act.length) { renderShot(act[act.length - 1], layerA, t); image(layerA, 0, 0); }
  drawTitle(t);
  grain(t);
}
function grain(t) { // deterministic grain: seeded per frame
  const r = rng(CONFIG.SEED * 9973 + Math.round(t * CONFIG.FPS)); noStroke(); fill(255, 10);
  for (let i = 0; i < 500; i++) rect(r() * width, r() * height, 1, 1);
}

// ---- preview + studio contract ----
let t0 = null;
function draw() { if (SC.RENDER_MODE) return; if (t0 === null) t0 = performance.now(); render(((performance.now() - t0) / 1000) % CONFIG.DURATION); }
window.STUDIO = {
  width: CONFIG.W * CONFIG.PD, height: CONFIG.H * CONFIG.PD, fps: CONFIG.FPS, duration: CONFIG.DURATION,
  ready: null, _resolve: null,
  renderFrame(f) { render(f / CONFIG.FPS); },
  canvas: () => document.querySelector('canvas')
};
STUDIO.ready = new Promise(r => { STUDIO._resolve = () => (document.fonts ? document.fonts.ready : Promise.resolve()).then(r); });
