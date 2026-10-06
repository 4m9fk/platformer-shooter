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
