export function nullthrows<T>(val: T | null | undefined, message?: string): T {
  if (val == null) {
    throw new Error(message || `Expected ${val} to be non nil.`);
  }
  return val;
}

export function nonNil<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

export function assert(value: boolean, msg?: string) {
  if (!value) {
    throw new Error(msg ?? "Assertion failed");
  }
}
