import { SNumber } from "structured-state";
import { clamp } from "../../utils/math";

export interface StandardViewport {
  scrollLeftPx: SNumber;
  pxPerSecond: SNumber;
  secsToPx(s: number, mode: "len" | "pos"): number;
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
};
