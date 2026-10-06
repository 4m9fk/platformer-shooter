import Phaser from 'phaser';
import { BLINK_TIME, CAMERA_LEAD, FADE_TIME, FALL_MARGIN, GAME_H, GAME_W, PARALLAX, TILE } from '../config';
import { Hero } from '../entities/Hero';
import type { Intent } from '../input/Intent';
import { Grid } from '../levels/grid';
import { LEVEL1 } from '../levels/level1';
import { Cell, Level, parseLevel } from '../levels/parse';

export class GameScene extends Phaser.Scene {
  private level!: Level;
  private grid!: Grid;
  private hero!: Hero;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private crates!: Phaser.Physics.Arcade.StaticGroup;
  private flag!: Phaser.Physics.Arcade.Image;
  private layers: Phaser.GameObjects.TileSprite[] = [];
  private respawning = false;

  constructor() {
    super('Game');
  }

  /** The scene object survives restart(): reset every field that create() does not overwrite. */
  init() {
    this.layers = [];
    this.respawning = false;
  }

  create() {
    this.level = parseLevel(LEVEL1);
    this.grid = new Grid(this.level);
    this.registry.set({ kills: 0, won: false, zombiesTotal: this.level.zombies.length });
    const worldW = this.level.width * TILE;
    const worldH = this.level.height * TILE;
    this.physics.world.setBounds(0, 0, worldW, worldH);
    this.physics.world.setBoundsCollision(true, true, false, false); // pits stay open at the bottom

    this.addBackground();
    this.addTiles();

    this.hero = new Hero(this, ...this.feet(this.level.start), this.registry.get('intent') as Intent);
    this.hero.setCollideWorldBounds(true);
    this.physics.add.collider(this.hero, [this.solids, this.platforms, this.crates]);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldW, worldH);
    cam.startFollow(this.hero, true, 0.12, 0.12);
    cam.fadeIn(FADE_TIME);
  }

  update(_time: number, delta: number) {
    this.hero.step(delta);
    const cam = this.cameras.main;
    // followOffset is subtracted from the target, so a negative x looks ahead to the right
    const lead = this.hero.facing > 0 ? -CAMERA_LEAD : CAMERA_LEAD;
    cam.followOffset.x += (lead - cam.followOffset.x) * Math.min(1, delta / 400);
    this.layers.forEach((layer, i) => (layer.tilePositionX = cam.scrollX * PARALLAX[i]));
    if (this.hero.y > this.level.height * TILE + FALL_MARGIN) this.killHero();
  }

  /** World point between the feet of something standing in this cell. */
  private feet(cell: Cell): [number, number] {
    return [(cell.col + 0.5) * TILE, (cell.row + 1) * TILE];
  }

  private addBackground() {
    this.add.image(0, 0, 'sky').setOrigin(0).setScrollFactor(0).setDisplaySize(GAME_W, GAME_H);
    this.layers = [
      this.add.tileSprite(0, 0, GAME_W, 260, 'clouds'),
      this.add.tileSprite(0, GAME_H - 260, GAME_W, 260, 'hills-far'),
      this.add.tileSprite(0, GAME_H - 200, GAME_W, 200, 'hills-near'),
    ].map((layer) => layer.setOrigin(0).setScrollFactor(0));
  }

  private addTiles() {
    this.solids = this.physics.add.staticGroup();
    this.platforms = this.physics.add.staticGroup();
    this.crates = this.physics.add.staticGroup();
    for (const c of this.level.solids) {
      const key = this.grid.tileAt(c.col, c.row - 1) === '#' ? 'ground' : 'ground-top';
      this.solids.create((c.col + 0.5) * TILE, (c.row + 0.5) * TILE, key);
    }
    for (const c of this.level.platforms) {
      const p = this.platforms.create((c.col + 0.5) * TILE, c.row * TILE + 10, 'platform') as Phaser.Physics.Arcade.Sprite;
      const body = p.body as Phaser.Physics.Arcade.StaticBody;
      // one-way: only the top face collides, so you can jump through from below and walk through from the side
      body.checkCollision.down = false;
      body.checkCollision.left = false;
      body.checkCollision.right = false;
    }
    for (const c of this.level.crates) {
      const crate = this.crates.create((c.col + 0.5) * TILE, (c.row + 0.5) * TILE, 'crate') as Phaser.Physics.Arcade.Sprite;
      crate.setData('cell', c);
    }
    const [fx, fy] = this.feet(this.level.flag);
    this.flag = this.physics.add.staticImage(fx, fy, 'flag').setOrigin(0.5, 1).refreshBody();
  }

  /** Blink, fade to black, back to the start. Zombies and crates stay as they are. */
  private killHero() {
    if (this.respawning) return;
    this.respawning = true;
    this.hero.die();
    this.tweens.add({
      targets: this.hero,
      alpha: 0.2,
      duration: BLINK_TIME / 6,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        const cam = this.cameras.main;
        cam.fadeOut(FADE_TIME, 0, 0, 0);
        cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
          this.hero.respawn(...this.feet(this.level.start));
          cam.fadeIn(FADE_TIME);
          this.respawning = false;
        });
      },
    });
  }
}
