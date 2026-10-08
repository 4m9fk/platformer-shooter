import { BUTTON_MARGIN, BUTTON_SIZE, MENU_GAP, MENU_TILE } from '../config';
import type { Action } from '../input/Intent';

export interface Point {
  x: number;
  y: number;
}

/** Screen edges covered by the notch, rounded corners or the home indicator, in game pixels. */
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface HudLayout {
  buttons: Record<Action, Point>;
  counter: Point; // top-left corner of the zombie counter
  fullscreen: Point; // top-right corner of the ⛶ label
  center: Point;
}

const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * Where the HUD goes on a screen of this size: run buttons hug the left edge, jump and shoot the right one,
 * everything inside the safe area. Overlays are centred on the whole screen.
 */
export function hudLayout(width: number, height: number, insets: Insets = NO_INSETS): HudLayout {
  const r = BUTTON_SIZE / 2;
  const m = BUTTON_MARGIN;
  const left = insets.left;
  const right = width - insets.right;
  const low = height - insets.bottom - m - r;
  return {
    buttons: {
      left: { x: left + m + r, y: low },
      right: { x: left + 2 * m + 3 * r, y: low },
      shoot: { x: right - m - r, y: low },
      jump: { x: right - m - r, y: low - BUTTON_SIZE - m },
    },
    counter: { x: left + m, y: insets.top + 16 },
    fullscreen: { x: right - m, y: insets.top + 12 },
    center: { x: width / 2, y: height / 2 },
  };
}

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
