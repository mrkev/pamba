export function bucketizeId<T extends { id: string }>(array: T[]): Map<string, T> {
  const result = new Map();
  for (const elem of array) {
    result.set(elem.id, elem);
  }
  return result;
}

// classify is Map<string, T>, butcketize shoudl be Map<string, T[]>
export function classify<T extends Record<string, unknown>>(key: keyof T, array: T[]): Map<string, T> {
  const result = new Map();
  for (const elem of array) {
    result.set(elem[key], elem);
  }
  return result;
}
