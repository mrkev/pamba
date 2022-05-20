import { useCallback, useEffect, useState } from "react";
import { notify, StateChangeHandler, StateDispath, Subbable, subscribe } from "./LinkedState";

export abstract class MutationHashable {
  private _hash = 0;
  _getMutationHash(): number {
    return this._hash;
  }
  _didMutate() {
    this._hash = (this._hash + 1) % Number.MAX_SAFE_INTEGER;
  }
}

export class LinkedMap<K, V> extends MutationHashable implements Map<K, V>, Subbable<ReadonlyMap<K, V>> {
  _subscriptors = new Set<StateChangeHandler<ReadonlyMap<K, V>>>();
  private _map = new Map<K, V>();
  _setRaw(map: ReadonlyMap<K, V>) {
    this._map = new Map(map);
    this._didMutate();
    notify(this, this._map);
  }

  _getRaw(): ReadonlyMap<K, V> {
    return this._map;
  }

  private constructor(initialValue: Map<K, V>) {
    super();
    this._map = initialValue;
  }

  public static create<K, V>(initialValue?: Map<K, V>) {
    return new this(initialValue ?? new Map());
  }

  map<T>(callbackfn: (value: V, key: K, map: Map<K, V>) => T): T[] {
    const mapped: T[] = [];
    this._map.forEach((value, key) => {
      const res = callbackfn(value, key, this._map);
      mapped.push(res);
    });
    return mapped;
  }

  //////////// Map interface

  // Map<K, V> interface, mutates
  clear(): void {
    this._map.clear();
    this._didMutate();
    notify(this, this._map);
  }

  // Map<K, V> interface, mutates
  delete(key: K): boolean {
    const result = this._map.delete(key);
    this._didMutate();
    notify(this, this._map);
    return result;
  }

  // Map<K, V> interface
  forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
    this._map.forEach(callbackfn, thisArg);
  }

  // Map<K, V> interface
  get(key: K): V | undefined {
    return this._map.get(key);
  }

  // Map<K, V> interface
  has(key: K): boolean {
    return this._map.has(key);
  }

  // Map<K, V> interface, mutates
  set(key: K, value: V): this {
    this._map.set(key, value);
    this._didMutate();
    notify(this, this._map);
    return this;
  }

  // Map<K, V> interface
  get size(): number {
    return this._map.size;
  }

  // Map<K, V> interface
  entries(): IterableIterator<[K, V]> {
    return this._map.entries();
  }

  // Map<K, V> interface
  keys(): IterableIterator<K> {
    return this._map.keys();
  }

  // Map<K, V> interface
  values(): IterableIterator<V> {
    return this._map.values();
  }

  // Map<K, V> interface
  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this._map[Symbol.iterator]();
  }

  // Map<K, V> interface
  get [Symbol.toStringTag](): string {
    return this.constructor.name;
  }
}

export function useLinkedMap<K, V>(linkedMap: LinkedMap<K, V>): [LinkedMap<K, V>, StateDispath<ReadonlyMap<K, V>>] {
  const [, setHash] = useState(() => linkedMap._getMutationHash());

  useEffect(() => {
    return subscribe(linkedMap, () => {
      setHash((prev) => (prev + 1) % Number.MAX_SAFE_INTEGER);
    });
  }, [linkedMap]);

  const setter: StateDispath<ReadonlyMap<K, V>> = useCallback(
    function (newVal) {
      if (newVal instanceof Function) {
        linkedMap._setRaw(newVal(linkedMap._getRaw()));
      } else {
        linkedMap._setRaw(newVal);
      }
    },
    [linkedMap]
  );

  return [linkedMap, setter];
}
