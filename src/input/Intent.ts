export type Action = 'left' | 'right' | 'jump' | 'shoot';
export type IntentState = Record<Action, boolean>;

/** Keyboard and touch buttons merged into one set of held actions. Releasing one source never cancels the other. */
export class Intent {
  private readonly keys = new Map<string, Action>(); // key code -> action
  private readonly pointers = new Map<number, Action>(); // pointer id -> action
  private readonly pressed = new Set<Action>(); // presses not yet consumed

  pressKey(code: string, action: Action) {
    this.press(action, () => this.keys.set(code, action));
  }

  releaseKey(code: string) {
    this.keys.delete(code);
  }

  clearKeyboard() {
    this.keys.clear();
  }

  pressPointer(id: number, action: Action) {
    this.press(action, () => this.pointers.set(id, action));
  }

  releasePointer(id: number) {
    this.pointers.delete(id);
  }

  clearPointers() {
    this.pointers.clear();
  }

  held(action: Action): boolean {
    for (const a of this.keys.values()) if (a === action) return true;
    for (const a of this.pointers.values()) if (a === action) return true;
    return false;
  }

  get state(): IntentState {
    return { left: this.held('left'), right: this.held('right'), jump: this.held('jump'), shoot: this.held('shoot') };
  }

  /** True once per transition from released to held. */
  consume(action: 'jump' | 'shoot'): boolean {
    return this.pressed.delete(action);
  }

  private press(action: Action, add: () => void) {
    const was = this.held(action);
    add();
    if (!was) this.pressed.add(action);
  }
}
