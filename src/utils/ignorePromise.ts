// used alongside "@typescript-eslint/no-floating-promises" to explicitly
// necessitate ignoring promise results
export function ignorePromise<T>(promise: Promise<T> | undefined) {
  if (promise === undefined) {
    return;
  }
  promise.catch((e) => {
    throw e;
  });
}

export function ignoreMaybePromise<T>(maybePromise: Promise<T> | T) {
  if (maybePromise instanceof Promise) {
    ignorePromise(maybePromise);
  } else {
    return;
  }
}

export function pAll<T extends readonly unknown[] | []>(
  ...values: T
): Promise<{ -readonly [P in keyof T]: Awaited<T[P]> }> {
  return Promise.all(values);
}

export function runAll<T extends readonly (() => Promise<unknown | any>)[]>(
  ...values: T
): Promise<{ -readonly [P in keyof T]: Awaited<ReturnType<T[P]>> }> {
  return Promise.all(values.map((f) => f())) as any;
}

export async function pTry<T, V>(promise: Promise<T>, error: V | ((e: any) => V)): Promise<T | V> {
  try {
    const result = await promise;
    return result;
  } catch (e) {
    const value = error instanceof Function ? error(e) : error;
    return value;
  }
}
