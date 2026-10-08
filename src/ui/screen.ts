/** What covers the level: nothing, or one of the overlays. */
export type Screen = 'play' | 'pause' | 'won' | 'lost';

/** A result always wins; without one the pause holds until the player leaves it, anything else goes back to play. */
export function nextScreen(current: Screen, result: 'won' | 'lost' | null): Screen {
  return result ?? (current === 'pause' ? 'pause' : 'play');
}

/** The level runs only while nothing covers it: no overlay and no "turn the phone" screen. */
export function gameRuns(screen: Screen, portrait: boolean): boolean {
  return screen === 'play' && !portrait;
}
