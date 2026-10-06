# Platformer Shooter: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Первая версия мобильного платформера: мальчик с бластером бежит слева направо по одному уровню, стреляет по зомби, ломает ящики, добегает до флага. Игра ставится на домашний экран, работает офлайн, выкладывается на GitHub Pages через `git push`.

**Architecture:** Phaser 3 + Arcade Physics, TypeScript, Vite. Чистая логика (разбор карты, сетка тайлов, патруль, ввод, выбор кадра прыжка) живёт в модулях без импорта Phaser и тестируется Vitest. Phaser-слой: `BootScene` грузит атласы и рисует текстуры-заглушки, `GameScene` строит уровень и физику, `UIScene` рисует тач-кнопки, HUD и экраны поверх. Атласы героя и зомби собирает Python-скрипт `tools/pack_atlas.py` из уже нарезанных кадров и кладёт в `public/sprites/`.

**Tech Stack:** phaser 3.90.0, vite 8, typescript 5.9, vitest 5, vite-plugin-pwa 2; Python 3.9 + Pillow (только Pillow, без numpy) для `pack_atlas.py`, тесты на `unittest`.

**Spec:** `docs/superpowers/specs/2026-10-06-platformer-shooter-design.md`

## Global Constraints

- Phaser 3 (не 4): `phaser@3.90.0`. Arcade Physics. TypeScript. Vite.
- Логический экран 960×540, `Scale.FIT`. `TILE = 60`. Уровень 70×9 тайлов.
- Vite `base: '/platformer-shooter/'`. Адрес: `https://4m9fk.github.io/platformer-shooter/`. Репозиторий `git@github.com:4m9fk/platformer-shooter.git`.
- PWA через `vite-plugin-pwa`, `registerType: 'autoUpdate'`.
- Деплой: GitHub Actions → `actions/deploy-pages`, без ветки `gh-pages`.
- **Отклонение от спеки:** Node 22 в CI вместо Node 20 (Node 20 снят с поддержки 30.04.2026, Vite 8 требует ≥ 20.19; локально стоит v22).
- Атлас не шире 2048 px; кадры уменьшены вдвое (ячейка 562×512 → 281×256); в атлас идут только `right`-кадры, `left` даёт `flipX`.
- `HERO_SCALE = 0.7`; origin спрайта в якоре ног; тело ~40 % ширины ячейки, от макушки до ног.
- Не делаем: жизни, очки, несколько уровней, звук, сохранение, боссы, меню настроек.
- В git не попадают: `/*.png` в корне, `walk_fix/`, `generated/anim/`, `node_modules`, `dist`, `.idea` (уже в `.gitignore`). `public/sprites/*` и `public/icons/*` коммитим: CI не запускает Python.
- Старое демо `game/` не трогаем и не подключаем.
- Тексты в игре по-русски.
- Трактовка спеки: односторонняя платформа = у статического тела остаётся только `checkCollision.up` (`down`, `left`, `right` выключены); в спеке написано «`checkCollision.down` только», но в Phaser так получилась бы платформа, твёрдая только снизу.
- Трактовка спеки: «зона кнопки больше рисунка на 20 px» = диаметр зоны на 20 px больше (радиус +10), иначе зоны ← и → перекрываются.

## Review Focus

1. **Палец поднят не над кнопкой** (сполз с кнопки и отпущен над игрой, системный жест, `pointercancel`): кнопка не должна залипать, герой не должен бежать сам. Отпускание по `pointerId` в любом месте экрана отпускает ту кнопку, которую держал этот палец. Тест: Task 3 (`releasePointer`), подключение: Task 9 (scene-level `pointerup`).
2. **Вкладка свёрнута или потеряла фокус с зажатой клавишей:** `keyup` не придёт, герой побежит бесконечно. Ожидание: при `blur`/`visibilitychange` всё отпускается. Тест: Task 3 (`clearKeyboard`, две клавиши на одно действие).
3. **Сломанный ящик остаётся в сетке:** зомби разворачивается перед пустым местом. Ожидание: после поломки ящика клетка свободна и для патруля. Тест: Task 5 (`removeCrate`), использование: Task 7.
4. **Зомби у края карты** (столбец −1 или `width`): должен развернуться, а не уйти за мир. Тест: Task 5 (края сетки), Task 8 (`nextDirection`).
5. **Опечатка в карте** (пробел вместо точки, CRLF при копировании, незнакомый символ): понятная ошибка с номером строки и столбца, CRLF не ошибка. Тест: Task 5.

---

## Структура файлов

```
package.json, package-lock.json, tsconfig.json, vite.config.ts, index.html
.github/workflows/deploy.yml
public/sprites/hero.png, hero.json, zombie.png, zombie.json     (генерит pack_atlas.py)
public/icons/icon-192.png, icon-512.png, apple-touch-icon.png   (генерит pack_atlas.py --icons)
src/main.ts                 Phaser.Game, Intent в registry, список сцен
src/config.ts               все константы
src/atlas.ts                чтение meta.game, создание анимаций, якорь и тело спрайта
src/scenes/BootScene.ts     прогресс-бар, загрузка атласов, текстуры, анимации
src/scenes/GameScene.ts     уровень, физика, столкновения, камера, респаун, победа
src/scenes/UIScene.ts       тач-кнопки, счётчик, ⛶, экран победы, «Поверни телефон»
src/entities/Hero.ts        машина состояний героя
src/entities/jumpFrame.ts   чистая функция: кадр прыжка по скорости (+ test)
src/entities/Zombie.ts      патруль, выпад, смерть
src/entities/patrol.ts      чистая функция разворота (+ test)
src/entities/Bolt.ts        снаряд
src/input/Intent.ts         объединение клавиатуры и тача (+ test)
src/input/keyboard.ts       DOM-клавиатура → Intent
src/levels/parse.ts         ASCII → объекты (+ test)
src/levels/grid.ts          сетка тайлов для патруля (+ test)
src/levels/level1.ts        карта
src/textures/placeholders.ts Graphics → текстуры
tools/pack_atlas.py         упаковка атласов и иконок
tools/test_pack_atlas.py    unittest на реальных кадрах
```

Отличия от структуры в спеке: добавлены `src/atlas.ts` (общий код героя и зомби для якоря/тела/анимаций), `src/input/keyboard.ts` (чтобы `Intent.ts` не трогал DOM и тестировался), `src/levels/grid.ts` (сетка, которую патруль читает и которую ломание ящика меняет), `src/entities/jumpFrame.ts` (чистая функция, тестируется без Phaser).

Как смотреть игру в любой задаче: `npm run dev`, открыть `http://localhost:5173/platformer-shooter/`. Добавь `?debug` к адресу, чтобы видеть физические тела.

---

### Task 1: Каркас Vite + Phaser + TS и workflow деплоя

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/config.ts`, `src/scenes/GameScene.ts`, `.github/workflows/deploy.yml`

**Interfaces:**
- Produces: `src/config.ts` со всеми константами (ниже), сцена с ключом `'Game'`, команды `npm run dev | build | preview | test`.

- [ ] **Step 1: Инициализировать npm и поставить зависимости**

```bash
cd /Users/siarhei/work/game-1
npm init -y
npm install phaser@3.90.0
npm install -D vite@^8 typescript@~5.9 vitest@^5 @types/node@^22
```

- [ ] **Step 2: Привести `package.json` к виду**

Оставь поля `dependencies`/`devDependencies`, которые записал npm; остальное замени:

```json
{
  "name": "platformer-shooter",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "atlas": "python3 tools/pack_atlas.py && python3 tools/pack_atlas.py --icons"
  }
}
```

- [ ] **Step 3: `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client"],
    "strict": true,
    "noEmit": true,
    "isolatedModules": true,
    "useDefineForClassFields": true,
    "skipLibCheck": true
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 4: `vite.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/platformer-shooter/',
  build: { chunkSizeWarningLimit: 2000 }, // Phaser alone is ~1.2 MB
  test: { include: ['src/**/*.test.ts'], passWithNoTests: true },
});
```

