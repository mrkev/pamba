import { JSONOfAuto, number, replace, SNumber, SPrimitive, Structured } from "structured-state";
import { clamp } from "../../utils/math";

type SAudioViewport = {
  pxPerSec: number;
  scrollLeft: number;
};

// px / sec => fr / px

type AutoAudioViewport = {
  pxPerSec: SNumber;
  scrollLeft: SNumber;
};

export class AudioViewport extends Structured<SAudioViewport, AutoAudioViewport, typeof AudioViewport> {
  readonly lockPlayback = SPrimitive.of(false);
  readonly selectionWidthFr = SPrimitive.of<number | null>(null);

  constructor(
    //
    readonly pxPerSec: SNumber,
    readonly scrollLeftPx: SNumber,
  ) {
    super();
  }

  static of(pxPerSec: number, scrollLeftPx: number) {
    return Structured.create(AudioViewport, number(pxPerSec), number(scrollLeftPx));
  }

  override serialize(): SAudioViewport {
    return {
      pxPerSec: this.pxPerSec.get(),
      scrollLeft: this.scrollLeftPx.get(),
    };
  }

  override replace(json: SAudioViewport, auto: JSONOfAuto<AutoAudioViewport>): void {
    replace.number(auto.pxPerSec, this.pxPerSec);
    replace.number(auto.scrollLeft, this.scrollLeftPx);
  }

  override autoSimplify(): AutoAudioViewport {
    return {
      pxPerSec: this.pxPerSec,
      scrollLeft: this.scrollLeftPx,
    };
  }

  static construct(json: SAudioViewport): AudioViewport {
    return AudioViewport.of(json.pxPerSec, json.scrollLeft);
  }

  pxToFr(px: number, sampleRate: number) {
    return Math.floor((px / this.pxPerSec.get()) * sampleRate);
  }

  pxToSec(px: number) {
    return (px + this.scrollLeftPx.get()) / this.pxPerSec.get();
  }

  frToPx(fr: number, sampleRate: number) {
    return (fr / sampleRate) * this.pxPerSec.get();
  }

  framesPerPixel(sampleRate: number) {
    return sampleRate / this.pxPerSec.get();
  }

  setScale(expectedNewScale: number, min: number, max: number, mouseX: number) {
    // min scale is 0.64, max is 1000
    const newScale = clamp(min, expectedNewScale, max);
    const currentScaleFactor = this.pxPerSec.get();
    const scaleFactorFactor = expectedNewScale / currentScaleFactor;

    if (newScale === currentScaleFactor) {
      return;
    }

    this.pxPerSec.set(newScale);
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
