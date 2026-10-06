import { TILE } from '../config';

export interface HeroBox {
  top: number;
  bottom: number;
  vy: number;
}

export interface ZombieBox {
  top: number;
  bottom: number;
  centerY: number;
}

export type Contact = 'stomp' | 'hurt' | 'none';

/**
 * What an overlap between the hero and a zombie means. Both are ~2.7 tiles tall while floors can be 2 tiles apart,
 * so bodies on different floors overlap through a one-way platform: that is not a touch.
 */
export function zombieContact(hero: HeroBox, zombie: ZombieBox): Contact {
  if (hero.vy > 0 && hero.bottom < zombie.centerY) return 'stomp';
  if (Math.abs(hero.bottom - zombie.bottom) >= TILE) return 'none';
  return 'hurt';
}
