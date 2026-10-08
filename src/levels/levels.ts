import { SKY_BOTTOM, SKY_TOP } from '../config';
import { LEVEL1 } from './maps/level1';
import { LEVEL2 } from './maps/level2';
import { LEVEL3 } from './maps/level3';
import { LEVEL4 } from './maps/level4';
import { LEVEL5 } from './maps/level5';

/** Backdrop colours. key names the textures makeBackdrop draws for this theme. */
export interface Theme {
  key: string;
  skyTop: number;
  skyBottom: number;
  hillsFar: number;
  hillsNear: number;
}

/** Saved progress is keyed by id, so levels can be reordered or inserted without breaking old saves. */
export interface LevelDef {
  id: string;
  map: string[];
  theme: Theme;
}

export const DAY: Theme = { key: 'day', skyTop: SKY_TOP, skyBottom: SKY_BOTTOM, hillsFar: 0x8fd18a, hillsNear: 0x5fb35a };
export const SUNSET: Theme = { key: 'sunset', skyTop: 0xff9a5c, skyBottom: 0xffe0a8, hillsFar: 0xc98a6b, hillsNear: 0x8e6a4f };
export const DUSK: Theme = { key: 'dusk', skyTop: 0x2e3a6b, skyBottom: 0x8a7bb8, hillsFar: 0x4f5f8a, hillsNear: 0x34466b };

export const LEVELS: LevelDef[] = [
  { id: 'level-1', map: LEVEL1, theme: DAY },
  { id: 'level-2', map: LEVEL2, theme: DAY },
  { id: 'level-3', map: LEVEL3, theme: SUNSET },
  { id: 'level-4', map: LEVEL4, theme: SUNSET },
  { id: 'level-5', map: LEVEL5, theme: DUSK },
];
