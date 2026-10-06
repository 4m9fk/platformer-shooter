import { describe, expect, it } from 'vitest';
import { Intent } from './Intent';

describe('Intent', () => {
  it('starts with nothing held', () => {
    expect(new Intent().state).toEqual({ left: false, right: false, jump: false, shoot: false });
  });

  it('keyboard and touch combine with OR; releasing one source keeps the other', () => {
    const i = new Intent();
    i.pressKey('ArrowLeft', 'left');
    i.pressPointer(1, 'left');
    i.releaseKey('ArrowLeft');
    expect(i.state.left).toBe(true);
    i.pressKey('ArrowLeft', 'left');
    i.releasePointer(1);
    expect(i.state.left).toBe(true);
    i.releaseKey('ArrowLeft');
    expect(i.state.left).toBe(false);
  });

  it('two keys on one action: releasing one keeps the action held', () => {
    const i = new Intent();
    i.pressKey('ArrowLeft', 'left');
    i.pressKey('KeyA', 'left');
    i.releaseKey('KeyA');
    expect(i.held('left')).toBe(true);
  });

  it('each finger is tracked by pointer id', () => {
    const i = new Intent();
    i.pressPointer(1, 'right');
    i.pressPointer(2, 'jump');
    i.pressPointer(3, 'shoot');
    i.releasePointer(2);
    expect(i.state).toEqual({ left: false, right: true, jump: false, shoot: true });
  });

  it('a finger lifted anywhere releases the button it held; unknown ids are ignored', () => {
    const i = new Intent();
    i.pressPointer(7, 'right');
    i.releasePointer(99);
    expect(i.held('right')).toBe(true);
    i.releasePointer(7);
    expect(i.held('right')).toBe(false);
  });

  it('clearKeyboard (window blur) drops keys but keeps fingers, clearPointers the reverse', () => {
    const i = new Intent();
    i.pressKey('ArrowRight', 'right');
    i.pressPointer(1, 'shoot');
    i.clearKeyboard();
    expect(i.state).toEqual({ left: false, right: false, jump: false, shoot: true });
    i.pressKey('ArrowRight', 'right');
    i.clearPointers();
    expect(i.state).toEqual({ left: false, right: true, jump: false, shoot: false });
  });

  it('consume reports a press once', () => {
    const i = new Intent();
    i.pressKey('ArrowUp', 'jump');
    expect(i.consume('jump')).toBe(true);
    expect(i.consume('jump')).toBe(false);
  });

  it('a second source pressing an already held action is not a new press', () => {
    const i = new Intent();
    i.pressPointer(1, 'jump');
    i.consume('jump');
    i.pressKey('ArrowUp', 'jump');
    expect(i.consume('jump')).toBe(false);
    i.releasePointer(1);
    i.releaseKey('ArrowUp');
    i.pressKey('ArrowUp', 'jump');
    expect(i.consume('jump')).toBe(true);
  });
});
