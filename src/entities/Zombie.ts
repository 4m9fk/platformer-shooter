import Phaser from 'phaser';
import { AtlasGame, applyAnchor, atlasGame, fitBody } from '../atlas';
import { ATTACK_COOLDOWN, ATTACK_RANGE, HERO_SCALE, TILE, ZOMBIE_SPEED } from '../config';
import type { Grid } from '../levels/grid';
import type { Hero } from './Hero';
import { Dir, nextDirection } from './patrol';

export type ZombieMode = 'walk' | 'attack' | 'dying';

/** Walks its floor back and forth, lunges at a close hero (animation only), dies from a bolt or a stomp. */
export class Zombie extends Phaser.Physics.Arcade.Sprite {
  declare body: Phaser.Physics.Arcade.Body;
  mode: ZombieMode = 'walk';
  dir: Dir = 1;
  private cooldown = 0;
  private anim = 'walk';
  private readonly meta: AtlasGame;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'zombie', 'walk_0');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.meta = atlasGame(scene, 'zombie');
    this.setScale(HERO_SCALE);
    this.setAnim('walk');
    this.face(-1); // dir starts at 1, so this flips, anchors and fits the body; faces the hero coming from the left
  }

  step(delta: number, grid: Grid, hero: Hero) {
    if (this.mode === 'dying') return;
    if (this.mode === 'attack') {
      this.setVelocityX(0);
      if (!this.anims.isPlaying) {
        this.mode = 'walk';
        this.cooldown = ATTACK_COOLDOWN;
        this.setAnim('walk');
      }
      return;
    }
    this.cooldown = Math.max(0, this.cooldown - delta);
    if (this.cooldown === 0 && hero.mode !== 'frozen' &&
        Math.abs(hero.x - this.x) < ATTACK_RANGE && Math.abs(hero.y - this.y) < TILE / 2) {
      this.face(hero.x >= this.x ? 1 : -1);
      this.mode = 'attack';
      this.setVelocityX(0);
      this.setAnim('attack');
      return;
    }
    const b = this.body;
    if (!(b.blocked.down || b.touching.down)) return; // spawning or falling: let gravity settle it
    const col = Math.floor((this.dir > 0 ? b.right + 1 : b.left - 1) / TILE);
    const row = Math.floor((b.bottom - 1) / TILE); // the row the feet are in
    this.face(nextDirection(this.dir, grid.isBlocking(col, row), grid.isGround(col, row + 1)));
    this.setVelocityX(this.dir * ZOMBIE_SPEED);
  }

  /** Hit frames 0–2, then fade out. The body goes away at once so nothing touches it again. */
  die() {
    this.mode = 'dying';
    this.setVelocity(0, 0);
    this.body.enable = false;
    this.setAnim('hit');
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () =>
      this.scene.tweens.add({ targets: this, alpha: 0, duration: 150, onComplete: () => this.destroy() }));
  }

  /** Animations may have their own cell (hit is taller), so the anchor follows the animation. */
  private setAnim(name: string) {
    this.anim = name;
    this.play(`zombie-${name}`);
    applyAnchor(this, this.meta.anims[name]);
  }

  private face(dir: Dir) {
    if (dir === this.dir) return;
    this.dir = dir;
    this.setFlipX(dir < 0);
    applyAnchor(this, this.meta.anims[this.anim]);
    fitBody(this, this.meta);
  }
}
