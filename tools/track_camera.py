#!/usr/bin/env python3
"""Reference video -> camera path -> KF json (cam_pos / cam_target) for templates/blender/scene.py or Three.
Usage: python3 track_camera.py ref.mp4 --out ana/cam [--fps 10] [--scale 1.0]
Needs COLMAP on PATH (apt install colmap / colmap.github.io). Without COLMAP use Blender's Movie Clip tracker
(Track > Solve Camera) and export the camera instead.
Scale is unknown from video alone: set --scale so a known object (car ~4.5 m, door ~2 m) has the right size."""
import argparse, json, os, subprocess, shutil, sys
import numpy as np
def qrot(q):
    w, x, y, z = q
    return np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)], [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])
def main():
    ap = argparse.ArgumentParser(); ap.add_argument("video"); ap.add_argument("--out", default="cam")
    ap.add_argument("--fps", type=float, default=10); ap.add_argument("--scale", type=float, default=1.0); a = ap.parse_args()
    if not shutil.which("colmap"): sys.exit("COLMAP not found. Install it, or solve the camera in Blender's tracker.")
    img = os.path.join(a.out, "img"); sp = os.path.join(a.out, "sparse"); txt = os.path.join(a.out, "txt")
    for d in (img, sp, txt): os.makedirs(d, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", a.video, "-vf", f"fps={a.fps}", os.path.join(img, "%05d.jpg")], check=True)
    db = os.path.join(a.out, "db.db"); run = lambda *c: subprocess.run(["colmap", *c], check=True)
    run("feature_extractor", "--database_path", db, "--image_path", img, "--ImageReader.single_camera", "1")
    run("sequential_matcher", "--database_path", db)
    run("mapper", "--database_path", db, "--image_path", img, "--output_path", sp)
    run("model_converter", "--input_path", os.path.join(sp, "0"), "--output_path", txt, "--output_type", "TXT")
    poses = {}
    lines = [l for l in open(os.path.join(txt, "images.txt")) if not l.startswith("#")]
    for l in lines[::2]:
        p = l.split()
        if len(p) < 10: continue
        q = list(map(float, p[1:5])); t = np.array(list(map(float, p[5:8]))); R = qrot(q)
        c = -R.T @ t; fwd = R.T @ np.array([0, 0, 1])
        poses[int(p[9].split(".")[0])] = (c, c + fwd * 5)
    if not poses: sys.exit("COLMAP found no poses (too little parallax or texture)")
    ks = sorted(poses); conv = lambda v: [round(float(v[0]) * a.scale, 4), round(float(v[2]) * a.scale, 4), round(-float(v[1]) * a.scale, 4)]  # COLMAP -> Blender Z-up
    kf = {"cam_pos": [[(k - 1) / a.fps, conv(poses[k][0]), "linear"] for k in ks],
          "cam_target": [[(k - 1) / a.fps, conv(poses[k][1]), "linear"] for k in ks]}
    json.dump(kf, open(os.path.join(a.out, "camera_kf.json"), "w"))
    print(f"{len(ks)} solved frames -> {a.out}/camera_kf.json  (pass with --kf to scene.py)")
if __name__ == "__main__": main()
