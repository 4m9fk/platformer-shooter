import Phaser from 'phaser';
import { createAnims, loadAtlas } from '../atlas';
import { GAME_H, GAME_W } from '../config';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const w = 400;
    this.add.rectangle(GAME_W / 2, GAME_H / 2, w + 8, 32).setStrokeStyle(3, 0xffffff);
    const bar = this.add.rectangle(GAME_W / 2 - w / 2, GAME_H / 2, 0, 24, 0xffffff).setOrigin(0, 0.5);
    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => (bar.width = w * p));
    this.load.setBaseURL(import.meta.env.BASE_URL);
    loadAtlas(this, 'hero');
    loadAtlas(this, 'zombie');
  }

  create() {
    createAnims(this, 'hero');
    createAnims(this, 'zombie');
    this.scene.start('Game');
  }
}
