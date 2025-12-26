import { InitFunctions, JSONOfAuto, ReplaceFunctions, SArray, SString, Structured } from "structured-state";
import { TOTAL_VERTICAL_NOTES } from "../constants";
import { AbstractClip, Pulses } from "../lib/AbstractClip";
import { ProjectTrack } from "../lib/ProjectTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { TimeUnit, TimelineT, time } from "../lib/project/TimelineT";
import { MidiViewport } from "../lib/viewport/MidiViewport";
import { mutablearr } from "../utils/nullthrows";
import { MidiBuffer } from "./MidiBuffer";
import { MidiTrack } from "./MidiTrack";
import type { Note } from "./SharedMidiTypes";

type AutoMidiClip = {
  name: SString;
  timelineStart: TimelineT;
  timelineLength: TimelineT;
  buffer: MidiBuffer;
  bufferTimelineStart: TimelineT;
  viewport: MidiViewport;
};

export class MidiClip extends Structured<AutoMidiClip, typeof MidiClip> implements AbstractClip<Pulses> {
  readonly bufferOffset: TimelineT = time(0, "pulses"); // unused, rn here just for types

  constructor(
    readonly name: SString,
    readonly timelineStart: TimelineT,
    readonly timelineLength: TimelineT,
    readonly buffer: MidiBuffer,
    readonly detailedViewport: MidiViewport,
    // todo: as of now, unused. midi can be trimmed like audio though.
    readonly bufferTimelineStart: TimelineT,
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
    };
  }

  override replace(json: JSONOfAuto<AutoMidiClip>, replace: ReplaceFunctions): void {
    replace.string(json.name, this.name);
    replace.structured(json.timelineStart, this.timelineStart);
    replace.structured(json.timelineLength, this.timelineLength);
    replace.structured(json.buffer, this.buffer);
    replace.structured(json.bufferTimelineStart, this.bufferTimelineStart);
    replace.structured(json.viewport, this.detailedViewport);
  }

  static construct(auto: JSONOfAuto<AutoMidiClip>, init: InitFunctions): MidiClip {
    return Structured.create(
      MidiClip,
      init.string(auto.name),
      init.structured(auto.timelineStart, TimelineT),
      init.structured(auto.timelineLength, TimelineT),
      init.structured(auto.buffer, MidiBuffer),
      init.structured(auto.viewport, MidiViewport),
      init.structured(auto.bufferTimelineStart, TimelineT),
    );
  }

  static of(
    name: string,
    startOffsetPulses: number,
    lengthPulses: number,
    notes: Note[],
    viewport?: MidiViewport,
    bufferTimelineStart?: number,
  ) {
    return Structured.create(
      MidiClip,
      SString.create(name),
      time(startOffsetPulses, "pulses"),
      time(lengthPulses, "pulses"),
      Structured.create(MidiBuffer, SArray.create(mutablearr(notes)), time(lengthPulses, "pulses")),
      viewport ?? MidiViewport.of(10, 10, 0, 0),
      time(bufferTimelineStart ?? startOffsetPulses, "pulses"),
    );
  }

  /////////////////////////////////////////////

  static addNote(clip: MidiClip, tick: number, num: number, duration: number, velocity: number) {
    clip.buffer.addOrderedNote([tick, num, duration, velocity]);
    clip.buffer.clearCache();
    clip.notifyChange();
  }

  static removeNote(clip: MidiClip, note: Note) {
    const result = clip.buffer.notes.remove(note);
    clip.buffer.clearCache();
    clip.notifyChange();
    return result;
  }

  // Good for now, works long term?
  findNote(tick: number, number: number) {
    return this.buffer.notes.find(([ntick, nnum]: Note) => ntick == tick && nnum == number) ?? null;
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
    // this.lengthPulses = (newEnd - this._startOffsetPulses) as Pulses;
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
      this.buffer.clone(),
      this.detailedViewport.clone(),
      this.bufferTimelineStart.clone(),
    );
    return newClip;
  }

  override toString() {
    return `${this.timelineStart.ensurePulses()} [ ${this.name.get()} ] ${this._timelineEndU}`;
  }
}

export function createEmptyMidiClipInTrack(project: AudioProject, track: MidiTrack, startS: number, endS: number) {
  const startPulses = project.viewport.secsToPulses(startS);
  const length = project.viewport.secsToPulses(endS - startS);
  const clip = MidiClip.of("new clip", startPulses, length, []);
  ProjectTrack.addClip(project, track, clip);
}

export function setClipLength(project: AudioProject, track: MidiTrack, clip: MidiClip, t: number, u: TimeUnit) {
  const i = track.clips.indexOf(clip);
  const next = track.clips.at(i + 1);
  if (i < 0) {
    throw new Error("setClipLength: clip not in track");
  }

  const prevLength = clip.timelineLength.pulses(project);
  const newLength = TimelineT.pulses(project, t, u);

  // nothing special to do anything in these cases
  if (newLength < prevLength || next === null) {
    clip.timelineLength.set(t, u);
    return;
  }

  // Delete all the area we're expanding into, and set the new length
  const clipStart = clip.timelineStart.pulses(project);
  const start = clipStart + prevLength; // pulses
  const end = clipStart + newLength; // pulses
  ProjectTrack.deleteTime(project, track, start, end);

  clip.timelineLength.set(t, u);
}

export const midiClip = {
  // TODO: will be different if clip and buffer start don't align
  getNotesInRange(
    clip: MidiClip,
    minPulse: number = 0,
    maxPulse: number = Infinity,
    minNote: number = 0,
    maxNote: number = TOTAL_VERTICAL_NOTES - 1,
  ) {
    const result = [];
    for (const note of clip.buffer.notes) {
      const [tick, num] = note;
      if (tick >= minPulse && tick <= maxPulse && num >= minNote && num <= maxNote) {
        result.push(note);
      }
      // since notes are ordered by tick, we know no note after this will be in range
      if (tick > maxPulse) {
        break;
      }
    }
    return result;
  },
};
