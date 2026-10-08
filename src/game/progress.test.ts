import { describe, expect, it } from 'vitest';
import { emptyProgress, isUnlocked, loadProgress, recordWin, saveProgress, STORAGE_KEY } from './progress';

const LEVELS = [{ id: 'level-1' }, { id: 'level-2' }, { id: 'level-3' }, { id: 'level-4' }, { id: 'level-5' }];

function memory(saved?: string) {
  const data = new Map<string, string>();
  if (saved !== undefined) data.set(STORAGE_KEY, saved);
  return { data, getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}

const broken = {
  getItem: (): string | null => { throw new Error('denied'); },
  setItem: (): void => { throw new Error('denied'); },
};

describe('isUnlocked', () => {
  it('opens only the first level on empty progress', () => {
    expect(LEVELS.map((_, i) => isUnlocked(emptyProgress(), LEVELS, i))).toEqual([true, false, false, false, false]);
  });
  it('opens a level once the one before it has stars', () => {
    const p = { stars: { 'level-1': 1, 'level-2': 3, 'level-3': 2 } };
    expect(LEVELS.map((_, i) => isUnlocked(p, LEVELS, i))).toEqual([true, true, true, true, false]);
  });
  it('a foreign id opens nothing', () => {
    const p = { stars: { 'level-9': 3, bonus: 2 } };
    expect(isUnlocked(p, LEVELS, 1)).toBe(false);
  });
});

describe('recordWin', () => {
  it('keeps the best result and leaves the original alone', () => {
    const before = { stars: { 'level-1': 3 } };
    const after = recordWin(before, 'level-1', 1);
    expect(after.stars['level-1']).toBe(3);
    expect(recordWin(after, 'level-2', 2).stars).toEqual({ 'level-1': 3, 'level-2': 2 });
    expect(before).toEqual({ stars: { 'level-1': 3 } });
  });
  it('raises a lower result', () => {
    expect(recordWin({ stars: { 'level-1': 1 } }, 'level-1', 2).stars['level-1']).toBe(2);
  });
});

describe('loadProgress / saveProgress', () => {
  it('round-trips through storage in the v1 format', () => {
    const s = memory();
    saveProgress(s, { stars: { 'level-1': 3 } });
    expect(JSON.parse(s.data.get(STORAGE_KEY)!)).toEqual({ v: 1, stars: { 'level-1': 3 } });
    expect(loadProgress(s)).toEqual({ stars: { 'level-1': 3 } });
  });
  it('starts empty with nothing saved or no storage at all', () => {
    expect(loadProgress(memory())).toEqual(emptyProgress());
    expect(loadProgress(undefined)).toEqual(emptyProgress());
  });
  it('starts empty on broken JSON or another version', () => {
    expect(loadProgress(memory('{oops'))).toEqual(emptyProgress());
    expect(loadProgress(memory('{"v":2,"stars":{"level-1":3}}'))).toEqual(emptyProgress());
    expect(loadProgress(memory('[1,2]'))).toEqual(emptyProgress());
    expect(loadProgress(memory('{"v":1,"stars":5}'))).toEqual(emptyProgress());
  });
  it('drops entries that are not a whole number from 1 to 3', () => {
    const s = memory('{"v":1,"stars":{"level-1":2,"level-2":7,"level-3":1.5,"level-4":"3","level-5":0}}');
    expect(loadProgress(s)).toEqual({ stars: { 'level-1': 2 } });
  });
  it('survives a storage that throws on read and on write', () => {
    expect(loadProgress(broken)).toEqual(emptyProgress());
    expect(() => saveProgress(broken, { stars: { 'level-1': 1 } })).not.toThrow();
    expect(() => saveProgress(undefined, { stars: {} })).not.toThrow();
  });
});
