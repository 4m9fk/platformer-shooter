import Phaser from 'phaser';
import { BOLT_LIFE, BOLT_SPEED } from '../config';

/** Blaster shot: flies straight, gone after BOLT_LIFE or on the first hit. */
export class Bolt extends Phaser.Physics.Arcade.Image {
  declare body: Phaser.Physics.Arcade.Body;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'bolt');
    scene.add.existing(this);
  }

  /** After group.add(): the group resets velocity to its defaults when a child is added. */
  launch(dir: 1 | -1) {
    this.setFlipX(dir < 0);
    this.setVelocityX(dir * BOLT_SPEED);
    this.scene.time.delayedCall(BOLT_LIFE, () => this.active && this.destroy());
  }
}
