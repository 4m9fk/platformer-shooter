import { describe, expect, it } from 'vitest';
import { Tap } from './tap';

describe('Tap', () => {
  it('fires when the same finger went down and up on the button', () => {
    const tap = new Tap();
    tap.press(1);
    expect(tap.release(1)).toBe(true);
  });
  it('ignores a finger that was already down when the button appeared', () => {
    expect(new Tap().release(1)).toBe(false);
  });
  it('ignores a finger that slid off before lifting', () => {
    const tap = new Tap();
    tap.press(1);
    tap.cancel(1);
    expect(tap.release(1)).toBe(false);
  });
  it('fires once per press', () => {
    const tap = new Tap();
    tap.press(2);
    tap.release(2);
    expect(tap.release(2)).toBe(false);
  });
  it('tells fingers apart', () => {
    const tap = new Tap();
    tap.press(1);
    expect(tap.release(2)).toBe(false);
    expect(tap.release(1)).toBe(true);
  });
});
