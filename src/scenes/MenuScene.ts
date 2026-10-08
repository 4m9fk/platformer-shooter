import Phaser from 'phaser';
import { GAME_W } from '../config';
import { isUnlocked, loadProgress, safeStorage, type Progress } from '../game/progress';
import { LEVELS } from '../levels/levels';
import { makeBackdrop } from '../textures/placeholders';
import { menuLayout } from '../ui/layout';
import { lockLandscape, watchOrientation } from '../ui/orientation';
import { TEXT, gameInsets, makeRotateOverlay, placeOverlay, type Overlay } from '../ui/widgets';

/** Title and one tile per level: number and best stars when open, a lock otherwise. */
export class MenuScene extends Phaser.Scene {
  private sky!: Phaser.GameObjects.Image;
  private layers: Phaser.GameObjects.TileSprite[] = [];
  private title!: Phaser.GameObjects.Text;
  private tiles: Phaser.GameObjects.Container[] = [];
  private rotate!: Overlay;
  private starting = false;

  constructor() {
    super('Menu');
  }

  create() {
    this.tiles = [];
    this.starting = false;
    const theme = LEVELS[0].theme;
    makeBackdrop(this, theme);
    this.sky = this.add.image(0, 0, `sky-${theme.key}`).setOrigin(0);
    this.layers = [
      this.add.tileSprite(0, 0, GAME_W, 260, 'clouds'),
      this.add.tileSprite(0, 0, GAME_W, 260, `hills-far-${theme.key}`),
      this.add.tileSprite(0, 0, GAME_W, 200, `hills-near-${theme.key}`),
    ].map((layer) => layer.setOrigin(0));
    this.title = this.add.text(0, 0, 'Platformer Shooter', { ...TEXT, fontSize: '64px' }).setOrigin(0.5);
    const progress = loadProgress(safeStorage());
    LEVELS.forEach((_, i) => this.tiles.push(this.makeTile(i, progress)));
    this.rotate = makeRotateOverlay(this);

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this));
    this.input.once(Phaser.Input.Events.POINTER_DOWN, lockLandscape);
    watchOrientation(this, (portrait) => this.rotate.container.setVisible(portrait));
  }

  private makeTile(i: number, progress: Progress) {
    const open = isUnlocked(progress, LEVELS, i);
    const stars = progress.stars[LEVELS[i].id] ?? 0;
    const bg = this.add.image(0, 0, open ? 'tile-open' : 'tile-locked');
    const mark = open
      ? this.add.text(0, -14, String(i + 1), { ...TEXT, fontSize: '60px' }).setOrigin(0.5)
      : this.add.image(0, -12, 'lock');
    const row = [0, 1, 2].map((s) => this.add.image((s - 1) * 36, 44, s < stars ? 'star' : 'star-empty').setScale(0.4));
    if (open) {
      bg.setInteractive({ useHandCursor: true });
      bg.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => this.play(i));
    }
    return this.add.container(0, 0, [bg, mark, ...row]);
  }

  /** A second tap before the scenes switch would start the level and its UI twice. */
  private play(i: number) {
    if (this.starting) return;
    this.starting = true;
    this.scene.start('Game', { level: i });
    this.scene.launch('UI');
  }

  private layout() {
    const { width, height } = this.scale;
    const l = menuLayout(width, height, LEVELS.length, gameInsets(this));
    this.sky.setDisplaySize(width, height);
    const [clouds, far, near] = this.layers;
    clouds.setSize(width, 260);
    far.setSize(width, 260).setY(height - 260);
    near.setSize(width, 200).setY(height - 200);
    this.title.setPosition(l.title.x, l.title.y);
    this.tiles.forEach((t, i) => t.setPosition(l.tiles[i].x, l.tiles[i].y).setScale(l.tileScale));
    placeOverlay(this.rotate, width, height);
  }
}
