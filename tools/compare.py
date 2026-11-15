#!/usr/bin/env python3
"""Score a render against the reference, per shot. Usage: python3 compare.py ref.mp4 mine.mp4 ana/analysis.json [--n 6]
Prints SSIM-like structure score, colour distance, motion-curve correlation per shot; worst shot first. Needs numpy, pillow, ffmpeg."""
import sys, json, subprocess, os, tempfile, argparse
import numpy as np
from PIL import Image
def frame(p, t, w=180, h=320):
    d = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', p, '-frames:v', '1', '-vf', f'scale={w}:{h}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    return np.frombuffer(d, np.uint8).reshape(h, w, 3).astype(np.float32) if len(d) == w * h * 3 else None
def ssim(a, b):
    a, b = a.mean(2), b.mean(2); C1, C2 = 6.5, 58.5; ma, mb = a.mean(), b.mean(); va, vb = a.var(), b.var(); cov = ((a - ma) * (b - mb)).mean()
    return float(((2 * ma * mb + C1) * (2 * cov + C2)) / ((ma ** 2 + mb ** 2 + C1) * (va + vb + C2)))
def blockssim(a, b, n=8):
    H, W = a.shape[:2]; s = [ssim(a[y:y + H // n, x:x + W // n], b[y:y + H // n, x:x + W // n]) for y in range(0, H - H // n + 1, H // n) for x in range(0, W - W // n + 1, W // n)]
    return float(np.mean(s))
ap = argparse.ArgumentParser(); ap.add_argument('ref'); ap.add_argument('mine'); ap.add_argument('ana'); ap.add_argument('--n', type=int, default=6); o = ap.parse_args()
A = json.load(open(o.ana)); rows = []
for s in A['shots']:
    ts = np.linspace(s['start'] + 0.02, s['end'] - 0.04, o.n); S, C, mr, mm = [], [], [], []; pr = pm = None
    for t in ts:
        r, m = frame(o.ref, t), frame(o.mine, t)
        if r is None or m is None: continue
        S.append(blockssim(r, m)); C.append(float(np.abs(r.mean((0, 1)) - m.mean((0, 1))).mean()))
        if pr is not None: mr.append(np.abs(r - pr).mean()); mm.append(np.abs(m - pm).mean())
        pr, pm = r, m
    mc = float(np.corrcoef(mr, mm)[0, 1]) if len(mr) > 2 and np.std(mr) > 0 and np.std(mm) > 0 else float('nan')
    score = (np.mean(S) if S else 0) - (np.mean(C) / 255 if C else 1)
    rows.append((score, s['id'], s['start'], s['end'], np.mean(S) if S else 0, np.mean(C) if C else 0, mc))
rows.sort()
print('shot  time         structure  colourDiff  motionCorr   (worst first)')
for sc, i, a, b, ss, cd, mc in rows: print(f'{i:>4}  {a:5.2f}-{b:5.2f}   {ss:8.3f}  {cd:9.1f}  {mc:9.2f}')
print(f'overall structure {np.mean([r[4] for r in rows]):.3f}  colour {np.mean([r[5] for r in rows]):.1f}')
