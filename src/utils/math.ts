/** ensures min <= val <= max */
export function clamp(min: number, val: number, max: number): number {
  return Math.min(Math.max(min, val), max);
}

// Rounds to closest
export function stepNumber(number: number, step: number) {
  const up = Math.ceil(number / step) * step;
  const down = Math.floor(number / step) * step;
  return up - number < 0.5 ? up : down;
}
