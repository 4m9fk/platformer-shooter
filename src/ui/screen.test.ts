import { describe, expect, it } from 'vitest';
import { gameRuns, nextScreen } from './screen';

describe('nextScreen', () => {
  it('shows the result as soon as the level has one', () => {
    expect(nextScreen('play', 'won')).toBe('won');
    expect(nextScreen('play', 'lost')).toBe('lost');
  });
  it('keeps the pause until the player leaves it', () => {
    expect(nextScreen('pause', null)).toBe('pause');
  });
  it('goes back to play once the result is cleared for a restart', () => {
    expect(nextScreen('won', null)).toBe('play');
    expect(nextScreen('lost', null)).toBe('play');
    expect(nextScreen('play', null)).toBe('play');
  });
});

describe('gameRuns', () => {
  it('runs only in play and landscape', () => {
    expect(gameRuns('play', false)).toBe(true);
    expect(gameRuns('play', true)).toBe(false);
  });
  it('stays stopped under any overlay even after turning back to landscape', () => {
    for (const s of ['pause', 'won', 'lost'] as const) expect(gameRuns(s, false)).toBe(false);
  });
});
