"""Build normalized PNG + SVG sprites for every animation sheet listed in ANIMATIONS.

Usage: python build_sprites.py
All animations share one cell: the character has the same scale everywhere (measured by head width),
feet sit on a common baseline and the head is on a common vertical axis, so animations can be swapped
in the engine without jumps. Output in generated/sprites/:
  png/<anim>_<dir>/frame_N.png, png/<anim>_<dir>.png (sheet), png/<anim>_<dir>.gif (preview)
  svg/<anim>_<dir>/frame_N.svg, svg/<anim>_<dir>.svg (sheet)
  sprites.js: cell size and anchor points for the game
"""
import json
import re
import shutil
from pathlib import Path

import numpy as np
import vtracer
from PIL import Image
from scipy import ndimage

from slice_sheet import remove_background, split_frames

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "generated" / "sprites"

# sheet file, frame count, preview fps[, grid rows] (frames are read row by row, left to right)
ANIMATIONS = {
    "walk": ("walk_8.png", 8, 10, 2),
    "shoot": ("cc5b8466-a5b6-4fd6-a155-b99b3c91e366.png", 4, 10),
    "idle": ("58145fad-f8bd-42ce-9fb6-ca9c0ae19bd7.png", 4, 4),
    "jump": ("2559859e-aa80-48a8-beda-9ae777acd04d.png", 6, 10),
}

HEAD_HI = 600     # head width in px at which frames are traced (big = smooth vector curves)
PNG_HEIGHT = 512  # cell height of the exported PNGs
PAD = 0.05        # cell padding, fraction of cell height
PALETTE = 48      # colors kept for vector tracing
SPECKLE = 24      # traced regions smaller than this (px) are dropped
OUTLINE = (38, 30, 28)  # dark outline color, used under transparent pixels before tracing


def main_body(frame):
    """Mask of the largest blob: the character without detached bolts and sparks."""
    labels, n = ndimage.label(frame[..., 3] > 0)
    sizes = ndimage.sum(np.ones_like(labels), labels, range(1, n + 1))
    return labels == (int(np.argmax(sizes)) + 1)


def head_metrics(frame):
    """Width and horizontal center of the head, measured on a forehead-level band of the body silhouette
    (8-20% of its height) where neither the raised blaster nor the cape can reach."""
    body = main_body(frame)
    ys, _ = np.nonzero(body)
    top, height = ys.min(), ys.max() - ys.min()
    band = body[top + int(height * 0.08): top + int(height * 0.2)]
    xs = np.nonzero(band)[1]
    return xs.max() - xs.min(), xs.mean(), ys.max()  # head width, head center x, feet y


def scaled(frame, factor):
    im = Image.fromarray(frame, "RGBA")
    return np.asarray(im.resize((round(im.width * factor), round(im.height * factor)), Image.LANCZOS))


