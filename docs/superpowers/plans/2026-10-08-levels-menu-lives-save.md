# Уровни, меню, жизни и сохранение: план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Пять уровней по порядку, меню выбора уровня, три жизни, звёзды 1–3 и прогресс в `localStorage`.

**Architecture:** Новая `MenuScene` (Boot → Menu → Game + UI). `GameScene` получает индекс уровня через `init({ level })` и пишет в `registry` жизни, результат и звёзды; `UIScene` каждый кадр читает `registry` и показывает HUD и оверлеи (пауза, победа, поражение). Логика без Phaser вынесена в чистые модули с тестами: `game/stars.ts`, `game/progress.ts`, `levels/levels.ts`, `ui/screen.ts`, `ui/layout.ts`.

**Tech Stack:** Phaser 3.90, TypeScript 5.9, Vite 8, Vitest 5.

**Spec:** `docs/superpowers/specs/2026-10-08-levels-menu-lives-save-design.md`

## Global Constraints

- Ветка `levels-menu` (уже создана от `prototype`). В `main` не сливать и не пушить без подтверждения пользователя.
- `LIVES = 3`, `STAR_DELAY = 300` (мс) в `src/config.ts`.
- Ключ `localStorage`: `platformer-shooter.progress`, значение `{"v":1,"stars":{"level-1":3}}`.
- `id` уровней: `'level-1'` … `'level-5'`.
- Звёзды: 1 за флаг, +1 если `kills >= zombiesTotal`, +1 если `livesLost === 0`. Хранится максимум.
- Тексты интерфейса ровно такие: «Platformer Shooter», «Пауза», «Продолжить», «Заново», «В меню», «Победа!», «Дальше», «Все уровни пройдены!», «Попробуй ещё раз», «Зомби: k/t», «Поверни телефон».
- Комментарии в коде на английском (как в проекте), сообщения коммитов на русском (как в истории).
- Проверка: `npm test` (Vitest) и `npm run build` (tsc + vite) зелёные после каждой задачи.
- Логический экран 960×540, `Scale.EXPAND`, всё у краёв внутри безопасной зоны (`safeAreaInsets()`).

## Review Focus

1. Поворот телефона в портрет и обратно, пока открыт оверлей паузы, победы или поражения: игра должна остаться на паузе (сейчас `checkOrientation` возобновляет `Game` безусловно). Тест: `ui/screen.test.ts` (`gameRuns`), Task 5.
2. Хранилище недоступно или переполнено (приватный режим Safari): игра работает, прогресс просто не запоминается. Тест: `game/progress.test.ts` («хранилище бросает»), Task 1.
3. В сохранении есть `id`, которого больше нет среди уровней, или мусорные значения: меню открывает только уровень 1 и уровни после реально пройденных. Тест: `game/progress.test.ts` («чужой id ничего не открывает»), Task 1.
4. Двойное быстрое нажатие на плитку меню или кнопку оверлея: уровень стартует один раз, `UI` не запускается дважды. Защита: флаг `starting` в `MenuScene`, оверлей уничтожается на первом нажатии; ручная проверка в Task 7.
5. Смерть в момент касания флага и смерть во время мигания последней жизни: не больше одного списания жизни, победа не засчитывается мёртвому герою. Защита: проверки `respawning`/`result` в `GameScene` (Task 3); ручная проверка в Task 7.

---

## Структура файлов

| Файл | Что делает |
|---|---|
| `src/config.ts` | + `LIVES`, `STAR_DELAY`, `MENU_TILE`, `MENU_GAP`, `PAUSE_GAP` |
| `src/game/stars.ts` (+test) | `starsFor` |
| `src/game/progress.ts` (+test) | загрузка, сохранение, открытые уровни |
| `src/levels/maps/level1.ts` … `level5.ts` | ASCII-карты (`level1.ts` переезжает из `src/levels/`) |
| `src/levels/levels.ts` (+test, вместо `level1.test.ts`) | `LEVELS`, темы `DAY`/`SUNSET`/`DUSK` |
| `src/textures/placeholders.ts` | `makeBackdrop(scene, theme)`, текстуры `star`, `star-empty`, `heart`, `lock`, `tile-open`, `tile-locked`, `pause` |
| `src/ui/widgets.ts` | `FONT`, `TEXT`, `gameInsets`, `makeButton`, `makeOverlay`, `makeRotateOverlay`, `placeOverlay` |
| `src/ui/orientation.ts` | `isPortrait`, `watchOrientation`, `lockLandscape` |
| `src/ui/screen.ts` (+test) | `Screen`, `nextScreen`, `gameRuns` |
| `src/ui/layout.ts` (+test) | `hudLayout` + `lives`, `pause`; новая `menuLayout` |
| `src/scenes/MenuScene.ts` | меню выбора уровня |
| `src/scenes/GameScene.ts` | уровень по индексу, жизни, результат, сохранение |
| `src/scenes/UIScene.ts` | сердечки, ⏸, оверлеи |
| `src/scenes/BootScene.ts`, `src/main.ts` | Boot → Menu, регистрация `MenuScene` |

---

### Task 1: Звёзды и прогресс

**Files:**
- Modify: `src/config.ts` (дописать в конец)
- Create: `src/game/stars.ts`, `src/game/stars.test.ts`
- Create: `src/game/progress.ts`, `src/game/progress.test.ts`

**Interfaces:**
- Consumes: ничего.
- Produces:
  - `config.ts`: `LIVES = 3`, `STAR_DELAY = 300`.
  - `starsFor(r: { kills: number; zombiesTotal: number; livesLost: number }): 1 | 2 | 3`
  - `interface Progress { stars: Record<string, number> }`
  - `type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>`
  - `STORAGE_KEY = 'platformer-shooter.progress'`
  - `emptyProgress(): Progress`
  - `isUnlocked(p: Progress, levels: readonly { id: string }[], index: number): boolean`
  - `recordWin(p: Progress, id: string, stars: number): Progress`
  - `loadProgress(storage: KeyValueStore | undefined): Progress`
  - `saveProgress(storage: KeyValueStore | undefined, p: Progress): void`
  - `safeStorage(): KeyValueStore | undefined`

- [ ] **Step 1: Константы в `src/config.ts`** (в конец файла)

```ts
export const LIVES = 3;
export const STAR_DELAY = 300; // pause between stars popping up on the win screen
```

- [ ] **Step 2: Падающий тест `src/game/stars.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { starsFor } from './stars';

describe('starsFor', () => {
  it('gives one star just for reaching the flag', () => {
    expect(starsFor({ kills: 2, zombiesTotal: 5, livesLost: 1 })).toBe(1);
  });
  it('adds a star for every zombie', () => {
    expect(starsFor({ kills: 5, zombiesTotal: 5, livesLost: 2 })).toBe(2);
  });
  it('adds a star for not losing a life', () => {
    expect(starsFor({ kills: 0, zombiesTotal: 5, livesLost: 0 })).toBe(2);
  });
  it('gives three for both', () => {
    expect(starsFor({ kills: 5, zombiesTotal: 5, livesLost: 0 })).toBe(3);
  });
});
```

