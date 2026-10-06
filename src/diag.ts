// TEMPORARY: prints the real viewport numbers on screen to debug the iPhone PWA crop. Remove after the fix.
import type Phaser from 'phaser';

const SAFE = ['top', 'right', 'bottom', 'left'] as const;

export function showDiagnostics(game: Phaser.Game) {
  const box = document.createElement('div');
  box.style.cssText =
    'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9;pointer-events:none;' +
    'font:12px/1.35 ui-monospace,monospace;color:#fff;background:rgba(0,0,0,.7);padding:6px 8px;white-space:pre';
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;visibility:hidden;' + SAFE.map((s) => `padding-${s}:env(safe-area-inset-${s})`).join(';');
  document.body.append(box, probe);
  const r = (el: Element | null) => {
    const b = el?.getBoundingClientRect();
    return b ? `${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.width)}x${Math.round(b.height)}` : '-';
  };
  const update = () => {
    const vv = window.visualViewport;
    const cs = getComputedStyle(probe);
    box.textContent = [
      `standalone ${matchMedia('(display-mode: standalone)').matches} ${screen.orientation?.type ?? ''}`,
      `inner ${innerWidth}x${innerHeight}  client ${document.documentElement.clientWidth}x${document.documentElement.clientHeight}`,
      `visual ${vv ? `${Math.round(vv.width)}x${Math.round(vv.height)} top ${Math.round(vv.offsetTop)}` : '-'}`,
      `screen ${screen.width}x${screen.height}  dpr ${devicePixelRatio}`,
      `safe ${SAFE.map((s) => cs.getPropertyValue(`padding-${s}`)).join(' ')}`,
      `#game ${r(document.getElementById('game'))}`,
      `canvas ${r(game.canvas)}`,
      `phaser ${Math.round(game.scale.width)}x${Math.round(game.scale.height)}`,
    ].join('\n');
  };
  update();
  addEventListener('resize', update);
  game.scale.on('resize', update);
  setInterval(update, 1000);
}