def load_all():
    """{anim: [frames]} scaled so the median head width equals HEAD_HI."""
    out = {}
    for anim, (sheet, count, _, *grid) in ANIMATIONS.items():
        rgba = remove_background(np.asarray(Image.open(ROOT / sheet).convert("RGB")))
        rows = grid[0] if grid else 1
        band = rgba.shape[0] / rows
        frames = [f for r in range(rows)
                  for f in split_frames(rgba[round(r * band):round((r + 1) * band)], count // rows)]
        head = np.median([head_metrics(f)[0] for f in frames])
        out[anim] = [scaled(f, HEAD_HI / head) for f in frames]
        print(f"{anim}: head {head:.0f}px -> scale x{HEAD_HI / head:.2f}")
    return out


def align(all_frames):
    """Place every frame of every animation into one shared cell."""
    flat = [f for frames in all_frames.values() for f in frames]
    metrics = [head_metrics(f) for f in flat]
    left = max(cx for _, cx, _ in metrics)
    right = max(f.shape[1] - cx for f, (_, cx, _) in zip(flat, metrics))
    above = max(feet for _, _, feet in metrics)
    below = max(f.shape[0] - feet for f, (_, _, feet) in zip(flat, metrics))
    h = above + below
    pad = int(h * PAD)
    w, h = int(np.ceil(left + right)) + 2 * pad, int(h) + 2 * pad
    cells = {}
    for anim, frames in all_frames.items():
        cells[anim] = []
        for f in frames:
            _, cx, feet = head_metrics(f)
            cell = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            cell.paste(Image.fromarray(f, "RGBA"), (int(round(pad + left - cx)), int(round(pad + above - feet))))
            cells[anim].append(cell)
    return cells, (w, h), (pad + left, pad + above)


def muzzle(cell):
    """Blaster tip of a facing-right frame: the rightmost point of the character's main body."""
    body = main_body(np.asarray(cell))
    xs = np.nonzero(body.any(axis=0))[0]
    x = xs.max()
    return int(x), int(np.nonzero(body[:, x])[0].mean())


def write_metadata(cells, size, anchor):
    """generated/sprites/sprites.js: cell size, feet/head anchor and blaster tip in PNG pixels, per animation.
    A .js (not .json) file so the demo can load it from file:// without a server."""
    k = PNG_HEIGHT / size[1]
    w = round(size[0] * k)
    meta = {"cell": {"w": w, "h": PNG_HEIGHT}, "anchor": {"x": round(anchor[0] * k), "y": round(anchor[1] * k)},
            "animations": {}}
    for anim, frames in cells.items():
        for side in ("right", "left"):
            meta["animations"][f"{anim}_{side}"] = {"frames": len(frames), "fps": ANIMATIONS[anim][2]}
    if "shoot" in cells:
        mx, my = muzzle(cells["shoot"][0])
        meta["muzzle"] = {"x": round(mx * k), "y": round(my * k)}  # facing right; mirror x for left
    (OUT / "sprites.js").write_text("window.SPRITES = " + json.dumps(meta, indent=2) + ";\n")


def prepare_for_trace(cell):
    """Hard alpha edge, denoised and palette-reduced colors: clean flat regions trace into few, smooth paths."""
    arr = np.asarray(cell).copy()
    opaque = arr[..., 3] >= 128
    arr[~opaque, :3] = OUTLINE  # semi-transparent fringe would otherwise trace as a light halo
    rgb = ndimage.median_filter(arr[..., :3], size=(5, 5, 1))
    flat = Image.fromarray(rgb, "RGB").quantize(colors=PALETTE, method=Image.Quantize.MEDIANCUT,
                                                dither=Image.Dither.NONE).convert("RGB")
    return Image.fromarray(np.dstack([np.asarray(flat), np.where(opaque, 255, 0).astype(np.uint8)]), "RGBA")


def svg_body(cell, tmp):
    """Trace a cell with vtracer and return the inner SVG markup (paths only)."""
    prepare_for_trace(cell).save(tmp)
    svg_path = tmp.with_suffix(".svg")
    vtracer.convert_image_to_svg_py(str(tmp), str(svg_path), colormode="color", hierarchical="stacked",
                                    mode="spline", filter_speckle=SPECKLE, color_precision=8, layer_difference=4,
                                    corner_threshold=60, length_threshold=4.0, splice_threshold=45,
                                    path_precision=1)
    text = svg_path.read_text()
    return re.search(r"<svg[^>]*>(.*)</svg>", text, re.S).group(1).strip()


def svg_doc(inner, w, h, out_w, out_h):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{out_w}" height="{out_h}" '
            f'viewBox="0 0 {w} {h}">\n{inner}\n</svg>\n')


def save(name, cells, size, fps, tmp_dir):
    w, h = size
    out_w, out_h = round(w * PNG_HEIGHT / h), PNG_HEIGHT
    png_dir, svg_dir = OUT / "png" / name, OUT / "svg" / name
    png_dir.mkdir(parents=True, exist_ok=True)
    svg_dir.mkdir(parents=True, exist_ok=True)

    small = [c.resize((out_w, out_h), Image.LANCZOS) for c in cells]
    sheet = Image.new("RGBA", (out_w * len(small), out_h), (0, 0, 0, 0))
    for i, c in enumerate(small):
        c.save(png_dir / f"frame_{i}.png")
        sheet.paste(c, (i * out_w, 0))
    sheet.save(OUT / "png" / f"{name}.png")
    preview = []
    for c in small:
        bg = Image.new("RGBA", c.size, (210, 220, 230, 255))
        bg.alpha_composite(c)
        preview.append(bg.convert("RGB"))
    preview[0].save(OUT / "png" / f"{name}.gif", save_all=True, append_images=preview[1:],
                    duration=int(1000 / fps), loop=0)

    groups = []
    for i, c in enumerate(cells):
        inner = svg_body(c, tmp_dir / f"{name}_{i}.png")
        (svg_dir / f"frame_{i}.svg").write_text(svg_doc(inner, w, h, out_w, out_h))
        groups.append(f'<g id="frame_{i}" transform="translate({i * w} 0)">\n{inner}\n</g>')
    (OUT / "svg" / f"{name}.svg").write_text(
        svg_doc("\n".join(groups), w * len(cells), h, out_w * len(cells), out_h))


if __name__ == "__main__":
    for anim in ANIMATIONS:  # only this character's output; zombie_* from build_zombie.py stays
        for kind in ("png", "svg"):
            for side in ("right", "left"):
                shutil.rmtree(OUT / kind / f"{anim}_{side}", ignore_errors=True)
                for f in (OUT / kind).glob(f"{anim}_{side}.*"):
                    f.unlink()
    tmp_dir = OUT / ".trace_tmp"
    tmp_dir.mkdir(parents=True, exist_ok=True)

    cells, size, anchor = align(load_all())
    print(f"cell {size[0]}x{size[1]} traced, PNG cell height {PNG_HEIGHT}")
    write_metadata(cells, size, anchor)
    for anim, frames in cells.items():
        fps = ANIMATIONS[anim][2]
        save(f"{anim}_right", frames, size, fps, tmp_dir)
        save(f"{anim}_left", [c.transpose(Image.FLIP_LEFT_RIGHT) for c in frames], size, fps, tmp_dir)
        print(f"{anim}: {len(frames)} frames")
    shutil.rmtree(tmp_dir)