- [ ] **Step 3: Падающий тест `src/game/progress.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { emptyProgress, isUnlocked, loadProgress, recordWin, saveProgress, STORAGE_KEY } from './progress';

const LEVELS = [{ id: 'level-1' }, { id: 'level-2' }, { id: 'level-3' }, { id: 'level-4' }, { id: 'level-5' }];

function memory(saved?: string) {
  const data = new Map<string, string>();
  if (saved !== undefined) data.set(STORAGE_KEY, saved);
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

const broken = {
  getItem: (): string | null => { throw new Error('denied'); },
  setItem: (): void => { throw new Error('denied'); },
};

describe('isUnlocked', () => {
  it('opens only the first level on empty progress', () => {
    expect(LEVELS.map((_, i) => isUnlocked(emptyProgress(), LEVELS, i))).toEqual([true, false, false, false, false]);
  });
  it('opens a level once the one before it has stars', () => {
    const p = { stars: { 'level-1': 1, 'level-2': 3, 'level-3': 2 } };
    expect(LEVELS.map((_, i) => isUnlocked(p, LEVELS, i))).toEqual([true, true, true, true, false]);
  });
  it('a foreign id opens nothing', () => {
    const p = { stars: { 'level-9': 3, bonus: 2 } };
    expect(isUnlocked(p, LEVELS, 1)).toBe(false);
  });
});

describe('recordWin', () => {
  it('keeps the best result and leaves the original alone', () => {
    const before = { stars: { 'level-1': 3 } };
    const after = recordWin(before, 'level-1', 1);
    expect(after.stars['level-1']).toBe(3);
    expect(recordWin(after, 'level-2', 2).stars).toEqual({ 'level-1': 3, 'level-2': 2 });
    expect(before).toEqual({ stars: { 'level-1': 3 } });
  });
  it('raises a lower result', () => {
    expect(recordWin({ stars: { 'level-1': 1 } }, 'level-1', 2).stars['level-1']).toBe(2);
  });
});

describe('loadProgress / saveProgress', () => {
  it('round-trips through storage in the v1 format', () => {
    const s = memory();
    saveProgress(s, { stars: { 'level-1': 3 } });
    expect(JSON.parse(s.data.get(STORAGE_KEY)!)).toEqual({ v: 1, stars: { 'level-1': 3 } });
    expect(loadProgress(s)).toEqual({ stars: { 'level-1': 3 } });
  });
  it('starts empty with nothing saved or no storage at all', () => {
    expect(loadProgress(memory())).toEqual(emptyProgress());
    expect(loadProgress(undefined)).toEqual(emptyProgress());
  });
  it('starts empty on broken JSON or another version', () => {
    expect(loadProgress(memory('{oops'))).toEqual(emptyProgress());
    expect(loadProgress(memory('{"v":2,"stars":{"level-1":3}}'))).toEqual(emptyProgress());
    expect(loadProgress(memory('[1,2]'))).toEqual(emptyProgress());
    expect(loadProgress(memory('{"v":1,"stars":5}'))).toEqual(emptyProgress());
  });
  it('drops entries that are not a whole number from 1 to 3', () => {
    const s = memory('{"v":1,"stars":{"level-1":2,"level-2":7,"level-3":1.5,"level-4":"3","level-5":0}}');
    expect(loadProgress(s)).toEqual({ stars: { 'level-1': 2 } });
  });
  it('survives a storage that throws on read and on write', () => {
    expect(loadProgress(broken)).toEqual(emptyProgress());
    expect(() => saveProgress(broken, { stars: { 'level-1': 1 } })).not.toThrow();
    expect(() => saveProgress(undefined, { stars: {} })).not.toThrow();
  });
});
```

- [ ] **Step 4: Убедиться, что оба падают**

Run: `npm test -- src/game`
Expected: FAIL, `Failed to resolve import "./stars"` и `"./progress"`.

- [ ] **Step 5: `src/game/stars.ts`**

```ts
export interface RunResult {
  kills: number;
  zombiesTotal: number;
  livesLost: number;
}

/** One star for the flag, one more for every zombie, one more for not losing a life. */
export function starsFor(r: RunResult): 1 | 2 | 3 {
  return (1 + (r.kills >= r.zombiesTotal ? 1 : 0) + (r.livesLost === 0 ? 1 : 0)) as 1 | 2 | 3;
}
```

- [ ] **Step 6: `src/game/progress.ts`**

```ts
/** Best stars per level id. A level with stars has been finished. */
export interface Progress {
  stars: Record<string, number>;
}

export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

export const STORAGE_KEY = 'platformer-shooter.progress';
const VERSION = 1;

export const emptyProgress = (): Progress => ({ stars: {} });

/** The first level is always open, every other one opens once the level before it is finished. */
export function isUnlocked(p: Progress, levels: readonly { id: string }[], index: number): boolean {
  if (index === 0) return true;
  const before = levels[index - 1];
  return before !== undefined && (p.stars[before.id] ?? 0) > 0;
}

export function recordWin(p: Progress, id: string, stars: number): Progress {
  return { stars: { ...p.stars, [id]: Math.max(p.stars[id] ?? 0, stars) } };
}

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Anything unreadable means a fresh start: a lost save must never stop the game from opening. */
export function loadProgress(storage: KeyValueStore | undefined): Progress {
  let raw: string | null;
  try {
    raw = storage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return emptyProgress();
  }
  if (!raw) return emptyProgress();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return emptyProgress();
  }
  if (!isRecord(data) || data.v !== VERSION || !isRecord(data.stars)) return emptyProgress();
  const stars: Record<string, number> = {};
  for (const [id, s] of Object.entries(data.stars)) {
    if (typeof s === 'number' && Number.isInteger(s) && s >= 1 && s <= 3) stars[id] = s;
  }
  return { stars };
}

export function saveProgress(storage: KeyValueStore | undefined, p: Progress) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify({ v: VERSION, stars: p.stars }));
  } catch {
    // storage full or forbidden (Safari private mode): the game goes on, progress just isn't kept
  }
}

/** window.localStorage, or undefined where merely touching it throws. */
export function safeStorage(): KeyValueStore | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 7: Прогнать**

Run: `npm test && npm run build`
Expected: все тесты PASS (50 старых + 14 новых), сборка без ошибок.

- [ ] **Step 8: Commit**

```bash
git add src/config.ts src/game
git commit -m "Звёзды за уровень и прогресс в localStorage, устойчивый к сбоям хранилища"
```

---

### Task 2: Список уровней, темы фона, уровень по индексу

**Files:**
- Move: `src/levels/level1.ts` → `src/levels/maps/level1.ts` (содержимое без изменений)
- Move + rewrite: `src/levels/level1.test.ts` → `src/levels/levels.test.ts`
- Create: `src/levels/levels.ts`
- Modify: `src/textures/placeholders.ts` (небо и холмы → `makeBackdrop`)
- Modify: `src/scenes/GameScene.ts` (`init`, `create`, `addBackground`)
- Modify: `src/scenes/BootScene.ts:26` (передать `{ level: 0 }`)
- Modify: `src/scenes/UIScene.ts` (кнопка «Ещё раз» перезапускает с тем же уровнем)

**Interfaces:**
- Consumes: `parseLevel(rows: readonly string[]): Level` из `src/levels/parse.ts`; `SKY_TOP`, `SKY_BOTTOM` из `config.ts`.
- Produces:
  - `interface Theme { key: string; skyTop: number; skyBottom: number; hillsFar: number; hillsNear: number }`
  - `interface LevelDef { id: string; map: string[]; theme: Theme }`
  - `DAY`, `SUNSET`, `DUSK: Theme`; `LEVELS: LevelDef[]`
  - `makeBackdrop(scene: Phaser.Scene, theme: Theme): void` — текстуры `sky-<key>`, `hills-far-<key>`, `hills-near-<key>`
  - `GameScene.init(data: { level?: number })`; `registry.levelIndex: number`

- [ ] **Step 1: Перенести карту и тест**

```bash
mkdir -p src/levels/maps
git mv src/levels/level1.ts src/levels/maps/level1.ts
git mv src/levels/level1.test.ts src/levels/levels.test.ts
```

- [ ] **Step 2: Переписать `src/levels/levels.test.ts` (падает: нет `./levels`)**

```ts
import { describe, expect, it } from 'vitest';
import { LEVELS } from './levels';
import { parseLevel } from './parse';

// width and zombie count per level, in order; a new level adds a line here
const EXPECTED = [
  { id: 'level-1', width: 70, zombies: 5 },
];

describe('LEVELS', () => {
  it('lists the expected levels in order with unique ids', () => {
    expect(LEVELS.map((l) => l.id)).toEqual(EXPECTED.map((e) => e.id));
  });

  for (const [i, def] of LEVELS.entries()) {
    describe(def.id, () => {
      const level = parseLevel(def.map);
      const standable = new Set([...level.solids, ...level.platforms, ...level.crates].map((c) => `${c.col},${c.row}`));
      const standsOn = (c: { col: number; row: number }) => standable.has(`${c.col},${c.row + 1}`);

      it('has the planned size and zombie count', () => {
        expect(level.width).toBe(EXPECTED[i].width);
        expect(level.height).toBe(9);
        expect(level.zombies).toHaveLength(EXPECTED[i].zombies);
      });
      it('puts every zombie, the start and the flag on something', () => {
        for (const z of level.zombies) expect(standsOn(z), `zombie at ${z.col},${z.row}`).toBe(true);
        expect(standsOn(level.start)).toBe(true);
        expect(standsOn(level.flag)).toBe(true);
      });
      it('has no pit wider than a jump (2 tiles)', () => {
        const bottom = new Set(level.solids.filter((s) => s.row === level.height - 1).map((s) => s.col));
        let run = 0;
        for (let c = 0; c < level.width; c++) {
          run = bottom.has(c) ? 0 : run + 1;
          expect(run, `pit ending at column ${c}`).toBeLessThanOrEqual(2);
        }
      });
    });
  }

  it('level 1 keeps its shape: two platform heights, pits, flag above the start', () => {
    const level = parseLevel(LEVELS[0].map);
    expect(level.crates.length).toBeGreaterThan(0);
    expect(new Set(level.platforms.map((p) => p.row)).size).toBe(2);
    expect(level.flag.row).toBeLessThan(level.start.row);
  });
});
```

Run: `npm test -- src/levels/levels.test.ts`
Expected: FAIL, `Failed to resolve import "./levels"`.

- [ ] **Step 3: `src/levels/levels.ts`**

```ts
import { SKY_BOTTOM, SKY_TOP } from '../config';
import { LEVEL1 } from './maps/level1';

