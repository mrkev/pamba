import { SPrimitive, Structured } from "structured-state";
import { clamp } from "../utils/math";

type SAudioViewport = {
  pxPerSec: number;
  scrollLeft: number;
};

// px / sec => fr / px

export class AudioViewport extends Structured<SAudioViewport, typeof AudioViewport> {
  readonly pxPerSecScale: SPrimitive<number>;
  readonly scrollLeftPx: SPrimitive<number>;
  readonly lockPlayback = SPrimitive.of(false);

  override serialize(): SAudioViewport {
    return {
      pxPerSec: this.pxPerSecScale.get(),
      scrollLeft: this.scrollLeftPx.get(),
    };
  }

  override replace(json: SAudioViewport): void {
    this.pxPerSecScale.set(json.pxPerSec);
    this.scrollLeftPx.set(json.scrollLeft);
  }

  static construct(json: SAudioViewport): AudioViewport {
    return new this(json.pxPerSec, json.scrollLeft);
  }

  constructor(pxPerSec: number, scrollLeft: number) {
    super();
    this.pxPerSecScale = SPrimitive.of(pxPerSec);
    this.scrollLeftPx = SPrimitive.of(scrollLeft);
  }

  pxToFr(px: number, sampleRate: number) {
    return (px / this.pxPerSecScale.get()) * sampleRate;
  }

  pxToSec(px: number) {
    return (px + this.scrollLeftPx.get()) / this.pxPerSecScale.get();
  }

  framesPerPixel(sampleRate: number) {
    return sampleRate / this.pxPerSecScale.get();
  }

  setScale(expectedNewScale: number, min: number, max: number, mouseX: number) {
    // min scale is 0.64, max is 1000
    const newScale = clamp(min, expectedNewScale, max);
    const currentScaleFactor = this.pxPerSecScale.get();
    const scaleFactorFactor = expectedNewScale / currentScaleFactor;

    if (newScale === currentScaleFactor) {
      return;
    }

    this.pxPerSecScale.set(newScale);
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

export type SMidiViewport = {
  pxPerPulse: number;
  pxNoteHeight: number;
  scrollLeft: number;
  scrollTop: number;
};

export class MidiViewport extends Structured<SMidiViewport, typeof MidiViewport> {
  readonly pxPerPulse: SPrimitive<number>;
  readonly pxNoteHeight: SPrimitive<number>;
  readonly scrollLeftPx: SPrimitive<number>;
  readonly scrollTopPx: SPrimitive<number>;
  readonly lockPlayback = SPrimitive.of(false);

  override serialize(): SMidiViewport {
    return {
      pxPerPulse: this.pxPerPulse.get(),
      pxNoteHeight: this.pxNoteHeight.get(),
      scrollLeft: this.scrollLeftPx.get(),
      scrollTop: this.scrollTopPx.get(),
    };
  }

  clone() {
    return new MidiViewport(
      this.pxPerPulse.get(),
      this.pxNoteHeight.get(),
      this.scrollLeftPx.get(),
      this.scrollTopPx.get(),
    );
  }

  override replace(json: SMidiViewport): void {
    this.pxPerPulse.set(json.pxPerPulse);
    this.pxNoteHeight.set(json.pxNoteHeight);
    this.scrollLeftPx.set(json.scrollLeft);
    this.scrollTopPx.set(json.scrollTop);
  }

  static construct(json: SMidiViewport): MidiViewport {
    return new this(json.pxPerPulse, json.pxNoteHeight, json.scrollLeft, json.scrollTop);
  }

  constructor(pxPerPulse: number, pxNoteHeight: number, scrollLeft: number, scrollTop: number) {
    super();
    this.pxPerPulse = SPrimitive.of(pxPerPulse);
    this.pxNoteHeight = SPrimitive.of(pxNoteHeight);
    this.scrollLeftPx = SPrimitive.of(scrollLeft);
    this.scrollTopPx = SPrimitive.of(scrollTop);
  }

  pulsesToPx(pulses: number) {
    return pulses * this.pxPerPulse.get();
  }

  pxToPulses(px: number) {
    return px / this.pxPerPulse.get();
  }

  pxToVerticalNotes(px: number) {
    return px / this.pxNoteHeight.get();
  }

  setHScale(expectedNewScale: number, min: number, max: number, mouseX: number) {
    // min scale is 0.64, max is 1000
    const newScale = clamp(min, expectedNewScale, max);
    const currentScaleFactor = this.pxPerPulse.get();
    const scaleFactorFactor = expectedNewScale / currentScaleFactor;

    if (newScale === currentScaleFactor) {
      return;
    }

    this.pxPerPulse.set(newScale);
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
