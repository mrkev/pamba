import { useEffect, useState, useCallback } from "react";

type StateDispath<S> = (value: S | ((prevState: S) => S)) => void;

export class LinkedState<S> {
  private val: S;
  private handlers: Set<StateDispath<S>> = new Set();
  constructor(initialValue: S) {
    this.val = initialValue;
  }

  static of<T>(val: T) {
    return new LinkedState<T>(val);
  }

  set(val: S): void {
    this.val = val;
    this.handlers.forEach(function (cb) {
      cb(val);
    });
  }
  get(): S {
    return this.val;
  }
  addStateDispatchHandler(cb: StateDispath<S>): () => void {
    this.handlers.add(cb);
    return () => {
      this.handlers.delete(cb);
    };
  }
}

export function useLinkedState<S>(
  linkedState: LinkedState<S>
): [S, StateDispath<S>] {
  const [state, setState] = useState<S>(linkedState.get());

  useEffect(
    function () {
      return linkedState.addStateDispatchHandler(setState);
    },
    [linkedState]
  );

  const apiState = linkedState.get();
  useEffect(
    function () {
      // console.log("API => React", apiState);
      setState(apiState);
    },
    [apiState]
  );

  const setter = useCallback(
    function (newVal) {
      // newVal instanceof Function
      if (newVal instanceof Function) {
        linkedState.set(newVal(linkedState.get()));
      } else {
        linkedState.set(newVal);
      }
    },
    [linkedState]
  );

  return [state, setter];
}
