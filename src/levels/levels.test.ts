import { describe, expect, it } from 'vitest';
import { LEVELS } from './levels';
import { parseLevel } from './parse';

// width and zombie count per level, in order; a new level adds a line here
const EXPECTED = [
  { id: 'level-1', width: 70, zombies: 5 },
  { id: 'level-2', width: 80, zombies: 6 },
  { id: 'level-3', width: 90, zombies: 7 },
  { id: 'level-4', width: 100, zombies: 8 },
  { id: 'level-5', width: 110, zombies: 10 },
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
