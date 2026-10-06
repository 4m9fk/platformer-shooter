import { describe, expect, it } from 'vitest';
import { parseLevel } from './parse';

describe('parseLevel', () => {
  it('reads every symbol into tile coordinates', () => {
    const level = parseLevel([
      'P.CZ=F',
      '######',
    ]);
    expect(level.width).toBe(6);
    expect(level.height).toBe(2);
    expect(level.start).toEqual({ col: 0, row: 0 });
    expect(level.flag).toEqual({ col: 5, row: 0 });
    expect(level.crates).toEqual([{ col: 2, row: 0 }]);
    expect(level.zombies).toEqual([{ col: 3, row: 0 }]);
    expect(level.platforms).toEqual([{ col: 4, row: 0 }]);
    expect(level.solids).toHaveLength(6);
    expect(level.solids[0]).toEqual({ col: 0, row: 1 });
  });

  it('accepts CRLF line ends', () => {
    expect(parseLevel(['P..F\r', '####\r']).width).toBe(4);
  });

  it('rejects rows of different length with the row number', () => {
    expect(() => parseLevel(['P..F', '###'])).toThrow(/строка 2: длина 3, ожидалась 4/);
  });

  it('rejects an unknown symbol with row and column', () => {
    expect(() => parseLevel(['P. F', '####'])).toThrow(/неизвестный символ ' '.*строка 1, столбец 3/);
    expect(() => parseLevel(['P..F', '##x#'])).toThrow(/неизвестный символ 'x'.*строка 2, столбец 3/);
  });

  it('requires exactly one start and one flag', () => {
    expect(() => parseLevel(['...F', '####'])).toThrow(/нет старта P/);
    expect(() => parseLevel(['P...', '####'])).toThrow(/нет флага F/);
    expect(() => parseLevel(['P.PF', '####'])).toThrow(/второй старт P.*строка 1, столбец 3/);
    expect(() => parseLevel(['PFF.', '####'])).toThrow(/второй флаг F.*строка 1, столбец 3/);
  });

  it('rejects an empty map', () => {
    expect(() => parseLevel([])).toThrow(/карта пуста/);
    expect(() => parseLevel([''])).toThrow(/карта пуста/);
  });
});
