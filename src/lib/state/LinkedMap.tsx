import { useCallback, useEffect, useState } from "react";
import { StateChangeHandler, StateDispath } from "./LinkedState";
import { MutationHashable } from "./MutationHashable";
import { notify, Subbable, subscribe } from "./Subbable";

// NOTE: what happens when has is MAX_INT?
// TODO: handle overflow gracefully
export class LinkedMap<K, V> implements Map<K, V>, Subbable<ReadonlyMap<K, V>>, MutationHashable {
  private _map = new Map<K, V>();

  readonly _subscriptors = new Set<StateChangeHandler<ReadonlyMap<K, V>>>();
  _hash: number = 0;

  _setRaw(map: ReadonlyMap<K, V>) {
    this._map = new Map(map);
    MutationHashable.mutated(this);
    notify(this, this._map);
  }

  _getRaw(): ReadonlyMap<K, V> {
    return this._map;
  }

  private constructor(initialValue: Map<K, V>) {
    this._map = initialValue;
  }

  public static create<K, V>(initialValue?: Map<K, V>) {
    return new this<K, V>(initialValue ?? new Map());
  }

  map<T>(callbackfn: (value: V, key: K, map: Map<K, V>) => T): T[] {
    const mapped: T[] = [];
    this._map.forEach((value, key) => {
      const res = callbackfn(value, key, this._map);
      mapped.push(res);
    });
    return mapped;
  }

  replace(entries: readonly (readonly [K, V])[] | null) {
    this._map = new Map(entries);
    MutationHashable.mutated(this);
    notify(this, this._map);
  }

  //////////// Map interface

  // Map<K, V> interface, mutates
  clear(): void {
    this._map.clear();
    MutationHashable.mutated(this);
    notify(this, this._map);
  }

  // Map<K, V> interface, mutates
  delete(key: K): boolean {
    const result = this._map.delete(key);
    MutationHashable.mutated(this);
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
    MutationHashable.mutated(this);
    notify(this, this._map);
    return this;
  }

  // Map<K, V> interface
  get size(): number {
    return this._map.size;
  }

  // Map<K, V> interface
  entries(): MapIterator<[K, V]> {
    return this._map.entries();
  }

  // Map<K, V> interface
  keys(): MapIterator<K> {
    return this._map.keys();
  }

  // Map<K, V> interface
  values(): MapIterator<V> {
    return this._map.values();
  }

  // Map<K, V> interface
  [Symbol.iterator](): MapIterator<[K, V]> {
    return this._map[Symbol.iterator]();
  }

  // Map<K, V> interface
  get [Symbol.toStringTag](): string {
    return this.constructor.name;
  }
}

export function useNewLinkedMap<K, V>(): LinkedMap<K, V> {
  const [map] = useLinkedMap(LinkedMap.create<K, V>());
  useSubscribeToSubbableMutationHashable(map);
  return map;
}

export function useLinkedMap<K, V>(linkedMap: LinkedMap<K, V>): [LinkedMap<K, V>, StateDispath<ReadonlyMap<K, V>>] {
  useSubscribeToSubbableMutationHashable(linkedMap);

  const setter: StateDispath<ReadonlyMap<K, V>> = useCallback(
    function (newVal) {
      if (newVal instanceof Function) {
        linkedMap._setRaw(newVal(linkedMap._getRaw()));
      } else {
        linkedMap._setRaw(newVal);
      }
    },
    [linkedMap],
  );

  return [linkedMap, setter];
}

export function useLinkedMapMaybe<K, V>(
  linkedMap: LinkedMap<K, V> | null | undefined,
): LinkedMap<K, V> | null | undefined {
  useSubscribeToSubbableMutationHashableMaybe(linkedMap);
  return linkedMap;
}

export function useSubscribeToSubbableMutationHashable<T extends MutationHashable & Subbable<any>>(
  obj: T,
  cb?: () => void,
): T {
  const [, setHash] = useState(() => MutationHashable.getMutationHash(obj));

  useEffect(() => {
    return subscribe(obj, () => {
      setHash((prev) => (prev + 1) % Number.MAX_SAFE_INTEGER);
      cb?.();
    });
  }, [cb, obj]);

  return obj;
}

export function useSubscribeToSubbableMutationHashableMaybe<T extends MutationHashable & Subbable<any>>(
  obj: T | null | undefined,
  cb?: () => void,
): T | null | undefined {
  const [, setHash] = useState(() => (obj ? MutationHashable.getMutationHash(obj) : 0));

  useEffect(() => {
    if (obj == null) {
      return;
    }

    return subscribe(obj, () => {
      setHash((prev) => (prev + 1) % Number.MAX_SAFE_INTEGER);
      cb?.();
    });
  }, [cb, obj]);

  return obj;
}
