import Phaser from 'phaser';
import { BUTTON_MARGIN, BUTTON_SIZE, BUTTON_SLOP, GAME_H, GAME_W } from '../config';
import type { Action, Intent } from '../input/Intent';

const FONT = 'system-ui, -apple-system, sans-serif';
const TEXT = { fontFamily: FONT, color: '#ffffff', stroke: '#1d2b3a', strokeThickness: 6 };

/** Runs on top of 'Game' for the whole session. Reads the registry every frame instead of subscribing to events. */
export class UIScene extends Phaser.Scene {
  private intent!: Intent;
  private counter!: Phaser.GameObjects.Text;
  private buttons: { action: Action; circle: Phaser.GameObjects.Arc }[] = [];
  private win!: Phaser.GameObjects.Container;
  private winText!: Phaser.GameObjects.Text;
  private rotate!: Phaser.GameObjects.Container;

  constructor() {
    super('UI');
  }

  create() {
    this.intent = this.registry.get('intent') as Intent;
    this.buttons = [];
    this.counter = this.add.text(BUTTON_MARGIN, 16, '', { ...TEXT, fontSize: '30px' });
    if ('ontouchstart' in window) this.addButtons();
    this.addFullscreenButton();
    this.win = this.makeWinScreen();
    this.rotate = this.makeRotateOverlay();

    // a finger lifted anywhere, even off its button, lets go of what it held
    const release = (p: Phaser.Input.Pointer) => this.intent.releasePointer(p.id);
    this.input.on(Phaser.Input.Events.POINTER_UP, release);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, release);
    this.input.once(Phaser.Input.Events.POINTER_DOWN, lockLandscape);

    const check = () => this.checkOrientation();
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    });
    check();
  }

  update() {
    const kills = this.registry.get('kills') ?? 0;
    const total = this.registry.get('zombiesTotal') ?? 0;
    this.counter.setText(`Зомби: ${kills}/${total}`);
    const won = this.registry.get('won') === true;
    this.win.setVisible(won);
    if (won) this.winText.setText(`Победа!\nЗомби: ${kills} из ${total}`);
    for (const b of this.buttons) b.circle.setFillStyle(0xffffff, this.intent.held(b.action) ? 0.5 : 0.25);
  }

  private addButtons() {
    const r = BUTTON_SIZE / 2;
    const m = BUTTON_MARGIN;
    const low = GAME_H - m - r;
    const defs: [Action, string, number, number][] = [
      ['left', '←', m + r, low],
      ['right', '→', 2 * m + 3 * r, low],
      ['shoot', '✹', GAME_W - m - r, low],
      ['jump', '↑', GAME_W - m - r, low - BUTTON_SIZE - m],
    ];
    for (const [action, label, x, y] of defs) {
      const circle = this.add.circle(x, y, r, 0xffffff, 0.25).setStrokeStyle(4, 0xffffff, 0.6);
      // hit area in the shape's local space (origin at its top-left), BUTTON_SLOP wider than the drawing
      circle.setInteractive(new Phaser.Geom.Circle(r, r, r + BUTTON_SLOP), Phaser.Geom.Circle.Contains);
      circle.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer) => this.intent.pressPointer(p.id, action));
      circle.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, (p: Phaser.Input.Pointer) => this.intent.releasePointer(p.id));
      this.add.text(x, y, label, { fontFamily: FONT, fontSize: '52px', color: '#ffffff' }).setOrigin(0.5).setAlpha(0.9);
      this.buttons.push({ action, circle });
    }
  }

  private addFullscreenButton() {
    if (!this.sys.game.device.fullscreen.available) return;
    const b = this.add.text(GAME_W - BUTTON_MARGIN, 12, '⛶', { ...TEXT, fontSize: '40px' }).setOrigin(1, 0);
    b.setInteractive({ useHandCursor: true });
    // fullscreen must start from pointerup: browsers allow it only inside a user gesture
    b.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () =>
      this.scale.isFullscreen ? this.scale.stopFullscreen() : this.scale.startFullscreen());
  }

  private makeWinScreen() {
    const shade = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x000000, 0.55).setOrigin(0).setInteractive();
    this.winText = this.add.text(GAME_W / 2, GAME_H / 2 - 70, '', { ...TEXT, fontSize: '56px', align: 'center' }).setOrigin(0.5);
    const button = this.add.rectangle(GAME_W / 2, GAME_H / 2 + 90, 300, 84, 0x58b947).setStrokeStyle(5, 0xffffff);
    const label = this.add.text(button.x, button.y, 'Ещё раз', { ...TEXT, fontSize: '40px' }).setOrigin(0.5);
    button.setInteractive({ useHandCursor: true });
    button.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      this.registry.set('won', false);
      this.intent.clearPointers();
      this.scene.get('Game').scene.restart();
    });
    return this.add.container(0, 0, [shade, this.winText, button, label]).setDepth(10).setVisible(false);
  }

  private makeRotateOverlay() {
    const shade = this.add.rectangle(0, 0, GAME_W, GAME_H, 0x1d2b3a, 0.95).setOrigin(0).setInteractive();
    const text = this.add.text(GAME_W / 2, GAME_H / 2, '↻\nПоверни телефон', { ...TEXT, fontSize: '64px', align: 'center' }).setOrigin(0.5);
    return this.add.container(0, 0, [shade, text]).setDepth(20).setVisible(false);
  }

  private checkOrientation() {
    const portrait = window.innerHeight > window.innerWidth;
    this.rotate.setVisible(portrait);
    if (portrait) {
      this.intent.clearPointers();
      if (this.scene.isActive('Game')) this.scene.pause('Game');
    } else if (this.scene.isPaused('Game')) {
      this.scene.resume('Game');
    }
  }
}

/** Best effort: most browsers allow it only in fullscreen or an installed app, and say no otherwise. */
function lockLandscape() {
  try {
    const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    orientation.lock?.('landscape').catch(() => {});
  } catch {
    // no Screen Orientation API
  }
}
