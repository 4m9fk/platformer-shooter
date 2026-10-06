"""Cut the zombie sheet (four animations on one image) into frames in the hero's sprite cell.

Usage: python build_zombie.py
Sheets are listed in SHEETS (project root). On a sheet with several animations the groups are found by gaps
between blobs, read left to right, top row first; a sheet with one animation is one group. The zombie is scaled so its standing height equals the hero's standing height
and placed into the hero's cell (same size, same feet baseline, head on the same vertical axis).
Output, next to the hero's frames in generated/sprites/:
  png/zombie_<anim>_<dir>/frame_N.png, png/zombie_<anim>_<dir>.png (sheet), png/zombie_<anim>_<dir>.gif
  zombie.json: cell, anchor, frame counts and fps
"""
import json, shutil, sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

from slice_sheet import remove_background

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "generated" / "sprites"
SHEETS = {"zombie_sheet.png": ["idle", "walk", "attack", "jump"], "zombie_hit.png": ["hit"]}
FPS = {"idle": 4, "walk": 8, "attack": 10, "jump": 10, "hit": 8}
MIN_BLOB = 2000     # smaller blobs are specks
ROW_GAP = 25        # vertical gap (px) that separates rows of groups
GROUP_GAP = 60      # horizontal gap (px) that separates groups within a row
FRAME_OVERLAP = 0.4  # blobs overlapping horizontally by more than this fraction belong to one frame


def hero_metrics():
    """Cell size, anchor (head center x, feet y) and standing height of the hero from his idle frames."""
    meta = json.loads((OUT / "sprites.js").read_text().split("=", 1)[1].rstrip().rstrip(";"))
    heights = []
    for i in range(meta["animations"]["idle_right"]["frames"]):
        a = np.asarray(Image.open(OUT / "png" / "idle_right" / f"frame_{i}.png"))[..., 3] > 0
        ys = np.nonzero(a)[0]
        heights.append(ys.max() - ys.min() + 1)
    return (meta["cell"]["w"], meta["cell"]["h"]), (meta["anchor"]["x"], meta["anchor"]["y"]), float(np.median(heights))


def blobs(rgba):
    labels, n = ndimage.label(rgba[..., 3] > 0)
    out = []
    for i, sl in enumerate(ndimage.find_objects(labels), start=1):
        if (labels[sl] == i).sum() < MIN_BLOB:
            continue
        out.append({"id": i, "x0": sl[1].start, "x1": sl[1].stop, "y0": sl[0].start, "y1": sl[0].stop})
    return labels, out


def cluster(items, key0, key1, gap):
    """Split items (sorted by key0) into runs separated by more than `gap` px."""
    items = sorted(items, key=lambda b: b[key0])
    runs, end = [], None
    for b in items:
        if end is None or b[key0] - end > gap:
            runs.append([])
        runs[-1].append(b)
        end = b[key1] if end is None else max(end, b[key1])
    return runs


def frames_from_group(labels, rgba, group):
    """Merge blobs that overlap horizontally into frames, sorted left to right."""
    group = sorted(group, key=lambda b: b["x0"])
    frames = []
    for b in group:
        if frames:
            last = frames[-1]
            overlap = min(last["x1"], b["x1"]) - max(last["x0"], b["x0"])
            if overlap > FRAME_OVERLAP * min(last["x1"] - last["x0"], b["x1"] - b["x0"]):
                last["ids"].append(b["id"])
                last["x0"], last["x1"] = min(last["x0"], b["x0"]), max(last["x1"], b["x1"])
                continue
        frames.append({"ids": [b["id"]], "x0": b["x0"], "x1": b["x1"]})
    out = []
    for f in frames:
        mask = np.isin(labels, f["ids"])
        ys, xs = np.nonzero(mask)
        crop = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()
        crop[..., 3] *= mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        out.append(crop)
    return out


def head_center_x(frame):
    """Horizontal center of the forehead band (8-20% of the height), where the arms cannot reach."""
    a = frame[..., 3] > 0
    ys = np.nonzero(a)[0]
    top, h = ys.min(), ys.max() - ys.min()
    band = a[top + int(h * 0.08): top + int(h * 0.2)]
    return np.nonzero(band)[1].mean()


def place(frame, scale, cell, anchor):
    im = Image.fromarray(frame, "RGBA")
    im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
    arr = np.asarray(im)
    ys = np.nonzero(arr[..., 3] > 0)[0]
    cx = head_center_x(arr)
    out = Image.new("RGBA", cell, (0, 0, 0, 0))
    out.paste(im, (int(round(anchor[0] - cx)), int(round(anchor[1] - ys.max()))), im)
    return out


def save_set(cells, name, fps):
    d = OUT / "png" / name
    shutil.rmtree(d, ignore_errors=True)
    d.mkdir(parents=True)
    w, h = cells[0].size
    sheet = Image.new("RGBA", (w * len(cells), h), (0, 0, 0, 0))
    preview = []
    for i, c in enumerate(cells):
        c.save(d / f"frame_{i}.png")
        sheet.paste(c, (i * w, 0))
        bg = Image.new("RGBA", c.size, (210, 220, 230, 255))
        bg.alpha_composite(c)
        preview.append(bg.convert("RGB"))
    sheet.save(OUT / "png" / f"{name}.png")
    preview[0].save(OUT / "png" / f"{name}.gif", save_all=True, append_images=preview[1:],
                    duration=int(1000 / fps), loop=0)


if __name__ == "__main__":
    cell, anchor, hero_height = hero_metrics()
    anims = {}
    for sheet, names in SHEETS.items():
        rgba = remove_background(np.asarray(Image.open(ROOT / sheet).convert("RGB")))
        labels, bl = blobs(rgba)
        if len(names) == 1:
            groups = [bl]
        else:
            rows = cluster(bl, "y0", "y1", ROW_GAP)
            groups = [g for row in rows for g in cluster(row, "x0", "x1", GROUP_GAP)]
        if len(groups) != len(names):
            sys.exit(f"{sheet}: expected {len(names)} groups, found {len(groups)}: {[len(g) for g in groups]}")
        anims.update({name: frames_from_group(labels, rgba, g) for name, g in zip(names, groups)})
    # standing height from the idle frames: feet to the top of the head
    idle_h = np.median([f.shape[0] for f in anims["idle"]])
    scale = hero_height / idle_h
    print(f"hero height {hero_height:.0f}px, zombie idle height {idle_h:.0f}px -> scale x{scale:.2f}")
    meta = {"cell": {"w": cell[0], "h": cell[1]}, "anchor": {"x": anchor[0], "y": anchor[1]}, "animations": {}}
    for name, frames in anims.items():
        cells = [place(f, scale, cell, anchor) for f in frames]
        save_set(cells, f"zombie_{name}_right", FPS[name])
        save_set([c.transpose(Image.FLIP_LEFT_RIGHT) for c in cells], f"zombie_{name}_left", FPS[name])
        for side in ("right", "left"):
            meta["animations"][f"zombie_{name}_{side}"] = {"frames": len(frames), "fps": FPS[name]}
        print(f"zombie_{name}: {len(frames)} frames")
    (OUT / "zombie.json").write_text(json.dumps(meta, indent=2) + "\n")
