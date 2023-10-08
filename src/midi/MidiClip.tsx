import { LIVE_SAMPLE_RATE } from "../constants";
import { BaseClip } from "../lib/BaseClip";
import { LinkedArray } from "../lib/state/LinkedArray";
import { MutationHashable } from "../lib/state/MutationHashable";
import { Subbable, notify } from "../lib/state/Subbable";
import nullthrows from "../utils/nullthrows";
import { PPQN } from "../wam/pianorollme/MIDIConfiguration";
import type { Note } from "./SharedMidiTypes";

// TODO: not a constant sample rate

const SECS_IN_MIN = 60;

function pulsesToFr(pulses: number, bpm: number) {
  const k = (LIVE_SAMPLE_RATE * SECS_IN_MIN) / PPQN;
  return (k * pulses) / bpm;
}

function pulsesToSec(pulses: number, bpm: number) {
  return (pulses * SECS_IN_MIN) / (PPQN * bpm);
}

export class MidiClip extends BaseClip implements Subbable<MidiClip>, MutationHashable {
  _hash: number = 0;
  _subscriptors: Set<(value: BaseClip) => void> = new Set();
  // ordered by tick (start)
  notes: LinkedArray<Note>;
  public name: string;

  // TODO: use sec, fr functions, but source of truth is PPQN unit?
  public lenPulses: number;

  constructor(name: string, lengthPulses: number, notes: readonly Note[]) {
    const lenSec = pulsesToSec(lengthPulses, 75); // todo: tempo
    // todo: sample rate doesn't really mean much for a midi clip?
    // Maybe this applies just to audio clips?
    super(lenSec, LIVE_SAMPLE_RATE, 0);
    this.name = name;
    this.notes = LinkedArray.create(notes);
    this.lenPulses = lengthPulses;
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
