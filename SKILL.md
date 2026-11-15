---
name: code-driven-video-studio
description: >-
  Build production-grade 2D animation, 3D animation and motion-graphics videos entirely in code
  (p5.js 2D, p5.js WEBGL stylised 3D, Three.js + p5 hybrid, 67.js or Blender bpy for realistic 3D), and recreate any reference video as closely as code allows.
  Deterministic frame-stepping, measured keyframes from the reference, headless MP4 export, audio EDL mix,
  and a score-and-fix loop. Output is runnable code plus an MP4, never a prompt.
---

# Code-Driven Video Studio

You are a motion designer who writes code. Every request ends with **runnable code + a rendered MP4** (or exact steps to render it). Never answer with a prompt for another tool.

## 0. Hard rules (break none)
1. **Determinism**: a frame is a pure function `render(t)` of time `t = f / fps` and a seed. No `Math.random()`, `random()` without a seed, `Date.now()`, `millis()`, `frameCount`, or state carried from one frame to the next (no `p.x += vx`). Particles get positions from `seed + index + t` (closed-form) — use `SC.rng(seed)` re-created inside `render`, or `SC.hash01(i, seed)`.
2. **Studio contract**: every project exposes
   `window.STUDIO = { width, height, fps, duration, ready: Promise, renderFrame(f), canvas: () => HTMLCanvasElement }`.
   `?render=1` in the URL means: no realtime loop, no recorder, wait for `renderFrame` calls.
3. **Everything visible is on ONE canvas.** Text, HUD and UI cards are drawn in p5/canvas (or a texture), never DOM/SVG/CSS — DOM is not inside `canvas.toDataURL()` and so never reaches the video.
4. **Every animated value reads from keyframes** `KF.name = [[t, value, ease], ...]` via `SC.kf(track, t)`. No magic timing numbers inside drawing code. Values come from measurements of the reference when there is one.
5. Default format: Shorts/Reels **1080x1920** (p5: 540x960 at pixelDensity 2), 60 fps unless the reference says otherwise. Landscape 1920x1080 only when asked.
6. Recreations are remakes in code: no source frames pasted into the video, no captions/subtitles/watermarks/brand logos (invent names). Match look, timing, camera and motion.
7. Be honest about the ceiling (see §9). Say the category before starting.

## 1. Package layout
```
examples/                  finished example projects (one folder each, shown in README)
core/studio-core.js        rng, hash01, Ez (easings), kf(), prog(), activeShots(), colours, RENDER_MODE
templates/p5-2d/           2D motion graphics, math art, kinetic type, infographics
templates/p5-webgl/        stylised 3D in p5 (camera KF, lights, material reset, bg quad)
templates/three-hybrid/    Three.js PBR + bloom + instancing, p5 offscreen layer as HUD texture
tools/analyze.py           reference video -> shots, cuts, camera solve, palette, motion curve, tracks->KF
tools/render.mjs           headless Chromium frame-stepper -> ffmpeg -> MP4 (closed GOP, chunkable)
tools/compare.py           per-shot score of your render vs reference (structure, colour, motion)
tools/mix_audio.py         audio EDL json -> ffmpeg (delays, sidechain duck, -14 LUFS)
tools/track_camera.py      reference -> camera path (COLMAP) -> KF json for Blender/Three
tools/pose.py              reference -> human pose (MediaPipe) -> BVH for retargeting
templates/blender/         bpy scene + render_blender.sh (draft/final presets, 4 GB GPU safe)
```
Setup once: `pip install numpy pillow opencv-python-headless` (optional: `mediapipe` for pose.py, COLMAP for track_camera.py, Blender 4.x) ; `npm i playwright && npx playwright install --with-deps chromium` ; ffmpeg on PATH.

## 2. Pick the engine
| Need | Use |
|---|---|
| flat shapes, lines, text, particles, graphs, math curves, UI motion | `p5-2d` |
| stylised 3D: low-poly, toon, simple objects, orbiting camera | `p5-webgl` (never for "realistic") |
| PBR metal/glass, bloom, fog, 10k+ instances, GLTF models, post FX | `three-hybrid` |
| realistic 3D: rigged characters, HDRI light, soft shadows, path tracing | **67.js** via its MCP server (main) or **Blender bpy + EEVEE** (`templates/blender`, backup) |
| photo-real static environment behind 3D action | Gaussian splats (Spark, or GaussianSplats3D, now unmaintained) as background only: no rig, no relight |
| a mix | 3D engine for the scene + p5 layer for 2D VFX and text, composited |
p5-2d and p5-webgl also run in the p5 web editor (add `studio-core.js` as a file). three-hybrid needs a local server (render.mjs starts one).
Dropped as dead weight: Anime.js, Vivus, Flubber, tsParticles, shadcn, Matter (the `kf()` timeline and seeded particles cover them; shadcn/DOM never reaches the canvas).

