import * as s from "structured-state";
import { SArray, SString, Structured } from "structured-state";
import { liveAudioContext } from "../constants";
import { SMidiClip } from "../data/serializable";
import { AbstractClip, Pulses } from "../lib/AbstractClip";
import { ProjectTrack } from "../lib/ProjectTrack";
import { AudioProject } from "../lib/project/AudioProject";
import { TimelinePoint, time } from "../lib/project/TimelinePoint";
import { MidiViewport } from "../ui/AudioViewport";
import { mutablearr, nullthrows } from "../utils/nullthrows";
import { mutable } from "../utils/types";
import { PPQN } from "../wam/pianorollme/MIDIConfiguration";
import { MidiTrack } from "./MidiTrack";
import type { Note } from "./SharedMidiTypes";

export const SECS_IN_MIN = 60;

export function pulsesToFr(pulses: number, bpm: number) {
  // TODO: not a constant sample rate
  const k = (liveAudioContext().sampleRate * SECS_IN_MIN) / PPQN;
  return (k * pulses) / bpm;
}

export function pulsesToSec(pulses: number, bpm: number) {
  return (pulses * SECS_IN_MIN) / (PPQN * bpm);
}

export function secsToPulses(secs: number, bpm: number) {
  return Math.floor((secs * PPQN * bpm) / SECS_IN_MIN);
}

export class MidiClip extends Structured<SMidiClip, typeof MidiClip> implements AbstractClip<Pulses> {
  // AbstractClip
  readonly unit = "pulse";

  // ordered by tick (start)
  readonly notes: SArray<Note>;
  readonly name: SString;
  public lengthPulses: Pulses;
  private _startOffsetPulses: Pulses;

  readonly detailedViewport: MidiViewport;

  // Experimental, unused
  timelineStart: TimelinePoint;

  override serialize(): SMidiClip {
    return {
      kind: "MidiClip",
      name: this.name.get(),
      startOffsetPulses: this.startOffsetPulses,
      lengthPulses: this.lengthPulses,
      notes: this.notes._getRaw(),
      viewport: this.detailedViewport.serialize(),
    };
  }

  override replace(_json: SMidiClip): void {
    throw new Error("Method not implemented.");
  }

  static construct(json: SMidiClip): MidiClip {
    const viewport = json.viewport ? MidiViewport.construct(json.viewport) : new MidiViewport(10, 10, 0, 0);
    return new MidiClip(json.name, json.startOffsetPulses, json.lengthPulses, json.notes, viewport);
  }

  static of(name: string, startOffsetPulses: number, lengthPulses: number, notes: Note[], viewport?: MidiViewport) {
    return s.Structured.create(
      MidiClip,
      name,
      startOffsetPulses,
      lengthPulses,
      notes,
      viewport ?? new MidiViewport(10, 10, 0, 0),
    );
  }

  constructor(
    name: string,
    startOffsetPulses: number,
    lengthPulses: number,
    notes: readonly Note[],
    viewport: MidiViewport,
  ) {
    super();
    this.name = SString.create(name);
    this.notes = SArray.create(mutablearr(notes));
    this.lengthPulses = lengthPulses as Pulses;
    this._startOffsetPulses = startOffsetPulses as Pulses;
    this.timelineStart = time(startOffsetPulses, "pulses");
    this.detailedViewport = viewport;
  }

  addNote(tick: number, num: number, duration: number, velocity: number) {
    addOrderedNote(this.notes, [tick, num, duration, velocity]);
    this._notifyChange();
  }

  removeNote(note: Note) {
    this.notes.remove(note);
    this._notifyChange();
  }

  // Good for now, works long term?
  findNote(tick: number, number: number) {
    return this.notes.find(([ntick, nnum]: Note) => ntick == tick && nnum == number) ?? null;
  }

  get startOffsetPulses() {
    return this._startOffsetPulses;
  }

  setStartOffsetPulses(value: number) {
    this._startOffsetPulses = value as Pulses;
  }

  // interface AbstractClip

  get _timelineStartU(): Pulses {
    return this._startOffsetPulses;
  }

  _setTimelineStartU(val: Pulses): void {
    this._startOffsetPulses = val;
  }

  get _timelineEndU(): Pulses {
    return (this._startOffsetPulses + this.lengthPulses) as Pulses;
  }

  _setTimelineEndU(newEnd: number): void {
    if (newEnd < this._startOffsetPulses) {
      throw new Error("Can't set endOffsetSec to be before startOffsetSec");
    }
    this.lengthPulses = (newEnd - this._startOffsetPulses) as Pulses;
  }

  trimStartToTimelineU(timePulses: number) {
    if (timePulses < this._startOffsetPulses) {
      return;
    }

    if (timePulses > this._timelineEndU) {
      throw new Error("trimming past end time");
    }

    const _delta = timePulses - this._startOffsetPulses;

    this._startOffsetPulses = timePulses as Pulses;
    // TODO
    // this.trimStartSec = this.trimStartSec + delta;
  }

  clone(): MidiClip {
    const newClip = new MidiClip(
      this.name.get(),
      this._startOffsetPulses,
      this.lengthPulses,
      mutable(this.notes._getRaw()),
      this.detailedViewport.clone(),
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
