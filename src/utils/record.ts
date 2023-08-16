export function shallowEquals<T extends Record<string, unknown>>(a: T | null, b: T | null): boolean {
  if ((b == null) !== (a == null)) {
    return false;
  }

  // the xor above means each of these is true
  // we only get here if both a && b are null
  // the || is to refine the type
  if (a == null || b == null) {
    return true;
  }

  const keysA = Object.keys(a);
  for (const keyA of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, keyA) || a[keyA] !== b[keyA]) {
      return false;
    }
  }
  return true;
}
