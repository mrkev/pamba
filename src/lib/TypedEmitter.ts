export type TypedEmitterListener<T> = (arg: T) => void;

export class TypedEmitter<T extends Record<string, unknown>> {
  private listeners: { [K in keyof T]?: Set<TypedEmitterListener<T[K]>> } = {};

  emitEvent<K extends keyof T>(event: K, arg: T[K]): void {
    const set = this.listeners[event];
    if (!set) return;
    for (const listener of set) {
      listener(arg);
    }
  }

  addEventListener<K extends keyof T>(event: K, listener: TypedEmitterListener<T[K]>): () => void {
    const set = this.listeners[event] ?? new Set();
    if (!this.listeners[event]) {
      this.listeners[event] = set;
    }
    set.add(listener);
    return () => set.delete(listener);
  }

  removeEventListener<K extends keyof T>(event: K, listener: TypedEmitterListener<T[K]>): void {
    const set = this.listeners[event] ?? new Set();
    if (!set) return;
    set.delete(listener);
  }

  removeAll<K extends keyof T>(event?: K): void {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }
}
