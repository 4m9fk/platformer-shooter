import type { Level } from './parse';

export type Tile = '#' | '=' | 'C';

const key = (col: number, row: number) => `${col},${row}`;

/** Tile lookup for zombie patrol. Left and right of the map are walls without a floor; above and below are empty. */
export class Grid {
  private readonly tiles = new Map<string, Tile>();
  private readonly width: number;

  constructor(level: Level) {
    this.width = level.width;
    for (const c of level.solids) this.tiles.set(key(c.col, c.row), '#');
    for (const c of level.platforms) this.tiles.set(key(c.col, c.row), '=');
    for (const c of level.crates) this.tiles.set(key(c.col, c.row), 'C');
  }

  tileAt(col: number, row: number): Tile | null {
    return this.tiles.get(key(col, row)) ?? null;
  }

  isBlocking(col: number, row: number): boolean {
    if (col < 0 || col >= this.width) return true;
    const t = this.tileAt(col, row);
    return t === '#' || t === 'C';
  }

  isGround(col: number, row: number): boolean {
    if (col < 0 || col >= this.width) return false;
    return this.tileAt(col, row) !== null;
  }

  removeCrate(col: number, row: number) {
    if (this.tileAt(col, row) === 'C') this.tiles.delete(key(col, row));
  }
}
