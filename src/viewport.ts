import type { Insets } from './ui/layout';

const SIDES = ['top', 'right', 'bottom', 'left'] as const;
let probe: HTMLElement | undefined;

/** The visible size in CSS pixels. iOS standalone apps disagree with it on 100vh/100dvh, so it is read from JS. */
export function viewportSize() {
  const vv = window.visualViewport;
  return { width: Math.round(vv?.width ?? window.innerWidth), height: Math.round(vv?.height ?? window.innerHeight) };
}

/** env(safe-area-inset-*) in CSS pixels, read through a hidden element because JS has no direct access. */
export function safeAreaInsets(): Insets {
  if (!probe) {
    probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;visibility:hidden;pointer-events:none;' +
      SIDES.map((s) => `padding-${s}:env(safe-area-inset-${s})`).join(';');
    document.body.append(probe);
  }
  const cs = getComputedStyle(probe);
  const px = (s: (typeof SIDES)[number]) => parseFloat(cs.getPropertyValue(`padding-${s}`)) || 0;
  return { top: px('top'), right: px('right'), bottom: px('bottom'), left: px('left') };
}

/**
 * Sizes the game's parent to the visible viewport in pixels, now and on every resize or rotation, and then calls
 * onResize (Phaser re-fit). Call before creating the game so Phaser boots with the right size.
 */
export function fitToViewport(parent: HTMLElement, onResize: () => void) {
  const apply = () => {
    const { width, height } = viewportSize();
    parent.style.width = `${width}px`;
    parent.style.height = `${height}px`;
    onResize();
  };
  // iOS reports the new size a moment after orientationchange, so measure again shortly after
  const applySoon = () => {
    apply();
    setTimeout(apply, 300);
  };
  window.addEventListener('resize', apply);
  window.addEventListener('orientationchange', applySoon);
  window.visualViewport?.addEventListener('resize', apply);
  apply();
}
