# 🎬 Hybrid Creative Studio: Full-Production Web Video Engine

> **A Next-Gen Motion Graphics Pipeline combining Three.js, p5.js, Anime.js, and Shadcn Glassmorphic UI.**  
> Zero npm install required • 100% CDN-powered • Directly compatible with [editor.p5js.org](https://editor.p5js.org/) • One-click 60 FPS video export.

---

## 🏛️ System Architecture: The 4-Layer Hybrid Stack

```
┌────────────────────────────────────────────────────────┐
│ Layer 4: HTML + CSS + Shadcn UI Tokens (Top Overlay)   │
│  - Retina-sharp typography (Inter & JetBrains Mono)     │
│  - Glassmorphic HUDs, Status pills, Live tickers       │
│  - CSS backdrop-filter: blur(16px), glowing borders    │
├────────────────────────────────────────────────────────┤
│ Layer 3: p5.js (Procedural VFX & Mathematical Curves) │
│  - 100+ Neon particle physics & attraction forces      │
│  - Warp starfield streaks & concentric laser shocks    │
│  - Harmonic fluid ribbon sine-waves                    │
├────────────────────────────────────────────────────────┤
│ Layer 2: Three.js (Hero 3D Assets & Lighting)          │
│  - 3D nested meshes (Cyber Core, Rings, Satellites)    │
│  - 3D Titanium Smart Card with PBR anisotropic sheen   │
│  - Studio lighting, point lights, and dynamic camera   │
├────────────────────────────────────────────────────────┤
│ Layer 1: 67.js Lightweight Voxel Horizon Architecture  │
│  - InstancedMesh canyon of 80 neon skyscrapers         │
│  - Procedural infinite scrolling grid terrain          │
│  - Memory footprint < 18 MB at 60 FPS                  │
└────────────────────────────────────────────────────────┘
                           ▲
                           │ Orchestrated By
┌────────────────────────────────────────────────────────┐
│ MASTER CLOCK: Anime.js (Deterministic Timeline)        │
│  - Single 10.00s normalized timeline (600 frames)      │
│  - Synchronized camera dolly + particle emit + text    │
└────────────────────────────────────────────────────────┘
```

---

## 📦 Project Directory Breakdown

```
projects/Hybrid_Studio_Production/
│
├── index.html                 # Master Studio with Clip Switcher & 1-Click Export
├── style.css                  # Modern Shadcn-inspired dark mode styling
├── sketch.js                  # Master multi-scene engine (All clips combined + switcher)
├── README.md                  # Complete architectural guide & p5.js editor manual
│
└── clips/                     # Standalone 10s production clips for editor.p5js.org
    ├── clip1_cyber_core/      # Three.js Cyber Core + p5 Sparks + Quantum AI HUD
    ├── clip2_voxel_horizon/   # 67-Style Instanced Voxel Flight + Warp Starfield
    └── clip3_fintech_card/    # 3D Titanium Holographic Card + Fluid Sine Ribbons
```

---

## 🚀 How to Run in `https://editor.p5js.org/`

Any of the clips in `clips/` can be pasted into the official p5.js online editor in 3 easy steps:

### Step 1: In `index.html` (p5.js Editor)
Include the 3 CDNs in `<head>`:
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.1/anime.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.4/p5.min.js"></script>
```
And add the 3 layer containers in `<body>`:
```html
<div id="video-container">
  <div id="three-container"></div>
  <div id="p5-container"></div>
  <div id="hud-overlay">
    <!-- UI typography & telemetry -->
  </div>
</div>
```

### Step 2: In `style.css` (p5.js Editor)
Paste the contents of `style.css` to enable:
- Absolute layer stacking (`z-index: 1`, `z-index: 2`, `z-index: 3`).
- `pointer-events: none` on overlay layers so canvas controls remain responsive.
- Glassmorphic backdrop blur and glowing neon drop-shadows.

### Step 3: In `sketch.js` (p5.js Editor)
Paste the contents of `sketch.js`:
- In `setup()`: Creates p5 canvas into `#p5-container`, initializes Three.js into `#three-container`.
- In `draw()`: Calls `clear()` to keep p5 transparent, updates 3D scene, and updates DOM HUD.

---

## 🎥 One-Click 60 FPS Video Export
- **Press `R`** or click the **EXPORT 60FPS WEBM** button.
- The engine automatically composites both the Three.js 3D WebGL buffer and the p5.js 2D VFX canvas into a 16 Mbps video stream.
- After exactly 10.00 seconds (600 frames), the recording automatically finishes and downloads a pristine `.webm` file directly to your browser!
- **Playback Controls**:
  - `Space`: Pause / Resume.
  - `Left / Right Arrows`: Scrub backward / forward 0.5s.
  - `Timeline Bar Click`: Jump to any exact timecode instantly.
