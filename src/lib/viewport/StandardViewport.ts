import { SNumber } from "structured-state";
import { clamp } from "../../utils/math";
import { inv_ymxb, ymxb } from "./linear";

export interface StandardViewport {
  readonly START_PADDING_PX: number;
  scrollLeftPx: SNumber;
  pxPerSecond: SNumber;
}

export const standardViewport = {
  /**
   * Sets the horizontal scale, zooming in our out relative ot a specific point x
   */
  setXScale(vp: StandardViewport, MIN_SCALE: number, MAX_SCALE: number, expectedNewScale: number, mouseX: number = 0) {
    const newScale = clamp(MIN_SCALE, expectedNewScale, MAX_SCALE);
    const currentScaleFactor = vp.pxPerSecond.get();
    // Use the clamped scale so the scroll adjustment stays consistent at MIN/MAX.
    const scaleFactorFactor = newScale / currentScaleFactor;

    vp.pxPerSecond.set(newScale);
    // `mouseX` is measured from the padded viewport edge, but START_PADDING_PX is a
    // fixed screen-space offset that doesn't scale with zoom. Convert to an anchor
    // relative to the timeline origin so the second under `mouseX` stays pinned.
    const anchor = mouseX - vp.START_PADDING_PX;
    const newStartPx = (vp.scrollLeftPx.get() + anchor) * scaleFactorFactor - anchor;
    if (newStartPx < 0) {
      vp.scrollLeftPx.set(0);
    } else {
      vp.scrollLeftPx.set(newStartPx);
    }
  },

  /**
   * Converts a timeline position in seconds to its x offset (in px) from the viewport's
   * visible left edge: `pxPerSecond * s - scrollLeftPx`. A position at the current scroll
   * maps to 0; positions to its right are positive. `START_PADDING_PX` is a fixed
   * screen-space left-padding (8px for the project viewport) that does not scale with zoom.
   */
  secsToViewportPx(vp: StandardViewport, s: number, mode: "pos"): number {
    const factor = vp.pxPerSecond.get();
    const viewportStartPx = vp.scrollLeftPx.get();
    const b = vp.START_PADDING_PX;

    return ymxb(factor, s, -viewportStartPx + b);
  },

  secsToPx(vp: StandardViewport, s: number, mode: "len" | "pos"): number {
    const b = mode === "len" ? 0 : vp.START_PADDING_PX;
    const factor = vp.pxPerSecond.get();
    // y = mx + b
    return ymxb(factor, s, b);
  },

  pxToSecs(vp: StandardViewport, px: number, mode: "len" | "pos") {
    const b = mode === "len" ? 0 : vp.START_PADDING_PX;
    const factor = vp.pxPerSecond.get();
    return inv_ymxb(factor, px, b);
  },

  pxToFr(vp: StandardViewport, px: number, sampleRate: number) {
    return Math.floor((px / vp.pxPerSecond.get()) * sampleRate);
  },

  frToPx(vp: StandardViewport, fr: number, sampleRate: number) {
    return (fr / sampleRate) * vp.pxPerSecond.get();
  },

  framesPerPixel(vp: StandardViewport, sampleRate: number) {
    return sampleRate / vp.pxPerSecond.get();
  },
};
