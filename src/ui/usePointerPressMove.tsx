import { useEffect, useState } from "react";

export type PointerPressMeta = {
  downX: number;
  downY: number;
};

export function usePointerPressMove(
  elemRef: React.RefObject<HTMLElement | null | undefined>,
  callbacks: {
    down?: (ev: PointerEvent) => void;
    move?: (ev: PointerEvent, metadata: PointerPressMeta) => void;
    up?: (ev: PointerEvent, metadata: PointerPressMeta) => void;
  },
): void {
  useEffect(() => {
    const elem = elemRef.current;
    if (elem == null) {
      return;
    }

    const onPointerDown = function (e: PointerEvent) {
      elem.setPointerCapture(e.pointerId);
      callbacks.down?.(e);

      const { clientX: downX, clientY: downY } = e;
      const pointerMoveMeta = { downX, downY };

      const onPointerMove = (e: PointerEvent) => {
        callbacks.move?.(e, pointerMoveMeta);
      };

      const onPointerUp = (e: PointerEvent) => {
        callbacks.up?.(e, { downX, downY });
        elem.releasePointerCapture(e.pointerId);
        elem.removeEventListener("pointerup", onPointerUp);
        elem.removeEventListener("pointermove", onPointerMove);
      };

      elem.addEventListener("pointermove", onPointerMove);
      elem.addEventListener("pointerup", onPointerUp);
    };
    elem.addEventListener("pointerdown", onPointerDown);
    return () => {
      elem.removeEventListener("pointerdown", onPointerDown);
    };
  }, [callbacks, elemRef]);
}

export function usePointerEditing<T>(
  elemRef: React.RefObject<HTMLElement | null | undefined>,
  original: () => T,
  callbacks: {
    down?: (ev: PointerEvent, original: T) => void | "abort";
    move?: (ev: PointerEvent, metadata: PointerPressMeta, original: T) => void;
    up?: (ev: PointerEvent, metadata: PointerPressMeta, original: T) => void;
  },
): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const elem = elemRef.current;
    if (elem == null) {
      return;
    }

    const onPointerDown = function (e: PointerEvent) {
      if (e.button !== 0) {
        // only edit with the main (left) button
        return;
      }

      const orig = original();
      const status = callbacks.down?.(e, orig);
      if (status === "abort") {
        return;
      }

      elem.setPointerCapture(e.pointerId);
      setActive(true);

      const { clientX: downX, clientY: downY } = e;
      const pointerMoveMeta = { downX, downY };

      const onPointerMove = (e: PointerEvent) => {
        callbacks.move?.(e, pointerMoveMeta, orig);
      };

      const onPointerUp = (e: PointerEvent) => {
        callbacks.up?.(e, { downX, downY }, orig);
        elem.releasePointerCapture(e.pointerId);
        setActive(false);
        elem.removeEventListener("pointerup", onPointerUp);
        elem.removeEventListener("pointermove", onPointerMove);
      };

      elem.addEventListener("pointermove", onPointerMove);
      elem.addEventListener("pointerup", onPointerUp);
    };
    elem.addEventListener("pointerdown", onPointerDown);
    return () => {
      elem.removeEventListener("pointerdown", onPointerDown);
    };
  }, [callbacks, elemRef, original]);

  return active;
}