/** Backdrop colours. key names the textures makeBackdrop draws for this theme. */
export interface Theme {
  key: string;
  skyTop: number;
  skyBottom: number;
  hillsFar: number;
  hillsNear: number;
}

/** Saved progress is keyed by id, so levels can be reordered or inserted without breaking old saves. */
export interface LevelDef {
  id: string;
  map: string[];
  theme: Theme;
}

export const DAY: Theme = { key: 'day', skyTop: SKY_TOP, skyBottom: SKY_BOTTOM, hillsFar: 0x8fd18a, hillsNear: 0x5fb35a };
export const SUNSET: Theme = { key: 'sunset', skyTop: 0xff9a5c, skyBottom: 0xffe0a8, hillsFar: 0xc98a6b, hillsNear: 0x8e6a4f };
export const DUSK: Theme = { key: 'dusk', skyTop: 0x2e3a6b, skyBottom: 0x8a7bb8, hillsFar: 0x4f5f8a, hillsNear: 0x34466b };

export const LEVELS: LevelDef[] = [
  { id: 'level-1', map: LEVEL1, theme: DAY },
];
```

- [ ] **Step 4: `makeBackdrop` в `src/textures/placeholders.ts`**

Заменить импорты и начало `makeTextures`:

```ts
import Phaser from 'phaser';
import { GAME_H, GAME_W, TILE } from '../config';
import type { Theme } from '../levels/levels';

/** Every non-character texture shared by all levels, drawn once. To reskin an object, replace its function with a PNG load. */
export function makeTextures(scene: Phaser.Scene) {
  makeClouds(scene);
  makeGround(scene, 'ground', false);
```

(строки `makeSky(scene);`, `makeHills(scene, 'hills-far', …)`, `makeHills(scene, 'hills-near', …)` из `makeTextures` удалить; остальные вызовы оставить.)

После `makeTextures` добавить:

```ts
/** Sky and both hill layers in the theme's colours, keys suffixed with theme.key. Drawn on first use, then reused. */
export function makeBackdrop(scene: Phaser.Scene, theme: Theme) {
  if (scene.textures.exists(`sky-${theme.key}`)) return;
  makeSky(scene, `sky-${theme.key}`, theme.skyTop, theme.skyBottom);
  makeHills(scene, `hills-far-${theme.key}`, 260, theme.hillsFar, 60, 2);
  makeHills(scene, `hills-near-${theme.key}`, 200, theme.hillsNear, 45, 3);
}
```

`makeSky` принимает ключ и цвета:

```ts
function makeSky(scene: Phaser.Scene, key: string, top: number, bottom: number) {
  const tex = scene.textures.createCanvas(key, 4, GAME_H)!;
  const ctx = tex.getContext();
  const grad = ctx.createLinearGradient(0, 0, 0, GAME_H);
  grad.addColorStop(0, css(top));
  grad.addColorStop(1, css(bottom));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, GAME_H);
  tex.refresh();
}
```

`makeHills` не меняется.

- [ ] **Step 5: `GameScene` берёт уровень по индексу**

В `src/scenes/GameScene.ts`:

Импорты: убрать `import { LEVEL1 } from '../levels/level1';`, добавить

```ts
import { LEVELS, type LevelDef } from '../levels/levels';
import { makeBackdrop } from '../textures/placeholders';
```

Поля: после `private level!: Level;` добавить

```ts
  private def!: LevelDef;
  private levelIndex = 0;
```

`init` целиком:

```ts
  /** The scene object survives restart(): reset every field that create() does not overwrite. */
  init(data: { level?: number }) {
    this.levelIndex = Phaser.Math.Clamp(data.level ?? 0, 0, LEVELS.length - 1);
    this.layers = [];
    this.respawning = false;
  }
```

Первые строки `create`:

```ts
  create() {
    this.def = LEVELS[this.levelIndex];
    this.level = parseLevel(this.def.map);
    this.grid = new Grid(this.level);
    this.registry.set({ levelIndex: this.levelIndex, kills: 0, won: false, zombiesTotal: this.level.zombies.length });
```

`addBackground` целиком:

```ts
  private addBackground() {
    makeBackdrop(this, this.def.theme);
    const key = this.def.theme.key;
    this.sky = this.add.image(0, 0, `sky-${key}`).setOrigin(0).setScrollFactor(0);
    this.layers = [
      this.add.tileSprite(0, 0, GAME_W, 260, 'clouds'),
      this.add.tileSprite(0, 0, GAME_W, 260, `hills-far-${key}`),
      this.add.tileSprite(0, 0, GAME_W, 200, `hills-near-${key}`),
    ].map((layer) => layer.setOrigin(0).setScrollFactor(0));
    this.fitBackground();
    // Scale.EXPAND: the game width follows the screen, so the backdrop must cover it on every resize
    this.scale.on(Phaser.Scale.Events.RESIZE, this.fitBackground, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.fitBackground, this));
  }
```

- [ ] **Step 6: Boot и «Ещё раз» передают уровень**

`src/scenes/BootScene.ts`: `this.scene.start('Game');` → `this.scene.start('Game', { level: 0 });`

`src/scenes/UIScene.ts` в `makeWinScreen`: `this.scene.get('Game').scene.restart();` →

```ts
      this.scene.get('Game').scene.restart({ level: this.registry.get('levelIndex') });
```

- [ ] **Step 7: Проверить**

Run: `npm test && npm run build`
Expected: PASS, сборка без ошибок.

Run: `npm run dev`, открыть адрес из вывода. Expected: уровень 1 выглядит как раньше (голубое небо, зелёные холмы), победа и «Ещё раз» работают.

- [ ] **Step 8: Commit**

```bash
git add -A src
git commit -m "Список уровней с темами фона, GameScene запускает уровень по индексу"
```

---

### Task 3: Жизни и результат уровня в GameScene

**Files:**
- Modify: `src/scenes/GameScene.ts` (`create`, флаг, `killHero`, новый `win`)
- Modify: `src/scenes/UIScene.ts` (`update` и кнопка читают `result` вместо `won`; временный вывод жизней и поражения)

**Interfaces:**
- Consumes: `LIVES` (`config.ts`); `starsFor` (`game/stars.ts`); `loadProgress`, `recordWin`, `saveProgress`, `safeStorage` (`game/progress.ts`); `LevelDef.id`.
- Produces: поля `registry`: `lives: number`, `result: 'won' | 'lost' | null` (поле `won` удалено), `stars: number` (1–3 после победы, 0 до неё), `levelIndex`, `kills`, `zombiesTotal`.

- [ ] **Step 1: Импорты `GameScene`**

```ts
import { BLINK_TIME, CAMERA_LEAD, DEBRIS, FADE_TIME, FALL_MARGIN, GAME_W, LIVES, PARALLAX, TILE } from '../config';
import { loadProgress, recordWin, safeStorage, saveProgress } from '../game/progress';
import { starsFor } from '../game/stars';
```

- [ ] **Step 2: Начальное состояние в `create`**

```ts
    this.registry.set({
      levelIndex: this.levelIndex,
      kills: 0,
      zombiesTotal: this.level.zombies.length,
      lives: LIVES,
      result: null,
      stars: 0,
    });
```

- [ ] **Step 3: Флаг вызывает `win`**

```ts
    this.physics.add.overlap(this.hero, this.flag, () => {
      if (this.registry.get('result') || this.respawning) return;
      this.hero.freeze();
      this.win();
    });
```

И новый метод после `killZombie`:

```ts
  /** Stars, then the save, then the result: the win screen reads all three from the registry. */
  private win() {
    const stars = starsFor({
      kills: this.registry.get('kills') as number,
      zombiesTotal: this.level.zombies.length,
      livesLost: LIVES - (this.registry.get('lives') as number),
    });
    const storage = safeStorage();
    saveProgress(storage, recordWin(loadProgress(storage), this.def.id, stars));
    this.registry.set({ stars, result: 'won' });
  }
