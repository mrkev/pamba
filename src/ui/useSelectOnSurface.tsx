import { useCallback } from "react";
import { pressedState } from "./pressedState";
import { useEventListener } from "./useEventListener";

export function useSelectOnSurface(
  elemRef: React.RefObject<HTMLElement>,
  downCb?: (e: MouseEvent) => void,
  moveCb?: (e: MouseEvent, down: { clientX: number; clientY: number }) => void,
  upCb?: (e: MouseEvent) => void,
) {
  useEventListener(
    "mousedown",
    elemRef,
    useCallback(
      (e) => {
        const { clientX, clientY } = e;
        downCb?.(e);

        function selectionMove(e: MouseEvent) {
          moveCb?.(e, { clientX, clientY });
        }

        document.addEventListener("mousemove", selectionMove);
        document.addEventListener("mouseup", function onMouseUp(e) {
          pressedState.set(null);
          document.removeEventListener("mouseup", onMouseUp);
          document.removeEventListener("mousemove", selectionMove);
          upCb?.(e);
        });
      },
      [downCb, moveCb, upCb],
    ),
  );
}
