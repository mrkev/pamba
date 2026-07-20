import { boolean, InitFunctions, JSONOfAuto, number, ReplaceFunctions, SNumber, Structured } from "structured-state";
import {
  MIDDLE_C_NOTE,
  MIDI_CLIP_EDITOR_MAX_H_SCALE,
  MIDI_CLIP_EDITOR_MIN_H_SCALE,
  TOTAL_VERTICAL_NOTES,
} from "../../constants";
import { clamp } from "../../utils/math";
import { PPQN } from "../../wam/miditrackwam/MIDIConfiguration";

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

const CLIP_TOTAL_BARS = 4;

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

  /**
   * Default vertical scroll (px from the top of the note range) that puts middle C near the
   * vertical center of the editor. The real editor height isn't known when a clip is created
   * (the bottom panel is resizable) and the viewport is serialized, so we center for a typical
   * height; the browser clamps if the panel is shorter/taller, and any scrolling the user does
   * from here persists. Notes are laid out bottom-up, so middle C's distance from the top is
   * `(TOTAL_VERTICAL_NOTES - MIDDLE_C_NOTE - 0.5) * pxNoteHeight`.
   */
  static defaultScrollTop(pxNoteHeight: number): number {
    const ASSUMED_EDITOR_HEIGHT_PX = 240;
    const middleCFromTop = (TOTAL_VERTICAL_NOTES - MIDDLE_C_NOTE - 0.5) * pxNoteHeight;
    return Math.max(0, middleCFromTop - ASSUMED_EDITOR_HEIGHT_PX / 2);
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

  secsToPixels(secs: number, tempo: number) {
    // TODO: we shouldn't need tempo for this if we do the math another way

    // secs to pulses
    const oneBeatLen = 60 / tempo;
    const oneTickLen = oneBeatLen / PPQN;
    const pulses = (secs / oneTickLen) % (CLIP_TOTAL_BARS * PPQN);

    return this.pulsesToPx(pulses);
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
    // Use the clamped scale so the scroll adjustment stays consistent at MIN/MAX.
    const scaleFactorFactor = newScale / currentScaleFactor;

    viewport.pxPerPulse.set(newScale);
    const newStartPx = (viewport.scrollLeftPx.get() + mouseX) * scaleFactorFactor - mouseX;
    if (newStartPx < 0) {
      viewport.scrollLeftPx.set(0);
    } else {
      viewport.scrollLeftPx.set(newStartPx);
    }
  },
};
