import Phaser from 'phaser';
import { BUTTON_SIZE, BUTTON_SLOP, LIVES, STAR_DELAY } from '../config';
import type { Action, Intent } from '../input/Intent';
import { LEVELS } from '../levels/levels';
import { hudLayout } from '../ui/layout';
import { lockLandscape, watchOrientation } from '../ui/orientation';
import { gameRuns, nextScreen, type Screen } from '../ui/screen';
import { FONT, TEXT, gameInsets, makeOverlay, makeRotateOverlay, placeOverlay, type Overlay, type OverlayButton } from '../ui/widgets';

const HEART_STEP = 46;

/** Runs on top of 'Game' while a level is played. Reads the registry every frame instead of subscribing to events. */
export class UIScene extends Phaser.Scene {
  private intent!: Intent;
  private counter!: Phaser.GameObjects.Text;
  private hearts: Phaser.GameObjects.Image[] = [];
  private buttons: { action: Action; circle: Phaser.GameObjects.Arc; label: Phaser.GameObjects.Text }[] = [];
  private fullscreen?: Phaser.GameObjects.Text;
  private pauseButton!: Phaser.GameObjects.Image;
  private overlay?: Overlay;
  private rotate!: Overlay;
  private screen: Screen = 'play';
  private portrait = false;

  constructor() {
    super('UI');
  }

