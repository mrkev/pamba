import { useCallback } from "react";
import { flushSync } from "react-dom";
import { standardViewport, StandardViewport } from "../lib/viewport/StandardViewport";
import { clamp } from "../utils/math";
import { useViewportScrollEvents } from "./useViewportScrollEvents";

/**
 * Sets up pan/scroll events on an HTMLElement that is meant to be used as a viewport
 */
export function useStandardViewport(
  ref: React.RefObject<HTMLElement | null>,
  viewport: StandardViewport,
  MIN_SCALE: number,
  MAX_SCALE: number,
) {
  // sets scroll events
  useViewportScrollEvents(ref, {
    scale: useCallback(
      (sDelta, mouseX) => {
        standardViewport.scaleByFactor(viewport, MIN_SCALE, MAX_SCALE, sDelta, mouseX);
      },
      [MAX_SCALE, MIN_SCALE, viewport],
    ),
    panX: useCallback(
      (deltaX, absolute) => {
        const left = absolute ? deltaX : clamp(0, viewport.scrollLeftPx.get() + deltaX, Infinity);
        flushSync(() => {
          viewport.scrollLeftPx.set(left);
        });
      },
      [viewport.scrollLeftPx],
    ),
  });
}
