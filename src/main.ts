import Phaser from 'phaser';
import { GAME_H, GAME_W, GRAVITY, SKY_TOP } from './config';
import { Intent } from './input/Intent';
import { bindKeyboard } from './input/keyboard';
import { GameScene } from './scenes/GameScene';

const intent = new Intent();
bindKeyboard(intent);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: SKY_TOP,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: GAME_W, height: GAME_H },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: GRAVITY }, debug: new URLSearchParams(location.search).has('debug') },
  },
  input: { activePointers: 4 }, // run, jump and shoot with separate fingers
  callbacks: { preBoot: (game) => game.registry.set('intent', intent) },
  scene: [GameScene],
});
