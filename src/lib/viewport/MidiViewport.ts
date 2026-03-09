import { boolean, InitFunctions, JSONOfAuto, number, ReplaceFunctions, SNumber, Structured } from "structured-state";
import { MIDI_CLIP_EDITOR_MAX_H_SCALE, MIDI_CLIP_EDITOR_MIN_H_SCALE } from "../../constants";
import { clamp } from "../../utils/math";

export type SMidiViewport = {
  pxPerPulse: number;
  pxNoteHeight: number;
  scrollLeft: number;
  scrollTop: number;
};

type AutoMidiViewport = {
  pxPerPulse: SNumber;
  pxNoteHeight: SNumber;
  scrollLeft: SNumber;
  scrollTop: SNumber;
};

export class MidiViewport extends Structured<AutoMidiViewport, typeof MidiViewport> {
  readonly lockPlayback = boolean(false);

  constructor(
    readonly pxPerPulse: SNumber,
    readonly pxNoteHeight: SNumber,
    readonly scrollLeftPx: SNumber,
    readonly scrollTopPx: SNumber,
  ) {
    super();
  }

  static of(pxPerPulse: number, pxNoteHeight: number, scrollLeftPx: number, scrollTopPx: number) {
    return Structured.create(
      MidiViewport,
      number(pxPerPulse),
      number(pxNoteHeight),
      number(scrollLeftPx),
      number(scrollTopPx),
    );
  }

  static construct(auto: JSONOfAuto<AutoMidiViewport>, init: InitFunctions): MidiViewport {
    return Structured.create(
      MidiViewport,
      init.number(auto.pxPerPulse),
      init.number(auto.pxNoteHeight),
      init.number(auto.scrollLeft),
      init.number(auto.scrollTop),
    );
  }

  // TODO: just use auto form where this is used?
  serialize(): SMidiViewport {
    return {
      pxPerPulse: this.pxPerPulse.get(),
      pxNoteHeight: this.pxNoteHeight.get(),
      scrollLeft: this.scrollLeftPx.get(),
      scrollTop: this.scrollTopPx.get(),
    };
  }

  override autoSimplify(): AutoMidiViewport {
    return {
      pxPerPulse: this.pxPerPulse,
      pxNoteHeight: this.pxNoteHeight,
      scrollLeft: this.scrollLeftPx,
      scrollTop: this.scrollTopPx,
    };
  }

  override replace(auto: JSONOfAuto<AutoMidiViewport>, replace: ReplaceFunctions): void {
    replace.number(auto.pxPerPulse, this.pxPerPulse);
    replace.number(auto.pxNoteHeight, this.pxNoteHeight);
    replace.number(auto.scrollLeft, this.scrollLeftPx);
    replace.number(auto.scrollTop, this.scrollTopPx);
  }

  clone() {
    return Structured.create(
      MidiViewport,
      number(this.pxPerPulse.get()),
      number(this.pxNoteHeight.get()),
      number(this.scrollLeftPx.get()),
      number(this.scrollTopPx.get()),
    );
  }

  pulsesToPx(pulses: number) {
    return pulses * this.pxPerPulse.get();
  }

  pxToPulses(px: number) {
    return px / this.pxPerPulse.get();
  }

  pxToVerticalNotes(px: number) {
    // console.log("pxToVerticalNotes", px, this.pxNoteHeight.get());
    return px / this.pxNoteHeight.get();
  }
}

export const midiViewport = {
  /**
   * Sets the horizontal scale, zooming in our out relative ot a specific point x
   */
  setXScale(viewport: MidiViewport, expectedNewScale: number, mouseX: number = 0) {
    // min scale is 0.64, max is 1000
    const newScale = clamp(MIDI_CLIP_EDITOR_MIN_H_SCALE, expectedNewScale, MIDI_CLIP_EDITOR_MAX_H_SCALE);
    const currentScaleFactor = viewport.pxPerPulse.get();
    const scaleFactorFactor = expectedNewScale / currentScaleFactor;

    viewport.pxPerPulse.set(newScale);
    const newStartPx = (viewport.scrollLeftPx.get() + mouseX) * scaleFactorFactor - mouseX;
    if (newStartPx < 0) {
      viewport.scrollLeftPx.set(0);
    } else {
      viewport.scrollLeftPx.set(newStartPx);
    }
  },
};
