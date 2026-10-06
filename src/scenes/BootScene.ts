import Phaser from 'phaser';
import { createAnims, loadAtlas } from '../atlas';
import { makeTextures } from '../textures/placeholders';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const w = 400;
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;
    this.add.rectangle(cx, cy, w + 8, 32).setStrokeStyle(3, 0xffffff);
    const bar = this.add.rectangle(cx - w / 2, cy, 0, 24, 0xffffff).setOrigin(0, 0.5);
    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => (bar.width = w * p));
    this.load.setBaseURL(import.meta.env.BASE_URL);
    loadAtlas(this, 'hero');
    loadAtlas(this, 'zombie');
  }

  create() {
    makeTextures(this);
    createAnims(this, 'hero');
    createAnims(this, 'zombie');
    this.scene.start('Game');
    this.scene.launch('UI');
  }
}