- [ ] **Step 5: `index.html`**

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
    <title>Platformer Shooter</title>
    <style>
      html, body { margin: 0; height: 100%; overflow: hidden; background: #6ec6ff;
                   user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
      #game { width: 100vw; height: 100vh; height: 100dvh; }
      canvas { display: block; touch-action: none; }
    </style>
  </head>
  <body>
    <div id="game"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 6: `src/config.ts` (все константы игры сразу)**

```ts
// Sizes are logical screen pixels (screen is 960×540), times are ms, speeds are px/s.
export const GAME_W = 960;
export const GAME_H = 540;
export const TILE = 60;

export const SKY_TOP = 0x6ec6ff;
export const SKY_BOTTOM = 0xd8f1ff;

export const HERO_SCALE = 0.7; // also used for the zombie: its frames are drawn at the hero's size
export const BODY_WIDTH = 0.4; // physics body width as a fraction of the sprite cell
export const WALK_SPEED = 220;
export const JUMP_SPEED = 700;
export const GRAVITY = 1800;
export const CROUCH_TIME = 80;
export const LAND_TIME = 120;

export const BOLT_FRAME = 2; // shoot frame on which the bolt leaves the muzzle
export const BOLT_SPEED = 900;
export const BOLT_LIFE = 1200;

export const ZOMBIE_SPEED = 60;
export const ATTACK_RANGE = TILE * 1.5;
export const ATTACK_COOLDOWN = 800; // patrol time after a lunge before the next one
export const STOMP_BOUNCE = 400;

export const BLINK_TIME = 300;
export const FADE_TIME = 150;
export const FALL_MARGIN = 200; // how far below the level the hero falls before he is sent back
export const CAMERA_LEAD = 120;
export const PARALLAX = [0.1, 0.2, 0.5]; // clouds, far hills, near hills
export const DEBRIS = 6;

export const BUTTON_SIZE = 110;
export const BUTTON_MARGIN = 24;
export const BUTTON_SLOP = 10; // hit circle radius beyond the drawn circle: the zone is 20 px wider
```

- [ ] **Step 7: `src/scenes/GameScene.ts` (временная пустая сцена)**

```ts
import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.add.text(GAME_W / 2, GAME_H / 2, 'Platformer Shooter', { fontSize: '48px', color: '#ffffff' }).setOrigin(0.5);
  }
}
```

- [ ] **Step 8: `src/main.ts`**

```ts
import Phaser from 'phaser';
import { GAME_H, GAME_W, GRAVITY, SKY_TOP } from './config';
import { GameScene } from './scenes/GameScene';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: SKY_TOP,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: GAME_W, height: GAME_H },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: GRAVITY }, debug: new URLSearchParams(location.search).has('debug') },
  },
  input: { activePointers: 4 }, // run, jump and shoot with separate fingers
  scene: [GameScene],
});
```

- [ ] **Step 9: `.github/workflows/deploy.yml`**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 10: Проверить сборку и тесты**

Run: `npm run build && npm test`
Expected: `tsc` без ошибок, `vite build` пишет `dist/index.html` и `dist/assets/*.js`; vitest: `No test files found, exiting with code 0`.

Run: `npm run dev`, открыть `http://localhost:5173/platformer-shooter/`.
Expected: голубой экран с надписью «Platformer Shooter», при изменении размера окна картинка вписывается с полями.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src .github
git commit -m "Каркас игры: Vite + Phaser 3 + TypeScript, workflow деплоя на Pages"
```

- [ ] **Step 12: Репозиторий на GitHub (только с подтверждения пользователя)**

Это публикация наружу. Спроси пользователя, создать ли репозиторий и включить Pages; если он согласен, команды (или пусть выполнит сам через `! <команда>`):

```bash
gh repo create 4m9fk/platformer-shooter --public --source . --remote origin
gh api -X POST repos/4m9fk/platformer-shooter/pages -f build_type=workflow
git push -u origin main
gh run watch
```

Expected: workflow зелёный, `https://4m9fk.github.io/platformer-shooter/` показывает ту же надпись. Pages на бесплатном плане работает только для публичного репозитория. Если пользователь откладывает, продолжай локально; в Task 11 этот шаг повторяется.

---

### Task 2: `tools/pack_atlas.py`: атласы героя и зомби, иконки

**Files:**
- Create: `tools/pack_atlas.py`, `tools/test_pack_atlas.py`
- Create (генерируются): `public/sprites/hero.png`, `public/sprites/hero.json`, `public/sprites/zombie.png`, `public/sprites/zombie.json`

**Interfaces:**
- Consumes: `generated/sprites/sprites.js` (`cell`, `anchor`, `muzzle`, `animations.<anim>_right.{frames,fps}`), `generated/sprites/zombie.json` (`animations.zombie_<anim>_right.{frames,fps,cell,anchor}`), кадры `generated/sprites/png/<anim>_right/frame_N.png` и `generated/sprites/png/zombie_<anim>_right/frame_N.png`.
- Produces: Phaser JSON Hash атласы. Имена кадров `<anim>_<i>` (`idle_0 … shoot_3`, у зомби `idle_0 … hit_3`). `meta.game`:
  ```
  { anims: { <anim>: { frames, fps, cell: {w,h}, anchor: {x,y} } }, bodyTop: number, muzzle?: {x,y} }
  ```
  Всё уже в уменьшенных пикселях. `muzzle` только у героя. Функции `build_atlases(out_dir)`, `build_icons(out_dir)`.

Известные числа (проверяются тестом): ячейка героя 281×256, якорь (104, 244), дуло (209, 104). У зомби walk 9 кадров в исходнике, последний повторяет первый (проверено по `zombie_walk_right.png`), в атлас идут индексы 0–7.

- [ ] **Step 1: Написать падающий тест `tools/test_pack_atlas.py`**

```python
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
        return data, Image.open(self.out / "sprites" / f"{name}.png")

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
            img = Image.open(self.out / "icons" / name)
            self.assertEqual(img.size, (size, size), name)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `python3 -m unittest discover -s tools -p 'test_*.py' -v`
Expected: ERROR `ModuleNotFoundError: No module named 'pack_atlas'`.

- [ ] **Step 3: Написать `tools/pack_atlas.py`**

```python
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
```

- [ ] **Step 4: Прогнать тест**

Run: `python3 -m unittest discover -s tools -p 'test_*.py' -v`
Expected: 7 tests OK. Если `test_hero_meta_is_halved` падает на якоре/дуле, проверь `generated/sprites/sprites.js`: ожидаются `anchor {208, 489}`, `muzzle {418, 208}`.

- [ ] **Step 5: Сгенерировать атласы и посмотреть глазами**

Run: `python3 tools/pack_atlas.py`
Expected: две строки вида `public/sprites/hero.png 1979x1030, 22 frames` и `public/sprites/zombie.png …, 26 frames`, ширина ≤ 2048. Открой оба PNG (Read tool): кадры не обрезаны, между ними прозрачный зазор.

Иконки здесь не генерируем: это Task 10.

- [ ] **Step 6: Commit**

```bash
git add tools/pack_atlas.py tools/test_pack_atlas.py public/sprites
git commit -m "pack_atlas.py: атласы героя и зомби с якорями в meta.game"
```

---

### Task 3: `Intent`: клавиатура и тач в одно состояние

**Files:**
- Create: `src/input/Intent.ts`, `src/input/Intent.test.ts`, `src/input/keyboard.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Produces:
  ```ts
  type Action = 'left' | 'right' | 'jump' | 'shoot';
  type IntentState = Record<Action, boolean>;
  class Intent {
    pressKey(code: string, action: Action): void;
    releaseKey(code: string): void;
    clearKeyboard(): void;
    pressPointer(id: number, action: Action): void;
    releasePointer(id: number): void;   // releases whatever this pointer held, wherever it is lifted
    clearPointers(): void;
    held(action: Action): boolean;
    get state(): IntentState;
    consume(action: 'jump' | 'shoot'): boolean; // true once per transition from released to held
  }
  function bindKeyboard(intent: Intent): () => void; // returns unbind
  ```
  `Intent` лежит в `game.registry` под ключом `'intent'`.

- [ ] **Step 1: Написать падающий тест `src/input/Intent.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { Intent } from './Intent';

describe('Intent', () => {
  it('starts with nothing held', () => {
    expect(new Intent().state).toEqual({ left: false, right: false, jump: false, shoot: false });
  });

  it('keyboard and touch combine with OR; releasing one source keeps the other', () => {
    const i = new Intent();
    i.pressKey('ArrowLeft', 'left');
    i.pressPointer(1, 'left');
    i.releaseKey('ArrowLeft');
    expect(i.state.left).toBe(true);
    i.pressKey('ArrowLeft', 'left');
    i.releasePointer(1);
    expect(i.state.left).toBe(true);
    i.releaseKey('ArrowLeft');
    expect(i.state.left).toBe(false);
  });

  it('two keys on one action: releasing one keeps the action held', () => {
    const i = new Intent();
    i.pressKey('ArrowLeft', 'left');
    i.pressKey('KeyA', 'left');
    i.releaseKey('KeyA');
    expect(i.held('left')).toBe(true);
  });

  it('each finger is tracked by pointer id', () => {
    const i = new Intent();
    i.pressPointer(1, 'right');
    i.pressPointer(2, 'jump');
    i.pressPointer(3, 'shoot');
    i.releasePointer(2);
    expect(i.state).toEqual({ left: false, right: true, jump: false, shoot: true });
  });

  it('a finger lifted anywhere releases the button it held; unknown ids are ignored', () => {
    const i = new Intent();
    i.pressPointer(7, 'right');
    i.releasePointer(99);
    expect(i.held('right')).toBe(true);
    i.releasePointer(7);
    expect(i.held('right')).toBe(false);
  });

  it('clearKeyboard (window blur) drops keys but keeps fingers, clearPointers the reverse', () => {
    const i = new Intent();
    i.pressKey('ArrowRight', 'right');
    i.pressPointer(1, 'shoot');
    i.clearKeyboard();
    expect(i.state).toEqual({ left: false, right: false, jump: false, shoot: true });
    i.pressKey('ArrowRight', 'right');
    i.clearPointers();
    expect(i.state).toEqual({ left: false, right: true, jump: false, shoot: false });
  });

  it('consume reports a press once', () => {
    const i = new Intent();
    i.pressKey('ArrowUp', 'jump');
    expect(i.consume('jump')).toBe(true);
    expect(i.consume('jump')).toBe(false);
  });

  it('a second source pressing an already held action is not a new press', () => {
    const i = new Intent();
    i.pressPointer(1, 'jump');
    i.consume('jump');
    i.pressKey('ArrowUp', 'jump');
    expect(i.consume('jump')).toBe(false);
    i.releasePointer(1);
    i.releaseKey('ArrowUp');
    i.pressKey('ArrowUp', 'jump');
    expect(i.consume('jump')).toBe(true);
  });
});
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `npx vitest run src/input/Intent.test.ts`
Expected: FAIL, `Failed to resolve import "./Intent"`.

- [ ] **Step 3: `src/input/Intent.ts`**

```ts
export type Action = 'left' | 'right' | 'jump' | 'shoot';
export type IntentState = Record<Action, boolean>;

/** Keyboard and touch buttons merged into one set of held actions. Releasing one source never cancels the other. */
export class Intent {
  private readonly keys = new Map<string, Action>(); // key code -> action
  private readonly pointers = new Map<number, Action>(); // pointer id -> action
  private readonly pressed = new Set<Action>(); // presses not yet consumed

  pressKey(code: string, action: Action) {
    this.press(action, () => this.keys.set(code, action));
  }

  releaseKey(code: string) {
    this.keys.delete(code);
  }

  clearKeyboard() {
    this.keys.clear();
  }

  pressPointer(id: number, action: Action) {
    this.press(action, () => this.pointers.set(id, action));
  }

  releasePointer(id: number) {
    this.pointers.delete(id);
  }

  clearPointers() {
    this.pointers.clear();
  }

  held(action: Action): boolean {
    for (const a of this.keys.values()) if (a === action) return true;
    for (const a of this.pointers.values()) if (a === action) return true;
    return false;
  }

  get state(): IntentState {
    return { left: this.held('left'), right: this.held('right'), jump: this.held('jump'), shoot: this.held('shoot') };
  }

  /** True once per transition from released to held. */
  consume(action: 'jump' | 'shoot'): boolean {
    return this.pressed.delete(action);
  }

  private press(action: Action, add: () => void) {
    const was = this.held(action);
    add();
    if (!was) this.pressed.add(action);
  }
}
```

- [ ] **Step 4: Прогнать тест**

Run: `npx vitest run src/input/Intent.test.ts`
Expected: 8 passed.

- [ ] **Step 5: `src/input/keyboard.ts`**

```ts
import type { Action, Intent } from './Intent';

const KEYS: Record<string, Action> = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump',
  Space: 'shoot',
};

/** Feeds DOM key events into the Intent. A lost focus releases everything: keyup would never come. */
export function bindKeyboard(intent: Intent): () => void {
  const down = (e: KeyboardEvent) => {
    const action = KEYS[e.code];
    if (!action) return;
    e.preventDefault();
    if (!e.repeat) intent.pressKey(e.code, action);
  };
  const up = (e: KeyboardEvent) => {
    if (KEYS[e.code]) intent.releaseKey(e.code);
  };
  const lost = () => {
    intent.clearKeyboard();
    intent.clearPointers();
  };
  const hidden = () => {
    if (document.hidden) lost();
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', lost);
  document.addEventListener('visibilitychange', hidden);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', lost);
    document.removeEventListener('visibilitychange', hidden);
  };
}
```

- [ ] **Step 6: Положить Intent в registry, `src/main.ts`**

Замени содержимое на:

```ts
import Phaser from 'phaser';
import { GAME_H, GAME_W, GRAVITY, SKY_TOP } from './config';
import { Intent } from './input/Intent';
import { bindKeyboard } from './input/keyboard';
import { GameScene } from './scenes/GameScene';