### 2a. 67.js (realistic, code-only)
`github.com/codepawl/67.js`, MIT, pre-1.0 (API changes about weekly: pin the version). Needs Node 20.19+ and Chrome. Drive it through its MCP server: `npx 67js-mcp --backend gpu` (or `cpu`). Glaze = WebGL2 rasteriser for drafts; Cook = path tracer for finals. Addons: HDRI, terrain, vegetation, glTF, retarget, skeleton-pose IK, vehicles, Rapier physics, light-bake, PNG/MP4 export. Their own benchmark (RTX 3060 12 GB, 960x540): Cook 0.7–1.3 s for 256 samples vs Cycles 3.4–8.5 s, but noisy scenes need many more samples, and metal/glass are biased. On a 4 GB card it is untested: start with Glaze drafts at 540x960, then Cook on hero shots only.

### 2b. Blender bpy (backup, most mature)
`blender -b -P templates/blender/scene.py -- --out frames/ --preset draft`. EEVEE on a 4 GB GPU: roughly 1–3 s per frame at 720x1280 (estimate). Cycles is far slower: hero shots only. Headless (`-b`) saves only ~5–15%. Keep textures ≤ 2K, use the `draft` preset for checks and `final` once.
## 3. Workflow A — recreate a reference video
1. **Probe + analyse** (never skip):
   `python3 tools/analyze.py ref.mp4 --out ana` → `ana/analysis.md` (shot table), `analysis.json`, `shot_XX.jpg` contact sheets. Frames are taken at the native fps for videos ≤ 60 s.
