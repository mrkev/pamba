import { boolean, number, PrimitiveKind, SNumber, Structured, StructuredKind } from "structured-state";
import { clamp } from "../utils/math";

export type SMidiViewport = {
  pxPerPulse: number;
  pxNoteHeight: number;
  scrollLeft: number;
  scrollTop: number;
};

export class MidiViewport extends Structured<SMidiViewport, typeof MidiViewport> {
  readonly pxPerPulse: SNumber;
  readonly pxNoteHeight: SNumber;
  readonly scrollLeftPx: SNumber;
  readonly scrollTopPx: SNumber;
  readonly lockPlayback = boolean(false);

  constructor(pxPerPulse: number, pxNoteHeight: number, scrollLeft: number, scrollTop: number) {
    super();
    this.pxPerPulse = number(pxPerPulse);
    this.pxNoteHeight = number(pxNoteHeight);
    this.scrollLeftPx = number(scrollLeft);
    this.scrollTopPx = number(scrollTop);
  }

  static construct(json: SMidiViewport): MidiViewport {
    return Structured.create(MidiViewport, json.pxPerPulse, json.pxNoteHeight, json.scrollLeft, json.scrollTop);
  }

  override serialize(): SMidiViewport {
    return {
      pxPerPulse: this.pxPerPulse.get(),
      pxNoteHeight: this.pxNoteHeight.get(),
      scrollLeft: this.scrollLeftPx.get(),
      scrollTop: this.scrollTopPx.get(),
    };
  }

  override autoSimplify(): Record<string, StructuredKind | PrimitiveKind> {
    return {
      pxPerPulse: this.pxPerPulse,
      pxNoteHeight: this.pxNoteHeight,
      scrollLeft: this.scrollLeftPx,
      scrollTop: this.scrollTopPx,
    };
  }

  override replace(json: SMidiViewport): void {
    this.pxPerPulse.set(json.pxPerPulse);
    this.pxNoteHeight.set(json.pxNoteHeight);
    this.scrollLeftPx.set(json.scrollLeft);
    this.scrollTopPx.set(json.scrollTop);
  }

  clone() {
    return Structured.create(
      MidiViewport,
      this.pxPerPulse.get(),
      this.pxNoteHeight.get(),
      this.scrollLeftPx.get(),
      this.scrollTopPx.get(),
    );
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
