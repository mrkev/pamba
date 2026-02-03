import { SNumber } from "structured-state";
import { ymxb } from "./ProjectViewport";

export interface StandardViewport {
  scrollLeftPx: SNumber;
  pxPerSecond: SNumber;
  secsToPx(s: number, b?: number): number;
}

export const viewport = {
  secsToPx(v: StandardViewport, s: number, b = 0): number {
    const factor = v.pxPerSecond.get();
    return ymxb(factor, s, b); // y = mx + b
  },
};
