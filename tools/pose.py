#!/usr/bin/env python3
"""Reference video -> human pose -> BVH (for retargeting onto a Mixamo / MPFB2 rig in Blender or 67.js).
Usage: python3 pose.py ref.mp4 --out pose.bvh [--json pose.json] [--smooth 5]
Needs: pip install mediapipe opencv-python-headless numpy
Output is world landmarks (metres, hip-centred) converted to a simple BVH with positional joints;
use Blender's BVH import + a retarget addon (e.g. Rokoko/auto-rig) to put it on your character.
Recovers motion only, never the original character's look."""
import argparse, json, sys
import numpy as np, cv2
NAMES = ["nose","l_eye_in","l_eye","l_eye_out","r_eye_in","r_eye","r_eye_out","l_ear","r_ear","mouth_l","mouth_r",
 "l_shoulder","r_shoulder","l_elbow","r_elbow","l_wrist","r_wrist","l_pinky","r_pinky","l_index","r_index","l_thumb","r_thumb",
 "l_hip","r_hip","l_knee","r_knee","l_ankle","r_ankle","l_heel","r_heel","l_foot","r_foot"]
USE = [0,11,12,13,14,15,16,23,24,25,26,27,28,31,32]
def main():
    ap = argparse.ArgumentParser(); ap.add_argument("video"); ap.add_argument("--out", default="pose.bvh")
    ap.add_argument("--json", default=None); ap.add_argument("--smooth", type=int, default=5); a = ap.parse_args()
    try: import mediapipe as mp
    except ImportError: sys.exit("pip install mediapipe")
    cap = cv2.VideoCapture(a.video); fps = cap.get(cv2.CAP_PROP_FPS) or 30; frames = []
    with mp.solutions.pose.Pose(model_complexity=2, smooth_landmarks=True) as pose:
        while True:
            ok, img = cap.read()
            if not ok: break
            r = pose.process(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
            if r.pose_world_landmarks: frames.append([[l.x, -l.y, -l.z] for l in r.pose_world_landmarks.landmark])
            else: frames.append(frames[-1] if frames else [[0, 0, 0]] * 33)
    if not frames: sys.exit("no frames / no person found")
    X = np.array(frames)  # F x 33 x 3
    if a.smooth > 1:  # moving average, removes jitter (foot slip check: watch ankle y on contact frames)
        k = np.ones(a.smooth) / a.smooth
        X = np.stack([np.stack([np.convolve(X[:, j, c], k, mode="same") for c in range(3)], -1) for j in range(33)], 1)
    hip = (X[:, 23] + X[:, 24]) / 2
    if a.json: json.dump({"fps": fps, "names": NAMES, "frames": X.round(4).tolist()}, open(a.json, "w"))
    with open(a.out, "w") as f:  # flat BVH: root = hips, every used landmark a child with XYZ position channels (cm)
        f.write("HIERARCHY\nROOT hips\n{\n  OFFSET 0 0 0\n  CHANNELS 3 Xposition Yposition Zposition\n")
        for j in USE: f.write(f"  JOINT {NAMES[j]}\n  {{\n    OFFSET 0 0 0\n    CHANNELS 3 Xposition Yposition Zposition\n    End Site\n    {{\n      OFFSET 0 1 0\n    }}\n  }}\n")
        f.write(f"}}\nMOTION\nFrames: {len(X)}\nFrame Time: {1/fps:.6f}\n")
        for i in range(len(X)):
            row = list(hip[i] * 100) + [v for j in USE for v in (X[i, j] - hip[i]) * 100]
            f.write(" ".join(f"{v:.3f}" for v in row) + "\n")
    print(f"{len(X)} frames @ {fps:.2f} fps -> {a.out}")
if __name__ == "__main__": main()
