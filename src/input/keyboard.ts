import type { Action, Intent } from './Intent';

const KEYS: Record<string, Action> = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', KeyW: 'jump',
  Space: 'shoot',
};

/** Feeds DOM key events into the Intent. A lost focus releases everything: keyup would never come. */
export function bindKeyboard(intent: Intent): () => void {
  const down = (e: KeyboardEvent) => {
    const action = KEYS[e.code];
    if (!action) return;
    e.preventDefault();
    if (!e.repeat) intent.pressKey(e.code, action);
  };
  const up = (e: KeyboardEvent) => {
    if (KEYS[e.code]) intent.releaseKey(e.code);
  };
  const lost = () => {
    intent.clearKeyboard();
    intent.clearPointers();
  };
  const hidden = () => {
    if (document.hidden) lost();
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', lost);
  document.addEventListener('visibilitychange', hidden);
  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    window.removeEventListener('blur', lost);
    document.removeEventListener('visibilitychange', hidden);
  };
}
