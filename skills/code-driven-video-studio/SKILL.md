---
name: code-driven-video-studio
description: >-
  Complete architecture, implementation guide, and production runbook for building
  high-performance Code-Driven Video and Motion Graphics Engines. Combines WebGL2 (Three.js),
  2D generative shaders (p5.js), DOM typography, deterministic frame stepping, Closed-GOP
  partial scene caching, sample-accurate audio EDL filtergraphs, and forgiving Zod compilers.
---

# Code-Driven Video & Motion Graphics Studio (SKILL.md)

This skill provides the comprehensive architecture, mathematical rules, and production implementation code to build, generate, and render broadcast-grade (4K 60 FPS) videos entirely through deterministic code.

---

## 1. Core Architectural Pillars

```
+-----------------------------------------------------------------------------+
|                         PREFAB DSL AST (ZOD VALIDATED)                      |
|                  Scene Timing, Relative Offsets, Asset Manifest              |
+-----------------------------------------------------------------------------+
                                       |
                   +-------------------+-------------------+
                   |                                       |
                   v                                       v
+-------------------------------------+ +-------------------------------------+
|        VISUAL COMPOSITOR            | |            AUDIO ENGINE             |
|                                     | |                                     |
| Layer 1: Three.js 3D WebGL2 FBO     | | Browser: OfflineAudioContext scrub  |
| Layer 2: Offscreen p5.js Texture    | | Master: Audio EDL JSON Manifest     |
| Layer 3: Screen-Space Shader FX     | | FFmpeg: Sample-Accurate Filtergraph |
| Layer 4: Post-Processing (Bloom/DOF)| | - adelay, sidechain auto-ducking   |
| Layer 5: Top-Level Crisp DOM/SVG    | | - EBU R128 LUFS Loudness Norm       |
+-------------------------------------+ +-------------------------------------+
                   |                                       |
                   v                                       v
+-----------------------------------------------------------------------------+
|                     CONTENT-ADDRESSABLE CHUNK CACHING                       |
|   Body Spans vs. Bridge Spans (Overlap-Aware), Closed-GOP Intra-Frame (.mp4) |
+-----------------------------------------------------------------------------+
                                       |
                                       v
+-----------------------------------------------------------------------------+
|                     CONFORM & EXPORT PIPELINE (FFMPEG)                      |
|           Zero-Re-encode Concat Demuxer + Master Audio Muxing -> MP4        |
+-----------------------------------------------------------------------------+
```

---

## 2. Layer Hierarchy & Compositing Rules

To avoid PCIe bandwidth saturation and Chromium compositor stalls, adhere to the **Hybrid Two-Surface Compositor Rule**:

| Layer | Technology | Role | Compositing Rule |
| :--- | :--- | :--- | :--- |
| **L1 (3D)** | Three.js (WebGL2) | Hero 3D models, camera motion, spatial lighting | Renders directly to WebGL Framebuffer |
| **L2 (VFX)**| p5.js (Offscreen) | Generative particles, harmonic ribbons, math VFX | Offscreen canvas bound to `THREE.CanvasTexture` |
| **L3 (FX)** | GLSL Custom Pass | Chromatic aberration, film grain, LUT grade | Post-processing pass inside `EffectComposer` |
| **L4 (Post)**| UnrealBloomPass | High-dynamic-range neon glow | Blurs both 3D objects and p5.js VFX uniformly |
| **L5 (HUD)**| Native DOM / SVG | Razor-sharp typography, vector icons, UI cards | Single transparent DOM overlay via native compositor |

### Critical Anti-Patterns:
1. **Never stack separate 4K canvas elements**: Stacking multiple DOM `<canvas>` elements forces Chromium's Skia compositor to perform multiple GPU memory readbacks and blits. Instead, render p5.js into Three.js as an offscreen texture.
2. **Never use CSS `backdrop-filter: blur()` over WebGL**: Triggers catastrophic GPU-to-GPU readback stalls. Use a Three.js Dual-Kawase shader pass beneath transparent DOM cards instead.
3. **Never bundle redundant 3D runtimes**: Drop secondary libraries like `67.js`. Use `THREE.InstancedMesh` and `THREE.BatchedMesh` natively for 100k+ instanced objects.

---

## 3. Deterministic Frame-Stepping Contract