```

- [ ] **Step 4: `killHero` списывает жизнь**

```ts
  /** Blink, then back to the start while lives remain; zombies and crates stay as they are. No lives left: 'lost'. */
  private killHero() {
    if (this.respawning || this.registry.get('result')) return;
    this.respawning = true;
    const lives = (this.registry.get('lives') as number) - 1;
    this.registry.set('lives', lives);
    this.hero.die();
    this.tweens.add({
      targets: this.hero,
      alpha: 0.2,
      duration: BLINK_TIME / 6,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        // respawning stays true after the last life: nothing may happen to the hero until a restart
        if (lives === 0) return void this.registry.set('result', 'lost');
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
```

- [ ] **Step 5: `UIScene` читает `result` (временно, до Task 5)**

В `update()` заменить строки от `this.counter.setText` до `if (won) …`:

```ts
    const lives = this.registry.get('lives') ?? 0;
    this.counter.setText(`Зомби: ${kills}/${total}   Жизни: ${lives}`);
    const result = this.registry.get('result') as 'won' | 'lost' | null;
    this.win.setVisible(result !== null);
    if (result === 'won') this.winText.setText(`Победа!\nЗвёзды: ${this.registry.get('stars')}`);
    if (result === 'lost') this.winText.setText('Попробуй ещё раз');
```

В `makeWinScreen` обработчик кнопки:

```ts
    button.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      this.registry.set('result', null);
      this.intent.clearPointers();
      this.scene.get('Game').scene.restart({ level: this.registry.get('levelIndex') });
    });
```

- [ ] **Step 6: Проверить**

Run: `npm test && npm run build`
Expected: PASS; `grep -n "'won'" src/scenes/*.ts` находит только `result`-сравнения, `registry.get('won')` нигде нет.

Run: `npm run dev`:
1. Упасть в яму: «Жизни: 2», герой на старте.
2. Ещё две смерти: «Попробуй ещё раз», кнопка даёт «Жизни: 3» и всех зомби обратно.
3. Пройти без смертей со всеми зомби: «Звёзды: 3». В DevTools → Application → Local Storage: `platformer-shooter.progress` = `{"v":1,"stars":{"level-1":3}}`.

- [ ] **Step 7: Commit**

```bash
git add src/scenes
git commit -m "Три жизни: смерть списывает жизнь, без жизней уровень проигран; победа считает звёзды и сохраняет их"
```

---

### Task 4: Меню выбора уровня

**Files:**
- Modify: `src/config.ts` (`MENU_TILE`, `MENU_GAP`)
- Modify: `src/ui/layout.ts`, `src/ui/layout.test.ts` (`menuLayout`)
- Create: `src/ui/widgets.ts`, `src/ui/orientation.ts`
- Modify: `src/textures/placeholders.ts` (`star`, `star-empty`, `lock`, `tile-open`, `tile-locked`)
- Create: `src/scenes/MenuScene.ts`
- Modify: `src/scenes/UIScene.ts` (берёт текст, оверлей поворота и ориентацию из новых модулей)
- Modify: `src/scenes/BootScene.ts`, `src/main.ts`

**Interfaces:**
- Consumes: `LEVELS`, `makeBackdrop`, `loadProgress`, `isUnlocked`, `safeStorage`, `safeAreaInsets` (`viewport.ts`), `Insets`, `Point` (`layout.ts`).
- Produces:
  - `MENU_TILE = 140`, `MENU_GAP = 24`
  - `interface MenuLayout { title: Point; tiles: Point[]; tileScale: number; center: Point }`
  - `menuLayout(width: number, height: number, count: number, insets?: Insets): MenuLayout`
  - `widgets.ts`: `FONT: string`, `TEXT` (стиль текста), `interface Overlay { container: Container; shade: Rectangle }`, `gameInsets(scene): Insets`, `makeButton(scene, x, y, label, onClick): [Rectangle, Text]`, `makeOverlay(scene, title, buttons: { label: string; onClick: () => void }[]): Overlay`, `makeRotateOverlay(scene): Overlay`, `placeOverlay(o: Overlay, width, height): void`
  - `orientation.ts`: `isPortrait(): boolean`, `watchOrientation(scene, onChange: (portrait: boolean) => void): void`, `lockLandscape(): void`
  - Текстуры: `star`, `star-empty` (80×80), `lock` (48×56), `tile-open`, `tile-locked` (`MENU_TILE`×`MENU_TILE`)
  - Сцена `'Menu'`: стартует `Game` с `{ level: i }` и запускает `UI`.

- [ ] **Step 1: Константы в `src/config.ts`**

```ts
export const MENU_TILE = 140; // level tile side in the menu, shrinks on narrow screens
export const MENU_GAP = 24;
```

- [ ] **Step 2: Падающий тест `menuLayout` (дописать в `src/ui/layout.test.ts`)**

Импорт заменить на:

```ts
import { BUTTON_MARGIN as M, BUTTON_SIZE, MENU_GAP, MENU_TILE } from '../config';
import { hudLayout, menuLayout } from './layout';
```

В конец файла:

```ts
describe('menuLayout', () => {
  const inside = (l: ReturnType<typeof menuLayout>, left: number, right: number) => {
    const half = (MENU_TILE * l.tileScale) / 2;
    for (const t of l.tiles) {
      expect(t.x - half).toBeGreaterThanOrEqual(left);
      expect(t.x + half).toBeLessThanOrEqual(right);
    }
  };

  it('centres five full-size tiles in a row on 960×540', () => {
    const l = menuLayout(960, 540, 5);
    expect(l.tileScale).toBe(1);
    expect(l.tiles).toHaveLength(5);
    expect(l.tiles[0].x + l.tiles[4].x).toBe(960);
    expect(l.tiles[1].x - l.tiles[0].x).toBe(MENU_TILE + MENU_GAP);
    expect(new Set(l.tiles.map((t) => t.y)).size).toBe(1);
    expect(l.title.x).toBe(480);
    inside(l, M, 960 - M);
  });

  it('centres on the safe area of a wide phone with a notch', () => {
    const insets = { top: 10, right: 44, bottom: 20, left: 44 };
    const l = menuLayout(1170, 540, 5, insets);
    inside(l, 44 + M, 1170 - 44 - M);
    expect(l.tiles[0].x + l.tiles[4].x).toBe(1170);
    expect(l.title.y).toBeGreaterThan(10);
  });

  it('shrinks tiles to fit a narrow screen', () => {
    const l = menuLayout(700, 540, 5);
    expect(l.tileScale).toBeLessThan(1);
    inside(l, M, 700 - M);
  });
});
```

Run: `npm test -- src/ui/layout.test.ts`
Expected: FAIL, `menuLayout is not a function` (или ошибка импорта).

- [ ] **Step 3: `menuLayout` в `src/ui/layout.ts`**

Импорт: `import { BUTTON_MARGIN, BUTTON_SIZE, MENU_GAP, MENU_TILE } from '../config';`

В конец файла:

```ts
export interface MenuLayout {
  title: Point; // centre of the title
  tiles: Point[]; // centre of each level tile
  tileScale: number; // 1 = MENU_TILE; less when the row would not fit
  center: Point;
}

/** One row of level tiles centred on the safe area, scaled down when the screen is too narrow for them. */
export function menuLayout(width: number, height: number, count: number, insets: Insets = NO_INSETS): MenuLayout {
  const left = insets.left + BUTTON_MARGIN;
  const right = width - insets.right - BUTTON_MARGIN;
  const fit = (right - left - (count - 1) * MENU_GAP) / count;
  const size = Math.min(MENU_TILE, fit);
  const cx = (left + right) / 2;
  const first = cx - ((count - 1) * (size + MENU_GAP)) / 2;
  const y = height / 2 + 30;
  return {
    title: { x: cx, y: insets.top + 90 },
    tiles: Array.from({ length: count }, (_, i) => ({ x: first + i * (size + MENU_GAP), y })),
    tileScale: size / MENU_TILE,
    center: { x: width / 2, y: height / 2 },
  };
}
```

Run: `npm test -- src/ui/layout.test.ts`
Expected: PASS.

- [ ] **Step 4: `src/ui/widgets.ts`**

```ts
import Phaser from 'phaser';
import { safeAreaInsets } from '../viewport';
import type { Insets } from './layout';

export const FONT = 'system-ui, -apple-system, sans-serif';
export const TEXT = { fontFamily: FONT, color: '#ffffff', stroke: '#1d2b3a', strokeThickness: 6 };

/** A full-screen shade with content laid out around (0, 0); placeOverlay centres it and sizes the shade. */
export interface Overlay {
  container: Phaser.GameObjects.Container;
  shade: Phaser.GameObjects.Rectangle;
}

export interface OverlayButton {
  label: string;
  onClick: () => void;
}

const BUTTON_W = 240;
const BUTTON_H = 84;

/** Safe-area insets in game pixels: they come in CSS pixels and displayScale converts them. */
export function gameInsets(scene: Phaser.Scene): Insets {
  const k = scene.scale.displayScale.x;
  const css = safeAreaInsets();
  return { top: css.top * k, right: css.right * k, bottom: css.bottom * k, left: css.left * k };
}

export function makeButton(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void) {
  const rect = scene.add.rectangle(x, y, BUTTON_W, BUTTON_H, 0x58b947).setStrokeStyle(5, 0xffffff);
  const text = scene.add.text(x, y, label, { ...TEXT, fontSize: '36px' }).setOrigin(0.5);
  rect.setInteractive({ useHandCursor: true });
  rect.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, onClick);
  return [rect, text] as const;
}

