# Code-Driven Video & Motion Graphics Studio

An enterprise-grade, deterministic architecture for generating broadcast-quality (4K 60 FPS) motion graphics and video entirely through code.

## Key Features

- **Hybrid Two-Surface Compositor**: High-performance WebGL2 FBO (Three.js 3D + offscreen p5.js textures) merged with crisp vector DOM/SVG typography.
- **Deterministic Frame-Stepping**: Pure mathematical animation clocks ($P(t) = f(\text{seed}, t)$) with zero clock jitter in headless Chromium.
- **Instant Surgical Re-rendering**: Transition-aware body and bridge span caching using Merkle AST hashing and Closed-GOP intermediate slices stitched via FFmpeg concat demuxer.
- **Sample-Accurate Audio Engine**: Browser `OfflineAudioContext` for live scrubbing combined with compiled `audio-edl.json` FFmpeg filtergraphs (auto-ducking and EBU R128 LUFS normalization).
- **Forgiving Zod Compiler**: 3-gate "Coerce, Clamp, and Heal" AST parser with fuzzy enum recovery and duration unit parsing.
- **Spatial Collision Solver**: Resolves LLM spatial blindness by dynamically measuring 2D screen projections of 3D objects and adjusting typography bounding boxes.

## Repository Structure

```
├── skills/
│   └── code-driven-video-studio/
│       └── SKILL.md                 # Complete Antigravity & Agentic Skill Guide
├── research.md                      # Foundational engine research & Q&A
├── research2.md                     # Red-teaming critique, blind spots & audio EDL
└── projects/
    └── Hybrid_Studio_Production/    # Working reference implementation
        ├── index.html               # Master Studio GUI
        ├── sketch.js                # Deterministic multi-scene compositor
        ├── clips/                   # Cyber Core, Voxel Horizon, Fintech Card
        └── renders/                 # Exported MP4 master files
```

## Loading as an AI Agent Skill

This skill is registered in:
- System Global Path: `~/.gemini/config/skills/code-driven-video-studio/SKILL.md`
- Workspace Path: `./skills/code-driven-video-studio/SKILL.md`
