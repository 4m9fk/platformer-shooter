import { describe, expect, it } from 'vitest';
import { jumpAirFrame } from './jumpFrame';

// Phaser y grows downward: negative vy is rising.
describe('jumpAirFrame', () => {
  const S = 700;
  it('take-off while rising fast', () => expect(jumpAirFrame(-700, S)).toBe(1));
  it('rising', () => expect(jumpAirFrame(-300, S)).toBe(2));
  it('apex around zero speed', () => {
    expect(jumpAirFrame(-50, S)).toBe(3);
    expect(jumpAirFrame(0, S)).toBe(3);
    expect(jumpAirFrame(100, S)).toBe(3);
  });
  it('falling', () => expect(jumpAirFrame(400, S)).toBe(4));
  it('half-speed short hop still starts on the rising frame', () => expect(jumpAirFrame(-350, S)).toBe(2));
});
