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
   * Zooms by `sDelta` (>1 in, <1 out), keeping the second under `mouseX` fixed on screen.
   * Scale becomes `pxPerSecond * sDelta` clamped to `[MIN_SCALE, MAX_SCALE]`; scroll is
   * adjusted for the anchor and floored at 0. Mutates `viewport` in place.
   *
   * @param mouseX  Anchor in viewport pixels from the left edge. Defaults to 0 (left edge).
   */
  scaleByFactor(vp: StandardViewport, MIN_SCALE: number, MAX_SCALE: number, sDelta: number, mouseX = 0) {
    const newScale = clamp(MIN_SCALE, vp.pxPerSecond.get() * sDelta, MAX_SCALE);
    const currentScaleFactor = vp.pxPerSecond.get();
    const scaleFactorFactor = newScale / currentScaleFactor;

    vp.pxPerSecond.set(newScale);
    const newStartPx = (vp.scrollLeftPx.get() + mouseX) * scaleFactorFactor - mouseX;
    if (newStartPx < 0) {
      vp.scrollLeftPx.set(0);
    } else {
      vp.scrollLeftPx.set(newStartPx);
    }
  },

  /**
   * Converts a timeline position in seconds to its x offset (in px) from the viewport's
   * visible left edge: `pxPerSecond * s - scrollLeftPx`. A position at the current scroll
   * maps to 0; positions to its right are positive. `START_PADDING_PX` is a currently-zero
   * placeholder for future left-padding.
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