const intent = new Intent();
bindKeyboard(intent);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: SKY_TOP,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: GAME_W, height: GAME_H },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: GRAVITY }, debug: new URLSearchParams(location.search).has('debug') },
  },
  input: { activePointers: 4 }, // run, jump and shoot with separate fingers
  callbacks: { preBoot: (game) => game.registry.set('intent', intent) },
  scene: [GameScene],
});
```

- [ ] **Step 7: Проверить**

Run: `npm test && npm run build`
Expected: 8 passed, сборка без ошибок.

- [ ] **Step 8: Commit**

```bash
git add src/input src/main.ts
git commit -m "Intent: клавиатура и тач в одно состояние, отпускание по pointerId и при потере фокуса"
```

---

### Task 4: Герой: атлас, анимации, машина состояний на тестовой земле

**Files:**
- Create: `src/atlas.ts`, `src/entities/jumpFrame.ts`, `src/entities/jumpFrame.test.ts`, `src/entities/Hero.ts`, `src/scenes/BootScene.ts`
- Modify: `src/scenes/GameScene.ts` (временная земля), `src/main.ts` (список сцен)

**Interfaces:**
- Consumes: `public/sprites/hero.{png,json}`, `zombie.{png,json}` (Task 2), `Intent` (Task 3), константы `config.ts`.
- Produces:
  ```ts
  // src/atlas.ts
  interface AnimMeta { frames: number; fps: number; cell: { w: number; h: number }; anchor: { x: number; y: number } }
  interface AtlasGame { anims: Record<string, AnimMeta>; bodyTop: number; muzzle?: { x: number; y: number } }
  function loadAtlas(scene: Phaser.Scene, key: 'hero' | 'zombie'): void;   // in preload
  function atlasGame(scene: Phaser.Scene, key: string): AtlasGame;
  function createAnims(scene: Phaser.Scene, key: string): void;           // anim keys `${key}-${anim}`
  function applyAnchor(sprite: Phaser.GameObjects.Sprite, anim: AnimMeta): void;
  function fitBody(sprite: Phaser.Physics.Arcade.Sprite, game: AtlasGame): void;
  // src/entities/jumpFrame.ts
  function jumpAirFrame(vy: number, jumpSpeed: number): 1 | 2 | 3 | 4;
  // src/entities/Hero.ts
  type HeroMode = 'idle' | 'walk' | 'jump' | 'shoot' | 'frozen';
  type Facing = 1 | -1;
  class Hero extends Phaser.Physics.Arcade.Sprite {
    constructor(scene: Phaser.Scene, x: number, y: number, intent: Intent); // x, y = point between the feet
    body: Phaser.Physics.Arcade.Body; mode: HeroMode; facing: Facing;
    onFire: (x: number, y: number, dir: Facing) => void;  // muzzle position in world coords
    step(delta: number): void;   // call from GameScene.update
    bounce(): void;              // after a stomp
    freeze(): void;              // stand still, ignore input (win)
    die(): void;                 // freeze and disable the body (respawn sequence)
    respawn(x: number, y: number): void;
  }
  ```
  Сцена `'Boot'` грузит всё и запускает `'Game'`.

- [ ] **Step 1: Падающий тест `src/entities/jumpFrame.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { jumpAirFrame } from './jumpFrame';

// Phaser y grows downward: negative vy is rising.
describe('jumpAirFrame', () => {
  const S = 700;
  it('take-off while rising fast', () => expect(jumpAirFrame(-700, S)).toBe(1));
  it('rising', () => expect(jumpAirFrame(-300, S)).toBe(2));
  it('apex around zero speed', () => {
    expect(jumpAirFrame(-50, S)).toBe(3);
    expect(jumpAirFrame(0, S)).toBe(3);
    expect(jumpAirFrame(100, S)).toBe(3);
  });
  it('falling', () => expect(jumpAirFrame(400, S)).toBe(4));
  it('half-speed short hop still starts on the rising frame', () => expect(jumpAirFrame(-350, S)).toBe(2));
});
```

- [ ] **Step 2: Убедиться, что падает**

Run: `npx vitest run src/entities/jumpFrame.test.ts`
Expected: FAIL, `Failed to resolve import "./jumpFrame"`.

- [ ] **Step 3: `src/entities/jumpFrame.ts`**

```ts
/** Jump sheet: 0 crouch, 1 take-off, 2 rising, 3 apex, 4 falling, 5 landing. Picks the air frame by vertical speed. */
export function jumpAirFrame(vy: number, jumpSpeed: number): 1 | 2 | 3 | 4 {
  const apex = jumpSpeed * 0.15;
  if (vy < -jumpSpeed * 0.5) return 1;
  if (vy < -apex) return 2;
  if (vy <= apex) return 3;
  return 4;
}
```

- [ ] **Step 4: Прогнать**

Run: `npx vitest run src/entities/jumpFrame.test.ts`
Expected: 5 passed.

- [ ] **Step 5: `src/atlas.ts`**

```ts
import Phaser from 'phaser';
import { BODY_WIDTH } from './config';

export interface AnimMeta {
  frames: number;
  fps: number;
  cell: { w: number; h: number };
  anchor: { x: number; y: number }; // feet, for right-facing frames
}

/** meta.game written by tools/pack_atlas.py; all values in atlas pixels. */
export interface AtlasGame {
  anims: Record<string, AnimMeta>;
  bodyTop: number;
  muzzle?: { x: number; y: number };
}

const LOOPED = new Set(['idle', 'walk']);
// hit plays frames 0–2; frame 3 is almost empty, the fade-out is a tween
const LAST_FRAME: Record<string, number> = { 'zombie-hit': 2 };

/** Atlas plus its JSON once more as plain data, to read meta.game. */
export function loadAtlas(scene: Phaser.Scene, key: 'hero' | 'zombie') {
  scene.load.atlas(key, `sprites/${key}.png`, `sprites/${key}.json`);
  scene.load.json(`${key}-meta`, `sprites/${key}.json`);
}

export function atlasGame(scene: Phaser.Scene, key: string): AtlasGame {
  return scene.cache.json.get(`${key}-meta`).meta.game;
}

export function createAnims(scene: Phaser.Scene, key: string) {
  for (const [name, a] of Object.entries(atlasGame(scene, key).anims)) {
    const animKey = `${key}-${name}`;
    scene.anims.create({
      key: animKey,
      frames: scene.anims.generateFrameNames(key, { prefix: `${name}_`, start: 0, end: LAST_FRAME[animKey] ?? a.frames - 1 }),
      frameRate: a.fps,
      repeat: LOOPED.has(name) ? -1 : 0,
    });
  }
}

/** Puts the origin on the feet. Phaser flips around the frame middle, so a flipped sprite mirrors the anchor. */
export function applyAnchor(sprite: Phaser.GameObjects.Sprite, anim: AnimMeta) {
  const x = sprite.flipX ? anim.cell.w - anim.anchor.x : anim.anchor.x;
  sprite.setOrigin(x / anim.cell.w, anim.anchor.y / anim.cell.h);
}

/**
 * Body BODY_WIDTH of the idle cell wide, from the top of the head to the feet, centred on the feet.
 * Sizes and offsets are in frame pixels; Arcade applies the sprite scale itself.
 */
export function fitBody(sprite: Phaser.Physics.Arcade.Sprite, game: AtlasGame) {
  const a = game.anims.idle;
  const w = a.cell.w * BODY_WIDTH;
  const ax = sprite.flipX ? a.cell.w - a.anchor.x : a.anchor.x;
  const body = sprite.body as Phaser.Physics.Arcade.Body;
  body.setSize(w, a.anchor.y - game.bodyTop, false);
  body.setOffset(ax - w / 2, game.bodyTop);
}
```

- [ ] **Step 6: `src/entities/Hero.ts`**

```ts
import Phaser from 'phaser';
import { AtlasGame, applyAnchor, atlasGame, fitBody } from '../atlas';
import { BOLT_FRAME, CROUCH_TIME, HERO_SCALE, JUMP_SPEED, LAND_TIME, STOMP_BOUNCE, WALK_SPEED } from '../config';
import type { Intent } from '../input/Intent';
import { jumpAirFrame } from './jumpFrame';

export type HeroMode = 'idle' | 'walk' | 'jump' | 'shoot' | 'frozen';
export type Facing = 1 | -1;
type JumpPhase = 'crouch' | 'air' | 'land';

/** The boy with the blaster. Reads only the Intent; x/y is the point between his feet. */
export class Hero extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  mode: HeroMode = 'idle';
  facing: Facing = 1;
  onFire: (x: number, y: number, dir: Facing) => void = () => {};
  private phase: JumpPhase = 'crouch';
  private phaseTime = 0;
  private jumpCut = false;
  private boltFired = false;
  private shootQueued = false;
  private readonly meta: AtlasGame;
  private readonly intent: Intent;

  constructor(scene: Phaser.Scene, x: number, y: number, intent: Intent) {
    super(scene, x, y, 'hero', 'idle_0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.intent = intent;
    this.meta = atlasGame(scene, 'hero');
    this.setScale(HERO_SCALE);
    this.face(1, true);
    this.play('hero-idle');
  }

  step(delta: number) {
    if (this.mode === 'frozen') return;
    const s = this.intent.state;
    const dir = (s.right ? 1 : 0) - (s.left ? 1 : 0);
    const onGround = this.body.blocked.down || this.body.touching.down;
    if (this.mode === 'jump') return this.stepJump(delta, dir, onGround, s.jump);
    if (this.mode === 'shoot') return this.stepShoot();
    if (!onGround) return this.enterAir();
    if (this.intent.consume('jump')) return this.startJump();
    if (this.intent.consume('shoot') || s.shoot) return this.startShoot();
    if (dir !== 0) {
      this.face(dir as Facing);
      this.setVelocityX(dir * WALK_SPEED);
      this.setMode('walk');
    } else {
      this.setVelocityX(0);
      this.setMode('idle');
    }
  }

  bounce() {
    this.enterAir();
    this.setVelocityY(-STOMP_BOUNCE);
  }

  freeze() {
    this.mode = 'frozen';
    this.setVelocity(0, 0);
    this.play('hero-idle');
  }

  die() {
    this.freeze();
    this.body.enable = false;
  }

  respawn(x: number, y: number) {
    this.body.enable = true;
    this.body.reset(x, y);
    this.setAlpha(1);
    this.face(1, true);
    this.mode = 'idle';
    this.play('hero-idle');
  }

  private face(dir: Facing, force = false) {
    if (dir === this.facing && !force) return;
    this.facing = dir;
    this.setFlipX(dir < 0);
    applyAnchor(this, this.meta.anims.idle); // all hero animations share one cell and anchor
    fitBody(this, this.meta);
  }

  private setMode(mode: 'idle' | 'walk') {
    if (this.mode === mode) return;
    this.mode = mode;
    this.play(`hero-${mode}`);
  }

  private startJump() {
    this.mode = 'jump';
    this.phase = 'crouch';
    this.phaseTime = 0;
    this.jumpCut = false;
    this.anims.stop();
    this.setFrame('jump_0');
  }

  /** In the air without a jump (walked off a ledge, bounced off a zombie): no short-hop cut. */
  private enterAir() {
    this.mode = 'jump';
    this.phase = 'air';
    this.phaseTime = 0;
    this.jumpCut = true;
    this.anims.stop();
  }

  private stepJump(delta: number, dir: number, onGround: boolean, held: boolean) {
    this.phaseTime += delta;
    this.intent.consume('jump');
    this.intent.consume('shoot'); // no shooting in the air: there are no frames for it
    if (dir !== 0) this.face(dir as Facing);
    this.setVelocityX(this.phase === 'land' ? 0 : dir * WALK_SPEED);
    if (this.phase === 'crouch') {
      this.setFrame('jump_0');
      if (this.phaseTime >= CROUCH_TIME) {
        this.phase = 'air';
        this.phaseTime = 0;
        this.setVelocityY(-JUMP_SPEED);
      }
    } else if (this.phase === 'air') {
      const vy = this.body.velocity.y;
      if (!held && !this.jumpCut && vy < 0) {
        this.jumpCut = true; // short press -> lower jump
        this.setVelocityY(vy / 2);
      }
      if (onGround && vy >= 0) {
        this.phase = 'land';
        this.phaseTime = 0;
        this.setFrame('jump_5');
      } else {
        this.setFrame(`jump_${jumpAirFrame(vy, JUMP_SPEED)}`);
      }
    } else if (this.phaseTime >= LAND_TIME) {
      this.mode = 'idle';
      this.play('hero-idle');
    }
  }

  private startShoot() {
    this.mode = 'shoot';
    this.boltFired = false;
    this.shootQueued = false;
    this.setVelocityX(0);
    this.play('hero-shoot');
  }

  private stepShoot() {
    this.setVelocityX(0);
    if (this.intent.consume('shoot')) this.shootQueued = true;
    const frame = Number(String(this.frame.name).split('_')[1]);
    if (!this.boltFired && frame >= BOLT_FRAME) {
      this.boltFired = true;
      this.fire();
    }
    if (this.anims.isPlaying) return;
    if (this.shootQueued || this.intent.state.shoot) this.startShoot();
    else {
      this.mode = 'idle';
      this.play('hero-idle');
    }
  }

  private fire() {
    const m = this.meta.muzzle!;
    const a = this.meta.anims.shoot;
    const x = this.x + (m.x - a.anchor.x) * HERO_SCALE * this.facing;
    const y = this.y + (m.y - a.anchor.y) * HERO_SCALE;
    this.onFire(x, y, this.facing);
  }
}
```

- [ ] **Step 7: `src/scenes/BootScene.ts`**

```ts
import Phaser from 'phaser';
import { createAnims, loadAtlas } from '../atlas';
import { GAME_H, GAME_W } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const w = 400;
    this.add.rectangle(GAME_W / 2, GAME_H / 2, w + 8, 32).setStrokeStyle(3, 0xffffff);
    const bar = this.add.rectangle(GAME_W / 2 - w / 2, GAME_H / 2, 0, 24, 0xffffff).setOrigin(0, 0.5);
    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => (bar.width = w * p));
    this.load.setBaseURL(import.meta.env.BASE_URL);
    loadAtlas(this, 'hero');
    loadAtlas(this, 'zombie');
  }

  create() {
    createAnims(this, 'hero');
    createAnims(this, 'zombie');
    this.scene.start('Game');
  }
}
```

- [ ] **Step 8: Временная земля в `src/scenes/GameScene.ts`**

Замени содержимое (в Task 6 сцена переписывается целиком):

```ts
import Phaser from 'phaser';
import { GAME_H } from '../config';
import { Hero } from '../entities/Hero';
import type { Intent } from '../input/Intent';

