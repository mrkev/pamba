import { useEffect } from "react";

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
      function onPointerMove(e: PointerEvent) {
        callbacks.move?.(e, pointerMoveMeta);
      }

      elem.addEventListener("pointermove", onPointerMove);

      elem.addEventListener("pointerup", function onPointerUp(e) {
        callbacks.up?.(e, { downX, downY });
        elem.releasePointerCapture(e.pointerId);
        elem.removeEventListener("pointerup", onPointerUp);
        elem.removeEventListener("pointermove", onPointerMove);
      });
    };

    elem.addEventListener("pointerdown", onPointerDown);
    return () => {
      elem.removeEventListener("pointerdown", onPointerDown);
    };
  }, [callbacks, elemRef]);
}
