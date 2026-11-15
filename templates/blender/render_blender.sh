#!/usr/bin/env bash
# Usage: bash render_blender.sh scene.py out.mp4 [draft|final|cycles] [extra args for scene.py]
# Renders frames headless, then encodes a closed-GOP H.264 MP4 (same settings as render.mjs, so chunks concat with -c copy).
set -euo pipefail
SCENE=${1:?scene.py}; OUT=${2:-out.mp4}; PRESET=${3:-draft}; shift $(( $# >= 3 ? 3 : $# ))
FR=$(mktemp -d); BLENDER=${BLENDER:-blender}
"$BLENDER" -b -P "$SCENE" -- --out "$FR/" --preset "$PRESET" "$@"
FPS=$(python3 -c "import re;print(re.search(r'FPS=(\d+)',open('$SCENE').read()).group(1))")
ffmpeg -y -framerate "$FPS" -i "$FR/%05d.png" -c:v libx264 -preset medium -crf 16 -pix_fmt yuv420p \
  -g "$FPS" -keyint_min "$FPS" -sc_threshold 0 -bf 0 -flags +cgop -movflags +faststart -an "$OUT"
echo "done -> $OUT (frames in $FR)"
