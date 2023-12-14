import { useCallback, useEffect, useState } from "react";
import { SetState } from "../utils/types";

import { nanoid } from "nanoid";
import { SPrimitive } from "structured-state";

export class LocalSPrimitive<S> extends SPrimitive<S> {
  readonly storageKey: string;

  constructor(initialValue: S, id: string, storageKey: string) {
    super(initialValue, id);
    this.storageKey = storageKey;
  }

  static create<T>(key: string, defaultValue: T) {
    const val = loadOrSetDefault(key, defaultValue);
    return new this<T>(val, nanoid(5), key);
  }

  override set(value: Readonly<S>): void {
    localStorage.setItem(this.storageKey, JSON.stringify(value));
    super.set(value);
  }

  override setDyn(cb: (prevState: S) => S): void {
    const newVal = cb(this.get());
    this.set(newVal);
  }
}

export function loadOrSetDefault<T>(id: string, initialValue: T): T {
  const value = localStorage.getItem(id);
  if (value == null) {
    localStorage.setItem(id, JSON.stringify(initialValue));
    return initialValue;
  } else {
    try {
      return JSON.parse(value);
    } catch (e) {
      console.error(e);
      localStorage.setItem(id, JSON.stringify(initialValue));
      return initialValue;
    }
  }
}

export function useLocalStorage<T>(id: string, initialValue: T): [T, SetState<T>] {
  const [state, setState] = useState(() => loadOrSetDefault(id, initialValue));

  // load local storage on mount
  useEffect(() => {
    const value = loadOrSetDefault(id, initialValue);
    setState(value);
  }, [id, initialValue]);

  const setter = useCallback<SetState<T>>(
    (arg: T | ((prevState: T) => T)) => {
      setState((prev) => {
        const val = typeof arg === "function" ? (arg as any)(prev) : arg;
        localStorage.setItem(id, JSON.stringify(arg));
        return val;
      });
    },
    [id],
  );

  return [state, setter];
}