const WORLD_W = 3000;
const GROUND_Y = 480;

/** Temporary: flat ground to tune the hero. Replaced by the level in Task 6. */
export class GameScene extends Phaser.Scene {
  private hero!: Hero;

  constructor() {
    super('Game');
  }

  create() {
    const ground = this.add.rectangle(0, GROUND_Y, WORLD_W, GAME_H - GROUND_Y, 0x8a5a2b).setOrigin(0);
    this.physics.add.existing(ground, true);
    this.physics.world.setBounds(0, 0, WORLD_W, GAME_H);
    this.hero = new Hero(this, 200, GROUND_Y, this.registry.get('intent') as Intent);
    this.hero.setCollideWorldBounds(true);
    this.physics.add.collider(this.hero, ground);
    this.hero.onFire = (x, y) => {
      const dot = this.add.circle(x, y, 6, 0x66ccff);
      this.tweens.add({ targets: dot, alpha: 0, duration: 400, onComplete: () => dot.destroy() });
    };
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H).startFollow(this.hero, true, 0.12, 0.12);
  }

  update(_time: number, delta: number) {
    this.hero.step(delta);
  }
}
```

- [ ] **Step 9: Сцены в `src/main.ts`**

Добавь импорт `import { BootScene } from './scenes/BootScene';` и замени строку `scene: [GameScene],` на `scene: [BootScene, GameScene],`.

- [ ] **Step 10: Проверить**

Run: `npm test && npm run build`
Expected: 13 passed, сборка без ошибок.

Run: `npm run dev`, открыть `http://localhost:5173/platformer-shooter/?debug`. Чеклист:
- прогресс-бар мелькает, потом герой стоит ногами на коричневой земле (рамка тела от макушки до ног, ~40 % ширины ячейки);
- ←/→ (и A/D) бегает, разворот не сдвигает ноги и рамку тела;
- ↑ (W) прыгает: присед → взлёт → вершина → падение → приземление; короткое нажатие даёт заметно более низкий прыжок; в воздухе можно рулить;
- пробел стреляет: на кадре 2 появляется голубая точка у дула (слева при развороте), удерживание даёт очередь; в прыжке пробел ничего не делает.

Если точка не у дула или ноги «прыгают» при развороте, это ошибка в якоре: сверь `meta.game` из `public/sprites/hero.json`.

- [ ] **Step 11: Commit**

```bash
git add src
git commit -m "Герой: атлас, анимации, машина состояний idle/walk/jump/shoot"
```

---

### Task 5: Разбор карты и сетка тайлов

**Files:**
- Create: `src/levels/parse.ts`, `src/levels/parse.test.ts`, `src/levels/grid.ts`, `src/levels/grid.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // parse.ts
  interface Cell { col: number; row: number }
  interface Level { width: number; height: number; solids: Cell[]; platforms: Cell[]; crates: Cell[]; zombies: Cell[]; flag: Cell; start: Cell }
  function parseLevel(rows: readonly string[]): Level; // throws Error with "строка R, столбец C"
  // grid.ts
  type Tile = '#' | '=' | 'C';
  class Grid {
    constructor(level: Level);
    tileAt(col: number, row: number): Tile | null;
    isBlocking(col: number, row: number): boolean; // '#' or 'C'; true left/right outside the map
    isGround(col: number, row: number): boolean;   // anything standable; false outside the map
    removeCrate(col: number, row: number): void;
  }
  ```

- [ ] **Step 1: Падающий тест `src/levels/parse.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { parseLevel } from './parse';

describe('parseLevel', () => {
  it('reads every symbol into tile coordinates', () => {
    const level = parseLevel([
      'P.CZ=F',
      '######',
    ]);
    expect(level.width).toBe(6);
    expect(level.height).toBe(2);
    expect(level.start).toEqual({ col: 0, row: 0 });
    expect(level.flag).toEqual({ col: 5, row: 0 });
    expect(level.crates).toEqual([{ col: 2, row: 0 }]);
    expect(level.zombies).toEqual([{ col: 3, row: 0 }]);
    expect(level.platforms).toEqual([{ col: 4, row: 0 }]);
    expect(level.solids).toHaveLength(6);
    expect(level.solids[0]).toEqual({ col: 0, row: 1 });
  });

  it('accepts CRLF line ends', () => {
    expect(parseLevel(['P..F\r', '####\r']).width).toBe(4);
  });

  it('rejects rows of different length with the row number', () => {
    expect(() => parseLevel(['P..F', '###'])).toThrow(/строка 2: длина 3, ожидалась 4/);
  });

  it('rejects an unknown symbol with row and column', () => {
    expect(() => parseLevel(['P. F', '####'])).toThrow(/неизвестный символ ' '.*строка 1, столбец 3/);
    expect(() => parseLevel(['P..F', '##x#'])).toThrow(/неизвестный символ 'x'.*строка 2, столбец 3/);
  });

  it('requires exactly one start and one flag', () => {
    expect(() => parseLevel(['...F', '####'])).toThrow(/нет старта P/);
    expect(() => parseLevel(['P...', '####'])).toThrow(/нет флага F/);
    expect(() => parseLevel(['P.PF', '####'])).toThrow(/второй старт P.*строка 1, столбец 3/);
    expect(() => parseLevel(['PFF.', '####'])).toThrow(/второй флаг F.*строка 1, столбец 3/);
  });

  it('rejects an empty map', () => {
    expect(() => parseLevel([])).toThrow(/карта пуста/);
    expect(() => parseLevel([''])).toThrow(/карта пуста/);
  });
});
```

- [ ] **Step 2: Падающий тест `src/levels/grid.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { Grid } from './grid';
import { parseLevel } from './parse';

const grid = () =>
  new Grid(parseLevel([
    'P....F',
    '..C...',
    '#=####',
  ]));

describe('Grid', () => {
  it('knows the tile in each cell', () => {
    const g = grid();
    expect(g.tileAt(0, 2)).toBe('#');
    expect(g.tileAt(1, 2)).toBe('=');
    expect(g.tileAt(2, 1)).toBe('C');
    expect(g.tileAt(3, 1)).toBeNull();
  });

  it('ground and crates block walking, one-way platforms do not', () => {
    const g = grid();
    expect(g.isBlocking(0, 2)).toBe(true);
    expect(g.isBlocking(2, 1)).toBe(true);
    expect(g.isBlocking(1, 2)).toBe(false);
    expect(g.isBlocking(3, 1)).toBe(false);
  });

  it('ground, platforms and crates can be stood on', () => {
    const g = grid();
    expect(g.isGround(0, 2)).toBe(true);
    expect(g.isGround(1, 2)).toBe(true);
    expect(g.isGround(2, 1)).toBe(true);
    expect(g.isGround(3, 1)).toBe(false);
  });

  it('left and right of the map are walls with no floor; above and below are empty', () => {
    const g = grid();
    expect(g.isBlocking(-1, 1)).toBe(true);
    expect(g.isBlocking(6, 1)).toBe(true);
    expect(g.isGround(-1, 2)).toBe(false);
    expect(g.isGround(6, 2)).toBe(false);
    expect(g.isBlocking(0, -1)).toBe(false);
    expect(g.isGround(0, 3)).toBe(false);
  });

  it('a broken crate frees its cell', () => {
    const g = grid();
    g.removeCrate(2, 1);
    expect(g.tileAt(2, 1)).toBeNull();
    expect(g.isBlocking(2, 1)).toBe(false);
    expect(g.isGround(2, 1)).toBe(false);
  });

  it('removeCrate leaves other tiles alone', () => {
    const g = grid();
    g.removeCrate(0, 2);
    expect(g.tileAt(0, 2)).toBe('#');
  });
});
```

- [ ] **Step 3: Убедиться, что оба падают**

Run: `npx vitest run src/levels`
Expected: FAIL, `Failed to resolve import "./parse"` и `"./grid"`.

- [ ] **Step 4: `src/levels/parse.ts`**

