import { useEffect, useState, useCallback } from "react";

type StateDispath<S> = (value: S | ((prevState: S) => S)) => void;
type StateChangeHandler<S> = (value: S) => void;

export class LinkedState<S> {
  private val: S;
  private handlers: Set<StateChangeHandler<S>> = new Set();
  constructor(initialValue: S) {
    this.val = initialValue;
  }

  static of<T>(val: T) {
    return new LinkedState<T>(val);
  }

  set(val: S): void {
    this.val = val;
    this.handlers.forEach((cb) => {
      cb(val);
    });
  }
  get(): S {
    return this.val;
  }

  // Executes these handlers on change
  addStateChangeHandler(cb: StateChangeHandler<S>): () => void {
    this.handlers.add(cb);
    return () => {
      this.handlers.delete(cb);
    };
  }
}

export function useLinkedState<S>(
  linkedState: LinkedState<S>
): [S, StateDispath<S>] {
  const [state, setState] = useState<S>(() => linkedState.get());

  useEffect(() => {
    return linkedState.addStateChangeHandler((newVal) =>
      setState(() => newVal)
    );
  }, [linkedState]);

  const apiState = linkedState.get();
  useEffect(
    function () {
      // console.log("API => React", apiState);
      setState(() => apiState);
    },
    [apiState]
  );

  const setter = useCallback(
    function (newVal) {
      // newVal instanceof Function
      if (newVal instanceof Function) {
        console.log("HELLO WORLD");
        linkedState.set(newVal(linkedState.get()));
      } else {
        linkedState.set(newVal);
      }
    },
    [linkedState]
  );

  return [state, setter];
}
