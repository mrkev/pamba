import { SNumber } from "structured-state";
import { clamp } from "../../utils/math";
import { ymxb } from "./linear";

export interface StandardViewport {
  scrollLeftPx: SNumber;
  pxPerSecond: SNumber;
  secsToPx(s: number, mode: "len" | "pos"): number;
  pxToSecs(px: number, mode: "len" | "pos"): number;
}

export const standardViewport = {
  setScale(viewport: StandardViewport, MIN_SCALE: number, MAX_SCALE: number, sDelta: number, mouseX = 0) {
    const newScale = clamp(MIN_SCALE, viewport.pxPerSecond.get() * sDelta, MAX_SCALE);
    const currentScaleFactor = viewport.pxPerSecond.get();
    const scaleFactorFactor = newScale / currentScaleFactor;

    viewport.pxPerSecond.set(newScale);
    const newStartPx = (viewport.scrollLeftPx.get() + mouseX) * scaleFactorFactor - mouseX;
    if (newStartPx < 0) {
      viewport.scrollLeftPx.set(0);
    } else {
      viewport.scrollLeftPx.set(newStartPx);
    }
  },

  secsToViewportPx(viewport: StandardViewport, s: number, mode: "pos"): number {
    const START_PADDING_PX = 0; // todo, put in viewport?
    const factor = viewport.pxPerSecond.get();
    const viewportStartPx = viewport.scrollLeftPx.get();
    const b = START_PADDING_PX;

    return ymxb(factor, s, -viewportStartPx + b);
  },
};