```ts
export interface Cell {
  col: number;
  row: number;
}

export interface Level {
  width: number;
  height: number;
  solids: Cell[];
  platforms: Cell[];
  crates: Cell[];
  zombies: Cell[];
  flag: Cell;
  start: Cell;
}

const LISTS = { '#': 'solids', '=': 'platforms', C: 'crates', Z: 'zombies' } as const;

/** ASCII map, one string per row and one char per tile -> objects in tile coordinates. */
export function parseLevel(rows: readonly string[]): Level {
  const lines = rows.map((r) => r.replace(/\r$/, ''));
  if (lines.length === 0 || lines[0].length === 0) throw new Error('карта пуста');
  const width = lines[0].length;
  const lists = { solids: [] as Cell[], platforms: [] as Cell[], crates: [] as Cell[], zombies: [] as Cell[] };
  let start: Cell | undefined;
  let flag: Cell | undefined;
  lines.forEach((line, row) => {
    if (line.length !== width) throw new Error(`строка ${row + 1}: длина ${line.length}, ожидалась ${width}`);
    [...line].forEach((ch, col) => {
      const at = `строка ${row + 1}, столбец ${col + 1}`;
      const list = LISTS[ch as keyof typeof LISTS];
      if (ch === '.') return;
      if (list) lists[list].push({ col, row });
      else if (ch === 'P') {
        if (start) throw new Error(`второй старт P: ${at}`);
        start = { col, row };
      } else if (ch === 'F') {
        if (flag) throw new Error(`второй флаг F: ${at}`);
        flag = { col, row };
      } else throw new Error(`неизвестный символ '${ch}': ${at}`);
    });
  });
  if (!start) throw new Error('нет старта P');
  if (!flag) throw new Error('нет флага F');
  return { width, height: lines.length, ...lists, start, flag };
}
```

- [ ] **Step 5: `src/levels/grid.ts`**

```ts
import type { Level } from './parse';

export type Tile = '#' | '=' | 'C';

const key = (col: number, row: number) => `${col},${row}`;

/** Tile lookup for zombie patrol. Left and right of the map are walls without a floor; above and below are empty. */
export class Grid {
  private readonly tiles = new Map<string, Tile>();
  private readonly width: number;

  constructor(level: Level) {
    this.width = level.width;
    for (const c of level.solids) this.tiles.set(key(c.col, c.row), '#');
    for (const c of level.platforms) this.tiles.set(key(c.col, c.row), '=');
    for (const c of level.crates) this.tiles.set(key(c.col, c.row), 'C');
  }

  tileAt(col: number, row: number): Tile | null {
    return this.tiles.get(key(col, row)) ?? null;
  }

  isBlocking(col: number, row: number): boolean {
    if (col < 0 || col >= this.width) return true;
    const t = this.tileAt(col, row);
    return t === '#' || t === 'C';
  }

  isGround(col: number, row: number): boolean {
    if (col < 0 || col >= this.width) return false;
    return this.tileAt(col, row) !== null;
  }

  removeCrate(col: number, row: number) {
    if (this.tileAt(col, row) === 'C') this.tiles.delete(key(col, row));
  }
}
```

- [ ] **Step 6: Прогнать**

Run: `npm test`
Expected: все тесты зелёные (Intent 8, jumpFrame 5, parse 6, grid 6).

- [ ] **Step 7: Commit**

```bash
git add src/levels
git commit -m "Разбор ASCII-карты с ошибками по строке и столбцу, сетка тайлов для патруля"
```

---

### Task 6: Мир: текстуры, первый уровень, параллакс, камера, падение в яму

**Files:**
- Create: `src/textures/placeholders.ts`, `src/levels/level1.ts`, `src/levels/level1.test.ts`
- Modify: `src/scenes/BootScene.ts` (вызов `makeTextures`), `src/scenes/GameScene.ts` (переписать целиком)

**Interfaces:**
- Consumes: `parseLevel`, `Grid` (Task 5), `Hero` (Task 4).
- Produces: `makeTextures(scene)` и текстуры с ключами `sky`, `clouds`, `hills-far`, `hills-near`, `ground`, `ground-top`, `platform`, `crate`, `flag`, `bolt`, `spark`, `debris`. `LEVEL1: string[]`. `GameScene` с полями `level`, `grid`, `hero`, `solids`, `platforms`, `crates`, `flag`, методами `feet(cell)`, `killHero()`. В registry при каждом старте сцены: `kills: 0`, `won: false`, `zombiesTotal`.

- [ ] **Step 1: Падающий тест `src/levels/level1.test.ts`**

Карта не должна ломаться при правке; тест закрепляет форму уровня из спеки.

```ts
import { describe, expect, it } from 'vitest';
import { LEVEL1 } from './level1';
import { parseLevel } from './parse';

describe('LEVEL1', () => {
  const level = parseLevel(LEVEL1);
  it('is 70×9 tiles', () => {
    expect(level.width).toBe(70);
    expect(level.height).toBe(9);
  });
  it('has five zombies, each standing on something', () => {
    expect(level.zombies).toHaveLength(5);
    const standable = new Set([...level.solids, ...level.platforms, ...level.crates].map((c) => `${c.col},${c.row}`));
    for (const z of level.zombies) expect(standable.has(`${z.col},${z.row + 1}`)).toBe(true);
  });
  it('has crates, two platform heights and at least two pits', () => {
    expect(level.crates.length).toBeGreaterThan(0);
    expect(new Set(level.platforms.map((p) => p.row)).size).toBe(2);
    const bottom = new Set(level.solids.filter((s) => s.row === 8).map((s) => s.col));
    const pits = [...Array(level.width).keys()].filter((c) => !bottom.has(c) && bottom.has(c - 1));
    expect(pits.length).toBeGreaterThanOrEqual(2);
  });
  it('puts the flag higher than the start', () => {
    expect(level.flag.row).toBeLessThan(level.start.row);
  });
});
```

Run: `npx vitest run src/levels/level1.test.ts`
Expected: FAIL, `Failed to resolve import "./level1"`.

- [ ] **Step 2: `src/levels/level1.ts`**

```ts
// 70×9 tiles of 60 px. Legend: . empty, # ground, = one-way platform, C crate, Z zombie, P start, F flag.
// Jump reaches ~2 tiles up and ~2.8 across, so pits are 2 wide and platforms 2 tiles apart in height.
// The bolt flies ~1.6 tiles above the feet: crates meant to be shot are stacked 2 high.
export const LEVEL1: string[] = [
  '......................................................................',
  '......................................................................',
  '.................................Z................Z...................',
  '..............................=======...........=====.................',
  '...................Z.........C..............Z.........................',
  '.........C.......=====......CC............=====..........C........F...',
  '..P......C.................CCC.....Z.....................C....########',
  '############..########################..#############..###############',
  '############..########################..#############..###############',
];
```

Run: `npx vitest run src/levels/level1.test.ts`
Expected: 4 passed.

- [ ] **Step 3: `src/textures/placeholders.ts`**

```ts
import Phaser from 'phaser';
import { GAME_H, GAME_W, SKY_BOTTOM, SKY_TOP, TILE } from '../config';

/** Every non-character texture, drawn once. To reskin an object, replace its function with a PNG load. */
export function makeTextures(scene: Phaser.Scene) {
  makeSky(scene);
  makeClouds(scene);
  makeHills(scene, 'hills-far', 260, 0x8fd18a, 60, 2);
  makeHills(scene, 'hills-near', 200, 0x5fb35a, 45, 3);
  makeGround(scene, 'ground', false);
  makeGround(scene, 'ground-top', true);
  makePlatform(scene);
  makeCrate(scene);
  makeFlag(scene);
  makeBolt(scene);
  makeSpark(scene);
  makeDebris(scene);
}

const css = (c: number) => '#' + c.toString(16).padStart(6, '0');

function draw(scene: Phaser.Scene, key: string, w: number, h: number, paint: (g: Phaser.GameObjects.Graphics) => void) {
  const g = scene.make.graphics({}, false);
  paint(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function makeSky(scene: Phaser.Scene) {
  const tex = scene.textures.createCanvas('sky', 4, GAME_H)!;
  const ctx = tex.getContext();
  const grad = ctx.createLinearGradient(0, 0, 0, GAME_H);
  grad.addColorStop(0, css(SKY_TOP));
  grad.addColorStop(1, css(SKY_BOTTOM));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, GAME_H);
  tex.refresh();
}

function makeClouds(scene: Phaser.Scene) {
  const puffs: [number, number, number][] = [[120, 70, 1], [420, 130, 0.8], [700, 60, 1.2], [880, 160, 0.7]];
  draw(scene, 'clouds', GAME_W, 260, (g) => {
    g.fillStyle(0xffffff, 0.9);
    for (const [x, y, s] of puffs) {
      g.fillEllipse(x, y, 120 * s, 44 * s);
      g.fillEllipse(x - 40 * s, y + 8 * s, 80 * s, 34 * s);
      g.fillEllipse(x + 42 * s, y + 6 * s, 90 * s, 36 * s);
    }
  });
}

/** A whole number of waves across GAME_W, so the TileSprite repeats without a seam. */
function makeHills(scene: Phaser.Scene, key: string, h: number, color: number, amp: number, waves: number) {
  draw(scene, key, GAME_W, h, (g) => {
    g.fillStyle(color);
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= GAME_W; x += 8) {
      const t = (x / GAME_W) * Math.PI * 2 * waves;
      g.lineTo(x, h - amp - amp * 0.6 * Math.sin(t) - amp * 0.4 * Math.sin(2 * t + 1));
    }
    g.lineTo(GAME_W, h);
    g.closePath();
    g.fillPath();
  });
}

function makeGround(scene: Phaser.Scene, key: string, grass: boolean) {
  draw(scene, key, TILE, TILE, (g) => {
    g.fillStyle(0x8a5a2b).fillRect(0, 0, TILE, TILE);
    g.fillStyle(0x6e4521);
    for (const [x, y] of [[10, 22], [38, 14], [24, 44], [48, 40]]) g.fillCircle(x, y, 4);
    if (grass) g.fillStyle(0x58b947).fillRect(0, 0, TILE, 14).fillStyle(0x3f9a35).fillRect(0, 12, TILE, 4);
  });
}

function makePlatform(scene: Phaser.Scene) {
  draw(scene, 'platform', TILE, 20, (g) => {
    g.fillStyle(0xb07a3c).fillRect(0, 0, TILE, 20);
    g.lineStyle(3, 0x6e4a22).strokeRect(1.5, 1.5, TILE - 3, 17);
  });
}

function makeCrate(scene: Phaser.Scene) {
  draw(scene, 'crate', TILE, TILE, (g) => {
    g.fillStyle(0xc98a3d).fillRect(0, 0, TILE, TILE);
    g.lineStyle(5, 0x7a4f1d).strokeRect(2.5, 2.5, TILE - 5, TILE - 5);
    g.lineBetween(6, 6, TILE - 6, TILE - 6).lineBetween(TILE - 6, 6, 6, TILE - 6);
  });
}

function makeFlag(scene: Phaser.Scene) {
  draw(scene, 'flag', TILE, 150, (g) => {
    g.fillStyle(0xdddddd).fillRect(26, 0, 6, 150);
    g.fillStyle(0xe94b3c).fillTriangle(32, 8, 58, 24, 32, 40);
    g.fillStyle(0x777777).fillRect(18, 142, 22, 8);
  });
}

function makeBolt(scene: Phaser.Scene) {
  draw(scene, 'bolt', 40, 14, (g) => {
    g.fillStyle(0x50beff, 0.45).fillEllipse(20, 7, 40, 14);
    g.fillStyle(0xa0e6ff).fillRect(8, 3, 28, 8);
    g.fillStyle(0xffffff).fillRect(24, 5, 12, 4);
  });
}

function makeSpark(scene: Phaser.Scene) {
  draw(scene, 'spark', 8, 8, (g) => g.fillStyle(0xbfeaff).fillRect(0, 0, 8, 8));
}

function makeDebris(scene: Phaser.Scene) {
  draw(scene, 'debris', 14, 14, (g) => {
    g.fillStyle(0xc98a3d).fillRect(0, 0, 14, 14);
    g.lineStyle(3, 0x7a4f1d).strokeRect(1.5, 1.5, 11, 11);
  });
}
```

