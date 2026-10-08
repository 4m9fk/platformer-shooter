import Phaser from 'phaser';

export const isPortrait = () => window.innerHeight > window.innerWidth;

/** Calls onChange now and after every resize or rotation, until the scene shuts down. */
export function watchOrientation(scene: Phaser.Scene, onChange: (portrait: boolean) => void) {
  const check = () => onChange(isPortrait());
  window.addEventListener('resize', check);
  window.addEventListener('orientationchange', check);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    window.removeEventListener('resize', check);
    window.removeEventListener('orientationchange', check);
  });
  check();
}

/** Best effort: most browsers allow it only in fullscreen or an installed app, and say no otherwise. */
export function lockLandscape() {
  try {
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    orientation.lock?.('landscape').catch(() => {});
  } catch {
    // no Screen Orientation API
  }
}
