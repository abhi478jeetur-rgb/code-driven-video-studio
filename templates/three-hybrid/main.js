// Three.js 3D + p5 VFX/HUD layer, ONE WebGL canvas. Text is drawn in p5 (not DOM) so every frame capture includes it.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
const { kf, Ez, clamp, rng, hash01, RENDER_MODE } = SC;
const CONFIG = { W: 1080, H: 1920, FPS: 60, DURATION: 8, SEED: 11 };
const KF = {
  camPos: [[0, [0, 1.5, 14]], [8, [5, 2.5, 9], 'inOutSine']],
  coreRot: [[0, 0], [8, Math.PI * 2, 'linear']],
  bloom: [[0, 0.6], [4, 1.4, 'inOutSine'], [8, 0.8, 'inOutSine']],
  titleA: [[0.4, 0], [1.0, 1, 'outExpo'], [7.2, 1, 'hold'], [7.8, 0, 'inExpo']]
};
// renderer: preserveDrawingBuffer so tools/render.mjs can read the frame
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1); renderer.setSize(CONFIG.W, CONFIG.H, false);
renderer.domElement.style.width = (CONFIG.W / 2) + 'px'; renderer.domElement.style.height = (CONFIG.H / 2) + 'px';
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x05030f); scene.fog = new THREE.FogExp2(0x05030f, 0.03);
const camera = new THREE.PerspectiveCamera(45, CONFIG.W / CONFIG.H, 0.1, 200);
scene.add(new THREE.AmbientLight(0x404060, 1.5));
const key = new THREE.DirectionalLight(0xffe2c0, 3); key.position.set(-4, 6, 5); scene.add(key);
const rim = new THREE.PointLight(0x22d3ee, 40, 30); rim.position.set(4, 1, -3); scene.add(rim);
const core = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 1), new THREE.MeshStandardMaterial({ color: 0xffc46e, metalness: 0.6, roughness: 0.25, emissive: 0x3a1500 }));
scene.add(core);
// instanced particles, positions from seeded rng (deterministic)
const N = 600, inst = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshBasicMaterial({ color: 0xe43a5c }), N);
const base = []; { const r = rng(CONFIG.SEED); for (let i = 0; i < N; i++) base.push([r() * 6.283, 3 + r() * 5, (r() - 0.5) * 6, 0.2 + r() * 0.6]); }
scene.add(inst);
// p5 offscreen layer -> texture on a screen-space quad (HUD + 2D VFX)
let p5g = null;
new p5(p => { p.setup = () => { p.pixelDensity(1); p.createCanvas(CONFIG.W, CONFIG.H).hide(); p.noLoop(); p5g = p; }; });
const hudTex = new THREE.CanvasTexture(document.createElement('canvas')); hudTex.colorSpace = THREE.SRGBColorSpace;
const hudScene = new THREE.Scene(), hudCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const hudQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: hudTex, transparent: true, depthTest: false }));
hudScene.add(hudQuad);
const composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(CONFIG.W, CONFIG.H), 1, 0.6, 0.2); composer.addPass(bloom); composer.addPass(new OutputPass());
const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(1, 1, 1), P = new THREE.Vector3();
function drawHUD(t) {
  const p = p5g; p.clear(); const a = kf(KF.titleA, t);
  if (a > 0) { p.textAlign(p.CENTER, p.CENTER); p.textSize(68); p.textStyle(p.BOLD); p.fill(255, 255 * a); p.text('Your Title', p.width / 2, 190 + 40 * (1 - a)); }
  if (hudTex.image !== p.canvas) { hudTex.image = p.canvas; } hudTex.needsUpdate = true;
}
function render(t) {
  const c = kf(KF.camPos, t); camera.position.set(c[0], c[1], c[2]); camera.lookAt(0, 0, 0);
  core.rotation.set(0.3, kf(KF.coreRot, t), 0);
  for (let i = 0; i < N; i++) { const b = base[i], a = b[0] + t * b[3]; P.set(Math.cos(a) * b[1], b[2] + 0.2 * Math.sin(t * 2 + i), Math.sin(a) * b[1]); M.compose(P, Q, S); inst.setMatrixAt(i, M); }
  inst.instanceMatrix.needsUpdate = true;
  bloom.strength = kf(KF.bloom, t);
  composer.render();
  drawHUD(t); renderer.autoClear = false; renderer.render(hudScene, hudCam); renderer.autoClear = true;
}
let t0 = null;
function loop(now) { if (t0 === null) t0 = now; render(((now - t0) / 1000) % CONFIG.DURATION); requestAnimationFrame(loop); }
window.STUDIO = { width: CONFIG.W, height: CONFIG.H, fps: CONFIG.FPS, duration: CONFIG.DURATION,
  ready: new Promise(res => { const w = () => p5g ? (document.fonts ? document.fonts.ready : Promise.resolve()).then(res) : setTimeout(w, 20); w(); }),
  renderFrame(f) { render(f / CONFIG.FPS); }, canvas: () => renderer.domElement };
STUDIO.ready.then(() => { if (!RENDER_MODE) requestAnimationFrame(loop); });
