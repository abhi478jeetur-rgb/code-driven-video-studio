# Code-Driven Video Studio v2

Give `SKILL.md` (plus this folder) to any coding agent. It analyses a reference video, writes deterministic p5.js / Three.js code, renders an MP4 frame by frame, and scores it against the reference.

Quick start:
    pip install numpy pillow opencv-python-headless
    npm i playwright && npx playwright install --with-deps chromium
    python3 tools/analyze.py ref.mp4 --out ana
    node tools/render.mjs templates/p5-2d --out test.mp4
    python3 tools/compare.py ref.mp4 test.mp4 ana/analysis.json

## What changed from v1 (fixes)
- v1 code broke its own determinism rule (Math.random / random() particles mutated every frame). v2: every frame is render(t) with seeded rng/hash; a self-check grep catches it.
- v1 exported realtime MediaRecorder WebM (dropped frames, variable timing). v2: tools/render.mjs steps every frame headless and pipes it to ffmpeg (closed-GOP H.264 MP4, chunkable with --from/--to).
- v1 put text in DOM/SVG layers, which canvas capture never records. v2: all text is drawn on the canvas (p5 HUD texture in the Three template).
- v1 had no way to study a reference video. v2: tools/analyze.py (cuts, per-shot camera solve, palette, motion curve, object tracking -> keyframes with fitted easing) + tools/compare.py (score + fix loop).
- v1 described Zod compiler, Merkle cache, audio engine and WebCodecs in docs only. v2 ships working pieces instead: KF timeline (no compiler needed), chunk re-render via --from/--to, tools/mix_audio.py (adelay all=1, sidechain duck, loudnorm -14 LUFS).
- v1 defaulted to 1920x1080; v2 defaults to 1080x1920 Shorts with safe zones.
- Removed ~220 KB research files from the agent path (too long for an agent context); the skill is one 11 KB file.
- Fixed "67.js" typo; antialias/setAttributes and p5 WEBGL material-state bugs documented.

## Tested
analyze.py and compare.py were run on a test clip. All JS passes `node --check`. render.mjs and the three templates were NOT rendered in the build sandbox (Chromium was missing system libraries there); the first run on your machine is the real test, and any page error is printed.

## Older material
- projects/Hybrid_Studio_Production: v1 reference demo (Three.js + p5, realtime WebM).
- research.md, research2.md: v1 background research (not needed by the agent).
