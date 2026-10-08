/**
 * A tap counts only when the same finger went down and came up on the button. A finger that was already down when
 * the button appeared (holding jump as the win screen pops up), or one that slid on or off, presses nothing.
 */
export class Tap {
  private down = new Set<number>();

  press(pointerId: number) {
    this.down.add(pointerId);
  }

  cancel(pointerId: number) {
    this.down.delete(pointerId);
  }

  /** True once per press, when the finger that pressed is the one lifting. */
  release(pointerId: number): boolean {
    return this.down.delete(pointerId);
  }
}
