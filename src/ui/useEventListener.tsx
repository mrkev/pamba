import { useEffect } from "react";

export function useEventListener<K extends keyof HTMLElementEventMap, T extends HTMLElement>(
  type: K,
  ref: React.RefObject<T> | Document,
  listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any
): void {
  useEffect(() => {
    const elem = ref instanceof Document ? ref : ref.current;
    if (elem == null) {
      return;
    }

    elem.addEventListener(type, listener as any);
    return () => {
      elem.removeEventListener(type, listener as any);
    };
  }, [listener, ref, type]);
}
