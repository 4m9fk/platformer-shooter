import Phaser from 'phaser';
import { BLINK_TIME, CAMERA_LEAD, DEBRIS, FADE_TIME, FALL_MARGIN, GAME_H, GAME_W, PARALLAX, TILE } from '../config';
import { Bolt } from '../entities/Bolt';
import { Hero } from '../entities/Hero';
import { Zombie } from '../entities/Zombie';
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
  private bolts!: Phaser.Physics.Arcade.Group;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private zombies!: Phaser.Physics.Arcade.Group;
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
    this.bolts = this.physics.add.group({ allowGravity: false });
    this.sparks = this.add.particles(0, 0, 'spark', {
      speed: { min: 80, max: 260 },
      angle: { min: 0, max: 360 },
      lifespan: 350,
      scale: { start: 1, end: 0 },
      gravityY: 900,
      emitting: false,
    }).setDepth(5);
    this.hero.onFire = (x, y, dir) => this.fireBolt(x, y, dir);
    this.physics.add.overlap(this.bolts, this.solids, (b) => this.boltHit(b as Bolt));
    this.physics.add.overlap(this.bolts, this.crates, (b, c) => {
      if (!(b as Bolt).active) return;
      this.boltHit(b as Bolt);
      this.breakCrate(c as Phaser.Physics.Arcade.Sprite);
    });
    this.zombies = this.physics.add.group();
    for (const cell of this.level.zombies) {
      const z = new Zombie(this, ...this.feet(cell));
      this.zombies.add(z);
      z.setCollideWorldBounds(true); // after add(): the group applies its defaults on add
    }
    this.physics.add.collider(this.zombies, [this.solids, this.platforms, this.crates]);
    this.physics.add.overlap(this.hero, this.zombies, (_h, z) => this.touchZombie(z as Zombie));
    this.physics.add.overlap(this.bolts, this.zombies, (b, z) => {
      if (!(b as Bolt).active || (z as Zombie).mode === 'dying') return;
      this.boltHit(b as Bolt);
      this.killZombie(z as Zombie);
    });

    const cam = this.cameras.main;
    cam.setBounds(0, 0, worldW, worldH);
    cam.startFollow(this.hero, true, 0.12, 0.12);
    cam.fadeIn(FADE_TIME);
  }

  update(_time: number, delta: number) {
    this.hero.step(delta);
    for (const z of [...this.zombies.getChildren()] as Zombie[]) z.step(delta, this.grid, this.hero);
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

  private fireBolt(x: number, y: number, dir: 1 | -1) {
    const bolt = new Bolt(this, x, y);
    this.bolts.add(bolt);
    bolt.launch(dir);
  }

  private boltHit(bolt: Bolt) {
    if (!bolt.active) return; // already spent on something else this frame
    this.sparks.explode(10, bolt.x, bolt.y);
    bolt.destroy();
  }

  /** Crate is gone for good: from physics, from the patrol grid, in a burst of debris. */
  private breakCrate(crate: Phaser.Physics.Arcade.Sprite) {
    const cell = crate.getData('cell') as Cell;
    this.grid.removeCrate(cell.col, cell.row);
    for (let i = 0; i < DEBRIS; i++) {
      const d = this.physics.add.image(crate.x, crate.y, 'debris');
      d.setVelocity(Phaser.Math.Between(-220, 220), Phaser.Math.Between(-520, -220));
      d.setAngularVelocity(Phaser.Math.Between(-400, 400));
      this.tweens.add({ targets: d, alpha: 0, delay: 400, duration: 300, onComplete: () => d.destroy() });
    }
    crate.destroy();
  }

  /** Feet above the zombie's middle while falling = stomp; any other touch sends the hero back. */
  private touchZombie(z: Zombie) {
    if (this.hero.mode === 'frozen' || z.mode === 'dying') return;
    const hb = this.hero.body;
    if (hb.velocity.y > 0 && hb.bottom < z.body.center.y) {
      this.killZombie(z);
      this.hero.bounce();
    } else {
      this.killHero();
    }
  }

  private killZombie(z: Zombie) {
    z.die();
    this.registry.inc('kills', 1);
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
