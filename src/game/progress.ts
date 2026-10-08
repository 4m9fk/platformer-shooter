/** Best stars per level id. A level with stars has been finished. */
export interface Progress {
  stars: Record<string, number>;
}

export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

export const STORAGE_KEY = 'platformer-shooter.progress';
const VERSION = 1;

export const emptyProgress = (): Progress => ({ stars: {} });

/** The first level is always open, every other one opens once the level before it is finished. */
export function isUnlocked(p: Progress, levels: readonly { id: string }[], index: number): boolean {
  if (index === 0) return true;
  const before = levels[index - 1];
  return before !== undefined && (p.stars[before.id] ?? 0) > 0;
}

export function recordWin(p: Progress, id: string, stars: number): Progress {
  return { stars: { ...p.stars, [id]: Math.max(p.stars[id] ?? 0, stars) } };
}

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Anything unreadable means a fresh start: a lost save must never stop the game from opening. */
export function loadProgress(storage: KeyValueStore | undefined): Progress {
  let raw: string | null;
  try {
    raw = storage?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return emptyProgress();
  }
  if (!raw) return emptyProgress();
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return emptyProgress();
  }
  if (!isRecord(data) || data.v !== VERSION || !isRecord(data.stars)) return emptyProgress();
  const stars: Record<string, number> = {};
  for (const [id, s] of Object.entries(data.stars)) {
    if (typeof s === 'number' && Number.isInteger(s) && s >= 1 && s <= 3) stars[id] = s;
  }
  return { stars };
}

export function saveProgress(storage: KeyValueStore | undefined, p: Progress) {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify({ v: VERSION, stars: p.stars }));
  } catch {
    // storage full or forbidden (Safari private mode): the game goes on, progress just isn't kept
  }
}

/** window.localStorage, or undefined where merely touching it throws. */
export function safeStorage(): KeyValueStore | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}