All animations must be a **pure stateless function of frame index $f$**:
$$\text{State}(f) = \text{Evaluate}(\text{seed}, f, \text{fps})$$

```javascript
// studio-compositor.js
export class StudioCompositor {
  constructor(width = 1920, height = 1080, fps = 60) {
    this.width = width;
    this.height = height;
    this.fps = fps;

    // 1. Unified WebGL2 Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height, false);

    // 2. Offscreen p5 Instance (Autonomous loop strictly disabled)
    this.p5Instance = new p5((p) => {
      p.setup = () => {
        p.pixelDensity(1);
        p.createCanvas(width, height);
        p.noLoop();
      };
    });

    this.p5Texture = new THREE.CanvasTexture(this.p5Instance.canvas);
    this.p5Texture.minFilter = THREE.LinearFilter;
    this.p5Texture.generateMipmaps = false; // Saves ~11ms/frame at 4K

    // 3. Post-Processing Composer
    this.composer = new EffectComposer(this.renderer);
    // Add passes: RenderPass, UnrealBloomPass, CustomShaderPass...
  }

  stepFrame(frameIndex) {
    const timeSec = frameIndex / this.fps;

    // Step A: Deterministic p5 Procedural Draw
    this.p5Instance.clear();
    this.drawProceduralVFX(this.p5Instance, frameIndex, timeSec);
    this.p5Texture.needsUpdate = true;

    // Step B: Update Three.js Scene & Camera Math
    this.updateThreeScene(timeSec);
    this.composer.render();

    // Step C: Step DOM Animations Synchronously
    document.getAnimations().forEach((anim) => {
      anim.pause();
      anim.currentTime = timeSec * 1000;
    });
  }
}
```

---

## 4. Audio Engine: Sample-Accurate EDL & FFmpeg Ducking

### Audio Manifest (`audio-edl.json`)
```json
{
  "sampleRate": 48000,
  "targetLUFS": -14.0,
  "bgm": { "src": "assets/bgm.wav", "gainDb": -6.0, "duckAgainst": "voiceover" },
  "voiceover": { "src": "assets/vo.wav", "startMs": 300, "gainDb": 0.0 },
  "events": [
    { "id": "sfx_intro", "src": "sfx/whoosh.wav", "startMs": 0, "gainDb": -3.0 },
    { "id": "sfx_tick", "src": "sfx/tick.wav", "startMs": 1450, "gainDb": -8.0 }
  ]
}
```

### Deterministic FFmpeg Filtergraph Command
```bash
ffmpeg -y \
  -i video_silent.mp4 \
  -i assets/bgm.wav \
  -i assets/vo.wav \
  -i sfx/whoosh.wav \
  -i sfx/tick.wav \
  -filter_complex "
    [2:a]adelay=300|300,volume=0dB,asplit=2[vo_sc][vo_mix];
    [1:a]volume=-6dB[bgm_raw];
    [bgm_raw][vo_sc]sidechaincompress=threshold=0.03:ratio=6:attack=15:release=350[bgm_ducked];
    [3:a]adelay=0|0,volume=-3dB[sfx1];
    [4:a]adelay=1450|1450,volume=-8dB[sfx2];
    [bgm_ducked][vo_mix][sfx1][sfx2]amix=inputs=4:normalize=0,loudnorm=I=-14:TP=-1.0:LRA=11[a_out]
  " \
  -map 0:v -map "[a_out]" -c:v copy -c:a aac -b:a 320k final_master.mp4
```

---

## 5. Instant Surgical Re-Rendering (Partial Scene Caching)

### The Overlap Problem
When Scene 1 (`0s-4s`) overlaps Scene 2 (`3.7s-7.7s`) by `0.3s`, the 18 overlapping frames belong to both scenes.

### The Solution: Body Spans vs. Bridge Spans
Partition the timeline into strictly isolated render spans:
1. `Span_1_Body` (`0.0s -> 3.7s`): Depends only on `Hash(Scene_1)`
2. `Span_1_2_Bridge` (`3.7s -> 4.0s`): Depends on `Hash(Scene_1 + Scene_2 + Transition)`
3. `Span_2_Body` (`4.0s -> 7.4s`): Depends only on `Hash(Scene_2)`

