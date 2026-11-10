/** ensures min <= val <= max */
export function clamp(min: number, val: number, max: number): number {
  return Math.min(Math.max(min, val), max);
}

/**
 * Rounds `number` to the closest point on the grid `origin + k * step` (k any integer).
 * Returns `number` unchanged for a non-positive step.
 */
export function stepNumber(number: number, step: number, origin = 0) {
  if (!(step > 0)) {
    return number;
  }
  return Math.round((number - origin) / step) * step + origin;
}

export function returnClosest(num: number, option1: number, ...options: number[]) {
  let option = option1;
  for (const current of options) {
    if (Math.abs(num - current) < Math.abs(num - option)) {
      option = current;
    }
  }
  return option;
}

export function relu(num: number) {
  return Math.max(0, num);
}

// from: https://stackoverflow.com/questions/17369098/simplest-way-of-getting-the-number-of-decimals-in-a-number-in-javascript
export function countDecimals(num: number) {
  if (Math.floor(num.valueOf()) === num.valueOf()) return 0;
  return num.toString().split(".")[1].length || 0;
}
