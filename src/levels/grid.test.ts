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