### Intermediate Closed-GOP Encoding Contract
Intermediate chunks must NEVER use variable frame rates, long GOPs, or B-frames.
```bash
# Render dirty span with Closed-GOP and fixed timescale:
ffmpeg -y -f rawvideo -pix_fmt rgba -s 1920x1080 -r 60 -i pipe:0 \
  -c:v libx264 -preset veryfast -crf 14 -pix_fmt yuv420p \
  -g 30 -keyint_min 30 -sc_threshold 0 -bf 0 -flags +cgop \
  -video_track_timescale 60000 -an \
  .cache/span_2_body_hash.mp4

# Instant 0.1s Stitch via Concat Demuxer:
ffmpeg -y -f concat -safe 0 -i .cache/concat_manifest.txt \
  -i .cache/master_audio.m4a \
  -c:v copy -c:a copy -movflags +faststart final_video.mp4
```

---

## 6. Forgiving Zod Compiler ("Coerce, Clamp, and Heal")

LLMs hallucinate time units (`4000` instead of `4s`) and typos in presets. The compiler must auto-heal AST inputs rather than failing:

```typescript
import { z } from 'zod';

// Forgiving duration parser: converts '3s', '500ms', 180, or 4000 to exact integer frames at 60fps
const FrameDurationSchema = z.union([z.string(), z.number()]).transform((val) => {
  const FPS = 60;
  if (typeof val === 'number') {
    const seconds = val > 120 ? val / 1000 : val; // Auto-detect millisecond hallucinations
    return Math.max(1, Math.round(seconds * FPS));
  }
  const str = val.trim().toLowerCase();
  if (str.endsWith('ms')) return Math.max(1, Math.round((parseFloat(str) / 1000) * FPS));
  if (str.endsWith('f')) return Math.max(1, Math.round(parseFloat(str)));
  const parsed = parseFloat(str);
  return Number.isNaN(parsed) ? 180 : Math.max(1, Math.round(parsed * FPS));
});

// Scene Schema with cross-property safety clamp
export const SceneSchema = z.object({
  id: z.string().default(() => `scene_${Math.random().toString(36).slice(2, 6)}`),
  duration: FrameDurationSchema.default(180),
  overlap: FrameDurationSchema.default(0),
  bg: z.string().regex(/^#[0-9A-Fa-f]{6}$/).catch('#070A0E'),
}).transform((scene) => {
  // Guardrail: Overlap can never exceed 45% of scene duration
  const maxSafeOverlap = Math.floor(scene.duration * 0.45);
  return {
    ...scene,
    overlap: Math.min(Math.max(0, scene.overlap), maxSafeOverlap),
  };
});
```

---

## 7. High-Performance Frame Transport & Spatial Blindness Guardrails

1. **Chromium-to-FFmpeg Frame Transport**:
   * Do NOT use standard `page.screenshot({ type: 'png' })` (bottlenecks to ~6 FPS due to PNG CPU compression and Base64 IPC).
   * DO use `--enable-gpu-rasterization --enable-zero-copy` piping raw RGBA buffers (`-f rawvideo`) or browser-internal **WebCodecs API (`VideoEncoder`)** streaming hardware-accelerated NAL units directly to disk.
2. **Spatial Blindness Solver**:
   * LLMs cannot see screen layout collisions.
   * Wrap Frame 0 execution behind `await document.fonts.ready` and `await Promise.all(assetPromises)`.
   * Use screen-space projection (`Box3.project(camera)`) and `getBoundingClientRect()` to compute 2D safe zones and automatically nudge text and cards out of 3D object bounding boxes.

---

## 8. Step-by-Step Production Checklist

- [ ] **Frame Stepping Verification**: Ensure all particle systems use $P(t) = f(\text{seed}, t)$ with zero calls to `Date.now()` or unbounded `performance.now()`.
- [ ] **Surface Consolidation**: Ensure only 1 WebGL canvas and 1 DOM layer exist.
- [ ] **Audio Clock Sync**: Validate sample rate is strictly 48,000 Hz across all audio assets.
- [ ] **GOP Discipline**: Check that all cached intermediate spans are encoded with `-bf 0 -flags +cgop`.
- [ ] **Font & Asset Readiness**: Enforce `await document.fonts.ready` before frame 0 rasterization.
