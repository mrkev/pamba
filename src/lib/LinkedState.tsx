import { useEffect, useState, useCallback } from "react";

export type StateDispath<S> = (value: S | ((prevState: S) => S)) => void;
export type StateChangeHandler<S> = (value: S) => void;

// Subbables are things one can subscribe to

export interface Subbable<S> {
  _subscriptors: Set<StateChangeHandler<S>>;
}

export function subscribe<S>(subbable: Subbable<S>, cb: StateChangeHandler<S>): () => void {
  subbable._subscriptors.add(cb);
  return () => subbable._subscriptors.delete(cb);
}

export function notify<S>(subbable: Subbable<S>, value: S) {
  subbable._subscriptors.forEach((cb) => {
    cb(value);
  });
}

// Linked state is a Subbable, a single atomic primitive

export class LinkedState<S> implements Subbable<S> {
  private _value: Readonly<S>;
  _subscriptors: Set<StateChangeHandler<S>> = new Set();
  constructor(initialValue: S) {
    this._value = initialValue;
  }

  static of<T>(val: T) {
    return new this<T>(val);
  }

  set(value: Readonly<S>): void {
    this._value = value;
    notify(this, this._value);
  }

  get(): Readonly<S> {
    return this._value;
  }
}

export function useLinkedState<S>(linkedState: LinkedState<S>): [S, StateDispath<S>] {
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

/////////// NOT DONE OR USED ///////////////

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

type Map<T> = { [key: string]: T };

function useChangeListener<S extends Subbable<S>>(subbable: S): void {
  const [_, setState] = useState<number>(0);
  useEffect(() => {
    return subscribe(subbable, (_) => {
      setState((prev) => prev + 1);
    });
  }, [subbable]);
}

// LinkedMap
// LinkedArray
// LinkedSet X
// LinkedRecord

class LinkedRecord<R extends Map<unknown>> implements Subbable<R> {
  _subscriptors: Set<StateChangeHandler<R>> = new Set();

  // Note: this could have linked states
  private _value: R;
  private _children: {
    [K in keyof R]: LinkedState<R[K]>;
  };
  // todo, when do I unsubscribe? When my child's link-state gets dealloced.
  // that sounds like never, and that I just wait for my own dealloc.
  private unsubs: (() => void)[] = [];

  private constructor(initialValue: R) {
    this._value = initialValue;

    const childrenLS: {
      [K in keyof R]: LinkedState<R[K]>;
    } = {} as any;
    for (const key in initialValue) {
      const value = initialValue[key];

      const child = value instanceof LinkedState ? value : LinkedState.of(value);
      const unsub = subscribe(child, (newVal) => {
        this._value[key] = newVal;
        notify(this, this._value);
      });
      childrenLS[key] = child;
      this.unsubs.push(unsub);
    }
    this._children = childrenLS;
  }

  static of<T extends Map<unknown>>(initialValue: T) {
    return new this<T>(initialValue);
  }

  set<K extends keyof R>(key: K, value: R[K]): void {
    this._value = { ...this._value };
    this._value[key] = value;
    notify(this, this._value);
  }

  get(): Readonly<R> {
    return this._value;
  }

  getValue<K extends keyof R>(key: K): Readonly<R[K]> {
    const ls = this._children[key];
    if (ls != null) {
      return ls.get();
    } else {
      return this._value[key];
    }
  }

  getValueLS<K extends keyof R>(key: K): LinkedState<R[K]> {
    const ls = this._children[key];
    if (ls == null) {
      const childVal = this._value[key];
      const child = LinkedState.of(childVal);
      const unsub = subscribe(child, (newVal) => {
        this._value[key] = newVal;
        notify(this, this._value);
      });
      this._children[key] = child;
      this.unsubs.push(unsub);
      return child;
    }
    return ls;
  }
}

class LinkedArray2<S> implements Subbable<S[]> {
  private _value: S[];
  _subscriptors: Set<StateChangeHandler<S[]>> = new Set();
  private constructor(initialValue: S[] = []) {
    this._value = initialValue;
  }

  static of<T>(initialValue: T[]) {
    return new this<T>(initialValue);
  }

  push(...values: S[]): void {
    this._value = this._value.concat(...values);
    notify(this, this._value);
  }

  removeAll(value: S): void {
    this._value = this._value.filter((x) => x !== value);
    notify(this, this._value);
  }

  set(index: number, value: S): void {
    this._value = [...this._value];
    this._value[index] = value;
    notify(this, this._value);
  }

  get(): readonly S[] {
    return this._value;
  }

  // TODO

  // getLS(index: number): LinkedState<S | null> {
  //   const child = this._value[index] ?? null;
  //   const result = LinkedState.of(child);
  //   TO

  //   if (child === null) {
  //     return null;
  //   }
  // }
}

class LinkedMap<S> implements Subbable<Map<S>> {
  private _value: Map<S>;
  _subscriptors: Set<StateChangeHandler<Map<S>>> = new Set();
  private constructor(initialValue: Map<S> = {}) {
    this._value = initialValue;
  }

  static of<T>(initialValue: Map<T>) {
    return new this<T>(initialValue);
  }

  set(key: string, value: S): void {
    this._value = { ...this._value };
    this._value[key] = value;
    notify(this, this._value);
  }

  get(): Map<S> {
    return this._value;
  }

  // getLS(key: string): LinkedState<S | null> {
  //   const child = this._value[key] ?? null;
  //   const result = LinkedState.of(child);
  //   TO;

  //   if (child === null) {
  //     return null;
  //   }
  // }
}
