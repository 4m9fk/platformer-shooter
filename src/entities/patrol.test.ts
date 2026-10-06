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
