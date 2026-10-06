export interface Cell {
  col: number;
  row: number;
}

export interface Level {
  width: number;
  height: number;
  solids: Cell[];
  platforms: Cell[];
  crates: Cell[];
  zombies: Cell[];
  flag: Cell;
  start: Cell;
}

const LISTS = { '#': 'solids', '=': 'platforms', C: 'crates', Z: 'zombies' } as const;

/** ASCII map, one string per row and one char per tile -> objects in tile coordinates. */
export function parseLevel(rows: readonly string[]): Level {
  const lines = rows.map((r) => r.replace(/\r$/, ''));
  if (lines.length === 0 || lines[0].length === 0) throw new Error('карта пуста');
  const width = lines[0].length;
  const lists = { solids: [] as Cell[], platforms: [] as Cell[], crates: [] as Cell[], zombies: [] as Cell[] };
  let start: Cell | undefined;
  let flag: Cell | undefined;
  lines.forEach((line, row) => {
    if (line.length !== width) throw new Error(`строка ${row + 1}: длина ${line.length}, ожидалась ${width}`);
    [...line].forEach((ch, col) => {
      const at = `строка ${row + 1}, столбец ${col + 1}`;
      const list = LISTS[ch as keyof typeof LISTS];
      if (ch === '.') return;
      if (list) lists[list].push({ col, row });
      else if (ch === 'P') {
        if (start) throw new Error(`второй старт P: ${at}`);
        start = { col, row };
      } else if (ch === 'F') {
        if (flag) throw new Error(`второй флаг F: ${at}`);
        flag = { col, row };
      } else throw new Error(`неизвестный символ '${ch}': ${at}`);
    });
  });
  if (!start) throw new Error('нет старта P');
  if (!flag) throw new Error('нет флага F');
  return { width, height: lines.length, ...lists, start, flag };
}
