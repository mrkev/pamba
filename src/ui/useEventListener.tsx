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

type EventMap<T> = T extends Document ? DocumentEventMap : T extends HTMLElement ? HTMLElementEventMap : never;

export function useDocumentEventListener<K extends keyof DocumentEventMap>(
  type: K,
  listener: (this: HTMLElement, ev: EventMap<Document>[K]) => any
): void {
  useEffect(() => {
    document.addEventListener(type, listener as any);
    return () => {
      document.removeEventListener(type, listener as any);
    };
  }, [listener, type]);
}