/** Darkened screen, a title and a centred row of buttons. The shade swallows taps meant for the game. */
export function makeOverlay(scene: Phaser.Scene, title: string, buttons: OverlayButton[]): Overlay {
  const shade = scene.add.rectangle(0, 0, 1, 1, 0x000000, 0.55).setInteractive();
  const heading = scene.add.text(0, -130, title, { ...TEXT, fontSize: '56px', align: 'center' }).setOrigin(0.5);
  const parts: Phaser.GameObjects.GameObject[] = [shade, heading];
  const step = BUTTON_W + 30;
  buttons.forEach((b, i) => parts.push(...makeButton(scene, (i - (buttons.length - 1) / 2) * step, 110, b.label, b.onClick)));
  return { container: scene.add.container(0, 0, parts).setDepth(10), shade };
}

export function makeRotateOverlay(scene: Phaser.Scene): Overlay {
  const shade = scene.add.rectangle(0, 0, 1, 1, 0x1d2b3a, 0.95).setInteractive();
  const text = scene.add.text(0, 0, '↻\nПоверни телефон', { ...TEXT, fontSize: '64px', align: 'center' }).setOrigin(0.5);
  return { container: scene.add.container(0, 0, [shade, text]).setDepth(20).setVisible(false), shade };
}

export function placeOverlay(o: Overlay, width: number, height: number) {
  o.container.setPosition(width / 2, height / 2);
  o.shade.setSize(width, height);
  o.shade.input?.hitArea.setSize(width, height); // the hit area is not resized with the shape
}
```

- [ ] **Step 5: `src/ui/orientation.ts`** (перенос из `UIScene`)

```ts
import Phaser from 'phaser';

export const isPortrait = () => window.innerHeight > window.innerWidth;

/** Calls onChange now and after every resize or rotation, until the scene shuts down. */
export function watchOrientation(scene: Phaser.Scene, onChange: (portrait: boolean) => void) {
  const check = () => onChange(isPortrait());
  window.addEventListener('resize', check);
  window.addEventListener('orientationchange', check);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    window.removeEventListener('resize', check);
    window.removeEventListener('orientationchange', check);
  });
  check();
}

/** Best effort: most browsers allow it only in fullscreen or an installed app, and say no otherwise. */
export function lockLandscape() {
  try {
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    orientation.lock?.('landscape').catch(() => {});
  } catch {
    // no Screen Orientation API
  }
}
```

- [ ] **Step 6: `UIScene` пользуется новыми модулями (поведение не меняется)**

В `src/scenes/UIScene.ts`:
- удалить константы `FONT`, `TEXT`, метод `makeRotateOverlay`, метод `checkOrientation`, функцию `lockLandscape`, поле `rotateShade`, импорт `safeAreaInsets`;
- импорты:

```ts
import { lockLandscape, watchOrientation } from '../ui/orientation';
import { FONT, TEXT, gameInsets, makeRotateOverlay, placeOverlay, type Overlay } from '../ui/widgets';
```

- поле `private rotate!: Phaser.GameObjects.Container;` → `private rotate!: Overlay;`
- в `create`: `this.rotate = this.makeRotateOverlay();` → `this.rotate = makeRotateOverlay(this);`; блок от `const check = …` до `check();` и обработчик `SHUTDOWN` заменить на:

```ts
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
    watchOrientation(this, (portrait) => {
      this.rotate.container.setVisible(portrait);
      if (portrait) {
        this.intent.clearPointers();
        if (this.scene.isActive('Game')) this.scene.pause('Game');
      } else if (this.scene.isPaused('Game')) {
        this.scene.resume('Game');
      }
    });
```

- в `layout()`: строки `const k = …`, `const css = …`, `const l = hudLayout(…)` заменить на `const l = hudLayout(width, height, gameInsets(this));`; строку `this.rotate.setPosition(…)` удалить; цикл `for (const shade of [this.winShade, this.rotateShade])` заменить на

```ts
    this.winShade.setSize(width, height);
    this.winShade.input?.hitArea.setSize(width, height);
    placeOverlay(this.rotate, width, height);
```

Run: `npm run build`
Expected: без ошибок.

- [ ] **Step 7: Текстуры меню в `src/textures/placeholders.ts`**

Импорт: `import { GAME_H, GAME_W, MENU_TILE, TILE } from '../config';`

В `makeTextures` в конец:

```ts
  makeStar(scene, 'star', true);
  makeStar(scene, 'star-empty', false);
  makeLock(scene);
  makeTile(scene, 'tile-open', 0x58b947);
  makeTile(scene, 'tile-locked', 0x7a8794);
```

Функции в конец файла:

```ts
function makeStar(scene: Phaser.Scene, key: string, filled: boolean) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? 36 : 15;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return new Phaser.Math.Vector2(40 + r * Math.cos(a), 42 + r * Math.sin(a));
  });
  draw(scene, key, 80, 80, (g) => {
    g.fillStyle(filled ? 0xffd23f : 0x000000, filled ? 1 : 0.3).fillPoints(points, true);
    g.lineStyle(5, filled ? 0x1d2b3a : 0xffffff, filled ? 1 : 0.8).strokePoints(points, true);
  });
}

function makeLock(scene: Phaser.Scene) {
  draw(scene, 'lock', 48, 56, (g) => {
    g.lineStyle(7, 0xffffff);
    g.beginPath();
    g.arc(24, 24, 13, Math.PI, 0);
    g.strokePath();
    g.fillStyle(0xffffff).fillRoundedRect(4, 24, 40, 30, 6);
    g.fillStyle(0x7a8794).fillCircle(24, 37, 5);
  });
}

function makeTile(scene: Phaser.Scene, key: string, color: number) {
  draw(scene, key, MENU_TILE, MENU_TILE, (g) => {
    g.fillStyle(color).fillRoundedRect(3, 3, MENU_TILE - 6, MENU_TILE - 6, 20);
    g.lineStyle(5, 0xffffff).strokeRoundedRect(3, 3, MENU_TILE - 6, MENU_TILE - 6, 20);
  });
}
```

- [ ] **Step 8: `src/scenes/MenuScene.ts`**

```ts
import Phaser from 'phaser';
import { GAME_W } from '../config';
import { isUnlocked, loadProgress, safeStorage, type Progress } from '../game/progress';
import { LEVELS } from '../levels/levels';
import { menuLayout } from '../ui/layout';
import { lockLandscape, watchOrientation } from '../ui/orientation';
import { TEXT, gameInsets, makeRotateOverlay, placeOverlay, type Overlay } from '../ui/widgets';
import { makeBackdrop } from '../textures/placeholders';

/** Title and one tile per level: number and best stars when open, a lock otherwise. */
export class MenuScene extends Phaser.Scene {
  private sky!: Phaser.GameObjects.Image;
  private layers: Phaser.GameObjects.TileSprite[] = [];
  private title!: Phaser.GameObjects.Text;
  private tiles: Phaser.GameObjects.Container[] = [];
  private rotate!: Overlay;
  private starting = false;

  constructor() {
    super('Menu');
  }

  create() {
    this.tiles = [];
    this.starting = false;
    const theme = LEVELS[0].theme;
    makeBackdrop(this, theme);
    this.sky = this.add.image(0, 0, `sky-${theme.key}`).setOrigin(0);
    this.layers = [
      this.add.tileSprite(0, 0, GAME_W, 260, 'clouds'),
      this.add.tileSprite(0, 0, GAME_W, 260, `hills-far-${theme.key}`),
      this.add.tileSprite(0, 0, GAME_W, 200, `hills-near-${theme.key}`),
    ].map((layer) => layer.setOrigin(0));
    this.title = this.add.text(0, 0, 'Platformer Shooter', { ...TEXT, fontSize: '64px' }).setOrigin(0.5);
    const progress = loadProgress(safeStorage());
    LEVELS.forEach((_, i) => this.tiles.push(this.makeTile(i, progress)));
    this.rotate = makeRotateOverlay(this);

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
    this.input.once(Phaser.Input.Events.POINTER_DOWN, lockLandscape);
    watchOrientation(this, (portrait) => this.rotate.container.setVisible(portrait));
  }

