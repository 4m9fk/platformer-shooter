import { describe, expect, it } from 'vitest';
import { TILE } from '../config';
import { zombieContact } from './contact';

// Bodies as Arcade reports them: y grows downward, bottom = feet.
const hero = (top: number, bottom: number, vy: number) => ({ top, bottom, vy });
const zombie = (top: number, bottom: number) => ({ top, bottom, centerY: (top + bottom) / 2 });

describe('zombieContact', () => {
  it('falling with feet above the zombie middle is a stomp', () => {
    expect(zombieContact(hero(150, 250, 300), zombie(240, 420))).toBe('stomp');
  });

  it('touching from the side on the same floor hurts', () => {
    expect(zombieContact(hero(260, 420, 0), zombie(260, 420))).toBe('hurt');
  });

  it('rising into a zombie on the same floor hurts', () => {
    expect(zombieContact(hero(200, 380, -500), zombie(260, 420))).toBe('hurt');
  });

  it('walking on the ground under a zombie that stands on a platform is harmless', () => {
    // hero ~160 px tall on the ground (feet 420), zombie on a platform two tiles up (feet 300)
    expect(zombieContact(hero(260, 420, 0), zombie(140, 300))).toBe('none');
  });

  it('jumping up through the platform under that zombie is harmless too', () => {
    expect(zombieContact(hero(200, 360, -400), zombie(140, 300))).toBe('none');
  });

  it('standing on a platform over a zombie that walks underneath is harmless', () => {
    expect(zombieContact(hero(140, 300, 0), zombie(260, 420))).toBe('none');
  });

  it('a zombie on a floor only half a tile up still counts (slopes of crates, landing frames)', () => {
    expect(zombieContact(hero(260, 420, 0), zombie(260 - TILE / 2 + 1, 420 - TILE / 2 + 1))).toBe('hurt');
  });
});
