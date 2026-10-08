import { describe, expect, it } from 'vitest';
import { BUTTON_MARGIN as M, BUTTON_SIZE, MENU_GAP, MENU_TILE, PAUSE_GAP } from '../config';
import { hudLayout, menuLayout } from './layout';

const R = BUTTON_SIZE / 2;

describe('hudLayout', () => {
  it('puts run buttons bottom-left and jump/shoot bottom-right on a 16:9 screen', () => {
    const l = hudLayout(960, 540);
    expect(l.buttons.left).toEqual({ x: M + R, y: 540 - M - R });
    expect(l.buttons.right).toEqual({ x: 2 * M + 3 * R, y: 540 - M - R });
    expect(l.buttons.shoot).toEqual({ x: 960 - M - R, y: 540 - M - R });
    expect(l.buttons.jump).toEqual({ x: 960 - M - R, y: 540 - M - R - BUTTON_SIZE - M });
  });

  it('follows the real right edge on a wider phone', () => {
    const l = hudLayout(1170, 540);
    expect(l.buttons.shoot.x).toBe(1170 - M - R);
    expect(l.buttons.jump.x).toBe(1170 - M - R);
    expect(l.buttons.left.x).toBe(M + R);
    expect(l.pause).toEqual({ x: 1170 - M, y: 12 });
    expect(l.fullscreen).toEqual({ x: 1170 - M - PAUSE_GAP, y: 12 });
    expect(l.center).toEqual({ x: 585, y: 270 });
  });

  it('follows the real bottom edge on a taller screen', () => {
    const l = hudLayout(960, 720);
    expect(l.buttons.left.y).toBe(720 - M - R);
    expect(l.buttons.jump.y).toBe(720 - M - R - BUTTON_SIZE - M);
  });
});

describe('hudLayout with safe-area insets', () => {
  const insets = { top: 10, right: 44, bottom: 20, left: 44 };

  it('keeps buttons clear of the notch and the home indicator', () => {
    const l = hudLayout(1170, 540, insets);
    expect(l.buttons.left).toEqual({ x: 44 + M + R, y: 540 - 20 - M - R });
    expect(l.buttons.right.x).toBe(44 + 2 * M + 3 * R);
    expect(l.buttons.shoot).toEqual({ x: 1170 - 44 - M - R, y: 540 - 20 - M - R });
    expect(l.buttons.jump.y).toBe(540 - 20 - M - R - BUTTON_SIZE - M);
  });

  it('keeps the counter, hearts, ⏸ and ⛶ below the top inset and inside the sides', () => {
    const l = hudLayout(1170, 540, insets);
    expect(l.counter).toEqual({ x: 44 + M, y: 10 + 16 });
    expect(l.lives).toEqual({ x: 44 + M + 20, y: 10 + 80 });
    expect(l.pause).toEqual({ x: 1170 - 44 - M, y: 10 + 12 });
    expect(l.fullscreen).toEqual({ x: 1170 - 44 - M - PAUSE_GAP, y: 10 + 12 });
  });

  it('centres overlays on the whole screen, not the safe area', () => {
    expect(hudLayout(1170, 540, insets).center).toEqual({ x: 585, y: 270 });
  });

  it('without insets the counter sits at the margin', () => {
    expect(hudLayout(960, 540).counter).toEqual({ x: M, y: 16 });
  });
});

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
