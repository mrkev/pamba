import { useEffect, useState, useCallback } from "react";

type StateDispath<S> = (value: S | ((prevState: S) => S)) => void;
type StateChangeHandler<S> = (value: S) => void;

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

// TODO: currently I clone in the link set to see if anything changed
// I can also not clone and just have a state counter here or something.
export function useLinkedSet<S>(linkedSet: LinkedSet<S>): LinkedSet<S> {
  const [_, setState] = useState(() => linkedSet._getRaw());

  useEffect(() => {
    return subscribe(linkedSet, (newVal) => {
      setState(() => newVal);
    });
  }, [linkedSet]);

  // TODO: why is this necessary?
  const apiState = linkedSet._getRaw();
  useEffect(() => {
    // console.log("API => React", apiState);
    setState(() => apiState);
  }, [apiState]);

  return linkedSet;
}

// useLinkedSet(project.linkedSet)

// linkedSet.add("THIS")

export class LinkedSet<S> implements Set<S>, Subbable<ReadonlySet<S>> {
  private _set: ReadonlySet<S>;
  private constructor(initialValue: Set<S>) {
    this._set = initialValue;
  }

  _getRaw(): ReadonlySet<S> {
    return this._set;
  }

  _subscriptors: Set<StateChangeHandler<ReadonlySet<S>>> = new Set();
  public static create<T>(initialValue?: Set<T>) {
    return new this(initialValue ?? new Set());
  }

  private mutate<V>(mutator: (clone: Set<S>) => V): V {
    const clone = new Set(this._set);
    const result = mutator(clone);
    this._set = clone;
    notify(this, this._set);
    return result;
  }

  // In some future, create a set that does several operations at once
  // set(mutator: (clone: Set<S>) => V): V {

  // }

  // Set<S> interface, mutates
  add(value: S): this {
    if (this._set.has(value)) {
      return this;
    }
    return this.mutate((clone) => {
      clone.add(value);
      return this;
    });
  }

  // Set<S> interface, mutates
  clear(): void {
    this._set = new Set();
    notify(this, this._set);
  }

  // Set<S> interface, mutates
  delete(value: S): boolean {
    if (!this._set.has(value)) {
      return false;
    }

    return this.mutate((clone) => {
      return clone.delete(value);
    });
  }

  // Set<S> interface
  forEach(callbackfn: (value: S, value2: S, set: Set<S>) => void, thisArg?: any): void {
    throw new Error("Method not implemented.");
  }

  // Set<S> interface
  has(value: S): boolean {
    return this._set.has(value);
  }

  // Set<S> interface
  get size() {
    return this._set.size;
  }

  // Set<S> interface
  entries(): IterableIterator<[S, S]> {
    return this._set.entries();
  }

  // Set<S> interface
  keys(): IterableIterator<S> {
    return this._set.keys();
  }

  // Set<S> interface
  values(): IterableIterator<S> {
    return this._set.values();
  }

  // Set<S> interface
  [Symbol.iterator](): IterableIterator<S> {
    return this._set[Symbol.iterator]();
  }

  // Set<S> interface, TODO
  [Symbol.toStringTag]: string;
}

/////////////// NOT DONE OR USED ///////////////

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
// LinkedSet
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

class LinkedArray<S> implements Subbable<S[]> {
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
