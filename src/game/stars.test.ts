import { describe, expect, it } from 'vitest';
import { starsFor } from './stars';

describe('starsFor', () => {
  it('gives one star just for reaching the flag', () => {
    expect(starsFor({ kills: 2, zombiesTotal: 5, livesLost: 1 })).toBe(1);
  });
  it('adds a star for every zombie', () => {
    expect(starsFor({ kills: 5, zombiesTotal: 5, livesLost: 2 })).toBe(2);
  });
  it('adds a star for not losing a life', () => {
    expect(starsFor({ kills: 0, zombiesTotal: 5, livesLost: 0 })).toBe(2);
  });
  it('gives three for both', () => {
    expect(starsFor({ kills: 5, zombiesTotal: 5, livesLost: 0 })).toBe(3);
  });
});
