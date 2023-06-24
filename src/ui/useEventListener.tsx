import { useEffect } from "react";

function useEventListener<K extends keyof HTMLElementEventMap, T extends HTMLElement>(
  type: K,
  ref: React.RefObject<T>,
  listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any
): void {
  useEffect(() => {
    const elem = ref.current;
    if (elem == null) {
      return;
    }

    elem.addEventListener(type, listener);
    return () => {
      elem.removeEventListener(type, listener);
    };
  }, [listener, ref, type]);
}