- [ ] **Step 4: Вызвать в `src/scenes/BootScene.ts`**

Добавь импорт `import { makeTextures } from '../textures/placeholders';` и первой строкой в `create()`: `makeTextures(this);`.

- [ ] **Step 5: Переписать `src/scenes/GameScene.ts` целиком**

```ts
import Phaser from 'phaser';
import { BLINK_TIME, CAMERA_LEAD, FADE_TIME, FALL_MARGIN, GAME_H, GAME_W, PARALLAX, TILE } from '../config';
import { Hero } from '../entities/Hero';
import type { Intent } from '../input/Intent';
import { Grid } from '../levels/grid';
import { LEVEL1 } from '../levels/level1';
import { Cell, Level, parseLevel } from '../levels/parse';

export class GameScene extends Phaser.Scene {
  private level!: Level;
  private grid!: Grid;
  private hero!: Hero;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private crates!: Phaser.Physics.Arcade.StaticGroup;
  private flag!: Phaser.Physics.Arcade.Image;
  private layers: Phaser.GameObjects.TileSprite[] = [];
  private respawning = false;

  constructor() {
    super('Game');
  }

  /** The scene object survives restart(): reset every field that create() does not overwrite. */
  init() {
    this.layers = [];
    this.respawning = false;
  }

  create() {
    this.level = parseLevel(LEVEL1);
    this.grid = new Grid(this.level);
    this.registry.set({ kills: 0, won: false, zombiesTotal: this.level.zombies.length });
    const worldW = this.level.width * TILE;
    const worldH = this.level.height * TILE;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.physics.world.setBoundsCollision(true, true, false, false); // pits stay open at the bottom

    this.addBackground();
    this.addTiles();

    this.hero = new Hero(this, ...this.feet(this.level.start), this.registry.get('intent') as Intent);
    this.hero.setCollideWorldBounds(true);
    this.physics.add.collider(this.hero, [this.solids, this.platforms, this.crates]);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldW, worldH);
    cam.startFollow(this.hero, true, 0.12, 0.12);
    cam.fadeIn(FADE_TIME);
  }

  update(_time: number, delta: number) {
    this.hero.step(delta);
    const cam = this.cameras.main;
    // followOffset is subtracted from the target, so a negative x looks ahead to the right
    const lead = this.hero.facing > 0 ? -CAMERA_LEAD : CAMERA_LEAD;
    cam.followOffset.x += (lead - cam.followOffset.x) * Math.min(1, delta / 400);
    this.layers.forEach((layer, i) => (layer.tilePositionX = cam.scrollX * PARALLAX[i]));
    if (this.hero.y > this.level.height * TILE + FALL_MARGIN) this.killHero();
  }

  /** World point between the feet of something standing in this cell. */
  private feet(cell: Cell): [number, number] {
    return [(cell.col + 0.5) * TILE, (cell.row + 1) * TILE];
  }

  private addBackground() {
    this.add.image(0, 0, 'sky').setOrigin(0).setScrollFactor(0).setDisplaySize(GAME_W, GAME_H);
    this.layers = [
      this.add.tileSprite(0, 0, GAME_W, 260, 'clouds'),
      this.add.tileSprite(0, GAME_H - 260, GAME_W, 260, 'hills-far'),
      this.add.tileSprite(0, GAME_H - 200, GAME_W, 200, 'hills-near'),
    ].map((layer) => layer.setOrigin(0).setScrollFactor(0));
  }

  private addTiles() {
    this.solids = this.physics.add.staticGroup();
    this.platforms = this.physics.add.staticGroup();
    this.crates = this.physics.add.staticGroup();
    for (const c of this.level.solids) {
      const key = this.grid.tileAt(c.col, c.row - 1) === '#' ? 'ground' : 'ground-top';
      this.solids.create((c.col + 0.5) * TILE, (c.row + 0.5) * TILE, key);
    }
    for (const c of this.level.platforms) {
      const p = this.platforms.create((c.col + 0.5) * TILE, c.row * TILE + 10, 'platform') as Phaser.Physics.Arcade.Sprite;
      const body = p.body as Phaser.Physics.Arcade.StaticBody;
      // one-way: only the top face collides, so you can jump through from below and walk through from the side
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
    }
    for (const c of this.level.crates) {
      const crate = this.crates.create((c.col + 0.5) * TILE, (c.row + 0.5) * TILE, 'crate') as Phaser.Physics.Arcade.Sprite;
      crate.setData('cell', c);
    }
    const [fx, fy] = this.feet(this.level.flag);
    this.flag = this.physics.add.staticImage(fx, fy, 'flag').setOrigin(0.5, 1).refreshBody();
  }

  /** Blink, fade to black, back to the start. Zombies and crates stay as they are. */
  private killHero() {
    if (this.respawning) return;
    this.respawning = true;
    this.hero.die();
    this.tweens.add({
      targets: this.hero,
      alpha: 0.2,
      duration: BLINK_TIME / 6,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        const cam = this.cameras.main;
        cam.fadeOut(FADE_TIME, 0, 0, 0);
        cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.hero.respawn(...this.feet(this.level.start));
          cam.fadeIn(FADE_TIME);
          this.respawning = false;
        });
      },
    });
  }
}
```

- [ ] **Step 6: Проверить**

Run: `npm test && npm run build`
Expected: все тесты зелёные, сборка без ошибок (поле `flag` до Task 9 только пишется; `noUnusedLocals` выключен, ошибки нет).

Run: `npm run dev`, `http://localhost:5173/platformer-shooter/?debug`. Чеклист:
- небо градиентом, облака и два слоя холмов сдвигаются медленнее земли (облака медленнее всех), швов нет;
- герой стоит на траве у левого края; ящики 2×1 на столбце 10 не пройти, надо перепрыгнуть;
- на платформу на высоте 2 тайла запрыгивается с земли, снизу сквозь неё проходит, сверху стоит;
- лестница из ящиков ведёт на верхнюю платформу;
- падение в яму (столбцы 13–14): мигание, затемнение, герой снова на старте;
- камера идёт за героем с опережением в сторону взгляда, не выходит за края уровня;
- флаг у правого края на возвышении (пока без реакции).

Если какой-то прыжок по уровню невозможен (например, на верхнюю платформу), правь `level1.ts`, а не физику: значения прыжка зафиксированы спекой. Тест `level1.test.ts` должен остаться зелёным.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "Первый уровень: тайлы, платформы, ящики, параллакс, камера, падение в яму"
```

---

### Task 7: Стрельба: снаряды, искры, ломание ящиков

**Files:**
- Create: `src/entities/Bolt.ts`
- Modify: `src/scenes/GameScene.ts`

**Interfaces:**
- Consumes: `Hero.onFire` (Task 4), `Grid.removeCrate` (Task 5), текстуры `bolt`, `spark`, `debris` (Task 6).
- Produces:
  ```ts
  class Bolt extends Phaser.Physics.Arcade.Image {
    constructor(scene: Phaser.Scene, x: number, y: number);
    launch(dir: 1 | -1): void; // call after adding to the bolts group
  }
  // GameScene private: bolts: Phaser.Physics.Arcade.Group; sparks: ParticleEmitter;
  //   fireBolt(x, y, dir), boltHit(bolt), breakCrate(crate)
  ```

- [ ] **Step 1: `src/entities/Bolt.ts`**

```ts
import Phaser from 'phaser';
import { BOLT_LIFE, BOLT_SPEED } from '../config';

/** Blaster shot: flies straight, gone after BOLT_LIFE or on the first hit. */
export class Bolt extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'bolt');
    scene.add.existing(this);
  }

  /** After group.add(): the group resets velocity to its defaults when a child is added. */
  launch(dir: 1 | -1) {
    this.setFlipX(dir < 0);
    this.setVelocityX(dir * BOLT_SPEED);
    this.scene.time.delayedCall(BOLT_LIFE, () => this.active && this.destroy());
  }
}
```

- [ ] **Step 2: Подключить в `src/scenes/GameScene.ts`**

Импорты: добавь `DEBRIS` в импорт из `'../config'` и строку `import { Bolt } from '../entities/Bolt';`.

Поля класса (после `private flag!`):

```ts
  private bolts!: Phaser.Physics.Arcade.Group;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
```

В `create()` сразу после строки `this.physics.add.collider(this.hero, [this.solids, this.platforms, this.crates]);`:

```ts
    this.bolts = this.physics.add.group({ allowGravity: false });
    this.sparks = this.add.particles(0, 0, 'spark', {
      speed: { min: 80, max: 260 },
      angle: { min: 0, max: 360 },
      lifespan: 350,
      scale: { start: 1, end: 0 },
      gravityY: 900,
      emitting: false,
    }).setDepth(5);
    this.hero.onFire = (x, y, dir) => this.fireBolt(x, y, dir);
    this.physics.add.overlap(this.bolts, this.solids, (b) => this.boltHit(b as Bolt));
    this.physics.add.overlap(this.bolts, this.crates, (b, c) => {
      if (!(b as Bolt).active) return;
      this.boltHit(b as Bolt);
      this.breakCrate(c as Phaser.Physics.Arcade.Sprite);
    });
```

Новые методы (перед `killHero`):

```ts
  private fireBolt(x: number, y: number, dir: 1 | -1) {
    const bolt = new Bolt(this, x, y);
    this.bolts.add(bolt);
    bolt.launch(dir);
  }

  private boltHit(bolt: Bolt) {
    if (!bolt.active) return; // already spent on something else this frame
    this.sparks.explode(10, bolt.x, bolt.y);
    bolt.destroy();
  }

  /** Crate is gone for good: from physics, from the patrol grid, in a burst of debris. */
  private breakCrate(crate: Phaser.Physics.Arcade.Sprite) {
    const cell = crate.getData('cell') as Cell;
    this.grid.removeCrate(cell.col, cell.row);
    for (let i = 0; i < DEBRIS; i++) {
      const d = this.physics.add.image(crate.x, crate.y, 'debris');
      d.setVelocity(Phaser.Math.Between(-220, 220), Phaser.Math.Between(-520, -220));
      d.setAngularVelocity(Phaser.Math.Between(-400, 400));
      this.tweens.add({ targets: d, alpha: 0, delay: 400, duration: 300, onComplete: () => d.destroy() });
    }
    crate.destroy();
  }
