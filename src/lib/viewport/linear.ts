/** y = mx + b */

export function ymxb(m: number, x: number, b: number) {
  return m * x + b;
}
// x = (y - b) / m

export function inv_ymxb(m: number, y: number, b: number) {
  return (y - b) / m;
}
