type EventMap = Record<string, (...args: any[]) => void>;

export class EventEmitter<TEvents extends EventMap> {
  private listeners: {
    [K in keyof TEvents]?: Set<TEvents[K]>;
  } = {};

  addEventListener<K extends keyof TEvents>(event: K, listener: TEvents[K]): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }

    this.listeners[event]!.add(listener);

    // return unsubscribe function (nice ergonomic bonus)
    return () => this.removeEventListener(event, listener);
  }

  removeEventListener<K extends keyof TEvents>(event: K, listener: TEvents[K]): void {
    this.listeners[event]?.delete(listener);
  }

  once<K extends keyof TEvents>(event: K, listener: TEvents[K]): void {
    const wrapped = ((...args: Parameters<TEvents[K]>) => {
      this.removeEventListener(event, wrapped as TEvents[K]);
      listener(...args);
    }) as TEvents[K];

    this.addEventListener(event, wrapped);
  }

  emit<K extends keyof TEvents>(event: K, ...args: Parameters<TEvents[K]>): void {
    this.listeners[event]?.forEach((listener) => {
      listener(...args);
    });
  }

  removeAllListeners<K extends keyof TEvents>(event?: K): void {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }
}
