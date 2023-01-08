// used alongside "@typescript-eslint/no-floating-promises" to explicitly
// necessitate ignoring promise results
export function ignorePromise<T>(promise: Promise<T>) {
  promise.catch((e) => {
    throw e;
  });
}
