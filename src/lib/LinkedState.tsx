import { useEffect, useState, useCallback } from "react";

type StateDispath<S> = (value: S | ((prevState: S) => S)) => void;
type StateChangeHandler<S> = (value: S) => void;

// Subbables are things one can subscribe to

export interface Subbable<S> {
  _subscriptors: Set<StateChangeHandler<S>>;
}

export function subscribe<S>(
  subbable: Subbable<S>,
  cb: StateChangeHandler<S>
): () => void {
  subbable._subscriptors.add(cb);
  return () => subbable._subscriptors.delete(cb);
}

export function notify<S>(subbable: Subbable<S>, value: S) {
  subbable._subscriptors.forEach((cb) => {
    cb(value);
  });
}

// Linked state is a Subbable

export class LinkedState<S> implements Subbable<S> {
  private _value: S;
  _subscriptors: Set<StateChangeHandler<S>> = new Set();
  constructor(initialValue: S) {
    this._value = initialValue;
  }

  static of<T>(val: T) {
    return new this<T>(val);
  }

  set(value: S): void {
    this._value = value;
    notify(this, this._value);
  }

  get(): S {
    return this._value;
  }
}

export function useLinkedState<S>(
  linkedState: LinkedState<S>
): [S, StateDispath<S>] {
  const [state, setState] = useState<S>(() => linkedState.get());

  useEffect(() => {
    return subscribe(linkedState, (newVal) => {
      setState(() => newVal);
    });
  }, [linkedState]);

  // TODO: why is this necessary?
  const apiState = linkedState.get();
  useEffect(() => {
    // console.log("API => React", apiState);
    setState(() => apiState);
  }, [apiState]);

  const setter: StateDispath<S> = useCallback(
    (newVal) => {
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

export function useChangeListener<S extends Subbable<S>>(subbable: S): void {
  const [_, setState] = useState<number>(0);
  useEffect(() => {
    return subscribe(subbable, (_) => {
      setState((prev) => prev + 1);
    });
  }, [subbable]);
}
