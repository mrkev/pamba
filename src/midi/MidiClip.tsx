import * as s from "structured-state";
import { SArray, SString, Struct, StructProps } from "structured-state";
import { liveAudioContext } from "../constants";
import { AbstractClip, Pulses } from "../lib/AbstractClip";
import { AudioProject } from "../lib/project/AudioProject";
import { MutationHashable } from "../lib/state/MutationHashable";
import { Subbable, notify } from "../lib/state/Subbable";
import { nullthrows } from "../utils/nullthrows";
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

export class MidiClip extends Struct<MidiClip> implements Subbable<MidiClip>, MutationHashable, AbstractClip<Pulses> {
  // AbstractClip
  readonly unit = "pulse";

  // ordered by tick (start)
  readonly notes: SArray<Note>;
  readonly name: SString;

  public lengthPulses: Pulses;
  private _startOffsetPulses: Pulses;

  static create(name: string, startOffsetPulses: number, lengthPulses: number, notes: Note[]) {
    return s.create(MidiClip, { name, startOffsetPulses, lengthPulses, notes });
  }

  constructor(
    props: StructProps<MidiClip, { name: string; startOffsetPulses: number; lengthPulses: number; notes: Note[] }>,
  ) {
    super(props);
    this.name = SString.create(props.name);
    this.notes = SArray.create(props.notes);
    this.lengthPulses = props.lengthPulses as Pulses;
    this._startOffsetPulses = props.startOffsetPulses as Pulses;
  }

  addNote(tick: number, num: number, duration: number, velocity: number) {
    addOrderedNote(this.notes, [tick, num, duration, velocity]);
    this.notifyUpdate();
  }

  removeNote(note: Note) {
    this.notes.remove(note);
    this.notifyUpdate();
  }

  // Good for now, works long term?
  findNote(tick: number, number: number) {
    return this.notes.find(([ntick, nnum]: Note) => ntick == tick && nnum == number) ?? null;
  }

  // On mutation, they notify their subscribers that they changed
  public notifyUpdate() {
    MutationHashable.mutated(this);
    notify(this, this);
  }

  // interface AbstractClip

  get startOffsetPulses() {
    return this._startOffsetPulses;
  }

  set startOffsetPulses(value: number) {
    this._startOffsetPulses = value as Pulses;
  }

  get _timelineStartU(): Pulses {
    return this._startOffsetPulses;
  }

  _setTimelineStartU(): void {
    this._startOffsetPulses = this._startOffsetPulses;
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

    const delta = timePulses - this._startOffsetPulses;

    this._startOffsetPulses = timePulses as Pulses;
    // TODO
    // this.trimStartSec = this.trimStartSec + delta;
  }

  clone(): MidiClip {
    const newClip = new MidiClip({
      name: this.name.get(),
      startOffsetPulses: this._startOffsetPulses,
      lengthPulses: this.lengthPulses,
      notes: mutable(this.notes._getRaw()),
    });
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
  const clip = MidiClip.create("new clip", startPulses, length, []);
  track.addClip(project, clip);
}
