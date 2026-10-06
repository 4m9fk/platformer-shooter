import Phaser from 'phaser';
import { GAME_H, GAME_W, GRAVITY, SKY_TOP } from './config';
import { Intent } from './input/Intent';
import { bindKeyboard } from './input/keyboard';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';

const intent = new Intent();
bindKeyboard(intent);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: SKY_TOP,
  // EXPAND keeps 960×540 as the minimum and widens (or heightens) the game to fill the screen without bars
  scale: { mode: Phaser.Scale.EXPAND, autoCenter: Phaser.Scale.CENTER_BOTH, width: GAME_W, height: GAME_H },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: GRAVITY }, debug: new URLSearchParams(location.search).has('debug') },
  },
  input: { activePointers: 4 }, // run, jump and shoot with separate fingers
  callbacks: { preBoot: (game) => game.registry.set('intent', intent) },
  scene: [BootScene, GameScene, UIScene],
});

if (import.meta.env.DEV) Object.assign(window, { game }); // poke at it from the console while developing
