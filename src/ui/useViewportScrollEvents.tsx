import { useCallback, useRef } from "react";
import { nullthrows } from "../utils/nullthrows";
import { useEventListener } from "./useEventListener";

export function useViewportScrollEvents(
  divRef: React.RefObject<HTMLDivElement | null>,
  { scale, panX }: { scale: (sDelta: number, mouseX: number) => void; panX: (left: number, absolute: boolean) => void },
) {
  const context = useRef({ wheelCalled: false });

  useEventListener(
    "wheel",
    divRef,
    useCallback(
      (e: WheelEvent) => {
        // e.preventDefault();
        // see comment on "scroll" event below
        context.current.wheelCalled = true;
        requestAnimationFrame(function clearWheelCalled() {
          context.current.wheelCalled = false;
        });

        const divDims = nullthrows(divRef.current).getBoundingClientRect();
        const mouseX = e.clientX - divDims.left;

        // both pinches and two-finger pans trigger the wheel event trackpads.
        // ctrlKey is true for pinches though, so we can use it to differentiate
        // one from the other.
        // pinch
        if (e.ctrlKey) {
          const sDelta = Math.exp(-e.deltaY / 100);
          scale(sDelta, mouseX);
          e.preventDefault();
          e.stopPropagation();
        }

        // pan
        else {
          panX(e.deltaX, false);
        }
      },
      [divRef, scale, panX],
    ),
    { capture: false },
  );

  useEventListener(
    "scroll",
    divRef,
    useCallback(
      /**
       * the "scroll" event:
       * - gets called for any scroll, including, for example, dragging the scrollbar
       * - gets called with a simple Event, which doesn't have much info, we don't use it
       * - gets called after the "wheel" event (tested on Chrome) when the wheel is used to scroll
       * we need to make sure our viewport knows our scroll position even if the user scrolled not using the wheel
       *
       * TODO: can I just use scroll for pan always, wheel for scale, and avoid having to check if wheel was called?
       */
      (e) => {
        e.preventDefault();
        if (context.current.wheelCalled === true) {
          return;
        }

        const projectDiv = nullthrows(divRef.current);
        const left = projectDiv.scrollLeft;
        panX(left, true);
        // e?.preventDefault();
      },
      [divRef, panX],
    ),
  );
}
