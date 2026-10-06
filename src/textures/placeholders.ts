import Phaser from 'phaser';
import { GAME_H, GAME_W, SKY_BOTTOM, SKY_TOP, TILE } from '../config';

/** Every non-character texture, drawn once. To reskin an object, replace its function with a PNG load. */
export function makeTextures(scene: Phaser.Scene) {
  makeSky(scene);
  makeClouds(scene);
  makeHills(scene, 'hills-far', 260, 0x8fd18a, 60, 2);
  makeHills(scene, 'hills-near', 200, 0x5fb35a, 45, 3);
  makeGround(scene, 'ground', false);
  makeGround(scene, 'ground-top', true);
  makePlatform(scene);
  makeCrate(scene);
  makeFlag(scene);
  makeBolt(scene);
  makeSpark(scene);
  makeDebris(scene);
}

const css = (c: number) => '#' + c.toString(16).padStart(6, '0');

function draw(scene: Phaser.Scene, key: string, w: number, h: number, paint: (g: Phaser.GameObjects.Graphics) => void) {
  const g = scene.make.graphics({}, false);
  paint(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

function makeSky(scene: Phaser.Scene) {
  const tex = scene.textures.createCanvas('sky', 4, GAME_H)!;
  const ctx = tex.getContext();
  const grad = ctx.createLinearGradient(0, 0, 0, GAME_H);
  grad.addColorStop(0, css(SKY_TOP));
  grad.addColorStop(1, css(SKY_BOTTOM));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, GAME_H);
  tex.refresh();
}

function makeClouds(scene: Phaser.Scene) {
  const puffs: [number, number, number][] = [[120, 70, 1], [420, 130, 0.8], [700, 60, 1.2], [880, 160, 0.7]];
  draw(scene, 'clouds', GAME_W, 260, (g) => {
    g.fillStyle(0xffffff, 0.9);
    for (const [x, y, s] of puffs) {
      g.fillEllipse(x, y, 120 * s, 44 * s);
      g.fillEllipse(x - 40 * s, y + 8 * s, 80 * s, 34 * s);
      g.fillEllipse(x + 42 * s, y + 6 * s, 90 * s, 36 * s);
    }
  });
}

/** A whole number of waves across GAME_W, so the TileSprite repeats without a seam. */
function makeHills(scene: Phaser.Scene, key: string, h: number, color: number, amp: number, waves: number) {
  draw(scene, key, GAME_W, h, (g) => {
    g.fillStyle(color);
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= GAME_W; x += 8) {
      const t = (x / GAME_W) * Math.PI * 2 * waves;
      g.lineTo(x, h - amp - amp * 0.6 * Math.sin(t) - amp * 0.4 * Math.sin(2 * t + 1));
    }
    g.lineTo(GAME_W, h);
    g.closePath();
    g.fillPath();
  });
}

function makeGround(scene: Phaser.Scene, key: string, grass: boolean) {
  draw(scene, key, TILE, TILE, (g) => {
    g.fillStyle(0x8a5a2b).fillRect(0, 0, TILE, TILE);
    g.fillStyle(0x6e4521);
    for (const [x, y] of [[10, 22], [38, 14], [24, 44], [48, 40]]) g.fillCircle(x, y, 4);
    if (grass) g.fillStyle(0x58b947).fillRect(0, 0, TILE, 14).fillStyle(0x3f9a35).fillRect(0, 12, TILE, 4);
  });
}

function makePlatform(scene: Phaser.Scene) {
  draw(scene, 'platform', TILE, 20, (g) => {
    g.fillStyle(0xb07a3c).fillRect(0, 0, TILE, 20);
    g.lineStyle(3, 0x6e4a22).strokeRect(1.5, 1.5, TILE - 3, 17);
  });
}

function makeCrate(scene: Phaser.Scene) {
  draw(scene, 'crate', TILE, TILE, (g) => {
    g.fillStyle(0xc98a3d).fillRect(0, 0, TILE, TILE);
    g.lineStyle(5, 0x7a4f1d).strokeRect(2.5, 2.5, TILE - 5, TILE - 5);
    g.lineBetween(6, 6, TILE - 6, TILE - 6).lineBetween(TILE - 6, 6, 6, TILE - 6);
  });
}

function makeFlag(scene: Phaser.Scene) {
  draw(scene, 'flag', TILE, 150, (g) => {
    g.fillStyle(0xdddddd).fillRect(26, 0, 6, 150);
    g.fillStyle(0xe94b3c).fillTriangle(32, 8, 58, 24, 32, 40);
    g.fillStyle(0x777777).fillRect(18, 142, 22, 8);
  });
}

function makeBolt(scene: Phaser.Scene) {
  draw(scene, 'bolt', 40, 14, (g) => {
    g.fillStyle(0x50beff, 0.45).fillEllipse(20, 7, 40, 14);
    g.fillStyle(0xa0e6ff).fillRect(8, 3, 28, 8);
    g.fillStyle(0xffffff).fillRect(24, 5, 12, 4);
  });
}

function makeSpark(scene: Phaser.Scene) {
  draw(scene, 'spark', 8, 8, (g) => g.fillStyle(0xbfeaff).fillRect(0, 0, 8, 8));
}

function makeDebris(scene: Phaser.Scene) {
  draw(scene, 'debris', 14, 14, (g) => {
    g.fillStyle(0xc98a3d).fillRect(0, 0, 14, 14);
    g.lineStyle(3, 0x7a4f1d).strokeRect(1.5, 1.5, 11, 11);
  });
}
