# Deterministic Blender scene built entirely in code (Blender 4.x, bpy).
# Run: blender -b -P scene.py -- --out frames/ --preset draft|final [--kf kf.json] [--hdri env.hdr] [--from 0 --to N]
# Every animated value comes from KF (same [[t, value, ease], ...] format as studio-core.js); no random state.
import bpy, sys, json, math, os, argparse

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--out", default="frames/"); ap.add_argument("--preset", default="draft")
ap.add_argument("--kf", default=None); ap.add_argument("--hdri", default=None)
ap.add_argument("--from", dest="f0", type=int, default=0); ap.add_argument("--to", dest="f1", type=int, default=-1)
A = ap.parse_args(argv)

CONFIG = dict(W=1080, H=1920, FPS=30, DURATION=6.0, SEED=7)
PRESETS = {  # 4 GB GPU safe: draft for checks, final once
    "draft": dict(engine="BLENDER_EEVEE_NEXT", scale=50, samples=16, shadows=True),
    "final": dict(engine="BLENDER_EEVEE_NEXT", scale=100, samples=64, shadows=True),
    "cycles": dict(engine="CYCLES", scale=100, samples=128, shadows=True),  # hero shots only
}
KF = {  # seconds, value, ease. Replace with measured tracks (track_camera.py output) via --kf
    "cam_pos": [[0, [0, -9, 2.2], "inOutSine"], [6, [5, -6, 3.0], "linear"]],
    "cam_target": [[0, [0, 0, 1], "linear"], [6, [0, 0, 1], "linear"]],
    "hero_x": [[0, -3.0, "inOutCubic"], [4, 3.0, "linear"], [6, 3.0, "linear"]],
    "sun_angle": [[0, 35, "linear"], [6, 45, "linear"]],
}
if A.kf: KF.update(json.load(open(A.kf)))

EZ = {"linear": lambda u: u, "inOutSine": lambda u: -(math.cos(math.pi * u) - 1) / 2,
      "inOutCubic": lambda u: 4*u**3 if u < .5 else 1 - (-2*u + 2)**3 / 2,
      "outCubic": lambda u: 1 - (1-u)**3, "outExpo": lambda u: 1 if u >= 1 else 1 - 2**(-10*u),
      "inExpo": lambda u: 0 if u <= 0 else 2**(10*u - 10)}
def lerp(a, b, u): return [x + (y - x)*u for x, y in zip(a, b)] if isinstance(a, list) else a + (b - a)*u
def kf(tr, t):
    if t <= tr[0][0]: return tr[0][1]
    for (t0, v0, e), (t1, v1, _) in zip(tr, tr[1:]):
        if t <= t1: return lerp(v0, v1, EZ.get(e, EZ["linear"])((t - t0) / max(t1 - t0, 1e-9)))
    return tr[-1][1]

# ---- scene, built once ----
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; P = PRESETS[A.preset]
sc.render.engine = P["engine"]; sc.render.resolution_x, sc.render.resolution_y = CONFIG["W"], CONFIG["H"]
sc.render.resolution_percentage = P["scale"]; sc.render.fps = CONFIG["FPS"]
sc.render.image_settings.file_format = "PNG"; sc.view_settings.view_transform = "AgX"
if P["engine"] == "CYCLES":
    sc.cycles.samples = P["samples"]; sc.cycles.use_denoising = True; sc.cycles.seed = CONFIG["SEED"]
    try: bpy.context.preferences.addons["cycles"].preferences.compute_device_type = "CUDA"; sc.cycles.device = "GPU"
    except Exception: pass
else:
    try: sc.eevee.taa_render_samples = P["samples"]; sc.eevee.use_shadows = P["shadows"]
    except Exception: pass

world = bpy.data.worlds.new("W"); sc.world = world; world.use_nodes = True
bg = world.node_tree.nodes["Background"]
if A.hdri and os.path.exists(A.hdri):  # Poly Haven HDRI (CC0), 2K is enough on 4 GB
    env = world.node_tree.nodes.new("ShaderNodeTexEnvironment"); env.image = bpy.data.images.load(A.hdri)
    world.node_tree.links.new(env.outputs["Color"], bg.inputs["Color"])
else:
    bg.inputs["Color"].default_value = (0.55, 0.62, 0.75, 1); bg.inputs["Strength"].default_value = 0.6

def mat(name, rgb, rough=0.5, metal=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    return m
bpy.ops.mesh.primitive_plane_add(size=60); ground = bpy.context.object; ground.data.materials.append(mat("ground", (0.32, 0.30, 0.27), 0.9))
# hero: replace with a glTF/FBX asset you own or that is CC licensed: bpy.ops.import_scene.gltf(filepath="hero.glb")
bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 0.75)); hero = bpy.context.object
hero.scale = (2.4, 1.0, 1.5); hero.data.materials.append(mat("paint", (0.70, 0.08, 0.06), 0.25, 0.6))
bpy.ops.object.modifier_add(type="BEVEL"); hero.modifiers[-1].width = 0.06; hero.modifiers[-1].segments = 3
bpy.ops.object.light_add(type="SUN"); sun = bpy.context.object; sun.data.energy = 3.5; sun.data.angle = math.radians(2)
bpy.ops.object.camera_add(); cam = bpy.context.object; sc.camera = cam; cam.data.lens = 35
bpy.ops.object.empty_add(); tgt = bpy.context.object
tc = cam.constraints.new("TRACK_TO"); tc.target = tgt; tc.track_axis = "TRACK_NEGATIVE_Z"; tc.up_axis = "UP_Y"

def render(t):  # pure function of t
    cam.location = kf(KF["cam_pos"], t); tgt.location = kf(KF["cam_target"], t)
    hero.location.x = kf(KF["hero_x"], t)
    sun.rotation_euler = (math.radians(kf(KF["sun_angle"], t)), 0, math.radians(30))

total = round(CONFIG["DURATION"] * CONFIG["FPS"]); f1 = total if A.f1 < 0 else A.f1
os.makedirs(A.out, exist_ok=True)
for f in range(A.f0, f1):
    render(f / CONFIG["FPS"]); sc.frame_set(f)
    sc.render.filepath = os.path.join(A.out, f"{f:05d}.png"); bpy.ops.render.render(write_still=True)
print(f"done {f1 - A.f0} frames -> {A.out}")
