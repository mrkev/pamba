import { InitFunctions, JSONOfAuto, number, ReplaceFunctions, SNumber, SPrimitive, Structured } from "structured-state";
import { StandardViewport } from "./StandardViewport";
import { ymxb } from "./linear";

// px / sec => fr / px

type AutoAudioViewport = {
  pxPerSec: SNumber;
  scrollLeft: SNumber;
};

// idea, everything related to time as a pair of TimelineT
// everything needs to be relative to something else
// position (0, y); needs a basis of 0.
// range (x, y)

export class AudioViewport extends Structured<AutoAudioViewport, typeof AudioViewport> implements StandardViewport {
  readonly lockPlayback = SPrimitive.of(false);
  readonly selectionWidthFr = SPrimitive.of<number | null>(null); // relative to cursor

  constructor(
    //
    readonly pxPerSecond: SNumber,
    readonly scrollLeftPx: SNumber,
  ) {
    super();
  }

  static of(pxPerSec: number, scrollLeftPx: number) {
    return Structured.create(AudioViewport, number(pxPerSec), number(scrollLeftPx));
  }

  override replace(auto: JSONOfAuto<AutoAudioViewport>, replace: ReplaceFunctions): void {
    replace.number(auto.pxPerSec, this.pxPerSecond);
    replace.number(auto.scrollLeft, this.scrollLeftPx);
  }

  override autoSimplify(): AutoAudioViewport {
    return {
      pxPerSec: this.pxPerSecond,
      scrollLeft: this.scrollLeftPx,
    };
  }

  // TODO: should combine number and init.number (essentially make number be able to take in a Simplified number)?
  static construct(auto: JSONOfAuto<AutoAudioViewport>, init: InitFunctions): AudioViewport {
    return Structured.create(AudioViewport, init.number(auto.pxPerSec), init.number(auto.scrollLeft));
  }

  pxToFr(px: number, sampleRate: number) {
    return Math.floor((px / this.pxPerSecond.get()) * sampleRate);
  }

  pxToSec(px: number) {
    return (px + this.scrollLeftPx.get()) / this.pxPerSecond.get();
  }

  frToPx(fr: number, sampleRate: number) {
    return (fr / sampleRate) * this.pxPerSecond.get();
  }

  framesPerPixel(sampleRate: number) {
    return sampleRate / this.pxPerSecond.get();
  }

  secsToPx(s: number, mode: "len" | "pos") {
    const b = 0; // todo
    const factor = this.pxPerSecond.get();
    return ymxb(factor, s, b); // y = mx + b
  }

  setScale(newScale: number, mouseX: number) {
    // min scale is 0.64, max is 1000
    const currentScaleFactor = this.pxPerSecond.get();
    const scaleFactorFactor = newScale / currentScaleFactor;

    if (newScale === currentScaleFactor) {
      return;
    }

    this.pxPerSecond.set(newScale);
    this.scrollLeftPx.setDyn((prev) => {
      const newStartPx = (prev + mouseX) * scaleFactorFactor - mouseX;
      // console.log(newStartPx);
      if (newStartPx < 0) {
        return 0;
      }
      return newStartPx;
    });
  }
}
