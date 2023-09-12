import { StateChangeHandler } from "./LinkedState";

// Subbables are things one can subscribe to

export interface Subbable<S> {
  readonly _subscriptors: Set<StateChangeHandler<S>>;
}

export function subscribe<S>(subbable: Subbable<S>, cb: StateChangeHandler<S>): () => void {
  subbable._subscriptors.add(cb);
  return () => subbable._subscriptors.delete(cb);
}

export function notify<S>(subbable: Subbable<S>, value: S, priority: "task" | "microtask" | "immediate" = "immediate") {
  switch (priority) {
    case "immediate":
      subbable._subscriptors.forEach((cb) => {
        cb(value);
      });
      break;

    case "task":
      window.setTimeout(() => {
        subbable._subscriptors.forEach((cb) => {
          cb(value);
        });
      }, 0);
      break;

    case "microtask":
      ignorePromise(
        Promise.resolve().then(() => {
          subbable._subscriptors.forEach((cb) => {
            cb(value);
          });
        }),
      );
      break;

    default:
      exhaustive(priority);
  }
}

export function exhaustive(x: never): never {
  throw new Error(`Exhaustive violation, unexpected value ${x}`);
}

// used alongside "@typescript-eslint/no-floating-promises" to explicitly
// necessitate ignoring promise results
export function ignorePromise<T>(promise: Promise<T>) {
  promise.catch((e) => {
    throw e;
  });
}
