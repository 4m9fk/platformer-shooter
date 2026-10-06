"""Generate a game character in a reference style with a face likeness, via local ComfyUI (SDXL + IP-Adapter).

Usage: python gen_character.py <round_name>
Every variant is saved to generated/<round_name>/ together with prompt.json and a contact sheet _sheet.png.
"""
import io, json, sys, time, urllib.parse, urllib.request, uuid
from pathlib import Path

from PIL import Image

SERVER = "http://127.0.0.1:8188"
CKPT = "sd_xl_base_1.0.safetensors"
CLIP_VISION = "CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors"
IPA_STYLE = "ip-adapter-plus_sdxl_vit-h.safetensors"
IPA_FACE = "ip-adapter-plus-face_sdxl_vit-h.safetensors"
STYLE_REF = "style_ref.png"  # in ComfyUI/input
FACE_REF = "face_ref.png"    # in ComfyUI/input
OUT_ROOT = Path(__file__).resolve().parent.parent / "generated"

POSITIVE = (
    "(2d cartoon game character sprite:1.3), full body, single character, "
    "(chibi proportions:1.2), oversized head, small body, short legs, "
    "boy about 8 years old, (short straight light brown hair with straight bangs over forehead:1.3), "
    "(big round blue eyes:1.2), large dark pupils, round face, small rounded nose, small ears sticking out, "
    "(cheerful open smile with a small gap between front teeth:1.1), "
    "(red t-shirt:1.2), dark brown shorts, white sneakers, "
    "standing in three-quarter view, (thick dark brown outlines:1.3), "
    "(flat cel shading with a single shadow tone:1.2), clean vector game art, "
    "soft gray oval ground shadow under feet, (plain white background:1.2), isolated, centered"
)
NEGATIVE = (
    "photo, photorealistic, realistic, 3d, render, painterly, sketch, anime, lineless, "
    "gradient, texture, detailed background, scenery, text, watermark, logo, signature, "
    "(black hair:1.3), dark hair, blonde white hair, brown eyes, adult, teenager, realistic proportions, long legs, "
    "hoodie, jacket, cape, weapon, gun, extra fingers, extra limbs, deformed, cropped, cut off feet, "
    "multiple characters, duplicate"
)

STYLE_WEIGHT = 0.9
FACE_WEIGHTS = (0.3, 0.5)
SEEDS = (42, 7, 123)


def workflow(face_weight, seed, prefix):
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CKPT}},
        "2": {"class_type": "CLIPVisionLoader", "inputs": {"clip_name": CLIP_VISION}},
        "3": {"class_type": "IPAdapterModelLoader", "inputs": {"ipadapter_file": IPA_STYLE}},
        "4": {"class_type": "IPAdapterModelLoader", "inputs": {"ipadapter_file": IPA_FACE}},
        "5": {"class_type": "LoadImage", "inputs": {"image": STYLE_REF}},
        "6": {"class_type": "LoadImage", "inputs": {"image": FACE_REF}},
        # style from the reference character
        "7": {"class_type": "IPAdapterAdvanced", "inputs": {
            "model": ["1", 0], "ipadapter": ["3", 0], "image": ["5", 0], "clip_vision": ["2", 0],
            "weight": STYLE_WEIGHT, "weight_type": "style transfer", "combine_embeds": "concat",
            "start_at": 0.0, "end_at": 1.0, "embeds_scaling": "V only"}},
        # face likeness from the photo
        "8": {"class_type": "IPAdapterAdvanced", "inputs": {
            "model": ["7", 0], "ipadapter": ["4", 0], "image": ["6", 0], "clip_vision": ["2", 0],
            "weight": face_weight, "weight_type": "linear", "combine_embeds": "concat",
            "start_at": 0.0, "end_at": 0.8, "embeds_scaling": "V only"}},
        "9": {"class_type": "CLIPTextEncode", "inputs": {"text": POSITIVE, "clip": ["1", 1]}},
        "10": {"class_type": "CLIPTextEncode", "inputs": {"text": NEGATIVE, "clip": ["1", 1]}},
        "11": {"class_type": "EmptyLatentImage", "inputs": {"width": 1024, "height": 1024, "batch_size": 1}},
        "12": {"class_type": "KSampler", "inputs": {
            "model": ["8", 0], "positive": ["9", 0], "negative": ["10", 0], "latent_image": ["11", 0],
            "seed": seed, "steps": 30, "cfg": 7.0, "sampler_name": "dpmpp_2m", "scheduler": "karras",
            "denoise": 1.0}},
        "13": {"class_type": "VAEDecode", "inputs": {"samples": ["12", 0], "vae": ["1", 2]}},
        "14": {"class_type": "SaveImage", "inputs": {"images": ["13", 0], "filename_prefix": prefix}},
    }


def run(prompt):
    body = json.dumps({"prompt": prompt, "client_id": str(uuid.uuid4())}).encode()
    req = urllib.request.Request(f"{SERVER}/prompt", data=body, headers={"Content-Type": "application/json"})
    pid = json.load(urllib.request.urlopen(req))["prompt_id"]
    while True:
        hist = json.load(urllib.request.urlopen(f"{SERVER}/history/{pid}"))
        if pid in hist:
            entry = hist[pid]
            if entry.get("status", {}).get("status_str") == "error":
                raise RuntimeError(json.dumps(entry["status"], indent=1))
            return [img for out in entry["outputs"].values() for img in out.get("images", [])]
        time.sleep(1)


def download(img, dest):
    query = urllib.parse.urlencode({k: img[k] for k in ("filename", "subfolder", "type")})
    dest.write_bytes(urllib.request.urlopen(f"{SERVER}/view?{query}").read())


def contact_sheet(paths, dest, cols=3, tile=384):
    rows = -(-len(paths) // cols)
    sheet = Image.new("RGB", (cols * tile, rows * tile), "white")
    for i, p in enumerate(paths):
        sheet.paste(Image.open(p).convert("RGB").resize((tile, tile)), ((i % cols) * tile, (i // cols) * tile))
    sheet.save(dest)


if __name__ == "__main__":
    round_name = sys.argv[1] if len(sys.argv) > 1 else time.strftime("round_%H%M%S")
    out_dir = OUT_ROOT / round_name
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "prompt.json").write_text(json.dumps({
        "positive": POSITIVE, "negative": NEGATIVE, "style_ref": STYLE_REF, "face_ref": FACE_REF,
        "style_weight": STYLE_WEIGHT, "face_weights": FACE_WEIGHTS, "seeds": SEEDS}, indent=2, ensure_ascii=False))

    saved = []
    for face_weight in FACE_WEIGHTS:
        for seed in SEEDS:
            name = f"face{int(face_weight * 100)}_s{seed}"
            t = time.time()
            for img in run(workflow(face_weight, seed, f"{round_name}_{name}")):
                dest = out_dir / f"{name}.png"
                download(img, dest)
                saved.append(dest)
                print(dest.relative_to(OUT_ROOT.parent), f"{time.time() - t:.0f}s", flush=True)
            contact_sheet(saved, out_dir / "_sheet.png")