  private makeTile(i: number, progress: Progress) {
    const open = isUnlocked(progress, LEVELS, i);
    const stars = progress.stars[LEVELS[i].id] ?? 0;
    const bg = this.add.image(0, 0, open ? 'tile-open' : 'tile-locked');
    const mark = open
      ? this.add.text(0, -14, String(i + 1), { ...TEXT, fontSize: '60px' }).setOrigin(0.5)
      : this.add.image(0, -12, 'lock');
    const row = [0, 1, 2].map((s) => this.add.image((s - 1) * 36, 44, s < stars ? 'star' : 'star-empty').setScale(0.4));
    if (open) {
      bg.setInteractive({ useHandCursor: true });
      bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.play(i));
    }
    return this.add.container(0, 0, [bg, mark, ...row]);
  }

  /** A second tap before the scenes switch would start the level and its UI twice. */
  private play(i: number) {
    if (this.starting) return;
    this.starting = true;
    this.scene.start('Game', { level: i });
    this.scene.launch('UI');
  }

  private layout() {
    const { width, height } = this.scale;
    const l = menuLayout(width, height, LEVELS.length, gameInsets(this));
    this.sky.setDisplaySize(width, height);
    const [clouds, far, near] = this.layers;
    clouds.setSize(width, 260);
    far.setSize(width, 260).setY(height - 260);
    near.setSize(width, 200).setY(height - 200);
    this.title.setPosition(l.title.x, l.title.y);
    this.tiles.forEach((t, i) => t.setPosition(l.tiles[i].x, l.tiles[i].y).setScale(l.tileScale));
    placeOverlay(this.rotate, width, height);
  }
}
```

- [ ] **Step 9: Boot → Menu, регистрация сцены**

`src/scenes/BootScene.ts`, конец `create`:

```ts
    this.scene.start('Menu');
```

(строки `this.scene.start('Game', { level: 0 });` и `this.scene.launch('UI');` удалить.)

`src/main.ts`: импорт `import { MenuScene } from './scenes/MenuScene';`, список сцен `scene: [BootScene, MenuScene, GameScene, UIScene],`.

- [ ] **Step 10: Проверить**

Run: `npm test && npm run build`
Expected: PASS, сборка без ошибок.

Run: `npm run dev`:
1. После загрузки меню: заголовок, пять плиток; если `level-1` уже пройден в Task 3, открыты 1 и 2, у 1 звёзды; остальные с замком.
2. DevTools → Application → Local Storage → удалить `platformer-shooter.progress`, перезагрузить: открыт только 1.
3. Тап по 1: уровень 1 с HUD. Тап по замку: ничего.
4. Узкое окно (DevTools, 700×400): плитки уменьшились и не вылезают за края.
5. Портрет (DevTools, 390×844): «Поверни телефон» в меню.

- [ ] **Step 11: Commit**

```bash
git add src
git commit -m "Меню выбора уровня: плитки со звёздами и замками, общие виджеты и ориентация вынесены из UIScene"
```

---

### Task 5: HUD и оверлеи: сердечки, пауза, победа, поражение

**Files:**
- Modify: `src/config.ts` (`PAUSE_GAP`)
- Create: `src/ui/screen.ts`, `src/ui/screen.test.ts`
- Modify: `src/ui/layout.ts`, `src/ui/layout.test.ts` (`lives`, `pause`; ⛶ сдвигается влево)
- Modify: `src/textures/placeholders.ts` (`heart`, `pause`)
- Rewrite: `src/scenes/UIScene.ts`

**Interfaces:**
- Consumes: `registry` (`levelIndex`, `kills`, `zombiesTotal`, `lives`, `result`, `stars`); `LEVELS`; `LIVES`, `STAR_DELAY`; `widgets.ts`, `orientation.ts` из Task 4.
- Produces:
  - `type Screen = 'play' | 'pause' | 'won' | 'lost'`
  - `nextScreen(current: Screen, result: 'won' | 'lost' | null): Screen`
  - `gameRuns(screen: Screen, portrait: boolean): boolean`
  - `HudLayout.lives: Point` (центр первого сердечка), `HudLayout.pause: Point` (правый верхний угол ⏸)
  - `PAUSE_GAP = 70`

- [ ] **Step 1: Падающий тест `src/ui/screen.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { gameRuns, nextScreen } from './screen';

describe('nextScreen', () => {
  it('shows the result as soon as the level has one', () => {
    expect(nextScreen('play', 'won')).toBe('won');
    expect(nextScreen('play', 'lost')).toBe('lost');
  });
  it('keeps the pause until the player leaves it', () => {
    expect(nextScreen('pause', null)).toBe('pause');
  });
  it('goes back to play once the result is cleared for a restart', () => {
    expect(nextScreen('won', null)).toBe('play');
    expect(nextScreen('lost', null)).toBe('play');
    expect(nextScreen('play', null)).toBe('play');
  });
});

describe('gameRuns', () => {
  it('runs only in play and landscape', () => {
    expect(gameRuns('play', false)).toBe(true);
    expect(gameRuns('play', true)).toBe(false);
  });
  it('stays stopped under any overlay even after turning back to landscape', () => {
    for (const s of ['pause', 'won', 'lost'] as const) expect(gameRuns(s, false)).toBe(false);
  });
});
```

Run: `npm test -- src/ui/screen.test.ts`
Expected: FAIL, `Failed to resolve import "./screen"`.

- [ ] **Step 2: `src/ui/screen.ts`**

```ts
/** What covers the level: nothing, or one of the overlays. */
export type Screen = 'play' | 'pause' | 'won' | 'lost';

/** A result always wins; without one the pause holds until the player leaves it, anything else goes back to play. */
export function nextScreen(current: Screen, result: 'won' | 'lost' | null): Screen {
  return result ?? (current === 'pause' ? 'pause' : 'play');
}

/** The level runs only while nothing covers it: no overlay and no "turn the phone" screen. */
export function gameRuns(screen: Screen, portrait: boolean): boolean {
  return screen === 'play' && !portrait;
}
```

Run: `npm test -- src/ui/screen.test.ts`
Expected: PASS.

- [ ] **Step 3: Константа и падающие тесты `hudLayout`**

`src/config.ts`:

```ts
export const PAUSE_GAP = 70; // ⏸ sits at the right edge, ⛶ this far to its left
```

`src/ui/layout.test.ts`: импорт `import { BUTTON_MARGIN as M, BUTTON_SIZE, MENU_GAP, MENU_TILE, PAUSE_GAP } from '../config';`

В тесте `follows the real right edge on a wider phone` строку про `fullscreen` заменить на:

```ts
    expect(l.pause).toEqual({ x: 1170 - M, y: 12 });
    expect(l.fullscreen).toEqual({ x: 1170 - M - PAUSE_GAP, y: 12 });
```

Тест `keeps the counter and ⛶ below the top inset and inside the sides` целиком:

```ts
  it('keeps the counter, hearts, ⏸ and ⛶ below the top inset and inside the sides', () => {
    const l = hudLayout(1170, 540, insets);
    expect(l.counter).toEqual({ x: 44 + M, y: 10 + 16 });
    expect(l.lives).toEqual({ x: 44 + M + 20, y: 10 + 80 });
    expect(l.pause).toEqual({ x: 1170 - 44 - M, y: 10 + 12 });
    expect(l.fullscreen).toEqual({ x: 1170 - 44 - M - PAUSE_GAP, y: 10 + 12 });
  });
```

Run: `npm test -- src/ui/layout.test.ts`
Expected: FAIL на `pause`/`lives` (`undefined`).

- [ ] **Step 4: `hudLayout` в `src/ui/layout.ts`**

Импорт: `import { BUTTON_MARGIN, BUTTON_SIZE, MENU_GAP, MENU_TILE, PAUSE_GAP } from '../config';`

`HudLayout`:

```ts
export interface HudLayout {
  buttons: Record<Action, Point>;
  counter: Point; // top-left corner of the zombie counter
  lives: Point; // centre of the first heart, the rest follow to the right
  pause: Point; // top-right corner of the ⏸ icon
  fullscreen: Point; // top-right corner of the ⛶ label
  center: Point;
}
```

В `return` функции `hudLayout`, вместо строки `fullscreen`:

```ts
    lives: { x: left + m + 20, y: insets.top + 80 },
    pause: { x: right - m, y: insets.top + 12 },
    fullscreen: { x: right - m - PAUSE_GAP, y: insets.top + 12 },
```

Run: `npm test -- src/ui`
Expected: PASS.

- [ ] **Step 5: Текстуры `heart` и `pause`**

В `makeTextures` в конец:

```ts
  makeHeart(scene);
  makePause(scene);
```

В конец файла:

```ts
function makeHeart(scene: Phaser.Scene) {
  draw(scene, 'heart', 40, 36, (g) => {
    g.fillStyle(0xe94b3c);
    g.fillCircle(11, 12, 10).fillCircle(29, 12, 10);
    g.fillTriangle(2, 16, 38, 16, 20, 35);
  });
}

