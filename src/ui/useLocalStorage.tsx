import { nanoid } from "nanoid";
import { SPrimitive } from "structured-state";

export class LocalMValue<S> extends SPrimitive<S> {
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