  create() {
    this.intent = this.registry.get('intent') as Intent;
    this.buttons = [];
    this.hearts = [];
    this.overlay = undefined;
    this.screen = 'play';
    this.portrait = false;
    this.counter = this.add.text(0, 0, '', { ...TEXT, fontSize: '30px' });
    for (let i = 0; i < LIVES; i++) this.hearts.push(this.add.image(0, 0, 'heart'));
    if ('ontouchstart' in window) this.addButtons();
    this.addFullscreenButton();
    this.pauseButton = this.add.image(0, 0, 'pause').setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.pauseButton.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.show('pause'));
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.rotate = makeRotateOverlay(this);
    this.layout();
    // Scale.EXPAND: the game width follows the screen, so everything tied to an edge moves on resize
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));

    // a finger lifted anywhere, even off its button, lets go of what it held
    const release = (p: Phaser.Input.Pointer) => this.intent.releasePointer(p.id);
    this.input.on(Phaser.Input.Events.POINTER_UP, release);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, release);
    this.input.once(Phaser.Input.Events.POINTER_DOWN, lockLandscape);

    watchOrientation(this, (portrait) => {
      this.portrait = portrait;
      this.rotate.container.setVisible(portrait);
      if (portrait) this.intent.clearPointers();
    });
  }

  update() {
    const screen = nextScreen(this.screen, this.registry.get('result') as 'won' | 'lost' | null);
    if (screen !== this.screen) this.show(screen);
    this.syncGame();
    this.counter.setText(`Зомби: ${this.registry.get('kills') ?? 0}/${this.registry.get('zombiesTotal') ?? 0}`);
    const lives = (this.registry.get('lives') as number | undefined) ?? LIVES;
    this.hearts.forEach((h, i) => h.setAlpha(i < lives ? 1 : 0.25));
    for (const b of this.buttons) b.circle.setFillStyle(0xffffff, this.intent.held(b.action) ? 0.5 : 0.25);
  }

  /** Pause or resume 'Game' to match what covers it; checked every frame, so a late start or a rotation is caught too. */
  private syncGame() {
    const run = gameRuns(this.screen, this.portrait);
    if (run && this.scene.isPaused('Game')) this.scene.resume('Game');
    if (!run && this.scene.isActive('Game')) this.scene.pause('Game');
  }

  private togglePause() {
    if (this.screen === 'play') this.show('pause');
    else if (this.screen === 'pause') this.show('play');
  }

  /** Swaps the overlay. The old one is destroyed at once, so a second tap on its button finds nothing. */
  private show(screen: Screen) {
    this.screen = screen;
    this.overlay?.container.destroy();
    this.overlay = undefined;
    this.intent.clearPointers();
    const playing = screen === 'play';
    for (const b of this.buttons) {
      b.circle.setVisible(playing);
      b.label.setVisible(playing);
    }
    this.pauseButton.setVisible(playing);
    const index = this.registry.get('levelIndex') as number;
    const again: OverlayButton = { label: 'Заново', onClick: () => this.playLevel(index) };
    const menu: OverlayButton = { label: 'В меню', onClick: () => this.toMenu() };
    if (screen === 'pause') this.overlay = makeOverlay(this, 'Пауза', [{ label: 'Продолжить', onClick: () => this.show('play') }, again, menu]);
    if (screen === 'lost') this.overlay = makeOverlay(this, 'Попробуй ещё раз', [again, menu]);
    if (screen === 'won') this.overlay = this.makeWin(index, again, menu);
    this.layout();
  }

  private makeWin(index: number, again: OverlayButton, menu: OverlayButton): Overlay {
    const last = index === LEVELS.length - 1;
    const next: OverlayButton[] = last ? [] : [{ label: 'Дальше', onClick: () => this.playLevel(index + 1) }];
    const o = makeOverlay(this, last ? 'Все уровни пройдены!' : 'Победа!', [...next, again, menu]);
    const stars = this.registry.get('stars') as number;
    for (let s = 0; s < 3; s++) {
      const star = this.add.image((s - 1) * 100, -20, s < stars ? 'star' : 'star-empty').setScale(0);
      o.container.add(star);
      this.tweens.add({ targets: star, scale: 1, delay: STAR_DELAY * (s + 1), duration: 250, ease: 'Back.easeOut' });
    }
    return o;
  }

  /** Clears the result first: until 'Game' restarts, update() would otherwise bring the old overlay back. */
  private playLevel(index: number) {
    this.registry.set('result', null);
    this.show('play');
    this.scene.get('Game').scene.restart({ level: index });
  }

  private toMenu() {
    this.scene.stop('Game');
    this.scene.start('Menu');
  }

  /** Puts every edge-bound object where hudLayout says for the current game size. */
  private layout() {
    const { width, height } = this.scale;
    const l = hudLayout(width, height, gameInsets(this));
    this.counter.setPosition(l.counter.x, l.counter.y);
    this.hearts.forEach((h, i) => h.setPosition(l.lives.x + i * HEART_STEP, l.lives.y));
    for (const b of this.buttons) {
      const p = l.buttons[b.action];
      b.circle.setPosition(p.x, p.y);
      b.label.setPosition(p.x, p.y);
    }
    this.fullscreen?.setPosition(l.fullscreen.x, l.fullscreen.y);
    this.pauseButton.setPosition(l.pause.x, l.pause.y);
    if (this.overlay) placeOverlay(this.overlay, width, height);
    placeOverlay(this.rotate, width, height);
  }

  private addButtons() {
    const r = BUTTON_SIZE / 2;
    const labels: [Action, string][] = [['left', '←'], ['right', '→'], ['shoot', '✹'], ['jump', '↑']];
    for (const [action, text] of labels) {
      const circle = this.add.circle(0, 0, r, 0xffffff, 0.25).setStrokeStyle(4, 0xffffff, 0.6);
      // hit area in the shape's local space (origin at its top-left), BUTTON_SLOP wider than the drawing
      circle.setInteractive(new Phaser.Geom.Circle(r, r, r + BUTTON_SLOP), Phaser.Geom.Circle.Contains);
      circle.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, (p: Phaser.Input.Pointer) => this.intent.pressPointer(p.id, action));
      circle.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, (p: Phaser.Input.Pointer) => this.intent.releasePointer(p.id));
      // a thumb rolled from one button onto another presses the new one, like a D-pad
      circle.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, (p: Phaser.Input.Pointer) => {
        if (p.isDown) this.intent.pressPointer(p.id, action);
      });
      const label = this.add.text(0, 0, text, { fontFamily: FONT, fontSize: '52px', color: '#ffffff' }).setOrigin(0.5).setAlpha(0.9);
      this.buttons.push({ action, circle, label });
    }
  }

  private addFullscreenButton() {
    if (!this.sys.game.device.fullscreen.available) return;
    const b = this.add.text(0, 0, '⛶', { ...TEXT, fontSize: '40px' }).setOrigin(1, 0);
    this.fullscreen = b;
    b.setInteractive({ useHandCursor: true });
    // fullscreen must start from pointerup: browsers allow it only inside a user gesture
    b.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () =>
      this.scale.isFullscreen ? this.scale.stopFullscreen() : this.scale.startFullscreen());
  }
}
