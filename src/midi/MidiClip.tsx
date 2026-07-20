import {
  InitFunctions,
  JSONOfAuto,
  ReplaceFunctions,
  SBoolean,
  SSet,
  SString,
  Structured,
  arrayOf,
  set,
} from "structured-state";
import { AbstractClip, Pulses } from "../lib/AbstractClip";
import { TimelineT, time } from "../lib/project/TimelineT";
import { MidiViewport } from "../lib/viewport/MidiViewport";
import { MidiBuffer } from "./MidiBuffer";
import { MidiNote, mnote } from "./MidiNote";
import type { NoteT } from "./SharedMidiTypes";

type AutoMidiClip = {
  name: SString;
  timelineStart: TimelineT;
  timelineLength: TimelineT;
  buffer: MidiBuffer;
  bufferTimelineStart: TimelineT;
  viewport: MidiViewport;
  muted: SBoolean;
};

export class MidiClip extends Structured<AutoMidiClip, typeof MidiClip> implements AbstractClip<Pulses> {
  readonly bufferOffset: TimelineT = time(0, "pulses"); // unused, rn here just for types

  constructor(
    readonly name: SString,
    readonly timelineStart: TimelineT,
    readonly timelineLength: TimelineT,
    readonly buffer: MidiBuffer,
    readonly detailedViewport: MidiViewport,
    readonly selectedNotes: SSet<MidiNote>,
    // todo: as of now, unused. midi can be trimmed like audio though.
    readonly bufferTimelineStart: TimelineT,
    readonly muted: SBoolean,
  ) {
    super();
  }

  override autoSimplify(): AutoMidiClip {
    return {
      name: this.name,
      timelineStart: this.timelineStart,
      timelineLength: this.timelineLength,
      buffer: this.buffer,
      viewport: this.detailedViewport,
      bufferTimelineStart: this.bufferTimelineStart,
      muted: this.muted,
    };
  }

  override replace(json: JSONOfAuto<AutoMidiClip>, replace: ReplaceFunctions): void {
    replace.string(json.name, this.name);
    replace.structured(json.timelineStart, this.timelineStart);
    replace.structured(json.timelineLength, this.timelineLength);
    replace.structured(json.buffer, this.buffer);
    replace.structured(json.bufferTimelineStart, this.bufferTimelineStart);
    replace.structured(json.viewport, this.detailedViewport);
    replace.boolean(json.muted, this.muted);
  }

  static construct(auto: JSONOfAuto<AutoMidiClip>, init: InitFunctions): MidiClip {
    return Structured.create(
      MidiClip,
      init.string(auto.name),
      init.structured(auto.timelineStart, TimelineT),
      init.structured(auto.timelineLength, TimelineT),
      init.structured(auto.buffer, MidiBuffer),
      init.structured(auto.viewport, MidiViewport),
      set([]),
      init.structured(auto.bufferTimelineStart, TimelineT),
      init.boolean(auto.muted),
    );
  }

  static of(
    name: string,
    startOffsetPulses: number,
    lengthPulses: number,
    notes: NoteT[],
    viewport?: MidiViewport,
    bufferTimelineStart?: number,
  ) {
    return Structured.create(
      MidiClip,
      SString.create(name),
      time(startOffsetPulses, "pulses"),
      time(lengthPulses, "pulses"),
      Structured.create(MidiBuffer, arrayOf([MidiNote], notes.map(mnote)), time(lengthPulses, "pulses")),
      viewport ?? MidiViewport.of(10, 10, 0, MidiViewport.defaultScrollTop(10)),
      set([]),
      time(bufferTimelineStart ?? startOffsetPulses, "pulses"),
      SBoolean.create(false),
    );
  }

  // interface AbstractClip

  get _timelineStartU(): Pulses {
    return this.timelineStart.ensurePulses() as Pulses;
  }

  get _timelineEndU(): Pulses {
    return (this.timelineStart.ensurePulses() + this.timelineLength.ensurePulses()) as Pulses;
  }

  public timelineEndPulses() {
    return this.timelineStart.ensurePulses() + this.timelineLength.ensurePulses();
  }

  _setTimelineEndU(newEnd: number): void {
    if (newEnd < this.timelineStart.ensurePulses()) {
      throw new Error("Can't set endOffsetSec to be before startOffsetSec");
    }
    this.timelineLength.set(newEnd - this.timelineStart.ensurePulses(), "pulses");
  }

  trimStartToTimelineU(timePulses: number) {
    if (timePulses < this.timelineStart.ensurePulses()) {
      return;
    }

    if (timePulses > this._timelineEndU) {
      throw new Error("trimming past end time");
    }

    const _delta = timePulses - this.timelineStart.ensurePulses();

    // this._startOffsetPulses = timePulses as Pulses;
    this.timelineStart.set(timePulses, "pulses");

    // TODO
    // this.trimStartSec = this.trimStartSec + delta;
  }

  clone(): MidiClip {
    const newClip = Structured.create(
      MidiClip,
      SString.create(this.name.get()),
      this.timelineStart.clone(),
      this.timelineLength.clone(),
      // we clone when we create a new clip for rendering, when dragging a clip.
      // keep the buffer, so we don't re-draw the midi notes, which can be expensive.
      // it also makes sense no? for midi buffers to be re-used?
      this.buffer,
      this.detailedViewport.clone(),
      set([]),
      this.bufferTimelineStart.clone(),
      SBoolean.create(this.muted.get()),
    );
    return newClip;
  }

  override toString() {
    return `${this.timelineStart.renderSimple()} [ ${this.name.get()} ] ${this._timelineEndU}`;
  }
}
