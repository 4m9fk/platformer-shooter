"""Slice a horizontal sprite sheet on a white background into aligned transparent frames.

Usage: python slice_sheet.py <sheet.png> <anim_name> <frame_count> [fps]
Writes to generated/sprites/:
  <anim>_right/frame_N.png, <anim>_left/frame_N.png (mirrored),
  <anim>_right.png / <anim>_left.png sprite sheets, <anim>_right.gif preview.
All frames share one cell size; feet sit on a common baseline and the head is centered horizontally.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "generated" / "sprites"
BG_MIN = 228     # a pixel is background when all channels are above this and it touches the sheet border
MIN_BLOB = 30    # ignore specks smaller than this many pixels
ENCLOSED_MIN = 300  # enclosed near-white regions bigger than this may be trapped background
PAD = 16


def remove_background(rgb):
    near_white = rgb.min(axis=2) > BG_MIN
    labels, _ = ndimage.label(near_white)
    border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    bg = np.isin(labels, border[border > 0])
    # background trapped between an arm and the body: large, enclosed, as bright/flat as the sheet itself
    # and ringed by the dark outline (character whites like socks and eyes are darker, ~245;
    # the white core of a muzzle flash is ringed by light glow, not by outline)
    lum = rgb.mean(axis=2)
    for i, sl in enumerate(ndimage.find_objects(labels), start=1):
        blob = labels[sl] == i
        px = rgb[sl][blob]
        if blob.sum() <= ENCLOSED_MIN or px.mean() <= 249 or px.std() >= 4.5:
            continue
        grown = (slice(max(sl[0].start - 4, 0), sl[0].stop + 4), slice(max(sl[1].start - 4, 0), sl[1].stop + 4))
        full = labels[grown] == i
        ring = ndimage.binary_dilation(full, iterations=4) & ~ndimage.binary_dilation(full, iterations=1)
        if lum[grown][ring].mean() < 150:
            bg[grown] |= full
    # soften the 1px fringe around the silhouette so light anti-aliasing doesn't leave a halo
    fringe = ndimage.binary_dilation(bg) & ~bg
    lum = rgb.mean(axis=2)
    alpha = np.where(bg, 0, 255).astype(np.float32)
    alpha[fringe] = np.clip((250 - lum[fringe]) / 60 * 255, 0, 255)
    return np.dstack([rgb, alpha.astype(np.uint8)])


def split_frames(rgba, count):
    """Group connected blobs into `count` evenly spaced cells by their horizontal center."""
    labels, n = ndimage.label(rgba[..., 3] > 0)
    cell_w = rgba.shape[1] / count
    groups = [[] for _ in range(count)]
    for i, sl in enumerate(ndimage.find_objects(labels), start=1):
        size = (labels[sl] == i).sum()
        if size < MIN_BLOB:
            continue
        cx = (sl[1].start + sl[1].stop) / 2
        groups[min(int(cx / cell_w), count - 1)].append(i)
    frames = []
    for ids in groups:
        mask = np.isin(labels, ids)
        ys, xs = np.nonzero(mask)
        crop = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1].copy()
        crop[..., 3] *= mask[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        frames.append(crop)
    return frames


def head_center_x(frame):
    """Horizontal center of the top 35% of the silhouette (the head), a stable anchor between frames."""
    top = frame[: int(frame.shape[0] * 0.35), :, 3] > 0
    return np.nonzero(top)[1].mean()


def align(frames):
    anchors = [head_center_x(f) for f in frames]
    left = max(anchors)
    right = max(f.shape[1] - a for f, a in zip(frames, anchors))
    w = int(np.ceil(left + right)) + 2 * PAD
    h = max(f.shape[0] for f in frames) + 2 * PAD
    cells = []
    for f, a in zip(frames, anchors):
        cell = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        cell.paste(Image.fromarray(f, "RGBA"), (int(round(PAD + left - a)), h - PAD - f.shape[0]))
        cells.append(cell)
    return cells


def save_set(cells, name, fps):
    d = OUT / name
    d.mkdir(parents=True, exist_ok=True)
    for i, c in enumerate(cells):
        c.save(d / f"frame_{i}.png")
    w, h = cells[0].size
    sheet = Image.new("RGBA", (w * len(cells), h), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        sheet.paste(c, (i * w, 0))
    sheet.save(OUT / f"{name}.png")
    # preview on light gray so the transparent edges are visible
    preview = []
    for c in cells:
        bg = Image.new("RGBA", c.size, (210, 220, 230, 255))
        bg.alpha_composite(c)
        preview.append(bg.convert("RGB"))
    preview[0].save(OUT / f"{name}.gif", save_all=True, append_images=preview[1:],
                    duration=int(1000 / fps), loop=0)
    return w, h


if __name__ == "__main__":
    sheet_path, anim, count = sys.argv[1], sys.argv[2], int(sys.argv[3])
    fps = float(sys.argv[4]) if len(sys.argv) > 4 else 10
    rgba = remove_background(np.asarray(Image.open(sheet_path).convert("RGB")))
    cells = align(split_frames(rgba, count))
    size = save_set(cells, f"{anim}_right", fps)
    save_set([c.transpose(Image.FLIP_LEFT_RIGHT) for c in cells], f"{anim}_left", fps)
    print(f"{anim}: {count} frames, cell {size[0]}x{size[1]} -> {OUT.relative_to(ROOT)}")