```

- [ ] **Step 3: Проверить**

Run: `npm test && npm run build`
Expected: тесты зелёные, сборка без ошибок.

Run: `npm run dev`. Чеклист:
- пробел: синий снаряд вылетает из дула на кадре выстрела, летит в сторону взгляда (и влево тоже), исчезает через 1,2 с (~18 тайлов) или при касании земли;
- выстрел по двойному ящику на столбце 10: ящик, в который попали, разлетается на 6 обломков, искры, снаряд исчезает; второй выстрел ломает второй ящик, дорога свободна;
- снаряд сквозь одностороннюю платформу пролетает (спека: исчезает от земли, ящика, зомби);
- в одном кадре снаряд не ломает два ящика сразу.

- [ ] **Step 4: Commit**

```bash
git add src
git commit -m "Стрельба: снаряд, искры, ящики ломаются и освобождают клетку"
```

---

### Task 8: Зомби: патруль, выпад, смерть от снаряда и прыжка сверху, респаун героя

**Files:**
- Create: `src/entities/patrol.ts`, `src/entities/patrol.test.ts`, `src/entities/Zombie.ts`
- Modify: `src/scenes/GameScene.ts`

**Interfaces:**
- Consumes: `Grid.isBlocking/isGround` (Task 5), `Hero.mode/bounce()` (Task 4), `GameScene.killHero/boltHit/feet` (Tasks 6–7), анимации `zombie-idle|walk|attack|jump|hit` (Task 4).
- Produces:
  ```ts
  type Dir = 1 | -1;
  function nextDirection(dir: Dir, blockedAhead: boolean, groundAhead: boolean): Dir;
  type ZombieMode = 'walk' | 'attack' | 'dying';
  class Zombie extends Phaser.Physics.Arcade.Sprite {
    constructor(scene: Phaser.Scene, x: number, y: number);
    body: Phaser.Physics.Arcade.Body; mode: ZombieMode; dir: Dir;
    step(delta: number, grid: Grid, hero: Hero): void;
    die(): void;
  }
  ```
  Registry `kills` растёт на 1 в момент попадания.

- [ ] **Step 1: Падающий тест `src/entities/patrol.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { nextDirection } from './patrol';

describe('nextDirection', () => {
  it('keeps going when the way is clear and there is floor ahead', () => {
    expect(nextDirection(1, false, true)).toBe(1);
    expect(nextDirection(-1, false, true)).toBe(-1);
  });
  it('turns at a wall', () => {
    expect(nextDirection(1, true, true)).toBe(-1);
    expect(nextDirection(-1, true, true)).toBe(1);
  });
  it('turns at a ledge', () => {
    expect(nextDirection(1, false, false)).toBe(-1);
    expect(nextDirection(-1, false, false)).toBe(1);
  });
  it('turns at the map edge (Grid reports a wall and no floor there)', () => {
    expect(nextDirection(-1, true, false)).toBe(1);
  });
});
```

Run: `npx vitest run src/entities/patrol.test.ts`
Expected: FAIL, `Failed to resolve import "./patrol"`.

- [ ] **Step 2: `src/entities/patrol.ts`**

```ts
export type Dir = 1 | -1;

/** Patrol rule: turn around at a wall or where the floor ends. */
export function nextDirection(dir: Dir, blockedAhead: boolean, groundAhead: boolean): Dir {
  return blockedAhead || !groundAhead ? (-dir as Dir) : dir;
}
```

Run: `npx vitest run src/entities/patrol.test.ts`
Expected: 4 passed.

- [ ] **Step 3: `src/entities/Zombie.ts`**

```ts
import Phaser from 'phaser';
import { AtlasGame, applyAnchor, atlasGame, fitBody } from '../atlas';
import { ATTACK_COOLDOWN, ATTACK_RANGE, HERO_SCALE, TILE, ZOMBIE_SPEED } from '../config';
import type { Grid } from '../levels/grid';
import type { Hero } from './Hero';
import { Dir, nextDirection } from './patrol';

export type ZombieMode = 'walk' | 'attack' | 'dying';

/** Walks its floor back and forth, lunges at a close hero (animation only), dies from a bolt or a stomp. */
export class Zombie extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  mode: ZombieMode = 'walk';
  dir: Dir = 1;
  private cooldown = 0;
  private anim = 'walk';
  private readonly meta: AtlasGame;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'zombie', 'walk_0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.meta = atlasGame(scene, 'zombie');
    this.setScale(HERO_SCALE);
    this.setAnim('walk');
    this.face(-1); // dir starts at 1, so this flips, anchors and fits the body; faces the hero coming from the left
  }

  step(delta: number, grid: Grid, hero: Hero) {
    if (this.mode === 'dying') return;
    if (this.mode === 'attack') {
      this.setVelocityX(0);
      if (!this.anims.isPlaying) {
        this.mode = 'walk';
        this.cooldown = ATTACK_COOLDOWN;
        this.setAnim('walk');
      }
      return;
    }
    this.cooldown = Math.max(0, this.cooldown - delta);
    if (this.cooldown === 0 && hero.mode !== 'frozen' &&
        Math.abs(hero.x - this.x) < ATTACK_RANGE && Math.abs(hero.y - this.y) < TILE / 2) {
      this.face(hero.x >= this.x ? 1 : -1);
      this.mode = 'attack';
      this.setVelocityX(0);
      this.setAnim('attack');
      return;
    }
    const b = this.body;
    if (!(b.blocked.down || b.touching.down)) return; // spawning or falling: let gravity settle it
    const col = Math.floor((this.dir > 0 ? b.right + 1 : b.left - 1) / TILE);
    const row = Math.floor((b.bottom - 1) / TILE); // the row the feet are in
    this.face(nextDirection(this.dir, grid.isBlocking(col, row), grid.isGround(col, row + 1)));
    this.setVelocityX(this.dir * ZOMBIE_SPEED);
  }

  /** Hit frames 0–2, then fade out. The body goes away at once so nothing touches it again. */
  die() {
    this.mode = 'dying';
    this.setVelocity(0, 0);
    this.body.enable = false;
    this.setAnim('hit');
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () =>
      this.scene.tweens.add({ targets: this, alpha: 0, duration: 150, onComplete: () => this.destroy() }));
  }

  /** Animations may have their own cell (hit is taller), so the anchor follows the animation. */
  private setAnim(name: string) {
    this.anim = name;
    this.play(`zombie-${name}`);
    applyAnchor(this, this.meta.anims[name]);
  }

  private face(dir: Dir) {
    if (dir === this.dir) return;
    this.dir = dir;
    this.setFlipX(dir < 0);
    applyAnchor(this, this.meta.anims[this.anim]);
    fitBody(this, this.meta);
  }
}
```

- [ ] **Step 4: Подключить в `src/scenes/GameScene.ts`**

Импорты: `import { Zombie } from '../entities/Zombie';`.

Поле класса (после `private sparks!`):

```ts
  private zombies!: Phaser.Physics.Arcade.Group;
```

В `create()` после блока со снарядами (после `overlap(this.bolts, this.crates, …)`):

```ts
    this.zombies = this.physics.add.group();
    for (const cell of this.level.zombies) {
      const z = new Zombie(this, ...this.feet(cell));
      this.zombies.add(z);
      z.setCollideWorldBounds(true); // after add(): the group applies its defaults on add
    }
    this.physics.add.collider(this.zombies, [this.solids, this.platforms, this.crates]);
    this.physics.add.overlap(this.hero, this.zombies, (_h, z) => this.touchZombie(z as Zombie));
    this.physics.add.overlap(this.bolts, this.zombies, (b, z) => {
      if (!(b as Bolt).active || (z as Zombie).mode === 'dying') return;
      this.boltHit(b as Bolt);
      this.killZombie(z as Zombie);
    });
```

В `update()` после `this.hero.step(delta);`:

```ts
    for (const z of [...this.zombies.getChildren()] as Zombie[]) z.step(delta, this.grid, this.hero);
```

Новые методы (перед `killHero`):

```ts
  /** Feet above the zombie's middle while falling = stomp; any other touch sends the hero back. */
  private touchZombie(z: Zombie) {
    if (this.hero.mode === 'frozen' || z.mode === 'dying') return;
    const hb = this.hero.body;
    if (hb.velocity.y > 0 && hb.bottom < z.body.center.y) {
      this.killZombie(z);
      this.hero.bounce();
    } else {
      this.killHero();
    }
  }

  private killZombie(z: Zombie) {
    z.die();
    this.registry.inc('kills', 1);
  }
```

- [ ] **Step 5: Проверить**

Run: `npm test && npm run build`
Expected: все тесты зелёные (+4 patrol), сборка без ошибок.

Run: `npm run dev`, `?debug`. Чеклист:
- пять зомби стоят ногами на своих платформах/земле, ходят со скоростью ~1 тайл/с;
- зомби на платформе разворачивается у её края, не падает; зомби на земле (столбец 36) разворачивается у лестницы ящиков и у ямы;
- сломай ящики лестницы (нижний ряд не достать снарядом, это нормально): если сломан ящик на высоте ног зомби, зомби проходит через освободившуюся клетку, а не разворачивается перед пустотой;
- подойди к зомби на одной высоте ближе 1,5 тайла: он останавливается, делает выпад руками, потом снова идёт; урон только от касания;
- касание сбоку: мигание, затемнение, старт; зомби и сломанные ящики остались как были;
- прыжок сверху: зомби играет «удивление», растворяется, герой подскакивает;
- снаряд по зомби на той же высоте: то же растворение, снаряд исчезает с искрами;
- счётчик убитых пока не виден: он появится в Task 9.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "Зомби: патруль по сетке, выпад, смерть от снаряда и прыжка сверху, респаун героя"
```

---

### Task 9: UIScene: тач-кнопки, счётчик, финиш и победа, ⛶, «Поверни телефон»

**Files:**
- Create: `src/scenes/UIScene.ts`
- Modify: `src/scenes/GameScene.ts` (флаг), `src/scenes/BootScene.ts` (запуск UI), `src/main.ts` (список сцен)

**Interfaces:**
- Consumes: `Intent` из registry, registry `kills`, `won`, `zombiesTotal` (Task 6, 8), сцена `'Game'`.
- Produces: сцена `'UI'`, работает параллельно с `'Game'` всё время и переживает её `restart()`.

- [ ] **Step 1: Флаг в `src/scenes/GameScene.ts`**

В `create()` после блока зомби:

```ts
    this.physics.add.overlap(this.hero, this.flag, () => {
      if (this.registry.get('won') || this.respawning) return;
      this.hero.freeze();
      this.registry.set('won', true);
    });
```

- [ ] **Step 2: `src/scenes/UIScene.ts`**

