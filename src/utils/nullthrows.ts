export default function nullthrows<T>(val: T | null | void, message?: string): T {
  if (val == null) {
    throw new Error(message || `Expected ${val} to be non nil.`);
  }
  return val;
}

export function nonNil<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}
