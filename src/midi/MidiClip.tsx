import { InitFunctions, JSONOfAuto, ReplaceFunctions, SArray, SString, Structured } from "structured-state";
import { SMidiClip } from "../data/serializable";
import { AbstractClip, Pulses } from "../lib/AbstractClip";
import { ProjectTrack } from "../lib/ProjectTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { TimeUnit, TimelineT, time } from "../lib/project/TimelineT";
import { MidiViewport } from "../lib/viewport/MidiViewport";
import { mutablearr, nullthrows } from "../utils/nullthrows";
import { MidiBuffer } from "./MidiBuffer";
import { MidiTrack } from "./MidiTrack";
import type { Note } from "./SharedMidiTypes";

type AutoMidiClip = {
  name: SString;
  timelineStart: TimelineT;
  timelineLength: TimelineT;
  notes: SArray<Note>;
  viewport: MidiViewport;
  bufferTimelineStart: TimelineT;
};

export class MidiClip extends Structured<AutoMidiClip, typeof MidiClip> implements AbstractClip<Pulses> {
  // constants
  readonly unit = "pulse";

  readonly bufferOffset: TimelineT = time(0, "pulses"); // TODO: this is here just for types

  public buffer: MidiBuffer;
  // readonly bufferLength: Pulses = 0 as Pulses;

  constructor(
    readonly name: SString,
    readonly timelineStart: TimelineT,
    readonly timelineLength: TimelineT,
    readonly notes: SArray<Note>, // ordered by tick (start),
    readonly detailedViewport: MidiViewport,
    // todo: as of now, unused. midi can be trimmed like audio though.
    public bufferTimelineStart: TimelineT,
  ) {
    super();
    // this.lengthPulses = lengthPulses as Pulses;
    // this._startOffsetPulses = startOffsetPulses as Pulses;
    this.buffer = new MidiBuffer(this.notes, this.timelineLength);
  }

  override autoSimplify(): AutoMidiClip {
    return {
      name: this.name,
      timelineStart: this.timelineStart,
      timelineLength: this.timelineLength,
      notes: this.notes,
      viewport: this.detailedViewport,
      bufferTimelineStart: this.bufferTimelineStart,
    };
  }

  override replace(json: JSONOfAuto<AutoMidiClip>, replace: ReplaceFunctions): void {
    replace.string(json.name, this.name);
    replace.structured(json.timelineStart, this.timelineStart);
    replace.structured(json.timelineLength, this.timelineLength);
    // TODO: replace notes, viewport
    replace.structured(json.bufferTimelineStart, this.bufferTimelineStart);
  }

  static construct(auto: JSONOfAuto<AutoMidiClip>, init: InitFunctions): MidiClip {
    return Structured.create(
      MidiClip,
      init.string(auto.name),
      init.structured(auto.timelineStart, TimelineT),
      init.structured(auto.timelineLength, TimelineT),
      init.array<Note>(auto.notes),
      init.structured(auto.viewport, MidiViewport),
      init.structured(auto.bufferTimelineStart, TimelineT),
    );
  }

  static old_construct(json: SMidiClip): MidiClip {
    const viewport = json.viewport
      ? MidiViewport.of(
          json.viewport.pxPerPulse,
          json.viewport.pxNoteHeight,
          json.viewport.scrollLeft,
          json.viewport.scrollTop,
        )
      : MidiViewport.of(10, 10, 0, 0);
    return new MidiClip(
      SString.create(json.name),
      time(json.startOffsetPulses, "pulses"),
      time(json.lengthPulses, "pulses"),
      SArray.create(mutablearr(json.notes)),
      viewport,
      time(json.bufferTimelineStart, "pulses"),
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
      SArray.create(mutablearr(notes)),
      viewport ?? MidiViewport.of(10, 10, 0, 0),
      time(bufferTimelineStart ?? startOffsetPulses, "pulses"),
    );
  }

  static addNote(clip: MidiClip, tick: number, num: number, duration: number, velocity: number) {
    addOrderedNote(clip.notes, [tick, num, duration, velocity]);
    clip.buffer.clearCache();
    clip.notifyChange();
  }

  static addNoteAndUpdateTrackPlayback(
    track: MidiTrack,
    clip: MidiClip,
    tick: number,
    num: number,
    duration: number,
    velocity: number,
  ) {
    // TODO
    addOrderedNote(clip.notes, [tick, num, duration, velocity]);
    clip.notifyChange();
  }

  static removeNote(clip: MidiClip, note: Note) {
    clip.notes.remove(note);
    clip.buffer.clearCache();
    clip.notifyChange();
  }

  // Good for now, works long term?
  findNote(tick: number, number: number) {
    return this.notes.find(([ntick, nnum]: Note) => ntick == tick && nnum == number) ?? null;
  }

  get startOffsetPulses() {
    return this.timelineStart.ensurePulses();
  }

  setStartOffsetPulses(value: number) {
    // this._startOffsetPulses = value as Pulses;
    this.timelineStart.set(value, "pulses");
  }

  // interface AbstractClip

  get _timelineStartU(): Pulses {
    return this.timelineStart.ensurePulses() as Pulses;
  }

  _setTimelineStartU(val: Pulses): void {
    // this._startOffsetPulses = val;
    this.timelineStart.set(val, "pulses");
  }

  get _timelineEndU(): Pulses {
    return (this.startOffsetPulses + this.timelineLength.ensurePulses()) as Pulses;
  }

  _setTimelineEndU(newEnd: number): void {
    if (newEnd < this.startOffsetPulses) {
      throw new Error("Can't set endOffsetSec to be before startOffsetSec");
    }
    // this.lengthPulses = (newEnd - this._startOffsetPulses) as Pulses;
    this.timelineLength.set(newEnd - this.startOffsetPulses, "pulses");
  }

  trimStartToTimelineU(timePulses: number) {
    if (timePulses < this.startOffsetPulses) {
      return;
    }

    if (timePulses > this._timelineEndU) {
      throw new Error("trimming past end time");
    }

    const _delta = timePulses - this.startOffsetPulses;

    // this._startOffsetPulses = timePulses as Pulses;
    this.timelineStart.set(timePulses, "pulses");

    // TODO
    // this.trimStartSec = this.trimStartSec + delta;
  }

  get lengthPulses() {
    return this.timelineLength.ensurePulses();
  }

  clone(): MidiClip {
    const newClip = Structured.create(
      MidiClip,
      SString.create(this.name.get()),
      time(this.startOffsetPulses, "pulses"),
      time(this.timelineLength.ensurePulses(), "pulses"),
      SArray.create(mutablearr(this.notes._getRaw())),
      this.detailedViewport.clone(),
      this.bufferTimelineStart.clone(),
    );
    return newClip;
  }

  override toString() {
    return `${this._timelineStartU} [ ${this.name.get()} ] ${this._timelineEndU}`;
  }
}

function addOrderedNote(la: SArray<Note>, note: Note) {
  for (let i = 0; i < la.length; i++) {
    const [tick] = nullthrows(la.at(i));
    if (tick >= note[0] /* .tick */) {
      la.splice(i, 0, note);
      return;
    }
  }
  la.push(note);
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
