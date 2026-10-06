/** Jump sheet: 0 crouch, 1 take-off, 2 rising, 3 apex, 4 falling, 5 landing. Picks the air frame by vertical speed. */
export function jumpAirFrame(vy: number, jumpSpeed: number): 1 | 2 | 3 | 4 {
  const apex = jumpSpeed * 0.15;
  if (vy < -jumpSpeed * 0.5) return 1;
  if (vy < -apex) return 2;
  if (vy <= apex) return 3;
  return 4;
}
