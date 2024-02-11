import { useEffect } from "react";

export function useEventListener<K extends keyof HTMLElementEventMap, T extends HTMLElement>(
  type: K,
  ref: React.RefObject<T> | React.MutableRefObject<T>,
  listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
  options?: AddEventListenerOptions,
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
  listener: (this: HTMLElement, ev: EventMap<Document>[K]) => any,
  options?: boolean | AddEventListenerOptions,
): void {
  useEffect(() => {
    document.addEventListener(type, listener as any, options);
    return () => {
      document.removeEventListener(type, listener as any, options);
    };
  }, [listener, options, type]);
}

export function useMousePressMove<T extends HTMLElement>(
  ref: React.RefObject<T> | React.MutableRefObject<T>,
  listener: (kind: "mousedown" | "mousemove" | "mouseup", ev: MouseEvent) => void,
  options?: AddEventListenerOptions,
): void {
  const { capture, once, passive, signal } = options ?? {};
  useEffect(() => {
    const elem = ref.current;
    if (elem == null) {
      return;
    }

    function onMouseMove(e: MouseEvent) {
      listener("mousemove", e);
    }

    function onMouseUp(e: MouseEvent) {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      listener("mouseup", e);
    }

    function onMouseDown(e: MouseEvent) {
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      listener("mousedown", e);
    }

    elem.addEventListener("mousedown", onMouseDown, { capture, once, passive, signal });
    return () => {
      elem.removeEventListener("mousedown", onMouseDown, { capture });
    };
  }, [capture, listener, once, passive, ref, signal]);
}
