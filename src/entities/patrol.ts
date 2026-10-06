export type Dir = 1 | -1;

/** Patrol rule: turn around at a wall or where the floor ends. */
export function nextDirection(dir: Dir, blockedAhead: boolean, groundAhead: boolean): Dir {
  return blockedAhead || !groundAhead ? (-dir as Dir) : dir;
}
