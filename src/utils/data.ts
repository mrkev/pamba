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

export function bucketizeKey<T extends Record<string, unknown>>(key: keyof T, array: T[]): Map<string, T[]> {
  const result = new Map<any, T[]>();
  for (const elem of array) {
    let s = result.get(elem[key]);
    if (s == null) {
      s = [];
      result.set(elem[key], s);
    }
    s.push(elem);
  }
  return result;
}

export function bucketize<T, U>(key: (elem: T) => U, array: T[]): Map<U, T[]> {
  const result = new Map<U, T[]>();
  for (const elem of array) {
    let s = result.get(key(elem));
    if (s == null) {
      s = [];
      result.set(key(elem), s);
    }
    s.push(elem);
  }
  return result;
}
