import { describe, expect, it } from 'vitest';
import { BUTTON_MARGIN as M, BUTTON_SIZE } from '../config';
import { hudLayout } from './layout';

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
    expect(l.fullscreen).toEqual({ x: 1170 - M, y: 12 });
    expect(l.center).toEqual({ x: 585, y: 270 });
  });

  it('follows the real bottom edge on a taller screen', () => {
    const l = hudLayout(960, 720);
    expect(l.buttons.left.y).toBe(720 - M - R);
    expect(l.buttons.jump.y).toBe(720 - M - R - BUTTON_SIZE - M);
  });
});
