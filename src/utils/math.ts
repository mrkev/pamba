/** ensures min <= val <= max */
export function clamp(min: number, val: number, max: number): number {
  return Math.min(Math.max(min, val), max);
}

// Rounds to closest
export function stepNumber(number: number, step: number, origin = 0) {
  const change = origin % step;
  const up = Math.ceil(number / step) * step + change;
  const down = Math.floor(number / step) * step + change;
  return up - number < 0.5 ? up : down;
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