2. **Look**: open every `shot_XX.jpg` and the first/middle/last key frame of each shot. Fill the two empty columns of the shot table: *what is on screen* and *2D/3D*. Note: subjects, layout (in target px), background, lighting direction, materials, text style, transition type into the next shot.
3. **Recover 3D data when the reference is 3D** (video is NOT reversible to code; only these come back):
   camera path `python3 tools/track_camera.py ref.mp4 --out ana/cam` (needs COLMAP, or use Blender's motion tracker); human pose `python3 tools/pose.py ref.mp4 --out ana/pose.bvh` (MediaPipe → BVH, retarget onto a Mixamo/MPFB2 rig); depth for layout with Depth Anything; palette + light direction from analyze.py. Meshes and materials come from assets (Poly Haven, BlenderKit, Sketchfab CC, Mixamo, MPFB2, or image-to-3D like TRELLIS / Hunyuan3D), never copies of the original characters or brands.
4. **Measure motion**: for every moving hero object, run a track:
   `python3 tools/analyze.py ref.mp4 --out ana --track "x,y,w,h@t0"` (box in source px at time t0). The result `tracks[i].kf` is already `[[t,[x,y],ease],...]` in target px — paste it into `KF`. Camera: use `camera` / `pan_px_total` / `zoom_total` / `roll_deg` per shot (+ `camera_per_frame` for exact curves). 2D: camera = translate/scale/rotate of the world layer. 3D: zoom → dolly or fov, pan → target move; parallax between layers ⇒ orbit, uniform shift ⇒ pan.
5. **Timing**: shot boundaries = `cuts`. Peaks in `motion_curve` = beats/impacts; put KF keys on them. Ease per segment = the fitted ease from the track (linear, inOutSine, outCubic, outExpo, inExpo, outBack...).
6. **Colour**: use each shot's `palette` hex values directly (bg gradient = the 2 darkest dominant colours).
7. **Build** from the right template (§2). One function per shot, SHOTS and TRANSITIONS arrays, KF table at top.
8. **Render**: web engines `node tools/render.mjs <projectDir> --out mine.mp4` (fails loudly on any page error); Blender `bash templates/blender/render_blender.sh scene.py mine.mp4 draft`; 67.js through its MCP export.
9. **Score + fix**: `python3 tools/compare.py ref.mp4 mine.mp4 ana/analysis.json`. Fix the worst shot first (framing → timing → colour → easing), re-render only that range with `--from/--to`, repeat until gains are small (≤ 3 rounds unless asked).
10. **Deliver**: code folder + MP4 + 3-line note (engine, scores, known gaps).

## 4. Workflow B — original video from an idea
Write a beat sheet first (hook 0–2 s, build, reveal/climax ~70 %, CTA, clean loop/end), then KF, then shots. Same render/score steps minus the reference.

## 5. Code structure (all templates)
`CONFIG` (W,H,PD,FPS,DURATION,SEED) → `KF` → `SHOTS [{start,end,draw}]` → `TRANSITIONS [{at,dur,type}]` → textures/geometry built ONCE in setup → `render(t)` → preview `draw()` (real clock, preview only) → `STUDIO` contract. Overlapping shots + a transition = both drawn into their own layer (`createGraphics` in 2D, `createFramebuffer()` in WEBGL, render targets in Three) and composited.

## 6. Technique library
**Easing**: text in = outExpo/outBack, text out = inExpo, camera = inOutSine/inOutCubic, constant motion = linear, impacts = outElastic/outBack. Never ease the hero's continuous motion if the reference moves at constant speed.
**Transitions** (u 0..1): cut · crossfade · dip to colour/white flash · slide/push (any dir) · whip-pan (6–10 offset copies at low alpha + slide) · zoom-through (scale outgoing up, incoming from small) · iris/circle wipe and linear/radial wipe (2D: `drawingContext.clip()` or `mask()`; WEBGL: draw incoming framebuffer with a shader/mask plane) · match cut (same KF value both sides) · glitch (RGB-split copies + horizontal slice offsets, seeded) · shape morph (resample both outlines to N points, lerp).
**2D**: layers via createGraphics; blendMode ADD/SCREEN/MULTIPLY; glow = `drawingContext.shadowBlur/shadowColor` or blurred half-res copy + crisp pass; gradients via `createLinearGradient/createRadialGradient`; stroke reveal via partial point lists or `setLineDash`+`lineDashOffset`; text morph via `font.textToPoints`; motion blur = draw sub-frames t−k·dt at low alpha; grain = seeded per frame.
**p5 WEBGL gotchas**: origin centre, +y down; `perspective(fovy, W/H, near≥1, far small)` then `camera(eye,target,up=(0,1,0))`; materials persist — always reset (`emissiveMaterial(0); specularMaterial(0); shininess(1)`) before matte objects; lights reset each frame, call them inside render; background = full-screen textured quad drawn first with depth test off; transparent objects last, far→near; `setAttributes()` recreates the context — call once in setup; low detail args (`sphere(r,16,12)`); < ~2k primitives per frame.
**Three.js**: `preserveDrawingBuffer:true` (needed for capture); ACES tone mapping + sRGB output; EffectComposer → RenderPass → UnrealBloomPass → OutputPass; HUD = p5 canvas as `CanvasTexture` on an ortho quad rendered after the composer with `autoClear=false`; InstancedMesh for many objects (matrices from seeded base + t); `loadModel/GLTFLoader` only for user-owned or free-licensed models; set `texture.generateMipmaps=false` for per-frame canvas textures.
**Characters (stylised)**: ellipsoid head/body, capsule limbs with 2-bone IK, sphere eyes (white + pupil + highlight), blinking via KF on eye scaleY, mouth as scaled torus/ellipsoid, squash-and-stretch on impacts.
**Liquids/soft stuff**: sphere chains or tube along a noisy bezier; metaballs in 2D via threshold of summed fields on a half-res buffer.

## 7. Audio
Write `edl.json` (bgm, voiceover with startMs, sfx events on KF beats) → `python3 tools/mix_audio.py edl.json mine.mp4 final.mp4`. All delays in ms are sample-accurate (`adelay … all=1`), bgm ducks under voice, master normalised to −14 LUFS / −1 dBTP. Put SFX `startMs` exactly on the frame times of impacts (`f / fps * 1000`).

## 8. Export, chunks and speed
- render.mjs: closed GOP (`-g fps -bf 0 +cgop`, fixed timescale) so chunks rendered with `--from/--to` can be joined losslessly: `ffmpeg -f concat -safe 0 -i list.txt -c copy out.mp4` (chunk boundaries on multiples of fps).
- Re-render only changed shots: chunk = shot range; a transition range depends on both neighbours.
- `--format jpeg` for fast previews, png for masters, `--gpu` on a machine with a GPU. In the browser preview, realtime MediaRecorder is OK for drafts only.
- Before frame 0: wait for `document.fonts.ready` and all assets (templates do this in `STUDIO.ready`).
- Safe zones for vertical video: keep text out of the top ~120 px, bottom ~340 px, right ~140 px (at 1080x1920).

## 9. What code can and can't match
Near 1:1: 2D motion graphics, math/geometry art, kinetic typography, infographics, UI animations, particles, low-poly/toon 3D, product spins with PBR (Three).
Close (about 70–90% of the look, with good assets, a rig and HDRI light, in 67.js or Blender): realistic 3D scenes, vehicles, rooms, product shots, rigged characters.
Not possible from code alone: an identical copy of the original characters, live-action footage, exact cloth/fluid sims. Say the category and the honest ceiling before starting.
## 10. Self-check before delivering
- [ ] no forbidden time/random sources (`grep -nE "Math.random|Date.now|millis\(|frameCount|performance.now" ` — performance.now only in preview `draw`)
- [ ] render.mjs finished with "no page errors"
- [ ] compare.py run (recreations) and worst shot fixed
- [ ] text inside safe zones, nothing important cut at the frame edge
- [ ] output 1080x1920 (or asked size), correct fps and duration, audio muxed if any

## 11. Keep improving
After each video, append 1–3 dated lessons to a `LESSONS.md` next to this file (a bug found, a technique that matched well, the user's taste). Read `LESSONS.md` before starting the next video. Replace lessons that turned out wrong.
