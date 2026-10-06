import { BUTTON_MARGIN, BUTTON_SIZE } from '../config';
import type { Action } from '../input/Intent';

export interface Point {
  x: number;
  y: number;
}

export interface HudLayout {
  buttons: Record<Action, Point>;
  fullscreen: Point; // top-right corner of the ⛶ label
  center: Point;
}

/** Where the HUD goes on a screen of this size: run buttons hug the left edge, jump and shoot the right one. */
export function hudLayout(width: number, height: number): HudLayout {
  const r = BUTTON_SIZE / 2;
  const m = BUTTON_MARGIN;
  const low = height - m - r;
  const rightX = width - m - r;
  return {
    buttons: {
      left: { x: m + r, y: low },
      right: { x: 2 * m + 3 * r, y: low },
      shoot: { x: rightX, y: low },
      jump: { x: rightX, y: low - BUTTON_SIZE - m },
    },
    fullscreen: { x: width - m, y: 12 },
    center: { x: width / 2, y: height / 2 },
  };
}
