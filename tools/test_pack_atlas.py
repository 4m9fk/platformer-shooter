"""Checks pack_atlas.py on the real frames: run with `python3 -m unittest discover -s tools -p 'test_*.py' -v`."""
import json, sys, tempfile, unittest
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import pack_atlas  # noqa: E402

HERO = {"idle": 4, "walk": 8, "jump": 6, "shoot": 4}
ZOMBIE = {"idle": 4, "walk": 8, "attack": 4, "jump": 6, "hit": 4}


def names(counts):
    return sorted(f"{anim}_{i}" for anim, n in counts.items() for i in range(n))


class PackAtlasTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.out = Path(cls.tmp.name)
        pack_atlas.build_atlases(cls.out / "sprites")
        pack_atlas.build_icons(cls.out / "icons")

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def load(self, name):
        data = json.loads((self.out / "sprites" / f"{name}.json").read_text())
        with Image.open(self.out / "sprites" / f"{name}.png") as img:
            return data, img.copy()

    def test_hero_has_all_22_frames(self):
        data, _ = self.load("hero")
        self.assertEqual(sorted(data["frames"]), names(HERO))

    def test_zombie_frames_with_walk_trimmed_to_8(self):
        data, _ = self.load("zombie")
        self.assertEqual(sorted(data["frames"]), names(ZOMBIE))
        self.assertEqual(data["meta"]["game"]["anims"]["walk"]["frames"], 8)

    def test_atlases_fit_2048_and_frames_lie_inside(self):
        for name in ("hero", "zombie"):
            data, img = self.load(name)
            self.assertLessEqual(img.width, 2048, name)
            self.assertEqual((data["meta"]["size"]["w"], data["meta"]["size"]["h"]), img.size)
            self.assertEqual(data["meta"]["image"], f"{name}.png")
            for key, f in data["frames"].items():
                r = f["frame"]
                self.assertLessEqual(r["x"] + r["w"], img.width, key)
                self.assertLessEqual(r["y"] + r["h"], img.height, key)

    def test_frames_are_not_empty(self):
        for name in ("hero", "zombie"):
            data, img = self.load(name)
            for key, f in data["frames"].items():
                if name == "zombie" and key == "hit_3":
                    continue  # the zombie has almost dissolved on this frame
                r = f["frame"]
                crop = img.crop((r["x"], r["y"], r["x"] + r["w"], r["y"] + r["h"]))
                self.assertIsNotNone(crop.getbbox(), f"{name} {key}")

    def test_hero_meta_is_halved(self):
        game = self.load("hero")[0]["meta"]["game"]
        idle = game["anims"]["idle"]
        self.assertEqual(idle["cell"], {"w": 281, "h": 256})
        self.assertEqual(idle["anchor"], {"x": 104, "y": 244})
        self.assertEqual(game["muzzle"], {"x": 209, "y": 104})
        self.assertEqual(game["anims"]["walk"]["fps"], 10)
        self.assertTrue(0 < game["bodyTop"] < idle["anchor"]["y"])

    def test_zombie_meta_has_anchor_per_animation(self):
        game = self.load("zombie")[0]["meta"]["game"]
        for anim in ZOMBIE:
            a = game["anims"][anim]
            self.assertTrue(0 < a["anchor"]["x"] < a["cell"]["w"], anim)
            self.assertTrue(0 < a["anchor"]["y"] <= a["cell"]["h"], anim)
        self.assertNotIn("muzzle", game)

    def test_icons(self):
        for name, size in (("icon-192.png", 192), ("icon-512.png", 512), ("apple-touch-icon.png", 180)):
            with Image.open(self.out / "icons" / name) as img:
                self.assertEqual(img.size, (size, size), name)


if __name__ == "__main__":
    unittest.main()