function makePause(scene: Phaser.Scene) {
  draw(scene, 'pause', 44, 44, (g) => {
    g.fillStyle(0x1d2b3a).fillRoundedRect(6, 4, 13, 36, 3).fillRoundedRect(25, 4, 13, 36, 3);
    g.fillStyle(0xffffff).fillRoundedRect(9, 7, 7, 30, 2).fillRoundedRect(28, 7, 7, 30, 2);
  });
}
```

- [ ] **Step 6: Переписать `src/scenes/UIScene.ts` целиком**

```ts
import Phaser from 'phaser';
import { BUTTON_SIZE, BUTTON_SLOP, LIVES, STAR_DELAY } from '../config';
import type { Action, Intent } from '../input/Intent';
import { LEVELS } from '../levels/levels';
import { hudLayout } from '../ui/layout';
import { lockLandscape, watchOrientation } from '../ui/orientation';
import { gameRuns, nextScreen, type Screen } from '../ui/screen';
import { FONT, TEXT, gameInsets, makeOverlay, makeRotateOverlay, placeOverlay, type Overlay, type OverlayButton } from '../ui/widgets';

const HEART_STEP = 46;

/** Runs on top of 'Game' while a level is played. Reads the registry every frame instead of subscribing to events. */
export class UIScene extends Phaser.Scene {
  private intent!: Intent;
  private counter!: Phaser.GameObjects.Text;
  private hearts: Phaser.GameObjects.Image[] = [];
  private buttons: { action: Action; circle: Phaser.GameObjects.Arc; label: Phaser.GameObjects.Text }[] = [];
  private fullscreen?: Phaser.GameObjects.Text;
  private pauseButton!: Phaser.GameObjects.Image;
  private overlay?: Overlay;
  private rotate!: Overlay;
  private screen: Screen = 'play';
  private portrait = false;

  constructor() {
    super('UI');
  }

  create() {
    this.intent = this.registry.get('intent') as Intent;
    this.buttons = [];
    this.hearts = [];
    this.overlay = undefined;
    this.screen = 'play';
    this.portrait = false;
    this.counter = this.add.text(0, 0, '', { ...TEXT, fontSize: '30px' });
    for (let i = 0; i < LIVES; i++) this.hearts.push(this.add.image(0, 0, 'heart'));
    if ('ontouchstart' in window) this.addButtons();
    this.addFullscreenButton();
    this.pauseButton = this.add.image(0, 0, 'pause').setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.pauseButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.show('pause'));
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.rotate = makeRotateOverlay(this);
    this.layout();
    // Scale.EXPAND: the game width follows the screen, so everything tied to an edge moves on resize
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));

    // a finger lifted anywhere, even off its button, lets go of what it held
    const release = (p: Phaser.Input.Pointer) => this.intent.releasePointer(p.id);
    this.input.on(Phaser.Input.Events.POINTER_UP, release);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, release);
    this.input.once(Phaser.Input.Events.POINTER_DOWN, lockLandscape);

    watchOrientation(this, (portrait) => {
      this.portrait = portrait;
      this.rotate.container.setVisible(portrait);
      if (portrait) this.intent.clearPointers();
    });
  }

  update() {
    const screen = nextScreen(this.screen, this.registry.get('result') as 'won' | 'lost' | null);
    if (screen !== this.screen) this.show(screen);
    this.syncGame();
    this.counter.setText(`Зомби: ${this.registry.get('kills') ?? 0}/${this.registry.get('zombiesTotal') ?? 0}`);
    const lives = (this.registry.get('lives') as number | undefined) ?? LIVES;
    this.hearts.forEach((h, i) => h.setAlpha(i < lives ? 1 : 0.25));
    for (const b of this.buttons) b.circle.setFillStyle(0xffffff, this.intent.held(b.action) ? 0.5 : 0.25);
  }

  /** Pause or resume 'Game' to match what covers it; checked every frame, so a late start or a rotation is caught too. */
  private syncGame() {
    const run = gameRuns(this.screen, this.portrait);
    if (run && this.scene.isPaused('Game')) this.scene.resume('Game');
    if (!run && this.scene.isActive('Game')) this.scene.pause('Game');
  }

  private togglePause() {
    if (this.screen === 'play') this.show('pause');
    else if (this.screen === 'pause') this.show('play');
  }

  /** Swaps the overlay. The old one is destroyed at once, so a second tap on its button finds nothing. */
  private show(screen: Screen) {
    this.screen = screen;
    this.overlay?.container.destroy();
    this.overlay = undefined;
    this.intent.clearPointers();
    const playing = screen === 'play';
    for (const b of this.buttons) {
      b.circle.setVisible(playing);
      b.label.setVisible(playing);
    }
    this.pauseButton.setVisible(playing);
    const index = this.registry.get('levelIndex') as number;
    const again: OverlayButton = { label: 'Заново', onClick: () => this.playLevel(index) };
    const menu: OverlayButton = { label: 'В меню', onClick: () => this.toMenu() };
    if (screen === 'pause') this.overlay = makeOverlay(this, 'Пауза', [{ label: 'Продолжить', onClick: () => this.show('play') }, again, menu]);
    if (screen === 'lost') this.overlay = makeOverlay(this, 'Попробуй ещё раз', [again, menu]);
    if (screen === 'won') this.overlay = this.makeWin(index, again, menu);
    this.layout();
  }

  private makeWin(index: number, again: OverlayButton, menu: OverlayButton): Overlay {
    const last = index === LEVELS.length - 1;
    const next: OverlayButton[] = last ? [] : [{ label: 'Дальше', onClick: () => this.playLevel(index + 1) }];
    const o = makeOverlay(this, last ? 'Все уровни пройдены!' : 'Победа!', [...next, again, menu]);
    const stars = this.registry.get('stars') as number;
    for (let s = 0; s < 3; s++) {
      const star = this.add.image((s - 1) * 100, -20, s < stars ? 'star' : 'star-empty').setScale(0);
      o.container.add(star);
      this.tweens.add({ targets: star, scale: 1, delay: STAR_DELAY * (s + 1), duration: 250, ease: 'Back.easeOut' });
    }
    return o;
  }

  /** Clears the result first: until 'Game' restarts, update() would otherwise bring the old overlay back. */
  private playLevel(index: number) {
    this.registry.set('result', null);
    this.show('play');
    this.scene.get('Game').scene.restart({ level: index });
  }

  private toMenu() {
    this.scene.stop('Game');
    this.scene.start('Menu');
  }

  /** Puts every edge-bound object where hudLayout says for the current game size. */
  private layout() {
    const { width, height } = this.scale;
    const l = hudLayout(width, height, gameInsets(this));
    this.counter.setPosition(l.counter.x, l.counter.y);
    this.hearts.forEach((h, i) => h.setPosition(l.lives.x + i * HEART_STEP, l.lives.y));
    for (const b of this.buttons) {
      const p = l.buttons[b.action];
      b.circle.setPosition(p.x, p.y);
      b.label.setPosition(p.x, p.y);
    }
    this.fullscreen?.setPosition(l.fullscreen.x, l.fullscreen.y);
    this.pauseButton.setPosition(l.pause.x, l.pause.y);
    if (this.overlay) placeOverlay(this.overlay, width, height);
    placeOverlay(this.rotate, width, height);
  }

  private addButtons() {
    const r = BUTTON_SIZE / 2;
    const labels: [Action, string][] = [['left', '←'], ['right', '→'], ['shoot', '✹'], ['jump', '↑']];
    for (const [action, text] of labels) {
      const circle = this.add.circle(0, 0, r, 0xffffff, 0.25).setStrokeStyle(4, 0xffffff, 0.6);
      // hit area in the shape's local space (origin at its top-left), BUTTON_SLOP wider than the drawing
      circle.setInteractive(new Phaser.Geom.Circle(r, r, r + BUTTON_SLOP), Phaser.Geom.Circle.Contains);
      circle.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer) => this.intent.pressPointer(p.id, action));
      circle.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, (p: Phaser.Input.Pointer) => this.intent.releasePointer(p.id));
      // a thumb rolled from one button onto another presses the new one, like a D-pad
      circle.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, (p: Phaser.Input.Pointer) => {
        if (p.isDown) this.intent.pressPointer(p.id, action);
      });
      const label = this.add.text(0, 0, text, { fontFamily: FONT, fontSize: '52px', color: '#ffffff' }).setOrigin(0.5).setAlpha(0.9);
      this.buttons.push({ action, circle, label });
    }
  }

  private addFullscreenButton() {
    if (!this.sys.game.device.fullscreen.available) return;
    const b = this.add.text(0, 0, '⛶', { ...TEXT, fontSize: '40px' }).setOrigin(1, 0);
    this.fullscreen = b;
    b.setInteractive({ useHandCursor: true });
    // fullscreen must start from pointerup: browsers allow it only inside a user gesture
    b.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () =>
      this.scale.isFullscreen ? this.scale.stopFullscreen() : this.scale.startFullscreen());
  }
}
```

- [ ] **Step 7: Проверить**

Run: `npm test && npm run build`
Expected: PASS, сборка без ошибок.

Run: `npm run dev`, уровень 1 из меню:
1. Слева сверху «Зомби: 0/5» и три сердечка; смерть гасит одно.
2. ⏸ и Esc: «Пауза», зомби стоят; «Продолжить» и повторный Esc возвращают игру.
3. Пауза → портрет (DevTools) → ландшафт: оверлей паузы на месте, зомби стоят.
4. Три смерти: «Попробуй ещё раз»; «Заново» даёт три сердечка и всех зомби.
5. Флаг: «Победа!», звёзды выскакивают по одной, «Дальше» отсутствует, пока уровней один (последний уровень: заголовок «Все уровни пройдены!»).
6. «В меню»: меню, у уровня 1 звёзды.
7. Быстрый двойной клик по «Заново»: уровень перезапускается один раз (нет двойного затемнения, HUD один).

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "HUD: сердечки и пауза; оверлеи паузы, победы со звёздами и поражения; поворот не снимает паузу"
```