```ts
import Phaser from 'phaser';
import { BUTTON_MARGIN, BUTTON_SIZE, BUTTON_SLOP, GAME_H, GAME_W } from '../config';
import type { Action, Intent } from '../input/Intent';

const FONT = 'system-ui, -apple-system, sans-serif';
const TEXT = { fontFamily: FONT, color: '#ffffff', stroke: '#1d2b3a', strokeThickness: 6 };

/** Runs on top of 'Game' for the whole session. Reads the registry every frame instead of subscribing to events. */
export class UIScene extends Phaser.Scene {
  private intent!: Intent;
  private counter!: Phaser.GameObjects.Text;
  private buttons: { action: Action; circle: Phaser.GameObjects.Arc }[] = [];
  private win!: Phaser.GameObjects.Container;
  private winText!: Phaser.GameObjects.Text;
  private rotate!: Phaser.GameObjects.Container;

  constructor() {
    super('UI');
  }

  create() {
    this.intent = this.registry.get('intent') as Intent;
    this.buttons = [];
    this.counter = this.add.text(BUTTON_MARGIN, 16, '', { ...TEXT, fontSize: '30px' });
    if ('ontouchstart' in window) this.addButtons();
    this.addFullscreenButton();
    this.win = this.makeWinScreen();
    this.rotate = this.makeRotateOverlay();

    // a finger lifted anywhere, even off its button, lets go of what it held
    const release = (p: Phaser.Input.Pointer) => this.intent.releasePointer(p.id);
    this.input.on(Phaser.Input.Events.POINTER_UP, release);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, release);
    this.input.once(Phaser.Input.Events.POINTER_DOWN, lockLandscape);

    const check = () => this.checkOrientation();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    });
    check();
  }

  update() {
    const kills = this.registry.get('kills') ?? 0;
    const total = this.registry.get('zombiesTotal') ?? 0;
    this.counter.setText(`Зомби: ${kills}/${total}`);
    const won = this.registry.get('won') === true;
    this.win.setVisible(won);
    if (won) this.winText.setText(`Победа!\nЗомби: ${kills} из ${total}`);
    for (const b of this.buttons) b.circle.setFillStyle(0xffffff, this.intent.held(b.action) ? 0.5 : 0.25);
  }

  private addButtons() {
    const r = BUTTON_SIZE / 2;
    const m = BUTTON_MARGIN;
    const low = GAME_H - m - r;
    const defs: [Action, string, number, number][] = [
      ['left', '←', m + r, low],
      ['right', '→', 2 * m + 3 * r, low],
      ['shoot', '✹', GAME_W - m - r, low],
      ['jump', '↑', GAME_W - m - r, low - BUTTON_SIZE - m],
    ];
    for (const [action, label, x, y] of defs) {
      const circle = this.add.circle(x, y, r, 0xffffff, 0.25).setStrokeStyle(4, 0xffffff, 0.6);
      // hit area in the shape's local space (origin at its top-left), BUTTON_SLOP wider than the drawing
      circle.setInteractive(new Phaser.Geom.Circle(r, r, r + BUTTON_SLOP), Phaser.Geom.Circle.Contains);
      circle.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer) => this.intent.pressPointer(p.id, action));
      circle.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, (p: Phaser.Input.Pointer) => this.intent.releasePointer(p.id));
      this.add.text(x, y, label, { fontFamily: FONT, fontSize: '52px', color: '#ffffff' }).setOrigin(0.5).setAlpha(0.9);
      this.buttons.push({ action, circle });
    }
  }

  private addFullscreenButton() {
    if (!this.scale.fullscreenAvailable) return;
    const b = this.add.text(GAME_W - BUTTON_MARGIN, 12, '⛶', { ...TEXT, fontSize: '40px' }).setOrigin(1, 0);
    b.setInteractive({ useHandCursor: true });
    // fullscreen must start from pointerup: browsers allow it only inside a user gesture
    b.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () =>
      this.scale.isFullscreen ? this.scale.stopFullscreen() : this.scale.startFullscreen());
  }

  private makeWinScreen() {
    const shade = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.55).setOrigin(0).setInteractive();
    this.winText = this.add.text(GAME_W / 2, GAME_H / 2 - 70, '', { ...TEXT, fontSize: '56px', align: 'center' }).setOrigin(0.5);
    const button = this.add.rectangle(GAME_W / 2, GAME_H / 2 + 90, 300, 84, 0x58b947).setStrokeStyle(5, 0xffffff);
    const label = this.add.text(button.x, button.y, 'Ещё раз', { ...TEXT, fontSize: '40px' }).setOrigin(0.5);
    button.setInteractive({ useHandCursor: true });
    button.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      this.registry.set('won', false);
      this.intent.clearPointers();
      this.scene.get('Game').scene.restart();
    });
    return this.add.container(0, 0, [shade, this.winText, button, label]).setDepth(10).setVisible(false);
  }

  private makeRotateOverlay() {
    const shade = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x1d2b3a, 0.95).setOrigin(0).setInteractive();
    const text = this.add.text(GAME_W / 2, GAME_H / 2, '↻\nПоверни телефон', { ...TEXT, fontSize: '64px', align: 'center' }).setOrigin(0.5);
    return this.add.container(0, 0, [shade, text]).setDepth(20).setVisible(false);
  }

  private checkOrientation() {
    const portrait = window.innerHeight > window.innerWidth;
    this.rotate.setVisible(portrait);
    if (portrait) {
      this.intent.clearPointers();
      if (this.scene.isActive('Game')) this.scene.pause('Game');
    } else if (this.scene.isPaused('Game')) {
      this.scene.resume('Game');
    }
  }
}

/** Best effort: most browsers allow it only in fullscreen or an installed app, and say no otherwise. */
function lockLandscape() {
  try {
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    orientation.lock?.('landscape').catch(() => {});
  } catch {
    // no Screen Orientation API
  }
}
```

- [ ] **Step 3: Запуск UI**

`src/scenes/BootScene.ts`, в `create()` после `this.scene.start('Game');` добавь `this.scene.launch('UI');`.

`src/main.ts`: импорт `import { UIScene } from './scenes/UIScene';` и `scene: [BootScene, GameScene, UIScene],`.

- [ ] **Step 4: Проверить**

Run: `npm test && npm run build`
Expected: тесты зелёные, сборка без ошибок.

Run: `npm run dev`. Чеклист на компьютере:
- слева вверху «Зомби: 0/5», растёт при каждом убитом;
- тач-кнопок нет (у десктопного Chrome нет `ontouchstart`);
- дошёл до флага: герой стоит, затемнение, «Победа! Зомби: N из 5», кнопка «Ещё раз» перезапускает уровень (ящики и зомби на месте, счётчик 0, герой управляется);
- сузь окно так, чтобы высота > ширины: оверлей «Поверни телефон», игра на паузе; расширь обратно: игра продолжается.

Чеклист в Chrome DevTools → Device Toolbar (телефон, landscape, перезагрузить страницу, чтобы появился `ontouchstart`):
- четыре полупрозрачных круга: ← → слева, ↑ над ✹ справа, подсвечиваются при нажатии;
- зажать → и, не отпуская, нажать ↑ и ✹ (в DevTools мультитач не эмулируется: проверь это на телефоне в Task 11), по отдельности кнопки работают;
- нажать →, увести курсор с кнопки на игровое поле и отпустить: герой останавливается.

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "UIScene: тач-кнопки по pointerId, счётчик зомби, флаг и экран победы, полноэкранный режим, оверлей поворота"
```

---

### Task 10: PWA: иконки, манифест, офлайн

**Files:**
- Create (генерируются): `public/icons/icon-192.png`, `public/icons/icon-512.png`, `public/icons/apple-touch-icon.png`
- Modify: `vite.config.ts`, `index.html`, `package.json` (devDependency)

**Interfaces:**
- Consumes: `build_icons` (Task 2).
- Produces: `dist/manifest.webmanifest`, `dist/sw.js`, регистрация service worker.

- [ ] **Step 1: Иконки**

Run: `python3 tools/pack_atlas.py --icons`
Expected: три пути `public/icons/…`. Посмотри `public/icons/icon-512.png` (Read tool): мальчик целиком на голубом круге.

- [ ] **Step 2: Плагин**

```bash
npm install -D vite-plugin-pwa@^2
```

- [ ] **Step 3: `vite.config.ts`**

```ts
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

const SKY = '#6ec6ff'; // SKY_TOP in src/config.ts

export default defineConfig({
  base: '/platformer-shooter/',
  build: { chunkSizeWarningLimit: 2000 }, // Phaser alone is ~1.2 MB
  plugins: [
    VitePWA({
      registerType: 'autoUpdate', // a new deploy is picked up on the next launch
      injectRegister: 'auto',
      includeAssets: ['icons/apple-touch-icon.png'],
      manifest: {
        name: 'Platformer Shooter',
        short_name: 'Shooter',
        display: 'standalone',
        orientation: 'landscape',
        theme_color: SKY,
        background_color: SKY,
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,json,svg,webmanifest}'],
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: { include: ['src/**/*.test.ts'], passWithNoTests: true },
});
```

- [ ] **Step 4: `index.html`: мета-теги для домашнего экрана**

В `<head>` после `<title>`:

```html
    <meta name="theme-color" content="#6ec6ff" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Shooter" />
    <link rel="apple-touch-icon" href="%BASE_URL%icons/apple-touch-icon.png" />
```

- [ ] **Step 5: Проверить сборку**

Run: `npm test && npm run build && ls dist dist/icons dist/sprites && grep -o 'sprites/hero.png' dist/sw.js | head -1 && grep -o 'apple-touch-icon[^"]*' dist/index.html`
Expected: в `dist` есть `sw.js`, `manifest.webmanifest`, `registerSW.js`, `icons/*`, `sprites/*`; в `sw.js` встречается `sprites/hero.png` (атлас в precache); ссылка `/platformer-shooter/icons/apple-touch-icon.png`. Вывод `vite-plugin-pwa` в конце сборки: `precache N entries`, без предупреждения о слишком больших файлах.

- [ ] **Step 6: Проверить офлайн локально**

Run: `npm run preview`, открыть `http://localhost:4173/platformer-shooter/` в Chrome.
- DevTools → Application → Manifest: имя, иконки 192/512, `standalone`, `landscape`, без ошибок.
- Application → Service workers: `activated and is running`.
- Network → Offline, перезагрузить: игра загружается и играется.

- [ ] **Step 7: Commit**

```bash
git add vite.config.ts index.html package.json package-lock.json public/icons
git commit -m "PWA: манифест, иконки, офлайн через workbox"
```

---

### Task 11: Публикация и проверка на телефоне

**Files:** нет изменений кода, если проверка ничего не нашла.

- [ ] **Step 1: Репозиторий и Pages**

Если Step 12 из Task 1 был отложен, выполни его сейчас (только с подтверждения пользователя). Иначе:

```bash
git push
gh run watch
```

Expected: workflow `Deploy to GitHub Pages` зелёный (оба job), `https://4m9fk.github.io/platformer-shooter/` открывает игру.

- [ ] **Step 2: Чеклист на телефоне (выполняет пользователь)**

Попроси пользователя пройти и прислать, что не так:
1. Открыть адрес в Chrome (Android) или Safari (iOS), повернуть горизонтально: игра на весь экран без прокрутки, не масштабируется щипком, текст не выделяется долгим нажатием.
2. Держать вертикально: «Поверни телефон», игра стоит.
3. Одновременно: держать →, нажимать ↑ и ✹ другим пальцем. Бег не прерывается.
4. Сдвинуть палец с → на игровое поле и отпустить: герой останавливается.
5. ⛶: полноэкранный режим (на iPhone кнопки может не быть: Safari не даёт fullscreen для canvas).
6. Пройти уровень: пять зомби, ящики, ямы, флаг, «Ещё раз».
7. Добавить на домашний экран, запустить с иконки: без адресной строки, горизонтально.
8. Авиарежим, закрыть приложение, запустить снова: играется.
9. Мелкая правка (например, текст «Победа!» → «Победа!!»), `git push`, после деплоя запустить приложение дважды: со второго запуска видна новая версия.

- [ ] **Step 3: Найденное**

Каждую проблему с телефона чини отдельным коммитом через superpowers:systematic-debugging. Если пункт 9 делали ради проверки, верни текст обратно отдельным коммитом.
