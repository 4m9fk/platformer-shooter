export interface RunResult {
  kills: number;
  zombiesTotal: number;
  livesLost: number;
}

/** One star for the flag, one more for every zombie, one more for not losing a life. */
export function starsFor(r: RunResult): 1 | 2 | 3 {
  return (1 + (r.kills >= r.zombiesTotal ? 1 : 0) + (r.livesLost === 0 ? 1 : 0)) as 1 | 2 | 3;
}