---

### Task 6: Карты 2–5

**Files:**
- Create: `src/levels/maps/level2.ts` … `level5.ts`
- Modify: `src/levels/levels.ts` (`LEVELS`)
- Modify: `src/levels/levels.test.ts` (`EXPECTED`)

**Interfaces:**
- Consumes: `LevelDef`, `DAY`, `SUNSET`, `DUSK`.
- Produces: `LEVEL2` … `LEVEL5: string[]`; `LEVELS` из пяти элементов с `id` `'level-1'` … `'level-5'`.

- [ ] **Step 1: Падающий тест — расширить `EXPECTED` в `src/levels/levels.test.ts`**

```ts
const EXPECTED = [
  { id: 'level-1', width: 70, zombies: 5 },
  { id: 'level-2', width: 80, zombies: 6 },
  { id: 'level-3', width: 90, zombies: 7 },
  { id: 'level-4', width: 100, zombies: 8 },
  { id: 'level-5', width: 110, zombies: 10 },
];
```

Run: `npm test -- src/levels`
Expected: FAIL в `lists the expected levels in order with unique ids`.

- [ ] **Step 2: `src/levels/maps/level2.ts`**

```ts
// 80×9, day. More pits, zombies patrolling right at their edges.
export const LEVEL2: string[] = [
  '................................................................................',
  '................................................................................',
  '................................................................................',
  '.........................................=====..................................',
  '......................................Z......................Z..................',
  '................====.......C........=====...................====.............F..',
  '..P............Z.........Z.C...................Z..C...................Z...######',
  '############..########..#######..###########..##########..########..############',
  '############..########..#######..###########..##########..########..############',
];
```

- [ ] **Step 3: `src/levels/maps/level3.ts`**

```ts
// 90×9, sunset. Platform stairs two floors up with a zombie on every top floor.
export const LEVEL3: string[] = [
  '..........................................................................................',
  '..........................................................................................',
  '.........................Z....................Z..................Z........................',
  '.......................======..............======..............======.....................',
  '.......................................Z..................................................',
  '..................====................====........C.......====.................C.......F..',
  '..P...........................Z...................C.....Z...................Z..C....######',
  '##############..#################..#################..################..##################',
  '##############..#################..#################..################..##################',
];
```

- [ ] **Step 4: `src/levels/maps/level4.ts`**

```ts
// 100×9, sunset. Crate walls to shoot through, each followed by a pit.
export const LEVEL4: string[] = [
  '....................................................................................................',
  '....................................................................................................',
  '.....................................................Z..............................................',
  '..................................................======............................................',
  '..................Z..............Z...............C................Z.................................',
  '..........C.....=====...C......=====....C.......CC.......C......=====....C......=====.C..........F..',
  '..P.......C.........Z...C...........Z...C......CCC.......C............Z..C.........Z..C.......######',
  '#############..############..##############..###############..##############..###########..#########',
  '#############..############..##############..###############..##############..###########..#########',
];
```

- [ ] **Step 5: `src/levels/maps/level5.ts`**

```ts
// 110×9, dusk. Everything together; the flag stands on the top platform.
export const LEVEL5: string[] = [
  '..............................................................................................................',
  '..............................................................................................................',
  '................................Z..........................Z...........................................F......',
  '.............................======......................=====......................................=====.....',
  '............................C.........................Z.............Z.........................................',
  '................C..........CC...............C.......=====.........=====.C......................====...........',
  '..P...........Z.C.......Z.CCC...........Z...C.............Z.............C............Z...........Z............',
  '###########..#######..#############..###########..############..#############..###########..##################',
  '###########..#######..#############..###########..############..#############..###########..##################',
];
```

- [ ] **Step 6: Подключить в `src/levels/levels.ts`**

Импорты:

```ts
import { LEVEL1 } from './maps/level1';
import { LEVEL2 } from './maps/level2';
import { LEVEL3 } from './maps/level3';
import { LEVEL4 } from './maps/level4';
import { LEVEL5 } from './maps/level5';
```

```ts
export const LEVELS: LevelDef[] = [
  { id: 'level-1', map: LEVEL1, theme: DAY },
  { id: 'level-2', map: LEVEL2, theme: DAY },
  { id: 'level-3', map: LEVEL3, theme: SUNSET },
  { id: 'level-4', map: LEVEL4, theme: SUNSET },
  { id: 'level-5', map: LEVEL5, theme: DUSK },
];
```

- [ ] **Step 7: Прогнать тесты**

Run: `npm test && npm run build`
Expected: PASS (по три теста на каждую карту), сборка без ошибок.

- [ ] **Step 8: Пройти каждую карту в браузере**

Run: `npm run dev`. Чтобы не проходить уровни по порядку, в консоли DevTools открыть все:

```js
localStorage.setItem('platformer-shooter.progress', JSON.stringify({ v: 1, stars: { 'level-1': 1, 'level-2': 1, 'level-3': 1, 'level-4': 1 } })); location.reload();
```

Для каждого уровня 2–5 дойти до флага с клавиатуры (стрелки, пробел). Expected: каждая яма перепрыгивается, каждая платформа второго этажа достижима, каждая стена из ящиков пробивается выстрелом или перепрыгивается, у уровня 5 флаг на верхней платформе достижим, все зомби убиваемы. Если место непроходимо — поправить карту (ширину ямы, высоту, сдвиг платформы), сохраняя ширину и число зомби из `EXPECTED`, прогнать `npm test` и пройти снова. Тема фона: 2 день, 3–4 закат, 5 сумерки.

- [ ] **Step 9: Commit**

```bash
git add src/levels
git commit -m "Уровни 2–5: ямы у края, лестницы платформ, стены из ящиков, финал на верхней платформе"
```

---

### Task 7: Проверка целиком

**Files:** нет изменений кода, если проверка ничего не нашла.

- [ ] **Step 1: Тесты и сборка**

Run: `npm test && npm run build`
Expected: всё PASS, сборка без ошибок и предупреждений TypeScript.

- [ ] **Step 2: Чеклист в браузере** (`npm run dev`, перед началом удалить `platformer-shooter.progress`)

1. Меню: открыт только уровень 1.
2. Уровень 1 без потерь со всеми зомби: три звезды; «Дальше» → уровень 2; «В меню»: уровень 2 открыт, у 1 три звезды.
3. Пройти уровень 1 снова на одну звезду: в меню по-прежнему три.
4. Потерять три жизни: «Попробуй ещё раз», «Заново» → три сердечка, все зомби на месте.
5. Касание зомби в момент мигания последней смертью: жизней не становится меньше нуля, оверлей один.
6. ⏸ и Esc на паузу и обратно; «Заново» и «В меню» из паузы.
7. Пауза → портрет → ландшафт: игра стоит под паузой.
8. Двойной быстрый клик по плитке меню: уровень один, HUD один (нет двух счётчиков друг на друге).
9. Пройти уровни 2–5 подряд; после 5-го «Все уровни пройдены!» без «Дальше».
10. Закрыть вкладку, открыть снова: звёзды и открытые уровни на месте.
11. Приватное окно Safari (или Chrome Incognito): игра запускается, уровни проходятся.

- [ ] **Step 3: Найденное**

Каждую проблему чинить отдельным коммитом через superpowers:systematic-debugging, затем повторить Step 1.

- [ ] **Step 4: Отчёт пользователю**

Сообщить результаты чеклиста и спросить, сливать ли `levels-menu` в `main` (это публикует игру на GitHub Pages). Без ответа не сливать и не пушить.
