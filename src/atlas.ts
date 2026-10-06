import Phaser from 'phaser';
import { BODY_WIDTH } from './config';

export interface AnimMeta {
  frames: number;
  fps: number;
  cell: { w: number; h: number };
  anchor: { x: number; y: number }; // feet, for right-facing frames
}

/** meta.game written by tools/pack_atlas.py; all values in atlas pixels. */
export interface AtlasGame {
  anims: Record<string, AnimMeta>;
  bodyTop: number;
  muzzle?: { x: number; y: number };
}

const LOOPED = new Set(['idle', 'walk']);
// hit plays frames 0–2; frame 3 is almost empty, the fade-out is a tween
const LAST_FRAME: Record<string, number> = { 'zombie-hit': 2 };

/** Atlas plus its JSON once more as plain data, to read meta.game. */
export function loadAtlas(scene: Phaser.Scene, key: 'hero' | 'zombie') {
  scene.load.atlas(key, `sprites/${key}.png`, `sprites/${key}.json`);
  scene.load.json(`${key}-meta`, `sprites/${key}.json`);
}

export function atlasGame(scene: Phaser.Scene, key: string): AtlasGame {
  return scene.cache.json.get(`${key}-meta`).meta.game;
}

export function createAnims(scene: Phaser.Scene, key: string) {
  for (const [name, a] of Object.entries(atlasGame(scene, key).anims)) {
    const animKey = `${key}-${name}`;
    scene.anims.create({
      key: animKey,
      frames: scene.anims.generateFrameNames(key, { prefix: `${name}_`, start: 0, end: LAST_FRAME[animKey] ?? a.frames - 1 }),
      frameRate: a.fps,
      repeat: LOOPED.has(name) ? -1 : 0,
    });
  }
}

/** Puts the origin on the feet. Phaser flips around the frame middle, so a flipped sprite mirrors the anchor. */
export function applyAnchor(sprite: Phaser.GameObjects.Sprite, anim: AnimMeta) {
  const x = sprite.flipX ? anim.cell.w - anim.anchor.x : anim.anchor.x;
  sprite.setOrigin(x / anim.cell.w, anim.anchor.y / anim.cell.h);
}

/**
 * Body BODY_WIDTH of the idle cell wide, from the top of the head to the feet, centred on the feet.
 * Sizes and offsets are in frame pixels; Arcade applies the sprite scale itself.
 */
export function fitBody(sprite: Phaser.Physics.Arcade.Sprite, game: AtlasGame) {
  const a = game.anims.idle;
  const w = a.cell.w * BODY_WIDTH;
  const ax = sprite.flipX ? a.cell.w - a.anchor.x : a.anchor.x;
  const body = sprite.body as Phaser.Physics.Arcade.Body;
  body.setSize(w, a.anchor.y - game.bodyTop, false);
  body.setOffset(ax - w / 2, game.bodyTop);
}
