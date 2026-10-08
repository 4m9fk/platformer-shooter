import Phaser from 'phaser';
import { BUTTON_SIZE, BUTTON_SLOP } from '../config';
import type { Action, Intent } from '../input/Intent';
import { hudLayout } from '../ui/layout';
import { lockLandscape, watchOrientation } from '../ui/orientation';
import { FONT, TEXT, gameInsets, makeRotateOverlay, placeOverlay, type Overlay } from '../ui/widgets';

/** Runs on top of 'Game' for the whole session. Reads the registry every frame instead of subscribing to events. */
export class UIScene extends Phaser.Scene {
  private intent!: Intent;
  private counter!: Phaser.GameObjects.Text;
  private buttons: { action: Action; circle: Phaser.GameObjects.Arc; label: Phaser.GameObjects.Text }[] = [];
  private fullscreen?: Phaser.GameObjects.Text;
  private win!: Phaser.GameObjects.Container;
  private winShade!: Phaser.GameObjects.Rectangle;
  private winText!: Phaser.GameObjects.Text;
  private rotate!: Overlay;

  constructor() {
    super('UI');
  }

  create() {
    this.intent = this.registry.get('intent') as Intent;
    this.buttons = [];
    this.counter = this.add.text(0, 0, '', { ...TEXT, fontSize: '30px' });
    if ('ontouchstart' in window) this.addButtons();
    this.addFullscreenButton();
    this.win = this.makeWinScreen();
    this.rotate = makeRotateOverlay(this);
    this.layout();
    // Scale.EXPAND: the game width follows the screen, so everything tied to an edge moves on resize
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);

    // a finger lifted anywhere, even off its button, lets go of what it held
    const release = (p: Phaser.Input.Pointer) => this.intent.releasePointer(p.id);
    this.input.on(Phaser.Input.Events.POINTER_UP, release);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, release);
    this.input.once(Phaser.Input.Events.POINTER_DOWN, lockLandscape);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
    watchOrientation(this, (portrait) => {
      this.rotate.container.setVisible(portrait);
      if (portrait) {
        this.intent.clearPointers();
        if (this.scene.isActive('Game')) this.scene.pause('Game');
      } else if (this.scene.isPaused('Game')) {
        this.scene.resume('Game');
      }
    });
  }

  update() {
    const kills = this.registry.get('kills') ?? 0;
    const total = this.registry.get('zombiesTotal') ?? 0;
    const lives = this.registry.get('lives') ?? 0;
    this.counter.setText(`Зомби: ${kills}/${total}   Жизни: ${lives}`);
    const result = this.registry.get('result') as 'won' | 'lost' | null;
    this.win.setVisible(result !== null);
    if (result === 'won') this.winText.setText(`Победа!\nЗвёзды: ${this.registry.get('stars')}`);
    if (result === 'lost') this.winText.setText('Попробуй ещё раз');
    for (const b of this.buttons) b.circle.setFillStyle(0xffffff, this.intent.held(b.action) ? 0.5 : 0.25);
  }

  /** Puts every edge-bound object where hudLayout says for the current game size. */
  private layout() {
    const { width, height } = this.scale;
    const l = hudLayout(width, height, gameInsets(this));
    this.counter.setPosition(l.counter.x, l.counter.y);
    for (const b of this.buttons) {
      const p = l.buttons[b.action];
      b.circle.setPosition(p.x, p.y);
      b.label.setPosition(p.x, p.y);
    }
    this.fullscreen?.setPosition(l.fullscreen.x, l.fullscreen.y);
    this.win.setPosition(l.center.x, l.center.y);
    this.winShade.setSize(width, height);
    this.winShade.input?.hitArea.setSize(width, height);
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

  private makeWinScreen() {
    // children are laid out around (0, 0); layout() moves the container to the screen centre
    this.winShade = this.add.rectangle(0, 0, 1, 1, 0x000000, 0.55).setInteractive();
    this.winText = this.add.text(0, -70, '', { ...TEXT, fontSize: '56px', align: 'center' }).setOrigin(0.5);
    const button = this.add.rectangle(0, 90, 300, 84, 0x58b947).setStrokeStyle(5, 0xffffff);
    const label = this.add.text(button.x, button.y, 'Ещё раз', { ...TEXT, fontSize: '40px' }).setOrigin(0.5);
    button.setInteractive({ useHandCursor: true });
    button.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      this.registry.set('result', null);
      this.intent.clearPointers();
      this.scene.get('Game').scene.restart({ level: this.registry.get('levelIndex') });
    });
    return this.add.container(0, 0, [this.winShade, this.winText, button, label]).setDepth(10).setVisible(false);
  }
}
