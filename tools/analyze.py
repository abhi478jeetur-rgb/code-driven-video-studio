#!/usr/bin/env python3
"""Reference-video analyzer -> analysis.json + analysis.md + contact sheets.
Usage: python3 analyze.py ref.mp4 --out ana [--fps native|N] [--scene 0.3] [--track "x,y,w,h@t"]... [--target 540x960]
Needs: ffmpeg/ffprobe, numpy, pillow; opencv-python for camera solve + tracking (optional, auto-skipped)."""
import argparse, json, os, subprocess, glob, math
import numpy as np
from PIL import Image
try:
    import cv2
except Exception:
    cv2 = None

def sh(cmd): return subprocess.run(cmd, capture_output=True, text=True)

def probe(p):
    r = json.loads(sh(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', p]).stdout)
    v = next(s for s in r['streams'] if s['codec_type'] == 'video')
    num, den = map(int, v.get('avg_frame_rate', '30/1').split('/'))
    return {'w': int(v['width']), 'h': int(v['height']), 'fps': num / den if den else 30.0,
            'duration': float(r['format']['duration']), 'audio': any(s['codec_type'] == 'audio' for s in r['streams'])}

def scene_cuts(p, thr):
    e = sh(['ffmpeg', '-i', p, '-vf', f"select='gt(scene,{thr})',showinfo", '-f', 'null', '-']).stderr
    return [float(l.split('pts_time:')[1].split()[0]) for l in e.splitlines() if 'pts_time:' in l]

def extract(p, out, fps):
    os.makedirs(out, exist_ok=True)
    sh(['ffmpeg', '-y', '-i', p, '-vf', f'fps={fps},scale=360:-2', '-q:v', '3', f'{out}/%05d.jpg'])
    return sorted(glob.glob(f'{out}/*.jpg'))

def gray(f, w=160):
    im = Image.open(f).convert('L'); h = int(im.height * w / im.width)
    return np.asarray(im.resize((w, h)), dtype=np.float32)

def palette(files, k=5):
    px = np.concatenate([np.asarray(Image.open(f).convert('RGB').resize((48, 85))).reshape(-1, 3) for f in files]).astype(np.float32)
    rs = np.random.default_rng(0); c = px[rs.choice(len(px), k, replace=False)]
    for _ in range(12):
        lab = ((px[:, None] - c[None]) ** 2).sum(-1).argmin(1)
        c = np.array([px[lab == i].mean(0) if (lab == i).any() else c[i] for i in range(k)])
    share = np.bincount(lab, minlength=k) / len(lab); o = np.argsort(-share)
    return [{'hex': '#%02x%02x%02x' % tuple(int(v) for v in c[i]), 'share': round(float(share[i]), 3)} for i in o]

def camera_solve(a, b):
    """similarity transform b<-a: pan px, zoom, roll deg (360-wide frames)."""
    if cv2 is None: return None
    A, B = a.astype(np.uint8), b.astype(np.uint8)
    pts = cv2.goodFeaturesToTrack(A, 300, 0.01, 6)
    if pts is None or len(pts) < 8: return None
    nxt, st, _ = cv2.calcOpticalFlowPyrLK(A, B, pts, None)
    good = st.ravel() == 1
    if good.sum() < 8: return None
    M, _ = cv2.estimateAffinePartial2D(pts[good], nxt[good], method=cv2.RANSAC)
    if M is None: return None
    s = math.hypot(M[0, 0], M[1, 0])
    return {'dx': float(M[0, 2]), 'dy': float(M[1, 2]), 'zoom': float(s), 'roll': float(math.degrees(math.atan2(M[1, 0], M[0, 0])))}

def rdp(pts, eps):
    if len(pts) < 3: return pts
    a, b = np.array(pts[0][1:]), np.array(pts[-1][1:]); d = b - a; n = np.linalg.norm(d) or 1
    dist = [abs(d[0] * (p[2] - a[1]) - d[1] * (p[1] - a[0])) / n for p in pts[1:-1]]
    i = int(np.argmax(dist)) + 1
    if dist[i - 1] > eps: return rdp(pts[:i + 1], eps)[:-1] + rdp(pts[i:], eps)
    return [pts[0], pts[-1]]

EASES = {'linear': lambda u: u, 'inOutSine': lambda u: -(np.cos(np.pi * u) - 1) / 2, 'outCubic': lambda u: 1 - (1 - u) ** 3,
         'inCubic': lambda u: u ** 3, 'outExpo': lambda u: 1 - 2 ** (-10 * u), 'inExpo': lambda u: 2 ** (10 * u - 10),
         'outBack': lambda u: 1 + 2.70158 * (u - 1) ** 3 + 1.70158 * (u - 1) ** 2}
def fit_ease(seg):
    if len(seg) < 4: return 'linear'
    p = np.array([s[1:] for s in seg]); tot = np.linalg.norm(p[-1] - p[0])
    if tot < 1e-6: return 'hold'
    t = np.array([s[0] for s in seg]); u = (t - t[0]) / (t[-1] - t[0])
    prog = np.clip(np.linalg.norm(p - p[0], axis=1) / tot, 0, 1.2)
    return min(EASES, key=lambda k: float(((EASES[k](u) - prog) ** 2).mean()))

def track(files, fps, box, t0, scale):
    """template-match a box (x,y,w,h in ORIGINAL px) from time t0 forward -> keyframes in target px."""
    if cv2 is None: return None
    sx = 360 / scale['srcW']; x, y, w, h = [int(v * sx) for v in box]
    i0 = int(t0 * fps); img = cv2.imread(files[i0], 0); tpl = img[y:y + h, x:x + w]; raw = []
    for i in range(i0, len(files)):
        im = cv2.imread(files[i], 0); r = cv2.matchTemplate(im, tpl, cv2.TM_CCOEFF_NORMED); _, conf, _, loc = cv2.minMaxLoc(r)
        if conf < 0.45: break
        cx, cy = (loc[0] + w / 2) / 360 * scale['W'], (loc[1] + h / 2) / (im.shape[0]) * scale['H']
        raw.append([round(i / fps, 4), round(cx, 1), round(cy, 1)])
    keys = rdp(raw, 4.0); out = []
    for j, k in enumerate(keys):
        if j == 0: out.append([k[0], [k[1], k[2]]]); continue
        seg = [r for r in raw if keys[j - 1][0] <= r[0] <= k[0]]
        out.append([k[0], [k[1], k[2]], fit_ease(seg)])
    return {'box': box, 'from': t0, 'samples': len(raw), 'kf': out}

def sheet(files, path, cols=6, w=160):
    if not files: return
    ims = [Image.open(f) for f in files]; h = int(ims[0].height * w / ims[0].width); rows = math.ceil(len(ims) / cols)
    S = Image.new('RGB', (cols * w, rows * h))
    for i, im in enumerate(ims): S.paste(im.resize((w, h)), ((i % cols) * w, (i // cols) * h))
    S.save(path, quality=85)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('video'); ap.add_argument('--out', default='ana'); ap.add_argument('--fps', default='native')
    ap.add_argument('--scene', type=float, default=0.3); ap.add_argument('--track', action='append', default=[]); ap.add_argument('--target', default='540x960')
    o = ap.parse_args(); os.makedirs(o.out, exist_ok=True); m = probe(o.video)
    fps = m['fps'] if o.fps == 'native' else float(o.fps)
    if o.fps == 'native' and m['duration'] > 60: fps = 15.0  # long video: cap, cuts still exact
    W, H = map(int, o.target.split('x')); scale = {'srcW': m['w'], 'W': W, 'H': H}
    files = extract(o.video, f'{o.out}/frames', fps); cuts = scene_cuts(o.video, o.scene)
    bounds = [0.0] + [c for c in cuts if c > 0.05] + [m['duration']]
    G = [gray(f) for f in files]
    motion = [0.0] + [float(np.abs(G[i] - G[i - 1]).mean()) for i in range(1, len(G))]
    cam = [None] + [camera_solve(G[i - 1], G[i]) for i in range(1, len(G))]
    shots = []
    for si in range(len(bounds) - 1):
        a, b = bounds[si], bounds[si + 1]; idx = [i for i in range(len(files)) if a <= i / fps < b]
        if not idx: continue
        cs = [cam[i] for i in idx[1:] if cam[i]]
        pan = [sum(c['dx'] for c in cs), sum(c['dy'] for c in cs)] if cs else [0, 0]
        zoom = float(np.prod([c['zoom'] for c in cs])) if cs else 1.0
        roll = sum(c['roll'] for c in cs) if cs else 0.0
        kind = 'static'
        if abs(zoom - 1) > 0.04: kind = 'push-in' if zoom > 1 else 'pull-out'
        if math.hypot(*pan) > 20: kind = (kind + '+' if kind != 'static' else '') + 'pan/orbit'
        if cs and np.std([c['dx'] for c in cs]) > 2.5: kind += '+shake'
        mo = [motion[i] for i in idx]
        sheet([files[i] for i in idx[::max(1, len(idx) // 24)]], f'{o.out}/shot_{si:02d}.jpg')
        shots.append({'id': si, 'start': round(a, 3), 'end': round(b, 3), 'frames': len(idx), 'camera': kind,
                      'pan_px_total': [round(pan[0] / 360 * W, 1), round(pan[1] / 360 * W, 1)], 'zoom_total': round(zoom, 3), 'roll_deg': round(roll, 2),
                      'motion_mean': round(float(np.mean(mo)), 2), 'motion_peak_t': round(idx[int(np.argmax(mo))] / fps, 3),
                      'palette': palette([files[i] for i in idx[::max(1, len(idx) // 6)]]),
                      'key_frames': [files[idx[0]], files[idx[len(idx) // 2]], files[idx[-1]]]})
    tracks = []
    for t in o.track:
        bx, tt = t.split('@'); tracks.append(track(files, fps, [float(v) for v in bx.split(',')], float(tt), scale))
    res = {'meta': m, 'analysis_fps': fps, 'target': [W, H], 'cuts': cuts, 'shots': shots, 'tracks': tracks,
           'motion_curve': [round(v, 2) for v in motion], 'camera_per_frame': cam, 'opencv': cv2 is not None}
    json.dump(res, open(f'{o.out}/analysis.json', 'w'), indent=1)
    L = [f"# Analysis: {os.path.basename(o.video)}", f"{m['w']}x{m['h']} {m['fps']:.2f}fps {m['duration']:.2f}s audio={m['audio']} | analysed at {fps:.2f}fps | opencv={cv2 is not None}", '',
         '| shot | time | camera | pan(px) | zoom | motion | palette | 2D/3D (fill in) | what is on screen (fill in) |', '|---|---|---|---|---|---|---|---|---|']
    for s in shots:
        L.append(f"| {s['id']} | {s['start']}-{s['end']} | {s['camera']} | {s['pan_px_total']} | {s['zoom_total']} | {s['motion_mean']} (peak {s['motion_peak_t']}s) | {' '.join(p['hex'] for p in s['palette'][:4])} | | |")
    open(f'{o.out}/analysis.md', 'w').write('\n'.join(L) + '\n')
    print(f"{len(shots)} shots, {len(files)} frames -> {o.out}/analysis.md, analysis.json, shot_XX.jpg")

if __name__ == '__main__': main()
