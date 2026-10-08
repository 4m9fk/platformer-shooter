import Phaser from 'phaser';
import { safeAreaInsets } from '../viewport';
import type { Insets } from './layout';

export const FONT = 'system-ui, -apple-system, sans-serif';
export const TEXT = { fontFamily: FONT, color: '#ffffff', stroke: '#1d2b3a', strokeThickness: 6 };

/** A full-screen shade with content laid out around (0, 0); placeOverlay centres it and sizes the shade. */
export interface Overlay {
  container: Phaser.GameObjects.Container;
  shade: Phaser.GameObjects.Rectangle;
}

export interface OverlayButton {
  label: string;
  onClick: () => void;
}

const BUTTON_W = 240;
const BUTTON_H = 84;

/** Safe-area insets in game pixels: they come in CSS pixels and displayScale converts them. */
export function gameInsets(scene: Phaser.Scene): Insets {
  const k = scene.scale.displayScale.x;
  const css = safeAreaInsets();
  return { top: css.top * k, right: css.right * k, bottom: css.bottom * k, left: css.left * k };
}

export function makeButton(scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void) {
  const rect = scene.add.rectangle(x, y, BUTTON_W, BUTTON_H, 0x58b947).setStrokeStyle(5, 0xffffff);
  const text = scene.add.text(x, y, label, { ...TEXT, fontSize: '36px' }).setOrigin(0.5);
  rect.setInteractive({ useHandCursor: true });
  rect.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, onClick);
  return [rect, text] as const;
}

/** Darkened screen, a title and a centred row of buttons. The shade swallows taps meant for the game. */
export function makeOverlay(scene: Phaser.Scene, title: string, buttons: OverlayButton[]): Overlay {
  const shade = scene.add.rectangle(0, 0, 1, 1, 0x000000, 0.55).setInteractive();
  const heading = scene.add.text(0, -130, title, { ...TEXT, fontSize: '56px', align: 'center' }).setOrigin(0.5);
  const parts: Phaser.GameObjects.GameObject[] = [shade, heading];
  const step = BUTTON_W + 30;
  buttons.forEach((b, i) => parts.push(...makeButton(scene, (i - (buttons.length - 1) / 2) * step, 110, b.label, b.onClick)));
  return { container: scene.add.container(0, 0, parts).setDepth(10), shade };
}

export function makeRotateOverlay(scene: Phaser.Scene): Overlay {
  const shade = scene.add.rectangle(0, 0, 1, 1, 0x1d2b3a, 0.95).setInteractive();
  const text = scene.add.text(0, 0, '↻\nПоверни телефон', { ...TEXT, fontSize: '64px', align: 'center' }).setOrigin(0.5);
  return { container: scene.add.container(0, 0, [shade, text]).setDepth(20).setVisible(false), shade };
}

export function placeOverlay(o: Overlay, width: number, height: number) {
  o.container.setPosition(width / 2, height / 2);
  o.shade.setSize(width, height);
  o.shade.input?.hitArea.setSize(width, height); // the hit area is not resized with the shape
}
