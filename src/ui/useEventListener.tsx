import { useCallback, useEffect } from "react";

/** Adds an event listener to a ref */
export function useEventListener<K extends keyof HTMLElementEventMap, T extends HTMLElement | null | undefined>(
  type: K,
  ref: React.RefObject<T>,
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

/** Adds an event listener to document */
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

export type MousePressMoveMeta<T extends Record<string, unknown> | void> = {
  event: "mousemove" | "mouseup" | "mouseleave" | "mouseenter";
  mousedown: T;
};

/**
 *
 * @param elemRef
 * @param mousedown
 * @param listener
 */
export function useMousePressMove<T extends Record<string, unknown> | void>(
  elemRef: React.RefObject<HTMLElement | null | undefined>,
  mousedown: (ev: MouseEvent) => T | "done",
  listener: (metadata: MousePressMoveMeta<T>, ev: MouseEvent) => void,
): void {
  useEventListener(
    "mousedown",
    elemRef,
    useCallback(
      function onMouseDown(e) {
        const result = mousedown(e);

        if (result === "done") {
          return;
        }

        const mouseMoveMeta = { event: "mousemove", mousedown: result } as const;
        const onMouseMove = function onMouseMove(e: MouseEvent) {
          listener(mouseMoveMeta, e);
        };

        const mouseLeaveMeta = { event: "mouseleave", mousedown: result } as const;
        const onMouseLeave = function onMouseLeave(e: MouseEvent) {
          listener(mouseLeaveMeta, e);
        };

        const mouseEnterMeta = { event: "mouseenter", mousedown: result } as const;
        const onMouseEnter = function onMouseEnter(e: MouseEvent) {
          listener(mouseEnterMeta, e);
        };

        elemRef.current?.addEventListener("mouseenter", onMouseEnter);
        elemRef.current?.addEventListener("mouseleave", onMouseLeave);
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", function onMouseUp(e) {
          listener({ event: "mouseup", mousedown: result }, e);
          document.removeEventListener("mouseup", onMouseUp);
          document.removeEventListener("mousemove", onMouseMove);
          elemRef.current?.removeEventListener("mouseleave", onMouseLeave);
          elemRef.current?.removeEventListener("mouseenter", onMouseEnter);
        });
      },
      [elemRef, listener, mousedown],
    ),
  );
}

export type PointerPressMoveMeta<T extends Record<string, unknown> | void> =
  | { event: "down"; e: PointerEvent }
  | {
      event: "move" | "up" | "leave" | "enter";
      mousedown: T;
    };

/**
 * NOTE: unused. Same as above but using setPointerCapture. Changes behaviour because leave isn't called (until mouseup iirc).
 */
export function usePointerPressMove<T extends Record<string, unknown> | void>(
  elemRef: React.RefObject<HTMLElement | null | undefined>,
  mousedown: (ev: PointerEvent) => T | "done",
  listener: (metadata: PointerPressMoveMeta<T>, ev: MouseEvent) => void,
): void {
  useEffect(() => {
    const elem = elemRef.current;
    if (elem == null) {
      return;
    }

    const onMouseDown = function (e: PointerEvent) {
      const result = mousedown(e);

      elem.setPointerCapture(e.pointerId);

      if (result === "done") {
        return;
      }

      const mouseMoveMeta = { event: "move", mousedown: result } as const;
      function onMouseMove(e: MouseEvent) {
        listener(mouseMoveMeta, e);
      }

      const mouseLeaveMeta = { event: "leave", mousedown: result } as const;
      function onMouseLeave(e: MouseEvent) {
        listener(mouseLeaveMeta, e);
      }

      const mouseEnterMeta = { event: "enter", mousedown: result } as const;
      function onMouseEnter(e: MouseEvent) {
        listener(mouseEnterMeta, e);
      }

      elem.addEventListener("pointerenter", onMouseEnter);
      elem.addEventListener("pointerleave", onMouseLeave);
      elem.addEventListener("pointermove", onMouseMove);

      elem.addEventListener("pointerup", function onPointerUp(e) {
        listener({ event: "up", mousedown: result }, e);
        elem.releasePointerCapture(e.pointerId);

        elem.removeEventListener("pointerup", onPointerUp);
        elem.removeEventListener("pointermove", onMouseMove);
        elem.removeEventListener("pointerleave", onMouseLeave);
        elem.removeEventListener("pointerenter", onMouseEnter);
      });
    };

    elem.addEventListener("pointerdown", onMouseDown);
    return () => {
      elem.removeEventListener("pointerdown", onMouseDown);
    };
  }, [elemRef, listener, mousedown]);
}
