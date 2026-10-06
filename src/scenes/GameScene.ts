import Phaser from 'phaser';
import { GAME_H } from '../config';
import { Hero } from '../entities/Hero';
import type { Intent } from '../input/Intent';

const WORLD_W = 3000;
const GROUND_Y = 480;

/** Temporary: flat ground to tune the hero. Replaced by the level in Task 6. */
export class GameScene extends Phaser.Scene {
  private hero!: Hero;

  constructor() {
    super('Game');
  }

  create() {
    const ground = this.add.rectangle(0, GROUND_Y, WORLD_W, GAME_H - GROUND_Y, 0x8a5a2b).setOrigin(0);
    this.physics.add.existing(ground, true);
    this.physics.world.setBounds(0, 0, WORLD_W, GAME_H);
    this.hero = new Hero(this, 200, GROUND_Y, this.registry.get('intent') as Intent);
    this.hero.setCollideWorldBounds(true);
    this.physics.add.collider(this.hero, ground);
    this.hero.onFire = (x, y) => {
      const dot = this.add.circle(x, y, 6, 0x66ccff);
      this.tweens.add({ targets: dot, alpha: 0, duration: 400, onComplete: () => dot.destroy() });
    };
    this.cameras.main.setBounds(0, 0, WORLD_W, GAME_H).startFollow(this.hero, true, 0.12, 0.12);
  }

  update(_time: number, delta: number) {
    this.hero.step(delta);
  }
}
