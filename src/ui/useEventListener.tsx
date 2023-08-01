import { useEffect } from "react";

export function useEventListener<K extends keyof HTMLElementEventMap, T extends HTMLElement>(
  type: K,
  ref: React.RefObject<T> | React.MutableRefObject<T>,
  listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
  options?: AddEventListenerOptions
): void {
  const { capture, once, passive, signal } = options ?? {};
  useEffect(() => {
    const elem = ref.current;
    if (elem == null) {
      return;
    }
    elem.addEventListener(type, listener, { capture, once, passive, signal });
    return () => {
      elem.removeEventListener(type, listener, { capture });
    };
  }, [capture, listener, once, passive, ref, signal, type]);
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
