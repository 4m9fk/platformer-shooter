import Phaser from 'phaser';
import { GAME_H, GAME_W } from '../config';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.add.text(GAME_W / 2, GAME_H / 2, 'Platformer Shooter', { fontSize: '48px', color: '#ffffff' }).setOrigin(0.5);
  }
}
