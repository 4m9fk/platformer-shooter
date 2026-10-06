"""Generate animation frames of the reference character via local ComfyUI (SDXL + IP-Adapter + OpenPose ControlNet).

Usage: python gen_anim.py <round_name> [frame ...]     e.g. python gen_anim.py r1 walk_0 jump_2
Pose images come from generated/anim/poses (see poses.py). Without frame names every pose is rendered.
Results go to generated/anim/<round_name>/ with prompt.json and a contact sheet _sheet.png.
"""
import json, shutil, sys, time
from pathlib import Path

from gen_character import CKPT, CLIP_VISION, IPA_STYLE, contact_sheet, download, run

ROOT = Path(__file__).resolve().parent.parent
POSES = ROOT / "generated" / "anim" / "poses"
COMFY_INPUT = Path.home() / "ai" / "ComfyUI" / "input"
CHAR_REF = "char_ref.png"  # in ComfyUI/input
CONTROLNET = "openpose_sdxl_xinsir.safetensors"

CHARACTER = (
    "(2d cartoon game character sprite:1.3), full body, single character, side view facing right, "
    "(chibi proportions:1.2), oversized head, small body, "
    "boy with (short tousled light brown hair:1.2), (big round blue-gray eyes:1.1), large dark pupils, "
    "small rounded nose, ears sticking out, smile showing two front teeth, "
    "(red t-shirt with white collar and white sleeve trims:1.2), short red cape, dark brown shorts, "
    "white socks, white sneakers with black soles, "
    "(gray sci-fi blaster pistol with blue glowing barrel in right hand:1.1), "
    "(thick dark brown outlines:1.3), (flat cel shading with one shadow tone:1.2), clean vector game art, "
    "(plain white background:1.3), isolated, no ground shadow"
)
ACTIONS = {
    "walk": "walking",
    "jump": "jumping, dynamic jump pose",
    "shoot": "shooting the blaster, arm extended forward, determined face",
}
FRAME_EXTRA = {
    "jump_0": "crouching before a jump",
    "jump_2": "in mid-air, knees tucked",
    "jump_3": "landing with bent knees",
    "shoot_1": "(bright blue muzzle flash at blaster tip:1.2), energy bolt",
    "shoot_2": "recoil, small fading muzzle flash",
}
NEGATIVE = (
    "photo, realistic, 3d, render, painterly, sketch, anime, gradient, texture, background, scenery, ground, "
    "floor, shadow on ground, text, watermark, logo, black hair, dark hair, adult, teenager, realistic proportions, "
    "long legs, extra arms, extra legs, extra fingers, two guns, deformed, cropped, cut off feet, "
    "multiple characters, duplicate, character sheet, facing left"
)

SEED = 42
IPA_WEIGHT = 0.75
CN_STRENGTH = 0.85
CN_END = 0.8


def positive(frame):
    anim = frame.split("_")[0]
    return ", ".join(filter(None, [CHARACTER, ACTIONS[anim], FRAME_EXTRA.get(frame)]))


def workflow(frame, prefix):
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CKPT}},
        "2": {"class_type": "CLIPVisionLoader", "inputs": {"clip_name": CLIP_VISION}},
        "3": {"class_type": "IPAdapterModelLoader", "inputs": {"ipadapter_file": IPA_STYLE}},
        "4": {"class_type": "LoadImage", "inputs": {"image": CHAR_REF}},
        "5": {"class_type": "IPAdapterAdvanced", "inputs": {
            "model": ["1", 0], "ipadapter": ["3", 0], "image": ["4", 0], "clip_vision": ["2", 0],
            "weight": IPA_WEIGHT, "weight_type": "linear", "combine_embeds": "concat",
            "start_at": 0.0, "end_at": 1.0, "embeds_scaling": "V only"}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": positive(frame), "clip": ["1", 1]}},
        "7": {"class_type": "CLIPTextEncode", "inputs": {"text": NEGATIVE, "clip": ["1", 1]}},
        "8": {"class_type": "ControlNetLoader", "inputs": {"control_net_name": CONTROLNET}},
        "9": {"class_type": "LoadImage", "inputs": {"image": f"pose_{frame}.png"}},
        "10": {"class_type": "ControlNetApplyAdvanced", "inputs": {
            "positive": ["6", 0], "negative": ["7", 0], "control_net": ["8", 0], "image": ["9", 0],
            "strength": CN_STRENGTH, "start_percent": 0.0, "end_percent": CN_END, "vae": ["1", 2]}},
        "11": {"class_type": "EmptyLatentImage", "inputs": {"width": 1024, "height": 1024, "batch_size": 1}},
        "12": {"class_type": "KSampler", "inputs": {
            "model": ["5", 0], "positive": ["10", 0], "negative": ["10", 1], "latent_image": ["11", 0],
            "seed": SEED, "steps": 30, "cfg": 6.5, "sampler_name": "dpmpp_2m", "scheduler": "karras",
            "denoise": 1.0}},
        "13": {"class_type": "VAEDecode", "inputs": {"samples": ["12", 0], "vae": ["1", 2]}},
        "14": {"class_type": "SaveImage", "inputs": {"images": ["13", 0], "filename_prefix": prefix}},
    }


if __name__ == "__main__":
    round_name = sys.argv[1] if len(sys.argv) > 1 else time.strftime("round_%H%M%S")
    frames = sys.argv[2:] or sorted(p.stem for p in POSES.glob("*_[0-9]*.png"))
    out_dir = ROOT / "generated" / "anim" / round_name
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "prompt.json").write_text(json.dumps({
        "positive": {f: positive(f) for f in frames}, "negative": NEGATIVE, "seed": SEED,
        "ipa_weight": IPA_WEIGHT, "cn_strength": CN_STRENGTH, "cn_end": CN_END}, indent=2, ensure_ascii=False))

    saved = []
    for frame in frames:
        shutil.copy(POSES / f"{frame}.png", COMFY_INPUT / f"pose_{frame}.png")
        t = time.time()
        for img in run(workflow(frame, f"anim_{round_name}_{frame}")):
            dest = out_dir / f"{frame}.png"
            download(img, dest)
            saved.append(dest)
            print(dest.relative_to(ROOT), f"{time.time() - t:.0f}s", flush=True)
        contact_sheet(saved, out_dir / "_sheet.png", cols=4, tile=320)
