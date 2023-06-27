import { useCallback, useEffect, useState } from "react";
import { StateChangeHandler, StateDispath } from "./LinkedState";
import { Subbable, notify, subscribe } from "./Subbable";

export class LinkedSet<S> implements Set<S>, Subbable<ReadonlySet<S>> {
  private _set: ReadonlySet<S>;
  private constructor(initialValue: Set<S>) {
    this._set = initialValue;
  }

  _getRaw(): ReadonlySet<S> {
    return this._set;
  }

  _setRaw(set: ReadonlySet<S>) {
    this._set = set;
    notify(this, this._set);
  }

  _subscriptors: Set<StateChangeHandler<ReadonlySet<S>>> = new Set();
  public static create<T>(initialValue?: Set<T>) {
    return new this<T>(initialValue ?? new Set());
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
  forEach(_callbackfn: (value: S, value2: S, set: Set<S>) => void, _thisArg?: any): void {
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
  get [Symbol.toStringTag]() {
    return this.constructor.name;
  }
}

// TODO: currently I clone in the link set to see if anything changed
// I can also not clone and just have a state counter here or something.
export function useLinkedSet<S>(linkedSet: LinkedSet<S>): [LinkedSet<S>, StateDispath<ReadonlySet<S>>] {
  const [, setState] = useState(() => linkedSet._getRaw());

  useEffect(() => {
    return subscribe(linkedSet, (newVal) => {
      setState(() => newVal);
    });
  }, [linkedSet]);

  const setter: StateDispath<ReadonlySet<S>> = useCallback(
    function (newVal) {
      if (newVal instanceof Function) {
        linkedSet._setRaw(newVal(linkedSet._getRaw()));
      } else {
        linkedSet._setRaw(newVal);
      }
    },
    [linkedSet]
  );

  return [linkedSet, setter];
}

export function useNewLinkedSet<S>(): LinkedSet<S> {
  const [set] = useState<LinkedSet<S>>(() => LinkedSet.create<S>());
  const _ = useLinkedSet<S>(set);
  return set;
}
