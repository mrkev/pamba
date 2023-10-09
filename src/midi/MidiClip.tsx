import { LIVE_SAMPLE_RATE } from "../constants";
import { AbstractClip } from "../lib/BaseClip";
import { LinkedArray } from "../lib/state/LinkedArray";
import { MutationHashable } from "../lib/state/MutationHashable";
import { Subbable, notify } from "../lib/state/Subbable";
import nullthrows from "../utils/nullthrows";
import { PPQN } from "../wam/pianorollme/MIDIConfiguration";
import type { Note } from "./SharedMidiTypes";

// TODO: not a constant sample rate

const SECS_IN_MIN = 60;

export function pulsesToFr(pulses: number, bpm: number) {
  const k = (LIVE_SAMPLE_RATE * SECS_IN_MIN) / PPQN;
  return (k * pulses) / bpm;
}

export function pulsesToSec(pulses: number, bpm: number) {
  return (pulses * SECS_IN_MIN) / (PPQN * bpm);
}

export function secsToPulses(secs: number, bpm: number) {
  return Math.floor((secs * PPQN * bpm) / SECS_IN_MIN);
}

export class MidiClip implements Subbable<MidiClip>, MutationHashable, AbstractClip {
  _hash: number = 0;
  _subscriptors: Set<(value: MidiClip) => void> = new Set();
  // ordered by tick (start)
  notes: LinkedArray<Note>;
  public name: string;

  // TODO: use sec, fr functions, but source of truth is PPQN unit?
  public lengthPulses: number;
  public startOffsetPulses: number;

  constructor(name: string, lengthPulses: number, notes: readonly Note[]) {
    // const lenSec = pulsesToSec(lengthPulses, 75); // todo: tempo
    // todo: sample rate doesn't really mean much for a midi clip?
    // Maybe this applies just to audio clips?
    // super(lenSec, LIVE_SAMPLE_RATE, 0);
    this.name = name;
    this.notes = LinkedArray.create(notes);
    this.lengthPulses = lengthPulses;
    this.startOffsetPulses = 0;
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

  _startOffset(): number {
    return this.startOffsetPulses;
  }

  _setStartOffset(): void {
    this.startOffsetPulses = this.startOffsetPulses;
  }

  _endOffset(): number {
    return this.startOffsetPulses + this.lengthPulses;
  }

  _setEndOffset(newEnd: number): void {
    if (newEnd < this.startOffsetPulses) {
      throw new Error("Can't set endOffsetSec to be before startOffsetSec");
    }
    this.lengthPulses = newEnd - this.startOffsetPulses;
  }

  trimToOffset(timePulses: number) {
    if (timePulses < this.startOffsetPulses) {
      return;
    }

    if (timePulses > this._endOffset()) {
      throw new Error("trimming past end time");
    }

    const delta = timePulses - this.startOffsetPulses;

    this.startOffsetPulses = timePulses;
    // TODO
    // this.trimStartSec = this.trimStartSec + delta;
  }

  clone(): MidiClip {
    // TODO: subscriptors?
    const newClip = new MidiClip(this.name, this.lengthPulses, this.notes._getRaw());
    newClip.startOffsetPulses = this.startOffsetPulses;
    return newClip;
  }
}

function addOrderedNote(la: LinkedArray<Note>, note: Note) {
  for (let i = 0; i < la.length; i++) {
    const [tick] = nullthrows(la.at(i));
    if (tick >= note[0] /* .tick */) {
      la.splice(i, 0, note);
      return;
    }
  }
  la.push(note);
}
