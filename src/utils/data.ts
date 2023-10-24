export function bucketizeId<T extends { id: string }>(array: T[]): Map<string, T> {
  const result = new Map();
  for (const elem of array) {
    result.set(elem.id, elem);
  }
  return result;
}
