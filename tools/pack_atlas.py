"""Pack the right-facing frames of the hero and the zombie into Phaser JSON Hash atlases for the game.

Usage: python3 tools/pack_atlas.py            -> public/sprites/hero.{png,json}, zombie.{png,json}
       python3 tools/pack_atlas.py --icons    -> public/icons/icon-192.png, icon-512.png, apple-touch-icon.png
Frames are halved (cell 562x512 -> 281x256) and shelf-packed into rows no wider than MAX_WIDTH.
Left-facing frames are not packed: the game mirrors with flipX.
meta.game holds, in halved pixels: per-animation frame count, fps, cell and feet anchor; the top of the
standing body (bodyTop, from the idle frames); for the hero also the muzzle point.
Needs only Pillow.
"""
import argparse, json
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SPRITES = ROOT / "generated" / "sprites"
PNG = SPRITES / "png"
OUT = ROOT / "public" / "sprites"
ICONS = ROOT / "public" / "icons"
MAX_WIDTH = 2048    # some phones cannot hold a wider texture
SCALE = 2           # every size and coordinate is divided by this
PAD = 2             # transparent gap between frames against filtering bleed
HERO_ANIMS = ["idle", "walk", "jump", "shoot"]
ZOMBIE_ANIMS = ["idle", "walk", "attack", "jump", "hit"]
# source frame indices to keep; the 9th walk frame repeats the 1st and makes the loop stutter
ZOMBIE_PICK = {"walk": [0, 1, 2, 3, 4, 5, 6, 7]}
ICON_BG = (110, 198, 255, 255)  # SKY_TOP from src/config.ts


def half(v):
    return v // SCALE


def load_meta(path):
    """sprites.js is `window.SPRITES = {...};`, zombie.json is plain JSON."""
    text = path.read_text()
    if path.suffix == ".js":
        text = text.split("=", 1)[1].rstrip().rstrip(";")
    return json.loads(text)


def hero_anims():
    """-> ({anim: (frame paths, fps, cell, anchor)}, muzzle), sizes in source pixels."""
    meta = load_meta(SPRITES / "sprites.js")
    anims = {}
    for name in HERO_ANIMS:
        info = meta["animations"][f"{name}_right"]
        paths = [PNG / f"{name}_right" / f"frame_{i}.png" for i in range(info["frames"])]
        anims[name] = (paths, info["fps"], meta["cell"], meta["anchor"])
    return anims, meta["muzzle"]


def zombie_anims():
    meta = load_meta(SPRITES / "zombie.json")["animations"]
    anims = {}
    for name in ZOMBIE_ANIMS:
        info = meta[f"zombie_{name}_right"]
        pick = ZOMBIE_PICK.get(name, range(info["frames"]))
        paths = [PNG / f"zombie_{name}_right" / f"frame_{i}.png" for i in pick]
        anims[name] = (paths, info["fps"], info["cell"], info["anchor"])
    return anims


def body_top(paths):
    """Topmost opaque row over the given frames, halved."""
    return min(Image.open(p).convert("RGBA").getbbox()[1] for p in paths) // SCALE


def pack(anims):
    """-> (atlas image, Phaser frames dict, meta.game.anims)."""
    placed, x, y, row_h, width = [], 0, 0, 0, 0
    for name, (paths, _fps, cell, _anchor) in anims.items():
        w, h = half(cell["w"]), half(cell["h"])
        if w > MAX_WIDTH:
            raise SystemExit(f"{name}: cell {w} px is wider than the atlas limit {MAX_WIDTH}")
        for i, path in enumerate(paths):
            img = Image.open(path).convert("RGBA")
            if img.size != (cell["w"], cell["h"]):
                raise SystemExit(f"{path}: size {img.size}, expected {cell['w']}x{cell['h']}")
            if x + w > MAX_WIDTH:
                x, y, row_h = 0, y + row_h + PAD, 0
            placed.append((f"{name}_{i}", img.resize((w, h), Image.LANCZOS), x, y))
            width = max(width, x + w)
            x += w + PAD
            row_h = max(row_h, h)
    atlas = Image.new("RGBA", (width, y + row_h), (0, 0, 0, 0))
    frames = {}
    for key, img, fx, fy in placed:
        atlas.paste(img, (fx, fy))
        w, h = img.size
        frames[key] = {"frame": {"x": fx, "y": fy, "w": w, "h": h}, "rotated": False, "trimmed": False,
                       "spriteSourceSize": {"x": 0, "y": 0, "w": w, "h": h}, "sourceSize": {"w": w, "h": h}}
    game = {name: {"frames": len(paths), "fps": fps,
                   "cell": {"w": half(cell["w"]), "h": half(cell["h"])},
                   "anchor": {"x": half(anchor["x"]), "y": half(anchor["y"])}}
            for name, (paths, fps, cell, anchor) in anims.items()}
    return atlas, frames, game


def write_atlas(name, anims, extra, out_dir):
    atlas, frames, game = pack(anims)
    out_dir.mkdir(parents=True, exist_ok=True)
    atlas.save(out_dir / f"{name}.png", optimize=True)
    meta = {"app": "tools/pack_atlas.py", "image": f"{name}.png", "format": "RGBA8888",
            "size": {"w": atlas.width, "h": atlas.height}, "scale": "1", "game": {"anims": game, **extra}}
    (out_dir / f"{name}.json").write_text(json.dumps({"frames": frames, "meta": meta}, indent=1))
    print(f"{out_dir / name}.png {atlas.width}x{atlas.height}, {len(frames)} frames")


def build_atlases(out_dir=OUT):
    hero, muzzle = hero_anims()
    write_atlas("hero", hero, {"bodyTop": body_top(hero["idle"][0]),
                               "muzzle": {"x": half(muzzle["x"]), "y": half(muzzle["y"])}}, out_dir)
    zombie = zombie_anims()
    write_atlas("zombie", zombie, {"bodyTop": body_top(zombie["idle"][0])}, out_dir)


def build_icons(out_dir=ICONS):
    """Hero idle_0 on a sky-coloured disc; the Apple icon gets a full square (iOS rounds it itself)."""
    hero = Image.open(PNG / "idle_right" / "frame_0.png").convert("RGBA")
    hero = hero.crop(hero.getbbox())
    out_dir.mkdir(parents=True, exist_ok=True)
    for name, size, round_bg in (("icon-192.png", 192, True), ("icon-512.png", 512, True),
                                 ("apple-touch-icon.png", 180, False)):
        icon = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1) if round_bg else (-size, -size, 2 * size, 2 * size),
                                     fill=255)
        icon.paste(Image.new("RGBA", (size, size), ICON_BG), (0, 0), mask)
        k = size * 0.8 / max(hero.size)
        fitted = hero.resize((round(hero.width * k), round(hero.height * k)), Image.LANCZOS)
        icon.alpha_composite(fitted, ((size - fitted.width) // 2, (size - fitted.height) // 2))
        icon.save(out_dir / name, optimize=True)
        print(out_dir / name)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--icons", action="store_true", help="build the PWA icons instead of the atlases")
    args = parser.parse_args()
    build_icons() if args.icons else build_atlases()


if __name__ == "__main__":
    main()
